/**
 * Cloudflare Worker: RenewHelper (v3)
 * Author: LOSTFREE
 * Features: Multi-Channel Notify, Import/Export, Channel Test, Bilingual UI, Precise ICS Alarm，Bill Management.
 * See CHANGELOG.md for history.
 */
import { HTML } from '../html-template.js';
// APP_VERSION 将在构建时由 esbuild 注入 (__BUILD_VERSION__)
const APP_VERSION = __BUILD_VERSION__;
//接入免费汇率API
const EXCHANGE_RATE_API_URL = 'https://api.frankfurter.dev/v1/latest?base=';

// ==========================================
// 1. Core Logic (Lunar & Calc)
// ==========================================
// 定义一个全局缓存 (Request 级别)
const _lunarCache = new Map();
const LUNAR_DATA = {
    info: [
        0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0,
        0x09ad0, 0x055d2, 0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540,
        0x0d6a0, 0x0ada2, 0x095b0, 0x14977, 0x04970, 0x0a4b0, 0x0b4b5, 0x06a50,
        0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, 0x06566, 0x0d4a0,
        0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
        0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2,
        0x0a950, 0x0b557, 0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573,
        0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, 0x0aea6, 0x0ab50, 0x04b60, 0x0aae4,
        0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, 0x096d0, 0x04dd5,
        0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
        0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46,
        0x0ab60, 0x09570, 0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58,
        0x055c0, 0x0ab60, 0x096d5, 0x092e0, 0x0c960, 0x0d954, 0x0d4a0, 0x0da50,
        0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, 0x0a950, 0x0b4a0,
        0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
        0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260,
        0x0ea65, 0x0d530, 0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0,
        0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, 0x0b5a0, 0x056d0, 0x055b2, 0x049b0,
        0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, 0x14b63, 0x09370,
        0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
        0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0,
        0x0a6d0, 0x055d4, 0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50,
        0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, 0x0b273, 0x06930, 0x07337, 0x06aa0,
        0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, 0x0e968, 0x0d520,
        0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
        0x0d520
    ],
    gan: "甲乙丙丁戊己庚辛壬癸".split(""),
    zhi: "子丑寅卯辰巳午未申酉戌亥".split(""),
    months: "正二三四五六七八九十冬腊".split(""),
    days: "初一,初二,初三,初四,初五,初六,初七,初八,初九,初十,十一,十二,十三,十四,十五,十六,十七,十八,十九,二十,廿一,廿二,廿三,廿四,廿五,廿六,廿七,廿八,廿九,三十".split(
        ","
    ),
    lYearDays(y) {
        let s = 348;
        for (let i = 0x8000; i > 0x8; i >>= 1) s += this.info[y - 1900] & i ? 1 : 0;
        return s + this.leapDays(y);
    },
    leapDays(y) {
        if (this.leapMonth(y)) return this.info[y - 1900] & 0x10000 ? 30 : 29;
        return 0;
    },
    leapMonth(y) {
        return this.info[y - 1900] & 0xf;
    },
    monthDays(y, m) {
        return this.info[y - 1900] & (0x10000 >> m) ? 30 : 29;
    },
    solar2lunar(y, m, d) {
        // 1. 生成缓存 Key
        const cacheKey = `${y}-${m}-${d}`;
        // 2. 命中缓存直接返回
        if (_lunarCache.has(cacheKey)) return _lunarCache.get(cacheKey);
        if (y < 1900 || y > 2100) return null;
        const base = new Date(Date.UTC(1900, 0, 31)),
            obj = new Date(Date.UTC(y, m - 1, d));
        let offset = Math.round((obj - base) / 86400000);
        let ly = 1900,
            temp = 0;
        for (; ly < 2101 && offset > 0; ly++) {
            temp = this.lYearDays(ly);
            offset -= temp;
        }
        if (offset < 0) {
            offset += temp;
            ly--;
        }
        let lm = 1,
            leap = this.leapMonth(ly),
            isLeap = false;
        for (; lm < 13 && offset > 0; lm++) {
            if (leap > 0 && lm === leap + 1 && !isLeap) {
                --lm;
                isLeap = true;
                temp = this.leapDays(ly);
            } else {
                temp = this.monthDays(ly, lm);
            }
            if (isLeap && lm === leap + 1) isLeap = false;
            offset -= temp;
        }
        if (offset === 0 && leap > 0 && lm === leap + 1) {
            if (isLeap) isLeap = false;
            else {
                isLeap = true;
                --lm;
            }
        }
        if (offset < 0) {
            offset += temp;
            --lm;
        }
        const ld = offset + 1,
            gIdx = (ly - 4) % 10,
            zIdx = (ly - 4) % 12;
        const yStr =
            this.gan[gIdx < 0 ? gIdx + 10 : gIdx] +
            this.zhi[zIdx < 0 ? zIdx + 12 : zIdx];
        const mStr = (isLeap ? "闰" : "") + this.months[lm - 1] + "月";
        const result = {
            year: ly,
            month: lm,
            day: ld,
            isLeap,
            yearStr: yStr,
            monthStr: mStr,
            dayStr: this.days[ld - 1],
            fullStr: yStr + "年" + mStr + this.days[ld - 1],
        };
        // 3. 写入缓存
        _lunarCache.set(cacheKey, result);
        return result;
    },
};

const calcBiz = {
    // 极速版农历转公历 (L2S)
    l2s(l) {
        let days = 0;
        const { year, month, day, isLeap } = l;

        // 1. 累加年份天数 (1900 -> year-1)
        for (let i = 1900; i < year; i++) {
            days += LUNAR_DATA.lYearDays(i);
        }

        // 2. 累加月份天数 (1 -> month-1)
        const leap = LUNAR_DATA.leapMonth(year); // 该年闰哪个月 (0为不闰)
        for (let i = 1; i < month; i++) {
            days += LUNAR_DATA.monthDays(year, i);
            // 如果经过了闰月，需累加闰月天数
            if (leap > 0 && i === leap) {
                days += LUNAR_DATA.leapDays(year);
            }
        }

        // 3. 处理当前月
        // 如果是闰月，说明已经过完了该月的"正常月"，需加上正常月的天数
        if (isLeap) {
            days += LUNAR_DATA.monthDays(year, month);
        }

        // 4. 累加日数 (day - 1)
        days += day - 1;

        // 5. 计算公历日期 (基准日 1900-01-31)
        // 使用 UTC 避免时区干扰
        const base = new Date(Date.UTC(1900, 0, 31));
        const target = new Date(base.getTime() + days * 86400000);

        return {
            year: target.getUTCFullYear(),
            month: target.getUTCMonth() + 1,
            day: target.getUTCDate(),
        };
    },

    addPeriod(l, val, unit) {
        let { year, month, day, isLeap } = l;
        if (unit === "year") {
            year += val;
            const lp = LUNAR_DATA.leapMonth(year);
            // 如果目标年没有该闰月，或者目标月不是闰月，取消闰月标记
            isLeap = isLeap && lp === month;
        } else if (unit === "month") {
            let tot = (year - 1900) * 12 + (month - 1) + val;
            year = Math.floor(tot / 12) + 1900;
            month = (tot % 12) + 1;
            const lp = LUNAR_DATA.leapMonth(year);
            isLeap = isLeap && lp === month;
        } else if (unit === "day") {
            // 日增加直接转公历加天数再转回农历
            const s = this.l2s(l);
            const d = new Date(Date.UTC(s.year, s.month - 1, s.day + val));
            return LUNAR_DATA.solar2lunar(
                d.getUTCFullYear(),
                d.getUTCMonth() + 1,
                d.getUTCDate()
            );
        }

        // 修正日期有效性 (例如: 农历30日变29日)
        let max = isLeap
            ? LUNAR_DATA.leapDays(year)
            : LUNAR_DATA.monthDays(year, month);
        let td = Math.min(day, max);

        // 递归检查有效性
        while (td > 0) {
            if (this.l2s({ year, month, day: td, isLeap }))
                return { year, month, day: td, isLeap };
            td--;
        }
        return { year, month, day, isLeap };
    },
};

// ==========================================
// 2. Infrastructure & Utils - REVISED
// ==========================================

class Router {
    constructor() {
        this.routes = [];
    }
    handle(method, path, handler) {
        this.routes.push({ method, path, handler });
    }
    get(path, handler) {
        this.handle("GET", path, handler);
    }
    post(path, handler) {
        this.handle("POST", path, handler);
    }

    async route(req, env) {
        const url = new URL(req.url);
        const method = req.method;

        for (const route of this.routes) {
            if (route.method === method && route.path === url.pathname)
                return await route.handler(req, env, url);
        }
        return new Response("Not Found", { status: 404 });
    }
}

