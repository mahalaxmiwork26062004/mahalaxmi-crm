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

function normalizeTableName(name) {
  if (!name) return null;

  const normalized = String(name).trim().toLowerCase();
  const table = TABLE_ALIASES[normalized] || normalized;

  return ALLOWED_TABLES.includes(table) ? table : null;
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
  const columns = await getTableColumns(tableName);
  return columns.map(x => x.COLUMN_NAME);
}

async function validateColumns(table, data) {
  const allowed = await getColumnNames(table);

  const invalid = Object.keys(data).filter(
    key => !allowed.includes(key)
  );

  return {
    valid: invalid.length === 0,
    invalidColumns: invalid,
    allowedColumns: allowed
  };
}

function sanitizeUser(row) {
  const result = { ...row };

  delete result.password;
  delete result.password_hash;

  return result;
}

function money(value) {
  const n = Number(value || 0);
  return Number(n.toFixed(2));
}

/* =========================================================
   QUOTATION NUMBER
========================================================= */

async function generateQuotationNumber() {
  const year = new Date().getFullYear();

  const [rows] = await db.query(
    `
    SELECT quotation_number
    FROM quotations
    WHERE quotation_number LIKE ?
    ORDER BY id DESC
    LIMIT 1
    `,
    [`QTN-${year}-%`]
  );

  let next = 1;

  if (rows.length) {
    const match = String(rows[0].quotation_number).match(
      /QTN-\d{4}-(\d+)/
    );

    if (match) {
      next = Number(match[1]) + 1;
    }
  }

  return `QTN-${year}-${String(next).padStart(4, "0")}`;
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
    tables: ALLOWED_TABLES
  });
});

/* =========================================================
   NEXT QUOTATION NUMBER
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
    res.status(500).json({
      success: false,
      message: "Unable to fetch schema",
      error: error.message
    });
  }
});

/* =========================================================
   QUOTATION DETAILS
========================================================= */

