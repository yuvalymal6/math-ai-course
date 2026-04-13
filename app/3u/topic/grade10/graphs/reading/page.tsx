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
  // Generic rising function graph
  const pts = "40,130 70,110 100,90 130,95 160,60 190,50 220,55";
  return (
    <svg viewBox="0 0 260 160" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={20} x2={40} y2={140} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={130} x2={240} y2={130} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={36} y={16} fontSize={11} fill="#94a3b8" textAnchor="middle" fontFamily="serif">y</text>
      <text x={245} y={133} fontSize={11} fill="#94a3b8" fontFamily="serif">x</text>
      <polyline points={pts} fill="none" stroke="#16A34A" strokeWidth={2.5} strokeLinejoin="round" opacity={0.7} />
      {/* Question marks at key points */}
      <circle cx={100} cy={90} r={4} fill="#f59e0b" opacity={0.7} />
      <text x={100} y={82} fontSize={10} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">?</text>
      <circle cx={190} cy={50} r={4} fill="#a78bfa" opacity={0.7} />
      <text x={190} y={42} fontSize={10} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">?</text>
    </svg>
  );
}

function MediumSVG() {
  // Parabola-like curve with marked regions
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const x = 40 + i * 3.2;
    const t = (i - 30) / 10;
    const y = 40 + 70 * (t * t * 0.8 - 0.5 * t * t * t * 0.1);
    pts.push(`${x},${y}`);
  }
  return (
    <svg viewBox="0 0 270 170" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={15} x2={40} y2={150} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={25} y1={140} x2={250} y2={140} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={36} y={12} fontSize={11} fill="#94a3b8" textAnchor="middle" fontFamily="serif">y</text>
      <text x={255} y={143} fontSize={11} fill="#94a3b8" fontFamily="serif">x</text>
      <polyline points={pts.join(" ")} fill="none" stroke="#EA580C" strokeWidth={2.5} strokeLinejoin="round" opacity={0.7} />
      {/* Arrow markers for increase/decrease */}
      <text x={80} y={105} fontSize={11} fill="#16A34A" textAnchor="middle" fontFamily="sans-serif">↗</text>
      <text x={180} y={65} fontSize={11} fill="#DC2626" textAnchor="middle" fontFamily="sans-serif">↘</text>
      {/* Peak ? */}
      <circle cx={130} cy={38} r={4} fill="#f59e0b" opacity={0.7} />
      <text x={130} y={30} fontSize={10} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">?</text>
    </svg>
  );
}