const response = (data, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
const error = (msg, status = 400) => response({ code: status, msg }, status);

// ==========================================
// 3. Business Logic (Services)
// ==========================================

const Auth = {
    async login(password, env) {
        const settings = await DataStore.getSettings(env);
        if (password === (env.AUTH_PASSWORD || "admin"))
            return await this.sign(settings.jwtSecret);
        throw new Error("PASSWORD_ERROR");
    },
    async verify(req, env) {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return false;
        const settings = await DataStore.getSettings(env);
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

const DEFAULT_CALENDAR_SUBSCRIPTION_ID = "default";
const getDefaultCalendarSubscriptionName = (lang = "zh") =>
    lang === "en" ? "All Reminders" : "全部提醒";

function normalizeCalendarSubscriptions(settings = {}) {
    const lang = settings.language === "en" ? "en" : "zh";
    const source = Array.isArray(settings.calendarSubscriptions)
        ? settings.calendarSubscriptions
        : [];
    const legacyToken =
        typeof settings.calendarToken === "string" && settings.calendarToken.trim()
            ? settings.calendarToken.trim()
            : "";

    let changed = !Array.isArray(settings.calendarSubscriptions);
    const seenIds = new Set();
    const seenTokens = new Set();
    let defaultSub = null;
    const customSubs = [];

    const normalizeItemIds = (itemIds) => {
        if (!Array.isArray(itemIds)) {
            changed = true;
            return [];
        }
        const normalized = Array.from(
            new Set(
                itemIds
                    .map((id) => (id === null || id === undefined ? "" : String(id).trim()))
                    .filter(Boolean)
            )
        );
        if (normalized.length !== itemIds.length) changed = true;
        return normalized;
    };

    const nextUniqueToken = () => {
        let token = crypto.randomUUID();
        while (seenTokens.has(token)) token = crypto.randomUUID();
        return token;
    };

    for (const raw of source) {
        if (!raw || typeof raw !== "object") {
            changed = true;
            continue;
        }

        let id =
            typeof raw.id === "string" && raw.id.trim()
                ? raw.id.trim()
                : crypto.randomUUID();
        if (seenIds.has(id)) {
            id = crypto.randomUUID();
            changed = true;
        }
        seenIds.add(id);

        let token =
            typeof raw.token === "string" && raw.token.trim()
                ? raw.token.trim()
                : nextUniqueToken();
        if (seenTokens.has(token)) {
            token = nextUniqueToken();
            changed = true;
        }
        seenTokens.add(token);

        const itemIds = normalizeItemIds(raw.itemIds);
        const isDefaultCandidate =
            raw.isDefault === true ||
            id === DEFAULT_CALENDAR_SUBSCRIPTION_ID ||
            (!!legacyToken && token === legacyToken);
        const fallbackName = isDefaultCandidate
            ? getDefaultCalendarSubscriptionName(lang)
            : `Calendar ${customSubs.length + 1}`;
        const name =
            typeof raw.name === "string" && raw.name.trim()
                ? raw.name.trim()
                : fallbackName;
        if (name !== raw.name) changed = true;

        const normalizedSub = {
            id,
            name,
            token,
            itemIds,
            isDefault: !!isDefaultCandidate,
        };

        if (isDefaultCandidate && !defaultSub) {
            defaultSub = normalizedSub;
        } else {
            normalizedSub.isDefault = false;
            customSubs.push(normalizedSub);
        }
    }

    if (!defaultSub) {
        defaultSub = {
            id: DEFAULT_CALENDAR_SUBSCRIPTION_ID,
            name: getDefaultCalendarSubscriptionName(lang),
            token: legacyToken || nextUniqueToken(),
            itemIds: [],
            isDefault: true,
        };
        changed = true;
    }

    if (defaultSub.id !== DEFAULT_CALENDAR_SUBSCRIPTION_ID) {
        changed = true;
        seenIds.delete(defaultSub.id);
        defaultSub.id = DEFAULT_CALENDAR_SUBSCRIPTION_ID;
    }

    if (!defaultSub.name || !defaultSub.name.trim()) {
        defaultSub.name = getDefaultCalendarSubscriptionName(lang);
        changed = true;
    }

    if (legacyToken) {
        if (defaultSub.token !== legacyToken) {
            seenTokens.delete(defaultSub.token);
            defaultSub.token = legacyToken;
            changed = true;
        }
    } else if (!defaultSub.token || !defaultSub.token.trim()) {
        defaultSub.token = nextUniqueToken();
        changed = true;
    }

    seenTokens.add(defaultSub.token);
    defaultSub.isDefault = true;

    for (const sub of customSubs) {
        if (sub.token === defaultSub.token) {
            sub.token = nextUniqueToken();
            changed = true;
        }
        seenTokens.add(sub.token);
    }

    const calendarSubscriptions = [defaultSub, ...customSubs];
    if (
        settings.calendarToken !== defaultSub.token ||
        calendarSubscriptions.length !== source.length
    ) {
        changed = true;
    }

    return {
        calendarToken: defaultSub.token,
        calendarSubscriptions,
        changed,
    };
}

const DataStore = {
    KEYS: { SETTINGS: "SYS_CONFIG", ITEMS: "DATA_ITEMS", LOGS: "LOGS" },

    async getSettings(env) {
        let s = {};
        const raw = await env.RENEW_KV.get(this.KEYS.SETTINGS);
        if (raw)
            try {
                s = JSON.parse(raw);
            } catch (e) { }

        const defaults = {
            enableNotify: true,
            autoDisableDays: 30,
            language: "zh",
            timezone: "UTC",
            defaultCurrency: "CNY",
            jwtSecret: "",
            calendarToken: "",
            calendarSubscriptions: [],
            enabledChannels: [],
            notifyConfig: {
                telegram: { token: "", chatId: "", apiServer: "" },
                bark: { server: "https://api.day.app", key: "" },
                pushplus: { token: "" },
                notifyx: { apiKey: "" },
                resend: { apiKey: "", from: "", to: "" },
                webhook: { url: "" },
                webhook2: { url: "" },
                webhook3: { url: "" },
                gotify: { server: "", token: "" },
                ntfy: { server: "https://ntfy.sh", topic: "", token: "" },
            },
        };

        s = { ...defaults, ...s };
        s.notifyConfig = { ...defaults.notifyConfig, ...(s.notifyConfig || {}) };

        let save = false;

        if (!s.jwtSecret) {
            s.jwtSecret = Auth.genSecret();
            save = true;
        }
        if (!s.calendarToken) {
            s.calendarToken = crypto.randomUUID();
            save = true;
        }

        const normalizedCalendars = normalizeCalendarSubscriptions(s);
        if (normalizedCalendars.changed) save = true;
        s.calendarToken = normalizedCalendars.calendarToken;
        s.calendarSubscriptions = normalizedCalendars.calendarSubscriptions;

        if (save) await this.saveSettings(env, s);
        return s;
    },

    async saveSettings(env, data) {
        const normalizedCalendars = normalizeCalendarSubscriptions(data || {});
        const payload = {
            ...data,
            calendarToken: normalizedCalendars.calendarToken,
            calendarSubscriptions: normalizedCalendars.calendarSubscriptions,
        };
        await env.RENEW_KV.put(this.KEYS.SETTINGS, JSON.stringify(payload, null, 2));
    },

    async getItemsPackage(env) {

        const raw = await env.RENEW_KV.get(this.KEYS.ITEMS, { type: "text" });
        try {
            if (!raw) return { items: [], version: 0 };
            const parsed = JSON.parse(raw);

            // 兼容旧数据（纯数组格式）
            if (Array.isArray(parsed)) {
                return { items: parsed, version: 0 };
            }
            // 新数据格式
            return { items: parsed.items || [], version: parsed.version || 0 };
        } catch (e) {
            return { items: [], version: 0 };
        }
    },

    async getItems(env) {
        const pkg = await this.getItemsPackage(env);
        return pkg.items;
    },

    // 带乐观锁的保存
    async saveItems(env, newItems, expectedVersion = null, force = false) {
        // 1. 如果不是强制保存，先检查版本
        if (!force) {
            const currentPkg = await this.getItemsPackage(env);
            // 版本不匹配则抛出冲突
            if (expectedVersion !== null && currentPkg.version !== expectedVersion) {
                throw new Error("VERSION_CONFLICT");
            }
        }

        // 2. 生成新版本号 (时间戳)
        const newVersion = Date.now();
        const storageObj = {
            items: newItems,
            version: newVersion,
        };

        // 3. 写入 KV
        await env.RENEW_KV.put(this.KEYS.ITEMS, JSON.stringify(storageObj, null, 2));
        return newVersion;
    },

    async getCombined(env) {
        const [settings, pkg] = await Promise.all([
            this.getSettings(env),
            this.getItemsPackage(env),
        ]);
        return { settings, items: pkg.items, version: pkg.version };
    },

    // 【修复】增加 try-catch 容错，防止日志数据损坏导致无法写入
    async getLogs(env) {
        try {
            const raw = await env.RENEW_KV.get(this.KEYS.LOGS);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            // 如果解析失败（数据损坏），返回空数组，确保新日志能写入
            return [];
        }
    },

    async saveLog(env, entry) {
        try {
            const logs = await this.getLogs(env);
            logs.unshift(entry);
            // 限制保留最近 30 条
            await env.RENEW_KV.put(this.KEYS.LOGS, JSON.stringify(logs.slice(0, 30)));
        } catch (e) {
            console.log(`[ERR] Log save failed: ${e.message}`);
        }
    },
};

// ==========================================
// 全局内存缓存 (用于 1秒/次 极速限流)
// Worker 实例未销毁前，Map 会一直存在
// ==========================================
const _memLimitCache = new Map();

const RateLimiter = {
    async check(env, ip, action) {
        if (!ip) return true; // 开发环境或获取不到IP时放行

        const now = Date.now();

        // ------------------------------------------------
        // 层级 1: 内存限流 (1秒/次)
        // 作用: 防止瞬间并发/脚本爆破，不消耗 KV 额度
        // ------------------------------------------------
        const memKey = `${action}:${ip}`;
        const lastTime = _memLimitCache.get(memKey) || 0;

        if (now - lastTime < 1000) {
            return false; // 触发 1s 冷却
        }
        _memLimitCache.set(memKey, now); // 更新内存时间戳

        // ------------------------------------------------
        // 层级 2: KV 限流 (每日 100次)
        // 作用: 限制每日总调用量，持久化存储
        // ------------------------------------------------
        const today = new Date().toISOString().split("T")[0];
        const kvKey = `RATELIMIT:${today}:${action}:${ip}`;

        // 获取当前计数值 (如果不存在则为 0)
        let count = await env.RENEW_KV.get(kvKey);
        count = count ? parseInt(count) : 0;

        if (count >= 100) {
            return false; // 触发每日上限
        }

        // 增加计数并写入 KV (设置 24小时过期)
        // 使用 waitUntil 可以在后台写入，不阻塞响应速度
        // 注意: 这里的 put 会覆盖 TTL，所以每次更新都要带上
        await env.RENEW_KV.put(kvKey, (count + 1).toString(), {
            expirationTtl: 86400,
        });

        return true;
    },

    // --- Anti-Brute-Force ---
    async checkBruteForce(env, ip) {
        if (!ip) return true;
        // 检查是否存在封禁Key
        const banKey = `BAN:${ip}`;
        const banned = await env.RENEW_KV.get(banKey);
        return !banned; // 如果存在 banned，则返回 false (不允许通过)
    },

    async recordFailure(env, ip) {
        if (!ip) return;
        const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
        const failKey = `FAIL:${ip}`; // 记录失败次数的 Key

        // 获取当前失败记录
        // 格式: "count:last_fail_timestamp" 例如 "2:1678888888"
        // 或者简单存个 JSON: { c: 2, t: 1678888888 }
        const raw = await env.RENEW_KV.get(failKey);
        let data = raw ? JSON.parse(raw) : { c: 0, t: 0 };

        // 策略: 5分钟内 (300s) 累计失败 5 次 -> 封 IP 15分钟 (900s)
        const WINDOW = 300;
        const THRESHOLD = 5;
        const BAN_TIME = 900;

        // 如果距离上次失败超过窗口期，重置计数
        if (now - data.t > WINDOW) {
            data.c = 0;
        }

        data.c += 1;
        data.t = now;

        if (data.c >= THRESHOLD) {
            // 触发封禁
            const banKey = `BAN:${ip}`;
            await env.RENEW_KV.put(banKey, "1", { expirationTtl: BAN_TIME });
            // 清除失败记录（封禁期间不需要再计数，解封后重新开始）
            await env.RENEW_KV.delete(failKey);
            return { banned: true, msg: "Too many failures. IP Banned for 15 min." };
        }

        // 更新失败计数 (设置过期时间为窗口期，稍大一点防止临界值问题)
        await env.RENEW_KV.put(failKey, JSON.stringify(data), { expirationTtl: WINDOW + 60 });
        return { banned: false, remaining: THRESHOLD - data.c };
    },
};

const Calc = {
    parseYMD(s) {
        if (!s) return new Date();
        const p = s.split("-");
        return new Date(Date.UTC(+p[0], +p[1] - 1, parseInt(p[2])));
    },
    toYMD(d) {
        return d.toISOString().split("T")[0];
    },
    // 获取基于用户时区的“今天” (00:00:00 UTC)
    getTzToday(tz) {
        try {
            const f = new Intl.DateTimeFormat("en-CA", {
                timeZone: tz || "UTC",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            });
            return this.parseYMD(f.format(new Date()));
        } catch (e) {
            const d = new Date();
            d.setUTCHours(0, 0, 0, 0);
            return d;
        }
    },

    // 生成某一月份中的 RRULE 候选日期
    generateMonthCandidates(y, m, bymonthday, byweekday, bysetpos) {
        let daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        let res = [];
        if (bymonthday) {
            for (let d of bymonthday) {
                let testD = Number(d);
                if (testD < 0) testD = daysInMonth + testD + 1;
                if (testD > 0 && testD <= daysInMonth) {
                    let dt = new Date(Date.UTC(y, m, testD));
                    if (!byweekday || byweekday.includes(dt.getUTCDay())) res.push(dt);
                }
            }
        } else {
            for (let d = 1; d <= daysInMonth; d++) {
                let dt = new Date(Date.UTC(y, m, d));
                if (!byweekday || byweekday.includes(dt.getUTCDay())) res.push(dt);
            }
        }
        if (bysetpos !== undefined && bysetpos !== null && bysetpos !== '') {
            let pos = Number(bysetpos);
            res.sort((a, b) => a.getTime() - b.getTime());
            if (pos > 0 && pos <= res.length) res = [res[pos - 1]];
            else if (pos < 0 && Math.abs(pos) <= res.length) res = [res[res.length + pos]];
            else res = [];
        }
        return res;
    },

    // 核心：处理复杂自然周期 (RRULE 变体) 下一次执行日推断
    calcNextRepeatDate(repeat, rDateStr, cDateStr) {
        if (!repeat) return null;

        const dtstart = this.parseYMD(cDateStr || rDateStr);
        const baseObj = this.parseYMD(rDateStr);
        if (!dtstart || Number.isNaN(dtstart.getTime()) || !baseObj || Number.isNaN(baseObj.getTime())) {
            return null;
        }

        const freq = repeat.freq || "monthly";
        const interval = Math.max(1, Number(repeat.interval) || 1);

        const toArr = (v) =>
            Array.isArray(v) && v.length > 0
                ? v
                : v !== undefined && v !== null && !Array.isArray(v)
                    ? [v]
                    : null;

        const sanitize = (list, predicate) => {
            if (!list) return null;
            const filtered = list
                .map((val) => Number(val))
                .filter((num) => Number.isFinite(num) && predicate(num));
            return filtered.length ? filtered : null;
        };

        let bymonthday = sanitize(toArr(repeat.bymonthday), (n) => n !== 0 && n >= -31 && n <= 31);
        let byweekday = sanitize(toArr(repeat.byweekday), (n) => n >= 0 && n <= 6);
        let bymonth = sanitize(toArr(repeat.bymonth), (n) => n >= 1 && n <= 12);
        let bysetpos = repeat.bysetpos;
        if (bysetpos !== undefined && bysetpos !== null) {
            const parsed = Number(bysetpos);
            bysetpos = Number.isFinite(parsed) && Math.abs(parsed) <= 366 ? parsed : null;
        } else {
            bysetpos = null;
        }

        let bycycleday = sanitize(
            toArr(repeat.bycycleday),
            (n) => n >= 1 && n <= interval
        );

        if (!bymonthday && !byweekday && bysetpos === null) {
            if (freq === "monthly" || freq === "yearly") bymonthday = [dtstart.getUTCDate()];
            if (freq === "weekly") byweekday = [dtstart.getUTCDay()];
        }
        if (freq === "yearly" && !bymonth) bymonth = [dtstart.getUTCMonth() + 1];

        for (let periods = 0; periods < 100; periods++) {
            let candidates = [];
            const y0 = dtstart.getUTCFullYear();
            const m0 = dtstart.getUTCMonth();
            const d0 = dtstart.getUTCDate();

            if (freq === "yearly") {
                let y = y0 + periods * interval;
                const monthList = bymonth || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                for (let testM of monthList) {
                    candidates.push(
                        ...this.generateMonthCandidates(y, testM - 1, bymonthday, byweekday, bysetpos)
                    );
                }
            } else if (freq === "monthly") {
                let tm = m0 + periods * interval;
                candidates.push(
                    ...this.generateMonthCandidates(
                        y0 + Math.floor(tm / 12),
                        ((tm % 12) + 12) % 12,
                        bymonthday,
                        byweekday,
                        bysetpos
                    )
                );
            } else if (freq === "weekly") {
                const wStart = new Date(Date.UTC(y0, m0, d0 + periods * interval * 7));
                const dayOfWeek = wStart.getUTCDay();
                const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                const mon = new Date(
                    Date.UTC(
                        wStart.getUTCFullYear(),
                        wStart.getUTCMonth(),
                        wStart.getUTCDate() - diffToMonday
                    )
                );
                for (let i = 0; i < 7; i++) {
                    const curr = new Date(
                        Date.UTC(mon.getUTCFullYear(), mon.getUTCMonth(), mon.getUTCDate() + i)
                    );
                    if (!byweekday || byweekday.includes(curr.getUTCDay())) {
                        candidates.push(curr);
                    }
                }
            } else if (freq === "daily") {
                if (bycycleday) {
                    const cycleStart = new Date(Date.UTC(y0, m0, d0 + periods * interval));
                    for (let bd of bycycleday) {
                        const offset = Number(bd) - 1;
                        if (offset >= 0 && offset < interval) {
                            candidates.push(
                                new Date(
                                    Date.UTC(
                                        cycleStart.getUTCFullYear(),
                                        cycleStart.getUTCMonth(),
                                        cycleStart.getUTCDate() + offset
                                    )
                                )
                            );
                        }
                    }
                } else {
                    candidates.push(new Date(Date.UTC(y0, m0, d0 + periods * interval)));
                }
            }

            candidates = candidates.filter((cd) => cd > baseObj);
            if (candidates.length > 0) {
                candidates.sort((a, b) => a.getTime() - b.getTime());
                return candidates[0];
            }
        }
        return null;
    }
};

function repeatFallbackAdvance(anchorDate, repeat = {}) {
    const safeDate = new Date(anchorDate.getTime());
    const freq = repeat.freq || "monthly";
    const step = Math.max(1, Number(repeat.interval) || 1);

    switch (freq) {
        case "daily":
            safeDate.setUTCDate(safeDate.getUTCDate() + step);
            break;
        case "weekly":
            safeDate.setUTCDate(safeDate.getUTCDate() + step * 7);
            break;
        case "yearly":
            safeDate.setUTCFullYear(safeDate.getUTCFullYear() + step);
            break;
        default:
            safeDate.setUTCMonth(safeDate.getUTCMonth() + step);
            break;
    }
    return safeDate;
}

function resolveRepeatNextDate(repeat, rDateStr, cDateStr, contextTag = "repeat") {
    if (!repeat) return null;
    try {
        const next = Calc.calcNextRepeatDate(repeat, rDateStr, cDateStr);
        if (next) return next;
    } catch (err) {
        console.warn(`[RepeatRule] ${contextTag} calculation error: ${err.message}`);
    }

    const anchor = Calc.parseYMD(rDateStr);
    if (Number.isNaN(anchor.getTime())) {
        const fallback = repeatFallbackAdvance(Calc.parseYMD(Calc.toYMD(new Date())), repeat);
        console.warn(`[RepeatRule] ${contextTag} anchor invalid, fallback to ${Calc.toYMD(fallback)}`);
        return fallback;
    }

    const fallbackDate = repeatFallbackAdvance(anchor, repeat);
    console.warn(
        `[RepeatRule] ${contextTag} fallback triggered, please check RRULE config: ${JSON.stringify(repeat)}`
    );
    return fallbackDate;
}

// HTML转义工具
const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const Notifier = {
    // New Dispatch Method: Accepts explicit list of channel objects
    async dispatch(channels, title, body) {
        if (!channels || channels.length === 0) return "NO_TARGET_CHANNELS";

        const tasks = [];
        for (const ch of channels) {
            if (ch.enable && this.adapters[ch.type]) {
                tasks.push(
                    this.adapters[ch.type](ch.config, title, body)
                        .then((res) => `[${ch.name}: ${res}]`)
                        .catch((err) => `[${ch.name}: ERR ${err.message}]`)
                );
            }
        }

        if (tasks.length === 0) return "NO_ACTIVE_ADAPTERS";
        const results = await Promise.all(tasks);
        return results.join(" ");
    },

    adapters: {
        telegram: async (c, title, body) => {
            if (!c.token || !c.chatId) return "MISSING_CONF";
            const text = `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}`;
            const server = (c.apiServer || "https://api.telegram.org").replace(/\/$/, "");
            const r = await fetch(
                `${server}/bot${c.token}/sendMessage`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: c.chatId,
                        text,
                        parse_mode: "HTML",
                    }),
                }
            );
            return r.ok ? "OK" : "FAIL";
        },
        bark: async (c, title, body) => {
            if (!c.key) return "MISSING_CONF";
            const server = (c.server || "https://api.day.app").replace(/\/$/, "");
            const r = await fetch(
                `${server}/${c.key}/${encodeURIComponent(title)}/${encodeURIComponent(
                    body
                )}?group=RenewHelper`
            );
            return r.ok ? "OK" : "FAIL";
        },
        pushplus: async (c, title, body) => {
            if (!c.token) return "MISSING_CONF";
            const safeContent = escapeHtml(body).replace(/\n/g, "<br>");
            const r = await fetch("https://www.pushplus.plus/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: c.token,
                    title,
                    content: safeContent,
                    template: "html",
                }),
            });
            return r.ok ? "OK" : "FAIL";
        },
        notifyx: async (c, title, body) => {
            if (!c.apiKey) return "MISSING_CONF";
            let description = "Alert";
            const content = body.replace(/\n/g, "\n\n");
            const r = await fetch(`https://www.notifyx.cn/api/v1/send/${c.apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, description }),
            });
            return r.ok ? "OK" : "FAIL";
        },
        resend: async (c, title, body) => {
            if (!c.apiKey || !c.to || !c.from) return "MISSING_CONF";
            const r = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${c.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: c.from,
                    to: c.to,
                    subject: title,
                    text: body,
                }),
            });
            return r.ok ? "OK" : "FAIL";
        },
        webhook: webhookAdapterImpl,
        webhook2: webhookAdapterImpl,
        webhook3: webhookAdapterImpl,
        gotify: async (c, title, body) => {
            if (!c.server || !c.token) return "MISSING_CONF";
            const server = c.server.replace(/\/$/, "");
            const r = await fetch(`${server}/message`, {
                method: "POST",
                headers: { "X-Gotify-Key": c.token, "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title,
                    message: body,
                    priority: 5,
                }),
            });
            return r.ok ? "OK" : "FAIL";
        },
        ntfy: async (c, title, body) => {
            if (!c.topic) return "MISSING_CONF";
            const server = (c.server || "https://ntfy.sh").replace(/\/$/, "");
            const headers = { "Title": title };
            if (c.token) headers["Authorization"] = `Bearer ${c.token}`;

            const r = await fetch(`${server}/${c.topic}`, {
                method: "POST",
                headers: headers,
                body: body,
            });
            return r.ok ? "OK" : "FAIL";
        },
        serverchan3: async (c, title, body) => {
            if (!c.uid || !c.key) return "MISSING_CONF";
            const url = `https://${c.uid}.push.ft07.com/send/${c.key}.send?title=${encodeURIComponent(title)}&desp=${encodeURIComponent(body)}`;
            const r = await fetch(url);
            return r.ok ? "OK" : "FAIL";
        },
        dingtalk: async (c, title, body) => {
            if (!c.token) return "MISSING_CONF";
            let url = `https://oapi.dingtalk.com/robot/send?access_token=${c.token}`;
            if (c.secret) {
                const timestamp = Date.now();
                const str = `${timestamp}\n${c.secret}`;
                const key = await crypto.subtle.importKey(
                    "raw", new TextEncoder().encode(c.secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
                );
                const sign = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(str)))));
                url += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
            }
            const r = await fetch(url, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ msgtype: "markdown", markdown: { title, text: `## ${title}\n\n${body}` } })
            });
            return r.ok ? "OK" : "FAIL";
        },
        lark: async (c, title, body) => {
            // 支持旧版 Webhook URL 配置（兼容性）
            let url = c.webhook;
            let reqBody = {
                msg_type: "text",
                content: { text: `${title}\n\n${body}` },
            };

            // 新版配置: Token + Secret
            if (c.token) {
                url = `https://open.feishu.cn/open-apis/bot/v2/hook/${c.token}`;
                if (c.secret) {
                    const timestamp = Math.floor(Date.now() / 1000);
                    const stringToSign = `${timestamp}\n${c.secret}`;
                    const mac = await crypto.subtle.importKey(
                        "raw",
                        new TextEncoder().encode(stringToSign),
                        { name: "HMAC", hash: "SHA-256" },
                        false,
                        ["sign"]
                    );
                    const signBuf = await crypto.subtle.sign("HMAC", mac, new TextEncoder().encode(""));
                    const sign = btoa(String.fromCharCode(...new Uint8Array(signBuf)));

                    reqBody.timestamp = timestamp.toString();
                    reqBody.sign = sign;
                }
            }

            if (!url) return "MISSING_CONF";

            const r = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reqBody),
            });
            return r.ok ? "OK" : "FAIL";
        },
        wecom: async (c, title, body) => {
            let url = c.webhook;
            if (c.token) {
                let key = c.token;
                if (key.includes("key=")) key = key.split("key=")[1]; // Tolerance for full URL paste
                url = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${key}`;
            }
            if (!url) return "MISSING_CONF";

            const r = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    msgtype: "text",
                    text: { content: `${title}\n\n${body}` },
                }),
            });
            return r.ok ? "OK" : "FAIL";
        },
    },
};

async function webhookAdapterImpl(c, title, body) {
    if (!c.url) return "MISSING_CONF";
    try {
        let headers = { "Content-Type": "application/json" };
        if (c.headers) {
            try {
                const h = JSON.parse(c.headers);
                headers = { ...headers, ...h };
            } catch { }
        }

        let reqBody = JSON.stringify({ title, content: body });
        if (c.body) {
            // Unescape JSON string placeholders safely
            // Handle escaped newlines in user-provided body template (e.g. "\\n" -> "\n")
            const safeTitle = JSON.stringify(title).slice(1, -1);
            const safeBody = JSON.stringify(body).slice(1, -1);

            // Use callback function in replace to avoid special replacement patterns (like $&, $1)
            let raw = c.body
                .replace(/{title}/g, () => safeTitle)
                .replace(/{body}/g, () => safeBody);
            reqBody = raw;
        }

        const r = await fetch(c.url, {
            method: "POST",
            headers: headers,
            body: reqBody,
        });

        return r.ok ? "OK" : "FAIL";
    } catch (e) {
        return "ERR";
    }
}

// ==========================================
// 4. Logic Controllers
// ==========================================

function calculateStatus(item, timezone = "UTC") {
    // 使用时区感知的“今天”
    const today = Calc.getTzToday(timezone);

    const cDate = item.createDate || Calc.toYMD(today),
        rDate = item.lastRenewDate || cDate;
    const interval = Number(item.intervalDays),
        unit = item.cycleUnit || "day";

    let nextObj;

    const hasHistory = Array.isArray(item.renewHistory) && item.renewHistory.length > 0 && item.renewHistory[0].endDate;

    if (item.type === 'repeat' && item.repeat && item.repeat.freq) {
        // ============================================================
        // 1. 对于固定自然重复 (Repeat) 服务，严格遵循 RRULE 推算算法引擎
        // ============================================================
        nextObj = resolveRepeatNextDate(item.repeat, rDate, cDate, `calculateStatus:${item.id || item.name || 'unknown'}`);
    } else if (hasHistory) {
        // ============================================================
        // 2. 对于普通按量倒数服务：优先使用续费历史中的 EndDate 作为下次到期日
        // ============================================================
        // 直接取最新一条历史记录的 endDate
        nextObj = Calc.parseYMD(item.renewHistory[0].endDate);

        // 如果开启了农历，仍需处理农历转换以便显示
        // 但 nextObj 本身已经确定，不需要再做加减运算
    } else {
        // ============================================================
        // 原逻辑: 根据 lastRenewDate + 周期 动态推算
        // ============================================================
        const rObj = Calc.parseYMD(rDate);

        if (item.useLunar) {
            let l = LUNAR_DATA.solar2lunar(
                rObj.getUTCFullYear(),
                rObj.getUTCMonth() + 1,
                rObj.getUTCDate()
            );
            if (l) {
                let nl = calcBiz.addPeriod(l, interval, unit);
                let s = calcBiz.l2s(nl);
                nextObj = new Date(Date.UTC(s.year, s.month - 1, s.day));
            } else nextObj = new Date(rObj);
        } else {
            nextObj = new Date(rObj);
            if (unit === "year")
                nextObj.setUTCFullYear(nextObj.getUTCFullYear() + interval);
            else if (unit === "month")
                nextObj.setUTCMonth(nextObj.getUTCMonth() + interval);
            else nextObj.setUTCDate(nextObj.getUTCDate() + interval);
        }
    }

    // 计算农历显示字符串
    let lNext = "",
        lLast = "";
    if (item.useLunar) {
        const ln = LUNAR_DATA.solar2lunar(
            nextObj.getUTCFullYear(),
            nextObj.getUTCMonth() + 1,
            nextObj.getUTCDate()
        );
        if (ln) lNext = ln.fullStr;

        // 如果是历史记录模式，rObj 可能已经不重要了，但为了兼容显示仍计算一下
        const rObjForLunar = Calc.parseYMD(rDate);
        const ll = LUNAR_DATA.solar2lunar(
            rObjForLunar.getUTCFullYear(),
            rObjForLunar.getUTCMonth() + 1,
            rObjForLunar.getUTCDate()
        );
        if (ll) lLast = ll.fullStr;
    }

    return {
        ...item,
        enabled: item.enabled !== false,
        cycleUnit: unit,
        createDate: cDate,
        lastRenewDate: rDate,
        serviceDays: Math.floor((today - Calc.parseYMD(cDate)) / 86400000),
        daysLeft: Math.round((nextObj - today) / 86400000),
        nextDueDate: Calc.toYMD(nextObj),
        nextDueDateLunar: lNext,
        lastRenewDateLunar: lLast,
        tags: Array.isArray(item.tags) ? item.tags : [],
        useLunar: !!item.useLunar,
        notifyTime: item.notifyTime || "08:00",
    };
}

const I18N = {
    zh: {
        scan: "扫描 %s 个服务",
        autoDisable: "🚫 [%s] 过期 %s 天，已自动禁用",
        autoRenew: "🔄 [%s] 自动续期成功",
        today: "今天到期",
        overdue: "过期 %s 天",
        left: "剩 %s 天",
        checkLog: "[CHECK] %s | %s",
        thres: "(阈值: %s)",
        pushTitle: "RenewHelper 报告",
        secDis: "🚫 服务已禁用",
        secRen: "🔄 服务已续期",
        secAle: "⏳ 服务即将到期",
        editLastRenewHint: "请在「历史记录」中修改",
        note: "备注",
        lblEnable: "启用",
        lblToken: "令牌 (Token)",
        lblApiKey: "API Key",
        lblChatId: "会话ID",
        lblServer: "服务器URL",
        lblDevKey: "设备Key",
        lblFrom: "发件人",
        lblTo: "收件人",
        lblNotifyTime: "提醒时间",
        btnTest: "发送测试",
    },
    en: {
        scan: "Scan %s items",
        autoDisable: "🚫 [%s] Overdue %sd, Disabled",
        autoRenew: "🔄 [%s] Auto Renewed",
        today: "Due Today",
        overdue: "Overdue %sd",
        left: "Left %sd",
        checkLog: "[CHECK] %s | %s",
        thres: "(Thres: %s)",
        pushTitle: "RenewHelper Report",
        secDis: "🚫 Services Disabled",
        secRen: "🔄 Services Renewed",
        secAle: "⏳ Expiring Soon",
        editLastRenewHint: "Please modify in History",
        note: "Note",
        lblEnable: "Enable",
        lblToken: "Token",
        lblApiKey: "API Key",
        lblChatId: "Chat ID",
        lblServer: "Server URL",
        lblDevKey: "Device Key",
        lblFrom: "From Email",
        lblTo: "To Email",
        lblNotifyTime: "Alarm Time",
        btnTest: "Send Test",
    },
};
function t(k, l, ...a) {
    let s = (I18N[l] || I18N.zh)[k] || k;
    a.forEach((x) => (s = s.replace("%s", x)));
    return s;
}

async function checkAndRenew(env, isSched, lang = "zh") {
    // 使用 getItemsPackage 获取带版本的数据
    const [conf, pkg] = await Promise.all([
        DataStore.getSettings(env),
        DataStore.getItemsPackage(env),
    ]);

    const s = conf;
    const items = pkg.items;
    const currentVersion = pkg.version;

    const logs = [],
        log = (m) => {
            logs.push(m);
            console.log(m);
        };

    let trig = [],
        upd = [],
        dis = [],
        monitor = [],
        changed = false;

    log(`[SYSTEM] ${t("scan", lang, items.length)}`);

    // 1. 获取基于偏好时区的“今天”
    const today = Calc.getTzToday(s.timezone);
    const todayStr = Calc.toYMD(today);

    // 2. 获取当前时间 (用于 Cron 定时通知的时间比对)
    let nowH = 0, nowM = 0;
    try {
        const fmt = new Intl.DateTimeFormat("en-US", {
            timeZone: s.timezone || "UTC",
            hour12: false,
            hour: "numeric",
            minute: "numeric",
        });
        const parts = fmt.formatToParts(new Date());
        const find = (t) => {
            const p = parts.find(x => x.type === t);
            return p ? parseInt(p.value, 10) : 0;
        };
        nowH = find("hour");
        nowM = find("minute");
    } catch (e) { }

    for (let i = 0; i < items.length; i++) {
        let it = items[i];
        if (!it.createDate) it.createDate = Calc.toYMD(Calc.getTzToday(s.timezone));
        if (!it.lastRenewDate) it.lastRenewDate = it.createDate;
        if (it.enabled === false) continue;

        let st = calculateStatus(it, s.timezone),
            days = st.daysLeft;
        const msg = it.message ? ` (${t("note", lang)}: ${it.message})` : "";

        const iAutoRenew = it.autoRenew !== false;
        const iRenewDays = typeof it.autoRenewDays === "number" ? it.autoRenewDays : 3;
        const iNotifyDays = typeof it.notifyDays === "number" ? it.notifyDays : 3;

        // ============================================================
        // 逻辑 A: 自动禁用 (Auto Disable)
        // ============================================================
        if (!iAutoRenew && days <= -Math.abs(s.autoDisableDays)) {
            log(t("autoDisable", lang, it.name, Math.abs(days), s.autoDisableDays));
            it.enabled = false;
            items[i] = it;
            dis.push({
                ...it,
                daysLeft: days,
                nextDueDate: st.nextDueDate,
                note: msg,
            });
            changed = true;
            continue;
        }
        // ============================================================
        // 逻辑 B: 自动续期 (Auto Renew)
        // ============================================================
        else if (iAutoRenew && days <= -Math.abs(iRenewDays)) {
            log(t("autoRenew", lang, it.name));

            // 1. 准备操作时间 (使用用户偏好时区)
            // 原逻辑: const opTimeStr = new Date().toISOString().replace('T', ' ').split('.')[0]; (UTC)
            // 新逻辑: 使用 s.timezone 格式化为 YYYY-MM-DD HH:mm:ss
            let opTimeStr;
            try {
                const tz = s.timezone || 'UTC';
                // en-CA 格式化结果通常为 "YYYY-MM-DD, HH:mm:ss"
                const fmt = new Intl.DateTimeFormat('en-CA', {
                    timeZone: tz,
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    hour12: false
                });
                opTimeStr = fmt.format(new Date()).replace(', ', ' ');
            } catch (e) {
                // 如果时区无效，回退到 UTC
                opTimeStr = new Date().toISOString().replace('T', ' ').split('.')[0];
            }

            // 2. 确定“账单起始日” (Start Date) - 与手动逻辑保持一致
            // st.nextDueDate 即为“理论上的当前周期结束日”，也是“下一周期的开始日”
            let startStr = todayStr; // 默认为今天 (Reset模式 或 Cycle已过期模式)

            if (it.type !== 'reset') {
                // Cycle 模式
                // 如果还没有过期 (nextDueDate > today)，则无缝衔接
                // 如果已经过期 (nextDueDate <= today)，则从今天开始 (跳过空白期)
                if (st.nextDueDate > todayStr) {
                    startStr = st.nextDueDate;
                }
            }

            // 3. 计算“账单结束日” (End Date)
            let endStr = startStr;
            const intv = Number(it.intervalDays);
            const unit = it.cycleUnit || 'day';
            const sDate = Calc.parseYMD(startStr);

            if (it.type === 'repeat' && it.repeat && it.repeat.freq) {
                // Repeat 类型特有逻辑: 结合基准日期直接向前推算下一次发生日
                const nextD = resolveRepeatNextDate(it.repeat, startStr, it.createDate, `autoRenew:${it.id || it.name || 'unknown'}`);
                endStr = Calc.toYMD(nextD);
            } else if (it.useLunar) {
                const l = LUNAR_DATA.solar2lunar(sDate.getUTCFullYear(), sDate.getUTCMonth() + 1, sDate.getUTCDate());
                if (l) {
                    const nextL = calcBiz.addPeriod(l, intv, unit);
                    const nextS = calcBiz.l2s(nextL);
                    endStr = `${nextS.year}-${nextS.month.toString().padStart(2, '0')}-${nextS.day.toString().padStart(2, '0')}`;
                }
            } else {
                const d = new Date(sDate);
                if (unit === 'year') d.setUTCFullYear(d.getUTCFullYear() + intv);
                else if (unit === 'month') d.setUTCMonth(d.getUTCMonth() + intv);
                else d.setUTCDate(d.getUTCDate() + intv);
                endStr = Calc.toYMD(d);
            }

            // 4. 更新服务数据
            const oldLastRenew = it.lastRenewDate;
            it.lastRenewDate = todayStr; // “上次续费”更新为操作时间(今天)

            // 5. 写入历史记录 (Renew History)
            const historyItem = {
                renewDate: opTimeStr, // 这里现在是带时区的时间了
                startDate: startStr,
                endDate: endStr,
                price: it.fixedPrice || 0,
                currency: it.currency || 'CNY',
                note: 'Auto Renew'
            };

            if (!Array.isArray(it.renewHistory)) it.renewHistory = [];
            it.renewHistory.unshift(historyItem); // 插入到最前面

            // 6. 记录日志
            upd.push({
                name: it.name,
                old: oldLastRenew,
                new: todayStr,
                note: msg,
                notifyChannelIds: it.notifyChannelIds
            });
            items[i] = it;
            changed = true;
        }
        // ============================================================
        // 逻辑 C: 到期提醒 (Notify)
        // ============================================================
        else if (days <= iNotifyDays) {
            const statusText =
                days === 0
                    ? t("today", lang)
                    : days < 0
                        ? t("overdue", lang, Math.abs(days))
                        : t("left", lang, days);
            log(
                t(
                    "checkLog",
                    lang,
                    it.name,
                    `${statusText} ${t("thres", lang, iNotifyDays)}`
                )
            );

            let shouldPush = true;
            if (isSched) {
                // 定时任务运行时，检查是否到达指定的推送时间 (notifyTimes 数组优先，兼容旧版 notifyTime 字符串)
                const ntArr = Array.isArray(it.notifyTimes) && it.notifyTimes.length > 0
                    ? it.notifyTimes : [it.notifyTime || "08:00"];
                const matched = ntArr.some(nt => {
                    const [tgtH, tgtM] = String(nt).split(":").map(Number);
                    return Math.abs(nowH * 60 + nowM - (tgtH * 60 + tgtM)) <= 5;
                });

                // 只有在设定时间前后 5分钟内才推送
                if (!matched) {
                    shouldPush = false;
                }
            }

            if (shouldPush) {
                trig.push({ ...st, note: msg });
            } else {
                monitor.push({ ...st });
            }
        } else {
            const statusText = days === 0 ? t("today", lang) : t("left", lang, days);
            log(t("checkLog", lang, it.name, statusText));
        }
    }

    // 保存变更
    if (changed) {
        try {
            await DataStore.saveItems(env, items, currentVersion);
            log(`[SYSTEM] Data saved successfully.`);
        } catch (e) {
            if (e.message === "VERSION_CONFLICT") {
                log(`[WARN] Data conflict detected during cron. Skipping save to protect data.`);
                upd = []; dis = []; // 避免发送误导性通知
            } else {
                log(`[ERR] Save failed: ${e.message}`);
            }
        }
    }

    // 推送通知逻辑
    if (s.enableNotify) {
        const title = s.notifyTitle || t("pushTitle", lang);

        const allChannels = s.channels ? s.channels.filter(c => c.enable) : [];
        if (allChannels.length === 0) {
            log(`[PUSH] No enabled channels found.`);
        } else {
            const pushTasks = [];

            // 按渠道分组推送，支持服务级别的渠道选择
            for (const ch of allChannels) {
                // Filter items for this channel
                // Rule: If item.notifyChannelIds is empty -> Send to ALL enabled channels (Default)
                //       If item.notifyChannelIds has values -> Only send if contains current ch.id
                const shouldSendToChannel = (item) => {
                    // Check undefined/null/empty/not-array
                    if (!item.notifyChannelIds || !Array.isArray(item.notifyChannelIds) || item.notifyChannelIds.length === 0) {
                        return true;
                    }
                    return item.notifyChannelIds.includes(ch.id);
                };

                const chDis = dis.filter(shouldSendToChannel);
                const chUpd = upd.filter(shouldSendToChannel);
                const chTrig = trig.filter(shouldSendToChannel);

                // If nothing to send for this channel, skip
                if (chDis.length === 0 && chUpd.length === 0 && chTrig.length === 0) {
                    continue;
                }

                // Build Body for this channel
                let pushBody = [];
                if (chDis.length) {
                    pushBody.push(`【${t("secDis", lang)}】`);
                    chDis.forEach((x, i) =>
                        pushBody.push(`${i + 1}. ${x.name} (${t("overdue", lang, Math.abs(x.daysLeft))} / ${x.nextDueDate})\n${x.note}`)
                    );
                    pushBody.push("");
                }
                if (chUpd.length) {
                    pushBody.push(`【${t("secRen", lang)}】`);
                    chUpd.forEach((x, i) =>
                        pushBody.push(`${i + 1}. ${x.name}: ${x.old} -> ${x.new}\n${x.note}`)
                    );
                    pushBody.push("");
                }
                if (chTrig.length) {
                    pushBody.push(`【${t("secAle", lang)}】`);
                    chTrig.forEach((x, i) => {
                        const dayStr = x.daysLeft === 0 ? t("today", lang) : (x.daysLeft < 0 ? t("overdue", lang, Math.abs(x.daysLeft)) : t("left", lang, x.daysLeft));
                        pushBody.push(`${i + 1}. ${x.name}: ${dayStr} (${x.nextDueDate})\n${x.note}`);
                    });
                }

                const fullBody = pushBody.join("\n").trim();

                // Dispatch to single channel
                pushTasks.push(
                    Notifier.dispatch([ch], title, fullBody)
                        .then(res => `[${ch.name}]: ${res}`)
                );
            }

            if (pushTasks.length > 0) {
                const results = await Promise.all(pushTasks);
                log(`[PUSH] ${results.join(' ')}`);
            }
        }
    }

    const act = [
        upd.length ? "renew" : null,
        dis.length ? "disable" : null,
        trig.length ? "alert" : null,
        monitor.length ? "normal" : null,
    ].filter(Boolean);

    const hasError = logs.some(l => l.includes('[WARN]') || l.includes('[ERR]'));

    if (act.length === 0) act.push("normal");
    if (hasError && !act.includes("alert")) act.push("alert");

    if (act.length > 0) {
        await DataStore.saveLog(env, {
            time: new Date().toISOString(),
            trigger: isSched ? "CRON" : "MANUAL",
            content: logs,
            actions: act,
        });
    }

    return { logs, currentList: items, version: currentVersion };
}
// ==========================================
// 5. Worker Entry & Router
// ==========================================

const app = new Router();
const withAuth = (handler) => async (req, env, url) => {
    if (!(await Auth.verify(req, env))) return error("UNAUTHORIZED", 401);
    return handler(req, env, url);
};

app.get(
    "/",
    () =>
        new Response(HTML, {
            headers: { "content-type": "text/html;charset=UTF-8" },
        })
);
// 修改登录接口，增加限流
app.post("/api/login", async (req, env) => {
    const ip = req.headers.get("cf-connecting-ip") || "unknown"; // Fallback ip

    // 1. 常规限流 (QPS / Daily)
    if (!(await RateLimiter.check(env, ip, "login")))
        return error("RATE_LIMIT_EXCEEDED: Try again later", 429);

    // 2. 防爆破检查 (Ban Check)
    if (!(await RateLimiter.checkBruteForce(env, ip))) {
        return error("IP_BANNED: Too many failed attempts. Try again in 15 min.", 403);
    }

    try {
        const body = await req.json();
        const token = await Auth.login(body.password, env);
        return response({ code: 200, token });
    } catch (e) {
        // 3. 记录失败 (Record Failure)
        await RateLimiter.recordFailure(env, ip);
        return error("AUTH_ERROR", 403);
    }
});
app.get(
    "/api/list",
    withAuth(async (req, env) => {
        const data = await DataStore.getCombined(env);
        delete data.settings.jwtSecret;
        // 传入时区配置
        data.items = data.items.map((i) =>
            calculateStatus(i, data.settings.timezone)
        );
        return response({ code: 200, data });
    })
);
app.post(
    "/api/check",
    withAuth(async (req, env) => {
        const body = await req.json().catch(() => ({}));
        const res = await checkAndRenew(env, false, body.lang);
        const settings = await DataStore.getSettings(env);
        // 重新计算状态
        const displayList = res.currentList.map((i) =>
            calculateStatus(i, settings.timezone)
        );

        // 【修改】如果 checkAndRenew 内部保存成功，版本号应该变了，但我们这里为了简单，
        // 可以让前端在 check 后自动刷新一次列表，或者这里返回新的 version（如果能获取到）。
        // 最稳妥的方式是让前端 check 完后重新 fetchList。
        return response({
            code: 200,
            logs: res.logs,
            data: displayList,
        });
    })
);
app.get(
    "/api/logs",
    withAuth(async (req, env) => {
        return response({ code: 200, data: await DataStore.getLogs(env) });
    })
);

app.get(
    "/api/rates",
    withAuth(async (req, env) => {
        const url = new URL(req.url);
        const base = url.searchParams.get("base") || "CNY";
        const cacheKey = "RATES_" + base;

        // 1. Try KV Cache
        const cached = await env.RENEW_KV.get(cacheKey, { type: "json" });
        if (cached && cached.ts && (Date.now() - cached.ts < 86400000)) { // 24h
            return response(cached.data);
        }

        // 2. Fetch Upstream
        try {
            const res = await fetch(EXCHANGE_RATE_API_URL + base);
            if (!res.ok) throw new Error("Upstream API Error");
            const data = await res.json();

            // 3. Cache Result
            await env.RENEW_KV.put(cacheKey, JSON.stringify({ ts: Date.now(), data }), { expirationTtl: 86400 });

            return response(data);
        } catch (e) {
            return error("RATE_FETCH_FAILED", 502);
        }
    })
);
app.post(
    "/api/logs/clear",
    withAuth(async (req, env) => {
        await env.RENEW_KV.delete(DataStore.KEYS.LOGS);
        return response({ code: 200, msg: "CLEARED" });
    })
);

app.post(
    "/api/save",
    withAuth(async (req, env) => {
        const body = await req.json();

        // 1. 先获取新的设置（为了拿到最新的时区 timezone）
        const currentSettings = await DataStore.getSettings(env);
        const newSettings = {
            ...currentSettings,
            ...body.settings,
            jwtSecret: currentSettings.jwtSecret,
        };

        // Validate Backup Key
        if (newSettings.backupKey && newSettings.backupKey.trim()) {
            const key = newSettings.backupKey.trim();
            if (key.length < 8 || !/^(?=.*[a-zA-Z])(?=.*\d).+$/.test(key)) {
                return error("INVALID_BACKUP_KEY: Min 8 chars, Alphanumeric", 400);
            }
        }

        // 2. 处理 items 数据清洗 + 【关键修复】强制重新计算状态
        const items = body.items.map((i) => {
            // 基础数据清洗
            const cleanItem = {
                ...i,
                id: i.id || Date.now().toString(),
                intervalDays: Number(i.intervalDays),
                enabled: i.enabled !== false,
                tags: Array.isArray(i.tags) ? i.tags : [],
                useLunar: !!i.useLunar,
                notifyDays: i.notifyDays !== null ? Number(i.notifyDays) : null,
                notifyTime: typeof i.notifyTime === 'string' ? i.notifyTime : (Array.isArray(i.notifyTime) ? (i.notifyTime[0] || "08:00") : "08:00"),
                notifyTimes: Array.isArray(i.notifyTimes) && i.notifyTimes.length > 0 ? i.notifyTimes : (typeof i.notifyTime === 'string' ? [i.notifyTime || "08:00"] : ["08:00"]),
                autoRenew: i.autoRenew !== false,
                autoRenewDays: i.autoRenewDays !== null ? Number(i.autoRenewDays) : null,
                fixedPrice: Number(i.fixedPrice) || 0,
                currency: i.currency || 'CNY',
                notifyChannelIds: Array.isArray(i.notifyChannelIds) ? i.notifyChannelIds : [],
                renewHistory: Array.isArray(i.renewHistory) ? i.renewHistory : [],
                renewUrl: typeof i.renewUrl === 'string' ? i.renewUrl.trim() : '',
            };

            if (cleanItem.renewUrl) {
                const safeUrl = cleanItem.renewUrl.trim();
                if (!/^https?:\/\/.+/i.test(safeUrl)) {
                    throw new Error("INVALID_RENEW_URL: Only http/https links are allowed");
                }
                cleanItem.renewUrl = safeUrl;
            }

            // 【核心修复】在保存前，使用后端逻辑重新计算 nextDueDate 等字段
            // 确保存入 KV/数据库 的数据永远是基于当前历史记录计算出的最新状态
            return calculateStatus(cleanItem, newSettings.timezone);
        });

        try {
            // 获取前端传来的 version，进行乐观锁保存
            const clientVersion =
                body.version !== undefined ? Number(body.version) : null;

            const newVersion = await DataStore.saveItems(env, items, clientVersion);
            await DataStore.saveSettings(env, newSettings);

            // 返回新版本号给前端
            return response({ code: 200, msg: "SAVED", version: newVersion });
        } catch (e) {
            if (e.message === "VERSION_CONFLICT") {
                return error("DATA_CHANGED_RELOAD_REQUIRED", 409);
            }
            if (typeof e.message === "string" && e.message.startsWith("INVALID_RENEW_URL")) {
                return error(e.message, 400);
            }
            throw e;
        }
    })
);

app.get(
    "/api/export",
    withAuth(async (req, env) => {
        const data = await DataStore.getCombined(env);
        delete data.settings.jwtSecret;
        const exportData = {
            meta: { version: APP_VERSION, exportedAt: new Date().toISOString() },
            ...data,
        };
        return new Response(JSON.stringify(exportData, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="RenewHelper_Backup_${new Date().toISOString().split("T")[0]
                    }.json"`,
            },
        });
    })
);
app.get(
    "/api/backup",
    async (req, env) => { // Removed withAuth wrapper for custom logic
        const ip = req.headers.get("cf-connecting-ip") || "unknown";

        // 1. 常规限流 (QPS check)
        if (!(await RateLimiter.check(env, ip, "backup"))) {
            return error("RATE_LIMIT_EXCEEDED", 429);
        }

        // 2. 防爆破检查
        if (!(await RateLimiter.checkBruteForce(env, ip))) {
            return error("IP_BANNED: Too many failed attempts. Try again in 15 min.", 403);
        }

        const settings = await DataStore.getSettings(env);
        let authed = false;

        // 3. Try JWT Auth
        if (await Auth.verify(req, env)) authed = true;

        // 4. Try Backup Key Auth (Header)
        if (!authed && settings.backupKey) {
            const key = req.headers.get("X-Backup-Key");
            // 【修复】使用恒定时间比较防止时序攻击
            if (key && (await Auth.safeCompare(key, settings.backupKey))) authed = true;
        }

        if (!authed) {
            // 5. 记录失败 (Record Failure)
            // 只有当提供了 Key 且错误，或者没提供 Key 时才算失败?
            // 严格模式：只要鉴权失败就算一次尝试。
            await RateLimiter.recordFailure(env, ip);
            return error("UNAUTHORIZED", 401);
        }

        const data = await DataStore.getCombined(env);
        delete data.settings.jwtSecret;
        delete data.settings.backupKey; // Security: Do not export the backup key itself

        const exportData = {
            meta: { version: APP_VERSION, exportedAt: new Date().toISOString() },
            ...data,
        };
        return new Response(JSON.stringify(exportData, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="RenewHelper_Backup_${new Date().toISOString().split("T")[0]
                    }.json"`,
            },
        });
    }
);
app.post(
    "/api/import",
    withAuth(async (req, env) => {
        try {
            const body = await req.json();
            if (!Array.isArray(body.items) || !body.settings)
                throw new Error("INVALID_FILE_FORMAT");
            await DataStore.saveItems(env, body.items);
            const currentSettings = await DataStore.getSettings(env);
            const newSettings = {
                ...currentSettings,
                ...body.settings,
                jwtSecret: currentSettings.jwtSecret,
            };
            await DataStore.saveSettings(env, newSettings);
            return response({ code: 200, msg: "IMPORTED" });
        } catch (e) {
            return error("IMPORT_FAILED: " + e.message, 400);
        }
    })
);

