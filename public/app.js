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

/* =========================================================
   API
========================================================= */

async function apiRequest(endpoint, options = {}) {

  const response = await fetch(
    `${API}${endpoint}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    }
  );

  let result;

  try {
    result = await response.json();
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

const apiGet = endpoint =>
  apiRequest(endpoint);

const apiPost = (endpoint, data) =>
  apiRequest(
    endpoint,
    {
      method: "POST",
      body: JSON.stringify(data)
    }
  );

const apiPut = (endpoint, data) =>
  apiRequest(
    endpoint,
    {
      method: "PUT",
      body: JSON.stringify(data)
    }
  );

const apiDelete = endpoint =>
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

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return escapeHtml(value);
  }

  return d.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}

function humanize(value) {

  return String(value || "")
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      c => c.toUpperCase()
    );
}

function rows(result) {

  return Array.isArray(result)
    ? result
    : (
        result.data ||
        result.customers ||
        []
      );
}

function getContent() {

  return document.getElementById(
    "content"
  );
}

function showLoading(message = "Loading CRM...") {

  const content =
    getContent();

  if (!content) return;

  content.innerHTML = `
    <div class="loading">
      ${escapeHtml(message)}
    </div>
  `;
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
   HEADER
========================================================= */

function updatePageHeader(page) {

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

async function safeList(table) {

  try {

    const result =
      await apiGet(
        `/${table}`
      );

    return rows(result);

  } catch (error) {

    console.error(
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
    "Loading CRM..."
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
        safeList("customers"),
        safeList("products"),
        safeList("enquiries"),
        safeList("quotations"),
        safeList("orders"),
        safeList("followups")
      ]);

    if (
      request !== pageRequest
    ) return;

    const quoteValue =
      quotations.reduce(
        (
          total,
          q
        ) =>
          total +
          Number(
            q.grand_total ||
            q.total ||
            0
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
          enquiries,
          row => `
            <td>#${escapeHtml(row.id)}</td>
            <td>
              ${escapeHtml(
                row.subject ||
                row.requirement ||
                "Enquiry"
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
          quotations,
          row => `
            <td>
              ${escapeHtml(
                row.quotation_number ||
                row.number ||
                `#${row.id}`
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
          <h2>Business Summary</h2>
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

  } catch (error) {

    console.error(
      error
    );

    getContent().innerHTML = `
      <div class="panel">
        <div class="panel-body">
          <div class="empty">
            <h3>Unable to load dashboard</h3>
            <p>
              ${escapeHtml(
                error.message
              )}
            </p>

            <button
              class="button-primary"
              onclick="showPage('dashboard')"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    `;
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
  data,
  template
) {

  return `
    <div class="panel">

      <div class="panel-header">
        <h2>
          ${escapeHtml(title)}
        </h2>
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
                          `<tr>${template(
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
                No records yet
              </div>
            `
        }

      </div>

    </div>
  `;
}

/* =========================================================
   QUOTATIONS
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
    ) return;

    renderQuotationList(
      quotations
    );

  } catch (error) {

    console.error(
      error
    );

    showLoading(
      "Unable to load quotations"
    );
  }
}

function renderQuotationList(
  quotations
) {

  getContent().innerHTML = `

    <div class="toolbar">

      <div class="toolbar-left">

        <input
          id="quotationSearch"
          type="search"
          placeholder="Search quotation..."
        >

      </div>

      <button
        class="button-primary"
        id="newQuotationButton"
      >
        + New Quotation
      </button>

    </div>

    <div class="panel">

      <div class="panel-body">

        <div class="table-wrapper">

          <table>

            <thead>

              <tr>
                <th>ID</th>
                <th>Quotation No.</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Grand Total</th>
                <th>Action</th>
              </tr>

            </thead>

            <tbody
              id="quotationTableBody"
            >

            </tbody>

          </table>

        </div>

        <div
          id="quotationEmpty"
          class="empty"
          hidden
        >
          No quotations found.
        </div>

      </div>

    </div>
  `;

  const body =
    document.getElementById(
      "quotationTableBody"
    );

  const empty =
    document.getElementById(
      "quotationEmpty"
    );

  const draw = () => {

    const query =
      (
        document.getElementById(
          "quotationSearch"
        )?.value || ""
      )
        .toLowerCase()
        .trim();

    const filtered =
      quotations.filter(
        q =>
          JSON.stringify(q)
            .toLowerCase()
            .includes(query)
      );

    body.innerHTML =
      filtered
        .map(
          q => `
            <tr>

              <td>
                ${escapeHtml(q.id)}
              </td>

              <td>
                <strong>
                  ${escapeHtml(
                    q.quotation_number ||
                    `QTN-${q.id}`
                  )}
                </strong>
              </td>

              <td>
                ${formatDate(
                  q.quotation_date
                )}
              </td>

              <td>
                ${escapeHtml(
                  q.customer_id ||
                  "—"
                )}
              </td>

              <td>
                ${badge(
                  q.status ||
                  "Draft"
                )}
              </td>

              <td>
                <strong>
                  ${formatCurrency(
                    q.grand_total ||
                    0
                  )}
                </strong>
              </td>

              <td
                class="table-actions"
              >

                <button
                  data-view="${q.id}"
                >
                  View
                </button>

                <button
                  data-edit="${q.id}"
                >
                  Edit
                </button>

                <button
                  class="danger"
                  data-delete="${q.id}"
                >
                  Delete
                </button>

              </td>

            </tr>
          `
        )
        .join("");

    empty.hidden =
      filtered.length > 0;
  };

  document
    .getElementById(
      "newQuotationButton"
    )
    .addEventListener(
      "click",
      () =>
        openQuotationEditor()
    );

  document
    .getElementById(
      "quotationSearch"
    )
    .addEventListener(
      "input",
      draw
    );

  body.addEventListener(
    "click",
    async event => {

      const view =
        event.target.closest(
          "[data-view]"
        );

      const edit =
        event.target.closest(
          "[data-edit]"
        );

      const del =
        event.target.closest(
          "[data-delete]"
        );

      if (view) {

        openQuotationView(
          view.dataset.view
        );

      } else if (edit) {

        openQuotationEditor(
          edit.dataset.edit
        );

      } else if (del) {

        if (
          !confirm(
            "Delete this quotation?"
          )
        ) return;

        try {

          await apiDelete(
            `/quotations/${del.dataset.delete}`
          );

          notify(
            "Quotation deleted"
          );

          renderQuotations();

        } catch (error) {

          notify(
            error.message,
            "error"
          );
        }
      }
    }
  );

  draw();
}

/* =========================================================
   QUOTATION EDITOR
========================================================= */

async function openQuotationEditor(
  quotationId = null
) {

  showLoading(
    quotationId
      ? "Loading quotation..."
      : "Preparing quotation..."
  );

  try {

    const [
      customers,
      products,
      numberResult,
      quotationDetails
    ] =
      await Promise.all([
        safeList("customers"),
        safeList("products"),
        apiGet(
          "/quotations/next-number"
        ),
        quotationId
          ? apiGet(
              `/quotations/${quotationId}/details`
            )
          : Promise.resolve(null)
      ]);

    customersCache =
      customers;

    productsCache =
      products;

    const quotation =
      quotationDetails?.quotation ||
      {};

    const items =
      quotationDetails?.items ||
      [];

    const quotationNumber =
      quotation.quotation_number ||
      numberResult.quotation_number;

    renderQuotationEditor({
      quotationId,
      quotation,
      items,
      customers,
      products,
      quotationNumber
    });

  } catch (error) {

    console.error(
      error
    );

    getContent().innerHTML = `
      <div class="panel">
        <div class="panel-body">
          <div class="empty">
            <h3>
              Unable to prepare quotation
            </h3>

            <p>
              ${escapeHtml(
                error.message
              )}
            </p>

            <button
              class="button-primary"
              onclick="renderQuotations()"
            >
              Back to Quotations
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

function renderQuotationEditor(
  state
) {

  const {
    quotationId,
    quotation,
    items,
    customers,
    products,
    quotationNumber
  } = state;

  const today =
    quotation.quotation_date
      ? String(
          quotation.quotation_date
        ).slice(0, 10)
      : new Date()
          .toISOString()
          .slice(0, 10);

  const validUntil =
    quotation.valid_until
      ? String(
          quotation.valid_until
        ).slice(0, 10)
      : "";

  getContent().innerHTML = `

    <div class="quotation-page">

      <div class="quotation-toolbar">

        <div>
          <button
            class="button-secondary"
            id="backQuotationList"
          >
            ← Back
          </button>
        </div>

        <div class="quotation-actions">

          <button
            class="button-secondary"
            id="previewQuotation"
          >
            👁 Preview
          </button>

          ${
            quotationId
              ? `
                <button
                  class="button-secondary"
                  id="printQuotation"
                >
                  🖨 PDF / Print
                </button>

                <button
                  class="button-secondary"
                  id="whatsappQuotation"
                >
                  💬 WhatsApp
                </button>
              `
              : ""
          }

          <button
            class="button-primary"
            id="saveQuotation"
          >
            ${
              quotationId
                ? "Update Quotation"
                : "Save Quotation"
            }
          </button>

        </div>

      </div>

      <div class="quotation-card">

        <div class="quotation-header">

          <div>

            <h2>
              ${quotationId
                ? "Edit Quotation"
                : "New Quotation"}
            </h2>

            <p>
              Create a professional quotation
            </p>

          </div>

          <div class="quotation-number-box">

            <span>
              QUOTATION NUMBER
            </span>

            <strong>
              ${escapeHtml(
                quotationNumber
              )}
            </strong>

          </div>

        </div>

        <div class="quotation-info-grid">

          <label>
            Customer

            <select
              id="quoteCustomer"
            >

              <option value="">
                Select Customer
              </option>

              ${customers
                .map(
                  customer => `
                    <option
                      value="${customer.id}"
                      ${
                        String(
                          quotation.customer_id
                        ) ===
                        String(
                          customer.id
                        )
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
                .join("")}

            </select>

          </label>

          <label>
            Quotation Date

            <input
              type="date"
              id="quoteDate"
              value="${today}"
            >

          </label>

          <label>
            Valid Until

            <input
              type="date"
              id="quoteValidUntil"
              value="${validUntil}"
            >

          </label>

          <label>
            Status

            <select id="quoteStatus">

              <option
                ${
                  (quotation.status ||
                    "Draft") === "Draft"
                    ? "selected"
                    : ""
                }
              >
                Draft
              </option>

              <option
                ${
                  quotation.status ===
                  "Sent"
                    ? "selected"
                    : ""
                }
              >
                Sent
              </option>

              <option
                ${
                  quotation.status ===
                  "Accepted"
                    ? "selected"
                    : ""
                }
              >
                Accepted
              </option>

              <option
                ${
                  quotation.status ===
                  "Rejected"
                    ? "selected"
                    : ""
                }
              >
                Rejected
              </option>

            </select>

          </label>

        </div>

        <div class="quotation-section-title">

          <div>
            <h3>Quotation Items</h3>
            <p>
              Add products and apply item discount
            </p>
          </div>

          <button
            class="button-primary"
            id="addQuotationItem"
          >
            + Add Item
          </button>

        </div>

        <div class="quotation-items-wrapper">

          <table
            class="quotation-items-table"
          >

            <thead>

              <tr>
                <th>#</th>
                <th>Product / Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Discount %</th>
                <th>Discount</th>
                <th>Amount</th>
                <th></th>
              </tr>

            </thead>

            <tbody
              id="quotationItemsBody"
            >
            </tbody>

          </table>

        </div>

        <div class="quotation-bottom">

          <div class="quotation-notes">

            <label>
              Notes

              <textarea
                id="quoteNotes"
                rows="6"
                placeholder="Quotation notes, delivery terms, payment terms..."
              >${escapeHtml(
                quotation.notes ||
                ""
              )}</textarea>

            </label>

          </div>

          <div class="quotation-summary">

            <div class="summary-row">
              <span>Item Subtotal</span>
              <strong id="summarySubtotal">
                ₹0.00
              </strong>
            </div>

            <div class="summary-row discount-row">

              <span>
                Overall Discount
              </span>

              <div class="summary-input">

                <input
                  type="number"
                  id="quoteDiscountPercent"
                  min="0"
                  max="100"
                  step="0.01"
                  value="${Number(
                    quotation.discount_percent ||
                    0
                  )}"
                >

                <span>%</span>

              </div>

            </div>

            <div class="summary-row">

              <span>
                Discount Amount
              </span>

              <strong
                id="summaryDiscount"
              >
                ₹0.00
              </strong>

            </div>

            <div class="summary-row freight-row">

              <span>
                Freight
              </span>

              <input
                type="number"
                id="quoteFreight"
                min="0"
                step="0.01"
                value="${Number(
                  quotation.freight ||
                  0
                )}"
              >

            </div>

            <div class="summary-row">

              <span>
                Taxable Amount
              </span>

              <strong
                id="summaryTaxable"
              >
                ₹0.00
              </strong>

            </div>

            <div class="summary-row gst-row">

              <span>
                GST
              </span>

              <div class="summary-gst">

                <input
                  type="number"
                  id="quoteGstPercent"
                  min="0"
                  max="100"
                  step="0.01"
                  value="${Number(
                    quotation.gst_percent ||
                    18
                  )}"
                >

                <span>%</span>

              </div>

            </div>

            <div class="summary-row">

              <span>
                GST Amount
              </span>

              <strong
                id="summaryGst"
              >
                ₹0.00
              </strong>

            </div>

            <div class="summary-grand">

              <span>
                GRAND TOTAL
              </span>

              <strong
                id="summaryGrand"
              >
                ₹0.00
              </strong>

            </div>

          </div>

        </div>

      </div>

    </div>
  `;

  const body =
    document.getElementById(
      "quotationItemsBody"
    );

  function addItem(item = {}) {

    const index =
      body.children.length;

    const row =
      document.createElement(
        "tr"
      );

    row.dataset.index =
      index;

    row.innerHTML = `

      <td>
        ${index + 1}
      </td>

      <td>

        <select
          class="item-product"
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
                    product.model ||
                    `Product #${product.id}`
                  )}
                </option>
              `
            )
            .join("")}

        </select>

        <input
          class="item-description"
          type="text"
          placeholder="Description"
          value="${escapeHtml(
            item.description ||
            ""
          )}"
        >

      </td>

      <td>

        <input
          class="item-qty"
          type="number"
          min="0"
          step="0.01"
          value="${Number(
            item.quantity ||
            1
          )}"
        >

      </td>

      <td>

        <input
          class="item-price"
          type="number"
          min="0"
          step="0.01"
          value="${Number(
            item.unit_price ||
            0
          )}"
        >

      </td>

      <td>

        <input
          class="item-discount-percent"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value="${Number(
            item.discount_percent ||
            0
          )}"
        >

      </td>

      <td class="item-discount">
        ₹0.00
      </td>

      <td
        class="item-total"
      >
        ₹0.00
      </td>

      <td>

        <button
          type="button"
          class="remove-item"
        >
          ×
        </button>

      </td>
    `;

    body.appendChild(
      row
    );

    const productSelect =
      row.querySelector(
        ".item-product"
      );

    const description =
      row.querySelector(
        ".item-description"
      );

    const price =
      row.querySelector(
        ".item-price"
      );

    productSelect.addEventListener(
      "change",
      () => {

        const product =
          products.find(
            p =>
              String(p.id) ===
              String(
                productSelect.value
              )
          );

        if (!product) return;

        if (!description.value) {

          description.value =
            product.name ||
            product.product_name ||
            product.model ||
            "";
        }

        if (
          !Number(price.value)
        ) {

          price.value =
            product.selling_price ||
            0;
        }

        calculate();
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
            calculate
          )
      );

    row
      .querySelector(
        ".remove-item"
      )
      .addEventListener(
        "click",
        () => {

          row.remove();

          renumberItems();
          calculate();
        }
      );

    calculate();
  }

  function renumberItems() {

    [...body.children]
      .forEach(
        (row, index) => {

          row.children[0]
            .textContent =
            index + 1;
        }
      );
  }

  function calculate() {

    let subtotal = 0;

    [...body.children]
      .forEach(
        row => {

          const qty =
            Number(
              row.querySelector(
                ".item-qty"
              ).value || 0
            );

          const price =
            Number(
              row.querySelector(
                ".item-price"
              ).value || 0
            );

          const discountPercent =
            Number(
              row.querySelector(
                ".item-discount-percent"
              ).value || 0
            );

          const gross =
            qty * price;

          const discount =
            gross *
            discountPercent /
            100;

          const total =
            gross -
            discount;

          subtotal += total;

          row.querySelector(
            ".item-discount"
          ).textContent =
            formatCurrency(
              discount
            );

          row.querySelector(
            ".item-total"
          ).textContent =
            formatCurrency(
              total
            );
        }
      );

    const overallDiscountPercent =
      Number(
        document.getElementById(
          "quoteDiscountPercent"
        ).value || 0
      );

    const overallDiscount =
      subtotal *
      overallDiscountPercent /
      100;

    const freight =
      Number(
        document.getElementById(
          "quoteFreight"
        ).value || 0
      );

    const taxable =
      subtotal -
      overallDiscount +
      freight;

    const gstPercent =
      Number(
        document.getElementById(
          "quoteGstPercent"
        ).value || 0
      );

    const gst =
      taxable *
      gstPercent /
      100;

    const grand =
      taxable +
      gst;

    document.getElementById(
      "summarySubtotal"
    ).textContent =
      formatCurrency(
        subtotal
      );

    document.getElementById(
      "summaryDiscount"
    ).textContent =
      formatCurrency(
        overallDiscount
      );

    document.getElementById(
      "summaryTaxable"
    ).textContent =
      formatCurrency(
        taxable
      );

    document.getElementById(
      "summaryGst"
    ).textContent =
      formatCurrency(
        gst
      );

    document.getElementById(
      "summaryGrand"
    ).textContent =
      formatCurrency(
        grand
      );
  }

  function collectItems() {

    return [
      ...body.children
    ].map(row => {

      const productId =
        row.querySelector(
          ".item-product"
        ).value;

      const description =
        row.querySelector(
          ".item-description"
        ).value.trim();

      const quantity =
        Number(
          row.querySelector(
            ".item-qty"
          ).value || 0
        );

      const unitPrice =
        Number(
          row.querySelector(
            ".item-price"
          ).value || 0
        );

      const discountPercent =
        Number(
          row.querySelector(
            ".item-discount-percent"
          ).value || 0
        );

      return {

        product_id:
          productId
            ? Number(productId)
            : null,

        description,

        quantity,

        unit_price:
          unitPrice,

        discount_percent:
          discountPercent
      };
    });
  }

  if (items.length) {

    items.forEach(
      item =>
        addItem(item)
    );

  } else {

    addItem();

  }

  document
    .getElementById(
      "addQuotationItem"
    )
    .addEventListener(
      "click",
      () => addItem()
    );

  [
    "quoteDiscountPercent",
    "quoteFreight",
    "quoteGstPercent"
  ]
    .forEach(
      id =>
        document
          .getElementById(id)
          .addEventListener(
            "input",
            calculate
          )
    );

  document
    .getElementById(
      "backQuotationList"
    )
    .addEventListener(
      "click",
      renderQuotations
    );

  document
    .getElementById(
      "saveQuotation"
    )
    .addEventListener(
      "click",
      async () => {

        const customerId =
          document.getElementById(
            "quoteCustomer"
          ).value;

        if (!customerId) {

          notify(
            "Please select a customer",
            "error"
          );

          return;
        }

        const quotationItems =
          collectItems();

        if (
          !quotationItems.length
        ) {

          notify(
            "Please add at least one item",
            "error"
          );

          return;
        }

        const hasValidItem =
          quotationItems.some(
            item =>
              item.description ||
              item.product_id
          );

        if (!hasValidItem) {

          notify(
            "Please select a product or enter description",
            "error"
          );

          return;
        }

        const payload = {

          quotation_number:
            quotationNumber,

          customer_id:
            Number(customerId),

          quotation_date:
            document.getElementById(
              "quoteDate"
            ).value,

          valid_until:
            document.getElementById(
              "quoteValidUntil"
            ).value ||
            null,

          status:
            document.getElementById(
              "quoteStatus"
            ).value,

          discount_percent:
            Number(
              document.getElementById(
                "quoteDiscountPercent"
              ).value || 0
            ),

          freight:
            Number(
              document.getElementById(
                "quoteFreight"
              ).value || 0
            ),

          gst_percent:
            Number(
              document.getElementById(
                "quoteGstPercent"
              ).value || 18
            ),

          notes:
            document.getElementById(
              "quoteNotes"
            ).value,

          items:
            quotationItems
        };

        const button =
          document.getElementById(
            "saveQuotation"
          );

        button.disabled =
          true;

        button.textContent =
          "Saving...";

        try {

          let result;

          if (quotationId) {

            result =
              await apiPut(
                `/quotations/${quotationId}/full`,
                payload
              );

          } else {

            result =
              await apiPost(
                "/quotations/create",
                payload
              );
          }

          notify(
            result.message ||
            "Quotation saved successfully"
          );

          showQuotationSavedScreen(
            result,
            quotationId ||
              result.quotation_id
          );

        } catch (error) {

          notify(
            error.message,
            "error"
          );

          button.disabled =
            false;

          button.textContent =
            quotationId
              ? "Update Quotation"
              : "Save Quotation";
        }
      }
    );

  document
    .getElementById(
      "previewQuotation"
    )
    .addEventListener(
      "click",
      () =>
        previewCurrentQuotation(
          quotationNumber,
          customers,
          products,
          collectItems()
        )
    );

  if (
    document.getElementById(
      "printQuotation"
    )
  ) {

    document
      .getElementById(
        "printQuotation"
      )
      .addEventListener(
        "click",
        () =>
          printQuotation(
            quotationNumber
          )
      );
  }

  if (
    document.getElementById(
      "whatsappQuotation"
    )
  ) {

    document
      .getElementById(
        "whatsappQuotation"
      )
      .addEventListener(
        "click",
        () =>
          whatsappQuotation(
            quotationNumber
          )
      );
  }

  calculate();
}

/* =========================================================
   SAVED SCREEN
========================================================= */

function showQuotationSavedScreen(
  result,
  quotationId
) {

  const number =
    result.quotation_number ||
    `Quotation #${quotationId}`;

  getContent().innerHTML = `

    <div class="quotation-saved">

      <div class="saved-icon">
        ✓
      </div>

      <h1>
        Quotation Saved Successfully
      </h1>

      <p>
        Your quotation
        <strong>
          ${escapeHtml(number)}
        </strong>
        has been saved successfully.
      </p>

      <div class="saved-total">

        <span>
          Grand Total
        </span>

        <strong>
          ${formatCurrency(
            result.grand_total ||
            0
          )}
        </strong>

      </div>

      <div class="saved-actions">

        <button
          class="button-secondary"
          id="savedView"
        >
          👁 View Quotation
        </button>

        <button
          class="button-secondary"
          id="savedPdf"
        >
          🖨 PDF / Print
        </button>

        <button
          class="button-secondary"
          id="savedWhatsapp"
        >
          💬 WhatsApp
        </button>

        <button
          class="button-primary"
          id="savedNew"
        >
          + Create New Quotation
        </button>

      </div>

    </div>
  `;

  document
    .getElementById(
      "savedView"
    )
    .addEventListener(
      "click",
      () =>
        openQuotationView(
          quotationId
        )
    );

  document
    .getElementById(
      "savedPdf"
    )
    .addEventListener(
      "click",
      () =>
        printQuotation(
          number
        )
    );

  document
    .getElementById(
      "savedWhatsapp"
    )
    .addEventListener(
      "click",
      () =>
        whatsappQuotation(
          number
        )
    );

  document
    .getElementById(
      "savedNew"
    )
    .addEventListener(
      "click",
      () =>
        openQuotationEditor()
    );
}

/* =========================================================
   VIEW QUOTATION
========================================================= */

async function openQuotationView(
  id
) {

  try {

    const result =
      await apiGet(
        `/quotations/${id}/details`
      );

    const q =
      result.quotation;

    const customer =
      result.customer;

    const items =
      result.items || [];

    const customerName =
      customer?.company_name ||
      customer?.contact_person ||
      customer?.name ||
      `Customer #${q.customer_id}`;

    const modal =
      openModal(
        `Quotation ${
          q.quotation_number ||
          ""
        }`,
        `
          <div class="quotation-preview">

            <div class="preview-header">

              <div>
                <h1>
                  MAHALAXMI ENTERPRISE
                </h1>

                <p>
                  Quotation
                </p>
              </div>

              <div>
                <strong>
                  ${escapeHtml(
                    q.quotation_number ||
                    ""
                  )}
                </strong>

                <p>
                  ${formatDate(
                    q.quotation_date
                  )}
                </p>
              </div>

            </div>

            <div class="preview-customer">

              <strong>
                Bill To
              </strong>

              <div>
                ${escapeHtml(
                  customerName
                )}
              </div>

              ${
                customer?.mobile
                  ? `
                    <div>
                      ${escapeHtml(
                        customer.mobile
                      )}
                    </div>
                  `
                  : ""
              }

              ${
                customer?.email
                  ? `
                    <div>
                      ${escapeHtml(
                        customer.email
                      )}
                    </div>
                  `
                  : ""
              }

            </div>

            <table>

              <thead>

                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Discount</th>
                  <th>Total</th>
                </tr>

              </thead>

              <tbody>

                ${items
                  .map(
                    (item, index) => `
                      <tr>

                        <td>
                          ${index + 1}
                        </td>

                        <td>
                          ${escapeHtml(
                            item.description ||
                            ""
                          )}
                        </td>

                        <td>
                          ${Number(
                            item.quantity ||
                            0
                          )}
                        </td>

                        <td>
                          ${formatCurrency(
                            item.unit_price ||
                            0
                          )}
                        </td>

                        <td>
                          ${Number(
                            item.discount_percent ||
                            0
                          )}%
                        </td>

                        <td>
                          ${formatCurrency(
                            item.total ||
                            0
                          )}
                        </td>

                      </tr>
                    `
                  )
                  .join("")}

              </tbody>

            </table>

            <div class="preview-summary">

              <div>
                <span>Subtotal</span>
                <strong>
                  ${formatCurrency(
                    q.subtotal ||
                    0
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Discount
                  ${
                    q.discount_percent
                      ? `(${q.discount_percent}%)`
                      : ""
                  }
                </span>

                <strong>
                  ${formatCurrency(
                    q.discount ||
                    0
                  )}
                </strong>
              </div>

              <div>
                <span>Freight</span>
                <strong>
                  ${formatCurrency(
                    q.freight ||
                    0
                  )}
                </strong>
              </div>

              <div>
                <span>
                  GST
                  ${
                    q.gst_percent
                      ? `(${q.gst_percent}%)`
                      : ""
                  }
                </span>

                <strong>
                  ${formatCurrency(
                    q.gst_amount ||
                    0
                  )}
                </strong>
              </div>

              <div class="grand">
                <span>
                  Grand Total
                </span>

                <strong>
                  ${formatCurrency(
                    q.grand_total ||
                    0
                  )}
                </strong>
              </div>

            </div>

          </div>

          <div class="modal-actions">

            <button
              class="button-secondary"
              data-close
            >
              Close
            </button>

            <button
              class="button-secondary"
              data-print
            >
              🖨 PDF / Print
            </button>

            <button
              class="button-secondary"
              data-whatsapp
            >
              💬 WhatsApp
            </button>

            <button
              class="button-primary"
              data-edit
            >
              Edit
            </button>

          </div>
        `,
        "modal-xl"
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

          openQuotationEditor(
            id
          );
        }
      );

    modal.host
      .querySelector(
        "[data-print]"
      )
      .addEventListener(
        "click",
        () =>
          printQuotation(
            q.quotation_number
          )
      );

    modal.host
      .querySelector(
        "[data-whatsapp]"
      )
      .addEventListener(
        "click",
        () =>
          whatsappQuotation(
            q.quotation_number
          )
      );

  } catch (error) {

    notify(
      error.message,
      "error"
    );
  }
}

/* =========================================================
   PDF / PRINT
========================================================= */

function printQuotation(
  quotationNumber
) {

  const preview =
    document.querySelector(
      ".quotation-preview"
    );

  if (!preview) {

    notify(
      "Open quotation preview first",
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
      "Please allow pop-ups for PDF printing",
      "error"
    );

    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>

    <html>

      <head>

        <title>
          ${escapeHtml(
            quotationNumber ||
            "Quotation"
          )}
        </title>

        <style>

          body {
            font-family:
              Arial,
              sans-serif;

            padding: 35px;
            color: #111827;
          }

          h1 {
            margin: 0;
          }

          .preview-header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #111827;
            padding-bottom: 20px;
            margin-bottom: 25px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 25px;
          }

          th,
          td {
            border: 1px solid #d1d5db;
            padding: 10px;
            text-align: left;
          }

          th {
            background: #f3f4f6;
          }

          .preview-customer {
            margin: 20px 0;
          }

          .preview-summary {
            width: 360px;
            margin-left: auto;
            margin-top: 25px;
          }

          .preview-summary > div {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
          }

          .preview-summary .grand {
            border-top: 2px solid #111827;
            font-size: 20px;
            padding-top: 15px;
            margin-top: 10px;
          }

          @media print {
            body {
              padding: 15px;
            }
          }

        </style>

      </head>

      <body>

        ${preview.innerHTML}

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

async function whatsappQuotation(
  quotationNumber
) {

  try {

    const quotations =
      await safeList(
        "quotations"
      );

    const quotation =
      quotations.find(
        q =>
          String(
            q.quotation_number
          ) ===
          String(
            quotationNumber
          )
      );

    let message =
      `Quotation ${quotationNumber}\n\n`;

    if (quotation) {

      message +=
        `Grand Total: ${formatCurrency(
          quotation.grand_total
        )}\n`;

      message +=
        `Status: ${
          quotation.status ||
          "Draft"
        }\n\n`;
    }

    message +=
      "Thank you for your enquiry.\n";

    message +=
      "Mahalaxmi Enterprise";

    const url =
      `https://wa.me/?text=${
        encodeURIComponent(
          message
        )
      }`;

    window.open(
      url,
      "_blank"
    );

  } catch (error) {

    notify(
      error.message,
      "error"
    );
  }
}

/* =========================================================
   PREVIEW CURRENT
========================================================= */

function previewCurrentQuotation(
  quotationNumber,
  customers,
  products,
  items
) {

  const customerId =
    document.getElementById(
      "quoteCustomer"
    ).value;

  const customer =
    customers.find(
      c =>
        String(c.id) ===
        String(customerId)
    );

  const customerName =
    customer?.company_name ||
    customer?.contact_person ||
    customer?.name ||
    "Customer";

  const subtotal =
    items.reduce(
      (sum, item) =>
        sum +
        (
          Number(
            item.quantity || 0
          ) *
          Number(
            item.unit_price || 0
          ) *
          (
            1 -
            Number(
              item.discount_percent ||
              0
            ) /
            100
          )
        ),
      0
    );

  const discountPercent =
    Number(
      document.getElementById(
        "quoteDiscountPercent"
      ).value || 0
    );

  const discount =
    subtotal *
    discountPercent /
    100;

  const freight =
    Number(
      document.getElementById(
        "quoteFreight"
      ).value || 0
    );

  const taxable =
    subtotal -
    discount +
    freight;

  const gstPercent =
    Number(
      document.getElementById(
        "quoteGstPercent"
      ).value || 18
    );

  const gst =
    taxable *
    gstPercent /
    100;

  const grand =
    taxable +
    gst;

  const html = `

    <div class="quotation-preview">

      <div class="preview-header">

        <div>

          <h1>
            MAHALAXMI ENTERPRISE
          </h1>

          <p>
            Quotation
          </p>

        </div>

        <div>

          <strong>
            ${escapeHtml(
              quotationNumber
            )}
          </strong>

        </div>

      </div>

      <div class="preview-customer">

        <strong>
          Customer
        </strong>

        <div>
          ${escapeHtml(
            customerName
          )}
        </div>

      </div>

      <table>

        <thead>

          <tr>

            <th>#</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Discount</th>
            <th>Total</th>

          </tr>

        </thead>

        <tbody>

          ${items
            .map(
              (item, index) => {

                const total =
                  Number(
                    item.quantity
                  ) *
                  Number(
                    item.unit_price
                  ) *
                  (
                    1 -
                    Number(
                      item.discount_percent ||
                      0
                    ) /
                    100
                  );

                return `
                  <tr>

                    <td>
                      ${index + 1}
                    </td>

                    <td>
                      ${escapeHtml(
                        item.description ||
                        ""
                      )}
                    </td>

                    <td>
                      ${item.quantity}
                    </td>

                    <td>
                      ${formatCurrency(
                        item.unit_price
                      )}
                    </td>

                    <td>
                      ${item.discount_percent || 0}%
                    </td>

                    <td>
                      ${formatCurrency(
                        total
                      )}
                    </td>

                  </tr>
                `;
              }
            )
            .join("")}

        </tbody>

      </table>

      <div class="preview-summary">

        <div>
          <span>Subtotal</span>
          <strong>
            ${formatCurrency(
              subtotal
            )}
          </strong>
        </div>

        <div>
          <span>
            Discount (${discountPercent}%)
          </span>

          <strong>
            ${formatCurrency(
              discount
            )}
          </strong>
        </div>

        <div>
          <span>Freight</span>

          <strong>
            ${formatCurrency(
              freight
            )}
          </strong>
        </div>

        <div>
          <span>
            GST (${gstPercent}%)
          </span>

          <strong>
            ${formatCurrency(
              gst
            )}
          </strong>
        </div>

        <div class="grand">

          <span>
            Grand Total
          </span>

          <strong>
            ${formatCurrency(
              grand
            )}
          </strong>

        </div>

      </div>

    </div>
  `;

  openModal(
    `Quotation Preview - ${quotationNumber}`,
    `
      ${html}

      <div class="modal-actions">

        <button
          class="button-secondary"
          data-close
        >
          Close
        </button>

        <button
          class="button-primary"
          data-print
        >
          🖨 Print / PDF
        </button>

      </div>
    `,
    "modal-xl"
  );
}

/* =========================================================
   GENERIC ENTITY PAGES
========================================================= */

async function renderEntityPage(
  table
) {

  const request =
    ++pageRequest;

  showLoading(
    `Loading ${humanize(table)}...`
  );

  const data =
    await safeList(table);

  if (
    request !== pageRequest
  ) return;

  renderGenericTable(
    table,
    data
  );
}

function renderGenericTable(
  table,
  data
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

        <input
          id="genericSearch"
          type="search"
          placeholder="Search..."
        >

      </div>

      <button
        class="button-primary"
        id="genericNew"
      >
        + New ${escapeHtml(
          humanize(table)
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
                    c =>
                      `<th>${escapeHtml(
                        humanize(c)
                      )}</th>`
                  )
                  .join("")}

                <th>Action</th>

              </tr>

            </thead>

            <tbody
              id="genericBody"
            >
            </tbody>

          </table>

        </div>

      </div>

    </div>
  `;

  const draw =
    () => {

      const query =
        document.getElementById(
          "genericSearch"
        ).value
          .toLowerCase()
          .trim();

      const visible =
        data.filter(
          row =>
            !query ||
            Object.values(row)
              .some(
                value =>
                  String(
                    value ?? ""
                  )
                    .toLowerCase()
                    .includes(
                      query
                    )
              )
        );

      document.getElementById(
        "genericBody"
      ).innerHTML =
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
                    data-view="${row.id}"
                  >
                    View
                  </button>

                  <button
                    data-edit="${row.id}"
                  >
                    Edit
                  </button>

                  <button
                    class="danger"
                    data-delete="${row.id}"
                  >
                    Delete
                  </button>

                </td>

              </tr>
            `
          )
          .join("");
    };

  document
    .getElementById(
      "genericSearch"
    )
    .addEventListener(
      "input",
      draw
    );

  document
    .getElementById(
      "genericNew"
    )
    .addEventListener(
      "click",
      () =>
        openGenericModal(
          table
        )
    );

  document
    .getElementById(
      "genericBody"
    )
    .addEventListener(
      "click",
      async event => {

        const view =
          event.target.closest(
            "[data-view]"
          );

        const edit =
          event.target.closest(
            "[data-edit]"
          );

        const del =
          event.target.closest(
            "[data-delete]"
          );

        const id =
          view?.dataset.view ||
          edit?.dataset.edit ||
          del?.dataset.delete;

        if (!id) return;

        const record =
          data.find(
            r =>
              String(r.id) ===
              String(id)
          );

        if (!record) return;

        if (view) {

          openGenericView(
            table,
            record
          );

        } else if (edit) {

          openGenericModal(
            table,
            record
          );

        } else if (del) {

          if (
            !confirm(
              `Delete this ${humanize(
                table
              )}?`
            )
          ) return;

          try {

            await apiDelete(
              `/${table}/${id}`
            );

            notify(
              "Deleted successfully"
            );

            renderEntityPage(
              table
            );

          } catch (error) {

            notify(
              error.message,
              "error"
            );
          }
        }
      }
    );

  draw();
}

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
      "status",
      "priority"
    ],

    orders: [
      "id",
      "order_number",
      "customer_id",
      "status",
      "grand_total"
    ],

    followups: [
      "id",
      "customer_id",
      "followup_date",
      "status",
      "notes"
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
      ].slice(0, 7);
}

function cellValue(
  value,
  key
) {

  if (
    value == null ||
    value === ""
  ) return "—";

  if (
    /status|priority/.test(
      key
    )
  ) {
    return badge(value);
  }

  if (
    /date|_at$/.test(
      key
    )
  ) {
    return formatDate(
      value
    );
  }

  if (
    /price|amount|total|discount|freight/.test(
      key
    )
  ) {
    return formatCurrency(
      value
    );
  }

  return escapeHtml(
    value
  );
}

function badge(
  value
) {

  return `
    <span class="badge">
      ${escapeHtml(value)}
    </span>
  `;
}

/* =========================================================
   GENERIC MODALS
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

    <div class="modal-backdrop">

      <div
        class="modal ${size}"
        role="dialog"
      >

        <div class="modal-header">

          <h2>
            ${escapeHtml(title)}
          </h2>

          <button
            class="modal-close"
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
      host.innerHTML =
        "";
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

async function openGenericView(
  table,
  record
) {

  const details =
    Object.entries(
      record
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

  openModal(
    `${humanize(table)} #${record.id}`,
    `
      <div class="detail-grid">
        ${details}
      </div>
    `
  );
}

async function openGenericModal(
  table,
  record = null
) {

  try {

    const schema =
      await apiGet(
        `/${table}/schema`
      );

    const columns =
      schema.columns
        .map(
          x =>
            x.COLUMN_NAME
        )
        .filter(
          x =>
            ![
              "id",
              "created_at",
              "updated_at"
            ].includes(x)
        );

    const body =
      `
        <form id="genericForm">

          <div class="form-grid">

            ${columns
              .map(
                field => `

                  <label>

                    ${escapeHtml(
                      humanize(field)
                    )}

                    <input
                      name="${escapeHtml(
                        field
                      )}"
                      value="${escapeHtml(
                        record?.[field] ??
                        ""
                      )}"
                    >

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
              type="submit"
              class="button-primary"
            >
              Save
            </button>

          </div>

        </form>
      `;

    const modal =
      openModal(
        `${record ? "Edit" : "New"} ${humanize(table)}`,
        body,
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
        "#genericForm"
      )
      .addEventListener(
        "submit",
        async event => {

          event.preventDefault();

          const data =
            {};

          new FormData(
            event.currentTarget
          ).forEach(
            (value, key) => {

              if (
                String(
                  value
                ).trim() !== ""
              ) {

                data[key] =
                  value;
              }
            }
          );

          try {

            if (record) {

              await apiPut(
                `/${table}/${record.id}`,
                data
              );

            } else {

              await apiPost(
                `/${table}`,
                data
              );
            }

            modal.close();

            notify(
              "Saved successfully"
            );

            renderEntityPage(
              table
            );

          } catch (error) {

            notify(
              error.message,
              "error"
            );
          }
        }
      );

  } catch (error) {

    notify(
      error.message,
      "error"
    );
  }
}

/* =========================================================
   NAVIGATION
========================================================= */

async function showPage(
  page
) {

  if (
    !PAGE_INFO[page]
  ) {
    page =
      "dashboard";
  }

  currentPage =
    page;

  updatePageHeader(
    page
  );

  document
    .querySelectorAll(
      "[data-page]"
    )
    .forEach(
      element => {

        element.classList.toggle(
          "active",
          element.dataset.page ===
          page
        );
      }
    );

  if (
    page ===
    "dashboard"
  ) {
    return renderDashboard();
  }

  if (
    page ===
    "quotations"
  ) {
    return renderQuotations();
  }

  if (
    page ===
    "customers"
  ) {

    customersCache =
      await safeList(
        "customers"
      );

    return renderGenericTable(
      "customers",
      customersCache
    );
  }

  if (
    page ===
    "products"
  ) {

    productsCache =
      await safeList(
        "products"
      );

    return renderGenericTable(
      "products",
      productsCache
    );
  }

  return renderEntityPage(
    page
  );
}

/* =========================================================
   INITIALIZE
========================================================= */

function initializeCRM() {

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

            showPage(
              element.dataset.page
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
   UI CSS
========================================================= */

function ensureCrmUiStyles() {

  if (
    document.getElementById(
      "crmUiStyles"
    )
  ) return;

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "crmUiStyles";

  style.textContent = `

    .loading {
      min-height: 400px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      font-size: 16px;
    }

    .quotation-page {
      width: 100%;
    }

    .quotation-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      margin-bottom: 20px;
    }

    .quotation-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .quotation-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      box-shadow: 0 8px 30px rgba(15,23,42,.06);
      overflow: hidden;
    }

    .quotation-header {
      padding: 26px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
    }

    .quotation-header h2 {
      margin: 0 0 5px;
      font-size: 24px;
    }

    .quotation-header p {
      margin: 0;
      color: #64748b;
    }

    .quotation-number-box {
      padding: 15px 22px;
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      border-radius: 12px;
      text-align: right;
    }

    .quotation-number-box span {
      display: block;
      font-size: 11px;
      color: #64748b;
      letter-spacing: .08em;
    }

    .quotation-number-box strong {
      display: block;
      margin-top: 5px;
      color: #2563eb;
      font-size: 18px;
    }

    .quotation-info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      padding: 25px 30px;
      background: #f8fafc;
    }

    .quotation-info-grid label,
    .quotation-notes label {
      display: flex;
      flex-direction: column;
      gap: 7px;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
    }

    .quotation-info-grid select,
    .quotation-info-grid input,
    .quotation-notes textarea {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      padding: 11px 12px;
      background: white;
      font: inherit;
      font-weight: 400;
      outline: none;
    }

    .quotation-section-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 25px 30px 15px;
    }

    .quotation-section-title h3 {
      margin: 0 0 4px;
    }

    .quotation-section-title p {
      margin: 0;
      color: #64748b;
      font-size: 13px;
    }

    .quotation-items-wrapper {
      padding: 0 30px 20px;
      overflow-x: auto;
    }

    .quotation-items-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 900px;
    }

    .quotation-items-table th {
      background: #f8fafc;
      color: #475569;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .04em;
    }

    .quotation-items-table th,
    .quotation-items-table td {
      border-bottom: 1px solid #e2e8f0;
      padding: 11px 9px;
      vertical-align: middle;
    }

    .quotation-items-table input,
    .quotation-items-table select {
      width: 100%;
      box-sizing: border-box;
      padding: 9px 8px;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      background: white;
    }

    .item-description {
      margin-top: 7px;
    }

    .item-discount,
    .item-total {
      white-space: nowrap;
      font-weight: 600;
    }

    .remove-item {
      border: 0;
      background: #fee2e2;
      color: #dc2626;
      border-radius: 7px;
      width: 32px;
      height: 32px;
      cursor: pointer;
      font-size: 18px;
    }

    .quotation-bottom {
      display: grid;
      grid-template-columns: 1fr 430px;
      gap: 35px;
      padding: 25px 30px 35px;
      border-top: 1px solid #e2e8f0;
    }

    .quotation-summary {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px;
    }

    .summary-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      padding: 10px 0;
      border-bottom: 1px solid #e2e8f0;
    }

    .summary-row span {
      color: #475569;
    }

    .summary-row input {
      width: 120px;
      box-sizing: border-box;
      padding: 9px;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      text-align: right;
    }

    .summary-input,
    .summary-gst {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .summary-grand {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      padding: 18px 0 5px;
      font-size: 18px;
    }

    .summary-grand strong {
      font-size: 25px;
      color: #2563eb;
    }

    .quotation-saved {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 60px 30px;
      text-align: center;
      max-width: 900px;
      margin: 30px auto;
      box-shadow: 0 15px 45px rgba(15,23,42,.08);
    }

    .saved-icon {
      width: 75px;
      height: 75px;
      border-radius: 50%;
      background: #dcfce7;
      color: #16a34a;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: auto;
      font-size: 40px;
      font-weight: 700;
    }

    .quotation-saved h1 {
      margin: 20px 0 10px;
    }

    .quotation-saved p {
      color: #64748b;
    }

    .saved-total {
      margin: 25px auto;
      padding: 18px 30px;
      border-radius: 12px;
      background: #f8fafc;
      display: inline-flex;
      flex-direction: column;
      gap: 5px;
    }

    .saved-total span {
      color: #64748b;
    }

    .saved-total strong {
      color: #2563eb;
      font-size: 28px;
    }

    .saved-actions {
      display: flex;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 25px;
    }

    .quotation-preview {
      background: white;
      padding: 10px;
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #1e293b;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }

    .preview-header h1 {
      margin: 0;
      font-size: 24px;
    }

    .preview-header p {
      margin: 5px 0 0;
      color: #64748b;
    }

    .preview-customer {
      padding: 15px;
      background: #f8fafc;
      border-radius: 10px;
      margin-bottom: 20px;
    }

    .quotation-preview table {
      width: 100%;
      border-collapse: collapse;
    }

    .quotation-preview th,
    .quotation-preview td {
      border: 1px solid #e2e8f0;
      padding: 9px;
      text-align: left;
    }

    .quotation-preview th {
      background: #f8fafc;
    }

    .preview-summary {
      width: 350px;
      max-width: 100%;
      margin-left: auto;
      margin-top: 20px;
    }

    .preview-summary > div {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }

    .preview-summary .grand {
      border-top: 2px solid #1e293b;
      margin-top: 8px;
      padding-top: 15px;
      font-size: 18px;
    }

    .crm-toast {
      position: fixed;
      right: 25px;
      bottom: 25px;
      z-index: 99999;
      background: #16a34a;
      color: white;
      padding: 13px 18px;
      border-radius: 9px;
      box-shadow: 0 10px 30px rgba(0,0,0,.15);
      transform: translateY(100px);
      opacity: 0;
      pointer-events: none;
      transition: .25s;
    }

    .crm-toast.show {
      transform: translateY(0);
      opacity: 1;
    }

    .crm-toast[data-type="error"] {
      background: #dc2626;
    }

    .modal-xl {
      width: min(1100px, 94vw);
    }

    .modal-large {
      width: min(850px, 94vw);
    }

    .danger {
      color: #dc2626 !important;
    }

    @media(max-width: 1000px) {

      .quotation-info-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .quotation-bottom {
        grid-template-columns: 1fr;
      }
    }

    @media(max-width: 650px) {

      .quotation-header,
      .quotation-toolbar {
        flex-direction: column;
        align-items: stretch;
      }

      .quotation-info-grid {
        grid-template-columns: 1fr;
      }

      .quotation-actions {
        justify-content: stretch;
      }

      .quotation-actions button {
        flex: 1;
      }
    }

  `;

  document.head.appendChild(
    style
  );
}

/* =========================================================
   START
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    ensureCrmUiStyles();

    initializeCRM();

  }
);
