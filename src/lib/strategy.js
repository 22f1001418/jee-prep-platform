import {attemptKeyOf, loadMistakes, mistakeKey} from "./mistakes";
import {estimatePercentile} from "./percentile";

// ---------- Strategy lab: "what would have changed my score?" ----------
// All of this is arithmetic on one finished attempt (marks +4 / -1 / 0), plus clearly labelled assumptions.

const SWING = 5;   // a wrong answer (-1) that had been right (+4)

// Marks lost on wrong answers, grouped by the cause you tagged in the Mistake Book.
export function causeBreakdown(state, result){
  const book = loadMistakes(), ak = attemptKeyOf(state);
  const wrong = result.perQuestionResults.filter(r => r.result==="wrong");
  const byCause = {}; let untagged = 0;
  wrong.forEach(r => {
    const it = book[mistakeKey(state.paperId, r.n)]; const hit = it && it.hits.find(h => h.a===ak);
    const c = hit && hit.cause ? hit.cause : null;
    if(!c){ untagged++; return; }
    const e = byCause[c] || (byCause[c] = {n:0, marks:0}); e.n++; e.marks += 4 - r.marks;
  });
  const careless = {n:(byCause.calc ? byCause.calc.n : 0) + (byCause.misread ? byCause.misread.n : 0),
    marks:(byCause.calc ? byCause.calc.marks : 0) + (byCause.misread ? byCause.misread.marks : 0)};
  return {byCause, untagged, wrongCount: wrong.length, careless, totalLost: wrong.reduce((s, r) => s + (4 - r.marks), 0)};
}

// "If I had moved on after `minutes` minutes on any question."
export function paceRule(result, minutes){
  const T = minutes * 60;
  const rs = result.perQuestionResults;
  const attempted = rs.filter(r => r.result==="correct" || r.result==="wrong");
  const slow = rs.filter(r => r.timeSpent > T);
  const wrongSlow = slow.filter(r => r.result==="wrong"), correctSlow = slow.filter(r => r.result==="correct");
  const unattemptedSlow = slow.filter(r => r.result==="unattempted");
  const timeFreed = slow.reduce((s, r) => s + (r.timeSpent - T), 0);
  const unattempted = rs.filter(r => r.result==="unattempted").length;
  const avgSecs = attempted.length ? attempted.reduce((s, r) => s + r.timeSpent, 0) / attempted.length : 0;
  const acc = attempted.length ? attempted.filter(r => r.result==="correct").length / attempted.length : 0;
  const extra = avgSecs > 0 ? Math.min(unattempted, Math.floor(timeFreed / avgSecs)) : 0;
  const gain = (Math.round(extra * (acc * 4 - (1 - acc)) * 10) / 10) || 0;       // expected marks from the freed time, at your usual pace and accuracy
  const avoided = wrongSlow.length;                                         // a wrong answer given up is -1 -> 0
  const risk = correctSlow.length * 4;                                      // worst case: every slow correct answer would have been lost
  return {
    minutes, slowCount: slow.length, wrongSlow: wrongSlow.length, correctSlow: correctSlow.length, unattemptedSlow: unattemptedSlow.length,
    timeFreedMin: Math.round(timeFreed / 60), extraAttempts: extra, gain, avoided, risk,
    best: (Math.round((avoided + gain) * 10) / 10) || 0, worst: (Math.round((avoided + gain - risk) * 10) / 10) || 0,
    slowest: slow.filter(r => r.result!=="unattempted").sort((a, b) => b.timeSpent - a.timeSpent).slice(0, 5),
  };
}

// Your score, and the score if a few things had gone differently, each with its estimated percentile.
export function scenarios(state, result, breakdown){
  const base = result.totalScore;
  const rows = [{id:"actual", label:"Your score", score: base}];
  if(breakdown.careless.n>0) rows.push({id:"careless", label:`No calculation or misreading slips (${breakdown.careless.n} tagged)`, score: base + breakdown.careless.marks});
  if(result.wrong>0){
    rows.push({id:"blank", label:`Wrong answers left blank instead (${result.wrong})`, score: base + result.negMarksLost});
    rows.push({id:"fixed", label:`Every wrong answer right (${result.wrong})`, score: base + breakdown.totalLost});
  }
  return rows.map(r => ({...r, est: estimatePercentile(state.paperId, r.score)}));
}
