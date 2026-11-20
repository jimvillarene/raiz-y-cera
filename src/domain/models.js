/**
 * """
 * Module: models
 * Description: Domain model hierarchy encapsulating Products, Variants, Fragrance
 *              Pyramids, Seasonal Collections, Carousel Slides, Editorial Posts,
 *              Cart Items, and Site Configuration for the Raíz y Cera platform.
 *
 * Author: Antigravity AI Agent
 * License: Proprietary / Internal
 *
 * Version History:
 * - v1.0.0 | 2026-11-20 | Initial strict OOP domain model implementation
 * """
 */

/**
 * Encapsulates a purchasable variant of a candle or wax product.
 */
export class ProductVariant {
  /**
   * @param {Object} params
   * @param {string} params.id
   * @param {string} params.name
   * @param {number} params.price
   * @param {string} [params.sku]
   * @param {string} [params.dimensions]
   * @param {string} [params.image]
   */
  constructor({ id, name, price, sku = "", dimensions = "", image = "" }) {
    if (!id || !name) {
      throw new Error("ProductVariant requires valid 'id' and 'name'.");
    }
    /** @private @type {string} */
    this._id = String(id);
    /** @private @type {string} */
    this._name = String(name);
    /** @private @type {number} */
    this._price = Number(price) >= 0 ? Number(price) : 0;
    /** @private @type {string} */
    this._sku = String(sku || "");
    /** @private @type {string} */
    this._dimensions = String(dimensions || "");
    /** @private @type {string} */
    this._image = String(image || "");
  }

  /** @returns {string} */
  get id() { return this._id; }

  /** @returns {string} */
  get name() { return this._name; }

  /** @returns {number} */
  get price() { return this._price; }

  /** @returns {string} */
  get sku() { return this._sku; }

  /** @returns {string} */
  get dimensions() { return this._dimensions; }

  /** @returns {string} */
  get image() { return this._image; }

  /**
   * @returns {Object} Plain JSON representation.
   */
  toJSON() {
    return {
      id: this._id,
      name: this._name,
      price: this._price,
      sku: this._sku,
      dimensions: this._dimensions,
      image: this._image,
    };
  }

  /**
   * @param {Object} raw
   * @returns {ProductVariant}
   */
  static fromJSON(raw) {
    return new ProductVariant(raw);
  }
}

/**
 * Encapsulates the interactive customization rules for a product.
 */
export class ProductCustomizationSpec {
  /**
   * @param {Object} [params]
   * @param {boolean} [params.enabled]
   * @param {string} [params.label]
   * @param {string} [params.placeholder]
   * @param {number} [params.maxLength]
   */
  constructor({ enabled = false, label = "", placeholder = "", maxLength = 80 } = {}) {
    /** @private @type {boolean} */
    this._enabled = Boolean(enabled);
    /** @private @type {string} */
    this._label = String(label || "Texto o dedicatoria personalizada");
    /** @private @type {string} */
    this._placeholder = String(placeholder || "Escribe aquí tu personalización...");
    /** @private @type {number} */
    this._maxLength = Number(maxLength) > 0 ? Number(maxLength) : 80;
  }

  /** @returns {boolean} */
  get enabled() { return this._enabled; }

  /** @returns {string} */
  get label() { return this._label; }

  /** @returns {string} */
  get placeholder() { return this._placeholder; }

  /** @returns {number} */
  get maxLength() { return this._maxLength; }

  /** @returns {Object} */
  toJSON() {
    return {
      enabled: this._enabled,
      label: this._label,
      placeholder: this._placeholder,
      maxLength: this._maxLength,
    };
  }
}

/**
 * Encapsulates an artisan candle or wax creation in the catalog.
 */
