// Builds the request sent to Claude for one question. Everything comes from the question bank on disk, never from the browser,
// so the endpoint can only be used to explain questions that exist in this app.
import {existsSync, readFileSync} from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
let PAPERS = null, FIGS = null;
function papers(){
  if(!PAPERS) PAPERS = new Map(JSON.parse(readFileSync(path.join(ROOT, "public/data/papers.json"), "utf8")).map(p => [p.id, p]));
  return PAPERS;
}
function figTable(){
  if(!FIGS) FIGS = JSON.parse(readFileSync(path.join(ROOT, "public/data/figs.json"), "utf8"));
  return FIGS;
}
export function findQuestion(paperId, n){
  const p = papers().get(paperId);
  const q = p && p.questions.find(x => x.n === n);
  return q ? {paper: p, q} : null;
}

const MAX_FIGURES = 6;
const MEDIA = {".webp":"image/webp", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg"};
export function figureBlock(id){
  const f = figTable()[id]; if(!f) return null;
  const file = path.join(ROOT, "public/figs", path.basename(f.file));   // basename: no path tricks
  if(!existsSync(file)) return null;
  const ext = path.extname(file).toLowerCase();
  if(ext === ".svg") return {kind:"svg", text: readFileSync(file, "utf8")};        // SVG is not an accepted image type: send the markup as text
  if(!MEDIA[ext]) return null;
  return {kind:"image", block:{type:"image", source:{type:"base64", media_type: MEDIA[ext], data: readFileSync(file).toString("base64")}}};
}

export function answerText(q){
  let s = String(q.answer);
  if(q.type === "NUM" && Array.isArray(q.range) && q.range.length === 2) s = `${q.range[0]} to ${q.range[1]}`;
  else if(Array.isArray(q.altAnswers) && q.altAnswers.length) s = [q.answer, ...q.altAnswers].join(" or ");
  return s;
}

export const SYSTEM = `You are an experienced JEE Main teacher explaining one past-paper question to a student who got it wrong or skipped it.

Solve the question yourself first and do not assume the answer key is right: past-paper keys sometimes contain errors. Then write the explanation.

Format rules (the text is shown in an app that renders LaTeX but not Markdown):
- Plain text only. No Markdown: no #, *, **, backticks, tables or bullet symbols.
- Write all mathematics in LaTeX: inline between single dollar signs ($x^2$), standalone equations between double dollar signs ($$...$$) on their own line. Never put plain-text maths like x^2 or sqrt(x) outside dollar signs.
- Use exactly these section labels, each at the start of its own line, in this order: "Idea:", "Solution:", "Answer:", and, for multiple-choice questions only, "Why the other options fail:", then "Watch out:".
- Idea: one or two sentences naming the concept or trick that unlocks the problem.
- Solution: short numbered steps, one per line ("1. ...", "2. ..."), each doing one thing. Keep it as brief as a good tutor would; skip trivial algebra but show every step a student could get wrong.
- Answer: the final answer in the form the question asks for (the option letter and its value, or the number).
- Why the other options fail: one short line per remaining option, saying what mistake leads to it.
- Watch out: the single most common trap on this question.
- Keep the whole explanation under about 350 words.
- The very last line must be exactly one of: "KEY-CHECK: AGREES" (your answer matches the official key) or "KEY-CHECK: DIFFERS <your answer>" (your careful working gives a different answer; in the Answer section, say plainly that your working disagrees with the key and why).`;

// returns {system, content:[...blocks]}
export function buildRequest(paper, q){
  const figures = []; let svgNotes = [];
  const label = id => {
    let i = figures.findIndex(f => f.id === id);
    if(i < 0){ if(figures.length >= MAX_FIGURES) return "[figure not shown]"; figures.push({id, data: figureBlock(id)}); i = figures.length - 1; }
    return `[Figure ${i + 1}]`;
  };
  const inline = t => String(t ?? "").replace(/\[\[img:(\w+)\]\]/g, (m, id) => label(id));
  let text = `Subject: ${q.subject}\nChapter: ${q.chapter}\nExam: ${paper.name}, question ${q.n}\nType: ${q.type === "NUM" ? "Numerical (the answer is a number; JEE rounds to the nearest integer)" : "Single correct option"}\n\nQuestion:\n${inline(q.text)}\n`;
  if(q.svg) text += `\n${label(q.svg)} accompanies the question.\n`;
  if(q.options && q.options.length) text += "\nOptions:\n" + q.options.map(o => `(${o.id}) ${inline(o.text)}`).join("\n") + "\n";
  text += `\nOfficial answer key: ${answerText(q)}\n`;

  const content = [{type:"text", text}];
  figures.forEach((f, i) => {
    if(!f.data) return;
    if(f.data.kind === "image"){ content.push({type:"text", text:`Figure ${i + 1}:`}); content.push(f.data.block); }
    else svgNotes.push(`Figure ${i + 1} (SVG markup):\n${f.data.text}`);
  });
  if(svgNotes.length) content.push({type:"text", text: svgNotes.join("\n\n")});
  content.push({type:"text", text:"Please explain this question following the format rules."});
  return {system: SYSTEM, content, figureCount: figures.length};
}
