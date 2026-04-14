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
  for (let i = 0; i <= 50; i++) { const x = 40 + i * 3.8; const t = i / 15; pts.push(`${x},${140 - 100 * (1 - Math.exp(-0.5 * t)) * 1.1}`); }
  return (
    <svg viewBox="0 0 260 170" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={20} x2={40} y2={150} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={140} x2={240} y2={140} stroke="#94a3b8" strokeWidth={1.2} />
      <polyline points={pts.join(" ")} fill="none" stroke="#16A34A" strokeWidth={2.5} opacity={0.7} />
      <text x={30} y={16} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">N(t)</text>
      <text x={240} y={155} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">t</text>
      <circle cx={40} cy={140 - 100 * 0} r={4} fill="#f59e0b" />
      <text x={48} y={142} fontSize={9} fill="#f59e0b" fontFamily="sans-serif">N₀</text>
    </svg>
  );
}

function MediumSVG() {
  const pts: string[] = [];
  for (let i = 0; i <= 50; i++) { const x = 40 + i * 3.8; const t = i / 10; pts.push(`${x},${35 + 100 * Math.exp(-0.3 * t)}`); }
  return (
    <svg viewBox="0 0 260 170" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={20} x2={40} y2={150} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={140} x2={240} y2={140} stroke="#94a3b8" strokeWidth={1.2} />
      <polyline points={pts.join(" ")} fill="none" stroke="#EA580C" strokeWidth={2.5} opacity={0.7} />
      {/* Half-life line */}
      <line x1={40} y1={85} x2={240} y2={85} stroke="#a78bfa" strokeWidth={1} strokeDasharray="5,3" opacity={0.4} />
      <text x={242} y={82} fontSize={9} fill="#a78bfa" fontFamily="sans-serif">N₀/2</text>
      <text x={240} y={155} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">t</text>
      <text x={200} y={130} fontSize={10} fill="#EA580C" fontFamily="serif">דעיכה</text>
    </svg>
  );
}

