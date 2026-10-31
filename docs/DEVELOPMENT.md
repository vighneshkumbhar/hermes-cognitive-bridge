# Development Guide

## Prerequisites

### Required
- **Python 3.10+** (standard library only for gateway)
- **Chromium-based browser** (Chrome, Brave, Edge) with Developer Mode
- **Git** for version control

### For Hermes IPC Development
- **Hermes source checkout** with IPC modifications (see [HERMES_INSTALLATION_CHANGES.md](../HERMES_INSTALLATION_CHANGES.md))
- **Windows**: PowerShell 5.1+ (for `activate.ps1`)
- **Unix**: Bash (for `activate`)

## Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd hermes-cognitive-bridge
```

### 2. Gateway Dependencies
```bash
cd gateway
python -m pip install -r requirements.txt
# Only PyYAML>=6.0,<7
```

### 3. Run Gateway
```bash
python server.py
# Output:
# Hermes bridge pairing code: <code>
# Listening on http://127.0.0.1:8765; Hermes execution is disabled
```

### 4. Load Extension
1. Open `chrome://extensions` (or `brave://extensions`)
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` directory
5. Extension appears as "Hermes Cognitive Bridge"

### 5. Start Hermes with IPC (when ready)
```powershell
# In a separate terminal
& "C:\Users\vighn\AppData\Local\hermes\hermes-agent\activate.ps1"
hermes --ipc
```

### 6. Pair and Test
1. Open ChatGPT (`chatgpt.com` or `chat.openai.com`)
2. Extension panel appears above composer
3. Enter pairing code from gateway terminal
4. Click "Pair gateway"
5. Select Hermes session, enter prompt, click "Send to Hermes"
6. Observe HTTP 503 (execution disabled) — this is expected

## Project Structure

```
hermes-cognitive-bridge/
├── gateway/
│   ├── server.py          # HTTP gateway (stdlib only)
│   ├── ipc_client.py      # Hermes IPC client
│   └── requirements.txt   # PyYAML only
├── extension/
│   ├── manifest.json      # Manifest V3
│   ├── service-worker.js  # Background script
│   ├── content.js         # In-page panel (shadow DOM)
│   ├── popup.html         # Popup UI
│   ├── popup.js           # Popup logic
│   └── popup.css          # Popup styles
├── tests/
│   ├── test_security_remediation.py
│   ├── test_ipc_client.py
│   └── test_extension_contract.py
├── docs/
│   ├── ARCHITECTURE.md
│   ├── IPC_PROTOCOL.md
│   ├── SECURITY.md
│   ├── DEVELOPMENT.md
│   └── ROADMAP.md
└── .github/
    ├── ISSUE_TEMPLATE/
    └── workflows/
```

## Running Tests

### All Tests
```bash
python -m unittest discover -s tests -v
```

### Specific Test Modules
```bash
# Security remediation tests (gateway behavior)
python -m unittest tests.test_security_remediation -v

# IPC client tests
python -m unittest tests.test_ipc_client -v

# Extension contract tests (source analysis)
python -m unittest tests.test_extension_contract -v
```

### JavaScript Syntax Check
```bash
node --check extension/content.js
node --check extension/service-worker.js
```

### Python Compilation Check
```bash
python -m compileall -q gateway tests
```

## Gateway Development

### Configuration
Environment variables:
| Variable | Default | Description |
|----------|---------|-------------|
| `HERMES_BRIDGE_PORT` | `8765` | Gateway listen port |
| `HERMES_HOME` | `%LOCALAPPDATA%\hermes` | Hermes home directory (for IPC descriptor) |

### Key Constants (gateway/server.py)
```python
HOST = "127.0.0.1"
PORT = int(os.environ.get("HERMES_BRIDGE_PORT", "8765"))
MAX_BODY = 64 * 1024          # 64 KiB HTTP body limit
PAIR_CODE = secrets.token_urlsafe(9)   # One-time pairing code
TOKEN = secrets.token_urlsafe(32)      # Bearer token
PAIRED = False                     # Pairing state
IPC_EXECUTION_ENABLED = False      # CRITICAL: keep False until approval test passes
```

### Adding New Endpoints
1. Add handler in `Handler.do_GET` / `do_POST` / `do_DELETE`
2. Use `_request_allowed()` for Origin/Host validation
3. Use `_authorized()` for Bearer token check (skip for `/v1/pair`)
4. Use `_send()` for responses (handles CORS for chrome-extension://)
5. Add test in `tests/test_security_remediation.py`

### IPC Client (gateway/ipc_client.py)
```python
def ipc_call(method: str, **params) -> dict:
    """Perform one authenticated request to Hermes --ipc."""
    # Reads descriptor from HERMES_HOME/ipc/interactive.json
    # Connects via multiprocessing.connection.Client
    # Sends JSON request, receives JSON response
    # Returns dict with "ok": true or "error": {"code": "..."}
