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
type ExerciseDef = { id: "basic" | "medium" | "advanced"; title: string; problem: string; diagram: React.ReactNode; pitfalls: { title: string; text: string }[]; goldenPrompt: string; steps: PromptStep[] };

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
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>מקבילית — צלעות נגדיות מקבילות ושוות</p>
      <svg width="100%" viewBox="0 0 300 180" style={{ maxWidth: "100%" }}>
        <polygon points="80,40 240,40 200,150 40,150" fill="none" stroke="#16a34a" strokeWidth={2} />
        <text x={72} y={32} fill="#16a34a" fontSize={12} fontWeight={700}>A</text>
        <text x={244} y={32} fill="#16a34a" fontSize={12} fontWeight={700}>B</text>
        <text x={200} y={168} fill="#16a34a" fontSize={12} fontWeight={700}>C</text>
        <text x={28} y={168} fill="#16a34a" fontSize={12} fontWeight={700}>D</text>
        {/* Parallel marks */}
        <line x1={155} y1={37} x2={165} y2={43} stroke="#16a34a" strokeWidth={1.5} />
        <line x1={115} y1={147} x2={125} y2={153} stroke="#16a34a" strokeWidth={1.5} />
        {/* Diagonals dashed */}
        <line x1={80} y1={40} x2={200} y2={150} stroke="#64748b" strokeWidth={1.2} strokeDasharray="4,3" />
        <line x1={240} y1={40} x2={40} y2={150} stroke="#64748b" strokeWidth={1.2} strokeDasharray="4,3" />
        <circle cx={140} cy={95} r={3} fill="#f59e0b" />
        <text x={146} y={91} fill="#f59e0b" fontSize={10} fontWeight={700}>O</text>
      </svg>
    </div>
  );
}

function MediumDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>טרפז — זוג צלעות מקבילות</p>
      <svg width="100%" viewBox="0 0 300 180" style={{ maxWidth: "100%" }}>
        <polygon points="100,40 220,40 260,150 40,150" fill="none" stroke="#ea580c" strokeWidth={2} />
        <text x={92} y={32} fill="#ea580c" fontSize={12} fontWeight={700}>A</text>
        <text x={224} y={32} fill="#ea580c" fontSize={12} fontWeight={700}>B</text>
        <text x={264} y={164} fill="#ea580c" fontSize={12} fontWeight={700}>C</text>
        <text x={28} y={164} fill="#ea580c" fontSize={12} fontWeight={700}>D</text>
        {/* Parallel marks on AB and DC */}
        <line x1={155} y1={37} x2={165} y2={43} stroke="#ea580c" strokeWidth={1.5} />
        <line x1={145} y1={147} x2={155} y2={153} stroke="#ea580c" strokeWidth={1.5} />
        {/* Midsegment dashed */}
        <line x1={70} y1={95} x2={240} y2={95} stroke="#f59e0b" strokeWidth={1.3} strokeDasharray="5,3" />
        <text x={148} y={88} fill="#f59e0b" fontSize={10} fontWeight={600}>EF</text>
      </svg>
    </div>
  );
}

function AdvancedDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>מעוין — אלכסונים מאונכים וחוצים</p>
      <svg width="100%" viewBox="0 0 300 200" style={{ maxWidth: "100%" }}>
        <polygon points="150,20 260,100 150,180 40,100" fill="none" stroke="#dc2626" strokeWidth={2} />
        <text x={144} y={14} fill="#dc2626" fontSize={12} fontWeight={700}>A</text>
        <text x={264} y={104} fill="#dc2626" fontSize={12} fontWeight={700}>B</text>
        <text x={144} y={196} fill="#dc2626" fontSize={12} fontWeight={700}>C</text>
        <text x={24} y={104} fill="#dc2626" fontSize={12} fontWeight={700}>D</text>
        {/* Diagonals */}
        <line x1={150} y1={20} x2={150} y2={180} stroke="#a78bfa" strokeWidth={1.5} />
        <line x1={40} y1={100} x2={260} y2={100} stroke="#f59e0b" strokeWidth={1.5} />
        {/* Right angle marker at center */}
        <polyline points="150,108 158,108 158,100" fill="none" stroke="#64748b" strokeWidth={1} />
        <circle cx={150} cy={100} r={3} fill="#64748b" />
        {/* Tick marks on sides */}
        <line x1={97} y1={56} x2={103} y2={64} stroke="#dc2626" strokeWidth={1.5} />
        <line x1={203} y1={56} x2={197} y2={64} stroke="#dc2626" strokeWidth={1.5} />
        <line x1={203} y1={136} x2={197} y2={144} stroke="#dc2626" strokeWidth={1.5} />
        <line x1={97} y1={136} x2={103} y2={144} stroke="#dc2626" strokeWidth={1.5} />
      </svg>
    </div>
  );
}

