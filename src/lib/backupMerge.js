// "Append backup": add what a backup file has to what is already on this device, never replacing or removing anything.
// Pure functions over plain {key: jsonString} objects (the same shape as store.snapshot()), so they can be tested alone.
//
// Rules, per kind of data:
//   test attempts ........ added when that attempt (paper + start time) is not here yet
//   notes, highlights, pictures ... added per question when this device has none for that question
//   hidden / concealed / starred notes, starred questions, celebrated tests ... union
//   Mistake Book ......... new questions added; for a question on both sides the misses are combined and the
//                          revision state of whichever side was reviewed most recently is kept
//   practice ............. new sessions added; per question the counter with more attempts is kept
//   answer-key corrections, added papers, profile, goals, settings ... added when this device has none
//   a test or practice run in progress, rough work, last practice filters ... never touched
export const KEY_PREFIX = "jee_cbt_";
const K = {
  history:"jee_cbt_history_v1", notes:"jee_cbt_notes_v1", hl:"jee_cbt_note_hl_v1", img:"jee_cbt_note_img_v1",
  hidden:"jee_cbt_note_hidden_v1", concealed:"jee_cbt_note_concealed_v1", noteStarred:"jee_cbt_note_starred_v1",
  starQ:"jee_cbt_starred_questions_v1", mistakes:"jee_cbt_mistakes_v1", practice:"jee_cbt_practice_v1",
  keyOvr:"jee_cbt_key_overrides_v1", celebrated:"jee_cbt_celebrated_v1",
};
const NEVER = new Set(["jee_cbt_active_v1", "jee_cbt_practice_active_v1", "jee_cbt_scratch_v1", "jee_cbt_practice_cfg_v1", "jee_cbt_theme_v1", "jee_cbt_lastbackup_v1", "jee_cbt_selected_paper_v1", "jee_cbt_access_code_v1"]);
const CPAPER = "jee_cbt_cpaper_v1:";
const HISTORY_CAP = 100, MAX_HITS = 30, MAX_LOG = 40, MAX_SESSIONS = 60;

const isObj = v => v && typeof v === "object" && !Array.isArray(v);
const parse = raw => { if(raw == null || raw === "") return {ok:true, v:undefined}; try{ return {ok:true, v:JSON.parse(raw)}; }catch(e){ return {ok:false, v:undefined}; } };

// Accepts a backup made by this app, or a raw dump of the old single-file app's localStorage.
export function parseBackup(text){
  const obj = JSON.parse(text);
  if(!isObj(obj)) throw new Error("This file is not a backup.");
  const data = obj.format === "jee-cbt-backup" ? obj.data : obj;
  if(!isObj(data)) throw new Error("This backup has no data in it.");
  const out = {};
  Object.keys(data).forEach(k => { if(k.startsWith(KEY_PREFIX) && typeof data[k] === "string") out[k] = data[k]; });
  if(!Object.keys(out).length) throw new Error("No JEE CBT data found in this file.");
  return out;
}

export const attemptKeyOfEntry = e => (e && e.snapshot && e.snapshot.paperId && e.snapshot.startedAt) ? `${e.snapshot.paperId}:${e.snapshot.startedAt}` : null;

