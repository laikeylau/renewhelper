// Domain API Routes
// KV key for storing domain provider credentials
const DOMAIN_PROVIDERS_KV_KEY = 'domain_providers_config';

// Default provider config structure
const DEFAULT_PROVIDERS = {
    cloudflare: { enabled: false, apiKey: '', email: '', apiType: 'global' },
    porkbun: { enabled: false, apiKey: '', apiSecret: '' },
    dnshe: { enabled: false, apiKey: '', apiSecret: '' },
    digitalplat: { enabled: false, apiKey: '', apiSecret: '' }
};

// Helper: Get provider config from KV or env
async function getProviderConfig(env) {
    // First try KV
    const kvConfig = await env.RENEW_KV.get(DOMAIN_PROVIDERS_KV_KEY, { type: 'json' });
    if (kvConfig) return kvConfig;
    // Fallback to env variables
    return {
        cloudflare: {
            enabled: !!(env.CF_DOMAIN_API_KEY && env.CF_DOMAIN_EMAIL),
            apiKey: env.CF_DOMAIN_API_KEY || '',
            email: env.CF_DOMAIN_EMAIL || '',
            apiType: env.CF_DOMAIN_API_TYPE || 'global'
        },
        porkbun: {
            enabled: !!(env.PORKBUN_API_KEY && env.PORKBUN_API_SECRET),
            apiKey: env.PORKBUN_API_KEY || '',
            apiSecret: env.PORKBUN_API_SECRET || ''
        },
        dnshe: {
            enabled: !!(env.DNSHE_API_KEY && env.DNSHE_API_SECRET),
            apiKey: env.DNSHE_API_KEY || '',
            apiSecret: env.DNSHE_API_SECRET || ''
        },
        digitalplat: {
            enabled: !!(env.DIGITALPLAT_API_KEY && env.DIGITALPLAT_API_SECRET),
            apiKey: env.DIGITALPLAT_API_KEY || '',
            apiSecret: env.DIGITALPLAT_API_SECRET || ''
        }
    };
}

