/**
 * DigitalPlat Domain Provider Module
 * Supports multiple API endpoints and authentication methods
 */

const API_ENDPOINTS = [
    'https://domain-api.digitalplat.org/api/v1',
    'https://dash.domain.digitalplat.org/api/v1'
];

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

// Create authentication headers for DigitalPlat
function createAuthHeaders(providerConfig) {
    const B = providerConfig.apiKey || '';
    const e = providerConfig.apiSecret || '';
    const t = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
    };
    
    const headersList = [];
    const addHeaders = (label, headers) => {
        headersList.push({ label, headers: { ...t, ...headers } });
    };

    if (e) {
        addHeaders("bearer-secret", { "Authorization": `Bearer ${e}`, "X-API-Secret": e });
        addHeaders("token-secret", { "Authorization": `Token ${e}`, "X-API-Secret": e });
        addHeaders("x-api-token-secret", { "X-API-Token": e, "X-API-Secret": e });
        addHeaders("secret-only-header", { "X-API-Secret": e, "API-SECRET": e });
    }

    if (B && e) {
        addHeaders("key-secret-headers", { "X-API-Key": B, "X-API-Secret": e, "API-KEY": B, "API-SECRET": e });
        addHeaders("bearer-key-with-secret", { "Authorization": `Bearer ${B}`, "X-API-Key": B, "X-API-Secret": e });
        addHeaders("apikey-auth-with-secret", { "Authorization": `ApiKey ${B}`, "X-API-Key": B, "X-API-Secret": e });
    } else if (B) {
        addHeaders("bearer-key", { "Authorization": `Bearer ${B}`, "X-API-Key": B });
        addHeaders("x-api-key-only", { "X-API-Key": B, "API-KEY": B });
    }

    return headersList;
}

// Fetch domains from DigitalPlat
export async function fetchDigitalPlatDomains(providerConfig, limit = 100) {
    const domains = [];
    const authMethods = createAuthHeaders(providerConfig);
    
    if (!authMethods.length) {
        throw new Error('DigitalPlat API not configured');
    }

    const failures = [];

    for (const endpoint of API_ENDPOINTS) {
        for (const auth of authMethods) {
            try {
                const resp = await fetch(`${endpoint}/domains?per_page=${limit}`, {
                    headers: auth.headers,
                    cf: { cacheTtl: 5 }
                });

                const data = await safeReadJson(resp.clone());

                if (!resp.ok) {
                    failures.push(`[${auth.label}] ${await describeHttpError('DigitalPlat', resp)}`);
                    continue;
                }

                if (data?.success === false) {
                    failures.push(`[${auth.label}] DigitalPlat API error: ${data.message || data.error || 'Unknown'}`);
                    continue;
                }

                const result = Array.isArray(data)
                    ? data
                    : data?.domains || data?.data || data?.result || data?.items || [];

                if (!Array.isArray(result)) {
                    failures.push(`[${auth.label}] DigitalPlat API error: unexpected response format from ${endpoint}`);
                    continue;
                }

                return result
                    .map((d) => ({
                        name: d.name || d.domain,
                        id: d.id,
                        created_on: d.created_at || d.registration_date,
                        expires_on: d.expires_at || d.expiration_date || null
                    }))
                    .filter((d) => d.name);
            } catch (error) {
                failures.push(`[${auth.label}] ${error.message}`);
            }
        }
    }

    throw new Error(failures.join(' | ') || 'DigitalPlat API request failed');
}

// Test DigitalPlat connection
export async function testDigitalPlatConnection(providerConfig) {
    try {
        await fetchDigitalPlatDomains(providerConfig, 1);
        return { success: true, message: 'Connection successful' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

export default {
    fetchDigitalPlatDomains,
    testDigitalPlatConnection
};
