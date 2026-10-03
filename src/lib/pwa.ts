import { registerSW } from 'virtual:pwa-register';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

// Registers the service worker. With registerType "autoUpdate" a new deploy
// activates on its own and the page reloads, so tablets never stay on a stale bundle.
export const registerPWA = () => {
    if (!('serviceWorker' in navigator)) return;

    registerSW({
        immediate: true,
        onRegisteredSW(_swUrl, registration) {
            if (!registration) return;
            const checkForUpdate = () => {
                if (navigator.onLine) registration.update().catch(() => { /* ignore */ });
            };
            setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') checkForUpdate();
            });
        },
        onRegisterError(error) {
            console.warn('Service worker registration failed:', error);
        },
    });
};

// Wipes everything the browser holds for this site (storage, Cache Storage,
// service workers, IndexedDB, cookies) and reloads from the network.
export const hardResetApp = async () => {
    try { localStorage.clear(); } catch { /* ignore */ }
    try { sessionStorage.clear(); } catch { /* ignore */ }

    document.cookie.split(';').forEach((c) => {
        document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date(0).toUTCString() + ';path=/');
    });

    try {
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
        }
    } catch { /* ignore */ }

    try {
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
        }
    } catch { /* ignore */ }

    try {
        const idb = indexedDB as IDBFactory & { databases?: () => Promise<{ name?: string }[]> };
        if (idb.databases) {
            const dbs = await idb.databases();
            dbs.forEach((db) => db.name && indexedDB.deleteDatabase(db.name));
        }
    } catch { /* ignore */ }

    // cache-busting query forces a fresh index.html past any HTTP cache
    const url = new URL(window.location.href);
    url.searchParams.set('_r', Date.now().toString());
    window.location.replace(url.toString());
};

// Removes only the persisted Supabase session + app auth cache, keeping other prefs.
export const clearStoredAuth = () => {
    try {
        Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('sb-') || key.includes('supabase.auth.token') || key === 'auth_cache') {
                localStorage.removeItem(key);
            }
        });
    } catch { /* ignore */ }
};
