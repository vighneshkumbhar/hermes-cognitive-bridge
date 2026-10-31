const base = "http://127.0.0.1:8765";
const $ = (id) => document.getElementById(id);
let currentId = null;
let pollTimer = null;

async function health() {
  try {
    const r = await fetch(`${base}/v1/health`);
    const j = await r.json();
    $("connection").textContent = j.paired ? "Gateway paired" : "Gateway online · pair required";
  } catch { $("connection").textContent = "Gateway unavailable"; }
}
async function api(path, options = {}) {
  const { bridgeToken } = await chrome.storage.local.get("bridgeToken");
  return fetch(`${base}${path}`, { ...options, headers: { "Content-Type":"application/json", ...(bridgeToken ? { Authorization:`Bearer ${bridgeToken}` } : {}), ...(options.headers || {}) } });
}
async function selectedText() {
  const [tab] = await chrome.tabs.query({ active:true, lastFocusedWindow:true });
  if (!tab?.id || !/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(tab.url || "")) throw new Error("Open a ChatGPT conversation and select the prompt text first.");
  const [{ result = "" } = {}] = await chrome.scripting.executeScript({ target:{ tabId:tab.id }, func:() => window.getSelection()?.toString() || "" });
  if (!result.trim()) throw new Error("Select the text to send to Hermes in the active tab.");
  return result.trim();
}
async function send() {
  $("error").textContent = "";
  try {
    const prompt = await selectedText();
    const id = crypto.randomUUID();
    const r = await api("/v1/requests", { method:"POST", body:JSON.stringify({ request_id:id, prompt }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || `Gateway error ${r.status}`);
    currentId = id;
    $("status").value = `Queued · ${id}`;
    pollTimer && clearInterval(pollTimer);
    if ($("mode").value !== "Manual") pollTimer = setInterval(() => refresh(false), 1200);
  } catch (e) { $("error").textContent = e.message; }
}
async function refresh(manual = true) {
  if (!currentId) { if (manual) $("error").textContent = "No active request."; return; }
  try {
    const r = await api(`/v1/requests/${currentId}`);
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Request unavailable");
    $("status").value = `${j.status} · ${currentId}`;
    if (j.status === "completed") {
      $("result").value = j.result || "";
      if ($("mode").value === "Auto" && j.result) {
        try { await navigator.clipboard.writeText(j.result); $("status").value = `Result ready and copied · ${currentId}. Submit it to ChatGPT yourself.`; }
        catch { $("status").value = `Result ready · ${currentId}. Clipboard unavailable; copy it below.`; }
      }
      clearInterval(pollTimer); pollTimer = null;
    } else if (["failed","timed_out","cancelled"].includes(j.status)) {
      $("error").textContent = j.error || j.status;
      clearInterval(pollTimer); pollTimer = null;
    }
  } catch(e) { if (manual) $("error").textContent = e.message; }
}
$("send").addEventListener("click", send);
$("receive").addEventListener("click", () => {
  refresh(true);
  if (currentId && !pollTimer) pollTimer = setInterval(() => refresh(false), 1200);
});
$("copy").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("result").value); $("status").value = "Result copied. Submit it to ChatGPT yourself."; } catch { $("error").textContent = "Clipboard access denied; select and copy the result manually."; } });
$("pair").addEventListener("click", async () => {
  try {
    const r = await fetch(`${base}/v1/pair`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({code:$("pairCode").value.trim()}) });
    const j = await r.json(); if (!r.ok) throw new Error(j.error || "Pairing failed");
    await chrome.storage.local.set({bridgeToken:j.token}); $("error").textContent = "Paired."; await health();
  } catch(e) { $("error").textContent = e.message; }
});
$("mode").addEventListener("change", () => chrome.storage.local.set({mode:$("mode").value}));
chrome.storage.local.get("mode").then(v => { if (v.mode) $("mode").value = v.mode; });
health();
