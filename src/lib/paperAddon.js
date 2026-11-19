// Validation of a paper add-on file ("jee-cbt-paper-addon-v1"): one new paper plus the figures it uses.
// The rules are the ones in Master_Prompt_Addon_JSON_2024_and_older.md (and its 75-question twin). This module is pure
// (no storage, no DOM) so it can be tested on its own; the app passes in what already exists (ids, figures, chapters).

export const ADDON_FORMAT = "jee-cbt-paper-addon-v1";
export const SUBJECTS = ["Mathematics", "Physics", "Chemistry"];
const PAPER_ID = /^jee-(\d{4})-(\d{1,2})([a-z]{3})-s(\d+)$/;
const FIG_ID = /^\w+$/;
const FIG_URI = /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/;
const NUM_ANSWER = /^-?(\d+\.?\d*|\.\d+)$/;
const OPTION_IDS = ["A", "B", "C", "D"];
const PAPER_KEYS = new Set(["id", "name", "shortName", "percentileUrl", "format", "questions"]);
const QUESTION_KEYS = new Set(["n", "subject", "chapter", "type", "text", "options", "answer", "altAnswers", "range", "bonus", "svg"]);
const IMG_REF = /\[\[img:(\w+)\]\]/g;
const MONTHS = new Set(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]);

const isObj = v => v && typeof v === "object" && !Array.isArray(v);
const str = v => typeof v === "string" && v.trim() !== "";

