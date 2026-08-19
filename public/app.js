const API = "/api";

let currentPage = "dashboard";
let customersCache = [];

/* =========================================================
   API HELPERS
========================================================= */

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API}${endpoint}`, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options
    });

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error(`Invalid server response (${response.status})`);
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

async function apiGet(endpoint) {
    return apiRequest(endpoint);
}

async function apiPost(endpoint, data) {
    return apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(data)
    });
}

async function apiPut(endpoint, data) {
    return apiRequest(endpoint, {
        method: "PUT",
        body: JSON.stringify(data)
    });
}

async function apiDelete(endpoint) {
    return apiRequest(endpoint, {
        method: "DELETE"
    });
}


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


/* =========================================================
   DASHBOARD
========================================================= */

async function renderDashboard() {
    const content = document.getElementById("content");

    content.innerHTML = `
        <div class="loading">
            Loading dashboard...
        </div>
    `;

    try {
        const [
            customers,
            products,
            enquiries,
            quotations,
            orders,
            followups
        ] = await Promise.all([
            apiGet("/customers"),
            apiGet("/products"),
            apiGet("/enquiries"),
            apiGet("/quotations"),
            apiGet("/orders"),
            apiGet("/followups")
        ]);

        const customerCount = customers.count || 0;
        const productCount = products.count || 0;
        const enquiryCount = enquiries.count || 0;
        const quotationCount = quotations.count || 0;
        const orderCount = orders.count || 0;
        const followupCount = followups.count || 0;

        const enquiryData = enquiries.data || [];
        const quotationData = quotations.data || [];

        const quotationValue = quotationData.reduce(
            (sum, quote) => sum + Number(quote.grand_total || 0),
            0
        );

        content.innerHTML = `
            <div class="stats">

                <div class="stat-card">
                    <div class="stat-label">Customers</div>
                    <div class="stat-value">${customerCount}</div>
                    <div class="stat-footer">Total customers</div>
                </div>

                <div class="stat-card">
                    <div class="stat-label">Products</div>
                    <div class="stat-value">${productCount}</div>
                    <div class="stat-footer">Product catalogue</div>
                </div>

                <div class="stat-card">
                    <div class="stat-label">Enquiries</div>
                    <div class="stat-value">${enquiryCount}</div>
                    <div class="stat-footer">Customer enquiries</div>
                </div>

                <div class="stat-card">
                    <div class="stat-label">Quotations</div>
                    <div class="stat-value">${quotationCount}</div>
                    <div class="stat-footer">Total quotations</div>
                </div>

            </div>

            <div class="grid-2">

                <div class="panel">

                    <div class="panel-header">
                        <h2>Recent Enquiries</h2>

                        <button onclick="showPage('enquiries')">
                            View all
                        </button>
                    </div>

                    <div class="panel-body">

                        ${
                            enquiryData.length === 0
                                ? `
                                    <div class="empty">
                                        <div class="empty-icon">📩</div>
                                        No enquiries yet
                                    </div>
                                `
                                : `
                                    <div class="table-wrapper">

                                        <table>

                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Subject</th>
                                                    <th>Source</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>

                                            <tbody>

                                                ${enquiryData
                                                    .slice(0, 5)
                                                    .map(enquiry => `
                                                        <tr>

                                                            <td>
                                                                #${enquiry.id}
                                                            </td>

                                                            <td>
                                                                ${escapeHtml(
                                                                    enquiry.subject || "-"
                                                                )}
                                                            </td>

                                                            <td>
                                                                ${escapeHtml(
                                                                    enquiry.source || "-"
                                                                )}
                                                            </td>

                                                            <td>
                                                                <span class="badge badge-new">
                                                                    ${escapeHtml(
                                                                        enquiry.status || "New"
                                                                    )}
                                                                </span>
                                                            </td>

                                                        </tr>
                                                    `)
                                                    .join("")}

                                            </tbody>

                                        </table>

                                    </div>
                                `
                        }

                    </div>

                </div>


                <div class="panel">

                    <div class="panel-header">
                        <h2>Recent Quotations</h2>

                        <button onclick="showPage('quotations')">
                            View all
                        </button>
                    </div>

                    <div class="panel-body">

                        ${
                            quotationData.length === 0
                                ? `
                                    <div class="empty">
                                        <div class="empty-icon">💰</div>
                                        No quotations yet
                                    </div>
                                `
                                : `
                                    <div class="table-wrapper">

                                        <table>

                                            <thead>
                                                <tr>
                                                    <th>Quote</th>
                                                    <th>Status</th>
                                                    <th>Total</th>
                                                </tr>
                                            </thead>

                                            <tbody>

                                                ${quotationData
                                                    .slice(0, 5)
                                                    .map(quote => `
                                                        <tr>

                                                            <td>
                                                                ${escapeHtml(
                                                                    quote.quotation_number || "-"
                                                                )}
                                                            </td>

                                                            <td>
                                                                <span class="badge badge-draft">
                                                                    ${escapeHtml(
                                                                        quote.status || "Draft"
                                                                    )}
                                                                </span>
                                                            </td>

                                                            <td>
                                                                ${formatCurrency(
                                                                    quote.grand_total
                                                                )}
                                                            </td>

                                                        </tr>
                                                    `)
                                                    .join("")}

                                            </tbody>

                                        </table>

                                    </div>
                                `
                        }

                    </div>

                </div>

            </div>


            <div class="panel" style="margin-top:20px;">

                <div class="panel-header">
                    <h2>Quick Overview</h2>
                </div>

                <div class="panel-body">

                    <div class="stats">

                        <div class="stat-card">
                            <div class="stat-label">Orders</div>
                            <div class="stat-value">${orderCount}</div>
                        </div>

                        <div class="stat-card">
                            <div class="stat-label">Follow-ups</div>
                            <div class="stat-value">${followupCount}</div>
                        </div>

                        <div class="stat-card">
                            <div class="stat-label">Quotation Value</div>
                            <div class="stat-value">
                                ${formatCurrency(quotationValue)}
                            </div>
                        </div>

                    </div>

                </div>

            </div>
        `;

    } catch (error) {
        console.error(error);

        content.innerHTML = `
            <div class="panel">
                <div class="panel-body">
                    <div class="empty">
                        <div class="empty-icon">⚠️</div>
                        <h3>Unable to load dashboard</h3>
                        <p>${escapeHtml(error.message)}</p>
                    </div>
                </div>
            </div>
        `;
    }
}


/* =========================================================
   CUSTOMERS
========================================================= */

async function renderCustomers() {
    const content = document.getElementById("content");

    content.innerHTML = `
        <div class="loading">
            Loading customers...
        </div>
    `;

    try {
        const result = await apiGet("/customers");

        customersCache = result.customers || [];

        renderCustomersTable();

    } catch (error) {
        console.error(error);

        content.innerHTML = `
            <div class="panel">
                <div class="panel-body">

                    <div class="empty">

                        <div class="empty-icon">⚠️</div>

                        <h3>
                            Unable to load customers
                        </h3>

                        <p>
                            ${escapeHtml(error.message)}
                        </p>

                    </div>

                </div>
            </div>
        `;
    }
}


function renderCustomersTable(searchText = "") {
    const content = document.getElementById("content");

    const search = searchText.trim().toLowerCase();

    const filtered = customersCache.filter(customer => {

        const searchable = [
            customer.company_name,
            customer.contact_person,
            customer.mobile,
            customer.whatsapp,
            customer.email,
            customer.city,
            customer.state,
            customer.gst_number,
            customer.customer_type
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return searchable.includes(search);
    });


    content.innerHTML = `
        <div class="page-toolbar">

            <input
                id="customerSearch"
                class="search-box"
                placeholder="Search company, mobile, GST..."
                value="${escapeHtml(searchText)}"
                oninput="filterCustomers()"
            >

            <button
                class="primary-button"
                onclick="openCustomerModal()"
            >
                + Add Customer
            </button>

        </div>


        <div class="panel">

            <div class="panel-header">

                <h2>
                    Customers
                    <span style="color:#6b7280;font-size:12px;">
                        (${filtered.length})
                    </span>
                </h2>

            </div>


            <div class="table-wrapper">

                <table>

                    <thead>

                        <tr>

                            <th>Company</th>
                            <th>Contact</th>
                            <th>Mobile</th>
                            <th>City</th>
                            <th>GST</th>
                            <th>Type</th>
                            <th>Action</th>

                        </tr>

                    </thead>


                    <tbody>

                        ${
                            filtered.length === 0

                                ? `
                                    <tr>

                                        <td colspan="7">

                                            <div class="empty">

                                                <div class="empty-icon">
                                                    👥
                                                </div>

                                                ${
                                                    customersCache.length === 0
                                                        ? "No customers yet"
                                                        : "No customers match your search"
                                                }

                                            </div>

                                        </td>

                                    </tr>
                                `

                                : filtered
                                    .map(customer => `
                                        <tr>

                                            <td>

                                                <strong>
                                                    ${escapeHtml(
                                                        customer.company_name || "-"
                                                    )}
                                                </strong>

                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    customer.contact_person || "-"
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    customer.mobile || "-"
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    customer.city || "-"
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    customer.gst_number || "-"
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    customer.customer_type || "-"
                                                )}
                                            </td>

                                            <td>

                                                <div style="
                                                    display:flex;
                                                    gap:6px;
                                                ">

                                                    <button
                                                        class="small-action"
                                                        onclick="openCustomerModal(${customer.id})"
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        class="small-action danger"
                                                        onclick="deleteCustomer(${customer.id})"
                                                    >
                                                        Delete
                                                    </button>

                                                </div>

                                            </td>

                                        </tr>
                                    `)
                                    .join("")
                        }

                    </tbody>

                </table>

            </div>

        </div>


        <div id="customerModal"></div>
    `;

    addModalStylesIfNeeded();
}


function filterCustomers() {
    const input = document.getElementById("customerSearch");

    renderCustomersTable(input ? input.value : "");
}


/* =========================================================
   CUSTOMER MODAL
========================================================= */

function openCustomerModal(customerId = null) {

    const customer = customerId
        ? customersCache.find(
            item => Number(item.id) === Number(customerId)
        )
        : null;


    const modalContainer =
        document.getElementById("customerModal");


    modalContainer.innerHTML = `

        <div
            class="modal-backdrop"
            onclick="closeCustomerModal(event)"
        >

            <div
                class="modal"
                onclick="event.stopPropagation()"
            >

                <div class="modal-header">

                    <div>

                        <h2>
                            ${
                                customer
                                    ? "Edit Customer"
                                    : "Add Customer"
                            }
                        </h2>

                        <p>
                            ${
                                customer
                                    ? "Update customer information"
                                    : "Enter customer details"
                            }
                        </p>

                    </div>

                    <button
                        class="modal-close"
                        onclick="closeCustomerModal()"
                    >
                        ×
                    </button>

                </div>


                <form
                    id="customerForm"
                    onsubmit="saveCustomer(event, ${customerId || "null"})"
                >

                    <div class="form-grid">


                        <div class="form-field">

                            <label>
                                Company Name *
                            </label>

                            <input
                                name="company_name"
                                required
                                value="${escapeHtml(
                                    customer?.company_name || ""
                                )}"
                            >

                        </div>


                        <div class="form-field">

                            <label>
                                Contact Person
                            </label>

                            <input
                                name="contact_person"
                                value="${escapeHtml(
                                    customer?.contact_person || ""
                                )}"
                            >

                        </div>


                        <div class="form-field">

                            <label>
                                Mobile
                            </label>

                            <input
                                name="mobile"
                                value="${escapeHtml(
                                    customer?.mobile || ""
                                )}"
                            >

                        </div>


                        <div class="form-field">

                            <label>
                                WhatsApp
                            </label>

                            <input
                                name="whatsapp"
                                value="${escapeHtml(
                                    customer?.whatsapp || ""
                                )}"
                            >

                        </div>


                        <div class="form-field">

                            <label>
                                Email
                            </label>

                            <input
                                type="email"
                                name="email"
                                value="${escapeHtml(
                                    customer?.email || ""
                                )}"
                            >

                        </div>


                        <div class="form-field">

                            <label>
                                GST Number
                            </label>

                            <input
                                name="gst_number"
                                value="${escapeHtml(
                                    customer?.gst_number || ""
                                )}"
                            >

                        </div>


                        <div class="form-field full">

                            <label>
                                Address
                            </label>

                            <textarea
                                name="address"
                                rows="2"
                            >${escapeHtml(
                                customer?.address || ""
                            )}</textarea>

                        </div>


                        <div class="form-field">

                            <label>
                                City
                            </label>

                            <input
                                name="city"
                                value="${escapeHtml(
                                    customer?.city || ""
                                )}"
                            >

                        </div>


                        <div class="form-field">

                            <label>
                                State
                            </label>

                            <input
                                name="state"
                                value="${escapeHtml(
                                    customer?.state || ""
                                )}"
                            >

                        </div>


                        <div class="form-field">

                            <label>
                                Pincode
                            </label>

                            <input
                                name="pincode"
                                value="${escapeHtml(
                                    customer?.pincode || ""
                                )}"
                            >

                        </div>


                        <div class="form-field">

                            <label>
                                Customer Type
                            </label>

                            <select name="customer_type">

                                <option value="">
                                    Select type
                                </option>

                                <option
                                    value="Industrial"
                                    ${
                                        customer?.customer_type === "Industrial"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Industrial
                                </option>

                                <option
                                    value="OEM"
                                    ${
                                        customer?.customer_type === "OEM"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    OEM
                                </option>

                                <option
                                    value="Dealer"
                                    ${
                                        customer?.customer_type === "Dealer"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Dealer
                                </option>

                                <option
                                    value="Trader"
                                    ${
                                        customer?.customer_type === "Trader"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Trader
                                </option>

                                <option
                                    value="Project"
                                    ${
                                        customer?.customer_type === "Project"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Project
                                </option>

                            </select>

                        </div>


                        <div class="form-field full">

                            <label>
                                Notes
                            </label>

                            <textarea
                                name="notes"
                                rows="3"
                            >${escapeHtml(
                                customer?.notes || ""
                            )}</textarea>

                        </div>


                    </div>


                    <div class="modal-footer">

                        <button
                            type="button"
                            class="secondary-button"
                            onclick="closeCustomerModal()"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            class="primary-button"
                        >
                            ${
                                customer
                                    ? "Update Customer"
                                    : "Save Customer"
                            }
                        </button>

                    </div>

                </form>

            </div>

        </div>
    `;
}


function closeCustomerModal(event) {

    if (
        event &&
        event.target &&
        !event.target.classList.contains("modal-backdrop")
    ) {
        return;
    }

    const container =
        document.getElementById("customerModal");

    if (container) {
        container.innerHTML = "";
    }
}


/* =========================================================
   SAVE CUSTOMER
========================================================= */

async function saveCustomer(event, customerId) {

    event.preventDefault();

    const form = event.target;

    const formData = new FormData(form);

    const data = {};

    formData.forEach((value, key) => {

        const trimmed =
            String(value).trim();

        if (trimmed !== "") {
            data[key] = trimmed;
        }
    });


    if (!data.company_name) {

        alert("Company name is required.");

        return;
    }


    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );

    submitButton.disabled = true;

    submitButton.textContent =
        customerId
            ? "Updating..."
            : "Saving...";


    try {

        if (customerId) {

            await apiPut(
                `/customers/${customerId}`,
                data
            );

            alert(
                "Customer updated successfully."
            );

        } else {

            await apiPost(
                "/customers",
                data
            );

            alert(
                "Customer created successfully."
            );
        }


        closeCustomerModal();

        await renderCustomers();

    } catch (error) {

        console.error(error);

        alert(
            `Unable to save customer:\n\n${error.message}`
        );

        submitButton.disabled = false;

        submitButton.textContent =
            customerId
                ? "Update Customer"
                : "Save Customer";
    }
}


/* =========================================================
   DELETE CUSTOMER
========================================================= */

async function deleteCustomer(customerId) {

    const customer =
        customersCache.find(
            item =>
                Number(item.id) === Number(customerId)
        );


    if (!customer) {
        return;
    }


    const companyName =
        customer.company_name ||
        `Customer #${customerId}`;


    const confirmed = confirm(
        `Delete "${companyName}"?\n\n` +
        `This action cannot be undone.`
    );


    if (!confirmed) {
        return;
    }


    try {

        await apiDelete(
            `/customers/${customerId}`
        );

        alert(
            "Customer deleted successfully."
        );

        await renderCustomers();

    } catch (error) {

        console.error(error);

        alert(
            `Unable to delete customer:\n\n${error.message}`
        );
    }
}


/* =========================================================
   PRODUCTS
========================================================= */

async function renderProducts() {

    const content =
        document.getElementById("content");

    content.innerHTML = `
        <div class="loading">
            Loading products...
        </div>
    `;


    try {

        const result =
            await apiGet("/products");

        const data =
            result.data || [];


        content.innerHTML = `

            <div class="page-toolbar">

                <input
                    class="search-box"
                    placeholder="Search products..."
                >

                <button
                    class="primary-button"
                    disabled
                    title="Coming next"
                >
                    + Add Product
                </button>

            </div>


            <div class="panel">

                <div class="table-wrapper">

                    <table>

                        <thead>

                            <tr>
                                <th>Product</th>
                                <th>Brand</th>
                                <th>Model</th>
                                <th>Selling Price</th>
                                <th>Stock</th>
                                <th>Unit</th>
                            </tr>

                        </thead>

                        <tbody>

                            ${
                                data.length === 0
                                    ? `
                                        <tr>
                                            <td colspan="6">

                                                <div class="empty">
                                                    <div class="empty-icon">
                                                        📦
                                                    </div>
                                                    No products found
                                                </div>

                                            </td>
                                        </tr>
                                    `
                                    : data.map(product => `
                                        <tr>

                                            <td>
                                                <strong>
                                                    ${escapeHtml(
                                                        product.product_name || "-"
                                                    )}
                                                </strong>
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    product.brand || "-"
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    product.model || "-"
                                                )}
                                            </td>

                                            <td>
                                                ${formatCurrency(
                                                    product.selling_price
                                                )}
                                            </td>

                                            <td>
                                                ${product.stock_qty ?? 0}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    product.unit || "Nos"
                                                )}
                                            </td>

                                        </tr>
                                    `).join("")
                            }

                        </tbody>

                    </table>

                </div>

            </div>
        `;

    } catch (error) {

        console.error(error);

        content.innerHTML = `
            <div class="panel">
                <div class="panel-body">
                    Error loading products:
                    ${escapeHtml(error.message)}
                </div>
            </div>
        `;
    }
}


