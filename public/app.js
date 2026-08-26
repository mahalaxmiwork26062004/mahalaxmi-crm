"use strict";

/* =========================================================
   MAHALAXMI ENTERPRISE CRM
   COMPLETE FRONTEND APP.JS
========================================================= */

const API = "/api";

let currentPage = "dashboard";
let customersCache = [];
let productsCache = [];
let pageRequest = 0;

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
    subtitle: "Create and manage customer quotations"
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
    "subtotal",
    "discount_percent",
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
   API FUNCTIONS
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
    result?.data ||
    result?.customers ||
    result?.products ||
    result?.items ||
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

  return /amount|price|total|quantity|stock|percent|discount|freight|gst|subtotal|_id$/.test(
    field
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
   NOTIFICATION
========================================================= */

function notify(
  message,
  type = "success"
) {

  let box =
    document.getElementById("crmToast");

  if (!box) {

    box =
      document.createElement("div");

    box.id = "crmToast";
    box.className = "crm-toast";

    document.body.appendChild(box);
  }

  box.textContent = message;
  box.dataset.type = type;

  box.classList.add("show");

  clearTimeout(notify.timer);

  notify.timer =
    setTimeout(
      () => box.classList.remove("show"),
      3500
    );
}

/* =========================================================
   LOADING / ERROR
========================================================= */

function showLoading(message) {

  const content = getContent();

  if (!content) return;

  content.innerHTML = `
    <div class="loading">
      ${escapeHtml(message)}
    </div>
  `;
}

function showError(
  error,
  retry = true
) {

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
            ${escapeHtml(error?.message || "Unknown error")}
          </p>

          ${
            retry
              ? `
                <button
                  type="button"
                  class="button-primary"
                  data-action="retry"
                >
                  Try Again
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

/* =========================================================
   SAFE API LIST
========================================================= */

async function safeList(table) {

  try {

    const result =
      await apiGet(`/${table}`);

    return rows(result);

  } catch (error) {

    console.warn(
      `Could not load ${table}`,
      error
    );

    return [];
  }
}

/* =========================================================
   PAGE HEADER
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
    title.textContent =
      info.title;
  }

  if (subtitle) {
    subtitle.textContent =
      info.subtitle;
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
    ] = await Promise.all([
      safeList("customers"),
      safeList("products"),
      safeList("enquiries"),
      safeList("quotations"),
      safeList("orders"),
      safeList("followups")
    ]);

    if (request !== pageRequest) {
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

    const content =
      getContent();

    content.innerHTML = `

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
              formatCurrency(quoteValue),
              "Across all quotations"
            )}

          </div>

        </div>

      </div>
    `;

    content
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

    if (request === pageRequest) {

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
                          `<tr>${rowTemplate(row)}</tr>`
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

    if (request !== pageRequest) {
      return data;
    }

    renderTablePage(
      table,
      data,
      options
    );

    return data;

  } catch (error) {

    if (request === pageRequest) {

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
      "discount_percent",
      "freight",
      "gst_amount",
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
        .slice(0, 8);
}

/* =========================================================
   TABLE RENDER
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
                data-filter="${escapeHtml(field)}"
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
                    value => `
                      <option
                        value="${escapeHtml(value)}"
                      >
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
                      `<th>${escapeHtml(
                        humanize(key)
                      )}</th>`
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
              Object.values(row)
                .some(
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
                String(
                  row[key]
                ) === value
            )
        );

      const body =
        content.querySelector(
          "#recordsBody"
        );

      body.innerHTML =
        visible
          .map(
            row => `
              <tr>

                ${columns
                  .map(
                    key =>
                      `<td>${cellValue(
                        row[key],
                        key
                      )}</td>`
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
   CELL VALUE
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

  if (isDateField(key)) {
    return formatDate(value);
  }

  if (
    /price|amount|total|freight|gst|discount|subtotal|taxable/.test(
      key
    )
  ) {
    return formatCurrency(value);
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
   FIELD HELPERS
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
    NEW_RECORD_FIELDS[table] ||
    [];

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
        rows="3"
      >${escapeHtml(
        dateValue
      )}</textarea>
    `;
  }

  if (
    field ===
    "status"
  ) {

    return `
      <select name="status">

        <option value="New">
          New
        </option>

        <option value="Draft">
          Draft
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
    field ===
    "priority"
  ) {

    return `
      <select name="priority">

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
   RECORD MODAL
========================================================= */

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
      `Add one ${titleFor(table)} first.`,
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
        <form id="recordForm">

          <div class="form-grid">

            ${fields
              .map(
                field => `
                  <label>

                    ${escapeHtml(
                      humanize(field)
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
                  ? "Save Changes"
                  : `Create ${titleFor(table)}`
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
            `${titleFor(table)} ${
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

function formPayload(form) {

  const payload = {};

  new FormData(form)
    .forEach(
      (value, key) => {

        const text =
          String(value).trim();

        if (text !== "") {

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
        ([key, value]) => `

          <div class="detail-item">

            <div class="detail-label">
              ${escapeHtml(
                humanize(key)
              )}
            </div>

            <div class="detail-value">
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
        <div class="detail-grid">

          ${details}

        </div>

        <div class="modal-actions">

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
   DELETE
========================================================= */

async function deleteRecord(
  table,
  record
) {

  if (
    !window.confirm(
      `Delete this ${titleFor(table).toLowerCase()}? This cannot be undone.`
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

  } catch (error) {

    notify(
      error.message,
      "error"
    );
  }
}

/* =========================================================
   QUOTATION CALCULATION
========================================================= */

function calculateQuotationValues(
  items,
  formData
) {

  const subtotal =
    items.reduce(
      (total, item) => {

        const qty =
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

        return (
          total +
          qty * rate
        );
      },
      0
    );

  const discountPercent =
    Number(
      formData.discount_percent ||
      0
    );

  const freight =
    Number(
      formData.freight ||
      0
    );

  const gstPercent =
    Number(
      formData.gst_percent ||
      18
    );

  const discountAmount =
    subtotal *
    discountPercent /
    100;

  const taxableAmount =
    subtotal -
    discountAmount +
    freight;

  const gstAmount =
    taxableAmount *
    gstPercent /
    100;

  const grandTotal =
    taxableAmount +
    gstAmount;

  return {

    subtotal:
      Number(
        subtotal.toFixed(2)
      ),

    discount_percent:
      Number(
        discountPercent.toFixed(2)
      ),

    discount_amount:
      Number(
        discountAmount.toFixed(2)
      ),

    freight:
      Number(
        freight.toFixed(2)
      ),

    taxable_amount:
      Number(
        taxableAmount.toFixed(2)
      ),

    gst_percent:
      Number(
        gstPercent.toFixed(2)
      ),

    gst_amount:
      Number(
        gstAmount.toFixed(2)
      ),

    grand_total:
      Number(
        grandTotal.toFixed(2)
      )
  };
}

/* =========================================================
   QUOTATION NUMBER
========================================================= */

async function getNextQuotationNumber() {

  try {

    const result =
      await apiGet(
        "/quotations/next-number"
      );

    return (
      result.quotation_number ||
      ""
    );

  } catch (error) {

    console.warn(
      "Could not get quotation number",
      error
    );

    return "";
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

    const quotations =
      await safeList(
        "quotations"
      );

    if (
      request !== pageRequest
    ) {
      return;
    }

    const content =
      getContent();

    content.innerHTML = `

      <div class="toolbar">

        <div class="toolbar-left">

          <input
            id="quotationSearch"
            type="search"
            placeholder="Search quotation..."
            autocomplete="off"
          >

        </div>

        <button
          type="button"
          class="button-primary"
          id="newQuotationButton"
        >
          + New Quotation
        </button>

      </div>

      <div class="panel">

        <div class="panel-header">

          <h2>
            Quotations
          </h2>

        </div>

        <div class="panel-body">

          ${
            quotations.length
              ? `
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
                          Discount
                        </th>

                        <th>
                          Freight
                        </th>

                        <th>
                          GST
                        </th>

                        <th>
                          Grand Total
                        </th>

                        <th>
                          Status
                        </th>

                        <th>
                          Action
                        </th>

                      </tr>

                    </thead>

                    <tbody
                      id="quotationBody"
                    >

                    </tbody>

                  </table>

                </div>
              `
              : `
                <div
                  class="empty"
                  id="quotationEmpty"
                >

                  <div class="empty-icon">
                    📄
                  </div>

                  <h3>
                    No quotations yet
                  </h3>

                  <p>
                    Create your first quotation.
                  </p>

                </div>
              `
          }

        </div>

      </div>
    `;

    const draw =
      () => {

        const query =
          (
            content.querySelector(
              "#quotationSearch"
            )?.value ||
            ""
          )
            .trim()
            .toLowerCase();

        const visible =
          quotations.filter(
            quotation => {

              if (!query) {
                return true;
              }

              return Object.values(
                quotation
              ).some(
                value =>
                  String(
                    value ?? ""
                  )
                    .toLowerCase()
                    .includes(query)
              );
            }
          );

        const body =
          content.querySelector(
            "#quotationBody"
          );

        if (!body) return;

        body.innerHTML =
          visible
            .map(
              quotation => `

                <tr>

                  <td>
                    <strong>
                      ${escapeHtml(
                        valueFor(
                          quotation,
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
                        quotation,
                        [
                          "customer_name",
                          "company_name",
                          "customer_id"
                        ]
                      )
                    )}
                  </td>

                  <td>
                    ${formatDate(
                      quotation.quotation_date
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      Number(
                        quotation.discount_percent ||
                        0
                      )
                    )}%
                  </td>

                  <td>
                    ${formatCurrency(
                      quotation.freight ||
                      0
                    )}
                  </td>

                  <td>
                    ${formatCurrency(
                      quotation.gst_amount ||
                      0
                    )}
                  </td>

                  <td>
                    <strong>
                      ${formatCurrency(
                        quotation.grand_total ||
                        0
                      )}
                    </strong>
                  </td>

                  <td>
                    ${badge(
                      quotation.status ||
                      "Draft"
                    )}
                  </td>

                  <td
                    class="table-actions"
                  >

                    <button
                      type="button"
                      data-qaction="view"
                      data-id="${quotation.id}"
                    >
                      View
                    </button>

                    <button
                      type="button"
                      data-qaction="edit"
                      data-id="${quotation.id}"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      data-qaction="delete"
                      data-id="${quotation.id}"
                    >
                      Delete
                    </button>

                  </td>

                </tr>

              `
            )
            .join("");
      };

    content
      .querySelector(
        "#newQuotationButton"
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
      ?.addEventListener(
        "input",
        draw
      );

    content
      .querySelector(
        "#quotationBody"
      )
      ?.addEventListener(
        "click",
        async event => {

          const button =
            event.target.closest(
              "button[data-qaction]"
            );

          if (!button) return;

          const id =
            button.dataset.id;

          const quotation =
            quotations.find(
              row =>
                String(row.id) ===
                String(id)
            );

          if (!quotation) {
            return;
          }

          if (
            button.dataset.qaction ===
            "delete"
          ) {

            await deleteRecord(
              "quotations",
              quotation
            );

          } else if (
            button.dataset.qaction ===
            "edit"
          ) {

            await openQuotationEditor(
              quotation.id
            );

          } else {

            await openQuotationView(
              quotation.id
            );
          }
        }
      );

    draw();

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

/* =========================================================
   QUOTATION EDITOR
========================================================= */

async function openQuotationEditor(
  quotationId = null
) {

  let quotation = null;
  let items = [];

  try {

    if (quotationId) {

      const result =
        await apiGet(
          `/quotations/${quotationId}/details`
        );

      quotation =
        result.quotation;

      items =
        result.items || [];
    }

  } catch (error) {

    notify(
      error.message,
      "error"
    );

    return;
  }

  const quotationNumber =
    quotation?.quotation_number ||
    await getNextQuotationNumber();

  const customers =
    customersCache.length
      ? customersCache
      : await safeList(
          "customers"
        );

  const products =
    productsCache.length
      ? productsCache
      : await safeList(
          "products"
        );

  const modal =
    openModal(
      quotationId
        ? "Edit Quotation"
        : "New Quotation",

      quotationEditorHtml(
        quotation,
        quotationNumber,
        customers,
        products,
        items
      ),

      "quotation-modal"
    );

  setupQuotationEditor(
    modal,
    quotation,
    quotationNumber,
    customers,
    products,
    items
  );
}

/* =========================================================
   QUOTATION EDITOR HTML
========================================================= */

function quotationEditorHtml(
  quotation,
  quotationNumber,
  customers,
  products,
  items
) {

  const customerOptions =
    customers
      .map(
        customer => `

          <option
            value="${escapeHtml(
              customer.id
            )}"

            ${
              String(
                quotation?.customer_id ||
                ""
              ) ===
              String(customer.id)
                ? "selected"
                : ""
            }
          >

            ${escapeHtml(
              customer.company_name ||
              customer.contact_person ||
              customer.name ||
              `Customer #${customer.id}`
            )}

          </option>
        `
      )
      .join("");

  return `

    <div class="quotation-editor">

      <div class="quotation-top">

        <div>

          <h2>
            ${
              quotation
                ? "Edit Quotation"
                : "Create New Quotation"
            }
          </h2>

          <p>
            Prepare professional quotation
            with discount, freight and GST.
          </p>

        </div>

        <div class="quotation-number-box">

          <span>
            Quotation No.
          </span>

          <strong id="quotationNumberDisplay">
            ${escapeHtml(
              quotationNumber
            )}
          </strong>

        </div>

      </div>

      <div class="quotation-section">

        <div class="form-grid">

          <label>

            Customer

            <select
              name="customer_id"
              id="quoteCustomer"
            >

              <option value="">
                Select Customer
              </option>

              ${customerOptions}

            </select>

          </label>

          <label>

            Quotation Date

            <input
              type="date"
              name="quotation_date"
              id="quoteDate"
              value="${
                quotation?.quotation_date
                  ? String(
                      quotation.quotation_date
                    ).slice(0, 10)
                  : new Date()
                      .toISOString()
                      .slice(0, 10)
              }"
            >

          </label>

          <label>

            Valid Until

            <input
              type="date"
              name="valid_until"
              id="quoteValidUntil"
              value="${
                quotation?.valid_until
                  ? String(
                      quotation.valid_until
                    ).slice(0, 10)
                  : ""
              }"
            >

          </label>

          <label>

            Status

            <select
              name="status"
              id="quoteStatus"
            >

              ${[
                "Draft",
                "Quotation Sent",
                "Negotiation",
                "Won",
                "Lost"
              ]
                .map(
                  status => `
                    <option
                      value="${status}"
                      ${
                        (
                          quotation?.status ||
                          "Draft"
                        ) === status
                          ? "selected"
                          : ""
                      }
                    >
                      ${status}
                    </option>
                  `
                )
                .join("")}

            </select>

          </label>

        </div>

      </div>

      <div class="quotation-section">

        <div class="section-title-row">

          <h3>
            Products / Items
          </h3>

          <button
            type="button"
            class="button-primary"
            id="addQuoteItem"
          >
            + Add Item
          </button>

        </div>

        <div
          class="table-wrapper"
        >

          <table>

            <thead>

              <tr>

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
                  Amount
                </th>

                <th>
                  Action
                </th>

              </tr>

            </thead>

            <tbody
              id="quoteItemsBody"
            ></tbody>

          </table>

        </div>

      </div>

      <div class="quotation-bottom">

        <div class="quotation-notes">

          <label>

            Notes

            <textarea
              id="quoteNotes"
              rows="5"
              placeholder="Quotation notes / terms..."
            >${escapeHtml(
              quotation?.notes || ""
            )}</textarea>

          </label>

        </div>

        <div class="quotation-summary">

          <div class="summary-row">

            <span>
              Subtotal
            </span>

            <strong
              id="quoteSubtotal"
            >
              ₹0.00
            </strong>

          </div>

          <div class="summary-row discount-row">

            <span>
              Discount
            </span>

            <div class="summary-input">

              <input
                type="number"
                id="quoteDiscountPercent"
                min="0"
                max="100"
                step="0.01"
                value="${
                  quotation?.discount_percent ||
                  0
                }"
              >

              <span>
                %
              </span>

            </div>

            <strong
              id="quoteDiscountAmount"
            >
              ₹0.00
            </strong>

          </div>

          <div class="summary-row">

            <span>
              Freight
            </span>

            <input
              type="number"
              id="quoteFreight"
              min="0"
              step="0.01"
              value="${
                quotation?.freight ||
                0
              }"
            >

          </div>

          <div class="summary-row">

            <span>
              Taxable Amount
            </span>

            <strong
              id="quoteTaxable"
            >
              ₹0.00
            </strong>

          </div>

          <div class="summary-row">

            <span>
              GST
            </span>

            <div class="summary-input">

              <input
                type="number"
                id="quoteGstPercent"
                min="0"
                step="0.01"
                value="${
                  quotation?.gst_percent ||
                  18
                }"
              >

              <span>
                %
              </span>

            </div>

            <strong
              id="quoteGstAmount"
            >
              ₹0.00
            </strong>

          </div>

          <div class="summary-grand">

            <span>
              GRAND TOTAL
            </span>

            <strong
              id="quoteGrandTotal"
            >
              ₹0.00
            </strong>

          </div>

        </div>

      </div>

      <div
        class="quotation-actions"
      >

        <button
          type="button"
          class="button-secondary"
          data-close
        >
          Cancel
        </button>

        <button
          type="button"
          class="button-primary"
          id="saveQuotationButton"
        >
          ${
            quotation
              ? "Update Quotation"
              : "Save Quotation"
          }
        </button>

      </div>

    </div>
  `;
}

/* =========================================================
   QUOTATION EDITOR SETUP
========================================================= */

function setupQuotationEditor(
  modal,
  quotation,
  quotationNumber,
  customers,
  products,
  items
) {

  const body =
    modal.host.querySelector(
      "#quoteItemsBody"
    );

  let quoteItems =
    items.map(
      item => ({
        id: item.id,
        product_id:
          item.product_id || "",
        description:
          item.description || "",
        quantity:
          Number(
            item.quantity ||
            item.qty ||
            1
          ),
        rate:
          Number(
            item.rate ||
            item.price ||
            0
          )
      })
    );

  const renderItems =
    () => {

      if (!quoteItems.length) {

        body.innerHTML = `
          <tr>

            <td
              colspan="6"
              style="text-align:center;padding:25px"
            >
              No items added.
              Click "Add Item".
            </td>

          </tr>
        `;

        return;
      }

      body.innerHTML =
        quoteItems
          .map(
            (item, index) => {

              const amount =
                Number(
                  item.quantity || 0
                ) *
                Number(
                  item.rate || 0
                );

              return `

                <tr>

                  <td>

                    <select
                      data-item-product="${index}"
                    >

                      <option value="">
                        Select Product
                      </option>

                      ${products
                        .map(
                          product => `

                            <option
                              value="${product.id}"
                              ${
                                String(
                                  item.product_id
                                ) ===
                                String(
                                  product.id
                                )
                                  ? "selected"
                                  : ""
                              }
                            >

                              ${escapeHtml(
                                product.name ||
                                product.product_name ||
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
                      data-item-description="${index}"
                      value="${escapeHtml(
                        item.description
                      )}"
                      placeholder="Description"
                    >

                  </td>

                  <td>

                    <input
                      type="number"
                      min="0"
                      step="any"
                      data-item-qty="${index}"
                      value="${item.quantity}"
                    >

                  </td>

                  <td>

                    <input
                      type="number"
                      min="0"
                      step="any"
                      data-item-rate="${index}"
                      value="${item.rate}"
                    >

                  </td>

                  <td>

                    <strong>
                      ${formatCurrency(
                        amount
                      )}
                    </strong>

                  </td>

                  <td>

                    <button
                      type="button"
                      data-remove-item="${index}"
                    >
                      Remove
                    </button>

                  </td>

                </tr>
              `;
            }
          )
          .join("");
    };

  const updateTotals =
    () => {

      const subtotal =
        quoteItems.reduce(
          (
            total,
            item
          ) => {

            return (
              total +
              (
                Number(
                  item.quantity || 0
                ) *
                Number(
                  item.rate || 0
                )
              )
            );
          },
          0
        );

      const discountPercent =
        Number(
          modal.host.querySelector(
            "#quoteDiscountPercent"
          )?.value ||
          0
        );

      const freight =
        Number(
          modal.host.querySelector(
            "#quoteFreight"
          )?.value ||
          0
        );

      const gstPercent =
        Number(
          modal.host.querySelector(
            "#quoteGstPercent"
          )?.value ||
          18
        );

      const discountAmount =
        subtotal *
        discountPercent /
        100;

      const taxableAmount =
        subtotal -
        discountAmount +
        freight;

      const gstAmount =
        taxableAmount *
        gstPercent /
        100;

      const grandTotal =
        taxableAmount +
        gstAmount;

      modal.host.querySelector(
        "#quoteSubtotal"
      ).textContent =
        formatCurrency(
          subtotal
        );

      modal.host.querySelector(
        "#quoteDiscountAmount"
      ).textContent =
        formatCurrency(
          discountAmount
        );

      modal.host.querySelector(
        "#quoteTaxable"
      ).textContent =
        formatCurrency(
          taxableAmount
        );

      modal.host.querySelector(
        "#quoteGstAmount"
      ).textContent =
        formatCurrency(
          gstAmount
        );

      modal.host.querySelector(
        "#quoteGrandTotal"
      ).textContent =
        formatCurrency(
          grandTotal
        );

      return {
        subtotal,
        discount_percent:
          discountPercent,
        discount_amount:
          discountAmount,
        freight,
        taxable_amount:
          taxableAmount,
        gst_percent:
          gstPercent,
        gst_amount:
          gstAmount,
        grand_total:
          grandTotal
      };
    };

  renderItems();
  updateTotals();

  modal.host
    .querySelector(
      "#addQuoteItem"
    )
    .addEventListener(
      "click",
      () => {

        quoteItems.push({
          product_id: "",
          description: "",
          quantity: 1,
          rate: 0
        });

        renderItems();
        updateTotals();
      }
    );

  body.addEventListener(
    "input",
    event => {

      const el =
        event.target;

      if (
        el.dataset.itemQty !==
        undefined
      ) {

        const index =
          Number(
            el.dataset.itemQty
          );

        quoteItems[index].quantity =
          Number(
            el.value || 0
          );

        renderItems();
        updateTotals();
      }

      if (
        el.dataset.itemRate !==
        undefined
      ) {

        const index =
          Number(
            el.dataset.itemRate
          );

        quoteItems[index].rate =
          Number(
            el.value || 0
          );

        renderItems();
        updateTotals();
      }

      if (
        el.dataset.itemDescription !==
        undefined
      ) {

        const index =
          Number(
            el.dataset.itemDescription
          );

        quoteItems[index].description =
          el.value;
      }
    }
  );

  body.addEventListener(
    "change",
    event => {

      const el =
        event.target;

      if (
        el.dataset.itemProduct !==
        undefined
      ) {

        const index =
          Number(
            el.dataset.itemProduct
          );

        const productId =
          el.value;

        quoteItems[index].product_id =
          productId;

        const product =
          products.find(
            p =>
              String(p.id) ===
              String(productId)
          );

        if (product) {

          quoteItems[index].description =
            product.description ||
            product.name ||
            product.product_name ||
            "";

          quoteItems[index].rate =
            Number(
              product.selling_price ||
              product.price ||
              product.rate ||
              0
            );
        }

        renderItems();
        updateTotals();
      }
    }
  );

  body.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-remove-item]"
        );

      if (!button) return;

      const index =
        Number(
          button.dataset.removeItem
        );

      quoteItems.splice(
        index,
        1
      );

      renderItems();
      updateTotals();
    }
  );

  [
    "#quoteDiscountPercent",
    "#quoteFreight",
    "#quoteGstPercent"
  ].forEach(
    selector => {

      modal.host
        .querySelector(
          selector
        )
        .addEventListener(
          "input",
          updateTotals
        );
    }
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
      "#saveQuotationButton"
    )
    .addEventListener(
      "click",
      async () => {

        const saveButton =
          modal.host.querySelector(
            "#saveQuotationButton"
          );

        saveButton.disabled =
          true;

        saveButton.textContent =
          "Saving...";

        try {

          const totals =
            updateTotals();

          const customerId =
            modal.host.querySelector(
              "#quoteCustomer"
            ).value;

          if (!customerId) {

            throw new Error(
              "Please select a customer."
            );
          }

          if (!quoteItems.length) {

            throw new Error(
              "Please add at least one item."
            );
          }

          const payload = {

            quotation_number:
              quotationNumber,

            customer_id:
              Number(
                customerId
              ),

            quotation_date:
              modal.host.querySelector(
                "#quoteDate"
              ).value,

            valid_until:
              modal.host.querySelector(
                "#quoteValidUntil"
              ).value || null,

            status:
              modal.host.querySelector(
                "#quoteStatus"
              ).value,

            subtotal:
              totals.subtotal,

            discount_percent:
              totals.discount_percent,

            discount:
              totals.discount_amount,

            discount_amount:
              totals.discount_amount,

            freight:
              totals.freight,

            taxable_amount:
              totals.taxable_amount,

            gst_percent:
              totals.gst_percent,

            gst_amount:
              totals.gst_amount,

            grand_total:
              totals.grand_total,

            notes:
              modal.host.querySelector(
                "#quoteNotes"
              ).value
          };

          let saved;

          if (quotation) {

            saved =
              await apiPut(
                `/quotations/${quotation.id}`,
                payload
              );

          } else {

            saved =
              await apiPost(
                "/quotations",
                payload
              );
          }

          const quotationId =
            saved.id ||
            quotation?.id;

          /*
             Save quotation items.
          */

          if (!quotation) {

            for (
              const item of quoteItems
            ) {

              await apiPost(
                `/quotations/${quotationId}/items`,
                {
                  product_id:
                    item.product_id
                      ? Number(
                          item.product_id
                        )
                      : null,

                  description:
                    item.description,

                  quantity:
                    Number(
                      item.quantity
                    ),

                  rate:
                    Number(
                      item.rate
                    ),

                  amount:
                    Number(
                      item.quantity
                    ) *
                    Number(
                      item.rate
                    )
                }
              );
            }

          }

          notify(
            "Quotation saved successfully."
          );

          /*
             Show success screen instead
             of immediately closing.
          */

          modal.host.innerHTML = `

            <div
              class="quotation-success"
            >

              <div
                class="success-icon"
              >
                ✓
              </div>

              <h2>
                Quotation Saved Successfully
              </h2>

              <p>
                Quotation No:
                <strong>
                  ${escapeHtml(
                    saved.quotation_number ||
                    quotationNumber
                  )}
                </strong>
              </p>

              <p>
                Grand Total:
                <strong>
                  ${formatCurrency(
                    totals.grand_total
                  )}
                </strong>
              </p>

              <div
                class="modal-actions"
              >

                <button
                  type="button"
                  class="button-secondary"
                  id="successClose"
                >
                  Close
                </button>

                <button
                  type="button"
                  class="button-primary"
                  id="newQuotationAfterSave"
                >
                  + New Quotation
                </button>

              </div>

            </div>
          `;

          modal.host
            .querySelector(
              "#successClose"
            )
            .addEventListener(
              "click",
              () => {

                modal.close();

                showPage(
                  "quotations"
                );
              }
            );

          modal.host
            .querySelector(
              "#newQuotationAfterSave"
            )
            .addEventListener(
              "click",
              () => {

                modal.close();

                openQuotationEditor();
              }
            );

        } catch (error) {

          notify(
            error.message,
            "error"
          );

          saveButton.disabled =
            false;

          saveButton.textContent =
            quotation
              ? "Update Quotation"
              : "Save Quotation";
        }
      }
    );
}

