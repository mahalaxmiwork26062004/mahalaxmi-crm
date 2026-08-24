/* Mahalaxmi Enterprise CRM — Professional Quotation Edition */
"use strict";

const API = "/api";

let currentPage = "dashboard";
let pageRequest = 0;

let customersCache = [];
let productsCache = [];

const PAGE_INFO = {

    dashboard:{
        title:"Dashboard",
        subtitle:"Overview of your business activity"
    },

    customers:{
        title:"Customers",
        subtitle:"Manage your customers"
    },

    enquiries:{
        title:"Enquiries",
        subtitle:"Track customer enquiries"
    },

    products:{
        title:"Products",
        subtitle:"Products and pricing"
    },

    quotations:{
        title:"Quotations",
        subtitle:"Professional quotation builder"
    },

    orders:{
        title:"Orders",
        subtitle:"Manage sales orders"
    },

    followups:{
        title:"Follow-ups",
        subtitle:"Customer follow-ups"
    },

    payments:{
        title:"Payments",
        subtitle:"Track payments"
    }

};



/* ===============================
        API
================================ */


async function apiRequest(endpoint,options={}){

    const response = await fetch(API+endpoint,{
        ...options,
        headers:{
            "Content-Type":"application/json",
            ...(options.headers||{})
        }
    });


    let result;

    try{
        result = await response.json();
    }
    catch{
        throw new Error("Invalid server response");
    }


    if(!response.ok || result.success===false){

        throw new Error(
            result.error ||
            result.message ||
            "Request failed"
        );

    }


    return result;

}


const apiGet =
endpoint =>
apiRequest(endpoint);


const apiPost =
(endpoint,data)=>
apiRequest(endpoint,{
    method:"POST",
    body:JSON.stringify(data)
});


const apiPut =
(endpoint,data)=>
apiRequest(endpoint,{
    method:"PUT",
    body:JSON.stringify(data)
});


const apiDelete =
endpoint =>
apiRequest(endpoint,{
    method:"DELETE"
});





/* ===============================
        HELPERS
================================ */


function getContent(){

    return document.getElementById("content");

}



function rows(result){

    return Array.isArray(result)
    ? result
    : (result.data || []);

}



