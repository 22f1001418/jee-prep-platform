import React, {useEffect, useMemo, useState} from "react";
import {QuestionBody} from "../components/NoteEditor";
import {fmtAttemptDate} from "../lib/constants";
import {NoteBody, hideNoteFromAllNotes, loadAllHl, loadAllImgs, loadAllNotes, loadConcealed, loadHiddenNotes, loadStarred, pruneOrphanStars, saveConcealed, saveStarred} from "../lib/notes";
import {getPaper, paperMissing} from "../lib/papers";
import {loadHistory} from "../lib/persistence";
import {compareKeys, examSortKey} from "./History";

// ---------- All Notes (every note, across every paper and every attempt) ----------
// Notes are stored per attempt (key = "paperId:startedAt"), never per
// question-across-attempts, so a note written on one attempt of a paper is
// otherwise only visible by opening that exact attempt's Analysis > Notes
// tab. This screen instead scans every stored note bucket directly,
// resolves each question back to its real text from the right paper (a
// question numbered 45 means something different in each paper, so the
// paper must travel with the note), and lists everything in one place —
// grouped by paper, newest attempt first — regardless of which attempt or
// exam it came from.
export function collectAllNotes(){
  const allNotes = loadAllNotes();     // {attemptKey: {qn: text}}
  const allHl = loadAllHl();           // {attemptKey: {qn: ranges}}
  const allImgs = loadAllImgs();       // {attemptKey: {qn: images}}
  const hidden = loadHiddenNotes();    // {attemptKey: [qn, qn, ...]} — "deleted" from this view only, not from storage
  const history = loadHistory();       // for a human test name + date per attempt, where available

  // Index history entries by attemptKey so a note can be labelled with the
  // attempt it came from even though notes and history are stored separately.
  const historyByKey = {};
  history.forEach(h=>{
    if(h.snapshot && h.snapshot.paperId && h.snapshot.startedAt){
      historyByKey[`${h.snapshot.paperId}:${h.snapshot.startedAt}`] = h;
    }
  });

  const attemptKeys = new Set([
    ...Object.keys(allNotes), ...Object.keys(allHl), ...Object.keys(allImgs)
  ]);

  const entries = []; // flat list of {paperId, paperName, attemptKey, attemptDate, qn, text, ranges, images, question}
  attemptKeys.forEach(attemptKey=>{
    const [paperId, startedAt] = attemptKey.split(":");
    if(paperMissing(paperId)) return; // paper not in this file: keep the notes stored, but never show them against another paper's questions
    const paper = getPaper(paperId);
    const h = historyByKey[attemptKey];
    const attemptDate = h ? h.date : null; // unknown if the attempt is no longer in history
    const notesForAttempt = allNotes[attemptKey] || {};
    const hlForAttempt = allHl[attemptKey] || {};
    const imgsForAttempt = allImgs[attemptKey] || {};
    const qns = new Set([
      ...Object.keys(notesForAttempt), ...Object.keys(hlForAttempt), ...Object.keys(imgsForAttempt)
    ]);
    const hiddenForAttempt = new Set(hidden[attemptKey] || []);
    qns.forEach(qnStr=>{
      const qn = Number(qnStr);
      if(hiddenForAttempt.has(qn)) return; // "deleted" from All Notes, but the underlying note is untouched
      const question = paper.questions.find(q=>q.n===qn);
      if(!question) return; // stale note referencing a question number that no longer exists in this paper
      entries.push({
        paperId, paperName: paper.name, attemptKey, attemptDate, startedAt: Number(startedAt),
        qn, text: notesForAttempt[qn], ranges: hlForAttempt[qn], images: imgsForAttempt[qn],
        question, yourAnswer: h ? (h.snapshot.perQ[qn] && h.snapshot.perQ[qn].response) : undefined,
      });
    });
  });

  // Group by paper, newest attempt first within each paper, question number order within an attempt.
  const byPaper = {};
  const paperOrder = [];
  entries.forEach(e=>{
    if(!byPaper[e.paperId]){ byPaper[e.paperId] = {paperId:e.paperId, paperName:e.paperName, attempts:{}}; paperOrder.push(e.paperId); }
    const g = byPaper[e.paperId];
    if(!g.attempts[e.attemptKey]) g.attempts[e.attemptKey] = {attemptKey:e.attemptKey, attemptDate:e.attemptDate, startedAt:e.startedAt, notes:[]};
    g.attempts[e.attemptKey].notes.push(e);
  });
  // Papers are listed by exam date and shift (earliest first, e.g. 22 Jan Shift 1, 22 Jan Shift 2, 23 Jan Shift 1 ...),
  // the same order as "Exam date, year & shift" on the history page; the sort is stable, so papers that
  // cannot be read keep their old order at the end.
  return paperOrder.map(pid=>{
    const g = byPaper[pid];
    const attempts = Object.values(g.attempts).sort((a,b)=>b.startedAt-a.startedAt);
    attempts.forEach(a=>a.notes.sort((x,y)=>x.qn-y.qn));
    return {...g, attempts};
  }).sort((x,y)=>compareKeys(examSortKey({paperId:x.paperId, testName:x.paperName}), examSortKey({paperId:y.paperId, testName:y.paperName})));
}

