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
  const cx=130,cy=90,r=65;
  return (
    <svg viewBox="0 0 260 190" className="w-full max-w-sm mx-auto" aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.6} />
      {/* Center */}
      <circle cx={cx} cy={cy} r={3} fill="#16A34A" />
      <text x={cx+6} y={cy-4} fontSize={11} fill="#16A34A" fontFamily="sans-serif">O</text>
      {/* Central angle */}
      <line x1={cx} y1={cy} x2={cx+r*Math.cos(-0.5)} y2={cy+r*Math.sin(-0.5)} stroke="#f59e0b" strokeWidth={1.5} />
      <line x1={cx} y1={cy} x2={cx+r*Math.cos(-1.8)} y2={cy+r*Math.sin(-1.8)} stroke="#f59e0b" strokeWidth={1.5} />
      {/* Arc */}
      <path d={`M${cx+r*Math.cos(-0.5)},${cy+r*Math.sin(-0.5)} A${r},${r} 0 0,0 ${cx+r*Math.cos(-1.8)},${cy+r*Math.sin(-1.8)}`} fill="none" stroke="#a78bfa" strokeWidth={2.5} opacity={0.7} />
      {/* Angle arc at center */}
      <path d={`M${cx+18*Math.cos(-0.5)},${cy+18*Math.sin(-0.5)} A18,18 0 0,0 ${cx+18*Math.cos(-1.8)},${cy+18*Math.sin(-1.8)}`} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      <text x={cx-14} y={cy-14} fontSize={10} fill="#f59e0b" fontFamily="sans-serif">?°</text>
      <text x={130} y={182} fontSize={10} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">זווית מרכזית</text>
    </svg>
  );
}

function MediumSVG() {
  const cx=130,cy=90,r=65;
  const a1=-0.3,a2=-1.5,a3=-2.8;
  return (
    <svg viewBox="0 0 260 190" className="w-full max-w-sm mx-auto" aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EA580C" strokeWidth={2} opacity={0.6} />
      <circle cx={cx} cy={cy} r={3} fill="#EA580C" />
      {/* Inscribed angle — vertex on circle */}
      <circle cx={cx+r*Math.cos(a1)} cy={cy+r*Math.sin(a1)} r={4} fill="#f59e0b" />
      <circle cx={cx+r*Math.cos(a2)} cy={cy+r*Math.sin(a2)} r={4} fill="#a78bfa" />
      <circle cx={cx+r*Math.cos(a3)} cy={cy+r*Math.sin(a3)} r={4} fill="#a78bfa" />
      <line x1={cx+r*Math.cos(a1)} y1={cy+r*Math.sin(a1)} x2={cx+r*Math.cos(a2)} y2={cy+r*Math.sin(a2)} stroke="#f59e0b" strokeWidth={1.5} />
      <line x1={cx+r*Math.cos(a1)} y1={cy+r*Math.sin(a1)} x2={cx+r*Math.cos(a3)} y2={cy+r*Math.sin(a3)} stroke="#f59e0b" strokeWidth={1.5} />
      {/* Arc */}
      <path d={`M${cx+r*Math.cos(a2)},${cy+r*Math.sin(a2)} A${r},${r} 0 0,0 ${cx+r*Math.cos(a3)},${cy+r*Math.sin(a3)}`} fill="none" stroke="#a78bfa" strokeWidth={2.5} opacity={0.6} />
      <text x={cx+r*Math.cos(a1)+12} y={cy+r*Math.sin(a1)-4} fontSize={10} fill="#f59e0b" fontFamily="sans-serif">?°</text>
      <text x={130} y={182} fontSize={10} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">זווית משוקעת = חצי מרכזית</text>
    </svg>
  );
}

