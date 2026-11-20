/**
 * """
 * Module: checkout_orchestrator
 * Description: Polymorphic checkout adapters and orchestrator supporting:
 *              1. Stripe Checkout (Live Payment Links / Backend Session + Interactive Sandbox)
 *              2. Shopify & Etsy Marketplace Bridge
 *              3. WhatsApp Concierge Order Checkout (55 2702 6347)
 *
 * Author: Antigravity AI Agent
 * License: Proprietary / Internal
 *
 * Version History:
 * - v1.0.0 | 2026-11-20 | Initial OOP implementation of multi-channel CheckoutOrchestrator
 * """
 */

/**
 * Abstract base adapter for payment/checkout execution.
 */
class BaseCheckoutAdapter {
  /**
   * @param {Object} cartSummary
   * @param {Object} customerInfo
   * @param {Object} siteConfig
   * @returns {Promise<Object>}
   */
  async execute(cartSummary, customerInfo, siteConfig) {
    throw new Error("BaseCheckoutAdapter.execute() must be implemented by subclass.");
  }
}

/**
 * Stripe Checkout adapter supporting live Payment Links, portable server sessions,
 * and an interactive Sandbox checkout experience for GitHub Pages previews.
 */
export class StripeCheckoutAdapter extends BaseCheckoutAdapter {
  /**
   * @param {Object} cartSummary
   * @param {Object} customerInfo
   * @param {Object} siteConfig
   * @returns {Promise<Object>}
   */
  async execute(cartSummary, customerInfo, siteConfig) {
    const stripeConfig = siteConfig?.integrations?.stripe || {};

    // 1. Try portable backend Stripe Checkout Session API if running on paid server
    if (stripeConfig.mode === "live" && stripeConfig.webhookEndpoint) {
      try {
        const response = await fetch(stripeConfig.webhookEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cart: cartSummary, customer: customerInfo }),
        });
        if (response.ok) {
          const session = await response.json();
          if (session.checkoutUrl) {
            return {
              channel: "stripe",
              mode: "live-session",
              redirectUrl: session.checkoutUrl,
            };
          }
        }
      } catch (_err) {
        // Fall through to Payment Link or Sandbox modal
      }
    }

    // 2. Check if single-item or default Stripe Payment Link is configured in CMS
    const singleItemLink =
      cartSummary.items.length === 1
        ? cartSummary.items[0].externalLinks?.stripePaymentLink
        : "";
    const targetPaymentLink = singleItemLink || stripeConfig.defaultPaymentLink || "";

    if (stripeConfig.mode === "live" && targetPaymentLink) {
      return {
        channel: "stripe",
        mode: "payment-link",
        redirectUrl: targetPaymentLink,
      };
    }

    // 3. Interactive Sandbox Simulation for GitHub Pages preview & client approval
    const folio = `RC-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;
    return {
      channel: "stripe",
      mode: "sandbox-modal",
      folio,
      publishableKey: stripeConfig.publishableKey || "pk_test_raizycera_demo",
      cartSummary,
      customerInfo,
    };
  }
}

/**
 * Shopify and Etsy Marketplace Bridge Adapter.
 */
export class MarketplaceBridgeAdapter extends BaseCheckoutAdapter {
  /**
   * @param {string} platform - 'shopify' | 'etsy'
   */
  constructor(platform = "shopify") {
    super();
    /** @private @type {string} */
    this._platform = platform;
  }

  /**
   * @param {Object} cartSummary
   * @param {Object} customerInfo
   * @param {Object} siteConfig
   * @returns {Promise<Object>}
   */
  async execute(cartSummary, customerInfo, siteConfig) {
    const firstItem = cartSummary.items[0];
    if (this._platform === "shopify") {
      const shopifyCfg = siteConfig?.integrations?.shopify || {};
      const itemUrl = firstItem?.externalLinks?.shopifyProductUrl;
      const redirectUrl = itemUrl || shopifyCfg.storefrontUrl || "https://www.shopify.com/mx";
      return {
        channel: "shopify",
        mode: "marketplace-redirect",
        platformName: "Shopify",
        storeDomain: shopifyCfg.storeDomain || "raiz-y-cera.myshopify.com",
        redirectUrl,
        cartSummary,
      };
    }

    const etsyCfg = siteConfig?.integrations?.etsy || {};
    const itemUrl = firstItem?.externalLinks?.etsyListingUrl;
    const redirectUrl = itemUrl || etsyCfg.shopUrl || "https://www.etsy.com/mx";
    return {
      channel: "etsy",
      mode: "marketplace-redirect",
      platformName: "Etsy",
      shopName: etsyCfg.shopName || "RaizYCeraAtelier",
      redirectUrl,
      cartSummary,
    };
  }
}

/**
 * WhatsApp Direct Order Adapter formatting itemized order details, fragrances,
 * and personalized inscriptions for instant confirmation via WhatsApp (55 2702 6347).
 */
export class WhatsAppOrderAdapter extends BaseCheckoutAdapter {
  /**
   * @param {Object} cartSummary
   * @param {Object} customerInfo
   * @param {Object} siteConfig
   * @returns {Promise<Object>}
   */
  async execute(cartSummary, customerInfo, siteConfig) {
    const rawPhone = String(siteConfig?.contact?.whatsappNumber || "5527026347").replace(/\D/g, "");
    const intlPhone = rawPhone.length === 10 ? `52${rawPhone}` : rawPhone;

    const lines = [
      `✨ *NUEVO PEDIDO — ${siteConfig?.brandName || "RAÍZ Y CERA"}* ✨`,
      `────────────────────`,
    ];

    cartSummary.items.forEach((item, index) => {
      lines.push(
        `*${index + 1}. ${item.productTitle}* (${item.variantName})`,
        `   • Cantidad: ${item.quantity} x $${item.unitPrice} MXN = *$${item.unitPrice * item.quantity} MXN*`,
        `   • Aroma: ${item.fragranceName}`
      );
      if (item.customText) {
        lines.push(`   • 🖋️ Personalización: _"${item.customText}"_`);
      }
    });

    lines.push(
      `────────────────────`,
      `• *Subtotal:* $${cartSummary.subtotal} MXN`,
      `• *Envío:* ${
        cartSummary.shippingCost === 0
          ? "GRATIS (Pedido mayor a $" + cartSummary.freeShippingThreshold + " MXN)"
          : "$" + cartSummary.shippingCost + " MXN"
      }`,
      `• *TOTAL:* *$${cartSummary.grandTotal} MXN*`
    );

    if (customerInfo && (customerInfo.name || customerInfo.city || customerInfo.notes)) {
      lines.push(`────────────────────`, `*Datos de Entrega:*`);
      if (customerInfo.name) lines.push(`• Nombre: ${customerInfo.name}`);
      if (customerInfo.phone) lines.push(`• Teléfono: ${customerInfo.phone}`);
      if (customerInfo.city) lines.push(`• Ciudad / Dirección: ${customerInfo.city}`);
      if (customerInfo.notes) lines.push(`• Notas: ${customerInfo.notes}`);
    }

    const messageText = lines.join("\n");
    const encoded = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${intlPhone}?text=${encoded}`;

    return {
      channel: "whatsapp",
      mode: "whatsapp-redirect",
      redirectUrl: whatsappUrl,
      messageText,
    };
  }
}

