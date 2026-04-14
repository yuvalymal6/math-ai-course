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
  basic: { stationName: "תחנה ראשונה", badge: "מתחיל", badgeCls: "bg-green-600 text-white", accentCls: "text-green-700", glowBorder: "rgba(22,163,74,0.35)", glowShadow: "0 4px 16px rgba(22,163,74,0.12)", glowRgb: "22,163,74", accentColor: "#16A34A", borderRgb: "45,90,39" },
  medium: { stationName: "תחנה שנייה", badge: "בינוני", badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700", glowBorder: "rgba(234,88,12,0.35)", glowShadow: "0 4px 16px rgba(234,88,12,0.12)", glowRgb: "234,88,12", accentColor: "#EA580C", borderRgb: "163,79,38" },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם", badgeCls: "bg-red-700 text-white", accentCls: "text-red-700", glowBorder: "rgba(220,38,38,0.35)", glowShadow: "0 4px 16px rgba(220,38,38,0.12)", glowRgb: "220,38,38", accentColor: "#DC2626", borderRgb: "139,38,53" },
} as const;

const TABS = [
  { id: "basic" as const, label: "מתחיל", textColor: "text-green-700", border: "border-green-600", bg: "bg-green-600/10", glowColor: "rgba(22,163,74,0.3)" },
  { id: "medium" as const, label: "בינוני", textColor: "text-orange-700", border: "border-orange-600", bg: "bg-orange-600/10", glowColor: "rgba(234,88,12,0.3)" },
  { id: "advanced" as const, label: "מתקדם", textColor: "text-red-700", border: "border-red-700", bg: "bg-red-700/10", glowColor: "rgba(220,38,38,0.3)" },
];

// ─── SVG ─────────────────────────────────────────────────────────────────────

function BasicDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>מספר מרוכב במישור — r ו-\u03B8</p>
      <svg width="100%" viewBox="0 0 260 200" style={{ maxWidth: "100%" }}>
        <line x1={30} y1={140} x2={240} y2={140} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={80} y1={190} x2={80} y2={20} stroke="#cbd5e1" strokeWidth={1} />
        <text x={244} y={144} fill="#94a3b8" fontSize={10}>Re</text>
        <text x={74} y={16} fill="#94a3b8" fontSize={10}>Im</text>
        <line x1={80} y1={140} x2={190} y2={60} stroke="#16a34a" strokeWidth={2} />
        <circle cx={190} cy={60} r={4} fill="#16a34a" />
        <text x={196} y={56} fill="#16a34a" fontSize={11} fontWeight={700}>z</text>
        <path d="M 100,140 A 22,22 0 0,0 96,126" fill="none" stroke="#f59e0b" strokeWidth={1.8} />
        <text x={106} y={128} fill="#f59e0b" fontSize={10} fontWeight={700}>\u03B8</text>
        <text x={128} y={106} fill="#a78bfa" fontSize={10} fontWeight={600}>r</text>
      </svg>
    </div>
  );
}

function MediumDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>כפל מרוכבים — חיבור זוויות</p>
      <svg width="100%" viewBox="0 0 260 200" style={{ maxWidth: "100%" }}>
        <line x1={30} y1={140} x2={240} y2={140} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={80} y1={190} x2={80} y2={20} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={80} y1={140} x2={170} y2={90} stroke="#ea580c" strokeWidth={1.5} />
        <circle cx={170} cy={90} r={3} fill="#ea580c" />
        <text x={176} y={86} fill="#ea580c" fontSize={10} fontWeight={700}>z\u2081</text>
        <line x1={80} y1={140} x2={140} y2={60} stroke="#f59e0b" strokeWidth={1.5} />
        <circle cx={140} cy={60} r={3} fill="#f59e0b" />
        <text x={146} y={56} fill="#f59e0b" fontSize={10} fontWeight={700}>z\u2082</text>
        <line x1={80} y1={140} x2={120} y2={30} stroke="#a78bfa" strokeWidth={2} strokeDasharray="5,3" />
        <circle cx={120} cy={30} r={4} fill="#a78bfa" />
        <text x={126} y={26} fill="#a78bfa" fontSize={10} fontWeight={700}>z\u2081z\u2082</text>
      </svg>
    </div>
  );
}

function AdvancedDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>דה-מואבר — שורשי יחידה</p>
      <svg width="100%" viewBox="0 0 260 220" style={{ maxWidth: "100%" }}>
        <line x1={20} y1={110} x2={240} y2={110} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={130} y1={210} x2={130} y2={10} stroke="#cbd5e1" strokeWidth={1} />
        <circle cx={130} cy={110} r={70} fill="none" stroke="#64748b" strokeWidth={1} strokeDasharray="4,3" />
        {[0, 1, 2, 3, 4].map(k => {
          const ang = (2 * Math.PI * k) / 5;
          const px = 130 + 70 * Math.cos(ang);
          const py = 110 - 70 * Math.sin(ang);
          return <circle key={k} cx={px} cy={py} r={4} fill="#dc2626" />;
        })}
        <text x={206} y={106} fill="#dc2626" fontSize={10} fontWeight={700}>\u03C9\u2080</text>
        <text x={160} y={42} fill="#dc2626" fontSize={10}>\u03C9\u2081</text>
        <text x={70} y={42} fill="#dc2626" fontSize={10}>\u03C9\u2082</text>
        <text x={56} y={160} fill="#dc2626" fontSize={10}>\u03C9\u2083</text>
        <text x={160} y={168} fill="#dc2626" fontSize={10}>\u03C9\u2084</text>
      </svg>
    </div>
  );
}

