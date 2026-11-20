/**
 * """
 * Module: cms_repository
 * Description: Object-oriented persistence and synchronization repository for the
 *              Raíz y Cera CMS. Supports portable JSON seed loading, browser
 *              LocalStorage live preview persistence, optional REST server persistence
 *              for paid hosting, and 1-click JSON export/import.
 *
 * Author: Antigravity AI Agent
 * License: Proprietary / Internal
 *
 * Version History:
 * - v1.0.0 | 2026-11-20 | Initial OOP implementation of Dual-Storage CMSRepository
 * """
 */

import { Product, FragranceProfile } from "../domain/models.js";

/**
 * Repository managing CMS state loading, live editing persistence, and portable exports.
 */
export class CMSRepository {
  /**
   * @param {Object} [options]
   * @param {string} [options.seedUrl]
   * @param {string} [options.storageKey]
   * @param {string} [options.apiEndpoint]
   */
  constructor({
    seedUrl = "data/cms_store.json",
    storageKey = "raiz_y_cera_cms_state_v1",
    apiEndpoint = "/api/cms/store",
  } = {}) {
    /** @private @type {string} */
    this._seedUrl = seedUrl;
    /** @private @type {string} */
    this._storageKey = storageKey;
    /** @private @type {string} */
    this._apiEndpoint = apiEndpoint;
    /** @private @type {Object|null} */
    this._state = null;
  }

  /**
   * Loads the CMS state, prioritizing local unpublished CMS edits if present,
   * otherwise fetching the canonical JSON seed file.
   * @param {boolean} [forceSeed=false]
   * @returns {Promise<Object>}
   */
  async loadState(forceSeed = false) {
    if (!forceSeed) {
      const cached = this._readFromLocalStorage();
      if (cached && cached.siteConfig && Array.isArray(cached.products)) {
        this._state = cached;
        return this._hydrateDomainObjects(cached);
      }
    }

    const response = await fetch(this._seedUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`No se pudo cargar la base de datos del CMS (${response.status})`);
    }
    const rawData = await response.json();
    this._state = rawData;
    return this._hydrateDomainObjects(rawData);
  }

  /**
   * Persists the updated CMS state into browser storage and attempts to persist
   * to the portable server API when hosted on a dynamic paid server.
   * @param {Object} newState
   * @returns {Promise<{localSaved: boolean, serverSaved: boolean}>}
   */
  async saveState(newState) {
    const serializedPayload = this._normalizeStateForSerialization(newState);
    serializedPayload.meta = {
      ...(serializedPayload.meta || {}),
      schemaVersion: "1.0.0",
      lastUpdated: new Date().toISOString(),
    };

    this._state = serializedPayload;
    const localSaved = this._writeToLocalStorage(serializedPayload);
    let serverSaved = false;

    try {
      const res = await fetch(this._apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serializedPayload, null, 2),
      });
      serverSaved = res.ok;
    } catch (_err) {
      serverSaved = false;
    }

    return { localSaved, serverSaved };
  }

  /**
   * Clears local overrides and reloads the canonical `data/cms_store.json`.
   * @returns {Promise<Object>}
   */
  async resetToSeed() {
    try {
      window.localStorage.removeItem(this._storageKey);
    } catch (_err) {
      // Ignore storage access errors in restricted frames
    }
    return this.loadState(true);
  }

  /**
   * Triggers a browser download of the full `cms_store.json` file for GitHub commits
   * or migration to another hosting provider.
   * @param {Object} [stateOverride]
   */
  exportToJsonFile(stateOverride = null) {
    const target = this._normalizeStateForSerialization(stateOverride || this._state);
    const jsonString = JSON.stringify(target, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cms_store.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Imports and validates a JSON file uploaded by the administrator.
   * @param {File} file
   * @returns {Promise<Object>}
   */
  async importFromJsonFile(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed.siteConfig || !Array.isArray(parsed.products)) {
      throw new Error("El archivo JSON no cumple con el esquema válido de Raíz y Cera CMS.");
    }
    await this.saveState(parsed);
    return this._hydrateDomainObjects(parsed);
  }

  /**
   * Hydrates raw JSON structures into rich OOP domain instances.
   * @private
   * @param {Object} raw
   * @returns {Object}
   */
  _hydrateDomainObjects(raw) {
    return {
      meta: { ...(raw.meta || {}) },
      siteConfig: JSON.parse(JSON.stringify(raw.siteConfig || {})),
      heroCarousel: Array.isArray(raw.heroCarousel)
        ? raw.heroCarousel.map((slide) => ({ ...slide }))
        : [],
      collections: Array.isArray(raw.collections)
        ? raw.collections.map((col) => ({ ...col }))
        : [],
      fragrances: Array.isArray(raw.fragrances)
        ? raw.fragrances.map((f) => (f instanceof FragranceProfile ? f : FragranceProfile.fromJSON(f)))
        : [],
      products: Array.isArray(raw.products)
        ? raw.products.map((p) => (p instanceof Product ? p : Product.fromJSON(p)))
        : [],
      blogPosts: Array.isArray(raw.blogPosts)
        ? raw.blogPosts.map((post) => ({ ...post }))
        : [],
    };
  }

  /**
   * Converts domain instances back into plain serializable objects.
   * @private
   * @param {Object} state
   * @returns {Object}
   */
  _normalizeStateForSerialization(state) {
    if (!state) {
      throw new Error("Cannot serialize empty CMS state.");
    }
    return {
      meta: { ...(state.meta || {}) },
      siteConfig: JSON.parse(JSON.stringify(state.siteConfig || {})),
      heroCarousel: Array.isArray(state.heroCarousel) ? state.heroCarousel : [],
      collections: Array.isArray(state.collections) ? state.collections : [],
      fragrances: Array.isArray(state.fragrances)
        ? state.fragrances.map((f) => (typeof f.toJSON === "function" ? f.toJSON() : f))
        : [],
      products: Array.isArray(state.products)
        ? state.products.map((p) => (typeof p.toJSON === "function" ? p.toJSON() : p))
        : [],
      blogPosts: Array.isArray(state.blogPosts) ? state.blogPosts : [],
    };
  }

  /**
   * @private
   * @returns {Object|null}
   */
  _readFromLocalStorage() {
    try {
      const raw = window.localStorage.getItem(this._storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (_err) {
      return null;
    }
  }

  /**
   * @private
   * @param {Object} payload
   * @returns {boolean}
   */
  _writeToLocalStorage(payload) {
    try {
      window.localStorage.setItem(this._storageKey, JSON.stringify(payload));
      return true;
    } catch (_err) {
      return false;
    }
  }
}
