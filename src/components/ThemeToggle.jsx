import React, {useEffect, useState} from "react";
import {flushSync} from "react-dom";
import {reducedMotion} from "./motion";
import {Icon} from "./icons";

// ---------- Theme (presentation only) ----------
export const LS_THEME = "jee_cbt_theme_v1";
export function getSavedTheme(){
  try{ return localStorage.getItem(LS_THEME)==="dark" ? "dark" : "light"; }catch(e){ return "light"; }
}
// Switches the theme. Where the browser supports it, the new theme spreads out as a circle from (x, y):
// the place that was clicked, or the middle of the window.
export function toggleTheme(x, y){
  const next = getSavedTheme()==="dark" ? "light" : "dark";
  const apply = ()=>{
    try{ localStorage.setItem(LS_THEME, next); }catch(e){}
    document.documentElement.setAttribute("data-theme", next);
    flushSync(()=>window.dispatchEvent(new CustomEvent("jee-theme", {detail:next})));
  };
  if(!document.startViewTransition || reducedMotion()){ apply(); return; }
  const cx = x ?? window.innerWidth / 2, cy = y ?? window.innerHeight / 2;
  const r = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy));
  document.documentElement.classList.add("theme-switching");
  const t = document.startViewTransition(apply);
  t.ready.then(()=>document.documentElement.animate(
    {clipPath:[`circle(0px at ${cx}px ${cy}px)`, `circle(${r}px at ${cx}px ${cy}px)`]},
    {duration:560, easing:"cubic-bezier(.2,.7,.2,1)", pseudoElement:"::view-transition-new(root)"})).catch(()=>{});
  t.finished.finally(()=>document.documentElement.classList.remove("theme-switching"));
}
export function ThemeToggle({inline}){
  const [theme, setTheme] = useState(getSavedTheme());
  useEffect(()=>{
    const on = e=>setTheme(e.detail);
    window.addEventListener("jee-theme", on);
    return ()=>window.removeEventListener("jee-theme", on);
  }, []);
  function flip(e){ toggleTheme(e && e.clientX, e && e.clientY); }
  return (
    <button className="btn" onClick={flip} title="Switch light / dark mode"
      style={inline ? {width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"8px 12px", fontSize:13}
                    : {position:"absolute", top:16, right:16, padding:"7px 14px", fontSize:13, borderRadius:20}}>
      {inline && <Icon name={theme==="dark" ? "sun" : "moon"} size={16}/>}
      {!inline && <Icon name={theme==="dark" ? "sun" : "moon"} size={15}/>}{theme==="dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
