import {store} from "./store";

// ---------- Marks -> percentile estimates ----------
//
// LIVE DATA: when the app is online it asks /api/percentile (see api/percentile.js) to read this exact exam's marks-vs-percentile
// tables from the published sites, and uses those first. Everything below is the built-in fallback for when that is unavailable.
//
// IMPORTANT: these are ESTIMATES built from third-party tables, not NTA data. NTA normalises each shift separately, so the
// real percentile depends on how every other candidate in that shift scored.
//
// Two layers:
//  1. GENERAL curve (0-300), from the careers360 "JEE Main marks vs percentile vs rank" table, which is based on previous-year
//     trends (https://engineering.careers360.com/articles/jee-mains-2026-april-4-marks-vs-percentile).
//  2. SHIFT tables for the nine 2025 January shifts in this question bank (percentile 90-99 only), from
//     https://www.pw.live/iit-jee/exams/shift-wise-jee-main-2025-marks-vs-percentile (the page calls them estimates).
//     Inside 90-99 the shift table is used directly; outside it, the general curve is shifted by that shift's offset.

// [highest marks in band, lowest marks in band, percentile at the highest, percentile at the lowest]
const BANDS = [
  [300,291,100,99.999], [292,280,99.99890732,99.99617561], [279,271,99.99417236,99.99153171], [268,259,99.99034797,99.97687156],
  [258,250,99.97413985,99.95228621], [249,240,99.95028296,99.91549924], [239,230,99.91395128,99.87060821], [229,220,99.86150253,99.78191884],
  [219,210,99.77499852,99.69159044], [209,200,99.68494329,99.57503767], [199,190,99.56019541,99.40858575], [189,180,99.39319714,99.17311273],
  [179,170,99.1567225,98.87981861], [169,160,98.85149993,98.52824811], [159,150,98.49801724,98.09290531], [149,140,98.07460288,97.54301298],
  [139,130,97.4927496,96.87838902], [129,120,96.80927687,96.0687115], [119,110,95.983027,95.05625037], [109,100,94.96737888,93.8020333],
  [99,90,93.67910655,92.21882783], [89,80,92.05811248,90.27631202], [79,70,90.0448455,87.51810893], [69,60,87.33654157,83.89085926],
  [59,50,83.5119717,78.35114254], [49,40,77.81927947,69.5797271], [39,30,68.80219265,56.09102043], [29,20,54.01037138,36.58463962],
  [19,10,35.2885364,18.16647924], [9,0,17.14582299,5.71472799],
];
// From the same table: rank 1,390,805 at percentile 5.7147 implies about 1.475 million candidates (the ratio is the same in every band).
export const CANDIDATES = 1475000;

const PCTS = [99, 98.5, 98, 97.5, 97, 96.5, 96, 95.5, 95, 94, 93, 92, 91, 90];
const SHIFT_MARKS = {   // marks at each of PCTS, per shift
  "jee-2025-22jan-s1": [158,143,133,128,120,115,110,105,101,94,88,85,78,74],
  "jee-2025-22jan-s2": [186,173,163,155,149,143,138,134,129,122,115,108,102,98],
  "jee-2025-23jan-s2": [188,175,165,158,152,147,140,136,132,124,120,111,104,101],
  "jee-2025-24jan-s1": [183,168,158,150,144,137,131,126,121,111,104,97,91,85],
  "jee-2025-24jan-s2": [200,186,177,166,162,156,151,148,142,133,127,121,115,112],
  "jee-2025-28jan-s1": [148,136,126,120,114,110,105,100,96,90,85,85,76,70],
  "jee-2025-28jan-s2": [170,158,149,142,136,131,127,121,118,111,105,104,99,90],
  "jee-2025-29jan-s1": [174,162,153,145,140,135,130,126,123,116,110,109,95,94],
  "jee-2025-29jan-s2": [176,165,154,149,144,140,136,129,127,120,115,113,109,101],
};
export const SOURCES = {
  general: {label:"careers360 marks-vs-percentile table (previous-year trends)", url:"https://engineering.careers360.com/articles/jee-mains-2026-april-4-marks-vs-percentile"},
  shift: {label:"PW shift-wise 2025 table (estimates)", url:"https://www.pw.live/iit-jee/exams/shift-wise-jee-main-2025-marks-vs-percentile"},
};

