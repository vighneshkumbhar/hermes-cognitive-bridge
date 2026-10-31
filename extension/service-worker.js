const BASE = "http://127.0.0.1:8765";

async function token() {
  return (await chrome.storage.local.get("bridgeToken")).bridgeToken || "";
}
async function request(path, options = {}) {
  const t = await token();
  return fetch(`${BASE}${path}`, { ...options, headers: { "Content-Type":"application/json", ...(t ? {Authorization:`Bearer ${t}`} : {}), ...(options.headers || {}) } });
}
async function submit(prompt, mode, sessionId) {
  const id = crypto.randomUUID();
  const activeRequest = { requestId:id, state:"submitting", mode, createdAt:Date.now() };
  await chrome.storage.local.set({ activeRequest });
  const response = await request("/v1/requests", { method:"POST", body:JSON.stringify({request_id:id,prompt,session_id:sessionId}) });
  const body = await response.json().catch(() => ({}));
  activeRequest.state = response.status === 503 ? "execution-disabled" : (response.ok ? "queued" : "rejected");
  activeRequest.httpStatus = response.status;
  activeRequest.error = body.error || null;
  await chrome.storage.local.set({ activeRequest });
  return { status:response.status, body, activeRequest };
}
async function refresh(id) {
  const response = await request(`/v1/requests/${encodeURIComponent(id)}`);
  const body = await response.json().catch(() => ({}));
  if (response.status === 404) return { status:"not-found", body };
  if (!response.ok) return { status:"error", body };
  if (body.status === "completed") {
    const resultResponse = await request(`/v1/requests/${encodeURIComponent(id)}/result`);
    const resultBody = await resultResponse.json().catch(() => ({}));
    return resultResponse.ok ? {status:"completed",body:{...body,...resultBody}} : {status:"result-unavailable",body};
  }
  return { status:body.status || "unknown", body };
}
async function cancel(id) {
  const response = await request(`/v1/requests/${encodeURIComponent(id)}`, {method:"DELETE"});
  const body = await response.json().catch(() => ({}));
  return {ok:response.ok,status:response.status,body};
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === "bridge.submit") return sendResponse(await submit(message.prompt, message.mode, message.sessionId));
      if (message?.type === "bridge.refresh") return sendResponse(await refresh(message.requestId));
      if (message?.type === "bridge.cancel") return sendResponse(await cancel(message.requestId));
      if (message?.type === "bridge.health") {
        const r = await fetch(`${BASE}/v1/health`); return sendResponse({ok:r.ok, body:await r.json()});
      }
      if (message?.type === "bridge.metadata") {
        const [providers, sessions] = await Promise.all([request("/v1/providers"), request("/v1/sessions")]);
        return sendResponse({providers:await providers.json(), sessions:await sessions.json()});
      }
      if (message?.type === "bridge.pair") {
        const r = await fetch(`${BASE}/v1/pair`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:message.code})});
        const body = await r.json();
        if (r.ok) await chrome.storage.local.set({bridgeToken:body.token});
        return sendResponse({ok:r.ok,body});
      }
      if (message?.type === "bridge.copy") {
        await navigator.clipboard.writeText(message.text || ""); return sendResponse({ok:true});
      }
      sendResponse({error:"unsupported_message"});
    } catch (error) { sendResponse({error:"gateway_unavailable",message:String(error?.message || "Connection failed")}); }
  })();
  return true;
});
