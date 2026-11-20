/**
 * """
 * Module: marketplace_exporter
 * Description: Object-oriented catalog exporter generating official Shopify and Etsy
 *              CSV import files directly from the Raíz y Cera CMS product database.
 *
 * Author: Antigravity AI Agent
 * License: Proprietary / Internal
 *
 * Version History:
 * - v1.0.0 | 2026-11-20 | Initial OOP implementation of Shopify & Etsy CSV exporter
 * """
 */

/**
 * Formats and triggers CSV downloads for Shopify and Etsy catalog synchronization.
 */
export class MarketplaceExporter {
  /**
   * Generates a Shopify-compatible product import CSV string.
   * @param {Array<Object>} products
   * @param {Array<Object>} fragrances
   * @returns {string}
   */
  static toShopifyCSV(products = [], fragrances = []) {
    const fragranceMap = new Map(fragrances.map((f) => [f.id, f.name]));
    const headers = [
      "Handle",
      "Title",
      "Body (HTML)",
      "Vendor",
      "Product Category",
      "Type",
      "Tags",
      "Published",
      "Option1 Name",
      "Option1 Value",
      "Option2 Name",
      "Option2 Value",
      "Variant SKU",
      "Variant Price",
      "Variant Inventory Policy",
      "Variant Fulfillment Service",
      "Image Src",
    ];

    const rows = [headers];

    for (const rawProduct of products) {
      const p = typeof rawProduct.toJSON === "function" ? rawProduct.toJSON() : rawProduct;
      const fragrancesList =
        Array.isArray(p.allowedFragrances) && p.allowedFragrances.length > 0
          ? p.allowedFragrances.map((id) => fragranceMap.get(id) || id)
          : ["Aroma de Colección"];

      const tags = [
        p.collectionId,
        p.category,
        "Cera de Soya",
        "Hecho a Mano",
        p.customizable?.enabled ? "Personalizable" : "",
      ]
        .filter(Boolean)
        .join(", ");

      let firstRow = true;
      for (const variant of p.variants || []) {
        for (const aromaName of fragrancesList) {
          rows.push([
            p.slug || p.id,
            firstRow ? p.title : "",
            firstRow ? `<p>${p.description || p.shortDescription}</p>` : "",
            firstRow ? "Raíz y Cera" : "",
            firstRow ? "Home & Garden > Decor > Candles" : "",
            firstRow ? p.category : "",
            firstRow ? tags : "",
            firstRow ? "TRUE" : "",
            "Presentación",
            variant.name,
            "Aroma",
            aromaName,
            `${variant.sku || p.id}-${aromaName.slice(0, 3).toUpperCase()}`,
            String(variant.price || 0),
            "continue",
            "manual",
            firstRow ? variant.image || (p.images && p.images[0]) || "" : "",
          ]);
          firstRow = false;
        }
      }
    }

    return MarketplaceExporter._encodeCSV(rows);
  }

  /**
   * Generates an Etsy-compatible product listing CSV string.
   * @param {Array<Object>} products
   * @param {Array<Object>} fragrances
   * @returns {string}
   */
  static toEtsyCSV(products = [], fragrances = []) {
    const fragranceMap = new Map(fragrances.map((f) => [f.id, f.name]));
    const headers = [
      "Title",
      "Description",
      "Price",
      "Currency_Code",
      "Quantity",
      "Tags",
      "Materials",
      "Personalization_Is_Available",
      "Personalization_Instructions",
      "Variation_1_Type",
      "Variation_1_Name",
      "Variation_1_Values",
      "Variation_2_Type",
      "Variation_2_Name",
      "Variation_2_Values",
      "SKU",
      "Image_1",
    ];

    const rows = [headers];

    for (const rawProduct of products) {
      const p = typeof rawProduct.toJSON === "function" ? rawProduct.toJSON() : rawProduct;
      const variantNames = (p.variants || []).map((v) => v.name).join(" | ");
      const aromaNames = (p.allowedFragrances || [])
        .map((id) => fragranceMap.get(id) || id)
        .join(" | ");
      const basePrice = Math.min(...(p.variants || [{ price: 0 }]).map((v) => Number(v.price)));

      rows.push([
        `${p.title} - Vela Artesanal de Cera de Soya | Raíz y Cera`,
        `${p.description || p.shortDescription}\n\nElaborada a mano con cera de soya 100% natural.`,
        String(basePrice),
        "MXN",
        "25",
        `vela cera de soya,raiz y cera,${p.collectionId},${p.category},hecho a mano`,
        "Cera de soya 100% natural,Pabilo de algodón,Esencias botánicas",
        p.customizable?.enabled ? "TRUE" : "FALSE",
        p.customizable?.label || "",
        "Custom",
        "Presentación",
        variantNames,
        "Custom",
        "Aroma",
        aromaNames,
        p.variants?.[0]?.sku || p.id,
        p.images?.[0] || "",
      ]);
    }

    return MarketplaceExporter._encodeCSV(rows);
  }

  /**
   * Triggers a file download in the browser for a generated CSV payload.
   * @param {string} csvContent
   * @param {string} filename
   */
  static downloadCSV(csvContent, filename) {
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * @private
   * @param {Array<Array<string>>} rows
   * @returns {string}
   */
  static _encodeCSV(rows) {
    return rows
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell ?? "").replace(/"/g, '""');
            return /[",\n\r]/.test(str) ? `"${str}"` : str;
          })
          .join(",")
      )
      .join("\r\n");
  }
}
