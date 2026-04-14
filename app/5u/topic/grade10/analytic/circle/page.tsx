"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
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
  { id: "basic" as const,    label: "מתחיל",  textColor: "text-green-700",  border: "border-green-600",  bg: "bg-green-600/10",  glowColor: "rgba(22,163,74,0.3)"  },
  { id: "medium" as const,   label: "בינוני", textColor: "text-orange-700", border: "border-orange-600", bg: "bg-orange-600/10", glowColor: "rgba(234,88,12,0.3)"  },
  { id: "advanced" as const, label: "מתקדם",  textColor: "text-red-700",    border: "border-red-700",    bg: "bg-red-700/10",    glowColor: "rgba(220,38,38,0.3)"  },
];

// ─── SVG diagrams (silent — no numbers, no answers) ──────────────────────────

function BasicSVG() {
  return (
    <svg viewBox="0 0 260 260" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Grid axes */}
      <line x1={30} y1={230} x2={250} y2={230} stroke="#94a3b8" strokeWidth={1} />
      <line x1={30} y1={10} x2={30} y2={230} stroke="#94a3b8" strokeWidth={1} />
      <text x={252} y={234} fill="#94a3b8" fontSize={11}>x</text>
      <text x={24} y={8} fill="#94a3b8" fontSize={11}>y</text>
      {/* Circle */}
      <circle cx={140} cy={120} r={70} fill="none" stroke="#16a34a" strokeWidth={2} />
      {/* Center dot */}
      <circle cx={140} cy={120} r={4} fill="#f59e0b" />
      <text x={146} y={116} fill="#f59e0b" fontSize={12} fontWeight={700}>O</text>
      {/* Radius dashed line */}
      <line x1={140} y1={120} x2={210} y2={120} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4,3" />
      <text x={172} y={112} fill="#64748b" fontSize={10}>r</text>
      {/* x-axis intersection hints */}
      <circle cx={98} cy={230} r={3} fill="#34d399" />
      <circle cx={182} cy={230} r={3} fill="#34d399" />
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 260 260" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={30} y1={230} x2={250} y2={230} stroke="#94a3b8" strokeWidth={1} />
      <line x1={30} y1={10} x2={30} y2={230} stroke="#94a3b8" strokeWidth={1} />
      <text x={252} y={234} fill="#94a3b8" fontSize={11}>x</text>
      <text x={24} y={8} fill="#94a3b8" fontSize={11}>y</text>
      {/* Circle with unknown center */}
      <circle cx={145} cy={115} r={65} fill="none" stroke="#EA580C" strokeWidth={2} />
      {/* Center with ? */}
      <circle cx={145} cy={115} r={4} fill="#f59e0b" />
      <text x={151} y={111} fill="#f59e0b" fontSize={14} fontWeight={700}>?</text>
      {/* Dotted radius to a point */}
      <line x1={145} y1={115} x2={195} y2={70} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4,3" />
      <text x={173} y={82} fill="#64748b" fontSize={10}>?</text>
      {/* A test point outside */}
      <circle cx={220} cy={160} r={4} fill="#a78bfa" />
      <text x={226} y={156} fill="#a78bfa" fontSize={12} fontWeight={700}>P</text>
      <line x1={145} y1={115} x2={220} y2={160} stroke="#a78bfa" strokeWidth={1} strokeDasharray="4,3" />
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 280 280" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={20} y1={250} x2={270} y2={250} stroke="#94a3b8" strokeWidth={1} />
      <line x1={20} y1={10} x2={20} y2={250} stroke="#94a3b8" strokeWidth={1} />
      <text x={272} y={254} fill="#94a3b8" fontSize={11}>x</text>
      <text x={14} y={8} fill="#94a3b8" fontSize={11}>y</text>
      {/* Circle through 3 points */}
      <circle cx={150} cy={130} r={75} fill="none" stroke="#DC2626" strokeWidth={2} />
      {/* 3 points on the circle */}
      <circle cx={75} cy={130} r={4} fill="#DC2626" />
      <text x={60} y={126} fill="#DC2626" fontSize={12} fontWeight={700}>A</text>
      <circle cx={185} cy={65} r={4} fill="#DC2626" />
      <text x={190} y={60} fill="#DC2626" fontSize={12} fontWeight={700}>B</text>
      <circle cx={210} cy={170} r={4} fill="#DC2626" />
      <text x={216} y={166} fill="#DC2626" fontSize={12} fontWeight={700}>C</text>
      {/* Tangent line at A */}
      <line x1={75} y1={60} x2={75} y2={200} stroke="#a78bfa" strokeWidth={1.8} />
      <text x={52} y={55} fill="#a78bfa" fontSize={10} fontWeight={600}>משיק</text>
      {/* Radius to A (perpendicular to tangent) */}
      <line x1={150} y1={130} x2={75} y2={130} stroke="#64748b" strokeWidth={1.2} strokeDasharray="4,3" />
      {/* Right angle mark at A */}
      <polyline points="85,130 85,120 75,120" fill="none" stroke="#34d399" strokeWidth={1.2} />
    </svg>
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
        <div><div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>הפרומפט המוכן</div>
        <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div></div>
        <CopyBtn text={step.prompt} label="העתק פרומפט ממוקד" accentRgb={glowRgb} />
      </div>
    </div>
  );
}

