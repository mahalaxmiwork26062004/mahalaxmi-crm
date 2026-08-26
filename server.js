const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
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

const TABLES = [
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

const ALIASES = {
  "quotation-items": "quotation_items",
  quotationitems: "quotation_items",

  "enquiry-items": "enquiry_items",
  enquiryitems: "enquiry_items",

  "order-items": "order_items",
  orderitems: "order_items"
};

/* =========================================================
   HELPERS
========================================================= */

function tableName(name) {
  const value = String(name || "").trim().toLowerCase();

  const table = ALIASES[value] || value;

  if (!TABLES.includes(table)) {
    return null;
  }

  return table;
}

async function getColumns(table) {
  const [rows] = await db.query(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
    ORDER BY ORDINAL_POSITION
    `,
    [process.env.DB_NAME, table]
  );

  return rows.map(row => row.COLUMN_NAME);
}

async function validateColumns(table, data) {
  const columns = await getColumns(table);

  const invalid = Object.keys(data).filter(
    key => !columns.includes(key)
  );

  return {
    valid: invalid.length === 0,
    invalid,
    columns
  };
}

function money(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return 0;
  }

  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function numberValue(value, fallback = 0) {
  const n = Number(value);

  return Number.isFinite(n) ? n : fallback;
}

/* =========================================================
   NEXT QUOTATION NUMBER
========================================================= */

async function nextQuotationNumber(connection = db) {
  const year = new Date().getFullYear();
  const prefix = `QTN-${year}-`;

  const [rows] = await connection.query(
    `
    SELECT quotation_number
    FROM quotations
    WHERE quotation_number LIKE ?
    ORDER BY id DESC
    LIMIT 500
    `,
    [`${prefix}%`]
  );

  let max = 0;

  for (const row of rows) {
    const match = String(row.quotation_number || "").match(
      new RegExp(`^QTN-${year}-(\\d+)$`)
    );

    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }

  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

/* =========================================================
   QUOTATION CALCULATION

   IMPORTANT:
   Discount is calculated PER PRODUCT.

   Example:

   Product 1:
   Qty × Rate = 27060
   Discount 10% = 2706
   Net = 24354

   Product 2:
   Qty × Rate = 29000
   Discount 5% = 1450
   Net = 27550

   Total Item Discount = 4156
========================================================= */

function calculateItems(items) {
  let subtotal = 0;
  let totalItemDiscount = 0;
  let totalNet = 0;

  const calculatedItems = items.map(item => {
    const quantity = numberValue(
      item.quantity ?? item.qty,
      0
    );

    const rate = numberValue(
      item.rate ?? item.unit_price ?? item.price,
      0
    );

    const discountPercent = Math.max(
      0,
      Math.min(
        100,
        numberValue(
          item.discount_percent ?? item.discount,
          0
        )
      )
    );

    const grossAmount = money(
      quantity * rate
    );

    const discountAmount = money(
      grossAmount * discountPercent / 100
    );

    const netAmount = money(
      grossAmount - discountAmount
    );

    subtotal += grossAmount;
    totalItemDiscount += discountAmount;
    totalNet += netAmount;

    return {
      ...item,

      quantity,
      rate,

      discount_percent: discountPercent,

      gross_amount: grossAmount,

      discount_amount: discountAmount,

      net_amount: netAmount
    };
  });

  return {
    calculatedItems,
    subtotal: money(subtotal),
    totalItemDiscount: money(totalItemDiscount),
    netSubtotal: money(totalNet)
  };
}

/* =========================================================
   GET QUOTATION DETAILS

   This is READ ONLY.

   Opening a quotation does NOT update database.
   This makes View Quotation much faster.
========================================================= */

async function getQuotationDetails(id) {
  const [quotationRows] = await db.query(
    `
    SELECT *
    FROM quotations
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  if (quotationRows.length === 0) {
    throw new Error("Quotation not found");
  }

  const quotation = quotationRows[0];

  const [items] = await db.query(
    `
    SELECT *
    FROM quotation_items
    WHERE quotation_id = ?
    ORDER BY id ASC
    `,
    [id]
  );

  const calculated = calculateItems(items);

  const freight = money(
    quotation.freight
  );

  const taxableAmount = money(
    calculated.netSubtotal + freight
  );

  const gstPercent = numberValue(
    quotation.gst_percent ?? quotation.gst_rate,
    18
  );

  const gstAmount = money(
    taxableAmount * gstPercent / 100
  );

  const grandTotal = money(
    taxableAmount + gstAmount
  );

  return {
    quotation: {
      ...quotation,

      subtotal: calculated.subtotal,

      discount_amount:
        calculated.totalItemDiscount,

      discount:
        calculated.totalItemDiscount,

      taxable_amount:
        taxableAmount,

      gst_percent:
        gstPercent,

      gst_amount:
        gstAmount,

      grand_total:
        grandTotal
    },

    items: calculated.calculatedItems,

    totals: {
      subtotal:
        calculated.subtotal,

      total_item_discount:
        calculated.totalItemDiscount,

      net_subtotal:
        calculated.netSubtotal,

      freight,

      taxable_amount:
        taxableAmount,

      gst_percent:
        gstPercent,

      gst_amount:
        gstAmount,

      grand_total:
        grandTotal
    }
  };
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

    application:
      "Mahalaxmi Enterprise AI CRM",

    version:
      "4.0",

    features: [
      "Customer management",
      "Product management",
      "Enquiry management",
      "Quotation management",
      "Individual product discount",
      "GST calculation",
      "Freight calculation",
      "Quotation details",
      "WhatsApp sharing",
      "PDF printing"
    ],

    tables: TABLES
  });
});

