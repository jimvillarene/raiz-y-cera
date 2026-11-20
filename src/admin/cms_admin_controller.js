/**
 * """
 * Module: cms_admin_controller
 * Description: Object-oriented WordPress-style CMS administrator dashboard controller
 *              for the Raíz y Cera platform. Enables visual editing of announcement bars,
 *              hero carrusels, products, variants, customization toggles, fragrance library,
 *              editorial blog posts, shipping rates ($600 default threshold), Stripe/Shopify/
 *              Etsy integrations, 1-click JSON backups, and official Shopify/Etsy CSV exports.
 *
 * Author: Antigravity AI Agent
 * License: Proprietary / Internal
 *
 * Version History:
 * - v1.0.0 | 2026-11-20 | Initial OOP implementation of CMSAdminController
 * """
 */

import { CMSRepository } from "../services/cms_repository.js";
import { MarketplaceExporter } from "../services/marketplace_exporter.js";

/**
 * Controller orchestrating the WordPress-style admin panel dashboard and CRUD operations.
 */
export class CMSAdminController {
  constructor() {
    /** @private @type {CMSRepository} */
    this._repository = new CMSRepository();
    /** @private @type {Object|null} */
    this._state = null;
    /** @private @type {string} */
    this._activeTab = "dashboard";
    /** @private @type {string|null} */
    this._editingProductId = null;
    /** @private @type {string|null} */
    this._editingFragranceId = null;
  }

  /**
   * Initializes the CMS administration interface.
   * @returns {Promise<void>}
   */
  async init() {
    this._state = await this._repository.loadState();
    this._bindNavigationEvents();
    this._bindActionEvents();
    this.switchTab("dashboard");
  }

