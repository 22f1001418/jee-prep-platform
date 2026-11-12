import React, {useEffect, useState} from "react";

// ---------- JEE countdown ----------
// Next 22 January (local time) strictly after "now"; rolls to the following year automatically once it passes.
export function getNextExamDate(nowMs){
  let y = new Date(nowMs).getFullYear();
  let d = new Date(y, 0, 22, 0, 0, 0);
  if(d.getTime() <= nowMs) d = new Date(y + 1, 0, 22, 0, 0, 0);
  return d;
}
export function ExamCountdown(){
  const [now, setNow] = useState(Date.now());
  useEffect(()=>{
    const id = setInterval(()=>setNow(Date.now()), 1000);
    return ()=>clearInterval(id);
  }, []);
  const examDate = getNextExamDate(now);
  const examYear = examDate.getFullYear();
  const diff = Math.max(0, Math.floor((examDate.getTime() - now)/1000));
  const d = Math.floor(diff/86400), h = Math.floor((diff%86400)/3600), m = Math.floor((diff%3600)/60), sec = diff%60;
  const p2 = n => String(n).padStart(2,"0");
  const units = [{v:String(d), l:"Days"}, {v:p2(h), l:"Hours"}, {v:p2(m), l:"Min"}, {v:p2(sec), l:"Sec", accent:true}];
  return (
    <div className="jee-cd" title={"Time left until 22 January " + examYear}>
      <div className="jee-cd-head">
        <span className="jee-cd-dot"/>
        <span className="jee-cd-title">JEE Main {examYear}</span>
        <span className="jee-cd-date">22 Jan {examYear}</span>
      </div>
      <div className="jee-cd-row">
        {units.map(u=>(
          <div key={u.l} className={"jee-cd-box"+(u.accent?" acc":"")}>
            <div className="jee-cd-num">{u.v}</div>
            <div className="jee-cd-lbl">{u.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