// anchors: sorted by marks, one percentile per marks value, never decreasing
function buildAnchors(pairs){
  const byMarks = new Map();
  pairs.forEach(([m, p]) => { const e = byMarks.get(m) || []; e.push(p); byMarks.set(m, e); });
  const out = [...byMarks.entries()].map(([m, ps]) => [m, ps.reduce((a, b) => a + b, 0) / ps.length]).sort((a, b) => a[0] - b[0]);
  for(let i = 1; i < out.length; i++) if(out[i][1] < out[i - 1][1]) out[i][1] = out[i - 1][1];
  return out;
}
const GENERAL = buildAnchors(BANDS.flatMap(([hi, lo, ph, pl]) => [[hi, ph], [lo, pl]]));
const SHIFT = Object.fromEntries(Object.entries(SHIFT_MARKS).map(([id, marks]) => [id, buildAnchors(marks.map((m, i) => [m, PCTS[i]]))]));

function interp(anchors, x){
  if(x <= anchors[0][0]) return null;
  if(x >= anchors[anchors.length - 1][0]) return null;
  let lo = 0, hi = anchors.length - 1;
  while(hi - lo > 1){ const mid = (lo + hi) >> 1; if(anchors[mid][0] <= x) lo = mid; else hi = mid; }
  const [x0, y0] = anchors[lo], [x1, y1] = anchors[hi];
  return x1===x0 ? y1 : y0 + (y1 - y0) * (x - x0) / (x1 - x0);
}
export function generalPercentile(marks, a = GENERAL){
  if(marks <= a[0][0]) return Math.max(0, a[0][1] + (marks - a[0][0]) * 0.5);   // below 0 marks: only a rough tail
  if(marks >= a[a.length - 1][0]) return 100;
  return interp(a, marks);
}
// the marks at which the general curve reaches a percentile (inverse)
export function generalMarksFor(p, a = GENERAL){
  if(p <= a[0][1]) return a[0][0];
  if(p >= a[a.length - 1][1]) return a[a.length - 1][0];
  for(let i = 1; i < a.length; i++){
    if(a[i][1] >= p){
      const [x0, y0] = a[i - 1], [x1, y1] = a[i];
      return y1===y0 ? x1 : x0 + (x1 - x0) * (p - y0) / (y1 - y0);
    }
  }
  return a[a.length - 1][0];
}
// ---------- live tables (fetched from the sites by /api/percentile, kept on this device for offline use) ----------
const LS_LIVE = "jee_live_pct_v1";   // plain localStorage on purpose: a cache, so it stays out of backups
const LIVE_TTL = 24 * 3600 * 1000, RETRY_AFTER = 10 * 60 * 1000;
const live = new Map();              // paperId -> {at, fetchedAt, sources:[{id,label,url,scope,anchors}]}
const failed = new Map();            // paperId -> time of the last failed attempt
const inflight = new Map();
const listeners = new Set();
let version = 0;
const bump = () => { version++; listeners.forEach(f => f()); };
export const subscribeLive = f => { listeners.add(f); return () => listeners.delete(f); };
export const liveVersion = () => version;

