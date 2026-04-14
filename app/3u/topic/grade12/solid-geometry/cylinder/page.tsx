"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
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
    <svg viewBox="0 0 220 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Top ellipse */}
      <ellipse cx={110} cy={50} rx={60} ry={18} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
      {/* Bottom ellipse */}
      <ellipse cx={110} cy={150} rx={60} ry={18} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
      {/* Left side */}
      <line x1={50} y1={50} x2={50} y2={150} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Right side */}
      <line x1={170} y1={50} x2={170} y2={150} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Height dashed line */}
      <line x1={110} y1={50} x2={110} y2={150} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
      {/* Radius arrow */}
      <line x1={110} y1={150} x2={170} y2={150} stroke="#34d399" strokeWidth={1.5} />
      <polygon points="168,147 174,150 168,153" fill="#34d399" />
      {/* Labels */}
      <text x={175} y={155} fontSize={13} fill="#34d399" fontFamily="sans-serif" fontWeight={600}>r</text>
      <text x={115} y={105} fontSize={13} fill="#f59e0b" fontFamily="sans-serif" fontWeight={600}>h</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 240 220" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Box — back face */}
      <line x1={60} y1={30} x2={200} y2={30} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />
      <line x1={200} y1={30} x2={200} y2={170} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={200} y1={30} x2={220} y2={15} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />
      <line x1={60} y1={30} x2={80} y2={15} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />
      {/* Box — front face */}
      <line x1={60} y1={30} x2={60} y2={170} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={60} y1={170} x2={200} y2={170} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={200} y1={170} x2={220} y2={155} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={60} y1={170} x2={80} y2={155} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Box — top face */}
      <line x1={80} y1={15} x2={220} y2={15} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />
      <line x1={220} y1={15} x2={220} y2={155} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />
      <line x1={80} y1={15} x2={80} y2={155} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />
      <line x1={80} y1={155} x2={220} y2={155} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Cylinder inside */}
      <ellipse cx={130} cy={45} rx={50} ry={14} fill="none" stroke="#34d399" strokeWidth={1.5} />
      <ellipse cx={130} cy={155} rx={50} ry={14} fill="none" stroke="#34d399" strokeWidth={1.5} />
      <line x1={80} y1={45} x2={80} y2={155} stroke="#34d399" strokeWidth={1.5} />
      <line x1={180} y1={45} x2={180} y2={155} stroke="#34d399" strokeWidth={1.5} />
      {/* Radius arrow inside */}
      <line x1={130} y1={155} x2={180} y2={155} stroke="#a78bfa" strokeWidth={1.2} strokeDasharray="3,2" />
      <text x={152} y={148} fontSize={11} fill="#a78bfa" fontFamily="sans-serif" fontWeight={600}>r</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Tin can shape */}
      <ellipse cx={100} cy={40} rx={50} ry={14} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
      <ellipse cx={100} cy={160} rx={50} ry={14} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={50} y1={40} x2={50} y2={160} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={150} y1={40} x2={150} y2={160} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Question marks for dimensions */}
      <text x={155} y={105} fontSize={16} fill="#a78bfa" fontFamily="sans-serif" fontWeight={700}>?</text>
      <text x={100} y={180} fontSize={16} fill="#a78bfa" fontFamily="sans-serif" fontWeight={700}>?</text>
      {/* Height arrow */}
      <line x1={40} y1={42} x2={40} y2={158} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2" />
      <polygon points="38,44 42,44 40,38" fill="#f59e0b" />
      <polygon points="38,156 42,156 40,162" fill="#f59e0b" />
      <text x={25} y={105} fontSize={11} fill="#f59e0b" fontFamily="sans-serif" fontWeight={600}>h</text>
      {/* Radius arrow */}
      <line x1={100} y1={160} x2={150} y2={160} stroke="#34d399" strokeWidth={1} strokeDasharray="3,2" />
      <text x={120} y={175} fontSize={11} fill="#34d399" fontFamily="sans-serif" fontWeight={600}>r</text>
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
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {title}
        </span>
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
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>הפרומפט המוכן</div>
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

  const scoreBarColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";

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
            בדיקת AI מדומה
          </button>
        )}

        {result && result.blocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            {result.hint}
          </motion.div>
        )}

        {result && !result.blocked && result.score < 75 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
              פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result.score}/100</strong>
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
          value={text} rows={3} dir="rtl" readOnly={passed}
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
            {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>ניסוח מעולה! הסעיף הבא נפתח.</div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ניסוח"}
            </button>
          </motion.div>
        )}

        {!passed && (
          <button onClick={validate}
            style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid ${ROSE.border}`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>
            בדיקת AI מדומה
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
                  סיימתי סעיף זה
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>הושלם</div>
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
        subjectWords={["גליל", "נפח", "שטח פנים", "מעטפת", "רדיוס", "גובה"]}
      />

      {steps.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {(!masterPassed || i >= unlockedCount) ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.7)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{s.phase} — {s.label}</span>
              <span style={{ fontSize: 16 }}>🔒</span>
            </div>
          ) : (
            <div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(255,255,255,0.9)", padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{s.phase} — {s.label}</div>
                <div style={{ color: "#334155", fontSize: 13, lineHeight: 1.6 }}>{s.prompt}</div>
              </div>
              <button onClick={() => setUnlockedCount(v => Math.max(v, i + 2))} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>
                סיימתי סעיף זה
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
    title: "נפח ושטח פנים של גליל",
    problem: "נתון גליל בעל רדיוס בסיס r וגובה h.\n\nא. חשבו את נפח הגליל.\nב. חשבו את שטח המעטפת (השטח הצדדי) של הגליל.\nג. חשבו את שטח הפנים הכולל של הגליל (כולל שני הבסיסים).",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "שוכחים את שני הבסיסים בשטח כולל", text: "לגליל יש שני עיגולים — למעלה ולמטה. שטח הפנים הכולל כולל את המעטפת + שני בסיסים, כלומר 2πrh + 2πr². תלמידים רבים שוכחים להוסיף את 2πr² ומחשבים רק מעטפת." },
      { title: "שימוש בקוטר במקום רדיוס", text: "אם נתון הקוטר d, יש לחלק ב-2 כדי לקבל את הרדיוס r = d/2. הצבת הקוטר ישירות בנוסחה (כאילו הוא רדיוס) תיתן תוצאה שגויה פי 4 בנפח ופי 2 בשטח." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יב', 3 יחידות, ומצרף/ת שאלה בגיאומטריה מרחבית על גליל — נפח, שטח מעטפת ושטח פנים כולל. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: "אני מוכן להמשיך."`,
    steps: [
      { phase: "סעיף א׳", label: "חישוב נפח הגליל", coaching: "", prompt: "נתון גליל בעל רדיוס בסיס r וגובה h. תנחה אותי כיצד לחשב את נפח הגליל — שטח הבסיס כפול הגובה.", keywords: [], keywordHint: "", contextWords: ["נפח", "גליל", "רדיוס", "גובה", "בסיס", "פאי"] },
      { phase: "סעיף ב׳", label: "שטח מעטפת", coaching: "", prompt: "נתון גליל בעל רדיוס r וגובה h. תסביר לי כיצד לחשב את שטח המעטפת — השטח הצדדי שנפרש למלבן.", keywords: [], keywordHint: "", contextWords: ["מעטפת", "גליל", "היקף", "גובה", "מלבן", "צדדי"] },
      { phase: "סעיף ג׳", label: "שטח פנים כולל", coaching: "", prompt: "נתון גליל בעל רדיוס r וגובה h. תכווין אותי לחשב את שטח הפנים הכולל — מעטפת + שני בסיסים עגולים.", keywords: [], keywordHint: "", contextWords: ["שטח פנים", "כולל", "בסיס", "עיגול", "מעטפת", "שני"] },
    ],
  },
  {
    id: "medium",
    title: "גליל בתוך תיבה",
    problem: "גליל חסום בתוך תיבה ישרה (מקבילון). ממדי התיבה נתונים: אורך a, רוחב b (כאשר a > b), וגובה c.\nהגליל ניצב בתוך התיבה כך שבסיסו נוגע בבסיס התיבה.\n\nא. מהו הרדיוס המרבי האפשרי של הגליל?\nב. חשבו את נפח הגליל (בהנחה שגובהו שווה לגובה התיבה).\nג. איזה חלק מנפח התיבה תופס הגליל? הביעו כשבר.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "רדיוס = חצי הצלע הקצרה, לא הארוכה", text: "הגליל חייב להיכנס לתיבה, ולכן הקוטר שלו מוגבל על-ידי הצלע הקצרה יותר של הבסיס. אם a > b, הרדיוס המרבי הוא b/2, לא a/2." },
      { title: "השוואת נפחים כיחס ולא כהפרש", text: "כשמבקשים 'איזה חלק תופס הגליל' — הכוונה ליחס נפח הגליל חלקי נפח התיבה. תלמידים לעיתים מחשבים הפרש נפחים במקום יחס." },
    ],
    goldenPrompt: `אני בכיתה יב', 3 יחידות, מצרף/ת תרגיל בגיאומטריה מרחבית בנושא גליל חסום בתיבה — רדיוס מרבי, נפח, ויחס נפחים.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על הגבלת הרדיוס, חישוב נפחים, והשוואת יחס.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: "אני מוכן להמשיך."`,
    steps: [
      { phase: "סעיף א׳", label: "רדיוס מרבי", coaching: "", prompt: "גליל חסום בתיבה עם בסיס a על b (כש-a > b) וגובה c. תנחה אותי למצוא את הרדיוס המרבי — איזו צלע של הבסיס מגבילה?", keywords: [], keywordHint: "", contextWords: ["רדיוס", "מרבי", "צלע", "קצרה", "קוטר", "בסיס"] },
      { phase: "סעיף ב׳", label: "נפח הגליל", coaching: "", prompt: "גליל חסום בתיבה עם ממדים a, b, c. הרדיוס המרבי ידוע. תדריך אותי לחשב את נפח הגליל כשגובהו שווה לגובה התיבה.", keywords: [], keywordHint: "", contextWords: ["נפח", "גליל", "רדיוס", "גובה", "פאי", "בסיס"] },
      { phase: "סעיף ג׳", label: "יחס נפחים", coaching: "", prompt: "נפח הגליל ונפח התיבה ידועים. תכווין אותי לחשב את היחס בין נפח הגליל לנפח התיבה — כשבר מפושט.", keywords: [], keywordHint: "", contextWords: ["יחס", "שבר", "נפח", "תיבה", "גליל", "חלק"] },
    ],
  },
  {
    id: "advanced",
    title: "פח לשימורים — מינימום חומר",
    problem: "יצרן שימורים צריך לייצר פחית גלילית שנפחה 500 מ\"ל.\nהיצרן רוצה למזער את כמות הפח (= שטח הפנים הכולל).\n\nא. הביעו את h באמצעות r מתוך הנוסחה V = πr²h = 500.\nב. כתבו את שטח הפנים הכולל S(r) כפונקציה של r בלבד.\nג. מצאו את הרדיוס r שממזער את S (בעזרת נגזרת או טבלה).\nד. חשבו את הגובה המתאים h ווודאו ש-V = 500.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "שוכחים להציב h(r) בנוסחת השטח", text: "כדי לכתוב S כפונקציה של r בלבד, חייבים להציב את h = 500/(πr²) בביטוי 2πrh + 2πr². אם לא מציבים, S תלויה בשני משתנים ואי אפשר לגזור." },
      { title: "גזירה שגויה של r בחזקה שלילית", text: "הביטוי S(r) מכיל איבר מסוג 1000/r. הנגזרת של 1000/r = 1000·r⁻¹ היא -1000·r⁻² = -1000/r². טעות נפוצה: לשכוח את המינוס או את הריבוע." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד ממזערים שטח פנים של גליל כשהנפח קבוע, ומה התפקיד של הנגזרת במציאת מינימום? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "הבעת h באמצעות r", coaching: "", prompt: "נתון גליל עם נפח 500 מ\"ל: V = πr²h = 500. תנחה אותי לבודד את h ולהביע אותו באמצעות r.", keywords: [], keywordHint: "", contextWords: ["גובה", "רדיוס", "נפח", "בידוד", "משתנה", "הצבה"] },
      { phase: "סעיף ב׳", label: "S(r) כפונקציה של r", coaching: "", prompt: "שטח פנים כולל S = 2πrh + 2πr². תדריך אותי להציב את h = 500/(πr²) ולקבל S(r) כפונקציה של r בלבד.", keywords: [], keywordHint: "", contextWords: ["שטח פנים", "פונקציה", "הצבה", "רדיוס", "מעטפת", "בסיס"] },
      { phase: "סעיף ג׳", label: "מציאת r אופטימלי", coaching: "", prompt: "נתונה S(r) כפונקציה של r. תנחה אותי לגזור, להשוות לאפס, ולמצוא את r שממזער את שטח הפנים.", keywords: [], keywordHint: "", contextWords: ["נגזרת", "מינימום", "אפס", "גזירה", "אופטימלי", "קריטי"] },
      { phase: "סעיף ד׳", label: "חישוב h ואימות", coaching: "", prompt: "מצאתי r אופטימלי. תכווין אותי לחשב את h המתאים ולוודא שהנפח אכן יוצא 500.", keywords: [], keywordHint: "", contextWords: ["גובה", "אימות", "נפח", "הצבה", "בדיקה", "תוצאה"] },
    ],
  },
];

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() {
    navigator.clipboard.writeText(ex.problem);
    setCopiedProblem(true);
    setTimeout(() => setCopiedProblem(false), 2000);
  }
  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Properties box */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem 1.5rem", marginBottom: "2rem", boxShadow: s.glowShadow }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>גליל (Cylinder)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "נפח הגליל, שטח המעטפת ושטח הפנים הכולל — שלוש נוסחאות יסוד בגיאומטריה מרחבית."}
            {ex.id === "medium" && "גליל חסום בתיבה — הקשר בין ממדי התיבה לרדיוס המרבי, והשוואת נפחים כיחס."}
            {ex.id === "advanced" && "בעיית אופטימיזציה — מציאת ממדי פחית שממזערים שטח פנים עבור נפח קבוע."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: נוסחאות הגליל */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>נוסחאות הגליל</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>נפח</span>
              <span>V = πr²h — שטח בסיס כפול גובה.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>מעטפת</span>
              <span>2πrh — נפרשת למלבן (היקף בסיס × גובה).</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>שטח כולל</span>
              <span>2πrh + 2πr² = 2πr(h + r).</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>מושגים נוספים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>חסימה</span>
                  <span>גליל חסום בתיבה — הרדיוס מוגבל ע"י הצלע הקצרה.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>יחס</span>
                  <span>נפח גליל / נפח תיבה — כשהבסיס ריבועי, היחס π/4.</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>אופטימיזציה</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>נגזרת</span>
                  <span>S'(r) = 0 — מציאת נקודה קריטית שממזערת שטח.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>אילוץ</span>
                  <span>V = πr²h = const — הנפח קבוע, ממזערים שטח.</span>
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
        {ex.id === "basic"    && <LadderBase     steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
      </div>

      {/* Advanced — outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}

    </section>
  );
}

// ─── CylinderLab (basic) — 2 sliders: r, h ─────────────────────────────────

function CylinderLab() {
  const [r, setR] = useState(5);
  const [h, setH] = useState(10);
  const st = STATION.basic;

  const volume = Math.PI * r * r * h;
  const lateralArea = 2 * Math.PI * r * h;
  const totalArea = lateralArea + 2 * Math.PI * r * r;

  // Side-view cylinder SVG proportional
  const maxDim = Math.max(r * 2, h, 1);
  const svgW = 260, svgH = 200;
  const drawW = Math.min(180, (r * 2 / maxDim) * 160);
  const drawH = Math.min(140, (h / maxDim) * 140);
  const cx = svgW / 2;
  const topY = (svgH - drawH) / 2;
  const botY = topY + drawH;
  const ry = Math.max(8, drawW * 0.15);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת גליל</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו רדיוס וגובה וצפו כיצד הנפח ושטח הפנים משתנים בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>רדיוס r</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{r}</span>
          </div>
          <input type="range" min={1} max={20} step={0.5} value={r} onChange={(e) => setR(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>גובה h</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{h}</span>
          </div>
          <input type="range" min={1} max={30} step={0.5} value={h} onChange={(e) => setH(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Top ellipse */}
          <ellipse cx={cx} cy={topY} rx={drawW / 2} ry={ry} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
          {/* Bottom ellipse */}
          <ellipse cx={cx} cy={botY} rx={drawW / 2} ry={ry} fill="rgba(22,163,74,0.08)" stroke="#94a3b8" strokeWidth={1.5} />
          {/* Sides */}
          <line x1={cx - drawW / 2} y1={topY} x2={cx - drawW / 2} y2={botY} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={cx + drawW / 2} y1={topY} x2={cx + drawW / 2} y2={botY} stroke="#94a3b8" strokeWidth={1.5} />
          {/* Height dashed */}
          <line x1={cx} y1={topY} x2={cx} y2={botY} stroke="#f59e0b" strokeWidth={1.2} strokeDasharray="4,3" />
          <text x={cx + 6} y={(topY + botY) / 2} fontSize={11} fill="#f59e0b" fontFamily="sans-serif" fontWeight={600}>h={h}</text>
          {/* Radius */}
          <line x1={cx} y1={botY} x2={cx + drawW / 2} y2={botY} stroke="#34d399" strokeWidth={1.2} />
          <text x={cx + drawW / 4} y={botY + ry + 14} fontSize={11} fill="#34d399" fontFamily="sans-serif" fontWeight={600}>r={r}</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "נפח", val: volume.toFixed(1) },
          { label: "שטח מעטפת", val: lateralArea.toFixed(1) },
          { label: "שטח כולל", val: totalArea.toFixed(1) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>הגדילו את r — הנפח גדל ריבועית ברדיוס. הגדילו את h — הנפח גדל לינארית בגובה.</p>
    </section>
  );
}

