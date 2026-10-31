from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ExtensionContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.content = (ROOT / "extension/content.js").read_text(encoding="utf-8")
        cls.worker = (ROOT / "extension/service-worker.js").read_text(encoding="utf-8")
        cls.manifest = (ROOT / "extension/manifest.json").read_text(encoding="utf-8")

    def test_panel_injects_before_composer_and_recovers_after_dom_changes(self):
        self.assertIn("composer.parentElement.insertBefore(root, composer)", self.content)
        self.assertIn("new MutationObserver", self.content)
        self.assertIn("new MutationObserver(() => inject())", self.content)

    def test_manual_transfer_requires_visible_user_action_and_handles_503(self):
        self.assertIn('getElementById("hcb-send").addEventListener("click"', self.content)
        self.assertIn('reply?.status === 503', self.content)
        self.assertIn("UNSAFE_EXECUTION_MODE", self.content)
        self.assertIn("Your prompt was not run.", self.content)

    def test_result_copy_and_active_request_persistence(self):
        self.assertIn('getElementById("hcb-copy").addEventListener("click"', self.content)
        self.assertIn("navigator.clipboard.writeText", self.content)
        self.assertIn('chrome.storage.local.set({ activeRequest })', self.worker)
        self.assertIn('chrome.storage.local.get(["activeRequest","mode","draft"])', self.content)
        self.assertIn('message("refresh", {requestId:active.requestId})', self.content)
        self.assertIn("/result`", self.worker)

    def test_modes_metadata_and_minimal_scoped_permissions(self):
        self.assertIn('["Manual", "Assisted", "Auto"]', self.content)
        self.assertIn('message("metadata")', self.content)
        self.assertIn('"https://chatgpt.com/*"', self.manifest)
        self.assertIn('"http://127.0.0.1:8765/*"', self.manifest)
        self.assertNotIn("<all_urls>", self.manifest)
        self.assertNotIn('"cookies"', self.manifest)

    def test_extension_targets_hermes_sessions_and_exposes_cancel_only(self):
        self.assertIn('id:"hcb-session"', self.content)
        self.assertIn('session_id:sessionId', self.worker)
        self.assertIn('id:"hcb-cancel"', self.content)
        self.assertIn('bridge.cancel', self.worker)
        self.assertNotIn('id:"hcb-approve"', self.content)

    def test_no_private_chatgpt_api_or_response_scraping(self):
        self.assertNotIn("/backend-api/", self.content + self.worker)
        self.assertNotIn("document.cookie", self.content + self.worker)
        self.assertNotIn("localStorage", self.content + self.worker)
        self.assertIn("window.getSelection()", self.content)


if __name__ == "__main__":
    unittest.main()
