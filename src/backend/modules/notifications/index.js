/**
 * Notification Channels Module
 * Supports multiple notification providers
 */

// ==========================================
// Telegram Notification
// ==========================================
export async function sendTelegram(token, chatId, title, message) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: `*${title}*\n\n${message}`,
            parse_mode: 'Markdown'
        })
    });
    const data = await resp.json();
    if (!data.ok) throw new Error('Telegram error: ' + (data.description || 'Unknown'));
    return data;
}

// ==========================================
// Bark Notification (iOS)
// ==========================================
export async function sendBark(serverUrl, token, title, message) {
    const url = `${serverUrl}/${token}`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body: message })
    });
    if (!resp.ok) throw new Error('Bark error: ' + resp.status);
    return await resp.json();
}

// ==========================================
// PushPlus Notification
// ==========================================
export async function sendPushPlus(token, title, message) {
    const resp = await fetch('https://www.pushplus.plus/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, title, content: message })
    });
    const data = await resp.json();
    if (data.code !== 200) throw new Error('PushPlus error: ' + data.msg);
    return data;
}

// ==========================================
// Server酱 (ServerChan)
// ==========================================
export async function sendServerChan(sendKey, title, message) {
    const url = `https://sctapi.ftqq.com/${sendKey}.send`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, desp: message })
    });
    const data = await resp.json();
    if (data.code !== 0) throw new Error('ServerChan error: ' + data.message);
    return data;
}

// ==========================================
// 钉钉 (DingTalk)
// ==========================================
export async function sendDingTalk(webhook, secret, title, message) {
    let url = webhook;
    if (secret) {
        const timestamp = Date.now();
        const sign = await hmacSha256Base64(`${timestamp}\n${secret}`, secret);
        url += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
    }
    
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            msgtype: 'markdown',
            markdown: { title, text: `### ${title}\n\n${message}` }
        })
    });
    const data = await resp.json();
    if (data.errcode !== 0) throw new Error('DingTalk error: ' + data.errmsg);
    return data;
}

// ==========================================
// 飞书 (Lark)
// ==========================================
export async function sendLark(webhook, title, message) {
    const resp = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            msg_type: 'interactive',
            card: {
                header: { title: { content: title, tag: 'plain_text' } },
                elements: [{ tag: 'div', text: { content: message, tag: 'lark_md' } }]
            }
        })
    });
    const data = await resp.json();
    if (data.code !== 0) throw new Error('Lark error: ' + data.msg);
    return data;
}

// ==========================================
// 企业微信 (WeCom)
// ==========================================
export async function sendWeCom(webhook, title, message) {
    const resp = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            msgtype: 'markdown',
            markdown: { content: `### ${title}\n\n${message}` }
        })
    });
    const data = await resp.json();
    if (data.errcode !== 0) throw new Error('WeCom error: ' + data.errmsg);
    return data;
}

// ==========================================
// NotifyX
// ==========================================
export async function sendNotifyX(webhook, title, message) {
    const resp = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: message })
    });
    if (!resp.ok) throw new Error('NotifyX error: ' + resp.status);
    return await resp.json();
}

// ==========================================
// Gotify
// ==========================================
export async function sendGotify(serverUrl, token, title, message, priority = 5) {
    const resp = await fetch(`${serverUrl}/message`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Gotify-Key': token
        },
        body: JSON.stringify({ title, message, priority })
    });
    if (!resp.ok) throw new Error('Gotify error: ' + resp.status);
    return await resp.json();
}

// ==========================================
// Ntfy
// ==========================================
export async function sendNtfy(serverUrl, topic, title, message) {
    const resp = await fetch(`${serverUrl}/${topic}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Title': title
        },
        body: message
    });
    if (!resp.ok) throw new Error('Ntfy error: ' + resp.status);
    return { success: true };
}

// ==========================================
// Webhook (Generic)
// ==========================================
export async function sendWebhook(webhook, title, message, data = {}) {
    const resp = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, ...data, timestamp: Date.now() })
    });
    if (!resp.ok) throw new Error('Webhook error: ' + resp.status);
    return await resp.json();
}

// ==========================================
// Email (Resend)
// ==========================================
export async function sendEmail(apiKey, from, to, subject, html) {
    const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from, to: [to], subject, html })
    });
    const data = await resp.json();
    if (data.error) throw new Error('Email error: ' + data.error);
    return data;
}

// ==========================================
// Helper: HMAC SHA256 Base64
// ==========================================
async function hmacSha256Base64(message, secret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(message);
    
    const key = await crypto.subtle.importKey(
        'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, msgData);
    return btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

// ==========================================
// Send Notification by Channel Type
// ==========================================
export async function sendNotification(channel, title, message) {
    const { type, config } = channel;
    
    switch (type) {
        case 'telegram':
            return await sendTelegram(config.token, config.chatId, title, message);
        case 'bark':
            return await sendBark(config.serverUrl || 'https://api.day.app', config.token, title, message);
        case 'pushplus':
            return await sendPushPlus(config.token, title, message);
        case 'serverchan':
            return await sendServerChan(config.sendKey, title, message);
        case 'dingtalk':
            return await sendDingTalk(config.webhook, config.secret, title, message);
        case 'lark':
            return await sendLark(config.webhook, title, message);
        case 'wecom':
            return await sendWeCom(config.webhook, title, message);
        case 'notifyx':
            return await sendNotifyX(config.webhook, title, message);
        case 'gotify':
            return await sendGotify(config.serverUrl, config.token, title, message, config.priority);
        case 'ntfy':
            return await sendNtfy(config.serverUrl, config.topic, title, message);
        case 'webhook':
            return await sendWebhook(config.webhook, title, message, config.data);
        case 'email':
            return await sendEmail(config.apiKey, config.from, config.to, title, message);
        default:
            throw new Error('Unknown notification type: ' + type);
    }
}

export default {
    sendTelegram,
    sendBark,
    sendPushPlus,
    sendServerChan,
    sendDingTalk,
    sendLark,
    sendWeCom,
    sendNotifyX,
    sendGotify,
    sendNtfy,
    sendWebhook,
    sendEmail,
    sendNotification
};
