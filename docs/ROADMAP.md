# Roadmap

## Overview

This roadmap reflects the **actual current state** of the project. All milestones are **planned or in progress** — none are complete. Dates are not committed; each phase depends on successful validation of the previous phase.

---

## Phase 1 — Repository and Gateway Stabilization
**Goal:** Clean repository, reliable gateway, working browser integration basics

| Task | Status | Notes |
|------|--------|-------|
| Repository structure and documentation | ✅ Done | This preparation work |
| Gateway authentication repair | 🔄 In progress | Origin/CORS handling needs live verification |
| Extension networking consistency | 🔄 In progress | Service worker ↔ content script messaging |
| Gateway diagnostics and logging | 📋 Planned | Structured logs, request correlation IDs |
| Browser smoke tests (manual) | 📋 Planned | Load extension, pair, panel injection, metadata fetch |
| Automated Python test suite in CI | 📋 Planned | GitHub Actions workflow |
| JavaScript syntax check in CI | 📋 Planned | `node --check` for extension scripts |

**Exit Criteria:** Gateway starts reliably, extension loads and pairs in real browser, metadata endpoints return live Hermes data (when Hermes `--ipc` is running), no console errors.

---

## Phase 2 — Native Hermes IPC Validation
**Goal:** Verified live IPC connection and harmless task execution

| Task | Status | Notes |
|------|--------|-------|
| Live `hermes --ipc` startup | 📋 Planned | Descriptor creation, TUI readiness |
| Harmless prompt execution | 📋 Planned | e.g., "What is 2+2?" — verify result returns |
| Session continuity | 📋 Planned | Switch existing native session, verify history preserved |
| Model/provider synchronization | 📋 Planned | Metadata matches live CLI selection |
| Terminal interaction preservation | 📋 Planned | TUI remains usable during/after external request |
| IPC error handling | 📋 Planned | Hermes busy, queue full, descriptor missing |

**Exit Criteria:** At least 5 successful harmless prompt/response cycles through live `hermes --ipc` with terminal remaining fully interactive.

---

## Phase 3 — Approval and Execution Validation
**Goal:** Native approval preservation verified end-to-end

| Task | Status | Notes |
|------|--------|-------|
| Native approval prompt observation | 📋 Planned | Trigger dangerous-tool approval in terminal |
| Approval denial verification | 📋 Planned | Deny in terminal → request fails, no operation occurs |
| Gateway cannot approve | 📋 Planned | Verify no IPC approval method exists or is callable |
| Cancellation verification | 📋 Planned | Active cancellation via Hermes interrupt path |
| Request lifecycle validation | 📋 Planned | queued → started → approval_required → completed/failed |
| Security audit of approval path | 📋 Planned | Code review of IPC + TUI integration |

**Exit Criteria:** Controlled dangerous-tool approval test passes — native prompt appears, denial is respected, gateway cannot override, final response returned.

**⚠️ CRITICAL BLOCKER:** `IPC_EXECUTION_ENABLED` must remain `False` until this phase passes and is manually reviewed.

---

## Phase 4 — Multi-Session Support
**Goal:** Robust session isolation, switching, and queue handling

| Task | Status | Notes |
|------|--------|-------|
| Session isolation | 📋 Planned | Concurrent requests to different sessions |
| Session switching | 📋 Planned | Extension session selector ↔ Hermes native session |
| Queue handling | 📋 Planned | Pending queue (64) behavior under load |
| Extension synchronization | 📋 Planned | Panel state ↔ active request ↔ Hermes session |
| Request deduplication | 📋 Planned | Duplicate request_id returns existing record |

**Exit Criteria:** Multiple sessions work independently; switching sessions in extension updates Hermes context correctly.

---

## Phase 5 — Release Preparation
**Goal:** Production-quality repository ready for public development

| Task | Status | Notes |
|------|--------|-------|
| Automated test suite expansion | 📋 Planned | Coverage for all gateway endpoints, IPC methods |
| Documentation review | 📋 Planned | Accuracy, completeness, code examples |
| Cross-browser compatibility | 📋 Planned | Chrome, Brave, Edge (Manifest V3) |
| Windows/Linux compatibility | 📋 Planned | Named pipe vs. Unix socket paths |
| Security review | 📋 Planned | Threat model, penetration testing, dependency audit |
| License decision and attribution | 📋 Planned | Choose license, add LICENSE file, verify dependencies |
| Release candidate tagging | 📋 Planned | Semantic versioning, changelog finalization |

**Exit Criteria:** All tests pass in CI, documentation matches implementation, security review complete, license chosen, first release candidate tagged.

---

## Current Blockers (from REMAINING_BLOCKERS.md)

1. **Critical approval acceptance** — Manual test required: start `hermes --ipc`, trigger native approval, deny it, verify operation doesn't run and gateway cannot approve
2. **Live TUI scheduling/session continuity** — Verify external prompt goes through normal chat processing, preserves session/history, leaves terminal usable
3. **Live cancellation** — Verify active cancellation follows native interrupt path
4. **Real browser validation** — Load unpacked extension, validate pairing, panel recovery, 503 status, metadata, copy behavior
5. **Execution remains disabled** — `IPC_EXECUTION_ENABLED = False` until blockers 1–3 pass and are reviewed

---

## Milestone Summary

```
Phase 1: Repository & Gateway Stabilization     [■■■■□□□□□□] 40%  (docs done, live tests pending)
Phase 2: Native Hermes IPC Validation           [□□□□□□□□□□]  0%  (awaits live hermes --ipc)
Phase 3: Approval & Execution Validation        [□□□□□□□□□□]  0%  (CRITICAL PATH)
Phase 4: Multi-Session Support                  [□□□□□□□□□□]  0%  (depends on Phase 3)
Phase 5: Release Preparation                    [□□□□□□□□□□]  0%  (depends on Phase 4)
```

---

## Decision Points

| Decision | When | Criteria |
|----------|------|----------|
| Enable `IPC_EXECUTION_ENABLED` | After Phase 3 | Approval test passes + manual code review |
| First alpha release | After Phase 5 | All tests pass, docs complete, security review done |
| Beta release | Post-alpha | Real-world usage feedback, bug fixes |
| 1.0 release | TBD | Stable API, extended compatibility, maintained |

---

## Contributing to the Roadmap

- Issues labeled `roadmap` track phase tasks
- Milestones in GitHub track phase progress
- Phase transitions require maintainer approval
- Security-related tasks (Phase 3) require explicit sign-off

---

*Last updated: 2026-10-31*