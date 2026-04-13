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
    <svg viewBox="0 0 260 140" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Two non-overlapping circles (disjoint events) */}
      <circle cx={85} cy={70} r={45} fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.6} />
      <circle cx={185} cy={70} r={45} fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.6} />
      <text x={85} y={75} fontSize={16} fill="#16A34A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>A</text>
      <text x={185} y={75} fontSize={16} fill="#16A34A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>B</text>
      {/* Question marks */}
      <text x={85} y={95} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">P=?</text>
      <text x={185} y={95} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">P=?</text>
      {/* Universe label */}
      <text x={135} y={135} fontSize={10} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">Ω</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 270 150" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Overlapping Venn diagram */}
      <circle cx={100} cy={75} r={52} fill="none" stroke="#EA580C" strokeWidth={2} opacity={0.5} />
      <circle cx={170} cy={75} r={52} fill="none" stroke="#EA580C" strokeWidth={2} opacity={0.5} />
      <text x={72} y={55} fontSize={14} fill="#EA580C" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">A</text>
      <text x={198} y={55} fontSize={14} fill="#EA580C" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">B</text>
      {/* Region question marks */}
      <text x={72} y={82} fontSize={13} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>
      <text x={135} y={82} fontSize={13} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?</text>
      <text x={198} y={82} fontSize={13} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>
      <text x={135} y={145} fontSize={10} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">Ω</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 280 160" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Three overlapping circles */}
      <circle cx={110} cy={65} r={45} fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.5} />
      <circle cx={170} cy={65} r={45} fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.5} />
      <circle cx={140} cy={110} r={45} fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.5} />
      <text x={82} y={50} fontSize={13} fill="#DC2626" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">A</text>
      <text x={198} y={50} fontSize={13} fill="#DC2626" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">B</text>
      <text x={140} y={148} fontSize={13} fill="#DC2626" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">C</text>
      {/* Center region */}
      <text x={140} y={82} fontSize={14} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?</text>
    </svg>
  );
}

/* ─── Prompt Atoms ─────────────────────────────────────────────────────────── */

