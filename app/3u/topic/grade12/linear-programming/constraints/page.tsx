"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import LabMessage from "@/app/components/LabMessage";
import { useDefaultToast } from "@/app/lib/useDefaultToast";
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

type PromptStep = {
  phase: string;
  label: string;
  coaching: string;
  prompt: string;
  keywords: string[];
  keywordHint: string;
  contextWords?: string[];
  stationWords?: string[];
};

type ExerciseDef = {
  id: "basic" | "medium" | "advanced";
  title: string;
  problem: string;
  diagram: React.ReactNode;
  pitfalls: { title: string; text: string }[];
  goldenPrompt: string;
  advancedGateQuestion?: string;
  steps: PromptStep[];
};

// ─── Station config ───────────────────────────────────────────────────────────

const STATION = {
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",  ladderBorder: "#16A34A", glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderHex: "#2D5A27", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700", ladderBorder: "#EA580C", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderHex: "#A34F26", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",    ladderBorder: "#DC2626", glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderHex: "#8B2635", borderRgb: "139,38,53" },
} as const;

// ─── SVG diagrams (silent — no numbers, no answers) ──────────────────────────

function BasicSVG() {
  return (
    <svg viewBox="0 0 260 220" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={40} y1={190} x2={240} y2={190} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={40} y1={190} x2={40} y2={20} stroke="#94a3b8" strokeWidth={1.5} />
      <text x={245} y={194} fontSize={11} fill="#94a3b8" fontFamily="sans-serif">x</text>
      <text x={36} y={14} fontSize={11} fill="#94a3b8" fontFamily="sans-serif" textAnchor="middle">y</text>
      {/* Constraint line 1 */}
      <line x1={40} y1={60} x2={200} y2={190} stroke="#f59e0b" strokeWidth={2} />
      <text x={125} y={108} fontSize={10} fill="#f59e0b" fontFamily="sans-serif" textAnchor="middle" transform="rotate(-39,125,108)">L&#8321;</text>
      {/* Constraint line 2 */}
      <line x1={40} y1={140} x2={230} y2={40} stroke="#a78bfa" strokeWidth={2} />
      <text x={150} y={75} fontSize={10} fill="#a78bfa" fontFamily="sans-serif" textAnchor="middle" transform="rotate(28,150,75)">L&#8322;</text>
      {/* Shaded feasible region outline */}
      <path d="M40,190 L40,140 L95,118 L145,190 Z" fill="#34d399" fillOpacity={0.12} stroke="#34d399" strokeWidth={1.5} strokeDasharray="6,3" />
      <text x={85} y={165} fontSize={10} fill="#34d399" fontFamily="sans-serif" textAnchor="middle">?</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 260 220" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={40} y1={190} x2={240} y2={190} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={40} y1={190} x2={40} y2={20} stroke="#94a3b8" strokeWidth={1.5} />
      <text x={245} y={194} fontSize={11} fill="#94a3b8" fontFamily="sans-serif">x</text>
      <text x={36} y={14} fontSize={11} fill="#94a3b8" fontFamily="sans-serif" textAnchor="middle">y</text>
      {/* Constraint lines */}
      <line x1={40} y1={50} x2={210} y2={190} stroke="#f59e0b" strokeWidth={1.5} />
      <line x1={40} y1={150} x2={230} y2={50} stroke="#a78bfa" strokeWidth={1.5} />
      <line x1={60} y1={30} x2={190} y2={190} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4,3" />
      {/* Polygon (feasible) */}
      <polygon points="40,150 40,190 120,190 130,145 80,110" fill="#34d399" fillOpacity={0.1} stroke="#34d399" strokeWidth={1.5} />
      {/* Vertex markers */}
      {[[40,150],[40,190],[120,190],[130,145],[80,110]].map(([cx,cy],i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={5} fill="white" stroke="#EA580C" strokeWidth={2} />
          <text x={cx} y={cy-9} fontSize={10} fill="#EA580C" fontFamily="sans-serif" textAnchor="middle">?</text>
        </g>
      ))}
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 260 220" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={40} y1={190} x2={240} y2={190} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={40} y1={190} x2={40} y2={20} stroke="#94a3b8" strokeWidth={1.5} />
      <text x={245} y={194} fontSize={11} fill="#94a3b8" fontFamily="sans-serif">x</text>
      <text x={36} y={14} fontSize={11} fill="#94a3b8" fontFamily="sans-serif" textAnchor="middle">y</text>
      {/* Constraint lines (dashed) */}
      <line x1={40} y1={55} x2={200} y2={190} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,3" />
      <line x1={40} y1={130} x2={220} y2={55} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="5,3" />
      <line x1={80} y1={30} x2={180} y2={190} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4,3" />
      {/* Feasible polygon */}
      <polygon points="40,130 40,190 110,190 135,150 100,100" fill="#34d399" fillOpacity={0.1} stroke="#34d399" strokeWidth={1.5} />
      {/* Iso-profit line hint */}
      <line x1={60} y1={80} x2={180} y2={120} stroke="#DC2626" strokeWidth={1.5} strokeDasharray="3,4" />
      <text x={185} y={118} fontSize={9} fill="#DC2626" fontFamily="sans-serif">Z = ?</text>
      {/* Vertex markers */}
      {[[40,130],[40,190],[110,190],[135,150],[100,100]].map(([cx,cy],i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={4} fill="white" stroke="#DC2626" strokeWidth={1.8} />
        </g>
      ))}
    </svg>
  );
}

