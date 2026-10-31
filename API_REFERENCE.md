# Local API reference

Base URL: `http://127.0.0.1:8765`. Browser calls must include a `chrome-extension://...` Origin. Authenticated routes require `Authorization: Bearer <paired token>`.

- `GET /v1/health` — gateway readiness, pairing state, and whether an IPC-enabled Hermes process is connected.
- `POST /v1/pair` — body `{"code":"one-time-code"}`; returns `{"token":"..."}` once.
- `GET /v1/providers` — names-only provider/model list from the live Hermes IPC process; credentials are excluded.
- `GET /v1/sessions` — native session identifiers/titles and active markers from the live Hermes CLI.
- `GET /v1/state` — authorized, names-only current Hermes session/provider/model and busy state.
- `POST /v1/requests` — currently returns HTTP 503 with `UNSAFE_EXECUTION_MODE`; tasks are not queued or launched by the gateway.
- `GET /v1/requests` — empty list (execution is disabled).
- `GET /v1/requests/{uuid}` and `/result` — request status/result routes are gated off while execution is disabled.
- `DELETE /v1/requests/{uuid}` — cancellation is gated off while execution is disabled.

The gateway caps HTTP body size at 64 KiB. Hermes IPC caps prompt size at 48,000 characters, inbound frame size at 1 MiB, pending queue at 64 requests, and retained request records at 256. The gateway does not currently forward task submissions to Hermes.
