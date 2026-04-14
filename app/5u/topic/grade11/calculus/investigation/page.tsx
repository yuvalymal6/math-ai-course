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
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>עקומה עם נקודות קיצון</p>
      <svg width="100%" viewBox="0 0 300 180" style={{ maxWidth: "100%" }}>
        <line x1={30} y1={140} x2={280} y2={140} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={50} y1={170} x2={50} y2={15} stroke="#cbd5e1" strokeWidth={1} />
        <text x={284} y={144} fill="#94a3b8" fontSize={10}>x</text>
        <text x={44} y={12} fill="#94a3b8" fontSize={10}>y</text>
        <path d="M 60,120 C 100,20 140,20 160,80 C 180,140 220,140 260,50" fill="none" stroke="#16a34a" strokeWidth={2} />
        <circle cx={130} cy={30} r={4} fill="#f59e0b" />
        <text x={116} y={24} fill="#f59e0b" fontSize={9} fontWeight={700}>מקס?</text>
        <circle cx={195} cy={135} r={4} fill="#a78bfa" />
        <text x={200} y={148} fill="#a78bfa" fontSize={9} fontWeight={700}>מינ?</text>
      </svg>
    </div>
  );
}

function MediumDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>עקומה עם נקודת פיתול</p>
      <svg width="100%" viewBox="0 0 300 180" style={{ maxWidth: "100%" }}>
        <line x1={30} y1={90} x2={280} y2={90} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={150} y1={170} x2={150} y2={10} stroke="#cbd5e1" strokeWidth={1} />
        <text x={284} y={94} fill="#94a3b8" fontSize={10}>x</text>
        <text x={153} y={12} fill="#94a3b8" fontSize={10}>y</text>
        <path d="M 50,150 C 90,150 120,30 150,90 C 180,150 210,30 250,30" fill="none" stroke="#ea580c" strokeWidth={2} />
        <circle cx={150} cy={90} r={4} fill="#a78bfa" />
        <text x={156} y={82} fill="#a78bfa" fontSize={9} fontWeight={700}>פיתול</text>
        <circle cx={100} cy={120} r={3} fill="#f59e0b" />
        <circle cx={200} cy={60} r={3} fill="#f59e0b" />
      </svg>
    </div>
  );
}

function AdvancedDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>חקירה מלאה — סקיצה</p>
      <svg width="100%" viewBox="0 0 300 200" style={{ maxWidth: "100%" }}>
        <line x1={30} y1={130} x2={280} y2={130} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={80} y1={190} x2={80} y2={10} stroke="#cbd5e1" strokeWidth={1} />
        <text x={284} y={134} fill="#94a3b8" fontSize={10}>x</text>
        <text x={74} y={8} fill="#94a3b8" fontSize={10}>y</text>
        {/* Curve with two extrema and inflection */}
        <path d="M 40,160 C 70,160 90,30 120,50 C 150,70 160,170 200,110 C 240,50 260,20 280,30" fill="none" stroke="#dc2626" strokeWidth={2} />
        {/* Extrema dots */}
        <circle cx={108} cy={40} r={3.5} fill="#f59e0b" />
        <circle cx={180} cy={145} r={3.5} fill="#f59e0b" />
        {/* Inflection */}
        <circle cx={145} cy={82} r={3.5} fill="#a78bfa" />
        {/* Dashed tangent at inflection */}
        <line x1={110} y1={100} x2={180} y2={64} stroke="#a78bfa" strokeWidth={1} strokeDasharray="4,3" />
      </svg>
    </div>
  );
}

// ─── Prompt helpers ──────────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט", accentRgb = "22,163,74" }: { text: string; label?: string; accentRgb?: string }) { const [c, setC] = useState(false); return (<button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.8)", border: `1.5px solid rgba(${accentRgb},0.4)`, color: `rgb(${accentRgb})`, fontSize: 12, fontWeight: 600 }}>{c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}</button>); }
function GoldenPromptCard({ prompt, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { prompt: string; glowRgb?: string; borderRgb?: string }) { return (<div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15)` }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ fontSize: 14 }}>&#10024;</span><span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>פרומפט ראשי</span></div><p style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p><CopyBtn text={prompt} label="העתק פרומפט מלא" accentRgb={glowRgb} /></div>); }
function TutorStepBasic({ step, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) { return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(${glowRgb},0.45)`, marginBottom: 8, boxShadow: `0 0 14px rgba(${glowRgb},0.18)` }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}><span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><div><div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>&#9997;&#65039; הפרומפט המוכן</div><div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div></div><CopyBtn text={step.prompt} label="העתק פרומפט ממוקד" accentRgb={glowRgb} /></div></div>); }

