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
  const barHeights = [0.7, 0.5, 0.85, 0.6, 0.95, 0.4, 0.75];
  const barW = 24, gap = 8, pad = 30;
  const totalW = pad * 2 + barHeights.length * (barW + gap);
  const maxH = 100;
  return (
    <svg viewBox={`0 0 ${totalW} 140`} className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={pad} y1={120} x2={totalW - pad} y2={120} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={pad} y1={20} x2={pad} y2={120} stroke="#94a3b8" strokeWidth={1.5} />
      {barHeights.map((h, i) => {
        const x = pad + i * (barW + gap) + gap / 2;
        const barH = h * maxH;
        return (
          <rect key={i} x={x} y={120 - barH} width={barW} height={barH} rx={3} fill="#16A34A" opacity={0.55} />
        );
      })}
      {barHeights.map((_, i) => {
        const x = pad + i * (barW + gap) + gap / 2 + barW / 2;
        return <text key={`l${i}`} x={x} y={133} fontSize={9} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>;
      })}
    </svg>
  );
}

function MediumSVG() {
  const barHeights = [0.6, 0.45, 0.9, 0.55, 0.8, 0.7, 0.35, 0.65];
  const barW = 22, gap = 6, pad = 30;
  const totalW = pad * 2 + barHeights.length * (barW + gap);
  const maxH = 100;
  return (
    <svg viewBox={`0 0 ${totalW} 140`} className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={pad} y1={120} x2={totalW - pad} y2={120} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={pad} y1={20} x2={pad} y2={120} stroke="#94a3b8" strokeWidth={1.5} />
      {barHeights.map((h, i) => {
        const x = pad + i * (barW + gap) + gap / 2;
        const barH = h * maxH;
        return (
          <rect key={i} x={x} y={120 - barH} width={barW} height={barH} rx={3} fill="#EA580C" opacity={0.5} />
        );
      })}
      {barHeights.map((_, i) => {
        const x = pad + i * (barW + gap) + gap / 2 + barW / 2;
        return <text key={`l${i}`} x={x} y={133} fontSize={9} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>;
      })}
    </svg>
  );
}

