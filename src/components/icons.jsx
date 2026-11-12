import React from "react";

// One consistent icon set: 24x24 grid, 1.8 stroke, round caps. Used everywhere instead of emoji or text glyphs.
const P = {
  // navigation
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>,
  tests: <><path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z"/><path d="M8 4H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2"/><path d="M9 14l2 2 4-4"/></>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  practice: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  mistakes: <><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></>,
  history: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  notes: <><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h6M9 16h6"/></>,
  // arrows and chevrons
  "arrow-left": <><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></>,
  "arrow-right": <><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></>,
  "arrow-up-right": <><path d="M7 17L17 7"/><path d="M8 7h9v9"/></>,
  "chevron-down": <path d="M6 9l6 6 6-6"/>,
  "chevron-up": <path d="M18 15l-6-6-6 6"/>,
  "chevron-right": <path d="M9 6l6 6-6 6"/>,
  "chevron-left": <path d="M15 6l-6 6 6 6"/>,
  // status
  check: <path d="M20 6L9 17l-5-5"/>,
  "check-circle": <><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></>,
  x: <path d="M18 6L6 18M6 6l12 12"/>,
  "x-circle": <><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  minus: <path d="M5 12h14"/>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
  alert: <><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>,
  "shield-check": <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></>,
  // actions
  star: <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>,
  pencil: <><path d="M4 20l4-1 11-11a2.1 2.1 0 0 0-3-3L5 16z"/><path d="M14 7l3 3"/></>,
  eraser: <><path d="M20 20H9l-5-5a2 2 0 0 1 0-3l8-8a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-7 8"/><path d="M8 11l5 5"/></>,
  sparkles: <><path d="M10 3l1.8 4.7L16.5 9.5l-4.7 1.8L10 16l-1.8-4.7L3.5 9.5l4.7-1.8z"/><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></>,
  filter: <path d="M3 5h18l-7 8v6l-4-2v-4z"/>,
  download: <><path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/></>,
  upload: <><path d="M12 16V5"/><path d="M7 9l5-5 5 5"/><path d="M5 20h14"/></>,
  trash: <><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></>,
  play: <path d="M7 4l13 8-13 8z"/>,
  pause: <path d="M8 5v14M16 5v14"/>,
  refresh: <><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></>,
  settings: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
  // study
  book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/></>,
  bookmark: <path d="M6 3h12v18l-6-4-6 4z"/>,
  bulb: <><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></>,
  flag: <><path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 16l-5-5-8 8"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  // progress and motivation
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  timer: <><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
  flame: <path d="M12 3c1.5 3.5 6 5.5 6 10.5a6 6 0 0 1-12 0c0-2.2 1-3.8 2.2-5 .2 1.6 1 2.6 2 2.6C10.5 8 10.5 5 12 3z"/>,
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z"/>,
  chart: <path d="M5 20V10M12 20V4M19 20v-7"/>,
  "trending-up": <><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></>,
  "trending-down": <><path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/></>,
  trophy: <><path d="M8 4h8v6a4 4 0 0 1-8 0z"/><path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4"/><path d="M12 14v4M8 21h8M9 18h6"/></>,
  medal: <><circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 21l5-3 5 3-1.5-7"/></>,
  rocket: <><path d="M5 15c-1 1-2 4-2 6 2 0 5-1 6-2"/><path d="M12 15l-3-3a11 11 0 0 1 9-9c1 0 3 0 3 0 0 0 0 2 0 3a11 11 0 0 1-9 9z"/><circle cx="16" cy="8" r="1.5"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></>,
  // subjects
  math: <path d="M18 5H7l6 7-6 7h11"/>,
  atom: <><circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/></>,
  flask: <><path d="M9 3h6"/><path d="M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7.5 15h9"/></>,
  // theme
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></>,
  moon: <path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/>,
};

export const SUBJECT_ICON = {Mathematics:"math", Physics:"atom", Chemistry:"flask"};

// fill: solid version (e.g. a starred star). Colour comes from the surrounding text colour.
export function Icon({name, size = 20, fill = false, stroke = 1.8, style, className}){
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}
      style={{flexShrink:0, verticalAlign:"-0.2em", ...style}}>
      {P[name] || null}
    </svg>
  );
}
