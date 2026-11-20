/**
 * """
 * Module: cart_service
 * Description: Object-oriented shopping cart manager supporting variants, fragrance
 *              selections, custom personalized inscriptions, free shipping threshold
 *              calculations (default $600 MXN), and persistent browser state.
 *
 * Author: Antigravity AI Agent
 * License: Proprietary / Internal
 *
 * Version History:
 * - v1.0.0 | 2026-11-20 | Initial OOP implementation of CartService
 * """
 */

import { CartItem } from "../domain/models.js";

/**
 * Stateful shopping cart service with observer notifications and shipping rules.
 */
export class CartService {
  /**
   * @param {Object} [options]
   * @param {string} [options.storageKey]
   * @param {number} [options.freeShippingThreshold]
   * @param {number} [options.standardShippingRate]
   */
  constructor({
    storageKey = "raiz_y_cera_cart_v1",
    freeShippingThreshold = 600,
    standardShippingRate = 120,
  } = {}) {
    /** @private @type {string} */
    this._storageKey = storageKey;
    /** @private @type {number} */
    this._freeShippingThreshold = Number(freeShippingThreshold) || 600;
    /** @private @type {number} */
    this._standardShippingRate = Number(standardShippingRate) || 120;
    /** @private @type {CartItem[]} */
    this._items = [];
    /** @private @type {Function[]} */
    this._listeners = [];

    this._loadFromStorage();
  }

  /**
   * Updates shipping parameters dynamically from the CMS configuration.
   * @param {Object} config
   * @param {number} [config.freeShippingThreshold]
   * @param {number} [config.standardShippingRate]
   */
  configureShipping({ freeShippingThreshold, standardShippingRate }) {
    if (Number.isFinite(Number(freeShippingThreshold))) {
      this._freeShippingThreshold = Number(freeShippingThreshold);
    }
    if (Number.isFinite(Number(standardShippingRate))) {
      this._standardShippingRate = Number(standardShippingRate);
    }
    this._notify();
  }

  /**
   * Subscribes a listener callback invoked whenever cart state mutates.
   * @param {Function} listener
   */
  subscribe(listener) {
    if (typeof listener === "function") {
      this._listeners.push(listener);
    }
  }

  /** @returns {CartItem[]} */
  get items() {
    return [...this._items];
  }

  /** @returns {number} Total unit count across all items */
  get totalCount() {
    return this._items.reduce((sum, item) => sum + item.quantity, 0);
  }

  /** @returns {number} Merchandise subtotal in MXN */
  get subtotal() {
    return this._items.reduce((sum, item) => sum + item.subtotal, 0);
  }

  /** @returns {number} Free shipping threshold in MXN */
  get freeShippingThreshold() {
    return this._freeShippingThreshold;
  }

  /** @returns {number} Standard shipping fee in MXN */
  get standardShippingRate() {
    return this._standardShippingRate;
  }

  /** @returns {boolean} True when order qualifies for free shipping */
  get qualifiesForFreeShipping() {
    return this.subtotal >= this._freeShippingThreshold;
  }

  /** @returns {number} Remaining MXN required to unlock free shipping */
  get amountRemainingForFreeShipping() {
    return Math.max(0, this._freeShippingThreshold - this.subtotal);
  }

  /** @returns {number} Percentage (0..100) toward free shipping threshold */
  get freeShippingProgressPercent() {
    if (this._freeShippingThreshold <= 0) return 100;
    return Math.min(100, Math.round((this.subtotal / this._freeShippingThreshold) * 100));
  }

  /** @returns {number} Computed shipping fee in MXN */
  get shippingCost() {
    if (this._items.length === 0) return 0;
    return this.qualifiesForFreeShipping ? 0 : this._standardShippingRate;
  }

  /** @returns {number} Grand total including shipping */
  get grandTotal() {
    return this.subtotal + this.shippingCost;
  }

  /**
   * Adds an item to the cart or increments quantity if an identical lineKey exists.
   * @param {CartItem|Object} itemData
   * @returns {CartItem}
   */
  addItem(itemData) {
    const newItem = itemData instanceof CartItem ? itemData : CartItem.fromJSON(itemData);
    const existing = this._items.find((i) => i.lineKey === newItem.lineKey);
    if (existing) {
      existing.quantity += newItem.quantity;
    } else {
      this._items.push(newItem);
    }
    this._persistAndNotify();
    return existing || newItem;
  }

  /**
   * Updates the quantity of a line item identified by lineKey.
   * @param {string} lineKey
   * @param {number} newQuantity
   */
  updateQuantity(lineKey, newQuantity) {
    const qty = Number(newQuantity);
    if (qty <= 0) {
      this.removeItem(lineKey);
      return;
    }
    const target = this._items.find((i) => i.lineKey === lineKey);
    if (target) {
      target.quantity = qty;
      this._persistAndNotify();
    }
  }

  /**
   * Removes a line item by its composite lineKey.
   * @param {string} lineKey
   */
  removeItem(lineKey) {
    this._items = this._items.filter((i) => i.lineKey !== lineKey);
    this._persistAndNotify();
  }

  /**
   * Empties the cart completely.
   */
  clear() {
    this._items = [];
    this._persistAndNotify();
  }

  /**
   * Returns a snapshot of the complete cart summary.
   * @returns {Object}
   */
  getSummary() {
    return {
      items: this._items.map((i) => i.toJSON()),
      totalCount: this.totalCount,
      subtotal: this.subtotal,
      shippingCost: this.shippingCost,
      grandTotal: this.grandTotal,
      freeShippingThreshold: this._freeShippingThreshold,
      qualifiesForFreeShipping: this.qualifiesForFreeShipping,
      amountRemainingForFreeShipping: this.amountRemainingForFreeShipping,
      freeShippingProgressPercent: this.freeShippingProgressPercent,
    };
  }

  /**
   * @private
   */
  _persistAndNotify() {
    try {
      window.localStorage.setItem(
        this._storageKey,
        JSON.stringify(this._items.map((i) => i.toJSON()))
      );
    } catch (_err) {
      // Ignore storage quota errors
    }
    this._notify();
  }

  /**
   * @private
   */
  _loadFromStorage() {
    try {
      const raw = window.localStorage.getItem(this._storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this._items = parsed.map((item) => CartItem.fromJSON(item));
        }
      }
    } catch (_err) {
      this._items = [];
    }
  }

  /**
   * @private
   */
  _notify() {
    const summary = this.getSummary();
    for (const listener of this._listeners) {
      listener(summary);
    }
  }
}
