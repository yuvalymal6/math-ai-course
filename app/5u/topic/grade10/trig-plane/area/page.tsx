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
    <svg viewBox="0 0 260 170" className="w-full max-w-sm mx-auto" aria-hidden>
      <polygon points="40,140 200,140 130,40" fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.7} />
      <text x={30} y={150} fontSize={13} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={204} y={150} fontSize={13} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={126} y={34} fontSize={13} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">C</text>
      {/* Angle arc at C */}
      <path d="M118,55 A15,15 0 0,1 140,55" fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      <text x={130} y={68} fontSize={10} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">C</text>
      {/* Side labels */}
      <text x={78} y={85} fontSize={11} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">a</text>
      <text x={170} y={85} fontSize={11} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">b</text>
      {/* Area ? */}
      <text x={120} y={120} fontSize={14} fill="#34d399" textAnchor="middle" fontFamily="sans-serif">S = ?</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 260 170" className="w-full max-w-sm mx-auto" aria-hidden>
      <polygon points="30,150 230,150 170,30" fill="none" stroke="#EA580C" strokeWidth={2} opacity={0.7} />
      <text x={18} y={158} fontSize={13} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={234} y={158} fontSize={13} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={174} y={24} fontSize={13} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">C</text>
      {/* All three sides labeled */}
      <text x={130} y={164} fontSize={11} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">c</text>
      <text x={206} y={86} fontSize={11} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">a</text>
      <text x={92} y={86} fontSize={11} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">b</text>
      {/* Heron hint */}
      <text x={130} y={120} fontSize={12} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">s = (a+b+c)/2</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 270 180" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Quadrilateral split into two triangles */}
      <polygon points="40,150 130,30 240,120 160,160" fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.6} />
      {/* Diagonal */}
      <line x1={40} y1={150} x2={240} y2={120} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,3" />
      <text x={28} y={158} fontSize={12} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={126} y={24} fontSize={12} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={244} y={124} fontSize={12} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">C</text>
      <text x={160} y={174} fontSize={12} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">D</text>
      <text x={130} y={100} fontSize={11} fill="#34d399" textAnchor="middle" fontFamily="sans-serif">S₁+S₂ = ?</text>
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
function LadderAdvanced({ steps }: { steps:PromptStep[] }) { const [masterPassed,setMasterPassed]=useState(false); const [unlockedCount,setUnlockedCount]=useState(1); const allPassed=masterPassed&&unlockedCount>steps.length; return (<div><MasterPromptGate onPass={()=>setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["שטח","משולש","sinC","הרון","מרובע","אלכסון","נוסחה"]}/>{steps.map((s,i)=>(<div key={i} style={{ marginBottom:8 }}>{(!masterPassed||i>=unlockedCount)?(<div style={{ borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", background:"rgba(255,255,255,0.7)", padding:"14px 16px", opacity:0.5, pointerEvents:"none" as const, display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ color:"#6B7280", fontSize:13, fontWeight:600 }}>{s.phase} — {s.label}</span><span style={{ fontSize:16 }}>🔒</span></div>):(<div><div style={{ borderRadius:14, border:"1px solid rgba(22,163,74,0.3)", background:"rgba(255,255,255,0.9)", padding:"14px 16px", marginBottom:8 }}><div style={{ color:"#15803d", fontSize:13, fontWeight:700, marginBottom:6 }}>{s.phase} — {s.label}</div><div style={{ color:"#334155", fontSize:13, lineHeight:1.6 }}>{s.prompt}</div></div><button onClick={()=>setUnlockedCount(v=>Math.max(v,i+2))} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}{allPassed&&(<div style={{ borderRadius:16, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:"1.25rem 1.5rem", marginTop:16, textAlign:"center" }}><div style={{ fontSize:28, marginBottom:8 }}>🏆</div><div style={{ color:"#14532d", fontWeight:800, fontSize:16, marginBottom:4 }}>כל הכבוד!</div><div style={{ color:"#166534", fontSize:13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}</div>); }

/* ─── Exercise Data ────────────────────────────────────────────────────────── */

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "שטח משולש — S = ½ab·sinC",
    problem: "במשולש ABC ידועים שתי צלעות והזווית שביניהן.\n\nא. כתבו את הנוסחה S = ½·a·b·sin C והסבירו מהו כל רכיב.\nב. אם a ו-b ידועים וזווית C ידועה, חשבו את השטח.\nג. הסבירו: מתי השטח מקסימלי (באיזו זווית C)?",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ הזווית חייבת להיות בין שתי הצלעות", text: "S = ½·a·b·sin C עובד רק כש-C היא הזווית שבין a ל-b. אם יש לכם צלע ונגדית (לא כלואה), הנוסחה לא ישירה — צריך למצוא את הזווית הנכונה." },
      { title: "⚠️ שכחת ½ בנוסחה", text: "הנוסחה היא חצי מכפלת הצלעות כפול sin. תלמידים שוכחים את ה-½ ומקבלים שטח כפול מהנכון." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י', 5 יחידות, ומצרף/ת שאלה על שטח משולש בנוסחת S=½ab·sinC. אני רוצה שתהיה המורה הפרטי שלי — תסביר לי את הלוגיקה ולא תיתן תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"הנוסחה ומשמעותה", coaching:"", prompt:"S = ½·a·b·sin C. תנחה אותי — מהם a, b ו-C בנוסחה, ולמה sin C קובע את הגובה.", keywords:[], keywordHint:"", contextWords:["שטח","נוסחה","sin","צלע","זווית","חצי"] },
      { phase:"סעיף ב׳", label:"חישוב שטח", coaching:"", prompt:"a, b וזווית C ידועים. תכווין אותי — איך מציבים ומחשבים את S.", keywords:[], keywordHint:"", contextWords:["הצבה","חישוב","sin","כפל","שטח","תוצאה"] },
      { phase:"סעיף ג׳", label:"שטח מקסימלי", coaching:"", prompt:"תדריך אותי — מתי sin C הכי גדול (sin 90° = 1), ולמה השטח מקסימלי כש-C = 90°.", keywords:[], keywordHint:"", contextWords:["מקסימום","sin","90","1","ישר","גובה"] },
    ],
  },
  {
    id: "medium",
    title: "נוסחת הרון — שטח מצלעות",
    problem: "במשולש ABC ידועים שלוש הצלעות: a, b ו-c.\n\nא. חשבו את חצי-ההיקף s = (a+b+c)/2.\nב. חשבו את השטח לפי נוסחת הרון: S = √[s(s−a)(s−b)(s−c)].\nג. ודאו שהתשובה זהה לתוצאה מ-½·a·b·sin C (מצאו C קודם).",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ s הוא חצי-היקף, לא ההיקף", text: "s = (a+b+c)/2. תלמידים שוכחים לחלק ב-2 ומציבים את ההיקף המלא — מקבלים שטח שגוי (בדרך כלל שורש של מספר שלילי)." },
      { title: "⚠️ סדר החיסורים לא משנה, אבל צריך את כולם", text: "s−a, s−b, s−c חייבים להיות כולם חיוביים (אחרת המשולש לא קיים). אם אחד שלילי — בדקו אם הצלעות באמת יכולות ליצור משולש (כלל אי-השוויון)." },
    ],
    goldenPrompt: `אני בכיתה י', 5 יחידות, מצרף/ת תרגיל על נוסחת הרון — חישוב שטח משולש מצלעות בלבד.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על מציאת s ושימוש בנוסחה.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"חצי-היקף s", coaching:"", prompt:"a, b, c ידועים. תנחה אותי — מהו s ואיך מחשבים חצי-היקף.", keywords:[], keywordHint:"", contextWords:["חצי","היקף","s","חיבור","חילוק","סכום"] },
      { phase:"סעיף ב׳", label:"נוסחת הרון", coaching:"", prompt:"מצאנו s. תכווין אותי — איך מציבים בנוסחה S = √[s(s−a)(s−b)(s−c)] ומחשבים.", keywords:[], keywordHint:"", contextWords:["הרון","נוסחה","שורש","מכפלה","s−a","חישוב"] },
      { phase:"סעיף ג׳", label:"אימות עם sinC", coaching:"", prompt:"תדריך אותי — איך מוצאים זווית C ממשפט הקוסינוסים, ובודקים ש-½ab·sinC נותן אותו שטח.", keywords:[], keywordHint:"", contextWords:["אימות","קוסינוסים","זווית","sinC","שטח","השוואה"] },
    ],
  },
  {
    id: "advanced",
    title: "שטח מרובע — פירוק למשולשים",
    problem: "נתון מרובע ABCD. ידועים אורכי האלכסון AC והזוויות שהוא יוצר עם הצלעות.\n\nא. פרקו את המרובע לשני משולשים לאורך האלכסון AC.\nב. חשבו את שטח כל משולש בעזרת S = ½·d·b·sin θ.\nג. מצאו את השטח הכולל של המרובע.\nד. הראו: למרובע עם אלכסונים d₁, d₂ וזווית θ ביניהם: S = ½·d₁·d₂·sin θ.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ פירוק לא נכון — אלכסון חייב להיות בפנים", text: "המרובע חייב להיות קמור כדי שכל אלכסון יחלק אותו ל-2 משולשים. במרובע קעור, אלכסון אחד יוצא מחוץ לצורה ואז הפירוק לא עובד." },
      { title: "⚠️ שכחת שהזוויות שונות בשני המשולשים", text: "כשמפרקים מרובע באלכסון, הזווית שהאלכסון יוצר עם הצלעות שונה בכל משולש. צריך לחשב כל שטח בנפרד עם הזווית הנכונה — אל תניחו שהן שוות." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: איך מחשבים שטח מרובע על ידי פירוק למשולשים, ומהי נוסחת האלכסונים? (לפחות 80 תווים)",
    steps: [
      { phase:"סעיף א׳", label:"פירוק למשולשים", coaching:"", prompt:"מרובע ABCD עם אלכסון AC. תנחה אותי — אילו שני משולשים נוצרים ומה ידוע בכל אחד.", keywords:[], keywordHint:"", contextWords:["פירוק","אלכסון","משולש","שניים","מרובע","חלוקה"] },
      { phase:"סעיף ב׳", label:"שטח כל משולש", coaching:"", prompt:"תכווין אותי — בכל משולש ידוע האלכסון, צלע וזווית. איך מחשבים S = ½·AC·צלע·sin θ.", keywords:[], keywordHint:"", contextWords:["שטח","sin","אלכסון","זווית","חצי","חישוב"] },
      { phase:"סעיף ג׳", label:"שטח כולל", coaching:"", prompt:"תדריך אותי — שטח המרובע = סכום שטחי שני המשולשים. איך מחברים.", keywords:[], keywordHint:"", contextWords:["סכום","שטח","כולל","חיבור","משולשים","מרובע"] },
      { phase:"סעיף ד׳", label:"נוסחת אלכסונים", coaching:"", prompt:"מרובע עם אלכסונים d₁, d₂ שנחתכים בזווית θ. תנחה אותי להוכיח S = ½·d₁·d₂·sin θ.", keywords:[], keywordHint:"", contextWords:["אלכסון","d₁","d₂","sin","נוסחה","הוכחה"] },
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
        <div style={{ textAlign:"center", marginBottom:14 }}><div style={{ color:s.accentColor, fontSize:15, fontWeight:800, marginBottom:4 }}>📐 שטח משולש (5 יח׳)</div><div style={{ color:"#6B7280", fontSize:12, lineHeight:1.55 }}>{ex.id==="basic"&&"S = ½ab·sinC — שתי צלעות וזווית כלואה."}{ex.id==="medium"&&"נוסחת הרון — שטח מ-3 צלעות בלבד."}{ex.id==="advanced"&&"שטח מרובע — פירוק למשולשים ונוסחת אלכסונים."}</div></div>
        <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:14 }}/>
        <div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>🎯 נוסחאות שטח</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:150 }}>S = ½·a·b·sin C</span><span>שתי צלעות + זווית כלואה</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:150 }}>S = ½·בסיס·גובה</span><span>בסיס + גובה אנכי</span></div></div></div>
        {ex.id!=="basic"&&(<><div style={{ height:1, background:"rgba(60,54,42,0.08)", marginBottom:12 }}/><div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>✨ {ex.id==="medium"?"הרון":"מרובע"}</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}>{ex.id==="medium"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:160 }}>s = (a+b+c)/2</span><span>חצי-היקף</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:160 }}>S = √[s(s−a)(s−b)(s−c)]</span><span>הרון</span></div></>}{ex.id==="advanced"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:160 }}>S = S₁ + S₂</span><span>פירוק באלכסון</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:160 }}>S = ½·d₁·d₂·sin θ</span><span>אלכסונים + זווית</span></div></>}</div></div></>)}
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

/* ─── SinAreaLab (basic) ───────────────────────────────────────────────────── */

function SinAreaLab() {
  const [a,setA]=useState(8); const [b,setB]=useState(6); const [angleDeg,setAngleDeg]=useState(60);
  const st=STATION.basic;
  const rad=(angleDeg*Math.PI)/180;
  const area=0.5*a*b*Math.sin(rad);
  const h=b*Math.sin(rad);
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת S = ½ab·sinC</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו צלעות וזווית — צפו כיצד השטח משתנה.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, maxWidth:500, margin:"0 auto 2rem" }}>
        {[{label:"a",val:a,set:setA,min:2,max:12,step:0.5},{label:"b",val:b,set:setB,min:2,max:12,step:0.5},{label:"C (מעלות)",val:angleDeg,set:setAngleDeg,min:10,max:170,step:5}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:12, border:"1px solid rgba(255,255,255,0.4)", padding:"0.75rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 260 180" className="w-full max-w-md mx-auto" aria-hidden>
          {(() => {
            const sc = 12;
            const ox = 40, oy = 150;
            const bx = ox + a * sc, by = oy;
            const cx2 = ox + b * sc * Math.cos(rad), cy2 = oy - b * sc * Math.sin(rad);
            return (<>
              <polygon points={`${ox},${oy} ${bx},${by} ${cx2},${cy2}`} fill={`${st.accentColor}08`} stroke={st.accentColor} strokeWidth={2} />
              <line x1={cx2} y1={cy2} x2={cx2} y2={oy} stroke="#64748b" strokeWidth={1} strokeDasharray="3,2" />
              <text x={(ox + bx) / 2} y={oy + 16} fontSize={11} fill={st.accentColor} textAnchor="middle" fontFamily="monospace">a={a}</text>
              <text x={(ox + cx2) / 2 - 8} y={(oy + cy2) / 2 - 5} fontSize={11} fill="#a78bfa" fontFamily="monospace">b={b}</text>
              <text x={cx2 + 8} y={(cy2 + oy) / 2} fontSize={10} fill="#64748b" fontFamily="monospace">h={h.toFixed(1)}</text>
              <path d={`M${ox + 16},${oy} A16,16 0 0,0 ${ox + 16 * Math.cos(rad)},${oy - 16 * Math.sin(rad)}`} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
              <text x={ox + 24} y={oy - 8} fontSize={10} fill="#f59e0b" fontFamily="monospace">{angleDeg}°</text>
            </>);
          })()}
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
        {[{label:"sin C",val:Math.sin(rad).toFixed(3)},{label:"h = b·sinC",val:h.toFixed(2)},{label:"S = ½ab·sinC",val:area.toFixed(2)},{label:"C=90°→S",val:(0.5*a*b).toFixed(1)}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:10, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:10, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:15, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>הזיזו C ל-90° — sin C = 1 ← שטח מקסימלי! ל-180° — sin C = 0 ← שטח 0 (מנוון).</p>
    </section>
  );
}

/* ─── HeronLab (medium) ────────────────────────────────────────────────────── */

function HeronLab() {
  const [a,setA]=useState(7); const [b,setB]=useState(8); const [c,setC]=useState(9);
  const st=STATION.medium;
  const s2=(a+b+c)/2;
  const prod=s2*(s2-a)*(s2-b)*(s2-c);
  const valid=prod>0 && a+b>c && a+c>b && b+c>a;
  const area=valid?Math.sqrt(prod):0;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת נוסחת הרון</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו 3 צלעות — צפו בחצי-היקף ובשטח לפי הרון.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, maxWidth:500, margin:"0 auto 2rem" }}>
        {[{label:"a",val:a,set:setA},{label:"b",val:b,set:setB},{label:"c",val:c,set:setC}].map((sl,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:12, border:"1px solid rgba(255,255,255,0.4)", padding:"0.75rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#6B7280", marginBottom:4 }}><span>{sl.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{sl.val}</span></div><input type="range" min={1} max={15} step={0.5} value={sl.val} onChange={e=>sl.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:8 }}>חישוב</div>
          <div style={{ color:st.accentColor, fontSize:16, fontWeight:700, fontFamily:"monospace", marginBottom:6 }}>s = ({a}+{b}+{c})/2 = {s2.toFixed(1)}</div>
          {valid ? (
            <>
              <div style={{ color:"#64748b", fontSize:13, fontFamily:"monospace", marginBottom:6 }}>s−a={( s2 - a ).toFixed(1)}, s−b={( s2 - b ).toFixed(1)}, s−c={( s2 - c ).toFixed(1)}</div>
              <div style={{ color:"#a78bfa", fontSize:20, fontWeight:800, fontFamily:"monospace" }}>S = {area.toFixed(2)}</div>
            </>
          ) : (
            <div style={{ color:"#dc2626", fontSize:14, fontWeight:700 }}>המשולש לא קיים (אי-שוויון המשולש לא מתקיים)</div>
          )}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"s (חצי-היקף)",val:s2.toFixed(1)},{label:"שטח (הרון)",val:valid?area.toFixed(2):"—"},{label:"תקין?",val:valid?"✅":"❌"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:18, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>נסו a=3, b=4, c=5 (ישר-זווית) → S=6. נסו a=5, b=5, c=5 (שווה-צלעות) → S≈10.83.</p>
    </section>
  );
}

/* ─── QuadAreaLab (advanced) ───────────────────────────────────────────────── */

function QuadAreaLab() {
  const [d1,setD1]=useState(10); const [d2,setD2]=useState(8); const [theta,setTheta]=useState(60);
  const st=STATION.advanced;
  const rad=(theta*Math.PI)/180;
  const area=0.5*d1*d2*Math.sin(rad);
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת שטח מרובע — אלכסונים</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו אלכסונים וזווית ביניהם — S = ½·d₁·d₂·sin θ.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, maxWidth:500, margin:"0 auto 2rem" }}>
        {[{label:"d₁",val:d1,set:setD1,min:2,max:15},{label:"d₂",val:d2,set:setD2,min:2,max:15},{label:"θ (מעלות)",val:theta,set:setTheta,min:10,max:170}].map((sl,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:12, border:"1px solid rgba(255,255,255,0.4)", padding:"0.75rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#6B7280", marginBottom:4 }}><span>{sl.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{sl.val}</span></div><input type="range" min={sl.min} max={sl.max} step={1} value={sl.val} onChange={e=>sl.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 220 180" className="w-full max-w-sm mx-auto" aria-hidden>
          {(() => {
            const cx2=110, cy2=90, sc=6;
            const h1=d1*sc/2, h2=d2*sc/2;
            const ax=cx2, ay=cy2-h1;
            const bx=cx2+h2*Math.cos(rad-Math.PI/2), by=cy2+h2*Math.sin(rad-Math.PI/2);
            const dx=cx2, dy=cy2+h1;
            const ex=cx2-h2*Math.cos(rad-Math.PI/2), ey=cy2-h2*Math.sin(rad-Math.PI/2);
            return (<>
              <polygon points={`${ax},${ay} ${bx},${by} ${dx},${dy} ${ex},${ey}`} fill="rgba(220,38,38,0.06)" stroke="#DC2626" strokeWidth={2}/>
              <line x1={ax} y1={ay} x2={dx} y2={dy} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3"/>
              <line x1={bx} y1={by} x2={ex} y2={ey} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4,3"/>
              <text x={cx2+4} y={cy2-4} fontSize={10} fill="#64748b" fontFamily="monospace">{theta}°</text>
            </>);
          })()}
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"½·d₁·d₂",val:(0.5*d1*d2).toFixed(1)},{label:"sin θ",val:Math.sin(rad).toFixed(3)},{label:"S",val:area.toFixed(2)}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:20, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>θ=90° → sin=1 → שטח מקסימלי = ½·d₁·d₂ (מעוין!). θ=0° → שטח 0 (מנוון).</p>
    </section>
  );
}

/* ─── Tabs + FormulaBar ────────────────────────────────────────────────────── */

const TABS=[{id:"basic",label:"מתחיל",textColor:"text-green-700",border:"border-green-600",bg:"bg-green-600/10",glowColor:"rgba(22,163,74,0.3)"},{id:"medium",label:"בינוני",textColor:"text-orange-700",border:"border-orange-600",bg:"bg-orange-600/10",glowColor:"rgba(234,88,12,0.3)"},{id:"advanced",label:"מתקדם",textColor:"text-red-700",border:"border-red-700",bg:"bg-red-700/10",glowColor:"rgba(220,38,38,0.3)"}];

function FormulaBar() {
  const [activeTab,setActiveTab]=useState<"sinArea"|"heron"|"quad"|null>(null);
  const tabs=[{id:"sinArea" as const,label:"📐 sinC",tex:"S = \\tfrac{1}{2}ab\\sin C",color:"#16A34A",borderColor:"rgba(22,163,74,0.35)"},{id:"heron" as const,label:"📏 הרון",tex:"S = \\sqrt{s(s{-}a)(s{-}b)(s{-}c)}",color:"#EA580C",borderColor:"rgba(234,88,12,0.35)"},{id:"quad" as const,label:"◇ מרובע",tex:"S = \\tfrac{1}{2}d_1 d_2 \\sin\\theta",color:"#DC2626",borderColor:"rgba(220,38,38,0.35)"}];
  return (
    <div style={{ borderRadius:12, border:"1px solid rgba(60,54,42,0.15)", background:"rgba(255,255,255,0.75)", padding:"1.25rem", marginBottom:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginBottom:12, textAlign:"center" }}>נוסחאות</div>
      <div style={{ display:"flex", gap:6, marginBottom:activeTab?14:0 }}>{tabs.map(t=>{const isA=activeTab===t.id;return(<button key={t.id} onClick={()=>setActiveTab(isA?null:t.id)} style={{ flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", border:`1.5px solid ${isA?t.borderColor:"rgba(60,54,42,0.1)"}`, background:isA?`${t.color}0D`:"rgba(60,54,42,0.03)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{ fontSize:11, fontWeight:700, color:isA?t.color:"#6B7280" }}>{t.label}</span><span style={{ color:isA?t.color:"#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>);})}</div>
      {activeTab==="sinArea"&&(<motion.div key="s" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(22,163,74,0.25)", background:"rgba(220,252,231,0.4)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"S = \\frac{1}{2} \\cdot a \\cdot b \\cdot \\sin C"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>שטח = חצי מכפלת צלעות כפול sin הזווית הכלואה</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>C חייבת להיות הזווית <em>בין</em> a ו-b.</li><li>sin C = הגובה / b, ולכן h = b·sin C.</li><li>מקסימום כש-C=90° (sin=1).</li></ol></div><div style={{ marginTop:10, color:"#15803d", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: a=8, b=6, C=30° → S = ½·8·6·0.5 = 12</div></div></div></motion.div>)}
      {activeTab==="heron"&&(<motion.div key="h" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(234,88,12,0.25)", background:"rgba(255,247,237,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"s = \\frac{a+b+c}{2}"}</DisplayMath><DisplayMath>{"S = \\sqrt{s(s-a)(s-b)(s-c)}"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(234,88,12,0.06)", border:"1px solid rgba(234,88,12,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>נוסחת הרון — שטח מ-3 צלעות</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>חשבו s = חצי-היקף.</li><li>חשבו s−a, s−b, s−c (חייבים חיוביים).</li><li>הכפילו: s·(s−a)·(s−b)·(s−c), והוציאו שורש.</li></ol></div><div style={{ marginTop:10, color:"#B45309", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: a=3, b=4, c=5 → s=6 → S=√(6·3·2·1)=√36=6</div></div></div></motion.div>)}
      {activeTab==="quad"&&(<motion.div key="q" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(220,38,38,0.25)", background:"rgba(254,242,242,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"S = \\frac{1}{2} \\cdot d_1 \\cdot d_2 \\cdot \\sin\\theta"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>שטח מרובע מאלכסונים</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>d₁, d₂ = אורכי האלכסונים.</li><li>θ = הזווית בין האלכסונים.</li><li>עובד למעוין (θ=90° → S=½d₁d₂), דלתון, ומרובע כללי (אם האלכסונים נחתכים).</li></ol></div><div style={{ marginTop:10, color:"#DC2626", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: d₁=10, d₂=8, θ=90° → S = ½·10·8·1 = 40</div></div></div></motion.div>)}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function AreaPage5U() {
  const [selectedLevel,setSelectedLevel]=useState<"basic"|"medium"|"advanced">("basic");
  const ex=exercises.find(e=>e.id===selectedLevel)!;
  const lvlRgb=selectedLevel==="basic"?"45,90,39":selectedLevel==="medium"?"163,79,38":"139,38,53";
  return (
    <main style={{ minHeight:"100vh", background:"#F3EFE0", backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:"#2D3436", ["--lvl-rgb" as string]:lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`textarea,input[type="text"],input[type="password"]{outline:none!important}textarea:focus,input[type="text"]:focus{outline:none!important;border-color:rgba(var(--lvl-rgb),0.65)!important;box-shadow:0 0 0 3px rgba(var(--lvl-rgb),0.12)!important}input[type="range"]{outline:none!important}input[type="range"]:focus{outline:none!important}button:focus,button:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(var(--lvl-rgb),0.35)!important}button:focus:not(:focus-visible){box-shadow:none!important}`}</style>
      <div style={{ borderBottom:"1px solid rgba(60,54,42,0.15)", background:"#F3EFE0" }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div><h1 style={{ fontSize:22, fontWeight:700, color:"#2D3436", margin:0 }}>שטח משולש עם AI — כיתה י׳ (5 יח׳)</h1><p style={{ fontSize:13, color:"#6B7280", margin:"2px 0 0" }}>½ab·sinC, נוסחת הרון, שטח מרובע מאלכסונים</p></div>
          <Link href="/5u/topic/grade10/trig-plane" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap" }} onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D";}} onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A";}}><span style={{ fontSize:16 }}>←</span>חזרה</Link>
        </div>
      </div>
      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="5u/grade10/trig-plane/area"/>
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(60,54,42,0.15)" }}>{TABS.map(tab=>{const active=selectedLevel===tab.id;return(<button key={tab.id} onClick={()=>setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active?`${tab.bg} border ${tab.border} ${tab.textColor}`:"text-stone-500 hover:text-stone-800"}`} style={active?{boxShadow:`0 0 14px ${tab.glowColor}`}:undefined}>{tab.label}</button>);})}</div>
        <FormulaBar/>
        <motion.div key={selectedLevel} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22}}><ExerciseCard ex={ex}/></motion.div>
        {selectedLevel==="basic"&&<SinAreaLab/>}
        {selectedLevel==="medium"&&<HeronLab/>}
        {selectedLevel==="advanced"&&<QuadAreaLab/>}
        <div style={{ marginTop:"1.5rem" }}><MarkComplete subtopicId="5u/grade10/trig-plane/area" level={selectedLevel}/></div>
      </div>
    </main>
  );
}
