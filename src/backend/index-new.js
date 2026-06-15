/**
 * Cloudflare Worker: RenewHelper (v4)
 * Author: LOSTFREE
 * Refactored with modular architecture
 * 
 * Features: Multi-Channel Notify, Import/Export, Channel Test, Bilingual UI, 
 *           Precise ICS Alarm, Bill Management, Multi-Account DNSHE
 */

import { HTML } from '../html-template.js';

// Import modules
import {
    Auth,
    LUNAR_DATA,
    calcBiz,
    DataStore,
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
    getEnvProviderConfig,
    sendNotification,
    generateICS,
    generateSubscriptionICS,
    getSubscriptionUrl,
    normalizeCalendarSubscriptions,
    fetchExchangeRates,
    convertCurrency,
    sleep,
    formatDate,
    generateId,
    maskString,
    logger,
    measurePerformance,
    Router,
    response,
    error,
    parseCsvToItems,
    parseJsonToItems
} from './modules/index.js';

// APP_VERSION will be injected at build time
const APP_VERSION = __BUILD_VERSION__;

// ==========================================
// Router Setup
// ==========================================
const app = new Router();

// ==========================================
// Domain Provider Config
// ==========================================
const DOMAIN_PROVIDERS_KV_KEY = 'domain_providers_config';

async function getProviderConfig(env) {
    const envConfig = getEnvProviderConfig(env);
    const kvConfig = await env.RENEW_KV.get(DOMAIN_PROVIDERS_KV_KEY, { type: 'json' });
    
    if (!kvConfig) return envConfig;

    const merged = { ...envConfig };
    for (const provider of Object.keys(merged)) {
        if (provider === 'dnshe') {
            // DNSHE is an array - handle specially
            if (Array.isArray(kvConfig.dnshe)) {
                merged.dnshe = kvConfig.dnshe;
            } else if (kvConfig.dnshe && typeof kvConfig.dnshe === 'object') {
                merged.dnshe = kvConfig.dnshe.apiKey ? [kvConfig.dnshe] : [];
            }
        } else {
            const kvProvider = kvConfig[provider] || {};
            merged[provider] = {
                ...merged[provider],
                ...kvProvider,
                apiKey: kvProvider.apiKey || merged[provider].apiKey || '',
                apiSecret: kvProvider.apiSecret || merged[provider].apiSecret || '',
                email: kvProvider.email || merged[provider].email || '',
                apiType: kvProvider.apiType || merged[provider].apiType || 'global'
            };
        }
    }
    return merged;
}

async function saveProviderConfig(env, config) {
    await env.RENEW_KV.put(DOMAIN_PROVIDERS_KV_KEY, JSON.stringify(config));
}

// ==========================================
// Business Logic: Renewal Calculation
// ==========================================
function calculateNextRenewal(item) {
    if (!item.lastRenewDate) return null;
    
    const [year, month, day] = item.lastRenewDate.split('-').map(Number);
    const interval = item.intervalDays || 365;
    const unit = item.cycleUnit || 'year';
    
    const date = new Date(year, month - 1, day);
    
    if (item.cycleUnit === 'lunar') {
        const l = LUNAR_DATA.solar2lunar(year, month, day);
        if (l) {
            return calcBiz.nextSolarDate({ ...item, createYear: year, createMonth: month, createDay: day }, interval);
        }
    }
    
    switch (unit) {
        case 'year':
            date.setFullYear(date.getFullYear() + Math.floor(interval / 365));
            date.setDate(date.getDate() + (interval % 365));
            break;
        case 'month':
            date.setMonth(date.getMonth() + interval);
            break;
        case 'day':
            date.setDate(date.getDate() + interval);
            break;
    }
    
    return formatDate(date);
}

