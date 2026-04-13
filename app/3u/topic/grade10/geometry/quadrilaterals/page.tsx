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
  // Parallelogram ABCD
  return (
    <svg viewBox="0 0 260 160" className="w-full max-w-sm mx-auto" aria-hidden>
      <polygon points="60,130 200,130 230,40 90,40" fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.7} />
      {/* Equal-side marks on AB and DC */}
      <line x1={126} y1={133} x2={134} y2={127} stroke="#16A34A" strokeWidth={1.5} />
      <line x1={156} y1={43} x2={164} y2={37} stroke="#16A34A" strokeWidth={1.5} />
      {/* Equal-side marks on AD and BC */}
      <line x1={72} y1={88} x2={78} y2={82} stroke="#a78bfa" strokeWidth={1.5} />
      <line x1={70} y1={84} x2={76} y2={78} stroke="#a78bfa" strokeWidth={1.5} />
      <line x1={212} y1={88} x2={218} y2={82} stroke="#a78bfa" strokeWidth={1.5} />
      <line x1={210} y1={84} x2={216} y2={78} stroke="#a78bfa" strokeWidth={1.5} />
      {/* Vertex labels */}
      <text x={48} y={140} fontSize={14} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={204} y={140} fontSize={14} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={234} y={36} fontSize={14} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">C</text>
      <text x={78} y={36} fontSize={14} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">D</text>
      {/* Angle arc at A */}
      <path d="M80,130 A20,20 0 0,0 72,115" fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      <text x={82} y={118} fontSize={10} fill="#f59e0b" fontFamily="sans-serif">?</text>
    </svg>
  );
}

function MediumSVG() {
  // Trapezoid
  return (
    <svg viewBox="0 0 260 170" className="w-full max-w-sm mx-auto" aria-hidden>
      <polygon points="50,140 220,140 190,40 100,40" fill="none" stroke="#EA580C" strokeWidth={2} opacity={0.7} />
      {/* Height dashed */}
      <line x1={100} y1={40} x2={100} y2={140} stroke="#64748b" strokeWidth={1.2} strokeDasharray="4,3" />
      <polyline points="88,140 88,128 100,128" fill="none" stroke="#64748b" strokeWidth={1} />
      {/* Parallel marks */}
      <line x1={130} y1={144} x2={140} y2={144} stroke="#EA580C" strokeWidth={2} />
      <line x1={133} y1={148} x2={143} y2={148} stroke="#EA580C" strokeWidth={2} />
      <line x1={140} y1={36} x2={150} y2={36} stroke="#EA580C" strokeWidth={2} />
      <line x1={143} y1={32} x2={153} y2={32} stroke="#EA580C" strokeWidth={2} />
      {/* Vertex labels */}
      <text x={36} y={150} fontSize={14} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={224} y={150} fontSize={14} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={194} y={36} fontSize={14} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">C</text>
      <text x={86} y={36} fontSize={14} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">D</text>
      <text x={104} y={160} fontSize={10} fill="#64748b" fontFamily="sans-serif">h</text>
    </svg>
  );
}