function AdvancedSVG() {
  const cx=130,cy=90,r=65;
  return (
    <svg viewBox="0 0 260 200" className="w-full max-w-sm mx-auto" aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.5} />
      <circle cx={cx} cy={cy} r={3} fill="#DC2626" />
      {/* Tangent line */}
      <circle cx={cx+r} cy={cy} r={4} fill="#34d399" />
      <line x1={cx+r} y1={cy-50} x2={cx+r} y2={cy+50} stroke="#34d399" strokeWidth={2} opacity={0.6} />
      {/* Radius to tangent point */}
      <line x1={cx} y1={cy} x2={cx+r} y2={cy} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
      {/* Right angle */}
      <rect x={cx+r-8} y={cy-8} width={8} height={8} fill="none" stroke="#64748b" strokeWidth={1} />
      {/* External point and two tangents */}
      <circle cx={cx+r+40} cy={cy} r={3} fill="#DC2626" />
      <text x={cx+r+46} y={cy+4} fontSize={10} fill="#DC2626" fontFamily="sans-serif">P</text>
      <line x1={cx+r+40} y1={cy} x2={cx+r*Math.cos(0.6)} y2={cy-r*Math.sin(0.6)} stroke="#DC2626" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.5} />
      <line x1={cx+r+40} y1={cy} x2={cx+r*Math.cos(-0.6)} y2={cy+r*Math.sin(0.6)} stroke="#DC2626" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.5} />
      <text x={130} y={192} fontSize={10} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">משיק ⊥ רדיוס</text>
    </svg>
  );
}

