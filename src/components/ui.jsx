import React, {useEffect, useRef, useState} from "react";
import {Icon, SUBJECT_ICON} from "./icons";
import {CountUp} from "./motion";

export const SUBJECT_COLOR = {Mathematics:"#3b6fe0", Physics:"#e5892b", Chemistry:"#22a063"};

// Consistent page title block: icon tile, title, subtitle, and right-aligned actions.
export function PageHeader({icon, title, subtitle, actions}){
  return (
    <div className="page-head">
      {icon && <span className="icon-tile"><Icon name={icon} size={22}/></span>}
      <div style={{minWidth:0}}>
        <h1 style={{margin:0, fontSize:26}}>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </div>
  );
}

export function EmptyState({icon = "sparkles", title, children, action}){
  return (
    <div className="card empty">
      <span className="icon-tile"><Icon name={icon} size={22}/></span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

// Circular progress. value/max -> arc; children render in the middle.
export function Ring({value, max = 100, size = 96, stroke = 9, color = "var(--brand)", track = "var(--border)", children, label}){
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  // starts empty and sweeps to its value (the stylesheet animates stroke-dashoffset)
  const [drawn, setDrawn] = useState(false);
  useEffect(()=>{ const id = requestAnimationFrame(()=>requestAnimationFrame(()=>setDrawn(true))); return ()=>cancelAnimationFrame(id); }, []);
  return (
    <div className={"ring" + (pct >= 1 ? " ring-full" : "")} style={{position:"relative", width:size, height:size, flexShrink:0, color}} role="img" aria-label={label || `${Math.round(pct * 100)} percent`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke}/>
        <circle className="ring-fg" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - (drawn ? pct : 0))}/>
      </svg>
      <div style={{position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center"}}>{children}</div>
    </div>
  );
}

// Small area chart for a list of numbers (oldest first).
export function Sparkline({values, height = 64, max, color = "var(--brand)", labels = []}){
  const box = useRef(null);
  const [hover, setHover] = useState(null);      // index of the point under the pointer
  if(!values || values.length < 2) return null;
  const W = 240, H = height, pad = 6;
  const top = max ?? Math.max(...values, 1), lo = Math.min(0, ...values);
  const x = i => pad + i * (W - 2 * pad) / (values.length - 1);
  const y = v => H - pad - ((v - lo) / Math.max(1, top - lo)) * (H - 2 * pad);
  const pts = values.map((v, i) => [x(i), y(v)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${x(values.length - 1)} ${H} L${x(0)} ${H} Z`;
  const id = "spark" + Math.abs(values.reduce((a, v) => a * 31 + Math.round(v * 10), 7)) % 100000;
  const pick = e => {
    const r = box.current.getBoundingClientRect(); if(!r.width) return;
    const fx = (e.clientX - r.left) / r.width * W;
    let best = 0; pts.forEach((p, i) => { if(Math.abs(p[0] - fx) < Math.abs(pts[best][0] - fx)) best = i; });
    setHover(best);
  };
  return (
    <div ref={box} className="spark" style={{position:"relative"}} onPointerMove={pick} onPointerDown={pick} onPointerLeave={()=>setHover(null)}>
    <svg className="spark-svg" viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label={`Trend: ${values.join(", ")}`} style={{display:"block", overflow:"visible"}}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".28"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <path d={area} fill={`url(#${id})`}/>
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
      {hover!==null && <line x1={pts[hover][0]} x2={pts[hover][0]} y1={0} y2={H} stroke={color} strokeOpacity=".35" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke"/>}
    </svg>
    {pts.map((p, i) => (
      <span key={i} className={"spark-dot" + (i === pts.length - 1 ? " last" : "") + (hover === i ? " on" : "")} style={{left:`${p[0] / W * 100}%`, top:p[1], borderColor:color, background: i === pts.length - 1 || hover === i ? color : "var(--panel)", animationDelay:`${250 + i * 90}ms`}}/>
    ))}
    {hover!==null && (
      <div className="spark-tip" style={{left:`${pts[hover][0] / W * 100}%`, top:pts[hover][1], transform:`translate(${hover > pts.length / 2 ? "calc(-100% - 10px)" : "10px"}, -50%)`}}>{labels[hover] || values[hover]}</div>
    )}
    </div>
  );
}

// Subject icon in its own colour, in a soft tile.
export function SubjectBadge({subject, size = 34}){
  const c = SUBJECT_COLOR[subject] || "var(--brand)";
  return (
    <span style={{width:size, height:size, borderRadius:size * .3, display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0,
      background:`color-mix(in srgb, ${c} 14%, var(--panel))`, color:c, border:`1px solid color-mix(in srgb, ${c} 22%, var(--border))`}}>
      <Icon name={SUBJECT_ICON[subject] || "book"} size={Math.round(size * .55)}/>
    </span>
  );
}

// Number with a label, for stat rows.
export function Stat({icon, label, value, sub, tone}){
  const color = tone === "good" ? "var(--correct)" : tone === "bad" ? "var(--wrong)" : "var(--text)";
  return (
    <div className="card" style={{padding:"14px 16px", display:"flex", gap:12, alignItems:"center", minWidth:0}}>
      {icon && <span className="icon-tile sm"><Icon name={icon} size={17}/></span>}
      <div style={{minWidth:0}}>
        <div className="num" style={{fontSize:22, lineHeight:1.1, color}}>{typeof value === "number" ? <CountUp value={value}/> : value}</div>
        <div style={{fontSize:12.5, color:"var(--text-dim)", marginTop:2}}>{label}</div>
        {sub && <div style={{fontSize:11.5, color:"var(--text-faint)"}}>{sub}</div>}
      </div>
    </div>
  );
}