```

## Extension Development

### Architecture
- **Service Worker** (`service-worker.js`): Long-lived background context
  - HTTP gateway communication
  - Token storage (`chrome.storage.local`)
  - Request lifecycle (submit, refresh, cancel)
  - Metadata fetching (providers, sessions, health)
  
- **Content Script** (`content.js`): Injected into ChatGPT pages
  - Shadow DOM panel above composer
  - User interaction (mode, session, send, receive, copy, cancel, pair)
  - Request recovery after page reload
  - Selection handling (Assisted mode)

- **Popup** (`popup.html/js/css`): Alternative UI via extension toolbar

### Key APIs Used
| API | Purpose |
|-----|---------|
| `chrome.runtime.sendMessage` | Content ↔ Service Worker communication |
| `chrome.storage.local` | Token, mode, draft, activeRequest persistence |
| `chrome.scripting.executeScript` | Popup: get selected text from active tab |
| `navigator.clipboard.writeText` | Copy result to clipboard |
| `fetch` | HTTP to gateway (with Origin header) |
| `MutationObserver` | Panel recovery after DOM changes |
| `window.getSelection()` | User text selection (Assisted mode) |

### Manifest Permissions
```json
{
  "permissions": ["storage", "clipboardWrite"],
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://chat.openai.com/*",
    "http://127.0.0.1:8765/*"
  ]
}
```
**No** `<all_urls>`, **no** `cookies`, **no** `activeTab`, **no** `scripting` in manifest (popup uses `chrome.scripting` at runtime).

### Testing Extension Changes
1. Edit source files in `extension/`
2. Run `node --check extension/content.js` and `node --check extension/service-worker.js`
3. In browser: `chrome://extensions` → click refresh icon on extension
4. Reload ChatGPT tab
5. Test manually (no automated browser tests yet)

## Hermes IPC Development

### Source Location
Modified Hermes checkout: `C:\Users\vighn\AppData\Local\hermes\hermes-agent`

### Key Files (in Hermes source)
| File | Purpose |
|------|---------|
| `cli.py` | Accepts `ipc=False`, starts/stops IPC server |
| `hermes_cli/_parser.py` | Adds `--ipc` flag |
| `hermes_cli/main.py` | Wires flag, rejects incompatible modes |
| `hermes_cli/interactive_ipc.py` | IPC server, protocol, queue, metadata |
| `hermes_cli/cli_tui_runtime_mixin.py` | Dequeues IPC prompts into TUI chat path |
| `hermes_cli/cli_chat_turn_mixin.py` | Marks active cancellation safe after agent starts |
| `hermes_cli/cli_modal_mixin.py` | Observes approval lifecycle |
| `tests/hermes_cli/test_interactive_ipc.py` | Protocol and lifecycle unit tests |

### Running Hermes IPC Tests
```powershell
cd C:\Users\vighn\AppData\Local\hermes\hermes-agent
# Requires Windows named-pipe access
python -m pytest tests/hermes_cli/test_interactive_ipc.py -v
# Or unittest
python -m unittest tests.hermes_cli.test_interactive_ipc -v
```

### Testing IPC Manually
```python
# From gateway/ipc_client.py pattern
import json
from multiprocessing.connection import Client

with open(r"%LOCALAPPDATA%\hermes\ipc\interactive.json") as f:
    desc = json.load(f)

authkey = bytes.fromhex(desc["authkey"])
conn = Client(desc["address"], family=desc["family"], authkey=authkey)

try:
    conn.send_bytes(json.dumps({"method": "state"}).encode())
    response = json.loads(conn.recv_bytes(1024 * 1024).decode())
    print(json.dumps(response, indent=2))
finally:
    conn.close()
```

