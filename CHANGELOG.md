# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) —
once a first stable release is made. Currently in pre-1.0 development.

## [Unreleased] — Development

### Added
- Initial repository structure for public development
- Professional README with architecture diagram, status badges, and honest feature status
- Comprehensive documentation in `docs/`:
  - `ARCHITECTURE.md` — System components, communication flow, security boundaries
  - `IPC_PROTOCOL.md` — Implemented IPC methods, request/response structures, lifecycle
  - `SECURITY.md` — Threat model, authentication, authorization, known limitations
  - `DEVELOPMENT.md` — Developer setup, testing, debugging, Windows specifics
  - `ROADMAP.md` — Phased milestones with current status
- GitHub project management files:
  - `CONTRIBUTING.md` — Development setup, conventions, PR requirements, security reporting
  - Issue templates: Bug Report, Feature Request, Security Concern
  - Pull Request template
  - Basic CI workflow (Python tests, JS syntax, compilation check)
- `.gitignore` covering Python cache, venv, extension build artifacts, IPC descriptors, logs, databases

### Gateway (`gateway/`)
- **Implemented**: Local HTTP gateway (`server.py`) using Python standard library only
- **Implemented**: Authenticated Hermes IPC client (`ipc_client.py`) with descriptor-based auth
- **Implemented**: One-time pairing code + 32-byte bearer token authentication
- **Implemented**: Origin validation (`chrome-extension://*`) + Host header validation
- **Implemented**: Metadata endpoints (`/v1/providers`, `/v1/sessions`, `/v1/state`, `/v1/health`)
- **Implemented**: Request endpoints (gated behind `IPC_EXECUTION_ENABLED = False`)
- **Implemented**: Fail-closed behavior — returns HTTP 503 `UNSAFE_EXECUTION_MODE` for task submission
- **Verified**: 14 unit tests passing (security, pairing, metadata, fail-closed behavior)

### Extension (`extension/`)
- **Implemented**: Manifest V3 extension with service worker + content script + popup
- **Implemented**: In-page panel (Shadow DOM) injected above ChatGPT composer
- **Implemented**: Three operating modes: Manual, Assisted, Auto
- **Implemented**: Session selection from live Hermes native session manager
- **Implemented**: Provider/model metadata display (names only)
- **Implemented**: Pairing flow with one-time code entry
- **Implemented**: Request recovery after page reloads via `chrome.storage.local`
- **Implemented**: Result copy-to-clipboard with explicit user action
- **Implemented**: Minimal permissions: `storage`, `clipboardWrite`, narrow host permissions
- **Verified**: `node --check` passes for both `content.js` and `service-worker.js`
- **Verified**: Extension contract tests (source analysis) passing

### Hermes IPC (in separate Hermes source checkout)
- **Implemented**: Opt-in `--ipc` flag (ordinary `hermes` does not start IPC listener)
- **Implemented**: Authenticated local transport (Windows `AF_PIPE`, Unix `AF_UNIX`)
- **Implemented**: Descriptor lifecycle with 32-byte authkey, process lock, OS-level permissions
- **Implemented**: Request queue (cap 64) → TUI chat path → native approval → result
- **Implemented**: Duplicate request ID handling, bounded retained records (cap 256)
- **Implemented**: Metadata methods: `state`, `sessions.list`, `model.list`
- **Implemented**: Request methods: `submit`, `session.create`, `request.get`, `requests.list`, `request.cancel`
- **Implemented**: Approval observation only — no approval decision method in IPC
- **Verified**: 10 Hermes IPC unit tests passing (with Windows named-pipe access)
- **Verified**: 7 modified Hermes Python files compile successfully

### Security
- Gateway binds to loopback only (`127.0.0.1`)
- Constant-time comparison for pairing code and bearer token
- IPC authkey never leaves gateway ↔ Hermes boundary
- No credentials in IPC metadata responses (names only)
- No prompt/result logging in gateway
- `HERMES_YOLO_MODE=1` explicitly rejected by `--ipc` mode
- Extension never accesses ChatGPT cookies, tokens, or responses

### Known Limitations (Documented)
- Gateway task execution disabled (`IPC_EXECUTION_ENABLED = False`)
- Live browser integration not verified
- Live Hermes IPC execution not verified
- Session continuity/switching not verified
- Native tool-approval preservation not verified end-to-end
- No OS-protected token storage, token rotation endpoints, or rate limiting

---

## Historical Development (Pre-Repository)

### Hermes IPC Implementation (2026-10-31)
- Added opt-in `hermes --ipc` mode to Hermes source checkout
- Implemented authenticated IPC protocol with 7 modified Python files
- Gateway and extension protocol plumbing completed
- Unit test suites passing in isolation
- Live acceptance tests pending (see `REMAINING_BLOCKERS.md`)

### Gateway and Extension Development (2026-10)
- Local Python gateway with pairing and bearer auth
- Chromium MV3 extension with panel, modes, session selection
- Security remediation: fail-closed execution, origin validation, constant-time auth
- Test suites established

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 0.1.0-dev | 2026-10-31 | Initial repository preparation for public development |

---

## Unreleased Changes

See [ROADMAP.md](docs/ROADMAP.md) for planned work. Next milestones:

1. **Phase 1** — Gateway stabilization, browser smoke tests, CI
2. **Phase 2** — Live Hermes IPC validation, harmless execution
3. **Phase 3** — Approval preservation verification (critical blocker)
4. **Phase 4** — Multi-session support
5. **Phase 5** — Release preparation

---

*This changelog will be updated with each release. During pre-1.0 development, breaking changes may occur without major version increment.*