function escapeHtml(value){

    return value==null
    ? ""
    :
    String(value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

}



function formatCurrency(value){

    return Number(value||0)
    .toLocaleString("en-IN",{

        style:"currency",
        currency:"INR",
        minimumFractionDigits:2

    });

}



function formatDate(value){

    if(!value)
        return "—";


    return new Date(value)
    .toLocaleDateString(
        "en-IN",
        {
            day:"2-digit",
            month:"short",
            year:"numeric"
        }
    );

}



function humanize(value){

    return String(value||"")
    .replace(/_/g," ")
    .replace(/\b\w/g,c=>c.toUpperCase());

}



function notify(message,type="success"){

    let box=document.getElementById("crmToast");


    if(!box){

        box=document.createElement("div");

        box.id="crmToast";

        document.body.appendChild(box);

    }


    box.innerHTML=message;

    box.className=
    "crm-toast show "+type;


    setTimeout(()=>{

        box.className="crm-toast";

    },3000);


}




/* ===============================
        HEADER
================================ */


function updatePageHeader(page){

    const info=PAGE_INFO[page];

    document.getElementById("pageTitle").textContent=
    info.title;


    document.getElementById("pageSubtitle").textContent=
    info.subtitle;

}





/* ===============================
        DASHBOARD
================================ */


async function renderDashboard(){


    const customers =
    rows(await apiGet("/customers"));


    const products =
    rows(await apiGet("/products"));


    const enquiries =
    rows(await apiGet("/enquiries"));


    const quotations =
    rows(await apiGet("/quotations"));



    customersCache=customers;

    productsCache=products;



    const quotationValue =
    quotations.reduce(
        (a,b)=>
        a+Number(b.grand_total||0),
        0
    );



    getContent().innerHTML=`

    <div class="stats">

        <div class="stat-card">
            <h3>Customers</h3>
            <b>${customers.length}</b>
        </div>


        <div class="stat-card">
            <h3>Products</h3>
            <b>${products.length}</b>
        </div>


        <div class="stat-card">
            <h3>Enquiries</h3>
            <b>${enquiries.length}</b>
        </div>


        <div class="stat-card">
            <h3>Quotation Value</h3>
            <b>${formatCurrency(quotationValue)}</b>
        </div>


    </div>

    `;


}





/* ===============================
        SIMPLE MODULES
================================ */


async function renderCustomers(){

    customersCache =
    rows(await apiGet("/customers"));

    renderSimpleTable(
        "customers",
        customersCache
    );

}



async function renderProducts(){

    productsCache =
    rows(await apiGet("/products"));

    renderSimpleTable(
        "products",
        productsCache
    );

}



async function renderEnquiries(){

    const data =
    rows(await apiGet("/enquiries"));

    renderSimpleTable(
        "enquiries",
        data
    );

}





function renderSimpleTable(title,data){


    const content=getContent();


    if(!data.length){

        content.innerHTML=
        "<h3>No records found</h3>";

        return;

    }



    const columns=
    Object.keys(data[0])
    .slice(0,6);



    content.innerHTML=`

    <div class="panel">

    <table>

    <thead>

    <tr>

    ${
        columns.map(
            c=>`<th>${humanize(c)}</th>`
        ).join("")
    }

    </tr>

    </thead>


    <tbody>

    ${
        data.map(row=>`

        <tr>

        ${
            columns.map(
            c=>`<td>${escapeHtml(row[c])}</td>`
            ).join("")
        }

        </tr>

        `).join("")
    }

    </tbody>


    </table>

    </div>

    `;
/* ==========================================
        PROFESSIONAL QUOTATION BUILDER
========================================== */


let quotationItems=[];



async function renderQuotations(){


    customersCache =
    rows(await apiGet("/customers"));


    productsCache =
    rows(await apiGet("/products"));



    quotationItems=[];


    getContent().innerHTML=`


<div class="panel">


<div class="panel-header">

<h2>Create Professional Quotation</h2>

</div>



<div class="panel-body">



<div class="form-grid">


<label>
Customer

<select id="quoteCustomer">

<option value="">
Select Customer
</option>


${
customersCache.map(c=>`

<option value="${c.id}">
${escapeHtml(
c.company_name ||
c.contact_person ||
c.name
)}
</option>

`).join("")
}

</select>

</label>



<label>
Quotation Date

<input 
type="date"
id="quoteDate"
value="${new Date().toISOString().slice(0,10)}">

</label>



<label>
Valid Until

<input
type="date"
id="quoteValid">

</label>



</div>



<hr>


<h3>Items</h3>



<table class="quote-table">


<thead>

<tr>

<th>Product</th>

<th>Qty</th>

<th>Rate</th>

<th>Disc %</th>

<th>Disc ₹</th>

<th>GST %</th>

<th>Total</th>

<th></th>

</tr>

</thead>



<tbody id="quoteItemsBody">

</tbody>


</table>



<button 
class="button-primary"
id="addQuoteItem">

+ Add Product

</button>



<div class="quote-summary">


<p>
Subtotal:
<b id="quoteSubtotal">
₹0.00
</b>
</p>


<p>
Discount:
<b id="quoteDiscount">
₹0.00
</b>
</p>


<p>
Taxable Amount:
<b id="quoteTaxable">
₹0.00
</b>
</p>


<p>
GST:
<b id="quoteGST">
₹0.00
</b>
</p>



<h2>

Grand Total:
<span id="quoteGrandTotal">
₹0.00
</span>

</h2>


</div>



<br>


<label>

Notes

<textarea id="quoteNotes"></textarea>

</label>



<br>


<button
class="button-primary"
id="saveQuotation">

Create Quotation

</button>



</div>

</div>


`;



document
.getElementById("addQuoteItem")
.onclick=addQuotationItem;



document
.getElementById("saveQuotation")
.onclick=saveQuotation;



addQuotationItem();


}





function addQuotationItem(){


quotationItems.push({

product_id:"",
description:"",
quantity:1,
unit_price:0,
discount_percent:0,
discount:0,
gst_percent:18,
total:0

});


renderQuotationRows();


}





function renderQuotationRows(){


const body =
document.getElementById("quoteItemsBody");


body.innerHTML =
quotationItems.map((item,index)=>{


return `


<tr>


<td>


<select
onchange="updateQuoteProduct(${index},this.value)">


<option value="">
Select
</option>


${
productsCache.map(p=>`

<option 
value="${p.id}"
${item.product_id==p.id?"selected":""}>

${escapeHtml(p.name)}

</option>

`).join("")
}


</select>


</td>



<td>

<input

type="number"

value="${item.quantity}"

oninput="updateQuoteField(${index},'quantity',this.value)">

</td>



<td>

<input

type="number"

value="${item.unit_price}"

oninput="updateQuoteField(${index},'unit_price',this.value)">

</td>



<td>

<input

type="number"

value="${item.discount_percent}"

oninput="updateQuoteField(${index},'discount_percent',this.value)">

</td>



<td>

${formatCurrency(item.discount)}

</td>



<td>

<input

type="number"

value="${item.gst_percent}"

oninput="updateQuoteField(${index},'gst_percent',this.value)">

</td>



<td>

${formatCurrency(item.total)}

</td>



<td>

<button
onclick="removeQuoteItem(${index})">

❌

</button>

</td>



</tr>


`;


}).join("");



calculateQuotation();



}





function updateQuoteProduct(index,id){


const product =
productsCache.find(
p=>p.id==id
);


if(product){

quotationItems[index].product_id=id;

quotationItems[index].unit_price =
Number(
product.selling_price || 0
);

quotationItems[index].description =
product.name;

}


renderQuotationRows();


}




function updateQuoteField(index,field,value){


quotationItems[index][field]
=
Number(value||0);


calculateQuotation();


}





function removeQuoteItem(index){

quotationItems.splice(index,1);

renderQuotationRows();

}




function calculateQuotation(){


let subtotal=0;

let discount=0;

let gst=0;



quotationItems.forEach(item=>{


let lineSubtotal =
item.quantity *
item.unit_price;



item.discount =
lineSubtotal *
item.discount_percent /
100;



let taxable =
lineSubtotal -
item.discount;



let gstAmount =
taxable *
item.gst_percent /
100;



item.total =
taxable +
gstAmount;



subtotal += lineSubtotal;

discount += item.discount;

gst += gstAmount;



});



let taxable =
subtotal-discount;



let grand =
taxable+gst;



document.getElementById("quoteSubtotal")
.innerHTML=formatCurrency(subtotal);



document.getElementById("quoteDiscount")
.innerHTML=formatCurrency(discount);



document.getElementById("quoteTaxable")
.innerHTML=formatCurrency(taxable);



document.getElementById("quoteGST")
.innerHTML=formatCurrency(gst);



document.getElementById("quoteGrandTotal")
.innerHTML=formatCurrency(grand);



quotationItems.forEach((x,i)=>{

const row=
document.querySelectorAll("#quoteItemsBody tr")[i];


if(row){

row.children[4].innerHTML=
formatCurrency(x.discount);


row.children[6].innerHTML=
formatCurrency(x.total);

}


});


}





async function saveQuotation(){


const customer =
document.getElementById("quoteCustomer").value;


if(!customer){

notify("Select customer","error");

return;

}



let subtotal=0;
let discount=0;
let gst=0;


quotationItems.forEach(i=>{

subtotal += i.quantity*i.unit_price;

discount += i.discount;

gst +=
(i.quantity*i.unit_price-i.discount)
*
i.gst_percent/100;

});



let grand =
subtotal-discount+gst;



const quotation = await apiPost(
"/quotations",
{


quotation_number:
"QTN-"+Date.now(),


customer_id:
Number(customer),


quotation_date:
document.getElementById("quoteDate").value,


valid_until:
document.getElementById("quoteValid").value,


status:
"Draft",


subtotal,


discount,


gst_amount:
gst,


grand_total:
grand,


notes:
document.getElementById("quoteNotes").value


});



const quotationId =
quotation.id ||
quotation.data?.id;



for(const item of quotationItems){


await apiPost(
`/quotations/${quotationId}/items`,
{


product_id:item.product_id,

description:item.description,

quantity:item.quantity,

unit_price:item.unit_price,

discount:item.discount,

discount_percent:item.discount_percent,

gst_percent:item.gst_percent,

total:item.total


});


}



notify("Quotation created successfully");


showPage("quotations");


}
/* ==========================================
        PAGE ROUTING
========================================== */


async function showPage(page){


    if(!PAGE_INFO[page])
        page="dashboard";


    currentPage=page;


    updatePageHeader(page);


    document
    .querySelectorAll("[data-page]")
    .forEach(btn=>{

        btn.classList.toggle(
            "active",
            btn.dataset.page===page
        );

    });



    const renderer={


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


    }[page];



    if(renderer)
        return renderer();



}





function pageFromNavigation(element){


    if(element.dataset.page)
        return element.dataset.page;


    return null;

}






/* ==========================================
        EXTRA CSS
========================================== */


function addQuotationStyles(){


const style=document.createElement("style");


style.innerHTML=`


.quote-table{

width:100%;
border-collapse:collapse;
margin-top:20px;

}



.quote-table th{

background:#2563eb;
color:white;
padding:12px;
text-align:left;

}



.quote-table td{

border-bottom:1px solid #ddd;
padding:10px;

}



.quote-table input,
.quote-table select{

width:100%;
padding:8px;
border:1px solid #ddd;
border-radius:6px;

}



.quote-summary{

margin-left:auto;
margin-top:25px;
width:350px;
background:#f8fafc;
padding:20px;
border-radius:12px;

}



.quote-summary p{

display:flex;
justify-content:space-between;

}



.quote-summary h2{

border-top:2px solid #2563eb;
padding-top:15px;

}



.panel{

background:white;
border-radius:14px;
padding:20px;
box-shadow:
0 5px 20px rgba(0,0,0,.08);

}



.panel-header{

display:flex;
justify-content:space-between;
align-items:center;

}



.form-grid{

display:grid;
grid-template-columns:
repeat(3,1fr);
gap:20px;

}



.form-grid label{

display:flex;
flex-direction:column;
gap:8px;
font-weight:600;

}



.form-grid input,
.form-grid select,
.form-grid textarea{

padding:10px;
border:1px solid #ddd;
border-radius:8px;

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



.crm-toast{

position:fixed;
right:20px;
bottom:20px;
padding:15px 20px;
background:#2563eb;
color:white;
border-radius:8px;
z-index:9999;

}


.crm-toast.error{

background:#dc2626;

}



.stats{

display:grid;
grid-template-columns:
repeat(4,1fr);
gap:20px;

}



.stat-card{

background:white;
padding:20px;
border-radius:12px;
box-shadow:
0 4px 15px rgba(0,0,0,.08);

}



@media(max-width:900px){


.form-grid,
.stats{

grid-template-columns:1fr;

}


.quote-summary{

width:auto;

}


}



`;


document.head.appendChild(style);


}






/* ==========================================
        INITIALIZE
========================================== */


function initialiseApp(){


addQuotationStyles();



document
.querySelectorAll("[data-page]")
.forEach(btn=>{


btn.addEventListener(
"click",
()=>showPage(btn.dataset.page)
);


});



showPage("dashboard");


}



document
.addEventListener(
"DOMContentLoaded",
initialiseApp
);
}
