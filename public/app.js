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

let quotationItems = [];

/* =========================================================
   PAGE INFORMATION
========================================================= */

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
    subtitle: "Manage quotations and proposals"
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
  enquiry_items: "Enquiry item",
  quotation_items: "Quotation item",
  order_items: "Order item",
  users: "User"
};

/* =========================================================
   NEW RECORD FIELDS
========================================================= */

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
    "subtotal",
    "discount_amount",
    "freight",
    "taxable_amount",
    "gst_percent",
    "gst_amount",
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
   API HELPERS
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
  } catch (error) {

    throw new Error(
      `Invalid server response (${response.status})`
    );
  }

  if (
    !response.ok ||
    result.success === false
  ) {

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
   GENERAL HELPERS
========================================================= */

function escapeHtml(value) {

  if (value == null) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
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
    result.items ||
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
      row[name] != null &&
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
   UI
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

function showLoading(message) {

  const content = getContent();

  if (content) {

    content.innerHTML = `
      <div class="loading">
        ${escapeHtml(message)}
      </div>
    `;
  }
}

function showError(error, retry = true) {

  const content = getContent();

  if (!content) return;

  content.innerHTML = `
    <div class="panel">
      <div class="panel-body">

        <div class="empty">

          <div class="empty-icon">
            ⚠️
          </div>

          <h3>
            Unable to load this page
          </h3>

          <p>
            ${escapeHtml(error.message)}
          </p>

          ${
            retry
              ? `
                <button
                  type="button"
                  class="button-primary"
                  data-action="retry"
                >
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
    .querySelector(
      '[data-action="retry"]'
    )
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
      document.createElement(
        "div"
      );

    box.id = "crmToast";

    box.className =
      "crm-toast";

    document.body.appendChild(box);
  }

  box.textContent = message;

  box.dataset.type = type;

  box.classList.add("show");

  clearTimeout(notify.timer);

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

  } catch (error) {

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
          row => `
            <td>
              #${escapeHtml(row.id)}
            </td>

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
          row => `
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

  } catch (error) {

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
          data-page="${page}"
        >
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
                          `<tr>${rowTemplate(
                            row
                          )}</tr>`
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

/* =========================================================
   ENTITY PAGE
========================================================= */

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

  } catch (error) {

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
    ],

    followups: [
      "id",
      "customer_id",
      "enquiry_id",
      "followup_date",
      "followup_time",
      "status"
    ],

    payments: [
      "id",
      "customer_id",
      "payment_date",
      "amount",
      "payment_mode",
      "status"
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
   RENDER TABLE
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
                autocomplete="off"
              >
            `
            : ""
        }

        ${filterOptions
          .map(
            field => `
              <select
                data-filter="${field}"
              >

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
                          value="${escapeHtml(
                            value
                          )}"
                        >
                          ${escapeHtml(
                            value
                          )}
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
        id="newRecordButton"
      >
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
              id="recordsBody"
            ></tbody>

          </table>

        </div>

        <div
          id="tableEmpty"
          class="empty"
          hidden
        >

          <div class="empty-icon">
            📭
          </div>

          No ${escapeHtml(table)}
          found

        </div>

      </div>

    </div>
  `;

  const draw = () => {

    const query =
      (
        content.querySelector(
          "#tableSearch"
        )?.value || ""
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
          ) &&

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
    ).innerHTML =
      visible
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
                  class="table-actions"
                >

                  <button
                    type="button"
                    data-action="view"
                    data-id="${row.id}"
                  >
                    View
                  </button>

                  <button
                    type="button"
                    data-action="edit"
                    data-id="${row.id}"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    data-action="delete"
                    data-id="${row.id}"
                  >
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

        } else if (
          button.dataset.action ===
          "edit"
        ) {

          openRecordModal(
            table,
            record,
            data
          );

        } else {

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
   CELL FORMAT
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
      class="badge badge-${cls}"
    >
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
      role="presentation"
    >

      <div
        class="modal ${size}"
        role="dialog"
        aria-modal="true"
        aria-label="${escapeHtml(
          title
        )}"
      >

        <div class="modal-header">

          <h2>
            ${escapeHtml(title)}
          </h2>

          <button
            type="button"
            class="modal-close"
            aria-label="Close"
          >
            ×
          </button>

        </div>

        <div class="modal-body">

          ${body}

        </div>

      </div>

    </div>
  `;

  const close = () => {

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
   FORM FIELDS
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
    ...new Set(
      [
        ...known.filter(
          key =>
            observed.includes(key)
        ),
        ...observed
      ]
    )
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
        rows="3"
      >${escapeHtml(
        dateValue
      )}</textarea>
    `;
  }

  if (
    field === "status"
  ) {

    return `
      <select
        name="status"
      >

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

        <option value="Draft">
          Draft
        </option>

      </select>
    `;
  }

  if (
    field === "priority"
  ) {

    return `
      <select
        name="priority"
      >

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
      )}"
    >
  `;
}

/* =========================================================
   GENERIC RECORD MODAL
========================================================= */

function openRecordModal(
  table,
  record,
  records
) {

  /*
   Quotation has its own special editor.
  */

  if (
    table === "quotations"
  ) {

    return openQuotationModal(
      record,
      records
    );
  }

  const fields =
    fieldsFor(
      table,
      record,
      records
    );

  if (!fields.length) {

    notify(
      `Add one ${titleFor(
        table
      )} first through the API, then its fields can be detected.`,
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
          id="recordForm"
        >

          <div class="form-grid">

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
                        record?.[
                          field
                        ]
                      )}

                    </label>
                  `
              )
              .join("")}

          </div>

          <div class="modal-actions">

            <button
              type="button"
              class="button-secondary"
              data-close
            >
              Cancel
            </button>

            <button
              class="button-primary"
              type="submit"
            >
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

          } else {

            await apiPost(
              `/${table}`,
              payload
            );
          }

          notify(
            `${titleFor(
              table
            )} ${
              record
                ? "updated"
                : "created"
            } successfully.`
          );

          modal.close();

          showPage(table);

        } catch (error) {

          notify(
            error.message,
            "error"
          );
        }
      }
    );
}

