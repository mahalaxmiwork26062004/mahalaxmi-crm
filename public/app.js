/* Mahalaxmi Enterprise CRM — public/app.js */
"use strict";

const API = "/api";
let currentPage = "dashboard";
let customersCache = [];
let productsCache = [];
let pageRequest = 0;

const PAGE_INFO = {
  dashboard: { title: "Dashboard", subtitle: "Overview of your business activity" },
  customers: { title: "Customers", subtitle: "Manage your customers and contacts" },
  enquiries: { title: "Enquiries", subtitle: "Track customer enquiries and leads" },
  products: { title: "Products", subtitle: "Products, pricing and stock" },
  quotations: { title: "Quotations", subtitle: "Manage quotations and proposals" },
  orders: { title: "Orders", subtitle: "Manage sales orders" },
  followups: { title: "Follow-ups", subtitle: "Today's customer follow-ups" },
  payments: { title: "Payments", subtitle: "Track customer payments" }
};

const TABLE_TITLES = {
  customers: "Customer", products: "Product", enquiries: "Enquiry", quotations: "Quotation",
  orders: "Order", followups: "Follow-up", payments: "Payment", enquiry_items: "Enquiry item",
  quotation_items: "Quotation item", order_items: "Order item", users: "User"
};

const NEW_RECORD_FIELDS = {
  customers: ["company_name", "contact_person", "mobile", "email", "city", "gst_number", "customer_type", "address", "notes"],
  products: ["name", "brand", "model", "part_number", "purchase_price", "selling_price", "stock_quantity", "unit", "description"],
  enquiries: ["customer_id", "enquiry_date", "source", "subject", "status", "priority", "assigned_to", "next_followup_date", "notes"],
  quotations: ["quotation_number", "customer_id", "quotation_date", "valid_until", "status", "grand_total", "notes"],
  orders: ["order_number", "customer_id", "order_date", "status", "grand_total", "notes"],
  followups: ["customer_id", "enquiry_id", "followup_date", "followup_time", "status", "notes"],
  payments: ["customer_id", "payment_date", "amount", "payment_mode", "status", "notes"]
};

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  let result;
  try { result = await response.json(); }
  catch { throw new Error(`Invalid server response (${response.status})`); }
  if (!response.ok || result.success === false) {
    throw new Error(result.error || result.message || `Request failed (${response.status})`);
  }
  return result;
}
const apiGet = endpoint => apiRequest(endpoint);
const apiPost = (endpoint, data) => apiRequest(endpoint, { method: "POST", body: JSON.stringify(data) });
const apiPut = (endpoint, data) => apiRequest(endpoint, { method: "PUT", body: JSON.stringify(data) });
const apiDelete = endpoint => apiRequest(endpoint, { method: "DELETE" });

function escapeHtml(value) {
  return value == null ? "" : String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}
