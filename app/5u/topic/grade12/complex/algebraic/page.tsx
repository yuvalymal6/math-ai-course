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
  // Complex plane with two dots z₁, z₂ and "?" for sum
  return (
    <svg viewBox="0 0 260 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={130} y1={15} x2={130} y2={185} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={15} y1={100} x2={245} y2={100} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={240} y={95} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">Re</text>
      <text x={135} y={22} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">Im</text>
      {/* z₁ dot */}
      <circle cx={180} cy={65} r={5} fill="#16A34A" opacity={0.7} />
      <text x={188} y={60} fontSize={11} fill="#16A34A" fontFamily="sans-serif" fontWeight={700}>z&#x2081;</text>
      {/* z₂ dot */}
      <circle cx={155} cy={145} r={5} fill="#f59e0b" opacity={0.7} />
      <text x={163} y={150} fontSize={11} fill="#f59e0b" fontFamily="sans-serif" fontWeight={700}>z&#x2082;</text>
      {/* Sum "?" */}
      <circle cx={205} cy={78} r={4} fill="none" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="3,2" />
      <text x={213} y={75} fontSize={11} fill="#a78bfa" fontFamily="sans-serif" fontWeight={700}>?</text>
      {/* Dashed lines to sum */}
      <line x1={180} y1={65} x2={205} y2={78} stroke="#a78bfa" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
      <line x1={155} y1={145} x2={205} y2={78} stroke="#a78bfa" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
    </svg>
  );
}

function MediumSVG() {
  // Complex plane with dot z, dashed line to origin labeled |z|="?"
  return (
    <svg viewBox="0 0 260 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={130} y1={15} x2={130} y2={185} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={15} y1={100} x2={245} y2={100} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={240} y={95} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">Re</text>
      <text x={135} y={22} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">Im</text>
      {/* z dot */}
      <circle cx={185} cy={55} r={5} fill="#EA580C" opacity={0.7} />
      <text x={193} y={50} fontSize={11} fill="#EA580C" fontFamily="sans-serif" fontWeight={700}>z</text>
      {/* Dashed line to origin for modulus */}
      <line x1={130} y1={100} x2={185} y2={55} stroke="#f59e0b" strokeWidth={1.8} strokeDasharray="5,3" />
      <text x={148} y={70} fontSize={11} fill="#f59e0b" fontFamily="sans-serif" fontWeight={700}>|z| = ?</text>
      {/* Circle for modulus */}
      <circle cx={130} cy={100} r={63} fill="none" stroke="#a78bfa" strokeWidth={1} strokeDasharray="4,3" opacity={0.4} />
      {/* Origin label */}
      <text x={118} y={115} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">O</text>
    </svg>
  );
}

