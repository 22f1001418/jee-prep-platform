// Pulls marks -> percentile data out of the HTML of coaching / news sites. No dependencies, runs on the server (Vercel function)
// and in tests. Three table layouts are understood:
//   shift tables, percentile down the side:   | Percentile | 21S1 | 21S2 |      (or "27 Jan M", "27th Jan Shift 1", "S1 (Morning)")
//   shift tables, shifts down the side:       | Shift | 99th %tile | 98th %tile |
//   session-wide marks bands:                 | Marks | Percentile |  300-291 | 100-99.999
// Everything returned is plain data: anchors are [marks, percentile] pairs.

const MONTHS = {jan:"jan", january:"jan", feb:"feb", february:"feb", mar:"mar", march:"mar", apr:"apr", april:"apr", may:"may"};
const ENTITIES = {"&nbsp;":" ", "&amp;":"&", "&ndash;":"-", "&mdash;":"-", "&#8211;":"-", "&#8212;":"-", "&#x2013;":"-", "&#160;":" ", "&lt;":"<", "&gt;":">", "&quot;":'"', "&#8217;":"'", "&#39;":"'"};

export function cleanText(s){
  return String(s).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;|&#x?[0-9a-f]+;/gi, m => ENTITIES[m.toLowerCase()] ?? " ").replace(/[–—−]/g, "-").replace(/\s+/g, " ").trim();
}

// [{rows: string[][], context: string}]  context = the text just before the table (headings tell us which month a "21S1" column means)
export function extractTables(html){
  const out = [];
  const re = /<table[\s\S]*?<\/table>/gi;
  let m;
  while((m = re.exec(html))){
    const rows = [...m[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)].map(r => [...r[0].matchAll(/<t[hd][\s\S]*?<\/t[hd]>/gi)].map(c => cleanText(c[0])));
    if(rows.length < 2) continue;
    out.push({rows, context: cleanText(html.slice(Math.max(0, m.index - 700), m.index)).slice(-260)});
  }
  return out;
}

// "176-180" -> 178, "167+" -> 167, "190" -> 190, "-" -> null. Marks are -75..300.
export function marksOf(cell){
  const s = String(cell).replace(/[\u2013\u2014\u2212]/g, "-").replace(/,/g, "").trim();
  let m = /^(-?\d{1,3})\s*-\s*(-?\d{1,3})$/.exec(s);
  if(m){ const a = +m[1], b = +m[2]; return a >= -75 && b <= 300 && Math.abs(a - b) <= 20 ? (a + b) / 2 : null; }
  m = /^(-?\d{1,3})\s*\+?$/.exec(s);
  if(m){ const v = +m[1]; return v >= -75 && v <= 300 ? v : null; }
  return null;
}
// "99", "99.5", "99th %tile", "99.00 - 99.49" (a band: marks are what it takes to enter it, so use the lower end), "99.9%ile Band"
export function percentileOf(cell){
  const s = String(cell).replace(/[\u2013\u2014\u2212]/g, "-").trim();
  let m = /^(\d{1,3}(?:\.\d+)?)\s*-\s*(\d{1,3}(?:\.\d+)?)\s*(?:%|percentile|%ile)?$/i.exec(s);
  if(m){ const v = Math.min(+m[1], +m[2]); return v > 0 && v <= 100 ? v : null; }
  m = /^(\d{1,3}(?:\.\d+)?)\s*(?:th|st|nd|rd)?\s*(?:%|percentile|%ile|%tile)?\s*(?:band)?\+?$/i.exec(s);
  if(m){ const v = +m[1]; return v > 0 && v <= 100 ? v : null; }
  return null;
}

