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

// ─── KaTeX helpers ───────────────────────────────────────────────────────────

function InlineMath({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) katex.render(children, ref.current, { throwOnError: false, displayMode: false }); }, [children]);
  return <span ref={ref} />;
}
function DisplayMath({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) katex.render(children, ref.current, { throwOnError: false, displayMode: true }); }, [children]);
  return <span ref={ref} style={{ display: "block", textAlign: "center" }} />;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PromptStep = { phase: string; label: string; coaching: string; prompt: string; keywords: string[]; keywordHint: string; contextWords?: string[]; stationWords?: string[] };
type ExerciseDef = { id: "basic" | "medium" | "advanced"; title: string; problem: string; diagram: React.ReactNode; pitfalls: { title: string; text: string }[]; goldenPrompt: string; advancedGateQuestion?: string; steps: PromptStep[] };

// ─── Station config ───────────────────────────────────────────────────────────

const STATION = {
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",  ladderBorder: "#16A34A", glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderHex: "#2D5A27", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700", ladderBorder: "#EA580C", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderHex: "#A34F26", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",    ladderBorder: "#DC2626", glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderHex: "#8B2635", borderRgb: "139,38,53" },
} as const;

// ─── SVG diagrams (silent) ───────────────────────────────────────────────────

function BasicSVG() {
  return (
    <svg viewBox="0 0 260 180" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={40} y1={20} x2={40} y2={155} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={25} y1={140} x2={240} y2={140} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={36} y={15} fontSize={11} fill="#94a3b8" textAnchor="middle" fontFamily="serif">y</text>
      <text x={245} y={143} fontSize={11} fill="#94a3b8" textAnchor="middle" fontFamily="serif">x</text>
      {/* Rising line */}
      <line x1={40} y1={120} x2={220} y2={40} stroke="#16A34A" strokeWidth={2.5} opacity={0.7} />
      {/* y-intercept dot */}
      <circle cx={40} cy={120} r={4} fill="#f59e0b" />
      <text x={30} y={116} fontSize={10} fill="#f59e0b" textAnchor="end" fontFamily="sans-serif">b</text>
      {/* x-intercept dot */}
      <circle cx={130} cy={80} r={0} />
      {/* Slope triangle hint */}
      <line x1={80} y1={102} x2={140} y2={102} stroke="#a78bfa" strokeWidth={1} strokeDasharray="3,2" />
      <line x1={140} y1={102} x2={140} y2={75} stroke="#a78bfa" strokeWidth={1} strokeDasharray="3,2" />
      <text x={110} y={115} fontSize={9} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">Δx</text>
      <text x={150} y={92} fontSize={9} fill="#a78bfa" textAnchor="start" fontFamily="sans-serif">Δy</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 260 190" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={130} y1={15} x2={130} y2={170} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={20} y1={110} x2={245} y2={110} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={126} y={12} fontSize={11} fill="#94a3b8" textAnchor="middle" fontFamily="serif">y</text>
      <text x={250} y={113} fontSize={11} fill="#94a3b8" textAnchor="middle" fontFamily="serif">x</text>
      {/* Two intersecting lines */}
      <line x1={30} y1={155} x2={230} y2={35} stroke="#EA580C" strokeWidth={2} opacity={0.7} />
      <line x1={40} y1={40} x2={240} y2={150} stroke="#a78bfa" strokeWidth={2} opacity={0.7} />
      {/* Intersection point */}
      <circle cx={140} cy={92} r={5} fill="none" stroke="#f59e0b" strokeWidth={2} />
      <text x={150} y={86} fontSize={10} fill="#f59e0b" fontFamily="sans-serif">?</text>
      {/* Labels */}
      <text x={232} y={30} fontSize={11} fill="#EA580C" fontFamily="serif">ℓ₁</text>
      <text x={242} y={155} fontSize={11} fill="#a78bfa" fontFamily="serif">ℓ₂</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 260 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={60} y1={15} x2={60} y2={175} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={20} y1={140} x2={245} y2={140} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={56} y={12} fontSize={11} fill="#94a3b8" textAnchor="middle" fontFamily="serif">y</text>
      <text x={250} y={143} fontSize={11} fill="#94a3b8" textAnchor="middle" fontFamily="serif">x</text>
      {/* Line */}
      <line x1={30} y1={165} x2={230} y2={25} stroke="#DC2626" strokeWidth={2.5} opacity={0.6} />
      {/* Two points on the line */}
      <circle cx={80} cy={140} r={4} fill="#DC2626" opacity={0.8} />
      <circle cx={180} cy={60} r={4} fill="#DC2626" opacity={0.8} />
      <text x={75} y={156} fontSize={10} fill="#DC2626" textAnchor="middle" fontFamily="sans-serif">A</text>
      <text x={185} y={54} fontSize={10} fill="#DC2626" textAnchor="middle" fontFamily="sans-serif">B</text>
      {/* Triangle between points */}
      <line x1={80} y1={140} x2={180} y2={140} stroke="#64748b" strokeWidth={1} strokeDasharray="3,2" />
      <line x1={180} y1={140} x2={180} y2={60} stroke="#64748b" strokeWidth={1} strokeDasharray="3,2" />
      <text x={130} y={155} fontSize={9} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>
      <text x={192} y={105} fontSize={9} fill="#64748b" textAnchor="start" fontFamily="sans-serif">?</text>
    </svg>
  );
}

