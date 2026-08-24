/*
=====================================================
MAHALAXMI ENTERPRISE CRM
Stable CRM Application
Part 1 : Core + API + Helpers + Dashboard
=====================================================
*/

"use strict";


const API_BASE = "/api";


let currentPage = "dashboard";

let customersCache = [];

let productsCache = [];

let enquiriesCache = [];

let quotationItems = [];



const PAGE_INFO = {


    dashboard:{
        title:"Dashboard",
        subtitle:"Overview of your business activity"
    },


    customers:{
        title:"Customers",
        subtitle:"Manage customers"
    },


    products:{
        title:"Products",
        subtitle:"Manage products"
    },


    enquiries:{
        title:"Enquiries",
        subtitle:"Manage enquiries"
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
        subtitle:"Customer follow-ups"
    },


    payments:{
        title:"Payments",
        subtitle:"Payment tracking"
    }


};



/*
=====================================================
API
=====================================================
*/


async function apiRequest(url, options={}){


    const response = await fetch(API_BASE + url, {


        headers:{


            "Content-Type":"application/json"


        },


        ...options


    });



    let data;


    try{


        data = await response.json();


    }
    catch(error){


        throw new Error(
            "Invalid server response"
        );


    }



    if(!response.ok){


        throw new Error(
            data.error || "Request failed"
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


        body:JSON.stringify(data)


    });


}




function apiPut(url,data){


    return apiRequest(url,{


        method:"PUT",


        body:JSON.stringify(data)


    });


}





function apiDelete(url){


    return apiRequest(url,{


        method:"DELETE"


    });


}




/*
=====================================================
HELPERS
=====================================================
*/


function getContent(){


    return document.getElementById("content");


}




function getRows(data){


    if(Array.isArray(data))
        return data;



    if(data && Array.isArray(data.data))
        return data.data;



    return [];


}