function AdvancedSVG() {
  // Piecewise function with multiple features
  return (
    <svg viewBox="0 0 280 180" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={15} x2={40} y2={160} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={25} y1={140} x2={260} y2={140} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={36} y={12} fontSize={11} fill="#94a3b8" textAnchor="middle" fontFamily="serif">y</text>
      <text x={265} y={143} fontSize={11} fill="#94a3b8" fontFamily="serif">x</text>
      {/* Piecewise: rise, flat, drop, rise */}
      <polyline points="50,130 90,70 130,70 160,120 200,40 240,60" fill="none" stroke="#DC2626" strokeWidth={2.5} strokeLinejoin="round" opacity={0.7} />
      {/* X-axis crossing points */}
      <circle cx={50} cy={130} r={3} fill="#64748b" />
      <circle cx={160} cy={120} r={3} fill="#64748b" />
      {/* Max/min ? */}
      <circle cx={90} cy={70} r={4} fill="#f59e0b" opacity={0.7} />
      <circle cx={160} cy={120} r={4} fill="#a78bfa" opacity={0.7} />
      <circle cx={200} cy={40} r={4} fill="#34d399" opacity={0.7} />
      <text x={90} y={62} fontSize={9} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">?</text>
      <text x={160} y={134} fontSize={9} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">?</text>
      <text x={200} y={32} fontSize={9} fill="#34d399" textAnchor="middle" fontFamily="sans-serif">?</text>
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
      <MasterPromptGate onPass={()=>setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["גרף","פונקציה","עלייה","ירידה","מקסימום","מינימום","תחום"]}/>
      {steps.map((s,i)=>(<div key={i} style={{ marginBottom:8 }}>{(!masterPassed||i>=unlockedCount)?(<div style={{ borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", background:"rgba(255,255,255,0.7)", padding:"14px 16px", opacity:0.5, pointerEvents:"none" as const, display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ color:"#6B7280", fontSize:13, fontWeight:600 }}>{s.phase} — {s.label}</span><span style={{ fontSize:16 }}>🔒</span></div>):(<div><div style={{ borderRadius:14, border:"1px solid rgba(22,163,74,0.3)", background:"rgba(255,255,255,0.9)", padding:"14px 16px", marginBottom:8 }}><div style={{ color:"#15803d", fontSize:13, fontWeight:700, marginBottom:6 }}>{s.phase} — {s.label}</div><div style={{ color:"#334155", fontSize:13, lineHeight:1.6 }}>{s.prompt}</div></div><button onClick={()=>setUnlockedCount(v=>Math.max(v,i+2))} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}
      {allPassed&&(<div style={{ borderRadius:16, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:"1.25rem 1.5rem", marginTop:16, textAlign:"center" }}><div style={{ fontSize:28, marginBottom:8 }}>🏆</div><div style={{ color:"#14532d", fontWeight:800, fontSize:16, marginBottom:4 }}>כל הכבוד — השלמת את הרמה המתקדמת!</div><div style={{ color:"#166534", fontSize:13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}
    </div>
  );
}

/* ─── Exercise Data ────────────────────────────────────────────────────────── */

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "קריאת ערכים מגרף",
    problem: "נתון גרף של פונקציה f.\n\nא. מצאו את f(2) ואת f(5) מתוך הגרף.\nב. לאילו ערכי x מתקיים f(x) = 0? (נקודות חיתוך עם ציר x).\nג. מהו התחום של f ומהו הטווח שלה?",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בין f(x) ל-x", text: "f(2) שואל: מהו ערך ה-y כש-x=2. תלמידים לפעמים קוראים את ערך ה-x במקום ה-y. תמיד — f(x) = ערך על ציר Y מעל/מתחת ל-x." },
      { title: "⚠️ בלבול בין תחום לטווח", text: "תחום = כל ערכי x שבהם הפונקציה מוגדרת (אופקי). טווח = כל ערכי y שהפונקציה מקבלת (אנכי). תלמידים מחליפים ביניהם." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י' ומצרף/ת שאלה על קריאת ערכים מגרף — מציאת f(x), חיתוך ציר x, תחום וטווח. אני רוצה שתהיה המורה הפרטי שלי — תסביר לי את הלוגיקה ולא תיתן תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"מציאת f(2) ו-f(5)", coaching:"", prompt:"נתון גרף של f. תנחה אותי — איך מוצאים f(2): הולכים ל-x=2 ועולים/יורדים עד הגרף, וקוראים את ה-y.", keywords:[], keywordHint:"", contextWords:["גרף","ערך","x","y","f(x)","קריאה"] },
      { phase:"סעיף ב׳", label:"חיתוך ציר x", coaching:"", prompt:"תכווין אותי — איך מוצאים לאילו ערכי x מתקיים f(x)=0. מה זה אומר על הגרף — היכן הוא חותך את ציר x.", keywords:[], keywordHint:"", contextWords:["חיתוך","ציר","אפס","f(x)=0","נקודה","x"] },
      { phase:"סעיף ג׳", label:"תחום וטווח", coaching:"", prompt:"תדריך אותי — מהו התחום (כל ערכי x שבהם f מוגדרת) ומהו הטווח (כל ערכי y שהגרף מקבל). איך קוראים את זה מהגרף.", keywords:[], keywordHint:"", contextWords:["תחום","טווח","x","y","מוגדר","ערכים"] },
    ],
  },
  {
    id: "medium",
    title: "תחומי עלייה, ירידה ונקודות קיצון",
    problem: "נתון גרף של פונקציה g.\n\nא. באילו תחומים הפונקציה עולה ובאילו היא יורדת?\nב. מצאו את נקודות המקסימום והמינימום המקומיות.\nג. האם יש נקודות שבהן הפונקציה מחליפה כיוון? תארו מה קורה בהן.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בין מקסימום מקומי לגלובלי", text: "מקסימום מקומי = נקודה שבה הפונקציה גבוהה מהשכנות שלה, אבל לא בהכרח הגבוהה ביותר בכל הגרף. תלמידים כותבים רק את המקסימום הגלובלי ושוכחים את המקומיים." },
      { title: "⚠️ תחום עלייה לעומת נקודת מקסימום", text: "תחום עלייה = קטע שבו הגרף עולה (כתובים כ-x). נקודת מקסימום = הנקודה עצמה (x, y). אלו שני דברים שונים — אל תערבבו." },
    ],
    goldenPrompt: `אני בכיתה י', ומצרף/ת שאלה על קריאת גרף — תחומי עלייה/ירידה ונקודות קיצון.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על זיהוי כיוון הגרף.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"תחומי עלייה וירידה", coaching:"", prompt:"נתון גרף של g. תנחה אותי — איך מזהים היכן הגרף עולה (משמאל לימין) והיכן הוא יורד. איך כותבים תחומים.", keywords:[], keywordHint:"", contextWords:["עלייה","ירידה","תחום","גרף","כיוון","שמאל לימין"] },
      { phase:"סעיף ב׳", label:"נקודות מקסימום ומינימום", coaching:"", prompt:"תכווין אותי — איך מזהים נקודת מקסימום מקומי (פסגה) ומינימום מקומי (שפל) על הגרף.", keywords:[], keywordHint:"", contextWords:["מקסימום","מינימום","מקומי","נקודה","פסגה","שפל"] },
      { phase:"סעיף ג׳", label:"נקודות החלפת כיוון", coaching:"", prompt:"תדריך אותי — מה קורה בנקודה שבה הפונקציה מחליפה כיוון מעלייה לירידה (או להפך). איך מזהים על הגרף.", keywords:[], keywordHint:"", contextWords:["החלפה","כיוון","מעבר","עלייה","ירידה","נקודה"] },
    ],
  },
  {
    id: "advanced",
    title: "ניתוח מלא של גרף פונקציה",
    problem: "נתון גרף של פונקציה h המוגדרת בתחום מסוים.\n\nא. מצאו את התחום, הטווח, ונקודות החיתוך עם הצירים.\nב. ציינו את תחומי העלייה, הירידה ונקודות הקיצון.\nג. לאילו ערכי x מתקיים h(x) > 0 ולאילו h(x) < 0?\nד. שרטטו סקיצה של פונקציה אחרת שעונה על אותם תנאים של עלייה/ירידה אבל עם נקודות חיתוך שונות.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בין f(x) > 0 לבין תחום עלייה", text: "f(x) > 0 = הגרף מעל ציר x (חיובי). תחום עלייה = הגרף עולה (שיפוע חיובי). הגרף יכול לעלות ולהיות שלילי בו-זמנית! אלו מושגים שונים לחלוטין." },
      { title: "⚠️ שכחת נקודות קצה בתחום סגור", text: "כשהתחום סגור (כולל את הקצוות), חובה לבדוק גם את ערכי הפונקציה בקצוות — ייתכן שהמקסימום/מינימום הגלובלי דווקא שם ולא בנקודת קיצון מקומית." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: מה ההבדל בין f(x)>0 לבין תחום עלייה, ואיך מוצאים את שניהם מגרף? (לפחות 80 תווים)",
    steps: [
      { phase:"סעיף א׳", label:"תחום, טווח וחיתוכים", coaching:"", prompt:"נתון גרף של h. תנחה אותי למצוא את התחום (ערכי x), הטווח (ערכי y), ונקודות חיתוך עם שני הצירים.", keywords:[], keywordHint:"", contextWords:["תחום","טווח","חיתוך","ציר","x","y"] },
      { phase:"סעיף ב׳", label:"עלייה, ירידה וקיצון", coaching:"", prompt:"תכווין אותי לזהות את תחומי העלייה והירידה של h, ולמצוא נקודות מקסימום ומינימום מקומיות.", keywords:[], keywordHint:"", contextWords:["עלייה","ירידה","מקסימום","מינימום","תחום","נקודה"] },
      { phase:"סעיף ג׳", label:"h(x)>0 ו-h(x)<0", coaching:"", prompt:"תדריך אותי — איך מזהים מהגרף היכן h(x)>0 (מעל ציר x) והיכן h(x)<0 (מתחת). מה הקשר לנקודות החיתוך.", keywords:[], keywordHint:"", contextWords:["חיובי","שלילי","מעל","מתחת","ציר","חיתוך"] },
      { phase:"סעיף ד׳", label:"סקיצה של פונקציה אחרת", coaching:"", prompt:"תנחה אותי לשרטט פונקציה חדשה שעולה ויורדת באותם תחומים אבל חותכת את ציר x במקומות שונים. מה חייב להישאר זהה ומה יכול להשתנות.", keywords:[], keywordHint:"", contextWords:["סקיצה","שרטוט","עלייה","ירידה","חיתוך","שונה"] },
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
        <div style={{ textAlign:"center", marginBottom:14 }}><div style={{ color:s.accentColor, fontSize:15, fontWeight:800, marginBottom:4 }}>📊 קריאת גרפים</div><div style={{ color:"#6B7280", fontSize:12, lineHeight:1.55 }}>{ex.id==="basic"&&"קריאת ערכים, חיתוך צירים, תחום וטווח."}{ex.id==="medium"&&"תחומי עלייה/ירידה, נקודות מקסימום ומינימום."}{ex.id==="advanced"&&"ניתוח מלא — חיתוכים, קיצון, סימן הפונקציה."}</div></div>
        <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:14 }}/>
        <div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>🎯 מושגי יסוד</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:110 }}>תחום</span><span>כל ערכי x שבהם f מוגדרת</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:110 }}>טווח</span><span>כל ערכי y שהפונקציה מקבלת</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:110 }}>f(x) = 0</span><span>חיתוך ציר x</span></div></div></div>
        {ex.id!=="basic"&&(<><div style={{ height:1, background:"rgba(60,54,42,0.08)", marginBottom:12 }}/><div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>✨ {ex.id==="medium"?"עלייה וירידה":"ניתוח מלא"}</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}>{ex.id==="medium"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:110 }}>עולה</span><span>הגרף עולה משמאל לימין</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:110 }}>מקסימום</span><span>נקודה שבה הפונקציה עוברת מעלייה לירידה</span></div></>}{ex.id==="advanced"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:110 }}>f(x) &gt; 0</span><span>הגרף מעל ציר x</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:110 }}>f(x) &lt; 0</span><span>הגרף מתחת לציר x</span></div></>}</div></div></>)}
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

/* ─── GraphReaderLab (basic) ───────────────────────────────────────────────── */

function GraphReaderLab() {
  const [xQuery,setXQuery]=useState(3);
  const st=STATION.basic;
  // f(x) = -0.5(x-4)² + 6, domain [0,8]
  const f=(x:number)=>-0.5*(x-4)*(x-4)+6;
  const yVal=f(xQuery);
  const roots:number[]=[]; for(let x=0;x<=8;x+=0.01){if(Math.abs(f(x))<0.05) roots.push(Math.round(x*10)/10);}
  const uniqueRoots=[...new Set(roots.map(r=>r.toFixed(1)))];
  // SVG
  const ox=40,oy=140,sc=22;
  const toSx=(x:number)=>ox+x*sc; const toSy=(y:number)=>oy-y*sc;
  const pts:string[]=[];for(let x=0;x<=8;x+=0.2){pts.push(`${toSx(x)},${toSy(f(x))}`);}
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת קריאת ערכים</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>הזיזו את x וקראו את f(x) מהגרף.</p>
      <div style={{ maxWidth:400, margin:"0 auto 2rem" }}><div style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>x</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{xQuery}</span></div><input type="range" min={0} max={8} step={0.5} value={xQuery} onChange={e=>setXQuery(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div></div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 260 170" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Grid */}
          {[0,1,2,3,4,5,6,7,8].map(v=>(<line key={`gx${v}`} x1={toSx(v)} y1={toSy(-2)} x2={toSx(v)} y2={toSy(7)} stroke="#e5e7eb" strokeWidth={0.5}/>))}
          {[-2,-1,0,1,2,3,4,5,6].map(v=>(<line key={`gy${v}`} x1={toSx(0)} y1={toSy(v)} x2={toSx(8)} y2={toSy(v)} stroke="#e5e7eb" strokeWidth={0.5}/>))}
          {/* Axes */}
          <line x1={toSx(0)} y1={toSy(-2)} x2={toSx(0)} y2={toSy(7)} stroke="#94a3b8" strokeWidth={1.2}/>
          <line x1={toSx(-0.2)} y1={toSy(0)} x2={toSx(8.3)} y2={toSy(0)} stroke="#94a3b8" strokeWidth={1.2}/>
          {/* Curve */}
          <polyline points={pts.join(" ")} fill="none" stroke="#16A34A" strokeWidth={2.5}/>
          {/* Query line */}
          <line x1={toSx(xQuery)} y1={toSy(-2)} x2={toSx(xQuery)} y2={toSy(7)} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2"/>
          <circle cx={toSx(xQuery)} cy={toSy(yVal)} r={5} fill="#f59e0b"/>
          <text x={toSx(xQuery)+8} y={toSy(yVal)-4} fontSize={10} fill="#f59e0b" fontFamily="monospace">({xQuery}, {yVal.toFixed(1)})</text>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"f(x)",val:yVal.toFixed(1)},{label:"חיתוך ציר x",val:uniqueRoots.join(", ")||"—"},{label:"מקסימום",val:"(4, 6)"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:17, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>הזיזו את x — הנקודה הכתומה עוקבת אחרי הגרף. לאן f(x) = 0?</p>
    </section>
  );
}

/* ─── IncreaseDecreaseLab (medium) ──────────────────────────────────────────── */

function IncreaseDecreaseLab() {
  const [a,setA]=useState(-0.3); const [h,setH]=useState(4); const [k,setK]=useState(5);
  const st=STATION.medium;
  const f=(x:number)=>a*(x-h)*(x-h)+k;
  const direction=a>0?"מינימום":"מקסימום";
  const inc=a>0?`(${h}, ∞)`:`(-∞, ${h})`; const dec=a>0?`(-∞, ${h})`:`(${h}, ∞)`;
  const ox2=40,oy2=140,sc2=18;
  const toSx2=(x:number)=>ox2+x*sc2; const toSy2=(y:number)=>oy2-y*sc2;
  const pts2:string[]=[];for(let x=-1;x<=9;x+=0.2){const y=f(x);if(y>-3&&y<10) pts2.push(`${toSx2(x)},${toSy2(y)}`);}
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת עלייה וירידה</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו פרמטרים וצפו כיצד תחומי העלייה והירידה משתנים.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, maxWidth:500, margin:"0 auto 2rem" }}>
        {[{label:"a (כיוון)",val:a,set:setA,min:-1,max:1,step:0.1},{label:"h (קודקוד x)",val:h,set:setH,min:1,max:7,step:0.5},{label:"k (קודקוד y)",val:k,set:setK,min:-2,max:8,step:0.5}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:12, border:"1px solid rgba(255,255,255,0.4)", padding:"0.75rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 260 170" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Axes */}
          <line x1={toSx2(0)} y1={toSy2(-3)} x2={toSx2(0)} y2={toSy2(10)} stroke="#94a3b8" strokeWidth={1.2}/>
          <line x1={toSx2(-1)} y1={toSy2(0)} x2={toSx2(9)} y2={toSy2(0)} stroke="#94a3b8" strokeWidth={1.2}/>
          {pts2.length>1&&<polyline points={pts2.join(" ")} fill="none" stroke="#EA580C" strokeWidth={2.5}/>}
          {/* Vertex */}
          <circle cx={toSx2(h)} cy={toSy2(k)} r={5} fill="#f59e0b"/>
          <text x={toSx2(h)+8} y={toSy2(k)-4} fontSize={9} fill="#f59e0b" fontFamily="monospace">({h},{k})</text>
          {/* Arrows */}
          {a!==0&&<><text x={toSx2(h-2)} y={toSy2(k-1)} fontSize={14} fill={a>0?"#DC2626":"#16A34A"} textAnchor="middle">{a>0?"↘":"↗"}</text><text x={toSx2(h+2)} y={toSy2(k-1)} fontSize={14} fill={a>0?"#16A34A":"#DC2626"} textAnchor="middle">{a>0?"↗":"↘"}</text></>}
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"עולה",val:inc},{label:"יורדת",val:dec},{label:direction,val:`(${h}, ${k})`}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:15, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>כש-a &gt; 0 הפרבולה פתוחה למעלה (מינימום). כש-a &lt; 0 — למטה (מקסימום).</p>
    </section>
  );
}

/* ─── SignAnalysisLab (advanced) ────────────────────────────────────────────── */

function SignAnalysisLab() {
  const [r1,setR1]=useState(1); const [r2,setR2]=useState(5);
  const st=STATION.advanced;
  const f=(x:number)=>-0.4*(x-r1)*(x-r2);
  const vertex=(r1+r2)/2; const vY=f(vertex);
  const ox3=30,oy3=130,sc3=22;
  const toSx3=(x:number)=>ox3+x*sc3; const toSy3=(y:number)=>oy3-y*sc3;
  const pts3:string[]=[];for(let x=-1;x<=9;x+=0.15){const y=f(x);if(y>-5&&y<8) pts3.push(`${toSx3(x)},${toSy3(y)}`);}
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת סימן הפונקציה</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>הזיזו את השורשים — צפו היכן f(x)&gt;0 והיכן f(x)&lt;0.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 2rem" }}>
        {[{label:"שורש r₁",val:r1,set:setR1},{label:"שורש r₂",val:r2,set:setR2}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={0} max={8} step={0.5} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 270 170" className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={toSx3(-1)} y1={toSy3(0)} x2={toSx3(9)} y2={toSy3(0)} stroke="#94a3b8" strokeWidth={1.2}/>
          <line x1={toSx3(0)} y1={toSy3(-5)} x2={toSx3(0)} y2={toSy3(8)} stroke="#94a3b8" strokeWidth={1.2}/>
          {/* Positive region fill */}
          {r1<r2&&<rect x={toSx3(r1)} y={toSy3(Math.max(vY,0))} width={toSx3(r2)-toSx3(r1)} height={toSy3(0)-toSy3(Math.max(vY,0))} fill="rgba(22,163,74,0.08)" rx={4}/>}
          {pts3.length>1&&<polyline points={pts3.join(" ")} fill="none" stroke="#DC2626" strokeWidth={2.5}/>}
          {/* Roots */}
          <circle cx={toSx3(r1)} cy={toSy3(0)} r={5} fill="#f59e0b"/><text x={toSx3(r1)} y={toSy3(0)+16} fontSize={9} fill="#f59e0b" textAnchor="middle" fontFamily="monospace">r₁={r1}</text>
          <circle cx={toSx3(r2)} cy={toSy3(0)} r={5} fill="#a78bfa"/><text x={toSx3(r2)} y={toSy3(0)+16} fontSize={9} fill="#a78bfa" textAnchor="middle" fontFamily="monospace">r₂={r2}</text>
          {/* Sign labels */}
          <text x={toSx3(Math.max(r1-2,0))} y={toSy3(-1)} fontSize={12} fill="#DC2626" textAnchor="middle">−</text>
          {r1<r2&&<text x={toSx3((r1+r2)/2)} y={toSy3(vY/2+0.5)} fontSize={12} fill="#16A34A" textAnchor="middle">+</text>}
          <text x={toSx3(Math.min(r2+2,9))} y={toSy3(-1)} fontSize={12} fill="#DC2626" textAnchor="middle">−</text>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"f(x) > 0",val:r1<r2?`(${r1}, ${r2})`:"—"},{label:"f(x) < 0",val:r1<r2?`(-∞,${r1})∪(${r2},∞)`:"הכל"},{label:"מקסימום",val:`(${vertex.toFixed(1)}, ${vY.toFixed(1)})`}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:14, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>האזור הירוק = f(x)&gt;0. בין השורשים הפונקציה חיובית (כי a&lt;0 ופתוחה למטה).</p>
    </section>
  );
}

/* ─── Tabs + FormulaBar ────────────────────────────────────────────────────── */

const TABS=[{id:"basic",label:"מתחיל",textColor:"text-green-700",border:"border-green-600",bg:"bg-green-600/10",glowColor:"rgba(22,163,74,0.3)"},{id:"medium",label:"בינוני",textColor:"text-orange-700",border:"border-orange-600",bg:"bg-orange-600/10",glowColor:"rgba(234,88,12,0.3)"},{id:"advanced",label:"מתקדם",textColor:"text-red-700",border:"border-red-700",bg:"bg-red-700/10",glowColor:"rgba(220,38,38,0.3)"}];

function FormulaBar() {
  const [activeTab,setActiveTab]=useState<"read"|"trend"|"sign"|null>(null);
  const tabs=[{id:"read" as const,label:"📖 קריאת ערכים",tex:"f(x_0)=?",color:"#16A34A",borderColor:"rgba(22,163,74,0.35)"},{id:"trend" as const,label:"📈 עלייה/ירידה",tex:"f\\!\\!\\uparrow\\,f\\!\\!\\downarrow",color:"#EA580C",borderColor:"rgba(234,88,12,0.35)"},{id:"sign" as const,label:"± סימן",tex:"f(x)>0",color:"#DC2626",borderColor:"rgba(220,38,38,0.35)"}];
  return (
    <div style={{ borderRadius:12, border:"1px solid rgba(60,54,42,0.15)", background:"rgba(255,255,255,0.75)", padding:"1.25rem", marginBottom:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginBottom:12, textAlign:"center" }}>נוסחאות</div>
      <div style={{ display:"flex", gap:6, marginBottom:activeTab?14:0 }}>{tabs.map(t=>{const isA=activeTab===t.id;return(<button key={t.id} onClick={()=>setActiveTab(isA?null:t.id)} style={{ flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", border:`1.5px solid ${isA?t.borderColor:"rgba(60,54,42,0.1)"}`, background:isA?`${t.color}0D`:"rgba(60,54,42,0.03)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{ fontSize:11, fontWeight:700, color:isA?t.color:"#6B7280" }}>{t.label}</span><span style={{ color:isA?t.color:"#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>);})}</div>
      {activeTab==="read"&&(<motion.div key="r" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(22,163,74,0.25)", background:"rgba(220,252,231,0.4)", padding:16 }}><div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>קריאת ערכים מגרף</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>f(a):</strong> הולכים ל-x=a, עולים/יורדים עד הגרף, קוראים y.</li><li><strong>f(x)=0:</strong> היכן הגרף חותך את ציר x.</li><li><strong>תחום:</strong> כל ערכי x (אופקי). <strong>טווח:</strong> כל ערכי y (אנכי).</li></ol></div></div></div></motion.div>)}
      {activeTab==="trend"&&(<motion.div key="t" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(234,88,12,0.25)", background:"rgba(255,247,237,0.95)", padding:16 }}><div style={{ borderRadius:10, background:"rgba(234,88,12,0.06)", border:"1px solid rgba(234,88,12,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>עלייה, ירידה וקיצון</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>עולה:</strong> כש-x גדל, גם f(x) גדל (הגרף עולה).</li><li><strong>יורדת:</strong> כש-x גדל, f(x) קטן (הגרף יורד).</li><li><strong>מקסימום מקומי:</strong> מעבר מעלייה לירידה.</li><li><strong>מינימום מקומי:</strong> מעבר מירידה לעלייה.</li></ol></div></div></div></motion.div>)}
      {activeTab==="sign"&&(<motion.div key="s" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(220,38,38,0.25)", background:"rgba(254,242,242,0.95)", padding:16 }}><div style={{ borderRadius:10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>סימן הפונקציה</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>f(x) &gt; 0:</strong> הגרף מעל ציר x (חיובי).</li><li><strong>f(x) &lt; 0:</strong> הגרף מתחת לציר x (שלילי).</li><li>השורשים (f(x)=0) מחלקים את ציר x לתחומים.</li><li>בכל תחום הסימן קבוע — מספיק לבדוק נקודה אחת.</li></ol></div><div style={{ marginTop:10, color:"#DC2626", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 חשוב: f(x)&gt;0 ≠ "עולה"! פונקציה יכולה לעלות ולהיות שלילית.</div></div></div></motion.div>)}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function GraphReadingPage() {
  const [selectedLevel,setSelectedLevel]=useState<"basic"|"medium"|"advanced">("basic");
  const ex=exercises.find(e=>e.id===selectedLevel)!;
  const lvlRgb=selectedLevel==="basic"?"45,90,39":selectedLevel==="medium"?"163,79,38":"139,38,53";
  return (
    <main style={{ minHeight:"100vh", background:"#F3EFE0", backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:"#2D3436", ["--lvl-rgb" as string]:lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`textarea,input[type="text"],input[type="password"]{outline:none!important}textarea:focus,input[type="text"]:focus{outline:none!important;border-color:rgba(var(--lvl-rgb),0.65)!important;box-shadow:0 0 0 3px rgba(var(--lvl-rgb),0.12)!important}input[type="range"]{outline:none!important}input[type="range"]:focus{outline:none!important}button:focus,button:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(var(--lvl-rgb),0.35)!important}button:focus:not(:focus-visible){box-shadow:none!important}`}</style>
      <div style={{ borderBottom:"1px solid rgba(60,54,42,0.15)", background:"#F3EFE0" }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div><h1 style={{ fontSize:22, fontWeight:700, color:"#2D3436", margin:0 }}>קריאת גרפים עם AI — כיתה י׳ (3 יח׳)</h1><p style={{ fontSize:13, color:"#6B7280", margin:"2px 0 0" }}>קריאת ערכים, עלייה/ירידה, סימן הפונקציה — ואיך לשאול AI</p></div>
          <Link href="/3u/topic/grade10/graphs" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap" }} onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D";}} onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A";}}><span style={{ fontSize:16 }}>←</span>חזרה</Link>
        </div>
      </div>
      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="3u/grade10/graphs/reading"/>
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(60,54,42,0.15)" }}>{TABS.map(tab=>{const active=selectedLevel===tab.id;return(<button key={tab.id} onClick={()=>setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active?`${tab.bg} border ${tab.border} ${tab.textColor}`:"text-stone-500 hover:text-stone-800"}`} style={active?{boxShadow:`0 0 14px ${tab.glowColor}`}:undefined}>{tab.label}</button>);})}</div>
        <FormulaBar/>
        <motion.div key={selectedLevel} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22}}><ExerciseCard ex={ex}/></motion.div>
        {selectedLevel==="basic"&&<GraphReaderLab/>}
        {selectedLevel==="medium"&&<IncreaseDecreaseLab/>}
        {selectedLevel==="advanced"&&<SignAnalysisLab/>}
        <div style={{ marginTop:"1.5rem" }}><MarkComplete subtopicId="3u/grade10/graphs/reading" level={selectedLevel}/></div>
      </div>
    </main>
  );
}
