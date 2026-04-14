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
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",   glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700",  glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",     glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderRgb: "139,38,53" },
} as const;

const TABS = [
  { id: "basic" as const,    label: "מתחיל",  textColor: "text-green-700",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium" as const,   label: "בינוני", textColor: "text-orange-700",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced" as const, label: "מתקדם",  textColor: "text-red-700",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

// ─── SVG diagrams (silent) ──────────────────────────────────────────────────

function BasicDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>שתי נקודות, קטע ואמצע</p>
      <svg width="100%" viewBox="0 0 300 200" style={{ maxWidth: "100%" }}>
        <line x1={30} y1={170} x2={280} y2={170} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={50} y1={190} x2={50} y2={20} stroke="#cbd5e1" strokeWidth={1} />
        <text x={284} y={174} fill="#94a3b8" fontSize={11}>x</text>
        <text x={44} y={16} fill="#94a3b8" fontSize={11}>y</text>
        <line x1={90} y1={60} x2={230} y2={140} stroke="#16a34a" strokeWidth={2} />
        <circle cx={90} cy={60} r={4} fill="#16a34a" />
        <text x={72} y={52} fill="#16a34a" fontSize={12} fontWeight={700}>A</text>
        <circle cx={230} cy={140} r={4} fill="#16a34a" />
        <text x={236} y={136} fill="#16a34a" fontSize={12} fontWeight={700}>B</text>
        <circle cx={160} cy={100} r={4} fill="#f59e0b" />
        <text x={166} y={96} fill="#f59e0b" fontSize={12} fontWeight={700}>M</text>
      </svg>
    </div>
  );
}

function MediumDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>משולש עם חציונים</p>
      <svg width="100%" viewBox="0 0 300 220" style={{ maxWidth: "100%" }}>
        <polygon points="150,30 50,190 250,190" fill="none" stroke="#ea580c" strokeWidth={2} />
        <text x={145} y={22} fill="#ea580c" fontSize={12} fontWeight={700}>A</text>
        <text x={32} y={200} fill="#ea580c" fontSize={12} fontWeight={700}>B</text>
        <text x={252} y={200} fill="#ea580c" fontSize={12} fontWeight={700}>C</text>
        <line x1={150} y1={30} x2={150} y2={190} stroke="#f59e0b" strokeWidth={1.3} strokeDasharray="4,3" />
        <line x1={50} y1={190} x2={200} y2={110} stroke="#f59e0b" strokeWidth={1.3} strokeDasharray="4,3" />
        <line x1={250} y1={190} x2={100} y2={110} stroke="#f59e0b" strokeWidth={1.3} strokeDasharray="4,3" />
        <circle cx={150} cy={190} r={3} fill="#f59e0b" />
        <circle cx={200} cy={110} r={3} fill="#f59e0b" />
        <circle cx={100} cy={110} r={3} fill="#f59e0b" />
      </svg>
    </div>
  );
}

function AdvancedDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>מרובע עם אלכסונים</p>
      <svg width="100%" viewBox="0 0 300 220" style={{ maxWidth: "100%" }}>
        <polygon points="80,60 220,40 240,170 60,180" fill="none" stroke="#dc2626" strokeWidth={2} />
        <line x1={80} y1={60} x2={240} y2={170} stroke="#dc2626" strokeWidth={1.3} strokeDasharray="5,3" />
        <line x1={220} y1={40} x2={60} y2={180} stroke="#dc2626" strokeWidth={1.3} strokeDasharray="5,3" />
        <text x={68} y={52} fill="#dc2626" fontSize={12} fontWeight={700}>A</text>
        <text x={224} y={34} fill="#dc2626" fontSize={12} fontWeight={700}>B</text>
        <text x={244} y={180} fill="#dc2626" fontSize={12} fontWeight={700}>C</text>
        <text x={44} y={188} fill="#dc2626" fontSize={12} fontWeight={700}>D</text>
        <circle cx={80} cy={60} r={3} fill="#dc2626" />
        <circle cx={220} cy={40} r={3} fill="#dc2626" />
        <circle cx={240} cy={170} r={3} fill="#dc2626" />
        <circle cx={60} cy={180} r={3} fill="#dc2626" />
      </svg>
    </div>
  );
}

