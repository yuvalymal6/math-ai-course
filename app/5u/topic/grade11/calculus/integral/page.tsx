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
  // Curve with shaded area under it
  const pts: string[] = [];
  for (let i = 0; i <= 50; i++) { const x = 40 + i * 3.6; const t = (i - 10) / 14; pts.push(`${x},${130 - 70 * Math.exp(-0.5 * t * t)}`); }
  return (
    <svg viewBox="0 0 260 160" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={20} x2={40} y2={140} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={130} x2={240} y2={130} stroke="#94a3b8" strokeWidth={1.2} />
      {/* Shaded area */}
      <path d={`M76,130 ${pts.slice(10, 35).join(" ")} L${40 + 34 * 3.6},130 Z`} fill="rgba(22,163,74,0.12)" />
      <polyline points={pts.join(" ")} fill="none" stroke="#16A34A" strokeWidth={2.5} opacity={0.7} />
      {/* Bounds */}
      <line x1={76} y1={35} x2={76} y2={130} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2" />
      <line x1={40 + 34 * 3.6} y1={35} x2={40 + 34 * 3.6} y2={130} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2" />
      <text x={76} y={148} fontSize={10} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">a</text>
      <text x={40 + 34 * 3.6} y={148} fontSize={10} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">b</text>
      <text x={110} y={115} fontSize={12} fill="#16A34A" textAnchor="middle" fontFamily="sans-serif">S = ?</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 260 170" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={20} x2={40} y2={150} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={25} y1={85} x2={240} y2={85} stroke="#94a3b8" strokeWidth={1.2} />
      {/* Curve crossing x-axis */}
      {(() => {
        const pts: string[] = [];
        for (let i = 0; i <= 50; i++) { const x = 40 + i * 3.8; const t = (i - 25) / 10; pts.push(`${x},${85 - 50 * (t * t * t / 3 - t)}`); }
        return <polyline points={pts.join(" ")} fill="none" stroke="#EA580C" strokeWidth={2.5} opacity={0.7} />;
      })()}
      {/* + and - regions */}
      <text x={90} y={65} fontSize={13} fill="#16A34A" textAnchor="middle" fontFamily="sans-serif">+</text>
      <text x={160} y={110} fontSize={13} fill="#DC2626" textAnchor="middle" fontFamily="sans-serif">−</text>
      <text x={130} y={155} fontSize={10} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">שטח = |∫⁺| + |∫⁻|</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 260 170" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={20} x2={40} y2={150} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={25} y1={130} x2={240} y2={130} stroke="#94a3b8" strokeWidth={1.2} />
      {/* Two curves */}
      {(() => {
        const pts1: string[] = [], pts2: string[] = [];
        for (let i = 0; i <= 50; i++) {
          const x = 50 + i * 3.6;
          const t = i / 50;
          pts1.push(`${x},${130 - 80 * (4 * t * (1 - t))}`);
          pts2.push(`${x},${130 - 30 * (1 + Math.sin(t * Math.PI * 2 - 0.5))}`);
        }
        return (<>
          <polyline points={pts1.join(" ")} fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.7} />
          <polyline points={pts2.join(" ")} fill="none" stroke="#a78bfa" strokeWidth={2} opacity={0.7} />
          {/* Shaded between */}
          <path d={`${pts1.slice(5, 40).map((p, i) => (i === 0 ? "M" : "L") + p).join(" ")} ${pts2.slice(5, 40).reverse().map((p, i) => (i === 0 ? "L" : "L") + p).join(" ")} Z`} fill="rgba(245,158,11,0.1)" />
        </>);
      })()}
      <text x={140} y={90} fontSize={11} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">S = ?</text>
      <text x={220} y={50} fontSize={10} fill="#DC2626" fontFamily="sans-serif">f</text>
      <text x={220} y={110} fontSize={10} fill="#a78bfa" fontFamily="sans-serif">g</text>
    </svg>
  );
}

