const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

/* =========================================================
   MIDDLEWARE
========================================================= */

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

  const table = TABLE_ALIASES[normalized] || normalized;

  if (!ALLOWED_TABLES.includes(table)) {
    return null;
  }

  return table;
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

function sanitizeUser(row) {
  const copy = { ...row };

  delete copy.password;
  delete copy.password_hash;

  return copy;
}

/* =========================================================
   DATABASE SCHEMA
========================================================= */

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

/* =========================================================
   QUOTATION NUMBER
========================================================= */

async function generateQuotationNumber(connection = db) {
  const year = new Date().getFullYear();

  const prefix = `QTN-${year}-`;

  const [rows] = await connection.query(
    `
      SELECT quotation_number
      FROM quotations
      WHERE quotation_number LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [`${prefix}%`]
  );

  let nextNumber = 1;

  if (rows.length > 0 && rows[0].quotation_number) {
    const lastNumber = String(rows[0].quotation_number)
      .replace(prefix, "");

    const parsed = parseInt(lastNumber, 10);

    if (Number.isFinite(parsed)) {
      nextNumber = parsed + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

/* =========================================================
   CALCULATE INDIVIDUAL QUOTATION ITEM
========================================================= */

function calculateItem(item) {
  const quantity = numberValue(
    item.quantity ?? item.qty,
    0
  );

  const rate = numberValue(
    item.rate ?? item.price,
    0
  );

  const discountPercent = numberValue(
    item.discount_percent,
    0
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

  return {
    quantity,
    rate,
    discount_percent: discountPercent,
    gross_amount: grossAmount,
    discount_amount: discountAmount,
    net_amount: netAmount
  };
}

/* =========================================================
   CALCULATE COMPLETE QUOTATION
========================================================= */

function calculateQuotationFromItems(
  items = [],
  freight = 0,
  gstPercent = 18
) {
  let subtotal = 0;
  let totalItemDiscount = 0;

  for (const item of items) {
    const calculation = calculateItem(item);

    subtotal += calculation.gross_amount;
    totalItemDiscount += calculation.discount_amount;
  }

  subtotal = money(subtotal);
  totalItemDiscount = money(totalItemDiscount);

  freight = money(freight);
  gstPercent = numberValue(gstPercent, 18);

  const taxableAmount = money(
    subtotal -
    totalItemDiscount +
    freight
  );

  const gstAmount = money(
    taxableAmount * gstPercent / 100
  );

  const grandTotal = money(
    taxableAmount + gstAmount
  );

  return {
    subtotal,
    total_item_discount: totalItemDiscount,
    discount_amount: totalItemDiscount,
    discount: totalItemDiscount,
    freight,
    taxable_amount: taxableAmount,
    gst_percent: gstPercent,
    gst_amount: gstAmount,
    grand_total: grandTotal
  };
}

/* =========================================================
   GET QUOTATION ITEMS INTERNALLY
========================================================= */

async function getQuotationItems(quotationId) {
  const [rows] = await db.query(
    `
      SELECT *
      FROM quotation_items
      WHERE quotation_id = ?
      ORDER BY id ASC
    `,
    [quotationId]
  );

  return rows;
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
   API INFO
========================================================= */

app.get("/api", (req, res) => {
  res.json({
    success: true,

    application: "Mahalaxmi Enterprise AI CRM",

    version: "4.0",

    quotationFeatures: {
      individualProductDiscount: true,
      quotationItems: true,
      quotationDetails: true,
      quotationCalculation: true
    },

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

      quotations: {
        nextNumber:
          "GET /api/quotations/next-number",

        details:
          "GET /api/quotations/:id/details",

        items:
          "GET /api/quotations/:id/items",

        addItem:
          "POST /api/quotations/:id/items",

        calculate:
          "POST /api/quotations/calculate"
      }
    },

    tables: ALLOWED_TABLES
  });
});

/* =========================================================
   NEXT QUOTATION NUMBER
========================================================= */

app.get(
  "/api/quotations/next-number",
  async (req, res) => {
    try {
      const quotationNumber =
        await generateQuotationNumber();

      res.json({
        success: true,
        quotation_number: quotationNumber
      });
    } catch (error) {
      console.error(
        "NEXT QUOTATION NUMBER ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Unable to generate quotation number",
        error: error.message
      });
    }
  }
);

/* =========================================================
   CALCULATE QUOTATION
   FRONTEND CAN USE THIS BEFORE SAVING
========================================================= */

app.post(
  "/api/quotations/calculate",
  async (req, res) => {
    try {
      const body = req.body || {};

      const items = Array.isArray(body.items)
        ? body.items
        : [];

      const result =
        calculateQuotationFromItems(
          items,
          body.freight,
          body.gst_percent
        );

      res.json({
        success: true,
        calculation: result
      });
    } catch (error) {
      console.error(
        "QUOTATION CALCULATION ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to calculate quotation",
        error: error.message
      });
    }
  }
);

/* =========================================================
   QUOTATION DETAILS
   IMPORTANT:
   THIS ROUTE MUST COME BEFORE GENERIC /:table/:id
========================================================= */

app.get(
  "/api/quotations/:id/details",
  async (req, res) => {
    try {
      const quotationId = req.params.id;

      /* ---------------------------------------------
         GET QUOTATION
      --------------------------------------------- */

      const [quotationRows] =
        await db.query(
          `
            SELECT *
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

      const quotation =
        quotationRows[0];

      /* ---------------------------------------------
         GET ITEMS
      --------------------------------------------- */

      const items =
        await getQuotationItems(
          quotationId
        );

      /* ---------------------------------------------
         NORMALIZE ITEM DATA
      --------------------------------------------- */

      const normalizedItems =
        items.map(item => {
          const calculation =
            calculateItem(item);

          return {
            ...item,

            quantity:
              item.quantity ??
              item.qty ??
              calculation.quantity,

            rate:
              item.rate ??
              item.price ??
              calculation.rate,

            discount_percent:
              item.discount_percent ??
              0,

            discount_amount:
              item.discount_amount ??
              calculation.discount_amount,

            net_amount:
              item.net_amount ??
              calculation.net_amount
          };
        });

      /* ---------------------------------------------
         CALCULATE TOTALS FROM ITEMS
      --------------------------------------------- */

      const calculated =
        calculateQuotationFromItems(
          normalizedItems,
          quotation.freight,
          quotation.gst_percent
        );

      /* ---------------------------------------------
         RETURN EVERYTHING
      --------------------------------------------- */

      res.json({
        success: true,

        quotation: {
          ...quotation,

          subtotal:
            quotation.subtotal ??
            calculated.subtotal,

          discount_amount:
            calculated.total_item_discount,

          discount:
            calculated.total_item_discount,

          freight:
            calculated.freight,

          taxable_amount:
            calculated.taxable_amount,

          gst_percent:
            calculated.gst_percent,

          gst_amount:
            calculated.gst_amount,

          grand_total:
            calculated.grand_total
        },

        items: normalizedItems,

        item_count:
          normalizedItems.length,

        calculation: calculated
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
   GET QUOTATION ITEMS
========================================================= */

app.get(
  "/api/quotations/:id/items",
  async (req, res) => {
    try {
      const quotationId =
        req.params.id;

      const items =
        await getQuotationItems(
          quotationId
        );

      res.json({
        success: true,

        quotation_id:
          Number(quotationId),

        count:
          items.length,

        items
      });

    } catch (error) {
      console.error(
        "GET QUOTATION ITEMS ERROR:",
        error
      );

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
   ADD QUOTATION ITEM
========================================================= */

app.post(
  "/api/quotations/:id/items",
  async (req, res) => {
    try {
      const quotationId =
        req.params.id;

      /* ---------------------------------------------
         CHECK QUOTATION EXISTS
      --------------------------------------------- */

      const [quotationRows] =
        await db.query(
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
          message:
            "Quotation not found"
        });
      }

      let data = {
        ...(req.body || {})
      };

      /* ---------------------------------------------
         FIELD ALIASES
      --------------------------------------------- */

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

      if (
        data.qty !== undefined &&
        data.quantity === undefined
      ) {
        data.quantity =
          data.qty;
      }

      if (
        data.price !== undefined &&
        data.rate === undefined
      ) {
        data.rate =
          data.price;
      }

      /* Remove frontend aliases */

      delete data.name;
      delete data.product_name;
      delete data.qty;
      delete data.price;
      delete data.id;

      data.quotation_id =
        quotationId;

      /* ---------------------------------------------
         ITEM CALCULATION
      --------------------------------------------- */

      const calculation =
        calculateItem(data);

      data.quantity =
        calculation.quantity;

      data.rate =
        calculation.rate;

      data.discount_percent =
        calculation.discount_percent;

      /*
        Only add calculated fields
        if the database contains them.
      */

      const allowedColumns =
        await getColumnNames(
          "quotation_items"
        );

      if (
        allowedColumns.includes(
          "discount_amount"
        )
      ) {
        data.discount_amount =
          calculation.discount_amount;
      }

      if (
        allowedColumns.includes(
          "net_amount"
        )
      ) {
        data.net_amount =
          calculation.net_amount;
      }

      if (
        allowedColumns.includes(
          "gross_amount"
        )
      ) {
        data.gross_amount =
          calculation.gross_amount;
      }

      /* ---------------------------------------------
         VALIDATE
      --------------------------------------------- */

      const validation =
        await validateRequestColumns(
          "quotation_items",
          data
        );

      if (!validation.valid) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid quotation item field(s)",

          invalid_columns:
            validation.invalidColumns,

          allowed_columns:
            validation.allowedColumns
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

      const columnNames =
        columns
          .map(
            column =>
              `\`${column}\``
          )
          .join(", ");

      const sql = `
        INSERT INTO quotation_items
        (${columnNames})
        VALUES (${placeholders})
      `;

      const [result] =
        await db.query(
          sql,
          values
        );

      /* ---------------------------------------------
         RETURN CREATED ITEM
      --------------------------------------------- */

      const [createdRows] =
        await db.query(
          `
            SELECT *
            FROM quotation_items
            WHERE id = ?
            LIMIT 1
          `,
          [result.insertId]
        );

      res.status(201).json({
        success: true,

        message:
          "Quotation item created successfully",

        quotation_id:
          Number(quotationId),

        item_id:
          result.insertId,

        item:
          createdRows[0] || data,

        calculation
      });

    } catch (error) {
      console.error(
        "ADD QUOTATION ITEM ERROR:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          "Unable to create quotation item",

        error:
          error.message,

        code:
          error.code || null
      });
    }
  }
);

/* =========================================================
   CREATE GENERIC RECORD
   SPECIAL HANDLING FOR QUOTATIONS
========================================================= */

app.post(
  "/api/:table",
  async (req, res) => {
    try {
      const table =
        normalizeTableName(
          req.params.table
        );

      if (!table) {
        return res.status(400).json({
          success: false,
          message: "Invalid table",
          allowed_tables:
            ALLOWED_TABLES
        });
      }

      let data = {
        ...(req.body || {})
      };

      if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data) ||
        Object.keys(data).length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Request body is required"
        });
      }

      delete data.id;

      /* =============================================
         QUOTATION
      ============================================= */

      if (table === "quotations") {

        if (
          !data.quotation_number ||
          String(
            data.quotation_number
          ).trim() === ""
        ) {
          data.quotation_number =
            await generateQuotationNumber();
        }

        /* -----------------------------------------
           CALCULATE FROM FRONTEND ITEMS
        ----------------------------------------- */

        const frontendItems =
          Array.isArray(data.items)
            ? data.items
            : [];

        delete data.items;

        const calculation =
          calculateQuotationFromItems(
            frontendItems,
            data.freight,
            data.gst_percent
          );

        data.subtotal =
          calculation.subtotal;

        data.discount_amount =
          calculation.total_item_discount;

        data.discount =
          calculation.total_item_discount;

        data.freight =
          calculation.freight;

        data.taxable_amount =
          calculation.taxable_amount;

        data.gst_percent =
          calculation.gst_percent;

        data.gst_amount =
          calculation.gst_amount;

        data.grand_total =
          calculation.grand_total;

        /*
          Keep compatibility if database has
          discount_percent.
        */

        const quotationColumns =
          await getColumnNames(
            "quotations"
          );

        if (
          quotationColumns.includes(
            "discount_percent"
          )
        ) {
          data.discount_percent = 0;
        }

        if (!data.status) {
          data.status = "Draft";
        }

        /* -----------------------------------------
           CHECK DUPLICATE NUMBER
        ----------------------------------------- */

        const [duplicate] =
          await db.query(
            `
              SELECT id
              FROM quotations
              WHERE quotation_number = ?
              LIMIT 1
            `,
            [data.quotation_number]
          );

        if (duplicate.length > 0) {
          data.quotation_number =
            await generateQuotationNumber();
        }

        /* -----------------------------------------
           VALIDATE QUOTATION
        ----------------------------------------- */

        const validation =
          await validateRequestColumns(
            "quotations",
            data
          );

        if (!validation.valid) {
          return res.status(400).json({
            success: false,

            message:
              "Invalid quotation field(s)",

            invalid_columns:
              validation.invalidColumns,

            allowed_columns:
              validation.allowedColumns
          });
        }

        /* -----------------------------------------
           INSERT QUOTATION
        ----------------------------------------- */

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
              INSERT INTO quotations
              (${columnNames})
              VALUES (${placeholders})
            `,
            values
          );

        const quotationId =
          result.insertId;

        /* -----------------------------------------
           INSERT ITEMS
        ----------------------------------------- */

        const savedItems = [];

        for (
          const frontendItem
          of frontendItems
        ) {
          let item = {
            ...frontendItem,

            quotation_id:
              quotationId
          };

          if (
            item.name !== undefined &&
            item.description === undefined
          ) {
            item.description =
              item.name;
          }

          if (
            item.product_name !== undefined &&
            item.description === undefined
          ) {
            item.description =
              item.product_name;
          }

          if (
            item.qty !== undefined &&
            item.quantity === undefined
          ) {
            item.quantity =
              item.qty;
          }

          if (
            item.price !== undefined &&
            item.rate === undefined
          ) {
            item.rate =
              item.price;
          }

          delete item.id;
          delete item.name;
          delete item.product_name;
          delete item.qty;
          delete item.price;

          const itemCalculation =
            calculateItem(item);

          item.quantity =
            itemCalculation.quantity;

          item.rate =
            itemCalculation.rate;

          item.discount_percent =
            itemCalculation.discount_percent;

          const itemColumns =
            await getColumnNames(
              "quotation_items"
            );

          if (
            itemColumns.includes(
              "discount_amount"
            )
          ) {
            item.discount_amount =
              itemCalculation.discount_amount;
          }

          if (
            itemColumns.includes(
              "net_amount"
            )
          ) {
            item.net_amount =
              itemCalculation.net_amount;
          }

          if (
            itemColumns.includes(
              "gross_amount"
            )
          ) {
            item.gross_amount =
              itemCalculation.gross_amount;
          }

          const itemValidation =
            await validateRequestColumns(
              "quotation_items",
              item
            );

          if (
            !itemValidation.valid
          ) {
            console.error(
              "Skipping invalid quotation item:",
              itemValidation.invalidColumns
            );

            continue;
          }

          const itemCols =
            Object.keys(item);

          const itemValues =
            itemCols.map(
              column =>
                item[column]
            );

          const itemPlaceholders =
            itemCols
              .map(() => "?")
              .join(", ");

          const itemColumnNames =
            itemCols
              .map(
                column =>
                  `\`${column}\``
              )
              .join(", ");

          const [
            itemResult
          ] = await db.query(
            `
              INSERT INTO quotation_items
              (${itemColumnNames})
              VALUES (${itemPlaceholders})
            `,
            itemValues
          );

          savedItems.push({
            id:
              itemResult.insertId,

            ...item,

            discount_amount:
              itemCalculation.discount_amount,

            net_amount:
              itemCalculation.net_amount
          });
        }

        /* -----------------------------------------
           RETURN COMPLETE QUOTATION
        ----------------------------------------- */

        res.status(201).json({
          success: true,

          message:
            "Quotation created successfully",

          table,

          id:
            quotationId,

          quotation_number:
            data.quotation_number,

          item_count:
            savedItems.length,

          items:
            savedItems,

          calculation
        });

        return;
      }

      /* =============================================
         QUOTATION ITEMS THROUGH GENERIC ROUTE
      ============================================= */

      if (
        table === "quotation_items"
      ) {

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

        if (
          data.qty !== undefined &&
          data.quantity === undefined
        ) {
          data.quantity =
            data.qty;
        }

        if (
          data.price !== undefined &&
          data.rate === undefined
        ) {
          data.rate =
            data.price;
        }

        delete data.name;
        delete data.product_name;
        delete data.qty;
        delete data.price;

        const calculation =
          calculateItem(data);

        data.quantity =
          calculation.quantity;

        data.rate =
          calculation.rate;

        data.discount_percent =
          calculation.discount_percent;

        const itemColumns =
          await getColumnNames(
            "quotation_items"
          );

        if (
          itemColumns.includes(
            "discount_amount"
          )
        ) {
          data.discount_amount =
            calculation.discount_amount;
        }

        if (
          itemColumns.includes(
            "net_amount"
          )
        ) {
          data.net_amount =
            calculation.net_amount;
        }

        if (
          itemColumns.includes(
            "gross_amount"
          )
        ) {
          data.gross_amount =
            calculation.gross_amount;
        }
      }

      /* =============================================
         VALIDATE
      ============================================= */

      const validation =
        await validateRequestColumns(
          table,
          data
        );

      if (!validation.valid) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid column(s) supplied",

          table,

          invalid_columns:
            validation.invalidColumns,

          allowed_columns:
            validation.allowedColumns
        });
      }

      const columns =
        Object.keys(data);

      if (columns.length === 0) {
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
          `${table} record created successfully`,

        table,

        id:
          result.insertId
      });

    } catch (error) {
      console.error(
        "CREATE ERROR:",
        error
      );

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
  }
);