// ==========================================
// Business Logic: Auto-Renew & Disable
// ==========================================
async function checkAndRenew(env, isManual = false) {
    const items = await DataStore.getItems(env);
    const settings = await DataStore.getSettings(env);
    let changed = false;
    
    for (const item of items) {
        if (!item.enabled) continue;
        
        const nextDate = calculateNextRenewal(item);
        if (!nextDate) continue;
        
        const today = formatDate(new Date());
        const daysUntilRenewal = Math.ceil((new Date(nextDate) - new Date(today)) / (1000 * 60 * 60 * 24));
        
        // Auto-renew if past due
        if (daysUntilRenewal < 0 && item.autoRenew) {
            item.lastRenewDate = today;
            item.renewHistory = item.renewHistory || [];
            item.renewHistory.push({ date: today, type: 'auto' });
            changed = true;
            logger.info('Auto-renewed', { itemId: item.id, itemName: item.name });
        }
        
        // Auto-disable if overdue too long
        if (daysUntilRenewal < -90) {
            item.enabled = false;
            changed = true;
            logger.info('Auto-disabled', { itemId: item.id, itemName: item.name, daysOverdue: Math.abs(daysUntilRenewal) });
        }
        
        // Send notifications
        if (daysUntilRenewal >= 0 && daysUntilRenewal <= (item.notifyDays || 30)) {
            await sendReminderNotifications(env, item, daysUntilRenewal, settings);
        }
    }
    
    if (changed) {
        await DataStore.saveItems(env, items, null, true);
    }
    
    return { processed: items.length, changed };
}

async function sendReminderNotifications(env, item, daysUntilRenewal, settings) {
    const channels = await DataStore.getChannels(env);
    const enabledChannels = (channels.channels || []).filter(c => 
        c.enabled && item.notifyChannelIds?.includes(c.id)
    );
    
    for (const channel of enabledChannels) {
        try {
            const title = `续费提醒: ${item.name}`;
            const message = `服务 ${item.name} 将在 ${daysUntilRenewal} 天后到期，请及时续费。`;
            await sendNotification(channel, title, message);
        } catch (err) {
            logger.error('Notification failed', err, { channelId: channel.id, itemName: item.name });
        }
    }
}

// ==========================================
// API Routes: Auth
// ==========================================
app.post("/api/login", async (req, env) => {
    try {
        const { password } = await req.json();
        const token = await Auth.login(password, env);
        return response({ code: 200, data: { token } });
    } catch (err) {
        return error(err.message, 401);
    }
});

// ==========================================
// API Routes: Items
// ==========================================
app.get("/api/items", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    const items = await DataStore.getItems(env);
    return response({ code: 200, data: items });
});

app.post("/api/items", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    try {
        const item = await req.json();
        item.id = item.id || generateId();
        item.createDate = item.createDate || formatDate(new Date());
        item.lastRenewDate = item.lastRenewDate || item.createDate;
        await DataStore.addItem(env, item);
        return response({ code: 200, data: item });
    } catch (err) {
        return error(err.message, 500);
    }
});

app.post("/api/items/update", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    try {
        const { itemId, ...updates } = await req.json();
        await DataStore.updateItem(env, itemId, updates);
        return response({ code: 200, msg: 'UPDATED' });
    } catch (err) {
        return error(err.message, 500);
    }
});

app.post("/api/items/delete", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    try {
        const { itemIds } = await req.json();
        if (Array.isArray(itemIds)) {
            await DataStore.deleteItems(env, itemIds);
        } else {
            await DataStore.deleteItem(env, itemIds);
        }
        return response({ code: 200, msg: 'DELETED' });
    } catch (err) {
        return error(err.message, 500);
    }
});

// ==========================================
// API Routes: Domain Providers
// ==========================================
app.get("/api/domain-providers", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    const config = await getProviderConfig(env);
    return response({
        code: 200,
        data: {
            cloudflare: { configured: !!(config.cloudflare.enabled && config.cloudflare.apiKey && config.cloudflare.email), type: config.cloudflare.apiType || 'global' },
            porkbun: { configured: !!(config.porkbun.enabled && config.porkbun.apiKey && config.porkbun.apiSecret) },
            dnshe: {
                configured: hasDnsheAccounts(config),
                accounts: (config.dnshe || []).map(acc => ({ id: acc.id, name: acc.name, configured: !!(acc.enabled && acc.apiKey && acc.apiSecret) }))
            },
            digitalplat: { configured: !!(config.digitalplat.enabled && (config.digitalplat.apiSecret || config.digitalplat.apiKey)) }
        }
    });
});