function money(value){


    return Number(value || 0)
    .toLocaleString(
        "en-IN",
        {

            style:"currency",

            currency:"INR"

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





function showToast(message,type="success"){


    let toast =
    document.getElementById("crmToast");



    if(!toast){


        toast=document.createElement("div");

        toast.id="crmToast";

        document.body.appendChild(toast);


    }



    toast.className="crm-toast "+type;


    toast.innerHTML=message;



    setTimeout(()=>{


        toast.className="crm-toast";


    },3000);



}





function updateHeader(page){


    const info = PAGE_INFO[page];


    if(!info)
        return;



    document.getElementById("pageTitle")
    .innerText = info.title;



    document.getElementById("pageSubtitle")
    .innerText = info.subtitle;


}




function showLoading(){


    getContent().innerHTML=`

        <div class="panel">

            <h3>
            Loading CRM...
            </h3>

        </div>

    `;


}





/*
=====================================================
DASHBOARD
=====================================================
*/


async function renderDashboard(){


    const content=getContent();



    content.innerHTML=`

        <div class="panel">

            <h3>
            Loading Dashboard...
            </h3>

        </div>

    `;



    try{


        const results =
        await Promise.all([


            apiGet("/customers"),

            apiGet("/products"),

            apiGet("/enquiries"),

            apiGet("/quotations")


        ]);



        customersCache=getRows(results[0]);

        productsCache=getRows(results[1]);

        enquiriesCache=getRows(results[2]);



        let quotationTotal=0;



        getRows(results[3])
        .forEach(q=>{


            quotationTotal +=
            Number(q.grand_total || 0);


        });




        content.innerHTML=`

        <div class="stats-grid">


            <div class="stat-card">

                <h3>
                Customers
                </h3>

                <strong>
                ${customersCache.length}
                </strong>

            </div>



            <div class="stat-card">

                <h3>
                Products
                </h3>

                <strong>
                ${productsCache.length}
                </strong>

            </div>




            <div class="stat-card">

                <h3>
                Enquiries
                </h3>

                <strong>
                ${enquiriesCache.length}
                </strong>

            </div>




            <div class="stat-card">

                <h3>
                Quotation Value
                </h3>

                <strong>
                ${money(quotationTotal)}
                </strong>

            </div>


        </div>


        `;



    }
    catch(error){


        content.innerHTML=`

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
/*
=====================================================
CUSTOMERS
=====================================================
*/


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



        <div id="customerTable"></div>


    </div>


    `;



    renderTable(
        customersCache,
        "customerTable"
    );


}





/*
=====================================================
PRODUCTS
=====================================================
*/


async function renderProducts(){


    showLoading();



    productsCache =
    getRows(
        await apiGet("/products")
    );



    getContent().innerHTML=`


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



        <div id="productTable"></div>



    </div>


    `;



    renderTable(
        productsCache,
        "productTable"
    );


}





/*
=====================================================
ENQUIRIES
=====================================================
*/


async function renderEnquiries(){


    showLoading();



    enquiriesCache =
    getRows(
        await apiGet("/enquiries")
    );



    getContent().innerHTML=`


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



        <div id="enquiryTable"></div>



    </div>


    `;



    renderTable(
        enquiriesCache,
        "enquiryTable"
    );



}





/*
=====================================================
TABLE RENDERER
=====================================================
*/


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




    box.innerHTML=`


    <table class="crm-table">


        <thead>

            <tr>

            ${
                columns.map(col=>`

                <th>
                ${col.replaceAll("_"," ").toUpperCase()}
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


    `;



}





/*
=====================================================
ADD FORM
=====================================================
*/


function openAddForm(type){



    let fields=[];



    if(type==="customers"){


        fields=[

            ["company_name","Company Name"],

            ["contact_person","Contact Person"],

            ["phone","Phone"],

            ["email","Email"]

        ];


    }





    if(type==="products"){


        fields=[

            ["name","Product Name"],

            ["description","Description"],

            ["selling_price","Selling Price"]

        ];


    }





    if(type==="enquiries"){


        fields=[

            ["customer_name","Customer Name"],

            ["phone","Phone"],

            ["message","Message"]

        ];


    }





    getContent().innerHTML=`



    <div class="panel">


        <h2>
        Add ${type}
        </h2>



        <div class="form-grid">


        ${
            fields.map(field=>`

            <label>


                ${field[1]}


                <input

                id="add_${field[0]}"

                type="text"

                >


            </label>


            `).join("")
        }


        </div>



        <br>


        <button

        class="button-primary"

        onclick="saveAdd('${type}')">


        Save


        </button>



    </div>


    `;


}





async function saveAdd(type){



    const body={};



    document
    .querySelectorAll("[id^='add_']")
    .forEach(input=>{


        body[
            input.id.replace("add_","")
        ] = input.value;


    });



    try{


        await apiPost(
            "/"+type,
            body
        );



        showToast(
            "Saved successfully"
        );



        showPage(type);



    }
    catch(error){


        showToast(
            error.message,
            "error"
        );


    }



}
/*
=====================================================
QUOTATION BUILDER
=====================================================
*/


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



    getContent().innerHTML=`


<div class="panel">


<div class="panel-header">

<h2>
Create Quotation
</h2>


</div>



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
customer.name ||
"Customer"
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

value="${new Date()
.toISOString()
.slice(0,10)}"

>

</label>




<label>

Valid Until

<input

type="date"

id="quotationValid"

>

</label>


</div>




<h3>
Items
</h3>




<table class="quote-table">


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
GST %
</th>

<th>
Total
</th>

<th>
Action
</th>


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
₹0
</span>

</p>




<p>

Discount

<span id="discountTotal">
₹0
</span>

</p>




<p>

Taxable

<span id="taxable">
₹0
</span>

</p>




<p>

GST

<span id="gstTotal">
₹0
</span>

</p>




<h2>

Grand Total

<span id="grandTotal">
₹0
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



    renderQuotationRows();


}









function renderQuotationRows(){


const tbody =
document.getElementById(
"quotationItems"
);



if(!tbody)
return;




tbody.innerHTML =


quotationItems.map((item,index)=>`



<tr>



<td>


<select

onchange="
selectQuotationProduct(${index},this.value)
">


<option value="">

Select Product

</option>



${
productsCache.map(product=>{


const productName =

product.name ||
product.product_name ||
product.model ||
product.title ||
"Product";



return `

<option

value="${product.id}"

${item.product_id==product.id?"selected":""}

>

${escapeHtml(productName)}

</option>

`;



}).join("")
}


</select>


</td>




<td>

<input

type="number"

value="${item.quantity}"

oninput="
updateQuotationItem(${index},
'quantity',
this.value)
"

>


</td>




<td>

<input

type="number"

value="${item.unit_price}"

oninput="
updateQuotationItem(${index},
'unit_price',
this.value)
"

>


</td>




<td>

<input

type="number"

value="${item.discount_percent}"

oninput="
updateQuotationItem(${index},
'discount_percent',
this.value)
"

>


</td>




<td>

${money(item.discount)}

</td>




<td>

<input

type="number"

value="${item.gst_percent}"

oninput="
updateQuotationItem(${index},
'gst_percent',
this.value)
"

>


</td>




<td>

${money(item.total)}

</td>




<td>


<button

onclick="
removeQuotationItem(${index})
">

❌

</button>


</td>



</tr>


`).join("");



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

product.name ||
product.product_name ||
product.model ||
product.title ||
"Product";



quotationItems[index].unit_price =

Number(
product.selling_price ||
product.price ||
0
);


}



renderQuotationRows();


}









function updateQuotationItem(index,field,value){


quotationItems[index][field] =
Number(value || 0);



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


const amount =

item.quantity *
item.unit_price;



item.discount =

amount *
item.discount_percent /
100;



const taxable =

amount -
item.discount;



const gstAmount =

taxable *
item.gst_percent /
100;



item.total =

taxable +
gstAmount;



subtotal += amount;

discount += item.discount;

gst += gstAmount;



});