/* =========================================================
   GET TABLE RECORDS
========================================================= */

app.get(
  "/api/:table",
  async (req, res) => {
    try {
      const table =
        normalizeTableName(
          req.params.table
        );

      if (!table) {
        return res.status(400).json({
          success: false,
          message: "Invalid table",
          allowed_tables:
            ALLOWED_TABLES
        });
      }

      const [rows] =
        await db.query(
          `
            SELECT *
            FROM \`${table}\`
            ORDER BY id DESC
          `
        );

      res.json({
        success: true,

        table,

        count:
          rows.length,

        data:
          rows.map(row =>
            table === "users"
              ? sanitizeUser(row)
              : row
          )
      });

    } catch (error) {
      console.error(
        "GET TABLE ERROR:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          "Unable to fetch data",

        error:
          error.message
      });
    }
  }
);

/* =========================================================
   TABLE SCHEMA
========================================================= */

app.get(
  "/api/:table/schema",
  async (req, res) => {
    try {
      const table =
        normalizeTableName(
          req.params.table
        );

      if (!table) {
        return res.status(400).json({
          success: false,
          message: "Invalid table"
        });
      }

      const columns =
        await getTableColumns(
          table
        );

      res.json({
        success: true,

        table,

        columns
      });

    } catch (error) {
      console.error(
        "SCHEMA ERROR:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          "Unable to fetch schema",

        error:
          error.message
      });
    }
  }
);