/* =========================================================
   FORM PAYLOAD
========================================================= */

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
   QUOTATION MODAL
========================================================= */

async function openQuotationModal(
  record = null,
  records = []
) {

  quotationItems = [];

  /*
   Load existing quotation items
   when editing.
  */

  if (record) {

    try {

      const result =
        await apiGet(
          `/quotations/${record.id}/details`
        );

      quotationItems =
        Array.isArray(
          result.items
        )
          ? result.items.map(
              item =>
                normalizeQuotationItem(
                  item
                )
            )
          : [];

    } catch (error) {

      console.error(
        "Unable to load quotation items",
        error
      );

      quotationItems = [];
    }
  }

  let customers =
    customersCache;

  if (
    !customers.length
  ) {

    customers =
      await safeList(
        "customers"
      );

    customersCache =
      customers;
  }

  let products =
    productsCache;

  if (
    !products.length
  ) {

    products =
      await safeList(
        "products"
      );

    productsCache =
      products;
  }

  const modal =
    openModal(
      `${
        record
          ? "Edit"
          : "New"
      } Quotation`,

      quotationFormHTML(
        record,
        customers,
        products
      ),

      "modal-xl"
    );

  setupQuotationModal(
    modal,
    record,
    customers,
    products
  );
}

/* =========================================================
   NORMALIZE QUOTATION ITEM
========================================================= */

function normalizeQuotationItem(
  item
) {

  const quantity =
    Number(
      item.quantity ||
      item.qty ||
      0
    );

  const rate =
    Number(
      item.rate ||
      item.price ||
      0
    );

  const discountPercent =
    Number(
      item.discount_percent ||
      0
    );

  const lineSubtotal =
    quantity * rate;

  const discountAmount =
    lineSubtotal *
    discountPercent /
    100;

  const lineTotal =
    lineSubtotal -
    discountAmount;

  return {

    ...item,

    quantity,

    rate,

    discount_percent:
      discountPercent,

    line_subtotal:
      lineSubtotal,

    discount_amount:
      discountAmount,

    line_total:
      lineTotal
  };
}

/* =========================================================
   QUOTATION FORM HTML
========================================================= */

