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
  // Bar chart silhouette
  const bars = [40, 70, 55, 85, 60, 45, 75];
  return (
    <svg viewBox="0 0 260 140" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={120} x2={240} y2={120} stroke="#94a3b8" strokeWidth={1.2} />
      {bars.map((h, i) => (<rect key={i} x={50 + i * 26} y={120 - h} width={18} height={h} rx={3} fill="#16A34A" opacity={0.3 + i * 0.07} />))}
      {/* Mean line */}
      <line x1={40} y1={120 - 61} x2={240} y2={120 - 61} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
      <text x={242} y={120 - 57} fontSize={10} fill="#f59e0b" fontFamily="sans-serif">x̄?</text>
    </svg>
  );
}

function MediumSVG() {
  // Box plot silhouette
  return (
    <svg viewBox="0 0 260 100" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={70} x2={230} y2={70} stroke="#94a3b8" strokeWidth={1} />
      {/* Whiskers */}
      <line x1={60} y1={45} x2={60} y2={55} stroke="#EA580C" strokeWidth={2} />
      <line x1={60} y1={50} x2={90} y2={50} stroke="#EA580C" strokeWidth={1.5} />
      {/* Box */}
      <rect x={90} y={35} width={80} height={30} rx={4} fill="none" stroke="#EA580C" strokeWidth={2} opacity={0.7} />
      {/* Median line */}
      <line x1={130} y1={35} x2={130} y2={65} stroke="#f59e0b" strokeWidth={2.5} />
      {/* Right whisker */}
      <line x1={170} y1={50} x2={200} y2={50} stroke="#EA580C" strokeWidth={1.5} />
      <line x1={200} y1={45} x2={200} y2={55} stroke="#EA580C" strokeWidth={2} />
      {/* Labels */}
      <text x={60} y={80} fontSize={9} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">min</text>
      <text x={90} y={80} fontSize={9} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">Q₁</text>
      <text x={130} y={80} fontSize={9} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">חציון</text>
      <text x={170} y={80} fontSize={9} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">Q₃</text>
      <text x={200} y={80} fontSize={9} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">max</text>
    </svg>
  );
}

function AdvancedSVG() {
  // Two overlapping distributions
  const pts1: string[] = [], pts2: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const x = 30 + i * 2.5;
    const t1 = (i - 30) / 12; const t2 = (i - 50) / 8;
    pts1.push(`${x},${120 - 80 * Math.exp(-0.5 * t1 * t1)}`);
    pts2.push(`${x},${120 - 60 * Math.exp(-0.5 * t2 * t2)}`);
  }
  return (
    <svg viewBox="0 0 260 140" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={30} y1={120} x2={240} y2={120} stroke="#94a3b8" strokeWidth={1} />
      <polyline points={pts1.join(" ")} fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.6} />
      <polyline points={pts2.join(" ")} fill="none" stroke="#a78bfa" strokeWidth={2} opacity={0.6} />
      <text x={100} y={30} fontSize={10} fill="#DC2626" fontFamily="sans-serif">A: σ גדול</text>
      <text x={160} y={55} fontSize={10} fill="#a78bfa" fontFamily="sans-serif">B: σ קטן</text>
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

