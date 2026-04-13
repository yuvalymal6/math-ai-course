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
    <svg viewBox="0 0 260 130" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Two people (age problem) */}
      <circle cx={80} cy={40} r={18} fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.6} />
      <text x={80} y={45} fontSize={14} fill="#16A34A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?</text>
      <line x1={80} y1={58} x2={80} y2={95} stroke="#16A34A" strokeWidth={2} opacity={0.5} />
      <circle cx={180} cy={40} r={18} fill="none" stroke="#a78bfa" strokeWidth={2} opacity={0.6} />
      <text x={180} y={45} fontSize={14} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?</text>
      <line x1={180} y1={58} x2={180} y2={95} stroke="#a78bfa" strokeWidth={2} opacity={0.5} />
      {/* Connection */}
      <line x1={98} y1={40} x2={162} y2={40} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
      <text x={130} y={35} fontSize={10} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">יחס?</text>
      {/* Labels */}
      <text x={80} y={115} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">אבא</text>
      <text x={180} y={115} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">בן</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 280 130" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Distance diagram: two arrows moving toward each other */}
      <line x1={30} y1={65} x2={250} y2={65} stroke="#94a3b8" strokeWidth={1.2} />
      {/* Start points */}
      <circle cx={40} cy={65} r={8} fill="none" stroke="#EA580C" strokeWidth={2} />
      <text x={40} y={69} fontSize={10} fill="#EA580C" textAnchor="middle" fontFamily="sans-serif">A</text>
      <circle cx={240} cy={65} r={8} fill="none" stroke="#a78bfa" strokeWidth={2} />
      <text x={240} y={69} fontSize={10} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">B</text>
      {/* Arrows */}
      <line x1={55} y1={50} x2={120} y2={50} stroke="#EA580C" strokeWidth={2} markerEnd="url(#arrowO)" />
      <line x1={225} y1={50} x2={160} y2={50} stroke="#a78bfa" strokeWidth={2} markerEnd="url(#arrowP)" />
      <defs>
        <marker id="arrowO" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto"><path d="M0,0 L8,3 L0,6" fill="#EA580C" /></marker>
        <marker id="arrowP" markerWidth={8} markerHeight={6} refX={0} refY={3} orient="auto"><path d="M8,0 L0,3 L8,6" fill="#a78bfa" /></marker>
      </defs>
      {/* Labels */}
      <text x={87} y={44} fontSize={10} fill="#EA580C" textAnchor="middle" fontFamily="sans-serif">v₁ = ?</text>
      <text x={193} y={44} fontSize={10} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">v₂ = ?</text>
      {/* Distance */}
      <text x={140} y={90} fontSize={11} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">מרחק = ?</text>
      <line x1={50} y1={80} x2={230} y2={80} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2" />
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 260 140" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Two containers (mixture) */}
      <rect x={40} y={30} width={60} height={80} rx={8} fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.6} />
      <rect x={40} y={60} width={60} height={50} rx={0} fill="rgba(220,38,38,0.1)" />
      <text x={70} y={80} fontSize={11} fill="#DC2626" textAnchor="middle" fontFamily="sans-serif">?%</text>
      <rect x={160} y={30} width={60} height={80} rx={8} fill="none" stroke="#a78bfa" strokeWidth={2} opacity={0.6} />
      <rect x={160} y={50} width={60} height={60} rx={0} fill="rgba(167,139,250,0.1)" />
      <text x={190} y={75} fontSize={11} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">?%</text>
      {/* Arrow to result */}
      <line x1={105} y1={70} x2={155} y2={70} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3,2" />
      <text x={130} y={65} fontSize={12} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">+</text>
      {/* Result label */}
      <text x={130} y={130} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">תערובת = ?</text>
    </svg>
  );
}

/* ─── Prompt Atoms ─────────────────────────────────────────────────────────── */

function CopyBtn({ text, label="העתק פרומפט" }: { text:string; label?:string }) {
  const [c,setC]=useState(false);
  return (<button onClick={()=>{navigator.clipboard.writeText(text);setC(true);setTimeout(()=>setC(false),2000);}} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 16px", borderRadius:12, fontSize:12, background:"rgba(255,255,255,0.75)", border:"1px solid rgba(60,54,42,0.25)", color:"#1A1A1A", fontWeight:500, cursor:"pointer" }}>{c?<Check size={13}/>:<Copy size={13}/>}{c?"הועתק!":label}</button>);
}

function GoldenPromptCard({ prompt, title="פרומפט ראשי", glowRgb="16,185,129", borderRgb="45,90,39" }: { prompt:string; title?:string; glowRgb?:string; borderRgb?:string }) {
  return (<div style={{ borderRadius:16, background:"rgba(255,255,255,0.82)", padding:"1.25rem", marginBottom:16, border:`2px solid rgba(${borderRgb},0.45)`, boxShadow:`0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)` }}><div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}><span>✨</span><span style={{ color:"#1A1A1A", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em" }}>{title}</span></div><p style={{ color:"#1A1A1A", fontSize:14, lineHeight:1.7, marginBottom:16, whiteSpace:"pre-line", fontWeight:500 }}>{prompt}</p><CopyBtn text={prompt} label="העתק פרומפט מלא"/></div>);
}

function TutorStepBasic({ step, glowRgb="16,185,129", borderRgb="45,90,39" }: { step:PromptStep; glowRgb?:string; borderRgb?:string }) {
  return (<div style={{ borderRadius:12, overflow:"hidden", border:`1px solid rgba(${glowRgb},0.45)`, marginBottom:8, boxShadow:`0 0 14px rgba(${glowRgb},0.18)` }}><div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px", background:"rgba(255,255,255,0.75)", borderBottom:`1px solid rgba(${glowRgb},0.25)` }}><span style={{ color:"#1A1A1A", fontSize:11, fontWeight:700 }}>{step.phase}</span><span style={{ color:"#2D3436", fontSize:11, fontWeight:600 }}>{step.label}</span></div><div style={{ background:"rgba(255,255,255,0.4)", padding:16, display:"flex", flexDirection:"column", gap:12 }}><div><div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>הפרומפט המוכן ✍️</div><div style={{ borderRadius:12, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${borderRgb},0.35)`, padding:12, fontSize:11, color:"#2D3436", lineHeight:1.6, wordBreak:"break-word" }}>{step.prompt}</div></div><CopyBtn text={step.prompt} label="העתק פרומפט ממוקד"/></div></div>);
}

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

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps:PromptStep[]; goldenPrompt:string; glowRgb:string; borderRgb:string }) {
  const [completed,setCompleted]=useState<boolean[]>(Array(steps.length).fill(false));
  const unlocked=completed.filter(Boolean).length+1;
  const markDone=(i:number)=>{setCompleted(p=>{const n=[...p];n[i]=true;return n;});const el=document.getElementById(`basic-step-${i+1}`);if(el) setTimeout(()=>el.scrollIntoView({behavior:"smooth",block:"center"}),200);};
  return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb}/>{steps.map((s,i)=>(<div key={i} id={`basic-step-${i}`}>{i<unlocked?(<><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb}/>{!completed[i]?(<button onClick={()=>markDone(i)} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button>):(<div style={{ textAlign:"center", padding:"6px 0", marginBottom:10, fontSize:12, color:"#16a34a", fontWeight:600 }}>✅ הושלם</div>)}</>):(<div style={{ opacity:0.35, pointerEvents:"none", position:"relative" }}><div style={{ position:"absolute", top:8, right:8, fontSize:16, zIndex:2 }}>🔒</div><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb}/></div>)}</div>))}</div>);
}

function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb }: { steps:PromptStep[]; goldenPrompt:string; glowRgb:string; borderRgb:string }) {
  const [passed,setPassed]=useState<boolean[]>(Array(steps.length).fill(false));
  return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb}/>{steps.map((s,i)=>(<TutorStepMedium key={i} step={s} locked={i>0&&!passed[i-1]} onPass={()=>setPassed(p=>{const n=[...p];n[i]=true;return n;})} borderRgb={borderRgb}/>))}</div>);
}

