/* =========================================================
   MAHALAXMI ENTERPRISE CRM
   COMPLETE public/app.js
   VERSION 6.0

   FEATURES
   ---------------------------------------------------------
   Dashboard
   Customers
   Products
   Enquiries
   Quotations
   Orders
   Follow-ups
   Payments

   QUOTATION
   ---------------------------------------------------------
   Individual product discount
   Product-wise discount amount
   Product-wise net amount
   Total item discount
   Freight
   GST
   Grand total
   View quotation
   PDF / Print
   WhatsApp
   Edit quotation
   Fast quotation loading
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

    products: {
        title: "Products",
        subtitle: "Products, pricing and stock"
    },

    enquiries: {
        title: "Enquiries",
        subtitle: "Track customer enquiries and leads"
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


/* =========================================================
   TITLES
========================================================= */

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
   DOM HELPER
========================================================= */

function $(id) {

    return document.getElementById(id);

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function esc(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value)

        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   NUMBER
========================================================= */

function num(
    value,
    fallback = 0
) {

    const n = Number(value);

    return Number.isFinite(n)
        ? n
        : fallback;

}


/* =========================================================
   ROUND
========================================================= */

function round2(value) {

    return Math.round(
        (num(value) + Number.EPSILON) * 100
    ) / 100;

}


/* =========================================================
   MONEY
========================================================= */

function money(value) {

    return round2(value).toLocaleString(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


/* =========================================================
   DATE
========================================================= */

function date(value) {

    if (!value) {

        return "—";

    }

    const d = new Date(value);

    if (
        Number.isNaN(
            d.getTime()
        )
    ) {

        return esc(value);

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


/* =========================================================
   INPUT DATE
========================================================= */

function inputDate(value) {

    if (!value) {

        return "";

    }

    return String(value)
        .slice(0, 10);

}


/* =========================================================
   HUMANIZE
========================================================= */

function human(value) {

    return String(value || "")

        .replace(/_/g, " ")

        .replace(
            /\b\w/g,
            c => c.toUpperCase()
        );

}


/* =========================================================
   API REQUEST
========================================================= */

async function api(
    endpoint,
    options = {}
) {

    const controller =
        new AbortController();

    const timeout =
        setTimeout(
            () => controller.abort(),
            15000
        );

    try {

        const response =
            await fetch(
                API + endpoint,
                {
                    ...options,

                    signal:
                        controller.signal,

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

    } catch (error) {

        if (
            error.name ===
            "AbortError"
        ) {

            throw new Error(
                "Server response timed out. Please try again."
            );

        }

        throw error;

    } finally {

        clearTimeout(timeout);

    }

}


/* =========================================================
   API SHORTCUTS
========================================================= */

const get = endpoint =>
    api(endpoint);


const post = (
    endpoint,
    data
) =>
    api(
        endpoint,
        {
            method: "POST",
            body:
                JSON.stringify(data)
        }
    );


const put = (
    endpoint,
    data
) =>
    api(
        endpoint,
        {
            method: "PUT",
            body:
                JSON.stringify(data)
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

function toast(
    message,
    error = false
) {

    let box =
        $("crmToast");


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
   MODAL HOST
========================================================= */

function modalHost() {

    let host =
        $("crmModalHost");


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


/* =========================================================
   MODAL
========================================================= */

function modal(
    title,
    body,
    size = ""
) {

    const host =
        modalHost();


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


    const close =
        () => {

            host.innerHTML = "";

        };


    host.querySelector(
        ".modal-close"
    )?.addEventListener(
        "click",
        close
    );


    host.querySelector(
        ".modal-backdrop"
    )?.addEventListener(
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
   LOADING
========================================================= */

function loading(
    message = "Loading..."
) {

    const content =
        $("content");


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
   ERROR
========================================================= */

function showError(
    message
) {

    const content =
        $("content");


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


    $("retryCRM")?.addEventListener(
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

function updateHeader(
    page
) {

    const info =
        PAGE_INFO[page] ||
        PAGE_INFO.dashboard;


    if ($("pageTitle")) {

        $("pageTitle")
            .textContent =
            info.title;

    }


    if ($("pageSubtitle")) {

        $("pageSubtitle")
            .textContent =
            info.subtitle;

    }

}


/* =========================================================
   LIST
========================================================= */

async function list(
    table
) {

    const result =
        await get(
            `/${table}`
        );


    return result.data || [];

}


/* =========================================================
   CUSTOMER CACHE
========================================================= */

async function getCustomers() {

    if (
        Array.isArray(
            customersCache
        )
    ) {

        return customersCache;

    }


    customersCache =
        await list(
            "customers"
        );


    return customersCache;

}


/* =========================================================
   PRODUCT CACHE
========================================================= */

async function getProducts() {

    if (
        Array.isArray(
            productsCache
        )
    ) {

        return productsCache;

    }


    productsCache =
        await list(
            "products"
        );


    return productsCache;

}


/* =========================================================
   STAT CARD
========================================================= */

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
   DASHBOARD
========================================================= */

async function dashboard() {

    const requestId =
        ++pageRequest;


    loading(
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

                list("customers"),

                list("products"),

                list("enquiries"),

                list("quotations"),

                list("orders"),

                list("followups")

            ]);


        if (
            requestId !==
            pageRequest
        ) {

            return;

        }


        const quotationValue =
            quotations.reduce(

                (
                    total,
                    quotation
                ) =>

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
            error
        );

        showError(
            error.message
        );

    }

}


/* =========================================================
   GENERIC ENTITY PAGE
========================================================= */

async function entity(
    table
) {

    const requestId =
        ++pageRequest;


    loading(
        `Loading ${table}...`
    );


    try {

        const data =
            await list(
                table
            );


        if (
            requestId !==
            pageRequest
        ) {

            return;

        }


        renderEntityTable(
            table,
            data
        );

    } catch (error) {

        showError(
            error.message
        );

    }

}


/* =========================================================
   ENTITY TABLE
========================================================= */

function renderEntityTable(
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


    let columns =
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


    if (
        !columns.length &&
        data.length
    ) {

        columns =
            Object.keys(
                data[0]
            ).filter(
                key =>
                    ![
                        "created_at",
                        "updated_at"
                    ].includes(key)
            ).slice(
                0,
                8
            );

    }


    $("content").innerHTML = `

        <div class="panel">

            <div class="panel-header">

                <h2>
                    ${esc(
                        TABLE_TITLES[table] ||
                        human(table)
                    )}
                </h2>


                <button
                    type="button"
                    class="button-primary"
                    id="addEntity"
                >
                    + Add
                </button>

            </div>


            <div class="panel-body">

                <div class="table-wrapper">

                    <table>

                        <thead>

                            <tr>

                                ${columns.map(
                                    column =>
                                        `<th>${esc(
                                            human(column)
                                        )}</th>`
                                ).join("")}

                                <th>
                                    Actions
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            ${
                                data.length

                                    ?

                                    data.map(
                                        row => `

                                            <tr>

                                                ${
                                                    columns.map(
                                                        column =>

                                                            `<td>
                                                                ${formatCell(
                                                                    row[column],
                                                                    column
                                                                )}
                                                            </td>`

                                                    ).join("")
                                                }


                                                <td>

                                                    <button
                                                        type="button"
                                                        class="small-button"
                                                        data-edit-id="${row.id}"
                                                    >
                                                        Edit
                                                    </button>


                                                    <button
                                                        type="button"
                                                        class="small-button"
                                                        data-delete-id="${row.id}"
                                                    >
                                                        Delete
                                                    </button>


                                                    ${
                                                        table ===
                                                        "quotations"

                                                            ?

                                                            `

                                                            <button
                                                                type="button"
                                                                class="small-button quotation-view-button"
                                                                data-view-id="${row.id}"
                                                            >
                                                                View
                                                            </button>

                                                            `

                                                            :

                                                            ""

                                                    }

                                                </td>

                                            </tr>

                                        `
                                    ).join("")

                                    :

                                    `

                                    <tr>

                                        <td
                                            colspan="${
                                                columns.length + 1
                                            }"
                                            style="text-align:center"
                                        >
                                            No records found
                                        </td>

                                    </tr>

                                    `

                            }

                        </tbody>

                    </table>

                </div>

            </div>

        </div>

    `;


    $("addEntity")?.addEventListener(
        "click",
        () =>
            openEntityForm(
                table
            )
    );


    document
        .querySelectorAll(
            "[data-edit-id]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        const id =
                            button.dataset.editId;

                        try {

                            const result =
                                await get(
                                    `/${table}/${id}`
                                );

                            openEntityForm(
                                table,
                                result.data
                            );

                        } catch (error) {

                            toast(
                                error.message,
                                true
                            );

                        }

                    }
                );

            }
        );


    document
        .querySelectorAll(
            "[data-delete-id]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        const id =
                            button.dataset.deleteId;


                        if (
                            !confirm(
                                "Delete this record?"
                            )
                        ) {

                            return;

                        }


                        try {

                            await del(
                                `/${table}/${id}`
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
                );

            }
        );


    document
        .querySelectorAll(
            ".quotation-view-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        try {

                            const result =
                                await get(
                                    `/quotations/${button.dataset.viewId}`
                                );

                            await quotationView(
                                result.data
                            );

                        } catch (error) {

                            toast(
                                error.message,
                                true
                            );

                        }

                    }
                );

            }
        );

}


/* =========================================================
   FORMAT CELL
========================================================= */

function formatCell(
    value,
    key
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "—";

    }


    if (
        /date|_at$/.test(
            key
        )
    ) {

        return date(
            value
        );

    }


    if (
        /price|amount|total|freight|gst/.test(
            key
        )
    ) {

        return money(
            value
        );

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


    if (
        /status|priority/.test(
            key
        )
    ) {

        return `

            <span class="badge">
                ${esc(value)}
            </span>

        `;

    }


    return esc(value);

}


/* =========================================================
   GENERIC FORM
========================================================= */

function openEntityForm(
    table,
    record = null
) {

    if (
        table ===
        "quotations"
    ) {

        return quotationEditor(
            record
        );

    }


    const fields = {

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


    const listFields =
        fields[table] ||
        [];


    const m =
        modal(
            `${record ? "Edit" : "Add"} ${human(table)}`,

            `

            <form id="genericForm">

                ${listFields.map(
                    field => `

                        <label>

                            ${esc(
                                human(field)
                            )}

                            <input
                                name="${esc(field)}"
                                value="${esc(
                                    record?.[field] ?? ""
                                )}"
                                ${
                                    /date/.test(field)
                                        ? 'type="date"'
                                        : /amount|price|total|quantity|stock|percent|_id$/.test(field)
                                            ? 'type="number" step="any"'
                                            : ""
                                }
                            >

                        </label>

                    `
                ).join("")}


                <div
                    style="
                        display:flex;
                        gap:10px;
                        margin-top:20px;
                    "
                >

                    <button
                        type="submit"
                        class="button-primary"
                    >
                        Save
                    </button>


                    <button
                        type="button"
                        id="cancelGeneric"
                    >
                        Cancel
                    </button>

                </div>

            </form>

            `,
            "modal-large"
        );


    $("cancelGeneric")
        ?.addEventListener(
            "click",
            m.close
        );


    $("genericForm")
        ?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const form =
                    event.currentTarget;


                const data =
                    {};


                new FormData(
                    form
                ).forEach(
                    (
                        value,
                        key
                    ) => {

                        data[key] =
                            /amount|price|total|quantity|stock|percent|_id$/.test(
                                key
                            )
                                ? num(value)
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

            }
        );

}


/* =========================================================
   NORMALIZE QUOTATION ITEM
========================================================= */

function normalizeQuotationItem(
    item = {}
) {

    const quantity =
        num(
            item.quantity ??
            item.qty ??
            0
        );


    const rate =
        num(
            item.rate ??
            item.unit_price ??
            item.price ??
            0
        );


    const discountPercent =
        num(
            item.discount_percent ??
            0
        );


    const grossAmount =
        round2(
            quantity *
            rate
        );


    const discountAmount =
        round2(
            grossAmount *
            discountPercent /
            100
        );


    const netAmount =
        round2(
            grossAmount -
            discountAmount
        );


    return {

        ...item,

        quantity,

        rate,

        discount_percent:
            discountPercent,

        gross_amount:
            grossAmount,

        discount_amount:
            discountAmount,

        net_amount:
            netAmount,

        line_subtotal:
            grossAmount,

        line_total:
            netAmount

    };

}


/* =========================================================
   QUOTATION TOTALS
========================================================= */

function calculateQuotationTotals() {

    let subtotal = 0;

    let totalDiscount = 0;

    let netProductValue = 0;


    quotationItems =
        quotationItems.map(
            item => {

                const normalized =
                    normalizeQuotationItem(
                        item
                    );


                subtotal +=
                    normalized.gross_amount;


                totalDiscount +=
                    normalized.discount_amount;


                netProductValue +=
                    normalized.net_amount;


                return normalized;

            }
        );


    subtotal =
        round2(
            subtotal
        );


    totalDiscount =
        round2(
            totalDiscount
        );


    netProductValue =
        round2(
            netProductValue
        );


    const freight =
        round2(
            num(
                $("quotationFreight")?.value,
                0
            )
        );


    const gstPercent =
        num(
            $("quotationGstPercent")?.value,
            18
        );


    /*
       IMPORTANT

       Product discount is already
       deducted above.

       GST is calculated on:

       NET PRODUCT VALUE
       +
       FREIGHT
    */

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


    if (
        $("quotationSubtotal")
    ) {

        $("quotationSubtotal")
            .value =
            subtotal.toFixed(2);

    }


    if (
        $("quotationDiscount")
    ) {

        $("quotationDiscount")
            .value =
            totalDiscount.toFixed(2);

    }


    if (
        $("quotationTaxable")
    ) {

        $("quotationTaxable")
            .value =
            taxableAmount.toFixed(2);

    }


    if (
        $("quotationGstAmount")
    ) {

        $("quotationGstAmount")
            .value =
            gstAmount.toFixed(2);

    }


    if (
        $("quotationGrandTotal")
    ) {

        $("quotationGrandTotal")
            .value =
            grandTotal.toFixed(2);

    }


    return {

        subtotal,

        totalDiscount,

        netProductValue,

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
    item,
    index,
    products
) {

    const normalized =
        normalizeQuotationItem(
            item
        );


    const productId =
        normalized.product_id ||
        "";


    const productName =
        normalized.description ||
        normalized.product_name ||
        normalized.name ||
        "";


    return `

        <div
            class="quotation-item"
            data-item-index="${index}"
            style="
                border:1px solid #e5e7eb;
                border-radius:12px;
                padding:14px;
                margin-bottom:12px;
                background:#fff;
            "
        >

            <div
                style="
                    display:grid;
                    grid-template-columns:
                        1.5fr 1.5fr
                        .7fr .9fr
                        .8fr .9fr
                        .9fr auto;
                    gap:10px;
                    align-items:end;
                "
            >


                <label>

                    Product

                    <select
                        class="quotation-product"
                    >

                        <option value="">
                            Select Product
                        </option>

                        ${products.map(
                            product => {

                                const name =
                                    product.name ||
                                    product.product_name ||
                                    `Product #${product.id}`;


                                const rate =
                                    num(
                                        product.selling_price ??
                                        product.price ??
                                        product.rate ??
                                        0
                                    );


                                return `

                                    <option
                                        value="${esc(product.id)}"
                                        data-rate="${rate}"
                                        data-name="${esc(name)}"
                                        ${
                                            String(productId) ===
                                            String(product.id)
                                                ? "selected"
                                                : ""
                                        }
                                    >

                                        ${esc(name)}

                                    </option>

                                `;

                            }
                        ).join("")}

                    </select>

                </label>


                <label>

                    Description

                    <input
                        type="text"
                        class="quotation-description"
                        value="${esc(productName)}"
                        placeholder="Product description"
                    >

                </label>


                <label>

                    Qty

                    <input
                        type="number"
                        class="quotation-quantity"
                        min="0"
                        step="any"
                        value="${normalized.quantity || 1}"
                    >

                </label>


                <label>

                    Rate

                    <input
                        type="number"
                        class="quotation-rate"
                        min="0"
                        step="0.01"
                        value="${normalized.rate}"
                    >

                </label>


                <label>

                    Discount %

                    <input
                        type="number"
                        class="quotation-discount-percent"
                        min="0"
                        max="100"
                        step="0.01"
                        value="${normalized.discount_percent}"
                    >

                </label>


                <label>

                    Discount Amount

                    <input
                        type="text"
                        class="quotation-discount-amount"
                        readonly
                        value="${money(
                            normalized.discount_amount
                        )}"
                    >

                </label>


                <label>

                    Net Amount

                    <input
                        type="text"
                        class="quotation-line-total"
                        readonly
                        value="${money(
                            normalized.net_amount
                        )}"
                    >

                </label>


                <button
                    type="button"
                    class="remove-quotation-item"
                >
                    Remove
                </button>


            </div>

        </div>

    `;

}


/* =========================================================
   RENDER QUOTATION ITEMS
========================================================= */

function renderQuotationItems(
    products
) {

    const container =
        $("quotationItems");


    if (!container) {

        return;

    }


    container.innerHTML =
        quotationItems
            .map(
                (
                    item,
                    index
                ) =>
                    quotationItemHTML(
                        item,
                        index,
                        products
                    )
            )
            .join("");


    attachQuotationItemEvents();

    calculateQuotationTotals();

}


/* =========================================================
   ATTACH QUOTATION ITEM EVENTS
========================================================= */

function attachQuotationItemEvents() {

    const container =
        $("quotationItems");


    if (!container) {

        return;

    }


    container
        .querySelectorAll(
            ".quotation-product"
        )
        .forEach(
            select => {

                select.addEventListener(
                    "change",
                    () => {

                        const row =
                            select.closest(
                                ".quotation-item"
                            );


                        const index =
                            num(
                                row.dataset.itemIndex
                            );


                        const option =
                            select.options[
                                select.selectedIndex
                            ];


                        const productId =
                            select.value;


                        const rate =
                            num(
                                option.dataset.rate
                            );


                        const name =
                            option.dataset.name ||
                            "";


                        quotationItems[index]
                            .product_id =
                            productId
                                ? Number(
                                    productId
                                )
                                : null;


                        quotationItems[index]
                            .description =
                            name;


                        quotationItems[index]
                            .rate =
                            rate;


                        row.querySelector(
                            ".quotation-description"
                        ).value =
                            name;


                        row.querySelector(
                            ".quotation-rate"
                        ).value =
                            rate;


                        calculateQuotationTotals();

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

                        const row =
                            input.closest(
                                ".quotation-item"
                            );


                        const index =
                            num(
                                row.dataset.itemIndex
                            );


                        quotationItems[index]
                            .description =
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
                    () => {

                        const row =
                            input.closest(
                                ".quotation-item"
                            );


                        const index =
                            num(
                                row.dataset.itemIndex
                            );


                        quotationItems[index]
                            .quantity =
                            num(
                                input.value
                            );


                        calculateQuotationTotals();

                    }
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
                    () => {

                        const row =
                            input.closest(
                                ".quotation-item"
                            );


                        const index =
                            num(
                                row.dataset.itemIndex
                            );


                        quotationItems[index]
                            .rate =
                            num(
                                input.value
                            );


                        calculateQuotationTotals();

                    }
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
                    () => {

                        const row =
                            input.closest(
                                ".quotation-item"
                            );


                        const index =
                            num(
                                row.dataset.itemIndex
                            );


                        quotationItems[index]
                            .discount_percent =
                            num(
                                input.value
                            );


                        const normalized =
                            normalizeQuotationItem(
                                quotationItems[index]
                            );


                        row.querySelector(
                            ".quotation-discount-amount"
                        ).value =
                            money(
                                normalized.discount_amount
                            );


                        row.querySelector(
                            ".quotation-line-total"
                        ).value =
                            money(
                                normalized.net_amount
                            );


                        calculateQuotationTotals();

                    }
                );

            }
        );


    container
        .querySelectorAll(
            ".remove-quotation-item"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const row =
                            button.closest(
                                ".quotation-item"
                            );


                        const index =
                            num(
                                row.dataset.itemIndex
                            );


                        quotationItems.splice(
                            index,
                            1
                        );


                        const products =
                            productsCache ||
                            [];


                        renderQuotationItems(
                            products
                        );

                    }
                );

            }
        );

}


/* =========================================================
   QUOTATION FORM
========================================================= */

function quotationFormHTML(
    record,
    customers
) {

    const today =
        new Date()
            .toISOString()
            .slice(
                0,
                10
            );


    return `

        <form
            id="quotationForm"
        >


            <div
                style="
                    display:grid;
                    grid-template-columns:
                        repeat(4,1fr);
                    gap:14px;
                "
            >


                <label>

                    Quotation Number

                    <input
                        id="quotationNumber"
                        value="${esc(
                            record?.quotation_number || ""
                        )}"
                        readonly
                    >

                </label>


                <label>

                    Customer

                    <select
                        id="quotationCustomer"
                        required
                    >

                        <option value="">
                            Select Customer
                        </option>

                        ${customers.map(
                            customer => {

                                const name =
                                    customer.company_name ||
                                    customer.contact_person ||
                                    `Customer #${customer.id}`;


                                return `

                                    <option
                                        value="${customer.id}"
                                        ${
                                            String(
                                                record?.customer_id
                                            ) ===
                                            String(
                                                customer.id
                                            )
                                                ? "selected"
                                                : ""
                                        }
                                    >

                                        ${esc(name)}

                                    </option>

                                `;

                            }
                        ).join("")}

                    </select>

                </label>


                <label>

                    Quotation Date

                    <input
                        id="quotationDate"
                        type="date"
                        value="${inputDate(
                            record?.quotation_date
                        ) || today}"
                        required
                    >

                </label>


                <label>

                    Valid Until

                    <input
                        id="quotationValidUntil"
                        type="date"
                        value="${inputDate(
                            record?.valid_until
                        )}"
                    >

                </label>


            </div>


            <div
                style="
                    margin-top:20px;
                "
            >

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        margin-bottom:12px;
                    "
                >

                    <h3>
                        Products
                    </h3>


                    <button
                        type="button"
                        id="addQuotationItem"
                        class="button-primary"
                    >
                        + Add Product
                    </button>

                </div>


                <div
                    id="quotationItems"
                ></div>

            </div>


            <div
                style="
                    display:grid;
                    grid-template-columns:
                        1fr 360px;
                    gap:30px;
                    margin-top:25px;
                "
            >


                <div>

                    <label>

                        Notes

                        <textarea
                            id="quotationNotes"
                            rows="6"
                        >${esc(
                            record?.notes || ""
                        )}</textarea>

                    </label>

                </div>


                <div
                    style="
                        border:1px solid #e5e7eb;
                        border-radius:12px;
                        padding:18px;
                    "
                >


                    <label>

                        Freight

                        <input
                            id="quotationFreight"
                            type="number"
                            min="0"
                            step="0.01"
                            value="${num(
                                record?.freight
                            )}"
                        >

                    </label>


                    <label>

                        GST %

                        <input
                            id="quotationGstPercent"
                            type="number"
                            min="0"
                            step="0.01"
                            value="${num(
                                record?.gst_percent,
                                18
                            )}"
                        >

                    </label>


                    <label>

                        Subtotal

                        <input
                            id="quotationSubtotal"
                            readonly
                        >

                    </label>


                    <label>

                        Total Item Discount

                        <input
                            id="quotationDiscount"
                            readonly
                        >

                    </label>


                    <label>

                        Taxable Amount

                        <input
                            id="quotationTaxable"
                            readonly
                        >

                    </label>


                    <label>

                        GST Amount

                        <input
                            id="quotationGstAmount"
                            readonly
                        >

                    </label>


                    <label>

                        <strong>
                            Grand Total
                        </strong>

                        <input
                            id="quotationGrandTotal"
                            readonly
                            style="
                                font-size:20px;
                                font-weight:700;
                            "
                        >

                    </label>


                </div>

            </div>


            <div
                style="
                    display:flex;
                    justify-content:flex-end;
                    gap:10px;
                    margin-top:25px;
                "
            >

                <button
                    type="button"
                    id="quotationCancel"
                >
                    Cancel
                </button>


                <button
                    type="submit"
                    class="button-primary"
                    id="quotationSave"
                >
                    ${
                        record
                            ? "Save Changes"
                            : "Save Quotation"
                    }
                </button>

            </div>


        </form>

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
           Customers and products are cached.

           This avoids repeatedly loading
           them every time a quotation is opened.
        */

        const [
            customers,
            products
        ] =
            await Promise.all([

                getCustomers(),

                getProducts()

            ]);


        quotationItems = [];


        /*
           Existing quotation:
           load quotation items with ONE request.
        */

        if (
            record &&
            record.id
        ) {

            try {

                const details =
                    await get(
                        `/quotations/${record.id}/details`
                    );


                quotationItems =
                    (
                        details.items ||
                        []
                    ).map(
                        normalizeQuotationItem
                    );

            } catch (error) {

                console.warn(
                    "Could not load quotation items",
                    error
                );

                quotationItems = [];

            }

        }


        /*
           New quotation:
           start with one blank product.
        */

        if (
            !quotationItems.length
        ) {

            quotationItems = [

                {

                    product_id: "",

                    description: "",

                    quantity: 1,

                    rate: 0,

                    discount_percent: 0,

                    discount_amount: 0,

                    line_subtotal: 0,

                    line_total: 0

                }

            ];

        }


        const m =
            modal(

                `${
                    record
                        ? "Edit"
                        : "New"
                } Quotation`,

                quotationFormHTML(
                    record,
                    customers
                ),

                "modal-xlarge"

            );


        renderQuotationItems(
            products
        );


        /*
           Generate quotation number
           only for a new quotation.
        */

        if (
            !record
        ) {

            try {

                const result =
                    await get(
                        "/quotations/next-number"
                    );


                if (
                    $("quotationNumber")
                ) {

                    $("quotationNumber")
                        .value =
                        result.quotation_number ||
                        "";

                }

            } catch (error) {

                console.warn(
                    "Quotation number generation failed",
                    error
                );

            }

        }


        /*
           Add product.
        */

        $("addQuotationItem")
            ?.addEventListener(
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
                        products
                    );

                }
            );


        /*
           Freight.
        */

        $("quotationFreight")
            ?.addEventListener(
                "input",
                calculateQuotationTotals
            );


        /*
           GST.
        */

        $("quotationGstPercent")
            ?.addEventListener(
                "input",
                calculateQuotationTotals
            );


        /*
           Cancel.
        */

        $("quotationCancel")
            ?.addEventListener(
                "click",
                m.close
            );


        /*
           Submit quotation.
        */

        $("quotationForm")
            ?.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();


                    const saveButton =
                        $("quotationSave");


                    if (
                        saveButton
                    ) {

                        saveButton.disabled =
                            true;

                        saveButton.textContent =
                            "Saving...";

                    }


                    try {

                        if (
                            !quotationItems.length
                        ) {

                            throw new Error(
                                "Please add at least one product."
                            );

                        }


                        const totals =
                            calculateQuotationTotals();


                        /*
                           Normalize items one final time.
                        */

                        const finalItems =
                            quotationItems
                                .map(
                                    normalizeQuotationItem
                                );


                        /*
                           Quotation header.
                        */

                        const quotationPayload = {

                            quotation_number:
                                $("quotationNumber")
                                    .value
                                    .trim(),

                            customer_id:
                                $("quotationCustomer")
                                    .value
                                    ? Number(
                                        $("quotationCustomer")
                                            .value
                                    )
                                    : null,

                            quotation_date:
                                $("quotationDate")
                                    .value,

                            valid_until:
                                $("quotationValidUntil")
                                    .value ||
                                null,

                            status:
                                record?.status ||
                                "Draft",

                            /*
                               IMPORTANT:
                               discount_amount is
                               TOTAL of all
                               individual product discounts.
                            */

                            discount_percent:
                                0,

                            discount_amount:
                                totals.totalDiscount,

                            freight:
                                totals.freight,

                            subtotal:
                                totals.subtotal,

                            taxable_amount:
                                totals.taxableAmount,

                            gst_percent:
                                totals.gstPercent,

                            gst_amount:
                                totals.gstAmount,

                            grand_total:
                                totals.grandTotal,

                            notes:
                                $("quotationNotes")
                                    .value

                        };


                        let quotationId;


                        /*
                           CREATE
                        */

                        if (!record) {

                            const result =
                                await post(
                                    "/quotations",
                                    quotationPayload
                                );


                            quotationId =
                                result.id;

                        }

                        /*
                           UPDATE
                        */

                        else {

                            quotationId =
                                record.id;


                            await put(
                                `/quotations/${quotationId}`,
                                quotationPayload
                            );

                        }


                        /*
                           Save quotation items.

                           Existing items are updated.
                           New items are created.
                        */

                        const existingItems =
                            finalItems.filter(
                                item =>
                                    item.id
                            );


                        const newItems =
                            finalItems.filter(
                                item =>
                                    !item.id
                            );


                        /*
                           Update existing items.
                        */

                        for (
                            const item
                            of existingItems
                        ) {

                            await put(
                                `/quotation_items/${item.id}`,
                                {

                                    quotation_id:
                                        quotationId,

                                    product_id:
                                        item.product_id ||
                                        null,

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

                                    line_subtotal:
                                        item.gross_amount,

                                    line_total:
                                        item.net_amount

                                }
                            );

                        }


                        /*
                           Create new items.
                        */

                        for (
                            const item
                            of newItems
                        ) {

                            await post(
                                `/quotations/${quotationId}/items`,
                                {

                                    product_id:
                                        item.product_id ||
                                        null,

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

                                    line_subtotal:
                                        item.gross_amount,

                                    line_total:
                                        item.net_amount

                                }
                            );

                        }


                        /*
                           Save header one more time.

                           This ensures the totals
                           remain synchronized.
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
                            "Quotation save error:",
                            error
                        );


                        toast(
                            error.message,
                            true
                        );


                        if (
                            saveButton
                        ) {

                            saveButton.disabled =
                                false;

                            saveButton.textContent =
                                record
                                    ? "Save Changes"
                                    : "Save Quotation";

                        }

                    }

                }
            );


        calculateQuotationTotals();


    } catch (error) {

        console.error(
            "Quotation editor error:",
            error
        );


        showError(
            error.message
        );

    }

}


/* =========================================================
   QUOTATION VIEW ITEM ROW
========================================================= */

function quotationViewItemRow(
    item,
    index
) {

    const normalized =
        normalizeQuotationItem(
            item
        );


    const product =
        normalized.description ||
        normalized.product_name ||
        normalized.name ||
        (
            normalized.product_id
                ? `Product #${normalized.product_id}`
                : "Product"
        );


    return `

        <tr>

            <td>
                ${index + 1}
            </td>

            <td>

                <strong>
                    ${esc(product)}
                </strong>

            </td>

            <td>
                ${normalized.quantity}
            </td>

            <td>
                ${money(
                    normalized.rate
                )}
            </td>

            <td>
                ${normalized.discount_percent}%
            </td>

            <td>
                ${money(
                    normalized.discount_amount
                )}
            </td>

            <td>
                <strong>
                    ${money(
                        normalized.net_amount
                    )}
                </strong>
            </td>

        </tr>

    `;

}


/* =========================================================
   VIEW QUOTATION
========================================================= */

async function quotationView(
    record
) {

    /*
       Immediate loading modal.
       This prevents the old blank/loading
       behaviour.
    */

    const loadingModal =
        modal(

            `Quotation ${
                record?.quotation_number ||
                ""
            }`,

            `

                <div
                    style="
                        padding:45px;
                        text-align:center;
                    "
                >

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
           ONLY ONE quotation details request.

           Server returns:
           quotation
           items
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
           Normalize items.

           This is important because older
           quotation_items may not have
           saved net amount fields.
        */

        const items =
            rawItems.map(
                normalizeQuotationItem
            );


        /*
           Calculate totals from products.
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
            round2(
                subtotal
            );


        totalDiscount =
            round2(
                totalDiscount
            );


        netProductValue =
            round2(
                netProductValue
            );


        const freight =
            round2(
                num(
                    quotation.freight
                )
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


        /*
           Find customer from cache.

           No extra API request required.
        */

        let customerName =
            quotation.customer_id
                ? `Customer #${quotation.customer_id}`
                : "—";


        try {

            const customers =
                await getCustomers();


            const customer =
                customers.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            quotation.customer_id
                        )
                );


            if (customer) {

                customerName =
                    customer.company_name ||
                    customer.contact_person ||
                    customer.mobile ||
                    customerName;

            }

        } catch {

            /*
               Customer failure must not
               break quotation view.
            */

        }


        loadingModal.close();


        const m =
            modal(

                `Quotation ${
                    quotation.quotation_number ||
                    `#${quotation.id}`
                }`,

                `

                <div class="quotation-view">


                    <div
                        style="
                            display:flex;
                            justify-content:space-between;
                            gap:20px;
                            align-items:center;
                            margin-bottom:20px;
                        "
                    >

                        <div>

                            <div
                                style="
                                    font-size:12px;
                                    opacity:.65;
                                "
                            >
                                QUOTATION
                            </div>

                            <h2
                                style="
                                    margin:4px 0;
                                "
                            >
                                ${esc(
                                    quotation.quotation_number ||
                                    `#${quotation.id}`
                                )}
                            </h2>

                        </div>


                        <div
                            style="
                                display:flex;
                                gap:8px;
                                flex-wrap:wrap;
                            "
                        >

                            <button
                                type="button"
                                id="quotationPdfButton"
                                class="button-primary"
                            >
                                PDF / Print
                            </button>


                            <button
                                type="button"
                                id="quotationWhatsAppButton"
                            >
                                WhatsApp
                            </button>


                            <button
                                type="button"
                                id="quotationEditButton"
                            >
                                Edit
                            </button>

                        </div>

                    </div>


                    <div
                        style="
                            display:grid;
                            grid-template-columns:
                                repeat(4,1fr);
                            gap:12px;
                            margin-bottom:20px;
                        "
                    >

                        <div class="panel">

                            <div class="panel-body">

                                <small>
                                    Customer
                                </small>

                                <strong
                                    style="
                                        display:block;
                                        margin-top:5px;
                                    "
                                >
                                    ${esc(
                                        customerName
                                    )}
                                </strong>

                            </div>

                        </div>


                        <div class="panel">

                            <div class="panel-body">

                                <small>
                                    Quotation Date
                                </small>

                                <strong
                                    style="
                                        display:block;
                                        margin-top:5px;
                                    "
                                >
                                    ${date(
                                        quotation.quotation_date
                                    )}
                                </strong>

                            </div>

                        </div>


                        <div class="panel">

                            <div class="panel-body">

                                <small>
                                    Valid Until
                                </small>

                                <strong
                                    style="
                                        display:block;
                                        margin-top:5px;
                                    "
                                >
                                    ${date(
                                        quotation.valid_until
                                    )}
                                </strong>

                            </div>

                        </div>


                        <div class="panel">

                            <div class="panel-body">

                                <small>
                                    Status
                                </small>

                                <strong
                                    style="
                                        display:block;
                                        margin-top:5px;
                                    "
                                >
                                    ${esc(
                                        quotation.status ||
                                        "Draft"
                                    )}
                                </strong>

                            </div>

                        </div>

                    </div>


                    <div
                        class="table-wrapper"
                        style="
                            margin-bottom:20px;
                        "
                    >

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
                                    items.length

                                        ?

                                        items.map(
                                            quotationViewItemRow
                                        ).join("")

                                        :

                                        `

                                        <tr>

                                            <td
                                                colspan="7"
                                                style="
                                                    text-align:center;
                                                    padding:30px;
                                                "
                                            >
                                                No products found
                                            </td>

                                        </tr>

                                        `
                                }

                            </tbody>

                        </table>

                    </div>


                    <div
                        style="
                            display:flex;
                            justify-content:flex-end;
                        "
                    >

                        <div
                            style="
                                width:380px;
                                border:1px solid #e5e7eb;
                                border-radius:12px;
                                padding:18px;
                            "
                        >

                            <div
                                style="
                                    display:flex;
                                    justify-content:space-between;
                                    padding:7px 0;
                                "
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
                                style="
                                    display:flex;
                                    justify-content:space-between;
                                    padding:7px 0;
                                "
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
                                style="
                                    display:flex;
                                    justify-content:space-between;
                                    padding:7px 0;
                                "
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
                                style="
                                    display:flex;
                                    justify-content:space-between;
                                    padding:7px 0;
                                "
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
                                style="
                                    display:flex;
                                    justify-content:space-between;
                                    padding:7px 0;
                                "
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
                                style="
                                    display:flex;
                                    justify-content:space-between;
                                    padding:7px 0;
                                "
                            >

                                <span>
                                    GST ${gstPercent}%
                                </span>

                                <strong>
                                    ${money(
                                        gstAmount
                                    )}
                                </strong>

                            </div>


                            <div
                                style="
                                    display:flex;
                                    justify-content:space-between;
                                    padding:12px 0 0;
                                    margin-top:8px;
                                    border-top:2px solid #111827;
                                    font-size:20px;
                                "
                            >

                                <strong>
                                    Grand Total
                                </strong>

                                <strong>
                                    ${money(
                                        grandTotal
                                    )}
                                </strong>

                            </div>

                        </div>

                    </div>


                    ${
                        quotation.notes
                            ?

                            `

                            <div
                                style="
                                    margin-top:20px;
                                    padding:15px;
                                    background:#f8fafc;
                                    border-radius:10px;
                                "
                            >

                                <strong>
                                    Notes
                                </strong>

                                <div
                                    style="
                                        margin-top:6px;
                                    "
                                >
                                    ${esc(
                                        quotation.notes
                                    )}
                                </div>

                            </div>

                            `

                            :

                            ""
                    }


                </div>

                `,

                "modal-xlarge"

            );


        /*
           PDF
        */

        $("quotationPdfButton")
            ?.addEventListener(
                "click",
                () => {

                    printQuotation(
                        quotation,
                        items,
                        customerName
                    );

                }
            );


        /*
           WhatsApp
        */

        $("quotationWhatsAppButton")
            ?.addEventListener(
                "click",
                () => {

                    shareWhatsApp(
                        quotation,
                        items,
                        customerName
                    );

                }
            );


        /*
           Edit
        */

        $("quotationEditButton")
            ?.addEventListener(
                "click",
                () => {

                    m.close();

                    quotationEditor(
                        quotation
                    );

                }
            );


    } catch (error) {

        loadingModal.close();


        console.error(
            "Quotation view error:",
            error
        );


        toast(
            error.message,
            true
        );

    }

}


/* =========================================================
   PRINT / PDF
========================================================= */

function printQuotation(
    quotation,
    rawItems,
    customerName
) {

    const items =
        rawItems.map(
            normalizeQuotationItem
        );


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
        round2(
            subtotal
        );


    totalDiscount =
        round2(
            totalDiscount
        );


    netProductValue =
        round2(
            netProductValue
        );


    const freight =
        round2(
            num(
                quotation.freight
            )
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
        items.map(
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
                            item.product_name ||
                            item.name ||
                            `Product #${item.product_id || ""}`
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
                        ${money(
                            item.net_amount
                        )}
                    </td>

                </tr>

            `
        ).join("");


    const printWindow =
        window.open(
            "",
            "_blank",
            "width=1000,height=800"
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
                Quotation ${
                    esc(
                        quotation.quotation_number
                    )
                }
            </title>


            <style>

                * {
                    box-sizing:border-box;
                }


                body {

                    font-family:
                        Arial,
                        Helvetica,
                        sans-serif;

                    margin:0;

                    padding:35px;

                    color:#111827;

                }


                .company {

                    font-size:26px;

                    font-weight:800;

                    margin-bottom:5px;

                }


                .company-sub {

                    color:#64748b;

                    margin-bottom:30px;

                }


                h1 {

                    text-align:center;

                    font-size:28px;

                    margin:20px 0 30px;

                }


                .details {

                    display:grid;

                    grid-template-columns:
                        repeat(4,1fr);

                    gap:15px;

                    margin-bottom:30px;

                }


                .details div {

                    border:1px solid #ddd;

                    padding:12px;

                    border-radius:6px;

                }


                table {

                    width:100%;

                    border-collapse:collapse;

                    margin-top:20px;

                }


                th,
                td {

                    border:1px solid #d1d5db;

                    padding:9px;

                    font-size:13px;

                    text-align:left;

                }


                th {

                    background:#f1f5f9;

                }


                .summary {

                    width:380px;

                    margin-left:auto;

                    margin-top:25px;

                }


                .line {

                    display:flex;

                    justify-content:space-between;

                    padding:8px 0;

                }


                .grand {

                    border-top:2px solid #111;

                    margin-top:8px;

                    padding-top:12px;

                    font-size:18px;

                }


                .notes {

                    margin-top:30px;

                    border:1px solid #ddd;

                    padding:15px;

                }


                @media print {

                    body {

                        padding:15px;

                    }


                    .no-print {

                        display:none;

                    }

                }

            </style>

        </head>


        <body>


            <div class="company">
                MAHALAXMI COMBUSTION
            </div>


            <div class="company-sub">
                Professional Quotation
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


            <div class="summary">

                <div class="line">

                    <span>
                        Subtotal
                    </span>

                    <strong>
                        ${money(
                            subtotal
                        )}
                    </strong>

                </div>


                <div class="line">

                    <span>
                        Total Item Discount
                    </span>

                    <strong>
                        ${money(
                            totalDiscount
                        )}
                    </strong>

                </div>


                <div class="line">

                    <span>
                        Net Product Value
                    </span>

                    <strong>
                        ${money(
                            netProductValue
                        )}
                    </strong>

                </div>


                <div class="line">

                    <span>
                        Freight
                    </span>

                    <strong>
                        ${money(
                            freight
                        )}
                    </strong>

                </div>


                <div class="line">

                    <span>
                        Taxable Amount
                    </span>

                    <strong>
                        ${money(
                            taxableAmount
                        )}
                    </strong>

                </div>


                <div class="line">

                    <span>
                        GST ${gstPercent}%
                    </span>

                    <strong>
                        ${money(
                            gstAmount
                        )}
                    </strong>

                </div>


                <div class="line grand">

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

                    ?

                    `

                    <div class="notes">

                        <strong>
                            Notes
                        </strong>

                        <br><br>

                        ${esc(
                            quotation.notes
                        )}

                    </div>

                    `

                    :

                    ""
            }


            <script>

                window.onload =
                    function() {

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

function shareWhatsApp(
    quotation,
    rawItems,
    customerName
) {

    const items =
        rawItems.map(
            normalizeQuotationItem
        );


    let text =
        `*MAHALAXMI COMBUSTION*%0A`;

    text +=
        `*QUOTATION*%0A%0A`;


    text +=
        `Quotation No: ${
            quotation.quotation_number || ""
        }%0A`;


    text +=
        `Customer: ${
            encodeURIComponent(
                customerName
            )
        }%0A`;


    text +=
        `Date: ${
            encodeURIComponent(
                date(
                    quotation.quotation_date
                )
            )
        }%0A%0A`;


    text +=
        `*Products:*%0A`;


    items.forEach(
        (
            item,
            index
        ) => {

            const product =
                item.description ||
                item.product_name ||
                item.name ||
                `Product #${item.product_id || ""}`;


            text +=
                `${index + 1}. ${
                    encodeURIComponent(
                        product
                    )
                }`;


            text +=
                ` | Qty: ${item.quantity}`;


            text +=
                ` | Rate: ${item.rate}`;


            if (
                item.discount_percent > 0
            ) {

                text +=
                    ` | Disc: ${item.discount_percent}%`;

            }


            text +=
                ` | Net: ${item.net_amount}`;


            text +=
                `%0A`;

        }
    );


    const subtotal =
        items.reduce(
            (
                total,
                item
            ) =>
                total +
                item.gross_amount,
            0
        );


    const discount =
        items.reduce(
            (
                total,
                item
            ) =>
                total +
                item.discount_amount,
            0
        );


    const net =
        subtotal -
        discount;


    const freight =
        num(
            quotation.freight
        );


    const gstPercent =
        num(
            quotation.gst_percent,
            18
        );


    const taxable =
        net +
        freight;


    const gst =
        taxable *
        gstPercent /
        100;


    const grandTotal =
        taxable +
        gst;


    text +=
        `%0A*Subtotal:* ${round2(subtotal)}`;


    text +=
        `%0A*Total Discount:* ${round2(discount)}`;


    text +=
        `%0ANet Product Value: ${round2(net)}`;


    text +=
        `%0AFreight: ${round2(freight)}`;


    text +=
        `%0AGST ${gstPercent}%: ${round2(gst)}`;


    text +=
        `%0A*Grand Total: ${round2(grandTotal)}*`;


    window.open(
        `https://wa.me/?text=${text}`,
        "_blank"
    );

}