// ─── Prompt Coach Atoms ───────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  return (<button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(60,54,42,0.25)", color: "#1A1A1A", fontWeight: 500, cursor: "pointer" }}>{c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}</button>);
}

function GoldenPromptCard({ prompt, title = "פרומפט ראשי", glowRgb = "16,185,129", borderRgb = "45,90,39" }: { prompt: string; title?: string; glowRgb?: string; borderRgb?: string }) {
  return (<div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)` }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span>✨</span><span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span></div><p style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p><CopyBtn text={prompt} label="העתק פרומפט מלא" /></div>);
}

function TutorStepBasic({ step, glowRgb = "16,185,129", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) {
  return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(${glowRgb},0.45)`, marginBottom: 8, boxShadow: `0 0 14px rgba(${glowRgb},0.18)` }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}><span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><div><div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>הפרומפט המוכן ✍️</div><div style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div></div><CopyBtn text={step.prompt} label="העתק פרומפט ממוקד" /></div></div>);
}

function TutorStepMedium({ step, locked = false, onPass, borderRgb = "45,90,39" }: { step: PromptStep; locked?: boolean; onPass?: () => void; borderRgb?: string }) {
  const [text, setText] = useState(""); const [result, setResult] = useState<ScoreResult | null>(null); const [copied, setCopied] = useState(false);
  const passed = !!(result && !result.blocked && result.score >= 75);
  const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי — כתוב לפחות 20 תווים." }); return; } const res = calculatePromptScore(text, step.contextWords ?? []); setResult(res); if (!res.blocked && res.score >= 75) onPass?.(); };
  if (locked) return (<div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.3)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 16 }}>🔒</span><div><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span></div></div>);
  const scoreBarColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(245,158,11,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8, boxShadow: passed ? "0 0 16px rgba(245,158,11,0.25)" : "none", transition: "border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(245,158,11,0.3)" : `rgba(${borderRgb},0.2)`}` }}>{passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={(e) => { setText(e.target.value); setResult(null); }} placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..." style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(245,158,11,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        {result && (<div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", marginBottom: 4, fontWeight: 600 }}><span>ציון הפרומפט</span><span style={{ color: "#1A1A1A", fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} /></div></div>)}
        {!result && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>בדיקת AI מדומה 🤖</button>}
        {result && result.blocked && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>⚠️ {result.hint}</motion.div>}
        {result && !result.blocked && result.score < 75 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>💡 {result.hint}</motion.div>}
        {passed && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>✅ פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result.score}/100</strong></div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}</button></motion.div>)}
        {result && !passed && <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>}
      </div>
    </div>
  );
}

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [completed, setCompleted] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlocked = completed.filter(Boolean).length + 1;
  const markDone = (i: number) => { setCompleted(prev => { const n = [...prev]; n[i] = true; return n; }); const el = document.getElementById(`basic-step-${i + 1}`); if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 200); };
  return (<div><GoldenPromptCard prompt={goldenPrompt} title="פרומפט ראשי" glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => (<div key={i} id={`basic-step-${i}`}>{i < unlocked ? (<><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />{!completed[i] ? (<button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>סיימתי סעיף זה ✓</button>) : (<div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✅ הושלם</div>)}</>) : (<div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}><div style={{ position: "absolute", top: 8, right: 8, fontSize: 16, zIndex: 2 }}>🔒</div><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} /></div>)}</div>))}</div>);
}

function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [passed, setPassed] = useState<boolean[]>(Array(steps.length).fill(false));
  return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => (<TutorStepMedium key={i} step={s} locked={i > 0 && !passed[i - 1]} onPass={() => setPassed(prev => { const n = [...prev]; n[i] = true; return n; })} borderRgb={borderRgb} />))}</div>);
}

function LadderAdvanced({ steps }: { steps: PromptStep[] }) {
  const [masterPassed, setMasterPassed] = useState(false);
  const [unlockedCount, setUnlockedCount] = useState(1);
  const allPassed = masterPassed && unlockedCount > steps.length;
  return (
    <div>
      <MasterPromptGate onPass={() => setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["ישר", "שיפוע", "משוואה", "חיתוך", "נקודה", "y=mx+b", "גרף"]} />
      {steps.map((s, i) => (<div key={i} style={{ marginBottom: 8 }}>{(!masterPassed || i >= unlockedCount) ? (<div style={{ borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.7)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{s.phase} — {s.label}</span><span style={{ fontSize: 16 }}>🔒</span></div>) : (<div><div style={{ borderRadius: 14, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(255,255,255,0.9)", padding: "14px 16px", marginBottom: 8 }}><div style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{s.phase} — {s.label}</div><div style={{ color: "#334155", fontSize: 13, lineHeight: 1.6 }}>{s.prompt}</div></div><button onClick={() => setUnlockedCount(v => Math.max(v, i + 2))} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>סיימתי סעיף זה ✓</button></div>)}</div>))}
      {allPassed && (<div style={{ borderRadius: 16, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: "1.25rem 1.5rem", marginTop: 16, textAlign: "center" }}><div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div><div style={{ color: "#14532d", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>כל הכבוד — השלמת את הרמה המתקדמת!</div><div style={{ color: "#166534", fontSize: 13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}
    </div>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "משוואת ישר — שיפוע וחיתוך",
    problem: "נתונה הפונקציה הלינארית y = mx + b.\n\nא. אם השיפוע m = 2 וחיתוך ציר Y ב-b = −3, כתבו את משוואת הישר.\nב. מצאו את נקודת החיתוך עם ציר X (כלומר כאשר y = 0).\nג. שרטטו סקיצה של הגרף וציינו את שתי נקודות החיתוך.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בין שיפוע לחיתוך Y", text: "ב-y = mx + b, הערך m הוא השיפוע (כמה y עולה כש-x עולה ב-1), ו-b הוא חיתוך ציר Y. תלמידים מחליפים ביניהם ומקבלים ישר שונה לגמרי." },
      { title: "⚠️ שכחה להציב y = 0 לחיתוך עם ציר X", text: "כדי למצוא חיתוך עם ציר X צריך להציב y = 0 (לא x = 0!). הצבת x = 0 נותנת חיתוך עם ציר Y. בדקו תמיד מה שואלים." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י' ומצרף/ת שאלה על פונקציה לינארית — משוואת ישר, שיפוע ונקודות חיתוך. אני רוצה שתהיה המורה הפרטי שלי — תסביר לי את הלוגיקה ולא תיתן תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "כתיבת משוואת הישר", coaching: "", prompt: "m = 2, b = −3. תנחה אותי לכתוב את משוואת הישר y = mx + b — איך מציבים את הנתונים.", keywords: [], keywordHint: "", contextWords: ["משוואה", "ישר", "שיפוע", "חיתוך", "הצבה", "y=mx+b"] },
      { phase: "סעיף ב׳", label: "חיתוך עם ציר X", coaching: "", prompt: "משוואת הישר ידועה. תכווין אותי — כדי למצוא חיתוך ציר X מה מציבים ולמה.", keywords: [], keywordHint: "", contextWords: ["חיתוך", "ציר X", "y=0", "הצבה", "פתרון", "נקודה"] },
      { phase: "סעיף ג׳", label: "סקיצת הגרף", coaching: "", prompt: "מצאנו שתי נקודות חיתוך עם הצירים. תדריך אותי — איך משרטטים ישר על מערכת צירים בעזרת שתי נקודות.", keywords: [], keywordHint: "", contextWords: ["גרף", "שרטוט", "נקודות", "ישר", "צירים", "סקיצה"] },
    ],
  },
  {
    id: "medium",
    title: "מציאת משוואת ישר מתנאים",
    problem: "ישר ℓ עובר דרך הנקודה A(1, 5) ושיפועו m = −2.\n\nא. מצאו את משוואת הישר בצורה y = mx + b.\nב. מצאו את נקודות החיתוך עם שני הצירים.\nג. ישר נוסף ℓ₂ מקביל ל-ℓ ועובר דרך ראשית הצירים. כתבו את משוואתו.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ שכחת ההצבה לאחר מציאת b", text: "אחרי שמציבים את הנקודה במשוואה ומוצאים b, חייבים לכתוב את המשוואה המלאה y = mx + b. תלמידים עוצרים אחרי שמצאו b ולא כותבים את התשובה הסופית." },
      { title: "⚠️ בלבול בין ישרים מקבילים לאנכיים", text: "ישרים מקבילים = אותו שיפוע, חיתוך Y שונה. ישרים אנכיים = מכפלת שיפועים = −1. תלמידים מבלבלים ביניהם." },
    ],
    goldenPrompt: `אני בכיתה י', ומצרף/ת תרגיל על מציאת משוואת ישר מנקודה ושיפוע, חיתוך עם צירים, ומקביליות.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על הצבה ומציאת b.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "מציאת b מנקודה ושיפוע", coaching: "", prompt: "ישר ℓ עובר דרך A(1,5) עם שיפוע m=−2. תנחה אותי — איך מציבים את הנקודה ב-y=mx+b כדי למצוא b.", keywords: [], keywordHint: "", contextWords: ["הצבה", "נקודה", "שיפוע", "b", "משוואה", "ישר"] },
      { phase: "סעיף ב׳", label: "נקודות חיתוך עם הצירים", coaching: "", prompt: "משוואת הישר ℓ ידועה. תכווין אותי — איך מוצאים חיתוך ציר Y (x=0) וחיתוך ציר X (y=0).", keywords: [], keywordHint: "", contextWords: ["חיתוך", "ציר", "X", "Y", "הצבה", "נקודה"] },
      { phase: "סעיף ג׳", label: "ישר מקביל", coaching: "", prompt: "ℓ₂ מקביל ל-ℓ ועובר דרך (0,0). תדריך אותי — מה השיפוע של ישר מקביל, ומה b כשעובר דרך ראשית הצירים.", keywords: [], keywordHint: "", contextWords: ["מקביל", "שיפוע", "ראשית", "צירים", "משוואה", "שווה"] },
    ],
  },
  {
    id: "advanced",
    title: "מציאת משוואת ישר דרך שתי נקודות",
    problem: "נתונות שתי נקודות: A(−1, 4) ו-B(3, −2).\n\nא. חשבו את שיפוע הישר העובר דרך A ו-B.\nב. מצאו את משוואת הישר בצורה y = mx + b.\nג. מצאו את נקודות החיתוך עם שני הצירים.\nד. כתבו את משוואת הישר האנכי ל-AB שעובר דרך אמצע הקטע AB.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ טעות בחישוב השיפוע — סדר הנקודות", text: "השיפוע m = (y₂−y₁)/(x₂−x₁). חובה לשמור על אותו סדר למעלה ולמטה. אם מחסרים A מ-B למעלה, חייבים לעשות כך גם למטה." },
      { title: "⚠️ שגיאת סימן בנקודות שליליות", text: "כשנקודה מכילה ערך שלילי, חייבים להיזהר בסימנים. למשל (−1)−(3) = −4 ולא +4. מינוס כפול מינוס = פלוס, אבל מינוס כפול פלוס = מינוס." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: איך מחשבים שיפוע משתי נקודות, ואיך מוצאים משוואת ישר אנכי? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "חישוב שיפוע", coaching: "", prompt: "A(−1,4) ו-B(3,−2). תנחה אותי לחשב את השיפוע m = (y₂−y₁)/(x₂−x₁) — מה הסדר הנכון ואיך נזהרים עם סימנים.", keywords: [], keywordHint: "", contextWords: ["שיפוע", "נקודות", "חיסור", "סדר", "מונה", "מכנה"] },
      { phase: "סעיף ב׳", label: "מציאת משוואת הישר", coaching: "", prompt: "מצאנו m. תכווין אותי — איך מציבים אחת הנקודות ב-y=mx+b כדי למצוא b ולכתוב את המשוואה.", keywords: [], keywordHint: "", contextWords: ["הצבה", "משוואה", "b", "ישר", "נקודה", "y=mx+b"] },
      { phase: "סעיף ג׳", label: "חיתוך עם הצירים", coaching: "", prompt: "משוואת הישר ידועה. תדריך אותי למצוא חיתוך ציר X (y=0) וחיתוך ציר Y (x=0).", keywords: [], keywordHint: "", contextWords: ["חיתוך", "ציר", "X", "Y", "הצבה", "אפס"] },
      { phase: "סעיף ד׳", label: "ישר אנכי דרך אמצע", coaching: "", prompt: "A(−1,4) ו-B(3,−2). תנחה אותי — איך מוצאים את אמצע הקטע AB, מה שיפוע הישר האנכי, ואיך כותבים את משוואתו.", keywords: [], keywordHint: "", contextWords: ["אנכי", "אמצע", "שיפוע", "מכפלה", "הופכי", "נקודה"] },
    ],
  },
];

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() { navigator.clipboard.writeText(ex.problem.split(/\n+[אבגדהוזחט]\./)[0].trim()); setCopiedProblem(true); setTimeout(() => setCopiedProblem(false), 2000); }
  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>
      {/* Properties box */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem 1.5rem", marginBottom: "2rem", boxShadow: s.glowShadow }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📈 פונקציה לינארית</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "משוואת ישר y = mx + b — שיפוע, חיתוך עם הצירים וגרף."}
            {ex.id === "medium" && "מציאת משוואה מנקודה ושיפוע, ישרים מקבילים."}
            {ex.id === "advanced" && "משוואה משתי נקודות, ישרים אנכיים, אמצע קטע."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🎯 מושגי יסוד</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}><span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>y = mx + b</span><span>צורה מפורשת של משוואת ישר</span></div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}><span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>m (שיפוע)</span><span>Δy / Δx — כמה y משתנה כש-x עולה ב-1</span></div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}><span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>b (חיתוך Y)</span><span>הנקודה (0, b) שבה הישר חותך את ציר Y</span></div>
          </div>
        </div>
        {ex.id !== "basic" && (<><div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} /><div style={{ marginBottom: 12 }}><div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>✨ {ex.id === "medium" ? "מקביליות" : "שיפוע משתי נקודות"}</div><div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{ex.id === "medium" && <><div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}><span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>מקבילים</span><span>m₁ = m₂ (אותו שיפוע)</span></div><div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}><span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>אנכיים</span><span>m₁ · m₂ = −1</span></div></>}{ex.id === "advanced" && <><div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}><span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 150 }}>m = (y₂−y₁)/(x₂−x₁)</span><span>שיפוע משתי נקודות</span></div><div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}><span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 150 }}>אמצע קטע</span><span>((x₁+x₂)/2, (y₁+y₂)/2)</span></div></>}</div></div></>)}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}><span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span><h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2></div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: "2rem" }} />
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", marginBottom: "2rem" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>📝 השאלה</div><button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.1)" : "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.2)", color: copiedProblem ? "#15803d" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>{copiedProblem ? <Check size={11} /> : <Copy size={11} />}{copiedProblem ? "הועתק!" : "העתק"}</button></div><pre style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre></div>

      <div style={{ marginBottom: "2rem" }}><div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>⚠️ שגיאות נפוצות</div>{ex.pitfalls.map((p, i) => (<div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", padding: "0.85rem 1rem", marginBottom: 8 }}><div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>{p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}</div>))}</div>

      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", boxShadow: s.glowShadow }}><div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>{ex.id === "basic" && <LadderBase steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}{ex.id === "medium" && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}</div>
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
    </section>
  );
}

// ─── LinearGraphLab (basic) ──────────────────────────────────────────────────

function LinearGraphLab() {
  const [m, setM] = useState(2);
  const [b, setB] = useState(-1);
  const st = STATION.basic;

  const yIntercept = b;
  const xIntercept = m !== 0 ? -b / m : null;

  // Graph coords: origin at (130, 110), scale 20px per unit
  const ox = 130, oy = 110, sc = 20;
  const toSx = (x: number) => ox + x * sc;
  const toSy = (y: number) => oy - y * sc;

  // Line endpoints at x = -6 and x = 6
  const x1 = -6, x2 = 6;
  const ly1 = m * x1 + b, ly2 = m * x2 + b;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת פונקציה לינארית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו m ו-b וצפו כיצד הישר זז על מערכת הצירים.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 400, margin: "0 auto 2rem" }}>
        {[
          { label: "m (שיפוע)", val: m, set: setM, min: -5, max: 5, step: 0.5 },
          { label: "b (חיתוך Y)", val: b, set: setB, min: -5, max: 5, step: 0.5 },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}><span>{s.label}</span><span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span></div>
            <input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 260 220" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Grid */}
          {[-5,-4,-3,-2,-1,1,2,3,4,5].map(v => (<g key={`g${v}`}><line x1={toSx(v)} y1={oy - 5 * sc} x2={toSx(v)} y2={oy + 5 * sc} stroke="#e5e7eb" strokeWidth={0.5} /><line x1={ox - 5 * sc} y1={toSy(v)} x2={ox + 5 * sc} y2={toSy(v)} stroke="#e5e7eb" strokeWidth={0.5} /></g>))}
          {/* Axes */}
          <line x1={ox - 6 * sc} y1={oy} x2={ox + 6 * sc} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={ox} y1={oy - 5.5 * sc} x2={ox} y2={oy + 5.5 * sc} stroke="#94a3b8" strokeWidth={1.2} />
          <text x={ox + 6.2 * sc} y={oy + 4} fontSize={11} fill="#94a3b8" fontFamily="serif">x</text>
          <text x={ox - 4} y={oy - 5.7 * sc} fontSize={11} fill="#94a3b8" textAnchor="end" fontFamily="serif">y</text>
          {/* Line */}
          <line x1={toSx(x1)} y1={toSy(ly1)} x2={toSx(x2)} y2={toSy(ly2)} stroke="#16A34A" strokeWidth={2.5} />
          {/* y-intercept */}
          <circle cx={toSx(0)} cy={toSy(yIntercept)} r={4} fill="#f59e0b" />
          {/* x-intercept */}
          {xIntercept !== null && Math.abs(xIntercept) <= 6 && <circle cx={toSx(xIntercept)} cy={toSy(0)} r={4} fill="#a78bfa" />}
        </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "משוואה", val: `y = ${m}x ${b >= 0 ? "+" : "−"} ${Math.abs(b)}` },
          { label: "חיתוך Y", val: `(0, ${b})` },
          { label: "חיתוך X", val: xIntercept !== null ? `(${xIntercept.toFixed(1)}, 0)` : "אין" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>m חיובי = עולה, m שלילי = יורד, m = 0 = ישר אופקי. נסו!</p>
    </section>
  );
}