function LadderAdvanced({ steps }: { steps:PromptStep[] }) {
  const [masterPassed,setMasterPassed]=useState(false);
  const [unlockedCount,setUnlockedCount]=useState(1);
  const allPassed=masterPassed&&unlockedCount>steps.length;
  return (
    <div>
      <MasterPromptGate onPass={()=>setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["משוואה","נעלם","תערובת","אחוז","ריכוז","מהירות","מרחק"]}/>
      {steps.map((s,i)=>(<div key={i} style={{ marginBottom:8 }}>{(!masterPassed||i>=unlockedCount)?(<div style={{ borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", background:"rgba(255,255,255,0.7)", padding:"14px 16px", opacity:0.5, pointerEvents:"none" as const, display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ color:"#6B7280", fontSize:13, fontWeight:600 }}>{s.phase} — {s.label}</span><span style={{ fontSize:16 }}>🔒</span></div>):(<div><div style={{ borderRadius:14, border:"1px solid rgba(22,163,74,0.3)", background:"rgba(255,255,255,0.9)", padding:"14px 16px", marginBottom:8 }}><div style={{ color:"#15803d", fontSize:13, fontWeight:700, marginBottom:6 }}>{s.phase} — {s.label}</div><div style={{ color:"#334155", fontSize:13, lineHeight:1.6 }}>{s.prompt}</div></div><button onClick={()=>setUnlockedCount(v=>Math.max(v,i+2))} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}
      {allPassed&&(<div style={{ borderRadius:16, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:"1.25rem 1.5rem", marginTop:16, textAlign:"center" }}><div style={{ fontSize:28, marginBottom:8 }}>🏆</div><div style={{ color:"#14532d", fontWeight:800, fontSize:16, marginBottom:4 }}>כל הכבוד — השלמת את הרמה המתקדמת!</div><div style={{ color:"#166534", fontSize:13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}
    </div>
  );
}

/* ─── Exercise Data ────────────────────────────────────────────────────────── */

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "בעיית גילאים — משוואה אחת עם נעלם אחד",
    problem: "גיל האב גדול פי 3 מגיל הבן. סכום גילאיהם הוא 48.\n\nא. הגדירו את הנעלם — מהו x?\nב. בנו משוואה מתוך הנתונים.\nג. פתרו את המשוואה ומצאו את גיל כל אחד.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ הגדרה לא ברורה של הנעלם", text: "חובה לכתוב בבירור מה x מייצג (למשל: x = גיל הבן). אם לא מגדירים, קל להתבלבל ולבנות משוואה שגויה. תמיד — שורה ראשונה: 'נסמן x = ...'." },
      { title: "⚠️ בלבול בין 'גדול פי' ל'גדול ב'", text: "'גדול פי 3' = 3x. 'גדול ב-3' = x+3. זו הטעות הנפוצה ביותר בבעיות גילאים — קראו שוב את הנתון לפני שכותבים." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י' ומצרף/ת בעיה מילולית על גילאים — צריך לבנות משוואה ולפתור. אני רוצה שתהיה המורה הפרטי שלי — תסביר לי את הלוגיקה ולא תיתן תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"הגדרת הנעלם", coaching:"", prompt:"גיל האב גדול פי 3 מגיל הבן. סכום גילאיהם 48. תנחה אותי — מה כדאי לסמן כ-x ואיך מבטאים את הגדלים האחרים בעזרתו.", keywords:[], keywordHint:"", contextWords:["נעלם","x","גיל","סימון","ביטוי","הגדרה"] },
      { phase:"סעיף ב׳", label:"בניית משוואה", coaching:"", prompt:"הגדרנו x = גיל הבן וגיל האב = 3x. סכומם 48. תכווין אותי לכתוב משוואה — איזה ביטוי שווה ל-48.", keywords:[], keywordHint:"", contextWords:["משוואה","סכום","שווה","ביטוי","בנייה","חיבור"] },
      { phase:"סעיף ג׳", label:"פתרון המשוואה", coaching:"", prompt:"המשוואה: x + 3x = 48. תדריך אותי לפתור — איך מאחדים איברים דומים ומבודדים את x.", keywords:[], keywordHint:"", contextWords:["פתרון","בידוד","חילוק","איברים","x","תשובה"] },
    ],
  },
  {
    id: "medium",
    title: "בעיית מרחק — דרך, מהירות וזמן",
    problem: "שני רוכבי אופניים יוצאים בו-זמנית משני קצות מסלול באורך d ק\"מ ונוסעים זה לקראת זה. מהירות הראשון גדולה ב-v ק\"מ/ש מהשני.\n\nא. הגדירו נעלם ובטאו את המהירויות.\nב. בנו משוואה לפי העובדה שהם נפגשים לאחר t שעות.\nג. פתרו ומצאו את מהירות כל רוכב.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ שכחת שסכום הדרכים = המרחק הכולל", text: "כששניים נוסעים זה לקראת זה, סכום הדרכים שלהם שווה למרחק הכולל: d₁ + d₂ = d. תלמידים שוכחים את העיקרון הזה ובונים משוואה שגויה." },
      { title: "⚠️ בלבול ביחידות", text: "מהירות בקמ\"ש × זמן בשעות = מרחק בק\"מ. אם הזמן בדקות — חייבים להמיר לשעות לפני ההצבה. שימו לב ליחידות בכל נתון." },
    ],
    goldenPrompt: `אני בכיתה י', ומצרף/ת בעיה מילולית על מרחק, מהירות וזמן — שני רוכבים שנפגשים.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על הגדרת נעלם ובניית המשוואה.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"הגדרת מהירויות", coaching:"", prompt:"רוכב ראשון מהיר ב-v מהשני, ונוסעים זה לקראת זה. תנחה אותי — מה לסמן כ-x ואיך מבטאים את שתי המהירויות.", keywords:[], keywordHint:"", contextWords:["נעלם","מהירות","ביטוי","x","גדול","הגדרה"] },
      { phase:"סעיף ב׳", label:"בניית משוואה מ-d=v·t", coaching:"", prompt:"כל רוכב נוסע t שעות. דרך = מהירות × זמן. סכום דרכיהם = d. תכווין אותי לבנות משוואה.", keywords:[], keywordHint:"", contextWords:["דרך","מהירות","זמן","סכום","משוואה","מרחק"] },
      { phase:"סעיף ג׳", label:"פתרון ומציאת המהירויות", coaching:"", prompt:"בנינו את המשוואה. תדריך אותי לפתור ולמצוא את x — ואז לחשב את מהירות כל רוכב.", keywords:[], keywordHint:"", contextWords:["פתרון","מהירות","הצבה","x","רוכב","חישוב"] },
    ],
  },
  {
    id: "advanced",
    title: "בעיית תערובות — ריכוז אחוזי",
    problem: "יש שני תמיסות מלח: תמיסה A בריכוז 10% ותמיסה B בריכוז 30%.\nרוצים ליצור 500 מ\"ל של תמיסה בריכוז 18%.\n\nא. הגדירו נעלם — כמה מ\"ל מכל תמיסה.\nב. בנו משוואה לפי כמות המלח בתערובת.\nג. פתרו ומצאו את הנפחים.\nד. בדקו את התשובה — האם כמות המלח מסתדרת?",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בין נפח לכמות מלח", text: "המשוואה נבנית על כמות המלח (= נפח × ריכוז), לא על הנפח עצמו. 10% מ-x ליטר = 0.1x ליטר מלח. תלמידים מציבים אחוזים ישירות בלי לכפול בנפח." },
      { title: "⚠️ שכחת המשוואה השנייה (סכום נפחים)", text: "צריך שתי משוואות: אחת על סכום הנפחים (x+y=500), ואחת על כמות המלח. תלמידים בונים רק משוואה אחת ותקועים." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: איך מתרגמים בעיית תערובות למשוואה, ולמה צריך שתי משוואות? (לפחות 80 תווים)",
    steps: [
      { phase:"סעיף א׳", label:"הגדרת נעלמים", coaching:"", prompt:"תמיסה A בריכוז 10%, תמיסה B בריכוז 30%. רוצים 500 מ\"ל של 18%. תנחה אותי — מה הם x ו-y ומה הקשר ביניהם.", keywords:[], keywordHint:"", contextWords:["נעלם","נפח","תמיסה","x","y","סכום"] },
      { phase:"סעיף ב׳", label:"משוואת כמות המלח", coaching:"", prompt:"x מ\"ל של 10% ו-y מ\"ל של 30% יוצרים 500 מ\"ל של 18%. תכווין אותי — כמות מלח = נפח × ריכוז. איך בונים משוואה.", keywords:[], keywordHint:"", contextWords:["מלח","ריכוז","כמות","כפל","משוואה","אחוז"] },
      { phase:"סעיף ג׳", label:"פתרון מערכת המשוואות", coaching:"", prompt:"x+y=500 ו-0.1x+0.3y=90. תדריך אותי — איך פותרים בהצבה: מבטאים y מהמשוואה הראשונה ומציבים בשנייה.", keywords:[], keywordHint:"", contextWords:["הצבה","פתרון","משוואות","y","x","בידוד"] },
      { phase:"סעיף ד׳", label:"בדיקת התשובה", coaching:"", prompt:"מצאנו x ו-y. תנחה אותי לבדוק — האם סכום הנפחים = 500, והאם כמות המלח הכוללת = 90 מ\"ל.", keywords:[], keywordHint:"", contextWords:["בדיקה","הצבה","סכום","מלח","נכונות","אימות"] },
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
        <div style={{ textAlign:"center", marginBottom:14 }}>
          <div style={{ color:s.accentColor, fontSize:15, fontWeight:800, marginBottom:4 }}>📝 בעיות מילוליות עם משוואות</div>
          <div style={{ color:"#6B7280", fontSize:12, lineHeight:1.55 }}>
            {ex.id==="basic"&&"בעיית גילאים — הגדרת נעלם, בניית משוואה ופתרון."}
            {ex.id==="medium"&&"בעיית מרחק — דרך = מהירות × זמן."}
            {ex.id==="advanced"&&"בעיית תערובות — ריכוז, נפח ומערכת משוואות."}
          </div>
        </div>
        <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:14 }}/>
        <div style={{ marginBottom:12 }}>
          <div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>🎯 שלבי פתרון</div>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:30 }}>1.</span><span>הגדרת הנעלם — "נסמן x = ..."</span></div>
            <div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:30 }}>2.</span><span>תרגום הנתונים לביטויים אלגבריים</span></div>
            <div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:30 }}>3.</span><span>בניית משוואה ופתרון</span></div>
          </div>
        </div>
        {ex.id!=="basic"&&(<><div style={{ height:1, background:"rgba(60,54,42,0.08)", marginBottom:12 }}/><div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>✨ {ex.id==="medium"?"נוסחת דרך":"תערובות"}</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}>{ex.id==="medium"&&<div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:110 }}>d = v · t</span><span>דרך = מהירות × זמן</span></div>}{ex.id==="advanced"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:140 }}>כמות = נפח × %</span><span>כמות החומר בתמיסה</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:140 }}>x + y = סה״כ</span><span>משוואת סכום הנפחים</span></div></>}</div></div></>)}
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

/* ─── AgeLab (basic) ───────────────────────────────────────────────────────── */

function AgeLab() {
  const [ratio,setRatio]=useState(3);
  const [total,setTotal]=useState(48);
  const st=STATION.basic;
  const son=total/(ratio+1);
  const father=ratio*son;
  const valid=son>0&&father>0;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת בעיות גילאים</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו את היחס ואת סכום הגילאים — צפו כיצד המשוואה נפתרת.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 2rem" }}>
        {[{label:"גדול פי (יחס)",val:ratio,set:setRatio,min:2,max:6,step:1},{label:"סכום גילאים",val:total,set:setTotal,min:10,max:100,step:2}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      {/* Equation visualization */}
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <div style={{ textAlign:"center", marginBottom:12 }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:8 }}>משוואה</div><div style={{ color:st.accentColor, fontSize:20, fontWeight:800, fontFamily:"monospace" }}>x + {ratio}x = {total}</div></div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12 }}><div style={{ height:2, width:40, background:`rgba(${st.glowRgb},0.3)` }}/><span style={{ color:"#64748b", fontSize:12 }}>↓ פתרון ↓</span><div style={{ height:2, width:40, background:`rgba(${st.glowRgb},0.3)` }}/></div>
        <div style={{ textAlign:"center", marginTop:12 }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:8 }}>{ratio+1}x = {total}</div><div style={{ color:"#a78bfa", fontSize:22, fontWeight:800, fontFamily:"monospace" }}>x = {valid?son.toFixed(1):"—"}</div></div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"גיל הבן",val:valid?son.toFixed(1):"—"},{label:"גיל האב",val:valid?father.toFixed(1):"—"},{label:"סכום",val:String(total)}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:20, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>נסו יחס 4 עם סכום 50 — מה מקבלים?</p>
    </section>
  );
}

/* ─── DistanceLab (medium) ─────────────────────────────────────────────────── */

function DistanceLab() {
  const [dist,setDist]=useState(120);
  const [diff,setDiff]=useState(10);
  const [time,setTime]=useState(3);
  const st=STATION.medium;
  // v1·t + v2·t = dist, v1 = v2+diff
  // (v2+diff)·t + v2·t = dist → 2·v2·t + diff·t = dist → v2 = (dist - diff·t)/(2·t)
  const v2=time>0?(dist-diff*time)/(2*time):0;
  const v1=v2+diff;
  const valid=v2>0&&v1>0;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת בעיות מרחק</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו מרחק, הפרש מהירויות וזמן — צפו כיצד נפתרת המשוואה.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, maxWidth:500, margin:"0 auto 2rem" }}>
        {[{label:"מרחק (ק\"מ)",val:dist,set:setDist,min:20,max:300,step:10},{label:"הפרש מהירויות",val:diff,set:setDiff,min:0,max:30,step:2},{label:"זמן (שעות)",val:time,set:setTime,min:1,max:8,step:0.5}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:12, border:"1px solid rgba(255,255,255,0.4)", padding:"0.75rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      {/* Visual */}
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 260 80" className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={20} y1={40} x2={240} y2={40} stroke="#94a3b8" strokeWidth={1.5}/>
          {valid&&<><circle cx={20} cy={40} r={6} fill="#EA580C" opacity={0.7}/><circle cx={240} cy={40} r={6} fill="#a78bfa" opacity={0.7}/><text x={20} y={60} fontSize={10} fill="#EA580C" textAnchor="middle" fontFamily="monospace">v₁={v1.toFixed(1)}</text><text x={240} y={60} fontSize={10} fill="#a78bfa" textAnchor="middle" fontFamily="monospace">v₂={v2.toFixed(1)}</text><text x={130} y={30} fontSize={11} fill="#f59e0b" textAnchor="middle" fontFamily="monospace">{dist} ק"מ</text></>}
          {!valid&&<text x={130} y={45} fontSize={12} fill="#dc2626" textAnchor="middle">הנתונים לא מתאימים</text>}
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"v₁ (קמ\"ש)",val:valid?v1.toFixed(1):"—"},{label:"v₂ (קמ\"ש)",val:valid?v2.toFixed(1):"—"},{label:"d₁ (ק\"מ)",val:valid?(v1*time).toFixed(1):"—"},{label:"d₂ (ק\"מ)",val:valid?(v2*time).toFixed(1):"—"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:17, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>d₁ + d₂ תמיד שווה למרחק הכולל. בדקו!</p>
    </section>
  );
}

/* ─── MixtureLab (advanced) ────────────────────────────────────────────────── */

function MixtureLab() {
  const [concA,setConcA]=useState(10);
  const [concB,setConcB]=useState(30);
  const [target,setTarget]=useState(18);
  const st=STATION.advanced;
  const total=500;
  // concA/100·x + concB/100·(500-x) = target/100·500
  // x = (target·500 - concB·500)/(concA - concB)
  const denom=concA-concB;
  const x=denom!==0?(target*total-concB*total)/denom:0;
  const y=total-x;
  const valid=x>=0&&x<=total&&y>=0;
  const saltA=valid?concA/100*x:0;
  const saltB=valid?concB/100*y:0;
  const saltTotal=saltA+saltB;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת תערובות</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו ריכוזים וריכוז יעד — צפו כמה צריך מכל תמיסה (סה״כ 500 מ״ל).</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, maxWidth:500, margin:"0 auto 2rem" }}>
        {[{label:"% תמיסה A",val:concA,set:setConcA,min:1,max:50},{label:"% תמיסה B",val:concB,set:setConcB,min:1,max:50},{label:"% יעד",val:target,set:setTarget,min:1,max:50}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:12, border:"1px solid rgba(255,255,255,0.4)", padding:"0.75rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}%</span></div><input type="range" min={s.min} max={s.max} step={1} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      {/* Visual bars */}
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        {valid?(
          <div style={{ display:"flex", gap:4, height:40, borderRadius:8, overflow:"hidden", border:"1px solid rgba(60,54,42,0.15)" }}>
            <div style={{ width:`${(x/total)*100}%`, background:"rgba(220,38,38,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"#DC2626", fontWeight:700, fontFamily:"monospace", minWidth:40 }}>{x.toFixed(0)} מ״ל</div>
            <div style={{ width:`${(y/total)*100}%`, background:"rgba(167,139,250,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"#7c3aed", fontWeight:700, fontFamily:"monospace", minWidth:40 }}>{y.toFixed(0)} מ״ל</div>
          </div>
        ):(
          <div style={{ textAlign:"center", color:"#dc2626", fontSize:13 }}>הריכוז היעד חייב להיות בין שני הריכוזים</div>
        )}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"תמיסה A",val:valid?x.toFixed(0)+" מ״ל":"—"},{label:"תמיסה B",val:valid?y.toFixed(0)+" מ״ל":"—"},{label:"מלח כולל",val:valid?saltTotal.toFixed(1)+" מ״ל":"—"},{label:"בדיקה",val:valid?(saltTotal/total*100).toFixed(1)+"%":"—"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:15, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>הריכוז בבדיקה חייב להיות שווה לריכוז היעד. אם לא — יש טעות!</p>
    </section>
  );
}

/* ─── Tabs + FormulaBar ────────────────────────────────────────────────────── */

const TABS=[
  {id:"basic",label:"מתחיל",textColor:"text-green-700",border:"border-green-600",bg:"bg-green-600/10",glowColor:"rgba(22,163,74,0.3)"},
  {id:"medium",label:"בינוני",textColor:"text-orange-700",border:"border-orange-600",bg:"bg-orange-600/10",glowColor:"rgba(234,88,12,0.3)"},
  {id:"advanced",label:"מתקדם",textColor:"text-red-700",border:"border-red-700",bg:"bg-red-700/10",glowColor:"rgba(220,38,38,0.3)"},
];

function FormulaBar() {
  const [activeTab,setActiveTab]=useState<"steps"|"distance"|"mixture"|null>(null);
  const tabs=[
    {id:"steps" as const,label:"📝 שלבי פתרון",tex:"x = ?",color:"#16A34A",borderColor:"rgba(22,163,74,0.35)"},
    {id:"distance" as const,label:"🚗 דרך-מהירות-זמן",tex:"d = v \\cdot t",color:"#EA580C",borderColor:"rgba(234,88,12,0.35)"},
    {id:"mixture" as const,label:"🧪 תערובות",tex:"C_1V_1 + C_2V_2",color:"#DC2626",borderColor:"rgba(220,38,38,0.35)"},
  ];
  return (
    <div style={{ borderRadius:12, border:"1px solid rgba(60,54,42,0.15)", background:"rgba(255,255,255,0.75)", padding:"1.25rem", marginBottom:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginBottom:12, textAlign:"center" }}>נוסחאות</div>
      <div style={{ display:"flex", gap:6, marginBottom:activeTab?14:0 }}>
        {tabs.map(t=>{const isA=activeTab===t.id;return(<button key={t.id} onClick={()=>setActiveTab(isA?null:t.id)} style={{ flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", border:`1.5px solid ${isA?t.borderColor:"rgba(60,54,42,0.1)"}`, background:isA?`${t.color}0D`:"rgba(60,54,42,0.03)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{ fontSize:11, fontWeight:700, color:isA?t.color:"#6B7280" }}>{t.label}</span><span style={{ color:isA?t.color:"#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>);})}
      </div>
      {activeTab==="steps"&&(<motion.div key="s" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(22,163,74,0.25)", background:"rgba(220,252,231,0.4)", padding:16 }}><div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>שלבי פתרון בעיה מילולית</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>הגדרת נעלם:</strong> "נסמן x = גיל הבן".</li><li><strong>תרגום:</strong> "גדול פי 3" → 3x, "סכום" → x + 3x.</li><li><strong>משוואה:</strong> שוויון בין ביטויים → פתרון.</li><li><strong>בדיקה:</strong> הציבו חזרה בנתונים.</li></ol></div></div></div></motion.div>)}
      {activeTab==="distance"&&(<motion.div key="d" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(234,88,12,0.25)", background:"rgba(255,247,237,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"d = v \\cdot t"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(234,88,12,0.06)", border:"1px solid rgba(234,88,12,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>דרך = מהירות × זמן</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>זה לקראת זה: d₁ + d₂ = מרחק כולל.</li><li>באותו כיוון: d₁ − d₂ = הפרש מרחקים.</li><li>שימו לב ליחידות: קמ"ש × שעות = ק"מ.</li></ol></div><div style={{ marginTop:10, color:"#B45309", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: v₁=50, v₂=40, t=2 → d₁+d₂ = 100+80 = 180 ק"מ</div></div></div></motion.div>)}
      {activeTab==="mixture"&&(<motion.div key="m" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(220,38,38,0.25)", background:"rgba(254,242,242,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"C_1 \\cdot V_1 + C_2 \\cdot V_2 = C_3 \\cdot V_3"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>כמות = ריכוז × נפח</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>המשוואה: כמות חומר מ-A + כמות חומר מ-B = כמות חומר בתערובת.</li><li>משוואה נוספת: V₁ + V₂ = V₃ (סכום נפחים).</li><li>ריכוז באחוזים → חלקו ב-100 לפני הכפלה.</li></ol></div><div style={{ marginTop:10, color:"#DC2626", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: 0.1·x + 0.3·(500−x) = 0.18·500</div></div></div></motion.div>)}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function WordProblemEquationsPage() {
  const [selectedLevel,setSelectedLevel]=useState<"basic"|"medium"|"advanced">("basic");
  const ex=exercises.find(e=>e.id===selectedLevel)!;
  const lvlRgb=selectedLevel==="basic"?"45,90,39":selectedLevel==="medium"?"163,79,38":"139,38,53";
  return (
    <main style={{ minHeight:"100vh", background:"#F3EFE0", backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:"#2D3436", ["--lvl-rgb" as string]:lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`textarea,input[type="text"],input[type="password"]{outline:none!important}textarea:focus,input[type="text"]:focus{outline:none!important;border-color:rgba(var(--lvl-rgb),0.65)!important;box-shadow:0 0 0 3px rgba(var(--lvl-rgb),0.12)!important}input[type="range"]{outline:none!important}input[type="range"]:focus{outline:none!important}button:focus,button:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(var(--lvl-rgb),0.35)!important}button:focus:not(:focus-visible){box-shadow:none!important}`}</style>
      <div style={{ borderBottom:"1px solid rgba(60,54,42,0.15)", background:"#F3EFE0" }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div><h1 style={{ fontSize:22, fontWeight:700, color:"#2D3436", margin:0 }}>בעיות מילוליות עם AI — כיתה י׳ (3 יח׳)</h1><p style={{ fontSize:13, color:"#6B7280", margin:"2px 0 0" }}>גילאים, מרחק-מהירות-זמן, תערובות — ואיך לשאול AI את השאלות הנכונות</p></div>
          <Link href="/3u/topic/grade10/word-problems" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap" }} onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D";}} onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A";}}><span style={{ fontSize:16 }}>←</span>חזרה</Link>
        </div>
      </div>
      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="3u/grade10/word-problems/equations"/>
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(60,54,42,0.15)" }}>{TABS.map(tab=>{const active=selectedLevel===tab.id;return(<button key={tab.id} onClick={()=>setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active?`${tab.bg} border ${tab.border} ${tab.textColor}`:"text-stone-500 hover:text-stone-800"}`} style={active?{boxShadow:`0 0 14px ${tab.glowColor}`}:undefined}>{tab.label}</button>);})}</div>
        <FormulaBar/>
        <motion.div key={selectedLevel} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22}}><ExerciseCard ex={ex}/></motion.div>
        {selectedLevel==="basic"&&<AgeLab/>}
        {selectedLevel==="medium"&&<DistanceLab/>}
        {selectedLevel==="advanced"&&<MixtureLab/>}
        <div style={{ marginTop:"1.5rem" }}><MarkComplete subtopicId="3u/grade10/word-problems/equations" level={selectedLevel}/></div>
      </div>
    </main>
  );
}
