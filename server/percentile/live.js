import {parseShiftTables, shiftKey} from "./parse.js";
import {SOURCES, parsePaperId, sourcesForYear} from "./sources.js";

const UA = "Mozilla/5.0 (compatible; JEEPrepPlatform/1.0; personal study tool)";
const TIMEOUT_MS = 7000, MAX_BYTES = 6_000_000;
const parsedCache = new Map();   // source id -> {at, parsed|error}; a warm function instance reuses it for 6 hours
const TTL = 6 * 3600 * 1000;

async function fetchHtml(url, fetchImpl){
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try{
    const r = await fetchImpl(url, {signal: ctl.signal, redirect:"follow", headers:{"user-agent": UA, "accept":"text/html,application/xhtml+xml"}});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    if(text.length > MAX_BYTES) throw new Error("page too large");
    return text;
  } finally { clearTimeout(t); }
}

async function load(src, fetchImpl){
  const hit = parsedCache.get(src.id);
  if(hit && Date.now() - hit.at < TTL) return hit;
  let entry;
  try{ entry = {at: Date.now(), parsed: parseShiftTables(await fetchHtml(src.url, fetchImpl))}; }
  catch(e){ entry = {at: Date.now(), error: e && e.name === "AbortError" ? "timed out" : String((e && e.message) || e)}; }
  parsedCache.set(src.id, entry);
  return entry;
}

// {paperId, fetchedAt, sources:[{id, label, url, scope, status:"ok"|"no-table"|"error", anchors?, error?}]}
export async function percentileSourcesFor(paperId, fetchImpl = fetch){
  const p = parsePaperId(paperId);
  if(!p) return {paperId, fetchedAt: new Date().toISOString(), sources: []};
  const srcs = sourcesForYear(p.year);
  const results = await Promise.all(srcs.map(async s => {
    const base = {id: s.id, label: s.label, url: s.url, scope: s.scope};
    const e = await load(s, fetchImpl);
    if(e.error) return {...base, status:"error", error: e.error};
    const anchors = s.scope === "shift" ? e.parsed.shifts[shiftKey(p.month, p.day, p.shift)] : e.parsed.general;
    return anchors ? {...base, status:"ok", anchors} : {...base, status:"no-table"};
  }));
  return {paperId, fetchedAt: new Date().toISOString(), sources: results};
}
export const clearSourceCache = () => parsedCache.clear();
export {SOURCES};
