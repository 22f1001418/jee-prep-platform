import {Icon} from "./icons";
import React, {useRef, useState} from "react";
import {describeCounts, mergeBackup, parseBackup} from "../lib/backupMerge";
import {store} from "../lib/store";
import {downloadBlob, fileStamp} from "../lib/zip";

const BACKUP_FORMAT = "jee-cbt-backup";

export function BackupPanel(){
  const fileRef = useRef(null);
  const [msg, setMsg] = useState(null);   // {ok, text}
  const [plan, setPlan] = useState(null); // {file, merge} waiting for the person to confirm

  function backup(){
    try{
      const data = store.snapshot();
      const n = Object.keys(data).length;
      const blob = new Blob([JSON.stringify({format:BACKUP_FORMAT, version:1, exportedAt:new Date().toISOString(), data})], {type:"application/json"});
      downloadBlob(blob, `JEE_CBT_backup_${fileStamp(Date.now())}.json`);
      setMsg({ok:true, text:`Backup downloaded (${n} saved item${n===1?"":"s"}: history, notes, stars, added papers, profile and settings).`});
    }catch(e){ setMsg({ok:false, text:"Backup failed: " + (e && e.message ? e.message : e)}); }
  }
  // Step 1: read the file and work out what it would add. Nothing is written yet.
  async function pick(ev){
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if(!file) return;
    setMsg(null); setPlan(null);
    try{
      const incoming = parseBackup(await file.text());
      const merge = mergeBackup(store.snapshot(), incoming);
      if(!Object.keys(merge.writes).length){
        setMsg({ok:true, text:`Nothing new in "${file.name}": everything in it is already on this device.${merge.notes.length ? " " + merge.notes.join(" ") : ""}`});
        return;
      }
      setPlan({file:file.name, merge});
    }catch(e){ setMsg({ok:false, text:"Could not read that file: " + (e && e.message ? e.message : e)}); }
  }
  // Step 2: add it. Existing data is never replaced or removed.
  async function apply(){
    const {merge} = plan; setPlan(null);
    try{
      Object.entries(merge.writes).forEach(([k, v]) => store.setItem(k, v));
      await store.flushNow();
      setMsg({ok:true, text:"Added. Reloading…"});
      setTimeout(()=>window.location.reload(), 600);
    }catch(e){ setMsg({ok:false, text:"Could not add the backup (browser storage problem): " + (e && e.message ? e.message : e)}); }
  }
  const parts = plan ? describeCounts(plan.merge.counts) : [];
  return (
    <div style={{marginTop:10, fontSize:12.5, color:"var(--text-dim)"}}>
      <div style={{display:"flex", gap:8, flexWrap:"wrap", alignItems:"center"}}>
        <button className="btn" onClick={backup} title="Save all your history, notes, stars, added papers and settings to one file"><Icon name="download" size={16}/> Backup data</button>
        <button className="btn" onClick={()=>fileRef.current && fileRef.current.click()} title="Add the contents of a backup file to what is on this device. Nothing you already have is replaced or removed."><Icon name="upload" size={16}/> Append backup</button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={pick} style={{display:"none"}}/>
        <span style={{color:"var(--text-faint)"}}>Stored in this browser ({store.backend==="indexedDB" ? "IndexedDB" : "localStorage"}). Back up before clearing browser data.</span>
      </div>
      {plan && (
        <div className="card" role="dialog" aria-label="Append backup" style={{marginTop:10, padding:"12px 14px", color:"var(--text)"}}>
          <div style={{fontWeight:700, marginBottom:4}}>Append "{plan.file}"?</div>
          <div style={{color:"var(--text-dim)", lineHeight:1.5}}>
            {parts.length ? <>This will add: <b>{parts.join(", ")}</b>.</> : "This will add some missing settings."}
            {" "}Everything already on this device stays exactly as it is; only what is missing gets added.
          </div>
          {plan.merge.notes.length>0 && <ul style={{margin:"6px 0 0", paddingLeft:18, color:"var(--text-dim)"}}>{plan.merge.notes.map((n, i)=><li key={i}>{n}</li>)}</ul>}
          <div style={{display:"flex", gap:8, marginTop:10}}>
            <button className="btn btn-primary" onClick={apply}>Append</button>
            <button className="btn" onClick={()=>setPlan(null)}>Cancel</button>
          </div>
        </div>
      )}
      {msg && <div role="status" style={{marginTop:6, color: msg.ok ? "var(--correct)" : "var(--wrong)", fontWeight:600}}>{msg.text}</div>}
      <details style={{marginTop:6}}>
        <summary style={{cursor:"pointer", color:"var(--text-faint)"}}>Moving from the old single-file version?</summary>
        <div style={{marginTop:4, lineHeight:1.5}}>
          Open the old HTML file in your browser, press F12, open the Console and run <code>copy(JSON.stringify(localStorage))</code>.
          Paste the result into a text file, save it as <code>old.json</code>, then use "Append backup" here.
        </div>
      </details>
    </div>
  );
}
