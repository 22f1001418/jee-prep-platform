import React, {useEffect, useState} from "react";
import {CAUSES, addMistakes, attemptKeyOf, dueLabel, loadMistakes, mistakeKey, setCause, setRule, useMistakes} from "../lib/mistakes";

// "Why did you miss this?" chips. Clicking the chosen chip again clears it.
export function CauseChips({value, onChange, small}){
  return (
    <div role="group" aria-label="Why did you miss this question?" style={{display:"flex", flexWrap:"wrap", gap:6}}>
      {CAUSES.map(c=>{
        const on = value===c.id;
        return (
          <button key={c.id} type="button" aria-pressed={on} title={c.hint} onClick={()=>onChange(on ? null : c.id)}
            style={{
              cursor:"pointer", fontFamily:"inherit", fontSize: small ? 12 : 12.5, fontWeight:600, padding: small ? "3px 9px" : "4px 11px", borderRadius:14,
              border:`1.5px solid ${c.color}`, background: on ? c.color : "transparent", color: on ? "#fff" : "var(--text)", transition:"background .12s",
            }}>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

// One-line "what will I do differently" note. Saved when you leave the field.
export function RuleInput({value, onSave, placeholder}){
  const [v, setV] = useState(value || "");
  useEffect(()=>{ setV(value || ""); }, [value]);
  return (
    <input type="text" value={v} maxLength={300} placeholder={placeholder || "Rule for next time, e.g. \"underline the units before solving\""}
      aria-label="Rule to remember next time"
      onChange={e=>setV(e.target.value)} onBlur={()=>{ if(v!==(value || "")) onSave(v); }}
      onKeyDown={e=>{ if(e.key==="Enter") e.currentTarget.blur(); }}
      style={{width:"100%", boxSizing:"border-box", padding:"7px 10px", fontSize:13, fontFamily:"inherit", border:"1px solid var(--border-dark)", borderRadius:6, background:"var(--panel)", color:"var(--text)"}}/>
  );
}

// Shown under each wrong / unattempted question on the review screen.
export function MistakeTagger({state, r}){
  useMistakes();
  const key = mistakeKey(r.paperId || state.paperId, r.n), ak = attemptKeyOf(state);
  const it = loadMistakes()[key];
  const hit = it ? it.hits.find(h=>h.a===ak) : null;
  const box = {marginTop:12, paddingTop:10, borderTop:"1px dashed var(--border-dark)"};
  if(!hit){
    return (
      <div style={box}>
        <button className="btn" onClick={()=>addMistakes(state, [r])}>＋ {it ? "Count this miss too" : "Add to revision queue"}</button>
        <span style={{marginLeft:10, fontSize:12, color:"var(--text-faint)"}}>
          {it ? `Already in your Mistake Book (${dueLabel(it).toLowerCase()}).` : "You will be quizzed on it again after 1, 3, 7, 14, 30 and 60 days."}
        </span>
      </div>
    );
  }
  return (
    <div style={box}>
      <div style={{fontSize:12, color:"var(--text-faint)", marginBottom:6}}>
        In your Mistake Book · {dueLabel(it)}{it.misses>1 ? ` · missed ${it.misses} times` : ""}
      </div>
      <div style={{fontSize:12.5, fontWeight:700, color:"var(--text-dim)", marginBottom:6}}>Why did you miss it?</div>
      <CauseChips value={hit.cause} onChange={c=>setCause(key, ak, c)}/>
      <div style={{marginTop:8}}><RuleInput value={it.rule} onSave={t=>setRule(key, t)}/></div>
    </div>
  );
}
