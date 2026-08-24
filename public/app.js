/* ===================================================== MAHALAXMI
ENTERPRISE CRM Stable CRM + Professional Quotation Module
===================================================== */

“use strict”;

const API_BASE = “/api”;

let currentPage = “dashboard”;

let customersCache = []; let productsCache = []; let quotationsCache =
[];

const PAGE_INFO = {

dashboard:{ title:“Dashboard”, subtitle:“Overview of your business
activity” },

customers:{ title:“Customers”, subtitle:“Manage customers” },

products:{ title:“Products”, subtitle:“Manage products” },

enquiries:{ title:“Enquiries”, subtitle:“Manage enquiries” },

quotations:{ title:“Quotations”, subtitle:“Create professional
quotations” },

orders:{ title:“Orders”, subtitle:“Manage orders” },

followups:{ title:“Follow-ups”, subtitle:“Customer follow-ups” },

payments:{ title:“Payments”, subtitle:“Payment tracking” }

};

/* =============================== API ================================
*/

async function apiRequest(url,options={}){

    const response =
    await fetch(API_BASE+url,{

        headers:{
            "Content-Type":"application/json"
        },

        ...options

    });



    let data;


    try{

        data =
        await response.json();

    }
    catch(e){

        throw new Error(
            "Invalid server response"
        );

    }



    if(!response.ok){

        throw new Error(
            data.error ||
            "Request failed"
        );

    }


    return data;

}

function apiGet(url){

    return apiRequest(url);

}

function apiPost(url,data){

    return apiRequest(url,{

        method:"POST",

        body:
        JSON.stringify(data)

    });

}

function apiPut(url,data){

    return apiRequest(url,{

        method:"PUT",

        body:
        JSON.stringify(data)

    });

}

function apiDelete(url){

    return apiRequest(url,{

        method:"DELETE"

    });

}

/* =============================== HELPERS
================================ */

function getContent(){

    return document.getElementById("content");

}

function getRows(result){

    if(Array.isArray(result))
        return result;


    if(result?.data &&
       Array.isArray(result.data))
        return result.data;


    return [];

}

function money(value){

    return Number(value||0)
    .toLocaleString(
        "en-IN",
        {
            style:"currency",
            currency:"INR",
            minimumFractionDigits:2
        }
    );

}

