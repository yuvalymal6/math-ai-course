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
  const barHeights = [0.6, 0.85, 0.5, 0.95, 0.7, 0.4, 0.85, 0.75];
  const barW = 22, gap = 6, pad = 30;
  const totalW = pad * 2 + barHeights.length * (barW + gap);
  const maxH = 100;
  return (
    <svg viewBox={`0 0 ${totalW} 140`} className="w-full max-w-sm mx-auto" aria-hidden>
      {/* X axis */}
      <line x1={pad} y1={120} x2={totalW - pad} y2={120} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Y axis */}
      <line x1={pad} y1={20} x2={pad} y2={120} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Bars */}
      {barHeights.map((h, i) => {
        const x = pad + i * (barW + gap) + gap / 2;
        const barH = h * maxH;
        return (
          <rect key={i} x={x} y={120 - barH} width={barW} height={barH} rx={3} fill="#16A34A" opacity={0.55} />
        );
      })}
      {/* Labels */}
      {barHeights.map((_, i) => {
        const x = pad + i * (barW + gap) + gap / 2 + barW / 2;
        return <text key={`l${i}`} x={x} y={133} fontSize={9} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>;
      })}
    </svg>
  );
}

function MediumSVG() {
  const groupWidths = [0.3, 0.7, 1.0, 0.6, 0.2];
  const barW = 40, gap = 4, pad = 30;
  const totalW = pad * 2 + groupWidths.length * (barW + gap);
  const maxH = 90;
  return (
    <svg viewBox={`0 0 ${totalW} 140`} className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={pad} y1={115} x2={totalW - pad} y2={115} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={pad} y1={15} x2={pad} y2={115} stroke="#94a3b8" strokeWidth={1.5} />
      {groupWidths.map((h, i) => {
        const x = pad + i * (barW + gap);
        const barH = h * maxH;
        return (
          <rect key={i} x={x} y={115 - barH} width={barW} height={barH} rx={2} fill="#EA580C" opacity={0.5} />
        );
      })}
      {groupWidths.map((_, i) => {
        const x = pad + i * (barW + gap) + barW / 2;
        return <text key={`l${i}`} x={x} y={130} fontSize={9} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>;
      })}
    </svg>
  );
}

