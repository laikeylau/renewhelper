/**
 * Import Module
 * Supports CSV and JSON batch import
 */

// Parse CSV file to items
export function parseCsvToItems(csvText, provider = 'csv-import') {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length < 2) throw new Error('CSV 文件为空或格式错误')
    
    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase())
    const nameIndex = header.findIndex(h => h === 'name' || h === '域名' || h === 'domain')
    const expiryIndex = header.findIndex(h => h === 'expiry' || h === '到期日期' || h === 'expires')
    const priceIndex = header.findIndex(h => h === 'price' || h === '价格' || h === 'cost')
    const currencyIndex = header.findIndex(h => h === 'currency' || h === '币种')
    const notesIndex = header.findIndex(h => h === 'notes' || h === '备注' || h === 'note')
    
    if (nameIndex === -1) {
        throw new Error('CSV 必须包含 name、域名 或 domain 列')
    }
    
    const items = []
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i])
        const name = values[nameIndex]?.trim()
        
        if (!name) continue
        
        const item = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name,
            tags: ['Domain', provider],
            type: 'reset',
            enabled: true,
            createDate: new Date().toISOString().split('T')[0],
            lastRenewDate: new Date().toISOString().split('T')[0],
            intervalDays: 365,
            cycleUnit: 'year',
            notifyDays: 30,
            notifyTime: '09:00',
            autoRenew: false,
            message: 'Provider: ' + provider,
            fixedPrice: 0,
            currency: 'USD',
            notifyTimes: ['09:00'],
            notifyChannelIds: [],
            renewHistory: [],
            renewUrl: ''
        }
        
        // Parse expiry date
        if (expiryIndex !== -1 && values[expiryIndex]) {
            const expiryDate = parseDate(values[expiryIndex].trim())
            if (expiryDate) {
                item.lastRenewDate = expiryDate
                item.createDate = expiryDate
                
                // Calculate interval from now
                const now = new Date()
                const expiry = new Date(expiryDate)
                const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
                item.intervalDays = Math.max(1, daysUntilExpiry)
            }
        }
        
        // Parse price
        if (priceIndex !== -1 && values[priceIndex]) {
            const price = parseFloat(values[priceIndex].replace(/[^0-9.]/g, ''))
            if (!isNaN(price)) {
                item.fixedPrice = price
            }
        }
        
        // Parse currency
        if (currencyIndex !== -1 && values[currencyIndex]) {
            item.currency = values[currencyIndex].trim().toUpperCase()
        }
        
        // Parse notes
        if (notesIndex !== -1 && values[notesIndex]) {
            item.message = values[notesIndex].trim()
        }
        
        items.push(item)
    }
    
    return items
}

// Parse CSV line (handles quoted values)
function parseCsvLine(line) {
    const result = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
            inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
            result.push(current)
            current = ''
        } else {
            current += char
        }
    }
    
    result.push(current)
    return result
}

// Parse date string to YYYY-MM-DD format
function parseDate(dateStr) {
    if (!dateStr) return null
    
    // Try YYYY-MM-DD
    let match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (match) {
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
    }
    
    // Try YYYY/MM/DD
    match = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
    if (match) {
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
    }
    
    // Try MM/DD/YYYY
    match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (match) {
        return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`
    }
    
    // Try DD-MM-YYYY
    match = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
    if (match) {
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
    }
    
    // Try parsing as Date object
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }
    
    return null
}

// Parse JSON file to items
export function parseJsonToItems(jsonText, provider = 'json-import') {
    let data
    
    try {
        data = JSON.parse(jsonText)
    } catch (e) {
        throw new Error('JSON 解析失败: ' + e.message)
    }
    
    // Handle different JSON structures
    let items = []
    
    if (Array.isArray(data)) {
        items = data
    } else if (data.items && Array.isArray(data.items)) {
        items = data.items
    } else if (data.domains && Array.isArray(data.domains)) {
        items = data.domains
    } else {
        throw new Error('无法识别的 JSON 格式')
    }
    
    return items.map(item => normalizeItem(item, provider))
}

// Normalize item to standard format
function normalizeItem(item, provider) {
    const name = item.name || item.domain || item.Domain || ''
    if (!name) return null
    
    const normalized = {
        id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name,
        tags: item.tags || ['Domain', provider],
        type: item.type || 'reset',
        enabled: item.enabled !== false,
        createDate: item.createDate || item.create_date || new Date().toISOString().split('T')[0],
        lastRenewDate: item.lastRenewDate || item.last_renew_date || item.expiry || item.expires || new Date().toISOString().split('T')[0],
        intervalDays: item.intervalDays || item.interval_days || 365,
        cycleUnit: item.cycleUnit || item.cycle_unit || 'year',
        notifyDays: item.notifyDays || item.notify_days || 30,
        notifyTime: item.notifyTime || item.notify_time || '09:00',
        autoRenew: item.autoRenew || item.auto_renew || false,
        message: item.message || item.notes || '',
        fixedPrice: item.fixedPrice || item.fixed_price || item.price || 0,
        currency: item.currency || 'USD',
        notifyTimes: item.notifyTimes || ['09:00'],
        notifyChannelIds: item.notifyChannelIds || [],
        renewHistory: item.renewHistory || [],
        renewUrl: item.renewUrl || item.renew_url || ''
    }
    
    return normalized
}

export default {
    parseCsvToItems,
    parseJsonToItems
}
