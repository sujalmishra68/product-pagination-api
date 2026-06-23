require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const { encodeCursor, decodeCursor } = require("./cursor");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

function isValidCursorData(data) {
  return (
    data &&
    typeof data.updatedAt === "string" &&
    data.updatedAt.length > 0 &&
    data.id !== undefined &&
    data.id !== null
  );
}

app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS database_time");

    res.status(200).json({
      status: "ok",
      message: "Product Pagination API is running",
      databaseTime: result.rows[0].database_time,
    });
  } catch (error) {
    console.error("Health check failed:", error.message);

    res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

app.get("/products", async (req, res) => {
  try {
    const rawLimit = Number(req.query.limit) || 20;
    const limit = Math.min(Math.max(rawLimit, 1), 100);

    const category = req.query.category?.trim();
    const cursor = req.query.cursor;
    const snapshot = req.query.snapshot;

    let cursorData = null;
    let snapshotData = null;

    // Decode next-page cursor only when it is sent by client
    if (cursor) {
      cursorData = decodeCursor(cursor);

      if (!isValidCursorData(cursorData)) {
        return res.status(400).json({ message: "Invalid cursor" });
      }

      cursorData.id = Number(cursorData.id);
    }

    // Decode existing browsing-session snapshot
    if (snapshot) {
      snapshotData = decodeCursor(snapshot);

      if (!isValidCursorData(snapshotData)) {
        return res.status(400).json({ message: "Invalid snapshot" });
      }

      snapshotData.id = Number(snapshotData.id);
    } else {
      // First page: capture stable upper boundary.
      // updated_at_text preserves PostgreSQL microseconds exactly.
      const newestResult = await pool.query(`
        SELECT
          id,
          to_char(
            updated_at AT TIME ZONE 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
          ) AS updated_at_text
        FROM products
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
      `);

      if (newestResult.rows.length > 0) {
        snapshotData = {
          updatedAt: newestResult.rows[0].updated_at_text,
          id: Number(newestResult.rows[0].id),
        };
      }
    }

    const values = [];
    const conditions = [];

    if (category) {
      values.push(category);
      conditions.push(`category = $${values.length}`);
    }

    // Include the snapshot product itself.
    if (snapshotData) {
      values.push(snapshotData.updatedAt, snapshotData.id);

      conditions.push(
        `(updated_at, id) <= ($${values.length - 1}::timestamptz, $${values.length}::bigint)`
      );
    }

    // Exclude records already returned on previous page.
    if (cursorData) {
      values.push(cursorData.updatedAt, cursorData.id);

      conditions.push(
        `(updated_at, id) < ($${values.length - 1}::timestamptz, $${values.length}::bigint)`
      );
    }

    values.push(limit + 1);

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const query = `
      SELECT
        id,
        name,
        category,
        price,
        created_at,
        updated_at,
        to_char(
          updated_at AT TIME ZONE 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
        ) AS updated_at_cursor
      FROM products
      ${whereClause}
      ORDER BY updated_at DESC, id DESC
      LIMIT $${values.length}
    `;

    const result = await pool.query(query, values);

    const hasMore = result.rows.length > limit;
    const products = hasMore
      ? result.rows.slice(0, limit)
      : result.rows;

    const lastProduct = products[products.length - 1];

    const nextCursor =
      hasMore && lastProduct
        ? encodeCursor({
            updatedAt: lastProduct.updated_at_cursor,
            id: Number(lastProduct.id),
          })
        : null;

    // Remove internal field before sending API response.
    const responseProducts = products.map((product) => {
      const { updated_at_cursor, ...productData } = product;
      return productData;
    });

    const snapshotToken = snapshotData
      ? encodeCursor(snapshotData)
      : null;

    res.status(200).json({
      count: responseProducts.length,
      hasMore,
      snapshot: snapshotToken,
      nextCursor,
      items: responseProducts,
    });
  } catch (error) {
    console.error("Get products failed:", error);

    res.status(500).json({
      message: "Failed to fetch products",
    });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const result = await pool.query(
      `
        SELECT id, name, category, price, created_at, updated_at
        FROM products
        WHERE id = $1
      `,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Get product failed:", error);
    res.status(500).json({ message: "Failed to fetch product" });
  }
});

app.post("/products", async (req, res) => {
  try {
    const { name, category, price } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({
        message: "name, category and price are required",
      });
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        message: "price must be a valid non-negative number",
      });
    }

    const result = await pool.query(
      `
        INSERT INTO products (name, category, price, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id, name, category, price, created_at, updated_at
      `,
      [name.trim(), category.trim(), numericPrice]
    );

    res.status(201).json({
      message: "Product created",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Create product failed:", error);
    res.status(500).json({ message: "Failed to create product" });
  }
});

app.patch("/products/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const { name, category, price } = req.body;

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    if (name === undefined && category === undefined && price === undefined) {
      return res.status(400).json({
        message: "Provide at least one field: name, category, or price",
      });
    }

    if (price !== undefined) {
      const numericPrice = Number(price);

      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        return res.status(400).json({
          message: "price must be a valid non-negative number",
        });
      }
    }

    const result = await pool.query(
      `
        UPDATE products
        SET
          name = COALESCE($1, name),
          category = COALESCE($2, category),
          price = COALESCE($3, price),
          updated_at = NOW()
        WHERE id = $4
        RETURNING id, name, category, price, created_at, updated_at
      `,
      [
        name?.trim(),
        category?.trim(),
        price !== undefined ? Number(price) : null,
        productId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      message: "Product updated",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Update product failed:", error);
    res.status(500).json({ message: "Failed to update product" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});