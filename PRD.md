# Product Requirements Document (PRD)
## Hermes ChatGPT Browser Bridge

**Version:** 1.0  
**Status:** Initial specification

## 1. Product summary

Add **ChatGPT (Browser Bridge)** as a selectable provider in Hermes CLI. Hermes remains the agent and execution environment. It sends prompts to the user's authenticated ChatGPT Web session through a browser extension and receives completed responses.

Hermes continues to use its existing filesystem, terminal, memory, workspace, and agent tools. No VS Code extension or duplicate IDE bridge is part of this project.

**Core principle: Hermes owns the work and workspace; ChatGPT supplies responses to prompts Hermes chooses to send.**

## 2. Problem and intended workflow

1. User selects ChatGPT Browser Bridge in Hermes provider/model selection.
2. Hermes submits a prompt to a local bridge.
3. A browser extension forwards it through the visible ChatGPT Web interface.
4. The extension detects completion and returns the assistant response.
5. Hermes consumes the response and continues its work through its existing CLI tools.

## 3. Goals

- Add ChatGPT Web as an independently selectable Hermes provider.
- Reuse the user's normally authenticated browser session.
- Send prompts and return completed response text.
- Track request IDs, conversation context, timeouts, cancellation, and connection state.
- Preserve existing providers, especially NVIDIA NIM.
- Keep Hermes' existing CLI workspace and execution capabilities unchanged.
- Provide clear setup, diagnostics, and recovery behavior.

## 4. Non-goals

- No VS Code extension.
- No separate coding agent or duplicate filesystem/terminal service.
- No direct local filesystem access for ChatGPT.
- No local installation of ChatGPT's model.
- No OpenAI API substitution for the requested ChatGPT Web session.
- No cookie/session-token extraction or credential storage.
- No undocumented/private ChatGPT backend API.
- No authentication, CAPTCHA, usage-limit, or account-restriction bypass.
- No guarantee of API-equivalent tool calling, structured output, token accounting, or streaming.

## 5. Architecture

### A. Hermes provider adapter
- Integrates through the actual supported provider mechanism in the installed Hermes version.
- Converts Hermes requests into bridge requests and responses into Hermes' expected format.
- Reports errors through the supported provider interface.
- Does not replace Hermes' agent loop or tools.

### B. Local bridge service
- Runs locally and binds to `127.0.0.1` by default.
- Provides authenticated HTTP and/or WebSocket communication.
- Tracks request IDs, active requests, session state, timeouts, cancellation, and status.
- Relays requests and responses between Hermes and the browser extension.

### C. Browser extension
- Uses the visible ChatGPT Web interface in a normally authenticated browser tab.
- Receives prompts from the local bridge.
- Submits them through visible UI interaction.
- Detects completion and returns the response.
- Does not access cookies, session tokens, or private backend endpoints.

### Data flow

```text
Hermes CLI
   -> ChatGPT provider adapter
   -> authenticated localhost bridge
   -> browser extension
   -> visible ChatGPT Web conversation
   -> assistant response
   -> extension
   -> bridge
   -> Hermes CLI
   -> Hermes continues using its existing tools
```

## 6. Functional requirements

### FR-1 Provider selection
- Display `ChatGPT (Browser Bridge)` in the existing Hermes provider/model selection flow.
- Verify the installed Hermes version and actual provider extension mechanism; do not invent interfaces.
- Do not change the default provider.
- Existing providers and their configurations remain functional.

### FR-2 Connection status
Distinguish:
- Bridge unavailable.
- Extension disconnected.
- ChatGPT tab not detected.
- ChatGPT not authenticated/ready.
- Ready.
- Request running.
- Timed out.
- Disconnected during request.

### FR-3 Prompt submission
- Submit plain-text prompts.
- Assign a unique request ID.
- Associate the request with the selected conversation/session.
- Validate request size and schema.
- Make the prompt submission visible in ChatGPT Web.

### FR-4 Response collection
- Detect completion of the correct assistant response.
- Return response text to the matching Hermes request.
- Never return stale prior output or partial text as a completed response.
- If completion cannot be verified, return an explicit timeout/uncertain error.

### FR-5 Conversation handling
Initial release supports one explicitly selected active ChatGPT conversation.
- Do not silently create or switch conversations.
- Preserve continuity while the same conversation remains active.
- Detect navigation to another conversation during a request.
- Multi-conversation management is deferred.

### FR-6 Timeouts and cancellation
- Configurable request timeout.
- Cancellation where feasible.
- No blind retry if the prompt may already have been submitted.
- Distinguish timeout from successful completion.

