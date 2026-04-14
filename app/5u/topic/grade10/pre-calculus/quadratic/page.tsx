"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle2, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import LabMessage from "@/app/components/LabMessage";
import SubtopicProgress from "@/app/components/SubtopicProgress";
import katex from "katex";
import "katex/dist/katex.min.css";

function InlineMath({ children }: { children: string }) { const ref = useRef<HTMLSpanElement>(null); useEffect(() => { if (ref.current) katex.render(children, ref.current, { throwOnError: false, displayMode: false }); }, [children]); return <span ref={ref} />; }
function DisplayMath({ children }: { children: string }) { const ref = useRef<HTMLSpanElement>(null); useEffect(() => { if (ref.current) katex.render(children, ref.current, { throwOnError: false, displayMode: true }); }, [children]); return <span ref={ref} style={{ display: "block", textAlign: "center" }} />; }

type PromptStep = { phase: string; label: string; coaching: string; prompt: string; keywords: string[]; keywordHint: string; contextWords?: string[]; stationWords?: string[] };
type ExerciseDef = { id: "basic" | "medium" | "advanced"; title: string; problem: string; diagram: React.ReactNode; pitfalls: { title: string; text: string }[]; goldenPrompt: string; steps: PromptStep[] };

const STATION = {
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",   glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700",  glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",     glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderRgb: "139,38,53" },
} as const;

const TABS = [
  { id: "basic" as const,    label: "מתחיל",  textColor: "text-green-700",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium" as const,   label: "בינוני", textColor: "text-orange-700",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced" as const, label: "מתקדם",  textColor: "text-red-700",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

// ─── SVG diagrams ────────────────────────────────────────────────────────────

function BasicDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>פרבולה פתוחה כלפי מעלה — קדקוד ושורשים</p>
      <svg width="100%" viewBox="0 0 300 200" style={{ maxWidth: "100%" }}>
        <line x1={30} y1={170} x2={280} y2={170} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={150} y1={190} x2={150} y2={20} stroke="#cbd5e1" strokeWidth={1} />
        <text x={284} y={174} fill="#94a3b8" fontSize={11}>x</text>
        <text x={153} y={16} fill="#94a3b8" fontSize={11}>y</text>
        <path d="M 60,40 Q 150,180 240,40" fill="none" stroke="#16a34a" strokeWidth={2} />
        <circle cx={150} cy={160} r={4} fill="#16a34a" />
        <text x={156} y={158} fill="#16a34a" fontSize={10} fontWeight={700}>קדקוד</text>
        <circle cx={80} cy={80} r={3} fill="#f59e0b" />
        <circle cx={220} cy={80} r={3} fill="#f59e0b" />
      </svg>
    </div>
  );
}

function MediumDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>פרבולה פתוחה כלפי מטה — מקסימום</p>
      <svg width="100%" viewBox="0 0 300 200" style={{ maxWidth: "100%" }}>
        <line x1={30} y1={170} x2={280} y2={170} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={150} y1={190} x2={150} y2={20} stroke="#cbd5e1" strokeWidth={1} />
        <text x={284} y={174} fill="#94a3b8" fontSize={11}>x</text>
        <text x={153} y={16} fill="#94a3b8" fontSize={11}>y</text>
        <path d="M 50,170 Q 150,10 250,170" fill="none" stroke="#ea580c" strokeWidth={2} />
        <circle cx={150} cy={40} r={4} fill="#ea580c" />
        <text x={156} y={36} fill="#ea580c" fontSize={10} fontWeight={700}>קדקוד</text>
        <line x1={150} y1={40} x2={150} y2={170} stroke="#ea580c" strokeWidth={1} strokeDasharray="4,3" />
        <circle cx={50} cy={170} r={3} fill="#f59e0b" />
        <circle cx={250} cy={170} r={3} fill="#f59e0b" />
        <circle cx={150} cy={140} r={3} fill="#64748b" />
        <text x={156} y={136} fill="#64748b" fontSize={9}>y-חיתוך</text>
      </svg>
    </div>
  );
}

function AdvancedDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>פרבולה וישר — נקודות חיתוך</p>
      <svg width="100%" viewBox="0 0 300 200" style={{ maxWidth: "100%" }}>
        <line x1={30} y1={170} x2={280} y2={170} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={150} y1={190} x2={150} y2={20} stroke="#cbd5e1" strokeWidth={1} />
        <text x={284} y={174} fill="#94a3b8" fontSize={11}>x</text>
        <text x={153} y={16} fill="#94a3b8" fontSize={11}>y</text>
        <path d="M 50,30 Q 150,190 250,30" fill="none" stroke="#dc2626" strokeWidth={2} />
        <line x1={40} y1={120} x2={270} y2={60} stroke="#a78bfa" strokeWidth={1.5} />
        <circle cx={95} cy={105} r={4} fill="#dc2626" />
        <circle cx={225} cy={68} r={4} fill="#dc2626" />
        <text x={66} y={100} fill="#dc2626" fontSize={10} fontWeight={600}>P</text>
        <text x={230} y={62} fill="#dc2626" fontSize={10} fontWeight={600}>Q</text>
        <text x={255} y={54} fill="#a78bfa" fontSize={10}>g</text>
        <text x={255} y={28} fill="#dc2626" fontSize={10}>f</text>
      </svg>
    </div>
  );
}

// ─── Prompt helpers (identical to reference) ─────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט", accentRgb = "22,163,74" }: { text: string; label?: string; accentRgb?: string }) { const [c, setC] = useState(false); return (<button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.8)", border: `1.5px solid rgba(${accentRgb},0.4)`, color: `rgb(${accentRgb})`, fontSize: 12, fontWeight: 600 }}>{c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}</button>); }

function GoldenPromptCard({ prompt, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { prompt: string; glowRgb?: string; borderRgb?: string }) { return (<div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15)` }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ fontSize: 14 }}>&#10024;</span><span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>פרומפט ראשי</span></div><p style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p><CopyBtn text={prompt} label="העתק פרומפט מלא" accentRgb={glowRgb} /></div>); }

function TutorStepBasic({ step, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) { return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(${glowRgb},0.45)`, marginBottom: 8, boxShadow: `0 0 14px rgba(${glowRgb},0.18)` }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}><span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><div><div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>&#9997;&#65039; הפרומפט המוכן</div><div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div></div><CopyBtn text={step.prompt} label="העתק פרומפט ממוקד" accentRgb={glowRgb} /></div></div>); }

