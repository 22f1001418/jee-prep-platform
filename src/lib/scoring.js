import {LS_HISTORY, MARKS_CORRECT, MARKS_UNATTEMPTED, MARKS_WRONG, STATUS, SUBJECTS, fmtMinSec} from "./constants";
import {getPaper, numAttemptLimit, numWrongMarks, paperMissing} from "./papers";
import {loadHistory} from "./persistence";
import {store} from "./store";

// Re-scores every saved attempt against the current key, so Test History, the trend and the
// result pages all show marks that match the corrected key and the +4 / -1 / 0 marking.
export function rescoreHistory(){
  const h = loadHistory(); let changed = false;
  h.forEach(e=>{
    const sn = e && e.snapshot;
    if(!sn || !sn.paperId || !sn.perQ || paperMissing(sn.paperId)) return;
    let r; try{ r = scoreExam(sn); }catch(err){ return; }
    if(e.score!==r.totalScore || e.maxScore!==r.maxScore || Math.abs((e.accuracy||0)-r.accuracy)>1e-9){
      e.score = r.totalScore; e.maxScore = r.maxScore; e.accuracy = r.accuracy; changed = true;
    }
  });
  if(changed){ try{ store.setItem(LS_HISTORY, JSON.stringify(h)); }catch(e){} }
  return h;
}

// ---------- Answer helpers ----------
// A question normally has one `answer` (MCQ option id, or a number for NUM).
// Optional per-question fields extend that without changing existing papers:
//   altAnswers: ["B"]      extra accepted answers (MCQ ids or NUM values)
//   range: [lo, hi]        NUM questions: any value from lo to hi (inclusive) is correct
//   bonus: true            question dropped/bonus: everyone gets full marks
export function acceptedAnswers(q){ return [q.answer, ...(Array.isArray(q.altAnswers) ? q.altAnswers : [])].map(String); }
export function isOptionCorrect(q, id){ return acceptedAnswers(q).includes(String(id)); }
export function isAnswerCorrect(q, response){
  if(q.bonus === true) return true;
  if(q.type === "NUM"){
    const given = parseFloat(response);
    if(isNaN(given)) return false;
    if(Array.isArray(q.range) && q.range.length === 2){
      const lo = Math.min(Number(q.range[0]), Number(q.range[1])), hi = Math.max(Number(q.range[0]), Number(q.range[1]));
      if(given >= lo - 1e-9 && given <= hi + 1e-9) return true;
    }
    // both the typed answer and the key are ROUNDED to the nearest whole number (.5 goes away from zero) before comparing:
    // 5.4 -> 5, 5.5 -> 6, -5.5 -> -6. So a key of 5 accepts 4.5 up to 5.49..., and a key of 5.9 is treated as 6.
    const rnd = x => Math.sign(x) * Math.round(Math.abs(x));
    return acceptedAnswers(q).some(a=>{ const v = parseFloat(a); return !isNaN(v) && rnd(given) === rnd(v); });
  }
  return acceptedAnswers(q).includes(String(response));
}
export function answerText(q){
  let s = String(q.answer);
  if(q.type === "NUM" && Array.isArray(q.range) && q.range.length === 2) s = q.range[0] + " to " + q.range[1];
  else if(Array.isArray(q.altAnswers) && q.altAnswers.length) s = [q.answer, ...q.altAnswers].join(" or ");
  if(q.bonus === true) s += " (bonus: full marks to all)";
  return s;
}