// ─── Prompt Coach Atoms ───────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(60,54,42,0.25)", color: "#1A1A1A", fontWeight: 500, cursor: "pointer" }}
    >
      {c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}
    </button>
  );
}

function GoldenPromptCard({ prompt, title = "פרומפט ראשי", glowRgb = "16,185,129", borderRgb = "45,90,39" }: { prompt: string; title?: string; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span>✨</span>
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
      </div>
      <p style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p>
      <CopyBtn text={prompt} label="העתק פרומפט מלא" />
    </div>
  );
}

function TutorStepBasic({ step, glowRgb = "16,185,129", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(${glowRgb},0.45)`, marginBottom: 8, boxShadow: `0 0 14px rgba(${glowRgb},0.18)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}>
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>הפרומפט המוכן ✍️</div>
          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div>
        </div>
        <CopyBtn text={step.prompt} label="העתק פרומפט ממוקד" />
      </div>
    </div>
  );
}

function TutorStepMedium({ step, locked = false, onPass, borderRgb = "45,90,39" }: { step: PromptStep; locked?: boolean; onPass?: () => void; borderRgb?: string }) {
  const [text, setText]     = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);

  const passed = !!(result && !result.blocked && result.score >= 75);

  const validate = () => {
    if (text.trim().length < 20) {
      setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי — כתוב לפחות 20 תווים." });
      return;
    }
    const res = calculatePromptScore(text, step.contextWords ?? []);
    setResult(res);
    if (!res.blocked && res.score >= 75) onPass?.();
  };

  if (locked) return (
    <div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.3)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 16 }}>🔒</span>
      <div>
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span>
      </div>
    </div>
  );

  const scoreBarColor = !result ? "#9CA3AF"
    : result.score >= 75 ? "#16a34a"
    : result.score >= 50 ? "#d97706"
    : "#dc2626";

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(245,158,11,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8, boxShadow: passed ? "0 0 16px rgba(245,158,11,0.25)" : "none", transition: "border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(245,158,11,0.3)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl" disabled={passed}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(245,158,11,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {result && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", marginBottom: 4, fontWeight: 600 }}>
              <span>ציון הפרומפט</span>
              <span style={{ color: "#1A1A1A", fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}

        {!result && (
          <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>
            בדיקת AI מדומה 🤖
          </button>
        )}

        {result && result.blocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            ⚠️ {result.hint}
          </motion.div>
        )}

        {result && !result.blocked && result.score < 75 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            💡 {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
              ✅ פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result.score}/100</strong>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}
            </button>
          </motion.div>
        )}

        {result && !passed && (
          <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>
        )}
      </div>
    </div>
  );
}

