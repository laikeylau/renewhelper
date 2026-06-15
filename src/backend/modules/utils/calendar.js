/**
 * Calendar (ICS) Module
 * Generate iCalendar subscriptions for reminders
 */

const ICS_VERSION = '2.0';
const CAL_SCALE = 'GREGORIAN';
const PRODID = '-//RenewHelper//EN';

// Escape special characters for ICS format
function escapeICS(str) {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

// Format date for ICS (YYYYMMDDTHHMMSSZ)
function formatICSDate(date, time = '09:00') {
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}00Z`;
}

// Generate UID for event
function generateUID(item) {
    return `${item.id}@renewhelper`;
}

// Generate VEVENT for a single reminder
function generateVEVENT(item, reminderDate, time = '09:00', uid = null) {
    const now = new Date();
    const dtstamp = formatICSDate(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    );
    
    const dtstart = formatICSDate(reminderDate, time);
    
    // Calculate end time (30 minutes later)
    const [year, month, day] = reminderDate.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const endDate = new Date(year, month - 1, day, hours, minutes + 30);
    const dtend = formatICSDate(
        `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`,
        `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
    );

    const eventUid = uid || generateUID(item);
    const summary = escapeICS(`[续费提醒] ${item.name}`);
    const description = escapeICS(
        `服务名称: ${item.name}\n` +
        `提醒日期: ${reminderDate}\n` +
        `提醒时间: ${time}\n` +
        (item.message ? `备注: ${item.message}\n` : '') +
        `\n由 RenewHelper 生成`
    );

    return [
        'BEGIN:VEVENT',
        `UID:${eventUid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT0M',
        'ACTION:DISPLAY',
        'DESCRIPTION:续费提醒',
        'END:VALARM',
        'END:VEVENT'
    ].join('\r\n');
}

// Generate full ICS calendar
export function generateICS(items, options = {}) {
    const { timezone = 'Asia/Shanghai', title = 'RenewHelper 提醒' } = options;
    
    const events = [];
    
    for (const item of items) {
        if (!item.enabled || !item.lastRenewDate) continue;
        
        // Generate reminder for each notify time
        const notifyTimes = item.notifyTimes || ['09:00'];
        const nextRenewal = calculateNextRenewal(item);
        
        if (nextRenewal) {
            for (const time of notifyTimes) {
                events.push(generateVEVENT(item, nextRenewal, time));
            }
        }
    }

    const ics = [
        'BEGIN:VCALENDAR',
        `VERSION:${ICS_VERSION}`,
        `PRODID:${PRODID}`,
        `CALSCALE:${CAL_SCALE}`,
        `METHOD:PUBLISH`,
        `X-WR-CALNAME:${escapeICS(title)}`,
        `X-WR-TIMEZONE:${timezone}`,
        ...events,
        'END:VCALENDAR'
    ].join('\r\n');

    return ics;
}

// Generate ICS for a specific subscription
export function generateSubscriptionICS(items, subscription, options = {}) {
    const { timezone = 'Asia/Shanghai' } = options;
    
    // Filter items based on subscription configuration
    let filteredItems = items;
    if (subscription.itemIds && subscription.itemIds.length > 0) {
        filteredItems = items.filter(item => subscription.itemIds.includes(item.id));
    }

    return generateICS(filteredItems, { timezone, title: subscription.name });
}

// Calculate next renewal date for an item
function calculateNextRenewal(item) {
    if (!item.lastRenewDate) return null;
    
    const [year, month, day] = item.lastRenewDate.split('-').map(Number);
    const interval = item.intervalDays || 365;
    const unit = item.cycleUnit || 'year';
    
    const date = new Date(year, month - 1, day);
    
    switch (unit) {
        case 'year':
            date.setFullYear(date.getFullYear() + Math.floor(interval / 365));
            date.setDate(date.getDate() + (interval % 365));
            break;
        case 'month':
            date.setMonth(date.getMonth() + interval);
            break;
        case 'day':
            date.setDate(date.getDate() + interval);
            break;
    }
    
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Get calendar subscription URL
export function getSubscriptionUrl(baseUrl, token, subscriptionId = 'default') {
    return `${baseUrl}/api/calendar.ics?token=${token}&sub=${subscriptionId}`;
}

// Normalize calendar subscriptions
export function normalizeCalendarSubscriptions(settings = {}) {
    const lang = settings.language === 'en' ? 'en' : 'zh';
    const source = Array.isArray(settings.calendarSubscriptions)
        ? settings.calendarSubscriptions
        : [];
    const legacyToken = typeof settings.calendarToken === 'string' && settings.calendarToken.trim()
        ? settings.calendarToken.trim()
        : '';

    const seenIds = new Set();
    const seenTokens = new Set();
    const customSubs = [];

    const nextUniqueToken = () => {
        let token = crypto.randomUUID();
        while (seenTokens.has(token)) token = crypto.randomUUID();
        return token;
    };

    for (const raw of source) {
        if (!raw || typeof raw !== 'object') continue;

        let id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : crypto.randomUUID();
        if (seenIds.has(id)) {
            id = crypto.randomUUID();
        }
        seenIds.add(id);

        let token = typeof raw.token === 'string' && raw.token.trim() ? raw.token.trim() : nextUniqueToken();
        if (seenTokens.has(token)) {
            token = nextUniqueToken();
        }
        seenTokens.add(token);

        customSubs.push({
            id,
            name: raw.name || (lang === 'en' ? 'Custom Subscription' : '自定义订阅'),
            token,
            itemIds: Array.isArray(raw.itemIds) ? raw.itemIds : [],
            enabled: raw.enabled !== false
        });
    }

    return {
        defaultToken: legacyToken || nextUniqueToken(),
        subscriptions: customSubs
    };
}

export default {
    generateICS,
    generateSubscriptionICS,
    getSubscriptionUrl,
    normalizeCalendarSubscriptions
};