// 修改测试通知接口，增加限流
app.post(
    "/api/test-notify",
    withAuth(async (req, env) => {
        const ip = req.headers.get("cf-connecting-ip");
        if (!(await RateLimiter.check(env, ip, "test_notify")))
            return error("RATE_LIMIT_EXCEEDED: Max 100/day, 1/sec", 429);

        try {
            const body = await req.json();
            const { channelObj } = body;
            if (!Notifier.adapters[channelObj.type]) return error("INVALID_CHANNEL_TYPE");

            // Force enable for testing purposes
            channelObj.enable = true;

            const res = await Notifier.dispatch(
                [channelObj],
                "RenewHelper Test",
                `Test message for channel: ${channelObj.name}`
            );

            // Check for failure keywords in result
            if (res.includes("FAIL") || res.includes("ERR") || res.includes("MISSING") || res.includes("NO_")) {
                return error(res, 400);
            }

            return response({ code: 200, msg: res });
        } catch (e) {
            return error("TEST_ERROR: " + e.message);
        }
    })
);

// ICS Calendar Subscription (UUID Auth + I18N + Custom Layout + Outlook Fix + Same Day Alert)
app.get("/api/calendar.ics", async (req, env, url) => {
    const token = url.searchParams.get("token");
    const settings = await DataStore.getSettings(env);
    const calendarSubscriptions = Array.isArray(settings.calendarSubscriptions)
        ? settings.calendarSubscriptions
        : [];
    const subscription = token
        ? calendarSubscriptions.find((sub) => sub.token === token)
        : null;
    if (!token || !subscription)
        return new Response("Unauthorized: Invalid Calendar Token", {
            status: 401,
        });

    const selectedItemIds =
        Array.isArray(subscription.itemIds) && subscription.itemIds.length > 0
            ? new Set(subscription.itemIds.map((id) => String(id)))
            : null;
    const items = (await DataStore.getItems(env)).filter((item) => {
        if (!item.enabled) return false;
        if (!selectedItemIds) return true;
        return selectedItemIds.has(String(item.id));
    });
    const lang = settings.language === "en" ? "en" : "zh";

    const T = {
        zh: {
            lblCycle: "提醒周期",
            lblLast: "上次续费",
            note: "备注",
            unit: { day: "天", month: "月", year: "年" },
        },
        en: {
            lblCycle: "Cycle",
            lblLast: "Last Renew",
            note: "Note",
            unit: { day: " Days", month: " Months", year: " Years" },
        },
    }[lang];

    const userTz = settings.timezone || "UTC";

    // ICS 文本转义函数
    const formatIcsText = (str) => {
        if (!str) return "";
        return (
            String(str)
                // 1. 如果有 HTML 标签，先去除 (可选，视你的数据源而定)
                // .replace(/<[^>]+>/g, '')
                // 2. 转义 ICS 特殊字符 (反斜杠必须最先转义)
                .replace(/\\/g, "\\\\")
                .replace(/;/g, "\\;")
                .replace(/,/g, "\\,")
                // 3. 处理换行符：将实际换行转换为 ICS 认可的 \n 字符串
                .replace(/\r\n/g, "\\n")
                .replace(/\n/g, "\\n")
                .replace(/\r/g, "\\n")
        );
    };

    const parts = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//RenewHelper//Calendar//EN",
        "METHOD:PUBLISH",
        `X-WR-CALNAME:${formatIcsText(subscription.name || "RenewHelper")}`,
        "REFRESH-INTERVAL;VALUE=DURATION:P1D",
        "CALSCALE:GREGORIAN",
        `X-WR-TIMEZONE:${userTz}`,
    ];
    const dtStamp =
        new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    items.forEach((item) => {
        // 计算基于用户时区的日期
        const st = calculateStatus(item, settings.timezone);
        const dueStr = st.nextDueDate.replace(/-/g, ""); // Start: YYYYMMDD

        // 计算结束时间 (DTSTART + 1天) 以符合全天事件规范
        const startDateObj = Calc.parseYMD(st.nextDueDate);
        const endDateObj = new Date(startDateObj);
        endDateObj.setUTCDate(endDateObj.getUTCDate() + 1);
        const endStr = Calc.toYMD(endDateObj).replace(/-/g, "");

        parts.push("BEGIN:VEVENT");
        const uidPrefix =
            subscription.id && subscription.id !== DEFAULT_CALENDAR_SUBSCRIPTION_ID
                ? `${subscription.id}:`
                : "";
        parts.push(`UID:${uidPrefix}${item.id}@renewhelper`);
        parts.push(`DTSTAMP:${dtStamp}`);
        parts.push(`DTSTART;VALUE=DATE:${dueStr}`);
        parts.push(`DTEND;VALUE=DATE:${endStr}`);
        parts.push(`SUMMARY:${formatIcsText(item.name)}`);
        parts.push("STATUS:CONFIRMED");
        parts.push("TRANSP:TRANSPARENT");

        // 构建描述时，对动态内容应用转义
        let descParts = [];
        if (item.type === 'repeat' && item.repeat) {
            // repeat 模式：生成规则文字描述
            const r = item.repeat;
            const isZh = lang === 'zh';
            const freqMap = isZh
                ? { daily: '天', weekly: '周', monthly: '个月', yearly: '年' }
                : { daily: 'day(s)', weekly: 'week(s)', monthly: 'month(s)', yearly: 'year(s)' };
            const wdMap = isZh
                ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
                : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            let desc = isZh
                ? `每 ${r.interval} ${freqMap[r.freq] || r.freq}`
                : `Every ${r.interval} ${freqMap[r.freq] || r.freq}`;
            if (r.bymonth && r.bymonth.length > 0) {
                const ms = r.bymonth.map(m => isZh ? m + '月' : monthAbbr[m - 1]).join(', ');
                desc += isZh ? ` ${ms}` : ` in ${ms}`;
            }
            if (r.bymonthday && r.bymonthday.length > 0) {
                const ds = r.bymonthday.join(', ');
                desc += isZh ? ` ${ds}日` : ` on day ${ds}`;
            }
            if (r.byweekday && r.byweekday.length > 0) {
                const ws = r.byweekday.map(w => wdMap[w]).join(', ');
                desc += isZh ? ` ${ws}` : ` on ${ws}`;
            }
            descParts.push(`${isZh ? '重复规则' : 'Rule'}: ${desc}`);
        } else {
            const unitLabel = T.unit[item.cycleUnit] || item.cycleUnit;
            descParts.push(`${T.lblCycle}: ${item.intervalDays}${unitLabel}`);
        }
        descParts.push(`${T.lblLast}: ${item.lastRenewDate}`);
        if (item.message) {
            descParts.push(`${T.note}: ${formatIcsText(item.message)}`);
        }

        // 使用 \n 连接各行，并作为 DESCRIPTION 的值
        parts.push(`DESCRIPTION:${descParts.join("\\n")}`);

        // 使用 notifyTime 在当天提醒（取第一个时间）
        const firstNT = Array.isArray(item.notifyTimes) && item.notifyTimes.length > 0
            ? item.notifyTimes[0] : (item.notifyTime || "08:00");
        const [nH, nM] = String(firstNT).split(":").map(Number);

        // 构造 ISO8601 持续时间字符串 (PTnHnM)
        // 全天事件从 00:00 开始，PT8H 即代表当天 08:00
        let triggerStr = "PT";
        if (nH > 0) triggerStr += `${nH}H`;
        if (nM > 0) triggerStr += `${nM}M`;
        if (triggerStr === "PT") triggerStr = "PT0M"; // 防止 00:00 时为空

        parts.push("BEGIN:VALARM");
        parts.push(`TRIGGER:${triggerStr}`);
        parts.push("ACTION:DISPLAY");
        parts.push(`DESCRIPTION:${formatIcsText(item.name)}`);
        parts.push("END:VALARM");

        parts.push("END:VEVENT");
    });
    parts.push("END:VCALENDAR");

    return new Response(parts.join("\r\n"), {
        headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'inline; filename="renewhelper.ics"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
    });
});

