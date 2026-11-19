import {describe, expect, it} from "vitest";
import {rawPapers} from "./setup";
import {validateAddon, ADDON_FORMAT} from "../src/lib/paperAddon";
import {attemptKeyOfEntry, describeCounts, mergeBackup, parseBackup} from "../src/lib/backupMerge";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const clone = o => JSON.parse(JSON.stringify(o));
// a real paper from the bank, re-labelled as a new paper, with a stand-in picture for every figure it uses
function addonFrom(srcId, newId){
  const paper = clone(rawPapers.find(p => p.id === srcId)); paper.id = newId;
  const figures = {};
  JSON.stringify(paper).replace(/\[\[img:(\w+)\]\]/g, (m, id) => { figures[id] = {w:10, h:10, uri:PNG}; });
  paper.questions.forEach(q => { if(q.svg) figures[q.svg] = {w:10, h:10, uri:PNG}; });
  return {format:ADDON_FORMAT, paper, figures};
}
const ctx = {paperIds:rawPapers.map(p => p.id), figureIds:[]};
const first = (r, re) => r.errors.find(e => re.test(e));

describe("paper add-on validation", ()=>{
  it("accepts a 75-question and a 90-question paper from the real bank", ()=>{
    for(const [src, id] of [["jee-2025-22jan-s1", "jee-2030-1jan-s1"], ["jee-2024-4apr-s2", "jee-2030-2jan-s2"]]){
      const r = validateAddon(addonFrom(src, id), ctx);
      expect(r.errors, src).toEqual([]);
      expect(r.paper.id).toBe(id);
      expect(r.summary.total).toBe(src.startsWith("jee-2025") ? 75 : 90);
    }
  });
  it("rejects the wrong format, a taken id and a bad id", ()=>{
    expect(validateAddon({...addonFrom("jee-2025-22jan-s1", "jee-2030-1jan-s1"), format:"x"}, ctx).errors[0]).toMatch(/format/);
    expect(first(validateAddon(addonFrom("jee-2025-22jan-s1", "jee-2025-22jan-s1"), ctx), /already in the app/)).toBeTruthy();
    expect(first(validateAddon(addonFrom("jee-2025-22jan-s1", "jee-2030-01jan-s1"), ctx), /zero-padded/)).toBeTruthy();
    expect(validateAddon(addonFrom("jee-2025-22jan-s1", "paper-1"), ctx).errors[0]).toMatch(/must look like/);
    expect(first(validateAddon(addonFrom("jee-2025-22jan-s1", "jee-2030-1jan-s1"), {...ctx, customIds:["jee-2030-1jan-s1"]}), /already added/)).toBeTruthy();
  });
  it("enforces the paper structure", ()=>{
    const a = addonFrom("jee-2025-22jan-s1", "jee-2030-1jan-s1"); a.paper.questions.pop();
    expect(first(validateAddon(a, ctx), /74 questions/)).toBeTruthy();
    const b = addonFrom("jee-2024-4apr-s2", "jee-2030-1jan-s1"); delete b.paper.format;
    expect(first(validateAddon(b, ctx), /expected 20 MCQ \+ 5/)).toBeTruthy();
    const c = addonFrom("jee-2025-22jan-s1", "jee-2030-1jan-s1"); c.paper.questions[3].n = 1;
    expect(first(validateAddon(c, ctx), /appears twice/)).toBeTruthy();
    const d = addonFrom("jee-2025-22jan-s1", "jee-2030-1jan-s1"); d.paper.marking = {correct:4};
    expect(first(validateAddon(d, ctx), /marking/)).toBeTruthy();
  });
  it("checks answers, options and figure links", ()=>{
    const a = addonFrom("jee-2025-22jan-s1", "jee-2030-1jan-s1");
    const mcq = a.paper.questions.find(q => q.type === "MCQ"), num = a.paper.questions.find(q => q.type === "NUM");
    mcq.answer = "E"; num.answer = "abc"; mcq.text += " [[img:nope_fig]]";
    const r = validateAddon(a, ctx);
    expect(first(r, /answer must be A, B, C or D/)).toBeTruthy();
    expect(first(r, /plain number/)).toBeTruthy();
    expect(first(r, /nope_fig/)).toBeTruthy();
  });
  it("rejects figures that clash with the app's or are not images", ()=>{
    const a = addonFrom("jee-2024-4apr-s2", "jee-2030-1jan-s1"); const id = Object.keys(a.figures)[0];
    expect(first(validateAddon(a, {...ctx, figureIds:[id]}), /already exists/)).toBeTruthy();
    a.figures[id].uri = 'data:text/html;base64,PHNjcmlwdD4=';
    expect(first(validateAddon(a, ctx), /base64 data URI/)).toBeTruthy();
    a.figures[id].uri = 'javascript:alert(1)';
    expect(first(validateAddon(a, ctx), /base64 data URI/)).toBeTruthy();
  });
  it("only accepts a plain http(s) percentile link", ()=>{
    const a = addonFrom("jee-2025-22jan-s1", "jee-2030-1jan-s1");
    a.paper.percentileUrl = "javascript:alert(1)";
    expect(first(validateAddon(a, ctx), /percentileUrl/)).toBeTruthy();
    a.paper.percentileUrl = "https://example.com/marks vs percentile";
    expect(first(validateAddon(a, ctx), /percentileUrl/)).toBeTruthy();
    a.paper.percentileUrl = "https://example.com/p";
    expect(validateAddon(a, ctx).errors).toEqual([]);
  });
  it("warns, without blocking, about text the app cannot show", ()=>{
    const a = addonFrom("jee-2025-22jan-s1", "jee-2030-1jan-s1");
    a.paper.questions[0].text = "**Bold** and | a | b |\n| 1 | 2 | and $x";
    const r = validateAddon(a, ctx);
    expect(r.errors).toEqual([]);
    expect(r.warnings.join("\n")).toMatch(/\*\*/); expect(r.warnings.join("\n")).toMatch(/\|/); expect(r.warnings.join("\n")).toMatch(/odd number of \$/);
  });
  it("keeps only the fields the app uses", ()=>{
    const a = addonFrom("jee-2025-22jan-s1", "jee-2030-1jan-s1"); a.paper.questions[0].solution = "x"; a.paper.junk = 1;
    const r = validateAddon(a, ctx);
    expect(r.paper.junk).toBeUndefined(); expect(r.paper.questions[0].solution).toBeUndefined();
    expect(r.warnings.some(w => /"solution"/.test(w))).toBe(true);
  });
});

