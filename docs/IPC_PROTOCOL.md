# IPC Protocol

This document describes the **implemented** Hermes interactive IPC protocol. It is available only when Hermes is explicitly started with `hermes --ipc`. Ordinary `hermes` does not expose an IPC endpoint.

## Transport

- **Mechanism**: Python `multiprocessing.connection` (authenticated, length-framed byte messages)
- **Windows**: `AF_PIPE` (named pipe `\\.\pipe\hermes-ipc-<random>`)
- **Unix**: `AF_UNIX` (domain socket `<HERMES_HOME>/ipc/interactive.sock`)
- **Authentication**: 32-byte random key (256 bits)
- **Descriptor**: Written to `<HERMES_HOME>/ipc/interactive.json` with `family`, `address`, `authkey` (hex)
- **Frame limit**: 1 MiB inbound
- **Prompt limit**: 48,000 characters
- **Connection model**: One request/response per connection (connect → send → recv → close)

## Descriptor Format

```json
{
  "version": 1,
  "family": "AF_PIPE",
  "address": "\\\\.\\pipe\\hermes-ipc-<uuid>",
  "authkey": "<64 hex chars>"
}
```

**Security**: The descriptor contains the authentication key. Treat it as a bearer secret.
- Unix: IPC directory and files restricted to user (0700/0600)
- Windows: IPC directory ACL restricted to current user, SYSTEM, Administrators; creation fails closed if ACL command fails
- Process lock prevents two IPC listeners on the same Hermes home

## Request Envelope

Every request is a JSON object with a required string `method` field.

| Method | Fields | Purpose |
|--------|--------|---------|
| `state` | (none) | Read readiness, current session/provider/model, busy flag, active request ID |
| `sessions.list` | (none) | Read recent Hermes session IDs, titles, and active marker from native session manager |
| `model.list` | (none) | Return configured provider/model names and current provider/model only |
| `submit` | `request_id` (string), `session_id` (string), `prompt` (string) | Queue a prompt for the existing TUI's normal chat processing. `session_id` may be `"new"` to create a native session. |
| `session.create` | `request_id` (string), `prompt` (string) | Alias that queues a prompt targeted to a new session |
| `request.get` | `request_id` (string) | Read a request's state and, when completed, result |
| `requests.list` | (none) | List retained request records |
| `request.cancel` | `request_id` (string) | Cancel a queued request or request the existing Hermes agent interrupt for the active request when cancellation is safe |

### Field Constraints

| Field | Constraint |
|-------|------------|
| `request_id` | Non-empty string, max 128 chars |
| `session_id` | Non-empty string, or `"new"` |
| `prompt` | Non-empty string, max 48,000 chars |

## Response Shapes

### Success
All successful responses include `"ok": true` plus method-specific fields.

```json
{ "ok": true, "method": "submit", "request_id": "...", "session_id": "...", "status": "queued" }
```

### Error
```json
{ "error": { "code": "error_code", "message": "human-readable description" } }
```

### Method-Specific Responses

#### `state`
```json
{
  "ok": true,
  "state": {
    "session_id": "sess-abc",
    "provider": "nvidia",
    "model": "nemotron-3-ultra",
    "busy": false,
    "active_request_id": null
  }
}
```

#### `sessions.list`
```json
{
  "ok": true,
  "sessions": [
    { "id": "sess-abc", "title": "Work project", "active": true },
    { "id": "sess-def", "title": "Personal", "active": false }
  ]
}
```

#### `model.list`
```json
{
  "ok": true,
  "providers": [
    { "name": "nvidia", "models": ["nemotron-3-ultra", "llama-3.1-70b"] },
    { "name": "openai", "models": ["gpt-4o", "gpt-4o-mini"] }
  ],
  "model": "nemotron-3-ultra",
  "provider": "nvidia"
}
```