// ==========================================
// Domain Provider API Configuration
// ==========================================
const DOMAIN_PROVIDERS_KV_KEY = 'domain_providers_config';
const DIGITALPLAT_API_BASES = [
    'https://domain-api.digitalplat.org/api/v1',
    'https://dash.domain.digitalplat.org/api/v1'
];

function getDnsheHeaders(providerConfig) {
    return {
        'X-API-Key': providerConfig.apiKey,
        'X-API-Secret': providerConfig.apiSecret,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}

function getDigitalPlatHeaderVariants(providerConfig) {
    const apiKey = providerConfig.apiKey || '';
    const apiSecret = providerConfig.apiSecret || '';
    const commonHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    };
    const variants = [];

    const pushVariant = (label, extraHeaders) => {
        variants.push({ label, headers: { ...commonHeaders, ...extraHeaders } });
    };

    if (apiSecret) {
        pushVariant('bearer-secret', {
            'Authorization': 'Bearer ' + apiSecret,
            'X-API-Secret': apiSecret
        });
        pushVariant('token-secret', {
            'Authorization': 'Token ' + apiSecret,
            'X-API-Secret': apiSecret
        });
        pushVariant('x-api-token-secret', {
            'X-API-Token': apiSecret,
            'X-API-Secret': apiSecret
        });
        pushVariant('secret-only-header', {
            'X-API-Secret': apiSecret,
            'API-SECRET': apiSecret
        });
    }

    if (apiKey && apiSecret) {
        pushVariant('key-secret-headers', {
            'X-API-Key': apiKey,
            'X-API-Secret': apiSecret,
            'API-KEY': apiKey,
            'API-SECRET': apiSecret
        });
        pushVariant('bearer-key-with-secret', {
            'Authorization': 'Bearer ' + apiKey,
            'X-API-Key': apiKey,
            'X-API-Secret': apiSecret
        });
        pushVariant('apikey-auth-with-secret', {
            'Authorization': 'ApiKey ' + apiKey,
            'X-API-Key': apiKey,
            'X-API-Secret': apiSecret
        });
    } else if (apiKey) {
        pushVariant('bearer-key', {
            'Authorization': 'Bearer ' + apiKey,
            'X-API-Key': apiKey
        });
        pushVariant('x-api-key-only', {
            'X-API-Key': apiKey,
            'API-KEY': apiKey
        });
    }

    return variants;
}