function AdvancedSVG() {
  // Parabola above x-axis (no real roots) with z = ? below
  const points: string[] = [];
  for (let px = 30; px <= 230; px += 2) {
    const t = (px - 130) / 100;
    const y = 35 + 120 * t * t + 15;
    points.push(`${px},${Math.min(y, 175)}`);
  }
  return (
    <svg viewBox="0 0 260 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={130} y1={10} x2={130} y2={190} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={20} y1={175} x2={240} y2={175} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={235} y={170} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">x</text>
      <text x={135} y={18} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">y</text>
      {/* Parabola — entirely above x-axis */}
      <polyline points={points.join(" ")} fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.7} />
      {/* Vertex dot */}
      <circle cx={130} cy={50} r={4} fill="#DC2626" opacity={0.6} />
      {/* Label */}
      <text x={100} y={195} fontSize={12} fill="#a78bfa" fontFamily="sans-serif" fontWeight={700}>z = ?</text>
      {/* No real roots indicator */}
      <text x={165} y={165} fontSize={10} fill="#64748b" fontFamily="sans-serif" fontStyle="italic">no real roots</text>
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
      <span style={{ fontSize: 16 }}>&#x1F512;</span>
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
      <span>&#x1F512;</span><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} — {step.label}</span>
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
              <div style={{ position: "absolute", top: 8, right: 8, fontSize: 16, zIndex: 2 }}>&#x1F512;</div>
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
        subjectWords={["מרוכב", "i", "מודול", "צמוד", "משוואה", "ריבועית"]}
      />

      {steps.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {(!masterPassed || i >= unlockedCount) ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.7)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{ s.phase } — { s.label }</span>
              <span style={{ fontSize: 16 }}>&#x1F512;</span>
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
          <div style={{ fontSize: 28, marginBottom: 8 }}>&#x1F3C6;</div>
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
    title: "פעולות עם מספרים מרוכבים",
    problem: `נתונים z\u2081 = 3+2i ו-z\u2082 = 1\u22124i.

א. חשבו את z\u2081 + z\u2082 ואת z\u2081 \u2212 z\u2082.
ב. חשבו את z\u2081 \u00B7 z\u2082 (זכרו: i\u00B2 = \u22121).
ג. מצאו את הצמוד z\u0305\u2081 וחשבו את z\u2081 \u00B7 z\u0305\u2081.`,
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "שוכחים ש-i\u00B2 = \u22121 בכפל", text: "בכפל מספרים מרוכבים, כשמכפילים את החלקים המדומים (2i)(\u22124i) = \u22128i\u00B2. תלמידים שוכחים להחליף i\u00B2 ב-(\u22121), כלומר \u22128i\u00B2 = 8. זו טעות שעולה נקודות בבגרות!" },
      { title: "מבלבלים צמוד עם נגדי", text: "הצמוד של z = a+bi הוא z\u0305 = a\u2212bi (מחליפים סימן רק בחלק המדומה). הנגדי הוא \u2212z = \u2212a\u2212bi (מחליפים סימן בשני החלקים). אל תבלבלו!" },
      { title: "טעות בחיבור/חיסור חלקים", text: "בחיבור מרוכבים מחברים חלק ממשי בנפרד וחלק מדומה בנפרד. תלמידים לפעמים מערבבים ומחברים ממשי עם מדומה." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יב׳, 5 יחידות, ומצרף/ת שאלה על פעולות עם מספרים מרוכבים. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: "אני מוכן להמשיך."`,
    steps: [
      { phase: "סעיף א׳", label: "חיבור וחיסור מרוכבים", coaching: "", prompt: "נתונים z\u2081 = 3+2i ו-z\u2082 = 1\u22124i. תנחה אותי כיצד לחבר ולחסר מספרים מרוכבים — חלק ממשי בנפרד וחלק מדומה בנפרד.", keywords: [], keywordHint: "", contextWords: ["חיבור", "חיסור", "ממשי", "מדומה", "מרוכב", "i"] },
      { phase: "סעיף ב׳", label: "כפל מרוכבים", coaching: "", prompt: "נתונים z\u2081 = 3+2i ו-z\u2082 = 1\u22124i. תסביר לי כיצד מכפילים מספרים מרוכבים בשיטת FOIL, וזכור ש-i\u00B2 = \u22121.", keywords: [], keywordHint: "", contextWords: ["כפל", "FOIL", "מרוכב", "i\u00B2", "פתיחת סוגריים", "מדומה"] },
      { phase: "סעיף ג׳", label: "צמוד ומכפלה בצמוד", coaching: "", prompt: "נתון z\u2081 = 3+2i. תכווין אותי למצוא את הצמוד ולחשב את z\u2081 כפול הצמוד שלו. מה התוצאה תמיד?", keywords: [], keywordHint: "", contextWords: ["צמוד", "מכפלה", "ממשי", "מודול", "a\u00B2+b\u00B2", "חיובי"] },
    ],
  },
  {
    id: "medium",
    title: "מודול וחילוק",
    problem: `נתון z = 3+4i.

א. חשבו את |z| (המודול).
ב. חשבו את z/z\u0305 (חלוקה בצמוד).
ג. פתרו: |w| = 5 ו-Re(w) = 3. מצאו את כל ה-w האפשריים.`,
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "מודול \u2260 a+b", text: "המודול של z = a+bi הוא \u221A(a\u00B2+b\u00B2), לא a+b! תלמידים רבים שוכחים את השורש והריבועים. לדוגמה, |3+4i| = \u221A(9+16) = 5, לא 3+4 = 7." },
      { title: "חילוק: מכפילים מונה ומכנה בצמוד המכנה", text: "כדי לחלק מספרים מרוכבים, מכפילים את המונה ואת המכנה בצמוד של המכנה. זה הופך את המכנה למספר ממשי. תלמידים שוכחים להכפיל גם את המונה!" },
      { title: "משוואת מודול: שני פתרונות", text: "כש-|w| = 5 ו-Re(w) = 3, נכתוב w = 3+bi ונציב: 9+b\u00B2 = 25. יש שני פתרונות ל-b (חיובי ושלילי). אל תשכחו את שניהם!" },
    ],
    goldenPrompt: `אני בכיתה יב׳, 5 יחידות, מצרף/ת תרגיל על מודול וחילוק מספרים מרוכבים.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על מודול, צמוד, וחילוק על ידי הכפלה בצמוד.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: "אני מוכן להמשיך."`,
    steps: [
      { phase: "סעיף א׳", label: "חישוב מודול", coaching: "", prompt: "נתון z = 3+4i. תנחה אותי כיצד לחשב את המודול |z| — שורש של סכום ריבועי החלק הממשי והמדומה.", keywords: [], keywordHint: "", contextWords: ["מודול", "שורש", "ריבוע", "ממשי", "מדומה", "|z|"] },
      { phase: "סעיף ב׳", label: "חילוק בצמוד", coaching: "", prompt: "נתון z = 3+4i. תדריך אותי לחשב z/z\u0305 — להכפיל מונה ומכנה בצמוד של המכנה כדי להפוך את המכנה לממשי.", keywords: [], keywordHint: "", contextWords: ["חילוק", "צמוד", "מכנה", "מונה", "הכפלה", "ממשי"] },
      { phase: "סעיף ג׳", label: "מציאת w ממודול ותנאי", coaching: "", prompt: "ידוע |w| = 5 ו-Re(w) = 3. תנחה אותי לרשום w = 3+bi, להציב במודול ולמצוא את b.", keywords: [], keywordHint: "", contextWords: ["מודול", "Re", "הצבה", "b", "משוואה", "שורש"] },
    ],
  },
  {
    id: "advanced",
    title: "משוואות עם מרוכבים",
    problem: `א. פתרו z\u00B2 = \u22129.
ב. פתרו z\u00B2 + 2z + 5 = 0 בעזרת נוסחת השורשים כאשר \u0394 < 0.
ג. אם z הוא שורש של המשוואה, הוכיחו ש-z\u0305 הוא גם שורש (משפט השורשים הצמודים).
ד. מצאו z כך ש-z + 1/z הוא מספר ממשי.`,
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "\u221A(\u22121) = i, לא \u22121", text: "כשפותרים z\u00B2 = \u22129, הפתרון הוא z = \u00B13i (לא \u00B13). תלמידים שוכחים שהשורש של מספר שלילי דורש את i. \u221A(\u22129) = 3i." },
      { title: "דלתא שלילית \u2260 אין פתרון", text: "במספרים מרוכבים, \u0394 < 0 לא אומר שאין פתרון! מחשבים \u221A\u0394 = \u221A|\u0394| \u00B7 i ומציבים בנוסחה. הפתרונות הם מרוכבים צמודים." },
      { title: "הוכחת שורש צמוד: צמוד של סכום = סכום צמודים", text: "כדי להוכיח שאם z שורש אז z\u0305 גם שורש, צריך להשתמש בכלל: צמוד של סכום = סכום הצמודים, וצמוד של מכפלה = מכפלת הצמודים." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד פותרים משוואה ריבועית עם דלתא שלילית ומה משמעות השורשים הצמודים? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "פתרון z\u00B2 = \u22129", coaching: "", prompt: "תנחה אותי לפתור z\u00B2 = \u22129, כולל הוצאת שורש ממספר שלילי בעזרת i.", keywords: [], keywordHint: "", contextWords: ["שורש", "שלילי", "i", "מרוכב", "ריבוע", "פתרון"] },
      { phase: "סעיף ב׳", label: "משוואה ריבועית עם \u0394 < 0", coaching: "", prompt: "תדריך אותי לפתור z\u00B2 + 2z + 5 = 0 בעזרת נוסחת השורשים. תסביר מה עושים כאשר הדלתא שלילית.", keywords: [], keywordHint: "", contextWords: ["דלתא", "נוסחה", "שורשים", "ריבועית", "מרוכב", "צמודים"] },
      { phase: "סעיף ג׳", label: "הוכחת שורש צמוד", coaching: "", prompt: "אם z שורש של az\u00B2+bz+c=0 עם מקדמים ממשיים, תנחה אותי להוכיח ש-z\u0305 גם שורש בעזרת תכונות הצמוד.", keywords: [], keywordHint: "", contextWords: ["צמוד", "הוכחה", "שורש", "ממשי", "מקדמים", "תכונה"] },
      { phase: "סעיף ד׳", label: "z + 1/z ממשי", coaching: "", prompt: "תנחה אותי למצוא z = a+bi כך ש-z + 1/z הוא ממשי. מה התנאי על החלק המדומה?", keywords: [], keywordHint: "", contextWords: ["ממשי", "מדומה", "תנאי", "חילוק", "z", "הופכי"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>מספרים מרוכבים — צורה אלגברית (Complex Numbers — Algebraic Form)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "חיבור, חיסור, כפל מרוכבים, צמוד — הבסיס של פעולות עם מספרים מרוכבים בצורה z = a+bi."}
            {ex.id === "medium" && "מודול |z|, חילוק מרוכבים, ומציאת מספר מרוכב מתנאים על המודול והחלק הממשי."}
            {ex.id === "advanced" && "משוואות ריבועיות עם דלתא שלילית, שורשים מרוכבים צמודים, והוכחה — רמת בגרות 5 יחידות."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: פעולות בסיסיות */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>מושגי יסוד</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>i</span>
              <span>היחידה המדומה, מוגדרת כך ש-i&#xB2; = &#x2212;1.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>z = a+bi</span>
              <span>צורה אלגברית: a חלק ממשי, b חלק מדומה.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>z&#x0305;</span>
              <span>הצמוד של z = a+bi הוא a&#x2212;bi.</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>מודול וחילוק</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>|z|</span>
                  <span>המודול: &#x221A;(a&#xB2;+b&#xB2;) — המרחק מהראשית.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>z&#xB7;z&#x0305;</span>
                  <span>מכפלה בצמוד שווה תמיד |z|&#xB2; (מספר ממשי חיובי).</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>משוואות מרוכבות</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>&#x0394; &lt; 0</span>
                  <span>דלתא שלילית = שורשים מרוכבים צמודים.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>z, z&#x0305;</span>
                  <span>שורשי משוואה עם מקדמים ממשיים תמיד צמודים.</span>
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

// ─── OperationsLab (basic) ──────────────────────────────────────────────────

function OperationsLab() {
  const [re1, setRe1] = useState(3);
  const [im1, setIm1] = useState(2);
  const [re2, setRe2] = useState(1);
  const [im2, setIm2] = useState(-4);
  const st = STATION.basic;

  const sumRe = re1 + re2;
  const sumIm = im1 + im2;
  const diffRe = re1 - re2;
  const diffIm = im1 - im2;
  const prodRe = re1 * re2 - im1 * im2;
  const prodIm = re1 * im2 + im1 * re2;

  const fmt = (re: number, im: number) => {
    if (im === 0) return `${re}`;
    const sign = im > 0 ? "+" : "\u2212";
    const absIm = Math.abs(im);
    return `${re}${sign}${absIm}i`;
  };

  // SVG complex plane with arrows
  const W = 280, H = 240, cx = 140, cy = 120;
  const scale = 12;

  const toSvg = (re: number, im: number) => ({ x: cx + re * scale, y: cy - im * scale });
  const p1 = toSvg(re1, im1);
  const p2 = toSvg(re2, im2);
  const pSum = toSvg(sumRe, sumIm);
  const pDiff = toSvg(diffRe, diffIm);

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת פעולות עם מרוכבים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את החלקים הממשיים והמדומים של שני מספרים מרוכבים וצפו בתוצאות בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "Re(z\u2081)", val: re1, set: setRe1 },
          { label: "Im(z\u2081)", val: im1, set: setIm1 },
          { label: "Re(z\u2082)", val: re2, set: setRe2 },
          { label: "Im(z\u2082)", val: im2, set: setIm2 },
        ].map((s) => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={-8} max={8} step={1} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG Complex Plane */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Grid */}
          <line x1={0} y1={cy} x2={W} y2={cy} stroke="#94a3b8" strokeWidth={0.8} />
          <line x1={cx} y1={0} x2={cx} y2={H} stroke="#94a3b8" strokeWidth={0.8} />
          <text x={W - 15} y={cy - 5} fontSize={9} fill="#94a3b8">Re</text>
          <text x={cx + 5} y={12} fontSize={9} fill="#94a3b8">Im</text>

          {/* z1 arrow */}
          <line x1={cx} y1={cy} x2={p1.x} y2={p1.y} stroke="#16A34A" strokeWidth={2} markerEnd="url(#arrowG)" />
          <circle cx={p1.x} cy={p1.y} r={4} fill="#16A34A" />
          <text x={p1.x + 6} y={p1.y - 6} fontSize={10} fill="#16A34A" fontWeight={700}>z&#x2081;</text>

          {/* z2 arrow */}
          <line x1={cx} y1={cy} x2={p2.x} y2={p2.y} stroke="#f59e0b" strokeWidth={2} markerEnd="url(#arrowA)" />
          <circle cx={p2.x} cy={p2.y} r={4} fill="#f59e0b" />
          <text x={p2.x + 6} y={p2.y - 6} fontSize={10} fill="#f59e0b" fontWeight={700}>z&#x2082;</text>

          {/* Sum arrow */}
          <line x1={cx} y1={cy} x2={pSum.x} y2={pSum.y} stroke="#a78bfa" strokeWidth={2} strokeDasharray="5,3" />
          <circle cx={pSum.x} cy={pSum.y} r={4} fill="#a78bfa" />
          <text x={pSum.x + 6} y={pSum.y - 6} fontSize={10} fill="#a78bfa" fontWeight={700}>z&#x2081;+z&#x2082;</text>

          {/* Diff arrow */}
          <line x1={cx} y1={cy} x2={pDiff.x} y2={pDiff.y} stroke="#34d399" strokeWidth={1.5} strokeDasharray="3,2" />
          <circle cx={pDiff.x} cy={pDiff.y} r={3} fill="#34d399" />
          <text x={pDiff.x + 6} y={pDiff.y + 12} fontSize={9} fill="#34d399" fontWeight={600}>z&#x2081;&#x2212;z&#x2082;</text>

          <defs>
            <marker id="arrowG" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="#16A34A" strokeWidth="1.5" /></marker>
            <marker id="arrowA" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="#f59e0b" strokeWidth="1.5" /></marker>
          </defs>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "z\u2081 + z\u2082", val: fmt(sumRe, sumIm) },
          { label: "z\u2081 \u2212 z\u2082", val: fmt(diffRe, diffIm) },
          { label: "z\u2081 \u00B7 z\u2082", val: fmt(prodRe, prodIm) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>שנו ערכים וצפו כיצד חיבור מרוכבים = חיבור וקטורים במישור המרוכב!</p>
    </section>
  );
}

// ─── ModulusLab (medium) ────────────────────────────────────────────────────

function ModulusLab() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  const st = STATION.medium;

  const modulus = Math.sqrt(a * a + b * b);
  const conjRe = a;
  const conjIm = -b;
  const zzBar = a * a + b * b; // z * z-bar = |z|^2

  const fmt = (re: number, im: number) => {
    if (im === 0) return `${re}`;
    const sign = im > 0 ? "+" : "\u2212";
    const absIm = Math.abs(im);
    return `${re}${sign}${absIm}i`;
  };

  const W = 280, H = 240, cx = 140, cy = 120;
  const scale = 12;
  const px = cx + a * scale;
  const py = cy - b * scale;
  const r = modulus * scale;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת מודול וצמוד</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את a ו-b של z = a+bi וצפו במודול, הצמוד ומכפלה בצמוד.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "a (חלק ממשי)", val: a, set: setA },
          { label: "b (חלק מדומה)", val: b, set: setB },
        ].map((s) => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={-8} max={8} step={1} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={0} y1={cy} x2={W} y2={cy} stroke="#94a3b8" strokeWidth={0.8} />
          <line x1={cx} y1={0} x2={cx} y2={H} stroke="#94a3b8" strokeWidth={0.8} />
          <text x={W - 15} y={cy - 5} fontSize={9} fill="#94a3b8">Re</text>
          <text x={cx + 5} y={12} fontSize={9} fill="#94a3b8">Im</text>

          {/* Circle of radius |z| */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#a78bfa" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />

          {/* z point and line */}
          <line x1={cx} y1={cy} x2={px} y2={py} stroke="#EA580C" strokeWidth={2} />
          <circle cx={px} cy={py} r={5} fill="#EA580C" />
          <text x={px + 8} y={py - 8} fontSize={10} fill="#EA580C" fontWeight={700}>z</text>

          {/* Conjugate point */}
          <circle cx={cx + a * scale} cy={cy + b * scale} r={4} fill="#34d399" />
          <text x={cx + a * scale + 8} y={cy + b * scale + 12} fontSize={10} fill="#34d399" fontWeight={700}>z&#x0305;</text>

          {/* Modulus label */}
          <text x={(cx + px) / 2 - 15} y={(cy + py) / 2 - 8} fontSize={10} fill="#f59e0b" fontWeight={700}>|z|</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "|z|", val: modulus.toFixed(2) },
          { label: "z\u0305 (צמוד)", val: fmt(conjRe, conjIm) },
          { label: "z\u00B7z\u0305", val: zzBar.toString() },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>z&#xB7;z&#x0305; תמיד ממשי וחיובי — שווה בדיוק ל-|z|&#xB2;!</p>
    </section>
  );
}

// ─── RootsLab (advanced) ────────────────────────────────────────────────────

function RootsLab() {
  const [c, setC] = useState(9);
  const st = STATION.advanced;

  // z² + c = 0 → z² = -c
  const delta = -4 * c; // discriminant of z²+0z+c=0 is 0²-4(1)(c) = -4c
  const hasRealRoots = c <= 0;

  let root1Str: string, root2Str: string;
  let r1Re: number, r1Im: number, r2Re: number, r2Im: number;

  if (c === 0) {
    root1Str = "0";
    root2Str = "0";
    r1Re = 0; r1Im = 0; r2Re = 0; r2Im = 0;
  } else if (c < 0) {
    // z² = -c = |c|, so z = ±√|c|
    const sqrtVal = Math.sqrt(Math.abs(c));
    root1Str = sqrtVal.toFixed(2);
    root2Str = (-sqrtVal).toFixed(2);
    r1Re = sqrtVal; r1Im = 0; r2Re = -sqrtVal; r2Im = 0;
  } else {
    // z² = -c < 0, so z = ±√c · i
    const sqrtVal = Math.sqrt(c);
    root1Str = `${sqrtVal.toFixed(2)}i`;
    root2Str = `\u2212${sqrtVal.toFixed(2)}i`;
    r1Re = 0; r1Im = sqrtVal; r2Re = 0; r2Im = -sqrtVal;
  }

  const W = 280, H = 240, cx = 140, cy = 120;
  const scale = 12;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת שורשים של z&#xB2; + c = 0</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את c וצפו כיצד השורשים עוברים מממשיים למרוכבים!</p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>c</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{c}</span>
          </div>
          <input type="range" min={-16} max={25} step={1} value={c} onChange={(e) => setC(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={0} y1={cy} x2={W} y2={cy} stroke="#94a3b8" strokeWidth={0.8} />
          <line x1={cx} y1={0} x2={cx} y2={H} stroke="#94a3b8" strokeWidth={0.8} />
          <text x={W - 15} y={cy - 5} fontSize={9} fill="#94a3b8">Re</text>
          <text x={cx + 5} y={12} fontSize={9} fill="#94a3b8">Im</text>

          {/* Root 1 */}
          <circle cx={cx + r1Re * scale} cy={cy - r1Im * scale} r={6} fill={hasRealRoots ? "#16A34A" : "#DC2626"} opacity={0.8} />
          <text x={cx + r1Re * scale + 10} y={cy - r1Im * scale - 8} fontSize={10} fill={hasRealRoots ? "#16A34A" : "#DC2626"} fontWeight={700}>z&#x2081;</text>

          {/* Root 2 */}
          <circle cx={cx + r2Re * scale} cy={cy - r2Im * scale} r={6} fill={hasRealRoots ? "#16A34A" : "#a78bfa"} opacity={0.8} />
          <text x={cx + r2Re * scale + 10} y={cy - r2Im * scale + 14} fontSize={10} fill={hasRealRoots ? "#16A34A" : "#a78bfa"} fontWeight={700}>z&#x2082;</text>

          {/* Label for equation */}
          <text x={15} y={20} fontSize={11} fill="#6B7280" fontFamily="sans-serif">z&#xB2; + {c} = 0</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "\u0394", val: delta.toString(), color: delta < 0 ? "#DC2626" : "#16A34A" },
          { label: "z\u2081", val: root1Str },
          { label: "z\u2082", val: root2Str },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: row.color || st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>
        {c > 0 ? "c > 0: השורשים מדומים טהורים (על ציר Im) — תמיד צמודים!" : c === 0 ? "c = 0: שורש כפול בראשית." : "c < 0: השורשים ממשיים (על ציר Re)."}
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
  const [activeTab, setActiveTab] = useState<"ops" | "modconj" | "div" | null>(null);

  const tabs = [
    { id: "ops" as const, label: "פעולות", tex: "z_1 + z_2", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "modconj" as const, label: "מודול וצמוד", tex: "|z|", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "div" as const, label: "חילוק", tex: "\\frac{z_1}{z_2}", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Operations */}
      {activeTab === "ops" && (
        <motion.div key="ops" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"(a+bi)+(c+di) = (a+c)+(b+d)i"}</DisplayMath>
            </div>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"(a+bi)(c+di) = (ac-bd)+(ad+bc)i"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>חיבור:</strong> מחברים חלק ממשי עם ממשי, מדומה עם מדומה.<br />
                <strong>כפל (FOIL):</strong> פותחים סוגריים ומחליפים i&#xB2; ב-&#x2212;1.
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: (2+3i)(1&#x2212;i) = 2&#x2212;2i+3i&#x2212;3i&#xB2; = 2+i+3 = 5+i
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Modulus & Conjugate */}
      {activeTab === "modconj" && (
        <motion.div key="modconj" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 10 }}>
              <DisplayMath>{"|z| = \\sqrt{a^2 + b^2}"}</DisplayMath>
            </div>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 10 }}>
              <DisplayMath>{"\\bar{z} = a - bi"}</DisplayMath>
            </div>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"z \\cdot \\bar{z} = |z|^2 = a^2 + b^2"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מודול:</strong> המרחק של z מהראשית במישור המרוכב.<br />
                <strong>צמוד:</strong> משנים סימן של החלק המדומה בלבד.<br />
                <strong>תכונה חשובה:</strong> z&#xB7;z&#x0305; תמיד ממשי חיובי!
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: z = 3+4i. |z| = &#x221A;(9+16) = 5. z&#x0305; = 3&#x2212;4i. z&#xB7;z&#x0305; = 25.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Division */}
      {activeTab === "div" && (
        <motion.div key="div" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\frac{z_1}{z_2} = \\frac{z_1 \\cdot \\bar{z_2}}{|z_2|^2}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>כלל החילוק:</strong> מכפילים מונה ומכנה בצמוד של המכנה.<br />
                המכנה הופך למספר ממשי (|z&#x2082;|&#xB2;), ואז מחלקים כרגיל.
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: (1+2i)/(3+i) = (1+2i)(3&#x2212;i)/|3+i|&#xB2; = (5+5i)/10 = 0.5+0.5i
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComplexAlgebraicPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>מספרים מרוכבים — צורה אלגברית עם AI — כיתה יב׳ (5 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>פעולות, מודול, צמוד, חילוק ומשוואות עם מרוכבים — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/5u/topic/grade12/complex"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
          >
            <span style={{ fontSize: 16 }}>&#x2190;</span>
            חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>

        <SubtopicProgress subtopicId="5u/grade12/complex/algebraic" />

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
        {selectedLevel === "basic" && <OperationsLab />}
        {selectedLevel === "medium" && <ModulusLab />}
        {selectedLevel === "advanced" && <RootsLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="5u/grade12/complex/algebraic" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
