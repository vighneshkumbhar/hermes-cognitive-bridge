"""Local, authenticated Hermes task gateway. Python standard library only."""
from __future__ import annotations

import json
import os
import secrets
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from gateway.ipc_client import ipc_call

HOST = "127.0.0.1"
PORT = int(os.environ.get("HERMES_BRIDGE_PORT", "8765"))
MAX_BODY = 64 * 1024
PAIR_CODE = secrets.token_urlsafe(9)
TOKEN = secrets.token_urlsafe(32)
PAIRED = False
# Do not flip this until the real terminal approval acceptance test passes.
IPC_EXECUTION_ENABLED = False
# Tool-capable execution is deliberately disabled. Hermes one-shot sets
# HERMES_YOLO_MODE=1, which bypasses dangerous-tool approvals. Do not add a
# subprocess path until Hermes exposes a verified approval-preserving API.


def _provider_metadata() -> dict:
    """Names-only inventory reported by the live Hermes process."""
    response = ipc_call("model.list")
    if not response.get("ok"):
        reason = (response.get("error") or {}).get("code", "Hermes IPC unavailable")
        return {"available": False, "providers": [], "reason": reason}
    return {"available": True, "providers": response.get("providers", []),
            "model": response.get("model"), "provider": response.get("provider")}


def _session_metadata() -> dict:
    """Read session identifiers and titles from the live CLI's native session manager."""
    response = ipc_call("sessions.list")
    if not response.get("ok"):
        reason = (response.get("error") or {}).get("code", "Hermes IPC unavailable")
        return {"available": False, "sessions": [], "reason": reason}
    return {"available": True, "sessions": response.get("sessions", [])}


class Handler(BaseHTTPRequestHandler):
    server_version = "HermesBridge/0.1"

    def log_message(self, fmt: str, *args) -> None:
        print(f"{self.log_date_time_string()} {self.address_string()} {fmt % args}")

    def _send(self, status: int, data: dict) -> None:
        body = json.dumps(data).encode()
        origin = self.headers.get("Origin", "")
        if origin.startswith("chrome-extension://"):
            self.send_response(status)
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        else:
            self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length < 1 or length > MAX_BODY:
            raise ValueError("Request body size is invalid")
        value = json.loads(self.rfile.read(length))
        if not isinstance(value, dict):
            raise ValueError("JSON object required")
        return value

    def _request_allowed(self) -> bool:
        host = self.headers.get("Host", "")
        origin = self.headers.get("Origin", "")
        return host in {f"127.0.0.1:{PORT}", f"localhost:{PORT}"} and origin.startswith("chrome-extension://")

    def _authorized(self) -> bool:
        if self.path == "/v1/pair":
            return True
        return PAIRED and secrets.compare_digest(self.headers.get("Authorization", ""), f"Bearer {TOKEN}")

    def do_OPTIONS(self) -> None:
        origin = self.headers.get("Origin", "")
        if not self._request_allowed():
            return self._send(403, {"error": "origin_denied"})
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Vary", "Origin")
        self.end_headers()

    def do_GET(self) -> None:
        if not self._request_allowed():
            return self._send(403, {"error": "origin_denied"})
        if self.path == "/v1/health":
            hermes_state = ipc_call("state")
            return self._send(200, {"status": "ready", "paired": PAIRED,
                                    "hermes_connected": bool(hermes_state.get("ok"))})
        if not self._authorized():
            return self._send(401, {"error": "unauthorized"})
        path = urlparse(self.path).path
        if path == "/v1/providers":
            return self._send(200, _provider_metadata())
        if path == "/v1/sessions":
            return self._send(200, _session_metadata())
        if path == "/v1/state":
            return self._send(200, ipc_call("state"))
        if path == "/v1/requests":
            if not IPC_EXECUTION_ENABLED:
                return self._send(200, {"requests": []})
            response = ipc_call("requests.list")
            return self._send(200 if response.get("ok") else 503, response)
        if path.startswith("/v1/requests/") and path.endswith("/result"):
            request_id = path[len("/v1/requests/"):-len("/result")].strip("/")
            response = ipc_call("request.get", request_id=request_id)
            if not response.get("ok"):
                return self._send(404 if (response.get("error") or {}).get("code") == "not_found" else 503,
                                  response)
            request = response["request"]
            if request.get("status") != "completed":
                return self._send(409, {"error": {"code": "result_not_ready"}})
            return self._send(200, {"result": request.get("result"), "request_id": request_id})
        if path.startswith("/v1/requests/"):
            if not IPC_EXECUTION_ENABLED:
                return self._send(404, {"error": "not_found"})
            request_id = path[len("/v1/requests/"):]
            response = ipc_call("request.get", request_id=request_id)
            if not response.get("ok"):
                return self._send(404 if (response.get("error") or {}).get("code") == "not_found" else 503,
                                  response)
            return self._send(200, response["request"])
        self._send(404, {"error": "not_found"})

    def do_POST(self) -> None:
        if not self._request_allowed():
            return self._send(403, {"error": "origin_denied"})
        try:
            data = self._body()
        except Exception as exc:
            return self._send(400, {"error": str(exc)})
        if self.path == "/v1/pair":
            global PAIRED
            if PAIRED or not secrets.compare_digest(str(data.get("code", "")), PAIR_CODE):
                return self._send(403, {"error": "pairing_denied"})
            PAIRED = True
            return self._send(200, {"token": TOKEN})
        if not self._authorized():
            return self._send(401, {"error": "unauthorized"})
        if self.path != "/v1/requests":
            return self._send(404, {"error": "not_found"})
        prompt = data.get("prompt")
        if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 48_000:
            return self._send(400, {"error": "invalid_prompt"})
        if not IPC_EXECUTION_ENABLED:
            # Fail closed before accepting or retaining a job. No Hermes process is launched.
            return self._send(503, {"error": {"code": "UNSAFE_EXECUTION_MODE", "message": "Hermes task execution remains disabled until native terminal approval preservation passes the required live acceptance test."}})
        request_id = data.get("request_id")
        session_id = data.get("session_id")
        if not isinstance(request_id, str) or not request_id or len(request_id) > 128:
            return self._send(400, {"error": {"code": "invalid_request_id"}})
        if not isinstance(session_id, str) or not session_id:
            return self._send(400, {"error": {"code": "invalid_session_id"}})
        response = ipc_call("submit", request_id=request_id, session_id=session_id, prompt=prompt)
        return self._send(202 if response.get("ok") else 409, response)

    def do_DELETE(self) -> None:
        if not self._request_allowed():
            return self._send(403, {"error": "origin_denied"})
        if not self._authorized():
            return self._send(401, {"error": "unauthorized"})
        if not IPC_EXECUTION_ENABLED:
            return self._send(503, {"error": {"code": "UNSAFE_EXECUTION_MODE", "message": "Hermes task cancellation remains disabled until native IPC acceptance tests pass."}})
        path = urlparse(self.path).path
        prefix = "/v1/requests/"
        if path.startswith(prefix):
            request_id = path[len(prefix):]
            response = ipc_call("request.cancel", request_id=request_id)
            return self._send(200 if response.get("ok") else 409, response)
        return self._send(404, {"error": "not_found"})

if __name__ == "__main__":
    print(f"Hermes bridge pairing code: {PAIR_CODE}")
    print(f"Listening on http://{HOST}:{PORT}; Hermes execution is disabled")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