function mergeHistory(cur = [], inc = []){
  if(!Array.isArray(cur) || !Array.isArray(inc)) return null;
  const have = new Set(cur.map(e => attemptKeyOfEntry(e) || "raw:" + JSON.stringify(e)));
  const add = inc.filter(e => e && typeof e === "object" && !have.has(attemptKeyOfEntry(e) || "raw:" + JSON.stringify(e)));
  if(!add.length) return {value:cur, added:0};
  const all = [...cur, ...add].sort((a, b) => ((b.snapshot && b.snapshot.startedAt) || 0) - ((a.snapshot && a.snapshot.startedAt) || 0));   // newest first, as the app stores it
  return {value:all, added:add.length};
}
// {attemptKey: {questionNo: x}}: fills in questions this device has nothing for
function mergePerQuestion(cur, inc, occupied){
  if(!isObj(cur) || !isObj(inc)) return null;
  const out = {...cur}; let added = 0;
  Object.keys(inc).forEach(ak => {
    if(!isObj(inc[ak])) return;
    Object.keys(inc[ak]).forEach(qn => {
      if(occupied(ak, qn)) return;
      out[ak] = {...(out[ak] || {})}; out[ak][qn] = inc[ak][qn]; added++;
    });
  });
  return {value:out, added};
}
function mergeUnionList(cur = [], inc = [], keyOf = x => JSON.stringify(x)){
  if(!Array.isArray(cur) || !Array.isArray(inc)) return null;
  const have = new Set(cur.map(keyOf)), add = [];
  inc.forEach(x => { const k = keyOf(x); if(!have.has(k)){ have.add(k); add.push(x); } });
  return {value:add.length ? [...cur, ...add] : cur, added:add.length};
}
function mergeHidden(cur = {}, inc = {}){
  if(!isObj(cur) || !isObj(inc)) return null;
  const out = {...cur}; let added = 0;
  Object.keys(inc).forEach(ak => {
    if(!Array.isArray(inc[ak])) return;
    const have = new Set((out[ak] || []).map(String)), add = inc[ak].filter(q => !have.has(String(q)));
    if(add.length){ out[ak] = [...(out[ak] || []), ...add]; added += add.length; }
  });
  return {value:out, added};
}
function mergeMistake(a, b){
  const seen = new Set((a.hits || []).map(h => h.a));
  const newHits = (b.hits || []).filter(h => h && !seen.has(h.a));
  const logSeen = new Set((a.log || []).map(l => l.at));
  const newLog = (b.log || []).filter(l => l && !logSeen.has(l.at));
  if(!newHits.length && !newLog.length) return null;
  const base = (b.lastReviewed || 0) > (a.lastReviewed || 0) ? b : a;   // revision progress: whichever was reviewed most recently
  return {...a,
    hits:[...(a.hits || []), ...newHits].sort((x, y) => (x.at || 0) - (y.at || 0)).slice(-MAX_HITS),
    misses:(a.misses || 0) + newHits.length,
    log:[...(a.log || []), ...newLog].sort((x, y) => (x.at || 0) - (y.at || 0)).slice(-MAX_LOG),
    status:base.status, box:base.box, due:Math.min(a.due ?? base.due, b.due ?? base.due), reps:base.reps, lapses:base.lapses, lastReviewed:base.lastReviewed,
    rule:a.rule || b.rule || "", addedAt:Math.min(a.addedAt ?? b.addedAt, b.addedAt ?? a.addedAt)};
}
function mergeMistakes(cur = {}, inc = {}){
  if(!isObj(cur) || !isObj(inc)) return null;
  const out = {...cur}; let added = 0, merged = 0;
  Object.keys(inc).forEach(k => {
    if(!isObj(inc[k])) return;
    if(!out[k]){ out[k] = inc[k]; added++; return; }
    const m = mergeMistake(out[k], inc[k]); if(m){ out[k] = m; merged++; }
  });
  return {value:out, added, merged};
}
function mergePractice(cur, inc){
  const c = isObj(cur) ? cur : {q:{}, sessions:[]}, i = isObj(inc) ? inc : null;
  if(!i) return null;
  const q = {...(isObj(c.q) ? c.q : {})}; let merged = 0;
  Object.keys(isObj(i.q) ? i.q : {}).forEach(k => {
    const a = q[k], b = i.q[k]; if(!isObj(b)) return;
    if(!a || (b.a || 0) > (a.a || 0) || ((b.a || 0) === (a.a || 0) && (b.t || 0) > (a.t || 0))){ q[k] = b; merged++; }
  });
  const have = new Set((Array.isArray(c.sessions) ? c.sessions : []).map(s => s && s.id));
  const add = (Array.isArray(i.sessions) ? i.sessions : []).filter(s => s && !have.has(s.id));
  const added = add.length;
  const sessions = [...(Array.isArray(c.sessions) ? c.sessions : []), ...add].sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, MAX_SESSIONS);
  return {value:{...c, q, sessions}, added, merged};
}
function mergeKeyOverrides(cur = {}, inc = {}){
  if(!isObj(cur) || !isObj(inc)) return null;
  const out = {...cur}; let added = 0;
  Object.keys(inc).forEach(pid => {
    if(!isObj(inc[pid])) return;
    Object.keys(inc[pid]).forEach(n => { if(!(out[pid] && n in out[pid])){ out[pid] = {...(out[pid] || {}), [n]: inc[pid][n]}; added++; } });
  });
  return {value:out, added};
}

/**
 * @param {Record<string,string>} current  what is saved on this device (store.snapshot())
 * @param {Record<string,string>} incoming the backup's data
 * @returns {{writes:Record<string,string>, counts:Record<string,number>, notes:string[]}}
 *   writes: only the keys that change, with their new JSON text. counts: what was added, for the message.
 */