// ─── Prompt Coach Atoms ───────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט", accentRgb = "22,163,74" }: { text: string; label?: string; accentRgb?: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.8)", border: `1.5px solid rgba(${accentRgb},0.4)`, color: `rgb(${accentRgb})`, fontSize: 12, fontWeight: 600, transition: "all 0.2s" }}>
      {c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}
    </button>
  );
}

function GoldenPromptCard({ prompt, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { prompt: string; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ fontSize: 14 }}>&#10024;</span><span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>פרומפט ראשי</span></div>
      <p style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p>
      <CopyBtn text={prompt} label="העתק פרומפט מלא" accentRgb={glowRgb} />
    </div>
  );
}

function TutorStepBasic({ step, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(${glowRgb},0.45)`, marginBottom: 8, boxShadow: `0 0 14px rgba(${glowRgb},0.18)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div><div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>&#9997;&#65039; הפרומפט המוכן</div>
        <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div></div>
        <CopyBtn text={step.prompt} label="העתק פרומפט ממוקד" accentRgb={glowRgb} />
      </div>
    </div>
  );
}

function TutorStepMedium({ step, locked = false, onPass, borderRgb = "45,90,39" }: { step: PromptStep; locked?: boolean; onPass?: () => void; borderRgb?: string }) {
  const [text, setText] = useState(""); const [result, setResult] = useState<ScoreResult | null>(null); const [copied, setCopied] = useState(false);
  const passed = !!(result && !result.blocked && result.score >= 75);
  const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי -- כתוב לפחות 20 תווים." }); return; } const res = calculatePromptScore(text, step.contextWords ?? []); setResult(res); if (!res.blocked && res.score >= 75) onPass?.(); };
  if (locked) return (<div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.6)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}><Lock size={14} color="#6B7280" /><div><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span></div></div>);
  const scoreBarColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8, boxShadow: passed ? "0 0 16px rgba(22,163,74,0.15)" : "none", transition: "border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(22,163,74,0.3)" : `rgba(${borderRgb},0.2)`}` }}>{passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div>
      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={(e) => { setText(e.target.value); setResult(null); }} placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..." style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        {result && (<div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", marginBottom: 4, fontWeight: 600 }}><span>ציון הפרומפט</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} /></div></div>)}
        {!result && (<button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקת AI מדומה</button>)}
        {result && result.blocked && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>&#9888;&#65039; {result.hint}</motion.div>)}
        {result && !result.blocked && result.score < 75 && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>&#128161; {result.hint}</motion.div>)}
        {passed && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>&#9989; פרומפט מצוין! ציון: <strong>{result!.score}/100</strong></div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}</button></motion.div>)}
        {result && !passed && (<button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#6B7280", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>)}
      </div>
    </div>
  );
}

function TutorStepAdvanced({ step, locked = false, onPass }: { step: PromptStep; locked?: boolean; onPass?: () => void }) {
  const [text, setText] = useState(""); const [result, setResult] = useState<ScoreResult | null>(null); const [copied, setCopied] = useState(false);
  const passed = result?.score !== undefined && result.score >= 90 && !result.blocked;
  if (locked) return (<div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.6)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}><Lock size={14} color="#6B7280" /><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} -- {step.label}</span></div>);
  const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי -- כתוב לפחות 20 תווים." }); return; } const r = calculatePromptScore(text, step.contextWords ?? []); setResult(r); if (!r.blocked && r.score >= 90 && onPass) onPass(); };
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)"}`, marginBottom: 8, transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}` }}>{passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#dc2626", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div>
      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={text} rows={3} dir="rtl" readOnly={passed} onChange={(e) => { if (!passed) { setText(e.target.value); setResult(null); } }} placeholder="כתוב את הפרומפט שלך לסעיף זה..." style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        {result && (<div style={{ display: "flex", flexDirection: "column", gap: 4 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>ציון</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99, transition: "width 0.4s ease" }} /></div></div>)}
        {result && !passed && result.hint && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.6, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>{result.blocked ? "\u26A0\uFE0F" : "\uD83D\uDCA1"} {result.hint}</motion.div>)}
        {passed && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>&#9989; ניסוח מעולה! הסעיף הבא נפתח.</div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ניסוח"}</button></motion.div>)}
        {!passed && (<button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: "1px solid rgba(220,38,38,0.35)", color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקת AI מדומה</button>)}
      </div>
    </div>
  );
}

// ─── Ladders ──────────────────────────────────────────────────────────────────

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [completed, setCompleted] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlocked = completed.filter(Boolean).length + 1;
  const markDone = (i: number) => { setCompleted(prev => { const next = [...prev]; next[i] = true; return next; }); const el = document.getElementById(`basic-step-${i + 1}`); if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 200); };
  return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => (<div key={i} id={`basic-step-${i}`}>{i < unlocked ? (<><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />{!completed[i] ? (<button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>&#10003; סיימתי סעיף זה</button>) : (<div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>&#9989; הושלם</div>)}</>) : (<div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}><div style={{ position: "absolute", top: 8, right: 8, fontSize: 16, zIndex: 2 }}><Lock size={14} color="#6B7280" /></div><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} /></div>)}</div>))}</div>);
}

function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [passed, setPassed] = useState<boolean[]>(Array(steps.length).fill(false));
  return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => (<TutorStepMedium key={i} step={s} locked={i > 0 && !passed[i - 1]} onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })} borderRgb={borderRgb} />))}</div>);
}

function LadderAdvanced({ steps }: { steps: PromptStep[] }) {
  const [masterPassed, setMasterPassed] = useState(false);
  const [passed, setPassed] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlockedIdx = masterPassed ? (passed.findIndex(p => !p) === -1 ? steps.length : passed.findIndex(p => !p)) : -1;
  return (<div><MasterPromptGate onPass={() => setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["מרחק", "שיפוע", "מרובע", "אלכסון", "ניצב", "הוכחה"]} />{steps.map((s, i) => (<TutorStepAdvanced key={i} step={s} locked={!masterPassed || i > unlockedIdx} onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })} />))}</div>);
}

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() { navigator.clipboard.writeText(ex.problem); setCopiedProblem(true); setTimeout(() => setCopiedProblem(false), 2000); }
  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", boxShadow: s.glowShadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}><span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span><h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2></div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.15)", marginBottom: "2rem" }} />
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.6)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>&#128221; השאלה</div><button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.15)" : "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)", color: copiedProblem ? "#16a34a" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>{copiedProblem ? <Check size={11} /> : <Copy size={11} />}{copiedProblem ? "הועתק!" : "העתק"}</button></div>
        <pre style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>
      <div style={{ marginBottom: "2rem" }}><div style={{ color: "#dc2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>&#9888;&#65039; שגיאות נפוצות</div>{ex.pitfalls.map((p, i) => (<div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.25)", background: "rgba(254,226,226,0.25)", padding: "0.85rem 1rem", marginBottom: 8 }}><div style={{ color: "#b91c1c", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>{p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}</div>))}</div>
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.7)", padding: "1.25rem", boxShadow: s.glowShadow }}><div style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>&#129504; מדריך הפרומפטים</div>{ex.id === "basic" && <LadderBase steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}{ex.id === "medium" && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}</div>
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
    </section>
  );
}

// ─── Formula Bar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"distance" | "midpoint" | "slope" | "perp" | null>(null);
  const tabs = [
    { id: "distance" as const, label: "מרחק", tex: "d=\\sqrt{\\cdots}", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "midpoint" as const, label: "אמצע", tex: "M=(\\tfrac{x_1+x_2}{2},\\ldots)", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "slope" as const, label: "שיפוע", tex: "m=\\frac{\\Delta y}{\\Delta x}", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "perp" as const, label: "ניצבות", tex: "m_1{\\cdot}m_2=-1", color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>
      <div style={{ display: "flex", gap: 6, marginBottom: activeTab ? 14 : 0 }}>
        {tabs.map(t => { const isActive = activeTab === t.id; return (<button key={t.id} onClick={() => setActiveTab(isActive ? null : t.id)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${isActive ? t.borderColor : "rgba(60,54,42,0.15)"}`, background: isActive ? `${t.color}15` : "rgba(255,255,255,0.5)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span><span style={{ color: isActive ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>); })}
      </div>
      {activeTab === "distance" && (<motion.div key="distance" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}><div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> המרחק בין שתי נקודות במישור. הנוסחה מבוססת על משפט פיתגורס -- ההפרשים ב-x וב-y הם הניצבים, והמרחק הוא היתר.</div></div></div></motion.div>)}
      {activeTab === "midpoint" && (<motion.div key="midpoint" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"M = \\left(\\frac{x_1 + x_2}{2},\\, \\frac{y_1 + y_2}{2}\\right)"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}><div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> נקודת האמצע של קטע -- ממוצע ה-x וממוצע ה-y של שתי הקצוות.</div></div></div></motion.div>)}
      {activeTab === "slope" && (<motion.div key="slope" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"m = \\frac{y_2 - y_1}{x_2 - x_1}"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}><div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> שיפוע ישר = עלייה חלקי ריצה. m חיובי = עלייה, m שלילי = ירידה. ישר אנכי -- שיפוע לא מוגדר.</div></div></div></motion.div>)}
      {activeTab === "perp" && (<motion.div key="perp" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"m_1 \\cdot m_2 = -1 \\;(\\text{perpendicular})\\qquad m_1 = m_2 \\;(\\text{parallel})"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}><div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> ישרים מקבילים -- שיפועים שווים. ישרים ניצבים -- מכפלת שיפועים = −1.</div></div></div></motion.div>)}
    </div>
  );
}

