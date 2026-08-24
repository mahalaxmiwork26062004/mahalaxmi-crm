const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(express.json({ limit: "10mb" }));

/*
  Serve the CRM frontend from:

  public/index.html
  public/style.css
  public/app.js
*/
app.use(express.static(path.join(__dirname, "public")));

/* =========================================================
   DATABASE
========================================================= */

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/* =========================================================
   ALLOWED CRM TABLES
========================================================= */

const ALLOWED_TABLES = [
  "users",
  "customers",
  "products",
  "enquiries",
  "enquiry_items",
  "followups",
  "quotations",
  "quotation_items",
  "orders",
  "order_items",
  "payments"
];

/* =========================================================
   TABLE ALIASES
========================================================= */

const TABLE_ALIASES = {
  "quotation-items": "quotation_items",
  "quotationitems": "quotation_items",

  "enquiry-items": "enquiry_items",
  "enquiryitems": "enquiry_items",

  "order-items": "order_items",
  "orderitems": "order_items"
};

/* =========================================================
   HELPERS
========================================================= */

function normalizeTableName(tableName) {
  if (!tableName) return null;

  const normalized = String(tableName)
    .trim()
    .toLowerCase();

  const aliased = TABLE_ALIASES[normalized] || normalized;

  if (!ALLOWED_TABLES.includes(aliased)) {
    return null;
  }

  return aliased;
}

async function getTableColumns(tableName) {
  const [rows] = await db.query(
    `
    SELECT
      COLUMN_NAME,
      DATA_TYPE,
      IS_NULLABLE,
      COLUMN_DEFAULT,
      EXTRA,
      COLUMN_KEY
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
    ORDER BY ORDINAL_POSITION
    `,
    [
      process.env.DB_NAME,
      tableName
    ]
  );

  return rows;
}

async function getColumnNames(tableName) {
  const rows = await getTableColumns(tableName);
  return rows.map(row => row.COLUMN_NAME);
}

async function validateRequestColumns(tableName, data) {
  const allowedColumns = await getColumnNames(tableName);

  const requestedColumns = Object.keys(data);

  const invalidColumns = requestedColumns.filter(
    column => !allowedColumns.includes(column)
  );

  return {
    valid: invalidColumns.length === 0,
    invalidColumns,
    allowedColumns
  };
}

function sanitizeUser(row) {
  const copy = { ...row };

  delete copy.password;
  delete copy.password_hash;

  return copy;
}

/* =========================================================
   HEALTH
========================================================= */

app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");

    res.json({
      success: true,
      message: "Mahalaxmi CRM is running",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("HEALTH ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message
    });
  }
});

/* =========================================================
   API INFORMATION
========================================================= */

app.get("/api", (req, res) => {
  res.json({
    success: true,
    application: "Mahalaxmi Enterprise AI CRM",
    version: "2.0",

    endpoints: {
      health: "GET /api/health",

      generic: {
        list: "GET /api/:table",
        single: "GET /api/:table/:id",
        create: "POST /api/:table",
        update: "PUT /api/:table/:id",
        delete: "DELETE /api/:table/:id",
        schema: "GET /api/:table/schema"
      },

      quotation: {
        details: "GET /api/quotations/:id/details",
        items: "GET /api/quotations/:id/items",
        addItem: "POST /api/quotations/:id/items"
      }
    },

    tableAliases: TABLE_ALIASES,
    tables: ALLOWED_TABLES
  });
});

/* =========================================================
   GET TABLE RECORDS
========================================================= */

app.get("/api/:table", async (req, res) => {
  try {
    const table = normalizeTableName(req.params.table);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table",
        allowed_tables: ALLOWED_TABLES
      });
    }

    const [rows] = await db.query(
      `SELECT * FROM \`${table}\` ORDER BY id DESC`
    );

    res.json({
      success: true,
      table,
      count: rows.length,
      data: rows.map(row =>
        table === "users" ? sanitizeUser(row) : row
      )
    });
  } catch (error) {
    console.error("GET TABLE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch data",
      error: error.message
    });
  }
});

/* =========================================================
   TABLE SCHEMA
   Must be before GET /api/:table/:id
========================================================= */

