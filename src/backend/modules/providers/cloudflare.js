/**
 * Cloudflare Domain Provider Module
 */

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

// Get Cloudflare headers based on API type
function getCloudflareHeaders(providerConfig) {
    if (providerConfig.apiType === 'token') {
        return {
            'Authorization': 'Bearer ' + providerConfig.apiKey,
            'Content-Type': 'application/json'
        };
    }
    return {
        'X-Auth-Email': providerConfig.email,
        'X-Auth-Key': providerConfig.apiKey,
        'Content-Type': 'application/json'
    };
}

// Fetch domains from Cloudflare
export async function fetchCloudflareDomains(providerConfig) {
    const headers = getCloudflareHeaders(providerConfig);
    const zones = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const resp = await fetch(`${CF_API_BASE}/zones?page=${page}&per_page=50`, { headers });
        if (!resp.ok) throw new Error('Cloudflare API error: ' + resp.status);
        
        const data = await resp.json();
        if (!data.success) throw new Error('Cloudflare API error: ' + JSON.stringify(data.errors));
        
        zones.push(...data.result);
        hasMore = data.result_info.total_pages > page;
        page++;
    }

    return zones.map(z => ({
        name: z.name,
        id: z.id,
        created_on: z.created_on,
        expires_on: null
    }));
}

// Test Cloudflare connection
export async function testCloudflareConnection(providerConfig) {
    try {
        const headers = getCloudflareHeaders(providerConfig);
        const resp = await fetch(`${CF_API_BASE}/user/tokens/verify`, { headers });
        const data = await resp.json();
        return {
            success: data.success,
            message: data.success ? 'Connection successful' : (data.errors?.[0]?.message || 'Verification failed')
        };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

export default {
    fetchCloudflareDomains,
    testCloudflareConnection
};
