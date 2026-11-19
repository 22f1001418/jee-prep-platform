// Papers the person added from an add-on file. Each one lives under its own key in the app's store
// ("jee_cbt_cpaper_v1:<paper id>" = {v:1, paper, figures}), so it is part of Backup / Append backup like everything else.
// They are put into the question bank at start-up (see main.jsx), before the paper registry is built.
import {FIG_IMAGES, RAW_PAPERS} from "./data";
import {validateAddon} from "./paperAddon";
import {store} from "./store";

export const LS_CUSTOM_PREFIX = "jee_cbt_cpaper_v1:";

function readEntry(key){
  try{
    const e = JSON.parse(store.getItem(key));
    return e && e.v === 1 && e.paper && Array.isArray(e.paper.questions) && typeof e.paper.id === "string" ? e : null;
  }catch(e){ return null; }
}
export function customPaperKeys(){ return store.keys().filter(k => k.startsWith(LS_CUSTOM_PREFIX)); }

// Called once at start-up, after the built-in bank is loaded. A damaged or clashing entry is skipped, never fatal.
export function loadCustomPapers(){
  const have = new Set(RAW_PAPERS.map(p => p.id));
  customPaperKeys().forEach(k => {
    const e = readEntry(k);
    if(!e || have.has(e.paper.id)){ console.warn("Skipped saved paper", k); return; }
    // re-checked on every start, so a bad entry (older version, hand-edited backup) cannot break the app
    const v = validateAddon({format:"jee-cbt-paper-addon-v1", paper:e.paper, figures:e.figures || {}}, {figureIds:Object.keys(FIG_IMAGES)});
    if(!v.paper){ console.warn("Skipped saved paper", k, v.errors[0]); return; }
    have.add(v.paper.id);
    RAW_PAPERS.push({...v.paper, custom:true});
    Object.keys(v.figures).forEach(id => { FIG_IMAGES[id] = v.figures[id]; });
  });
}

// Stores a validated paper. Returns {ok:true} or {ok:false, error}.
export async function saveCustomPaper(paper, figures){
  try{
    store.setItem(LS_CUSTOM_PREFIX + paper.id, JSON.stringify({v:1, addedAt:Date.now(), paper, figures}));
    await store.flushNow();
    if(!store.getItem(LS_CUSTOM_PREFIX + paper.id)) throw new Error("the browser did not keep it");
    return {ok:true};
  }catch(e){
    try{ store.removeItem(LS_CUSTOM_PREFIX + paper.id); }catch(e2){ /* ignore */ }
    return {ok:false, error:"Could not save the paper (browser storage is full or blocked): " + (e && e.message ? e.message : e)};
  }
}
export function removeCustomPaper(id){ store.removeItem(LS_CUSTOM_PREFIX + id); return store.flushNow(); }
