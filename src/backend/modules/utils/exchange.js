/**
 * Exchange Rate Module
 * Fetch exchange rates from Frankfurter API
 */

const EXCHANGE_RATE_API_URL = 'https://api.frankfurter.dev/v1/latest?base=';

// Cache for exchange rates (in-memory)
let exchangeRateCache = {
    data: null,
    timestamp: 0,
    baseCurrency: null
};

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Supported currencies
export const SUPPORTED_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'CNY', 'JPY', 'KRW', 'HKD', 'TWD',
    'SGD', 'AUD', 'CAD', 'CHF', 'SEK', 'NOK', 'DKK', 'RUB',
    'INR', 'BRL', 'MXN', 'ZAR', 'THB', 'MYR', 'IDR', 'PHP',
    'VND', 'PLN', 'CZK', 'HUF', 'TRY', 'AED', 'SAR', 'QAR'
];

// Fetch exchange rates
export async function fetchExchangeRates(baseCurrency = 'USD') {
    // Check cache
    if (
        exchangeRateCache.data &&
        exchangeRateCache.baseCurrency === baseCurrency &&
        Date.now() - exchangeRateCache.timestamp < CACHE_TTL
    ) {
        return exchangeRateCache.data;
    }

    try {
        const resp = await fetch(`${EXCHANGE_RATE_API_URL}${baseCurrency}`);
        if (!resp.ok) throw new Error('Exchange rate API error: ' + resp.status);
        
        const data = await resp.json();
        
        // Update cache
        exchangeRateCache = {
            data: data.rates,
            timestamp: Date.now(),
            baseCurrency
        };
        
        return data.rates;
    } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
        // Return cached data if available
        if (exchangeRateCache.data && exchangeRateCache.baseCurrency === baseCurrency) {
            return exchangeRateCache.data;
        }
        throw error;
    }
}

// Convert amount from one currency to another
export async function convertCurrency(amount, fromCurrency, toCurrency, rates = null) {
    if (fromCurrency === toCurrency) return amount;
    
    if (!rates) {
        rates = await fetchExchangeRates(fromCurrency);
    }
    
    if (!rates[toCurrency]) {
        throw new Error(`Currency not supported: ${toCurrency}`);
    }
    
    // Convert from source to target
    return amount * rates[toCurrency];
}

// Get all supported currency codes
export function getSupportedCurrencies() {
    return SUPPORTED_CURRENCIES;
}

// Format currency amount
export function formatCurrency(amount, currency, locale = 'en-US') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Clear exchange rate cache
export function clearExchangeRateCache() {
    exchangeRateCache = {
        data: null,
        timestamp: 0,
        baseCurrency: null
    };
}

export default {
    fetchExchangeRates,
    convertCurrency,
    getSupportedCurrencies,
    formatCurrency,
    clearExchangeRateCache,
    SUPPORTED_CURRENCIES
};