function TutorStepMedium({ step, locked = false, onPass, borderRgb = "45,90,39" }: { step: PromptStep; locked?: boolean; onPass?: () => void; borderRgb?: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);
  const passed = !!(result && !result.blocked && result.score >= 75);

  const validate = () => {
    if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי -- כתוב לפחות 20 תווים." }); return; }
    const res = calculatePromptScore(text, step.contextWords ?? []);
    setResult(res);
    if (!res.blocked && res.score >= 75) onPass?.();
  };

  if (locked) return (
    <div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.3)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 16 }}>&#128274;</span>
      <div><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span></div>
    </div>
  );

  const scoreBarColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(245,158,11,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8, boxShadow: passed ? "0 0 16px rgba(245,158,11,0.25)" : "none", transition: "border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(245,158,11,0.3)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(245,158,11,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />
        {result && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", marginBottom: 4, fontWeight: 600 }}><span>ציון הפרומפט</span><span style={{ color: "#1A1A1A", fontWeight: 800 }}>{result.score}/100</span></div>
            <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} /></div>
          </div>
        )}
        {result && result.blocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>{result.hint}</motion.div>
        )}
        {result && !result.blocked && result.score < 75 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>{result.hint}</motion.div>
        )}
        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
              פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result!.score}/100</strong>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}
            </button>
          </motion.div>
        )}
        {!result && (
          <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>
            בדיקת AI מדומה
          </button>
        )}
        {result && !passed && (
          <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>
        )}
      </div>
    </div>
  );
}

