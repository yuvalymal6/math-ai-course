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
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) { const x = 30 + i * 3.5; const t = (i - 30) / 12; pts.push(`${x},${140 - 100 * Math.exp(t) / Math.exp(2.5)}`); }
  return (
    <svg viewBox="0 0 260 170" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={20} x2={40} y2={150} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={25} y1={140} x2={245} y2={140} stroke="#94a3b8" strokeWidth={1.2} />
      <polyline points={pts.join(" ")} fill="none" stroke="#16A34A" strokeWidth={2.5} opacity={0.7} />
      <text x={245} y={50} fontSize={11} fill="#16A34A" fontFamily="serif" fontWeight={700}>eˣ</text>
      {/* y-intercept */}
      <circle cx={30 + 30 * 3.5} cy={140 - 100 / Math.exp(2.5)} r={4} fill="#f59e0b" />
      <text x={30 + 30 * 3.5 + 8} y={140 - 100 / Math.exp(2.5) - 6} fontSize={10} fill="#f59e0b" fontFamily="sans-serif">(0, 1)</text>
    </svg>
  );
}

function MediumSVG() {
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) { const x = 20 + i * 3.5; const t = (i - 25) / 10; const y = (t * t - 1) * Math.exp(-Math.abs(t) * 0.3); pts.push(`${x},${85 - 50 * y}`); }
  return (
    <svg viewBox="0 0 260 170" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={20} x2={40} y2={150} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={25} y1={85} x2={245} y2={85} stroke="#94a3b8" strokeWidth={1.2} />
      <polyline points={pts.join(" ")} fill="none" stroke="#EA580C" strokeWidth={2.5} opacity={0.7} />
      {/* Extremum hint */}
      <circle cx={108} cy={135} r={4} fill="#34d399" />
      <text x={116} y={140} fontSize={10} fill="#34d399" fontFamily="sans-serif">min?</text>
      <text x={200} y={30} fontSize={10} fill="#EA580C" fontFamily="serif">f(x)·eˣ</text>
    </svg>
  );
}

