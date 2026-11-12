import React from "react";
import {STATUS, STATUS_META} from "../lib/constants";

// ---------- Palette dot ----------
// Every status renders as the same rounded-square "pill" shape in the real
// NTA palette (not square-vs-circle) — only the color changes, with a small
// green dot in the corner for "answered + marked for review".
// ---------- JEE-CBT style status shapes (presentation only) ----------
// Answered = green, point up · Not Answered = red, point down ·
// Not Visited = plain grey box · Marked = purple circle ·
// Answered & Marked = purple circle with a green tick.
export const CBT = {
  green:"#5fae2e", greenDk:"#4a8f22",
  red:"#e0481d", redDk:"#b9380f",
  purple:"#5d3f9d", purpleDk:"#46307c",
  grey:"#f1f1f1", greyLine:"#b3b3b3",
};
export function StatusShape({status, children, w=36, h=32}){
  const S = STATUS;
  let shape, ty = 16, fill = "#fff";
  if(status === S.ANSWERED){
    shape = <path d="M16.5 1.2 Q18 .2 19.5 1.2 L33.5 9 Q35 10 35 12 V29 Q35 31 33 31 H3 Q1 31 1 29 V12 Q1 10 2.5 9 Z" fill={CBT.green} stroke={CBT.greenDk} strokeWidth="1"/>;
    ty = 19;
  } else if(status === S.NOT_ANSWERED){
    shape = <path d="M3 1 H33 Q35 1 35 3 V20 Q35 22 33.5 23 L19.5 30.8 Q18 31.6 16.5 30.8 L2.5 23 Q1 22 1 20 V3 Q1 1 3 1 Z" fill={CBT.red} stroke={CBT.redDk} strokeWidth="1"/>;
    ty = 13;
  } else if(status === S.MARKED){
    shape = <circle cx="18" cy="16" r="15" fill={CBT.purple} stroke={CBT.purpleDk} strokeWidth="1"/>;
  } else if(status === S.ANSWERED_MARKED){
    shape = <g>
      <circle cx="18" cy="16" r="15" fill={CBT.purple} stroke={CBT.purpleDk} strokeWidth="1"/>
      <circle cx="29" cy="26" r="5.5" fill={CBT.green} stroke="#fff" strokeWidth="1.3"/>
      <polyline points="26.4,26 28.5,28 31.8,24.2" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </g>;
  } else {
    shape = <rect x="1" y="1" width="34" height="30" rx="3" fill={CBT.grey} stroke={CBT.greyLine} strokeWidth="1"/>;
    fill = "#222";
  }
  return (
    <svg width={w} height={h} viewBox="0 0 36 32" style={{display:"block", overflow:"visible"}} aria-hidden="true">
      {shape}
      {children!==undefined && children!==null && (
        <text x="18" y={ty} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="700" fontFamily="Arial, Helvetica, sans-serif" fill={fill}>{children}</text>
      )}
    </svg>
  );
}

export function PaletteBtn({q, status, isCurrent, onClick}){
  const meta = STATUS_META[status];
  return (
    <button onClick={onClick} title={`Q${q} — ${meta.label}`}
      style={{
        background:"transparent", border:"none", padding:0, margin:0, cursor:"pointer",
        borderRadius:5, lineHeight:0,
        outline: isCurrent ? "2px solid #1b6ec2" : "none", outlineOffset:2,
      }}>
      <StatusShape status={status}>{q}</StatusShape>
    </button>
  );
}

export function Legend({counts}){
  const c = counts || {};
  const S = STATUS;
  const Item = ({status, label, n}) => (
    <div style={{display:"flex", alignItems:"center", gap:8}}>
      <StatusShape status={status} w={30} h={27}>{n}</StatusShape>
      <span style={{fontSize:11, lineHeight:1.25, color:"#222"}}>{label}</span>
    </div>
  );
  return (
    <div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px 8px"}}>
        <Item status={S.ANSWERED} label="Answered" n={c[S.ANSWERED]||0}/>
        <Item status={S.NOT_ANSWERED} label="Not Answered" n={c[S.NOT_ANSWERED]||0}/>
        <Item status={S.NOT_VISITED} label="Not Visited" n={c[S.NOT_VISITED]||0}/>
        <Item status={S.MARKED} label="Marked for review" n={c[S.MARKED]||0}/>
      </div>
      <div style={{marginTop:12}}>
        <Item status={S.ANSWERED_MARKED} label={<>Answered and Marked for Review<br/>(will also be evaluated)</>} n={c[S.ANSWERED_MARKED]||0}/>
      </div>
    </div>
  );
}

export function InfoDot({color="#fff", bg="#2f7fc4", size=15}){
  return <span aria-hidden="true" style={{display:"inline-flex", alignItems:"center", justifyContent:"center", width:size, height:size, borderRadius:"50%", background:bg, color, fontSize:size*0.72, fontWeight:700, fontStyle:"normal", fontFamily:"Georgia, serif", lineHeight:1, flexShrink:0}}>i</span>;
}
export function HeaderChip({color, icon, label}){
  return (
    <span style={{display:"inline-flex", alignItems:"center", gap:6, fontSize:11.5, color:"#fff", cursor:"default", whiteSpace:"nowrap"}}>
      <span aria-hidden="true" style={{width:15, height:15, borderRadius:"50%", background:color, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:9.5, fontWeight:700, fontFamily:"Georgia, serif"}}>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