  /**
   * Switches the active admin tab and triggers the respective view render.
   * @param {string} tabName
   */
  switchTab(tabName) {
    this._activeTab = tabName;
    document.querySelectorAll(".admin-nav-item").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.tab === tabName);
    });
    document.querySelectorAll(".admin-tab-pane").forEach((pane) => {
      pane.hidden = pane.id !== `tab-${tabName}`;
    });

    switch (tabName) {
      case "dashboard":
        this._renderDashboard();
        break;
      case "carousel":
        this._renderCarouselEditor();
        break;
      case "products":
        this._renderProductsManager();
        break;
      case "fragrances":
        this._renderFragranceManager();
        break;
      case "blog":
        this._renderBlogManager();
        break;
      case "settings":
        this._renderSettingsForm();
        break;
      case "integrations":
        this._renderIntegrationsForm();
        break;
    }
  }

  /**
   * Renders the CMS Dashboard overview metrics, recent activity, and quick actions.
   * @private
   */
  _renderDashboard() {
    const productsCountEl = document.getElementById("metric-products-count");
    const fragrancesCountEl = document.getElementById("metric-fragrances-count");
    const collectionsCountEl = document.getElementById("metric-collections-count");
    const thresholdEl = document.getElementById("metric-free-shipping");

    if (productsCountEl) productsCountEl.textContent = String(this._state.products.length);
    if (fragrancesCountEl) fragrancesCountEl.textContent = String(this._state.fragrances.length);
    if (collectionsCountEl) collectionsCountEl.textContent = String(this._state.collections.length);
    if (thresholdEl) thresholdEl.textContent = `$${this._state.siteConfig.freeShippingThreshold || 600} MXN`;

    const recentList = document.getElementById("dashboard-products-summary");
    if (recentList) {
      recentList.innerHTML = this._state.products
        .slice(0, 6)
        .map(
          (p) => `
          <div class="dash-summary-row">
            <img src="${this._escapeHtml(p.primaryImage || p.images[0])}" class="dash-thumb" alt="" />
            <div class="dash-summary-info">
              <strong>${this._escapeHtml(p.title)}</strong>
              <span>${this._escapeHtml(p.category)} · Desde $${p.basePrice} MXN</span>
            </div>
            <span class="dash-badge ${p.customizable.enabled ? "badge-custom" : "badge-std"}">
              ${p.customizable.enabled ? "✦ Personalizable" : "Estándar"}
            </span>
          </div>
        `
        )
        .join("");
    }
  }

  /**
   * Renders the Hero Carousel slide editor.
   * @private
   */
  _renderCarouselEditor() {
    const list = document.getElementById("carousel-slides-list");
    if (!list) return;

    list.innerHTML = this._state.heroCarousel
      .map(
        (slide, idx) => `
        <div class="admin-card slide-edit-card" data-slide-index="${idx}">
          <div class="slide-card-header">
            <h4>Diapositiva ${idx + 1}: ${this._escapeHtml(slide.title)}</h4>
            <label class="switch-label">
              <input type="checkbox" class="js-slide-active-toggle" ${slide.active !== false ? "checked" : ""} /> Activa
            </label>
          </div>
          <div class="admin-form-grid">
            <div class="form-group">
              <label>Badge Superior:</label>
              <input type="text" class="admin-input js-slide-badge" value="${this._escapeHtml(slide.badge)}" />
            </div>
            <div class="form-group">
              <label>Título Principal:</label>
              <input type="text" class="admin-input js-slide-title" value="${this._escapeHtml(slide.title)}" />
            </div>
            <div class="form-group full-width">
              <label>Subtítulo / Bajada Editorial:</label>
              <textarea class="admin-textarea js-slide-subtitle">${this._escapeHtml(slide.subtitle)}</textarea>
            </div>
            <div class="form-group">
              <label>Texto Botón Primario:</label>
              <input type="text" class="admin-input js-slide-cta-text" value="${this._escapeHtml(slide.ctaPrimaryText)}" />
            </div>
            <div class="form-group">
              <label>Colección Vinculada:</label>
              <select class="admin-select js-slide-col-id">
                ${this._state.collections
                  .map(
                    (c) => `<option value="${this._escapeHtml(c.id)}" ${c.id === slide.ctaPrimaryCollection ? "selected" : ""}>${this._escapeHtml(c.name)}</option>`
                  )
                  .join("")}
              </select>
            </div>
            <div class="form-group">
              <label>Ruta de Imagen:</label>
              <input type="text" class="admin-input js-slide-image" value="${this._escapeHtml(slide.image)}" />
            </div>
            <div class="form-group">
              <label>Paleta de Color:</label>
              <select class="admin-select js-slide-theme">
                <option value="warm-terracotta" ${slide.theme === "warm-terracotta" ? "selected" : ""}>Otoño Terracota</option>
                <option value="light-gold" ${slide.theme === "light-gold" ? "selected" : ""}>Dorado Invierno</option>
                <option value="amber-shadow" ${slide.theme === "amber-shadow" ? "selected" : ""}>Ámbar Ofrenda</option>
              </select>
            </div>
          </div>
        </div>
      `
      )
      .join("");
  }

  /**
   * Renders the Products Manager table and binds product modal editing.
   * @private
   */
  _renderProductsManager() {
    const tableBody = document.getElementById("admin-products-table-body");
    if (!tableBody) return;

    tableBody.innerHTML = this._state.products
      .map(
        (product) => `
        <tr data-product-id="${this._escapeHtml(product.id)}">
          <td>
            <img src="${this._escapeHtml(product.primaryImage)}" class="admin-product-thumb" alt="" />
          </td>
          <td>
            <strong>${this._escapeHtml(product.title)}</strong><br/>
            <small class="text-muted">Slug: ${this._escapeHtml(product.slug || product.id)}</small>
          </td>
          <td>${this._escapeHtml(product.collectionId)}</td>
          <td>${this._escapeHtml(product.category)}</td>
          <td>$${product.basePrice} MXN (${product.variants.length} var.)</td>
          <td>
            ${
              product.customizable.enabled
                ? `<span class="badge badge-success">✦ Personalizable</span>`
                : `<span class="badge badge-secondary">Estándar</span>`
            }
          </td>
          <td>
            ${product.bestseller ? `<span class="badge badge-warning">★ Bestseller</span>` : "—"}
          </td>
          <td>
            <div class="admin-row-actions">
              <button type="button" class="btn btn-sm btn-outline js-edit-product" data-product-id="${this._escapeHtml(product.id)}">Editar</button>
              <button type="button" class="btn btn-sm btn-danger js-delete-product" data-product-id="${this._escapeHtml(product.id)}">Eliminar</button>
            </div>
          </td>
        </tr>
      `
      )
      .join("");
  }

  /**
   * Renders the Fragrance Library & Olfactory Pyramid manager table.
   * @private
   */
  _renderFragranceManager() {
    const tableBody = document.getElementById("admin-fragrances-table-body");
    if (!tableBody) return;

    tableBody.innerHTML = this._state.fragrances
      .map(
        (frag) => `
        <tr data-fragrance-id="${this._escapeHtml(frag.id)}">
          <td><strong>${this._escapeHtml(frag.name)}</strong></td>
          <td><span class="badge badge-primary">${this._escapeHtml(frag.family)}</span></td>
          <td>${this._escapeHtml(frag.season)}</td>
          <td>${"●".repeat(frag.intensity)}</td>
          <td>
            <small>
              ▲ ${this._escapeHtml(frag.notes.top.join(", "))}<br/>
              ◆ ${this._escapeHtml(frag.notes.heart.join(", "))}<br/>
              ▼ ${this._escapeHtml(frag.notes.base.join(", "))}
            </small>
          </td>
          <td>
            <div class="admin-row-actions">
              <button type="button" class="btn btn-sm btn-outline js-edit-fragrance" data-fragrance-id="${this._escapeHtml(frag.id)}">Editar</button>
              <button type="button" class="btn btn-sm btn-danger js-delete-fragrance" data-fragrance-id="${this._escapeHtml(frag.id)}">Eliminar</button>
            </div>
          </td>
        </tr>
      `
      )
      .join("");
  }

  /**
   * Renders the Editorial Blog & Candle Care post manager.
   * @private
   */
  _renderBlogManager() {
    const list = document.getElementById("admin-blog-list");
    if (!list) return;

    list.innerHTML = (this._state.blogPosts || [])
      .map(
        (post, idx) => `
        <div class="admin-card blog-edit-card" data-blog-index="${idx}">
          <div class="slide-card-header">
            <h4>${this._escapeHtml(post.title)}</h4>
            <span class="badge badge-primary">${this._escapeHtml(post.category)}</span>
          </div>
          <div class="admin-form-grid">
            <div class="form-group full-width">
              <label>Título del Artículo:</label>
              <input type="text" class="admin-input js-post-title" value="${this._escapeHtml(post.title)}" />
            </div>
            <div class="form-group">
              <label>Categoría:</label>
              <input type="text" class="admin-input js-post-category" value="${this._escapeHtml(post.category)}" />
            </div>
            <div class="form-group">
              <label>Tiempo de Lectura:</label>
              <input type="text" class="admin-input js-post-readtime" value="${this._escapeHtml(post.readTime || "3 min")}" />
            </div>
            <div class="form-group full-width">
              <label>Extracto Breve:</label>
              <textarea class="admin-textarea js-post-excerpt">${this._escapeHtml(post.excerpt)}</textarea>
            </div>
            <div class="form-group full-width">
              <label>Contenido Completo:</label>
              <textarea class="admin-textarea js-post-content" rows="6">${this._escapeHtml(post.content)}</textarea>
            </div>
          </div>
        </div>
      `
      )
      .join("");
  }

  /**
   * Populates the General Settings form (brand name, slogans, shipping rates, contacts).
   * @private
   */
  _renderSettingsForm() {
    const cfg = this._state.siteConfig;
    this._setVal("cfg-brand-name", cfg.brandName);
    this._setVal("cfg-tagline", cfg.tagline);
    this._setVal("cfg-subtitle", cfg.subtitle);
    this._setVal("cfg-free-shipping", cfg.freeShippingThreshold ?? 600);
    this._setVal("cfg-shipping-rate", cfg.standardShippingRate ?? 120);
    this._setVal("cfg-whatsapp", cfg.contact?.whatsappNumber ?? "5527026347");
    this._setVal("cfg-instagram", cfg.contact?.instagramHandle ?? "@raizycera");
    this._setVal("cfg-email", cfg.contact?.email ?? "hola@raizycera.mx");

    const bars = cfg.announcementBars || [];
    this._setVal("cfg-announcement-1", bars[0] || "");
    this._setVal("cfg-announcement-2", bars[1] || "");
    this._setVal("cfg-announcement-3", bars[2] || "");
  }

  /**
   * Populates the Integrations settings form (Stripe keys, Shopify domain, Etsy shop).
   * @private
   */
  _renderIntegrationsForm() {
    const integ = this._state.siteConfig.integrations || {};
    this._setVal("int-stripe-mode", integ.stripe?.mode || "sandbox");
    this._setVal("int-stripe-pk", integ.stripe?.publishableKey || "");
    this._setVal("int-stripe-payment-link", integ.stripe?.defaultPaymentLink || "");
    this._setVal("int-shopify-domain", integ.shopify?.storeDomain || "raiz-y-cera.myshopify.com");
    this._setVal("int-shopify-url", integ.shopify?.storefrontUrl || "");
    this._setVal("int-etsy-shop", integ.etsy?.shopName || "RaizYCeraAtelier");
    this._setVal("int-etsy-url", integ.etsy?.shopUrl || "");
  }

  /**
   * Binds admin navigation sidebar links.
   * @private
   */
  _bindNavigationEvents() {
    document.querySelectorAll(".admin-nav-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.switchTab(btn.dataset.tab);
      });
    });
  }

  /**
   * Binds global save, export, reset, and modal events.
   * @private
   */
  _bindActionEvents() {
    // 1-Click Save Changes
    document.getElementById("btn-admin-save-all")?.addEventListener("click", () => {
      this._saveAllChanges();
    });

    // 1-Click Download JSON Backup
    document.getElementById("btn-admin-export-json")?.addEventListener("click", () => {
      this._gatherFormState();
      this._repository.exportToJsonFile(this._state);
    });

    // 1-Click Restore JSON Seed
    document.getElementById("btn-admin-reset-seed")?.addEventListener("click", async () => {
      if (confirm("¿Deseas restablecer todos los datos a la versión original de catálogo?")) {
        this._state = await this._repository.resetToSeed();
        alert("Catálogo restablecido con éxito.");
        this.switchTab(this._activeTab);
      }
    });

    // Export Shopify CSV
    document.getElementById("btn-export-shopify-csv")?.addEventListener("click", () => {
      const csv = MarketplaceExporter.toShopifyCSV(this._state.products, this._state.fragrances);
      MarketplaceExporter.downloadCSV(csv, "raiz-y-cera-shopify-catalog.csv");
    });

    // Export Etsy CSV
    document.getElementById("btn-export-etsy-csv")?.addEventListener("click", () => {
      const csv = MarketplaceExporter.toEtsyCSV(this._state.products, this._state.fragrances);
      MarketplaceExporter.downloadCSV(csv, "raiz-y-cera-etsy-catalog.csv");
    });

    // Product Modal Triggers
    document.getElementById("btn-admin-add-product")?.addEventListener("click", () => {
      this._openProductEditModal(null);
    });

    document.getElementById("admin-products-table-body")?.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".js-edit-product");
      if (editBtn) {
        this._openProductEditModal(editBtn.dataset.productId);
        return;
      }
      const delBtn = e.target.closest(".js-delete-product");
      if (delBtn) {
        if (confirm("¿Estás seguro de eliminar este producto del catálogo?")) {
          this._deleteProduct(delBtn.dataset.productId);
        }
      }
    });

    // Fragrance Modal Triggers
    document.getElementById("btn-admin-add-fragrance")?.addEventListener("click", () => {
      this._openFragranceEditModal(null);
    });

    document.getElementById("admin-fragrances-table-body")?.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".js-edit-fragrance");
      if (editBtn) {
        this._openFragranceEditModal(editBtn.dataset.fragranceId);
        return;
      }
      const delBtn = e.target.closest(".js-delete-fragrance");
      if (delBtn) {
        if (confirm("¿Estás seguro de eliminar este aroma de la biblioteca?")) {
          this._deleteFragrance(delBtn.dataset.fragranceId);
        }
      }
    });

    // Modal Close buttons
    document.getElementById("admin-product-modal-close")?.addEventListener("click", () => {
      this._closeProductEditModal();
    });
    document.getElementById("admin-fragrance-modal-close")?.addEventListener("click", () => {
      this._closeFragranceEditModal();
    });

    // Save Product Form
    document.getElementById("admin-product-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this._saveProductFromModal();
    });

    // Save Fragrance Form
    document.getElementById("admin-fragrance-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this._saveFragranceFromModal();
    });
  }

  /**
   * Opens the product editing modal for creating or updating a product.
   * @private
   * @param {string|null} productId
   */
  _openProductEditModal(productId) {
    this._editingProductId = productId;
    const modal = document.getElementById("admin-product-modal");
    const titleEl = document.getElementById("admin-product-modal-title");
    if (!modal) return;

    const product = productId ? this._state.products.find((p) => p.id === productId) : null;
    if (titleEl) {
      titleEl.textContent = product ? `Editar Producto: ${product.title}` : "Agregar Nuevo Producto al Catálogo";
    }

    this._setVal("prod-edit-id", product ? product.id : `prod-${Date.now()}`);
    this._setVal("prod-edit-title", product ? product.title : "");
    this._setVal("prod-edit-category", product ? product.category : "Velas Artesanales");
    this._setVal("prod-edit-short-desc", product ? product.shortDescription : "");
    this._setVal("prod-edit-desc", product ? product.description : "");
    this._setVal("prod-edit-image", product ? product.primaryImage : "assets/images/products/");
    this._setVal("prod-edit-wax-type", product ? product.craftsmanshipDetails?.waxType : "100% Cera de Soya Natural");
    this._setVal("prod-edit-dimensions", product ? product.craftsmanshipDetails?.dimensions : "");
    this._setVal("prod-edit-burntime", product ? product.craftsmanshipDetails?.burnTime : "");

    // Collection select
    const colSelect = document.getElementById("prod-edit-collection");
    if (colSelect) {
      colSelect.innerHTML = this._state.collections
        .map(
          (c) => `<option value="${this._escapeHtml(c.id)}" ${product && product.collectionId === c.id ? "selected" : ""}>${this._escapeHtml(c.name)}</option>`
        )
        .join("");
    }

    // Customization toggle and inputs
    const customToggle = document.getElementById("prod-edit-custom-toggle");
    const customBox = document.getElementById("prod-edit-custom-details-box");
    if (customToggle) {
      customToggle.checked = Boolean(product?.customizable?.enabled);
      if (customBox) customBox.hidden = !customToggle.checked;
      customToggle.onchange = () => {
        if (customBox) customBox.hidden = !customToggle.checked;
      };
    }
    this._setVal("prod-edit-custom-label", product?.customizable?.label || "Texto para personalización");
    this._setVal("prod-edit-custom-placeholder", product?.customizable?.placeholder || "Ej. Para mamá con cariño...");
    this._setVal("prod-edit-custom-max", product?.customizable?.maxLength || 80);

    // Variants JSON editor
    const variantsVal = product ? JSON.stringify(product.variants, null, 2) : JSON.stringify([
      { id: "var-1", name: "Estándar", price: 250, sku: "RC-PROD-01", dimensions: "10 cm", image: "assets/images/products/" }
    ], null, 2);
    this._setVal("prod-edit-variants-json", variantsVal);

    // Allowed fragrances multiselect checkboxes
    const fragContainer = document.getElementById("prod-edit-fragrances-checks");
    if (fragContainer) {
      const allowed = new Set(product?.allowedFragrances || []);
      fragContainer.innerHTML = this._state.fragrances
        .map(
          (f) => `
          <label class="check-inline">
            <input type="checkbox" name="allowedFragrance" value="${this._escapeHtml(f.id)}" ${allowed.has(f.id) ? "checked" : ""} />
            ${this._escapeHtml(f.name)} (${this._escapeHtml(f.family)})
          </label>
        `
        )
        .join("");
    }

    // Bestseller and external links
    const bestToggle = document.getElementById("prod-edit-bestseller");
    if (bestToggle) bestToggle.checked = Boolean(product?.bestseller);
    this._setVal("prod-edit-shopify-url", product?.externalLinks?.shopifyProductUrl || "");
    this._setVal("prod-edit-etsy-url", product?.externalLinks?.etsyListingUrl || "");

    modal.hidden = false;
  }

  /**
   * Saves product data from the modal into the state.
   * @private
   */
  _saveProductFromModal() {
    const id = this._getVal("prod-edit-id").trim();
    const title = this._getVal("prod-edit-title").trim();
    if (!id || !title) {
      alert("El ID y el Título del producto son obligatorios.");
      return;
    }

    let parsedVariants = [];
    try {
      parsedVariants = JSON.parse(this._getVal("prod-edit-variants-json"));
    } catch (_err) {
      alert("El formato JSON de las presentaciones/variantes es inválido.");
      return;
    }

    const selectedFragrances = Array.from(
      document.querySelectorAll("input[name='allowedFragrance']:checked")
    ).map((cb) => cb.value);

    const isCustomizable = document.getElementById("prod-edit-custom-toggle")?.checked || false;

    const updatedProduct = {
      id,
      slug: id.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title,
      collectionId: this._getVal("prod-edit-collection"),
      category: this._getVal("prod-edit-category"),
      shortDescription: this._getVal("prod-edit-short-desc"),
      description: this._getVal("prod-edit-desc"),
      craftsmanshipDetails: {
        waxType: this._getVal("prod-edit-wax-type"),
        handmade: true,
        dimensions: this._getVal("prod-edit-dimensions"),
        burnTime: this._getVal("prod-edit-burntime"),
      },
      allowedFragrances: selectedFragrances,
      variants: parsedVariants,
      customizable: {
        enabled: isCustomizable,
        label: this._getVal("prod-edit-custom-label"),
        placeholder: this._getVal("prod-edit-custom-placeholder"),
        maxLength: Number(this._getVal("prod-edit-custom-max")) || 80,
      },
      images: [this._getVal("prod-edit-image")],
      externalLinks: {
        stripePriceId: "",
        stripePaymentLink: "",
        shopifyProductUrl: this._getVal("prod-edit-shopify-url"),
        etsyListingUrl: this._getVal("prod-edit-etsy-url"),
      },
      featured: true,
      bestseller: document.getElementById("prod-edit-bestseller")?.checked || false,
    };

    const existingIdx = this._state.products.findIndex((p) => p.id === id);
    if (existingIdx >= 0) {
      this._state.products[existingIdx] = updatedProduct;
    } else {
      this._state.products.push(updatedProduct);
    }

    this._closeProductEditModal();
    this._renderProductsManager();
    this._renderDashboard();
    this._saveAllChanges(false);
  }

  /**
   * Deletes a product from the local state.
   * @private
   * @param {string} productId
   */
  _deleteProduct(productId) {
    this._state.products = this._state.products.filter((p) => p.id !== productId);
    this._renderProductsManager();
    this._renderDashboard();
    this._saveAllChanges(false);
  }

  /**
   * @private
   */
  _closeProductEditModal() {
    const modal = document.getElementById("admin-product-modal");
    if (modal) modal.hidden = true;
    this._editingProductId = null;
  }

  /**
   * Opens the fragrance editor modal.
   * @private
   * @param {string|null} fragranceId
   */
  _openFragranceEditModal(fragranceId) {
    this._editingFragranceId = fragranceId;
    const modal = document.getElementById("admin-fragrance-modal");
    const titleEl = document.getElementById("admin-fragrance-modal-title");
    if (!modal) return;

    const frag = fragranceId ? this._state.fragrances.find((f) => f.id === fragranceId) : null;
    if (titleEl) {
      titleEl.textContent = frag ? `Editar Aroma: ${frag.name}` : "Agregar Nuevo Aroma a la Biblioteca";
    }

    this._setVal("frag-edit-id", frag ? frag.id : `aroma-${Date.now()}`);
    this._setVal("frag-edit-name", frag ? frag.name : "");
    this._setVal("frag-edit-family", frag ? frag.family : "Cálido & Especiado");
    this._setVal("frag-edit-season", frag ? frag.season : "Todo el Año");
    this._setVal("frag-edit-intensity", frag ? frag.intensity : 4);
    this._setVal("frag-edit-desc", frag ? frag.description : "");
    this._setVal("frag-edit-notes-top", frag ? frag.notes.top.join(", ") : "");
    this._setVal("frag-edit-notes-heart", frag ? frag.notes.heart.join(", ") : "");
    this._setVal("frag-edit-notes-base", frag ? frag.notes.base.join(", ") : "");

    modal.hidden = false;
  }

  /**
   * Saves fragrance data from modal into state.
   * @private
   */
  _saveFragranceFromModal() {
    const id = this._getVal("frag-edit-id").trim();
    const name = this._getVal("frag-edit-name").trim();
    if (!id || !name) {
      alert("El ID y el Nombre del aroma son requeridos.");
      return;
    }

    const updatedFragrance = {
      id,
      name,
      family: this._getVal("frag-edit-family"),
      season: this._getVal("frag-edit-season"),
      intensity: Number(this._getVal("frag-edit-intensity")) || 4,
      notes: {
        top: this._getVal("frag-edit-notes-top").split(",").map((s) => s.trim()).filter(Boolean),
        heart: this._getVal("frag-edit-notes-heart").split(",").map((s) => s.trim()).filter(Boolean),
        base: this._getVal("frag-edit-notes-base").split(",").map((s) => s.trim()).filter(Boolean),
      },
      description: this._getVal("frag-edit-desc"),
    };

    const existingIdx = this._state.fragrances.findIndex((f) => f.id === id);
    if (existingIdx >= 0) {
      this._state.fragrances[existingIdx] = updatedFragrance;
    } else {
      this._state.fragrances.push(updatedFragrance);
    }

    this._closeFragranceEditModal();
    this._renderFragranceManager();
    this._renderDashboard();
    this._saveAllChanges(false);
  }

  /**
   * Deletes a fragrance from the state.
   * @private
   * @param {string} fragranceId
   */
  _deleteFragrance(fragranceId) {
    this._state.fragrances = this._state.fragrances.filter((f) => f.id !== fragranceId);
    this._renderFragranceManager();
    this._renderDashboard();
    this._saveAllChanges(false);
  }

  /**
   * @private
   */
  _closeFragranceEditModal() {
    const modal = document.getElementById("admin-fragrance-modal");
    if (modal) modal.hidden = true;
    this._editingFragranceId = null;
  }

  /**
   * Reads and synchronizes all active form fields into the internal state.
   * @private
   */
  _gatherFormState() {
    if (!this._state) return;

    // Carousel slides
    document.querySelectorAll(".slide-edit-card").forEach((card) => {
      const idx = Number(card.dataset.slideIndex);
      const slide = this._state.heroCarousel[idx];
      if (slide) {
        slide.active = card.querySelector(".js-slide-active-toggle")?.checked ?? true;
        slide.badge = card.querySelector(".js-slide-badge")?.value || "";
        slide.title = card.querySelector(".js-slide-title")?.value || "";
        slide.subtitle = card.querySelector(".js-slide-subtitle")?.value || "";
        slide.ctaPrimaryText = card.querySelector(".js-slide-cta-text")?.value || "";
        slide.ctaPrimaryCollection = card.querySelector(".js-slide-col-id")?.value || "";
        slide.image = card.querySelector(".js-slide-image")?.value || "";
        slide.theme = card.querySelector(".js-slide-theme")?.value || "warm-terracotta";
      }
    });

    // Blog posts
    document.querySelectorAll(".blog-edit-card").forEach((card) => {
      const idx = Number(card.dataset.blogIndex);
      const post = this._state.blogPosts[idx];
      if (post) {
        post.title = card.querySelector(".js-post-title")?.value || "";
        post.category = card.querySelector(".js-post-category")?.value || "";
        post.readTime = card.querySelector(".js-post-readtime")?.value || "";
        post.excerpt = card.querySelector(".js-post-excerpt")?.value || "";
        post.content = card.querySelector(".js-post-content")?.value || "";
      }
    });

    // General settings
    const cfg = this._state.siteConfig;
    cfg.brandName = this._getVal("cfg-brand-name") || cfg.brandName;
    cfg.tagline = this._getVal("cfg-tagline") || cfg.tagline;
    cfg.subtitle = this._getVal("cfg-subtitle") || cfg.subtitle;
    cfg.freeShippingThreshold = Number(this._getVal("cfg-free-shipping")) || 600;
    cfg.standardShippingRate = Number(this._getVal("cfg-shipping-rate")) || 120;

    cfg.contact = cfg.contact || {};
    cfg.contact.whatsappNumber = this._getVal("cfg-whatsapp") || cfg.contact.whatsappNumber;
    cfg.contact.instagramHandle = this._getVal("cfg-instagram") || cfg.contact.instagramHandle;
    cfg.contact.email = this._getVal("cfg-email") || cfg.contact.email;

    cfg.announcementBars = [
      this._getVal("cfg-announcement-1"),
      this._getVal("cfg-announcement-2"),
      this._getVal("cfg-announcement-3"),
    ].filter(Boolean);

    // Integrations
    cfg.integrations = cfg.integrations || {};
    cfg.integrations.stripe = {
      mode: this._getVal("int-stripe-mode") || "sandbox",
      publishableKey: this._getVal("int-stripe-pk") || "",
      defaultPaymentLink: this._getVal("int-stripe-payment-link") || "",
      webhookEndpoint: "/api/stripe/checkout-session",
    };
    cfg.integrations.shopify = {
      enabled: true,
      storeDomain: this._getVal("int-shopify-domain") || "raiz-y-cera.myshopify.com",
      storefrontUrl: this._getVal("int-shopify-url") || "",
    };
    cfg.integrations.etsy = {
      enabled: true,
      shopName: this._getVal("int-etsy-shop") || "RaizYCeraAtelier",
      shopUrl: this._getVal("int-etsy-url") || "",
    };
  }

  /**
   * Saves all changes to browser local storage and optional backend API.
   * @private
   * @param {boolean} [showAlert=true]
   */
  async _saveAllChanges(showAlert = true) {
    this._gatherFormState();
    const result = await this._repository.saveState(this._state);
    if (showAlert) {
      if (result.serverSaved) {
        alert("✓ Cambios guardados con éxito en el servidor y en la sesión local.");
      } else {
        alert("✓ Cambios guardados en la sesión de prueba local. Recuerda pulsar 'Descargar JSON para GitHub' si deseas actualizar el repositorio estático.");
      }
    }
  }

  /**
   * Helper to retrieve value from input element by ID.
   * @private
   * @param {string} id
   * @returns {string}
   */
  _getVal(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || "") : "";
  }

  /**
   * Helper to set value on input element by ID.
   * @private
   * @param {string} id
   * @param {any} val
   */
  _setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? String(val) : "";
  }

  /**
   * @private
   * @param {string} str
   * @returns {string}
   */
  _escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const admin = new CMSAdminController();
  admin.init().catch((err) => {
    console.error("Error initializing Raíz y Cera CMS Admin:", err);
  });
});