function AdvancedSVG() {
  // Rhombus with diagonals
  return (
    <svg viewBox="0 0 260 180" className="w-full max-w-sm mx-auto" aria-hidden>
      <polygon points="130,20 230,90 130,160 30,90" fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.6} />
      {/* Diagonals */}
      <line x1={130} y1={20} x2={130} y2={160} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
      <line x1={30} y1={90} x2={230} y2={90} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4,3" />
      {/* Right angle at center */}
      <rect x={130} y={78} width={12} height={12} fill="none" stroke="#64748b" strokeWidth={1} />
      {/* Equal-side marks */}
      {[[130,20,230,90],[230,90,130,160],[130,160,30,90],[30,90,130,20]].map(([x1,y1,x2,y2],i)=>{const mx=(x1+x2)/2,my=(y1+y2)/2;return <line key={i} x1={mx-4} y1={my-4} x2={mx+4} y2={my+4} stroke="#DC2626" strokeWidth={1.5}/>;})}
      {/* Center label */}
      <text x={142} y={95} fontSize={10} fill="#34d399" fontFamily="sans-serif">O</text>
      {/* Vertex labels */}
      <text x={130} y={14} fontSize={13} fill="#DC2626" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">A</text>
      <text x={240} y={94} fontSize={13} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={130} y={176} fontSize={13} fill="#DC2626" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">C</text>
      <text x={14} y={94} fontSize={13} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">D</text>
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

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps:PromptStep[]; goldenPrompt:string; glowRgb:string; borderRgb:string }) { const [completed,setCompleted]=useState<boolean[]>(Array(steps.length).fill(false)); const unlocked=completed.filter(Boolean).length+1; const markDone=(i:number)=>{setCompleted(p=>{const n=[...p];n[i]=true;return n;});const el=document.getElementById(`basic-step-${i+1}`);if(el) setTimeout(()=>el.scrollIntoView({behavior:"smooth",block:"center"}),200);}; return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb}/>{steps.map((s,i)=>(<div key={i} id={`basic-step-${i}`}>{i<unlocked?(<><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb}/>{!completed[i]?(<button onClick={()=>markDone(i)} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button>):(<div style={{ textAlign:"center", padding:"6px 0", marginBottom:10, fontSize:12, color:"#16a34a", fontWeight:600 }}>✅ הושלם</div>)}</>):(<div style={{ opacity:0.35, pointerEvents:"none", position:"relative" }}><div style={{ position:"absolute", top:8, right:8, fontSize:16, zIndex:2 }}>🔒</div><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb}/></div>)}</div>))}</div>); }

function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb }: { steps:PromptStep[]; goldenPrompt:string; glowRgb:string; borderRgb:string }) { const [passed,setPassed]=useState<boolean[]>(Array(steps.length).fill(false)); return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb}/>{steps.map((s,i)=>(<TutorStepMedium key={i} step={s} locked={i>0&&!passed[i-1]} onPass={()=>setPassed(p=>{const n=[...p];n[i]=true;return n;})} borderRgb={borderRgb}/>))}</div>); }

