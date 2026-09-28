import { DEFAULT_SETTINGS, buildAssistantText } from "./core.js";
import { readOrderPage } from "./page-reader.js";
import { QueueRunner } from "./queue-runner.js";
import { createApiClient, normalizeApiKey } from "./api-client.js";
import { createPageInjector } from "./injection.js";
import { createActivityLog } from "./activity-log.js";

const $ = id => document.getElementById(id);
const settings = { ...DEFAULT_SETTINGS };
let apiKey = (await chrome.storage.session.get("geminiApiKey")).geminiApiKey || "";
let busy = false;
let discoveredTasks = [];
let queueRunner = null;
const taskCards = new Map();
const activity = createActivityLog(text => { $("activityLog").textContent = text; });
const log = activity.log;
const api = createApiClient({ backend: () => settings.backend, getKey: () => apiKey, log });
const diagnosticsApi = createApiClient({backend:()=>settings.backend,getKey:()=>apiKey,timeoutMs:5000});
let sentThrough = 0;
async function forwardActivity() {
  const records = activity.since(sentThrough);
  if (!records.length) return;
  try {
    await diagnosticsApi('client-events',{events:records.map(({time,event,details})=>({time,event,details}))},true);
    sentThrough = records.at(-1).sequence;
  } catch { log('diagnostics.forward.failed'); }
}
const inject = createPageInjector(chrome.scripting, log);