function AdvancedSVG() {
  const barHeights = [0.5, 0.7, 0.85, 0.6, 0.45, 0.75];
  const barW = 26, gap = 8, pad = 30;
  const totalW = pad * 2 + barHeights.length * (barW + gap);
  const maxH = 100;
  return (
    <svg viewBox={`0 0 ${totalW} 150`} className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={pad} y1={120} x2={totalW - pad} y2={120} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={pad} y1={20} x2={pad} y2={120} stroke="#94a3b8" strokeWidth={1.5} />
      {barHeights.map((h, i) => {
        const x = pad + i * (barW + gap) + gap / 2;
        const barH = h * maxH;
        const isX = i === barHeights.length - 1;
        return (
          <rect
            key={i} x={x} y={120 - barH} width={barW} height={barH} rx={3}
            fill={isX ? "none" : "#DC2626"}
            stroke={isX ? "#a78bfa" : "none"}
            strokeWidth={isX ? 2 : 0}
            strokeDasharray={isX ? "6,3" : "none"}
            opacity={isX ? 0.8 : 0.5}
          />
        );
      })}
      {barHeights.map((_, i) => {
        const x = pad + i * (barW + gap) + gap / 2 + barW / 2;
        const isX = i === barHeights.length - 1;
        return <text key={`l${i}`} x={x} y={135} fontSize={isX ? 12 : 9} fill={isX ? "#a78bfa" : "#64748b"} textAnchor="middle" fontFamily="sans-serif" fontWeight={isX ? 700 : 400}>{isX ? "x" : "?"}</text>;
      })}
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
        subjectWords={["ממוצע", "חציון", "שכיח", "סכום", "נתון חסר", "x"]}
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
    title: "ממוצע של רשימת ציונים",
    problem: "נתונים ציוני 7 תלמידים במבחן:\n88, 72, 95, 72, 64, 81, 72\n\nא. חשבו את הממוצע של הציונים.\nב. סדרו את הנתונים מהקטן לגדול ומצאו את החציון.\nג. מצאו את השכיח.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "שוכחים למיין לפני חציון", text: "כדי למצוא חציון יש למיין את הנתונים מהקטן לגדול. תלמידים רבים לוקחים את הערך האמצעי ברשימה המקורית — וזו טעות! רק אחרי מיון ניתן למצוא את הערך האמצעי." },
      { title: "בלבול בין שכיח לחציון", text: "השכיח הוא הערך שמופיע הכי הרבה פעמים — לא הערך שנמצא באמצע. שכיח תלוי בספירת הופעות, חציון תלוי במיקום אחרי מיון." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י', 3 יחידות, ומצרף/ת שאלה בסטטיסטיקה על ממוצע, חציון ושכיח. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "חישוב ממוצע", coaching: "", prompt: "נתונים 7 ציונים: 88, 72, 95, 72, 64, 81, 72. תנחה אותי כיצד לחשב את הממוצע — סכום כל הציונים חלקי מספר הנתונים.", keywords: [], keywordHint: "", contextWords: ["ממוצע", "סכום", "חלקי", "ציונים", "חיבור", "7"] },
      { phase: "סעיף ב׳", label: "מיון ומציאת חציון", coaching: "", prompt: "נתונים 7 ציונים: 88, 72, 95, 72, 64, 81, 72. תסביר לי כיצד ממיינים את הנתונים ומוצאים את החציון כשיש מספר אי-זוגי של ערכים.", keywords: [], keywordHint: "", contextWords: ["חציון", "מיון", "אמצע", "סדר", "אי-זוגי", "ערך"] },
      { phase: "סעיף ג׳", label: "מציאת שכיח", coaching: "", prompt: "נתונים 7 ציונים: 88, 72, 95, 72, 64, 81, 72. תכווין אותי למצוא את השכיח — הערך שמופיע הכי הרבה פעמים ברשימה.", keywords: [], keywordHint: "", contextWords: ["שכיח", "שכיחות", "מופיע", "פעמים", "ספירה", "ערך"] },
    ],
  },
  {
    id: "medium",
    title: "ממוצע ממספר זוגי של נתונים",
    problem: "נתונים ציוני 8 תלמידים במבחן:\n75, 82, 91, 68, 82, 77, 95, 60\n\nא. חשבו את הממוצע של הציונים.\nב. מצאו את החציון (שימו לב — מספר זוגי של ערכים, צריך ממוצע של שני אמצעיים).\nג. האם יש שכיח? הסבירו.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "שוכחים לממצע שני ערכים אמצעיים", text: "כשיש מספר זוגי של נתונים, החציון הוא ממוצע של שני הערכים האמצעיים (הרביעי והחמישי). תלמידים רבים לוקחים רק אחד מהם — וזו טעות!" },
      { title: "טוענים שאין שכיח כשיש", text: "לפני שקובעים שאין שכיח, יש לספור כמה פעמים מופיע כל ערך. אם ערך מסוים מופיע יותר מפעם אחת — הוא השכיח, גם אם הוא מופיע רק פעמיים." },
    ],
    goldenPrompt: `אני בכיתה י', 3 יחידות, מצרף/ת תרגיל בסטטיסטיקה בנושא ממוצע, חציון ושכיח עם מספר זוגי של נתונים.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על מיון, ממוצע שני אמצעיים, וספירת שכיחות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "חישוב ממוצע", coaching: "", prompt: "נתונים 8 ציונים: 75, 82, 91, 68, 82, 77, 95, 60. תנחה אותי לחשב את הממוצע — סכום כל הנתונים חלקי 8.", keywords: [], keywordHint: "", contextWords: ["ממוצע", "סכום", "חלקי", "ציונים", "חיבור", "8"] },
      { phase: "סעיף ב׳", label: "חציון ממספר זוגי", coaching: "", prompt: "נתונים 8 ציונים: 75, 82, 91, 68, 82, 77, 95, 60. תדריך אותי למיין ולמצוא חציון כשיש מספר זוגי — ממוצע הערך הרביעי והחמישי.", keywords: [], keywordHint: "", contextWords: ["חציון", "מיון", "זוגי", "אמצעיים", "ממוצע", "רביעי"] },
      { phase: "סעיף ג׳", label: "זיהוי שכיח", coaching: "", prompt: "נתונים 8 ציונים: 75, 82, 91, 68, 82, 77, 95, 60. תכווין אותי לבדוק האם יש שכיח — לספור כמה פעמים מופיע כל ערך.", keywords: [], keywordHint: "", contextWords: ["שכיח", "שכיחות", "מופיע", "פעמים", "ספירה", "קיים"] },
    ],
  },
  {
    id: "advanced",
    title: "נתון חסר — מצא את x",
    problem: "נתונים 6 ציונים במבחן:\n55, 70, 80, 65, 90, x\n\nידוע שהממוצע הוא 70.\n\nא. כתבו משוואה: סכום הציונים הידועים + x = ממוצע × מספר הנתונים.\nב. פתרו ומצאו את x.\nג. עם x שמצאתם, מצאו את החציון והשכיח.\nד. אם הציון הנמוך ביותר (55) משתנה ל-0, האם הממוצע משתנה? האם החציון משתנה? הסבירו.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "טעות בבניית המשוואה", text: "הממוצע = סכום / n. לכן סכום = ממוצע × n. צריך לסכום את כל הנתונים הידועים, להוסיף x, ולהשוות לממוצע כפול מספר הנתונים. אל תשכחו לספור את x כחלק מ-n!" },
      { title: "שינוי ערך קיצוני לא תמיד משנה חציון", text: "כשמשנים את הערך הקטן ביותר, הממוצע בהחלט משתנה כי הסכום משתנה. אבל החציון תלוי רק בערכים האמצעיים — אם הערך שהשתנה לא באמצע, החציון נשאר!" },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד מוצאים נתון חסר כשנתון הממוצע, ומה ההבדל בין השפעת שינוי על ממוצע לעומת חציון? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "בניית משוואה", coaching: "", prompt: "נתונים: 55, 70, 80, 65, 90, x. הממוצע הוא 70. תנחה אותי לכתוב משוואה שבה סכום כל הנתונים שווה לממוצע כפול מספר הנתונים.", keywords: [], keywordHint: "", contextWords: ["משוואה", "סכום", "ממוצע", "כפול", "n", "שווה"] },
      { phase: "סעיף ב׳", label: "פתרון x", coaching: "", prompt: "נתונים: 55, 70, 80, 65, 90, x. הממוצע 70. תדריך אותי לפתור את המשוואה ולמצוא את x.", keywords: [], keywordHint: "", contextWords: ["פתרון", "x", "חיסור", "סכום", "משוואה", "נתון חסר"] },
      { phase: "סעיף ג׳", label: "חציון ושכיח עם x", coaching: "", prompt: "לאחר שמצאתי x, תנחה אותי למיין את כל 6 הנתונים ולמצוא חציון (ממוצע שני אמצעיים) ושכיח.", keywords: [], keywordHint: "", contextWords: ["חציון", "שכיח", "מיון", "אמצעיים", "סדר", "6"] },
      { phase: "סעיף ד׳", label: "השפעת שינוי ערך קיצוני", coaching: "", prompt: "אם 55 משתנה ל-0 — תסביר לי איך זה משפיע על הממוצע (כן) ואיך על החציון (אולי לא). מה ההבדל?", keywords: [], keywordHint: "", contextWords: ["שינוי", "ממוצע", "חציון", "קיצוני", "סכום", "השפעה"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📊 ממוצע, חציון ושכיח (Mean, Median & Mode)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "שלושת מדדי המרכז הבסיסיים — ממוצע (סכום חלקי כמות), חציון (ערך אמצעי אחרי מיון), שכיח (הנפוץ ביותר)."}
            {ex.id === "medium" && "מספר זוגי של נתונים — החציון דורש ממוצע של שני ערכים אמצעיים. מתי יש שכיח ומתי אין?"}
            {ex.id === "advanced" && "נתון חסר x כשהממוצע ידוע — בניית משוואה, פתרון, והבנת ההבדל בין השפעה על ממוצע לעומת חציון."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: מדדי מרכז */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>מדדי מרכז</div>
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
              <span>הערך שמופיע הכי הרבה פעמים (יכול להיות אחד, כמה, או אף אחד).</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>מקרים מיוחדים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>n זוגי</span>
                  <span>חציון = ממוצע שני הערכים האמצעיים.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>ללא שכיח</span>
                  <span>אם כל ערך מופיע פעם אחת — אין שכיח.</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>נתון חסר</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>משוואה</span>
                  <span>סכום ידועים + x = ממוצע נתון × n</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>רגישות</span>
                  <span>ממוצע רגיש לשינויים קיצוניים, חציון פחות.</span>
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

// ─── MeanLab (basic) — 7 sliders ────────────────────────────────────────────

function MeanLab() {
  const [scores, setScores] = useState([88, 72, 95, 72, 64, 81, 72]);
  const st = STATION.basic;

  const n = scores.length;
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const sorted = [...scores].sort((a, b) => a - b);
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

  const freq: Record<number, number> = {};
  scores.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  const maxFreq = Math.max(...Object.values(freq));
  const modes = Object.entries(freq).filter(([, f]) => f === maxFreq && f > 1).map(([v]) => +v);
  const modeStr = modes.length > 0 ? modes.join(", ") : "אין";

  const updateScore = (i: number, v: number) => {
    setScores(prev => { const next = [...prev]; next[i] = v; return next; });
  };

  const pad = 30, barW = 26, gap = 8;
  const svgW = pad * 2 + n * (barW + gap);
  const maxH = 100;
  const maxVal = Math.max(...scores, 1);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת ממוצע, חציון ושכיח</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את 7 הציונים בעזרת הסליידרים וצפו כיצד מדדי המרכז משתנים בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {scores.map((v, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
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
            const barH = maxVal > 0 ? (v / maxVal) * maxH : 0;
            return <rect key={i} x={x} y={120 - barH} width={barW} height={barH} rx={3} fill={st.accentColor} opacity={0.55} />;
          })}
          {/* Mean line */}
          {(() => {
            const meanBarH = maxVal > 0 ? (mean / maxVal) * maxH : 0;
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

// ─── EvenCountLab (medium) — 8 sliders ──────────────────────────────────────

function EvenCountLab() {
  const [scores, setScores] = useState([75, 82, 91, 68, 82, 77, 95, 60]);
  const st = STATION.medium;

  const n = scores.length;
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const sorted = [...scores].sort((a, b) => a - b);
  const mid1 = sorted[n / 2 - 1];
  const mid2 = sorted[n / 2];
  const median = (mid1 + mid2) / 2;

  const freq: Record<number, number> = {};
  scores.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  const maxFreqVal = Math.max(...Object.values(freq));
  const modes = Object.entries(freq).filter(([, f]) => f === maxFreqVal && f > 1).map(([v]) => +v);
  const modeStr = modes.length > 0 ? modes.join(", ") : "אין";

  const updateScore = (i: number, v: number) => {
    setScores(prev => { const next = [...prev]; next[i] = v; return next; });
  };

  const pad = 30, barW = 22, gap = 6;
  const svgW = pad * 2 + n * (barW + gap);
  const maxH = 100;
  const maxVal = Math.max(...scores, 1);

  // Identify the two middle indices in sorted order for highlighting
  const sortedIndices = scores.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const midIdx1 = sortedIndices[n / 2 - 1].i;
  const midIdx2 = sortedIndices[n / 2].i;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת חציון ממספר זוגי</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את 8 הציונים — שימו לב כיצד שני הערכים האמצעיים (מסומנים בצהוב) קובעים את החציון.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {scores.map((v, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
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
            const barH = maxVal > 0 ? (v / maxVal) * maxH : 0;
            const isMiddle = i === midIdx1 || i === midIdx2;
            return <rect key={i} x={x} y={120 - barH} width={barW} height={barH} rx={3} fill={isMiddle ? "#f59e0b" : st.accentColor} opacity={isMiddle ? 0.75 : 0.5} />;
          })}
          {/* Median line */}
          {(() => {
            const medianBarH = maxVal > 0 ? (median / maxVal) * maxH : 0;
            const y = 120 - medianBarH;
            return <line x1={pad} y1={y} x2={svgW - pad} y2={y} stroke="#a78bfa" strokeWidth={1.8} strokeDasharray="4,3" />;
          })()}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "ממוצע", val: mean.toFixed(1) },
          { label: "חציון", val: `(${mid1}+${mid2})/2 = ${median.toFixed(1)}` },
          { label: "שכיח", val: modeStr },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: row.label === "חציון" ? 14 : 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>עמודות צהובות = שני הערכים האמצעיים. במספר זוגי, החציון = הממוצע שלהם!</p>
    </section>
  );
}

// ─── MissingValueLab (advanced) ─────────────────────────────────────────────

function MissingValueLab() {
  const [known, setKnown] = useState([55, 70, 80, 65, 90]);
  const [targetMean, setTargetMean] = useState(70);
  const st = STATION.advanced;

  const n = known.length + 1;
  const knownSum = known.reduce((a, b) => a + b, 0);
  const x = targetMean * n - knownSum;
  const allValues = [...known, x];
  const actualMean = allValues.reduce((a, b) => a + b, 0) / n;
  const sorted = [...allValues].sort((a, b) => a - b);
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

  const updateKnown = (i: number, v: number) => {
    setKnown(prev => { const next = [...prev]; next[i] = v; return next; });
  };

  const pad = 30, barW = 28, gap = 8;
  const svgW = pad * 2 + n * (barW + gap);
  const maxH = 100;
  const maxVal = Math.max(...allValues.map(Math.abs), 1);
  const displayMax = Math.max(maxVal, 100);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת נתון חסר</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את 5 הציונים הידועים ואת הממוצע הרצוי — המעבדה תחשב את x בזמן אמת.</p>

      {/* Known value sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
        {known.map((v, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>ציון {i + 1}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{v}</span>
            </div>
            <input type="range" min={0} max={100} step={1} value={v} onChange={(e) => updateKnown(i, +e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* Target mean slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>ממוצע רצוי</span>
            <span style={{ color: "#f59e0b", fontFamily: "monospace", fontWeight: 700 }}>{targetMean}</span>
          </div>
          <input type="range" min={0} max={100} step={1} value={targetMean} onChange={(e) => setTargetMean(+e.target.value)} style={{ width: "100%", accentColor: "#f59e0b" }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} 150`} className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={pad} y1={120} x2={svgW - pad} y2={120} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={pad} y1={20} x2={pad} y2={120} stroke="#94a3b8" strokeWidth={1.5} />
          {allValues.map((v, i) => {
            const xPos = pad + i * (barW + gap) + gap / 2;
            const barH = displayMax > 0 ? (Math.max(v, 0) / displayMax) * maxH : 0;
            const isX = i === allValues.length - 1;
            return (
              <g key={i}>
                <rect
                  x={xPos} y={120 - barH} width={barW} height={barH} rx={3}
                  fill={isX ? "#a78bfa" : st.accentColor}
                  opacity={isX ? 0.7 : 0.5}
                  stroke={isX ? "#a78bfa" : "none"}
                  strokeWidth={isX ? 2 : 0}
                  strokeDasharray={isX ? "4,2" : "none"}
                />
                {isX && <text x={xPos + barW / 2} y={135} fontSize={11} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>x</text>}
              </g>
            );
          })}
          {/* Mean line */}
          {(() => {
            const meanBarH = displayMax > 0 ? (Math.max(actualMean, 0) / displayMax) * maxH : 0;
            const y = 120 - meanBarH;
            return <line x1={pad} y1={y} x2={svgW - pad} y2={y} stroke="#f59e0b" strokeWidth={1.8} strokeDasharray="4,3" />;
          })()}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "x (נתון חסר)", val: x.toFixed(1), color: "#a78bfa" },
          { label: "ממוצע בפועל", val: actualMean.toFixed(1), color: st.accentColor },
          { label: "חציון", val: median.toFixed(1), color: st.accentColor },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: row.color, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>
        {x < 0 ? "x יצא שלילי — הממוצע הרצוי נמוך מדי עבור הנתונים האלה!" : x > 100 ? "x יצא מעל 100 — הממוצע הרצוי גבוה מדי!" : "שנו ציון ידוע או את הממוצע הרצוי וצפו כיצד x משתנה בהתאם."}
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
  const [activeTab, setActiveTab] = useState<"mean" | "median" | "mode" | null>(null);

  const tabs = [
    { id: "mean" as const, label: "ממוצע", tex: "\\bar{x}", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "median" as const, label: "חציון", tex: "\\tilde{x}", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "mode" as const, label: "שכיח", tex: "Mo", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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
                דוגמה: ציונים 70, 80, 90. ממוצע = (70+80+90)/3 = 80
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
                דוגמה (זוגי): 60, 68, 75, 77, 82, 82, 91, 95. חציון = (77+82)/2 = 79.5
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
                  <li>ייתכנו מספר שכיחים, או שאין שכיח כלל.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: 88, 72, 95, 72, 64, 81, 72. השכיח הוא 72 (מופיע 3 פעמים)
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MeanMedianModePage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>ממוצע, חציון ושכיח עם AI — כיתה י׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>מדדי מרכז בסיסיים, חציון ממספר זוגי, נתון חסר — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/3u/topic/grade10/statistics"
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

        <SubtopicProgress subtopicId="3u/grade10/statistics/mean-median" />

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
        {selectedLevel === "basic" && <MeanLab />}
        {selectedLevel === "medium" && <EvenCountLab />}
        {selectedLevel === "advanced" && <MissingValueLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade10/statistics/mean-median" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