function humanize(value) { return String(value || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }
function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? escapeHtml(value) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function getContent() { return document.getElementById("content"); }
function rows(result) { return Array.isArray(result) ? result : (result.data || result.customers || []); }
function titleFor(table) { return TABLE_TITLES[table] || humanize(table).replace(/s$/, ""); }
function valueFor(row, names, fallback = "—") { for (const name of names) if (row[name] != null && row[name] !== "") return row[name]; return fallback; }
function isDateField(field) { return /date|_at$/.test(field); }
function isNumberField(field) { return /amount|price|total|quantity|stock|percent|discount|_id$/.test(field); }
function isSystemField(field) { return ["id", "created_at", "updated_at", "password", "password_hash"].includes(field); }

function updatePageHeader(page) {
  const info = PAGE_INFO[page] || PAGE_INFO.dashboard;
  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  if (title) title.textContent = info.title;
  if (subtitle) subtitle.textContent = info.subtitle;
}
function showLoading(message) { const content = getContent(); if (content) content.innerHTML = `<div class="loading">${escapeHtml(message)}</div>`; }
function showError(error, retry) {
  const content = getContent();
  if (content) content.innerHTML = `<div class="panel"><div class="panel-body"><div class="empty"><div class="empty-icon">⚠️</div><h3>Unable to load this page</h3><p>${escapeHtml(error.message)}</p>${retry ? '<button type="button" class="button-primary" data-action="retry">Try again</button>' : ""}</div></div></div>`;
  content?.querySelector('[data-action="retry"]')?.addEventListener("click", () => showPage(currentPage));
}
function notify(message, type = "success") {
  let box = document.getElementById("crmToast");
  if (!box) { box = document.createElement("div"); box.id = "crmToast"; box.className = "crm-toast"; document.body.appendChild(box); }
  box.textContent = message; box.dataset.type = type; box.classList.add("show");
  clearTimeout(notify.timer); notify.timer = setTimeout(() => box.classList.remove("show"), 3500);
}

async function safeList(table) {
  try { return rows(await apiGet(`/${table}`)); }
  catch (error) { console.warn(`Could not load ${table}`, error); return []; }
}

async function renderDashboard() {
  const request = ++pageRequest;
  showLoading("Loading dashboard...");
  try {
    const [customers, products, enquiries, quotations, orders, followups] = await Promise.all(
      ["customers", "products", "enquiries", "quotations", "orders", "followups"].map(safeList)
    );
    if (request !== pageRequest) return;
    const quoteValue = quotations.reduce((sum, item) => sum + Number(valueFor(item, ["grand_total", "total", "amount"], 0)), 0);
    getContent().innerHTML = `
      <div class="stats">
        ${statCard("Customers", customers.length, "Total customers")}
        ${statCard("Products", products.length, "Product catalogue")}
        ${statCard("Enquiries", enquiries.length, "Customer enquiries")}
        ${statCard("Quotations", quotations.length, "Total quotations")}
      </div>
      <div class="grid-2">
        ${recentPanel("Recent Enquiries", "enquiries", enquiries, row => `<td>#${escapeHtml(row.id)}</td><td>${escapeHtml(valueFor(row,["subject","requirement","title"]))}</td><td>${badge(valueFor(row,["status"],"New"))}</td>`)}
        ${recentPanel("Recent Quotations", "quotations", quotations, row => `<td>${escapeHtml(valueFor(row,["quotation_number","number","id"]))}</td><td>${badge(valueFor(row,["status"],"Draft"))}</td><td>${formatCurrency(valueFor(row,["grand_total","total"],0))}</td>`)}
      </div>
      <div class="panel" style="margin-top:20px"><div class="panel-header"><h2>Business Summary</h2></div><div class="panel-body"><div class="stats">
        ${statCard("Orders", orders.length, "Sales orders")}${statCard("Follow-ups", followups.length, "Scheduled activities")}${statCard("Quotation Value", formatCurrency(quoteValue), "Across all quotations")}
      </div></div></div>`;
    getContent().querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => showPage(button.dataset.page)));
  } catch (error) { if (request === pageRequest) showError(error, true); }
}
function statCard(label, value, footer) { return `<div class="stat-card"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value">${escapeHtml(value)}</div><div class="stat-footer">${escapeHtml(footer)}</div></div>`; }
function recentPanel(title, page, data, rowTemplate) {
  return `<div class="panel"><div class="panel-header"><h2>${title}</h2><button type="button" data-page="${page}">View all</button></div><div class="panel-body">${data.length ? `<div class="table-wrapper"><table><tbody>${data.slice(0,5).map(row => `<tr>${rowTemplate(row)}</tr>`).join("")}</tbody></table></div>` : '<div class="empty"><div class="empty-icon">📭</div>No records yet</div>'}</div></div>`;
}

async function renderCustomers() { customersCache = await renderEntityPage("customers", { search: true }); }
async function renderProducts() { productsCache = await renderEntityPage("products", { search: true }); }

async function renderEnquiries() {
  const data = await renderEntityPage("enquiries", { search: true, filters: ["status", "source", "priority"], detail: true });
  return data;
}

async function renderEntityPage(table, options = {}) {
  const request = ++pageRequest;
  showLoading(`Loading ${table}...`);
  try {
    const data = await safeList(table);
    if (request !== pageRequest) return data;
    renderTablePage(table, data, options);
    return data;
  } catch (error) { if (request === pageRequest) showError(error, true); return []; }
}

function preferredColumns(table, data) {
  const defaults = {
    customers: ["id", "company_name", "name", "contact_person", "mobile", "email", "city"],
    products: ["id", "name", "product_name", "brand", "model", "selling_price", "stock_quantity"],
    enquiries: ["id", "subject", "customer_id", "source", "status", "priority", "next_followup_date"],
    quotations: ["id", "quotation_number", "customer_id", "quotation_date", "status", "grand_total"],
    orders: ["id", "order_number", "customer_id", "order_date", "status", "grand_total"]
  };
  const available = new Set(data.flatMap(Object.keys));
  const selected = (defaults[table] || []).filter(key => available.has(key));
  return selected.length ? selected : [...available].filter(key => !isSystemField(key)).slice(0, 7);
}
function renderTablePage(table, data, options) {
  const content = getContent(); const columns = preferredColumns(table, data);
  const filterOptions = options.filters || [];
  content.innerHTML = `<div class="toolbar"><div class="toolbar-left">${options.search ? '<input id="tableSearch" type="search" placeholder="Search..." autocomplete="off">' : ""}${filterOptions.map(field => `<select data-filter="${field}"><option value="">All ${humanize(field)}</option>${[...new Set(data.map(row => row[field]).filter(Boolean))].map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}</select>`).join("")}</div><button type="button" class="button-primary" id="newRecordButton">+ New ${titleFor(table)}</button></div><div class="panel"><div class="panel-body"><div class="table-wrapper"><table><thead><tr>${columns.map(key => `<th>${escapeHtml(humanize(key))}</th>`).join("")}<th>Action</th></tr></thead><tbody id="recordsBody"></tbody></table></div><div id="tableEmpty" class="empty" hidden><div class="empty-icon">📭</div>No ${escapeHtml(table)} found</div></div></div>`;
  const draw = () => {
    const query = (content.querySelector("#tableSearch")?.value || "").trim().toLowerCase();
    const activeFilters = Object.fromEntries([...content.querySelectorAll("[data-filter]")].map(el => [el.dataset.filter, el.value]));
    const visible = data.filter(row => (!query || Object.values(row).some(value => String(value ?? "").toLowerCase().includes(query))) && Object.entries(activeFilters).every(([key, value]) => !value || String(row[key]) === value));
    content.querySelector("#recordsBody").innerHTML = visible.map(row => `<tr>${columns.map(key => `<td>${cellValue(row[key], key)}</td>`).join("")}<td class="table-actions"><button type="button" data-action="view" data-id="${row.id}">View</button><button type="button" data-action="edit" data-id="${row.id}">Edit</button><button type="button" data-action="delete" data-id="${row.id}">Delete</button></td></tr>`).join("");
    content.querySelector("#tableEmpty").hidden = visible.length > 0;
  };
  content.querySelector("#newRecordButton").addEventListener("click", () => openRecordModal(table, null, data));
  content.querySelector("#tableSearch")?.addEventListener("input", draw);
  content.querySelectorAll("[data-filter]").forEach(el => el.addEventListener("change", draw));
  content.querySelector("#recordsBody").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]"); if (!button) return;
    const record = data.find(row => String(row.id) === button.dataset.id); if (!record) return;
    if (button.dataset.action === "delete") deleteRecord(table, record);
    else if (button.dataset.action === "edit") openRecordModal(table, record, data);
    else openDetailModal(table, record, data);
  });
  draw();
}
function cellValue(value, key) {
  if (value == null || value === "") return "—";
  if (/status|priority/.test(key)) return badge(value);
  if (isDateField(key)) return formatDate(value);
  if (/price|amount|total/.test(key)) return formatCurrency(value);
  return escapeHtml(value);
}
function badge(value) { const cls = String(value).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""); return `<span class="badge badge-${cls}">${escapeHtml(value)}</span>`; }

