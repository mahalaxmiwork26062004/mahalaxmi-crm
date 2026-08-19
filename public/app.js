const API = "/api";

let currentPage = "dashboard";


/* =========================================================
   API HELPER
========================================================= */

async function apiGet(endpoint) {

    const response = await fetch(`${API}${endpoint}`);

    if (!response.ok) {
        throw new Error(
            `API error: ${response.status}`
        );
    }

    return response.json();
}


/* =========================================================
   PAGE TITLES
========================================================= */

const PAGE_INFO = {

    dashboard: {
        title: "Dashboard",
        subtitle:
            "Overview of your business activity"
    },

    customers: {
        title: "Customers",
        subtitle:
            "Manage your customers and contacts"
    },

    enquiries: {
        title: "Enquiries",
        subtitle:
            "Track customer enquiries and leads"
    },

    products: {
        title: "Products",
        subtitle:
            "Products, pricing and stock"
    },

    quotations: {
        title: "Quotations",
        subtitle:
            "Manage quotations and proposals"
    },

    orders: {
        title: "Orders",
        subtitle:
            "Manage sales orders"
    },

    followups: {
        title: "Follow-ups",
        subtitle:
            "Today's customer follow-ups"
    },

    payments: {
        title: "Payments",
        subtitle:
            "Track customer payments"
    }

};


/* =========================================================
   DASHBOARD
========================================================= */

