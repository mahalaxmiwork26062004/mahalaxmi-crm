/* =========================================================
   MAHALAXMI ENTERPRISE AI CRM
   public/app.js
   ========================================================= */

"use strict";

const API = "/api";

let currentPage = "dashboard";
let customersCache = [];
let productsCache = [];
let pageRequest = 0;

const PAGE_INFO = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Overview of your business activity"
  },

  customers: {
    title: "Customers",
    subtitle: "Manage your customers and contacts"
  },

  enquiries: {
    title: "Enquiries",
    subtitle: "Track customer enquiries and leads"
  },

  products: {
    title: "Products",
    subtitle: "Products, pricing and stock"
  },

  quotations: {
    title: "Quotations",
    subtitle: "Create and manage professional quotations"
  },

  orders: {
    title: "Orders",
    subtitle: "Manage sales orders"
  },

  followups: {
    title: "Follow-ups",
    subtitle: "Today's customer follow-ups"
  },

  payments: {
    title: "Payments",
    subtitle: "Track customer payments"
  }
};

const TABLE_TITLES = {
  customers: "Customer",
  products: "Product",
  enquiries: "Enquiry",
  quotations: "Quotation",
  orders: "Order",
  followups: "Follow-up",
  payments: "Payment",
  enquiry_items: "Enquiry Item",
  quotation_items: "Quotation Item",
  order_items: "Order Item",
  users: "User"
};

const NEW_RECORD_FIELDS = {

  customers: [
    "company_name",
    "contact_person",
    "mobile",
    "email",
    "city",
    "gst_number",
    "customer_type",
    "address",
    "notes"
  ],

  products: [
    "name",
    "brand",
    "model",
    "part_number",
    "purchase_price",
    "selling_price",
    "stock_quantity",
    "unit",
    "description"
  ],

  enquiries: [
    "customer_id",
    "enquiry_date",
    "source",
    "subject",
    "status",
    "priority",
    "assigned_to",
    "next_followup_date",
    "notes"
  ],

  quotations: [
    "quotation_number",
    "customer_id",
    "quotation_date",
    "valid_until",
    "status",
    "grand_total",
    "notes"
  ],

  orders: [
    "order_number",
    "customer_id",
    "order_date",
    "status",
    "grand_total",
    "notes"
  ],

  followups: [
    "customer_id",
    "enquiry_id",
    "followup_date",
    "followup_time",
    "status",
    "notes"
  ],

  payments: [
    "customer_id",
    "payment_date",
    "amount",
    "payment_mode",
    "status",
    "notes"
  ]
};


/* =========================================================
   API
========================================================= */