export function mergeBackup(current, incoming){
  const writes = {}, counts = {}, notes = [];
  const count = (label, n) => { if(n) counts[label] = (counts[label] || 0) + n; };
  const put = (key, value) => { writes[key] = typeof value === "string" ? value : JSON.stringify(value); };
  const get = key => parse(current[key]);
  const getIn = key => parse(incoming[key]);

  // generic runner: merge(curValue, incValue) -> {value, added...} | null (null = nothing usable / nothing to add)
  function run(key, label, merge){
    if(!(key in incoming)) return;
    const c = get(key), i = getIn(key);
    if(!c.ok){ notes.push(`Left "${label}" alone: the copy on this device could not be read.`); return; }
    if(!i.ok || i.v === undefined){ notes.push(`Skipped "${label}": it is damaged in the backup file.`); return; }
    const r = merge(c.v, i.v);
    if(!r){ notes.push(`Skipped "${label}": it has an unexpected shape in the backup file.`); return; }
    if(r.added || r.merged){ put(key, r.value); return r; }
    return r;
  }

  const hist = run(K.history, "test history", (c, i) => mergeHistory(c, i));
  if(hist) count("test attempts", hist.added);
  if(hist && hist.added && hist.value.length > HISTORY_CAP) notes.push(`Test History now holds ${hist.value.length} attempts; the app keeps the latest ${HISTORY_CAP}, so the oldest ones are dropped when your next test is saved.`);

  // notes, highlights and pictures: a question counts as "taken" when this device already has any of the three for it
  const cn = get(K.notes).v, ch = get(K.hl).v, ci = get(K.img).v;
  const has = (o, ak, qn) => isObj(o) && isObj(o[ak]) && Object.prototype.hasOwnProperty.call(o[ak], qn);
  const occupied = (ak, qn) => has(cn, ak, qn) || has(ch, ak, qn) || has(ci, ak, qn);
  const nr = run(K.notes, "notes", (c, i) => mergePerQuestion(c || {}, i, occupied)); if(nr) count("notes", nr.added);
  run(K.hl, "note highlights", (c, i) => mergePerQuestion(c || {}, i, occupied));
  const ir = run(K.img, "note pictures", (c, i) => mergePerQuestion(c || {}, i, occupied)); if(ir) count("note pictures", ir.added);
  run(K.hidden, "hidden notes", (c, i) => mergeHidden(c, i));
  run(K.concealed, "concealed notes", (c, i) => mergeUnionList(c, i, String));
  run(K.noteStarred, "starred notes", (c, i) => mergeUnionList(c, i, String));
  const sq = run(K.starQ, "starred questions", (c, i) => mergeUnionList(c, i, x => x && `${x.paperId}:${x.n}`)); if(sq) count("starred questions", sq.added);
  const mk = run(K.mistakes, "Mistake Book", (c, i) => mergeMistakes(c, i)); if(mk){ count("Mistake Book questions", mk.added); count("Mistake Book entries updated", mk.merged); }
  const pr = run(K.practice, "practice history", (c, i) => mergePractice(c, i)); if(pr) count("practice sessions", pr.added);
  const ko = run(K.keyOvr, "answer-key corrections", (c, i) => mergeKeyOverrides(c, i)); if(ko) count("answer-key corrections", ko.added);
  run(K.celebrated, "celebrations", (c, i) => mergeUnionList(c, i, String));

  // everything else (added papers, profile, goals, settings, keys from other versions): only filled in when missing here
  const special = new Set(Object.values(K));
  Object.keys(incoming).forEach(k => {
    if(special.has(k) || NEVER.has(k)) return;
    if(k in current) return;
    put(k, incoming[k]);
    count(k.startsWith(CPAPER) ? "added papers" : "other settings", 1);
  });
  return {writes, counts, notes};
}

const SINGULAR = {"test attempts":"test attempt", "notes":"note", "note pictures":"note picture", "starred questions":"starred question", "Mistake Book questions":"Mistake Book question",
  "Mistake Book entries updated":"Mistake Book entry updated", "practice sessions":"practice session", "answer-key corrections":"answer-key correction", "added papers":"added paper", "other settings":"other setting"};
export function describeCounts(counts){
  return Object.entries(counts).map(([label, n]) => `${n} ${n === 1 ? (SINGULAR[label] || label) : label}`);
}
