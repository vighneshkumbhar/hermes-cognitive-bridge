# Contributing to Hermes Cognitive Bridge

Thank you for your interest in contributing. This project is in **active development** and not yet production-ready. Contributions that improve stability, security, documentation, and test coverage are especially welcome.

## Development Setup

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for complete setup instructions.

### Quick Start
```bash
git clone <repository-url>
cd hermes-cognitive-bridge
cd gateway && python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
node --check ../extension/content.js
node --check ../extension/service-worker.js
```

## Coding Conventions

### Python (Gateway)
- **Standard library only** — no external dependencies beyond `PyYAML` (already in requirements.txt)
- **Type hints** for public functions and method signatures
- **snake_case** for functions, variables, parameters
- **UPPER_SNAKE_CASE** for module-level constants
- **Docstrings** for public functions (Google or NumPy style)
- **Line length**: 100 chars soft limit
- **No** `subprocess`, `threading` beyond what's already used, or external HTTP libraries

### JavaScript (Extension)
- **ES2020** syntax (no modules — content.js uses IIFE, service worker is module-capable)
- **const/let** only, no `var`
- **camelCase** for variables, functions, properties
- **Arrow functions** for callbacks
- **Shadow DOM** for style isolation (content.js)
- **No external dependencies** — zero npm packages
- **Manifest V3** patterns only (service worker, no background page)

### Documentation
- **Markdown** with GitHub-flavored extensions
- **Mermaid** for diagrams (rendered on GitHub)
- **Code blocks** with language tags
- **Relative links** to other docs in `docs/`

## Branch and Pull Request Expectations

### Branch Naming
| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/<short-description>` | `feat/session-switching` |
| Bugfix | `fix/<short-description>` | `fix/pairing-code-expiry` |
| Docs | `docs/<short-description>` | `docs/ipc-protocol-examples` |
| Refactor | `refactor/<short-description>` | `refactor/gateway-error-handling` |
| Test | `test/<short-description>` | `test/ipc-client-coverage` |
| Security | `security/<short-description>` | `security/origin-validation` |

### Commit Messages
Follow conventional commits:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `security`, `perf`

Examples:
```
feat(gateway): add request correlation ID logging
fix(extension): handle panel re-injection after SPA navigation
docs(ipc): document request.cancel response shape
security(gateway): constant-time comparison for pairing code
test(ipc): add test for duplicate request ID handling
```

### Pull Request Requirements

Every PR must include:
1. **Summary** — what changed and why
2. **Testing performed** — unit tests, manual tests, browser verification
3. **Security implications** — any auth, validation, or data handling changes
4. **Breaking changes** — API, IPC protocol, or configuration changes
5. **Documentation updates** — if behavior changed, update relevant `.md` files

**CI must pass** before merge:
- All Python unit tests pass
- JavaScript syntax checks pass
- Python compilation check passes
- No new secrets or absolute paths introduced

## Testing Requirements

### Before Submitting
```bash
# All tests
python -m unittest discover -s tests -v

# JS syntax
node --check extension/content.js
node --check extension/service-worker.js

# Python compilation
python -m compileall -q gateway tests
```

### Test Categories
| Category | Location | Purpose |
|----------|----------|---------|
| Security remediation | `tests/test_security_remediation.py` | Gateway fail-closed, auth, validation |
| IPC client | `tests/test_ipc_client.py` | IPC authentication, descriptor handling |
| Extension contract | `tests/test_extension_contract.py` | Source analysis of JS patterns |

**No live browser or Hermes integration tests in CI** — these require manual validation.

### Adding Tests
- Gateway: add to `test_security_remediation.py` or new `test_*.py` in `tests/`
- IPC: add to `test_ipc_client.py`
- Extension: add source-contract assertions to `test_extension_contract.py`
- Mock external dependencies (IPC, HTTP, subprocess, chrome APIs)

## Security Reporting

If you discover a security vulnerability:

1. **Do not** open a public issue
2. Email: [maintainer email — to be added before publication]
3. Include:
   - Description of the vulnerability
   - Reproduction steps
   - Impact assessment
   - Suggested fix (if any)

We will acknowledge within 48 hours and coordinate disclosure.

### Security-Sensitive Areas
- Gateway authentication (pairing, token handling)
- IPC authentication (descriptor, authkey)
- Origin/Host validation
- Input validation (prompt, request_id, session_id)
- Approval preservation (no bypass methods in IPC)
- Credential handling (never log, never transmit)

## Code Review Guidelines

Reviewers should check:
- [ ] Tests pass and cover new behavior
- [ ] No secrets, tokens, or absolute paths in code
- [ ] Security implications considered (especially auth, validation, IPC)
- [ ] Documentation updated if behavior changed
- [ ] No new external dependencies without justification
- [ ] `IPC_EXECUTION_ENABLED` remains `False` unless approval test passed
- [ ] No subprocess execution added to gateway
- [ ] No approval bypass methods added to IPC

## Areas Needing Help

| Area | Description |
|------|-------------|
| Browser integration testing | Manual smoke tests across Chrome/Brave/Edge |
| Live Hermes IPC validation | Running `hermes --ipc` and verifying behavior |
| Approval preservation testing | Controlled dangerous-tool approval tests |
| Cross-platform compatibility | Windows named pipes vs. Unix sockets |
| Documentation accuracy | Keeping docs in sync with implementation |
| Test coverage | Edge cases, error paths, race conditions |

## Questions?

Open a [GitHub Discussion](https://github.com/<owner>/<repo>/discussions) or check existing issues.

---

*This guide reflects the project's current early development state. Expect changes as the project matures.*