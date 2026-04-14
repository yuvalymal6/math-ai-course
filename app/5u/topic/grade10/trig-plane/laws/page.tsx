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
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>משולש כללי — צלעות וזוויות</p>
      <svg width="100%" viewBox="0 0 300 200" style={{ maxWidth: "100%" }}>
        <polygon points="60,170 240,170 180,40" fill="none" stroke="#16a34a" strokeWidth={2} />
        <text x={170} y={30} fill="#16a34a" fontSize={13} fontWeight={700}>A</text>
        <text x={244} y={180} fill="#16a34a" fontSize={13} fontWeight={700}>B</text>
        <text x={42} y={180} fill="#16a34a" fontSize={13} fontWeight={700}>C</text>
        {/* Side labels */}
        <text x={215} y={100} fill="#f59e0b" fontSize={12} fontWeight={600}>c</text>
        <text x={108} y={100} fill="#f59e0b" fontSize={12} fontWeight={600}>b</text>
        <text x={145} y={186} fill="#f59e0b" fontSize={12} fontWeight={600}>a</text>
        {/* Angle arc at A */}
        <path d="M 172,52 A 12,12 0 0,1 186,56" fill="none" stroke="#16a34a" strokeWidth={1.2} />
      </svg>
    </div>
  );
}

function MediumDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>SAS — שתי צלעות והזווית שביניהן</p>
      <svg width="100%" viewBox="0 0 300 200" style={{ maxWidth: "100%" }}>
        <polygon points="50,170 260,170 140,35" fill="none" stroke="#ea580c" strokeWidth={2} />
        <text x={130} y={26} fill="#ea580c" fontSize={13} fontWeight={700}>P</text>
        <text x={264} y={180} fill="#ea580c" fontSize={13} fontWeight={700}>Q</text>
        <text x={32} y={180} fill="#ea580c" fontSize={13} fontWeight={700}>R</text>
        {/* Known sides highlighted */}
        <line x1={50} y1={170} x2={140} y2={35} stroke="#ea580c" strokeWidth={3} />
        <line x1={140} y1={35} x2={260} y2={170} stroke="#ea580c" strokeWidth={3} />
        {/* Unknown side dashed */}
        <line x1={50} y1={170} x2={260} y2={170} stroke="#64748b" strokeWidth={1.5} strokeDasharray="5,3" />
        {/* Angle arc at P */}
        <path d="M 130,52 A 15,15 0 0,1 150,50" fill="none" stroke="#f59e0b" strokeWidth={2} />
        <text x={136} y={68} fill="#f59e0b" fontSize={10} fontWeight={700}>P</text>
      </svg>
    </div>
  );
}

function AdvancedDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>בעיית מדידה — צופים ומגדל</p>
      <svg width="100%" viewBox="0 0 320 200" style={{ maxWidth: "100%" }}>
        {/* Ground line */}
        <line x1={20} y1={170} x2={300} y2={170} stroke="#cbd5e1" strokeWidth={1} />
        {/* Tower */}
        <line x1={250} y1={170} x2={250} y2={40} stroke="#dc2626" strokeWidth={2} />
        <circle cx={250} cy={38} r={3} fill="#dc2626" />
        <text x={256} y={36} fill="#dc2626" fontSize={11} fontWeight={700}>C</text>
        {/* Observers */}
        <circle cx={60} cy={170} r={4} fill="#dc2626" />
        <text x={52} y={186} fill="#dc2626" fontSize={12} fontWeight={700}>A</text>
        <circle cx={170} cy={170} r={4} fill="#dc2626" />
        <text x={162} y={186} fill="#dc2626" fontSize={12} fontWeight={700}>B</text>
        {/* Lines of sight */}
        <line x1={60} y1={170} x2={250} y2={40} stroke="#dc2626" strokeWidth={1.3} strokeDasharray="5,3" />
        <line x1={170} y1={170} x2={250} y2={40} stroke="#dc2626" strokeWidth={1.3} strokeDasharray="5,3" />
        {/* Baseline label */}
        <text x={108} y={164} fill="#f59e0b" fontSize={11} fontWeight={600}>d</text>
        {/* Angle arcs */}
        <path d="M 76,170 A 16,16 0 0,0 72,158" fill="none" stroke="#a78bfa" strokeWidth={1.5} />
        <text x={80} y={156} fill="#a78bfa" fontSize={9}>\u03B1</text>
        <path d="M 184,170 A 14,14 0 0,0 182,160" fill="none" stroke="#a78bfa" strokeWidth={1.5} />
        <text x={186} y={158} fill="#a78bfa" fontSize={9}>\u03B2</text>
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
  const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי -- כתוב לפחות 20 תווים." }); return; } const res = calculatePromptScore(text, step.contextWords ?? []); setResult(res); if (!res.blocked && res.score >= 75) onPass?.(); };
  if (locked) return (<div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.6)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}><Lock size={14} color="#6B7280" /><div><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span></div></div>);
  const barCol = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";
  return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(22,163,74,0.3)" : `rgba(${borderRgb},0.2)`}` }}>{passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={e => { setText(e.target.value); setResult(null); }} placeholder="נסח כאן את השאלה שלך ל-AI..." style={{ minHeight: 80, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid rgba(${borderRgb},0.25)`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />{result && <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", marginBottom: 4, fontWeight: 600 }}><span>ציון</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: barCol, transition: "width 0.4s" }} /></div></div>}{!result && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקת AI מדומה</button>}{result && result.blocked && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>&#9888;&#65039; {result.hint}</motion.div>}{result && !result.blocked && result.score < 75 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>&#128161; {result.hint}</motion.div>}{passed && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, fontWeight: 600 }}>&#9989; ציון: <strong>{result!.score}/100</strong></div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}</button></motion.div>}{result && !passed && <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#6B7280", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>}</div></div>);
}

