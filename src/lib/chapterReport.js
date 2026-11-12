import {MARKS_CORRECT, MARKS_UNATTEMPTED, MARKS_WRONG, SUBJECTS, fmtAttemptDate} from "./constants";
import {loadHistory} from "./persistence";
import {scoreExam} from "./scoring";

// ---------- Chapter report across the latest 10 attempts (for AI analysis) ----------
// Re-scores each saved attempt, then adds up every chapter's results across them so a chat
// AI can see which chapters are weak on average, not just in one test.
export function buildChapterReport(history, dateStr){
  const exams = history.slice(0, 10); // history is stored newest first
  const pct = v => `${Number(v).toFixed(1)}%`;
  const f1 = v => Number(v).toFixed(1);
  const cell = t => String(t ?? "").replace(/\|/g,"\\|").replace(/\s*\n\s*/g," ");
  const rows = exams.map((h,i)=>({ h, res: scoreExam(h.snapshot), label: `E${i+1}` })); // E1 = most recent
  const L = [];

  const chap = {}; // "Subject::Chapter" -> totals
  rows.forEach(({res,label})=>{
    res.chapterStats.forEach(c=>{
      const k = c.subject+"::"+c.chapter;
      if(!chap[k]) chap[k] = {subject:c.subject, chapter:c.chapter, exams:0, total:0, attempted:0, correct:0, wrong:0, unattempted:0, score:0, perExam:[]};
      const t = chap[k];
      t.exams++; t.total+=c.total; t.attempted+=c.attempted; t.correct+=c.correct; t.wrong+=c.wrong; t.unattempted+=c.unattempted; t.score+=c.score; t.lost=(t.lost||0)+c.lost;
      t.perExam.push({label, c});
    });
  });
  const list = Object.values(chap).map(t=>({
    ...t,
    accuracy: t.attempted ? t.correct/t.attempted*100 : null,
    attemptRate: t.total ? t.attempted/t.total*100 : 0,
    marksPerQ: t.total ? t.score/t.total : 0,
    marksLost: 0 - t.lost,
    marksLeft: t.unattempted*MARKS_CORRECT, // marks available but not even attempted
    avgPerExam: t.score/t.exams,
  }));
  // weakest first: lowest marks per question, then lowest accuracy
  const weakFirst = [...list].sort((a,b)=>a.marksPerQ-b.marksPerQ || (a.accuracy??-1)-(b.accuracy??-1));

  L.push(`# JEE Main chapter analysis: my latest ${exams.length} mock test attempt${exams.length!==1?"s":""}`);
  L.push(``);
  L.push(`## 1. Instructions for the AI`);
  L.push(`You are an expert JEE Main coach. This file combines the chapter-wise results of my latest ${exams.length} full-length mock test attempts (exported ${dateStr}). Study it and tell me, on average across these exams, which chapters I am weak in and what I should do to improve. Please give:`);
  L.push(`1. The chapters where I am weakest on average, ranked, with the numbers that show it (accuracy, marks per question, wrong answers, unattempted questions).`);
  L.push(`2. For each weak chapter, whether the problem looks like a concept gap (low accuracy), careless or guess-driven errors (many wrong answers costing -1), or avoidance (many unattempted).`);
  L.push(`3. My strongest chapters to protect, and chapters that are quick wins (high accuracy but often left unattempted).`);
  L.push(`4. Any trend across the exams: improving, flat or declining overall and in the weakest chapters (E1 is my most recent exam, so read E${exams.length} to E1 as oldest to newest).`);
  L.push(`5. A chapter-by-chapter study order for the next 2 weeks and 6 weeks, with practical steps for each (what to revise, what kind of problems to practise, how many).`);
  L.push(`6. A selection strategy for the exam based on which chapters I should attempt confidently and which to skip given +4 / -1 marking.`);
  L.push(`Be careful with small samples: a chapter often has only 1 to 3 questions per exam, so treat a single bad result lightly and give more weight to chapters that are weak in several exams. If something you need is missing, ask me before guessing.`);
  L.push(``);

  L.push(`## 2. How to read the numbers`);
  L.push(`- Marking: +${MARKS_CORRECT} correct, ${MARKS_WRONG} wrong, ${MARKS_UNATTEMPTED} unattempted.`);
  L.push(`- Questions = how many questions of that chapter appeared across these exams. Exams = in how many of the ${exams.length} exams the chapter appeared.`);
  L.push(`- Accuracy = correct / attempted x 100. Attempt rate = attempted / questions x 100.`);
  L.push(`- Net marks = correct x 4 - wrong x 1. Marks per question = net marks / questions (the maximum is 4.0).`);
  L.push(`- Marks lost = wrong answers x 1 (negative marking). Marks left = unattempted questions x 4 (marks available that I did not attempt).`);
  L.push(`- Exams are labelled E1 (most recent) to E${exams.length} (oldest). The same paper retaken counts as separate attempts.`);
  L.push(``);

  L.push(`## 3. The ${exams.length} exams`);
  L.push(`| Exam | Paper | Date | Score | Accuracy | Correct | Wrong | Unattempted | Maths | Physics | Chemistry |`);
  L.push(`|---|---|---|---|---|---|---|---|---|---|---|`);
  rows.forEach(({h,res,label})=>{
    const sj = s => `${res.bySubject[s].score}/${res.bySubject[s].max}`;
    L.push(`| ${label} | ${cell(h.testName)} | ${cell(fmtAttemptDate(h.date))} | ${res.totalScore}/${res.maxScore} | ${pct(res.accuracy)} | ${res.correct} | ${res.wrong} | ${res.unattempted} | ${sj("Mathematics")} | ${sj("Physics")} | ${sj("Chemistry")} |`);
  });
  const n = rows.length;
  const avgScore = rows.reduce((a,r)=>a+r.res.totalScore,0)/n;
  L.push(``);
  L.push(`- Average score: ${f1(avgScore)} / 300; average accuracy on attempted: ${pct(rows.reduce((a,r)=>a+r.res.accuracy,0)/n)}; average correct / wrong / unattempted: ${f1(rows.reduce((a,r)=>a+r.res.correct,0)/n)} / ${f1(rows.reduce((a,r)=>a+r.res.wrong,0)/n)} / ${f1(rows.reduce((a,r)=>a+r.res.unattempted,0)/n)}`);
  SUBJECTS.forEach(s=>{
    L.push(`- Average ${s} score: ${f1(rows.reduce((a,r)=>a+r.res.bySubject[s].score,0)/n)} / 100`);
  });
  L.push(``);

  L.push(`## 4. Chapter analysis, all ${list.length} chapters (weakest first)`);
  L.push(`| Subject | Chapter | Exams | Questions | Attempted | Correct | Wrong | Unattempted | Accuracy | Attempt rate | Net marks | Marks / question | Marks lost | Marks left |`);
  L.push(`|---|---|---|---|---|---|---|---|---|---|---|---|---|---|`);
  weakFirst.forEach(c=>{
    L.push(`| ${cell(c.subject)} | ${cell(c.chapter)} | ${c.exams} | ${c.total} | ${c.attempted} | ${c.correct} | ${c.wrong} | ${c.unattempted} | ${c.accuracy===null ? "n/a" : pct(c.accuracy)} | ${pct(c.attemptRate)} | ${c.score} | ${f1(c.marksPerQ)} | ${c.marksLost} | ${c.marksLeft} |`);
  });
  L.push(``);

  L.push(`## 5. Chapters by subject (weakest first)`);
  SUBJECTS.forEach(s=>{
    L.push(`### ${s}`);
    const sub = weakFirst.filter(c=>c.subject===s);
    sub.forEach(c=>L.push(`- ${cell(c.chapter)}: ${c.correct} correct, ${c.wrong} wrong, ${c.unattempted} unattempted of ${c.total} questions in ${c.exams} exam${c.exams!==1?"s":""}; accuracy ${c.accuracy===null ? "n/a (never attempted)" : pct(c.accuracy)}; net ${c.score} marks (${f1(c.marksPerQ)} per question)`));
    L.push(``);
  });

  L.push(`## 6. Chapter results exam by exam (oldest to newest)`);
  L.push(`Each entry is correct/wrong/unattempted for that exam, then net marks. Use this to spot trends.`);
  weakFirst.forEach(c=>{
    const seq = [...c.perExam].reverse().map(({label,c:x})=>`${label}: ${x.correct}/${x.wrong}/${x.unattempted} (${x.score>0?"+":""}${x.score})`).join(" | ");
    L.push(`- ${cell(c.subject)} - ${cell(c.chapter)}: ${seq}`);
  });
  L.push(``);
  return L.join("\n");
}
export function exportChapterReport(){
  const history = loadHistory();
  if(!history.length) return;
  const report = buildChapterReport(history, new Date().toLocaleDateString());
  const blob = new Blob([report], {type:"text/markdown;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `JEE_chapter_analysis_last_${Math.min(10, history.length)}_exams_for_AI.md`;
  a.click();
  URL.revokeObjectURL(url);
}

