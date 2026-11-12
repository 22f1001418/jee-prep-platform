// Persistent key-value store for everything the app saves (attempts, history, notes, stars, profile...).
//
// It keeps the exact synchronous API of localStorage (getItem / setItem / removeItem), so the rest of the app
// is unchanged, but the data lives in IndexedDB (hundreds of MB instead of ~5 MB). Reads come from an in-memory
// copy that is loaded once at start-up; writes update memory immediately and are flushed to IndexedDB in the
// background. If IndexedDB is unavailable (some private modes) it transparently falls back to localStorage.
//
// Other tabs are kept in sync through a BroadcastChannel, which re-creates the "storage" event the app listens for.

const DB_NAME = "jee-cbt";
const DB_VERSION = 1;
const OS = "kv";
const MIGRATED_FLAG = "__migrated_from_localstorage_v1";
const KEY_PREFIX = "jee_cbt_";
// Kept in localStorage only: the theme (read before first paint, see index.html)
const LOCAL_ONLY = new Set(["jee_cbt_theme_v1"]);

const mem = new Map();
const dirty = new Map();            // key -> string | null (null = delete), waiting to be flushed
let db = null;
let useLocalStorage = false;
let flushTimer = null;
let flushing = false;
let errorHandler = null;
let quotaBytes = 0;
let channel = null;

const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const txDone = tx => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });

function openDb() {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains(OS)) open.result.createObjectStore(OS); };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
    open.onblocked = () => reject(new Error("IndexedDB blocked"));
  });
}

async function readAll(database) {
  const tx = database.transaction(OS, "readonly");
  const st = tx.objectStore(OS);
  const [keys, vals] = await Promise.all([reqP(st.getAllKeys()), reqP(st.getAll())]);
  keys.forEach((k, i) => mem.set(String(k), vals[i]));
}

async function migrateFromLocalStorage() {
  if (mem.has(MIGRATED_FLAG)) return;
  const moved = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX) && !LOCAL_ONLY.has(k)) moved.push(k);
    }
  } catch (e) { /* localStorage blocked: nothing to migrate */ }
  const tx = db.transaction(OS, "readwrite");
  const st = tx.objectStore(OS);
  moved.forEach(k => {
    if (mem.has(k)) return;                     // never overwrite something already in IndexedDB
    const v = localStorage.getItem(k);
    if (v != null) { mem.set(k, v); st.put(v, k); }
  });
  mem.set(MIGRATED_FLAG, "1"); st.put("1", MIGRATED_FLAG);
  await txDone(tx);
  moved.forEach(k => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } });   // only after the copy is safely stored
}

async function flush() {
  if (flushing || !db || !dirty.size) return;
  flushing = true;
  const batch = new Map(dirty); dirty.clear();
  try {
    const tx = db.transaction(OS, "readwrite");
    const st = tx.objectStore(OS);
    batch.forEach((v, k) => { if (v === null) st.delete(k); else st.put(v, k); });
    await txDone(tx);
  } catch (e) {
    batch.forEach((v, k) => { if (!dirty.has(k)) dirty.set(k, v); });   // keep it queued, retry on the next write
    if (errorHandler) errorHandler(e);
  } finally {
    flushing = false;
    if (dirty.size) schedule();
  }
}
function schedule() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => { flushTimer = null; flush(); }, 40);
}

function announce(key, value) {
  try { channel && channel.postMessage({ key, value }); } catch (e) { /* ignore */ }
}

export const store = {
  getItem(k) { return mem.has(k) ? mem.get(k) : null; },
  setItem(k, v) {
    const val = String(v);
    if (LOCAL_ONLY.has(k) || useLocalStorage) {
      localStorage.setItem(k, val);             // may throw when full: callers already handle it
      mem.set(k, val);
    } else {
      mem.set(k, val); dirty.set(k, val); schedule();
    }
    announce(k, val);
  },
  removeItem(k) {
    mem.delete(k);
    if (LOCAL_ONLY.has(k) || useLocalStorage) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
    else { dirty.set(k, null); schedule(); }
    announce(k, null);
  },
  keys() { return [...mem.keys()].filter(k => k !== MIGRATED_FLAG); },
  // Sizes of what the app has saved, plus the browser's real quota for this site (falls back to a generous figure).
  usage() {
    const items = []; let used = 0;
    mem.forEach((v, k) => { if (k === MIGRATED_FLAG) return; const n = k.length + String(v).length; items.push([k, n]); used += n; });
    return { used, total: Math.max(quotaBytes || 0, used * 2, 50 * 1024 * 1024), items };
  },
  // Everything, as a plain object (for the backup file).
  snapshot() {
    const o = {};
    mem.forEach((v, k) => { if (k !== MIGRATED_FLAG && k.startsWith(KEY_PREFIX) && !LOCAL_ONLY.has(k)) o[k] = v; });
    return o;
  },
  // Replace (or merge into) the saved data with a backup. Returns how many keys were written.
  restore(obj, { replace = true } = {}) {
    const incoming = Object.keys(obj).filter(k => k.startsWith(KEY_PREFIX) && !LOCAL_ONLY.has(k) && typeof obj[k] === "string");
    if (replace) this.keys().filter(k => k.startsWith(KEY_PREFIX) && !LOCAL_ONLY.has(k)).forEach(k => this.removeItem(k));
    incoming.forEach(k => this.setItem(k, obj[k]));
    return incoming.length;
  },
  flushNow() { return flush(); },
  onError(fn) { errorHandler = fn; },
  get backend() { return useLocalStorage ? "localStorage" : "indexedDB"; },
};

export async function initStore() {
  try {
    if (!("indexedDB" in globalThis)) throw new Error("no IndexedDB");
    db = await openDb();
    await readAll(db);
    await migrateFromLocalStorage();
    db.onversionchange = () => { try { db.close(); } catch (e) { /* ignore */ } };
  } catch (e) {
    console.warn("IndexedDB unavailable, using localStorage:", e);
    useLocalStorage = true; db = null;
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(KEY_PREFIX)) mem.set(k, localStorage.getItem(k)); } } catch (e2) { /* ignore */ }
  }
  try { localStorage.removeItem("jee_cbt_access_code_v1"); } catch (e) { /* old AI-explain passcode: no longer used, do not leave a credential behind */ }
  try {
    channel = new BroadcastChannel("jee-cbt-store");
    channel.onmessage = ev => {
      const { key, value } = ev.data || {};
      if (!key) return;
      if (value === null) mem.delete(key); else mem.set(key, value);
      try { window.dispatchEvent(new StorageEvent("storage", { key })); } catch (e) { /* ignore */ }
    };
  } catch (e) { /* BroadcastChannel unsupported: tabs just do not live-sync */ }
  addEventListener("pagehide", () => { flush(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  try {
    if (navigator.storage) {
      navigator.storage.persist && navigator.storage.persist();         // ask the browser not to evict our data
      navigator.storage.estimate && navigator.storage.estimate().then(e => { quotaBytes = e.quota || 0; });
    }
  } catch (e) { /* ignore */ }
}