function TutorStepMedium({ step, locked = false, onPass, borderRgb = "45,90,39" }: { step: PromptStep; locked?: boolean; onPass?: () => void; borderRgb?: string }) {
  const [text, setText] = useState(""); const [result, setResult] = useState<ScoreResult | null>(null); const [copied, setCopied] = useState(false);
  const passed = !!(result && !result.blocked && result.score >= 75);
  const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי -- כתוב לפחות 20 תווים." }); return; } const res = calculatePromptScore(text, step.contextWords ?? []); setResult(res); if (!res.blocked && res.score >= 75) onPass?.(); };
  if (locked) return (<div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.6)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}><Lock size={14} color="#6B7280" /><div><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span></div></div>);
  const barCol = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(22,163,74,0.3)" : `rgba(${borderRgb},0.2)`}` }}>{passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div>
      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={e => { setText(e.target.value); setResult(null); }} placeholder="נסח כאן את השאלה שלך ל-AI..." style={{ minHeight: 80, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid rgba(${borderRgb},0.25)`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        {result && (<div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", marginBottom: 4, fontWeight: 600 }}><span>ציון</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: barCol, transition: "width 0.4s" }} /></div></div>)}
        {!result && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקת AI מדומה</button>}
        {result && result.blocked && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>&#9888;&#65039; {result.hint}</motion.div>}
        {result && !result.blocked && result.score < 75 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>&#128161; {result.hint}</motion.div>}
        {passed && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, fontWeight: 600 }}>&#9989; ציון: <strong>{result!.score}/100</strong></div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}</button></motion.div>}
        {result && !passed && <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#6B7280", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>}
      </div>
    </div>
  );
}

function TutorStepAdvanced({ step, locked = false, onPass }: { step: PromptStep; locked?: boolean; onPass?: () => void }) {
  const [text, setText] = useState(""); const [result, setResult] = useState<ScoreResult | null>(null); const [copied, setCopied] = useState(false);
  const passed = result?.score !== undefined && result.score >= 90 && !result.blocked;
  if (locked) return (<div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.6)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}><Lock size={14} color="#6B7280" /><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} -- {step.label}</span></div>);
  const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי." }); return; } const r = calculatePromptScore(text, step.contextWords ?? []); setResult(r); if (!r.blocked && r.score >= 90 && onPass) onPass(); };
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)"}`, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}` }}>{passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#dc2626", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div>
      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={text} rows={3} dir="rtl" readOnly={passed} onChange={e => { if (!passed) { setText(e.target.value); setResult(null); } }} placeholder="כתוב את הפרומפט שלך..." style={{ minHeight: 80, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        {result && <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>ציון</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99, transition: "width 0.4s" }} /></div></div>}
        {result && !passed && result.hint && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.6, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>{result.blocked ? "\u26A0\uFE0F" : "\uD83D\uDCA1"} {result.hint}</motion.div>}
        {passed && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, fontWeight: 600 }}>&#9989; ניסוח מעולה!</div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק"}</button></motion.div>}
        {!passed && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: "1px solid rgba(220,38,38,0.35)", color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקת AI מדומה</button>}
      </div>
    </div>
  );
}

// ─── Ladders ──────────────────────────────────────────────────────────────────

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [done, setDone] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlocked = done.filter(Boolean).length + 1;
  return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => (<div key={i}>{i < unlocked ? (<><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />{!done[i] ? <button onClick={() => setDone(p => { const n = [...p]; n[i] = true; return n; })} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>&#10003; סיימתי סעיף זה</button> : <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>&#9989; הושלם</div>}</>) : (<div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}><Lock size={14} color="#6B7280" style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }} /><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} /></div>)}</div>))}</div>);
}

function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [passed, setPassed] = useState<boolean[]>(Array(steps.length).fill(false));
  return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => <TutorStepMedium key={i} step={s} locked={i > 0 && !passed[i - 1]} onPass={() => setPassed(p => { const n = [...p]; n[i] = true; return n; })} borderRgb={borderRgb} />)}</div>);
}

function LadderAdvanced({ steps }: { steps: PromptStep[] }) {
  const [mp, setMp] = useState(false);
  const [passed, setPassed] = useState<boolean[]>(Array(steps.length).fill(false));
  const idx = mp ? (passed.findIndex(p => !p) === -1 ? steps.length : passed.findIndex(p => !p)) : -1;
  return (<div><MasterPromptGate onPass={() => setMp(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["פרבולה", "קדקוד", "שורשים", "ישר", "חיתוך", "פרמטרים"]} />{steps.map((s, i) => <TutorStepAdvanced key={i} step={s} locked={!mp || i > idx} onPass={() => setPassed(p => { const n = [...p]; n[i] = true; return n; })} />)}</div>);
}

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id]; const [cp, setCp] = useState(false);
  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", boxShadow: s.glowShadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}><span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span><h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2></div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.15)", marginBottom: "2rem" }} />
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>{ex.diagram}</div>
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.6)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>&#128221; השאלה</div><button onClick={() => { navigator.clipboard.writeText(ex.problem); setCp(true); setTimeout(() => setCp(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: cp ? "rgba(22,163,74,0.15)" : "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)", color: cp ? "#16a34a" : "#6B7280", fontSize: 11, fontWeight: 600 }}>{cp ? <Check size={11} /> : <Copy size={11} />}{cp ? "הועתק!" : "העתק"}</button></div>
        <pre style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>
      <div style={{ marginBottom: "2rem" }}><div style={{ color: "#dc2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>&#9888;&#65039; שגיאות נפוצות</div>{ex.pitfalls.map((p, i) => <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.25)", background: "rgba(254,226,226,0.25)", padding: "0.85rem 1rem", marginBottom: 8 }}><div style={{ color: "#b91c1c", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>{p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}</div>)}</div>
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.7)", padding: "1.25rem" }}><div style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>&#129504; מדריך הפרומפטים</div>{ex.id === "basic" && <LadderBase steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}{ex.id === "medium" && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}</div>
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
    </section>
  );
}

// ─── Formula Bar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [act, setAct] = useState<"gen" | "vertex" | "roots" | "disc" | null>(null);
  const tabs = [
    { id: "gen" as const, label: "צורה כללית", tex: "y=ax^2+bx+c", color: "#16A34A", bc: "rgba(22,163,74,0.35)" },
    { id: "vertex" as const, label: "קדקוד", tex: "x_v=\\frac{-b}{2a}", color: "#EA580C", bc: "rgba(234,88,12,0.35)" },
    { id: "roots" as const, label: "שורשים", tex: "x=\\frac{-b\\pm\\sqrt{\\Delta}}{2a}", color: "#DC2626", bc: "rgba(220,38,38,0.35)" },
    { id: "disc" as const, label: "דיסקרימיננטה", tex: "\\Delta=b^2-4ac", color: "#7c3aed", bc: "rgba(124,58,237,0.35)" },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>
      <div style={{ display: "flex", gap: 6, marginBottom: act ? 14 : 0 }}>
        {tabs.map(t => { const a = act === t.id; return <button key={t.id} onClick={() => setAct(a ? null : t.id)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${a ? t.bc : "rgba(60,54,42,0.15)"}`, background: a ? `${t.color}15` : "rgba(255,255,255,0.5)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11, fontWeight: 700, color: a ? t.color : "#6B7280" }}>{t.label}</span><span style={{ color: a ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>; })}
      </div>
      {act === "gen" && <motion.div key="gen" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"y = ax^2 + bx + c"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> a קובע כיוון (a&gt;0 למעלה, a&lt;0 למטה). c = חיתוך ציר y. ככל ש-|a| גדול, הפרבולה צרה יותר.</div></div></motion.div>}
      {act === "vertex" && <motion.div key="vertex" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"x_v = \\frac{-b}{2a},\\quad y_v = f(x_v)"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> הקדקוד הוא נקודת מינימום (a&gt;0) או מקסימום (a&lt;0). ציר הסימטריה: x = x_v.</div></div></motion.div>}
      {act === "roots" && <motion.div key="roots" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> נוסחת השורשים. \u0394&gt;0 → שני שורשים, \u0394=0 → שורש כפול, \u0394&lt;0 → אין שורשים ממשיים.</div></div></motion.div>}
      {act === "disc" && <motion.div key="disc" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"\\Delta = b^2 - 4ac"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> הדיסקרימיננטה קובעת כמה פעמים הפרבולה חותכת את ציר x.</div></div></motion.div>}
    </div>
  );
}

