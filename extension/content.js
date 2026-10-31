(() => {
  const ROOT_ID = "hermes-cognitive-bridge-root";
  const MODES = ["Manual", "Assisted", "Auto"];
  let observer;
  let refreshTimer;

  const findComposer = () => {
    const element = document.querySelector("#prompt-textarea, textarea, [contenteditable='true'][data-testid*='composer'], form [contenteditable='true']");
    return element?.closest("form") || element?.parentElement || null;
  };
  const el = (tag, attrs = {}, text = "") => {
    const node = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)) node.setAttribute(k,v);
    if (text) node.textContent = text;
    return node;
  };
  function inject() {
    const composer = findComposer();
    if (!composer) return false;
    let root = document.getElementById(ROOT_ID);
    if (root?.parentElement === composer.parentElement && composer.previousElementSibling === root) return true;
    if (root) {
      if (refreshTimer) clearInterval(refreshTimer);
      root.remove();
    }
    root = el("div", {id:ROOT_ID});
    const shadow = root.attachShadow({mode:"open"});
    const style = el("style");
    style.textContent = `:host{all:initial;display:block;color-scheme:light dark;font:13px system-ui,sans-serif;margin:0 auto 8px;max-width:48rem}.hcb{border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:12px;padding:10px;background:Canvas;color:CanvasText;box-shadow:0 2px 12px #0002}.hcb-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.hcb-head{justify-content:space-between}.hcb-title{font-weight:650}.hcb-status{font-size:12px;opacity:.8}.hcb-controls{margin-top:8px}.hcb button,.hcb select,.hcb textarea,.hcb input{font:inherit;color:inherit;background:Canvas;border:1px solid color-mix(in srgb,currentColor 25%,transparent);border-radius:7px;padding:7px}.hcb button{cursor:pointer}.hcb textarea{box-sizing:border-box;width:100%;margin-top:8px;resize:vertical}.hcb .hcb-result{min-height:72px}.hcb .hcb-error{color:#b42318;white-space:pre-wrap}.hcb .hcb-meta{font-size:11px;opacity:.8}.hcb .hcb-hidden{display:none!important}`;
    const panel = el("section", {class:"hcb", "aria-label":"Hermes Cognitive Bridge"});
    const head = el("div", {class:"hcb-row hcb-head"});
    head.append(el("span", {class:"hcb-title"}, "Hermes Bridge"), el("span", {class:"hcb-status", id:"hcb-connection"}, "Checking gateway…"));
    const controls = el("div", {class:"hcb-row hcb-controls"});
    const mode = el("select", {id:"hcb-mode", "aria-label":"Operating mode"});
    MODES.forEach(m => mode.append(el("option", {value:m}, m)));
    const session = el("select", {id:"hcb-session", "aria-label":"Hermes session"});
    session.append(el("option", {value:"", disabled:"disabled"}, "Hermes session loading…"));
    const send = el("button", {id:"hcb-send", type:"button"}, "Send to Hermes");
    const receive = el("button", {id:"hcb-receive", type:"button"}, "Receive from Hermes");
    const copy = el("button", {id:"hcb-copy", type:"button"}, "Copy result");
    const cancel = el("button", {id:"hcb-cancel", type:"button"}, "Cancel request");
    controls.append(el("label", {}, "Mode "), mode, el("label", {}, "Session "), session, send, receive, cancel, copy);
    const prompt = el("textarea", {id:"hcb-prompt", rows:"3", placeholder:"Select page text or enter a prompt. Transfer requires clicking Send to Hermes."});
    const modeHelp = el("div", {class:"hcb-meta", id:"hcb-mode-help"}, "Manual: explicit transfer. Assisted: selected text can be prepared first. Auto: one-click transfer of user-approved text. Execution is disabled.");
    const status = el("div", {class:"hcb-status", id:"hcb-request-status"}, "No request submitted.");
    const meta = el("div", {class:"hcb-meta", id:"hcb-metadata"}, "Session: unavailable · Provider/model: loading…");
    const result = el("textarea", {class:"hcb-result", id:"hcb-result", rows:"3", placeholder:"Hermes result appears here if execution is enabled."});
    result.readOnly = true;
    const error = el("div", {class:"hcb-error", id:"hcb-error", role:"status"});
    const pair = el("div", {class:"hcb-row"});
    const pairCode = el("input", {id:"hcb-pair-code", placeholder:"One-time pairing code", "aria-label":"Pairing code"});
    const pairButton = el("button", {id:"hcb-pair", type:"button"}, "Pair gateway");
    pair.append(pairCode, pairButton);
    panel.append(head, controls, modeHelp, prompt, status, meta, result, error, pair);
    shadow.append(style, panel);
    composer.parentElement.insertBefore(root, composer);
    wire(shadow);
    restore(shadow);
    return true;
  }
  function message(type, data = {}) { return chrome.runtime.sendMessage({type:`bridge.${type}`,...data}); }
  async function restore(shadow) {
    const state = await chrome.storage.local.get(["activeRequest","mode","draft"]);
    if (state.mode && MODES.includes(state.mode)) shadow.getElementById("hcb-mode").value = state.mode;
    if (state.draft) shadow.getElementById("hcb-prompt").value = state.draft;
    const active = state.activeRequest;
    if (!active?.requestId) return;
    shadow.getElementById("hcb-request-status").textContent = `Restored ${active.state} · ${active.requestId}`;
    const authoritative = await message("refresh", {requestId:active.requestId});
    if (authoritative.status === "not-found") shadow.getElementById("hcb-request-status").textContent = `Gateway has no accepted task · ${active.requestId}`;
  }
  async function loadMeta(shadow) {
    const [health, meta] = await Promise.all([message("health"), message("metadata")]);
    const connected = health?.ok && health?.body?.hermes_connected;
    shadow.getElementById("hcb-connection").textContent = !health?.ok ? "Gateway unavailable" : (connected ? (health.body.paired ? "Hermes connected · paired" : "Hermes connected · pair required") : "Gateway connected · Hermes not running with --ipc");
    const p = meta?.providers;
    const s = meta?.sessions;
    const selector = shadow.getElementById("hcb-session");
    const previous = selector.value || (await chrome.storage.local.get("selectedSession")).selectedSession || "";
    selector.replaceChildren();
    if (s?.available) {
      selector.append(el("option", {value:"new"}, "Create new session"));
      for (const row of s.sessions || []) selector.append(el("option", {value:row.id}, `${row.title || row.id}${row.active ? " · active" : ""}`));
      const active = (s.sessions || []).find(row => row.active)?.id || "";
      selector.value = [...selector.options].some(option => option.value === previous) ? previous : active;
      await chrome.storage.local.set({selectedSession:selector.value});
    } else selector.append(el("option", {value:""}, s?.reason || "Hermes session unavailable"));
    const model = p?.available ? `${p.provider || "unknown"} / ${p.model || "unknown"}` : (p?.reason || "unavailable");
    const sessionLabel = s?.available ? (s.sessions.find(row => row.active)?.id || "unknown") : (s?.reason || "unavailable");
    shadow.getElementById("hcb-metadata").textContent = `Hermes active session: ${sessionLabel} · Provider/model: ${model}`;
  }
  function wire(shadow) {
    const prompt = shadow.getElementById("hcb-prompt");
    prompt.addEventListener("input", () => chrome.storage.local.set({draft:prompt.value}));
    shadow.getElementById("hcb-session").addEventListener("change", e => chrome.storage.local.set({selectedSession:e.target.value}));
    shadow.getElementById("hcb-mode").addEventListener("change", e => {
      chrome.storage.local.set({mode:e.target.value});
      shadow.getElementById("hcb-mode-help").textContent = e.target.value === "Assisted"
        ? "Assisted: selecting page text prepares it in the prompt box; click Send to Hermes to transfer."
        : e.target.value === "Auto"
          ? "Auto: one click transfers the selected or entered text without another confirmation. Hermes execution is disabled; no task will run."
          : "Manual: review the selected or entered text and click Send to Hermes for each transfer.";
    });
    document.addEventListener("selectionchange", () => {
      if (shadow.getElementById("hcb-mode").value === "Assisted") {
        const selected = window.getSelection()?.toString().trim();
        if (selected) prompt.value = selected;
      }
    });
    shadow.getElementById("hcb-send").addEventListener("click", async () => {
      const selected = window.getSelection()?.toString().trim();
      const text = (selected || prompt.value).trim();
      const status = shadow.getElementById("hcb-request-status");
      const error = shadow.getElementById("hcb-error");
      error.textContent = "";
      if (!text) { error.textContent = "Select text or enter a prompt first."; return; }
      const mode = shadow.getElementById("hcb-mode").value;
      status.textContent = `User-approved transfer · ${mode} · submitting…`;
      const sessionId = shadow.getElementById("hcb-session").value;
      const reply = await message("submit", {prompt:text,mode,sessionId});
      if (reply?.status === 503 && reply.body?.error?.code === "UNSAFE_EXECUTION_MODE") {
        status.textContent = `Not executed · request ${reply.activeRequest.requestId}`;
        error.textContent = "Hermes execution remains disabled until live native terminal approval tests pass. Your prompt was not run.";
      } else if (reply?.activeRequest) {
        status.textContent = `${reply.activeRequest.state} · ${reply.activeRequest.requestId}`;
        error.textContent = reply.body?.error?.message || "Gateway rejected the transfer.";
      } else error.textContent = reply?.message || "Gateway unavailable.";
    });
    shadow.getElementById("hcb-receive").addEventListener("click", async () => {
      const state = await chrome.storage.local.get("activeRequest");
      const id = state.activeRequest?.requestId;
      if (!id) { shadow.getElementById("hcb-error").textContent = "No active request."; return; }
      const reply = await message("refresh", {requestId:id});
      shadow.getElementById("hcb-request-status").textContent = reply.status === "not-found" ? `No accepted task · ${id}` : `${reply.status} · ${id}`;
      if (reply.status === "completed") shadow.getElementById("hcb-result").value = reply.body.result || "";
      else if (reply.status === "not-found") shadow.getElementById("hcb-error").textContent = "The gateway has no completed result. Hermes execution is currently disabled.";
    });
    shadow.getElementById("hcb-cancel").addEventListener("click", async () => {
      const state = await chrome.storage.local.get("activeRequest");
      const id = state.activeRequest?.requestId;
      if (!id) { shadow.getElementById("hcb-error").textContent = "No active request."; return; }
      const reply = await message("cancel", {requestId:id});
      shadow.getElementById("hcb-request-status").textContent = reply?.ok ? `${reply.body.status || "cancelling"} · ${id}` : `Cancellation unavailable · ${id}`;
    });
    shadow.getElementById("hcb-copy").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(shadow.getElementById("hcb-result").value);
        shadow.getElementById("hcb-error").textContent = "Result copied. Submit it to ChatGPT yourself.";
      } catch { shadow.getElementById("hcb-error").textContent = "Clipboard copy failed; select and copy the result manually."; }
    });
    shadow.getElementById("hcb-pair").addEventListener("click", async () => {
      const reply = await message("pair", {code:shadow.getElementById("hcb-pair-code").value.trim()});
      shadow.getElementById("hcb-error").textContent = reply?.ok ? "Gateway paired." : "Pairing failed. Check the code and gateway.";
      loadMeta(shadow);
    });
    loadMeta(shadow);
    refreshTimer = setInterval(() => loadMeta(shadow), 5000);
  }
  inject();
  observer = new MutationObserver(() => inject());
  observer.observe(document.documentElement, {childList:true,subtree:true});
  window.addEventListener("pagehide", () => { observer?.disconnect(); if (refreshTimer) clearInterval(refreshTimer); }, {once:true});
})();