// ─── Helpers (compact — same as all pages) ───────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט", accentRgb = "22,163,74" }: { text: string; label?: string; accentRgb?: string }) { const [c, setC] = useState(false); return (<button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.8)", border: `1.5px solid rgba(${accentRgb},0.4)`, color: `rgb(${accentRgb})`, fontSize: 12, fontWeight: 600 }}>{c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}</button>); }
function GoldenPromptCard({ prompt, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { prompt: string; glowRgb?: string; borderRgb?: string }) { return (<div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15)` }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ fontSize: 14 }}>&#10024;</span><span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>פרומפט ראשי</span></div><p style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p><CopyBtn text={prompt} label="העתק פרומפט מלא" accentRgb={glowRgb} /></div>); }
function TutorStepBasic({ step, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) { return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(${glowRgb},0.45)`, marginBottom: 8, boxShadow: `0 0 14px rgba(${glowRgb},0.18)` }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}><span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><div><div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>&#9997;&#65039; הפרומפט המוכן</div><div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div></div><CopyBtn text={step.prompt} label="העתק פרומפט ממוקד" accentRgb={glowRgb} /></div></div>); }
function TutorStepMedium({ step, locked = false, onPass, borderRgb = "45,90,39" }: { step: PromptStep; locked?: boolean; onPass?: () => void; borderRgb?: string }) { const [text, setText] = useState(""); const [result, setResult] = useState<ScoreResult | null>(null); const [copied, setCopied] = useState(false); const passed = !!(result && !result.blocked && result.score >= 75); const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "קצר מדי." }); return; } const res = calculatePromptScore(text, step.contextWords ?? []); setResult(res); if (!res.blocked && res.score >= 75) onPass?.(); }; if (locked) return (<div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.6)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}><Lock size={14} color="#6B7280" /><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span></div>); const bc = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626"; return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)" }}>{passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={e => { setText(e.target.value); setResult(null); }} placeholder="נסח כאן..." style={{ minHeight: 80, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid rgba(${borderRgb},0.25)`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />{result && <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>ציון</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: bc }} /></div></div>}{!result && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקה</button>}{result && result.blocked && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12 }}>&#9888;&#65039; {result.hint}</motion.div>}{result && !result.blocked && result.score < 75 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12 }}>&#128161; {result.hint}</motion.div>}{passed && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, fontWeight: 600 }}>&#9989; ציון: <strong>{result!.score}/100</strong></div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק"}</button></motion.div>}{result && !passed && <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#6B7280", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>}</div></div>); }
function TutorStepAdvanced({ step, locked = false, onPass }: { step: PromptStep; locked?: boolean; onPass?: () => void }) { const [text, setText] = useState(""); const [result, setResult] = useState<ScoreResult | null>(null); const [copied, setCopied] = useState(false); const passed = result?.score !== undefined && result.score >= 90 && !result.blocked; if (locked) return (<div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.6)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}><Lock size={14} color="#6B7280" /><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} -- {step.label}</span></div>); const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "קצר מדי." }); return; } const r = calculatePromptScore(text, step.contextWords ?? []); setResult(r); if (!r.blocked && r.score >= 90 && onPass) onPass(); }; return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)"}`, marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)" }}>{passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#dc2626", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><textarea value={text} rows={3} dir="rtl" readOnly={passed} onChange={e => { if (!passed) { setText(e.target.value); setResult(null); } }} placeholder="כתוב פרומפט..." style={{ minHeight: 80, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />{result && <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>ציון</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99 }} /></div></div>}{result && !passed && result.hint && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, padding: 12, fontSize: 12, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>{result.blocked ? "\u26A0\uFE0F" : "\uD83D\uDCA1"} {result.hint}</motion.div>}{passed && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, fontWeight: 600 }}>&#9989; מעולה!</div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק"}</button></motion.div>}{!passed && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: "1px solid rgba(220,38,38,0.35)", color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקה</button>}</div></div>); }

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) { const [d, setD] = useState<boolean[]>(Array(steps.length).fill(false)); const u = d.filter(Boolean).length + 1; return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => (<div key={i}>{i < u ? (<><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />{!d[i] ? <button onClick={() => setD(p => { const n = [...p]; n[i] = true; return n; })} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>&#10003; סיימתי</button> : <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>&#9989; הושלם</div>}</>) : (<div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}><Lock size={14} color="#6B7280" style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }} /><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} /></div>)}</div>))}</div>); }
function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) { const [p, setP] = useState<boolean[]>(Array(steps.length).fill(false)); return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => <TutorStepMedium key={i} step={s} locked={i > 0 && !p[i - 1]} onPass={() => setP(v => { const n = [...v]; n[i] = true; return n; })} borderRgb={borderRgb} />)}</div>); }
function LadderAdvanced({ steps }: { steps: PromptStep[] }) { const [mp, setMp] = useState(false); const [p, setP] = useState<boolean[]>(Array(steps.length).fill(false)); const idx = mp ? (p.findIndex(v => !v) === -1 ? steps.length : p.findIndex(v => !v)) : -1; return (<div><MasterPromptGate onPass={() => setMp(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["מרוכב", "דה-מואבר", "שורש", "טריגונומטרי", "זווית", "חזקה"]} />{steps.map((s, i) => <TutorStepAdvanced key={i} step={s} locked={!mp || i > idx} onPass={() => setP(v => { const n = [...v]; n[i] = true; return n; })} />)}</div>); }

function ExerciseCard({ ex }: { ex: ExerciseDef }) { const s = STATION[ex.id]; const [cp, setCp] = useState(false); return (<section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", boxShadow: s.glowShadow }}><div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}><span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span><h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2></div><div style={{ height: 1, background: "rgba(60,54,42,0.15)", marginBottom: "2rem" }} /><div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>{ex.diagram}</div><div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.6)", padding: "1.5rem", marginBottom: "2rem" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>&#128221; השאלה</div><button onClick={() => { navigator.clipboard.writeText(ex.problem); setCp(true); setTimeout(() => setCp(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: cp ? "rgba(22,163,74,0.15)" : "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)", color: cp ? "#16a34a" : "#6B7280", fontSize: 11, fontWeight: 600 }}>{cp ? <Check size={11} /> : <Copy size={11} />}{cp ? "הועתק!" : "העתק"}</button></div><pre style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre></div><div style={{ marginBottom: "2rem" }}><div style={{ color: "#dc2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>&#9888;&#65039; שגיאות נפוצות</div>{ex.pitfalls.map((p, i) => <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.25)", background: "rgba(254,226,226,0.25)", padding: "0.85rem 1rem", marginBottom: 8 }}><div style={{ color: "#b91c1c", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>{p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}</div>)}</div><div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.7)", padding: "1.25rem" }}><div style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>&#129504; מדריך הפרומפטים</div>{ex.id === "basic" && <LadderBase steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}{ex.id === "medium" && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}</div>{ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}</section>); }

// ─── Formula Bar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [act, setAct] = useState<"trig" | "mult" | "demoivre" | "roots" | null>(null);
  const tabs = [
    { id: "trig" as const, label: "צורה טריגו", tex: "r(\\cos\\theta+i\\sin\\theta)", color: "#16A34A", bc: "rgba(22,163,74,0.35)" },
    { id: "mult" as const, label: "כפל", tex: "r_1 r_2\\,\\text{cis}(\\theta_1{+}\\theta_2)", color: "#EA580C", bc: "rgba(234,88,12,0.35)" },
    { id: "demoivre" as const, label: "דה-מואבר", tex: "z^n=r^n\\text{cis}(n\\theta)", color: "#DC2626", bc: "rgba(220,38,38,0.35)" },
    { id: "roots" as const, label: "שורשים", tex: "\\sqrt[n]{r}\\,\\text{cis}\\frac{\\theta+2k\\pi}{n}", color: "#7c3aed", bc: "rgba(124,58,237,0.35)" },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>
      <div style={{ display: "flex", gap: 6, marginBottom: act ? 14 : 0 }}>
        {tabs.map(t => { const a = act === t.id; return <button key={t.id} onClick={() => setAct(a ? null : t.id)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${a ? t.bc : "rgba(60,54,42,0.15)"}`, background: a ? `${t.color}15` : "rgba(255,255,255,0.5)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><span style={{ fontSize: 10, fontWeight: 700, color: a ? t.color : "#6B7280" }}>{t.label}</span><span style={{ color: a ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>; })}
      </div>
      {act === "trig" && <motion.div key="trig" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"z = r(\\cos\\theta + i\\sin\\theta) = r\\,\\text{cis}\\,\\theta"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> r = |z| (מודול), \u03B8 = arg(z) (ארגומנט). המרה: r = \u221A(a\u00B2+b\u00B2), \u03B8 = arctan(b/a). חזרה: a = r\u00B7cos\u03B8, b = r\u00B7sin\u03B8.</div></div></motion.div>}
      {act === "mult" && <motion.div key="mult" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"z_1 \\cdot z_2 = r_1 r_2 \\,\\text{cis}(\\theta_1 + \\theta_2)"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>הסבר:</strong> כפל מרוכבים = כפל מודולים + חיבור ארגומנטים. חילוק = חילוק מודולים + חיסור ארגומנטים.</div></div></motion.div>}
      {act === "demoivre" && <motion.div key="demoivre" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"z^n = r^n(\\cos n\\theta + i\\sin n\\theta)"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>משפט דה-מואבר:</strong> העלאה בחזקה n = העלאת המודול בחזקה n + הכפלת הארגומנט ב-n.</div></div></motion.div>}
      {act === "roots" && <motion.div key="roots" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"w_k = \\sqrt[n]{r}\\,\\text{cis}\\frac{\\theta + 2k\\pi}{n},\\quad k=0,1,\\ldots,n{-}1"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>שורשים:</strong> ל-z\u207F = w יש n שורשים שונים, מפוזרים באופן שווה על מעגל ברדיוס \u207F\u221Ar. שורשי יחידה: z\u207F = 1 \u2192 n נקודות על מעגל היחידה.</div></div></motion.div>}
    </div>
  );
}

// ─── Exercises ────────────────────────────────────────────────────────────────

const PF = "\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.";
const CW_B: string[] = ["מרוכב", "מודול", "ארגומנט", "טריגונומטרי", "cos", "sin"];
const CW_M: string[] = ["כפל", "חילוק", "ארגומנט", "מודול", "cis", "זווית"];
const CW_A: string[] = ["דה-מואבר", "שורש", "חזקה", "יחידה", "מעגל", "ארגומנט"];

const exercises: ExerciseDef[] = [
  {
    id: "basic", title: "המרה לצורה טריגונומטרית",
    problem: "נתון z = 1 + \u221A3\u00B7i.\n\nא. חשבו את |z| (המודול).\nב. מצאו את arg(z) (הארגומנט).\nג. כתבו את z בצורה טריגונומטרית.",
    diagram: <BasicDiagram />,
    pitfalls: [
      { title: "|z| = \u221A(1\u00B2 + (\u221A3)\u00B2) = \u221A4 = 2", text: "אל תשכחו: (\u221A3)\u00B2 = 3, לא \u221A3." },
      { title: "\u03B8 = arctan(\u221A3/1) = 60\u00B0 = \u03C0/3", text: "בדקו את הרביע! כאן a>0 ו-b>0 \u2192 רביע ראשון \u2713." },
      { title: "z = 2(cos60\u00B0 + i\u00B7sin60\u00B0) = 2cis(\u03C0/3)", text: "ודאו: 2cos60\u00B0 = 1 ✓, 2sin60\u00B0 = \u221A3 ✓." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי, כיתה יב 5 יחידות.\nz = 1 + \u221A3\u00B7i.\nצריך: מודול, ארגומנט, צורה טריגונומטרית." + PF,
    steps: [
      { phase: "א", label: "מודול", coaching: "\u221A(a\u00B2+b\u00B2)", prompt: "z = 1+\u221A3i. הנחה אותי לחשב |z|." + PF, keywords: ["מודול", "שורש"], keywordHint: "ציין מודול", contextWords: CW_B },
      { phase: "ב", label: "ארגומנט", coaching: "arctan(b/a) + בדיקת רביע", prompt: "z = 1+\u221A3i, |z|=2. הנחה אותי למצוא arg(z)." + PF, keywords: ["ארגומנט", "זווית"], keywordHint: "ציין ארגומנט", contextWords: CW_B },
      { phase: "ג", label: "צורה טריגו", coaching: "r\u00B7cis(\u03B8)", prompt: "|z|=2, arg=\u03C0/3. הנחה אותי לכתוב בצורה טריגונומטרית." + PF, keywords: ["טריגונומטרי", "cis"], keywordHint: "ציין צורה", contextWords: CW_B },
    ],
  },
  {
    id: "medium", title: "כפל, חילוק וחזקה",
    problem: "נתונים z\u2081 = 2cis(30\u00B0) ו-z\u2082 = 3cis(45\u00B0).\n\nא. חשבו z\u2081\u00B7z\u2082 בצורה טריגונומטרית.\nב. חשבו z\u2081/z\u2082.\nג. חשבו z\u2081\u2074 (דה-מואבר).\nד. המירו את z\u2081\u2074 לצורה אלגברית a+bi.",
    diagram: <MediumDiagram />,
    pitfalls: [
      { title: "z\u2081\u00B7z\u2082 = 6cis(75\u00B0)", text: "כפל מודולים: 2\u00B73=6, חיבור זוויות: 30\u00B0+45\u00B0=75\u00B0." },
      { title: "z\u2081/z\u2082 = (2/3)cis(\u221215\u00B0)", text: "חילוק מודולים: 2/3, חיסור זוויות: 30\u00B0\u221245\u00B0=\u221215\u00B0." },
      { title: "z\u2081\u2074 = 2\u2074\u00B7cis(4\u00B730\u00B0) = 16cis(120\u00B0)", text: "120\u00B0: cos120\u00B0=\u22121/2, sin120\u00B0=\u221A3/2 \u2192 z\u2081\u2074 = \u22128+8\u221A3i." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי, כיתה יב 5 יחידות.\nz\u2081=2cis30\u00B0, z\u2082=3cis45\u00B0.\nצריך: כפל, חילוק, z\u2081\u2074, המרה לאלגברית." + PF,
    steps: [
      { phase: "א", label: "כפל", coaching: "r\u2081r\u2082 cis(\u03B8\u2081+\u03B8\u2082)", prompt: "z\u2081=2cis30\u00B0, z\u2082=3cis45\u00B0. הנחה אותי לחשב z\u2081\u00B7z\u2082." + PF, keywords: ["כפל", "חיבור זוויות"], keywordHint: "ציין כפל", contextWords: CW_M },
      { phase: "ב", label: "חילוק", coaching: "r\u2081/r\u2082 cis(\u03B8\u2081\u2212\u03B8\u2082)", prompt: "הנחה אותי לחשב z\u2081/z\u2082." + PF, keywords: ["חילוק", "חיסור"], keywordHint: "ציין חילוק", contextWords: CW_M },
      { phase: "ג", label: "חזקה", coaching: "דה-מואבר", prompt: "z\u2081=2cis30\u00B0. הנחה אותי לחשב z\u2081\u2074." + PF, keywords: ["דה-מואבר", "חזקה"], keywordHint: "ציין חזקה", contextWords: CW_M },
      { phase: "ד", label: "המרה לאלגברית", coaching: "a=r\u00B7cos, b=r\u00B7sin", prompt: "z\u2081\u2074 = 16cis120\u00B0. הנחה אותי להמיר ל-a+bi." + PF, keywords: ["אלגברית", "המרה"], keywordHint: "ציין המרה", contextWords: CW_M },
    ],
  },
  {
    id: "advanced", title: "שורשי יחידה ודה-מואבר",
    problem: "מצאו את כל השורשים של z\u2075 = 1 (שורשי יחידה מסדר 5).\n\nא. כתבו את 1 בצורה טריגונומטרית.\nב. מצאו את כל 5 השורשים בצורה טריגונומטרית.\nג. שרטטו את השורשים על מעגל היחידה.\nד. הראו ש-\u03C9\u00B2 + \u03C9\u2074 = \u22121 \u2212 \u03C9 \u2212 \u03C9\u00B3 (כש-\u03C9 = cis(2\u03C0/5)).",
    diagram: <AdvancedDiagram />,
    pitfalls: [
      { title: "1 = 1\u00B7cis(0) = cis(2k\u03C0) לכל k שלם", text: "חייבים להוסיף 2k\u03C0 כדי לקבל את כל השורשים." },
      { title: "\u03C9\u2096 = cis(2k\u03C0/5), k=0,1,2,3,4", text: "5 שורשים, מפוזרים שווה על מעגל היחידה. \u03C9\u2080=1." },
      { title: "\u03C9\u2070+\u03C9\u00B9+\u03C9\u00B2+\u03C9\u00B3+\u03C9\u2074 = 0", text: "סכום כל שורשי היחידה = 0. מכאן: \u03C9\u00B2+\u03C9\u2074 = \u22121\u2212\u03C9\u2212\u03C9\u00B3." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי, כיתה יב 5 יחידות.\nz\u2075 = 1.\nצריך: צורה טריגונומטרית של 1, כל 5 שורשים, שרטוט, זהות סכום." + PF,
    steps: [
      { phase: "א", label: "1 בטריגו", coaching: "cis(0+2k\u03C0)", prompt: "כתבו 1 בצורה טריגונומטרית. הנחה אותי." + PF, keywords: ["טריגונומטרי", "cis"], keywordHint: "ציין צורה של 1", contextWords: CW_A },
      { phase: "ב", label: "5 שורשים", coaching: "cis(2k\u03C0/5)", prompt: "z\u2075=cis(2k\u03C0). הנחה אותי למצוא כל 5 שורשים." + PF, keywords: ["שורש", "k"], keywordHint: "ציין שורשים", contextWords: CW_A },
      { phase: "ג", label: "שרטוט", coaching: "5 נקודות על מעגל היחידה", prompt: "הנחה אותי לשרטט 5 שורשי יחידה על מעגל." + PF, keywords: ["מעגל", "שרטוט"], keywordHint: "ציין שרטוט", contextWords: CW_A },
      { phase: "ד", label: "זהות סכום", coaching: "\u03A3\u03C9\u1D4F = 0", prompt: "סכום שורשי יחידה = 0. הנחה אותי להוכיח \u03C9\u00B2+\u03C9\u2074 = \u22121\u2212\u03C9\u2212\u03C9\u00B3." + PF, keywords: ["סכום", "אפס"], keywordHint: "ציין זהות", contextWords: CW_A },
    ],
  },
];

// ─── Lab ──────────────────────────────────────────────────────────────────────

function ComplexLab() {
  const [r, setR] = useState(2);
  const [theta, setTheta] = useState(60);
  const [n, setN] = useState(3);

  const tRad = (theta * Math.PI) / 180;
  const re = r * Math.cos(tRad);
  const im = r * Math.sin(tRad);
  const rn = Math.pow(r, n);
  const nTheta = n * theta;
  const nThetaMod = ((nTheta % 360) + 360) % 360;
  const nRad = (nThetaMod * Math.PI) / 180;
  const reN = rn * Math.cos(nRad);
  const imN = rn * Math.sin(nRad);

  const cx = 150, cy = 110, sc = 28;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>&#128300; מעבדה — צורה טריגונומטרית ודה-מואבר</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600, marginBottom: 4 }}><span>r (מודול)</span><span>{r}</span></div><input type="range" min={0.5} max={5} step={0.5} value={r} onChange={e => setR(Number(e.target.value))} style={{ width: "100%" }} /></div>
        <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600, marginBottom: 4 }}><span>\u03B8 (מעלות)</span><span>{theta}\u00B0</span></div><input type="range" min={0} max={360} step={5} value={theta} onChange={e => setTheta(Number(e.target.value))} style={{ width: "100%" }} /></div>
        <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600, marginBottom: 4 }}><span>n (חזקה)</span><span>{n}</span></div><input type="range" min={1} max={8} step={1} value={n} onChange={e => setN(Number(e.target.value))} style={{ width: "100%" }} /></div>
      </div>
      <svg width="100%" viewBox="0 0 300 220" style={{ maxWidth: 400, margin: "0 auto", display: "block" }}>
        <rect x={0} y={0} width={300} height={220} fill="#fafaf5" rx={12} />
        <line x1={cx} y1={10} x2={cx} y2={210} stroke="#94a3b8" strokeWidth={0.7} />
        <line x1={10} y1={cy} x2={290} y2={cy} stroke="#94a3b8" strokeWidth={0.7} />
        <circle cx={cx} cy={cy} r={r * sc} fill="none" stroke="#cbd5e1" strokeWidth={0.7} strokeDasharray="3,3" />
        {/* z */}
        <line x1={cx} y1={cy} x2={cx + re * sc} y2={cy - im * sc} stroke="#16a34a" strokeWidth={2} />
        <circle cx={cx + re * sc} cy={cy - im * sc} r={4} fill="#16a34a" />
        <text x={cx + re * sc + 6} y={cy - im * sc - 4} fill="#16a34a" fontSize={10} fontWeight={700}>z</text>
        {/* z^n (if fits) */}
        {rn * sc < 140 && <>
          <circle cx={cx} cy={cy} r={rn * sc} fill="none" stroke="#f59e0b" strokeWidth={0.5} strokeDasharray="2,3" />
          <line x1={cx} y1={cy} x2={cx + reN / rn * rn * sc} y2={cy - imN / rn * rn * sc} stroke="#dc2626" strokeWidth={2} />
          <circle cx={cx + reN / rn * rn * sc} cy={cy - imN / rn * rn * sc} r={4} fill="#dc2626" />
          <text x={cx + reN / rn * rn * sc + 6} y={cy - imN / rn * rn * sc - 4} fill="#dc2626" fontSize={10} fontWeight={700}>z\u207F</text>
        </>}
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 20 }}>
        <div style={{ borderRadius: 12, border: "1px solid rgba(22,163,74,0.2)", background: "rgba(22,163,74,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>z</div><div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>{re.toFixed(2)}+{im.toFixed(2)}i</div></div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>z\u207F</div><div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>{reN.toFixed(1)}+{imN.toFixed(1)}i</div></div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(234,88,12,0.2)", background: "rgba(234,88,12,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>|z\u207F|</div><div style={{ fontSize: 14, fontWeight: 700, color: "#ea580c" }}>{rn.toFixed(2)}</div></div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(124,58,237,0.2)", background: "rgba(124,58,237,0.06)", padding: "10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280" }}>arg(z\u207F)</div><div style={{ fontSize: 14, fontWeight: 700, color: "#7c3aed" }}>{nThetaMod.toFixed(0)}\u00B0</div></div>
      </div>
      <p style={{ textAlign: "center", color: "#6B7280", fontSize: 12, marginTop: 14 }}>שנו r, \u03B8 ו-n — ראו z ו-z\u207F על המישור המרוכב</p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrigComplexPage() {
  const [lvl, setLvl] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === lvl)!;
  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      <style>{`:root { --lvl-rgb: ${STATION[lvl].glowRgb}; }`}</style>
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>צורה טריגונומטרית</h1>
          <Link href="/5u/topic/grade12/complex" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none" }}>&#8592; חזרה</Link>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 4rem" }}>
        <SubtopicProgress subtopicId="5u/grade12/complex/trigonometric" />
        <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
          {TABS.map(t => { const a = lvl === t.id; return <button key={t.id} onClick={() => setLvl(t.id)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${a ? `${t.bg} ${t.textColor} ${t.border} border-2` : "bg-white/60 text-gray-500 border border-transparent"}`} style={a ? { boxShadow: `0 0 12px ${t.glowColor}` } : {}}>{t.label}</button>; })}
        </div>
        <FormulaBar />
        <div style={{ marginBottom: "2rem" }}><ExerciseCard ex={ex} /></div>
        <ComplexLab />
        <div style={{ marginTop: "2rem" }}><MarkComplete subtopicId="5u/grade12/complex/trigonometric" level={lvl} /></div>
      </motion.div>
    </main>
  );
}