app.get("/api/:table/schema", async (req, res) => {
  try {
    const table = normalizeTableName(req.params.table);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table",
        allowed_tables: ALLOWED_TABLES
      });
    }

    const columns = await getTableColumns(table);

    res.json({
      success: true,
      table,
      columns
    });
  } catch (error) {
    console.error("SCHEMA ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch schema",
      error: error.message
    });
  }
});

/* =========================================================
   GET SINGLE RECORD
========================================================= */

app.get("/api/:table/:id", async (req, res) => {
  try {
    const table = normalizeTableName(req.params.table);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table",
        allowed_tables: ALLOWED_TABLES
      });
    }

    const [rows] = await db.query(
      `SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `${table} record not found`
      });
    }

    const record =
      table === "users"
        ? sanitizeUser(rows[0])
        : rows[0];

    res.json({
      success: true,
      table,
      data: record
    });
  } catch (error) {
    console.error("GET SINGLE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch record",
      error: error.message
    });
  }
});

/* =========================================================
   CREATE RECORD
========================================================= */

app.post("/api/:table", async (req, res) => {
  try {
    const table = normalizeTableName(req.params.table);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table",
        allowed_tables: ALLOWED_TABLES
      });
    }

    let data = { ...req.body };

    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      Object.keys(data).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Request body is required"
      });
    }

    if (table === "quotation_items") {
      if (
        data.name !== undefined &&
        data.description === undefined
      ) {
        data.description = data.name;
      }

      if (
        data.product_name !== undefined &&
        data.description === undefined
      ) {
        data.description = data.product_name;
      }

      if (
        data.quote_id !== undefined &&
        data.quotation_id === undefined
      ) {
        data.quotation_id = data.quote_id;
      }

      delete data.name;
      delete data.product_name;
      delete data.quote_id;
    }

    if (table === "order_items") {
      if (
        data.name !== undefined &&
        data.description === undefined
      ) {
        data.description = data.name;
      }

      delete data.name;
    }

    const validation =
      await validateRequestColumns(table, data);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Invalid column(s) supplied",
        table,
        invalid_columns: validation.invalidColumns,
        allowed_columns: validation.allowedColumns
      });
    }

    delete data.id;

    const columns = Object.keys(data);

    if (columns.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No insertable fields supplied"
      });
    }

    const values = columns.map(
      column => data[column]
    );

    const placeholders = columns
      .map(() => "?")
      .join(", ");

    const columnNames = columns
      .map(column => `\`${column}\``)
      .join(", ");

    const sql = `
      INSERT INTO \`${table}\`
      (${columnNames})
      VALUES (${placeholders})
    `;

    const [result] = await db.query(
      sql,
      values
    );

    res.status(201).json({
      success: true,
      message: `${table} record created successfully`,
      table,
      id: result.insertId
    });
  } catch (error) {
    console.error("CREATE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create record",
      error: error.message,
      code: error.code || null
    });
  }
});

/* =========================================================
   UPDATE RECORD
========================================================= */

app.put("/api/:table/:id", async (req, res) => {
  try {
    const table = normalizeTableName(req.params.table);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table",
        allowed_tables: ALLOWED_TABLES
      });
    }

    const data = { ...req.body };

    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      Object.keys(data).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Request body is required"
      });
    }

    delete data.id;

    const validation =
      await validateRequestColumns(table, data);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Invalid column(s) supplied",
        table,
        invalid_columns: validation.invalidColumns,
        allowed_columns: validation.allowedColumns
      });
    }

    const columns = Object.keys(data);

    if (columns.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No updatable fields supplied"
      });
    }

    const values = columns.map(
      column => data[column]
    );

    const setClause = columns
      .map(column => `\`${column}\` = ?`)
      .join(", ");

    values.push(req.params.id);

    const sql = `
      UPDATE \`${table}\`
      SET ${setClause}
      WHERE id = ?
    `;

    const [result] = await db.query(
      sql,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `${table} record not found`
      });
    }

    res.json({
      success: true,
      message: `${table} record updated successfully`,
      table,
      id: Number(req.params.id)
    });
  } catch (error) {
    console.error("UPDATE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update record",
      error: error.message,
      code: error.code || null
    });
  }
});

/* =========================================================
   DELETE RECORD
========================================================= */

