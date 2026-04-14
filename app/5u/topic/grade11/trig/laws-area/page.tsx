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
      <polygon points="40,140 220,140 150,30" fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.7} />
      <text x={28} y={148} fontSize={13} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={224} y={148} fontSize={13} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={148} y={24} fontSize={13} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">C</text>
      {/* Side labels */}
      <text x={130} y={158} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">c</text>
      <text x={192} y={80} fontSize={11} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">a</text>
      <text x={86} y={80} fontSize={11} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">b</text>
      {/* Angle arcs */}
      <path d="M58,140 A18,18 0 0,0 52,126" fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      <text x={58} y={126} fontSize={9} fill="#f59e0b" fontFamily="sans-serif">A</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 260 170" className="w-full max-w-sm mx-auto" aria-hidden>
      <polygon points="30,150 230,150 170,30" fill="none" stroke="#EA580C" strokeWidth={2} opacity={0.7} />
      <text x={18} y={158} fontSize={13} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={234} y={158} fontSize={13} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">C</text>
      <text x={168} y={24} fontSize={13} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">A</text>
      {/* Angle at A highlighted */}
      <path d="M158,46 A14,14 0 0,1 176,46" fill="none" stroke="#f59e0b" strokeWidth={2} />
      <text x={168} y={58} fontSize={10} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">A</text>
      {/* Known sides */}
      <text x={96} y={86} fontSize={11} fill="#a78bfa" fontFamily="sans-serif">c = ?</text>
      <text x={206} y={86} fontSize={11} fill="#a78bfa" fontFamily="sans-serif">b = ?</text>
      <text x={130} y={165} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">a</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 270 180" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Two triangles sharing a side */}
      <polygon points="40,150 160,150 100,40" fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.6} />
      <polygon points="160,150 250,150 200,50" fill="none" stroke="#a78bfa" strokeWidth={2} opacity={0.6} />
      {/* Shared side */}
      <line x1={160} y1={150} x2={160} y2={150} stroke="#f59e0b" strokeWidth={3} />
      <text x={30} y={160} fontSize={12} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={156} y={160} fontSize={12} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={96} y={34} fontSize={12} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">C</text>
      <text x={254} y={158} fontSize={12} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">D</text>
      <text x={200} y={44} fontSize={12} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">E</text>
      <text x={140} y={105} fontSize={12} fill="#34d399" textAnchor="middle" fontFamily="sans-serif">S = ?</text>
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
function LadderAdvanced({ steps }: { steps:PromptStep[] }) { const [masterPassed,setMasterPassed]=useState(false); const [unlockedCount,setUnlockedCount]=useState(1); const allPassed=masterPassed&&unlockedCount>steps.length; return (<div><MasterPromptGate onPass={()=>setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["סינוסים","קוסינוסים","שטח","sinC","משולש","צלע","זווית"]}/>{steps.map((s,i)=>(<div key={i} style={{ marginBottom:8 }}>{(!masterPassed||i>=unlockedCount)?(<div style={{ borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", background:"rgba(255,255,255,0.7)", padding:"14px 16px", opacity:0.5, pointerEvents:"none" as const, display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ color:"#6B7280", fontSize:13, fontWeight:600 }}>{s.phase} — {s.label}</span><span style={{ fontSize:16 }}>🔒</span></div>):(<div><div style={{ borderRadius:14, border:"1px solid rgba(22,163,74,0.3)", background:"rgba(255,255,255,0.9)", padding:"14px 16px", marginBottom:8 }}><div style={{ color:"#15803d", fontSize:13, fontWeight:700, marginBottom:6 }}>{s.phase} — {s.label}</div><div style={{ color:"#334155", fontSize:13, lineHeight:1.6 }}>{s.prompt}</div></div><button onClick={()=>setUnlockedCount(v=>Math.max(v,i+2))} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}{allPassed&&(<div style={{ borderRadius:16, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:"1.25rem 1.5rem", marginTop:16, textAlign:"center" }}><div style={{ fontSize:28, marginBottom:8 }}>🏆</div><div style={{ color:"#14532d", fontWeight:800, fontSize:16, marginBottom:4 }}>כל הכבוד!</div><div style={{ color:"#166534", fontSize:13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}</div>); }

/* ─── Exercise Data ────────────────────────────────────────────────────────── */

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "משפט הסינוסים — מציאת צלע וזווית",
    problem: "במשולש ABC ידוע: a (הצלע שמול A), זווית A וזווית B.\n\nא. כתבו את משפט הסינוסים וחשבו את b.\nב. מצאו את זווית C.\nג. חשבו את שטח המשולש בעזרת S = ½·a·b·sin C.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ בלבול איזו צלע מול איזו זווית", text: "a = הצלע שמול ∠A. b = שמול ∠B. c = שמול ∠C. התלמידים מתבלבלים ומציבים צלע שלא מול הזווית שלה — התוצאה שגויה." },
      { title: "⚠️ שכחת שסכום זוויות = 180°", text: "אחרי שמוצאים ∠A ו-∠B, ∠C = 180° − A − B. תלמידים שוכחים ומנסים להשתמש בסינוסים למצוא C — מסובך ומיותר." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יא', 5 יחידות, ומצרף/ת שאלה על משפט הסינוסים ושטח משולש. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"סינוסים → מציאת b", coaching:"", prompt:"a ידוע, ∠A ו-∠B ידועים. תנחה אותי — מהו משפט הסינוסים a/sinA = b/sinB ואיך מבודדים b.", keywords:[], keywordHint:"", contextWords:["סינוסים","משפט","צלע","זווית","יחס","בידוד"] },
      { phase:"סעיף ב׳", label:"זווית C", coaching:"", prompt:"∠A ו-∠B ידועים. תכווין אותי — איך מוצאים ∠C מסכום הזוויות.", keywords:[], keywordHint:"", contextWords:["זווית","C","סכום","180","חיסור","משולש"] },
      { phase:"סעיף ג׳", label:"שטח המשולש", coaching:"", prompt:"a, b ו-∠C ידועים. תדריך אותי — S = ½·a·b·sin C. למה C חייבת להיות הזווית הכלואה.", keywords:[], keywordHint:"", contextWords:["שטח","½ab sinC","כלואה","הצבה","חישוב","sin"] },
    ],
  },
  {
    id: "medium",
    title: "משפט הקוסינוסים — פתרון משולש שלם",
    problem: "במשולש ABC ידועות שלוש הצלעות: a, b, c.\n\nא. מצאו את זווית A בעזרת משפט הקוסינוסים.\nב. מצאו את זווית B בעזרת משפט הסינוסים.\nג. ודאו ש-A + B + C = 180°.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ סימן שגוי בנוסחת הקוסינוסים", text: "a² = b² + c² − 2bc·cos A. המינוס לפני 2bc·cosA! תלמידים שוכחים ושמים פלוס — מקבלים cos A שגוי ולפעמים מחוץ לטווח [−1,1]." },
      { title: "⚠️ arccos נותן רק זווית אחת", text: "cos A = (b²+c²−a²)/(2bc). אם התוצאה שלילית → A קהה (>90°). arccos תמיד נותן תשובה אחת (בין 0° ל-180°) — לא צריך לדאוג לפתרון כפול." },
    ],
    goldenPrompt: `אני בכיתה יא', 5 יחידות, מצרף/ת תרגיל על משפט הקוסינוסים — מציאת זוויות מצלעות.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על בחירת המשפט הנכון.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"cos A מקוסינוסים", coaching:"", prompt:"a, b, c ידועים. תנחה אותי — cos A = (b²+c²−a²)/(2bc). איך מציבים ומוצאים A.", keywords:[], keywordHint:"", contextWords:["קוסינוסים","cos","צלע","ריבוע","הצבה","arccos"] },
      { phase:"סעיף ב׳", label:"B מסינוסים", coaching:"", prompt:"∠A ידוע, a ו-b ידועים. תכווין אותי — משפט סינוסים sin B = b·sinA/a. למה זה יותר קל מקוסינוסים.", keywords:[], keywordHint:"", contextWords:["סינוסים","sin","B","a","b","arcsin"] },
      { phase:"סעיף ג׳", label:"אימות סכום", coaching:"", prompt:"∠A ו-∠B ידועים. תדריך אותי — C = 180°−A−B. איך מוודאים שהחישוב נכון.", keywords:[], keywordHint:"", contextWords:["סכום","180","אימות","C","בדיקה","זוויות"] },
    ],
  },
  {
    id: "advanced",
    title: "שילוב — פתרון בעיה מורכבת עם שטח",
    problem: "במרובע ABCD, האלכסון BD מחלק אותו לשני משולשים.\nידועים: BD, ∠ABD, ∠DBC, AB, BC.\n\nא. חשבו את שטח △ABD.\nב. חשבו AD בעזרת משפט הסינוסים ב-△ABD.\nג. חשבו את שטח △BCD.\nד. מצאו את השטח הכולל של המרובע.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ שכחה לחשב זווית שלישית לפני שטח", text: "S = ½·a·b·sin C דורש שC תהיה הזווית הכלואה. במשולש ABD, אם ידועים AB, BD ו-∠ABD — חייבים ∠ADB = 180° − ∠ABD − ∠A לפני שטח עם צלע אחרת." },
      { title: "⚠️ בלבול בין משפט סינוסים לקוסינוסים", text: "סינוסים: כשיש צלע + זווית שמולה + עוד זווית/צלע. קוסינוסים: כש-3 צלעות או 2 צלעות + הזווית הכלואה. בחירה לא נכונה = בזבוז זמן." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: מתי משתמשים בסינוסים ומתי בקוסינוסים, ואיך S=½ab·sinC עוזר לפרק מרובע? (לפחות 80 תווים)",
    steps: [
      { phase:"סעיף א׳", label:"שטח △ABD", coaching:"", prompt:"AB, BD ו-∠ABD ידועים. תנחה אותי — S = ½·AB·BD·sin(∠ABD). הזווית הכלואה.", keywords:[], keywordHint:"", contextWords:["שטח","½ab sinC","הצבה","כלואה","ABD","חישוב"] },
      { phase:"סעיף ב׳", label:"AD מסינוסים", coaching:"", prompt:"ב-△ABD ידועים AB, ∠ABD ו-BD. תכווין אותי — איך מוצאים AD בסינוסים (צריך ∠ADB).", keywords:[], keywordHint:"", contextWords:["סינוסים","AD","זווית","ADB","סכום","בידוד"] },
      { phase:"סעיף ג׳", label:"שטח △BCD", coaching:"", prompt:"BC, BD ו-∠DBC ידועים. תדריך אותי לחשב S₂ = ½·BC·BD·sin(∠DBC).", keywords:[], keywordHint:"", contextWords:["שטח","BCD","sin","חישוב","½","הצבה"] },
      { phase:"סעיף ד׳", label:"שטח כולל", coaching:"", prompt:"S₁ ו-S₂ ידועים. תנחה אותי — שטח מרובע = S₁+S₂. למה זה תמיד עובד.", keywords:[], keywordHint:"", contextWords:["סכום","שטח","מרובע","כולל","S₁+S₂","תשובה"] },
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
        <div style={{ textAlign:"center", marginBottom:14 }}><div style={{ color:s.accentColor, fontSize:15, fontWeight:800, marginBottom:4 }}>📐 סינוסים, קוסינוסים ושטח (5 יח׳)</div><div style={{ color:"#6B7280", fontSize:12, lineHeight:1.55 }}>{ex.id==="basic"&&"משפט סינוסים + שטח ½ab·sinC."}{ex.id==="medium"&&"משפט קוסינוסים — פתרון משולש שלם."}{ex.id==="advanced"&&"שילוב — שטח מרובע מאלכסון ומשפטים."}</div></div>
        <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:14 }}/>
        <div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>🎯 משפטים</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:160 }}>a/sinA = b/sinB</span><span>סינוסים</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:160 }}>a²=b²+c²−2bc·cosA</span><span>קוסינוסים</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:160 }}>S = ½ab·sinC</span><span>שטח</span></div></div></div>
        {ex.id!=="basic"&&(<><div style={{ height:1, background:"rgba(60,54,42,0.08)", marginBottom:12 }}/><div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>✨ מתי להשתמש</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:120 }}>סינוסים</span><span>צלע + זווית שמולה + עוד נתון</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:120 }}>קוסינוסים</span><span>3 צלעות, או 2 צלעות + זווית כלואה</span></div></div></div></>)}
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

/* ─── SineLawLab (basic) ──────────────────────────────────────────────────── */

function SineLawLab() {
  const [aDeg,setADeg]=useState(50); const [bDeg,setBDeg]=useState(70); const [sideA,setSideA]=useState(8);
  const st=STATION.basic;
  const cDeg=180-aDeg-bDeg; const valid=cDeg>0&&cDeg<180;
  const aRad=aDeg*Math.PI/180, bRad=bDeg*Math.PI/180, cRad=valid?cDeg*Math.PI/180:0;
  const sideB=valid?sideA*Math.sin(bRad)/Math.sin(aRad):0;
  const sideC=valid?sideA*Math.sin(cRad)/Math.sin(aRad):0;
  const area=valid?0.5*sideA*sideB*Math.sin(cRad):0;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת סינוסים ושטח</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו זוויות וצלע — צפו בכל הצלעות ובשטח.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, maxWidth:500, margin:"0 auto 2rem" }}>
        {[{label:"∠A",val:aDeg,set:setADeg,min:10,max:160},{label:"∠B",val:bDeg,set:setBDeg,min:10,max:160},{label:"a (צלע מול A)",val:sideA,set:setSideA,min:2,max:15}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:12, border:"1px solid rgba(255,255,255,0.4)", padding:"0.75rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:valid?st.accentColor:"#DC2626", fontFamily:"monospace", fontWeight:700 }}>{s.val}{typeof s.val==="number"&&s.label.startsWith("∠")?"°":""}</span></div><input type="range" min={s.min} max={s.max} step={1} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      {!valid&&<div style={{ textAlign:"center", color:"#DC2626", fontSize:13, fontWeight:700, marginBottom:16 }}>∠A + ∠B ≥ 180° — לא תקין!</div>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
        {[{label:"∠C",val:valid?`${cDeg}°`:"—"},{label:"b",val:valid?sideB.toFixed(2):"—"},{label:"c",val:valid?sideC.toFixed(2):"—"},{label:"שטח",val:valid?area.toFixed(2):"—"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:10, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:10, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:16, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>a/sinA = b/sinB = c/sinC. שטח = ½·a·b·sin C. הגדילו A — a גדל!</p>
    </section>
  );
}

/* ─── CosineLawLab (medium) ───────────────────────────────────────────────── */

function CosineLawLab() {
  const [a,setA]=useState(7); const [b,setB]=useState(8); const [c,setC]=useState(9);
  const st=STATION.medium;
  const valid=a+b>c&&a+c>b&&b+c>a;
  const cosA=valid?(b*b+c*c-a*a)/(2*b*c):0;
  const angleA=valid?Math.acos(Math.max(-1,Math.min(1,cosA)))*180/Math.PI:0;
  const sinA=valid?Math.sin(angleA*Math.PI/180):0;
  const sinB=valid?b*sinA/a:0;
  const angleB=valid?Math.asin(Math.max(-1,Math.min(1,sinB)))*180/Math.PI:0;
  const angleC=valid?180-angleA-angleB:0;
  const area=valid?0.5*b*c*sinA:0;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת קוסינוסים — פתרון שלם</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו 3 צלעות — צפו בכל הזוויות ובשטח.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, maxWidth:500, margin:"0 auto 2rem" }}>
        {[{label:"a",val:a,set:setA},{label:"b",val:b,set:setB},{label:"c",val:c,set:setC}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:12, border:"1px solid rgba(255,255,255,0.4)", padding:"0.75rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:valid?st.accentColor:"#DC2626", fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={1} max={15} step={0.5} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      {!valid&&<div style={{ textAlign:"center", color:"#DC2626", fontSize:13, fontWeight:700, marginBottom:16 }}>אי-שוויון המשולש לא מתקיים!</div>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
        {[{label:"∠A",val:valid?`${angleA.toFixed(1)}°`:"—"},{label:"∠B",val:valid?`${angleB.toFixed(1)}°`:"—"},{label:"∠C",val:valid?`${angleC.toFixed(1)}°`:"—"},{label:"שטח",val:valid?area.toFixed(2):"—"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:10, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:10, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:16, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>cos A = (b²+c²−a²)/(2bc). נסו a=5,b=5,c=5 → כל זווית 60° (שווה-צלעות)!</p>
    </section>
  );
}

/* ─── QuadSplitLab (advanced) ──────────────────────────────────────────────── */

function QuadSplitLab() {
  const [bd,setBd]=useState(10); const [angABD,setAngABD]=useState(40); const [angDBC,setAngDBC]=useState(50); const [ab,setAB]=useState(7); const [bc,setBC]=useState(8);
  const st=STATION.advanced;
  const r1=angABD*Math.PI/180, r2=angDBC*Math.PI/180;
  const s1=0.5*ab*bd*Math.sin(r1);
  const s2=0.5*bc*bd*Math.sin(r2);
  const total=s1+s2;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת שטח מרובע מאלכסון</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו פרמטרים — צפו בשטחי שני המשולשים ובשטח הכולל.</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6, maxWidth:600, margin:"0 auto 2rem" }}>
        {[{label:"BD",val:bd,set:setBd,min:4,max:15},{label:"∠ABD",val:angABD,set:setAngABD,min:10,max:80},{label:"∠DBC",val:angDBC,set:setAngDBC,min:10,max:80},{label:"AB",val:ab,set:setAB,min:3,max:12},{label:"BC",val:bc,set:setBC,min:3,max:12}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:10, border:"1px solid rgba(255,255,255,0.4)", padding:"0.5rem", boxShadow:"0 2px 8px rgba(60,54,42,0.06)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"#6B7280", marginBottom:2 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={s.min} max={s.max} step={1} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"S(△ABD)",val:s1.toFixed(2)},{label:"S(△BCD)",val:s2.toFixed(2)},{label:"S(ABCD)",val:total.toFixed(2)}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:20, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>S = ½·AB·BD·sin(∠ABD) + ½·BC·BD·sin(∠DBC). כל משולש עם ½ab·sinC!</p>
    </section>
  );
}

/* ─── Tabs + FormulaBar ────────────────────────────────────────────────────── */

const TABS=[{id:"basic",label:"מתחיל",textColor:"text-green-700",border:"border-green-600",bg:"bg-green-600/10",glowColor:"rgba(22,163,74,0.3)"},{id:"medium",label:"בינוני",textColor:"text-orange-700",border:"border-orange-600",bg:"bg-orange-600/10",glowColor:"rgba(234,88,12,0.3)"},{id:"advanced",label:"מתקדם",textColor:"text-red-700",border:"border-red-700",bg:"bg-red-700/10",glowColor:"rgba(220,38,38,0.3)"}];

function FormulaBar() {
  const [activeTab,setActiveTab]=useState<"sine"|"cosine"|"area"|null>(null);
  const tabs=[{id:"sine" as const,label:"📐 סינוסים",tex:"\\frac{a}{\\sin A}=\\frac{b}{\\sin B}",color:"#16A34A",borderColor:"rgba(22,163,74,0.35)"},{id:"cosine" as const,label:"📏 קוסינוסים",tex:"a^2=b^2+c^2-2bc\\cos A",color:"#EA580C",borderColor:"rgba(234,88,12,0.35)"},{id:"area" as const,label:"📊 שטח",tex:"S=\\tfrac{1}{2}ab\\sin C",color:"#DC2626",borderColor:"rgba(220,38,38,0.35)"}];
  return (
    <div style={{ borderRadius:12, border:"1px solid rgba(60,54,42,0.15)", background:"rgba(255,255,255,0.75)", padding:"1.25rem", marginBottom:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginBottom:12, textAlign:"center" }}>נוסחאות</div>
      <div style={{ display:"flex", gap:6, marginBottom:activeTab?14:0 }}>{tabs.map(t=>{const isA=activeTab===t.id;return(<button key={t.id} onClick={()=>setActiveTab(isA?null:t.id)} style={{ flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", border:`1.5px solid ${isA?t.borderColor:"rgba(60,54,42,0.1)"}`, background:isA?`${t.color}0D`:"rgba(60,54,42,0.03)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{ fontSize:11, fontWeight:700, color:isA?t.color:"#6B7280" }}>{t.label}</span><span style={{ color:isA?t.color:"#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>);})}</div>
      {activeTab==="sine"&&(<motion.div key="s" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(22,163,74,0.25)", background:"rgba(220,252,231,0.4)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>משפט הסינוסים</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>כל צלע חלקי sin הזווית שמולה = קבוע.</li><li>שימוש: ידועה צלע + זווית שמולה + עוד נתון.</li><li>זהירות: sin B = ... יכול לתת שתי זוויות (חדה/קהה).</li></ol></div><div style={{ marginTop:10, color:"#15803d", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: a=8, ∠A=50°, ∠B=70° → b = 8·sin70°/sin50° ≈ 9.81</div></div></div></motion.div>)}
      {activeTab==="cosine"&&(<motion.div key="c" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(234,88,12,0.25)", background:"rgba(255,247,237,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"a^2 = b^2 + c^2 - 2bc\\cos A"}</DisplayMath><DisplayMath>{"\\cos A = \\frac{b^2+c^2-a^2}{2bc}"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(234,88,12,0.06)", border:"1px solid rgba(234,88,12,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>משפט הקוסינוסים</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>הכללה של פיתגורס (כש-A=90° → cos=0 → פיתגורס!).</li><li>שימוש 1: 3 צלעות → מציאת זווית.</li><li>שימוש 2: 2 צלעות + זווית כלואה → מציאת צלע.</li></ol></div><div style={{ marginTop:10, color:"#B45309", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: a=7,b=8,c=9 → cosA = (64+81−49)/(2·8·9) = 96/144 = ⅔ → A ≈ 48.2°</div></div></div></motion.div>)}
      {activeTab==="area"&&(<motion.div key="a" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(220,38,38,0.25)", background:"rgba(254,242,242,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"S = \\frac{1}{2}ab\\sin C"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>שטח משולש טריגונומטרי</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>C = הזווית הכלואה בין a ו-b.</li><li>sin C = הגובה / צלע → h = b·sinC.</li><li>שטח מרובע = סכום שטחי 2 משולשים (פירוק באלכסון).</li></ol></div><div style={{ marginTop:10, color:"#DC2626", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: a=8, b=6, C=60° → S = ½·8·6·sin60° = 24·(√3/2) ≈ 20.78</div></div></div></motion.div>)}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function LawsAreaPage5U() {
  const [selectedLevel,setSelectedLevel]=useState<"basic"|"medium"|"advanced">("basic");
  const ex=exercises.find(e=>e.id===selectedLevel)!;
  const lvlRgb=selectedLevel==="basic"?"45,90,39":selectedLevel==="medium"?"163,79,38":"139,38,53";
  return (
    <main style={{ minHeight:"100vh", background:"#F3EFE0", backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:"#2D3436", ["--lvl-rgb" as string]:lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`textarea,input[type="text"],input[type="password"]{outline:none!important}textarea:focus,input[type="text"]:focus{outline:none!important;border-color:rgba(var(--lvl-rgb),0.65)!important;box-shadow:0 0 0 3px rgba(var(--lvl-rgb),0.12)!important}input[type="range"]{outline:none!important}input[type="range"]:focus{outline:none!important}button:focus,button:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(var(--lvl-rgb),0.35)!important}button:focus:not(:focus-visible){box-shadow:none!important}`}</style>
      <div style={{ borderBottom:"1px solid rgba(60,54,42,0.15)", background:"#F3EFE0" }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div><h1 style={{ fontSize:22, fontWeight:700, color:"#2D3436", margin:0 }}>סינוסים, קוסינוסים ושטח עם AI — כיתה יא׳ (5 יח׳)</h1><p style={{ fontSize:13, color:"#6B7280", margin:"2px 0 0" }}>משפט סינוסים/קוסינוסים, ½ab·sinC, פתרון משולש שלם</p></div>
          <Link href="/5u/topic/grade11/trig" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap" }} onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D";}} onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A";}}><span style={{ fontSize:16 }}>←</span>חזרה</Link>
        </div>
      </div>
      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="5u/grade11/trig/laws-area"/>
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(60,54,42,0.15)" }}>{TABS.map(tab=>{const active=selectedLevel===tab.id;return(<button key={tab.id} onClick={()=>setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active?`${tab.bg} border ${tab.border} ${tab.textColor}`:"text-stone-500 hover:text-stone-800"}`} style={active?{boxShadow:`0 0 14px ${tab.glowColor}`}:undefined}>{tab.label}</button>);})}</div>
        <FormulaBar/>
        <motion.div key={selectedLevel} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22}}><ExerciseCard ex={ex}/></motion.div>
        {selectedLevel==="basic"&&<SineLawLab/>}
        {selectedLevel==="medium"&&<CosineLawLab/>}
        {selectedLevel==="advanced"&&<QuadSplitLab/>}
        <div style={{ marginTop:"1.5rem" }}><MarkComplete subtopicId="5u/grade11/trig/laws-area" level={selectedLevel}/></div>
      </div>
    </main>
  );
}
