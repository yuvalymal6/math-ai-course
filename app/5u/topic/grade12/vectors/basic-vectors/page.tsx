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

// ─── SVG ─────────────────────────────────────────────────────────────────────

function BasicDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>חיבור וקטורים — כלל המקבילית</p>
      <svg width="100%" viewBox="0 0 280 180" style={{ maxWidth: "100%" }}>
        <defs><marker id="ah" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto"><polygon points="0,0 8,3 0,6" fill="#16a34a" /></marker><marker id="ahb" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto"><polygon points="0,0 8,3 0,6" fill="#f59e0b" /></marker><marker id="ahr" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto"><polygon points="0,0 8,3 0,6" fill="#a78bfa" /></marker></defs>
        <line x1={40} y1={140} x2={180} y2={140} stroke="#16a34a" strokeWidth={2} markerEnd="url(#ah)" />
        <text x={110} y={158} fill="#16a34a" fontSize={12} fontWeight={700} textAnchor="middle">\u0101</text>
        <line x1={40} y1={140} x2={100} y2={50} stroke="#f59e0b" strokeWidth={2} markerEnd="url(#ahb)" />
        <text x={58} y={88} fill="#f59e0b" fontSize={12} fontWeight={700}>b\u0304</text>
        <line x1={180} y1={140} x2={240} y2={50} stroke="#64748b" strokeWidth={1.3} strokeDasharray="4,3" />
        <line x1={100} y1={50} x2={240} y2={50} stroke="#64748b" strokeWidth={1.3} strokeDasharray="4,3" />
        <line x1={40} y1={140} x2={240} y2={50} stroke="#a78bfa" strokeWidth={2.5} markerEnd="url(#ahr)" />
        <text x={145} y={85} fill="#a78bfa" fontSize={12} fontWeight={700}>\u0101+b\u0304</text>
      </svg>
    </div>
  );
}

function MediumDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>מכפלה סקלרית — זווית בין וקטורים</p>
      <svg width="100%" viewBox="0 0 280 180" style={{ maxWidth: "100%" }}>
        <defs><marker id="aho" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto"><polygon points="0,0 8,3 0,6" fill="#ea580c" /></marker></defs>
        <line x1={60} y1={140} x2={220} y2={140} stroke="#ea580c" strokeWidth={2} markerEnd="url(#aho)" />
        <text x={140} y={158} fill="#ea580c" fontSize={12} fontWeight={700} textAnchor="middle">\u0101</text>
        <line x1={60} y1={140} x2={180} y2={50} stroke="#ea580c" strokeWidth={2} markerEnd="url(#aho)" />
        <text x={108} y={85} fill="#ea580c" fontSize={12} fontWeight={700}>b\u0304</text>
        <path d="M 85,140 A 30,30 0 0,0 80,122" fill="none" stroke="#f59e0b" strokeWidth={2} />
        <text x={92} y={126} fill="#f59e0b" fontSize={11} fontWeight={700}>\u03B8</text>
      </svg>
    </div>
  );
}

function AdvancedDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>וקטורים במרחב — 3D</p>
      <svg width="100%" viewBox="0 0 280 200" style={{ maxWidth: "100%" }}>
        <defs><marker id="ahr2" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto"><polygon points="0,0 8,3 0,6" fill="#dc2626" /></marker></defs>
        {/* Axes */}
        <line x1={140} y1={160} x2={250} y2={160} stroke="#94a3b8" strokeWidth={1} />
        <text x={255} y={164} fill="#94a3b8" fontSize={10}>x</text>
        <line x1={140} y1={160} x2={140} y2={30} stroke="#94a3b8" strokeWidth={1} />
        <text x={143} y={24} fill="#94a3b8" fontSize={10}>z</text>
        <line x1={140} y1={160} x2={70} y2={190} stroke="#94a3b8" strokeWidth={1} />
        <text x={60} y={196} fill="#94a3b8" fontSize={10}>y</text>
        {/* Vector a */}
        <line x1={140} y1={160} x2={210} y2={80} stroke="#dc2626" strokeWidth={2} markerEnd="url(#ahr2)" />
        <text x={216} y={76} fill="#dc2626" fontSize={12} fontWeight={700}>\u0101</text>
        {/* Vector b */}
        <line x1={140} y1={160} x2={100} y2={100} stroke="#dc2626" strokeWidth={2} markerEnd="url(#ahr2)" />
        <text x={86} y={96} fill="#dc2626" fontSize={12} fontWeight={700}>b\u0304</text>
        {/* Angle arc */}
        <path d="M 165,140 A 25,25 0 0,0 128,138" fill="none" stroke="#f59e0b" strokeWidth={1.5} />
        <text x={142} y={132} fill="#f59e0b" fontSize={10}>\u03B8</text>
      </svg>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט", accentRgb = "22,163,74" }: { text: string; label?: string; accentRgb?: string }) { const [c, setC] = useState(false); return (<button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.8)", border: `1.5px solid rgba(${accentRgb},0.4)`, color: `rgb(${accentRgb})`, fontSize: 12, fontWeight: 600 }}>{c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}</button>); }