function status(message, error = false) { $("status").textContent = message; $("status").classList.toggle("error", error); }
async function run(work) {
  if (busy) return;
  busy = true;
  document.querySelectorAll("button").forEach(button => button.disabled = true);
  try { await work(); } catch (error) { status(error.message || "Unable to complete this step.", true); }
  finally { busy = false; document.querySelectorAll("button").forEach(button => button.disabled = false); $("stopBatch").disabled = true; }
}
function renderKeyState() {
  $("toggleApiKey").textContent = apiKey ? "Change Gemini API key" : "Add Gemini API key";
  $("apiKeyStatus").textContent = apiKey ? "Your key is saved for this browser session and will be used when you start analysis." : "Add your Gemini API key. There is no default-key fallback.";
}
$("toggleApiKey").addEventListener("click", () => {
  const open = $("apiKeySection").hidden;
  $("apiKeySection").hidden = !open;
  $("toggleApiKey").setAttribute("aria-expanded", String(open));
  if (open) $("apiKey").focus(); else $("apiKey").value = "";
});
$("apiKeyForm").addEventListener("submit", event => {
  event.preventDefault();
  run(async () => {
    try {
      const key = normalizeApiKey($("apiKey").value);
      await chrome.storage.session.set({ geminiApiKey: key });
      apiKey = key;
      $("apiKey").value = "";
      renderKeyState();
      $("apiKeySection").hidden = true;
      $("toggleApiKey").setAttribute("aria-expanded", "false");
      status("Your Gemini key is saved. Choose Start the search fix to begin analysis.");
    } catch (error) {
      $("apiKeyStatus").textContent = error.message;
      throw error;
    }
  });
});
$("removeApiKey").addEventListener("click", () => run(async () => {
  await chrome.storage.session.remove("geminiApiKey");
  apiKey = ""; $("apiKey").value = ""; renderKeyState();
  status("Key removed. Add a key before running analysis.");
}));
renderKeyState();

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) throw new Error("Open DataTrace and click the extension icon to grant access to this tab.");
  if (new URL(tab.url).origin !== "https://tv.datatracetitle.com") throw new Error("Open DataTrace before reading orders.");
  return tab;
}
function setTaskState(task, state) {
  const row = taskCards.get(task.url);
  if (!row) return;
  const labels = {PENDING:"Pending",PROCESSING:"Processing",ACCEPTED:"Accepted",DISPUTED:"Disputed",IGNORED:"Ignored",REVIEW_REQUIRED:"Review required"};
  row.badge.textContent = labels[state] || "Review required";
  row.badge.className = `orderStatus status-${labels[state] ? state.toLowerCase() : 'review_required'}`;
  row.card.dataset.status = state;
}
function renderTasks() {
  $("tasks").replaceChildren(); taskCards.clear();
  for (const task of discoveredTasks) {
    const card = document.createElement("details"); card.className = "orderCard";
    const summary = document.createElement("summary");
    const label = document.createElement("span"); label.className = "orderLabel"; label.textContent = task.orderNumber || task.name;
    const badge = document.createElement("span"); badge.setAttribute("role", "status");
    summary.append(label, badge);
    const content = document.createElement("div"); content.className = "orderContent";
    content.textContent = "Waiting to start. No analysis has been performed.";
    card.append(summary, content); $("tasks").append(card);
    taskCards.set(task.url, {card, badge, content}); setTaskState(task, "PENDING");
  }
  $("tasksSection").hidden = !discoveredTasks.length;
  $("batchActions").hidden = !discoveredTasks.length;
  $("orderCount").textContent = `${discoveredTasks.length} found`;
}
async function scan() {
  $("activitySection").hidden = false;
  log('scan.start');
  const tab = await currentTab();
  const data = await inject(tab.id, readOrderPage, [settings]);
  discoveredTasks = [...new Map(data.tasks.map(task=>[task.url,task])).values()];
  renderTasks();
  log('scan.complete', {count:discoveredTasks.length});
  $("toggleApiKey").hidden = false;
  status(discoveredTasks.length ? `Found ${discoveredTasks.length} SearchFix orders. Choose Start the search fix when ready.` : "No SearchFix orders found on this page. Open All Active and Available Tasks, load the desired rows, and scan again.");
  return data;
}
async function navigate(url) {
  const tab = await currentTab();
  const target = new URL(url);
  if (target.origin !== new URL(tab.url).origin || !/\/(Queues|OrderOverview)\.aspx$/i.test(target.pathname)) throw new Error("Only same-site queue and Order Overview navigation is allowed.");
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
  status("The page is still loading. Use Scan the page when it finishes.");
}
$("scan").addEventListener("click", () => run(async () => {
  const data = await scan();
  if (data.tasks.length) return;
  if (data.queueLinks.length) await navigate(data.queueLinks[0].url);
}));
async function processTasks(tasks) {
  if (!tasks.length) throw new Error("Scan the page to find SearchFix orders first.");
  if (!apiKey) {
    $("apiKeySection").hidden = false; $("toggleApiKey").setAttribute("aria-expanded", "true"); $("apiKey").focus();
    throw new Error("Add your Gemini API key, then choose Start the search fix.");
  }
  renderTasks();
  queueRunner = new QueueRunner({ tabs: chrome.tabs, inject, api, settings, log,
    onProgress: message => status(message),
    onOrderState: setTaskState,
    onResult: async (payload, count, total, task) => {
      const row = taskCards.get(task.url);
      const notes = document.createElement("pre"); notes.textContent = buildAssistantText(payload);
      const copy = document.createElement("button"); copy.textContent = "Copy notes"; copy.disabled = busy;
      copy.addEventListener("click", () => run(async () => {
        await navigator.clipboard.writeText(notes.textContent);
        status("Review notes copied. Nothing was entered on DataTrace.");
      }));
      row.content.replaceChildren(notes, copy);
      status(`Processed ${count} of ${total} orders.`);
      await forwardActivity();
    }
  });
  $("stopBatch").hidden = false;
  $("stopBatch").disabled = false;
  try {
    const results = await queueRunner.run(tasks);
    status(`${queueRunner.stopped ? "Stopped" : "Finished"}: ${results.length} of ${tasks.length} SearchFix orders processed. Open an order to read its findings.`);
  } finally { queueRunner = null; $("stopBatch").disabled = true; $("stopBatch").hidden = true; await forwardActivity(); }
}
$("processAll").addEventListener("click", () => run(() => processTasks([...discoveredTasks])));
$("stopBatch").addEventListener("click", () => {
  queueRunner?.stop(); $("stopBatch").disabled = true;
  status("Stopping after the current order finishes.");
});
// Opening the extension does not read or navigate the website. Scan is explicit.
$("copyActivity").addEventListener("click", () => run(async () => {
  await navigator.clipboard.writeText(activity.text());
  status("Activity log copied. It contains step metadata, not document contents or API keys.");
}));
