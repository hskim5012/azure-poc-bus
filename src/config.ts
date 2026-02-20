import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface Config {
    serviceBusConnectionString: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    topic: {
        name: string;
    };
    subscriptions: {
        claimLoading: string;
        claimAudit: string;
        b1Move: string;
        b2Move: string;
    };
}

function getRequiredEnvVar(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
}

function getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
    const level = process.env.LOG_LEVEL?.toLowerCase() || 'info';
    if (!['debug', 'info', 'warn', 'error'].includes(level)) {
        return 'info';
    }
    return level as 'debug' | 'info' | 'warn' | 'error';
}

export const config: Config = {
    serviceBusConnectionString: getRequiredEnvVar('AZURE_SERVICEBUS_CONNECTION_STRING'),
    logLevel: getLogLevel(),
    topic: {
        name: process.env.AZURE_SB_TOPIC_NAME || 'workflow-events-topic'
    },
    subscriptions: {
        claimLoading: process.env.AZURE_SB_SUB_CLAIM_LOADING || 'claim-loading-sub',
        claimAudit: process.env.AZURE_SB_SUB_CLAIM_AUDIT || 'claim-audit-sub',
        b1Move: process.env.AZURE_SB_SUB_B1_MOVE || 'b1-move-sub',
        b2Move: process.env.AZURE_SB_SUB_B2_MOVE || 'b2-move-sub',
    },
};