function AdvancedSVG() {
  const dotsA = [0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65];
  const dotsB = [0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.9];
  const lineX = 30, lineW = 200, y1 = 45, y2 = 105;
  return (
    <svg viewBox="0 0 280 150" className="w-full max-w-sm mx-auto" aria-hidden>
      <text x={250} y={y1 + 4} fontSize={10} fill="#16A34A" fontWeight={700} textAnchor="start" fontFamily="sans-serif">{`כיתה א'`}</text>
      <text x={250} y={y2 + 4} fontSize={10} fill="#DC2626" fontWeight={700} textAnchor="start" fontFamily="sans-serif">{`כיתה ב'`}</text>
      <line x1={lineX} y1={y1} x2={lineX + lineW} y2={y1} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={lineX} y1={y2} x2={lineX + lineW} y2={y2} stroke="#94a3b8" strokeWidth={1.5} />
      {dotsA.map((t, i) => (
        <circle key={`a${i}`} cx={lineX + t * lineW} cy={y1} r={5} fill="#16A34A" opacity={0.7} />
      ))}
      {dotsB.map((t, i) => (
        <circle key={`b${i}`} cx={lineX + t * lineW} cy={y2} r={5} fill="#DC2626" opacity={0.7} />
      ))}
      {/* Mean lines */}
      <line x1={lineX + 0.5 * lineW} y1={y1 - 16} x2={lineX + 0.5 * lineW} y2={y1 + 16} stroke="#f59e0b" strokeWidth={1.8} strokeDasharray="4,3" />
      <line x1={lineX + 0.5 * lineW} y1={y2 - 16} x2={lineX + 0.5 * lineW} y2={y2 + 16} stroke="#f59e0b" strokeWidth={1.8} strokeDasharray="4,3" />
      <text x={lineX + 0.5 * lineW} y={15} fontSize={10} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">?</text>
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
        subjectWords={["ממוצע", "חציון", "שכיח", "טווח", "פיזור", "שכיחות"]}
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
    title: "ממוצע, חציון ושכיח",
    problem: "נתונים ציוני 8 תלמידים במבחן:\n85, 92, 78, 92, 65, 88, 92, 76\n\nא. חשבו את הממוצע של הציונים.\nב. מצאו את החציון (שימו לב — מספר זוגי של ערכים).\nג. מצאו את השכיח.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ שוכחים למיין לפני חציון", text: "כדי למצוא חציון יש למיין את הנתונים מהקטן לגדול. תלמידים רבים לוקחים את הערך האמצעי ברשימה המקורית — וזו טעות! רק אחרי מיון ניתן למצוא את האמצע." },
      { title: "⚠️ בלבול בין שכיח לממוצע", text: "השכיח הוא הערך שמופיע הכי הרבה פעמים — לא הממוצע ולא החציון. ייתכנו מצבים שבהם השכיח שונה לגמרי מהממוצע." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יא', 3 יחידות, ומצרף/ת שאלה בסטטיסטיקה תיאורית על ממוצע, חציון ושכיח. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "חישוב ממוצע", coaching: "", prompt: "נתונים 8 ציונים: 85, 92, 78, 92, 65, 88, 92, 76. תנחה אותי כיצד לחשב את הממוצע — סכום חלקי מספר הנתונים.", keywords: [], keywordHint: "", contextWords: ["ממוצע", "סכום", "חלקי", "n", "ציונים", "חיבור"] },
      { phase: "סעיף ב׳", label: "מציאת חציון", coaching: "", prompt: "נתונים 8 ציונים: 85, 92, 78, 92, 65, 88, 92, 76. תסביר לי כיצד מוצאים חציון כשיש מספר זוגי של ערכים.", keywords: [], keywordHint: "", contextWords: ["חציון", "מיון", "אמצע", "זוגי", "ממוצע", "סדר"] },
      { phase: "סעיף ג׳", label: "מציאת שכיח", coaching: "", prompt: "נתונים 8 ציונים: 85, 92, 78, 92, 65, 88, 92, 76. תכווין אותי למצוא את השכיח — הערך שמופיע הכי הרבה פעמים.", keywords: [], keywordHint: "", contextWords: ["שכיח", "שכיחות", "מופיע", "פעמים", "ספירה", "ערך"] },
    ],
  },
  {
    id: "medium",
    title: "ממוצע משוקלל וטבלת שכיחויות",
    problem: "נתונה טבלת שכיחויות של ציוני תלמידים:\n\nקבוצה | נציג | שכיחות\n50-60 | 55 | 3\n60-70 | 65 | 7\n70-80 | 75 | 12\n80-90 | 85 | 8\n90-100 | 95 | 5\n\nא. חשבו את הממוצע המשוקלל.\nב. מצאו את קבוצת החציון בעזרת שכיחות מצטברת.\nג. זהו את קבוצת השכיח והשוו אותה עם הממוצע.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ שוכחים לשקלל לפי שכיחות", text: "ממוצע משוקלל אינו ממוצע של הנציגים! יש להכפיל כל נציג בשכיחות שלו, לסכום, ולחלק ב-N הכולל. בלי שקלול — התוצאה שגויה." },
      { title: "⚠️ טעות בזיהוי קבוצת החציון", text: "כדי למצוא את קבוצת החציון יש לבנות עמודת שכיחות מצטברת ולמצוא היכן עוברים את N/2. תלמידים רבים פשוט בוחרים את הקבוצה האמצעית — וזו טעות." },
    ],
    goldenPrompt: `אני בכיתה יא', 3 יחידות, מצרף/ת תרגיל בסטטיסטיקה תיאורית בנושא ממוצע משוקלל וטבלת שכיחויות.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על שקלול, שכיחות מצטברת, וזיהוי קבוצות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "ממוצע משוקלל", coaching: "", prompt: "נתונה טבלת שכיחויות עם 5 קבוצות (נציגים: 55,65,75,85,95 ושכיחויות: 3,7,12,8,5). תנחה אותי לחשב ממוצע משוקלל — הכפלה של כל נציג בשכיחות וחילוק ב-N.", keywords: [], keywordHint: "", contextWords: ["ממוצע", "משוקלל", "שכיחות", "נציג", "הכפלה", "סכום"] },
      { phase: "סעיף ב׳", label: "קבוצת חציון", coaching: "", prompt: "נתונה טבלת שכיחויות (שכיחויות: 3,7,12,8,5). תדריך אותי לבנות שכיחות מצטברת ולמצוא את קבוצת החציון.", keywords: [], keywordHint: "", contextWords: ["חציון", "מצטברת", "קבוצה", "N/2", "שכיחות", "סדר"] },
      { phase: "סעיף ג׳", label: "קבוצת שכיח והשוואה", coaching: "", prompt: "נתונה טבלת שכיחויות (שכיחויות: 3,7,12,8,5). תכווין אותי לזהות את קבוצת השכיח ולהשוות עם הממוצע המשוקלל.", keywords: [], keywordHint: "", contextWords: ["שכיח", "קבוצה", "שכיחות", "גבוהה", "השוואה", "ממוצע"] },
    ],
  },
  {
    id: "advanced",
    title: "השוואת התפלגויות",
    problem: "נתונות שתי כיתות עם אותו ממוצע:\nכיתה א׳: 74, 76, 78, 80, 82, 84, 86\nכיתה ב׳: 60, 65, 75, 80, 85, 95, 100\n\nא. ודאו ששני הממוצעים שווים.\nב. חשבו את הטווח של כל כיתה.\nג. הסבירו: איזה מדד — ממוצע או טווח — מתאר טוב יותר את הנתונים ומדוע.\nד. אם מוסיפים 5 נקודות בונוס לכל תלמיד בשתי הכיתות — מה משתנה ומה נשאר?",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ ממוצע שווה לא אומר התפלגות דומה", text: "שתי קבוצות עם ממוצע זהה יכולות להיות שונות לחלוטין. הממוצע אינו מספר על הפיזור — תמיד יש לבדוק גם את הטווח או מדד פיזור אחר." },
      { title: "⚠️ הוספת קבוע לא משנה את הטווח", text: "כשמוסיפים מספר קבוע לכל הנתונים, המקסימום והמינימום עולים באותו סכום — הטווח נשאר זהה. הממוצע כן עולה, אבל הפיזור לא." },
    ],
    goldenPrompt: "\n\n",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד משווים בין שתי התפלגויות כשהממוצע זהה? מתי הטווח עדיף ומתי לא מספיק? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "אימות ממוצעים", coaching: "", prompt: "נתונות שתי כיתות (א׳: 74,76,78,80,82,84,86 ב׳: 60,65,75,80,85,95,100). תנחה אותי לוודא שהממוצעים שווים.", keywords: [], keywordHint: "", contextWords: ["ממוצע", "סכום", "חלקי", "שווה", "כיתה", "אימות"] },
      { phase: "סעיף ב׳", label: "חישוב טווח", coaching: "", prompt: "נתונות שתי כיתות (א׳: 74,76,78,80,82,84,86 ב׳: 60,65,75,80,85,95,100). תדריך אותי לחשב את הטווח של כל כיתה.", keywords: [], keywordHint: "", contextWords: ["טווח", "מקסימום", "מינימום", "הפרש", "כיתה", "חישוב"] },
      { phase: "סעיף ג׳", label: "ממוצע מול טווח", coaching: "", prompt: "ממוצע שווה אבל טווח שונה — תסביר לי למה ממוצע לבדו לא מספיק כדי לתאר נתונים ואיזה מדד טוב יותר.", keywords: [], keywordHint: "", contextWords: ["מדד", "פיזור", "ממוצע", "טווח", "תיאור", "התפלגות"] },
      { phase: "סעיף ד׳", label: "הוספת בונוס", coaching: "", prompt: "אם מוסיפים 5 נקודות לכל תלמיד — תנחה אותי להבין מה משתנה (ממוצע) ומה נשאר (טווח).", keywords: [], keywordHint: "", contextWords: ["בונוס", "קבוע", "ממוצע", "טווח", "משתנה", "נשאר"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📊 סטטיסטיקה תיאורית (Descriptive Statistics)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "ממוצע, חציון ושכיח — שלושת מדדי המרכז הבסיסיים לתיאור נתונים."}
            {ex.id === "medium" && "ממוצע משוקלל מטבלת שכיחויות — כלי מרכזי לניתוח נתונים מקובצים."}
            {ex.id === "advanced" && "השוואת התפלגויות — מדוע ממוצע שווה לא אומר נתונים דומים."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: מדדי מרכז */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📏 מדדי מרכז</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>ממוצע</span>
              <span>סכום כל הערכים חלקי מספר הנתונים.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>חציון</span>
              <span>הערך האמצעי אחרי מיון (זוגי = ממוצע שני אמצעיים).</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>שכיח</span>
              <span>הערך שמופיע הכי הרבה פעמים.</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>✨ ממוצע משוקלל ושכיחות מצטברת</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>משוקלל</span>
                  <span>נציג × שכיחות, סכום, חלקי N הכולל.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>מצטברת</span>
                  <span>סכימת השכיחויות מהקבוצה הראשונה — למציאת חציון.</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>🔬 השוואת התפלגויות</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>טווח</span>
                  <span>ההפרש בין הערך הגבוה לנמוך ביותר.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>X + b</span>
                  <span>הוספת קבוע: ממוצע עולה, טווח לא משתנה.</span>
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

// ─── MeanMedianLab (basic) ───────────────────────────────────────────────────

function MeanMedianLab() {
  const [scores, setScores] = useState([85, 92, 78, 92, 65, 88, 92, 76]);
  const st = STATION.basic;

  const n = scores.length;
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const sorted = [...scores].sort((a, b) => a - b);
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

  // Mode calculation
  const freq: Record<number, number> = {};
  scores.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  const maxFreq = Math.max(...Object.values(freq));
  const modes = Object.entries(freq).filter(([, f]) => f === maxFreq).map(([v]) => +v);
  const modeStr = modes.join(", ");

  const updateScore = (i: number, v: number) => {
    setScores(prev => { const next = [...prev]; next[i] = v; return next; });
  };

  // SVG bar chart
  const pad = 30, barW = 24, gap = 6;
  const svgW = pad * 2 + n * (barW + gap);
  const maxH = 100;
  const maxVal = Math.max(...scores, 1);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת ממוצע, חציון ושכיח</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את הציונים בעזרת הסליידרים וצפו כיצד מדדי המרכז משתנים בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {scores.map((v, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>ציון {i + 1}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{v}</span>
            </div>
            <input type="range" min={0} max={100} step={1} value={v} onChange={(e) => updateScore(i, +e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} 140`} className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={pad} y1={120} x2={svgW - pad} y2={120} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={pad} y1={20} x2={pad} y2={120} stroke="#94a3b8" strokeWidth={1.5} />
          {scores.map((v, i) => {
            const x = pad + i * (barW + gap) + gap / 2;
            const barH = (v / maxVal) * maxH;
            return <rect key={i} x={x} y={120 - barH} width={barW} height={barH} rx={3} fill={st.accentColor} opacity={0.55} />;
          })}
          {/* Mean line */}
          {(() => {
            const meanBarH = (mean / maxVal) * maxH;
            const y = 120 - meanBarH;
            return <line x1={pad} y1={y} x2={svgW - pad} y2={y} stroke="#f59e0b" strokeWidth={1.8} strokeDasharray="4,3" />;
          })()}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "ממוצע", val: mean.toFixed(1) },
          { label: "חציון", val: median.toFixed(1) },
          { label: "שכיח", val: modeStr },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>שנו ציון בודד וצפו — איזה מדד מגיב יותר לשינויים קיצוניים?</p>
    </section>
  );
}

