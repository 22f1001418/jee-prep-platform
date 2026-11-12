import React, {useState} from "react";
import {ChapterAnalysis, DeepAnalysis, ResultPill, TimeAnalysis} from "../components/Analysis";
import {AnswerKeyPanel} from "../components/AnswerKey";
import {NoteEditor, NoteQuestion, QuestionBody} from "../components/NoteEditor";
import {STATUS_META, SUBJECTS, fmtMinSec} from "../lib/constants";
import {NoteBody, loadAllHl, loadAllImgs, loadAllNotes, loadStarred, persistHl, persistImgs, persistNotes, saveStarred, unhideNoteFromAllNotes, unstarNote} from "../lib/notes";
import {loadStarQ, toggleStarQ} from "./ProfileScreen";

export function AnalysisPage({state, result, onBack, onReviewWrong, onKeyChanged}){
  const [filter, setFilter] = useState("All");
  const [subjFilter, setSubjFilter] = useState("All");
  const [tab, setTab] = useState("table"); // table | notes | deep | chapters | time
  const attemptKey = `${state.paperId}:${state.startedAt}`;
  const [notes, setNotes] = useState(()=>loadAllNotes()[attemptKey] || {});
  const [editingQ, setEditingQ] = useState(null);
  const [starList, setStarList] = useState(()=>loadStarQ());   // same stars as during the exam: starring here or there is the same thing
  const starredSet = new Set(starList.filter(x=>x.paperId===state.paperId).map(x=>x.n));
  const [openQs, setOpenQs] = useState({});
  const [imgs, setImgs] = useState(()=>loadAllImgs()[attemptKey] || {});
  const [hl, setHl] = useState(()=>loadAllHl()[attemptKey] || {});
  // Same starred-notes list the All Notes screen uses (so a star set here shows there too).
  const [starredNotes, setStarredNotes] = useState(()=>loadStarred());
  function toggleNoteStar(qn){
    const k = `${attemptKey}:${qn}`, next = new Set(loadStarred());
    if(next.has(k)) next.delete(k); else next.add(k);
    setStarredNotes(next); saveStarred(next);
  }
  const toggleQ = n => setOpenQs(o=>({...o, [n]:!o[n]}));
  function saveNote(qn, text, ranges, images){
    const pics = images || [];
    const keep = !!text || pics.length>0;     // a note can be text, pictures, or both
    const h = {...hl};
    if(text && ranges && ranges.length) h[qn] = ranges; else delete h[qn];
    const im = {...imgs};
    if(pics.length) im[qn] = pics; else delete im[qn];
    const next = {...notes};
    if(keep) next[qn] = text; else delete next[qn];
    // Write all three stores. If any write is refused (storage full), undo the ones that went through,
    // tell the person, and leave the editor open with their text intact, so nothing is lost or half-saved.
    const okHl = persistHl(attemptKey, h);
    const okIm = okHl && persistImgs(attemptKey, im);
    const okNt = okIm && persistNotes(attemptKey, next);
    if(!(okHl && okIm && okNt)){
      if(okHl) persistHl(attemptKey, hl);
      if(okIm) persistImgs(attemptKey, imgs);
      window.alert("Not saved: your note for Q" + qn + " could not be saved.\n\nYour browser storage is full. Your text is still in the editor. Free some space (Test History: delete old attempts; All Notes: delete notes that have images), then press Save again.");
      return;
    }
    setHl(h); setImgs(im); setNotes(next); setEditingQ(null);
    if(!keep){ unstarNote(attemptKey, qn); setStarredNotes(loadStarred()); } // note deleted, so drop its star
    // Writing real content for this question is a fresh note, so it should
    // show up in All Notes even if this (attemptKey, qn) was previously
    // removed from that list — otherwise a note written after a removal
    // would silently stay invisible there with no way to tell why.
    if(keep) unhideNoteFromAllNotes(attemptKey, qn);
  }
  const noteCount = Object.keys(notes).length;

  const notChosenRows = result.notChosen || [];
  const filtered = (filter==="Not chosen" ? notChosenRows : result.perQuestionResults).filter(r=>
    (filter==="All" || filter==="Not chosen" || r.result===filter.toLowerCase()) &&
    (subjFilter==="All" || r.subject===subjFilter)
  );

  return (
    <div style={{minHeight:"100vh", padding:"28px 20px"}}>
      <div style={{maxWidth:980, margin:"0 auto"}}>
        <button className="btn" onClick={onBack} style={{marginBottom:16}}>← Back to Results</button>
        <h2 style={{marginTop:0}}>JEE Performance Analysis</h2>

        <div style={{display:"flex", gap:8, marginBottom:20, flexWrap:"wrap"}}>
          {[["table","Question-wise Table"],["key","Answer Key"],["notes",`All Notes (${noteCount})`],["deep","Deep Analysis"],["chapters","Chapter Analysis"],["time","Time Analysis"]].map(([k,label])=>(
            <button key={k} className="btn" onClick={()=>setTab(k)}
              style={{background: tab===k?"var(--navy)":"var(--panel)", color:tab===k?"#fff":"var(--text)", borderColor:tab===k?"var(--navy)":"var(--border-dark)"}}>
              {label}
            </button>
          ))}
        </div>

        {tab==="table" && (
          <div>
            <div style={{display:"flex", gap:8, marginBottom:16, flexWrap:"wrap"}}>
              {["All","Correct","Wrong","Unattempted", ...(notChosenRows.length ? ["Not chosen"] : [])].map(f=>(
                <button key={f} className="btn" onClick={()=>setFilter(f)}
                  style={{fontSize:13, padding:"6px 12px", background: filter===f?"var(--navy)":"var(--panel)", color:filter===f?"#fff":"var(--text)"}}>{f}</button>
              ))}
              <span style={{width:1, background:"var(--border)", margin:"0 4px"}}/>
              {["All",...SUBJECTS].map(f=>(
                <button key={f} className="btn" onClick={()=>setSubjFilter(f)}
                  style={{fontSize:13, padding:"6px 12px", background: subjFilter===f?"var(--steel)":"var(--panel)", color:subjFilter===f?"#fff":"var(--text)"}}>{f}</button>
              ))}
            </div>
            <div className="card scrollx" style={{padding:0}}>
              <table style={{width:"100%", borderCollapse:"collapse", fontSize:13.5, minWidth:936, tableLayout:"fixed"}}>
                {/* fixed column widths, so opening a question or a note box never shifts the columns */}
                <colgroup>
                  {[38,62,100,112,78,116,100,60,60,92,118].map((w,i)=><col key={i} style={{width:w}}/>)}
                </colgroup>
                <thead>
                  <tr style={{textAlign:"left", borderBottom:"2px solid var(--border)"}}>
                    {["\u2605","Q","Subject","Your Answer","Correct","Status","Result","Marks","Time","Question","Note"].map(h=>(
                      <th key={h} style={{padding: h==="\u2605" ? "10px 0" : "10px 12px", textAlign: h==="\u2605" ? "center" : undefined, color:"var(--text-dim)", fontWeight:700}} title={h==="\u2605" ? "Star a question to revisit it later" : undefined}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r=>(
                    <React.Fragment key={r.n}>
                      <tr style={{borderBottom: editingQ===r.n ? "none" : "1px solid var(--border)"}}>
                        <td style={{padding:"4px 0", textAlign:"center"}}>
                          <button onClick={()=>setStarList(toggleStarQ(state.paperId, r.n))} aria-pressed={starredSet.has(r.n)}
                            title={starredSet.has(r.n) ? "Remove star from Q"+r.n : "Star Q"+r.n+" to revisit later"}
                            style={{border:"none", background:"transparent", cursor:"pointer", fontSize:20, lineHeight:1, padding:"2px 4px", color: starredSet.has(r.n) ? "#e2a400" : "var(--text-dim)"}}>
                            {starredSet.has(r.n) ? "\u2605" : "\u2606"}
                          </button>
                        </td>
                        <td style={{padding:"9px 12px", fontWeight:700, whiteSpace:"nowrap"}}>Q{r.n}</td>
                        <td style={{padding:"9px 12px"}}>{r.subject}</td>
                        <td style={{padding:"9px 12px"}} className="mono">{r.yourAnswer ?? "—"}</td>
                        <td style={{padding:"9px 12px"}} className="mono">{r.correctAnswer}{r.keyEdited && <span title="You corrected this answer key" style={{color:"var(--marked)", marginLeft:4}}>✎</span>}</td>
                        <td style={{padding:"9px 12px", fontSize:12}}>{STATUS_META[r.status].label}</td>
                        <td style={{padding:"9px 12px"}}>
                          <ResultPill result={r.result}/>
                        </td>
                        <td style={{padding:"9px 12px"}} className="mono">{r.marks>0?`+${r.marks}`:r.marks}</td>
                        <td style={{padding:"9px 12px"}} className="mono">{fmtMinSec(r.timeSpent)}</td>
                        <td style={{padding:"9px 12px"}}>
                          <button className="btn" style={{padding:"3px 10px", fontSize:12.5, minWidth:64}} onClick={()=>toggleQ(r.n)}>
                            {openQs[r.n] ? "Hide" : "Show"}
                          </button>
                        </td>
                        <td style={{padding:"9px 12px"}}>
                          <button className="btn" style={{padding:"3px 10px", fontSize:12.5}} onClick={()=>setEditingQ(editingQ===r.n?null:r.n)}>
                            {notes[r.n]!==undefined ? "Edit note" : "Add note"}
                          </button>
                        </td>
                      </tr>
                      {openQs[r.n] && (
                        <tr style={{borderBottom:"1px solid var(--border)"}}>
                          <td colSpan={11} style={{padding:"12px"}}>
                            <QuestionBody state={state} r={r}/>
                          </td>
                        </tr>
                      )}
                      {editingQ===r.n && (
                        <tr style={{borderBottom:"1px solid var(--border)"}}>
                          <td colSpan={11} style={{padding:"0 12px 10px"}}>
                            <NoteEditor initial={notes[r.n]} exists={notes[r.n]!==undefined} ranges={hl[r.n]} images={imgs[r.n]} onSave={(t,rg,im)=>saveNote(r.n,t,rg,im)} onCancel={()=>setEditingQ(null)} onDelete={()=>saveNote(r.n,"",[],[])}/>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab==="notes" && (
          <div style={{display:"flex", flexDirection:"column", gap:12}}>
            {noteCount===0 && <div className="card" style={{padding:30, textAlign:"center", color:"var(--text-dim)"}}>No notes yet. Use "Add note" in the Question-wise Table.</div>}
            {[...result.perQuestionResults, ...notChosenRows].filter(r=>notes[r.n]!==undefined).map(r=>(
              <div key={r.n} className="card" style={{padding:"14px 18px"}}>
                <div style={{display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8, fontSize:12.5, color:"var(--text-faint)", marginBottom:6}}>
                  <span style={{display:"inline-flex", alignItems:"center", gap:4}}>
                    <span><strong style={{color:"var(--text)"}}>Q{r.n}</strong> · {r.subject} · {r.chapter}</span>
                    <button onClick={()=>toggleNoteStar(r.n)} aria-pressed={starredNotes.has(`${attemptKey}:${r.n}`)}
                      aria-label={starredNotes.has(`${attemptKey}:${r.n}`) ? "Remove star" : "Star this note"} title={starredNotes.has(`${attemptKey}:${r.n}`) ? "Remove star" : "Star this note"}
                      style={{background:"none", border:"none", padding:"0 0 0 2px", fontSize:18, lineHeight:1, cursor:"pointer", color: starredNotes.has(`${attemptKey}:${r.n}`) ? "#f5c518" : "var(--text-faint)"}}>
                      {starredNotes.has(`${attemptKey}:${r.n}`) ? "★" : "☆"}
                    </button>
                  </span>
                  <ResultPill result={r.result}/>
                </div>
                <NoteQuestion state={state} r={r}/>
                {editingQ===r.n
                  ? <NoteEditor initial={notes[r.n]} exists={notes[r.n]!==undefined} ranges={hl[r.n]} images={imgs[r.n]} onSave={(t,rg,im)=>saveNote(r.n,t,rg,im)} onCancel={()=>setEditingQ(null)} onDelete={()=>saveNote(r.n,"",[],[])}/>
                  : (
                    <div style={{display:"flex", justifyContent:"space-between", gap:12, alignItems:"flex-start"}}>
                      <NoteBody text={notes[r.n]} ranges={hl[r.n]} images={imgs[r.n]}/>
                      <button className="btn" style={{padding:"3px 10px", fontSize:12.5, flexShrink:0}} onClick={()=>setEditingQ(r.n)}>Edit</button>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}

        {tab==="key" && <AnswerKeyPanel state={state} result={result} onChanged={onKeyChanged||(()=>{})}/>}
        {tab==="deep" && <DeepAnalysis result={result}/>}
        {tab==="chapters" && <ChapterAnalysis result={result}/>}
        {tab==="time" && <TimeAnalysis result={result}/>}

        <div style={{marginTop:24}}>
          <button className="btn" onClick={onReviewWrong}>Review Wrong Questions →</button>
        </div>
      </div>
    </div>
  );
}