## Windows-Specific Notes

### Path Handling
- Hermes home: `%LOCALAPPDATA%\hermes` (or `$HERMES_HOME`)
- IPC descriptor: `%LOCALAPPDATA%\hermes\ipc\interactive.json`
- Named pipe address: `\\.\pipe\hermes-ipc-<uuid>`

### Activation
```powershell
# Use the provided activation script
& "C:\Users\vighn\AppData\Local\hermes\hermes-agent\activate.ps1"
# Verifies: Get-Command hermes resolves to modified checkout
```

### File Permissions
- Windows ACL applied to IPC directory by Hermes IPC server
- PowerShell may need elevated privileges for ACL operations during IPC server startup
- Gateway reads descriptor as current user (no special perms needed)

### Python on Windows
- Use `python` (not `python3`)
- Standard library `multiprocessing.connection` uses `AF_PIPE` automatically on Windows
- No `AF_UNIX` support needed

## Debugging

### Gateway Logs
Gateway prints to stdout:
- Pairing code on startup
- HTTP request logs (via `log_message` override)
- Errors with stack traces

### Extension Debugging
1. Open DevTools on ChatGPT page → Console (for content script)
2. Open `chrome://extensions` → "Inspect views: service worker" (for background)
3. Right-click extension popup → Inspect (for popup)

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "Gateway unavailable" | Gateway not running | Start `python gateway/server.py` |
| "Origin denied" | Wrong Origin header | Must be `chrome-extension://<id>` |
| "Pairing failed" | Wrong code or already paired | Restart gateway for new code |
| "Hermes not running with --ipc" | Hermes not started with IPC | Run `hermes --ipc` in activated env |
| Extension panel not appearing | ChatGPT DOM changed | Check `findComposer()` selector in `content.js` |
| "Execution disabled" (503) | `IPC_EXECUTION_ENABLED = False` | Expected — do not change until approval test passes |

## Code Style

### Python (Gateway)
- Standard library only (no external deps beyond PyYAML)
- Type hints for public functions
- `snake_case` for functions/variables
- Module-level constants in `UPPER_SNAKE_CASE`
- Docstrings for public functions

### JavaScript (Extension)
- ES2020 (modules not used — IIFE pattern in content.js)
- `const`/`let`, no `var`
- Arrow functions for callbacks
- `camelCase` for variables/functions
- Shadow DOM for style isolation
- No external dependencies

### Testing
- Unit tests in `tests/` using `unittest`
- Mock external dependencies (IPC, HTTP, subprocess)
- Source-contract tests for extension (verify code patterns)
- No live browser or Hermes integration in CI

## Pre-Commit Checklist

Before committing:
- [ ] `python -m unittest discover -s tests -v` passes
- [ ] `node --check extension/content.js` passes
- [ ] `node --check extension/service-worker.js` passes
- [ ] `python -m compileall -q gateway tests` passes
- [ ] No secrets, tokens, or absolute paths in code
- [ ] `.gitignore` covers new generated files
- [ ] Documentation updated if behavior changed

## Troubleshooting

### Gateway Won't Start
```bash
# Check port conflict
netstat -an | findstr 8765
# Or change port
HERMES_BRIDGE_PORT=8766 python gateway/server.py
```

### Extension Not Loading
- Verify `manifest.json` syntax: `node --check extension/manifest.json` (or just load unpacked)
- Check browser console for errors
- Ensure Developer Mode is enabled

### IPC Connection Fails
- Verify `hermes --ipc` is running (check terminal for "IPC ready")
- Check descriptor exists: `type %LOCALAPPDATA%\hermes\ipc\interactive.json`
- Verify gateway `HERMES_HOME` matches Hermes (or both default)

### Tests Fail
- Run with `python -m unittest tests.test_security_remediation -v` for verbose output
- Check for port conflicts (tests use random port)
- Ensure no other gateway instance running

## Useful Commands

```bash
# Run all tests
python -m unittest discover -s tests -v

# Quick syntax checks
node --check extension/content.js && node --check extension/service-worker.js
python -m compileall -q gateway tests

# Clean cache
rm -rf gateway/__pycache__ tests/__pycache__ extension/node_modules

# Check for secrets (basic)
grep -r "sk-" . --exclude-dir=.git
grep -r "api_key" . --exclude-dir=.git
```