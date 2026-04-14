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
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>עץ הסתברות — שני שלבים</p>
      <svg width="100%" viewBox="0 0 300 160" style={{ maxWidth: "100%" }}>
        <circle cx={150} cy={20} r={4} fill="#16a34a" />
        <line x1={150} y1={24} x2={80} y2={70} stroke="#16a34a" strokeWidth={1.5} />
        <line x1={150} y1={24} x2={220} y2={70} stroke="#16a34a" strokeWidth={1.5} />
        <circle cx={80} cy={70} r={4} fill="#16a34a" />
        <text x={60} y={65} fill="#16a34a" fontSize={11} fontWeight={700}>A</text>
        <circle cx={220} cy={70} r={4} fill="#64748b" />
        <text x={226} y={65} fill="#64748b" fontSize={11} fontWeight={700}>\u0100</text>
        <line x1={80} y1={74} x2={40} y2={130} stroke="#f59e0b" strokeWidth={1.2} />
        <line x1={80} y1={74} x2={120} y2={130} stroke="#f59e0b" strokeWidth={1.2} />
        <line x1={220} y1={74} x2={180} y2={130} stroke="#64748b" strokeWidth={1.2} />
        <line x1={220} y1={74} x2={260} y2={130} stroke="#64748b" strokeWidth={1.2} />
        <text x={28} y={145} fill="#f59e0b" fontSize={10}>B</text>
        <text x={114} y={145} fill="#f59e0b" fontSize={10}>\u0100B</text>
        <text x={170} y={145} fill="#64748b" fontSize={10}>B</text>
        <text x={254} y={145} fill="#64748b" fontSize={10}>\u0100B</text>
      </svg>
    </div>
  );
}

function MediumDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>טבלה דו-ממדית — שכיחויות</p>
      <svg width="100%" viewBox="0 0 280 110" style={{ maxWidth: "100%" }}>
        {[0,70,140,210,280].map(x => <line key={`v${x}`} x1={x} y1={0} x2={x} y2={110} stroke="#cbd5e1" strokeWidth={x === 0 || x === 280 ? 1.5 : 1} />)}
        {[0,28,56,84,110].map(y => <line key={`h${y}`} x1={0} y1={y} x2={280} y2={y} stroke="#cbd5e1" strokeWidth={y === 0 || y === 110 ? 1.5 : 1} />)}
        {[0,1,2,3].map(xi => <rect key={`hc${xi}`} x={xi * 70} y={0} width={70} height={28} fill="#f1f5f9" />)}
        <text x={35} y={18} textAnchor="middle" fill="#ea580c" fontSize={10} fontWeight={700}></text>
        <text x={105} y={18} textAnchor="middle" fill="#ea580c" fontSize={10} fontWeight={700}>B</text>
        <text x={175} y={18} textAnchor="middle" fill="#ea580c" fontSize={10} fontWeight={700}>\u0100B</text>
        <text x={245} y={18} textAnchor="middle" fill="#ea580c" fontSize={10} fontWeight={700}>סה&quot;כ</text>
        <text x={35} y={46} textAnchor="middle" fill="#ea580c" fontSize={10} fontWeight={700}>A</text>
        <text x={35} y={74} textAnchor="middle" fill="#ea580c" fontSize={10} fontWeight={700}>\u0100A</text>
        <text x={35} y={100} textAnchor="middle" fill="#ea580c" fontSize={10} fontWeight={700}>סה&quot;כ</text>
        {[1,2,3].flatMap(xi => [1,2,3].map(yi => <text key={`d${xi}${yi}`} x={xi * 70 - 35} y={yi * 28 + 14} textAnchor="middle" fill="#cbd5e1" fontSize={10}>\u2014</text>))}
      </svg>
    </div>
  );
}

function AdvancedDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>בייס — היפוך כיוון ההתניה</p>
      <svg width="100%" viewBox="0 0 300 140" style={{ maxWidth: "100%" }}>
        <rect x={20} y={20} width={260} height={100} rx={12} fill="none" stroke="#64748b" strokeWidth={1} strokeDasharray="4,3" />
        <text x={150} y={14} textAnchor="middle" fill="#64748b" fontSize={10}>\u03A9</text>
        <circle cx={120} cy={70} r={45} fill="rgba(220,38,38,0.06)" stroke="#dc2626" strokeWidth={1.5} />
        <text x={90} y={55} fill="#dc2626" fontSize={12} fontWeight={700}>A</text>
        <circle cx={190} cy={70} r={40} fill="rgba(245,158,11,0.06)" stroke="#f59e0b" strokeWidth={1.5} />
        <text x={210} y={55} fill="#f59e0b" fontSize={12} fontWeight={700}>B</text>
        {/* Intersection */}
        <text x={155} y={78} fill="#a78bfa" fontSize={11} fontWeight={700}>A\u2229B</text>
        {/* Arrow showing Bayes direction */}
        <path d="M 155,100 C 155,130 100,130 100,100" fill="none" stroke="#dc2626" strokeWidth={1.2} strokeDasharray="3,2" />
        <text x={128} y={138} textAnchor="middle" fill="#dc2626" fontSize={9}>P(A|B) ?</text>
      </svg>
    </div>
  );
}

