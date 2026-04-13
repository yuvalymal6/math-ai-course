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
  // Two congruent triangles side by side
  return (
    <svg viewBox="0 0 280 150" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Triangle 1 */}
      <polygon points="20,130 100,130 60,40" fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.7} />
      <text x={12} y={140} fontSize={12} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={104} y={140} fontSize={12} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={56} y={34} fontSize={12} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">C</text>
      {/* Equal marks on sides */}
      <line x1={56} y1={133} x2={64} y2={127} stroke="#16A34A" strokeWidth={1.5} />
      <line x1={36} y1={82} x2={44} y2={86} stroke="#f59e0b" strokeWidth={1.5} />
      <line x1={34} y1={86} x2={42} y2={90} stroke="#f59e0b" strokeWidth={1.5} />
      {/* Triangle 2 (mirror) */}
      <polygon points="170,130 250,130 210,40" fill="none" stroke="#a78bfa" strokeWidth={2} opacity={0.7} />
      <text x={162} y={140} fontSize={12} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">D</text>
      <text x={254} y={140} fontSize={12} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">E</text>
      <text x={206} y={34} fontSize={12} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">F</text>
      {/* Equal marks on sides */}
      <line x1={206} y1={133} x2={214} y2={127} stroke="#a78bfa" strokeWidth={1.5} />
      <line x1={186} y1={82} x2={194} y2={86} stroke="#f59e0b" strokeWidth={1.5} />
      <line x1={184} y1={86} x2={192} y2={90} stroke="#f59e0b" strokeWidth={1.5} />
      {/* ≅ symbol */}
      <text x={140} y={90} fontSize={18} fill="#64748b" textAnchor="middle" fontFamily="serif">≅</text>
    </svg>
  );
}

function MediumSVG() {
  // Two overlapping triangles sharing a side
  return (
    <svg viewBox="0 0 260 170" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Shared side */}
      <line x1={80} y1={150} x2={180} y2={150} stroke="#64748b" strokeWidth={2.5} opacity={0.8} />
      {/* Triangle ABD */}
      <polygon points="80,150 180,150 100,40" fill="none" stroke="#EA580C" strokeWidth={2} opacity={0.6} />
      {/* Triangle ABE */}
      <polygon points="80,150 180,150 170,40" fill="none" stroke="#a78bfa" strokeWidth={2} opacity={0.6} />
      {/* Vertex labels */}
      <text x={68} y={158} fontSize={13} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={184} y={158} fontSize={13} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={88} y={34} fontSize={13} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">C</text>
      <text x={174} y={34} fontSize={13} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">D</text>
      {/* Equal angle arcs at A */}
      <path d="M96,150 A16,16 0 0,0 88,138" fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      <path d="M96,148 A14,14 0 0,1 92,136" fill="none" stroke="#f59e0b" strokeWidth={1.5} />
    </svg>
  );
}