function escapeHtml(value){

    if(value===null ||
       value===undefined)
        return "";


    return String(value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");

}

function showToast(message,type=“success”){

    let toast =
    document.getElementById(
        "crmToast"
    );



    if(!toast){

        toast =
        document.createElement(
            "div"
        );


        toast.id =
        "crmToast";


        document.body.appendChild(toast);

    }



    toast.className =
    "crm-toast "+type;


    toast.innerHTML =
    message;



    setTimeout(()=>{

        toast.className="crm-toast";

    },3000);

}

function updateHeader(page){

    const info =
    PAGE_INFO[page];


    if(!info)
        return;



    document
    .getElementById("pageTitle")
    .innerText =
    info.title;



    document
    .getElementById("pageSubtitle")
    .innerText =
    info.subtitle;

}

function showLoading(){

    getContent().innerHTML = `

    <div class="panel">

        <h3>
        Loading...
        </h3>

    </div>

    `;

}/* ===================================================== DASHBOARD
===================================================== */

async function renderDashboard(){

    const content =
    getContent();


    content.innerHTML = `

    <div class="panel">

    <h3>
    Loading Dashboard...
    </h3>

    </div>

    `;



    try{


        const [
            customers,
            products,
            enquiries,
            quotations
        ] = await Promise.all([

            apiGet("/customers"),
            apiGet("/products"),
            apiGet("/enquiries"),
            apiGet("/quotations")

        ]);



        const customerList =
        getRows(customers);


        const productList =
        getRows(products);


        const enquiryList =
        getRows(enquiries);


        const quotationList =
        getRows(quotations);



        customersCache =
        customerList;


        productsCache =
        productList;



        let quotationValue = 0;


        quotationList.forEach(q=>{

            quotationValue +=
            Number(q.grand_total || 0);

        });




        content.innerHTML = `


        <div class="stats-grid">


        <div class="stat-card">

        <h3>
        Customers
        </h3>

        <strong>
        ${customerList.length}
        </strong>

        </div>



        <div class="stat-card">

        <h3>
        Products
        </h3>

        <strong>
        ${productList.length}
        </strong>

        </div>



        <div class="stat-card">

        <h3>
        Enquiries
        </h3>

        <strong>
        ${enquiryList.length}
        </strong>

        </div>



        <div class="stat-card">

        <h3>
        Quotation Value
        </h3>

        <strong>
        ${money(quotationValue)}
        </strong>

        </div>


        </div>

        `;


    }
    catch(error){


        content.innerHTML = `

        <div class="panel">

        <h3>
        Dashboard Error
        </h3>

        <p>
        ${escapeHtml(error.message)}
        </p>

        </div>

        `;


    }

}

/* ===================================================== CUSTOMERS
===================================================== */

async function renderCustomers(){

    showLoading();



    customersCache =
    getRows(
        await apiGet("/customers")
    );



    getContent().innerHTML = `


    <div class="panel">


    <div class="panel-header">

    <h2>
    Customers
    </h2>


    <button
    class="button-primary"
    onclick="openAddForm('customers')">

    + Add Customer

    </button>


    </div>



    <div id="customerTable">

    </div>



    </div>

    `;


    renderTable(
        customersCache,
        "customerTable"
    );

}

/* ===================================================== PRODUCTS
===================================================== */

async function renderProducts(){

    showLoading();



    productsCache =
    getRows(
        await apiGet("/products")
    );



    getContent().innerHTML = `


    <div class="panel">


    <div class="panel-header">

    <h2>
    Products
    </h2>


    <button
    class="button-primary"
    onclick="openAddForm('products')">

    + Add Product

    </button>


    </div>



    <div id="productTable">

    </div>



    </div>


    `;


    renderTable(
        productsCache,
        "productTable"
    );

}

/* ===================================================== ENQUIRIES
===================================================== */

async function renderEnquiries(){

    showLoading();



    const enquiries =
    getRows(
        await apiGet("/enquiries")
    );



    getContent().innerHTML = `


    <div class="panel">


    <div class="panel-header">


    <h2>
    Enquiries
    </h2>



    <button
    class="button-primary"
    onclick="openAddForm('enquiries')">

    + Add Enquiry

    </button>


    </div>



    <div id="enquiryTable">

    </div>



    </div>


    `;



    renderTable(
        enquiries,
        "enquiryTable"
    );

}

/* ===================================================== TABLE RENDERER
===================================================== */

function renderTable(data,target){

    const box =
    document.getElementById(target);



    if(!box)
        return;



    if(!data.length){


        box.innerHTML =
        "<p>No records found</p>";


        return;

    }




    const columns =
    Object.keys(data[0])
    .slice(0,6);




    box.innerHTML = `


    <table class="crm-table">


    <thead>

    <tr>

    ${
        columns.map(c=>`

        <th>
        ${c.replace("_"," ").toUpperCase()}
        </th>

        `).join("")
    }

    </tr>

    </thead>



    <tbody>


    ${
        data.map(row=>`

        <tr>


        ${
            columns.map(c=>`

            <td>
            ${escapeHtml(row[c])}
            </td>

            `).join("")
        }


        </tr>


        `).join("")
    }



    </tbody>


    </table>


    `;

}

/* ===================================================== ADD FORM
===================================================== */

function openAddForm(type){

let fields = [];

if(type===“customers”){

fields=[

[“company_name”,“Company Name”],

[“contact_person”,“Contact Person”],

[“phone”,“Phone”],

[“email”,“Email”]

];

}

if(type===“products”){

fields=[

[“name”,“Product Name”],

[“description”,“Description”],

[“selling_price”,“Selling Price”]

];

}

if(type===“enquiries”){

fields=[

[“customer_name”,“Customer Name”],

[“phone”,“Phone”],

[“message”,“Message”]

];

}

const html = `

Add ${type}
${

fields.map(f=>`

${f[1]}

`).join(““)

}

Save

`;

getContent().innerHTML = html;

}

async function saveAdd(type){

const body={};

document .querySelectorAll(“[id^=‘add_’]”) .forEach(input=>{

body[ input.id.replace(“add_”,““)]=input.value;

});

await apiPost( “/”+type, body );

showToast( “Saved successfully” );

showPage(type);

}/* ===================================================== PROFESSIONAL
QUOTATION BUILDER =====================================================
*/

let quotationItems = [];

async function renderQuotations(){

    customersCache =
    getRows(
        await apiGet("/customers")
    );


    productsCache =
    getRows(
        await apiGet("/products")
    );



    quotationItems=[];



    getContent().innerHTML = `

Create Quotation

Customer

Select Customer

${ customersCache.map(c=>`

${escapeHtml( c.company_name || c.contact_person || c.name || “Customer”
)}

`).join(““) }

Quotation Date

Valid Until

Items
Product
Qty
Rate
Disc %
Disc ₹
GST %
Total
-   Add Item

Subtotal

₹0.00

Discount

₹0.00

Taxable Amount

₹0.00

GST

₹0.00

Grand Total

₹0.00

Notes

Save Quotation

`;

addQuotationRow();

}

function addQuotationRow(){

quotationItems.push({

product_id:““, description:”“, quantity:1, unit_price:0,
discount_percent:0, discount:0, gst_percent:18, total:0

});

renderQuotationRows();

}

function renderQuotationRows(){

const tbody = document.getElementById( “quotationItems” );

if(!tbody) return;

tbody.innerHTML =

quotationItems.map((item,index)=>`

Select Product

${ productsCache.map(product=>{

const productName =

product.name || product.product_name || product.model || product.title
|| “Product”;

return `

<option

value=“${product.id}”

${item.product_id==product.id?“selected”:““}

${escapeHtml(productName)}

`;

}).join(““) }

${money(item.discount)}

${money(item.total)}

❌

`).join(““);

calculateQuotation();

}

function selectQuotationProduct(index,id){

const product =

productsCache.find( p=>String(p.id)===String(id) );

if(product){

quotationItems[index].product_id = product.id;

quotationItems[index].description =

product.name || product.product_name || product.model || product.title
|| “Product”;

quotationItems[index].unit_price =

Number( product.selling_price || product.price || 0 );

}

renderQuotationRows();

}

function updateQuotationItem(index,field,value){

quotationItems[index][field] = Number(value||0);

calculateQuotation();

}

function removeQuotationItem(index){

quotationItems.splice(index,1);

renderQuotationRows();

}

function calculateQuotation(){

let subtotal=0;

let discount=0;

let gst=0;

quotationItems.forEach(item=>{

let lineTotal =

item.quantity * item.unit_price;

item.discount =

lineTotal * item.discount_percent / 100;

let taxable =

lineTotal - item.discount;

let gstAmount =

taxable * item.gst_percent / 100;

item.total =

taxable + gstAmount;

subtotal += lineTotal;

discount += item.discount;

gst += gstAmount;

});

let taxableAmount =

subtotal - discount;

let grand =

taxableAmount + gst;

document.getElementById(“subtotal”) .innerHTML = money(subtotal);

document.getElementById(“discountTotal”) .innerHTML = money(discount);

document.getElementById(“taxable”) .innerHTML = money(taxableAmount);

document.getElementById(“gstTotal”) .innerHTML = money(gst);

document.getElementById(“grandTotal”) .innerHTML = money(grand);

const rows =

document.querySelectorAll( “#quotationItems tr” );

rows.forEach((row,index)=>{

if(quotationItems[index]){

row.children[4].innerHTML =

money( quotationItems[index].discount );

row.children[6].innerHTML =

money( quotationItems[index].total );

}

});

}

async function saveQuotation(){

const customer =

document.getElementById( “quotationCustomer” ).value;

if(!customer){

showToast( “Select customer first”, “error” );

return;

}

calculateQuotation();

const quotation =

await apiPost( “/quotations”, {

quotation_number:

“QTN-”+Date.now(),

customer_id:

Number(customer),

quotation_date:

document.getElementById( “quotationDate” ).value,

valid_until:

document.getElementById( “quotationValid” ).value,

status:

“Draft”,

subtotal:

Number( document.getElementById(“subtotal”)
.innerText.replace(/[₹,]/g,““) ),

discount:

Number( document.getElementById(“discountTotal”)
.innerText.replace(/[₹,]/g,““) ),

gst_amount:

Number( document.getElementById(“gstTotal”)
.innerText.replace(/[₹,]/g,““) ),

grand_total:

Number( document.getElementById(“grandTotal”)
.innerText.replace(/[₹,]/g,““) ),

notes:

document.getElementById( “quotationNotes” ).value

});

const quotationId =

quotation.id ||

quotation.insertId ||

quotation.data?.id ||

quotation.data?.insertId;

if(!quotationId){

showToast( “Quotation ID not received”, “error” );

return;

}

for(const item of quotationItems){

await apiPost(

/quotations/${quotationId}/items,

{

product_id:item.product_id,

description:item.description,

quantity:item.quantity,

unit_price:item.unit_price,

discount_percent:item.discount_percent,

discount:item.discount,

gst_percent:item.gst_percent,

total:item.total

}

);

}

showToast( “Quotation saved successfully” );

} /* ===================================================== PAGE ROUTING
===================================================== */

async function showPage(page){

    if(!PAGE_INFO[page])
        page="dashboard";



    currentPage = page;



    updateHeader(page);



    document
    .querySelectorAll("[data-page]")
    .forEach(btn=>{


        btn.classList.toggle(
            "active",
            btn.dataset.page===page
        );


    });





    const pages = {


        dashboard:
        renderDashboard,


        customers:
        renderCustomers,


        products:
        renderProducts,


        enquiries:
        renderEnquiries,


        quotations:
        renderQuotations


    };



    if(pages[page]){

        return pages[page]();

    }

}

/* ===================================================== CSS
===================================================== */

function addStyles(){

const style = document.createElement(“style”);

style.innerHTML = `

.stats-grid{

display:grid;

grid-template-columns: repeat(4,1fr);

gap:20px;

margin-bottom:25px;

}

.stat-card{

background:white;

padding:25px;

border-radius:15px;

box-shadow: 0 5px 20px rgba(0,0,0,.08);

}

.stat-card h3{

margin:0;

color:#64748b;

font-size:15px;

}

.stat-card strong{

display:block;

font-size:28px;

margin-top:10px;

}

.panel{

background:white;

padding:25px;

border-radius:15px;

box-shadow: 0 5px 20px rgba(0,0,0,.08);

}

.panel-header{

display:flex;

justify-content:space-between;

align-items:center;

margin-bottom:20px;

}

.crm-table{

width:100%;

border-collapse:collapse;

}

.crm-table th{

background:#2563eb;

color:white;

padding:12px;

text-align:left;

}

.crm-table td{

padding:12px;

border-bottom: 1px solid #e5e7eb;

}

.button-primary{

background:#2563eb;

color:white;

border:none;

padding:12px 20px;

border-radius:8px;

cursor:pointer;

}

.button-primary:hover{

background:#1d4ed8;

}

.quotation-box{

display:flex;

flex-direction:column;

gap:20px;

}

.quotation-box label{

display:flex;

flex-direction:column;

gap:8px;

font-weight:600;

}

.quotation-box input, .quotation-box select, .quotation-box textarea{

padding:10px;

border:

1px solid #d1d5db;

border-radius:8px;

}

.quotation-details{

display:grid;

grid-template-columns:

repeat(2,1fr);

gap:20px;

}

.quote-table{

width:100%;

border-collapse:collapse;

margin-top:20px;

}

.quote-table th{

background:#1d4ed8;

color:white;

padding:12px;

}

.quote-table td{

padding:10px;

border-bottom:

1px solid #e5e7eb;

}

.quote-table input, .quote-table select{

width:100%;

padding:8px;

}

.quotation-summary{

margin-top:25px;

margin-left:auto;

max-width:350px;

background:#f8fafc;

padding:20px;

border-radius:12px;

}

.quotation-summary p{

display:flex;

justify-content:space-between;

}

.quotation-summary h2{

border-top:

2px solid #2563eb;

padding-top:15px;

}

.crm-toast{

position:fixed;

right:25px;

bottom:25px;

padding:15px 20px;

background:#2563eb;

color:white;

border-radius:10px;

z-index:9999;

}

.crm-toast.error{

background:#dc2626;

}

@media(max-width:900px){

.stats-grid{

grid-template-columns:1fr;

}

.quotation-details{

grid-template-columns:1fr;

}

.quote-table{

display:block;

overflow-x:auto;

}

}

`;

document.head.appendChild(style);

}

/* ===================================================== INITIALIZE
===================================================== */

function initialiseApp(){

addStyles();

document .querySelectorAll(“[data-page]”) .forEach(button=>{

button.addEventListener( “click”, ()=>{

showPage( button.dataset.page );

}

);

});

showPage(“dashboard”);

}

document.addEventListener( “DOMContentLoaded”, initialiseApp );