/* ─── Prompt Atoms (compact) ───────────────────────────────────────────────── */
function CopyBtn({ text, label="העתק פרומפט" }: { text:string; label?:string }) { const [c,setC]=useState(false); return (<button onClick={()=>{navigator.clipboard.writeText(text);setC(true);setTimeout(()=>setC(false),2000);}} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 16px", borderRadius:12, fontSize:12, background:"rgba(255,255,255,0.75)", border:"1px solid rgba(60,54,42,0.25)", color:"#1A1A1A", fontWeight:500, cursor:"pointer" }}>{c?<Check size={13}/>:<Copy size={13}/>}{c?"הועתק!":label}</button>); }
function GoldenPromptCard({ prompt, title="פרומפט ראשי", glowRgb="16,185,129", borderRgb="45,90,39" }: { prompt:string; title?:string; glowRgb?:string; borderRgb?:string }) { return (<div style={{ borderRadius:16, background:"rgba(255,255,255,0.82)", padding:"1.25rem", marginBottom:16, border:`2px solid rgba(${borderRgb},0.45)`, boxShadow:`0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)` }}><div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}><span>✨</span><span style={{ color:"#1A1A1A", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em" }}>{title}</span></div><p style={{ color:"#1A1A1A", fontSize:14, lineHeight:1.7, marginBottom:16, whiteSpace:"pre-line", fontWeight:500 }}>{prompt}</p><CopyBtn text={prompt} label="העתק פרומפט מלא"/></div>); }
function TutorStepBasic({ step, glowRgb="16,185,129", borderRgb="45,90,39" }: { step:PromptStep; glowRgb?:string; borderRgb?:string }) { return (<div style={{ borderRadius:12, overflow:"hidden", border:`1px solid rgba(${glowRgb},0.45)`, marginBottom:8, boxShadow:`0 0 14px rgba(${glowRgb},0.18)` }}><div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px", background:"rgba(255,255,255,0.75)", borderBottom:`1px solid rgba(${glowRgb},0.25)` }}><span style={{ color:"#1A1A1A", fontSize:11, fontWeight:700 }}>{step.phase}</span><span style={{ color:"#2D3436", fontSize:11, fontWeight:600 }}>{step.label}</span></div><div style={{ background:"rgba(255,255,255,0.4)", padding:16, display:"flex", flexDirection:"column", gap:12 }}><div><div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>הפרומפט המוכן ✍️</div><div style={{ borderRadius:12, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${borderRgb},0.35)`, padding:12, fontSize:11, color:"#2D3436", lineHeight:1.6, wordBreak:"break-word" }}>{step.prompt}</div></div><CopyBtn text={step.prompt} label="העתק פרומפט ממוקד"/></div></div>); }

function TutorStepMedium({ step, locked=false, onPass, borderRgb="45,90,39" }: { step:PromptStep; locked?:boolean; onPass?:()=>void; borderRgb?:string }) {
  const [text,setText]=useState(""); const [result,setResult]=useState<ScoreResult|null>(null); const [copied,setCopied]=useState(false);
  const passed=!!(result&&!result.blocked&&result.score>=75);
  const validate=()=>{ if(text.trim().length<20){setResult({score:0,blocked:false,hint:"הניסוח קצר מדי — כתוב לפחות 20 תווים."});return;} const res=calculatePromptScore(text,step.contextWords??[]); setResult(res); if(!res.blocked&&res.score>=75) onPass?.(); };
  if(locked) return (<div style={{ borderRadius:12, border:`1px solid rgba(${borderRgb},0.3)`, background:"rgba(255,255,255,0.3)", padding:"14px 16px", marginBottom:8, opacity:0.4, userSelect:"none", display:"flex", alignItems:"center", gap:10 }}><span style={{ fontSize:16 }}>🔒</span><div><span style={{ color:"#6B7280", fontSize:11, fontWeight:700 }}>{step.phase}</span><span style={{ color:"#6B7280", fontSize:11, marginRight:8 }}>{step.label}</span></div></div>);
  const scoreBarColor=!result?"#9CA3AF":result.score>=75?"#16a34a":result.score>=50?"#d97706":"#dc2626";
  return (<div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${passed?"rgba(245,158,11,0.55)":`rgba(${borderRgb},0.35)`}`, marginBottom:8, boxShadow:passed?"0 0 16px rgba(245,158,11,0.25)":"none" }}><div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px", background:"rgba(255,255,255,0.75)", borderBottom:`1px solid ${passed?"rgba(245,158,11,0.3)":`rgba(${borderRgb},0.2)`}` }}>{passed?<CheckCircle size={14} color="#34d399"/>:<span style={{ color:"#1A1A1A", fontSize:11, fontWeight:700 }}>{step.phase}</span>}<span style={{ color:"#2D3436", fontSize:11, fontWeight:600 }}>{step.label}</span></div><div style={{ background:"rgba(255,255,255,0.4)", padding:16, display:"flex", flexDirection:"column", gap:12 }}><textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={e=>{setText(e.target.value);setResult(null);}} placeholder="נסח כאן את השאלה שלך ל-AI..." style={{ minHeight:80, maxHeight:160, width:"100%", borderRadius:12, background:"rgba(255,255,255,0.75)", border:`1px solid ${passed?"rgba(245,158,11,0.4)":`rgba(${borderRgb},0.25)`}`, color:"#2D3436", fontSize:14, padding:12, resize:"none", boxSizing:"border-box", fontFamily:"inherit" }}/>{result&&(<div><div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#1A1A1A", marginBottom:4, fontWeight:600 }}><span>ציון</span><span style={{ fontWeight:800 }}>{result.score}/100</span></div><div style={{ height:6, borderRadius:3, background:"#E5E7EB", overflow:"hidden" }}><div style={{ height:"100%", width:`${result.score}%`, borderRadius:3, background:scoreBarColor, transition:"width 0.4s ease" }}/></div></div>)}{!result&&<button onClick={validate} style={{ padding:"6px 16px", borderRadius:12, fontSize:12, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${borderRgb},0.4)`, color:"#1A1A1A", cursor:"pointer", fontWeight:500 }}>בדיקת AI מדומה 🤖</button>}{result&&result.blocked&&<motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ borderRadius:12, background:"rgba(254,226,226,1)", border:"2px solid #dc2626", padding:12, color:"#1A1A1A", fontSize:12, lineHeight:1.6 }}>⚠️ {result.hint}</motion.div>}{result&&!result.blocked&&result.score<75&&<motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ borderRadius:12, background:"rgba(255,251,235,1)", border:"2px solid #d97706", padding:12, color:"#1A1A1A", fontSize:12, lineHeight:1.6 }}>💡 {result.hint}</motion.div>}{passed&&(<motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ display:"flex", flexDirection:"column", gap:8 }}><div style={{ borderRadius:12, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:12, color:"#1A1A1A", fontSize:12, fontWeight:600 }}>✅ ציון: <strong style={{ color:"#14532d" }}>{result.score}/100</strong></div><button onClick={()=>{navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:12, fontSize:12, background:"transparent", border:"2px solid #16a34a", color:"#14532d", cursor:"pointer", fontWeight:500 }}>{copied?<Check size={12}/>:<Copy size={12}/>}{copied?"הועתק!":"העתק ל-AI"}</button></motion.div>)}{result&&!passed&&<button onClick={()=>setResult(null)} style={{ fontSize:12, color:"#475569", background:"transparent", border:"none", cursor:"pointer", textDecoration:"underline" }}>נסה שוב</button>}</div></div>);
}

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps:PromptStep[]; goldenPrompt:string; glowRgb:string; borderRgb:string }) { const [completed,setCompleted]=useState<boolean[]>(Array(steps.length).fill(false)); const unlocked=completed.filter(Boolean).length+1; const markDone=(i:number)=>{setCompleted(p=>{const n=[...p];n[i]=true;return n;});const el=document.getElementById(`basic-step-${i+1}`);if(el) setTimeout(()=>el.scrollIntoView({behavior:"smooth",block:"center"}),200);}; return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb}/>{steps.map((s,i)=>(<div key={i} id={`basic-step-${i}`}>{i<unlocked?(<><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb}/>{!completed[i]?(<button onClick={()=>markDone(i)} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button>):(<div style={{ textAlign:"center", padding:"6px 0", marginBottom:10, fontSize:12, color:"#16a34a", fontWeight:600 }}>✅ הושלם</div>)}</>):(<div style={{ opacity:0.35, pointerEvents:"none", position:"relative" }}><div style={{ position:"absolute", top:8, right:8, fontSize:16, zIndex:2 }}>🔒</div><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb}/></div>)}</div>))}</div>); }
function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb }: { steps:PromptStep[]; goldenPrompt:string; glowRgb:string; borderRgb:string }) { const [passed,setPassed]=useState<boolean[]>(Array(steps.length).fill(false)); return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb}/>{steps.map((s,i)=>(<TutorStepMedium key={i} step={s} locked={i>0&&!passed[i-1]} onPass={()=>setPassed(p=>{const n=[...p];n[i]=true;return n;})} borderRgb={borderRgb}/>))}</div>); }
function LadderAdvanced({ steps }: { steps:PromptStep[] }) { const [masterPassed,setMasterPassed]=useState(false); const [unlockedCount,setUnlockedCount]=useState(1); const allPassed=masterPassed&&unlockedCount>steps.length; return (<div><MasterPromptGate onPass={()=>setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["אינטגרל","שטח","עקומה","גבולות","F(x)","מסוים","בין"]}/>{steps.map((s,i)=>(<div key={i} style={{ marginBottom:8 }}>{(!masterPassed||i>=unlockedCount)?(<div style={{ borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", background:"rgba(255,255,255,0.7)", padding:"14px 16px", opacity:0.5, pointerEvents:"none" as const, display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ color:"#6B7280", fontSize:13, fontWeight:600 }}>{s.phase} — {s.label}</span><span style={{ fontSize:16 }}>🔒</span></div>):(<div><div style={{ borderRadius:14, border:"1px solid rgba(22,163,74,0.3)", background:"rgba(255,255,255,0.9)", padding:"14px 16px", marginBottom:8 }}><div style={{ color:"#15803d", fontSize:13, fontWeight:700, marginBottom:6 }}>{s.phase} — {s.label}</div><div style={{ color:"#334155", fontSize:13, lineHeight:1.6 }}>{s.prompt}</div></div><button onClick={()=>setUnlockedCount(v=>Math.max(v,i+2))} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}{allPassed&&(<div style={{ borderRadius:16, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:"1.25rem 1.5rem", marginTop:16, textAlign:"center" }}><div style={{ fontSize:28, marginBottom:8 }}>🏆</div><div style={{ color:"#14532d", fontWeight:800, fontSize:16, marginBottom:4 }}>כל הכבוד!</div><div style={{ color:"#166534", fontSize:13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}</div>); }

/* ─── Exercise Data ────────────────────────────────────────────────────────── */

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "אינטגרל לא מסוים — פונקציה קדומה",
    problem: "נתונה הפונקציה f(x) = 3x² − 4x + 1.\n\nא. מצאו את הפונקציה הקדומה F(x) (אינטגרל לא מסוים).\nב. ודאו: F'(x) = f(x).\nג. חשבו את האינטגרל המסוים ∫₀² f(x)dx.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ שכחת קבוע האינטגרציה +C", text: "באינטגרל לא מסוים חובה להוסיף +C. ∫3x²dx = x³ + C, לא x³. בבגרות מורידים נקודה על שכחת C." },
      { title: "⚠️ טעות בנוסחת החזקה", text: "∫xⁿdx = xⁿ⁺¹/(n+1). תלמידים שוכחים לחלק ב-n+1 או מוסיפים 1 למעריך בלי לחלק. בדקו: גזרו את התוצאה חזרה!" },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יא', 5 יחידות, ומצרף/ת שאלה על אינטגרל לא מסוים — פונקציה קדומה וחישוב אינטגרל מסוים. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"פונקציה קדומה", coaching:"", prompt:"f(x) = 3x²−4x+1. תנחה אותי — איך מוצאים F(x): מעלים חזקה ב-1 ומחלקים. אל תשכח +C.", keywords:[], keywordHint:"", contextWords:["אינטגרל","קדומה","חזקה","חילוק","C","F(x)"] },
      { phase:"סעיף ב׳", label:"אימות בגזירה", coaching:"", prompt:"מצאנו F(x). תכווין אותי — איך מוודאים שהתוצאה נכונה על ידי גזירה F'(x) ובדיקה שהיא = f(x).", keywords:[], keywordHint:"", contextWords:["גזירה","אימות","F'(x)","f(x)","בדיקה","נגזרת"] },
      { phase:"סעיף ג׳", label:"אינטגרל מסוים", coaching:"", prompt:"∫₀² f(x)dx. תדריך אותי — איך מציבים גבולות: F(2) − F(0). למה לא צריך C כאן.", keywords:[], keywordHint:"", contextWords:["מסוים","גבולות","הצבה","F(b)−F(a)","חישוב","ערך"] },
    ],
  },
  {
    id: "medium",
    title: "שטח בין פונקציה לציר x",
    problem: "נתונה f(x) = x² − 4.\n\nא. מצאו את נקודות החיתוך עם ציר x.\nב. חשבו את ∫₋₂² f(x)dx. מה הסימן של התוצאה?\nג. חשבו את השטח הכלוא בין הגרף לציר x. הסבירו למה השטח ≠ האינטגרל.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ שטח ≠ אינטגרל כשהפונקציה שלילית", text: "כש-f(x) < 0, האינטגרל שלילי אבל השטח חיובי תמיד. שטח = ∫|f(x)|dx. בפועל: מחלקים לתחומים ולוקחים ערך מוחלט מכל חלק." },
      { title: "⚠️ שכחה לפצל את האינטגרל בנקודות חיתוך", text: "אם f חותך את ציר x, חובה לפצל: שטח = |∫ₐᶜf(x)dx| + |∫ᶜᵇf(x)dx| כאשר c = נקודת חיתוך. בלי פיצול, חלקים חיוביים ושליליים מתקזזים." },
    ],
    goldenPrompt: `אני בכיתה יא', 5 יחידות, מצרף/ת תרגיל על שטח בין פונקציה לציר x — כולל חלקים שליליים.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על ההבדל בין שטח לאינטגרל.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"חיתוך ציר x", coaching:"", prompt:"f(x) = x²−4. תנחה אותי — f(x)=0 מתי, ומה נקודות החיתוך עם ציר x.", keywords:[], keywordHint:"", contextWords:["חיתוך","f(x)=0","שורשים","ציר","x","פתרון"] },
      { phase:"סעיף ב׳", label:"אינטגרל מסוים", coaching:"", prompt:"∫₋₂² (x²−4)dx. תכווין אותי — איך מחשבים, ולמה התוצאה שלילית.", keywords:[], keywordHint:"", contextWords:["אינטגרל","מסוים","שלילי","הצבה","חישוב","גבולות"] },
      { phase:"סעיף ג׳", label:"שטח ≠ אינטגרל", coaching:"", prompt:"האינטגרל שלילי אבל השטח חיובי. תדריך אותי — למה, ואיך מחשבים שטח נכון (ערך מוחלט).", keywords:[], keywordHint:"", contextWords:["שטח","ערך מוחלט","שלילי","חיובי","פיצול","הבדל"] },
    ],
  },
  {
    id: "advanced",
    title: "שטח בין שתי עקומות",
    problem: "נתונות f(x) = −x² + 4x ו-g(x) = x.\n\nא. מצאו את נקודות החיתוך של f ו-g.\nב. באיזה תחום f(x) > g(x)?\nג. חשבו את השטח הכלוא בין f ל-g.\nד. הסבירו למה S = ∫ₐᵇ [f(x)−g(x)] dx כש-f מעל g.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ בלבול מי מעל — f או g", text: "שטח = ∫[עליונה − תחתונה]. אם מחסרים בסדר הפוך, מקבלים מינוס. תמיד בדקו: בנקודה באמצע הקטע, מי גדולה יותר?" },
      { title: "⚠️ שכחה למצוא גבולות חיתוך", text: "הגבולות של האינטגרל הם נקודות החיתוך f(x) = g(x). תלמידים מציבים גבולות שרירותיים ומקבלים שטח שגוי." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: איך מחשבים שטח בין שתי עקומות, ולמה חשוב לדעת מי מעל מי? (לפחות 80 תווים)",
    steps: [
      { phase:"סעיף א׳", label:"נקודות חיתוך", coaching:"", prompt:"f(x)=−x²+4x, g(x)=x. תנחה אותי — f(x)=g(x) מתי, ואיך פותרים.", keywords:[], keywordHint:"", contextWords:["חיתוך","f=g","משוואה","שורשים","פתרון","נקודות"] },
      { phase:"סעיף ב׳", label:"מי מעל מי", coaching:"", prompt:"מצאנו נקודות חיתוך. תכווין אותי — איך בודקים בנקודה בין החיתוכים מי גדולה, f או g.", keywords:[], keywordHint:"", contextWords:["מעל","גדול","הצבה","בדיקה","f>g","תחום"] },
      { phase:"סעיף ג׳", label:"חישוב שטח", coaching:"", prompt:"f מעל g בתחום. תדריך אותי — S = ∫ₐᵇ [f(x)−g(x)]dx. איך מחסרים ומחשבים.", keywords:[], keywordHint:"", contextWords:["שטח","אינטגרל","חיסור","f−g","גבולות","חישוב"] },
      { phase:"סעיף ד׳", label:"הסבר הנוסחה", coaching:"", prompt:"תנחה אותי להסביר — למה S = ∫[f−g] כש-f מעל g, ומה קורה אם g מעל f.", keywords:[], keywordHint:"", contextWords:["נוסחה","הסבר","עליונה","תחתונה","חיסור","שטח"] },
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
        <div style={{ textAlign:"center", marginBottom:14 }}><div style={{ color:s.accentColor, fontSize:15, fontWeight:800, marginBottom:4 }}>∫ אינטגרל ושטח (5 יח׳)</div><div style={{ color:"#6B7280", fontSize:12, lineHeight:1.55 }}>{ex.id==="basic"&&"אינטגרל לא מסוים ומסוים — פונקציה קדומה."}{ex.id==="medium"&&"שטח בין פונקציה לציר x — פיצול וערך מוחלט."}{ex.id==="advanced"&&"שטח בין שתי עקומות — f−g."}</div></div>
        <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:14 }}/>
        <div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>🎯 נוסחאות</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:150 }}>∫xⁿdx = xⁿ⁺¹/(n+1)+C</span><span>נוסחת חזקה</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:150 }}>∫ₐᵇf(x)dx = F(b)−F(a)</span><span>אינטגרל מסוים</span></div></div></div>
        {ex.id!=="basic"&&(<><div style={{ height:1, background:"rgba(60,54,42,0.08)", marginBottom:12 }}/><div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>✨ {ex.id==="medium"?"שטח":"שטח בין עקומות"}</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}>{ex.id==="medium"&&<div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:160 }}>S = ∫|f(x)|dx</span><span>שטח = ערך מוחלט</span></div>}{ex.id==="advanced"&&<div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:160 }}>S = ∫ₐᵇ[f(x)−g(x)]dx</span><span>f מעל g</span></div>}</div></div></>)}
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

/* ─── AntiderivativeLab (basic) ────────────────────────────────────────────── */

function AntiderivativeLab() {
  const [a,setA]=useState(3); const [b,setB]=useState(-4); const [c,setC]=useState(1);
  const st=STATION.basic;
  const f=(x:number)=>a*x*x+b*x+c;
  const F=(x:number)=>(a/3)*x*x*x+(b/2)*x*x+c*x;
  const lo=0, hi=2;
  const integral=F(hi)-F(lo);
  const ox=50,oy=140,sc=30;
  const toSx=(x:number)=>ox+x*sc; const toSy=(y:number)=>oy-y*sc;
  const pts:string[]=[];const fillPts:string[]=[];
  for(let x=-0.5;x<=3;x+=0.1){const y=f(x);if(y>-5&&y<8) pts.push(`${toSx(x)},${toSy(y)}`);if(x>=lo&&x<=hi) fillPts.push(`${toSx(x)},${toSy(y)}`);}
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת אינטגרל מסוים</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו מקדמים — צפו בשטח מתחת לעקומה (מ-0 עד 2).</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, maxWidth:500, margin:"0 auto 2rem" }}>
        {[{label:"a",val:a,set:setA,min:-3,max:5},{label:"b",val:b,set:setB,min:-6,max:6},{label:"c",val:c,set:setC,min:-3,max:5}].map((sl,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:12, border:"1px solid rgba(255,255,255,0.4)", padding:"0.75rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#6B7280", marginBottom:4 }}><span>{sl.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{sl.val}</span></div><input type="range" min={sl.min} max={sl.max} step={1} value={sl.val} onChange={e=>sl.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 200 170" className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={toSx(-0.5)} y1={oy} x2={toSx(3)} y2={oy} stroke="#94a3b8" strokeWidth={1}/><line x1={ox} y1={toSy(-5)} x2={ox} y2={toSy(8)} stroke="#94a3b8" strokeWidth={1}/>
          {fillPts.length>1&&<path d={`M${toSx(lo)},${oy} ${fillPts.join(" ")} L${toSx(hi)},${oy} Z`} fill="rgba(22,163,74,0.12)"/>}
          {pts.length>1&&<polyline points={pts.join(" ")} fill="none" stroke={st.accentColor} strokeWidth={2.5}/>}
          <line x1={toSx(lo)} y1={toSy(-5)} x2={toSx(lo)} y2={toSy(8)} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2"/>
          <line x1={toSx(hi)} y1={toSy(-5)} x2={toSx(hi)} y2={toSy(8)} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2"/>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"f(x)",val:`${a}x²${b>=0?"+":""}${b}x${c>=0?"+":""}${c}`},{label:"F(x)",val:`${(a/3).toFixed(1)}x³${(b/2)>=0?"+":""}${(b/2).toFixed(1)}x²${c>=0?"+":""}${c}x`},{label:"∫₀²f(x)dx",val:integral.toFixed(2)}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:14, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>האזור הירוק = האינטגרל המסוים. כשהעקומה יורדת מתחת ל-0, האינטגרל קטן!</p>
    </section>
  );
}

/* ─── AreaUnderCurveLab (medium) ───────────────────────────────────────────── */

function AreaUnderCurveLab() {
  const [shift,setShift]=useState(4);
  const st=STATION.medium;
  const f=(x:number)=>x*x-shift;
  const root=Math.sqrt(shift);
  const integralVal=(x:number)=>x*x*x/3-shift*x;
  const rawIntegral=root>0?integralVal(root)-integralVal(-root):0;
  const area=root>0?Math.abs(rawIntegral):0;
  const ox=130,oy=100,sc=18;
  const toSx=(x:number)=>ox+x*sc; const toSy=(y:number)=>oy-y*sc;
  const pts:string[]=[];const fillPts:string[]=[];
  for(let x=-4;x<=4;x+=0.15){const y=f(x);if(y>-6&&y<10) pts.push(`${toSx(x)},${toSy(y)}`);if(x>=-root&&x<=root&&shift>0) fillPts.push(`${toSx(x)},${toSy(y)}`);}
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת שטח מתחת ל-0</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו את הפרמטר — f(x)=x²−k. האינטגרל שלילי אבל השטח חיובי!</p>
      <div style={{ maxWidth:400, margin:"0 auto 2rem" }}><div style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>k (הזזה)</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{shift}</span></div><input type="range" min={1} max={9} step={0.5} value={shift} onChange={e=>setShift(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div></div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 260 180" className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={toSx(-4)} y1={oy} x2={toSx(4)} y2={oy} stroke="#94a3b8" strokeWidth={1}/><line x1={ox} y1={toSy(-6)} x2={ox} y2={toSy(10)} stroke="#94a3b8" strokeWidth={1}/>
          {fillPts.length>1&&<path d={`M${toSx(-root)},${oy} ${fillPts.join(" ")} L${toSx(root)},${oy} Z`} fill="rgba(220,38,38,0.12)"/>}
          {pts.length>1&&<polyline points={pts.join(" ")} fill="none" stroke={st.accentColor} strokeWidth={2.5}/>}
          {shift>0&&<><circle cx={toSx(-root)} cy={oy} r={4} fill="#f59e0b"/><circle cx={toSx(root)} cy={oy} r={4} fill="#f59e0b"/></>}
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"∫ (אינטגרל)",val:rawIntegral.toFixed(2)},{label:"שטח |∫|",val:area.toFixed(2)},{label:"שורשים",val:shift>0?`±${root.toFixed(2)}`:"אין"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:17, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>האינטגרל שלילי (הפונקציה מתחת ל-0), אבל השטח = |אינטגרל| = חיובי תמיד!</p>
    </section>
  );
}

/* ─── AreaBetweenLab (advanced) ────────────────────────────────────────────── */

function AreaBetweenLab() {
  const [k,setK]=useState(4);
  const st=STATION.advanced;
  // f(x) = -x²+kx, g(x) = x → f-g = -x²+(k-1)x → roots: 0 and k-1
  const root=k-1;
  const integrand=(x:number)=>(-x*x+(k-1)*x);
  const F=(x:number)=>-x*x*x/3+(k-1)*x*x/2;
  const area=root>0?F(root)-F(0):0;
  const f=(x:number)=>-x*x+k*x; const g=(x:number)=>x;
  const ox=40,oy=130,sc=25;
  const toSx=(x:number)=>ox+x*sc; const toSy=(y:number)=>oy-y*sc;
  const ptsF:string[]=[],ptsG:string[]=[],fillPts:string[]=[];
  for(let x=-0.5;x<=k+0.5;x+=0.1){
    const yf=f(x),yg=g(x);
    if(yf>-3&&yf<k*k/4+2) ptsF.push(`${toSx(x)},${toSy(yf)}`);
    if(yg>-3&&yg<k+2) ptsG.push(`${toSx(x)},${toSy(yg)}`);
    if(x>=0&&x<=root&&root>0) fillPts.push(`${toSx(x)},${toSy(yf)}`);
  }
  const fillPtsG:string[]=[];
  for(let x=root;x>=0;x-=0.1){ if(root>0) fillPtsG.push(`${toSx(x)},${toSy(g(x))}`); }
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת שטח בין עקומות</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>f(x) = −x²+kx, g(x) = x. שנו k — צפו בשטח הכלוא.</p>
      <div style={{ maxWidth:400, margin:"0 auto 2rem" }}><div style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>k</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{k}</span></div><input type="range" min={2} max={6} step={0.5} value={k} onChange={e=>setK(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div></div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox={`0 0 ${Math.max(220, toSx(k+1))} 170`} className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={ox-10} y1={oy} x2={toSx(k+1)} y2={oy} stroke="#94a3b8" strokeWidth={1}/><line x1={ox} y1={toSy(-2)} x2={ox} y2={toSy(k*k/4+1)} stroke="#94a3b8" strokeWidth={1}/>
          {fillPts.length>1&&fillPtsG.length>1&&<path d={`M${fillPts[0]} ${fillPts.join(" ")} ${fillPtsG.join(" ")} Z`} fill="rgba(245,158,11,0.15)"/>}
          {ptsF.length>1&&<polyline points={ptsF.join(" ")} fill="none" stroke="#DC2626" strokeWidth={2}/>}
          {ptsG.length>1&&<polyline points={ptsG.join(" ")} fill="none" stroke="#a78bfa" strokeWidth={2}/>}
          {root>0&&<><circle cx={toSx(0)} cy={toSy(0)} r={4} fill="#f59e0b"/><circle cx={toSx(root)} cy={toSy(g(root))} r={4} fill="#f59e0b"/></>}
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"חיתוכים",val:`x=0, x=${root.toFixed(1)}`},{label:"∫[f−g]dx",val:area.toFixed(2)},{label:"שטח",val:area.toFixed(2)}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:17, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>כש-k גדל, f מתרחקת מ-g והשטח הכלוא גדל. ב-k=2 → root=1, שטח קטן.</p>
    </section>
  );
}

/* ─── Tabs + FormulaBar ────────────────────────────────────────────────────── */

const TABS=[{id:"basic",label:"מתחיל",textColor:"text-green-700",border:"border-green-600",bg:"bg-green-600/10",glowColor:"rgba(22,163,74,0.3)"},{id:"medium",label:"בינוני",textColor:"text-orange-700",border:"border-orange-600",bg:"bg-orange-600/10",glowColor:"rgba(234,88,12,0.3)"},{id:"advanced",label:"מתקדם",textColor:"text-red-700",border:"border-red-700",bg:"bg-red-700/10",glowColor:"rgba(220,38,38,0.3)"}];

function FormulaBar() {
  const [activeTab,setActiveTab]=useState<"rules"|"definite"|"between"|null>(null);
  const tabs=[{id:"rules" as const,label:"∫ כללי אינטגרציה",tex:"\\int x^n dx",color:"#16A34A",borderColor:"rgba(22,163,74,0.35)"},{id:"definite" as const,label:"📏 מסוים ושטח",tex:"F(b)-F(a)",color:"#EA580C",borderColor:"rgba(234,88,12,0.35)"},{id:"between" as const,label:"📐 בין עקומות",tex:"\\int_a^b[f-g]",color:"#DC2626",borderColor:"rgba(220,38,38,0.35)"}];
  return (
    <div style={{ borderRadius:12, border:"1px solid rgba(60,54,42,0.15)", background:"rgba(255,255,255,0.75)", padding:"1.25rem", marginBottom:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginBottom:12, textAlign:"center" }}>נוסחאות</div>
      <div style={{ display:"flex", gap:6, marginBottom:activeTab?14:0 }}>{tabs.map(t=>{const isA=activeTab===t.id;return(<button key={t.id} onClick={()=>setActiveTab(isA?null:t.id)} style={{ flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", border:`1.5px solid ${isA?t.borderColor:"rgba(60,54,42,0.1)"}`, background:isA?`${t.color}0D`:"rgba(60,54,42,0.03)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{ fontSize:11, fontWeight:700, color:isA?t.color:"#6B7280" }}>{t.label}</span><span style={{ color:isA?t.color:"#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>);})}</div>
      {activeTab==="rules"&&(<motion.div key="r" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(22,163,74,0.25)", background:"rgba(220,252,231,0.4)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"\\int x^n dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)"}</DisplayMath><DisplayMath>{"\\int [f(x) \\pm g(x)]dx = \\int f(x)dx \\pm \\int g(x)dx"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>כללי אינטגרציה</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>∫kf(x)dx = k·∫f(x)dx (קבוע יוצא).</li><li>∫x⁰dx = ∫1dx = x + C.</li><li>תמיד +C באינטגרל לא מסוים!</li></ol></div></div></div></motion.div>)}
      {activeTab==="definite"&&(<motion.div key="d" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(234,88,12,0.25)", background:"rgba(255,247,237,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"\\int_a^b f(x)dx = F(b) - F(a)"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(234,88,12,0.06)", border:"1px solid rgba(234,88,12,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>אינטגרל מסוים ושטח</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>מצאו F(x) (ללא +C).</li><li>הציבו: F(b) − F(a).</li><li><strong>שטח ≠ אינטגרל</strong> כש-f &lt; 0: שטח = |∫|.</li><li>פצלו בנקודות חיתוך עם ציר x.</li></ol></div><div style={{ marginTop:10, color:"#B45309", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: ∫₀²(x²−1)dx = [x³/3−x]₀² = (8/3−2)−0 = 2/3</div></div></div></motion.div>)}
      {activeTab==="between"&&(<motion.div key="b" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(220,38,38,0.25)", background:"rgba(254,242,242,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"S = \\int_a^b [f(x) - g(x)]\\,dx \\quad (f \\geq g)"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>שטח בין שתי עקומות</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>מצאו גבולות: f(x) = g(x).</li><li>קבעו מי מעל: f(x₀) &gt; g(x₀)?</li><li>אנטרגלו: ∫ₐᵇ [עליונה − תחתונה] dx.</li><li>אם נחתכות שוב — פצלו!</li></ol></div><div style={{ marginTop:10, color:"#DC2626", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: f=−x²+4x, g=x → S = ∫₀³[(−x²+4x)−x]dx = ∫₀³(−x²+3x)dx = 9/2</div></div></div></motion.div>)}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function IntegralPage5U() {
  const [selectedLevel,setSelectedLevel]=useState<"basic"|"medium"|"advanced">("basic");
  const ex=exercises.find(e=>e.id===selectedLevel)!;
  const lvlRgb=selectedLevel==="basic"?"45,90,39":selectedLevel==="medium"?"163,79,38":"139,38,53";
  return (
    <main style={{ minHeight:"100vh", background:"#F3EFE0", backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:"#2D3436", ["--lvl-rgb" as string]:lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`textarea,input[type="text"],input[type="password"]{outline:none!important}textarea:focus,input[type="text"]:focus{outline:none!important;border-color:rgba(var(--lvl-rgb),0.65)!important;box-shadow:0 0 0 3px rgba(var(--lvl-rgb),0.12)!important}input[type="range"]{outline:none!important}input[type="range"]:focus{outline:none!important}button:focus,button:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(var(--lvl-rgb),0.35)!important}button:focus:not(:focus-visible){box-shadow:none!important}`}</style>
      <div style={{ borderBottom:"1px solid rgba(60,54,42,0.15)", background:"#F3EFE0" }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div><h1 style={{ fontSize:22, fontWeight:700, color:"#2D3436", margin:0 }}>אינטגרל ושטח עם AI — כיתה יא׳ (5 יח׳)</h1><p style={{ fontSize:13, color:"#6B7280", margin:"2px 0 0" }}>אינטגרל לא מסוים, מסוים, שטח בין עקומות</p></div>
          <Link href="/5u/topic/grade11/calculus" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap" }} onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D";}} onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A";}}><span style={{ fontSize:16 }}>←</span>חזרה</Link>
        </div>
      </div>
      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="5u/grade11/calculus/integral"/>
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(60,54,42,0.15)" }}>{TABS.map(tab=>{const active=selectedLevel===tab.id;return(<button key={tab.id} onClick={()=>setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active?`${tab.bg} border ${tab.border} ${tab.textColor}`:"text-stone-500 hover:text-stone-800"}`} style={active?{boxShadow:`0 0 14px ${tab.glowColor}`}:undefined}>{tab.label}</button>);})}</div>
        <FormulaBar/>
        <motion.div key={selectedLevel} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22}}><ExerciseCard ex={ex}/></motion.div>
        {selectedLevel==="basic"&&<AntiderivativeLab/>}
        {selectedLevel==="medium"&&<AreaUnderCurveLab/>}
        {selectedLevel==="advanced"&&<AreaBetweenLab/>}
        <div style={{ marginTop:"1.5rem" }}><MarkComplete subtopicId="5u/grade11/calculus/integral" level={selectedLevel}/></div>
      </div>
    </main>
  );
}
