import {describe, expect, it} from "vitest";
import fs from "node:fs";
import {rawPapers} from "./setup";

const figs = JSON.parse(fs.readFileSync(new URL("../public/data/figs.json", import.meta.url), "utf8"));
const each = fn => rawPapers.forEach(p=>p.questions.forEach(q=>fn(p, q, `${p.id}#${q.n}`)));

describe("question bank", ()=>{
  it("paper ids are unique and follow jee-YYYY-DDmon-sN", ()=>{
    const ids = rawPapers.map(p=>p.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach(id=>expect(id).toMatch(/^jee-\d{4}-\d{1,2}[a-z]{3}-s\d+$/));
  });
  it("every paper has 20 MCQ per subject and 5 (or 10, answer any 5) numericals", ()=>{
    for(const p of rawPapers){
      const nums = p.format ? 10 : 5;
      for(const s of ["Mathematics", "Physics", "Chemistry"]){
        const qs = p.questions.filter(q=>q.subject===s);
        expect(qs.filter(q=>q.type==="MCQ").length, `${p.id} ${s} MCQ`).toBe(20);
        expect(qs.filter(q=>q.type==="NUM").length, `${p.id} ${s} NUM`).toBe(nums);
      }
      expect(new Set(p.questions.map(q=>q.n)).size, p.id).toBe(p.questions.length);
    }
  });
  it("every answer key is usable", ()=>{
    each((p, q, tag)=>{
      expect(String(q.chapter || "").trim(), tag).not.toBe("");
      if(q.type==="MCQ"){
        expect(q.options.length, tag).toBe(4);
        const ids = q.options.map(o=>o.id);
        if(!q.bonus) expect(ids, tag).toContain(String(q.answer));
        (q.altAnswers || []).forEach(a=>expect(ids, tag).toContain(String(a)));
      } else if(!q.bonus){
        expect(Number.isFinite(Number(q.answer)) && String(q.answer).trim()!=="", tag).toBe(true);
      }
    });
  });
  it("two options with the same text are both accepted (or neither is the key)", ()=>{
    each((p, q, tag)=>{
      if(q.type!=="MCQ" || q.bonus) return;
      const ok = new Set([q.answer, ...(q.altAnswers || [])].map(String));
      const keyTexts = new Set(q.options.filter(o=>ok.has(o.id)).map(o=>String(o.text).trim()));
      q.options.forEach(o=>{ if(!ok.has(o.id)) expect(keyTexts.has(String(o.text).trim()), `${tag} option ${o.id} has the same text as the key`).toBe(false); });
    });
  });
  it("every figure a question points to exists on disk", ()=>{
    const files = new Set(fs.readdirSync(new URL("../public/figs/", import.meta.url)));
    Object.entries(figs).forEach(([id, f])=>expect(files.has(f.file), id).toBe(true));
    each((p, q, tag)=>{
      const text = [q.text, ...(q.options || []).map(o=>o.text)].join(" ");
      for(const m of text.matchAll(/\[\[img:([^\]]+)\]\]/g)) expect(figs[m[1]], `${tag} figure ${m[1]}`).toBeTruthy();
    });
  });
});
