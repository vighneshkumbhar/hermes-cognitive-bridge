# Architecture

## System Overview

Hermes Cognitive Bridge connects three components through two trust boundaries:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        USER CONTROL BOUNDARY                            │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │  ChatGPT Web     │    │  Browser         │    │  Local Gateway   │  │
│  │  (User Session)  │───▶│  Extension (MV3) │───▶│  (Python, :8765) │  │
│  └──────────────────┘    └──────────────────┘    └────────┬─────────┘  │
│                                                           │            │
│                              ┌────────────────────────────┘            │
│                              ▼                                         │
│                    ┌────────────────────────┐                         │
│                    │   HERMES IPC BOUNDARY  │                         │
│                    │  ┌──────────────────┐  │                         │
│                    │  │  Hermes --ipc    │  │                         │
│                    │  │  (Native CLI)    │  │                         │
│                    │  └────────┬─────────┘  │                         │
│                    │           │            │                         │
│                    │           ▼            │                         │
│                    │  ┌──────────────────┐  │                         │
│                    │  │  Hermes Runtime  │  │                         │
│                    │  │  - Model Providers│  │                         │
│                    │  │  - Tools          │  │                         │
│                    │  │  - Native Approval│  │                         │
│                    │  │  - Session Mgmt   │  │                         │
│                    │  └──────────────────┘  │                         │
│                    └────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. ChatGPT Web (User's Browser)
- User's authenticated ChatGPT session
- **Bridge never accesses** cookies, tokens, credentials, or generated responses
- User manually selects text or enters prompts in the extension panel

### 2. Browser Extension (Manifest V3)
- **Service Worker** (`service-worker.js`): Background HTTP gateway communication, token storage, request lifecycle
- **Content Script** (`content.js`): In-page panel injected above ChatGPT composer using Shadow DOM
- **Popup** (`popup.html/js/css`): Alternative UI for quick actions
- **Permissions**: `storage`, `clipboardWrite`, host access to `chatgpt.com`, `chat.openai.com`, `http://127.0.0.1:8765/*`

### 3. Local Python Gateway (`gateway/server.py`)
- **ThreadingHTTPServer** on `127.0.0.1:8765` (configurable via `HERMES_BRIDGE_PORT`)
- **Standard library only** — no external HTTP framework dependencies
- **Request validation**: Origin must be `chrome-extension://*`, Host must match localhost:port
- **Authentication**: One-time pairing code → 32-byte bearer token
- **IPC Client** (`gateway/ipc_client.py`): Authenticated connection to Hermes `--ipc`

### 4. Hermes CLI (`hermes --ipc`)
- **Opt-in IPC mode** — ordinary `hermes` starts without IPC listener
- **Interactive TUI runtime** with native session manager, model providers, tools, approval callbacks
- **IPC Server** (`hermes_cli/interactive_ipc.py`): Authenticated `multiprocessing.connection` transport
  - Windows: `AF_PIPE` (named pipe)
  - Unix: `AF_UNIX` (domain socket)
  - 32-byte authkey stored in `<HERMES_HOME>/ipc/interactive.json`
- **Request queue** (cap: 64) → TUI chat path → native approval → result → retained records (cap: 256)

## Communication Flow

### Pairing Flow
```
1. Gateway starts → generates PAIR_CODE (urlsafe, 9 chars) + TOKEN (urlsafe, 32 chars)
2. User copies PAIR_CODE from gateway terminal
3. Extension panel: user enters code → POST /v1/pair {code}
4. Gateway validates code (constant-time compare), marks PAIRED=true, returns TOKEN
5. Extension stores TOKEN in chrome.storage.local
6. Subsequent requests: Authorization: Bearer <TOKEN>
```

### Request Flow (When Enabled)
```
1. User clicks "Send to Hermes" in extension panel
2. Extension: POST /v1/requests {request_id, prompt, session_id, mode}
3. Gateway: validates auth, checks IPC_EXECUTION_ENABLED
4. Gateway: ipc_call("submit", request_id, session_id, prompt)
5. Hermes IPC: enqueues request → TUI picks up → normal chat() processing
6. Hermes: native approval prompts appear in terminal (gateway cannot bypass)
7. Hermes: on completion, stores result in request record
8. Extension: polls GET /v1/requests/{id} → GET /v1/requests/{id}/result
9. User: copies result manually → pastes into ChatGPT
```

### Metadata Flow (Always Available)
```
Extension → GET /v1/providers → Gateway → ipc_call("model.list") → Hermes → names only
Extension → GET /v1/sessions → Gateway → ipc_call("sessions.list") → Hermes → IDs/titles
Extension → GET /v1/state → Gateway → ipc_call("state") → Hermes → current session/provider/model
```

## Security Boundaries

| Boundary | Protection |
|----------|------------|
| Browser → Gateway | Origin validation (`chrome-extension://*`), Host validation, Bearer token |
| Gateway → Hermes IPC | 32-byte authkey in local descriptor, OS-level ACL (Windows) / 0700 (Unix) |
| Hermes Runtime | Native approval callbacks unchanged — no IPC approval method exists |
| Data | Prompts/results not logged; IPC metadata exposes names only; no credentials in responses |

## Responsibilities

| Component | Responsible For | NOT Responsible For |
|-----------|-----------------|---------------------|
| Extension | UI, user selection, token storage, request/recovery, copy-to-clipboard | Executing prompts, accessing ChatGPT internals, approval decisions |
| Gateway | Auth, pairing, request validation, IPC protocol, metadata proxy | Launching Hermes, executing tools, bypassing approvals, persisting results |
| Hermes IPC | Request queue, session/model metadata, TUI integration, native approval | Serving HTTP, browser communication, token management |
| Hermes Runtime | Model inference, tool execution, approval prompts, session history | Network communication, browser automation, gateway logic |

## Failure Modes

| Scenario | Behavior |
|----------|----------|
| Gateway not running | Extension shows "Gateway unavailable" |
| Hermes not running with `--ipc` | Metadata shows "Hermes not running with --ipc"; health shows `hermes_connected: false` |
| Pairing code wrong/expired | 403 pairing_denied; code is single-use per gateway process |
| Token invalid/expired | 401 unauthorized; restart gateway to rotate |
| IPC_EXECUTION_ENABLED=false | 503 UNSAFE_EXECUTION_MODE; request not queued |
| Hermes busy | Request queued (cap 64); status "queued" → "started" → "approval_required" → "completed" |
| Native approval denied | Request status "failed" with approval error; gateway cannot override |
| Hermes process exits | IPC descriptor removed; gateway health shows disconnected; in-memory request records lost |

## Data Flow Invariants

1. **No automatic submission** — every transfer requires explicit user click
2. **No ChatGPT response scraping** — extension only reads user selection/input
3. **No credential exposure** — IPC metadata returns provider/model names only
4. **No approval bypass** — IPC protocol has no `approve`/`deny` methods
5. **No persistent request state** — Hermes request records are in-memory, lost on restart
6. **No gateway subprocess execution** — gateway never spawns Hermes or runs commands