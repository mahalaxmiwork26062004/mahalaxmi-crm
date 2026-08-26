/* =========================================================
   MAHALAXMI ENTERPRISE CRM
   COMPLETE APP.JS
   VERSION 5.0
========================================================= */

"use strict";

/* =========================================================
   API
========================================================= */

const API = "/api";

let currentPage = "dashboard";
let pageRequest = 0;

let customersCache = null;
let productsCache = null;


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


/* =========================================================
   TITLES
========================================================= */

const TITLES = {
    customers: "Customer",
    products: "Product",
    enquiries: "Enquiry",
    quotations: "Quotation",
    orders: "Order",
    followups: "Follow-up",
    payments: "Payment"
};


/* =========================================================
   NEW RECORD FIELDS
========================================================= */

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

const $ = id => document.getElementById(id);


function esc(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function num(value, fallback = 0) {

    const n = Number(value);

    return Number.isFinite(n)
        ? n
        : fallback;
}


function round2(value) {

    return Math.round(
        (num(value) + Number.EPSILON) * 100
    ) / 100;
}


function money(value) {

    return round2(value).toLocaleString(
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

    try {

        const d = new Date(value);

        if (Number.isNaN(d.getTime())) {
            return "—";
        }

        return d.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    } catch {

        return "—";
    }
}


function inputDate(value) {

    if (!value) {
        return "";
    }

    return String(value).slice(0, 10);
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

    const controller = new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        15000
    );

    try {

        const response = await fetch(
            API + endpoint,
            {
                ...options,

                signal: controller.signal,

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

        if (!response.ok || result.success === false) {

            throw new Error(
                result.error ||
                result.message ||
                `Request failed (${response.status})`
            );
        }

        return result;

    } catch (error) {

        if (error.name === "AbortError") {

            throw new Error(
                "Server response timed out. Please try again."
            );
        }

        throw error;

    } finally {

        clearTimeout(timeout);
    }
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

    let box = $("crmToast");

    if (!box) {

        box = document.createElement("div");

        box.id = "crmToast";

        box.className = "crm-toast";

        document.body.appendChild(box);
    }

    box.textContent = message;

    box.dataset.type =
        error
            ? "error"
            : "success";

    box.classList.add("show");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(
        () => box.classList.remove("show"),
        3500
    );
}


/* =========================================================
   MODAL
========================================================= */

function modalHost() {

    let host = $("crmModalHost");

    if (!host) {

        host = document.createElement("div");

        host.id = "crmModalHost";

        document.body.appendChild(host);
    }

    return host;
}


function modal(
    title,
    body,
    size = ""
) {

    const host = modalHost();

    host.innerHTML = `

        <div class="modal-backdrop">

            <div class="modal ${size}">

                <div class="modal-header">

                    <h2>
                        ${esc(title)}
                    </h2>

                    <button
                        type="button"
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

    const close = () => {

        host.innerHTML = "";
    };

    const closeButton =
        host.querySelector(".modal-close");

    if (closeButton) {

        closeButton.onclick = close;
    }

    const backdrop =
        host.querySelector(".modal-backdrop");

    if (backdrop) {

        backdrop.onclick = event => {

            if (
                event.target ===
                event.currentTarget
            ) {

                close();
            }
        };
    }

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

function loading(message = "Loading...") {

    const content = $("content");

    if (!content) {
        return;
    }

    content.innerHTML = `

        <div class="crm-loading">

            <div class="crm-spinner"></div>

            <div>
                ${esc(message)}
            </div>

        </div>

    `;
}


/* =========================================================
   ERROR PAGE
========================================================= */

function showError(message) {

    const content = $("content");

    if (!content) {
        return;
    }

    content.innerHTML = `

        <div class="error-card">

            <div class="error-icon">
                !
            </div>

            <h2>
                Unable to load CRM
            </h2>

            <p>
                ${esc(message)}
            </p>

            <button
                class="button-primary"
                id="retryCRM"
            >
                Retry
            </button>

        </div>

    `;

    const retry =
        $("retryCRM");

    if (retry) {

        retry.onclick = () =>
            showPage(currentPage);
    }
}


/* =========================================================
   TABLE HELPERS
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
        value === null ||
        value === undefined ||
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
        /date|_at$/.test(key)
    ) {

        return date(value);
    }

    if (
        /price|amount|total|freight|gst/.test(key)
    ) {

        return money(value);
    }

    if (
        /percent/.test(key)
    ) {

        return esc(value) + "%";
    }

    return esc(value);
}


/* =========================================================
   GET LIST
========================================================= */

async function list(table) {

    const result =
        await get(`/${table}`);

    return result.data || [];
}


/* =========================================================
   CACHE
========================================================= */

async function getCustomers() {

    if (customersCache) {

        return customersCache;
    }

    customersCache =
        await list("customers");

    return customersCache;
}


async function getProducts() {

    if (productsCache) {

        return productsCache;
    }

    productsCache =
        await list("products");

    return productsCache;
}


/* =========================================================
   DASHBOARD
========================================================= */

async function dashboard() {

    const requestId =
        ++pageRequest;

    loading(
        "Loading dashboard..."
    );

    try {

        /*
         * Keep dashboard requests parallel.
         * This is much faster than loading
         * each API one after another.
         */

        const results =
            await Promise.all(
                [
                    list("customers"),
                    list("products"),
                    list("enquiries"),
                    list("quotations"),
                    list("orders"),
                    list("followups")
                ]
            );

        if (
            requestId !== pageRequest
        ) {

            return;
        }

        const customers =
            results[0];

        const products =
            results[1];

        const enquiries =
            results[2];

        const quotations =
            results[3];

        const orders =
            results[4];

        const followups =
            results[5];

        const quotationValue =
            quotations.reduce(
                (total, quotation) =>
                    total +
                    num(
                        quotation.grand_total
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
                                quotationValue
                            ),
                            "Across all quotations"
                        )}

                    </div>

                </div>

            </div>

        `;

    } catch (error) {

        console.error(
            "Dashboard Error:",
            error
        );

        showError(
            error.message
        );
    }
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

    const requestId =
        ++pageRequest;

    loading(
        `Loading ${table}...`
    );

    try {

        const data =
            await list(table);

        if (
            requestId !== pageRequest
        ) {

            return;
        }

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
            ],

            followups: [
                "id",
                "customer_id",
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
                    type="search"
                    autocomplete="off"
                    placeholder="Search..."
                >

                <button
                    class="button-primary"
                    id="new"
                    type="button"
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

                                    ${keys.map(
                                        key =>
                                            `<th>${esc(
                                                human(key)
                                            )}</th>`
                                    ).join("")}

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

            const search =
                (
                    $("search")
                    ?.value ||
                    ""
                )
                    .toLowerCase()
                    .trim();

            const filtered =
                data.filter(
                    row => {

                        if (!search) {
                            return true;
                        }

                        return Object
                            .values(row)
                            .some(
                                value =>
                                    String(
                                        value ??
                                        ""
                                    )
                                        .toLowerCase()
                                        .includes(
                                            search
                                        )
                            );
                    }
                );

            $("body").innerHTML =
                filtered.length

                    ? filtered
                        .map(
                            row => `

                                <tr>

                                    ${keys.map(
                                        key =>
                                            `<td>${cell(
                                                row[key],
                                                key
                                            )}</td>`
                                    ).join("")}

                                    <td
                                        class="table-actions"
                                    >

                                        ${
                                            table ===
                                            "quotations"

                                                ? `
                                                    <button
                                                        data-action="view"
                                                        data-id="${esc(row.id)}"
                                                    >
                                                        View
                                                    </button>
                                                `

                                                : `
                                                    <button
                                                        data-action="view"
                                                        data-id="${esc(row.id)}"
                                                    >
                                                        View
                                                    </button>
                                                `
                                        }

                                        <button
                                            data-action="edit"
                                            data-id="${esc(row.id)}"
                                        >
                                            Edit
                                        </button>

                                        <button
                                            data-action="delete"
                                            data-id="${esc(row.id)}"
                                            class="danger-button"
                                        >
                                            Delete
                                        </button>

                                    </td>

                                </tr>

                            `
                        )
                        .join("")

                    : `

                        <tr>

                            <td
                                colspan="${
                                    keys.length + 1
                                }"
                                class="empty-state"
                            >
                                No records found
                            </td>

                        </tr>

                    `;
        };

        $("search").oninput =
            draw;

        $("new").onclick = () => {

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

                const id =
                    button.dataset.id;

                const record =
                    data.find(
                        item =>
                            String(item.id) ===
                            String(id)
                    );

                if (!record) {
                    return;
                }

                const action =
                    button.dataset.action;

                if (
                    action ===
                    "delete"
                ) {

                    deleteRecord(
                        table,
                        record
                    );

                    return;
                }

                if (
                    action ===
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

                    return;
                }

                if (
                    action ===
                    "view"
                ) {

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

    } catch (error) {

        console.error(
            `${table} Error:`,
            error
        );

        showError(
            error.message
        );
    }
}


/* =========================================================
   GENERIC VIEW
========================================================= */

function genericView(
    table,
    record
) {

    modal(
        `${TITLES[table] || human(table)} #${record.id}`,

        `

        <div class="detail-grid">

            ${
                Object.entries(
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
                        ([key, value]) => `

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
                    .join("")
            }

        </div>

        `,

        "modal-large"
    );
}


/* =========================================================
   INPUT
========================================================= */

function inputField(
    field,
    value
) {

    const numeric =
        /id$|amount|price|total|quantity|stock|percent|freight|gst|rate/.test(
            field
        );

    const dateType =
        /date/.test(
            field
        );

    if (
        /notes|description|address/.test(
            field
        )
    ) {

        return `

            <textarea
                name="${esc(field)}"
                rows="4"
            >${esc(value ?? "")}</textarea>

        `;
    }

    return `

        <input
            name="${esc(field)}"
            type="${
                dateType
                    ? "date"
                    : numeric
                        ? "number"
                        : "text"
            }"

            ${
                numeric
                    ? 'step="any"'
                    : ""
            }

            value="${
                dateType
                    ? esc(
                        inputDate(value)
                    )
                    : esc(
                        value ?? ""
                    )
            }"
        >

    `;
}


/* =========================================================
   GENERIC EDITOR
========================================================= */

function genericEditor(
    table,
    record,
    records = []
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
            `${record ? "Edit" : "New"} ${
                TITLES[table] ||
                human(table)
            }`,

            `

            <form id="genericForm">

                <div class="form-grid">

                    ${fields.map(
                        field => `

                            <label>

                                <span>
                                    ${esc(
                                        human(field)
                                    )}
                                </span>

                                ${inputField(
                                    field,
                                    record?.[field]
                                )}

                            </label>

                        `
                    ).join("")}

                </div>

                <div
                    class="modal-actions"
                >

                    <button
                        type="button"
                        id="cancelGeneric"
                    >
                        Cancel
                    </button>

                    <button
                        class="button-primary"
                        type="submit"
                    >
                        Save
                    </button>

                </div>

            </form>

            `,

            "modal-large"
        );

    $("cancelGeneric").onclick =
        m.close;

    $("genericForm").onsubmit =
        async event => {

            event.preventDefault();

            const button =
                event.target.querySelector(
                    'button[type="submit"]'
                );

            button.disabled = true;

            button.textContent =
                "Saving...";

            try {

                const data = {};

                new FormData(
                    event.target
                ).forEach(
                    (value, key) => {

                        if (
                            String(value)
                                .trim() === ""
                        ) {

                            return;
                        }

                        if (
                            /id$|amount|price|total|quantity|stock|percent|freight|gst|rate/.test(
                                key
                            )
                        ) {

                            data[key] =
                                Number(
                                    value
                                );

                        } else {

                            data[key] =
                                value;
                        }
                    }
                );

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

                await showPage(
                    table
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
                    "Save";
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
            `Delete this ${TITLES[table] || table}?`
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

        await showPage(
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
   NORMALIZE QUOTATION ITEM
========================================================= */

function normalizeQuotationItem(
    item
) {

    const quantity =
        num(
            item.quantity ??
            item.qty,
            0
        );

    const rate =
        num(
            item.rate ??
            item.unit_price ??
            item.price,
            0
        );

    const discountPercent =
        Math.max(
            0,
            Math.min(
                100,
                num(
                    item.discount_percent,
                    0
                )
            )
        );

    const gross =
        round2(
            quantity *
            rate
        );

    const discountAmount =
        round2(
            item.discount_amount ??
            (
                gross *
                discountPercent /
                100
            )
        );

    const netAmount =
        round2(
            item.net_amount ??
            (
                gross -
                discountAmount
            )
        );

    return {

        id:
            item.id,

        product_id:
            item.product_id,

        description:
            item.description ||
            item.product_name ||
            item.name ||
            "",

        quantity,

        rate,

        discount_percent:
            discountPercent,

        discount_amount:
            discountAmount,

        gross_amount:
            gross,

        net_amount:
            netAmount
    };
}


/* =========================================================
   CALCULATE ITEM TOTALS
========================================================= */

function calculateItemTotals(
    row
) {

    const quantity =
        Math.max(
            0,
            num(
                row.querySelector(
                    ".quotation-quantity"
                )?.value,
                0
            )
        );

    const rate =
        Math.max(
            0,
            num(
                row.querySelector(
                    ".quotation-rate"
                )?.value,
                0
            )
        );

    const discountPercent =
        Math.max(
            0,
            Math.min(
                100,
                num(
                    row.querySelector(
                        ".quotation-discount-percent"
                    )?.value,
                    0
                )
            )
        );

    const gross =
        round2(
            quantity *
            rate
        );

    const discountAmount =
        round2(
            gross *
            discountPercent /
            100
        );

    const net =
        round2(
            gross -
            discountAmount
        );

    const discountField =
        row.querySelector(
            ".quotation-discount-amount"
        );

    const netField =
        row.querySelector(
            ".quotation-net-amount"
        );

    const grossField =
        row.querySelector(
            ".quotation-gross-amount"
        );

    if (discountField) {

        discountField.value =
            money(discountAmount);
    }

    if (netField) {

        netField.value =
            money(net);
    }

    if (grossField) {

        grossField.textContent =
            money(gross);
    }

    return {

        quantity,

        rate,

        discountPercent,

        gross,

        discountAmount,

        net
    };
}


/* =========================================================
   QUOTATION TOTAL CALCULATION
========================================================= */

function calculateQuotationTotals(
    container
) {

    const rows =
        [
            ...container.querySelectorAll(
                ".quotation-item"
            )
        ];

    let subtotal = 0;

    let totalItemDiscount = 0;

    let totalNet = 0;

    rows.forEach(
        row => {

            const result =
                calculateItemTotals(
                    row
                );

            subtotal +=
                result.gross;

            totalItemDiscount +=
                result.discountAmount;

            totalNet +=
                result.net;
        }
    );

    subtotal =
        round2(subtotal);

    totalItemDiscount =
        round2(
            totalItemDiscount
        );

    totalNet =
        round2(totalNet);

    const freight =
        Math.max(
            0,
            num(
                container.querySelector(
                    ".quotation-freight"
                )?.value,
                0
            )
        );

    const gstPercent =
        Math.max(
            0,
            Math.min(
                100,
                num(
                    container.querySelector(
                        ".quotation-gst-percent"
                    )?.value,
                    18
                )
            )
        );

    const taxableAmount =
        round2(
            totalNet +
            freight
        );

    const gstAmount =
        round2(
            taxableAmount *
            gstPercent /
            100
        );

    const grandTotal =
        round2(
            taxableAmount +
            gstAmount
        );

    const setText =
        (
            selector,
            value
        ) => {

            const element =
                container.querySelector(
                    selector
                );

            if (element) {

                element.textContent =
                    money(value);
            }
        };

    setText(
        ".quotation-subtotal",
        subtotal
    );

    setText(
        ".quotation-total-discount",
        totalItemDiscount
    );

    setText(
        ".quotation-net-before-freight",
        totalNet
    );

    setText(
        ".quotation-taxable",
        taxableAmount
    );

    setText(
        ".quotation-gst",
        gstAmount
    );

    setText(
        ".quotation-grand-total",
        grandTotal
    );

    return {

        subtotal,

        totalItemDiscount,

        totalNet,

        freight,

        taxableAmount,

        gstPercent,

        gstAmount,

        grandTotal
    };
}


/* =========================================================
   QUOTATION ITEM HTML
========================================================= */

function quotationItemHTML(
    item = {},
    products = []
) {

    const normalized =
        normalizeQuotationItem(
            item
        );

    const productOptions =
        products
            .map(
                product => {

                    const selected =
                        String(
                            product.id
                        ) ===
                        String(
                            normalized.product_id
                        );

                    const productName =
                        product.name ||
                        product.description ||
                        `Product #${product.id}`;

                    const productRate =
                        num(
                            product.selling_price ??
                            product.rate ??
                            product.price,
                            0
                        );

                    return `

                        <option
                            value="${esc(product.id)}"
                            data-name="${esc(productName)}"
                            data-rate="${productRate}"
                            ${selected ? "selected" : ""}
                        >
                            ${esc(productName)}
                        </option>

                    `;
                }
            )
            .join("");

    return `

        <div
            class="quotation-item"
            data-item-id="${esc(normalized.id || "")}"
        >

            <div class="quotation-item-grid">

                <div class="quotation-field product-field">

                    <label>
                        Product
                    </label>

                    <select
                        class="quotation-product"
                    >

                        <option value="">
                            Select product
                        </option>

                        ${productOptions}

                    </select>

                </div>


                <div class="quotation-field description-field">

                    <label>
                        Description
                    </label>

                    <input
                        class="quotation-description"
                        type="text"
                        value="${esc(
                            normalized.description
                        )}"
                        placeholder="Product description"
                    >

                </div>


                <div class="quotation-field">

                    <label>
                        Quantity
                    </label>

                    <input
                        class="quotation-quantity"
                        type="number"
                        min="0"
                        step="any"
                        value="${normalized.quantity || 1}"
                    >

                </div>


                <div class="quotation-field">

                    <label>
                        Rate
                    </label>

                    <input
                        class="quotation-rate"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${normalized.rate}"
                    >

                </div>


                <div class="quotation-field">

                    <label>
                        Discount %
                    </label>

                    <input
                        class="quotation-discount-percent"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value="${normalized.discount_percent}"
                    >

                </div>


                <div class="quotation-field">

                    <label>
                        Discount Amount
                    </label>

                    <input
                        class="quotation-discount-amount readonly-field"
                        type="text"
                        readonly
                        value="${money(
                            normalized.discount_amount
                        )}"
                    >

                </div>


                <div class="quotation-field">

                    <label>
                        Net Amount
                    </label>

                    <input
                        class="quotation-net-amount readonly-field"
                        type="text"
                        readonly
                        value="${money(
                            normalized.net_amount
                        )}"
                    >

                </div>


                <div class="quotation-field remove-field">

                    <label>
                        &nbsp;
                    </label>

                    <button
                        type="button"
                        class="remove-item"
                    >
                        Remove
                    </button>

                </div>

            </div>

        </div>

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

    try {

        /*
         * Customers and products are loaded
         * in parallel.
         */

        const [
            customers,
            products
        ] = await Promise.all(
            [
                getCustomers(),
                getProducts()
            ]
        );

        let existingItems = [];

        if (record) {

            try {

                const details =
                    await get(
                        `/quotations/${record.id}/details`
                    );

                existingItems =
                    (
                        details.items ||
                        []
                    ).map(
                        normalizeQuotationItem
                    );

            } catch (error) {

                console.warn(
                    "Unable to load quotation items:",
                    error
                );
            }
        }

        const quotation =
            record || {};

        const today =
            new Date()
                .toISOString()
                .slice(
                    0,
                    10
                );

        const customerOptions =
            customers
                .map(
                    customer => {

                        const name =
                            customer.company_name ||
                            customer.contact_person ||
                            `Customer #${customer.id}`;

                        return `

                            <option
                                value="${esc(customer.id)}"
                                ${
                                    String(
                                        customer.id
                                    ) ===
                                    String(
                                        quotation.customer_id
                                    )
                                        ? "selected"
                                        : ""
                                }
                            >
                                ${esc(name)}
                            </option>

                        `;
                    }
                )
                .join("");

        const itemsHTML =
            existingItems.length

                ? existingItems
                    .map(
                        item =>
                            quotationItemHTML(
                                item,
                                products
                            )
                    )
                    .join("")

                : quotationItemHTML(
                    {},
                    products
                );

        const m =
            modal(

                record
                    ? `Edit Quotation ${
                        quotation.quotation_number ||
                        ""
                    }`
                    : "Create New Quotation",

                `

                <form
                    id="quotationForm"
                >

                    <div class="quotation-top-card">

                        <div class="quotation-top-grid">

                            <label>

                                <span>
                                    Quotation Number
                                </span>

                                <input
                                    type="text"
                                    readonly
                                    value="${
                                        esc(
                                            quotation.quotation_number ||
                                            "Auto-generated on save"
                                        )
                                    }"
                                >

                            </label>


                            <label>

                                <span>
                                    Customer
                                </span>

                                <select
                                    name="customer_id"
                                    required
                                >

                                    <option value="">
                                        Select Customer
                                    </option>

                                    ${customerOptions}

                                </select>

                            </label>


                            <label>

                                <span>
                                    Quotation Date
                                </span>

                                <input
                                    name="quotation_date"
                                    type="date"
                                    value="${
                                        esc(
                                            inputDate(
                                                quotation.quotation_date ||
                                                today
                                            )
                                        )
                                    }"
                                    required
                                >

                            </label>


                            <label>

                                <span>
                                    Valid Until
                                </span>

                                <input
                                    name="valid_until"
                                    type="date"
                                    value="${
                                        esc(
                                            inputDate(
                                                quotation.valid_until
                                            )
                                        )
                                    }"
                                >

                            </label>

                        </div>

                    </div>


                    <div class="quotation-products-card">

                        <div
                            class="quotation-section-header"
                        >

                            <div>

                                <h3>
                                    Products / Items
                                </h3>

                                <p>
                                    Apply discount individually to each product.
                                </p>

                            </div>

                            <button
                                type="button"
                                class="button-primary"
                                id="addQuotationItem"
                            >
                                + Add Product
                            </button>

                        </div>


                        <div
                            id="quotationItems"
                        >

                            ${itemsHTML}

                        </div>

                    </div>


                    <div class="quotation-bottom-grid">

                        <div>

                            <label
                                class="notes-field"
                            >

                                <span>
                                    Notes
                                </span>

                                <textarea
                                    name="notes"
                                    rows="6"
                                    placeholder="Payment terms, delivery details, remarks..."
                                >${esc(
                                    quotation.notes || ""
                                )}</textarea>

                            </label>

                        </div>


                        <div
                            class="quotation-summary-card"
                        >

                            <h3>
                                Quotation Summary
                            </h3>


                            <div class="summary-row">

                                <span>
                                    Subtotal
                                </span>

                                <strong
                                    class="quotation-subtotal"
                                >
                                    ₹0.00
                                </strong>

                            </div>


                            <div class="summary-row">

                                <span>
                                    Total Item Discount
                                </span>

                                <strong
                                    class="quotation-total-discount"
                                >
                                    ₹0.00
                                </strong>

                            </div>


                            <div class="summary-row">

                                <span>
                                    Net Product Value
                                </span>

                                <strong
                                    class="quotation-net-before-freight"
                                >
                                    ₹0.00
                                </strong>

                            </div>


                            <div class="summary-row input-row">

                                <span>
                                    Freight
                                </span>

                                <input
                                    class="quotation-freight"
                                    name="freight"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value="${num(
                                        quotation.freight,
                                        0
                                    )}"
                                >

                            </div>


                            <div class="summary-row">

                                <span>
                                    Taxable Amount
                                </span>

                                <strong
                                    class="quotation-taxable"
                                >
                                    ₹0.00
                                </strong>

                            </div>


                            <div class="summary-row input-row">

                                <span>
                                    GST %
                                </span>

                                <input
                                    class="quotation-gst-percent"
                                    name="gst_percent"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value="${num(
                                        quotation.gst_percent,
                                        18
                                    )}"
                                >

                            </div>


                            <div class="summary-row">

                                <span>
                                    GST Amount
                                </span>

                                <strong
                                    class="quotation-gst"
                                >
                                    ₹0.00
                                </strong>

                            </div>


                            <div class="grand-total-row">

                                <span>
                                    Grand Total
                                </span>

                                <strong
                                    class="quotation-grand-total"
                                >
                                    ₹0.00
                                </strong>

                            </div>

                        </div>

                    </div>


                    <div
                        class="modal-actions quotation-actions"
                    >

                        <button
                            type="button"
                            id="cancelQuotation"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
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

        const itemsContainer =
            m.host.querySelector(
                "#quotationItems"
            );


        /* =====================================================
           CALCULATE
        ===================================================== */

        const recalculate =
            () => {

                calculateQuotationTotals(
                    m.host
                );
            };


        /* =====================================================
           ITEM EVENTS
        ===================================================== */

        itemsContainer.addEventListener(
            "input",
            event => {

                if (
                    event.target.matches(
                        ".quotation-quantity, .quotation-rate, .quotation-discount-percent"
                    )
                ) {

                    recalculate();
                }
            }
        );


        itemsContainer.addEventListener(
            "change",
            event => {

                if (
                    event.target.matches(
                        ".quotation-product"
                    )
                ) {

                    const row =
                        event.target.closest(
                            ".quotation-item"
                        );

                    const option =
                        event.target.options[
                            event.target.selectedIndex
                        ];

                    if (!row || !option) {
                        return;
                    }

                    const productName =
                        option.dataset.name ||
                        "";

                    const productRate =
                        num(
                            option.dataset.rate,
                            0
                        );

                    const description =
                        row.querySelector(
                            ".quotation-description"
                        );

                    const rate =
                        row.querySelector(
                            ".quotation-rate"
                        );

                    if (
                        description &&
                        !description.value.trim()
                    ) {

                        description.value =
                            productName;
                    }

                    if (
                        rate &&
                        productRate > 0
                    ) {

                        rate.value =
                            productRate;
                    }

                    recalculate();
                }
            }
        );


        itemsContainer.addEventListener(
            "click",
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
                        ".quotation-item"
                    );

                if (!row) {
                    return;
                }

                const allRows =
                    itemsContainer.querySelectorAll(
                        ".quotation-item"
                    );

                /*
                 * Always keep at least one row.
                 */

                if (
                    allRows.length === 1
                ) {

                    row.querySelector(
                        ".quotation-product"
                    ).value = "";

                    row.querySelector(
                        ".quotation-description"
                    ).value = "";

                    row.querySelector(
                        ".quotation-quantity"
                    ).value = 1;

                    row.querySelector(
                        ".quotation-rate"
                    ).value = 0;

                    row.querySelector(
                        ".quotation-discount-percent"
                    ).value = 0;

                } else {

                    row.remove();
                }

                recalculate();
            }
        );


        /* =====================================================
           ADD PRODUCT
        ===================================================== */

        m.host.querySelector(
            "#addQuotationItem"
        ).onclick =
            () => {

                itemsContainer.insertAdjacentHTML(
                    "beforeend",

                    quotationItemHTML(
                        {},
                        products
                    )
                );

                recalculate();
            };


        /* =====================================================
           SUMMARY EVENTS
        ===================================================== */

        m.host.querySelector(
            ".quotation-freight"
        ).addEventListener(
            "input",
            recalculate
        );


        m.host.querySelector(
            ".quotation-gst-percent"
        ).addEventListener(
            "input",
            recalculate
        );


        /* =====================================================
           CANCEL
        ===================================================== */

        m.host.querySelector(
            "#cancelQuotation"
        ).onclick =
            m.close;


        /* =====================================================
           INITIAL CALCULATION
        ===================================================== */

        recalculate();


        /* =====================================================
           SAVE QUOTATION
        ===================================================== */

        form.onsubmit =
            async event => {

                event.preventDefault();

                const saveButton =
                    m.host.querySelector(
                        "#saveQuotation"
                    );

                saveButton.disabled =
                    true;

                saveButton.textContent =
                    "Saving...";


                try {

                    const totals =
                        calculateQuotationTotals(
                            m.host
                        );

                    const formData =
                        new FormData(
                            form
                        );

                    const customerId =
                        Number(
                            formData.get(
                                "customer_id"
                            )
                        );

                    if (
                        !customerId
                    ) {

                        throw new Error(
                            "Please select a customer."
                        );
                    }


                    const quotationPayload = {

                        customer_id:
                            customerId,

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

                        /*
                         * IMPORTANT:
                         * There is NO overall discount.
                         *
                         * All discounts are calculated
                         * at individual product level.
                         */

                        discount_percent:
                            0,

                        discount_amount:
                            totals.totalItemDiscount,

                        discount:
                            totals.totalItemDiscount,

                        subtotal:
                            totals.subtotal,

                        freight:
                            totals.freight,

                        taxable_amount:
                            totals.taxableAmount,

                        gst_percent:
                            totals.gstPercent,

                        gst_amount:
                            totals.gstAmount,

                        grand_total:
                            totals.grandTotal,

                        notes:
                            formData.get(
                                "notes"
                            ) || ""
                    };


                    /* =================================================
                       SAVE QUOTATION
                    ================================================= */

                    let saved;

                    if (record) {

                        saved =
                            await put(
                                `/quotations/${record.id}`,
                                quotationPayload
                            );

                    } else {

                        saved =
                            await post(
                                "/quotations",
                                quotationPayload
                            );
                    }


                    const quotationId =
                        record
                            ? record.id
                            : saved.id;


                    if (!quotationId) {

                        throw new Error(
                            "Quotation was saved but no quotation ID was returned."
                        );
                    }


                    /* =================================================
                       SAVE ITEMS
                    ================================================= */

                    const rows =
                        [
                            ...itemsContainer.querySelectorAll(
                                ".quotation-item"
                            )
                        ];

                    const existingIds =
                        [];


                    for (
                        const row of rows
                    ) {

                        const description =
                            row.querySelector(
                                ".quotation-description"
                            )?.value
                                .trim() ||
                            "";

                        const productId =
                            row.querySelector(
                                ".quotation-product"
                            )?.value ||
                            null;

                        const quantity =
                            num(
                                row.querySelector(
                                    ".quotation-quantity"
                                )?.value,
                                0
                            );

                        const rate =
                            num(
                                row.querySelector(
                                    ".quotation-rate"
                                )?.value,
                                0
                            );

                        const discountPercent =
                            num(
                                row.querySelector(
                                    ".quotation-discount-percent"
                                )?.value,
                                0
                            );

                        if (
                            !description &&
                            !productId &&
                            quantity === 0 &&
                            rate === 0
                        ) {

                            continue;
                        }


                        const gross =
                            round2(
                                quantity *
                                rate
                            );

                        const discountAmount =
                            round2(
                                gross *
                                discountPercent /
                                100
                            );

                        const netAmount =
                            round2(
                                gross -
                                discountAmount
                            );


                        const existingId =
                            row.dataset.itemId;


                        const itemData = {

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

                            net_amount:
                                netAmount
                        };


                        if (existingId) {

                            existingIds.push(
                                String(
                                    existingId
                                )
                            );

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


                    /* =================================================
                       DELETE REMOVED OLD ITEMS
                    ================================================= */

                    if (record) {

                        const oldDetails =
                            await get(
                                `/quotations/${quotationId}/details`
                            );

                        const oldItems =
                            oldDetails.items ||
                            [];

                        for (
                            const oldItem
                            of oldItems
                        ) {

                            if (
                                oldItem.id &&
                                !existingIds.includes(
                                    String(
                                        oldItem.id
                                    )
                                )
                            ) {

                                /*
                                 * If the old item was removed
                                 * from the quotation.
                                 */

                                try {

                                    await del(
                                        `/quotation_items/${oldItem.id}`
                                    );

                                } catch (
                                    deleteError
                                ) {

                                    console.warn(
                                        "Unable to delete removed item:",
                                        deleteError
                                    );
                                }
                            }
                        }
                    }


                    /*
                     * Re-save final quotation totals.
                     *
                     * This keeps the quotation header
                     * synchronized with item discounts.
                     */

                    await put(
                        `/quotations/${quotationId}`,
                        quotationPayload
                    );


                    m.close();

                    toast(
                        "Quotation saved successfully"
                    );


                    await showSavedQuotation(
                        quotationId
                    );

                } catch (error) {

                    console.error(
                        "QUOTATION SAVE ERROR:",
                        error
                    );

                    toast(
                        error.message,
                        true
                    );

                    saveButton.disabled =
                        false;

                    saveButton.textContent =
                        record
                            ? "Save Changes"
                            : "Save Quotation";
                }
            };

    } catch (error) {

        console.error(
            "QUOTATION EDITOR ERROR:",
            error
        );

        showError(
            error.message
        );
    }
}


/* =========================================================
   SAVED QUOTATION PAGE
========================================================= */

async function showSavedQuotation(
    quotationId
) {

    loading(
        "Loading saved quotation..."
    );

    try {

        const details =
            await get(
                `/quotations/${quotationId}/details`
            );

        const quotation =
            details.quotation;

        const items =
            details.items || [];

        let customerName =
            `Customer #${quotation.customer_id}`;

        try {

            const customers =
                await getCustomers();

            const customer =
                customers.find(
                    item =>
                        String(item.id) ===
                        String(
                            quotation.customer_id
                        )
                );

            if (customer) {

                customerName =
                    customer.company_name ||
                    customer.contact_person ||
                    customerName;
            }

        } catch {}

        $("content").innerHTML = `

            <div class="success-card">

                <div class="success-icon">
                    ✓
                </div>

                <h2>
                    Quotation Saved Successfully
                </h2>

                <p>
                    Quotation
                    <strong>
                        ${esc(
                            quotation.quotation_number
                        )}
                    </strong>
                    has been saved.
                </p>

                <div class="saved-total">
                    ${money(
                        quotation.grand_total
                    )}
                </div>

                <div
                    class="saved-actions"
                >

                    <button
                        class="button-primary"
                        id="newQuotation"
                    >
                        + New Quotation
                    </button>

                    <button
                        id="viewSavedQuotation"
                    >
                        View Quotation
                    </button>

                    <button
                        id="pdfSavedQuotation"
                    >
                        PDF / Print
                    </button>

                    <button
                        id="whatsappSavedQuotation"
                    >
                        WhatsApp
                    </button>

                    <button
                        id="backQuotations"
                    >
                        Back to Quotations
                    </button>

                </div>

            </div>

        `;


        $("newQuotation").onclick =
            () =>
                quotationEditor();


        $("viewSavedQuotation").onclick =
            () =>
                quotationView(
                    quotation
                );


        $("pdfSavedQuotation").onclick =
            () =>
                printQuotation(
                    quotation,
                    items,
                    customerName
                );


        $("whatsappSavedQuotation").onclick =
            () =>
                shareWA(
                    quotation,
                    items,
                    customerName
                );


        $("backQuotations").onclick =
            () =>
                showPage(
                    "quotations"
                );

    } catch (error) {

        console.error(
            error
        );

        showError(
            error.message
        );
    }
}


