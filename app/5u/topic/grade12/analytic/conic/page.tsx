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
  basic:    { stationName: "\u05EA\u05D7\u05E0\u05D4 \u05E8\u05D0\u05E9\u05D5\u05E0\u05D4", badge: "\u05DE\u05EA\u05D7\u05D9\u05DC",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",   glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderRgb: "45,90,39"   },
  medium:   { stationName: "\u05EA\u05D7\u05E0\u05D4 \u05E9\u05E0\u05D9\u05D9\u05D4",  badge: "\u05D1\u05D9\u05E0\u05D5\u05E0\u05D9",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700",  glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderRgb: "163,79,38"  },
  advanced: { stationName: "\u05EA\u05D7\u05E0\u05D4 \u05E9\u05DC\u05D9\u05E9\u05D9\u05EA", badge: "\u05DE\u05EA\u05E7\u05D3\u05DD",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",     glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderRgb: "139,38,53" },
} as const;

const TABS = [
  { id: "basic" as const,    label: "\u05DE\u05EA\u05D7\u05D9\u05DC",  textColor: "text-green-700",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium" as const,   label: "\u05D1\u05D9\u05E0\u05D5\u05E0\u05D9", textColor: "text-orange-700",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced" as const, label: "\u05DE\u05EA\u05E7\u05D3\u05DD",  textColor: "text-red-700",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

// ─── SVG ─────────────────────────────────────────────────────────────────────

function BasicDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>מעגל — מרכז ורדיוס</p>
      <svg width="100%" viewBox="0 0 280 200" style={{ maxWidth: "100%" }}>
        <line x1={30} y1={170} x2={260} y2={170} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={50} y1={190} x2={50} y2={20} stroke="#cbd5e1" strokeWidth={1} />
        <text x={264} y={174} fill="#94a3b8" fontSize={11}>x</text>
        <text x={44} y={16} fill="#94a3b8" fontSize={11}>y</text>
        <circle cx={155} cy={100} r={60} fill="none" stroke="#16a34a" strokeWidth={1.8} />
        <circle cx={155} cy={100} r={3.5} fill="#16a34a" />
        <text x={161} y={96} fill="#16a34a" fontSize={12} fontWeight={700}>O</text>
        <line x1={155} y1={100} x2={215} y2={100} stroke="#16a34a" strokeWidth={1.3} strokeDasharray="4,3" />
        <text x={183} y={93} fill="#16a34a" fontSize={11} fontWeight={600}>R</text>
      </svg>
    </div>
  );
}

function MediumDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>אליפסה — צירים ומוקדים</p>
      <svg width="100%" viewBox="0 0 300 200" style={{ maxWidth: "100%" }}>
        <line x1={20} y1={100} x2={280} y2={100} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={150} y1={190} x2={150} y2={10} stroke="#cbd5e1" strokeWidth={1} />
        <text x={284} y={104} fill="#94a3b8" fontSize={10}>x</text>
        <text x={153} y={8} fill="#94a3b8" fontSize={10}>y</text>
        <ellipse cx={150} cy={100} rx={110} ry={65} fill="none" stroke="#ea580c" strokeWidth={1.8} />
        <circle cx={150} cy={100} r={2.5} fill="#ea580c" />
        {/* Foci */}
        <circle cx={68} cy={100} r={3.5} fill="#f59e0b" />
        <text x={62} y={116} fill="#f59e0b" fontSize={10} fontWeight={700}>F\u2081</text>
        <circle cx={232} cy={100} r={3.5} fill="#f59e0b" />
        <text x={236} y={116} fill="#f59e0b" fontSize={10} fontWeight={700}>F\u2082</text>
        {/* Semi-axes */}
        <line x1={150} y1={100} x2={260} y2={100} stroke="#ea580c" strokeWidth={1} strokeDasharray="4,3" />
        <text x={205} y={93} fill="#ea580c" fontSize={10}>a</text>
        <line x1={150} y1={100} x2={150} y2={35} stroke="#a78bfa" strokeWidth={1} strokeDasharray="4,3" />
        <text x={155} y={65} fill="#a78bfa" fontSize={10}>b</text>
      </svg>
    </div>
  );
}

function AdvancedDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>מקום גיאומטרי — מעגל ואליפסה</p>
      <svg width="100%" viewBox="0 0 300 200" style={{ maxWidth: "100%" }}>
        <line x1={20} y1={130} x2={280} y2={130} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={150} y1={190} x2={150} y2={10} stroke="#cbd5e1" strokeWidth={1} />
        {/* Circle */}
        <circle cx={150} cy={100} r={50} fill="none" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="5,3" />
        {/* Ellipse */}
        <ellipse cx={150} cy={100} rx={90} ry={55} fill="none" stroke="#dc2626" strokeWidth={2} />
        {/* Point P on ellipse */}
        <circle cx={220} cy={72} r={4} fill="#dc2626" />
        <text x={226} y={68} fill="#dc2626" fontSize={11} fontWeight={700}>P</text>
        {/* Two fixed points */}
        <circle cx={100} cy={130} r={3.5} fill="#f59e0b" />
        <text x={88} y={144} fill="#f59e0b" fontSize={10} fontWeight={700}>A</text>
        <circle cx={200} cy={130} r={3.5} fill="#f59e0b" />
        <text x={206} y={144} fill="#f59e0b" fontSize={10} fontWeight={700}>B</text>
        {/* Lines from A,B to P */}
        <line x1={100} y1={130} x2={220} y2={72} stroke="#dc2626" strokeWidth={1} strokeDasharray="3,2" />
        <line x1={200} y1={130} x2={220} y2={72} stroke="#dc2626" strokeWidth={1} strokeDasharray="3,2" />
      </svg>
    </div>
  );
}

