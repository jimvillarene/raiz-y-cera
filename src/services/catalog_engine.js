/**
 * """
 * Module: catalog_engine
 * Description: Object-oriented faceted search, olfactory filtering, and sorting engine
 *              inspired by Candle Delirium, Bath & Body Works, and Yankee Candle.
 *
 * Author: Antigravity AI Agent
 * License: Proprietary / Internal
 *
 * Version History:
 * - v1.0.0 | 2026-11-20 | Initial OOP implementation of CatalogFilterEngine
 * """
 */

import { Product, FragranceProfile } from "../domain/models.js";

/**
 * Faceted catalog search and olfactory filtering engine.
 */
export class CatalogFilterEngine {
  /**
   * @param {Product[]} products
   * @param {FragranceProfile[]} fragrances
   */
  constructor(products = [], fragrances = []) {
    this.updateCatalog(products, fragrances);
  }

  /**
   * Updates the internal product and fragrance collections.
   * @param {Product[]} products
   * @param {FragranceProfile[]} fragrances
   */
  updateCatalog(products = [], fragrances = []) {
    /** @private @type {Product[]} */
    this._products = products.map((p) => (p instanceof Product ? p : Product.fromJSON(p)));
    /** @private @type {FragranceProfile[]} */
    this._fragrances = fragrances.map((f) =>
      f instanceof FragranceProfile ? f : FragranceProfile.fromJSON(f)
    );
    /** @private @type {Map<string, FragranceProfile>} */
    this._fragranceMap = new Map(this._fragrances.map((f) => [f.id, f]));
  }

  /**
   * @returns {string[]} Distinct product categories present in the catalog.
   */
  getAvailableCategories() {
    const set = new Set(this._products.map((p) => p.category).filter(Boolean));
    return Array.from(set);
  }

  /**
   * @returns {string[]} Distinct olfactory families present in the fragrance library.
   */
  getAvailableFragranceFamilies() {
    const set = new Set(this._fragrances.map((f) => f.family).filter(Boolean));
    return Array.from(set);
  }

  /**
   * Resolves a FragranceProfile by ID.
   * @param {string} fragranceId
   * @returns {FragranceProfile|null}
   */
  getFragranceById(fragranceId) {
    return this._fragranceMap.get(fragranceId) || null;
  }

  /**
   * Resolves all allowed FragranceProfile objects for a given Product.
   * @param {Product} product
   * @returns {FragranceProfile[]}
   */
  getFragrancesForProduct(product) {
    return product.allowedFragrances
      .map((id) => this._fragranceMap.get(id))
      .filter(Boolean);
  }

  /**
   * Filters and sorts the product catalog according to multi-faceted criteria.
   * @param {Object} [criteria]
   * @param {string} [criteria.collectionId]
   * @param {string} [criteria.category]
   * @param {string} [criteria.fragranceId]
   * @param {string} [criteria.fragranceFamily]
   * @param {boolean} [criteria.onlyCustomizable]
   * @param {boolean} [criteria.onlyBestsellers]
   * @param {number} [criteria.maxPrice]
   * @param {string} [criteria.searchQuery]
   * @param {string} [criteria.sortBy]
   * @returns {Product[]}
   */
  filterProducts(criteria = {}) {
    const {
      collectionId = "all",
      category = "all",
      fragranceId = "all",
      fragranceFamily = "all",
      onlyCustomizable = false,
      onlyBestsellers = false,
      maxPrice = Infinity,
      searchQuery = "",
      sortBy = "featured",
    } = criteria;

    const normalizedQuery = String(searchQuery || "").trim().toLowerCase();

    const filtered = this._products.filter((product) => {
      if (collectionId !== "all" && product.collectionId !== collectionId) {
        return false;
      }
      if (category !== "all" && product.category !== category) {
        return false;
      }
      if (fragranceId !== "all" && !product.allowedFragrances.includes(fragranceId)) {
        return false;
      }
      if (fragranceFamily !== "all") {
        const productFamilies = this.getFragrancesForProduct(product).map((f) => f.family);
        if (!productFamilies.includes(fragranceFamily)) {
          return false;
        }
      }
      if (onlyCustomizable && !product.customizable.enabled) {
        return false;
      }
      if (onlyBestsellers && !product.bestseller) {
        return false;
      }
      if (Number.isFinite(Number(maxPrice)) && product.basePrice > Number(maxPrice)) {
        return false;
      }
      if (normalizedQuery) {
        const fragranceNames = this.getFragrancesForProduct(product)
          .map((f) => `${f.name} ${f.family} ${f.notes.top.join(" ")} ${f.notes.heart.join(" ")} ${f.notes.base.join(" ")}`)
          .join(" ")
          .toLowerCase();
        const haystack = [
          product.title,
          product.shortDescription,
          product.description,
          product.category,
          fragranceNames,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }
      return true;
    });

    return this._sortProducts(filtered, sortBy);
  }

  /**
   * @private
   * @param {Product[]} list
   * @param {string} sortBy
   * @returns {Product[]}
   */
  _sortProducts(list, sortBy) {
    const copy = [...list];
    switch (sortBy) {
      case "price-asc":
        return copy.sort((a, b) => a.basePrice - b.basePrice);
      case "price-desc":
        return copy.sort((a, b) => b.basePrice - a.basePrice);
      case "name-asc":
        return copy.sort((a, b) => a.title.localeCompare(b.title, "es"));
      case "bestsellers":
        return copy.sort((a, b) => Number(b.bestseller) - Number(a.bestseller));
      case "featured":
      default:
        return copy.sort(
          (a, b) =>
            Number(b.featured) * 2 +
            Number(b.bestseller) -
            (Number(a.featured) * 2 + Number(a.bestseller))
        );
    }
  }
}
