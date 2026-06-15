/**
 * Porkbun Domain Provider Module
 */

const PORKBUN_API_BASE = 'https://api.porkbun.com/api/json/v3';

// Fetch domains from Porkbun
export async function fetchPorkbunDomains(providerConfig) {
    const resp = await fetch(`${PORKBUN_API_BASE}/domain/listAll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            apikey: providerConfig.apiKey,
            secret: providerConfig.apiSecret
        })
    });

    if (!resp.ok) throw new Error('Porkbun API error: ' + resp.status);
    
    const data = await resp.json();
    if (data.status !== 'SUCCESS') throw new Error('Porkbun API error: ' + data.message);

    return Object.entries(data.domains || {}).map(([domain, info]) => ({
        name: domain,
        expires: null
    }));
}

// Test Porkbun connection
export async function testPorkbunConnection(providerConfig) {
    try {
        const resp = await fetch(`${PORKBUN_API_BASE}/ping`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apikey: providerConfig.apiKey,
                secret: providerConfig.apiSecret
            })
        });

        const data = await resp.json();
        return {
            success: data.status === 'SUCCESS',
            message: data.status === 'SUCCESS' ? 'Connection successful' : (data.message || 'Verification failed')
        };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

export default {
    fetchPorkbunDomains,
    testPorkbunConnection
};
