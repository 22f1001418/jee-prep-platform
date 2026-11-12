import {BackupPanel} from "../components/BackupPanel";
import React, {useEffect, useMemo, useState} from "react";
import {exportChapterReport} from "../lib/chapterReport";
import {LS_HISTORY, fmtAttemptDate} from "../lib/constants";
import {ExportDoneModal, attemptKeyOfEntry, estimateAttemptBytes, exportEverythingFile, exportFolderZip, exportOldestZip, removeExportedAttempts} from "../lib/exportArchive";
import {LS_NOTES, LS_NOTE_HL, LS_NOTE_IMG, deleteAllNotes, deleteNotesForAttempt, deleteNotesForAttempts} from "../lib/notes";
import {clearAllHistory, deleteHistoryEntries, deleteHistoryEntry, loadHistory} from "../lib/persistence";
import {store} from "../lib/store";

// ---------- Test History ----------
// Group entries by the paper they were actually taken on (snapshot.paperId,
// not the display name — names are stable here but paperId is the real
// identity) so repeat attempts on the same paper show together with a
// visible score trend, instead of being buried in one flat chronological list.
export function groupHistoryByPaper(history){
  const groups = {};
  const order = [];
  history.forEach((h, idx)=>{
    const paperId = (h.snapshot && h.snapshot.paperId) || h.testName; // fallback for any legacy entry with no paperId
    if(!groups[paperId]){
      groups[paperId] = {paperId, testName: h.testName, attempts: []};
      order.push(paperId);
    }
    groups[paperId].attempts.push({...h, historyIndex: idx});
  });
  // Each group's attempts come from history, which is already newest-first;
  // keep that order for the attempt list, but derive the trend oldest-first
  // since "improving" only makes sense read left-to-right across time.
  return order.map(id=>{
    const g = groups[id];
    const oldestFirst = [...g.attempts].reverse();
    return {...g, oldestFirst};
  });
}

export function ScoreTrend({attemptsOldestFirst}){
  if(attemptsOldestFirst.length < 2) return null;
  const scores = attemptsOldestFirst.map(a=>a.score);
  const max = Math.max(...scores, 1);
  const first = scores[0], last = scores[scores.length-1];
  const delta = last - first;
  return (
    <div style={{marginTop:10}}>
      <div style={{display:"flex", alignItems:"flex-end", gap:6, height:46}}>
        {scores.map((s,i)=>(
          <div key={i} title={`Attempt ${i+1}: ${s}`} style={{
            width:14, height:`${Math.max(6, s/max*44)}px`, borderRadius:"3px 3px 0 0",
            background: i===scores.length-1 ? "var(--navy)" : "var(--border-dark)",
          }}/>
        ))}
      </div>
      <div style={{fontSize:12.5, marginTop:6, color: delta>0 ? "var(--correct)" : delta<0 ? "var(--wrong)" : "var(--text-faint)", fontWeight:700}}>
        {delta>0 ? `▲ +${delta} since first attempt` : delta<0 ? `▼ ${delta} since first attempt` : "No change since first attempt"}
      </div>
    </div>
  );
}

