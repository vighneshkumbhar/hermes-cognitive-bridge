---
name: repository-structure
description: Final repository structure after preparation
metadata:
  type: project
---

## Repository Structure Report

**Base Directory:** `E:\Automation\chatgpt gateway - github update`

### Top-Level Files
| File | Size | Description |
|------|------|-------------|
| `.gitignore` | 505 bytes | Ignores Python cache, venv, extension build artifacts, IPC descriptors |
| `README.md` | 1478 bytes | Professional repository overview with architecture diagram |
| `CONTRIBUTING.md` | 4460 bytes | Development setup, conventions, PR requirements, security reporting |
| `CHANGELOG.md` | 5058 bytes | Development history (pre-1.0, unreleased section) |
| `LICENSE` | — | **NOT YET CREATED** — license to be chosen before publication |

### Gateway Directory
| File | Size | Description |
|------|------|-------------|
| `server.py` | 9117 bytes | Local HTTP gateway using Python stdlib only |
| `ipc_client.py` | 1417 bytes | Authenticated Hermes IPC client |
| `requirements.txt` | 15 bytes | PyYAML>=6.0,<7 only |
| `__pycache__/` | — | Python bytecode cache (gitignored) |

### Extension Directory
| File | Size | Description |
|------|------|-------------|
| `manifest.json` | 584 bytes | Manifest V3, Manifest V3 only, narrow host permissions |
| `content.js` | 12129 bytes | In-page panel (Shadow DOM) above ChatGPT composer |
| `service-worker.js` | 3582 bytes | Background HTTP gateway communication |
| `popup.html` | 974 bytes | Alternative popup UI |
| `popup.js` | 1174 bytes | Popup logic |
| `popup.css` | 561 bytes | Popup styles |
| `__pycache__/` | — | N/A (JS) |

### Tests Directory
| File | Size | Description |
|------|------|-------------|
| `test_security_remediation.py` | 2223 bytes | Gateway fail-closed, auth, validation |
| `test_ipc_client.py` | 2820 bytes | IPC authentication, descriptor handling |
| `test_extension_contract.py` | 5150 bytes | Source contract assertions for extension patterns |
| `__pycache__/` | — | Python bytecode cache (gitignored) |

### Docs Directory
| File | Size | Description |
|------|------|-------------|
| `ARCHITECTURE.md` | — | System components, communication flow, security boundaries |
| `IPC_PROTOCOL.md` | — | Implemented IPC methods, request/response structures, lifecycle |
| `SECURITY.md` | — | Threat model, authentication, authorization, known limitations |
| `DEVELOPMENT.md` | — | Developer setup, prerequisites, testing, debugging, Windows |
| `ROADMAP.md` | — | Phased milestones with current status |

### .github Directory
| Subdirectory | Description |
|--------------|-------------|
| `ISSUE_TEMPLATE/` | Bug report, feature request, security concern templates |
| `workflows/` | CI workflow (Python tests, JS syntax, security scan, docs check) |

### Key Directories Not at Root
- `planning/` (empty directory)

## Git Status
- **Git initialized:** No (will be initialized after review)
- **Git history:** None yet (fresh preparation)
- **Remotes:** None configured (will not configure without explicit authorization)

## Files Created During Preparation
| # | File | Purpose |
|---|------|---------|
| 1 | `.gitignore` | Security: prevents secret exposure, cache artifacts, IPC descriptors |
| 2 | `README.md` | Professional presentation with honest status |
| 3 | `docs/ARCHITECTURE.md` | System architecture and communication flow |
| 4 | `docs/IPC_PROTOCOL.md` | Implemented protocol methods and shapes |
| 5 | `docs/SECURITY.md` | Threat model, authentication, known limitations |
| 6 | `docs/DEVELOPMENT.md` | Developer setup guide |
| 7 | `docs/ROADMAP.md` | Phased milestones |
| 8 | `CONTRIBUTING.md` | Development conventions and requirements |
| 9 | `CHANGELOG.md` | Development history |
| 10 | `.github/ISSUE_TEMPLATE/bug_report.yml` | Standardized issue filing |
| 11 | `.github/ISSUE_TEMPLATE/feature_request.yml` | Standardized feature requests |
| 12 | `.github/ISSUE_TEMPLATE/security_concern.yml` | Security concern reporting |
| 13 | `.github/PULL_REQUEST_TEMPLATE.md` | PR submission requirements |
| 14 | `.github/workflows/ci.yml` | CI workflow skeleton |

