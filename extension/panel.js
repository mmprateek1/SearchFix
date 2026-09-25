import { DEFAULT_SETTINGS, DOCUMENT_TYPES, backendURL, guessDocumentType, requiredTypes, validateOrder, buildAssistantText } from "./core.js";
import { readOrderPage, readAttachment, readSupportingView } from "./page-reader.js";

const $ = id => document.getElementById(id);
let settings = { ...DEFAULT_SETTINGS, ...(await chrome.storage.local.get("settings")).settings };
let snapshot = null;
let sourceTab = null;
let result = null;
let files = [];
let busy = false;
let generation = 0;

function status(message, error = false) { $("status").textContent = message; $("status").classList.toggle("error", error); }
async function run(work) {
  if (busy) return;
  busy = true;
  document.querySelectorAll("button").forEach(button => button.disabled = true);
  try { await work(); } catch (error) { status(error.message || "Unable to complete this step.", true); }
  finally { busy = false; document.querySelectorAll("button").forEach(button => button.disabled = false); }
}
function resetResult() {
  generation++;
  result = null;
  files = [];
  $("localFiles").value = "";
  $("taText").value = "";
  $("windows").replaceChildren();
  $("result").textContent = "";
  $("resultSection").hidden = true;
  $("documentsSection").hidden = true;
}
async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) throw new Error("Open DataTrace and click the extension icon to grant access to this tab.");
  const url = new URL(tab.url);
  if (url.origin !== "https://tv.datatracetitle.com" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Open the DataTrace website before reading an order.");
  return tab;
}
async function inject(tabId, func, args) {
  const responses = await chrome.scripting.executeScript({ target: { tabId }, func, args });
  if (!responses[0]?.result) throw new Error("The page could not be read. Open the extension from the order page and try again.");
  return responses[0].result;
}
async function scan() {
  const tab = await currentTab();
  const data = await inject(tab.id, readOrderPage, [settings]);
  sourceTab = tab.id;
  snapshot = data;
  resetResult();
  $("reviewed").checked = false;
  renderSnapshot();
  status(data.comments.length ? `Read ${data.comments.length} comments. Check the history, then explain the client request.` : data.tasks.length ? `Found ${data.tasks.length} SearchFix orders on the loaded task page.` : "Open All Active and Available Tasks, or an Order Overview. If the page is loading, read it again when it finishes.");
  return data;
}
async function navigate(url) {
  const tab = await currentTab();
  const target = new URL(url);
  if (target.origin !== new URL(tab.url).origin || !/\/(Queues|OrderOverview)\.aspx$/i.test(target.pathname)) throw new Error("Only same-site queue and Order Overview navigation is allowed.");
  resetResult(); snapshot = null;
  $("orderSection").hidden = true;
  $("tasksSection").hidden = true;
  status("Opening the read-only page…");
  await chrome.tabs.update(tab.id, { url: target.href });
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const updated = await chrome.tabs.get(tab.id);
    if (updated.status === "complete" && updated.url === target.href) {
      const data = await scan();
      if (data.comments.length || data.tasks.length) return;
    }
  }
  status("The page is still loading. Use Read current page when it finishes.");
}
function renderSnapshot() {
  $("tasks").replaceChildren();
  for (const task of snapshot.tasks) {
    const button = document.createElement("button");
    button.textContent = task.name;
    button.disabled = busy;
    button.addEventListener("click", () => run(() => navigate(task.url)));
    $("tasks").append(button);
  }
  $("tasksSection").hidden = !snapshot.tasks.length;
  $("orderSection").hidden = !snapshot.orderNumber && !snapshot.comments.length;
  $("orderNumber").value = snapshot.orderNumber;
  $("counts").textContent = `${snapshot.comments.length} comments · ${snapshot.attachments.length} direct attachment links`;
  $("warnings").textContent = snapshot.warnings.join(" ");
  $("taStatus").textContent = snapshot.taStatus || "TA opens separately on DataTrace. Export or download its report as a PDF to include it as TYPED REPORT evidence.";
  $("comments").replaceChildren();
  for (const comment of snapshot.comments) {
    const card = document.createElement("div"); card.className = "comment";
    const heading = document.createElement("strong"); heading.textContent = `${comment.author} · ${comment.date} ${comment.time}`;
    const body = document.createElement("p"); body.textContent = comment.text;
    card.append(heading, body); $("comments").append(card);
  }
}
async function assertSameOrder() {
  if (!snapshot || sourceTab === null) throw new Error("Read an order first.");
  const tab = await currentTab();
  if (tab.id !== sourceTab || tab.url !== snapshot.pageUrl) throw new Error("The active tab or order changed. Read the current order again.");
  const fresh = await inject(sourceTab, readOrderPage, [settings]);
  if (fresh.orderNumber !== snapshot.orderNumber || JSON.stringify(fresh.comments) !== JSON.stringify(snapshot.comments)) {
    resetResult(); throw new Error("The order or comments changed. Read this page again before analysis.");
  }
}
async function api(path, body, json = false) {
  const response = await fetch(`${backendURL(settings.backend)}/api/searchfix/${path}`, {
    method: "POST", credentials: "omit", redirect: "error",
    headers: json ? { "Content-Type": "application/json" } : undefined,
    body: json ? JSON.stringify(body) : body,
    signal: AbortSignal.timeout(180000)
  });
  const payload = await response.json().catch(() => { throw new Error("Backend returned an unreadable response."); });
  if (!response.ok) throw new Error(payload.error || `Backend error (${response.status}).`);
  if (payload.orderNumber !== body.orderNumber && json) throw new Error("Backend response belongs to another order.");
  return payload;
}
function showResult(payload) {
  result = payload;
  $("result").textContent = buildAssistantText(payload);
  $("resultSection").hidden = false;
}
function renderFiles() {
  $("files").replaceChildren();
  for (const file of files) {
    const card = document.createElement("div"); card.className = "file";
    const label = document.createElement("label"); label.className = "check";
    const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = file.selected;
    checkbox.addEventListener("change", () => file.selected = checkbox.checked);
    label.append(checkbox, document.createTextNode(file.name));
    const type = document.createElement("select"); type.setAttribute("aria-label", `Document type for ${file.name}`);
    for (const value of ["", ...DOCUMENT_TYPES]) { const option = document.createElement("option"); option.value = value; option.textContent = value ? value.replaceAll("_", " ") : "Choose document type"; type.append(option); }
    type.value = file.type;
    type.addEventListener("change", () => file.type = type.value);
    card.append(label, type); $("files").append(card);
  }
}
$("read").addEventListener("click", () => run(scan));
$("home").addEventListener("click", () => run(async () => {
  const data = await scan();
  if (data.tasks.length) return;
  if (data.queueLinks.length) await navigate(data.queueLinks[0].url);
  else status("Open DataTrace Home → All Active and Available Tasks, then Read current page.");
}));
$("orderNumber").addEventListener("input", resetResult);
$("analyze").addEventListener("click", () => run(async () => {
  if (!$("reviewed").checked) throw new Error("Check that the relevant comment history is loaded first.");
  await assertSameOrder();
  const order = validateOrder({ ...snapshot, orderNumber: $("orderNumber").value });
  resetResult();
  const requestGeneration = generation;
  status("Explaining the client request…");
  const payload = await api("analyze-comments", order, true);
  await assertSameOrder();
  if (generation !== requestGeneration) throw new Error("The input changed during analysis. Analyze it again.");
  showResult(payload);
  const required = requiredTypes(payload);
  files = snapshot.attachments.map(file => ({ ...file, type: guessDocumentType(file.name), selected: required.includes(guessDocumentType(file.name)) }));
  $("required").textContent = `Requested evidence: ${required.map(t => t.replaceAll("_", " ")).join(", ") || "No files requested"}`;
  $("documentsSection").hidden = payload.status !== "AWAITING_DOCUMENTS";
  renderFiles();
  status("Comment review ready. Review the explanation and select supporting files if needed.");
}));
$("localFiles").addEventListener("change", () => {
  for (const file of $("localFiles").files) files.push({ name:file.name, local:file, type:guessDocumentType(file.name), selected:true });
  $("localFiles").value = "";
  renderFiles();
});
$("verify").addEventListener("click", () => run(async () => {
  await assertSameOrder();
  if (!result) throw new Error("Analyze comments first.");
  const order = validateOrder({ ...snapshot, orderNumber: $("orderNumber").value });
  const selected = files.filter(f => f.selected).map(f => ({...f}));
  const taText = $("taText").value.trim();
  if ((!selected.length && !taText) || selected.length > 6) throw new Error("Select up to 6 PDFs or include the order’s TA text.");
  if (taText.length > 120000) throw new Error("TA text exceeds 120,000 characters.");
  if (selected.some(f => !DOCUMENT_TYPES.includes(f.type))) throw new Error("Choose a document type for every selected file.");
  const requestGeneration = generation;
  const form = new FormData();
  form.append("orderData", JSON.stringify({ ...order, analysisId:result.analysisId, taText }));
  let total = 0;
  for (const [index, file] of selected.entries()) {
    status(`Reading PDF ${index + 1} of ${selected.length}: ${file.name}`);
    let blob = file.local;
    if (!blob) {
      if (!file.popupTab && !snapshot.attachments.some(a => a.url === file.url)) throw new Error("Attachment is not from this order.");
      const downloaded = await inject(file.popupTab || sourceTab, readAttachment, [file.url, file.pageUrl || snapshot.pageUrl]);
      const bytes = Uint8Array.from(atob(downloaded.base64), c => c.charCodeAt(0));
      blob = new Blob([bytes], { type:"application/pdf" });
    }
    if (blob.size > 20 * 1024 * 1024) throw new Error(`${file.name} exceeds 20 MB.`);
    if (await blob.slice(0, 5).text() !== "%PDF-") throw new Error(`${file.name} is not a PDF.`);
    total += blob.size;
    if (total > 40 * 1024 * 1024) throw new Error("Selected files exceed 40 MB in total.");
    form.append(`file${index}`, blob, file.name);
    form.append(`fileType_file${index}`, file.type);
  }
  await assertSameOrder();
  status("Comparing the client request with selected PDF evidence…");
  const payload = await api("analyze-documents", form);
  await assertSameOrder();
  if (generation !== requestGeneration || payload.orderNumber !== order.orderNumber) throw new Error("Order changed during analysis. Read it again.");
  showResult(payload);
  status("Evidence review ready. Check the findings and page references before preparing a client response.");
}));
$("copy").addEventListener("click", () => run(async () => {
  await assertSameOrder();
  await navigator.clipboard.writeText($("result").textContent);
  status("Review notes copied. Nothing was entered on DataTrace.");
}));
$("findWindows").addEventListener("click", () => run(async () => {
  if (!snapshot || !result) throw new Error("Analyze the order’s comments first.");
  const tabs = await chrome.tabs.query({url:"https://tv.datatracetitle.com/*"});
  $("windows").replaceChildren();
  for (const tab of tabs.filter(t => t.id !== sourceTab)) {
    for (const kind of ["ta", "attachments"]) {
      const button = document.createElement("button");
      button.textContent = `Read ${kind === "ta" ? "TA text" : "PDF links"}: ${tab.title || "DataTrace window"}`;
      button.addEventListener("click", () => run(async () => {
        if (!snapshot || !result) throw new Error("Read the order again.");
        const publicId = [...new URL(snapshot.pageUrl).searchParams.entries()].find(([key]) => key.toLowerCase() === "publicorderid")?.[1];
        const view = await inject(tab.id, readSupportingView, [snapshot.orderNumber, publicId || "", kind]);
        if (kind === "ta") { $("taText").value = view.text; status("TA text read. Check it belongs to this order before analysis."); }
        else {
          for (const file of view.attachments) if (!files.some(f => f.url === file.url)) files.push({...file,popupTab:tab.id,type:guessDocumentType(file.name),selected:false});
          renderFiles(); status(view.attachments.length ? "PDF links read. Select the relevant files below." : "No direct PDF links found. Download the required PDFs through the website and select them here.");
        }
      }));
      $("windows").append(button);
    }
  }
  if (!$("windows").children.length) status("No other DataTrace windows found. Open Attachments or a read-only TA view, then try again. You can also paste TA text or add downloaded PDFs.");
}));
const labels = { backend:"Local backend URL", order:"Order number selector", comments:"Comments container selector", commentRow:"Comment row selector", author:"Author selector", date:"Date selector", time:"Time selector", text:"Comment text selector", attachments:"Attachments container selector", taRead:"TA read-only text selector" };
for (const [key, labelText] of Object.entries(labels)) {
  const label = document.createElement("label"); label.htmlFor = `setting-${key}`; label.textContent = labelText;
  const input = document.createElement("input"); input.id = `setting-${key}`; input.value = settings[key];
  $("settingsForm").append(label, input);
}
$("settingsForm").addEventListener("submit", event => event.preventDefault());
$("saveSettings").addEventListener("click", () => run(async () => {
  const next = Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map(key => [key, $(`setting-${key}`).value.trim()]));
  next.backend = backendURL(next.backend);
  for (const [key, selector] of Object.entries(next)) if (key !== "backend" && selector) document.querySelector(selector);
  await chrome.storage.local.set({settings:next}); settings = next;
  snapshot = null; resetResult(); $("orderSection").hidden = true;
  status("Settings saved. Read the current page again.");
}));
$("health").addEventListener("click", () => run(async () => {
  const response = await fetch(`${backendURL(settings.backend)}/health`, { credentials:"omit", signal:AbortSignal.timeout(5000) });
  if (!response.ok || (await response.json()).status !== "OK") throw new Error("Backend health check failed.");
  status("Backend is reachable. This does not verify the Gemini API key or model.");
}));
chrome.tabs.onActivated.addListener(() => { generation++; });
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (tabId === sourceTab && change.url && snapshot && change.url !== snapshot.pageUrl) {
    resetResult(); snapshot = null; $("orderSection").hidden = true;
    status("The order page changed. Read it again to start a new review.");
  }
});
await run(async () => {
  const page = await scan();
  if (!page.orderNumber && !page.tasks.length && page.queueLinks.length) await navigate(page.queueLinks[0].url);
});
