import React, {useEffect, useRef, useState} from "react";
import {loadScratchItem, saveScratchItem} from "../lib/scratch";

const W = 340, H = 230;

// Rough work for the question on screen: draw with a mouse, finger or pen, or type. Kept per question for the running test.
// The panel is marked data-no-exam-keys so typing here never triggers the exam's Enter / arrow shortcuts.
export function ScratchPad({examId, qn, onClose}){
  const [mode, setMode] = useState("draw");
  const [tool, setTool] = useState("pen");
  const [text, setText] = useState("");
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const dpr = typeof window!=="undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;

  function ctx(){ const c = canvasRef.current; return c ? c.getContext("2d") : null; }
  function blank(){ const c = canvasRef.current; if(!c) return; const g = c.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.scale(dpr, dpr); }

  // load this question's rough work
  useEffect(()=>{
    blank();
    const item = loadScratchItem(examId, qn);
    setText(item.text || "");
    if(item.img){
      const im = new Image();
      im.onload = ()=>{ const g = ctx(); if(g) g.drawImage(im, 0, 0, W, H); };
      im.src = item.img;
    }
    // eslint-disable-next-line
  }, [examId, qn]);

  const pos = e => { const r = canvasRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)]; };
  function down(e){
    e.preventDefault(); canvasRef.current.setPointerCapture(e.pointerId);
    drawing.current = true; last.current = pos(e);
    stroke(last.current, last.current);
  }
  function move(e){ if(!drawing.current) return; const p = pos(e); stroke(last.current, p); last.current = p; }
  function stroke(a, b){
    const g = ctx(); if(!g) return;
    g.globalCompositeOperation = tool==="eraser" ? "destination-out" : "source-over";
    g.strokeStyle = "#16202e"; g.lineWidth = tool==="eraser" ? 16 : 2.2; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0] + 0.01, b[1] + 0.01); g.stroke();
  }
  function up(){
    if(!drawing.current) return;
    drawing.current = false;
    saveScratchItem(examId, qn, {img: canvasRef.current.toDataURL("image/png")});
  }
  function clearAll(){ blank(); setText(""); saveScratchItem(examId, qn, {img:null, text:""}); }

  const tab = (id, label) => (
    <button type="button" onClick={()=>setMode(id)} aria-pressed={mode===id}
      style={{cursor:"pointer", fontFamily:"inherit", fontSize:12.5, fontWeight:600, padding:"4px 11px", borderRadius:6, border:"1px solid #b8c2cc", background: mode===id ? "#0f2a4a" : "#fff", color: mode===id ? "#fff" : "#1a2332"}}>{label}</button>
  );
  return (
    <div data-no-exam-keys role="dialog" aria-label={`Rough work for question ${qn}`}
      style={{position:"fixed", right:16, bottom:84, width:W + 24, zIndex:60, background:"#fff", color:"#1a2332", border:"1px solid #b8c2cc", borderRadius:10, boxShadow:"0 8px 30px rgba(0,0,0,.25)", padding:12}}>
      <div style={{display:"flex", alignItems:"center", gap:6, marginBottom:8}}>
        <strong style={{fontSize:13, marginRight:"auto"}}>Rough work · Q{qn}</strong>
        {tab("draw", "Draw")}{tab("type", "Type")}
        <button type="button" onClick={onClose} aria-label="Close rough work" style={{cursor:"pointer", border:0, background:"transparent", fontSize:18, lineHeight:1, color:"#5b6b7c"}}>×</button>
      </div>
      <div style={{display: mode==="draw" ? "block" : "none"}}>
        <canvas ref={canvasRef} width={W * dpr} height={H * dpr}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
          style={{width:W, height:H, touchAction:"none", cursor:"crosshair", border:"1px solid #d7dce2", borderRadius:6, background:"repeating-linear-gradient(#fff, #fff 23px, #eef1f5 24px)", display:"block", maxWidth:"100%"}}/>
        <div style={{display:"flex", gap:6, marginTop:8}}>
          <button type="button" className="btn" aria-pressed={tool==="pen"} onClick={()=>setTool("pen")} style={{padding:"3px 10px", fontSize:12.5, ...(tool==="pen" ? {background:"#0f2a4a", color:"#fff"} : null)}}>Pen</button>
          <button type="button" className="btn" aria-pressed={tool==="eraser"} onClick={()=>setTool("eraser")} style={{padding:"3px 10px", fontSize:12.5, ...(tool==="eraser" ? {background:"#0f2a4a", color:"#fff"} : null)}}>Eraser</button>
          <button type="button" className="btn" onClick={clearAll} style={{padding:"3px 10px", fontSize:12.5, marginLeft:"auto"}}>Clear</button>
        </div>
      </div>
      {mode==="type" && (
        <div>
          <textarea value={text} placeholder="Type your working here" aria-label="Typed rough work"
            onChange={e=>{ setText(e.target.value); saveScratchItem(examId, qn, {text:e.target.value}); }}
            style={{width:"100%", height:H, boxSizing:"border-box", resize:"none", padding:8, fontFamily:"ui-monospace, Menlo, monospace", fontSize:13.5, border:"1px solid #d7dce2", borderRadius:6, background:"#fff", color:"#1a2332"}}/>
          <div style={{display:"flex", marginTop:8}}><button type="button" className="btn" onClick={clearAll} style={{padding:"3px 10px", fontSize:12.5, marginLeft:"auto"}}>Clear</button></div>
        </div>
      )}
    </div>
  );
}