function LadderAdvanced({ steps }: { steps:PromptStep[] }) {
  const [masterPassed,setMasterPassed]=useState(false); const [unlockedCount,setUnlockedCount]=useState(1); const allPassed=masterPassed&&unlockedCount>steps.length;
  return (<div><MasterPromptGate onPass={()=>setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["ממוצע","סטיית תקן","חציון","שכיח","פיזור","רבעון","התפלגות"]}/>{steps.map((s,i)=>(<div key={i} style={{ marginBottom:8 }}>{(!masterPassed||i>=unlockedCount)?(<div style={{ borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", background:"rgba(255,255,255,0.7)", padding:"14px 16px", opacity:0.5, pointerEvents:"none" as const, display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ color:"#6B7280", fontSize:13, fontWeight:600 }}>{s.phase} — {s.label}</span><span style={{ fontSize:16 }}>🔒</span></div>):(<div><div style={{ borderRadius:14, border:"1px solid rgba(22,163,74,0.3)", background:"rgba(255,255,255,0.9)", padding:"14px 16px", marginBottom:8 }}><div style={{ color:"#15803d", fontSize:13, fontWeight:700, marginBottom:6 }}>{s.phase} — {s.label}</div><div style={{ color:"#334155", fontSize:13, lineHeight:1.6 }}>{s.prompt}</div></div><button onClick={()=>setUnlockedCount(v=>Math.max(v,i+2))} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}{allPassed&&(<div style={{ borderRadius:16, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:"1.25rem 1.5rem", marginTop:16, textAlign:"center" }}><div style={{ fontSize:28, marginBottom:8 }}>🏆</div><div style={{ color:"#14532d", fontWeight:800, fontSize:16, marginBottom:4 }}>כל הכבוד!</div><div style={{ color:"#166534", fontSize:13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}</div>);
}

/* ─── Exercise Data ────────────────────────────────────────────────────────── */

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "ממוצע, חציון ושכיח",
    problem: "ציוני 7 תלמידים במבחן: 65, 78, 82, 82, 90, 73, 82.\n\nא. חשבו את הממוצע.\nב. מצאו את החציון.\nג. מהו השכיח?",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ שכחה לסדר לפני מציאת חציון", text: "חציון = הערך האמצעי ברשימה מסודרת. תלמידים שוכחים לסדר מקטן לגדול ולוקחים את 'האמצעי' מהרשימה המקורית — שגוי!" },
      { title: "⚠️ בלבול בין ממוצע לחציון", text: "ממוצע = סכום / מספר ערכים (מושפע מערכים קיצוניים). חציון = הערך האמצעי (לא מושפע). בנתונים עם ערכים קיצוניים הם שונים מאוד." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יב', 3 יחידות, ומצרף/ת שאלה בסטטיסטיקה תיאורית — ממוצע, חציון ושכיח. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"חישוב ממוצע", coaching:"", prompt:"ציונים: 65, 78, 82, 82, 90, 73, 82. תנחה אותי — מהי הנוסחה לממוצע ואיך מחשבים.", keywords:[], keywordHint:"", contextWords:["ממוצע","סכום","חילוק","מספר","נתונים","חישוב"] },
      { phase:"סעיף ב׳", label:"מציאת חציון", coaching:"", prompt:"7 ציונים. תכווין אותי — למה חשוב לסדר קודם, ואיך מוצאים את הערך האמצעי כש-n אי-זוגי.", keywords:[], keywordHint:"", contextWords:["חציון","סידור","אמצעי","מקטן","גדול","ערך"] },
      { phase:"סעיף ג׳", label:"מציאת שכיח", coaching:"", prompt:"תדריך אותי — מהו השכיח (mode), ואיך מזהים אותו ברשימת הציונים.", keywords:[], keywordHint:"", contextWords:["שכיח","תדירות","חזרה","נפוץ","ערך","ספירה"] },
    ],
  },
  {
    id: "medium",
    title: "רבעונים ודיאגרמת קופסה",
    problem: "ציוני 12 תלמידים: 45, 52, 58, 62, 65, 70, 72, 78, 80, 85, 90, 95.\n\nא. מצאו את החציון, Q₁ ו-Q₃.\nב. חשבו את הטווח הבין-רבעוני (IQR).\nג. תארו כיצד תיראה דיאגרמת קופסה (box plot) עבור הנתונים.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ טעות במציאת רבעונים", text: "Q₁ = חציון החצי התחתון. Q₃ = חציון החצי העליון. כש-n זוגי, מחלקים ל-2 חצאים שווים. כש-n אי-זוגי — החציון לא נכלל באף חצי." },
      { title: "⚠️ שכחת IQR בדיאגרמת קופסה", text: "הקופסה נמתחת מ-Q₁ עד Q₃ (לא מ-min ל-max!). השפם מגיע מ-min ל-Q₁ ומ-Q₃ ל-max. הקו בתוך הקופסה = חציון. IQR = Q₃ − Q₁." },
    ],
    goldenPrompt: `אני בכיתה יב', 3 יחידות, מצרף/ת תרגיל על רבעונים ודיאגרמת קופסה.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על מציאת Q₁ ו-Q₃.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"חציון ורבעונים", coaching:"", prompt:"12 ציונים מסודרים. תנחה אותי — איך מוצאים חציון כש-n זוגי, ואיך מחלקים לחצי תחתון ועליון למציאת Q₁ ו-Q₃.", keywords:[], keywordHint:"", contextWords:["חציון","רבעון","Q1","Q3","חצי","אמצעי"] },
      { phase:"סעיף ב׳", label:"טווח בין-רבעוני", coaching:"", prompt:"מצאנו Q₁ ו-Q₃. תכווין אותי — מהו IQR ומה הוא מודד (פיזור של 50% האמצעיים).", keywords:[], keywordHint:"", contextWords:["IQR","טווח","רבעוני","חיסור","פיזור","אמצע"] },
      { phase:"סעיף ג׳", label:"דיאגרמת קופסה", coaching:"", prompt:"תדריך אותי — מהם חמשת הערכים בדיאגרמת קופסה (min, Q₁, חציון, Q₃, max), ואיך משרטטים.", keywords:[], keywordHint:"", contextWords:["קופסה","שפם","min","max","חציון","שרטוט"] },
    ],
  },
  {
    id: "advanced",
    title: "סטיית תקן והשוואת התפלגויות",
    problem: "כיתה א': ציונים 70, 75, 80, 85, 90.\nכיתה ב': ציונים 50, 65, 80, 95, 110.\n\nא. חשבו את הממוצע של כל כיתה.\nב. חשבו את סטיית התקן של כל כיתה.\nג. באיזו כיתה הפיזור גדול יותר? הסבירו מה אומרת סטיית תקן גדולה לעומת קטנה.\nד. אם תלמיד מכיתה א' קיבל 85 ותלמיד מכיתה ב' קיבל 95, מי השיג תוצאה יחסית יותר טובה?",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ שכחת ריבוע בחישוב שונות", text: "שונות = ממוצע הסטיות בריבוע. תלמידים שוכחים לרבע ומחשבים ממוצע סטיות רגיל — שלרוב שווה 0 (הסטיות מתקזזות)." },
      { title: "⚠️ בלבול בין שונות לסטיית תקן", text: "שונות = σ² (ביחידות בריבוע). סטיית תקן = σ = √שונות (באותן יחידות כמו הנתונים). בבגרות לרוב מבקשים סטיית תקן — אל תשכחו את השורש." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: מה סטיית תקן מודדת, ולמה חשוב להשוות ציונים יחסיים (ציון Z) כשההתפלגויות שונות? (לפחות 80 תווים)",
    steps: [
      { phase:"סעיף א׳", label:"ממוצע לכל כיתה", coaching:"", prompt:"כיתה א': 70,75,80,85,90. כיתה ב': 50,65,80,95,110. תנחה אותי לחשב ממוצע של כל כיתה.", keywords:[], keywordHint:"", contextWords:["ממוצע","סכום","חילוק","כיתה","חישוב","5"] },
      { phase:"סעיף ב׳", label:"סטיית תקן", coaching:"", prompt:"ממוצע שתי הכיתות ידוע. תכווין אותי — איך מחשבים שונות (סכום סטיות בריבוע / n) ואז סטיית תקן (שורש).", keywords:[], keywordHint:"", contextWords:["סטיית תקן","שונות","סטייה","ריבוע","שורש","ממוצע"] },
      { phase:"סעיף ג׳", label:"השוואת פיזור", coaching:"", prompt:"σ של כיתה א' ושל כיתה ב' ידועים. תדריך אותי — איזו כיתה יותר מפוזרת ומה זה אומר.", keywords:[], keywordHint:"", contextWords:["פיזור","סטיית תקן","גדול","קטן","אחיד","מרוכז"] },
      { phase:"סעיף ד׳", label:"השוואה יחסית (ציון Z)", coaching:"", prompt:"תלמיד א' קיבל 85, תלמיד ב' קיבל 95. ממוצעים וסטיות תקן שונים. תנחה אותי — איך משווים בעזרת ציון Z (כמה σ מהממוצע).", keywords:[], keywordHint:"", contextWords:["Z","ציון","יחסי","ממוצע","סטיית תקן","השוואה"] },
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
        <div style={{ textAlign:"center", marginBottom:14 }}><div style={{ color:s.accentColor, fontSize:15, fontWeight:800, marginBottom:4 }}>📊 סטטיסטיקה תיאורית</div><div style={{ color:"#6B7280", fontSize:12, lineHeight:1.55 }}>{ex.id==="basic"&&"ממוצע, חציון ושכיח — מדדי מרכז."}{ex.id==="medium"&&"רבעונים, IQR ודיאגרמת קופסה."}{ex.id==="advanced"&&"סטיית תקן, שונות והשוואת התפלגויות."}</div></div>
        <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:14 }}/>
        <div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>🎯 נוסחאות</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:90 }}>ממוצע x̄</span><span>= Σxᵢ / n</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:90 }}>חציון</span><span>הערך האמצעי ברשימה מסודרת</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:90 }}>שכיח</span><span>הערך שמופיע הכי הרבה</span></div></div></div>
        {ex.id!=="basic"&&(<><div style={{ height:1, background:"rgba(60,54,42,0.08)", marginBottom:12 }}/><div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>✨ {ex.id==="medium"?"מדדי פיזור":"סטיית תקן"}</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}>{ex.id==="medium"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:90 }}>IQR</span><span>= Q₃ − Q₁ (טווח בין-רבעוני)</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:90 }}>Box Plot</span><span>min, Q₁, חציון, Q₃, max</span></div></>}{ex.id==="advanced"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:90 }}>σ²</span><span>= Σ(xᵢ−x̄)² / n (שונות)</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:90 }}>σ</span><span>= √σ² (סטיית תקן)</span></div></>}</div></div></>)}
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

/* ─── MeanMedianModeLab (basic) ────────────────────────────────────────────── */

function MeanMedianModeLab() {
  const [vals,setVals]=useState([65,78,82,82,90,73,82]);
  const st=STATION.basic;
  const sorted=[...vals].sort((a,b)=>a-b);
  const mean=vals.reduce((s,v)=>s+v,0)/vals.length;
  const median=vals.length%2===1?sorted[Math.floor(vals.length/2)]:(sorted[vals.length/2-1]+sorted[vals.length/2])/2;
  const freq:Record<number,number>={};vals.forEach(v=>{freq[v]=(freq[v]||0)+1;});const mode=+Object.entries(freq).sort((a,b)=>b[1]-a[1])[0][0];
  const updateVal=(i:number,v:number)=>{setVals(p=>{const n=[...p];n[i]=v;return n;});};
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת מדדי מרכז</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו ציונים וצפו כיצד הממוצע, החציון והשכיח משתנים.</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:6, maxWidth:500, margin:"0 auto 2rem" }}>
        {vals.map((v,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:12, border:"1px solid rgba(255,255,255,0.4)", padding:"0.5rem", boxShadow:"0 2px 8px rgba(60,54,42,0.08)" }}><div style={{ textAlign:"center", fontSize:11, color:"#6B7280", marginBottom:2 }}>#{i+1}</div><input type="range" min={40} max={100} step={1} value={v} onChange={e=>updateVal(i,+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/><div style={{ textAlign:"center", color:st.accentColor, fontFamily:"monospace", fontWeight:700, fontSize:14 }}>{v}</div></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 260 120" className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={30} y1={100} x2={240} y2={100} stroke="#94a3b8" strokeWidth={1}/>
          {sorted.map((v,i)=>{const x=30+(v-40)/60*200;return(<g key={i}><rect x={x-6} y={100-(50+i*6)} width={12} height={50+i*6} rx={2} fill={st.accentColor} opacity={0.25+i*0.08}/><text x={x} y={114} fontSize={8} fill="#64748b" textAnchor="middle" fontFamily="monospace">{v}</text></g>);})}
          <line x1={30+(mean-40)/60*200} y1={15} x2={30+(mean-40)/60*200} y2={100} stroke="#f59e0b" strokeWidth={2} strokeDasharray="4,3"/>
          <text x={30+(mean-40)/60*200} y={12} fontSize={9} fill="#f59e0b" textAnchor="middle" fontFamily="monospace">x̄={mean.toFixed(1)}</text>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"ממוצע",val:mean.toFixed(1)},{label:"חציון",val:String(median)},{label:"שכיח",val:String(mode)}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:20, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>הזיזו ציון אחד לקיצוני (40 או 100) — מה קורה לממוצע לעומת החציון?</p>
    </section>
  );
}

/* ─── BoxPlotLab (medium) ──────────────────────────────────────────────────── */

function BoxPlotLab() {
  const [data]=useState([45,52,58,62,65,70,72,78,80,85,90,95]);
  const [outlier,setOutlier]=useState(95);
  const st=STATION.medium;
  const d=[...data.slice(0,-1),outlier].sort((a,b)=>a-b);
  const n=d.length;
  const med=(d[n/2-1]+d[n/2])/2;
  const lower=d.slice(0,n/2);const upper=d.slice(n/2);
  const q1=(lower[lower.length/2-1]+lower[lower.length/2])/2;
  const q3=(upper[upper.length/2-1]+upper[upper.length/2])/2;
  const iqr=q3-q1;const mn=d[0];const mx=d[n-1];
  const sc=(v:number)=>30+(v-40)/80*200;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת דיאגרמת קופסה</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו את הערך המקסימלי וצפו כיצד הקופסה משתנה.</p>
      <div style={{ maxWidth:400, margin:"0 auto 2rem" }}><div style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>ערך מקסימלי</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{outlier}</span></div><input type="range" min={80} max={120} step={1} value={outlier} onChange={e=>setOutlier(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div></div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 260 80" className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={30} y1={55} x2={240} y2={55} stroke="#e5e7eb" strokeWidth={0.5}/>
          {/* Whisker left */}
          <line x1={sc(mn)} y1={30} x2={sc(mn)} y2={40} stroke={st.accentColor} strokeWidth={2}/><line x1={sc(mn)} y1={35} x2={sc(q1)} y2={35} stroke={st.accentColor} strokeWidth={1.5}/>
          {/* Box */}
          <rect x={sc(q1)} y={22} width={sc(q3)-sc(q1)} height={26} rx={4} fill={`${st.accentColor}10`} stroke={st.accentColor} strokeWidth={2}/>
          {/* Median */}
          <line x1={sc(med)} y1={22} x2={sc(med)} y2={48} stroke="#f59e0b" strokeWidth={2.5}/>
          {/* Whisker right */}
          <line x1={sc(q3)} y1={35} x2={sc(mx)} y2={35} stroke={st.accentColor} strokeWidth={1.5}/><line x1={sc(mx)} y1={30} x2={sc(mx)} y2={40} stroke={st.accentColor} strokeWidth={2}/>
          {/* Labels */}
          <text x={sc(mn)} y={65} fontSize={8} fill="#64748b" textAnchor="middle" fontFamily="monospace">{mn}</text>
          <text x={sc(q1)} y={65} fontSize={8} fill="#64748b" textAnchor="middle" fontFamily="monospace">Q₁={q1}</text>
          <text x={sc(med)} y={65} fontSize={8} fill="#f59e0b" textAnchor="middle" fontFamily="monospace">{med}</text>
          <text x={sc(q3)} y={65} fontSize={8} fill="#64748b" textAnchor="middle" fontFamily="monospace">Q₃={q3}</text>
          <text x={sc(mx)} y={65} fontSize={8} fill="#64748b" textAnchor="middle" fontFamily="monospace">{mx}</text>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"Q₁",val:String(q1)},{label:"חציון",val:String(med)},{label:"Q₃",val:String(q3)},{label:"IQR",val:iqr.toFixed(1)}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:18, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>הגדילו את ה-max — השפם מתארך אבל הקופסה כמעט לא משתנה!</p>
    </section>
  );
}

/* ─── StdDevLab (advanced) ─────────────────────────────────────────────────── */

function StdDevLab() {
  const [spread,setSpread]=useState(10);
  const st=STATION.advanced;
  const base=[70,75,80,85,90];
  const data=base.map(v=>80+(v-80)*(spread/10));
  const mean=data.reduce((s,v)=>s+v,0)/data.length;
  const variance=data.reduce((s,v)=>s+(v-mean)**2,0)/data.length;
  const sigma=Math.sqrt(variance);
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת סטיית תקן</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו את רמת הפיזור — צפו כיצד σ משתנה (ממוצע קבוע = 80).</p>
      <div style={{ maxWidth:400, margin:"0 auto 2rem" }}><div style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>פיזור</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{spread}</span></div><input type="range" min={0} max={30} step={1} value={spread} onChange={e=>setSpread(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div></div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 260 100" className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={30} y1={70} x2={240} y2={70} stroke="#94a3b8" strokeWidth={1}/>
          {/* Mean line */}
          <line x1={135} y1={15} x2={135} y2={70} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3,2"/>
          {/* Data points */}
          {data.map((v,i)=>{const x=30+(v-40)/60*200;return(<g key={i}><circle cx={x} cy={70} r={6} fill={st.accentColor} opacity={0.6}/><text x={x} y={88} fontSize={9} fill="#2D3436" textAnchor="middle" fontFamily="monospace">{v.toFixed(0)}</text><line x1={135} y1={55} x2={x} y2={55} stroke="#DC2626" strokeWidth={0.8} strokeDasharray="2,2" opacity={0.4}/></g>);})}
          <text x={135} y={12} fontSize={9} fill="#f59e0b" textAnchor="middle" fontFamily="monospace">x̄=80</text>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"ממוצע",val:"80"},{label:"σ²",val:variance.toFixed(1)},{label:"σ",val:sigma.toFixed(2)}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:20, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>פיזור 0 = כולם שווים, σ=0. ככל שהנתונים מתפזרים — σ גדל.</p>
    </section>
  );
}

/* ─── Tabs + FormulaBar ────────────────────────────────────────────────────── */

const TABS=[{id:"basic",label:"מתחיל",textColor:"text-green-700",border:"border-green-600",bg:"bg-green-600/10",glowColor:"rgba(22,163,74,0.3)"},{id:"medium",label:"בינוני",textColor:"text-orange-700",border:"border-orange-600",bg:"bg-orange-600/10",glowColor:"rgba(234,88,12,0.3)"},{id:"advanced",label:"מתקדם",textColor:"text-red-700",border:"border-red-700",bg:"bg-red-700/10",glowColor:"rgba(220,38,38,0.3)"}];

function FormulaBar() {
  const [activeTab,setActiveTab]=useState<"center"|"spread"|"compare"|null>(null);
  const tabs=[{id:"center" as const,label:"📊 מדדי מרכז",tex:"\\bar{x}, \\tilde{x}",color:"#16A34A",borderColor:"rgba(22,163,74,0.35)"},{id:"spread" as const,label:"📏 מדדי פיזור",tex:"\\sigma, IQR",color:"#EA580C",borderColor:"rgba(234,88,12,0.35)"},{id:"compare" as const,label:"🔄 השוואה",tex:"Z = \\frac{x-\\bar{x}}{\\sigma}",color:"#DC2626",borderColor:"rgba(220,38,38,0.35)"}];
  return (
    <div style={{ borderRadius:12, border:"1px solid rgba(60,54,42,0.15)", background:"rgba(255,255,255,0.75)", padding:"1.25rem", marginBottom:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginBottom:12, textAlign:"center" }}>נוסחאות</div>
      <div style={{ display:"flex", gap:6, marginBottom:activeTab?14:0 }}>{tabs.map(t=>{const isA=activeTab===t.id;return(<button key={t.id} onClick={()=>setActiveTab(isA?null:t.id)} style={{ flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", border:`1.5px solid ${isA?t.borderColor:"rgba(60,54,42,0.1)"}`, background:isA?`${t.color}0D`:"rgba(60,54,42,0.03)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{ fontSize:11, fontWeight:700, color:isA?t.color:"#6B7280" }}>{t.label}</span><span style={{ color:isA?t.color:"#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>);})}</div>
      {activeTab==="center"&&(<motion.div key="c" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(22,163,74,0.25)", background:"rgba(220,252,231,0.4)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"\\bar{x} = \\frac{\\sum x_i}{n}"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>מדדי מרכז</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>ממוצע:</strong> סכום / מספר ערכים. מושפע מקיצוניים.</li><li><strong>חציון:</strong> אמצעי ברשימה מסודרת. עמיד לקיצוניים.</li><li><strong>שכיח:</strong> הערך הנפוץ ביותר. יכול לא להיות יחיד.</li></ol></div></div></div></motion.div>)}
      {activeTab==="spread"&&(<motion.div key="s" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(234,88,12,0.25)", background:"rgba(255,247,237,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"\\sigma = \\sqrt{\\frac{\\sum(x_i - \\bar{x})^2}{n}}"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(234,88,12,0.06)", border:"1px solid rgba(234,88,12,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>מדדי פיזור</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>טווח:</strong> max − min (פשוט אבל רגיש לקיצוניים).</li><li><strong>IQR:</strong> Q₃ − Q₁ (50% האמצעיים).</li><li><strong>σ:</strong> סטיית תקן — ממוצע המרחקים מהממוצע.</li></ol></div><div style={{ marginTop:10, color:"#B45309", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 σ קטן = נתונים מרוכזים. σ גדול = נתונים מפוזרים.</div></div></div></motion.div>)}
      {activeTab==="compare"&&(<motion.div key="co" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(220,38,38,0.25)", background:"rgba(254,242,242,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"Z = \\frac{x - \\bar{x}}{\\sigma}"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>ציון תקן להשוואה</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>Z אומר: כמה סטיות תקן מעל/מתחת לממוצע.</li><li>מאפשר השוואה בין קבוצות עם ממוצע וσ שונים.</li><li>Z גבוה יותר = ביצוע יחסי טוב יותר.</li></ol></div><div style={{ marginTop:10, color:"#DC2626", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: 85 בכיתה עם x̄=80, σ=5 → Z=1. 95 בכיתה עם x̄=80, σ=20 → Z=0.75. 85 טוב יותר יחסית!</div></div></div></motion.div>)}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function DescriptiveStatsPage() {
  const [selectedLevel,setSelectedLevel]=useState<"basic"|"medium"|"advanced">("basic");
  const ex=exercises.find(e=>e.id===selectedLevel)!;
  const lvlRgb=selectedLevel==="basic"?"45,90,39":selectedLevel==="medium"?"163,79,38":"139,38,53";
  return (
    <main style={{ minHeight:"100vh", background:"#F3EFE0", backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:"#2D3436", ["--lvl-rgb" as string]:lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`textarea,input[type="text"],input[type="password"]{outline:none!important}textarea:focus,input[type="text"]:focus{outline:none!important;border-color:rgba(var(--lvl-rgb),0.65)!important;box-shadow:0 0 0 3px rgba(var(--lvl-rgb),0.12)!important}input[type="range"]{outline:none!important}input[type="range"]:focus{outline:none!important}button:focus,button:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(var(--lvl-rgb),0.35)!important}button:focus:not(:focus-visible){box-shadow:none!important}`}</style>
      <div style={{ borderBottom:"1px solid rgba(60,54,42,0.15)", background:"#F3EFE0" }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div><h1 style={{ fontSize:22, fontWeight:700, color:"#2D3436", margin:0 }}>סטטיסטיקה תיאורית עם AI — כיתה יב׳ (3 יח׳)</h1><p style={{ fontSize:13, color:"#6B7280", margin:"2px 0 0" }}>ממוצע, חציון, שכיח, סטיית תקן — ואיך לשאול AI</p></div>
          <Link href="/3u/topic/grade12/statistics" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap" }} onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D";}} onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A";}}><span style={{ fontSize:16 }}>←</span>חזרה</Link>
        </div>
      </div>
      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="3u/grade12/statistics/descriptive"/>
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(60,54,42,0.15)" }}>{TABS.map(tab=>{const active=selectedLevel===tab.id;return(<button key={tab.id} onClick={()=>setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active?`${tab.bg} border ${tab.border} ${tab.textColor}`:"text-stone-500 hover:text-stone-800"}`} style={active?{boxShadow:`0 0 14px ${tab.glowColor}`}:undefined}>{tab.label}</button>);})}</div>
        <FormulaBar/>
        <motion.div key={selectedLevel} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22}}><ExerciseCard ex={ex}/></motion.div>
        {selectedLevel==="basic"&&<MeanMedianModeLab/>}
        {selectedLevel==="medium"&&<BoxPlotLab/>}
        {selectedLevel==="advanced"&&<StdDevLab/>}
        <div style={{ marginTop:"1.5rem" }}><MarkComplete subtopicId="3u/grade12/statistics/descriptive" level={selectedLevel}/></div>
      </div>
    </main>
  );
}