app.get("/api/quotations/:id/details", async (req, res) => {
  try {
    const id = req.params.id;

    const [quotationRows] = await db.query(
      `SELECT * FROM quotations WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!quotationRows.length) {
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
      [id]
    );

    let customer = null;

    if (quotationRows[0].customer_id) {
      const [customers] = await db.query(
        `SELECT * FROM customers WHERE id = ? LIMIT 1`,
        [quotationRows[0].customer_id]
      );

      if (customers.length) {
        customer = customers[0];
      }
    }

    res.json({
      success: true,
      quotation: quotationRows[0],
      customer,
      items
    });
  } catch (error) {
    console.error("QUOTATION DETAILS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load quotation",
      error: error.message
    });
  }
});

/* =========================================================
   CREATE QUOTATION
========================================================= */

app.post("/api/quotations/create", async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const body = req.body || {};

    let quotationNumber =
      body.quotation_number ||
      await generateQuotationNumber();

    const quotationDate =
      body.quotation_date ||
      new Date().toISOString().slice(0, 10);

    const validUntil =
      body.valid_until ||
      null;

    const customerId =
      body.customer_id ||
      null;

    const status =
      body.status ||
      "Draft";

    const items =
      Array.isArray(body.items)
        ? body.items
        : [];

    if (!customerId) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Please select a customer"
      });
    }

    if (!items.length) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Please add at least one quotation item"
      });
    }

    /* -------------------------------------------------------
       Calculate totals
    ------------------------------------------------------- */

    let subtotal = 0;
    let itemDiscountTotal = 0;

    const preparedItems = items.map(item => {
      const quantity = Math.max(
        0,
        Number(item.quantity || 0)
      );

      const unitPrice = Math.max(
        0,
        Number(item.unit_price || 0)
      );

      const discountPercent = Math.max(
        0,
        Number(item.discount_percent || item.discount || 0)
      );

      const gross = quantity * unitPrice;

      const discountAmount =
        gross * discountPercent / 100;

      const lineTotal =
        gross - discountAmount;

      subtotal += lineTotal;
      itemDiscountTotal += discountAmount;

      return {
        product_id: item.product_id || null,
        description:
          item.description ||
          item.product_name ||
          "",
        quantity,
        unit_price: unitPrice,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        gst_percent:
          Number(item.gst_percent || 18),
        total: lineTotal
      };
    });

    const quotationDiscountPercent =
      Math.max(
        0,
        Number(body.discount_percent || 0)
      );

    const quotationDiscountAmount =
      subtotal * quotationDiscountPercent / 100;

    const freight =
      Math.max(
        0,
        Number(body.freight || 0)
      );

    const taxableAmount =
      subtotal -
      quotationDiscountAmount +
      freight;

    const gstPercent =
      Number(body.gst_percent || 18);

    const gstAmount =
      taxableAmount * gstPercent / 100;

    const grandTotal =
      taxableAmount + gstAmount;

    /* -------------------------------------------------------
       Detect available quotation columns
    ------------------------------------------------------- */

    const quotationColumns =
      await getColumnNames("quotations");

    const quotationData = {};

    const setIfExists = (column, value) => {
      if (quotationColumns.includes(column)) {
        quotationData[column] = value;
      }
    };

    setIfExists("quotation_number", quotationNumber);
    setIfExists("customer_id", customerId);
    setIfExists("quotation_date", quotationDate);
    setIfExists("valid_until", validUntil);
    setIfExists("status", status);
    setIfExists("subtotal", money(subtotal));
    setIfExists("discount", money(quotationDiscountAmount));
    setIfExists(
      "discount_percent",
      money(quotationDiscountPercent)
    );
    setIfExists("freight", money(freight));
    setIfExists("gst_percent", money(gstPercent));
    setIfExists("gst_amount", money(gstAmount));
    setIfExists("grand_total", money(grandTotal));
    setIfExists("notes", body.notes || "");

    if (!Object.keys(quotationData).length) {
      throw new Error(
        "No valid quotation fields found in database"
      );
    }

    const columns = Object.keys(quotationData);

    const placeholders =
      columns.map(() => "?").join(", ");

    const values =
      columns.map(column => quotationData[column]);

    const [quotationResult] =
      await connection.query(
        `
        INSERT INTO quotations
        (${columns.map(c => `\`${c}\``).join(", ")})
        VALUES (${placeholders})
        `,
        values
      );

    const quotationId =
      quotationResult.insertId;

    /* -------------------------------------------------------
       Insert items
    ------------------------------------------------------- */

    const itemColumns =
      await getColumnNames("quotation_items");

    for (const item of preparedItems) {
      const data = {};

      const add = (column, value) => {
        if (itemColumns.includes(column)) {
          data[column] = value;
        }
      };

      add("quotation_id", quotationId);
      add("product_id", item.product_id);
      add("description", item.description);
      add("quantity", item.quantity);
      add("unit_price", item.unit_price);
      add("discount", money(item.discount_amount));
      add(
        "discount_percent",
        money(item.discount_percent)
      );
      add(
        "gst_percent",
        money(item.gst_percent)
      );
      add("total", money(item.total));

      const itemCols =
        Object.keys(data);

      const itemValues =
        itemCols.map(c => data[c]);

      await connection.query(
        `
        INSERT INTO quotation_items
        (${itemCols.map(c => `\`${c}\``).join(", ")})
        VALUES
        (${itemCols.map(() => "?").join(", ")})
        `,
        itemValues
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Quotation saved successfully",
      quotation_id: quotationId,
      quotation_number: quotationNumber,
      subtotal: money(subtotal),
      discount_percent:
        money(quotationDiscountPercent),
      discount_amount:
        money(quotationDiscountAmount),
      freight: money(freight),
      gst_percent: money(gstPercent),
      gst_amount: money(gstAmount),
      grand_total: money(grandTotal)
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      "CREATE QUOTATION ERROR:",
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
   UPDATE QUOTATION
========================================================= */

app.put("/api/quotations/:id/full", async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const quotationId =
      req.params.id;

    const body =
      req.body || {};

    const items =
      Array.isArray(body.items)
        ? body.items
        : [];

    if (!items.length) {
      throw new Error(
        "Quotation must contain at least one item"
      );
    }

    let subtotal = 0;

    const preparedItems =
      items.map(item => {
        const quantity =
          Number(item.quantity || 0);

        const unitPrice =
          Number(item.unit_price || 0);

        const discountPercent =
          Number(
            item.discount_percent ||
            item.discount ||
            0
          );

        const gross =
          quantity * unitPrice;

        const discountAmount =
          gross *
          discountPercent /
          100;

        const total =
          gross -
          discountAmount;

        subtotal += total;

        return {
          product_id:
            item.product_id || null,

          description:
            item.description ||
            item.product_name ||
            "",

          quantity,
          unit_price: unitPrice,
          discount_percent:
            discountPercent,
          discount_amount:
            discountAmount,
          gst_percent:
            Number(
              item.gst_percent || 18
            ),
          total
        };
      });

    const discountPercent =
      Number(
        body.discount_percent || 0
      );

    const discountAmount =
      subtotal *
      discountPercent /
      100;

    const freight =
      Number(body.freight || 0);

    const gstPercent =
      Number(body.gst_percent || 18);

    const taxable =
      subtotal -
      discountAmount +
      freight;

    const gstAmount =
      taxable *
      gstPercent /
      100;

    const grandTotal =
      taxable + gstAmount;

    const columns =
      await getColumnNames(
        "quotations"
      );

    const data = {};

    const set = (column, value) => {
      if (columns.includes(column)) {
        data[column] = value;
      }
    };

    set(
      "customer_id",
      body.customer_id || null
    );

    set(
      "quotation_date",
      body.quotation_date ||
      new Date()
        .toISOString()
        .slice(0, 10)
    );

    set(
      "valid_until",
      body.valid_until || null
    );

    set(
      "status",
      body.status || "Draft"
    );

    set(
      "subtotal",
      money(subtotal)
    );

    set(
      "discount",
      money(discountAmount)
    );

    set(
      "discount_percent",
      money(discountPercent)
    );

    set(
      "freight",
      money(freight)
    );

    set(
      "gst_percent",
      money(gstPercent)
    );

    set(
      "gst_amount",
      money(gstAmount)
    );

    set(
      "grand_total",
      money(grandTotal)
    );

    set(
      "notes",
      body.notes || ""
    );

    const updateColumns =
      Object.keys(data);

    if (updateColumns.length) {
      await connection.query(
        `
        UPDATE quotations
        SET
        ${updateColumns
          .map(c => `\`${c}\` = ?`)
          .join(", ")}
        WHERE id = ?
        `,
        [
          ...updateColumns.map(
            c => data[c]
          ),
          quotationId
        ]
      );
    }

    await connection.query(
      `
      DELETE FROM quotation_items
      WHERE quotation_id = ?
      `,
      [quotationId]
    );

    const itemColumns =
      await getColumnNames(
        "quotation_items"
      );

    for (const item of preparedItems) {
      const dataItem = {};

      const add = (column, value) => {
        if (itemColumns.includes(column)) {
          dataItem[column] = value;
        }
      };

      add(
        "quotation_id",
        quotationId
      );

      add(
        "product_id",
        item.product_id
      );

      add(
        "description",
        item.description
      );

      add(
        "quantity",
        item.quantity
      );

      add(
        "unit_price",
        item.unit_price
      );

      add(
        "discount",
        money(
          item.discount_amount
        )
      );

      add(
        "discount_percent",
        money(
          item.discount_percent
        )
      );

      add(
        "gst_percent",
        money(
          item.gst_percent
        )
      );

      add(
        "total",
        money(item.total)
      );

      const cols =
        Object.keys(dataItem);

      await connection.query(
        `
        INSERT INTO quotation_items
        (${cols.map(c => `\`${c}\``).join(", ")})
        VALUES
        (${cols.map(() => "?").join(", ")})
        `,
        cols.map(c => dataItem[c])
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Quotation updated successfully",
      quotation_id:
        Number(quotationId),
      grand_total:
        money(grandTotal)
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      "UPDATE QUOTATION ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to update quotation",
      error: error.message
    });
  } finally {
    connection.release();
  }
});

/* =========================================================
   GENERIC SINGLE RECORD
==================================================
