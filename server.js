const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ===============================
// DATABASE CONNECTION
// ===============================

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

// ===============================
// HEALTH CHECK
// ===============================

app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");

    res.json({
      success: true,
      message: "Mahalaxmi CRM is running",
      database: "connected"
    });

  } catch (error) {
    console.error("Database error:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message
    });
  }
});

// ===============================
// CUSTOMERS - GET ALL
// ===============================

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

    console.error("Customers error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message
    });

  }
});

// ===============================
// CUSTOMER - GET ONE
// ===============================

app.get("/api/customers/:id", async (req, res) => {
  try {

    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM customers WHERE id = ?",
      [id]
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

    console.error("Customer error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
      error: error.message
    });

  }
});

// ===============================
// CUSTOMER - CREATE
// ===============================

app.post("/api/customers", async (req, res) => {
  try {

    const customer = req.body;

    // Remove id if somebody sends it accidentally
    delete customer.id;

    const columns = Object.keys(customer);
    const values = Object.values(customer);

    if (columns.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No customer data provided"
      });
    }

    const columnNames = columns.map(column => `\`${column}\``).join(", ");
    const placeholders = columns.map(() => "?").join(", ");

    const sql = `
      INSERT INTO customers (${columnNames})
      VALUES (${placeholders})
    `;

    const [result] = await db.query(sql, values);

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      customer_id: result.insertId
    });

  } catch (error) {

    console.error("Create customer error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create customer",
      error: error.message
    });

  }
});

// ===============================
// HOME PAGE
// ===============================

app.get("/", (req, res) => {

  res.send(`
    <!DOCTYPE html>

    <html>

      <head>

        <title>Mahalaxmi Enterprise AI CRM</title>

        <style>

          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            background: #f5f5f5;
          }

          .container {
            max-width: 800px;
            margin: auto;
            background: white;
            padding: 30px;
            border-radius: 12px;
          }

          h1 {
            margin-bottom: 10px;
          }

          .status {
            color: green;
            font-weight: bold;
          }

          a {
            display: block;
            margin-top: 15px;
          }

        </style>

      </head>

      <body>

        <div class="container">

          <h1>Mahalaxmi Enterprise AI CRM</h1>

          <p class="status">
            CRM server is running.
          </p>

          <h3>API</h3>

          <a href="/api/health">
            Database Health Check
          </a>

          <a href="/api/customers">
            Customers API
          </a>

        </div>

      </body>

    </html>
  `);

});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {

  console.log(
    `Mahalaxmi CRM running on port ${PORT}`
  );

});