export class Product {
  /**
   * @param {Object} params
   */
  constructor(params) {
    if (!params || !params.id || !params.title) {
      throw new Error("Product requires valid 'id' and 'title'.");
    }
    /** @private @type {string} */
    this._id = String(params.id);
    /** @private @type {string} */
    this._slug = String(params.slug || params.id);
    /** @private @type {string} */
    this._title = String(params.title);
    /** @private @type {string} */
    this._collectionId = String(params.collectionId || "");
    /** @private @type {string} */
    this._category = String(params.category || "Velas Artesanales");
    /** @private @type {string} */
    this._shortDescription = String(params.shortDescription || "");
    /** @private @type {string} */
    this._description = String(params.description || "");
    /** @private @type {Object} */
    this._craftsmanshipDetails = {
      waxType: params.craftsmanshipDetails?.waxType || "100% Cera de Soya Natural",
      handmade: params.craftsmanshipDetails?.handmade ?? true,
      dimensions: params.craftsmanshipDetails?.dimensions || "",
      burnTime: params.craftsmanshipDetails?.burnTime || "",
    };
    /** @private @type {string[]} */
    this._allowedFragrances = Array.isArray(params.allowedFragrances)
      ? params.allowedFragrances.map(String)
      : [];
    /** @private @type {ProductVariant[]} */
    this._variants = Array.isArray(params.variants) && params.variants.length > 0
      ? params.variants.map((v) => (v instanceof ProductVariant ? v : ProductVariant.fromJSON(v)))
      : [new ProductVariant({ id: `${params.id}-default`, name: "Estándar", price: Number(params.price || 0) })];
    /** @private @type {ProductCustomizationSpec} */
    this._customizable = new ProductCustomizationSpec(params.customizable || {});
    /** @private @type {string[]} */
    this._images = Array.isArray(params.images) && params.images.length > 0
      ? params.images.map(String)
      : [this._variants[0].image].filter(Boolean);
    /** @private @type {Object} */
    this._externalLinks = {
      stripePriceId: params.externalLinks?.stripePriceId || "",
      stripePaymentLink: params.externalLinks?.stripePaymentLink || "",
      shopifyProductUrl: params.externalLinks?.shopifyProductUrl || "",
      etsyListingUrl: params.externalLinks?.etsyListingUrl || "",
    };
    /** @private @type {boolean} */
    this._featured = Boolean(params.featured);
    /** @private @type {boolean} */
    this._bestseller = Boolean(params.bestseller);
  }

  /** @returns {string} */
  get id() { return this._id; }

  /** @returns {string} */
  get slug() { return this._slug; }

  /** @returns {string} */
  get title() { return this._title; }

  /** @returns {string} */
  get collectionId() { return this._collectionId; }

  /** @returns {string} */
  get category() { return this._category; }

  /** @returns {string} */
  get shortDescription() { return this._shortDescription; }

  /** @returns {string} */
  get description() { return this._description; }

  /** @returns {Object} */
  get craftsmanshipDetails() { return { ...this._craftsmanshipDetails }; }

  /** @returns {string[]} */
  get allowedFragrances() { return [...this._allowedFragrances]; }

  /** @returns {ProductVariant[]} */
  get variants() { return [...this._variants]; }

  /** @returns {ProductCustomizationSpec} */
  get customizable() { return this._customizable; }

  /** @returns {string[]} */
  get images() { return [...this._images]; }

  /** @returns {string} */
  get primaryImage() {
    return this._images[0] || this._variants[0]?.image || "assets/images/brand/logo-dark.png";
  }

  /** @returns {Object} */
  get externalLinks() { return { ...this._externalLinks }; }

  /** @returns {boolean} */
  get featured() { return this._featured; }

  /** @returns {boolean} */
  get bestseller() { return this._bestseller; }

  /** @returns {number} Minimum variant price */
  get basePrice() {
    return Math.min(...this._variants.map((v) => v.price));
  }

  /** @returns {number} Maximum variant price */
  get maxPrice() {
    return Math.max(...this._variants.map((v) => v.price));
  }

  /**
   * Finds a variant by ID or falls back to the first variant.
   * @param {string} [variantId]
   * @returns {ProductVariant}
   */
  getVariantById(variantId) {
    return this._variants.find((v) => v.id === variantId) || this._variants[0];
  }

  /** @returns {Object} */
  toJSON() {
    return {
      id: this._id,
      slug: this._slug,
      title: this._title,
      collectionId: this._collectionId,
      category: this._category,
      shortDescription: this._shortDescription,
      description: this._description,
      craftsmanshipDetails: { ...this._craftsmanshipDetails },
      allowedFragrances: [...this._allowedFragrances],
      variants: this._variants.map((v) => v.toJSON()),
      customizable: this._customizable.toJSON(),
      images: [...this._images],
      externalLinks: { ...this._externalLinks },
      featured: this._featured,
      bestseller: this._bestseller,
    };
  }

  /**
   * @param {Object} raw
   * @returns {Product}
   */
  static fromJSON(raw) {
    return new Product(raw);
  }
}

/**
 * Encapsulates an olfactory fragrance profile and its 3-tier pyramid (Top, Heart, Base).
 */
export class FragranceProfile {
  /**
   * @param {Object} params
   */
  constructor(params) {
    /** @private @type {string} */
    this._id = String(params.id);
    /** @private @type {string} */
    this._name = String(params.name);
    /** @private @type {string} */
    this._family = String(params.family || "Cálido & Especiado");
    /** @private @type {string} */
    this._season = String(params.season || "Todo el Año");
    /** @private @type {number} */
    this._intensity = Math.min(5, Math.max(1, Number(params.intensity || 4)));
    /** @private @type {{top: string[], heart: string[], base: string[]}} */
    this._notes = {
      top: Array.isArray(params.notes?.top) ? params.notes.top.map(String) : [],
      heart: Array.isArray(params.notes?.heart) ? params.notes.heart.map(String) : [],
      base: Array.isArray(params.notes?.base) ? params.notes.base.map(String) : [],
    };
    /** @private @type {string} */
    this._description = String(params.description || "");
  }

