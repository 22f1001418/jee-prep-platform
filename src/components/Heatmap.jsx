import React, {useEffect, useMemo, useRef} from "react";
import {activityCounts, activityDays, dayNumber, longestStreak} from "../lib/activity";
import {CountUp} from "./motion";

const DAY = 86400000;
// Questions answered per day for the last `weeks` weeks, one column per week (Monday on top), newest on the right.
export function Heatmap({weeks = 26}){
  const scroller = useRef(null);
  useEffect(()=>{ const el = scroller.current; if(el) el.scrollLeft = el.scrollWidth; }, []);   // on a narrow screen, start at this week
  const data = useMemo(()=>{
    const counts = activityCounts(), now = Date.now(), today = dayNumber(now);
    const dow = (new Date(now).getDay() + 6) % 7;                 // 0 = Monday
    const first = today - dow - (weeks - 1) * 7;
    const cols = []; let total = 0, active = 0, best = 0;
    for(let w = 0; w < weeks; w++){
      const col = [];
      for(let d = 0; d < 7; d++){
        const day = first + w * 7 + d, n = day > today ? null : (counts.get(day) || 0);
        if(n){ total += n; active++; best = Math.max(best, n); }
        col.push({day, n, date: new Date(now - (today - day) * DAY)});
      }
      cols.push(col);
    }
    return {cols, total, active, best, longest: longestStreak(activityDays())};
  }, [weeks]);
  const level = n => n===null ? -1 : n===0 ? 0 : n < 10 ? 1 : n < 25 ? 2 : n < 50 ? 3 : 4;
  const fmt = d => d.toLocaleDateString(undefined, {weekday:"short", day:"numeric", month:"short"});
  const months = data.cols.map((col, i)=>{ const m = col[0].date.getMonth(); return i===0 || m !== data.cols[i - 1][0].date.getMonth() ? col[0].date.toLocaleDateString(undefined, {month:"short"}) : ""; });
  return (
    <div className="heat-wrap">
      <div className="heat-main">
      <div className="heat" ref={scroller} role="img" aria-label={`${data.total} questions answered on ${data.active} days in the last ${weeks} weeks`}>
        {data.cols.map((col, i)=>(
          <div key={i} className="heat-col" style={{animationDelay:`${i * 28}ms`}}>
            <div className="heat-month">{months[i]}</div>
            {col.map(c=>(
              <div key={c.day} className={"heat-cell l" + level(c.n)} data-tip={c.n===null ? undefined : `${c.n ? c.n + " question" + (c.n===1 ? "" : "s") : "Nothing"} · ${fmt(c.date)}`}/>
            ))}
          </div>
        ))}
      </div>
      <div style={{display:"flex", alignItems:"center", gap:5, justifyContent:"flex-end", fontSize:11.5, color:"var(--text-faint)", marginTop:8}}>
        Less {[0, 1, 2, 3, 4].map(l=><span key={l} className={"heat-cell l" + l} style={{width:11, height:11}}/>)} More
      </div>
      </div>
      <div className="heat-stats">
        {[["questions answered", data.total], ["active days", data.active], ["best day", data.best], ["longest streak", data.longest]].map(([label, n], i)=>(
          <div key={label} className="heat-stat">
            <div className="num"><CountUp value={n} duration={900} delay={i * 120}/></div>
            <div>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