app.delete("/api/:table/:id", async (req, res) => {
  try {
    const table = normalizeTableName(req.params.table);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table",
        allowed_tables: ALLOWED_TABLES
      });
    }

    const [result] = await db.query(
      `DELETE FROM \`${table}\` WHERE id = ?`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `${table} record not found`
      });
    }

    res.json({
      success: true,
      message: `${table} record deleted successfully`,
      table,
      id: Number(req.params.id)
    });
  } catch (error) {
    console.error("DELETE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete record",
      error: error.message,
      code: error.code || null
    });
  }
});

/* =========================================================
   QUOTATION DETAILS
========================================================= */

app.get("/api/quotations/:id/details", async (req, res) => {
  try {
    const quotationId = req.params.id;

    const [quotations] = await db.query(
      `
      SELECT *
      FROM quotations
      WHERE id = ?
      LIMIT 1
      `,
      [quotationId]
    );

    if (quotations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found"
      });
    }

    const [items] = await db.query(
      `
      SELECT *
      FROM quotation_items
      WHERE quotation_id = ?
      ORDER BY id ASC
      `,
      [quotationId]
    );

    res.json({
      success: true,
      quotation: quotations[0],
      items,
      item_count: items.length
    });
  } catch (error) {
    console.error("QUOTATION DETAILS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch quotation details",
      error: error.message
    });
  }
});

/* =========================================================
   GET QUOTATION ITEMS
========================================================= */

app.get("/api/quotations/:id/items", async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT *
      FROM quotation_items
      WHERE quotation_id = ?
      ORDER BY id ASC
      `,
      [req.params.id]
    );

    res.json({
      success: true,
      quotation_id: Number(req.params.id),
      count: rows.length,
      items: rows
    });
  } catch (error) {
    console.error("GET QUOTATION ITEMS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch quotation items",
      error: error.message
    });
  }
});

/* =========================================================
   ADD ITEM TO QUOTATION
========================================================= */

app.post("/api/quotations/:id/items", async (req, res) => {
  try {
    const quotationId = req.params.id;

    const [quotationRows] = await db.query(
      `
      SELECT id
      FROM quotations
      WHERE id = ?
      LIMIT 1
      `,
      [quotationId]
    );

    if (quotationRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found"
      });
    }

    let data = {
      ...req.body,
      quotation_id: quotationId
    };

    if (
      data.name !== undefined &&
      data.description === undefined
    ) {
      data.description = data.name;
    }

    if (
      data.product_name !== undefined &&
      data.description === undefined
    ) {
      data.description = data.product_name;
    }

    delete data.name;
    delete data.product_name;

    const validation =
      await validateRequestColumns(
        "quotation_items",
        data
      );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation item field(s)",
        invalid_columns:
          validation.invalidColumns,
        allowed_columns:
          validation.allowedColumns
      });
    }

    delete data.id;

    const columns = Object.keys(data);

    const values = columns.map(
      column => data[column]
    );

    const placeholders = columns
      .map(() => "?")
      .join(", ");

    const columnNames = columns
      .map(column => `\`${column}\``)
      .join(", ");

    const sql = `
      INSERT INTO quotation_items
      (${columnNames})
      VALUES (${placeholders})
    `;

    const [result] = await db.query(
      sql,
      values
    );

    res.status(201).json({
      success: true,
      message: "Quotation item created successfully",
      quotation_id: Number(quotationId),
      item_id: result.insertId
    });
  } catch (error) {
    console.error("ADD QUOTATION ITEM ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create quotation item",
      error: error.message,
      code: error.code || null
    });
  }
});

/* =========================================================
   ROOT PAGE
========================================================= */

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html"),
    error => {
      if (error) {
        res.send(`
          <h1>Mahalaxmi Enterprise AI CRM</h1>
          <p>CRM server is running.</p>
          <p>Create public/index.html to load the dashboard.</p>
        `);
      }
    }
  );
});

/* =========================================================
   API 404
========================================================= */

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    method: req.method,
    path: req.originalUrl
  });
});

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use((error, req, res, next) => {
  console.error("GLOBAL ERROR:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: error.message
  });
});

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {
  console.log(
    `Mahalaxmi CRM running on port ${PORT}`
  );
});