function LadderAdvanced({ steps }: { steps:PromptStep[] }) {
  const [masterPassed,setMasterPassed]=useState(false); const [unlockedCount,setUnlockedCount]=useState(1); const allPassed=masterPassed&&unlockedCount>steps.length;
  return (
    <div>
      <MasterPromptGate onPass={()=>setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["מעוין","אלכסון","שטח","זווית","צלע","חיתוך","מרובע"]}/>
      {steps.map((s,i)=>(<div key={i} style={{ marginBottom:8 }}>{(!masterPassed||i>=unlockedCount)?(<div style={{ borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", background:"rgba(255,255,255,0.7)", padding:"14px 16px", opacity:0.5, pointerEvents:"none" as const, display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ color:"#6B7280", fontSize:13, fontWeight:600 }}>{s.phase} — {s.label}</span><span style={{ fontSize:16 }}>🔒</span></div>):(<div><div style={{ borderRadius:14, border:"1px solid rgba(22,163,74,0.3)", background:"rgba(255,255,255,0.9)", padding:"14px 16px", marginBottom:8 }}><div style={{ color:"#15803d", fontSize:13, fontWeight:700, marginBottom:6 }}>{s.phase} — {s.label}</div><div style={{ color:"#334155", fontSize:13, lineHeight:1.6 }}>{s.prompt}</div></div><button onClick={()=>setUnlockedCount(v=>Math.max(v,i+2))} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}
      {allPassed&&(<div style={{ borderRadius:16, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:"1.25rem 1.5rem", marginTop:16, textAlign:"center" }}><div style={{ fontSize:28, marginBottom:8 }}>🏆</div><div style={{ color:"#14532d", fontWeight:800, fontSize:16, marginBottom:4 }}>כל הכבוד — השלמת את הרמה המתקדמת!</div><div style={{ color:"#166534", fontSize:13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}
    </div>
  );
}

/* ─── Exercise Data ────────────────────────────────────────────────────────── */

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "מקבילית — תכונות, זוויות ושטח",
    problem: "נתונה מקבילית ABCD.\n\nא. אם זווית A ידועה, מצאו את שאר הזוויות. הסבירו למה זוויות נגדיות שוות וזוויות סמוכות משלימות ל-180°.\nב. אם הבסיס AB ידוע והגובה לצלע AB ידוע, חשבו את שטח המקבילית.\nג. הסבירו מדוע אלכסוני המקבילית חוצים זה את זה.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בין זוויות נגדיות לסמוכות", text: "במקבילית: זוויות נגדיות שוות (A=C, B=D). זוויות סמוכות משלימות ל-180° (A+B=180°). תלמידים מחליפים ביניהן ומקבלים זוויות שגויות." },
      { title: "⚠️ שימוש בצלע במקום גובה לשטח", text: "שטח מקבילית = בסיס × גובה (לא בסיס × צלע!). הגובה הוא המרחק האנכי בין שתי הבסיסים, ולא אורך הצלע הצידית." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י' ומצרף/ת שאלה על מקבילית — תכונות, זוויות ושטח. אני רוצה שתהיה המורה הפרטי שלי — תסביר לי את הלוגיקה ולא תיתן תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"זוויות במקבילית", coaching:"", prompt:"במקבילית ABCD, זווית A ידועה. תנחה אותי למצוא את שאר הזוויות — מה הכלל לזוויות נגדיות ולזוויות סמוכות.", keywords:[], keywordHint:"", contextWords:["זווית","נגדיות","סמוכות","180","שוות","מקבילית"] },
      { phase:"סעיף ב׳", label:"שטח מקבילית", coaching:"", prompt:"הבסיס AB והגובה ל-AB ידועים. תכווין אותי — מהי נוסחת שטח מקבילית ואיך מציבים.", keywords:[], keywordHint:"", contextWords:["שטח","בסיס","גובה","מקבילית","נוסחה","כפל"] },
      { phase:"סעיף ג׳", label:"אלכסונים חוצים זה את זה", coaching:"", prompt:"תדריך אותי — למה אלכסוני מקבילית חוצים זה את זה, ומה התכונה של נקודת החיתוך.", keywords:[], keywordHint:"", contextWords:["אלכסון","חוצה","חיתוך","אמצע","מקבילית","תכונה"] },
    ],
  },
  {
    id: "medium",
    title: "טרפז — שטח והיקף",
    problem: "נתון טרפז ABCD כאשר AB ∥ DC (AB הבסיס הגדול, DC הבסיס הקטן).\n\nא. כתבו את נוסחת שטח הטרפז והסבירו מהו הגובה.\nב. אם הטרפז שווה-שוקיים, מהן התכונות המיוחדות שלו?\nג. חשבו את שטח הטרפז כאשר ידועים שני הבסיסים והגובה.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ שכחת חלקי 2 בנוסחת שטח טרפז", text: "שטח טרפז = ½ × (בסיס₁ + בסיס₂) × גובה. תלמידים שוכחים לחלק ב-2 ומקבלים שטח כפול מהנכון. הנוסחה דורשת ממוצע של שני הבסיסים." },
      { title: "⚠️ בלבול בזיהוי הגובה", text: "הגובה הוא המרחק האנכי בין שני הבסיסים המקבילים — לא אורך הצלע הצידית. בטרפז ישר-זווית הצלע היא הגובה, אבל בטרפז כללי — לא." },
    ],
    goldenPrompt: `אני בכיתה י', ומצרף/ת תרגיל על טרפז — נוסחת שטח, תכונות טרפז שווה-שוקיים וחישוב.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על הנוסחה וזיהוי הנתונים.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"נוסחת שטח טרפז", coaching:"", prompt:"טרפז ABCD עם AB∥DC. תנחה אותי — מהי נוסחת שטח הטרפז, מהו הגובה ולמה מחברים שני בסיסים.", keywords:[], keywordHint:"", contextWords:["שטח","טרפז","בסיס","גובה","נוסחה","חצי"] },
      { phase:"סעיף ב׳", label:"טרפז שווה-שוקיים", coaching:"", prompt:"הטרפז שווה-שוקיים. תכווין אותי — מה התכונות המיוחדות שלו (אלכסונים, זוויות, צלעות).", keywords:[], keywordHint:"", contextWords:["שווה שוקיים","אלכסונים","שווים","זוויות","בסיס","סימטריה"] },
      { phase:"סעיף ג׳", label:"חישוב שטח", coaching:"", prompt:"ידועים שני הבסיסים והגובה של הטרפז. תדריך אותי לחשב את השטח — איך מציבים בנוסחה.", keywords:[], keywordHint:"", contextWords:["שטח","הצבה","חישוב","בסיס","גובה","תוצאה"] },
    ],
  },
  {
    id: "advanced",
    title: "מעוין — אלכסונים, שטח וזוויות",
    problem: "נתון מעוין ABCD. האלכסונים AC ו-BD נחתכים ב-O.\n\nא. הוכיחו שאלכסוני המעוין מאונכים זה לזה.\nב. אם אלכסון אחד ואחת מזוויות המעוין ידועים, הסבירו כיצד למצוא את האלכסון השני.\nג. חשבו את שטח המעוין בעזרת האלכסונים.\nד. הסבירו למה מלבן הוא מקרה פרטי של מקבילית, ומעוין הוא מקרה פרטי אחר.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ שכחת שאלכסוני מעוין מאונכים", text: "במעוין, האלכסונים חוצים זה את זה בזווית ישרה (90°). תלמידים שוכחים תכונה זו ומנסים חישובים מסובכים כשאפשר פשוט להשתמש בפיתגורס על חצי-אלכסון." },
      { title: "⚠️ בלבול בנוסחת שטח מעוין", text: "שטח מעוין = ½ × d₁ × d₂ (חצי מכפלת האלכסונים). זה שונה משטח מקבילית (בסיס × גובה). אפשר להשתמש בשתי הנוסחאות, אבל צריך לדעת מה נתון." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: מה הקשר בין אלכסוני המעוין, ולמה שטח = חצי מכפלת האלכסונים? (לפחות 80 תווים)",
    steps: [
      { phase:"סעיף א׳", label:"אלכסונים מאונכים", coaching:"", prompt:"במעוין ABCD, האלכסונים נחתכים ב-O. תנחה אותי להוכיח שהם מאונכים — מה התכונה של צלעות שוות ומשולשי חפיפה.", keywords:[], keywordHint:"", contextWords:["אלכסון","מאונך","90","חפיפה","צלע","שווה"] },
      { phase:"סעיף ב׳", label:"מציאת אלכסון מזווית", coaching:"", prompt:"ידוע אלכסון אחד וזווית במעוין. תכווין אותי — איך משתמשים בטריגונומטריה או פיתגורס כדי למצוא את האלכסון השני.", keywords:[], keywordHint:"", contextWords:["אלכסון","זווית","פיתגורס","חצי","טריגונומטריה","חישוב"] },
      { phase:"סעיף ג׳", label:"שטח מעוין", coaching:"", prompt:"שני האלכסונים ידועים. תדריך אותי — מהי נוסחת שטח מעוין ואיך מציבים.", keywords:[], keywordHint:"", contextWords:["שטח","אלכסון","חצי","מכפלה","נוסחה","הצבה"] },
      { phase:"סעיף ד׳", label:"היררכיה של מרובעים", coaching:"", prompt:"תנחה אותי להסביר — למה מלבן ומעוין הם שני מקרים פרטיים שונים של מקבילית, ומה ריבוע.", keywords:[], keywordHint:"", contextWords:["מקבילית","מלבן","מעוין","ריבוע","מקרה פרטי","תכונה"] },
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
      {/* Properties */}
      <div style={{ borderRadius:16, border:`1px solid ${s.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.25rem 1.5rem", marginBottom:"2rem", boxShadow:s.glowShadow }}>
        <div style={{ textAlign:"center", marginBottom:14 }}><div style={{ color:s.accentColor, fontSize:15, fontWeight:800, marginBottom:4 }}>▢ מרובעים — תכונות, שטח והיקף</div><div style={{ color:"#6B7280", fontSize:12, lineHeight:1.55 }}>{ex.id==="basic"&&"מקבילית — זוויות, שטח ואלכסונים."}{ex.id==="medium"&&"טרפז — נוסחת שטח, שווה-שוקיים, חישוב."}{ex.id==="advanced"&&"מעוין — אלכסונים מאונכים, שטח, היררכיית מרובעים."}</div></div>
        <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:14 }}/>
        <div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>🎯 נוסחאות שטח</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:120 }}>מקבילית</span><span>בסיס × גובה</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:120 }}>טרפז</span><span>½ × (b₁+b₂) × h</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:120 }}>מעוין</span><span>½ × d₁ × d₂</span></div></div></div>
        {ex.id!=="basic"&&(<><div style={{ height:1, background:"rgba(60,54,42,0.08)", marginBottom:12 }}/><div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>✨ {ex.id==="medium"?"תכונות טרפז":"תכונות מעוין"}</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}>{ex.id==="medium"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:120 }}>זוג בסיסים</span><span>מקבילים</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:120 }}>שווה-שוקיים</span><span>אלכסונים שווים, זוויות בסיס שוות</span></div></>}{ex.id==="advanced"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:120 }}>4 צלעות שוות</span><span>כל הצלעות באותו אורך</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:120 }}>אלכסונים ⊥</span><span>נחתכים בזווית ישרה וחוצים זה את זה</span></div></>}</div></div></>)}
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