async function safeReadJson(resp) {
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    try {
        return await resp.json();
    } catch {
        return null;
    }
}

async function describeProviderHttpError(provider, resp) {
    const data = await safeReadJson(resp.clone());
    const message = data?.message || data?.error || data?.msg;
    if (message) return `${provider} API error: ${resp.status} ${message}`;

    if (resp.headers.get('cf-mitigated')) {
        return `${provider} API error: ${resp.status} Cloudflare challenge blocked the request`;
    }

    const text = (await resp.text()).replace(/\s+/g, ' ').trim();
    if (!text) return `${provider} API error: ${resp.status}`;
    if (text.startsWith('<!DOCTYPE html') || text.startsWith('<html')) {
        return `${provider} API error: ${resp.status} Unexpected HTML response`;
    }
    return `${provider} API error: ${resp.status} ${text.slice(0, 200)}`;
}

async function fetchDnsheDomains(providerConfig) {
    const perPage = 500;
    const domains = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const resp = await fetch(`https://api005.dnshe.com/index.php?m=domain_hub&endpoint=subdomains&action=list&page=${page}&per_page=${perPage}`, {
            headers: getDnsheHeaders(providerConfig)
        });
        const data = await safeReadJson(resp.clone());

        if (!resp.ok) {
            throw new Error(data?.message || await describeProviderHttpError('DNSHE', resp));
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

async function fetchDigitalPlatDomains(providerConfig, perPage = 100) {
    const failures = [];
    const headerVariants = getDigitalPlatHeaderVariants(providerConfig);

    if (!headerVariants.length) {
        throw new Error('DigitalPlat API not configured');
    }

    for (const baseUrl of DIGITALPLAT_API_BASES) {
        for (const variant of headerVariants) {
            const resp = await fetch(`${baseUrl}/domains?per_page=${perPage}`, {
                headers: variant.headers
            });
            const data = await safeReadJson(resp.clone());

            if (!resp.ok) {
                failures.push(`[${variant.label}] ${await describeProviderHttpError('DigitalPlat', resp)}`);
                continue;
            }
            if (data?.success === false) {
                failures.push(`[${variant.label}] DigitalPlat API error: ` + (data.message || data.error || 'Unknown'));
                continue;
            }

            const domainList = Array.isArray(data)
                ? data
                : data?.domains || data?.data || data?.result || data?.items || [];

            if (!Array.isArray(domainList)) {
                failures.push(`[${variant.label}] DigitalPlat API error: unexpected response format from ${baseUrl}`);
                continue;
            }

            return domainList.map((d) => ({
                name: d.name || d.domain,
                id: d.id,
                created_on: d.created_at || d.registration_date,
                expires_on: d.expires_at || d.expiration_date || null
            })).filter((d) => d.name);
        }
    }

    throw new Error(failures.join(' | ') || 'DigitalPlat API request failed');
}

// Helper: Check if DNSHE has any configured accounts
function hasDnsheAccounts(config) {
    if (!Array.isArray(config.dnshe)) return false;
    return config.dnshe.some(acc => acc.enabled && acc.apiKey && acc.apiSecret);
}

// Helper: Get all enabled DNSHE accounts
function getEnabledDnsheAccounts(config) {
    if (!Array.isArray(config.dnshe)) return [];
    return config.dnshe.filter(acc => acc.enabled && acc.apiKey && acc.apiSecret);
}

function getEnvProviderConfig(env) {
    return {
        cloudflare: { enabled: !!(env.CF_DOMAIN_API_KEY && env.CF_DOMAIN_EMAIL), apiKey: env.CF_DOMAIN_API_KEY || '', email: env.CF_DOMAIN_EMAIL || '', apiType: env.CF_DOMAIN_API_TYPE || 'global' },
        porkbun: { enabled: !!(env.PORKBUN_API_KEY && env.PORKBUN_API_SECRET), apiKey: env.PORKBUN_API_KEY || '', apiSecret: env.PORKBUN_API_SECRET || '' },
        dnshe: [
            {
                id: 'default',
                name: 'Default',
                enabled: !!(env.DNSHE_API_KEY && env.DNSHE_API_SECRET),
                apiKey: env.DNSHE_API_KEY || '',
                apiSecret: env.DNSHE_API_SECRET || ''
            }
        ],
        digitalplat: { enabled: !!(env.DIGITALPLAT_API_SECRET || env.DIGITALPLAT_API_KEY), apiKey: env.DIGITALPLAT_API_KEY || '', apiSecret: env.DIGITALPLAT_API_SECRET || '' }
    };
}

async function getProviderConfig(env) {
    const envConfig = getEnvProviderConfig(env);
    const kvConfig = await env.RENEW_KV.get(DOMAIN_PROVIDERS_KV_KEY, { type: 'json' });
    if (!kvConfig) return envConfig;

    const merged = { ...envConfig };
    for (const provider of Object.keys(merged)) {
        if (provider === 'dnshe') {
            // DNSHE is an array - handle specially
            if (Array.isArray(kvConfig.dnshe)) {
                merged.dnshe = kvConfig.dnshe;
            } else if (kvConfig.dnshe && typeof kvConfig.dnshe === 'object') {
                // Migrate old single object format to array
                merged.dnshe = kvConfig.dnshe.apiKey ? [kvConfig.dnshe] : [];
            }
            // else keep envConfig default
        } else {
            const kvProvider = kvConfig[provider] || {};
            merged[provider] = {
                ...merged[provider],
                ...kvProvider,
                apiKey: kvProvider.apiKey || merged[provider].apiKey || '',
                apiSecret: kvProvider.apiSecret || merged[provider].apiSecret || '',
                email: kvProvider.email || merged[provider].email || '',
                apiType: kvProvider.apiType || merged[provider].apiType || 'global'
            };
        }
    }
    return merged;
}

// Get provider status
app.get("/api/domain-providers", async (req, env) => {
    const config = await getProviderConfig(env);
    return response({
        code: 200, data: {
            cloudflare: { configured: !!(config.cloudflare.enabled && config.cloudflare.apiKey && config.cloudflare.email), type: config.cloudflare.apiType || 'global' },
            porkbun: { configured: !!(config.porkbun.enabled && config.porkbun.apiKey && config.porkbun.apiSecret) },
            dnshe: {
                configured: hasDnsheAccounts(config),
                accounts: (config.dnshe || []).map(acc => ({
                    id: acc.id,
                    name: acc.name,
                    configured: !!(acc.enabled && acc.apiKey && acc.apiSecret)
                }))
            },
            digitalplat: { configured: !!(config.digitalplat.enabled && (config.digitalplat.apiSecret || config.digitalplat.apiKey)) }
        }
    });
});

// Get provider config (masked)
app.get("/api/domain-providers/config", async (req, env) => {
    const config = await getProviderConfig(env);
    const masked = {};
    for (const [provider, settings] of Object.entries(config)) {
        masked[provider] = { ...settings };
        if (masked[provider].apiKey) masked[provider].apiKey = masked[provider].apiKey.slice(0, 8) + '***';
        if (masked[provider].apiSecret) masked[provider].apiSecret = masked[provider].apiSecret.slice(0, 8) + '***';
    }
    return response({ code: 200, data: masked });
});

// Save provider config
app.post("/api/domain-providers/config", async (req, env) => {
    try {
        const newConfig = await req.json();
        const currentConfig = await getProviderConfig(env);
        const mergedConfig = { ...currentConfig };
        
        for (const [provider, settings] of Object.entries(newConfig)) {
            if (provider === 'dnshe') {
                // DNSHE is handled separately via account endpoints
                continue;
            }
            if (mergedConfig[provider]) {
                if (settings.apiKey !== undefined && settings.apiKey !== '' && !settings.apiKey.endsWith('***')) {
                    mergedConfig[provider].apiKey = settings.apiKey;
                }
                if (settings.apiSecret !== undefined && settings.apiSecret !== '' && !settings.apiSecret.endsWith('***')) {
                    mergedConfig[provider].apiSecret = settings.apiSecret;
                }
                if (settings.email !== undefined) mergedConfig[provider].email = settings.email;
                if (settings.apiType !== undefined) mergedConfig[provider].apiType = settings.apiType;
                if (settings.enabled !== undefined) mergedConfig[provider].enabled = settings.enabled;
            }
        }
        
        await env.RENEW_KV.put(DOMAIN_PROVIDERS_KV_KEY, JSON.stringify(mergedConfig));
        return response({ code: 200, msg: 'CONFIG_SAVED' });
    } catch (err) {
        return error('SAVE_FAILED: ' + err.message, 500);
    }
});

// DNSHE Account Management Endpoints
app.post("/api/dnshe/accounts", async (req, env) => {
    try {
        const account = await req.json();
        const config = await getProviderConfig(env);
        
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
        await env.RENEW_KV.put(DOMAIN_PROVIDERS_KV_KEY, JSON.stringify(config));
        
        return response({ code: 200, data: newAccount });
    } catch (err) {
        return error('ADD_FAILED: ' + err.message, 500);
    }
});

app.put("/api/dnshe/accounts/:id", async (req, env) => {
    try {
        const url = new URL(req.url);
        const accountId = url.pathname.split('/').pop();
        const updates = await req.json();
        const config = await getProviderConfig(env);
        
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
        
        await env.RENEW_KV.put(DOMAIN_PROVIDERS_KV_KEY, JSON.stringify(config));
        return response({ code: 200, data: account });
    } catch (err) {
        return error('UPDATE_FAILED: ' + err.message, 500);
    }
});

app.delete("/api/dnshe/accounts/:id", async (req, env) => {
    try {
        const url = new URL(req.url);
        const accountId = url.pathname.split('/').pop();
        const config = await getProviderConfig(env);
        
        if (!Array.isArray(config.dnshe)) {
            throw new Error('No DNSHE accounts configured');
        }
        
        const index = config.dnshe.findIndex(acc => acc.id === accountId);
        if (index === -1) {
            throw new Error('DNSHE account not found: ' + accountId);
        }
        
        config.dnshe.splice(index, 1);
        await env.RENEW_KV.put(DOMAIN_PROVIDERS_KV_KEY, JSON.stringify(config));
        
        return response({ code: 200, data: { success: true, deleted: accountId } });
    } catch (err) {
        return error('DELETE_FAILED: ' + err.message, 500);
    }
});

// Sync domains from provider
async function syncDomainsFromProvider(env, provider) {
    const config = await getProviderConfig(env);
    const providerConfig = config[provider];
    
    if (!providerConfig || !providerConfig.enabled) {
        throw new Error(provider + ' API not configured');
    }
    
    let domains = [];
    
    if (provider === 'cloudflare') {
        const headers = providerConfig.apiType === 'token'
            ? { 'Authorization': 'Bearer ' + providerConfig.apiKey, 'Content-Type': 'application/json' }
            : { 'X-Auth-Email': providerConfig.email, 'X-Auth-Key': providerConfig.apiKey, 'Content-Type': 'application/json' };
        const resp = await fetch('https://api.cloudflare.com/client/v4/zones?page=1&per_page=50', { headers });
        if (!resp.ok) throw new Error('Cloudflare API error: ' + resp.status);
        const data = await resp.json();
        if (!data.success) throw new Error('Cloudflare API error: ' + JSON.stringify(data.errors));
        domains = data.result.map(z => ({ name: z.name, id: z.id, created_on: z.created_on, expires_on: null }));
    } else if (provider === 'porkbun') {
        const resp = await fetch('https://api.porkbun.com/api/json/v3/domain/listAll', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apikey: providerConfig.apiKey, secret: providerConfig.apiSecret })
        });
        if (!resp.ok) throw new Error('Porkbun API error: ' + resp.status);
        const data = await resp.json();
        if (data.status !== 'SUCCESS') throw new Error('Porkbun API error: ' + data.message);
        domains = Object.entries(data.domains || {}).map(([domain, info]) => ({ name: domain, expires: null }));
    } else if (provider === 'dnshe') {
        // Handle multiple DNSHE accounts
        const enabledAccounts = getEnabledDnsheAccounts(config);
        if (enabledAccounts.length === 0) {
            throw new Error('DNSHE API not configured. Please add at least one DNSHE account.');
        }
        
        for (const account of enabledAccounts) {
            try {
                console.log(`[DNSHE] Syncing from account: ${account.name || account.id}`);
                const accountDomains = await fetchDnsheDomains(account);
                // Add account info to each domain
                domains.push(...accountDomains.map(d => ({
                    ...d,
                    accountId: account.id,
                    accountName: account.name
                })));
            } catch (err) {
                console.error(`[DNSHE] Failed to sync from account ${account.name || account.id}:`, err.message);
                // Continue with other accounts
            }
        }
    } else if (provider === 'digitalplat') {
        domains = await fetchDigitalPlatDomains(providerConfig);
    }
    
    // Import domains
    const currentPkg = await DataStore.getItemsPackage(env);
    const items = currentPkg.items || [];
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
        await DataStore.saveItems(env, [...items, ...imported], null, true);
    }
    return { synced: imported.length, skipped: skipped.length };
}