function AdvancedSVG() {
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) { const x = 20 + i * 3.5; const t = (i - 30) / 10; pts.push(`${x},${80 - 55 * t * Math.exp(-t)}`); }
  return (
    <svg viewBox="0 0 260 170" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={20} x2={40} y2={155} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={25} y1={80} x2={245} y2={80} stroke="#94a3b8" strokeWidth={1.2} />
      <polyline points={pts.join(" ")} fill="none" stroke="#DC2626" strokeWidth={2.5} opacity={0.7} />
      {/* Asymptote */}
      <line x1={25} y1={80} x2={245} y2={80} stroke="#a78bfa" strokeWidth={1} strokeDasharray="5,3" opacity={0.5} />
      <text x={245} y={76} fontSize={9} fill="#a78bfa" fontFamily="sans-serif">y→0</text>
      {/* Max */}
      <circle cx={20 + 40 * 3.5} cy={80 - 55 / Math.E} r={4} fill="#f59e0b" />
      <text x={20 + 40 * 3.5 + 8} y={80 - 55 / Math.E - 6} fontSize={10} fill="#f59e0b" fontFamily="sans-serif">max</text>
      <text x={220} y={155} fontSize={10} fill="#DC2626" fontFamily="serif">xe⁻ˣ</text>
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
function LadderAdvanced({ steps }: { steps:PromptStep[] }) { const [masterPassed,setMasterPassed]=useState(false); const [unlockedCount,setUnlockedCount]=useState(1); const allPassed=masterPassed&&unlockedCount>steps.length; return (<div><MasterPromptGate onPass={()=>setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["eˣ","נגזרת","חקירה","מונוטוניות","קיצון","אסימפטוטה","סקיצה"]}/>{steps.map((s,i)=>(<div key={i} style={{ marginBottom:8 }}>{(!masterPassed||i>=unlockedCount)?(<div style={{ borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", background:"rgba(255,255,255,0.7)", padding:"14px 16px", opacity:0.5, pointerEvents:"none" as const, display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ color:"#6B7280", fontSize:13, fontWeight:600 }}>{s.phase} — {s.label}</span><span style={{ fontSize:16 }}>🔒</span></div>):(<div><div style={{ borderRadius:14, border:"1px solid rgba(22,163,74,0.3)", background:"rgba(255,255,255,0.9)", padding:"14px 16px", marginBottom:8 }}><div style={{ color:"#15803d", fontSize:13, fontWeight:700, marginBottom:6 }}>{s.phase} — {s.label}</div><div style={{ color:"#334155", fontSize:13, lineHeight:1.6 }}>{s.prompt}</div></div><button onClick={()=>setUnlockedCount(v=>Math.max(v,i+2))} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}{allPassed&&(<div style={{ borderRadius:16, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:"1.25rem 1.5rem", marginTop:16, textAlign:"center" }}><div style={{ fontSize:28, marginBottom:8 }}>🏆</div><div style={{ color:"#14532d", fontWeight:800, fontSize:16, marginBottom:4 }}>כל הכבוד!</div><div style={{ color:"#166534", fontSize:13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}</div>); }

/* ─── Exercise Data ────────────────────────────────────────────────────────── */

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "תכונות eˣ ונגזרתה",
    problem: "נתונה הפונקציה f(x) = eˣ.\n\nא. מהי הנגזרת f'(x)? הסבירו למה eˣ מיוחדת.\nב. מצאו את f(0), f(1) ו-f(−1). מהו חיתוך ציר Y?\nג. האם ל-f(x) = eˣ יש חיתוך עם ציר X? הסבירו.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ (eˣ)' = eˣ, לא x·eˣ⁻¹", text: "נגזרת eˣ = eˣ (הפונקציה היחידה שנגזרתה שווה לה!). תלמידים מיישמים את כלל החזקה (xⁿ → nxⁿ⁻¹) על eˣ — שגיאה! e הוא הבסיס, x המעריך." },
      { title: "⚠️ eˣ > 0 תמיד", text: "eˣ חיובית לכל x. אין שורשים, אין חיתוך ציר X. תלמידים מנסים לפתור eˣ = 0 ומקבלים 'אין פתרון' — זה נכון, אבל צריך לנמק למה." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יב', 5 יחידות, ומצרף/ת שאלה על תכונות eˣ ונגזרתה. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"נגזרת eˣ", coaching:"", prompt:"f(x) = eˣ. תנחה אותי — מהי f'(x) ולמה eˣ מיוחדת (הנגזרת = הפונקציה עצמה).", keywords:[], keywordHint:"", contextWords:["נגזרת","eˣ","מיוחדת","שווה","פונקציה","בסיס"] },
      { phase:"סעיף ב׳", label:"ערכים ונקודות", coaching:"", prompt:"תכווין אותי — מה f(0)=e⁰=1, f(1)=e≈2.718, f(−1)=1/e. מה חיתוך ציר Y.", keywords:[], keywordHint:"", contextWords:["e⁰","1","ערך","חיתוך","Y","הצבה"] },
      { phase:"סעיף ג׳", label:"חיתוך ציר X", coaching:"", prompt:"eˣ = 0 — האם יש פתרון? תדריך אותי להסביר למה eˣ > 0 לכל x.", keywords:[], keywordHint:"", contextWords:["חיובי","תמיד","אין","שורש","0","X"] },
    ],
  },
  {
    id: "medium",
    title: "חקירת f(x) = (x²−1)·eˣ",
    problem: "נתונה f(x) = (x² − 1)·eˣ.\n\nא. מצאו את f'(x) (כלל מכפלה).\nב. מצאו נקודות קיצון וקבעו את סוגן.\nג. מצאו תחומי עלייה וירידה.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ שכחת כלל המכפלה", text: "[u·v]' = u'v + uv'. כאן u = x²−1, v = eˣ. תלמידים גוזרים רק חלק אחד ושוכחים את השני." },
      { title: "⚠️ eˣ ≠ 0 → פותרים רק את החלק הפולינומי", text: "f'(x) = (2x+x²−1)·eˣ. כדי ש-f'=0: (x²+2x−1)·eˣ = 0. מכיוון ש-eˣ ≠ 0, פותרים x²+2x−1 = 0. תלמידים שוכחים לפשט." },
    ],
    goldenPrompt: `אני בכיתה יב', 5 יחידות, מצרף/ת חקירת פונקציה עם eˣ — נגזרת, קיצון, מונוטוניות.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על כלל המכפלה ופתרון f'=0.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"נגזרת — כלל מכפלה", coaching:"", prompt:"f(x) = (x²−1)·eˣ. תנחה אותי — u = x²−1, v = eˣ. מהו u'v + uv'.", keywords:[], keywordHint:"", contextWords:["מכפלה","כלל","u'v","uv'","נגזרת","eˣ"] },
      { phase:"סעיף ב׳", label:"נקודות קיצון", coaching:"", prompt:"f'(x) = (x²+2x−1)·eˣ = 0. eˣ≠0 אז x²+2x−1=0. תכווין אותי — איך פותרים ומסווגים קיצון.", keywords:[], keywordHint:"", contextWords:["f'=0","ריבועי","שורשים","קיצון","סיווג","נגזרת שנייה"] },
      { phase:"סעיף ג׳", label:"מונוטוניות", coaching:"", prompt:"מצאנו שורשי f'. תדריך אותי — איך קובעים סימן f' בכל תחום ומזהים עלייה/ירידה.", keywords:[], keywordHint:"", contextWords:["סימן","עלייה","ירידה","תחום","f'","טבלה"] },
    ],
  },
  {
    id: "advanced",
    title: "חקירה מלאה — f(x) = x·e⁻ˣ",
    problem: "נתונה f(x) = x·e⁻ˣ.\n\nא. מצאו את f'(x) ואת f''(x).\nב. מצאו נקודות קיצון ופיתוח. סווגו.\nג. מצאו אסימפטוטות (x→∞ ו-x→−∞).\nד. שרטטו סקיצה מלאה של f.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ הגבול x·e⁻ˣ → 0 כש-x→∞", text: "e⁻ˣ יורד מהר יותר מ-x עולה. לכן x·e⁻ˣ → 0 כש-x→∞. תלמידים חושבים שמכיוון ש-x→∞ גם f→∞ — שגיאה! האקספוננט מנצח." },
      { title: "⚠️ x→−∞: f→−∞", text: "כש-x→−∞: x שלילי ו-e⁻ˣ = eˣ → ∞. לכן x·e⁻ˣ → −∞. זה הכיוון ההפוך מ-x→+∞. תלמידים מתבלבלים בסימנים." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: מה שלבי חקירה מלאה של פונקציה עם eˣ (תחום, נגזרת, קיצון, קעירות, אסימפטוטות, סקיצה)? (לפחות 80 תווים)",
    steps: [
      { phase:"סעיף א׳", label:"f' ו-f''", coaching:"", prompt:"f(x) = x·e⁻ˣ. תנחה אותי — כלל מכפלה עם u=x, v=e⁻ˣ. ואז f'' מאותו כלל על f'.", keywords:[], keywordHint:"", contextWords:["נגזרת","מכפלה","e⁻ˣ","f'","f''","שרשרת"] },
      { phase:"סעיף ב׳", label:"קיצון ופיתוח", coaching:"", prompt:"f'(x) = (1−x)·e⁻ˣ = 0 → x=1. f''(x) = (x−2)·e⁻ˣ = 0 → x=2. תכווין אותי — מה סוג הקיצון ומה נקודת הפיתוח.", keywords:[], keywordHint:"", contextWords:["קיצון","פיתוח","סיווג","f''","x=1","x=2"] },
      { phase:"סעיף ג׳", label:"אסימפטוטות", coaching:"", prompt:"x→∞: x·e⁻ˣ → 0 (אסימפטוטה y=0). x→−∞: x·e⁻ˣ → −∞. תדריך אותי — למה eˣ מנצח את x.", keywords:[], keywordHint:"", contextWords:["אסימפטוטה","גבול","אינסוף","y=0","eˣ","מנצח"] },
      { phase:"סעיף ד׳", label:"סקיצה", coaching:"", prompt:"תנחה אותי לשרטט — חיתוך (0,0), מקסימום ב-(1,1/e), פיתוח ב-(2,2/e²), אסימפטוטה y=0.", keywords:[], keywordHint:"", contextWords:["סקיצה","שרטוט","חיתוך","מקסימום","פיתוח","אסימפטוטה"] },
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
        <div style={{ textAlign:"center", marginBottom:14 }}><div style={{ color:s.accentColor, fontSize:15, fontWeight:800, marginBottom:4 }}>📈 חקירת eˣ (5 יח׳)</div><div style={{ color:"#6B7280", fontSize:12, lineHeight:1.55 }}>{ex.id==="basic"&&"תכונות eˣ — נגזרת, ערכים, חיתוכים."}{ex.id==="medium"&&"חקירה עם כלל מכפלה — קיצון ומונוטוניות."}{ex.id==="advanced"&&"חקירה מלאה — xe⁻ˣ, אסימפטוטות וסקיצה."}</div></div>
        <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:14 }}/>
        <div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>🎯 נוסחאות</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:130 }}>(eˣ)' = eˣ</span><span>נגזרתה = היא עצמה</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:130 }}>(e^{g(x)})' = g'·e^g</span><span>כלל השרשרת</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:130 }}>eˣ &gt; 0 תמיד</span><span>אין שורשים</span></div></div></div>
        {ex.id!=="basic"&&(<><div style={{ height:1, background:"rgba(60,54,42,0.08)", marginBottom:12 }}/><div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>✨ {ex.id==="medium"?"כלל מכפלה":"חקירה מלאה"}</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}>{ex.id==="medium"&&<div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:150 }}>(u·v)' = u'v + uv'</span><span>כלל המכפלה</span></div>}{ex.id==="advanced"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:150 }}>lim x·e⁻ˣ = 0</span><span>x→∞ (eˣ מנצח)</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:150 }}>f''=0 → פיתוח</span><span>שינוי קעירות</span></div></>}</div></div></>)}
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

/* ─── ExpGraphLab (basic) ──────────────────────────────────────────────────── */

function ExpGraphLab() {
  const [a,setA]=useState(1); const [k,setK]=useState(1);
  const st=STATION.basic;
  const f=(x:number)=>a*Math.exp(k*x);
  const ox=130,oy=120,sc=20;
  const toSx=(x:number)=>ox+x*sc; const toSy=(y:number)=>oy-y*sc;
  const pts:string[]=[];
  for(let x=-4;x<=3;x+=0.15){const y=f(x);if(y>-1&&y<6) pts.push(`${toSx(x)},${toSy(y)}`);}
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת a·eᵏˣ</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו a ו-k — צפו כיצד הגרף משתנה.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 2rem" }}>
        {[{label:"a (מקדם)",val:a,set:setA,min:-2,max:3,step:0.5},{label:"k (בסיס)",val:k,set:setK,min:-2,max:2,step:0.25}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 260 180" className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={toSx(-4)} y1={oy} x2={toSx(4)} y2={oy} stroke="#94a3b8" strokeWidth={1}/><line x1={ox} y1={toSy(-1)} x2={ox} y2={toSy(6)} stroke="#94a3b8" strokeWidth={1}/>
          {pts.length>1&&<polyline points={pts.join(" ")} fill="none" stroke={st.accentColor} strokeWidth={2.5}/>}
          {/* y-intercept */}
          <circle cx={toSx(0)} cy={toSy(a)} r={4} fill="#f59e0b"/>
          <text x={toSx(0)+8} y={toSy(a)-6} fontSize={9} fill="#f59e0b" fontFamily="monospace">(0,{a})</text>
          {/* Asymptote y=0 if a>0 and k>0 */}
          <line x1={toSx(-4)} y1={oy} x2={toSx(4)} y2={oy} stroke="#a78bfa" strokeWidth={0.8} strokeDasharray="4,3" opacity={0.4}/>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
        {[{label:"f(0)",val:(a).toFixed(2)},{label:"f(1)",val:f(1).toFixed(2)},{label:"k>0",val:k>0?"עולה":"יורדת"},{label:"a",val:a>0?"חיובי":a<0?"שלילי":"0"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:10, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:10, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:15, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>k&gt;0 → גדילה. k&lt;0 → דעיכה. a שלילי → הגרף מתהפך מתחת לציר x.</p>
    </section>
  );
}

/* ─── DerivativeLab (medium) ───────────────────────────────────────────────── */

function DerivativeLab() {
  const [xVal,setXVal]=useState(0);
  const st=STATION.medium;
  const f=(x:number)=>(x*x-1)*Math.exp(x);
  const fp=(x:number)=>(x*x+2*x-1)*Math.exp(x);
  const yVal=f(xVal); const ypVal=fp(xVal);
  const ox=130,oy=100,sc=25;
  const toSx=(x:number)=>ox+x*sc; const toSy=(y:number)=>oy-y*sc;
  const pts:string[]=[];
  for(let x=-4;x<=1.5;x+=0.1){const y=f(x);if(y>-3&&y<4) pts.push(`${toSx(x)},${toSy(y)}`);}
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת (x²−1)·eˣ</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>הזיזו x — צפו בערך הפונקציה ובנגזרת.</p>
      <div style={{ maxWidth:400, margin:"0 auto 2rem" }}><div style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>x</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{xVal.toFixed(1)}</span></div><input type="range" min={-3.5} max={1.5} step={0.1} value={xVal} onChange={e=>setXVal(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div></div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 260 170" className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={toSx(-4)} y1={oy} x2={toSx(2)} y2={oy} stroke="#94a3b8" strokeWidth={1}/><line x1={ox} y1={toSy(-3)} x2={ox} y2={toSy(4)} stroke="#94a3b8" strokeWidth={1}/>
          {pts.length>1&&<polyline points={pts.join(" ")} fill="none" stroke={st.accentColor} strokeWidth={2.5}/>}
          {/* Current point */}
          {yVal>-3&&yVal<4&&<><circle cx={toSx(xVal)} cy={toSy(yVal)} r={5} fill="#f59e0b"/><line x1={toSx(xVal)} y1={toSy(-3)} x2={toSx(xVal)} y2={toSy(4)} stroke="#f59e0b" strokeWidth={0.8} strokeDasharray="3,3" opacity={0.4}/></>}
          {/* Tangent line hint */}
          {yVal>-3&&yVal<4&&<line x1={toSx(xVal-0.5)} y1={toSy(yVal-0.5*ypVal)} x2={toSx(xVal+0.5)} y2={toSy(yVal+0.5*ypVal)} stroke="#34d399" strokeWidth={1.5} opacity={0.6}/>}
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
        {[{label:"x",val:xVal.toFixed(1)},{label:"f(x)",val:yVal.toFixed(3)},{label:"f'(x)",val:ypVal.toFixed(3)},{label:"סימן f'",val:ypVal>0.01?"+ (עולה)":ypVal<-0.01?"− (יורדת)":"0 (קיצון)"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:10, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:10, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:14, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>הקו הירוק = המשיק. כשהוא אופקי — נקודת קיצון!</p>
    </section>
  );
}

/* ─── FullInvestigationLab (advanced) ──────────────────────────────────────── */

function FullInvestigationLab() {
  const [xVal,setXVal]=useState(1);
  const st=STATION.advanced;
  const f=(x:number)=>x*Math.exp(-x);
  const fp=(x:number)=>(1-x)*Math.exp(-x);
  const fpp=(x:number)=>(x-2)*Math.exp(-x);
  const yVal=f(xVal); const ypVal=fp(xVal); const yppVal=fpp(xVal);
  const ox=80,oy=110,scX=30,scY=60;
  const toSx=(x:number)=>ox+x*scX; const toSy=(y:number)=>oy-y*scY;
  const pts:string[]=[];
  for(let x=-2;x<=6;x+=0.1){const y=f(x);if(y>-1.5&&y<1) pts.push(`${toSx(x)},${toSy(y)}`);}
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת חקירה מלאה — xe⁻ˣ</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>הזיזו x — צפו ב-f, f', f'' ובנקודות מיוחדות.</p>
      <div style={{ maxWidth:400, margin:"0 auto 2rem" }}><div style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>x</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{xVal.toFixed(1)}</span></div><input type="range" min={-2} max={6} step={0.1} value={xVal} onChange={e=>setXVal(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div></div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 300 170" className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={toSx(-2)} y1={oy} x2={toSx(6.5)} y2={oy} stroke="#94a3b8" strokeWidth={1}/><line x1={ox} y1={toSy(-1.5)} x2={ox} y2={toSy(0.8)} stroke="#94a3b8" strokeWidth={1}/>
          {/* Asymptote y=0 */}
          <line x1={toSx(-2)} y1={oy} x2={toSx(6.5)} y2={oy} stroke="#a78bfa" strokeWidth={0.8} strokeDasharray="5,3" opacity={0.3}/>
          {pts.length>1&&<polyline points={pts.join(" ")} fill="none" stroke={st.accentColor} strokeWidth={2.5}/>}
          {/* Max at x=1 */}
          <circle cx={toSx(1)} cy={toSy(1/Math.E)} r={4} fill="#34d399"/><text x={toSx(1)+6} y={toSy(1/Math.E)-6} fontSize={8} fill="#34d399" fontFamily="monospace">max(1, 1/e)</text>
          {/* Inflection at x=2 */}
          <circle cx={toSx(2)} cy={toSy(2/Math.E/Math.E)} r={4} fill="#a78bfa"/><text x={toSx(2)+6} y={toSy(2/Math.E/Math.E)+14} fontSize={8} fill="#a78bfa" fontFamily="monospace">פיתוח(2)</text>
          {/* Current point */}
          {yVal>-1.5&&yVal<1&&<circle cx={toSx(xVal)} cy={toSy(yVal)} r={5} fill="#f59e0b"/>}
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
        {[{label:"f(x)",val:yVal.toFixed(4)},{label:"f'(x)",val:ypVal.toFixed(4)},{label:"f''(x)",val:yppVal.toFixed(4)},{label:"קעירות",val:yppVal>0.01?"קמורה (∪)":yppVal<-0.01?"קעורה (∩)":"פיתוח"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:10, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:10, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:14, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>ירוק = מקסימום (x=1). סגול = פיתוח (x=2). ב-x→∞ הגרף שואף ל-0!</p>
    </section>
  );
}

/* ─── Tabs + FormulaBar ────────────────────────────────────────────────────── */

const TABS=[{id:"basic",label:"מתחיל",textColor:"text-green-700",border:"border-green-600",bg:"bg-green-600/10",glowColor:"rgba(22,163,74,0.3)"},{id:"medium",label:"בינוני",textColor:"text-orange-700",border:"border-orange-600",bg:"bg-orange-600/10",glowColor:"rgba(234,88,12,0.3)"},{id:"advanced",label:"מתקדם",textColor:"text-red-700",border:"border-red-700",bg:"bg-red-700/10",glowColor:"rgba(220,38,38,0.3)"}];

function FormulaBar() {
  const [activeTab,setActiveTab]=useState<"deriv"|"rules"|"limits"|null>(null);
  const tabs=[{id:"deriv" as const,label:"📈 נגזרות eˣ",tex:"(e^x)' = e^x",color:"#16A34A",borderColor:"rgba(22,163,74,0.35)"},{id:"rules" as const,label:"📏 כללי גזירה",tex:"(uv)' = u'v+uv'",color:"#EA580C",borderColor:"rgba(234,88,12,0.35)"},{id:"limits" as const,label:"∞ גבולות",tex:"\\lim_{x\\to\\infty}xe^{-x}=0",color:"#DC2626",borderColor:"rgba(220,38,38,0.35)"}];
  return (
    <div style={{ borderRadius:12, border:"1px solid rgba(60,54,42,0.15)", background:"rgba(255,255,255,0.75)", padding:"1.25rem", marginBottom:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginBottom:12, textAlign:"center" }}>נוסחאות</div>
      <div style={{ display:"flex", gap:6, marginBottom:activeTab?14:0 }}>{tabs.map(t=>{const isA=activeTab===t.id;return(<button key={t.id} onClick={()=>setActiveTab(isA?null:t.id)} style={{ flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", border:`1.5px solid ${isA?t.borderColor:"rgba(60,54,42,0.1)"}`, background:isA?`${t.color}0D`:"rgba(60,54,42,0.03)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{ fontSize:11, fontWeight:700, color:isA?t.color:"#6B7280" }}>{t.label}</span><span style={{ color:isA?t.color:"#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>);})}</div>
      {activeTab==="deriv"&&(<motion.div key="d" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(22,163,74,0.25)", background:"rgba(220,252,231,0.4)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"(e^x)' = e^x \\qquad (e^{g(x)})' = g'(x) \\cdot e^{g(x)}"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>נגזרות של eˣ</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>(eˣ)' = eˣ — הנגזרת = הפונקציה עצמה!</li><li>(e²ˣ)' = 2e²ˣ — כלל שרשרת: g(x)=2x, g'=2.</li><li>(e⁻ˣ)' = −e⁻ˣ — כי g(x)=−x, g'=−1.</li></ol></div></div></div></motion.div>)}
      {activeTab==="rules"&&(<motion.div key="r" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(234,88,12,0.25)", background:"rgba(255,247,237,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"(u \\cdot v)' = u'v + uv'"}</DisplayMath><DisplayMath>{"\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(234,88,12,0.06)", border:"1px solid rgba(234,88,12,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>כללי גזירה עם eˣ</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>מכפלה:</strong> (x²·eˣ)' = 2x·eˣ + x²·eˣ = (x²+2x)eˣ.</li><li><strong>מנה:</strong> (x/eˣ)' = (eˣ−x·eˣ)/(eˣ)² = (1−x)/eˣ.</li><li>eˣ ≠ 0 → f'=0 רק מהחלק הפולינומי!</li></ol></div></div></div></motion.div>)}
      {activeTab==="limits"&&(<motion.div key="l" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(220,38,38,0.25)", background:"rgba(254,242,242,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"\\lim_{x \\to \\infty} x^n \\cdot e^{-x} = 0 \\quad (\\text{for any } n)"}</DisplayMath><DisplayMath>{"\\lim_{x \\to -\\infty} x \\cdot e^{-x} = -\\infty"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>eˣ תמיד מנצח פולינום</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>x→∞: eˣ גדל מהר מכל xⁿ → xⁿ·e⁻ˣ → 0.</li><li>x→−∞: e⁻ˣ = eˣ → ∞, ו-x → −∞ → הכל הולך ל-−∞.</li><li>אסימפטוטה אופקית: y = 0 כש-x→∞ (עבור xe⁻ˣ).</li></ol></div></div></div></motion.div>)}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function ExpInvestigationPage5U() {
  const [selectedLevel,setSelectedLevel]=useState<"basic"|"medium"|"advanced">("basic");
  const ex=exercises.find(e=>e.id===selectedLevel)!;
  const lvlRgb=selectedLevel==="basic"?"45,90,39":selectedLevel==="medium"?"163,79,38":"139,38,53";
  return (
    <main style={{ minHeight:"100vh", background:"#F3EFE0", backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:"#2D3436", ["--lvl-rgb" as string]:lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`textarea,input[type="text"],input[type="password"]{outline:none!important}textarea:focus,input[type="text"]:focus{outline:none!important;border-color:rgba(var(--lvl-rgb),0.65)!important;box-shadow:0 0 0 3px rgba(var(--lvl-rgb),0.12)!important}input[type="range"]{outline:none!important}input[type="range"]:focus{outline:none!important}button:focus,button:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(var(--lvl-rgb),0.35)!important}button:focus:not(:focus-visible){box-shadow:none!important}`}</style>
      <div style={{ borderBottom:"1px solid rgba(60,54,42,0.15)", background:"#F3EFE0" }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div><h1 style={{ fontSize:22, fontWeight:700, color:"#2D3436", margin:0 }}>חקירת eˣ עם AI — כיתה יב׳ (5 יח׳)</h1><p style={{ fontSize:13, color:"#6B7280", margin:"2px 0 0" }}>נגזרת, כלל מכפלה, חקירה מלאה, אסימפטוטות</p></div>
          <Link href="/5u/topic/grade12/exponential" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap" }} onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D";}} onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A";}}><span style={{ fontSize:16 }}>←</span>חזרה</Link>
        </div>
      </div>
      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="5u/grade12/exponential/exp-investigation"/>
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(60,54,42,0.15)" }}>{TABS.map(tab=>{const active=selectedLevel===tab.id;return(<button key={tab.id} onClick={()=>setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active?`${tab.bg} border ${tab.border} ${tab.textColor}`:"text-stone-500 hover:text-stone-800"}`} style={active?{boxShadow:`0 0 14px ${tab.glowColor}`}:undefined}>{tab.label}</button>);})}</div>
        <FormulaBar/>
        <motion.div key={selectedLevel} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22}}><ExerciseCard ex={ex}/></motion.div>
        {selectedLevel==="basic"&&<ExpGraphLab/>}
        {selectedLevel==="medium"&&<DerivativeLab/>}
        {selectedLevel==="advanced"&&<FullInvestigationLab/>}
        <div style={{ marginTop:"1.5rem" }}><MarkComplete subtopicId="5u/grade12/exponential/exp-investigation" level={selectedLevel}/></div>
      </div>
    </main>
  );
}
