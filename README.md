# Product Pagination API

A backend API for browsing a large product catalog with fast cursor-based pagination, category filtering, and stable snapshot pagination.

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- node-postgres (`pg`)
- Nodemon

## Problem Solved

This project supports browsing more than 200,000 products in newest-first order.

It provides:

- Fast keyset/cursor pagination
- Category filtering
- Stable browsing sessions while new products are added
- Product creation and update APIs
- PostgreSQL composite indexes for fast queries
- Bulk product seed script

## Why Cursor Pagination?

Offset pagination such as `?page=1000` becomes slower for deep pages because the database has to skip many rows.

This project uses keyset pagination with:

```text
(updated_at, id)