/* ─── ParallelogramLab (basic) ─────────────────────────────────────────────── */

function ParallelogramLab() {
  const [angle,setAngle]=useState(70);
  const st=STATION.basic;
  const opp=angle; const adj=180-angle;
  const rad=(angle*Math.PI)/180;
  // Parallelogram points
  const base=140, side=80;
  const shift=side*Math.cos(rad);
  const h=side*Math.sin(rad);
  const ax=40,ay=140; const bx=ax+base,by=ay; const cx=bx+shift,cy=ay-h; const dx=ax+shift,dy=ay-h;
  const area=base*h;
  const isRect=angle===90;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת מקבילית</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו את הזווית וצפו כיצד המקבילית משתנה — מתי היא מלבן?</p>
      <div style={{ maxWidth:400, margin:"0 auto 2rem" }}><div style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>זווית A</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{angle}°</span></div><input type="range" min={30} max={150} step={1} value={angle} onChange={e=>setAngle(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div></div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 300 170" className="w-full max-w-md mx-auto" aria-hidden>
          <polygon points={`${ax},${ay} ${bx},${by} ${cx},${cy} ${dx},${dy}`} fill={`${st.accentColor}08`} stroke={st.accentColor} strokeWidth={2}/>
          <text x={ax-8} y={ay+14} fontSize={11} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">A</text>
          <text x={bx+4} y={by+14} fontSize={11} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">B</text>
          <text x={cx+4} y={cy-4} fontSize={11} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">C</text>
          <text x={dx-12} y={dy-4} fontSize={11} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">D</text>
          {/* Height dashed */}
          <line x1={dx} y1={dy} x2={dx} y2={ay} stroke="#64748b" strokeWidth={1} strokeDasharray="3,2"/>
          <text x={dx+6} y={(dy+ay)/2} fontSize={9} fill="#64748b" fontFamily="monospace">h={h.toFixed(0)}</text>
          {/* Angle labels */}
          <text x={ax+18} y={ay-6} fontSize={10} fill="#f59e0b" fontFamily="monospace">{angle}°</text>
          <text x={bx-22} y={by-6} fontSize={10} fill="#a78bfa" fontFamily="monospace">{adj}°</text>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"∠A = ∠C",val:`${opp}°`},{label:"∠B = ∠D",val:`${adj}°`},{label:"שטח",val:area.toFixed(0)},{label:"סוג",val:isRect?"מלבן!":"מקבילית"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:17, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>הזיזו ל-90° — מקבילית הופכת למלבן! מתי השטח מקסימלי?</p>
    </section>
  );
}

/* ─── TrapezoidLab (medium) ────────────────────────────────────────────────── */

function TrapezoidLab() {
  const [b1,setB1]=useState(12); const [b2,setB2]=useState(6); const [h,setH]=useState(5);
  const st=STATION.medium;
  const area=0.5*(b1+b2)*h;
  const sc=12;
  const ox=130-(b1*sc)/2, oy=140;
  const topOx=130-(b2*sc)/2;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת טרפז</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו בסיסים וגובה — צפו בשטח הטרפז.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, maxWidth:500, margin:"0 auto 2rem" }}>
        {[{label:"בסיס גדול (b₁)",val:b1,set:setB1,min:4,max:18},{label:"בסיס קטן (b₂)",val:b2,set:setB2,min:1,max:16},{label:"גובה (h)",val:h,set:setH,min:1,max:10}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:12, border:"1px solid rgba(255,255,255,0.4)", padding:"0.75rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={s.min} max={s.max} step={1} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 280 170" className="w-full max-w-md mx-auto" aria-hidden>
          <polygon points={`${ox},${oy} ${ox+b1*sc},${oy} ${topOx+b2*sc},${oy-h*sc} ${topOx},${oy-h*sc}`} fill={`${st.accentColor}08`} stroke={st.accentColor} strokeWidth={2}/>
          {/* Height */}
          <line x1={topOx} y1={oy-h*sc} x2={topOx} y2={oy} stroke="#64748b" strokeWidth={1.2} strokeDasharray="3,2"/>
          <text x={topOx-14} y={(oy+oy-h*sc)/2} fontSize={10} fill="#64748b" fontFamily="monospace">h</text>
          {/* Base labels */}
          <text x={(ox+ox+b1*sc)/2} y={oy+16} fontSize={10} fill={st.accentColor} textAnchor="middle" fontFamily="monospace">b₁={b1}</text>
          <text x={(topOx+topOx+b2*sc)/2} y={oy-h*sc-6} fontSize={10} fill={st.accentColor} textAnchor="middle" fontFamily="monospace">b₂={b2}</text>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"½(b₁+b₂)",val:((b1+b2)/2).toFixed(1)},{label:"× h",val:String(h)},{label:"שטח",val:area.toFixed(1)}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:20, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>כש-b₁ = b₂ הטרפז הופך למקבילית! הנוסחה עדיין עובדת.</p>
    </section>
  );
}

