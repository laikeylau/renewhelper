/**
 * Modules Index
 * Export all backend modules
 */

// Auth
export { Auth } from './auth/index.js';

// Lunar Calendar
export { LUNAR_DATA, calcBiz } from './lunar/index.js';

// DataStore
export { DataStore } from './datastore/index.js';

// Providers
export {
    fetchCloudflareDomains,
    testCloudflareConnection,
    fetchPorkbunDomains,
    testPorkbunConnection,
    hasDnsheAccounts,
    getEnabledDnsheAccounts,
    fetchDnsheDomains,
    testDnsheAccount,
    syncAllDnsheAccounts,
    syncDnsheAccount,
    addDnsheAccount,
    updateDnsheAccount,
    removeDnsheAccount,
    fetchDigitalPlatDomains,
    testDigitalPlatConnection,
    PROVIDER_NAMES,
    getEnvProviderConfig
} from './providers/index.js';

// Notifications
export {
    sendTelegram,
    sendBark,
    sendPushPlus,
    sendServerChan,
    sendDingTalk,
    sendLark,
    sendWeCom,
    sendNotifyX,
    sendGotify,
    sendNtfy,
    sendWebhook,
    sendEmail,
    sendNotification
} from './notifications/index.js';

// Utils
export {
    generateICS,
    generateSubscriptionICS,
    getSubscriptionUrl,
    normalizeCalendarSubscriptions,
    fetchExchangeRates,
    convertCurrency,
    getSupportedCurrencies,
    formatCurrency,
    clearExchangeRateCache,
    SUPPORTED_CURRENCIES,
    sleep,
    formatDate,
    parseDate,
    daysBetween,
    addDays,
    isExpired,
    generateId,
    maskString,
    deepClone,
    parseCsvToItems,
    parseJsonToItems
} from './utils/index.js';

// Logger
export { logger, measurePerformance } from './utils/logger.js';

// Router
export { Router, response, error, corsMiddleware, loggingMiddleware } from './router/index.js';

export default {
    // Re-export everything for convenience
};
