# Test results — Phase 1 sprint

Run: `python -m unittest discover -s tests -v` (with localhost socket permission)

- `test_task_submission_fails_closed_without_launching_hermes` — PASS
- `test_concurrent_requests_are_never_queued_or_launched` — PASS
- `test_error_response_never_contains_sensitive_diagnostics` — PASS
- `test_pairing_code_is_single_use` — PASS
- `test_metadata_exposes_provider_model_names_without_credentials` — PASS
- `test_sessions_are_reported_unavailable_instead_of_fabricated` — PASS
- `test_panel_injects_before_composer_and_recovers_after_dom_changes` — PASS (source contract)
- `test_manual_transfer_requires_visible_user_action_and_handles_503` — PASS (source contract)
- `test_result_copy_and_active_request_persistence` — PASS (source contract)
- `test_modes_metadata_and_minimal_scoped_permissions` — PASS (source contract)
- `test_no_private_chatgpt_api_or_response_scraping` — PASS (source contract)
- `node --check extension/content.js` — PASS
- `node --check extension/service-worker.js` — PASS
- `python -m compileall -q gateway tests` — PASS
- Static gateway scan — no subprocess invocation, oneshot command, stderr path, or task queue remains; only the explanatory YOLO comment matched.

The sandboxed socket run is restricted; tests were run with localhost socket permission. Source-contract tests do not replace a real browser smoke test. No live Hermes task was run.

## Latest run — opt-in Hermes IPC implementation

Run date: 2026-10-31.

- `python -m unittest discover -s tests -v` — PASS, 14 tests.
- `node --check extension/content.js` — PASS.
- `node --check extension/service-worker.js` — PASS.
- In-memory Python compilation of the seven modified Hermes Python files — PASS.
- Hermes IPC unit suite — PASS, 10 tests, when run with the required Windows named-pipe access. The sandbox-only attempts were restricted; the reviewed test run outside the sandbox created only temporary transport/test state.
- Hermes' `py_compile` output could not be written into the Hermes checkout due workspace restrictions; compilation was instead checked in memory.
- No live `hermes --ipc` session, browser test, end-to-end response, cancellation acceptance, session continuity acceptance, or native tool-approval test was performed. Two existing Hermes processes were left untouched.
- Gateway execution remains disabled and task submission still returns HTTP 503. No Hermes subprocess execution path was added.