/* ─── RhombusLab (advanced) ────────────────────────────────────────────────── */

function RhombusLab() {
  const [d1,setD1]=useState(10); const [d2,setD2]=useState(6);
  const st=STATION.advanced;
  const area=0.5*d1*d2;
  const side=Math.sqrt((d1/2)**2+(d2/2)**2);
  const perimeter=4*side;
  const angleRad=2*Math.atan2(d2/2,d1/2);
  const angleDeg=(angleRad*180)/Math.PI;
  const sc=10;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת מעוין</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו את האלכסונים — צפו בשטח, צלע וזוויות.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 2rem" }}>
        {[{label:"אלכסון d₁",val:d1,set:setD1,min:2,max:16},{label:"אלכסון d₂",val:d2,set:setD2,min:2,max:16}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={s.min} max={s.max} step={0.5} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 260 200" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Rhombus from diagonals */}
          <polygon points={`${130},${100-d1*sc/2} ${130+d2*sc/2},${100} ${130},${100+d1*sc/2} ${130-d2*sc/2},${100}`} fill="rgba(220,38,38,0.05)" stroke="#DC2626" strokeWidth={2}/>
          {/* Diagonals */}
          <line x1={130} y1={100-d1*sc/2} x2={130} y2={100+d1*sc/2} stroke="#f59e0b" strokeWidth={1.2} strokeDasharray="4,3"/>
          <line x1={130-d2*sc/2} y1={100} x2={130+d2*sc/2} y2={100} stroke="#a78bfa" strokeWidth={1.2} strokeDasharray="4,3"/>
          {/* Right angle */}
          <rect x={130} y={88} width={10} height={10} fill="none" stroke="#64748b" strokeWidth={0.8}/>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"שטח",val:area.toFixed(1)},{label:"צלע",val:side.toFixed(2)},{label:"היקף",val:perimeter.toFixed(2)},{label:"זווית חדה",val:angleDeg.toFixed(1)+"°"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:17, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>כש-d₁ = d₂ → ריבוע! (כל הזוויות 90°). נסו!</p>
    </section>
  );
}

/* ─── Tabs + FormulaBar ────────────────────────────────────────────────────── */

const TABS=[{id:"basic",label:"מתחיל",textColor:"text-green-700",border:"border-green-600",bg:"bg-green-600/10",glowColor:"rgba(22,163,74,0.3)"},{id:"medium",label:"בינוני",textColor:"text-orange-700",border:"border-orange-600",bg:"bg-orange-600/10",glowColor:"rgba(234,88,12,0.3)"},{id:"advanced",label:"מתקדם",textColor:"text-red-700",border:"border-red-700",bg:"bg-red-700/10",glowColor:"rgba(220,38,38,0.3)"}];

function FormulaBar() {
  const [activeTab,setActiveTab]=useState<"par"|"trap"|"rhomb"|null>(null);
  const tabs=[{id:"par" as const,label:"▱ מקבילית",tex:"S = a \\cdot h",color:"#16A34A",borderColor:"rgba(22,163,74,0.35)"},{id:"trap" as const,label:"⏢ טרפז",tex:"S = \\tfrac{(b_1+b_2)h}{2}",color:"#EA580C",borderColor:"rgba(234,88,12,0.35)"},{id:"rhomb" as const,label:"◇ מעוין",tex:"S = \\tfrac{d_1 d_2}{2}",color:"#DC2626",borderColor:"rgba(220,38,38,0.35)"}];
  return (
    <div style={{ borderRadius:12, border:"1px solid rgba(60,54,42,0.15)", background:"rgba(255,255,255,0.75)", padding:"1.25rem", marginBottom:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginBottom:12, textAlign:"center" }}>נוסחאות</div>
      <div style={{ display:"flex", gap:6, marginBottom:activeTab?14:0 }}>{tabs.map(t=>{const isA=activeTab===t.id;return(<button key={t.id} onClick={()=>setActiveTab(isA?null:t.id)} style={{ flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", border:`1.5px solid ${isA?t.borderColor:"rgba(60,54,42,0.1)"}`, background:isA?`${t.color}0D`:"rgba(60,54,42,0.03)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{ fontSize:11, fontWeight:700, color:isA?t.color:"#6B7280" }}>{t.label}</span><span style={{ color:isA?t.color:"#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>);})}</div>
      {activeTab==="par"&&(<motion.div key="p" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(22,163,74,0.25)", background:"rgba(220,252,231,0.4)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"S = a \\cdot h"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>תכונות מקבילית</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>צלעות נגדיות שוות ומקבילות.</li><li>זוויות נגדיות שוות, סמוכות משלימות ל-180°.</li><li>אלכסונים חוצים זה את זה.</li></ol></div><div style={{ marginTop:10, color:"#15803d", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 מלבן = מקבילית עם זווית ישרה</div></div></div></motion.div>)}
      {activeTab==="trap"&&(<motion.div key="t" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(234,88,12,0.25)", background:"rgba(255,247,237,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"S = \\frac{(b_1 + b_2) \\cdot h}{2}"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(234,88,12,0.06)", border:"1px solid rgba(234,88,12,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>תכונות טרפז</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>זוג אחד של צלעות מקבילות (בסיסים).</li><li>שווה-שוקיים: שוקיים שוות, אלכסונים שווים.</li><li>הגובה = מרחק אנכי בין הבסיסים.</li></ol></div><div style={{ marginTop:10, color:"#B45309", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: b₁=10, b₂=6, h=4 → S = (10+6)·4/2 = 32</div></div></div></motion.div>)}
      {activeTab==="rhomb"&&(<motion.div key="r" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(220,38,38,0.25)", background:"rgba(254,242,242,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"S = \\frac{d_1 \\cdot d_2}{2}"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>תכונות מעוין</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>כל 4 הצלעות שוות.</li><li>אלכסונים מאונכים וחוצים זה את זה.</li><li>ריבוע = מעוין עם זווית 90° (d₁=d₂).</li></ol></div><div style={{ marginTop:10, color:"#DC2626", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: d₁=8, d₂=6 → S = 8·6/2 = 24, צלע = √(4²+3²) = 5</div></div></div></motion.div>)}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function QuadrilateralsPage() {
  const [selectedLevel,setSelectedLevel]=useState<"basic"|"medium"|"advanced">("basic");
  const ex=exercises.find(e=>e.id===selectedLevel)!;
  const lvlRgb=selectedLevel==="basic"?"45,90,39":selectedLevel==="medium"?"163,79,38":"139,38,53";
  return (
    <main style={{ minHeight:"100vh", background:"#F3EFE0", backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:"#2D3436", ["--lvl-rgb" as string]:lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`textarea,input[type="text"],input[type="password"]{outline:none!important}textarea:focus,input[type="text"]:focus{outline:none!important;border-color:rgba(var(--lvl-rgb),0.65)!important;box-shadow:0 0 0 3px rgba(var(--lvl-rgb),0.12)!important}input[type="range"]{outline:none!important}input[type="range"]:focus{outline:none!important}button:focus,button:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(var(--lvl-rgb),0.35)!important}button:focus:not(:focus-visible){box-shadow:none!important}`}</style>
      <div style={{ borderBottom:"1px solid rgba(60,54,42,0.15)", background:"#F3EFE0" }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div><h1 style={{ fontSize:22, fontWeight:700, color:"#2D3436", margin:0 }}>מרובעים עם AI — כיתה י׳ (3 יח׳)</h1><p style={{ fontSize:13, color:"#6B7280", margin:"2px 0 0" }}>מקבילית, טרפז, מעוין — תכונות, שטח, היקף ואיך לשאול AI</p></div>
          <Link href="/3u/topic/grade10/geometry" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap" }} onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D";}} onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A";}}><span style={{ fontSize:16 }}>←</span>חזרה</Link>
        </div>
      </div>
      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="3u/grade10/geometry/quadrilaterals"/>
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(60,54,42,0.15)" }}>{TABS.map(tab=>{const active=selectedLevel===tab.id;return(<button key={tab.id} onClick={()=>setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active?`${tab.bg} border ${tab.border} ${tab.textColor}`:"text-stone-500 hover:text-stone-800"}`} style={active?{boxShadow:`0 0 14px ${tab.glowColor}`}:undefined}>{tab.label}</button>);})}</div>
        <FormulaBar/>
        <motion.div key={selectedLevel} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22}}><ExerciseCard ex={ex}/></motion.div>
        {selectedLevel==="basic"&&<ParallelogramLab/>}
        {selectedLevel==="medium"&&<TrapezoidLab/>}
        {selectedLevel==="advanced"&&<RhombusLab/>}
        <div style={{ marginTop:"1.5rem" }}><MarkComplete subtopicId="3u/grade10/geometry/quadrilaterals" level={selectedLevel}/></div>
      </div>
    </main>
  );
}