app.get("/api/domain-providers/config", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    const config = await getProviderConfig(env);
    const masked = {};
    for (const [provider, settings] of Object.entries(config)) {
        if (provider === 'dnshe') {
            masked.dnshe = (config.dnshe || []).map(acc => ({
                ...acc,
                apiKey: acc.apiKey ? maskString(acc.apiKey) : '',
                apiSecret: acc.apiSecret ? maskString(acc.apiSecret) : ''
            }));
        } else {
            masked[provider] = { ...settings };
            if (masked[provider].apiKey) masked[provider].apiKey = maskString(masked[provider].apiKey);
            if (masked[provider].apiSecret) masked[provider].apiSecret = maskString(masked[provider].apiSecret);
        }
    }
    return response({ code: 200, data: masked });
});

app.post("/api/domain-providers/config", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    try {
        const newConfig = await req.json();
        const currentConfig = await getProviderConfig(env);
        const mergedConfig = { ...currentConfig };
        
        for (const [provider, settings] of Object.entries(newConfig)) {
            if (provider === 'dnshe') continue; // DNSHE handled separately
            if (mergedConfig[provider]) {
                if (settings.apiKey !== undefined && settings.apiKey !== '' && !settings.apiKey.endsWith('***')) {
                    mergedConfig[provider].apiKey = settings.apiKey;
                }
                if (settings.apiSecret !== undefined && settings.apiSecret !== '' && !settings.apiSecret.endsWith('***')) {
                    mergedConfig[provider].apiSecret = settings.apiSecret;
                }
                if (settings.email !== undefined) mergedConfig[provider].email = settings.email;
                if (settings.apiType !== undefined) mergedConfig[provider].apiType = settings.apiType;
                if (settings.enabled !== undefined) mergedConfig[provider].enabled = settings.enabled;
            }
        }
        
        await saveProviderConfig(env, mergedConfig);
        return response({ code: 200, msg: 'CONFIG_SAVED' });
    } catch (err) {
        return error('SAVE_FAILED: ' + err.message, 500);
    }
});

// DNSHE Account Management
app.post("/api/dnshe/accounts", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    try {
        const account = await req.json();
        const config = await getProviderConfig(env);
        const newAccount = await addDnsheAccount(config, env, account);
        await saveProviderConfig(env, config);
        return response({ code: 200, data: newAccount });
    } catch (err) {
        return error('ADD_FAILED: ' + err.message, 500);
    }
});

app.post("/api/dnshe/accounts/update", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    try {
        const { accountId, ...updates } = await req.json();
        const config = await getProviderConfig(env);
        const account = await updateDnsheAccount(config, env, accountId, updates);
        await saveProviderConfig(env, config);
        return response({ code: 200, data: account });
    } catch (err) {
        return error('UPDATE_FAILED: ' + err.message, 500);
    }
});

app.post("/api/dnshe/accounts/delete", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    try {
        const { accountId } = await req.json();
        const config = await getProviderConfig(env);
        await removeDnsheAccount(config, env, accountId);
        await saveProviderConfig(env, config);
        return response({ code: 200, data: { success: true, deleted: accountId } });
    } catch (err) {
        return error('DELETE_FAILED: ' + err.message, 500);
    }
});

