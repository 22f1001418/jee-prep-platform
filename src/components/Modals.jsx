import React from "react";
import {STATUS} from "../lib/constants";
import {Stat} from "../screens/PreviewScreen";

// ---------- Overwrite-active-attempt confirmation modal ----------
export function OverwriteModal({onCancel, onDiscardAndStart, onResumeInstead}){
  return (
    <div style={{position:"fixed", inset:0, background:"rgba(10,16,24,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60, padding:20}}>
      <div className="card" style={{maxWidth:470, width:"100%", padding:24}}>
        <h3 style={{marginTop:0}}>You have a test in progress</h3>
        <p style={{fontSize:14, color:"var(--text-dim)", lineHeight:1.6}}>
          Starting a new attempt now will permanently discard your in-progress test — its answers, timer and status will be lost. You can resume it instead if you'd rather finish it first.
        </p>
        <div style={{display:"flex", gap:8, justifyContent:"space-between", alignItems:"center", flexWrap:"nowrap", marginTop:10}}>
          <button className="btn" style={{padding:"7px 12px", fontSize:12.5, whiteSpace:"nowrap"}} onClick={onCancel}>Cancel</button>
          <div style={{display:"flex", gap:8, flexWrap:"nowrap"}}>
            <button className="btn btn-save" style={{padding:"7px 12px", fontSize:12.5, whiteSpace:"nowrap"}} onClick={onResumeInstead}>Resume In-Progress Test</button>
          <button className="btn btn-danger" style={{padding:"7px 12px", fontSize:12.5, whiteSpace:"nowrap"}} onClick={onDiscardAndStart}>Discard &amp; Start New</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Exit confirmation modal ----------
export const MAX_EXITS = 3;
export function ExitModal({onCancel, onConfirm, used}){
  const left = Math.max(0, MAX_EXITS - used);
  return (
    <div style={{position:"fixed", inset:0, background:"rgba(10,16,24,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, padding:20}}>
      <div className="card" style={{maxWidth:340, width:"100%", padding:"18px 20px"}}>
        <div style={{fontWeight:700, fontSize:16, marginBottom:6}}>Exit the test?</div>
        {left > 0 ? (
          <div style={{fontSize:13, color:"var(--text-dim)"}}>Progress is saved. Exits left: <strong>{left}</strong> of {MAX_EXITS}.</div>
        ) : (
          <div style={{fontSize:13, color:"var(--not-answered)", fontWeight:600}}>No exits left. Exiting now will submit your test.</div>
        )}
        <div style={{display:"flex", gap:10, justifyContent:"flex-end", marginTop:14}}>
          <button className="btn" style={{padding:"7px 14px", fontSize:13}} onClick={onCancel}>Stay</button>
          <button className="btn btn-danger" style={{padding:"7px 14px", fontSize:13}} onClick={onConfirm}>{left > 0 ? "Exit" : "Submit Test"}</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Submit confirmation modal ----------
export function SubmitModal({state, onCancel, onConfirm}){
  const perQ = state.perQ;
  const attempted = Object.values(perQ).filter(r=>r.status===STATUS.ANSWERED||r.status===STATUS.ANSWERED_MARKED).length;
  const notAttempted = 75 - attempted;
  const marked = Object.values(perQ).filter(r=>r.status===STATUS.MARKED||r.status===STATUS.ANSWERED_MARKED).length;
  return (
    <div style={{position:"fixed", inset:0, background:"rgba(10,16,24,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, padding:20}}>
      <div className="card" style={{maxWidth:440, width:"100%", padding:28}}>
        <h3 style={{marginTop:0}}>Are you sure you want to submit the test?</h3>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 20px", margin:"18px 0"}}>
          <Stat label="Total Questions" value={75}/>
          <Stat label="Attempted" value={attempted}/>
          <Stat label="Not Attempted" value={notAttempted}/>
          <Stat label="Marked for Review" value={marked}/>
        </div>
        {notAttempted > 0 && (
          <div style={{fontSize:13, color:"var(--not-answered)", marginBottom:18}}>
            You have {notAttempted} unanswered question{notAttempted!==1?"s":""}. These will be scored as 0.
          </div>
        )}
        <div style={{display:"flex", gap:10, justifyContent:"flex-end"}}>
          <button className="btn" onClick={onCancel}>Continue Test</button>
          <button className="btn btn-danger" onClick={onConfirm}>Submit Test</button>
        </div>
      </div>
    </div>
  );
}

