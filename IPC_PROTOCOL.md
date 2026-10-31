# Hermes Interactive IPC Protocol

This protocol is available only when Hermes is explicitly started with `hermes --ipc`. It uses Python's authenticated `multiprocessing.connection` transport: Windows `AF_PIPE`, Unix `AF_UNIX`. Each connection carries one UTF-8 JSON object and one UTF-8 JSON response as length-framed byte messages, then closes. The IPC implementation caps an inbound frame at 1 MiB and prompts at 48,000 characters.

## Endpoint and trust

The server generates a random 32-byte authentication key and writes an `interactive.json` descriptor beneath `<HERMES_HOME>/ipc/`. The descriptor contains `family`, `address`, and hex `authkey`. Treat it as a bearer secret. On Unix, the IPC directory and files are restricted to the user. On Windows, the IPC directory ACL is restricted to the current user, SYSTEM, and Administrators; failure to apply the ACL prevents startup. The server also uses a process lock to prevent two IPC listeners from owning the same Hermes home.

The gateway client reads this descriptor locally; the browser extension never receives the IPC key. Gateway HTTP pairing and its bearer token are a separate trust boundary.

## Request envelope

Every request is a JSON object with a string `method`. Methods and fields:

| Method | Fields | Purpose |
| --- | --- | --- |
| `state` | none | Read readiness, current session/provider/model, busy flag, and active request ID. |
| `sessions.list` | none | Read recent Hermes session IDs/titles and active marker from the native session manager. |
| `model.list` | none | Return configured provider/model names and current provider/model only. |
| `submit` | `request_id`, `session_id`, `prompt` | Queue a prompt for the existing TUI's normal chat processing. `session_id` may be `new` to create a native session. |
| `session.create` | `request_id`, `prompt` | Alias that queues a prompt targeted to a new session. |
| `request.get` | `request_id` | Read a request's state and, when completed, result. |
| `requests.list` | none | List retained request records. |
| `request.cancel` | `request_id` | Cancel a queued request or request the existing Hermes agent interrupt for the active request when cancellation is safe. |

## Response shapes

Success responses include `{"ok": true, ...}`. Errors include `{"error":{"code":"...","message":"..."}}` where applicable. A successful `submit` returns `duplicate` and a public `request` record. Repeating an existing request ID returns its existing record instead of queuing another turn.

Public request records contain `request_id`, `turn_id`, `session_id`, `status`, timestamps, `result`, `error`, and observed `approval` status. Statuses used by the implementation include `queued`, `started`, `approval_required`, `completed`, `failed`, `cancelled`, and `busy`. Results and records are held in memory in the Hermes process, capped to 256 records; the pending queue is capped at 64 requests. A process restart loses these transient records.

`state` has a names-only record of status, session ID, provider, model, busy state, and active request ID. `model.list` deliberately constructs provider/model name lists instead of serializing raw inventory rows. No credentials are part of these public responses.

## Lifecycle and safety

The TUI runtime polls the IPC queue only when its ordinary pending-input queue is empty. It begins one external request at a time, switches to the selected native session (or creates one using the native session creation path), and passes the prompt to ordinary TUI chat processing. External text bypasses local slash/bang command dispatch. The normal Hermes tool execution path and native approval callback remain in use. The IPC observer reports that approval is required/resolved but exposes no approval decision method.

Queued cancellation marks a request cancelled before start. Active cancellation is enabled only after the normal agent worker is running and is sent through Hermes' interrupt compatibility helper. Cancellation cannot guarantee an immediate stop for every tool operation; native approval still governs protected actions.

## Current gateway state

The gateway's execution feature flag remains false. HTTP `POST /v1/requests` returns 503 before IPC submission; the browser therefore cannot yet enqueue work through the gateway. The IPC request protocol is implemented for controlled direct testing, but not approved for production use until the live acceptance tests pass.
