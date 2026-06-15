/**
 * Router Module
 * Simple router for Cloudflare Workers (supports GET and POST only)
 */

class Router {
    constructor() {
        this.routes = [];
        this.middleware = [];
    }

    // Add middleware
    use(fn) {
        this.middleware.push(fn);
        return this;
    }

    // Register route handlers
    handle(method, path, handler) {
        this.routes.push({ method, path, handler });
        return this;
    }

    get(path, handler) {
        return this.handle('GET', path, handler);
    }

    post(path, handler) {
        return this.handle('POST', path, handler);
    }

    // Route incoming request
    async route(req, env, ctx) {
        const url = new URL(req.url);
        const method = req.method;
        const path = url.pathname;

        // Run middleware
        for (const mw of this.middleware) {
            const result = await mw(req, env, ctx);
            if (result) return result; // Middleware returned a response
        }

        // Find matching route
        for (const route of this.routes) {
            if (route.method === method && route.path === path) {
                try {
                    return await route.handler(req, env, ctx, url);
                } catch (error) {
                    console.error(`Route error: ${method} ${path}`, error);
                    return new Response(
                        JSON.stringify({ code: 500, msg: 'Internal Server Error' }),
                        { status: 500, headers: { 'Content-Type': 'application/json' } }
                    );
                }
            }
        }

        return new Response(
            JSON.stringify({ code: 404, msg: 'Not Found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// Response helpers
export const response = (data, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });

export const error = (msg, status = 400) => response({ code: status, msg }, status);

// Middleware: CORS
export function corsMiddleware(req, env, ctx) {
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400'
            }
        });
    }

    // Add CORS headers to response
    // Note: We can't modify the response here, so we add headers in the handler
    return null;
}

// Middleware: Request logging
export function loggingMiddleware(req, env, ctx) {
    const start = Date.now();
    const url = new URL(req.url);
    
    // Log after response (we can't modify response here, so just log the request)
    console.log(JSON.stringify({
        level: 'info',
        msg: 'Request',
        method: req.method,
        path: url.pathname,
        timestamp: new Date().toISOString()
    }));
    
    return null;
}

export { Router };
export default Router;
