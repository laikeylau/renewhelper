/**
 * DNSHE Domain Provider Module
 * Supports multiple accounts
 */

const DNSHE_API_BASE = 'https://api005.dnshe.com/index.php';

// Helper: Check if DNSHE has any configured accounts
export function hasDnsheAccounts(config) {
    if (!Array.isArray(config.dnshe)) return false;
    return config.dnshe.some(acc => acc.enabled && acc.apiKey && acc.apiSecret);
}

// Helper: Get all enabled DNSHE accounts
export function getEnabledDnsheAccounts(config) {
    if (!Array.isArray(config.dnshe)) return [];
    return config.dnshe.filter(acc => acc.enabled && acc.apiKey && acc.apiSecret);
}

// Helper: Create DNSHE headers
function getDnsheHeaders(account) {
    return {
        'X-API-Key': account.apiKey,
        'X-API-Secret': account.apiSecret,
        'Content-Type': 'application/json'
    };
}

// Helper: Safe JSON parse
async function safeReadJson(resp) {
    try {
        return await resp.json();
    } catch {
        return null;
    }
}

// Helper: Describe HTTP error
async function describeHttpError(provider, resp) {
    const text = await resp.text().catch(() => '');
    return `${provider} API error: ${resp.status} ${text.slice(0, 200)}`;
}

// Fetch domains from a single DNSHE account
export async function fetchDnsheDomains(account) {
    const perPage = 500;
    const domains = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const resp = await fetch(
            `${DNSHE_API_BASE}?m=domain_hub&endpoint=subdomains&action=list&page=${page}&per_page=${perPage}`,
            { headers: getDnsheHeaders(account) }
        );
        const data = await safeReadJson(resp.clone());

        if (!resp.ok) {
            throw new Error(data?.message || await describeHttpError('DNSHE', resp));
        }
        if (!data?.success) {
            throw new Error('DNSHE API error: ' + (data?.message || data?.error || 'Unknown'));
        }

        const pageDomains = Array.isArray(data.subdomains) ? data.subdomains : [];
        domains.push(...pageDomains);

        hasMore = Boolean(data.pagination?.has_more) || pageDomains.length === perPage;
        if (!pageDomains.length) hasMore = false;
        page += 1;
        if (page > 1000) throw new Error('DNSHE API error: pagination exceeded safety limit');
    }

    return domains.map((d) => ({
        name: d.full_domain || (d.subdomain + '.' + d.rootdomain),
        id: d.id,
        created_on: d.created_at,
        expires_on: d.expires_at || null
    }));
}

// Test DNSHE account connection
export async function testDnsheAccount(account) {
    try {
        const resp = await fetch(
            `${DNSHE_API_BASE}?m=domain_hub&endpoint=subdomains&action=list&per_page=1`,
            { headers: getDnsheHeaders(account) }
        );
        const data = await safeReadJson(resp.clone());
        return {
            success: resp.ok && data?.success !== false,
            message: resp.ok ? 'Connection successful' : (data?.message || 'API key invalid')
        };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// Sync domains from all enabled DNSHE accounts
export async function syncAllDnsheAccounts(config) {
    const enabledAccounts = getEnabledDnsheAccounts(config);
    const allDomains = [];
    const errors = [];

    for (const account of enabledAccounts) {
        try {
            console.log(`[DNSHE] Syncing from account: ${account.name || account.id}`);
            const domains = await fetchDnsheDomains(account);
            allDomains.push(...domains.map(d => ({
                ...d,
                accountId: account.id,
                accountName: account.name
            })));
        } catch (error) {
            const errorMsg = `Account ${account.name || account.id}: ${error.message}`;
            console.error(`[DNSHE] Sync failed: ${errorMsg}`);
            errors.push(errorMsg);
        }
    }

    return { domains: allDomains, errors };
}

// Sync domains from a specific DNSHE account
export async function syncDnsheAccount(config, accountId) {
    const account = (config.dnshe || []).find(acc => acc.id === accountId);
    if (!account || !account.enabled || !account.apiKey || !account.apiSecret) {
        throw new Error('DNSHE account not found or not configured: ' + accountId);
    }

    const domains = await fetchDnsheDomains(account);
    return domains.map(d => ({
        ...d,
        accountId: account.id,
        accountName: account.name
    }));
}

// Add a new DNSHE account
export async function addDnsheAccount(config, env, account) {
    if (!Array.isArray(config.dnshe)) {
        config.dnshe = [];
    }

    const newAccount = {
        id: account.id || 'dnshe_' + Date.now().toString(36),
        name: account.name || 'DNSHE Account ' + (config.dnshe.length + 1),
        enabled: account.enabled !== false,
        apiKey: account.apiKey || '',
        apiSecret: account.apiSecret || ''
    };

    config.dnshe.push(newAccount);
    return newAccount;
}

// Update a DNSHE account
export async function updateDnsheAccount(config, env, accountId, updates) {
    if (!Array.isArray(config.dnshe)) {
        throw new Error('No DNSHE accounts configured');
    }

    const index = config.dnshe.findIndex(acc => acc.id === accountId);
    if (index === -1) {
        throw new Error('DNSHE account not found: ' + accountId);
    }

    const account = config.dnshe[index];
    if (updates.name !== undefined) account.name = updates.name;
    if (updates.enabled !== undefined) account.enabled = updates.enabled;
    if (updates.apiKey !== undefined && !updates.apiKey.endsWith('***')) {
        account.apiKey = updates.apiKey;
    }
    if (updates.apiSecret !== undefined && !updates.apiSecret.endsWith('***')) {
        account.apiSecret = updates.apiSecret;
    }

    return account;
}

// Remove a DNSHE account
export async function removeDnsheAccount(config, env, accountId) {
    if (!Array.isArray(config.dnshe)) {
        throw new Error('No DNSHE accounts configured');
    }

    const index = config.dnshe.findIndex(acc => acc.id === accountId);
    if (index === -1) {
        throw new Error('DNSHE account not found: ' + accountId);
    }

    config.dnshe.splice(index, 1);
    return { success: true, deleted: accountId };
}

export default {
    hasDnsheAccounts,
    getEnabledDnsheAccounts,
    fetchDnsheDomains,
    testDnsheAccount,
    syncAllDnsheAccounts,
    syncDnsheAccount,
    addDnsheAccount,
    updateDnsheAccount,
    removeDnsheAccount
};
