/* =========================================================
   MAHALAXMI ENTERPRISE CRM
   Frontend JavaScript
========================================================= */

const API = "/api";

let customersCache = [];
let currentPage = "dashboard";


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
   API HELPERS
========================================================= */

async function apiRequest(
    endpoint,
    options = {}
) {

    const response =
        await fetch(
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


async function apiGet(endpoint) {

    return apiRequest(endpoint);

}


async function apiPost(
    endpoint,
    data
) {

    return apiRequest(
        endpoint,
        {
            method: "POST",

            body:
                JSON.stringify(data)
        }
    );

}


async function apiPut(
    endpoint,
    data
) {

    return apiRequest(
        endpoint,
        {
            method: "PUT",

            body:
                JSON.stringify(data)
        }
    );

}


async function apiDelete(
    endpoint
) {

    return apiRequest(
        endpoint,
        {
            method: "DELETE"
        }
    );

}


/* =========================================================
   HTML HELPERS
========================================================= */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


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
   NAVIGATION
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

    const content =
        document.getElementById(
            "content"
        );


    content.innerHTML = `
        <div class="loading">
            Loading dashboard...
        </div>
    `;


    try {

        const results =
            await Promise.all(
                [
                    apiGet("/customers"),
                    apiGet("/products"),
                    apiGet("/enquiries"),
                    apiGet("/quotations"),
                    apiGet("/orders"),
                    apiGet("/followups")
                ]
            );


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


        const enquiryData =
            enquiries.data || [];


        const quotationData =
            quotations.data || [];


        const quotationValue =
            quotationData.reduce(
                (
                    total,
                    quote
                ) =>
                    total +
                    Number(
                        quote.grand_total || 0
                    ),
                0
            );


        content.innerHTML = `

            <div class="stats">


                <div class="stat-card">

                    <div class="stat-label">
                        Customers
                    </div>

                    <div class="stat-value">
                        ${customers.count || 0}
                    </div>

                    <div class="stat-footer">
                        Total customers
                    </div>

                </div>


                <div class="stat-card">

                    <div class="stat-label">
                        Products
                    </div>

                    <div class="stat-value">
                        ${products.count || 0}
                    </div>

                    <div class="stat-footer">
                        Product catalogue
                    </div>

                </div>


                <div class="stat-card">

                    <div class="stat-label">
                        Enquiries
                    </div>

                    <div class="stat-value">
                        ${enquiries.count || 0}
                    </div>

                    <div class="stat-footer">
                        Customer enquiries
                    </div>

                </div>


                <div class="stat-card">

                    <div class="stat-label">
                        Quotations
                    </div>

                    <div class="stat-value">
                        ${quotations.count || 0}
                    </div>

                    <div class="stat-footer">
                        Total quotations
                    </div>

                </div>


            </div>


            <div class="grid-2">


                <div class="panel">

                    <div class="panel-header">

                        <h2>
                            Recent Enquiries
                        </h2>

                        <button
                            type="button"
                            id="viewEnquiriesButton"
                        >
                            View all
                        </button>

                    </div>


                    <div class="panel-body">

                        ${
                            enquiryData.length === 0

                                ? `

                                    <div class="empty">

                                        <div class="empty-icon">
                                            📩
                                        </div>

                                        No enquiries yet

                                    </div>

                                `

                                : `

                                    <div class="table-wrapper">

                                        <table>

                                            <thead>

                                                <tr>

                                                    <th>
                                                        ID
                                                    </th>

                                                    <th>
                                                        Subject
                                                    </th>

                                                    <th>
                                                        Source
                                                    </th>

                                                    <th>
                                                        Status
                                                    </th>

                                                </tr>

                                            </thead>


                                            <tbody>

                                                ${enquiryData
                                                    .slice(0, 5)
                                                    .map(
                                                        enquiry =>
                                                            `

                                                            <tr>

                                                                <td>
                                                                    #${escapeHtml(
                                                                        enquiry.id
                                                                    )}
                                                                </td>

                                                                <td>
                                                                    ${escapeHtml(
                                                                        enquiry.subject ||
                                                                            "-"
                                                                    )}
                                                                </td>

                                                                <td>
                                                                    ${escapeHtml(
                                                                        enquiry.source ||
                                                                            "-"
                                                                    )}
                                                                </td>

                                                                <td>

                                                                    <span
                                                                        class="badge badge-new"
                                                                    >
                                                                        ${escapeHtml(
                                                                            enquiry.status ||
                                                                                "New"
                                                                        )}
                                                                    </span>

                                                                </td>

                                                            </tr>

                                                            `
                                                    )
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

                        <h2>
                            Recent Quotations
                        </h2>

                        <button
                            type="button"
                            id="viewQuotationsButton"
                        >
                            View all
                        </button>

                    </div>


                    <div class="panel-body">

                        ${
                            quotationData.length === 0

                                ? `

                                    <div class="empty">

                                        <div class="empty-icon">
                                            💰
                                        </div>

                                        No quotations yet

                                    </div>

                                `

                                : `

                                    <div class="table-wrapper">

                                        <table>

                                            <thead>

                                                <tr>

                                                    <th>
                                                        Quote
                                                    </th>

                                                    <th>
                                                        Status
                                                    </th>

                                                    <th>
                                                        Total
                                                    </th>

                                                </tr>

                                            </thead>


                                            <tbody>

                                                ${quotationData
                                                    .slice(0, 5)
                                                    .map(
                                                        quote =>
                                                            `

                                                            <tr>

                                                                <td>
                                                                    ${escapeHtml(
                                                                        quote.quotation_number ||
                                                                            "-"
                                                                    )}
                                                                </td>

                                                                <td>

                                                                    <span
                                                                        class="badge badge-draft"
                                                                    >
                                                                        ${escapeHtml(
                                                                            quote.status ||
                                                                                "Draft"
                                                                        )}
                                                                    </span>

                                                                </td>

                                                                <td>
                                                                    ${formatCurrency(
                                                                        quote.grand_total
                                                                    )}
                                                                </td>

                                                            </tr>

                                                            `
                                                    )
                                                    .join("")}

                                            </tbody>

                                        </table>

                                    </div>

                                `
                        }

                    </div>

                </div>


            </div>


            <div
                class="panel"
                style="margin-top:20px;"
            >

                <div class="panel-header">

                    <h2>
                        Quick Overview
                    </h2>

                </div>


                <div class="panel-body">

                    <div class="stats">


                        <div class="stat-card">

                            <div class="stat-label">
                                Orders
                            </div>

                            <div class="stat-value">
                                ${orders.count || 0}
                            </div>

                        </div>


                        <div class="stat-card">

                            <div class="stat-label">
                                Follow-ups
                            </div>

                            <div class="stat-value">
                                ${followups.count || 0}
                            </div>

                        </div>


                        <div class="stat-card">

                            <div class="stat-label">
                                Quotation Value
                            </div>

                            <div class="stat-value">
                                ${formatCurrency(
                                    quotationValue
                                )}
                            </div>

                        </div>


                    </div>

                </div>

            </div>

        `;


        document
            .getElementById(
                "viewEnquiriesButton"
            )
            ?.addEventListener(
                "click",
                () =>
                    showPage(
                        "enquiries"
                    )
            );


        document
            .getElementById(
                "viewQuotationsButton"
            )
            ?.addEventListener(
                "click",
                () =>
                    showPage(
                        "quotations"
                    )
            );


    } catch (error) {

        console.error(
            error
        );


        content.innerHTML = `

            <div class="panel">

                <div class="panel-body">

                    <div class="empty">

                        <div class="empty-icon">
                            ⚠️
                        </div>

                        <h3>
                            Unable to load dashboard
                        </h3>

                        <p>
                            ${escapeHtml(
                                error.message
                            )}
                        </p>

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

    const content =
        document.getElementById(
            "content"
        );


    content.innerHTML = `

        <div class="loading">
            Loading customers...
        </div>

    `;


    try {

        const result =
            await apiGet(
                "/customers"
            );


        /*
          Supports BOTH:

          {
              data: [...]
          }

          AND

          {
              customers: [...]
          }
        */

        customersCache =
            result.data ||
            result.customers ||
            [];


        renderCustomersPage();


    } catch (error) {

        console.error(
            error
        );


        content.innerHTML = `

            <div class="panel">

                <div class="panel-body">

                    <div class="empty">

                        <div class="empty-icon">
                            ⚠️
                        </div>

                        <h3>
                            Unable to load customers
                        </h3>

                        <p>
                            ${escapeHtml(
                                error.message
                            )}
                        </p>

                    </div>

                </div>

            </div>

        `;

    }

}


/* =========================================================
   CUSTOMER PAGE
========================================================= */

function renderCustomersPage() {

    const content =
        document.getElementById(
            "content"
        );


    /*
      IMPORTANT:

      This function creates the search input
      ONLY ONCE.

      It does NOT run again when typing.
    */

    content.innerHTML = `

        <div class="page-toolbar">


            <input

                id="customerSearch"

                class="search-box"

                type="search"

                autocomplete="off"

                spellcheck="false"

                placeholder="
                    Search company, contact, mobile, GST...
                "

            >


            <button

                id="addCustomerButton"

                class="primary-button"

                type="button"

            >
                + Add Customer
            </button>


        </div>



        <div class="panel">


            <div class="panel-header">

                <h2>

                    Customers

                    <span
                        id="customerCount"
                        style="
                            color:#6b7280;
                            font-size:12px;
                        "
                    >
                        (${customersCache.length})
                    </span>

                </h2>

            </div>



            <div class="table-wrapper">

                <table>


                    <thead>

                        <tr>

                            <th>
                                Company
                            </th>

                            <th>
                                Contact
                            </th>

                            <th>
                                Mobile
                            </th>

                            <th>
                                City
                            </th>

                            <th>
                                GST
                            </th>

                            <th>
                                Type
                            </th>

                            <th>
                                Action
                            </th>

                        </tr>

                    </thead>



                    <tbody
                        id="customersTableBody"
                    >
                    </tbody>


                </table>

            </div>


        </div>



        <div
            id="customerModal"
        ></div>

    `;


    /*
      Draw initial rows
    */

    renderCustomerRows(
        ""
    );


    /*
      SEARCH EVENT

      This is the important fix.

      We NEVER replace the search input.

      We only replace the tbody.
    */

    const searchInput =
        document.getElementById(
            "customerSearch"
        );


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            function () {

                renderCustomerRows(
                    this.value
                );

            }
        );


        searchInput.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Escape"
                ) {

                    this.value =
                        "";

                    renderCustomerRows(
                        ""
                    );

                }

            }
        );

    }


    /*
      ADD CUSTOMER
    */

    const addButton =
        document.getElementById(
            "addCustomerButton"
        );


    if (addButton) {

        addButton.addEventListener(
            "click",
            function () {

                openCustomerModal();

            }
        );

    }


    /*
      EDIT / DELETE

      Event delegation.
    */

    const tbody =
        document.getElementById(
            "customersTableBody"
        );


    if (tbody) {

        tbody.addEventListener(
            "click",
            function (event) {


                const editButton =
                    event.target.closest(
                        ".edit-customer"
                    );


                if (editButton) {

                    openCustomerModal(
                        Number(
                            editButton.dataset.id
                        )
                    );

                    return;

                }



                const deleteButton =
                    event.target.closest(
                        ".delete-customer"
                    );


                if (deleteButton) {

                    deleteCustomer(
                        Number(
                            deleteButton.dataset.id
                        )
                    );

                }

            }
        );

    }

}


