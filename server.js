const express = require("express");
const mysql = require("mysql2/promise");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

/* =========================
   DATABASE CONNECTION
========================= */

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/* =========================
   ALLOWED CRM TABLES
========================= */

const ALLOWED_TABLES = [
  "customers",
  "enquiries",
  "enquiry_items",
  "followups",
  "orders",
  "order_items",
  "payments",
  "products",
  "quotations",
  "quotation_items",
  "users"
];

/* =========================
   DATABASE HEALTH
========================= */

app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");

    res.json({
      success: true,
      message: "Mahalaxmi CRM is running",
      database: "connected"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message
    });
  }
});

/* =========================
   GET CUSTOMERS
========================= */

app.get("/api/customers", async (req, res) => {

  try {

    const [rows] = await db.query(
      "SELECT * FROM customers ORDER BY id DESC"
    );

    res.json({
      success: true,
      count: rows.length,
      customers: rows
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch customers",
      error: error.message
    });
  }
});

/* =========================
   GET SINGLE CUSTOMER
========================= */

app.get("/api/customers/:id", async (req, res) => {

  try {

    const [rows] = await db.query(
      "SELECT * FROM customers WHERE id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {

      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });

    }

    res.json({
      success: true,
      customer: rows[0]
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch customer",
      error: error.message
    });
  }
});

/* =========================
   CREATE CUSTOMER
========================= */

app.post("/api/customers", async (req, res) => {

  try {

    const data = req.body;

    if (!data || Object.keys(data).length === 0) {

      return res.status(400).json({
        success: false,
        message: "Customer data is required"
      });

    }

    const columns = Object.keys(data);

    const values = Object.values(data);

    const placeholders = columns.map(() => "?").join(", ");

    const columnNames = columns
      .map(column => `\`${column}\``)
      .join(", ");

    const sql = `
      INSERT INTO customers
      (${columnNames})
      VALUES
      (${placeholders})
    `;

    const [result] = await db.query(sql, values);

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      customer_id: result.insertId
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to create customer",
      error: error.message
    });
  }
});

/* =========================
   UPDATE CUSTOMER
========================= */

app.put("/api/customers/:id", async (req, res) => {

  try {

    const data = req.body;

    if (!data || Object.keys(data).length === 0) {

      return res.status(400).json({
        success: false,
        message: "Update data is required"
      });

    }

    const columns = Object.keys(data);

    const values = Object.values(data);

    const setClause = columns
      .map(column => `\`${column}\` = ?`)
      .join(", ");

    const sql = `
      UPDATE customers
      SET ${setClause}
      WHERE id = ?
    `;

    values.push(req.params.id);

    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {

      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });

    }

    res.json({
      success: true,
      message: "Customer updated successfully"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to update customer",
      error: error.message
    });
  }
});

/* =========================
   DELETE CUSTOMER
========================= */

app.delete("/api/customers/:id", async (req, res) => {

  try {

    const [result] = await db.query(
      "DELETE FROM customers WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {

      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });

    }

    res.json({
      success: true,
      message: "Customer deleted successfully"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to delete customer",
      error: error.message
    });
  }
});

/* =========================
   GENERIC TABLE GET API
========================= */

app.get("/api/:table", async (req, res) => {

  try {

    const table = req.params.table;

    if (!ALLOWED_TABLES.includes(table)) {

      return res.status(400).json({
        success: false,
        message: "Invalid table"
      });

    }

    const [rows] = await db.query(
      `SELECT * FROM \`${table}\``
    );

    res.json({
      success: true,
      table: table,
      count: rows.length,
      data: rows
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch data",
      error: error.message
    });
  }
});

/* =========================
   GENERIC CREATE API
========================= */

app.post("/api/:table", async (req, res) => {

  try {

    const table = req.params.table;

    if (!ALLOWED_TABLES.includes(table)) {

      return res.status(400).json({
        success: false,
        message: "Invalid table"
      });

    }

    const data = req.body;

    if (!data || Object.keys(data).length === 0) {

      return res.status(400).json({
        success: false,
        message: "Data is required"
      });

    }

    const columns = Object.keys(data);

    const values = Object.values(data);

    const placeholders = columns.map(() => "?").join(", ");

    const columnNames = columns
      .map(column => `\`${column}\``)
      .join(", ");

    const sql = `
      INSERT INTO \`${table}\`
      (${columnNames})
      VALUES
      (${placeholders})
    `;

    const [result] = await db.query(sql, values);

    res.status(201).json({
      success: true,
      message: `${table} record created successfully`,
      id: result.insertId
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to create record",
      error: error.message
    });
  }
});

/* =========================
   LIST DATABASE TABLES
========================= */

app.get("/api", async (req, res) => {

  res.json({
    success: true,
    application: "Mahalaxmi Enterprise AI CRM",

    endpoints: {
      health: "/api/health",

      customers: {
        list: "GET /api/customers",
        single: "GET /api/customers/:id",
        create: "POST /api/customers",
        update: "PUT /api/customers/:id",
        delete: "DELETE /api/customers/:id"
      },

      generic: {
        get: "GET /api/:table",
        create: "POST /api/:table"
      }
    },

    tables: ALLOWED_TABLES
  });

});

/* =========================
   HOME PAGE
========================= */

app.get("/", (req, res) => {

  res.send(`
    <!DOCTYPE html>

    <html>

    <head>

      <title>Mahalaxmi Enterprise AI CRM</title>

      <style>

        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          background: #f5f5f5;
        }

        .container {
          max-width: 900px;
          margin: auto;
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 15px rgba(0,0,0,0.08);
        }

        h1 {
          margin-bottom: 5px;
        }

        .status {
          color: green;
          font-weight: bold;
        }

        a {
          display: block;
          margin: 10px 0;
          color: #0066cc;
        }

      </style>

    </head>

    <body>

      <div class="container">

        <h1>Mahalaxmi Enterprise AI CRM</h1>

        <p class="status">
          CRM server is running
        </p>

        <h3>API</h3>

        <a href="/api/health">
          Database Health
        </a>

        <a href="/api">
          API Information
        </a>

        <a href="/api/customers">
          Customers
        </a>

        <a href="/api/products">
          Products
        </a>

        <a href="/api/enquiries">
          Enquiries
        </a>

        <a href="/api/quotations">
          Quotations
        </a>

        <a href="/api/orders">
          Orders
        </a>

        <a href="/api/payments">
          Payments
        </a>

      </div>

    </body>

    </html>
  `);

});

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {

  console.log(
    `Mahalaxmi CRM running on port ${PORT}`
  );

});