function quotationFormHTML(
  record,
  customers,
  products
) {

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const quotationDate =
    record?.quotation_date
      ? String(
          record.quotation_date
        ).slice(0, 10)
      : today;

  const validUntil =
    record?.valid_until
      ? String(
          record.valid_until
        ).slice(0, 10)
      : "";

  return `

    <form
      id="quotationForm"
    >

      <div class="quotation-top-grid">

        <label>

          Quotation Number

          <input
            id="quotationNumber"
            name="quotation_number"
            value="${escapeHtml(
              record?.quotation_number ||
              ""
            )}"
            placeholder="Auto generated"
            readonly
          >

        </label>

        <label>

          Customer

          <select
            id="quotationCustomer"
            name="customer_id"
          >

            <option value="">
              Select Customer
            </option>

            ${customers
              .map(
                customer =>
                  `
                    <option
                      value="${customer.id}"
                      ${
                        String(
                          record?.customer_id ||
                          ""
                        ) ===
                        String(
                          customer.id
                        )
                          ? "selected"
                          : ""
                      }
                    >
                      ${escapeHtml(
                        valueFor(
                          customer,
                          [
                            "company_name",
                            "name",
                            "contact_person"
                          ],
                          `Customer #${customer.id}`
                        )
                      )}
                    </option>
                  `
              )
              .join("")}

          </select>

        </label>

        <label>

          Quotation Date

          <input
            type="date"
            id="quotationDate"
            name="quotation_date"
            value="${quotationDate}"
          >

        </label>

        <label>

          Valid Until

          <input
            type="date"
            id="quotationValidUntil"
            name="valid_until"
            value="${validUntil}"
          >

        </label>

      </div>

      <div
        class="panel"
        style="margin-top:20px"
      >

        <div
          class="panel-header"
        >

          <h2>
            Products / Items
          </h2>

          <button
            type="button"
            class="button-primary"
            id="addQuotationItem"
          >
            + Add Product
          </button>

        </div>

        <div class="panel-body">

          <div
            id="quotationItemsContainer"
          ></div>

        </div>

      </div>

      <div
        class="quotation-summary"
        style="margin-top:20px"
      >

        <div>

          <span>
            Subtotal
          </span>

          <strong
            id="quotationSubtotal"
          >
            ₹0.00
          </strong>

        </div>

        <div>

          <span>
            Total Item Discount
          </span>

          <strong
            id="quotationDiscount"
          >
            ₹0.00
          </strong>

        </div>

        <div>

          <label>
            Freight
          </label>

          <input
            id="quotationFreight"
            type="number"
            step="0.01"
            value="${escapeHtml(
              record?.freight ?? 0
            )}"
          >

        </div>

        <div>

          <span>
            Taxable Amount
          </span>

          <strong
            id="quotationTaxable"
          >
            ₹0.00
          </strong>

        </div>

        <div>

          <label>
            GST %
          </label>

          <input
            id="quotationGstPercent"
            type="number"
            step="0.01"
            value="${escapeHtml(
              record?.gst_percent ?? 18
            )}"
          >

        </div>

        <div>

          <span>
            GST Amount
          </span>

          <strong
            id="quotationGstAmount"
          >
            ₹0.00
          </strong>

        </div>

        <div
          class="quotation-grand-total"
        >

          <span>
            Grand Total
          </span>

          <strong
            id="quotationGrandTotal"
          >
            ₹0.00
          </strong>

        </div>

      </div>

      <div
        style="margin-top:20px"
      >

        <label>

          Notes

          <textarea
            id="quotationNotes"
            rows="4"
            placeholder="Quotation notes"
          >${escapeHtml(
            record?.notes || ""
          )}</textarea>

        </label>

      </div>

      <div
        class="modal-actions"
      >

        <button
          type="button"
          class="button-secondary"
          id="quotationCancel"
        >
          Cancel
        </button>

        <button
          type="submit"
          class="button-primary"
        >
          ${
            record
              ? "Save Quotation"
              : "Create Quotation"
          }
        </button>

      </div>

    </form>
  `;
}

/* =========================================================
   QUOTATION ITEM HTML
========================================================= */

