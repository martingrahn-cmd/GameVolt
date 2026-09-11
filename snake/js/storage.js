// Storage that keeps the game playable when persistence is blocked or corrupt.
const memoryStorage = new Map();

export function safeStorageGet(key) {
    try {
        const value = globalThis.localStorage?.getItem(key);
        if (value !== null && value !== undefined) memoryStorage.set(key, value);
        return value ?? memoryStorage.get(key) ?? null;
    } catch (error) {
        return memoryStorage.get(key) ?? null;
    }
}

export function safeStorageSet(key, value) {
    const text = String(value);
    memoryStorage.set(key, text);
    try { globalThis.localStorage?.setItem(key, text); } catch (error) { /* memory fallback */ }
}

export function safeStorageRemove(key) {
    memoryStorage.delete(key);
    try { globalThis.localStorage?.removeItem(key); } catch (error) { /* memory fallback */ }
}
