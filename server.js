const express = require("express");
const mysql = require("mysql2/promise");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

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

// Test database connection
app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS connected");

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

// Home page
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Mahalaxmi Enterprise AI CRM</title>
      </head>
      <body>
        <h1>Mahalaxmi Enterprise AI CRM</h1>
        <p>CRM server is running.</p>
        <p>
          <a href="/api/health">Check Database Connection</a>
        </p>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`CRM running on port ${PORT}`);
});
