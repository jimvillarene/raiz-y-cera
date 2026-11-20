/**
 * """
 * Module: storefront_controller
 * Description: Object-oriented frontend controller orchestrating the Raíz y Cera
 *              storefront, hero carousel, faceted catalog filtering, olfactory
 *              pyramid explorer, interactive product customization modal, slide-out
 *              cart drawer, and 3-mode checkout (Stripe, Shopify/Etsy, WhatsApp).
 *
 * Author: Antigravity AI Agent
 * License: Proprietary / Internal
 *
 * Version History:
 * - v1.0.0 | 2026-11-20 | Initial OOP implementation of StorefrontAppController
 * """
 */

import { CMSRepository } from "../services/cms_repository.js";
import { CatalogFilterEngine } from "../services/catalog_engine.js";
import { CartService } from "../services/cart_service.js";
import { CheckoutOrchestrator } from "../services/checkout_orchestrator.js";

/**
 * Main controller encapsulating the customer storefront lifecycle and DOM interactions.
 */
export class StorefrontAppController {
  constructor() {
    /** @private @type {CMSRepository} */
    this._repository = new CMSRepository();
    /** @private @type {CatalogFilterEngine} */
    this._catalogEngine = new CatalogFilterEngine();
    /** @private @type {CartService} */
    this._cartService = new CartService();
    /** @private @type {CheckoutOrchestrator} */
    this._checkoutOrchestrator = new CheckoutOrchestrator();

    /** @private @type {Object|null} */
    this._state = null;
    /** @private @type {number} */
    this._currentSlideIndex = 0;
    /** @private @type {number|null} */
    this._carouselTimer = null;
    /** @private @type {number} */
    this._announcementIndex = 0;

    /** @private @type {Object} */
    this._activeFilters = {
      collectionId: "all",
      category: "all",
      fragranceId: "all",
      fragranceFamily: "all",
      onlyCustomizable: false,
      onlyBestsellers: false,
      searchQuery: "",
      sortBy: "featured",
    };

    /** @private @type {Object|null} */
    this._activeModalProduct = null;
    /** @private @type {string} */
    this._selectedVariantId = "";
    /** @private @type {string} */
    this._selectedFragranceId = "";
  }

  /**
   * Initializes the storefront application, loads CMS state, and binds event listeners.
   * @returns {Promise<void>}
   */
  async init() {
    this._state = await this._repository.loadState();
    const { siteConfig, products, fragrances } = this._state;

    this._catalogEngine.updateCatalog(products, fragrances);
    this._cartService.configureShipping({
      freeShippingThreshold: siteConfig.freeShippingThreshold ?? 600,
      standardShippingRate: siteConfig.standardShippingRate ?? 120,
    });

    this._cartService.subscribe((summary) => this._renderCartUI(summary));

    this._renderBrandingAndHeader();
    this._renderHeroCarousel();
    this._renderCollectionsGrid();
    this._renderFilterControls();
    this._renderCatalogGrid();
    this._renderFragranceExplorer();
    this._renderEditorialPosts();
    this._renderCustomOrdersSection();
    this._renderCartUI(this._cartService.getSummary());
    this._bindGlobalEvents();
    this._startTimers();
  }

  /**
   * Renders dynamic brand identity, announcement bar, and footer contact details.
   * @private
   */
  _renderBrandingAndHeader() {
    const { siteConfig } = this._state;
    const bars = siteConfig.announcementBars || [
      `ENVÍO GRATIS EN PEDIDOS DESDE $${siteConfig.freeShippingThreshold || 600} MXN · CERA DE SOYA 100% NATURAL HECHA A MANO`,
    ];
    const announcementEl = document.getElementById("announcement-text");
    if (announcementEl) {
      announcementEl.textContent = bars[0];
    }

    const brandTitleEls = document.querySelectorAll(".js-brand-name");
    brandTitleEls.forEach((el) => {
      el.textContent = siteConfig.brandName || "RAÍZ Y CERA";
    });

    const taglineEls = document.querySelectorAll(".js-brand-tagline");
    taglineEls.forEach((el) => {
      el.textContent = siteConfig.tagline || "RAÍCES QUE ILUMINAN";
    });

    const waEls = document.querySelectorAll(".js-whatsapp-display");
    waEls.forEach((el) => {
      el.textContent = siteConfig.contact?.whatsappDisplay || "55 2702 6347";
    });

    const igEls = document.querySelectorAll(".js-instagram-handle");
    igEls.forEach((el) => {
      el.textContent = siteConfig.contact?.instagramHandle || "@raizycera";
      if (el.tagName === "A") {
        el.href = siteConfig.contact?.instagramUrl || "https://www.instagram.com/raizycera";
      }
    });
  }

  /**
   * Renders the hero carousel slides and pagination indicators.
   * @private
   */
  _renderHeroCarousel() {
    const slides = (this._state.heroCarousel || []).filter((s) => s.active !== false);
    const track = document.getElementById("hero-carousel-track");
    const dotsContainer = document.getElementById("hero-carousel-dots");
    if (!track || !dotsContainer) return;

    if (slides.length === 0) {
      track.innerHTML = "";
      return;
    }

    this._currentSlideIndex = 0;

    track.innerHTML = slides
      .map(
        (slide, idx) => `
        <article class="hero-slide ${idx === 0 ? "is-active" : ""} theme-${slide.theme || "warm-terracotta"}" data-index="${idx}">
          <div class="hero-slide-content">
            <span class="hero-badge">${this._escapeHtml(slide.badge)}</span>
            <h1 class="hero-title">${this._escapeHtml(slide.title)}</h1>
            <p class="hero-subtitle">${this._escapeHtml(slide.subtitle)}</p>
            <div class="hero-actions">
              <button type="button" class="btn btn-primary js-hero-collection" data-collection="${this._escapeHtml(slide.ctaPrimaryCollection)}">
                ${this._escapeHtml(slide.ctaPrimaryText || "Explorar Colección")}
              </button>
              <button type="button" class="btn btn-outline js-hero-secondary" data-action="${this._escapeHtml(slide.ctaSecondaryAction || "")}">
                ${this._escapeHtml(slide.ctaSecondaryText || "Descubrir Aromas")}
              </button>
            </div>
          </div>
          <div class="hero-slide-visual">
            <div class="hero-image-frame">
              <img src="${this._escapeHtml(slide.image)}" alt="${this._escapeHtml(slide.title)}" loading="${idx === 0 ? "eager" : "lazy"}" />
            </div>
          </div>
        </article>
      `
      )
      .join("");

    dotsContainer.innerHTML = slides
      .map(
        (_, idx) => `
        <button type="button" class="hero-dot ${idx === 0 ? "is-active" : ""}" data-slide="${idx}" aria-label="Ir a diapositiva ${idx + 1}"></button>
      `
      )
      .join("");
  }