function AdvancedSVG() {
  const pts1: string[] = [], pts2: string[] = [];
  for (let i = 0; i <= 50; i++) { const x = 40 + i * 3.8; const t = i / 12; pts1.push(`${x},${140 - 90 * (Math.exp(0.2 * t) - 1) / (Math.exp(0.2 * 4) - 1)}`); pts2.push(`${x},${140 - 90 * Math.exp(-0.3 * t)}`); }
  return (
    <svg viewBox="0 0 260 170" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={20} x2={40} y2={155} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={140} x2={240} y2={140} stroke="#94a3b8" strokeWidth={1.2} />
      <polyline points={pts1.join(" ")} fill="none" stroke="#34d399" strokeWidth={2} opacity={0.7} />
      <polyline points={pts2.join(" ")} fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.7} />
      <text x={220} y={42} fontSize={10} fill="#34d399" fontFamily="sans-serif">k&gt;0</text>
      <text x={220} y={128} fontSize={10} fill="#DC2626" fontFamily="sans-serif">k&lt;0</text>
      <text x={130} y={160} fontSize={10} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">N₀·eᵏᵗ</text>
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
function LadderAdvanced({ steps }: { steps:PromptStep[] }) { const [masterPassed,setMasterPassed]=useState(false); const [unlockedCount,setUnlockedCount]=useState(1); const allPassed=masterPassed&&unlockedCount>steps.length; return (<div><MasterPromptGate onPass={()=>setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["גדילה","דעיכה","eᵏᵗ","N₀","חצי חיים","הכפלה","מודל"]}/>{steps.map((s,i)=>(<div key={i} style={{ marginBottom:8 }}>{(!masterPassed||i>=unlockedCount)?(<div style={{ borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", background:"rgba(255,255,255,0.7)", padding:"14px 16px", opacity:0.5, pointerEvents:"none" as const, display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ color:"#6B7280", fontSize:13, fontWeight:600 }}>{s.phase} — {s.label}</span><span style={{ fontSize:16 }}>🔒</span></div>):(<div><div style={{ borderRadius:14, border:"1px solid rgba(22,163,74,0.3)", background:"rgba(255,255,255,0.9)", padding:"14px 16px", marginBottom:8 }}><div style={{ color:"#15803d", fontSize:13, fontWeight:700, marginBottom:6 }}>{s.phase} — {s.label}</div><div style={{ color:"#334155", fontSize:13, lineHeight:1.6 }}>{s.prompt}</div></div><button onClick={()=>setUnlockedCount(v=>Math.max(v,i+2))} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}{allPassed&&(<div style={{ borderRadius:16, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:"1.25rem 1.5rem", marginTop:16, textAlign:"center" }}><div style={{ fontSize:28, marginBottom:8 }}>🏆</div><div style={{ color:"#14532d", fontWeight:800, fontSize:16, marginBottom:4 }}>כל הכבוד!</div><div style={{ color:"#166534", fontSize:13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}</div>); }

/* ─── Exercise Data ────────────────────────────────────────────────────────── */

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "גדילה מעריכית — N(t) = N₀·eᵏᵗ",
    problem: "אוכלוסיית חיידקים מתוארת על ידי N(t) = N₀·eᵏᵗ.\nבהתחלה (t=0) יש N₀ חיידקים. לאחר שעה הכמות הוכפלה.\n\nא. הסבירו: מהו N₀ ומהו k.\nב. מצאו את k בעזרת התנאי N(1) = 2N₀.\nג. לאחר כמה שעות יהיו 8N₀ חיידקים?",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ k לא שווה ל-2", text: "N(1) = 2N₀ → N₀·eᵏ = 2N₀ → eᵏ = 2 → k = ln 2 ≈ 0.693. תלמידים כותבים k=2 כי 'הוכפל' — שגיאה! צריך לוגריתם." },
      { title: "⚠️ בלבול בין זמן הכפלה לקבוע k", text: "זמן הכפלה T = ln 2 / k. k הוא קצב הגדילה (ליחידת זמן). T הוא כמה זמן לוקח להכפיל. אלו גדלים הפוכים." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יב', 5 יחידות, ומצרף/ת שאלה על גדילה מעריכית — N₀·eᵏᵗ, מציאת k מנתונים. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"N₀ ו-k", coaching:"", prompt:"N(t) = N₀·eᵏᵗ. תנחה אותי — מהו N₀ (ערך התחלתי) ומהו k (קצב גדילה). מתי k>0 ומתי k<0.", keywords:[], keywordHint:"", contextWords:["N₀","k","התחלתי","קצב","גדילה","מעריכי"] },
      { phase:"סעיף ב׳", label:"מציאת k", coaching:"", prompt:"N(1) = 2N₀. תכווין אותי — N₀·eᵏ = 2N₀ → eᵏ = 2 → k = ln 2. למה משתמשים ב-ln.", keywords:[], keywordHint:"", contextWords:["ln","eᵏ","2","הכפלה","לוגריתם","k"] },
      { phase:"סעיף ג׳", label:"מציאת זמן", coaching:"", prompt:"k = ln 2. מתי N(t) = 8N₀? תדריך אותי — eᵏᵗ = 8 → kt = ln 8 → t = ln 8 / ln 2 = 3.", keywords:[], keywordHint:"", contextWords:["זמן","ln","8","חילוק","שעות","הצבה"] },
    ],
  },
  {
    id: "medium",
    title: "דעיכה — חצי חיים",
    problem: "חומר רדיואקטיבי מתפרק: N(t) = N₀·e⁻ˡᵗ, λ > 0.\nחצי החיים (זמן שבו נותר חצי מהחומר) הוא T.\n\nא. הוכיחו: T = ln 2 / λ.\nב. אם T = 5 שנים, כמה נותר אחרי 15 שנה?\nג. לאחר כמה שנים יישאר 10% מהכמות ההתחלתית?",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ דעיכה = k שלילי (או λ חיובי עם מינוס)", text: "N(t) = N₀·e⁻ˡᵗ (מינוס!) כי הכמות יורדת. תלמידים שוכחים את המינוס ומקבלים גדילה במקום דעיכה." },
      { title: "⚠️ 15 שנה = 3 חצאי חיים, לא 3 חלוקות", text: "אחרי T: N₀/2. אחרי 2T: N₀/4 (לא N₀/3!). אחרי 3T: N₀/8. כל חצי חיים מחלק ב-2, לא מחסר כמות קבועה." },
    ],
    goldenPrompt: `אני בכיתה יב', 5 יחידות, מצרף/ת תרגיל על דעיכה מעריכית — חצי חיים, מציאת λ, שארית.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על הקשר בין λ ל-T.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"הוכחת T = ln2/λ", coaching:"", prompt:"N(T) = N₀/2 → N₀·e⁻ˡᵀ = N₀/2 → e⁻ˡᵀ = ½. תנחה אותי לבודד T.", keywords:[], keywordHint:"", contextWords:["חצי חיים","ln","λ","T","הוכחה","½"] },
      { phase:"סעיף ב׳", label:"שארית אחרי 15 שנה", coaching:"", prompt:"T=5, 15 שנה = 3T. תכווין אותי — N(15) = N₀·(½)³ = N₀/8. גם אפשר דרך e⁻ˡᵗ.", keywords:[], keywordHint:"", contextWords:["שארית","חצי","3T","N₀/8","הצבה","חישוב"] },
      { phase:"סעיף ג׳", label:"10% — מציאת זמן", coaching:"", prompt:"N(t) = 0.1·N₀ → e⁻ˡᵗ = 0.1 → λt = ln 10 → t = ln 10 / λ. תדריך אותי.", keywords:[], keywordHint:"", contextWords:["10%","ln 10","זמן","λ","חילוק","שנים"] },
    ],
  },
  {
    id: "advanced",
    title: "בניית מודל מנתונים + שאלות שילוב",
    problem: "אוכלוסייה גדלה: ב-t=0 היו 500 ואחרי 3 שנים 1500.\n\nא. בנו את המודל N(t) = N₀·eᵏᵗ — מצאו N₀ ו-k.\nב. מתי האוכלוסייה תגיע ל-10,000?\nג. מהו קצב הגדילה N'(t) ומה ערכו ב-t=0?\nד. שרטטו סקיצה של N(t) וציינו את הנקודות שחישבתם.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ N₀ = N(0), לא כל מספר התחלתי", text: "N₀ = 500 (הערך ב-t=0). תלמידים מציבים N₀ = 1500 (הערך ב-t=3) — שגיאה שמשפיעה על כל השאר." },
      { title: "⚠️ N'(t) = k·N(t), לא k·N₀", text: "קצב הגדילה משתנה עם הזמן! N'(t) = k·N₀·eᵏᵗ = k·N(t). ב-t=0: N'(0) = k·500. ב-t=3: N'(3) = k·1500. הקצב גדל כי האוכלוסייה גדלה." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: איך בונים מודל N₀·eᵏᵗ משני נתונים, ומה הנגזרת N'(t) מייצגת? (לפחות 80 תווים)",
    steps: [
      { phase:"סעיף א׳", label:"בניית מודל", coaching:"", prompt:"N(0)=500 → N₀=500. N(3)=1500 → 500·e³ᵏ=1500 → e³ᵏ=3 → k=ln3/3. תנחה אותי.", keywords:[], keywordHint:"", contextWords:["N₀","k","ln","3","הצבה","מודל"] },
      { phase:"סעיף ב׳", label:"מציאת זמן ל-10000", coaching:"", prompt:"N(t)=10000 → 500·eᵏᵗ=10000 → eᵏᵗ=20 → t=ln20/k. תכווין אותי לחשב.", keywords:[], keywordHint:"", contextWords:["זמן","10000","ln 20","k","חילוק","שנים"] },
      { phase:"סעיף ג׳", label:"קצב גדילה N'(t)", coaching:"", prompt:"N'(t) = k·N₀·eᵏᵗ = k·N(t). תדריך אותי — מהו N'(0) ומה המשמעות.", keywords:[], keywordHint:"", contextWords:["נגזרת","קצב","N'","k·N","גדילה","משמעות"] },
      { phase:"סעיף ד׳", label:"סקיצה", coaching:"", prompt:"תנחה אותי — נקודות: (0,500), (3,1500), (t*,10000). עקומה עולה. אסימפטוטה?", keywords:[], keywordHint:"", contextWords:["סקיצה","נקודות","עולה","עקומה","שרטוט","מעריכי"] },
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
        <div style={{ textAlign:"center", marginBottom:14 }}><div style={{ color:s.accentColor, fontSize:15, fontWeight:800, marginBottom:4 }}>📈 מודלים מעריכיים (5 יח׳)</div><div style={{ color:"#6B7280", fontSize:12, lineHeight:1.55 }}>{ex.id==="basic"&&"גדילה — N₀·eᵏᵗ, מציאת k, זמן הכפלה."}{ex.id==="medium"&&"דעיכה — חצי חיים, שארית, מציאת זמן."}{ex.id==="advanced"&&"בניית מודל מנתונים, נגזרת, סקיצה."}</div></div>
        <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:14 }}/>
        <div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>🎯 נוסחאות</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:150 }}>N(t) = N₀·eᵏᵗ</span><span>מודל מעריכי</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:150 }}>T_double = ln2/k</span><span>זמן הכפלה</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:150 }}>T_half = ln2/λ</span><span>חצי חיים</span></div></div></div>
        {ex.id!=="basic"&&(<><div style={{ height:1, background:"rgba(60,54,42,0.08)", marginBottom:12 }}/><div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>✨ {ex.id==="medium"?"דעיכה":"נגזרת"}</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}>{ex.id==="medium"&&<div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:150 }}>N(nT) = N₀/2ⁿ</span><span>n חצאי חיים</span></div>}{ex.id==="advanced"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:150 }}>N'(t) = k·N(t)</span><span>קצב = k × כמות</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:150 }}>k = ln(N₁/N₀)/Δt</span><span>k מ-2 נתונים</span></div></>}</div></div></>)}
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

/* ─── GrowthLab (basic) ───────────────────────────────────────────────────── */

function GrowthLab() {
  const [n0,setN0]=useState(100); const [k,setK]=useState(0.5);
  const st=STATION.basic;
  const doubleTime=k>0?Math.log(2)/k:Infinity;
  const nAt3=n0*Math.exp(k*3);
  const ox=50,oy=140,scX=25,scY=0.3;
  const pts:string[]=[];
  for(let t=0;t<=6;t+=0.15){const n=n0*Math.exp(k*t);if(n<500) pts.push(`${ox+t*scX},${oy-n*scY}`);}
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת גדילה מעריכית</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו N₀ ו-k — צפו בעקומת הגדילה ובזמן ההכפלה.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 2rem" }}>
        {[{label:"N₀",val:n0,set:setN0,min:10,max:500,step:10},{label:"k",val:k,set:setK,min:0.1,max:1.5,step:0.05}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 220 170" className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={ox} y1={oy} x2={ox+6.5*scX} y2={oy} stroke="#94a3b8" strokeWidth={1}/><line x1={ox} y1={oy-500*scY} x2={ox} y2={oy+5} stroke="#94a3b8" strokeWidth={1}/>
          {pts.length>1&&<polyline points={pts.join(" ")} fill="none" stroke={st.accentColor} strokeWidth={2.5}/>}
          <circle cx={ox} cy={oy-n0*scY} r={4} fill="#f59e0b"/>
          <text x={ox+6} y={oy-n0*scY-4} fontSize={9} fill="#f59e0b" fontFamily="monospace">N₀={n0}</text>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
        {[{label:"T (הכפלה)",val:doubleTime<100?doubleTime.toFixed(2):"∞"},{label:"N(3)",val:nAt3<10000?nAt3.toFixed(0):"גדול"},{label:"k",val:k.toFixed(2)},{label:"ln 2 / k",val:doubleTime<100?doubleTime.toFixed(2):"∞"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:10, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:10, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:16, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>k גדול → גדילה מהירה, זמן הכפלה קצר. נסו k=ln2≈0.69 → T=1!</p>
    </section>
  );
}

/* ─── DecayLab (medium) ───────────────────────────────────────────────────── */

function DecayLab() {
  const [halfLife,setHalfLife]=useState(5); const [years,setYears]=useState(15);
  const st=STATION.medium;
  const lambda=Math.log(2)/halfLife;
  const remaining=100*Math.exp(-lambda*years);
  const halvings=years/halfLife;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת דעיכה וחצי חיים</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו חצי חיים ומספר שנים — צפו כמה נותר.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 2rem" }}>
        {[{label:"T½ (שנים)",val:halfLife,set:setHalfLife,min:1,max:20,step:0.5},{label:"שנים (t)",val:years,set:setYears,min:1,max:50,step:1}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      {/* Bar visualization */}
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <div style={{ height:30, borderRadius:8, background:"#e5e7eb", overflow:"hidden", position:"relative" }}>
          <div style={{ height:"100%", width:`${remaining}%`, background:st.accentColor, borderRadius:8, transition:"width 0.3s", opacity:0.7 }}/>
          <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", fontWeight:700, fontSize:14, color:"#1A1A1A" }}>{remaining.toFixed(1)}% נותר</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
        {[{label:"λ",val:lambda.toFixed(4)},{label:"חצאי חיים",val:halvings.toFixed(1)},{label:"% נותר",val:remaining.toFixed(1)+"%"},{label:"(½)ⁿ",val:(Math.pow(0.5,halvings)*100).toFixed(1)+"%"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:10, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:10, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:16, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>כל חצי-חיים מחלק ב-2. אחרי 3 חצאי חיים → 12.5% (⅛).</p>
    </section>
  );
}

/* ─── ModelBuilderLab (advanced) ──────────────────────────────────────────── */

function ModelBuilderLab() {
  const [n0,setN0]=useState(500); const [n1,setN1]=useState(1500); const [dt,setDt]=useState(3);
  const st=STATION.advanced;
  const k=dt>0?Math.log(n1/n0)/dt:0;
  const doubleTime=k>0?Math.log(2)/k:k<0?-Math.log(2)/k:Infinity;
  const nPrime0=k*n0;
  const tTo10k=n0>0&&k>0?Math.log(10000/n0)/k:NaN;
  const isGrowth=k>0;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת בניית מודל</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>הזינו שני נתונים — המודל ייבנה אוטומטית.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, maxWidth:500, margin:"0 auto 2rem" }}>
        {[{label:"N(0)",val:n0,set:setN0,min:10,max:2000,step:10},{label:"N(Δt)",val:n1,set:setN1,min:10,max:5000,step:10},{label:"Δt (שנים)",val:dt,set:setDt,min:1,max:10,step:0.5}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:12, border:"1px solid rgba(255,255,255,0.4)", padding:"0.75rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", marginBottom:"2rem", boxShadow:st.glowShadow, textAlign:"center" }}>
        <div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:8 }}>מודל</div>
        <div style={{ color:st.accentColor, fontSize:20, fontWeight:800, fontFamily:"monospace" }}>N(t) = {n0}·e^({k.toFixed(4)}t)</div>
        <div style={{ color:isGrowth?"#16a34a":"#DC2626", fontSize:13, marginTop:8, fontWeight:600 }}>{isGrowth?"📈 גדילה":"📉 דעיכה"}</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
        {[{label:"k",val:k.toFixed(4)},{label:isGrowth?"T הכפלה":"T½",val:doubleTime<1000?doubleTime.toFixed(2):"∞"},{label:"N'(0)",val:nPrime0.toFixed(1)},{label:"t→10K",val:!isNaN(tTo10k)&&tTo10k>0?tTo10k.toFixed(2):"—"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:10, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:10, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:16, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>k = ln(N₁/N₀)/Δt. שנו N₁ &lt; N₀ → דעיכה (k&lt;0)!</p>
    </section>
  );
}

/* ─── Tabs + FormulaBar ────────────────────────────────────────────────────── */

const TABS=[{id:"basic",label:"מתחיל",textColor:"text-green-700",border:"border-green-600",bg:"bg-green-600/10",glowColor:"rgba(22,163,74,0.3)"},{id:"medium",label:"בינוני",textColor:"text-orange-700",border:"border-orange-600",bg:"bg-orange-600/10",glowColor:"rgba(234,88,12,0.3)"},{id:"advanced",label:"מתקדם",textColor:"text-red-700",border:"border-red-700",bg:"bg-red-700/10",glowColor:"rgba(220,38,38,0.3)"}];

function FormulaBar() {
  const [activeTab,setActiveTab]=useState<"model"|"half"|"build"|null>(null);
  const tabs=[{id:"model" as const,label:"📈 מודל",tex:"N_0 e^{kt}",color:"#16A34A",borderColor:"rgba(22,163,74,0.35)"},{id:"half" as const,label:"⏱ חצי חיים",tex:"T=\\tfrac{\\ln 2}{\\lambda}",color:"#EA580C",borderColor:"rgba(234,88,12,0.35)"},{id:"build" as const,label:"🔧 בנייה",tex:"k=\\tfrac{\\ln(N_1/N_0)}{\\Delta t}",color:"#DC2626",borderColor:"rgba(220,38,38,0.35)"}];
  return (
    <div style={{ borderRadius:12, border:"1px solid rgba(60,54,42,0.15)", background:"rgba(255,255,255,0.75)", padding:"1.25rem", marginBottom:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginBottom:12, textAlign:"center" }}>נוסחאות</div>
      <div style={{ display:"flex", gap:6, marginBottom:activeTab?14:0 }}>{tabs.map(t=>{const isA=activeTab===t.id;return(<button key={t.id} onClick={()=>setActiveTab(isA?null:t.id)} style={{ flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", border:`1.5px solid ${isA?t.borderColor:"rgba(60,54,42,0.1)"}`, background:isA?`${t.color}0D`:"rgba(60,54,42,0.03)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{ fontSize:11, fontWeight:700, color:isA?t.color:"#6B7280" }}>{t.label}</span><span style={{ color:isA?t.color:"#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>);})}</div>
      {activeTab==="model"&&(<motion.div key="m" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(22,163,74,0.25)", background:"rgba(220,252,231,0.4)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"N(t) = N_0 \\cdot e^{kt}"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>מודל מעריכי</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>N₀ = ערך התחלתי (ב-t=0).</li><li>k &gt; 0 → גדילה. k &lt; 0 → דעיכה.</li><li>N'(t) = k·N(t) — הקצב פרופורציונלי לכמות.</li></ol></div></div></div></motion.div>)}
      {activeTab==="half"&&(<motion.div key="h" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(234,88,12,0.25)", background:"rgba(255,247,237,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"T_{1/2} = \\frac{\\ln 2}{\\lambda} \\qquad T_{\\times 2} = \\frac{\\ln 2}{k}"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(234,88,12,0.06)", border:"1px solid rgba(234,88,12,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>חצי חיים וזמן הכפלה</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>חצי חיים: N(T) = N₀/2 → T = ln 2 / λ.</li><li>זמן הכפלה: N(T) = 2N₀ → T = ln 2 / k.</li><li>n חצאי חיים: N = N₀ · (½)ⁿ.</li></ol></div><div style={{ marginTop:10, color:"#B45309", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 ln 2 ≈ 0.693. T½ = 5 שנה → λ ≈ 0.139.</div></div></div></motion.div>)}
      {activeTab==="build"&&(<motion.div key="b" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(220,38,38,0.25)", background:"rgba(254,242,242,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"k = \\frac{\\ln(N_1 / N_0)}{\\Delta t}"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>בניית מודל מ-2 נתונים</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>N₀ = N(0) (הערך ההתחלתי).</li><li>N₁ = N(Δt) (ערך לאחר Δt).</li><li>k = ln(N₁/N₀)/Δt.</li><li>אם N₁ &gt; N₀ → k &gt; 0 (גדילה). N₁ &lt; N₀ → k &lt; 0 (דעיכה).</li></ol></div><div style={{ marginTop:10, color:"#DC2626", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 דוגמה: N₀=500, N₁=1500, Δt=3 → k = ln(3)/3 ≈ 0.366.</div></div></div></motion.div>)}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function ExponentialModelsPage5U() {
  const [selectedLevel,setSelectedLevel]=useState<"basic"|"medium"|"advanced">("basic");
  const ex=exercises.find(e=>e.id===selectedLevel)!;
  const lvlRgb=selectedLevel==="basic"?"45,90,39":selectedLevel==="medium"?"163,79,38":"139,38,53";
  return (
    <main style={{ minHeight:"100vh", background:"#F3EFE0", backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:"#2D3436", ["--lvl-rgb" as string]:lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`textarea,input[type="text"],input[type="password"]{outline:none!important}textarea:focus,input[type="text"]:focus{outline:none!important;border-color:rgba(var(--lvl-rgb),0.65)!important;box-shadow:0 0 0 3px rgba(var(--lvl-rgb),0.12)!important}input[type="range"]{outline:none!important}input[type="range"]:focus{outline:none!important}button:focus,button:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(var(--lvl-rgb),0.35)!important}button:focus:not(:focus-visible){box-shadow:none!important}`}</style>
      <div style={{ borderBottom:"1px solid rgba(60,54,42,0.15)", background:"#F3EFE0" }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div><h1 style={{ fontSize:22, fontWeight:700, color:"#2D3436", margin:0 }}>מודלים מעריכיים עם AI — כיתה יב׳ (5 יח׳)</h1><p style={{ fontSize:13, color:"#6B7280", margin:"2px 0 0" }}>N₀·eᵏᵗ, חצי חיים, בניית מודל מנתונים</p></div>
          <Link href="/5u/topic/grade12/growth-decay" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap" }} onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D";}} onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A";}}><span style={{ fontSize:16 }}>←</span>חזרה</Link>
        </div>
      </div>
      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="5u/grade12/growth-decay/exponential-models"/>
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(60,54,42,0.15)" }}>{TABS.map(tab=>{const active=selectedLevel===tab.id;return(<button key={tab.id} onClick={()=>setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active?`${tab.bg} border ${tab.border} ${tab.textColor}`:"text-stone-500 hover:text-stone-800"}`} style={active?{boxShadow:`0 0 14px ${tab.glowColor}`}:undefined}>{tab.label}</button>);})}</div>
        <FormulaBar/>
        <motion.div key={selectedLevel} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22}}><ExerciseCard ex={ex}/></motion.div>
        {selectedLevel==="basic"&&<GrowthLab/>}
        {selectedLevel==="medium"&&<DecayLab/>}
        {selectedLevel==="advanced"&&<ModelBuilderLab/>}
        <div style={{ marginTop:"1.5rem" }}><MarkComplete subtopicId="5u/grade12/growth-decay/exponential-models" level={selectedLevel}/></div>
      </div>
    </main>
  );
}
