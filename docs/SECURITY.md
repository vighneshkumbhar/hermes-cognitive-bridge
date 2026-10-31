# Security

## Threat Model

### Assets to Protect
- User's Hermes CLI workspace, tools, and approval decisions
- User's authenticated ChatGPT Web session (cookies, tokens)
- Local filesystem access via Hermes tools
- IPC authentication keys and gateway bearer tokens

### Trust Boundaries
1. **Browser ↔ Gateway**: Chrome extension ↔ Local HTTP server
2. **Gateway ↔ Hermes IPC**: Local Python client ↔ Authenticated named pipe/socket
3. **Hermes Runtime**: Native TUI with its own tool approval system

### Attacker Capabilities (Assumed)
- Malicious web page content (selected text, prompts)
- Compromised browser extension (if user installs malicious one)
- Local user with access to filesystem
- Network attacker on localhost (if gateway misconfigured)

### Out of Scope
- Malicious Hermes source code (user controls their checkout)
- Physical access / kernel exploits
- Supply chain attacks on dependencies

## Authentication

### Browser ↔ Gateway

| Layer | Mechanism |
|-------|-----------|
| **Transport** | HTTP over loopback (`127.0.0.1:8765`) only |
| **Origin Validation** | Gateway rejects requests unless `Origin: chrome-extension://*` |
| **Host Validation** | Gateway rejects unless `Host` matches `127.0.0.1:PORT` or `localhost:PORT` |
| **Pairing** | One-time code (URL-safe, 9 chars, ~53 bits entropy) generated per gateway process |
| **Session Token** | 32-byte URL-safe bearer token (256 bits entropy), stored in extension `chrome.storage.local` |
| **Token Comparison** | Constant-time (`secrets.compare_digest`) |
| **Token Rotation** | Restarting gateway generates new pairing code and token |

**Pairing Flow:**
```
Gateway startup → PAIR_CODE printed to terminal
User enters code in extension → POST /v1/pair {code}
Gateway: constant-time compare → PAIRED=true → returns TOKEN
Extension stores TOKEN → subsequent requests: Authorization: Bearer <TOKEN>
```

### Gateway ↔ Hermes IPC

| Layer | Mechanism |
|-------|-----------|
| **Transport** | `multiprocessing.connection` (authenticated, length-framed) |
| **Authentication** | 32-byte random key (256 bits) generated at IPC server start |
| **Descriptor** | `<HERMES_HOME>/ipc/interactive.json` with `family`, `address`, `authkey` (hex) |
| **File Permissions** | Unix: 0700 dir / 0600 file; Windows: ACL restricted to user, SYSTEM, Administrators |
| **Process Lock** | Prevents duplicate IPC listeners on same Hermes home |

**Key Isolation:** The browser extension **never receives** the IPC authkey. Only the gateway reads the descriptor locally.

## Authorization

### Gateway Routes

| Route | Auth Required | Notes |
|-------|---------------|-------|
| `GET /v1/health` | No | Readiness + pairing state + Hermes IPC connection |
| `POST /v1/pair` | No | Single-use pairing code |
| `GET /v1/providers` | Bearer token | Names-only metadata from live Hermes |
| `GET /v1/sessions` | Bearer token | Native session IDs/titles from live Hermes |
| `GET /v1/state` | Bearer token | Current session/provider/model/busy |
| `POST /v1/requests` | Bearer token | **Returns 503** (execution disabled) |
| `GET /v1/requests` | Bearer token | Empty list (execution disabled) |
| `GET /v1/requests/{id}` | Bearer token | 404 (execution disabled) |
| `GET /v1/requests/{id}/result` | Bearer token | 404 (execution disabled) |
| `DELETE /v1/requests/{id}` | Bearer token | **Returns 503** (execution disabled) |

## Input Validation

### Gateway HTTP
- Body size capped at 64 KiB
- JSON must be object
- `prompt`: string, non-empty, max 48,000 chars
- `request_id`: string, non-empty, max 128 chars
- `session_id`: string, non-empty (or "new" for submit)
- `code` (pairing): string, constant-time compare

### Hermes IPC
- Frame size capped at 1 MiB
- Prompt length capped at 48,000 chars
- Request ID deduplication (returns existing record)
- Pending queue capped at 64 requests
- Retained records capped at 256 (in-memory, lost on restart)

## Data Handling

| Data Type | Logging | Storage | Transmission |
|-----------|---------|---------|--------------|
| Pairing code | Printed to gateway stdout once | Gateway memory only | User manual copy |
| Bearer token | Never logged | Extension `chrome.storage.local` | HTTPS-style header (loopback) |
| IPC authkey | Never logged | `<HERMES_HOME>/ipc/interactive.json` (0600/ACL) | Gateway reads locally only |
| User prompts | Never logged by gateway | Hermes in-memory request record | Gateway ↔ Hermes IPC (local) |
| Hermes results | Never logged by gateway | Hermes in-memory request record | Hermes → Gateway → Extension |
| Provider/model names | Never logged | Hermes config | IPC metadata responses (names only) |
| Credentials (API keys) | Never | Hermes config (external) | **Never transmitted** via IPC |

## Approval Preservation

**Critical invariant:** The IPC protocol **exposes no approval decision method**.

- Hermes native approval callback runs unchanged in the TUI
- IPC observer reports approval state: `pending` → `resolved` / `denied`
- Gateway cannot approve, deny, or bypass
- Dangerous-tool approvals require human at terminal
- `HERMES_YOLO_MODE=1` (one-shot) is explicitly rejected by `--ipc` mode

## Known Security Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| No OS-protected token storage | Extension local storage accessible to user | Acceptable for local dev tool |
| No token revoke/rotate endpoint | Compromised token valid until gateway restart | Restart gateway to rotate |
| No rate limiting | Local DoS possible | Gateway binds loopback only; single-user |
| No TLS | Loopback HTTP in cleartext | Localhost only; consider TLS for future |
| IPC descriptor file | Contains authkey; file perms only protection | Windows ACL / Unix 0600; don't share |
| No audit logging | No record of requests/results | Add if needed for compliance |

## Features Intentionally Disabled

| Feature | Reason | Re-enable Condition |
|---------|--------|---------------------|
| Gateway task execution (`IPC_EXECUTION_ENABLED`) | Native approval preservation not live-verified | Live approval acceptance test passes + manual review |
| Hermes subprocess launch | Would bypass IPC authentication | Not planned; user starts `hermes --ipc` manually |
| YOLO mode (`HERMES_YOLO_MODE=1`) | Bypasses dangerous-tool approvals | Explicitly rejected by `--ipc` mode |
| Automatic ChatGPT response scraping | Violates user control principle | Never planned |
| LAN binding | Exposes local gateway to network | Configurable but default loopback only |

## Security Testing

Run security-focused unit tests:
```bash
python -m unittest tests.test_security_remediation -v
```

Tests verify:
- Task submission fails closed (503, no subprocess)
- Concurrent requests all return 503
- Error responses never contain sensitive diagnostics
- Pairing code is single-use
- Metadata exposes names only (no credentials)
- Session metadata from live Hermes
- Health reports IPC connection without runtime state exposure

## Reporting Security Issues

If you discover a security vulnerability, please report it privately:

1. **Do not** open a public issue
2. Email: [maintainer email - to be added before publication]
3. Include: description, reproduction steps, impact assessment

We will acknowledge receipt within 48 hours and coordinate disclosure.