  /**
   * Switches the active hero carousel slide.
   * @param {number} index
   */
  goToSlide(index) {
    const slides = document.querySelectorAll("#hero-carousel-track .hero-slide");
    const dots = document.querySelectorAll("#hero-carousel-dots .hero-dot");
    if (slides.length === 0) return;

    this._currentSlideIndex = (index + slides.length) % slides.length;
    slides.forEach((s, idx) => s.classList.toggle("is-active", idx === this._currentSlideIndex));
    dots.forEach((d, idx) => d.classList.toggle("is-active", idx === this._currentSlideIndex));
  }

  /**
   * Renders the 3 seasonal collection spotlight tiles.
   * @private
   */
  _renderCollectionsGrid() {
    const container = document.getElementById("collections-grid");
    if (!container) return;

    const collections = this._state.collections || [];
    container.innerHTML = collections
      .map((col) => {
        const count = this._state.products.filter((p) => p.collectionId === col.id).length;
        return `
          <article class="collection-card" data-collection-id="${this._escapeHtml(col.id)}">
            <div class="collection-card-image">
              <img src="${this._escapeHtml(col.coverImage)}" alt="${this._escapeHtml(col.name)}" loading="lazy" />
              <span class="collection-count">${count} creaciones</span>
            </div>
            <div class="collection-card-body">
              <span class="collection-subtitle">${this._escapeHtml(col.subtitle)}</span>
              <h3 class="collection-title">${this._escapeHtml(col.name)}</h3>
              <p class="collection-desc">${this._escapeHtml(col.description)}</p>
              <button type="button" class="btn-link js-filter-collection" data-collection="${this._escapeHtml(col.id)}">
                Ver Colección <span>→</span>
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  /**
   * Populates the faceted filter dropdowns and pills dynamically from the catalog.
   * @private
   */
  _renderFilterControls() {
    const collectionPills = document.getElementById("filter-collection-pills");
    if (collectionPills) {
      const cols = this._state.collections || [];
      collectionPills.innerHTML = [
        `<button type="button" class="filter-pill ${this._activeFilters.collectionId === "all" ? "is-active" : ""}" data-collection="all">Todas las Colecciones (${this._state.products.length})</button>`,
        ...cols.map(
          (col) => `
          <button type="button" class="filter-pill ${this._activeFilters.collectionId === col.id ? "is-active" : ""}" data-collection="${this._escapeHtml(col.id)}">
            ${this._escapeHtml(col.name)}
          </button>
        `
        ),
      ].join("");
    }

    const categorySelect = document.getElementById("filter-category-select");
    if (categorySelect) {
      const categories = this._catalogEngine.getAvailableCategories();
      categorySelect.innerHTML = [
        `<option value="all">Todos los Formatos</option>`,
        ...categories.map(
          (cat) => `<option value="${this._escapeHtml(cat)}">${this._escapeHtml(cat)}</option>`
        ),
      ].join("");
      categorySelect.value = this._activeFilters.category;
    }

    const familySelect = document.getElementById("filter-family-select");
    if (familySelect) {
      const families = this._catalogEngine.getAvailableFragranceFamilies();
      familySelect.innerHTML = [
        `<option value="all">Todas las Familias Olfativas</option>`,
        ...families.map(
          (fam) => `<option value="${this._escapeHtml(fam)}">${this._escapeHtml(fam)}</option>`
        ),
      ].join("");
      familySelect.value = this._activeFilters.fragranceFamily;
    }

    const aromaSelect = document.getElementById("filter-fragrance-select");
    if (aromaSelect) {
      aromaSelect.innerHTML = [
        `<option value="all">Todos los Aromas (${this._state.fragrances.length})</option>`,
        ...this._state.fragrances.map(
          (f) => `<option value="${this._escapeHtml(f.id)}">${this._escapeHtml(f.name)}</option>`
        ),
      ].join("");
      aromaSelect.value = this._activeFilters.fragranceId;
    }
  }

  /**
   * Renders the filtered product grid inspired by Candle Delirium & Bath & Body Works.
   * @private
   */
  _renderCatalogGrid() {
    const grid = document.getElementById("catalog-products-grid");
    const countLabel = document.getElementById("catalog-results-count");
    if (!grid) return;

    const filtered = this._catalogEngine.filterProducts(this._activeFilters);
    if (countLabel) {
      countLabel.textContent = `Mostrando ${filtered.length} de ${this._state.products.length} creaciones artesanales`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="catalog-empty-state">
          <h3>No encontramos velas con esos filtros específicos</h3>
          <p>Prueba limpiando los filtros o seleccionando otra familia olfativa.</p>
          <button type="button" class="btn btn-primary" id="btn-reset-filters-empty">Restablecer Filtros</button>
        </div>
      `;
      return;
    }

    const collectionMap = new Map(
      (this._state.collections || []).map((c) => [c.id, c.name])
    );

    grid.innerHTML = filtered
      .map((product) => {
        const fragrances = this._catalogEngine.getFragrancesForProduct(product);
        const priceDisplay =
          product.basePrice === product.maxPrice
            ? `$${product.basePrice} MXN`
            : `Desde $${product.basePrice} hasta $${product.maxPrice} MXN`;
        const colName = collectionMap.get(product.collectionId) || "Colección Raíz y Cera";

        return `
          <article class="product-card" data-product-id="${this._escapeHtml(product.id)}">
            <div class="product-card-media js-open-product-modal" data-product-id="${this._escapeHtml(product.id)}">
              <div class="product-badges">
                ${product.bestseller ? `<span class="badge badge-bestseller">★ Bestseller</span>` : ""}
                ${product.customizable.enabled ? `<span class="badge badge-customizable">✦ Personalizable</span>` : ""}
              </div>
              <img src="${this._escapeHtml(product.primaryImage)}" alt="${this._escapeHtml(product.title)}" loading="lazy" />
              <div class="product-card-overlay">
                <span class="quick-view-pill">${
                  product.customizable.enabled
                    ? "Personalizar y Elegir Aroma"
                    : "Vista Rápida y Aromas"
                }</span>
              </div>
            </div>
            <div class="product-card-body">
              <div class="product-meta-row">
                <span class="product-collection-tag">${this._escapeHtml(colName)}</span>
                <span class="product-category-tag">${this._escapeHtml(product.category)}</span>
              </div>
              <h3 class="product-title js-open-product-modal" data-product-id="${this._escapeHtml(product.id)}">
                ${this._escapeHtml(product.title)}
              </h3>
              <p class="product-short-desc">${this._escapeHtml(product.shortDescription)}</p>
              <div class="product-aroma-chips">
                ${fragrances
                  .slice(0, 3)
                  .map(
                    (f) => `<span class="aroma-chip" title="Notas: ${this._escapeHtml(f.notes.heart.join(", "))}">${this._escapeHtml(f.name)}</span>`
                  )
                  .join("")}
                ${
                  fragrances.length > 3
                    ? `<span class="aroma-chip aroma-chip-more">+${fragrances.length - 3} aromas</span>`
                    : ""
                }
              </div>
              <div class="product-card-footer">
                <div class="product-price-block">
                  <span class="product-price">${priceDisplay}</span>
                  <span class="product-variants-count">${product.variants.length} ${product.variants.length === 1 ? "presentación" : "presentaciones"}</span>
                </div>
                <div class="product-card-actions">
                  <button type="button" class="btn btn-primary btn-sm js-open-product-modal" data-product-id="${this._escapeHtml(product.id)}">
                    ${product.customizable.enabled ? "✦ Personalizar" : "Elegir Aroma"}
                  </button>
                </div>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  /**
   * Renders the Olfactory Fragrance Library & Pyramid Explorer section.
   * @private
   */
  _renderFragranceExplorer() {
    const container = document.getElementById("fragrance-explorer-grid");
    if (!container) return;

    container.innerHTML = this._state.fragrances
      .map(
        (frag) => `
        <article class="fragrance-card" data-fragrance-id="${this._escapeHtml(frag.id)}">
          <div class="fragrance-card-header">
            <span class="fragrance-family-badge">${this._escapeHtml(frag.family)}</span>
            <span class="fragrance-season-tag">${this._escapeHtml(frag.season)}</span>
          </div>
          <h3 class="fragrance-title">${this._escapeHtml(frag.name)}</h3>
          <p class="fragrance-desc">${this._escapeHtml(frag.description)}</p>
          <div class="olfactory-pyramid">
            <div class="pyramid-tier">
              <span class="tier-label">▲ Salida:</span>
              <span class="tier-notes">${this._escapeHtml(frag.notes.top.join(" · "))}</span>
            </div>
            <div class="pyramid-tier">
              <span class="tier-label">◆ Corazón:</span>
              <span class="tier-notes">${this._escapeHtml(frag.notes.heart.join(" · "))}</span>
            </div>
            <div class="pyramid-tier">
              <span class="tier-label">▼ Fondo:</span>
              <span class="tier-notes">${this._escapeHtml(frag.notes.base.join(" · "))}</span>
            </div>
          </div>
          <div class="fragrance-card-footer">
            <span class="intensity-meter" title="Intensidad aromática ${frag.intensity}/5">
              Intensidad: ${"●".repeat(frag.intensity)}${"○".repeat(5 - frag.intensity)}
            </span>
            <button type="button" class="btn-link js-filter-by-fragrance" data-fragrance="${this._escapeHtml(frag.id)}">
              Ver velas con este aroma →
            </button>
          </div>
        </article>
      `
      )
      .join("");
  }

  /**
   * Renders the Editorial / Candle Care blog posts managed from the CMS.
   * @private
   */
  _renderEditorialPosts() {
    const container = document.getElementById("editorial-posts-grid");
    if (!container) return;

    const posts = this._state.blogPosts || [];
    container.innerHTML = posts
      .map(
        (post) => `
        <article class="editorial-card">
          <div class="editorial-meta">
            <span class="editorial-category">${this._escapeHtml(post.category)}</span>
            <span class="editorial-readtime">${this._escapeHtml(post.readTime || "3 min")}</span>
          </div>
          <h3 class="editorial-title">${this._escapeHtml(post.title)}</h3>
          <p class="editorial-excerpt">${this._escapeHtml(post.excerpt)}</p>
          <details class="editorial-expand">
            <summary>Leer artículo completo</summary>
            <p class="editorial-full-content">${this._escapeHtml(post.content)}</p>
          </details>
        </article>
      `
      )
      .join("");
  }

  /**
   * Renders the Custom Orders & Events Concierge banner section.
   * @private
   */
  _renderCustomOrdersSection() {
    const banner = this._state.siteConfig?.customOrdersBanner;
    if (!banner) return;
    const titleEl = document.getElementById("custom-orders-title");
    const subEl = document.getElementById("custom-orders-subtitle");
    if (titleEl && banner.title) titleEl.textContent = banner.title;
    if (subEl && banner.subtitle) subEl.textContent = banner.subtitle;
  }

  /**
   * Opens the Product Detail / Quick View & Interactive Customization Modal.
   * @param {string} productId
   */
  openProductModal(productId) {
    const product = this._state.products.find((p) => p.id === productId);
    if (!product) return;

    this._activeModalProduct = product;
    const defaultVariant = product.variants[0];
    this._selectedVariantId = defaultVariant.id;

    const allowedFragrances = this._catalogEngine.getFragrancesForProduct(product);
    const defaultFragrance = allowedFragrances[0];
    this._selectedFragranceId = defaultFragrance ? defaultFragrance.id : "";

    const modal = document.getElementById("product-detail-modal");
    const body = document.getElementById("product-modal-body");
    if (!modal || !body) return;

    const galleryImages = product.images.length > 0 ? product.images : [product.primaryImage];

    body.innerHTML = `
      <div class="pdp-modal-grid">
        <div class="pdp-gallery-col">
          <div class="pdp-main-image-wrap">
            <img id="pdp-main-image" src="${this._escapeHtml(defaultVariant.image || galleryImages[0])}" alt="${this._escapeHtml(product.title)}" />
            ${
              product.customizable.enabled
                ? `<div class="pdp-live-custom-preview" id="pdp-live-custom-preview" hidden>
                     <span class="preview-tag">✦ Vista previa de personalización:</span>
                     <strong id="pdp-live-custom-text"></strong>
                   </div>`
                : ""
            }
          </div>
          ${
            galleryImages.length > 1
              ? `<div class="pdp-thumbnails">
                  ${galleryImages
                    .map(
                      (img, idx) => `
                    <button type="button" class="pdp-thumb ${idx === 0 ? "is-active" : ""}" data-img="${this._escapeHtml(img)}">
                      <img src="${this._escapeHtml(img)}" alt="Miniatura ${idx + 1}" />
                    </button>
                  `
                    )
                    .join("")}
                </div>`
              : ""
          }
          <div class="pdp-craftsmanship-card">
            <h4>Especificaciones Artesanales</h4>
            <ul>
              <li><strong>Cera:</strong> ${this._escapeHtml(product.craftsmanshipDetails.waxType)}</li>
              <li><strong>Elaboración:</strong> ${product.craftsmanshipDetails.handmade ? "Moldeada y vertida 100% a mano" : "Artesanal"}</li>
              ${product.craftsmanshipDetails.dimensions ? `<li><strong>Dimensiones:</strong> ${this._escapeHtml(product.craftsmanshipDetails.dimensions)}</li>` : ""}
              ${product.craftsmanshipDetails.burnTime ? `<li><strong>Duración estimada:</strong> ${this._escapeHtml(product.craftsmanshipDetails.burnTime)}</li>` : ""}
            </ul>
          </div>
        </div>

        <div class="pdp-info-col">
          <div class="pdp-badges-row">
            <span class="pdp-category-badge">${this._escapeHtml(product.category)}</span>
            ${product.customizable.enabled ? `<span class="badge badge-customizable">✦ Producto Personalizable</span>` : ""}
          </div>
          <h2 class="pdp-title">${this._escapeHtml(product.title)}</h2>
          <div class="pdp-price-row">
            <span class="pdp-price" id="pdp-current-price">$${defaultVariant.price} MXN</span>
            <span class="pdp-sku" id="pdp-current-sku">SKU: ${this._escapeHtml(defaultVariant.sku || product.id)}</span>
          </div>
          <p class="pdp-description">${this._escapeHtml(product.description)}</p>

          <!-- 1. Variant Selector -->
          <div class="pdp-field-group">
            <label class="pdp-label">1. Elige Presentación / Tamaño:</label>
            <div class="pdp-variant-options" id="pdp-variant-options">
              ${product.variants
                .map(
                  (v, idx) => `
                  <button type="button" class="variant-option-btn ${idx === 0 ? "is-selected" : ""}" data-variant-id="${this._escapeHtml(v.id)}">
                    <span class="variant-name">${this._escapeHtml(v.name)}</span>
                    <span class="variant-price">$${v.price} MXN</span>
                  </button>
                `
                )
                .join("")}
            </div>
          </div>

          <!-- 2. Fragrance Selector with Live Olfactory Pyramid -->
          <div class="pdp-field-group">
            <label class="pdp-label">2. Selecciona tu Aroma de Cera de Soya:</label>
            <div class="pdp-fragrance-options" id="pdp-fragrance-options">
              ${allowedFragrances
                .map(
                  (f, idx) => `
                  <button type="button" class="fragrance-option-btn ${idx === 0 ? "is-selected" : ""}" data-fragrance-id="${this._escapeHtml(f.id)}">
                    ${this._escapeHtml(f.name)}
                  </button>
                `
                )
                .join("")}
            </div>
            ${
              defaultFragrance
                ? `<div class="pdp-selected-fragrance-box" id="pdp-fragrance-pyramid-box">
                     ${this._renderMiniPyramidHTML(defaultFragrance)}
                   </div>`
                : ""
            }
          </div>

          <!-- 3. Interactive Customization Field (when enabled on product) -->
          ${
            product.customizable.enabled
              ? `<div class="pdp-field-group pdp-customization-box">
                   <div class="customization-header">
                     <label class="pdp-label" for="pdp-custom-text-input">
                       ✦ 3. Personalización Interactiva: ${this._escapeHtml(product.customizable.label)}
                     </label>
                     <span class="char-counter" id="pdp-char-counter">0 / ${product.customizable.maxLength}</span>
                   </div>
                   <input
                     type="text"
                     id="pdp-custom-text-input"
                     class="pdp-custom-input"
                     maxlength="${product.customizable.maxLength}"
                     placeholder="${this._escapeHtml(product.customizable.placeholder)}"
                   />
                   <small class="customization-hint">
                     Incluido sin costo adicional. Se reflejará en tu etiqueta artesanal, tarjeta y orden de compra.
                   </small>
                 </div>`
              : ""
          }

          <!-- 4. Quantity and Add to Cart / Omnichannel Buttons -->
          <div class="pdp-purchase-row">
            <div class="quantity-stepper">
              <button type="button" id="pdp-qty-minus" aria-label="Disminuir cantidad">−</button>
              <input type="number" id="pdp-qty-input" value="1" min="1" max="50" />
              <button type="button" id="pdp-qty-plus" aria-label="Aumentar cantidad">+</button>
            </div>
            <button type="button" class="btn btn-primary btn-lg pdp-add-btn" id="pdp-add-to-cart-btn">
              Agregar a la Bolsa
            </button>
          </div>

          <div class="pdp-external-marketplaces">
            <span>También disponible o sincronizable vía:</span>
            <div class="pdp-marketplace-links">
              <a href="${this._escapeHtml(product.externalLinks?.shopifyProductUrl || this._state.siteConfig?.integrations?.shopify?.storefrontUrl || "#")}" target="_blank" rel="noopener" class="marketplace-chip">
                🛍️ Shopify
              </a>
              <a href="${this._escapeHtml(product.externalLinks?.etsyListingUrl || this._state.siteConfig?.integrations?.etsy?.shopUrl || "#")}" target="_blank" rel="noopener" class="marketplace-chip">
                🧡 Etsy
              </a>
              <button type="button" class="marketplace-chip js-pdp-direct-whatsapp">
                💬 Pedir por WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this._bindProductModalEvents(product);
    modal.hidden = false;
    document.body.classList.add("modal-open");
  }

  /**
   * Renders the compact olfactory pyramid inside the product modal.
   * @private
   * @param {Object} fragrance
   * @returns {string}
   */
  _renderMiniPyramidHTML(fragrance) {
    return `
      <div class="mini-pyramid-header">
        <strong>Perfil Olfativo: ${this._escapeHtml(fragrance.name)}</strong>
        <span class="mini-pyramid-family">${this._escapeHtml(fragrance.family)}</span>
      </div>
      <p class="mini-pyramid-desc">${this._escapeHtml(fragrance.description)}</p>
      <div class="mini-pyramid-notes">
        <span><strong>Salida:</strong> ${this._escapeHtml(fragrance.notes.top.join(", "))}</span>
        <span><strong>Corazón:</strong> ${this._escapeHtml(fragrance.notes.heart.join(", "))}</span>
        <span><strong>Fondo:</strong> ${this._escapeHtml(fragrance.notes.base.join(", "))}</span>
      </div>
    `;
  }

  /**
   * Binds interactive events inside the open Product Detail Modal.
   * @private
   * @param {Object} product
   */
  _bindProductModalEvents(product) {
    const mainImage = document.getElementById("pdp-main-image");
    const priceEl = document.getElementById("pdp-current-price");
    const skuEl = document.getElementById("pdp-current-sku");

    // Thumbnail clicks
    document.querySelectorAll(".pdp-thumb").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".pdp-thumb").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        if (mainImage) mainImage.src = btn.dataset.img;
      });
    });

    // Variant clicks
    document.querySelectorAll("#pdp-variant-options .variant-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll("#pdp-variant-options .variant-option-btn")
          .forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
        this._selectedVariantId = btn.dataset.variantId;
        const variant = product.getVariantById(this._selectedVariantId);
        if (priceEl) priceEl.textContent = `$${variant.price} MXN`;
        if (skuEl) skuEl.textContent = `SKU: ${variant.sku || product.id}`;
        if (variant.image && mainImage) {
          mainImage.src = variant.image;
        }
      });
    });

    // Fragrance clicks
    document.querySelectorAll("#pdp-fragrance-options .fragrance-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll("#pdp-fragrance-options .fragrance-option-btn")
          .forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
        this._selectedFragranceId = btn.dataset.fragranceId;
        const frag = this._catalogEngine.getFragranceById(this._selectedFragranceId);
        const box = document.getElementById("pdp-fragrance-pyramid-box");
        if (frag && box) {
          box.innerHTML = this._renderMiniPyramidHTML(frag);
        }
      });
    });

    // Interactive Customization Input
    const customInput = document.getElementById("pdp-custom-text-input");
    const charCounter = document.getElementById("pdp-char-counter");
    const livePreviewWrap = document.getElementById("pdp-live-custom-preview");
    const livePreviewText = document.getElementById("pdp-live-custom-text");

    if (customInput) {
      customInput.addEventListener("input", () => {
        const val = customInput.value;
        if (charCounter) {
          charCounter.textContent = `${val.length} / ${product.customizable.maxLength}`;
        }
        if (livePreviewWrap && livePreviewText) {
          if (val.trim().length > 0) {
            livePreviewWrap.hidden = false;
            livePreviewText.textContent = `"${val.trim()}"`;
          } else {
            livePreviewWrap.hidden = true;
          }
        }
      });
    }

    // Quantity stepper
    const qtyInput = document.getElementById("pdp-qty-input");
    document.getElementById("pdp-qty-minus")?.addEventListener("click", () => {
      if (qtyInput) qtyInput.value = String(Math.max(1, Number(qtyInput.value) - 1));
    });
    document.getElementById("pdp-qty-plus")?.addEventListener("click", () => {
      if (qtyInput) qtyInput.value = String(Math.min(50, Number(qtyInput.value) + 1));
    });

    // Add to cart button
    document.getElementById("pdp-add-to-cart-btn")?.addEventListener("click", () => {
      this._addCurrentModalProductToCart(false);
    });

    // Direct WhatsApp button inside modal
    document.querySelector(".js-pdp-direct-whatsapp")?.addEventListener("click", () => {
      this._addCurrentModalProductToCart(true);
    });
  }

  /**
   * Adds the currently configured modal product to the cart and opens the cart drawer.
   * @private
   * @param {boolean} triggerImmediateWhatsApp
   */
  _addCurrentModalProductToCart(triggerImmediateWhatsApp = false) {
    const product = this._activeModalProduct;
    if (!product) return;

    const variant = product.getVariantById(this._selectedVariantId);
    const fragrance = this._catalogEngine.getFragranceById(this._selectedFragranceId);
    const customInput = document.getElementById("pdp-custom-text-input");
    const qtyInput = document.getElementById("pdp-qty-input");

    const customText = customInput ? customInput.value.trim() : "";
    const quantity = qtyInput ? Math.max(1, Number(qtyInput.value) || 1) : 1;

    this._cartService.addItem({
      productId: product.id,
      productTitle: product.title,
      variantId: variant.id,
      variantName: variant.name,
      unitPrice: variant.price,
      fragranceId: fragrance ? fragrance.id : "coleccion",
      fragranceName: fragrance ? fragrance.name : "Aroma de Colección",
      customText,
      quantity,
      image: variant.image || product.primaryImage,
      externalLinks: product.externalLinks,
    });

    this.closeProductModal();
    this.toggleCartDrawer(true);

    if (triggerImmediateWhatsApp) {
      this._executeCheckout("whatsapp");
    }
  }

  /**
   * Closes the Product Detail Modal.
   */
  closeProductModal() {
    const modal = document.getElementById("product-detail-modal");
    if (modal) modal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  /**
   * Toggles the slide-out shopping cart drawer.
   * @param {boolean} [forceOpen]
   */
  toggleCartDrawer(forceOpen) {
    const drawer = document.getElementById("cart-drawer");
    const backdrop = document.getElementById("cart-drawer-backdrop");
    if (!drawer || !backdrop) return;

    const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : drawer.hidden;
    drawer.hidden = !shouldOpen;
    backdrop.hidden = !shouldOpen;
    document.body.classList.toggle("drawer-open", shouldOpen);
  }

  /**
   * Renders the Cart Drawer contents, free-shipping progress bar, and totals.
   * @private
   * @param {Object} summary
   */
  _renderCartUI(summary) {
    document.querySelectorAll(".js-cart-count").forEach((el) => {
      el.textContent = String(summary.totalCount);
    });

    const shippingMsgEl = document.getElementById("cart-shipping-message");
    const shippingBarEl = document.getElementById("cart-shipping-progress-bar");
    if (shippingMsgEl) {
      if (summary.qualifiesForFreeShipping) {
        shippingMsgEl.innerHTML = `🎉 <strong>¡Felicidades! Tu pedido cuenta con ENVÍO GRATIS</strong> (desde $${summary.freeShippingThreshold} MXN)`;
      } else {
        shippingMsgEl.innerHTML = `Agrega <strong>$${summary.amountRemainingForFreeShipping} MXN</strong> más para obtener <strong>ENVÍO GRATIS</strong> (desde $${summary.freeShippingThreshold} MXN)`;
      }
    }
    if (shippingBarEl) {
      shippingBarEl.style.width = `${summary.freeShippingProgressPercent}%`;
    }

    const itemsContainer = document.getElementById("cart-items-list");
    const footerEl = document.getElementById("cart-drawer-footer");
    if (!itemsContainer) return;

    if (summary.items.length === 0) {
      itemsContainer.innerHTML = `
        <div class="cart-empty-state">
          <p>Tu bolsa de Raíz y Cera está vacía.</p>
          <span>Explora nuestras colecciones en cera de soya 100% natural.</span>
        </div>
      `;
      if (footerEl) footerEl.hidden = true;
      return;
    }

    if (footerEl) footerEl.hidden = false;

    itemsContainer.innerHTML = summary.items
      .map(
        (item) => `
        <div class="cart-item" data-line-key="${this._escapeHtml(item.productId)}::${this._escapeHtml(item.variantId)}::${this._escapeHtml(item.fragranceId)}::${this._escapeHtml((item.customText || "").toLowerCase())}">
          <img class="cart-item-img" src="${this._escapeHtml(item.image)}" alt="${this._escapeHtml(item.productTitle)}" />
          <div class="cart-item-details">
            <div class="cart-item-top">
              <h4>${this._escapeHtml(item.productTitle)}</h4>
              <button type="button" class="cart-item-remove js-cart-remove" aria-label="Eliminar artículo">×</button>
            </div>
            <span class="cart-item-meta">${this._escapeHtml(item.variantName)} · Aroma: <strong>${this._escapeHtml(item.fragranceName)}</strong></span>
            ${
              item.customText
                ? `<div class="cart-item-custom-badge">✦ Personalizado: "${this._escapeHtml(item.customText)}"</div>`
                : ""
            }
            <div class="cart-item-bottom">
              <div class="cart-qty-controls">
                <button type="button" class="js-cart-qty-btn" data-delta="-1">−</button>
                <span>${item.quantity}</span>
                <button type="button" class="js-cart-qty-btn" data-delta="1">+</button>
              </div>
              <strong class="cart-item-subtotal">$${item.unitPrice * item.quantity} MXN</strong>
            </div>
          </div>
        </div>
      `
      )
      .join("");

    const subtotalEl = document.getElementById("cart-subtotal-amount");
    const shippingEl = document.getElementById("cart-shipping-amount");
    const totalEl = document.getElementById("cart-total-amount");

    if (subtotalEl) subtotalEl.textContent = `$${summary.subtotal} MXN`;
    if (shippingEl) {
      shippingEl.textContent =
        summary.shippingCost === 0 ? "GRATIS" : `$${summary.shippingCost} MXN`;
    }
    if (totalEl) totalEl.textContent = `$${summary.grandTotal} MXN`;
  }

  /**
   * Executes one of the 3 checkout channels ('stripe' | 'shopify' | 'etsy' | 'whatsapp').
   * @private
   * @param {string} channel
   */
  async _executeCheckout(channel) {
    const customerInfo = {
      name: document.getElementById("checkout-customer-name")?.value.trim() || "",
      phone: document.getElementById("checkout-customer-phone")?.value.trim() || "",
      city: document.getElementById("checkout-customer-city")?.value.trim() || "",
      notes: document.getElementById("checkout-customer-notes")?.value.trim() || "",
    };

    try {
      const result = await this._checkoutOrchestrator.processCheckout(
        channel,
        this._cartService.getSummary(),
        customerInfo,
        this._state.siteConfig
      );

      if (result.mode === "sandbox-modal") {
        this._openStripeSandboxModal(result);
      } else if (result.mode === "marketplace-redirect") {
        this._openMarketplaceBridgeModal(result);
      } else if (result.redirectUrl) {
        window.open(result.redirectUrl, "_blank", "noopener");
      }
    } catch (err) {
      alert(err.message || "Error al procesar el checkout.");
    }
  }

  /**
   * Displays the interactive Stripe Checkout Sandbox Modal so the entrepreneur
   * can test the entire credit-card payment flow on GitHub Pages.
   * @private
   * @param {Object} payload
   */
  _openStripeSandboxModal(payload) {
    const modal = document.getElementById("checkout-status-modal");
    const content = document.getElementById("checkout-status-body");
    if (!modal || !content) return;

    const { cartSummary, folio, publishableKey, customerInfo } = payload;

    content.innerHTML = `
      <div class="stripe-sandbox-card">
        <div class="stripe-header">
          <span class="stripe-badge">STRIPE CHECKOUT · MODO DEMOSTRACIÓN</span>
          <small>Clave configurada: <code>${this._escapeHtml(publishableKey)}</code></small>
        </div>
        <h3>Resumen de Pago Seguro — Raíz y Cera</h3>
        <p class="stripe-folio">Orden Folio: <strong>${this._escapeHtml(folio)}</strong></p>
        <ul class="stripe-items-summary">
          ${cartSummary.items
            .map(
              (item) => `
              <li>
                <div>
                  <strong>${item.quantity}x ${this._escapeHtml(item.productTitle)}</strong> (${this._escapeHtml(item.variantName)} · ${this._escapeHtml(item.fragranceName)})
                  ${item.customText ? `<br/><small class="custom-line">✦ Personalización: "${this._escapeHtml(item.customText)}"</small>` : ""}
                </div>
                <span>$${item.unitPrice * item.quantity} MXN</span>
              </li>
            `
            )
            .join("")}
          <li class="stripe-shipping-line">
            <span>Envío (${cartSummary.shippingCost === 0 ? "Gratis desde $" + cartSummary.freeShippingThreshold + " MXN" : "Estándar Nacional"})</span>
            <span>${cartSummary.shippingCost === 0 ? "$0 MXN" : "$" + cartSummary.shippingCost + " MXN"}</span>
          </li>
          <li class="stripe-total-line">
            <strong>Total a Pagar</strong>
            <strong>$${cartSummary.grandTotal} MXN</strong>
          </li>
        </ul>

        <div class="stripe-card-simulator">
          <label>Tarjeta de Prueba Stripe (Simulación Interactiva)</label>
          <input type="text" value="4242 •••• •••• 4242   |   12/28   |   CVC 424" readonly class="stripe-readonly-input" />
          <small>En producción (hosting de paga o Stripe Payment Link configurado en el Panel Admin), esta ventana redirige a la pasarela bancaria real de Stripe.</small>
        </div>

        <div class="stripe-actions">
          <button type="button" class="btn btn-primary btn-lg" id="btn-confirm-stripe-demo">
            Simular Pago Aprobado ($${cartSummary.grandTotal} MXN)
          </button>
        </div>
      </div>
    `;

    modal.hidden = false;

    document.getElementById("btn-confirm-stripe-demo")?.addEventListener("click", () => {
      content.innerHTML = `
        <div class="stripe-success-state">
          <div class="success-icon">✓</div>
          <h3>¡Pago Confirmado con Éxito!</h3>
          <p>Folio de Orden: <strong>${this._escapeHtml(folio)}</strong></p>
          <p>Gracias${customerInfo?.name ? `, <strong>${this._escapeHtml(customerInfo.name)}</strong>` : ""}. Hemos registrado tu pedido artesanal de <strong>Raíz y Cera</strong> con tus aromas y personalizaciones seleccionadas.</p>
          <div class="stripe-success-actions">
            <button type="button" class="btn btn-primary" id="btn-finish-stripe-order">Finalizar y Vaciar Bolsa</button>
          </div>
        </div>
      `;
      document.getElementById("btn-finish-stripe-order")?.addEventListener("click", () => {
        this._cartService.clear();
        modal.hidden = true;
        this.toggleCartDrawer(false);
      });
    });
  }

  /**
   * Opens the Shopify / Etsy Marketplace Bridge confirmation dialog.
   * @private
   * @param {Object} payload
   */
  _openMarketplaceBridgeModal(payload) {
    const modal = document.getElementById("checkout-status-modal");
    const content = document.getElementById("checkout-status-body");
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="marketplace-bridge-card">
        <span class="stripe-badge">CONEXIÓN MULTICANAL · ${this._escapeHtml(payload.platformName.toUpperCase())}</span>
        <h3>Continuar Compra en ${this._escapeHtml(payload.platformName)}</h3>
        <p>Tu selección de <strong>Raíz y Cera</strong> (${payload.cartSummary.totalCount} artículo(s) · Total <strong>$${payload.cartSummary.grandTotal} MXN</strong>) está vinculada con nuestra tienda oficial en <strong>${this._escapeHtml(payload.platformName)}</strong>.</p>
        <p class="bridge-note">Desde el <strong>Panel de Administración CMS</strong> puedes configurar el enlace individual de cada vela en Shopify o Etsy y exportar todo el catálogo en formato CSV oficial en 1 clic.</p>
        <div class="stripe-actions">
          <a href="${this._escapeHtml(payload.redirectUrl)}" target="_blank" rel="noopener" class="btn btn-primary">
            Abrir Tienda en ${this._escapeHtml(payload.platformName)} ↗
          </a>
        </div>
      </div>
    `;
    modal.hidden = false;
  }

  /**
   * Binds global DOM listeners for navigation, filtering, carousel, cart, and modals.
   * @private
   */
  _bindGlobalEvents() {
    // Hero Carousel navigation
    document.getElementById("hero-prev-btn")?.addEventListener("click", () => {
      this.goToSlide(this._currentSlideIndex - 1);
    });
    document.getElementById("hero-next-btn")?.addEventListener("click", () => {
      this.goToSlide(this._currentSlideIndex + 1);
    });
    document.getElementById("hero-carousel-dots")?.addEventListener("click", (e) => {
      const dot = e.target.closest(".hero-dot");
      if (dot) this.goToSlide(Number(dot.dataset.slide));
    });

    // Hero CTA buttons
    document.getElementById("hero-carousel-track")?.addEventListener("click", (e) => {
      const colBtn = e.target.closest(".js-hero-collection");
      if (colBtn) {
        this._setCollectionFilter(colBtn.dataset.collection);
        document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      const secBtn = e.target.closest(".js-hero-secondary");
      if (secBtn) {
        const action = secBtn.dataset.action || "";
        if (action === "open-fragrance-explorer") {
          document.getElementById("aromas")?.scrollIntoView({ behavior: "smooth" });
        } else if (action === "filter-customizable") {
          this._activeFilters.onlyCustomizable = true;
          const toggle = document.getElementById("filter-customizable-toggle");
          if (toggle) toggle.checked = true;
          this._renderCatalogGrid();
          document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
        } else if (action.startsWith("focus-product:")) {
          const pid = action.split(":")[1];
          this.openProductModal(pid);
        }
      }
    });

    // Collection cards and top navigation collection links
    document.addEventListener("click", (e) => {
      const filterColBtn = e.target.closest(".js-filter-collection");
      if (filterColBtn) {
        e.preventDefault();
        this._setCollectionFilter(filterColBtn.dataset.collection);
        document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
        return;
      }

      const filterCustomNav = e.target.closest(".js-nav-customizable");
      if (filterCustomNav) {
        e.preventDefault();
        this._activeFilters.collectionId = "all";
        this._activeFilters.onlyCustomizable = true;
        const toggle = document.getElementById("filter-customizable-toggle");
        if (toggle) toggle.checked = true;
        this._renderFilterControls();
        this._renderCatalogGrid();
        document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
        return;
      }

      const openModalEl = e.target.closest(".js-open-product-modal");
      if (openModalEl) {
        this.openProductModal(openModalEl.dataset.productId);
        return;
      }

      const fragFilterBtn = e.target.closest(".js-filter-by-fragrance");
      if (fragFilterBtn) {
        this._activeFilters.fragranceId = fragFilterBtn.dataset.fragrance;
        const select = document.getElementById("filter-fragrance-select");
        if (select) select.value = this._activeFilters.fragranceId;
        this._renderCatalogGrid();
        document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
        return;
      }

      if (e.target.id === "btn-reset-filters-empty" || e.target.id === "btn-reset-all-filters") {
        this._resetAllFilters();
      }
    });

    // Filter collection pills
    document.getElementById("filter-collection-pills")?.addEventListener("click", (e) => {
      const pill = e.target.closest(".filter-pill");
      if (pill) {
        this._setCollectionFilter(pill.dataset.collection);
      }
    });

    // Select & input filters
    document.getElementById("filter-category-select")?.addEventListener("change", (e) => {
      this._activeFilters.category = e.target.value;
      this._renderCatalogGrid();
    });

    document.getElementById("filter-family-select")?.addEventListener("change", (e) => {
      this._activeFilters.fragranceFamily = e.target.value;
      this._renderCatalogGrid();
    });

    document.getElementById("filter-fragrance-select")?.addEventListener("change", (e) => {
      this._activeFilters.fragranceId = e.target.value;
      this._renderCatalogGrid();
    });

    document.getElementById("filter-sort-select")?.addEventListener("change", (e) => {
      this._activeFilters.sortBy = e.target.value;
      this._renderCatalogGrid();
    });

    document.getElementById("filter-customizable-toggle")?.addEventListener("change", (e) => {
      this._activeFilters.onlyCustomizable = e.target.checked;
      this._renderCatalogGrid();
    });

    document.getElementById("catalog-search-input")?.addEventListener("input", (e) => {
      this._activeFilters.searchQuery = e.target.value;
      this._renderCatalogGrid();
    });

    // Modal close buttons
    document.getElementById("product-modal-close")?.addEventListener("click", () => {
      this.closeProductModal();
    });
    document.getElementById("product-detail-modal")?.addEventListener("click", (e) => {
      if (e.target.id === "product-detail-modal") this.closeProductModal();
    });

    document.getElementById("checkout-status-close")?.addEventListener("click", () => {
      const modal = document.getElementById("checkout-status-modal");
      if (modal) modal.hidden = true;
    });

    // Cart Drawer open/close & item actions
    document.getElementById("header-cart-btn")?.addEventListener("click", () => {
      this.toggleCartDrawer(true);
    });
    document.getElementById("cart-drawer-close")?.addEventListener("click", () => {
      this.toggleCartDrawer(false);
    });
    document.getElementById("cart-drawer-backdrop")?.addEventListener("click", () => {
      this.toggleCartDrawer(false);
    });

    document.getElementById("cart-items-list")?.addEventListener("click", (e) => {
      const cartItemEl = e.target.closest(".cart-item");
      if (!cartItemEl) return;
      const lineKey = cartItemEl.dataset.lineKey;

      if (e.target.closest(".js-cart-remove")) {
        this._cartService.removeItem(lineKey);
        return;
      }

      const qtyBtn = e.target.closest(".js-cart-qty-btn");
      if (qtyBtn) {
        const delta = Number(qtyBtn.dataset.delta);
        const item = this._cartService.items.find((i) => i.lineKey === lineKey);
        if (item) {
          this._cartService.updateQuantity(lineKey, item.quantity + delta);
        }
      }
    });

    // 3 Checkout Channel Buttons
    document.getElementById("btn-checkout-stripe")?.addEventListener("click", () => {
      this._executeCheckout("stripe");
    });
    document.getElementById("btn-checkout-shopify")?.addEventListener("click", () => {
      this._executeCheckout("shopify");
    });
    document.getElementById("btn-checkout-etsy")?.addEventListener("click", () => {
      this._executeCheckout("etsy");
    });
    document.getElementById("btn-checkout-whatsapp")?.addEventListener("click", () => {
      this._executeCheckout("whatsapp");
    });

    // Custom Orders Concierge Form (B2B / Events / Weddings)
    document.getElementById("custom-order-quote-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("quote-name")?.value.trim() || "";
      const eventType = document.getElementById("quote-event-type")?.value || "Evento Especial";
      const quantity = document.getElementById("quote-quantity")?.value || "20";
      const details = document.getElementById("quote-details")?.value.trim() || "";
      const rawPhone = String(this._state.siteConfig?.contact?.whatsappNumber || "5527026347").replace(/\D/g, "");
      const intlPhone = rawPhone.length === 10 ? `52${rawPhone}` : rawPhone;

      const text = [
        `✨ *SOLICITUD DE PEDIDO PERSONALIZADO — RAÍZ Y CERA* ✨`,
        `• *Nombre:* ${name}`,
        `• *Tipo de Proyecto:* ${eventType}`,
        `• *Cantidad Estimada:* ${quantity} piezas`,
        `• *Idea / Personalización deseada:* ${details}`,
      ].join("\n");

      window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    });
  }

  /**
   * @private
   * @param {string} collectionId
   */
  _setCollectionFilter(collectionId) {
    this._activeFilters.collectionId = collectionId || "all";
    document.querySelectorAll("#filter-collection-pills .filter-pill").forEach((pill) => {
      pill.classList.toggle("is-active", pill.dataset.collection === this._activeFilters.collectionId);
    });
    this._renderCatalogGrid();
  }

  /**
   * @private
   */
  _resetAllFilters() {
    this._activeFilters = {
      collectionId: "all",
      category: "all",
      fragranceId: "all",
      fragranceFamily: "all",
      onlyCustomizable: false,
      onlyBestsellers: false,
      searchQuery: "",
      sortBy: "featured",
    };
    const searchInput = document.getElementById("catalog-search-input");
    if (searchInput) searchInput.value = "";
    const customToggle = document.getElementById("filter-customizable-toggle");
    if (customToggle) customToggle.checked = false;
    this._renderFilterControls();
    this._renderCatalogGrid();
  }

  /**
   * Starts the hero carousel autoplay and announcement bar rotation.
   * @private
   */
  _startTimers() {
    if (this._carouselTimer) clearInterval(this._carouselTimer);
    this._carouselTimer = window.setInterval(() => {
      this.goToSlide(this._currentSlideIndex + 1);
    }, 6500);

    const bars = this._state.siteConfig?.announcementBars || [];
    if (bars.length > 1) {
      window.setInterval(() => {
        this._announcementIndex = (this._announcementIndex + 1) % bars.length;
        const el = document.getElementById("announcement-text");
        if (el) el.textContent = bars[this._announcementIndex];
      }, 4800);
    }
  }

  /**
   * Escapes user/CMS strings for safe HTML interpolation.
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
  const app = new StorefrontAppController();
  app.init().catch((err) => {
    console.error("Error initializing Raíz y Cera Storefront:", err);
  });
});