/* =========================================================
   GENERIC SIMPLE TABLE
========================================================= */

async function renderSimpleTable(table, title) {

    const content =
        document.getElementById("content");

    content.innerHTML = `
        <div class="loading">
            Loading ${escapeHtml(title)}...
        </div>
    `;


    try {

        const result =
            await apiGet(`/${table}`);

        const data =
            result.data || [];


        if (data.length === 0) {

            content.innerHTML = `

                <div class="panel">

                    <div class="panel-body">

                        <div class="empty">

                            <div class="empty-icon">
                                📋
                            </div>

                            <h3>
                                No ${escapeHtml(
                                    title.toLowerCase()
                                )} found
                            </h3>

                            <p>
                                Records will appear here
                                when they are added.
                            </p>

                        </div>

                    </div>

                </div>
            `;

            return;
        }


        const columns =
            Object.keys(data[0]);


        content.innerHTML = `

            <div class="panel">

                <div class="table-wrapper">

                    <table>

                        <thead>

                            <tr>

                                ${columns.map(column => `
                                    <th>
                                        ${escapeHtml(column)}
                                    </th>
                                `).join("")}

                            </tr>

                        </thead>


                        <tbody>

                            ${data
                                .slice(0, 100)
                                .map(row => `
                                    <tr>

                                        ${columns
                                            .map(column => `
                                                <td>
                                                    ${escapeHtml(
                                                        row[column] ?? "-"
                                                    )}
                                                </td>
                                            `)
                                            .join("")}

                                    </tr>
                                `)
                                .join("")}

                        </tbody>

                    </table>

                </div>

            </div>
        `;

    } catch (error) {

        console.error(error);

        content.innerHTML = `
            <div class="panel">
                <div class="panel-body">
                    Unable to load ${escapeHtml(title)}.
                    <br><br>
                    ${escapeHtml(error.message)}
                </div>
            </div>
        `;
    }
}


