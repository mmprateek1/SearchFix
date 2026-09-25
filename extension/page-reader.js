// Serialized by chrome.scripting.executeScript. Keep every helper inside this function.
// This reader never clicks controls, sets values, dispatches events, or submits forms.
export function readOrderPage(settings) {
  const clean = value => (value || "").replace(/\s+/g, " ").trim();
  const text = el => clean(el?.innerText || el?.textContent);
  const visible = el => !!el && !el.closest('[hidden], [aria-hidden="true"]') && el.getClientRects().length > 0;
  const query = (root, selector) => selector ? root.querySelector(selector) : null;
  const all = (root, selector) => selector ? [...root.querySelectorAll(selector)] : [];
  const value = (el, attr) => clean(el?.getAttribute(attr) || text(el));
  const safeLink = anchor => {
    try {
      const url = new URL(anchor.getAttribute("href"), location.href);
      return /^https?:$/.test(url.protocol) && url.origin === location.origin && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  };
  const links = [...document.querySelectorAll("a[href]")].filter(visible);
  const tasks = [];
  // Match the Task Name column, then use ONLY its row's Order Overview link.
  // Order-number links call IsTaskAvailable and may claim work; never follow them.
  for (const table of document.querySelectorAll("table")) {
    const taskHeaders = [...table.querySelectorAll("thead th")].map(text);
    const taskIndex = taskHeaders.findIndex(h => /^task name$/i.test(h));
    const orderIndex = taskHeaders.findIndex(h => /^order number$/i.test(h));
    if (taskIndex < 0) continue;
    for (const row of table.querySelectorAll("tbody tr")) {
      const cells = row.children;
      if (!/search\s*fix/i.test(text(cells[taskIndex]))) continue;
      const overview = row.querySelector('a[href^="OrderOverview.aspx"], a[data-order-overview]');
      if (overview && safeLink(overview)) tasks.push({name: `${text(cells[orderIndex])} · ${text(cells[taskIndex])}`, url: safeLink(overview)});
    }
  }
  const queueLinks = links.filter(a => /^All Active and Available Tasks\*?$/i.test(text(a))).map(a => ({name:text(a),url:safeLink(a)})).filter(a=>a.url);
  const overviewLinks = links.filter(a => /^order\s*overview$/i.test(text(a))).map(a => ({ name: text(a), url: safeLink(a) })).filter(a => a.url);
  const findTable = header => [...document.querySelectorAll("table")].find(table => visible(table) && [...table.querySelectorAll("th")].some(th => header.test(text(th))));
  const commentRoot = query(document, settings.comments) || findTable(/^(comment|comments|comment text)$/i);
  const headers = commentRoot ? [...commentRoot.querySelectorAll("thead th, thead td")].map(text) : [];
  const cellFor = (row, pattern) => {
    const index = headers.findIndex(h => pattern.test(h));
    return index < 0 ? null : row.querySelectorAll("td")[index];
  };
  const normalizeDate = raw => {
    // ISO or unambiguous US month/day/year; reject two-digit years and other formats.
    const iso = raw.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (iso) return iso[0];
    const us = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    return us ? `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}` : raw;
  };
  const normalizeTime = raw => {
    const match = raw.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?\b/i);
    if (!match) return raw;
    let hour = Number(match[1]);
    if (match[4]) hour = hour % 12 + (match[4].toUpperCase() === "PM" ? 12 : 0);
    return `${String(hour).padStart(2, "0")}:${match[2]}:${match[3] || "00"}`;
  };
  const dataTraceComments = commentRoot?.id.endsWith("_OrderCommentControl1_dgComments");
  const comments = commentRoot ? all(commentRoot, settings.commentRow).filter(visible).map(row => {
    if (dataTraceComments) {
      const cells = row.children;
      if (cells.length !== 4 || row.querySelector("select")) return {text:""};
      const stamp = text(cells[1]);
      return {author:text(cells[2]), date:normalizeDate(stamp), time:normalizeTime(stamp), text:text(cells[3])};
    }
    const dateElement = query(row, settings.date) || cellFor(row, /^date(?:\s*\/\s*time)?$/i);
    const dateText = value(dateElement, "data-date");
    return {
      author: value(query(row, settings.author) || cellFor(row, /^(author|user|created by)$/i), "data-author"),
      date: normalizeDate(dateText),
      time: normalizeTime(value(query(row, settings.time) || cellFor(row, /^time$/i), "data-time") || dateText),
      text: text(query(row, settings.text) || cellFor(row, /^(comment|comments|comment text)$/i))
    };
  }).filter(c => c.text) : [];
  const orderElement = query(document, settings.order);
  const orderNumber = value(orderElement, "data-order-number");
  const attachmentRoot = query(document, settings.attachments) || findTable(/^(attachment|attachments|file name|filename)$/i);
  const attachments = attachmentRoot ? [...attachmentRoot.querySelectorAll("a[href]")].filter(visible).map(a => ({
    name: clean(a.getAttribute("download") || text(a)), url: safeLink(a)
  })).filter(a => a.name && a.url) : [];
  return {
    pageUrl: location.href, title: document.title, orderNumber, comments,
    tasks: [...new Map(tasks.map(t => [t.url, t])).values()],
    overviewLinks, queueLinks, attachments: [...new Map(attachments.map(a => [a.url, a])).values()],
    taStatus: text(document.querySelector('[id$="_liTypingAssistant"]')),
    typingAssistantText: text(query(document, settings.taRead)),
    warnings: ["Only currently rendered comments and attachments were read. Expand collapsed sections and load additional comment pages before analysis."]
  };
}

