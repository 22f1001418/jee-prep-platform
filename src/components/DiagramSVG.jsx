import React from "react";
import {FIG_IMAGES} from "../lib/data";

// ---------- Diagrams ----------
export function DiagramSVG({id}){
  if(FIG_IMAGES[id]){
    const f = FIG_IMAGES[id];
    return <img src={f.uri} alt="Figure" width={f.w} style={{maxWidth:"100%", height:"auto", display:"block"}}/>;
  }
  const common = {viewBox:"0 0 320 220", style:{width:"100%", maxWidth:360, height:"auto"}};
  switch(id){
    case "disc": return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        <circle cx="160" cy="110" r="90" fill="#cfd8e3" stroke="var(--text)" strokeWidth="2"/>
        <circle cx="205" cy="110" r="45" fill="var(--bg)" stroke="var(--text)" strokeWidth="2"/>
        <line x1="70" y1="110" x2="250" y2="110" stroke="var(--text)" strokeWidth="1.5" strokeDasharray="4 3"/>
        <text x="110" y="104" fontSize="15" fill="var(--text)">R</text>
        <text x="195" y="104" fontSize="15" fill="var(--text)">R</text>
        <circle cx="160" cy="110" r="2.5" fill="var(--text)"/>
      </svg>
    );
    case "circularMotion": return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        <circle cx="160" cy="110" r="80" fill="none" stroke="var(--text)" strokeWidth="2"/>
        <line x1="160" y1="30" x2="160" y2="190" stroke="var(--text-faint)" strokeWidth="1"/>
        <circle cx="160" cy="190" r="3" fill="var(--text)"/>
        <text x="165" y="205" fontSize="13" fill="var(--text)">A</text>
        <circle cx="160" cy="30" r="3" fill="var(--text)"/>
        <text x="165" y="22" fontSize="13" fill="var(--text)">D</text>
        <circle cx="218" cy="150" r="3" fill="var(--text)"/>
        <text x="225" y="160" fontSize="13" fill="var(--text)">B</text>
        <circle cx="218" cy="70" r="3" fill="var(--text)"/>
        <text x="225" y="68" fontSize="13" fill="var(--text)">C</text>
        <circle cx="160" cy="110" r="2.5" fill="var(--text)"/>
        <text x="165" y="118" fontSize="13" fill="var(--text)">O</text>
        <path d="M160 190 h40" stroke="var(--navy)" strokeWidth="2" markerEnd="url(#arrow)"/>
        <text x="195" y="208" fontSize="12" fill="var(--navy)">v₀</text>
        <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--navy)"/></marker></defs>
      </svg>
    );
    case "potentiometer": return (
      <svg viewBox="0 0 320 160" style={{width:"100%", maxWidth:360, height:"auto"}} xmlns="http://www.w3.org/2000/svg">
        <rect x="40" y="40" width="160" height="14" fill="none" stroke="var(--text)" strokeWidth="2"/>
        <text x="60" y="35" fontSize="12" fill="var(--text)">Rp = 1Ω</text>
        <line x1="120" y1="54" x2="120" y2="90" stroke="var(--text)" strokeWidth="2"/>
        <rect x="90" y="90" width="60" height="16" fill="none" stroke="var(--text)" strokeWidth="2"/>
        <text x="70" y="122" fontSize="12" fill="var(--text)">Re = 2Ω</text>
        <line x1="120" y1="106" x2="120" y2="130" stroke="var(--text)" strokeWidth="2"/>
        <line x1="40" y1="47" x2="20" y2="20" stroke="var(--text)" strokeWidth="2"/>
        <line x1="200" y1="47" x2="220" y2="20" stroke="var(--text)" strokeWidth="2"/>
        <line x1="20" y1="20" x2="220" y2="20" stroke="var(--text)" strokeWidth="2"/>
        <text x="105" y="14" fontSize="12" fill="var(--text)">0.9 V</text>
      </svg>
    );
    case "gravitation": return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        <circle cx="130" cy="110" r="75" fill="#cfd8e3" stroke="var(--text)" strokeWidth="2"/>
        <circle cx="160" cy="110" r="22" fill="var(--bg)" stroke="var(--text)" strokeWidth="2"/>
        <text x="120" y="45" fontSize="14" fill="var(--text)">M</text>
        <circle cx="130" cy="110" r="2.5" fill="var(--text)"/>
        <text x="110" y="128" fontSize="13" fill="var(--text)">O</text>
        <circle cx="290" cy="110" r="4" fill="var(--navy)"/>
        <text x="280" y="98" fontSize="13" fill="var(--text)">P (m)</text>
        <line x1="130" y1="150" x2="290" y2="150" stroke="var(--text-faint)" strokeWidth="1"/>
        <text x="195" y="168" fontSize="12" fill="var(--text)">2R</text>
      </svg>
    );
    case "cube": return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        <polygon points="90,60 190,60 190,160 90,160" fill="none" stroke="var(--text)" strokeWidth="2"/>
        <polygon points="110,40 210,40 210,140 110,140" fill="none" stroke="var(--text)" strokeWidth="2"/>
        <line x1="90" y1="60" x2="110" y2="40" stroke="var(--text)" strokeWidth="2"/>
        <line x1="190" y1="60" x2="210" y2="40" stroke="var(--text)" strokeWidth="2"/>
        <line x1="190" y1="160" x2="210" y2="140" stroke="var(--text)" strokeWidth="2"/>
        <line x1="90" y1="160" x2="110" y2="140" stroke="var(--text)" strokeWidth="2" strokeDasharray="3 2"/>
        <text x="80" y="55" fontSize="12" fill="var(--text)">A</text>
        <text x="195" y="35" fontSize="12" fill="var(--text)">D</text>
        <text x="215" y="35" fontSize="12" fill="var(--text)">E</text>
        <text x="80" y="175" fontSize="12" fill="var(--text)">B</text>
        <text x="195" y="175" fontSize="12" fill="var(--text)">C</text>
        <text x="90" y="135" fontSize="12" fill="var(--text)">G</text>
        <text x="215" y="135" fontSize="12" fill="var(--text)">H</text>
        <line x1="140" y1="160" x2="190" y2="160" stroke="var(--navy)" strokeWidth="3"/>
      </svg>
    );
    case "lensSystem": return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        <rect x="70" y="30" width="180" height="150" fill="none" stroke="var(--text)" strokeWidth="2"/>
        <text x="130" y="24" fontSize="12" fill="var(--text)">container</text>
        <path d="M80 70 Q160 40 240 70" fill="none" stroke="#6fa8dc" strokeWidth="2"/>
        <text x="245" y="65" fontSize="11" fill="var(--text)">water μ=4/3</text>
        <path d="M80 70 Q160 110 240 70" fill="#c9d6e3" stroke="var(--text)" strokeWidth="2"/>
        <text x="245" y="105" fontSize="11" fill="var(--text)">glass μ=3/2</text>
        <path d="M80 70 Q160 160 240 70" fill="none" stroke="var(--text)" strokeWidth="2"/>
        <path d="M80 70 Q160 140 240 70" fill="#6fa8dc" fillOpacity="0.3" stroke="#6fa8dc" strokeWidth="2"/>
        <text x="245" y="150" fontSize="11" fill="var(--text)">water μ=4/3</text>
      </svg>
    );
    case "resistivityGraph": return (
      <svg viewBox="0 0 320 180" style={{width:"100%", maxWidth:380, height:"auto"}} xmlns="http://www.w3.org/2000/svg">
        {[0,1,2,3].map(i=>{
          const ox = 20+i*80, oy=150, w=60,h=100;
          const paths = [
            `M${ox+5},${oy-h+5} Q${ox+15},${oy-20} ${ox+w-5},${oy-5}`,
            `M${ox+5},${oy-h+10} L${ox+w-5},${oy-15}`,
            `M${ox+5},${oy-10} Q${ox+25},${oy-h+30} ${ox+w-5},${oy-h+5}`,
            `M${ox+5},${oy-40} L${ox+w-5},${oy-35}`,
          ];
          return (
            <g key={i}>
              <line x1={ox} y1={oy} x2={ox+w} y2={oy} stroke="var(--text)" strokeWidth="1.5"/>
              <line x1={ox} y1={oy} x2={ox} y2={oy-h} stroke="var(--text)" strokeWidth="1.5"/>
              <path d={paths[i]} fill="none" stroke="var(--navy)" strokeWidth="2"/>
              <text x={ox+w/2-6} y={oy+15} fontSize="11" fill="var(--text)">T(K)</text>
              <text x={ox-14} y={oy-h-2} fontSize="11" fill="var(--text)">ρ</text>
              <text x={ox+2} y={oy-h-8} fontSize="12" fontWeight="700" fill="var(--text)">({i+1})</text>
            </g>
          );
        })}
      </svg>
    );
    case "conductors": return (
      <svg viewBox="0 0 320 170" style={{width:"100%", maxWidth:360, height:"auto"}} xmlns="http://www.w3.org/2000/svg">
        <rect x="40" y="30" width="110" height="55" fill="none" stroke="var(--text)" strokeWidth="2"/>
        <text x="75" y="63" fontSize="14" fill="var(--text)">k₁</text>
        <rect x="40" y="85" width="110" height="55" fill="none" stroke="var(--text)" strokeWidth="2"/>
        <text x="75" y="118" fontSize="14" fill="var(--text)">k₂</text>
        <rect x="150" y="30" width="110" height="110" fill="none" stroke="var(--text)" strokeWidth="2"/>
        <text x="195" y="90" fontSize="14" fill="var(--text)">k₃</text>
        <text x="30" y="22" fontSize="12" fill="var(--text)">100°C</text>
        <text x="148" y="22" fontSize="12" fill="var(--text)">θ°C</text>
        <text x="255" y="22" fontSize="12" fill="var(--text)">0°C</text>
      </svg>
    );
    case "barmagnet": return (
      <svg viewBox="0 0 320 160" style={{width:"100%", maxWidth:360, height:"auto"}} xmlns="http://www.w3.org/2000/svg">
        <circle cx="160" cy="120" r="3" fill="var(--navy)"/>
        <text x="166" y="112" fontSize="13" fill="var(--text)">P</text>
        <line x1="160" y1="120" x2="160" y2="50" stroke="var(--text-faint)" strokeWidth="1" strokeDasharray="3 2"/>
        <text x="166" y="85" fontSize="12" fill="var(--text)">d</text>
        <rect x="90" y="40" width="140" height="20" fill="#cfd8e3" stroke="var(--text)" strokeWidth="2"/>
        <text x="95" y="54" fontSize="13" fontWeight="700" fill="var(--text)">S</text>
        <text x="212" y="54" fontSize="13" fontWeight="700" fill="var(--text)">N</text>
        <line x1="90" y1="70" x2="230" y2="70" stroke="var(--text)" strokeWidth="1.5"/>
        <text x="150" y="85" fontSize="12" fill="var(--text)">2l</text>
      </svg>
    );
    case "velTimeGraph": return (
      <svg viewBox="0 0 320 200" style={{width:"100%", maxWidth:360, height:"auto"}} xmlns="http://www.w3.org/2000/svg">
        <line x1="40" y1="170" x2="40" y2="20" stroke="var(--text)" strokeWidth="1.5"/>
        <line x1="40" y1="170" x2="290" y2="170" stroke="var(--text)" strokeWidth="1.5"/>
        <text x="10" y="55" fontSize="12" fill="var(--text)">10</text>
        <text x="290" y="188" fontSize="12" fill="var(--text)">t(s)</text>
        <text x="8" y="100" fontSize="12" fill="var(--text)">v(ms⁻¹)</text>
        <path d="M40 170 L100 60 L160 60 L230 170" fill="none" stroke="var(--navy)" strokeWidth="2.5"/>
        <line x1="100" y1="60" x2="100" y2="170" stroke="var(--text-faint)" strokeWidth="1" strokeDasharray="3 2"/>
        <line x1="160" y1="60" x2="160" y2="170" stroke="var(--text-faint)" strokeWidth="1" strokeDasharray="3 2"/>
        <text x="96" y="185" fontSize="11" fill="var(--text)">2</text>
        <text x="156" y="185" fontSize="11" fill="var(--text)">4</text>
        <text x="95" y="52" fontSize="11" fill="var(--text)">A</text>
        <text x="160" y="52" fontSize="11" fill="var(--text)">B</text>
      </svg>
    );
    case "circularBend": return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        <line x1="20" y1="110" x2="130" y2="110" stroke="var(--text)" strokeWidth="2"/>
        <circle cx="160" cy="110" r="40" fill="none" stroke="var(--navy)" strokeWidth="2.5"/>
        <line x1="160" y1="110" x2="160" y2="150" stroke="var(--text)" strokeWidth="2"/>
        <line x1="190" y1="110" x2="300" y2="110" stroke="var(--text)" strokeWidth="2"/>
        <circle cx="160" cy="110" r="2.5" fill="var(--text)"/>
        <text x="166" y="104" fontSize="13" fill="var(--text)">O</text>
        <text x="163" y="95" fontSize="12" fill="var(--text)">a</text>
        <text x="25" y="124" fontSize="12" fill="var(--text)">I</text>
        <text x="290" y="124" fontSize="12" fill="var(--text)">I</text>
        <text x="15" y="100" fontSize="11" fill="var(--text)">∞</text>
        <text x="295" y="100" fontSize="11" fill="var(--text)">∞</text>
      </svg>
    );
    case "diodeCircuit": return (
      <svg viewBox="0 0 320 180" style={{width:"100%", maxWidth:360, height:"auto"}} xmlns="http://www.w3.org/2000/svg">
        <line x1="40" y1="40" x2="40" y2="140" stroke="var(--text)" strokeWidth="2"/>
        <circle cx="40" cy="90" r="18" fill="none" stroke="var(--text)" strokeWidth="2"/>
        <text x="10" y="94" fontSize="11" fill="var(--text)">V=V₀sinωt</text>
        <line x1="40" y1="40" x2="220" y2="40" stroke="var(--text)" strokeWidth="2"/>
        <text x="225" y="44" fontSize="12" fill="var(--text)">A</text>
        <circle cx="220" cy="40" r="3" fill="var(--text)"/>
        <line x1="150" y1="40" x2="150" y2="140" stroke="var(--text)" strokeWidth="2"/>
        <rect x="140" y="70" width="20" height="30" fill="none" stroke="var(--text)" strokeWidth="2"/>
        <text x="165" y="90" fontSize="12" fill="var(--text)">R</text>
        <line x1="40" y1="140" x2="120" y2="140" stroke="var(--text)" strokeWidth="2"/>
        <path d="M120 140 l15 -8 v16 z" fill="var(--text)"/>
        <line x1="135" y1="140" x2="150" y2="140" stroke="var(--text)" strokeWidth="2"/>
        <line x1="150" y1="140" x2="220" y2="140" stroke="var(--text)" strokeWidth="2"/>
        <circle cx="220" cy="140" r="3" fill="var(--text)"/>
        <text x="225" y="144" fontSize="12" fill="var(--text)">B</text>
      </svg>
    );
    case "wheatstoneLike": return (
      <svg viewBox="0 0 320 200" style={{width:"100%", maxWidth:360, height:"auto"}} xmlns="http://www.w3.org/2000/svg">
        <line x1="60" y1="50" x2="160" y2="50" stroke="var(--text)" strokeWidth="2"/>
        <text x="95" y="42" fontSize="11" fill="var(--text)">10Ω</text>
        <line x1="160" y1="50" x2="260" y2="50" stroke="var(--text)" strokeWidth="2"/>
        <text x="195" y="42" fontSize="11" fill="var(--text)">20Ω</text>
        <circle cx="160" cy="50" r="3" fill="var(--text)"/>
        <text x="166" y="42" fontSize="12" fill="var(--text)">A</text>
        <line x1="160" y1="50" x2="160" y2="120" stroke="var(--text)" strokeWidth="2"/>
        <text x="166" y="88" fontSize="11" fill="var(--text)">30Ω</text>
        <line x1="60" y1="120" x2="160" y2="120" stroke="var(--text)" strokeWidth="2"/>
        <text x="95" y="135" fontSize="11" fill="var(--text)">R</text>
        <line x1="160" y1="120" x2="260" y2="120" stroke="var(--text)" strokeWidth="2"/>
        <text x="195" y="135" fontSize="11" fill="var(--text)">40Ω</text>
        <circle cx="160" cy="120" r="3" fill="var(--text)"/>
        <text x="166" y="134" fontSize="12" fill="var(--text)">B</text>
        <line x1="60" y1="50" x2="60" y2="160" stroke="var(--text)" strokeWidth="2"/>
        <line x1="260" y1="50" x2="260" y2="160" stroke="var(--text)" strokeWidth="2"/>
        <line x1="60" y1="160" x2="260" y2="160" stroke="var(--text)" strokeWidth="2"/>
        <text x="150" y="175" fontSize="11" fill="var(--text)">40 V</text>
      </svg>
    );
    case "vShapeRails": return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        {Array.from({length:30}).map((_,i)=>(
          <text key={i} x={30+(i%6)*45} y={40+Math.floor(i/6)*35} fontSize="14" fill="var(--text-faint)">×</text>
        ))}
        <path d="M160 40 L80 160 L160 100 L240 40" fill="none" stroke="var(--navy)" strokeWidth="2.5"/>
        <circle cx="160" cy="40" r="3" fill="var(--text)"/>
        <text x="166" y="35" fontSize="12" fill="var(--text)">B</text>
        <circle cx="160" cy="100" r="2.5" fill="var(--text)"/>
        <text x="166" y="98" fontSize="11" fill="var(--text)">O</text>
      </svg>
    );
    case "pvCycles": return (
      <svg viewBox="0 0 320 140" style={{width:"100%", maxWidth:380, height:"auto"}} xmlns="http://www.w3.org/2000/svg">
        {[0,1,2].map(i=>{
          const ox = 15+i*105;
          return (
            <g key={i}>
              <line x1={ox} y1={115} x2={ox+90} y2={115} stroke="var(--text)" strokeWidth="1.2"/>
              <line x1={ox} y1={115} x2={ox} y2={20} stroke="var(--text)" strokeWidth="1.2"/>
              {i===0 && <path d="M30 100 L30 50 L95 50 L95 90 Z" fill="none" stroke="var(--navy)" strokeWidth="2"/>}
              {i===1 && <rect x={ox+15} y={35} width="60" height="55" fill="none" stroke="var(--navy)" strokeWidth="2"/>}
              {i===2 && <polygon points={`${ox+50},30 ${ox+85},65 ${ox+50},100 ${ox+15},65`} fill="none" stroke="var(--navy)" strokeWidth="2"/>}
              <text x={ox+30} y={128} fontSize="10" fill="var(--text)">p (kPa)</text>
              <text x={ox-10} y={25} fontSize="10" fill="var(--text)">V</text>
              <text x={ox+25} y={12} fontSize="11" fontWeight="700" fill="var(--text)">Case-{["I","II","III"][i]}</text>
            </g>
          );
        })}
      </svg>
    );
    default: return null;
  }
}