/* =========================================================
   NAVIGATION
========================================================= */

function showPage(page) {

    currentPage = page;

    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.page === page
            );

        });


    const info =
        PAGE_INFO[page] ||
        PAGE_INFO.dashboard;


    document.getElementById(
        "pageTitle"
    ).textContent = info.title;


    document.getElementById(
        "pageSubtitle"
    ).textContent = info.subtitle;


    switch (page) {

        case "dashboard":
            renderDashboard();
            break;

        case "customers":
            renderCustomers();
            break;

        case "products":
            renderProducts();
            break;

        case "enquiries":
            renderSimpleTable(
                "enquiries",
                "Enquiries"
            );
            break;

        case "quotations":
            renderSimpleTable(
                "quotations",
                "Quotations"
            );
            break;

        case "orders":
            renderSimpleTable(
                "orders",
                "Orders"
            );
            break;

        case "followups":
            renderSimpleTable(
                "followups",
                "Follow-ups"
            );
            break;

        case "payments":
            renderSimpleTable(
                "payments",
                "Payments"
            );
            break;

        default:
            renderDashboard();
    }
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

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


/* =========================================================
   CURRENCY
========================================================= */

function formatCurrency(value) {

    const number =
        Number(value || 0);

    return number.toLocaleString(
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
   MODAL + ACTION BUTTON STYLES
========================================================= */

function addModalStylesIfNeeded() {

    if (
        document.getElementById(
            "customer-modal-styles"
        )
    ) {
        return;
    }


    const style =
        document.createElement("style");

    style.id =
        "customer-modal-styles";


    style.textContent = `

        .small-action {
            border: 1px solid #d1d5db;
            background: #fff;
            color: #374151;
            padding: 6px 9px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
        }

        .small-action:hover {
            background: #f3f4f6;
        }

        .small-action.danger {
            color: #b91c1c;
            border-color: #fecaca;
        }

        .small-action.danger:hover {
            background: #fef2f2;
        }

        .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(15,23,42,0.55);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            z-index: 9999;
        }

        .modal {
            width: min(850px, 100%);
            max-height: 90vh;
            overflow-y: auto;
            background: #fff;
            border-radius: 14px;
            box-shadow: 0 25px 70px rgba(0,0,0,.2);
        }

        .modal-header {
            padding: 22px 24px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            gap: 15px;
            align-items: flex-start;
        }

        .modal-header h2 {
            margin: 0;
            font-size: 20px;
        }

        .modal-header p {
            margin-top: 5px;
            color: #6b7280;
            font-size: 12px;
        }

        .modal-close {
            width: 35px;
            height: 35px;
            border: none;
            background: #f3f4f6;
            border-radius: 8px;
            font-size: 22px;
            cursor: pointer;
        }

        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            padding: 24px;
        }

        .form-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .form-field.full {
            grid-column: 1 / -1;
        }

        .form-field label {
            font-size: 12px;
            font-weight: 600;
            color: #374151;
        }

        .form-field input,
        .form-field textarea,
        .form-field select {
            width: 100%;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 10px 11px;
            outline: none;
            background: #fff;
            font: inherit;
        }

        .form-field input:focus,
        .form-field textarea:focus,
        .form-field select:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37,99,235,.1);
        }

        .modal-footer {
            padding: 18px 24px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }

        .secondary-button {
            border: 1px solid #d1d5db;
            background: #fff;
            color: #374151;
            border-radius: 8px;
            padding: 10px 15px;
            cursor: pointer;
        }

        .secondary-button:hover {
            background: #f3f4f6;
        }

        @media (max-width: 700px) {
            .form-grid {
                grid-template-columns: 1fr;
            }

            .form-field.full {
                grid-column: auto;
            }

            .modal-footer {
                flex-direction: column-reverse;
            }

            .modal-footer button {
                width: 100%;
            }
        }
    `;


    document.head.appendChild(style);
}


/* =========================================================
   NAVIGATION EVENTS
========================================================= */

document
    .querySelectorAll(".nav-item")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {
                showPage(
                    button.dataset.page
                );
            }
        );

    });


/* =========================================================
   INITIAL LOAD
========================================================= */

showPage("dashboard");
