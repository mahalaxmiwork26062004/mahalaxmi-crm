const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

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
   ALLOWED TABLES
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

  return ALLOWED_TABLES.includes(aliased)
    ? aliased
    : null;
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
    [process.env.DB_NAME, tableName]
  );

  return rows;
}

async function getColumnNames(tableName) {
  const rows = await getTableColumns(tableName);
  return rows.map(row => row.COLUMN_NAME);
}

async function validateRequestColumns(tableName, data) {
  const allowedColumns = await getColumnNames(tableName);

  const invalidColumns = Object.keys(data).filter(
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

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round2(value) {
  return Math.round((number(value) + Number.EPSILON) * 100) / 100;
}

/* =========================================================
   QUOTATION NUMBER
========================================================= */

async function generateQuotationNumber() {
  const columns = await getColumnNames("quotations");

  if (!columns.includes("quotation_number")) {
    return null;
  }

  const [rows] = await db.query(
    `
    SELECT quotation_number
    FROM quotations
    WHERE quotation_number IS NOT NULL
    ORDER BY id DESC
    LIMIT 1
    `
  );

  let nextNumber = 1;

  if (rows.length && rows[0].quotation_number) {
    const match = String(rows[0].quotation_number).match(/(\d+)$/);

    if (match) {
      nextNumber = Number(match[1]) + 1;
    }
  }

  const year = new Date().getFullYear();

  return `MCE-Q-${year}-${String(nextNumber).padStart(4, "0")}`;
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
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message
    });
  }
});

/* =========================================================
   API INFO
========================================================= */

app.get("/api", (req, res) => {
  res.json({
    success: true,
    application: "Mahalaxmi Enterprise AI CRM",
    version: "3.0",

    quotationFeatures: [
      "Automatic quotation number",
      "Multiple quotation items",
      "Discount percentage",
      "Discount amount",
      "Freight",
      "GST",
      "Grand total",
      "Save quotation",
      "PDF-ready quotation",
      "WhatsApp sharing"
    ],

    tables: ALLOWED_TABLES
  });
});

/* =========================================================
   QUOTATION NUMBER PREVIEW
========================================================= */

app.get("/api/quotations/next-number", async (req, res) => {
  try {
    const quotationNumber = await generateQuotationNumber();

    res.json({
      success: true,
      quotation_number: quotationNumber
    });
  } catch (error) {
    console.error("NEXT QUOTATION NUMBER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to generate quotation number",
      error: error.message
    });
  }
});

/* =========================================================
   GENERIC GET TABLE
========================================================= */

