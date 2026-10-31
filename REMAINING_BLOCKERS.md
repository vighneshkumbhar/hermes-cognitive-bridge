# Remaining blockers

1. **Critical approval acceptance:** manually start the modified CLI using `hermes --ipc`, trigger a controlled native approval in a disposable workspace, deny it, and verify the operation does not run, the gateway cannot approve it, and Hermes returns a final response.
2. **Live TUI scheduling/session continuity:** verify an innocuous external prompt goes through normal chat processing, preserves the selected Hermes session/history, and leaves the terminal usable.
3. **Live cancellation:** verify active cancellation follows Hermes' native interrupt path without affecting unrelated work.
4. **Real browser:** load the unpacked extension in Chrome/Brave and validate pairing, panel recovery, transfer 503 status, metadata, and result copy behavior.
5. **Execution remains disabled:** `IPC_EXECUTION_ENABLED` must stay `False` until blockers 1–3 pass and are reviewed. The gateway currently returns HTTP 503 and does not submit tasks to Hermes.
