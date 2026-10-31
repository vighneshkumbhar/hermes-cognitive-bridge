# Hermes Native IPC Implementation Report

## Outcome

An opt-in `hermes --ipc` mode and an authenticated local IPC protocol have been added to the Hermes source checkout. The gateway can read names-only model/provider metadata and native session identifiers from that process. Request submission, result retrieval, and cancellation plumbing are present in the protocol and UI, but gateway task execution remains deliberately disabled (`IPC_EXECUTION_ENABLED = False`) until the live native-approval acceptance test passes.

This is a partial implementation, not an end-to-end verified bridge. The gateway continues returning HTTP 503 for task submission; it neither launches Hermes nor claims that Hermes ran a request.

## Implemented and verified

- `--ipc` is opt-in; ordinary Hermes starts without an IPC listener.
- Hermes-side protocol has bounded requests, duplicate request ID handling, queued cancellation, request state/result records, explicit state and names-only model/session metadata.
- IPC clients authenticate using a randomly generated 32-byte key. The descriptor is stored under the Hermes home `ipc` directory. Unix permissions and Windows ACLs are applied by the IPC server code; endpoint creation fails closed if the Windows ACL command fails.
- External prompts use the normal TUI input-processing and `chat()` path. They cannot dispatch CLI-local slash or bang commands through the external input path.
- Approval status is observed from the existing Hermes approval callback. The protocol has no approval/allow operation.
- Gateway and extension protocol plumbing, request persistence, session selection, visible statuses, cancel/result controls, and fail-closed HTTP 503 behavior are covered by focused tests and source checks.
- Gateway workspace unittest suite: 14 tests passed.
- Extension `node --check`: both scripts passed.
- Hermes IPC unittest suite: all 10 tests passed when run with the required Windows named-pipe access. The sandbox-only attempts failed because named-pipe access was restricted; this was resolved by a reviewed, read/write-free test run outside the sandbox.
- Seven modified Hermes Python files compile successfully in memory.

## Implemented but not verified in a live Hermes process

- Starting the modified source checkout with `hermes --ipc` and observing a ready descriptor.
- Sending an innocuous prompt into an already running interactive TUI, retrieving the final result, and confirming that the same terminal remains usable.
- Switching to an existing native session and validating history continuity.
- Cancelling an active turn through Hermes' native interrupt mechanism.
- Seeing a real native dangerous-tool approval prompt, denying it, and proving the gateway cannot approve it.
- End-to-end extension and gateway behavior in a real browser.

Two Hermes processes (PIDs 42852 and 53952) remain running from before the source change. They were not stopped or modified and cannot expose the newly added listener until the user manually restarts them with the modified source.

## Blocked

The critical approval-preservation test requires an actual `hermes --ipc` TUI session and a controlled operation that triggers Hermes' native approval prompt. Until it passes, gateway request submission and cancellation remain disabled. Do not enable `IPC_EXECUTION_ENABLED` before that test and a manual review of the approval path.

The current runtime integration has not yet demonstrated that terminal rendering, interactive approval input, and external-turn scheduling coexist correctly under real prompt-toolkit operation. This remains the principal technical acceptance risk.

## Manual restart and test

1. Leave existing Hermes processes running until ready; they have not been changed by this patch.
2. In the user's terminal, exit the Hermes session normally.
3. Activate the modified Hermes checkout using its existing `activate.ps1` workflow, then start `hermes --ipc`.
4. Confirm the CLI visibly reports IPC readiness and the descriptor exists under `%LOCALAPPDATA%\hermes\ipc\interactive.json` (or the configured `HERMES_HOME`). Never copy or publish the descriptor because it contains the local IPC authentication key.
5. Start the gateway and reload the unpacked browser extension. Confirm `/v1/health` reports the Hermes connection and that metadata matches the live CLI.
6. Keep gateway execution disabled for the first harmless prompt acceptance test. Use an internal IPC test client or a temporary, reviewed test harness against the documented protocol; confirm a final response and normal continued terminal use.
7. Only after the harmless test, perform the controlled approval acceptance test in a disposable workspace. Confirm the native approval appears in the terminal, deny it, ensure no operation occurs, and confirm a final response is returned.
8. Audit the evidence and code before any separate change enables gateway execution.

See [IPC_PROTOCOL.md](IPC_PROTOCOL.md) and [HERMES_INSTALLATION_CHANGES.md](HERMES_INSTALLATION_CHANGES.md) for protocol and setup details.
