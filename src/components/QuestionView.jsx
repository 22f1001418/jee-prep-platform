import React, {useEffect} from "react";
import {DiagramSVG} from "./DiagramSVG";
import {TeX} from "./TeX";
import {isOptionCorrect} from "../lib/scoring";

export const OPTION_LETTERS = ["A", "B", "C", "D"];

// One question: text, figure, and either the options (MCQ) or a number box (NUM).
//   resp / onResp   the current answer (option id or typed number)
//   reveal          show which option is right / wrong (after checking)
//   disabled        no more changes
// While it is editable, the keys A-D and 1-4 pick an option (not while typing in a field).
export function QuestionView({q, resp, onResp, reveal, disabled, autoFocus}){
  const isNum = q.type==="NUM" || !q.options;
  useEffect(()=>{
    if(isNum || disabled) return;
    function onKey(e){
      if(e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target && e.target.tagName) || "";
      if(tag==="INPUT" || tag==="TEXTAREA" || tag==="SELECT") return;
      const idx = "abcd".indexOf(e.key.toLowerCase());
      const i = idx>=0 ? idx : ["1","2","3","4"].indexOf(e.key);
      if(i>=0 && q.options[i]) onResp(q.options[i].id);
    }
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  }, [q, isNum, disabled, onResp]);
  return (
    <div>
      <div style={{fontSize:15.5, marginBottom:12}}><TeX>{q.text}</TeX></div>
      {q.svg && <div style={{marginBottom:12}}><DiagramSVG id={q.svg}/></div>}
      {!isNum ? (
        <div role="radiogroup" aria-label="Options" style={{display:"flex", flexDirection:"column", gap:8}}>
          {q.options.map((o, i)=>{
            const chosen = resp===o.id, correct = isOptionCorrect(q, o.id);
            let border = "var(--border-dark)", bg = "transparent";
            if(reveal){ if(correct){ border = "var(--correct)"; bg = "rgba(46,158,91,.12)"; } else if(chosen){ border = "var(--wrong)"; bg = "rgba(214,67,63,.10)"; } }
            else if(chosen){ border = "var(--navy)"; bg = "rgba(63,124,196,.12)"; }
            return (
              <label key={o.id} style={{display:"flex", alignItems:"center", gap:10, padding:"9px 12px", border:`1.5px solid ${border}`, background:bg, borderRadius:8, cursor: disabled ? "default" : "pointer"}}>
                <input type="radio" name="qv-opt" disabled={!!disabled} checked={chosen} onChange={()=>onResp(o.id)}/>
                <span className="mono" style={{fontWeight:700, minWidth:18}}>{OPTION_LETTERS[i] || o.id}</span>
                <span style={{minWidth:0, overflowWrap:"anywhere"}}><TeX>{o.text}</TeX></span>
                {reveal && correct && <span style={{marginLeft:"auto", color:"var(--correct)", fontWeight:700}}>✓</span>}
              </label>
            );
          })}
        </div>
      ) : (
        <input autoFocus={autoFocus} type="text" inputMode="decimal" value={resp || ""} disabled={!!disabled} onChange={e=>onResp(e.target.value)}
          placeholder="Type your numerical answer" aria-label="Numerical answer"
          style={{width:220, padding:"9px 12px", fontSize:15, fontFamily:"inherit", border:"1.5px solid var(--border-dark)", borderRadius:8, background:"var(--panel)", color:"var(--text)"}}/>
      )}
    </div>
  );
}