// Things that show up literally on screen because the app renders plain text + $...$ only.
function textProblems(t){
  const out = [];
  if(t.includes("**")) out.push("contains ** (Markdown is not rendered)");
  if(/^\s*\|/m.test(t)) out.push("has a line starting with | (a text table; tables must be images)");
  if(t.includes("`")) out.push("contains a backtick");
  if(/<br\s*\/?>|<table|&nbsp;/i.test(t)) out.push("contains HTML (<br>, <table> or &nbsp;)");
  if(/^\s*#{1,6}\s/m.test(t)) out.push("has a line starting with # (Markdown heading)");
  const dollars = (t.replace(/\\\$/g, "").match(/\$/g) || []).length;
  if(dollars % 2) out.push("has an odd number of $ signs (unclosed maths)");
  return out;
}

/**
 * @param {unknown} data   the parsed JSON file
 * @param {{paperIds?:Iterable<string>, customIds?:Iterable<string>, figureIds?:Iterable<string>, chapters?:Record<string,Iterable<string>>, canonicalChapter?:(s:string,c:string)=>string}} ctx
 * @returns {{errors:string[], warnings:string[], paper:object|null, figures:object, summary:object|null}}
 *   paper/figures are the cleaned copies to store (only when there are no errors).
 */
export function validateAddon(data, ctx = {}){
  const errors = [], warnings = [];
  const fail = m => { if(errors.length < 40) errors.push(m); };
  const warn = m => { if(warnings.length < 40) warnings.push(m); };
  const result = () => ({errors, warnings, paper:null, figures:{}, summary:null});

  if(!isObj(data)) { fail("This file is not a paper add-on (the top level must be a JSON object)."); return result(); }
  if(data.format !== ADDON_FORMAT){ fail(`Wrong "format": expected "${ADDON_FORMAT}"${data.format ? `, found "${String(data.format).slice(0, 60)}"` : " (missing)"}. Is this the add-on file made with the master prompt?`); return result(); }
  const p = data.paper;
  if(!isObj(p)){ fail('Missing "paper" object.'); return result(); }
  const figuresIn = data.figures === undefined ? {} : data.figures;
  if(!isObj(figuresIn)){ fail('"figures" must be an object ({"id": {"w", "h", "uri"}}).'); return result(); }

  // ----- identity -----
  const idm = typeof p.id === "string" ? PAPER_ID.exec(p.id) : null;
  if(!idm) fail(`Paper id "${String(p.id)}" must look like jee-2024-27jan-s1 (lowercase 3-letter month, no zero padding).`);
  else {
    if(!MONTHS.has(idm[3])) fail(`Paper id "${p.id}": "${idm[3]}" is not a month.`);
    const day = Number(idm[2]); if(day < 1 || day > 31) fail(`Paper id "${p.id}": day ${day} is not a date.`);
    if(/^0/.test(idm[2])) fail(`Paper id "${p.id}": the day must not be zero-padded (use 5apr, not 05apr).`);
    if(new Set(ctx.paperIds || []).has(p.id)) fail(`A paper with the id "${p.id}" is already in the app.`);
    else if(new Set(ctx.customIds || []).has(p.id)) fail(`You already added "${p.id}". Remove it from the list first if you want to replace it.`);
  }
  if(!str(p.name)) fail('Missing "name" (for example "JEE Main 2024 (27 Jan Shift 1)").');
  if(!str(p.shortName)) fail('Missing "shortName" (for example "27 Jan Shift 1").');
  if("marking" in p) fail('"marking" is not allowed: the marking scheme is fixed (+4 / -1 / 0) for every paper.');
  if(p.percentileUrl !== undefined){
    if(typeof p.percentileUrl !== "string" || !/^https?:\/\/\S+$/.test(p.percentileUrl) || p.percentileUrl.length >= 600)
      fail('"percentileUrl" must be one plain http(s) link without spaces, under 600 characters (or leave it out).');
  } else warn("No percentileUrl: the results page will not show a percentile link for this paper.");
  Object.keys(p).forEach(k => { if(!PAPER_KEYS.has(k) && k !== "marking") warn(`Paper key "${k}" is not used by the app and was ignored.`); });

  // ----- format / structure -----
  let numToAttempt = null;
  if(p.format !== undefined){
    if(!isObj(p.format) || !Number.isInteger(p.format.numToAttempt) || p.format.numToAttempt < 1) fail('"format" must be {"numToAttempt": 5} (or left out for 75-question papers).');
    else numToAttempt = p.format.numToAttempt;
  }
  if(!Array.isArray(p.questions) || !p.questions.length){ fail('"questions" must be a non-empty list.'); return result(); }
  const qs = p.questions;

  // ----- figures -----
  const knownFigs = new Set(ctx.figureIds || []);
  const ownFigs = {};
  Object.keys(figuresIn).forEach(id => {
    const f = figuresIn[id];
    if(!FIG_ID.test(id)) return fail(`Figure id "${id.slice(0, 40)}": only letters, digits and underscore are allowed.`);
    if(knownFigs.has(id)) return fail(`Figure id "${id}" already exists in the app. Figure ids must start with a prefix that is unique to this paper.`);
    if(!isObj(f)) return fail(`Figure "${id}" must be {"w", "h", "uri"}.`);
    if(!(f.w > 0 && f.w <= 6000) || !(f.h > 0 && f.h <= 6000)) return fail(`Figure "${id}": w and h must be positive numbers (CSS pixels).`);
    if(typeof f.uri !== "string" || !FIG_URI.test(f.uri)) return fail(`Figure "${id}": "uri" must be a base64 data URI of a png, jpeg, webp, gif or svg image.`);
    ownFigs[id] = {w:Number(f.w), h:Number(f.h), uri:f.uri};
  });
  const usedFigs = new Set();
  const ref = (t, where) => {
    if(typeof t !== "string") return;
    for(const m of t.matchAll(IMG_REF)){
      usedFigs.add(m[1]);
      if(!ownFigs[m[1]] && !knownFigs.has(m[1])) fail(`${where}: [[img:${m[1]}]] has no figure in the "figures" section.`);
    }
  };

  // ----- questions -----
  const cleanQs = [], seenN = new Set(), chapterWarned = new Set();
  const chapters = ctx.chapters || {};
  const canon = ctx.canonicalChapter || ((s, c) => c);
  qs.forEach((q, i) => {
    const where = `Question #${isObj(q) && q.n !== undefined ? q.n : i + 1}`;
    if(!isObj(q)) return fail(`${where} is not an object.`);
    if(!Number.isInteger(q.n) || q.n < 1) return fail(`${where}: "n" must be a whole number from 1.`);
    if(seenN.has(q.n)) return fail(`Question number ${q.n} appears twice.`);
    seenN.add(q.n);
    if(!SUBJECTS.includes(q.subject)) return fail(`${where}: subject must be exactly Mathematics, Physics or Chemistry (found "${String(q.subject)}").`);
    if(q.type !== "MCQ" && q.type !== "NUM") return fail(`${where}: type must be MCQ or NUM (found "${String(q.type)}").`);
    if(!str(q.chapter)) fail(`${where}: missing chapter.`);
    else {
      if(q.chapter.includes("/")) warn(`${where}: chapter "${q.chapter}" is a combined label with a slash; use one chapter name.`);
      const known = chapters[q.subject];
      if(known && !new Set(known).has(canon(q.subject, q.chapter)) && !chapterWarned.has(q.subject + "|" + q.chapter)){
        chapterWarned.add(q.subject + "|" + q.chapter);
        warn(`New chapter name "${q.chapter}" (${q.subject}): no existing paper uses it. Check it is not a spelling variant of an existing chapter.`);
      }
    }
    if(!str(q.text)) fail(`${where}: missing question text.`);
    else { ref(q.text, where); textProblems(q.text).forEach(m => warn(`${where}: text ${m}.`)); }
    Object.keys(q).forEach(k => { if(!QUESTION_KEYS.has(k)) warn(`${where}: key "${k}" is not used by the app and was ignored.`); });
    if(q.svg !== undefined){
      if(typeof q.svg !== "string" || !FIG_ID.test(q.svg) || !(ownFigs[q.svg] || knownFigs.has(q.svg))) fail(`${where}: "svg" must be the id of a figure.`);
      else usedFigs.add(q.svg);
    }
    const out = {n:q.n, subject:q.subject, chapter:str(q.chapter) ? q.chapter.trim() : q.chapter, type:q.type, text:q.text};
    const bonus = q.bonus === true;
    if(q.bonus !== undefined && typeof q.bonus !== "boolean") fail(`${where}: "bonus" must be true or false.`);
    if(q.type === "MCQ"){
      const opts = q.options;
      if(!Array.isArray(opts) || opts.length !== 4 || opts.some((o, k) => !isObj(o) || o.id !== OPTION_IDS[k] || !str(o.text))){
        fail(`${where}: an MCQ needs exactly four options with ids A, B, C, D (in that order), each with text.`);
      } else {
        opts.forEach(o => { ref(o.text, `${where} option ${o.id}`); textProblems(o.text).forEach(m => warn(`${where} option ${o.id}: text ${m}.`)); });
        out.options = opts.map(o => ({id:o.id, text:o.text}));
        if(!bonus && !OPTION_IDS.includes(q.answer)) fail(`${where}: answer must be A, B, C or D (found "${String(q.answer)}").`);
        if(q.altAnswers !== undefined){
          if(!Array.isArray(q.altAnswers) || q.altAnswers.some(a => !OPTION_IDS.includes(a))) fail(`${where}: altAnswers must be a list of option ids (A to D).`);
          else if(q.altAnswers.length) out.altAnswers = [...q.altAnswers];
        }
      }
      if(q.range !== undefined) fail(`${where}: "range" is only for numerical questions.`);
    } else {
      if(q.options !== undefined) fail(`${where}: a numerical question must not have "options".`);
      if(q.altAnswers !== undefined) fail(`${where}: "altAnswers" is only for MCQ questions.`);
      if(!bonus && !(typeof q.answer === "string" && NUM_ANSWER.test(q.answer.trim()))) fail(`${where}: the answer must be a plain number stored as text, for example "673" (found ${JSON.stringify(q.answer)}).`);
      if(q.range !== undefined){
        if(!Array.isArray(q.range) || q.range.length !== 2 || !q.range.every(Number.isFinite) || q.range[0] > q.range[1]) fail(`${where}: range must be [low, high] with low <= high.`);
        else {
          out.range = [...q.range];
          if(NUM_ANSWER.test(String(q.answer).trim()) && (Number(q.answer) < q.range[0] || Number(q.answer) > q.range[1])) warn(`${where}: the answer is outside its own range.`);
        }
      }
    }
    if(q.answer !== undefined) out.answer = typeof q.answer === "string" ? q.answer.trim() : q.answer;
    else if(bonus) out.answer = q.type === "MCQ" ? "A" : "0";
    if(bonus) out.bonus = true;
    if(q.svg !== undefined && typeof q.svg === "string") out.svg = q.svg;
    cleanQs.push(out);
  });

  // ----- shape of the whole paper: the two layouts JEE Main has used -----
  const numbers = [...seenN].sort((a, b) => a - b);
  const total = numbers.length;
  const per = {};
  SUBJECTS.forEach(s => { per[s] = {MCQ:cleanQs.filter(q => q.subject === s && q.type === "MCQ").length, NUM:cleanQs.filter(q => q.subject === s && q.type === "NUM").length}; });
  const layout90 = numToAttempt === 5, layout75 = numToAttempt === null;
  if(numToAttempt !== null && numToAttempt !== 5) fail(`"numToAttempt" is ${numToAttempt}; the supported 90-question format uses 5.`);
  else {
    const wantNum = layout90 ? 10 : 5, want = layout90 ? 90 : 75;
    if(total !== want) fail(`${total} questions found; a ${want}-question paper ${layout90 ? '(with "numToAttempt": 5)' : "(no format key)"} needs exactly ${want}. ${layout75 && total === 90 ? 'For a 90-question paper add "format": {"numToAttempt": 5}.' : ""}`.trim());
    SUBJECTS.forEach(s => { if(per[s].MCQ !== 20 || per[s].NUM !== wantNum) fail(`${s}: found ${per[s].MCQ} MCQ + ${per[s].NUM} numerical; expected 20 MCQ + ${wantNum} numerical.`); });
    if(total === want && numbers.some((n, k) => n !== k + 1)) fail(`Question numbers must run 1 to ${want} with no gaps.`);
  }
  Object.keys(ownFigs).forEach(id => { if(!usedFigs.has(id)) warn(`Figure "${id}" is not used by any question.`); });

  if(errors.length) return {errors, warnings, paper:null, figures:{}, summary:null};
  const paper = {id:p.id, name:p.name.trim(), shortName:p.shortName.trim(), questions:cleanQs.sort((a, b) => a.n - b.n)};
  if(p.percentileUrl) paper.percentileUrl = p.percentileUrl;
  if(numToAttempt !== null) paper.format = {numToAttempt};
  const figures = {}; usedFigs.forEach(id => { if(ownFigs[id]) figures[id] = ownFigs[id]; });
  // figures nobody uses are dropped (they only waste space), but were already reported above
  return {errors, warnings, paper, figures, summary:{id:p.id, name:paper.name, shortName:paper.shortName, total, per, figures:Object.keys(figures).length, layout:layout90 ? "90 questions, answer any 5 of 10 numericals" : "75 questions"}};
}
