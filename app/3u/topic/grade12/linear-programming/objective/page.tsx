"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import LabMessage from "@/app/components/LabMessage";
import { useDefaultToast } from "@/app/lib/useDefaultToast";
import SubtopicProgress from "@/app/components/SubtopicProgress";
import katex from "katex";
import "katex/dist/katex.min.css";

/* ─── KaTeX ───────────────────────────────────────────────────────────────── */
function InlineMath({ children }: { children: string }) { const ref = useRef<HTMLSpanElement>(null); useEffect(() => { if (ref.current) katex.render(children, ref.current, { throwOnError: false, displayMode: false }); }, [children]); return <span ref={ref} />; }
function DisplayMath({ children }: { children: string }) { const ref = useRef<HTMLSpanElement>(null); useEffect(() => { if (ref.current) katex.render(children, ref.current, { throwOnError: false, displayMode: true }); }, [children]); return <span ref={ref} style={{ display: "block", textAlign: "center" }} />; }

/* ─── Types ────────────────────────────────────────────────────────────────── */
type PromptStep = { phase: string; label: string; coaching: string; prompt: string; keywords: string[]; keywordHint: string; contextWords?: string[] };
type ExerciseDef = { id: "basic"|"medium"|"advanced"; title: string; problem: string; diagram: React.ReactNode; pitfalls: { title: string; text: string }[]; goldenPrompt: string; advancedGateQuestion?: string; steps: PromptStep[] };

/* ─── Station config ───────────────────────────────────────────────────────── */
const STATION = {
  basic:    { stationName:"תחנה ראשונה", badge:"מתחיל",  badgeCls:"bg-green-600 text-white",  accentCls:"text-green-700",  glowBorder:"rgba(22,163,74,0.35)",  glowShadow:"0 4px 16px rgba(22,163,74,0.12)",  glowRgb:"22,163,74",  accentColor:"#16A34A", borderRgb:"45,90,39"  },
  medium:   { stationName:"תחנה שנייה",  badge:"בינוני",  badgeCls:"bg-orange-600 text-white", accentCls:"text-orange-700", glowBorder:"rgba(234,88,12,0.35)",  glowShadow:"0 4px 16px rgba(234,88,12,0.12)",  glowRgb:"234,88,12", accentColor:"#EA580C", borderRgb:"163,79,38" },
  advanced: { stationName:"תחנה שלישית", badge:"מתקדם",  badgeCls:"bg-red-700 text-white",    accentCls:"text-red-700",    glowBorder:"rgba(220,38,38,0.35)",  glowShadow:"0 4px 16px rgba(220,38,38,0.12)",  glowRgb:"220,38,38", accentColor:"#DC2626", borderRgb:"139,38,53"},
} as const;

/* ─── SVG diagrams (silent) ────────────────────────────────────────────────── */

function BasicSVG() {
  // Feasible region polygon with vertices marked
  return (
    <svg viewBox="0 0 260 180" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={20} x2={40} y2={160} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={150} x2={240} y2={150} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={36} y={16} fontSize={11} fill="#94a3b8" textAnchor="middle" fontFamily="serif">y</text>
      <text x={245} y={153} fontSize={11} fill="#94a3b8" fontFamily="serif">x</text>
      {/* Feasible region */}
      <polygon points="40,150 40,60 100,30 180,60 180,150" fill="rgba(22,163,74,0.08)" stroke="#16A34A" strokeWidth={2} opacity={0.7} />
      {/* Vertices */}
      {[[40,150],[40,60],[100,30],[180,60],[180,150]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r={4} fill="#f59e0b" opacity={0.8}/>))}
      {/* z arrow */}
      <line x1={200} y1={130} x2={220} y2={100} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="3,2" />
      <text x={225} y={96} fontSize={10} fill="#a78bfa" fontFamily="sans-serif">z↗</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 270 190" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={20} x2={40} y2={170} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={160} x2={250} y2={160} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={36} y={16} fontSize={11} fill="#94a3b8" textAnchor="middle" fontFamily="serif">y</text>
      <text x={255} y={163} fontSize={11} fill="#94a3b8" fontFamily="serif">x</text>
      {/* Feasible region */}
      <polygon points="40,160 40,80 90,40 170,40 200,80 200,160" fill="rgba(234,88,12,0.08)" stroke="#EA580C" strokeWidth={2} opacity={0.7} />
      {/* Vertices with ? */}
      {[[40,160],[40,80],[90,40],[170,40],[200,80],[200,160]].map(([x,y],i)=>(<g key={i}><circle cx={x} cy={y} r={4} fill="#f59e0b"/><text x={x+7} y={y-5} fontSize={9} fill="#f59e0b" fontFamily="sans-serif">?</text></g>))}
      {/* Parallel z-lines */}
      <line x1={60} y1={170} x2={170} y2={25} stroke="#a78bfa" strokeWidth={1} strokeDasharray="4,3" opacity={0.4} />
      <line x1={100} y1={170} x2={210} y2={25} stroke="#a78bfa" strokeWidth={1} strokeDasharray="4,3" opacity={0.6} />
      <text x={215} y={22} fontSize={9} fill="#a78bfa" fontFamily="sans-serif">z=max?</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 270 190" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={15} x2={40} y2={170} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={160} x2={250} y2={160} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={36} y={12} fontSize={11} fill="#94a3b8" textAnchor="middle" fontFamily="serif">y</text>
      <text x={255} y={163} fontSize={11} fill="#94a3b8" fontFamily="serif">x</text>
      {/* Complex feasible region */}
      <polygon points="40,160 40,50 80,30 160,30 210,70 210,130 170,160" fill="rgba(220,38,38,0.06)" stroke="#DC2626" strokeWidth={2} opacity={0.7} />
      {/* Constraint lines extending beyond */}
      <line x1={30} y1={50} x2={240} y2={50} stroke="#64748b" strokeWidth={0.8} strokeDasharray="3,3" opacity={0.3} />
      <line x1={210} y1={20} x2={210} y2={170} stroke="#64748b" strokeWidth={0.8} strokeDasharray="3,3" opacity={0.3} />
      {/* Optimal vertex highlighted */}
      <circle cx={160} cy={30} r={6} fill="none" stroke="#34d399" strokeWidth={2} />
      <text x={168} y={24} fontSize={10} fill="#34d399" fontFamily="sans-serif">max?</text>
      <circle cx={40} cy={160} r={6} fill="none" stroke="#a78bfa" strokeWidth={2} />
      <text x={48} y={174} fontSize={10} fill="#a78bfa" fontFamily="sans-serif">min?</text>
    </svg>
  );
}

