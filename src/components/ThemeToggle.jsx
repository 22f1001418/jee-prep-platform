import React, {useState} from "react";

// ---------- Theme (presentation only) ----------
export const LS_THEME = "jee_cbt_theme_v1";
export function getSavedTheme(){
  try{ return localStorage.getItem(LS_THEME)==="dark" ? "dark" : "light"; }catch(e){ return "light"; }
}
export function ThemeToggle(){
  const [theme, setTheme] = useState(getSavedTheme());
  function flip(){
    const next = theme==="dark" ? "light" : "dark";
    try{ localStorage.setItem(LS_THEME, next); }catch(e){}
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
  }
  return (
    <button className="btn" onClick={flip} title="Switch light / dark mode"
      style={{position:"absolute", top:16, right:16, padding:"7px 14px", fontSize:13, borderRadius:20}}>
      {theme==="dark" ? "\u2600\uFE0F Light mode" : "\uD83C\uDF19 Dark mode"}
    </button>
  );
}