// ---------- Scoring engine ----------
export function scoreExam(state){
  // state.paperId tells us which paper this attempt was taken on — always
  // score against that paper's own question bank, not whichever paper
  // happens to be selected on the landing screen right now.
  const paper = getPaper(state.paperId);
  const RAW_QUESTIONS = paper.questions;
  const perQ = state.perQ;
  const allResults = RAW_QUESTIONS.map(q=>{
    const rec = perQ[q.n];
    const attempted = rec.status===STATUS.ANSWERED || rec.status===STATUS.ANSWERED_MARKED;
    let result = "unattempted", marks = MARKS_UNATTEMPTED;
    if(q.bonus === true){
      result = "correct"; marks = MARKS_CORRECT; // dropped/bonus question: full marks to everyone
    } else if(attempted){
      const correct = isAnswerCorrect(q, rec.response);
      result = correct ? "correct" : "wrong";
      marks = correct ? MARKS_CORRECT : (q.type === "NUM" ? numWrongMarks(paper) : MARKS_WRONG);
    }
    return {
      n:q.n, subject:q.subject, chapter:q.chapter, type:q.type,
      yourAnswer: rec.response, correctAnswer: answerText(q),
      status: rec.status, result, marks, timeSpent: rec.timeSpent||0, keyEdited: !!q.keyEdited,
      markedForReview: rec.status===STATUS.MARKED||rec.status===STATUS.ANSWERED_MARKED,
      errorTag: rec.errorTag || null,
    };
  });

  // Papers where only some numericals may be answered (paper.format.numToAttempt):
  // per subject, the numericals the person did not answer are either an unused
  // answer slot (counted as unattempted - the ones they spent the most time on)
  // or "not chosen" (optional, never scored, shown separately in the analysis).
  const numLimit = numAttemptLimit(paper);
  const notChosen = [];
  let perQuestionResults = allResults;
  if(numLimit != null){
    const drop = new Set();
    SUBJECTS.forEach(s=>{
      const nums = allResults.filter(r=>r.subject===s && r.type==="NUM");
      if(nums.length <= numLimit) return;
      const answered = nums.filter(r=>r.result!=="unattempted").length;
      const slots = Math.max(0, numLimit - answered);
      nums.filter(r=>r.result==="unattempted")
        .sort((a,b)=>b.timeSpent-a.timeSpent || a.n-b.n)
        .slice(slots).forEach(r=>drop.add(r.n));
    });
    perQuestionResults = allResults.filter(r=>!drop.has(r.n));
    allResults.filter(r=>drop.has(r.n)).forEach(r=>notChosen.push({...r, result:"notchosen"}));
  }
  const maxScore = perQuestionResults.length * MARKS_CORRECT;

  const totalScore = perQuestionResults.reduce((s,r)=>s+r.marks,0);
  const correct = perQuestionResults.filter(r=>r.result==="correct").length;
  const wrong = perQuestionResults.filter(r=>r.result==="wrong").length;
  const unattempted = perQuestionResults.filter(r=>r.result==="unattempted").length;
  const attempted = correct+wrong;
  const accuracy = attempted>0 ? (correct/attempted*100) : 0;

  const bySubject = {};
  SUBJECTS.forEach(s=>{
    const rs = perQuestionResults.filter(r=>r.subject===s);
    const c = rs.filter(r=>r.result==="correct").length;
    const w = rs.filter(r=>r.result==="wrong").length;
    const u = rs.filter(r=>r.result==="unattempted").length;
    const att = c+w;
    bySubject[s] = {
      correct:c, wrong:w, unattempted:u, attempted:att,
      score: rs.reduce((s2,r)=>s2+r.marks,0), max: rs.length*4, lostMarks: 0 - rs.reduce((s2,r)=>s2+Math.min(0,r.marks),0),
      accuracy: att>0 ? (c/att*100) : 0,
      attemptRate: (att/rs.length*100),
      avgTime: att>0 ? rs.filter(r=>r.result!=="unattempted").reduce((s2,r)=>s2+r.timeSpent,0)/att : 0,   // per attempted question
      totalTime: rs.reduce((s2,r)=>s2+r.timeSpent,0),
    };
  });

  const negMarksLost = 0 - perQuestionResults.reduce((s,r)=>s+Math.min(0,r.marks),0);
  const potentialScore = correct*4 + unattempted*0 + (attempted-correct)*4; // if no negative: correct*4 + wrong*4(if they'd been right)... use simpler: correct*4 (what they'd keep) + wrong*4 (recoverable)
  const potentialWithoutNegative = (correct+wrong)*0 + correct*4; // correct answers' marks unaffected by negative marking
  // Potential score without negative marking = treat wrong as 0 instead of -1
  const potentialNoNeg = correct*4 + wrong*0 + unattempted*0;

  const attemptEfficiency = attempted>0 ? (totalScore / (attempted*4) * 100) : 0;

  const times = perQuestionResults.map(r=>r.timeSpent);
  const totalTime = times.reduce((a,b)=>a+b,0);
  // average time per ATTEMPTED question = (total time - time on unattempted) / (correct + wrong)
  const attemptedTime = perQuestionResults.filter(r=>r.result!=="unattempted").reduce((a,r)=>a+r.timeSpent,0);
  const avgTimePerQ = attempted>0 ? attemptedTime/attempted : 0;
  const sorted = [...perQuestionResults].sort((a,b)=>b.timeSpent-a.timeSpent);
  const slowest = sorted[0];
  const fastestAttempted = [...perQuestionResults].filter(r=>r.result!=="unattempted").sort((a,b)=>a.timeSpent-b.timeSpent)[0];

  const timeWastedOnWrong = perQuestionResults.filter(r=>r.result==="wrong").reduce((s,r)=>s+r.timeSpent,0);
  // Time spent on questions that were ultimately left unattempted — time
  // that went toward a question but produced no answer at all, distinct
  // from timeWastedOnWrong (which is time spent on a question that WAS
  // answered, just incorrectly).
  const timeOnUnattempted = perQuestionResults.filter(r=>r.result==="unattempted").reduce((s,r)=>s+r.timeSpent,0);

  const subjList = SUBJECTS.map(s=>({subject:s, ...bySubject[s]}));
  const strongest = [...subjList].sort((a,b)=>b.score-a.score)[0];
  const weakest = [...subjList].sort((a,b)=>a.score-b.score)[0];
  const mostErrorProne = [...subjList].sort((a,b)=>b.wrong-a.wrong)[0];
  const bestAccuracy = [...subjList].sort((a,b)=>b.accuracy-a.accuracy)[0];
  const bestAttemptRate = [...subjList].sort((a,b)=>b.attemptRate-a.attemptRate)[0];

  // chapter-wise
  const chapterMap = {};
  perQuestionResults.forEach(r=>{
    const key = r.subject+"::"+r.chapter;
    if(!chapterMap[key]) chapterMap[key] = {subject:r.subject, chapter:r.chapter, attempted:0, correct:0, wrong:0, unattempted:0, total:0, marks:0, lost:0};
    const c = chapterMap[key];
    c.total++;
    c.marks += r.marks; c.lost += Math.min(0, r.marks);
    if(r.result==="correct"){c.correct++; c.attempted++;}
    else if(r.result==="wrong"){c.wrong++; c.attempted++;}
    else c.unattempted++;
  });
  const chapterStats = Object.values(chapterMap).map(c=>({
    ...c, accuracy: c.attempted>0 ? (c.correct/c.attempted*100) : 0,
    score: c.marks,
  }));

  const warnings = [];
  const physAcc = bySubject.Physics.accuracy, chemAcc = bySubject.Chemistry.accuracy, mathAcc = bySubject.Mathematics.accuracy;
  const accs = [{s:"Physics",v:physAcc},{s:"Chemistry",v:chemAcc},{s:"Mathematics",v:mathAcc}].sort((a,b)=>b.v-a.v);
  if(accs[0].v - accs[2].v > 20 && attempted>5){
    warnings.push(`${accs[2].s} accuracy (${accs[2].v.toFixed(1)}%) is significantly lower than ${accs[0].s} (${accs[0].v.toFixed(1)}%).`);
  }
  perQuestionResults.filter(r=>r.result==="wrong" && r.timeSpent>300).forEach(r=>{
    warnings.push(`You spent ${fmtMinSec(r.timeSpent)} on Q${r.n} and still answered incorrectly.`);
  });
  if(unattempted>0) warnings.push(`You left ${unattempted} question${unattempted!==1?'s':''} unattempted.`);
  if(negMarksLost>0) warnings.push(`Negative marking reduced your score by ${negMarksLost} mark${negMarksLost!==1?'s':''}.`);

  return {
    perQuestionResults, notChosen, totalScore, maxScore, correct, wrong, unattempted, attempted, accuracy,
    bySubject, negMarksLost, potentialNoNeg, attemptEfficiency,
    totalTime, avgTimePerQ, slowest, fastestAttempted, timeWastedOnWrong, timeOnUnattempted,
    strongest, weakest, mostErrorProne, bestAccuracy, bestAttemptRate,
    chapterStats, warnings,
    percentage: (totalScore/maxScore*100),
  };
}

