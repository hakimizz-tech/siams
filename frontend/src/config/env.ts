export interface AppConfig {
    appName: string;
    sentryDsn: string;
}

const DEFAULTS: AppConfig = { appName: 'SIAMS', sentryDsn: '' };
let current: AppConfig = DEFAULTS;

/** All dates shown to users use this timezone (the database stores UTC). */
export const APP_TIMEZONE = 'Africa/Nairobi';
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

export function getConfig(): AppConfig {
    return current;
}

export function parseConfig(raw: unknown): AppConfig {
    if (typeof raw !== 'object' || raw === null) return DEFAULTS;
    const value = raw as Record<string, unknown>;
    return {
        appName:
            typeof value.appName === 'string' && value.appName ? value.appName : DEFAULTS.appName,
        sentryDsn: typeof value.sentryDsn === 'string' ? value.sentryDsn : '',
    };
}

/** Runtime configuration (/config.json). The same build serves every environment. */
export async function loadConfig(fetchFn: typeof fetch = fetch): Promise<AppConfig> {
    try {
        const response = await fetchFn('/config.json', { cache: 'no-store' });
        if (response.ok) current = parseConfig(await response.json());
    } catch {
        // keep defaults: the app must still start without a config file
    }
    return current;
}