// ─── Exercise data ────────────────────────────────────────────────────────────

const PF = "\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.";
const CW_B: string[] = ["פרבולה", "קדקוד", "שורשים", "הצבה", "ציר", "חיתוך"];
const CW_M: string[] = ["מקסימום", "כלפי מטה", "סקיצה", "קדקוד", "שורשים", "דיסקרימיננטה"];
const CW_A: string[] = ["פרמטרים", "שורשים", "אי שוויון", "חיתוך ישר", "פרבולה", "נקודות"];

const exercises: ExerciseDef[] = [
  {
    id: "basic", title: "פרבולה פתוחה כלפי מעלה",
    problem: "נתונה הפונקציה f(x) = x\u00B2 \u2212 6x + 5.\n\n\u05D0. מצאו את נקודות החיתוך עם ציר x.\n\u05D1. מצאו את הקדקוד.\n\u05D2. מהי נקודת החיתוך עם ציר y?",
    diagram: <BasicDiagram />,
    pitfalls: [
      { title: "חיתוך ציר x: הציבו y = 0", text: "x\u00B2 \u2212 6x + 5 = 0 \u2192 (x\u22121)(x\u22125) = 0 \u2192 x = 1 או x = 5." },
      { title: "קדקוד: x = \u2212b/2a = 6/2 = 3", text: "אל תשכחו להציב חזרה: f(3) = 9 \u2212 18 + 5 = \u22124." },
      { title: "חיתוך ציר y: הציבו x = 0", text: "f(0) = 5. הנקודה (0, 5). זה תמיד c!" },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 5 יחידות.\nנתונה f(x) = x\u00B2 \u2212 6x + 5.\nצריך: שורשים, קדקוד, חיתוך ציר y." + PF,
    steps: [
      { phase: "\u05D0", label: "שורשים", coaching: "פירוק או נוסחה", prompt: "f(x) = x\u00B2 \u2212 6x + 5. הנחה אותי למצוא חיתוך עם ציר x." + PF, keywords: ["שורשים", "ציר x"], keywordHint: "ציין שורשים", contextWords: CW_B },
      { phase: "\u05D1", label: "קדקוד", coaching: "\u2212b/2a", prompt: "f(x) = x\u00B2 \u2212 6x + 5. הנחה אותי למצוא את הקדקוד." + PF, keywords: ["קדקוד"], keywordHint: "ציין קדקוד", contextWords: CW_B },
      { phase: "\u05D2", label: "חיתוך ציר y", coaching: "הציב x=0", prompt: "f(x) = x\u00B2 \u2212 6x + 5. הנחה אותי למצוא חיתוך ציר y." + PF, keywords: ["ציר y", "הצבה"], keywordHint: "ציין ציר y", contextWords: CW_B },
    ],
  },
  {
    id: "medium", title: "פרבולה פתוחה כלפי מטה",
    problem: "נתונה f(x) = \u22122x\u00B2 + 8x \u2212 6.\n\n\u05D0. האם הפרבולה פתוחה למעלה או למטה? מהו סוג הקיצון?\n\u05D1. מצאו את הקדקוד ואת ציר הסימטריה.\n\u05D2. מצאו את נקודות החיתוך עם ציר x.\n\u05D3. שרטטו סקיצה מלאה של הפרבולה.",
    diagram: <MediumDiagram />,
    pitfalls: [
      { title: "a = \u22122 < 0 \u2192 פתוחה כלפי מטה", text: "הקדקוד הוא נקודת מקסימום, לא מינימום." },
      { title: "x = \u2212b/2a = \u22128/(2\u00B7(\u22122)) = 2", text: "שימו לב לסימנים: b = 8, a = \u22122, אז \u2212b/2a = \u22128/(\u22124) = 2." },
      { title: "בסקיצה: ציינו קדקוד, שורשים, חיתוך ציר y", text: "ודאו שהפרבולה עוברת דרך כל הנקודות ופונה כלפי מטה." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 5 יחידות.\nf(x) = \u22122x\u00B2 + 8x \u2212 6.\nצריך: כיוון, קדקוד, שורשים, סקיצה." + PF,
    steps: [
      { phase: "\u05D0", label: "כיוון וקיצון", coaching: "בדקו סימן a", prompt: "f(x) = \u22122x\u00B2 + 8x \u2212 6. הנחה אותי לקבוע כיוון פתיחה וסוג קיצון." + PF, keywords: ["כיוון", "מקסימום"], keywordHint: "ציין כיוון", contextWords: CW_M },
      { phase: "\u05D1", label: "קדקוד", coaching: "\u2212b/2a ואז הצבה", prompt: "f(x) = \u22122x\u00B2 + 8x \u2212 6. הנחה אותי למצוא קדקוד וציר סימטריה." + PF, keywords: ["קדקוד", "ציר סימטריה"], keywordHint: "ציין קדקוד", contextWords: CW_M },
      { phase: "\u05D2", label: "שורשים", coaching: "נוסחה ריבועית", prompt: "f(x) = \u22122x\u00B2 + 8x \u2212 6. הנחה אותי למצוא חיתוך ציר x." + PF, keywords: ["שורשים", "דיסקרימיננטה"], keywordHint: "ציין שורשים", contextWords: CW_M },
      { phase: "\u05D3", label: "סקיצה", coaching: "סמנו את כל הנקודות", prompt: "אחרי שמצאתי קדקוד ושורשים של f(x) = \u22122x\u00B2 + 8x \u2212 6, הנחה אותי לשרטט סקיצה." + PF, keywords: ["סקיצה", "שרטוט"], keywordHint: "ציין סקיצה", contextWords: CW_M },
    ],
  },
  {
    id: "advanced", title: "מציאת פרמטרים וחיתוך עם ישר",
    problem: "פרבולה f(x) = ax\u00B2 + bx + c עוברת דרך (0, \u22123), (\u22121, 0) ו-(3, 0).\n\n\u05D0. מצאו את a, b, c.\n\u05D1. מצאו את הקדקוד.\n\u05D2. עבור אילו ערכי x מתקיים f(x) \u2265 0?\n\u05D3. הישר g(x) = 2x \u2212 3 חותך את f. מצאו את נקודות החיתוך.",
    diagram: <AdvancedDiagram />,
    pitfalls: [
      { title: "(0, \u22123) \u2192 c = \u22123", text: "(\u22121,0) ו-(3,0) שורשים \u2192 f(x) = a(x+1)(x\u22123). הציבו (0,\u22123): a\u00B7(1)\u00B7(\u22123) = \u22123 \u2192 a = 1." },
      { title: "f(x) \u2265 0 מחוץ לשורשים (a > 0)", text: "x \u2264 \u22121 או x \u2265 3 (כי הפרבולה פתוחה למעלה והשורשים \u22121 ו-3)." },
      { title: "חיתוך: ax\u00B2 + bx + c = 2x \u2212 3", text: "העבירו הכל לצד אחד: x\u00B2 \u2212 4x = 0 \u2192 x(x\u22124) = 0." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 5 יחידות.\nפרבולה f(x) = ax\u00B2 + bx + c דרך (0,\u22123), (\u22121,0), (3,0).\nצריך: פרמטרים, קדקוד, f(x)\u22650, חיתוך עם g(x) = 2x\u22123." + PF,
    steps: [
      { phase: "\u05D0", label: "מציאת a, b, c", coaching: "השתמשו בשורשים", prompt: "f(x) = ax\u00B2+bx+c דרך (0,\u22123), (\u22121,0), (3,0). הנחה אותי למצוא a, b, c." + PF, keywords: ["פרמטרים", "הצבה"], keywordHint: "ציין מציאת פרמטרים", contextWords: CW_A },
      { phase: "\u05D1", label: "קדקוד", coaching: "\u2212b/2a", prompt: "אחרי שמצאתי f(x) = x\u00B2 \u2212 2x \u2212 3, הנחה אותי למצוא קדקוד." + PF, keywords: ["קדקוד"], keywordHint: "ציין קדקוד", contextWords: CW_A },
      { phase: "\u05D2", label: "f(x) \u2265 0", coaching: "סימן הפרבולה", prompt: "f(x) = x\u00B2 \u2212 2x \u2212 3, שורשים \u22121 ו-3. הנחה אותי למצוא היכן f(x) \u2265 0." + PF, keywords: ["אי שוויון", "סימן"], keywordHint: "ציין אי שוויון", contextWords: CW_A },
      { phase: "\u05D3", label: "חיתוך עם ישר", coaching: "השוו f(x) = g(x)", prompt: "f(x) = x\u00B2 \u2212 2x \u2212 3 ו-g(x) = 2x \u2212 3. הנחה אותי למצוא חיתוך." + PF, keywords: ["חיתוך", "ישר"], keywordHint: "ציין חיתוך", contextWords: CW_A },
    ],
  },
];

// ─── Lab ──────────────────────────────────────────────────────────────────────

function ParabolaLab() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(-4);
  const [c, setC] = useState(3);

  const xv = a !== 0 ? -b / (2 * a) : 0;
  const yv = a * xv * xv + b * xv + c;
  const disc = b * b - 4 * a * c;
  const roots: string = disc < 0 ? "אין שורשים ממשיים" : disc === 0 ? `x = ${(-b / (2 * a)).toFixed(2)}` : `x = ${((-b - Math.sqrt(disc)) / (2 * a)).toFixed(2)}, ${((-b + Math.sqrt(disc)) / (2 * a)).toFixed(2)}`;

  const toX = (x: number) => 150 + x * 18;
  const toY = (y: number) => 150 - y * 12;

  const points: string[] = [];
  for (let x = -6; x <= 10; x += 0.3) {
    const y = a * x * x + b * x + c;
    if (y > -10 && y < 15) points.push(`${toX(x).toFixed(1)},${toY(y).toFixed(1)}`);
  }

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>&#128300; מעבדה אינטראקטיבית</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[{ label: "a", val: a, set: setA, min: -3, max: 3, step: 0.5 }, { label: "b", val: b, set: setB, min: -8, max: 8, step: 0.5 }, { label: "c", val: c, set: setC, min: -8, max: 8, step: 0.5 }].map(s => (
          <div key={s.label}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#2D3436", fontWeight: 600, marginBottom: 4 }}><span>{s.label}</span><span>{s.val}</span></div><input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e => { const v = Number(e.target.value); if (s.label === "a" && v === 0) return; s.set(v); }} style={{ width: "100%" }} /></div>
        ))}
      </div>
      <svg width="100%" viewBox="0 0 300 300" style={{ maxWidth: 400, margin: "0 auto", display: "block" }}>
        <rect x={0} y={0} width={300} height={300} fill="#fafaf5" rx={12} />
        <line x1={150} y1={10} x2={150} y2={290} stroke="#94a3b8" strokeWidth={1} />
        <line x1={10} y1={150} x2={290} y2={150} stroke="#94a3b8" strokeWidth={1} />
        {points.length > 1 && <polyline points={points.join(" ")} fill="none" stroke="#dc2626" strokeWidth={2} />}
        {a !== 0 && <circle cx={toX(xv)} cy={toY(yv)} r={4} fill="#ea580c" />}
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 20 }}>
        <div style={{ borderRadius: 12, border: "1px solid rgba(234,88,12,0.2)", background: "rgba(234,88,12,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>קדקוד</div><div style={{ fontSize: 13, fontWeight: 700, color: "#ea580c" }}>({xv.toFixed(1)}, {yv.toFixed(1)})</div></div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(124,58,237,0.2)", background: "rgba(124,58,237,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>\u0394</div><div style={{ fontSize: 13, fontWeight: 700, color: "#7c3aed" }}>{disc.toFixed(1)}</div></div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(22,163,74,0.2)", background: "rgba(22,163,74,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>חיתוך y</div><div style={{ fontSize: 13, fontWeight: 700, color: "#16a34a" }}>{c}</div></div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>שורשים</div><div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626" }}>{roots}</div></div>
      </div>
      <p style={{ textAlign: "center", color: "#6B7280", fontSize: 12, marginTop: 14 }}>שנו את a, b, c וראו כיצד הפרבולה משתנה</p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuadraticPage() {
  const [lvl, setLvl] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === lvl)!;
  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      <style>{`:root { --lvl-rgb: ${STATION[lvl].glowRgb}; }`}</style>
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>פונקציה ריבועית</h1>
          <Link href="/5u/topic/grade10/pre-calculus" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none" }}>&#8592; חזרה</Link>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 4rem" }}>
        <SubtopicProgress subtopicId="5u/grade10/pre-calculus/quadratic" />
        <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
          {TABS.map(t => { const a = lvl === t.id; return <button key={t.id} onClick={() => setLvl(t.id)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${a ? `${t.bg} ${t.textColor} ${t.border} border-2` : "bg-white/60 text-gray-500 border border-transparent"}`} style={a ? { boxShadow: `0 0 12px ${t.glowColor}` } : {}}>{t.label}</button>; })}
        </div>
        <FormulaBar />
        <div style={{ marginBottom: "2rem" }}><ExerciseCard ex={ex} /></div>
        <ParabolaLab />
        <div style={{ marginTop: "2rem" }}><MarkComplete subtopicId="5u/grade10/pre-calculus/quadratic" level={lvl} /></div>
      </motion.div>
    </main>
  );
}
