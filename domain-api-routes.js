// Domain API Routes
const domainSyncMgr = {
    getProviderStatus(env) {
        return {
            cloudflare: { configured: !!(env.CF_DOMAIN_API_KEY && env.CF_DOMAIN_EMAIL), type: env.CF_DOMAIN_API_TYPE || 'global' },
            porkbun: { configured: !!(env.PORKBUN_API_KEY && env.PORKBUN_API_SECRET) }
        };
    },
    async syncCloudflare(env) {
        if (!env.CF_DOMAIN_API_KEY || !env.CF_DOMAIN_EMAIL) throw new Error('Cloudflare API not configured');
        const headers = env.CF_DOMAIN_API_TYPE === 'token' ? { 'Authorization': 'Bearer ' + env.CF_DOMAIN_API_KEY, 'Content-Type': 'application/json' } : { 'X-Auth-Email': env.CF_DOMAIN_EMAIL, 'X-Auth-Key': env.CF_DOMAIN_API_KEY, 'Content-Type': 'application/json' };
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
        if (!env.PORKBUN_API_KEY || !env.PORKBUN_API_SECRET) throw new Error('Porkbun API not configured');
        const resp = await fetch('https://api.porkbun.com/api/json/v3/domain/listAll', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apikey: env.PORKBUN_API_KEY, secret: env.PORKBUN_API_SECRET })
        });
        if (!resp.ok) throw new Error('Porkbun API error: ' + resp.status);
        const data = await resp.json();
        if (data.status !== 'SUCCESS') throw new Error('Porkbun API error: ' + data.message);
        return Object.entries(data.domains || {}).map(([domain, info]) => ({ name: domain, expires: null }));
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
    return K({ code: 200, data: domainSyncMgr.getProviderStatus(e) });
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

J.post('/api/sync-domains/all', j(async (A, e) => {
    const results = { cloudflare: null, porkbun: null, total: 0 };
    const status = domainSyncMgr.getProviderStatus(e);
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
    return K({ code: 200, data: results });
}));
