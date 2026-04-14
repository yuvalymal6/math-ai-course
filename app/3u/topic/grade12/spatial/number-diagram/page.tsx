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
  // 3×3 grid with numbers (question marks)
  const cs = 40;
  return (
    <svg viewBox="0 0 180 180" className="w-full max-w-sm mx-auto" aria-hidden>
      {[0,1,2].map(r=>[0,1,2].map(c=>(<g key={`${r}${c}`}><rect x={20+c*cs} y={20+r*cs} width={cs} height={cs} fill="none" stroke="#16A34A" strokeWidth={1.5} opacity={0.6} rx={4}/><text x={20+c*cs+cs/2} y={20+r*cs+cs/2+5} fontSize={16} fill="#16A34A" textAnchor="middle" fontFamily="monospace" fontWeight={700}>?</text></g>)))}
      <text x={90} y={160} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">תרשים מספרים</text>
    </svg>
  );
}

function MediumSVG() {
  // Grid with some numbers filled, some with ?
  const cs = 40; const vals = [[2,1,0],[3,"?",1],[1,2,"?"]];
  return (
    <svg viewBox="0 0 180 180" className="w-full max-w-sm mx-auto" aria-hidden>
      {vals.map((row,r)=>row.map((v,c)=>(<g key={`${r}${c}`}><rect x={20+c*cs} y={20+r*cs} width={cs} height={cs} fill={v==="?"?"rgba(245,158,11,0.08)":"none"} stroke={v==="?"?"#f59e0b":"#EA580C"} strokeWidth={1.5} opacity={0.7} rx={4}/><text x={20+c*cs+cs/2} y={20+r*cs+cs/2+5} fontSize={16} fill={v==="?"?"#f59e0b":"#EA580C"} textAnchor="middle" fontFamily="monospace" fontWeight={700}>{v}</text></g>)))}
      <text x={90} y={165} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">השלם את ה-?</text>
    </svg>
  );
}