// "1 Feb M" / "27th Jan Shift 1" / "21S1" / "2 Apr S2" / "21 Jan - Morning" / "29 Jan E" -> {day, month, shift}; any part may be missing.
export function shiftLabel(cell, ctxMonth){
  const s = String(cell).toLowerCase().replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  const day = /(?:^|\s)(\d{1,2})(?:st|nd|rd|th)?\s*(?=jan|feb|mar|apr|may|s\s*[12]\b)/.exec(s);
  const mon = /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may)\b/.exec(s);
  let shift = null;
  let m = /(?:shift|\bs)\s*([12])\b/.exec(s) || /\d\s*s([12])\b/.exec(s) || /(?:^|\s)s([12])(?:\s|$)/.exec(s);
  if(m) shift = +m[1];
  else if(/\bmorning\b|\bm\b/.test(s)) shift = 1;
  else if(/\bevening\b|\be\b/.test(s)) shift = 2;
  if(shift == null) return null;
  return {day: day ? +day[1] : null, month: mon ? MONTHS[mon[1]] : (ctxMonth || null), shift};
}
const monthOfText = t => { const m = /(january|february|march|april|may|\bjan\b|\bfeb\b|\bmar\b|\bapr\b)/i.exec(t || ""); return m ? MONTHS[m[1].toLowerCase()] : null; };
// last month named in the text (headings just before a table name its month)
const lastMonthOf = t => { const all = [...String(t || "").matchAll(/(january|february|march|april|\bjan\b|\bfeb\b|\bmar\b|\bapr\b)/gi)]; return all.length ? MONTHS[all[all.length - 1][1].toLowerCase()] : null; };
const dayOfText = t => {   // "January 22" first: in "Session 1 January 22" the leading "1" is not the day
  let m = /(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?)\s+(\d{1,2})\b/i.exec(t || "");
  if(m) return +m[1];
  m = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr)/i.exec(t || "");
  return m ? +m[1] : null;
};

export const shiftKey = (month, day, shift) => `${month}-${day}-${shift}`;

// -> {shifts: {"jan-22-1": [[marks, pct], ...]}, general: [[marks, pct], ...]|null}
// Several tables can describe the same shift (a short summary and a long one); the one with the most rows wins.
export function parseShiftTables(html){
  const shifts = {};
  const put = (key, anchors) => {
    const clean = anchors.filter(a => a[0] != null && a[1] != null);
    if(clean.length >= 3 && (!shifts[key] || clean.length > shifts[key].length)) shifts[key] = clean;
  };
  let general = null;
  for(const {rows, context} of extractTables(html)){
    // title row (a single wide cell) names the date for sites that stack one table per date
    const title = rows[0].length === 1 ? rows[0][0] : "";
    const body = title ? rows.slice(1) : rows;
    const head = body[0] || [];
    const data = body.slice(1);
    if(!head.length || !data.length) continue;
    const ctxMonth = lastMonthOf(title + " " + context);
    const titleDay = dayOfText(title);

    if(/percentile|%ile|%tile/i.test(head[0]) && head.length >= 2 && !/marks|score/i.test(head[0])){
      // percentile down the side, one column per shift
      head.slice(1).forEach((h, ci) => {
        const sl = shiftLabel(h, ctxMonth);
        if(!sl) return;
        const day = sl.day ?? titleDay, month = sl.month || monthOfText(title) || ctxMonth;
        if(!day || !month) return;
        put(shiftKey(month, day, sl.shift), data.map(r => [marksOf(r[ci + 1] ?? ""), percentileOf(r[0] ?? "")]).map(([m, p]) => [m, p]));
      });
    } else if(/^shifts?\b/i.test(head[0]) && head.length >= 3){
      // shifts down the side, one column per percentile
      const pcts = head.slice(1).map(percentileOf);
      if(pcts.filter(p => p != null).length < 3) continue;
      for(const r of data){
        const sl = shiftLabel(r[0] ?? "", ctxMonth);
        if(!sl || !sl.day || !sl.month) continue;
        put(shiftKey(sl.month, sl.day, sl.shift), pcts.map((p, ci) => [marksOf(r[ci + 1] ?? ""), p]));
      }
    } else if(/marks|score/i.test(head[0]) && /percentile/i.test(head[1] || "") && !general){
      // session-wide bands "300-291 | 100-99.999"
      const pts = [];
      for(const r of data){
        const mm = /^(-?\d{1,3})\s*-\s*(-?\d{1,3})$/.exec((r[0] || "").replace(/\s+/g, " ").trim());
        const pp = /^(\d{1,3}(?:\.\d+)?)\s*-\s*(\d{1,3}(?:\.\d+)?)$/.exec((r[1] || "").replace(/\s+/g, "").replace(/-/g, " - ").replace(/\s+/g, " ").trim()) || /^(\d{1,3}(?:\.\d+)?)$/.exec((r[1] || "").trim());
        const single = /^(-?\d{1,3})$/.exec((r[0] || "").trim());
        if(mm && pp){
          const a = +mm[1], b = +mm[2];
          const hiM = Math.max(a, b), loM = Math.min(a, b);
          const p1 = +pp[1], p2 = pp[2] != null ? +pp[2] : p1;
          pts.push([hiM, Math.max(p1, p2)], [loM, Math.min(p1, p2)]);
        } else if(single && pp) pts.push([+single[1], +pp[1]]);
      }
      if(pts.length >= 10) general = pts;
    }
  }
  return {shifts, general};
}
