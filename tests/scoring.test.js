import {describe, expect, it} from "vitest";
import "./setup";

const {isAnswerCorrect, scoreExam} = await import("../src/lib/scoring");
const {PAPER_REGISTRY, getPaper, scoredCounts, paperTag} = await import("../src/lib/papers");
const {makeInitialExamState} = await import("../src/lib/persistence");

const answerAll = (paper, pick) => {
  const st = makeInitialExamState(paper);
  paper.questions.forEach(q=>{ const r = pick(q); if(r!=null) st.perQ[q.n] = {...st.perQ[q.n], status:"answered", response:String(r)}; });
  return st;
};
const wrongFor = q => q.type==="MCQ"
  ? ["A","B","C","D"].find(id=>!isAnswerCorrect(q, id))
  : String(Math.round(Number(q.answer)) + 7);

describe("isAnswerCorrect", ()=>{
  it("MCQ: only the key (and listed alternatives) is right", ()=>{
    expect(isAnswerCorrect({type:"MCQ", answer:"B"}, "B")).toBe(true);
    expect(isAnswerCorrect({type:"MCQ", answer:"B"}, "C")).toBe(false);
    expect(isAnswerCorrect({type:"MCQ", answer:"B", altAnswers:["C"]}, "C")).toBe(true);
  });
  it("numerical with a whole-number key rounds what was typed", ()=>{
    const q = {type:"NUM", answer:"5"};
    expect(isAnswerCorrect(q, "5")).toBe(true);
    expect(isAnswerCorrect(q, "5.4")).toBe(true);
    expect(isAnswerCorrect(q, "5.5")).toBe(false);
    expect(isAnswerCorrect(q, "-5")).toBe(false);
    expect(isAnswerCorrect(q, "")).toBe(false);
  });
  it("numerical with a decimal key needs that value, or the key rounded and typed as a whole number", ()=>{
    const q = {type:"NUM", answer:"3.33"};
    expect(isAnswerCorrect(q, "3.33")).toBe(true);
    expect(isAnswerCorrect(q, "3.330")).toBe(true);
    expect(isAnswerCorrect(q, "3")).toBe(true);
    expect(isAnswerCorrect(q, "3.4")).toBe(false);
    expect(isAnswerCorrect(q, "2.9")).toBe(false);
    expect(isAnswerCorrect(q, "3.3")).toBe(false);
    expect(isAnswerCorrect({type:"NUM", answer:"282.84"}, "283")).toBe(true);
    expect(isAnswerCorrect({type:"NUM", answer:"282.84"}, "282")).toBe(false);
  });
  it("range and bonus", ()=>{
    expect(isAnswerCorrect({type:"NUM", answer:"10", range:[9, 11]}, "9.2")).toBe(true);
    expect(isAnswerCorrect({type:"NUM", answer:"10", range:[9, 11]}, "12")).toBe(false);
    expect(isAnswerCorrect({type:"MCQ", answer:"A", bonus:true}, "D")).toBe(true);
  });
});

describe("scoreExam on every paper in the bank", ()=>{
  it("all correct = full marks, all wrong = -1 each, blank = bonus marks only", ()=>{
    for(const paper of PAPER_REGISTRY){
      const sc = scoredCounts(paper);
      const bonus = paper.questions.filter(q=>q.bonus).length;
      // answer every MCQ, and only as many numericals per subject as the paper allows
      const allowed = new Set(); const seen = {};
      const limit = paper.format && paper.format.numToAttempt;
      paper.questions.forEach(q=>{
        if(q.type!=="NUM" || limit==null){ allowed.add(q.n); return; }
        seen[q.subject] = (seen[q.subject] || 0) + 1;
        if(seen[q.subject] <= limit) allowed.add(q.n);
      });
      const right = scoreExam(answerAll(paper, q=>allowed.has(q.n) ? q.answer : null));
      expect(right.maxScore, paper.id).toBe(sc.total * 4);
      expect(right.totalScore, paper.id).toBe(sc.total * 4);
      expect(right.maxScore, paper.id).toBe(300);

      const wrong = scoreExam(answerAll(paper, q=>allowed.has(q.n) ? wrongFor(q) : null));
      const bonusAnswered = paper.questions.filter(q=>q.bonus && allowed.has(q.n)).length;
      expect(wrong.totalScore, paper.id).toBe(-(sc.total - bonusAnswered) + 4 * bonusAnswered);

      const blank = scoreExam(makeInitialExamState(paper));
      expect(blank.totalScore, paper.id).toBe(4 * Math.min(bonus, sc.total));
      expect(blank.correct + blank.wrong + blank.unattempted, paper.id).toBe(sc.total);
    }
  });
  it("an option clicked but never saved is not scored", ()=>{
    const paper = PAPER_REGISTRY.find(p=>!p.questions.some(q=>q.bonus));
    const st = makeInitialExamState(paper);
    const q = paper.questions[0];
    st.perQ[q.n] = {...st.perQ[q.n], status:"not_answered", response:q.answer};
    expect(scoreExam(st).totalScore).toBe(0);
  });
});

describe("paper helpers", ()=>{
  it("scored question count is 75 on every paper", ()=>{
    for(const p of PAPER_REGISTRY){
      const sc = scoredCounts(p);
      expect(sc.total, p.id).toBe(75);
      expect(Object.values(sc.bySubject), p.id).toEqual([25, 25, 25]);
    }
  });
  it("paperTag names the year", ()=>{
    expect(paperTag(getPaper("jee-2024-31jan-s2"))).toMatch(/2024/);
  });
});
