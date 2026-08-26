"use strict";

/* =========================================================
   MAHALAXMI ENTERPRISE CRM
========================================================= */

const API = "/api";

let currentPage = "dashboard";

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

const TITLES = {
  customers: "Customer",
  products: "Product",
  enquiries: "Enquiry",
  quotations: "Quotation",
  orders: "Order",
  followups: "Follow-up",
  payments: "Payment"
};

const NEW_FIELDS = {
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
    "freight",
    "gst_percent",
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
   HELPERS
========================================================= */

const $ = id =>
  document.getElementById(id);

function esc(value) {
  if (value == null) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(value) {
  return Number(value || 0).toLocaleString(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2
    }
  );
}

function date(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}

function human(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

/* =========================================================
   API
========================================================= */

async function api(endpoint, options = {}) {
  const response = await fetch(
    API + endpoint,
    {
      ...options,

      headers: {
        "Content-Type":
          "application/json",

        ...(options.headers || {})
      }
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Invalid server response (${response.status})`
    );
  }

  if (
    !response.ok ||
    data.success === false
  ) {
    throw new Error(
      data.error ||
      data.message ||
      "Request failed"
    );
  }

  return data;
}

const get = endpoint =>
  api(endpoint);

const post = (endpoint, data) =>
  api(
    endpoint,
    {
      method: "POST",
      body: JSON.stringify(data)
    }
  );

const put = (endpoint, data) =>
  api(
    endpoint,
    {
      method: "PUT",
      body: JSON.stringify(data)
    }
  );

const del = endpoint =>
  api(
    endpoint,
    {
      method: "DELETE"
    }
  );

/* =========================================================
   TOAST
========================================================= */

function toast(message, error = false) {
  let box =
    $("crmToast");

  if (!box) {
    box =
      document.createElement("div");

    box.id = "crmToast";

    box.className =
      "crm-toast";

    document.body.appendChild(box);
  }

  box.textContent =
    message;

  box.dataset.type =
    error
      ? "error"
      : "success";

  box.classList.add(
    "show"
  );

  clearTimeout(
    toast.timer
  );

  toast.timer =
    setTimeout(
      () =>
        box.classList.remove(
          "show"
        ),
      3500
    );
}

/* =========================================================
   MODAL
========================================================= */

function modal(
  title,
  body,
  size = ""
) {
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

  host.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal ${size}">

        <div class="modal-header">
          <h2>${esc(title)}</h2>

          <button
            class="modal-close"
            type="button"
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
    .onclick = close;

  host
    .querySelector(
      ".modal-backdrop"
    )
    .onclick = event => {
      if (
        event.target ===
        event.currentTarget
      ) {
        close();
      }
    };

  return {
    host,
    close
  };
}

/* =========================================================
   HEADER
========================================================= */

function updateHeader(page) {
  const info =
    PAGE_INFO[page] ||
    PAGE_INFO.dashboard;

  if ($("pageTitle")) {
    $("pageTitle").textContent =
      info.title;
  }

  if ($("pageSubtitle")) {
    $("pageSubtitle").textContent =
      info.subtitle;
  }
}

/* =========================================================
   LOADING
========================================================= */

function loading(message) {
  if (!$("content")) {
    return;
  }

  $("content").innerHTML = `
    <div class="loading">
      ${esc(message)}
    </div>
  `;
}

/* =========================================================
   LIST
========================================================= */

async function list(table) {
  try {
    const result =
      await get(
        `/${table}`
      );

    return result.data || [];

  } catch (error) {
    console.warn(
      table,
      error
    );

    return [];
  }
}

/* =========================================================
   DISPLAY HELPERS
========================================================= */

function badge(value) {
  return `
    <span class="badge">
      ${esc(value)}
    </span>
  `;
}

function cell(value, key) {
  if (
    value == null ||
    value === ""
  ) {
    return "—";
  }

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
    return date(value);
  }

  if (
    /price|amount|total|freight/.test(
      key
    )
  ) {
    return money(value);
  }

  if (
    /percent/.test(
      key
    )
  ) {
    return (
      esc(value) +
      "%"
    );
  }

  return esc(value);
}

/* =========================================================
   DASHBOARD
========================================================= */

async function dashboard() {
  loading(
    "Loading dashboard..."
  );

  const [
    customers,
    products,
    enquiries,
    quotations,
    orders,
    followups
  ] =
    await Promise.all([
      list("customers"),
      list("products"),
      list("enquiries"),
      list("quotations"),
      list("orders"),
      list("followups")
    ]);

  const totalQuotationValue =
    quotations.reduce(
      (sum, row) =>
        sum +
        Number(
          row.grand_total || 0
        ),
      0
    );

  $("content").innerHTML = `
    <div class="stats">

      ${stat(
        "Customers",
        customers.length,
        "Total customers"
      )}

      ${stat(
        "Products",
        products.length,
        "Product catalogue"
      )}

      ${stat(
        "Enquiries",
        enquiries.length,
        "Customer enquiries"
      )}

      ${stat(
        "Quotations",
        quotations.length,
        "Total quotations"
      )}

    </div>

    <div class="panel">

      <div class="panel-header">
        <h2>
          Business Summary
        </h2>
      </div>

      <div class="panel-body">

        <div class="stats">

          ${stat(
            "Orders",
            orders.length,
            "Sales orders"
          )}

          ${stat(
            "Follow-ups",
            followups.length,
            "Scheduled activities"
          )}

          ${stat(
            "Quotation Value",
            money(
              totalQuotationValue
            ),
            "Across all quotations"
          )}

        </div>

      </div>

    </div>
  `;
}

function stat(
  title,
  value,
  footer
) {
  return `
    <div class="stat-card">

      <div class="stat-label">
        ${esc(title)}
      </div>

      <div class="stat-value">
        ${esc(value)}
      </div>

      <div class="stat-footer">
        ${esc(footer)}
      </div>

    </div>
  `;
}

/* =========================================================
   GENERIC ENTITY PAGE
========================================================= */

async function entity(table) {
  loading(
    `Loading ${table}...`
  );

  const data =
    await list(table);

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
      "status",
      "freight",
      "gst_percent",
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

  const keys =
    (
      defaults[table] ||
      []
    ).filter(
      key =>
        data.some(
          row =>
            key in row
        )
    );

  $("content").innerHTML = `
    <div class="toolbar">

      <input
        id="search"
        placeholder="Search..."
      >

      <button
        class="button-primary"
        id="new"
      >
        + New
        ${esc(
          TITLES[table] ||
          human(table)
        )}
      </button>

    </div>

    <div class="panel">

      <div class="panel-body">

        <div class="table-wrapper">

          <table>

            <thead>
              <tr>

                ${keys
                  .map(
                    key =>
                      `<th>
                        ${esc(
                          human(key)
                        )}
                      </th>`
                  )
                  .join("")}

                <th>
                  Action
                </th>

              </tr>
            </thead>

            <tbody
              id="body"
            ></tbody>

          </table>

        </div>

      </div>

    </div>
  `;

  const draw = () => {
    const query =
      $("search")
        .value
        .toLowerCase();

    const filtered =
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

    $("body").innerHTML =
      filtered
        .map(
          row =>
            `
            <tr>

              ${keys
                .map(
                  key =>
                    `<td>
                      ${cell(
                        row[key],
                        key
                      )}
                    </td>`
                )
                .join("")}

              <td
                class="table-actions"
              >

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
  };

  $("search").oninput =
    draw;

  $("new").onclick =
    () => {
      if (
        table ===
        "quotations"
      ) {
        quotationEditor();
      } else {
        genericEditor(
          table,
          null,
          data
        );
      }
    };

  $("body").onclick =
    event => {
      const button =
        event.target.closest(
          "button"
        );

      if (!button) {
        return;
      }

      const record =
        data.find(
          row =>
            String(row.id) ===
            String(
              button.dataset.id
            )
        );

      if (!record) {
        return;
      }

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
        if (
          table ===
          "quotations"
        ) {
          quotationEditor(
            record
          );
        } else {
          genericEditor(
            table,
            record,
            data
          );
        }
      }

      else {
        if (
          table ===
          "quotations"
        ) {
          quotationView(
            record
          );
        } else {
          genericView(
            table,
            record
          );
        }
      }
    };

  draw();
}

/* =========================================================
   GENERIC VIEW
========================================================= */

function genericView(
  table,
  record
) {
  modal(
    `${
      TITLES[table] ||
      human(table)
    } #${record.id}`,

    `
      <div class="detail-grid">

        ${Object.entries(
          record
        )
          .filter(
            ([key]) =>
              ![
                "id",
                "created_at",
                "updated_at"
              ].includes(key)
          )
          .map(
            ([key, value]) =>
              `
              <div
                class="detail-item"
              >

                <div
                  class="detail-label"
                >
                  ${esc(
                    human(key)
                  )}
                </div>

                <div
                  class="detail-value"
                >
                  ${cell(
                    value,
                    key
                  )}
                </div>

              </div>
              `
          )
          .join("")}

      </div>
    `
  );
}

/* =========================================================
   INPUT
========================================================= */

function input(
  field,
  value
) {
  const type =
    /date/.test(field)
      ? "date"
      : /id$|amount|price|total|quantity|stock|percent|freight|gst|rate/.test(
          field
        )
      ? "number"
      : "text";

  if (
    /notes|description|address/.test(
      field
    )
  ) {
    return `
      <textarea
        name="${esc(field)}"
      >${esc(
        value ?? ""
      )}</textarea>
    `;
  }

  return `
    <input
      name="${esc(field)}"
      type="${type}"
      ${
        type === "number"
          ? 'step="any"'
          : ""
      }
      value="${esc(
        type === "date" &&
        value
          ? String(value).slice(
              0,
              10
            )
          : value ?? ""
      )}"
    >
  `;
}

/* =========================================================
   GENERIC EDITOR
========================================================= */

function genericEditor(
  table,
  record,
  records
) {
  const fields =
    record
      ? Object.keys(
          record
        ).filter(
          key =>
            ![
              "id",
              "created_at",
              "updated_at"
            ].includes(key)
        )
      : (
          NEW_FIELDS[table] ||
          Object.keys(
            records[0] || {}
          ).filter(
            key =>
              ![
                "id",
                "created_at",
                "updated_at"
              ].includes(key)
          )
        );

  const m =
    modal(
      `${
        record
          ? "Edit"
          : "New"
      } ${
        TITLES[table] ||
        human(table)
      }`,

      `
        <form id="generic">

          <div class="form-grid">

            ${fields
              .map(
                field =>
                  `
                  <label>
                    ${esc(
                      human(field)
                    )}

                    ${input(
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

          <div
            class="modal-actions"
          >

            <button
              type="button"
              data-close
            >
              Cancel
            </button>

            <button
              class="button-primary"
            >
              Save
            </button>

          </div>

        </form>
      `,

      "modal-large"
    );

  m.host
    .querySelector(
      "[data-close]"
    )
    .onclick =
    m.close;

  m.host
    .querySelector(
      "#generic"
    )
    .onsubmit =
    async event => {
      event.preventDefault();

      const data = {};

      new FormData(
        event.target
      ).forEach(
        (value, key) => {
          if (
            String(
              value
            ).trim() === ""
          ) {
            return;
          }

          data[key] =
            /id$|amount|price|total|quantity|stock|percent|freight|gst|rate/.test(
              key
            )
              ? Number(value)
              : value;
        }
      );

      try {
        if (record) {
          await put(
            `/${table}/${record.id}`,
            data
          );
        } else {
          await post(
            `/${table}`,
            data
          );
        }

        m.close();

        toast(
          "Saved successfully"
        );

        showPage(
          table
        );

      } catch (error) {
        toast(
          error.message,
          true
        );
      }
    };
}

/* =========================================================
   DELETE
========================================================= */

async function deleteRecord(
  table,
  record
) {
  if (
    !confirm(
      "Delete this record?"
    )
  ) {
    return;
  }

  try {
    await del(
      `/${table}/${record.id}`
    );

    toast(
      "Deleted successfully"
    );

    showPage(
      table
    );

  } catch (error) {
    toast(
      error.message,
      true
    );
  }
}

/* =========================================================
   QUOTATION ITEM ROW

   Individual discount
========================================================= */

function quotationItemRow(
  item = {}
) {
  const quantity =
    Number(
      item.quantity ||
      item.qty ||
      1
    );

  const rate =
    Number(
      item.rate ??
      item.unit_price ??
      item.price ??
      0
    );

  const discountPercent =
    Number(
      item.discount_percent ||
      0
    );

  const gross =
    quantity * rate;

  const discountAmount =
    gross *
    discountPercent /
    100;

  const net =
    gross -
    discountAmount;

  return `
    <tr
      data-item
    >

      <td>

        <input
          class="item-desc"
          value="${esc(
            item.description ||
            item.product_name ||
            item.name ||
            ""
          )}"
          placeholder="Product / description"
        >

      </td>

      <td>

        <input
          class="item-qty"
          type="number"
          min="0"
          step="any"
          value="${quantity}"
        >

      </td>

      <td>

        <input
          class="item-rate"
          type="number"
          min="0"
          step="any"
          value="${rate}"
        >

      </td>

      <td>

        <input
          class="item-discount-percent"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value="${discountPercent}"
        >

      </td>

      <td>

        <strong
          class="item-discount-amount"
        >
          ${money(
            discountAmount
          )}
        </strong>

      </td>

      <td>

        <strong
          class="item-net"
        >
          ${money(net)}
        </strong>

      </td>

      <td>

        <button
          type="button"
          class="remove-item"
        >
          Remove
        </button>

      </td>

    </tr>
  `;
}

/* =========================================================
   QUOTATION EDITOR
========================================================= */

async function quotationEditor(
  record = null
) {
  loading(
    "Preparing quotation..."
  );

  const [
    customers,
    products
  ] =
    await Promise.all([
      list("customers"),
      list("products")
    ]);

  let items = [];

  if (record) {
    try {
      const details =
        await get(
          `/quotations/${record.id}/details`
        );

      items =
        details.items || [];

    } catch (error) {
      console.warn(
        "Quotation items error",
        error
      );
    }
  }

  const q =
    record || {};

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const customerOptions =
    customers
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
                q.customer_id
              )
                ? "selected"
                : ""
            }
          >
            ${esc(
              customer.company_name ||
              customer.contact_person ||
              `Customer #${customer.id}`
            )}
          </option>
          `
      )
      .join("");

  const productOptions =
    products
      .map(
        product =>
          `
          <option
            value="${product.id}"
            data-name="${esc(
              product.name || ""
            )}"
            data-rate="${Number(
              product.selling_price ||
              0
            )}"
          >
            ${esc(
              product.name ||
              `Product #${product.id}`
            )}
          </option>
          `
      )
      .join("");

  const m =
    modal(
      `${
        record
          ? "Edit"
          : "New"
      } Quotation`,

      `
      <form id="quotationForm">

        <div
          class="quote-top-grid"
        >

          <label>
            Quotation Number

            <input
              readonly
              value="${esc(
                q.quotation_number ||
                "Auto-generated on save"
              )}"
            >
          </label>

          <label>
            Customer

            <select
              name="customer_id"
              required
            >
              <option value="">
                Select customer
              </option>

              ${customerOptions}

            </select>
          </label>

          <label>
            Quotation Date

            <input
              name="quotation_date"
              type="date"
              value="${esc(
                String(
                  q.quotation_date ||
                  today
                ).slice(
                  0,
                  10
                )
              )}"
            >
          </label>

          <label>
            Valid Until

            <input
              name="valid_until"
              type="date"
              value="${esc(
                q.valid_until
                  ? String(
                      q.valid_until
                    ).slice(
                      0,
                      10
                    )
                  : ""
              )}"
            >
          </label>

        </div>

        <div
          class="quote-section"
        >

          <div
            class="section-title-row"
          >

            <h3>
              Products / Items
            </h3>

            <button
              type="button"
              id="addItem"
            >
              + Add Product
            </button>

          </div>

          <div
            class="table-wrapper"
          >

            <table
              class="quote-items-table"
            >

              <thead>
                <tr>

                  <th>
                    Product
                  </th>

                  <th>
                    Description
                  </th>

                  <th>
                    Quantity
                  </th>

                  <th>
                    Rate
                  </th>

                  <th>
                    Discount %
                  </th>

                  <th>
                    Discount Amount
                  </th>

                  <th>
                    Net Amount
                  </th>

                  <th>
                    Action
                  </th>

                </tr>
              </thead>

              <tbody
                id="quotationItems"
              >

                ${
                  items.length
                    ? items
                        .map(
                          quotationItemRow
                        )
                        .join("")
                    : quotationItemRow()
                }

              </tbody>

            </table>

          </div>

        </div>

        <div
          class="quote-summary"
        >

          <div></div>

          <div
            class="quote-summary-box"
          >

            <div
              class="summary-line"
            >
              <span>
                Subtotal
              </span>

              <strong
                id="summarySubtotal"
              >
                ₹0.00
              </strong>
            </div>

            <div
              class="summary-line"
            >
              <span>
                Total Item Discount
              </span>

              <strong
                id="summaryDiscount"
              >
                ₹0.00
              </strong>
            </div>

            <div
              class="summary-line"
            >
              <span>
                Freight
              </span>

              <input
                id="freight"
                name="freight"
                type="number"
                min="0"
                step="0.01"
                value="${Number(
                  q.freight || 0
                )}"
              >
            </div>

            <div
              class="summary-line"
            >
              <span>
                Taxable Amount
              </span>

              <strong
                id="summaryTaxable"
              >
                ₹0.00
              </strong>
            </div>

            <div
              class="summary-line"
            >
              <span>
                GST %
              </span>

              <input
                id="gstPercent"
                name="gst_percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value="${Number(
                  q.gst_percent ??
                  18
                )}"
              >
            </div>

            <div
              class="summary-line"
            >
              <span>
                GST Amount
              </span>

              <strong
                id="summaryGST"
              >
                ₹0.00
              </strong>
            </div>

            <div
              class="grand-total-line"
            >
              <span>
                Grand Total
              </span>

              <strong
                id="summaryGrand"
              >
                ₹0.00
              </strong>
            </div>

          </div>

        </div>

        <label
          class="full-field"
        >
          Notes

          <textarea
            name="notes"
          >${esc(
            q.notes || ""
          )}</textarea>

        </label>

        <div
          class="modal-actions"
        >

          <button
            type="button"
            id="closeQuotation"
          >
            Cancel
          </button>

          <button
            class="button-primary"
            id="saveQuotation"
          >
            ${
              record
                ? "Save Changes"
                : "Save Quotation"
            }
          </button>

        </div>

      </form>
      `,

      "modal-xlarge"
    );

  const form =
    m.host.querySelector(
      "#quotationForm"
    );

  const itemsBody =
    m.host.querySelector(
      "#quotationItems"
    );

  /* =====================================================
     CALCULATE QUOTATION
  ===================================================== */

  function calculate() {
    let subtotal = 0;
    let totalDiscount = 0;
    let netSubtotal = 0;

    itemsBody
      .querySelectorAll(
        "[data-item]"
      )
      .forEach(row => {
        const quantity =
          Number(
            row.querySelector(
              ".item-qty"
            ).value
          ) || 0;

        const rate =
          Number(
            row.querySelector(
              ".item-rate"
            ).value
          ) || 0;

        const discountPercent =
          Math.max(
            0,
            Math.min(
              100,
              Number(
                row.querySelector(
                  ".item-discount-percent"
                ).value
              ) || 0
            )
          );

        const gross =
          quantity * rate;

        const discount =
          gross *
          discountPercent /
          100;

        const net =
          gross -
          discount;

        subtotal +=
          gross;

        totalDiscount +=
          discount;

        netSubtotal +=
          net;

        row.querySelector(
          ".item-discount-amount"
        ).textContent =
          money(discount);

        row.querySelector(
          ".item-net"
        ).textContent =
          money(net);
      });

    const freight =
      Math.max(
        0,
        Number(
          $("freight").value
        ) || 0
      );

    const taxable =
      netSubtotal +
      freight;

    const gstPercent =
      Math.max(
        0,
        Math.min(
          100,
          Number(
            $("gstPercent")
              .value
          ) || 0
        )
      );

    const gst =
      taxable *
      gstPercent /
      100;

    const grand =
      taxable +
      gst;

    $("summarySubtotal")
      .textContent =
      money(subtotal);

    $("summaryDiscount")
      .textContent =
      money(totalDiscount);

    $("summaryTaxable")
      .textContent =
      money(taxable);

    $("summaryGST")
      .textContent =
      money(gst);

    $("summaryGrand")
      .textContent =
      money(grand);

    return {
      subtotal,
      totalDiscount,
      netSubtotal,
      freight,
      taxable,
      gstPercent,
      gst,
      grand
    };
  }

  /* =====================================================
     EVENTS
  ===================================================== */

  itemsBody.oninput =
    calculate;

  $("freight").oninput =
    calculate;

  $("gstPercent").oninput =
    calculate;

  itemsBody.onclick =
    event => {
      const remove =
        event.target.closest(
          ".remove-item"
        );

      if (!remove) {
        return;
      }

      const row =
        remove.closest(
          "[data-item]"
        );

      if (row) {
        row.remove();
      }

      if (
        !itemsBody.querySelector(
          "[data-item]"
        )
      ) {
        itemsBody.insertAdjacentHTML(
          "beforeend",
          quotationItemRow()
        );
      }

      calculate();
    };

  m.host
    .querySelector(
      "#addItem"
    )
    .onclick =
    () => {
      itemsBody.insertAdjacentHTML(
        "beforeend",
        quotationItemRow()
      );

      calculate();
    };

  m.host
    .querySelector(
      "#closeQuotation"
    )
    .onclick =
    m.close;

  /* =====================================================
     SAVE QUOTATION
  ===================================================== */

  form.onsubmit =
    async event => {
      event.preventDefault();

      const button =
        $("saveQuotation");

      button.disabled =
        true;

      button.textContent =
        "Saving...";

      try {
        const totals =
          calculate();

        const formData =
          new FormData(
            form
          );

        const quotationData = {
          customer_id:
            Number(
              formData.get(
                "customer_id"
              )
            ),

          quotation_date:
            formData.get(
              "quotation_date"
            ),

          valid_until:
            formData.get(
              "valid_until"
            ) || null,

          status:
            "Draft",

          subtotal:
            totals.subtotal,

          discount_percent:
            0,

          discount_amount:
            totals.totalDiscount,

          discount:
            totals.totalDiscount,

          freight:
            totals.freight,

          taxable_amount:
            totals.taxable,

          gst_percent:
            totals.gstPercent,

          gst_amount:
            totals.gst,

          grand_total:
            totals.grand,

          notes:
            formData.get(
              "notes"
            ) || ""
        };

        let saved;

        if (record) {
          saved =
            await put(
              `/quotations/${record.id}`,
              quotationData
            );
        } else {
          saved =
            await post(
              "/quotations",
              quotationData
            );
        }

        const quotationId =
          record
            ? record.id
            : saved.id;

        /* ==============================================
           SAVE ITEMS
        ============================================== */

        if (record) {
          /*
             For now, existing quotation editing
             uses the current item records.

             New item saving is handled below.
          */
        }

        const rows =
          itemsBody.querySelectorAll(
            "[data-item]"
          );

        for (
          const row of rows
        ) {
          const description =
            row.querySelector(
              ".item-desc"
            ).value.trim();

          const quantity =
            Number(
              row.querySelector(
                ".item-qty"
              ).value
            ) || 0;

          const rate =
            Number(
              row.querySelector(
                ".item-rate"
              ).value
            ) || 0;

          const discountPercent =
            Number(
              row.querySelector(
                ".item-discount-percent"
              ).value
            ) || 0;

          if (
            !description &&
            quantity === 0 &&
            rate === 0
          ) {
            continue;
          }

          /*
             Existing item:
             update it.

             New item:
             create it.
          */

          const existingId =
            row.dataset.itemId;

          const gross =
            quantity *
            rate;

          const discountAmount =
            gross *
            discountPercent /
            100;

          const netAmount =
            gross -
            discountAmount;

          const itemData = {
            description,

            quantity,

            rate,

            discount_percent:
              discountPercent,

            discount_amount:
              discountAmount,

            net_amount:
              netAmount
          };

          if (
            existingId
          ) {
            await put(
              `/quotation_items/${existingId}`,
              itemData
            );
          } else {
            await post(
              `/quotations/${quotationId}/items`,
              itemData
            );
          }
        }

        /*
           Re-read quotation details.
        */

        const details =
          await get(
            `/quotations/${quotationId}/details`
          );

        /*
           Synchronize quotation totals
           with the individual item discounts.
        */

        const totals =
          details.totals;

        await put(
          `/quotations/${quotationId}`,
          {
            subtotal:
              totals.subtotal,

            discount_percent:
              0,

            discount_amount:
              totals.total_item_discount,

            discount:
              totals.total_item_discount,

            freight:
              totals.freight,

            taxable_amount:
              totals.taxable_amount,

            gst_percent:
              totals.gst_percent,

            gst_amount:
              totals.gst_amount,

            grand_total:
              totals.grand_total
          }
        );

        m.close();

        toast(
          "Quotation saved successfully"
        );

        await quotationView(
          details.quotation
        );

      } catch (error) {
        console.error(
          error
        );

        toast(
          error.message,
          true
        );

        button.disabled =
          false;

        button.textContent =
          record
            ? "Save Changes"
            : "Save Quotation";
      }
    };

  /*
     Calculate immediately.
  */

  calculate();
}

/* =========================================================
   WHATSAPP
========================================================= */

function shareWhatsApp(
  quotation,
  items,
  customerName
) {
  let message =
    `Quotation: ${quotation.quotation_number}\n`;

  message +=
    `Customer: ${customerName}\n`;

  message +=
    `Date: ${date(
      quotation.quotation_date
    )}\n\n`;

  message +=
    `Products:\n`;

  items.forEach(
    (item, index) => {
      message +=
        `${index + 1}. `;

      message +=
        `${item.description || "Item"} `;

      message +=
        `Qty: ${item.quantity} `;

      message +=
        `Rate: ${money(
          item.rate
        )} `;

      message +=
        `Discount: ${
          Number(
            item.discount_percent ||
            0
          )
        }% `;

      message +=
        `Net: ${money(
          item.net_amount
        )}\n`;
    }
  );

  message +=
    `\nSubtotal: ${money(
      quotation.subtotal
    )}`;

  message +=
    `\nTotal Item Discount: ${money(
      quotation.discount_amount
    )}`;

  message +=
    `\nFreight: ${money(
      quotation.freight
    )}`;

  message +=
    `\nTaxable Amount: ${money(
      quotation.taxable_amount
    )}`;

  message +=
    `\nGST ${
      Number(
        quotation.gst_percent ||
        0
      )
    }%: ${money(
      quotation.gst_amount
    )}`;

  message +=
    `\nGrand Total: ${money(
      quotation.grand_total
    )}`;

  window.open(
    "https://wa.me/?text=" +
      encodeURIComponent(
        message
      ),
    "_blank"
  );
}

/* =========================================================
   PRINT / PDF
========================================================= */

function printQuotation(
  quotation,
  items,
  customerName
) {
  const printWindow =
    window.open(
      "",
      "_blank"
    );

  if (!printWindow) {
    toast(
      "Please allow pop-ups to print the quotation",
      true
    );

    return;
  }

  const itemRows =
    items
      .map(
        (item, index) =>
          `
          <tr>

            <td>
              ${index + 1}
            </td>

            <td>
              ${esc(
                item.description ||
                item.product_name ||
                "Item"
              )}
            </td>

            <td>
              ${item.quantity}
            </td>

            <td>
              ${money(
                item.rate
              )}
            </td>

            <td>
              ${
                Number(
                  item.discount_percent ||
                  0
                )
              }%
            </td>

            <td>
              ${money(
                item.discount_amount
              )}
            </td>

            <td>
              ${money(
                item.net_amount
              )}
            </td>

          </tr>
          `
      )
      .join("");

  printWindow.document.write(
    `
    <!DOCTYPE html>

    <html>

    <head>

      <title>
        ${esc(
          quotation.quotation_number
        )}
      </title>

      <style>

        body {
          font-family: Arial, sans-serif;
          padding: 35px;
          color: #172033;
        }

        h1 {
          margin-bottom: 5px;
        }

        .company {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 25px;
        }

        .details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 25px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        th,
        td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }

        th {
          background: #f3f5f8;
        }

        .summary {
          width: 420px;
          margin-left: auto;
          margin-top: 25px;
        }

        .line {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          border-bottom: 1px solid #eee;
        }

        .grand {
          font-size: 20px;
          font-weight: 800;
          border-top: 2px solid #222;
          margin-top: 10px;
        }

        @media print {
          body {
            padding: 10px;
          }
        }

      </style>

    </head>

    <body>

      <div class="company">
        MAHALAXMI COMBUSTION
      </div>

      <h1>
        QUOTATION
      </h1>

      <div class="details">

        <div>
          <strong>
            Quotation No.
          </strong>

          <br>

          ${esc(
            quotation.quotation_number
          )}
        </div>

        <div>
          <strong>
            Customer
          </strong>

          <br>

          ${esc(
            customerName
          )}
        </div>

        <div>
          <strong>
            Date
          </strong>

          <br>

          ${date(
            quotation.quotation_date
          )}
        </div>

        <div>
          <strong>
            Valid Until
          </strong>

          <br>

          ${date(
            quotation.valid_until
          )}
        </div>

      </div>

      <table>

        <thead>

          <tr>

            <th>
              #
            </th>

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

          ${itemRows}

        </tbody>

      </table>

      <div
        class="summary"
      >

        <div class="line">
          <span>
            Subtotal
          </span>

          <strong>
            ${money(
              quotation.subtotal
            )}
          </strong>
        </div>

        <div class="line">
          <span>
            Total Item Discount
          </span>

          <strong>
            ${money(
              quotation.discount_amount
            )}
          </strong>
        </div>

        <div class="line">
          <span>
            Freight
          </span>

          <strong>
            ${money(
              quotation.freight
            )}
          </strong>
        </div>

        <div class="line">
          <span>
            Taxable Amount
          </span>

          <strong>
            ${money(
              quotation.taxable_amount
            )}
          </strong>
        </div>

        <div class="line">
          <span>
            GST ${
              Number(
                quotation.gst_percent ||
                0
              )
            }%
          </span>

          <strong>
            ${money(
              quotation.gst_amount
            )}
          </strong>
        </div>

        <div
          class="line grand"
        >

          <span>
            Grand Total
          </span>

          <strong>
            ${money(
              quotation.grand_total
            )}
          </strong>

        </div>

      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      <\/script>

    </body>

    </html>
    `
  );

  printWindow.document.close();
}

/* =========================================================
   VIEW QUOTATION

   FAST
   PRODUCT DETAILS
   INDIVIDUAL DISCOUNTS
   PDF
   WHATSAPP
========================================================= */

async function quotationView(
  record
) {
  /*
     Show loading immediately.
  */

  const loadingModal =
    modal(
      "Loading Quotation...",
      `
        <div
          style="
            padding:40px;
            text-align:center;
          "
        >
          Loading quotation details...
        </div>
      `,
      "modal-xlarge"
    );

  try {
    /*
       Only ONE quotation API request.
    */

    const details =
      await get(
        `/quotations/${record.id}/details`
      );

    const quotation =
      details.quotation;

    const items =
      details.items || [];

    /*
       Customer name.
       Only fetch customer if required.
    */

    let customerName =
      `Customer #${
        quotation.customer_id
      }`;

    try {
      const customer =
        await get(
          `/customers/${quotation.customer_id}`
        );

      if (
        customer.data
      ) {
        customerName =
          customer.data.company_name ||
          customer.data.contact_person ||
          customerName;
      }
    } catch {
      /*
         Customer lookup failure
         should NOT stop quotation view.
      */
    }

    loadingModal.close();

    const m =
      modal(
        `Quotation ${
          quotation.quotation_number
        }`,

        `
        <div
          class="quotation-view"
        >

          <div
            class="quotation-header-card"
          >

            <div>
              <div
                class="quotation-label"
              >
                Quotation No.
              </div>

              <strong>
                ${esc(
                  quotation.quotation_number
                )}
              </strong>
            </div>

            <div>
              <div
                class="quotation-label"
              >
                Customer
              </div>

              <strong>
                ${esc(
                  customerName
                )}
              </strong>
            </div>

            <div>
              <div
                class="quotation-label"
              >
                Date
              </div>

              <strong>
                ${date(
                  quotation.quotation_date
                )}
              </strong>
            </div>

          </div>

          <div
            class="quotation-products"
          >

            <div
              class="quotation-products-title"
            >
              Products / Items
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
                            item =>
                              `
                              <tr>

                                <td>
                                  ${esc(
                                    item.description ||
                                    item.product_name ||
                                    item.name ||
                                    "Item"
                                  )}
                                </td>

                                <td>
                                  ${item.quantity}
                                </td>

                                <td>
                                  ${money(
                                    item.rate
                                  )}
                                </td>

                                <td>
                                  ${
                                    Number(
                                      item.discount_percent ||
                                      0
                                    )
                                  }%
                                </td>

                                <td>
                                  ${money(
                                    item.discount_amount
                                  )}
                                </td>

                                <td>
                                  <strong>
                                    ${money(
                                      item.net_amount
                                    )}
                                  </strong>
                                </td>

                              </tr>
                              `
                          )
                          .join("")
                      : `
                        <tr>
                          <td
                            colspan="6"
                            style="
                              text-align:center;
                              padding:30px;
                            "
                          >
                            No quotation items
                          </td>
                        </tr>
                      `
                  }

                </tbody>

              </table>

            </div>

          </div>

          <div
            class="quotation-bottom"
          >

            <div></div>

            <div
              class="quotation-summary-view"
            >

              <div>
                <span>
                  Subtotal
                </span>

                <strong>
                  ${money(
                    quotation.subtotal
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Total Item Discount
                </span>

                <strong>
                  ${money(
                    quotation.discount_amount
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Freight
                </span>

                <strong>
                  ${money(
                    quotation.freight
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Taxable Amount
                </span>

                <strong>
                  ${money(
                    quotation.taxable_amount
                  )}
                </strong>
              </div>

              <div>
                <span>
                  GST ${
                    Number(
                      quotation.gst_percent ||
                      0
                    )
                  }%
                </span>

                <strong>
                  ${money(
                    quotation.gst_amount
                  )}
                </strong>
              </div>

              <div
                class="grand-total-view"
              >

                <span>
                  Grand Total
                </span>

                <strong>
                  ${money(
                    quotation.grand_total
                  )}
                </strong>

              </div>

            </div>

          </div>

          <div
            class="modal-actions quotation-actions"
          >

            <button
              type="button"
              id="printQuotation"
              class="button-primary"
            >
              Download / Print PDF
            </button>

            <button
              type="button"
              id="whatsappQuotation"
            >
              WhatsApp
            </button>

            <button
              type="button"
              id="editQuotation"
            >
              Edit Quotation
            </button>

            <button
              type="button"
              id="closeQuotationView"
            >
              Close
            </button>

          </div>

        </div>
        `,

        "modal-xlarge"
      );

    m.host
      .querySelector(
        "#closeQuotationView"
      )
      .onclick =
      m.close;

    m.host
      .querySelector(
        "#printQuotation"
      )
      .onclick =
      () =>
        printQuotation(
          quotation,
          items,
          customerName
        );

    m.host
      .querySelector(
        "#whatsappQuotation"
      )
      .onclick =
      () =>
        shareWhatsApp(
          quotation,
          items,
          customerName
        );

    m.host
      .querySelector(
        "#editQuotation"
      )
      .onclick =
      () => {
        m.close();

        quotationEditor(
          quotation
        );
      };

  } catch (error) {
    loadingModal.close();

    toast(
      error.message,
      true
    );
  }
}

/* =========================================================
   SHOW PAGE
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

  updateHeader(
    page
  );

  document
    .querySelectorAll(
      "[data-page]"
    )
    .forEach(
      element =>
        element.classList.toggle(
          "active",
          element.dataset.page ===
            page
        )
    );

  if (
    page ===
    "dashboard"
  ) {
    return dashboard();
  }

  return entity(
    page
  );
}

/* =========================================================
   STYLES
========================================================= */

function styles() {
  if (
    $("crmStyles")
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "crmStyles";

  style.textContent = `

    .toolbar {
      display:flex;
      justify-content:space-between;
      gap:15px;
      margin-bottom:20px;
    }

    .toolbar input {
      max-width:380px;
      width:100%;
      padding:11px;
      border:1px solid #d9e2ef;
      border-radius:10px;
    }

    .form-grid,
    .quote-top-grid {
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:15px;
    }

    .form-grid label,
    .quote-top-grid label,
    .full-field {
      display:flex;
      flex-direction:column;
      gap:7px;
      font-weight:600;
    }

    .form-grid input,
    .form-grid textarea,
    .quote-top-grid input,
    .quote-top-grid select,
    .full-field textarea {
      padding:10px;
      border:1px solid #d9e2ef;
      border-radius:9px;
    }

    .modal-xlarge {
      width:min(1250px,96vw);
    }

    .modal-large {
      width:min(900px,95vw);
    }

    .quote-section {
      margin-top:20px;
      border:1px solid #e2e8f0;
      border-radius:12px;
      overflow:hidden;
    }

    .section-title-row {
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:16px;
      background:#f8fafc;
    }

    .quote-items-table {
      min-width:1000px;
    }

    .quote-items-table input {
      width:100%;
      box-sizing:border-box;
      padding:9px;
      border:1px solid #d9e2ef;
      border-radius:7px;
    }

    .quote-items-table th {
      white-space:nowrap;
    }

    .quote-items-table td {
      vertical-align:middle;
    }

    .quote-summary {
      display:grid;
      grid-template-columns:1fr 460px;
      gap:25px;
      margin-top:20px;
    }

    .quote-summary-box {
      border:1px solid #dbe4f0;
      border-radius:12px;
      padding:16px;
      background:#fff;
    }

    .summary-line,
    .grand-total-line {
      display:grid;
      grid-template-columns:1fr 170px;
      gap:10px;
      align-items:center;
      padding:10px 0;
      border-bottom:1px solid #edf1f6;
    }

    .summary-line input {
      text-align:right;
      width:100%;
      box-sizing:border-box;
      padding:8px;
      border:1px solid #d9e2ef;
      border-radius:7px;
    }

    .grand-total-line {
      border-top:2px solid #d7dfeb;
      border-bottom:0;
      font-size:18px;
      padding-top:14px;
    }

    .grand-total-line strong {
      font-size:24px;
    }

    .quotation-header-card {
      display:grid;
      grid-template-columns:1fr 1fr 1fr;
      gap:20px;
      padding:20px;
      border:1px solid #e1e7ef;
      border-radius:12px;
      background:#fff;
    }

    .quotation-label {
      font-size:12px;
      color:#667085;
      text-transform:uppercase;
      margin-bottom:5px;
      letter-spacing:.04em;
    }

    .quotation-products {
      margin-top:20px;
      border:1px solid #e1e7ef;
      border-radius:12px;
      overflow:hidden;
    }

    .quotation-products-title {
      font-size:18px;
      font-weight:700;
      padding:16px;
      background:#f8fafc;
    }

    .quotation-bottom {
      display:grid;
      grid-template-columns:1fr 460px;
      gap:25px;
      margin-top:20px;
    }

    .quotation-summary-view {
      border:1px solid #dbe4f0;
      border-radius:12px;
      padding:16px;
      background:#fff;
    }

    .quotation-summary-view > div {
      display:flex;
      justify-content:space-between;
      padding:10px 0;
      border-bottom:1px solid #edf1f6;
    }

    .quotation-summary-view
    .grand-total-view {
      border-top:2px solid #222;
      border-bottom:0;
      margin-top:5px;
      padding-top:15px;
      font-size:20px;
    }

    .quotation-summary-view
    .grand-total-view strong {
      font-size:24px;
    }

    .quotation-actions {
      justify-content:flex-end;
      gap:10px;
      flex-wrap:wrap;
      margin-top:20px;
    }

    .success-card {
      text-align:center;
      background:#fff;
      border:1px solid #dbe5f0;
      border-radius:18px;
      padding:45px;
    }

    .success-icon {
      width:62px;
      height:62px;
      border-radius:50%;
      margin:auto;
      display:grid;
      place-items:center;
      background:#e9f9ef;
      color:#16834a;
      font-size:32px;
      font-weight:bold;
    }

    .saved-total {
      font-size:30px;
      font-weight:800;
      margin:18px;
    }

    .saved-actions {
      display:flex;
      justify-content:center;
      gap:10px;
      flex-wrap:wrap;
    }

    .crm-toast {
      position:fixed;
      right:20px;
      bottom:20px;
      background:#172033;
      color:white;
      padding:13px 18px;
      border-radius:10px;
      z-index:99999;
      opacity:0;
      transition:.2s;
    }

    .crm-toast.show {
      opacity:1;
    }

    .crm-toast[data-type="error"] {
      background:#b42318;
    }

    @media(max-width:900px) {

      .form-grid,
      .quote-top-grid,
      .quote-summary,
      .quotation-bottom,
      .quotation-header-card {
        grid-template-columns:1fr;
      }

      .modal-xlarge {
        width:96vw;
      }

    }

  `;

  document.head.appendChild(
    style
  );
}

/* =========================================================
   BOOT
========================================================= */

function boot() {
  styles();

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

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    boot
  );
} else {
  boot();
}