const domainSyncMgr = {
    async getProviderStatus(env) {
        const config = await getProviderConfig(env);
        return {
            cloudflare: { configured: !!(config.cloudflare.enabled && config.cloudflare.apiKey && config.cloudflare.email), type: config.cloudflare.apiType || 'global' },
            porkbun: { configured: !!(config.porkbun.enabled && config.porkbun.apiKey && config.porkbun.apiSecret) },
            dnshe: { configured: !!(config.dnshe.enabled && config.dnshe.apiKey && config.dnshe.apiSecret) },
            digitalplat: { configured: !!(config.digitalplat.enabled && config.digitalplat.apiKey && config.digitalplat.apiSecret) }
        };
    },
    async syncCloudflare(env) {
        const config = await getProviderConfig(env);
        const { apiKey, email, apiType, enabled } = config.cloudflare;
        if (!enabled || !apiKey || !email) throw new Error('Cloudflare API not configured');
        const headers = apiType === 'token' ? { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' } : { 'X-Auth-Email': email, 'X-Auth-Key': apiKey, 'Content-Type': 'application/json' };
        const zones = [];
        let page = 1, hasMore = true;
        while (hasMore) {
            const resp = await fetch('https://api.cloudflare.com/client/v4/zones?page=' + page + '&per_page=50', { headers });
            if (!resp.ok) throw new Error('Cloudflare API error: ' + resp.status);
            const data = await resp.json();
            if (!data.success) throw new Error('Cloudflare API error: ' + JSON.stringify(data.errors));
            zones.push(...data.result);
            hasMore = data.result_info.total_pages > page;
            page++;
        }
        return zones.map(z => ({ name: z.name, id: z.id, created_on: z.created_on, expires_on: null }));
    },
    async syncPorkbun(env) {
        const config = await getProviderConfig(env);
        const { apiKey, apiSecret, enabled } = config.porkbun;
        if (!enabled || !apiKey || !apiSecret) throw new Error('Porkbun API not configured');
        const resp = await fetch('https://api.porkbun.com/api/json/v3/domain/listAll', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apikey: apiKey, secret: apiSecret })
        });
        if (!resp.ok) throw new Error('Porkbun API error: ' + resp.status);
        const data = await resp.json();
        if (data.status !== 'SUCCESS') throw new Error('Porkbun API error: ' + data.message);
        return Object.entries(data.domains || {}).map(([domain, info]) => ({ name: domain, expires: null }));
    },
    async syncDnshe(env) {
        const config = await getProviderConfig(env);
        const { apiKey, apiSecret, enabled } = config.dnshe;
        if (!enabled || !apiKey || !apiSecret) throw new Error('DNSHE API not configured');
        const headers = {
            'X-API-Key': apiKey,
            'X-API-Secret': apiSecret,
            'Content-Type': 'application/json'
        };
        const resp = await fetch('https://api005.dnshe.com/index.php?m=domain_hub&endpoint=subdomains&action=list&per_page=500', { headers });
        if (!resp.ok) throw new Error('DNSHE API error: ' + resp.status);
        const data = await resp.json();
        if (!data.success) throw new Error('DNSHE API error: ' + (data.message || 'Unknown error'));
        return (data.subdomains || []).map(d => ({
            name: d.full_domain || (d.subdomain + '.' + d.rootdomain),
            id: d.id,
            created_on: d.created_at,
            expires_on: d.expires_at || null,
            status: d.status
        }));
    },
    async syncDigitalplat(env) {
        const config = await getProviderConfig(env);
        const { apiKey, apiSecret, enabled } = config.digitalplat;
        if (!enabled || (!apiKey && !apiSecret)) throw new Error('DigitalPlat API not configured');
        
        // Multiple API endpoints to try
        const apiEndpoints = [
            'https://dash.domain.digitalplat.org/api/v1',
            'https://domain-api.digitalplat.org/api/v1'
        ];
        
        // Multiple authentication methods to try
        const authMethods = [
            // Method 1: Bearer token with apiSecret
            () => ({
                name: 'Bearer + Secret',
                headers: {
                    'Authorization': 'Bearer ' + (apiSecret || apiKey),
                    'X-API-Secret': apiSecret || '',
                    'Content-Type': 'application/json'
                }
            }),
            // Method 2: X-API-Key + X-API-Secret headers
            () => ({
                name: 'API Key + Secret Headers',
                headers: {
                    'X-API-Key': apiKey || '',
                    'X-API-Secret': apiSecret || '',
                    'Content-Type': 'application/json'
                }
            }),
            // Method 3: Token authentication
            () => ({
                name: 'Token Auth',
                headers: {
                    'Authorization': 'Token ' + (apiSecret || apiKey),
                    'X-API-Secret': apiSecret || '',
                    'Content-Type': 'application/json'
                }
            }),
            // Method 4: ApiKey authentication
            () => ({
                name: 'ApiKey Auth',
                headers: {
                    'Authorization': 'ApiKey ' + apiKey,
                    'X-API-Secret': apiSecret || '',
                    'Content-Type': 'application/json'
                }
            })
        ];
        
        const errors = [];
        
        // Try each endpoint with each auth method
        for (const endpoint of apiEndpoints) {
            for (const getAuth of authMethods) {
                const auth = getAuth();
                try {
                    console.log(`[DigitalPlat] Trying ${endpoint} with ${auth.name}`);
                    
                    const resp = await fetch(`${endpoint}/domains?per_page=100`, {
                        headers: auth.headers,
                        cf: { cacheTtl: 5 } // Disable caching
                    });
                    
                    const contentType = resp.headers.get('content-type') || '';
                    const body = await resp.text();
                    
                    // Check for Cloudflare Challenge
                    if (body.includes('Just a moment') || body.includes('cf-chl') || body.includes('challenge-platform')) {
                        const error = `${endpoint} (${auth.name}): Blocked by Cloudflare Challenge`;
                        console.log(`[DigitalPlat] ${error}`);
                        errors.push(error);
                        continue;
                    }
                    
                    // Check for HTML response
                    if (contentType.includes('text/html') || body.trim().startsWith('<!DOCTYPE') || body.trim().startsWith('<html')) {
                        const error = `${endpoint} (${auth.name}): Received HTML instead of JSON`;
                        console.log(`[DigitalPlat] ${error}`);
                        errors.push(error);
                        continue;
                    }
                    
                    if (!resp.ok) {
                        const error = `${endpoint} (${auth.name}): HTTP ${resp.status}`;
                        console.log(`[DigitalPlat] ${error}`);
                        errors.push(error);
                        continue;
                    }
                    
                    // Try to parse JSON
                    let data;
                    try {
                        data = JSON.parse(body);
                    } catch (parseError) {
                        const error = `${endpoint} (${auth.name}): JSON parse error`;
                        console.log(`[DigitalPlat] ${error}`);
                        errors.push(error);
                        continue;
                    }
                    
                    // Check for API error response
                    if (data.success === false || data.error) {
                        const error = `${endpoint} (${auth.name}): API error - ${data.message || data.error || 'Unknown'}`;
                        console.log(`[DigitalPlat] ${error}`);
                        errors.push(error);
                        continue;
                    }
                    
                    // Success! Parse domains
                    const domains = data.domains || data.data || data.result || data.items || (Array.isArray(data) ? data : []);
                    
                    console.log(`[DigitalPlat] Success! Found ${domains.length} domains using ${endpoint} with ${auth.name}`);
                    
                    return domains.map(d => ({
                        name: d.name || d.domain,
                        id: d.id,
                        created_on: d.created_at || d.registration_date,
                        expires_on: d.expires_at || d.expiration_date || null,
                        status: d.status || 'active'
                    }));
                    
                } catch (fetchError) {
                    const error = `${endpoint} (${auth.name}): ${fetchError.message}`;
                    console.log(`[DigitalPlat] ${error}`);
                    errors.push(error);
                }
            }
        }
        
        // All attempts failed
        throw new Error('DigitalPlat API failed: ' + errors.join(' | '));
    },
    async importDomains(env, domains, provider) {
        const data = await env.RENEW_KV.get('items', { type: 'json' });
        const items = data?.items || [];
        const version = data?.version || 0;
        const existing = new Set(items.filter(i => i.tags?.includes('Domain')).map(i => i.name.toLowerCase()));
        const imported = [], skipped = [];
        for (const domain of domains) {
            if (existing.has(domain.name.toLowerCase())) {
                skipped.push({ name: domain.name, status: 'skipped' });
                continue;
            }
            imported.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: domain.name, tags: ['Domain', provider], type: 'reset', enabled: true,
                createDate: new Date().toISOString().split('T')[0],
                lastRenewDate: new Date().toISOString().split('T')[0],
                intervalDays: 365, cycleUnit: 'year', notifyDays: 30, notifyTime: '09:00',
                autoRenew: false, message: 'Provider: ' + provider, fixedPrice: 0, currency: 'USD',
                notifyTimes: ['09:00'], notifyChannelIds: [], renewHistory: [], renewUrl: ''
            });
            existing.add(domain.name.toLowerCase());
        }
        if (imported.length > 0) {
            await env.RENEW_KV.put('items', JSON.stringify({ items: [...items, ...imported], version: version + 1 }));
        }
        return { synced: imported.length, skipped: skipped.length, domains: [...imported.map(d => ({ name: d.name, status: 'imported' })), ...skipped] };
    }
};

