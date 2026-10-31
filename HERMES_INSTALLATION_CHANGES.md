# Hermes Installation Changes

The implementation was added to the existing Hermes source checkout at:

`C:\Users\vighn\AppData\Local\hermes\hermes-agent`

The change is source-only. No packages were installed, no configuration or provider defaults were changed, and no running Hermes process was stopped. The source checkout Git status was read-only checked and lists only the intended changes below; nothing was staged or committed.

## Files changed in the Hermes source checkout

- `cli.py` — accepts `ipc=False`, starts the IPC server only when requested, stops it with CLI lifecycle cleanup, and hands it to the TUI runtime.
- `hermes_cli/_parser.py` — adds the opt-in `--ipc` flag.
- `hermes_cli/main.py` — wires the flag to the classic interactive CLI and rejects incompatible/unsafe one-shot, YOLO, and structured streaming combinations.
- `hermes_cli/interactive_ipc.py` — authenticated local transport, descriptor/lock lifecycle, request queue and status, cancellation, and read-only metadata.
- `hermes_cli/cli_tui_runtime_mixin.py` — dequeues IPC prompts into the normal interactive chat path and avoids local command dispatch for external text.
- `hermes_cli/cli_chat_turn_mixin.py` — marks active cancellation safe only after agent execution starts.
- `hermes_cli/cli_modal_mixin.py` — observes existing approval lifecycle without exposing an IPC approval control.
- `tests/hermes_cli/test_interactive_ipc.py` — focused protocol and lifecycle unit tests.

## User-controlled restart

The already-running Hermes processes do not have this code loaded. Do not terminate them programmatically. When ready to test, exit them normally in their own terminals. In a new PowerShell session, run the repository's `activate.ps1` according to its printed instructions, verify that `Get-Command hermes` resolves to the modified checkout environment, and run:

```powershell
hermes --ipc
```

Normal `hermes` without `--ipc` does not start the listener. The listener writes its descriptor under `%LOCALAPPDATA%\hermes\ipc\interactive.json` unless `HERMES_HOME` is configured. Keep this file private; it contains an authentication secret.

The gateway remains fail-closed, so restarting with `--ipc` alone does not enable browser-submitted task execution. Test the IPC path with a reviewed local harness first, and perform the controlled native approval test before considering a separate gateway enablement change.
