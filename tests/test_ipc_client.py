import json
import os
from multiprocessing.connection import Listener
from pathlib import Path
import secrets
import tempfile
import threading
import unittest
import uuid
from unittest.mock import patch

from gateway.ipc_client import ipc_call


class IPCClientTests(unittest.TestCase):
    def test_gateway_client_authenticates_and_uses_private_descriptor(self):
        with tempfile.TemporaryDirectory() as temp:
            home = Path(temp)
            ipc_dir = home / "ipc"
            ipc_dir.mkdir()
            key = secrets.token_bytes(32)
            family = "AF_PIPE" if os.name == "nt" else "AF_UNIX"
            address = (rf"\\.\pipe\hermes-test-{uuid.uuid4().hex}" if os.name == "nt"
                       else str(ipc_dir / "test.sock"))
            listener = Listener(address, family=family, authkey=key)
            descriptor = ipc_dir / "interactive.json"
            descriptor.write_text(json.dumps({"version":1, "family":family, "address":address,
                                              "authkey":key.hex()}), encoding="utf-8")
            if os.name != "nt":
                os.chmod(ipc_dir, 0o700)
                os.chmod(descriptor, 0o600)

            def serve_once():
                connection = listener.accept()
                try:
                    request = json.loads(connection.recv_bytes(1024).decode("utf-8"))
                    connection.send_bytes(json.dumps({"ok":True, "method":request["method"],
                                                      "session_id":request["session_id"]}).encode("utf-8"))
                finally:
                    connection.close()

            thread = threading.Thread(target=serve_once, daemon=True)
            thread.start()
            try:
                with patch("gateway.ipc_client.hermes_home", return_value=home):
                    response = ipc_call("submit", session_id="session-a")
                self.assertTrue(response["ok"])
                self.assertEqual(response["method"], "submit")
                self.assertEqual(response["session_id"], "session-a")
            finally:
                thread.join(timeout=2)
                listener.close()


if __name__ == "__main__":
    unittest.main()