J.get('/api/domain-providers', j(async (A, e) => {
    return K({ code: 200, data: await domainSyncMgr.getProviderStatus(e) });
}));

// Get full provider config (including secrets for editing)
J.get('/api/domain-providers/config', j(async (A, e) => {
    const config = await getProviderConfig(e);
    // Mask secrets for security
    const masked = {};
    for (const [provider, settings] of Object.entries(config)) {
        masked[provider] = { ...settings };
        if (masked[provider].apiKey) masked[provider].apiKey = masked[provider].apiKey.slice(0, 8) + '***';
        if (masked[provider].apiSecret) masked[provider].apiSecret = masked[provider].apiSecret.slice(0, 8) + '***';
        if (masked[provider].email) masked[provider].email = masked[provider].email;
    }
    return K({ code: 200, data: masked });
}));

// Save provider configuration
J.post('/api/domain-providers/config', j(async (A, e) => {
    try {
        const newConfig = await A.json();
        const currentConfig = await getProviderConfig(e);
        
        // Merge with current config (so we don't lose fields)
        const mergedConfig = { ...currentConfig };
        
        for (const [provider, settings] of Object.entries(newConfig)) {
            if (mergedConfig[provider]) {
                // Only update fields that are provided and not masked
                if (settings.apiKey !== undefined && !settings.apiKey.endsWith('***')) {
                    mergedConfig[provider].apiKey = settings.apiKey;
                }
                if (settings.apiSecret !== undefined && !settings.apiSecret.endsWith('***')) {
                    mergedConfig[provider].apiSecret = settings.apiSecret;
                }
                if (settings.email !== undefined) {
                    mergedConfig[provider].email = settings.email;
                }
                if (settings.apiType !== undefined) {
                    mergedConfig[provider].apiType = settings.apiType;
                }
                if (settings.enabled !== undefined) {
                    mergedConfig[provider].enabled = settings.enabled;
                }
            }
        }
        
        // Save to KV
        await e.RENEW_KV.put(DOMAIN_PROVIDERS_KV_KEY, JSON.stringify(mergedConfig));
        
        return K({ code: 200, msg: 'CONFIG_SAVED' });
    } catch (error) {
        return S('SAVE_FAILED: ' + error.message, 500);
    }
}));