app.get("/api/:table", async (req, res) => {
  try {
    const table = normalizeTableName(req.params.table);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table"
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
        table === "users"
          ? sanitizeUser(row)
          : row
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
========================================================= */

app.get("/api/:table/schema", async (req, res) => {
  try {
    const table = normalizeTableName(req.params.table);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table"
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
   GET SINGLE
========================================================= */

app.get("/api/:table/:id", async (req, res) => {
  try {
    const table = normalizeTableName(req.params.table);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table"
      });
    }

    const [rows] = await db.query(
      `SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Record not found"
      });
    }

    res.json({
      success: true,
      data:
        table === "users"
          ? sanitizeUser(rows[0])
          : rows[0]
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
   GENERIC CREATE
========================================================= */

app.post("/api/:table", async (req, res) => {
  try {
    const table = normalizeTableName(req.params.table);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table"
      });
    }

    let data = { ...req.body };

    delete data.id;

    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      !Object.keys(data).length
    ) {
      return res.status(400).json({
        success: false,
        message: "Request body is required"
      });
    }

    /* quotation item aliases */

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

    const validation =
      await validateRequestColumns(table, data);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Invalid column(s) supplied",
        invalid_columns: validation.invalidColumns,
        allowed_columns: validation.allowedColumns
      });
    }

    const columns = Object.keys(data);

    const values = columns.map(
      column => data[column]
    );

    const placeholders = columns
      .map(() => "?")
      .join(",");

    const columnNames = columns
      .map(column => `\`${column}\``)
      .join(",");

    const [result] = await db.query(
      `
      INSERT INTO \`${table}\`
      (${columnNames})
      VALUES (${placeholders})
      `,
      values
    );

    res.status(201).json({
      success: true,
      message: `${table} created successfully`,
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
   GENERIC UPDATE
========================================================= */

app.put("/api/:table/:id", async (req, res) => {
  try {
    const table = normalizeTableName(req.params.table);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table"
      });
    }

    const data = { ...req.body };

    delete data.id;

    if (!Object.keys(data).length) {
      return res.status(400).json({
        success: false,
        message: "No fields supplied"
      });
    }

    const validation =
      await validateRequestColumns(table, data);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Invalid column(s) supplied",
        invalid_columns: validation.invalidColumns,
        allowed_columns: validation.allowedColumns
      });
    }

    const columns = Object.keys(data);

    const values = columns.map(
      column => data[column]
    );

    const setClause = columns
      .map(column => `\`${column}\` = ?`)
      .join(",");

    values.push(req.params.id);

    const [result] = await db.query(
      `
      UPDATE \`${table}\`
      SET ${setClause}
      WHERE id = ?
      `,
      values
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Record not found"
      });
    }

    res.json({
      success: true,
      message: `${table} updated successfully`
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
   GENERIC DELETE
========================================================= */

app.delete("/api/:table/:id", async (req, res) => {
  try {
    const table = normalizeTableName(req.params.table);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table"
      });
    }

    const [result] = await db.query(
      `DELETE FROM \`${table}\` WHERE id = ?`,
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Record not found"
      });
    }

    res.json({
      success: true,
      message: `${table} deleted successfully`
    });
  } catch (error) {
    console.error("DELETE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete record",
      error: error.message
    });
  }
});

/* =========================================================
   CREATE COMPLETE QUOTATION
========================================================= */

