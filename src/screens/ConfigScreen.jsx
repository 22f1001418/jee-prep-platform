import React, {useState} from "react";
import {MARKS_WRONG} from "../lib/constants";
import {numAttemptLimit, numWrongMarks, usePaper} from "../lib/papers";
import {Stat} from "./PreviewScreen";

// ---------- Exam configuration ----------
export function ConfigScreen({onBegin, onBack}){
  const paper = usePaper();
  const counts = {Mathematics:25, Physics:25, Chemistry:25};
  return (
    <div style={{minHeight:"100vh", padding:"50px 20px", display:"flex", justifyContent:"center"}}>
      <div style={{maxWidth:600, width:"100%"}}>
        <button className="btn" onClick={onBack} style={{marginBottom:18}}>← Back</button>
        <div className="card" style={{padding:"30px 30px 10px"}}>
          <h2 style={{marginTop:0, fontWeight:400, fontFamily:"var(--font-head)"}}>Exam Configuration</h2>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px 24px", margin:"20px 0 26px"}}>
            <Stat label="Test Name" value={paper.name} plain/>
            <Stat label="Number of Questions" value="75" plain/>
            <Stat label="Mathematics" value="25 Qs" plain/>
            <Stat label="Physics" value="25 Qs" plain/>
            <Stat label="Chemistry" value="25 Qs" plain/>
            <Stat label="Total Marks" value="300" plain/>
            <Stat label="Duration" value="180 minutes" plain/>
            <Stat label="Marking" value={numWrongMarks(paper)===MARKS_WRONG ? "+4 / −1 / 0" : `+4 / −1 / 0 (numerical: +4 / ${numWrongMarks(paper)} / 0)`} plain/>
          </div>
        </div>
        <div className="card" style={{padding:"24px 30px", marginTop:18}}>
          <h3 style={{marginTop:0, fontSize:16}}>Instructions</h3>
          <ul style={{fontSize:14, color:"var(--text-dim)", lineHeight:1.8, paddingLeft:20}}>
            <li>The clock will be set at the server. The countdown timer will display the remaining time.</li>
            <li>The Question Palette shows the status of each question using symbols.</li>
            <li>Click <strong>Save &amp; Next</strong> to save your answer and move to the next question.</li>
            <li>Click <strong>Mark for Review &amp; Next</strong> to flag a question for later, saving any answer entered.</li>
            <li>For numerical questions, type the exact numeric value — no options will be shown.</li>
            <li>You can navigate freely between Mathematics, Physics and Chemistry at any time without losing responses.</li>
            {numAttemptLimit(paper)!=null && (
              <li>Each subject's Numerical section shows more questions than you may answer: answer any <strong>{numAttemptLimit(paper)}</strong> in each subject. Once you have answered {numAttemptLimit(paper)}, the others are locked until you clear one of your answers. Numericals you do not choose are not scored; they are listed separately in the analysis.</li>
            )}
            <li>The exam auto-submits when the timer reaches 00:00:00.</li>
          </ul>
          <label style={{display:"flex", alignItems:"center", gap:8, fontSize:14, marginTop:16}}>
            <ConfirmCheckbox onReady={onBegin}/>
          </label>
        </div>
      </div>
    </div>
  );
}
export function ConfirmCheckbox({onReady}){
  const [checked, setChecked] = useState(false);
  return (
    <div style={{display:"flex", flexDirection:"column", gap:14}}>
      <label style={{display:"flex", gap:8, alignItems:"center", cursor:"pointer"}}>
        <input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} />
        I have read and understood the instructions.
      </label>
      <button className="btn btn-primary" disabled={!checked} onClick={onReady} style={{alignSelf:"flex-start"}}>
        Start Exam
      </button>
    </div>
  );
}