// ─── Prompt helpers (compact) ────────────────────────────────────────────────

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
  return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)"}`, marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)" }}>{passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#dc2626", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><textarea value={text} rows={3} dir="rtl" readOnly={passed} onChange={e => { if (!passed) { setText(e.target.value); setResult(null); } }} placeholder="כתוב פרומפט..." style={{ minHeight: 80, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />{result && <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>ציון</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99 }} /></div></div>}{result && !passed && result.hint && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, padding: 12, fontSize: 12, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>{result.blocked ? "\u26A0\uFE0F" : "\uD83D\uDCA1"} {result.hint}</motion.div>}{passed && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, fontWeight: 600 }}>&#9989; מעולה!</div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק"}</button></motion.div>}{!passed && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: "1px solid rgba(220,38,38,0.35)", color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקה</button>}</div></div>);
}

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) { const [d, setD] = useState<boolean[]>(Array(steps.length).fill(false)); const u = d.filter(Boolean).length + 1; return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => (<div key={i}>{i < u ? (<><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />{!d[i] ? <button onClick={() => setD(p => { const n = [...p]; n[i] = true; return n; })} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>&#10003; סיימתי</button> : <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>&#9989; הושלם</div>}</>) : (<div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}><Lock size={14} color="#6B7280" style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }} /><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} /></div>)}</div>))}</div>); }
function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) { const [p, setP] = useState<boolean[]>(Array(steps.length).fill(false)); return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => <TutorStepMedium key={i} step={s} locked={i > 0 && !p[i - 1]} onPass={() => setP(v => { const n = [...v]; n[i] = true; return n; })} borderRgb={borderRgb} />)}</div>); }
function LadderAdvanced({ steps }: { steps: PromptStep[] }) { const [mp, setMp] = useState(false); const [p, setP] = useState<boolean[]>(Array(steps.length).fill(false)); const idx = mp ? (p.findIndex(v => !v) === -1 ? steps.length : p.findIndex(v => !v)) : -1; return (<div><MasterPromptGate onPass={() => setMp(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["בייס", "מותנית", "חיובי", "שגויה", "רגישות", "שכיחות"]} />{steps.map((s, i) => <TutorStepAdvanced key={i} step={s} locked={!mp || i > idx} onPass={() => setP(v => { const n = [...v]; n[i] = true; return n; })} />)}</div>); }

function ExerciseCard({ ex }: { ex: ExerciseDef }) { const s = STATION[ex.id]; const [cp, setCp] = useState(false); return (<section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", boxShadow: s.glowShadow }}><div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}><span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span><h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2></div><div style={{ height: 1, background: "rgba(60,54,42,0.15)", marginBottom: "2rem" }} /><div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>{ex.diagram}</div><div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.6)", padding: "1.5rem", marginBottom: "2rem" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>&#128221; השאלה</div><button onClick={() => { navigator.clipboard.writeText(ex.problem); setCp(true); setTimeout(() => setCp(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: cp ? "rgba(22,163,74,0.15)" : "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)", color: cp ? "#16a34a" : "#6B7280", fontSize: 11, fontWeight: 600 }}>{cp ? <Check size={11} /> : <Copy size={11} />}{cp ? "הועתק!" : "העתק"}</button></div><pre style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre></div><div style={{ marginBottom: "2rem" }}><div style={{ color: "#dc2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>&#9888;&#65039; שגיאות נפוצות</div>{ex.pitfalls.map((p, i) => <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.25)", background: "rgba(254,226,226,0.25)", padding: "0.85rem 1rem", marginBottom: 8 }}><div style={{ color: "#b91c1c", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>{p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}</div>)}</div><div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.7)", padding: "1.25rem" }}><div style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>&#129504; מדריך הפרומפטים</div>{ex.id === "basic" && <LadderBase steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}{ex.id === "medium" && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}</div>{ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}</section>); }

// ─── Formula Bar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [act, setAct] = useState<"cond" | "bayes" | "total" | "mult" | null>(null);
  const tabs = [
    { id: "cond" as const, label: "מותנית", tex: "P(A|B)", color: "#16A34A", bc: "rgba(22,163,74,0.35)" },
    { id: "bayes" as const, label: "בייס", tex: "P(B|A)=\\cdots", color: "#EA580C", bc: "rgba(234,88,12,0.35)" },
    { id: "total" as const, label: "הסת\u2019 שלמה", tex: "P(A)=\\Sigma", color: "#DC2626", bc: "rgba(220,38,38,0.35)" },
    { id: "mult" as const, label: "כפל", tex: "P(A{\\cap}B)", color: "#7c3aed", bc: "rgba(124,58,237,0.35)" },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>
      <div style={{ display: "flex", gap: 6, marginBottom: act ? 14 : 0 }}>
        {tabs.map(t => { const a = act === t.id; return <button key={t.id} onClick={() => setAct(a ? null : t.id)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${a ? t.bc : "rgba(60,54,42,0.15)"}`, background: a ? `${t.color}15` : "rgba(255,255,255,0.5)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11, fontWeight: 700, color: a ? t.color : "#6B7280" }}>{t.label}</span><span style={{ color: a ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>; })}
      </div>
      {act === "cond" && <motion.div key="cond" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"P(A|B) = \\frac{P(A \\cap B)}{P(B)}"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> ההסתברות ש-A יקרה בהינתן ש-B כבר קרה. המכנה הוא P(B) — צמצום מרחב המדגם לאירוע B בלבד.</div></div></motion.div>}
      {act === "bayes" && <motion.div key="bayes" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"P(B_j|A) = \\frac{P(A|B_j)\\cdot P(B_j)}{\\sum_i P(A|B_i)\\cdot P(B_i)}"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>נוסחת בייס:</strong> "היפוך כיוון ההתניה". ידוע P(A|B) ורוצים P(B|A). המכנה = הסתברות שלמה של A.</div></div></motion.div>}
      {act === "total" && <motion.div key="total" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"P(A) = P(A|B)P(B) + P(A|\\bar{B})P(\\bar{B})"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסתברות שלמה:</strong> P(A) מפורקת לפי חלוקה שלמה של מרחב המדגם. שימושי כשידועים P(A|B) ו-P(A|\u0100B) בנפרד.</div></div></motion.div>}
      {act === "mult" && <motion.div key="mult" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"P(A \\cap B) = P(A|B) \\cdot P(B) = P(B|A) \\cdot P(A)"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>כלל הכפל:</strong> הסתברות חיתוך = מכפלת מותנית ב"בסיס". עובד בשני הכיוונים.</div></div></motion.div>}
    </div>
  );
}

// ─── Exercises ────────────────────────────────────────────────────────────────

const PF = "\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.";
const CW_B: string[] = ["מותנית", "עץ", "ענף", "P(A|B)", "חיתוך", "הסתברות"];
const CW_M: string[] = ["בייס", "הסתברות שלמה", "טבלה", "חיתוך", "מותנית", "שורה"];
const CW_A: string[] = ["בייס", "רגישות", "חיובי שגוי", "שכיחות", "PPV", "בדיקה"];

const exercises: ExerciseDef[] = [
  {
    id: "basic", title: "הסתברות מותנית מעץ",
    problem: "בקופסה 60% כדורים אדומים ו-40% כחולים. שולפים כדור: אם אדום — מטילים מטבע הוגן. אם כחול — מטילים קובייה הוגנת.\n\nא. בנו עץ הסתברות לשני השלבים.\nב. מהי P(עץ במטבע \u2229 כדור אדום)?\nג. מהי P(תוצאה \u22644 | כדור כחול)?",
    diagram: <BasicDiagram />,
    pitfalls: [
      { title: "P(עץ \u2229 אדום) = P(עץ|אדום)\u00B7P(אדום)", text: "= 0.5 \u00B7 0.6 = 0.3. כלל הכפל לאורך הענף!" },
      { title: "P(\u22644 | כחול) = 4/6 = 2/3", text: "בהינתן כחול → קובייה. תוצאות \u22644: {1,2,3,4} מתוך 6." },
      { title: "אל תערבבו בין ענפים", text: "P(עץ) \u2260 P(עץ|אדום) — חייבים לציין את התנאי!" },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי, כיתה יא 5 יחידות.\n60% אדומים → מטבע, 40% כחולים → קובייה.\nצריך: עץ, P(עץ\u2229אדום), P(\u22644|כחול)." + PF,
    steps: [
      { phase: "א", label: "בניית עץ", coaching: "שלב ראשון: צבע, שלב שני: תוצאה", prompt: "60% אדומים → מטבע, 40% כחולים → קובייה. הנחה אותי לבנות עץ הסתברות." + PF, keywords: ["עץ", "ענף"], keywordHint: "ציין עץ", contextWords: CW_B },
      { phase: "ב", label: "P(עץ\u2229אדום)", coaching: "כפל לאורך ענף", prompt: "הנחה אותי לחשב P(עץ במטבע וגם כדור אדום)." + PF, keywords: ["חיתוך", "כפל"], keywordHint: "ציין חיתוך", contextWords: CW_B },
      { phase: "ג", label: "P(\u22644|כחול)", coaching: "מותנית ישירה", prompt: "בהינתן כדור כחול — קובייה. הנחה אותי לחשב P(\u22644|כחול)." + PF, keywords: ["מותנית"], keywordHint: "ציין מותנית", contextWords: CW_B },
    ],
  },
  {
    id: "medium", title: "נוסחת בייס — קווי ייצור",
    problem: "שלושה קווי ייצור: קו A מייצר 50%, קו B — 30%, קו C — 20%.\nאחוז הפגמים: A — 2%, B — 4%, C — 5%.\n\nא. מהי P(פגום)? (הסתברות שלמה)\nב. מוצר נמצא פגום — מהי P(קו A | פגום)? (בייס)\nג. מוצר תקין — מהי P(קו C | תקין)?\nד. מה המשמעות: קו C מייצר 20% אך אחראי לכמה אחוז מהפגמים?",
    diagram: <MediumDiagram />,
    pitfalls: [
      { title: "P(פגום) = 0.5\u00B70.02 + 0.3\u00B70.04 + 0.2\u00B70.05 = 0.032", text: "הסתברות שלמה — סכום שלושה מכפלות." },
      { title: "בייס: P(A|פגום) = P(פגום|A)\u00B7P(A) / P(פגום)", text: "= 0.01/0.032 = 0.3125. המכנה הוא P(פגום) מסעיף א!" },
      { title: "חלקו של C בפגמים: P(C|פגום) = 0.01/0.032 \u2248 31.25%", text: "C מייצר 20% אך אחראי ל-31% מהפגמים — כי שיעור הפגמים שלו גבוה." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי, כיתה יא 5 יחידות.\n3 קווי ייצור: A(50%,2%), B(30%,4%), C(20%,5%).\nצריך: P(פגום), בייס P(A|פגום), P(C|תקין), משמעות." + PF,
    steps: [
      { phase: "א", label: "הסתברות שלמה", coaching: "\u03A3 P(פגום|i)\u00B7P(i)", prompt: "3 קווי ייצור: A(50%,2%), B(30%,4%), C(20%,5%). הנחה אותי לחשב P(פגום)." + PF, keywords: ["שלמה", "סכום"], keywordHint: "ציין הסתברות שלמה", contextWords: CW_M },
      { phase: "ב", label: "בייס — P(A|פגום)", coaching: "מונה/מכנה", prompt: "P(פגום)=0.032. הנחה אותי לחשב P(A|פגום) לפי בייס." + PF, keywords: ["בייס", "היפוך"], keywordHint: "ציין בייס", contextWords: CW_M },
      { phase: "ג", label: "P(C|תקין)", coaching: "תקין = 1\u2212פגום", prompt: "הנחה אותי לחשב P(C|תקין) בעזרת בייס." + PF, keywords: ["תקין", "בייס"], keywordHint: "ציין P(C|תקין)", contextWords: CW_M },
      { phase: "ד", label: "פרשנות", coaching: "שיעור לעומת תרומה", prompt: "הנחה אותי להסביר למה C אחראי ל-31% מהפגמים למרות שמייצר 20%." + PF, keywords: ["משמעות", "תרומה"], keywordHint: "ציין פרשנות", contextWords: CW_M },
    ],
  },
  {
    id: "advanced", title: "פרדוקס בייס — בדיקה רפואית",
    problem: "מחלה נדירה פוגעת ב-0.1% מהאוכלוסייה. בדיקה מזהה 99% מהחולים (רגישות) ונותנת תוצאה חיובית שגויה ל-2% מהבריאים.\n\nא. חשבו P(חיובי) — הסתברות שלמה.\nב. חשבו P(חולה | חיובי) — בייס. מדוע התוצאה מפתיעה?\nג. אם נעשה בדיקה שנייה (עצמאית) לאנשים שיצאו חיוביים — מהי P(חולה | שתי בדיקות חיוביות)?\nד. הסבירו מדוע מספר הבדיקות חשוב כשהמחלה נדירה.",
    diagram: <AdvancedDiagram />,
    pitfalls: [
      { title: "P(חיובי) = 0.99\u00B70.001 + 0.02\u00B70.999 = 0.02097", text: "רוב ה'חיוביים' הם false positives כי הבריאים רבים הרבה יותר." },
      { title: "P(חולה|חיובי) = 0.00099/0.02097 \u2248 4.7%", text: "למרות רגישות 99%! הסיבה: שכיחות המחלה נמוכה מאוד (0.1%)." },
      { title: "בדיקה שנייה: P(חולה|2 חיוביות) גבוהה בהרבה", text: "כעת ה'אוכלוסייה' היא מי שיצא חיובי בראשונה — שכיחות ~4.7%, לא 0.1%." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי, כיתה יא 5 יחידות.\nמחלה 0.1%, רגישות 99%, false positive 2%.\nצריך: P(חיובי), בייס, בדיקה כפולה, פרשנות." + PF,
    steps: [
      { phase: "א", label: "P(חיובי)", coaching: "הסתברות שלמה", prompt: "מחלה 0.1%, רגישות 99%, FP 2%. הנחה אותי לחשב P(חיובי)." + PF, keywords: ["שלמה", "חיובי"], keywordHint: "ציין P(חיובי)", contextWords: CW_A },
      { phase: "ב", label: "בייס", coaching: "P(חולה|חיובי)", prompt: "P(חיובי)=0.02097. הנחה אותי לחשב P(חולה|חיובי) ולהסביר למה נמוך." + PF, keywords: ["בייס", "חולה"], keywordHint: "ציין בייס", contextWords: CW_A },
      { phase: "ג", label: "בדיקה כפולה", coaching: "שכיחות חדשה", prompt: "מי שיצא חיובי פעם ראשונה (4.7% חולים). הנחה אותי לחשב P(חולה|2 חיוביות)." + PF, keywords: ["כפולה", "שכיחות"], keywordHint: "ציין בדיקה כפולה", contextWords: CW_A },
      { phase: "ד", label: "פרשנות", coaching: "הפרדוקס", prompt: "הנחה אותי להסביר מדוע בדיקה אחת לא מספיקה כשהמחלה נדירה." + PF, keywords: ["פרדוקס", "נדירה"], keywordHint: "ציין פרשנות", contextWords: CW_A },
    ],
  },
];

// ─── Lab ──────────────────────────────────────────────────────────────────────

function BayesLab() {
  const [prev, setPrev] = useState(0.01);
  const [sens, setSens] = useState(0.95);
  const [fpr, setFpr] = useState(0.05);

  const pPos = sens * prev + fpr * (1 - prev);
  const ppv = pPos > 0 ? (sens * prev) / pPos : 0;
  const npv = pPos < 1 ? ((1 - fpr) * (1 - prev)) / (1 - pPos) : 0;

  // Visual: stacked bar
  const truePos = sens * prev;
  const falsePos = fpr * (1 - prev);
  const tpW = Math.max(2, (truePos / (truePos + falsePos || 1)) * 260);
  const fpW = 260 - tpW;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>&#128300; מעבדה — פרדוקס בייס</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[{ label: "שכיחות P(D)", val: prev, set: setPrev, min: 0.001, max: 0.2, step: 0.001 }, { label: "רגישות", val: sens, set: setSens, min: 0.5, max: 1, step: 0.01 }, { label: "FP rate", val: fpr, set: setFpr, min: 0.01, max: 0.2, step: 0.01 }].map(s => (
          <div key={s.label}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600, marginBottom: 4 }}><span>{s.label}</span><span>{(s.val * 100).toFixed(1)}%</span></div><input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e => s.set(Number(e.target.value))} style={{ width: "100%" }} /></div>
        ))}
      </div>

      <svg width="100%" viewBox="0 0 300 70" style={{ maxWidth: 400, margin: "0 auto", display: "block" }}>
        <rect x={0} y={0} width={300} height={70} fill="#fafaf5" rx={12} />
        <text x={150} y={16} textAnchor="middle" fill="#6B7280" fontSize={10}>מתוך כל התוצאות החיוביות:</text>
        <rect x={20} y={25} width={tpW} height={28} rx={6} fill="rgba(22,163,74,0.3)" stroke="#16a34a" strokeWidth={1} />
        <text x={20 + tpW / 2} y={43} textAnchor="middle" fill="#15803d" fontSize={9} fontWeight={700}>TP</text>
        <rect x={20 + tpW} y={25} width={fpW} height={28} rx={6} fill="rgba(220,38,38,0.2)" stroke="#dc2626" strokeWidth={1} />
        <text x={20 + tpW + fpW / 2} y={43} textAnchor="middle" fill="#dc2626" fontSize={9} fontWeight={700}>FP</text>
        <text x={150} y={66} textAnchor="middle" fill="#2D3436" fontSize={10} fontWeight={600}>PPV = {(ppv * 100).toFixed(1)}%</text>
      </svg>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 20 }}>
        <div style={{ borderRadius: 12, border: "1px solid rgba(22,163,74,0.2)", background: "rgba(22,163,74,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>P(חיובי)</div><div style={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>{(pPos * 100).toFixed(2)}%</div></div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(234,88,12,0.2)", background: "rgba(234,88,12,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>PPV</div><div style={{ fontSize: 14, fontWeight: 700, color: "#ea580c" }}>{(ppv * 100).toFixed(1)}%</div></div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(124,58,237,0.2)", background: "rgba(124,58,237,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>NPV</div><div style={{ fontSize: 14, fontWeight: 700, color: "#7c3aed" }}>{(npv * 100).toFixed(2)}%</div></div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>FP/חיובי</div><div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>{((1 - ppv) * 100).toFixed(1)}%</div></div>
      </div>
      <p style={{ textAlign: "center", color: "#6B7280", fontSize: 12, marginTop: 14 }}>שנו את השכיחות וראו כיצד ה-PPV משתנה דרמטית</p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConditionalProbPage() {
  const [lvl, setLvl] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === lvl)!;
  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      <style>{`:root { --lvl-rgb: ${STATION[lvl].glowRgb}; }`}</style>
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>הסתברות מותנית ובייס</h1>
          <Link href="/5u/topic/grade11/probability" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none" }}>&#8592; חזרה</Link>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 4rem" }}>
        <SubtopicProgress subtopicId="5u/grade11/probability/conditional" />
        <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
          {TABS.map(t => { const a = lvl === t.id; return <button key={t.id} onClick={() => setLvl(t.id)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${a ? `${t.bg} ${t.textColor} ${t.border} border-2` : "bg-white/60 text-gray-500 border border-transparent"}`} style={a ? { boxShadow: `0 0 12px ${t.glowColor}` } : {}}>{t.label}</button>; })}
        </div>
        <FormulaBar />
        <div style={{ marginBottom: "2rem" }}><ExerciseCard ex={ex} /></div>
        <BayesLab />
        <div style={{ marginTop: "2rem" }}><MarkComplete subtopicId="5u/grade11/probability/conditional" level={lvl} /></div>
      </motion.div>
    </main>
  );
}
