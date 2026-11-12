import React from "react";
import {Icon} from "./icons";
import {ThemeToggle} from "./ThemeToggle";
import {loadProfile} from "../screens/ProfileScreen";
import {dueCount, useMistakes} from "../lib/mistakes";

// Side navigation on wide screens, bottom tab bar on phones. Wraps every "browsing" screen;
// the exam, results and other focused flows are shown without it.
export const NAV = [
  {id:"home",     label:"Home",        icon:"home"},
  {id:"tests",    label:"Mock Tests",  icon:"tests",    short:"Tests"},
  {id:"practice", label:"Practice",    icon:"practice"},
  {id:"mistakes", label:"Mistake Book",icon:"mistakes", short:"Mistakes"},
  {id:"history",  label:"History",     icon:"history"},
  {id:"allnotes", label:"Notes",       icon:"notes"},
];
// screens that belong to a nav item without being one themselves
const PARENT = {starredq:"allnotes"};

export function AppShell({screen, onNavigate, children}){
  useMistakes();
  const active = PARENT[screen] || screen;
  const due = dueCount();
  const profile = loadProfile();
  const badge = id => id==="mistakes" && due>0 ? <span className="shell-badge" aria-label={`${due} due`}>{due > 99 ? "99+" : due}</span> : null;
  return (
    <div className="shell">
      <aside className="shell-side" aria-label="Main navigation">
        <div className="shell-brand">
          <span className="shell-logo" aria-hidden="true">✓</span>
          <span>JEE CBT</span>
        </div>
        <nav className="shell-nav">
          {NAV.map(n=>(
            <button key={n.id} className={"shell-link"+(active===n.id ? " on" : "")} aria-current={active===n.id ? "page" : undefined} onClick={()=>onNavigate(n.id)}>
              <Icon name={n.icon}/><span>{n.label}</span>{badge(n.id)}
            </button>
          ))}
        </nav>
        <div className="shell-foot">
          {profile && (
            <div className="shell-user">
              {profile.photo ? <img src={profile.photo} alt="" className="shell-avatar"/> : <span className="shell-avatar shell-avatar-ph">{profile.name.trim()[0].toUpperCase()}</span>}
              <span className="shell-uname">{profile.name}</span>
            </div>
          )}
          <ThemeToggle inline/>
        </div>
      </aside>
      <main className="shell-main">{children}</main>
      <nav className="shell-bottom" aria-label="Main navigation">
        {NAV.map(n=>(
          <button key={n.id} className={"shell-tab"+(active===n.id ? " on" : "")} aria-current={active===n.id ? "page" : undefined} onClick={()=>onNavigate(n.id)}>
            <span className="shell-tab-ico"><Icon name={n.icon} size={22}/>{badge(n.id)}</span>
            <span>{n.short || n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
