import {store} from "./store";

// ---------- AI solutions ----------
// The browser never talks to Claude. It asks this app's own /api/explain endpoint (a server function that holds the API key),
// which streams the explanation back. Finished explanations are kept locally so each question is only ever paid for once.

export const LS_SOLUTIONS = "jee_cbt_solutions_v1";
export const LS_ACCESS = "jee_cbt_access_code_v1";   // kept in localStorage only (never in backups)
const MAX_SAVED = 400;

export class ExplainError extends Error{
  constructor(code, message){ super(message); this.code = code; }
}

// ---- access code (the passcode set as APP_ACCESS_CODE on the server)
export function getAccessCode(){ try{ return localStorage.getItem(LS_ACCESS) || ""; }catch(e){ return ""; } }
export function setAccessCode(v){ try{ if(v) localStorage.setItem(LS_ACCESS, v.trim()); else localStorage.removeItem(LS_ACCESS); }catch(e){ /* ignore */ } }

// ---- saved explanations: {"paperId:n": {text, keyCheck:{status, answer?}, model, at}}
function readAll(){
  try{ const o = JSON.parse(store.getItem(LS_SOLUTIONS) || "{}"); return o && typeof o==="object" && !Array.isArray(o) ? o : {}; }catch(e){ return {}; }
}
export function getSolution(key){ return readAll()[key] || null; }
export function saveSolution(key, rec){
  const all = readAll(); all[key] = rec;
  const keys = Object.keys(all);
  if(keys.length > MAX_SAVED) keys.sort((a, b) => (all[a].at || 0) - (all[b].at || 0)).slice(0, keys.length - MAX_SAVED).forEach(k => delete all[k]);
  try{ store.setItem(LS_SOLUTIONS, JSON.stringify(all)); return true; }catch(e){ return false; }
}
export function deleteSolution(key){
  const all = readAll(); if(!(key in all)) return;
  delete all[key];
  try{ store.setItem(LS_SOLUTIONS, JSON.stringify(all)); }catch(e){ /* ignore */ }
}

// Splits the model's closing "KEY-CHECK: ..." line from the explanation.
export function parseSolution(raw){
  const m = /\n?\s*KEY-CHECK:\s*(AGREES|DIFFERS)\s*([^\n]*)\s*$/i.exec(raw);
  if(!m) return {text: raw.trim(), keyCheck: {status:"unknown"}};
  const status = m[1].toUpperCase()==="AGREES" ? "agrees" : "differs";
  const answer = status==="differs" ? m[2].trim() : "";
  return {text: raw.slice(0, m.index).trim(), keyCheck: answer ? {status, answer} : {status}};
}

// ---- the request. onText(rawSoFar) is called as text arrives.
export async function fetchExplanation(paperId, n, {onText, signal, base = ""} = {}){
  let res;
  try{
    res = await fetch(base + "/api/explain", {
      method: "POST", signal,
      headers: {"content-type":"application/json", "x-access-code": getAccessCode()},
      body: JSON.stringify({paperId, n}),
    });
  }catch(e){
    if(e && e.name==="AbortError") throw e;
    throw new ExplainError("network", "Could not reach the explain service. Check your connection.");
  }
  if(!res.ok){
    let j = null; try{ j = await res.json(); }catch(e){ /* not JSON */ }
    if(!j) throw new ExplainError("unavailable", "The explain service is not available here. It runs on the deployed site (or with `vercel dev`).");
    throw new ExplainError(j.error || "http", j.message || `Request failed (${res.status}).`);
  }
  if(!/ndjson/i.test(res.headers.get("content-type") || "")) throw new ExplainError("unavailable", "The explain service is not available here. It runs on the deployed site (or with `vercel dev`).");
  const reader = res.body.getReader(), dec = new TextDecoder();
  let buf = "", raw = "", meta = null;
  const handle = line => {
    if(!line.trim()) return;
    let o; try{ o = JSON.parse(line); }catch(e){ return; }
    if(o.t){ raw += o.t; if(onText) onText(raw); }
    else if(o.error) throw new ExplainError(o.error, o.message || "The explanation failed.");
    else if(o.done) meta = o;
  };
  for(;;){
    const {value, done} = await reader.read();
    if(done) break;
    buf += dec.decode(value, {stream:true});
    let i; while((i = buf.indexOf("\n")) >= 0){ handle(buf.slice(0, i)); buf = buf.slice(i + 1); }
  }
  handle(buf);
  if(!meta) throw new ExplainError("incomplete", "The connection ended before the explanation was finished.");
  return {raw, model: meta.model || "", truncated: !!meta.truncated};
}
