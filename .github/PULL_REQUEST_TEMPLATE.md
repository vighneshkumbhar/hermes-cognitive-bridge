# Pull Request Template

## Summary
<!-- Brief description of what this PR does and why -->

## Changes
<!-- List the key changes made -->
- 
- 
- 

## Testing Performed
<!-- Describe how you tested these changes -->

### Automated Tests
- [ ] `python -m unittest discover -s tests -v` — all pass
- [ ] `node --check extension/content.js` — passes
- [ ] `node --check extension/service-worker.js` — passes
- [ ] `python -m compileall -q gateway tests` — passes

### Manual Tests
- [ ] Gateway starts and prints pairing code
- [ ] Extension loads in Chrome/Brave/Edge (specify which)
- [ ] Pairing flow works
- [ ] Panel injects on ChatGPT page
- [ ] Metadata endpoints return expected data (with Hermes --ipc running)
- [ ] Request submission returns 503 (expected while disabled)
- [ ] Other: 

## Security Implications
<!-- Does this change affect authentication, validation, data handling, or IPC? -->
- [ ] No security implications
- [ ] Security implications described below:

## Breaking Changes
<!-- Does this change break existing APIs, IPC protocol, or configuration? -->
- [ ] No breaking changes
- [ ] Breaking changes described below:

## Documentation Updates
<!-- Have you updated relevant documentation? -->
- [ ] No documentation changes needed
- [ ] Updated: 

## Checklist
- [ ] Code follows project conventions (Python stdlib only, ES2020, no new deps)
- [ ] No secrets, tokens, or absolute paths in code
- [ ] `.gitignore` covers any new generated files
- [ ] `IPC_EXECUTION_ENABLED` remains `False` (unless approval test passed — requires explicit sign-off)
- [ ] No subprocess execution added to gateway
- [ ] No approval bypass methods added to IPC
- [ ] Tests cover new behavior (or existing tests still pass for refactors)
- [ ] Documentation updated if behavior changed