// ─── ParallelLab (medium) ────────────────────────────────────────────────────

function ParallelLab() {
  const [m, setM] = useState(-2);
  const [b1, setB1] = useState(7);
  const [b2, setB2] = useState(0);
  const st = STATION.medium;

  const ox = 130, oy = 110, sc = 15;
  const toSx = (x: number) => ox + x * sc;
  const toSy = (y: number) => oy - y * sc;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת ישרים מקבילים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את השיפוע ואת b של שני ישרים — מתי הם מקבילים?</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, maxWidth: 500, margin: "0 auto 2rem" }}>
        {[
          { label: "m (שיפוע משותף)", val: m, set: setM, min: -4, max: 4, step: 0.5 },
          { label: "b₁ (ישר 1)", val: b1, set: setB1, min: -6, max: 6, step: 0.5 },
          { label: "b₂ (ישר 2)", val: b2, set: setB2, min: -6, max: 6, step: 0.5 },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}><span>{s.label}</span><span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span></div>
            <input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 260 220" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Axes */}
          <line x1={ox - 8 * sc} y1={oy} x2={ox + 8 * sc} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={ox} y1={oy - 7 * sc} x2={ox} y2={oy + 7 * sc} stroke="#94a3b8" strokeWidth={1.2} />
          {/* Line 1 */}
          <line x1={toSx(-7)} y1={toSy(m * -7 + b1)} x2={toSx(7)} y2={toSy(m * 7 + b1)} stroke="#EA580C" strokeWidth={2} opacity={0.8} />
          {/* Line 2 */}
          <line x1={toSx(-7)} y1={toSy(m * -7 + b2)} x2={toSx(7)} y2={toSy(m * 7 + b2)} stroke="#a78bfa" strokeWidth={2} opacity={0.8} />
          {/* Labels */}
          <text x={toSx(6)} y={toSy(m * 6 + b1) - 6} fontSize={11} fill="#EA580C" fontFamily="serif">ℓ₁</text>
          <text x={toSx(6)} y={toSy(m * 6 + b2) - 6} fontSize={11} fill="#a78bfa" fontFamily="serif">ℓ₂</text>
        </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "ℓ₁", val: `y = ${m}x ${b1 >= 0 ? "+" : "−"} ${Math.abs(b1)}` },
          { label: "ℓ₂", val: `y = ${m}x ${b2 >= 0 ? "+" : "−"} ${Math.abs(b2)}` },
          { label: "מרחק אנכי", val: Math.abs(b1 - b2).toFixed(1) },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>ישרים מקבילים = אותו שיפוע, חיתוך Y שונה. מה קורה כש-b₁ = b₂?</p>
    </section>
  );
}