/* ─── Prompt Atoms ─────────────────────────────────────────────────────────── */

function CopyBtn({ text, label="העתק פרומפט" }: { text:string; label?:string }) { const [c,setC]=useState(false); return (<button onClick={()=>{navigator.clipboard.writeText(text);setC(true);setTimeout(()=>setC(false),2000);}} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 16px", borderRadius:12, fontSize:12, background:"rgba(255,255,255,0.75)", border:"1px solid rgba(60,54,42,0.25)", color:"#1A1A1A", fontWeight:500, cursor:"pointer" }}>{c?<Check size={13}/>:<Copy size={13}/>}{c?"הועתק!":label}</button>); }
function GoldenPromptCard({ prompt, title="פרומפט ראשי", glowRgb="16,185,129", borderRgb="45,90,39" }: { prompt:string; title?:string; glowRgb?:string; borderRgb?:string }) { return (<div style={{ borderRadius:16, background:"rgba(255,255,255,0.82)", padding:"1.25rem", marginBottom:16, border:`2px solid rgba(${borderRgb},0.45)`, boxShadow:`0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)` }}><div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}><span>✨</span><span style={{ color:"#1A1A1A", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em" }}>{title}</span></div><p style={{ color:"#1A1A1A", fontSize:14, lineHeight:1.7, marginBottom:16, whiteSpace:"pre-line", fontWeight:500 }}>{prompt}</p><CopyBtn text={prompt} label="העתק פרומפט מלא"/></div>); }
function TutorStepBasic({ step, glowRgb="16,185,129", borderRgb="45,90,39" }: { step:PromptStep; glowRgb?:string; borderRgb?:string }) { return (<div style={{ borderRadius:12, overflow:"hidden", border:`1px solid rgba(${glowRgb},0.45)`, marginBottom:8, boxShadow:`0 0 14px rgba(${glowRgb},0.18)` }}><div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px", background:"rgba(255,255,255,0.75)", borderBottom:`1px solid rgba(${glowRgb},0.25)` }}><span style={{ color:"#1A1A1A", fontSize:11, fontWeight:700 }}>{step.phase}</span><span style={{ color:"#2D3436", fontSize:11, fontWeight:600 }}>{step.label}</span></div><div style={{ background:"rgba(255,255,255,0.4)", padding:16, display:"flex", flexDirection:"column", gap:12 }}><div><div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>הפרומפט המוכן ✍️</div><div style={{ borderRadius:12, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${borderRgb},0.35)`, padding:12, fontSize:11, color:"#2D3436", lineHeight:1.6, wordBreak:"break-word" }}>{step.prompt}</div></div><CopyBtn text={step.prompt} label="העתק פרומפט ממוקד"/></div></div>); }

function TutorStepMedium({ step, locked=false, onPass, borderRgb="45,90,39" }: { step:PromptStep; locked?:boolean; onPass?:()=>void; borderRgb?:string }) {
  const [text,setText]=useState(""); const [result,setResult]=useState<ScoreResult|null>(null); const [copied,setCopied]=useState(false);
  const passed=!!(result&&!result.blocked&&result.score>=75);
  const validate=()=>{ if(text.trim().length<20){setResult({score:0,blocked:false,hint:"הניסוח קצר מדי — כתוב לפחות 20 תווים."});return;} const res=calculatePromptScore(text,step.contextWords??[]); setResult(res); if(!res.blocked&&res.score>=75) onPass?.(); };
  if(locked) return (<div style={{ borderRadius:12, border:`1px solid rgba(${borderRgb},0.3)`, background:"rgba(255,255,255,0.3)", padding:"14px 16px", marginBottom:8, opacity:0.4, userSelect:"none", display:"flex", alignItems:"center", gap:10 }}><span style={{ fontSize:16 }}>🔒</span><div><span style={{ color:"#6B7280", fontSize:11, fontWeight:700 }}>{step.phase}</span><span style={{ color:"#6B7280", fontSize:11, marginRight:8 }}>{step.label}</span></div></div>);
  const scoreBarColor=!result?"#9CA3AF":result.score>=75?"#16a34a":result.score>=50?"#d97706":"#dc2626";
  return (
    <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${passed?"rgba(245,158,11,0.55)":`rgba(${borderRgb},0.35)`}`, marginBottom:8, boxShadow:passed?"0 0 16px rgba(245,158,11,0.25)":"none" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px", background:"rgba(255,255,255,0.75)", borderBottom:`1px solid ${passed?"rgba(245,158,11,0.3)":`rgba(${borderRgb},0.2)`}` }}>{passed?<CheckCircle size={14} color="#34d399"/>:<span style={{ color:"#1A1A1A", fontSize:11, fontWeight:700 }}>{step.phase}</span>}<span style={{ color:"#2D3436", fontSize:11, fontWeight:600 }}>{step.label}</span></div>
      <div style={{ background:"rgba(255,255,255,0.4)", padding:16, display:"flex", flexDirection:"column", gap:12 }}>
        <textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={e=>{setText(e.target.value);setResult(null);}} placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..." style={{ minHeight:80, maxHeight:160, width:"100%", borderRadius:12, background:"rgba(255,255,255,0.75)", border:`1px solid ${passed?"rgba(245,158,11,0.4)":`rgba(${borderRgb},0.25)`}`, color:"#2D3436", fontSize:14, padding:12, resize:"none", boxSizing:"border-box", fontFamily:"inherit" }}/>
        {result&&(<div><div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#1A1A1A", marginBottom:4, fontWeight:600 }}><span>ציון הפרומפט</span><span style={{ fontWeight:800 }}>{result.score}/100</span></div><div style={{ height:6, borderRadius:3, background:"#E5E7EB", overflow:"hidden" }}><div style={{ height:"100%", width:`${result.score}%`, borderRadius:3, background:scoreBarColor, transition:"width 0.4s ease" }}/></div></div>)}
        {!result&&<button onClick={validate} style={{ padding:"6px 16px", borderRadius:12, fontSize:12, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${borderRgb},0.4)`, color:"#1A1A1A", cursor:"pointer", fontWeight:500 }}>בדיקת AI מדומה 🤖</button>}
        {result&&result.blocked&&<motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ borderRadius:12, background:"rgba(254,226,226,1)", border:"2px solid #dc2626", padding:12, color:"#1A1A1A", fontSize:12, lineHeight:1.6 }}>⚠️ {result.hint}</motion.div>}
        {result&&!result.blocked&&result.score<75&&<motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ borderRadius:12, background:"rgba(255,251,235,1)", border:"2px solid #d97706", padding:12, color:"#1A1A1A", fontSize:12, lineHeight:1.6 }}>💡 {result.hint}</motion.div>}
        {passed&&(<motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ display:"flex", flexDirection:"column", gap:8 }}><div style={{ borderRadius:12, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:12, color:"#1A1A1A", fontSize:12, fontWeight:600 }}>✅ פרומפט מצוין! ציון: <strong style={{ color:"#14532d" }}>{result.score}/100</strong></div><button onClick={()=>{navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:12, fontSize:12, background:"transparent", border:"2px solid #16a34a", color:"#14532d", cursor:"pointer", fontWeight:500 }}>{copied?<Check size={12}/>:<Copy size={12}/>}{copied?"הועתק!":"העתק ל-AI"}</button></motion.div>)}
        {result&&!passed&&<button onClick={()=>setResult(null)} style={{ fontSize:12, color:"#475569", background:"transparent", border:"none", cursor:"pointer", textDecoration:"underline" }}>נסה שוב</button>}
      </div>
    </div>
  );
}

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps:PromptStep[]; goldenPrompt:string; glowRgb:string; borderRgb:string }) { const [completed,setCompleted]=useState<boolean[]>(Array(steps.length).fill(false)); const unlocked=completed.filter(Boolean).length+1; const markDone=(i:number)=>{setCompleted(p=>{const n=[...p];n[i]=true;return n;});const el=document.getElementById(`basic-step-${i+1}`);if(el) setTimeout(()=>el.scrollIntoView({behavior:"smooth",block:"center"}),200);}; return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb}/>{steps.map((s,i)=>(<div key={i} id={`basic-step-${i}`}>{i<unlocked?(<><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb}/>{!completed[i]?(<button onClick={()=>markDone(i)} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button>):(<div style={{ textAlign:"center", padding:"6px 0", marginBottom:10, fontSize:12, color:"#16a34a", fontWeight:600 }}>✅ הושלם</div>)}</>):(<div style={{ opacity:0.35, pointerEvents:"none", position:"relative" }}><div style={{ position:"absolute", top:8, right:8, fontSize:16, zIndex:2 }}>🔒</div><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb}/></div>)}</div>))}</div>); }

