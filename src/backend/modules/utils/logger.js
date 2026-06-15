/**
 * Logger Module
 * Structured logging for RenewHelper
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

let currentLevel = LOG_LEVELS.INFO;

function shouldLog(level) {
    return level >= currentLevel;
}

function formatMessage(level, msg, meta = {}) {
    return JSON.stringify({
        level: Object.keys(LOG_LEVELS).find(k => LOG_LEVELS[k] === level),
        msg,
        ...meta,
        timestamp: new Date().toISOString()
    });
}

export const logger = {
    debug(msg, meta = {}) {
        if (shouldLog(LOG_LEVELS.DEBUG)) {
            console.debug(formatMessage(LOG_LEVELS.DEBUG, msg, meta));
        }
    },

    info(msg, meta = {}) {
        if (shouldLog(LOG_LEVELS.INFO)) {
            console.log(formatMessage(LOG_LEVELS.INFO, msg, meta));
        }
    },

    warn(msg, meta = {}) {
        if (shouldLog(LOG_LEVELS.WARN)) {
            console.warn(formatMessage(LOG_LEVELS.WARN, msg, meta));
        }
    },

    error(msg, error = null, meta = {}) {
        if (shouldLog(LOG_LEVELS.ERROR)) {
            const errorMeta = error ? {
                error: error.message,
                stack: error.stack,
                ...meta
            } : meta;
            console.error(formatMessage(LOG_LEVELS.ERROR, msg, errorMeta));
        }
    },

    setLevel(level) {
        if (typeof level === 'string') {
            currentLevel = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
        } else {
            currentLevel = level;
        }
    },

    getLevel() {
        return currentLevel;
    }
};

// Performance measurement helper
export async function measurePerformance(name, fn, loggerInstance = logger) {
    const start = Date.now();
    try {
        const result = await fn();
        loggerInstance.info(`${name} completed`, { duration: Date.now() - start });
        return result;
    } catch (error) {
        loggerInstance.error(`${name} failed`, error, { duration: Date.now() - start });
        throw error;
    }
}

export default logger;
