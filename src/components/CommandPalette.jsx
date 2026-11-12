import React, {useEffect, useMemo, useRef, useState} from "react";
import {Icon, SUBJECT_ICON} from "./icons";
import {PAPER_REGISTRY} from "../lib/papers";
import {universeFacets} from "../lib/practice";

// Quick search (Ctrl/Cmd + K, or "/"): jump to a screen, start any paper, practise any chapter.
// items the caller passes in come first: [{id, icon, title, hint, run}]
export function CommandPalette({onClose, actions, onStartPaper, onPracticeChapter}){
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const listRef = useRef(null);

  const all = useMemo(()=>{
    const items = actions.map(a=>({...a, group:"Go to", key:(a.title + " " + (a.words || "")).toLowerCase()}));
    PAPER_REGISTRY.forEach(p=>items.push({id:"p:" + p.id, icon:"tests", title:p.name, hint:"Start mock test", group:"Mock tests",
      key:(p.name + " " + p.id + " mock test paper").toLowerCase(), run:()=>onStartPaper(p.id)}));
    const ch = universeFacets().chapters;
    Object.keys(ch).forEach(s=>Object.keys(ch[s]).sort().forEach(c=>items.push({id:"c:" + s + c, icon:SUBJECT_ICON[s] || "practice", title:c, hint:`Practise · ${s} · ${ch[s][c]} questions`, group:"Chapters",
      key:(c + " " + s + " practise practice chapter").toLowerCase(), run:()=>onPracticeChapter(s, c)})));
    return items;
  }, [actions, onStartPaper, onPracticeChapter]);

  const results = useMemo(()=>{
    const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if(!words.length) return all.filter(i=>i.group==="Go to").concat(all.filter(i=>i.group==="Mock tests").slice(0, 3));
    return all.map(i=>{
      if(!words.every(w=>i.key.includes(w))) return null;
      const t = i.title.toLowerCase();
      const score = (t.startsWith(words[0]) ? 0 : t.includes(words[0]) ? 1 : 2) + (i.group==="Go to" ? 0 : i.group==="Chapters" ? .3 : .6);
      return {i, score};
    }).filter(Boolean).sort((a, b)=>a.score - b.score).slice(0, 12).map(x=>x.i);
  }, [q, all]);

  useEffect(()=>{ setSel(0); }, [q]);
  useEffect(()=>{
    const el = listRef.current && listRef.current.querySelector(".cmd-item.on");
    if(el && el.scrollIntoView) el.scrollIntoView({block:"nearest"});
  }, [sel, results]);

  const run = it => { if(!it) return; onClose(); it.run(); };
  const onKey = e => {
    if(e.key==="Escape"){ e.preventDefault(); onClose(); }
    else if(e.key==="ArrowDown"){ e.preventDefault(); setSel(s=>Math.min(results.length - 1, s + 1)); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); setSel(s=>Math.max(0, s - 1)); }
    else if(e.key==="Enter"){ e.preventDefault(); run(results[sel]); }
  };
  let lastGroup = null;
  return (
    <div className="cmd-backdrop" onMouseDown={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="cmd" role="dialog" aria-modal="true" aria-label="Quick search">
        <div className="cmd-input">
          <Icon name="search" size={19}/>
          <input autoFocus type="text" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={onKey} placeholder="Search papers, chapters, screens…" aria-label="Search" spellCheck={false}/>
          <kbd>esc</kbd>
        </div>
        <div className="cmd-list" ref={listRef}>
          {results.length===0 && <div className="cmd-empty">Nothing matches "{q}".</div>}
          {results.map((it, i)=>{
            const head = it.group !== lastGroup ? <div key={"g" + it.group} className="cmd-group">{it.group}</div> : null;
            lastGroup = it.group;
            return (
              <React.Fragment key={it.id}>
                {head}
                <button type="button" className={"cmd-item" + (i===sel ? " on" : "")} onMouseMove={()=>setSel(i)} onClick={()=>run(it)}>
                  <span className="cmd-ico"><Icon name={it.icon} size={17}/></span>
                  <span className="cmd-title">{it.title}</span>
                  {it.hint && <span className="cmd-hint">{it.hint}</span>}
                  <Icon name="arrow-right" size={14} className="cmd-go"/>
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="cmd-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span style={{marginLeft:"auto"}}>{all.length} things to find</span></div>
      </div>
    </div>
  );
}