/* =========================================================
   CUSTOMER ROWS
========================================================= */

function renderCustomerRows(
    searchValue = ""
) {

    const tbody =
        document.getElementById(
            "customersTableBody"
        );


    if (!tbody) {

        return;

    }


    const search =
        String(
            searchValue
        )
        .trim()
        .toLowerCase();


    const filtered =
        customersCache.filter(
            customer => {


                const searchable = [

                    customer.company_name,

                    customer.contact_person,

                    customer.mobile,

                    customer.whatsapp,

                    customer.email,

                    customer.city,

                    customer.state,

                    customer.pincode,

                    customer.gst_number,

                    customer.customer_type,

                    customer.address

                ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


                return searchable.includes(
                    search
                );

            }
        );


    /*
      Update only count
    */

    const count =
        document.getElementById(
            "customerCount"
        );


    if (count) {

        count.textContent =
            `(${filtered.length})`;

    }


    /*
      NO RESULTS
    */

    if (
        filtered.length ===
        0
    ) {

        tbody.innerHTML = `

            <tr>

                <td colspan="7">

                    <div class="empty">

                        <div class="empty-icon">

                            ${
                                search
                                    ? "🔍"
                                    : "👥"
                            }

                        </div>


                        ${
                            search
                                ? "No customers match your search"
                                : "No customers yet"
                        }

                    </div>

                </td>

            </tr>

        `;

        return;

    }


    /*
      CUSTOMER ROWS
    */

    tbody.innerHTML =
        filtered
            .map(
                customer =>
                    `

                    <tr>


                        <td>

                            <strong>

                                ${escapeHtml(
                                    customer.company_name ||
                                        "-"
                                )}

                            </strong>

                        </td>



                        <td>

                            ${escapeHtml(
                                customer.contact_person ||
                                    "-"
                            )}

                        </td>



                        <td>

                            ${escapeHtml(
                                customer.mobile ||
                                    "-"
                            )}

                        </td>



                        <td>

                            ${escapeHtml(
                                customer.city ||
                                    "-"
                            )}

                        </td>



                        <td>

                            ${escapeHtml(
                                customer.gst_number ||
                                    "-"
                            )}

                        </td>



                        <td>

                            ${escapeHtml(
                                customer.customer_type ||
                                    "-"
                            )}

                        </td>



                        <td>


                            <div
                                style="
                                    display:flex;
                                    gap:6px;
                                "
                            >


                                <button

                                    type="button"

                                    class="
                                        small-action
                                        edit-customer
                                    "

                                    data-id="
                                        ${customer.id}
                                    "

                                >
                                    Edit
                                </button>



                                <button

                                    type="button"

                                    class="
                                        small-action
                                        danger
                                        delete-customer
                                    "

                                    data-id="
                                        ${customer.id}
                                    "

                                >
                                    Delete
                                </button>


                            </div>


                        </td>


                    </tr>

                    `
            )
            .join(
                ""
            );

}


/* =========================================================
   ADD / EDIT CUSTOMER MODAL
========================================================= */

function openCustomerModal(
    customerId = null
) {

    const container =
        document.getElementById(
            "customerModal"
        );


    if (!container) {

        alert(
            "Customer form could not be opened."
        );

        return;

    }


    const customer =
        customerId
            ? customersCache.find(
                item =>
                    Number(
                        item.id
                    ) ===
                    Number(
                        customerId
                    )
            )
            : null;


    container.innerHTML = `

        <div
            class="modal-backdrop"
            id="customerModalBackdrop"
        >


            <div
                class="modal"
                onclick="
                    event.stopPropagation()
                "
            >


                <div
                    class="modal-header"
                >


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
                                    : "Enter customer information"
                            }

                        </p>

                    </div>



                    <button

                        type="button"

                        class="modal-close"

                        id="
                            closeCustomerModalButton
                        "

                    >
                        ×
                    </button>


                </div>



                <form
                    id="customerForm"
                >


                    <div
                        class="form-grid"
                    >


                        <div
                            class="form-field"
                        >

                            <label>
                                Company Name *
                            </label>


                            <input

                                name="company_name"

                                required

                                value="
                                    ${escapeHtml(
                                        customer?.company_name ||
                                            ""
                                    )}
                                "

                            >

                        </div>



                        <div
                            class="form-field"
                        >

                            <label>
                                Contact Person
                            </label>


                            <input

                                name="contact_person"

                                value="
                                    ${escapeHtml(
                                        customer?.contact_person ||
                                            ""
                                    )}
                                "

                            >

                        </div>



                        <div
                            class="form-field"
                        >

                            <label>
                                Mobile
                            </label>


                            <input

                                name="mobile"

                                value="
                                    ${escapeHtml(
                                        customer?.mobile ||
                                            ""
                                    )}
                                "

                            >

                        </div>



                        <div
                            class="form-field"
                        >

                            <label>
                                WhatsApp
                            </label>


                            <input

                                name="whatsapp"

                                value="
                                    ${escapeHtml(
                                        customer?.whatsapp ||
                                            ""
                                    )}
                                "

                            >

                        </div>



                        <div
                            class="form-field"
                        >

                            <label>
                                Email
                            </label>


                            <input

                                type="email"

                                name="email"

                                value="
                                    ${escapeHtml(
                                        customer?.email ||
                                            ""
                                    )}
                                "

                            >

                        </div>



                        <div
                            class="form-field"
                        >

                            <label>
                                GST Number
                            </label>


                            <input

                                name="gst_number"

                                value="
                                    ${escapeHtml(
                                        customer?.gst_number ||
                                            ""
                                    )}
                                "

                            >

                        </div>



                        <div
                            class="
                                form-field
                                full
                            "
                        >

                            <label>
                                Address
                            </label>


                            <textarea

                                name="address"

                                rows="2"

                            >${escapeHtml(
                                customer?.address ||
                                    ""
                            )}</textarea>


                        </div>



                        <div
                            class="form-field"
                        >

                            <label>
                                City
                            </label>


                            <input

                                name="city"

                                value="
                                    ${escapeHtml(
                                        customer?.city ||
                                            ""
                                    )}
                                "

                            >

                        </div>



                        <div
                            class="form-field"
                        >

                            <label>
                                State
                            </label>


                            <input

                                name="state"

                                value="
                                    ${escapeHtml(
                                        customer?.state ||
                                            ""
                                    )}
                                "

                            >

                        </div>



                        <div
                            class="form-field"
                        >

                            <label>
                                Pincode
                            </label>


                            <input

                                name="pincode"

                                value="
                                    ${escapeHtml(
                                        customer?.pincode ||
                                            ""
                                    )}
                                "

                            >

                        </div>



                        <div
                            class="form-field"
                        >

                            <label>
                                Customer Type
                            </label>


                            <select
                                name="customer_type"
                            >

                                <option value="">
                                    Select type
                                </option>


                                <option
                                    value="Industrial"
                                    ${
                                        customer?.customer_type ===
                                        "Industrial"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Industrial
                                </option>


                                <option
                                    value="OEM"
                                    ${
                                        customer?.customer_type ===
                                        "OEM"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    OEM
                                </option>


                                <option
                                    value="Dealer"
                                    ${
                                        customer?.customer_type ===
                                        "Dealer"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Dealer
                                </option>


                                <option
                                    value="Trader"
                                    ${
                                        customer?.customer_type ===
                                        "Trader"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Trader
                                </option>


                                <option
                                    value="Project"
                                    ${
                                        customer?.customer_type ===
                                        "Project"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Project
                                </option>


                            </select>

                        </div>



                        <div
                            class="
                                form-field
                                full
                            "
                        >

                            <label>
                                Notes
                            </label>


                            <textarea

                                name="notes"

                                rows="3"

                            >${escapeHtml(
                                customer?.notes ||
                                    ""
                            )}</textarea>


                        </div>


                    </div>



                    <div
                        class="modal-footer"
                    >


                        <button

                            type="button"

                            class="secondary-button"

                            id="
                                cancelCustomerButton
                            "

                        >
                            Cancel
                        </button>



                        <button

                            type="submit"

                            class="primary-button"

                            id="
                                saveCustomerButton
                            "

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


    /*
      CLOSE
    */

    document
        .getElementById(
            "closeCustomerModalButton"
        )
        ?.addEventListener(
            "click",
            closeCustomerModal
        );


    document
        .getElementById(
            "cancelCustomerButton"
        )
        ?.addEventListener(
            "click",
            closeCustomerModal
        );


    document
        .getElementById(
            "customerModalBackdrop"
        )
        ?.addEventListener(
            "click",
            function (
                event
            ) {

                if (
                    event.target.id ===
                    "customerModalBackdrop"
                ) {

                    closeCustomerModal();

                }

            }
        );


    /*
      SAVE
    */

    document
        .getElementById(
            "customerForm"
        )
        ?.addEventListener(
            "submit",
            function (
                event
            ) {

                saveCustomer(
                    event,
                    customerId
                );

            }
        );


    /*
      FOCUS COMPANY
    */

    setTimeout(
        function () {

            document
                .querySelector(
                    "#customerForm input[name='company_name']"
                )
                ?.focus();

        },
        50
    );

}


function closeCustomerModal() {

    const container =
        document.getElementById(
            "customerModal"
        );


    if (container) {

        container.innerHTML =
            "";

    }

}


/* =========================================================
   SAVE CUSTOMER
========================================================= */

async function saveCustomer(
    event,
    customerId
) {

    event.preventDefault();


    const form =
        event.target;


    const formData =
        new FormData(
            form
        );


    const data = {};


    formData.forEach(
        (
            value,
            key
        ) => {

            const cleaned =
                String(
                    value
                ).trim();


            if (
                cleaned !== ""
            ) {

                data[key] =
                    cleaned;

            }

        }
    );


    if (
        !data.company_name
    ) {

        alert(
            "Company name is required."
        );

        return;

    }


    const button =
        document.getElementById(
            "saveCustomerButton"
        );


    if (button) {

        button.disabled =
            true;

        button.textContent =
            customerId
                ? "Updating..."
                : "Saving...";

    }


    try {


        if (
            customerId
        ) {

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


    } catch (
        error
    ) {

        console.error(
            error
        );


        alert(
            "Unable to save customer:\n\n" +
            error.message
        );


        if (button) {

            button.disabled =
                false;

            button.textContent =
                customerId
                    ? "Update Customer"
                    : "Save Customer";

        }

    }

}


/* =========================================================
   DELETE CUSTOMER
========================================================= */

async function deleteCustomer(
    customerId
) {

    const customer =
        customersCache.find(
            item =>
                Number(
                    item.id
                ) ===
                Number(
                    customerId
                )
        );


    if (!customer) {

        return;

    }


    const name =
        customer.company_name ||
        `Customer #${customerId}`;


    const confirmed =
        confirm(
            `Delete "${name}"?\n\n` +
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


    } catch (
        error
    ) {

        console.error(
            error
        );


        alert(
            "Unable to delete customer:\n\n" +
            error.message
        );

    }

}


/* =========================================================
   PRODUCTS
========================================================= */

async function renderProducts() {

    const content =
        document.getElementById(
            "content"
        );


    content.innerHTML = `

        <div class="loading">
            Loading products...
        </div>

    `;


    try {

        const result =
            await apiGet(
                "/products"
            );


        const data =
            result.data || [];


        content.innerHTML = `

            <div class="page-toolbar">


                <input

                    class="search-box"

                    placeholder="Search products..."

                    disabled

                >


                <button

                    class="primary-button"

                    type="button"

                    disabled

                >
                    + Add Product
                </button>


            </div>



            <div class="panel">


                <div class="table-wrapper">


                    <table>


                        <thead>

                            <tr>

                                <th>
                                    Product
                                </th>

                                <th>
                                    Brand
                                </th>

                                <th>
                                    Model
                                </th>

                                <th>
                                    Selling Price
                                </th>

                                <th>
                                    Stock
                                </th>

                                <th>
                                    Unit
                                </th>

                            </tr>

                        </thead>



                        <tbody>


                            ${
                                data.length === 0

                                    ? `

                                        <tr>

                                            <td
                                                colspan="6"
                                            >

                                                <div class="empty">

                                                    <div class="empty-icon">
                                                        📦
                                                    </div>

                                                    No products found

                                                </div>

                                            </td>

                                        </tr>

                                    `

                                    : data
                                        .map(
                                            product =>
                                                `

                                                <tr>

                                                    <td>

                                                        <strong>

                                                            ${escapeHtml(
                                                                product.product_name ||
                                                                    "-"
                                                            )}

                                                        </strong>

                                                    </td>


                                                    <td>

                                                        ${escapeHtml(
                                                            product.brand ||
                                                                "-"
                                                        )}

                                                    </td>


                                                    <td>

                                                        ${escapeHtml(
                                                            product.model ||
                                                                "-"
                                                        )}

                                                    </td>


                                                    <td>

                                                        ${formatCurrency(
                                                            product.selling_price
                                                        )}

                                                    </td>


                                                    <td>

                                                        ${escapeHtml(
                                                            product.stock_qty ??
                                                                0
                                                        )}

                                                    </td>


                                                    <td>

                                                        ${escapeHtml(
                                                            product.unit ||
                                                                "Nos"
                                                        )}

                                                    </td>

                                                </tr>

                                                `
                                        )
                                        .join("")

                            }


                        </tbody>


                    </table>


                </div>


            </div>

        `;


    } catch (
        error
    ) {

        content.innerHTML = `

            <div class="panel">

                <div class="panel-body">

                    Unable to load products.

                    <br><br>

                    ${escapeHtml(
                        error.message
                    )}

                </div>

            </div>

        `;

    }

}


/* =========================================================
   GENERIC TABLE PAGES
========================================================= */

async function renderSimpleTable(
    table,
    title
) {

    const content =
        document.getElementById(
            "content"
        );


    content.innerHTML = `

        <div class="loading">
            Loading ${escapeHtml(title)}...
        </div>

    `;


    try {

        const result =
            await apiGet(
                `/${table}`
            );


        const data =
            result.data || [];


        if (
            data.length ===
            0
        ) {

            content.innerHTML = `

                <div class="panel">

                    <div class="panel-body">

                        <div class="empty">

                            <div class="empty-icon">
                                📋
                            </div>


                            <h3>

                                No
                                ${escapeHtml(
                                    title.toLowerCase()
                                )}
                                found

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
            Object.keys(
                data[0]
            );


        content.innerHTML = `

            <div class="panel">


                <div class="table-wrapper">


                    <table>


                        <thead>

                            <tr>

                                ${columns
                                    .map(
                                        column =>
                                            `

                                            <th>

                                                ${escapeHtml(
                                                    column
                                                )}

                                            </th>

                                            `
                                    )
                                    .join(
                                        ""
                                    )}

                            </tr>

                        </thead>



                        <tbody>

                            ${data
                                .slice(
                                    0,
                                    100
                                )
                                .map(
                                    row =>
                                        `

                                        <tr>

                                            ${columns
                                                .map(
                                                    column =>
                                                        `

                                                        <td>

                                                            ${escapeHtml(
                                                                row[
                                                                    column
                                                                ] ??
                                                                    "-"
                                                            )}

                                                        </td>

                                                        `
                                                )
                                                .join(
                                                    ""
                                                )}

                                        </tr>

                                        `
                                )
                                .join(
                                    ""
                                )}

                        </tbody>


                    </table>


                </div>


            </div>

        `;


    } catch (
        error
    ) {

        content.innerHTML = `

            <div class="panel">

                <div class="panel-body">

                    Unable to load
                    ${escapeHtml(
                        title
                    )}.

                    <br><br>

                    ${escapeHtml(
                        error.message
                    )}

                </div>

            </div>

        `;

    }

}


/* =========================================================
   SHOW PAGE
========================================================= */

function showPage(
    page
) {

    currentPage =
        page;


    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(
            item => {

                item.classList.toggle(
                    "active",
                    item.dataset.page ===
                        page
                );

            }
        );


    updatePageHeader(
        page
    );


    switch (
        page
    ) {


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

            break;

    }

}


/* =========================================================
   NAVIGATION BUTTONS
========================================================= */

document
    .querySelectorAll(
        ".nav-item"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                function () {

                    showPage(
                        this.dataset.page
                    );

                }
            );

        }
    );


/* =========================================================
   INITIAL LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        showPage(
            "dashboard"
        );

    }
);
