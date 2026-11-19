import React, {useRef, useState} from "react";
import {Icon} from "./icons";
import {FIG_IMAGES} from "../lib/data";
import {removeCustomPaper, saveCustomPaper} from "../lib/customPapers";
import {SUBJECTS, validateAddon} from "../lib/paperAddon";
import {PAPER_REGISTRY, canonicalChapter} from "../lib/papers";

// What the app already has, so the checker can reject clashes and flag unfamiliar chapter names.
function context(){
  const chapters = {}; SUBJECTS.forEach(s => { chapters[s] = new Set(); });
  PAPER_REGISTRY.filter(p => !p.custom).forEach(p => p.questions.forEach(q => { if(chapters[q.subject]) chapters[q.subject].add(q.chapter); }));
  return {
    paperIds: PAPER_REGISTRY.filter(p => !p.custom).map(p => p.id),
    customIds: PAPER_REGISTRY.filter(p => p.custom).map(p => p.id),
    figureIds: Object.keys(FIG_IMAGES), chapters, canonicalChapter,
  };
}

// "Add a paper": pick a <paperId>_addon.json made with the master prompt, check it, store it on this device.
export function AddPaperPanel({open, onClose}){
  const fileRef = useRef(null);
  const [check, setCheck] = useState(null);   // {file, result}
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(null);
  const custom = PAPER_REGISTRY.filter(p => p.custom);

  async function pick(ev){
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if(!file) return;
    setError(""); setCheck(null);
    try{
      const data = JSON.parse(await file.text());
      setCheck({file:file.name, result:validateAddon(data, context())});
    }catch(e){ setError(e instanceof SyntaxError ? "That file is not valid JSON, so it cannot be a paper add-on." : "Could not read that file: " + (e && e.message ? e.message : e)); }
  }
  async function add(){
    const {paper, figures} = check.result;
    setBusy(true); setError("");
    const r = await saveCustomPaper(paper, figures);
    if(!r.ok){ setBusy(false); setError(r.error); return; }
    window.location.hash = "#/tests";
    window.location.reload();   // the question bank is read once at start-up
  }
  async function remove(id){
    setBusy(true);
    await removeCustomPaper(id);
    window.location.reload();
  }

  if(!open) return null;
  const r = check && check.result;
  return (
    <div className="card" style={{padding:"16px 20px", marginBottom:16}}>
      <div style={{display:"flex", alignItems:"center", gap:10, flexWrap:"wrap"}}>
        <h3 style={{margin:0, fontSize:16, flex:"1 1 200px"}}>Add a new paper</h3>
        <button className="btn" onClick={onClose}><Icon name="x" size={15}/> Close</button>
      </div>
      <p style={{margin:"8px 0 12px", fontSize:13, color:"var(--text-dim)", lineHeight:1.55}}>
        Choose the <code>&lt;paper-id&gt;_addon.json</code> file made with the master prompt. It is checked first and only added if it passes.
        The paper is saved on this device and is included in <b>Backup data</b>.
      </p>
      <button className="btn btn-primary" onClick={()=>fileRef.current && fileRef.current.click()} disabled={busy}><Icon name="upload" size={16}/> Choose add-on file</button>
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={pick} style={{display:"none"}}/>

      {error && <div role="alert" style={{marginTop:12, color:"var(--wrong)", fontWeight:600, fontSize:13.5}}>{error}</div>}

      {r && (
        <div style={{marginTop:14}} aria-live="polite">
          <div style={{fontSize:12.5, color:"var(--text-faint)", marginBottom:6}}>{check.file}</div>
          {r.errors.length>0 ? (
            <div>
              <div style={{fontWeight:700, color:"var(--wrong)", marginBottom:4}}>Not added: {r.errors.length>=40 ? "40+" : r.errors.length} problem{r.errors.length===1?"":"s"} to fix in the file</div>
              <ul style={{margin:0, paddingLeft:18, fontSize:13, lineHeight:1.6, maxHeight:240, overflow:"auto"}}>{r.errors.map((e, i)=><li key={i}>{e}</li>)}</ul>
              <div style={{fontSize:12.5, color:"var(--text-faint)", marginTop:6}}>Fix them (or ask the chat that made the file to), then choose the file again.</div>
            </div>
          ) : (
            <div>
              <div style={{fontWeight:700, color:"var(--correct)", display:"flex", gap:6, alignItems:"center"}}><Icon name="check-circle" size={17}/> Ready to add</div>
              <div style={{margin:"6px 0 10px", fontSize:13.5, lineHeight:1.6}}>
                <b>{r.summary.name}</b> <span style={{color:"var(--text-faint)"}}>({r.summary.id})</span>
                <div style={{color:"var(--text-dim)", fontSize:12.5}}>{r.summary.layout} · {r.summary.figures} figure{r.summary.figures===1?"":"s"}</div>
              </div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))", gap:8, marginBottom:12}}>
                {SUBJECTS.map(s => (
                  <div key={s} style={{border:"1px solid var(--border)", borderRadius:10, padding:"8px 12px", background:"var(--panel-2)"}}>
                    <div style={{fontWeight:700, fontSize:13}}>{s}</div>
                    <div className="num" style={{fontSize:12.5, color:"var(--text-dim)"}}>{r.summary.per[s].MCQ} MCQ · {r.summary.per[s].NUM} numerical</div>
                  </div>
                ))}
              </div>
              <button className="btn btn-save" onClick={add} disabled={busy}>{busy ? "Adding…" : "Add this paper"}</button>
            </div>
          )}
          {r.warnings.length>0 && (
            <div style={{marginTop:12, padding:"10px 14px", borderRadius:10, background:"color-mix(in srgb, var(--gold) 12%, var(--panel))", border:"1px solid color-mix(in srgb, var(--gold) 35%, var(--border))"}}>
              <div style={{display:"flex", alignItems:"center", gap:6, fontWeight:700, fontSize:13}}><Icon name="alert" size={15}/> {r.warnings.length>=40 ? "40+" : r.warnings.length} warning{r.warnings.length===1?"":"s"} <span style={{fontWeight:500, color:"var(--text-dim)"}}>(these do not block adding)</span></div>
              <ul style={{margin:"6px 0 0", paddingLeft:18, fontSize:12.5, lineHeight:1.55, color:"var(--text-dim)", maxHeight:180, overflow:"auto"}}>{r.warnings.map((w, i)=><li key={i}>{w}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {custom.length>0 && (
        <div style={{marginTop:18, borderTop:"1px solid var(--border)", paddingTop:12}}>
          <div style={{fontSize:12.5, fontWeight:700, textTransform:"uppercase", letterSpacing:.4, color:"var(--text-faint)", marginBottom:6}}>Papers you added</div>
          {custom.map(p => (
            <div key={p.id} style={{display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", padding:"4px 0", fontSize:13.5}}>
              <span style={{flex:"1 1 200px"}}>{p.name}</span>
              {confirmRemove===p.id ? (
                <>
                  <span style={{fontSize:12.5, color:"var(--text-dim)"}}>Your past attempts stay in History but can no longer be opened. Remove?</span>
                  <button className="btn btn-danger" onClick={()=>remove(p.id)} disabled={busy}>Yes, remove</button>
                  <button className="btn" onClick={()=>setConfirmRemove(null)}>Cancel</button>
                </>
              ) : <button className="btn" onClick={()=>setConfirmRemove(p.id)}><Icon name="trash" size={14}/> Remove</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