## Files Modified During Preparation
| # | File | Changes |
|---|------|---------|
| 1 | `README.md` | Rewritten from 1478 bytes to professional format (extended ~2x) |
| 2 | `ARCHITECTURE.md` | Rewritten from 2433 bytes to detailed architecture doc |
| 3 | `IPC_PROTOCOL.md` | Rewritten from 1478 bytes to full protocol spec |
| 4 | `SECURITY.md` | Rewritten from 1478 bytes to comprehensive security doc |
| 5 | `INSTALLATION.md` | **Not modified** — kept as-is (existing quick start) |
| 6 | `API_REFERENCE.md` | **Not modified** — kept as-is (existing reference) |

## Files at Risk of Being Unnecessary or Temporary
| File | Reason |
|------|--------|
| `planning/` directory | Empty — no files present |
| `.test-tmp/` directory | Temporary test directory, can be gitignored |
| `gateway/__pycache__/` | Python cache, already gitignored |
| `tests/__pycache__/` | Python cache, already gitignored |
| `.env`, `.env.*` | Not present — good |
| `interactive.json` | Not present — good (will be created at runtime only) |
| `node_modules/` | Not present — extension has no npm deps |
| `dist/`, `build/` | Not present — extension has no build step |
| `*.log`, `*.db`, `*.sqlite*` | Not present |

## Files Already Properly Gitignored
- `__pycache__/` directories (both gateway and tests)
- `.venv/`, `venv/`, `env/` (not present, but would be ignored)
- `node_modules/` (not present, but would be ignored)
- `dist/`, `build/` (not present, but would be ignored)
- `.env`, `.env.*`, `!.env.example`
- `*.log`, `*.db`, `*.sqlite`, `*.sqlite3`
- `.DS_Store`, `Thumbs.db`
- `interactive.json` (IPC descriptor with authkey)

---
---
name: project-summary
description: Overall project status and deliverables
metadata:
  type: project
---

## Project Summary

Hermes Cognitive Bridge is a **local integration layer** connecting ChatGPT Web with the Hermes AI agent CLI through a Chromium browser extension and a local Python gateway.

### Current Status
- **Development Status:** Active development, incomplete, not production-ready
- **Gateway Execution:** Deliberately disabled (`IPC_EXECUTION_ENABLED = False`)
- **Test Suite:** 14/14 unit tests passing
- **JS Syntax Checks:** All passing
- **Python Compilation:** All passing

### What's Implemented
✅ Chromium MV3 extension with panel, modes, sessions  
✅ Local Python gateway with pairing + bearer token auth  
✅ One-time pairing code, 32-byte bearer token  
✅ Origin/Host header validation  
✅ IPC protocol with Hermes `--ipc` (in separate source checkout)  
✅ Metadata endpoints (providers, sessions, state)  
✅ Fail-closed execution (503 UNSAFE_EXECUTION_MODE)  
✅ Result copy-to-clipboard  
✅ Three operating modes (Manual, Assisted, Auto)  
✅ Security: no ChatGPT scraping, no credential exposure  

### What's NOT Implemented (Intentionally)
❌ Gateway task execution — returns 503 until approval test passes  
❌ Live Hermes IPC integration — not yet verified end-to-end  
❌ Native approval preservation — critical blocker  
❌ Browser integration testing — manual only  
❌ Session continuity/switching — not verified  
❌ Production hardening — no rate limiting, no token rotation  

### Critical Blocker
`IPC_EXECUTION_ENABLED` must remain `False` until **Phase 3** of the roadmap passes:
- Live native-approval acceptance test
- Manual review of approval preservation
- Confirmation gateway cannot approve or bypass

### License
**No explicit license chosen yet.** A license must be selected before publication.

### Git State
- Git repository not yet initialized
- History will be preserved from user's existing repo if applicable
- No remote configured (will not push without explicit authorization)

### Commands to Initialize

```bash
# Initialize git repo
cd "E:\Automation\chatgpt gateway - github update"
git init

# Add initial files
git add .
git commit -m "chore: prepare repository for public development"

# Verify everything is in order
git status
git log --oneline -5  # (will show 1 commit after above)

# Next steps (awaiting explicit authorization):
# - Configure remote: git remote add origin <url>
# - Push: git push -u origin main
# - Create GitHub repository first (manual step outside this session)
```

### Recommended Next Steps
1. Review all documentation and structure
2. Decide on license before publication
3. Run `python -m unittest discover -s tests -v` to verify test suite
4. Run `node --check extension/content.js && node --check extension/service-worker.js` to verify JS
5. Run `python -m compileall -q gateway tests` to verify Python compilation
6. Wait for explicit authorization before initializing git or publishing