// ==========================================
// API Routes: Sync Domains
// ==========================================
async function syncDomainsFromProvider(env, provider) {
    const config = await getProviderConfig(env);
    let domains = [];
    
    if (provider === 'cloudflare') {
        domains = await fetchCloudflareDomains(config.cloudflare);
    } else if (provider === 'porkbun') {
        domains = await fetchPorkbunDomains(config.porkbun);
    } else if (provider === 'dnshe') {
        const result = await syncAllDnsheAccounts(config);
        domains = result.domains;
        if (result.errors.length > 0) {
            logger.warn('DNSHE sync errors', { errors: result.errors });
        }
    } else if (provider === 'digitalplat') {
        domains = await fetchDigitalPlatDomains(config.digitalplat);
    }
    
    // Import domains
    const items = await DataStore.getItems(env);
    const existing = new Set(items.filter(i => i.tags?.includes('Domain')).map(i => i.name.toLowerCase()));
    const imported = [];
    const skipped = [];
    
    for (const domain of domains) {
        if (existing.has(domain.name.toLowerCase())) {
            skipped.push({ name: domain.name, status: 'skipped' });
            continue;
        }
        
        imported.push({
            id: generateId(),
            name: domain.name,
            tags: ['Domain', provider],
            type: 'reset',
            enabled: true,
            createDate: formatDate(new Date()),
            lastRenewDate: formatDate(new Date()),
            intervalDays: 365,
            cycleUnit: 'year',
            notifyDays: 30,
            notifyTime: '09:00',
            autoRenew: false,
            message: 'Provider: ' + provider + (domain.accountName ? ' (' + domain.accountName + ')' : ''),
            fixedPrice: 0,
            currency: 'USD',
            notifyTimes: ['09:00'],
            notifyChannelIds: [],
            renewHistory: [],
            renewUrl: ''
        });
        existing.add(domain.name.toLowerCase());
    }
    
    if (imported.length > 0) {
        await DataStore.saveItems(env, [...items, ...imported], null, true);
    }
    
    return { synced: imported.length, skipped: skipped.length };
}

app.post("/api/sync-domains/cloudflare", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    try {
        const result = await syncDomainsFromProvider(env, 'cloudflare');
        return response({ code: 200, data: result });
    } catch (err) {
        return error('SYNC_FAILED: ' + err.message, 500);
    }
});

app.post("/api/sync-domains/porkbun", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    try {
        const result = await syncDomainsFromProvider(env, 'porkbun');
        return response({ code: 200, data: result });
    } catch (err) {
        return error('SYNC_FAILED: ' + err.message, 500);
    }
});

app.post("/api/sync-domains/dnshe", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    try {
        let body = {};
        try { body = await req.json(); } catch (e) {}
        
        const config = await getProviderConfig(env);
        let domains = [];
        
        if (body.accountId) {
            domains = await syncDnsheAccount(config, body.accountId);
        } else {
            const result = await syncAllDnsheAccounts(config);
            domains = result.domains;
        }
        
        // Import domains
        const items = await DataStore.getItems(env);
        const existing = new Set(items.filter(i => i.tags?.includes('Domain')).map(i => i.name.toLowerCase()));
        const imported = [];
        const skipped = [];
        
        for (const domain of domains) {
            if (existing.has(domain.name.toLowerCase())) {
                skipped.push({ name: domain.name, status: 'skipped' });
                continue;
            }
            
            imported.push({
                id: generateId(),
                name: domain.name,
                tags: ['Domain', 'dnshe'],
                type: 'reset',
                enabled: true,
                createDate: formatDate(new Date()),
                lastRenewDate: formatDate(new Date()),
                intervalDays: 365,
                cycleUnit: 'year',
                notifyDays: 30,
                notifyTime: '09:00',
                autoRenew: false,
                message: 'Provider: DNSHE' + (domain.accountName ? ' (' + domain.accountName + ')' : ''),
                fixedPrice: 0,
                currency: 'USD',
                notifyTimes: ['09:00'],
                notifyChannelIds: [],
                renewHistory: [],
                renewUrl: ''
            });
            existing.add(domain.name.toLowerCase());
        }
        
        if (imported.length > 0) {
            await DataStore.saveItems(env, [...items, ...imported], null, true);
        }
        
        return response({ code: 200, data: { synced: imported.length, skipped: skipped.length } });
    } catch (err) {
        return error('SYNC_FAILED: ' + err.message, 500);
    }
});

