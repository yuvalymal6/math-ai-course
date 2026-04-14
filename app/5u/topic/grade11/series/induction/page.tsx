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
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>שלבי אינדוקציה — בסיס, הנחה, צעד</p>
      <svg width="100%" viewBox="0 0 320 140" style={{ maxWidth: "100%" }}>
        {/* Three boxes: basis, assumption, step */}
        <rect x={10} y={30} width={85} height={50} rx={10} fill="rgba(22,163,74,0.08)" stroke="#16a34a" strokeWidth={1.5} />
        <text x={52} y={60} textAnchor="middle" fill="#16a34a" fontSize={12} fontWeight={700}>בסיס</text>
        <text x={52} y={74} textAnchor="middle" fill="#6B7280" fontSize={9}>n = 1</text>
        <rect x={118} y={30} width={85} height={50} rx={10} fill="rgba(245,158,11,0.08)" stroke="#f59e0b" strokeWidth={1.5} />
        <text x={160} y={60} textAnchor="middle" fill="#f59e0b" fontSize={12} fontWeight={700}>הנחה</text>
        <text x={160} y={74} textAnchor="middle" fill="#6B7280" fontSize={9}>n = k</text>
        <rect x={226} y={30} width={85} height={50} rx={10} fill="rgba(167,139,250,0.08)" stroke="#a78bfa" strokeWidth={1.5} />
        <text x={268} y={60} textAnchor="middle" fill="#a78bfa" fontSize={12} fontWeight={700}>צעד</text>
        <text x={268} y={74} textAnchor="middle" fill="#6B7280" fontSize={9}>n = k+1</text>
        {/* Arrows */}
        <line x1={95} y1={55} x2={118} y2={55} stroke="#64748b" strokeWidth={1.5} markerEnd="url(#arr)" />
        <line x1={203} y1={55} x2={226} y2={55} stroke="#64748b" strokeWidth={1.5} markerEnd="url(#arr)" />
        <defs><marker id="arr" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto"><polygon points="0,0 8,3 0,6" fill="#64748b" /></marker></defs>
        {/* Loop arrow from step back */}
        <path d="M 268,80 C 268,120 52,120 52,80" fill="none" stroke="#34d399" strokeWidth={1.2} strokeDasharray="4,3" markerEnd="url(#arr2)" />
        <defs><marker id="arr2" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto"><polygon points="0,0 8,3 0,6" fill="#34d399" /></marker></defs>
        <text x={160} y={118} textAnchor="middle" fill="#34d399" fontSize={9} fontWeight={600}>לכל n טבעי</text>
      </svg>
    </div>
  );
}

function MediumDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>סכום סדרה — דומינו של הוכחה</p>
      <svg width="100%" viewBox="0 0 300 100" style={{ maxWidth: "100%" }}>
        {/* Dominoes falling */}
        {[0,1,2,3,4,5,6].map(i => (
          <g key={i}>
            <rect x={20 + i * 40} y={20 + i * 3} width={16} height={55 - i * 2} rx={3} fill="none" stroke={i === 0 ? "#ea580c" : "#f59e0b"} strokeWidth={i === 0 ? 2 : 1.3} transform={`rotate(${-8 + i * 3}, ${28 + i * 40}, ${70})`} />
          </g>
        ))}
        <text x={28} y={90} fill="#ea580c" fontSize={9} fontWeight={700}>n=1</text>
        <text x={148} y={90} fill="#f59e0b" fontSize={9}>n=k</text>
        <text x={228} y={90} fill="#a78bfa" fontSize={9}>n=k+1</text>
        <text x={268} y={90} fill="#64748b" fontSize={9}>...</text>
      </svg>
    </div>
  );
}

function AdvancedDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>אינדוקציה — מבנה הוכחה מלא</p>
      <svg width="100%" viewBox="0 0 300 160" style={{ maxWidth: "100%" }}>
        {/* Flowchart style */}
        <rect x={100} y={5} width={100} height={30} rx={8} fill="rgba(220,38,38,0.08)" stroke="#dc2626" strokeWidth={1.5} />
        <text x={150} y={24} textAnchor="middle" fill="#dc2626" fontSize={11} fontWeight={700}>טענה P(n)</text>
        <line x1={150} y1={35} x2={80} y2={60} stroke="#64748b" strokeWidth={1} />
        <line x1={150} y1={35} x2={220} y2={60} stroke="#64748b" strokeWidth={1} />
        {/* Basis */}
        <rect x={30} y={60} width={100} height={28} rx={8} fill="rgba(22,163,74,0.08)" stroke="#16a34a" strokeWidth={1.3} />
        <text x={80} y={78} textAnchor="middle" fill="#16a34a" fontSize={10} fontWeight={600}>P(1) נכון ✓</text>
        {/* Step */}
        <rect x={170} y={60} width={110} height={28} rx={8} fill="rgba(167,139,250,0.08)" stroke="#a78bfa" strokeWidth={1.3} />
        <text x={225} y={78} textAnchor="middle" fill="#a78bfa" fontSize={10} fontWeight={600}>P(k)→P(k+1)</text>
        {/* Conclusion */}
        <line x1={80} y1={88} x2={150} y2={115} stroke="#64748b" strokeWidth={1} />
        <line x1={225} y1={88} x2={150} y2={115} stroke="#64748b" strokeWidth={1} />
        <rect x={80} y={115} width={140} height={30} rx={8} fill="rgba(52,211,153,0.1)" stroke="#34d399" strokeWidth={1.5} />
        <text x={150} y={134} textAnchor="middle" fill="#059669" fontSize={11} fontWeight={700}>P(n) לכל n∈ℕ ✓</text>
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
  const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "קצר מדי." }); return; } const res = calculatePromptScore(text, step.contextWords ?? []); setResult(res); if (!res.blocked && res.score >= 75) onPass?.(); };
  if (locked) return (<div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.6)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}><Lock size={14} color="#6B7280" /><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span></div>);
  const bc = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";
  return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)" }}>{passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={e => { setText(e.target.value); setResult(null); }} placeholder="נסח כאן..." style={{ minHeight: 80, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid rgba(${borderRgb},0.25)`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />{result && <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>ציון</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: bc }} /></div></div>}{!result && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקה</button>}{result && result.blocked && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12 }}>&#9888;&#65039; {result.hint}</motion.div>}{result && !result.blocked && result.score < 75 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12 }}>&#128161; {result.hint}</motion.div>}{passed && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, fontWeight: 600 }}>&#9989; ציון: <strong>{result!.score}/100</strong></div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק"}</button></motion.div>}{result && !passed && <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#6B7280", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>}</div></div>);
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
  return (<div><MasterPromptGate onPass={() => setMp(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["אינדוקציה", "בסיס", "הנחה", "צעד", "הוכחה", "סכום"]} />{steps.map((s, i) => <TutorStepAdvanced key={i} step={s} locked={!mp || i > idx} onPass={() => setP(v => { const n = [...v]; n[i] = true; return n; })} />)}</div>);
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
  const [act, setAct] = useState<"basis" | "assumption" | "step" | "sums" | null>(null);
  const tabs = [
    { id: "basis" as const, label: "בסיס", tex: "P(1)", color: "#16A34A", bc: "rgba(22,163,74,0.35)" },
    { id: "assumption" as const, label: "הנחה", tex: "P(k)", color: "#EA580C", bc: "rgba(234,88,12,0.35)" },
    { id: "step" as const, label: "צעד", tex: "P(k){\\Rightarrow}P(k{+}1)", color: "#DC2626", bc: "rgba(220,38,38,0.35)" },
    { id: "sums" as const, label: "סכומים", tex: "\\sum_{i=1}^{n}", color: "#7c3aed", bc: "rgba(124,58,237,0.35)" },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>אינדוקציה מתמטית</div>
      <div style={{ display: "flex", gap: 6, marginBottom: act ? 14 : 0 }}>
        {tabs.map(t => { const a = act === t.id; return <button key={t.id} onClick={() => setAct(a ? null : t.id)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${a ? t.bc : "rgba(60,54,42,0.15)"}`, background: a ? `${t.color}15` : "rgba(255,255,255,0.5)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11, fontWeight: 700, color: a ? t.color : "#6B7280" }}>{t.label}</span><span style={{ color: a ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>; })}
      </div>
      {act === "basis" && <motion.div key="basis" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"P(1): \\text{verify the statement for } n = 1"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>בסיס האינדוקציה:</strong> הציבו n=1 בשני אגפי הטענה וודאו שמתקיים שוויון. זה השלב ה"ראשון" — בלי בסיס, אין הוכחה.</div></div></motion.div>}
      {act === "assumption" && <motion.div key="assumption" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"\\text{Assume } P(k) \\text{ is true for some } k \\geq 1"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הנחת האינדוקציה:</strong> נניח שהטענה נכונה עבור n=k כלשהו. זה לא "הוכחה" — זו הנחה שנשתמש בה בצעד הבא.</div></div></motion.div>}
      {act === "step" && <motion.div key="step" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"P(k) \\Rightarrow P(k+1)"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>צעד האינדוקציה:</strong> הוכיחו שאם P(k) נכונה, אז גם P(k+1) נכונה. טיפ: כתבו את P(k+1), הפרידו את האיבר ה-(k+1), השתמשו בהנחה על k הראשונים.</div></div></motion.div>}
      {act === "sums" && <motion.div key="sums" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2},\\quad \\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>סכומים שכיחים:</strong> נוסחאות אלו מוכחות באינדוקציה. בצעד — הוסיפו את האיבר ה-(k+1) לשני האגפים.</div></div></motion.div>}
    </div>
  );
}

// ─── Exercise data ────────────────────────────────────────────────────────────

const PF = "\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.";
const CW_B: string[] = ["אינדוקציה", "בסיס", "הנחה", "צעד", "סכום", "n"];
const CW_M: string[] = ["אינדוקציה", "סכום ריבועים", "הנחה", "k+1", "פירוק", "הוכחה"];
const CW_A: string[] = ["אינדוקציה", "חילוק", "מתחלק", "בסיס", "הנחה", "צעד"];

const exercises: ExerciseDef[] = [
  {
    id: "basic", title: "סכום n מספרים טבעיים ראשונים",
    problem: "הוכיחו באינדוקציה מתמטית:\n1 + 2 + 3 + ... + n = n(n+1)/2\n\nא. בצעו את שלב הבסיס (n = 1).\nב. כתבו את הנחת האינדוקציה (עבור n = k).\nג. הוכיחו את צעד האינדוקציה (n = k+1).",
    diagram: <BasicDiagram />,
    pitfalls: [
      { title: "בסיס: n = 1 → אגף שמאל = 1, אגף ימין = 1·2/2 = 1 ✓", text: "אל תדלגו על שלב הבסיס — הוא חובה!" },
      { title: "הנחה: נניח שהטענה נכונה עבור n = k", text: "כלומר: 1+2+...+k = k(k+1)/2. זו לא הוכחה — זו הנחה!" },
      { title: "צעד: הוסיפו (k+1) לשני האגפים", text: "1+2+...+k+(k+1) = k(k+1)/2 + (k+1) = (k+1)(k+2)/2 ✓" },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 5 יחידות.\nהוכיחו באינדוקציה: 1+2+...+n = n(n+1)/2.\nצריך: בסיס, הנחה, צעד." + PF,
    steps: [
      { phase: "א", label: "בסיס", coaching: "הציבו n=1", prompt: "הוכחה באינדוקציה: 1+2+...+n = n(n+1)/2. הנחה אותי בשלב הבסיס (n=1)." + PF, keywords: ["בסיס", "n=1"], keywordHint: "ציין בסיס", contextWords: CW_B },
      { phase: "ב", label: "הנחה", coaching: "נניח ל-n=k", prompt: "הנחה אותי לכתוב את הנחת האינדוקציה עבור n=k." + PF, keywords: ["הנחה", "k"], keywordHint: "ציין הנחה", contextWords: CW_B },
      { phase: "ג", label: "צעד", coaching: "הוכיחו ל-n=k+1", prompt: "בהנחה ש-1+...+k = k(k+1)/2, הנחה אותי להוכיח ל-n=k+1." + PF, keywords: ["צעד", "k+1"], keywordHint: "ציין צעד", contextWords: CW_B },
    ],
  },
  {
    id: "medium", title: "סכום ריבועים",
    problem: "הוכיחו באינדוקציה:\n1\u00B2 + 2\u00B2 + 3\u00B2 + ... + n\u00B2 = n(n+1)(2n+1)/6\n\nא. בצעו את שלב הבסיס.\nב. כתבו הנחת אינדוקציה ובצעו את הצעד.\nג. הראו את הפישוט האלגברי בפירוט.\nד. ודאו שהגעתם לצורה (k+1)(k+2)(2k+3)/6.",
    diagram: <MediumDiagram />,
    pitfalls: [
      { title: "בסיס: n=1 → 1\u00B2 = 1, ו-1·2·3/6 = 1 ✓", text: "פשוט אבל חובה!" },
      { title: "צעד: הוסיפו (k+1)\u00B2", text: "k(k+1)(2k+1)/6 + (k+1)\u00B2 = (k+1)[k(2k+1) + 6(k+1)]/6" },
      { title: "פישוט: k(2k+1) + 6(k+1) = 2k\u00B2 + 7k + 6 = (k+2)(2k+3)", text: "אל תנסו לקצר — פתחו סוגריים ופרקו לגורמים בקפידה." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי, כיתה יא 5 יחידות.\nהוכחה באינדוקציה: 1\u00B2+2\u00B2+...+n\u00B2 = n(n+1)(2n+1)/6.\nצריך: בסיס, הנחה, צעד, פישוט." + PF,
    steps: [
      { phase: "א", label: "בסיס", coaching: "n=1", prompt: "הוכחה: \u2211i\u00B2 = n(n+1)(2n+1)/6. הנחה אותי בבסיס." + PF, keywords: ["בסיס"], keywordHint: "ציין בסיס", contextWords: CW_M },
      { phase: "ב", label: "הנחה + צעד", coaching: "הוסיפו (k+1)\u00B2", prompt: "בהנחה שהטענה נכונה ל-k, הנחה אותי לבצע את הצעד ל-k+1." + PF, keywords: ["צעד", "הנחה"], keywordHint: "ציין צעד", contextWords: CW_M },
      { phase: "ג", label: "פישוט", coaching: "פתחו ופרקו", prompt: "הגעתי ל-k(k+1)(2k+1)/6 + (k+1)\u00B2. הנחה אותי לפשט." + PF, keywords: ["פישוט", "גורמים"], keywordHint: "ציין פישוט", contextWords: CW_M },
      { phase: "ד", label: "אימות", coaching: "בדקו הצורה הסופית", prompt: "הנחה אותי לוודא שהתוצאה = (k+1)(k+2)(2k+3)/6." + PF, keywords: ["אימות", "צורה"], keywordHint: "ציין אימות", contextWords: CW_M },
    ],
  },
  {
    id: "advanced", title: "הוכחת התחלקות",
    problem: "הוכיחו באינדוקציה: לכל n טבעי, n\u00B3 \u2212 n מתחלק ב-6.\n\nא. בצעו את שלב הבסיס (n = 1).\nב. כתבו את הנחת האינדוקציה.\nג. בצעו את צעד האינדוקציה: הראו ש-(k+1)\u00B3 \u2212 (k+1) מתחלק ב-6.\nד. הסבירו מדוע 3k\u00B2 + 3k מתחלק ב-6 (רמז: k(k+1) זוגי).",
    diagram: <AdvancedDiagram />,
    pitfalls: [
      { title: "בסיס: n=1 → 1\u00B3 \u2212 1 = 0, ו-0 מתחלק ב-6 ✓", text: "0 מתחלק בכל מספר — זה תקין!" },
      { title: "(k+1)\u00B3 \u2212 (k+1) = k\u00B3 + 3k\u00B2 + 3k + 1 \u2212 k \u2212 1 = (k\u00B3\u2212k) + 3k\u00B2 + 3k", text: "הפרידו ל-(k\u00B3\u2212k) + 3k(k+1). הביטוי הראשון מתחלק ב-6 (הנחה)." },
      { title: "3k(k+1) מתחלק ב-6 כי k(k+1) תמיד זוגי", text: "מכפלת שני עוקבים תמיד זוגית → 3·(זוגי) = מתחלק ב-6." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי, כיתה יא 5 יחידות.\nהוכחה באינדוקציה: n\u00B3 \u2212 n מתחלק ב-6 לכל n טבעי.\nצריך: בסיס, הנחה, צעד, נימוק התחלקות." + PF,
    steps: [
      { phase: "א", label: "בסיס", coaching: "n=1", prompt: "הוכחה: n\u00B3\u2212n מתחלק ב-6. הנחה אותי בבסיס (n=1)." + PF, keywords: ["בסיס"], keywordHint: "ציין בסיס", contextWords: CW_A },
      { phase: "ב", label: "הנחה", coaching: "k\u00B3\u2212k = 6m", prompt: "הנחה אותי לכתוב הנחת אינדוקציה עבור n=k." + PF, keywords: ["הנחה", "מתחלק"], keywordHint: "ציין הנחה", contextWords: CW_A },
      { phase: "ג", label: "צעד", coaching: "פתחו (k+1)\u00B3\u2212(k+1)", prompt: "הנחה אותי לפתח (k+1)\u00B3\u2212(k+1) ולהפריד." + PF, keywords: ["צעד", "פיתוח"], keywordHint: "ציין צעד", contextWords: CW_A },
      { phase: "ד", label: "נימוק 3k(k+1)÷6", coaching: "עוקבים → זוגי", prompt: "הנחה אותי להסביר למה 3k(k+1) מתחלק ב-6." + PF, keywords: ["זוגי", "עוקבים"], keywordHint: "ציין נימוק", contextWords: CW_A },
    ],
  },
];

// ─── Lab ──────────────────────────────────────────────────────────────────────

function InductionLab() {
  const [n, setN] = useState(5);

  const sumN = (n * (n + 1)) / 2;
  const sumSq = (n * (n + 1) * (2 * n + 1)) / 6;
  const cubeMinusN = n ** 3 - n;
  const divBy6 = cubeMinusN % 6 === 0;

  // Visual: bar chart of partial sums
  const bars: number[] = [];
  let acc = 0;
  for (let i = 1; i <= n; i++) { acc += i; bars.push(acc); }
  const maxBar = bars[bars.length - 1] || 1;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>&#128300; מעבדה — בדיקת נוסחאות אינדוקציה</h3>
      <div style={{ maxWidth: 300, margin: "0 auto", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#2D3436", fontWeight: 600, marginBottom: 4 }}><span>n</span><span>{n}</span></div>
        <input type="range" min={1} max={20} step={1} value={n} onChange={e => setN(Number(e.target.value))} style={{ width: "100%" }} />
      </div>

      <svg width="100%" viewBox="0 0 340 160" style={{ maxWidth: 450, margin: "0 auto", display: "block" }}>
        <rect x={0} y={0} width={340} height={160} fill="#fafaf5" rx={12} />
        <line x1={30} y1={140} x2={330} y2={140} stroke="#cbd5e1" strokeWidth={1} />
        {bars.map((val, i) => {
          const bw = Math.max(4, Math.min(24, 280 / n));
          const bh = (val / maxBar) * 110;
          const bx = 35 + i * (280 / n);
          return <rect key={i} x={bx} y={140 - bh} width={bw} height={bh} rx={2} fill={`rgba(22,163,74,${0.3 + 0.7 * (i / n)})`} />;
        })}
        <text x={170} y={155} textAnchor="middle" fill="#6B7280" fontSize={9}>סכום חלקי 1+2+...+i</text>
      </svg>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 20 }}>
        <div style={{ borderRadius: 12, border: "1px solid rgba(22,163,74,0.2)", background: "rgba(22,163,74,0.06)", padding: "10px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6B7280" }}>\u2211i</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#16a34a" }}>{sumN}</div>
        </div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(234,88,12,0.2)", background: "rgba(234,88,12,0.06)", padding: "10px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6B7280" }}>\u2211i\u00B2</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#ea580c" }}>{sumSq}</div>
        </div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(124,58,237,0.2)", background: "rgba(124,58,237,0.06)", padding: "10px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6B7280" }}>n\u00B3\u2212n</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#7c3aed" }}>{cubeMinusN}</div>
        </div>
        <div style={{ borderRadius: 12, border: `1px solid ${divBy6 ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`, background: divBy6 ? "rgba(22,163,74,0.06)" : "rgba(220,38,38,0.06)", padding: "10px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6B7280" }}>÷6?</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: divBy6 ? "#16a34a" : "#dc2626" }}>{divBy6 ? "כן ✓" : "לא ✗"}</div>
        </div>
      </div>
      <p style={{ textAlign: "center", color: "#6B7280", fontSize: 12, marginTop: 14 }}>שנו את n ובדקו שהנוסחאות עובדות לכל ערך</p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InductionPage() {
  const [lvl, setLvl] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === lvl)!;
  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      <style>{`:root { --lvl-rgb: ${STATION[lvl].glowRgb}; }`}</style>
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>אינדוקציה מתמטית</h1>
          <Link href="/5u/topic/grade11/series" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none" }}>&#8592; חזרה</Link>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 4rem" }}>
        <SubtopicProgress subtopicId="5u/grade11/series/induction" />
        <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
          {TABS.map(t => { const a = lvl === t.id; return <button key={t.id} onClick={() => setLvl(t.id)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${a ? `${t.bg} ${t.textColor} ${t.border} border-2` : "bg-white/60 text-gray-500 border border-transparent"}`} style={a ? { boxShadow: `0 0 12px ${t.glowColor}` } : {}}>{t.label}</button>; })}
        </div>
        <FormulaBar />
        <div style={{ marginBottom: "2rem" }}><ExerciseCard ex={ex} /></div>
        <InductionLab />
        <div style={{ marginTop: "2rem" }}><MarkComplete subtopicId="5u/grade11/series/induction" level={lvl} /></div>
      </motion.div>
    </main>
  );
}
