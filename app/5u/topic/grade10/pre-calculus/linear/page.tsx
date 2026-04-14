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
      <line x1={40} y1={180} x2={240} y2={180} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={40} y1={20} x2={40} y2={180} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Axis arrows */}
      <polygon points="240,180 234,176 234,184" fill="#94a3b8" />
      <polygon points="40,20 36,26 44,26" fill="#94a3b8" />
      {/* Axis labels */}
      <text x={245} y={184} fontSize={11} fill="#6B7280" fontFamily="sans-serif">x</text>
      <text x={32} y={16} fontSize={11} fill="#6B7280" fontFamily="sans-serif">y</text>
      {/* Line crossing both axes */}
      <line x1={60} y1={160} x2={220} y2={40} stroke="#16A34A" strokeWidth={2.2} opacity={0.7} />
      {/* ? at y-intercept */}
      <text x={52} y={146} fontSize={14} fill="#f59e0b" fontFamily="sans-serif" fontWeight={700}>?</text>
      {/* ? at x-intercept */}
      <text x={120} y={198} fontSize={14} fill="#f59e0b" fontFamily="sans-serif" fontWeight={700}>?</text>
      {/* Origin label */}
      <text x={30} y={196} fontSize={10} fill="#64748b" fontFamily="sans-serif">O</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 280 240" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={40} y1={200} x2={260} y2={200} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={140} y1={20} x2={140} y2={200} stroke="#94a3b8" strokeWidth={1.5} />
      {/* ℓ₁ — original line */}
      <line x1={50} y1={160} x2={250} y2={60} stroke="#EA580C" strokeWidth={2} opacity={0.6} />
      <text x={252} y={58} fontSize={12} fill="#EA580C" fontFamily="sans-serif" fontWeight={600}>ℓ₁</text>
      {/* ℓ₂ — parallel line */}
      <line x1={50} y1={120} x2={250} y2={20} stroke="#f59e0b" strokeWidth={2} strokeDasharray="6,3" opacity={0.6} />
      <text x={252} y={18} fontSize={12} fill="#f59e0b" fontFamily="sans-serif" fontWeight={600}>ℓ₂</text>
      {/* ℓ₃ — perpendicular line */}
      <line x1={80} y1={30} x2={230} y2={210} stroke="#a78bfa" strokeWidth={2} strokeDasharray="6,3" opacity={0.6} />
      <text x={232} y={212} fontSize={12} fill="#a78bfa" fontFamily="sans-serif" fontWeight={600}>ℓ₃</text>
      {/* Point A */}
      <circle cx={160} cy={90} r={4} fill="#EA580C" />
      <text x={166} y={84} fontSize={12} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700}>A</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 280 240" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Three lines forming a triangle */}
      {/* Line 1 */}
      <line x1={40} y1={180} x2={240} y2={60} stroke="#DC2626" strokeWidth={1.8} opacity={0.6} />
      {/* Line 2 */}
      <line x1={40} y1={60} x2={240} y2={180} stroke="#f59e0b" strokeWidth={1.8} opacity={0.6} />
      {/* Line 3 */}
      <line x1={60} y1={180} x2={220} y2={180} stroke="#34d399" strokeWidth={1.8} opacity={0.6} />
      {/* Triangle vertices */}
      <circle cx={140} cy={60} r={4} fill="#1A1A1A" />
      <text x={144} y={52} fontSize={13} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700}>A</text>
      <circle cx={60} cy={180} r={4} fill="#1A1A1A" />
      <text x={44} y={178} fontSize={13} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700}>B</text>
      <circle cx={220} cy={180} r={4} fill="#1A1A1A" />
      <text x={224} y={178} fontSize={13} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700}>C</text>
      {/* Median from A dashed */}
      <line x1={140} y1={60} x2={140} y2={180} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.5} />
      {/* Right angle marker at A */}
      <rect x={132} y={60} width={8} height={8} fill="none" stroke="#a78bfa" strokeWidth={1.2} />
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
            בדיקת AI מדומה 🤖
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Ladder components ────────────────────────────────────────────────────────

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
        subjectWords={["ישר", "שיפוע", "חיתוך", "מקביל", "ניצב", "משוואה"]}
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
    title: "שיפוע, חיתוך עם צירים, גרף",
    problem: "נתון הישר y = 2x - 4.\n\nא. מצאו את השיפוע ואת נקודת החיתוך עם ציר y.\nב. מצאו את נקודת החיתוך עם ציר x (כאשר y = 0).\nג. שרטטו את הישר בעזרת שתי נקודות החיתוך.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "בלבול בין שיפוע לחיתוך עם y", text: "במשוואה y = mx + b, השיפוע הוא m (המקדם של x) והחיתוך עם ציר y הוא b (המספר החופשי). תלמידים רבים מחליפים ביניהם — השיפוע הוא קצב השינוי, לא הנקודה על הציר!" },
      { title: "שוכחים ש-x-intercept פירושו y = 0", text: "נקודת חיתוך עם ציר x מתקבלת כשמציבים y = 0 במשוואה ופותרים את x. תלמידים לפעמים מציבים x = 0 במקום — וזה נותן את החיתוך עם ציר y, לא x!" },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י', 5 יחידות, ומצרף/ת שאלה על פונקציה לינארית — שיפוע, חיתוך עם צירים ושרטוט גרף. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "שיפוע וחיתוך y", coaching: "", prompt: "נתון הישר y = 2x - 4. תנחה אותי לזהות את השיפוע ואת נקודת החיתוך עם ציר y מתוך צורת המשוואה y = mx + b.", keywords: [], keywordHint: "", contextWords: ["שיפוע", "חיתוך", "ציר", "y", "מקדם", "משוואה"] },
      { phase: "סעיף ב׳", label: "חיתוך עם ציר x", coaching: "", prompt: "נתון הישר y = 2x - 4. תסביר לי כיצד מוצאים את נקודת החיתוך עם ציר x — מה מציבים ולמה.", keywords: [], keywordHint: "", contextWords: ["חיתוך", "ציר", "x", "הצבה", "y=0", "פתרון"] },
      { phase: "סעיף ג׳", label: "שרטוט הישר", coaching: "", prompt: "נתון הישר y = 2x - 4. תכווין אותי לשרטט את הגרף בעזרת שתי נקודות החיתוך שמצאתי — איך מסמנים על צירים ומותחים ישר.", keywords: [], keywordHint: "", contextWords: ["שרטוט", "גרף", "נקודות", "צירים", "ישר", "סימון"] },
    ],
  },
  {
    id: "medium",
    title: "משוואת ישר דרך נקודה + מקביל/ניצב",
    problem: "נתונה הנקודה A(1, 3) והישר ℓ₁: y = 2x + 1.\n\nא. כתבו את משוואת הישר ℓ₂ המקביל ל-ℓ₁ העובר דרך A.\nב. כתבו את משוואת הישר ℓ₃ הניצב ל-ℓ₁ העובר דרך A.\nג. מצאו את נקודת החיתוך בין ℓ₂ ל-ℓ₃.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "מקביל = אותו שיפוע, לא אותה משוואה", text: "ישרים מקבילים חולקים את אותו שיפוע (m₁ = m₂) אבל יש להם חיתוך שונה עם ציר y. צריך להציב את הנקודה הנתונה כדי למצוא את b החדש — לא להעתיק את כל המשוואה!" },
      { title: "ניצב = הופכי נגדי, לא סתם שלילי", text: "שיפוע ישר ניצב הוא ההופכי הנגדי: אם m₁ = 2 אז m₂ = -1/2 (לא -2!). הכלל: m₁ · m₂ = -1. תלמידים רבים שוכחים להפוך את השבר ורק משנים סימן." },
    ],
    goldenPrompt: `אני בכיתה י', 5 יחידות, מצרף/ת תרגיל בנושא משוואת ישר דרך נקודה — ישר מקביל וישר ניצב.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על שיפוע מקביל, שיפוע ניצב, והצבת נקודה.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "ישר מקביל דרך A", coaching: "", prompt: "נתונה A(1,3) והישר y = 2x + 1. תנחה אותי לכתוב את משוואת הישר המקביל דרך A — מה השיפוע של ישר מקביל ואיך מוצאים את b.", keywords: [], keywordHint: "", contextWords: ["מקביל", "שיפוע", "הצבה", "נקודה", "b", "משוואה"] },
      { phase: "סעיף ב׳", label: "ישר ניצב דרך A", coaching: "", prompt: "נתונה A(1,3) והישר y = 2x + 1. תדריך אותי למצוא את משוואת הישר הניצב דרך A — מה הקשר בין שיפוע ניצב לשיפוע המקורי.", keywords: [], keywordHint: "", contextWords: ["ניצב", "הופכי", "נגדי", "שיפוע", "הצבה", "m"] },
      { phase: "סעיף ג׳", label: "נקודת חיתוך בין ℓ₂ ל-ℓ₃", coaching: "", prompt: "מצאתי את משוואות ℓ₂ ו-ℓ₃. תכווין אותי למצוא את נקודת החיתוך ביניהם — השוואת שתי המשוואות ופתרון.", keywords: [], keywordHint: "", contextWords: ["חיתוך", "השוואה", "משוואות", "פתרון", "נקודה", "x"] },
    ],
  },
  {
    id: "advanced",
    title: "משולש מישרים — שטח ואמצעים",
    problem: "נתונים שלושה ישרים:\nℓ₁: y = x + 2\nℓ₂: y = -x + 6\nℓ₃: y = 0 (ציר x)\n\nא. מצאו את שלוש קודקודי המשולש (נקודות חיתוך בין כל זוג ישרים).\nב. הוכיחו שהזווית בקודקוד A (החיתוך של ℓ₁ ו-ℓ₂) היא 90° בעזרת שיפועים.\nג. חשבו את שטח המשולש.\nד. כתבו את משוואת התיכון מקודקוד A לצלע BC.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "טעות בחישוב נקודות חיתוך", text: "כדי למצוא חיתוך בין שני ישרים יש להשוות את המשוואות (y₁ = y₂) ולפתור. אל תשכחו למצוא גם את y אחרי שמצאתם x! יש 3 זוגות: ℓ₁∩ℓ₂, ℓ₁∩ℓ₃, ℓ₂∩ℓ₃." },
      { title: "הוכחת זווית ישרה דרך שיפועים", text: "שני ישרים ניצבים אם ורק אם m₁ · m₂ = -1. זוהי הדרך האלגברית להוכיח זווית 90° — לא מספיק 'לראות' את זה בשרטוט. חובה לרשום את המכפלה ולהראות שהיא שווה ל-(-1)." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד מוצאים קודקודי משולש הנוצר משלושה ישרים, ואיך מוכיחים זווית ישרה בעזרת שיפועים? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "מציאת 3 קודקודים", coaching: "", prompt: "נתונים ℓ₁: y=x+2, ℓ₂: y=-x+6, ℓ₃: y=0. תנחה אותי למצוא את שלוש נקודות החיתוך — כל זוג ישרים נותן קודקוד אחד של המשולש.", keywords: [], keywordHint: "", contextWords: ["חיתוך", "השוואה", "קודקוד", "משולש", "זוג", "ישרים"] },
      { phase: "סעיף ב׳", label: "הוכחת זווית ישרה", coaching: "", prompt: "מצאתי את הקודקודים. תדריך אותי להוכיח שהזווית בקודקוד A היא 90 מעלות בעזרת מכפלת שיפועים m₁·m₂ = -1.", keywords: [], keywordHint: "", contextWords: ["ניצב", "שיפוע", "מכפלה", "זווית", "90", "הוכחה"] },
      { phase: "סעיף ג׳", label: "חישוב שטח המשולש", coaching: "", prompt: "מצאתי קודקודים ויש זווית ישרה. תנחה אותי לחשב את שטח המשולש — באיזו נוסחה כדאי להשתמש (ניתב/שרוכים).", keywords: [], keywordHint: "", contextWords: ["שטח", "משולש", "נוסחה", "קודקודים", "בסיס", "גובה"] },
      { phase: "סעיף ד׳", label: "משוואת התיכון מ-A", coaching: "", prompt: "תסביר לי איך מוצאים את אמצע הצלע BC ואז כותבים את משוואת הישר העובר דרך A ודרך נקודת האמצע.", keywords: [], keywordHint: "", contextWords: ["תיכון", "אמצע", "צלע", "משוואה", "שיפוע", "נקודה"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📐 פונקציה לינארית (Linear Function)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "זיהוי שיפוע וחיתוך עם צירים מתוך משוואת ישר y = mx + b, ושרטוט הגרף בעזרת נקודות חיתוך."}
            {ex.id === "medium" && "כתיבת משוואות ישרים מקבילים וניצבים העוברים דרך נקודה נתונה, ומציאת חיתוך ביניהם."}
            {ex.id === "advanced" && "שלושה ישרים יוצרים משולש — מציאת קודקודים, הוכחת זווית ישרה, שטח ותיכון."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: ישר ומשוואה */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>ישר ומשוואה</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>y = mx + b</span>
              <span>צורה מפורשת — m = שיפוע, b = חיתוך עם ציר y.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>שיפוע</span>
              <span>קצב השינוי — כמה y משתנה כש-x עולה ב-1.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>חיתוך צירים</span>
              <span>עם y: הצב x=0. עם x: הצב y=0.</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>מקביל וניצב</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>מקביל</span>
                  <span>אותו שיפוע (m₁ = m₂), חיתוך y שונה.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>ניצב</span>
                  <span>m₁ · m₂ = -1 (הופכי נגדי).</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>משולש מישרים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>קודקודים</span>
                  <span>3 נקודות חיתוך בין 3 זוגות ישרים.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>תיכון</span>
                  <span>קטע מקודקוד לאמצע הצלע שמולו.</span>
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

// ─── SlopeLab (basic) ────────────────────────────────────────────────────────

function SlopeLab() {
  const [m, setM] = useState(2);
  const [b, setB] = useState(-4);
  const st = STATION.basic;

  const yIntercept = b;
  const xIntercept = m !== 0 ? -b / m : null;

  // SVG coordinate system: map math coords to SVG
  const svgW = 300, svgH = 260;
  const cx = 150, cy = 130; // origin in SVG
  const scale = 18; // pixels per unit

  const toSvg = (mx: number, my: number) => ({ x: cx + mx * scale, y: cy - my * scale });

  // Line endpoints (extend beyond view)
  const x1m = -8, x2m = 8;
  const y1m = m * x1m + b, y2m = m * x2m + b;
  const p1 = toSvg(x1m, y1m), p2 = toSvg(x2m, y2m);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת שיפוע וחיתוך</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את השיפוע (m) ואת חיתוך y (b) בעזרת הסליידרים וצפו כיצד הישר משתנה.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>שיפוע (m)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{m.toFixed(1)}</span>
          </div>
          <input type="range" min={-5} max={5} step={0.1} value={m} onChange={(e) => setM(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>חיתוך y (b)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{b.toFixed(1)}</span>
          </div>
          <input type="range" min={-6} max={6} step={0.1} value={b} onChange={(e) => setB(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Grid lines */}
          {Array.from({ length: 17 }, (_, i) => i - 8).map(v => {
            const { x } = toSvg(v, 0);
            return <line key={`gx${v}`} x1={x} y1={10} x2={x} y2={svgH - 10} stroke="rgba(60,54,42,0.06)" strokeWidth={1} />;
          })}
          {Array.from({ length: 15 }, (_, i) => i - 7).map(v => {
            const { y } = toSvg(0, v);
            return <line key={`gy${v}`} x1={10} y1={y} x2={svgW - 10} y2={y} stroke="rgba(60,54,42,0.06)" strokeWidth={1} />;
          })}
          {/* Axes */}
          <line x1={10} y1={cy} x2={svgW - 10} y2={cy} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={cx} y1={10} x2={cx} y2={svgH - 10} stroke="#94a3b8" strokeWidth={1.5} />
          {/* Line */}
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={st.accentColor} strokeWidth={2.5} opacity={0.75} />
          {/* y-intercept dot */}
          {(() => { const pt = toSvg(0, yIntercept); return <circle cx={pt.x} cy={pt.y} r={5} fill="#f59e0b" />; })()}
          {/* x-intercept dot */}
          {xIntercept !== null && (() => { const pt = toSvg(xIntercept, 0); return <circle cx={pt.x} cy={pt.y} r={5} fill="#a78bfa" />; })()}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "שיפוע (m)", val: m.toFixed(1) },
          { label: "חיתוך y", val: `(0, ${yIntercept.toFixed(1)})` },
          { label: "חיתוך x", val: xIntercept !== null ? `(${xIntercept.toFixed(1)}, 0)` : "אין" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>
        {m === 0 ? "שיפוע 0 — ישר אופקי!" : m > 0 ? "שיפוע חיובי — הישר עולה משמאל לימין." : "שיפוע שלילי — הישר יורד משמאל לימין."}
      </p>
    </section>
  );
}

// ─── ParallelPerpLab (medium) ────────────────────────────────────────────────

function ParallelPerpLab() {
  const [m1, setM1] = useState(2);
  const [ax, setAx] = useState(1);
  const st = STATION.medium;

  const ay = m1 * ax + 1; // point on original shifted
  const mPerp = m1 !== 0 ? -1 / m1 : NaN;
  const bPar = ay - m1 * ax;
  const bPerp = m1 !== 0 ? ay - mPerp * ax : NaN;

  // Intersection of parallel and perpendicular through A — they both pass through A!
  const intersectX = ax;
  const intersectY = ay;

  const svgW = 300, svgH = 260;
  const cx = 150, cy = 130;
  const scale = 18;
  const toSvg = (mx: number, my: number) => ({ x: cx + mx * scale, y: cy - my * scale });

  const linePoints = (slope: number, intercept: number) => {
    const x1m = -8, x2m = 8;
    const y1m = slope * x1m + intercept, y2m = slope * x2m + intercept;
    return { p1: toSvg(x1m, y1m), p2: toSvg(x2m, y2m) };
  };

  const orig = linePoints(m1, 1); // ℓ₁: y = m1·x + 1
  const par = linePoints(m1, bPar);
  const perp = m1 !== 0 ? linePoints(mPerp, bPerp) : null;

  const parEq = `y = ${m1.toFixed(1)}x + ${bPar.toFixed(1)}`;
  const perpEq = m1 !== 0 ? `y = ${mPerp.toFixed(2)}x + ${bPerp.toFixed(2)}` : "לא מוגדר (m=0)";

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת מקביל וניצב</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את שיפוע הישר המקורי ואת מיקום הנקודה A. צפו כיצד הישר המקביל והניצב משתנים.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>שיפוע ℓ₁ (m)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{m1.toFixed(1)}</span>
          </div>
          <input type="range" min={-5} max={5} step={0.1} value={m1} onChange={(e) => setM1(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>x של נקודה A</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{ax.toFixed(1)}</span>
          </div>
          <input type="range" min={-4} max={4} step={0.1} value={ax} onChange={(e) => setAx(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Axes */}
          <line x1={10} y1={cy} x2={svgW - 10} y2={cy} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={cx} y1={10} x2={cx} y2={svgH - 10} stroke="#94a3b8" strokeWidth={1.5} />
          {/* ℓ₁ original */}
          <line x1={orig.p1.x} y1={orig.p1.y} x2={orig.p2.x} y2={orig.p2.y} stroke={st.accentColor} strokeWidth={2} opacity={0.6} />
          {/* ℓ₂ parallel */}
          <line x1={par.p1.x} y1={par.p1.y} x2={par.p2.x} y2={par.p2.y} stroke="#f59e0b" strokeWidth={2} strokeDasharray="6,3" opacity={0.7} />
          {/* ℓ₃ perpendicular */}
          {perp && <line x1={perp.p1.x} y1={perp.p1.y} x2={perp.p2.x} y2={perp.p2.y} stroke="#a78bfa" strokeWidth={2} strokeDasharray="6,3" opacity={0.7} />}
          {/* Point A */}
          {(() => { const pt = toSvg(ax, ay); return <circle cx={pt.x} cy={pt.y} r={5} fill={st.accentColor} />; })()}
          {/* Labels */}
          <text x={svgW - 25} y={orig.p2.y - 6} fontSize={11} fill={st.accentColor} fontFamily="sans-serif" fontWeight={600}>ℓ₁</text>
          <text x={svgW - 25} y={par.p2.y - 6} fontSize={11} fill="#f59e0b" fontFamily="sans-serif" fontWeight={600}>ℓ₂</text>
          {perp && <text x={perp.p2.x + 4} y={perp.p2.y - 6} fontSize={11} fill="#a78bfa" fontFamily="sans-serif" fontWeight={600}>ℓ₃</text>}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "ℓ₂ (מקביל)", val: parEq },
          { label: "ℓ₃ (ניצב)", val: perpEq },
          { label: "חיתוך ℓ₂∩ℓ₃", val: `(${intersectX.toFixed(1)}, ${intersectY.toFixed(1)})` },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>ℓ₂ ו-ℓ₃ שניהם עוברים דרך A — לכן נקודת החיתוך שלהם תמיד היא A עצמה!</p>
    </section>
  );
}

// ─── TriangleFromLinesLab (advanced) ─────────────────────────────────────────

function TriangleFromLinesLab() {
  const [m1, setM1] = useState(1);
  const [m2, setM2] = useState(-1);
  const st = STATION.advanced;

  // Line 1: y = m1·x + 2
  // Line 2: y = m2·x + 6
  // Line 3: y = 0 (x-axis)
  const b1 = 2, b2 = 6;

  // Vertices
  // A = ℓ₁ ∩ ℓ₂
  const xA = (m1 !== m2) ? (b2 - b1) / (m1 - m2) : NaN;
  const yA = m1 * xA + b1;
  // B = ℓ₁ ∩ ℓ₃ (y=0)
  const xB = m1 !== 0 ? -b1 / m1 : NaN;
  const yB = 0;
  // C = ℓ₂ ∩ ℓ₃ (y=0)
  const xC = m2 !== 0 ? -b2 / m2 : NaN;
  const yC = 0;

  const validTriangle = isFinite(xA) && isFinite(yA) && isFinite(xB) && isFinite(xC) && m1 !== m2 && m1 !== 0 && m2 !== 0;

  // Area using shoelace
  const area = validTriangle
    ? Math.abs(xA * (yB - yC) + xB * (yC - yA) + xC * (yA - yB)) / 2
    : 0;

  // Right angle check at A: m1 * m2 = -1?
  const isRight = Math.abs(m1 * m2 + 1) < 0.01;

  const svgW = 300, svgH = 260;
  const cx = 150, cy = 180;
  const scale = 16;
  const toSvg = (mx: number, my: number) => ({ x: cx + mx * scale, y: cy - my * scale });

  const linePoints = (slope: number, intercept: number) => {
    const x1m = -10, x2m = 10;
    return { p1: toSvg(x1m, slope * x1m + intercept), p2: toSvg(x2m, slope * x2m + intercept) };
  };

  const l1 = linePoints(m1, b1);
  const l2 = linePoints(m2, b2);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת משולש מישרים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את שיפועי שני הישרים. הישר השלישי קבוע (ציר x). צפו כיצד המשולש, השטח, והזווית משתנים.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>שיפוע ℓ₁ (m₁)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{m1.toFixed(1)}</span>
          </div>
          <input type="range" min={-5} max={5} step={0.1} value={m1} onChange={(e) => setM1(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>שיפוע ℓ₂ (m₂)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{m2.toFixed(1)}</span>
          </div>
          <input type="range" min={-5} max={5} step={0.1} value={m2} onChange={(e) => setM2(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Axes */}
          <line x1={10} y1={cy} x2={svgW - 10} y2={cy} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={cx} y1={10} x2={cx} y2={svgH - 10} stroke="#94a3b8" strokeWidth={1.5} />
          {/* Line 1 */}
          <line x1={l1.p1.x} y1={l1.p1.y} x2={l1.p2.x} y2={l1.p2.y} stroke={st.accentColor} strokeWidth={1.8} opacity={0.5} />
          {/* Line 2 */}
          <line x1={l2.p1.x} y1={l2.p1.y} x2={l2.p2.x} y2={l2.p2.y} stroke="#f59e0b" strokeWidth={1.8} opacity={0.5} />
          {/* Triangle fill */}
          {validTriangle && (() => {
            const pA = toSvg(xA, yA), pB = toSvg(xB, yB), pC = toSvg(xC, yC);
            return (
              <>
                <polygon points={`${pA.x},${pA.y} ${pB.x},${pB.y} ${pC.x},${pC.y}`} fill={st.accentColor} opacity={0.1} />
                <polygon points={`${pA.x},${pA.y} ${pB.x},${pB.y} ${pC.x},${pC.y}`} fill="none" stroke={st.accentColor} strokeWidth={2} opacity={0.6} />
                <circle cx={pA.x} cy={pA.y} r={4} fill="#1A1A1A" />
                <text x={pA.x + 6} y={pA.y - 6} fontSize={12} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700}>A</text>
                <circle cx={pB.x} cy={pB.y} r={4} fill="#1A1A1A" />
                <text x={pB.x - 4} y={pB.y + 16} fontSize={12} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700}>B</text>
                <circle cx={pC.x} cy={pC.y} r={4} fill="#1A1A1A" />
                <text x={pC.x + 6} y={pC.y + 16} fontSize={12} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700}>C</text>
                {/* Right angle marker */}
                {isRight && <rect x={pA.x - 4} y={pA.y} width={8} height={8} fill="none" stroke="#a78bfa" strokeWidth={1.5} />}
              </>
            );
          })()}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center", marginBottom: 8 }}>
        {validTriangle ? [
          { label: "A (ℓ₁∩ℓ₂)", val: `(${xA.toFixed(1)}, ${yA.toFixed(1)})` },
          { label: "B (ℓ₁∩ציר x)", val: `(${xB.toFixed(1)}, 0)` },
          { label: "C (ℓ₂∩ציר x)", val: `(${xC.toFixed(1)}, 0)` },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        )) : (
          <div style={{ gridColumn: "1 / -1", color: "#6B7280", fontSize: 13 }}>שנו את השיפועים כך שלא יהיו 0 ולא שווים כדי ליצור משולש.</div>
        )}
      </div>

      {validTriangle && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, textAlign: "center" }}>
          <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>שטח</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{area.toFixed(2)}</div>
          </div>
          <div style={{ borderRadius: 16, background: isRight ? "rgba(167,139,250,0.1)" : "rgba(255,255,255,0.75)", border: `1px solid ${isRight ? "rgba(167,139,250,0.5)" : `rgba(${st.glowRgb},0.4)`}`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>זווית ישרה ב-A?</div>
            <div style={{ color: isRight ? "#a78bfa" : st.accentColor, fontWeight: 700, fontSize: 20 }}>{isRight ? "כן!" : "לא"}</div>
          </div>
        </div>
      )}

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>
        {isRight ? "m₁ · m₂ = -1 — הזווית ב-A היא 90 מעלות! המשולש ישר-זווית." : "נסו m₁ = 1, m₂ = -1 כדי לקבל זווית ישרה ב-A."}
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
  const [activeTab, setActiveTab] = useState<"slope" | "parallel" | "area" | null>(null);

  const tabs = [
    { id: "slope" as const, label: "שיפוע ומשוואה", tex: "m", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "parallel" as const, label: "מקביל וניצב", tex: "m_1 \\cdot m_2", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "area" as const, label: "שטח משולש", tex: "S", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: Slope & Equation */}
      {activeTab === "slope" && (
        <motion.div key="slope" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 10 }}>
              <DisplayMath>{"m = \\frac{y_2 - y_1}{x_2 - x_1}"}</DisplayMath>
            </div>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"y - y_1 = m(x - x_1)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מחשבים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>השיפוע <InlineMath>{"m"}</InlineMath> = ההפרש ב-y חלקי ההפרש ב-x בין שתי נקודות.</li>
                  <li>משוואת ישר דרך נקודה: <InlineMath>{"y - y_1 = m(x - x_1)"}</InlineMath>.</li>
                  <li>צורה מפורשת: <InlineMath>{"y = mx + b"}</InlineMath> כאשר b = חיתוך y.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: דרך (1,2) ו-(3,6) — m = (6-2)/(3-1) = 2. משוואה: y = 2x.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Parallel & Perpendicular */}
      {activeTab === "parallel" && (
        <motion.div key="parallel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 6 }}>
              <DisplayMath>{"\\text{Parallel: } m_1 = m_2"}</DisplayMath>
            </div>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\text{Perpendicular: } m_1 \\cdot m_2 = -1"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>כללים:</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>ישרים מקבילים — אותו שיפוע, חיתוך y שונה.</li>
                  <li>ישרים ניצבים — מכפלת השיפועים = -1 (הופכי נגדי).</li>
                  <li>אם m = 2, השיפוע הניצב הוא m = -1/2.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: ℓ₁ עם m=3. מקביל: m=3. ניצב: m=-1/3.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Triangle Area */}
      {activeTab === "area" && (
        <motion.div key="area" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S = \\frac{1}{2} |x_1(y_2-y_3) + x_2(y_3-y_1) + x_3(y_1-y_2)|"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>נוסחת השרוכים (Shoelace):</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מציבים את קואורדינטות 3 הקודקודים בנוסחה.</li>
                  <li>מחשבים את הסכום בתוך הערך המוחלט.</li>
                  <li>מחלקים ב-2 לקבלת השטח.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: A(0,4), B(-2,0), C(6,0). S = 0.5|0·(0-0)+(-2)·(0-4)+6·(4-0)| = 0.5|8+24| = 16
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LinearFunctionPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>פונקציה לינארית עם AI — כיתה י׳ (5 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>שיפוע, חיתוך עם צירים, מקביל וניצב, משולש מישרים — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/5u/topic/grade10/pre-calculus"
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

        <SubtopicProgress subtopicId="5u/grade10/pre-calculus/linear" />

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
        {selectedLevel === "basic" && <SlopeLab />}
        {selectedLevel === "medium" && <ParallelPerpLab />}
        {selectedLevel === "advanced" && <TriangleFromLinesLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="5u/grade10/pre-calculus/linear" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
