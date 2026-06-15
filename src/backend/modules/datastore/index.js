/**
 * DataStore Module
 * Handles all KV storage operations with caching
 */

const ITEMS_KEY = 'items';
const SETTINGS_KEY = 'settings';
const DOMAIN_PROVIDERS_KEY = 'domain_providers_config';
const CHANNELS_KEY = 'channels';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache
const cache = new Map();

// Cache helper
function getCached(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    cache.delete(key);
    return null;
}

function setCache(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
}

function clearCache(key) {
    if (key) {
        cache.delete(key);
    } else {
        cache.clear();
    }
}

// ==========================================
// Items (Services/Reminders)
// ==========================================
const DataStore = {
    // Get items package
    async getItemsPackage(env) {
        const cacheKey = ITEMS_KEY;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        const data = await env.RENEW_KV.get(ITEMS_KEY, { type: 'json' });
        const result = data || { items: [], version: 0 };
        setCache(cacheKey, result);
        return result;
    },

    // Get all items
    async getItems(env) {
        const pkg = await this.getItemsPackage(env);
        return pkg.items || [];
    },

    // Save items
    async saveItems(env, items, version = null, skipCache = false) {
        const pkg = await this.getItemsPackage(env);
        const data = {
            items,
            version: version !== null ? version : (pkg.version || 0) + 1
        };
        await env.RENEW_KV.put(ITEMS_KEY, JSON.stringify(data));
        if (!skipCache) clearCache(ITEMS_KEY);
        return data;
    },

    // Get single item by ID
    async getItem(env, itemId) {
        const items = await this.getItems(env);
        return items.find(i => i.id === itemId) || null;
    },

    // Add new item
    async addItem(env, item) {
        const pkg = await this.getItemsPackage(env);
        const items = pkg.items || [];
        items.push(item);
        return await this.saveItems(env, items, null, true);
    },

    // Update item
    async updateItem(env, itemId, updates) {
        const pkg = await this.getItemsPackage(env);
        const items = pkg.items || [];
        const index = items.findIndex(i => i.id === itemId);
        if (index === -1) throw new Error('Item not found');
        
        items[index] = { ...items[index], ...updates };
        return await this.saveItems(env, items, null, true);
    },

    // Delete item
    async deleteItem(env, itemId) {
        const pkg = await this.getItemsPackage(env);
        const items = (pkg.items || []).filter(i => i.id !== itemId);
        return await this.saveItems(env, items, null, true);
    },

    // Bulk delete items
    async deleteItems(env, itemIds) {
        const idSet = new Set(itemIds);
        const pkg = await this.getItemsPackage(env);
        const items = (pkg.items || []).filter(i => !idSet.has(i.id));
        return await this.saveItems(env, items, null, true);
    },

    // ==========================================
    // Settings
    // ==========================================
    async getSettings(env) {
        const cacheKey = SETTINGS_KEY;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        const data = await env.RENEW_KV.get(SETTINGS_KEY, { type: 'json' });
        const result = data || { jwtSecret: this.genSecret() };
        setCache(cacheKey, result);
        return result;
    },

    async saveSettings(env, settings) {
        await env.RENEW_KV.put(SETTINGS_KEY, JSON.stringify(settings));
        clearCache(SETTINGS_KEY);
        return settings;
    },

    async updateSettings(env, updates) {
        const current = await this.getSettings(env);
        const merged = { ...current, ...updates };
        return await this.saveSettings(env, merged);
    },

    // ==========================================
    // Domain Providers
    // ==========================================
    async getDomainProviders(env) {
        const cacheKey = DOMAIN_PROVIDERS_KEY;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        const data = await env.RENEW_KV.get(DOMAIN_PROVIDERS_KEY, { type: 'json' });
        setCache(cacheKey, data);
        return data;
    },

    async saveDomainProviders(env, config) {
        await env.RENEW_KV.put(DOMAIN_PROVIDERS_KEY, JSON.stringify(config));
        clearCache(DOMAIN_PROVIDERS_KEY);
        return config;
    },

    // ==========================================
    // Notification Channels
    // ==========================================
    async getChannels(env) {
        const cacheKey = CHANNELS_KEY;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        const data = await env.RENEW_KV.get(CHANNELS_KEY, { type: 'json' });
        const result = data || { channels: [] };
        setCache(cacheKey, result);
        return result;
    },

    async saveChannels(env, channels) {
        await env.RENEW_KV.put(CHANNELS_KEY, JSON.stringify({ channels }));
        clearCache(CHANNELS_KEY);
        return channels;
    },

    async addChannel(env, channel) {
        const data = await this.getChannels(env);
        data.channels.push(channel);
        await env.RENEW_KV.put(CHANNELS_KEY, JSON.stringify(data));
        clearCache(CHANNELS_KEY);
        return channel;
    },

    async updateChannel(env, channelId, updates) {
        const data = await this.getChannels(env);
        const index = data.channels.findIndex(c => c.id === channelId);
        if (index === -1) throw new Error('Channel not found');
        data.channels[index] = { ...data.channels[index], ...updates };
        await env.RENEW_KV.put(CHANNELS_KEY, JSON.stringify(data));
        clearCache(CHANNELS_KEY);
        return data.channels[index];
    },

    async deleteChannel(env, channelId) {
        const data = await this.getChannels(env);
        data.channels = data.channels.filter(c => c.id !== channelId);
        await env.RENEW_KV.put(CHANNELS_KEY, JSON.stringify(data));
        clearCache(CHANNELS_KEY);
        return { success: true };
    },

    // ==========================================
    // Cache Management
    // ==========================================
    clearCache,

    // Generate random secret
    genSecret() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array))
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    }
};

export { DataStore };
export default DataStore;
