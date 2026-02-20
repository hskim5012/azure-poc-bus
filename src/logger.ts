import { config } from './config';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

const logLevelMap: Record<string, LogLevel> = {
    debug: LogLevel.DEBUG,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    error: LogLevel.ERROR,
};

const currentLogLevel = logLevelMap[config.logLevel] || LogLevel.INFO;

function shouldLog(level: LogLevel): boolean {
    return level >= currentLogLevel;
}

function formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let formatted = `[${timestamp}] [${level}] ${message}`;
    if (data !== undefined) {
        formatted += ` ${JSON.stringify(data)}`;
    }
    return formatted;
}

export const logger = {
    debug: (message: string, data?: any) => {
        if (shouldLog(LogLevel.DEBUG)) {
            console.log(formatMessage('DEBUG', message, data));
        }
    },
    info: (message: string, data?: any) => {
        if (shouldLog(LogLevel.INFO)) {
            console.log(formatMessage('INFO', message, data));
        }
    },
    warn: (message: string, data?: any) => {
        if (shouldLog(LogLevel.WARN)) {
            console.warn(formatMessage('WARN', message, data));
        }
    },
    error: (message: string, data?: any) => {
        if (shouldLog(LogLevel.ERROR)) {
            console.error(formatMessage('ERROR', message, data));
        }
    },
};
