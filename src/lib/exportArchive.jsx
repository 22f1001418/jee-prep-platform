import React, {useState} from "react";
import {LS_HISTORY} from "./constants";
import {figWithDataUri} from "./data";
import {deleteNotesForAttempt, loadAllHl, loadAllImgs, loadAllNotes, loadConcealed, loadHiddenNotes, loadStarred} from "./notes";
import {KEY_ORIG, getPaper, loadKeyOvr, paperMissing} from "./papers";
import {loadHistory} from "./persistence";
import {store} from "./store";
import {downloadBlob, fileStamp, safeFileName, zipBuild} from "./zip";
import {loadProfile, loadStarQ} from "../screens/ProfileScreen";

// ---------- Export: self-contained test files for the JEE CBT Archive Viewer ----------
// Each file carries everything needed to view the test later without this app: the paper (questions, the answer key
// as corrected by you, figures), the attempt (answers, time per question), your notes, highlights, pictures and stars.
export const EXPORT_FORMAT = "jee-cbt-export";
export function attemptKeyOfEntry(e){ const sn = e && e.snapshot; return (sn && sn.paperId && sn.startedAt) ? `${sn.paperId}:${sn.startedAt}` : null; }
export function usedFigIds(paper){
  const ids = new Set();
  const scan = t => String(t ?? "").replace(/\[\[img:(\w+)\]\]/g, (m, id)=>{ ids.add(id); return m; });
  paper.questions.forEach(q=>{ if(q.svg) ids.add(q.svg); scan(q.text); (q.options||[]).forEach(o=>scan(o.text)); });
  return [...ids];
}
export async function collectPaper(paperId){
  const p = getPaper(paperId);
  const figs = {};
  for(const id of usedFigIds(p)){ const f = await figWithDataUri(id); if(f) figs[id] = f; }   // exports are self-contained, so pictures are embedded
  const questions = p.questions.map(q=>({...q, orig: KEY_ORIG.get(q) || null}));   // live key (with your corrections) + the built-in key
  return {id:p.id, name:p.name, shortName:p.shortName, percentileUrl:p.percentileUrl || null, format:p.format || null, questions, figs, keyOverrides:(loadKeyOvr()[p.id] || {})};
}
export function collectAttempt(entry, key){
  const starred = [...loadStarred()].filter(k=>k.startsWith(key + ":")).map(k=>Number(k.slice(key.length + 1)));
  return {
    attemptKey: key,
    history: {testName:entry.testName, date:entry.date, score:entry.score, maxScore:entry.maxScore, accuracy:entry.accuracy},
    snapshot: entry.snapshot,
    notes: loadAllNotes()[key] || {},
    highlights: loadAllHl()[key] || {},
    images: loadAllImgs()[key] || {},
    starredNotes: starred,
    hiddenFromAllNotes: loadHiddenNotes()[key] || [],
    concealedNotes: [...loadConcealed()].filter(k=>k.startsWith(key + ":")).map(k=>Number(k.slice(key.length + 1))),   // notes you hid on the All Notes page
  };
}
export async function buildExport(entries, kind, allStars){
  const papers = {}, attempts = []; let skipped = 0;
  for(const e of entries){
    const key = attemptKeyOfEntry(e);
    if(!key || paperMissing(e.snapshot.paperId)){ skipped++; continue; }   // cannot be made self-contained
    if(!papers[e.snapshot.paperId]) papers[e.snapshot.paperId] = await collectPaper(e.snapshot.paperId);
    attempts.push(collectAttempt(e, key));
  }
  // Stars on papers that have no attempt in this export (e.g. you starred while reviewing a paper whose attempt is not included) would be lost,
  // so when asked, bring those papers along too: the viewer can then show the starred question with its text and answer.
  if(allStars) for(const x of loadStarQ()){ if(!papers[x.paperId] && !paperMissing(x.paperId)) papers[x.paperId] = await collectPaper(x.paperId); }
  const pr = loadProfile();
  const data = {
    format: EXPORT_FORMAT, version: 1, kind, exportedAt: new Date().toISOString(), app: "JEE CBT Test Platform",
    profile: pr ? {name:pr.name, photo:pr.photo || null} : null,
    papers, attempts,
    starredQuestions: loadStarQ().filter(x=>papers[x.paperId]),
  };
  return {data, skipped, keys: attempts.map(a=>a.attemptKey)};
}
export function attemptFileName(e){ return `${safeFileName(e.testName)}__attempt_${fileStamp(e.snapshot.startedAt)}.json`; }
export function estimateAttemptBytes(entries){
  let n = 0; const notes = loadAllNotes(), hl = loadAllHl(), im = loadAllImgs();
  entries.forEach(e=>{
    const k = attemptKeyOfEntry(e); n += JSON.stringify(e).length;
    if(k){ [notes, hl, im].forEach(o=>{ if(o[k]) n += JSON.stringify(o[k]).length + k.length; }); }
  });
  return n;
}
// Each returns {count, keys, skipped, file, bytes}: what was exported, so the screen can offer to free that space.
export async function exportEverythingFile(entries){
  const b = await buildExport(entries, "all", true); const json = JSON.stringify(b.data); const file = `JEE_CBT_everything_${fileStamp(Date.now())}.json`;
  downloadBlob(new Blob([json], {type:"application/json"}), file);
  return {count:b.keys.length, keys:b.keys, skipped:b.skipped, file, kind:"all"};
}
export async function exportFolderZip(entries, tag){
  const folder = `JEE_CBT_${tag || "tests"}_${fileStamp(Date.now())}`;
  const files = [], keys = [], used = new Set(); let skipped = 0;
  for(const e of entries){
    const b = await buildExport([e], "attempt");
    if(!b.keys.length){ skipped++; continue; }
    let nm = attemptFileName(e); if(used.has(nm)) nm = nm.replace(/\.json$/, `_${used.size}.json`); used.add(nm);
    files.push({name:`${folder}/${nm}`, data: JSON.stringify(b.data)});
    keys.push(...b.keys);
  }
  // stars on papers that none of the files above carry go into one extra file, so no starred question is left behind
  { const covered = new Set(keys.map(k=>k.split(":")[0]));
    if(loadStarQ().some(x=>!covered.has(x.paperId) && !paperMissing(x.paperId))){
      const b = await buildExport([], "starred", true); const only = {};
      Object.keys(b.data.papers).forEach(id=>{ if(!covered.has(id)) only[id] = b.data.papers[id]; });
      b.data.papers = only; b.data.starredQuestions = b.data.starredQuestions.filter(x=>only[x.paperId]);
      files.push({name:`${folder}/starred_questions.json`, data: JSON.stringify(b.data)});
    } }
  files.push({name:`${folder}/README.txt`, data:"One .json file per test. Open them with the JEE CBT Archive Viewer (Import files, or drop this whole .zip on it).\n"});
  const file = folder + ".zip";
  if(keys.length) downloadBlob(await zipBuild(files), file);
  return {count:keys.length, keys, skipped, file, kind:"folder"};
}
// the 10 OLDEST attempted tests (history is stored newest-first, so they are at the end), one file each, in one ZIP
export async function exportOldestZip(entries){
  return exportFolderZip(entries.slice(-10).reverse(), "oldest_10_tests");
}
// Removes exported attempts (and their notes, highlights, pictures, stars) from this app's storage.
export function removeExportedAttempts(keys){
  const set = new Set(keys);
  keys.forEach(k=>deleteNotesForAttempt(k));
  const h = loadHistory().filter(e=>!set.has(attemptKeyOfEntry(e)));
  try{ store.setItem(LS_HISTORY, JSON.stringify(h)); return true; }catch(e){ return false; }
}
export function fmtBytesShort(n){ return n>=1048576 ? (n/1048576).toFixed(2)+" MB" : Math.max(1, Math.round(n/1024))+" KB"; }