function quotationItemHTML(
  item,
  index,
  products
) {

  const productId =
    item.product_id ||
    item.productId ||
    "";

  const productName =
    item.description ||
    item.product_name ||
    item.name ||
    "";

  return `

    <div
      class="quotation-item"
      data-item-index="${index}"
    >

      <div
        class="quotation-item-grid"
      >

        <label>

          Product

          <select
            class="quotation-product"
            data-field="product_id"
          >

            <option value="">
              Select Product
            </option>

            ${products
              .map(
                product => {

                  const name =
                    valueFor(
                      product,
                      [
                        "name",
                        "product_name"
                      ],
                      `Product #${product.id}`
                    );

                  const rate =
                    Number(
                      valueFor(
                        product,
                        [
                          "selling_price",
                          "price",
                          "rate"
                        ],
                        0
                      )
                    );

                  return `
                    <option
                      value="${product.id}"
                      data-rate="${rate}"
                      data-name="${escapeHtml(
                        name
                      )}"
                      ${
                        String(
                          productId
                        ) ===
                        String(
                          product.id
                        )
                          ? "selected"
                          : ""
                      }
                    >
                      ${escapeHtml(
                        name
                      )}
                    </option>
                  `;
                }
              )
              .join("")}

          </select>

        </label>

        <label>

          Description

          <input
            type="text"
            class="quotation-description"
            data-field="description"
            value="${escapeHtml(
              productName
            )}"
          >

        </label>

        <label>

          Quantity

          <input
            type="number"
            min="0"
            step="any"
            class="quotation-quantity"
            data-field="quantity"
            value="${escapeHtml(
              item.quantity || 1
            )}"
          >

        </label>

        <label>

          Rate

          <input
            type="number"
            min="0"
            step="0.01"
            class="quotation-rate"
            data-field="rate"
            value="${escapeHtml(
              item.rate || 0
            )}"
          >

        </label>

        <label>

          Discount %

          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            class="quotation-discount-percent"
            data-field="discount_percent"
            value="${escapeHtml(
              item.discount_percent || 0
            )}"
          >

        </label>

        <label>

          Discount Amount

          <input
            type="text"
            class="quotation-discount-amount"
            readonly
            value="${formatCurrency(
              item.discount_amount || 0
            )}"
          >

        </label>

        <label>

          Net Amount

          <input
            type="text"
            class="quotation-line-total"
            readonly
            value="${formatCurrency(
              item.line_total || 0
            )}"
          >

        </label>

        <div
          class="quotation-item-delete"
        >

          <button
            type="button"
            class="button-danger"
            data-remove-item
          >
            Remove
          </button>

        </div>

      </div>

    </div>
  `;
}

/* =========================================================
   RENDER QUOTATION ITEMS
========================================================= */

function renderQuotationItems(
  container,
  products
) {

  if (
    quotationItems.length === 0
  ) {

    container.innerHTML = `

      <div class="empty">

        <div class="empty-icon">
          📦
        </div>

        No products added.

        <br>

        Click
        <strong>
          + Add Product
        </strong>
        to add a product.

      </div>
    `;

    return;
  }

  container.innerHTML =
    quotationItems
      .map(
        (item, index) =>
          quotationItemHTML(
            item,
            index,
            products
          )
      )
      .join("");

  container
    .querySelectorAll(
      "[data-remove-item]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const item =
              button.closest(
                ".quotation-item"
              );

            const index =
              Number(
                item.dataset
                  .itemIndex
              );

            quotationItems.splice(
              index,
              1
            );

            renderQuotationItems(
              container,
              products
            );

            calculateQuotationTotals(
              container
            );
          }
        );
      }
    );

  container
    .querySelectorAll(
      ".quotation-product"
    )
    .forEach(
      select => {

        select.addEventListener(
          "change",
          () => {

            const item =
              select.closest(
                ".quotation-item"
              );

            const index =
              Number(
                item.dataset
                  .itemIndex
              );

            const option =
              select.options[
                select.selectedIndex
              ];

            const rate =
              Number(
                option.dataset
                  .rate || 0
              );

            const name =
              option.dataset
                .name || "";

            quotationItems[
              index
            ].product_id =
              select.value;

            quotationItems[
              index
            ].description =
              name;

            quotationItems[
              index
            ].rate =
              rate;

            const description =
              item.querySelector(
                ".quotation-description"
              );

            const rateInput =
              item.querySelector(
                ".quotation-rate"
              );

            if (
              description
            ) {

              description.value =
                name;
            }

            if (
              rateInput
            ) {

              rateInput.value =
                rate;
            }

            calculateQuotationTotals(
              container
            );
          }
        );
      }
    );

  container
    .querySelectorAll(
      ".quotation-description"
    )
    .forEach(
      input => {

        input.addEventListener(
          "input",
          () => {

            const item =
              input.closest(
                ".quotation-item"
              );

            const index =
              Number(
                item.dataset
                  .itemIndex
              );

            quotationItems[
              index
            ].description =
              input.value;

          }
        );
      }
    );

  container
    .querySelectorAll(
      ".quotation-quantity"
    )
    .forEach(
      input => {

        input.addEventListener(
          "input",
          () =>
            calculateQuotationTotals(
              container
            )
        );
      }
    );

  container
    .querySelectorAll(
      ".quotation-rate"
    )
    .forEach(
      input => {

        input.addEventListener(
          "input",
          () =>
            calculateQuotationTotals(
              container
            )
        );
      }
    );

  container
    .querySelectorAll(
      ".quotation-discount-percent"
    )
    .forEach(
      input => {

        input.addEventListener(
          "input",
          () =>
            calculateQuotationTotals(
              container
            )
        );
      }
    );

  calculateQuotationTotals(
    container
  );
}

/* =========================================================
   QUOTATION CALCULATION
========================================================= */

function calculateQuotationTotals(
  container
) {

  let subtotal = 0;

  let totalDiscount = 0;

  quotationItems =
    quotationItems.map(
      (item, index) => {

        const row =
          container.querySelector(
            `[data-item-index="${index}"]`
          );

        if (!row) {
          return item;
        }

        const qty =
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
              ".quotation-discount-percent"
            )?.value || 0
          );

        /*
         * GROSS PRODUCT VALUE
         */
        const lineSubtotal =
          qty * rate;

        /*
         * INDIVIDUAL PRODUCT DISCOUNT
         */
        const discountAmount =
          lineSubtotal *
          discountPercent /
          100;

        /*
         * NET PRODUCT VALUE
         */
        const lineTotal =
          lineSubtotal -
          discountAmount;

        subtotal +=
          lineSubtotal;

        totalDiscount +=
          discountAmount;

        const discountInput =
          row.querySelector(
            ".quotation-discount-amount"
          );

        const totalInput =
          row.querySelector(
            ".quotation-line-total"
          );

        if (
          discountInput
        ) {

          discountInput.value =
            formatCurrency(
              discountAmount
            );
        }

        if (
          totalInput
        ) {

          totalInput.value =
            formatCurrency(
              lineTotal
            );
        }

        return {

          ...item,

          quantity: qty,

          rate: rate,

          discount_percent:
            discountPercent,

          line_subtotal:
            Number(
              lineSubtotal.toFixed(
                2
              )
            ),

          discount_amount:
            Number(
              discountAmount.toFixed(
                2
              )
            ),

          line_total:
            Number(
              lineTotal.toFixed(
                2
              )
            )
        };
      }
    );

  /*
   * FREIGHT
   */

  const freight =
    Number(
      document.getElementById(
        "quotationFreight"
      )?.value || 0
    );

  /*
   * GST
   */

  const gstPercent =
    Number(
      document.getElementById(
        "quotationGstPercent"
      )?.value || 18
    );

  /*
   * AFTER ALL INDIVIDUAL DISCOUNTS
   */

  const afterDiscount =
    subtotal -
    totalDiscount;

  /*
   * ADD FREIGHT
   */

  const taxableAmount =
    afterDiscount +
    freight;

  /*
   * GST
   */

  const gstAmount =
    taxableAmount *
    gstPercent /
    100;

  /*
   * FINAL TOTAL
   */

  const grandTotal =
    taxableAmount +
    gstAmount;

  /*
   * UPDATE SUMMARY
   */

  const subtotalElement =
    document.getElementById(
      "quotationSubtotal"
    );

  const discountElement =
    document.getElementById(
      "quotationDiscount"
    );

  const taxableElement =
    document.getElementById(
      "quotationTaxable"
    );

  const gstElement =
    document.getElementById(
      "quotationGstAmount"
    );

  const grandElement =
    document.getElementById(
      "quotationGrandTotal"
    );

  if (
    subtotalElement
  ) {

    subtotalElement.textContent =
      formatCurrency(
        subtotal
      );
  }

  if (
    discountElement
  ) {

    discountElement.textContent =
      formatCurrency(
        totalDiscount
      );
  }

  if (
    taxableElement
  ) {

    taxableElement.textContent =
      formatCurrency(
        taxableAmount
      );
  }

  if (
    gstElement
  ) {

    gstElement.textContent =
      formatCurrency(
        gstAmount
      );
  }

  if (
    grandElement
  ) {

    grandElement.textContent =
      formatCurrency(
        grandTotal
      );
  }

  return {

    subtotal,

    totalDiscount,

    freight,

    taxableAmount,

    gstPercent,

    gstAmount,

    grandTotal
  };
}

/* =========================================================
   SETUP QUOTATION MODAL
========================================================= */

function setupQuotationModal(
  modal,
  record,
  customers,
  products
) {

  const container =
    modal.host.querySelector(
      "#quotationItemsContainer"
    );

  const addButton =
    modal.host.querySelector(
      "#addQuotationItem"
    );

  /*
   Generate quotation number
   for new quotation.
  */

  if (
    !record
  ) {

    apiGet(
      "/quotations/next-number"
    )
      .then(
        result => {

          const input =
            modal.host.querySelector(
              "#quotationNumber"
            );

          if (
            input &&
            !input.value
          ) {

            input.value =
              result.quotation_number ||
              "";
          }
        }
      )
      .catch(
        error =>
          console.warn(
            "Quotation number generation failed",
            error
          )
      );
  }

  /*
   Add product
  */

  addButton.addEventListener(
    "click",
    () => {

      quotationItems.push({

        product_id: "",

        description: "",

        quantity: 1,

        rate: 0,

        discount_percent: 0,

        discount_amount: 0,

        line_subtotal: 0,

        line_total: 0
      });

      renderQuotationItems(
        container,
        products
      );
    }
  );

  /*
   Freight change
  */

  modal.host
    .querySelector(
      "#quotationFreight"
    )
    .addEventListener(
      "input",
      () =>
        calculateQuotationTotals(
          container
        )
    );

  /*
   GST change
  */

  modal.host
    .querySelector(
      "#quotationGstPercent"
    )
    .addEventListener(
      "input",
      () =>
        calculateQuotationTotals(
          container
        )
    );

  /*
   Cancel
  */

  modal.host
    .querySelector(
      "#quotationCancel"
    )
    .addEventListener(
      "click",
      modal.close
    );

  /*
   Initial items
  */

  renderQuotationItems(
    container,
    products
  );

  /*
   Submit quotation
  */

  modal.host
    .querySelector(
      "#quotationForm"
    )
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        try {

          if (
            quotationItems.length === 0
          ) {

            notify(
              "Please add at least one product.",
              "error"
            );

            return;
          }

          /*
           Recalculate one final time.
          */

          const totals =
            calculateQuotationTotals(
              container
            );

          /*
           Read form data
          */

          const quotationNumber =
            modal.host.querySelector(
              "#quotationNumber"
            ).value.trim();

          const customerId =
            modal.host.querySelector(
              "#quotationCustomer"
            ).value;

          const quotationDate =
            modal.host.querySelector(
              "#quotationDate"
            ).value;

          const validUntil =
            modal.host.querySelector(
              "#quotationValidUntil"
            ).value;

          const notes =
            modal.host.querySelector(
              "#quotationNotes"
            ).value;

          const freight =
            Number(
              modal.host.querySelector(
                "#quotationFreight"
              ).value || 0
            );

          const gstPercent =
            Number(
              modal.host.querySelector(
                "#quotationGstPercent"
              ).value || 18
            );

          /*
           =================================================
           QUOTATION HEADER
           =================================================
          */

          const quotationPayload = {

            quotation_number:
              quotationNumber,

            customer_id:
              customerId
                ? Number(customerId)
                : null,

            quotation_date:
              quotationDate,

            valid_until:
              validUntil || null,

            status:
              record?.status ||
              "Draft",

            subtotal:
              Number(
                totals.subtotal.toFixed(
                  2
                )
              ),

            /*
             IMPORTANT:
             This is now the TOTAL
             of all individual
             product discounts.
            */

            discount_percent: 0,

            discount_amount:
              Number(
                totals.totalDiscount.toFixed(
                  2
                )
              ),

            discount:
              Number(
                totals.totalDiscount.toFixed(
                  2
                )
              ),

            freight:
              Number(
                freight.toFixed(
                  2
                )
              ),

            taxable_amount:
              Number(
                totals.taxableAmount.toFixed(
                  2
                )
              ),

            gst_percent:
              Number(
                gstPercent.toFixed(
                  2
                )
              ),

            gst_amount:
              Number(
                totals.gstAmount.toFixed(
                  2
                )
              ),

            grand_total:
              Number(
                totals.grandTotal.toFixed(
                  2
                )
              ),

            notes
          };

          let quotationId;

          /*
           =================================================
           CREATE / UPDATE QUOTATION
           =================================================
          */

          if (record) {

            await apiPut(
              `/quotations/${record.id}`,
              quotationPayload
            );

            quotationId =
              record.id;

          } else {

            const result =
              await apiPost(
                "/quotations",
                quotationPayload
              );

            quotationId =
              result.id;
          }

          if (!quotationId) {

            throw new Error(
              "Quotation was saved but quotation ID was not returned."
            );
          }

          /*
           =================================================
           SAVE QUOTATION ITEMS
           =================================================

           IMPORTANT:
           Every item gets its own:

           discount_percent
           discount_amount
           line_subtotal
           line_total
          */

          if (
            record
          ) {

            /*
             For editing, existing items
             need to be updated where possible.
            */

            const existingResult =
              await apiGet(
                `/quotations/${quotationId}/items`
              );

            const existingItems =
              existingResult.items ||
              [];

            /*
             Update existing rows and
             create new rows.
            */

            for (
              let index = 0;
              index <
              quotationItems.length;
              index++
            ) {

              const item =
                quotationItems[
                  index
                ];

              const payload =
                quotationItemPayload(
                  item,
                  quotationId
                );

              if (
                item.id
              ) {

                await apiPut(
                  `/quotation_items/${item.id}`,
                  payload
                );

              } else {

                await apiPost(
                  `/quotations/${quotationId}/items`,
                  payload
                );
              }
            }

            /*
             Delete old items that were
             removed from the quotation.
            */

            const currentIds =
              new Set(
                quotationItems
                  .filter(
                    item =>
                      item.id
                  )
                  .map(
                    item =>
                      String(
                        item.id
                      )
                  )
              );

            for (
              const oldItem
              of existingItems
            ) {

              if (
                oldItem.id &&
                !currentIds.has(
                  String(
                    oldItem.id
                  )
                )
              ) {

                await apiDelete(
                  `/quotation_items/${oldItem.id}`
                );
              }
            }

          } else {

            /*
             New quotation:
             simply create all items.
            */

            for (
              const item
              of quotationItems
            ) {

              await apiPost(
                `/quotations/${quotationId}/items`,
                quotationItemPayload(
                  item,
                  quotationId
                )
              );
            }
          }

          notify(
            `Quotation ${
              quotationNumber ||
              ""
            } saved successfully.`
          );

          modal.close();

          showPage(
            "quotations"
          );

        } catch (error) {

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
    );
}

/* =========================================================
   QUOTATION ITEM PAYLOAD
========================================================= */

function quotationItemPayload(
  item,
  quotationId
) {

  const quantity =
    Number(
      item.quantity || 0
    );

  const rate =
    Number(
      item.rate || 0
    );

  const discountPercent =
    Number(
      item.discount_percent || 0
    );

  const lineSubtotal =
    quantity * rate;

  const discountAmount =
    lineSubtotal *
    discountPercent /
    100;

  const lineTotal =
    lineSubtotal -
    discountAmount;

  return {

    quotation_id:
      Number(quotationId),

    product_id:
      item.product_id
        ? Number(
            item.product_id
          )
        : null,

    description:
      item.description ||
      "",

    quantity,

    rate,

    discount_percent:
      discountPercent,

    discount_amount:
      Number(
        discountAmount.toFixed(
          2
        )
      ),

    /*
     * Include common field names.
     * The server will reject fields
     * that don't exist in your table.
     */

    line_subtotal:
      Number(
        lineSubtotal.toFixed(
          2
        )
      ),

    line_total:
      Number(
        lineTotal.toFixed(
          2
        )
      )
  };
}

/* =========================================================
   DETAIL MODAL
========================================================= */

function openDetailModal(
  table,
  record,
  records
) {

  /*
   Quotation gets a detailed
   quotation view.
  */

  if (
    table === "quotations"
  ) {

    return openQuotationDetail(
      record
    );
  }

  const details =
    Object.entries(record)
      .filter(
        ([key]) =>
          !isSystemField(key)
      )
      .map(
        ([key, value]) =>
          `
            <div class="detail-item">

              <div
                class="detail-label"
              >
                ${escapeHtml(
                  humanize(key)
                )}
              </div>

              <div
                class="detail-value"
              >
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
      `${titleFor(
        table
      )} #${record.id}`,

      `
        <div
          class="detail-grid"
        >
          ${details}
        </div>

        <div
          class="modal-actions"
        >

          <button
            type="button"
            class="button-secondary"
            data-close
          >
            Close
          </button>

          <button
            type="button"
            class="button-primary"
            data-edit
          >
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

/* =========================================================
   QUOTATION DETAIL
========================================================= */

async function openQuotationDetail(
  record
) {

  const modal =
    openModal(
      `Quotation ${
        record.quotation_number ||
        `#${record.id}`
      }`,

      `
        <div class="loading">
          Loading quotation...
        </div>
      `,

      "modal-xl"
    );

  try {

    const result =
      await apiGet(
        `/quotations/${record.id}/details`
      );

    const quotation =
      result.quotation ||
      record;

    const items =
      result.items ||
      [];

    modal.host.querySelector(
      ".modal-body"
    ).innerHTML = `

      <div
        class="quotation-detail-header"
      >

        <div>

          <strong>
            Quotation No.
          </strong>

          <div>
            ${escapeHtml(
              quotation.quotation_number ||
              `#${quotation.id}`
            )}
          </div>

        </div>

        <div>

          <strong>
            Customer
          </strong>

          <div>
            ${escapeHtml(
              quotation.customer_id ||
              "—"
            )}
          </div>

        </div>

        <div>

          <strong>
            Date
          </strong>

          <div>
            ${formatDate(
              quotation.quotation_date
            )}
          </div>

        </div>

      </div>

      <div
        class="table-wrapper"
        style="margin-top:20px"
      >

        <table>

          <thead>

            <tr>

              <th>
                Product
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
                Discount
              </th>

              <th>
                Net Amount
              </th>

            </tr>

          </thead>

          <tbody>

            ${
              items.length
                ? items
                    .map(
                      item => {

                        const normalized =
                          normalizeQuotationItem(
                            item
                          );

                        return `
                          <tr>

                            <td>
                              ${escapeHtml(
                                normalized.description ||
                                normalized.product_name ||
                                normalized.name ||
                                "—"
                              )}
                            </td>

                            <td>
                              ${escapeHtml(
                                normalized.quantity
                              )}
                            </td>

                            <td>
                              ${formatCurrency(
                                normalized.rate
                              )}
                            </td>

                            <td>
                              ${escapeHtml(
                                normalized.discount_percent
                              )}%
                            </td>

                            <td>
                              ${formatCurrency(
                                normalized.discount_amount
                              )}
                            </td>

                            <td>
                              ${formatCurrency(
                                normalized.line_total
                              )}
                            </td>

                          </tr>
                        `;
                      }
                    )
                    .join("")
                : `
                  <tr>
                    <td
                      colspan="6"
                      style="text-align:center"
                    >
                      No quotation items
                    </td>
                  </tr>
                `
            }

          </tbody>

        </table>

      </div>

      <div
        class="quotation-summary"
        style="margin-top:20px"
      >

        <div>

          <span>
            Subtotal
          </span>

          <strong>
            ${formatCurrency(
              quotation.subtotal
            )}
          </strong>

        </div>

        <div>

          <span>
            Total Item Discount
          </span>

          <strong>
            ${formatCurrency(
              quotation.discount_amount ||
              quotation.discount ||
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
              quotation.freight
            )}
          </strong>

        </div>

        <div>

          <span>
            Taxable Amount
          </span>

          <strong>
            ${formatCurrency(
              quotation.taxable_amount
            )}
          </strong>

        </div>

        <div>

          <span>
            GST ${
              quotation.gst_percent ||
              18
            }%
          </span>

          <strong>
            ${formatCurrency(
              quotation.gst_amount
            )}
          </strong>

        </div>

        <div
          class="quotation-grand-total"
        >

          <span>
            Grand Total
          </span>

          <strong>
            ${formatCurrency(
              quotation.grand_total
            )}
          </strong>

        </div>

      </div>

      <div
        class="modal-actions"
        style="margin-top:20px"
      >

        <button
          type="button"
          class="button-secondary"
          data-close
        >
          Close
        </button>

        <button
          type="button"
          class="button-primary"
          data-edit
        >
          Edit Quotation
        </button>

      </div>
    `;

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

          openQuotationModal(
            quotation,
            []
          );
        }
      );

  } catch (error) {

    modal.host.querySelector(
      ".modal-body"
    ).innerHTML = `

      <div class="empty">

        <div class="empty-icon">
          ⚠️
        </div>

        <h3>
          Unable to load quotation
        </h3>

        <p>
          ${escapeHtml(
            error.message
          )}
        </p>

      </div>
    `;
  }
}

/* =========================================================
   DELETE
========================================================= */

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
      `${titleFor(
        table
      )} deleted.`
    );

    showPage(table);

  } catch (error) {

    notify(
      error.message,
      "error"
    );
  }
}

/* =========================================================
   SIMPLE TABLE
========================================================= */

async function renderSimpleTable(
  table
) {

  return renderEntityPage(
    table,
    {
      search: true
    }
  );
}

/* =========================================================
   PAGE NAVIGATION
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
      el => {

        el.classList.toggle(
          "active",
          el.dataset.page ===
            page
        );
      }
    );

  const renderer = {

    dashboard:
      renderDashboard,

    customers:
      renderCustomers,

    products:
      renderProducts,

    enquiries:
      renderEnquiries

  }[page];

  if (renderer) {

    return renderer();
  }

  return renderSimpleTable(
    page
  );
}

/* =========================================================
   NAVIGATION DETECTION
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
   UI STYLES
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

    .toolbar{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:16px;
      margin:0 0 20px;
    }

    .toolbar-left{
      display:flex;
      flex:1;
      gap:10px;
      flex-wrap:wrap;
    }

    .toolbar input,
    .toolbar select,
    .form-grid input,
    .form-grid select,
    .form-grid textarea,
    .quotation-top-grid input,
    .quotation-top-grid select,
    .quotation-item input,
    .quotation-item select,
    .quotation-summary input,
    #quotationNotes{
      box-sizing:border-box;
      width:100%;
      padding:10px 12px;
      border:1px solid #d8dee8;
      border-radius:8px;
      background:#fff;
    }

    .form-grid{
      display:grid;
      grid-template-columns:
        repeat(2,minmax(0,1fr));
      gap:16px;
    }

    .form-grid label,
    .quotation-top-grid label,
    .quotation-item label,
    #quotationNotes{
      display:flex;
      flex-direction:column;
      gap:7px;
      font-weight:600;
    }

    .modal-large{
      max-width:900px;
    }

    .modal-xl{
      max-width:1250px;
      width:95%;
    }

    .quotation-top-grid{
      display:grid;
      grid-template-columns:
        repeat(4,minmax(0,1fr));
      gap:16px;
    }

    .quotation-item{
      border:1px solid #e1e5eb;
      border-radius:10px;
      padding:15px;
      margin-bottom:12px;
      background:#fafbfc;
    }

    .quotation-item-grid{
      display:grid;
      grid-template-columns:
        1.2fr
        1.5fr
        .7fr
        .9fr
        .9fr
        1fr
        1fr
        auto;
      gap:10px;
      align-items:end;
    }

    .quotation-item-delete{
      display:flex;
      align-items:end;
    }

    .button-danger{
      border:0;
      padding:10px 12px;
      border-radius:8px;
      cursor:pointer;
      background:#dc3545;
      color:#fff;
    }

    .quotation-summary{
      border:1px solid #e1e5eb;
      border-radius:10px;
      padding:18px;
      display:flex;
      flex-direction:column;
      gap:12px;
      max-width:500px;
      margin-left:auto;
    }

    .quotation-summary > div{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:20px;
    }

    .quotation-summary label{
      display:flex;
      align-items:center;
      justify-content:space-between;
      width:100%;
      gap:20px;
    }

    .quotation-summary input{
      width:180px;
    }

    .quotation-grand-total{
      border-top:2px solid #222;
      padding-top:14px;
      margin-top:8px;
      font-size:20px;
    }

    .quotation-detail-header{
      display:grid;
      grid-template-columns:
        repeat(3,1fr);
      gap:20px;
      padding:15px;
      border:1px solid #e1e5eb;
      border-radius:10px;
    }

    @media(max-width:1100px){

      .quotation-item-grid{
        grid-template-columns:
          repeat(3,minmax(0,1fr));
      }

      .quotation-top-grid{
        grid-template-columns:
          repeat(2,minmax(0,1fr));
      }
    }

    @media(max-width:700px){

      .form-grid,
      .quotation-top-grid,
      .quotation-detail-header{
        grid-template-columns:1fr;
      }

      .quotation-item-grid{
        grid-template-columns:1fr;
      }

      .toolbar{
        flex-direction:column;
        align-items:stretch;
      }

      .quotation-summary{
        max-width:none;
      }
    }

    .crm-toast{
      position:fixed;
      right:20px;
      bottom:20px;
      z-index:99999;
      padding:13px 18px;
      border-radius:8px;
      background:#222;
      color:#fff;
      opacity:0;
      transform:translateY(10px);
      pointer-events:none;
      transition:.2s ease;
    }

    .crm-toast.show{
      opacity:1;
      transform:translateY(0);
    }

    .crm-toast[data-type="error"]{
      background:#c62828;
    }

    .loading{
      padding:50px;
      text-align:center;
      font-size:18px;
    }

  `;

  document.head.appendChild(
    style
  );
}

/* =========================================================
   INITIALIZE CRM
========================================================= */

function initializeCRM() {

  ensureCrmUiStyles();

  /*
   Navigation buttons
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

            event.preventDefault();

            const page =
              pageFromNavigation(
                element
              );

            if (page) {

              showPage(page);
            }
          }
        );
      }
    );

  /*
   Existing links without
   data-page
  */

  document
    .querySelectorAll(
      "a"
    )
    .forEach(
      element => {

        if (
          element.dataset
            .crmNavigationBound
        ) {

          return;
        }

        const page =
          pageFromNavigation(
            element
          );

        if (!page) {
          return;
        }

        element.dataset
          .crmNavigationBound =
          "true";

        element.addEventListener(
          "click",
          event => {

            event.preventDefault();

            showPage(page);
          }
        );
      }
    );

  /*
   Load dashboard
  */

  showPage(
    "dashboard"
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
    initializeCRM
  );

} else {

  initializeCRM();
}
