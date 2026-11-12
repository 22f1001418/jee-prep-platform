import React from "react";

export function Donut({correct, wrong, unattempted, size=150}){
  const total = correct+wrong+unattempted || 1;
  const r = size/2 - 14, cx = size/2, cy = size/2, circ = 2*Math.PI*r;
  let offset = 0;
  const segs = [
    {v:correct, color:"var(--correct)"},
    {v:wrong, color:"var(--wrong)"},
    {v:unattempted, color:"var(--unattempted)"},
  ];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="16"/>
      {segs.map((s,i)=>{
        const frac = s.v/total;
        const dash = frac*circ;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth="16"
            strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt"/>
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy-4} textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--text)">{correct+wrong+unattempted>0?Math.round((correct)/(total)*100):0}%</text>
      <text x={cx} y={cy+16} textAnchor="middle" fontSize="11" fill="var(--text-faint)">correct</text>
    </svg>
  );
}

export function BarRow({label, value, max, color, suffix="", displayValue}){
  const pct = max>0 ? Math.max(0,Math.min(100, value/max*100)) : 0;
  return (
    <div style={{marginBottom:12}}>
      <div style={{display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4}}>
        <span style={{color:"var(--text-dim)"}}>{label}</span>
        <span className="mono" style={{fontWeight:700}}>{displayValue!==undefined ? displayValue : <>{value}{suffix}</>}</span>
      </div>
      <div style={{height:9, background:"var(--border)", borderRadius:5, overflow:"hidden"}}>
        <div className="bar-grow" style={{width:`${pct}%`, height:"100%", background:color, borderRadius:5, transition:"width .4s"}}/>
      </div>
    </div>
  );
}
