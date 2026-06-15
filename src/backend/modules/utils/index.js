/**
 * Utilities Index
 * Export all utility modules
 */

export {
    generateICS,
    generateSubscriptionICS,
    getSubscriptionUrl,
    normalizeCalendarSubscriptions
} from './calendar.js';

export {
    parseCsvToItems,
    parseJsonToItems
} from './import.js';

export {
    fetchExchangeRates,
    convertCurrency,
    getSupportedCurrencies,
    formatCurrency,
    clearExchangeRateCache,
    SUPPORTED_CURRENCIES
} from './exchange.js';

// Common utility functions
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseDate(dateStr) {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

export function daysBetween(date1, date2) {
    const d1 = parseDate(date1);
    const d2 = parseDate(date2);
    if (!d1 || !d2) return 0;
    return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function addDays(dateStr, days) {
    const d = parseDate(dateStr);
    if (!d) return null;
    d.setDate(d.getDate() + days);
    return formatDate(d);
}

export function isExpired(dateStr) {
    const d = parseDate(dateStr);
    if (!d) return false;
    return d < new Date();
}

export function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function maskString(str, visibleChars = 8) {
    if (!str || str.length <= visibleChars) return str;
    return str.slice(0, visibleChars) + '***';
}

export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export default {
    sleep,
    formatDate,
    parseDate,
    daysBetween,
    addDays,
    isExpired,
    generateId,
    maskString,
    deepClone
};