function modalHost() { let host = document.getElementById("crmModalHost"); if (!host) { host = document.createElement("div"); host.id = "crmModalHost"; document.body.appendChild(host); } return host; }
function openModal(title, body, size = "") {
  const host = modalHost(); host.innerHTML = `<div class="modal-backdrop" role="presentation"><div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><div class="modal-header"><h2>${escapeHtml(title)}</h2><button type="button" class="modal-close" aria-label="Close">×</button></div><div class="modal-body">${body}</div></div></div>`;
  const close = () => { host.innerHTML = ""; };
  host.querySelector(".modal-close").addEventListener("click", close);
  host.querySelector(".modal-backdrop").addEventListener("click", event => { if (event.target === event.currentTarget) close(); });
  return { host, close };
}
function fieldsFor(table, record, records) {
  if (record) return Object.keys(record).filter(key => !isSystemField(key));
  const known = NEW_RECORD_FIELDS[table] || [];
  const observed = records.flatMap(Object.keys).filter(key => !isSystemField(key));
  return [...new Set([...known.filter(key => observed.includes(key)), ...observed])];
}
function fieldInput(field, value) {
  const type = isDateField(field) ? "date" : (isNumberField(field) ? "number" : "text");
  const dateValue = type === "date" && value ? String(value).slice(0, 10) : (value ?? "");
  if (/notes|description|requirement|address/.test(field)) return `<textarea name="${escapeHtml(field)}" rows="3">${escapeHtml(dateValue)}</textarea>`;
  if (field === "status") return `<select name="status"><option value="New">New</option><option value="Contacted">Contacted</option><option value="Requirement Received">Requirement Received</option><option value="Quotation Pending">Quotation Pending</option><option value="Quotation Sent">Quotation Sent</option><option value="Negotiation">Negotiation</option><option value="Won">Won</option><option value="Lost">Lost</option><option value="On Hold">On Hold</option></select>`;
  if (field === "priority") return `<select name="priority"><option value="Low">Low</option><option value="Normal">Normal</option><option value="High">High</option><option value="Urgent">Urgent</option></select>`;
  return `<input name="${escapeHtml(field)}" type="${type}" ${type === "number" ? "step=\"any\"" : ""} value="${escapeHtml(dateValue)}">`;
}
function openRecordModal(table, record, records) {
  const fields = fieldsFor(table, record, records);
  if (!fields.length) { notify(`Add one ${titleFor(table)} first through the API, then its fields can be detected.`, "error"); return; }
  const modal = openModal(`${record ? "Edit" : "New"} ${titleFor(table)}`, `<form id="recordForm"><div class="form-grid">${fields.map(field => `<label>${escapeHtml(humanize(field))}${fieldInput(field, record?.[field])}</label>`).join("")}</div><div class="modal-actions"><button type="button" class="button-secondary" data-close>Cancel</button><button class="button-primary" type="submit">${record ? "Save changes" : `Create ${titleFor(table)}`}</button></div></form>`, "modal-large");
  for (const field of ["status", "priority"]) { const el = modal.host.querySelector(`[name="${field}"]`); if (el && record?.[field]) el.value = record[field]; }
  modal.host.querySelector("[data-close]").addEventListener("click", modal.close);
  modal.host.querySelector("#recordForm").addEventListener("submit", async event => {
    event.preventDefault(); const payload = formPayload(event.currentTarget);
    try { record ? await apiPut(`/${table}/${record.id}`, payload) : await apiPost(`/${table}`, payload); notify(`${titleFor(table)} ${record ? "updated" : "created"} successfully.`); modal.close(); showPage(table); }
    catch (error) { notify(error.message, "error"); }
  });
}
function formPayload(form) {
  const payload = {};
  new FormData(form).forEach((value, key) => { const text = String(value).trim(); if (text !== "") payload[key] = isNumberField(key) ? Number(text) : text; });
  return payload;
}
function openDetailModal(table, record, records) {
  const details = Object.entries(record).filter(([key]) => !isSystemField(key)).map(([key, value]) => `<div class="detail-item"><div class="detail-label">${escapeHtml(humanize(key))}</div><div class="detail-value">${cellValue(value, key)}</div></div>`).join("");
  const modal = openModal(`${titleFor(table)} #${record.id}`, `<div class="detail-grid">${details}</div><div class="modal-actions"><button type="button" class="button-secondary" data-close>Close</button><button type="button" class="button-primary" data-edit>Edit</button></div>`, "modal-large");
  modal.host.querySelector("[data-close]").addEventListener("click", modal.close);
  modal.host.querySelector("[data-edit]").addEventListener("click", () => { modal.close(); openRecordModal(table, record, records); });
}
async function deleteRecord(table, record) {
  if (!window.confirm(`Delete this ${titleFor(table).toLowerCase()}? This cannot be undone.`)) return;
  try { await apiDelete(`/${table}/${record.id}`); notify(`${titleFor(table)} deleted.`); showPage(table); }
  catch (error) { notify(error.message, "error"); }
}