function TutorStepAdvanced({ step, locked = false, onPass }: { step: PromptStep; locked?: boolean; onPass?: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);
  const passed = result?.score !== undefined && result.score >= 90 && !result.blocked;
  const ROSE = { border: "rgba(244,63,94,0.35)", dim: "rgba(244,63,94,0.2)", text: "#fda4af" };

  if (locked) return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.3)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <span>&#128274;</span><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} -- {step.label}</span>
    </div>
  );

  const validate = () => {
    if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי -- כתוב לפחות 20 תווים." }); return; }
    const r = calculatePromptScore(text, step.contextWords ?? []);
    setResult(r);
    if (!r.blocked && r.score >= 90 && onPass) onPass();
  };

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(52,211,153,0.35)" : ROSE.border}`, marginBottom: 8, transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(52,211,153,0.2)" : "rgba(244,63,94,0.2)"}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: ROSE.text, fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={text} rows={3} dir="rtl" readOnly={passed} onChange={(e) => { if (!passed) { setText(e.target.value); setResult(null); } }}
          placeholder="כתוב את הפרומפט שלך לסעיף זה..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(52,211,153,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", fontWeight: 600 }}><span>ציון</span><span style={{ color: "#1A1A1A", fontWeight: 800 }}>{result.score}/100</span></div>
            <div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99, transition: "width 0.4s ease" }} /></div>
          </div>
        )}
        {result && !passed && result.hint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.6, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>{result.hint}</motion.div>
        )}
        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>ניסוח מעולה! הסעיף הבא נפתח.</div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ניסוח"}
            </button>
          </motion.div>
        )}
        {!passed && (
          <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid ${ROSE.border}`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>בדיקת AI מדומה</button>
        )}
      </div>
    </div>
  );
}

// ─── Ladder Wrappers ─────────────────────────────────────────────────────────

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [completed, setCompleted] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlocked = completed.filter(Boolean).length + 1;
  const markDone = (i: number) => {
    setCompleted(prev => { const next = [...prev]; next[i] = true; return next; });
    const el = document.getElementById(`basic-step-${i + 1}`);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
  };
  return (
    <div>
      <GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />
      {steps.map((s, i) => (
        <div key={i} id={`basic-step-${i}`}>
          {i < unlocked ? (
            <>
              <TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />
              {!completed[i] ? (
                <button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>סיימתי סעיף זה</button>
              ) : (
                <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>הושלם</div>
              )}
            </>
          ) : (
            <div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}>
              <div style={{ position: "absolute", top: 8, right: 8, fontSize: 16, zIndex: 2 }}>&#128274;</div>
              <TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [passed, setPassed] = useState<boolean[]>(Array(steps.length).fill(false));
  return (
    <div>
      <GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />
      {steps.map((s, i) => (
        <TutorStepMedium key={i} step={s} locked={i > 0 && !passed[i - 1]} onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })} borderRgb={borderRgb} />
      ))}
    </div>
  );
}

function LadderAdvanced({ steps }: { steps: PromptStep[] }) {
  const [masterPassed, setMasterPassed] = useState(false);
  const [unlockedCount, setUnlockedCount] = useState(1);
  const allPassed = masterPassed && unlockedCount > steps.length;

  return (
    <div>
      <MasterPromptGate
        onPass={() => setMasterPassed(true)}
        accentColor="#991b1b"
        accentRgb="153,27,27"
        requiredPhrase="סרוק נתונים ועצור"
        subjectWords={["מעגל", "מרכז", "רדיוס", "משיק", "השלמה לריבוע", "משוואה"]}
      />
      {steps.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {(!masterPassed || i >= unlockedCount) ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.7)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{s.phase} -- {s.label}</span>
              <span style={{ fontSize: 16 }}>&#128274;</span>
            </div>
          ) : (
            <div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(255,255,255,0.9)", padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{s.phase} -- {s.label}</div>
                <div style={{ color: "#334155", fontSize: 13, lineHeight: 1.6 }}>{s.prompt}</div>
              </div>
              <button onClick={() => setUnlockedCount(v => Math.max(v, i + 2))} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>סיימתי סעיף זה</button>
            </div>
          )}
        </div>
      ))}
      {allPassed && (
        <div style={{ borderRadius: 16, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: "1.25rem 1.5rem", marginTop: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>&#127942;</div>
          <div style={{ color: "#14532d", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>כל הכבוד -- השלמת את הרמה המתקדמת!</div>
          <div style={{ color: "#166534", fontSize: 13 }}>עברת בהצלחה את כל הסעיפים.</div>
        </div>
      )}
    </div>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "משוואת מעגל ממרכז ורדיוס",
    problem: "נתון מעגל שמרכזו בנקודה (a, b) ורדיוסו r.\n\nא. כתבו את משוואת המעגל בצורה תקנית: (x-a)²+(y-b)²=r².\nב. בדקו האם נקודה נתונה נמצאת על המעגל.\nג. מצאו את נקודות החיתוך של המעגל עם ציר ה-x (הציבו y=0).",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "טעות סימנים ב-(x-a)", text: "אם המרכז הוא (3,2), המשוואה היא (x-3)²+(y-2)²=r². תלמידים רבים כותבים (x+3)² כשהמרכז חיובי -- זכרו: תמיד מינוס הקואורדינטה!" },
      { title: "בלבול בין r ל-r²", text: "אם הרדיוס הוא 5, צד ימין של המשוואה הוא 25 ולא 5. לבדיקת נקודה על המעגל -- מציבים ובודקים אם התוצאה שווה ל-r² (לא ל-r)." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י', 5 יחידות, ומצרף/ת שאלה על משוואת מעגל -- מרכז ורדיוס, בדיקת נקודה, וחיתוך עם ציר. אני רוצה שתהיה המורה הפרטי שלי -- תסביר לי את הלוגיקה ולא תיתן תשובות ישירות.

אל תפתור עבורי -- שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: "אני מוכן להמשיך."`,
    steps: [
      { phase: "סעיף א׳", label: "כתיבת משוואה תקנית", coaching: "", prompt: "נתון מעגל עם מרכז (a,b) ורדיוס r. תנחה אותי לכתוב את המשוואה התקנית (x-a)²+(y-b)²=r² -- תסביר למה מינוס ולא פלוס.", keywords: [], keywordHint: "", contextWords: ["משוואה", "מרכז", "רדיוס", "תקנית", "ריבוע", "הצבה"] },
      { phase: "סעיף ב׳", label: "בדיקת נקודה על המעגל", coaching: "", prompt: "יש לי משוואת מעגל ונקודה. תדריך אותי להציב את הנקודה במשוואה ולבדוק אם מתקבל שוויון.", keywords: [], keywordHint: "", contextWords: ["הצבה", "נקודה", "שוויון", "מעגל", "בדיקה", "r²"] },
      { phase: "סעיף ג׳", label: "חיתוך עם ציר x", coaching: "", prompt: "תכווין אותי למצוא חיתוך מעגל עם ציר x -- להציב y=0 ולפתור משוואה ריבועית ב-x.", keywords: [], keywordHint: "", contextWords: ["חיתוך", "ציר", "y=0", "משוואה ריבועית", "שורשים", "הצבה"] },
    ],
  },
  {
    id: "medium",
    title: "ממשוואה כללית למרכז ורדיוס",
    problem: "נתונה משוואת מעגל בצורה כללית: x²+y²+Dx+Ey+F=0.\n\nא. בצעו השלמה לריבוע עבור x ועבור y כדי להגיע לצורה התקנית.\nב. זהו את המרכז ואת הרדיוס.\nג. קבעו האם נקודה נתונה נמצאת בתוך המעגל, על המעגל, או מחוצה לו.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "שוכחים להוסיף לשני הצדדים", text: "בהשלמה לריבוע: אם מוסיפים (D/2)² לצד שמאל, חובה להוסיף את אותו ערך גם לצד ימין. אחרת המשוואה לא שקולה!" },
      { title: "סימן הפוך על המרכז", text: "מהצורה (x+D/2)²+(y+E/2)²=... המרכז הוא (-D/2, -E/2) ולא (D/2, E/2). שימו לב לסימן המינוס!" },
    ],
    goldenPrompt: `אני בכיתה י', 5 יחידות, מצרף/ת תרגיל על מעבר ממשוואה כללית של מעגל לצורה תקנית באמצעות השלמה לריבוע.

אל תיתן לי את התשובה -- שאל אותי שאלות מנחות על השלמה לריבוע, זיהוי מרכז ורדיוס, ובדיקת מיקום נקודה.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: "אני מוכן להמשיך."`,
    steps: [
      { phase: "סעיף א׳", label: "השלמה לריבוע", coaching: "", prompt: "נתונה משוואה כללית x²+y²+Dx+Ey+F=0. תנחה אותי לבצע השלמה לריבוע עבור x ואחר כך עבור y -- צעד אחרי צעד.", keywords: [], keywordHint: "", contextWords: ["השלמה", "ריבוע", "מקבצים", "חצי", "מוסיפים", "שני הצדדים"] },
      { phase: "סעיף ב׳", label: "זיהוי מרכז ורדיוס", coaching: "", prompt: "אחרי השלמה לריבוע קיבלתי צורה תקנית. תדריך אותי לזהות את המרכז (-D/2,-E/2) ואת הרדיוס מתוך הביטוי.", keywords: [], keywordHint: "", contextWords: ["מרכז", "רדיוס", "שורש", "D", "E", "F"] },
      { phase: "סעיף ג׳", label: "נקודה בתוך/על/מחוץ", coaching: "", prompt: "תכווין אותי לקבוע אם נקודה בתוך/על/מחוץ למעגל -- להציב במשוואה ולהשוות ל-r²: קטן=בתוך, שווה=על, גדול=מחוץ.", keywords: [], keywordHint: "", contextWords: ["הצבה", "השוואה", "בתוך", "מחוץ", "מרחק", "r²"] },
    ],
  },
  {
    id: "advanced",
    title: "מעגל דרך 3 נקודות + משיק",
    problem: "נתונות 3 נקודות A, B, C במישור.\n\nא. הציבו כל נקודה במשוואה הכללית x²+y²+Dx+Ey+F=0 וקבלו מערכת של 3 משוואות.\nב. פתרו את המערכת ומצאו את D, E, F.\nג. כתבו את המרכז ואת הרדיוס של המעגל.\nד. מצאו את משוואת המשיק למעגל בנקודה A (ניצב לרדיוס).",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "טעות בהצבת נקודות", text: "כשמציבים נקודה (x₀,y₀) במשוואה הכללית, צריך לחשב x₀²+y₀² ולהציב בביטויים Dx₀, Ey₀. שגיאות חישוב כאן יגרמו לשגיאה בכל המערכת." },
      { title: "שיפוע המשיק", text: "המשיק ניצב לרדיוס. אם שיפוע הרדיוס מהמרכז לנקודה הוא m, שיפוע המשיק הוא -1/m. אם הרדיוס אנכי -- המשיק אופקי, ולהיפך." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים -- כתוב פרומפט שמסביר: כיצד מוצאים מעגל העובר דרך 3 נקודות, ומהו הקשר בין רדיוס למשיק? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "הצבת 3 נקודות", coaching: "", prompt: "נתונות 3 נקודות A, B, C. תנחה אותי להציב כל נקודה במשוואה x²+y²+Dx+Ey+F=0 כדי לקבל 3 משוואות ב-D, E, F.", keywords: [], keywordHint: "", contextWords: ["הצבה", "נקודות", "משוואה כללית", "D", "E", "F"] },
      { phase: "סעיף ב׳", label: "פתרון מערכת משוואות", coaching: "", prompt: "קיבלתי מערכת של 3 משוואות ב-D, E, F. תדריך אותי לפתור -- הצבה, גאוס, או חיסור משוואות.", keywords: [], keywordHint: "", contextWords: ["מערכת", "משוואות", "פתרון", "הצבה", "חיסור", "גאוס"] },
      { phase: "סעיף ג׳", label: "מרכז ורדיוס", coaching: "", prompt: "מצאתי D, E, F. תנחה אותי לחשב מרכז (-D/2,-E/2) ורדיוס מהנוסחה r=sqrt(D²/4+E²/4-F).", keywords: [], keywordHint: "", contextWords: ["מרכז", "רדיוס", "נוסחה", "שורש", "D/2", "E/2"] },
      { phase: "סעיף ד׳", label: "משוואת המשיק", coaching: "", prompt: "תכווין אותי למצוא משיק למעגל בנקודה A -- לחשב שיפוע רדיוס מהמרכז ל-A, ואז שיפוע ניצב. לכתוב משוואת ישר.", keywords: [], keywordHint: "", contextWords: ["משיק", "שיפוע", "ניצב", "רדיוס", "משוואת ישר", "נקודה"] },
    ],
  },
];

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() { navigator.clipboard.writeText(ex.problem); setCopiedProblem(true); setTimeout(() => setCopiedProblem(false), 2000); }

  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Properties box */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem 1.5rem", marginBottom: "2rem", boxShadow: s.glowShadow }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>&#9898; משוואת המעגל (Circle Equation)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "משוואה תקנית, בדיקת שייכות נקודה, חיתוך עם צירים."}
            {ex.id === "medium" && "מעבר ממשוואה כללית לתקנית בעזרת השלמה לריבוע, זיהוי מרכז ורדיוס."}
            {ex.id === "advanced" && "מציאת מעגל דרך 3 נקודות, פתרון מערכת משוואות, ומשוואת משיק."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>נוסחאות מרכזיות</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>צורה תקנית</span>
              <span>(x-a)²+(y-b)²=r²</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>צורה כללית</span>
              <span>x²+y²+Dx+Ey+F=0</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>מרכז</span>
              <span>(-D/2, -E/2)</span>
            </div>
          </div>
        </div>

        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>כלים נוספים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>השלמה לריבוע</span>
                  <span>x²+Dx = (x+D/2)²-(D/2)²</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>מיקום נקודה</span>
                  <span>{"< r² = בתוך, = r² = על, > r² = מחוץ"}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {ex.id === "advanced" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ borderRadius: 12, background: `rgba(${s.glowRgb},0.07)`, border: `1px solid rgba(${s.glowRgb},0.25)`, padding: "10px 14px" }}>
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>משיק למעגל</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>ניצב לרדיוס</span>
                  <span>שיפוע_רדיוס x שיפוע_משיק = -1</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>3 נקודות</span>
                  <span>הצבה במשוואה כללית = מערכת 3 משוואות</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: "2rem" }} />

      {/* Diagram */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>

      {/* Problem */}
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>השאלה</div>
          <button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.1)" : "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.2)", color: copiedProblem ? "#15803d" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}
            {copiedProblem ? "הועתק!" : "העתק"}
          </button>
        </div>
        <pre style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>

      {/* Pitfalls */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>שגיאות נפוצות</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", padding: "0.85rem 1rem", marginBottom: 8 }}>
            <div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
            {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
          </div>
        ))}
      </div>

      {/* Prompt Ladder */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>מדריך הפרומפטים</div>
        {ex.id === "basic"  && <LadderBase   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium" && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
      </div>

      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
    </section>
  );
}

