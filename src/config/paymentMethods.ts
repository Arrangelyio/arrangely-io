/**
 * Payment Method Configuration
 * 
 * Enable/disable payment methods for different environments
 */

// Determine if we're in production
const isProduction = window.location.hostname === "arrangely.io";

export const PAYMENT_METHOD_CONFIG = {
  // GoPay linking and auto-payment
  gopay: {
    enabled: false, // Disabled in production for now
    linking: false,
    recurring: false,
  },
  
  // Credit Card linking and auto-payment
  creditCard: {
    enabled: false, // Disabled in production for now
    linking: false,
    recurring: false,
  },
  
  // One-time payments (Snap)
  oneTime: {
    enabled: true, // Always enabled
    snap: true,
  },
  
  // Manual recurring payments (Snap)
  manualRecurring: {
    enabled: true, // Always enabled
    daysBeforeExpiry: 2, // Show button when 2 days before expiry (H-2)
  }
};

/**
 * Check if a payment method is enabled
 */
export const isPaymentMethodEnabled = (method: 'gopay' | 'creditCard' | 'oneTime' | 'manualRecurring') => {
  return PAYMENT_METHOD_CONFIG[method]?.enabled ?? false;
};

/**
 * Check if payment method linking is enabled
 */
export const isLinkingEnabled = (method: 'gopay' | 'creditCard') => {
  return PAYMENT_METHOD_CONFIG[method]?.linking ?? false;
};

/**
 * Check if recurring payment is enabled for a method
 */
export const isRecurringEnabled = (method: 'gopay' | 'creditCard') => {
  return PAYMENT_METHOD_CONFIG[method]?.recurring ?? false;
};

/**
 * Get days before expiry for manual recurring
 */
export const getManualRecurringDaysBeforeExpiry = () => {
  return PAYMENT_METHOD_CONFIG.manualRecurring.daysBeforeExpiry;
};