function AdvancedSVG() {
  // Grid + isometric cube hint
  const cs = 36; const vals = [[3,2,1],[2,1,0],[1,0,0]];
  return (
    <svg viewBox="0 0 260 180" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Grid */}
      {vals.map((row,r)=>row.map((v,c)=>(<g key={`${r}${c}`}><rect x={10+c*cs} y={20+r*cs} width={cs} height={cs} fill="none" stroke="#DC2626" strokeWidth={1.5} opacity={0.6} rx={3}/><text x={10+c*cs+cs/2} y={20+r*cs+cs/2+5} fontSize={14} fill="#DC2626" textAnchor="middle" fontFamily="monospace" fontWeight={700}>{v}</text></g>)))}
      {/* Arrow */}
      <text x={135} y={75} fontSize={18} fill="#64748b">→</text>
      {/* Isometric cubes hint */}
      <g transform="translate(160,30)">
        {/* Simple stacked cubes suggestion */}
        <rect x={0} y={60} width={30} height={20} fill="none" stroke="#a78bfa" strokeWidth={1.5} rx={2}/>
        <rect x={20} y={50} width={30} height={20} fill="none" stroke="#a78bfa" strokeWidth={1.5} rx={2}/>
        <rect x={0} y={40} width={30} height={20} fill="none" stroke="#a78bfa" strokeWidth={1.5} rx={2}/>
        <rect x={0} y={20} width={30} height={20} fill="none" stroke="#a78bfa" strokeWidth={1.5} rx={2}/>
        <rect x={0} y={0} width={30} height={20} fill="none" stroke="#a78bfa" strokeWidth={1.5} rx={2}/>
        <text x={40} y={85} fontSize={10} fill="#a78bfa" fontFamily="sans-serif">מבנה?</text>
      </g>
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
function LadderAdvanced({ steps }: { steps:PromptStep[] }) { const [masterPassed,setMasterPassed]=useState(false); const [unlockedCount,setUnlockedCount]=useState(1); const allPassed=masterPassed&&unlockedCount>steps.length; return (<div><MasterPromptGate onPass={()=>setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["תרשים","מספרים","קוביות","גובה","מבנה","מבט","שחזור"]}/>{steps.map((s,i)=>(<div key={i} style={{ marginBottom:8 }}>{(!masterPassed||i>=unlockedCount)?(<div style={{ borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", background:"rgba(255,255,255,0.7)", padding:"14px 16px", opacity:0.5, pointerEvents:"none" as const, display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ color:"#6B7280", fontSize:13, fontWeight:600 }}>{s.phase} — {s.label}</span><span style={{ fontSize:16 }}>🔒</span></div>):(<div><div style={{ borderRadius:14, border:"1px solid rgba(22,163,74,0.3)", background:"rgba(255,255,255,0.9)", padding:"14px 16px", marginBottom:8 }}><div style={{ color:"#15803d", fontSize:13, fontWeight:700, marginBottom:6 }}>{s.phase} — {s.label}</div><div style={{ color:"#334155", fontSize:13, lineHeight:1.6 }}>{s.prompt}</div></div><button onClick={()=>setUnlockedCount(v=>Math.max(v,i+2))} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"8px 0", marginBottom:10, borderRadius:10, fontSize:12, fontWeight:600, background:"rgba(22,163,74,0.08)", border:"1.5px solid rgba(22,163,74,0.3)", color:"#15803d", cursor:"pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}{allPassed&&(<div style={{ borderRadius:16, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:"1.25rem 1.5rem", marginTop:16, textAlign:"center" }}><div style={{ fontSize:28, marginBottom:8 }}>🏆</div><div style={{ color:"#14532d", fontWeight:800, fontSize:16, marginBottom:4 }}>כל הכבוד!</div><div style={{ color:"#166534", fontSize:13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}</div>); }

/* ─── Exercise Data ────────────────────────────────────────────────────────── */

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "קריאת תרשים מספרים",
    problem: "נתון תרשים מספרים (מבט עליון) של מבנה קוביות על רשת 3×3.\nכל מספר מציין כמה קוביות מוערמות בעמודה זו.\n\nא. מהו המספר המרבי בתרשים? מה הוא מייצג?\nב. כמה קוביות יש בסך הכל במבנה?\nג. תארו את המבנה — היכן הוא הכי גבוה והיכן הכי נמוך?",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בין מבט עליון לצד", text: "תרשים מספרים מייצג מבט מלמעלה — כל תא אומר כמה קוביות מוערמות. זה לא מבט מהצד (שם רואים רק את הגבוה ביותר בכל עמודה)." },
      { title: "⚠️ שכחת 0 = אין קוביות", text: "תא עם 0 (או ריק) = אין קוביות במקום הזה. תלמידים סופרים אותו כ-1 ומקבלים ספירה גבוהה מדי." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יב', 3 יחידות, ומצרף/ת שאלה על תרשים מספרים — קריאת התרשים, ספירת קוביות ותיאור מבנה. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"המספר המרבי", coaching:"", prompt:"נתון תרשים מספרים 3×3. תנחה אותי — מה מייצג המספר הגדול ביותר בתרשים ומה הוא אומר על המבנה.", keywords:[], keywordHint:"", contextWords:["מספר","גובה","מרבי","עמודה","קוביות","תרשים"] },
      { phase:"סעיף ב׳", label:"סך הקוביות", coaching:"", prompt:"תכווין אותי — איך סופרים את כל הקוביות מתרשים מספרים (סכום כל המספרים).", keywords:[], keywordHint:"", contextWords:["סכום","קוביות","ספירה","תרשים","כולל","חיבור"] },
      { phase:"סעיף ג׳", label:"תיאור המבנה", coaching:"", prompt:"תדריך אותי לתאר את המבנה — היכן הוא גבוה, היכן נמוך, והאם יש דפוס.", keywords:[], keywordHint:"", contextWords:["מבנה","גובה","נמוך","גבוה","תיאור","צורה"] },
    ],
  },
  {
    id: "medium",
    title: "השלמת תרשים מספרים ממבטים",
    problem: "נתון תרשים מספרים חלקי של מבנה 3×3. חלק מהמספרים חסרים.\nנתונים גם מבט מלפנים ומבט מהצד.\n\nא. הסבירו מה כל מבט מראה (המקסימום בכל עמודה/שורה).\nב. השלימו את המספרים החסרים בעזרת המבטים.\nג. בדקו שהתרשים המושלם תואם את כל המבטים.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ מבט = מקסימום בשורה/עמודה", text: "מבט מלפנים מראה את הגובה המרבי בכל עמודה. מבט מהצד מראה את הגובה המרבי בכל שורה. תלמידים מתבלבלים ולוקחים סכום במקום מקסימום." },
      { title: "⚠️ יש יותר מפתרון אחד", text: "לפעמים כמה תרשימים שונים נותנים את אותם מבטים. המבטים קובעים רק את המקסימום — לא את כל הערכים. בבגרות בדרך כלל שואלים 'מצאו תרשים אפשרי'." },
    ],
    goldenPrompt: `אני בכיתה יב', 3 יחידות, מצרף/ת תרגיל על השלמת תרשים מספרים ממבטים.

אל תיתן לי את התשובה — שאל אותי שאלות מנחות על הקשר בין מבט למקסימום בשורה/עמודה.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase:"סעיף א׳", label:"מה כל מבט מראה", coaching:"", prompt:"תנחה אותי — מבט מלפנים מראה מקסימום בכל עמודה, מבט מהצד מראה מקסימום בכל שורה. למה?", keywords:[], keywordHint:"", contextWords:["מבט","מקסימום","עמודה","שורה","לפנים","צד"] },
      { phase:"סעיף ב׳", label:"השלמת מספרים", coaching:"", prompt:"חלק מהמספרים חסרים. תכווין אותי — איך משתמשים במבטים כדי לקבוע את הגבול העליון של כל תא ולהשלים.", keywords:[], keywordHint:"", contextWords:["השלמה","גבול","מספר","מבט","תא","ערך"] },
      { phase:"סעיף ג׳", label:"אימות", coaching:"", prompt:"השלמנו את התרשים. תדריך אותי לבדוק — האם המקסימום בכל עמודה ושורה תואם את המבטים הנתונים.", keywords:[], keywordHint:"", contextWords:["בדיקה","מקסימום","תואם","מבט","עמודה","שורה"] },
    ],
  },
  {
    id: "advanced",
    title: "בניית מבנה מתרשים + מבטים + ספירת קוביות",
    problem: "נתון תרשים מספרים 3×3 מלא.\n\nא. ציירו את מבט מלפנים ומבט מהצד.\nב. כמה קוביות יש בסך הכל?\nג. הציעו תרשים מספרים אחר (שונה) שנותן את אותם מבטים מלפנים ומהצד.\nד. מהו מספר הקוביות המינימלי שנותן את אותם מבטים?",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ בניית מבנה מינימלי", text: "מבנה מינימלי = כמה שפחות קוביות שעדיין מקיימות את המבטים. בכל עמודה/שורה צריך שיהיה לפחות תא אחד עם הגובה המקסימלי — השאר יכולים להיות 0." },
      { title: "⚠️ בלבול בין עמודות לשורות", text: "בתרשים 3×3: עמודות הן אנכיות (מבט מלפנים), שורות הן אופקיות (מבט מהצד). החלפה ביניהן נותנת מבטים שגויים." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: מה הקשר בין תרשים מספרים למבטים, ואיך בונים מבנה מינימלי? (לפחות 80 תווים)",
    steps: [
      { phase:"סעיף א׳", label:"ציור מבטים", coaching:"", prompt:"נתון תרשים מספרים 3×3. תנחה אותי — איך מוצאים את מבט מלפנים (מקסימום בכל עמודה) ומבט מהצד (מקסימום בכל שורה).", keywords:[], keywordHint:"", contextWords:["מבט","מלפנים","צד","מקסימום","עמודה","שורה"] },
      { phase:"סעיף ב׳", label:"ספירת קוביות", coaching:"", prompt:"תכווין אותי לספור את כל הקוביות — סכום כל המספרים בתרשים.", keywords:[], keywordHint:"", contextWords:["סכום","קוביות","ספירה","כולל","תרשים","חיבור"] },
      { phase:"סעיף ג׳", label:"תרשים חלופי", coaching:"", prompt:"תדריך אותי — איך בונים תרשים שונה שנותן את אותם מבטים. מה אפשר לשנות ומה לא.", keywords:[], keywordHint:"", contextWords:["חלופי","שונה","מבטים","זהים","שינוי","אפשרי"] },
      { phase:"סעיף ד׳", label:"מבנה מינימלי", coaching:"", prompt:"תנחה אותי — מהו מספר הקוביות המינימלי שנותן את אותם מבטים. איך מקטינים כל תא למינימום.", keywords:[], keywordHint:"", contextWords:["מינימלי","קוביות","מבטים","מינימום","צמצום","תא"] },
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
        <div style={{ textAlign:"center", marginBottom:14 }}><div style={{ color:s.accentColor, fontSize:15, fontWeight:800, marginBottom:4 }}>🧊 תרשים מספרים</div><div style={{ color:"#6B7280", fontSize:12, lineHeight:1.55 }}>{ex.id==="basic"&&"קריאת תרשים — גובה, ספירה ותיאור."}{ex.id==="medium"&&"השלמת תרשים ממבטים — לפנים וצד."}{ex.id==="advanced"&&"בניית מבנה, תרשים חלופי ומבנה מינימלי."}</div></div>
        <div style={{ height:1, background:"rgba(60,54,42,0.1)", marginBottom:14 }}/>
        <div style={{ marginBottom:12 }}><div style={{ color:"#1A1A1A", fontSize:12, fontWeight:700, marginBottom:6 }}>🎯 כללים</div><div style={{ display:"flex", flexDirection:"column", gap:5 }}><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:130 }}>תרשים מספרים</span><span>מבט עליון — כל תא = גובה עמודה</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:130 }}>מבט מלפנים</span><span>max בכל עמודה</span></div><div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13, color:"#2D3436", lineHeight:1.55 }}><span style={{ color:s.accentColor, fontFamily:"monospace", fontWeight:700, minWidth:130 }}>מבט מהצד</span><span>max בכל שורה</span></div></div></div>
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

/* ─── NumberDiagramLab (basic) ─────────────────────────────────────────────── */

function NumberDiagramLab() {
  const [grid,setGrid]=useState([[2,1,0],[3,2,1],[1,2,3]]);
  const st=STATION.basic;
  const total=grid.flat().reduce((s,v)=>s+v,0);
  const maxH=Math.max(...grid.flat());
  const frontView=grid[0].map((_,c)=>Math.max(...grid.map(r=>r[c])));
  const sideView=grid.map(r=>Math.max(...r));
  const cs=44;
  const updateCell=(r:number,c:number,v:number)=>{setGrid(p=>{const n=p.map(row=>[...row]);n[r][c]=v;return n;});};
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת תרשים מספרים</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>לחצו על תא כדי לשנות גובה — צפו כיצד המבטים משתנים.</p>
      {/* Interactive grid */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:"2rem" }}>
        <div style={{ display:"grid", gridTemplateColumns:`repeat(3,${cs}px)`, gap:4 }}>
          {grid.map((row,r)=>row.map((v,c)=>{
            return (<div key={`${r}${c}`} style={{ width:cs, height:cs, borderRadius:8, border:`2px solid rgba(${st.glowRgb},0.4)`, background:`rgba(${st.glowRgb},${0.05+v*0.08})`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", userSelect:"none" }} onClick={()=>updateCell(r,c,(v+1)%5)}><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:800, fontSize:20 }}>{v}</span></div>);
          }))}
        </div>
      </div>
      {/* Views */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 2rem" }}>
        <div style={{ borderRadius:12, border:`1px solid rgba(${st.glowRgb},0.3)`, background:"rgba(255,255,255,0.75)", padding:"0.75rem", textAlign:"center" }}>
          <div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:6 }}>מבט מלפנים</div>
          <div style={{ display:"flex", justifyContent:"center", gap:8 }}>{frontView.map((v,i)=>(<div key={i} style={{ width:30, height:30, borderRadius:6, background:`rgba(${st.glowRgb},0.12)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", fontWeight:700, fontSize:16, color:st.accentColor }}>{v}</div>))}</div>
        </div>
        <div style={{ borderRadius:12, border:`1px solid rgba(${st.glowRgb},0.3)`, background:"rgba(255,255,255,0.75)", padding:"0.75rem", textAlign:"center" }}>
          <div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:6 }}>מבט מהצד</div>
          <div style={{ display:"flex", justifyContent:"center", gap:8 }}>{sideView.map((v,i)=>(<div key={i} style={{ width:30, height:30, borderRadius:6, background:`rgba(${st.glowRgb},0.12)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", fontWeight:700, fontSize:16, color:st.accentColor }}>{v}</div>))}</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"סה״כ קוביות",val:String(total)},{label:"גובה מרבי",val:String(maxH)},{label:"גודל",val:"3×3"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12, boxShadow:"0 4px 16px rgba(60,54,42,0.06)" }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:20, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>לחצו על תא כדי להגדיל (0→1→2→3→4→0). שימו לב כיצד המבטים מתעדכנים!</p>
    </section>
  );
}

/* ─── ViewMatchLab (medium) ────────────────────────────────────────────────── */

function ViewMatchLab() {
  const [grid,setGrid]=useState([[2,1,0],[3,2,1],[1,2,3]]);
  const st=STATION.medium;
  const targetFront=[3,2,3]; const targetSide=[2,3,3];
  const frontView=grid[0].map((_,c)=>Math.max(...grid.map(r=>r[c])));
  const sideView=grid.map(r=>Math.max(...r));
  const frontMatch=frontView.every((v,i)=>v===targetFront[i]);
  const sideMatch=sideView.every((v,i)=>v===targetSide[i]);
  const updateCell=(r:number,c:number,v:number)=>{setGrid(p=>{const n=p.map(row=>[...row]);n[r][c]=v;return n;});};
  const cs=44;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת התאמת מבטים</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>בנו תרשים שמתאים למבטים הנתונים. לחצו על תאים לשינוי.</p>
      {/* Target views */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 1.5rem" }}>
        <div style={{ borderRadius:12, border:`2px solid ${frontMatch?"#16a34a":"#d97706"}`, background:frontMatch?"rgba(220,252,231,0.3)":"rgba(255,251,235,0.3)", padding:"0.75rem", textAlign:"center" }}>
          <div style={{ color:frontMatch?"#15803d":"#92400e", fontSize:11, fontWeight:700, marginBottom:6 }}>מבט מלפנים (יעד) {frontMatch?"✅":"❌"}</div>
          <div style={{ display:"flex", justifyContent:"center", gap:8 }}>{targetFront.map((v,i)=>(<div key={i} style={{ width:30, height:30, borderRadius:6, background:"rgba(234,88,12,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", fontWeight:700, fontSize:16, color:"#EA580C" }}>{v}</div>))}</div>
        </div>
        <div style={{ borderRadius:12, border:`2px solid ${sideMatch?"#16a34a":"#d97706"}`, background:sideMatch?"rgba(220,252,231,0.3)":"rgba(255,251,235,0.3)", padding:"0.75rem", textAlign:"center" }}>
          <div style={{ color:sideMatch?"#15803d":"#92400e", fontSize:11, fontWeight:700, marginBottom:6 }}>מבט מהצד (יעד) {sideMatch?"✅":"❌"}</div>
          <div style={{ display:"flex", justifyContent:"center", gap:8 }}>{targetSide.map((v,i)=>(<div key={i} style={{ width:30, height:30, borderRadius:6, background:"rgba(234,88,12,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", fontWeight:700, fontSize:16, color:"#EA580C" }}>{v}</div>))}</div>
        </div>
      </div>
      {/* Editable grid */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:"1.5rem" }}>
        <div style={{ display:"grid", gridTemplateColumns:`repeat(3,${cs}px)`, gap:4 }}>
          {grid.map((row,r)=>row.map((v,c)=>{
            return (<div key={`${r}${c}`} style={{ width:cs, height:cs, borderRadius:8, border:`2px solid rgba(${st.glowRgb},0.4)`, background:`rgba(${st.glowRgb},${0.05+v*0.08})`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", userSelect:"none" }} onClick={()=>updateCell(r,c,(v+1)%5)}><span style={{ color:st.accentColor, fontFamily:"monospace", fontWeight:800, fontSize:20 }}>{v}</span></div>);
          }))}
        </div>
      </div>
      {frontMatch&&sideMatch&&(<div style={{ borderRadius:12, background:"rgba(220,252,231,1)", border:"2px solid #16a34a", padding:12, textAlign:"center", color:"#14532d", fontWeight:700, fontSize:14 }}>התרשים תואם את שני המבטים!</div>)}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, textAlign:"center", marginTop:12 }}>
        {[{label:"סה״כ קוביות",val:String(grid.flat().reduce((s,v)=>s+v,0))},{label:"סטטוס",val:frontMatch&&sideMatch?"תואם ✅":"לא תואם ❌"}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12 }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:17, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
    </section>
  );
}

/* ─── MinimalBuildLab (advanced) ────────────────────────────────────────────── */

function MinimalBuildLab() {
  const [grid]=useState([[3,2,1],[2,1,0],[1,0,0]]);
  const st=STATION.advanced;
  const frontView=grid[0].map((_,c)=>Math.max(...grid.map(r=>r[c])));
  const sideView=grid.map(r=>Math.max(...r));
  const total=grid.flat().reduce((s,v)=>s+v,0);
  // Minimal: each cell = min(frontView[c], sideView[r]) but only if needed
  const minGrid=grid.map((row,r)=>row.map((_,c)=>Math.min(frontView[c],sideView[r])));
  const minTotal=minGrid.flat().reduce((s,v)=>s+v,0);
  const cs=44;
  return (
    <section style={{ border:`1px solid ${st.glowBorder}`, borderRadius:24, padding:"2.5rem", background:"rgba(255,255,255,0.82)", backdropFilter:"blur(8px)", boxShadow:"0 10px 15px -3px rgba(60,54,42,0.1)", marginTop:"2rem" }}>
      <h3 style={{ color:"#2D3436", fontSize:22, fontWeight:800, textAlign:"center", marginBottom:8 }}>מעבדת מבנה מינימלי</h3>
      <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", marginBottom:"2rem" }}>השוו בין תרשים מקורי לתרשים מינימלי — אותם מבטים, פחות קוביות!</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:16, alignItems:"center", maxWidth:500, margin:"0 auto 2rem" }}>
        {/* Original */}
        <div style={{ textAlign:"center" }}>
          <div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:8 }}>מקורי ({total} קוביות)</div>
          <div style={{ display:"grid", gridTemplateColumns:`repeat(3,${cs}px)`, gap:3, justifyContent:"center" }}>
            {grid.map((row,r)=>row.map((v,c)=>(<div key={`o${r}${c}`} style={{ width:cs, height:cs, borderRadius:6, border:`1.5px solid rgba(${st.glowRgb},0.3)`, background:`rgba(${st.glowRgb},${0.05+v*0.06})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", fontWeight:700, fontSize:16, color:st.accentColor }}>{v}</div>)))}
          </div>
        </div>
        <div style={{ fontSize:24, color:"#64748b" }}>→</div>
        {/* Minimal */}
        <div style={{ textAlign:"center" }}>
          <div style={{ color:"#34d399", fontSize:11, fontWeight:600, marginBottom:8 }}>מינימלי ({minTotal} קוביות)</div>
          <div style={{ display:"grid", gridTemplateColumns:`repeat(3,${cs}px)`, gap:3, justifyContent:"center" }}>
            {minGrid.map((row,r)=>row.map((v,c)=>(<div key={`m${r}${c}`} style={{ width:cs, height:cs, borderRadius:6, border:`1.5px solid rgba(52,211,153,0.4)`, background:`rgba(52,211,153,${0.05+v*0.06})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", fontWeight:700, fontSize:16, color:"#059669" }}>{v}</div>)))}
          </div>
        </div>
      </div>
      {/* Shared views */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:400, margin:"0 auto 1.5rem" }}>
        <div style={{ borderRadius:12, border:`1px solid rgba(${st.glowRgb},0.3)`, background:"rgba(255,255,255,0.75)", padding:"0.75rem", textAlign:"center" }}>
          <div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:6 }}>מבט מלפנים (זהה!)</div>
          <div style={{ display:"flex", justifyContent:"center", gap:8 }}>{frontView.map((v,i)=>(<div key={i} style={{ width:28, height:28, borderRadius:6, background:`rgba(${st.glowRgb},0.12)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", fontWeight:700, fontSize:14, color:st.accentColor }}>{v}</div>))}</div>
        </div>
        <div style={{ borderRadius:12, border:`1px solid rgba(${st.glowRgb},0.3)`, background:"rgba(255,255,255,0.75)", padding:"0.75rem", textAlign:"center" }}>
          <div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:6 }}>מבט מהצד (זהה!)</div>
          <div style={{ display:"flex", justifyContent:"center", gap:8 }}>{sideView.map((v,i)=>(<div key={i} style={{ width:28, height:28, borderRadius:6, background:`rgba(${st.glowRgb},0.12)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", fontWeight:700, fontSize:14, color:st.accentColor }}>{v}</div>))}</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
        {[{label:"מקורי",val:`${total} קוביות`},{label:"מינימלי",val:`${minTotal} קוביות`},{label:"חיסכון",val:`${total-minTotal} קוביות`}].map(r=>(<div key={r.label} style={{ borderRadius:16, background:"rgba(255,255,255,0.75)", border:`1px solid rgba(${st.glowRgb},0.4)`, padding:12 }}><div style={{ color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:4 }}>{r.label}</div><div style={{ color:st.accentColor, fontWeight:700, fontSize:18, fontFamily:"monospace" }}>{r.val}</div></div>))}
      </div>
      <p style={{ color:"#6B7280", fontSize:12, textAlign:"center", marginTop:16 }}>המינימלי = min(מבט לפנים[עמודה], מבט צד[שורה]) בכל תא. אותם מבטים, פחות קוביות!</p>
    </section>
  );
}

/* ─── Tabs + FormulaBar ────────────────────────────────────────────────────── */

const TABS=[{id:"basic",label:"מתחיל",textColor:"text-green-700",border:"border-green-600",bg:"bg-green-600/10",glowColor:"rgba(22,163,74,0.3)"},{id:"medium",label:"בינוני",textColor:"text-orange-700",border:"border-orange-600",bg:"bg-orange-600/10",glowColor:"rgba(234,88,12,0.3)"},{id:"advanced",label:"מתקדם",textColor:"text-red-700",border:"border-red-700",bg:"bg-red-700/10",glowColor:"rgba(220,38,38,0.3)"}];

function FormulaBar() {
  const [activeTab,setActiveTab]=useState<"diagram"|"views"|"minimal"|null>(null);
  const tabs=[{id:"diagram" as const,label:"🔢 תרשים",tex:"h_{ij}",color:"#16A34A",borderColor:"rgba(22,163,74,0.35)"},{id:"views" as const,label:"👁 מבטים",tex:"\\max",color:"#EA580C",borderColor:"rgba(234,88,12,0.35)"},{id:"minimal" as const,label:"📉 מינימלי",tex:"\\min(F,S)",color:"#DC2626",borderColor:"rgba(220,38,38,0.35)"}];
  return (
    <div style={{ borderRadius:12, border:"1px solid rgba(60,54,42,0.15)", background:"rgba(255,255,255,0.75)", padding:"1.25rem", marginBottom:"1.25rem", boxShadow:"0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color:"#6B7280", fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, marginBottom:12, textAlign:"center" }}>נוסחאות</div>
      <div style={{ display:"flex", gap:6, marginBottom:activeTab?14:0 }}>{tabs.map(t=>{const isA=activeTab===t.id;return(<button key={t.id} onClick={()=>setActiveTab(isA?null:t.id)} style={{ flex:1, padding:"10px 6px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", border:`1.5px solid ${isA?t.borderColor:"rgba(60,54,42,0.1)"}`, background:isA?`${t.color}0D`:"rgba(60,54,42,0.03)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}><span style={{ fontSize:11, fontWeight:700, color:isA?t.color:"#6B7280" }}>{t.label}</span><span style={{ color:isA?t.color:"#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>);})}</div>
      {activeTab==="diagram"&&(<motion.div key="d" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(22,163,74,0.25)", background:"rgba(220,252,231,0.4)", padding:16 }}><div style={{ borderRadius:10, background:"rgba(22,163,74,0.06)", border:"1px solid rgba(22,163,74,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>תרשים מספרים</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>כל תא מייצג עמודת קוביות — המספר = גובה.</li><li>סכום כל התאים = סה״כ קוביות.</li><li>0 = אין קוביה במקום.</li></ol></div></div></div></motion.div>)}
      {activeTab==="views"&&(<motion.div key="v" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(234,88,12,0.25)", background:"rgba(255,247,237,0.95)", padding:16 }}><div style={{ borderRadius:10, background:"rgba(234,88,12,0.06)", border:"1px solid rgba(234,88,12,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>מבטים מתרשים</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li><strong>מלפנים:</strong> max בכל עמודה (אנכית).</li><li><strong>מהצד:</strong> max בכל שורה (אופקית).</li><li><strong>מלמעלה:</strong> 1 אם יש קובייה, 0 אם אין.</li></ol></div><div style={{ marginTop:10, color:"#B45309", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 מבט מראה רק את הגבוה ביותר — הקוביות מאחוריו מוסתרות!</div></div></div></motion.div>)}
      {activeTab==="minimal"&&(<motion.div key="m" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} style={{overflow:"hidden"}}><div style={{ borderRadius:12, border:"2px solid rgba(220,38,38,0.25)", background:"rgba(254,242,242,0.95)", padding:16 }}><div style={{ borderRadius:10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)", padding:"12px 14px" }}><div style={{ color:"#1A1A1A", fontSize:12, lineHeight:2, fontWeight:500 }}><strong>מבנה מינימלי</strong><ol dir="rtl" style={{ margin:"6px 0 0", paddingInlineStart:18 }}><li>כל תא ≤ min(מבט לפנים[עמודה], מבט צד[שורה]).</li><li>בכל שורה לפחות תא אחד = מבט צד של אותה שורה.</li><li>בכל עמודה לפחות תא אחד = מבט לפנים של אותה עמודה.</li></ol></div><div style={{ marginTop:10, color:"#DC2626", fontSize:11, fontWeight:600, lineHeight:1.7 }}>💡 מינימלי ≠ יחיד — יכולים להיות כמה מבנים מינימליים שונים.</div></div></div></motion.div>)}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function NumberDiagramPage() {
  const [selectedLevel,setSelectedLevel]=useState<"basic"|"medium"|"advanced">("basic");
  const ex=exercises.find(e=>e.id===selectedLevel)!;
  const lvlRgb=selectedLevel==="basic"?"45,90,39":selectedLevel==="medium"?"163,79,38":"139,38,53";
  return (
    <main style={{ minHeight:"100vh", background:"#F3EFE0", backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:"#2D3436", ["--lvl-rgb" as string]:lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`textarea,input[type="text"],input[type="password"]{outline:none!important}textarea:focus,input[type="text"]:focus{outline:none!important;border-color:rgba(var(--lvl-rgb),0.65)!important;box-shadow:0 0 0 3px rgba(var(--lvl-rgb),0.12)!important}input[type="range"]{outline:none!important}input[type="range"]:focus{outline:none!important}button:focus,button:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(var(--lvl-rgb),0.35)!important}button:focus:not(:focus-visible){box-shadow:none!important}`}</style>
      <div style={{ borderBottom:"1px solid rgba(60,54,42,0.15)", background:"#F3EFE0" }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div><h1 style={{ fontSize:22, fontWeight:700, color:"#2D3436", margin:0 }}>תרשים מספרים עם AI — כיתה יב׳ (3 יח׳)</h1><p style={{ fontSize:13, color:"#6B7280", margin:"2px 0 0" }}>קריאה, בנייה, מבטים ומבנה מינימלי</p></div>
          <Link href="/3u/topic/grade12/spatial" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap" }} onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D";}} onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A";}}><span style={{ fontSize:16 }}>←</span>חזרה</Link>
        </div>
      </div>
      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="3u/grade12/spatial/number-diagram"/>
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(60,54,42,0.15)" }}>{TABS.map(tab=>{const active=selectedLevel===tab.id;return(<button key={tab.id} onClick={()=>setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active?`${tab.bg} border ${tab.border} ${tab.textColor}`:"text-stone-500 hover:text-stone-800"}`} style={active?{boxShadow:`0 0 14px ${tab.glowColor}`}:undefined}>{tab.label}</button>);})}</div>
        <FormulaBar/>
        <motion.div key={selectedLevel} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22}}><ExerciseCard ex={ex}/></motion.div>
        {selectedLevel==="basic"&&<NumberDiagramLab/>}
        {selectedLevel==="medium"&&<ViewMatchLab/>}
        {selectedLevel==="advanced"&&<MinimalBuildLab/>}
        <div style={{ marginTop:"1.5rem" }}><MarkComplete subtopicId="3u/grade12/spatial/number-diagram" level={selectedLevel}/></div>
      </div>
    </main>
  );
}