// ─── CircleLab (basic) — 3 sliders: a, b, R ────────────────────────────────

function CircleLab() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const [R, setR] = useState(4);
  const st = STATION.basic;

  const eq = `(x${a >= 0 ? `-${a}` : `+${Math.abs(a)}`})² + (y${b >= 0 ? `-${b}` : `+${Math.abs(b)}`})² = ${R * R}`;

  // SVG coordinate mapping: map math coords to SVG pixels
  const svgW = 300, svgH = 300, pad = 30;
  const rangeMin = -10, rangeMax = 10;
  const scale = (svgW - 2 * pad) / (rangeMax - rangeMin);
  const toSvgX = (x: number) => pad + (x - rangeMin) * scale;
  const toSvgY = (y: number) => svgH - pad - (y - rangeMin) * scale;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת מעגל -- צורה תקנית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו מרכז ורדיוס בעזרת הסליידרים וצפו כיצד המעגל והמשוואה משתנים בזמן אמת.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "a (מרכז x)", val: a, set: setA, min: -8, max: 8 },
          { label: "b (מרכז y)", val: b, set: setB, min: -8, max: 8 },
          { label: "R (רדיוס)", val: R, set: setR, min: 1, max: 8 },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={s.min} max={s.max} step={1} value={s.val} onChange={e => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Axes */}
          <line x1={toSvgX(rangeMin)} y1={toSvgY(0)} x2={toSvgX(rangeMax)} y2={toSvgY(0)} stroke="#94a3b8" strokeWidth={1} />
          <line x1={toSvgX(0)} y1={toSvgY(rangeMin)} x2={toSvgX(0)} y2={toSvgY(rangeMax)} stroke="#94a3b8" strokeWidth={1} />
          <text x={toSvgX(rangeMax) - 4} y={toSvgY(0) - 6} fill="#94a3b8" fontSize={10}>x</text>
          <text x={toSvgX(0) + 6} y={toSvgY(rangeMax) + 12} fill="#94a3b8" fontSize={10}>y</text>
          {/* Circle */}
          <circle cx={toSvgX(a)} cy={toSvgY(b)} r={R * scale} fill="none" stroke={st.accentColor} strokeWidth={2} />
          {/* Center */}
          <circle cx={toSvgX(a)} cy={toSvgY(b)} r={4} fill="#f59e0b" />
          <text x={toSvgX(a) + 6} y={toSvgY(b) - 6} fill="#f59e0b" fontSize={11} fontWeight={700}>({a},{b})</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "מרכז", val: `(${a}, ${b})` },
          { label: "רדיוס", val: `${R}` },
          { label: "משוואה", val: eq },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: row.label === "משוואה" ? 12 : 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>הזיזו את המרכז וצפו כיצד המשוואה מתעדכנת -- שימו לב לסימנים!</p>
    </section>
  );
}