export async function readAttachment(url, expectedPageUrl) {
  if (location.href !== expectedPageUrl) throw new Error("The order page changed. Read the order again.");
  const target = new URL(url);
  if (target.origin !== location.origin || !/^https?:$/.test(target.protocol) || target.username || target.password) throw new Error("Only attachments on this website can be read automatically. Use a local PDF for other hosts.");
  const response = await fetch(target.href, { method: "GET", credentials: "same-origin", redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Attachment download failed (${response.status}).`);
  const limit = 20 * 1024 * 1024;
  if (Number(response.headers.get("content-length")) > limit) throw new Error("PDF exceeds 20 MB.");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw new Error("PDF exceeds 20 MB."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("Attachment is not a PDF (it may be a login page). Download the PDF manually and select it below.");
  let binary = "";
  for (let index = 0; index < bytes.length; index += 32768) binary += String.fromCharCode(...bytes.subarray(index, index + 32768));
  return { base64: btoa(binary), size };
}

export function readSupportingView(orderNumber, publicOrderId, kind) {
  const text = document.body.innerText;
  const urlMatches = publicOrderId && [...new URL(location.href).searchParams.values()].some(v => v.toLowerCase() === publicOrderId.toLowerCase());
  if (!urlMatches && !text.includes(orderNumber)) throw new Error("Cannot confirm this popup belongs to the selected order. Paste the TA text or select downloaded PDFs manually after checking the order number.");
  const visible = el => el.getClientRects().length && !el.closest('[hidden], [aria-hidden="true"]');
  if (kind === "ta") {
    const values = [...document.querySelectorAll('input:not([type="hidden"]):not([type="password"]):not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea, select')].filter(visible).map(el => {
      const label = el.labels?.[0]?.innerText || el.getAttribute("aria-label") || el.name || el.id;
      return `${label}: ${el.value}`;
    });
    return { text: [text, ...values].join("\n").slice(0, 120000), pageUrl:location.href };
  }
  const attachments = [...document.querySelectorAll('a[href]')].filter(visible).flatMap(a => {
    try {
      const url = new URL(a.getAttribute("href"), location.href);
      const name = a.getAttribute("download") || a.innerText.trim();
      if (url.origin !== location.origin || !/^https?:$/.test(url.protocol) || !/\.pdf(?:$|[?\s])/i.test(name + " " + url.pathname)) return [];
      return [{name:name || url.pathname.split("/").pop(),url:url.href,pageUrl:location.href}];
    } catch {return [];}
  });
  return {attachments, pageUrl:location.href};
}