// ─── FrequencyLab (medium) ───────────────────────────────────────────────────

function FrequencyLab() {
  const [freqs, setFreqs] = useState([3, 7, 12, 8, 5]);
  const st = STATION.medium;

  const reps = [55, 65, 75, 85, 95];
  const labels = ["50-60", "60-70", "70-80", "80-90", "90-100"];
  const totalN = freqs.reduce((a, b) => a + b, 0);
  const weightedMean = totalN > 0 ? freqs.reduce((s, f, i) => s + f * reps[i], 0) / totalN : 0;

  // Cumulative frequency & median group
  const cumulative: number[] = [];
  freqs.forEach((f, i) => { cumulative.push((cumulative[i - 1] || 0) + f); });
  const half = totalN / 2;
  const medianGroupIdx = cumulative.findIndex(c => c >= half);
  const medianGroup = medianGroupIdx >= 0 ? labels[medianGroupIdx] : "—";

  // Mode group
  const maxFreq = Math.max(...freqs);
  const modeGroupIdx = freqs.indexOf(maxFreq);
  const modeGroup = labels[modeGroupIdx];

  const updateFreq = (i: number, v: number) => {
    setFreqs(prev => { const next = [...prev]; next[i] = v; return next; });
  };

  const pad = 30, barW = 40, gap = 4;
  const svgW = pad * 2 + freqs.length * (barW + gap);
  const maxH = 90;
  const maxF = Math.max(...freqs, 1);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת טבלת שכיחויות</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את השכיחות של כל קבוצה וצפו כיצד הממוצע המשוקלל וקבוצת החציון משתנים.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {freqs.map((f, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{labels[i]}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{f}</span>
            </div>
            <input type="range" min={0} max={25} step={1} value={f} onChange={(e) => updateFreq(i, +e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* Histogram SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} 140`} className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={pad} y1={115} x2={svgW - pad} y2={115} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={pad} y1={15} x2={pad} y2={115} stroke="#94a3b8" strokeWidth={1.5} />
          {freqs.map((f, i) => {
            const x = pad + i * (barW + gap);
            const barH = maxF > 0 ? (f / maxF) * maxH : 0;
            const isMedian = i === medianGroupIdx;
            return (
              <g key={i}>
                <rect x={x} y={115 - barH} width={barW} height={barH} rx={2} fill={isMedian ? "#f59e0b" : st.accentColor} opacity={isMedian ? 0.7 : 0.5} />
                <text x={x + barW / 2} y={128} fontSize={8} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">{labels[i]}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "ממוצע משוקלל", val: weightedMean.toFixed(1) },
          { label: "N כולל", val: String(totalN) },
          { label: "קבוצת חציון", val: medianGroup },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>העמודה הצהובה = קבוצת החציון. קבוצת השכיח: {modeGroup}</p>
    </section>
  );
}

// ─── ComparisonLab (advanced) ────────────────────────────────────────────────

function ComparisonLab() {
  const [spread, setSpread] = useState(50);
  const st = STATION.advanced;

  // Class A: clustered around 80
  const baseA = [74, 76, 78, 80, 82, 84, 86];
  // Class B: spread depends on slider
  const factor = spread / 50; // 0..2
  const baseB = [-20, -15, -5, 0, 5, 15, 20];
  const classB = baseB.map(d => 80 + d * factor);

  const meanA = baseA.reduce((a, b) => a + b, 0) / baseA.length;
  const meanB = classB.reduce((a, b) => a + b, 0) / classB.length;
  const rangeA = Math.max(...baseA) - Math.min(...baseA);
  const rangeB = Math.max(...classB) - Math.min(...classB);

  const lineX = 30, lineW = 200, y1 = 40, y2 = 90;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת השוואת התפלגויות</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את רמת הפיזור של כיתה ב׳ — הממוצע נשאר זהה, אך הטווח משתנה.</p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>רמת פיזור כיתה ב׳ <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 600 }}>(%)</span></span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{spread}%</span>
          </div>
          <input type="range" min={0} max={100} step={1} value={spread} onChange={(e) => setSpread(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG — two dot plots */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 280 130" className="w-full max-w-md mx-auto" aria-hidden>
          <text x={250} y={y1 + 4} fontSize={10} fill="#16A34A" fontWeight={700} textAnchor="start" fontFamily="sans-serif">{`כיתה א'`}</text>
          <text x={250} y={y2 + 4} fontSize={10} fill={st.accentColor} fontWeight={700} textAnchor="start" fontFamily="sans-serif">{`כיתה ב'`}</text>

          <line x1={lineX} y1={y1} x2={lineX + lineW} y2={y1} stroke="#94a3b8" strokeWidth={1} />
          <line x1={lineX} y1={y2} x2={lineX + lineW} y2={y2} stroke="#94a3b8" strokeWidth={1} />

          {baseA.map((v, i) => {
            const t = (v - 50) / 60;
            return <circle key={`a${i}`} cx={lineX + t * lineW} cy={y1} r={5} fill="#16A34A" opacity={0.7} />;
          })}
          {classB.map((v, i) => {
            const t = Math.max(0, Math.min(1, (v - 50) / 60));
            return <circle key={`b${i}`} cx={lineX + t * lineW} cy={y2} r={5} fill={st.accentColor} opacity={0.7} />;
          })}

          {/* Mean lines */}
          <line x1={lineX + ((meanA - 50) / 60) * lineW} y1={y1 - 14} x2={lineX + ((meanA - 50) / 60) * lineW} y2={y1 + 14} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3,2" />
          <line x1={lineX + ((meanB - 50) / 60) * lineW} y1={y2 - 14} x2={lineX + ((meanB - 50) / 60) * lineW} y2={y2 + 14} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3,2" />
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "טווח כיתה א׳", val: rangeA.toFixed(0) },
          { label: "טווח כיתה ב׳", val: rangeB.toFixed(0) },
          { label: "ממוצע (שווה!)", val: meanA.toFixed(1) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>הוספת בונוס מזיזה את הממוצע אבל לא משנה את הטווח!</p>
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
  const [activeTab, setActiveTab] = useState<"mean" | "median" | "mode" | null>(null);

  const tabs = [
    { id: "mean" as const, label: "📊 ממוצע", tex: "\\bar{x}", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "median" as const, label: "📏 חציון", tex: "\\tilde{x}", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "mode" as const, label: "🔢 שכיח", tex: "Mo", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: Mean */}
      {activeTab === "mean" && (
        <motion.div key="mean" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\bar{x} = \\frac{\\sum x_i}{n}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מחשבים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>סוכמים את כל הערכים (<InlineMath>{"\\sum x_i"}</InlineMath>).</li>
                  <li>מחלקים בכמות הנתונים (<InlineMath>{"n"}</InlineMath>).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: ציונים 70, 80, 90 → ממוצע = (70+80+90)/3 = 80
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Median */}
      {activeTab === "median" && (
        <motion.div key="median" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#EA580C", fontSize: 16, fontWeight: 700 }}>
              הערך האמצעי לאחר מיון
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מחשבים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>ממיינים את הנתונים מהקטן לגדול.</li>
                  <li>אם n אי-זוגי — החציון הוא הערך האמצעי.</li>
                  <li>אם n זוגי — ממוצע שני הערכים האמצעיים.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה (זוגי): 65, 76, 78, 85, 88, 92 → חציון = (78+85)/2 = 81.5
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Mode */}
      {activeTab === "mode" && (
        <motion.div key="mode" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#DC2626", fontSize: 16, fontWeight: 700 }}>
              הערך עם השכיחות הגבוהה ביותר
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מוצאים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>סופרים כמה פעמים כל ערך מופיע.</li>
                  <li>הערך שמופיע הכי הרבה פעמים — הוא השכיח.</li>
                  <li>ייתכנו מספר שכיחים (bi-modal) או אף אחד.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: 85, 92, 78, 92, 65, 88, 92, 76 → השכיח הוא 92 (מופיע 3 פעמים)
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DescriptiveStatisticsPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>סטטיסטיקה תיאורית עם AI — כיתה יא׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>ממוצע, חציון, שכיח, ממוצע משוקלל והשוואת התפלגויות — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/3u/topic/grade11/statistics"
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

        <SubtopicProgress subtopicId="3u/grade11/statistics/descriptive" />

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
        {selectedLevel === "basic" && <MeanMedianLab />}
        {selectedLevel === "medium" && <FrequencyLab />}
        {selectedLevel === "advanced" && <ComparisonLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade11/statistics/descriptive" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