// ─── GeneralFormLab (medium) — 3 sliders: D, E, F ───────────────────────────

function GeneralFormLab() {
  const [D, setD] = useState(-6);
  const [E, setE] = useState(-4);
  const [F, setF] = useState(4);
  const st = STATION.medium;

  const cx = -D / 2;
  const cy = -E / 2;
  const rSquared = D * D / 4 + E * E / 4 - F;
  const valid = rSquared > 0;
  const r = valid ? Math.sqrt(rSquared) : 0;

  const svgW = 300, svgH = 300, padSvg = 30;
  const rangeMin = -10, rangeMax = 10;
  const scale = (svgW - 2 * padSvg) / (rangeMax - rangeMin);
  const toSvgX = (x: number) => padSvg + (x - rangeMin) * scale;
  const toSvgY = (y: number) => svgH - padSvg - (y - rangeMin) * scale;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת צורה כללית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את D, E, F וצפו כיצד המרכז והרדיוס משתנים. האם תמיד מתקבל מעגל?</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "D", val: D, set: setD, min: -12, max: 12 },
          { label: "E", val: E, set: setE, min: -12, max: 12 },
          { label: "F", val: F, set: setF, min: -20, max: 20 },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={s.min} max={s.max} step={1} value={s.val} onChange={e => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={toSvgX(rangeMin)} y1={toSvgY(0)} x2={toSvgX(rangeMax)} y2={toSvgY(0)} stroke="#94a3b8" strokeWidth={1} />
          <line x1={toSvgX(0)} y1={toSvgY(rangeMin)} x2={toSvgX(0)} y2={toSvgY(rangeMax)} stroke="#94a3b8" strokeWidth={1} />
          {valid ? (
            <>
              <circle cx={toSvgX(cx)} cy={toSvgY(cy)} r={r * scale} fill="none" stroke={st.accentColor} strokeWidth={2} />
              <circle cx={toSvgX(cx)} cy={toSvgY(cy)} r={4} fill="#f59e0b" />
              <text x={toSvgX(cx) + 6} y={toSvgY(cy) - 6} fill="#f59e0b" fontSize={10} fontWeight={700}>({cx},{cy})</text>
            </>
          ) : (
            <text x={svgW / 2} y={svgH / 2} fill="#dc2626" fontSize={14} textAnchor="middle" fontWeight={700}>אין מעגל</text>
          )}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "מרכז", val: valid ? `(${cx.toFixed(1)}, ${cy.toFixed(1)})` : "---" },
          { label: "רדיוס", val: valid ? r.toFixed(2) : "---" },
          { label: "תקף?", val: valid ? "מעגל תקין" : "r² < 0" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: valid ? st.accentColor : "#dc2626", fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>
        {valid ? "שנו F כלפי מעלה -- מתי המעגל נעלם?" : "r² שלילי -- הגדילו D או E, או הקטינו F כדי לקבל מעגל תקין."}
      </p>
    </section>
  );
}

