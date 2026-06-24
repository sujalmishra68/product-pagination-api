import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "https://product-pagination-api.onrender.com";

const categories = [
  "All",
  "Electronics",
  "Fashion",
  "Books",
  "Home",
  "Sports",
  "Beauty",
  "Toys",
  "Grocery",
];

function App() {
  const [products, setProducts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "Electronics",
    price: "",
  });

  const fetchProducts = async (loadMore = false) => {
    try {
      setLoading(true);
      setError("");

      const params = { limit: 8 };

      if (selectedCategory !== "All") {
        params.category = selectedCategory;
      }

      if (loadMore && nextCursor) {
        params.cursor = nextCursor;
        params.snapshot = snapshot;
      }

      const response = await axios.get(`${API_URL}/products`, { params });

      if (loadMore) {
        setProducts((previousProducts) => [
          ...previousProducts,
          ...response.data.items,
        ]);
      } else {
        setProducts(response.data.items);
      }

      setNextCursor(response.data.nextCursor);
      setSnapshot(response.data.snapshot);
    } catch (err) {
      console.error("Fetch products error:", err);
      setError(
        "Could not load products. The deployed API may be waking up. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(false);
  }, [selectedCategory]);

  const openAddForm = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      category: "Electronics",
      price: "",
    });
    setShowForm(true);
  };

  const openEditForm = (product) => {
    setEditingProduct(product);

    setFormData({
      name: product.name,
      category: product.category,
      price: product.price,
    });

    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProduct(null);
    setOpenMenuId(null);

    setFormData({
      name: "",
      category: "Electronics",
      price: "",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      const productPayload = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        price: Number(formData.price),
      };

      if (editingProduct) {
        await axios.patch(
          `${API_URL}/products/${editingProduct.id}`,
          productPayload
        );
      } else {
        await axios.post(`${API_URL}/products`, productPayload);
      }

      closeForm();
      await fetchProducts(false);
    } catch (err) {
      console.error("Save product error:", err);

      setError(
        editingProduct
          ? "Product could not be updated. Try again."
          : "Product could not be created. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    const confirmed = window.confirm(
      "Delete this product permanently? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setError("");

      await axios.delete(`${API_URL}/products/${productId}`);

      setProducts((currentProducts) =>
        currentProducts.filter((product) => product.id !== productId)
      );

      setOpenMenuId(null);
    } catch (err) {
      console.error("Delete product error:", err);

      setError(
        "Product could not be deleted from the server. Refresh and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const scrollToDashboard = () => {
    document
      .getElementById("dashboard")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="app">
      {/* NAVBAR */}
      <nav className="navbar">
        <button className="brand" onClick={scrollToDashboard}>
          <span className="brand-icon">◈</span>
          Catalogly
        </button>

        <div className="nav-links">
          <button onClick={scrollToDashboard}>Dashboard</button>
          <a href="#features">Features</a>
          <a
            href="https://product-pagination-api.onrender.com/health"
            target="_blank"
            rel="noreferrer"
          >
            API Status
          </a>
        </div>

        <button className="nav-cta" onClick={openAddForm}>
          + Add Product
        </button>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        <div className="hero-copy">
          <p className="hero-badge">FULL-STACK PRODUCT MANAGEMENT</p>

          <h1>
            Manage products.
            <br />
            <span>Build faster.</span>
          </h1>

          <p className="hero-description">
            A modern product catalog dashboard powered by React, Express,
            PostgreSQL, and cursor-based pagination.
          </p>

          <div className="hero-buttons">
            <button className="primary-button" onClick={scrollToDashboard}>
              Explore Dashboard →
            </button>

            <a
              className="secondary-button"
              href="https://product-pagination-api.onrender.com/health"
              target="_blank"
              rel="noreferrer"
            >
              View Live API ↗
            </a>
          </div>

          <div className="hero-proof">
            <div>
              <strong>CRUD</strong>
              <span>Operations</span>
            </div>
            <div>
              <strong>Cursor</strong>
              <span>Pagination</span>
            </div>
            <div>
              <strong>Cloud</strong>
              <span>Deployed API</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="visual-glow"></div>

          <div className="floating-card card-one">
            <span className="mini-icon">⚡</span>
            <div>
              <strong>Fast browsing</strong>
              <p>Cursor pagination</p>
            </div>
          </div>

          <div className="dashboard-preview">
            <div className="preview-top">
              <span></span>
              <span></span>
              <span></span>
            </div>

            <div className="preview-title">
              <p>PRODUCT OVERVIEW</p>
              <h3>Catalog Dashboard</h3>
            </div>

            <div className="preview-stats">
              <div>
                <span>Products</span>
                <strong>{products.length || 8}</strong>
              </div>
              <div>
                <span>Categories</span>
                <strong>8</strong>
              </div>
            </div>

            <div className="preview-bars">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          <div className="floating-card card-two">
            <span className="mini-icon">✓</span>
            <div>
              <strong>Live API</strong>
              <p>Render + PostgreSQL</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section" id="features">
        <div className="section-heading">
          <p>BUILT LIKE A REAL PRODUCT</p>
          <h2>Not just another CRUD project.</h2>
        </div>

        <div className="features-grid">
          <article className="feature-card">
            <div className="feature-icon">↻</div>
            <h3>Cursor Pagination</h3>
            <p>
              Efficient loading using cursors and snapshots instead of slow
              offset pagination.
            </p>
          </article>

          <article className="feature-card">
            <div className="feature-icon">▣</div>
            <h3>Product CRUD</h3>
            <p>
              Create, edit, delete, and manage products through a clean React
              interface.
            </p>
          </article>

          <article className="feature-card">
            <div className="feature-icon">⌁</div>
            <h3>PostgreSQL Data</h3>
            <p>
              Products are stored securely in a PostgreSQL database through an
              Express REST API.
            </p>
          </article>

          <article className="feature-card">
            <div className="feature-icon">☁</div>
            <h3>Cloud Deployment</h3>
            <p>
              Backend deployed on Render and ready to integrate with a live
              frontend.
            </p>
          </article>
        </div>
      </section>

      {/* DASHBOARD */}
      <section className="dashboard-section" id="dashboard">
        <header className="hero dashboard-header">
          <div>
            <p className="eyebrow">LIVE PRODUCT INVENTORY</p>
            <h2>Product Catalog Dashboard</h2>
            <p className="subtitle">
              Browse, filter, create, edit, and manage your product catalog.
            </p>
          </div>

          <button className="primary-button" onClick={openAddForm}>
            + Add Product
          </button>
        </header>

        <section className="toolbar">
          <div className="category-list">
            {categories.map((category) => (
              <button
                key={category}
                className={`category-button ${
                  selectedCategory === category ? "active" : ""
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <button
            className="refresh-button"
            onClick={() => fetchProducts(false)}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </section>

        {error && <p className="error-message">{error}</p>}

        {loading && products.length === 0 ? (
          <div className="status-card">Loading products...</div>
        ) : (
          <>
            <section className="product-grid">
              {products.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-top">
                    <span className="category-tag">{product.category}</span>

                    <div className="product-actions">
                      <button
                        className="dots-button"
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === product.id ? null : product.id
                          )
                        }
                        aria-label={`Open actions for ${product.name}`}
                      >
                        ⋮
                      </button>

                      {openMenuId === product.id && (
                        <div className="action-menu">
                          <button
                            onClick={() => {
                              openEditForm(product);
                              setOpenMenuId(null);
                            }}
                          >
                            ✏️ Edit Product
                          </button>

                          <button
                            className="delete-option"
                            onClick={() => handleDelete(product.id)}
                          >
                            🗑 Delete Product
                          </button>
                        </div>
                      )}
                    </div>

                    <span className="product-id">#{product.id}</span>
                  </div>

                  <h3>{product.name}</h3>

                  <p className="price">
                    ₹{Number(product.price).toLocaleString("en-IN")}
                  </p>

                  <p className="date">
                    Updated:{" "}
                    {new Date(product.updated_at).toLocaleDateString("en-IN")}
                  </p>
                </article>
              ))}
            </section>

            {products.length === 0 && (
              <div className="status-card">
                No products found in this category.
              </div>
            )}

            {nextCursor && (
              <div className="load-more-container">
                <button
                  className="load-more-button"
                  onClick={() => fetchProducts(true)}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Load More Products"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* MODAL */}
      {showForm && (
        <div className="modal-overlay">
          <form className="product-form" onSubmit={handleSubmit}>
            <div className="form-header">
              <h2>{editingProduct ? "Edit Product" : "Add New Product"}</h2>

              <button
                type="button"
                className="close-button"
                onClick={closeForm}
              >
                ×
              </button>
            </div>

            <label>
              Product Name
              <input
                type="text"
                placeholder="Example: Wireless Headphones"
                value={formData.name}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    name: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Category
              <select
                value={formData.category}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    category: event.target.value,
                  })
                }
              >
                {categories
                  .filter((category) => category !== "All")
                  .map((category) => (
                    <option key={category}>{category}</option>
                  ))}
              </select>
            </label>

            <label>
              Price (₹)
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="999"
                value={formData.price}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    price: event.target.value,
                  })
                }
                required
              />
            </label>

            <button className="primary-button form-submit" type="submit">
              {editingProduct ? "Update Product" : "Create Product"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

export default App;