/**
 * Coordinates multi-channel checkout execution across Stripe, Shopify, Etsy, and WhatsApp.
 */
export class CheckoutOrchestrator {
  constructor() {
    /** @private @type {Map<string, BaseCheckoutAdapter>} */
    this._adapters = new Map([
      ["stripe", new StripeCheckoutAdapter()],
      ["shopify", new MarketplaceBridgeAdapter("shopify")],
      ["etsy", new MarketplaceBridgeAdapter("etsy")],
      ["whatsapp", new WhatsAppOrderAdapter()],
    ]);
  }

  /**
   * Executes the requested checkout channel.
   * @param {string} channel - 'stripe' | 'shopify' | 'etsy' | 'whatsapp'
   * @param {Object} cartSummary
   * @param {Object} customerInfo
   * @param {Object} siteConfig
   * @returns {Promise<Object>}
   */
  async processCheckout(channel, cartSummary, customerInfo, siteConfig) {
    if (!cartSummary || !Array.isArray(cartSummary.items) || cartSummary.items.length === 0) {
      throw new Error("El carrito está vacío. Agrega al menos una vela antes de continuar.");
    }
    const adapter = this._adapters.get(channel);
    if (!adapter) {
      throw new Error(`Canal de pago no soportado: ${channel}`);
    }
    return adapter.execute(cartSummary, customerInfo, siteConfig);
  }
}
