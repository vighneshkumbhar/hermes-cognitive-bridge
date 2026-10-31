"""Client for the authenticated Hermes interactive CLI IPC protocol."""
from __future__ import annotations

import json
import os
from multiprocessing.connection import Client
from pathlib import Path

MAX_FRAME = 1024 * 1024


def hermes_home() -> Path:
    return Path(os.environ.get("HERMES_HOME") or
                (Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData/Local")) / "hermes"))


def ipc_call(method: str, **params) -> dict:
    """Perform one authenticated request to an explicitly started ``hermes --ipc`` process."""
    descriptor = hermes_home() / "ipc" / "interactive.json"
    try:
        data = json.loads(descriptor.read_text(encoding="utf-8"))
        family, address = data["family"], data["address"]
        authkey = bytes.fromhex(data["authkey"])
        if family not in {"AF_PIPE", "AF_UNIX"} or len(authkey) != 32:
            raise ValueError("invalid descriptor")
        conn = Client(address, family=family, authkey=authkey)
        try:
            conn.send_bytes(json.dumps({"method": method, **params}).encode("utf-8"))
            result = json.loads(conn.recv_bytes(MAX_FRAME).decode("utf-8"))
            return result if isinstance(result, dict) else {"error": {"code": "bad_response"}}
        finally:
            conn.close()
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError):
        return {"error": {"code": "hermes_unavailable"}}