export function PaperHistoryGroup({group, onOpenTest, confirmIdx, setConfirmIdx, onRemoveOne, confirmGroup, setConfirmGroup, onRemoveGroup}){
  const [expanded, setExpanded] = useState(false);
  const attempts = group.attempts; // newest-first, for display
  const best = Math.max(...attempts.map(a=>a.score));
  const latest = attempts[0];

  return (
    <div className="card hist-card" style={{padding:18}}>
      <button className="hist-del" aria-label="Delete this exam from history"
        data-tip={`Delete this exam from history (${attempts.length} attempt${attempts.length!==1?"s":""})`}
        onClick={()=>setConfirmGroup(group.paperId)}/>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10}}>
        <div>
          <div style={{fontWeight:700}}>{group.testName}</div>
          <div style={{fontSize:13, color:"var(--text-dim)", marginTop:2}}>
            {attempts.length} attempt{attempts.length!==1?"s":""} · Best {best} · Latest {fmtAttemptDate(latest.date)}
          </div>
        </div>
        <div style={{display:"flex", alignItems:"flex-start", gap:12}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontWeight:400, fontSize:18}}>{latest.score}/{latest.maxScore}</div>
            <div style={{fontSize:12, color:"var(--text-faint)"}}>Most recent · Accuracy {latest.accuracy.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {confirmGroup === group.paperId && (
        <div style={{marginTop:12, padding:"10px 12px", border:"1px solid var(--not-answered)", borderRadius:6, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8}}>
          <span style={{fontSize:13.5}}>Delete <b>{group.testName}</b> and {attempts.length===1 ? "its 1 attempt" : `all its ${attempts.length} attempts`} from history?</span>
          <div style={{display:"flex", gap:8}}>
            <button className="btn btn-danger" style={{padding:"4px 12px", fontSize:12.5}} onClick={()=>onRemoveGroup(group)}>Yes, delete</button>
            <button className="btn" style={{padding:"4px 12px", fontSize:12.5}} onClick={()=>setConfirmGroup(null)}>Cancel</button>
          </div>
        </div>
      )}

      <ScoreTrend attemptsOldestFirst={group.oldestFirst}/>

      <div style={{display:"flex", gap:8, marginTop:14, flexWrap:"wrap"}}>
        <button className="btn" onClick={()=>onOpenTest(latest)}>View Latest Analysis</button>
        {attempts.length > 1 && (
          <button className="btn" onClick={()=>setExpanded(e=>!e)}>
            {expanded ? "Hide All Attempts" : `Show All ${attempts.length} Attempts`}
          </button>
        )}
      </div>

      {expanded && (
        <div style={{marginTop:14, display:"flex", flexDirection:"column", gap:8, borderTop:"1px solid var(--border)", paddingTop:14}}>
          {attempts.map((h, i)=>(
            <div key={h.historyIndex} style={{display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8, fontSize:13.5}}>
              <div style={{color:"var(--text-dim)"}}>
                Attempt {attempts.length - i} · {fmtAttemptDate(h.date)}
              </div>
              <div style={{display:"flex", alignItems:"center", gap:10}}>
                <span className="mono" style={{fontWeight:700}}>{h.score}/{h.maxScore}</span>
                <span style={{color:"var(--text-faint)"}}>Acc {h.accuracy.toFixed(1)}%</span>
                <button className="btn" style={{padding:"4px 10px", fontSize:12.5}} onClick={()=>onOpenTest(h)}>View</button>
                {confirmIdx === h.historyIndex ? (
                  <React.Fragment>
                    <button className="btn btn-danger" style={{padding:"4px 10px", fontSize:12.5}} onClick={()=>onRemoveOne(h.historyIndex)}>Confirm</button>
                    <button className="btn" style={{padding:"4px 10px", fontSize:12.5}} onClick={()=>setConfirmIdx(null)}>Cancel</button>
                  </React.Fragment>
                ) : (
                  <button className="btn" style={{padding:"4px 10px", fontSize:12.5, color:"var(--not-answered)"}} onClick={()=>setConfirmIdx(h.historyIndex)}>Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sort key for "Exam date, year & shift": [year, month, day, shift], read from the
// paper id (e.g. "jee-2025-22jan-s1") or, failing that, its name
// ("JEE Main 2025 (22 Jan Shift 1)"). Unknown formats sort last.
export function examSortKey(g){
  const MONTHS = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  let m = /(\d{4})-(\d{1,2})([a-z]{3})[a-z]*-s(\d)/i.exec(g.paperId || "");
  if(!m) m = /(\d{4}).*?(\d{1,2})\s*([A-Za-z]{3})[a-z]*\s*Shift\s*(\d)/i.exec(g.testName || "");
  if(m) return [Number(m[1]), MONTHS[m[3].toLowerCase()] || 0, Number(m[2]), Number(m[4])];
  return [9999, 13, 32, 9];
}
export function compareKeys(a, b){
  for(let i=0; i<a.length; i++){ if(a[i] !== b[i]) return a[i] - b[i]; }
  return 0;
}


// ---------- Browser storage meter (Test History page) ----------
// Used = what this app has saved in the browser. Total = used + the largest extra amount the browser still accepts
// (probed with a temporary key that is removed straight away), so the bar reflects THIS browser's real limit.
export function measureStorage(){
  try{
    const u = store.usage(); const parts = {history:0, notes:0, images:0, other:0};
    u.items.forEach(([k,n])=>{
      if(k===LS_HISTORY) parts.history += n;
      else if(k===LS_NOTE_IMG) parts.images += n;
      else if(k===LS_NOTES || k===LS_NOTE_HL) parts.notes += n;
      else parts.other += n;
    });
    return {used:u.used, total:u.total, parts, capped:false};
  }catch(e){ return null; }
}






export function fmtStore(n){ return n>=1048576 ? (n/1048576).toFixed(2)+" MB" : Math.max(0.1, n/1024).toFixed(n<10240?1:0)+" KB"; }
export function StorageMeter({refreshKey}){
  const [m, setM] = useState(null);
  const [busy, setBusy] = useState(true);
  useEffect(()=>{
    setBusy(true);
    const id = setTimeout(()=>{ setM(measureStorage()); setBusy(false); }, 60);   // after first paint, so the page opens instantly
    return ()=>clearTimeout(id);
  }, [refreshKey]);
  if(!m) return busy ? <span style={{fontSize:11.5, color:"var(--text-faint)"}}>Checking storage…</span> : null;
  const pct = m.total>0 ? Math.min(100, m.used/m.total*100) : 0;
  const color = pct>=90 ? "var(--wrong)" : pct>=70 ? "var(--marked)" : "var(--correct)";
  const tip = `Browser storage used by this app: ${fmtStore(m.used)} of ${m.capped ? "more than " : ""}${fmtStore(m.total)}.\n`
    + `Test History ${fmtStore(m.parts.history)} · Notes ${fmtStore(m.parts.notes)} · Note images ${fmtStore(m.parts.images)} · Other ${fmtStore(m.parts.other)}.\n`
    + `Measured on this browser. Delete old attempts or notes with images to free space.`;
  return (
    <div title={tip} style={{width:200, cursor:"help"}} aria-label={`Storage ${pct.toFixed(0)} percent full`}>
      <div style={{display:"flex", justifyContent:"space-between", fontSize:11.5, color: pct>=85 ? "var(--wrong)" : "var(--text-faint)", marginBottom:3, fontWeight: pct>=85 ? 700 : 400}}>
        <span style={{whiteSpace:"nowrap"}}>{pct>=85 ? "Almost full" : "Storage"}</span>
        <span className="mono" style={{whiteSpace:"nowrap"}}>{fmtStore(m.used)} / {fmtStore(m.total)}</span>
      </div>
      <div style={{height:6, borderRadius:3, background:"var(--border)", overflow:"hidden"}}>
        <div style={{width:pct+"%", minWidth: m.used>0 ? 2 : 0, height:"100%", background:color, borderRadius:3, transition:"width .3s"}}/>
      </div>
    </div>
  );
}

export function HistoryScreen({onBack, onOpenTest}){
  const [history, setHistory] = useState(loadHistory());
  const [sortMode, setSortMode] = useState("latest");      // "latest" | "exam"
  const [examNewestFirst, setExamNewestFirst] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [confirmIdx, setConfirmIdx] = useState(null);
  const [confirmGroup, setConfirmGroup] = useState(null); // paperId whose delete is awaiting confirmation
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState("");
  const [exportInfo, setExportInfo] = useState(null);   // result of the last export: offers to free that space
  async function runExport(kind){
    setExportOpen(false); setExporting(kind);
    try{
      const entries = loadHistory();
      const info = kind==="all" ? await exportEverythingFile(entries) : kind==="oldest" ? await exportOldestZip(entries) : await exportFolderZip(entries);
      info.freeBytes = estimateAttemptBytes(entries.filter(e=>info.keys.includes(attemptKeyOfEntry(e))));
      setExportInfo(info);
    }catch(err){ window.alert("Export failed: " + (err && err.message ? err.message : err)); }
    setExporting("");
  }
  function removeExported(){
    if(!removeExportedAttempts(exportInfo.keys)) window.alert("Could not update the saved history (browser storage problem).");
    setHistory(loadHistory()); setExportInfo(null); setConfirmIdx(null); setConfirmGroup(null);
  }

  function removeOne(i){
    const h = history[i];
    if(h && h.snapshot && h.snapshot.paperId && h.snapshot.startedAt){
      deleteNotesForAttempt(`${h.snapshot.paperId}:${h.snapshot.startedAt}`);
    }
    const updated = deleteHistoryEntry(i);
    setHistory(updated);
    setConfirmIdx(null);
  }
  function removeGroup(group){
    const keys = group.attempts
      .map(a=>a.snapshot && a.snapshot.paperId && a.snapshot.startedAt ? `${a.snapshot.paperId}:${a.snapshot.startedAt}` : null)
      .filter(Boolean);
    deleteNotesForAttempts(keys);
    const updated = deleteHistoryEntries(group.attempts.map(a=>a.historyIndex));
    setHistory(updated);
    setConfirmGroup(null);
    setConfirmIdx(null);
  }
  function removeAll(){
    clearAllHistory();
    deleteAllNotes();
    setHistory([]);
    setConfirmClearAll(false);
  }

  const groups = useMemo(()=>groupHistoryByPaper(history), [history]);
  // Filter / sort of the paper cards:
  //  "latest": the paper attempted most recently is on top (history is stored newest-first,
  //            so an attempt's historyIndex follows its attempt date & time).
  //  "exam":   by exam year, date and shift.
  const sortedGroups = useMemo(()=>{
    const list = [...groups];
    if(sortMode === "exam"){
      list.sort((x, y)=>{
        const c = compareKeys(examSortKey(x), examSortKey(y));
        return c !== 0 ? (examNewestFirst ? -c : c) : x.attempts[0].historyIndex - y.attempts[0].historyIndex;
      });
    } else {
      list.sort((x, y)=>x.attempts[0].historyIndex - y.attempts[0].historyIndex);
    }
    return list;
  }, [groups, sortMode, examNewestFirst]);

  return (
    <div style={{minHeight:"100vh", padding:"28px 20px"}}>
      <div style={{maxWidth:760, margin:"0 auto"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10}}>
          <button className="btn" onClick={onBack}>← Back</button>
          <div style={{display:"flex", alignItems:"center", gap:10, flexWrap:"wrap"}}>
          {history.length>0 && (
            <div style={{position:"relative"}}>
              <button className="btn btn-primary" disabled={!!exporting} onClick={()=>setExportOpen(o=>!o)} aria-haspopup="true" aria-expanded={exportOpen}>
                {exporting ? "Exporting…" : "Export ▾"}
              </button>
              {exportOpen && (
                <React.Fragment>
                  <div onClick={()=>setExportOpen(false)} style={{position:"fixed", inset:0, zIndex:20}}/>
                  <div className="card" style={{position:"absolute", right:0, top:"calc(100% + 6px)", zIndex:21, width:330, padding:8, boxShadow:"0 8px 24px rgba(0,0,0,0.18)"}}>
                    {[["all","Export everything","One file: every test with its notes and analysis"],["oldest","Export 10 oldest attempted tests","The 10 oldest attempts as a ZIP, one file per test"],["folder","Export all tests as a folder","A ZIP with one separate file per test"]].map(([k,t,d])=>(
                      <button key={k} className="btn" onClick={()=>runExport(k)} style={{display:"block", width:"100%", textAlign:"left", border:"none", background:"transparent", padding:"10px", fontWeight:400}}>
                        <div style={{fontWeight:500, fontSize:14, color:"var(--text)"}}>{t}</div>
                        <div style={{fontSize:12, color:"var(--text-faint)", marginTop:2}}>{d}</div>
                      </button>
                    ))}
                    <div style={{borderTop:"1px solid var(--border)", margin:"6px 0"}}/>
                    <button className="btn" onClick={()=>{ setExportOpen(false); exportChapterReport(); }} style={{display:"block", width:"100%", textAlign:"left", border:"none", background:"transparent", padding:"10px", fontWeight:400}}>
                      <div style={{fontWeight:500, fontSize:14, color:"var(--text)"}}>Chapter wise AI report</div>
                      <div style={{fontSize:12, color:"var(--text-faint)", marginTop:2}}>Made for AI, from your latest 10 exams</div>
                    </button>
                  </div>
                </React.Fragment>
              )}
            </div>
          )}
          {history.length>0 && (
            <div style={{position:"relative"}}>
              <button className="btn" onClick={()=>setFilterOpen(o=>!o)} aria-haspopup="true" aria-expanded={filterOpen} style={{fontFamily:"Arial, Helvetica, sans-serif", fontWeight:400}}>
                Filter ▾
              </button>
              {filterOpen && (
                <React.Fragment>
                  <div onClick={()=>setFilterOpen(false)} style={{position:"fixed", inset:0, zIndex:20}}/>
                  <div className="card" style={{position:"absolute", right:0, top:"calc(100% + 6px)", zIndex:21, width:300, padding:8, boxShadow:"0 8px 24px rgba(0,0,0,0.18)"}}>
                    <div style={{fontSize:11.5, fontWeight:700, letterSpacing:.4, color:"var(--text-faint)", textTransform:"uppercase", padding:"6px 10px"}}>Sort test history by</div>
                    <button className={"btn"+(sortMode==="latest" ? " hist-sel" : "")} onClick={()=>{ setSortMode("latest"); setFilterOpen(false); }}
                      style={{display:"block", width:"100%", textAlign:"left", border:"none", background: sortMode==="latest" ? undefined : "transparent", padding:"10px", fontWeight:400}}>
                      Latest attempt
                    </button>
                    <button className={"btn"+(sortMode==="exam" ? " hist-sel" : "")} onClick={()=>setSortMode("exam")}
                      style={{display:"block", width:"100%", textAlign:"left", border:"none", background: sortMode==="exam" ? undefined : "transparent", padding:"10px", marginTop:2, fontWeight:400}}>
                      Exam date, year &amp; shift
                    </button>
                    {sortMode==="exam" && (
                      <div style={{display:"flex", gap:6, padding:"8px 10px 6px"}}>
                        <button className={"btn"+(!examNewestFirst ? " hist-sel" : "")} onClick={()=>{ setExamNewestFirst(false); setFilterOpen(false); }}
                          style={{flex:1, fontSize:12.5, padding:"6px 8px", fontWeight:400}}>
                          Oldest exam first
                        </button>
                        <button className={"btn"+(examNewestFirst ? " hist-sel" : "")} onClick={()=>{ setExamNewestFirst(true); setFilterOpen(false); }}
                          style={{flex:1, fontSize:12.5, padding:"6px 8px", fontWeight:400}}>
                          Newest exam first
                        </button>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              )}
            </div>
          )}
          {history.length>0 && (
            confirmClearAll ? (
              <div style={{display:"flex", gap:8, alignItems:"center"}}>
                <span style={{fontSize:13, color:"var(--text-dim)"}}>Remove all {history.length} tests?</span>
                <button className="btn btn-danger" onClick={removeAll}>Yes, clear all</button>
                <button className="btn" onClick={()=>setConfirmClearAll(false)}>Cancel</button>
              </div>
            ) : (
              <button className="btn" onClick={()=>setConfirmClearAll(true)} style={{color:"var(--not-answered)"}}>Clear All History</button>
            )
          )}
          </div>
        </div>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, marginBottom:12, position:"relative"}}>
          <h2 style={{margin:0}}>Test History ({history.length})</h2>
          <StorageMeter refreshKey={history.length}/>
          {exportInfo && <ExportDoneModal info={exportInfo} freeBytes={exportInfo.freeBytes||0} onKeep={()=>setExportInfo(null)} onRemove={removeExported}/>}
        </div>
        <div style={{marginBottom:14}}><BackupPanel/></div>
        {history.length===0 && <div className="card" style={{padding:30, textAlign:"center", color:"var(--text-dim)"}}>No completed tests yet.</div>}
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          {sortedGroups.map(group=>(
            <PaperHistoryGroup key={group.paperId} group={group} onOpenTest={onOpenTest}
              confirmIdx={confirmIdx} setConfirmIdx={setConfirmIdx} onRemoveOne={removeOne}
              confirmGroup={confirmGroup} setConfirmGroup={setConfirmGroup} onRemoveGroup={removeGroup}/>
          ))}
        </div>
      </div>
    </div>
  );
}
