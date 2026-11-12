import {DURATION_SEC, MARKS_CORRECT, MARKS_UNATTEMPTED, MARKS_WRONG, STATUS, STATUS_META, SUBJECTS, fmtMinSec} from "./constants";
import {FIG_IMAGES} from "./data";
import {loadAllImgs, loadAllNotes} from "./notes";
import {getPaper, numAttemptLimit, numWrongMarks, paperMissing} from "./papers";
import {loadHistory} from "./persistence";
import {scoreExam} from "./scoring";

// ---------- Export for AI analysis (one Markdown file) ----------
// PART A is the analysis brief (your master prompt, word for word) and PART B is all the data of this mock test: score,
// time, chapters, one line per question, the full text of every question the brief asks the AI to re-solve (wrong,
// unattempted, marked for review, slow, not chosen), your own notes on questions, and your earlier mocks.
// So the file can be given to a chat AI as it is. Pictures (figures, graphs, tables) cannot go into a text file; the
// questions that need them are flagged, and the "Wrong + Unattempted Question List" PDF carries those figures.
export const AI_MASTER_PROMPT = "# MASTER PROMPT — JEE MAIN MOCK TEST FORENSIC ANALYSIS\n\nYou are an expert JEE Main performance analyst, examination strategist, and subject-wise diagnostic coach.\n\nYour job is to analyse my entire mock test using all available data, identify the exact reasons behind lost marks and wasted time, and produce a highly specific improvement plan for my NEXT mock test.\n\n**Your objective is NOT merely to explain my score. Your objective is to maximise my expected score in the next test by identifying and correcting the most important weaknesses.**\n\nI may provide:\n1. Full question-wise response data (CSV, JSON, Excel or PDF).\n2. Complete question paper with all options, figures, graphs and diagrams.\n3. Official answer key.\n4. Detailed solutions, if available.\n5. Deep analysis and overall performance screenshots.\n6. Subject-wise and chapter-wise analysis.\n7. Question-wise time analysis.\n8. My notes and self-reported reasons for mistakes.\n9. Data from previous mock tests for comparison.\n\nUse every relevant piece of information. Do not ignore unattempted questions, correct questions, time data or previous test history.\n\n---\n\n## RULE 1 — VERIFY THE DATA BEFORE ANALYSING\n\nFirst establish whether the supplied data is complete and internally consistent.\n\nVerify:\n\n- Total questions.\n- Correct, incorrect and unattempted counts.\n- Total attempted questions.\n- Marks awarded and negative marking.\n- Overall score and subject-wise scores.\n- Attempt rate and accuracy.\n- Time spent on attempted and unattempted questions.\n- Whether question numbers match between the response data, question paper and answer key.\n- Whether any questions, figures, answer choices or solutions are missing.\n\nFor the standard JEE Main +4/−1 marking scheme, independently verify the calculated score wherever applicable.\n\nUse these definitions consistently:\n\nAttempt rate = Attempted questions / Total questions × 100.\n\nAccuracy = Correct answers / Attempted questions × 100.\n\nWrong-answer rate among attempts = Wrong answers / Attempted questions × 100.\n\nNever confuse the wrong-answer rate among attempts with the percentage of all paper questions answered incorrectly.\n\nIf the application uses a different metric or an unclear formula, explain the difference.\n\nFlag inconsistencies instead of silently correcting or assuming data.\n\n## RULE 2 — SOLVE AND CLASSIFY QUESTIONS INDEPENDENTLY\n\nDo not rely exclusively on my answer or the application's labels.\n\nFor each wrong, unattempted, doubtful, marked-for-review or unusually slow question:\n\n1. Read the complete original question.\n2. Examine every option, diagram, graph and given condition.\n3. Independently determine the correct answer.\n4. Verify it against the supplied answer key.\n5. Explain the shortest reliable JEE-level approach.\n6. Identify the exact knowledge or execution required to solve it.\n7. Compare the expected approach with my response and available attempt history.\n\nIf an answer key appears incorrect or ambiguous, flag it. Do not force agreement with it.\n\nNever invent a question, solution, chapter, topic, difficulty level or reason for an error. If the supplied material is insufficient, explicitly identify the missing information.\n\n## RULE 3 — QUESTION-WISE FORENSIC ANALYSIS\n\nCreate an individual diagnostic record for every relevant question.\n\nUse these fields:\n\n- Question number.\n- Subject.\n- Chapter and subtopic.\n- Question type.\n- Question difficulty, with justification.\n- My answer.\n- Official correct answer.\n- Result and marks.\n- Time spent.\n- Whether it was marked for review or revisited, if available.\n- Whether my approach was correct.\n- Actual root cause.\n- Whether I could have solved it during the exam.\n- Correct and efficient solving method.\n- Specific corrective action.\n\nClassify the root cause using these categories:\n\nA. Conceptual weakness.\nB. Formula or factual recall failure.\nC. Application or problem-solving weakness.\nD. Calculation or algebra error.\nE. Misreading or misinterpretation.\nF. Careless execution.\nG. Incorrect option selection or guessing.\nH. Poor time management.\nI. Incorrect question selection.\nJ. Insufficient syllabus coverage.\nK. Exam pressure or lack of confidence.\nL. Unknown / insufficient evidence.\n\nDo not use vague labels like \"silly mistake\" without identifying the actual mechanism.\n\n### Analyse four groups separately\n\n**Group 1 — Incorrect answers**\n\nDetermine exactly why I got each question wrong. Identify whether I knew the concept but executed it incorrectly, lacked understanding, forgot information, or took an unjustified risk.\n\n**Group 2 — Unattempted questions**\n\nFor each one, determine:\n\n- Was the concept within my preparation?\n- Could I independently solve it without a time limit?\n- Could I realistically have solved it under examination conditions?\n- Was the question skipped for a valid reason?\n- Did I waste time on it before abandoning it?\n- Should I have attempted it, revisited it later or skipped it immediately?\n\nClassify each as:\n- Knowledge gap.\n- Unprepared chapter.\n- Recall failure.\n- Solvable but time-consuming.\n- Poor question selection.\n- Time-pressure skip.\n- Valid strategic skip.\n- Insufficient evidence.\n\n**Group 3 — Correct answers**\n\nIdentify:\n- Correct and efficient attempts.\n- Correct but unnecessarily slow attempts.\n- Correct but low-confidence attempts.\n- Correct guesses or risky elimination.\n- Correct answers obtained through an unnecessarily complicated method.\n\nDo not treat every correct answer as mastered.\n\n**Group 4 — Not chosen / marked for review**\n\nAnalyse whether I selected the right questions and whether my decision to revisit or abandon them was appropriate. Use actual navigation and timing data wherever available.\n\n## RULE 4 — DETAILED TIME MANAGEMENT ANALYSIS\n\nThis section is extremely important.\n\nAnalyse the time spent on every question, not merely the average time per subject.\n\nFind:\n\n1. The slowest questions and why they were slow.\n2. Questions that consumed substantial time but produced no marks.\n3. Correct questions that could have been solved faster.\n4. Questions abandoned after significant time investment.\n5. Easy or moderate questions left unattempted.\n6. Questions that should have been attempted earlier.\n7. Whether my subject-order strategy was effective.\n8. Whether revisiting questions improved or harmed my performance.\n\nIdentify time sinks and calculate how much time could realistically have been saved.\n\nWhere possible, compare time spent with the difficulty and question type, rather than applying one universal time limit.\n\nSeparate:\n- Productive solving time.\n- Unproductive thinking time.\n- Reading and interpretation time.\n- Repeated or unnecessary calculations.\n- Time spent on abandoned questions.\n\nIf exact event timestamps or navigation history are unavailable, state this limitation. Do not pretend to know the exact order of my actions.\n\n## RULE 5 — SUBJECT-WISE DIAGNOSIS\n\nAnalyse Mathematics, Physics and Chemistry separately.\n\nFor each subject provide:\n\n- Score and percentage of total marks.\n- Questions attempted, correct, wrong and unattempted.\n- Attempt rate.\n- Accuracy among attempts.\n- Average time per attempted question.\n- Total time consumed.\n- Main reasons for lost marks.\n- Main reasons for unattempted questions.\n- Strongest chapters.\n- Weakest chapters.\n- Chapters with high potential for improvement.\n- Specific changes needed in my solving strategy.\n\nDetermine whether each subject's main problem is knowledge, accuracy, speed, question selection or coverage.\n\nDo not automatically recommend studying the lowest-scoring subject more. Consider how many marks can realistically be recovered.\n\n## RULE 6 — CHAPTER-WISE AND TOPIC-WISE ANALYSIS\n\nPrepare a complete chapter-wise performance table.\n\nFor each chapter, calculate or report:\n\n- Total questions available.\n- Questions attempted.\n- Correct.\n- Wrong.\n- Unattempted.\n- Accuracy.\n- Marks obtained.\n- Time spent, if available.\n- Main error type.\n- Evidence of conceptual weakness.\n- Improvement potential.\n\nClassify chapters as:\n\n1. Strong and consistent.\n2. Good accuracy but insufficient attempts.\n3. Conceptually weak.\n4. Recall/formula weak.\n5. Poor application.\n6. Slow solving.\n7. Low preparation or not studied.\n8. Insufficient data to judge.\n\nDo not call a chapter mastered based on only one or two questions. State the sample size and confidence of your assessment.\n\nIdentify the TOP 5 chapters/topics that should receive priority before the next mock, considering their expected recoverable marks, preparation effort and relevance to the demonstrated weaknesses.\n\n## RULE 7 — SCORE LOSS AND RECOVERABLE MARKS\n\nCalculate exactly where marks were lost.\n\nSeparate:\n\n- Marks lost through incorrect answers.\n- Marks missed through unattempted questions.\n- Marks potentially lost through time inefficiency.\n- Marks potentially lost through poor chapter coverage.\n- Marks potentially lost through incorrect question selection.\n\nFor standard +4/−1 marking:\n\n- Wrong to correct: +5 relative improvement.\n- Wrong to skipped: +1 relative improvement.\n- Unattempted to correct: +4 improvement.\n\nDo not count every unattempted question as a recoverable four marks.\n\nEstimate recoverable marks using evidence from independent reattempts, question difficulty, my preparation and realistic exam conditions.\n\nPresent three scenarios:\n\n1. Conservative improvement.\n2. Realistic improvement.\n3. Stretch improvement.\n\nExplain the assumptions for each scenario. Do not promise a guaranteed score.\n\n## RULE 8 — IDENTIFY REPEATED PATTERNS\n\nIf previous mock data is supplied, compare all available tests.\n\nIdentify:\n\n- Repeated chapters producing mistakes.\n- Repeated conceptual misunderstandings.\n- Repeated calculation errors.\n- Chapters where accuracy is improving or declining.\n- Subjects where attempts are increasing or decreasing.\n- Whether speed is improving.\n- Whether previously corrected errors are appearing again.\n- Whether my question-selection strategy is improving.\n\nGive priority to mistakes that have occurred repeatedly across different papers.\n\nDistinguish genuine improvement from a result caused by easier questions or a different paper difficulty.\n\n## RULE 9 — PRIORITISE IMPROVEMENTS\n\nRank the problems by expected score improvement per hour of corrective work.\n\nFor each priority, provide:\n\n1. Exact issue.\n2. Evidence from specific question numbers and chapter data.\n3. Why this issue deserves priority.\n4. Expected score impact, expressed as a range where appropriate.\n5. Estimated study time required.\n6. Exact corrective activity.\n7. A measurable success condition.\n\nDo not recommend revising an entire subject when a narrow topic or repeated execution error is responsible.\n\nLimit the main priorities to the highest-impact issues. Separate urgent actions from lower-priority improvements.\n\n## RULE 10 — CREATE MY NEXT MOCK PREPARATION PLAN\n\nCreate an actionable plan covering the time available before my next mock.\n\nFor every task specify:\n\n- Subject.\n- Chapter/topic.\n- Exact weakness.\n- Concept revision required.\n- Question practice required.\n- Number of questions or a justified range.\n- Difficulty distribution.\n- Time limit.\n- Reattempt date.\n- Completion criteria.\n\nInclude three reattempt cycles:\n\n1. First reattempt after approximately 24 hours.\n2. Second reattempt after approximately 7 days.\n3. Final check before the next relevant mock.\n\nThe goal is to make sure that identified mistakes are actually corrected, not merely understood after watching a solution.\n\nAlso create a short list of questions I absolutely must reattempt before my next mock.\n\n## RULE 11 — NEXT MOCK EXAM STRATEGY\n\nBased on the evidence, recommend:\n\n- Subject order.\n- First-pass question-selection strategy.\n- When to skip a question.\n- When to revisit a question.\n- How to prevent unnecessary time investment.\n- How to allocate remaining time.\n- Which types of questions I should prioritise.\n- Which types of questions I should avoid unless time permits.\n\nDo not give generic fixed time limits. Derive provisional limits from my actual performance, subject, difficulty and paper conditions.\n\nGive me a clear examination strategy I can follow during the next three-hour test.\n\n## RULE 12 — SET MEASURABLE NEXT-TEST TARGETS\n\nCreate targets for:\n\n- Overall score.\n- Attempts.\n- Accuracy.\n- Subject-wise attempts.\n- Subject-wise score.\n- Time efficiency.\n- Negative marking.\n- Priority chapter improvement.\n\nSet targets using the current test and the number of realistically recoverable questions. Explain the reasoning behind each target.\n\nDo not set arbitrary targets just to make the plan look ambitious.\n\n---\n\n# REQUIRED FINAL REPORT FORMAT\n\nPresent the analysis in this exact order:\n\n### 1. Executive Verdict\nA concise diagnosis of my actual performance. State the biggest bottleneck and the three most important things holding back my score.\n\n### 2. Verified Performance Dashboard\nA clean table with score, attempts, accuracy, subject-wise marks and time statistics.\n\n### 3. Subject-Wise Diagnosis\nDetailed Mathematics, Physics and Chemistry analysis.\n\n### 4. Chapter-Wise Diagnosis\nComplete chapter-wise table with sample sizes and confidence of diagnosis.\n\n### 5. Question-Wise Error Audit\nA detailed table of all incorrect, unattempted, doubtful, marked-for-review and unusually slow questions.\n\n### 6. Time-Waste Investigation\nIdentify exact question numbers, time consumed, what went wrong and how time could have been saved.\n\n### 7. Root Cause Analysis\nSeparate knowledge, preparation, execution, speed and decision-making problems.\n\n### 8. Recoverable Marks\nShow conservative, realistic and stretch improvement scenarios with explicit assumptions.\n\n### 9. Ranked Priority List\nThe highest-impact topics and mistakes to fix, ranked by expected improvement per hour.\n\n### 10. Next Mock Preparation Plan\nA practical study and question-practice schedule.\n\n### 11. Next Mock Examination Strategy\nA specific three-hour execution strategy.\n\n### 12. Next Mock Targets\nA measurable scorecard to evaluate whether the corrective work succeeded.\n\n### 13. Mandatory Reattempt List\nQuestion numbers, chapters, expected solving methods and deadlines.\n\n### 14. Missing Information\nList any unavailable data that limits the accuracy of the diagnosis and tell me exactly what else to export.\n\n---\n\n# IMPORTANT INSTRUCTIONS\n\n- Be direct, critical and evidence-based.\n- Do not flatter me or give generic motivational advice.\n- Do not repeat the same observation in multiple sections.\n- Every important conclusion must be backed by actual test data.\n- Mention question numbers and chapters wherever possible.\n- Distinguish facts, estimates and hypotheses.\n- Never confuse accuracy with mastery.\n- Never confuse time spent with productive effort.\n- Never assume an unattempted question was necessarily an easy question.\n- Do not blindly recommend attempting more questions at the cost of accuracy.\n- Do not fabricate missing information.\n- Do not overwhelm me with 50 priorities. Identify the few actions that will make the biggest difference.\n\n**FINAL OBJECTIVE: Make this mock test a diagnostic tool. I want to finish the analysis knowing precisely what I did wrong, why I did it, how to correct it, what to practise, and what measurable change I must demonstrate in the next mock.**";
export function buildAIReport(state, result, dateStr){
  const paper = getPaper(state.paperId);
  const qMap = {}; paper.questions.forEach(q=>{ qMap[q.n] = q; });
  const R = result.perQuestionResults;
  const attemptKey = `${state.paperId}:${state.startedAt}`;
  const notesAll = (loadAllNotes()[attemptKey]) || {}, imgsAll = (loadAllImgs()[attemptKey]) || {};
  const cell = t => String(t ?? "").replace(/\|/g,"\\|").replace(/\s*\n\s*/g," ");
  const mm = sec => fmtMinSec(sec||0);
  const pct = v => `${Number(v).toFixed(1)}%`;
  const sum = (list, f) => list.reduce((a,r)=>a+f(r),0);
  const avg = list => list.length ? sum(list, r=>r.timeSpent)/list.length : 0;
  const signed = n => (n>0 ? "+" : "") + n;
  const benchSec = DURATION_SEC / R.length; // fair share of time per question
  const aiText = t => String(t ?? "").replace(/\[\[img:\w+\]\]/g, "[figure/table image: NOT INCLUDED in this file]");
  const hasFigure = q => !!q && (!!q.svg || /\[\[img:/.test((q.text||"") + (q.options||[]).map(o=>o.text).join(" ")));
  const optText = (q, id) => { const o = q && q.options && q.options.find(x=>x.id===id); return o ? ` = ${aiText(o.text)}` : ""; };
  const L = [];
  const cor = R.filter(r=>r.result==="correct"), wro = R.filter(r=>r.result==="wrong"), una = R.filter(r=>r.result==="unattempted");
  const tried = una.filter(r=>r.status!==STATUS.NOT_VISITED), never = una.filter(r=>r.status===STATUS.NOT_VISITED);
  const notChosenList = result.notChosen || [];
  const usedSec = typeof state.remaining==="number" ? DURATION_SEC - state.remaining : result.totalTime;
  const wastedSec = sum(wro, r=>r.timeSpent) + sum(una, r=>r.timeSpent);
  const minInto = ms => (ms && state.startedAt) ? Math.max(0, (ms - state.startedAt)/60000) : null;
  const atMin = ms => { const m = minInto(ms); return m==null ? "-" : m.toFixed(0) + " min"; };
  const perQ = state.perQ || {};

  // ---------------- how to use + PART A (the brief) ----------------
  L.push(`# HOW TO USE THIS FILE`);
  L.push(`This one file has two parts. **PART A** is my analysis brief: the rules you must follow and the report format you must produce. **PART B** is all the data of my mock test: score, time, chapters, one line for every question, the full text of the questions you must re-solve, my own notes, and my earlier mocks. Treat PART B as the data I supplied; where PART A says "I may provide", everything I could provide is in PART B, and the last section of PART B lists what is NOT available.`);
  L.push(``);
  L.push(`Follow PART A exactly, step by step, and write the final report in the 14-section order it gives. Diagrams, graphs and tables that are pictures cannot be placed in a text file: such questions are flagged "FIGURE NOT INCLUDED". If a PDF with the figures is attached, use it; if not, say that you cannot verify that question instead of guessing.`);
  L.push(``);
  L.push(`---`);
  L.push(``);
  L.push(`# PART A: ANALYSIS BRIEF (MASTER PROMPT)`);
  L.push(``);
  L.push(AI_MASTER_PROMPT);
  L.push(``);
  L.push(`---`);
  L.push(``);
  L.push(`# PART B: DATA OF MY MOCK TEST`);
  L.push(``);

  // ---------------- B1 ----------------
  L.push(`## B1. Test details`);
  L.push(`- Paper: ${paper.name}`);
  L.push(`- Taken on: ${new Date(state.startedAt).toLocaleString()} (exported ${dateStr})`);
  L.push(`- Format: ${R.length} scored questions (${R.filter(r=>r.type!=="NUM").length} multiple choice, ${R.filter(r=>r.type==="NUM").length} numerical), 3 subjects, ${Math.round(DURATION_SEC/60)} minutes, maximum ${result.maxScore} marks`);
  L.push(`- Marking: +${MARKS_CORRECT} correct, ${MARKS_WRONG} wrong, ${MARKS_UNATTEMPTED} unattempted` + (numWrongMarks(paper)!==MARKS_WRONG ? ` (numerical questions: ${numWrongMarks(paper)} for a wrong answer)` : ``));
  const lim = numAttemptLimit(paper);
  if(lim!=null) L.push(`- Numerical section rule: each subject shows more numerical questions than may be answered; only ${lim} per subject count. Numericals I did not choose are NOT scored and are not part of any total below (they are listed separately in B5 and B6).`);
  L.push(`- Time used: ${mm(usedSec)} of ${mm(DURATION_SEC)}. Fair share of time per question: ${mm(benchSec)} (${Math.round(DURATION_SEC/60)} min / ${R.length} questions). All times are minutes:seconds.`);
  L.push(`- "Wasted time" = time spent on questions I got wrong or left unattempted. "Tried but left" = a question I opened but left unanswered; "never opened" = a question I did not visit. Attempt rate, accuracy and wrong-answer rate follow your PART A definitions.`);
  L.push(`- The answer key may have been corrected by me inside the app (those questions carry a note in B5 where it applies).`);
  L.push(``);

  // ---------------- B2 ----------------
  L.push(`## B2. Score (the platform's own numbers: verify them as PART A, Rule 1 says)`);
  L.push(`| Metric | Value |`);
  L.push(`|---|---|`);
  L.push(`| Overall score | ${result.totalScore} / ${result.maxScore} (${pct(result.percentage)}) |`);
  L.push(`| Correct / Wrong / Unattempted | ${result.correct} / ${result.wrong} / ${result.unattempted} |`);
  L.push(`| Attempted | ${result.attempted} of ${R.length} (attempt rate ${pct(result.attempted/R.length*100)}) |`);
  L.push(`| Accuracy on attempted | ${pct(result.accuracy)} |`);
  L.push(`| Negative marks lost | ${result.negMarksLost} |`);
  L.push(`| Score if wrong answers had cost nothing | ${result.potentialNoNeg} / ${result.maxScore} |`);
  L.push(`| Wrong-answer rate among attempts | ${result.attempted ? pct(result.wrong/result.attempted*100) : "n/a"} (${result.wrong} of ${result.attempted} attempted) |`);
  L.push(``);
  L.push(`Score per subject:`);
  L.push(`| Subject | Score | % of subject max | Correct | Wrong | Unattempted | Marks gained | Marks lost (negative) | Share of my total | Accuracy | Wrong rate among attempts | Attempt rate |`);
  L.push(`|---|---|---|---|---|---|---|---|---|---|---|---|`);
  SUBJECTS.forEach(sub=>{
    const b = result.bySubject[sub];
    const share = result.totalScore>0 ? pct(b.score/result.totalScore*100) : "n/a";
    L.push(`| ${sub} | ${b.score}/${b.max} | ${pct(b.score/b.max*100)} | ${b.correct} | ${b.wrong} | ${b.unattempted} | +${b.correct*MARKS_CORRECT} | ${b.lostMarks ? "-"+b.lostMarks : "0"} | ${share} | ${b.attempted ? pct(b.accuracy) : "n/a"} | ${b.attempted ? pct(b.wrong/b.attempted*100) : "n/a"} | ${pct(b.attemptRate)} |`);
  });
  L.push(``);
  { const parts = SUBJECTS.map(sub=>{ const b = result.bySubject[sub]; return `${sub}: ${b.correct} x ${MARKS_CORRECT} + ${b.wrong} x (${MARKS_WRONG}) = ${b.correct*MARKS_CORRECT + b.wrong*MARKS_WRONG}`; });
    const calc = SUBJECTS.reduce((a,sub)=>{ const b = result.bySubject[sub]; return a + b.correct*MARKS_CORRECT + b.wrong*MARKS_WRONG; },0);
    L.push(`Score check (marks = correct x ${MARKS_CORRECT} + wrong x (${MARKS_WRONG})): ${parts.join("; ")}. Total ${calc} against the platform's ${result.totalScore}: ${calc===result.totalScore ? "they match" : "THEY DO NOT MATCH (bonus or dropped questions may explain it); flag this"}.`);
    L.push(``); }
  L.push(`Multiple choice vs numerical, per subject:`);
  L.push(`| Subject | Type | Questions | Correct | Wrong | Unattempted | Accuracy | Marks |`);
  L.push(`|---|---|---|---|---|---|---|---|`);
  SUBJECTS.forEach(sub=>{
    [["MCQ","Multiple choice"],["NUM","Numerical"]].forEach(([t,label])=>{
      const rs = R.filter(r=>r.subject===sub && (t==="NUM" ? r.type==="NUM" : r.type!=="NUM"));
      if(!rs.length) return;
      const c = rs.filter(r=>r.result==="correct").length, w = rs.filter(r=>r.result==="wrong").length, u = rs.length-c-w;
      L.push(`| ${sub} | ${label} | ${rs.length} | ${c} | ${w} | ${u} | ${(c+w) ? pct(c/(c+w)*100) : "n/a"} | ${sum(rs, r=>r.marks)} |`);
    });
  });
  L.push(``);
  // ---------------- B2b ----------------
  L.push(`## B2b. Where marks were lost (the numbers for PART A, Rule 7)`);
  L.push(`| Subject | Negative marks lost | Wrong answers (each one turned correct = +${MARKS_CORRECT-MARKS_WRONG}; skipped instead = +${-MARKS_WRONG}) | Unattempted, tried but left | Unattempted, never opened | Ceiling if every unattempted were correct (+${MARKS_CORRECT} each) |`);
  L.push(`|---|---|---|---|---|---|`);
  SUBJECTS.forEach(sub=>{
    const rs = R.filter(r=>r.subject===sub), w = rs.filter(r=>r.result==="wrong").length, u = rs.filter(r=>r.result==="unattempted");
    L.push(`| ${sub} | ${w*-MARKS_WRONG} | ${w} | ${u.filter(r=>r.status!==STATUS.NOT_VISITED).length} | ${u.filter(r=>r.status===STATUS.NOT_VISITED).length} | +${u.length*MARKS_CORRECT} |`);
  });
  L.push(`| All | ${result.negMarksLost} | ${wro.length} | ${tried.length} | ${never.length} | +${una.length*MARKS_CORRECT} |`);
  L.push(`These are ceilings, not forecasts: not every unattempted question was solvable by me. Use B6 and your own re-solving to estimate how many were.`);
  L.push(``);

  // ---------------- B3 ----------------
  L.push(`## B3. Time data`);
  L.push(`- Total time spent on questions: ${mm(result.totalTime)} of ${mm(DURATION_SEC)}`);
  L.push(`- Average time per attempted question: ${mm(result.avgTimePerQ)} (fair share: ${mm(benchSec)})`);
  L.push(`- Average time on correct answers: ${mm(avg(cor))}; on wrong answers: ${mm(avg(wro))}; on unattempted questions: ${mm(avg(una))}`);
  L.push(`- Time on questions I got right: ${mm(sum(cor, r=>r.timeSpent))}`);
  L.push(`- Wasted time: ${mm(wastedSec)} = ${mm(result.timeWastedOnWrong)} on wrong answers + ${mm(result.timeOnUnattempted)} on unattempted questions (${result.totalTime>0 ? pct(wastedSec/result.totalTime*100) : "0.0%"} of the time I used)`);
  L.push(`- Unattempted: ${tried.length} tried but left (${tried.length ? tried.map(r=>"Q"+r.n).join(", ") : "none"}), taking ${mm(sum(tried, r=>r.timeSpent))} in total; ${never.length} never opened${never.length ? " (" + never.map(r=>"Q"+r.n).join(", ") + ")" : ""}`);
  if(notChosenList.length) L.push(`- Optional numericals I did not choose (not scored): ${notChosenList.length}, yet I spent ${mm(sum(notChosenList, r=>r.timeSpent))} on them`);
  const rev = R.filter(r=>r.markedForReview);
  L.push(`- Marked for review: ${rev.length ? rev.map(r=>"Q"+r.n).join(", ") : "none"}`);
  L.push(``);
  L.push(`Time by subject and outcome:`);
  L.push(`| Subject | Total time | Avg / question | Time on correct | Time on wrong | Time on unattempted |`);
  L.push(`|---|---|---|---|---|---|`);
  SUBJECTS.forEach(sub=>{
    const rs = R.filter(r=>r.subject===sub);
    const t = res => sum(rs.filter(r=>r.result===res), r=>r.timeSpent);
    L.push(`| ${sub} | ${mm(sum(rs, r=>r.timeSpent))} | ${mm(avg(rs))} | ${mm(t("correct"))} | ${mm(t("wrong"))} | ${mm(t("unattempted"))} |`);
  });
  L.push(``);
  L.push(`Time by question type:`);
  L.push(`| Type | Questions | Avg time | Avg on correct | Avg on wrong | Avg on unattempted |`);
  L.push(`|---|---|---|---|---|---|`);
  [["MCQ","Multiple choice"],["NUM","Numerical"]].forEach(([t,label])=>{
    const rs = R.filter(r=>t==="NUM" ? r.type==="NUM" : r.type!=="NUM"); if(!rs.length) return;
    L.push(`| ${label} | ${rs.length} | ${mm(avg(rs))} | ${mm(avg(rs.filter(r=>r.result==="correct")))} | ${mm(avg(rs.filter(r=>r.result==="wrong")))} | ${mm(avg(rs.filter(r=>r.result==="unattempted")))} |`);
  });
  L.push(``);
  L.push(`How my time was spread (time spent per question):`);
  L.push(`| Time on a question | Questions | Correct | Wrong | Unattempted | Total time |`);
  L.push(`|---|---|---|---|---|---|`);
  [["under 1 min",0,60],["1 to 2 min",60,120],["2 to 3 min",120,180],["3 to 5 min",180,300],["over 5 min",300,Infinity]].forEach(([label,lo,hi])=>{
    const rs = R.filter(r=>r.timeSpent>=lo && r.timeSpent<hi);
    L.push(`| ${label} | ${rs.length} | ${rs.filter(r=>r.result==="correct").length} | ${rs.filter(r=>r.result==="wrong").length} | ${rs.filter(r=>r.result==="unattempted").length} | ${mm(sum(rs, r=>r.timeSpent))} |`);
  });
  L.push(``);
  {
    const att = R.filter(r=>r.result==="correct"||r.result==="wrong");
    const q30 = att.filter(r=>r.timeSpent<30), q60 = att.filter(r=>r.timeSpent<60);
    const cw = l => `${l.filter(r=>r.result==="correct").length} correct, ${l.filter(r=>r.result==="wrong").length} wrong`;
    L.push(`Quick answers (possible guesses or snap decisions): answered in under 30 s: ${q30.length} (${cw(q30)}); in under 60 s: ${q60.length} (${cw(q60)}).`);
    const mcq = att.filter(r=>r.type!=="NUM"), num = att.filter(r=>r.type==="NUM");
    const acc = l => l.length ? pct(l.filter(r=>r.result==="correct").length/l.length*100) + ` of ${l.length}` : "n/a";
    L.push(`Guessing maths: under +${MARKS_CORRECT} / ${MARKS_WRONG} marking, a blind guess on a multiple-choice question has a break-even chance of ${pct(-MARKS_WRONG/(MARKS_CORRECT-MARKS_WRONG)*100)}. My accuracy on attempted multiple choice: ${acc(mcq)}; on numerical: ${acc(num)}.`);
    L.push(``);
    const med = a => { if(!a.length) return 0; const b = [...a].sort((x,y)=>x-y), m = b.length>>1; return b.length%2 ? b[m] : (b[m-1]+b[m])/2; };
    const q75 = a => { if(!a.length) return 0; const b = [...a].sort((x,y)=>x-y); return b[Math.min(b.length-1, Math.floor(b.length*0.75))]; };
    L.push(`How long my CORRECT answers took (use this to derive time limits from my own speed, as PART A, Rule 11 asks):`);
    L.push(`| Subject | Type | Correct answers | Median time | 75th percentile | Slowest | Median time on my WRONG answers there |`);
    L.push(`|---|---|---|---|---|---|---|`);
    SUBJECTS.forEach(sub=>[["MCQ","Multiple choice"],["NUM","Numerical"]].forEach(([t,label])=>{
      const rs = R.filter(r=>r.subject===sub && (t==="NUM" ? r.type==="NUM" : r.type!=="NUM"));
      const c = rs.filter(r=>r.result==="correct").map(r=>r.timeSpent), w = rs.filter(r=>r.result==="wrong").map(r=>r.timeSpent);
      if(!c.length && !w.length) return;
      L.push(`| ${sub} | ${label} | ${c.length} | ${c.length ? mm(med(c)) : "n/a"} | ${c.length ? mm(q75(c)) : "n/a"} | ${c.length ? mm(Math.max(...c)) : "n/a"} | ${w.length ? mm(med(w)) : "n/a"} |`);
    }));
    L.push(``);
    L.push(`Return on time by subject:`);
    L.push(`| Subject | Time spent | Net marks | Marks per minute | Minutes per correct answer |`);
    L.push(`|---|---|---|---|---|`);
    SUBJECTS.forEach(sub=>{
      const rs = R.filter(r=>r.subject===sub), t = sum(rs, r=>r.timeSpent), m = sum(rs, r=>r.marks), c = rs.filter(r=>r.result==="correct").length;
      L.push(`| ${sub} | ${mm(t)} | ${m} | ${t>0 ? (m/(t/60)).toFixed(2) : "n/a"} | ${c ? (t/60/c).toFixed(1) + " min" : "n/a"} |`);
    });
    L.push(``);
  }
  const traps = R.filter(r=>r.result!=="correct" && r.timeSpent>benchSec*1.5).sort((a,b)=>b.timeSpent-a.timeSpent);
  L.push(`Time sinks: questions I did NOT get right but spent more than 1.5x the fair share (${mm(benchSec*1.5)}) on:${traps.length ? "" : " none"}`);
  traps.slice(0,20).forEach(r=>L.push(`- Q${r.n} (${r.subject}, ${cell(r.chapter)}, ${r.type==="NUM" ? "numerical" : "multiple choice"}): ${mm(r.timeSpent)}, ${r.result==="unattempted" ? "tried but left unattempted" : "wrong"}`));
  if(traps.length) L.push(`- Together ${traps.length===1 ? "this question" : "these "+traps.length+" questions"} took ${mm(sum(traps, r=>r.timeSpent))} and gave ${sum(traps, r=>r.marks)} marks.`);
  L.push(``);
  const slow = [...R].sort((a,b)=>b.timeSpent-a.timeSpent).slice(0,10).filter(r=>r.timeSpent>0);
  if(slow.length){
    L.push(`Questions where I spent the most time:`);
    slow.forEach(r=>L.push(`- Q${r.n} (${r.subject}, ${cell(r.chapter)}): ${mm(r.timeSpent)}, ${r.result}`));
    L.push(``);
  }
  L.push(`When I worked on each subject (minutes after the test started, from the first and the last time I opened its questions):`);
  L.push(`| Subject | First question opened at | Last question opened at | Questions opened | Questions never opened |`);
  L.push(`|---|---|---|---|---|`);
  SUBJECTS.forEach(sub=>{
    const rs = R.filter(r=>r.subject===sub);
    const first = rs.map(r=>perQ[r.n] && perQ[r.n].openedAt).filter(Boolean), last = rs.map(r=>perQ[r.n] && perQ[r.n].lastOpenedAt).filter(Boolean);
    L.push(`| ${sub} | ${first.length ? atMin(Math.min(...first)) : "-"} | ${last.length ? atMin(Math.max(...last)) : "-"} | ${rs.length - rs.filter(r=>r.status===STATUS.NOT_VISITED).length} | ${rs.filter(r=>r.status===STATUS.NOT_VISITED).length} |`);
  });
  L.push(``);
  { const rows = [];
    for(let a=0; a<DURATION_SEC/60; a+=30){
      const rs = R.filter(r=>{ const m = minInto(perQ[r.n] && perQ[r.n].openedAt); return m!=null && m>=a && m<a+30; });
      rows.push(`| ${a} to ${a+30} min | ${rs.length} | ${rs.filter(r=>r.result==="correct").length} | ${rs.filter(r=>r.result==="wrong").length} | ${rs.filter(r=>r.result==="unattempted").length} | ${rs.length ? pct(rs.filter(r=>r.result==="correct").length/Math.max(1, rs.filter(r=>r.result!=="unattempted").length)*100) : "n/a"} |`);
    }
    if(R.some(r=>perQ[r.n] && perQ[r.n].openedAt)){
      L.push(`Pace through the test (questions grouped by when I FIRST opened them):`);
      L.push(`| First opened between | Questions | Correct | Wrong | Unattempted | Accuracy on attempted |`);
      L.push(`|---|---|---|---|---|---|`);
      rows.forEach(x=>L.push(x)); L.push(``);
    } }
  L.push(`Limitation: the platform stores only the TOTAL time on each question and when it was first and last opened. It does not store an event-by-event log, so the exact order of my visits, the number of revisits, and how a question's time was split between visits are NOT known. Do not pretend otherwise.`);
  L.push(``);

  // ---------------- B4 ----------------
  L.push(`## B4. Chapter-wise data (most wasted time first)`);
  L.push(`Questions available are the questions of this paper only (a small sample per chapter), so state the sample size and a confidence level for every chapter you judge. "Wasted time" = time on wrong + unattempted questions of that chapter.`);
  L.push(``);
  L.push(`| Subject | Chapter | Questions | Attempted | Correct | Wrong | Tried but left | Never opened | Accuracy | Marks | Time spent | Avg time / attempted | Wasted time |`);
  L.push(`|---|---|---|---|---|---|---|---|---|---|---|---|---|`);
  result.chapterStats.map(c=>{
    const rs = R.filter(r=>r.subject===c.subject && r.chapter===c.chapter);
    const att = rs.filter(r=>r.result!=="unattempted");
    const tr = rs.filter(r=>r.result==="unattempted" && r.status!==STATUS.NOT_VISITED).length;
    const nv = rs.filter(r=>r.result==="unattempted" && r.status===STATUS.NOT_VISITED).length;
    const wasted = sum(rs.filter(r=>r.result==="wrong" || r.result==="unattempted"), r=>r.timeSpent);
    return {c, tr, nv, total:sum(rs, r=>r.timeSpent), avgAtt:avg(att), wasted};
  }).sort((a,b)=>b.wasted-a.wasted || a.c.score-b.c.score).forEach(({c,tr,nv,total,avgAtt,wasted})=>{
    L.push(`| ${cell(c.subject)} | ${cell(c.chapter)} | ${c.total} | ${c.attempted} | ${c.correct} | ${c.wrong} | ${tr} | ${nv} | ${c.attempted ? pct(c.accuracy) : "n/a"} | ${c.score} | ${mm(total)} | ${c.attempted ? mm(avgAtt) : "n/a"} | ${mm(wasted)} |`);
  });
  L.push(``);

  // ---------------- B5 ----------------
  L.push(`## B5. Every question, one line each`);
  const anyTag = R.some(r=>r.errorTag), anyEdit = R.some(r=>r.keyEdited);
  L.push(`| Q | Subject | Chapter | Type | My answer | Correct answer | Result | Marks | Time | vs fair share | Status | First opened | Last opened${anyTag ? " | Error tag I set" : ""}${anyEdit ? " | Key corrected by me" : ""} |`);
  L.push(`|---|---|---|---|---|---|---|---|---|---|---|---|---${anyTag ? "|---" : ""}${anyEdit ? "|---" : ""}|`);
  R.forEach(r=>{
    const vs = r.timeSpent - benchSec, pq = perQ[r.n] || {};
    const how = r.result==="unattempted" ? (r.status===STATUS.NOT_VISITED ? "never opened" : "tried but left") : r.result;
    L.push(`| ${r.n} | ${r.subject} | ${cell(r.chapter)} | ${r.type==="NUM" ? "Numerical" : "MCQ"} | ${r.result==="unattempted" ? "-" : (r.yourAnswer ?? "-")} | ${r.correctAnswer} | ${how} | ${r.marks} | ${mm(r.timeSpent)} | ${vs>=0 ? "+" : "-"}${mm(Math.abs(vs))} | ${STATUS_META[r.status].label}${r.markedForReview && !/marked/i.test(STATUS_META[r.status].label) ? ", marked for review" : ""} | ${atMin(pq.openedAt)} | ${atMin(pq.lastOpenedAt)}${anyTag ? " | " + cell(r.errorTag || "") : ""}${anyEdit ? " | " + (r.keyEdited ? "yes" : "") : ""} |`);
  });
  L.push(``);
  if(notChosenList.length){
    L.push(`Optional numericals I did not choose (not scored, not counted anywhere above):`);
    L.push(`| Q | Subject | Chapter | Time spent |`);
    L.push(`|---|---|---|---|`);
    notChosenList.forEach(r=>L.push(`| ${r.n} | ${r.subject} | ${cell(r.chapter)} | ${mm(r.timeSpent)} |`));
    L.push(``);
  }

  // ---------------- B6 ----------------
  const slowSet = new Set(R.filter(r=>r.timeSpent>benchSec*1.5).map(r=>r.n));
  const want = new Map();
  const addAll = (list, why) => list.forEach(r=>{ if(!want.has(r.n)) want.set(r.n, {r, why:[]}); want.get(r.n).why.push(why); });
  addAll(wro, "wrong"); addAll(una, "unattempted"); addAll(R.filter(r=>r.markedForReview), "marked for review");
  addAll(R.filter(r=>slowSet.has(r.n) && r.result==="correct"), "correct but slow"); addAll(notChosenList, "optional numerical not chosen");
  const items = [...want.values()].sort((a,b)=>a.r.n-b.r.n);
  L.push(`## B6. Full questions to re-solve (${items.length}: every wrong, unattempted, marked-for-review and not-chosen question, plus correct answers that were slow)`);
  L.push(`For correct answers that were neither slow nor marked, only the data in B5 is given.`);
  L.push(``);
  let figCount = 0;
  items.forEach(({r,why})=>{
    const q = qMap[r.n]; const vs = r.timeSpent - benchSec;
    L.push(`### Q${r.n} | ${r.subject} | ${r.chapter} | ${r.type==="NUM" ? "Numerical" : "Multiple choice"} | ${why.join(", ")}`);
    { const same = R.filter(x=>x.subject===r.subject && x.chapter===r.chapter); L.push(`- My record in this chapter in this test: ${same.filter(x=>x.result==="correct").length} correct, ${same.filter(x=>x.result==="wrong").length} wrong, ${same.filter(x=>x.result==="unattempted").length} unattempted (of ${same.length})`); }
    L.push(`- Result: ${r.result==="notchosen" ? "not scored (optional numerical I did not choose)" : r.result + ", marks " + signed(r.marks)}`);
    L.push(`- Time spent: ${mm(r.timeSpent)} (${vs>=0 ? mm(vs)+" over" : mm(-vs)+" under"} the fair share of ${mm(benchSec)}); status: ${STATUS_META[r.status].label}${r.markedForReview ? "; marked for review" : ""}${r.errorTag ? "; error tag I set: "+r.errorTag : ""}`);
    if(r.result==="wrong") L.push(`- My answer: ${r.yourAnswer ?? "-"}${optText(q, r.yourAnswer)}`);
    else if(r.result==="correct") L.push(`- My answer: ${r.yourAnswer ?? "-"} (correct)`);
    else L.push(`- My answer: none`);
    L.push(`- Official answer: ${r.correctAnswer}${optText(q, r.correctAnswer)}${r.keyEdited ? " (I corrected the built-in answer key for this question)" : ""}`);
    if(notesAll[r.n] !== undefined && String(notesAll[r.n]).trim()) L.push(`- My own note on this question: ${String(notesAll[r.n]).replace(/\s*\n\s*/g," / ")}`);
    if(imgsAll[r.n] && imgsAll[r.n].length) L.push(`- I also attached ${imgsAll[r.n].length} picture${imgsAll[r.n].length!==1?"s":""} to my note (not included here).`);
    if(q){
      L.push(``);
      L.push(`Question: ${aiText(q.text)}`);
      if(hasFigure(q)){ figCount++; L.push(`**FIGURE NOT INCLUDED:** this question has a diagram, graph or table shown as a picture that is not in this file. Part of the question may be missing, so say so instead of guessing.`); }
      if(q.options){ L.push(``); q.options.forEach(o=>L.push(`- (${o.id}) ${aiText(o.text)}`)); }
      else L.push(`(Numerical answer type: no options.)`);
    }
    L.push(``);
  });

  // ---------------- B7 ----------------
  const otherNotes = Object.keys(notesAll).map(Number).filter(n=>!want.has(n) && String(notesAll[n]??"").trim()).sort((a,b)=>a-b);
  if(otherNotes.length){
    L.push(`## B7. My notes on other questions`);
    otherNotes.forEach(n=>{ const r = R.find(x=>x.n===n); L.push(`- Q${n}${r ? " (" + r.subject + ", " + cell(r.chapter) + ", " + r.result + ")" : ""}: ${String(notesAll[n]).replace(/\s*\n\s*/g," / ")}`); });
    L.push(``);
  }

  // ---------------- B8 ----------------
  const earlier = loadHistory().filter(e=>e.snapshot && e.snapshot.startedAt!==state.startedAt).slice(0,10);
  L.push(`## B8. My earlier mock tests in this app (newest first, up to 10)`);
  if(earlier.length){
    const rows = earlier.map(e=>{
      let r2 = null; try{ if(e.snapshot.perQ && !paperMissing(e.snapshot.paperId)) r2 = scoreExam(e.snapshot); }catch(err){}
      return {e, r2};
    });
    L.push(`| Test | Date | Score | Correct / Wrong / Unattempted | Accuracy | Attempt rate | Avg time per attempted question | Wasted time | ${SUBJECTS.map(x=>x+" score").join(" | ")} |`);
    L.push(`|---|---|---|---|---|---|---|---|${SUBJECTS.map(()=>"---").join("|")}|`);
    L.push(`| **THIS TEST** | ${dateStr} | ${result.totalScore} / ${result.maxScore} | ${result.correct} / ${result.wrong} / ${result.unattempted} | ${pct(result.accuracy)} | ${pct(result.attempted/R.length*100)} | ${mm(result.avgTimePerQ)} | ${mm(wastedSec)} | ${SUBJECTS.map(x=>result.bySubject[x].score).join(" | ")} |`);
    rows.forEach(({e,r2})=>{
      if(r2) L.push(`| ${cell(e.testName)} | ${cell(e.date)} | ${r2.totalScore} / ${r2.maxScore} | ${r2.correct} / ${r2.wrong} / ${r2.unattempted} | ${pct(r2.accuracy)} | ${pct(r2.attempted/(r2.perQuestionResults.length||1)*100)} | ${mm(r2.avgTimePerQ)} | ${mm(r2.timeWastedOnWrong + r2.timeOnUnattempted)} | ${SUBJECTS.map(x=>r2.bySubject[x] ? r2.bySubject[x].score : "-").join(" | ")} |`);
      else L.push(`| ${cell(e.testName)} | ${cell(e.date)} | ${e.score} / ${e.maxScore} | - | ${pct(e.accuracy)} | - | - | - | ${SUBJECTS.map(()=>"-").join(" | ")} |`);
    });
    L.push(``);
    // chapter totals across this test and the earlier ones (PART A, Rule 8: repeated chapters)
    const agg = {};
    const add = (c, mine) => { const k = c.subject + " | " + c.chapter; const o = agg[k] = agg[k] || {subject:c.subject, chapter:c.chapter, tests:0, att:0, cor:0, wro:0, una:0, mine:null}; o.tests++; o.att += c.attempted; o.cor += c.correct; o.wro += c.wrong; o.una += c.unattempted; if(mine) o.mine = c; };
    result.chapterStats.forEach(c=>add(c, true));
    rows.forEach(({r2})=>{ if(r2) r2.chapterStats.forEach(c=>add(c, false)); });
    const list = Object.values(agg).filter(o=>o.tests>1).sort((a,b)=>b.wro-a.wro || a.cor-b.cor).slice(0,30);
    if(list.length){
      L.push(`Chapters across this test and my earlier tests (only chapters that appear in 2 or more tests; most wrong answers first):`);
      L.push(`| Subject | Chapter | Tests | Attempted | Correct | Wrong | Unattempted | Accuracy over all | This test: correct / wrong / unattempted |`);
      L.push(`|---|---|---|---|---|---|---|---|---|`);
      list.forEach(o=>L.push(`| ${cell(o.subject)} | ${cell(o.chapter)} | ${o.tests} | ${o.att} | ${o.cor} | ${o.wro} | ${o.una} | ${o.att ? pct(o.cor/o.att*100) : "n/a"} | ${o.mine ? o.mine.correct+" / "+o.mine.wrong+" / "+o.mine.unattempted : "-"} |`));
      L.push(``);
    }
    const same = rows.filter(({e})=>e.snapshot.paperId===state.paperId).length;
    L.push(`Caution for PART A, Rule 8: these tests are different papers (or retakes${same ? ": " + same + " earlier attempt" + (same!==1?"s":"") + " of this same paper" : ""}), so difficulty differs and a chapter may have only 1 to 3 questions per paper. Question-level data of the earlier mocks (which questions I got wrong, my answers, time per question) is not included. Do not claim a trend from a handful of questions; say how confident you are.`);
  } else L.push(`No earlier attempts are saved in this app, so there is nothing to compare for PART A, Rule 8. Say so instead of inventing a trend.`);
  L.push(``);

  // ---------------- B9 ----------------
  L.push(`## B9. Not available in this file`);
  L.push(`- Official solutions and the question difficulty: not supplied. Work out the solution yourself (PART A, Rule 2) and justify any difficulty you assign.`);
  L.push(`- The chapter shown for each question is the platform's label; there is no sub-topic. Say when you infer a sub-topic.`);
  L.push(`- ${figCount ? figCount + " of the questions in B6 depend on a picture that is not in this text file" : "No question in B6 depends on a picture"}${figCount ? " (flagged FIGURE NOT INCLUDED). The 'Wrong + Unattempted Question List' PDF from the app has those figures for the wrong and unattempted ones." : "."}`);
  L.push(`- The order and number of my visits to each question, and my confidence while answering: not recorded (see the limitation in B3).`);
  L.push(`- Question-level data of my earlier mocks: not included (B8 has their totals, subject scores and chapter totals only).`);
  L.push(``);
  return L.join("\n");
}
export function exportResultsForAI(state, result){
  const report = buildAIReport(state, result, new Date().toLocaleDateString());
  const blob = new Blob([report], {type:"text/markdown;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${state.testName.replace(/[^a-z0-9]+/gi,"_")}_result_for_AI.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// Wrong + unattempted questions -> ONE PDF (text + figures embedded), ready to upload to ChatGPT
export function pdfSafe(t){
  return String(t ?? "")
    .replace(/\u0394/g,"Delta").replace(/\u03c0/g,"pi").replace(/\u2192/g,"->")
    .replace(/\u2261/g,"==").replace(/\u03bc/g,"micro")
    .replace(/[^\x00-\xFF]/g,"?");
}
// jsPDF cannot embed SVG, so SVG figures are drawn onto a canvas and converted to PNG first
export function svgUriToPng(uri, w, h){
  return new Promise((res)=>{
    const im = new Image();
    im.onload = ()=>{
      try{
        const S = 3;
        const c = document.createElement("canvas");
        c.width = Math.round(w*S); c.height = Math.round(h*S);
        const g = c.getContext("2d");
        g.fillStyle = "#fff"; g.fillRect(0,0,c.width,c.height);
        g.drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL("image/png"));
      }catch(e){ res(null); }
    };
    im.onerror = ()=>res(null);
    im.src = uri;
  });
}
export async function exportWrongUnattemptedForAI(state, result){
  const {jsPDF: JsPDF} = await import("jspdf");

  const paper = getPaper(state.paperId);
  const qMap = {}; paper.questions.forEach(q=>{ qMap[q.n] = q; });
  const R = result.perQuestionResults;
  const wro = R.filter(r=>r.result==="wrong");
  const una = R.filter(r=>r.result==="unattempted");

  // collect every figure id used by these questions and make sure each one is PNG/JPEG
  const usedIds = new Set();
  const ncl = result.notChosen || [];
  [...wro, ...una, ...ncl].forEach(r=>{
    const q = qMap[r.n] || {};
    if(q.svg) usedIds.add(q.svg);
    const scan = t => String(t ?? "").replace(/\[\[img:(\w+)\]\]/g, (m,id)=>{ usedIds.add(id); return m; });
    scan(q.text); (q.options||[]).forEach(o=>scan(o.text));
  });
  const figUri = {};
  for(const id of usedIds){
    const f = FIG_IMAGES[id]; if(!f) continue;
    if(/^data:image\/(png|jpe?g)/i.test(f.uri)) figUri[id] = f.uri;
    else figUri[id] = await svgUriToPng(f.uri, f.w, f.h);
  }

  const doc = new JsPDF({unit:"mm", format:"a4"});
  const PW = 210, PH = 297, M = 15, CW = PW - 2*M;
  let y = M;
  const ensure = h => { if(y + h > PH - M){ doc.addPage(); y = M; } };
  const text = (t, o) => {
    o = o || {};
    const size = o.size || 10, gap = o.gap == null ? 1.5 : o.gap;
    doc.setFont("helvetica", o.bold ? "bold" : "normal"); doc.setFontSize(size);
    const lh = size * 0.3528 * 1.4;
    doc.splitTextToSize(pdfSafe(t), CW).forEach(l=>{ ensure(lh); doc.text(l, M, y + lh*0.75); y += lh; });
    y += gap;
  };
  const img = id => {
    const f = FIG_IMAGES[id];
    if(!f || !figUri[id]){ text("[figure not available - ask me to describe it]"); return; }
    let w = Math.min(f.w * 0.2646, CW), h = w * f.h / f.w;
    if(h > 110){ h = 110; w = h * f.w / f.h; }
    ensure(h + 3);
    const m = /^data:image\/(\w+)/.exec(figUri[id]);
    const fmt = (m ? m[1] : "png").toUpperCase().replace("JPG","JPEG");
    doc.addImage(figUri[id], fmt, M, y, w, h);
    y += h + 3;
  };
  // text with inline [[img:id]] figures; `prefix` is e.g. "(A) " for options
  const rich = (t, prefix) => {
    let pre = prefix || "";
    const parts = String(t ?? "").split(/(\[\[img:\w+\]\])/).filter(p=>p.trim() !== "");
    if(!parts.length){ if(pre) text(pre); return; }
    parts.forEach(p=>{
      const m = /^\[\[img:(\w+)\]\]$/.exec(p);
      if(m){ if(pre){ text(pre, {gap:0.5}); pre = ""; } img(m[1]); }
      else { text(pre + p.trim()); pre = ""; }
    });
  };

  text(`${paper.name}: wrong and unattempted questions`, {bold:true, size:15, gap:3});
  text("Instructions for the AI", {bold:true, size:12});
  text("HOW TO REPLY (most important): Be fast. Give me ONE question at a time, then stop and wait. I will type \"next\" when I want the next question. Keep your language short and simple: do not repeat the question or the answer text, put your focus on the SOLUTION. No fluff, no long introductions, no extra talk.", {bold:true, size:11, gap:3});
  text("You are an expert JEE Main teacher. Below are the questions I got wrong or did not attempt in a mock test. For EACH question, give me:");
  text("1. JEE method: the fastest exam-oriented way (shortcut, trick, elimination, standard formula) I can use in the real exam.", {gap:0.5});
  text("2. Normal method: the full, step-by-step textbook solution.");
  text("Also state the chapter/concept to revise. The correct answer is given for each question, so check your final answer against it. Math is written in LaTeX. Figures are embedded in this PDF as images, right inside each question: look at them carefully before solving. If a figure is unclear or missing, tell me instead of guessing. Go in the order of this PDF, one question at a time, as said above.");
  text(`Wrong: ${wro.length} | Unattempted: ${una.length}` + (ncl.length ? ` | Optional numericals not chosen (not scored): ${ncl.length}` : ""), {bold:true, gap:4});

  const block = r => {
    const q = qMap[r.n] || {};
    ensure(40);
    doc.setDrawColor(150); doc.line(M, y, PW - M, y); y += 3;
    text(`Q${r.n} (${r.subject} - ${r.chapter})`, {bold:true, size:11});
    rich(q.text);
    if(q.svg) img(q.svg);
    if(q.options && q.options.length){
      q.options.forEach(x=>rich(x.text, `(${x.id}) `));
    } else {
      text("(Numerical answer type: no options.)");
    }
    text(`My answer: ${r.yourAnswer ?? "not attempted"}`, {gap:0.5});
    text(`Correct answer: ${r.correctAnswer}`, {gap:0.5});
    text(`Time I spent: ${fmtMinSec(r.timeSpent||0)}`, {gap:4});
  };
  text(`Part A: Wrong questions (${wro.length})`, {bold:true, size:13, gap:3});
  if(!wro.length) text("None.");
  wro.forEach(block);
  text(`Part B: Unattempted questions (${una.length})`, {bold:true, size:13, gap:3});
  if(!una.length) text("None.");
  una.forEach(block);
  if(ncl.length){
    text(`Part C: Optional numerical questions I did not choose (${ncl.length}, not scored)`, {bold:true, size:13, gap:3});
    text("These were optional (I could only answer some numericals per subject), so they are not part of my score. Please include them, so I can learn from them too.");
    ncl.forEach(block);
  }

  doc.save(`${state.testName.replace(/[^a-z0-9]+/gi,"_")}_wrong_unattempted_for_AI.pdf`);
}

// Party-popper confetti: bursts from the left and right edges when the results page opens.
// Plays only the first time a given attempt's result is shown (remembered per attempt).