// ─── SlopeLab (advanced) ─────────────────────────────────────────────────────

function SlopeLab() {
  const [x1, setX1] = useState(-1);
  const [y1, setY1] = useState(4);
  const [x2, setX2] = useState(3);
  const [y2, setY2] = useState(-2);
  const st = STATION.advanced;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const m = dx !== 0 ? dy / dx : NaN;
  const b = dx !== 0 ? y1 - m * x1 : NaN;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const perpM = m !== 0 && !isNaN(m) ? -1 / m : NaN;

  const ox = 130, oy = 110, sc = 16;
  const toSx = (x: number) => ox + x * sc;
  const toSy = (y: number) => oy - y * sc;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת שיפוע ומשוואה</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>הזיזו שתי נקודות וצפו כיצד נבנית משוואת הישר.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, maxWidth: 500, margin: "0 auto 2rem" }}>
        {[
          { label: "x₁", val: x1, set: setX1 },
          { label: "y₁", val: y1, set: setY1 },
          { label: "x₂", val: x2, set: setX2 },
          { label: "y₂", val: y2, set: setY2 },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}><span>{s.label}</span><span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span></div>
            <input type="range" min={-5} max={5} step={1} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 260 220" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Axes */}
          <line x1={ox - 7 * sc} y1={oy} x2={ox + 7 * sc} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={ox} y1={oy - 7 * sc} x2={ox} y2={oy + 7 * sc} stroke="#94a3b8" strokeWidth={1.2} />
          {/* Line through points */}
          {!isNaN(m) && <line x1={toSx(-7)} y1={toSy(m * -7 + b)} x2={toSx(7)} y2={toSy(m * 7 + b)} stroke="#DC2626" strokeWidth={2} opacity={0.7} />}
          {/* Δ triangle */}
          <line x1={toSx(x1)} y1={toSy(y1)} x2={toSx(x2)} y2={toSy(y1)} stroke="#64748b" strokeWidth={1} strokeDasharray="3,2" />
          <line x1={toSx(x2)} y1={toSy(y1)} x2={toSx(x2)} y2={toSy(y2)} stroke="#64748b" strokeWidth={1} strokeDasharray="3,2" />
          {/* Points */}
          <circle cx={toSx(x1)} cy={toSy(y1)} r={5} fill="#DC2626" opacity={0.8} />
          <circle cx={toSx(x2)} cy={toSy(y2)} r={5} fill="#DC2626" opacity={0.8} />
          <text x={toSx(x1) - 8} y={toSy(y1) - 8} fontSize={10} fill="#DC2626" fontFamily="sans-serif">A</text>
          <text x={toSx(x2) + 4} y={toSy(y2) - 8} fontSize={10} fill="#DC2626" fontFamily="sans-serif">B</text>
          {/* Midpoint */}
          <circle cx={toSx(midX)} cy={toSy(midY)} r={3} fill="#f59e0b" />
          <text x={toSx(midX) + 6} y={toSy(midY) - 4} fontSize={9} fill="#f59e0b" fontFamily="sans-serif">M</text>
        </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
        {[
          { label: "שיפוע m", val: isNaN(m) ? "∞" : m.toFixed(2) },
          { label: "חיתוך b", val: isNaN(b) ? "—" : b.toFixed(2) },
          { label: "אמצע M", val: `(${midX},${midY})` },
          { label: "m אנכי", val: isNaN(perpM) ? "—" : perpM.toFixed(2) },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 10, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>m · m_אנכי = −1 תמיד. נסו שיפוע 2 — האנכי יהיה −0.5!</p>
    </section>
  );
}

// ─── Tabs + FormulaBar ───────────────────────────────────────────────────────

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-700",  border: "border-green-600",  bg: "bg-green-600/10",  glowColor: "rgba(22,163,74,0.3)"  },
  { id: "medium",   label: "בינוני", textColor: "text-orange-700", border: "border-orange-600", bg: "bg-orange-600/10", glowColor: "rgba(234,88,12,0.3)"  },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-700",    border: "border-red-700",    bg: "bg-red-700/10",    glowColor: "rgba(220,38,38,0.3)"  },
];

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"equation" | "slope" | "parallel" | null>(null);
  const tabs = [
    { id: "equation" as const, label: "📐 משוואת ישר", tex: "y = mx + b", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "slope" as const, label: "📏 שיפוע", tex: "m = \\frac{\\Delta y}{\\Delta x}", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "parallel" as const, label: "⊥ מקביל ואנכי", tex: "m_1 \\cdot m_2 = -1", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.75)", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>
      <div style={{ display: "flex", gap: 6, marginBottom: activeTab ? 14 : 0 }}>
        {tabs.map(t => { const isActive = activeTab === t.id; return (<button key={t.id} onClick={() => setActiveTab(isActive ? null : t.id)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${isActive ? t.borderColor : "rgba(60,54,42,0.1)"}`, background: isActive ? `${t.color}0D` : "rgba(60,54,42,0.03)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span><span style={{ color: isActive ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>); })}
      </div>

      {activeTab === "equation" && (<motion.div key="eq" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"y = mx + b"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}><div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הצורה המפורשת</strong><ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}><li><strong>m</strong> = שיפוע (עלייה/ריצה)</li><li><strong>b</strong> = חיתוך ציר Y (הנקודה (0,b))</li><li>חיתוך ציר X: הציבו y=0 ופתרו.</li></ol></div><div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>💡 דוגמה: y = 3x − 2 → חיתוך Y: (0,−2), חיתוך X: (⅔,0)</div></div></div></motion.div>)}

      {activeTab === "slope" && (<motion.div key="sl" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"m = \\frac{y_2 - y_1}{x_2 - x_1}"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}><div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>שיפוע משתי נקודות</strong><ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}><li>m &gt; 0 → ישר עולה. m &lt; 0 → ישר יורד.</li><li>m = 0 → ישר אופקי. m = ∞ → ישר אנכי.</li><li>שמרו על סדר עקבי: אם למעלה B−A, גם למטה B−A.</li></ol></div><div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>💡 דוגמה: A(1,2), B(4,8) → m = (8−2)/(4−1) = 6/3 = 2</div></div></div></motion.div>)}

      {activeTab === "parallel" && (<motion.div key="pa" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"m_1 = m_2 \\;\\;\\text{(parallel)}"}</DisplayMath><DisplayMath>{"m_1 \\cdot m_2 = -1 \\;\\;\\text{(perpendicular)}"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}><div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>מקביל ואנכי</strong><ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}><li><strong>מקבילים:</strong> אותו שיפוע, חיתוך Y שונה.</li><li><strong>אנכיים:</strong> מכפלת שיפועים = −1, כלומר m₂ = −1/m₁.</li><li>אם m₁ = 3, אז m₂ = −⅓ לאנכי.</li></ol></div><div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>💡 דוגמה: ℓ₁: y=2x+1, מקביל: y=2x−3, אנכי: y=−½x+4</div></div></div></motion.div>)}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LinearFunctionPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "163,79,38" : "139,38,53";

  return (
    <main style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`
        textarea, input[type="text"], input[type="password"] { outline: none !important; }
        textarea:focus, input[type="text"]:focus { outline: none !important; border-color: rgba(var(--lvl-rgb), 0.65) !important; box-shadow: 0 0 0 3px rgba(var(--lvl-rgb), 0.12) !important; }
        input[type="range"] { outline: none !important; }
        input[type="range"]:focus { outline: none !important; }
        button:focus, button:focus-visible { outline: none !important; box-shadow: 0 0 0 2px rgba(var(--lvl-rgb), 0.35) !important; }
        button:focus:not(:focus-visible) { box-shadow: none !important; }
      `}</style>

      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>פונקציה לינארית עם AI — כיתה י׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>שיפוע, חיתוך עם צירים, ישרים מקבילים ואנכיים — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link href="/3u/topic/grade10/graphs" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}>
            <span style={{ fontSize: 16 }}>←</span>חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="3u/grade10/graphs/linear" />
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(60,54,42,0.15)" }}>
          {TABS.map(tab => { const active = selectedLevel === tab.id; return (<button key={tab.id} onClick={() => setSelectedLevel(tab.id as typeof selectedLevel)} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active ? `${tab.bg} border ${tab.border} ${tab.textColor}` : "text-stone-500 hover:text-stone-800"}`} style={active ? { boxShadow: `0 0 14px ${tab.glowColor}` } : undefined}>{tab.label}</button>); })}
        </div>
        <FormulaBar />
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}><ExerciseCard ex={ex} /></motion.div>
        {selectedLevel === "basic" && <LinearGraphLab />}
        {selectedLevel === "medium" && <ParallelLab />}
        {selectedLevel === "advanced" && <SlopeLab />}
        <div style={{ marginTop: "1.5rem" }}><MarkComplete subtopicId="3u/grade10/graphs/linear" level={selectedLevel} /></div>
      </div>
    </main>
  );
}
