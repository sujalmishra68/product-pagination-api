require("dotenv").config();

const pool = require("../src/db");

const TOTAL_PRODUCTS = 200000;
const BATCH_SIZE = 5000;

const categories = [
  "Electronics",
  "Fashion",
  "Books",
  "Home",
  "Sports",
  "Beauty",
  "Toys",
  "Grocery",
];

function randomDateWithinLastYear() {
  const now = Date.now();
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

  return new Date(
    oneYearAgo + Math.random() * (now - oneYearAgo)
  );
}

function createProduct(index) {
  const createdAt = randomDateWithinLastYear();

  return {
    name: `Product ${index}`,
    category: categories[index % categories.length],
    price: (Math.random() * 5000 + 50).toFixed(2),
    createdAt,
    updatedAt: createdAt,
  };
}

async function seedProducts() {
  const client = await pool.connect();

  try {
    console.log("Starting product seed...");

    await client.query("TRUNCATE TABLE products RESTART IDENTITY;");

    for (let start = 1; start <= TOTAL_PRODUCTS; start += BATCH_SIZE) {
      const products = [];

      for (
        let index = start;
        index < start + BATCH_SIZE && index <= TOTAL_PRODUCTS;
        index++
      ) {
        products.push(createProduct(index));
      }

      const values = [];
      const placeholders = [];

      products.forEach((product, i) => {
        const base = i * 5;

        placeholders.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`
        );

        values.push(
          product.name,
          product.category,
          product.price,
          product.createdAt,
          product.updatedAt
        );
      });

      const query = `
        INSERT INTO products (name, category, price, created_at, updated_at)
        VALUES ${placeholders.join(", ")}
      `;

      await client.query(query, values);

      console.log(
        `Inserted ${Math.min(start + BATCH_SIZE - 1, TOTAL_PRODUCTS)} / ${TOTAL_PRODUCTS}`
      );
    }

    console.log("Seeding completed successfully.");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedProducts();