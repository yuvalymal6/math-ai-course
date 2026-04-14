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
    <svg viewBox="0 0 220 220" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={110} y1={15} x2={110} y2={205} stroke="#94a3b8" strokeWidth={1} />
      <line x1={15} y1={110} x2={205} y2={110} stroke="#94a3b8" strokeWidth={1} />
      {/* Unit circle */}
      <circle cx={110} cy={110} r={80} fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.6} />
      {/* Point on circle */}
      <circle cx={178} cy={64} r={4} fill="#f59e0b" />
      {/* Radius to point */}
      <line x1={110} y1={110} x2={178} y2={64} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
      {/* Projections */}
      <line x1={178} y1={64} x2={178} y2={110} stroke="#a78bfa" strokeWidth={1} strokeDasharray="3,2" />
      <line x1={178} y1={64} x2={110} y2={64} stroke="#34d399" strokeWidth={1} strokeDasharray="3,2" />
      {/* Labels */}
      <text x={182} y={114} fontSize={10} fill="#a78bfa" fontFamily="sans-serif">cos?</text>
      <text x={96} y={60} fontSize={10} fill="#34d399" fontFamily="sans-serif">sin?</text>
      {/* Angle arc */}
      <path d="M130,110 A20,20 0 0,0 124,94" fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      <text x={134} y={100} fontSize={9} fill="#f59e0b" fontFamily="sans-serif">α</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={110} y1={15} x2={110} y2={205} stroke="#94a3b8" strokeWidth={1} />
      <line x1={15} y1={110} x2={205} y2={110} stroke="#94a3b8" strokeWidth={1} />
      <circle cx={110} cy={110} r={80} fill="none" stroke="#EA580C" strokeWidth={2} opacity={0.6} />
      {/* Quadrant labels */}
      <text x={145} y={70} fontSize={11} fill="#16A34A" textAnchor="middle" fontFamily="sans-serif">I (+,+)</text>
      <text x={65} y={70} fontSize={11} fill="#EA580C" textAnchor="middle" fontFamily="sans-serif">II (−,+)</text>
      <text x={65} y={160} fontSize={11} fill="#DC2626" textAnchor="middle" fontFamily="sans-serif">III (−,−)</text>
      <text x={145} y={160} fontSize={11} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">IV (+,−)</text>
      {/* Special angle dots */}
      <circle cx={178} cy={64} r={3} fill="#f59e0b" opacity={0.7} />
      <circle cx={42} cy={64} r={3} fill="#f59e0b" opacity={0.7} />
      <circle cx={42} cy={156} r={3} fill="#f59e0b" opacity={0.7} />
      <circle cx={178} cy={156} r={3} fill="#f59e0b" opacity={0.7} />
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={110} y1={15} x2={110} y2={205} stroke="#94a3b8" strokeWidth={1} />
      <line x1={15} y1={110} x2={205} y2={110} stroke="#94a3b8" strokeWidth={1} />
      <circle cx={110} cy={110} r={80} fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.5} />
      {/* Two points: α and α+180° (related angles) */}
      <circle cx={165} cy={41} r={4} fill="#34d399" />
      <circle cx={55} cy={179} r={4} fill="#DC2626" />
      <line x1={110} y1={110} x2={165} y2={41} stroke="#34d399" strokeWidth={1.5} strokeDasharray="4,3" />
      <line x1={110} y1={110} x2={55} y2={179} stroke="#DC2626" strokeWidth={1.5} strokeDasharray="4,3" />
      <text x={170} y={36} fontSize={10} fill="#34d399" fontFamily="sans-serif">α</text>
      <text x={40} y={190} fontSize={10} fill="#DC2626" fontFamily="sans-serif">α+π</text>
      {/* Symmetry hint */}
      <text x={110} y={210} fontSize={9} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">סימטריה?</text>
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
function LadderAdvanced({ steps }: { steps:PromptStep[] }) { const [masterPassed,setMasterPassed]=useState(false); const [unlockedCount,setUnlockedCount]=useState(1); const allPassed=masterPassed&&unlockedCount>steps.length; return (<div><MasterPromptGate onPass={()=>setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["מעגל יחידה","sin","cos","רדיאנים","זווית","רבע","סימטריה"]}/>{steps.map((s,i)=>(<div key={i} style={{ marginBottom:8 }}>{(!masterPassed||i>=unlockedCount)?(<div style={{ borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", background:"rgba(255,255,255,0.7)", padding:"14px 16px", opacity:0.5, pointerEvents:"none" as const, display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ color:"#6B7280", fontSize:13, fontWeight:600 }}>{s.phase} — {s.label}</span><span style={{ fontSize:16 }}>🔒</span></div>):(<div><div style={{ borderRadius:14, border:"1px solid rgba(22,163,74,0.3)", background:"rgba(255,255,255,0.9)", padding:"14px 16px", marginBottom:8 }}><div style={{ color:"#15803d", fontSize:13, fontWeight:700, marginBottom:6 }}>{s.phase} — {s.label}</div><div style={{ color:"#334155", fontSize:13, lineHeight:1.6 }}>{s.prompt}</div></div><button onClick={()=>setUnlockedCount(v=>Math.max(v,i+2))} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}{allPassed&&(<div style={{ borderRadius:16, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:"1.25rem 1.5rem", marginTop:16, textAlign:"center" }}><div style={{ fontSize:28, marginBottom:8 }}>🏆</div><div style={{ color:"#14532d", fontWeight:800, fontSize:16, marginBottom:4 }}>כל הכבוד!</div><div style={{ color:"#166534", fontSize:13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}</div>); }

/* ─── Exercise Data ────────────────────────────────────────────────────────── */

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "הגדרת sin ו-cos על מעגל היחידה",
    problem: "נתון מעגל היחידה (רדיוס 1, מרכז בראשית).\nנקודה P על המעגל יוצרת זווית α עם ציר x החיובי.\n\nא. מהן הקואורדינטות של P במונחי sin ו-cos?\nב. אם α = 60°, מצאו את הקואורדינטות של P.\nג. הסבירו למה sin²α + cos²α = 1 תמיד.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בין cos ל-sin", text: "cos α = הקואורדינטה ה-x של הנקודה. sin α = הקואורדינטה ה-y. תלמידים מחליפים — כלל זכירה: cos = אופקי (coordinate), sin = אנכי (skyward)." },
      { title: "⚠️ שכחת שהרדיוס = 1", text: "במעגל היחידה r = 1, ולכן cos α = x/1 = x ו-sin α = y/1 = y. אם הרדיוס שונה מ-1, צריך לחלק ב-r. תמיד ודאו שמדובר במעגל יחידה." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י', 5 יחידות, ומצרף/ת שאלה על מעגל היחידה — הגדרת sin ו-cos כקואורדינטות. אני רוצה שתהיה המורה הפרטי שלי — תסביר לי את הלוגיקה ולא תיתן תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"קואורדינטות על המעגל", coaching:"", prompt:"נקודה P על מעגל יחידה בזווית α. תנחה אותי — מהי ההגדרה של cos α ו-sin α כקואורדינטות x ו-y.", keywords:[], keywordHint:"", contextWords:["cos","sin","מעגל","יחידה","קואורדינטה","x","y"] },
      { phase:"סעיף ב׳", label:"ערכים עבור 60°", coaching:"", prompt:"α = 60°. תכווין אותי — מהן הקואורדינטות של P, כלומר cos 60° ו-sin 60°.", keywords:[], keywordHint:"", contextWords:["60","cos","sin","ערך","זווית","מיוחדת"] },
      { phase:"סעיף ג׳", label:"הזהות sin²+cos²=1", coaching:"", prompt:"P = (cos α, sin α) על מעגל רדיוס 1. תדריך אותי — למה x²+y² = 1 על המעגל, ומה זה אומר על sin²+cos².", keywords:[], keywordHint:"", contextWords:["זהות","ריבוע","סכום","מעגל","פיתגורס","1"] },
    ],
  },
  {
    id: "medium",
    title: "רבעים וסימני sin/cos",
    problem: "מעגל היחידה מחולק ל-4 רבעים.\n\nא. בכל רבע, קבעו את הסימן (+/−) של sin α ושל cos α.\nב. אם sin α > 0 ו-cos α < 0, באיזה רבע נמצאת α?\nג. מצאו את sin 150° ואת cos 150° בעזרת זווית ייחוס.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בסימנים ברבע השני", text: "ברבע II: x < 0 (cos שלילי) אבל y > 0 (sin חיובי). תלמידים שוכחים שcos הוא x ו-sin הוא y ומתבלבלים בסימנים." },
      { title: "⚠️ שכחת זווית הייחוס", text: "לכל זווית בכל רבע יש זווית ייחוס (הזווית החדה עם ציר x). sin 150° = sin 30° (אותו y), אבל cos 150° = −cos 30° (x הפוך). הסימן נקבע לפי הרבע." },
    ],
    goldenPrompt: `אני בכיתה י', 5 יחידות, מצרף/ת תרגיל על רבעים במעגל היחידה — סימני sin/cos וזווית ייחוס.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על הקשר בין רבע לסימן.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"סימנים בכל רבע", coaching:"", prompt:"מעגל יחידה, 4 רבעים. תנחה אותי — cos=x, sin=y. בכל רבע, מה הסימן של x ושל y.", keywords:[], keywordHint:"", contextWords:["רבע","סימן","חיובי","שלילי","cos","sin"] },
      { phase:"סעיף ב׳", label:"זיהוי רבע מסימנים", coaching:"", prompt:"sin α > 0 (y חיובי) ו-cos α < 0 (x שלילי). תכווין אותי — באיזה רבע x<0 ו-y>0.", keywords:[], keywordHint:"", contextWords:["רבע","שני","sin חיובי","cos שלילי","זיהוי","תנאי"] },
      { phase:"סעיף ג׳", label:"sin 150° ו-cos 150°", coaching:"", prompt:"150° ברבע II. תדריך אותי — מהי זווית הייחוס (180°−150°=30°), ואיך קובעים sin 150° ו-cos 150°.", keywords:[], keywordHint:"", contextWords:["ייחוס","150","30","רבע","סימן","ערך"] },
    ],
  },
  {
    id: "advanced",
    title: "זוויות קשורות ורדיאנים",
    problem: "נתונה זווית α במעגל היחידה.\n\nא. הסבירו מה הקשר בין sin α ל-sin(π − α), ובין cos α ל-cos(π − α).\nב. הוכיחו ש-sin(α + π) = −sin α ו-cos(α + π) = −cos α.\nג. אם sin α = 3/5 ו-α ברבע II, מצאו cos α, tan α, sin(π − α) ו-cos(2π − α).\nד. המירו 210° לרדיאנים ומצאו sin 210° ו-cos 210°.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בין π − α ל-α + π", text: "π − α = שיקוף ביחס לציר y (רבע II). α + π = נקודה נגדית (הפוך דרך המרכז). sin(π−α) = sin α, אבל sin(α+π) = −sin α. אלו נוסחאות שונות!" },
      { title: "⚠️ טעות בהמרה מעלות ↔ רדיאנים", text: "180° = π רדיאנים. לכן 210° = 210·π/180 = 7π/6. תלמידים שוכחים לצמצם או מכפילים בכיוון ההפוך." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: מה הקשר בין sin(π−α) ל-sin α, ואיך ממירים מעלות לרדיאנים? (לפחות 80 תווים)",
    steps: [
      { phase:"סעיף א׳", label:"sin(π−α) ו-cos(π−α)", coaching:"", prompt:"π−α = שיקוף ביחס לציר y. תנחה אותי — מה קורה ל-x ול-y כששנים את הזווית ל-π−α.", keywords:[], keywordHint:"", contextWords:["שיקוף","π−α","sin","cos","x","y"] },
      { phase:"סעיף ב׳", label:"sin(α+π) ו-cos(α+π)", coaching:"", prompt:"α+π = הנקודה הנגדית על המעגל. תכווין אותי — מה הקואורדינטות של הנקודה הנגדית.", keywords:[], keywordHint:"", contextWords:["נגדי","α+π","מינוס","sin","cos","הוכחה"] },
      { phase:"סעיף ג׳", label:"חישוב ערכים ברבע II", coaching:"", prompt:"sin α = 3/5, α ברבע II. תדריך אותי — איך מוצאים cos α (שלילי!), tan α, ואיך משתמשים בנוסחאות.", keywords:[], keywordHint:"", contextWords:["רבע","שלילי","cos","tan","sin²+cos²","חישוב"] },
      { phase:"סעיף ד׳", label:"המרה לרדיאנים", coaching:"", prompt:"210°. תנחה אותי — איך ממירים לרדיאנים (×π/180), מה הרבע, ומה sin/cos.", keywords:[], keywordHint:"", contextWords:["רדיאנים","המרה","π","180","210","ייחוס"] },
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
        <div style={{ textAlign:"center", marginBottom:14 }}><div style={{ color:s.accentColor, fontSize:15, fontWeight:800, marginBottom:4 }}>⭕ מעגל היחידה (5 יח׳)</div><div style={{ color:"#6B7280", fontSize:12, lineHeight:1.55 }}>{ex.id==="basic"&&"הגדרת sin/cos כקואורדינטות, sin²+cos²=1."}{ex.id==="medium"&&"רבעים, סימנים, זווית ייחוס."}{ex.id==="advanced"&&"זוויות קשורות, רדיאנים, נוסחאות."}</div></div>
        <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:14 }}/>
        <div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>🎯 הגדרות</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:100 }}>cos α = x</span><span>קואורדינטה אופקית על המעגל</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:100 }}>sin α = y</span><span>קואורדינטה אנכית על המעגל</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:100 }}>r = 1</span><span>רדיוס מעגל היחידה</span></div></div></div>
        {ex.id!=="basic"&&(<><div style={{ height:1, background:"rgba(60,54,42,0.08)", marginBottom:12 }}/><div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>✨ {ex.id==="medium"?"רבעים":"זוויות קשורות"}</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}>{ex.id==="medium"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:120 }}>I: (+,+)</span><span>sin&gt;0, cos&gt;0</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:120 }}>II: (−,+)</span><span>sin&gt;0, cos&lt;0</span></div></>}{ex.id==="advanced"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:140 }}>sin(π−α)=sin α</span><span>שיקוף ציר y</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:140 }}>sin(α+π)=−sin α</span><span>נקודה נגדית</span></div></>}</div></div></>)}
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

/* ─── UnitCircleLab (basic) ────────────────────────────────────────────────── */

function UnitCircleLab() {
  const [angle,setAngle]=useState(60);
  const st=STATION.basic;
  const rad=(angle*Math.PI)/180;
  const cosV=Math.cos(rad); const sinV=Math.sin(rad);
  const r=75, cx=110, cy=110;
  const px=cx+r*cosV; const py=cy-r*sinV;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת מעגל היחידה</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>סובבו את הזווית — צפו כיצד sin ו-cos משתנים.</p>
      <div style={{ maxWidth:400, margin:"0 auto 2rem" }}><div style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>α (מעלות)</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{angle}°</span></div><input type="range" min={0} max={360} step={5} value={angle} onChange={e=>setAngle(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div></div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 220 220" className="w-full max-w-sm mx-auto" aria-hidden>
          <line x1={cx} y1={15} x2={cx} y2={205} stroke="#94a3b8" strokeWidth={0.8}/>
          <line x1={15} y1={cy} x2={205} y2={cy} stroke="#94a3b8" strokeWidth={0.8}/>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={st.accentColor} strokeWidth={2} opacity={0.4}/>
          {/* Radius */}
          <line x1={cx} y1={cy} x2={px} y2={py} stroke="#f59e0b" strokeWidth={2}/>
          {/* Point */}
          <circle cx={px} cy={py} r={5} fill="#f59e0b"/>
          {/* Projections */}
          <line x1={px} y1={py} x2={px} y2={cy} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="3,2"/>
          <line x1={px} y1={py} x2={cx} y2={py} stroke="#34d399" strokeWidth={1.5} strokeDasharray="3,2"/>
          {/* cos label on x */}
          <line x1={cx} y1={cy+3} x2={px} y2={cy+3} stroke="#a78bfa" strokeWidth={2}/>
          <text x={(cx+px)/2} y={cy+16} fontSize={10} fill="#a78bfa" textAnchor="middle" fontFamily="monospace">cos={cosV.toFixed(2)}</text>
          {/* sin label on y */}
          <line x1={cx-3} y1={cy} x2={cx-3} y2={py} stroke="#34d399" strokeWidth={2}/>
          <text x={cx-20} y={(cy+py)/2} fontSize={10} fill="#34d399" textAnchor="middle" fontFamily="monospace" transform={`rotate(-90,${cx-20},${(cy+py)/2})`}>sin={sinV.toFixed(2)}</text>
          {/* Angle arc */}
          <path d={`M${cx+18},${cy} A18,18 0 ${angle>180?1:0},0 ${cx+18*Math.cos(rad)},${cy-18*Math.sin(rad)}`} fill="none" stroke="#f59e0b" strokeWidth={1.5}/>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
        {[{label:"cos α",val:cosV.toFixed(4)},{label:"sin α",val:sinV.toFixed(4)},{label:"sin²+cos²",val:(sinV*sinV+cosV*cosV).toFixed(4)},{label:"רבע",val:angle<=90?"I":angle<=180?"II":angle<=270?"III":"IV"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:10, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:10, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:15, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>sin²α + cos²α = 1 תמיד! סובבו 360° — הנקודה חוזרת להתחלה.</p>
    </section>
  );
}

/* ─── QuadrantLab (medium) ─────────────────────────────────────────────────── */

function QuadrantLab() {
  const [angle,setAngle]=useState(150);
  const st=STATION.medium;
  const rad=(angle*Math.PI)/180;
  const cosV=Math.cos(rad); const sinV=Math.sin(rad);
  const refAngle=angle<=90?angle:angle<=180?180-angle:angle<=270?angle-180:360-angle;
  const quadrant=angle<=90?"I":angle<=180?"II":angle<=270?"III":"IV";
  const cosSign=cosV>=0?"+":"−"; const sinSign=sinV>=0?"+":"−";
  const r=75, cx=110, cy=110;
  const px=cx+r*cosV; const py=cy-r*sinV;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת רבעים וסימנים</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>סובבו את הזווית — צפו ברבע, בסימנים ובזווית הייחוס.</p>
      <div style={{ maxWidth:400, margin:"0 auto 2rem" }}><div style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>α</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{angle}°</span></div><input type="range" min={0} max={360} step={5} value={angle} onChange={e=>setAngle(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div></div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 220 220" className="w-full max-w-sm mx-auto" aria-hidden>
          <line x1={cx} y1={15} x2={cx} y2={205} stroke="#94a3b8" strokeWidth={0.8}/><line x1={15} y1={cy} x2={205} y2={cy} stroke="#94a3b8" strokeWidth={0.8}/>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={st.accentColor} strokeWidth={2} opacity={0.3}/>
          {/* Quadrant highlight */}
          {quadrant==="I"&&<path d={`M${cx},${cy} L${cx+r},${cy} A${r},${r} 0 0,0 ${cx},${cy-r} Z`} fill="rgba(22,163,74,0.06)"/>}
          {quadrant==="II"&&<path d={`M${cx},${cy} L${cx},${cy-r} A${r},${r} 0 0,0 ${cx-r},${cy} Z`} fill="rgba(234,88,12,0.06)"/>}
          {quadrant==="III"&&<path d={`M${cx},${cy} L${cx-r},${cy} A${r},${r} 0 0,0 ${cx},${cy+r} Z`} fill="rgba(220,38,38,0.06)"/>}
          {quadrant==="IV"&&<path d={`M${cx},${cy} L${cx},${cy+r} A${r},${r} 0 0,0 ${cx+r},${cy} Z`} fill="rgba(167,139,250,0.06)"/>}
          <line x1={cx} y1={cy} x2={px} y2={py} stroke="#f59e0b" strokeWidth={2}/><circle cx={px} cy={py} r={5} fill="#f59e0b"/>
          <text x={px+(cosV>0?8:-30)} y={py+(sinV>0?-8:16)} fontSize={10} fill="#f59e0b" fontFamily="monospace">({cosV.toFixed(2)},{sinV.toFixed(2)})</text>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
        {[{label:"רבע",val:quadrant},{label:"סימנים",val:`(${cosSign},${sinSign})`},{label:"ייחוס",val:`${refAngle}°`},{label:"sin/cos",val:`${sinV.toFixed(2)} / ${cosV.toFixed(2)}`}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:10, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:10, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:15, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>150° → רבע II → ייחוס 30° → sin=+sin30°, cos=−cos30°.</p>
    </section>
  );
}

/* ─── RelatedAnglesLab (advanced) ──────────────────────────────────────────── */

function RelatedAnglesLab() {
  const [angle,setAngle]=useState(40);
  const st=STATION.advanced;
  const rad=(angle*Math.PI)/180;
  const sinA=Math.sin(rad); const cosA=Math.cos(rad);
  const related=[
    {label:"α",deg:angle,sin:sinA,cos:cosA},
    {label:"π−α",deg:180-angle,sin:Math.sin((180-angle)*Math.PI/180),cos:Math.cos((180-angle)*Math.PI/180)},
    {label:"α+π",deg:angle+180,sin:Math.sin((angle+180)*Math.PI/180),cos:Math.cos((angle+180)*Math.PI/180)},
    {label:"2π−α",deg:360-angle,sin:Math.sin((360-angle)*Math.PI/180),cos:Math.cos((360-angle)*Math.PI/180)},
  ];
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת זוויות קשורות</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו α — צפו כיצד הזוויות הקשורות משתנות.</p>
      <div style={{ maxWidth:400, margin:"0 auto 2rem" }}><div style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>α</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{angle}°</span></div><input type="range" min={5} max={85} step={5} value={angle} onChange={e=>setAngle(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div></div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, textAlign:"center" }}>
          <thead><tr>{["זווית","מעלות","sin","cos"].map(h=>(<th key={h} style={{ padding:"8px", borderBottom:`2px solid rgba(${st.glowRgb},0.2)`, color:st.accentColor, fontWeight:700, fontSize:12 }}>{h}</th>))}</tr></thead>
          <tbody>{related.map((r,i)=>(<tr key={i} style={{ background:i===0?"rgba(22,163,74,0.05)":"transparent" }}><td style={{ padding:"6px", borderBottom:"1px solid rgba(60,54,42,0.08)", fontWeight:700, color:i===0?"#15803d":"#2D3436", fontFamily:"monospace" }}>{r.label}</td><td style={{ padding:"6px", borderBottom:"1px solid rgba(60,54,42,0.08)", fontFamily:"monospace" }}>{r.deg}°</td><td style={{ padding:"6px", borderBottom:"1px solid rgba(60,54,42,0.08)", fontFamily:"monospace", color:r.sin>=0?"#16a34a":"#dc2626" }}>{r.sin.toFixed(3)}</td><td style={{ padding:"6px", borderBottom:"1px solid rgba(60,54,42,0.08)", fontFamily:"monospace", color:r.cos>=0?"#16a34a":"#dc2626" }}>{r.cos.toFixed(3)}</td></tr>))}</tbody>
        </table>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"sin(π−α) = sin α?",val:Math.abs(related[1].sin-sinA)<0.001?"✅ כן":"❌"},{label:"sin(α+π) = −sin α?",val:Math.abs(related[2].sin+sinA)<0.001?"✅ כן":"❌"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:17 }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>sin(π−α)=sin α תמיד, sin(α+π)=−sin α תמיד. הנוסחאות עובדות לכל α!</p>
    </section>
  );
}

/* ─── Tabs + FormulaBar ────────────────────────────────────────────────────── */

const TABS=[{id:"basic",label:"מתחיל",textColor:"text-green-700",border:"border-green-600",bg:"bg-green-600/10",glowColor:"rgba(22,163,74,0.3)"},{id:"medium",label:"בינוני",textColor:"text-orange-700",border:"border-orange-600",bg:"bg-orange-600/10",glowColor:"rgba(234,88,12,0.3)"},{id:"advanced",label:"מתקדם",textColor:"text-red-700",border:"border-red-700",bg:"bg-red-700/10",glowColor:"rgba(220,38,38,0.3)"}];

function FormulaBar() {
  const [activeTab,setActiveTab]=useState<"def"|"quad"|"related"|null>(null);
  const tabs=[{id:"def" as const,label:"⭕ הגדרה",tex:"(\\cos\\alpha,\\sin\\alpha)",color:"#16A34A",borderColor:"rgba(22,163,74,0.35)"},{id:"quad" as const,label:"📊 רבעים",tex:"\\pm",color:"#EA580C",borderColor:"rgba(234,88,12,0.35)"},{id:"related" as const,label:"🔗 קשורות",tex:"\\pi-\\alpha",color:"#DC2626",borderColor:"rgba(220,38,38,0.35)"}];
  return (
    <div style={{ borderRadius:12, border:"1px solid rgba(60,54,42,0.15)", background:"rgba(255,255,255,0.75)", padding:"1.25rem", marginBottom:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginBottom:12, textAlign:"center" }}>נוסחאות</div>
      <div style={{ display:"flex", gap:6, marginBottom:activeTab?14:0 }}>{tabs.map(t=>{const isA=activeTab===t.id;return(<button key={t.id} onClick={()=>setActiveTab(isA?null:t.id)} style={{ flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", border:`1.5px solid ${isA?t.borderColor:"rgba(60,54,42,0.1)"}`, background:isA?`${t.color}0D`:"rgba(60,54,42,0.03)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{ fontSize:11, fontWeight:700, color:isA?t.color:"#6B7280" }}>{t.label}</span><span style={{ color:isA?t.color:"#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>);})}</div>
      {activeTab==="def"&&(<motion.div key="d" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(22,163,74,0.25)", background:"rgba(220,252,231,0.4)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"P = (\\cos\\alpha,\\;\\sin\\alpha)"}</DisplayMath><DisplayMath>{"\\sin^2\\alpha + \\cos^2\\alpha = 1"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>הגדרה על מעגל היחידה</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>cos α = קואורדינטת x של הנקודה על המעגל.</li><li>sin α = קואורדינטת y של הנקודה על המעגל.</li><li>sin²α + cos²α = 1 (כי x²+y² = r² = 1).</li></ol></div></div></div></motion.div>)}
      {activeTab==="quad"&&(<motion.div key="q" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(234,88,12,0.25)", background:"rgba(255,247,237,0.95)", padding:16 }}><div style={{ borderRadius:10, background:"rgba(234,88,12,0.06)", border:"1px solid rgba(234,88,12,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>סימנים לפי רבע</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>I (0°-90°):</strong> sin+, cos+ → הכל חיובי.</li><li><strong>II (90°-180°):</strong> sin+, cos− → רק sin חיובי.</li><li><strong>III (180°-270°):</strong> sin−, cos− → הכל שלילי.</li><li><strong>IV (270°-360°):</strong> sin−, cos+ → רק cos חיובי.</li></ol></div><div style={{ marginTop:10, color:"#B45309", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 כלל: "All Students Take Calculus" → I: All, II: Sin, III: Tan, IV: Cos.</div></div></div></motion.div>)}
      {activeTab==="related"&&(<motion.div key="r" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(220,38,38,0.25)", background:"rgba(254,242,242,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"\\sin(\\pi-\\alpha)=\\sin\\alpha \\quad \\cos(\\pi-\\alpha)=-\\cos\\alpha"}</DisplayMath><DisplayMath>{"\\sin(\\alpha+\\pi)=-\\sin\\alpha \\quad \\cos(\\alpha+\\pi)=-\\cos\\alpha"}</DisplayMath><DisplayMath>{"\\sin(2\\pi-\\alpha)=-\\sin\\alpha \\quad \\cos(2\\pi-\\alpha)=\\cos\\alpha"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>זוויות קשורות</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>π−α:</strong> שיקוף ציר y → x הופך סימן.</li><li><strong>α+π:</strong> נגדי → שניהם הופכים.</li><li><strong>2π−α:</strong> שיקוף ציר x → y הופך סימן.</li></ol></div></div></div></motion.div>)}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function UnitCirclePage5U() {
  const [selectedLevel,setSelectedLevel]=useState<"basic"|"medium"|"advanced">("basic");
  const ex=exercises.find(e=>e.id===selectedLevel)!;
  const lvlRgb=selectedLevel==="basic"?"45,90,39":selectedLevel==="medium"?"163,79,38":"139,38,53";
  return (
    <main style={{ minHeight:"100vh", background:"#F3EFE0", backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:"#2D3436", ["--lvl-rgb" as string]:lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`textarea,input[type="text"],input[type="password"]{outline:none!important}textarea:focus,input[type="text"]:focus{outline:none!important;border-color:rgba(var(--lvl-rgb),0.65)!important;box-shadow:0 0 0 3px rgba(var(--lvl-rgb),0.12)!important}input[type="range"]{outline:none!important}input[type="range"]:focus{outline:none!important}button:focus,button:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(var(--lvl-rgb),0.35)!important}button:focus:not(:focus-visible){box-shadow:none!important}`}</style>
      <div style={{ borderBottom:"1px solid rgba(60,54,42,0.15)", background:"#F3EFE0" }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div><h1 style={{ fontSize:22, fontWeight:700, color:"#2D3436", margin:0 }}>מעגל היחידה עם AI — כיתה י׳ (5 יח׳)</h1><p style={{ fontSize:13, color:"#6B7280", margin:"2px 0 0" }}>sin/cos על המעגל, רבעים, זוויות קשורות, רדיאנים</p></div>
          <Link href="/5u/topic/grade10/trig-functions" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap" }} onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D";}} onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A";}}><span style={{ fontSize:16 }}>←</span>חזרה</Link>
        </div>
      </div>
      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="5u/grade10/trig-functions/unit-circle"/>
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(60,54,42,0.15)" }}>{TABS.map(tab=>{const active=selectedLevel===tab.id;return(<button key={tab.id} onClick={()=>setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active?`${tab.bg} border ${tab.border} ${tab.textColor}`:"text-stone-500 hover:text-stone-800"}`} style={active?{boxShadow:`0 0 14px ${tab.glowColor}`}:undefined}>{tab.label}</button>);})}</div>
        <FormulaBar/>
        <motion.div key={selectedLevel} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22}}><ExerciseCard ex={ex}/></motion.div>
        {selectedLevel==="basic"&&<UnitCircleLab/>}
        {selectedLevel==="medium"&&<QuadrantLab/>}
        {selectedLevel==="advanced"&&<RelatedAnglesLab/>}
        <div style={{ marginTop:"1.5rem" }}><MarkComplete subtopicId="5u/grade10/trig-functions/unit-circle" level={selectedLevel}/></div>
      </div>
    </main>
  );
}