async function syncSingleProvider(env, provider) {
    try {
        const result = await syncDomainsFromProvider(env, provider);
        return response({ code: 200, data: result });
    } catch (err) {
        return error('SYNC_FAILED: ' + err.message, 500);
    }
}

app.post("/api/sync-domains/cloudflare", async (req, env) => {
    return await syncSingleProvider(env, 'cloudflare');
});

app.post("/api/sync-domains/porkbun", async (req, env) => {
    return await syncSingleProvider(env, 'porkbun');
});

app.post("/api/sync-domains/dnshe", async (req, env) => {
    try {
        let body = {};
        try { body = await req.json(); } catch (e) {}
        
        const accountId = body.accountId;
        const config = await getProviderConfig(env);
        
        let domains = [];
        
        if (accountId) {
            // Sync from specific account
            const account = (config.dnshe || []).find(acc => acc.id === accountId);
            if (!account || !account.enabled || !account.apiKey || !account.apiSecret) {
                throw new Error('DNSHE account not found or not configured: ' + accountId);
            }
            domains = await fetchDnsheDomains(account);
            domains = domains.map(d => ({ ...d, accountId: account.id, accountName: account.name }));
        } else {
            // Sync from all enabled accounts
            const enabledAccounts = getEnabledDnsheAccounts(config);
            if (enabledAccounts.length === 0) {
                throw new Error('DNSHE API not configured. Please add at least one DNSHE account.');
            }
            
            for (const account of enabledAccounts) {
                try {
                    const accountDomains = await fetchDnsheDomains(account);
                    domains.push(...accountDomains.map(d => ({ ...d, accountId: account.id, accountName: account.name })));
                } catch (err) {
                    console.error(`[DNSHE] Failed to sync from account ${account.name || account.id}:`, err.message);
                }
            }
        }
        
        // Import domains
        const currentPkg = await DataStore.getItemsPackage(env);
        const items = currentPkg.items || [];
        const existing = new Set(items.filter(i => i.tags?.includes('Domain')).map(i => i.name.toLowerCase()));
        const imported = [], skipped = [];
        
        for (const domain of domains) {
            if (existing.has(domain.name.toLowerCase())) {
                skipped.push({ name: domain.name, status: 'skipped' });
                continue;
            }
            imported.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: domain.name, tags: ['Domain', 'dnshe'], type: 'reset', enabled: true,
                createDate: new Date().toISOString().split('T')[0],
                lastRenewDate: new Date().toISOString().split('T')[0],
                intervalDays: 365, cycleUnit: 'year', notifyDays: 30, notifyTime: '09:00',
                autoRenew: false, message: 'Provider: DNSHE' + (domain.accountName ? ' (' + domain.accountName + ')' : ''), fixedPrice: 0, currency: 'USD',
                notifyTimes: ['09:00'], notifyChannelIds: [], renewHistory: [], renewUrl: ''
            });
            existing.add(domain.name.toLowerCase());
        }
        
        if (imported.length > 0) {
            await DataStore.saveItems(env, [...items, ...imported], null, true);
        }
        
        return response({ code: 200, data: { synced: imported.length, skipped: skipped.length } });
    } catch (err) {
        return error('SYNC_FAILED: ' + err.message, 500);
    }
});