function CopyBtn({ text, label = "העתק פרומפט" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  return (<button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 16px", borderRadius:12, fontSize:12, background:"rgba(255,255,255,0.75)", border:"1px solid rgba(60,54,42,0.25)", color:"#1A1A1A", fontWeight:500, cursor:"pointer" }}>{c ? <Check size={13}/> : <Copy size={13}/>}{c ? "הועתק!" : label}</button>);
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
    <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${passed?"rgba(245,158,11,0.55)":`rgba(${borderRgb},0.35)`}`, marginBottom:8, boxShadow:passed?"0 0 16px rgba(245,158,11,0.25)":"none", transition:"border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px", background:"rgba(255,255,255,0.75)", borderBottom:`1px solid ${passed?"rgba(245,158,11,0.3)":`rgba(${borderRgb},0.2)`}` }}>{passed?<CheckCircle size={14} color="#34d399"/>:<span style={{ color:"#1A1A1A", fontSize:11, fontWeight:700 }}>{step.phase}</span>}<span style={{ color:"#2D3436", fontSize:11, fontWeight:600 }}>{step.label}</span></div>
      <div style={{ background:"rgba(255,255,255,0.4)", padding:16, display:"flex", flexDirection:"column", gap:12 }}>
        <textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={e=>{setText(e.target.value);setResult(null);}} placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..." style={{ minHeight:80, maxHeight:160, width:"100%", borderRadius:12, background:"rgba(255,255,255,0.75)", border:`1px solid ${passed?"rgba(245,158,11,0.4)":`rgba(${borderRgb},0.25)`}`, color:"#2D3436", fontSize:14, padding:12, resize:"none", boxSizing:"border-box", fontFamily:"inherit" }}/>
        {result&&(<div><div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#1A1A1A", marginBottom:4, fontWeight:600 }}><span>ציון הפרומפט</span><span style={{ color:"#1A1A1A", fontWeight:800 }}>{result.score}/100</span></div><div style={{ height:6, borderRadius:3, background:"#E5E7EB", overflow:"hidden" }}><div style={{ height:"100%", width:`${result.score}%`, borderRadius:3, background:scoreBarColor, transition:"width 0.4s ease" }}/></div></div>)}
        {!result&&<button onClick={validate} style={{ padding:"6px 16px", borderRadius:12, fontSize:12, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${borderRgb},0.4)`, color:"#1A1A1A", cursor:"pointer", fontWeight:500 }}>בדיקת AI מדומה 🤖</button>}
        {result&&result.blocked&&<motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ borderRadius:12, background:"rgba(254,226,226,1)", border:"2px solid #dc2626", padding:12, color:"#1A1A1A", fontSize:12, lineHeight:1.6 }}>⚠️ {result.hint}</motion.div>}
        {result&&!result.blocked&&result.score<75&&<motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ borderRadius:12, background:"rgba(255,251,235,1)", border:"2px solid #d97706", padding:12, color:"#1A1A1A", fontSize:12, lineHeight:1.6 }}>💡 {result.hint}</motion.div>}
        {passed&&(<motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ display:"flex", flexDirection:"column", gap:8 }}><div style={{ borderRadius:12, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:12, color:"#1A1A1A", fontSize:12, lineHeight:1.6, fontWeight:600 }}>✅ פרומפט מצוין! ציון: <strong style={{ color:"#14532d" }}>{result.score}/100</strong></div><button onClick={()=>{navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:12, fontSize:12, background:"transparent", border:"2px solid #16a34a", color:"#14532d", cursor:"pointer", fontWeight:500 }}>{copied?<Check size={12}/>:<Copy size={12}/>}{copied?"הועתק!":"העתק ל-AI"}</button></motion.div>)}
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
      <MasterPromptGate onPass={()=>setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["אירוע","הסתברות","חיתוך","איחוד","משלים","זרים","נוסחה"]}/>
      {steps.map((s,i)=>(<div key={i} style={{ marginBottom:8 }}>{(!masterPassed||i>=unlockedCount)?(<div style={{ borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", background:"rgba(255,255,255,0.7)", padding:"14px 16px", opacity:0.5, pointerEvents:"none" as const, display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ color:"#6B7280", fontSize:13, fontWeight:600 }}>{s.phase} — {s.label}</span><span style={{ fontSize:16 }}>🔒</span></div>):(<div><div style={{ borderRadius:14, border:"1px solid rgba(22,163,74,0.3)", background:"rgba(255,255,255,0.9)", padding:"14px 16px", marginBottom:8 }}><div style={{ color:"#15803d", fontSize:13, fontWeight:700, marginBottom:6 }}>{s.phase} — {s.label}</div><div style={{ color:"#334155", fontSize:13, lineHeight:1.6 }}>{s.prompt}</div></div><button onClick={()=>setUnlockedCount(v=>Math.max(v,i+2))} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}
      {allPassed&&(<div style={{ borderRadius:16, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:"1.25rem 1.5rem", marginTop:16, textAlign:"center" }}><div style={{ fontSize:28, marginBottom:8 }}>🏆</div><div style={{ color:"#14532d", fontWeight:800, fontSize:16, marginBottom:4 }}>כל הכבוד — השלמת את הרמה המתקדמת!</div><div style={{ color:"#166534", fontSize:13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}
    </div>
  );
}

/* ─── Exercise Data ────────────────────────────────────────────────────────── */

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "אירועים זרים ואירועים משלימים",
    problem: "מטילים קובייה הוגנת פעם אחת.\nA = \"התקבל מספר זוגי\".\nB = \"התקבל מספר אי-זוגי\".\n\nא. רשמו את מרחב המדגם ואת האירועים A ו-B.\nב. האם A ו-B אירועים זרים? הסבירו.\nג. חשבו את P(A∪B) ואת P(A∩B).",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בין זרים למשלימים", text: "אירועים זרים = חיתוך ריק (לא יכולים לקרות יחד). אירועים משלימים = גם זרים וגם מכסים את כל מרחב המדגם. כל משלימים הם זרים, אבל לא כל זרים הם משלימים." },
      { title: "⚠️ P(A∪B) ≠ P(A) + P(B) תמיד", text: "הנוסחה P(A)+P(B) עובדת רק כשהאירועים זרים. אם יש חיתוך — חייבים לחסר P(A∩B) כדי לא לספור פעמיים." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י' ומצרף/ת שאלה על אירועים בהסתברות — אירועים זרים, משלימים, חיתוך ואיחוד. אני רוצה שתהיה המורה הפרטי שלי — תסביר לי את הלוגיקה ולא תיתן תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"מרחב מדגם ואירועים", coaching:"", prompt:"מטילים קובייה הוגנת. A = זוגי, B = אי-זוגי. תנחה אותי לרשום את מרחב המדגם Ω ואת האיברים של כל אירוע.", keywords:[], keywordHint:"", contextWords:["מרחב מדגם","אירוע","זוגי","אי-זוגי","קובייה","תוצאות"] },
      { phase:"סעיף ב׳", label:"בדיקת אירועים זרים", coaching:"", prompt:"A = {2,4,6}, B = {1,3,5}. תכווין אותי — איך בודקים אם שני אירועים זרים, ומה הקשר למשלימים.", keywords:[], keywordHint:"", contextWords:["זרים","חיתוך","ריק","משלימים","הגדרה","בו-זמנית"] },
      { phase:"סעיף ג׳", label:"חישוב P(A∪B) ו-P(A∩B)", coaching:"", prompt:"A ו-B זרים. תדריך אותי לחשב P(A∪B) ו-P(A∩B) — מה הנוסחה כשהאירועים זרים.", keywords:[], keywordHint:"", contextWords:["הסתברות","איחוד","חיתוך","זרים","חיבור","אפס"] },
    ],
  },
  {
    id: "medium",
    title: "נוסחת האיחוד — דיאגרמת ון",
    problem: "בכיתה של 40 תלמידים: 25 משחקים כדורגל, 18 משחקים כדורסל, ו-10 משחקים את שניהם.\n\nא. ציירו דיאגרמת ון ומלאו את כל האזורים.\nב. חשבו את ההסתברות שתלמיד שנבחר משחק כדורגל או כדורסל.\nג. חשבו את ההסתברות שתלמיד שנבחר לא משחק אף אחד מהם.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ שכחת חיסור החיתוך באיחוד", text: "P(A∪B) = P(A) + P(B) − P(A∩B). אם לא מחסרים את החיתוך, סופרים תלמידים שמשחקים שניהם פעמיים ומקבלים תוצאה גדולה מדי." },
      { title: "⚠️ מילוי שגוי של דיאגרמת ון", text: "קודם ממלאים את החיתוך (10), ורק אז את האזורים הבלעדיים (כדורגל בלבד = 25−10 = 15, כדורסל בלבד = 18−10 = 8). אם ממלאים 25 בצד שמאל — שכחתם לחסר את החיתוך." },
    ],
    goldenPrompt: `אני בכיתה י', ומצרף/ת תרגיל על חיתוך ואיחוד אירועים — דיאגרמת ון ונוסחת האיחוד.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על מילוי הדיאגרמה ושימוש בנוסחה.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"דיאגרמת ון", coaching:"", prompt:"25 כדורגל, 18 כדורסל, 10 שניהם, 40 בכיתה. תנחה אותי למלא דיאגרמת ון — מה ממלאים קודם ולמה.", keywords:[], keywordHint:"", contextWords:["דיאגרמת ון","חיתוך","אזור","מילוי","חיסור","בלעדי"] },
      { phase:"סעיף ב׳", label:"P(A∪B)", coaching:"", prompt:"מצאנו את כל האזורים בדיאגרמה. תכווין אותי לחשב P(כדורגל או כדורסל) — מה הנוסחה ואיך מציבים.", keywords:[], keywordHint:"", contextWords:["הסתברות","איחוד","נוסחה","חיתוך","חיסור","חילוק"] },
      { phase:"סעיף ג׳", label:"P(משלים)", coaching:"", prompt:"ידוע P(A∪B). תדריך אותי — איך מוצאים את ההסתברות שתלמיד לא משחק כלום, בעזרת המשלים.", keywords:[], keywordHint:"", contextWords:["משלים","הסתברות","אחד","מינוס","לא","חיסור"] },
    ],
  },
  {
    id: "advanced",
    title: "שילוב נוסחאות — שלושה אירועים",
    problem: "בסקר בקרב 100 אנשים:\n60 אוהבים שוקולד (A), 45 אוהבים וניל (B), 30 אוהבים תות (C).\nA∩B = 20, A∩C = 15, B∩C = 12, A∩B∩C = 5.\n\nא. חשבו כמה אנשים אוהבים לפחות אחת מהטעמים.\nב. חשבו כמה אנשים לא אוהבים אף טעם.\nג. חשבו כמה אנשים אוהבים בדיוק טעם אחד.\nד. מהי ההסתברות שאדם שנבחר אוהב בדיוק שני טעמים?",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ נוסחת ההכלה-הדחה לשלושה אירועים", text: "|A∪B∪C| = |A|+|B|+|C| − |A∩B| − |A∩C| − |B∩C| + |A∩B∩C|. תלמידים שוכחים להוסיף חזרה את החיתוך המשולש — בלי זה, הוא נחסר יותר מדי פעמים." },
      { title: "⚠️ בלבול בין 'לפחות אחד' ל'בדיוק אחד'", text: "'לפחות אחד' = A∪B∪C (כולל מי שאוהב שניים או שלושה). 'בדיוק אחד' = רק אזורים בלעדיים בדיאגרמה. חייבים לחסר את כל החיתוכים." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: מה נוסחת ההכלה-הדחה לשלושה אירועים, ומה ההבדל בין 'לפחות' ל'בדיוק'? (לפחות 80 תווים)",
    steps: [
      { phase:"סעיף א׳", label:"לפחות טעם אחד (הכלה-הדחה)", coaching:"", prompt:"A=60, B=45, C=30, A∩B=20, A∩C=15, B∩C=12, A∩B∩C=5. תנחה אותי להשתמש בנוסחת הכלה-הדחה כדי למצוא |A∪B∪C|.", keywords:[], keywordHint:"", contextWords:["הכלה","הדחה","איחוד","חיתוך","חיבור","חיסור"] },
      { phase:"סעיף ב׳", label:"אף טעם (משלים)", coaching:"", prompt:"מצאנו |A∪B∪C|. מתוך 100 אנשים, תכווין אותי — כמה לא אוהבים אף טעם ומה ההסתברות.", keywords:[], keywordHint:"", contextWords:["משלים","חיסור","אף","100","הסתברות","מינוס"] },
      { phase:"סעיף ג׳", label:"בדיוק טעם אחד", coaching:"", prompt:"תדריך אותי למצוא כמה אוהבים בדיוק טעם אחד — איך מחסרים חיתוכים מכל אירוע, ולמה מוסיפים חזרה את החיתוך המשולש.", keywords:[], keywordHint:"", contextWords:["בדיוק","אחד","בלעדי","חיסור","חיתוך","הוספה"] },
      { phase:"סעיף ד׳", label:"בדיוק שני טעמים", coaching:"", prompt:"תנחה אותי — 'בדיוק שניים' = אלו שבחיתוך של שני אירועים אבל לא בחיתוך המשולש. איך מחשבים ומה ההסתברות.", keywords:[], keywordHint:"", contextWords:["בדיוק","שניים","חיתוך","מינוס","משולש","הסתברות"] },
    ],
  },
];

/* ─── ExerciseCard ──────────────────────────────────────────────────────────── */

function ExerciseCard({ ex }: { ex:ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem,setCopiedProblem]=useState(false);
  function handleCopyProblem(){ navigator.clipboard.writeText(ex.problem.split(/\n+[אבגדהוזחט]\./)[0].trim()); setCopiedProblem(true); setTimeout(()=>setCopiedProblem(false),2000); }
  return (
    <section style={{ border:`1px solid ${s.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)" }}>
      {/* Properties */}
      <div style={{ borderRadius:16, border:`1px solid ${s.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.25rem 1.5rem", marginBottom:"2rem", boxShadow:s.glowShadow }}>
        <div style={{ textAlign:"center", marginBottom:14 }}>
          <div style={{ color:s.accentColor, fontSize:15, fontWeight:800, marginBottom:4 }}>🎲 אירועים בהסתברות</div>
          <div style={{ color:"#6B7280", fontSize:12, lineHeight:1.55 }}>
            {ex.id==="basic"&&"אירועים זרים ומשלימים — חיתוך ריק, סכום = 1."}
            {ex.id==="medium"&&"נוסחת איחוד, דיאגרמת ון ואירוע משלים."}
            {ex.id==="advanced"&&"הכלה-הדחה לשלושה אירועים — 'לפחות' לעומת 'בדיוק'."}
          </div>
        </div>
        <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:14 }}/>
        <div style={{ marginBottom:12 }}>
          <div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>🎯 מושגי יסוד</div>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:120 }}>A∩B (חיתוך)</span><span>A וגם B — שניהם מתקיימים</span></div>
            <div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:120 }}>A∪B (איחוד)</span><span>A או B — לפחות אחד מתקיים</span></div>
            <div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:120 }}>Ā (משלים)</span><span>לא A — P(Ā) = 1 − P(A)</span></div>
          </div>
        </div>
        {ex.id!=="basic"&&(<><div style={{ height:1, background:"rgba(60,54,42,0.08)", marginBottom:12 }}/><div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>✨ נוסחת האיחוד</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:140 }}>P(A∪B)</span><span>= P(A)+P(B)−P(A∩B)</span></div>{ex.id==="advanced"&&<div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:140 }}>P(A∪B∪C)</span><span>= ΣP − ΣP(∩₂) + P(∩₃)</span></div>}</div></div></>)}
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:"2rem" }}><span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span><h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin:0 }}>{s.stationName}</h2></div>
      <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:"2rem" }}/>
      <div style={{ borderRadius:16, border:`1px solid ${s.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:s.glowShadow }}>{ex.diagram}</div>
      <div style={{ borderRadius:16, border:`1px solid rgba(${s.borderRgb},0.35)`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", marginBottom:"2rem" }}><div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}><div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600 }}>📝 השאלה</div><button onClick={handleCopyProblem} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:8, cursor:"pointer", background:copiedProblem?"rgba(22,163,74,0.1)":"rgba(107,114,128,0.08)", border:"1px solid rgba(107,114,128,0.2)", color:copiedProblem?"#15803d":"#6B7280", fontSize:11, fontWeight:600, transition:"all 0.2s", whiteSpace:"nowrap" }}>{copiedProblem?<Check size={11}/>:<Copy size={11}/>}{copiedProblem?"הועתק!":"העתק"}</button></div><pre style={{ color:"#1A1A1A", fontSize:14, lineHeight:1.6, whiteSpace:"pre-wrap", fontFamily:"inherit", margin:0 }}>{ex.problem}</pre></div>
      <div style={{ marginBottom:"2rem" }}><div style={{ color:"#DC2626", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>⚠️ שגיאות נפוצות</div>{ex.pitfalls.map((p,i)=>(<div key={i} style={{ borderRadius:12, border:"1px solid rgba(220,38,38,0.2)", background:"rgba(220,38,38,0.05)", padding:"0.85rem 1rem", marginBottom:8 }}><div style={{ color:"#DC2626", fontWeight:600, fontSize:14, marginBottom:p.text?4:0 }}>{p.title}</div>{p.text&&<div style={{ color:"#2D3436", fontSize:13.5, lineHeight:1.65 }}>{p.text}</div>}</div>))}</div>
      <div style={{ borderRadius:16, border:`1px solid ${s.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.25rem", boxShadow:s.glowShadow }}><div style={{ color:"#1A1A1A", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:16 }}>🧠 מדריך הפרומפטים</div>{ex.id==="basic"&&<LadderBase steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb}/>}{ex.id==="medium"&&<LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb}/>}</div>
      {ex.id==="advanced"&&<LadderAdvanced steps={ex.steps}/>}
    </section>
  );
}

/* ─── DisjointLab (basic) ──────────────────────────────────────────────────── */

function DisjointLab() {
  const [pA,setPa]=useState(0.3);
  const [pB,setPb]=useState(0.4);
  const st=STATION.basic;
  const pUnion=Math.min(pA+pB,1);
  const pCompA=1-pA;
  const remaining=1-pA-pB;
  const valid=remaining>=0;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת אירועים זרים</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו P(A) ו-P(B) (אירועים זרים) — צפו באיחוד ובמשלים.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 2rem" }}>
        {[{label:"P(A)",val:pA,set:setPa},{label:"P(B)",val:pB,set:setPb}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:valid?st.accentColor:"#DC2626", fontFamily:"monospace", fontWeight:700 }}>{s.val.toFixed(2)}</span></div><input type="range" min={0} max={1} step={0.05} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      {/* Venn SVG */}
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 260 120" className="w-full max-w-md mx-auto" aria-hidden>
          <circle cx={85} cy={60} r={40+pA*20} fill="rgba(22,163,74,0.1)" stroke="#16A34A" strokeWidth={2}/>
          <circle cx={185} cy={60} r={40+pB*20} fill="rgba(22,163,74,0.1)" stroke="#16A34A" strokeWidth={2}/>
          <text x={85} y={55} fontSize={14} fill="#16A34A" textAnchor="middle" fontFamily="monospace" fontWeight={700}>{(pA*100).toFixed(0)}%</text>
          <text x={85} y={70} fontSize={10} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">A</text>
          <text x={185} y={55} fontSize={14} fill="#16A34A" textAnchor="middle" fontFamily="monospace" fontWeight={700}>{(pB*100).toFixed(0)}%</text>
          <text x={185} y={70} fontSize={10} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">B</text>
          {!valid&&<text x={135} y={110} fontSize={11} fill="#DC2626" textAnchor="middle" fontFamily="sans-serif">P(A)+P(B) &gt; 1!</text>}
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"P(A∪B)",val:valid?(pUnion*100).toFixed(0)+"%":"—"},{label:"P(A∩B)",val:"0%"},{label:"P(Ā)",val:(pCompA*100).toFixed(0)+"%"},{label:"נותר",val:valid?(remaining*100).toFixed(0)+"%":"—"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:18, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>כשהאירועים זרים: P(A∪B) = P(A)+P(B). מה קורה כשהסכום חורג מ-1?</p>
    </section>
  );
}

/* ─── VennLab (medium) ─────────────────────────────────────────────────────── */

function VennLab() {
  const [sA,setSA]=useState(25);
  const [sB,setSB]=useState(18);
  const [inter,setInter]=useState(10);
  const st=STATION.medium;
  const total=40;
  const maxInter=Math.min(sA,sB);
  const ci=Math.min(inter,maxInter);
  const onlyA=sA-ci, onlyB=sB-ci;
  const union=onlyA+onlyB+ci;
  const neither=total-union;
  const pUnion=union/total, pNeither=Math.max(0,neither)/total;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת דיאגרמת ון</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו |A|, |B| ו-|A∩B| — צפו כיצד משתנים האיחוד והמשלים.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, maxWidth:500, margin:"0 auto 2rem" }}>
        {[{label:"|A| (כדורגל)",val:sA,set:setSA,max:40},{label:"|B| (כדורסל)",val:sB,set:setSB,max:40},{label:"|A∩B| (חיתוך)",val:ci,set:setInter,max:maxInter}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:12, border:"1px solid rgba(255,255,255,0.4)", padding:"0.75rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={0} max={s.max} step={1} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 280 170" className="w-full max-w-md mx-auto" aria-hidden>
          <circle cx={100} cy={80} r={55} fill="rgba(234,88,12,0.1)" stroke="#EA580C" strokeWidth={2}/><text x={60} y={48} fontSize={13} fill="#EA580C" fontWeight={700} textAnchor="middle">A</text>
          <circle cx={180} cy={80} r={55} fill="rgba(59,130,246,0.1)" stroke="#3b82f6" strokeWidth={2}/><text x={220} y={48} fontSize={13} fill="#3b82f6" fontWeight={700} textAnchor="middle">B</text>
          <text x={75} y={88} fontSize={18} fill="#EA580C" textAnchor="middle" fontFamily="monospace" fontWeight={700}>{Math.max(0,onlyA)}</text>
          <text x={140} y={88} fontSize={18} fill="#f59e0b" textAnchor="middle" fontFamily="monospace" fontWeight={700}>{ci}</text>
          <text x={205} y={88} fontSize={18} fill="#3b82f6" textAnchor="middle" fontFamily="monospace" fontWeight={700}>{Math.max(0,onlyB)}</text>
          <text x={140} y={162} fontSize={12} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">מחוץ: {Math.max(0,neither)}</text>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"|A∪B|",val:String(Math.max(0,union))},{label:"P(A∪B)",val:(pUnion*100).toFixed(1)+"%"},{label:"P(אף אחד)",val:(Math.max(0,pNeither)*100).toFixed(1)+"%"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:20, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>הגדילו את החיתוך — מה קורה לאיחוד? (P(A∪B) = P(A)+P(B)−P(A∩B))</p>
    </section>
  );
}

/* ─── InclusionExclusionLab (advanced) ─────────────────────────────────────── */

function InclusionExclusionLab() {
  const [nA,setNA]=useState(60); const [nB,setNB]=useState(45); const [nC,setNC]=useState(30);
  const [ab,setAB]=useState(20); const [ac,setAC]=useState(15); const [bc,setBC]=useState(12); const [abc,setABC]=useState(5);
  const st=STATION.advanced;
  const total=100;
  const unionSize=nA+nB+nC-ab-ac-bc+abc;
  const neither=total-unionSize;
  const exactlyOne=(nA-ab-ac+abc)+(nB-ab-bc+abc)+(nC-ac-bc+abc);
  const exactlyTwo=(ab-abc)+(ac-abc)+(bc-abc);
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת הכלה-הדחה</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו את גודלי האירועים והחיתוכים — צפו בתוצאות נוסחת ההכלה-הדחה.</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, maxWidth:550, margin:"0 auto 2rem" }}>
        {[{label:"|A|",val:nA,set:setNA,max:100},{label:"|B|",val:nB,set:setNB,max:100},{label:"|C|",val:nC,set:setNC,max:100},{label:"|A∩B∩C|",val:abc,set:setABC,max:Math.min(ab,ac,bc)}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:12, border:"1px solid rgba(255,255,255,0.4)", padding:"0.75rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={0} max={s.max} step={1} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, maxWidth:450, margin:"0 auto 2rem" }}>
        {[{label:"|A∩B|",val:ab,set:setAB,max:Math.min(nA,nB)},{label:"|A∩C|",val:ac,set:setAC,max:Math.min(nA,nC)},{label:"|B∩C|",val:bc,set:setBC,max:Math.min(nB,nC)}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:12, border:"1px solid rgba(255,255,255,0.4)", padding:"0.75rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={0} max={s.max} step={1} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      {/* Tiles */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"|A∪B∪C|",val:String(unionSize)},{label:"אף אחד",val:String(Math.max(0,neither))},{label:"בדיוק 1",val:String(Math.max(0,exactlyOne))},{label:"בדיוק 2",val:String(Math.max(0,exactlyTwo))}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:18, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>שימו לב: |A∪B∪C| = |A|+|B|+|C| − |A∩B| − |A∩C| − |B∩C| + |A∩B∩C|</p>
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
  const [activeTab,setActiveTab]=useState<"disjoint"|"union"|"inclusion"|null>(null);
  const tabs=[
    {id:"disjoint" as const,label:"🔀 זרים ומשלימים",tex:"A \\cap B = \\emptyset",color:"#16A34A",borderColor:"rgba(22,163,74,0.35)"},
    {id:"union" as const,label:"🔗 נוסחת איחוד",tex:"P(A \\cup B)",color:"#EA580C",borderColor:"rgba(234,88,12,0.35)"},
    {id:"inclusion" as const,label:"📊 הכלה-הדחה",tex:"|A \\cup B \\cup C|",color:"#DC2626",borderColor:"rgba(220,38,38,0.35)"},
  ];
  return (
    <div style={{ borderRadius:12, border:"1px solid rgba(60,54,42,0.15)", background:"rgba(255,255,255,0.75)", padding:"1.25rem", marginBottom:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginBottom:12, textAlign:"center" }}>נוסחאות</div>
      <div style={{ display:"flex", gap:6, marginBottom:activeTab?14:0 }}>
        {tabs.map(t=>{const isA=activeTab===t.id;return(<button key={t.id} onClick={()=>setActiveTab(isA?null:t.id)} style={{ flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", border:`1.5px solid ${isA?t.borderColor:"rgba(60,54,42,0.1)"}`, background:isA?`${t.color}0D`:"rgba(60,54,42,0.03)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{ fontSize:11, fontWeight:700, color:isA?t.color:"#6B7280" }}>{t.label}</span><span style={{ color:isA?t.color:"#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>);})}
      </div>
      {activeTab==="disjoint"&&(<motion.div key="d" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(22,163,74,0.25)", background:"rgba(220,252,231,0.4)", padding:16 }}><div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>זרים ומשלימים</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>זרים:</strong> A∩B = ∅. אז P(A∪B) = P(A)+P(B).</li><li><strong>משלימים:</strong> A∩Ā = ∅ וגם A∪Ā = Ω. אז P(Ā) = 1−P(A).</li><li>כל משלימים הם זרים, אבל לא כל זרים הם משלימים.</li></ol></div><div style={{ marginTop:10, color:"#15803d", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: קובייה — P(זוגי)+P(אי-זוגי) = ½+½ = 1 → משלימים</div></div></div></motion.div>)}
      {activeTab==="union"&&(<motion.div key="u" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(234,88,12,0.25)", background:"rgba(255,247,237,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"P(A \\cup B) = P(A) + P(B) - P(A \\cap B)"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(234,88,12,0.06)", border:"1px solid rgba(234,88,12,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>למה מחסרים?</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>P(A)+P(B) סופר את החיתוך פעמיים.</li><li>לכן מחסרים P(A∩B) פעם אחת.</li><li>אם A ו-B זרים: P(A∩B)=0 והנוסחה מתפשטת.</li></ol></div><div style={{ marginTop:10, color:"#B45309", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: P(A)=0.6, P(B)=0.4, P(A∩B)=0.2 → P(A∪B)=0.8</div></div></div></motion.div>)}
      {activeTab==="inclusion"&&(<motion.div key="i" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(220,38,38,0.25)", background:"rgba(254,242,242,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"|A \\cup B \\cup C| = |A|{+}|B|{+}|C| - |A{\\cap}B| - |A{\\cap}C| - |B{\\cap}C| + |A{\\cap}B{\\cap}C|"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>הכלה-הדחה (3 אירועים)</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>מחברים שלושת הגדלים.</li><li>מחסרים שלושת החיתוכים הזוגיים (נספרו פעמיים).</li><li>מוסיפים חזרה את החיתוך המשולש (נחסר יותר מדי).</li></ol></div><div style={{ marginTop:10, color:"#DC2626", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: 60+45+30−20−15−12+5 = 93 מתוך 100</div></div></div></motion.div>)}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function EventsPage() {
  const [selectedLevel,setSelectedLevel]=useState<"basic"|"medium"|"advanced">("basic");
  const ex=exercises.find(e=>e.id===selectedLevel)!;
  const lvlRgb=selectedLevel==="basic"?"45,90,39":selectedLevel==="medium"?"163,79,38":"139,38,53";
  return (
    <main style={{ minHeight:"100vh", background:"#F3EFE0", backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:"#2D3436", ["--lvl-rgb" as string]:lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`textarea,input[type="text"],input[type="password"]{outline:none!important}textarea:focus,input[type="text"]:focus{outline:none!important;border-color:rgba(var(--lvl-rgb),0.65)!important;box-shadow:0 0 0 3px rgba(var(--lvl-rgb),0.12)!important}input[type="range"]{outline:none!important}input[type="range"]:focus{outline:none!important}button:focus,button:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(var(--lvl-rgb),0.35)!important}button:focus:not(:focus-visible){box-shadow:none!important}`}</style>
      <div style={{ borderBottom:"1px solid rgba(60,54,42,0.15)", background:"#F3EFE0" }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div><h1 style={{ fontSize:22, fontWeight:700, color:"#2D3436", margin:0 }}>אירועים בהסתברות עם AI — כיתה י׳ (3 יח׳)</h1><p style={{ fontSize:13, color:"#6B7280", margin:"2px 0 0" }}>זרים, משלימים, חיתוך, איחוד, הכלה-הדחה — ואיך לשאול AI את השאלות הנכונות</p></div>
          <Link href="/3u/topic/grade10/probability" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap", transition:"background 0.15s" }} onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D";}} onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A";}}><span style={{ fontSize:16 }}>←</span>חזרה</Link>
        </div>
      </div>
      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="3u/grade10/probability/events"/>
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(60,54,42,0.15)" }}>{TABS.map(tab=>{const active=selectedLevel===tab.id;return(<button key={tab.id} onClick={()=>setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active?`${tab.bg} border ${tab.border} ${tab.textColor}`:"text-stone-500 hover:text-stone-800"}`} style={active?{boxShadow:`0 0 14px ${tab.glowColor}`}:undefined}>{tab.label}</button>);})}</div>
        <FormulaBar/>
        <motion.div key={selectedLevel} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22}}><ExerciseCard ex={ex}/></motion.div>
        {selectedLevel==="basic"&&<DisjointLab/>}
        {selectedLevel==="medium"&&<VennLab/>}
        {selectedLevel==="advanced"&&<InclusionExclusionLab/>}
        <div style={{ marginTop:"1.5rem" }}><MarkComplete subtopicId="3u/grade10/probability/events" level={selectedLevel}/></div>
      </div>
    </main>
  );
}