/* =========================================================
   QUOTATION VIEW
========================================================= */

async function openQuotationView(
  quotationId
) {

  try {

    const result =
      await apiGet(
        `/quotations/${quotationId}/details`
      );

    const quotation =
      result.quotation;

    const items =
      result.items || [];

    const itemRows =
      items
        .map(
          (item, index) => {

            const qty =
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

            return `

              <tr>

                <td>
                  ${index + 1}
                </td>

                <td>
                  ${escapeHtml(
                    item.description ||
                    item.product_name ||
                    "Item"
                  )}
                </td>

                <td>
                  ${qty}
                </td>

                <td>
                  ${formatCurrency(
                    rate
                  )}
                </td>

                <td>
                  ${formatCurrency(
                    qty * rate
                  )}
                </td>

              </tr>
            `;
          }
        )
        .join("");

    openModal(

      `Quotation ${
        quotation.quotation_number ||
        quotation.id
      }`,

      `

        <div
          class="quotation-view"
        >

          <div
            class="quotation-view-header"
          >

            <div>

              <h2>
                ${
                  quotation.quotation_number ||
                  `Quotation #${quotation.id}`
                }
              </h2>

              <p>
                Date:
                ${formatDate(
                  quotation.quotation_date
                )}
              </p>

            </div>

            <div>

              ${badge(
                quotation.status ||
                "Draft"
              )}

            </div>

          </div>

          <div
            class="table-wrapper"
          >

            <table>

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
                    Amount
                  </th>

                </tr>

              </thead>

              <tbody>

                ${itemRows}

              </tbody>

            </table>

          </div>

          <div
            class="quotation-view-summary"
          >

            <div>
              Subtotal:
              <strong>
                ${formatCurrency(
                  quotation.subtotal
                )}
              </strong>
            </div>

            <div>
              Discount (
              ${
                quotation.discount_percent ||
                0
              }%):
              <strong>
                ${formatCurrency(
                  quotation.discount_amount ||
                  quotation.discount ||
                  0
                )}
              </strong>
            </div>

            <div>
              Freight:
              <strong>
                ${formatCurrency(
                  quotation.freight ||
                  0
                )}
              </strong>
            </div>

            <div>
              Taxable Amount:
              <strong>
                ${formatCurrency(
                  quotation.taxable_amount ||
                  0
                )}
              </strong>
            </div>

            <div>
              GST (
              ${
                quotation.gst_percent ||
                18
              }%):
              <strong>
                ${formatCurrency(
                  quotation.gst_amount ||
                  0
                )}
              </strong>
            </div>

            <div
              class="grand-total"
            >
              Grand Total:
              <strong>
                ${formatCurrency(
                  quotation.grand_total ||
                  0
                )}
              </strong>
            </div>

          </div>

        </div>
      `,

      "modal-large"
    );

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
   SHOW PAGE
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

  try {

    if (
      page ===
      "dashboard"
    ) {

      return renderDashboard();
    }

    if (
      page ===
      "customers"
    ) {

      return renderCustomers();
    }

    if (
      page ===
      "products"
    ) {

      return renderProducts();
    }

    if (
      page ===
      "enquiries"
    ) {

      return renderEnquiries();
    }

    if (
      page ===
      "quotations"
    ) {

      return renderQuotations();
    }

    return renderSimpleTable(
      page
    );

  } catch (error) {

    console.error(
      "PAGE ERROR:",
      error
    );

    showError(
      error,
      true
    );
  }
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
      /#([a-z-]+)/i
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
   CSS
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

    .toolbar {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:16px;
      margin:0 0 20px;
    }

    .toolbar-left {
      display:flex;
      flex:1;
      gap:10px;
      flex-wrap:wrap;
    }

    .toolbar input,
    .toolbar select,
    .form-grid input,
    .form-grid select,
    .form-grid textarea {
      box-sizing:border-box;
      width:100%;
      padding:10px 12px;
      border:1px solid #d7dce2;
      border-radius:8px;
      background:#fff;
    }

    .loading {
      padding:60px;
      text-align:center;
      font-size:18px;
    }

    .quotation-modal {
      width:min(1100px,95vw);
      max-height:92vh;
      overflow:auto;
    }

    .quotation-editor {
      padding:5px;
    }

    .quotation-top {
      display:flex;
      justify-content:space-between;
      gap:20px;
      margin-bottom:20px;
      padding-bottom:15px;
      border-bottom:1px solid #e5e7eb;
    }

    .quotation-number-box {
      min-width:180px;
      padding:14px;
      border:1px solid #ddd;
      border-radius:10px;
      text-align:right;
    }

    .quotation-number-box span {
      display:block;
      font-size:12px;
      opacity:.7;
    }

    .quotation-number-box strong {
      display:block;
      margin-top:5px;
      font-size:18px;
    }

    .quotation-section {
      margin-bottom:20px;
      padding:18px;
      border:1px solid #e5e7eb;
      border-radius:12px;
    }

    .section-title-row {
      display:flex;
      align-items:center;
      justify-content:space-between;
      margin-bottom:15px;
    }

    .section-title-row h3 {
      margin:0;
    }

    .quotation-bottom {
      display:grid;
      grid-template-columns:1fr 400px;
      gap:25px;
      margin-top:20px;
    }

    .quotation-summary {
      padding:20px;
      border:1px solid #ddd;
      border-radius:12px;
    }

    .summary-row {
      display:grid;
      grid-template-columns:1fr auto;
      align-items:center;
      gap:10px;
      padding:10px 0;
      border-bottom:1px solid #eee;
    }

    .discount-row {
      grid-template-columns:1fr auto auto;
    }

    .summary-input {
      display:flex;
      align-items:center;
      gap:5px;
    }

    .summary-input input {
      width:75px;
      padding:7px;
      border:1px solid #ccc;
      border-radius:6px;
    }

    .summary-row > input {
      width:120px;
      padding:7px;
      border:1px solid #ccc;
      border-radius:6px;
    }

    .summary-grand {
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-top:15px;
      padding-top:15px;
      border-top:2px solid #222;
      font-size:20px;
    }

    .summary-grand strong {
      font-size:24px;
    }

    .quotation-actions {
      display:flex;
      justify-content:flex-end;
      gap:10px;
      margin-top:20px;
    }

    .quotation-success {
      padding:45px 25px;
      text-align:center;
    }

    .success-icon {
      width:65px;
      height:65px;
      margin:0 auto 15px;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:35px;
      background:#e7f7ed;
      color:#16803c;
    }

    .quotation-success h2 {
      margin-bottom:10px;
    }

    .quotation-success .modal-actions {
      justify-content:center;
    }

    .quotation-view-header {
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:20px;
    }

    .quotation-view-summary {
      width:380px;
      margin-left:auto;
      margin-top:20px;
    }

    .quotation-view-summary > div {
      display:flex;
      justify-content:space-between;
      padding:8px 0;
      border-bottom:1px solid #eee;
    }

    .quotation-view-summary .grand-total {
      margin-top:8px;
      padding-top:12px;
      border-top:2px solid #222;
      font-size:20px;
    }

    @media(max-width:800px) {

      .quotation-bottom {
        grid-template-columns:1fr;
      }

      .quotation-top {
        flex-direction:column;
      }

      .quotation-view-summary {
        width:100%;
      }

      .toolbar {
        flex-direction:column;
        align-items:stretch;
      }
    }

  `;

  document.head.appendChild(
    style
  );
}

/* =========================================================
   INITIALIZE
========================================================= */

function initializeCRM() {

  ensureCrmUiStyles();

  document
    .querySelectorAll(
      "[data-page]"
    )
    .forEach(
      element => {

        element.addEventListener(
          "click",
          event => {

            const page =
              pageFromNavigation(
                element
              );

            if (!page) return;

            event.preventDefault();

            showPage(
              page
            );
          }
        );
      }
    );

  /*
    Also support normal navigation
    links containing #customers etc.
  */

  document
    .querySelectorAll(
      'a[href^="#"]'
    )
    .forEach(
      element => {

        element.addEventListener(
          "click",
          event => {

            const page =
              pageFromNavigation(
                element
              );

            if (!page) return;

            event.preventDefault();

            showPage(
              page
            );
          }
        );
      }
    );

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