app.post("/api/quotations/create-complete", async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const body = req.body || {};

    const customerId =
      body.customer_id || null;

    const quotationDate =
      body.quotation_date ||
      new Date().toISOString().slice(0, 10);

    const validUntil =
      body.valid_until || null;

    const status =
      body.status || "Draft";

    const discountPercent =
      number(body.discount_percent);

    const freight =
      number(body.freight);

    const gstPercent =
      number(body.gst_percent);

    const items =
      Array.isArray(body.items)
        ? body.items
        : [];

    if (!items.length) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Please add at least one quotation item"
      });
    }

    /* -----------------------------------------------------
       CALCULATE ITEMS
    ----------------------------------------------------- */

    let subtotal = 0;

    const calculatedItems = items.map(item => {
      const quantity = number(item.quantity);
      const rate = number(item.rate);

      const amount = round2(
        quantity * rate
      );

      subtotal += amount;

      return {
        ...item,
        quantity,
        rate,
        amount
      };
    });

    subtotal = round2(subtotal);

    const discountAmount =
      round2(
        subtotal * discountPercent / 100
      );

    const taxableBeforeFreight =
      round2(
        subtotal - discountAmount
      );

    const taxableAmount =
      round2(
        taxableBeforeFreight + freight
      );

    const gstAmount =
      round2(
        taxableAmount * gstPercent / 100
      );

    const grandTotal =
      round2(
        taxableAmount + gstAmount
      );

    /* -----------------------------------------------------
       QUOTATION COLUMNS
    ----------------------------------------------------- */

    const quotationColumns =
      await getColumnNames("quotations");

    const quotationNumber =
      await generateQuotationNumber();

    const quotationData = {};

    const possibleQuotationFields = {
      quotation_number: quotationNumber,
      customer_id: customerId,
      quotation_date: quotationDate,
      valid_until: validUntil,
      status,
      subtotal,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      freight,
      taxable_amount: taxableAmount,
      gst_percent: gstPercent,
      gst_amount: gstAmount,
      grand_total: grandTotal,
      notes: body.notes || null
    };

    for (const [field, value] of Object.entries(
      possibleQuotationFields
    )) {
      if (quotationColumns.includes(field)) {
        quotationData[field] = value;
      }
    }

    /* fallback if quotation number is required */

    if (
      quotationColumns.includes("quotation_number") &&
      !quotationData.quotation_number
    ) {
      quotationData.quotation_number =
        `MCE-Q-${Date.now()}`;
    }

    const qColumns =
      Object.keys(quotationData);

    if (!qColumns.length) {
      throw new Error(
        "No compatible quotation columns found in database"
      );
    }

    const qValues =
      qColumns.map(
        field => quotationData[field]
      );

    const qPlaceholders =
      qColumns.map(() => "?").join(",");

    const qNames =
      qColumns
        .map(field => `\`${field}\``)
        .join(",");

    const [quotationResult] =
      await connection.query(
        `
        INSERT INTO quotations
        (${qNames})
        VALUES (${qPlaceholders})
        `,
        qValues
      );

    const quotationId =
      quotationResult.insertId;

    /* -----------------------------------------------------
       INSERT ITEMS
    ----------------------------------------------------- */

    const itemColumns =
      await getColumnNames(
        "quotation_items"
      );

    for (const item of calculatedItems) {
      const itemData = {};

      const possibleItemFields = {
        quotation_id: quotationId,
        product_id:
          item.product_id || null,
        description:
          item.description ||
          item.product_name ||
          item.name ||
          "",
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount
      };

      for (
        const [field, value]
        of Object.entries(
          possibleItemFields
        )
      ) {
        if (itemColumns.includes(field)) {
          itemData[field] = value;
        }
      }

      const fields =
        Object.keys(itemData);

      if (!fields.length) {
        continue;
      }

      const values =
        fields.map(
          field => itemData[field]
        );

      const placeholders =
        fields.map(() => "?").join(",");

      const names =
        fields
          .map(field => `\`${field}\``)
          .join(",");

      await connection.query(
        `
        INSERT INTO quotation_items
        (${names})
        VALUES (${placeholders})
        `,
        values
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Quotation saved successfully",

      quotation: {
        id: quotationId,
        quotation_number:
          quotationData.quotation_number ||
          quotationId,
        quotation_date: quotationDate,
        customer_id: customerId,
        subtotal,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        freight,
        taxable_amount: taxableAmount,
        gst_percent: gstPercent,
        gst_amount: gstAmount,
        grand_total: grandTotal
      },

      items: calculatedItems
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      "CREATE COMPLETE QUOTATION ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Unable to save quotation",
      error: error.message,
      code: error.code || null
    });
  } finally {
    connection.release();
  }
});

/* =========================================================
   QUOTATION DETAILS
========================================================= */

app.get(
  "/api/quotations/:id/details",
  async (req, res) => {
    try {
      const quotationId =
        req.params.id;

      const [quotations] =
        await db.query(
          `
          SELECT *
          FROM quotations
          WHERE id = ?
          LIMIT 1
          `,
          [quotationId]
        );

      if (!quotations.length) {
        return res.status(404).json({
          success: false,
          message: "Quotation not found"
        });
      }

      const [items] =
        await db.query(
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
        items
      });
    } catch (error) {
      console.error(
        "QUOTATION DETAILS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to fetch quotation details",
        error: error.message
      });
    }
  }
);

/* =========================================================
   QUOTATION ITEMS
========================================================= */

app.get(
  "/api/quotations/:id/items",
  async (req, res) => {
    try {
      const [rows] =
        await db.query(
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
        quotation_id:
          Number(req.params.id),
        count: rows.length,
        items: rows
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message:
          "Unable to fetch quotation items",
        error: error.message
      });
    }
  }
);

/* =========================================================
   ROOT
========================================================= */

app.get("/", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
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
   ERROR HANDLER
========================================================= */

app.use(
  (error, req, res, next) => {
    console.error(
      "GLOBAL ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Internal server error",
      error: error.message
    });
  }
);

/* =========================================================
   START
========================================================= */

app.listen(PORT, () => {
  console.log(
    `Mahalaxmi CRM running on port ${PORT}`
  );
});
