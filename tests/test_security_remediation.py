import concurrent.futures
import http.client
import json
import threading
import unittest
from unittest.mock import patch

import gateway.server as app


class SecurityRemediationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = app.ThreadingHTTPServer(("127.0.0.1", 0), app.Handler)
        app.PORT = cls.server.server_address[1]
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def call(self, method, path, payload=None, token="test-token"):
        conn = http.client.HTTPConnection("127.0.0.1", app.PORT, timeout=4)
        headers = {"Origin": "chrome-extension://unit-test", "Host": f"127.0.0.1:{app.PORT}"}
        if payload is not None:
            headers["Content-Type"] = "application/json"
        if token:
            headers["Authorization"] = f"Bearer {token}"
        conn.request(method, path, json.dumps(payload) if payload is not None else None, headers)
        response = conn.getresponse()
        data = json.loads(response.read() or b"{}")
        conn.close()
        return response.status, data

    def setUp(self):
        app.PAIRED = True
        app.TOKEN = "test-token"

    def test_task_submission_fails_closed_without_launching_hermes(self):
        with patch("subprocess.run") as run:
            status, body = self.call("POST", "/v1/requests", {"prompt": "touch a protected file"})
        self.assertEqual(status, 503)
        self.assertEqual(body["error"]["code"], "UNSAFE_EXECUTION_MODE")
        run.assert_not_called()

    def test_concurrent_requests_are_never_queued_or_launched(self):
        def submit(i):
            return self.call("POST", "/v1/requests", {"request_id": f"00000000-0000-4000-8000-{i:012d}", "prompt": "task"})
        with patch("subprocess.run") as run:
            with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
                replies = list(pool.map(submit, range(24)))
        self.assertTrue(all(code == 503 and body["error"]["code"] == "UNSAFE_EXECUTION_MODE" for code, body in replies))
        run.assert_not_called()
        status, listing = self.call("GET", "/v1/requests")
        self.assertEqual(status, 200)
        self.assertEqual(listing["requests"], [])

    def test_error_response_never_contains_sensitive_diagnostics(self):
        secrets_to_hide = ["sk-fake-123456", "C:\\private\\workspace", "provider internal trace", "sensitive prompt phrase"]
        injected = {"prompt": secrets_to_hide[-1], "diagnostic": " ".join(secrets_to_hide[:-1]), "stderr": " ".join(secrets_to_hide)}
        with patch("subprocess.run") as run:
            status, body = self.call("POST", "/v1/requests", injected)
        serialized = json.dumps(body)
        self.assertEqual(status, 503)
        self.assertEqual(body["error"]["code"], "UNSAFE_EXECUTION_MODE")
        self.assertTrue(all(secret not in serialized for secret in secrets_to_hide))
        run.assert_not_called()

    def test_pairing_code_is_single_use(self):
        app.PAIRED = False
        app.PAIR_CODE = "test-pair-code"
        status, _ = self.call("POST", "/v1/pair", {"code": "bad"}, token=None)
        self.assertEqual(status, 403)
        status, _ = self.call("POST", "/v1/pair", {"code": "test-pair-code"}, token=None)
        self.assertEqual(status, 200)
        status, _ = self.call("POST", "/v1/pair", {"code": "test-pair-code"}, token=None)
        self.assertEqual(status, 403)

    def test_metadata_comes_from_live_hermes_and_exposes_names_only(self):
        inventory = {"ok": True, "providers": [{"name": "nvidia", "models": ["model-a", "model-c"]}],
                     "model": "model-a", "provider": "nvidia", "api_key": "secret-token"}
        with patch("gateway.server.ipc_call", return_value=inventory):
            status, body = self.call("GET", "/v1/providers")
        serialized = json.dumps(body)
        self.assertEqual(status, 200)
        self.assertIn("model-a", serialized)
        self.assertIn("model-c", serialized)
        self.assertIn("nvidia", serialized)
        self.assertNotIn("secret-token", serialized)
        self.assertNotIn("api_key", serialized)

    def test_session_metadata_comes_from_live_hermes(self):
        live = {"ok": True, "sessions": [{"id": "session-a", "title": "work", "active": True}]}
        with patch("gateway.server.ipc_call", return_value=live):
            status, body = self.call("GET", "/v1/sessions")
        self.assertEqual(status, 200)
        self.assertTrue(body["available"])
        self.assertEqual(body["sessions"][0]["id"], "session-a")

    def test_health_reports_ipc_connection_without_exposing_runtime_state(self):
        with patch("gateway.server.ipc_call", return_value={"ok": True, "state": {"session_id": "private"}}):
            status, body = self.call("GET", "/v1/health", token=None)
        self.assertEqual(status, 200)
        self.assertTrue(body["hermes_connected"])
        self.assertNotIn("private", json.dumps(body))


if __name__ == "__main__":
    unittest.main()