app.post("/api/sync-domains/digitalplat", async (req, env) => {
    return await syncSingleProvider(env, 'digitalplat');
});

app.post("/api/sync-domains/all", async (req, env) => {
    try {
        const results = { cloudflare: null, porkbun: null, dnshe: null, digitalplat: null, total: 0 };
        const config = await getProviderConfig(env);
        
        // Sync Cloudflare
        if (config.cloudflare?.enabled) {
            try {
                results.cloudflare = await syncDomainsFromProvider(env, 'cloudflare');
                results.total += results.cloudflare.synced;
            } catch (err) {
                results.cloudflare = { error: err.message };
            }
        }
        
        // Sync Porkbun
        if (config.porkbun?.enabled) {
            try {
                results.porkbun = await syncDomainsFromProvider(env, 'porkbun');
                results.total += results.porkbun.synced;
            } catch (err) {
                results.porkbun = { error: err.message };
            }
        }
        
        // Sync DNSHE (multiple accounts)
        if (hasDnsheAccounts(config)) {
            try {
                results.dnshe = await syncDomainsFromProvider(env, 'dnshe');
                results.total += results.dnshe.synced;
                // Add account details
                results.dnshe.accounts = config.dnshe.map(acc => ({
                    id: acc.id,
                    name: acc.name,
                    configured: !!(acc.enabled && acc.apiKey && acc.apiSecret)
                }));
            } catch (err) {
                results.dnshe = { error: err.message };
            }
        }
        
        // Sync DigitalPlat
        if (config.digitalplat?.enabled) {
            try {
                results.digitalplat = await syncDomainsFromProvider(env, 'digitalplat');
                results.total += results.digitalplat.synced;
            } catch (err) {
                results.digitalplat = { error: err.message };
            }
        }
        
        return response({ code: 200, data: results });
    } catch (err) {
        return error('SYNC_FAILED: ' + err.message, 500);
    }
});

