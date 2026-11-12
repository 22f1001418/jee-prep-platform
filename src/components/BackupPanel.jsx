import {Icon} from "./icons";
import React, {useRef, useState} from "react";
import {store} from "../lib/store";
import {downloadBlob, fileStamp} from "../lib/zip";

const BACKUP_FORMAT = "jee-cbt-backup";

// Accepts either a backup file made by this app, or a raw dump of the old single-file app's localStorage.
function parseBackup(text){
  const obj = JSON.parse(text);
  if(!obj || typeof obj!=="object" || Array.isArray(obj)) throw new Error("This file is not a backup.");
  const data = obj.format===BACKUP_FORMAT ? obj.data : obj;
  if(!data || typeof data!=="object") throw new Error("This backup has no data in it.");
  const keys = Object.keys(data).filter(k=>k.startsWith("jee_cbt_") && typeof data[k]==="string");
  if(!keys.length) throw new Error("No JEE CBT data found in this file.");
  return data;
}

export function BackupPanel(){
  const fileRef = useRef(null);
  const [msg, setMsg] = useState(null);   // {ok, text}

  function backup(){
    try{
      const data = store.snapshot();
      const n = Object.keys(data).length;
      const blob = new Blob([JSON.stringify({format:BACKUP_FORMAT, version:1, exportedAt:new Date().toISOString(), data})], {type:"application/json"});
      downloadBlob(blob, `JEE_CBT_backup_${fileStamp(Date.now())}.json`);
      setMsg({ok:true, text:`Backup downloaded (${n} saved item${n===1?"":"s"}: history, notes, stars, profile and settings).`});
    }catch(e){ setMsg({ok:false, text:"Backup failed: " + (e && e.message ? e.message : e)}); }
  }
  async function restore(ev){
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if(!file) return;
    try{
      const data = parseBackup(await file.text());
      const n = Object.keys(data).filter(k=>k.startsWith("jee_cbt_")).length;
      if(!window.confirm(`Restore ${n} saved item${n===1?"":"s"} from "${file.name}"?\n\nThis REPLACES the history, notes and stars currently saved on this device. Download a backup first if you want to keep them. Continue?`)) return;
      store.restore(data, {replace:true});
      await store.flushNow();
      setMsg({ok:true, text:"Restored. Reloading…"});
      setTimeout(()=>window.location.reload(), 600);
    }catch(e){ setMsg({ok:false, text:"Could not restore: " + (e && e.message ? e.message : e)}); }
  }
  return (
    <div style={{marginTop:10, fontSize:12.5, color:"var(--text-dim)"}}>
      <div style={{display:"flex", gap:8, flexWrap:"wrap", alignItems:"center"}}>
        <button className="btn" onClick={backup} title="Save all your history, notes, stars and settings to one file"><Icon name="download" size={16}/> Backup data</button>
        <button className="btn" onClick={()=>fileRef.current && fileRef.current.click()} title="Load a backup file made earlier (or from another device)"><Icon name="upload" size={16}/> Restore backup</button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={restore} style={{display:"none"}}/>
        <span style={{color:"var(--text-faint)"}}>Stored in this browser ({store.backend==="indexedDB" ? "IndexedDB" : "localStorage"}). Back up before clearing browser data.</span>
      </div>
      {msg && <div role="status" style={{marginTop:6, color: msg.ok ? "var(--correct)" : "var(--wrong)", fontWeight:600}}>{msg.text}</div>}
      <details style={{marginTop:6}}>
        <summary style={{cursor:"pointer", color:"var(--text-faint)"}}>Moving from the old single-file version?</summary>
        <div style={{marginTop:4, lineHeight:1.5}}>
          Open the old HTML file in your browser, press F12, open the Console and run <code>copy(JSON.stringify(localStorage))</code>.
          Paste the result into a text file, save it as <code>old.json</code>, then use "Restore backup" here.
        </div>
      </details>
    </div>
  );
}