app.post("/api/sync-domains/digitalplat", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    try {
        const result = await syncDomainsFromProvider(env, 'digitalplat');
        return response({ code: 200, data: result });
    } catch (err) {
        return error('SYNC_FAILED: ' + err.message, 500);
    }
});

app.post("/api/sync-domains/all", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    try {
        const results = { cloudflare: null, porkbun: null, dnshe: null, digitalplat: null, total: 0 };
        const config = await getProviderConfig(env);
        
        for (const provider of PROVIDER_NAMES) {
            if (provider === 'dnshe' && !hasDnsheAccounts(config)) continue;
            if (provider !== 'dnshe' && !config[provider]?.enabled) continue;
            
            try {
                results[provider] = await syncDomainsFromProvider(env, provider);
                results.total += results[provider].synced;
            } catch (err) {
                results[provider] = { error: err.message };
            }
        }
        
        return response({ code: 200, data: results });
    } catch (err) {
        return error('SYNC_FAILED: ' + err.message, 500);
    }
});

// ==========================================
// API Routes: Test Provider
// ==========================================
app.post("/api/domain-providers/test", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    try {
        const { provider, accountId } = await req.json();
        const config = await getProviderConfig(env);
        
        // Handle DNSHE multi-account testing
        if (provider === 'dnshe') {
            if (accountId) {
                const account = (config.dnshe || []).find(acc => acc.id === accountId);
                if (!account || !account.enabled) return error('ACCOUNT_NOT_FOUND', 400);
                const result = await testDnsheAccount(account);
                return response({ code: 200, data: result });
            } else {
                // Test all accounts
                const results = [];
                for (const account of (config.dnshe || [])) {
                    if (!account.enabled || !account.apiKey || !account.apiSecret) continue;
                    const result = await testDnsheAccount(account);
                    results.push({ id: account.id, name: account.name, ...result });
                }
                return response({ code: 200, data: { accounts: results } });
            }
        }
        
        const providerConfig = config[provider];
        if (!providerConfig || !providerConfig.enabled) return error('PROVIDER_NOT_ENABLED', 400);
        
        let result;
        if (provider === 'cloudflare') {
            result = await testCloudflareConnection(providerConfig);
        } else if (provider === 'porkbun') {
            result = await testPorkbunConnection(providerConfig);
        } else if (provider === 'digitalplat') {
            result = await testDigitalPlatConnection(providerConfig);
        } else {
            return error('UNKNOWN_PROVIDER', 400);
        }
        
        return response({ code: 200, data: result });
    } catch (err) {
        return error('TEST_FAILED: ' + err.message, 500);
    }
});

