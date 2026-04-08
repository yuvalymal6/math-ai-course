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
    <svg viewBox="0 0 260 130" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Expression tree: (a+b)² */}
      <rect x={90} y={10} width={80} height={36} rx={10} fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.6} />
      <text x={130} y={34} fontSize={16} fill="#16A34A" textAnchor="middle" fontFamily="serif" fontWeight={700}>( ? + ? )²</text>
      {/* Arrow down */}
      <line x1={130} y1={46} x2={130} y2={62} stroke="#94a3b8" strokeWidth={1.5} />
      <polygon points="126,58 134,58 130,66" fill="#94a3b8" />
      {/* Expanded form */}
      <rect x={50} y={70} width={160} height={36} rx={10} fill="none" stroke="#f59e0b" strokeWidth={1.5} opacity={0.5} />
      <text x={130} y={94} fontSize={14} fill="#f59e0b" textAnchor="middle" fontFamily="serif">?² + 2·?·? + ?²</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 280 140" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Trinomial expression */}
      <rect x={60} y={10} width={160} height={36} rx={10} fill="none" stroke="#EA580C" strokeWidth={2} opacity={0.6} />
      <text x={140} y={34} fontSize={15} fill="#EA580C" textAnchor="middle" fontFamily="serif" fontWeight={700}>?x² + ?x + ?</text>
      {/* Arrow splits into two factors */}
      <line x1={140} y1={46} x2={85} y2={72} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={140} y1={46} x2={195} y2={72} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Factor 1 */}
      <rect x={40} y={76} width={90} height={34} rx={10} fill="none" stroke="#a78bfa" strokeWidth={1.5} opacity={0.5} />
      <text x={85} y={98} fontSize={14} fill="#a78bfa" textAnchor="middle" fontFamily="serif">( ?x + ? )</text>
      {/* Factor 2 */}
      <rect x={150} y={76} width={90} height={34} rx={10} fill="none" stroke="#a78bfa" strokeWidth={1.5} opacity={0.5} />
      <text x={195} y={98} fontSize={14} fill="#a78bfa" textAnchor="middle" fontFamily="serif">( ?x + ? )</text>
      {/* Multiply sign */}
      <text x={140} y={98} fontSize={14} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">×</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 280 150" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Fraction bar */}
      <line x1={50} y1={70} x2={230} y2={70} stroke="#DC2626" strokeWidth={2} opacity={0.6} />
      {/* Numerator */}
      <rect x={70} y={20} width={140} height={34} rx={8} fill="none" stroke="#DC2626" strokeWidth={1.5} opacity={0.4} />
      <text x={140} y={43} fontSize={14} fill="#DC2626" textAnchor="middle" fontFamily="serif">?² − ?²</text>
      {/* Denominator */}
      <rect x={70} y={82} width={140} height={34} rx={8} fill="none" stroke="#DC2626" strokeWidth={1.5} opacity={0.4} />
      <text x={140} y={105} fontSize={14} fill="#DC2626" textAnchor="middle" fontFamily="serif">?² + ?·? + ?²</text>
      {/* Arrow to simplified */}
      <line x1={235} y1={70} x2={255} y2={70} stroke="#94a3b8" strokeWidth={1.5} />
      <text x={268} y={74} fontSize={16} fill="#34d399" textAnchor="middle" fontFamily="serif" fontWeight={700}>?</text>
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
        subjectWords={["ביטוי", "פירוק", "גורמים", "שבר", "צמצום", "מכנה", "מונה"]}
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
    title: "פישוט ביטויים אלגבריים — כפל מקוצר",
    problem: "פשטו את הביטויים הבאים:\n\nא. פתחו את הסוגריים ופשטו: (2x + 3)²\nב. פתחו את הסוגריים ופשטו: (5a − 2b)(5a + 2b)\nג. פשטו את הביטוי: (x + 4)² − (x − 4)²",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ שוכחים את האיבר האמצעי בריבוע סכום/הפרש", text: "(a+b)² אינו a²+b². חייבים להוסיף את האיבר 2ab. זו הטעות הנפוצה ביותר — בדקו שיש לכם שלושה איברים בפתיחה." },
      { title: "⚠️ טעות בסימן בכפל מקוצר שלישי", text: "בהפרש ריבועים (a−b)(a+b) = a²−b², המינוס חל רק על b². תלמידים מוסיפים מינוס גם ל-a² ומקבלים תוצאה שגויה." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יא', 3 יחידות, ומצרף/ת שאלה על פישוט ביטויים אלגבריים — נוסחאות כפל מקוצר. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "ריבוע סכום", coaching: "", prompt: "צריך לפתוח (2x + 3)². תנחה אותי — מהי נוסחת ריבוע סכום (a+b)² ואיך מזהים מי a ומי b בביטוי הזה.", keywords: [], keywordHint: "", contextWords: ["ריבוע", "סכום", "כפל מקוצר", "סוגריים", "פיתוח", "איבר אמצעי"] },
      { phase: "סעיף ב׳", label: "הפרש ריבועים", coaching: "", prompt: "צריך לפתוח (5a − 2b)(5a + 2b). תכווין אותי — למה זה הפרש ריבועים ומה הנוסחה.", keywords: [], keywordHint: "", contextWords: ["הפרש", "ריבועים", "כפל מקוצר", "נוסחה", "מכפלה", "סוגריים"] },
      { phase: "סעיף ג׳", label: "שילוב נוסחאות", coaching: "", prompt: "צריך לפשט (x + 4)² − (x − 4)². תדריך אותי — איך פותחים כל סוגריים בנפרד ואז מחסרים. מה צפוי להתבטל.", keywords: [], keywordHint: "", contextWords: ["פישוט", "חיסור", "ריבוע", "ביטול", "איברים", "כפל מקוצר"] },
    ],
  },
  {
    id: "medium",
    title: "פירוק לגורמים — טרינום",
    problem: "פרקו לגורמים את הביטויים הבאים:\n\nא. x² + 7x + 12\nב. 2x² − 10x + 12\nג. x² − 9",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ שוכחים להוציא גורם משותף לפני פירוק", text: "בביטוי כמו 2x²−10x+12, חובה להוציא גורם משותף (2) לפני שמנסים לפרק את הטרינום. בלי זה, הפירוק הרבה יותר קשה ולפעמים בלתי אפשרי." },
      { title: "⚠️ טעות בסימני הגורמים", text: "כשמפרקים x²+7x+12, צריך שני מספרים שמכפלתם 12 וסכומם 7. אם הסימן האמצעי שלילי, אחד או שני המספרים שליליים — בדקו גם מכפלה וגם סכום." },
    ],
    goldenPrompt: `אני בכיתה יא', 3 יחידות, מצרף/ת תרגיל בפירוק ביטויים אלגבריים לגורמים — טרינום וגורם משותף.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על זיהוי סוג הביטוי ובחירת שיטת הפירוק.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "פירוק טרינום", coaching: "", prompt: "צריך לפרק x² + 7x + 12 לגורמים. תנחה אותי — איך מוצאים שני מספרים שמכפלתם 12 וסכומם 7, ואיך כותבים את הגורמים.", keywords: [], keywordHint: "", contextWords: ["פירוק", "גורמים", "טרינום", "מכפלה", "סכום", "שורשים"] },
      { phase: "סעיף ב׳", label: "גורם משותף + פירוק", coaching: "", prompt: "צריך לפרק 2x² − 10x + 12. תכווין אותי — למה חשוב להוציא גורם משותף קודם, ואיך ממשיכים לפרק את מה שנשאר.", keywords: [], keywordHint: "", contextWords: ["גורם משותף", "פירוק", "הוצאה", "טרינום", "מקדם", "צמצום"] },
      { phase: "סעיף ג׳", label: "הפרש ריבועים", coaching: "", prompt: "צריך לפרק x² − 9 לגורמים. תדריך אותי — למה זה הפרש ריבועים ומה הנוסחה (a²−b²) = (a−b)(a+b).", keywords: [], keywordHint: "", contextWords: ["הפרש", "ריבועים", "גורמים", "נוסחה", "שורש", "פירוק"] },
    ],
  },
  {
    id: "advanced",
    title: "שברים אלגבריים — צמצום וחיבור",
    problem: "נתונים השברים האלגבריים:\n\nא. צמצמו: (x² − 4) / (x² + 4x + 4)\nב. חברו: 3/(x − 1) + 2/(x + 1)\nג. פשטו: [x/(x+2)] − [(x−1)/(x−2)]\nד. מצאו את תחום ההגדרה של הביטוי בסעיף ג׳.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ צמצום לפני פירוק", text: "אסור לצמצם שבר אלגברי לפני שמפרקים מונה ומכנה לגורמים. רק אחרי פירוק מלא אפשר לזהות גורמים משותפים ולצמצם — אחרת מקבלים תוצאה שגויה." },
      { title: "⚠️ שכחת תחום ההגדרה", text: "בכל שבר אלגברי חייבים לבדוק לאילו ערכי x המכנה מתאפס. ערכים אלה אינם בתחום ההגדרה. שכחה לבדוק תחום היא שגיאה שמורידה ציון בבגרות." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: למה חייבים לפרק לגורמים לפני צמצום, ומה חשיבות תחום ההגדרה בשברים אלגבריים? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "צמצום שבר אלגברי", coaching: "", prompt: "צריך לצמצם (x²−4)/(x²+4x+4). תנחה אותי — איך מפרקים את המונה (הפרש ריבועים) ואת המכנה (ריבוע סכום) ואז מצמצמים.", keywords: [], keywordHint: "", contextWords: ["צמצום", "פירוק", "גורמים", "מונה", "מכנה", "הפרש ריבועים"] },
      { phase: "סעיף ב׳", label: "חיבור שברים אלגבריים", coaching: "", prompt: "צריך לחבר 3/(x−1) + 2/(x+1). תכווין אותי — איך מוצאים מכנה משותף ואיך מרחיבים כל שבר.", keywords: [], keywordHint: "", contextWords: ["חיבור", "מכנה משותף", "הרחבה", "שבר", "מונה", "סכום"] },
      { phase: "סעיף ג׳", label: "חיסור שברים מורכבים", coaching: "", prompt: "צריך לפשט x/(x+2) − (x−1)/(x−2). תדריך אותי — מה המכנה המשותף, ואיך פותחים סוגריים בחיסור שברים (מינוס לפני כל המונה).", keywords: [], keywordHint: "", contextWords: ["חיסור", "שבר", "מכנה משותף", "סוגריים", "מינוס", "פישוט"] },
      { phase: "סעיף ד׳", label: "תחום הגדרה", coaching: "", prompt: "צריך למצוא את תחום ההגדרה של x/(x+2) − (x−1)/(x−2). תנחה אותי — אילו ערכי x מאפסים את המכנים ולמה הם לא בתחום.", keywords: [], keywordHint: "", contextWords: ["תחום", "הגדרה", "מכנה", "אפס", "הגבלה", "ערכים אסורים"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>🔢 ביטויים אלגבריים</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "כפל מקוצר — ריבוע סכום, ריבוע הפרש, הפרש ריבועים."}
            {ex.id === "medium" && "פירוק לגורמים — טרינום, גורם משותף, הפרש ריבועים."}
            {ex.id === "advanced" && "שברים אלגבריים — צמצום, חיבור, חיסור ותחום הגדרה."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: נוסחאות כפל מקוצר */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🎯 נוסחאות כפל מקוצר</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 120 }}>(a+b)²</span>
              <span>= a² + 2ab + b²</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 120 }}>(a−b)²</span>
              <span>= a² − 2ab + b²</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 120 }}>(a−b)(a+b)</span>
              <span>= a² − b²</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>✨ פירוק לגורמים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 120 }}>טרינום</span>
                  <span>מוצאים שני מספרים: מכפלה = c, סכום = b</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 120 }}>גורם משותף</span>
                  <span>מוציאים החוצה לפני כל פירוק אחר</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>🔬 שברים אלגבריים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 120 }}>צמצום</span>
                  <span>פירוק מונה ומכנה → ביטול גורמים משותפים</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 120 }}>תחום הגדרה</span>
                  <span>כל ערך שמאפס מכנה — מחוץ לתחום</span>
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

// ─── ExpandLab (basic) ───────────────────────────────────────────────────────

function ExpandLab() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const st = STATION.basic;

  const sqSum = `${a * a} + ${2 * a * b} + ${b * b}`;
  const sqSumVal = a * a + 2 * a * b + b * b;
  const sqDiff = `${a * a} − ${2 * a * b} + ${b * b}`;
  const sqDiffVal = a * a - 2 * a * b + b * b;
  const diffSq = `${a * a} − ${b * b}`;
  const diffSqVal = a * a - b * b;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת כפל מקוצר</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את a ו-b וצפו כיצד נוסחאות הכפל המקוצר מתנהגות.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 400, margin: "0 auto 2rem" }}>
        {[
          { label: "a", val: a, set: setA },
          { label: "b", val: b, set: setB },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={1} max={10} step={1} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* Visual area model SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 260 200" className="w-full max-w-md mx-auto" aria-hidden>
          {/* (a+b)² area model */}
          <text x={130} y={16} fontSize={12} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">(a+b)² = (a+b)(a+b)</text>
          {/* a² block */}
          <rect x={30} y={30} width={100} height={100} fill="rgba(22,163,74,0.15)" stroke="#16A34A" strokeWidth={1.5} rx={4} />
          <text x={80} y={85} fontSize={14} fill="#16A34A" textAnchor="middle" fontFamily="monospace" fontWeight={700}>a²={a * a}</text>
          {/* ab block (top-right) */}
          <rect x={130} y={30} width={60} height={100} fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth={1.5} rx={4} />
          <text x={160} y={85} fontSize={11} fill="#f59e0b" textAnchor="middle" fontFamily="monospace" fontWeight={700}>ab={a * b}</text>
          {/* ab block (bottom-left) */}
          <rect x={30} y={130} width={100} height={50} fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth={1.5} rx={4} />
          <text x={80} y={160} fontSize={11} fill="#f59e0b" textAnchor="middle" fontFamily="monospace" fontWeight={700}>ab={a * b}</text>
          {/* b² block */}
          <rect x={130} y={130} width={60} height={50} fill="rgba(167,139,250,0.15)" stroke="#a78bfa" strokeWidth={1.5} rx={4} />
          <text x={160} y={160} fontSize={11} fill="#a78bfa" textAnchor="middle" fontFamily="monospace" fontWeight={700}>b²={b * b}</text>
          {/* Labels */}
          <text x={80} y={195} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">a = {a}</text>
          <text x={160} y={195} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">b = {b}</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "(a+b)²", val: `${sqSumVal}`, sub: sqSum },
          { label: "(a−b)²", val: `${sqDiffVal}`, sub: sqDiff },
          { label: "a²−b²", val: `${diffSqVal}`, sub: diffSq },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
            <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 2, fontFamily: "monospace" }}>{row.sub}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>שימו לב: (a+b)² תמיד גדול מ-a²+b². למה? בגלל 2ab!</p>
    </section>
  );
}

// ─── FactorLab (medium) ──────────────────────────────────────────────────────

function FactorLab() {
  const [p, setP] = useState(3);
  const [q, setQ] = useState(4);
  const st = STATION.medium;

  // Trinomial from (x+p)(x+q) = x² + (p+q)x + p·q
  const bCoeff = p + q;
  const cCoeff = p * q;
  const trinomial = `x² ${bCoeff >= 0 ? "+" : "−"} ${Math.abs(bCoeff)}x ${cCoeff >= 0 ? "+" : "−"} ${Math.abs(cCoeff)}`;
  const factored = `(x ${p >= 0 ? "+" : "−"} ${Math.abs(p)})(x ${q >= 0 ? "+" : "−"} ${Math.abs(q)})`;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת פירוק לגורמים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>בחרו שני מספרים p ו-q וצפו כיצד נבנה הטרינום ואיך מפרקים אותו.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 400, margin: "0 auto 2rem" }}>
        {[
          { label: "p (שורש ראשון)", val: p, set: setP },
          { label: "q (שורש שני)", val: q, set: setQ },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={-8} max={8} step={1} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* Visualization */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>טרינום</div>
          <div style={{ color: st.accentColor, fontSize: 22, fontWeight: 800, fontFamily: "monospace" }}>{trinomial}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ height: 2, width: 40, background: "rgba(234,88,12,0.3)" }} />
          <span style={{ color: "#64748b", fontSize: 12 }}>↓ פירוק ↓</span>
          <div style={{ height: 2, width: 40, background: "rgba(234,88,12,0.3)" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>גורמים</div>
          <div style={{ color: "#a78bfa", fontSize: 22, fontWeight: 800, fontFamily: "monospace" }}>{factored}</div>
        </div>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "p + q", val: String(bCoeff) },
          { label: "p × q", val: String(cCoeff) },
          { label: "שורש 1", val: `x = ${-p}` },
          { label: "שורש 2", val: `x = ${-q}` },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 17, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>המפתח לפירוק: שני מספרים שמכפלתם = c וסכומם = b. נסו ערכים שליליים!</p>
    </section>
  );
}

// ─── FractionLab (advanced) ──────────────────────────────────────────────────

function FractionLab() {
  const [xVal, setXVal] = useState(3);
  const st = STATION.advanced;

  // (x²-4)/(x²+4x+4) = (x-2)(x+2)/((x+2)²) = (x-2)/(x+2)
  const numerator = xVal * xVal - 4;
  const denominator = xVal * xVal + 4 * xVal + 4;
  const simplified = denominator !== 0 ? (xVal - 2) / (xVal + 2) : 0;
  const fullFrac = denominator !== 0 ? numerator / denominator : 0;
  const isDefined = xVal !== -2;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת שברים אלגבריים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את x וצפו כיצד השבר (x²−4)/(x²+4x+4) מתנהג — ומתי הוא לא מוגדר.</p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>x</span>
            <span style={{ color: isDefined ? st.accentColor : "#DC2626", fontFamily: "monospace", fontWeight: 700 }}>{xVal}{!isDefined ? " ⛔" : ""}</span>
          </div>
          <input type="range" min={-6} max={6} step={0.5} value={xVal} onChange={(e) => setXVal(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* Fraction visualization */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "center" }}>
          {/* Original */}
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>מקורי</div>
            <div style={{ fontFamily: "monospace", fontSize: 16, color: "#2D3436" }}>
              <div style={{ borderBottom: `2px solid ${isDefined ? "#DC2626" : "#ef4444"}`, paddingBottom: 4, marginBottom: 4 }}>{numerator}</div>
              <div>{isDefined ? denominator : <span style={{ color: "#DC2626", fontWeight: 700 }}>0 ⛔</span>}</div>
            </div>
          </div>
          {/* Arrow */}
          <div style={{ color: "#94a3b8", fontSize: 20 }}>→</div>
          {/* Simplified */}
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>מצומצם</div>
            <div style={{ fontFamily: "monospace", fontSize: 16, color: isDefined ? "#34d399" : "#DC2626", fontWeight: 700 }}>
              {isDefined ? simplified.toFixed(4) : "לא מוגדר"}
            </div>
          </div>
        </div>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "x² − 4", val: String(numerator) },
          { label: "x² + 4x + 4", val: isDefined ? String(denominator) : "0 ⛔" },
          { label: "(x−2)/(x+2)", val: isDefined ? simplified.toFixed(3) : "—" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: row.val.includes("⛔") ? "#DC2626" : st.accentColor, fontWeight: 700, fontSize: 17, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>הזיזו ל-x = −2 וראו מה קורה. למה השבר לא מוגדר שם?</p>
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
  const [activeTab, setActiveTab] = useState<"short-mult" | "factor" | "fractions" | null>(null);

  const tabs = [
    { id: "short-mult" as const, label: "📐 כפל מקוצר", tex: "(a+b)^2", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "factor" as const, label: "🔧 פירוק לגורמים", tex: "ax^2+bx+c", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "fractions" as const, label: "➗ שברים אלגבריים", tex: "\\frac{P}{Q}", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: Short Multiplication */}
      {activeTab === "short-mult" && (
        <motion.div key="short-mult" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"(a+b)^2 = a^2 + 2ab + b^2"}</DisplayMath>
              <DisplayMath>{"(a-b)^2 = a^2 - 2ab + b^2"}</DisplayMath>
              <DisplayMath>{"(a-b)(a+b) = a^2 - b^2"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>שלוש הנוסחאות</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><strong>ריבוע סכום</strong> — תמיד 3 איברים, האמצעי חיובי.</li>
                  <li><strong>ריבוע הפרש</strong> — 3 איברים, האמצעי שלילי.</li>
                  <li><strong>הפרש ריבועים</strong> — מכפלת סכום בהפרש.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: (3x+2)² = 9x² + 12x + 4
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Factoring */}
      {activeTab === "factor" && (
        <motion.div key="factor" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"x^2 + bx + c = (x+p)(x+q)"}</DisplayMath>
              <DisplayMath>{"p + q = b \\quad,\\quad p \\cdot q = c"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>שלבי הפירוק</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>הוציאו גורם משותף (אם יש).</li>
                  <li>מצאו שני מספרים: מכפלתם c, סכומם b.</li>
                  <li>כתבו (x+p)(x+q) ובדקו חזרה.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: x²+7x+12 → (x+3)(x+4) כי 3+4=7, 3·4=12
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Algebraic Fractions */}
      {activeTab === "fractions" && (
        <motion.div key="fractions" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\frac{P(x)}{Q(x)} \\;\\;\\text{defined when } Q(x) \\neq 0"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>עבודה עם שברים אלגבריים</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><strong>צמצום:</strong> פרקו מונה ומכנה → בטלו גורמים משותפים.</li>
                  <li><strong>חיבור/חיסור:</strong> מצאו מכנה משותף → הרחיבו → חברו מונים.</li>
                  <li><strong>תחום:</strong> כל ערך שמאפס מכנה — לא בתחום.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: (x²−4)/(x+2) = (x−2)(x+2)/(x+2) = x−2, תחום: x≠−2
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExpressionsPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>ביטויים אלגבריים עם AI — כיתה יא׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>כפל מקוצר, פירוק לגורמים, שברים אלגבריים — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/3u/topic/grade11/linear-algebra"
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

        <SubtopicProgress subtopicId="3u/grade11/linear-algebra/expressions" />

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
        {selectedLevel === "basic" && <ExpandLab />}
        {selectedLevel === "medium" && <FactorLab />}
        {selectedLevel === "advanced" && <FractionLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade11/linear-algebra/expressions" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
