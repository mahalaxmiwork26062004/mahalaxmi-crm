"use strict";

/* =========================================================
   MAHALAXMI ENTERPRISE CRM
   FRONTEND
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
    subtitle: "Create professional quotations"
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
  payments: "Payment"
};

/* =========================================================
   API
========================================================= */

async function apiRequest(
  endpoint,
  options = {}
) {
  const response = await fetch(
    `${API}${endpoint}`,
    {
      ...options,

      headers: {
        "Content-Type":
          "application/json",

        ...(options.headers || {})
      }
    }
  );

  let result;

  try {
    result =
      await response.json();
  } catch {
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

const apiGet =
  endpoint =>
    apiRequest(endpoint);

const apiPost =
  (endpoint, data) =>
    apiRequest(
      endpoint,
      {
        method: "POST",
        body: JSON.stringify(data)
      }
    );

const apiPut =
  (endpoint, data) =>
    apiRequest(
      endpoint,
      {
        method: "PUT",
        body: JSON.stringify(data)
      }
    );

const apiDelete =
  endpoint =>
    apiRequest(
      endpoint,
      {
        method: "DELETE"
      }
    );

/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(value) {
  return value == null
    ? ""
    : String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatCurrency(value) {
  return Number(value || 0)
    .toLocaleString(
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

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
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

function number(value) {
  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : 0;
}

function round2(value) {
  return Math.round(
    (number(value) +
      Number.EPSILON) *
      100
  ) / 100;
}

function humanize(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      c => c.toUpperCase()
    );
}

function getContent() {
  return document.getElementById(
    "content"
  );
}

/* =========================================================
   NOTIFICATION
========================================================= */

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

    box.id =
      "crmToast";

    box.className =
      "crm-toast";

    document.body.appendChild(
      box
    );
  }

  box.textContent =
    message;

  box.dataset.type =
    type;

  box.classList.add(
    "show"
  );

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
   LOADING
========================================================= */

function showLoading(
  message = "Loading..."
) {
  const content =
    getContent();

  if (!content) return;

  content.innerHTML = `
    <div class="crm-loading">
      <div class="crm-spinner"></div>
      <div>${escapeHtml(
        message
      )}</div>
    </div>
  `;
}

function showError(
  error,
  retry = true
) {
  const content =
    getContent();

  if (!content) return;

  content.innerHTML = `
    <div class="panel">
      <div class="panel-body">
        <div class="empty">
          <div class="empty-icon">⚠️</div>

          <h3>
            Unable to load this page
          </h3>

          <p>
            ${escapeHtml(
              error.message
            )}
          </p>

          ${
            retry
              ? `
                <button
                  class="button-primary"
                  id="retryPage"
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

  document
    .getElementById(
      "retryPage"
    )
    ?.addEventListener(
      "click",
      () =>
        showPage(
          currentPage
        )
    );
}

/* =========================================================
   HEADER
========================================================= */

function updatePageHeader(
  page
) {
  const info =
    PAGE_INFO[page] ||
    PAGE_INFO.dashboard;

  const title =
    document.getElementById(
      "pageTitle"
    );

  const subtitle =
    document.getElementById(
      "pageSubtitle"
    );

  if (title)
    title.textContent =
      info.title;

  if (subtitle)
    subtitle.textContent =
      info.subtitle;
}

/* =========================================================
   SAFE LIST
========================================================= */

async function safeList(
  table
) {
  try {
    const result =
      await apiGet(
        `/${table}`
      );

    return Array.isArray(
      result.data
    )
      ? result.data
      : [];
  } catch (error) {
    console.warn(
      `Unable to load ${table}`,
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
      await Promise.all([
        safeList(
          "customers"
        ),
        safeList(
          "products"
        ),
        safeList(
          "enquiries"
        ),
        safeList(
          "quotations"
        ),
        safeList(
          "orders"
        ),
        safeList(
          "followups"
        )
      ]);

    if (
      request !==
      pageRequest
    ) {
      return;
    }

    const quoteValue =
      quotations.reduce(
        (
          sum,
          row
        ) =>
          sum +
          number(
            row.grand_total ||
            row.total ||
            row.amount
          ),
        0
      );

    getContent()
      .innerHTML = `
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
              #${escapeHtml(
                row.id
              )}
            </td>

            <td>
              ${escapeHtml(
                row.subject ||
                row.requirement ||
                ""
              )}
            </td>

            <td>
              ${badge(
                row.status ||
                "New"
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
                row.quotation_number ||
                row.number ||
                row.id
              )}
            </td>

            <td>
              ${badge(
                row.status ||
                "Draft"
              )}
            </td>

            <td>
              ${formatCurrency(
                row.grand_total ||
                0
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
              "Across quotations"
            )}

          </div>

        </div>
      </div>
    `;
  } catch (error) {
    if (
      request ===
      pageRequest
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
        ${escapeHtml(
          label
        )}
      </div>

      <div class="stat-value">
        ${escapeHtml(
          value
        )}
      </div>

      <div class="stat-footer">
        ${escapeHtml(
          footer
        )}
      </div>

    </div>
  `;
}

function recentPanel(
  title,
  page,
  data,
  template
) {
  return `
    <div class="panel">

      <div class="panel-header">

        <h2>
          ${escapeHtml(
            title
          )}
        </h2>

        <button
          class="button-secondary"
          data-page="${page}"
        >
          View All
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
                      .slice(
                        0,
                        5
                      )
                      .map(
                        row =>
                          `<tr>${template(
                            row
                          )}</tr>`
                      )
                      .join(
                        ""
                      )}

                  </tbody>

                </table>

              </div>
            `
            : `
              <div class="empty">
                No records yet
              </div>
            `
        }

      </div>

    </div>
  `;
}

/* =========================================================
   CUSTOMERS
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

/* =========================================================
   PRODUCTS
========================================================= */

async function renderProducts() {
  productsCache =
    await renderEntityPage(
      "products",
      {
        search: true
      }
    );
}

/* =========================================================
   ENQUIRIES
========================================================= */

async function renderEnquiries() {
  return renderEntityPage(
    "enquiries",
    {
      search: true,
      filters: [
        "status",
        "source",
        "priority"
      ]
    }
  );
}

/* =========================================================
   GENERIC ENTITY PAGE
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
      await safeList(
        table
      );

    if (
      request !==
      pageRequest
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
      request ===
      pageRequest
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
   TABLE
========================================================= */

function preferredColumns(
  table,
  data
) {
  const defaults = {
    customers: [
      "id",
      "company_name",
      "contact_person",
      "mobile",
      "email",
      "city"
    ],

    products: [
      "id",
      "name",
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
      "priority"
    ],

    quotations: [
      "id",
      "quotation_number",
      "customer_id",
      "quotation_date",
      "grand_total",
      "status"
    ],

    orders: [
      "id",
      "order_number",
      "customer_id",
      "order_date",
      "grand_total",
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
        available.has(
          key
        )
    );

  return selected.length
    ? selected
    : [
        ...available
      ].slice(
        0,
        7
      );
}

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
              >
            `
            : ""
        }

      </div>

      <button
        class="button-primary"
        id="newRecordButton"
      >
        + New ${escapeHtml(
          TABLE_TITLES[
            table
          ] || humanize(table)
        )}
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
                        humanize(
                          key
                        )
                      )}</th>`
                  )
                  .join(
                    ""
                  )}

                <th>
                  Actions
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
          No records found
        </div>

      </div>

    </div>
  `;

  const draw =
    () => {
      const search =
        (
          content.querySelector(
            "#tableSearch"
          )?.value ||
          ""
        )
          .toLowerCase()
          .trim();

      const visible =
        data.filter(
          row =>
            !search ||
            Object.values(
              row
            ).some(
              value =>
                String(
                  value ??
                    ""
                )
                  .toLowerCase()
                  .includes(
                    search
                  )
            )
        );

      const body =
        content.querySelector(
          "#recordsBody"
        );

      body.innerHTML =
        visible
          .map(
            row =>
              `
                <tr>

                  ${columns
                    .map(
                      key =>
                        `<td>${cellValue(
                          row[
                            key
                          ],
                          key
                        )}</td>`
                    )
                    .join(
                      ""
                    )}

                  <td class="table-actions">

                    <button
                      data-action="view"
                      data-id="${row.id}"
                    >
                      View
                    </button>

                    <button
                      data-action="edit"
                      data-id="${row.id}"
                    >
                      Edit
                    </button>

                    <button
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
        visible.length >
        0;
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

        if (!button)
          return;

        const record =
          data.find(
            row =>
              String(
                row.id
              ) ===
              button.dataset
                .id
          );

        if (!record)
          return;

        if (
          button.dataset
            .action ===
          "delete"
        ) {
          deleteRecord(
            table,
            record
          );
        } else if (
          button.dataset
            .action ===
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

function cellValue(
  value,
  key
) {
  if (
    value == null ||
    value === ""
  ) {
    return
