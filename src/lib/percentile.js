import {store} from "./store";

// ---------- Marks -> percentile estimates ----------
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
export function generalPercentile(marks){
  const a = GENERAL;
  if(marks <= a[0][0]) return Math.max(0, a[0][1] + (marks - a[0][0]) * 0.5);   // below 0 marks: only a rough tail
  if(marks >= a[a.length - 1][0]) return 100;
  return interp(a, marks);
}
// the marks at which the general curve reaches a percentile (inverse)
export function generalMarksFor(p){
  const a = GENERAL;
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
export function hasShiftTable(paperId){ return !!SHIFT[paperId]; }

function pointEstimate(paperId, marks){
  const t = SHIFT[paperId];
  if(!t) return {pct: generalPercentile(marks), basis:"general"};
  const m90 = t[0][0], m99 = t[t.length - 1][0];
  if(marks >= m90 && marks <= m99) return {pct: interp(t, marks) ?? (marks <= m90 ? 90 : 99), basis:"shift"};
  const offset = marks > m99 ? generalMarksFor(99) - m99 : generalMarksFor(90) - m90;
  return {pct: generalPercentile(marks + offset), basis:"shift+general"};
}
// {pct, lo, hi, basis, rank}  (lo..hi = how far the answer moves if the paper was a few marks easier or harder than the table assumes)
export function estimatePercentile(paperId, marks){
  const t = SHIFT[paperId]; const spread = t ? 4 : 12;
  const p = pointEstimate(paperId, marks);
  const lo = pointEstimate(paperId, marks - spread).pct, hi = pointEstimate(paperId, marks + spread).pct;
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
  return basis==="shift" ? "this shift's 2025 estimate table"
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
