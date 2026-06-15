/**
 * Authentication Module
 * Handles JWT authentication, password verification, and token management
 */

// Helper: Get settings directly from KV (avoid circular dependency)
async function getSettingsFromKV(env) {
    const data = await env.RENEW_KV.get('settings', { type: 'json' });
    return data || { jwtSecret: '' };
}

const Auth = {
    async login(password, env) {
        const settings = await getSettingsFromKV(env);
        if (password === (env.AUTH_PASSWORD || "admin"))
            return await this.sign(settings.jwtSecret);
        throw new Error("PASSWORD_ERROR");
    },

    async verify(req, env) {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return false;
        const settings = await getSettingsFromKV(env);
        return await this.verifyToken(
            authHeader.replace("Bearer ", ""),
            settings.jwtSecret
        );
    },

    async sign(secret) {
        const h = { alg: "HS256", typ: "JWT" },
            p = {
                u: "admin",
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 604800,
            };
        const str = this.b64(h) + "." + this.b64(p);
        return str + "." + (await this.cryptoSign(str, secret));
    },

    async verifyToken(t, s) {
        try {
            const [h, p, sig] = t.split(".");
            if (!sig) return false;
            // 使用恒定时间比较，防止时序攻击
            const expectedSig = await this.cryptoSign(h + "." + p, s);
            if (!(await this.safeCompare(expectedSig, sig))) return false;

            const pl = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
            return !(pl.exp && pl.exp < Math.floor(Date.now() / 1000));
        } catch {
            return false;
        }
    },

    async cryptoSign(t, s) {
        const k = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(s),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );
        return btoa(
            String.fromCharCode(
                ...new Uint8Array(
                    await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(t))
                )
            )
        )
            .replace(/=/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");
    },

    // 恒定时间比较函数
    async safeCompare(a, b) {
        const enc = new TextEncoder();
        const aBuf = enc.encode(a);
        const bBuf = enc.encode(b);
        // 长度不同直接返回false（HMAC-SHA256长度通常固定，此处作为防御）
        if (aBuf.byteLength !== bBuf.byteLength) return false;
        return crypto.subtle.timingSafeEqual(aBuf, bBuf);
    },

    // 生成高强度随机密钥
    genSecret() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array))
            .replace(/=/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");
    },

    b64(o) {
        return btoa(JSON.stringify(o))
            .replace(/=/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");
    },
};

export { Auth };
export default Auth;