function GoldenPromptCard({ prompt, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { prompt: string; glowRgb?: string; borderRgb?: string }) { return (<div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15)` }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ fontSize: 14 }}>&#10024;</span><span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>פרומפט ראשי</span></div><p style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p><CopyBtn text={prompt} label="העתק פרומפט מלא" accentRgb={glowRgb} /></div>); }
function TutorStepBasic({ step, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) { return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(${glowRgb},0.45)`, marginBottom: 8, boxShadow: `0 0 14px rgba(${glowRgb},0.18)` }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}><span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><div><div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>&#9997;&#65039; הפרומפט המוכן</div><div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div></div><CopyBtn text={step.prompt} label="העתק פרומפט ממוקד" accentRgb={glowRgb} /></div></div>); }
function TutorStepMedium({ step, locked = false, onPass, borderRgb = "45,90,39" }: { step: PromptStep; locked?: boolean; onPass?: () => void; borderRgb?: string }) { const [text, setText] = useState(""); const [result, setResult] = useState<ScoreResult | null>(null); const [copied, setCopied] = useState(false); const passed = !!(result && !result.blocked && result.score >= 75); const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "קצר מדי." }); return; } const res = calculatePromptScore(text, step.contextWords ?? []); setResult(res); if (!res.blocked && res.score >= 75) onPass?.(); }; if (locked) return (<div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.6)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}><Lock size={14} color="#6B7280" /><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span></div>); const bc = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626"; return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)" }}>{passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={e => { setText(e.target.value); setResult(null); }} placeholder="נסח כאן..." style={{ minHeight: 80, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid rgba(${borderRgb},0.25)`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />{result && <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>ציון</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: bc }} /></div></div>}{!result && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקה</button>}{result && result.blocked && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12 }}>&#9888;&#65039; {result.hint}</motion.div>}{result && !result.blocked && result.score < 75 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12 }}>&#128161; {result.hint}</motion.div>}{passed && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, fontWeight: 600 }}>&#9989; ציון: <strong>{result!.score}/100</strong></div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק"}</button></motion.div>}{result && !passed && <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#6B7280", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>}</div></div>); }
function TutorStepAdvanced({ step, locked = false, onPass }: { step: PromptStep; locked?: boolean; onPass?: () => void }) { const [text, setText] = useState(""); const [result, setResult] = useState<ScoreResult | null>(null); const [copied, setCopied] = useState(false); const passed = result?.score !== undefined && result.score >= 90 && !result.blocked; if (locked) return (<div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.6)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}><Lock size={14} color="#6B7280" /><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} -- {step.label}</span></div>); const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "קצר מדי." }); return; } const r = calculatePromptScore(text, step.contextWords ?? []); setResult(r); if (!r.blocked && r.score >= 90 && onPass) onPass(); }; return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)"}`, marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)" }}>{passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#dc2626", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><textarea value={text} rows={3} dir="rtl" readOnly={passed} onChange={e => { if (!passed) { setText(e.target.value); setResult(null); } }} placeholder="כתוב פרומפט..." style={{ minHeight: 80, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />{result && <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>ציון</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99 }} /></div></div>}{result && !passed && result.hint && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, padding: 12, fontSize: 12, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>{result.blocked ? "\u26A0\uFE0F" : "\uD83D\uDCA1"} {result.hint}</motion.div>}{passed && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, fontWeight: 600 }}>&#9989; מעולה!</div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק"}</button></motion.div>}{!passed && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: "1px solid rgba(220,38,38,0.35)", color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקה</button>}</div></div>); }

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) { const [d, setD] = useState<boolean[]>(Array(steps.length).fill(false)); const u = d.filter(Boolean).length + 1; return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => (<div key={i}>{i < u ? (<><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />{!d[i] ? <button onClick={() => setD(p => { const n = [...p]; n[i] = true; return n; })} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>&#10003; סיימתי</button> : <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>&#9989; הושלם</div>}</>) : (<div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}><Lock size={14} color="#6B7280" style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }} /><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} /></div>)}</div>))}</div>); }
function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) { const [p, setP] = useState<boolean[]>(Array(steps.length).fill(false)); return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => <TutorStepMedium key={i} step={s} locked={i > 0 && !p[i - 1]} onPass={() => setP(v => { const n = [...v]; n[i] = true; return n; })} borderRgb={borderRgb} />)}</div>); }
function LadderAdvanced({ steps }: { steps: PromptStep[] }) { const [mp, setMp] = useState(false); const [p, setP] = useState<boolean[]>(Array(steps.length).fill(false)); const idx = mp ? (p.findIndex(v => !v) === -1 ? steps.length : p.findIndex(v => !v)) : -1; return (<div><MasterPromptGate onPass={() => setMp(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["וקטור", "סקלרית", "זווית", "ניצב", "אורך", "מרחב"]} />{steps.map((s, i) => <TutorStepAdvanced key={i} step={s} locked={!mp || i > idx} onPass={() => setP(v => { const n = [...v]; n[i] = true; return n; })} />)}</div>); }

function ExerciseCard({ ex }: { ex: ExerciseDef }) { const s = STATION[ex.id]; const [cp, setCp] = useState(false); return (<section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", boxShadow: s.glowShadow }}><div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}><span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span><h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2></div><div style={{ height: 1, background: "rgba(60,54,42,0.15)", marginBottom: "2rem" }} /><div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>{ex.diagram}</div><div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.6)", padding: "1.5rem", marginBottom: "2rem" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>&#128221; השאלה</div><button onClick={() => { navigator.clipboard.writeText(ex.problem); setCp(true); setTimeout(() => setCp(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: cp ? "rgba(22,163,74,0.15)" : "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)", color: cp ? "#16a34a" : "#6B7280", fontSize: 11, fontWeight: 600 }}>{cp ? <Check size={11} /> : <Copy size={11} />}{cp ? "הועתק!" : "העתק"}</button></div><pre style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre></div><div style={{ marginBottom: "2rem" }}><div style={{ color: "#dc2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>&#9888;&#65039; שגיאות נפוצות</div>{ex.pitfalls.map((p, i) => <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.25)", background: "rgba(254,226,226,0.25)", padding: "0.85rem 1rem", marginBottom: 8 }}><div style={{ color: "#b91c1c", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>{p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}</div>)}</div><div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.7)", padding: "1.25rem" }}><div style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>&#129504; מדריך הפרומפטים</div>{ex.id === "basic" && <LadderBase steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}{ex.id === "medium" && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}</div>{ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}</section>); }

// ─── Formula Bar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [act, setAct] = useState<"add" | "dot" | "length" | "angle" | null>(null);
  const tabs = [
    { id: "add" as const, label: "חיבור/חיסור", tex: "\\vec{a}+\\vec{b}", color: "#16A34A", bc: "rgba(22,163,74,0.35)" },
    { id: "dot" as const, label: "מכפלה סקלרית", tex: "\\vec{a}\\cdot\\vec{b}", color: "#EA580C", bc: "rgba(234,88,12,0.35)" },
    { id: "length" as const, label: "אורך", tex: "|\\vec{a}|", color: "#DC2626", bc: "rgba(220,38,38,0.35)" },
    { id: "angle" as const, label: "זווית", tex: "\\cos\\theta", color: "#7c3aed", bc: "rgba(124,58,237,0.35)" },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>
      <div style={{ display: "flex", gap: 6, marginBottom: act ? 14 : 0 }}>
        {tabs.map(t => { const a = act === t.id; return <button key={t.id} onClick={() => setAct(a ? null : t.id)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${a ? t.bc : "rgba(60,54,42,0.15)"}`, background: a ? `${t.color}15` : "rgba(255,255,255,0.5)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11, fontWeight: 700, color: a ? t.color : "#6B7280" }}>{t.label}</span><span style={{ color: a ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>; })}
      </div>
      {act === "add" && <motion.div key="add" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"\\vec{a}+\\vec{b} = (a_1+b_1,\\, a_2+b_2,\\, a_3+b_3)"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> חיבור וקטורים = חיבור רכיב-רכיב. חיסור = חיסור רכיב-רכיב. גיאומטרית: כלל המקבילית או ראש-זנב.</div></div></motion.div>}
      {act === "dot" && <motion.div key="dot" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"\\vec{a}\\cdot\\vec{b} = a_1 b_1 + a_2 b_2 + a_3 b_3 = |\\vec{a}||\\vec{b}|\\cos\\theta"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> מכפלה סקלרית = סכום מכפלות הרכיבים = מכפלת האורכים כפול קוסינוס הזווית. התוצאה היא מספר (סקלר), לא וקטור!</div></div></motion.div>}
      {act === "length" && <motion.div key="length" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"|\\vec{a}| = \\sqrt{a_1^2 + a_2^2 + a_3^2}"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> אורך (נורמה) של וקטור = שורש סכום ריבועי הרכיבים. הכללה של פיתגורס ל-3D.</div></div></motion.div>}
      {act === "angle" && <motion.div key="angle" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"\\cos\\theta = \\frac{\\vec{a}\\cdot\\vec{b}}{|\\vec{a}||\\vec{b}|}"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> הזווית בין שני וקטורים. אם cos\u03B8 = 0 → ניצבים. אם cos\u03B8 = 1 → אותו כיוון. אם cos\u03B8 = \u22121 → כיוונים הפוכים.</div></div></motion.div>}
    </div>
  );
}

// ─── Exercises ────────────────────────────────────────────────────────────────

const PF = "\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.";
const CW_B: string[] = ["וקטור", "חיבור", "חיסור", "רכיבים", "אורך", "מקבילית"];
const CW_M: string[] = ["סקלרית", "זווית", "ניצב", "קוסינוס", "מכפלה", "אורך"];
const CW_A: string[] = ["וקטור", "מרחב", "סקלרית", "ניצב", "מישור", "אנך"];

const exercises: ExerciseDef[] = [
  {
    id: "basic", title: "חיבור, חיסור ואורך",
    problem: "נתונים \u0101 = (3, \u22121, 2) ו-b\u0304 = (\u22121, 4, 1).\n\nא. חשבו \u0101 + b\u0304.\nב. חשבו \u0101 \u2212 b\u0304.\nג. חשבו |\u0101| ו-|b\u0304|.",
    diagram: <BasicDiagram />,
    pitfalls: [
      { title: "חיבור: רכיב-רכיב", text: "(3+(\u22121), \u22121+4, 2+1) = (2, 3, 3)." },
      { title: "חיסור: (3\u2212(\u22121), \u22121\u22124, 2\u22121) = (4, \u22125, 1)", text: "שימו לב: 3\u2212(\u22121) = 4, לא 2!" },
      { title: "|\u0101| = \u221A(9+1+4) = \u221A14", text: "אל תשכחו לעלות בריבוע כל רכיב, כולל שליליים." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי, כיתה יב 5 יחידות.\n\u0101=(3,\u22121,2), b\u0304=(\u22121,4,1).\nצריך: חיבור, חיסור, אורכים." + PF,
    steps: [
      { phase: "א", label: "חיבור", coaching: "רכיב+רכיב", prompt: "\u0101=(3,\u22121,2), b\u0304=(\u22121,4,1). הנחה אותי לחשב \u0101+b\u0304." + PF, keywords: ["חיבור", "רכיב"], keywordHint: "ציין חיבור", contextWords: CW_B },
      { phase: "ב", label: "חיסור", coaching: "רכיב\u2212רכיב", prompt: "\u0101=(3,\u22121,2), b\u0304=(\u22121,4,1). הנחה אותי לחשב \u0101\u2212b\u0304." + PF, keywords: ["חיסור"], keywordHint: "ציין חיסור", contextWords: CW_B },
      { phase: "ג", label: "אורכים", coaching: "\u221A(\u03A3x\u00B2)", prompt: "\u0101=(3,\u22121,2). הנחה אותי לחשב |\u0101|." + PF, keywords: ["אורך", "שורש"], keywordHint: "ציין אורך", contextWords: CW_B },
    ],
  },
  {
    id: "medium", title: "מכפלה סקלרית וזווית",
    problem: "נתונים \u0101 = (2, \u22121, 3) ו-b\u0304 = (1, 2, \u22122).\n\nא. חשבו \u0101\u00B7b\u0304.\nב. חשבו את הזווית \u03B8 בין \u0101 ל-b\u0304.\nג. האם קיים סקלר t כך ש-\u0101 \u22A5 (\u0101 + t\u00B7b\u0304)? מצאו אותו.\nד. מצאו וקטור יחידה בכיוון \u0101.",
    diagram: <MediumDiagram />,
    pitfalls: [
      { title: "\u0101\u00B7b\u0304 = 2\u00B71 + (\u22121)\u00B72 + 3\u00B7(\u22122) = 2\u22122\u22126 = \u22126", text: "סכום מכפלות רכיבים — אל תשכחו סימנים." },
      { title: "cos\u03B8 = \u22126/(\u221A14\u00B7\u221A9) = \u22126/(3\u221A14)", text: "\u03B8 = arccos(\u22126/(3\u221A14)) — זווית קהה (cos שלילי)." },
      { title: "וקטור יחידה: \u0101/|\u0101| = (2,\u22121,3)/\u221A14", text: "חלקו כל רכיב באורך — התוצאה וקטור באורך 1." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי, כיתה יב 5 יחידות.\n\u0101=(2,\u22121,3), b\u0304=(1,2,\u22122).\nצריך: מכפלה סקלרית, זווית, ניצבות, יחידה." + PF,
    steps: [
      { phase: "א", label: "מכפלה סקלרית", coaching: "\u03A3a\u1D62b\u1D62", prompt: "\u0101=(2,\u22121,3), b\u0304=(1,2,\u22122). הנחה אותי לחשב \u0101\u00B7b\u0304." + PF, keywords: ["סקלרית", "מכפלה"], keywordHint: "ציין מכפלה", contextWords: CW_M },
      { phase: "ב", label: "זווית", coaching: "cos\u03B8 = dot/(|a||b|)", prompt: "\u0101\u00B7b\u0304=\u22126. הנחה אותי למצוא \u03B8." + PF, keywords: ["זווית", "קוסינוס"], keywordHint: "ציין זווית", contextWords: CW_M },
      { phase: "ג", label: "ניצבות", coaching: "\u0101\u00B7(\u0101+tb\u0304)=0", prompt: "הנחה אותי למצוא t כך ש-\u0101 ניצב ל-\u0101+t\u00B7b\u0304." + PF, keywords: ["ניצב", "t"], keywordHint: "ציין ניצבות", contextWords: CW_M },
      { phase: "ד", label: "וקטור יחידה", coaching: "\u0101/|\u0101|", prompt: "הנחה אותי למצוא וקטור יחידה בכיוון \u0101=(2,\u22121,3)." + PF, keywords: ["יחידה", "כיוון"], keywordHint: "ציין יחידה", contextWords: CW_M },
    ],
  },
  {
    id: "advanced", title: "וקטורים במרחב — ניצבות ומישור",
    problem: "נתונים A(1,0,2), B(3,1,\u22121), C(0,2,1).\n\nא. חשבו AB\u20D7 ו-AC\u20D7.\nב. מצאו וקטור n\u20D7 הניצב לשניהם (מכפלה וקטורית, או פתרון מערכת).\nג. כתבו את משוואת המישור העובר דרך A, B, C.\nד. בדקו האם הנקודה D(2, 3, 0) נמצאת על המישור.",
    diagram: <AdvancedDiagram />,
    pitfalls: [
      { title: "AB\u20D7 = B\u2212A = (2,1,\u22123), AC\u20D7 = C\u2212A = (\u22121,2,\u22121)", text: "וקטור כיוון = נקודת סיום פחות נקודת התחלה." },
      { title: "n\u20D7 ניצב: פתרו n\u00B7AB=0 ו-n\u00B7AC=0", text: "אפשר גם מכפלה וקטורית: n = AB\u00D7AC." },
      { title: "משוואת מישור: n\u2081(x\u2212x\u2080)+n\u2082(y\u2212y\u2080)+n\u2083(z\u2212z\u2080)=0", text: "הציבו נקודה A ואת הנורמל n\u20D7 שמצאתם." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי, כיתה יב 5 יחידות.\nA(1,0,2), B(3,1,\u22121), C(0,2,1).\nצריך: AB, AC, נורמל, משוואת מישור, בדיקת D." + PF,
    steps: [
      { phase: "א", label: "AB\u20D7 ו-AC\u20D7", coaching: "B\u2212A, C\u2212A", prompt: "A(1,0,2), B(3,1,\u22121), C(0,2,1). הנחה אותי לחשב AB ו-AC." + PF, keywords: ["וקטור", "חיסור"], keywordHint: "ציין וקטורי כיוון", contextWords: CW_A },
      { phase: "ב", label: "נורמל", coaching: "ניצב לשניהם", prompt: "AB=(2,1,\u22123), AC=(\u22121,2,\u22121). הנחה אותי למצוא n ניצב לשניהם." + PF, keywords: ["ניצב", "נורמל"], keywordHint: "ציין נורמל", contextWords: CW_A },
      { phase: "ג", label: "משוואת מישור", coaching: "n\u00B7(r\u2212A)=0", prompt: "הנחה אותי לכתוב משוואת מישור דרך A עם נורמל n." + PF, keywords: ["מישור", "משוואה"], keywordHint: "ציין מישור", contextWords: CW_A },
      { phase: "ד", label: "בדיקת D", coaching: "הציבו D במשוואה", prompt: "D(2,3,0). הנחה אותי לבדוק אם D על המישור." + PF, keywords: ["הצבה", "בדיקה"], keywordHint: "ציין בדיקה", contextWords: CW_A },
    ],
  },
];

// ─── Lab ──────────────────────────────────────────────────────────────────────

function VectorLab() {
  const [a1, setA1] = useState(3); const [a2, setA2] = useState(-1); const [a3, setA3] = useState(2);
  const [b1, setB1] = useState(-1); const [b2, setB2] = useState(4); const [b3, setB3] = useState(1);

  const dot = a1 * b1 + a2 * b2 + a3 * b3;
  const lenA = Math.sqrt(a1 ** 2 + a2 ** 2 + a3 ** 2);
  const lenB = Math.sqrt(b1 ** 2 + b2 ** 2 + b3 ** 2);
  const cosT = lenA > 0 && lenB > 0 ? dot / (lenA * lenB) : 0;
  const angle = (Math.acos(Math.max(-1, Math.min(1, cosT))) * 180) / Math.PI;
  const perp = Math.abs(dot) < 0.001;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>&#128300; מעבדה — וקטורים</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", marginBottom: 8 }}>\u0101 = ({a1}, {a2}, {a3})</div>
          {[{ l: "a\u2081", v: a1, s: setA1 }, { l: "a\u2082", v: a2, s: setA2 }, { l: "a\u2083", v: a3, s: setA3 }].map(x => <div key={x.l} style={{ marginBottom: 6 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>{x.l}</span><span>{x.v}</span></div><input type="range" min={-5} max={5} step={1} value={x.v} onChange={e => x.s(Number(e.target.value))} style={{ width: "100%" }} /></div>)}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#ea580c", marginBottom: 8 }}>b\u0304 = ({b1}, {b2}, {b3})</div>
          {[{ l: "b\u2081", v: b1, s: setB1 }, { l: "b\u2082", v: b2, s: setB2 }, { l: "b\u2083", v: b3, s: setB3 }].map(x => <div key={x.l} style={{ marginBottom: 6 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>{x.l}</span><span>{x.v}</span></div><input type="range" min={-5} max={5} step={1} value={x.v} onChange={e => x.s(Number(e.target.value))} style={{ width: "100%" }} /></div>)}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 8 }}>
        <div style={{ borderRadius: 12, border: "1px solid rgba(22,163,74,0.2)", background: "rgba(22,163,74,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>|\u0101|</div><div style={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>{lenA.toFixed(2)}</div></div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(234,88,12,0.2)", background: "rgba(234,88,12,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>|b\u0304|</div><div style={{ fontSize: 14, fontWeight: 700, color: "#ea580c" }}>{lenB.toFixed(2)}</div></div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(124,58,237,0.2)", background: "rgba(124,58,237,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>\u0101\u00B7b\u0304</div><div style={{ fontSize: 14, fontWeight: 700, color: "#7c3aed" }}>{dot}</div></div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>\u03B8</div><div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>{angle.toFixed(1)}\u00B0</div></div>
        <div style={{ borderRadius: 12, border: `1px solid ${perp ? "rgba(22,163,74,0.3)" : "rgba(148,163,184,0.2)"}`, background: perp ? "rgba(22,163,74,0.08)" : "rgba(148,163,184,0.04)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>\u22A5?</div><div style={{ fontSize: 14, fontWeight: 700, color: perp ? "#16a34a" : "#6B7280" }}>{perp ? "כן \u2713" : "לא"}</div></div>
      </div>
      <p style={{ textAlign: "center", color: "#6B7280", fontSize: 12, marginTop: 14 }}>שנו רכיבים וראו מכפלה סקלרית, זווית וניצבות</p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BasicVectorsPage() {
  const [lvl, setLvl] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === lvl)!;
  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      <style>{`:root { --lvl-rgb: ${STATION[lvl].glowRgb}; }`}</style>
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>וקטורים בסיסיים</h1>
          <Link href="/5u/topic/grade12/vectors" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none" }}>&#8592; חזרה</Link>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 4rem" }}>
        <SubtopicProgress subtopicId="5u/grade12/vectors/basic-vectors" />
        <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
          {TABS.map(t => { const a = lvl === t.id; return <button key={t.id} onClick={() => setLvl(t.id)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${a ? `${t.bg} ${t.textColor} ${t.border} border-2` : "bg-white/60 text-gray-500 border border-transparent"}`} style={a ? { boxShadow: `0 0 12px ${t.glowColor}` } : {}}>{t.label}</button>; })}
        </div>
        <FormulaBar />
        <div style={{ marginBottom: "2rem" }}><ExerciseCard ex={ex} /></div>
        <VectorLab />
        <div style={{ marginTop: "2rem" }}><MarkComplete subtopicId="5u/grade12/vectors/basic-vectors" level={lvl} /></div>
      </motion.div>
    </main>
  );
}