/* =========================================================
   TABLE SCHEMA
========================================================= */

app.get("/api/:table/schema", async (req, res) => {
  try {
    const table = tableName(req.params.table);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table"
      });
    }

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
      [process.env.DB_NAME, table]
    );

    res.json({
      success: true,
      table,
      columns: rows
    });

  } catch (error) {
    console.error("SCHEMA ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/* =========================================================
   GET TABLE
========================================================= */

app.get("/api/:table", async (req, res) => {
  try {
    const table = tableName(req.params.table);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table"
      });
    }

    const [rows] = await db.query(
      `SELECT * FROM \`${table}\` ORDER BY id DESC`
    );

    const data = rows.map(row => {
      if (table === "users") {
        const copy = { ...row };

        delete copy.password;
        delete copy.password_hash;

        return copy;
      }

      return row;
    });

    res.json({
      success: true,
      table,
      count: data.length,
      data
    });

  } catch (error) {
    console.error("GET TABLE ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/* =========================================================
   GET SINGLE RECORD
========================================================= */

app.get("/api/:table/:id", async (req, res) => {
  try {
    const table = tableName(req.params.table);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table"
      });
    }

    const [rows] = await db.query(
      `
      SELECT *
      FROM \`${table}\`
      WHERE id = ?
      LIMIT 1
      `,
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
      table,
      data: rows[0]
    });

  } catch (error) {
    console.error("GET SINGLE ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/* =========================================================
   CREATE RECORD
========================================================= */

app.post("/api/:table", async (req, res) => {
  try {
    const table = tableName(req.params.table);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table"
      });
    }

    const data = {
      ...(req.body || {})
    };

    delete data.id;

    /* Automatic quotation number */

    if (
      table === "quotations" &&
      (!data.quotation_number ||
        String(data.quotation_number).trim() === "")
    ) {
      data.quotation_number =
        await nextQuotationNumber();
    }

    /* Quotation item aliases */

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
        data.description =
          data.product_name;
      }

      delete data.name;
      delete data.product_name;
      delete data.quote_id;

      if (
        data.discount_percent === undefined
      ) {
        data.discount_percent = 0;
      }

      if (
        data.discount_amount === undefined
      ) {
        data.discount_amount = 0;
      }
    }

    const validation =
      await validateColumns(
        table,
        data
      );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid column(s) supplied",

        invalid_columns:
          validation.invalid,

        allowed_columns:
          validation.columns
      });
    }

    const columns =
      Object.keys(data);

    if (!columns.length) {
      return res.status(400).json({
        success: false,
        message:
          "No insertable fields supplied"
      });
    }

    const values =
      columns.map(
        column => data[column]
      );

    const placeholders =
      columns
        .map(() => "?")
        .join(", ");

    const columnNames =
      columns
        .map(
          column =>
            `\`${column}\``
        )
        .join(", ");

    const [result] =
      await db.query(
        `
        INSERT INTO \`${table}\`
        (${columnNames})
        VALUES (${placeholders})
        `,
        values
      );

    res.status(201).json({
      success: true,

      message:
        `${table} created successfully`,

      id:
        result.insertId,

      quotation_number:
        table === "quotations"
          ? data.quotation_number
          : undefined
    });

  } catch (error) {
    console.error("CREATE ERROR:", error);

    res.status(500).json({
      success: false,
      message:
        "Unable to create record",
      error:
        error.message,
      code:
        error.code || null
    });
  }
});

/* =========================================================
   UPDATE RECORD
========================================================= */