async function renderDashboard() {

    const content =
        document.getElementById("content");

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


        const customerCount =
            customers.count ?? 0;

        const productCount =
            products.count ?? 0;

        const enquiryCount =
            enquiries.count ?? 0;

        const quotationCount =
            quotations.count ?? 0;

        const orderCount =
            orders.count ?? 0;

        const followupCount =
            followups.count ?? 0;


        const enquiryData =
            enquiries.data || [];

        const quotationData =
            quotations.data || [];


        content.innerHTML = `

            <div class="stats">

                <div class="stat-card">

                    <div class="stat-label">
                        Customers
                    </div>

                    <div class="stat-value">
                        ${customerCount}
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
                        ${productCount}
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
                        ${enquiryCount}
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
                        ${quotationCount}
                    </div>

                    <div class="stat-footer">
                        Total quotations
                    </div>

                </div>

            </div>


            <div class="grid-2">

                <!-- ENQUIRIES -->

                <div class="panel">

                    <div class="panel-header">

                        <h2>
                            Recent Enquiries
                        </h2>

                        <button
                            onclick="showPage('enquiries')"
                        >
                            View all
                        </button>

                    </div>

                    <div class="panel-body">

                        ${
                            enquiryData.length === 0

                            ?

                            `
                            <div class="empty">

                                <div class="empty-icon">
                                    📩
                                </div>

                                No enquiries yet

                            </div>
                            `

                            :

                            `
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

                                        ${
                                            enquiryData
                                                .slice(0, 5)
                                                .map(
                                                    enquiry => `

                                                    <tr>

                                                        <td>
                                                            #${enquiry.id}
                                                        </td>

                                                        <td>
                                                            ${
                                                                enquiry.subject ||
                                                                "-"
                                                            }
                                                        </td>

                                                        <td>
                                                            ${
                                                                enquiry.source ||
                                                                "-"
                                                            }
                                                        </td>

                                                        <td>

                                                            <span class="badge badge-new">

                                                                ${
                                                                    enquiry.status ||
                                                                    "New"
                                                                }

                                                            </span>

                                                        </td>

                                                    </tr>

                                                `
                                                )
                                                .join("")
                                        }

                                    </tbody>

                                </table>

                            </div>
                            `
                        }

                    </div>

                </div>


                <!-- QUOTATIONS -->

                <div class="panel">

                    <div class="panel-header">

                        <h2>
                            Recent Quotations
                        </h2>

                        <button
                            onclick="showPage('quotations')"
                        >
                            View all
                        </button>

                    </div>

                    <div class="panel-body">

                        ${
                            quotationData.length === 0

                            ?

                            `
                            <div class="empty">

                                <div class="empty-icon">
                                    💰
                                </div>

                                No quotations yet

                            </div>
                            `

                            :

                            `
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

                                        ${
                                            quotationData
                                                .slice(0, 5)
                                                .map(
                                                    quote => `

                                                    <tr>

                                                        <td>
                                                            ${
                                                                quote.quotation_number ||
                                                                "-"
                                                            }
                                                        </td>

                                                        <td>

                                                            <span class="badge badge-draft">

                                                                ${
                                                                    quote.status ||
                                                                    "Draft"
                                                                }

                                                            </span>

                                                        </td>

                                                        <td>

                                                            ₹${
                                                                Number(
                                                                    quote.grand_total ||
                                                                    0
                                                                ).toLocaleString(
                                                                    "en-IN"
                                                                )
                                                            }

                                                        </td>

                                                    </tr>

                                                `
                                                )
                                                .join("")
                                        }

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
                                ${orderCount}
                            </div>

                        </div>


                        <div class="stat-card">

                            <div class="stat-label">
                                Follow-ups
                            </div>

                            <div class="stat-value">
                                ${followupCount}
                            </div>

                        </div>

                        <div class="stat-card">

                            <div class="stat-label">
                                Quotation Value
                            </div>

                            <div class="stat-value">
                                ₹${
                                    quotationData
                                        .reduce(
                                            (sum, q) =>
                                                sum +
                                                Number(
                                                    q.grand_total || 0
                                                ),
                                            0
                                        )
                                        .toLocaleString("en-IN")
                                }
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

                        <div class="empty-icon">
                            ⚠️
                        </div>

                        <h3>
                            Unable to load dashboard
                        </h3>

                        <p>
                            ${
                                error.message
                            }
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
        document.getElementById("content");

    content.innerHTML = `
        <div class="loading">
            Loading customers...
        </div>
    `;


    try {

        const result =
            await apiGet("/customers");

        const data =
            result.customers || [];


        content.innerHTML = `

            <div class="page-toolbar">

                <input
                    id="customerSearch"
                    class="search-box"
                    placeholder="Search customers..."
                    oninput="filterCustomers()"
                >

                <button
                    class="primary-button"
                >
                    + Add Customer
                </button>

            </div>


            <div class="panel">

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

                            </tr>

                        </thead>

                        <tbody
                            id="customersTable"
                        >

                            ${
                                data.length === 0

                                ?

                                `
                                <tr>
                                    <td colspan="6">

                                        <div class="empty">

                                            <div class="empty-icon">
                                                👥
                                            </div>

                                            No customers found

                                        </div>

                                    </td>
                                </tr>
                                `

                                :

                                data
                                    .map(
                                        customer => `

                                        <tr>

                                            <td>
                                                <strong>
                                                    ${
                                                        customer.company_name ||
                                                        "-"
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                ${
                                                    customer.contact_person ||
                                                    "-"
                                                }
                                            </td>

                                            <td>
                                                ${
                                                    customer.mobile ||
                                                    "-"
                                                }
                                            </td>

                                            <td>
                                                ${
                                                    customer.city ||
                                                    "-"
                                                }
                                            </td>

                                            <td>
                                                ${
                                                    customer.gst_number ||
                                                    "-"
                                                }
                                            </td>

                                            <td>
                                                ${
                                                    customer.customer_type ||
                                                    "-"
                                                }
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

    } catch (error) {

        console.error(error);

        content.innerHTML = `
            <div class="panel">
                <div class="panel-body">
                    Error loading customers.
                </div>
            </div>
        `;

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

                <button class="primary-button">

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

                                ?

                                `
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

                                :

                                data.map(
                                    product => `

                                    <tr>

                                        <td>
                                            <strong>
                                                ${
                                                    product.product_name ||
                                                    "-"
                                                }
                                            </strong>
                                        </td>

                                        <td>
                                            ${
                                                product.brand ||
                                                "-"
                                            }
                                        </td>

                                        <td>
                                            ${
                                                product.model ||
                                                "-"
                                            }
                                        </td>

                                        <td>

                                            ₹${
                                                Number(
                                                    product.selling_price || 0
                                                ).toLocaleString(
                                                    "en-IN"
                                                )
                                            }

                                        </td>

                                        <td>
                                            ${
                                                product.stock_qty ??
                                                0
                                            }
                                        </td>

                                        <td>
                                            ${
                                                product.unit ||
                                                "Nos"
                                            }
                                        </td>

                                    </tr>

                                `
                                ).join("")
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
                    Error loading products.
                </div>
            </div>
        `;

    }

}


/* =========================================================
   GENERIC SIMPLE TABLE PAGE
========================================================= */

async function renderSimpleTable(
    table,
    title
) {

    const content =
        document.getElementById("content");

    content.innerHTML = `
        <div class="loading">
            Loading ${title}...
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
                                No ${title.toLowerCase()} found
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

                                ${
                                    columns
                                        .map(
                                            column => `
                                            <th>
                                                ${column}
                                            </th>
                                            `
                                        )
                                        .join("")
                                }

                            </tr>

                        </thead>

                        <tbody>

                            ${
                                data
                                    .slice(0, 100)
                                    .map(
                                        row => `

                                        <tr>

                                            ${
                                                columns
                                                    .map(
                                                        column => `

                                                        <td>
                                                            ${
                                                                row[column] ??
                                                                "-"
                                                            }
                                                        </td>

                                                        `
                                                    )
                                                    .join("")
                                            }

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

    } catch (error) {

        console.error(error);

        content.innerHTML = `

            <div class="panel">

                <div class="panel-body">

                    Unable to load ${title}.

                </div>

            </div>

        `;

    }

}


/* =========================================================
   FILTER CUSTOMERS
========================================================= */

function filterCustomers() {

    const search =
        document
            .getElementById("customerSearch")
            .value
            .toLowerCase();

    const rows =
        document.querySelectorAll(
            "#customersTable tr"
        );


    rows.forEach(row => {

        const text =
            row.innerText.toLowerCase();

        row.style.display =
            text.includes(search)
                ? ""
                : "none";

    });

}


/* =========================================================
   PAGE ROUTING
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
        PAGE_INFO[page];

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