function TutorStepMedium({ step, locked = false, onPass, borderRgb = "45,90,39" }: { step: PromptStep; locked?: boolean; onPass?: () => void; borderRgb?: string }) {
  const [text, setText] = useState(""); const [result, setResult] = useState<ScoreResult | null>(null); const [copied, setCopied] = useState(false);
  const passed = !!(result && !result.blocked && result.score >= 75);
  const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי." }); return; } const res = calculatePromptScore(text, step.contextWords ?? []); setResult(res); if (!res.blocked && res.score >= 75) onPass?.(); };
  if (locked) return (<div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.6)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}><Lock size={14} color="#6B7280" /><div><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span></div></div>);
  const bc = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";
  return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)" }}>{passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={e => { setText(e.target.value); setResult(null); }} placeholder="נסח כאן..." style={{ minHeight: 80, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid rgba(${borderRgb},0.25)`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />{result && <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>ציון</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: bc, transition: "width 0.4s" }} /></div></div>}{!result && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקה</button>}{result && result.blocked && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12 }}>&#9888;&#65039; {result.hint}</motion.div>}{result && !result.blocked && result.score < 75 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12 }}>&#128161; {result.hint}</motion.div>}{passed && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, fontWeight: 600 }}>&#9989; ציון: <strong>{result!.score}/100</strong></div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק"}</button></motion.div>}{result && !passed && <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#6B7280", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>}</div></div>);
}

function TutorStepAdvanced({ step, locked = false, onPass }: { step: PromptStep; locked?: boolean; onPass?: () => void }) {
  const [text, setText] = useState(""); const [result, setResult] = useState<ScoreResult | null>(null); const [copied, setCopied] = useState(false);
  const passed = result?.score !== undefined && result.score >= 90 && !result.blocked;
  if (locked) return (<div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.6)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}><Lock size={14} color="#6B7280" /><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} -- {step.label}</span></div>);
  const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "קצר מדי." }); return; } const r = calculatePromptScore(text, step.contextWords ?? []); setResult(r); if (!r.blocked && r.score >= 90 && onPass) onPass(); };
  return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)"}`, marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)" }}>{passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#dc2626", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><textarea value={text} rows={3} dir="rtl" readOnly={passed} onChange={e => { if (!passed) { setText(e.target.value); setResult(null); } }} placeholder="כתוב את הפרומפט..." style={{ minHeight: 80, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />{result && <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>ציון</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99 }} /></div></div>}{result && !passed && result.hint && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, padding: 12, fontSize: 12, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>{result.blocked ? "\u26A0\uFE0F" : "\uD83D\uDCA1"} {result.hint}</motion.div>}{passed && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, fontWeight: 600 }}>&#9989; מעולה!</div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק"}</button></motion.div>}{!passed && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: "1px solid rgba(220,38,38,0.35)", color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקה</button>}</div></div>);
}