// ─── TangentLab (advanced) — 2 sliders: angle, radius ───────────────────────

function TangentLab() {
  const [angle, setAngle] = useState(45);
  const [radius, setRadius] = useState(4);
  const st = STATION.advanced;

  const rad = (angle * Math.PI) / 180;
  const px = radius * Math.cos(rad);
  const py = radius * Math.sin(rad);

  // Tangent slope: perpendicular to radius
  // Radius slope = py/px (from origin), tangent slope = -px/py
  const isVerticalRadius = Math.abs(py) < 0.001;
  const isHorizontalRadius = Math.abs(px) < 0.001;
  const tangentSlope = isVerticalRadius ? 0 : isHorizontalRadius ? Infinity : -px / py;
  const tangentSlopeStr = isVerticalRadius ? "0" : isHorizontalRadius ? "אנכי" : tangentSlope.toFixed(2);

  // Right angle check: radius dot tangent direction = 0 (always true by construction)
  const rightAngle = true;

  const svgW = 300, svgH = 300, padSvg = 30;
  const rangeMin = -8, rangeMax = 8;
  const scale = (svgW - 2 * padSvg) / (rangeMax - rangeMin);
  const toSvgX = (x: number) => padSvg + (x - rangeMin) * scale;
  const toSvgY = (y: number) => svgH - padSvg - (y - rangeMin) * scale;

  // Tangent line endpoints
  let tx1: number, ty1: number, tx2: number, ty2: number;
  if (isHorizontalRadius) {
    tx1 = px; ty1 = -6; tx2 = px; ty2 = 6;
  } else {
    const dx = 6;
    tx1 = px - dx; ty1 = py + tangentSlope * (-dx);
    tx2 = px + dx; ty2 = py + tangentSlope * dx;
  }

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת משיק למעגל</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>סובבו נקודה על המעגל ושנו רדיוס -- צפו כיצד המשיק תמיד ניצב לרדיוס.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "זווית על המעגל", val: angle, set: setAngle, min: 0, max: 359, unit: "°" },
          { label: "רדיוס", val: radius, set: setRadius, min: 1, max: 7, unit: "" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}{s.unit}</span>
            </div>
            <input type="range" min={s.min} max={s.max} step={1} value={s.val} onChange={e => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Axes */}
          <line x1={toSvgX(rangeMin)} y1={toSvgY(0)} x2={toSvgX(rangeMax)} y2={toSvgY(0)} stroke="#94a3b8" strokeWidth={1} />
          <line x1={toSvgX(0)} y1={toSvgY(rangeMin)} x2={toSvgX(0)} y2={toSvgY(rangeMax)} stroke="#94a3b8" strokeWidth={1} />
          {/* Circle */}
          <circle cx={toSvgX(0)} cy={toSvgY(0)} r={radius * scale} fill="none" stroke={st.accentColor} strokeWidth={2} />
          {/* Center */}
          <circle cx={toSvgX(0)} cy={toSvgY(0)} r={3} fill="#f59e0b" />
          {/* Radius line */}
          <line x1={toSvgX(0)} y1={toSvgY(0)} x2={toSvgX(px)} y2={toSvgY(py)} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4,3" />
          {/* Point on circle */}
          <circle cx={toSvgX(px)} cy={toSvgY(py)} r={5} fill={st.accentColor} />
          <text x={toSvgX(px) + 8} y={toSvgY(py) - 8} fill={st.accentColor} fontSize={10} fontWeight={700}>P</text>
          {/* Tangent line */}
          <line x1={toSvgX(tx1)} y1={toSvgY(ty1)} x2={toSvgX(tx2)} y2={toSvgY(ty2)} stroke="#a78bfa" strokeWidth={2} />
          {/* Right angle mark */}
          {(() => {
            const markSize = 0.5;
            const rdx = -px / radius * markSize;
            const rdy = -py / radius * markSize;
            const tdx = isHorizontalRadius ? 0 : (1 / Math.sqrt(1 + tangentSlope * tangentSlope)) * markSize;
            const tdy = isHorizontalRadius ? markSize : tangentSlope * tdx;
            if (isVerticalRadius) {
              return <polyline points={`${toSvgX(px + markSize)},${toSvgY(py)} ${toSvgX(px + markSize)},${toSvgY(py + markSize)} ${toSvgX(px)},${toSvgY(py + markSize)}`} fill="none" stroke="#34d399" strokeWidth={1.5} />;
            }
            return <polyline points={`${toSvgX(px + rdx)},${toSvgY(py + rdy)} ${toSvgX(px + rdx + tdx)},${toSvgY(py + rdy + tdy)} ${toSvgX(px + tdx)},${toSvgY(py + tdy)}`} fill="none" stroke="#34d399" strokeWidth={1.5} />;
          })()}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "נקודה P", val: `(${px.toFixed(1)}, ${py.toFixed(1)})` },
          { label: "שיפוע משיק", val: tangentSlopeStr },
          { label: "זווית ישרה", val: rightAngle ? "90°" : "---" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>סובבו את הנקודה -- המשיק (סגול) תמיד ניצב לרדיוס (מקווקו)!</p>
    </section>
  );
}