// ─── Helpers (compact) ───────────────────────────────────────────────────────

function CopyBtn({ text, label = "\u05D4\u05E2\u05EA\u05E7 \u05E4\u05E8\u05D5\u05DE\u05E4\u05D8", accentRgb = "22,163,74" }: { text: string; label?: string; accentRgb?: string }) { const [c, setC] = useState(false); return (<button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.8)", border: `1.5px solid rgba(${accentRgb},0.4)`, color: `rgb(${accentRgb})`, fontSize: 12, fontWeight: 600 }}>{c ? <Check size={13} /> : <Copy size={13} />}{c ? "\u05D4\u05D5\u05E2\u05EA\u05E7!" : label}</button>); }
function GoldenPromptCard({ prompt, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { prompt: string; glowRgb?: string; borderRgb?: string }) { return (<div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15)` }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ fontSize: 14 }}>&#10024;</span><span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05E8\u05D0\u05E9\u05D9</span></div><p style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p><CopyBtn text={prompt} label="\u05D4\u05E2\u05EA\u05E7 \u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05DE\u05DC\u05D0" accentRgb={glowRgb} /></div>); }
function TutorStepBasic({ step, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) { return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(${glowRgb},0.45)`, marginBottom: 8, boxShadow: `0 0 14px rgba(${glowRgb},0.18)` }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}><span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><div><div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>&#9997;&#65039; \u05D4\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05D4\u05DE\u05D5\u05DB\u05DF</div><div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div></div><CopyBtn text={step.prompt} label="\u05D4\u05E2\u05EA\u05E7 \u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05DE\u05DE\u05D5\u05E7\u05D3" accentRgb={glowRgb} /></div></div>); }
function TutorStepMedium({ step, locked = false, onPass, borderRgb = "45,90,39" }: { step: PromptStep; locked?: boolean; onPass?: () => void; borderRgb?: string }) { const [text, setText] = useState(""); const [result, setResult] = useState<ScoreResult | null>(null); const [copied, setCopied] = useState(false); const passed = !!(result && !result.blocked && result.score >= 75); const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "\u05E7\u05E6\u05E8 \u05DE\u05D3\u05D9." }); return; } const res = calculatePromptScore(text, step.contextWords ?? []); setResult(res); if (!res.blocked && res.score >= 75) onPass?.(); }; if (locked) return (<div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.6)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}><Lock size={14} color="#6B7280" /><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span></div>); const bc = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626"; return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)" }}>{passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={e => { setText(e.target.value); setResult(null); }} placeholder="\u05E0\u05E1\u05D7 \u05DB\u05D0\u05DF..." style={{ minHeight: 80, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid rgba(${borderRgb},0.25)`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />{result && <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>\u05E6\u05D9\u05D5\u05DF</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: bc }} /></div></div>}{!result && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; \u05D1\u05D3\u05D9\u05E7\u05D4</button>}{result && result.blocked && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12 }}>&#9888;&#65039; {result.hint}</motion.div>}{result && !result.blocked && result.score < 75 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12 }}>&#128161; {result.hint}</motion.div>}{passed && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, fontWeight: 600 }}>&#9989; \u05E6\u05D9\u05D5\u05DF: <strong>{result!.score}/100</strong></div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "\u05D4\u05D5\u05E2\u05EA\u05E7!" : "\u05D4\u05E2\u05EA\u05E7"}</button></motion.div>}{result && !passed && <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#6B7280", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1</button>}</div></div>); }
function TutorStepAdvanced({ step, locked = false, onPass }: { step: PromptStep; locked?: boolean; onPass?: () => void }) { const [text, setText] = useState(""); const [result, setResult] = useState<ScoreResult | null>(null); const [copied, setCopied] = useState(false); const passed = result?.score !== undefined && result.score >= 90 && !result.blocked; if (locked) return (<div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.6)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}><Lock size={14} color="#6B7280" /><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} -- {step.label}</span></div>); const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "\u05E7\u05E6\u05E8 \u05DE\u05D3\u05D9." }); return; } const r = calculatePromptScore(text, step.contextWords ?? []); setResult(r); if (!r.blocked && r.score >= 90 && onPass) onPass(); }; return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)"}`, marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)" }}>{passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#dc2626", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><textarea value={text} rows={3} dir="rtl" readOnly={passed} onChange={e => { if (!passed) { setText(e.target.value); setResult(null); } }} placeholder="\u05DB\u05EA\u05D5\u05D1 \u05E4\u05E8\u05D5\u05DE\u05E4\u05D8..." style={{ minHeight: 80, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />{result && <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>\u05E6\u05D9\u05D5\u05DF</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99 }} /></div></div>}{result && !passed && result.hint && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, padding: 12, fontSize: 12, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>{result.blocked ? "\u26A0\uFE0F" : "\uD83D\uDCA1"} {result.hint}</motion.div>}{passed && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, fontWeight: 600 }}>&#9989; \u05DE\u05E2\u05D5\u05DC\u05D4!</div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "\u05D4\u05D5\u05E2\u05EA\u05E7!" : "\u05D4\u05E2\u05EA\u05E7"}</button></motion.div>}{!passed && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: "1px solid rgba(220,38,38,0.35)", color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; \u05D1\u05D3\u05D9\u05E7\u05D4</button>}</div></div>); }

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) { const [d, setD] = useState<boolean[]>(Array(steps.length).fill(false)); const u = d.filter(Boolean).length + 1; return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => (<div key={i}>{i < u ? (<><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />{!d[i] ? <button onClick={() => setD(p => { const n = [...p]; n[i] = true; return n; })} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>&#10003; \u05E1\u05D9\u05D9\u05DE\u05EA\u05D9</button> : <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>&#9989; \u05D4\u05D5\u05E9\u05DC\u05DD</div>}</>) : (<div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}><Lock size={14} color="#6B7280" style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }} /><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} /></div>)}</div>))}</div>); }
function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) { const [p, setP] = useState<boolean[]>(Array(steps.length).fill(false)); return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => <TutorStepMedium key={i} step={s} locked={i > 0 && !p[i - 1]} onPass={() => setP(v => { const n = [...v]; n[i] = true; return n; })} borderRgb={borderRgb} />)}</div>); }
function LadderAdvanced({ steps }: { steps: PromptStep[] }) { const [mp, setMp] = useState(false); const [p, setP] = useState<boolean[]>(Array(steps.length).fill(false)); const idx = mp ? (p.findIndex(v => !v) === -1 ? steps.length : p.findIndex(v => !v)) : -1; return (<div><MasterPromptGate onPass={() => setMp(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="\u05E1\u05E8\u05D5\u05E7 \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D5\u05E2\u05E6\u05D5\u05E8" subjectWords={["\u05D0\u05DC\u05D9\u05E4\u05E1\u05D4", "\u05DE\u05E2\u05D2\u05DC", "\u05DE\u05D5\u05E7\u05D3", "\u05DE\u05E7\u05D5\u05DD \u05D2\u05D9\u05D0\u05D5\u05DE\u05D8\u05E8\u05D9", "\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4", "\u05E6\u05D9\u05E8"]} />{steps.map((s, i) => <TutorStepAdvanced key={i} step={s} locked={!mp || i > idx} onPass={() => setP(v => { const n = [...v]; n[i] = true; return n; })} />)}</div>); }

function ExerciseCard({ ex }: { ex: ExerciseDef }) { const s = STATION[ex.id]; const [cp, setCp] = useState(false); return (<section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", boxShadow: s.glowShadow }}><div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}><span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span><h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2></div><div style={{ height: 1, background: "rgba(60,54,42,0.15)", marginBottom: "2rem" }} /><div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>{ex.diagram}</div><div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.6)", padding: "1.5rem", marginBottom: "2rem" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>&#128221; \u05D4\u05E9\u05D0\u05DC\u05D4</div><button onClick={() => { navigator.clipboard.writeText(ex.problem); setCp(true); setTimeout(() => setCp(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: cp ? "rgba(22,163,74,0.15)" : "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)", color: cp ? "#16a34a" : "#6B7280", fontSize: 11, fontWeight: 600 }}>{cp ? <Check size={11} /> : <Copy size={11} />}{cp ? "\u05D4\u05D5\u05E2\u05EA\u05E7!" : "\u05D4\u05E2\u05EA\u05E7"}</button></div><pre style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre></div><div style={{ marginBottom: "2rem" }}><div style={{ color: "#dc2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>&#9888;&#65039; \u05E9\u05D2\u05D9\u05D0\u05D5\u05EA \u05E0\u05E4\u05D5\u05E6\u05D5\u05EA</div>{ex.pitfalls.map((p, i) => <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.25)", background: "rgba(254,226,226,0.25)", padding: "0.85rem 1rem", marginBottom: 8 }}><div style={{ color: "#b91c1c", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>{p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}</div>)}</div><div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.7)", padding: "1.25rem" }}><div style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>&#129504; \u05DE\u05D3\u05E8\u05D9\u05DA \u05D4\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8\u05D9\u05DD</div>{ex.id === "basic" && <LadderBase steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}{ex.id === "medium" && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}</div>{ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}</section>); }

// ─── Formula Bar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [act, setAct] = useState<"circle" | "ellipse" | "foci" | "locus" | null>(null);
  const tabs = [
    { id: "circle" as const, label: "\u05DE\u05E2\u05D2\u05DC", tex: "(x{-}a)^2{+}(y{-}b)^2{=}R^2", color: "#16A34A", bc: "rgba(22,163,74,0.35)" },
    { id: "ellipse" as const, label: "\u05D0\u05DC\u05D9\u05E4\u05E1\u05D4", tex: "\\frac{x^2}{a^2}{+}\\frac{y^2}{b^2}{=}1", color: "#EA580C", bc: "rgba(234,88,12,0.35)" },
    { id: "foci" as const, label: "\u05DE\u05D5\u05E7\u05D3\u05D9\u05DD", tex: "c^2{=}a^2{-}b^2", color: "#DC2626", bc: "rgba(220,38,38,0.35)" },
    { id: "locus" as const, label: "\u05DE\u05E7\u05D5\u05DD \u05D2\u05D9\u05D0\u05D5\u05DE\u05D8\u05E8\u05D9", tex: "PF_1{+}PF_2{=}2a", color: "#7c3aed", bc: "rgba(124,58,237,0.35)" },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>\u05E0\u05D5\u05E1\u05D7\u05D0\u05D5\u05EA</div>
      <div style={{ display: "flex", gap: 6, marginBottom: act ? 14 : 0 }}>
        {tabs.map(t => { const a = act === t.id; return <button key={t.id} onClick={() => setAct(a ? null : t.id)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${a ? t.bc : "rgba(60,54,42,0.15)"}`, background: a ? `${t.color}15` : "rgba(255,255,255,0.5)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11, fontWeight: 700, color: a ? t.color : "#6B7280" }}>{t.label}</span><span style={{ color: a ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>; })}
      </div>
      {act === "circle" && <motion.div key="circle" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"(x - a)^2 + (y - b)^2 = R^2"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>\u05D4\u05E1\u05D1\u05E8:</strong> \u05DE\u05E8\u05DB\u05D6 (a,b), \u05E8\u05D3\u05D9\u05D5\u05E1 R. \u05DE\u05E2\u05D2\u05DC = \u05DE\u05E7\u05D5\u05DD \u05D2\u05D9\u05D0\u05D5\u05DE\u05D8\u05E8\u05D9 \u05E9\u05DC \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D1\u05DE\u05E8\u05D7\u05E7 \u05E7\u05D1\u05D5\u05E2 \u05DE\u05DE\u05E8\u05DB\u05D6.</div></div></motion.div>}
      {act === "ellipse" && <motion.div key="ellipse" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1,\\quad a > b > 0"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>\u05D4\u05E1\u05D1\u05E8:</strong> a = \u05D7\u05E6\u05D9 \u05E6\u05D9\u05E8 \u05D2\u05D3\u05D5\u05DC, b = \u05D7\u05E6\u05D9 \u05E6\u05D9\u05E8 \u05E7\u05D8\u05DF. \u05E7\u05D5\u05D3\u05E7\u05D5\u05D3\u05D9 \u05D0\u05DC\u05D9\u05E4\u05E1\u05D4: (\u00B1a, 0) \u05D5-(0, \u00B1b).</div></div></motion.div>}
      {act === "foci" && <motion.div key="foci" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"c^2 = a^2 - b^2,\\quad F_1(-c, 0),\\; F_2(c, 0)"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>\u05D4\u05E1\u05D1\u05E8:</strong> \u05D4\u05DE\u05D5\u05E7\u05D3\u05D9\u05DD \u05E2\u05DC \u05D4\u05E6\u05D9\u05E8 \u05D4\u05D2\u05D3\u05D5\u05DC. \u05D0\u05E7\u05E1\u05E6\u05E0\u05D8\u05E8\u05D9\u05D5\u05EA: e = c/a (0 &lt; e &lt; 1). \u05DB\u05E9-e \u05E7\u05E8\u05D5\u05D1 \u05DC-0 \u2192 \u05DE\u05E2\u05D2\u05DC.</div></div></motion.div>}
      {act === "locus" && <motion.div key="locus" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"PF_1 + PF_2 = 2a = \\text{const}"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>\u05D4\u05E1\u05D1\u05E8:</strong> \u05D0\u05DC\u05D9\u05E4\u05E1\u05D4 = \u05DE\u05E7\u05D5\u05DD \u05D2\u05D9\u05D0\u05D5\u05DE\u05D8\u05E8\u05D9 \u05E9\u05DC \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05E9\u05E1\u05DB\u05D5\u05DD \u05DE\u05E8\u05D7\u05E7\u05D9\u05D4\u05DF \u05DE\u05E9\u05E0\u05D9 \u05DE\u05D5\u05E7\u05D3\u05D9\u05DD \u05E7\u05D1\u05D5\u05E2. \u05DE\u05E2\u05D2\u05DC: \u05DE\u05E7\u05E8\u05D4 \u05E4\u05E8\u05D8\u05D9 \u05E9\u05D1\u05D5 PF = R (\u05E7\u05D1\u05D5\u05E2 \u05DE\u05DE\u05E8\u05DB\u05D6 \u05D0\u05D7\u05D3).</div></div></motion.div>}
    </div>
  );
}

// ─── Exercises ────────────────────────────────────────────────────────────────

const PF = "\n\u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.";
const CW_B: string[] = ["\u05DE\u05E2\u05D2\u05DC", "\u05DE\u05E8\u05DB\u05D6", "\u05E8\u05D3\u05D9\u05D5\u05E1", "\u05D4\u05E9\u05DC\u05DE\u05D4 \u05DC\u05E8\u05D9\u05D1\u05D5\u05E2", "\u05D7\u05D9\u05EA\u05D5\u05DA", "\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4"];
const CW_M: string[] = ["\u05D0\u05DC\u05D9\u05E4\u05E1\u05D4", "\u05E6\u05D9\u05E8", "\u05DE\u05D5\u05E7\u05D3", "\u05D0\u05E7\u05E1\u05E6\u05E0\u05D8\u05E8\u05D9\u05D5\u05EA", "\u05E7\u05D5\u05D3\u05E7\u05D5\u05D3", "a"];
const CW_A: string[] = ["\u05DE\u05E7\u05D5\u05DD \u05D2\u05D9\u05D0\u05D5\u05DE\u05D8\u05E8\u05D9", "\u05D0\u05DC\u05D9\u05E4\u05E1\u05D4", "\u05DE\u05E2\u05D2\u05DC", "\u05DE\u05E8\u05D7\u05E7", "\u05E1\u05DB\u05D5\u05DD", "\u05DE\u05D5\u05E7\u05D3"];

const exercises: ExerciseDef[] = [
  {
    id: "basic", title: "\u05DE\u05E2\u05D2\u05DC \u2014 \u05DE\u05E8\u05DB\u05D6, \u05E8\u05D3\u05D9\u05D5\u05E1 \u05D5\u05DE\u05D9\u05E7\u05D5\u05DD \u05E0\u05E7\u05D5\u05D3\u05D4",
    problem: "\u05E0\u05EA\u05D5\u05E0\u05D4 \u05DE\u05E9\u05D5\u05D5\u05D0\u05EA \u05D4\u05DE\u05E2\u05D2\u05DC: x\u00B2 + y\u00B2 \u2212 8x + 6y \u2212 11 = 0.\n\n\u05D0. \u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA \u05D4\u05DE\u05E8\u05DB\u05D6 \u05D5\u05D0\u05EA \u05D4\u05E8\u05D3\u05D9\u05D5\u05E1.\n\u05D1. \u05D1\u05D3\u05E7\u05D5 \u05D4\u05D0\u05DD \u05D4\u05E0\u05E7\u05D5\u05D3\u05D4 A(7, 2) \u05E2\u05DC \u05D4\u05DE\u05E2\u05D2\u05DC, \u05D1\u05EA\u05D5\u05DB\u05D5 \u05D0\u05D5 \u05DE\u05D7\u05D5\u05E6\u05D4 \u05DC\u05D5.\n\u05D2. \u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D4\u05D7\u05D9\u05EA\u05D5\u05DA \u05E2\u05DD \u05E6\u05D9\u05E8 x.",
    diagram: <BasicDiagram />,
    pitfalls: [
      { title: "\u05D4\u05E9\u05DC\u05DE\u05D4 \u05DC\u05E8\u05D9\u05D1\u05D5\u05E2: (x\u22124)\u00B2 + (y+3)\u00B2 = 36", text: "x\u00B2\u22128x = (x\u22124)\u00B2\u221216, y\u00B2+6y = (y+3)\u00B2\u22129. R\u00B2 = 16+9+11 = 36." },
      { title: "\u05DE\u05E8\u05D7\u05E7 A \u05DE\u05DE\u05E8\u05DB\u05D6: d = \u221A((7\u22124)\u00B2+(2+3)\u00B2) = \u221A34", text: "d \u2248 5.83 < 6 = R \u2192 \u05D4\u05E0\u05E7\u05D5\u05D3\u05D4 \u05D1\u05EA\u05D5\u05DA \u05D4\u05DE\u05E2\u05D2\u05DC." },
      { title: "\u05D7\u05D9\u05EA\u05D5\u05DA \u05E6\u05D9\u05E8 x: \u05D4\u05E6\u05D9\u05D1\u05D5 y = 0", text: "(x\u22124)\u00B2 + 9 = 36 \u2192 (x\u22124)\u00B2 = 27 \u2192 x = 4 \u00B1 3\u221A3." },
    ],
    goldenPrompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1 5 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05DE\u05E2\u05D2\u05DC: x\u00B2+y\u00B2\u22128x+6y\u221211=0.\n\u05E6\u05E8\u05D9\u05DA: \u05DE\u05E8\u05DB\u05D6, \u05E8\u05D3\u05D9\u05D5\u05E1, \u05DE\u05D9\u05E7\u05D5\u05DD \u05E0\u05E7\u05D5\u05D3\u05D4, \u05D7\u05D9\u05EA\u05D5\u05DA \u05E6\u05D9\u05E8 x." + PF,
    steps: [
      { phase: "\u05D0", label: "\u05DE\u05E8\u05DB\u05D6 \u05D5\u05E8\u05D3\u05D9\u05D5\u05E1", coaching: "\u05D4\u05E9\u05DC\u05DE\u05D4 \u05DC\u05E8\u05D9\u05D1\u05D5\u05E2", prompt: "\u05DE\u05E2\u05D2\u05DC x\u00B2+y\u00B2\u22128x+6y\u221211=0. \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05DE\u05E8\u05DB\u05D6 \u05D5\u05E8\u05D3\u05D9\u05D5\u05E1." + PF, keywords: ["\u05DE\u05E8\u05DB\u05D6", "\u05E8\u05D3\u05D9\u05D5\u05E1"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05DE\u05E8\u05DB\u05D6", contextWords: CW_B },
      { phase: "\u05D1", label: "\u05DE\u05D9\u05E7\u05D5\u05DD \u05E0\u05E7\u05D5\u05D3\u05D4", coaching: "\u05D4\u05E9\u05D5\u05D5 d \u05DC-R", prompt: "A(7,2), \u05DE\u05E8\u05DB\u05D6 (4,\u22123), R=6. \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05D1\u05D3\u05D5\u05E7 \u05DE\u05D9\u05E7\u05D5\u05DD A." + PF, keywords: ["\u05DE\u05E8\u05D7\u05E7", "\u05DE\u05D9\u05E7\u05D5\u05DD"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05DE\u05D9\u05E7\u05D5\u05DD", contextWords: CW_B },
      { phase: "\u05D2", label: "\u05D7\u05D9\u05EA\u05D5\u05DA \u05E6\u05D9\u05E8 x", coaching: "\u05D4\u05E6\u05D9\u05D1\u05D5 y=0", prompt: "\u05DE\u05E2\u05D2\u05DC (x\u22124)\u00B2+(y+3)\u00B2=36. \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D7\u05D9\u05EA\u05D5\u05DA \u05E6\u05D9\u05E8 x." + PF, keywords: ["\u05D7\u05D9\u05EA\u05D5\u05DA", "\u05E6\u05D9\u05E8"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05D7\u05D9\u05EA\u05D5\u05DA", contextWords: CW_B },
    ],
  },
  {
    id: "medium", title: "\u05D0\u05DC\u05D9\u05E4\u05E1\u05D4 \u2014 \u05E6\u05D9\u05E8\u05D9\u05DD, \u05DE\u05D5\u05E7\u05D3\u05D9\u05DD \u05D5\u05D0\u05E7\u05E1\u05E6\u05E0\u05D8\u05E8\u05D9\u05D5\u05EA",
    problem: "\u05E0\u05EA\u05D5\u05E0\u05D4 \u05D0\u05DC\u05D9\u05E4\u05E1\u05D4: x\u00B2/25 + y\u00B2/9 = 1.\n\n\u05D0. \u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA a, b, c \u05D5\u05D0\u05EA \u05D4\u05DE\u05D5\u05E7\u05D3\u05D9\u05DD.\n\u05D1. \u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA \u05D4\u05D0\u05E7\u05E1\u05E6\u05E0\u05D8\u05E8\u05D9\u05D5\u05EA e.\n\u05D2. \u05D5\u05D3\u05D0\u05D5 \u05E9\u05D4\u05E0\u05E7\u05D5\u05D3\u05D4 P(3, y) \u05E2\u05DC \u05D4\u05D0\u05DC\u05D9\u05E4\u05E1\u05D4, \u05D5\u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA y.\n\u05D3. \u05D7\u05E9\u05D1\u05D5 PF\u2081 + PF\u2082 \u05D5\u05D5\u05D3\u05D0\u05D5 \u05E9\u05E9\u05D5\u05D5\u05D4 \u05DC-2a.",
    diagram: <MediumDiagram />,
    pitfalls: [
      { title: "a\u00B2=25 \u2192 a=5, b\u00B2=9 \u2192 b=3, c\u00B2=25\u22129=16 \u2192 c=4", text: "\u05D4\u05DE\u05D5\u05E7\u05D3\u05D9\u05DD: F\u2081(\u22124,0), F\u2082(4,0)." },
      { title: "e = c/a = 4/5 = 0.8", text: "\u05D0\u05E7\u05E1\u05E6\u05E0\u05D8\u05E8\u05D9\u05D5\u05EA \u05D2\u05D1\u05D5\u05D4\u05D4 \u2014 \u05D4\u05D0\u05DC\u05D9\u05E4\u05E1\u05D4 \u05DE\u05D0\u05D5\u05E8\u05DB\u05EA (\u05DC\u05D0 \u05E7\u05E8\u05D5\u05D1\u05D4 \u05DC\u05DE\u05E2\u05D2\u05DC)." },
      { title: "P(3,y): 9/25 + y\u00B2/9 = 1 \u2192 y\u00B2 = 9(1\u22129/25) = 9\u00B716/25", text: "y = \u00B112/5. \u05D0\u05DC \u05EA\u05E9\u05DB\u05D7\u05D5 \u05D0\u05EA \u05D4\u05E4\u05EA\u05E8\u05D5\u05DF \u05D4\u05E9\u05DC\u05D9\u05DC\u05D9." },
    ],
    goldenPrompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1 5 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05D0\u05DC\u05D9\u05E4\u05E1\u05D4: x\u00B2/25 + y\u00B2/9 = 1.\n\u05E6\u05E8\u05D9\u05DA: a,b,c, \u05DE\u05D5\u05E7\u05D3\u05D9\u05DD, \u05D0\u05E7\u05E1\u05E6\u05E0\u05D8\u05E8\u05D9\u05D5\u05EA, P(3,y), PF\u2081+PF\u2082." + PF,
    steps: [
      { phase: "\u05D0", label: "a, b, c, \u05DE\u05D5\u05E7\u05D3\u05D9\u05DD", coaching: "c\u00B2=a\u00B2\u2212b\u00B2", prompt: "\u05D0\u05DC\u05D9\u05E4\u05E1\u05D4 x\u00B2/25+y\u00B2/9=1. \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 a,b,c \u05D5\u05DE\u05D5\u05E7\u05D3\u05D9\u05DD." + PF, keywords: ["\u05DE\u05D5\u05E7\u05D3", "\u05E6\u05D9\u05E8"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05DE\u05D5\u05E7\u05D3\u05D9\u05DD", contextWords: CW_M },
      { phase: "\u05D1", label: "\u05D0\u05E7\u05E1\u05E6\u05E0\u05D8\u05E8\u05D9\u05D5\u05EA", coaching: "e = c/a", prompt: "\u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05D7\u05E9\u05D1 e \u05D5\u05DC\u05E4\u05E8\u05E9." + PF, keywords: ["\u05D0\u05E7\u05E1\u05E6\u05E0\u05D8\u05E8\u05D9\u05D5\u05EA"], keywordHint: "\u05E6\u05D9\u05D9\u05DF e", contextWords: CW_M },
      { phase: "\u05D2", label: "P(3,y)", coaching: "\u05D4\u05E6\u05D9\u05D1\u05D5 x=3", prompt: "P(3,y) \u05E2\u05DC x\u00B2/25+y\u00B2/9=1. \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 y." + PF, keywords: ["\u05D4\u05E6\u05D1\u05D4", "y"], keywordHint: "\u05E6\u05D9\u05D9\u05DF y", contextWords: CW_M },
      { phase: "\u05D3", label: "PF\u2081+PF\u2082=2a", coaching: "\u05EA\u05DB\u05D5\u05E0\u05EA \u05D0\u05DC\u05D9\u05E4\u05E1\u05D4", prompt: "P(3,12/5), F\u2081(\u22124,0), F\u2082(4,0). \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05D7\u05E9\u05D1 PF\u2081+PF\u2082." + PF, keywords: ["\u05E1\u05DB\u05D5\u05DD", "2a"], keywordHint: "\u05E6\u05D9\u05D9\u05DF PF", contextWords: CW_M },
    ],
  },
  {
    id: "advanced", title: "\u05DE\u05E7\u05D5\u05DD \u05D2\u05D9\u05D0\u05D5\u05DE\u05D8\u05E8\u05D9 \u2014 \u05DE\u05E2\u05D2\u05DC \u05D5\u05D0\u05DC\u05D9\u05E4\u05E1\u05D4",
    problem: "\u05E0\u05EA\u05D5\u05E0\u05D5\u05EA \u05E9\u05EA\u05D9 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA A(\u22123, 0) \u05D5-B(3, 0).\n\n\u05D0. \u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA \u05DE\u05E7\u05D5\u05DD \u05D4\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA P \u05D4\u05DE\u05E7\u05D9\u05D9\u05DE\u05D5\u05EA PA + PB = 10. \u05DE\u05D4\u05D5 \u05E9\u05DD \u05D4\u05E2\u05E7\u05D5\u05DE\u05D4?\n\u05D1. \u05DB\u05EA\u05D1\u05D5 \u05D0\u05EA \u05DE\u05E9\u05D5\u05D5\u05D0\u05EA \u05D4\u05E2\u05E7\u05D5\u05DE\u05D4.\n\u05D2. \u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA \u05DE\u05E7\u05D5\u05DD \u05D4\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA Q \u05D4\u05DE\u05E7\u05D9\u05D9\u05DE\u05D5\u05EA QA = QB (\u05DE\u05E8\u05D7\u05E7 \u05E9\u05D5\u05D5\u05D4 \u05DE\u05E9\u05EA\u05D9 \u05D4\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA).\n\u05D3. \u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D4\u05D7\u05D9\u05EA\u05D5\u05DA \u05E9\u05DC \u05D4\u05D0\u05DC\u05D9\u05E4\u05E1\u05D4 \u05E2\u05DD \u05D4\u05D0\u05E0\u05DA \u05D4\u05D0\u05DE\u05E6\u05E2\u05D9.",
    diagram: <AdvancedDiagram />,
    pitfalls: [
      { title: "PA+PB=10=2a \u2192 a=5, c=3, b\u00B2=25\u22129=16", text: "\u05D4\u05E2\u05E7\u05D5\u05DE\u05D4 \u05D4\u05D9\u05D0 \u05D0\u05DC\u05D9\u05E4\u05E1\u05D4 \u05E2\u05DD \u05DE\u05D5\u05E7\u05D3\u05D9\u05DD A \u05D5-B." },
      { title: "\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4: x\u00B2/25 + y\u00B2/16 = 1", text: "a\u00B2=25 (\u05E6\u05D9\u05E8 x \u05D2\u05D3\u05D5\u05DC), b\u00B2=16 (\u05E6\u05D9\u05E8 y)." },
      { title: "QA=QB \u2192 Q \u05E2\u05DC \u05D0\u05E0\u05DA \u05D0\u05DE\u05E6\u05E2\u05D9 \u05E9\u05DC AB", text: "\u05D0\u05E0\u05DA \u05D0\u05DE\u05E6\u05E2\u05D9 = \u05DE\u05E7\u05D5\u05DD \u05D2\u05D9\u05D0\u05D5\u05DE\u05D8\u05E8\u05D9 \u05E9\u05DC \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D1\u05DE\u05E8\u05D7\u05E7 \u05E9\u05D5\u05D5\u05D4 \u05DE\u05E9\u05E0\u05D9 \u05E7\u05E6\u05D5\u05D5\u05EA = \u05E6\u05D9\u05E8 y." },
    ],
    goldenPrompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1 5 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\nA(\u22123,0), B(3,0).\n\u05E6\u05E8\u05D9\u05DA: PA+PB=10 (\u05D0\u05DC\u05D9\u05E4\u05E1\u05D4), QA=QB (\u05D0\u05E0\u05DA \u05D0\u05DE\u05E6\u05E2\u05D9), \u05D7\u05D9\u05EA\u05D5\u05DA." + PF,
    steps: [
      { phase: "\u05D0", label: "\u05D6\u05D9\u05D4\u05D5\u05D9 \u05D4\u05E2\u05E7\u05D5\u05DE\u05D4", coaching: "PA+PB=2a", prompt: "A(\u22123,0), B(3,0), PA+PB=10. \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05D6\u05D4\u05D5\u05EA \u05D0\u05EA \u05D4\u05E2\u05E7\u05D5\u05DE\u05D4." + PF, keywords: ["\u05D0\u05DC\u05D9\u05E4\u05E1\u05D4", "\u05DE\u05D5\u05E7\u05D3"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05D0\u05DC\u05D9\u05E4\u05E1\u05D4", contextWords: CW_A },
      { phase: "\u05D1", label: "\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4", coaching: "a,b,c \u2192 \u05DE\u05E9\u05D5\u05D5\u05D0\u05D4", prompt: "a=5, c=3. \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DB\u05EA\u05D5\u05D1 \u05DE\u05E9\u05D5\u05D5\u05D0\u05EA \u05D0\u05DC\u05D9\u05E4\u05E1\u05D4." + PF, keywords: ["\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05DE\u05E9\u05D5\u05D5\u05D0\u05D4", contextWords: CW_A },
      { phase: "\u05D2", label: "\u05D0\u05E0\u05DA \u05D0\u05DE\u05E6\u05E2\u05D9", coaching: "QA=QB", prompt: "A(\u22123,0), B(3,0). \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05DE\u05E7\u05D5\u05DD Q \u05E9\u05DE\u05E7\u05D9\u05D9\u05DD QA=QB." + PF, keywords: ["\u05D0\u05E0\u05DA \u05D0\u05DE\u05E6\u05E2\u05D9", "\u05E9\u05D5\u05D5\u05D4"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05D0\u05E0\u05DA", contextWords: CW_A },
      { phase: "\u05D3", label: "\u05D7\u05D9\u05EA\u05D5\u05DA \u05D0\u05DC\u05D9\u05E4\u05E1\u05D4 \u05D5\u05D0\u05E0\u05DA", coaching: "x=0 \u05D1\u05D0\u05DC\u05D9\u05E4\u05E1\u05D4", prompt: "\u05D0\u05DC\u05D9\u05E4\u05E1\u05D4 x\u00B2/25+y\u00B2/16=1 \u05D5\u05D0\u05E0\u05DA x=0. \u05D4\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D7\u05D9\u05EA\u05D5\u05DA." + PF, keywords: ["\u05D7\u05D9\u05EA\u05D5\u05DA"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05D7\u05D9\u05EA\u05D5\u05DA", contextWords: CW_A },
    ],
  },
];

// ─── Lab ──────────────────────────────────────────────────────────────────────

function ConicLab() {
  const [a, setA] = useState(5);
  const [b, setB] = useState(3);

  const c = Math.sqrt(Math.max(0, a * a - b * b));
  const e = a > 0 ? c / a : 0;
  const area = Math.PI * a * b;
  const isCircle = Math.abs(a - b) < 0.01;

  const sx = 6, cx2 = 170, cy2 = 110;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>&#128300; \u05DE\u05E2\u05D1\u05D3\u05D4 \u2014 \u05DE\u05E2\u05D2\u05DC \u05D5\u05D0\u05DC\u05D9\u05E4\u05E1\u05D4</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#2D3436", fontWeight: 600, marginBottom: 4 }}><span>a (\u05D7\u05E6\u05D9 \u05E6\u05D9\u05E8 \u05D2\u05D3\u05D5\u05DC)</span><span>{a}</span></div><input type="range" min={1} max={12} step={0.5} value={a} onChange={e => { const v = Number(e.target.value); if (v >= b) setA(v); }} style={{ width: "100%" }} /></div>
        <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#2D3436", fontWeight: 600, marginBottom: 4 }}><span>b (\u05D7\u05E6\u05D9 \u05E6\u05D9\u05E8 \u05E7\u05D8\u05DF)</span><span>{b}</span></div><input type="range" min={1} max={12} step={0.5} value={b} onChange={e => { const v = Number(e.target.value); if (v <= a) setB(v); }} style={{ width: "100%" }} /></div>
      </div>
      <svg width="100%" viewBox="0 0 340 220" style={{ maxWidth: 420, margin: "0 auto", display: "block" }}>
        <rect x={0} y={0} width={340} height={220} fill="#fafaf5" rx={12} />
        <line x1={cx2} y1={10} x2={cx2} y2={210} stroke="#94a3b8" strokeWidth={1} />
        <line x1={10} y1={cy2} x2={330} y2={cy2} stroke="#94a3b8" strokeWidth={1} />
        <ellipse cx={cx2} cy={cy2} rx={a * sx} ry={b * sx} fill="rgba(234,88,12,0.06)" stroke="#ea580c" strokeWidth={2} />
        {/* Foci */}
        {!isCircle && <><circle cx={cx2 - c * sx} cy={cy2} r={3.5} fill="#f59e0b" /><circle cx={cx2 + c * sx} cy={cy2} r={3.5} fill="#f59e0b" /></>}
        <circle cx={cx2} cy={cy2} r={2.5} fill="#ea580c" />
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 20 }}>
        <div style={{ borderRadius: 12, border: "1px solid rgba(22,163,74,0.2)", background: "rgba(22,163,74,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>c</div><div style={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>{c.toFixed(2)}</div></div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(234,88,12,0.2)", background: "rgba(234,88,12,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>e = c/a</div><div style={{ fontSize: 14, fontWeight: 700, color: "#ea580c" }}>{e.toFixed(3)}</div></div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(124,58,237,0.2)", background: "rgba(124,58,237,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>\u05E9\u05D8\u05D7</div><div style={{ fontSize: 14, fontWeight: 700, color: "#7c3aed" }}>{area.toFixed(1)}</div></div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>\u05E1\u05D5\u05D2</div><div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>{isCircle ? "\u05DE\u05E2\u05D2\u05DC" : "\u05D0\u05DC\u05D9\u05E4\u05E1\u05D4"}</div></div>
      </div>
      <p style={{ textAlign: "center", color: "#6B7280", fontSize: 12, marginTop: 14 }}>\u05E9\u05E0\u05D5 a \u05D5-b \u2014 \u05DB\u05E9-a=b \u05D6\u05D4 \u05DE\u05E2\u05D2\u05DC, \u05DB\u05E9-a&gt;b \u05D6\u05D4 \u05D0\u05DC\u05D9\u05E4\u05E1\u05D4</p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConicPage() {
  const [lvl, setLvl] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === lvl)!;
  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      <style>{`:root { --lvl-rgb: ${STATION[lvl].glowRgb}; }`}</style>
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>\u05DE\u05E2\u05D2\u05DC \u05D5\u05D0\u05DC\u05D9\u05E4\u05E1\u05D4</h1>
          <Link href="/5u/topic/grade12/analytic" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none" }}>&#8592; \u05D7\u05D6\u05E8\u05D4</Link>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 4rem" }}>
        <SubtopicProgress subtopicId="5u/grade12/analytic/conic" />
        <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
          {TABS.map(t => { const a = lvl === t.id; return <button key={t.id} onClick={() => setLvl(t.id)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${a ? `${t.bg} ${t.textColor} ${t.border} border-2` : "bg-white/60 text-gray-500 border border-transparent"}`} style={a ? { boxShadow: `0 0 12px ${t.glowColor}` } : {}}>{t.label}</button>; })}
        </div>
        <FormulaBar />
        <div style={{ marginBottom: "2rem" }}><ExerciseCard ex={ex} /></div>
        <ConicLab />
        <div style={{ marginTop: "2rem" }}><MarkComplete subtopicId="5u/grade12/analytic/conic" level={lvl} /></div>
      </motion.div>
    </main>
  );
}