// Test provider connection
app.post("/api/domain-providers/test", async (req, env) => {
    try {
        const { provider, accountId } = await req.json();
        const config = await getProviderConfig(env);
        
        // Handle DNSHE multi-account testing
        if (provider === 'dnshe') {
            if (accountId) {
                // Test specific account
                const account = (config.dnshe || []).find(acc => acc.id === accountId);
                if (!account || !account.enabled) {
                    return error('ACCOUNT_NOT_FOUND', 400);
                }
                
                try {
                    const resp = await fetch('https://api005.dnshe.com/index.php?m=domain_hub&endpoint=subdomains&action=list&per_page=1', {
                        headers: getDnsheHeaders(account)
                    });
                    const data = await safeReadJson(resp.clone());
                    const success = resp.ok && data?.success !== false;
                    return response({ code: 200, data: { success, message: success ? `Account ${account.name} connected` : (data?.message || 'API key invalid') } });
                } catch (err) {
                    return response({ code: 200, data: { success: false, message: err.message } });
                }
            } else {
                // Test all accounts
                const results = [];
                for (const account of (config.dnshe || [])) {
                    if (!account.enabled || !account.apiKey || !account.apiSecret) continue;
                    
                    try {
                        const resp = await fetch('https://api005.dnshe.com/index.php?m=domain_hub&endpoint=subdomains&action=list&per_page=1', {
                            headers: getDnsheHeaders(account)
                        });
                        const data = await safeReadJson(resp.clone());
                        results.push({
                            id: account.id,
                            name: account.name,
                            success: resp.ok && data?.success !== false,
                            message: resp.ok ? 'Connected' : (data?.message || 'Invalid')
                        });
                    } catch (err) {
                        results.push({ id: account.id, name: account.name, success: false, message: err.message });
                    }
                }
                return response({ code: 200, data: { accounts: results } });
            }
        }
        
        const providerConfig = config[provider];
        
        if (!providerConfig || !providerConfig.enabled) {
            return error('PROVIDER_NOT_ENABLED', 400);
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
            } else if (provider === 'digitalplat') {
                try {
                    await fetchDigitalPlatDomains(providerConfig, 1);
                    testResult = true;
                    testMessage = 'Connection successful';
                } catch (digitalPlatError) {
                    testResult = false;
                    testMessage = digitalPlatError.message;
                }
            }
        } catch (err) {
            testMessage = 'Connection error: ' + err.message;
        }
        
        return response({ code: 200, data: { success: testResult, message: testMessage } });
    } catch (err) {
        return error('TEST_FAILED: ' + err.message, 500);
    }
});

export default {
    async scheduled(event, env, ctx) {
        ctx.waitUntil(checkAndRenew(env, true));
    },
    async fetch(req, env, ctx) {
        return app
            .route(req, env)
            .catch((err) => error("SERVER ERROR: " + err.message, 500));
    },
};

