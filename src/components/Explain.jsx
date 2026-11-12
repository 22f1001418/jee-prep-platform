import React, {useEffect, useRef, useState} from "react";
import {TeX} from "./TeX";
import {ExplainError, deleteSolution, fetchExplanation, getAccessCode, getSolution, parseSolution, saveSolution, setAccessCode} from "../lib/solutions";

const HEAD = /^(Idea|Solution|Answer|Why the other options fail|Watch out):\s*(.*)$/;

function Line({line}){
  const h = HEAD.exec(line);
  if(h) return <div style={{marginTop: h[1]==="Idea" ? 0 : 8, fontSize:14, lineHeight:1.65}}><strong>{h[1]}:</strong>{h[2] ? <> <TeX>{h[2]}</TeX></> : null}</div>;
  return <div style={{paddingLeft: /^\d+\./.test(line) ? 14 : 0, fontSize:14, lineHeight:1.65}}><TeX>{line}</TeX></div>;
}
// While the text is still arriving, only finished lines are typeset (so maths never flickers half-written); the last partial line is shown plain.
function Body({text, streaming}){
  const lines = text.split("\n");
  const complete = streaming ? lines.slice(0, -1) : lines;
  const partial = streaming ? lines[lines.length - 1] : "";
  return (
    <div>
      {complete.map((ln, i) => ln.trim()==="" ? <div key={i} style={{height:4}}/> : <Line key={i} line={ln}/>)}
      {partial && <div style={{fontSize:14, color:"var(--text-faint)"}}>{partial}</div>}
    </div>
  );
}

// "Explain this" for one question: asks the server for an AI-written solution, shows it as it streams, and remembers it.
export function ExplainPanel({paperId, n}){
  const key = `${paperId}:${n}`;
  const [rec, setRec] = useState(()=>getSolution(key));
  const [phase, setPhase] = useState("idle");        // idle | loading | error | auth
  const [open, setOpen] = useState(false);
  const [stream, setStream] = useState("");
  const [err, setErr] = useState(null);
  const [code, setCode] = useState(getAccessCode());
  const abort = useRef(null);
  useEffect(()=>()=>{ if(abort.current) abort.current.abort(); }, []);
  useEffect(()=>{ setRec(getSolution(key)); setPhase("idle"); setOpen(false); setStream(""); setErr(null); }, [key]);

  async function run(){
    if(abort.current) abort.current.abort();
    const ctl = new AbortController(); abort.current = ctl;
    setPhase("loading"); setErr(null); setStream(""); setOpen(true);
    try{
      const out = await fetchExplanation(paperId, n, {signal: ctl.signal, onText: setStream});
      const parsed = parseSolution(out.raw);
      const r = {text: parsed.text + (out.truncated ? "\n(The explanation was cut off because it ran long.)" : ""), keyCheck: parsed.keyCheck, model: out.model, at: Date.now()};
      saveSolution(key, r); setRec(r); setPhase("idle"); setStream("");
    }catch(e){
      if(e && e.name==="AbortError") return;
      setStream("");
      if(e instanceof ExplainError && e.code==="auth"){ setPhase("auth"); setErr(getAccessCode() ? "That access code was not accepted." : null); }
      else { setPhase("error"); setErr(e instanceof ExplainError ? e.message : "Something went wrong."); }
    }
  }
  function submitCode(){ setAccessCode(code); run(); }
  const box = {marginTop:12, paddingTop:10, borderTop:"1px dashed var(--border-dark)"};

  if(phase==="auth"){
    return (
      <div style={box}>
        <div style={{fontSize:13.5, marginBottom:8}}>{err || "Enter the access code for this app's explain feature."}</div>
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          <input type="password" value={code} onChange={e=>setCode(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") submitCode(); }} placeholder="Access code" aria-label="Access code" autoComplete="off"
            style={{padding:"7px 10px", fontSize:14, fontFamily:"inherit", border:"1.5px solid var(--border-dark)", borderRadius:6, background:"var(--panel)", color:"var(--text)"}}/>
          <button className="btn btn-primary" disabled={!code.trim()} onClick={submitCode}>Save and explain</button>
          <button className="btn" onClick={()=>setPhase("idle")}>Cancel</button>
        </div>
        <div style={{fontSize:12, color:"var(--text-faint)", marginTop:6}}>It is the APP_ACCESS_CODE you set on the server. It is stored in this browser only.</div>
      </div>
    );
  }
  return (
    <div style={box}>
      {phase==="idle" && !open && (
        <button className="btn" onClick={rec ? ()=>setOpen(true) : run}>{rec ? "Show AI solution" : "✦ Explain this (AI)"}</button>
      )}
      {phase==="error" && (
        <div role="alert" style={{fontSize:13.5, color:"var(--wrong)"}}>{err} <button className="btn" style={{marginLeft:8, padding:"3px 10px", fontSize:12.5}} onClick={run}>Try again</button></div>
      )}
      {open && phase==="loading" && !stream && <div style={{fontSize:13.5, color:"var(--text-dim)"}}>Working it out… this can take 20 to 60 seconds.</div>}
      {open && phase==="loading" && stream && <Body text={stream} streaming/>}
      {open && phase!=="loading" && rec && (
        <div>
          {rec.keyCheck && rec.keyCheck.status==="differs" && (
            <div role="note" style={{padding:"8px 12px", borderRadius:8, background:"rgba(217,164,65,.16)", border:"1px solid var(--gold)", fontSize:13, marginBottom:10, lineHeight:1.5}}>
              <strong>Heads up:</strong> the AI's careful working gives <strong>{rec.keyCheck.answer || "a different answer"}</strong>, which differs from the answer key. Check the question yourself. If the key is wrong you can correct it under Analysis → Answer Key.
            </div>
          )}
          <Body text={rec.text}/>
          <div style={{display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", marginTop:12, fontSize:12, color:"var(--text-faint)"}}>
            <span>AI-generated{rec.model ? ` by ${rec.model}` : ""}. It can be wrong, so check it against the key and your own working.{rec.keyCheck && rec.keyCheck.status==="agrees" ? " Matches the answer key." : ""}</span>
            <button className="btn" style={{padding:"2px 9px", fontSize:12}} onClick={run}>Regenerate</button>
            <button className="btn" style={{padding:"2px 9px", fontSize:12}} onClick={()=>{ deleteSolution(key); setRec(null); setOpen(false); }}>Remove</button>
            <button className="btn" style={{padding:"2px 9px", fontSize:12}} onClick={()=>setOpen(false)}>Hide</button>
          </div>
        </div>
      )}
    </div>
  );
}