  /** @returns {string} */
  get id() { return this._id; }

  /** @returns {string} */
  get name() { return this._name; }

  /** @returns {string} */
  get family() { return this._family; }

  /** @returns {string} */
  get season() { return this._season; }

  /** @returns {number} */
  get intensity() { return this._intensity; }

  /** @returns {{top: string[], heart: string[], base: string[]}} */
  get notes() {
    return {
      top: [...this._notes.top],
      heart: [...this._notes.heart],
      base: [...this._notes.base],
    };
  }

  /** @returns {string} */
  get description() { return this._description; }

  /** @returns {Object} */
  toJSON() {
    return {
      id: this._id,
      name: this._name,
      family: this._family,
      season: this._season,
      intensity: this._intensity,
      notes: this.notes,
      description: this._description,
    };
  }

  /**
   * @param {Object} raw
   * @returns {FragranceProfile}
   */
  static fromJSON(raw) {
    return new FragranceProfile(raw);
  }
}

/**
 * Encapsulates a line item inside the customer's shopping cart.
 */
export class CartItem {
  /**
   * @param {Object} params
   * @param {string} params.productId
   * @param {string} params.productTitle
   * @param {string} params.variantId
   * @param {string} params.variantName
   * @param {number} params.unitPrice
   * @param {string} params.fragranceId
   * @param {string} params.fragranceName
   * @param {string} [params.customText]
   * @param {number} [params.quantity]
   * @param {string} [params.image]
   * @param {Object} [params.externalLinks]
   */
  constructor({
    productId,
    productTitle,
    variantId,
    variantName,
    unitPrice,
    fragranceId,
    fragranceName,
    customText = "",
    quantity = 1,
    image = "",
    externalLinks = {},
  }) {
    /** @private @type {string} */
    this._productId = String(productId);
    /** @private @type {string} */
    this._productTitle = String(productTitle);
    /** @private @type {string} */
    this._variantId = String(variantId);
    /** @private @type {string} */
    this._variantName = String(variantName);
    /** @private @type {number} */
    this._unitPrice = Number(unitPrice) || 0;
    /** @private @type {string} */
    this._fragranceId = String(fragranceId || "");
    /** @private @type {string} */
    this._fragranceName = String(fragranceName || "Aroma de Colección");
    /** @private @type {string} */
    this._customText = String(customText || "").trim();
    /** @private @type {number} */
    this._quantity = Math.max(1, Number(quantity) || 1);
    /** @private @type {string} */
    this._image = String(image || "");
    /** @private @type {Object} */
    this._externalLinks = { ...externalLinks };
  }

  /**
   * Unique composite key distinguishing product + variant + fragrance + customization.
   * @returns {string}
   */
  get lineKey() {
    return `${this._productId}::${this._variantId}::${this._fragranceId}::${this._customText.toLowerCase()}`;
  }

  /** @returns {string} */
  get productId() { return this._productId; }
  /** @returns {string} */
  get productTitle() { return this._productTitle; }
  /** @returns {string} */
  get variantId() { return this._variantId; }
  /** @returns {string} */
  get variantName() { return this._variantName; }
  /** @returns {number} */
  get unitPrice() { return this._unitPrice; }
  /** @returns {string} */
  get fragranceId() { return this._fragranceId; }
  /** @returns {string} */
  get fragranceName() { return this._fragranceName; }
  /** @returns {string} */
  get customText() { return this._customText; }
  /** @returns {number} */
  get quantity() { return this._quantity; }
  /** @param {number} val */
  set quantity(val) { this._quantity = Math.max(1, Number(val) || 1); }
  /** @returns {string} */
  get image() { return this._image; }
  /** @returns {Object} */
  get externalLinks() { return { ...this._externalLinks }; }

  /** @returns {number} */
  get subtotal() {
    return this._unitPrice * this._quantity;
  }

  /** @returns {Object} */
  toJSON() {
    return {
      productId: this._productId,
      productTitle: this._productTitle,
      variantId: this._variantId,
      variantName: this._variantName,
      unitPrice: this._unitPrice,
      fragranceId: this._fragranceId,
      fragranceName: this._fragranceName,
      customText: this._customText,
      quantity: this._quantity,
      image: this._image,
      externalLinks: this._externalLinks,
    };
  }

  /**
   * @param {Object} raw
   * @returns {CartItem}
   */
  static fromJSON(raw) {
    return new CartItem(raw);
  }
}