function TutorStepAdvanced({ step, locked = false, onPass }: { step: PromptStep; locked?: boolean; onPass?: () => void }) {
  const [text, setText] = useState(""); const [result, setResult] = useState<ScoreResult | null>(null); const [copied, setCopied] = useState(false);
  const passed = result?.score !== undefined && result.score >= 90 && !result.blocked;
  if (locked) return (<div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.6)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}><Lock size={14} color="#6B7280" /><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} -- {step.label}</span></div>);
  const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי." }); return; } const r = calculatePromptScore(text, step.contextWords ?? []); setResult(r); if (!r.blocked && r.score >= 90 && onPass) onPass(); };
  return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)"}`, marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}` }}>{passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#dc2626", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><textarea value={text} rows={3} dir="rtl" readOnly={passed} onChange={e => { if (!passed) { setText(e.target.value); setResult(null); } }} placeholder="כתוב את הפרומפט שלך..." style={{ minHeight: 80, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />{result && <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>ציון</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99, transition: "width 0.4s" }} /></div></div>}{result && !passed && result.hint && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.6, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>{result.blocked ? "\u26A0\uFE0F" : "\uD83D\uDCA1"} {result.hint}</motion.div>}{passed && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, fontWeight: 600 }}>&#9989; ניסוח מעולה!</div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק"}</button></motion.div>}{!passed && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: "1px solid rgba(220,38,38,0.35)", color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקת AI מדומה</button>}</div></div>);
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
  const [mp, setMp] = useState(false); const [passed, setPassed] = useState<boolean[]>(Array(steps.length).fill(false));
  const idx = mp ? (passed.findIndex(p => !p) === -1 ? steps.length : passed.findIndex(p => !p)) : -1;
  return (<div><MasterPromptGate onPass={() => setMp(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["סינוסים", "קוסינוסים", "זווית", "מרחק", "משולש", "גובה"]} />{steps.map((s, i) => <TutorStepAdvanced key={i} step={s} locked={!mp || i > idx} onPass={() => setPassed(p => { const n = [...p]; n[i] = true; return n; })} />)}</div>);
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
  const [act, setAct] = useState<"sin" | "cos" | "area" | "angle" | null>(null);
  const tabs = [
    { id: "sin" as const, label: "סינוסים", tex: "\\frac{a}{\\sin A}=\\frac{b}{\\sin B}", color: "#16A34A", bc: "rgba(22,163,74,0.35)" },
    { id: "cos" as const, label: "קוסינוסים", tex: "a^2=b^2+c^2-2bc\\cos A", color: "#EA580C", bc: "rgba(234,88,12,0.35)" },
    { id: "area" as const, label: "שטח", tex: "S=\\tfrac{1}{2}ab\\sin C", color: "#DC2626", bc: "rgba(220,38,38,0.35)" },
    { id: "angle" as const, label: "מציאת זווית", tex: "\\cos A=\\frac{b^2+c^2-a^2}{2bc}", color: "#7c3aed", bc: "rgba(124,58,237,0.35)" },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>
      <div style={{ display: "flex", gap: 6, marginBottom: act ? 14 : 0 }}>
        {tabs.map(t => { const a = act === t.id; return <button key={t.id} onClick={() => setAct(a ? null : t.id)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${a ? t.bc : "rgba(60,54,42,0.15)"}`, background: a ? `${t.color}15` : "rgba(255,255,255,0.5)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11, fontWeight: 700, color: a ? t.color : "#6B7280" }}>{t.label}</span><span style={{ color: a ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>; })}
      </div>
      {act === "sin" && <motion.div key="sin" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C} = 2R"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> יחס צלע לסינוס הזווית שמולה קבוע בכל משולש. R = רדיוס המעגל החוסם. שימושי כשידועים זווית וצלע מולה + זווית/צלע נוספת.</div></div></motion.div>}
      {act === "cos" && <motion.div key="cos" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"a^2 = b^2 + c^2 - 2bc\\cos A"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> הכללה של משפט פיתגורס למשולש כללי. שימושי כשידועות שתי צלעות והזווית שביניהן (SAS) או שלוש צלעות (SSS).</div></div></motion.div>}
      {act === "area" && <motion.div key="area" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"S = \\frac{1}{2}ab\\sin C"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> שטח משולש = חצי מכפלת שתי צלעות כפול סינוס הזווית שביניהן. הזווית חייבת להיות בין שתי הצלעות!</div></div></motion.div>}
      {act === "angle" && <motion.div key="angle" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"\\cos A = \\frac{b^2 + c^2 - a^2}{2bc}"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> מציאת זווית כשידועות 3 צלעות. אם cosA &gt; 0 → זווית חדה, cosA = 0 → ישרה, cosA &lt; 0 → קהה.</div></div></motion.div>}
    </div>
  );
}

// ─── Exercise data ────────────────────────────────────────────────────────────

const PF = "\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.";
const CW_B: string[] = ["סינוסים", "זווית", "צלע", "סכום", "משולש", "מול"];
const CW_M: string[] = ["קוסינוסים", "צלע", "זווית", "שטח", "גובה", "SAS"];
const CW_A: string[] = ["סינוסים", "מרחק", "זווית הגבהה", "מגדל", "טנגנס", "צופה"];

const exercises: ExerciseDef[] = [
  {
    id: "basic", title: "משפט הסינוסים — ASA",
    problem: "במשולש ABC ידוע: \u2220A = 50\u00B0, \u2220B = 65\u00B0, c = 10 ס\u201Dמ (הצלע AB).\n\n\u05D0. מצאו את הזווית C.\n\u05D1. חשבו את אורך הצלע a (BC) באמצעות משפט הסינוסים.\n\u05D2. חשבו את שטח המשולש.",
    diagram: <BasicDiagram />,
    pitfalls: [
      { title: "סכום זוויות = 180\u00B0", text: "\u2220C = 180\u00B0 \u2212 50\u00B0 \u2212 65\u00B0 = 65\u00B0. חשבו את C לפני הכל!" },
      { title: "c מול \u2220C, a מול \u2220A", text: "a/sinA = c/sinC \u2192 a = c\u00B7sinA/sinC = 10\u00B7sin50\u00B0/sin65\u00B0. ודאו שהצלע מול הזווית." },
      { title: "שטח = \u00BDab\u00B7sinC", text: "הזווית C היא הזווית שבין a ו-b \u2014 לא כל זווית מתאימה!" },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 5 יחידות.\nמשולש ABC: \u2220A=50\u00B0, \u2220B=65\u00B0, c=10.\nצריך: \u2220C, צלע a (סינוסים), שטח." + PF,
    steps: [
      { phase: "\u05D0", label: "זווית C", coaching: "סכום זוויות", prompt: "משולש ABC: \u2220A=50\u00B0, \u2220B=65\u00B0. הנחה אותי למצוא \u2220C." + PF, keywords: ["זווית", "סכום"], keywordHint: "ציין סכום זוויות", contextWords: CW_B },
      { phase: "\u05D1", label: "צלע a", coaching: "סינוסים", prompt: "משולש ABC: \u2220A=50\u00B0, \u2220C=65\u00B0, c=10. הנחה אותי לחשב a." + PF, keywords: ["סינוסים", "צלע"], keywordHint: "ציין סינוסים", contextWords: CW_B },
      { phase: "\u05D2", label: "שטח", coaching: "\u00BDab\u00B7sinC", prompt: "משולש ABC: a ו-c ידועים, \u2220B=65\u00B0. הנחה אותי לחשב שטח." + PF, keywords: ["שטח", "סינוס"], keywordHint: "ציין שטח", contextWords: CW_B },
    ],
  },
  {
    id: "medium", title: "משפט הקוסינוסים — SAS",
    problem: "במשולש PQR ידוע: PQ = 11, PR = 8, \u2220P = 52\u00B0.\n\n\u05D0. חשבו את QR באמצעות משפט הקוסינוסים.\n\u05D1. מצאו את \u2220Q באמצעות משפט הסינוסים.\n\u05D2. חשבו את שטח המשולש.\n\u05D3. חשבו את אורך הגובה מ-P לצלע QR.",
    diagram: <MediumDiagram />,
    pitfalls: [
      { title: "QR\u00B2 = PQ\u00B2 + PR\u00B2 \u2212 2\u00B7PQ\u00B7PR\u00B7cos(\u2220P)", text: "הזווית P היא הזווית שבין PQ ל-PR. הצלע שמולה היא QR." },
      { title: "sin עלול לתת שתי אפשרויות", text: "sin\u2220Q = QR\u00B7... \u2014 אם \u2220Q עלולה להיות קהה, בדקו!" },
      { title: "גובה: S = \u00BD\u00B7QR\u00B7h \u2192 h = 2S/QR", text: "חשבו שטח קודם, אז h = 2S/QR." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 5 יחידות.\nמשולש PQR: PQ=11, PR=8, \u2220P=52\u00B0.\nצריך: QR (קוסינוסים), \u2220Q (סינוסים), שטח, גובה." + PF,
    steps: [
      { phase: "\u05D0", label: "QR", coaching: "קוסינוסים", prompt: "PQ=11, PR=8, \u2220P=52\u00B0. הנחה אותי לחשב QR." + PF, keywords: ["קוסינוסים", "צלע"], keywordHint: "ציין קוסינוסים", contextWords: CW_M },
      { phase: "\u05D1", label: "\u2220Q", coaching: "סינוסים", prompt: "אחרי שמצאתי QR, הנחה אותי למצוא \u2220Q." + PF, keywords: ["סינוסים", "זווית"], keywordHint: "ציין סינוסים", contextWords: CW_M },
      { phase: "\u05D2", label: "שטח", coaching: "\u00BDab\u00B7sinC", prompt: "PQ=11, PR=8, \u2220P=52\u00B0. הנחה אותי לחשב שטח." + PF, keywords: ["שטח"], keywordHint: "ציין שטח", contextWords: CW_M },
      { phase: "\u05D3", label: "גובה", coaching: "h = 2S/QR", prompt: "ידוע שטח ו-QR. הנחה אותי לחשב גובה מ-P ל-QR." + PF, keywords: ["גובה"], keywordHint: "ציין גובה", contextWords: CW_M },
    ],
  },
  {
    id: "advanced", title: "בעיית מדידה — צופים ומגדל",
    problem: "שני צופים A ו-B עומדים במרחק 600 מטר זה מזה. שניהם רואים צמרת מגדל C.\n\u2220CAB = 58\u00B0, \u2220CBA = 74\u00B0.\n\n\u05D0. מצאו את \u2220ACB.\n\u05D1. חשבו את AC (מרחק מצופה A למגדל).\n\u05D2. חשבו את BC.\n\u05D3. אם זווית ההגבהה מנקודה A לצמרת הוא 12\u00B0 \u2014 מהו גובה המגדל?",
    diagram: <AdvancedDiagram />,
    pitfalls: [
      { title: "\u2220ACB = 180\u00B0 \u2212 58\u00B0 \u2212 74\u00B0 = 48\u00B0", text: "AB (600 מ\u2019) מול \u2220ACB \u2014 הצלע הידועה היא מול הזווית הקטנה ביותר." },
      { title: "AC/sin(\u2220CBA) = AB/sin(\u2220ACB)", text: "AC = 600\u00B7sin74\u00B0/sin48\u00B0. ודאו שהזוויות בצד הנכון." },
      { title: "גובה = AC\u00B7tan(12\u00B0)", text: "זווית ההגבהה 12\u00B0 \u2014 הגובה = AC\u00B7tan(12\u00B0), לא sin ולא cos!" },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 5 יחידות.\nצופים A,B במרחק 600 מ\u2019. \u2220CAB=58\u00B0, \u2220CBA=74\u00B0.\nזווית הגבהה מ-A: 12\u00B0.\nצריך: \u2220ACB, AC, BC, גובה מגדל." + PF,
    steps: [
      { phase: "\u05D0", label: "\u2220ACB", coaching: "סכום זוויות", prompt: "\u2220CAB=58\u00B0, \u2220CBA=74\u00B0. הנחה אותי למצוא \u2220ACB." + PF, keywords: ["זווית", "סכום"], keywordHint: "ציין זווית", contextWords: CW_A },
      { phase: "\u05D1", label: "AC", coaching: "סינוסים", prompt: "AB=600, \u2220CBA=74\u00B0, \u2220ACB=48\u00B0. הנחה אותי לחשב AC." + PF, keywords: ["סינוסים", "מרחק"], keywordHint: "ציין AC", contextWords: CW_A },
      { phase: "\u05D2", label: "BC", coaching: "סינוסים", prompt: "AB=600, \u2220CAB=58\u00B0, \u2220ACB=48\u00B0. הנחה אותי לחשב BC." + PF, keywords: ["סינוסים", "BC"], keywordHint: "ציין BC", contextWords: CW_A },
      { phase: "\u05D3", label: "גובה המגדל", coaching: "tan(12\u00B0)", prompt: "AC ידוע, זווית הגבהה 12\u00B0. הנחה אותי לחשב גובה המגדל." + PF, keywords: ["גובה", "טנגנס"], keywordHint: "ציין גובה", contextWords: CW_A },
    ],
  },
];

// ─── Lab ──────────────────────────────────────────────────────────────────────

function TrigLab() {
  const [a, setA] = useState(7);
  const [b, setB] = useState(10);
  const [C, setC] = useState(60);

  const Crad = (C * Math.PI) / 180;
  const c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(Crad));
  const area = 0.5 * a * b * Math.sin(Crad);
  const cosA = c > 0 ? (b * b + c * c - a * a) / (2 * b * c) : 0;
  const Adeg = (Math.acos(Math.max(-1, Math.min(1, cosA))) * 180) / Math.PI;
  const Bdeg = 180 - Adeg - C;

  // Triangle SVG coords
  const cx2 = 150, cy2 = 180;
  const scale = 10;
  const Bx = cx2 + b * scale, By = cy2;
  const Ax = cx2 + a * scale * Math.cos(Crad), Ay = cy2 - a * scale * Math.sin(Crad);

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>&#128300; מעבדה אינטראקטיבית</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[{ label: "צלע a", val: a, set: setA, min: 2, max: 15, step: 0.5 }, { label: "צלע b", val: b, set: setB, min: 2, max: 15, step: 0.5 }, { label: "זווית C", val: C, set: setC, min: 10, max: 170, step: 1 }].map(s => (
          <div key={s.label}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#2D3436", fontWeight: 600, marginBottom: 4 }}><span>{s.label}</span><span>{s.val}{s.label.includes("זווית") ? "\u00B0" : ""}</span></div><input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e => s.set(Number(e.target.value))} style={{ width: "100%" }} /></div>
        ))}
      </div>
      <svg width="100%" viewBox="0 0 340 220" style={{ maxWidth: 420, margin: "0 auto", display: "block" }}>
        <rect x={0} y={0} width={340} height={220} fill="#fafaf5" rx={12} />
        <polygon points={`${cx2},${cy2} ${Bx},${By} ${Ax},${Ay}`} fill="rgba(22,163,74,0.06)" stroke="#16a34a" strokeWidth={2} />
        <circle cx={cx2} cy={cy2} r={3} fill="#16a34a" />
        <circle cx={Bx} cy={By} r={3} fill="#16a34a" />
        <circle cx={Ax} cy={Ay} r={3} fill="#16a34a" />
        <text x={cx2 - 10} y={cy2 + 16} fill="#16a34a" fontSize={12} fontWeight={700}>C</text>
        <text x={Bx + 4} y={By + 16} fill="#16a34a" fontSize={12} fontWeight={700}>B</text>
        <text x={Ax - 4} y={Ay - 8} fill="#16a34a" fontSize={12} fontWeight={700}>A</text>
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 20 }}>
        <div style={{ borderRadius: 12, border: "1px solid rgba(22,163,74,0.2)", background: "rgba(22,163,74,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>צלע c</div><div style={{ fontSize: 15, fontWeight: 700, color: "#16a34a" }}>{c.toFixed(2)}</div></div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(234,88,12,0.2)", background: "rgba(234,88,12,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>שטח</div><div style={{ fontSize: 15, fontWeight: 700, color: "#ea580c" }}>{area.toFixed(2)}</div></div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>\u2220A</div><div style={{ fontSize: 15, fontWeight: 700, color: "#dc2626" }}>{Adeg.toFixed(1)}\u00B0</div></div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(124,58,237,0.2)", background: "rgba(124,58,237,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>\u2220B</div><div style={{ fontSize: 15, fontWeight: 700, color: "#7c3aed" }}>{Bdeg.toFixed(1)}\u00B0</div></div>
      </div>
      <p style={{ textAlign: "center", color: "#6B7280", fontSize: 12, marginTop: 14 }}>שנו את הצלעות והזווית וראו כיצד המשולש משתנה</p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrigLawsPage() {
  const [lvl, setLvl] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === lvl)!;
  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      <style>{`:root { --lvl-rgb: ${STATION[lvl].glowRgb}; }`}</style>
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>משפט הסינוסים והקוסינוסים</h1>
          <Link href="/5u/topic/grade10/trig-plane" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none" }}>&#8592; חזרה</Link>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 4rem" }}>
        <SubtopicProgress subtopicId="5u/grade10/trig-plane/laws" />
        <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
          {TABS.map(t => { const a = lvl === t.id; return <button key={t.id} onClick={() => setLvl(t.id)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${a ? `${t.bg} ${t.textColor} ${t.border} border-2` : "bg-white/60 text-gray-500 border border-transparent"}`} style={a ? { boxShadow: `0 0 12px ${t.glowColor}` } : {}}>{t.label}</button>; })}
        </div>
        <FormulaBar />
        <div style={{ marginBottom: "2rem" }}><ExerciseCard ex={ex} /></div>
        <TrigLab />
        <div style={{ marginTop: "2rem" }}><MarkComplete subtopicId="5u/grade10/trig-plane/laws" level={lvl} /></div>
      </motion.div>
    </main>
  );
}