/* =========================================================
   QUOTATION VIEW
========================================================= */

async function quotationView(
    record
) {

    /*
     * Show modal immediately.
     * User should never see a blank screen.
     */

    const loadingModal =
        modal(
            `Quotation ${
                record.quotation_number ||
                ""
            }`,

            `

            <div class="quotation-loading">

                <div class="crm-spinner"></div>

                <p>
                    Loading quotation details...
                </p>

            </div>

            `,

            "modal-xlarge"
        );


    try {

        /*
         * ONLY ONE quotation details API call.
         */

        const details =
            await get(
                `/quotations/${record.id}/details`
            );

        const quotation =
            details.quotation ||
            record;

        const rawItems =
            details.items ||
            [];

        /*
         * Normalize and calculate every item
         * on the frontend.
         *
         * This means the View screen will show
         * products even if old database rows do
         * not have net_amount saved.
         */

        const items =
            rawItems.map(
                normalizeQuotationItem
            );


        /*
         * Calculate final totals from items.
         */

        let subtotal = 0;

        let totalDiscount = 0;

        let netProductValue = 0;

        items.forEach(
            item => {

                subtotal +=
                    item.gross_amount;

                totalDiscount +=
                    item.discount_amount;

                netProductValue +=
                    item.net_amount;
            }
        );


        subtotal =
            round2(subtotal);

        totalDiscount =
            round2(totalDiscount);

        netProductValue =
            round2(netProductValue);


        const freight =
            Math.max(
                0,
                num(
                    quotation.freight,
                    0
                )
            );

        const gstPercent =
            Math.max(
                0,
                num(
                    quotation.gst_percent,
                    18
                )
            );

        const taxableAmount =
            round2(
                netProductValue +
                freight
            );

        const gstAmount =
            round2(
                taxableAmount *
                gstPercent /
                100
            );

        const grandTotal =
            round2(
                taxableAmount +
                gstAmount
            );


        /*
         * Customer name.
         */

        let customerName =
            `Customer #${
                quotation.customer_id
            }`;

        try {

            const customers =
                await getCustomers();

            const customer =
                customers.find(
                    item =>
                        String(item.id) ===
                        String(
                            quotation.customer_id
                        )
                );

            if (customer) {

                customerName =
                    customer.company_name ||
                    customer.contact_person ||
                    customerName;
            }

        } catch {}


        loadingModal.close();


        const m =
            modal(

                `Quotation ${
                    quotation.quotation_number ||
                    `#${quotation.id}`
                }`,

                `

                <div
                    class="quotation-view"
                >


                    <div
                        class="quotation-view-header"
                    >

                        <div>

                            <span>
                                Quotation No.
                            </span>

                            <strong>
                                ${esc(
                                    quotation.quotation_number ||
                                    `#${quotation.id}`
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Customer
                            </span>

                            <strong>
                                ${esc(
                                    customerName
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Date
                            </span>

                            <strong>
                                ${date(
                                    quotation.quotation_date
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Valid Until
                            </span>

                            <strong>
                                ${date(
                                    quotation.valid_until
                                )}
                            </strong>

                        </div>

                    </div>


                    <div
                        class="quotation-view-card"
                    >

                        <div
                            class="quotation-view-title"
                        >

                            <div>

                                <h3>
                                    Products / Items
                                </h3>

                                <p>
                                    ${items.length}
                                    product${
                                        items.length === 1
                                            ? ""
                                            : "s"
                                    }
                                </p>

                            </div>

                        </div>


                        <div
                            class="table-wrapper"
                        >

                            <table
                                class="quotation-view-table"
                            >

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

                                    ${
                                        items.length

                                            ? items
                                                .map(
                                                    (
                                                        item,
                                                        index
                                                    ) => `

                                                        <tr>

                                                            <td>
                                                                ${
                                                                    index +
                                                                    1
                                                                }
                                                            </td>

                                                            <td>

                                                                <strong>
                                                                    ${esc(
                                                                        item.description ||
                                                                        "Item"
                                                                    )}
                                                                </strong>

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
                                                                ${item.discount_percent}%
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
                                                        colspan="7"
                                                        class="empty-state"
                                                    >
                                                        No quotation items found.
                                                    </td>

                                                </tr>

                                            `
                                    }

                                </tbody>

                            </table>

                        </div>

                    </div>


                    <div
                        class="quotation-view-summary"
                    >

                        <div></div>


                        <div
                            class="quotation-summary-card"
                        >

                            <h3>
                                Quotation Summary
                            </h3>


                            <div
                                class="summary-row"
                            >

                                <span>
                                    Subtotal
                                </span>

                                <strong>
                                    ${money(
                                        subtotal
                                    )}
                                </strong>

                            </div>


                            <div
                                class="summary-row discount-summary"
                            >

                                <span>
                                    Total Item Discount
                                </span>

                                <strong>
                                    ${money(
                                        totalDiscount
                                    )}
                                </strong>

                            </div>


                            <div
                                class="summary-row"
                            >

                                <span>
                                    Net Product Value
                                </span>

                                <strong>
                                    ${money(
                                        netProductValue
                                    )}
                                </strong>

                            </div>


                            <div
                                class="summary-row"
                            >

                                <span>
                                    Freight
                                </span>

                                <strong>
                                    ${money(
                                        freight
                                    )}
                                </strong>

                            </div>


                            <div
                                class="summary-row"
                            >

                                <span>
                                    Taxable Amount
                                </span>

                                <strong>
                                    ${money(
                                        taxableAmount
                                    )}
                                </strong>

                            </div>


                            <div
                                class="summary-row"
                            >

                                <span>
                                    GST ${
                                        gstPercent
                                    }%
                                </span>

                                <strong>
                                    ${money(
                                        gstAmount
                                    )}
                                </strong>

                            </div>


                            <div
                                class="grand-total-row"
                            >

                                <span>
                                    Grand Total
                                </span>

                                <strong>
                                    ${money(
                                        grandTotal
                                    )}
                                </strong>

                            </div>

                        </div>

                    </div>


                    <div
                        class="quotation-view-actions"
                    >

                        <button
                            type="button"
                            data-pdf
                            class="button-primary"
                        >
                            PDF / Print
                        </button>

                        <button
                            type="button"
                            data-wa
                        >
                            WhatsApp
                        </button>

                        <button
                            type="button"
                            data-edit
                        >
                            Edit Quotation
                        </button>

                        <button
                            type="button"
                            data-close
                        >
                            Close
                        </button>

                    </div>

                </div>

                `,

                "modal-xlarge"
            );


        m.host.querySelector(
            "[data-close]"
        ).onclick =
            m.close;


        m.host.querySelector(
            "[data-edit]"
        ).onclick =
            () => {

                m.close();

                quotationEditor(
                    quotation
                );
            };


        m.host.querySelector(
            "[data-pdf]"
        ).onclick =
            () =>
                printQuotation(
                    quotation,
                    items,
                    customerName
                );


        m.host.querySelector(
            "[data-wa]"
        ).onclick =
            () =>
                shareWA(
                    {
                        ...quotation,

                        subtotal,

                        discount_amount:
                            totalDiscount,

                        discount:
                            totalDiscount,

                        taxable_amount:
                            taxableAmount,

                        gst_amount:
                            gstAmount,

                        grand_total:
                            grandTotal
                    },
                    items,
                    customerName
                );

    } catch (error) {

        console.error(
            "QUOTATION VIEW ERROR:",
            error
        );

        loadingModal.close();

        modal(
            "Quotation Error",

            `

            <div
                class="error-card"
            >

                <div
                    class="error-icon"
                >
                    !
                </div>

                <h3>
                    Unable to load quotation
                </h3>

                <p>
                    ${esc(
                        error.message
                    )}
                </p>

            </div>

            `
        );
    }
}


/* =========================================================
   PRINT / PDF
========================================================= */

function printQuotation(
    quotation,
    items,
    customerName
) {

    const normalizedItems =
        items.map(
            normalizeQuotationItem
        );


    let subtotal = 0;

    let totalDiscount = 0;

    let netProductValue = 0;

    normalizedItems.forEach(
        item => {

            subtotal +=
                item.gross_amount;

            totalDiscount +=
                item.discount_amount;

            netProductValue +=
                item.net_amount;
        }
    );


    subtotal =
        round2(subtotal);

    totalDiscount =
        round2(totalDiscount);

    netProductValue =
        round2(netProductValue);


    const freight =
        num(
            quotation.freight,
            0
        );

    const gstPercent =
        num(
            quotation.gst_percent,
            18
        );

    const taxableAmount =
        round2(
            netProductValue +
            freight
        );

    const gstAmount =
        round2(
            taxableAmount *
            gstPercent /
            100
        );

    const grandTotal =
        round2(
            taxableAmount +
            gstAmount
        );


    const itemRows =
        normalizedItems
            .map(
                (
                    item,
                    index
                ) => `

                    <tr>

                        <td>
                            ${index + 1}
                        </td>

                        <td>
                            ${esc(
                                item.description ||
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
                            ${item.discount_percent}%
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
            .join("");


    const printWindow =
        window.open(
            "",
            "_blank",
            "width=1100,height=800"
        );


    if (!printWindow) {

        toast(
            "Please allow pop-ups to print the quotation.",
            true
        );

        return;
    }


    printWindow.document.write(`

        <!DOCTYPE html>

        <html>

        <head>

            <meta charset="UTF-8">

            <title>
                ${esc(
                    quotation.quotation_number ||
                    "Quotation"
                )}
            </title>


            <style>

                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    padding: 35px;
                    font-family: Arial, Helvetica, sans-serif;
                    color: #172033;
                    background: white;
                }

                .company {
                    font-size: 26px;
                    font-weight: 800;
                    letter-spacing: .5px;
                }

                .company-subtitle {
                    color: #667085;
                    margin-top: 4px;
                    font-size: 13px;
                }

                .quotation-title {
                    text-align: right;
                    font-size: 30px;
                    font-weight: 800;
                    margin-top: -35px;
                }

                .line {
                    border-top: 2px solid #172033;
                    margin: 25px 0;
                }

                .details {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                    margin-bottom: 25px;
                }

                .detail {
                    border: 1px solid #dfe5ec;
                    border-radius: 8px;
                    padding: 12px;
                }

                .detail-label {
                    font-size: 11px;
                    color: #667085;
                    text-transform: uppercase;
                    margin-bottom: 5px;
                }

                .detail-value {
                    font-weight: 700;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }

                th {
                    background: #f2f5f9;
                    text-align: left;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: .5px;
                }

                th,
                td {
                    border: 1px solid #dfe5ec;
                    padding: 10px;
                    font-size: 12px;
                }

                .summary {
                    width: 430px;
                    margin-left: auto;
                    margin-top: 25px;
                }

                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 9px 0;
                    border-bottom: 1px solid #e5e7eb;
                }

                .grand {
                    display: flex;
                    justify-content: space-between;
                    border-top: 2px solid #172033;
                    padding-top: 14px;
                    margin-top: 5px;
                    font-size: 18px;
                    font-weight: 800;
                }

                .notes {
                    margin-top: 35px;
                    border: 1px solid #dfe5ec;
                    padding: 15px;
                    border-radius: 8px;
                }

                .footer {
                    margin-top: 45px;
                    color: #667085;
                    font-size: 11px;
                }

                @media print {

                    body {
                        padding: 15mm;
                    }

                    @page {
                        size: A4;
                        margin: 10mm;
                    }

                }

            </style>

        </head>


        <body>

            <div class="company">
                MAHALAXMI COMBUSTION
            </div>

            <div class="company-subtitle">
                Enterprise CRM
            </div>

            <div class="quotation-title">
                QUOTATION
            </div>

            <div class="line"></div>


            <div class="details">

                <div class="detail">

                    <div class="detail-label">
                        Quotation No.
                    </div>

                    <div class="detail-value">
                        ${esc(
                            quotation.quotation_number ||
                            ""
                        )}
                    </div>

                </div>


                <div class="detail">

                    <div class="detail-label">
                        Customer
                    </div>

                    <div class="detail-value">
                        ${esc(
                            customerName
                        )}
                    </div>

                </div>


                <div class="detail">

                    <div class="detail-label">
                        Date
                    </div>

                    <div class="detail-value">
                        ${date(
                            quotation.quotation_date
                        )}
                    </div>

                </div>


                <div class="detail">

                    <div class="detail-label">
                        Valid Until
                    </div>

                    <div class="detail-value">
                        ${date(
                            quotation.valid_until
                        )}
                    </div>

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

                    ${
                        itemRows ||
                        `
                            <tr>
                                <td
                                    colspan="7"
                                    style="text-align:center"
                                >
                                    No items
                                </td>
                            </tr>
                        `
                    }

                </tbody>

            </table>


            <div class="summary">

                <div class="summary-row">

                    <span>
                        Subtotal
                    </span>

                    <strong>
                        ${money(
                            subtotal
                        )}
                    </strong>

                </div>


                <div class="summary-row">

                    <span>
                        Total Item Discount
                    </span>

                    <strong>
                        ${money(
                            totalDiscount
                        )}
                    </strong>

                </div>


                <div class="summary-row">

                    <span>
                        Net Product Value
                    </span>

                    <strong>
                        ${money(
                            netProductValue
                        )}
                    </strong>

                </div>


                <div class="summary-row">

                    <span>
                        Freight
                    </span>

                    <strong>
                        ${money(
                            freight
                        )}
                    </strong>

                </div>


                <div class="summary-row">

                    <span>
                        Taxable Amount
                    </span>

                    <strong>
                        ${money(
                            taxableAmount
                        )}
                    </strong>

                </div>


                <div class="summary-row">

                    <span>
                        GST ${gstPercent}%
                    </span>

                    <strong>
                        ${money(
                            gstAmount
                        )}
                    </strong>

                </div>


                <div class="grand">

                    <span>
                        Grand Total
                    </span>

                    <strong>
                        ${money(
                            grandTotal
                        )}
                    </strong>

                </div>

            </div>


            ${
                quotation.notes
                    ? `

                        <div class="notes">

                            <strong>
                                Notes
                            </strong>

                            <div style="margin-top:8px">
                                ${esc(
                                    quotation.notes
                                )}
                            </div>

                        </div>

                    `
                    : ""
            }


            <div class="footer">

                Thank you for your business.

            </div>


            <script>

                window.onload = function() {

                    setTimeout(
                        function() {

                            window.print();

                        },
                        300
                    );

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

function shareWA(
    quotation,
    items,
    customerName
) {

    const normalizedItems =
        items.map(
            normalizeQuotationItem
        );


    let subtotal = 0;

    let discount = 0;

    let net = 0;


    normalizedItems.forEach(
        item => {

            subtotal +=
                item.gross_amount;

            discount +=
                item.discount_amount;

            net +=
                item.net_amount;
        }
    );


    subtotal =
        round2(subtotal);

    discount =
        round2(discount);

    net =
        round2(net);


    const freight =
        num(
            quotation.freight,
            0
        );

    const gstPercent =
        num(
            quotation.gst_percent,
            18
        );

    const taxable =
        round2(
            net +
            freight
        );

    const gst =
        round2(
            taxable *
            gstPercent /
            100
        );

    const grand =
        round2(
            taxable +
            gst
        );


    let message =
        `*MAHALAXMI COMBUSTION*\n`;

    message +=
        `Quotation: ${
            quotation.quotation_number ||
            ""
        }\n`;

    message +=
        `Customer: ${
            customerName
        }\n`;

    message +=
        `Date: ${
            date(
                quotation.quotation_date
            )
        }\n\n`;


    message +=
        `*Products:*\n`;


    normalizedItems.forEach(
        (
            item,
            index
        ) => {

            message +=
                `${index + 1}. ${
                    item.description ||
                    "Item"
                }\n`;

            message +=
                `Qty: ${
                    item.quantity
                } × ${
                    money(
                        item.rate
                    )
                }\n`;

            message +=
                `Discount: ${
                    item.discount_percent
                }% (${
                    money(
                        item.discount_amount
                    )
                })\n`;

            message +=
                `Net: ${
                    money(
                        item.net_amount
                    )
                }\n\n`;
        }
    );


    message +=
        `Subtotal: ${
            money(subtotal)
        }\n`;

    message +=
        `Total Item Discount: ${
            money(discount)
        }\n`;

    message +=
        `Freight: ${
            money(freight)
        }\n`;

    message +=
        `Taxable Amount: ${
            money(taxable)
        }\n`;

    message +=
        `GST ${gstPercent}%: ${
            money(gst)
        }\n`;

    message +=
        `*Grand Total: ${
            money(grand)
        }*`;


    const url =
        "https://wa.me/?text=" +
        encodeURIComponent(
            message
        );


    window.open(
        url,
        "_blank"
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

    updateHeader(
        page
    );

    pageRequest++;


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

        /* ================================================
           GENERAL
        ================================================ */

        .crm-loading {

            min-height:420px;

            display:flex;

            flex-direction:column;

            justify-content:center;

            align-items:center;

            gap:14px;

            color:#667085;

            font-size:15px;

        }


        .crm-spinner {

            width:34px;

            height:34px;

            border:3px solid #e5e7eb;

            border-top-color:#2563eb;

            border-radius:50%;

            animation:
                crmSpin .8s linear infinite;

        }


        @keyframes crmSpin {

            to {
                transform:rotate(360deg);
            }

        }


        .error-card {

            background:#fff;

            border:1px solid #e4e7ec;

            border-radius:18px;

            padding:50px;

            text-align:center;

            max-width:650px;

            margin:50px auto;

        }


        .error-icon {

            width:56px;

            height:56px;

            border-radius:50%;

            background:#fee4e2;

            color:#b42318;

            display:grid;

            place-items:center;

            font-size:25px;

            font-weight:800;

            margin:0 auto 18px;

        }


        /* ================================================
           TOOLBAR
        ================================================ */

        .toolbar {

            display:flex;

            justify-content:space-between;

            align-items:center;

            gap:15px;

            margin-bottom:20px;

        }


        .toolbar input {

            width:100%;

            max-width:420px;

            padding:12px 14px;

            border:1px solid #d9e2ef;

            border-radius:10px;

            outline:none;

        }


        .toolbar input:focus {

            border-color:#2563eb;

            box-shadow:
                0 0 0 3px
                rgba(37,99,235,.10);

        }


        /* ================================================
           PANELS
        ================================================ */

        .panel {

            background:#fff;

            border:1px solid #e5eaf1;

            border-radius:16px;

            overflow:hidden;

        }


        .panel-header {

            padding:18px 20px;

            border-bottom:1px solid #edf0f4;

        }


        .panel-header h2 {

            margin:0;

        }


        .panel-body {

            padding:20px;

        }


        /* ================================================
           TABLE
        ================================================ */

        .table-wrapper {

            width:100%;

            overflow-x:auto;

        }


        table {

            width:100%;

            border-collapse:collapse;

        }


        th {

            background:#f8fafc;

            color:#475467;

            font-size:12px;

            text-transform:uppercase;

            letter-spacing:.4px;

            text-align:left;

            padding:13px 12px;

            border-bottom:1px solid #e5e7eb;

            white-space:nowrap;

        }


        td {

            padding:13px 12px;

            border-bottom:1px solid #edf0f4;

            vertical-align:middle;

        }


        tr:last-child td {

            border-bottom:0;

        }


        .table-actions {

            white-space:nowrap;

        }


        .table-actions button {

            margin-right:5px;

            padding:7px 10px;

            border:1px solid #d9e2ef;

            background:#fff;

            border-radius:7px;

            cursor:pointer;

        }


        .table-actions button:hover {

            background:#f5f7fa;

        }


        .table-actions .danger-button {

            color:#b42318;

        }


        .empty-state {

            text-align:center;

            color:#667085;

            padding:35px !important;

        }


        .badge {

            display:inline-flex;

            align-items:center;

            padding:4px 9px;

            border-radius:20px;

            background:#eef4ff;

            color:#175cd3;

            font-size:12px;

            font-weight:600;

        }


        /* ================================================
           STATS
        ================================================ */

        .stats {

            display:grid;

            grid-template-columns:
                repeat(4, minmax(0,1fr));

            gap:18px;

            margin-bottom:20px;

        }


        .stat-card {

            background:#fff;

            border:1px solid #e5eaf1;

            border-radius:16px;

            padding:20px;

        }


        .stat-label {

            color:#667085;

            font-size:14px;

        }


        .stat-value {

            margin-top:8px;

            font-size:27px;

            font-weight:800;

            color:#172033;

        }


        .stat-footer {

            margin-top:6px;

            color:#98a2b3;

            font-size:12px;

        }


        /* ================================================
           MODAL
        ================================================ */

        .modal-backdrop {

            position:fixed;

            inset:0;

            background:
                rgba(15,23,42,.62);

            display:flex;

            justify-content:center;

            align-items:center;

            padding:25px;

            z-index:9990;

        }


        .modal {

            width:min(700px,96vw);

            max-height:94vh;

            background:#fff;

            border-radius:18px;

            box-shadow:
                0 25px 70px
                rgba(0,0,0,.25);

            overflow:hidden;

            display:flex;

            flex-direction:column;

        }


        .modal-large {

            width:min(900px,96vw);

        }


        .modal-xlarge {

            width:min(1250px,97vw);

        }


        .modal-header {

            display:flex;

            justify-content:space-between;

            align-items:center;

            padding:20px 25px;

            border-bottom:1px solid #e8ecf2;

            flex-shrink:0;

        }


        .modal-header h2 {

            margin:0;

            font-size:23px;

        }


        .modal-close {

            width:40px;

            height:40px;

            border:1px solid #dfe4ea;

            background:#fff;

            border-radius:10px;

            font-size:25px;

            cursor:pointer;

        }


        .modal-body {

            padding:24px;

            overflow:auto;

        }


        /* ================================================
           FORMS
        ================================================ */

        .form-grid {

            display:grid;

            grid-template-columns:
                repeat(2, minmax(0,1fr));

            gap:18px;

        }


        .form-grid label,

        .quotation-top-grid label,

        .notes-field {

            display:flex;

            flex-direction:column;

            gap:7px;

            font-weight:600;

            color:#344054;

        }


        .form-grid input,

        .form-grid textarea,

        .quotation-top-grid input,

        .quotation-top-grid select,

        .notes-field textarea {

            width:100%;

            box-sizing:border-box;

            padding:11px 12px;

            border:1px solid #d9e2ef;

            border-radius:9px;

            font:inherit;

            outline:none;

        }


        .form-grid textarea,

        .notes-field textarea {

            resize:vertical;

        }


        .form-grid input:focus,

        .form-grid textarea:focus,

        .quotation-top-grid input:focus,

        .quotation-top-grid select:focus,

        .notes-field textarea:focus {

            border-color:#2563eb;

            box-shadow:
                0 0 0 3px
                rgba(37,99,235,.10);

        }


        .modal-actions {

            display:flex;

            justify-content:flex-end;

            gap:10px;

            margin-top:22px;

            padding-top:18px;

            border-top:1px solid #edf0f4;

        }


        .modal-actions button,

        .saved-actions button,

        .quotation-view-actions button {

            padding:10px 16px;

            border:1px solid #d9e2ef;

            background:#fff;

            border-radius:9px;

            cursor:pointer;

            font-weight:600;

        }


        .button-primary {

            background:#2563eb !important;

            border-color:#2563eb !important;

            color:#fff !important;

        }


        .button-primary:hover {

            background:#1d4ed8 !important;

        }


        button:disabled {

            opacity:.6;

            cursor:not-allowed;

        }


        /* ================================================
           QUOTATION EDITOR
        ================================================ */

        .quotation-top-card {

            border:1px solid #e4e8ef;

            border-radius:14px;

            padding:18px;

            background:#fff;

        }


        .quotation-top-grid {

            display:grid;

            grid-template-columns:
                repeat(4, minmax(0,1fr));

            gap:15px;

        }


        .quotation-products-card {

            margin-top:20px;

            border:1px solid #e4e8ef;

            border-radius:14px;

            overflow:hidden;

        }


        .quotation-section-header {

            padding:18px;

            display:flex;

            justify-content:space-between;

            align-items:center;

            gap:15px;

            background:#f8fafc;

            border-bottom:1px solid #e4e8ef;

        }


        .quotation-section-header h3 {

            margin:0;

            font-size:18px;

        }


        .quotation-section-header p {

            margin:4px 0 0;

            color:#667085;

            font-size:12px;

        }


        #quotationItems {

            padding:15px;

        }


        .quotation-item {

            border:1px solid #dfe5ec;

            border-radius:12px;

            padding:15px;

            margin-bottom:12px;

            background:#fff;

        }


        .quotation-item:last-child {

            margin-bottom:0;

        }


        .quotation-item-grid {

            display:grid;

            grid-template-columns:
                1.15fr
                1.45fr
                .65fr
                .85fr
                .8fr
                1fr
                1fr
                .75fr;

            gap:12px;

            align-items:end;

        }


        .quotation-field {

            display:flex;

            flex-direction:column;

            gap:6px;

            min-width:0;

        }


        .quotation-field label {

            font-size:12px;

            font-weight:700;

            color:#344054;

        }


        .quotation-field input,

        .quotation-field select {

            width:100%;

            box-sizing:border-box;

            height:42px;

            padding:9px;

            border:1px solid #d9e2ef;

            border-radius:8px;

            background:#fff;

            outline:none;

        }


        .quotation-field input:focus,

        .quotation-field select:focus {

            border-color:#2563eb;

        }


        .readonly-field {

            background:#f8fafc !important;

            color:#344054;

            font-weight:600;

        }


        .remove-item {

            height:42px;

            border:0;

            border-radius:8px;

            background:#ef4444;

            color:#fff;

            font-weight:600;

            cursor:pointer;

        }


        .remove-item:hover {

            background:#dc2626;

        }


        .quotation-bottom-grid {

            display:grid;

            grid-template-columns:
                1fr
                460px;

            gap:25px;

            margin-top:20px;

        }


        .quotation-summary-card {

            border:1px solid #dfe5ec;

            border-radius:14px;

            padding:20px;

            background:#fff;

        }


        .quotation-summary-card h3 {

            margin:0 0 10px;

            font-size:18px;

        }


        .summary-row {

            display:grid;

            grid-template-columns:
                1fr 180px;

            gap:15px;

            align-items:center;

            padding:11px 0;

            border-bottom:1px solid #edf0f4;

        }


        .summary-row strong {

            text-align:right;

        }


        .input-row input {

            width:100%;

            box-sizing:border-box;

            padding:9px;

            border:1px solid #d9e2ef;

            border-radius:8px;

            text-align:right;

        }


        .grand-total-row {

            display:grid;

            grid-template-columns:
                1fr 180px;

            gap:15px;

            align-items:center;

            padding-top:16px;

            margin-top:4px;

            border-top:2px solid #172033;

            font-size:20px;

            font-weight:800;

        }


        .grand-total-row strong {

            text-align:right;

            font-size:24px;

        }


        .quotation-actions {

            margin-top:20px;

        }


        /* ================================================
           SAVED
        ================================================ */

        .success-card {

            background:#fff;

            border:1px solid #dfe5ec;

            border-radius:18px;

            padding:50px;

            text-align:center;

        }


        .success-icon {

            width:65px;

            height:65px;

            border-radius:50%;

            display:grid;

            place-items:center;

            margin:0 auto 18px;

            background:#eaf8ef;

            color:#16834a;

            font-size:32px;

            font-weight:800;

        }


        .saved-total {

            font-size:34px;

            font-weight:800;

            margin:20px;

        }


        .saved-actions {

            display:flex;

            justify-content:center;

            flex-wrap:wrap;

            gap:10px;

        }


        /* ================================================
           QUOTATION VIEW
        ================================================ */

        .quotation-loading {

            min-height:350px;

            display:flex;

            flex-direction:column;

            justify-content:center;

            align-items:center;

            color:#667085;

        }


        .quotation-view-header {

            display:grid;

            grid-template-columns:
                repeat(4,1fr);

            gap:15px;

            border:1px solid #e4e8ef;

            border-radius:14px;

            padding:18px;

            background:#fff;

        }


        .quotation-view-header div {

            display:flex;

            flex-direction:column;

            gap:5px;

        }


        .quotation-view-header span {

            font-size:11px;

            color:#667085;

            text-transform:uppercase;

            font-weight:700;

            letter-spacing:.4px;

        }


        .quotation-view-header strong {

            font-size:15px;

        }


        .quotation-view-card {

            margin-top:20px;

            border:1px solid #e4e8ef;

            border-radius:14px;

            overflow:hidden;

        }


        .quotation-view-title {

            padding:18px;

            background:#f8fafc;

            border-bottom:1px solid #e4e8ef;

        }


        .quotation-view-title h3 {

            margin:0;

        }


        .quotation-view-title p {

            margin:4px 0 0;

            color:#667085;

            font-size:12px;

        }


        .quotation-view-table td,

        .quotation-view-table th {

            padding:13px;

        }


        .quotation-view-summary {

            display:grid;

            grid-template-columns:
                1fr 460px;

            gap:25px;

            margin-top:20px;

        }


        .quotation-view-actions {

            display:flex;

            justify-content:flex-end;

            flex-wrap:wrap;

            gap:10px;

            margin-top:20px;

        }


        /* ================================================
           TOAST
        ================================================ */

        .crm-toast {

            position:fixed;

            right:22px;

            bottom:22px;

            z-index:10000;

            padding:13px 18px;

            border-radius:10px;

            background:#172033;

            color:#fff;

            box-shadow:
                0 10px 30px
                rgba(0,0,0,.2);

            opacity:0;

            transform:
                translateY(10px);

            pointer-events:none;

            transition:
                .2s ease;

        }


        .crm-toast.show {

            opacity:1;

            transform:
                translateY(0);

        }


        .crm-toast[data-type="error"] {

            background:#b42318;

        }


        /* ================================================
           RESPONSIVE
        ================================================ */

        @media(
            max-width:1100px
        ) {

            .quotation-item-grid {

                grid-template-columns:
                    repeat(4,1fr);

            }

            .quotation-top-grid {

                grid-template-columns:
                    repeat(2,1fr);

            }

            .quotation-view-header {

                grid-template-columns:
                    repeat(2,1fr);

            }

            .stats {

                grid-template-columns:
                    repeat(2,1fr);

            }

        }


        @media(
            max-width:800px
        ) {

            .form-grid,

            .quotation-top-grid,

            .quotation-bottom-grid,

            .quotation-view-summary {

                grid-template-columns:
                    1fr;

            }

            .quotation-item-grid {

                grid-template-columns:
                    repeat(2,1fr);

            }

            .quotation-view-header {

                grid-template-columns:
                    1fr;

            }

            .stats {

                grid-template-columns:
                    1fr;

            }

            .toolbar {

                flex-direction:column;

                align-items:stretch;

            }

            .toolbar input {

                max-width:none;

            }

        }


        @media(
            max-width:520px
        ) {

            .quotation-item-grid {

                grid-template-columns:
                    1fr;

            }

            .summary-row,

            .grand-total-row {

                grid-template-columns:
                    1fr 130px;

            }

            .modal-backdrop {

                padding:8px;

            }

            .modal {

                width:100%;

                max-height:97vh;

                border-radius:14px;

            }

            .modal-body {

                padding:15px;

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

    try {

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

    } catch (error) {

        console.error(
            "CRM BOOT ERROR:",
            error
        );

        showError(
            error.message
        );
    }
}


/* =========================================================
   START
========================================================= */

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