// ==========================================
// API Routes: Calendar
// ==========================================
app.get("/api/calendar.ics", async (req, env, url) => {
    const token = url.searchParams.get('token');
    const subId = url.searchParams.get('sub') || 'default';
    
    if (!token) return error('Token required', 401);
    
    const items = await DataStore.getItems(env);
    const ics = generateICS(items);
    
    return new Response(ics, {
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `inline; filename="renewhelper.ics"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
    });
});

// ==========================================
// API Routes: Settings
// ==========================================
app.get("/api/settings", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    const settings = await DataStore.getSettings(env);
    return response({ code: 200, data: settings });
});

app.post("/api/settings", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    try {
        const updates = await req.json();
        await DataStore.updateSettings(env, updates);
        return response({ code: 200, msg: 'SETTINGS_SAVED' });
    } catch (err) {
        return error('SAVE_FAILED: ' + err.message, 500);
    }
});

// ==========================================
// API Routes: Exchange Rates
// ==========================================
app.get("/api/exchange-rates", async (req, env, url) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    try {
        const base = url.searchParams.get('base') || 'USD';
        const rates = await fetchExchangeRates(base);
        return response({ code: 200, data: { base, rates } });
    } catch (err) {
        return error('FETCH_FAILED: ' + err.message, 500);
    }
});

// ==========================================
// API Routes: Dashboard/Stats
// ==========================================
app.get("/api/dashboard", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    const items = await DataStore.getItems(env);
    
    const stats = {
        total: items.length,
        active: items.filter(i => i.enabled).length,
        expiringSoon: items.filter(i => {
            if (!i.enabled || !i.lastRenewDate) return false;
            const nextDate = calculateNextRenewal(i);
            if (!nextDate) return false;
            const daysUntil = Math.ceil((new Date(nextDate) - new Date()) / (1000 * 60 * 60 * 24));
            return daysUntil >= 0 && daysUntil <= 30;
        }).length,
        expired: items.filter(i => {
            if (!i.enabled || !i.lastRenewDate) return false;
            const nextDate = calculateNextRenewal(i);
            if (!nextDate) return false;
            return new Date(nextDate) < new Date();
        }).length
    };
    
    return response({ code: 200, data: stats });
});

// ==========================================
// API Routes: Export/Import
// ==========================================
app.get("/api/export", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    const items = await DataStore.getItems(env);
    const settings = await DataStore.getSettings(env);
    return response({ code: 200, data: { items, settings, exportDate: new Date().toISOString() } });
});

app.post("/api/import", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    try {
        const data = await req.json();
        if (data.items) {
            await DataStore.saveItems(env, data.items);
        }
        if (data.settings) {
            await DataStore.saveSettings(env, data.settings);
        }
        return response({ code: 200, msg: 'IMPORT_SUCCESS' });
    } catch (err) {
        return error('IMPORT_FAILED: ' + err.message, 500);
    }
});

// Batch import (CSV/JSON)
app.post("/api/import/batch", async (req, env) => {
    if (!(await Auth.verify(req, env))) return error('Unauthorized', 401);
    try {
        const formData = await req.formData();
        const file = formData.get('file');
        const provider = formData.get('provider') || 'batch-import';
        
        if (!file) {
            return error('No file provided', 400);
        }
        
        const text = await file.text();
        let newItems = [];
        
        if (file.name.endsWith('.csv')) {
            newItems = parseCsvToItems(text, provider);
        } else if (file.name.endsWith('.json')) {
            newItems = parseJsonToItems(text, provider);
        } else {
            return error('Unsupported file format. Please use CSV or JSON.', 400);
        }
        
        // Filter out duplicates
        const existingItems = await DataStore.getItems(env);
        const existingNames = new Set(existingItems.map(i => i.name.toLowerCase()));
        
        const imported = [];
        const skipped = [];
        
        for (const item of newItems) {
            if (!item) continue;
            if (existingNames.has(item.name.toLowerCase())) {
                skipped.push({ name: item.name, status: 'skipped' });
                continue;
            }
            imported.push(item);
            existingNames.add(item.name.toLowerCase());
        }
        
        if (imported.length > 0) {
            await DataStore.saveItems(env, [...existingItems, ...imported], null, true);
        }
        
        return response({
            code: 200,
            data: {
                synced: imported.length,
                skipped: skipped.length,
                total: newItems.length
            }
        });
    } catch (err) {
        return error('IMPORT_FAILED: ' + err.message, 500);
    }
});

// ==========================================
// Frontend
// ==========================================
app.get("/", async (req, env) => {
    return new Response(HTML, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
});

// Catch-all for frontend routes
app.get("*", async (req, env) => {
    return new Response(HTML, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
});

// ==========================================
// Export Worker Handlers
// ==========================================
export default {
    async scheduled(event, env, ctx) {
        ctx.waitUntil(checkAndRenew(env, true));
    },
    async fetch(request, env, ctx) {
        return app.route(request, env, ctx).catch(err => 
            error('SERVER ERROR: ' + err.message, 500)
        );
    }
};
