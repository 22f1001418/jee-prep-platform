import React, {useEffect, useRef, useState} from "react";
import {DiagramSVG} from "./DiagramSVG";
import {TeX} from "./TeX";
import {IMG_MARK, InlineImg, MAX_NOTE_IMAGES, compressImage, mergeRanges, normalizeNote, remapRanges, renderEditLayer, segRanges, subify, subtractRange, toEditConv, toStoreConv} from "../lib/notes";
import {getPaper} from "../lib/papers";
import {isOptionCorrect} from "../lib/scoring";

export const NOTE_SYMBOLS = [
  {label:"Common maths", items:["≠","≈","≡","≅","∼","≤","≥","≪","≫","±","×","÷","·","∘","√","∛","∞","∝","∴","∵","°","′","″","½","⅓","¼","¾","|","∣","!","⌊","⌋"]},
  {label:"Calculus & sets", items:["∑","∏","∫","∮","∂","∇","Δ","∈","∉","⊂","⊆","∪","∩","∅","∀","∃","ℝ","ℕ","ℤ","ℚ","ℂ"]},
  {label:"Arrows & geometry", items:["→","←","↑","↓","↔","⇒","⇔","⇌","⊥","∥","∠","△"]},
  {label:"Greek (lower case)", items:["α","β","γ","δ","ε","ζ","η","θ","ι","κ","λ","μ","ν","ξ","π","ρ","σ","τ","υ","φ","χ","ψ","ω","ℏ","ℓ"]},
  {label:"Greek (capital)", items:["Γ","Δ","Θ","Λ","Ξ","Π","Σ","Φ","Ψ","Ω"]},
  {label:"Physics & chemistry", items:["μ₀","ε₀","Å","°C","ΔH","ΔG","ΔS","ΔU","ΔE","ΔT","ΔP","ΔV","⊙","⊗","e⁻","⁻¹","⁻²","⁻³","m/s","m/s²","N·m","J/mol"]},
  // Items may be a plain string or {s: what is typed, t: hover hint}. The hint says what a symbol stands for.
  {label:"Physical constants", items:[
    {s:"k_{B}",t:"Boltzmann constant (1.38 x 10⁻²³ J/K)"}, {s:"Nₐ",t:"Avogadro number (6.022 x 10²³ /mol)"}, {s:"R",t:"Universal gas constant (8.314 J/mol·K)"},
    {s:"G",t:"Gravitational constant (6.67 x 10⁻¹¹ N·m²/kg²)"}, {s:"g",t:"Acceleration due to gravity"}, {s:"c",t:"Speed of light (3 x 10⁸ m/s)"},
    {s:"h",t:"Planck's constant (6.63 x 10⁻³⁴ J·s)"}, {s:"ℏ",t:"h / 2π"}, {s:"e",t:"Elementary charge (1.6 x 10⁻¹⁹ C)"},
    {s:"F",t:"Faraday constant (96485 C/mol)"}, {s:"b",t:"Wien's displacement constant"}, {s:"σ",t:"Stefan-Boltzmann constant / conductivity / surface charge density"},
    {s:"Rₕ",t:"Rydberg constant"}, {s:"a₀",t:"Bohr radius"}, {s:"mₑ",t:"Mass of electron"}, {s:"mₚ",t:"Mass of proton"}, {s:"mₙ",t:"Mass of neutron"},
    {s:"μ_{B}",t:"Bohr magneton"}, {s:"u",t:"Atomic mass unit"}, {s:"k",t:"Coulomb constant, 1/(4πε₀)"}, {s:"1/4πε₀",t:"Coulomb constant"},
    {s:"ε₀",t:"Permittivity of free space"}, {s:"μ₀",t:"Permeability of free space"}, {s:"Cₚ",t:"Molar heat capacity at constant pressure"},
    {s:"Cᵥ",t:"Molar heat capacity at constant volume"}, {s:"Cₚ/Cᵥ",t:"Adiabatic index (gamma)"}, {s:"γ",t:"Adiabatic index"},
  ]},
  {label:"Dielectric & relative terms", items:[
    {s:"εᵣ",t:"Relative permittivity"}, {s:"κ",t:"Dielectric constant (K)"}, {s:"K",t:"Dielectric constant"}, {s:"μᵣ",t:"Relative permeability"},
    {s:"χₘ",t:"Magnetic susceptibility"}, {s:"ε/ε₀",t:"Relative permittivity = ε / ε₀"}, {s:"μ/μ₀",t:"Relative permeability = μ / μ₀"},
    {s:"n₂₁",t:"Relative refractive index (medium 2 w.r.t. 1)"}, {s:"vᵣₑₗ",t:"Relative velocity"}, {s:"aᵣₑₗ",t:"Relative acceleration"}, {s:"nᵣₑₗ",t:"Relative refractive index"},
    {s:"Z_{eff}",t:"Effective nuclear charge"}, {s:"ℰ",t:"EMF"}, {s:"Φ_{B}",t:"Magnetic flux"}, {s:"Φₑ",t:"Electric flux"},
  ]},
  {label:"Units", items:["kg","mol","K","Pa","atm","eV","MeV","kJ/mol","J/K","J mol⁻¹ K⁻¹","W/m²","N/C","V/m","Wb","T","Hz","N/m","kg·m/s","kg m²","m³","cm³","dm³","L","mol/L","mol L⁻¹","s⁻¹","m⁻¹"]},
  {label:"Chemistry", items:[
    {s:"K_{c}",t:"Equilibrium constant (concentration)"}, {s:"Kₚ",t:"Equilibrium constant (pressure)"}, {s:"Kₐ",t:"Acid dissociation constant"}, {s:"K_{b}",t:"Base dissociation constant"},
    {s:"Kₛₚ",t:"Solubility product"}, {s:"K_{w}",t:"Ionic product of water"}, {s:"pH",t:"pH"}, {s:"pOH",t:"pOH"}, {s:"pK_{b}",t:"pKb (base)"}, {s:"pKₐ",t:"pKa"},
    {s:"E°",t:"Standard electrode potential"}, {s:"E°cell",t:"Standard cell potential"}, {s:"ΔH°",t:"Standard enthalpy change"}, {s:"ΔG°",t:"Standard Gibbs energy change"},
    {s:"ΔS°",t:"Standard entropy change"}, {s:"δ⁺",t:"Partial positive charge"}, {s:"δ⁻",t:"Partial negative charge"}, "H⁺","OH⁻","H₂O","CO₂","NH₃","SO₄²⁻","⇌","↑","↓",
  ]},
  {label:"Ions", items:[
    {s:"⁺",t:"Positive charge (cation)"}, {s:"⁻",t:"Negative charge (anion)"}, {s:"²⁺",t:"Charge 2+ (cation)"}, {s:"³⁺",t:"Charge 3+ (cation)"}, {s:"²⁻",t:"Charge 2- (anion)"}, {s:"³⁻",t:"Charge 3- (anion)"}, {s:"ⁿ⁺",t:"Charge n+ (cation)"}, {s:"ⁿ⁻",t:"Charge n- (anion)"}, {s:"M⁺",t:"Generic metal cation"}, {s:"X⁻",t:"Generic halide anion"}, {s:"H⁺",t:"Hydrogen ion / proton (cation)"}, {s:"H₃O⁺",t:"Hydronium ion (cation)"}, {s:"Li⁺",t:"Lithium ion (cation)"}, {s:"Na⁺",t:"Sodium ion (cation)"}, {s:"K⁺",t:"Potassium ion (cation)"}, {s:"NH₄⁺",t:"Ammonium ion (cation)"}, {s:"Ag⁺",t:"Silver ion (cation)"}, {s:"Cu⁺",t:"Cuprous ion, copper(I) (cation)"}, {s:"Mg²⁺",t:"Magnesium ion (cation)"}, {s:"Ca²⁺",t:"Calcium ion (cation)"}, {s:"Ba²⁺",t:"Barium ion (cation)"}, {s:"Zn²⁺",t:"Zinc ion (cation)"}, {s:"Fe²⁺",t:"Ferrous ion, iron(II) (cation)"}, {s:"Cu²⁺",t:"Cupric ion, copper(II) (cation)"}, {s:"Mn²⁺",t:"Manganese(II) ion (cation)"}, {s:"Pb²⁺",t:"Lead(II) ion (cation)"}, {s:"Ni²⁺",t:"Nickel ion (cation)"}, {s:"Co²⁺",t:"Cobalt(II) ion (cation)"}, {s:"Sn²⁺",t:"Stannous ion, tin(II) (cation)"}, {s:"Hg²⁺",t:"Mercuric ion, mercury(II) (cation)"}, {s:"Al³⁺",t:"Aluminium ion (cation)"}, {s:"Fe³⁺",t:"Ferric ion, iron(III) (cation)"}, {s:"Cr³⁺",t:"Chromium(III) ion (cation)"}, {s:"Co³⁺",t:"Cobalt(III) ion (cation)"}, {s:"F⁻",t:"Fluoride ion (anion)"}, {s:"Cl⁻",t:"Chloride ion (anion)"}, {s:"Br⁻",t:"Bromide ion (anion)"}, {s:"I⁻",t:"Iodide ion (anion)"}, {s:"OH⁻",t:"Hydroxide ion (anion)"}, {s:"CN⁻",t:"Cyanide ion (anion)"}, {s:"NO₃⁻",t:"Nitrate ion (anion)"}, {s:"NO₂⁻",t:"Nitrite ion (anion)"}, {s:"HCO₃⁻",t:"Bicarbonate ion (anion)"}, {s:"HSO₄⁻",t:"Hydrogen sulphate ion (anion)"}, {s:"MnO₄⁻",t:"Permanganate ion (anion)"}, {s:"ClO₄⁻",t:"Perchlorate ion (anion)"}, {s:"CH₃COO⁻",t:"Acetate ion (anion)"}, {s:"O²⁻",t:"Oxide ion (anion)"}, {s:"S²⁻",t:"Sulphide ion (anion)"}, {s:"SO₄²⁻",t:"Sulphate ion (anion)"}, {s:"SO₃²⁻",t:"Sulphite ion (anion)"}, {s:"CO₃²⁻",t:"Carbonate ion (anion)"}, {s:"CrO₄²⁻",t:"Chromate ion (anion)"}, {s:"Cr₂O₇²⁻",t:"Dichromate ion (anion)"}, {s:"C₂O₄²⁻",t:"Oxalate ion (anion)"}, {s:"S₂O₃²⁻",t:"Thiosulphate ion (anion)"}, {s:"PO₄³⁻",t:"Phosphate ion (anion)"}, {s:"N³⁻",t:"Nitride ion (anion)"},
  ]},
  {label:"Superscripts", items:["⁰","¹","²","³","⁴","⁵","⁶","⁷","⁸","⁹","⁺","⁻","ⁿ","ˣ","ʸ"]},
  {label:"Subscripts", items:["₀","₁","₂","₃","₄","₅","₆","₇","₈","₉","₊","₋","ₙ","ₓ","ᵢ","ⱼ"]},
];
// What each plain symbol is called (shown when you hover it in the Symbols palette). Symbols with their own hint are written as {s, t} above.
export const SYMBOL_NAMES = {
  "≠":"not equal to","≈":"approximately equal to","≡":"identical to / equivalent","≅":"congruent to","∼":"similar to / tilde","≤":"less than or equal to","≥":"greater than or equal to","≪":"much less than","≫":"much greater than",
  "±":"plus or minus","×":"multiplication / cross product","÷":"division","·":"dot / dot product","∘":"composition / small ring","√":"square root","∛":"cube root","∞":"infinity","∝":"proportional to","∴":"therefore","∵":"because",
  "°":"degree","′":"prime (minute)","″":"double prime (second)","½":"one half","⅓":"one third","¼":"one quarter","¾":"three quarters","|":"vertical bar (modulus / absolute value)","∣":"divides","!":"factorial","⌊":"left floor","⌋":"right floor",
  "∑":"summation","∏":"product (of terms)","∫":"integral","∮":"closed-loop integral","∂":"partial derivative","∇":"nabla / del operator","Δ":"delta (change in) / capital delta","∈":"element of","∉":"not an element of","⊂":"subset of","⊆":"subset of or equal to",
  "∪":"union","∩":"intersection","∅":"empty set","∀":"for all","∃":"there exists","ℝ":"set of real numbers","ℕ":"set of natural numbers","ℤ":"set of integers","ℚ":"set of rational numbers","ℂ":"set of complex numbers",
  "→":"right arrow (tends to / gives)","←":"left arrow","↑":"up arrow (increases / gas evolved)","↓":"down arrow (decreases / precipitate)","↔":"left-right arrow","⇒":"implies","⇔":"if and only if","⇌":"equilibrium (reversible reaction)","⊥":"perpendicular","∥":"parallel","∠":"angle","△":"triangle",
  "α":"alpha","β":"beta","γ":"gamma","δ":"delta","ε":"epsilon","ζ":"zeta","η":"eta","θ":"theta","ι":"iota","κ":"kappa","λ":"lambda","μ":"mu","ν":"nu","ξ":"xi","π":"pi","ρ":"rho","σ":"sigma","τ":"tau","υ":"upsilon","φ":"phi","χ":"chi","ψ":"psi","ω":"omega",
  "ℏ":"h-bar (reduced Planck constant, h / 2π)","ℓ":"script l (length / azimuthal quantum number)",
  "Γ":"capital gamma","Θ":"capital theta","Λ":"capital lambda","Ξ":"capital xi","Π":"capital pi (product)","Σ":"capital sigma (sum)","Φ":"capital phi (flux)","Ψ":"capital psi (wave function)","Ω":"capital omega (ohm)",
  "μ₀":"permeability of free space","ε₀":"permittivity of free space","Å":"angstrom (10⁻¹⁰ m)","°C":"degree Celsius","ΔH":"enthalpy change","ΔG":"Gibbs free energy change","ΔS":"entropy change","ΔU":"change in internal energy","ΔE":"change in energy",
  "ΔT":"change in temperature","ΔP":"change in pressure","ΔV":"change in volume","⊙":"field / current out of the page","⊗":"field / current into the page","e⁻":"electron","⁻¹":"to the power minus one","⁻²":"to the power minus two","⁻³":"to the power minus three",
  "m/s":"metre per second (speed)","m/s²":"metre per second squared (acceleration)","N·m":"newton metre (torque / work)","J/mol":"joule per mole",
  "⁺":"superscript plus","⁻":"superscript minus","ⁿ":"superscript n","ˣ":"superscript x","ʸ":"superscript y","₊":"subscript plus","₋":"subscript minus","ₙ":"subscript n","ₓ":"subscript x","ᵢ":"subscript i","ⱼ":"subscript j",
  "kg":"kilogram","mol":"mole","K":"kelvin","Pa":"pascal","atm":"atmosphere (pressure)","eV":"electron volt","MeV":"mega electron volt","kJ/mol":"kilojoule per mole","J/K":"joule per kelvin (entropy / heat capacity)",
  "J mol⁻¹ K⁻¹":"joule per mole per kelvin (units of R)","W/m²":"watt per square metre (intensity)","N/C":"newton per coulomb (electric field)","V/m":"volt per metre (electric field)","Wb":"weber (magnetic flux)","T":"tesla (magnetic field)","Hz":"hertz (frequency)",
  "N/m":"newton per metre (spring constant / surface tension)","kg·m/s":"kilogram metre per second (momentum)","kg m²":"kilogram square metre (moment of inertia)","m³":"cubic metre","cm³":"cubic centimetre","dm³":"cubic decimetre","L":"litre","mol/L":"mole per litre (molarity)","mol L⁻¹":"mole per litre (molarity)","s⁻¹":"per second","m⁻¹":"per metre",
  "H⁺":"hydrogen ion (proton)","OH⁻":"hydroxide ion","H₂O":"water","CO₂":"carbon dioxide","NH₃":"ammonia","SO₄²⁻":"sulphate ion",
};
"⁰¹²³⁴⁵⁶⁷⁸⁹".split("").forEach((c,i)=>{ SYMBOL_NAMES[c] = "superscript " + ["zero","one","two","three","four","five","six","seven","eight","nine"][i]; });
"₀₁₂₃₄₅₆₇₈₉".split("").forEach((c,i)=>{ SYMBOL_NAMES[c] = "subscript " + ["zero","one","two","three","four","five","six","seven","eight","nine"][i]; });
export function NoteEditor({initial, ranges: initialRanges, images: initialImages, exists, onSave, onCancel, onDelete}){
  const startImgs = initialImages || [];
  const [text, setText] = useState(()=>toEditConv(normalizeNote(initial || "", startImgs)).text);
  const [ranges, setRanges] = useState(()=>{ const c = toEditConv(normalizeNote(initial || "", startImgs)); return mergeRanges((initialRanges || []).map(([a,b])=>[c.map(a), c.map(b)])); });
  const [imgs, setImgs] = useState(startImgs);
  const [imgMsg, setImgMsg] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [symOpen, setSymOpen] = useState(false);
  const [symHint, setSymHint] = useState(null);   // the symbol under the mouse: {s, name}
  const [symQ, setSymQ] = useState("");              // symbol search text
  const refs = useRef([]);            // one textarea per text part
  const lastSeg = useRef(null);       // which text part was used last
  const insertAt = useRef(null);      // where a new picture should go
  const focusReq = useRef(null);
  const fileRef = useRef(null);
  const textRef = useRef(text); textRef.current = text;
  const imgsRef = useRef(imgs); imgsRef.current = imgs;

  const segs = text.split(IMG_MARK);
  const baseOf = i => segs.slice(0,i).reduce((a,x)=>a+x.length+1, 0);
  // An empty text part between two pictures is not shown, so the pictures sit side by side
  // (and wrap onto the next line when the row is full).
  const hiddenSeg = (j, sg2, im2) => j>0 && j<sg2.length-1 && sg2[j]==="" && !!im2[j-1] && !!im2[j];
  const visSeg = (j, sg2, im2) => { while(j<sg2.length-1 && hiddenSeg(j, sg2, im2)) j++; return j; };

  useEffect(()=>{
    const f = focusReq.current;
    if(f && refs.current[f.idx]){ refs.current[f.idx].focus(); refs.current[f.idx].setSelectionRange(f.pos, f.pos); focusReq.current = null; }
  });

  function onType(i, value){
    const parts = text.split(IMG_MARK); parts[i] = value;
    let nt = parts.join(IMG_MARK);
    if(/_\{[^{}]*\}/.test(value)){ // a subscript typed by hand, like K_{c}: turn it into the editing form right away
      const t = refs.current[i], caret = t ? t.selectionStart : value.length, base = baseOf(i);
      const c = toEditConv(nt);
      focusReq.current = {idx:i, pos:Math.max(0, c.map(base + caret) - base)};
      setRanges(r=>mergeRanges(remapRanges(r, text, nt).map(([a,b])=>[c.map(a), c.map(b)])));
      setText(c.text);
      return;
    }
    setRanges(r=>remapRanges(r, text, nt));
    setText(nt);
  }
  function selection(){
    const i = lastSeg.current; const t = i!==null ? refs.current[i] : null;
    if(!t || t.selectionEnd<=t.selectionStart) return null;
    const base = baseOf(i);
    return [base + t.selectionStart, base + t.selectionEnd];
  }
  function addHl(){ const o = selection(); if(o) setRanges(r=>mergeRanges([...r, o])); }
  function removeHl(){ const o = selection(); if(o) setRanges(r=>mergeRanges(subtractRange(r, o[0], o[1]))); }

  // Types a symbol into the note at the cursor (replacing any selected text).
  function insertSymbol(sym){
    const idx = lastSeg.current!==null && lastSeg.current!==undefined && refs.current[lastSeg.current] ? lastSeg.current : segs.length-1;
    const t = refs.current[idx];
    const a = t ? t.selectionStart : segs[idx].length, b = t ? t.selectionEnd : a;
    const ins = toEditConv(sym).text;
    onType(idx, segs[idx].slice(0,a) + ins + segs[idx].slice(b));
    focusReq.current = {idx, pos: a + ins.length};
    lastSeg.current = idx;
  }
  function markInsertPoint(i){
    const idx = i!==null && i!==undefined ? i : segs.length-1;
    const t = refs.current[idx];
    insertAt.current = {idx, pos: t ? t.selectionStart : segs[idx].length};
  }
  async function addFiles(files){
    const list = Array.from(files || []).filter(f=>f.type && f.type.startsWith("image/"));
    if(list.length===0) return;
    const room = MAX_NOTE_IMAGES - imgsRef.current.length;
    if(room<=0){ setImgMsg(`You can add up to ${MAX_NOTE_IMAGES} images per note.`); return; }
    const where = insertAt.current || {idx: segs.length-1, pos: segs[segs.length-1].length};
    try{
      const added = [];
      for(const f of list.slice(0, room)) added.push(await compressImage(f));
      const cur = textRef.current;
      const parts = cur.split(IMG_MARK);
      const idx = Math.min(where.idx, parts.length-1);
      const pos = Math.min(where.pos, parts[idx].length);
      const g = parts.slice(0,idx).reduce((a,x)=>a+x.length+1, 0) + pos;
      const nt = cur.slice(0,g) + IMG_MARK.repeat(added.length) + cur.slice(g);
      const arr = [...imgsRef.current]; arr.splice(idx, 0, ...added);
      setRanges(r=>remapRanges(r, cur, nt));
      setText(nt); setImgs(arr);
      const focusIdx = visSeg(idx+added.length, nt.split(IMG_MARK), arr);
      focusReq.current = {idx: focusIdx, pos: focusIdx===idx+added.length ? 0 : (nt.split(IMG_MARK)[focusIdx]||"").length};
      lastSeg.current = focusIdx;
      setImgMsg(list.length>room ? `Only ${MAX_NOTE_IMAGES} images are allowed per note, extra ones were skipped.` : "");
    }catch(e){ setImgMsg("That file could not be read as an image."); }
  }
  function onPaste(i, e){
    const files = Array.from(e.clipboardData && e.clipboardData.items || []).filter(it=>it.kind==="file" && it.type.startsWith("image/")).map(it=>it.getAsFile()).filter(Boolean);
    if(files.length){ e.preventDefault(); markInsertPoint(i); addFiles(files); }
  }
  function removeImage(k){
    let at = -1;
    for(let c=0;c<=k;c++) at = text.indexOf(IMG_MARK, at+1);
    if(at<0) return;
    const nt = text.slice(0,at) + text.slice(at+1);
    setRanges(r=>remapRanges(r, text, nt));
    setText(nt); setImgs(cur=>cur.filter((_,j)=>j!==k)); setImgMsg("");
    lastSeg.current = null;
  }
  function save(){
    const lead = text.length - text.trimStart().length;
    const t = text.trim();
    if(!t && imgs.length===0 && exists){ setConfirmDel(true); return; } // saving an empty note deletes it
    const rg = mergeRanges(ranges.map(([a,b])=>[Math.max(0,a-lead), Math.min(t.length,b-lead)]));
    const st = toStoreConv(t);
    onSave(st.text, mergeRanges(rg.map(([a,b])=>[st.map(a), st.map(b)])), imgs);
  }

  const small = {padding:"3px 10px", fontSize:12.5};
  const hasHl = mergeRanges(ranges).length>0;
  const shared = {fontFamily:"inherit", fontSize:14, lineHeight:"21px", padding:"8px 10px", margin:0, boxSizing:"border-box",
                  whiteSpace:"pre-wrap", wordBreak:"break-word", overflowWrap:"break-word", letterSpacing:"normal"};
  let runBase = 0;
  return (
    <div style={{padding:"10px 0"}}>
      <div className="nt-card">
        <div className="nt-bar" role="toolbar" aria-label="Note tools">
          <button className="nt-tool" title="Select some text in the note, then press this to highlight it" onMouseDown={e=>e.preventDefault()} onClick={addHl}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>Highlight selected</button>
          <button className="nt-tool" title="Select highlighted text, then press this to remove its highlight" onMouseDown={e=>e.preventDefault()} onClick={removeHl}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>Remove highlight</button>
          {hasHl && <button className="nt-tool" title="Remove every highlight in this note" onMouseDown={e=>e.preventDefault()} onClick={()=>setRanges([])}>Clear all</button>}
          <span className="nt-sep" aria-hidden="true"/>
          <button className="nt-tool" title="Insert a maths, physics or chemistry symbol where your cursor is"
            aria-expanded={symOpen} onMouseDown={e=>e.preventDefault()} onClick={()=>setSymOpen(o=>!o)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a.5.5 0 0 1 0 .4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2"/></svg>Symbols <span aria-hidden="true" style={{fontSize:10}}>{symOpen ? "\u25B4" : "\u25BE"}</span></button>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>{ addFiles(e.target.files); e.target.value=""; }}/>
          <button className="nt-tool" disabled={imgs.length>=MAX_NOTE_IMAGES}
            title={`Adds a picture where your cursor is. You can also paste a picture into the note (${imgs.length}/${MAX_NOTE_IMAGES} used).`}
            onMouseDown={e=>e.preventDefault()}
            onClick={()=>{ markInsertPoint(lastSeg.current); fileRef.current && fileRef.current.click(); }}><svg viewBox="0 0 24 24" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>Add image</button>
          {imgs.length>0 && <span style={{marginLeft:"auto", fontSize:11.5, color:"var(--text-faint)", padding:"0 4px"}}>{imgs.length}/{MAX_NOTE_IMAGES} images</span>}
        </div>
{symOpen && (
        <div style={{borderBottom:"1px solid var(--border)"}}>
                  {symHint && symHint.r && (
           <div style={{position:"fixed", left:Math.max(8, Math.min(symHint.r.left + symHint.r.width/2, window.innerWidth-8)), top:symHint.r.top-6, transform:"translate(-50%,-100%)", zIndex:9999, pointerEvents:"none", background:"#1f2933", color:"#fff", fontSize:12.5, fontWeight:500, padding:"5px 9px", borderRadius:4, maxWidth:300, textAlign:"center", boxShadow:"0 2px 8px rgba(0,0,0,.25)"}}>{symHint.name}</div>
         )}
         <div style={{padding:"8px 10px 0"}}>
           <input type="search" value={symQ} onChange={e=>setSymQ(e.target.value)} placeholder="Search symbol by name, e.g. alpha, boltzmann, arrow, delta, angstrom"
             aria-label="Search symbols" autoComplete="off" spellCheck={false}
             style={{width:"100%", boxSizing:"border-box", padding:"7px 10px", fontSize:13.5, fontFamily:"inherit", border:"1px solid var(--border-dark)", borderRadius:4, background:"var(--bg, #fff)", color:"inherit"}}/>
         </div>
         <div style={{padding:"8px 10px", maxHeight:200, overflowY:"auto"}}>
          {(()=>{
            const words = symQ.trim().toLowerCase().split(/\s+/).filter(Boolean);
            const groups = NOTE_SYMBOLS.map(g=>({label:g.label, items:g.items.filter(it=>{
              if(words.length===0) return true;
              const sym = typeof it === "string" ? it : it.s, nm = typeof it === "string" ? (SYMBOL_NAMES[it] || "") : it.t;
              const hay = (nm + " " + sym + " " + g.label).toLowerCase();
              return words.every(w=>hay.indexOf(w) >= 0);
            })})).filter(g=>g.items.length>0);
            if(groups.length===0) return <div style={{fontSize:13, color:"var(--text-faint)", padding:"6px 0"}}>No symbol found for "{symQ}". Try another word, like the Greek letter name or "arrow".</div>;
            return groups.map(g=>(
            <div key={g.label} style={{marginBottom:8}}>
              <div style={{fontSize:11, letterSpacing:.4, textTransform:"uppercase", color:"var(--text-faint)", marginBottom:4}}>{g.label}</div>
              <div style={{display:"flex", flexWrap:"wrap", gap:4}}>
                {g.items.map(it=>{
                  const sym = typeof it === "string" ? it : it.s, nm = typeof it === "string" ? (SYMBOL_NAMES[it] || "") : it.t;
                  const hint = nm ? `${sym}: ${nm}` : `Insert ${sym}`;
                  return (
                    <button key={sym} className="btn" aria-label={hint} onMouseDown={e=>e.preventDefault()} onClick={()=>insertSymbol(sym)}
                      onMouseEnter={e=>setSymHint({s:sym, name:nm || "Insert " + sym, r:e.currentTarget.getBoundingClientRect()})} onMouseLeave={()=>setSymHint(null)} onFocus={e=>setSymHint({s:sym, name:nm || "Insert " + sym, r:e.currentTarget.getBoundingClientRect()})} onBlur={()=>setSymHint(null)}
                      style={{padding:"2px 7px", minWidth:32, height:30, fontSize:15, fontWeight:400, fontFamily:"Arial, 'Segoe UI Symbol', 'Cambria Math', sans-serif"}}>{subify(sym)}</button>
                  );
                })}
              </div>
            </div>
            ));
          })()}
         </div>
        </div>
      )}
        <div>
        {segs.map((sg,i)=>{
          const base = runBase; runBase += sg.length + 1;
          const layer = renderEditLayer(sg, segRanges(ranges, base, sg.length));
          const only = segs.length===1;
          const minH = only ? 76 : (i===segs.length-1 ? 44 : 30);
          return (
            <React.Fragment key={i}>
              {!hiddenSeg(i, segs, imgs) && <div style={{position:"relative", minHeight:minH}}>
                <div aria-hidden="true" style={{...shared, color:"var(--text)", minHeight:minH, pointerEvents:"none"}}>{layer}{sg.endsWith("\n") ? "\n " : ""}</div>
                <textarea className="nt-ta" ref={el=>{ refs.current[i] = el; }} value={sg} spellCheck={false} autoFocus={i===0}
                  onChange={e=>onType(i, e.target.value)} onFocus={()=>{ lastSeg.current = i; }} onPaste={e=>onPaste(i,e)}
                  placeholder={only && !sg ? "Write your note for this question..." : undefined}
                  style={{...shared, position:"absolute", inset:0, width:"100%", height:"100%", border:"none", outline:"none", resize:"none", overflow:"hidden",
                          background:"transparent", color:"transparent", caretColor:"var(--text)"}}/>
              </div>}
              {i<segs.length-1 && imgs[i] && (
                <div style={{padding:"0 0 0 10px", display:"inline-block", verticalAlign:"top", maxWidth:"100%", boxSizing:"border-box"}}><InlineImg src={imgs[i]} onRemove={()=>removeImage(i)}/></div>
              )}
            </React.Fragment>
          );
        })}
        </div>
        {confirmDel ? (
          <div className="nt-foot">
            <span style={{fontSize:13.5, fontWeight:600}}>Delete this note?</span>
            <button className="btn btn-danger" style={{padding:"6px 14px", fontSize:13}} onClick={onDelete}>Yes, delete</button>
            <button className="btn" style={{padding:"6px 14px", fontSize:13}} onClick={()=>setConfirmDel(false)}>No, keep it</button>
          </div>
        ) : (
          <div className="nt-foot">
            <button className="btn btn-primary" style={{padding:"6px 14px", fontSize:13}} onClick={save}>Save note</button>
            <button className="btn" style={{padding:"6px 14px", fontSize:13}} onClick={onCancel}>Cancel</button>
            {exists && <button className="btn" style={{padding:"6px 14px", fontSize:13, color:"var(--not-answered)", marginLeft:"auto"}} onClick={()=>setConfirmDel(true)}>Delete</button>}
          </div>
        )}
      </div>
      {imgMsg && <div style={{fontSize:12, color:"var(--not-answered)", margin:"6px 2px 0"}}>{imgMsg}</div>}
    </div>
  );
}

export function QuestionBody({state, r}){
  const q = getPaper(state.paperId).questions.find(x=>x.n===r.n);
  if(!q) return null;
  return (
        <div style={{padding:"12px 14px", background:"var(--bg)", border:"1px solid var(--border)", borderRadius:6}}>
          <div style={{marginBottom:10, fontSize:15}}><TeX>{q.text}</TeX></div>
          {q.svg && <div style={{marginBottom:10}}><DiagramSVG id={q.svg}/></div>}
          {q.options && (
            <div style={{display:"grid", gridTemplateColumns:q.options.some(o=>o.text.length>70) ? "1fr" : "repeat(auto-fit, minmax(240px, 1fr))", gap:6, fontSize:13.5, marginBottom:10}}>
              {q.options.map(o=>{
                const isCorrect = isOptionCorrect(q, o.id);
                const isYours = o.id===r.yourAnswer;
                return (
                  <div key={o.id} style={{color: isCorrect ? "var(--correct)" : (isYours ? "var(--wrong)" : "var(--text-dim)"), fontWeight: isCorrect||isYours ? 700 : 400, minWidth:0, overflowWrap:"break-word", display:"flex", alignItems:"center", columnGap:5, flexWrap:"wrap"}}>
                    <span>({o.id})</span> <span style={{minWidth:0}}><TeX>{o.text}</TeX></span>{isCorrect?<span>(correct)</span>:null}{isYours && !isCorrect?<span>(your answer)</span>:null}
                  </div>
                );
              })}
            </div>
          )}
          <div style={{display:"flex", gap:20, flexWrap:"wrap", fontSize:13.5}}>
            <span>Your answer: <strong className="mono">{r.yourAnswer ?? "—"}</strong></span>
            <span>Correct answer: <strong className="mono" style={{color:"var(--correct)"}}>{r.correctAnswer}</strong></span>
          </div>
        </div>
  );
}

export function NoteQuestion({state, r}){
  const [open, setOpen] = useState(false);
  return (
    <div style={{margin:"4px 0 12px"}}>
      <button className="btn" style={{padding:"4px 12px", fontSize:12.5}} onClick={()=>setOpen(o=>!o)}>
        {open ? "Hide question" : "View question"}
      </button>
      {open && <div style={{marginTop:10}}><QuestionBody state={state} r={r}/></div>}
    </div>
  );
}