// ─── Formula Bar ─────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"standard" | "general" | "tangent" | null>(null);

  const tabs = [
    { id: "standard" as const, label: "משוואה תקנית", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "general" as const, label: "משוואה כללית", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "tangent" as const, label: "משיק", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
  ];

  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.75)", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>

      <div style={{ display: "flex", gap: 6, marginBottom: activeTab ? 14 : 0 }}>
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(isActive ? null : t.id)}
              style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${isActive ? t.borderColor : "rgba(60,54,42,0.1)"}`, background: isActive ? `${t.color}0D` : "rgba(60,54,42,0.03)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "standard" && (
        <motion.div key="standard" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"(x - a)^2 + (y - b)^2 = r^2"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>פירוש:</strong>
                <ul dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"(a, b)"}</InlineMath> -- מרכז המעגל</li>
                  <li><InlineMath>{"r"}</InlineMath> -- רדיוס המעגל</li>
                  <li>כל נקודה <InlineMath>{"(x, y)"}</InlineMath> על המעגל מרחקה r מהמרכז</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "general" && (
        <motion.div key="general" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"x^2 + y^2 + Dx + Ey + F = 0"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מעבר לתקנית:</strong>
                <ul dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מרכז: <InlineMath>{"\\left(-\\frac{D}{2},\\;-\\frac{E}{2}\\right)"}</InlineMath></li>
                  <li>רדיוס: <InlineMath>{"r = \\sqrt{\\frac{D^2}{4} + \\frac{E^2}{4} - F}"}</InlineMath></li>
                  <li>תנאי קיום: <InlineMath>{"\\frac{D^2}{4} + \\frac{E^2}{4} - F > 0"}</InlineMath></li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "tangent" && (
        <motion.div key="tangent" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#DC2626", fontSize: 16, fontWeight: 700 }}>
              משיק למעגל בנקודה
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>עקרונות:</strong>
                <ul dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>המשיק ניצב לרדיוס בנקודת ההשקה</li>
                  <li><InlineMath>{"m_{radius} \\cdot m_{tangent} = -1"}</InlineMath></li>
                  <li>אם הרדיוס אנכי -- המשיק אופקי, ולהיפך</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CircleEquationPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "163,79,38" : "139,38,53";

  return (
    <main
      style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties}
      dir="rtl"
    >
      <style>{`
        textarea, input[type="text"], input[type="password"] { outline: none !important; }
        textarea:focus, input[type="text"]:focus { outline: none !important; border-color: rgba(var(--lvl-rgb), 0.65) !important; box-shadow: 0 0 0 3px rgba(var(--lvl-rgb), 0.12) !important; }
        input[type="range"] { outline: none !important; }
        input[type="range"]:focus { outline: none !important; }
        button:focus, button:focus-visible { outline: none !important; box-shadow: 0 0 0 2px rgba(var(--lvl-rgb), 0.35) !important; }
        button:focus:not(:focus-visible) { box-shadow: none !important; }
      `}</style>

      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>משוואת המעגל עם AI -- כיתה י׳ (5 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>צורה תקנית, השלמה לריבוע, משיק -- ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/5u/topic/grade10/analytic"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
          >
            <span style={{ fontSize: 16 }}>&#8592;</span>
            חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>

        <SubtopicProgress subtopicId="5u/grade10/analytic/circle" />

        {/* Level Selector */}
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(60,54,42,0.15)" }}>
          {TABS.map(tab => {
            const active = selectedLevel === tab.id;
            return (
              <button key={tab.id} onClick={() => setSelectedLevel(tab.id as typeof selectedLevel)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active ? `${tab.bg} border ${tab.border} ${tab.textColor}` : "text-stone-500 hover:text-stone-800"}`}
                style={active ? { boxShadow: `0 0 14px ${tab.glowColor}` } : undefined}>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Formula Bar */}
        <FormulaBar />

        {/* Active card */}
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        {/* Lab — each level gets its own lab */}
        {selectedLevel === "basic" && <CircleLab />}
        {selectedLevel === "medium" && <GeneralFormLab />}
        {selectedLevel === "advanced" && <TangentLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="5u/grade10/analytic/circle" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