function TutorStepAdvanced({ step, locked = false, onPass }: { step: PromptStep; locked?: boolean; onPass?: () => void }) {
  const [text, setText]       = useState("");
  const [result, setResult]   = useState<ScoreResult | null>(null);
  const [copied, setCopied]   = useState(false);
  const passed = result?.score !== undefined && result.score >= 90 && !result.blocked;

  const ROSE = { border: "rgba(244,63,94,0.35)", dim: "rgba(244,63,94,0.2)", text: "#fda4af" };

  if (locked) return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.3)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <span>🔒</span><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} — {step.label}</span>
    </div>
  );

  const validate = () => {
    if (text.trim().length < 20) {
      setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי — כתוב לפחות 20 תווים." });
      return;
    }
    const r = calculatePromptScore(text, step.contextWords ?? []);
    setResult(r);
    if (!r.blocked && r.score >= 90 && onPass) onPass();
  };

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(52,211,153,0.35)" : ROSE.border}`, marginBottom: 8, transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(52,211,153,0.2)" : "rgba(244,63,94,0.2)"}` }}>
        {passed
          ? <CheckCircle size={14} color="#34d399" />
          : <span style={{ color: ROSE.text, fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>

      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl"
          readOnly={passed}
          onChange={(e) => { if (!passed) { setText(e.target.value); setResult(null); } }}
          placeholder="כתוב את הפרומפט שלך לסעיף זה..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(52,211,153,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", fontWeight: 600 }}>
              <span>ציון</span>
              <span style={{ color: "#1A1A1A", fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}

        {result && !passed && result.hint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.6, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>
            {result.blocked ? "⚠️" : "💡"} {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>✅ ניסוח מעולה! הסעיף הבא נפתח.</div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ניסוח"}
            </button>
          </motion.div>
        )}

        {!passed && (
          <button onClick={validate}
            style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid ${ROSE.border}`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>
            בדיקת AI מדומה 🤖
          </button>
        )}
      </div>
    </div>
  );
}

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
      <GoldenPromptCard prompt={goldenPrompt} title="פרומפט ראשי" glowRgb={glowRgb} borderRgb={borderRgb} />
      {steps.map((s, i) => (
        <div key={i} id={`basic-step-${i}`}>
          {i < unlocked ? (
            <>
              <TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />
              {!completed[i] ? (
                <button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>
                  סיימתי סעיף זה ✓
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✅ הושלם</div>
              )}
            </>
          ) : (
            <div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}>
              <div style={{ position: "absolute", top: 8, right: 8, fontSize: 16, zIndex: 2 }}>🔒</div>
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
        <TutorStepMedium
          key={i} step={s}
          locked={i > 0 && !passed[i - 1]}
          onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })}
          borderRgb={borderRgb}
        />
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
        subjectWords={["אילוץ", "תחום אפשרי", "קודקוד", "אי-שוויון", "ישר", "חיתוך"]}
      />

      {steps.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {(!masterPassed || i >= unlockedCount) ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.7)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{ s.phase } — { s.label }</span>
              <span style={{ fontSize: 16 }}>🔒</span>
            </div>
          ) : (
            <div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(255,255,255,0.9)", padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{ s.phase } — { s.label }</div>
                <div style={{ color: "#334155", fontSize: 13, lineHeight: 1.6 }}>{ s.prompt }</div>
              </div>
              <button onClick={() => setUnlockedCount(v => Math.max(v, i + 2))} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>
                סיימתי סעיף זה ✓
              </button>
            </div>
          )}
        </div>
      ))}

      {allPassed && (
        <div style={{ borderRadius: 16, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: "1.25rem 1.5rem", marginTop: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
          <div style={{ color: "#14532d", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>כל הכבוד — השלמת את הרמה המתקדמת!</div>
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
    title: "כתיבת אילוצים מטקסט",
    problem: "מפעל מייצר שני מוצרים: מוצר A ומוצר B.\nלייצור מוצר A נדרשות 2 שעות עבודה ו-3 ק\"ג חומר גלם.\nלייצור מוצר B נדרשות 4 שעות עבודה ו-2 ק\"ג חומר גלם.\nסה\"כ יש למפעל 40 שעות עבודה ו-30 ק\"ג חומר גלם.\n\nא. הגדירו משתנים וכתבו את כל אי-השוויונות (אילוצים) הנובעים מהטקסט.\nב. לכל אילוץ — זהו באיזה צד של הישר נמצא התחום שמקיים את אי-השוויון.\nג. סמנו על מערכת צירים את התחום האפשרי (חיתוך כל חצאי-המישורים).",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ שוכחים את אילוצי האי-שליליות", text: "בכל בעיית תכנות לינארי חייבים לכלול x >= 0 ו-y >= 0. בלי אילוצים אלה, התחום האפשרי עשוי לכלול ערכים שליליים חסרי משמעות (כמות שלילית של מוצרים)." },
      { title: "⚠️ כיוון האי-שוויון — קטן-שווה מול גדול-שווה", text: "כשיש מגבלת משאבים (\"יש לכל היותר 40 שעות\") — האילוץ הוא <=. כשיש דרישת מינימום (\"לפחות 10 יחידות\") — האילוץ הוא >=. בלבול בכיוון הופך את התחום." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יב', 3 יחידות, ומצרף/ת שאלה בתכנות לינארי על כתיבת אילוצים מטקסט מילולי. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "כתיבת אילוצים", coaching: "", prompt: "מפעל מייצר מוצר A (2 שעות, 3 ק\"ג) ומוצר B (4 שעות, 2 ק\"ג). יש 40 שעות ו-30 ק\"ג. תנחה אותי להגדיר משתנים ולכתוב את כל אי-השוויונות, כולל אילוצי אי-שליליות.", keywords: [], keywordHint: "", contextWords: ["אילוץ", "אי-שוויון", "משתנים", "שעות", "חומר", "אי-שליליות"] },
      { phase: "סעיף ב׳", label: "זיהוי צד האי-שוויון", coaching: "", prompt: "נתונים אילוצים לינאריים של מפעל עם שני מוצרים. תדריך אותי כיצד לבדוק באיזה צד של כל ישר נמצא התחום שמקיים את האי-שוויון — בעזרת הצבת נקודה.", keywords: [], keywordHint: "", contextWords: ["ישר", "צד", "הצבה", "נקודה", "חצי-מישור", "מקיים"] },
      { phase: "סעיף ג׳", label: "סימון התחום האפשרי", coaching: "", prompt: "נתונים אילוצים לינאריים כולל x>=0 ו-y>=0. תסביר לי איך לסמן את התחום האפשרי כחיתוך של כל חצאי-המישורים על מערכת צירים.", keywords: [], keywordHint: "", contextWords: ["תחום", "אפשרי", "חיתוך", "חצי-מישור", "צירים", "סימון"] },
    ],
  },
  {
    id: "medium",
    title: "מציאת קודקודי התחום",
    problem: "נתונות שלוש אי-שוויונות:\n2x + y <= 10\nx + 3y <= 12\nx + y <= 6\nוכן: x >= 0, y >= 0\n\nא. מצאו את נקודות החיתוך של כל זוג ישרי גבול.\nב. בדקו אילו מנקודות החיתוך נמצאות בתוך התחום האפשרי (מקיימות את כל האילוצים).\nג. רשמו את רשימת הקודקודים לפי סדר (נגד כיוון השעון).",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ הכללת נקודות חיתוך מחוץ לתחום", text: "לא כל נקודת חיתוך של שני ישרי גבול היא קודקוד של התחום! חובה להציב כל נקודת חיתוך בכל האילוצים ולוודא שהיא מקיימת את כולם." },
      { title: "⚠️ שכחת נקודות חיתוך עם הצירים", text: "ישרי הגבול x=0 ו-y=0 (הצירים) גם הם חלק מהמערכת. יש לחשב גם חיתוכים של ישרי האילוצים עם הצירים — אלה לעיתים קודקודים חשובים." },
    ],
    goldenPrompt: `אני בכיתה יב', 3 יחידות, מצרף/ת תרגיל בתכנות לינארי בנושא מציאת קודקודי התחום האפשרי.

אל תיתן לי את הפתרון — שאל אותי שאלות מנחות על חיתוך ישרים, בדיקת שייכות לתחום, וסידור קודקודים.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "חיתוך זוגות ישרים", coaching: "", prompt: "נתונים 3 אילוצים: 2x+y<=10, x+3y<=12, x+y<=6 עם x>=0, y>=0. תנחה אותי למצוא את נקודות החיתוך של כל זוג ישרי גבול — פתרון מערכת שוויונים.", keywords: [], keywordHint: "", contextWords: ["חיתוך", "ישר", "מערכת", "משוואות", "נקודה", "זוג"] },
      { phase: "סעיף ב׳", label: "בדיקת שייכות לתחום", coaching: "", prompt: "מצאתי נקודות חיתוך של ישרי גבול. תדריך אותי כיצד לבדוק אם כל נקודה מקיימת את כל האילוצים (2x+y<=10, x+3y<=12, x+y<=6, x>=0, y>=0).", keywords: [], keywordHint: "", contextWords: ["הצבה", "אילוץ", "מקיימת", "תחום", "בדיקה", "קודקוד"] },
      { phase: "סעיף ג׳", label: "רשימת קודקודים מסודרת", coaching: "", prompt: "נתונות נקודות שנמצאו כקודקודי התחום האפשרי. תסביר לי כיצד לסדר אותן נגד כיוון השעון ולרשום את הרשימה.", keywords: [], keywordHint: "", contextWords: ["קודקוד", "סדר", "כיוון", "שעון", "רשימה", "מצולע"] },
    ],
  },
  {
    id: "advanced",
    title: "בעיה מילולית מלאה",
    problem: "חקלאי מגדל חיטה ותירס.\nלכל דונם חיטה נדרשת השקעה של 200 ש\"ח, ולכל דונם תירס — 300 ש\"ח.\nהתקציב הכולל: 6,000 ש\"ח.\nשטח הקרקע: 25 דונם.\nמגבלה נוספת: שטח התירס לא יעלה על 15 דונם.\n\nא. הגדירו משתנים וכתבו את כל האילוצים.\nב. שרטטו את התחום האפשרי על מערכת צירים.\nג. מצאו את כל קודקודי התחום.\nד. אם הרווח מדונם חיטה הוא 50 ש\"ח ומדונם תירס 80 ש\"ח — באיזה קודקוד מתקבל רווח מרבי?",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ תרגום שגוי מטקסט לאי-שוויון", text: "\"שטח התירס לא יעלה על 15\" פירושו y <= 15, לא y >= 15. יש לקרוא בקפידה את הטקסט ולוודא שכיוון האי-שוויון תואם את המשמעות." },
      { title: "⚠️ שכחת לבדוק את כל הקודקודים", text: "המקסימום של פונקציית המטרה תמיד מתקבל באחד מקודקודי התחום. יש להציב את כולם — לא להניח מראש איזה קודקוד נותן מקסימום." },
    ],
    goldenPrompt: "\n\n",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמנחה AI לעזור לך לפתור בעיה מילולית בתכנות לינארי: תרגום טקסט לאילוצים, שרטוט תחום אפשרי, מציאת קודקודים ובדיקת רווח מרבי. (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "הגדרת משתנים ואילוצים", coaching: "", prompt: "חקלאי מגדל חיטה ותירס. השקעה: 200/300 ש\"ח לדונם, תקציב 6000, שטח 25 דונם, תירס עד 15 דונם. תנחה אותי להגדיר משתנים ולכתוב את כל האילוצים.", keywords: [], keywordHint: "", contextWords: ["משתנים", "אילוץ", "תקציב", "שטח", "אי-שוויון", "אי-שליליות"] },
      { phase: "סעיף ב׳", label: "שרטוט התחום האפשרי", coaching: "", prompt: "נתונים אילוצים של חקלאי (חיטה ותירס). תדריך אותי כיצד לשרטט את ישרי הגבול ולסמן את התחום האפשרי.", keywords: [], keywordHint: "", contextWords: ["שרטוט", "ישר", "גבול", "תחום", "אפשרי", "צירים"] },
      { phase: "סעיף ג׳", label: "מציאת קודקודים", coaching: "", prompt: "אחרי שרטוט התחום האפשרי של בעיית החקלאי — תנחה אותי למצוא את כל קודקודי המצולע על ידי פתרון מערכות משוואות.", keywords: [], keywordHint: "", contextWords: ["קודקוד", "חיתוך", "מערכת", "משוואות", "מצולע", "פתרון"] },
      { phase: "סעיף ד׳", label: "רווח מרבי בקודקוד", coaching: "", prompt: "נתונה פונקציית רווח Z=50x+80y וקודקודי התחום האפשרי. תסביר לי כיצד למצוא את הקודקוד שנותן רווח מרבי.", keywords: [], keywordHint: "", contextWords: ["רווח", "פונקציית מטרה", "קודקוד", "מרבי", "הצבה", "השוואה"] },
    ],
  },
];

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() {
    navigator.clipboard.writeText(ex.problem.split(/\n+[אבגדהוזחט]\./)[0].trim());
    setCopiedProblem(true);
    setTimeout(() => setCopiedProblem(false), 2000);
  }
  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Properties box */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem 1.5rem", marginBottom: "2rem", boxShadow: s.glowShadow }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📐 תכנות לינארי — אילוצים ותחום אפשרי</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "כתיבת אילוצים מטקסט מילולי — תרגום מילים לאי-שוויונות וזיהוי התחום."}
            {ex.id === "medium" && "מציאת קודקודי התחום האפשרי — חיתוך ישרים ובדיקת שייכות."}
            {ex.id === "advanced" && "בעיה מילולית מלאה — מהגדרת אילוצים ועד מציאת רווח מרבי."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: אילוצים */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📏 מושגים בסיסיים</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>אילוץ</span>
              <span>אי-שוויון לינארי שמגביל את תחום הפתרון.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>תחום אפשרי</span>
              <span>חיתוך כל חצאי-המישורים שמקיימים את האילוצים.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>קודקוד</span>
              <span>נקודת חיתוך של שני ישרי גבול על שפת התחום.</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>✨ מציאת קודקודים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>חיתוך</span>
                  <span>פתרון מערכת של שני ישרי גבול כמשוואות.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>בדיקה</span>
                  <span>הצבת הנקודה בכל האילוצים — רק נקודה שמקיימת הכול היא קודקוד.</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Advanced extras */}
        {ex.id === "advanced" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ borderRadius: 12, background: `rgba(${s.glowRgb},0.07)`, border: `1px solid rgba(${s.glowRgb},0.25)`, padding: "10px 14px" }}>
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>🔬 פונקציית מטרה ומקסימום</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>Z = ax+by</span>
                  <span>פונקציית המטרה — הרווח או העלות שרוצים למקסם/למזער.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>משפט</span>
                  <span>המקסימום/מינימום של Z תמיד מתקבל באחד מקודקודי התחום.</span>
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
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>📝 השאלה</div>
          <button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.1)" : "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.2)", color: copiedProblem ? "#15803d" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}
            {copiedProblem ? "הועתק!" : "העתק"}
          </button>
        </div>
        <pre style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>

      {/* Pitfalls */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>⚠️ שגיאות נפוצות</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", padding: "0.85rem 1rem", marginBottom: 8 }}>
            <div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
            {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
          </div>
        ))}
      </div>

      {/* Prompt Ladder */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
        {ex.id === "basic"    && <LadderBase     steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
      </div>

      {/* Advanced — outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}

    </section>
  );
}

// ─── InequalityLab (basic) ──────────────────────────────────────────────────

function InequalityLab() {
  const [a, setA] = useState(2);
  const [b, setB] = useState(3);
  const [c, setC] = useState(12);
  const st = STATION.basic;

  const xInt = b !== 0 ? c / a : Infinity;
  const yInt = a !== 0 ? c / b : Infinity;

  // SVG coordinate system: map math coords to pixel coords
  const pad = 40, w = 220, h = 180;
  const maxCoord = Math.max(Math.abs(xInt), Math.abs(yInt), 8) * 1.2;
  const toX = (v: number) => pad + (v / maxCoord) * w;
  const toY = (v: number) => pad + h - (v / maxCoord) * h;

  // Line endpoints for clipping to first quadrant
  const x0 = 0, y0 = a !== 0 && b !== 0 ? c / b : 0;
  const x1 = a !== 0 && b !== 0 ? c / a : 0, y1 = 0;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת אי-שוויון לינארי</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את מקדמי האי-שוויון ax + by &le; c וצפו בישר ובחצי-המישור המתאים.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "a", val: a, set: setA, min: 1, max: 10 },
          { label: "b", val: b, set: setB, min: 1, max: 10 },
          { label: "c", val: c, set: setC, min: 2, max: 30 },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={s.min} max={s.max} step={1} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${pad * 2 + w} ${pad * 2 + h}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Axes */}
          <line x1={toX(0)} y1={toY(0)} x2={toX(maxCoord)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={toX(0)} y1={toY(0)} x2={toX(0)} y2={toY(maxCoord)} stroke="#94a3b8" strokeWidth={1.5} />
          <text x={toX(maxCoord) + 5} y={toY(0) + 4} fontSize={11} fill="#94a3b8" fontFamily="sans-serif">x</text>
          <text x={toX(0) - 4} y={toY(maxCoord) - 5} fontSize={11} fill="#94a3b8" fontFamily="sans-serif" textAnchor="middle">y</text>

          {/* Shaded region (triangle in first quadrant) */}
          <polygon
            points={`${toX(0)},${toY(0)} ${toX(Math.min(x1, maxCoord))},${toY(0)} ${toX(0)},${toY(Math.min(y0, maxCoord))}`}
            fill="#34d399" fillOpacity={0.15}
          />

          {/* Constraint line */}
          <line
            x1={toX(0)} y1={toY(Math.min(y0, maxCoord * 1.1))}
            x2={toX(Math.min(x1, maxCoord * 1.1))} y2={toY(0)}
            stroke="#f59e0b" strokeWidth={2}
          />
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "משוואת הישר", val: `${a}x + ${b}y = ${c}` },
          { label: "חיתוך ציר x", val: (c / a).toFixed(1) },
          { label: "חיתוך ציר y", val: (c / b).toFixed(1) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>האזור הירוק הוא חצי-המישור שמקיים את האי-שוויון (כולל ציר x וציר y).</p>
    </section>
  );
}

// ─── FeasibleRegionLab (medium) ──────────────────────────────────────────────

function FeasibleRegionLab() {
  const [c1, setC1] = useState(10);
  const [c2, setC2] = useState(12);
  const st = STATION.medium;

  // Constraints: 2x + y <= c1, x + 3y <= c2, x >= 0, y >= 0
  // Boundary lines: 2x + y = c1 and x + 3y = c2
  // Vertices of feasible region (first quadrant):
  // (0, 0), (c1/2, 0), intersection, (0, c2/3)
  // Intersection: 2x + y = c1, x + 3y = c2
  //   from first: y = c1 - 2x
  //   sub:       x + 3(c1 - 2x) = c2  =>  x + 3c1 - 6x = c2  => -5x = c2 - 3c1 => x = (3c1 - c2) / 5
  const ix = (3 * c1 - c2) / 5;
  const iy = c1 - 2 * ix;

  const vertices: [number, number][] = [];
  vertices.push([0, 0]);
  if (c1 / 2 > 0) vertices.push([c1 / 2, 0]);
  if (ix >= 0 && iy >= 0) vertices.push([ix, iy]);
  if (c2 / 3 > 0) vertices.push([0, c2 / 3]);

  // Compute area using Shoelace formula
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const [x0, y0] = vertices[i];
    const [x1, y1] = vertices[(i + 1) % vertices.length];
    area += x0 * y1 - x1 * y0;
  }
  area = Math.abs(area) / 2;

  const maxCoord = Math.max(c1 / 2, c2 / 3, 6) * 1.3;
  const pad = 40, w = 220, hh = 180;
  const toX = (v: number) => pad + (v / maxCoord) * w;
  const toY = (v: number) => pad + hh - (v / maxCoord) * hh;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת תחום אפשרי</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את גבולות האילוצים וצפו כיצד התחום האפשרי וקודקודיו משתנים.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "גבול אילוץ 1 (2x+y ≤ ?)", val: c1, set: setC1, min: 4, max: 20 },
          { label: "גבול אילוץ 2 (x+3y ≤ ?)", val: c2, set: setC2, min: 4, max: 20 },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={s.min} max={s.max} step={1} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${pad * 2 + w} ${pad * 2 + hh}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Axes */}
          <line x1={toX(0)} y1={toY(0)} x2={toX(maxCoord)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={toX(0)} y1={toY(0)} x2={toX(0)} y2={toY(maxCoord)} stroke="#94a3b8" strokeWidth={1.5} />

          {/* Constraint lines */}
          <line x1={toX(0)} y1={toY(c1)} x2={toX(c1 / 2)} y2={toY(0)} stroke="#f59e0b" strokeWidth={1.5} />
          <line x1={toX(0)} y1={toY(c2 / 3)} x2={toX(c2)} y2={toY(0)} stroke="#a78bfa" strokeWidth={1.5} />

          {/* Feasible region */}
          {vertices.length >= 3 && (
            <polygon
              points={vertices.map(([vx, vy]) => `${toX(vx)},${toY(vy)}`).join(" ")}
              fill="#34d399" fillOpacity={0.15} stroke="#34d399" strokeWidth={1.5}
            />
          )}

          {/* Vertex markers */}
          {vertices.map(([vx, vy], i) => (
            <g key={i}>
              <circle cx={toX(vx)} cy={toY(vy)} r={5} fill="white" stroke={st.accentColor} strokeWidth={2} />
              <text x={toX(vx)} y={toY(vy) - 10} fontSize={9} fill={st.accentColor} fontFamily="monospace" textAnchor="middle">({vx.toFixed(1)},{vy.toFixed(1)})</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "מספר קודקודים", val: String(vertices.length) },
          { label: "שטח התחום", val: area.toFixed(1) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>הגדילו או הקטינו את הגבולות — שימו לב כיצד הקודקודים זזים והשטח משתנה.</p>
    </section>
  );
}

// ─── ProfitPreviewLab (advanced) ─────────────────────────────────────────────

function ProfitPreviewLab() {
  const [pWheat, setPWheat] = useState(50);
  const [pCorn, setPCorn]   = useState(80);
  const st = STATION.advanced;

  // Fixed feasible region vertices (from advanced exercise — simplified)
  // Budget: 200x + 300y <= 6000 => 2x + 3y <= 60
  // Land:   x + y <= 25
  // Corn:   y <= 15
  // x >= 0, y >= 0
  const verts: [number, number][] = [
    [0, 0],
    [25, 0],
    [15, 10],  // intersection of x+y=25 and 2x+3y=60: y=60-2*25+2y => x+y=25, 2x+3y=60 => 2(25-y)+3y=60 => 50-2y+3y=60 => y=10, x=15
    [0, 15],   // intersection of y=15 and x=0 (check: 2*0+3*15=45<=60, 0+15=15<=25)
  ];
  // Wait, let me recalculate: at y=15, 2x+3*15<=60 => 2x<=15 => x<=7.5, and x+15<=25 => x<=10, so x<=7.5
  // So actually vertex at (7.5, 15) instead of (0,15) if considering 2x+3y=60 and y=15
  // Vertices: (0,0), (25,0), (15,10), (7.5,15), (0,15)
  // Check (0,15): 2*0+3*15=45<=60 yes, 0+15=15<=25 yes, 15<=15 yes. Good.
  // Check (7.5,15): 2*7.5+3*15=15+45=60<=60 yes, 7.5+15=22.5<=25 yes. Good.
  // Between (15,10) and (7.5,15) — on line 2x+3y=60
  // Between (7.5,15) and (0,15) — on line y=15
  const actualVerts: [number, number][] = [
    [0, 0],
    [25, 0],
    [15, 10],
    [7.5, 15],
    [0, 15],
  ];

  // Calculate profit at each vertex
  const profits = actualVerts.map(([x, y]) => pWheat * x + pCorn * y);
  const maxProfit = Math.max(...profits);
  const maxIdx = profits.indexOf(maxProfit);
  const maxVertex = actualVerts[maxIdx];

  // SVG
  const maxCoord = 32;
  const padS = 40, wS = 220, hS = 180;
  const toX = (v: number) => padS + (v / maxCoord) * wS;
  const toY = (v: number) => padS + hS - (v / maxCoord) * hS;

  // Iso-profit line: pWheat * x + pCorn * y = maxProfit / 2 (arbitrary level for visualization)
  const isoLevel = maxProfit * 0.6;
  const isoX0 = 0;
  const isoY0 = pCorn > 0 ? isoLevel / pCorn : 0;
  const isoX1 = pWheat > 0 ? isoLevel / pWheat : 0;
  const isoY1 = 0;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת רווח מרבי</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את הרווח לדונם חיטה/תירס וצפו כיצד קו הרווח השווה (iso-profit) זז — והמקסימום תמיד בקודקוד!</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "רווח לדונם חיטה (x)", val: pWheat, set: setPWheat, min: 10, max: 150 },
          { label: "רווח לדונם תירס (y)", val: pCorn, set: setPCorn, min: 10, max: 150 },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={s.min} max={s.max} step={5} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${padS * 2 + wS} ${padS * 2 + hS}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Axes */}
          <line x1={toX(0)} y1={toY(0)} x2={toX(maxCoord)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={toX(0)} y1={toY(0)} x2={toX(0)} y2={toY(maxCoord)} stroke="#94a3b8" strokeWidth={1.5} />
          <text x={toX(maxCoord) + 5} y={toY(0) + 4} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">x (חיטה)</text>
          <text x={toX(0) - 4} y={toY(maxCoord) - 5} fontSize={10} fill="#94a3b8" fontFamily="sans-serif" textAnchor="middle">y (תירס)</text>

          {/* Feasible region */}
          <polygon
            points={actualVerts.map(([vx, vy]) => `${toX(vx)},${toY(vy)}`).join(" ")}
            fill="#34d399" fillOpacity={0.12} stroke="#34d399" strokeWidth={1.5}
          />

          {/* Iso-profit line */}
          <line
            x1={toX(Math.min(isoX0, maxCoord))} y1={toY(Math.min(isoY0, maxCoord))}
            x2={toX(Math.min(isoX1, maxCoord))} y2={toY(Math.min(isoY1, maxCoord))}
            stroke="#DC2626" strokeWidth={1.5} strokeDasharray="5,3"
          />
          <text x={toX(Math.min(isoX1, maxCoord)) + 3} y={toY(Math.min(isoY1, maxCoord)) - 5} fontSize={8} fill="#DC2626" fontFamily="sans-serif">Z = const</text>

          {/* Vertex markers */}
          {actualVerts.map(([vx, vy], i) => (
            <g key={i}>
              <circle cx={toX(vx)} cy={toY(vy)} r={i === maxIdx ? 7 : 4} fill={i === maxIdx ? "#DC2626" : "white"} stroke={i === maxIdx ? "#DC2626" : "#64748b"} strokeWidth={2} opacity={i === maxIdx ? 0.9 : 0.7} />
            </g>
          ))}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "רווח מרבי", val: `${maxProfit.toLocaleString()} ש"ח` },
          { label: "בקודקוד", val: `(${maxVertex[0]}, ${maxVertex[1]})` },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>המקסימום תמיד מתקבל באחד מקודקודי התחום האפשרי!</p>
    </section>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-700",  border: "border-green-600",  bg: "bg-green-600/10",  glowColor: "rgba(22,163,74,0.3)"  },
  { id: "medium",   label: "בינוני", textColor: "text-orange-700", border: "border-orange-600", bg: "bg-orange-600/10", glowColor: "rgba(234,88,12,0.3)"  },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-700",    border: "border-red-700",    bg: "bg-red-700/10",    glowColor: "rgba(220,38,38,0.3)"  },
];

// ─── Formula Bar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"inequality" | "feasible" | "vertices" | null>(null);

  const tabs = [
    { id: "inequality" as const, label: "📐 אי-שוויון לינארי", tex: "ax + by \\leq c", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "feasible" as const, label: "🔲 תחום אפשרי", tex: "\\bigcap", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "vertices" as const, label: "📍 קודקודים", tex: "P_i", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
  ];

  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.75)", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>

      {/* Tab buttons */}
      <div style={{ display: "flex", gap: 6, marginBottom: activeTab ? 14 : 0 }}>
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(isActive ? null : t.id)}
              style={{
                flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
                border: `1.5px solid ${isActive ? t.borderColor : "rgba(60,54,42,0.1)"}`,
                background: isActive ? `${t.color}0D` : "rgba(60,54,42,0.03)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
              <span style={{ color: isActive ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span>
            </button>
          );
        })}
      </div>

      {/* Expanded: Inequality */}
      {activeTab === "inequality" && (
        <motion.div key="inequality" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"ax + by \\leq c"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מה זה אומר?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>הישר <InlineMath>{"ax + by = c"}</InlineMath> מחלק את המישור לשני חצאים.</li>
                  <li>האי-שוויון בוחר את חצי-המישור שבו הנקודות מקיימות את התנאי.</li>
                  <li>כדי לבדוק איזה צד — מציבים נקודת מבחן (למשל ראשית הצירים).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: 2x + 3y &le; 12 — הישר 2x+3y=12 הוא הגבול, והתחום מתחתיו (לכיוון ראשית הצירים).
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Feasible Region */}
      {activeTab === "feasible" && (
        <motion.div key="feasible" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#EA580C", fontSize: 16, fontWeight: 700 }}>
              חיתוך כל חצאי-המישורים
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מוצאים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>משרטטים כל ישר גבול על מערכת צירים.</li>
                  <li>מסמנים את הצד שמקיים כל אי-שוויון (בעזרת נקודת מבחן).</li>
                  <li>התחום האפשרי = האזור שמקיים את <strong>כל</strong> האילוצים בו-זמנית.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 התחום האפשרי הוא תמיד מצולע קמור (convex polygon) כשהאילוצים לינאריים.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Vertices */}
      {activeTab === "vertices" && (
        <motion.div key="vertices" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#DC2626", fontSize: 16, fontWeight: 700 }}>
              קודקודי התחום האפשרי
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מוצאים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>פותרים כל זוג ישרי גבול כמערכת משוואות.</li>
                  <li>בודקים שהנקודה מקיימת את <strong>כל</strong> שאר האילוצים.</li>
                  <li>נקודה שמקיימת הכול — היא קודקוד של התחום.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 משפט חשוב: המקסימום או המינימום של פונקציית המטרה מתקבל תמיד באחד מהקודקודים!
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConstraintsPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "163,79,38" : "139,38,53";

  return (
    <main
      style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties}
      dir="rtl"
    >
      <style>{`
        textarea, input[type="text"], input[type="password"] {
          outline: none !important;
        }
        textarea:focus, input[type="text"]:focus {
          outline: none !important;
          border-color: rgba(var(--lvl-rgb), 0.65) !important;
          box-shadow: 0 0 0 3px rgba(var(--lvl-rgb), 0.12) !important;
        }
        input[type="range"] {
          outline: none !important;
        }
        input[type="range"]:focus {
          outline: none !important;
        }
        button:focus, button:focus-visible {
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(var(--lvl-rgb), 0.35) !important;
        }
        button:focus:not(:focus-visible) {
          box-shadow: none !important;
        }
      `}</style>

      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>אילוצים ותחום אפשרי עם AI — כיתה יב׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>כתיבת אילוצים, מציאת קודקודים, ורווח מרבי — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/3u/topic/grade12/linear-programming"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>

        <SubtopicProgress subtopicId="3u/grade12/linear-programming/constraints" />

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
        {selectedLevel === "basic" && <InequalityLab />}
        {selectedLevel === "medium" && <FeasibleRegionLab />}
        {selectedLevel === "advanced" && <ProfitPreviewLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade12/linear-programming/constraints" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
