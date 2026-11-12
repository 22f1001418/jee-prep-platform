import React, {useEffect, useRef} from "react";
import {FIG_IMAGES} from "../lib/data";

// ---------- MathJax rendering ----------
// Serialize all typeset calls through one queue, and always wait for
// MathJax's own startup promise first (it may not have finished
// initializing yet when the first questions mount).
export let mathJaxQueue = (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise) || Promise.resolve();

export function typesetNode(node){
  mathJaxQueue = mathJaxQueue.then(()=>{
    if(window.MathJax && window.MathJax.typesetPromise && node && document.body.contains(node)){
      return window.MathJax.typesetPromise([node]).catch(err=>{
        console.error("MathJax typeset error:", err);
      });
    }
  });
  return mathJaxQueue;
}

export function TeX({children, block}){
  const ref = useRef(null);
  useEffect(()=>{
    if(!ref.current) return;
    typesetNode(ref.current);
  }, [children]);
  // Render text, converting \n to <br>, and leaving $...$ for MathJax.
  // Escape HTML first so stray <, > in text don't break markup, then
  // restore the literal backslashes MathJax needs for \frac, \dfrac, etc.
  const html = (children||"").split("\n").map(line=>escapeHtml(line)).join("<br/>")
    .replace(/\[\[img:(\w+)\]\]/g, (m,id)=>{
      const f = FIG_IMAGES[id];
      return f ? `<img src="${f.uri}" alt="figure" width="${f.w}" style="max-width:100%;height:auto;vertical-align:middle"/>` : "";
    });
  return <span ref={ref} style={{fontFamily:"Arial, Helvetica, sans-serif"}} dangerouslySetInnerHTML={{__html: html}}/>;
}
export function escapeHtml(s){
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

