import React, {useEffect} from "react";

// ---------- Exam fullscreen helpers ----------
export function enterExamFullscreen(){
  try{
    const el = document.documentElement;
    if(!document.fullscreenElement && el.requestFullscreen){
      const p = el.requestFullscreen();
      if(p && p.catch) p.catch(()=>{});
      // Chrome / Edge: capture Esc (and F11) so a short press does not leave full screen during the exam.
      // (A long press of Esc is always reserved by the browser; that case is handled by the "return to full screen" screen.)
      if(p && p.then && navigator.keyboard && navigator.keyboard.lock){
        p.then(()=>{ try{ const k = navigator.keyboard.lock(["Escape","F11"]); if(k && k.catch) k.catch(()=>{}); }catch(e){} }).catch(()=>{});
      }
    }
  }catch(e){}
}
export function leaveExamFullscreen(){
  try{ if(navigator.keyboard && navigator.keyboard.unlock) navigator.keyboard.unlock(); }catch(e){}
  try{
    if(document.fullscreenElement && document.exitFullscreen){
      const p = document.exitFullscreen();
      if(p && p.catch) p.catch(()=>{});
    }
  }catch(e){}
}


export function FullscreenLostOverlay(){
  useEffect(()=>{
    const onKey = ()=>enterExamFullscreen();
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div style={{position:"fixed", inset:0, zIndex:200, background:"rgba(10,16,24,0.94)", display:"flex", alignItems:"center", justifyContent:"center", padding:20}}>
      <div className="card" style={{maxWidth:440, width:"100%", padding:"26px 28px", textAlign:"center"}}>
        <h3 style={{marginTop:0}}>Full screen is required during the exam</h3>
        <p style={{fontSize:14, color:"var(--text-dim)", lineHeight:1.6, margin:"0 0 18px"}}>
          You left full screen. The timer is still running. Click the button (or press any key) to continue in full screen. To leave the exam properly, use <b>Exit</b> or <b>Submit</b>.
        </p>
        <button className="btn btn-primary" onClick={enterExamFullscreen}>Return to full screen</button>
      </div>
    </div>
  );
}