function AdvancedSVG() {
  // Parallelogram with diagonal creating two congruent triangles
  return (
    <svg viewBox="0 0 280 170" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Parallelogram */}
      <polygon points="50,140 200,140 230,40 80,40" fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.6} />
      {/* Diagonal */}
      <line x1={50} y1={140} x2={230} y2={40} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,3" />
      {/* Equal marks */}
      <line x1={120} y1={143} x2={128} y2={137} stroke="#DC2626" strokeWidth={1.5} />
      <line x1={151} y1={43} x2={159} y2={37} stroke="#DC2626" strokeWidth={1.5} />
      <line x1={62} y1={88} x2={68} y2={82} stroke="#a78bfa" strokeWidth={1.5} />
      <line x1={60} y1={84} x2={66} y2={78} stroke="#a78bfa" strokeWidth={1.5} />
      <line x1={212} y1={88} x2={218} y2={82} stroke="#a78bfa" strokeWidth={1.5} />
      <line x1={210} y1={84} x2={216} y2={78} stroke="#a78bfa" strokeWidth={1.5} />
      {/* Vertex labels */}
      <text x={38} y={150} fontSize={13} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={204} y={150} fontSize={13} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={234} y={36} fontSize={13} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">C</text>
      <text x={68} y={36} fontSize={13} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">D</text>
      {/* Alternate angle marks */}
      <path d="M68,140 A18,18 0 0,0 60,126" fill="none" stroke="#34d399" strokeWidth={1.5} />
      <path d="M212,40 A18,18 0 0,0 222,54" fill="none" stroke="#34d399" strokeWidth={1.5} />
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
      <MasterPromptGate onPass={()=>setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["חפיפה","משולש","צלע","זווית","הוכחה","נתון","מבוקש"]}/>
      {steps.map((s,i)=>(<div key={i} style={{ marginBottom:8 }}>{(!masterPassed||i>=unlockedCount)?(<div style={{ borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", background:"rgba(255,255,255,0.7)", padding:"14px 16px", opacity:0.5, pointerEvents:"none" as const, display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ color:"#6B7280", fontSize:13, fontWeight:600 }}>{s.phase} — {s.label}</span><span style={{ fontSize:16 }}>🔒</span></div>):(<div><div style={{ borderRadius:14, border:"1px solid rgba(22,163,74,0.3)", background:"rgba(255,255,255,0.9)", padding:"14px 16px", marginBottom:8 }}><div style={{ color:"#15803d", fontSize:13, fontWeight:700, marginBottom:6 }}>{s.phase} — {s.label}</div><div style={{ color:"#334155", fontSize:13, lineHeight:1.6 }}>{s.prompt}</div></div><button onClick={()=>setUnlockedCount(v=>Math.max(v,i+2))} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}
      {allPassed&&(<div style={{ borderRadius:16, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:"1.25rem 1.5rem", marginTop:16, textAlign:"center" }}><div style={{ fontSize:28, marginBottom:8 }}>🏆</div><div style={{ color:"#14532d", fontWeight:800, fontSize:16, marginBottom:4 }}>כל הכבוד — השלמת את הרמה המתקדמת!</div><div style={{ color:"#166534", fontSize:13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}
    </div>
  );
}

/* ─── Exercise Data ────────────────────────────────────────────────────────── */

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "זיהוי תנאי חפיפה",
    problem: "נתונים שני משולשים ABC ו-DEF.\nידוע: AB = DE, BC = EF, AC = DF.\n\nא. לפי איזה תנאי חפיפה המשולשים חופפים?\nב. רשמו את כל הזוויות והצלעות המתאימות (מהחפיפה).\nג. אם ידוע ש-∠A = 50°, מהי הזווית המתאימה במשולש DEF?",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ סדר הקודקודים חשוב!", text: "אם כותבים △ABC ≅ △DEF, הסדר קובע מי מתאים למי: A↔D, B↔E, C↔F. החלפת סדר הקודקודים משנה את ההתאמה ומובילה לטעויות בזיהוי צלעות וזוויות." },
      { title: "⚠️ צ.צ.צ ≠ כל שלוש צלעות שוות", text: "צ.צ.צ דורש שכל שלוש הצלעות של משולש אחד שוות לשלוש הצלעות של השני, בהתאמה. לא מספיק ששלוש צלעות שוות — צריך להראות 3 זוגות מתאימים." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יא', 3 יחידות, ומצרף/ת שאלה על חפיפת משולשים — זיהוי תנאי חפיפה וציון התאמות. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"זיהוי תנאי חפיפה", coaching:"", prompt:"AB=DE, BC=EF, AC=DF. תנחה אותי — כמה זוגות צלעות שוות יש, ולפי איזה תנאי חפיפה (צ.צ.צ, צ.ז.צ, ז.צ.ז) המשולשים חופפים.", keywords:[], keywordHint:"", contextWords:["חפיפה","תנאי","צלע","צ.צ.צ","צ.ז.צ","ז.צ.ז"] },
      { phase:"סעיף ב׳", label:"התאמות מחפיפה", coaching:"", prompt:"△ABC ≅ △DEF. תכווין אותי — איך הסדר של הקודקודים קובע את ההתאמה, ומהן הזוויות והצלעות המתאימות.", keywords:[], keywordHint:"", contextWords:["התאמה","קודקוד","סדר","זווית","צלע","מתאים"] },
      { phase:"סעיף ג׳", label:"מציאת זווית מתאימה", coaching:"", prompt:"∠A = 50° ו-△ABC ≅ △DEF. תדריך אותי — איזו זווית ב-DEF מתאימה ל-∠A ולמה.", keywords:[], keywordHint:"", contextWords:["זווית","מתאימה","חפיפה","שווה","A","D"] },
    ],
  },
  {
    id: "medium",
    title: "הוכחת חפיפה — צלע משותפת",
    problem: "במשולשים ABC ו-ABD, הצלע AB משותפת.\nנתון: AC = AD ו-∠CAB = ∠DAB.\n\nא. זהו את כל הנתונים הידועים בשני המשולשים.\nב. הוכיחו ש-△ABC ≅ △ABD. ציינו את תנאי החפיפה.\nג. מהי המסקנה לגבי BC ו-BD?",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ שכחת הצלע המשותפת כנתון", text: "כשלשני משולשים יש צלע משותפת (AB=AB), היא מהווה נתון לחפיפה. תלמידים שוכחים לציין אותה ונשארים עם רק 2 נתונים במקום 3." },
      { title: "⚠️ בלבול בין צ.ז.צ ל-ז.צ.ז", text: "צ.ז.צ = שתי צלעות והזווית שביניהן (חייבת להיות הזווית הכלואה!). אם הזווית לא בין הצלעות, זה לא צ.ז.צ וייתכן שאין חפיפה." },
    ],
    goldenPrompt: `אני בכיתה יא', 3 יחידות, מצרף/ת הוכחת חפיפה של שני משולשים עם צלע משותפת.

אל תיתן לי את ההוכחה — שאל אותי שאלות מנחות על זיהוי הנתונים ובחירת תנאי החפיפה.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"זיהוי נתונים", coaching:"", prompt:"△ABC ו-△ABD חולקים את AB. AC=AD ו-∠CAB=∠DAB. תנחה אותי — כמה נתונים יש ומה כל אחד מהם.", keywords:[], keywordHint:"", contextWords:["נתון","צלע","משותפת","זווית","שווה","זיהוי"] },
      { phase:"סעיף ב׳", label:"הוכחת חפיפה", coaching:"", prompt:"יש לנו AB=AB (משותפת), AC=AD, ∠CAB=∠DAB. תכווין אותי — איזה תנאי חפיפה מתקיים (צ.ז.צ) ואיך כותבים הוכחה.", keywords:[], keywordHint:"", contextWords:["הוכחה","חפיפה","צ.ז.צ","כלואה","נימוק","טענה"] },
      { phase:"סעיף ג׳", label:"מסקנה מחפיפה", coaching:"", prompt:"הוכחנו △ABC ≅ △ABD. תדריך אותי — מה אפשר להסיק על BC ו-BD ולמה.", keywords:[], keywordHint:"", contextWords:["מסקנה","שווה","צלע","מתאימה","חפיפה","BC"] },
    ],
  },
  {
    id: "advanced",
    title: "חפיפה במקבילית — הוכחה מורכבת",
    problem: "נתונה מקבילית ABCD. האלכסון AC מחלק אותה לשני משולשים.\n\nא. רשמו את כל הנתונים הידועים על △ABC ו-△CDA (מתכונות המקבילית).\nב. הוכיחו ש-△ABC ≅ △CDA.\nג. הסבירו כיצד מהחפיפה נובע ש-∠ABC = ∠CDA (זוויות נגדיות שוות).\nד. הציעו דרך הוכחה נוספת לחפיפה (בתנאי חפיפה אחר).",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ סדר הקודקודים בחפיפה חייב להתאים", text: "כשמוכיחים △ABC ≅ △CDA, חייבים שההתאמה תהיה A↔C, B↔D, C↔A. סדר שגוי אומר שמתאימים צלעות/זוויות לא נכונות ומקבלים הוכחה שגויה." },
      { title: "⚠️ לא כל 3 נתונים מספיקים", text: "צ.ז.צ עובד רק אם הזווית כלואה בין שתי הצלעות. ז.ז.צ לא תמיד מבטיח חפיפה (יש מקרים מיוחדים). תמיד ודאו שהתנאי שבחרתם באמת מתקיים." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: למה אלכסון מקבילית יוצר שני משולשים חופפים, ואיזה תנאי חפיפה אפשר להשתמש בו? (לפחות 80 תווים)",
    steps: [
      { phase:"סעיף א׳", label:"נתונים מתכונות מקבילית", coaching:"", prompt:"מקבילית ABCD עם אלכסון AC. תנחה אותי — מה אנחנו יודעים על △ABC ו-△CDA מתכונות המקבילית (צלעות מקבילות ושוות, זוויות מתחלפות).", keywords:[], keywordHint:"", contextWords:["מקבילית","צלע","שווה","מקבילה","זווית מתחלפת","נתון"] },
      { phase:"סעיף ב׳", label:"הוכחת חפיפה", coaching:"", prompt:"AB=CD, AD=BC (צלעות נגדיות), AC=AC (משותפת). תכווין אותי לכתוב הוכחת חפיפה — לפי צ.צ.צ.", keywords:[], keywordHint:"", contextWords:["הוכחה","חפיפה","צ.צ.צ","צלע","משותפת","נימוק"] },
      { phase:"סעיף ג׳", label:"מסקנה — זוויות נגדיות", coaching:"", prompt:"הוכחנו △ABC ≅ △CDA. תדריך אותי — איך זה מוכיח ש-∠ABC = ∠CDA (זוויות נגדיות במקבילית שוות).", keywords:[], keywordHint:"", contextWords:["מסקנה","זווית","נגדית","שווה","מתאימה","חפיפה"] },
      { phase:"סעיף ד׳", label:"דרך הוכחה חלופית", coaching:"", prompt:"תנחה אותי להציע דרך נוספת להוכיח חפיפה — למשל בעזרת זוויות מתחלפות ותנאי צ.ז.צ.", keywords:[], keywordHint:"", contextWords:["חלופי","צ.ז.צ","זווית מתחלפת","מקבילה","כלואה","הוכחה"] },
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
        <div style={{ textAlign:"center", marginBottom:14 }}><div style={{ color:s.accentColor, fontSize:15, fontWeight:800, marginBottom:4 }}>≅ חפיפת משולשים</div><div style={{ color:"#6B7280", fontSize:12, lineHeight:1.55 }}>{ex.id==="basic"&&"זיהוי תנאי חפיפה — צ.צ.צ, צ.ז.צ, ז.צ.ז."}{ex.id==="medium"&&"הוכחת חפיפה עם צלע משותפת."}{ex.id==="advanced"&&"חפיפה במקבילית — הוכחה מורכבת עם מסקנות."}</div></div>
        <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:14 }}/>
        <div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>🎯 תנאי חפיפה</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:80 }}>צ.צ.צ</span><span>שלוש צלעות שוות (SSS)</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:80 }}>צ.ז.צ</span><span>שתי צלעות והזווית הכלואה (SAS)</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:80 }}>ז.צ.ז</span><span>שתי זוויות והצלע שביניהן (ASA)</span></div></div></div>
        {ex.id!=="basic"&&(<><div style={{ height:1, background:"rgba(60,54,42,0.08)", marginBottom:12 }}/><div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>✨ {ex.id==="medium"?"כלים שימושיים":"מקבילית וחפיפה"}</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}>{ex.id==="medium"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:110 }}>צלע משותפת</span><span>AB = AB (נתון חינמי)</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:110 }}>זווית כלואה</span><span>הזווית חייבת להיות בין שתי הצלעות</span></div></>}{ex.id==="advanced"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:130 }}>צלעות נגדיות</span><span>שוות ומקבילות</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:130 }}>זוויות מתחלפות</span><span>שוות כשיש מקבילות + חותך</span></div></>}</div></div></>)}
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

/* ─── CongruenceCheckLab (basic) ───────────────────────────────────────────── */

function CongruenceCheckLab() {
  const [condition,setCondition]=useState<"sss"|"sas"|"asa">("sss");
  const st=STATION.basic;
  const info:{[k:string]:{name:string;desc:string;given:string;example:string}}={
    sss:{name:"צ.צ.צ (SSS)",desc:"שלוש צלעות שוות",given:"AB=DE, BC=EF, AC=DF",example:"3 זוגות צלעות → חפיפה מובטחת"},
    sas:{name:"צ.ז.צ (SAS)",desc:"שתי צלעות והזווית הכלואה ביניהן",given:"AB=DE, ∠B=∠E, BC=EF",example:"הזווית חייבת להיות בין הצלעות!"},
    asa:{name:"ז.צ.ז (ASA)",desc:"שתי זוויות והצלע שביניהן",given:"∠A=∠D, AB=DE, ∠B=∠E",example:"הצלע חייבת להיות בין הזוויות!"},
  };
  const c=info[condition];

  // Draw two triangles that match
  const t1="30,120 110,120 70,40";
  const t2="160,120 240,120 200,40";

  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת תנאי חפיפה</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>בחרו תנאי חפיפה וצפו מה צריך להוכיח.</p>
      <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:"2rem" }}>
        {(["sss","sas","asa"] as const).map(c2=>(<button key={c2} onClick={()=>setCondition(c2)} style={{ padding:"10px 20px", borderRadius:14, fontSize:14, fontWeight:700, cursor:"pointer", border:`2px solid ${condition===c2?st.accentColor:"rgba(60,54,42,0.15)"}`, background:condition===c2?`${st.accentColor}15`:"rgba(255,255,255,0.75)", color:condition===c2?st.accentColor:"#6B7280", transition:"all 0.2s" }}>{c2==="sss"?"צ.צ.צ":c2==="sas"?"צ.ז.צ":"ז.צ.ז"}</button>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 270 140" className="w-full max-w-md mx-auto" aria-hidden>
          <polygon points={t1} fill={`${st.accentColor}06`} stroke={st.accentColor} strokeWidth={2}/>
          <polygon points={t2} fill="rgba(167,139,250,0.06)" stroke="#a78bfa" strokeWidth={2}/>
          <text x={135} y={80} fontSize={20} fill="#64748b" textAnchor="middle" fontFamily="serif">≅</text>
          {/* Highlight what's given based on condition */}
          {condition==="sss"&&<><line x1={30} y1={120} x2={110} y2={120} stroke="#f59e0b" strokeWidth={3} opacity={0.5}/><line x1={160} y1={120} x2={240} y2={120} stroke="#f59e0b" strokeWidth={3} opacity={0.5}/><line x1={110} y1={120} x2={70} y2={40} stroke="#34d399" strokeWidth={3} opacity={0.5}/><line x1={240} y1={120} x2={200} y2={40} stroke="#34d399" strokeWidth={3} opacity={0.5}/><line x1={30} y1={120} x2={70} y2={40} stroke="#a78bfa" strokeWidth={3} opacity={0.5}/><line x1={160} y1={120} x2={200} y2={40} stroke="#a78bfa" strokeWidth={3} opacity={0.5}/></>}
          {condition==="sas"&&<><line x1={30} y1={120} x2={110} y2={120} stroke="#f59e0b" strokeWidth={3} opacity={0.5}/><line x1={160} y1={120} x2={240} y2={120} stroke="#f59e0b" strokeWidth={3} opacity={0.5}/><line x1={110} y1={120} x2={70} y2={40} stroke="#34d399" strokeWidth={3} opacity={0.5}/><line x1={240} y1={120} x2={200} y2={40} stroke="#34d399" strokeWidth={3} opacity={0.5}/><path d="M95,120 A15,15 0 0,0 88,108" fill="none" stroke="#DC2626" strokeWidth={2.5}/><path d="M225,120 A15,15 0 0,0 218,108" fill="none" stroke="#DC2626" strokeWidth={2.5}/></>}
          {condition==="asa"&&<><line x1={30} y1={120} x2={110} y2={120} stroke="#f59e0b" strokeWidth={3} opacity={0.5}/><line x1={160} y1={120} x2={240} y2={120} stroke="#f59e0b" strokeWidth={3} opacity={0.5}/><path d="M45,120 A15,15 0 0,0 42,107" fill="none" stroke="#DC2626" strokeWidth={2.5}/><path d="M175,120 A15,15 0 0,0 172,107" fill="none" stroke="#DC2626" strokeWidth={2.5}/><path d="M95,120 A15,15 0 0,0 88,108" fill="none" stroke="#a78bfa" strokeWidth={2.5}/><path d="M225,120 A15,15 0 0,0 218,108" fill="none" stroke="#a78bfa" strokeWidth={2.5}/></>}
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"תנאי",val:c.name},{label:"מה צריך",val:c.desc}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:14, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <div style={{ borderRadius:12, background:"rgba(255,255,255,0.6)", border:"1px solid rgba(60,54,42,0.1)", padding:"0.75rem 1rem", marginTop:12, textAlign:"center" }}>
        <div style={{ color:"#6B7280", fontSize:11, marginBottom:4 }}>נתון לדוגמה:</div>
        <div style={{ color:"#2D3436", fontSize:13, fontFamily:"monospace", fontWeight:600 }}>{c.given}</div>
        <div style={{ color:"#94a3b8", fontSize:11, marginTop:6 }}>{c.example}</div>
      </div>
    </section>
  );
}

/* ─── ProofBuilderLab (medium) ─────────────────────────────────────────────── */

function ProofBuilderLab() {
  const [step,setStep]=useState(0);
  const st=STATION.medium;
  const proofSteps=[
    {label:"נתון",content:"AB = AB (צלע משותפת), AC = AD (נתון), ∠CAB = ∠DAB (נתון)"},
    {label:"תנאי חפיפה",content:"צ.ז.צ — שתי צלעות (AB, AC/AD) והזווית הכלואה (∠CAB/∠DAB)"},
    {label:"חפיפה",content:"△ABC ≅ △ABD (לפי צ.ז.צ)"},
    {label:"מסקנה",content:"BC = BD (צלעות מתאימות במשולשים חופפים)"},
  ];
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת בניית הוכחה</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>לחצו על כל שלב כדי לחשוף את ההוכחה בהדרגה.</p>
      <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:500, margin:"0 auto" }}>
        {proofSteps.map((ps,i)=>(
          <div key={i} onClick={()=>{ if(i<=step) setStep(Math.max(step,i+1)); else if(i===step+1) setStep(i); }} style={{ borderRadius:14, border:`1.5px solid ${i<=step?`rgba(${st.glowRgb},0.5)`:"rgba(60,54,42,0.15)"}`, background:i<=step?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.5)", padding:"1rem 1.25rem", cursor:i<=step+1?"pointer":"default", opacity:i<=step+1?1:0.4, transition:"all 0.3s" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:i<=step?8:0 }}>
              <div style={{ width:28, height:28, borderRadius:99, background:i<=step?st.accentColor:"#e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:i<=step?"#fff":"#94a3b8", flexShrink:0 }}>{i+1}</div>
              <span style={{ color:i<=step?"#2D3436":"#94a3b8", fontSize:14, fontWeight:700 }}>{ps.label}</span>
              {i>step&&<span style={{ marginRight:"auto", fontSize:14 }}>🔒</span>}
            </div>
            {i<=step&&<div style={{ color:"#334155", fontSize:13, lineHeight:1.7, paddingRight:38 }}>{ps.content}</div>}
          </div>
        ))}
      </div>
      {step>=proofSteps.length&&<div style={{ textAlign:"center", marginTop:16, color:st.accentColor, fontWeight:700, fontSize:14 }}>✅ ההוכחה שלמה! BC = BD מוכח.</div>}
      {step<proofSteps.length&&<p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>לחצו על השלב הבא כדי לחשוף.</p>}
    </section>
  );
}

/* ─── ParallelogramCongruenceLab (advanced) ─────────────────────────────────── */

function ParallelogramCongruenceLab() {
  const [angle,setAngle]=useState(70);
  const st=STATION.advanced;
  const rad=(angle*Math.PI)/180;
  const base=140,side=80;
  const shift=side*Math.cos(rad),h=side*Math.sin(rad);
  const ax=40,ay=145,bx=ax+base,by=ay,cx=bx+shift,cy=ay-h,dx=ax+shift,dy=ay-h;
  const adj=180-angle;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת חפיפה במקבילית</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו את הזווית — צפו כיצד האלכסון יוצר שני משולשים חופפים.</p>
      <div style={{ maxWidth:400, margin:"0 auto 2rem" }}><div style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>זווית A</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{angle}°</span></div><input type="range" min={30} max={150} step={1} value={angle} onChange={e=>setAngle(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div></div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 300 175" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Triangle 1 (ABC) filled */}
          <polygon points={`${ax},${ay} ${bx},${by} ${cx},${cy}`} fill="rgba(220,38,38,0.08)" stroke="#DC2626" strokeWidth={1.5} />
          {/* Triangle 2 (ACD) filled differently */}
          <polygon points={`${ax},${ay} ${cx},${cy} ${dx},${dy}`} fill="rgba(167,139,250,0.08)" stroke="#a78bfa" strokeWidth={1.5} />
          {/* Diagonal */}
          <line x1={ax} y1={ay} x2={cx} y2={cy} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5,3"/>
          {/* Labels */}
          <text x={ax-10} y={ay+14} fontSize={12} fill="#DC2626" fontWeight={700}>A</text>
          <text x={bx+4} y={by+14} fontSize={12} fill="#DC2626" fontWeight={700}>B</text>
          <text x={cx+4} y={cy-4} fontSize={12} fill="#DC2626" fontWeight={700}>C</text>
          <text x={dx-14} y={dy-4} fontSize={12} fill="#DC2626" fontWeight={700}>D</text>
          {/* Alternate angle marks */}
          <path d={`M${ax+20},${ay} A16,16 0 0,0 ${ax+16*Math.cos(rad)},${ay-16*Math.sin(rad)}`} fill="none" stroke="#34d399" strokeWidth={2}/>
          <path d={`M${cx-20},${cy} A16,16 0 0,0 ${cx-16*Math.cos(rad)},${cy+16*Math.sin(rad)}`} fill="none" stroke="#34d399" strokeWidth={2}/>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
        {[{label:"∠A",val:`${angle}°`},{label:"∠B",val:`${adj}°`},{label:"∠C",val:`${angle}°`},{label:"∠D",val:`${adj}°`}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:10, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:17, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>האדום והסגול תמיד חופפים — △ABC ≅ △CDA. הזוויות הירוקות = זוויות מתחלפות.</p>
    </section>
  );
}

/* ─── Tabs + FormulaBar ────────────────────────────────────────────────────── */

const TABS=[{id:"basic",label:"מתחיל",textColor:"text-green-700",border:"border-green-600",bg:"bg-green-600/10",glowColor:"rgba(22,163,74,0.3)"},{id:"medium",label:"בינוני",textColor:"text-orange-700",border:"border-orange-600",bg:"bg-orange-600/10",glowColor:"rgba(234,88,12,0.3)"},{id:"advanced",label:"מתקדם",textColor:"text-red-700",border:"border-red-700",bg:"bg-red-700/10",glowColor:"rgba(220,38,38,0.3)"}];

function FormulaBar() {
  const [activeTab,setActiveTab]=useState<"conditions"|"proof"|"tools"|null>(null);
  const tabs=[{id:"conditions" as const,label:"≅ תנאי חפיפה",tex:"\\triangle \\cong \\triangle",color:"#16A34A",borderColor:"rgba(22,163,74,0.35)"},{id:"proof" as const,label:"∴ מבנה הוכחה",tex:"\\text{N} \\Rightarrow \\text{M}",color:"#EA580C",borderColor:"rgba(234,88,12,0.35)"},{id:"tools" as const,label:"🔧 כלים",tex:"\\angle, \\parallel",color:"#DC2626",borderColor:"rgba(220,38,38,0.35)"}];
  return (
    <div style={{ borderRadius:12, border:"1px solid rgba(60,54,42,0.15)", background:"rgba(255,255,255,0.75)", padding:"1.25rem", marginBottom:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginBottom:12, textAlign:"center" }}>נוסחאות</div>
      <div style={{ display:"flex", gap:6, marginBottom:activeTab?14:0 }}>{tabs.map(t=>{const isA=activeTab===t.id;return(<button key={t.id} onClick={()=>setActiveTab(isA?null:t.id)} style={{ flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", border:`1.5px solid ${isA?t.borderColor:"rgba(60,54,42,0.1)"}`, background:isA?`${t.color}0D`:"rgba(60,54,42,0.03)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{ fontSize:11, fontWeight:700, color:isA?t.color:"#6B7280" }}>{t.label}</span><span style={{ color:isA?t.color:"#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>);})}</div>
      {activeTab==="conditions"&&(<motion.div key="c" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(22,163,74,0.25)", background:"rgba(220,252,231,0.4)", padding:16 }}><div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>שלושת תנאי החפיפה</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>צ.צ.צ (SSS):</strong> 3 זוגות צלעות שוות.</li><li><strong>צ.ז.צ (SAS):</strong> 2 צלעות + הזווית <em>הכלואה</em> ביניהן.</li><li><strong>ז.צ.ז (ASA):</strong> 2 זוויות + הצלע שביניהן.</li></ol></div><div style={{ marginTop:10, color:"#15803d", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 תנאי נוסף: ז.ז.צ (AAS) — 2 זוויות + צלע שלא ביניהן (נובע מסכום זוויות)</div></div></div></motion.div>)}
      {activeTab==="proof"&&(<motion.div key="p" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(234,88,12,0.25)", background:"rgba(255,247,237,0.95)", padding:16 }}><div style={{ borderRadius:10, background:"rgba(234,88,12,0.06)", border:"1px solid rgba(234,88,12,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>מבנה הוכחת חפיפה</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>נתון:</strong> מה ידוע (כולל צלעות משותפות!).</li><li><strong>טענות + נימוקים:</strong> 3 שוויונות עם הסבר.</li><li><strong>מסקנה:</strong> △ABC ≅ △DEF (לפי תנאי X).</li><li><strong>נובע:</strong> צלעות/זוויות מתאימות שוות.</li></ol></div><div style={{ marginTop:10, color:"#B45309", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 טיפ: תמיד ציינו "צלע משותפת" — זה נתון חינמי!</div></div></div></motion.div>)}
      {activeTab==="tools"&&(<motion.div key="t" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(220,38,38,0.25)", background:"rgba(254,242,242,0.95)", padding:16 }}><div style={{ borderRadius:10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>כלים שימושיים להוכחות</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>זוויות מתחלפות:</strong> שוות כשיש מקבילות + חותך.</li><li><strong>זוויות מתאימות:</strong> שוות כשיש מקבילות.</li><li><strong>סכום זוויות:</strong> 180° במשולש → הזווית השלישית נגזרת.</li><li><strong>צלעות נגדיות במקבילית:</strong> שוות.</li></ol></div></div></div></motion.div>)}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function CongruencePage() {
  const [selectedLevel,setSelectedLevel]=useState<"basic"|"medium"|"advanced">("basic");
  const ex=exercises.find(e=>e.id===selectedLevel)!;
  const lvlRgb=selectedLevel==="basic"?"45,90,39":selectedLevel==="medium"?"163,79,38":"139,38,53";
  return (
    <main style={{ minHeight:"100vh", background:"#F3EFE0", backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:"#2D3436", ["--lvl-rgb" as string]:lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`textarea,input[type="text"],input[type="password"]{outline:none!important}textarea:focus,input[type="text"]:focus{outline:none!important;border-color:rgba(var(--lvl-rgb),0.65)!important;box-shadow:0 0 0 3px rgba(var(--lvl-rgb),0.12)!important}input[type="range"]{outline:none!important}input[type="range"]:focus{outline:none!important}button:focus,button:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(var(--lvl-rgb),0.35)!important}button:focus:not(:focus-visible){box-shadow:none!important}`}</style>
      <div style={{ borderBottom:"1px solid rgba(60,54,42,0.15)", background:"#F3EFE0" }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div><h1 style={{ fontSize:22, fontWeight:700, color:"#2D3436", margin:0 }}>חפיפת משולשים עם AI — כיתה יא׳ (3 יח׳)</h1><p style={{ fontSize:13, color:"#6B7280", margin:"2px 0 0" }}>צ.צ.צ, צ.ז.צ, ז.צ.ז — הוכחות ושימושים</p></div>
          <Link href="/3u/topic/grade11/geometry" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap" }} onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D";}} onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A";}}><span style={{ fontSize:16 }}>←</span>חזרה</Link>
        </div>
      </div>
      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="3u/grade11/geometry/congruence"/>
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(60,54,42,0.15)" }}>{TABS.map(tab=>{const active=selectedLevel===tab.id;return(<button key={tab.id} onClick={()=>setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active?`${tab.bg} border ${tab.border} ${tab.textColor}`:"text-stone-500 hover:text-stone-800"}`} style={active?{boxShadow:`0 0 14px ${tab.glowColor}`}:undefined}>{tab.label}</button>);})}</div>
        <FormulaBar/>
        <motion.div key={selectedLevel} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22}}><ExerciseCard ex={ex}/></motion.div>
        {selectedLevel==="basic"&&<CongruenceCheckLab/>}
        {selectedLevel==="medium"&&<ProofBuilderLab/>}
        {selectedLevel==="advanced"&&<ParallelogramCongruenceLab/>}
        <div style={{ marginTop:"1.5rem" }}><MarkComplete subtopicId="3u/grade11/geometry/congruence" level={selectedLevel}/></div>
      </div>
    </main>
  );
}