async function apiRequest(endpoint, options = {}) {

  const response = await fetch(`${API}${endpoint}`, {
    ...options,

    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  let result;

  try {
    result = await response.json();
  }

  catch {
    throw new Error(
      `Invalid server response (${response.status})`
    );
  }

  if (!response.ok || result.success === false) {

    throw new Error(
      result.error ||
      result.message ||
      `Request failed (${response.status})`
    );
  }

  return result;
}


const apiGet = endpoint =>
  apiRequest(endpoint);


const apiPost = (endpoint, data) =>
  apiRequest(endpoint, {
    method: "POST",
    body: JSON.stringify(data)
  });


const apiPut = (endpoint, data) =>
  apiRequest(endpoint, {
    method: "PUT",
    body: JSON.stringify(data)
  });


const apiDelete = endpoint =>
  apiRequest(endpoint, {
    method: "DELETE"
  });


/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(value) {

  if (value == null) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function humanize(value) {

  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}


function formatCurrency(value) {

  return Number(value || 0).toLocaleString(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}


function formatNumber(value) {

  return Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}


function formatDate(value) {

  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}


function todayISO() {

  const d = new Date();

  const year = d.getFullYear();

  const month = String(
    d.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    d.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function getContent() {

  return document.getElementById("content");
}


function rows(result) {

  if (Array.isArray(result)) {
    return result;
  }

  return (
    result.data ||
    result.customers ||
    result.products ||
    []
  );
}


function titleFor(table) {

  return (
    TABLE_TITLES[table] ||
    humanize(table).replace(/s$/, "")
  );
}


function valueFor(
  row,
  names,
  fallback = "—"
) {

  for (const name of names) {

    if (
      row[name] !== undefined &&
      row[name] !== null &&
      row[name] !== ""
    ) {

      return row[name];
    }
  }

  return fallback;
}


function isDateField(field) {

  return /date|_at$/.test(field);
}


function isNumberField(field) {

  return (
    /amount|price|total|quantity|stock|percent|discount|_id$/.test(
      field
    )
  );
}


function isSystemField(field) {

  return [
    "id",
    "created_at",
    "updated_at",
    "password",
    "password_hash"
  ].includes(field);
}


/* =========================================================
   HEADER
========================================================= */

function updatePageHeader(page) {

  const info =
    PAGE_INFO[page] ||
    PAGE_INFO.dashboard;

  const title =
    document.getElementById("pageTitle");

  const subtitle =
    document.getElementById("pageSubtitle");

  if (title) {
    title.textContent = info.title;
  }

  if (subtitle) {
    subtitle.textContent = info.subtitle;
  }
}


/* =========================================================
   LOADING / ERROR / TOAST
========================================================= */

function showLoading(message) {

  const content = getContent();

  if (content) {

    content.innerHTML =
      `<div class="loading">
        ${escapeHtml(message)}
      </div>`;
  }
}


function showError(error, retry = true) {

  const content = getContent();

  if (!content) return;

  content.innerHTML = `
    <div class="panel">
      <div class="panel-body">
        <div class="empty">

          <div class="empty-icon">⚠️</div>

          <h3>Unable to load this page</h3>

          <p>
            ${escapeHtml(error.message)}
          </p>

          ${
            retry
              ? `
                <button
                  type="button"
                  class="button-primary"
                  data-action="retry">
                  Try again
                </button>
              `
              : ""
          }

        </div>
      </div>
    </div>
  `;

  content
    .querySelector('[data-action="retry"]')
    ?.addEventListener(
      "click",
      () => showPage(currentPage)
    );
}


function notify(
  message,
  type = "success"
) {

  let box =
    document.getElementById(
      "crmToast"
    );

  if (!box) {

    box =
      document.createElement("div");

    box.id = "crmToast";

    box.className =
      "crm-toast";

    document.body.appendChild(box);
  }

  box.textContent = message;

  box.dataset.type = type;

  box.classList.add("show");

  clearTimeout(
    notify.timer
  );

  notify.timer =
    setTimeout(
      () =>
        box.classList.remove(
          "show"
        ),
      3500
    );
}


/* =========================================================
   SAFE LIST
========================================================= */

async function safeList(table) {

  try {

    return rows(
      await apiGet(`/${table}`)
    );

  }

  catch (error) {

    console.warn(
      `Could not load ${table}`,
      error
    );

    return [];
  }
}


/* =========================================================
   DASHBOARD
========================================================= */

async function renderDashboard() {

  const request =
    ++pageRequest;

  showLoading(
    "Loading dashboard..."
  );

  try {

    const [
      customers,
      products,
      enquiries,
      quotations,
      orders,
      followups
    ] =
      await Promise.all(
        [
          "customers",
          "products",
          "enquiries",
          "quotations",
          "orders",
          "followups"
        ].map(safeList)
      );

    if (
      request !== pageRequest
    ) {
      return;
    }

    const quoteValue =
      quotations.reduce(
        (sum, item) =>
          sum +
          Number(
            valueFor(
              item,
              [
                "grand_total",
                "total",
                "amount"
              ],
              0
            )
          ),
        0
      );

    getContent().innerHTML = `

      <div class="stats">

        ${statCard(
          "Customers",
          customers.length,
          "Total customers"
        )}

        ${statCard(
          "Products",
          products.length,
          "Product catalogue"
        )}

        ${statCard(
          "Enquiries",
          enquiries.length,
          "Customer enquiries"
        )}

        ${statCard(
          "Quotations",
          quotations.length,
          "Total quotations"
        )}

      </div>

      <div class="grid-2">

        ${recentPanel(
          "Recent Enquiries",
          "enquiries",
          enquiries,
          row =>
            `
              <td>#${escapeHtml(row.id)}</td>
              <td>
                ${escapeHtml(
                  valueFor(
                    row,
                    [
                      "subject",
                      "requirement",
                      "title"
                    ]
                  )
                )}
              </td>
              <td>
                ${badge(
                  valueFor(
                    row,
                    ["status"],
                    "New"
                  )
                )}
              </td>
            `
        )}

        ${recentPanel(
          "Recent Quotations",
          "quotations",
          quotations,
          row =>
            `
              <td>
                ${escapeHtml(
                  valueFor(
                    row,
                    [
                      "quotation_number",
                      "number",
                      "id"
                    ]
                  )
                )}
              </td>

              <td>
                ${badge(
                  valueFor(
                    row,
                    ["status"],
                    "Draft"
                  )
                )}
              </td>

              <td>
                ${formatCurrency(
                  valueFor(
                    row,
                    [
                      "grand_total",
                      "total"
                    ],
                    0
                  )
                )}
              </td>
            `
        )}

      </div>

      <div
        class="panel"
        style="margin-top:20px"
      >

        <div class="panel-header">

          <h2>
            Business Summary
          </h2>

        </div>

        <div class="panel-body">

          <div class="stats">

            ${statCard(
              "Orders",
              orders.length,
              "Sales orders"
            )}

            ${statCard(
              "Follow-ups",
              followups.length,
              "Scheduled activities"
            )}

            ${statCard(
              "Quotation Value",
              formatCurrency(
                quoteValue
              ),
              "Across all quotations"
            )}

          </div>

        </div>

      </div>
    `;

    getContent()
      .querySelectorAll(
        "[data-page]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () =>
            showPage(
              button.dataset.page
            )
        );
      });

  }

  catch (error) {

    if (
      request === pageRequest
    ) {

      showError(
        error,
        true
      );
    }
  }
}


function statCard(
  label,
  value,
  footer
) {

  return `
    <div class="stat-card">

      <div class="stat-label">
        ${escapeHtml(label)}
      </div>

      <div class="stat-value">
        ${escapeHtml(value)}
      </div>

      <div class="stat-footer">
        ${escapeHtml(footer)}
      </div>

    </div>
  `;
}


function recentPanel(
  title,
  page,
  data,
  rowTemplate
) {

  return `
    <div class="panel">

      <div class="panel-header">

        <h2>
          ${escapeHtml(title)}
        </h2>

        <button
          type="button"
          data-page="${page}">
          View all
        </button>

      </div>

      <div class="panel-body">

        ${
          data.length
            ? `
              <div class="table-wrapper">

                <table>

                  <tbody>

                    ${data
                      .slice(0, 5)
                      .map(
                        row =>
                          `<tr>
                            ${rowTemplate(row)}
                          </tr>`
                      )
                      .join("")}

                  </tbody>

                </table>

              </div>
            `
            : `
              <div class="empty">

                <div class="empty-icon">
                  📭
                </div>

                No records yet

              </div>
            `
        }

      </div>

    </div>
  `;
}


/* =========================================================
   CUSTOMERS / PRODUCTS / ENQUIRIES
========================================================= */

async function renderCustomers() {

  customersCache =
    await renderEntityPage(
      "customers",
      {
        search: true
      }
    );
}


async function renderProducts() {

  productsCache =
    await renderEntityPage(
      "products",
      {
        search: true
      }
    );
}


async function renderEnquiries() {

  return renderEntityPage(
    "enquiries",
    {
      search: true,
      filters: [
        "status",
        "source",
        "priority"
      ],
      detail: true
    }
  );
}


async function renderEntityPage(
  table,
  options = {}
) {

  const request =
    ++pageRequest;

  showLoading(
    `Loading ${table}...`
  );

  try {

    const data =
      await safeList(table);

    if (
      request !== pageRequest
    ) {

      return data;
    }

    renderTablePage(
      table,
      data,
      options
    );

    return data;

  }

  catch (error) {

    if (
      request === pageRequest
    ) {

      showError(
        error,
        true
      );
    }

    return [];
  }
}


/* =========================================================
   TABLE COLUMNS
========================================================= */

function preferredColumns(
  table,
  data
) {

  const defaults = {

    customers: [
      "id",
      "company_name",
      "name",
      "contact_person",
      "mobile",
      "email",
      "city"
    ],

    products: [
      "id",
      "name",
      "product_name",
      "brand",
      "model",
      "selling_price",
      "stock_quantity"
    ],

    enquiries: [
      "id",
      "subject",
      "customer_id",
      "source",
      "status",
      "priority",
      "next_followup_date"
    ],

    quotations: [
      "id",
      "quotation_number",
      "customer_id",
      "quotation_date",
      "status",
      "grand_total"
    ],

    orders: [
      "id",
      "order_number",
      "customer_id",
      "order_date",
      "status",
      "grand_total"
    ]
  };

  const available =
    new Set(
      data.flatMap(
        Object.keys
      )
    );

  const selected =
    (
      defaults[table] ||
      []
    ).filter(
      key =>
        available.has(key)
    );

  return selected.length
    ? selected
    : [
        ...available
      ]
        .filter(
          key =>
            !isSystemField(key)
        )
        .slice(0, 7);
}


/* =========================================================
   GENERIC TABLE PAGE
========================================================= */

function renderTablePage(
  table,
  data,
  options
) {

  const content =
    getContent();

  const columns =
    preferredColumns(
      table,
      data
    );

  const filterOptions =
    options.filters || [];

  content.innerHTML = `

    <div class="toolbar">

      <div class="toolbar-left">

        ${
          options.search
            ? `
              <input
                id="tableSearch"
                type="search"
                placeholder="Search..."
                autocomplete="off">
            `
            : ""
        }

        ${filterOptions
          .map(
            field =>
              `
                <select
                  data-filter="${field}">

                  <option value="">
                    All ${humanize(field)}
                  </option>

                  ${[
                    ...new Set(
                      data
                        .map(
                          row =>
                            row[field]
                        )
                        .filter(Boolean)
                    )
                  ]
                    .map(
                      value =>
                        `
                          <option
                            value="${escapeHtml(value)}">
                            ${escapeHtml(value)}
                          </option>
                        `
                    )
                    .join("")}

                </select>
              `
          )
          .join("")}

      </div>

      <button
        type="button"
        class="button-primary"
        id="newRecordButton">

        + New ${titleFor(table)}

      </button>

    </div>

    <div class="panel">

      <div class="panel-body">

        <div class="table-wrapper">

          <table>

            <thead>

              <tr>

                ${columns
                  .map(
                    key =>
                      `
                        <th>
                          ${escapeHtml(
                            humanize(key)
                          )}
                        </th>
                      `
                  )
                  .join("")}

                <th>
                  Action
                </th>

              </tr>

            </thead>

            <tbody
              id="recordsBody">
            </tbody>

          </table>

        </div>

        <div
          id="tableEmpty"
          class="empty"
          hidden>

          <div class="empty-icon">
            📭
          </div>

          No ${escapeHtml(table)}
          found

        </div>

      </div>

    </div>
  `;

  const draw =
    () => {

      const query =
        (
          content.querySelector(
            "#tableSearch"
          )?.value ||
          ""
        )
          .trim()
          .toLowerCase();

      const activeFilters =
        Object.fromEntries(
          [
            ...content.querySelectorAll(
              "[data-filter]"
            )
          ].map(
            el => [
              el.dataset.filter,
              el.value
            ]
          )
        );

      const visible =
        data.filter(
          row =>

            (
              !query ||
              Object.values(row).some(
                value =>
                  String(
                    value ?? ""
                  )
                    .toLowerCase()
                    .includes(query)
              )
            )

            &&

            Object.entries(
              activeFilters
            ).every(
              ([key, value]) =>
                !value ||
                String(row[key]) ===
                  value
            )
        );

      content.querySelector(
        "#recordsBody"
      ).innerHTML = visible
        .map(
          row =>
            `
              <tr>

                ${columns
                  .map(
                    key =>
                      `
                        <td>
                          ${cellValue(
                            row[key],
                            key
                          )}
                        </td>
                      `
                  )
                  .join("")}

                <td
                  class="table-actions">

                  <button
                    type="button"
                    data-action="view"
                    data-id="${row.id}">
                    View
                  </button>

                  <button
                    type="button"
                    data-action="edit"
                    data-id="${row.id}">
                    Edit
                  </button>

                  <button
                    type="button"
                    data-action="delete"
                    data-id="${row.id}">
                    Delete
                  </button>

                </td>

              </tr>
            `
        )
        .join("");

      content.querySelector(
        "#tableEmpty"
      ).hidden =
        visible.length > 0;
    };

  content
    .querySelector(
      "#newRecordButton"
    )
    .addEventListener(
      "click",
      () =>
        openRecordModal(
          table,
          null,
          data
        )
    );

  content
    .querySelector(
      "#tableSearch"
    )
    ?.addEventListener(
      "input",
      draw
    );

  content
    .querySelectorAll(
      "[data-filter]"
    )
    .forEach(
      el =>
        el.addEventListener(
          "change",
          draw
        )
    );

  content
    .querySelector(
      "#recordsBody"
    )
    .addEventListener(
      "click",
      event => {

        const button =
          event.target.closest(
            "button[data-action]"
          );

        if (!button) return;

        const record =
          data.find(
            row =>
              String(row.id) ===
              button.dataset.id
          );

        if (!record) return;

        if (
          button.dataset.action ===
          "delete"
        ) {

          deleteRecord(
            table,
            record
          );

        }

        else if (
          button.dataset.action ===
          "edit"
        ) {

          openRecordModal(
            table,
            record,
            data
          );

        }

        else {

          openDetailModal(
            table,
            record,
            data
          );
        }
      }
    );

  draw();
}


/* =========================================================
   TABLE CELL
========================================================= */

function cellValue(
  value,
  key
) {

  if (
    value == null ||
    value === ""
  ) {

    return "—";
  }

  if (
    /status|priority/.test(key)
  ) {

    return badge(value);
  }

  if (
    isDateField(key)
  ) {

    return formatDate(value);
  }

  if (
    /price|amount|total/.test(key)
  ) {

    return formatCurrency(
      value
    );
  }

  return escapeHtml(value);
}


function badge(value) {

  const cls =
    String(value)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(
        /[^a-z0-9-]/g,
        ""
      );

  return `
    <span
      class="badge badge-${cls}">
      ${escapeHtml(value)}
    </span>
  `;
}


/* =========================================================
   MODAL
========================================================= */

function modalHost() {

  let host =
    document.getElementById(
      "crmModalHost"
    );

  if (!host) {

    host =
      document.createElement(
        "div"
      );

    host.id =
      "crmModalHost";

    document.body.appendChild(
      host
    );
  }

  return host;
}


function openModal(
  title,
  body,
  size = ""
) {

  const host =
    modalHost();

  host.innerHTML = `

    <div
      class="modal-backdrop"
      role="presentation">

      <div
        class="modal ${size}"
        role="dialog"
        aria-modal="true"
        aria-label="${escapeHtml(title)}">

        <div class="modal-header">

          <h2>
            ${escapeHtml(title)}
          </h2>

          <button
            type="button"
            class="modal-close"
            aria-label="Close">
            ×
          </button>

        </div>

        <div class="modal-body">

          ${body}

        </div>

      </div>

    </div>
  `;

  const close =
    () => {
      host.innerHTML = "";
    };

  host
    .querySelector(
      ".modal-close"
    )
    .addEventListener(
      "click",
      close
    );

  host
    .querySelector(
      ".modal-backdrop"
    )
    .addEventListener(
      "click",
      event => {

        if (
          event.target ===
          event.currentTarget
        ) {

          close();
        }
      }
    );

  return {
    host,
    close
  };
}


/* =========================================================
   GENERIC FORM
========================================================= */

function fieldsFor(
  table,
  record,
  records
) {

  if (record) {

    return Object.keys(
      record
    ).filter(
      key =>
        !isSystemField(key)
    );
  }

  const known =
    NEW_RECORD_FIELDS[
      table
    ] || [];

  const observed =
    records
      .flatMap(
        Object.keys
      )
      .filter(
        key =>
          !isSystemField(key)
      );

  return [
    ...new Set([
      ...known.filter(
        key =>
          observed.includes(key)
      ),
      ...observed
    ])
  ];
}


function fieldInput(
  field,
  value
) {

  const type =
    isDateField(field)
      ? "date"
      : (
          isNumberField(field)
            ? "number"
            : "text"
        );

  const dateValue =
    type === "date" &&
    value
      ? String(value).slice(
          0,
          10
        )
      : (
          value ?? ""
        );

  if (
    /notes|description|requirement|address/.test(
      field
    )
  ) {

    return `
      <textarea
        name="${escapeHtml(field)}"
        rows="3">
        ${escapeHtml(dateValue)}
      </textarea>
    `;
  }

  if (
    field === "status"
  ) {

    return `
      <select
        name="status">

        <option value="New">
          New
        </option>

        <option value="Contacted">
          Contacted
        </option>

        <option value="Requirement Received">
          Requirement Received
        </option>

        <option value="Quotation Pending">
          Quotation Pending
        </option>

        <option value="Quotation Sent">
          Quotation Sent
        </option>

        <option value="Negotiation">
          Negotiation
        </option>

        <option value="Won">
          Won
        </option>

        <option value="Lost">
          Lost
        </option>

        <option value="On Hold">
          On Hold
        </option>

      </select>
    `;
  }

  if (
    field === "priority"
  ) {

    return `
      <select
        name="priority">

        <option value="Low">
          Low
        </option>

        <option value="Normal">
          Normal
        </option>

        <option value="High">
          High
        </option>

        <option value="Urgent">
          Urgent
        </option>

      </select>
    `;
  }

  return `
    <input
      name="${escapeHtml(field)}"
      type="${type}"
      ${
        type === "number"
          ? 'step="any"'
          : ""
      }
      value="${escapeHtml(
        dateValue
      )}">
  `;
}


function openRecordModal(
  table,
  record,
  records
) {

  const fields =
    fieldsFor(
      table,
      record,
      records
    );

  if (!fields.length) {

    notify(
      `Add one ${titleFor(table)} first through the API, then its fields can be detected.`,
      "error"
    );

    return;
  }

  const modal =
    openModal(
      `${
        record
          ? "Edit"
          : "New"
      } ${titleFor(table)}`,

      `
        <form
          id="recordForm">

          <div
            class="form-grid">

            ${fields
              .map(
                field =>
                  `
                    <label>

                      ${escapeHtml(
                        humanize(
                          field
                        )
                      )}

                      ${fieldInput(
                        field,
                        record?.[field]
                      )}

                    </label>
                  `
              )
              .join("")}

          </div>

          <div
            class="modal-actions">

            <button
              type="button"
              class="button-secondary"
              data-close>
              Cancel
            </button>

            <button
              class="button-primary"
              type="submit">

              ${
                record
                  ? "Save changes"
                  : `Create ${titleFor(
                      table
                    )}`
              }

            </button>

          </div>

        </form>
      `,
      "modal-large"
    );

  for (
    const field of [
      "status",
      "priority"
    ]
  ) {

    const el =
      modal.host.querySelector(
        `[name="${field}"]`
      );

    if (
      el &&
      record?.[field]
    ) {

      el.value =
        record[field];
    }
  }

  modal.host
    .querySelector(
      "[data-close]"
    )
    .addEventListener(
      "click",
      modal.close
    );

  modal.host
    .querySelector(
      "#recordForm"
    )
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const payload =
          formPayload(
            event.currentTarget
          );

        try {

          if (record) {

            await apiPut(
              `/${table}/${record.id}`,
              payload
            );

          }

          else {

            await apiPost(
              `/${table}`,
              payload
            );
          }

          notify(
            `${titleFor(table)} ${
              record
                ? "updated"
                : "created"
            } successfully.`
          );

          modal.close();

          showPage(table);

        }

        catch (error) {

          notify(
            error.message,
            "error"
          );
        }
      }
    );
}


function formPayload(form) {

  const payload = {};

  new FormData(form)
    .forEach(
      (value, key) => {

        const text =
          String(value).trim();

        if (
          text !== ""
        ) {

          payload[key] =
            isNumberField(key)
              ? Number(text)
              : text;
        }
      }
    );

  return payload;
}


/* =========================================================
   DETAIL MODAL
========================================================= */

function openDetailModal(
  table,
  record,
  records
) {

  const details =
    Object.entries(record)
      .filter(
        ([key]) =>
          !isSystemField(key)
      )
      .map(
        ([key, value]) =>
          `
            <div
              class="detail-item">

              <div
                class="detail-label">

                ${escapeHtml(
                  humanize(key)
                )}

              </div>

              <div
                class="detail-value">

                ${cellValue(
                  value,
                  key
                )}

              </div>

            </div>
          `
      )
      .join("");

  const modal =
    openModal(
      `${titleFor(table)} #${record.id}`,

      `
        <div
          class="detail-grid">

          ${details}

        </div>

        <div
          class="modal-actions">

          <button
            type="button"
            class="button-secondary"
            data-close>
            Close
          </button>

          <button
            type="button"
            class="button-primary"
            data-edit>
            Edit
          </button>

        </div>
      `,

      "modal-large"
    );

  modal.host
    .querySelector(
      "[data-close]"
    )
    .addEventListener(
      "click",
      modal.close
    );

  modal.host
    .querySelector(
      "[data-edit]"
    )
    .addEventListener(
      "click",
      () => {

        modal.close();

        openRecordModal(
          table,
          record,
          records
        );
      }
    );
}


async function deleteRecord(
  table,
  record
) {

  if (
    !window.confirm(
      `Delete this ${titleFor(
        table
      ).toLowerCase()}? This cannot be undone.`
    )
  ) {

    return;
  }

  try {

    await apiDelete(
      `/${table}/${record.id}`
    );

    notify(
      `${titleFor(table)} deleted.`
    );

    showPage(table);

  }

  catch (error) {

    notify(
      error.message,
      "error"
    );
  }
}


/* =========================================================
   QUOTATION SYSTEM
========================================================= */

/*
  Quotation calculation:

  Items subtotal
       ↓
  Discount %
       ↓
  Discount amount
       ↓
  Net taxable amount
       +
  Freight
       ↓
  Taxable amount
       ↓
  GST %
       ↓
  GST amount
       ↓
  Grand total
*/


let quotationItems = [];

let quotationCustomerCache = [];

let quotationProductsCache = [];

let quotationSchema = [];

let quotationItemSchema = [];


/* =========================================================
   QUOTATION NUMBER
========================================================= */

async function generateQuotationNumber() {

  try {

    const quotations =
      await safeList(
        "quotations"
      );

    const year =
      new Date()
        .getFullYear();

    let maxNumber = 0;

    quotations.forEach(
      quote => {

        const number =
          String(
            quote.quotation_number ||
            quote.number ||
            ""
          );

        const match =
          number.match(
            /(\d+)$/
          );

        if (match) {

          maxNumber =
            Math.max(
              maxNumber,
              Number(
                match[1]
              )
            );
        }
      }
    );

    return `QTN-${year}-${String(
      maxNumber + 1
    ).padStart(4, "0")}`;

  }

  catch {

    return `QTN-${new Date()
      .getFullYear()}-0001`;
  }
}


/* =========================================================
   LOAD QUOTATION SCHEMA
========================================================= */

async function loadQuotationSchemas() {

  try {

    const quotationResult =
      await apiGet(
        "/quotations/schema"
      );

    quotationSchema =
      (
        quotationResult.columns ||
        []
      ).map(
        column =>
          column.COLUMN_NAME
      );

  }

  catch {

    quotationSchema = [];
  }


  try {

    const itemResult =
      await apiGet(
        "/quotation_items/schema"
      );

    quotationItemSchema =
      (
        itemResult.columns ||
        []
      ).map(
        column =>
          column.COLUMN_NAME
      );

  }

  catch {

    quotationItemSchema = [];
  }
}


/* =========================================================
   QUOTATION PAGE
========================================================= */

async function renderQuotations() {

  const request =
    ++pageRequest;

  showLoading(
    "Loading quotations..."
  );

  try {

    const [
      quotations,
      customers,
      products
    ] =
      await Promise.all([
        safeList("quotations"),
        safeList("customers"),
        safeList("products")
      ]);

    if (
      request !== pageRequest
    ) {

      return;
    }

    customersCache =
      customers;

    productsCache =
      products;

    quotationCustomerCache =
      customers;

    quotationProductsCache =
      products;

    renderQuotationList(
      quotations
    );

  }

  catch (error) {

    if (
      request === pageRequest
    ) {

      showError(
        error,
        true
      );
    }
  }
}


/* =========================================================
   QUOTATION LIST
========================================================= */

function renderQuotationList(
  quotations
) {

  const content =
    getContent();

  content.innerHTML = `

    <div
      class="quotation-toolbar">

      <div>

        <h2>
          Quotations
        </h2>

        <p>
          Create, manage and share professional quotations.
        </p>

      </div>

      <button
        type="button"
        class="button-primary"
        id="createQuotationButton">

        + New Quotation

      </button>

    </div>


    <div
      class="quotation-stats">

      <div
        class="quotation-stat">

        <span>
          Total Quotations
        </span>

        <strong>
          ${quotations.length}
        </strong>

      </div>

      <div
        class="quotation-stat">

        <span>
          Total Value
        </span>

        <strong>
          ${formatCurrency(
            quotations.reduce(
              (sum, quote) =>
                sum +
                Number(
                  valueFor(
                    quote,
                    [
                      "grand_total",
                      "total",
                      "amount"
                    ],
                    0
                  )
                ),
              0
            )
          )}
        </strong>

      </div>

    </div>


    <div
      class="panel">

      <div class="panel-header">

        <h2>
          Quotation History
        </h2>

        <input
          id="quotationSearch"
          type="search"
          placeholder="Search quotation...">

      </div>

      <div class="panel-body">

        <div class="table-wrapper">

          <table>

            <thead>

              <tr>

                <th>
                  Quotation No.
                </th>

                <th>
                  Customer
                </th>

                <th>
                  Date
                </th>

                <th>
                  Status
                </th>

                <th>
                  Grand Total
                </th>

                <th>
                  Action
                </th>

              </tr>

            </thead>

            <tbody
              id="quotationListBody">

            </tbody>

          </table>

        </div>

        <div
          id="quotationListEmpty"
          class="empty"
          hidden>

          <div class="empty-icon">
            📄
          </div>

          No quotations found.

        </div>

      </div>

    </div>
  `;


  const draw =
    () => {

      const search =
        (
          content.querySelector(
            "#quotationSearch"
          )?.value ||
          ""
        )
          .trim()
          .toLowerCase();

      const filtered =
        quotations.filter(
          quote => {

            const customer =
              findCustomer(
                quote.customer_id
              );

            const text =
              [
                quote.quotation_number,
                quote.number,
                quote.id,
                quote.status,
                customer?.company_name,
                customer?.contact_person
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return (
              !search ||
              text.includes(search)
            );
          }
        );


      content.querySelector(
        "#quotationListBody"
      ).innerHTML =
        filtered
          .map(
            quote => {

              const customer =
                findCustomer(
                  quote.customer_id
                );

              return `
                <tr>

                  <td>
                    <strong>
                      ${escapeHtml(
                        valueFor(
                          quote,
                          [
                            "quotation_number",
                            "number",
                            "id"
                          ]
                        )
                      )}
                    </strong>
                  </td>

                  <td>

                    ${escapeHtml(
                      valueFor(
                        customer || {},
                        [
                          "company_name",
                          "contact_person",
                          "name"
                        ],
                        "—"
                      )
                    )}

                  </td>

                  <td>
                    ${formatDate(
                      valueFor(
                        quote,
                        [
                          "quotation_date",
                          "date"
                        ],
                        ""
                      )
                    )}
                  </td>

                  <td>
                    ${badge(
                      valueFor(
                        quote,
                        ["status"],
                        "Draft"
                      )
                    )}
                  </td>

                  <td>
                    <strong>
                      ${formatCurrency(
                        valueFor(
                          quote,
                          [
                            "grand_total",
                            "total",
                            "amount"
                          ],
                          0
                        )
                      )}
                    </strong>
                  </td>

                  <td
                    class="table-actions">

                    <button
                      type="button"
                      data-quote-view="${quote.id}">
                      View
                    </button>

                    <button
                      type="button"
                      data-quote-pdf="${quote.id}">
                      PDF
                    </button>

                  </td>

                </tr>
              `;
            }
          )
          .join("");


      content.querySelector(
        "#quotationListEmpty"
      ).hidden =
        filtered.length > 0;
    };


  content
    .querySelector(
      "#createQuotationButton"
    )
    .addEventListener(
      "click",
      () =>
        openQuotationEditor()
    );


  content
    .querySelector(
      "#quotationSearch"
    )
    .addEventListener(
      "input",
      draw
    );


  content
    .querySelector(
      "#quotationListBody"
    )
    .addEventListener(
      "click",
      async event => {

        const viewButton =
          event.target.closest(
            "[data-quote-view]"
          );

        const pdfButton =
          event.target.closest(
            "[data-quote-pdf]"
          );


        if (viewButton) {

          await openSavedQuotation(
            viewButton.dataset.quoteView
          );

        }


        if (pdfButton) {

          await openSavedQuotation(
            pdfButton.dataset.quotePdf,
            true
          );
        }

      }
    );


  draw();
}


/* =========================================================
   CUSTOMER FIND
========================================================= */

function findCustomer(
  id
) {

  return quotationCustomerCache.find(
    customer =>
      String(customer.id) ===
      String(id)
  );
}


function findProduct(
  id
) {

  return quotationProductsCache.find(
    product =>
      String(product.id) ===
      String(id)
  );
}


/* =========================================================
   NEW QUOTATION EDITOR
========================================================= */

async function openQuotationEditor(
  existingQuotation = null,
  existingItems = []
) {

  if (
    !quotationCustomerCache.length
  ) {

    quotationCustomerCache =
      await safeList(
        "customers"
      );
  }


  if (
    !quotationProductsCache.length
  ) {

    quotationProductsCache =
      await safeList(
        "products"
      );
  }


  quotationItems =
    existingItems.map(
      item => ({
        ...item,

        product_id:
          item.product_id ||
          "",

        description:
          item.description ||
          item.name ||
          item.product_name ||
          "",

        quantity:
          Number(
            item.quantity ||
            1
          ),

        rate:
          Number(
            item.rate ||
            item.unit_price ||
            item.price ||
            0
          ),

        discount_percent:
          Number(
            item.discount_percent ||
            0
          )
      })
    );


  const quotationNumber =
    existingQuotation
      ? valueFor(
          existingQuotation,
          [
            "quotation_number",
            "number"
          ],
          ""
        )
      : await generateQuotationNumber();


  const today =
    existingQuotation
      ? String(
          valueFor(
            existingQuotation,
            [
              "quotation_date",
              "date"
            ],
            todayISO()
          )
        ).slice(0, 10)
      : todayISO();


  const customerId =
    existingQuotation
      ? valueFor(
          existingQuotation,
          ["customer_id"],
          ""
        )
      : "";


  const validUntil =
    existingQuotation
      ? String(
          valueFor(
            existingQuotation,
            ["valid_until"],
            ""
          )
        ).slice(0, 10)
      : "";


  const status =
    existingQuotation
      ? valueFor(
          existingQuotation,
          ["status"],
          "Draft"
        )
      : "Draft";


  const notes =
    existingQuotation
      ? valueFor(
          existingQuotation,
          ["notes"],
          ""
        )
      : "";


  const discountPercent =
    existingQuotation
      ? Number(
          valueFor(
            existingQuotation,
            [
              "discount_percent",
              "discount_percentage"
            ],
            0
          )
        )
      : 0;


  const freight =
    existingQuotation
      ? Number(
          valueFor(
            existingQuotation,
            ["freight"],
            0
          )
        )
      : 0;


  const gstPercent =
    existingQuotation
      ? Number(
          valueFor(
            existingQuotation,
            [
              "gst_percent",
              "gst_percentage"
            ],
            18
          )
        )
      : 18;


  const modal =
    openModal(
      existingQuotation
        ? "Edit Quotation"
        : "Create New Quotation",

      `
        <div
          class="quotation-editor">

          <div
            class="quotation-top-card">

            <div>

              <div
                class="quotation-number-label">
                Quotation Number
              </div>

              <div
                class="quotation-number">
                ${escapeHtml(
                  quotationNumber
                )}
              </div>

            </div>

            <div
              class="quotation-status-pill">
              ${escapeHtml(status)}
            </div>

          </div>


          <div
            class="quotation-form-grid">

            <div
              class="quotation-field">

              <label>
                Customer *
              </label>

              <select
                id="quotationCustomer">

                <option value="">
                  Select Customer
                </option>

                ${quotationCustomerCache
                  .map(
                    customer =>
                      `
                        <option
                          value="${customer.id}"
                          ${
                            String(
                              customer.id
                            ) ===
                            String(
                              customerId
                            )
                              ? "selected"
                              : ""
                          }>

                          ${escapeHtml(
                            customer.company_name ||
                            customer.contact_person ||
                            customer.name ||
                            `Customer #${customer.id}`
                          )}

                        </option>
                      `
                  )
                  .join("")}

              </select>

            </div>


            <div
              class="quotation-field">

              <label>
                Quotation Date
              </label>

              <input
                type="date"
                id="quotationDate"
                value="${today}">

            </div>


            <div
              class="quotation-field">

              <label>
                Valid Until
              </label>

              <input
                type="date"
                id="quotationValidUntil"
                value="${validUntil}">

            </div>


            <div
              class="quotation-field">

              <label>
                Status
              </label>

              <select
                id="quotationStatus">

                <option
                  value="Draft"
                  ${
                    status === "Draft"
                      ? "selected"
                      : ""
                  }>
                  Draft
                </option>

                <option
                  value="Quotation Sent"
                  ${
                    status === "Quotation Sent"
                      ? "selected"
                      : ""
                  }>
                  Quotation Sent
                </option>

                <option
                  value="Negotiation"
                  ${
                    status === "Negotiation"
                      ? "selected"
                      : ""
                  }>
                  Negotiation
                </option>

                <option
                  value="Won"
                  ${
                    status === "Won"
                      ? "selected"
                      : ""
                  }>
                  Won
                </option>

                <option
                  value="Lost"
                  ${
                    status === "Lost"
                      ? "selected"
                      : ""
                  }>
                  Lost
                </option>

              </select>

            </div>

          </div>


          <div
            class="quotation-items-card">

            <div
              class="quotation-section-header">

              <div>

                <h3>
                  Quotation Items
                </h3>

                <p>
                  Add products, quantity, rate and item discount.
                </p>

              </div>

              <button
                type="button"
                class="button-primary"
                id="addQuotationItem">

                + Add Item

              </button>

            </div>


            <div
              class="quotation-items-wrapper">

              <table
                class="quotation-items-table">

                <thead>

                  <tr>

                    <th>
                      #
                    </th>

                    <th>
                      Product
                    </th>

                    <th>
                      Description
                    </th>

                    <th>
                      Qty
                    </th>

                    <th>
                      Rate
                    </th>

                    <th>
                      Discount %
                    </th>

                    <th>
                      Amount
                    </th>

                    <th>
                    </th>

                  </tr>

                </thead>

                <tbody
                  id="quotationItemsBody">
                </tbody>

              </table>

            </div>

          </div>


          <div
            class="quotation-bottom-grid">

            <div
              class="quotation-notes-card">

              <h3>
                Notes / Terms
              </h3>

              <textarea
                id="quotationNotes"
                rows="7"
                placeholder="Enter quotation notes, payment terms, delivery terms, etc.">${escapeHtml(
                  notes
                )}</textarea>

            </div>


            <div
              class="quotation-summary-card">

              <h3>
                Quotation Summary
              </h3>


              <div
                class="summary-row">

                <span>
                  Subtotal
                </span>

                <strong
                  id="quotationSubtotal">
                  ₹0.00
                </strong>

              </div>


              <div
                class="summary-input-row">

                <span>
                  Discount %
                </span>

                <input
                  id="quotationDiscountPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value="${discountPercent}">

              </div>


              <div
                class="summary-row">

                <span>
                  Discount Amount
                </span>

                <strong
                  id="quotationDiscountAmount">
                  ₹0.00
                </strong>

              </div>


              <div
                class="summary-input-row">

                <span>
                  Freight
                </span>

                <input
                  id="quotationFreight"
                  type="number"
                  min="0"
                  step="0.01"
                  value="${freight}">

              </div>


              <div
                class="summary-row">

                <span>
                  Taxable Amount
                </span>

                <strong
                  id="quotationTaxable">
                  ₹0.00
                </strong>

              </div>


              <div
                class="summary-input-row">

                <span>
                  GST %
                </span>

                <input
                  id="quotationGstPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value="${gstPercent}">

              </div>


              <div
                class="summary-row">

                <span>
                  GST Amount
                </span>

                <strong
                  id="quotationGstAmount">
                  ₹0.00
                </strong>

              </div>


              <div
                class="summary-grand-total">

                <span>
                  Grand Total
                </span>

                <strong
                  id="quotationGrandTotal">
                  ₹0.00
                </strong>

              </div>

            </div>

          </div>


          <div
            class="quotation-actions">

            <button
              type="button"
              class="button-secondary"
              id="quotationCancel">

              Cancel

            </button>

            <button
              type="button"
              class="button-secondary"
              id="quotationPreview">

              Preview

            </button>

            <button
              type="button"
              class="button-primary"
              id="quotationSave">

              ${
                existingQuotation
                  ? "Update Quotation"
                  : "Save Quotation"
              }

            </button>

          </div>

        </div>
      `,

      "modal-xl"
    );


  modal.host
    .querySelector(
      "#quotationCancel"
    )
    .addEventListener(
      "click",
      modal.close
    );


  modal.host
    .querySelector(
      "#addQuotationItem"
    )
    .addEventListener(
      "click",
      () => {

        addQuotationItemRow();

        calculateQuotation();
      }
    );


  modal.host
    .querySelector(
      "#quotationDiscountPercent"
    )
    .addEventListener(
      "input",
      calculateQuotation
    );


  modal.host
    .querySelector(
      "#quotationFreight"
    )
    .addEventListener(
      "input",
      calculateQuotation
    );


  modal.host
    .querySelector(
      "#quotationGstPercent"
    )
    .addEventListener(
      "input",
      calculateQuotation
    );


  modal.host
    .querySelector(
      "#quotationPreview"
    )
    .addEventListener(
      "click",
      () => {

        previewCurrentQuotation();

      }
    );


  modal.host
    .querySelector(
      "#quotationSave"
    )
    .addEventListener(
      "click",
      async () => {

        await saveQuotation(
          modal,
          existingQuotation
        );

      }
    );


  if (
    quotationItems.length
  ) {

    quotationItems.forEach(
      item =>
        addQuotationItemRow(
          item
        )
    );

  }

  else {

    addQuotationItemRow();

  }


  calculateQuotation();
}


/* =========================================================
   ADD QUOTATION ITEM
========================================================= */

function addQuotationItemRow(
  item = {}
) {

  const body =
    document.getElementById(
      "quotationItemsBody"
    );

  if (!body) return;

  const index =
    body.children.length;


  const productId =
    item.product_id ||
    "";


  const description =
    item.description ||
    "";


  const quantity =
    Number(
      item.quantity ||
      1
    );


  const rate =
    Number(
      item.rate ||
      item.unit_price ||
      item.price ||
      0
    );


  const discountPercent =
    Number(
      item.discount_percent ||
      0
    );


  const row =
    document.createElement(
      "tr"
    );


  row.innerHTML = `

    <td>
      <span
        class="quotation-row-number">
        ${index + 1}
      </span>
    </td>


    <td>

      <select
        class="quotation-product">

        <option value="">
          Select product
        </option>

        ${quotationProductsCache
          .map(
            product =>
              `
                <option
                  value="${product.id}"
                  ${
                    String(
                      product.id
                    ) ===
                    String(
                      productId
                    )
                      ? "selected"
                      : ""
                  }>

                  ${escapeHtml(
                    product.name ||
                    product.product_name ||
                    product.description ||
                    `Product #${product.id}`
                  )}

                </option>
              `
          )
          .join("")}

      </select>

    </td>


    <td>

      <input
        type="text"
        class="quotation-description"
        value="${escapeHtml(
          description
        )}"
        placeholder="Description">

    </td>


    <td>

      <input
        type="number"
        class="quotation-quantity"
        min="0"
        step="0.01"
        value="${quantity}">

    </td>


    <td>

      <input
        type="number"
        class="quotation-rate"
        min="0"
        step="0.01"
        value="${rate}">

    </td>


    <td>

      <input
        type="number"
        class="quotation-item-discount"
        min="0"
        max="100"
        step="0.01"
        value="${discountPercent}">

    </td>


    <td>

      <strong
        class="quotation-item-amount">
        ₹0.00
      </strong>

    </td>


    <td>

      <button
        type="button"
        class="quotation-remove-item"
        title="Remove item">

        ×

      </button>

    </td>

  `;


  body.appendChild(
    row
  );


  const productSelect =
    row.querySelector(
      ".quotation-product"
    );


  productSelect.addEventListener(
    "change",
    () => {

      const product =
        findProduct(
          productSelect.value
        );

      if (!product) return;


      const descriptionInput =
        row.querySelector(
          ".quotation-description"
        );


      const rateInput =
        row.querySelector(
          ".quotation-rate"
        );


      if (
        !descriptionInput.value
      ) {

        descriptionInput.value =
          product.description ||
          product.name ||
          product.product_name ||
          "";
      }


      if (
        !Number(
          rateInput.value
        )
      ) {

        rateInput.value =
          Number(
            product.selling_price ||
            product.price ||
            0
          );
      }


      calculateQuotation();
    }
  );


  row
    .querySelectorAll(
      "input"
    )
    .forEach(
      input =>
        input.addEventListener(
          "input",
          calculateQuotation
        )
    );


  row
    .querySelector(
      ".quotation-remove-item"
    )
    .addEventListener(
      "click",
      () => {

        row.remove();

        refreshQuotationRowNumbers();

        calculateQuotation();

      }
    );


  calculateQuotation();
}


/* =========================================================
   REFRESH ITEM NUMBERS
========================================================= */

function refreshQuotationRowNumbers() {

  document
    .querySelectorAll(
      "#quotationItemsBody tr"
    )
    .forEach(
      (row, index) => {

        const number =
          row.querySelector(
            ".quotation-row-number"
          );

        if (number) {

          number.textContent =
            index + 1;
        }
      }
    );
}


/* =========================================================
   READ QUOTATION ITEMS
========================================================= */

function readQuotationItems() {

  return [
    ...document.querySelectorAll(
      "#quotationItemsBody tr"
    )
  ]
    .map(
      row => {

        const productId =
          row.querySelector(
            ".quotation-product"
          )?.value || "";


        const description =
          row.querySelector(
            ".quotation-description"
          )?.value.trim() || "";


        const quantity =
          Number(
            row.querySelector(
              ".quotation-quantity"
            )?.value || 0
          );


        const rate =
          Number(
            row.querySelector(
              ".quotation-rate"
            )?.value || 0
          );


        const discountPercent =
          Number(
            row.querySelector(
              ".quotation-item-discount"
            )?.value || 0
          );


        const gross =
          quantity * rate;


        const discountAmount =
          gross *
          discountPercent /
          100;


        const amount =
          gross -
          discountAmount;


        return {

          product_id:
            productId
              ? Number(
                  productId
                )
              : null,

          description,

          quantity,

          rate,

          discount_percent:
            discountPercent,

          discount_amount:
            discountAmount,

          amount

        };
      }
    )
    .filter(
      item =>
        item.description ||
        item.product_id ||
        item.rate
    );
}


/* =========================================================
   CALCULATE QUOTATION
========================================================= */

function calculateQuotation() {

  const items =
    readQuotationItems();


  const subtotal =
    items.reduce(
      (sum, item) =>
        sum +
        (
          Number(
            item.quantity
          ) *
          Number(
            item.rate
          )
        ),
      0
    );


  const discountPercent =
    Number(
      document.getElementById(
        "quotationDiscountPercent"
      )?.value || 0
    );


  const discountAmount =
    subtotal *
    discountPercent /
    100;


  const afterDiscount =
    subtotal -
    discountAmount;


  const freight =
    Number(
      document.getElementById(
        "quotationFreight"
      )?.value || 0
    );


  /*
    IMPORTANT:
    Freight is added BEFORE GST.
  */

  const taxableAmount =
    afterDiscount +
    freight;


  const gstPercent =
    Number(
      document.getElementById(
        "quotationGstPercent"
      )?.value || 0
    );


  const gstAmount =
    taxableAmount *
    gstPercent /
    100;


  const grandTotal =
    taxableAmount +
    gstAmount;


  setText(
    "quotationSubtotal",
    formatCurrency(
      subtotal
    )
  );


  setText(
    "quotationDiscountAmount",
    formatCurrency(
      discountAmount
    )
  );


  setText(
    "quotationTaxable",
    formatCurrency(
      taxableAmount
    )
  );


  setText(
    "quotationGstAmount",
    formatCurrency(
      gstAmount
    )
  );


  setText(
    "quotationGrandTotal",
    formatCurrency(
      grandTotal
    )
  );


  document
    .querySelectorAll(
      "#quotationItemsBody tr"
    )
    .forEach(
      row => {

        const quantity =
          Number(
            row.querySelector(
              ".quotation-quantity"
            )?.value || 0
          );


        const rate =
          Number(
            row.querySelector(
              ".quotation-rate"
            )?.value || 0
          );


        const itemDiscount =
          Number(
            row.querySelector(
              ".quotation-item-discount"
            )?.value || 0
          );


        const gross =
          quantity *
          rate;


        const discount =
          gross *
          itemDiscount /
          100;


        const amount =
          gross -
          discount;


        const amountEl =
          row.querySelector(
            ".quotation-item-amount"
          );


        if (amountEl) {

          amountEl.textContent =
            formatCurrency(
              amount
            );
        }
      }
    );


  return {

    items,

    subtotal,

    discountPercent,

    discountAmount,

    freight,

    taxableAmount,

    gstPercent,

    gstAmount,

    grandTotal

  };
}


function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );

  if (element) {

    element.textContent =
      value;
  }
}


/* =========================================================
   SAVE QUOTATION
========================================================= */

async function saveQuotation(
  modal,
  existingQuotation
) {

  const customerId =
    document.getElementById(
      "quotationCustomer"
    )?.value;


  if (!customerId) {

    notify(
      "Please select a customer.",
      "error"
    );

    return;
  }


  const items =
    readQuotationItems();


  if (!items.length) {

    notify(
      "Please add at least one quotation item.",
      "error"
    );

    return;
  }


  for (
    const item of items
  ) {

    if (
      item.quantity <= 0
    ) {

      notify(
        "Quantity must be greater than zero.",
        "error"
      );

      return;
    }

    if (
      item.rate < 0
    ) {

      notify(
        "Rate cannot be negative.",
        "error"
      );

      return;
    }
  }


  const calculation =
    calculateQuotation();


  const quotationNumber =
    existingQuotation
      ? valueFor(
          existingQuotation,
          [
            "quotation_number",
            "number"
          ],
          ""
        )
      : await generateQuotationNumber();


  const quotationDate =
    document.getElementById(
      "quotationDate"
    )?.value ||
    todayISO();


  const validUntil =
    document.getElementById(
      "quotationValidUntil"
    )?.value ||
    null;


  const status =
    document.getElementById(
      "quotationStatus"
    )?.value ||
    "Draft";


  const notes =
    document.getElementById(
      "quotationNotes"
    )?.value.trim() ||
    "";


  /*
    Build quotation payload.

    We send common field names used by the
    CRM quotation table.
  */

  const payload = {

    quotation_number:
      quotationNumber,

    customer_id:
      Number(customerId),

    quotation_date:
      quotationDate,

    valid_until:
      validUntil,

    status,

    subtotal:
      calculation.subtotal,

    discount_percent:
      calculation.discountPercent,

    discount_amount:
      calculation.discountAmount,

    freight:
      calculation.freight,

    taxable_amount:
      calculation.taxableAmount,

    gst_percent:
      calculation.gstPercent,

    gst_amount:
      calculation.gstAmount,

    grand_total:
      calculation.grandTotal,

    notes

  };


  /*
    If database schema is known,
    remove fields that do not exist.
  */

  const safeQuotationPayload =
    await filterPayloadBySchema(
      "quotations",
      payload
    );


  try {

    let quotationId;


    if (existingQuotation) {

      quotationId =
        existingQuotation.id;

      await apiPut(
        `/quotations/${quotationId}`,
        safeQuotationPayload
      );

    }

    else {

      const result =
        await apiPost(
          "/quotations",
          safeQuotationPayload
        );

      quotationId =
        result.id;
    }


    /*
      For new quotation:
      create quotation items.

      For editing:
      current server.js doesn't expose
      DELETE quotation items by quotation,
      therefore only add items if this is
      a new quotation.
    */

    if (!existingQuotation) {

      for (
        const item of items
      ) {

        await saveQuotationItem(
          quotationId,
          item
        );
      }

    }


    modal.close();


    showQuotationSavedScreen(
      quotationId,
      quotationNumber,
      calculation
    );


  }

  catch (error) {

    console.error(
      "SAVE QUOTATION ERROR:",
      error
    );

    notify(
      error.message,
      "error"
    );
  }
}


/* =========================================================
   FILTER PAYLOAD BY DATABASE SCHEMA
========================================================= */

async function filterPayloadBySchema(
  table,
  payload
) {

  let schema = [];

  try {

    const result =
      await apiGet(
        `/${table}/schema`
      );

    schema =
      (
        result.columns ||
        []
      ).map(
        column =>
          column.COLUMN_NAME
      );

  }

  catch {

    /*
      If schema cannot be loaded,
      return payload as-is.
    */

    return payload;
  }


  if (!schema.length) {

    return payload;
  }


  const filtered = {};

  Object.entries(
    payload
  ).forEach(
    ([key, value]) => {

      if (
        schema.includes(key)
      ) {

        filtered[key] =
          value;
      }
    }
  );


  /*
    quotation_number is important.
    If the database has it, make sure
    it is included.
  */

  return filtered;
}


/* =========================================================
   SAVE QUOTATION ITEM
========================================================= */

async function saveQuotationItem(
  quotationId,
  item
) {

  const payload = {

    quotation_id:
      Number(quotationId),

    product_id:
      item.product_id,

    description:
      item.description,

    quantity:
      item.quantity,

    rate:
      item.rate,

    discount_percent:
      item.discount_percent,

    discount_amount:
      item.discount_amount,

    amount:
      item.amount

  };


  const safePayload =
    await filterPayloadBySchema(
      "quotation_items",
      payload
    );


  /*
    Server already has:
    POST /api/quotations/:id/items
  */

  return apiPost(
    `/quotations/${quotationId}/items`,
    safePayload
  );
}


/* =========================================================
   QUOTATION SAVED SCREEN
========================================================= */

function showQuotationSavedScreen(
  quotationId,
  quotationNumber,
  calculation
) {

  const content =
    getContent();


  content.innerHTML = `

    <div
      class="quotation-success-page">

      <div
        class="quotation-success-icon">

        ✓

      </div>


      <h1>
        Your quotation is saved
      </h1>


      <p>
        Quotation
        <strong>
          ${escapeHtml(
            quotationNumber
          )}
        </strong>
        has been saved successfully.
      </p>


      <div
        class="quotation-success-total">

        ${formatCurrency(
          calculation.grandTotal
        )}

      </div>


      <div
        class="quotation-success-actions">

        <button
          type="button"
          class="button-primary"
          id="savedNewQuotation">

          + New Quotation

        </button>


        <button
          type="button"
          class="button-secondary"
          id="savedViewQuotation">

          View Quotation

        </button>


        <button
          type="button"
          class="button-secondary"
          id="savedPdfQuotation">

          Save PDF

        </button>


        <button
          type="button"
          class="whatsapp-button"
          id="savedWhatsappQuotation">

          WhatsApp

        </button>

      </div>

    </div>
  `;


  content
    .querySelector(
      "#savedNewQuotation"
    )
    .addEventListener(
      "click",
      () =>
        openQuotationEditor()
    );


  content
    .querySelector(
      "#savedViewQuotation"
    )
    .addEventListener(
      "click",
      async () =>
        openSavedQuotation(
          quotationId
        )
    );


  content
    .querySelector(
      "#savedPdfQuotation"
    )
    .addEventListener(
      "click",
      async () =>
        openSavedQuotation(
          quotationId,
          true
        )
    );


  content
    .querySelector(
      "#savedWhatsappQuotation"
    )
    .addEventListener(
      "click",
      async () =>
        shareQuotationWhatsApp(
          quotationId
        )
    );
}


/* =========================================================
   LOAD SAVED QUOTATION
========================================================= */

async function loadQuotationDetails(
  quotationId
) {

  const result =
    await apiGet(
      `/quotations/${quotationId}/details`
    );

  return {

    quotation:
      result.quotation,

    items:
      result.items || []

  };
}


/* =========================================================
   OPEN SAVED QUOTATION
========================================================= */

async function openSavedQuotation(
  quotationId,
  autoPrint = false
) {

  try {

    const {
      quotation,
      items
    } =
      await loadQuotationDetails(
        quotationId
      );


    renderQuotationPreview(
      quotation,
      items
    );


    if (autoPrint) {

      setTimeout(
        () => {
          window.print();
        },
        500
      );
    }

  }

  catch (error) {

    notify(
      error.message,
      "error"
    );
  }
}


/* =========================================================
   PREVIEW CURRENT QUOTATION
========================================================= */

function previewCurrentQuotation() {

  const calculation =
    calculateQuotation();


  const customerId =
    document.getElementById(
      "quotationCustomer"
    )?.value;


  const customer =
    findCustomer(
      customerId
    );


  const quote = {

    id: null,

    quotation_number:
      document.querySelector(
        ".quotation-number"
      )?.textContent.trim() ||
      "DRAFT",

    customer_id:
      customerId,

    quotation_date:
      document.getElementById(
        "quotationDate"
      )?.value ||
      todayISO(),

    valid_until:
      document.getElementById(
        "quotationValidUntil"
      )?.value ||
      "",

    status:
      document.getElementById(
        "quotationStatus"
      )?.value ||
      "Draft",

    discount_percent:
      calculation.discountPercent,

    discount_amount:
      calculation.discountAmount,

    freight:
      calculation.freight,

    taxable_amount:
      calculation.taxableAmount,

    gst_percent:
      calculation.gstPercent,

    gst_amount:
      calculation.gstAmount,

    grand_total:
      calculation.grandTotal,

    notes:
      document.getElementById(
        "quotationNotes"
      )?.value ||
      ""

  };


  renderQuotationPreview(
    quote,
    readQuotationItems(),
    customer
  );
}


/* =========================================================
   QUOTATION PREVIEW
========================================================= */

function renderQuotationPreview(
  quotation,
  items,
  suppliedCustomer = null
) {

  const customer =
    suppliedCustomer ||
    findCustomer(
      quotation.customer_id
    );


  const customerName =
    customer
      ? (
          customer.company_name ||
          customer.contact_person ||
          customer.name ||
          `Customer #${customer.id}`
        )
      : "Customer";


  const customerAddress =
    customer
      ? valueFor(
          customer,
          [
            "address",
            "city"
          ],
          ""
        )
      : "";


  const customerMobile =
    customer
      ? valueFor(
          customer,
          ["mobile", "phone"],
          ""
        )
      : "";


  const customerGST =
    customer
      ? valueFor(
          customer,
          [
            "gst_number",
            "gstin",
            "gst"
          ],
          ""
        )
      : "";


  const modal =
    openModal(
      "Quotation Preview",

      `
        <div
          id="quotationPrintArea"
          class="quotation-print-area">

          <div
            class="print-company-header">

            <div>

              <h1>
                MAHALAXMI
              </h1>

              <h2>
                COMBUSTION
              </h2>

              <p>
                Industrial Combustion & Automation Solutions
              </p>

            </div>

            <div
              class="print-quotation-heading">

              <strong>
                QUOTATION
              </strong>

              <span>
                ${escapeHtml(
                  valueFor(
                    quotation,
                    [
                      "quotation_number",
                      "number",
                      "id"
                    ],
                    "DRAFT"
                  )
                )}
              </span>

            </div>

          </div>


          <div
            class="print-meta-grid">

            <div>

              <strong>
                Bill To
              </strong>

              <p>
                ${escapeHtml(
                  customerName
                )}
              </p>

              ${
                customerAddress
                  ? `<p>${escapeHtml(
                      customerAddress
                    )}</p>`
                  : ""
              }

              ${
                customerMobile
                  ? `<p>Mobile: ${escapeHtml(
                      customerMobile
                    )}</p>`
                  : ""
              }

              ${
                customerGST
                  ? `<p>GSTIN: ${escapeHtml(
                      customerGST
                    )}</p>`
                  : ""
              }

            </div>


            <div>

              <p>

                <strong>
                  Quotation Date:
                </strong>

                ${formatDate(
                  quotation.quotation_date
                )}

              </p>

              ${
                quotation.valid_until
                  ? `
                    <p>

                      <strong>
                        Valid Until:
                      </strong>

                      ${formatDate(
                        quotation.valid_until
                      )}

                    </p>
                  `
                  : ""
              }

              <p>

                <strong>
                  Status:
                </strong>

                ${escapeHtml(
                  quotation.status ||
                  "Draft"
                )}

              </p>

            </div>

          </div>


          <table
            class="print-items-table">

            <thead>

              <tr>

                <th>
                  #
                </th>

                <th>
                  Description
                </th>

                <th>
                  Qty
                </th>

                <th>
                  Rate
                </th>

                <th>
                  Discount
                </th>

                <th>
                  Amount
                </th>

              </tr>

            </thead>

            <tbody>

              ${
                items.length
                  ? items
                      .map(
                        (item, index) => {

                          const quantity =
                            Number(
                              item.quantity ||
                              0
                            );

                          const rate =
                            Number(
                              item.rate ||
                              item.unit_price ||
                              item.price ||
                              0
                            );

                          const itemDiscount =
                            Number(
                              item.discount_percent ||
                              0
                            );

                          const gross =
                            quantity *
                            rate;

                          const discount =
                            gross *
                            itemDiscount /
                            100;

                          const amount =
                            Number(
                              item.amount ??
                              gross -
                                discount
                            );

                          return `
                            <tr>

                              <td>
                                ${index + 1}
                              </td>

                              <td>

                                ${escapeHtml(
                                  item.description ||
                                  item.name ||
                                  item.product_name ||
                                  ""
                                )}

                              </td>

                              <td>
                                ${formatNumber(
                                  quantity
                                )}
                              </td>

                              <td>
                                ${formatCurrency(
                                  rate
                                )}
                              </td>

                              <td>
                                ${formatNumber(
                                  itemDiscount
                                )}%
                              </td>

                              <td>
                                ${formatCurrency(
                                  amount
                                )}
                              </td>

                            </tr>
                          `;
                        }
                      )
                      .join("")
                  : `
                    <tr>
                      <td colspan="6">
                        No items
                      </td>
                    </tr>
                  `
              }

            </tbody>

          </table>


          <div
            class="print-summary-area">

            <div
              class="print-notes">

              ${
                quotation.notes
                  ? `
                    <strong>
                      Notes / Terms
                    </strong>

                    <p>
                      ${escapeHtml(
                        quotation.notes
                      ).replace(
                        /\n/g,
                        "<br>"
                      )}
                    </p>
                  `
                  : ""
              }

            </div>


            <div
              class="print-total-box">

              <div>
                <span>
                  Subtotal
                </span>

                <strong>
                  ${formatCurrency(
                    quotation.subtotal ??
                    items.reduce(
                      (sum, item) =>
                        sum +
                        Number(
                          item.amount ||
                          0
                        ),
                      0
                    )
                  )}
                </strong>
              </div>


              <div>
                <span>
                  Discount
                  ${
                    quotation.discount_percent != null
                      ? `(${formatNumber(
                          quotation.discount_percent
                        )}%)`
                      : ""
                  }
                </span>

                <strong>
                  - ${formatCurrency(
                    quotation.discount_amount ||
                    0
                  )}
                </strong>
              </div>


              <div>
                <span>
                  Freight
                </span>

                <strong>
                  ${formatCurrency(
                    quotation.freight ||
                    0
                  )}
                </strong>
              </div>


              <div>
                <span>
                  Taxable Amount
                </span>

                <strong>
                  ${formatCurrency(
                    quotation.taxable_amount ||
                    0
                  )}
                </strong>
              </div>


              <div>
                <span>
                  GST
                  ${
                    quotation.gst_percent != null
                      ? `(${formatNumber(
                          quotation.gst_percent
                        )}%)`
                      : ""
                  }
                </span>

                <strong>
                  ${formatCurrency(
                    quotation.gst_amount ||
                    0
                  )}
                </strong>
              </div>


              <div
                class="print-grand-total">

                <span>
                  Grand Total
                </span>

                <strong>
                  ${formatCurrency(
                    quotation.grand_total ||
                    0
                  )}
                </strong>

              </div>

            </div>

          </div>


          <div
            class="print-footer">

            <div>
              Thank you for your business.
            </div>

            <div>
              For MAHALAXMI COMBUSTION
            </div>

          </div>

        </div>


        <div
          class="quotation-preview-actions">

          <button
            type="button"
            class="button-secondary"
            id="previewClose">

            Close

          </button>

          <button
            type="button"
            class="button-secondary"
            id="previewPrint">

            Print / Save PDF

          </button>

          <button
            type="button"
            class="whatsapp-button"
            id="previewWhatsApp">

            Share on WhatsApp

          </button>

        </div>
      `,

      "modal-xl"
    );


  modal.host
    .querySelector(
      "#previewClose"
    )
    .addEventListener(
      "click",
      modal.close
    );


  modal.host
    .querySelector(
      "#previewPrint"
    )
    .addEventListener(
      "click",
      () => {

        printQuotation(
          quotation
        );
      }
    );


  modal.host
    .querySelector(
      "#previewWhatsApp"
    )
    .addEventListener(
      "click",
      () => {

        shareQuotationWhatsAppData(
          quotation,
          customer
        );
      }
    );
}


/* =========================================================
   PRINT / PDF
========================================================= */

function printQuotation(
  quotation
) {

  const printArea =
    document.getElementById(
      "quotationPrintArea"
    );

  if (!printArea) {

    notify(
      "Quotation preview is not available.",
      "error"
    );

    return;
  }


  const printWindow =
    window.open(
      "",
      "_blank"
    );


  if (!printWindow) {

    notify(
      "Please allow popups to print the quotation.",
      "error"
    );

    return;
  }


  printWindow.document.write(`
    <!DOCTYPE html>

    <html>

      <head>

        <meta charset="UTF-8">

        <title>
          ${escapeHtml(
            valueFor(
              quotation,
              [
                "quotation_number",
                "number",
                "id"
              ],
              "Quotation"
            )
          )}
        </title>

        <style>

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 30px;
            font-family: Arial, sans-serif;
            color: #222;
            background: white;
          }

          .print-company-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #222;
            padding-bottom: 18px;
            margin-bottom: 20px;
          }

          .print-company-header h1 {
            margin: 0;
            font-size: 30px;
          }

          .print-company-header h2 {
            margin: 2px 0;
            font-size: 22px;
          }

          .print-company-header p {
            margin: 5px 0;
          }

          .print-quotation-heading {
            text-align: right;
          }

          .print-quotation-heading strong {
            display: block;
            font-size: 25px;
          }

          .print-quotation-heading span {
            display: block;
            margin-top: 5px;
            font-size: 16px;
          }

          .print-meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 25px;
          }

          .print-meta-grid p {
            margin: 5px 0;
          }

          .print-items-table {
            width: 100%;
            border-collapse: collapse;
          }

          .print-items-table th,
          .print-items-table td {
            border: 1px solid #bbb;
            padding: 9px;
            text-align: left;
          }

          .print-items-table th {
            background: #f2f2f2;
          }

          .print-items-table th:nth-child(3),
          .print-items-table th:nth-child(4),
          .print-items-table th:nth-child(5),
          .print-items-table th:nth-child(6),
          .print-items-table td:nth-child(3),
          .print-items-table td:nth-child(4),
          .print-items-table td:nth-child(5),
          .print-items-table td:nth-child(6) {
            text-align: right;
          }

          .print-summary-area {
            display: grid;
            grid-template-columns: 1fr 380px;
            gap: 30px;
            margin-top: 25px;
          }

          .print-total-box {
            border: 1px solid #aaa;
          }

          .print-total-box > div {
            display: flex;
            justify-content: space-between;
            padding: 9px 12px;
            border-bottom: 1px solid #ddd;
          }

          .print-grand-total {
            font-size: 18px;
            border-bottom: none !important;
            border-top: 2px solid #222;
          }

          .print-footer {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            border-top: 1px solid #ccc;
            padding-top: 15px;
          }

          @media print {

            body {
              padding: 0;
            }

          }

        </style>

      </head>

      <body>

        ${printArea.innerHTML}

        <script>

          window.onload = function() {

            window.print();

          };

        <\/script>

      </body>

    </html>
  `);


  printWindow.document.close();
}


/* =========================================================
   WHATSAPP
========================================================= */

async function shareQuotationWhatsApp(
  quotationId
) {

  try {

    const {
      quotation
    } =
      await loadQuotationDetails(
        quotationId
      );


    const customer =
      findCustomer(
        quotation.customer_id
      );


    shareQuotationWhatsAppData(
      quotation,
      customer
    );

  }

  catch (error) {

    notify(
      error.message,
      "error"
    );
  }
}


function shareQuotationWhatsAppData(
  quotation,
  customer
) {

  const customerName =
    customer
      ? (
          customer.company_name ||
          customer.contact_person ||
          customer.name ||
          "Customer"
        )
      : "Customer";


  const quotationNumber =
    valueFor(
      quotation,
      [
        "quotation_number",
        "number",
        "id"
      ],
      ""
    );


  const total =
    formatCurrency(
      quotation.grand_total ||
      0
    );


  const text =
    `Dear ${customerName},

Please find our quotation.

Quotation No: ${quotationNumber}

Quotation Date: ${formatDate(
      quotation.quotation_date
    )}

Grand Total: ${total}

Thank you.

MAHALAXMI COMBUSTION`;


  const url =
    `https://wa.me/?text=${encodeURIComponent(
      text
    )}`;


  window.open(
    url,
    "_blank"
  );
}


/* =========================================================
   SIMPLE TABLE
========================================================= */

async function renderSimpleTable(
  table,
  title = null
) {

  return renderEntityPage(
    table,
    {
      search: true
    }
  );
}


/* =========================================================
   PAGE ROUTING
========================================================= */

async function showPage(
  page
) {

  page =
    PAGE_INFO[page]
      ? page
      : "dashboard";


  currentPage =
    page;


  updatePageHeader(
    page
  );


  pageRequest++;


  document
    .querySelectorAll(
      "[data-page]"
    )
    .forEach(
      el =>
        el.classList.toggle(
          "active",
          el.dataset.page ===
            page
        )
    );


  const renderer = {

    dashboard:
      renderDashboard,

    customers:
      renderCustomers,

    products:
      renderProducts,

    enquiries:
      renderEnquiries,

    quotations:
      renderQuotations

  }[page];


  if (renderer) {

    return renderer();
  }


  return renderSimpleTable(
    page,
    PAGE_INFO[page].title
  );
}


/* =========================================================
   NAVIGATION
========================================================= */

function pageFromNavigation(
  element
) {

  if (
    element.dataset.page
  ) {

    return element.dataset.page;
  }


  const href =
    element.getAttribute(
      "href"
    ) || "";


  const hash =
    href.match(
      /#([a-z]+)/i
    )?.[1];


  if (
    hash &&
    PAGE_INFO[hash]
  ) {

    return hash;
  }


  const text =
    element.textContent
      .trim()
      .toLowerCase()
      .replace(
        /\s+/g,
        ""
      );


  return Object.keys(
    PAGE_INFO
  ).find(
    page =>
      text.includes(
        page.replace(
          "followups",
          "follow-up"
        )
      )
  );
}


/* =========================================================
   EXTRA UI STYLES
========================================================= */

function ensureCrmUiStyles() {

  if (
    document.getElementById(
      "crmUiStyles"
    )
  ) {

    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "crmUiStyles";


  style.textContent = `

    /* =====================================================
       GENERAL
    ===================================================== */

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin: 0 0 20px;
    }

    .toolbar-left {
      display: flex;
      flex: 1;
      gap: 10px;
      flex-wrap: wrap;
    }

    .toolbar input,
    .toolbar select,
    .form-grid input,
    .form-grid select,
    .form-grid textarea {
      box-sizing: border-box;
    }


    /* =====================================================
       QUOTATION TOOLBAR
    ===================================================== */

    .quotation-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 22px;
    }

    .quotation-toolbar h2 {
      margin: 0 0 5px;
      font-size: 26px;
    }

    .quotation-toolbar p {
      margin: 0;
      color: #6b7280;
    }


    /* =====================================================
       QUOTATION STATS
    ===================================================== */

    .quotation-stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    .quotation-stat {
      padding: 20px;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      background: #fff;
    }

    .quotation-stat span {
      display: block;
      color: #6b7280;
      font-size: 13px;
      margin-bottom: 8px;
    }

    .quotation-stat strong {
      display: block;
      font-size: 25px;
    }


    /* =====================================================
       QUOTATION EDITOR
    ===================================================== */

    .quotation-editor {
      width: 100%;
    }

    .quotation-top-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-radius: 14px;
      margin-bottom: 20px;
      background: #f7f8fa;
      border: 1px solid #e5e7eb;
    }

    .quotation-number-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: .06em;
      margin-bottom: 5px;
    }

    .quotation-number {
      font-size: 25px;
      font-weight: 800;
    }

    .quotation-status-pill {
      padding: 8px 14px;
      border-radius: 999px;
      background: #e8f0ff;
      font-weight: 700;
      font-size: 13px;
    }


    /* =====================================================
       QUOTATION FORM
    ===================================================== */

    .quotation-form-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }

    .quotation-field {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .quotation-field label {
      font-size: 13px;
      font-weight: 700;
    }

    .quotation-field input,
    .quotation-field select {
      width: 100%;
      min-height: 42px;
      border: 1px solid #d7dbe2;
      border-radius: 9px;
      padding: 8px 11px;
      background: white;
    }


    /* =====================================================
       ITEMS CARD
    ===================================================== */

    .quotation-items-card {
      border: 1px solid #e2e5e9;
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 20px;
      background: white;
    }

    .quotation-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
      padding: 18px 20px;
      border-bottom: 1px solid #e5e7eb;
    }

    .quotation-section-header h3 {
      margin: 0 0 4px;
    }

    .quotation-section-header p {
      margin: 0;
      color: #6b7280;
      font-size: 13px;
    }

    .quotation-items-wrapper {
      overflow-x: auto;
    }

    .quotation-items-table {
      width: 100%;
      min-width: 950px;
      border-collapse: collapse;
    }

    .quotation-items-table th {
      text-align: left;
      padding: 11px;
      background: #f7f8fa;
      border-bottom: 1px solid #ddd;
      font-size: 12px;
      white-space: nowrap;
    }

    .quotation-items-table td {
      padding: 8px;
      border-bottom: 1px solid #eee;
      vertical-align: middle;
    }

    .quotation-items-table input,
    .quotation-items-table select {
      width: 100%;
      min-height: 38px;
      border: 1px solid #d7dbe2;
      border-radius: 7px;
      padding: 7px 8px;
      box-sizing: border-box;
    }

    .quotation-items-table th:nth-child(1),
    .quotation-items-table td:nth-child(1) {
      width: 40px;
      text-align: center;
    }

    .quotation-items-table th:nth-child(4),
    .quotation-items-table td:nth-child(4) {
      width: 80px;
    }

    .quotation-items-table th:nth-child(5),
    .quotation-items-table td:nth-child(5) {
      width: 120px;
    }

    .quotation-items-table th:nth-child(6),
    .quotation-items-table td:nth-child(6) {
      width: 120px;
    }

    .quotation-items-table th:nth-child(7),
    .quotation-items-table td:nth-child(7) {
      width: 130px;
      text-align: right;
    }

    .quotation-row-number {
      font-weight: 700;
    }

    .quotation-remove-item {
      width: 34px;
      height: 34px;
      border: 0;
      border-radius: 7px;
      cursor: pointer;
      font-size: 20px;
    }


    /* =====================================================
       SUMMARY
    ===================================================== */

    .quotation-bottom-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 420px;
      gap: 20px;
      margin-bottom: 20px;
    }

    .quotation-notes-card,
    .quotation-summary-card {
      border: 1px solid #e2e5e9;
      border-radius: 14px;
      padding: 20px;
      background: white;
    }

    .quotation-notes-card h3,
    .quotation-summary-card h3 {
      margin: 0 0 15px;
    }

    .quotation-notes-card textarea {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #d7dbe2;
      border-radius: 9px;
      padding: 10px;
      resize: vertical;
    }

    .summary-row,
    .summary-input-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }

    .summary-input-row input {
      width: 120px;
      min-height: 36px;
      border: 1px solid #d7dbe2;
      border-radius: 7px;
      padding: 6px 9px;
      text-align: right;
    }

    .summary-grand-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      padding-top: 15px;
      border-top: 2px solid #222;
      font-size: 20px;
      font-weight: 800;
    }


    /* =====================================================
       QUOTATION ACTIONS
    ===================================================== */

    .quotation-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 10px;
    }

    .quotation-success-page {
      max-width: 750px;
      margin: 50px auto;
      text-align: center;
      padding: 50px 30px;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      background: white;
    }

    .quotation-success-icon {
      width: 70px;
      height: 70px;
      margin: 0 auto 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      font-weight: 800;
      background: #e8f7ed;
    }

    .quotation-success-page h1 {
      margin: 0 0 10px;
    }

    .quotation-success-page p {
      color: #6b7280;
    }

    .quotation-success-total {
      font-size: 32px;
      font-weight: 800;
      margin: 25px 0;
    }

    .quotation-success-actions {
      display: flex;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .whatsapp-button {
      border: 0;
      padding: 10px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 700;
      background: #25D366;
      color: white;
    }


    /* =====================================================
       PREVIEW
    ===================================================== */

    .quotation-print-area {
      background: white;
      color: #222;
      padding: 25px;
      border: 1px solid #ddd;
    }

    .print-company-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #222;
      padding-bottom: 18px;
      margin-bottom: 20px;
    }

    .print-company-header h1 {
      margin: 0;
      font-size: 28px;
    }

    .print-company-header h2 {
      margin: 2px 0;
      font-size: 21px;
    }

    .print-company-header p {
      margin: 5px 0;
      color: #555;
    }

    .print-quotation-heading {
      text-align: right;
    }

    .print-quotation-heading strong {
      display: block;
      font-size: 24px;
    }

    .print-quotation-heading span {
      display: block;
      margin-top: 5px;
    }

    .print-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 25px;
      margin-bottom: 25px;
    }

    .print-meta-grid p {
      margin: 5px 0;
    }

    .print-items-table {
      width: 100%;
      border-collapse: collapse;
    }

    .print-items-table th,
    .print-items-table td {
      border: 1px solid #ccc;
      padding: 8px;
    }

    .print-items-table th {
      background: #f5f5f5;
    }

    .print-summary-area {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 25px;
      margin-top: 25px;
    }

    .print-total-box {
      border: 1px solid #aaa;
    }

    .print-total-box > div {
      display: flex;
      justify-content: space-between;
      padding: 8px 11px;
      border-bottom: 1px solid #ddd;
    }

    .print-grand-total {
      border-top: 2px solid #222;
      border-bottom: none !important;
      font-size: 18px;
      font-weight: 800;
    }

    .print-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #ccc;
    }

    .quotation-preview-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 15px;
    }


    /* =====================================================
       RESPONSIVE
    ===================================================== */

    @media (max-width: 1000px) {

      .quotation-form-grid {
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
      }

      .quotation-bottom-grid {
        grid-template-columns: 1fr;
      }

    }


    @media (max-width: 650px) {

      .quotation-toolbar,
      .quotation-top-card {
        flex-direction: column;
        align-items: stretch;
      }

      .quotation-form-grid {
        grid-template-columns: 1fr;
      }

      .quotation-stats {
        grid-template-columns: 1fr;
      }

      .print-meta-grid,
      .print-summary-area {
        grid-template-columns: 1fr;
      }

    }


    /* =====================================================
       PRINT
    ===================================================== */

    @media print {

      body * {
        visibility: hidden !important;
      }

      #quotationPrintArea,
      #quotationPrintArea * {
        visibility: visible !important;
      }

      #quotationPrintArea {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        border: 0;
      }

    }

  `;


  document.head.appendChild(
    style
  );
}


/* =========================================================
   APP INITIALIZATION
========================================================= */

function initCrmApp() {

  ensureCrmUiStyles();


  /*
    Navigation links.
  */

  document
    .querySelectorAll(
      "[data-page]"
    )
    .forEach(
      element => {

        element.addEventListener(
          "click",
          event => {

            /*
              Only intercept CRM navigation.
            */

            const page =
              element.dataset.page;

            if (
              PAGE_INFO[page]
            ) {

              event.preventDefault();

              showPage(page);
            }

          }
        );
      }
    );


  /*
    Also support normal links
    containing #customers etc.
  */

  document
    .querySelectorAll(
      "a"
    )
    .forEach(
      element => {

        if (
          element.dataset.crmNavigationBound
        ) {

          return;
        }

        element.dataset.crmNavigationBound =
          "1";


        element.addEventListener(
          "click",
          event => {

            const page =
              pageFromNavigation(
                element
              );

            if (
              page &&
              PAGE_INFO[page]
            ) {

              event.preventDefault();

              showPage(page);
            }

          }
        );
      }
    );


  /*
    Load dashboard.
  */

  showPage(
    currentPage
  );
}


/* =========================================================
   DOM READY
========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initCrmApp
  );

}

else {

  initCrmApp();
}
