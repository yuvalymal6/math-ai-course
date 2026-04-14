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
  return (
    <svg viewBox="0 0 280 160" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Small triangle */}
      <polygon points="30,130 110,130 70,60" fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.7} />
      <text x={22} y={140} fontSize={12} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={114} y={140} fontSize={12} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={66} y={54} fontSize={12} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">C</text>
      {/* Large triangle (similar) */}
      <polygon points="150,140 260,140 205,40" fill="none" stroke="#a78bfa" strokeWidth={2} opacity={0.7} />
      <text x={142} y={150} fontSize={12} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">D</text>
      <text x={264} y={150} fontSize={12} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">E</text>
      <text x={201} y={34} fontSize={12} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">F</text>
      {/* Similarity symbol */}
      <text x={130} y={100} fontSize={16} fill="#f59e0b" textAnchor="middle" fontFamily="serif">~</text>
      {/* Equal angle marks */}
      <path d="M42,130 A12,12 0 0,0 38,120" fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      <path d="M164,140 A14,14 0 0,0 160,128" fill="none" stroke="#f59e0b" strokeWidth={1.5} />
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 260 170" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Big triangle with parallel line creating similar triangles */}
      <polygon points="130,20 30,150 230,150" fill="none" stroke="#EA580C" strokeWidth={2} opacity={0.7} />
      {/* Parallel line DE */}
      <line x1={80} y1={85} x2={180} y2={85} stroke="#a78bfa" strokeWidth={2} strokeDasharray="5,3" />
      {/* Vertex labels */}
      <text x={126} y={14} fontSize={13} fill="#EA580C" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">A</text>
      <text x={18} y={158} fontSize={13} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={234} y={158} fontSize={13} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">C</text>
      <text x={68} y={82} fontSize={11} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">D</text>
      <text x={184} y={82} fontSize={11} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">E</text>
      {/* Parallel marks */}
      <line x1={128} y1={87} x2={136} y2={83} stroke="#a78bfa" strokeWidth={1.5} />
      <line x1={126} y1={83} x2={134} y2={79} stroke="#a78bfa" strokeWidth={1.5} />
      <line x1={128} y1={152} x2={136} y2={148} stroke="#EA580C" strokeWidth={1.5} />
      <line x1={126} y1={148} x2={134} y2={144} stroke="#EA580C" strokeWidth={1.5} />
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 260 180" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Two overlapping similar triangles with height */}
      <polygon points="40,160 220,160 130,30" fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.6} />
      {/* Height from vertex */}
      <line x1={130} y1={30} x2={130} y2={160} stroke="#64748b" strokeWidth={1.2} strokeDasharray="4,3" />
      {/* Smaller similar triangle created by height */}
      <polygon points="130,30 130,160 220,160" fill="none" stroke="#a78bfa" strokeWidth={1.5} opacity={0.5} />
      {/* Right angle mark */}
      <polyline points="118,160 118,148 130,148" fill="none" stroke="#64748b" strokeWidth={1} />
      {/* Labels */}
      <text x={28} y={168} fontSize={13} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={224} y={168} fontSize={13} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={126} y={24} fontSize={13} fill="#DC2626" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">C</text>
      <text x={132} y={174} fontSize={11} fill="#64748b" fontFamily="sans-serif">H</text>
      {/* k ratio hint */}
      <text x={240} y={100} fontSize={11} fill="#f59e0b" fontFamily="sans-serif">k = ?</text>
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
  return (<div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${passed?"rgba(245,158,11,0.55)":`rgba(${borderRgb},0.35)`}`, marginBottom:8, boxShadow:passed?"0 0 16px rgba(245,158,11,0.25)":"none" }}><div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px", background:"rgba(255,255,255,0.75)", borderBottom:`1px solid ${passed?"rgba(245,158,11,0.3)":`rgba(${borderRgb},0.2)`}` }}>{passed?<CheckCircle size={14} color="#34d399"/>:<span style={{ color:"#1A1A1A", fontSize:11, fontWeight:700 }}>{step.phase}</span>}<span style={{ color:"#2D3436", fontSize:11, fontWeight:600 }}>{step.label}</span></div><div style={{ background:"rgba(255,255,255,0.4)", padding:16, display:"flex", flexDirection:"column", gap:12 }}><textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={e=>{setText(e.target.value);setResult(null);}} placeholder="נסח כאן את השאלה שלך ל-AI..." style={{ minHeight:80, maxHeight:160, width:"100%", borderRadius:12, background:"rgba(255,255,255,0.75)", border:`1px solid ${passed?"rgba(245,158,11,0.4)":`rgba(${borderRgb},0.25)`}`, color:"#2D3436", fontSize:14, padding:12, resize:"none", boxSizing:"border-box", fontFamily:"inherit" }}/>{result&&(<div><div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#1A1A1A", marginBottom:4, fontWeight:600 }}><span>ציון</span><span style={{ fontWeight:800 }}>{result.score}/100</span></div><div style={{ height:6, borderRadius:3, background:"#E5E7EB", overflow:"hidden" }}><div style={{ height:"100%", width:`${result.score}%`, borderRadius:3, background:scoreBarColor, transition:"width 0.4s ease" }}/></div></div>)}{!result&&<button onClick={validate} style={{ padding:"6px 16px", borderRadius:12, fontSize:12, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${borderRgb},0.4)`, color:"#1A1A1A", cursor:"pointer", fontWeight:500 }}>בדיקת AI מדומה 🤖</button>}{result&&result.blocked&&<motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ borderRadius:12, background:"rgba(254,226,226,1)", border:"2px solid #dc2626", padding:12, color:"#1A1A1A", fontSize:12, lineHeight:1.6 }}>⚠️ {result.hint}</motion.div>}{result&&!result.blocked&&result.score<75&&<motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ borderRadius:12, background:"rgba(255,251,235,1)", border:"2px solid #d97706", padding:12, color:"#1A1A1A", fontSize:12, lineHeight:1.6 }}>💡 {result.hint}</motion.div>}{passed&&(<motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ display:"flex", flexDirection:"column", gap:8 }}><div style={{ borderRadius:12, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:12, color:"#1A1A1A", fontSize:12, fontWeight:600 }}>✅ ציון: <strong style={{ color:"#14532d" }}>{result.score}/100</strong></div><button onClick={()=>{navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:12, fontSize:12, background:"transparent", border:"2px solid #16a34a", color:"#14532d", cursor:"pointer", fontWeight:500 }}>{copied?<Check size={12}/>:<Copy size={12}/>}{copied?"הועתק!":"העתק ל-AI"}</button></motion.div>)}{result&&!passed&&<button onClick={()=>setResult(null)} style={{ fontSize:12, color:"#475569", background:"transparent", border:"none", cursor:"pointer", textDecoration:"underline" }}>נסה שוב</button>}</div></div>);
}

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps:PromptStep[]; goldenPrompt:string; glowRgb:string; borderRgb:string }) { const [completed,setCompleted]=useState<boolean[]>(Array(steps.length).fill(false)); const unlocked=completed.filter(Boolean).length+1; const markDone=(i:number)=>{setCompleted(p=>{const n=[...p];n[i]=true;return n;});const el=document.getElementById(`basic-step-${i+1}`);if(el) setTimeout(()=>el.scrollIntoView({behavior:"smooth",block:"center"}),200);}; return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb}/>{steps.map((s,i)=>(<div key={i} id={`basic-step-${i}`}>{i<unlocked?(<><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb}/>{!completed[i]?(<button onClick={()=>markDone(i)} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button>):(<div style={{ textAlign:"center", padding:"6px 0", marginBottom:10, fontSize:12, color:"#16a34a", fontWeight:600 }}>✅ הושלם</div>)}</>):(<div style={{ opacity:0.35, pointerEvents:"none", position:"relative" }}><div style={{ position:"absolute", top:8, right:8, fontSize:16, zIndex:2 }}>🔒</div><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb}/></div>)}</div>))}</div>); }
function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb }: { steps:PromptStep[]; goldenPrompt:string; glowRgb:string; borderRgb:string }) { const [passed,setPassed]=useState<boolean[]>(Array(steps.length).fill(false)); return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb}/>{steps.map((s,i)=>(<TutorStepMedium key={i} step={s} locked={i>0&&!passed[i-1]} onPass={()=>setPassed(p=>{const n=[...p];n[i]=true;return n;})} borderRgb={borderRgb}/>))}</div>); }
function LadderAdvanced({ steps }: { steps:PromptStep[] }) { const [masterPassed,setMasterPassed]=useState(false); const [unlockedCount,setUnlockedCount]=useState(1); const allPassed=masterPassed&&unlockedCount>steps.length; return (<div><MasterPromptGate onPass={()=>setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["דמיון","משולש","יחס","שטח","זוויות","צלעות","הוכחה"]}/>{steps.map((s,i)=>(<div key={i} style={{ marginBottom:8 }}>{(!masterPassed||i>=unlockedCount)?(<div style={{ borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", background:"rgba(255,255,255,0.7)", padding:"14px 16px", opacity:0.5, pointerEvents:"none" as const, display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ color:"#6B7280", fontSize:13, fontWeight:600 }}>{s.phase} — {s.label}</span><span style={{ fontSize:16 }}>🔒</span></div>):(<div><div style={{ borderRadius:14, border:"1px solid rgba(22,163,74,0.3)", background:"rgba(255,255,255,0.9)", padding:"14px 16px", marginBottom:8 }}><div style={{ color:"#15803d", fontSize:13, fontWeight:700, marginBottom:6 }}>{s.phase} — {s.label}</div><div style={{ color:"#334155", fontSize:13, lineHeight:1.6 }}>{s.prompt}</div></div><button onClick={()=>setUnlockedCount(v=>Math.max(v,i+2))} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}{allPassed&&(<div style={{ borderRadius:16, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:"1.25rem 1.5rem", marginTop:16, textAlign:"center" }}><div style={{ fontSize:28, marginBottom:8 }}>🏆</div><div style={{ color:"#14532d", fontWeight:800, fontSize:16, marginBottom:4 }}>כל הכבוד!</div><div style={{ color:"#166534", fontSize:13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}</div>); }

/* ─── Exercise Data ────────────────────────────────────────────────────────── */

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "זיהוי דמיון ויחס דמיון",
    problem: "נתונים שני משולשים: △ABC ו-△DEF.\nידוע: ∠A = ∠D ו-∠B = ∠E.\n\nא. לפי איזה תנאי דמיון המשולשים דומים?\nב. אם AB = 6, DE = 9, מהו יחס הדמיון k?\nג. אם BC = 8, חשבו את EF.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ סדר הקודקודים קובע את ההתאמה", text: "△ABC ~ △DEF אומר A↔D, B↔E, C↔F. הצלע AB מתאימה ל-DE, לא ל-DF. סדר שגוי = יחס שגוי." },
      { title: "⚠️ בלבול בכיוון יחס הדמיון", text: "k = צלע במשולש הגדול / צלע במשולש הקטן. אם k > 1, המשולש השני גדול יותר. אם k < 1, הוא קטן יותר. תמיד ציינו מי במונה ומי במכנה." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י', 5 יחידות, ומצרף/ת שאלה על דמיון משולשים — זיהוי תנאי דמיון ויחס. אני רוצה שתהיה המורה הפרטי שלי — תסביר לי את הלוגיקה ולא תיתן תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"תנאי דמיון", coaching:"", prompt:"∠A=∠D ו-∠B=∠E. תנחה אותי — כמה זוגות זוויות שוות יש, ולפי איזה תנאי (AA, SAS, SSS) המשולשים דומים.", keywords:[], keywordHint:"", contextWords:["דמיון","תנאי","AA","זווית","שווה","משולש"] },
      { phase:"סעיף ב׳", label:"יחס דמיון", coaching:"", prompt:"AB=6, DE=9, △ABC~△DEF. תכווין אותי — מהו יחס הדמיון k ואיך מחשבים אותו מצלעות מתאימות.", keywords:[], keywordHint:"", contextWords:["יחס","דמיון","k","צלע","מתאימה","חילוק"] },
      { phase:"סעיף ג׳", label:"חישוב צלע חסרה", coaching:"", prompt:"BC=8 ו-k=9/6=3/2. תדריך אותי למצוא EF — איך משתמשים ביחס הדמיון למציאת צלע.", keywords:[], keywordHint:"", contextWords:["צלע","חסרה","יחס","כפל","EF","חישוב"] },
    ],
  },
  {
    id: "medium",
    title: "ישר מקביל וחלוקת צלעות",
    problem: "במשולש ABC, הישר DE מקביל ל-BC כך ש-D על AB ו-E על AC.\nנתון: AD/DB = 2/3.\n\nא. הוכיחו ש-△ADE ~ △ABC.\nב. מהו יחס הדמיון?\nג. אם שטח △ABC הוא S, מהו שטח △ADE?",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ יחס הדמיון ≠ AD/DB", text: "AD/DB = 2/3, אבל יחס הדמיון k = AD/AB = 2/5 (לא 2/3!). התלמידים שוכחים שAB = AD + DB. יחס הדמיון הוא תמיד צלע/צלע מתאימה שלמה." },
      { title: "⚠️ יחס שטחים = k², לא k", text: "אם יחס הדמיון הוא k, אז יחס השטחים הוא k². עבור k = 2/5: יחס שטחים = 4/25, לא 2/5. תלמידים מתבלבלים ושוכחים לרבע." },
    ],
    goldenPrompt: `אני בכיתה י', 5 יחידות, מצרף/ת תרגיל על ישר מקביל וחלוקת צלעות — הוכחת דמיון ויחס שטחים.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על הקשר בין מקביליות לדמיון.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"הוכחת דמיון", coaching:"", prompt:"DE∥BC ב-△ABC. תנחה אותי — למה ∠ADE=∠ABC (מתאימות) ו-∠A משותפת, ומה תנאי הדמיון.", keywords:[], keywordHint:"", contextWords:["מקביל","זווית","מתאימות","AA","דמיון","הוכחה"] },
      { phase:"סעיף ב׳", label:"יחס דמיון", coaching:"", prompt:"AD/DB = 2/3. תכווין אותי — מהו AB, ומהו יחס הדמיון k = AD/AB.", keywords:[], keywordHint:"", contextWords:["יחס","AD","AB","דמיון","k","חיבור"] },
      { phase:"סעיף ג׳", label:"יחס שטחים", coaching:"", prompt:"k = 2/5. שטח △ABC = S. תדריך אותי — מהו יחס השטחים (k²) ומהו שטח △ADE.", keywords:[], keywordHint:"", contextWords:["שטח","יחס","ריבוע","k²","חישוב","דמיון"] },
    ],
  },
  {
    id: "advanced",
    title: "דמיון בגובה למשולש ישר-זווית",
    problem: "במשולש ישר-זווית ABC (∠C = 90°), הגובה CH לצלע AB יוצר שלושה משולשים דומים.\n\nא. הוכיחו: △ACH ~ △ABC.\nב. הוכיחו: △BCH ~ △BAC.\nג. הראו ש-CH² = AH · HB (ממוצע הנדסי).\nד. אם AC ו-BC ידועים, בטאו את CH בעזרתם.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ סדר הקודקודים בדמיון — קריטי", text: "△ACH ~ △ABC (ולא △ABC ~ △ACH). הסדר קובע: A↔A, C↔B, H↔C. כתיבה בסדר שגוי הופכת את היחסים ומובילה לביטוי שגוי." },
      { title: "⚠️ שכחת שיש שלושה דמיונות", text: "הגובה ליתר במשולש ישר-זווית יוצר שלושה זוגות דמיון: △ACH~△ABC, △BCH~△BAC, △ACH~△BCH. תלמידים מוכיחים אחד ושוכחים את השאר." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: למה גובה ליתר במשולש ישר-זווית יוצר משולשים דומים, ומהו ממוצע הנדסי? (לפחות 80 תווים)",
    steps: [
      { phase:"סעיף א׳", label:"דמיון △ACH ~ △ABC", coaching:"", prompt:"△ABC עם ∠C=90° וגובה CH ליתר AB. תנחה אותי — מהן הזוויות המשותפות/שוות שמוכיחות △ACH ~ △ABC.", keywords:[], keywordHint:"", contextWords:["דמיון","זווית","משותפת","ישרה","AA","הוכחה"] },
      { phase:"סעיף ב׳", label:"דמיון △BCH ~ △BAC", coaching:"", prompt:"תכווין אותי להוכיח דמיון נוסף: △BCH ~ △BAC — מהן הזוויות ולמה.", keywords:[], keywordHint:"", contextWords:["דמיון","BCH","BAC","זווית","AA","הוכחה"] },
      { phase:"סעיף ג׳", label:"ממוצע הנדסי CH²=AH·HB", coaching:"", prompt:"מדמיון △ACH ~ △BCH: CH/AH = HB/CH. תדריך אותי — איך מגיעים ל-CH² = AH·HB (מכפלת קרוסס).", keywords:[], keywordHint:"", contextWords:["ממוצע הנדסי","CH","AH","HB","מכפלה","יחס"] },
      { phase:"סעיף ד׳", label:"ביטוי CH מ-AC ו-BC", coaching:"", prompt:"AC ו-BC ידועים. תנחה אותי — איך מוצאים AB (פיתגורס) ואז CH מהשטח: ½·AB·CH = ½·AC·BC.", keywords:[], keywordHint:"", contextWords:["שטח","פיתגורס","AB","CH","ביטוי","שוויון"] },
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
        <div style={{ textAlign:"center", marginBottom:14 }}><div style={{ color:s.accentColor, fontSize:15, fontWeight:800, marginBottom:4 }}>∼ דמיון משולשים (5 יח׳)</div><div style={{ color:"#6B7280", fontSize:12, lineHeight:1.55 }}>{ex.id==="basic"&&"זיהוי דמיון, יחס k ומציאת צלע חסרה."}{ex.id==="medium"&&"ישר מקביל, חלוקת צלעות ויחס שטחים k²."}{ex.id==="advanced"&&"דמיון בגובה ליתר — ממוצע הנדסי והוכחות."}</div></div>
        <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:14 }}/>
        <div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>🎯 תנאי דמיון ונוסחאות</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:80 }}>AA</span><span>שתי זוויות שוות</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:80 }}>SAS</span><span>שתי צלעות ביחס שווה + זווית כלואה</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:80 }}>SSS</span><span>שלוש צלעות ביחס שווה</span></div></div></div>
        {ex.id!=="basic"&&(<><div style={{ height:1, background:"rgba(60,54,42,0.08)", marginBottom:12 }}/><div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>✨ {ex.id==="medium"?"יחסים":"גובה ליתר"}</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}>{ex.id==="medium"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:120 }}>יחס צלעות</span><span>= k (יחס הדמיון)</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:120 }}>יחס שטחים</span><span>= k² (ריבוע יחס הדמיון)</span></div></>}{ex.id==="advanced"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:140 }}>CH² = AH · HB</span><span>ממוצע הנדסי</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:140 }}>AC² = AH · AB</span><span>הטלת ניצב</span></div></>}</div></div></>)}
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

/* ─── SimilarityRatioLab (basic) ───────────────────────────────────────────── */

function SimilarityRatioLab() {
  const [k,setK]=useState(1.5);
  const st=STATION.basic;
  const a1=4,b1=5,c1=6; const a2=a1*k,b2=b1*k,c2=c1*k;
  const areaRatio=k*k;
  // Triangle 1
  const sc=12;
  const t1x=20,t1y=130; const t1pts=`${t1x},${t1y} ${t1x+a1*sc},${t1y} ${t1x+a1*sc*0.3},${t1y-c1*sc*0.7}`;
  const t2x=140,t2y=130; const t2pts=`${t2x},${t2y} ${t2x+a2*sc},${t2y} ${t2x+a2*sc*0.3},${t2y-c2*sc*0.7}`;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת יחס דמיון</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו את k — צפו כיצד המשולש השני גדל/קטן ביחס.</p>
      <div style={{ maxWidth:400, margin:"0 auto 2rem" }}><div style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>k (יחס דמיון)</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{k.toFixed(1)}</span></div><input type="range" min={0.5} max={2.5} step={0.1} value={k} onChange={e=>setK(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div></div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 300 160" className="w-full max-w-md mx-auto" aria-hidden>
          <polygon points={t1pts} fill={`${st.accentColor}08`} stroke={st.accentColor} strokeWidth={2}/>
          <text x={t1x+a1*sc/2} y={t1y+14} fontSize={10} fill={st.accentColor} textAnchor="middle" fontFamily="monospace">{a1}</text>
          {k<=2.2&&<><polygon points={t2pts} fill="rgba(167,139,250,0.08)" stroke="#a78bfa" strokeWidth={2}/><text x={t2x+a2*sc/2} y={t2y+14} fontSize={10} fill="#a78bfa" textAnchor="middle" fontFamily="monospace">{a2.toFixed(1)}</text></>}
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
        {[{label:"k",val:k.toFixed(1)},{label:"צלע×k",val:`${a1}→${a2.toFixed(1)}`},{label:"יחס שטחים",val:`k²=${areaRatio.toFixed(2)}`},{label:"יחס היקפים",val:`k=${k.toFixed(1)}`}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:10, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:10, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:14, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>היקף × k, שטח × k². עבור k=2 השטח פי 4!</p>
    </section>
  );
}

/* ─── ParallelCutLab (medium) ──────────────────────────────────────────────── */

function ParallelCutLab() {
  const [ratio,setRatio]=useState(2); const [denom,setDenom]=useState(5);
  const st=STATION.medium;
  const k=ratio/denom; const areaK=k*k;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת ישר מקביל</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו את AD/AB — צפו כיצד יחס השטחים משתנה.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 2rem" }}>
        {[{label:"AD",val:ratio,set:setRatio,max:9},{label:"AB",val:denom,set:setDenom,max:10}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={1} max={s.max} step={1} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:8 }}>DE ∥ BC, k = AD/AB</div>
          <div style={{ color:st.accentColor, fontSize:24, fontWeight:800, fontFamily:"monospace" }}>k = {ratio}/{denom} = {k.toFixed(3)}</div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, margin:"12px 0" }}><div style={{ height:2, width:40, background:`rgba(${st.glowRgb},0.3)` }}/><span style={{ color:"#64748b", fontSize:12 }}>↓</span><div style={{ height:2, width:40, background:`rgba(${st.glowRgb},0.3)` }}/></div>
          <div style={{ color:"#a78bfa", fontSize:20, fontWeight:800, fontFamily:"monospace" }}>S(ADE)/S(ABC) = k² = {areaK.toFixed(4)}</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"k = AD/AB",val:`${ratio}/${denom}`},{label:"k²",val:areaK.toFixed(3)},{label:"אם S(ABC)=100",val:`S(ADE)=${(areaK*100).toFixed(1)}`}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:16, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>k = AD/AB (לא AD/DB!). יחס שטחים = k². הזיזו AD=AB → k=1 → אותו משולש.</p>
    </section>
  );
}

/* ─── GeometricMeanLab (advanced) ──────────────────────────────────────────── */

function GeometricMeanLab() {
  const [ac,setAC]=useState(6); const [bc,setBC]=useState(8);
  const st=STATION.advanced;
  const ab=Math.sqrt(ac*ac+bc*bc);
  const ch=(ac*bc)/ab;
  const ah=(ac*ac)/ab;
  const hb=(bc*bc)/ab;
  const check=ah*hb;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת ממוצע הנדסי</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו AC ו-BC (ניצבים) — צפו ב-CH וב-CH² = AH·HB.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 2rem" }}>
        {[{label:"AC (ניצב)",val:ac,set:setAC},{label:"BC (ניצב)",val:bc,set:setBC}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={2} max={12} step={0.5} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:6 }}>△ABC ישר-זווית, ∠C=90°, גובה CH ליתר AB</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
            <div><div style={{ color:"#64748b", fontSize:10 }}>AH</div><div style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700, fontSize:16 }}>{ah.toFixed(2)}</div></div>
            <div><div style={{ color:"#f59e0b", fontSize:10 }}>CH</div><div style={{ color:"#f59e0b", fontFamily:"monospace", fontWeight:700, fontSize:16 }}>{ch.toFixed(2)}</div></div>
            <div><div style={{ color:"#64748b", fontSize:10 }}>HB</div><div style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700, fontSize:16 }}>{hb.toFixed(2)}</div></div>
          </div>
          <div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.2)", padding:10 }}>
            <div style={{ color:"#15803d", fontSize:13, fontWeight:700 }}>CH² = {(ch*ch).toFixed(2)} | AH·HB = {check.toFixed(2)}</div>
            <div style={{ color:"#16a34a", fontSize:11, marginTop:4 }}>✅ CH² = AH · HB (ממוצע הנדסי)</div>
          </div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
        {[{label:"AB (יתר)",val:ab.toFixed(2)},{label:"CH",val:ch.toFixed(2)},{label:"CH²",val:(ch*ch).toFixed(2)},{label:"AH·HB",val:check.toFixed(2)}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:10, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:10, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:15, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>CH = AC·BC/AB. נסו AC=3, BC=4 → AB=5, CH=2.4, ו-CH²=5.76=AH·HB!</p>
    </section>
  );
}

/* ─── Tabs + FormulaBar ────────────────────────────────────────────────────── */

const TABS=[{id:"basic",label:"מתחיל",textColor:"text-green-700",border:"border-green-600",bg:"bg-green-600/10",glowColor:"rgba(22,163,74,0.3)"},{id:"medium",label:"בינוני",textColor:"text-orange-700",border:"border-orange-600",bg:"bg-orange-600/10",glowColor:"rgba(234,88,12,0.3)"},{id:"advanced",label:"מתקדם",textColor:"text-red-700",border:"border-red-700",bg:"bg-red-700/10",glowColor:"rgba(220,38,38,0.3)"}];

function FormulaBar() {
  const [activeTab,setActiveTab]=useState<"conditions"|"ratios"|"height"|null>(null);
  const tabs=[{id:"conditions" as const,label:"∼ תנאי דמיון",tex:"AA, SAS, SSS",color:"#16A34A",borderColor:"rgba(22,163,74,0.35)"},{id:"ratios" as const,label:"📏 יחסים",tex:"S_2/S_1 = k^2",color:"#EA580C",borderColor:"rgba(234,88,12,0.35)"},{id:"height" as const,label:"📐 ממוצע הנדסי",tex:"CH^2 = AH \\cdot HB",color:"#DC2626",borderColor:"rgba(220,38,38,0.35)"}];
  return (
    <div style={{ borderRadius:12, border:"1px solid rgba(60,54,42,0.15)", background:"rgba(255,255,255,0.75)", padding:"1.25rem", marginBottom:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginBottom:12, textAlign:"center" }}>נוסחאות</div>
      <div style={{ display:"flex", gap:6, marginBottom:activeTab?14:0 }}>{tabs.map(t=>{const isA=activeTab===t.id;return(<button key={t.id} onClick={()=>setActiveTab(isA?null:t.id)} style={{ flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", border:`1.5px solid ${isA?t.borderColor:"rgba(60,54,42,0.1)"}`, background:isA?`${t.color}0D`:"rgba(60,54,42,0.03)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{ fontSize:11, fontWeight:700, color:isA?t.color:"#6B7280" }}>{t.label}</span><span style={{ color:isA?t.color:"#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>);})}</div>
      {activeTab==="conditions"&&(<motion.div key="c" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(22,163,74,0.25)", background:"rgba(220,252,231,0.4)", padding:16 }}><div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>תנאי דמיון</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>AA (ז.ז.):</strong> שתי זוויות שוות → השלישית שווה אוטומטית.</li><li><strong>SAS (צ.ז.צ.):</strong> שתי צלעות ביחס שווה + הזווית הכלואה שווה.</li><li><strong>SSS (צ.צ.צ.):</strong> שלוש צלעות ביחס שווה.</li></ol></div><div style={{ marginTop:10, color:"#15803d", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 AA הכי שימושי — מספיק שתי זוויות כי השלישית נגזרת מ-180°.</div></div></div></motion.div>)}
      {activeTab==="ratios"&&(<motion.div key="r" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(234,88,12,0.25)", background:"rgba(255,247,237,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"\\frac{S_2}{S_1} = k^2 \\qquad \\frac{P_2}{P_1} = k"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(234,88,12,0.06)", border:"1px solid rgba(234,88,12,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>יחסים בדמיון</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>יחס צלעות מתאימות = k (קבוע).</li><li>יחס היקפים = k.</li><li>יחס שטחים = k² (ריבוע!).</li><li>מקביל לבסיס → חולק צלעות ביחס → יוצר דמיון.</li></ol></div></div></div></motion.div>)}
      {activeTab==="height"&&(<motion.div key="h" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(220,38,38,0.25)", background:"rgba(254,242,242,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"CH^2 = AH \\cdot HB"}</DisplayMath><DisplayMath>{"AC^2 = AH \\cdot AB \\qquad BC^2 = HB \\cdot AB"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>גובה ליתר במשולש ישר-זווית</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>CH = ממוצע הנדסי של AH ו-HB.</li><li>AC = ממוצע הנדסי של AH ו-AB.</li><li>נובע מ-3 דמיונות: △ACH~△ABC~△CBH.</li></ol></div><div style={{ marginTop:10, color:"#DC2626", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דרך חישוב: CH = AC·BC/AB (משטח = ½·AB·CH = ½·AC·BC).</div></div></div></motion.div>)}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function SimilarityPage5U() {
  const [selectedLevel,setSelectedLevel]=useState<"basic"|"medium"|"advanced">("basic");
  const ex=exercises.find(e=>e.id===selectedLevel)!;
  const lvlRgb=selectedLevel==="basic"?"45,90,39":selectedLevel==="medium"?"163,79,38":"139,38,53";
  return (
    <main style={{ minHeight:"100vh", background:"#F3EFE0", backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:"#2D3436", ["--lvl-rgb" as string]:lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`textarea,input[type="text"],input[type="password"]{outline:none!important}textarea:focus,input[type="text"]:focus{outline:none!important;border-color:rgba(var(--lvl-rgb),0.65)!important;box-shadow:0 0 0 3px rgba(var(--lvl-rgb),0.12)!important}input[type="range"]{outline:none!important}input[type="range"]:focus{outline:none!important}button:focus,button:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(var(--lvl-rgb),0.35)!important}button:focus:not(:focus-visible){box-shadow:none!important}`}</style>
      <div style={{ borderBottom:"1px solid rgba(60,54,42,0.15)", background:"#F3EFE0" }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div><h1 style={{ fontSize:22, fontWeight:700, color:"#2D3436", margin:0 }}>דמיון משולשים עם AI — כיתה י׳ (5 יח׳)</h1><p style={{ fontSize:13, color:"#6B7280", margin:"2px 0 0" }}>תנאי דמיון, יחס k, יחס שטחים k², ממוצע הנדסי</p></div>
          <Link href="/5u/topic/grade10/geometry" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap" }} onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D";}} onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A";}}><span style={{ fontSize:16 }}>←</span>חזרה</Link>
        </div>
      </div>
      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="5u/grade10/geometry/similarity"/>
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(60,54,42,0.15)" }}>{TABS.map(tab=>{const active=selectedLevel===tab.id;return(<button key={tab.id} onClick={()=>setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active?`${tab.bg} border ${tab.border} ${tab.textColor}`:"text-stone-500 hover:text-stone-800"}`} style={active?{boxShadow:`0 0 14px ${tab.glowColor}`}:undefined}>{tab.label}</button>);})}</div>
        <FormulaBar/>
        <motion.div key={selectedLevel} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22}}><ExerciseCard ex={ex}/></motion.div>
        {selectedLevel==="basic"&&<SimilarityRatioLab/>}
        {selectedLevel==="medium"&&<ParallelCutLab/>}
        {selectedLevel==="advanced"&&<GeometricMeanLab/>}
        <div style={{ marginTop:"1.5rem" }}><MarkComplete subtopicId="5u/grade10/geometry/similarity" level={selectedLevel}/></div>
      </div>
    </main>
  );
}
