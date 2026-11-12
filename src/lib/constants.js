
export const SUBJECTS = ["Mathematics","Physics","Chemistry"];
export const DURATION_SEC = 180*60;
export const MARKS_CORRECT = 4, MARKS_WRONG = -1, MARKS_UNATTEMPTED = 0;
export const LS_KEY = "jee_cbt_active_v1";
export const LS_HISTORY = "jee_cbt_history_v1";

// ---------- status helpers ----------
export const STATUS = {
  NOT_VISITED: "not_visited",
  NOT_ANSWERED: "not_answered",
  ANSWERED: "answered",
  MARKED: "marked",
  ANSWERED_MARKED: "answered_marked",
};
export const STATUS_META = {
  not_visited:   {label:"Not Visited",            color:"var(--not-visited)"},
  not_answered:  {label:"Not Answered",           color:"var(--not-answered)"},
  answered:      {label:"Answered",                color:"var(--answered)"},
  marked:        {label:"Marked for Review",       color:"var(--marked)"},
  answered_marked:{label:"Answered & Marked",      color:"var(--answered-marked)"},
};

export function fmtTime(totalSec){
  totalSec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(totalSec/3600);
  const m = Math.floor((totalSec%3600)/60);
  const s = totalSec%60;
  return [h,m,s].map(x=>String(x).padStart(2,'0')).join(':');
}
// NTA's own CBT portal shows the remaining time as total minutes counting
// down (e.g. "179:32" for just under 180 minutes), not hours:minutes:seconds
// — used on the exam screen specifically to match that.
export function fmtTimeMin(totalSec){
  totalSec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(totalSec/60);
  const s = totalSec%60;
  return `${m}:${String(s).padStart(2,'0')}`;
}
// Shows a saved date/time string with the time as HH:MM AM/PM (no seconds), e.g.
// "13/10/2026, 22:33:34" or "10/13/2026, 10:33:34 PM" -> "... 10:33 PM".
export function fmtAttemptDate(str){
  if(!str) return str;
  const m = /(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp]\.?[Mm]\.?)?/.exec(str);
  if(!m) return str;
  let h = Number(m[1]); let ap = m[3];
  if(ap){ ap = ap.replace(/\./g,"").toUpperCase(); }
  else { ap = h>=12 ? "PM" : "AM"; h = h%12; if(h===0) h = 12; }
  return str.slice(0, m.index) + `${String(h).padStart(2,"0")}:${m[2]} ${ap}` + str.slice(m.index + m[0].length);
}
export function fmtMinSec(totalSec){
  totalSec = Math.max(0, Math.round(totalSec));
  const m = Math.floor(totalSec/60);
  const s = totalSec%60;
  return `${m}:${String(s).padStart(2,'0')}`;
}

