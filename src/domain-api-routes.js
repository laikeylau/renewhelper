/**
 * Domain API Routes for RenewHelper
 */
import { DomainSyncManager } from './domain-api.js';

function response(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function errorResponse(msg, status = 400) {
    return response({ code: status, msg }, status);
}

const domainRoutes = {
    async getProviderStatus(req, env) {
        const manager = new DomainSyncManager(env);
        return response({ code: 200, data: manager.getProviderStatus() });
    },

    async syncCloudflare(req, env) {
        const manager = new DomainSyncManager(env);
        try {
            const result = await manager.syncCloudflare();
            return response({ code: 200, data: result });
        } catch (error) {
            return errorResponse(`SYNC_FAILED: ${error.message}`, 500);
        }
    },

    async syncPorkbun(req, env) {
        const manager = new DomainSyncManager(env);
        try {
            const result = await manager.syncPorkbun();
            return response({ code: 200, data: result });
        } catch (error) {
            return errorResponse(`SYNC_FAILED: ${error.message}`, 500);
        }
    },

    async syncAll(req, env) {
        const manager = new DomainSyncManager(env);
        try {
            const result = await manager.syncAll();
            return response({ code: 200, data: result });
        } catch (error) {
            return errorResponse(`SYNC_FAILED: ${error.message}`, 500);
        }
    },
};

export { domainRoutes };