#### `submit` / `session.create`
```json
{
  "ok": true,
  "duplicate": false,
  "request": {
    "request_id": "uuid",
    "turn_id": 123,
    "session_id": "sess-abc",
    "status": "queued",
    "created_at": 1700000000.0,
    "started_at": null,
    "completed_at": null,
    "result": null,
    "error": null,
    "approval": null
  }
}
```
- If `request_id` already exists, returns `"duplicate": true` with the existing record (no new queuing)

#### `request.get`
```json
{
  "ok": true,
  "request": {
    "request_id": "uuid",
    "turn_id": 123,
    "session_id": "sess-abc",
    "status": "completed",
    "created_at": 1700000000.0,
    "started_at": 1700000001.0,
    "completed_at": 1700000045.0,
    "result": "The answer is...",
    "error": null,
    "approval": "resolved"
  }
}
```

#### `requests.list`
```json
{
  "ok": true,
  "requests": [ /* request records, most recent first */ ]
}
```

#### `request.cancel`
```json
{ "ok": true, "status": "cancelled" }
```

## Request Status Values

| Status | Meaning |
|--------|---------|
| `queued` | Accepted, waiting for TUI to pick up |
| `started` | TUI has begun processing |
| `approval_required` | Native Hermes approval prompt is active |
| `completed` | Finished successfully, `result` populated |
| `failed` | Error during processing, `error` populated |
| `cancelled` | Cancelled before or during execution |
| `busy` | TUI busy with another external request (queue full or single-threaded) |

## Approval Observation

The IPC protocol **exposes no approval decision method**. It only reports the native approval state through the `approval` field in request records:

| Value | Meaning |
|-------|---------|
| `null` | No approval needed or not yet reached |
| `pending` | Native approval prompt is displayed in terminal |
| `resolved` | Approval granted, execution proceeding |
| `denied` | User denied approval in terminal |

The gateway cannot approve or deny — the human at the Hermes terminal must interact with the native prompt.

## Lifecycle and Safety

### Request Processing
1. TUI runtime polls IPC queue only when its ordinary pending-input queue is empty
2. Begins one external request at a time
3. Switches to selected native session (or creates one via native session creation path)
4. Passes prompt to ordinary TUI `chat()` processing
5. External text **bypasses local slash/bang command dispatch**
6. Normal Hermes tool execution path and native approval callback remain in use
7. IPC observer reports approval required/resolved but exposes no approval control method

### Cancellation
- **Queued cancellation**: Marks request cancelled before TUI starts it
- **Active cancellation**: Enabled only after normal agent worker is running; sent through Hermes' interrupt compatibility helper
- **Cannot guarantee immediate stop** for every tool operation; native approval still governs protected actions

### Queue and Retention Limits
- Pending queue: 64 requests max
- Retained request records: 256 max (in memory, lost on process exit)
- Process restart loses all transient records

## Current Gateway State

The gateway's execution feature flag remains **false** (`IPC_EXECUTION_ENABLED = False` in `gateway/server.py:19`).

- HTTP `POST /v1/requests` returns **503** with error code `UNSAFE_EXECUTION_MODE`
- The gateway does not queue, launch, or claim to run any Hermes task
- The IPC request protocol is implemented for controlled direct testing only
- Not approved for production use until live acceptance tests pass

## Example: Direct IPC Test (Python)

```python
import json
from multiprocessing.connection import Client

# Read descriptor
with open(r"%LOCALAPPDATA%\hermes\ipc\interactive.json") as f:
    desc = json.load(f)

authkey = bytes.fromhex(desc["authkey"])
conn = Client(desc["address"], family=desc["family"], authkey=authkey)

try:
    # Send request
    conn.send_bytes(json.dumps({"method": "state"}).encode())
    response = json.loads(conn.recv_bytes(1024 * 1024).decode())
    print(response)
finally:
    conn.close()
```

## Versioning

This is protocol version 1. No backward compatibility guarantees are made during active development. The descriptor includes `"version": 1` for future negotiation.