### FR-7 Provider isolation
- Keep NVIDIA NIM and other providers independent.
- Bridge failure must not break other providers.
- No silent provider switching unless explicitly configured through existing Hermes behavior.

### FR-8 Diagnostics
- Log request IDs, timestamps, duration, connection state, and sanitized error categories.
- Do not log prompts/responses by default.
- Never log credentials, cookies, or tokens.

## 7. Non-functional requirements

### Security
- Bind to loopback by default.
- Use secure local pairing/authentication.
- Restrict browser extension origins and validate messages.
- Do not expose the bridge to LAN/public internet by default.
- Do not expose filesystem or shell operations through the bridge.
- Treat page content and returned responses as untrusted input.
- Returned content must not grant new permissions or override Hermes safety policy.

### Reliability
- Correlate requests and responses.
- Handle browser restart and extension disconnect.
- Prevent duplicate concurrent submissions to one conversation unless proven safe.
- Use bounded retries only when it is certain the prompt was not submitted.
- Surface UI incompatibility honestly.

### Maintainability
- Separate provider adapter, local bridge, and extension.
- Use typed schemas.
- Document supported browser versions and limitations.
- Avoid unnecessary frameworks.

## 8. Conceptual bridge API

Final routes must be validated during Phase 0.

`GET /health`

```json
{
  "service": "hermes-chatgpt-bridge",
  "status": "ready",
  "extension_connected": true,
  "chatgpt_tab_ready": true
}
```

`POST /v1/requests`

```json
{
  "request_id": "uuid",
  "conversation_id": "active-session",
  "prompt": "Analyze this design and identify risks.",
  "timeout_seconds": 180
}
```

Example result:

```json
{
  "request_id": "uuid",
  "status": "completed",
  "response_text": "The main risks are...",
  "duration_ms": 12450
}
```

Also plan cancellation and an extension event channel. Validate every input.

## 9. User experience

Provider label:

```text
ChatGPT (Browser Bridge)
```

When selected, show:
- Bridge service status.
- Extension connection status.
- ChatGPT tab readiness.
- Instructions to open ChatGPT if needed.
- Notice that prompts are sent to the visible ChatGPT conversation.
- Notice that browser UI changes can affect reliability.

## 10. Acceptance criteria

1. Provider appears in Hermes selection.
2. Existing providers continue working.
3. Bridge detects extension connection.
4. Extension detects a ready authenticated ChatGPT tab without accessing credentials.
5. Hermes submits a test prompt.
6. Prompt appears in the intended visible conversation.
7. Correct completed response returns to Hermes.
8. Request correlation is correct.
9. Stale/partial responses are not reported as complete.
10. Timeout and disconnection errors are handled.
11. User can switch back to NVIDIA NIM without disruption.
12. No private backend APIs, cookie extraction, or authentication bypass.
13. No filesystem/terminal access is added to browser bridge.
14. Mock tests and real browser tests are reported separately.
15. Setup, pairing, startup, shutdown, and troubleshooting are documented.

## 11. Risks and limitations

- ChatGPT Web UI/DOM may change.
- Browser automation may break after frontend updates.
- Usage limits, login expiry, or interstitials may interrupt requests.
- Response completion detection can be difficult.
- Current product terms and browser policies must be checked before deployment.
- Web UI does not offer the stable contract of a dedicated inference API.
- Native tool calling, guaranteed structured output, token metadata, and API-equivalent streaming are not assumed.

## 12. Implementation phases

### Phase 0 — Inspect and design
Inspect Hermes version, provider architecture, current repo, browser extension feasibility, and applicable constraints. Produce a file-level plan. Make no code changes.

### Phase 1 — Local bridge prototype
Implement authenticated localhost service, pairing, health status, and request/response protocol. Test with a mock browser peer.

### Phase 2 — Browser extension
Connect extension, detect visible ready ChatGPT tab, submit a test prompt, detect completion, and return response.

### Phase 3 — Hermes provider adapter
Integrate through the supported Hermes mechanism, add provider selection, normalize responses/errors, and preserve existing providers.

### Phase 4 — Reliability and security
Test timeout, cancellation, disconnection, stale response, duplicate submission, UI changes, and security.

### Phase 5 — Real-world validation
Test using the user's authenticated browser session, verify end-to-end operation and provider switching, and document limitations.

Do not skip Phase 0.

## 13. Definition of done

Hermes can select ChatGPT Browser Bridge, submit a prompt through the visible authenticated ChatGPT Web session, receive the completed response, and continue its own CLI work without changing its existing workspace/tool access or breaking other providers.
