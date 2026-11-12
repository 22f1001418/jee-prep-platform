import React from "react";
import {LS_KEY} from "../lib/constants";
import {store} from "../lib/store";

// ---------- Error boundary: a crash in any screen shows a recovery card instead of a blank page ----------
export class ErrorBoundary extends React.Component{
  constructor(props){ super(props); this.state = {error:null}; }
  static getDerivedStateFromError(error){ return {error}; }
  componentDidCatch(error, info){ try{ console.error("App crashed:", error, info && info.componentStack); }catch(e){} }
  discardAndReload(){
    if(!window.confirm("Discard the saved in-progress test and reload? Your Test History, notes and answer-key corrections are not touched.")) return;
    try{ store.removeItem(LS_KEY); }catch(e){}
    window.location.reload();
  }
  render(){
    if(!this.state.error) return this.props.children;
    const msg = String(this.state.error && this.state.error.message ? this.state.error.message : this.state.error);
    return (
      <div style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:20}}>
        <div className="card" style={{maxWidth:480, width:"100%", padding:"26px 28px"}}>
          <h2 style={{marginTop:0}}>Something went wrong</h2>
          <p style={{fontSize:14, color:"var(--text-dim)", lineHeight:1.6, margin:"0 0 10px"}}>
            This screen hit an error. A test in progress is saved automatically, so reloading usually brings you back to it.
          </p>
          <pre style={{fontSize:12, background:"var(--bg)", border:"1px solid var(--border)", borderRadius:4, padding:"8px 10px", whiteSpace:"pre-wrap", wordBreak:"break-word", margin:"0 0 16px", maxHeight:120, overflow:"auto"}}>{msg}</pre>
          <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
            <button className="btn btn-primary" onClick={()=>window.location.reload()}>Reload</button>
            <button className="btn" onClick={()=>this.setState({error:null})}>Try again</button>
            <button className="btn" onClick={()=>this.discardAndReload()}>Discard saved test &amp; reload</button>
          </div>
        </div>
      </div>
    );
  }
}