/* =========================================================
   GET SINGLE RECORD
========================================================= */

app.get(
  "/api/:table/:id",
  async (req, res) => {
    try {
      const table =
        normalizeTableName(
          req.params.table
        );

      if (!table) {
        return res.status(400).json({
          success: false,
          message: "Invalid table"
        });
      }

      const [rows] =
        await db.query(
          `
            SELECT *
            FROM \`${table}\`
            WHERE id = ?
            LIMIT 1
          `,
          [req.params.id]
        );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,

          message:
            `${table} record not found`
        });
      }

      const record =
        table === "users"
          ? sanitizeUser(rows[0])
          : rows[0];

      res.json({
        success: true,

        table,

        data:
          record
      });

    } catch (error) {
      console.error(
        "GET SINGLE ERROR:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          "Unable to fetch record",

        error:
          error.message
      });
    }
  }
);

/* =========================================================
   UPDATE RECORD
========================================================= */

app.put(
  "/api/:table/:id",
  async (req, res) => {
    try {
      const table =
        normalizeTableName(
          req.params.table
        );

      if (!table) {
        return res.status(400).json({
          success: false,
          message: "Invalid table"
        });
      }

      let data = {
        ...(req.body || {})
      };

      delete data.id;

      /* ---------------------------------------------
         QUOTATION UPDATE
      --------------------------------------------- */

      if (
        table === "quotations"
      ) {

        const [existingRows] =
          await db.query(
            `
              SELECT *
              FROM quotations
              WHERE id = ?
              LIMIT 1
            `,
            [req.params.id]
          );

        if (
          existingRows.length === 0
        ) {
          return res.status(404).json({
            success: false,
            message:
              "Quotation not found"
          });
        }

        const existing =
          existingRows[0];

        const merged = {
          ...existing,
          ...data
        };

        /*
          If frontend sends items,
          recalculate quotation from items.
        */

        if (
          Array.isArray(
            data.items
          )
        ) {
          const items =
            data.items;

          delete data.items;

          const calculation =
            calculateQuotationFromItems(
              items,
              merged.freight,
              merged.gst_percent
            );

          data.subtotal =
            calculation.subtotal;

          data.discount_amount =
            calculation.total_item_discount;

          data.discount =
            calculation.total_item_discount;

          data.freight =
            calculation.freight;

          data.taxable_amount =
            calculation.taxable_amount;

          data.gst_percent =
            calculation.gst_percent;

          data.gst_amount =
            calculation.gst_amount;

          data.grand_total =
            calculation.grand_total;
        }
      }

      /* ---------------------------------------------
         QUOTATION ITEM UPDATE
      --------------------------------------------- */

      if (
        table ===
        "quotation_items"
      ) {

        if (
          data.qty !== undefined &&
          data.quantity === undefined
        ) {
          data.quantity =
            data.qty;
        }

        if (
          data.price !== undefined &&
          data.rate === undefined
        ) {
          data.rate =
            data.price;
        }

        delete data.qty;
        delete data.price;

        const calculation =
          calculateItem(
            data
          );

        const itemColumns =
          await getColumnNames(
            "quotation_items"
          );

        if (
          itemColumns.includes(
            "discount_amount"
          )
        ) {
          data.discount_amount =
            calculation.discount_amount;
        }

        if (
          itemColumns.includes(
            "net_amount"
          )
        ) {
          data.net_amount =
            calculation.net_amount;
        }

        if (
          itemColumns.includes(
            "gross_amount"
          )
        ) {
          data.gross_amount =
            calculation.gross_amount;
        }
      }

      /* ---------------------------------------------
         VALIDATE
      --------------------------------------------- */

      const validation =
        await validateRequestColumns(
          table,
          data
        );

      if (!validation.valid) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid column(s) supplied",

          invalid_columns:
            validation.invalidColumns,

          allowed_columns:
            validation.allowedColumns
        });
      }

      const columns =
        Object.keys(data);

      if (
        columns.length === 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "No updatable fields supplied"
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

      values.push(
        req.params.id
      );

      const [
        result
      ] = await db.query(
        `
          UPDATE \`${table}\`
          SET ${setClause}
          WHERE id = ?
        `,
        values
      );

      if (
        result.affectedRows === 0
      ) {
        return res.status(404).json({
          success: false,

          message:
            `${table} record not found`
        });
      }

      res.json({
        success: true,

        message:
          `${table} record updated successfully`,

        table,

        id:
          Number(req.params.id)
      });

    } catch (error) {
      console.error(
        "UPDATE ERROR:",
        error
      );

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
  }
);