// ─── Prompt Coach Atoms ───────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט", accentRgb = "22,163,74" }: { text: string; label?: string; accentRgb?: string }) {
  const [c, setC] = useState(false);
  return (<button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.8)", border: `1.5px solid rgba(${accentRgb},0.4)`, color: `rgb(${accentRgb})`, fontSize: 12, fontWeight: 600, transition: "all 0.2s" }}>{c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}</button>);
}

function GoldenPromptCard({ prompt, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { prompt: string; glowRgb?: string; borderRgb?: string }) {
  return (<div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)` }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ fontSize: 14 }}>&#10024;</span><span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>פרומפט ראשי</span></div><p style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p><CopyBtn text={prompt} label="העתק פרומפט מלא" accentRgb={glowRgb} /></div>);
}

function TutorStepBasic({ step, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) {
  return (<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(${glowRgb},0.45)`, marginBottom: 8, boxShadow: `0 0 14px rgba(${glowRgb},0.18)` }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}><span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div><div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}><div><div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>&#9997;&#65039; הפרומפט המוכן</div><div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div></div><CopyBtn text={step.prompt} label="העתק פרומפט ממוקד" accentRgb={glowRgb} /></div></div>);
}

function TutorStepMedium({ step, locked = false, onPass, borderRgb = "45,90,39" }: { step: PromptStep; locked?: boolean; onPass?: () => void; borderRgb?: string }) {
  const [text, setText] = useState(""); const [result, setResult] = useState<ScoreResult | null>(null); const [copied, setCopied] = useState(false);
  const passed = !!(result && !result.blocked && result.score >= 75);
  const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי -- כתוב לפחות 20 תווים." }); return; } const res = calculatePromptScore(text, step.contextWords ?? []); setResult(res); if (!res.blocked && res.score >= 75) onPass?.(); };
  if (locked) return (<div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.6)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}><Lock size={14} color="#6B7280" /><div><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span></div></div>);
  const scoreBarColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8, boxShadow: passed ? "0 0 16px rgba(22,163,74,0.15)" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(22,163,74,0.3)" : `rgba(${borderRgb},0.2)`}` }}>{passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div>
      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={(e) => { setText(e.target.value); setResult(null); }} placeholder="נסח כאן את השאלה שלך ל-AI..." style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        {result && (<div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", marginBottom: 4, fontWeight: 600 }}><span>ציון הפרומפט</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} /></div></div>)}
        {!result && (<button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקת AI מדומה</button>)}
        {result && result.blocked && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>&#9888;&#65039; {result.hint}</motion.div>)}
        {result && !result.blocked && result.score < 75 && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>&#128161; {result.hint}</motion.div>)}
        {passed && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, fontWeight: 600 }}>&#9989; פרומפט מצוין! ציון: <strong>{result!.score}/100</strong></div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}</button></motion.div>)}
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
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)"}`, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}` }}>{passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#dc2626", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}<span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span></div>
      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={text} rows={3} dir="rtl" readOnly={passed} onChange={(e) => { if (!passed) { setText(e.target.value); setResult(null); } }} placeholder="כתוב את הפרומפט שלך לסעיף זה..." style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        {result && (<div style={{ display: "flex", flexDirection: "column", gap: 4 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>ציון</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99, transition: "width 0.4s ease" }} /></div></div>)}
        {result && !passed && result.hint && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.6, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>{result.blocked ? "\u26A0\uFE0F" : "\uD83D\uDCA1"} {result.hint}</motion.div>)}
        {passed && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, fontWeight: 600 }}>&#9989; ניסוח מעולה!</div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ניסוח"}</button></motion.div>)}
        {!passed && (<button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: "1px solid rgba(220,38,38,0.35)", color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקת AI מדומה</button>)}
      </div>
    </div>
  );
}

