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
      <circle cx={90} cy={65} r={45} fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.5} />
      <circle cx={170} cy={65} r={45} fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.5} />
      <text x={65} y={70} fontSize={16} fill="#16A34A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>A</text>
      <text x={195} y={70} fontSize={16} fill="#16A34A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>B</text>
      <text x={130} y={70} fontSize={14} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?</text>
      <text x={130} y={125} fontSize={10} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">P(A∩B) = ?</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 260 140" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Two separate circles — independent events */}
      <circle cx={80} cy={70} r={40} fill="none" stroke="#EA580C" strokeWidth={2} opacity={0.6} />
      <circle cx={190} cy={70} r={40} fill="none" stroke="#EA580C" strokeWidth={2} opacity={0.6} />
      <text x={80} y={75} fontSize={14} fill="#EA580C" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>A</text>
      <text x={190} y={75} fontSize={14} fill="#EA580C" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>B</text>
      {/* Multiplication sign */}
      <text x={135} y={75} fontSize={18} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">×</text>
      <text x={135} y={130} fontSize={10} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">P(A∩B) = P(A)·P(B)?</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 260 150" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Tree diagram hint */}
      <circle cx={50} cy={75} r={6} fill="#DC2626" opacity={0.6} />
      <line x1={56} y1={70} x2={120} y2={35} stroke="#DC2626" strokeWidth={1.5} opacity={0.5} />
      <line x1={56} y1={80} x2={120} y2={115} stroke="#DC2626" strokeWidth={1.5} opacity={0.5} />
      <circle cx={120} cy={35} r={5} fill="#a78bfa" opacity={0.6} />
      <circle cx={120} cy={115} r={5} fill="#a78bfa" opacity={0.6} />
      <line x1={125} y1={30} x2={190} y2={15} stroke="#a78bfa" strokeWidth={1.2} opacity={0.4} />
      <line x1={125} y1={40} x2={190} y2={55} stroke="#a78bfa" strokeWidth={1.2} opacity={0.4} />
      <line x1={125} y1={110} x2={190} y2={95} stroke="#a78bfa" strokeWidth={1.2} opacity={0.4} />
      <line x1={125} y1={120} x2={190} y2={135} stroke="#a78bfa" strokeWidth={1.2} opacity={0.4} />
      {/* End nodes */}
      {[15,55,95,135].map(y=>(<circle key={y} cx={190} cy={y} r={4} fill="#f59e0b" opacity={0.5}/>))}
      <text x={220} y={75} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">P = ?</text>
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
function LadderAdvanced({ steps }: { steps:PromptStep[] }) { const [masterPassed,setMasterPassed]=useState(false); const [unlockedCount,setUnlockedCount]=useState(1); const allPassed=masterPassed&&unlockedCount>steps.length; return (<div><MasterPromptGate onPass={()=>setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["הסתברות","עצמאות","מכפלה","עץ","מרחב מדגם","אירוע","P(A∩B)"]}/>{steps.map((s,i)=>(<div key={i} style={{ marginBottom:8 }}>{(!masterPassed||i>=unlockedCount)?(<div style={{ borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", background:"rgba(255,255,255,0.7)", padding:"14px 16px", opacity:0.5, pointerEvents:"none" as const, display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ color:"#6B7280", fontSize:13, fontWeight:600 }}>{s.phase} — {s.label}</span><span style={{ fontSize:16 }}>🔒</span></div>):(<div><div style={{ borderRadius:14, border:"1px solid rgba(22,163,74,0.3)", background:"rgba(255,255,255,0.9)", padding:"14px 16px", marginBottom:8 }}><div style={{ color:"#15803d", fontSize:13, fontWeight:700, marginBottom:6 }}>{s.phase} — {s.label}</div><div style={{ color:"#334155", fontSize:13, lineHeight:1.6 }}>{s.prompt}</div></div><button onClick={()=>setUnlockedCount(v=>Math.max(v,i+2))} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}{allPassed&&(<div style={{ borderRadius:16, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:"1.25rem 1.5rem", marginTop:16, textAlign:"center" }}><div style={{ fontSize:28, marginBottom:8 }}>🏆</div><div style={{ color:"#14532d", fontWeight:800, fontSize:16, marginBottom:4 }}>כל הכבוד!</div><div style={{ color:"#166534", fontSize:13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}</div>); }

/* ─── Exercise Data ────────────────────────────────────────────────────────── */

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "מרחב מדגם, חיתוך ואיחוד",
    problem: "מטילים מטבע הוגן פעמיים.\n\nא. רשמו את מרחב המדגם.\nב. A = \"לפחות עץ אחד\". רשמו את A וחשבו P(A).\nג. B = \"שתי התוצאות זהות\". חשבו P(A∩B) ו-P(A∪B).",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ שכחה שסדר חשוב", text: "(עץ, פלי) ≠ (פלי, עץ) — אלו תוצאות שונות. מרחב המדגם של 2 מטבעות = 4 תוצאות, לא 3." },
      { title: "⚠️ בלבול בנוסחת איחוד", text: "P(A∪B) = P(A)+P(B)−P(A∩B). שכחת החיסור גורמת לספירה כפולה של תוצאות בחיתוך." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יא', 5 יחידות, ומצרף/ת שאלה בהסתברות בסיסית — מרחב מדגם, חיתוך ואיחוד. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"מרחב מדגם", coaching:"", prompt:"מטילים מטבע פעמיים. תנחה אותי — כמה תוצאות יש ומה מרחב המדגם Ω.", keywords:[], keywordHint:"", contextWords:["מרחב","מדגם","תוצאות","מטבע","עץ","פלי"] },
      { phase:"סעיף ב׳", label:"אירוע A והסתברותו", coaching:"", prompt:"A = 'לפחות עץ אחד'. תכווין אותי — אילו תוצאות שייכות ל-A ומה P(A).", keywords:[], keywordHint:"", contextWords:["אירוע","לפחות","עץ","תוצאות","הסתברות","P(A)"] },
      { phase:"סעיף ג׳", label:"חיתוך ואיחוד", coaching:"", prompt:"B = 'שתי תוצאות זהות'. תדריך אותי לחשב P(A∩B) ו-P(A∪B) — מה הנוסחה.", keywords:[], keywordHint:"", contextWords:["חיתוך","איחוד","נוסחה","P(A∩B)","P(A∪B)","חיסור"] },
    ],
  },
  {
    id: "medium",
    title: "אירועים בלתי תלויים",
    problem: "P(A) = 0.4, P(B) = 0.5, A ו-B בלתי תלויים.\n\nא. חשבו P(A∩B).\nב. חשבו P(A∪B).\nג. האם A ו-B' (המשלים של B) בלתי תלויים? הוכיחו.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ עצמאות ≠ זרים", text: "אירועים בלתי תלויים: P(A∩B)=P(A)·P(B). זרים: P(A∩B)=0. שני מושגים שונים לגמרי! אירועים זרים (שלא ריקים) אף פעם לא בלתי תלויים." },
      { title: "⚠️ עצמאות עוברת למשלים", text: "אם A ו-B בלתי תלויים, אז גם A ו-B' בלתי תלויים. ההוכחה: P(A∩B') = P(A) − P(A∩B) = P(A) − P(A)P(B) = P(A)(1−P(B)) = P(A)·P(B')." },
    ],
    goldenPrompt: `אני בכיתה יא', 5 יחידות, מצרף/ת תרגיל על אירועים בלתי תלויים — מכפלה, איחוד ומשלים.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על הגדרת עצמאות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"חיתוך מעצמאות", coaching:"", prompt:"P(A)=0.4, P(B)=0.5, בלתי תלויים. תנחה אותי — מה הגדרת עצמאות ואיך מוצאים P(A∩B).", keywords:[], keywordHint:"", contextWords:["עצמאות","מכפלה","P(A∩B)","בלתי תלויים","הגדרה","חישוב"] },
      { phase:"סעיף ב׳", label:"איחוד", coaching:"", prompt:"P(A)=0.4, P(B)=0.5, P(A∩B)=0.2. תכווין אותי לחשב P(A∪B) בנוסחת האיחוד.", keywords:[], keywordHint:"", contextWords:["איחוד","נוסחה","חיבור","חיסור","P(A∪B)","חישוב"] },
      { phase:"סעיף ג׳", label:"משלים ועצמאות", coaching:"", prompt:"A ו-B בלתי תלויים. תדריך אותי להוכיח ש-A ו-B' גם בלתי תלויים — P(A∩B') = P(A)·P(B').", keywords:[], keywordHint:"", contextWords:["משלים","עצמאות","הוכחה","B'","P(A∩B')","1−P(B)"] },
    ],
  },
  {
    id: "advanced",
    title: "שילוב — עץ הסתברות ועצמאות",
    problem: "בקופסה כדורים אדומים וכחולים. שולפים כדור, מחזירים, ושולפים שוב.\nP(אדום) = p.\n\nא. בנו עץ הסתברות לשתי שליפות.\nב. חשבו את ההסתברות ששני הכדורים באותו צבע.\nג. עבור איזה ערך p ההסתברות בסעיף ב' מינימלית?\nד. האם שתי השליפות בלתי תלויות? הסבירו.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ עם החזרה = עצמאות", text: "כשמחזירים את הכדור, ההסתברויות לא משתנות בשליפה השנייה → השליפות בלתי תלויות. ללא החזרה — ההסתברויות משתנות (תלויות)." },
      { title: "⚠️ 'באותו צבע' = סכום שני מסלולים", text: "P(אותו צבע) = P(אדום,אדום) + P(כחול,כחול) = p² + (1−p)². תלמידים שוכחים את המסלול הכחול-כחול ומחשבים רק p²." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: למה שליפה עם החזרה יוצרת אירועים בלתי תלויים, ואיך בונים עץ הסתברות? (לפחות 80 תווים)",
    steps: [
      { phase:"סעיף א׳", label:"עץ הסתברות", coaching:"", prompt:"שולפים כדור, מחזירים, שולפים שוב. P(אדום)=p. תנחה אותי לבנות עץ הסתברות עם 2 רמות.", keywords:[], keywordHint:"", contextWords:["עץ","הסתברות","ענף","שליפה","החזרה","רמה"] },
      { phase:"סעיף ב׳", label:"אותו צבע", coaching:"", prompt:"תכווין אותי — P(אותו צבע) = P(אד,אד) + P(כח,כח). איך מחשבים כל מסלול.", keywords:[], keywordHint:"", contextWords:["מסלול","אותו","צבע","מכפלה","סכום","p²"] },
      { phase:"סעיף ג׳", label:"מינימום", coaching:"", prompt:"P = p²+(1−p)² = 2p²−2p+1. תדריך אותי — מתי ביטוי ריבועי מינימלי (נגזרת=0 או קודקוד).", keywords:[], keywordHint:"", contextWords:["מינימום","קודקוד","נגזרת","p","ריבועי","ערך"] },
      { phase:"סעיף ד׳", label:"עצמאות", coaching:"", prompt:"תנחה אותי להסביר — למה עם החזרה השליפות בלתי תלויות, ומה היה קורה בלי החזרה.", keywords:[], keywordHint:"", contextWords:["עצמאות","החזרה","תלויות","השפעה","שליפה","הגדרה"] },
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
        <div style={{ textAlign:"center", marginBottom:14 }}><div style={{ color:s.accentColor, fontSize:15, fontWeight:800, marginBottom:4 }}>🎲 הסתברות ועצמאות (5 יח׳)</div><div style={{ color:"#6B7280", fontSize:12, lineHeight:1.55 }}>{ex.id==="basic"&&"מרחב מדגם, חיתוך ואיחוד."}{ex.id==="medium"&&"אירועים בלתי תלויים — P(A∩B)=P(A)·P(B)."}{ex.id==="advanced"&&"עץ הסתברות, עצמאות ובעיית אופטימיזציה."}</div></div>
        <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:14 }}/>
        <div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>🎯 נוסחאות</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:160 }}>P(A∪B)=P(A)+P(B)−P(A∩B)</span><span>איחוד</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:160 }}>P(Ā) = 1−P(A)</span><span>משלים</span></div></div></div>
        {ex.id!=="basic"&&(<><div style={{ height:1, background:"rgba(60,54,42,0.08)", marginBottom:12 }}/><div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>✨ עצמאות</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:180 }}>בלתי תלויים: P(A∩B)=P(A)·P(B)</span><span>הגדרה</span></div>{ex.id==="advanced"&&<div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:180 }}>עץ: P(מסלול)=מכפלת ענפים</span><span>כלל מכפלה</span></div>}</div></div></>)}
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

/* ─── IndependenceLab (basic) ──────────────────────────────────────────────── */

function IndependenceLab() {
  const [pA,setPa]=useState(0.4); const [pB,setPb]=useState(0.5);
  const st=STATION.basic;
  const pAB=pA*pB; const pAuB=pA+pB-pAB; const pCompA=1-pA;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת עצמאות</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו P(A) ו-P(B) (בלתי תלויים) — צפו בחיתוך ובאיחוד.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 2rem" }}>
        {[{label:"P(A)",val:pA,set:setPa},{label:"P(B)",val:pB,set:setPb}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val.toFixed(2)}</span></div><input type="range" min={0} max={1} step={0.05} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
        {[{label:"P(A∩B)",val:(pAB*100).toFixed(1)+"%"},{label:"P(A∪B)",val:(pAuB*100).toFixed(1)+"%"},{label:"P(Ā)",val:(pCompA*100).toFixed(1)+"%"},{label:"P(A)·P(B)",val:(pAB*100).toFixed(1)+"%"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:10, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:10, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:16, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>P(A∩B) = P(A)·P(B) תמיד (כי בלתי תלויים). מה קורה ל-P(A∪B) כש-P(A)+P(B)&gt;1?</p>
    </section>
  );
}

/* ─── TreeLab (medium) ─────────────────────────────────────────────────────── */

function TreeLab() {
  const [p,setP]=useState(0.6);
  const st=STATION.medium;
  const q=1-p;
  const pSame=p*p+q*q; const pDiff=2*p*q;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת עץ הסתברות</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו P(אדום) — צפו בהסתברויות המסלולים בעץ.</p>
      <div style={{ maxWidth:400, margin:"0 auto 2rem" }}><div style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>P(אדום) = p</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{p.toFixed(2)}</span></div><input type="range" min={0} max={1} step={0.05} value={p} onChange={e=>setP(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div></div>
      {/* Tree visualization */}
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:4, textAlign:"center", fontSize:12 }}>
          <div style={{ gridColumn:"span 4", color:"#6B7280", fontSize:11, marginBottom:8 }}>שליפה 1 → שליפה 2 → מסלול</div>
          {[
            {path:"אד→אד",prob:p*p,color:"#DC2626"},
            {path:"אד→כח",prob:p*q,color:"#EA580C"},
            {path:"כח→אד",prob:q*p,color:"#EA580C"},
            {path:"כח→כח",prob:q*q,color:"#3b82f6"},
          ].map(m=>(<div key={m.path} style={{ borderRadius:10, background:"rgba(255,255,255,0.6)", border:"1px solid rgba(60,54,42,0.1)", padding:"8px 4px" }}><div style={{ color:m.color, fontWeight:700, fontSize:11, marginBottom:4 }}>{m.path}</div><div style={{ color:"#2D3436", fontFamily:"monospace", fontWeight:800, fontSize:15 }}>{(m.prob*100).toFixed(1)}%</div></div>))}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"P(אותו צבע)",val:(pSame*100).toFixed(1)+"%"},{label:"P(שונה)",val:(pDiff*100).toFixed(1)+"%"},{label:"p=0.5→min",val:p===0.5?"✅ מינימלי!":"→ p=0.5"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:16, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>P(אותו צבע) = p²+(1−p)². מינימלי ב-p=0.5 (50%!) → P=0.5.</p>
    </section>
  );
}

/* ─── OptimalPLab (advanced) ───────────────────────────────────────────────── */

function OptimalPLab() {
  const [n,setN]=useState(3);
  const st=STATION.advanced;
  // P(all same color in n draws with replacement) = p^n + (1-p)^n
  // minimum at p=0.5
  const fAtHalf=2*Math.pow(0.5,n);
  const pts:string[]=[];
  const ox=40,oy=140,scX=180,scY=120;
  for(let p=0;p<=1;p+=0.02){
    const y=Math.pow(p,n)+Math.pow(1-p,n);
    pts.push(`${ox+p*scX},${oy-y*scY}`);
  }
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת מינימום — כמה שליפות?</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>P(כולם אותו צבע) = pⁿ+(1−p)ⁿ. שנו n — צפו בגרף ובמינימום.</p>
      <div style={{ maxWidth:400, margin:"0 auto 2rem" }}><div style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>n (מספר שליפות)</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{n}</span></div><input type="range" min={2} max={8} step={1} value={n} onChange={e=>setN(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div></div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 260 170" className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={ox} y1={oy} x2={ox+scX} y2={oy} stroke="#94a3b8" strokeWidth={1}/><line x1={ox} y1={oy-scY} x2={ox} y2={oy} stroke="#94a3b8" strokeWidth={1}/>
          <text x={ox-4} y={oy+14} fontSize={9} fill="#64748b" fontFamily="monospace">0</text><text x={ox+scX} y={oy+14} fontSize={9} fill="#64748b" fontFamily="monospace">1</text>
          <text x={ox+scX/2} y={oy+14} fontSize={9} fill="#f59e0b" fontFamily="monospace" textAnchor="middle">p=0.5</text>
          {pts.length>1&&<polyline points={pts.join(" ")} fill="none" stroke={st.accentColor} strokeWidth={2.5}/>}
          {/* Min point */}
          <circle cx={ox+0.5*scX} cy={oy-fAtHalf*scY} r={5} fill="#f59e0b"/>
          <text x={ox+0.5*scX+8} y={oy-fAtHalf*scY-6} fontSize={9} fill="#f59e0b" fontFamily="monospace">min={fAtHalf.toFixed(3)}</text>
          <line x1={ox+0.5*scX} y1={oy} x2={ox+0.5*scX} y2={oy-fAtHalf*scY} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2"/>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"n",val:String(n)},{label:"min ב-p=0.5",val:fAtHalf.toFixed(4)},{label:"2·(½)ⁿ",val:`2·${(1/Math.pow(2,n)).toFixed(4)}`}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:18, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>המינימום תמיד ב-p=0.5, וככל ש-n גדל — ההסתברות קטנה. ב-n=8 → min≈0.008!</p>
    </section>
  );
}

/* ─── Tabs + FormulaBar ────────────────────────────────────────────────────── */

const TABS=[{id:"basic",label:"מתחיל",textColor:"text-green-700",border:"border-green-600",bg:"bg-green-600/10",glowColor:"rgba(22,163,74,0.3)"},{id:"medium",label:"בינוני",textColor:"text-orange-700",border:"border-orange-600",bg:"bg-orange-600/10",glowColor:"rgba(234,88,12,0.3)"},{id:"advanced",label:"מתקדם",textColor:"text-red-700",border:"border-red-700",bg:"bg-red-700/10",glowColor:"rgba(220,38,38,0.3)"}];

function FormulaBar() {
  const [activeTab,setActiveTab]=useState<"basic-prob"|"independence"|"tree"|null>(null);
  const tabs=[{id:"basic-prob" as const,label:"🎲 יסודות",tex:"P(A \\cup B)",color:"#16A34A",borderColor:"rgba(22,163,74,0.35)"},{id:"independence" as const,label:"⊥ עצמאות",tex:"P(A{\\cap}B)=P(A){\\cdot}P(B)",color:"#EA580C",borderColor:"rgba(234,88,12,0.35)"},{id:"tree" as const,label:"🌳 עץ",tex:"P = \\prod p_i",color:"#DC2626",borderColor:"rgba(220,38,38,0.35)"}];
  return (
    <div style={{ borderRadius:12, border:"1px solid rgba(60,54,42,0.15)", background:"rgba(255,255,255,0.75)", padding:"1.25rem", marginBottom:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginBottom:12, textAlign:"center" }}>נוסחאות</div>
      <div style={{ display:"flex", gap:6, marginBottom:activeTab?14:0 }}>{tabs.map(t=>{const isA=activeTab===t.id;return(<button key={t.id} onClick={()=>setActiveTab(isA?null:t.id)} style={{ flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", border:`1.5px solid ${isA?t.borderColor:"rgba(60,54,42,0.1)"}`, background:isA?`${t.color}0D`:"rgba(60,54,42,0.03)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{ fontSize:11, fontWeight:700, color:isA?t.color:"#6B7280" }}>{t.label}</span><span style={{ color:isA?t.color:"#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>);})}</div>
      {activeTab==="basic-prob"&&(<motion.div key="b" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(22,163,74,0.25)", background:"rgba(220,252,231,0.4)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"P(A \\cup B) = P(A) + P(B) - P(A \\cap B)"}</DisplayMath><DisplayMath>{"P(\\bar{A}) = 1 - P(A)"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>יסודות הסתברות</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>P(A) = |A|/|Ω| (הסתברות קלאסית).</li><li>0 ≤ P(A) ≤ 1 תמיד.</li><li>P(Ω) = 1, P(∅) = 0.</li></ol></div></div></div></motion.div>)}
      {activeTab==="independence"&&(<motion.div key="i" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(234,88,12,0.25)", background:"rgba(255,247,237,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"A,B \\text{ independent} \\iff P(A \\cap B) = P(A) \\cdot P(B)"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(234,88,12,0.06)", border:"1px solid rgba(234,88,12,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>אירועים בלתי תלויים</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>הגדרה:</strong> P(A∩B) = P(A)·P(B).</li><li>עצמאות ≠ זרים! (זרים: P(A∩B)=0).</li><li>אם A,B בלתי תלויים → גם A,B' בלתי תלויים.</li><li>עם החזרה → עצמאות. ללא החזרה → תלות.</li></ol></div><div style={{ marginTop:10, color:"#B45309", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 בדיקה: חשבו P(A∩B) ובדקו אם = P(A)·P(B).</div></div></div></motion.div>)}
      {activeTab==="tree"&&(<motion.div key="t" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(220,38,38,0.25)", background:"rgba(254,242,242,0.95)", padding:16 }}><div style={{ borderRadius:10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>עץ הסתברות</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>כל רמה = ניסוי אחד.</li><li>P(מסלול) = מכפלת ההסתברויות על הענפים.</li><li>P(אירוע) = סכום המסלולים המתאימים.</li><li>סכום הענפים מכל צומת = 1.</li></ol></div><div style={{ marginTop:10, color:"#DC2626", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: P(אד,אד) = p·p = p². P(אותו צבע) = p²+(1−p)².</div></div></div></motion.div>)}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function BasicProbPage5U() {
  const [selectedLevel,setSelectedLevel]=useState<"basic"|"medium"|"advanced">("basic");
  const ex=exercises.find(e=>e.id===selectedLevel)!;
  const lvlRgb=selectedLevel==="basic"?"45,90,39":selectedLevel==="medium"?"163,79,38":"139,38,53";
  return (
    <main style={{ minHeight:"100vh", background:"#F3EFE0", backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:"#2D3436", ["--lvl-rgb" as string]:lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`textarea,input[type="text"],input[type="password"]{outline:none!important}textarea:focus,input[type="text"]:focus{outline:none!important;border-color:rgba(var(--lvl-rgb),0.65)!important;box-shadow:0 0 0 3px rgba(var(--lvl-rgb),0.12)!important}input[type="range"]{outline:none!important}input[type="range"]:focus{outline:none!important}button:focus,button:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(var(--lvl-rgb),0.35)!important}button:focus:not(:focus-visible){box-shadow:none!important}`}</style>
      <div style={{ borderBottom:"1px solid rgba(60,54,42,0.15)", background:"#F3EFE0" }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div><h1 style={{ fontSize:22, fontWeight:700, color:"#2D3436", margin:0 }}>הסתברות ועצמאות עם AI — כיתה יא׳ (5 יח׳)</h1><p style={{ fontSize:13, color:"#6B7280", margin:"2px 0 0" }}>מרחב מדגם, אירועים, עצמאות, עץ הסתברות</p></div>
          <Link href="/5u/topic/grade11/probability" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap" }} onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D";}} onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A";}}><span style={{ fontSize:16 }}>←</span>חזרה</Link>
        </div>
      </div>
      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="5u/grade11/probability/basic"/>
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(60,54,42,0.15)" }}>{TABS.map(tab=>{const active=selectedLevel===tab.id;return(<button key={tab.id} onClick={()=>setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active?`${tab.bg} border ${tab.border} ${tab.textColor}`:"text-stone-500 hover:text-stone-800"}`} style={active?{boxShadow:`0 0 14px ${tab.glowColor}`}:undefined}>{tab.label}</button>);})}</div>
        <FormulaBar/>
        <motion.div key={selectedLevel} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22}}><ExerciseCard ex={ex}/></motion.div>
        {selectedLevel==="basic"&&<IndependenceLab/>}
        {selectedLevel==="medium"&&<TreeLab/>}
        {selectedLevel==="advanced"&&<OptimalPLab/>}
        <div style={{ marginTop:"1.5rem" }}><MarkComplete subtopicId="5u/grade11/probability/basic" level={selectedLevel}/></div>
      </div>
    </main>
  );
}
