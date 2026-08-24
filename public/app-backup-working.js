/* =====================================================
   MAHALAXMI ENTERPRISE CRM
   Professional Quotation Builder Edition
===================================================== */

"use strict";


/* =====================================================
   CONFIG
===================================================== */


const API_BASE = "/api";


let currentPage = "dashboard";


let customersCache = [];
let productsCache = [];
let quotationsCache = [];





/* =====================================================
   PAGE CONFIG
===================================================== */


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
        subtitle:"Manage products"
    },


    quotations:{
        title:"Quotations",
        subtitle:"Create professional quotations"
    },


    orders:{
        title:"Orders",
        subtitle:"Manage orders"
    },


    followups:{
        title:"Follow-ups",
        subtitle:"Customer follow-up activities"
    },


    payments:{
        title:"Payments",
        subtitle:"Track payments"
    }


};





/* =====================================================
   API FUNCTIONS
===================================================== */


async function apiRequest(url, options={}){


    const response =
    await fetch(API_BASE + url, {


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
            "Server response error"
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





async function apiGet(url){

    return apiRequest(url);

}





async function apiPost(url,data){


    return apiRequest(url,{

        method:"POST",

        body:
        JSON.stringify(data)

    });


}





async function apiPut(url,data){


    return apiRequest(url,{

        method:"PUT",

        body:
        JSON.stringify(data)

    });


}





async function apiDelete(url){


    return apiRequest(url,{

        method:"DELETE"

    });


}





/* =====================================================
   HELPERS
===================================================== */


function getContent(){

    return document.getElementById("content");

}





function getRows(result){


    if(Array.isArray(result))
        return result;


    if(result && Array.isArray(result.data))
        return result.data;


    return [];

}





function money(value){


    return Number(value || 0)
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


    if(value===null || value===undefined)
        return "";


    return String(value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");


}





function formatDate(value){


    if(!value)
        return "-";


    return new Date(value)
    .toLocaleDateString(
        "en-IN"
    );


}





function showToast(message,type="success"){


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


        document.body.appendChild(
            toast
        );


    }



    toast.className =
    "crm-toast "+type;



    toast.innerHTML =
    message;



    setTimeout(()=>{

        toast.className =
        "crm-toast";

    },3000);



}





/* =====================================================
   HEADER UPDATE
===================================================== */


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





/* =====================================================
   LOADING SCREEN
===================================================== */


function showLoading(){


    getContent().innerHTML = `

    <div class="panel">

        <h3>
        Loading...
        </h3>

    </div>

    `;


}
/* =====================================================
   DASHBOARD
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


        const result =
        await Promise.all([

            apiGet("/customers"),

            apiGet("/products"),

            apiGet("/enquiries"),

            apiGet("/quotations")

        ]);



        const customers =
        getRows(result[0]);


        const products =
        getRows(result[1]);


        const enquiries =
        getRows(result[2]);


        const quotations =
        getRows(result[3]);



        customersCache =
        customers;


        productsCache =
        products;


        quotationsCache =
        quotations;



        const totalQuotation =
        quotations.reduce(
            (sum,item)=>
            sum+
            Number(
                item.grand_total || 0
            ),
            0
        );




        content.innerHTML = `


        <div class="stats-grid">


            <div class="stat-card">

                <h3>
                Customers
                </h3>

                <strong>
                ${customers.length}
                </strong>

            </div>




            <div class="stat-card">

                <h3>
                Products
                </h3>

                <strong>
                ${products.length}
                </strong>

            </div>




            <div class="stat-card">

                <h3>
                Enquiries
                </h3>

                <strong>
                ${enquiries.length}
                </strong>

            </div>




            <div class="stat-card">

                <h3>
                Quotation Value
                </h3>

                <strong>
                ${money(totalQuotation)}
                </strong>

            </div>


        </div>


        `;



    }
    catch(error){


        console.error(error);


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







/* =====================================================
   CUSTOMERS
===================================================== */


async function renderCustomers(){


    showLoading();



    const result =
    await apiGet("/customers");



    customersCache =
    getRows(result);



    renderTable(
        customersCache,
        "Customers"
    );


}







/* =====================================================
   PRODUCTS
===================================================== */


async function renderProducts(){


    showLoading();



    const result =
    await apiGet("/products");



    productsCache =
    getRows(result);



    renderTable(
        productsCache,
        "Products"
    );


}








/* =====================================================
   ENQUIRIES
===================================================== */


async function renderEnquiries(){


    showLoading();



    const result =
    await apiGet("/enquiries");



    const data =
    getRows(result);



    renderTable(
        data,
        "Enquiries"
    );


}









/* =====================================================
   GENERIC TABLE
===================================================== */


function renderTable(data,title){



    if(!data.length){


        getContent().innerHTML = `


        <div class="panel">

            <h3>
            No ${title} found
            </h3>

        </div>


        `;


        return;


    }




    const columns =
    Object.keys(data[0])
    .slice(0,7);





    getContent().innerHTML = `



    <div class="panel">


    <div class="panel-header">

        <h2>
        ${title}
        </h2>


    </div>





    <table class="crm-table">


    <thead>

    <tr>

    ${
        columns.map(col=>`

        <th>
        ${col.replace("_"," ").toUpperCase()}
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
            columns.map(col=>`

            <td>
            ${escapeHtml(row[col])}
            </td>

            `).join("")
        }


        </tr>


        `).join("")
    }



    </tbody>


    </table>


    </div>


    `;


}
/* =====================================================
   PROFESSIONAL QUOTATION BUILDER
===================================================== */


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


<div class="panel">


<div class="panel-header">

<h2>
Create Quotation
</h2>

</div>



<div class="quotation-box">



<label>
Customer

<select id="quotationCustomer">

<option value="">
Select Customer
</option>


${
customersCache.map(customer=>`

<option value="${customer.id}">

${escapeHtml(
customer.company_name ||
customer.contact_person ||
customer.name
)}

</option>

`).join("")
}


</select>

</label>




<div class="quotation-details">


<label>

Quotation Date

<input
type="date"
id="quotationDate"
value="${new Date().toISOString().slice(0,10)}">

</label>



<label>

Valid Until

<input
type="date"
id="quotationValid">

</label>



</div>




<h3>
Products
</h3>



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



<tbody id="quotationItems">

</tbody>


</table>



<button
class="button-primary"
onclick="addQuotationRow()">

+ Add Item

</button>





<div class="quotation-summary">


<p>

Subtotal

<span id="subtotal">
₹0.00
</span>

</p>



<p>

Discount

<span id="discountTotal">
₹0.00
</span>

</p>




<p>

Taxable Amount

<span id="taxable">
₹0.00
</span>

</p>




<p>

GST

<span id="gstTotal">
₹0.00
</span>

</p>



<h2>

Grand Total

<span id="grandTotal">
₹0.00
</span>

</h2>



</div>



<label>

Notes

<textarea id="quotationNotes"></textarea>

</label>




<button
class="button-primary"
onclick="saveQuotation()">

Save Quotation

</button>



</div>


</div>


`;



addQuotationRow();


}







function addQuotationRow(){



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



drawQuotationRows();


}







function drawQuotationRows(){


const tbody =
document.getElementById(
"quotationItems"
);



tbody.innerHTML = quotationItems.map(
(item,index)=>`


<tr>


<td>


<select
onchange="selectQuotationProduct(${index},this.value)">


<option value="">
Select
</option>


${
productsCache.map(product=>`

<option

value="${product.id}"

${item.product_id==product.id?"selected":""}

>

${escapeHtml(product.name)}

</option>

`).join("")
}


</select>


</td>




<td>

<input

type="number"

value="${item.quantity}"

oninput="updateQuotationItem(${index},'quantity',this.value)">

</td>





<td>

<input

type="number"

value="${item.unit_price}"

oninput="updateQuotationItem(${index},'unit_price',this.value)">

</td>





<td>

<input

type="number"

value="${item.discount_percent}"

oninput="updateQuotationItem(${index},'discount_percent',this.value)">

</td>





<td>

${money(item.discount)}

</td>





<td>

<input

type="number"

value="${item.gst_percent}"

oninput="updateQuotationItem(${index},'gst_percent',this.value)">

</td>





<td>

${money(item.total)}

</td>





<td>

<button

onclick="removeQuotationItem(${index})">

❌

</button>


</td>



</tr>


`
).join("");



calculateQuotation();


}








function selectQuotationProduct(index,id){



const product =
productsCache.find(
p=>String(p.id)===String(id)
);



if(product){


quotationItems[index].product_id =
product.id;


quotationItems[index].description =
product.name;


quotationItems[index].unit_price =
Number(
product.selling_price || 0
);


}



drawQuotationRows();



}







function updateQuotationItem(index,field,value){


quotationItems[index][field] =
Number(value || 0);



calculateQuotation();



}







function removeQuotationItem(index){


quotationItems.splice(index,1);


drawQuotationRows();


}








function calculateQuotation(){


let subtotal=0;

let discount=0;

let gst=0;



quotationItems.forEach(item=>{


const line =
item.quantity *
item.unit_price;



item.discount =
line *
item.discount_percent /
100;



const taxable =
line -
item.discount;



const gstAmount =
taxable *
item.gst_percent /
100;



item.total =
taxable +
gstAmount;



subtotal += line;

discount += item.discount;

gst += gstAmount;


});



const taxableAmount =
subtotal-discount;


const grand =
taxableAmount+gst;



document.getElementById("subtotal").innerHTML =
money(subtotal);



document.getElementById("discountTotal").innerHTML =
money(discount);



document.getElementById("taxable").innerHTML =
money(taxableAmount);



document.getElementById("gstTotal").innerHTML =
money(gst);



document.getElementById("grandTotal").innerHTML =
money(grand);



drawQuotationRowsOnly();



}






function drawQuotationRowsOnly(){


const rows =
document.querySelectorAll(
"#quotationItems tr"
);



rows.forEach((row,index)=>{


if(quotationItems[index]){


row.children[4].innerHTML =
money(
quotationItems[index].discount
);



row.children[6].innerHTML =
money(
quotationItems[index].total
);



}


});


}









async function saveQuotation(){



const customer =
document.getElementById(
"quotationCustomer"
).value;



if(!customer){

showToast(
"Please select customer",
"error"
);

return;

}



calculateQuotation();



const subtotal =
Number(
document.getElementById("subtotal")
.innerText.replace(/[₹,]/g,"")
);



const discount =
Number(
document.getElementById("discountTotal")
.innerText.replace(/[₹,]/g,"")
);



const gst =
Number(
document.getElementById("gstTotal")
.innerText.replace(/[₹,]/g,"")
);



const grand =
Number(
document.getElementById("grandTotal")
.innerText.replace(/[₹,]/g,"")
);




const quotation =
await apiPost(
"/quotations",
{

quotation_number:
"QTN-"+Date.now(),


customer_id:
Number(customer),


quotation_date:
document.getElementById("quotationDate").value,


valid_until:
document.getElementById("quotationValid").value,


status:
"Draft",


subtotal,

discount,

gst_amount:gst,


grand_total:grand,


notes:
document.getElementById("quotationNotes").value


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

discount_percent:item.discount_percent,

discount:item.discount,

gst_percent:item.gst_percent,

total:item.total


});


}



showToast(
"Quotation created successfully"
);



showPage("quotations");


}
/* =====================================================
   PAGE ROUTING
===================================================== */


async function showPage(page){


    if(!PAGE_INFO[page])
        page="dashboard";



    currentPage=page;


    updateHeader(page);



    document
    .querySelectorAll("[data-page]")
    .forEach(btn=>{


        btn.classList.toggle(
            "active",
            btn.dataset.page===page
        );


    });




    const pages={


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





/* =====================================================
   CSS
===================================================== */


function addStyles(){



const style=document.createElement("style");



style.innerHTML=`


.stats-grid{

display:grid;
grid-template-columns:
repeat(4,1fr);
gap:20px;
margin-bottom:25px;

}



.stat-card{

background:#fff;
padding:25px;
border-radius:15px;
box-shadow:
0 5px 20px rgba(0,0,0,.08);

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
color:#1e293b;

}





.panel{

background:#fff;
padding:25px;
border-radius:15px;
box-shadow:
0 5px 20px rgba(0,0,0,.08);

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
border-bottom:
1px solid #e5e7eb;

}





.quotation-box{

display:flex;
flex-direction:column;
gap:20px;

}



.quotation-box label{

font-weight:600;
display:flex;
flex-direction:column;
gap:8px;

}



.quotation-box input,
.quotation-box select,
.quotation-box textarea{


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



.quote-table input,
.quote-table select{

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
right:25px;
bottom:25px;
padding:15px 20px;
background:#2563eb;
color:white;
border-radius:10px;
z-index:9999;
display:block;

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






/* =====================================================
   INITIALIZE
===================================================== */


function initialiseApp(){



addStyles();



document
.querySelectorAll("[data-page]")
.forEach(button=>{


button.addEventListener(
"click",
()=>{

showPage(
button.dataset.page
);

}
);



});



showPage("dashboard");



}





document.addEventListener(
"DOMContentLoaded",
initialiseApp
);
