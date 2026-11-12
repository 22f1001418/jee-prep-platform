import React, {useEffect, useRef, useState} from "react";

// ---------- Motion helpers (presentation only). Everything here stands still when the system asks for reduced motion. ----------
export const reducedMotion = ()=>{ try{ return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }catch(e){ return false; } };

// A number that counts up to its value (and glides to the new one when the value changes).
export function CountUp({value, duration = 900, format, delay = 0}){
  const target = Number(value) || 0;
  const [shown, setShown] = useState(()=>reducedMotion() ? target : 0);
  const from = useRef(reducedMotion() ? target : 0);
  useEffect(()=>{
    if(reducedMotion()){ from.current = target; setShown(target); return; }
    const start = from.current, t0 = performance.now() + delay; let raf;
    const step = now=>{
      const k = Math.max(0, Math.min(1, (now - t0) / duration)), e = 1 - Math.pow(1 - k, 3);
      const v = start + (target - start) * e;
      from.current = v; setShown(v);
      if(k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return ()=>cancelAnimationFrame(raf);
  }, [target, duration, delay]);
  const done = Math.abs(shown - target) < 1e-9;
  return <>{format ? format(done ? target : shown) : Math.round(shown)}</>;
}

// One listener for the whole app: the card under the pointer learns where the pointer is (--mx / --my),
// and the stylesheet draws a soft light on its border there.
export function usePointerGlow(){
  useEffect(()=>{
    if(reducedMotion() || !window.matchMedia("(hover: hover)").matches) return;
    let raf = 0, last = null;
    const onMove = e=>{
      last = e;
      if(raf) return;
      raf = requestAnimationFrame(()=>{
        raf = 0;
        const el = last.target && last.target.closest && last.target.closest(".card, .mile");
        if(!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (last.clientX - r.left) + "px");
        el.style.setProperty("--my", (last.clientY - r.top) + "px");
      });
    };
    document.addEventListener("pointermove", onMove, {passive:true});
    return ()=>{ document.removeEventListener("pointermove", onMove); if(raf) cancelAnimationFrame(raf); };
  }, []);
}
