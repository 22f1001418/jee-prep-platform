// The sites we read, and which exams each one can answer for. Adding a source = adding a row here.
//   scope "shift":   the page has a table for individual shifts (the key is month-day-shift, e.g. "jan-22-1")
//   scope "session": one marks-band table for a whole session, used only when no shift table exists for that exam
export const SOURCES = [
  {id:"pw-2025", label:"Physics Wallah, shift-wise 2025", year:2025, scope:"shift", url:"https://www.pw.live/iit-jee/exams/shift-wise-jee-main-2025-marks-vs-percentile"},
  {id:"collegedunia-2024", label:"Collegedunia, shift-wise 2024", year:2024, scope:"shift", url:"https://collegedunia.com/articles/e-301-jee-main-2024-marks-vs-percentile-shift-wise"},
  {id:"careers360-2024", label:"Careers360, 2024 session 1 shift-wise", year:2024, scope:"shift", url:"https://news.careers360.com/jee-main-2024-session-1-check-score-vs-percentile-shift-wise-analysis/amp"},
  {id:"careers360-2026-jan", label:"Careers360, 2026 January shift-wise", year:2026, scope:"shift", url:"https://engineering.careers360.com/articles/jee-mains-2026-april-4-marks-vs-percentile"},
  {id:"careers360-2026-apr", label:"Careers360, 2026 April shift-wise", year:2026, scope:"shift", url:"https://engineering.careers360.com/articles/jee-main-2026-session-2-marks-vs-percentile-shift-wise-analysis"},
  {id:"competishun-2026", label:"Competishun, 2026 shift-wise", year:2026, scope:"shift", url:"https://competishun.com/jee-main-2026-final-cutoff-marks-vs-percentile-shift-wise-analysis/"},
  {id:"careers360-2021", label:"Careers360, March 2021 marks vs percentile", year:2021, scope:"session", url:"https://news.careers360.com/jee-main-march-2021-result-check-marks-vs-percentile"},
  {id:"extramarks-2023", label:"Extramarks, 2023 marks vs percentile", year:2023, scope:"session", url:"https://www.extramarks.com/blogs/students/jee-main-2023-marks-vs-percentile-vs-rank/"},
];

// "jee-2025-22jan-s1" -> {year:2025, month:"jan", day:22, shift:1}
export function parsePaperId(id){
  const m = /^jee-(\d{4})-(\d{1,2})([a-z]{3})-s(\d+)$/i.exec(String(id));
  return m ? {year:+m[1], day:+m[2], month:m[3].toLowerCase(), shift:+m[4]} : null;
}
export const sourcesForYear = year => SOURCES.filter(s => s.year === year);