// Test provider connection
J.post('/api/domain-providers/test', j(async (A, e) => {
    try {
        const { provider } = await A.json();
        const config = await getProviderConfig(e);
        const providerConfig = config[provider];
        
        if (!providerConfig || !providerConfig.enabled) {
            return S('PROVIDER_NOT_ENABLED', 400);
        }
        
        let testResult = false;
        let testMessage = '';
        
        try {
            if (provider === 'cloudflare') {
                const headers = providerConfig.apiType === 'token' 
                    ? { 'Authorization': 'Bearer ' + providerConfig.apiKey, 'Content-Type': 'application/json' }
                    : { 'X-Auth-Email': providerConfig.email, 'X-Auth-Key': providerConfig.apiKey, 'Content-Type': 'application/json' };
                const resp = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', { headers });
                const data = await resp.json();
                testResult = data.success;
                testMessage = data.success ? 'Connection successful' : (data.errors?.[0]?.message || 'Verification failed');
            } else if (provider === 'porkbun') {
                const resp = await fetch('https://api.porkbun.com/api/json/v3/ping', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apikey: providerConfig.apiKey, secret: providerConfig.apiSecret })
                });
                const data = await resp.json();
                testResult = data.status === 'SUCCESS';
                testMessage = data.status === 'SUCCESS' ? 'Connection successful' : (data.message || 'Verification failed');
            } else if (provider === 'dnshe') {
                const resp = await fetch('https://api005.dnshe.com/index.php?m=domain_hub&endpoint=subdomains&action=list&per_page=1', {
                    headers: { 'X-API-Key': providerConfig.apiKey, 'X-API-Secret': providerConfig.apiSecret, 'Content-Type': 'application/json' }
                });
                testResult = resp.ok;
                testMessage = resp.ok ? 'Connection successful' : 'API key invalid';
            } else if (provider === 'digitalplat') {
                // Try multiple endpoints and auth methods for DigitalPlat
                const endpoints = [
                    'https://dash.domain.digitalplat.org/api/v1',
                    'https://domain-api.digitalplat.org/api/v1'
                ];
                const authMethods = [
                    // Method 1: Bearer with apiSecret
                    { name: 'Bearer+Secret', headers: { 'Authorization': 'Bearer ' + (providerConfig.apiSecret || providerConfig.apiKey), 'X-API-Secret': providerConfig.apiSecret || '', 'Content-Type': 'application/json' } },
                    // Method 2: API Key + Secret headers
                    { name: 'Key+Secret Headers', headers: { 'X-API-Key': providerConfig.apiKey || '', 'X-API-Secret': providerConfig.apiSecret || '', 'Content-Type': 'application/json' } },
                    // Method 3: Token auth
                    { name: 'Token Auth', headers: { 'Authorization': 'Token ' + (providerConfig.apiSecret || providerConfig.apiKey), 'X-API-Secret': providerConfig.apiSecret || '', 'Content-Type': 'application/json' } }
                ];
                
                const errors = [];
                let success = false;
                
                for (const endpoint of endpoints) {
                    for (const auth of authMethods) {
                        try {
                            const resp = await fetch(`${endpoint}/domains?per_page=1`, { headers: auth.headers });
                            const body = await resp.text();
                            
                            // Check for Cloudflare Challenge
                            if (body.includes('Just a moment') || body.includes('cf-chl') || body.includes('challenge-platform')) {
                                errors.push(`${endpoint} (${auth.name}): Cloudflare Challenge blocked`);
                                continue;
                            }
                            
                            // Check for HTML response
                            if (body.trim().startsWith('<!DOCTYPE') || body.trim().startsWith('<html')) {
                                errors.push(`${endpoint} (${auth.name}): HTML response received`);
                                continue;
                            }
                            
                            if (resp.ok) {
                                testResult = true;
                                testMessage = `Connection successful (${endpoint}, ${auth.name})`;
                                success = true;
                                break;
                            } else {
                                errors.push(`${endpoint} (${auth.name}): HTTP ${resp.status}`);
                            }
                        } catch (e) {
                            errors.push(`${endpoint} (${auth.name}): ${e.message}`);
                        }
                    }
                    if (success) break;
                }
                
                if (!success) {
                    testMessage = 'All endpoints failed: ' + errors.join(' | ');
                }
            }
        } catch (err) {
            testMessage = 'Connection error: ' + err.message;
        }
        
        return K({ code: 200, data: { success: testResult, message: testMessage } });
    } catch (error) {
        return S('TEST_FAILED: ' + error.message, 500);
    }
}));