const taxableAmount =
subtotal-discount;



const grand =
taxableAmount+gst;




document.getElementById("subtotal")
.innerHTML =
money(subtotal);



document.getElementById("discountTotal")
.innerHTML =
money(discount);



document.getElementById("taxable")
.innerHTML =
money(taxableAmount);



document.getElementById("gstTotal")
.innerHTML =
money(gst);



document.getElementById("grandTotal")
.innerHTML =
money(grand);



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



const quotation =

await apiPost(

"/quotations",

{


quotation_number:

"QTN-"+Date.now(),


customer_id:

Number(customer),


quotation_date:

document.getElementById(
"quotationDate"
).value,


valid_until:

document.getElementById(
"quotationValid"
).value,


status:"Draft",


subtotal:

Number(
document
.getElementById("subtotal")
.innerText
.replace(/[₹,]/g,"")
),



discount:

Number(
document
.getElementById("discountTotal")
.innerText
.replace(/[₹,]/g,"")
),



gst_amount:

Number(
document
.getElementById("gstTotal")
.innerText
.replace(/[₹,]/g,"")
),



grand_total:

Number(
document
.getElementById("grandTotal")
.innerText
.replace(/[₹,]/g,"")
),



notes:

document.getElementById(
"quotationNotes"
).value


}


);



const quotationId =

quotation.id ||

quotation.insertId ||

quotation.data?.id ||

quotation.data?.insertId;




if(!quotationId){


showToast(
"Quotation ID missing",
"error"
);


return;


}






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


}


);


}





showQuotationSuccess(
quotationId
);



}







function showQuotationSuccess(id){


getContent().innerHTML=`


<div class="panel quotation-success">


<h1>
✅ Quotation Saved
</h1>



<p>

Quotation No:

<b>
QTN-${id}
</b>

</p>




<button

class="button-primary"

onclick="renderQuotations()">

➕ Create New Quotation

</button>


</div>


`;



}
/*
=====================================================
PAGE ROUTING
=====================================================
*/


async function showPage(page){


    if(!PAGE_INFO[page]){

        page="dashboard";

    }



    currentPage = page;



    updateHeader(page);




    document
    .querySelectorAll("[data-page]")
    .forEach(button=>{


        button.classList.toggle(

            "active",

            button.dataset.page===page

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







/*
=====================================================
CSS
=====================================================
*/


function addStyles(){



const style =
document.createElement("style");



style.innerHTML = `


.stats-grid{


display:grid;

grid-template-columns:

repeat(4,1fr);

gap:20px;

margin-bottom:25px;


}





.stat-card{


background:white;

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


}





.panel{


background:white;

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





.button-secondary{


background:white;

color:#2563eb;

border:1px solid #2563eb;

padding:12px 20px;

border-radius:8px;

cursor:pointer;


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





.form-grid input{


padding:10px;

border:

1px solid #ddd;

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


background:#2563eb;

color:white;

padding:12px;


}





.quote-table td{


padding:10px;

border-bottom:

1px solid #ddd;


}





.quote-table input,

.quote-table select{


width:100%;

padding:8px;

border:

1px solid #ddd;

border-radius:6px;


}





.quotation-summary{


margin-left:auto;

margin-top:25px;

max-width:350px;

background:#f8fafc;

padding:20px;

border-radius:12px;


}





.quotation-summary p{


display:flex;

justify-content:space-between;


}





.quotation-success{


text-align:center;

padding:50px;


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



.form-grid{


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









/*
=====================================================
INITIALIZE
=====================================================
*/


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
}
