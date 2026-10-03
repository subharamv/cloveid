// Network-resilient fetch for Supabase.
//
// Some networks/devices break Chrome's HTTP/3 (QUIC) connection to
// *.supabase.co (net::ERR_QUIC_PROTOCOL_ERROR → "TypeError: Failed to fetch").
// When a direct request fails at the network layer, retry it through our own
// origin (/sb-proxy/* → Supabase, see public/_redirects and vite.config.ts).
// Once the proxy has been needed, use it first for a while so every request
// doesn't pay for a failed direct attempt.

export const SUPABASE_URL = 'https://tmygylckkbocgunlubik.supabase.co';

const PROXY_PREFIX = '/sb-proxy';
const PREFER_PROXY_KEY = 'sb_prefer_proxy_until';
const PREFER_PROXY_MS = 24 * 60 * 60 * 1000;

const nativeFetch = (input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init);

const preferProxy = () => {
    try {
        return Number(localStorage.getItem(PREFER_PROXY_KEY) || 0) > Date.now();
    } catch {
        return false;
    }
};

const rememberProxy = (on: boolean) => {
    try {
        if (on) localStorage.setItem(PREFER_PROXY_KEY, String(Date.now() + PREFER_PROXY_MS));
        else localStorage.removeItem(PREFER_PROXY_KEY);
    } catch { /* ignore */ }
};

const requestUrl = (input: RequestInfo | URL) =>
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

// fetch() rejects with a TypeError only for network-level failures
// (DNS, TLS, QUIC, CORS, offline) — never for HTTP error statuses.
const isNetworkFailure = (err: unknown) => err instanceof TypeError;

export const supabaseFetch: typeof fetch = async (input, init) => {
    const url = requestUrl(input);
    if (!url.startsWith(SUPABASE_URL)) return nativeFetch(input, init);

    const proxied = PROXY_PREFIX + url.slice(SUPABASE_URL.length);
    // A Request body can only be read once; supabase-js passes (url, init) so this is rare.
    const proxyInput: RequestInfo | URL = typeof input === 'string' || input instanceof URL ? proxied : new Request(proxied, input);

    if (preferProxy()) {
        try {
            return await nativeFetch(proxyInput, init);
        } catch (err) {
            if (!isNetworkFailure(err)) throw err;
            rememberProxy(false); // proxy unreachable too — fall back to direct
            return nativeFetch(input, init);
        }
    }

    try {
        return await nativeFetch(input, init);
    } catch (err) {
        if (!isNetworkFailure(err) || !navigator.onLine) throw err;
        console.warn('Direct Supabase request failed, retrying via proxy:', url.split('?')[0], err);
        const res = await nativeFetch(proxyInput, init);
        rememberProxy(true);
        return res;
    }
};