// ─── InscribedLab (medium) — 2 sliders: box width, box depth ───────────────

function InscribedLab() {
  const [boxW, setBoxW] = useState(12);
  const [boxD, setBoxD] = useState(8);
  const boxH = 15; // fixed height
  const st = STATION.medium;

  const maxR = Math.min(boxW, boxD) / 2;
  const cylVol = Math.PI * maxR * maxR * boxH;
  const boxVol = boxW * boxD * boxH;
  const ratio = boxVol > 0 ? (cylVol / boxVol) * 100 : 0;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת גליל בתוך תיבה</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את ממדי בסיס התיבה (גובה קבוע = {boxH}) וצפו כיצד הגליל המרבי משתנה.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>רוחב תיבה (a)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{boxW}</span>
          </div>
          <input type="range" min={2} max={20} step={0.5} value={boxW} onChange={(e) => setBoxW(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>עומק תיבה (b)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{boxD}</span>
          </div>
          <input type="range" min={2} max={20} step={0.5} value={boxD} onChange={(e) => setBoxD(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG — top-down view showing box and inscribed circle */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 240 200" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Scale box to fit */}
          {(() => {
            const scale = Math.min(180 / boxW, 160 / boxD);
            const rectW = boxW * scale;
            const rectH = boxD * scale;
            const ox = (240 - rectW) / 2;
            const oy = (200 - rectH) / 2;
            const circR = maxR * scale;
            return (
              <>
                <rect x={ox} y={oy} width={rectW} height={rectH} fill="none" stroke="#94a3b8" strokeWidth={1.5} rx={2} />
                <circle cx={240 / 2} cy={200 / 2} r={circR} fill="rgba(234,88,12,0.08)" stroke="#EA580C" strokeWidth={1.5} />
                {/* Radius line */}
                <line x1={240 / 2} y1={200 / 2} x2={240 / 2 + circR} y2={200 / 2} stroke="#a78bfa" strokeWidth={1} strokeDasharray="3,2" />
                <text x={240 / 2 + circR / 2} y={200 / 2 - 6} fontSize={10} fill="#a78bfa" fontFamily="sans-serif" fontWeight={600}>r={maxR.toFixed(1)}</text>
                {/* Labels */}
                <text x={ox + rectW / 2} y={oy - 6} fontSize={10} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">a={boxW}</text>
                <text x={ox - 6} y={oy + rectH / 2} fontSize={10} fill="#94a3b8" textAnchor="end" fontFamily="sans-serif">b={boxD}</text>
              </>
            );
          })()}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "רדיוס מרבי", val: maxR.toFixed(1) },
          { label: "נפח גליל", val: cylVol.toFixed(1) },
          { label: "יחס נפחים", val: `${ratio.toFixed(1)}%` },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>כשבסיס התיבה ריבועי (a = b) — הגליל תופס כ-78.5% מנפח התיבה!</p>
    </section>
  );
}

// ─── OptimalCanLab (advanced) — 1 slider: radius ────────────────────────────

function OptimalCanLab() {
  const V = 500;
  const [r, setR] = useState(4.3);
  const st = STATION.advanced;

  const hCalc = V / (Math.PI * r * r);
  const surfaceArea = 2 * Math.PI * r * hCalc + 2 * Math.PI * r * r;

  // Optimal r for minimum surface area: r_opt = (V / (2π))^(1/3)
  const rOpt = Math.pow(V / (2 * Math.PI), 1 / 3);
  const hOpt = V / (Math.PI * rOpt * rOpt);
  const sOpt = 2 * Math.PI * rOpt * hOpt + 2 * Math.PI * rOpt * rOpt;
  const isNearOpt = Math.abs(r - rOpt) < 0.3;

  // Dynamic can SVG
  const svgW = 220, svgH = 220;
  const maxDrawH = 160;
  const maxDrawW = 140;
  const drawW = Math.min(maxDrawW, Math.max(30, (r / 12) * maxDrawW));
  const drawH = Math.min(maxDrawH, Math.max(30, (hCalc / 30) * maxDrawH));
  const cx = svgW / 2;
  const topY = (svgH - drawH) / 2;
  const botY = topY + drawH;
  const ery = Math.max(6, drawW * 0.12);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת פחית אופטימלית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>נפח קבוע = {V} מ"ל. שנו את הרדיוס וצפו כיצד שטח הפנים משתנה — מצאו את המינימום!</p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>רדיוס r</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{r.toFixed(1)}</span>
          </div>
          <input type="range" min={1} max={12} step={0.1} value={r} onChange={(e) => setR(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG — dynamic can */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-sm mx-auto" aria-hidden>
          {/* Top ellipse */}
          <ellipse cx={cx} cy={topY} rx={drawW / 2} ry={ery} fill="none" stroke={isNearOpt ? "#34d399" : "#94a3b8"} strokeWidth={1.5} />
          {/* Bottom ellipse */}
          <ellipse cx={cx} cy={botY} rx={drawW / 2} ry={ery} fill={isNearOpt ? "rgba(52,211,153,0.1)" : "rgba(220,38,38,0.05)"} stroke={isNearOpt ? "#34d399" : "#94a3b8"} strokeWidth={1.5} />
          {/* Sides */}
          <line x1={cx - drawW / 2} y1={topY} x2={cx - drawW / 2} y2={botY} stroke={isNearOpt ? "#34d399" : "#94a3b8"} strokeWidth={1.5} />
          <line x1={cx + drawW / 2} y1={topY} x2={cx + drawW / 2} y2={botY} stroke={isNearOpt ? "#34d399" : "#94a3b8"} strokeWidth={1.5} />
          {/* Height label */}
          <text x={cx + drawW / 2 + 10} y={(topY + botY) / 2} fontSize={10} fill="#f59e0b" fontFamily="sans-serif" fontWeight={600}>h={hCalc.toFixed(1)}</text>
          {/* Radius label */}
          <text x={cx} y={botY + ery + 16} fontSize={10} fill="#34d399" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>r={r.toFixed(1)}</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "רדיוס r", val: r.toFixed(1) },
          { label: "גובה h", val: hCalc.toFixed(1) },
          { label: "שטח פנים S", val: surfaceArea.toFixed(1), highlight: isNearOpt },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid ${(row as { highlight?: boolean }).highlight ? "rgba(52,211,153,0.5)" : `rgba(${st.glowRgb},0.4)`}`, padding: 12, boxShadow: (row as { highlight?: boolean }).highlight ? "0 0 16px rgba(52,211,153,0.2)" : "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: (row as { highlight?: boolean }).highlight ? "#16a34a" : st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      {/* Optimal indicator */}
      {isNearOpt && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(220,252,231,0.6)", border: "1px solid rgba(22,163,74,0.3)", padding: "10px 16px", marginTop: 12, textAlign: "center" }}>
          <div style={{ color: "#15803d", fontSize: 13, fontWeight: 700 }}>מינימום! r = {rOpt.toFixed(2)}, h = {hOpt.toFixed(2)}, S = {sOpt.toFixed(1)}</div>
        </motion.div>
      )}

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>
        {isNearOpt ? "מצאתם את המינימום — הפחית האופטימלית!" : "הזיזו את הסליידר — הפחית משתנה מגבוהה-וצרה לנמוכה-ורחבה. מתי שטח הפנים מינימלי?"}
      </p>
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
  const [activeTab, setActiveTab] = useState<"volume" | "lateral" | "total" | null>(null);

  const tabs = [
    { id: "volume" as const, label: "נפח", tex: "V", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "lateral" as const, label: "מעטפת", tex: "S_L", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "total" as const, label: "שטח פנים כולל", tex: "S_T", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: Volume */}
      {activeTab === "volume" && (
        <motion.div key="volume" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"V = \\pi r^2 h"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מחשבים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מחשבים שטח הבסיס: <InlineMath>{"\\pi r^2"}</InlineMath>.</li>
                  <li>כופלים בגובה <InlineMath>{"h"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: r=3, h=10. נפח = π·9·10 = 90π ≈ 282.7
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Lateral */}
      {activeTab === "lateral" && (
        <motion.div key="lateral" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S_L = 2\\pi r h"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מחשבים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>המעטפת נפרשת למלבן.</li>
                  <li>רוחב המלבן = היקף הבסיס = <InlineMath>{"2\\pi r"}</InlineMath>.</li>
                  <li>גובה המלבן = גובה הגליל <InlineMath>{"h"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: r=3, h=10. מעטפת = 2π·3·10 = 60π ≈ 188.5
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Total */}
      {activeTab === "total" && (
        <motion.div key="total" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S_T = 2\\pi r h + 2\\pi r^2 = 2\\pi r(h + r)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מחשבים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מחשבים שטח מעטפת: <InlineMath>{"2\\pi r h"}</InlineMath>.</li>
                  <li>מוסיפים שני בסיסים עגולים: <InlineMath>{"2 \\cdot \\pi r^2"}</InlineMath>.</li>
                  <li>ניתן לפשט: <InlineMath>{"2\\pi r(h + r)"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: r=3, h=10. שטח כולל = 60π + 18π = 78π ≈ 245.0
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CylinderPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>גליל עם AI — כיתה יב׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>נפח, שטח מעטפת, שטח פנים כולל, גליל בתוך תיבה, ואופטימיזציה — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/3u/topic/grade12/solid-geometry"
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

        <SubtopicProgress subtopicId="3u/grade12/solid-geometry/cylinder" />

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
        {selectedLevel === "basic" && <CylinderLab />}
        {selectedLevel === "medium" && <InscribedLab />}
        {selectedLevel === "advanced" && <OptimalCanLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade12/solid-geometry/cylinder" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