const hist = (paperId, startedAt) => ({testName:paperId, score:10, snapshot:{paperId, startedAt, perQ:{}}});
const J = JSON.stringify;
describe("append backup", ()=>{
  it("parses this app's backups and raw localStorage dumps, and refuses other files", ()=>{
    expect(Object.keys(parseBackup(J({format:"jee-cbt-backup", data:{jee_cbt_a:"1", other:"2"}})))).toEqual(["jee_cbt_a"]);
    expect(Object.keys(parseBackup(J({jee_cbt_a:"1"})))).toEqual(["jee_cbt_a"]);
    expect(()=>parseBackup(J([1]))).toThrow(); expect(()=>parseBackup(J({a:"1"}))).toThrow(); expect(()=>parseBackup("nope")).toThrow();
  });
  it("adds only the attempts that are missing and keeps the current ones untouched", ()=>{
    const cur = {jee_cbt_history_v1:J([hist("p", 300), hist("p", 100)])};
    const inc = {jee_cbt_history_v1:J([hist("p", 300), hist("p", 200), hist("q", 50)])};
    const m = mergeBackup(cur, inc);
    expect(m.counts["test attempts"]).toBe(2);
    expect(JSON.parse(m.writes.jee_cbt_history_v1).map(e => attemptKeyOfEntry(e))).toEqual(["p:300", "p:200", "p:100", "q:50"]);
    expect(Object.keys(mergeBackup(cur, cur).writes)).toEqual([]);   // appending the same data again changes nothing
  });
  it("never overwrites a note, but adds notes for other questions and carries their highlights", ()=>{
    const cur = {jee_cbt_notes_v1:J({"p:1":{"5":"mine"}}), jee_cbt_note_hl_v1:J({"p:1":{"5":[[0, 2]]}})};
    const inc = {jee_cbt_notes_v1:J({"p:1":{"5":"theirs", "6":"new"}, "p:2":{"1":"other attempt"}}), jee_cbt_note_hl_v1:J({"p:1":{"5":[[1, 3]], "6":[[0, 1]]}})};
    const m = mergeBackup(cur, inc);
    expect(JSON.parse(m.writes.jee_cbt_notes_v1)).toEqual({"p:1":{"5":"mine", "6":"new"}, "p:2":{"1":"other attempt"}});
    expect(JSON.parse(m.writes.jee_cbt_note_hl_v1)).toEqual({"p:1":{"5":[[0, 2]], "6":[[0, 1]]}});
    expect(m.counts.notes).toBe(2);
  });
  it("unions lists, merges the Mistake Book and keeps newer revision progress", ()=>{
    const mk = (hits, extra = {}) => ({key:"p:3", paperId:"p", n:3, hits, misses:hits.length, status:"active", box:0, due:10, reps:0, lapses:0, lastReviewed:null, log:[], rule:"", addedAt:1, ...extra});
    const cur = {jee_cbt_starred_questions_v1:J([{paperId:"p", n:1}]), jee_cbt_mistakes_v1:J({"p:3":mk([{a:"p:1", at:1}], {box:1, lastReviewed:5})})};
    const inc = {jee_cbt_starred_questions_v1:J([{paperId:"p", n:1}, {paperId:"p", n:2}]),
      jee_cbt_mistakes_v1:J({"p:3":mk([{a:"p:1", at:1}, {a:"p:9", at:9}], {box:3, lastReviewed:50, status:"mastered"}), "p:4":{key:"p:4", n:4, hits:[]}})};
    const m = mergeBackup(cur, inc);
    expect(JSON.parse(m.writes.jee_cbt_starred_questions_v1)).toHaveLength(2);
    const mist = JSON.parse(m.writes.jee_cbt_mistakes_v1);
    expect(mist["p:3"].hits).toHaveLength(2); expect(mist["p:3"].misses).toBe(2); expect(mist["p:3"].box).toBe(3); expect(mist["p:3"].status).toBe("mastered");
    expect(mist["p:4"]).toBeTruthy();
    expect(m.counts["Mistake Book questions"]).toBe(1);
  });
  it("fills in missing papers and settings, but never touches a running test or the theme", ()=>{
    const cur = {jee_cbt_profile_v1:J({name:"Me"})};
    const inc = {jee_cbt_profile_v1:J({name:"Other"}), jee_cbt_goal_v1:"x", "jee_cbt_cpaper_v1:jee-2030-1jan-s1":"{}", jee_cbt_active_v1:"{}", jee_cbt_theme_v1:"dark", jee_cbt_scratch_v1:"{}"};
    const m = mergeBackup(cur, inc);
    expect(Object.keys(m.writes).sort()).toEqual(["jee_cbt_goal_v1", "jee_cbt_cpaper_v1:jee-2030-1jan-s1"].sort());
    expect(describeCounts(m.counts).join()).toMatch(/1 added paper\b/);
  });
  it("skips damaged data instead of failing, and leaves an unreadable current value alone", ()=>{
    const m = mergeBackup({jee_cbt_notes_v1:"{broken"}, {jee_cbt_notes_v1:J({"p:1":{"1":"a"}}), jee_cbt_history_v1:"{bad"});
    expect(m.writes).toEqual({}); expect(m.notes).toHaveLength(2);
  });
});
