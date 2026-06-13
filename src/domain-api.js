/**
 * Domain API Module for RenewHelper
 * 支持 Cloudflare 和 Porkbun 域名查询
 */

// Cloudflare Domain API
class CloudflareDomainAPI {
    constructor(apiKey, email, apiType = 'global') {
        this.apiKey = apiKey;
        this.email = email;
        this.apiType = apiType;
        this.baseUrl = 'https://api.cloudflare.com/client/v4';
    }

    async getZones() {
        const headers = this.getHeaders();
        const zones = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await fetch(`${this.baseUrl}/zones?page=${page}&per_page=50`, { headers });
            if (!response.ok) throw new Error(`Cloudflare API error: ${response.status}`);
            
            const data = await response.json();
            if (!data.success) throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
            
            zones.push(...data.result);
            hasMore = data.result_info.total_pages > page;
            page++;
        }
        return zones;
    }

    async getZoneDetails(zoneId) {
        const headers = this.getHeaders();
        const response = await fetch(`${this.baseUrl}/zones/${zoneId}`, { headers });
        if (!response.ok) throw new Error(`Cloudflare API error: ${response.status}`);
        
        const data = await response.json();
        if (!data.success) throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
        return data.result;
    }

    async getAllDomains() {
        const zones = await this.getZones();
        const domains = [];
        for (const zone of zones) {
            try {
                const details = await this.getZoneDetails(zone.id);
                domains.push({
                    name: zone.name,
                    id: zone.id,
                    created_on: zone.created_on,
                    expires_on: details.expires_on || null,
                    status: zone.status,
                });
            } catch (error) {
                domains.push({ name: zone.name, id: zone.id, created_on: zone.created_on, expires_on: null });
            }
        }
        return domains;
    }

    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.apiType === 'global') {
            headers['X-Auth-Email'] = this.email;
            headers['X-Auth-Key'] = this.apiKey;
        } else {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        return headers;
    }
}

// Porkbun Domain API
class PorkbunDomainAPI {
    constructor(apiKey, apiSecret) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.baseUrl = 'https://api.porkbun.com/api/json/v3';
    }

    async getAllDomains() {
        const response = await this.post('/domain/listAll');
        if (response.status !== 'SUCCESS') throw new Error(`Porkbun API error: ${response.message}`);

        const domains = [];
        for (const [domain, info] of Object.entries(response.domains || {})) {
            try {
                const details = await this.getDomainDetails(domain);
                domains.push({ name: domain, expires: details.expires || null, autoRenew: info.autoRenew });
            } catch (error) {
                domains.push({ name: domain, expires: null, autoRenew: info.autoRenew });
            }
        }
        return domains;
    }

    async getDomainDetails(domain) {
        const response = await this.post('/domain/getInfo', { domain });
        if (response.status !== 'SUCCESS') throw new Error(`Porkbun API error: ${response.message}`);
        return { name: domain, expires: response.registrationExpirationDate || null };
    }

    async post(path, body = {}) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apikey: this.apiKey, secret: this.apiSecret, ...body }),
        });
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        return await response.json();
    }
}

// Domain Sync Manager
class DomainSyncManager {
    constructor(env) { this.env = env; }

    getProviderStatus() {
        return {
            cloudflare: { configured: !!(this.env.CF_DOMAIN_API_KEY && this.env.CF_DOMAIN_EMAIL), type: this.env.CF_DOMAIN_API_TYPE || 'global' },
            porkbun: { configured: !!(this.env.PORKBUN_API_KEY && this.env.PORKBUN_API_SECRET) },
        };
    }

    async syncCloudflare() {
        if (!this.env.CF_DOMAIN_API_KEY || !this.env.CF_DOMAIN_EMAIL) throw new Error('Cloudflare API not configured');
        const api = new CloudflareDomainAPI(this.env.CF_DOMAIN_API_KEY, this.env.CF_DOMAIN_EMAIL, this.env.CF_DOMAIN_API_TYPE || 'global');
        const domains = await api.getAllDomains();
        return await this.importDomains(domains, 'cloudflare');
    }

    async syncPorkbun() {
        if (!this.env.PORKBUN_API_KEY || !this.env.PORKBUN_API_SECRET) throw new Error('Porkbun API not configured');
        const api = new PorkbunDomainAPI(this.env.PORKBUN_API_KEY, this.env.PORKBUN_API_SECRET);
        const domains = await api.getAllDomains();
        return await this.importDomains(domains, 'porkbun');
    }

    async syncAll() {
        const results = { cloudflare: null, porkbun: null, total: 0 };
        const status = this.getProviderStatus();
        if (status.cloudflare.configured) {
            try { results.cloudflare = await this.syncCloudflare(); results.total += results.cloudflare.synced; } catch (e) { results.cloudflare = { error: e.message }; }
        }
        if (status.porkbun.configured) {
            try { results.porkbun = await this.syncPorkbun(); results.total += results.porkbun.synced; } catch (e) { results.porkbun = { error: e.message }; }
        }
        return results;
    }

    async importDomains(domains, provider) {
        const existingItems = await this.getItems();
        const existingDomains = new Set(existingItems.filter(i => i.tags?.includes('Domain')).map(i => i.name.toLowerCase()));
        const imported = [], skipped = [];

        for (const domain of domains) {
            const domainName = domain.name.toLowerCase();
            if (existingDomains.has(domainName)) {
                skipped.push({ name: domain.name, status: 'skipped', reason: 'already_exists' });
                continue;
            }

            const newItem = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: domain.name,
                tags: ['Domain', provider],
                type: 'reset',
                enabled: true,
                createDate: new Date().toISOString().split('T')[0],
                lastRenewDate: new Date().toISOString().split('T')[0],
                intervalDays: 365,
                cycleUnit: 'year',
                notifyDays: 30,
                notifyTime: '09:00',
                autoRenew: false,
                message: `Provider: ${provider}`,
                fixedPrice: 0,
                currency: 'USD',
            };

            if (domain.expires) {
                const expiryDate = new Date(domain.expires);
                if (!isNaN(expiryDate.getTime())) {
                    newItem.createDate = domain.expires.split('T')[0];
                    newItem.lastRenewDate = domain.expires.split('T')[0];
                    const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
                    newItem.intervalDays = Math.max(1, daysUntilExpiry);
                }
            }

            imported.push(newItem);
            existingDomains.add(domainName);
        }

        if (imported.length > 0) await this.saveItems([...existingItems, ...imported]);
        return { synced: imported.length, skipped: skipped.length, domains: [...imported.map(d => ({ name: d.name, status: 'imported' })), ...skipped] };
    }

    async getItems() {
        try { const data = await this.env.RENEW_KV.get('items', { type: 'json' }); return dat