// ─── Ladders ──────────────────────────────────────────────────────────────────

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [completed, setCompleted] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlocked = completed.filter(Boolean).length + 1;
  const markDone = (i: number) => { setCompleted(prev => { const n = [...prev]; n[i] = true; return n; }); };
  return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => (<div key={i}>{i < unlocked ? (<><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />{!completed[i] ? (<button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>&#10003; סיימתי סעיף זה</button>) : (<div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>&#9989; הושלם</div>)}</>) : (<div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}><Lock size={14} color="#6B7280" style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }} /><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} /></div>)}</div>))}</div>);
}

function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [passed, setPassed] = useState<boolean[]>(Array(steps.length).fill(false));
  return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => (<TutorStepMedium key={i} step={s} locked={i > 0 && !passed[i - 1]} onPass={() => setPassed(prev => { const n = [...prev]; n[i] = true; return n; })} borderRgb={borderRgb} />))}</div>);
}

function LadderAdvanced({ steps }: { steps: PromptStep[] }) {
  const [masterPassed, setMasterPassed] = useState(false);
  const [passed, setPassed] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlockedIdx = masterPassed ? (passed.findIndex(p => !p) === -1 ? steps.length : passed.findIndex(p => !p)) : -1;
  return (<div><MasterPromptGate onPass={() => setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["מעוין", "אלכסון", "ניצב", "חוצה", "הוכחה", "מרובע"]} />{steps.map((s, i) => (<TutorStepAdvanced key={i} step={s} locked={!masterPassed || i > unlockedIdx} onPass={() => setPassed(prev => { const n = [...prev]; n[i] = true; return n; })} />))}</div>);
}

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [cp, setCp] = useState(false);
  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", boxShadow: s.glowShadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}><span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span><h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2></div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.15)", marginBottom: "2rem" }} />
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.6)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>&#128221; השאלה</div><button onClick={() => { navigator.clipboard.writeText(ex.problem); setCp(true); setTimeout(() => setCp(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: cp ? "rgba(22,163,74,0.15)" : "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)", color: cp ? "#16a34a" : "#6B7280", fontSize: 11, fontWeight: 600 }}>{cp ? <Check size={11} /> : <Copy size={11} />}{cp ? "הועתק!" : "העתק"}</button></div>
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
  const [activeTab, setActiveTab] = useState<"para" | "trap" | "rhom" | "area" | null>(null);
  const tabs = [
    { id: "para" as const, label: "מקבילית", tex: "AB{\\parallel}CD", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "trap" as const, label: "טרפז", tex: "EF=\\tfrac{a+b}{2}", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "rhom" as const, label: "מעוין", tex: "d_1{\\perp}d_2", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "area" as const, label: "שטחים", tex: "S=\\tfrac{d_1{\\cdot}d_2}{2}", color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>
      <div style={{ display: "flex", gap: 6, marginBottom: activeTab ? 14 : 0 }}>
        {tabs.map(t => { const a = activeTab === t.id; return (<button key={t.id} onClick={() => setActiveTab(a ? null : t.id)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${a ? t.borderColor : "rgba(60,54,42,0.15)"}`, background: a ? `${t.color}15` : "rgba(255,255,255,0.5)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11, fontWeight: 700, color: a ? t.color : "#6B7280" }}>{t.label}</span><span style={{ color: a ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span></button>); })}
      </div>
      {activeTab === "para" && (<motion.div key="para" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"AB \\parallel CD,\\; AB = CD,\\; AD \\parallel BC,\\; AD = BC"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>תכונות מקבילית:</strong> צלעות נגדיות שוות ומקבילות, זוויות נגדיות שוות, אלכסונים חוצים זה את זה.</div></div></motion.div>)}
      {activeTab === "trap" && (<motion.div key="trap" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"EF = \\frac{a + b}{2},\\quad S = \\frac{(a+b) \\cdot h}{2}"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>טרפז:</strong> זוג אחד של צלעות מקבילות. קטע אמצעי = ממוצע הבסיסים. שטח = חצי סכום הבסיסים כפול גובה.</div></div></motion.div>)}
      {activeTab === "rhom" && (<motion.div key="rhom" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"d_1 \\perp d_2,\\quad \\text{diagonals bisect each other}"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>מעוין:</strong> כל הצלעות שוות, אלכסונים מאונכים וחוצים זה את זה, כל אלכסון חוצה זוג זוויות נגדיות.</div></div></motion.div>)}
      {activeTab === "area" && (<motion.div key="area" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}><div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: 16 }}><div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"S_{\\text{rhombus}} = \\frac{d_1 \\cdot d_2}{2},\\quad S_{\\text{parallelogram}} = b \\cdot h"}</DisplayMath></div><div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px", color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}><strong>שטחים:</strong> מקבילית = בסיס × גובה. מעוין = מכפלת אלכסונים חלקי 2. טרפז = חצי סכום בסיסים × גובה.</div></div></motion.div>)}
    </div>
  );
}

// ─── Exercise data ────────────────────────────────────────────────────────────

const PF = "\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.";

const exercises: ExerciseDef[] = [
  {
    id: "basic", title: "תכונות מקבילית",
    problem: "ABCD מקבילית. האלכסונים AC ו-BD נחתכים בנקודה O.\n\nא. הוכיחו שצלעות נגדיות שוות: AB = CD ו-AD = BC.\nב. הוכיחו שהאלכסונים חוצים זה את זה: AO = OC ו-BO = OD.\nג. אם \u2220A = 70°, מצאו את שאר הזוויות.",
    diagram: <BasicDiagram />,
    pitfalls: [
      { title: "חפיפת משולשים להוכחת צלעות", text: "AB \u2225 CD \u2192 זוויות מתחלפות שוות. עם BD צלע משותפת \u2192 \u25B3ABD \u2245 \u25B3CDB (ז.צ.ז.)." },
      { title: "אלכסונים חוצים: צריך להוכיח AO = OC", text: "השתמשו בחפיפת \u25B3AOB ו-\u25B3COD (ז.צ.ז.) \u2014 לא מובן מאליו!" },
      { title: "זוויות נגדיות שוות, סמוכות משלימות ל-180°", text: "\u2220A = \u2220C = 70°, \u2220B = \u2220D = 110°." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 5 יחידות.\nABCD מקבילית. אלכסונים נחתכים ב-O.\nצריך: הוכחת צלעות נגדיות שוות, אלכסונים חוצים, מציאת זוויות." + PF,
    steps: [
      { phase: "א", label: "צלעות נגדיות", coaching: "חפיפת משולשים", prompt: "ABCD מקבילית. הנחה אותי להוכיח AB = CD באמצעות חפיפת משולשים." + PF, keywords: ["חפיפה", "מקבילית"], keywordHint: "ציין חפיפה", contextWords: ["מקבילית", "אלכסון", "חפיפה", "חוצה", "זוויות", "צלעות"] },
      { phase: "ב", label: "אלכסונים חוצים", coaching: "חפיפת \u25B3AOB ו-\u25B3COD", prompt: "ABCD מקבילית, אלכסונים נחתכים ב-O. הנחה אותי להוכיח AO = OC." + PF, keywords: ["חוצים", "אלכסון"], keywordHint: "ציין אלכסונים חוצים", contextWords: ["מקבילית", "אלכסון", "חפיפה", "חוצה", "זוויות", "צלעות"] },
      { phase: "ג", label: "מציאת זוויות", coaching: "זוויות סמוכות משלימות", prompt: "ABCD מקבילית, \u2220A = 70°. הנחה אותי למצוא את שאר הזוויות." + PF, keywords: ["זוויות", "משלימות"], keywordHint: "ציין זוויות", contextWords: ["מקבילית", "אלכסון", "חפיפה", "חוצה", "זוויות", "צלעות"] },
    ],
  },
  {
    id: "medium", title: "טרפז \u2014 קטע אמצעי ושטח",
    problem: "ABCD טרפז (AB \u2225 CD). E אמצע AD, F אמצע BC.\n\nא. הוכיחו ש-EF \u2225 AB \u2225 CD.\nב. הוכיחו שאורך EF שווה לממוצע הבסיסים: EF = (AB + CD)/2.\nג. אם AB = 14, CD = 8 והגובה h = 6, חשבו את שטח הטרפז.\nד. חשבו את שטח המשולש AEF ואת שטח המשולש CEF.",
    diagram: <MediumDiagram />,
    pitfalls: [
      { title: "EF מקביל לשני הבסיסים", text: "הקטע המחבר אמצעי השוקיים מקביל לבסיסים \u2014 זהו משפט שצריך לצטט." },
      { title: "שטח טרפז = (AB + CD) \u00B7 h / 2", text: "(14 + 8) \u00B7 6 / 2 = 66. אל תשכחו לחלק ב-2!" },
      { title: "שטח \u25B3AEF \u2260 שטח \u25B3CEF", text: "הגובה של כל משולש הוא h/2, אבל הבסיסים שונים (AB מול CD)." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 5 יחידות.\nABCD טרפז, AB \u2225 CD. E אמצע AD, F אמצע BC.\nAB = 14, CD = 8, h = 6.\nצריך: הוכחת EF מקביל, אורך EF, שטח טרפז, שטחי משולשים." + PF,
    steps: [
      { phase: "א", label: "EF מקביל", coaching: "משפט קטע אמצעי", prompt: "טרפז ABCD, E אמצע AD, F אמצע BC. הנחה אותי להוכיח EF \u2225 AB." + PF, keywords: ["מקביל", "אמצע"], keywordHint: "ציין קטע אמצעי", contextWords: ["טרפז", "קטע אמצעי", "מקביל", "שטח", "בסיס", "גובה"] },
      { phase: "ב", label: "אורך EF", coaching: "ממוצע הבסיסים", prompt: "טרפז ABCD, AB \u2225 CD, E ו-F אמצעי השוקיים. הנחה אותי להוכיח EF = (AB+CD)/2." + PF, keywords: ["ממוצע", "בסיסים"], keywordHint: "ציין ממוצע בסיסים", contextWords: ["טרפז", "קטע אמצעי", "מקביל", "שטח", "בסיס", "גובה"] },
      { phase: "ג", label: "שטח הטרפז", coaching: "נוסחת שטח טרפז", prompt: "טרפז AB=14, CD=8, h=6. הנחה אותי לחשב שטח." + PF, keywords: ["שטח", "טרפז"], keywordHint: "ציין שטח טרפז", contextWords: ["טרפז", "קטע אמצעי", "מקביל", "שטח", "בסיס", "גובה"] },
      { phase: "ד", label: "שטחי משולשים", coaching: "גובה h/2 ובסיסים שונים", prompt: "טרפז ABCD חולק ע\"י EF. הנחה אותי לחשב שטח \u25B3AEF ו-\u25B3CEF." + PF, keywords: ["משולש", "שטח"], keywordHint: "ציין שטחי משולשים", contextWords: ["טרפז", "קטע אמצעי", "מקביל", "שטח", "בסיס", "גובה"] },
    ],
  },
  {
    id: "advanced", title: "הוכחות במעוין",
    problem: "ABCD מעוין. האלכסונים AC ו-BD נחתכים בנקודה O.\n\nא. הוכיחו שהאלכסונים מאונכים זה לזה.\nב. הוכיחו שכל אלכסון חוצה זוג זוויות נגדיות.\nג. אם AC = 10 ו-BD = 24, חשבו את אורך הצלע.\nד. חשבו את שטח המעוין.",
    diagram: <AdvancedDiagram />,
    pitfalls: [
      { title: "ניצבות: דרך חפיפת 4 משולשים", text: "\u25B3AOB \u2245 \u25B3COB (צ.צ.צ.) \u2192 \u2220AOB = \u2220COB. הן סמוכות ושוות \u2192 כל אחת 90°." },
      { title: "חציית זוויות: \u2220BAO = \u2220DAO", text: "מחפיפת \u25B3AOB \u2245 \u25B3AOD (צ.צ.צ.) \u2014 AC משותף, AB = AD (מעוין), OB = OD." },
      { title: "צלע: AO = 5, BO = 12 \u2192 AB = \u221A(25+144) = 13", text: "פיתגורס ב-\u25B3AOB (ניצב). אלכסונים חוצים \u2192 AO = AC/2, BO = BD/2." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 5 יחידות.\nABCD מעוין, אלכסונים נחתכים ב-O.\nAC = 10, BD = 24.\nצריך: ניצבות, חציית זוויות, אורך צלע, שטח." + PF,
    steps: [
      { phase: "א", label: "ניצבות אלכסונים", coaching: "חפיפה \u2192 זוויות שוות וסמוכות", prompt: "ABCD מעוין, אלכסונים נחתכים ב-O. הנחה אותי להוכיח AC \u22A5 BD." + PF, keywords: ["ניצב", "חפיפה"], keywordHint: "ציין ניצבות", contextWords: ["מעוין", "אלכסון", "ניצב", "חוצה", "הוכחה", "מרובע"] },
      { phase: "ב", label: "חציית זוויות", coaching: "חפיפת משולשים ליד האלכסון", prompt: "ABCD מעוין. הנחה אותי להוכיח שהאלכסון AC חוצה את \u2220A ואת \u2220C." + PF, keywords: ["חוצה", "זווית"], keywordHint: "ציין חציית זווית", contextWords: ["מעוין", "אלכסון", "ניצב", "חוצה", "הוכחה", "מרובע"] },
      { phase: "ג", label: "אורך צלע", coaching: "פיתגורס ב-\u25B3AOB", prompt: "ABCD מעוין, AC=10, BD=24. אלכסונים חוצים ב-O. הנחה אותי למצוא את אורך הצלע." + PF, keywords: ["פיתגורס", "צלע"], keywordHint: "ציין פיתגורס", contextWords: ["מעוין", "אלכסון", "ניצב", "חוצה", "הוכחה", "מרובע"] },
      { phase: "ד", label: "שטח המעוין", coaching: "d\u2081\u00B7d\u2082/2", prompt: "ABCD מעוין, AC=10, BD=24. הנחה אותי לחשב את שטח המעוין." + PF, keywords: ["שטח", "אלכסון"], keywordHint: "ציין שטח מעוין", contextWords: ["מעוין", "אלכסון", "ניצב", "חוצה", "הוכחה", "מרובע"] },
    ],
  },
];

// ─── Lab ──────────────────────────────────────────────────────────────────────

function QuadrilateralLab() {
  const [d1, setD1] = useState(10);
  const [d2, setD2] = useState(14);

  const halfD1 = d1 / 2;
  const halfD2 = d2 / 2;
  const side = Math.sqrt(halfD1 ** 2 + halfD2 ** 2);
  const area = (d1 * d2) / 2;
  const perimeter = 4 * side;

  const cx = 150, cy = 120;
  const scale = 4;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>&#128300; מעבדה אינטראקטיבית — מעוין</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#2D3436", fontWeight: 600, marginBottom: 4 }}><span>אלכסון d\u2081</span><span>{d1}</span></div>
          <input type="range" min={4} max={24} step={1} value={d1} onChange={e => setD1(Number(e.target.value))} style={{ width: "100%" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#2D3436", fontWeight: 600, marginBottom: 4 }}><span>אלכסון d\u2082</span><span>{d2}</span></div>
          <input type="range" min={4} max={24} step={1} value={d2} onChange={e => setD2(Number(e.target.value))} style={{ width: "100%" }} />
        </div>
      </div>

      <svg width="100%" viewBox="0 0 300 240" style={{ maxWidth: 400, margin: "0 auto", display: "block" }}>
        <rect x={0} y={0} width={300} height={240} fill="#fafaf5" rx={12} />
        {/* Rhombus */}
        <polygon
          points={`${cx},${cy - halfD1 * scale} ${cx + halfD2 * scale},${cy} ${cx},${cy + halfD1 * scale} ${cx - halfD2 * scale},${cy}`}
          fill="rgba(220,38,38,0.06)" stroke="#dc2626" strokeWidth={2}
        />
        {/* Diagonals */}
        <line x1={cx} y1={cy - halfD1 * scale} x2={cx} y2={cy + halfD1 * scale} stroke="#a78bfa" strokeWidth={1.3} />
        <line x1={cx - halfD2 * scale} y1={cy} x2={cx + halfD2 * scale} y2={cy} stroke="#f59e0b" strokeWidth={1.3} />
        {/* Right angle */}
        <polyline points={`${cx},${cy + 8} ${cx + 8},${cy + 8} ${cx + 8},${cy}`} fill="none" stroke="#64748b" strokeWidth={1} />
        {/* Labels */}
        <text x={cx + 4} y={cy - halfD1 * scale + 14} fill="#a78bfa" fontSize={10} fontWeight={600}>d\u2081</text>
        <text x={cx + halfD2 * scale - 18} y={cy - 6} fill="#f59e0b" fontSize={10} fontWeight={600}>d\u2082</text>
      </svg>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 20 }}>
        <div style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.06)", padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 2 }}>צלע</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#dc2626" }}>{side.toFixed(2)}</div>
        </div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(124,58,237,0.2)", background: "rgba(124,58,237,0.06)", padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 2 }}>שטח</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#7c3aed" }}>{area.toFixed(1)}</div>
        </div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(22,163,74,0.2)", background: "rgba(22,163,74,0.06)", padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 2 }}>היקף</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#16a34a" }}>{perimeter.toFixed(2)}</div>
        </div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(234,88,12,0.2)", background: "rgba(234,88,12,0.06)", padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 2 }}>d\u2081/d\u2082</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#ea580c" }}>{(d1 / d2).toFixed(2)}</div>
        </div>
      </div>
      <p style={{ textAlign: "center", color: "#6B7280", fontSize: 12, marginTop: 14 }}>שנו את האלכסונים וראו כיצד המעוין, השטח והצלע משתנים</p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuadrilateralsPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;

  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      <style>{`:root { --lvl-rgb: ${STATION[selectedLevel].glowRgb}; }`}</style>

      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>מרובעים</h1>
          <Link href="/5u/topic/grade10/geometry" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none" }}>&#8592; חזרה</Link>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 4rem" }}>
        <SubtopicProgress subtopicId="5u/grade10/geometry/quadrilaterals" />

        <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
          {TABS.map(tab => { const a = selectedLevel === tab.id; return (<button key={tab.id} onClick={() => setSelectedLevel(tab.id)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${a ? `${tab.bg} ${tab.textColor} ${tab.border} border-2` : "bg-white/60 text-gray-500 border border-transparent"}`} style={a ? { boxShadow: `0 0 12px ${tab.glowColor}` } : {}}>{tab.label}</button>); })}
        </div>

        <FormulaBar />
        <div style={{ marginBottom: "2rem" }}><ExerciseCard ex={ex} /></div>
        <QuadrilateralLab />
        <div style={{ marginTop: "2rem" }}><MarkComplete subtopicId="5u/grade10/geometry/quadrilaterals" level={selectedLevel} /></div>
      </motion.div>
    </main>
  );
}
