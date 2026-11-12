import {Icon} from "../components/icons";
import React, {useState} from "react";
import {loadHistory} from "../lib/persistence";
import {alertStorageFull} from "../lib/storageAlerts";
import {store} from "../lib/store";

// ---------- Main Exam Interface ----------
// ---------- Candidate profile (asked once, before the very first test) ----------
export const LS_PROFILE = "jee_cbt_profile_v1";
export function loadProfile(){
  try{ const raw = store.getItem(LS_PROFILE); const o = raw ? JSON.parse(raw) : null; return (o && typeof o.name==="string" && o.name.trim()) ? o : null; }catch(e){ return null; }
}
export function saveProfile(pr){
  try{ store.setItem(LS_PROFILE, JSON.stringify(pr)); return true; }catch(e){ return false; }
}
// Only a brand-new user (no saved profile AND no test history) is asked for a name.
export function needsProfile(){
  return !loadProfile() && loadHistory().length===0;
}
export function compressAvatar(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = ()=>{
      const img = new Image();
      img.onerror = reject;
      img.onload = ()=>{
        const S = 240;
        const k = Math.max(S/img.width, S/img.height);
        const w = img.width*k, h = img.height*k;
        const c = document.createElement("canvas");
        c.width = S; c.height = S;
        const g = c.getContext("2d");
        g.fillStyle = "#ffffff"; g.fillRect(0,0,S,S);
        g.drawImage(img, (S-w)/2, (S-h)/2, w, h); // centre-crop to a square
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
// edit=true: reached later from the sidebar / Home to change the name or photo (pre-filled, no "welcome" wording).
export function ProfileScreen({onSave, onBack, edit}){
  const [saved] = useState(()=>edit ? loadProfile() : null);
  const [name, setName] = useState(saved ? saved.name : "");
  const [photo, setPhoto] = useState(saved ? saved.photo || null : null);
  const [err, setErr] = useState("");
  async function pick(e){
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    try{ setPhoto(await compressAvatar(f)); setErr(""); }catch(ex){ setErr("Couldn't read that image. Try another photo."); }
  }
  function submit(){
    const n = name.trim();
    if(!n){ setErr("Please enter your name."); return; }
    if(!saveProfile({name:n, photo})){ setErr("Could not save your profile: browser storage is full. Free some space (or remove the photo) and try again."); return; }
    onSave();
  }
  return (
    <div style={{minHeight:"100vh", padding:"50px 20px", display:"flex", justifyContent:"center"}}>
      <div style={{maxWidth:460, width:"100%"}}>
        <button className="btn" onClick={onBack} style={{marginBottom:18}}><Icon name="arrow-left" size={16}/> Back</button>
        <div className="card" style={{padding:"28px 30px"}}>
          <h2 style={{marginTop:0, fontWeight:400, fontFamily:"var(--font-head)"}}>{edit ? "Your candidate profile" : "Welcome! Set up your candidate profile"}</h2>
          <p style={{fontSize:14, color:"var(--text-dim)", marginTop:-4}}>{edit ? "Your name and photo appear on the exam screen, like the real CBT." : "Your name and photo appear on the exam screen, like the real CBT. You can change them later from Home."}</p>
          <div style={{display:"flex", alignItems:"center", gap:16, margin:"18px 0"}}>
            <div style={{width:84, height:84, borderRadius:4, overflow:"hidden", background:"#cfd8e0", flex:"0 0 84px", border:"1px solid var(--border)"}}>
              {photo ? <img src={photo} alt="Your photo" style={{width:"100%", height:"100%", objectFit:"cover"}}/> : (
                <svg viewBox="0 0 64 64" width="100%" height="100%">
                  <rect width="64" height="64" fill="#cfd8e0"/>
                  <circle cx="32" cy="24" r="11" fill="#5b6672"/>
                  <path d="M10 64 Q12 40 32 40 Q52 40 54 64 Z" fill="#5b6672"/>
                </svg>
              )}
            </div>
            <label className="btn" style={{cursor:"pointer"}}>
              {photo ? "Change photo" : "Add photo (optional)"}
              <input type="file" accept="image/*" onChange={pick} style={{display:"none"}}/>
            </label>
            {photo && <button type="button" className="btn" onClick={()=>setPhoto(null)}>Remove</button>}
          </div>
          <label style={{display:"block", fontSize:13, fontWeight:700, color:"var(--text-dim)", marginBottom:6}}>Your name</label>
          <input type="text" value={name} maxLength={40} autoFocus
            onChange={e=>{ setName(e.target.value); setErr(""); }}
            onKeyDown={e=>{ if(e.key==="Enter") submit(); }}
            placeholder="Enter your full name"
            style={{width:"100%", boxSizing:"border-box", fontSize:16, padding:"10px 12px", border:"1px solid var(--border-dark)", borderRadius:4, background:"var(--panel)", color:"var(--text)"}}/>
          {err && <div style={{color:"var(--wrong)", fontSize:13, marginTop:8}}>{err}</div>}
          <div style={{marginTop:22}}>
            <button className="btn btn-primary" onClick={submit}>{edit ? "Save" : "Save & Continue"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Starred questions (separate from starred notes) ----------
// Questions the person flagged as "crazy / worth revisiting" while solving.
// Stored per paper + question number, independent of attempts, so the same
// question starred in several attempts shows up once on the Starred Questions page.
export const LS_STAR_Q = "jee_cbt_starred_questions_v1";
export function loadStarQ(){
  try{ const raw = store.getItem(LS_STAR_Q); const a = raw ? JSON.parse(raw) : []; return Array.isArray(a) ? a : []; }catch(e){ return []; }
}
export function saveStarQ(list){
  try{ store.setItem(LS_STAR_Q, JSON.stringify(list)); return true; }
  catch(e){ alertStorageFull("the star on this question"); return false; }
}
export function starQKey(paperId, n){ return `${paperId}:${n}`; }
// Toggles one question and returns the new list.
export function toggleStarQ(paperId, n){
  const list = loadStarQ();
  const exists = list.some(x=>x.paperId===paperId && x.n===n);
  const next = exists ? list.filter(x=>!(x.paperId===paperId && x.n===n)) : [...list, {paperId, n, at: Date.now()}];
  return saveStarQ(next) ? next : list;   // if it could not be saved, keep showing the saved state
}

// A numerical answer must be a real number. Half-typed input such as ".", "-" or "-." counts as no answer (never as a wrong answer).
export function cleanNumInput(s){ const t = String(s==null?"":s).trim(); return /^-?(\d+\.?\d*|\.\d+)$/.test(t) ? t : null; }
