# Installation

## Hermes IPC

The implementation lives in the existing Hermes source checkout. Exit any old Hermes session normally, activate that checkout using its `activate.ps1` workflow, and start `hermes --ipc`. Ordinary `hermes` does not create an IPC endpoint. The listener writes a private descriptor under `%LOCALAPPDATA%\hermes\ipc\interactive.json` (or `$HERMES_HOME`). Do not share that descriptor; it contains the IPC key. See `HERMES_INSTALLATION_CHANGES.md`.

## Gateway

Requires Python 3.10+ and PyYAML (`python -m pip install -r gateway/requirements.txt`). From the project root run `python gateway/server.py`. The gateway prints a one-time pairing code and listens only on `127.0.0.1:8765`. Keep both the Hermes and gateway terminals open. **Task execution remains disabled**; requests return HTTP 503 until the native-approval acceptance test passes.

## Chrome / Brave extension

Open the browser extension management page, enable Developer mode, choose **Load unpacked**, and select the repository's `extension` directory. The extension requests storage and narrow host access to ChatGPT and the fixed localhost gateway. Open a ChatGPT conversation; the bridge panel appears above the composer. Enter the pairing code in the panel, then select page text or enter a prompt and click **Send to Hermes**.

To unpair, remove the extension's local storage or reload it and restart the gateway. Restarting the gateway rotates the pairing code and access token.
