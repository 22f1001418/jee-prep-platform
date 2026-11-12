import React, {useEffect, useMemo} from "react";
import {Icon} from "./icons";
import {Ring} from "./ui";
import {ThemeToggle} from "./ThemeToggle";
import {loadProfile} from "../screens/ProfileScreen";
import {activityDays, currentStreak, loadDailyGoal, questionsToday} from "../lib/activity";
import {dueCount, useMistakes} from "../lib/mistakes";

// Side navigation on wide screens, bottom tab bar on phones. Wraps every "browsing" screen;
// the exam, results and other focused flows are shown without it.
export const NAV = [
  {id:"home",     label:"Home",         icon:"home",     group:"Study"},
  {id:"practice", label:"Practice",     icon:"practice", group:"Study"},
  {id:"mistakes", label:"Mistake Book", icon:"mistakes", group:"Study", short:"Mistakes"},
  {id:"tests",    label:"Mock Tests",   icon:"tests",    group:"Tests", short:"Tests"},
  {id:"history",  label:"History",      icon:"history",  group:"Tests"},
  {id:"allnotes", label:"Notes",        icon:"notes",    group:"Library"},
];
// screens that belong to a nav item without being one themselves
const PARENT = {starredq:"allnotes"};
const BOTTOM = ["home", "tests", "practice", "mistakes", "history", "allnotes"];

export function AppShell({screen, onNavigate, children}){
  useMistakes();
  const active = PARENT[screen] || screen;
  const due = dueCount();
  const profile = loadProfile();
  const today = useMemo(()=>{
    const days = activityDays(); const {streak} = currentStreak(days);
    return {n: questionsToday(), goal: loadDailyGoal(), streak};
  }, [screen]);   // refreshed whenever you move between screens
  useEffect(()=>{ window.scrollTo(0, 0); }, [screen]);
  const badge = id => id==="mistakes" && due>0 ? <span className="shell-badge" aria-label={`${due} due`}>{due > 99 ? "99+" : due}</span> : null;
  const groups = [...new Set(NAV.map(n => n.group))];
  return (
    <div className="shell">
      <aside className="shell-side" aria-label="Main navigation">
        <div className="shell-brand">
          <span className="shell-logo" aria-hidden="true"><Icon name="check" size={18} stroke={2.8}/></span>
          <span style={{display:"flex", flexDirection:"column", lineHeight:1.1}}>
            <span>JEE CBT</span>
            <span style={{fontSize:11, fontWeight:600, color:"var(--text-faint)", letterSpacing:".04em"}}>Main practice studio</span>
          </span>
        </div>
        <nav className="shell-nav">
          {groups.map(g => (
            <div key={g} className="shell-group">
              <div className="shell-group-label">{g}</div>
              {NAV.filter(n => n.group === g).map(n => (
                <button key={n.id} className={"shell-link"+(active===n.id ? " on" : "")} aria-current={active===n.id ? "page" : undefined} onClick={()=>onNavigate(n.id)}>
                  <Icon name={n.icon}/><span>{n.label}</span>{badge(n.id)}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="shell-foot">
          <button className="shell-today" onClick={()=>onNavigate("home")} title="Your daily goal">
            <Ring value={today.n} max={today.goal} size={46} stroke={5} color={today.n >= today.goal ? "var(--correct)" : "var(--brand)"} label={`${today.n} of ${today.goal} questions today`}>
              {today.n >= today.goal ? <Icon name="check" size={18} stroke={2.6} style={{color:"var(--correct)"}}/> : <span className="num" style={{fontSize:13}}>{today.n}</span>}
            </Ring>
            <span style={{textAlign:"left", minWidth:0}}>
              <span style={{display:"block", fontSize:13, fontWeight:700}}>{today.n} / {today.goal} today</span>
              <span style={{display:"flex", alignItems:"center", gap:4, fontSize:12, color: today.streak ? "#e08a2c" : "var(--text-faint)", fontWeight:650}}>
                <Icon name="flame" size={13}/>{today.streak} day streak
              </span>
            </span>
          </button>
          {profile && (
            <div className="shell-user">
              {profile.photo ? <img src={profile.photo} alt="" className="shell-avatar"/> : <span className="shell-avatar shell-avatar-ph">{profile.name.trim()[0].toUpperCase()}</span>}
              <span className="shell-uname">{profile.name}</span>
            </div>
          )}
          <ThemeToggle inline/>
        </div>
      </aside>
      <main className="shell-main"><div key={screen} className="page-enter">{children}</div></main>
      <nav className="shell-bottom" aria-label="Main navigation">
        {BOTTOM.map(id => NAV.find(n => n.id === id)).map(n=>(
          <button key={n.id} className={"shell-tab"+(active===n.id ? " on" : "")} aria-current={active===n.id ? "page" : undefined} onClick={()=>onNavigate(n.id)}>
            <span className="shell-tab-ico"><Icon name={n.icon} size={22}/>{badge(n.id)}</span>
            <span>{n.short || n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
