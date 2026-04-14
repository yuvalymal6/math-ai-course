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
    <svg viewBox="0 0 260 180" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={20} x2={40} y2={160} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={25} y1={140} x2={240} y2={140} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={36} y={15} fontSize={11} fill="#94a3b8" textAnchor="middle" fontFamily="serif">y</text>
      <text x={245} y={143} fontSize={11} fill="#94a3b8" fontFamily="serif">x</text>
      {/* Line */}
      <line x1={40} y1={120} x2={220} y2={40} stroke="#16A34A" strokeWidth={2.5} opacity={0.7} />
      {/* Slope triangle */}
      <line x1={80} y1={102} x2={160} y2={102} stroke="#a78bfa" strokeWidth={1} strokeDasharray="3,2" />
      <line x1={160} y1={102} x2={160} y2={66} stroke="#a78bfa" strokeWidth={1} strokeDasharray="3,2" />
      <text x={120} y={116} fontSize={9} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">Δx</text>
      <text x={170} y={88} fontSize={9} fill="#a78bfa" fontFamily="sans-serif">Δy</text>
      {/* y-intercept */}
      <circle cx={40} cy={120} r={4} fill="#f59e0b" />
      <text x={30} y={116} fontSize={10} fill="#f59e0b" textAnchor="end" fontFamily="sans-serif">n</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 260 190" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={130} y1={15} x2={130} y2={175} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={20} y1={110} x2={245} y2={110} stroke="#94a3b8" strokeWidth={1.2} />
      {/* Two intersecting lines */}
      <line x1={30} y1={160} x2={230} y2={30} stroke="#EA580C" strokeWidth={2} opacity={0.7} />
      <line x1={30} y1={40} x2={240} y2={160} stroke="#a78bfa" strokeWidth={2} opacity={0.7} />
      {/* Intersection */}
      <circle cx={138} cy={95} r={5} fill="none" stroke="#f59e0b" strokeWidth={2} />
      <text x={148} y={88} fontSize={10} fill="#f59e0b" fontFamily="sans-serif">?</text>
      <text x={232} y={26} fontSize={11} fill="#EA580C" fontFamily="serif">ℓ₁</text>
      <text x={242} y={164} fontSize={11} fill="#a78bfa" fontFamily="serif">ℓ₂</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 260 190" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={130} y1={15} x2={130} y2={175} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={20} y1={110} x2={245} y2={110} stroke="#94a3b8" strokeWidth={1.2} />
      {/* Line */}
      <line x1={30} y1={160} x2={230} y2={30} stroke="#DC2626" strokeWidth={2} opacity={0.6} />
      {/* Point off the line */}
      <circle cx={190} cy={130} r={5} fill="#34d399" />
      <text x={198} y={126} fontSize={10} fill="#34d399" fontFamily="sans-serif">P</text>
      {/* Distance (dashed perpendicular) */}
      <line x1={190} y1={130} x2={155} y2={65} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
      <text x={178} y={92} fontSize={10} fill="#f59e0b" fontFamily="sans-serif">d=?</text>
      {/* Right angle mark */}
      <rect x={152} y={67} width={6} height={6} fill="none" stroke="#64748b" strokeWidth={0.8} transform="rotate(-30,155,70)" />
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
function LadderAdvanced({ steps }: { steps:PromptStep[] }) { const [masterPassed,setMasterPassed]=useState(false); const [unlockedCount,setUnlockedCount]=useState(1); const allPassed=masterPassed&&unlockedCount>steps.length; return (<div><MasterPromptGate onPass={()=>setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["ישר","משוואה","מרחק","נקודה","ניצב","מקביל","ax+by+c"]}/>{steps.map((s,i)=>(<div key={i} style={{ marginBottom:8 }}>{(!masterPassed||i>=unlockedCount)?(<div style={{ borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", background:"rgba(255,255,255,0.7)", padding:"14px 16px", opacity:0.5, pointerEvents:"none" as const, display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ color:"#6B7280", fontSize:13, fontWeight:600 }}>{s.phase} — {s.label}</span><span style={{ fontSize:16 }}>🔒</span></div>):(<div><div style={{ borderRadius:14, border:"1px solid rgba(22,163,74,0.3)", background:"rgba(255,255,255,0.9)", padding:"14px 16px", marginBottom:8 }}><div style={{ color:"#15803d", fontSize:13, fontWeight:700, marginBottom:6 }}>{s.phase} — {s.label}</div><div style={{ color:"#334155", fontSize:13, lineHeight:1.6 }}>{s.prompt}</div></div><button onClick={()=>setUnlockedCount(v=>Math.max(v,i+2))} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}{allPassed&&(<div style={{ borderRadius:16, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:"1.25rem 1.5rem", marginTop:16, textAlign:"center" }}><div style={{ fontSize:28, marginBottom:8 }}>🏆</div><div style={{ color:"#14532d", fontWeight:800, fontSize:16, marginBottom:4 }}>כל הכבוד!</div><div style={{ color:"#166534", fontSize:13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}</div>); }

/* ─── Exercise Data ────────────────────────────────────────────────────────── */

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "משוואת ישר — צורות שונות",
    problem: "נתונה הנקודה A(2, 5) ושיפוע m = −3.\n\nא. כתבו את משוואת הישר בצורה y = mx + n.\nב. המירו את המשוואה לצורה הכללית ax + by + c = 0.\nג. מצאו את נקודות החיתוך עם שני הצירים.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בין הצורות y = mx + n ל-ax + by + c = 0", text: "הצורה y = mx + n מפורשת (y בודד). הצורה ax + by + c = 0 כללית. בהמרה: y = −3x + 11 → 3x + y − 11 = 0. שימו לב שa חייב להיות חיובי לפי מוסכמה." },
      { title: "⚠️ שכחת ההצבה הנכונה", text: "כדי למצוא n מציבים את הנקודה: 5 = (−3)·2 + n → n = 11. תלמידים מציבים x במקום y או שוכחים את המינוס ומקבלים n שגוי." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י', 5 יחידות, ומצרף/ת שאלה על משוואת ישר — צורה מפורשת וכללית. אני רוצה שתהיה המורה הפרטי שלי — תסביר לי את הלוגיקה ולא תיתן תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"צורה מפורשת", coaching:"", prompt:"A(2,5), m=−3. תנחה אותי — איך מציבים את הנקודה ב-y=mx+n כדי למצוא n.", keywords:[], keywordHint:"", contextWords:["משוואה","הצבה","שיפוע","n","נקודה","y=mx+n"] },
      { phase:"סעיף ב׳", label:"צורה כללית", coaching:"", prompt:"y = −3x + 11. תכווין אותי — איך ממירים לצורה ax + by + c = 0 ולמה a חיובי.", keywords:[], keywordHint:"", contextWords:["כללית","ax+by+c","המרה","העברת אגפים","חיובי","צורה"] },
      { phase:"סעיף ג׳", label:"חיתוך עם הצירים", coaching:"", prompt:"משוואת הישר ידועה. תדריך אותי — חיתוך ציר Y (x=0) וחיתוך ציר X (y=0).", keywords:[], keywordHint:"", contextWords:["חיתוך","ציר","X","Y","הצבה","נקודה"] },
    ],
  },
  {
    id: "medium",
    title: "ישרים מקבילים, ניצבים וחיתוך",
    problem: "נתונים שני ישרים:\nℓ₁: 2x − y + 3 = 0\nℓ₂: y = kx − 1\n\nא. מצאו את k כך ש-ℓ₂ מקביל ל-ℓ₁.\nב. מצאו את k כך ש-ℓ₂ ניצב ל-ℓ₁.\nג. עבור k = 2, מצאו את נקודת החיתוך של שני הישרים.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ שכחה להמיר לצורה מפורשת", text: "כדי למצוא שיפוע מ-2x − y + 3 = 0, צריך לבודד y: y = 2x + 3 → m₁ = 2. תלמידים לוקחים את המקדם של x ישירות מהצורה הכללית בלי לשים לב לסימן של y." },
      { title: "⚠️ בלבול ניצב ↔ מקביל", text: "מקביל: m₁ = m₂. ניצב: m₁·m₂ = −1 (ההופכי השלילי). אם m₁ = 2, המקביל: k = 2, הניצב: k = −½. תלמידים מתבלבלים ושמים −2 במקום −½." },
    ],
    goldenPrompt: `אני בכיתה י', 5 יחידות, מצרף/ת תרגיל על ישרים מקבילים, ניצבים ונקודת חיתוך.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על מציאת שיפועים ושימוש בתנאים.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"מקביליות", coaching:"", prompt:"ℓ₁: 2x−y+3=0, ℓ₂: y=kx−1. תנחה אותי — איך מוצאים שיפוע ℓ₁ מהצורה הכללית, ומה k כדי שיהיו מקבילים.", keywords:[], keywordHint:"", contextWords:["מקביל","שיפוע","שווה","k","המרה","צורה"] },
      { phase:"סעיף ב׳", label:"ניצבות", coaching:"", prompt:"m₁ = 2. תכווין אותי — מה k כך ש-ℓ₂ ניצב ל-ℓ₁. מה התנאי m₁·m₂ = −1.", keywords:[], keywordHint:"", contextWords:["ניצב","מכפלה","שיפוע","הופכי","שלילי","k"] },
      { phase:"סעיף ג׳", label:"נקודת חיתוך", coaching:"", prompt:"ℓ₁: y=2x+3, ℓ₂: y=2x−1. עבור k=2 הם מקבילים! תדריך אותי — מתי יש חיתוך ומתי אין, ואיך פותרים מערכת.", keywords:[], keywordHint:"", contextWords:["חיתוך","מערכת","משוואות","פתרון","הצבה","נקודה"] },
    ],
  },
  {
    id: "advanced",
    title: "מרחק נקודה מישר ומשולש",
    problem: "נתון הישר ℓ: 3x + 4y − 12 = 0 והנקודה P(1, 7).\n\nא. חשבו את המרחק של P מהישר ℓ בעזרת הנוסחה.\nב. מצאו את הנקודה Q שהיא רגל האנך מ-P ל-ℓ.\nג. מצאו את שטח המשולש שקודקודיו הם A(0, 3), B(4, 0) ו-P(1, 7).\nד. בדקו: האם A ו-B נמצאים על ℓ?",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ שכחת ערך מוחלט בנוסחת מרחק", text: "d = |ax₀ + by₀ + c| / √(a² + b²). הערך המוחלט הכרחי — בלעדיו אפשר לקבל מרחק שלילי, דבר שלא ייתכן." },
      { title: "⚠️ בלבול בחישוב שטח משולש מקואורדינטות", text: "S = ½|x₁(y₂−y₃) + x₂(y₃−y₁) + x₃(y₁−y₂)|. חלופה: S = ½·בסיס·גובה, כאשר הגובה = מרחק P מהישר AB. שתי הדרכים צריכות לתת אותו שטח." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: מה נוסחת המרחק של נקודה מישר, ואיך מוצאים רגל אנך? (לפחות 80 תווים)",
    steps: [
      { phase:"סעיף א׳", label:"מרחק נקודה מישר", coaching:"", prompt:"ℓ: 3x+4y−12=0, P(1,7). תנחה אותי — מה הנוסחה d = |ax₀+by₀+c|/√(a²+b²) ואיך מציבים.", keywords:[], keywordHint:"", contextWords:["מרחק","נוסחה","נקודה","ישר","הצבה","ערך מוחלט"] },
      { phase:"סעיף ב׳", label:"רגל אנך", coaching:"", prompt:"תכווין אותי — רגל האנך Q נמצאת על ℓ, והישר PQ ניצב ל-ℓ. איך מוצאים את Q.", keywords:[], keywordHint:"", contextWords:["אנך","רגל","ניצב","ישר","שיפוע","מערכת"] },
      { phase:"סעיף ג׳", label:"שטח משולש", coaching:"", prompt:"A(0,3), B(4,0), P(1,7). תדריך אותי — איך מחשבים שטח בעזרת נוסחת הקואורדינטות או בסיס×גובה.", keywords:[], keywordHint:"", contextWords:["שטח","משולש","קואורדינטות","נוסחה","בסיס","גובה"] },
      { phase:"סעיף ד׳", label:"בדיקת נקודות על ישר", coaching:"", prompt:"ℓ: 3x+4y−12=0. תנחה אותי — איך בודקים אם A(0,3) ו-B(4,0) על הישר (הצבה ובדיקה).", keywords:[], keywordHint:"", contextWords:["הצבה","בדיקה","ישר","נקודה","על","מקיים"] },
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
        <div style={{ textAlign:"center", marginBottom:14 }}><div style={{ color:s.accentColor, fontSize:15, fontWeight:800, marginBottom:4 }}>📐 ישר ומשוואתו (5 יח׳)</div><div style={{ color:"#6B7280", fontSize:12, lineHeight:1.55 }}>{ex.id==="basic"&&"משוואת ישר בצורה מפורשת וכללית."}{ex.id==="medium"&&"מקביליות, ניצבות ונקודת חיתוך ישרים."}{ex.id==="advanced"&&"מרחק נקודה מישר, רגל אנך ושטח."}</div></div>
        <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:14 }}/>
        <div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>🎯 נוסחאות</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:130 }}>y = mx + n</span><span>צורה מפורשת</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:130 }}>ax + by + c = 0</span><span>צורה כללית</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:130 }}>m = (y₂−y₁)/(x₂−x₁)</span><span>שיפוע משתי נקודות</span></div></div></div>
        {ex.id!=="basic"&&(<><div style={{ height:1, background:"rgba(60,54,42,0.08)", marginBottom:12 }}/><div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>✨ {ex.id==="medium"?"מקביל ואנכי":"מרחק ושטח"}</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}>{ex.id==="medium"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:130 }}>מקביל: m₁ = m₂</span><span>אותו שיפוע</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:130 }}>ניצב: m₁·m₂ = −1</span><span>הופכי שלילי</span></div></>}{ex.id==="advanced"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:160 }}>d = |ax₀+by₀+c|/√(a²+b²)</span><span>מרחק נקודה מישר</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:160 }}>S = ½|x₁(y₂−y₃)+...</span><span>שטח משולש מקואורדינטות</span></div></>}</div></div></>)}
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

/* ─── LineEquationLab (basic) ──────────────────────────────────────────────── */

function LineEquationLab() {
  const [m,setM]=useState(-3); const [n,setN]=useState(11);
  const st=STATION.basic;
  const xInt=m!==0?-n/m:null;
  const ox=130,oy=110,sc=12;
  const toSx=(x:number)=>ox+x*sc; const toSy=(y:number)=>oy-y*sc;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת משוואת ישר</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו m ו-n — צפו במשוואה, בגרף ובנקודות החיתוך.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 2rem" }}>
        {[{label:"m (שיפוע)",val:m,set:setM,min:-5,max:5,step:0.5},{label:"n (חיתוך Y)",val:n,set:setN,min:-10,max:15,step:1}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 260 220" className="w-full max-w-md mx-auto" aria-hidden>
          {[-8,-6,-4,-2,2,4,6,8].map(v=>(<g key={v}><line x1={toSx(v)} y1={toSy(-8)} x2={toSx(v)} y2={toSy(10)} stroke="#e5e7eb" strokeWidth={0.5}/><line x1={toSx(-8)} y1={toSy(v)} x2={toSx(8)} y2={toSy(v)} stroke="#e5e7eb" strokeWidth={0.5}/></g>))}
          <line x1={toSx(-9)} y1={oy} x2={toSx(9)} y2={oy} stroke="#94a3b8" strokeWidth={1.2}/>
          <line x1={ox} y1={toSy(-9)} x2={ox} y2={toSy(12)} stroke="#94a3b8" strokeWidth={1.2}/>
          <line x1={toSx(-8)} y1={toSy(m*(-8)+n)} x2={toSx(8)} y2={toSy(m*8+n)} stroke={st.accentColor} strokeWidth={2.5}/>
          <circle cx={toSx(0)} cy={toSy(n)} r={4} fill="#f59e0b"/>
          {xInt!==null&&Math.abs(xInt)<=9&&<circle cx={toSx(xInt)} cy={toSy(0)} r={4} fill="#a78bfa"/>}
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"מפורשת",val:`y = ${m}x ${n>=0?"+":"−"} ${Math.abs(n)}`},{label:"כללית",val:`${-m}x + y ${-n>=0?"+":"−"} ${Math.abs(n)} = 0`},{label:"חיתוך X",val:xInt!==null?`(${xInt.toFixed(1)}, 0)`:"אין"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:13, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>שנו m — הישר מסתובב סביב חיתוך Y. שנו n — הישר נע למעלה/למטה.</p>
    </section>
  );
}

/* ─── ParallelPerpLab (medium) ─────────────────────────────────────────────── */

function ParallelPerpLab() {
  const [m1,setM1]=useState(2); const [n1,setN1]=useState(3); const [mode,setMode]=useState<"parallel"|"perp">("parallel");
  const st=STATION.medium;
  const m2=mode==="parallel"?m1:(m1!==0?-1/m1:NaN);
  const n2=mode==="parallel"?-1:2;
  const ox=130,oy=110,sc=14;
  const toSx=(x:number)=>ox+x*sc; const toSy=(y:number)=>oy-y*sc;
  // Intersection for non-parallel
  const intX=m1!==m2?(n2-n1)/(m1-m2):NaN;
  const intY=!isNaN(intX)?m1*intX+n1:NaN;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת מקביל ואנכי</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו שיפוע ובחרו מצב — צפו בישר המקביל או הניצב.</p>
      <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:"1.5rem" }}>
        {([["parallel","מקביל"],["perp","ניצב"]] as const).map(([k,label])=>(<button key={k} onClick={()=>setMode(k)} style={{ padding:"10px 24px", borderRadius:14, fontSize:14, fontWeight:700, cursor:"pointer", border:`2px solid ${mode===k?st.accentColor:"rgba(60,54,42,0.15)"}`, background:mode===k?`${st.accentColor}15`:"rgba(255,255,255,0.75)", color:mode===k?st.accentColor:"#6B7280" }}>{label}</button>))}
      </div>
      <div style={{ maxWidth:400, margin:"0 auto 2rem" }}><div style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>m₁ (שיפוע ℓ₁)</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{m1}</span></div><input type="range" min={-4} max={4} step={0.5} value={m1} onChange={e=>setM1(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div></div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 260 220" className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={toSx(-8)} y1={oy} x2={toSx(8)} y2={oy} stroke="#94a3b8" strokeWidth={1.2}/><line x1={ox} y1={toSy(-8)} x2={ox} y2={toSy(8)} stroke="#94a3b8" strokeWidth={1.2}/>
          <line x1={toSx(-7)} y1={toSy(m1*(-7)+n1)} x2={toSx(7)} y2={toSy(m1*7+n1)} stroke="#EA580C" strokeWidth={2} opacity={0.8}/>
          {!isNaN(m2)&&<line x1={toSx(-7)} y1={toSy(m2*(-7)+n2)} x2={toSx(7)} y2={toSy(m2*7+n2)} stroke="#a78bfa" strokeWidth={2} opacity={0.8}/>}
          {mode==="perp"&&!isNaN(intX)&&!isNaN(intY)&&<><circle cx={toSx(intX)} cy={toSy(intY)} r={5} fill="#f59e0b"/><rect x={toSx(intX)-1} y={toSy(intY)-8} width={7} height={7} fill="none" stroke="#64748b" strokeWidth={0.8}/></>}
          <text x={toSx(6)} y={toSy(m1*6+n1)-8} fontSize={11} fill="#EA580C" fontFamily="serif">ℓ₁</text>
          {!isNaN(m2)&&<text x={toSx(6)} y={toSy(m2*6+n2)-8} fontSize={11} fill="#a78bfa" fontFamily="serif">ℓ₂</text>}
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"m₁",val:String(m1)},{label:`m₂ (${mode==="parallel"?"מקביל":"ניצב"})`,val:isNaN(m2)?"∞":m2.toFixed(2)},{label:"m₁·m₂",val:isNaN(m2)?"—":(m1*m2).toFixed(2)}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:17, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>ניצב: m₁·m₂ = −1 תמיד. מקביל: m₁ = m₂. מה קורה כש-m₁ = 0?</p>
    </section>
  );
}

/* ─── DistanceLab (advanced) ───────────────────────────────────────────────── */

function DistanceLab() {
  const [px,setPx]=useState(1); const [py,setPy]=useState(7);
  const st=STATION.advanced;
  // Line: 3x + 4y - 12 = 0 → y = (-3x + 12)/4
  const a=3,b=4,c=-12;
  const dist=Math.abs(a*px+b*py+c)/Math.sqrt(a*a+b*b);
  // Foot of perpendicular
  const t=-(a*px+b*py+c)/(a*a+b*b);
  const qx=px+a*t; const qy=py+b*t;
  const ox2=50,oy2=160,sc2=18;
  const toSx2=(x:number)=>ox2+x*sc2; const toSy2=(y:number)=>oy2-y*sc2;
  const lineY=(x:number)=>(-a*x-c)/b;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת מרחק נקודה מישר</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>הזיזו את P — צפו כיצד המרחק ורגל האנך משתנים. ישר: 3x+4y−12=0</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 2rem" }}>
        {[{label:"P_x",val:px,set:setPx,min:-2,max:8},{label:"P_y",val:py,set:setPy,min:-2,max:8}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={s.min} max={s.max} step={0.5} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 260 200" className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={toSx2(-1)} y1={oy2} x2={toSx2(9)} y2={oy2} stroke="#94a3b8" strokeWidth={1}/><line x1={ox2} y1={toSy2(-1)} x2={ox2} y2={toSy2(9)} stroke="#94a3b8" strokeWidth={1}/>
          {/* Line 3x+4y-12=0 */}
          <line x1={toSx2(-1)} y1={toSy2(lineY(-1))} x2={toSx2(6)} y2={toSy2(lineY(6))} stroke={st.accentColor} strokeWidth={2} opacity={0.7}/>
          {/* P */}
          <circle cx={toSx2(px)} cy={toSy2(py)} r={5} fill="#34d399"/>
          <text x={toSx2(px)+8} y={toSy2(py)-6} fontSize={10} fill="#34d399" fontFamily="monospace">P({px},{py})</text>
          {/* Q (foot) */}
          <circle cx={toSx2(qx)} cy={toSy2(qy)} r={4} fill="#f59e0b"/>
          <text x={toSx2(qx)+8} y={toSy2(qy)+14} fontSize={9} fill="#f59e0b" fontFamily="monospace">Q({qx.toFixed(1)},{qy.toFixed(1)})</text>
          {/* Distance line */}
          <line x1={toSx2(px)} y1={toSy2(py)} x2={toSx2(qx)} y2={toSy2(qy)} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3"/>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"מרחק d",val:dist.toFixed(2)},{label:"רגל אנך Q",val:`(${qx.toFixed(1)}, ${qy.toFixed(1)})`},{label:"|3·P_x+4·P_y−12|",val:String(Math.abs(a*px+b*py+c))}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:16, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>הזיזו P לנקודה על הישר — המרחק יהיה 0! רגל האנך = P.</p>
    </section>
  );
}

/* ─── Tabs + FormulaBar ────────────────────────────────────────────────────── */

const TABS=[{id:"basic",label:"מתחיל",textColor:"text-green-700",border:"border-green-600",bg:"bg-green-600/10",glowColor:"rgba(22,163,74,0.3)"},{id:"medium",label:"בינוני",textColor:"text-orange-700",border:"border-orange-600",bg:"bg-orange-600/10",glowColor:"rgba(234,88,12,0.3)"},{id:"advanced",label:"מתקדם",textColor:"text-red-700",border:"border-red-700",bg:"bg-red-700/10",glowColor:"rgba(220,38,38,0.3)"}];

function FormulaBar() {
  const [activeTab,setActiveTab]=useState<"forms"|"parallel"|"distance"|null>(null);
  const tabs=[{id:"forms" as const,label:"📐 צורות משוואה",tex:"y = mx + n",color:"#16A34A",borderColor:"rgba(22,163,74,0.35)"},{id:"parallel" as const,label:"⊥ מקביל/ניצב",tex:"m_1 \\cdot m_2 = -1",color:"#EA580C",borderColor:"rgba(234,88,12,0.35)"},{id:"distance" as const,label:"📏 מרחק",tex:"d = \\frac{|ax_0+by_0+c|}{\\sqrt{a^2+b^2}}",color:"#DC2626",borderColor:"rgba(220,38,38,0.35)"}];
  return (
    <div style={{ borderRadius:12, border:"1px solid rgba(60,54,42,0.15)", background:"rgba(255,255,255,0.75)", padding:"1.25rem", marginBottom:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginBottom:12, textAlign:"center" }}>נוסחאות</div>
      <div style={{ display:"flex", gap:6, marginBottom:activeTab?14:0 }}>{tabs.map(t=>{const isA=activeTab===t.id;return(<button key={t.id} onClick={()=>setActiveTab(isA?null:t.id)} style={{ flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", border:`1.5px solid ${isA?t.borderColor:"rgba(60,54,42,0.1)"}`, background:isA?`${t.color}0D`:"rgba(60,54,42,0.03)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{ fontSize:11, fontWeight:700, color:isA?t.color:"#6B7280" }}>{t.label}</span><span style={{ color:isA?t.color:"#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>);})}</div>
      {activeTab==="forms"&&(<motion.div key="f" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(22,163,74,0.25)", background:"rgba(220,252,231,0.4)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"y = mx + n \\quad\\Leftrightarrow\\quad ax + by + c = 0"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>שתי צורות</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>מפורשת:</strong> y = mx + n. m = שיפוע, n = חיתוך Y.</li><li><strong>כללית:</strong> ax + by + c = 0. כוללת גם ישרים אנכיים (b=0).</li><li>המרה: y = mx + n → mx − y + n = 0 (a=m, b=−1, c=n).</li></ol></div></div></div></motion.div>)}
      {activeTab==="parallel"&&(<motion.div key="p" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(234,88,12,0.25)", background:"rgba(255,247,237,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"m_1 = m_2 \\;\\text{(parallel)}\\qquad m_1 \\cdot m_2 = -1 \\;\\text{(perp)}"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(234,88,12,0.06)", border:"1px solid rgba(234,88,12,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>מקביל ואנכי</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>מקבילים:</strong> אותו שיפוע (m₁ = m₂).</li><li><strong>ניצבים:</strong> m₂ = −1/m₁ (ההופכי השלילי).</li><li>מהצורה הכללית: m = −a/b.</li></ol></div><div style={{ marginTop:10, color:"#B45309", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: m₁ = 3 → ניצב: m₂ = −⅓. מקביל: m₂ = 3.</div></div></div></motion.div>)}
      {activeTab==="distance"&&(<motion.div key="d" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(220,38,38,0.25)", background:"rgba(254,242,242,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"d = \\frac{|ax_0 + by_0 + c|}{\\sqrt{a^2 + b^2}}"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>מרחק נקודה מישר</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>הישר חייב להיות בצורה כללית: ax+by+c=0.</li><li>מציבים את (x₀,y₀) של הנקודה.</li><li>ערך מוחלט למונה! אחרת אפשר שלילי.</li><li>שטח משולש: S = ½ · בסיס · d (כשd = מרחק קודקוד מהבסיס).</li></ol></div><div style={{ marginTop:10, color:"#DC2626", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: P(1,7) מ-3x+4y−12=0 → d = |3+28−12|/5 = 19/5 = 3.8</div></div></div></motion.div>)}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function LinePage5U() {
  const [selectedLevel,setSelectedLevel]=useState<"basic"|"medium"|"advanced">("basic");
  const ex=exercises.find(e=>e.id===selectedLevel)!;
  const lvlRgb=selectedLevel==="basic"?"45,90,39":selectedLevel==="medium"?"163,79,38":"139,38,53";
  return (
    <main style={{ minHeight:"100vh", background:"#F3EFE0", backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:"#2D3436", ["--lvl-rgb" as string]:lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`textarea,input[type="text"],input[type="password"]{outline:none!important}textarea:focus,input[type="text"]:focus{outline:none!important;border-color:rgba(var(--lvl-rgb),0.65)!important;box-shadow:0 0 0 3px rgba(var(--lvl-rgb),0.12)!important}input[type="range"]{outline:none!important}input[type="range"]:focus{outline:none!important}button:focus,button:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(var(--lvl-rgb),0.35)!important}button:focus:not(:focus-visible){box-shadow:none!important}`}</style>
      <div style={{ borderBottom:"1px solid rgba(60,54,42,0.15)", background:"#F3EFE0" }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div><h1 style={{ fontSize:22, fontWeight:700, color:"#2D3436", margin:0 }}>ישר ומשוואתו עם AI — כיתה י׳ (5 יח׳)</h1><p style={{ fontSize:13, color:"#6B7280", margin:"2px 0 0" }}>משוואת ישר, מקביל, ניצב, מרחק נקודה מישר</p></div>
          <Link href="/5u/topic/grade10/analytic" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap" }} onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D";}} onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A";}}><span style={{ fontSize:16 }}>←</span>חזרה</Link>
        </div>
      </div>
      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="5u/grade10/analytic/line"/>
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(60,54,42,0.15)" }}>{TABS.map(tab=>{const active=selectedLevel===tab.id;return(<button key={tab.id} onClick={()=>setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active?`${tab.bg} border ${tab.border} ${tab.textColor}`:"text-stone-500 hover:text-stone-800"}`} style={active?{boxShadow:`0 0 14px ${tab.glowColor}`}:undefined}>{tab.label}</button>);})}</div>
        <FormulaBar/>
        <motion.div key={selectedLevel} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22}}><ExerciseCard ex={ex}/></motion.div>
        {selectedLevel==="basic"&&<LineEquationLab/>}
        {selectedLevel==="medium"&&<ParallelPerpLab/>}
        {selectedLevel==="advanced"&&<DistanceLab/>}
        <div style={{ marginTop:"1.5rem" }}><MarkComplete subtopicId="5u/grade10/analytic/line" level={selectedLevel}/></div>
      </div>
    </main>
  );
}
