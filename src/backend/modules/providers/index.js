/**
 * Domain Providers Index
 * Export all domain provider modules
 */

export { fetchCloudflareDomains, testCloudflareConnection } from './cloudflare.js';
export { fetchPorkbunDomains, testPorkbunConnection } from './porkbun.js';
export { 
    hasDnsheAccounts, 
    getEnabledDnsheAccounts, 
    fetchDnsheDomains, 
    testDnsheAccount,
    syncAllDnsheAccounts,
    syncDnsheAccount,
    addDnsheAccount,
    updateDnsheAccount,
    removeDnsheAccount
} from './dnshe.js';
export { fetchDigitalPlatDomains, testDigitalPlatConnection } from './digitalplat.js';

// Provider configuration helpers
export const PROVIDER_NAMES = ['cloudflare', 'porkbun', 'dnshe', 'digitalplat'];

export function getEnvProviderConfig(env) {
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
        dnshe: [
            {
                id: 'default',
                name: 'Default',
                enabled: !!(env.DNSHE_API_KEY && env.DNSHE_API_SECRET),
                apiKey: env.DNSHE_API_KEY || '',
                apiSecret: env.DNSHE_API_SECRET || ''
            }
        ],
        digitalplat: {
            enabled: !!(env.DIGITALPLAT_API_SECRET || env.DIGITALPLAT_API_KEY),
            apiKey: env.DIGITALPLAT_API_KEY || '',
            apiSecret: env.DIGITALPLAT_API_SECRET || ''
        }
    };
}

export default {
    PROVIDER_NAMES,
    getEnvProviderConfig
};