function validAnchors(a){ return Array.isArray(a) && a.length >= 3 && a.length <= 200 && a.every(x => Array.isArray(x) && Number.isFinite(x[0]) && Number.isFinite(x[1]) && x[1] >= 0 && x[1] <= 100); }
function keepOk(sources){
  return (Array.isArray(sources) ? sources : []).filter(x => x && x.status === "ok" && typeof x.id === "string" && validAnchors(x.anchors))
    .map(x => ({id: x.id, label: String(x.label || x.id), url: typeof x.url === "string" && /^https?:\/\//.test(x.url) ? x.url : "", scope: x.scope === "session" ? "session" : "shift", anchors: x.anchors}));
}
try{
  const o = JSON.parse(localStorage.getItem(LS_LIVE) || "{}");
  Object.entries(o).forEach(([id, v]) => { if(v && typeof v.at === "number") { const src = keepOk(v.sources.map(x => ({...x, status:"ok"}))); if(src.length) live.set(id, {at: v.at, fetchedAt: v.fetchedAt, sources: src}); } });
}catch(e){ /* no saved copy */ }
function persistLive(){
  try{
    const ids = [...live.keys()].sort((a, b) => live.get(b).at - live.get(a).at).slice(0, 80);
    localStorage.setItem(LS_LIVE, JSON.stringify(Object.fromEntries(ids.map(id => [id, live.get(id)]))));
  }catch(e){ /* storage full or blocked: the in-memory copy still works */ }
}
// Ask the server for this exam's tables. Safe to call often: it dedupes, honours a one-day freshness and backs off after a failure.
export async function fetchLivePercentile(paperId, fetchImpl){
  const f = fetchImpl || (typeof fetch === "function" ? fetch : null);
  if(!f || typeof paperId !== "string") return false;
  const have = live.get(paperId);
  if(have && Date.now() - have.at < LIVE_TTL) return true;
  if(failed.has(paperId) && Date.now() - failed.get(paperId) < RETRY_AFTER) return !!have;
  if(inflight.has(paperId)) return inflight.get(paperId);
  const job = (async () => {
    try{
      const ctl = typeof AbortController === "function" ? new AbortController() : null;
      const t = ctl ? setTimeout(() => ctl.abort(), 15000) : null;
      const r = await f(`/api/percentile?paper=${encodeURIComponent(paperId)}`, ctl ? {signal: ctl.signal} : undefined);
      if(t) clearTimeout(t);
      if(!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      const sources = keepOk(d && d.sources);
      if(!sources.length) throw new Error("no table for this exam");
      live.set(paperId, {at: Date.now(), fetchedAt: typeof d.fetchedAt === "string" ? d.fetchedAt : new Date().toISOString(), sources});
      failed.delete(paperId); persistLive(); bump();
      return true;
    }catch(e){
      failed.set(paperId, Date.now());
      if(!have) bump();   // lets a card change from "checking..." to "built-in estimate"
      return !!have;
    }finally{ inflight.delete(paperId); }
  })();
  inflight.set(paperId, job);
  return job;
}
// "idle" | "loading" | "live" | "fallback"
export function liveStatus(paperId){
  if(live.has(paperId)) return "live";
  if(inflight.has(paperId)) return "loading";
  return failed.has(paperId) ? "fallback" : "idle";
}
export function liveInfo(paperId){ return live.get(paperId) || null; }
export function resetLiveForTests(){ live.clear(); failed.clear(); inflight.clear(); version = 0; }

function shiftSourcesOf(paperId){
  const l = live.get(paperId);
  return l ? l.sources.filter(x => x.scope === "shift").map(x => ({...x, table: buildAnchors(x.anchors.map(([m, p]) => [m, p]))})).filter(x => x.table.length >= 2) : [];
}
function sessionSourceOf(paperId){
  const l = live.get(paperId);
  const x = l && l.sources.find(y => y.scope === "session");
  if(!x) return null;
  const table = buildAnchors(x.anchors);
  return table.length >= 6 ? {...x, table} : null;
}
export function hasShiftTable(paperId){ return !!SHIFT[paperId] || shiftSourcesOf(paperId).length > 0; }

// one shift's table: inside it, interpolate; outside it, the general curve shifted by how far this shift sits from it
function pointFromTable(t, marks){
  const mLo = t[0][0], pLo = t[0][1], mHi = t[t.length - 1][0], pHi = t[t.length - 1][1];
  if(marks >= mLo && marks <= mHi) return interp(t, marks) ?? (marks <= mLo ? pLo : pHi);
  const offset = marks > mHi ? generalMarksFor(pHi) - mHi : generalMarksFor(pLo) - mLo;
  return generalPercentile(marks + offset);
}
function bundledPoint(paperId, marks){
  const t = SHIFT[paperId];
  if(!t) return {pct: generalPercentile(marks), basis:"general"};
  const mLo = t[0][0], mHi = t[t.length - 1][0];
  return {pct: pointFromTable(t, marks), basis: marks >= mLo && marks <= mHi ? "shift" : "shift+general"};
}
const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
// {pct, lo, hi, basis, rank, spread, sources?}  (lo..hi = how far the answer moves if the paper was a few marks easier or harder than the table
// assumes; with live data it also spans the disagreement between sites)
export function estimatePercentile(paperId, marks){
  const shifts = shiftSourcesOf(paperId);
  if(shifts.length){
    const spread = 4;
    const per = shifts.map(x => ({id: x.id, label: x.label, url: x.url, pct: pointFromTable(x.table, marks), lo: pointFromTable(x.table, marks - spread), hi: pointFromTable(x.table, marks + spread)}));
    const pct = median(per.map(x => x.pct));
    return {pct, lo: Math.min(pct, ...per.map(x => Math.min(x.lo, x.pct))), hi: Math.max(pct, ...per.map(x => Math.max(x.hi, x.pct))), basis:"live", spread,
      rank: Math.max(1, Math.round((100 - pct) / 100 * CANDIDATES)), sources: per, fetchedAt: live.get(paperId).fetchedAt};
  }
  const sess = sessionSourceOf(paperId);
  if(sess){
    const spread = 12, f = m => generalPercentile(m, sess.table);
    const pct = f(marks);
    return {pct, lo: Math.min(f(marks - spread), pct), hi: Math.max(f(marks + spread), pct), basis:"live-general", spread,
      rank: Math.max(1, Math.round((100 - pct) / 100 * CANDIDATES)), sources: [{id: sess.id, label: sess.label, url: sess.url, pct}], fetchedAt: live.get(paperId).fetchedAt};
  }
  const spread = SHIFT[paperId] ? 4 : 12;
  const p = bundledPoint(paperId, marks);
  const lo = bundledPoint(paperId, marks - spread).pct, hi = bundledPoint(paperId, marks + spread).pct;
  return {pct: p.pct, lo: Math.min(lo, p.pct), hi: Math.max(hi, p.pct), basis: p.basis, rank: Math.max(1, Math.round((100 - p.pct) / 100 * CANDIDATES)), spread};
}
// marks needed in this paper to reach a percentile (inverse of the above)
export function marksForPercentile(paperId, p){
  const t = SHIFT[paperId];
  if(t){
    const m90 = t[0][0], m99 = t[t.length - 1][0];
    if(p >= 90 && p <= 99){
      for(let i = 1; i < t.length; i++) if(t[i][1] >= p){ const [x0, y0] = t[i - 1], [x1, y1] = t[i]; return Math.round(y1===y0 ? x1 : x0 + (x1 - x0) * (p - y0) / (y1 - y0)); }
    }
    return Math.round(generalMarksFor(p) + (p > 99 ? m99 - generalMarksFor(99) : m90 - generalMarksFor(90)));
  }
  return Math.round(generalMarksFor(p));
}
export function fmtPct(p){ return p >= 99.995 ? "100" : p >= 99.9 ? p.toFixed(3) : p >= 99 ? p.toFixed(2) : p.toFixed(1); }
export function fmtRank(r){ return r >= 100000 ? `${(r / 100000).toFixed(1)} lakh` : r.toLocaleString("en-IN"); }
export function basisText(basis){
  return basis==="live" ? "the marks-vs-percentile table for this exact shift, read live from the sites listed below"
    : basis==="live-general" ? "the session-wide marks-vs-percentile table, read live (no shift-wise table exists for this exam)"
    : basis==="shift" ? "this shift's 2025 estimate table"
    : basis==="shift+general" ? "this shift's 2025 table where it applies, and the general curve shifted to match outside it"
    : "the general previous-years curve (there is no table for this shift)";
}

// ---------- your target ----------
export const LS_GOAL = "jee_cbt_goal_v1";
export const GOAL_CHOICES = [90, 95, 97, 98, 99, 99.5];
export function loadGoal(){
  try{ const o = JSON.parse(store.getItem(LS_GOAL) || "null"); return o && typeof o.percentile==="number" ? o : null; }catch(e){ return null; }
}
export function saveGoal(percentile){
  try{ if(percentile==null) store.removeItem(LS_GOAL); else store.setItem(LS_GOAL, JSON.stringify({percentile})); return true; }catch(e){ return false; }
}
