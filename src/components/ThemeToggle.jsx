import React, {useState} from "react";
import {Icon} from "./icons";

// ---------- Theme (presentation only) ----------
export const LS_THEME = "jee_cbt_theme_v1";
export function getSavedTheme(){
  try{ return localStorage.getItem(LS_THEME)==="dark" ? "dark" : "light"; }catch(e){ return "light"; }
}
export function ThemeToggle({inline}){
  const [theme, setTheme] = useState(getSavedTheme());
  function flip(){
    const next = theme==="dark" ? "light" : "dark";
    try{ localStorage.setItem(LS_THEME, next); }catch(e){}
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
  }
  return (
    <button className="btn" onClick={flip} title="Switch light / dark mode"
      style={inline ? {width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"8px 12px", fontSize:13}
                    : {position:"absolute", top:16, right:16, padding:"7px 14px", fontSize:13, borderRadius:20}}>
      {inline && <Icon name={theme==="dark" ? "sun" : "moon"} size={16}/>}
      {!inline && <Icon name={theme==="dark" ? "sun" : "moon"} size={15}/>}{theme==="dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