/* =========================================================
   SAVED QUOTATION
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
            `Customer #${
                quotation.customer_id
            }`;


        try {

            const customers =
                await getCustomers();


            const customer =
                customers.find(
                    item =>
                        String(
                            item.id
                        ) ===
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


        $("newQuotation")
            ?.addEventListener(
                "click",
                () =>
                    quotationEditor()
            );


        $("viewSavedQuotation")
            ?.addEventListener(
                "click",
                () =>
                    quotationView(
                        quotation
                    )
            );


        $("pdfSavedQuotation")
            ?.addEventListener(
                "click",
                () =>
                    printQuotation(
                        quotation,
                        items,
                        customerName
                    )
            );


        $("whatsappSavedQuotation")
            ?.addEventListener(
                "click",
                () =>
                    shareWhatsApp(
                        quotation,
                        items,
                        customerName
                    )
            );


        $("backQuotations")
            ?.addEventListener(
                "click",
                () =>
                    showPage(
                        "quotations"
                    )
            );


    } catch (error) {

        showError(
            error.message
        );

    }

}


/* =========================================================
   SHOW PAGE
========================================================= */

async function showPage(
    page
) {

    currentPage =
        page ||
        "dashboard";


    updateHeader(
        currentPage
    );


    switch (
        currentPage
    ) {

        case "dashboard":

            await dashboard();

            break;


        case "customers":

        case "products":

        case "enquiries":

        case "quotations":

        case "orders":

        case "followups":

        case "payments":

            if (
                currentPage ===
                "quotations"
            ) {

                await entity(
                    "quotations"
                );

            } else {

                await entity(
                    currentPage
                );

            }

            break;


        default:

            await dashboard();

            break;

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();


                        const page =
                            button.dataset.page;


                        if (
                            page
                        ) {

                            showPage(
                                page
                            );

                        }

                    }
                );

            }
        );

}


/* =========================================================
   NEW QUOTATION GLOBAL BUTTON
========================================================= */

function setupGlobalQuotationButton() {

    document
        .querySelectorAll(
            "[data-action='new-quotation']"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () =>
                        quotationEditor()
                );

            }
        );

}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupNavigation();

        setupGlobalQuotationButton();

        showPage(
            "dashboard"
        );

    }
);
