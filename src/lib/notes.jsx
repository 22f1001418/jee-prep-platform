import React, {useState} from "react";
import {getPaper, paperMissing} from "./papers";
import {alertStorageFull} from "./storageAlerts";
import {store} from "./store";

// ---------- JEE Performance Analysis page ----------
// ---------- Question notes (stored per attempt, in this browser) ----------
export const LS_NOTES = "jee_cbt_notes_v1";
export function loadAllNotes(){
  try{ const raw = store.getItem(LS_NOTES); return raw ? JSON.parse(raw) : {}; }catch(e){ return {}; }
}
export function persistNotes(attemptKey, notesForAttempt){
  const all = loadAllNotes();
  if(Object.keys(notesForAttempt).length===0) delete all[attemptKey]; else all[attemptKey] = notesForAttempt;
  try{ store.setItem(LS_NOTES, JSON.stringify(all)); return true; }catch(e){ return false; }
}
// ---------- Note highlights (separate store: ranges over the note text) ----------
export const LS_NOTE_HL = "jee_cbt_note_hl_v1";
export function loadAllHl(){
  try{ const raw = store.getItem(LS_NOTE_HL); return raw ? JSON.parse(raw) : {}; }catch(e){ return {}; }
}
export function persistHl(attemptKey, hlForAttempt){
  const all = loadAllHl();
  if(Object.keys(hlForAttempt).length===0) delete all[attemptKey]; else all[attemptKey] = hlForAttempt;
  try{ store.setItem(LS_NOTE_HL, JSON.stringify(all)); return true; }catch(e){ return false; }
}
export function mergeRanges(list){
  const a = list.filter(r=>r[1]>r[0]).map(r=>[r[0],r[1]]).sort((x,y)=>x[0]-y[0]);
  const out = [];
  for(const r of a){
    if(out.length && r[0] <= out[out.length-1][1]) out[out.length-1][1] = Math.max(out[out.length-1][1], r[1]);
    else out.push(r);
  }
  return out;
}
export function subtractRange(list, s, e){
  const out = [];
  for(const [a,b] of list){
    if(b<=s || a>=e){ out.push([a,b]); continue; }
    if(a<s) out.push([a,s]);
    if(b>e) out.push([e,b]);
  }
  return out;
}
// A note can write a subscript as _{...}, e.g. K_{c} shows as K with a small c (Unicode has no subscript for letters like b, c, w, B).
// Used only when a note is SHOWN; the text in storage stays as typed. The highlight layer behind the editor (soft) must stay unchanged.
export function subify(text){
  if(typeof text !== "string" || text.indexOf("_{") < 0) return text;
  const out = []; let last = 0, k = 0; const re = /_\{([^{}]*)\}/g; let m;
  while((m = re.exec(text))){ if(m.index > last) out.push(text.slice(last, m.index)); out.push(<sub key={"s"+(k++)}>{m[1]}</sub>); last = m.index + m[0].length; }
  if(last < text.length) out.push(text.slice(last));
  return out;
}
// ----- Editing form of a subscript -----
// In storage a subscript is _{c}. While a note is being EDITED it is held as two invisible marks around the letters (no width),
// so the editor can draw the letters small and lowered right where they are typed. toStoreText() turns it back before saving.
export const SUB_O = "\u2062", SUB_C = "\u2063";
export function convertText(text, re, rep){
  const edits = []; let out = "", last = 0;
  for(const m of text.matchAll(re)){
    const r = rep(m); out += text.slice(last, m.index) + r;
    edits.push({at:m.index, oldLen:m[0].length, newLen:r.length}); last = m.index + m[0].length;
  }
  out += text.slice(last);
  const map = o => {
    let shift = 0;
    for(const e of edits){
      if(o >= e.at + e.oldLen) shift += e.newLen - e.oldLen;
      else if(o > e.at) return e.at + shift + Math.min(o - e.at, e.newLen);
      else break;
    }
    return o + shift;
  };
  return {text:out, map};
}
export function toEditConv(t){ return convertText(t, /_\{([^{}]*)\}/g, m=>SUB_O + m[1] + SUB_C); }
export function toStoreConv(t){
  const a = convertText(t, /\u2062([^\u2062\u2063]*)\u2063/g, m=>"_{" + m[1] + "}");
  const b = convertText(a.text, /[\u2062\u2063]/g, ()=>"");
  return {text:b.text, map:o=>b.map(a.map(o))};
}
// The editor's picture of the note: highlights, and subscripts drawn small and lowered. Every letter keeps its normal width
// (the small copy is laid over an invisible normal one) so the cursor in the box on top always lines up.
export function renderEditLayer(text, ranges){
  const hl = new Array(text.length).fill(false);
  mergeRanges(ranges || []).forEach(([a,b])=>{ for(let k=a;k<Math.min(b,text.length);k++) hl[k] = true; });
  const sub = []; let inSub = false;
  for(let k=0;k<text.length;k++){ const ch = text[k]; if(ch===SUB_O){ inSub = true; sub[k] = false; } else if(ch===SUB_C){ inSub = false; sub[k] = false; } else sub[k] = inSub; }
  const parts = []; let a = 0, n = 0;
  while(a < text.length){
    let b = a + 1; while(b < text.length && hl[b]===hl[a] && sub[b]===sub[a]) b++;
    const t = text.slice(a, b);
    const body = sub[a]
      ? <span style={{position:"relative"}}><span style={{visibility:"hidden"}}>{t}</span><span style={{position:"absolute", left:0, top:"0.32em", fontSize:"0.72em", whiteSpace:"pre"}}>{t}</span></span>
      : t;
    parts.push(hl[a] ? <mark key={"e"+(n++)} style={{background:"rgba(245,208,76,0.55)", color:"inherit", borderRadius:2}}>{body}</mark> : <span key={"e"+(n++)}>{body}</span>);
    a = b;
  }
  return parts;
}
export function renderHighlighted(text, ranges, soft){
  const spans = mergeRanges(ranges || []).filter(r=>r[0]<text.length);
  const parts = [];
  let pos = 0;
  spans.forEach(([a,b],i)=>{
    const bb = Math.min(b, text.length);
    if(a>pos) parts.push(<span key={"p"+i}>{soft ? text.slice(pos,a) : subify(text.slice(pos,a))}</span>);
    parts.push(<mark key={"m"+i} style={soft
      ? {background:"rgba(245,208,76,0.55)", color:"transparent", borderRadius:2}
      : {background:"#f5d04c", color:"#1a1a1a", borderRadius:2, padding:"0 1px"}}>{soft ? text.slice(a,bb) : subify(text.slice(a,bb))}</mark>);
    pos = bb;
  });
  if(pos<text.length) parts.push(<span key="end">{soft ? text.slice(pos) : subify(text.slice(pos))}</span>);
  return {parts, count: spans.length};
}
// Keep highlight ranges lined up with the text while it is being edited.
export function remapRanges(ranges, oldT, newT){
  if(oldT===newT) return ranges;
  let p = 0; const maxP = Math.min(oldT.length, newT.length);
  while(p<maxP && oldT[p]===newT[p]) p++;
  let q = 0; const maxQ = Math.min(oldT.length-p, newT.length-p);
  while(q<maxQ && oldT[oldT.length-1-q]===newT[newT.length-1-q]) q++;
  const delta = newT.length - oldT.length;
  const oldEnd = oldT.length - q, newEnd = newT.length - q;
  const mapS = x => x<=p ? x : (x>=oldEnd ? x+delta : newEnd);
  const mapE = x => x<=p ? x : (x>=oldEnd ? x+delta : p);
  return mergeRanges(ranges.map(([s,e])=>[mapS(s), mapE(e)]));
}
// ---------- Note images (compressed, stored separately per attempt) ----------
export const LS_NOTE_IMG = "jee_cbt_note_img_v1";
export const MAX_NOTE_IMAGES = 5;
export function loadAllImgs(){
  try{ const raw = store.getItem(LS_NOTE_IMG); return raw ? JSON.parse(raw) : {}; }catch(e){ return {}; }
}
export function persistImgs(attemptKey, imgsForAttempt){
  const all = loadAllImgs();
  if(Object.keys(imgsForAttempt).length===0) delete all[attemptKey]; else all[attemptKey] = imgsForAttempt;
  try{ store.setItem(LS_NOTE_IMG, JSON.stringify(all)); return true; }catch(e){ return false; }
}
// Notes/highlights/images are stored separately from history (keyed by
// attemptKey, not by history index), so deleting a history entry never
// touched them on its own — the note would keep showing afterward, labeled
// "Attempt no longer in history" instead of actually being gone. Call this
// alongside every history deletion so the two stay in sync.
export function deleteNotesForAttempt(attemptKey){
  try{
    const notes = loadAllNotes(); delete notes[attemptKey]; store.setItem(LS_NOTES, JSON.stringify(notes));
    const hl = loadAllHl(); delete hl[attemptKey]; store.setItem(LS_NOTE_HL, JSON.stringify(hl));
    const imgs = loadAllImgs(); delete imgs[attemptKey]; store.setItem(LS_NOTE_IMG, JSON.stringify(imgs));
    const hidden = JSON.parse(store.getItem(LS_NOTE_HIDDEN) || "{}"); delete hidden[attemptKey]; store.setItem(LS_NOTE_HIDDEN, JSON.stringify(hidden));
    unstarAttempt(attemptKey); // stars on this attempt's notes go with the notes
  }catch(e){}
}
export function deleteNotesForAttempts(attemptKeys){
  attemptKeys.forEach(deleteNotesForAttempt);
}
export function deleteAllNotes(){
  try{
    store.removeItem(LS_NOTES);
    store.removeItem(LS_NOTE_HL);
    store.removeItem(LS_NOTE_IMG);
    store.removeItem(LS_NOTE_HIDDEN);
    store.removeItem(LS_NOTE_STARRED); // no notes left, so no stars either
  }catch(e){}
}
// "Deleting" a note from the All Notes page only removes it from that
// aggregated view — the note itself (text, highlights, images) must stay
// exactly as it is on the exam's own Analysis > Notes tab, since that's a
// separate, personal record of that specific attempt. So this doesn't
// touch LS_NOTES/LS_NOTE_HL/LS_NOTE_IMG at all; it just records which
// (attemptKey, qn) pairs to skip when building the All Notes list.
export const LS_NOTE_HIDDEN = "jee_cbt_note_hidden_v1";
export function loadHiddenNotes(){
  try{ const raw = store.getItem(LS_NOTE_HIDDEN); return raw ? JSON.parse(raw) : {}; }catch(e){ return {}; }
}
export function hideNoteFromAllNotes(attemptKey, qn){
  const hidden = loadHiddenNotes();
  const forAttempt = new Set(hidden[attemptKey] || []);
  forAttempt.add(qn);
  hidden[attemptKey] = [...forAttempt];
  try{ store.setItem(LS_NOTE_HIDDEN, JSON.stringify(hidden)); }catch(e){}
}
// Clears a question back out of the hidden list — called whenever a note
// is (re)saved with real content, so a freshly written note always shows
// in All Notes even if that question was removed from the list earlier.
export function unhideNoteFromAllNotes(attemptKey, qn){
  const hidden = loadHiddenNotes();
  if(!hidden[attemptKey]) return;
  const forAttempt = new Set(hidden[attemptKey]);
  if(!forAttempt.delete(qn)) return; // nothing to do
  if(forAttempt.size===0) delete hidden[attemptKey]; else hidden[attemptKey] = [...forAttempt];
  try{ store.setItem(LS_NOTE_HIDDEN, JSON.stringify(hidden)); }catch(e){}
}
// Shrinks a picture (max 1000 px, JPEG) so many images fit in browser storage.
export function compressImage(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = ()=>{
      const img = new Image();
      img.onerror = reject;
      img.onload = ()=>{
        const MAX = 1000;
        const k = Math.min(1, MAX/Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width*k)); c.height = Math.max(1, Math.round(img.height*k));
        const g = c.getContext("2d");
        g.fillStyle = "#ffffff"; g.fillRect(0,0,c.width,c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
// A picture that sits inside the note text. Click to view full size; onRemove adds an X (editor only).
export function InlineImg({src, onRemove}){
  const [big, setBig] = useState(false);
  return (
    <div style={{position:"relative", display:"inline-block", verticalAlign:"top", maxWidth:"100%", margin:"6px 10px 6px 0"}}>
      <img src={src} alt="Note image" onClick={()=>setBig(true)}
        style={{display:"block", maxWidth:"100%", maxHeight:240, borderRadius:6, border:"1px solid var(--border-dark)", cursor:"zoom-in"}}/>
      {onRemove && (
        <button type="button" onClick={onRemove} title="Remove image" aria-label="Remove image"
          style={{position:"absolute", top:-7, right:-7, width:20, height:20, borderRadius:"50%", border:"1px solid var(--border-dark)", background:"var(--panel)", color:"var(--text)", cursor:"pointer", fontSize:12, lineHeight:1, padding:0}}>x</button>
      )}
      {big && (
        <div onClick={()=>setBig(false)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:80, display:"flex", alignItems:"center", justifyContent:"center", padding:20, cursor:"zoom-out"}}>
          <img src={src} alt="Full size" style={{maxWidth:"100%", maxHeight:"100%", borderRadius:6, background:"#fff"}}/>
        </div>
      )}
    </div>
  );
}

// A note is text with one marker character where each picture sits (pictures are kept in order).
export const IMG_MARK = "￼";
export function normalizeNote(text, images){
  const n = (images||[]).length;
  let m = (text.match(/￼/g) || []).length;
  if(m < n) return text + IMG_MARK.repeat(n-m);          // older notes: pictures go after the text
  while(m > n){ const i = text.lastIndexOf(IMG_MARK); text = text.slice(0,i)+text.slice(i+1); m--; }
  return text;
}
export function segRanges(ranges, base, len){
  return (ranges||[]).map(([a,b])=>[Math.max(a-base,0), Math.min(b-base,len)]).filter(r=>r[1]>r[0]);
}

// Read-only note: text with highlights, pictures exactly where they were placed.
export function NoteBody({text, ranges, images}){
  const imgsArr = images || [];
  const segs = normalizeNote(text || "", imgsArr).split(IMG_MARK);
  let base = 0;
  return (
    <div style={{flex:1, minWidth:0, fontSize:14, wordBreak:"break-word"}}>
      {segs.map((sg,i)=>{
        const {parts} = renderHighlighted(sg, segRanges(ranges, base, sg.length));
        base += sg.length + 1;
        return (
          <React.Fragment key={i}>
            {sg && <div style={{whiteSpace:"pre-wrap"}}>{parts}</div>}
            {i<segs.length-1 && imgsArr[i] && <InlineImg src={imgsArr[i]}/>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Symbols offered in the note editor's "Symbols" palette (Maths, Physics, Chemistry).


// Notes the person has "hidden for a while" on the All Notes page: only the note's
// body is concealed (the card stays), and nothing is deleted. Default = nothing hidden.
export const LS_NOTE_CONCEALED = "jee_cbt_note_concealed_v1";
export function loadConcealed(){
  try{ const raw = store.getItem(LS_NOTE_CONCEALED); const a = raw ? JSON.parse(raw) : []; return new Set(Array.isArray(a) ? a : []); }catch(e){ return new Set(); }
}
export function saveConcealed(set){
  try{ store.setItem(LS_NOTE_CONCEALED, JSON.stringify([...set])); }catch(e){ alertStorageFull("this change"); }
}
// Notes the person has starred on the All Notes page (entryKeys), so they can be
// shown on their own through the Filter menu. Default = nothing starred.
export const LS_NOTE_STARRED = "jee_cbt_note_starred_v1";
export function loadStarred(){
  try{ const raw = store.getItem(LS_NOTE_STARRED); const a = raw ? JSON.parse(raw) : []; return new Set(Array.isArray(a) ? a : []); }catch(e){ return new Set(); }
}
export function saveStarred(set){
  try{ store.setItem(LS_NOTE_STARRED, JSON.stringify([...set])); }catch(e){ alertStorageFull("the star on this note"); }
}
// A star must never outlive its note. These keep the saved star list in sync when a
// note is deleted (unstarNote), when a whole attempt's notes are deleted (unstarAttempt),
// and clean up stars left behind earlier (pruneOrphanStars).
export function unstarNote(attemptKey, qn){
  try{ const s = loadStarred(); if(s.delete(`${attemptKey}:${qn}`)) saveStarred(s); }catch(e){}
}
export function unstarAttempt(attemptKey){
  try{
    const s = loadStarred(); let changed = false;
    [...s].forEach(k=>{ if(String(k).startsWith(attemptKey+":")){ s.delete(k); changed = true; } });
    if(changed) saveStarred(s);
  }catch(e){}
}
// Drops stars whose note no longer exists in storage (or whose question is gone from a paper
// that IS in this file). Stars for papers missing from this file are kept, since their notes
// are kept too. Returns true if anything was removed.
export function pruneOrphanStars(){
  try{
    const s = loadStarred(); if(s.size===0) return false;
    const notes = loadAllNotes(), hl = loadAllHl(), imgs = loadAllImgs();
    const has = (store, ak, qn)=> !!(store[ak] && Object.prototype.hasOwnProperty.call(store[ak], qn));
    let changed = false;
    [...s].forEach(k=>{
      const parts = String(k).split(":");
      if(parts.length!==3) return;                 // unknown format: leave alone
      const [pid, st, qn] = parts, ak = `${pid}:${st}`;
      if(paperMissing(pid)) return;                // can't judge, keep
      const noteExists = has(notes, ak, qn) || has(hl, ak, qn) || has(imgs, ak, qn);
      const qExists = getPaper(pid).questions.some(q=>q.n===Number(qn));
      if(!noteExists || !qExists){ s.delete(k); changed = true; }
    });
    if(changed) saveStarred(s);
    return changed;
  }catch(e){ return false; }
}