export function ExportDoneModal({info, freeBytes, onKeep, onRemove}){
  const [sure, setSure] = useState(false);
  const none = info.count===0;
  return (
    <div style={{position:"fixed", inset:0, background:"rgba(10,16,24,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60, padding:20}}>
      <div className="card" style={{maxWidth:470, width:"100%", padding:"24px 26px"}}>
        {none ? (
          <React.Fragment>
            <h3 style={{marginTop:0}}>Nothing was exported</h3>
            <p style={{fontSize:14, color:"var(--text-dim)", lineHeight:1.6}}>The selected test(s) belong to a paper that is not in this version of the file, so a self-contained file could not be made.</p>
            <button className="btn btn-primary" onClick={onKeep}>OK</button>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <h3 style={{marginTop:0}}>Exported {info.count} test{info.count!==1?"s":""}</h3>
            <p style={{fontSize:14, color:"var(--text-dim)", lineHeight:1.6, margin:"0 0 10px"}}>
              Saved as <strong style={{color:"var(--text)", overflowWrap:"anywhere"}}>{info.file}</strong> in your Downloads folder. Open it any time in the JEE CBT Archive Viewer.
            </p>
            {info.skipped>0 && <p style={{fontSize:13, color:"var(--not-answered)", margin:"0 0 10px"}}>{info.skipped} test{info.skipped!==1?"s were":" was"} skipped (paper not in this file) and will stay here.</p>}
            <div style={{border:"1px solid var(--border)", borderRadius:6, padding:"12px 14px", background:"var(--bg)", marginBottom:14}}>
              <div style={{fontWeight:700, fontSize:14, marginBottom:4}}>Free up space?</div>
              <div style={{fontSize:13, color:"var(--text-dim)", lineHeight:1.55}}>
                You can remove {info.count===1?"this test":"these tests"} (with {info.count===1?"its":"their"} notes, highlights and pictures) from this app, freeing about <strong>{fmtBytesShort(freeBytes)}</strong>. Your starred questions and answer-key corrections stay.
              </div>
              <label style={{display:"flex", gap:8, alignItems:"flex-start", fontSize:13, marginTop:10, cursor:"pointer"}}>
                <input type="checkbox" checked={sure} onChange={e=>setSure(e.target.checked)} style={{marginTop:3}}/>
                <span>I checked that the file is saved in my Downloads folder.</span>
              </label>
            </div>
            <div style={{display:"flex", gap:10, justifyContent:"flex-end", flexWrap:"wrap"}}>
              <button className="btn" onClick={onKeep}>Keep them here</button>
              <button className="btn btn-danger" disabled={!sure} onClick={onRemove} style={{opacity: sure?1:0.5, cursor: sure?"pointer":"not-allowed"}}>Remove from this app</button>
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