// ─── Exercise data ────────────────────────────────────────────────────────────

const PROMPT_FOOTER = "\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.";

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "מרחק, אמצע ושיפוע",
    problem: "נתונות הנקודות A(\u22122, 3) ו-B(4, \u22121).\n\nא. חשבו את המרחק AB.\nב. מצאו את נקודת האמצע M של הקטע AB.\nג. מצאו את שיפוע הישר AB.",
    diagram: <BasicDiagram />,
    pitfalls: [
      { title: "מרחק: אל תשכחו את המינוס", text: "d = \u221A((4\u2212(\u22122))\u00B2 + (\u22121\u22123)\u00B2) = \u221A(36+16) = \u221A52" },
      { title: "אמצע: חיבור ולא חיסור", text: "M = ((\u22122+4)/2, (3+(\u22121))/2) = (1, 1)" },
      { title: "שיפוע: m = (\u22121\u22123)/(4\u2212(\u22122)) = \u22124/6 = \u22122/3", text: "סימן שלילי = ירידה משמאל לימין" },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 5 יחידות.\nנתונות A(\u22122, 3) ו-B(4, \u22121).\nצריך: מרחק, אמצע, שיפוע." + PROMPT_FOOTER,
    steps: [
      { phase: "א", label: "מרחק AB", coaching: "השתמשו בנוסחת המרחק", prompt: "נתונות A(\u22122, 3) ו-B(4, \u22121). הנחה אותי לחשב את המרחק AB בעזרת נוסחת המרחק. אל תפתור עבורי." + PROMPT_FOOTER, keywords: ["מרחק", "נוסחה"], keywordHint: "ציין מרחק ונוסחה", contextWords: ["מרחק", "אמצע", "שיפוע", "נקודות", "ישר", "קואורדינטות"] },
      { phase: "ב", label: "נקודת אמצע", coaching: "ממוצע x וממוצע y", prompt: "נתונות A(\u22122, 3) ו-B(4, \u22121). הנחה אותי למצוא את נקודת האמצע M. אל תפתור עבורי." + PROMPT_FOOTER, keywords: ["אמצע", "ממוצע"], keywordHint: "ציין אמצע", contextWords: ["מרחק", "אמצע", "שיפוע", "נקודות", "ישר", "קואורדינטות"] },
      { phase: "ג", label: "שיפוע", coaching: "עלייה חלקי ריצה", prompt: "נתונות A(\u22122, 3) ו-B(4, \u22121). הנחה אותי לחשב את שיפוע הישר AB. אל תפתור עבורי." + PROMPT_FOOTER, keywords: ["שיפוע", "עלייה"], keywordHint: "ציין שיפוע", contextWords: ["מרחק", "אמצע", "שיפוע", "נקודות", "ישר", "קואורדינטות"] },
    ],
  },
  {
    id: "medium",
    title: "תכונות משולש בקואורדינטות",
    problem: "משולש ABC עם A(0, 6), B(\u22124, 0), C(8, 0).\n\nא. חשבו את אורכי כל שלוש הצלעות.\nב. הוכיחו שהמשולש שווה שוקיים.\nג. מצאו את נקודת האמצע D של BC ואת אורך החציון AD.\nד. חשבו את שטח המשולש.",
    diagram: <MediumDiagram />,
    pitfalls: [
      { title: "חשבו כל צלע בנפרד", text: "AB = \u221A(16+36) = \u221A52, AC = \u221A(64+36) = 10, BC = 12" },
      { title: "שווה שוקיים: צריך שתי צלעות שוות", text: "AB = \u221A52 \u2248 7.2, AC = 10 -- בדקו נכון!" },
      { title: "שטח = \u00BD \u00B7 BC \u00B7 h", text: "הגובה מ-A לציר x הוא 6 (כי BC על ציר x)" },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 5 יחידות.\nמשולש ABC עם A(0,6), B(\u22124,0), C(8,0).\nצריך: צלעות, שווה שוקיים, חציון, שטח." + PROMPT_FOOTER,
    steps: [
      { phase: "א", label: "אורכי צלעות", coaching: "חשבו מרחק לכל זוג", prompt: "משולש A(0,6), B(\u22124,0), C(8,0). הנחה אותי לחשב AB, AC, BC. אל תפתור עבורי." + PROMPT_FOOTER, keywords: ["מרחק", "צלעות"], keywordHint: "ציין חישוב צלעות", contextWords: ["משולש", "צלעות", "חציון", "שטח", "שווה שוקיים", "גובה"] },
      { phase: "ב", label: "הוכחת שווה שוקיים", coaching: "השוו צלעות", prompt: "אחרי שחישבתי צלעות משולש A(0,6), B(\u22124,0), C(8,0) -- הנחה אותי להוכיח שהוא שווה שוקיים. אל תפתור עבורי." + PROMPT_FOOTER, keywords: ["שווה שוקיים", "שוות"], keywordHint: "ציין שווה שוקיים", contextWords: ["משולש", "צלעות", "חציון", "שטח", "שווה שוקיים", "גובה"] },
      { phase: "ג", label: "חציון AD", coaching: "אמצע BC ואז מרחק", prompt: "משולש A(0,6), B(\u22124,0), C(8,0). הנחה אותי למצוא את אמצע BC (=D) ואת אורך AD. אל תפתור עבורי." + PROMPT_FOOTER, keywords: ["אמצע", "חציון"], keywordHint: "ציין אמצע וחציון", contextWords: ["משולש", "צלעות", "חציון", "שטח", "שווה שוקיים", "גובה"] },
      { phase: "ד", label: "שטח", coaching: "בסיס כפול גובה חלקי 2", prompt: "משולש A(0,6), B(\u22124,0), C(8,0). BC על ציר x. הנחה אותי לחשב שטח. אל תפתור עבורי." + PROMPT_FOOTER, keywords: ["שטח", "גובה"], keywordHint: "ציין שטח", contextWords: ["משולש", "צלעות", "חציון", "שטח", "שווה שוקיים", "גובה"] },
    ],
  },
  {
    id: "advanced",
    title: "הוכחת תכונות מרובע",
    problem: "מרובע ABCD עם A(1, 1), B(5, 3), C(7, 7), D(3, 5).\n\nא. חשבו את שיפועי כל ארבע הצלעות. מה ניתן להסיק?\nב. חשבו את אורכי כל ארבע הצלעות. מה סוג המרובע?\nג. חשבו את אורכי האלכסונים AC ו-BD.\nד. הוכיחו שהאלכסונים מאונכים זה לזה.",
    diagram: <AdvancedDiagram />,
    pitfalls: [
      { title: "שיפועים: m(AB) = 1/2, m(CD) = 1/2", text: "AB \u2225 CD. בדקו גם m(BC) ו-m(AD)." },
      { title: "אורכים: AB = BC = CD = DA = \u221A20", text: "כל הצלעות שוות \u2192 מעוין" },
      { title: "ניצבות: m(AC)\u00B7m(BD) = 1\u00B7(\u22121) = \u22121", text: "מכפלת שיפועים = \u22121 \u2192 מאונכים \u2713" },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 5 יחידות.\nמרובע ABCD: A(1,1), B(5,3), C(7,7), D(3,5).\nצריך: שיפועים, אורכים, סוג, ניצבות אלכסונים." + PROMPT_FOOTER,
    steps: [
      { phase: "א", label: "שיפועי צלעות", coaching: "חשבו m לכל צלע", prompt: "מרובע A(1,1), B(5,3), C(7,7), D(3,5). הנחה אותי לחשב שיפועי AB, BC, CD, DA ולהסיק מקביליות. אל תפתור עבורי." + PROMPT_FOOTER, keywords: ["שיפוע", "מקביל"], keywordHint: "ציין שיפוע", contextWords: ["מרובע", "שיפוע", "מקביל", "מעוין", "אלכסון", "ניצב"] },
      { phase: "ב", label: "אורכי צלעות", coaching: "חשבו מרחק לכל צלע", prompt: "מרובע A(1,1), B(5,3), C(7,7), D(3,5). הנחה אותי לחשב אורכי כל הצלעות ולקבוע סוג מרובע. אל תפתור עבורי." + PROMPT_FOOTER, keywords: ["אורך", "מעוין"], keywordHint: "ציין אורך צלעות", contextWords: ["מרובע", "שיפוע", "מקביל", "מעוין", "אלכסון", "ניצב"] },
      { phase: "ג", label: "אלכסונים", coaching: "AC ו-BD", prompt: "מרובע A(1,1), B(5,3), C(7,7), D(3,5). הנחה אותי לחשב אורכי AC ו-BD. אל תפתור עבורי." + PROMPT_FOOTER, keywords: ["אלכסון", "מרחק"], keywordHint: "ציין אלכסון", contextWords: ["מרובע", "שיפוע", "מקביל", "מעוין", "אלכסון", "ניצב"] },
      { phase: "ד", label: "ניצבות אלכסונים", coaching: "מכפלת שיפועים", prompt: "מרובע A(1,1), B(5,3), C(7,7), D(3,5). הנחה אותי להוכיח שהאלכסונים AC ו-BD מאונכים. אל תפתור עבורי." + PROMPT_FOOTER, keywords: ["ניצב", "שיפוע"], keywordHint: "ציין ניצבות", contextWords: ["מרובע", "שיפוע", "מקביל", "מעוין", "אלכסון", "ניצב"] },
    ],
  },
];

// ─── Lab ──────────────────────────────────────────────────────────────────────

function AnalyticBasicsLab() {
  const [x1, setX1] = useState(-2);
  const [y1, setY1] = useState(3);
  const [x2, setX2] = useState(4);
  const [y2, setY2] = useState(-1);

  const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const slope = x2 === x1 ? null : (y2 - y1) / (x2 - x1);

  const toSvgX = (x: number) => 150 + x * 16;
  const toSvgY = (y: number) => 150 - y * 16;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>&#128300; מעבדה אינטראקטיבית</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[{ label: "x\u2081", val: x1, set: setX1 }, { label: "y\u2081", val: y1, set: setY1 }, { label: "x\u2082", val: x2, set: setX2 }, { label: "y\u2082", val: y2, set: setY2 }].map(s => (
          <div key={s.label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#2D3436", fontWeight: 600, marginBottom: 4 }}><span>{s.label}</span><span>{s.val}</span></div>
            <input type="range" min={-8} max={8} step={1} value={s.val} onChange={e => s.set(Number(e.target.value))} style={{ width: "100%" }} />
          </div>
        ))}
      </div>

      <svg width="100%" viewBox="0 0 300 300" style={{ maxWidth: 400, margin: "0 auto", display: "block" }}>
        <rect x={0} y={0} width={300} height={300} fill="#fafaf5" rx={12} />
        {/* Grid */}
        {Array.from({ length: 17 }, (_, i) => i - 8).map(v => (<g key={v}><line x1={toSvgX(v)} y1={22} x2={toSvgX(v)} y2={278} stroke="#e5e5e0" strokeWidth={0.5} /><line x1={22} y1={toSvgY(v)} x2={278} y2={toSvgY(v)} stroke="#e5e5e0" strokeWidth={0.5} /></g>))}
        {/* Axes */}
        <line x1={150} y1={22} x2={150} y2={278} stroke="#94a3b8" strokeWidth={1} />
        <line x1={22} y1={150} x2={278} y2={150} stroke="#94a3b8" strokeWidth={1} />
        <text x={282} y={154} fill="#94a3b8" fontSize={10}>x</text>
        <text x={153} y={18} fill="#94a3b8" fontSize={10}>y</text>
        {/* Segment */}
        <line x1={toSvgX(x1)} y1={toSvgY(y1)} x2={toSvgX(x2)} y2={toSvgY(y2)} stroke="#16a34a" strokeWidth={2} />
        {/* Points */}
        <circle cx={toSvgX(x1)} cy={toSvgY(y1)} r={5} fill="#16a34a" />
        <text x={toSvgX(x1) - 14} y={toSvgY(y1) - 8} fill="#16a34a" fontSize={11} fontWeight={700}>A</text>
        <circle cx={toSvgX(x2)} cy={toSvgY(y2)} r={5} fill="#16a34a" />
        <text x={toSvgX(x2) + 6} y={toSvgY(y2) - 8} fill="#16a34a" fontSize={11} fontWeight={700}>B</text>
        {/* Midpoint */}
        <circle cx={toSvgX(mx)} cy={toSvgY(my)} r={4} fill="#f59e0b" />
        <text x={toSvgX(mx) + 6} y={toSvgY(my) - 6} fill="#f59e0b" fontSize={10} fontWeight={700}>M</text>
      </svg>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 20 }}>
        <div style={{ borderRadius: 12, border: "1px solid rgba(22,163,74,0.2)", background: "rgba(22,163,74,0.06)", padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 2 }}>מרחק</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#16a34a" }}>{dist.toFixed(2)}</div>
        </div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(234,88,12,0.2)", background: "rgba(234,88,12,0.06)", padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 2 }}>אמצע</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#ea580c" }}>({mx.toFixed(1)}, {my.toFixed(1)})</div>
        </div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.06)", padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 2 }}>שיפוע</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#dc2626" }}>{slope === null ? "\u221E" : slope.toFixed(2)}</div>
        </div>
      </div>
      <p style={{ textAlign: "center", color: "#6B7280", fontSize: 12, marginTop: 14 }}>שנו את הנקודות וראו כיצד המרחק, האמצע והשיפוע משתנים</p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticBasics5UPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const activeTab = TABS.find(t => t.id === selectedLevel)!;

  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      <style>{`:root { --lvl-rgb: ${STATION[selectedLevel].glowRgb}; }`}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>יסודות גיאומטריה אנליטית</h1>
          <Link href="/5u/topic/grade10/analytic" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none" }}>
            &#8592; חזרה
          </Link>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 4rem" }}>

        <SubtopicProgress subtopicId="5u/grade10/analytic/basics" />

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
          {TABS.map(tab => {
            const isActive = selectedLevel === tab.id;
            return (
              <button key={tab.id} onClick={() => setSelectedLevel(tab.id)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${isActive ? `${tab.bg} ${tab.textColor} ${tab.border} border-2` : "bg-white/60 text-gray-500 border border-transparent"}`}
                style={isActive ? { boxShadow: `0 0 12px ${tab.glowColor}` } : {}}>
                {tab.label}
              </button>
            );
          })}
        </div>

        <FormulaBar />

        <div style={{ marginBottom: "2rem" }}>
          <ExerciseCard ex={ex} />
        </div>

        <AnalyticBasicsLab />

        <div style={{ marginTop: "2rem" }}>
          <MarkComplete subtopicId="5u/grade10/analytic/basics" level={selectedLevel} />
        </div>
      </motion.div>
    </main>
  );
}