J.post('/api/sync-domains/cloudflare', j(async (A, e) => {
    try {
        const domains = await domainSyncMgr.syncCloudflare(e);
        const result = await domainSyncMgr.importDomains(e, domains, 'cloudflare');
        return K({ code: 200, data: result });
    } catch (error) {
        return S('SYNC_FAILED: ' + error.message, 500);
    }
}));

J.post('/api/sync-domains/porkbun', j(async (A, e) => {
    try {
        const domains = await domainSyncMgr.syncPorkbun(e);
        const result = await domainSyncMgr.importDomains(e, domains, 'porkbun');
        return K({ code: 200, data: result });
    } catch (error) {
        return S('SYNC_FAILED: ' + error.message, 500);
    }
}));

J.post('/api/sync-domains/dnshe', j(async (A, e) => {
    try {
        const domains = await domainSyncMgr.syncDnshe(e);
        const result = await domainSyncMgr.importDomains(e, domains, 'dnshe');
        return K({ code: 200, data: result });
    } catch (error) {
        return S('SYNC_FAILED: ' + error.message, 500);
    }
}));

J.post('/api/sync-domains/digitalplat', j(async (A, e) => {
    try {
        const domains = await domainSyncMgr.syncDigitalplat(e);
        const result = await domainSyncMgr.importDomains(e, domains, 'digitalplat');
        return K({ code: 200, data: result });
    } catch (error) {
        return S('SYNC_FAILED: ' + error.message, 500);
    }
}));

J.post('/api/sync-domains/all', j(async (A, e) => {
    const results = { cloudflare: null, porkbun: null, dnshe: null, digitalplat: null, total: 0 };
    const status = await domainSyncMgr.getProviderStatus(e);
    if (status.cloudflare.configured) {
        try {
            const domains = await domainSyncMgr.syncCloudflare(e);
            results.cloudflare = await domainSyncMgr.importDomains(e, domains, 'cloudflare');
            results.total += results.cloudflare.synced;
        } catch (err) { results.cloudflare = { error: err.message }; }
    }
    if (status.porkbun.configured) {
        try {
            const domains = await domainSyncMgr.syncPorkbun(e);
            results.porkbun = await domainSyncMgr.importDomains(e, domains, 'porkbun');
            results.total += results.porkbun.synced;
        } catch (err) { results.porkbun = { error: err.message }; }
    }
    if (status.dnshe.configured) {
        try {
            const domains = await domainSyncMgr.syncDnshe(e);
            results.dnshe = await domainSyncMgr.importDomains(e, domains, 'dnshe');
            results.total += results.dnshe.synced;
        } catch (err) { results.dnshe = { error: err.message }; }
    }
    if (status.digitalplat.configured) {
        try {
            const domains = await domainSyncMgr.syncDigitalplat(e);
            results.digitalplat = await domainSyncMgr.importDomains(e, domains, 'digitalplat');
            results.total += results.digitalplat.synced;
        } catch (err) { results.digitalplat = { error: err.message }; }
    }
    return K({ code: 200, data: results });
}));
