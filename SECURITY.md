# Security

- Gateway binds to IPv4 loopback only and validates the Host and browser Origin headers.
- Pairing is one-time per gateway process. The extension stores a random bearer token in extension local storage; restarting the gateway rotates it.
- Task submission remains disabled and returns HTTP 503. The gateway does not spawn Hermes or provide an approval bypass.
- When enabled for separate testing, Hermes IPC is opt-in, uses an authenticated local named pipe/socket and a locally stored random key, validates bounded prompts/request IDs, deduplicates IDs, and has bounded queues/retention.
- The IPC protocol exposes no approval decision method; it only reports the native approval state.
- Prompts/results are not written to gateway logs or persistent storage. Hermes request state is transient in process memory; standard Hermes behavior/logging still applies.
- Prompt content selected from a web page is untrusted. The user should review it before transfer. The extension does not read ChatGPT cookies, authentication state, credentials, or generated responses. It uses extension local storage for its pairing token and request recovery.
- This prototype lacks OS-protected token storage, explicit revoke/rotate endpoints, and robust rate limiting; do not expose or bind the server to a LAN interface.