async function renderSimpleTable(table, title = null) { return renderEntityPage(table, { search: true }); }
async function showPage(page) {
  page = PAGE_INFO[page] ? page : "dashboard"; currentPage = page; updatePageHeader(page); pageRequest++;
  document.querySelectorAll("[data-page]").forEach(el => el.classList.toggle("active", el.dataset.page === page));
  const renderer = { dashboard: renderDashboard, customers: renderCustomers, products: renderProducts, enquiries: renderEnquiries }[page];
  if (renderer) return renderer();
  return renderSimpleTable(page, PAGE_INFO[page].title);
}
function pageFromNavigation(element) {
  if (element.dataset.page) return element.dataset.page;
  const href = element.getAttribute("href") || "";
  const hash = href.match(/#([a-z]+)/i)?.[1]; if (hash && PAGE_INFO[hash]) return hash;
  const text = element.textContent.trim().toLowerCase().replace(/\s+/g, "");
  return Object.keys(PAGE_INFO).find(page => text.includes(page.replace("followups", "follow-up")));
}
function initialiseApp() {
  document.querySelectorAll("[data-page], .nav-link, .sidebar a, nav a").forEach(link => link.addEventListener("click", event => {
    const page = pageFromNavigation(link); if (!page) return; event.preventDefault(); showPage(page);
  }));
  showPage("dashboard");
}
document.addEventListener("DOMContentLoaded", initialiseApp);