/* =========================================================
   DELETE RECORD
========================================================= */

app.delete(
  "/api/:table/:id",
  async (req, res) => {
    try {
      const table =
        normalizeTableName(
          req.params.table
        );

      if (!table) {
        return res.status(400).json({
          success: false,
          message: "Invalid table"
        });
      }

      /*
        If deleting a quotation,
        delete its items first.
      */

      if (
        table === "quotations"
      ) {
        await db.query(
          `
            DELETE FROM quotation_items
            WHERE quotation_id = ?
          `,
          [req.params.id]
        );
      }

      const [
        result
      ] = await db.query(
        `
          DELETE FROM \`${table}\`
          WHERE id = ?
        `,
        [req.params.id]
      );

      if (
        result.affectedRows === 0
      ) {
        return res.status(404).json({
          success: false,

          message:
            `${table} record not found`
        });
      }

      res.json({
        success: true,

        message:
          `${table} record deleted successfully`,

        table,

        id:
          Number(req.params.id)
      });

    } catch (error) {
      console.error(
        "DELETE ERROR:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          "Unable to delete record",

        error:
          error.message,

        code:
          error.code || null
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
    ),
    error => {
      if (error) {
        res.send(`
          <h1>Mahalaxmi Enterprise AI CRM</h1>
          <p>CRM server is running.</p>
        `);
      }
    }
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
   GLOBAL ERROR HANDLER
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
   START SERVER
========================================================= */

app.listen(
  PORT,
  () => {
    console.log(
      `Mahalaxmi CRM running on port ${PORT}`
    );
  }
);