// ─── Ladders ──────────────────────────────────────────────────────────────────

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [done, setDone] = useState<boolean[]>(Array(steps.length).fill(false));
  const u = done.filter(Boolean).length + 1;
  return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => (<div key={i}>{i < u ? (<><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />{!done[i] ? <button onClick={() => setDone(p => { const n = [...p]; n[i] = true; return n; })} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>&#10003; סיימתי</button> : <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>&#9989; הושלם</div>}</>) : (<div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}><Lock size={14} color="#6B7280" style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }} /><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} /></div>)}</div>))}</div>);
}
function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [p, setP] = useState<boolean[]>(Array(steps.length).fill(false));
  return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => <TutorStepMedium key={i} step={s} locked={i > 0 && !p[i - 1]} onPass={() => setP(v => { const n = [...v]; n[i] = true; return n; })} borderRgb={borderRgb} />)}</div>);
}
function LadderAdvanced({ steps }: { steps: PromptStep[] }) {
  const [mp, setMp] = useState(false); const [p, setP] = useState<boolean[]>(Array(steps.length).fill(false));
  const idx = mp ? (p.findIndex(v => !v) === -1 ? steps.length : p.findIndex(v => !v)) : -1;
  return (<div><MasterPromptGate onPass={() => setMp(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["נגזרת", "קיצון", "פיתול", "מונוטוניות", "סקיצה", "חקירה"]} />{steps.map((s, i) => <TutorStepAdvanced key={i} step={s} locked={!mp || i > idx} onPass={() => setP(v => { const n = [...v]; n[i] = true; return n; })} />)}</div>);
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
  const [act, setAct] = useState<"deriv" | "extrema" | "inflection" | "sketch" | null>(null);
  const tabs = [
    { id: "deriv" as const, label: "נגזרת", tex: "f'(x)=0", color: "#16A34A", bc: "rgba(22,163,74,0.35)" },
    { id: "extrema" as const, label: "קיצוניים", tex: "f''(x_0)\\gtrless 0", color: "#EA580C", bc: "rgba(234,88,12,0.35)" },
    { id: "inflection" as const, label: "פיתול", tex: "f''(x)=0", color: "#DC2626", bc: "rgba(220,38,38,0.35)" },
    { id: "sketch" as const, label: "סקיצה", tex: "\\text{sketch}", color: "#7c3aed", bc: "rgba(124,58,237,0.35)" },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>
      <div style={{ display: "flex", gap: 6, marginBottom: act ? 14 : 0 }}>
        {tabs.map(t => { const a = act === t.id; return <button key={t.id} onClick={() => setAct(a ? null : t.id)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${a ? t.bc : "rgba(60,54,42,0.15)"}`, background: a ? `${t.color}15` : "rgba(255,255,255,0.5)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11, fontWeight: 700, color: a ? t.color : "#6B7280" }}>{t.label}</span><span style={{ color: a ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>; })}
      </div>
      {act === "deriv" && <motion.div key="deriv" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"f'(x) = 0 \\Rightarrow \\text{candidates for extrema}"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> נקודות שבהן f&apos;(x) = 0 הן מועמדות לקיצוניים. בנקודות אלו המשיק אופקי. עלייה: f&apos;(x) &gt; 0. ירידה: f&apos;(x) &lt; 0.</div></div></motion.div>}
      {act === "extrema" && <motion.div key="extrema" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"f''(x_0) > 0 \\Rightarrow \\min,\\quad f''(x_0) < 0 \\Rightarrow \\max"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> סיווג קיצוניים: נגזרת שנייה חיובית = מינימום מקומי, שלילית = מקסימום מקומי. אם f&apos;&apos;(x\u2080) = 0, צריך לבדוק בטבלת סימנים.</div></div></motion.div>}
      {act === "inflection" && <motion.div key="inflection" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"f''(x) = 0 \\;\\text{and sign change} \\Rightarrow \\text{inflection}"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> נקודת פיתול = נקודה שבה הקעירות משתנה. f&apos;&apos;(x) = 0 לא מספיק — צריך גם החלפת סימן ב-f&apos;&apos;. קמורה: f&apos;&apos; &gt; 0, קעורה: f&apos;&apos; &lt; 0.</div></div></motion.div>}
      {act === "sketch" && <motion.div key="sketch" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: 16 }}><div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>שלבי סקיצה:</strong><ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}><li>תחום הגדרה</li><li>חיתוך עם הצירים (x=0, y=0)</li><li>f&apos;(x) = 0 → נקודות חשודות</li><li>טבלת סימנים של f&apos; → עלייה/ירידה</li><li>f&apos;&apos;(x) = 0 → נקודות פיתול</li><li>התנהגות ב-±∞</li><li>שרטוט</li></ol></div></div></motion.div>}
    </div>
  );
}

// ─── Exercise data ────────────────────────────────────────────────────────────

const PF = "\n\u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.";
const CW_B: string[] = ["נגזרת", "קיצון", "מונוטוניות", "עלייה", "ירידה", "f'(x)"];
const CW_M: string[] = ["נגזרת שנייה", "פיתול", "קעירות", "קמירות", "סימנים", "סיווג"];
const CW_A: string[] = ["חקירה מלאה", "תחום", "אסימפטוטה", "סקיצה", "נגזרת", "התנהגות"];

const exercises: ExerciseDef[] = [
  {
    id: "basic", title: "מונוטוניות ונקודות קיצון",
    problem: "\u05E0\u05EA\u05D5\u05E0\u05D4 f(x) = x\u00B3 \u2212 3x\u00B2 + 4.\n\n\u05D0. \u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA f'(x).\n\u05D1. \u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA \u05D4\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05E9\u05D1\u05D4\u05DF f'(x) = 0.\n\u05D2. \u05E7\u05D1\u05E2\u05D5 \u05EA\u05D7\u05D5\u05DE\u05D9 \u05E2\u05DC\u05D9\u05D9\u05D4 \u05D5\u05D9\u05E8\u05D9\u05D3\u05D4, \u05D5\u05E1\u05D5\u05D2 \u05DB\u05DC \u05E0\u05E7\u05D5\u05D3\u05EA \u05E7\u05D9\u05E6\u05D5\u05DF.",
    diagram: <BasicDiagram />,
    pitfalls: [
      { title: "f'(x) = 3x\u00B2 \u2212 6x = 3x(x \u2212 2)", text: "\u05D0\u05DC \u05EA\u05E9\u05DB\u05D7\u05D5 \u05DC\u05D4\u05D5\u05E6\u05D9\u05D0 \u05D2\u05D5\u05E8\u05DD \u05DE\u05E9\u05D5\u05EA\u05E3 \u05DC\u05E4\u05E0\u05D9 \u05E9\u05DE\u05E9\u05D5\u05D5\u05D9\u05DD \u05DC\u05D0\u05E4\u05E1." },
      { title: "f'(x) = 0 \u05D1-x = 0 \u05D5-x = 2", text: "\u05D0\u05DC\u05D5 \u05DE\u05D5\u05E2\u05DE\u05D3\u05D9\u05DD, \u05DC\u05D0 \u05D1\u05D4\u05DB\u05E8\u05D7 \u05E7\u05D9\u05E6\u05D5\u05E0\u05D9\u05DD \u2014 \u05E6\u05E8\u05D9\u05DA \u05DC\u05D1\u05D3\u05D5\u05E7 \u05E1\u05D9\u05DE\u05E0\u05D9\u05DD!" },
      { title: "\u05E1\u05D9\u05D5\u05D5\u05D2: \u05D1\u05D3\u05E7\u05D5 \u05E1\u05D9\u05DE\u05DF f'(x) \u05DE\u05E9\u05DE\u05D0\u05DC \u05D5\u05DE\u05D9\u05DE\u05D9\u05DF", text: "x=0: f'(\u22121)>0, f'(1)<0 \u2192 \u05DE\u05E7\u05E1. x=2: f'(1)<0, f'(3)>0 \u2192 \u05DE\u05D9\u05E0." },
    ],
    goldenPrompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D0 5 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\nf(x) = x\u00B3 \u2212 3x\u00B2 + 4.\n\u05E6\u05E8\u05D9\u05DA: \u05E0\u05D2\u05D6\u05E8\u05EA, \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05E7\u05E8\u05D9\u05D8\u05D9\u05D5\u05EA, \u05DE\u05D5\u05E0\u05D5\u05D8\u05D5\u05E0\u05D9\u05D5\u05EA, \u05E1\u05D9\u05D5\u05D5\u05D2." + PF,
    steps: [
      { phase: "\u05D0", label: "\u05E0\u05D2\u05D6\u05E8\u05EA", coaching: "\u05D2\u05D6\u05E8\u05D5 \u05D0\u05D9\u05D1\u05E8 \u05D0\u05D9\u05D1\u05E8", prompt: "f(x) = x\u00B3 \u2212 3x\u00B2 + 4. \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 f'(x)." + PF, keywords: ["\u05E0\u05D2\u05D6\u05E8\u05EA"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E0\u05D2\u05D6\u05E8\u05EA", contextWords: CW_B },
      { phase: "\u05D1", label: "f'(x) = 0", coaching: "\u05E4\u05EA\u05E8\u05D5 \u05D0\u05EA \u05D4\u05E0\u05D2\u05D6\u05E8\u05EA", prompt: "f'(x) = 3x\u00B2 \u2212 6x. \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05E4\u05EA\u05D5\u05E8 f'(x)=0." + PF, keywords: ["\u05E9\u05D5\u05D5\u05D9\u05D5\u05DF", "\u05D0\u05E4\u05E1"], keywordHint: "\u05E6\u05D9\u05D9\u05DF f'=0", contextWords: CW_B },
      { phase: "\u05D2", label: "\u05E1\u05D9\u05D5\u05D5\u05D2 \u05E7\u05D9\u05E6\u05D5\u05E0\u05D9\u05DD", coaching: "\u05D8\u05D1\u05DC\u05EA \u05E1\u05D9\u05DE\u05E0\u05D9\u05DD", prompt: "f'(x) = 3x(x\u22122), \u05E9\u05D5\u05E8\u05E9\u05D9\u05DD x=0, x=2. \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05E1\u05D5\u05D5\u05D2 \u05E7\u05D9\u05E6\u05D5\u05E0\u05D9\u05DD \u05D1\u05D8\u05D1\u05DC\u05EA \u05E1\u05D9\u05DE\u05E0\u05D9\u05DD." + PF, keywords: ["\u05E1\u05D9\u05DE\u05E0\u05D9\u05DD", "\u05E7\u05D9\u05E6\u05D5\u05DF"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E1\u05D9\u05DE\u05E0\u05D9\u05DD", contextWords: CW_B },
    ],
  },
  {
    id: "medium", title: "\u05E0\u05D2\u05D6\u05E8\u05EA \u05E9\u05E0\u05D9\u05D9\u05D4 \u05D5\u05E4\u05D9\u05EA\u05D5\u05DC",
    problem: "\u05E0\u05EA\u05D5\u05E0\u05D4 f(x) = x\u2074 \u2212 4x\u00B3 + 6x\u00B2.\n\n\u05D0. \u05DE\u05E6\u05D0\u05D5 f'(x) \u05D5-f''(x).\n\u05D1. \u05DE\u05E6\u05D0\u05D5 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05E7\u05D9\u05E6\u05D5\u05DF \u05D5\u05E1\u05D5\u05D5\u05D2\u05D5 \u05D0\u05D5\u05EA\u05DF \u05D1\u05E2\u05D6\u05E8\u05EA f''.\n\u05D2. \u05DE\u05E6\u05D0\u05D5 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05E4\u05D9\u05EA\u05D5\u05DC.\n\u05D3. \u05E7\u05D1\u05E2\u05D5 \u05EA\u05D7\u05D5\u05DE\u05D9 \u05E7\u05DE\u05D9\u05E8\u05D5\u05EA \u05D5\u05E7\u05E2\u05D9\u05E8\u05D5\u05EA.",
    diagram: <MediumDiagram />,
    pitfalls: [
      { title: "f'(x) = 4x\u00B3 \u2212 12x\u00B2 + 12x = 4x(x\u00B2 \u2212 3x + 3)", text: "\u05D4\u05D3\u05D9\u05E1\u05E7\u05E8\u05D9\u05DE\u05D9\u05E0\u05E0\u05D8\u05D4 \u05E9\u05DC x\u00B2\u22123x+3 \u05E9\u05DC\u05D9\u05DC\u05D9\u05EA \u2014 \u05E8\u05E7 x=0 \u05E7\u05E8\u05D9\u05D8\u05D9." },
      { title: "f''(x) = 12x\u00B2 \u2212 24x + 12 = 12(x\u22121)\u00B2", text: "f''(x) = 0 \u05D1-x=1 \u05D0\u05D1\u05DC f'' \u05DC\u05D0 \u05DE\u05D7\u05DC\u05D9\u05E4\u05D4 \u05E1\u05D9\u05DE\u05DF \u2014 \u05D0\u05D9\u05DF \u05E4\u05D9\u05EA\u05D5\u05DC!" },
      { title: "f''(x) \u2265 0 \u05EA\u05DE\u05D9\u05D3 \u2014 \u05D4\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4 \u05E7\u05DE\u05D5\u05E8\u05D4 \u05D1\u05DB\u05DC \u05EA\u05D7\u05D5\u05DD", text: "\u05D0\u05D9\u05DF \u05EA\u05D7\u05D5\u05DE\u05D9 \u05E7\u05E2\u05D9\u05E8\u05D5\u05EA \u05DB\u05DC\u05DC." },
    ],
    goldenPrompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D0 5 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\nf(x) = x\u2074 \u2212 4x\u00B3 + 6x\u00B2.\n\u05E6\u05E8\u05D9\u05DA: f', f'', \u05E7\u05D9\u05E6\u05D5\u05E0\u05D9\u05DD, \u05E4\u05D9\u05EA\u05D5\u05DC, \u05E7\u05E2\u05D9\u05E8\u05D5\u05EA." + PF,
    steps: [
      { phase: "\u05D0", label: "f' \u05D5-f''", coaching: "\u05D2\u05D6\u05E8\u05D5 \u05E4\u05E2\u05DE\u05D9\u05D9\u05DD", prompt: "f(x) = x\u2074 \u2212 4x\u00B3 + 6x\u00B2. \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 f' \u05D5-f''." + PF, keywords: ["\u05E0\u05D2\u05D6\u05E8\u05EA"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E0\u05D2\u05D6\u05E8\u05EA", contextWords: CW_M },
      { phase: "\u05D1", label: "\u05E7\u05D9\u05E6\u05D5\u05E0\u05D9\u05DD", coaching: "f'=0 + f'' \u05DC\u05E1\u05D9\u05D5\u05D5\u05D2", prompt: "f'(x) = 4x(x\u00B2\u22123x+3). \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05E7\u05D9\u05E6\u05D5\u05E0\u05D9\u05DD \u05D5\u05DC\u05E1\u05D5\u05D5\u05D2." + PF, keywords: ["\u05E7\u05D9\u05E6\u05D5\u05DF", "\u05E1\u05D9\u05D5\u05D5\u05D2"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E7\u05D9\u05E6\u05D5\u05DF", contextWords: CW_M },
      { phase: "\u05D2", label: "\u05E4\u05D9\u05EA\u05D5\u05DC", coaching: "f''=0 + \u05D4\u05D7\u05DC\u05E4\u05EA \u05E1\u05D9\u05DE\u05DF", prompt: "f''(x) = 12(x\u22121)\u00B2. \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05D1\u05D3\u05D5\u05E7 \u05D0\u05DD \u05D9\u05E9 \u05E0\u05E7\u05D5\u05D3\u05EA \u05E4\u05D9\u05EA\u05D5\u05DC." + PF, keywords: ["\u05E4\u05D9\u05EA\u05D5\u05DC", "\u05E1\u05D9\u05DE\u05DF"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E4\u05D9\u05EA\u05D5\u05DC", contextWords: CW_M },
      { phase: "\u05D3", label: "\u05E7\u05E2\u05D9\u05E8\u05D5\u05EA/\u05E7\u05DE\u05D9\u05E8\u05D5\u05EA", coaching: "\u05E1\u05D9\u05DE\u05DF f''", prompt: "f''(x) = 12(x\u22121)\u00B2 \u2265 0 \u05EA\u05DE\u05D9\u05D3. \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05E7\u05D1\u05D5\u05E2 \u05E7\u05E2\u05D9\u05E8\u05D5\u05EA/\u05E7\u05DE\u05D9\u05E8\u05D5\u05EA." + PF, keywords: ["\u05E7\u05E2\u05D9\u05E8\u05D5\u05EA", "\u05E7\u05DE\u05D9\u05E8\u05D5\u05EA"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E7\u05E2\u05D9\u05E8\u05D5\u05EA", contextWords: CW_M },
    ],
  },
  {
    id: "advanced", title: "\u05D7\u05E7\u05D9\u05E8\u05D4 \u05DE\u05DC\u05D0\u05D4",
    problem: "\u05E0\u05EA\u05D5\u05E0\u05D4 f(x) = x\u00B3 \u2212 6x\u00B2 + 9x + 1.\n\n\u05D0. \u05DE\u05E6\u05D0\u05D5 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05E7\u05D9\u05E6\u05D5\u05DF, \u05E1\u05D5\u05D5\u05D2\u05D5 \u05D0\u05D5\u05EA\u05DF \u05D5\u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA \u05E2\u05E8\u05DB\u05D9 y.\n\u05D1. \u05DE\u05E6\u05D0\u05D5 \u05E0\u05E7\u05D5\u05D3\u05EA \u05E4\u05D9\u05EA\u05D5\u05DC \u05D5\u05E7\u05D1\u05E2\u05D5 \u05EA\u05D7\u05D5\u05DE\u05D9 \u05E7\u05E2\u05D9\u05E8\u05D5\u05EA/\u05E7\u05DE\u05D9\u05E8\u05D5\u05EA.\n\u05D2. \u05DE\u05E6\u05D0\u05D5 \u05D7\u05D9\u05EA\u05D5\u05DA \u05E2\u05DD \u05E6\u05D9\u05E8 y \u05D5\u05D4\u05EA\u05E0\u05D4\u05D2\u05D5\u05EA \u05D1-\u00B1\u221E.\n\u05D3. \u05E9\u05E8\u05D8\u05D8\u05D5 \u05E1\u05E7\u05D9\u05E6\u05D4 \u05DE\u05DC\u05D0\u05D4 \u05E9\u05DC \u05D4\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4.",
    diagram: <AdvancedDiagram />,
    pitfalls: [
      { title: "f'(x) = 3x\u00B2 \u2212 12x + 9 = 3(x\u22121)(x\u22123)", text: "\u05E7\u05D9\u05E6\u05D5\u05E0\u05D9\u05DD \u05D1-x=1 (f(1)=5, \u05DE\u05E7\u05E1) \u05D5-x=3 (f(3)=1, \u05DE\u05D9\u05E0)." },
      { title: "f''(x) = 6x \u2212 12 = 0 \u2192 x = 2", text: "\u05E4\u05D9\u05EA\u05D5\u05DC \u05D1-(2, f(2)) = (2, 3). \u05D1\u05D3\u05E7\u05D5: f''(1) < 0, f''(3) > 0 \u2192 \u05D4\u05D7\u05DC\u05E4\u05EA \u05E1\u05D9\u05DE\u05DF \u2713." },
      { title: "\u05D4\u05EA\u05E0\u05D4\u05D2\u05D5\u05EA: x\u2192+\u221E \u2192 f\u2192+\u221E, x\u2192\u2212\u221E \u2192 f\u2192\u2212\u221E", text: "\u05D4\u05DE\u05E7\u05D3\u05DD \u05D4\u05DE\u05D5\u05D1\u05D9\u05DC \u05D4\u05D5\u05D0 x\u00B3 (\u05D7\u05D9\u05D5\u05D1\u05D9)." },
    ],
    goldenPrompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D0 5 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\nf(x) = x\u00B3 \u2212 6x\u00B2 + 9x + 1.\n\u05D7\u05E7\u05D9\u05E8\u05D4 \u05DE\u05DC\u05D0\u05D4: \u05E7\u05D9\u05E6\u05D5\u05E0\u05D9\u05DD, \u05E4\u05D9\u05EA\u05D5\u05DC, \u05E7\u05E2\u05D9\u05E8\u05D5\u05EA, \u05E1\u05E7\u05D9\u05E6\u05D4." + PF,
    steps: [
      { phase: "\u05D0", label: "\u05E7\u05D9\u05E6\u05D5\u05E0\u05D9\u05DD", coaching: "f'=0 + f'' \u05DC\u05E1\u05D9\u05D5\u05D5\u05D2", prompt: "f(x) = x\u00B3 \u2212 6x\u00B2 + 9x + 1. \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05E7\u05D9\u05E6\u05D5\u05E0\u05D9\u05DD \u05D5\u05DC\u05E1\u05D5\u05D5\u05D2." + PF, keywords: ["\u05E7\u05D9\u05E6\u05D5\u05DF", "\u05E0\u05D2\u05D6\u05E8\u05EA"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E7\u05D9\u05E6\u05D5\u05E0\u05D9\u05DD", contextWords: CW_A },
      { phase: "\u05D1", label: "\u05E4\u05D9\u05EA\u05D5\u05DC \u05D5\u05E7\u05E2\u05D9\u05E8\u05D5\u05EA", coaching: "f''=0 + \u05E1\u05D9\u05DE\u05DF", prompt: "f''(x) = 6x \u2212 12. \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05E4\u05D9\u05EA\u05D5\u05DC \u05D5\u05DC\u05E7\u05D1\u05D5\u05E2 \u05E7\u05E2\u05D9\u05E8\u05D5\u05EA." + PF, keywords: ["\u05E4\u05D9\u05EA\u05D5\u05DC", "\u05E7\u05E2\u05D9\u05E8\u05D5\u05EA"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E4\u05D9\u05EA\u05D5\u05DC", contextWords: CW_A },
      { phase: "\u05D2", label: "\u05D7\u05D9\u05EA\u05D5\u05DA \u05D5\u05D4\u05EA\u05E0\u05D4\u05D2\u05D5\u05EA", coaching: "y=0, x=0, \u00B1\u221E", prompt: "f(x) = x\u00B3 \u2212 6x\u00B2 + 9x + 1. \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D7\u05D9\u05EA\u05D5\u05DA \u05E6\u05D9\u05E8\u05D9\u05DD \u05D5\u05D4\u05EA\u05E0\u05D4\u05D2\u05D5\u05EA \u05D1\u05D0\u05D9\u05E0\u05E1\u05D5\u05E3." + PF, keywords: ["\u05D7\u05D9\u05EA\u05D5\u05DA", "\u05D0\u05D9\u05E0\u05E1\u05D5\u05E3"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05D7\u05D9\u05EA\u05D5\u05DA", contextWords: CW_A },
      { phase: "\u05D3", label: "\u05E1\u05E7\u05D9\u05E6\u05D4", coaching: "\u05E9\u05DC\u05D1\u05D5 \u05D0\u05EA \u05DB\u05DC \u05D4\u05DE\u05D9\u05D3\u05E2", prompt: "\u05D0\u05D7\u05E8\u05D9 \u05E9\u05DE\u05E6\u05D0\u05EA\u05D9 \u05E7\u05D9\u05E6\u05D5\u05E0\u05D9\u05DD, \u05E4\u05D9\u05EA\u05D5\u05DC, \u05D7\u05D9\u05EA\u05D5\u05DA \u05D5\u05D4\u05EA\u05E0\u05D4\u05D2\u05D5\u05EA \u2014 \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05E9\u05E8\u05D8\u05D8 \u05E1\u05E7\u05D9\u05E6\u05D4." + PF, keywords: ["\u05E1\u05E7\u05D9\u05E6\u05D4", "\u05E9\u05E8\u05D8\u05D5\u05D8"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E1\u05E7\u05D9\u05E6\u05D4", contextWords: CW_A },
    ],
  },
];

// ─── Lab ──────────────────────────────────────────────────────────────────────

function InvestigationLab() {
  const [a3, setA3] = useState(1);
  const [a2, setA2] = useState(-3);
  const [a1, setA1] = useState(0);
  const [a0, setA0] = useState(4);

  const f = (x: number) => a3 * x ** 3 + a2 * x ** 2 + a1 * x + a0;
  const fp = (x: number) => 3 * a3 * x ** 2 + 2 * a2 * x + a1;
  const fpp = (x: number) => 6 * a3 * x + 2 * a2;

  // Find critical points (f'=0) for cubic: 3a3*x^2 + 2a2*x + a1 = 0
  const discP = (2 * a2) ** 2 - 4 * 3 * a3 * a1;
  const crits: number[] = [];
  if (a3 !== 0 && discP >= 0) {
    const x1 = (-2 * a2 + Math.sqrt(discP)) / (6 * a3);
    const x2 = (-2 * a2 - Math.sqrt(discP)) / (6 * a3);
    crits.push(x1);
    if (Math.abs(x1 - x2) > 0.01) crits.push(x2);
  }
  // Inflection: f''=0 → x = -2a2 / (6a3)
  const inflX = a3 !== 0 ? -2 * a2 / (6 * a3) : null;

  const toX = (x: number) => 160 + x * 22;
  const toY = (y: number) => 150 - y * 8;

  const pts: string[] = [];
  for (let x = -5; x <= 7; x += 0.15) {
    const y = f(x);
    if (y > -15 && y < 25) pts.push(`${toX(x).toFixed(1)},${toY(y).toFixed(1)}`);
  }

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>&#128300; \u05DE\u05E2\u05D1\u05D3\u05D4 \u2014 \u05D7\u05E7\u05D9\u05E8\u05EA \u05E4\u05D5\u05DC\u05D9\u05E0\u05D5\u05DD \u05DE\u05D3\u05E8\u05D2\u05D4 3</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[{ label: "a\u2083", val: a3, set: setA3, min: -2, max: 2, step: 0.5 }, { label: "a\u2082", val: a2, set: setA2, min: -6, max: 6, step: 0.5 }, { label: "a\u2081", val: a1, set: setA1, min: -10, max: 10, step: 0.5 }, { label: "a\u2080", val: a0, set: setA0, min: -10, max: 10, step: 0.5 }].map(s => (
          <div key={s.label}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600, marginBottom: 4 }}><span>{s.label}</span><span>{s.val}</span></div><input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e => { const v = Number(e.target.value); if (s.label === "a\u2083" && v === 0) return; s.set(v); }} style={{ width: "100%" }} /></div>
        ))}
      </div>
      <svg width="100%" viewBox="0 0 350 300" style={{ maxWidth: 450, margin: "0 auto", display: "block" }}>
        <rect x={0} y={0} width={350} height={300} fill="#fafaf5" rx={12} />
        <line x1={160} y1={10} x2={160} y2={290} stroke="#94a3b8" strokeWidth={1} />
        <line x1={10} y1={150} x2={340} y2={150} stroke="#94a3b8" strokeWidth={1} />
        {pts.length > 1 && <polyline points={pts.join(" ")} fill="none" stroke="#dc2626" strokeWidth={2} />}
        {crits.map((cx, i) => <circle key={i} cx={toX(cx)} cy={toY(f(cx))} r={4} fill="#f59e0b" />)}
        {inflX !== null && <circle cx={toX(inflX)} cy={toY(f(inflX))} r={4} fill="#a78bfa" />}
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 20 }}>
        <div style={{ borderRadius: 12, border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.06)", padding: "10px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6B7280" }}>\u05E7\u05D9\u05E6\u05D5\u05E0\u05D9\u05DD</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>{crits.length === 0 ? "\u05D0\u05D9\u05DF" : crits.map(c => `x=${c.toFixed(1)}`).join(", ")}</div>
        </div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(167,139,250,0.2)", background: "rgba(167,139,250,0.06)", padding: "10px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6B7280" }}>\u05E4\u05D9\u05EA\u05D5\u05DC</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>{inflX !== null ? `x=${inflX.toFixed(1)}` : "\u05D0\u05D9\u05DF"}</div>
        </div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(22,163,74,0.2)", background: "rgba(22,163,74,0.06)", padding: "10px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6B7280" }}>\u05D7\u05D9\u05EA\u05D5\u05DA y</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>{a0}</div>
        </div>
      </div>
      <p style={{ textAlign: "center", color: "#6B7280", fontSize: 12, marginTop: 14 }}>\u05E9\u05E0\u05D5 \u05DE\u05E7\u05D3\u05DE\u05D9\u05DD \u05D5\u05E8\u05D0\u05D5 \u05D0\u05D9\u05DA \u05D4\u05E2\u05E7\u05D5\u05DE\u05D4, \u05D4\u05E7\u05D9\u05E6\u05D5\u05E0\u05D9\u05DD \u05D5\u05D4\u05E4\u05D9\u05EA\u05D5\u05DC \u05DE\u05E9\u05EA\u05E0\u05D9\u05DD</p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvestigationPage() {
  const [lvl, setLvl] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === lvl)!;
  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      <style>{`:root { --lvl-rgb: ${STATION[lvl].glowRgb}; }`}</style>
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>\u05D7\u05E7\u05D9\u05E8\u05D4 \u05DE\u05DC\u05D0\u05D4</h1>
          <Link href="/5u/topic/grade11/calculus" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none" }}>&#8592; \u05D7\u05D6\u05E8\u05D4</Link>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 4rem" }}>
        <SubtopicProgress subtopicId="5u/grade11/calculus/investigation" />
        <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
          {TABS.map(t => { const a = lvl === t.id; return <button key={t.id} onClick={() => setLvl(t.id)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${a ? `${t.bg} ${t.textColor} ${t.border} border-2` : "bg-white/60 text-gray-500 border border-transparent"}`} style={a ? { boxShadow: `0 0 12px ${t.glowColor}` } : {}}>{t.label}</button>; })}
        </div>
        <FormulaBar />
        <div style={{ marginBottom: "2rem" }}><ExerciseCard ex={ex} /></div>
        <InvestigationLab />
        <div style={{ marginTop: "2rem" }}><MarkComplete subtopicId="5u/grade11/calculus/investigation" level={lvl} /></div>
      </motion.div>
    </main>
  );
}