/* ─── Prompt Atoms (compact — same pattern as all pages) ───────────────────── */
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
function LadderAdvanced({ steps }: { steps:PromptStep[] }) { const [masterPassed,setMasterPassed]=useState(false); const [unlockedCount,setUnlockedCount]=useState(1); const allPassed=masterPassed&&unlockedCount>steps.length; return (<div><MasterPromptGate onPass={()=>setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["מעגל","משיק","רדיוס","מיתר","זווית","קשת","משוקעת"]}/>{steps.map((s,i)=>(<div key={i} style={{ marginBottom:8 }}>{(!masterPassed||i>=unlockedCount)?(<div style={{ borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", background:"rgba(255,255,255,0.7)", padding:"14px 16px", opacity:0.5, pointerEvents:"none" as const, display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ color:"#6B7280", fontSize:13, fontWeight:600 }}>{s.phase} — {s.label}</span><span style={{ fontSize:16 }}>🔒</span></div>):(<div><div style={{ borderRadius:14, border:"1px solid rgba(22,163,74,0.3)", background:"rgba(255,255,255,0.9)", padding:"14px 16px", marginBottom:8 }}><div style={{ color:"#15803d", fontSize:13, fontWeight:700, marginBottom:6 }}>{s.phase} — {s.label}</div><div style={{ color:"#334155", fontSize:13, lineHeight:1.6 }}>{s.prompt}</div></div><button onClick={()=>setUnlockedCount(v=>Math.max(v,i+2))} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}{allPassed&&(<div style={{ borderRadius:16, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:"1.25rem 1.5rem", marginTop:16, textAlign:"center" }}><div style={{ fontSize:28, marginBottom:8 }}>🏆</div><div style={{ color:"#14532d", fontWeight:800, fontSize:16, marginBottom:4 }}>כל הכבוד!</div><div style={{ color:"#166534", fontSize:13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}</div>); }

/* ─── Exercise Data ────────────────────────────────────────────────────────── */

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "זווית מרכזית וקשת",
    problem: "במעגל עם מרכז O ורדיוס r, הזווית המרכזית AOB ידועה.\n\nא. הסבירו מהי זווית מרכזית ומהי הקשת שנשענת עליה.\nב. אם הזווית המרכזית 80°, מהו אורך הקשת AB (ברדיאנים × r)?\nג. מהו שטח הגזרה (\"פרוסת עוגה\") המתאימה?",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בין מעלות לרדיאנים", text: "אורך קשת = r·α כאשר α ברדיאנים. אם α במעלות, חייבים להמיר: α_rad = α° · π/180. תלמידים מציבים מעלות ישירות ומקבלים ערך שגוי." },
      { title: "⚠️ בלבול בין קשת לגזרה", text: "אורך קשת = r·α (אורך!). שטח גזרה = ½r²α (שטח!). אלו גדלים שונים — אחד חד-ממדי ואחד דו-ממדי." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יא', 5 יחידות, ומצרף/ת שאלה על זוויות מרכזיות וקשתות במעגל. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"זווית מרכזית וקשת", coaching:"", prompt:"במעגל עם מרכז O. תנחה אותי — מהי זווית מרכזית, ומהי הקשת שנשענת עליה.", keywords:[], keywordHint:"", contextWords:["מרכזית","זווית","קשת","מרכז","רדיוס","נשענת"] },
      { phase:"סעיף ב׳", label:"אורך קשת", coaching:"", prompt:"זווית מרכזית 80°. תכווין אותי — איך ממירים למרדיאנים ומחשבים אורך קשת = r·α.", keywords:[], keywordHint:"", contextWords:["קשת","אורך","רדיאנים","המרה","r","π"] },
      { phase:"סעיף ג׳", label:"שטח גזרה", coaching:"", prompt:"תדריך אותי — מהי נוסחת שטח גזרה (½r²α) ואיך מציבים.", keywords:[], keywordHint:"", contextWords:["גזרה","שטח","חצי","r²","α","נוסחה"] },
    ],
  },
  {
    id: "medium",
    title: "זווית משוקעת ומיתרים",
    problem: "במעגל, הזווית המרכזית AOB = α.\nנקודה C על המעגל (לא על קשת AB).\n\nא. מהי הזווית המשוקעת ACB? הסבירו את הקשר.\nב. הוכיחו: כל הזוויות המשוקעות הנשענות על אותה קשת שוות.\nג. מהי הזווית המשוקעת הנשענת על קוטר? הוכיחו.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ משוקעת = חצי מרכזית (על אותה קשת!)", text: "זווית משוקעת = ½ × זווית מרכזית, רק אם שתיהן נשענות על אותה קשת. תלמידים מתבלבלים ומשתמשים בנוסחה על קשתות שונות." },
      { title: "⚠️ זווית על קוטר = 90° (לא 180°!)", text: "הקוטר = זווית מרכזית 180°. זווית משוקעת = ½ · 180° = 90°. תלמידים כותבים 180° כי מתבלבלים עם הזווית המרכזית." },
    ],
    goldenPrompt: `אני בכיתה יא', 5 יחידות, מצרף/ת תרגיל על זוויות משוקעות ומיתרים במעגל.

אל תיתן לי את ההוכחה — שאל אותי שאלות מנחות על הקשר בין משוקעת למרכזית.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"חצי מרכזית", coaching:"", prompt:"זווית מרכזית AOB = α, C על המעגל. תנחה אותי — מה הזווית המשוקעת ACB ולמה.", keywords:[], keywordHint:"", contextWords:["משוקעת","מרכזית","חצי","קשת","נשענת","α/2"] },
      { phase:"סעיף ב׳", label:"כל משוקעת על אותה קשת", coaching:"", prompt:"תכווין אותי להוכיח — למה כל הזוויות המשוקעות שנשענות על אותה קשת שוות.", keywords:[], keywordHint:"", contextWords:["שוות","קשת","הוכחה","מרכזית","חצי","כל"] },
      { phase:"סעיף ג׳", label:"זווית על קוטר = 90°", coaching:"", prompt:"AB הוא קוטר (180°). תדריך אותי — למה הזווית המשוקעת ACB = 90° (חצי מ-180°).", keywords:[], keywordHint:"", contextWords:["קוטר","90","ישרה","משוקעת","חצי","180"] },
    ],
  },
  {
    id: "advanced",
    title: "משיקים — תכונות ויישומים",
    problem: "ישר ℓ משיק למעגל O בנקודה T.\n\nא. הוכיחו: OT ⊥ ℓ (רדיוס אנכי למשיק).\nב. משתי נקודות חיצוניות P יוצאים שני משיקים PA ו-PB. הוכיחו PA = PB.\nג. חשבו את אורך המשיק PT אם OP ו-r ידועים.\nד. מצאו את זווית APB אם ∠AOB ידועה.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ שכחת שרדיוס ⊥ משיק", text: "הרדיוס לנקודת ההשקה תמיד אנכי למשיק. זו תכונה בסיסית שמשמשת כמעט בכל שאלת משיקים — אם שוכחים אותה, אי אפשר להתקדם." },
      { title: "⚠️ PT² = OP² − r² (פיתגורס)", text: "במשולש OTP (ישר-זווית ב-T): PT² = OP² − OT². תלמידים שוכחים שהזווית ב-T ישרה ולא יכולים לחשב את אורך המשיק." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: למה רדיוס אנכי למשיק, ואיך מחשבים אורך משיק מנקודה חיצונית? (לפחות 80 תווים)",
    steps: [
      { phase:"סעיף א׳", label:"OT ⊥ ℓ", coaching:"", prompt:"ℓ משיק למעגל ב-T. תנחה אותי — למה הרדיוס OT אנכי למשיק. מה היה קורה אם לא היה אנכי.", keywords:[], keywordHint:"", contextWords:["משיק","אנכי","רדיוס","90","הוכחה","נקודה"] },
      { phase:"סעיף ב׳", label:"PA = PB", coaching:"", prompt:"מ-P יוצאים שני משיקים PA, PB. תכווין אותי — למה PA=PB. רמז: OA⊥PA, OB⊥PB, OP משותף.", keywords:[], keywordHint:"", contextWords:["משיק","שווה","חפיפה","OP","רדיוס","הוכחה"] },
      { phase:"סעיף ג׳", label:"אורך משיק", coaching:"", prompt:"OP ו-r ידועים. OT⊥PT. תדריך אותי — פיתגורס על משולש OTP למציאת PT.", keywords:[], keywordHint:"", contextWords:["פיתגורס","PT","OP","r","יתר","חישוב"] },
      { phase:"סעיף ד׳", label:"זווית APB", coaching:"", prompt:"∠AOB ידועה. OA⊥PA, OB⊥PB. תנחה אותי — מה סכום הזוויות במרובע OAPB ואיך מוצאים ∠APB.", keywords:[], keywordHint:"", contextWords:["זווית","APB","מרובע","360","סכום","90"] },
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
        <div style={{ textAlign:"center", marginBottom:14 }}><div style={{ color:s.accentColor, fontSize:15, fontWeight:800, marginBottom:4 }}>⭕ מעגלים (5 יח׳)</div><div style={{ color:"#6B7280", fontSize:12, lineHeight:1.55 }}>{ex.id==="basic"&&"זווית מרכזית, קשת ושטח גזרה."}{ex.id==="medium"&&"זווית משוקעת — חצי מרכזית, קוטר = 90°."}{ex.id==="advanced"&&"משיקים — רדיוס ⊥ משיק, PA=PB, פיתגורס."}</div></div>
        <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:14 }}/>
        <div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>🎯 משפטים</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:140 }}>זווית מרכזית</span><span>= הקשת שנשענת עליה</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:140 }}>זווית משוקעת</span><span>= ½ × זווית מרכזית</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:140 }}>רדיוס ⊥ משיק</span><span>בנקודת ההשקה</span></div></div></div>
        {ex.id!=="basic"&&(<><div style={{ height:1, background:"rgba(60,54,42,0.08)", marginBottom:12 }}/><div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>✨ {ex.id==="medium"?"קשר מרכזית-משוקעת":"משיקים"}</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}>{ex.id==="medium"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:140 }}>על אותה קשת</span><span>כל המשוקעות שוות</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:140 }}>על קוטר</span><span>משוקעת = 90°</span></div></>}{ex.id==="advanced"&&<><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:140 }}>PA = PB</span><span>שני משיקים מנקודה חיצונית</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:140 }}>PT² = OP²−r²</span><span>אורך משיק (פיתגורס)</span></div></>}</div></div></>)}
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

/* ─── CentralAngleLab (basic) ─────────────────────────────────────────────── */

function CentralAngleLab() {
  const [angleDeg,setAngleDeg]=useState(80); const [r,setR]=useState(5);
  const st=STATION.basic;
  const angleRad=angleDeg*Math.PI/180;
  const arcLen=r*angleRad;
  const sectorArea=0.5*r*r*angleRad;
  const cx2=120,cy2=100,svgR=60;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת זווית מרכזית</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו זווית ורדיוס — צפו באורך קשת ושטח גזרה.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 2rem" }}>
        {[{label:"α (מעלות)",val:angleDeg,set:setAngleDeg,min:10,max:350,step:5},{label:"r (רדיוס)",val:r,set:setR,min:1,max:10,step:0.5}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 240 200" className="w-full max-w-sm mx-auto" aria-hidden>
          <circle cx={cx2} cy={cy2} r={svgR} fill="none" stroke={st.accentColor} strokeWidth={1.5} opacity={0.3}/>
          {/* Sector fill */}
          <path d={`M${cx2},${cy2} L${cx2+svgR},${cy2} A${svgR},${svgR} 0 ${angleDeg>180?1:0},0 ${cx2+svgR*Math.cos(-angleRad)},${cy2+svgR*Math.sin(-angleRad)} Z`} fill={`${st.accentColor}15`}/>
          {/* Arc highlight */}
          <path d={`M${cx2+svgR},${cy2} A${svgR},${svgR} 0 ${angleDeg>180?1:0},0 ${cx2+svgR*Math.cos(-angleRad)},${cy2+svgR*Math.sin(-angleRad)}`} fill="none" stroke="#a78bfa" strokeWidth={3}/>
          {/* Radii */}
          <line x1={cx2} y1={cy2} x2={cx2+svgR} y2={cy2} stroke="#f59e0b" strokeWidth={1.5}/>
          <line x1={cx2} y1={cy2} x2={cx2+svgR*Math.cos(-angleRad)} y2={cy2+svgR*Math.sin(-angleRad)} stroke="#f59e0b" strokeWidth={1.5}/>
          <circle cx={cx2} cy={cy2} r={3} fill={st.accentColor}/>
          {/* Angle arc */}
          <path d={`M${cx2+16},${cy2} A16,16 0 ${angleDeg>180?1:0},0 ${cx2+16*Math.cos(-angleRad)},${cy2+16*Math.sin(-angleRad)}`} fill="none" stroke="#f59e0b" strokeWidth={1.5}/>
          <text x={cx2} y={cy2+svgR+18} fontSize={10} fill="#64748b" textAnchor="middle" fontFamily="monospace">{angleDeg}° = {angleRad.toFixed(2)} rad</text>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
        {[{label:"α (rad)",val:angleRad.toFixed(3)},{label:"אורך קשת",val:arcLen.toFixed(2)},{label:"שטח גזרה",val:sectorArea.toFixed(2)},{label:"r",val:String(r)}].map(row=>(<div key={row.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:10, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:10, fontWeight:600, marginBottom:4 }}>{row.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:16, fontFamily:"monospace" }}>{row.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>הזיזו ל-360° — קשת שלמה = היקף = 2πr. גזרה = שטח מעגל = πr².</p>
    </section>
  );
}

/* ─── InscribedAngleLab (medium) ──────────────────────────────────────────── */

function InscribedAngleLab() {
  const [centralDeg,setCentralDeg]=useState(100);
  const [vertexPos,setVertexPos]=useState(200);
  const st=STATION.medium;
  const inscribed=centralDeg/2;
  const cRad=centralDeg*Math.PI/180;
  const vRad=vertexPos*Math.PI/180;
  const cx2=120,cy2=100,svgR=65;
  // Points A, B on circle for the central angle
  const ax=cx2+svgR, ay=cy2;
  const bx=cx2+svgR*Math.cos(-cRad), by=cy2+svgR*Math.sin(-cRad);
  // Vertex C on circle (opposite side)
  const vx=cx2+svgR*Math.cos(-vRad*Math.PI/180*0+Math.PI+cRad/2+0.3), vy=cy2+svgR*Math.sin(-vRad*Math.PI/180*0+Math.PI+cRad/2+0.3);
  // Simplified: put C at a fixed angle on the other side
  const cAngle=Math.PI+(cRad/2);
  const vcx=cx2+svgR*Math.cos(-cAngle-(vertexPos-180)*Math.PI/360);
  const vcy=cy2+svgR*Math.sin(-cAngle-(vertexPos-180)*Math.PI/360);
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת זווית משוקעת</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו את הזווית המרכזית — המשוקעת תמיד חצי!</p>
      <div style={{ maxWidth:400, margin:"0 auto 2rem" }}><div style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>זווית מרכזית</span><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:700 }}>{centralDeg}°</span></div><input type="range" min={20} max={340} step={5} value={centralDeg} onChange={e=>setCentralDeg(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div></div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 240 200" className="w-full max-w-sm mx-auto" aria-hidden>
          <circle cx={cx2} cy={cy2} r={svgR} fill="none" stroke={st.accentColor} strokeWidth={1.5} opacity={0.3}/>
          <circle cx={cx2} cy={cy2} r={3} fill={st.accentColor}/>
          {/* A and B */}
          <circle cx={ax} cy={ay} r={4} fill="#a78bfa"/><circle cx={bx} cy={by} r={4} fill="#a78bfa"/>
          {/* Central angle lines */}
          <line x1={cx2} y1={cy2} x2={ax} y2={ay} stroke="#f59e0b" strokeWidth={1.2} opacity={0.5}/>
          <line x1={cx2} y1={cy2} x2={bx} y2={by} stroke="#f59e0b" strokeWidth={1.2} opacity={0.5}/>
          {/* C on circle */}
          <circle cx={vcx} cy={vcy} r={4} fill="#34d399"/>
          <line x1={vcx} y1={vcy} x2={ax} y2={ay} stroke="#34d399" strokeWidth={1.5}/>
          <line x1={vcx} y1={vcy} x2={bx} y2={by} stroke="#34d399" strokeWidth={1.5}/>
          {/* Labels */}
          <text x={cx2-2} y={cy2-8} fontSize={10} fill="#f59e0b" fontFamily="monospace">{centralDeg}°</text>
          <text x={vcx+(vcx<cx2?-28:8)} y={vcy-6} fontSize={10} fill="#34d399" fontFamily="monospace">{inscribed}°</text>
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"מרכזית",val:`${centralDeg}°`},{label:"משוקעת",val:`${inscribed}°`},{label:"יחס",val:"1 : 2"}].map(row=>(<div key={row.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{row.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:20, fontFamily:"monospace" }}>{row.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>הזיזו ל-180° (קוטר) → משוקעת = 90° תמיד!</p>
    </section>
  );
}

/* ─── TangentLab (advanced) ───────────────────────────────────────────────── */

function TangentLab() {
  const [dist,setDist]=useState(10); const [r,setR]=useState(5);
  const st=STATION.advanced;
  const tangentLen=dist>r?Math.sqrt(dist*dist-r*r):0;
  const valid=dist>r;
  const angleTOP=valid?Math.acos(r/dist)*180/Math.PI:0;
  const angleAPB=valid?2*angleTOP:0;
  // SVG
  const cx2=100,cy2=100,svgR=40,svgDist=dist*svgR/r;
  const px=cx2+svgDist;
  const tangAngle=valid?Math.acos(svgR/svgDist):0;
  const tx=cx2+svgR*Math.cos(tangAngle), ty=cy2-svgR*Math.sin(tangAngle);
  const bx=cx2+svgR*Math.cos(-tangAngle), by=cy2+svgR*Math.sin(tangAngle);
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת משיקים</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>שנו מרחק OP ורדיוס — צפו באורך המשיק ובזווית.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 2rem" }}>
        {[{label:"OP (מרחק)",val:dist,set:setDist,min:2,max:15,step:0.5},{label:"r (רדיוס)",val:r,set:setR,min:1,max:8,step:0.5}].map((s,i)=>(<div key={i} style={{ background:"rgba(255,255,255,0.75)", borderRadius:16, border:"1px solid rgba(255,255,255,0.4)", padding:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.12)" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6B7280", marginBottom:4 }}><span>{s.label}</span><span style={{ color:valid?st.accentColor:"#DC2626", fontFamily:"monospace", fontWeight:700 }}>{s.val}</span></div><input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ width:"100%", accentColor:st.accentColor }}/></div>))}
      </div>
      <div style={{ borderRadius:16, border:`1px solid ${st.glowBorder}`, background:"rgba(255,255,255,0.75)", padding:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"2rem", boxShadow:st.glowShadow }}>
        <svg viewBox="0 0 240 200" className="w-full max-w-sm mx-auto" aria-hidden>
          <circle cx={cx2} cy={cy2} r={svgR} fill="none" stroke={st.accentColor} strokeWidth={1.5} opacity={0.4}/>
          <circle cx={cx2} cy={cy2} r={3} fill={st.accentColor}/>
          <text x={cx2-10} y={cy2-6} fontSize={10} fill={st.accentColor} fontFamily="sans-serif">O</text>
          {valid&&svgDist<220&&(<>
            <circle cx={px} cy={cy2} r={4} fill="#DC2626"/>
            <text x={px+6} y={cy2-4} fontSize={10} fill="#DC2626" fontFamily="sans-serif">P</text>
            {/* Tangent lines */}
            <line x1={px} y1={cy2} x2={tx} y2={ty} stroke="#34d399" strokeWidth={1.5}/>
            <line x1={px} y1={cy2} x2={bx} y2={by} stroke="#34d399" strokeWidth={1.5}/>
            {/* Radius to tangent */}
            <line x1={cx2} y1={cy2} x2={tx} y2={ty} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2"/>
            <line x1={cx2} y1={cy2} x2={bx} y2={by} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2"/>
            {/* Right angle at T */}
            <circle cx={tx} cy={ty} r={3} fill="#34d399"/>
            <circle cx={bx} cy={by} r={3} fill="#34d399"/>
            {/* OP line */}
            <line x1={cx2} y1={cy2} x2={px} y2={cy2} stroke="#64748b" strokeWidth={0.8} strokeDasharray="3,3"/>
          </>)}
          {!valid&&<text x={170} y={100} fontSize={12} fill="#dc2626" textAnchor="middle" fontFamily="sans-serif">P בתוך המעגל!</text>}
        </svg>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, textAlign:"center" }}>
        {[{label:"PT",val:valid?tangentLen.toFixed(2):"—"},{label:"PT²",val:valid?(tangentLen*tangentLen).toFixed(1):"—"},{label:"OP²−r²",val:valid?(dist*dist-r*r).toFixed(1):"—"},{label:"∠APB",val:valid?`${(180-angleAPB).toFixed(1)}°`:"—"}].map(row=>(<div key={row.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:10, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:10, fontWeight:600, marginBottom:4 }}>{row.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:15, fontFamily:"monospace" }}>{row.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>PT² = OP²−r² (פיתגורס). ככל ש-P מתרחק — המשיק מתארך וזווית APB קטנה.</p>
    </section>
  );
}

/* ─── Tabs + FormulaBar ────────────────────────────────────────────────────── */

const TABS=[{id:"basic",label:"מתחיל",textColor:"text-green-700",border:"border-green-600",bg:"bg-green-600/10",glowColor:"rgba(22,163,74,0.3)"},{id:"medium",label:"בינוני",textColor:"text-orange-700",border:"border-orange-600",bg:"bg-orange-600/10",glowColor:"rgba(234,88,12,0.3)"},{id:"advanced",label:"מתקדם",textColor:"text-red-700",border:"border-red-700",bg:"bg-red-700/10",glowColor:"rgba(220,38,38,0.3)"}];

function FormulaBar() {
  const [activeTab,setActiveTab]=useState<"central"|"inscribed"|"tangent"|null>(null);
  const tabs=[{id:"central" as const,label:"⭕ מרכזית",tex:"\\alpha, \\; l=r\\alpha",color:"#16A34A",borderColor:"rgba(22,163,74,0.35)"},{id:"inscribed" as const,label:"📐 משוקעת",tex:"\\beta = \\tfrac{\\alpha}{2}",color:"#EA580C",borderColor:"rgba(234,88,12,0.35)"},{id:"tangent" as const,label:"⊥ משיק",tex:"OT \\perp \\ell",color:"#DC2626",borderColor:"rgba(220,38,38,0.35)"}];
  return (
    <div style={{ borderRadius:12, border:"1px solid rgba(60,54,42,0.15)", background:"rgba(255,255,255,0.75)", padding:"1.25rem", marginBottom:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginBottom:12, textAlign:"center" }}>נוסחאות</div>
      <div style={{ display:"flex", gap:6, marginBottom:activeTab?14:0 }}>{tabs.map(t=>{const isA=activeTab===t.id;return(<button key={t.id} onClick={()=>setActiveTab(isA?null:t.id)} style={{ flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", border:`1.5px solid ${isA?t.borderColor:"rgba(60,54,42,0.1)"}`, background:isA?`${t.color}0D`:"rgba(60,54,42,0.03)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{ fontSize:11, fontWeight:700, color:isA?t.color:"#6B7280" }}>{t.label}</span><span style={{ color:isA?t.color:"#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>);})}</div>
      {activeTab==="central"&&(<motion.div key="c" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(22,163,74,0.25)", background:"rgba(220,252,231,0.4)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"l = r \\cdot \\alpha \\qquad S_{\\text{sector}} = \\tfrac{1}{2}r^2\\alpha"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>זווית מרכזית, קשת וגזרה</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>α חייב להיות ברדיאנים!</li><li>אורך קשת l = r·α.</li><li>שטח גזרה S = ½r²α.</li></ol></div></div></div></motion.div>)}
      {activeTab==="inscribed"&&(<motion.div key="i" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(234,88,12,0.25)", background:"rgba(255,247,237,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"\\beta_{\\text{inscribed}} = \\frac{\\alpha_{\\text{central}}}{2}"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(234,88,12,0.06)", border:"1px solid rgba(234,88,12,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>זווית משוקעת</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>קודקוד על המעגל, שוקיים = מיתרים.</li><li>= חצי מהזווית המרכזית על אותה קשת.</li><li>כל המשוקעות על אותה קשת שוות.</li><li>על קוטר: 90° (חצי מ-180°).</li></ol></div><div style={{ marginTop:10, color:"#B45309", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 משמעות: כל נקודה C על הקשת הגדולה רואה את AB באותה זווית!</div></div></div></motion.div>)}
      {activeTab==="tangent"&&(<motion.div key="t" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(220,38,38,0.25)", background:"rgba(254,242,242,0.95)", padding:16 }}><div dir="ltr" style={{ textAlign:"center", marginBottom:14 }}><DisplayMath>{"OT \\perp \\ell \\qquad PT^2 = OP^2 - r^2"}</DisplayMath></div><div style={{ borderRadius:10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>משיקים למעגל</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>OT ⊥ ℓ:</strong> רדיוס אנכי למשיק בנקודת ההשקה.</li><li><strong>PA = PB:</strong> שני משיקים מנקודה חיצונית שווים.</li><li><strong>PT² = OP²−r²:</strong> פיתגורס (∠OTP = 90°).</li><li><strong>∠APB + ∠AOB = 180°:</strong> מרובע OAPB ← שתי זוויות ישרות.</li></ol></div></div></div></motion.div>)}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function CirclesPage5U() {
  const [selectedLevel,setSelectedLevel]=useState<"basic"|"medium"|"advanced">("basic");
  const ex=exercises.find(e=>e.id===selectedLevel)!;
  const lvlRgb=selectedLevel==="basic"?"45,90,39":selectedLevel==="medium"?"163,79,38":"139,38,53";
  return (
    <main style={{ minHeight:"100vh", background:"#F3EFE0", backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:"#2D3436", ["--lvl-rgb" as string]:lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`textarea,input[type="text"],input[type="password"]{outline:none!important}textarea:focus,input[type="text"]:focus{outline:none!important;border-color:rgba(var(--lvl-rgb),0.65)!important;box-shadow:0 0 0 3px rgba(var(--lvl-rgb),0.12)!important}input[type="range"]{outline:none!important}input[type="range"]:focus{outline:none!important}button:focus,button:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(var(--lvl-rgb),0.35)!important}button:focus:not(:focus-visible){box-shadow:none!important}`}</style>
      <div style={{ borderBottom:"1px solid rgba(60,54,42,0.15)", background:"#F3EFE0" }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div><h1 style={{ fontSize:22, fontWeight:700, color:"#2D3436", margin:0 }}>מעגלים עם AI — כיתה יא׳ (5 יח׳)</h1><p style={{ fontSize:13, color:"#6B7280", margin:"2px 0 0" }}>זוויות מרכזיות, משוקעות, מיתרים, משיקים</p></div>
          <Link href="/5u/topic/grade11/geometry" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap" }} onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D";}} onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A";}}><span style={{ fontSize:16 }}>←</span>חזרה</Link>
        </div>
      </div>
      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="5u/grade11/geometry/circles"/>
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(60,54,42,0.15)" }}>{TABS.map(tab=>{const active=selectedLevel===tab.id;return(<button key={tab.id} onClick={()=>setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active?`${tab.bg} border ${tab.border} ${tab.textColor}`:"text-stone-500 hover:text-stone-800"}`} style={active?{boxShadow:`0 0 14px ${tab.glowColor}`}:undefined}>{tab.label}</button>);})}</div>
        <FormulaBar/>
        <motion.div key={selectedLevel} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22}}><ExerciseCard ex={ex}/></motion.div>
        {selectedLevel==="basic"&&<CentralAngleLab/>}
        {selectedLevel==="medium"&&<InscribedAngleLab/>}
        {selectedLevel==="advanced"&&<TangentLab/>}
        <div style={{ marginTop:"1.5rem" }}><MarkComplete subtopicId="5u/grade11/geometry/circles" level={selectedLevel}/></div>
      </div>
    </main>
  );
}