function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb }: { steps:PromptStep[]; goldenPrompt:string; glowRgb:string; borderRgb:string }) { const [passed,setPassed]=useState<boolean[]>(Array(steps.length).fill(false)); return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb}/>{steps.map((s,i)=>(<TutorStepMedium key={i} step={s} locked={i>0&&!passed[i-1]} onPass={()=>setPassed(p=>{const n=[...p];n[i]=true;return n;})} borderRgb={borderRgb}/>))}</div>); }

function LadderAdvanced({ steps }: { steps:PromptStep[] }) {
  const [masterPassed,setMasterPassed]=useState(false); const [unlockedCount,setUnlockedCount]=useState(1); const allPassed=masterPassed&&unlockedCount>steps.length;
  return (
    <div>
      <MasterPromptGate onPass={()=>setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["פונקציית מטרה","מקסימום","מינימום","קודקוד","תחום אפשרי","אילוץ","z"]}/>
      {steps.map((s,i)=>(<div key={i} style={{ marginBottom:8 }}>{(!masterPassed||i>=unlockedCount)?(<div style={{ borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", background:"rgba(255,255,255,0.7)", padding:"14px 16px", opacity:0.5, pointerEvents:"none" as const, display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ color:"#6B7280", fontSize:13, fontWeight:600 }}>{s.phase} — {s.label}</span><span style={{ fontSize:16 }}>🔒</span></div>):(<div><div style={{ borderRadius:14, border:"1px solid rgba(22,163,74,0.3)", background:"rgba(255,255,255,0.9)", padding:"14px 16px", marginBottom:8 }}><div style={{ color:"#15803d", fontSize:13, fontWeight:700, marginBottom:6 }}>{s.phase} — {s.label}</div><div style={{ color:"#334155", fontSize:13, lineHeight:1.6 }}>{s.prompt}</div></div><button onClick={()=>setUnlockedCount(v=>Math.max(v,i+2))} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}
      {allPassed&&(<div style={{ borderRadius:16, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:"1.25rem 1.5rem", marginTop:16, textAlign:"center" }}><div style={{ fontSize:28, marginBottom:8 }}>🏆</div><div style={{ color:"#14532d", fontWeight:800, fontSize:16, marginBottom:4 }}>כל הכבוד — השלמת את הרמה המתקדמת!</div><div style={{ color:"#166534", fontSize:13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}
    </div>
  );
}

/* ─── Exercise Data ────────────────────────────────────────────────────────── */

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "הגדרת פונקציית מטרה ובדיקת קודקודים",
    problem: "נתון תחום אפשרי עם הקודקודים: A(0,0), B(0,4), C(3,2), D(5,0).\nפונקציית המטרה: z = 2x + 3y.\n\nא. חשבו את z בכל אחד מהקודקודים.\nב. מהו הערך המקסימלי של z ובאיזה קודקוד הוא מושג?\nג. מהו הערך המינימלי של z ובאיזה קודקוד הוא מושג?",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ שכחה לבדוק את כל הקודקודים", text: "המקסימום והמינימום של פונקציית מטרה לינארית מושגים תמיד בקודקוד של התחום האפשרי. חובה לבדוק את כולם — לא רק את אלה שנראים גדולים." },
      { title: "⚠️ טעות בהצבה", text: "ב-z = 2x + 3y, כשמציבים נקודה (3,2) מקבלים z = 2·3 + 3·2 = 12, לא z = 2·2 + 3·3. שימו לב לסדר — x קודם ל-y." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יב', 3 יחידות, ומצרף/ת שאלה בתכנון לינארי על פונקציית מטרה — חישוב z בקודקודים ומציאת מקסימום ומינימום. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"הצבת קודקודים", coaching:"", prompt:"z = 2x + 3y עם קודקודים A(0,0), B(0,4), C(3,2), D(5,0). תנחה אותי — איך מציבים כל קודקוד בפונקציית המטרה.", keywords:[], keywordHint:"", contextWords:["הצבה","קודקוד","z","פונקציה","מטרה","חישוב"] },
      { phase:"סעיף ב׳", label:"מציאת מקסימום", coaching:"", prompt:"חישבנו z בכל קודקוד. תכווין אותי — איך מזהים איזה קודקוד נותן את z הגדול ביותר.", keywords:[], keywordHint:"", contextWords:["מקסימום","גדול","קודקוד","ערך","השוואה","z"] },
      { phase:"סעיף ג׳", label:"מציאת מינימום", coaching:"", prompt:"תדריך אותי למצוא את המינימום — מהו הערך הקטן ביותר של z ובאיזו נקודה.", keywords:[], keywordHint:"", contextWords:["מינימום","קטן","קודקוד","ערך","נקודה","z"] },
    ],
  },
  {
    id: "medium",
    title: "מציאת תחום אפשרי + פונקציית מטרה",
    problem: "נתונים האילוצים:\nx + y ≤ 8, 2x + y ≤ 12, x ≥ 0, y ≥ 0.\nפונקציית המטרה: z = 5x + 4y.\n\nא. מצאו את קודקודי התחום האפשרי.\nב. חשבו את z בכל קודקוד.\nג. מהו המקסימום ובאיזו נקודה הוא מושג?",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ שכחת קודקוד על הצירים", text: "התחום האפשרי כולל גם את נקודות החיתוך עם הצירים (כש-x=0 או y=0). תלמידים מוצאים רק נקודות חיתוך בין אילוצים ושוכחים את הקודקודים על הצירים." },
      { title: "⚠️ טעות במציאת חיתוך שני אילוצים", text: "כדי למצוא קודקוד שבו שני אילוצים נפגשים, צריך לפתור מערכת של שתי משוואות (לא אי-שוויונות!). הציבו = במקום ≤ ופתרו." },
    ],
    goldenPrompt: `אני בכיתה יב', 3 יחידות, מצרף/ת תרגיל בתכנון לינארי — מציאת תחום אפשרי, קודקודים ומקסימום של פונקציית מטרה.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על מציאת קודקודים ובדיקתם.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"מציאת קודקודים", coaching:"", prompt:"אילוצים: x+y≤8, 2x+y≤12, x≥0, y≥0. תנחה אותי — איך מוצאים את קודקודי התחום: חיתוכי אילוצים זה עם זה ועם הצירים.", keywords:[], keywordHint:"", contextWords:["קודקוד","חיתוך","אילוץ","משוואה","מערכת","ציר"] },
      { phase:"סעיף ב׳", label:"הצבה ב-z", coaching:"", prompt:"מצאנו את הקודקודים. z = 5x + 4y. תכווין אותי להציב כל קודקוד ולחשב z.", keywords:[], keywordHint:"", contextWords:["הצבה","z","קודקוד","חישוב","פונקציה","ערך"] },
      { phase:"סעיף ג׳", label:"מקסימום", coaching:"", prompt:"חישבנו z בכל הקודקודים. תדריך אותי — איפה z הכי גדול ומה התשובה.", keywords:[], keywordHint:"", contextWords:["מקסימום","גדול","קודקוד","תשובה","נקודה","z"] },
    ],
  },
  {
    id: "advanced",
    title: "בעיית אופטימיזציה מילולית",
    problem: "מפעל מייצר שני מוצרים: A ו-B.\nכל יחידה מ-A דורשת שעתיים עבודה ושעה אחת חומר.\nכל יחידה מ-B דורשת שעה עבודה ושלוש שעות חומר.\nיש 100 שעות עבודה ו-120 שעות חומר.\nהרווח: 30₪ מכל A ו-50₪ מכל B.\n\nא. הגדירו משתנים וכתבו את האילוצים.\nב. כתבו את פונקציית המטרה.\nג. מצאו את קודקודי התחום האפשרי.\nד. מצאו את השילוב שמביא לרווח מקסימלי.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ שכחת אילוצי אי-שליליות", text: "בנוסף לאילוצי המשאבים, חייבים x ≥ 0 ו-y ≥ 0 (לא מייצרים כמות שלילית). שכחת אילוצים אלה משנה את התחום האפשרי לחלוטין." },
      { title: "⚠️ בלבול בין אילוץ לפונקציית מטרה", text: "האילוצים מגדירים את התחום האפשרי (מה מותר). פונקציית המטרה היא מה שרוצים למקסם/למזער (הרווח). אל תערבבו — האילוצים הם אי-שוויונות, פונקציית המטרה היא ביטוי שמחשבים." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: מהם שלבי הפתרון בבעיית תכנון לינארי (הגדרת משתנים → אילוצים → פונקציית מטרה → קודקודים → בדיקה)? (לפחות 80 תווים)",
    steps: [
      { phase:"סעיף א׳", label:"הגדרת משתנים ואילוצים", coaching:"", prompt:"A דורש 2 שעות עבודה + 1 חומר. B דורש 1 עבודה + 3 חומר. 100 שעות עבודה, 120 חומר. תנחה אותי — מה x ו-y ואיך כותבים אילוצים.", keywords:[], keywordHint:"", contextWords:["משתנה","אילוץ","אי-שוויון","עבודה","חומר","הגדרה"] },
      { phase:"סעיף ב׳", label:"פונקציית מטרה", coaching:"", prompt:"רווח 30₪ מ-A ו-50₪ מ-B. תכווין אותי — איך כותבים את פונקציית המטרה z ומה רוצים למקסם.", keywords:[], keywordHint:"", contextWords:["פונקציית מטרה","רווח","z","מקסימום","ביטוי","כתיבה"] },
      { phase:"סעיף ג׳", label:"קודקודי התחום", coaching:"", prompt:"יש לנו 2x+y≤100, x+3y≤120, x≥0, y≥0. תדריך אותי למצוא את כל הקודקודים — חיתוכים בין אילוצים.", keywords:[], keywordHint:"", contextWords:["קודקוד","חיתוך","מערכת","משוואות","תחום","פתרון"] },
      { phase:"סעיף ד׳", label:"רווח מקסימלי", coaching:"", prompt:"מצאנו את הקודקודים. תנחה אותי להציב כל אחד ב-z ולמצוא את הרווח המקסימלי — ומה תשובת הבעיה.", keywords:[], keywordHint:"", contextWords:["הצבה","מקסימום","רווח","קודקוד","תשובה","אופטימום"] },
    ],
  },
];

/* ─── ExerciseCard ──────────────────────────────────────────────────────────── */

function ExerciseCard({ ex }: { ex:ExerciseDef }) {
  const s=STATION[ex.id];
  const [copiedProblem,setCopiedProblem]=useState(false);
  function handleCopyProblem(){ navigator.clipboard.writeText(ex.problem.split(/\n+[אבגדהוזחט]\./)[0].trim()); setCopiedProblem(true); setTimeout(()=>setCopiedProblem(false),2000); }
  return (
    <section style={{ border:`1px solid ${s.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)" }}>
      <div style={{ borderRadius:16, border:`1px solid ${s.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.25rem 1.5rem", marginBottom:"2rem", boxShadow:s.glowShadow }}>
        <div style={{ textAlign:"center", marginBottom:14 }}><div style={{ color:s.accentColor, fontSize:15, fontWeight:800, marginBottom:4 }}>🎯 פונקציית מטרה</div><div style={{ color:"#6B7280", fontSize:12, lineHeight:1.55 }}>{ex.id==="basic"&&"הצבת קודקודים, מציאת מקסימום ומינימום."}{ex.id==="medium"&&"מציאת תחום אפשרי + קודקודים + מקסימום."}{ex.id==="advanced"&&"בעיית אופטימיזציה מילולית — מהתחלה עד סוף."}</div></div>
        <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:14 }}/>
        <div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>🎯 שלבי פתרון</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:30 }}>1.</span><span>מציאת קודקודי התחום האפשרי</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:30 }}>2.</span><span>הצבת כל קודקוד ב-z = ax + by</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:30 }}>3.</span><span>בחירת הקודקוד עם z הגדול/קטן ביותר</span></div></div></div>
        {ex.id!=="basic"&&(<><div style={{ height:1, background:"rgba(60,54,42,0.08)", marginBottom:12 }}/><div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>✨ {ex.id==="medium"?"מציאת קודקודים":"בעיה מילולית"}</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}>{ex.id==="medium"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:120 }}>חיתוך אילוצים</span><span>= במקום ≤ → פתרון מערכת</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:120 }}>קודקודי צירים</span><span>x=0 או y=0 מול כל אילוץ</span></div></>}{ex.id==="advanced"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:140 }}>תרגום לאילוצים</span><span>משאבים → אי-שוויונות</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:140 }}>z = רווח</span><span>פונקציית מטרה למקסום</span></div></>}</div></div></>)}
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:"2rem" }}><span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span><h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin:0 }}>{s.stationName}</h2></div>
      <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:"2rem" }}/>
      <div style={{ borderRadius:16, border:`1px solid ${s.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:s.glowShadow }}>{ex.diagram}</div>
      <div style={{ borderRadius:16, border:`1px solid rgba(${s.borderRgb},0.35)`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", marginBottom:"2rem" }}><div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}><div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600 }}>📝 השאלה</div><button onClick={handleCopyProblem} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:8, cursor:"pointer", background:copiedProblem?"rgba(22,163,74,0.1)":"rgba(107,114,128,0.08)", border:"1px solid rgba(107,114,128,0.2)", color:copiedProblem?"#15803d":"#6B7280", fontSize:11, fontWeight:600, whiteSpace:"nowrap" }}>{copiedProblem?<Check size={11}/>:<Copy size={11}/>}{copiedProblem?"הועתק!":"העתק"}</button></div><pre style={{ color:"#1A1A1A", fontSize:14, lineHeight:1.6, whiteSpace:"pre-wrap", fontFamily:"inherit", margin:0 }}>{ex.problem}</pre></div>
      <div style={{ marginBottom:"2rem" }}><div style={{ color:"#DC2626", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>⚠️ שגיאות נפוצות</div>{ex.pitfalls.map((p,i)=>(<div key={i} style={{ borderRadius:12, border:"1px solid rgba(220,38,38,0.2)", background:"rgba(220,38,38,0.05)", padding:"0.85rem 1rem", marginBottom:8 }}><div style={{ color:"#DC2626", fontWeight:600, fontSize:14, marginBottom:4 }}>{p.title}</div><div style={{ color:"#2D3436", fontSize:13.5, lineHeight:1.65 }}>{p.text}</div></div>))}</div>
      <div style={{ borderRadius:16, border:`1px solid ${s.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.25rem", boxShadow:s.glowShadow }}><div style={{ color:"#1A1A1A", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:16 }}>🧠 מדריך הפרומפטים</div>{ex.id==="basic"&&<LadderBase steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb}/>}{ex.id==="medium"&&<LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb}/>}</div>
      {ex.id==="advanced"&&<LadderAdvanced steps={ex.steps}/>}
    </section>
  );
}

/* ─── ObjectiveFunctionLab (basic) ─────────────────────────────────────────── */

function ObjectiveFunctionLab() {
  const [a,setA]=useState(2); const [b,setB]=useState(3);
  const st=STATION.basic;
  const vertices=[{label:"A",x:0,y:0},{label:"B",x:0,y:4},{label:"C",x:3,y:2},{label:"D",x:5,y:0}];
  const zVals=vertices.map(v=>({...v,z:a*v.x+b*v.y}));
  const maxV=zVals.reduce((p,c)=>c.z>p.z?c:p);
  const minV=zVals.reduce((p,c)=>c.z<p.z?c:p);
  const sc=24,ox=50,oy=140;
  const toSx=(x:number)=>ox+x*sc; const toSy=(y:number)=>oy-y*sc;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת פונקציית מטרה</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו את המקדמים a ו-b ב-z = ax + by וצפו כיצד המקסימום והמינימום משתנים.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 2rem" }}>
        {[{label:"a (מקדם x)",val:a,set:setA},{label:"b (מקדם y)",val:b,set:setB}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={-5} max={10} step={1} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 240 170" className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={ox} y1={20} x2={ox} y2={oy+10} stroke="#94a3b8" strokeWidth={1}/><line x1={ox-10} y1={oy} x2={ox+6*sc+10} y2={oy} stroke="#94a3b8" strokeWidth={1}/>
          <polygon points={vertices.map(v=>`${toSx(v.x)},${toSy(v.y)}`).join(" ")} fill={`${st.accentColor}08`} stroke={st.accentColor} strokeWidth={2}/>
          {zVals.map((v,i)=>{const isMax=v.label===maxV.label;const isMin=v.label===minV.label;return(<g key={i}><circle cx={toSx(v.x)} cy={toSy(v.y)} r={isMax||isMin?6:4} fill={isMax?"#34d399":isMin?"#DC2626":"#f59e0b"} opacity={0.8}/><text x={toSx(v.x)+8} y={toSy(v.y)-6} fontSize={10} fill={isMax?"#15803d":isMin?"#DC2626":"#2D3436"} fontFamily="monospace" fontWeight={700}>{v.label}: z={v.z}</text></g>);})}
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"z = ax + by",val:`z = ${a}x + ${b}y`},{label:"מקסימום",val:`${maxV.label}(${maxV.x},${maxV.y}) → z=${maxV.z}`},{label:"מינימום",val:`${minV.label}(${minV.x},${minV.y}) → z=${minV.z}`}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:13, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>שנו a ו-b — המקסימום יכול לקפוץ לקודקוד אחר! למה?</p>
    </section>
  );
}

/* ─── ConstraintSolverLab (medium) ──────────────────────────────────────────── */

function ConstraintSolverLab() {
  const [ca,setCA]=useState(5); const [cb,setCB]=useState(4);
  const st=STATION.medium;
  // Fixed constraints: x+y≤8, 2x+y≤12, x≥0, y≥0
  // Vertices: (0,0), (0,8), (4,4), (6,0)
  const vertices=[{label:"O",x:0,y:0},{label:"A",x:0,y:8},{label:"B",x:4,y:4},{label:"C",x:6,y:0}];
  const zVals=vertices.map(v=>({...v,z:ca*v.x+cb*v.y}));
  const maxV=zVals.reduce((p,c)=>c.z>p.z?c:p);
  const sc=16,ox=40,oy=160;
  const toSx=(x:number)=>ox+x*sc; const toSy=(y:number)=>oy-y*sc;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת אילוצים + מקסימום</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>אילוצים קבועים (x+y≤8, 2x+y≤12). שנו את מקדמי z וצפו כיצד האופטימום זז.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 2rem" }}>
        {[{label:"מקדם x ב-z",val:ca,set:setCA},{label:"מקדם y ב-z",val:cb,set:setCB}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={0} max={10} step={1} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 220 190" className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={ox} y1={15} x2={ox} y2={oy+10} stroke="#94a3b8" strokeWidth={1}/><line x1={ox-10} y1={oy} x2={ox+8*sc+10} y2={oy} stroke="#94a3b8" strokeWidth={1}/>
          {/* Constraint lines */}
          <line x1={toSx(0)} y1={toSy(8)} x2={toSx(8)} y2={toSy(0)} stroke="#64748b" strokeWidth={0.8} strokeDasharray="3,3" opacity={0.4}/>
          <line x1={toSx(0)} y1={toSy(12)} x2={toSx(6)} y2={toSy(0)} stroke="#64748b" strokeWidth={0.8} strokeDasharray="3,3" opacity={0.4}/>
          {/* Region */}
          <polygon points={vertices.map(v=>`${toSx(v.x)},${toSy(v.y)}`).join(" ")} fill={`${st.accentColor}08`} stroke={st.accentColor} strokeWidth={2}/>
          {/* Vertices */}
          {zVals.map((v,i)=>{const isMax=v.label===maxV.label;return(<g key={i}><circle cx={toSx(v.x)} cy={toSy(v.y)} r={isMax?7:4} fill={isMax?"#34d399":"#f59e0b"} opacity={0.8}/>{isMax&&<circle cx={toSx(v.x)} cy={toSy(v.y)} r={10} fill="none" stroke="#34d399" strokeWidth={1.5}/>}<text x={toSx(v.x)+10} y={toSy(v.y)-4} fontSize={9} fill={isMax?"#15803d":"#2D3436"} fontFamily="monospace" fontWeight={700}>z={v.z}</text></g>);})}
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"פונקציית מטרה",val:`z = ${ca}x + ${cb}y`},{label:"מקסימום",val:`${maxV.label}(${maxV.x},${maxV.y}) → z=${maxV.z}`}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:14, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>הגדילו את מקדם x — המקסימום עובר לקודקוד עם x גבוה יותר!</p>
    </section>
  );
}

/* ─── FactoryLab (advanced) ────────────────────────────────────────────────── */

function FactoryLab() {
  const [profitA,setProfitA]=useState(30); const [profitB,setProfitB]=useState(50);
  const st=STATION.advanced;
  // 2x+y≤100, x+3y≤120, x≥0, y≥0
  // Vertices: (0,0), (50,0), (0,40), (36,28)
  // Intersection: 2x+y=100 & x+3y=120 → x=36, y=28
  const vertices=[{label:"O",x:0,y:0},{label:"A",x:50,y:0},{label:"B",x:36,y:28},{label:"C",x:0,y:40}];
  const zVals=vertices.map(v=>({...v,z:profitA*v.x+profitB*v.y}));
  const maxV=zVals.reduce((p,c)=>c.z>p.z?c:p);
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת המפעל</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו את הרווח ליחידה מכל מוצר — צפו כיצד השילוב האופטימלי משתנה.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 2rem" }}>
        {[{label:"רווח מ-A (₪/יח')",val:profitA,set:setProfitA},{label:"רווח מ-B (₪/יח')",val:profitB,set:setProfitB}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}₪</span></div><input type="range" min={0} max={100} step={5} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      {/* Results table */}
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, textAlign:"center" }}>
          <thead><tr>{["קודקוד","x (A)","y (B)","z = רווח"].map(h=>(<th key={h} style={{ padding:"8px", borderBottom:"2px solid rgba(220,38,38,0.2)", color:st.accentColor, fontWeight:700 }}>{h}</th>))}</tr></thead>
          <tbody>{zVals.map(v=>{const isMax=v.label===maxV.label;return(<tr key={v.label} style={{ background:isMax?"rgba(52,211,153,0.1)":"transparent" }}><td style={{ padding:"6px", borderBottom:"1px solid rgba(60,54,42,0.08)", fontWeight:isMax?800:500, color:isMax?"#15803d":"#2D3436" }}>{v.label}</td><td style={{ padding:"6px", borderBottom:"1px solid rgba(60,54,42,0.08)", fontFamily:"monospace" }}>{v.x}</td><td style={{ padding:"6px", borderBottom:"1px solid rgba(60,54,42,0.08)", fontFamily:"monospace" }}>{v.y}</td><td style={{ padding:"6px", borderBottom:"1px solid rgba(60,54,42,0.08)", fontFamily:"monospace", fontWeight:isMax?800:500, color:isMax?"#15803d":"#2D3436" }}>{v.z}₪</td></tr>);})}</tbody>
        </table>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"אופטימום",val:`${maxV.label}(${maxV.x},${maxV.y})`},{label:"ייצור A",val:`${maxV.x} יח'`},{label:"רווח מקסימלי",val:`${maxV.z}₪`}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:17, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>כשהרווח מ-B גדל מאוד — משתלם לייצר יותר B ופחות A!</p>
    </section>
  );
}

/* ─── Tabs + FormulaBar ────────────────────────────────────────────────────── */

const TABS=[{id:"basic",label:"מתחיל",textColor:"text-green-700",border:"border-green-600",bg:"bg-green-600/10",glowColor:"rgba(22,163,74,0.3)"},{id:"medium",label:"בינוני",textColor:"text-orange-700",border:"border-orange-600",bg:"bg-orange-600/10",glowColor:"rgba(234,88,12,0.3)"},{id:"advanced",label:"מתקדם",textColor:"text-red-700",border:"border-red-700",bg:"bg-red-700/10",glowColor:"rgba(220,38,38,0.3)"}];

function FormulaBar() {
  const [activeTab,setActiveTab]=useState<"objective"|"vertices"|"method"|null>(null);
  const tabs=[{id:"objective" as const,label:"🎯 פונקציית מטרה",tex:"z = ax + by",color:"#16A34A",borderColor:"rgba(22,163,74,0.35)"},{id:"vertices" as const,label:"📐 קודקודים",tex:"(x_i, y_i)",color:"#EA580C",borderColor:"rgba(234,88,12,0.35)"},{id:"method" as const,label:"📋 שיטת פתרון",tex:"\\max z",color:"#DC2626",borderColor:"rgba(220,38,38,0.35)"}];
  return (
    <div style={{ borderRadius:12, border:"1px solid rgba(60,54,42,0.15)", background:"rgba(255,255,255,0.75)", padding:"1.25rem", marginBottom:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginBottom:12, textAlign:"center" }}>נוסחאות</div>
      <div style={{ display:"flex", gap:6, marginBottom:activeTab?14:0 }}>{tabs.map(t=>{const isA=activeTab===t.id;return(<button key={t.id} onClick={()=>setActiveTab(isA?null:t.id)} style={{ flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", border:`1.5px solid ${isA?t.borderColor:"rgba(60,54,42,0.1)"}`, background:isA?`${t.color}0D`:"rgba(60,54,42,0.03)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{ fontSize:11, fontWeight:700, color:isA?t.color:"#6B7280" }}>{t.label}</span><span style={{ color:isA?t.color:"#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>);})}</div>
      {activeTab==="objective"&&(<motion.div key="o" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(22,163,74,0.25)", background:"rgba(220,252,231,0.4)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"z = ax + by"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>פונקציית מטרה</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>ביטוי לינארי שרוצים למקסם או למזער.</li><li>a ו-b = מקדמים (רווח, עלות וכו').</li><li>המקסימום/מינימום מושג תמיד בקודקוד של התחום.</li></ol></div></div></div></motion.div>)}
      {activeTab==="vertices"&&(<motion.div key="v" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(234,88,12,0.25)", background:"rgba(255,247,237,0.95)", padding:16 }}><div style={{ borderRadius:10, background:"rgba(234,88,12,0.06)", border:"1px solid rgba(234,88,12,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>מציאת קודקודים</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>חיתוך כל זוג אילוצים: שימו = במקום ≤.</li><li>חיתוך אילוצים עם הצירים (x=0 או y=0).</li><li>בדקו שכל קודקוד מקיים את כל האילוצים.</li></ol></div><div style={{ marginTop:10, color:"#B45309", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 קודקוד שלא מקיים אילוץ — לא בתחום האפשרי!</div></div></div></motion.div>)}
      {activeTab==="method"&&(<motion.div key="m" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(220,38,38,0.25)", background:"rgba(254,242,242,0.95)", padding:16 }}><div style={{ borderRadius:10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>שיטת פתרון מלאה</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>הגדירו x, y (משתני ההחלטה).</li><li>כתבו אילוצים (כולל x≥0, y≥0).</li><li>שרטטו את התחום האפשרי.</li><li>מצאו קודקודים.</li><li>הציבו בפונקציית המטרה z = ax + by.</li><li>בחרו את הקודקוד עם z מקסימלי/מינימלי.</li></ol></div></div></div></motion.div>)}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function ObjectiveFunctionPage() {
  const [selectedLevel,setSelectedLevel]=useState<"basic"|"medium"|"advanced">("basic");
  const ex=exercises.find(e=>e.id===selectedLevel)!;
  const lvlRgb=selectedLevel==="basic"?"45,90,39":selectedLevel==="medium"?"163,79,38":"139,38,53";
  return (
    <main style={{ minHeight:"100vh", background:"#F3EFE0", backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:"#2D3436", ["--lvl-rgb" as string]:lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`textarea,input[type="text"],input[type="password"]{outline:none!important}textarea:focus,input[type="text"]:focus{outline:none!important;border-color:rgba(var(--lvl-rgb),0.65)!important;box-shadow:0 0 0 3px rgba(var(--lvl-rgb),0.12)!important}input[type="range"]{outline:none!important}input[type="range"]:focus{outline:none!important}button:focus,button:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(var(--lvl-rgb),0.35)!important}button:focus:not(:focus-visible){box-shadow:none!important}`}</style>
      <div style={{ borderBottom:"1px solid rgba(60,54,42,0.15)", background:"#F3EFE0" }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div><h1 style={{ fontSize:22, fontWeight:700, color:"#2D3436", margin:0 }}>פונקציית מטרה עם AI — כיתה יב׳ (3 יח׳)</h1><p style={{ fontSize:13, color:"#6B7280", margin:"2px 0 0" }}>מקסימום ומינימום בתחום אפשרי — ואיך לשאול AI את השאלות הנכונות</p></div>
          <Link href="/3u/topic/grade12/linear-programming" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap" }} onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D";}} onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A";}}><span style={{ fontSize:16 }}>←</span>חזרה</Link>
        </div>
      </div>
      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="3u/grade12/linear-programming/objective"/>
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(60,54,42,0.15)" }}>{TABS.map(tab=>{const active=selectedLevel===tab.id;return(<button key={tab.id} onClick={()=>setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active?`${tab.bg} border ${tab.border} ${tab.textColor}`:"text-stone-500 hover:text-stone-800"}`} style={active?{boxShadow:`0 0 14px ${tab.glowColor}`}:undefined}>{tab.label}</button>);})}</div>
        <FormulaBar/>
        <motion.div key={selectedLevel} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22}}><ExerciseCard ex={ex}/></motion.div>
        {selectedLevel==="basic"&&<ObjectiveFunctionLab/>}
        {selectedLevel==="medium"&&<ConstraintSolverLab/>}
        {selectedLevel==="advanced"&&<FactoryLab/>}
        <div style={{ marginTop:"1.5rem" }}><MarkComplete subtopicId="3u/grade12/linear-programming/objective" level={selectedLevel}/></div>
      </div>
    </main>
  );
}