app.put("/api/:table/:id", async (req, res) => {
  try {
    const table = tableName(req.params.table);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table"
      });
    }

    const data = {
      ...(req.body || {})
    };

    delete data.id;

    const validation =
      await validateColumns(
        table,
        data
      );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid column(s) supplied",

        invalid_columns:
          validation.invalid,

        allowed_columns:
          validation.columns
      });
    }

    const columns =
      Object.keys(data);

    if (!columns.length) {
      return res.status(400).json({
        success: false,
        message:
          "No fields supplied"
      });
    }

    const values =
      columns.map(
        column => data[column]
      );

    const setClause =
      columns
        .map(
          column =>
            `\`${column}\` = ?`
        )
        .join(", ");

    values.push(req.params.id);

    const [result] =
      await db.query(
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
        message:
          "Record not found"
      });
    }

    res.json({
      success: true,

      message:
        `${table} updated successfully`,

      id:
        Number(req.params.id)
    });

  } catch (error) {
    console.error("UPDATE ERROR:", error);

    res.status(500).json({
      success: false,
      message:
        "Unable to update record",
      error:
        error.message,
      code:
        error.code || null
    });
  }
});

/* =========================================================
   DELETE RECORD
========================================================= */

app.delete("/api/:table/:id", async (req, res) => {
  try {
    const table = tableName(req.params.table);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table"
      });
    }

    const [result] =
      await db.query(
        `
        DELETE FROM \`${table}\`
        WHERE id = ?
        `,
        [req.params.id]
      );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message:
          "Record not found"
      });
    }

    res.json({
      success: true,

      message:
        `${table} deleted successfully`,

      id:
        Number(req.params.id)
    });

  } catch (error) {
    console.error("DELETE ERROR:", error);

    res.status(500).json({
      success: false,
      message:
        error.message
    });
  }
});

/* =========================================================
   NEXT QUOTATION NUMBER
========================================================= */

app.get(
  "/api/quotations/next-number",
  async (req, res) => {
    try {
      const quotationNumber =
        await nextQuotationNumber();

      res.json({
        success: true,
        quotation_number:
          quotationNumber
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);

/* =========================================================
   QUOTATION DETAILS

   FAST READ-ONLY ENDPOINT
========================================================= */

app.get(
  "/api/quotations/:id/details",
  async (req, res) => {
    try {
      const details =
        await getQuotationDetails(
          req.params.id
        );

      res.json({
        success: true,
        ...details
      });

    } catch (error) {
      console.error(
        "QUOTATION DETAILS ERROR:",
        error
      );

      res.status(404).json({
        success: false,
        message:
          error.message
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
        items: rows
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);

/* =========================================================
   ADD QUOTATION ITEM
========================================================= */

app.post(
  "/api/quotations/:id/items",
  async (req, res) => {
    try {
      const quotationId =
        req.params.id;

      const data = {
        ...(req.body || {}),
        quotation_id:
          quotationId
      };

      delete data.id;

      if (
        data.name !== undefined &&
        data.description === undefined
      ) {
        data.description =
          data.name;
      }

      if (
        data.product_name !== undefined &&
        data.description === undefined
      ) {
        data.description =
          data.product_name;
      }

      delete data.name;
      delete data.product_name;

      if (
        data.discount_percent === undefined
      ) {
        data.discount_percent = 0;
      }

      if (
        data.discount_amount === undefined
      ) {
        data.discount_amount = 0;
      }

      const validation =
        await validateColumns(
          "quotation_items",
          data
        );

      if (!validation.valid) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid quotation item field(s)",

          invalid_columns:
            validation.invalid,

          allowed_columns:
            validation.columns
        });
      }

      const columns =
        Object.keys(data);

      const values =
        columns.map(
          column => data[column]
        );

      const placeholders =
        columns
          .map(() => "?")
          .join(", ");

      const names =
        columns
          .map(
            column =>
              `\`${column}\``
          )
          .join(", ");

      const [result] =
        await db.query(
          `
          INSERT INTO quotation_items
          (${names})
          VALUES (${placeholders})
          `,
          values
        );

      res.status(201).json({
        success: true,

        item_id:
          result.insertId,

        message:
          "Quotation item created successfully"
      });

    } catch (error) {
      console.error(
        "ADD QUOTATION ITEM ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message,
        code:
          error.code || null
      });
    }
  }
);

/* =========================================================
   RECALCULATE
========================================================= */

app.post(
  "/api/quotations/:id/recalculate",
  async (req, res) => {
    try {
      const details =
        await getQuotationDetails(
          req.params.id
        );

      res.json({
        success: true,
        ...details
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message
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

app.use(
  "/api",
  (req, res) => {
    res.status(404).json({
      success: false,
      message:
        "API endpoint not found",
      method:
        req.method,
      path:
        req.originalUrl
    });
  }
);

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
      error:
        error.message
    });
  }
);

/* =========================================================
   START
========================================================= */

app.listen(
  PORT,
  () => {
    console.log(
      `Mahalaxmi CRM running on port ${PORT}`
    );
  }
);
