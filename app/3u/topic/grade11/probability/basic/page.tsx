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
    <svg viewBox="0 0 240 120" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Die 1 */}
      <rect x={40} y={20} width={70} height={70} rx={10} fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.6} />
      <text x={75} y={62} fontSize={28} fill="#16A34A" textAnchor="middle" fontFamily="sans-serif" opacity={0.7}>?</text>
      {/* Die 2 */}
      <rect x={130} y={20} width={70} height={70} rx={10} fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.6} />
      <text x={165} y={62} fontSize={28} fill="#16A34A" textAnchor="middle" fontFamily="sans-serif" opacity={0.7}>?</text>
      {/* Plus sign */}
      <text x={120} y={62} fontSize={20} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">+</text>
      {/* Arrow to sum */}
      <line x1={120} y1={92} x2={120} y2={105} stroke="#94a3b8" strokeWidth={1.5} />
      <text x={120} y={117} fontSize={14} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">= ?</text>
    </svg>
  );
}

function MediumSVG() {
  const cx1 = 90, cx2 = 160, cy = 70, r = 50;
  return (
    <svg viewBox="0 0 260 150" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Circle A */}
      <circle cx={cx1} cy={cy} r={r} fill="none" stroke="#EA580C" strokeWidth={2} opacity={0.5} />
      <text x={60} y={50} fontSize={14} fill="#EA580C" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">A</text>
      {/* Circle B */}
      <circle cx={cx2} cy={cy} r={r} fill="none" stroke="#EA580C" strokeWidth={2} opacity={0.5} />
      <text x={190} y={50} fontSize={14} fill="#EA580C" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">B</text>
      {/* Question marks in regions */}
      <text x={70} y={78} fontSize={16} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>
      <text x={125} y={78} fontSize={16} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">?</text>
      <text x={180} y={78} fontSize={16} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>
      {/* Outside label */}
      <text x={125} y={140} fontSize={11} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">U</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 220 140" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Bag outline */}
      <path d="M70 30 Q60 30 55 45 L50 110 Q50 125 70 125 L150 125 Q170 125 170 110 L165 45 Q160 30 150 30 Z" fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.5} />
      {/* String at top */}
      <path d="M85 30 Q110 15 135 30" fill="none" stroke="#DC2626" strokeWidth={1.5} opacity={0.4} />
      {/* Colored dots inside */}
      <circle cx={85} cy={60} r={10} fill="#DC2626" opacity={0.4} />
      <circle cx={115} cy={55} r={10} fill="#3b82f6" opacity={0.4} />
      <circle cx={140} cy={65} r={10} fill="#16A34A" opacity={0.4} />
      <circle cx={95} cy={85} r={10} fill="#DC2626" opacity={0.4} />
      <circle cx={125} cy={80} r={10} fill="#3b82f6" opacity={0.4} />
      <circle cx={105} cy={105} r={10} fill="#16A34A" opacity={0.4} />
      <circle cx={135} cy={100} r={10} fill="#DC2626" opacity={0.4} />
      {/* Question marks */}
      <text x={110} y={140} fontSize={12} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">P(?) = ?</text>
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
        subjectWords={["הסתברות", "מרחב מדגם", "אירוע", "חיתוך", "איחוד", "משלים"]}
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
    title: "מרחב מדגם והסתברות",
    problem: "מטילים שתי קוביות הוגנות.\n\nא. רשמו את מרחב המדגם — כמה תוצאות אפשריות יש?\nב. מהי ההסתברות שסכום שתי הקוביות שווה ל-7?\nג. מהי ההסתברות שסכום שתי הקוביות גדול מ-9?",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ שוכחים שסדר הקוביות חשוב", text: "הזוג (2,5) שונה מהזוג (5,2) — אלו שתי תוצאות שונות. אם לא מבחינים ביניהן, מרחב המדגם קטן ממה שהוא באמת וההסתברות שגויה." },
      { title: "⚠️ ספירת חלקית של תוצאות נוחות", text: "בסכום 7 יש יותר זוגות ממה שחושבים. ודאו שרשמתם את כל הזוגות באופן שיטתי ולא דילגתם על אף אחד." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יא', 3 יחידות, ומצרף/ת שאלה בהסתברות בסיסית על מרחב מדגם והטלת שתי קוביות. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "מרחב מדגם", coaching: "", prompt: "מטילים שתי קוביות הוגנות. תנחה אותי כיצד לבנות את מרחב המדגם — כמה תוצאות אפשריות יש כשמטילים שתי קוביות, ולמה הסדר חשוב.", keywords: [], keywordHint: "", contextWords: ["מרחב מדגם", "תוצאות", "קוביות", "סדר", "זוגות", "אפשרויות"] },
      { phase: "סעיף ב׳", label: "הסתברות סכום 7", coaching: "", prompt: "מטילים שתי קוביות הוגנות. תכווין אותי למצוא את כל הזוגות שסכומם 7, ואיך לחשב הסתברות של אירוע.", keywords: [], keywordHint: "", contextWords: ["הסתברות", "סכום", "זוגות", "אירוע", "נוחות", "חלקי"] },
      { phase: "סעיף ג׳", label: "הסתברות סכום מעל 9", coaching: "", prompt: "מטילים שתי קוביות הוגנות. תדריך אותי לרשום את כל הזוגות שסכומם גדול מ-9 ולחשב הסתברות.", keywords: [], keywordHint: "", contextWords: ["הסתברות", "סכום", "גדול", "תוצאות", "ספירה", "מרחב"] },
    ],
  },
  {
    id: "medium",
    title: "חיתוך ואיחוד",
    problem: "בכיתה של 30 תלמידים, 18 לומדים אנגלית, 12 לומדים צרפתית ו-6 לומדים את שתי השפות.\n\nא. ציירו דיאגרמת ון ומלאו את כל האזורים.\nב. חשבו את ההסתברות שתלמיד שנבחר לומד אנגלית או צרפתית.\nג. חשבו את ההסתברות שתלמיד שנבחר לא לומד אף שפה מהשתיים.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ שוכחים לחסר את החיתוך בנוסחת האיחוד", text: "כשמחשבים P(A או B), חייבים לחסר את P(A וגם B) כדי לא לספור תלמידים פעמיים. בלי זה, התוצאה גדולה מדי." },
      { title: "⚠️ בלבול בין 'או' לבין 'וגם'", text: "'או' בהסתברות (איחוד) כולל את כל מי שלומד לפחות שפה אחת. 'וגם' (חיתוך) כולל רק את מי שלומד את שתיהן. ודאו שאתם עונים על השאלה הנכונה." },
    ],
    goldenPrompt: `אני בכיתה יא', 3 יחידות, מצרף/ת תרגיל בהסתברות בנושא חיתוך ואיחוד של אירועים עם דיאגרמת ון.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על מילוי דיאגרמת ון ונוסחת האיחוד.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "דיאגרמת ון", coaching: "", prompt: "בכיתה של 30 תלמידים, 18 לומדים אנגלית, 12 צרפתית ו-6 את שתיהן. תנחה אותי כיצד למלא דיאגרמת ון — איך מחשבים כל אזור.", keywords: [], keywordHint: "", contextWords: ["דיאגרמת ון", "חיתוך", "אזור", "תלמידים", "שפה", "מילוי"] },
      { phase: "סעיף ב׳", label: "הסתברות איחוד", coaching: "", prompt: "בכיתה של 30 תלמידים, 18 אנגלית, 12 צרפתית, 6 שתיהן. תכווין אותי לחשב את ההסתברות שתלמיד לומד אנגלית או צרפתית, בעזרת נוסחת איחוד.", keywords: [], keywordHint: "", contextWords: ["הסתברות", "איחוד", "חיתוך", "נוסחה", "או", "חיסור"] },
      { phase: "סעיף ג׳", label: "הסתברות משלים", coaching: "", prompt: "בכיתה של 30 תלמידים יודעים שחלק לומדים אנגלית או צרפתית. תדריך אותי למצוא את ההסתברות שתלמיד לא לומד אף אחת מהשפות — איך משתמשים במשלים.", keywords: [], keywordHint: "", contextWords: ["משלים", "הסתברות", "לא", "אף", "שפה", "חיסור"] },
    ],
  },
  {
    id: "advanced",
    title: "אירועים זרים ומשלימים",
    problem: "בשקית יש כדורים אדומים, כחולים וירוקים.\nידוע: P(אדום) = 0.4, P(כחול) = 0.35.\n\nא. האם האירועים \"אדום\" ו\"כחול\" זרים זה לזה? הסבירו.\nב. חשבו את P(אדום או כחול).\nג. חשבו את P(לא אדום).\nד. אם הוצא כדור ונמצא שהוא אינו כחול, מהי ההסתברות שהוא אדום?",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בין זרים למשלימים", text: "אירועים זרים לא יכולים לקרות בו-זמנית (חיתוך ריק). אירועים משלימים ביחד מכסים את כל מרחב המדגם. אלו מושגים שונים — אל תבלבלו ביניהם." },
      { title: "⚠️ חילוק שגוי בהסתברות מותנית", text: "כשמצמצמים את מרחב המדגם (נתון ש... לא כחול), חייבים לחלק בהסתברות של התנאי, לא בהסתברות המקורית. שכחת החילוק היא שגיאה נפוצה." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: מה ההבדל בין אירועים זרים לאירועים משלימים, ואיך מחשבים הסתברות מותנית כשמצמצמים מרחב מדגם? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "אירועים זרים", coaching: "", prompt: "בשקית כדורים אדומים, כחולים וירוקים. P(אדום)=0.4, P(כחול)=0.35. תנחה אותי להסביר האם אדום וכחול זרים זה לזה — מה המשמעות של אירועים זרים.", keywords: [], keywordHint: "", contextWords: ["זרים", "אירוע", "חיתוך", "ריק", "בו-זמנית", "הגדרה"] },
      { phase: "סעיף ב׳", label: "P(אדום או כחול)", coaching: "", prompt: "P(אדום)=0.4, P(כחול)=0.35 והם זרים. תכווין אותי לחשב P(אדום או כחול) — מה הנוסחה כשהאירועים זרים.", keywords: [], keywordHint: "", contextWords: ["הסתברות", "איחוד", "זרים", "חיבור", "נוסחה", "או"] },
      { phase: "סעיף ג׳", label: "P(לא אדום)", coaching: "", prompt: "P(אדום)=0.4. תדריך אותי לחשב P(לא אדום) — מה הקשר בין אירוע לאירוע המשלים שלו.", keywords: [], keywordHint: "", contextWords: ["משלים", "הסתברות", "אחד", "מינוס", "לא", "סכום"] },
      { phase: "סעיף ד׳", label: "הסתברות מותנית", coaching: "", prompt: "P(אדום)=0.4, P(כחול)=0.35. הוצא כדור שאינו כחול. תנחה אותי — כשיודעים שהכדור לא כחול, מה מרחב המדגם החדש ואיך מחשבים הסתברות מותנית.", keywords: [], keywordHint: "", contextWords: ["מותנית", "מרחב", "צמצום", "תנאי", "חילוק", "הסתברות"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>🎲 הסתברות בסיסית (Basic Probability)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "מרחב מדגם, תוצאות נוחות וחישוב הסתברות פשוטה בהטלת קוביות."}
            {ex.id === "medium" && "חיתוך ואיחוד של אירועים — דיאגרמת ון ונוסחת האיחוד."}
            {ex.id === "advanced" && "אירועים זרים, משלימים ומבוא לחשיבה מותנית."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: מושגי יסוד */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🎯 מושגי יסוד</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>מרחב מדגם</span>
              <span>כל התוצאות האפשריות של הניסוי.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>אירוע</span>
              <span>תת-קבוצה של מרחב המדגם.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>הסתברות</span>
              <span>מספר התוצאות הנוחות חלקי מספר התוצאות הכולל.</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>✨ חיתוך ואיחוד</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>איחוד</span>
                  <span>A או B — לפחות אחד מהם מתקיים.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>חיתוך</span>
                  <span>A וגם B — שניהם מתקיימים בו-זמנית.</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>🔬 אירועים זרים ומשלימים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>זרים</span>
                  <span>לא יכולים לקרות בו-זמנית — חיתוך ריק.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>משלים</span>
                  <span>P(A) + P(לא A) = 1.</span>
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

// ─── DiceLab (basic) ─────────────────────────────────────────────────────────

function DiceLab() {
  const [targetSum, setTargetSum] = useState(7);
  const st = STATION.basic;

  // Build all 36 outcomes
  const outcomes: { d1: number; d2: number; sum: number }[] = [];
  for (let d1 = 1; d1 <= 6; d1++) {
    for (let d2 = 1; d2 <= 6; d2++) {
      outcomes.push({ d1, d2, sum: d1 + d2 });
    }
  }

  const favorable = outcomes.filter(o => o.sum === targetSum);
  const prob = favorable.length / 36;

  const cellSize = 34;
  const pad = 30;
  const svgW = pad + 6 * cellSize + 10;
  const svgH = pad + 6 * cellSize + 10;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת הטלת קוביות</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>בחרו סכום מטרה וצפו אילו זוגות מתאימים ומהי ההסתברות.</p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>סכום מטרה</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{targetSum}</span>
          </div>
          <input type="range" min={2} max={12} step={1} value={targetSum} onChange={(e) => setTargetSum(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* Grid SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Column headers (die 2) */}
          {[1,2,3,4,5,6].map(d2 => (
            <text key={`ch${d2}`} x={pad + (d2 - 1) * cellSize + cellSize / 2} y={16} fontSize={11} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">{d2}</text>
          ))}
          {/* Row headers (die 1) */}
          {[1,2,3,4,5,6].map(d1 => (
            <text key={`rh${d1}`} x={16} y={pad + (d1 - 1) * cellSize + cellSize / 2 + 4} fontSize={11} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">{d1}</text>
          ))}
          {/* Cells */}
          {outcomes.map((o, idx) => {
            const col = o.d2 - 1;
            const row = o.d1 - 1;
            const x = pad + col * cellSize;
            const y = pad + row * cellSize;
            const match = o.sum === targetSum;
            return (
              <g key={idx}>
                <rect x={x} y={y} width={cellSize - 2} height={cellSize - 2} rx={4} fill={match ? st.accentColor : "#f1f5f9"} opacity={match ? 0.6 : 0.5} stroke={match ? st.accentColor : "#cbd5e1"} strokeWidth={match ? 1.5 : 0.5} />
                <text x={x + (cellSize - 2) / 2} y={y + (cellSize - 2) / 2 + 4} fontSize={10} fill={match ? "#fff" : "#64748b"} textAnchor="middle" fontFamily="sans-serif" fontWeight={match ? 700 : 400}>{o.sum}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "תוצאות כוללות", val: "36" },
          { label: "תוצאות נוחות", val: String(favorable.length) },
          { label: "הסתברות", val: prob > 0 ? (prob * 100).toFixed(1) + "%" : "0%" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>התאים הירוקים = זוגות שסכומם {targetSum}. לאיזה סכום יש הכי הרבה תוצאות?</p>
    </section>
  );
}

// ─── VennLab (medium) ────────────────────────────────────────────────────────

function VennLab() {
  const [sizeA, setSizeA] = useState(18);
  const [sizeB, setSizeB] = useState(12);
  const [inter, setInter] = useState(6);
  const st = STATION.medium;

  const total = 30;
  const onlyA = sizeA - inter;
  const onlyB = sizeB - inter;
  const union = onlyA + onlyB + inter;
  const neither = total - union;
  const pUnion = union / total;
  const pNeither = neither / total;

  // Clamp intersection
  const maxInter = Math.min(sizeA, sizeB);
  const clampedInter = Math.min(inter, maxInter);

  const cx1 = 100, cx2 = 170, cy = 80, r = 55;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת דיאגרמת ון</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את הגדלים של A, B ואת החיתוך — וצפו כיצד משתנים האיחוד וה-P.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "|A| (אנגלית)", val: sizeA, set: setSizeA, max: 30 },
          { label: "|B| (צרפתית)", val: sizeB, set: setSizeB, max: 30 },
          { label: "|A∩B| (חיתוך)", val: clampedInter, set: setInter, max: maxInter },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={0} max={s.max} step={1} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* Venn SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 280 170" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Circle A */}
          <circle cx={cx1} cy={cy} r={r} fill="rgba(234,88,12,0.1)" stroke="#EA580C" strokeWidth={2} />
          <text x={60} y={48} fontSize={13} fill="#EA580C" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">A</text>
          {/* Circle B */}
          <circle cx={cx2} cy={cy} r={r} fill="rgba(59,130,246,0.1)" stroke="#3b82f6" strokeWidth={2} />
          <text x={210} y={48} fontSize={13} fill="#3b82f6" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">B</text>
          {/* Region values */}
          <text x={75} y={85} fontSize={18} fill="#EA580C" textAnchor="middle" fontFamily="monospace" fontWeight={700}>{Math.max(0, sizeA - clampedInter)}</text>
          <text x={135} y={85} fontSize={18} fill="#f59e0b" textAnchor="middle" fontFamily="monospace" fontWeight={700}>{clampedInter}</text>
          <text x={195} y={85} fontSize={18} fill="#3b82f6" textAnchor="middle" fontFamily="monospace" fontWeight={700}>{Math.max(0, sizeB - clampedInter)}</text>
          {/* Outside */}
          <text x={135} y={160} fontSize={12} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">מחוץ: {Math.max(0, neither)}</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "|A∪B|", val: String(Math.max(0, union)) },
          { label: "P(A∪B)", val: (pUnion * 100).toFixed(1) + "%" },
          { label: "P(לא A ולא B)", val: (Math.max(0, pNeither) * 100).toFixed(1) + "%" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>הגדילו את החיתוך — מה קורה לאיחוד? (P(A∪B) = P(A) + P(B) - P(A∩B))</p>
    </section>
  );
}

// ─── BagLab (advanced) ───────────────────────────────────────────────────────

function BagLab() {
  const [red, setRed] = useState(4);
  const [blue, setBlue] = useState(3);
  const [green, setGreen] = useState(3);
  const st = STATION.advanced;

  const total = red + blue + green;
  const pRed = total > 0 ? red / total : 0;
  const pBlue = total > 0 ? blue / total : 0;
  const pNotRed = total > 0 ? (total - red) / total : 0;

  // Generate ball positions for SVG
  const balls: { cx: number; cy: number; color: string }[] = [];
  let idx = 0;
  const cols = 4;
  const all = [
    ...Array(red).fill("#DC2626"),
    ...Array(blue).fill("#3b82f6"),
    ...Array(green).fill("#16A34A"),
  ];
  all.forEach((color) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    balls.push({ cx: 70 + col * 30, cy: 50 + row * 25, color });
    idx++;
  });

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת שקית כדורים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את כמות הכדורים מכל צבע וצפו כיצד ההסתברויות משתנות.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "אדום", val: red, set: setRed, color: "#DC2626" },
          { label: "כחול", val: blue, set: setBlue, color: "#3b82f6" },
          { label: "ירוק", val: green, set: setGreen, color: "#16A34A" },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: s.color, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={0} max={10} step={1} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: s.color }} />
          </div>
        ))}
      </div>

      {/* Bag SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 220 160" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Bag outline */}
          <path d="M55 25 Q45 25 40 40 L35 130 Q35 145 55 145 L165 145 Q185 145 185 130 L180 40 Q175 25 165 25 Z" fill="rgba(255,255,255,0.5)" stroke="#94a3b8" strokeWidth={1.5} />
          <path d="M75 25 Q110 10 145 25" fill="none" stroke="#94a3b8" strokeWidth={1.2} />
          {/* Balls */}
          {balls.map((b, i) => (
            <circle key={i} cx={b.cx} cy={b.cy} r={9} fill={b.color} opacity={0.65} />
          ))}
          {total === 0 && (
            <text x={110} y={90} fontSize={13} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">שקית ריקה</text>
          )}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "סה״כ", val: String(total) },
          { label: "P(אדום)", val: total > 0 ? (pRed * 100).toFixed(1) + "%" : "—" },
          { label: "P(כחול)", val: total > 0 ? (pBlue * 100).toFixed(1) + "%" : "—" },
          { label: "P(לא אדום)", val: total > 0 ? (pNotRed * 100).toFixed(1) + "%" : "—" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>שימו לב: P(לא אדום) = 1 - P(אדום). מה קורה כשמוסיפים כדורים ירוקים?</p>
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
  const [activeTab, setActiveTab] = useState<"basic-prob" | "union" | "complement" | null>(null);

  const tabs = [
    { id: "basic-prob" as const, label: "🎲 הסתברות בסיסית", tex: "P(A)", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "union" as const, label: "🔗 חיתוך ואיחוד", tex: "P(A \\cup B)", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "complement" as const, label: "🔄 משלים", tex: "P(\\bar{A})", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: Basic Probability */}
      {activeTab === "basic-prob" && (
        <motion.div key="basic-prob" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(A) = \\frac{|A|}{|\\Omega|}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מחשבים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מזהים את מרחב המדגם (<InlineMath>{"\\Omega"}</InlineMath>) — כל התוצאות האפשריות.</li>
                  <li>סופרים את התוצאות הנוחות — אלו שמקיימות את האירוע A.</li>
                  <li>מחלקים: תוצאות נוחות / סך תוצאות.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: בהטלת קובייה, P(זוגי) = 3/6 = 1/2
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Union */}
      {activeTab === "union" && (
        <motion.div key="union" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(A \\cup B) = P(A) + P(B) - P(A \\cap B)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>למה מחסרים את החיתוך?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>כשמחברים P(A) + P(B), התוצאות בחיתוך נספרות פעמיים.</li>
                  <li>לכן מחסרים P(A∩B) פעם אחת כדי לתקן.</li>
                  <li>אם A ו-B זרים: P(A∩B) = 0, ואז P(A∪B) = P(A) + P(B).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: P(A)=0.6, P(B)=0.4, P(A∩B)=0.2 → P(A∪B) = 0.6+0.4-0.2 = 0.8
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Complement */}
      {activeTab === "complement" && (
        <motion.div key="complement" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(\\bar{A}) = 1 - P(A)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מה זה אירוע משלים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>האירוע המשלים של A כולל את כל התוצאות שבהן A לא מתקיים.</li>
                  <li>סכום ההסתברויות של אירוע ומשלימו תמיד שווה ל-1.</li>
                  <li>שימושי כשקל יותר לחשב את ה״לא״ מאשר את ה״כן״.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: P(אדום) = 0.4 → P(לא אדום) = 1 - 0.4 = 0.6
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BasicProbabilityPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>הסתברות בסיסית עם AI — כיתה יא׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>מרחב מדגם, חיתוך ואיחוד, אירועים זרים ומשלימים — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/3u/topic/grade11/probability"
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

        <SubtopicProgress subtopicId="3u/grade11/probability/basic" />

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
        {selectedLevel === "basic" && <DiceLab />}
        {selectedLevel === "medium" && <VennLab />}
        {selectedLevel === "advanced" && <BagLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade11/probability/basic" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