// Filter-menu block shared by All Notes and Starred Questions: Subject -> Chapter, each with how many items it holds.
// tree = {Subject: {n, ch:{Chapter: count}}}. onChoose({subject, chapter|null}) is called when one is picked.
export function buildSubjChapterTree(items){   // items: [{subject, chapter}]
  const t = {};
  items.forEach(e=>{ const sj = e.subject || "Other", ch = e.chapter || "Other"; const o = t[sj] = t[sj] || {n:0, ch:{}}; o.n++; o.ch[ch] = (o.ch[ch]||0) + 1; });
  return t;
}
export const SUBJECT_ORDER = ["Physics","Chemistry","Mathematics"];
export function orderSubjects(tree){ return SUBJECT_ORDER.filter(x=>tree[x]).concat(Object.keys(tree).filter(x=>!SUBJECT_ORDER.includes(x))); }
export function SubjectChapterTree({tree, subjOrder, chap, onChoose, noun}){
  noun = noun || "note";
  const [openSubj, setOpenSubj] = useState(chap ? chap.subject : null);
  return (
    <React.Fragment>
      <div style={{fontSize:11.5, fontWeight:700, letterSpacing:.4, color:"var(--text-faint)", textTransform:"uppercase", padding:"6px 10px"}}>Subject &rarr; Chapter</div>
      <div style={{maxHeight:300, overflowY:"auto"}}>
                    {subjOrder.length===0 && <div style={{padding:"6px 10px", fontSize:13, color:"var(--text-dim)"}}>No {noun}s yet.</div>}
                    {subjOrder.map(sj=>{
                      const open = openSubj===sj, subjHas = chap && chap.subject===sj;
                      const row = (on, label, count, onPick, indent)=>(
                        <button key={label} className={"btn"+(on ? " hist-sel" : "")} onClick={onPick}
                          style={{display:"flex", alignItems:"center", gap:8, width:"100%", textAlign:"left", border:"none", background: on ? undefined : "transparent",
                                  padding: indent ? "7px 10px 7px 12px" : "9px 10px", fontWeight:400, fontSize: indent ? 13 : undefined}}>
                          <span style={{flex:1, minWidth:0, overflowWrap:"anywhere"}}>{label}</span>
                          {on && <span style={{color:"var(--steel)", fontWeight:700}}>{"\u2713"}</span>}
                          <span style={{fontSize:11.5, color:"var(--text-dim)", background:"var(--bg)", border:"1px solid var(--border)", borderRadius:10, padding:"0 7px", lineHeight:"18px", minWidth:22, textAlign:"center"}}>{count}</span>
                        </button>
                      );
                      return (
                        <div key={sj}>
                          <button className="btn" onClick={()=>setOpenSubj(open ? null : sj)} aria-expanded={open}
                            style={{display:"flex", alignItems:"center", gap:8, width:"100%", textAlign:"left", border:"none", background:"transparent", padding:"9px 10px", fontWeight:500}}>
                            <span style={{display:"inline-block", width:12, fontSize:11, color:"var(--text-dim)", transform: open ? "rotate(90deg)" : "none", transition:"transform .12s"}}>{"\u25B6"}</span>
                            <span style={{flex:1, color: subjHas ? "var(--steel)" : undefined, fontWeight: subjHas ? 700 : 500}}>{sj}</span>
                            <span style={{fontSize:11.5, color:"var(--text-dim)"}}>{tree[sj].n} {noun}{tree[sj].n!==1?"s":""}</span>
                          </button>
                          {open && (
                            <div style={{marginLeft:15, paddingLeft:8, borderLeft:"2px solid var(--border)", marginBottom:4}}>
                              {row(!!(chap && chap.subject===sj && chap.chapter==null), "All " + sj, tree[sj].n, ()=>onChoose({subject:sj, chapter:null}), true)}
                              {Object.keys(tree[sj].ch).sort().map(ch=>row(!!(chap && chap.subject===sj && chap.chapter===ch), ch, tree[sj].ch[ch], ()=>onChoose({subject:sj, chapter:ch}), true))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
    </React.Fragment>
  );
}
export function AllNotesScreen({onBack, onViewStarredQ}){
  const [refreshTick, setRefreshTick] = useState(0);
  const groups = useMemo(()=>collectAllNotes(), [refreshTick]);
  const totalNotes = groups.reduce((s,g)=>s+g.attempts.reduce((s2,a)=>s2+a.notes.length,0), 0);
  const [openEntry, setOpenEntry] = useState(null); // `${attemptKey}:${qn}` of the question currently expanded
  const [confirmEntry, setConfirmEntry] = useState(null); // entryKey awaiting delete confirmation
  const [concealed, setConcealed] = useState(()=>loadConcealed()); // entryKeys whose note body is hidden
  function hideNoteBody(entryKey){
    const next = new Set(concealed); next.add(entryKey);
    setConcealed(next); saveConcealed(next); setConfirmEntry(null);
  }
  function unhideAll(){
    const next = new Set(); setConcealed(next); saveConcealed(next);
  }
  const [starred, setStarred] = useState(()=>loadStarred()); // entryKeys the person has starred
  const [starredOnly, setStarredOnly] = useState(false);     // Filter menu: show only starred notes
  const [filterOpen, setFilterOpen] = useState(false);
  const [chap, setChap] = useState(null);          // Filter menu: Subject -> Chapter. {subject, chapter|null} or null for everything
  // Clean out stars whose notes no longer exist (left over from earlier deletes/removals).
  useEffect(()=>{ if(pruneOrphanStars()) setStarred(loadStarred()); }, [refreshTick]);
  // The count in the Filter menu: only stars on notes that are actually listed (not removed,
  // not hidden), so it always matches what "Starred notes only" shows.
  const starredShownCount = groups.reduce((s0,g)=>s0+g.attempts.reduce((s1,a)=>s1+a.notes.filter(e=>starred.has(`${a.attemptKey}:${e.qn}`) && !concealed.has(`${a.attemptKey}:${e.qn}`)).length,0),0);
  function toggleStar(entryKey){
    const next = new Set(starred);
    if(next.has(entryKey)) next.delete(entryKey); else next.add(entryKey);
    setStarred(next); saveStarred(next);
  }
  // The heading count follows what is actually being shown: hidden notes are not counted,
  // and neither are notes filtered out by "Starred only".
  // One rule decides which notes are listed: "Starred only" and the Subject -> Chapter choice both apply.
  const inChap = e => !chap || (e.question.subject===chap.subject && (chap.chapter==null || e.question.chapter===chap.chapter));
  const listed = (a,e) => inChap(e) && (!starredOnly || starred.has(`${a.attemptKey}:${e.qn}`));
  const shownCount = groups.reduce((s0,g)=>s0+g.attempts.reduce((s1,a)=>s1+a.notes.filter(e=>listed(a,e) && !concealed.has(`${a.attemptKey}:${e.qn}`)).length,0),0);
  const filtering = starredOnly || !!chap;
  const shownGroups = !filtering ? groups
    : groups.map(g=>({...g, attempts: g.attempts
        .map(a=>({...a, notes: a.notes.filter(e=>listed(a,e))}))
        .filter(a=>a.notes.length>0)})).filter(g=>g.attempts.length>0);
  // The tree for the Filter menu: subject -> chapters -> how many (visible) notes each has.
  const tree = useMemo(()=>buildSubjChapterTree(groups.flatMap(g=>g.attempts.flatMap(a=>a.notes.filter(e=>!concealed.has(`${a.attemptKey}:${e.qn}`)).map(e=>e.question)))), [groups, concealed]);
  const subjOrder = orderSubjects(tree);

  function removeNote(attemptKey, qn){
    // Only removes this note from the All Notes list — the note itself
    // stays exactly as-is on that exam's own Analysis > Notes tab.
    hideNoteFromAllNotes(attemptKey, qn);
    setConfirmEntry(null);
    setRefreshTick(t=>t+1);
  }

  return (
    <div style={{minHeight:"100vh", padding:"28px 20px"}}>
      <div style={{maxWidth:820, margin:"0 auto"}}>
        <button className="btn" onClick={onBack} style={{marginBottom:16}}>← Back</button>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap"}}>
          <h2 style={{margin:"0 0 16px"}}>All Notes ({shownCount})</h2>
          <div style={{position:"relative", marginBottom:16, display:"flex", gap:10, alignItems:"center", flexWrap:"wrap"}}>
            <button className="btn" onClick={onViewStarredQ} style={{fontFamily:"Arial, Helvetica, sans-serif", fontWeight:400}}>
              ★ Starred Questions
            </button>
            <button className="btn" onClick={()=>setFilterOpen(o=>!o)} aria-haspopup="true" aria-expanded={filterOpen} style={{fontFamily:"Arial, Helvetica, sans-serif", fontWeight:400}}>
              Filter ▾
            </button>
            {filterOpen && (
              <React.Fragment>
                <div onClick={()=>setFilterOpen(false)} style={{position:"fixed", inset:0, zIndex:20}}/>
                <div className="card" style={{position:"absolute", right:0, top:"calc(100% + 6px)", zIndex:21, width:300, padding:8, boxShadow:"0 8px 24px rgba(0,0,0,0.18)"}}>
                  <div style={{fontSize:11.5, fontWeight:700, letterSpacing:.4, color:"var(--text-faint)", textTransform:"uppercase", padding:"6px 10px"}}>Show notes</div>
                  <button className={"btn"+(!starredOnly && !chap ? " hist-sel" : "")} onClick={()=>{ setStarredOnly(false); setChap(null); setFilterOpen(false); }}
                    style={{display:"block", width:"100%", textAlign:"left", border:"none", background: (!starredOnly && !chap) ? undefined : "transparent", padding:"10px", fontWeight:400}}>
                    All notes
                  </button>
                  <button className={"btn"+(starredOnly ? " hist-sel" : "")} onClick={()=>{ setStarredOnly(true); setFilterOpen(false); }}
                    style={{display:"block", width:"100%", textAlign:"left", border:"none", background: starredOnly ? undefined : "transparent", padding:"10px", marginTop:2, fontWeight:400}}>
                    ★ Starred notes only{starredShownCount>0 ? ` (${starredShownCount})` : ""}
                  </button>
                  <div style={{borderTop:"1px solid var(--border)", margin:"8px 0 6px"}}/>
                  <SubjectChapterTree tree={tree} subjOrder={subjOrder} chap={chap} onChoose={c=>{ setChap(c); setFilterOpen(false); }}/>
                  <div style={{borderTop:"1px solid var(--border)", margin:"8px 0 6px"}}/>
                  <button className="btn" onClick={()=>{ unhideAll(); setFilterOpen(false); }} disabled={concealed.size===0}
                    style={{display:"block", width:"100%", textAlign:"left", border:"none", background:"transparent", padding:"10px", fontWeight:400, opacity: concealed.size===0 ? 0.5 : 1, cursor: concealed.size===0 ? "default" : "pointer"}}>
                    Unhide all{concealed.size>0 ? ` (${concealed.size})` : ""}
                  </button>
                </div>
              </React.Fragment>
            )}
          </div>
        </div>
        <p style={{fontSize:13.5, color:"var(--text-dim)", marginTop:-6, marginBottom:20}}>
          Every note you've written, across every paper and every attempt, in one place.
        </p>

        {chap && (
          <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:16, flexWrap:"wrap", fontSize:13}}>
            <span style={{color:"var(--text-dim)"}}>Showing:</span>
            <span style={{background:"var(--steel)", color:"#fff", borderRadius:14, padding:"3px 6px 3px 12px", display:"inline-flex", alignItems:"center", gap:6, fontWeight:600}}>
              {chap.subject}{chap.chapter ? " \u2192 " + chap.chapter : ""}
              <button onClick={()=>setChap(null)} aria-label="Clear subject and chapter filter" title="Clear this filter"
                style={{background:"rgba(255,255,255,0.22)", border:"none", color:"#fff", borderRadius:"50%", width:20, height:20, lineHeight:"18px", padding:0, cursor:"pointer", fontSize:13}}>{"\u00D7"}</button>
            </span>
          </div>
        )}
        {totalNotes>0 && filtering && shownGroups.length===0 && (
          <div className="card" style={{padding:30, textAlign:"center", color:"var(--text-dim)"}}>
            {starredOnly && !chap ? "No starred notes yet. Tap the \u2606 on any note to star it." : "No notes match this filter."}
          </div>
        )}
        {totalNotes===0 && (
          <div className="card" style={{padding:30, textAlign:"center", color:"var(--text-dim)"}}>
            No notes yet. While reviewing a completed test's analysis, open the Notes tab and use "Add note" on any question.
          </div>
        )}

        <div style={{display:"flex", flexDirection:"column", gap:22}}>
          {shownGroups.map(g=>(
            <div key={g.paperId}>
              <div style={{fontWeight:700, fontSize:15, marginBottom:10}}>{g.paperName}</div>
              <div style={{display:"flex", flexDirection:"column", gap:14}}>
                {g.attempts.map(a=>(
                  <div key={a.attemptKey} className="card" style={{padding:"14px 18px"}}>
                    <div style={{fontSize:12, color:"var(--text-faint)", marginBottom:10}}>
                      {a.attemptDate ? `Attempt on ${fmtAttemptDate(a.attemptDate)}` : "Attempt no longer in history"}
                    </div>
                    <div style={{display:"flex", flexDirection:"column", gap:12}}>
                      {a.notes.map(e=>{
                        const entryKey = `${a.attemptKey}:${e.qn}`;
                        const open = openEntry===entryKey;
                        const confirming = confirmEntry===entryKey;
                        if(concealed.has(entryKey)) return null; // hidden: the whole entry goes, only the attempt date line stays
                        return (
                          <div key={entryKey} className="hist-card" style={{borderTop:"1px solid var(--border)", paddingTop:12, paddingRight:22}}>
                            <button className="hist-del" aria-label="Remove from this list" data-tip="Remove from this list (keeps the note on the exam itself)"
                              onClick={()=>setConfirmEntry(confirming ? null : entryKey)}/>
                            {confirming && (
                              <div className="card" style={{padding:"8px 12px", marginBottom:10, marginRight:14, display:"flex", alignItems:"center", gap:10, fontSize:13, flexWrap:"wrap"}}>
                                <span>Remove from All Notes?</span>
                                <button className="btn btn-danger" style={{padding:"4px 10px", fontSize:12.5}} onClick={()=>removeNote(a.attemptKey, e.qn)}>Remove</button>
                                <button className="btn" style={{padding:"4px 10px", fontSize:12.5}} onClick={()=>setConfirmEntry(null)}>Cancel</button>
                                <button className="btn" style={{padding:"4px 10px", fontSize:12.5, background:"var(--steel)", borderColor:"var(--steel)", color:"#fff", marginLeft:"auto"}} onClick={()=>hideNoteBody(entryKey)}>Hide</button>
                              </div>
                            )}
                            <div style={{display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8, fontSize:12.5, color:"var(--text-faint)", marginBottom:6}}>
                              <span style={{display:"inline-flex", alignItems:"center", gap:4}}>
                              <span><strong style={{color:"var(--text)"}}>Q{e.qn}</strong> · {e.question.subject} · {e.question.chapter}</span>
                              <button onClick={()=>toggleStar(entryKey)} aria-pressed={starred.has(entryKey)}
                                aria-label={starred.has(entryKey) ? "Remove star" : "Star this note"} title={starred.has(entryKey) ? "Remove star" : "Star this note"}
                                style={{background:"none", border:"none", padding:"0 0 0 2px", fontSize:18, lineHeight:1, color: starred.has(entryKey) ? "#f5c518" : "var(--text-faint)"}}>
                                {starred.has(entryKey) ? "★" : "☆"}
                              </button>
                            </span>
                            </div>
                            <div style={{margin:"4px 0 10px"}}>
                              <button className="btn" style={{padding:"4px 12px", fontSize:12.5}} onClick={()=>setOpenEntry(open?null:entryKey)}>
                                {open ? "Hide question" : "View question"}
                              </button>
                              {open && (
                                <div style={{marginTop:10}}>
                                  <QuestionBody state={{paperId:e.paperId}} r={{n:e.qn, yourAnswer:e.yourAnswer}}/>
                                </div>
                              )}
                            </div>
                            <NoteBody text={e.text} ranges={e.ranges} images={e.images}/>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

