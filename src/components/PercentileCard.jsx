import React, {useState} from "react";
import {CountUp} from "./motion";
import {SOURCES, basisText, estimatePercentile, fmtPct, fmtRank, hasShiftTable} from "../lib/percentile";
import {useLivePercentile} from "../lib/useLivePercentile";

// Estimated percentile for a score in one paper. Always labelled as an estimate, with its basis and sources.
export function PercentileCard({paperId, score, compact}){
  const [open, setOpen] = useState(false);
  const status = useLivePercentile(paperId);
  const est = estimatePercentile(paperId, score);
  const isLive = est.basis==="live" || est.basis==="live-general";
  const fetched = est.fetchedAt ? new Date(est.fetchedAt).toLocaleDateString("en-IN", {day:"numeric", month:"short", year:"numeric"}) : "";
  const shift = hasShiftTable(paperId);
  return (
    <div className="card" style={{padding: compact ? "12px 16px" : "16px 20px", borderLeft:"4px solid var(--gold)"}}>
      <div style={{display:"flex", gap:18, alignItems:"center", flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:11.5, fontWeight:800, letterSpacing:".07em", color:"var(--text-faint)"}}>{isLive ? "PERCENTILE FOR THIS EXAM" : "ESTIMATED PERCENTILE"}</div>
          <div style={{fontSize:30, fontWeight:800, lineHeight:1.1}}>≈ <CountUp value={est.pct} duration={1500} format={fmtPct}/></div>
        </div>
        <div style={{flex:"1 1 220px", fontSize:13.5, color:"var(--text-dim)", lineHeight:1.5}}>
          Likely between <strong style={{color:"var(--text)"}}>{fmtPct(est.lo)}</strong> and <strong style={{color:"var(--text)"}}>{fmtPct(est.hi)}</strong>
          {" "}· all-India rank roughly <strong style={{color:"var(--text)"}}>{fmtRank(est.rank)}</strong>.
          <div style={{fontSize:12, color:"var(--text-faint)", marginTop:2}}>
            {isLive
              ? <>Read live from {est.sources.length} site{est.sources.length===1 ? "" : "s"}{fetched ? ` on ${fetched}` : ""}; not NTA data.</>
              : <>An estimate, not NTA data. {status==="loading" ? "Checking the live tables..." : status==="fallback" ? "Could not reach the live tables, so this is the built-in estimate." : shift ? "Uses this shift's table." : "No table for this shift, so it uses a general curve."}</>}
            {" "}<button type="button" onClick={()=>setOpen(o=>!o)} style={{background:"none", border:0, padding:0, color:"var(--navy)", textDecoration:"underline", cursor:"pointer", font:"inherit"}}>{open ? "Hide details" : "How?"}</button>
          </div>
        </div>
      </div>
      {open && (
        <div style={{fontSize:12.5, color:"var(--text-dim)", lineHeight:1.6, marginTop:10, paddingTop:10, borderTop:"1px dashed var(--border-dark)"}}>
          NTA converts marks to a percentile <em>within each shift</em>, so the same marks can give different percentiles on an easy and a hard day. This estimate is based on {basisText(est.basis)}.
          The range shows how much it moves if the paper was about {est.spread} marks easier or harder than the table assumes{isLive && est.sources.length>1 ? ", and it also covers the sites disagreeing with each other" : ""}.
          The rank assumes roughly {(1475000 / 100000).toFixed(1)} lakh candidates.
          {isLive ? (
            <div style={{marginTop:8}}>
              <div style={{fontWeight:700, color:"var(--text)", marginBottom:2}}>What each site gives for {score} marks</div>
              {est.sources.map(x=>(
                <div key={x.id} style={{display:"flex", gap:10, justifyContent:"space-between"}}>
                  <a href={x.url} target="_blank" rel="noreferrer">{x.label}</a><strong style={{color:"var(--text)"}}>{fmtPct(x.pct)}</strong>
                </div>
              ))}
              <div style={{marginTop:4}}>{est.sources.length>1 ? "The headline number is the middle of these. " : ""}Published tables are the sites' own estimates and they can differ by 20+ marks for the same percentile, so treat this as a guide. The official figure is on your NTA score card.</div>
            </div>
          ) : (
            <> Sources:{" "}
              <a href={SOURCES.general.url} target="_blank" rel="noreferrer">{SOURCES.general.label}</a>
              {shift && <>; <a href={SOURCES.shift.url} target="_blank" rel="noreferrer">{SOURCES.shift.label}</a></>}.
              {" "}Compare with the official result when it is published.</>
          )}
        </div>
      )}
    </div>
  );
}
