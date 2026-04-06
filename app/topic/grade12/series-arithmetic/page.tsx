"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  contextWords?: string[];  // Exercise_Validator — הקשר לסעיף
  stationWords?: string[];  // Exercise_Validator — מיקוד בשלב
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
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",   accentCls: "text-green-700",   ladderBorder: "#16A34A", glowBorder: "rgba(22,163,74,0.35)",   glowShadow: "0 4px 16px rgba(22,163,74,0.12)",   glowRgb: "22,163,74",   accentColor: "#16A34A",  borderHex: "#2D5A27", borderRgb: "45,90,39"    },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white",  accentCls: "text-orange-700",  ladderBorder: "#EA580C", glowBorder: "rgba(234,88,12,0.35)",   glowShadow: "0 4px 16px rgba(234,88,12,0.12)",   glowRgb: "234,88,12",   accentColor: "#EA580C", borderHex: "#A34F26", borderRgb: "163,79,38"   },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",   badgeCls: "bg-red-700 text-white",     accentCls: "text-red-700",     ladderBorder: "#DC2626", glowBorder: "rgba(220,38,38,0.35)",   glowShadow: "0 4px 16px rgba(220,38,38,0.12)",   glowRgb: "220,38,38",   accentColor: "#DC2626", borderHex: "#8B2635", borderRgb: "139,38,53"  },
} as const;

const LAB_DEFAULTS = {
  basic:    { a1: 5,   d: 3,  n: 20 },
  medium:   { a1: 100, d: -6, n: 20 },
  advanced: { a1: 100, d: -3, n: 20 },
} as const;

const LAB_RANGES = {
  basic:    { a1: { min: -50,  max: 50  }, d: { min: -50, max: 50 } },
  medium:   { a1: { min: -100, max: 300 }, d: { min: -56, max: 50 } },
  advanced: { a1: { min: -100, max: 300 }, d: { min: -56, max: 50 } },
} as const;

// ─── SVGs ────────────────────────────────────────────────────────────────────

function SeriesDotsSVG() {
  const count = 7, W = 260, cx = 16, cy = 36, step = (W - 2 * cx) / (count - 1);
  return (
    <svg viewBox={`0 0 ${W} 58`} style={{ width: "100%", maxWidth: 280, display: "block", margin: "0 auto" }} aria-hidden>
      <line x1={cx} y1={cy} x2={W - cx} y2={cy} stroke="#1e3a5f" strokeWidth={1.5} />
      {Array.from({ length: count }, (_, i) => {
        const x = cx + i * step;
        const isEndpoint = i === 0 || i === count - 1;
        return (
          <g key={i}>
            {isEndpoint && <circle cx={x} cy={cy} r={13} fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.3)" strokeWidth={1} />}
            <circle cx={x} cy={cy} r={isEndpoint ? 9 : 7} fill={isEndpoint ? "#10b981" : "#020617"} stroke={isEndpoint ? "#10b981" : "#3b82f6"} strokeWidth={isEndpoint ? 2.5 : 1.8} />
            {isEndpoint && (
              <text x={x} y={cy + 22} fill="#10b981" fontSize={9} textAnchor="middle" fontWeight="bold">
                {i === 0 ? "a₁" : "aₙ"}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// SVG for medium: generic descending series crossing zero
function NegativeTermSVG() {
  const W = 260, H = 76;
  const nCount = 15;
  const cx0 = 14, cxEnd = W - 14;
  const step = (cxEnd - cx0) / (nCount - 1);
  const yZero = 48;

  // Generic descending dots crossing zero around index 11
  const dots = Array.from({ length: nCount }, (_, i) => {
    const val = 10 - i * 0.9;
    const x = cx0 + i * step;
    const y = yZero - val * 3.5;
    const crossesZero = i >= 11;
    const isCrossing = i === 11;
    return { x, y, crossesZero, isCrossing, n: i + 1 };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 280, display: "block", margin: "0 auto" }} aria-hidden>
      {/* Zero line */}
      <line x1={cx0} y1={yZero} x2={cxEnd} y2={yZero} stroke="#22c55e" strokeWidth={1.2} strokeDasharray="4,3" opacity={0.6} />
      {/* Connecting trend line */}
      <polyline
        points={dots.map(d => `${d.x},${d.y}`).join(" ")}
        fill="none" stroke="#334155" strokeWidth={1} opacity={0.5}
      />
      {/* Dots */}
      {dots.map(({ x, y, crossesZero, isCrossing, n }) => (
        <g key={n}>
          {isCrossing && (
            <circle cx={x} cy={y} r={11} fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3,2" />
          )}
          <circle
            cx={x} cy={y} r={isCrossing ? 5 : 3.5}
            fill={isCrossing ? "#ef4444" : crossesZero ? "#7f1d1d" : "#020617"}
            stroke={isCrossing ? "#ef4444" : crossesZero ? "#ef4444" : "#3b82f6"}
            strokeWidth={isCrossing ? 0 : 1.5}
          />
        </g>
      ))}
      {/* Labels — only a₁ and ? at crossing */}
      <text x={cx0} y={H - 4} fill="#475569" fontSize={7} textAnchor="middle">a₁</text>
      <text x={dots[11].x} y={H - 4} fill="#ef4444" fontSize={7} textAnchor="middle" fontWeight="bold">?</text>
    </svg>
  );
}

function TwoPointSeriesSVG() {
  const count = 10, W = 260, cx = 16, cy = 36, step = (W - 2 * cx) / (count - 1);
  return (
    <svg viewBox={`0 0 ${W} 58`} style={{ width: "100%", maxWidth: 280, display: "block", margin: "0 auto" }} aria-hidden>
      <line x1={cx} y1={cy} x2={W - cx} y2={cy} stroke="#1e3a5f" strokeWidth={1.5} />
      {Array.from({ length: count }, (_, i) => {
        const x = cx + i * step, highlighted1 = i === 4, highlighted2 = i === 9;
        return (
          <g key={i}>
            <circle cx={x} cy={cy} r={highlighted1 || highlighted2 ? 9 : 7} fill={highlighted1 ? "#f59e0b" : highlighted2 ? "#a78bfa" : "#020617"} stroke={highlighted1 ? "#f59e0b" : highlighted2 ? "#a78bfa" : "#3b82f6"} strokeWidth={highlighted1 || highlighted2 ? 2.5 : 1.8} />
            {highlighted1 && <text x={x} y={cy + 22} fill="#f59e0b" fontSize={9} textAnchor="middle" fontWeight="bold">aᵢ</text>}
            {highlighted2 && <text x={x} y={cy + 22} fill="#a78bfa" fontSize={9} textAnchor="middle" fontWeight="bold">aⱼ</text>}
          </g>
        );
      })}
    </svg>
  );
}

function SumBarsSVG() {
  const count = 8, W = 260, padX = 20, barW = (W - 2 * padX) / count - 4, maxH = 48;
  return (
    <svg viewBox={`0 0 ${W} 80`} style={{ width: "100%", maxWidth: 280, display: "block", margin: "0 auto" }} aria-hidden>
      <line x1={padX} y1={65} x2={W - padX} y2={65} stroke="#334155" strokeWidth={1} />
      {Array.from({ length: count }, (_, i) => {
        const h = Math.round((maxH * (i + 1)) / count), x = padX + i * ((W - 2 * padX) / count) + 2;
        const isFirst = i === 0, isLast = i === count - 1;
        return (
          <g key={i}>
            <rect x={x} y={65 - h} width={barW} height={h} fill={`rgba(99,102,241,${0.3 + (i / count) * 0.7})`} rx={2} />
            {(isFirst || isLast) && (
              <text x={x + barW / 2} y={75} fill="#475569" fontSize={8} textAnchor="middle">{isFirst ? "a₁" : "aₙ"}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function CombinedSeriesSVG() {
  const W = 238, padX = 14, cols = 5, gap = 7;
  const colW = (W - 2 * padX - gap * (cols - 1)) / cols;
  const rowsData = [
    { label: "A",   color: "#6366f1", heights: [20, 28, 36, 44, 52] },
    { label: "B",   color: "#f59e0b", heights: [14, 20, 26, 32, 38] },
    { label: "A+B", color: "#34d399", heights: [34, 48, 62, 76, 90] },
  ];
  const maxH = 90, rowH = 61, rowGap = 20, topPad = 6, labelH = 12;
  const totalH = topPad + rowsData.length * (rowH + labelH + rowGap);
  return (
    <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full max-w-xs mx-auto" aria-hidden>
      {rowsData.map((row, ri) => {
        const baseY = topPad + ri * (rowH + labelH + rowGap) + rowH;
        return (
          <g key={row.label}>
            <text x={padX - 3} y={baseY - rowH / 2 + 4} fill={row.color} fontSize={8} fontWeight={700} textAnchor="end">{row.label}</text>
            <line x1={padX} y1={baseY} x2={W - padX} y2={baseY} stroke="#1e293b" strokeWidth={1} />
            {row.heights.map((h, ci) => {
              const x = padX + ci * (colW + gap);
              const scaledH = (h / maxH) * (rowH - 6);
              return (
                <g key={ci}>
                  <rect x={x} y={baseY - scaledH} width={colW} height={scaledH}
                    fill={row.color} opacity={0.25 + ci * 0.12} rx={3} />
                </g>
              );
            })}
          </g>
        );
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

        {/* Score bar */}
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

// ─── Ladder Advanced ──────────────────────────────────────────────────────────

function LadderAdvanced({ steps }: { steps: PromptStep[] }) {
  const [masterPassed, setMasterPassed] = useState(false);
  const [unlockedCount, setUnlockedCount] = useState(1);
  const allPassed = masterPassed && unlockedCount > steps.length;

  return (
    <div>
      <MasterPromptGate onPass={() => setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" />

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
    title: "מציאת d, a₂₀ ו-S₂₀ — שלושה סעיפים",
    problem: "נתונה סדרה חשבונית בת 20 מספרים.\nנתון: a₁ = 5,  a₇ = 23\n\nמצא את:\nא. ההפרש (d)\nב. האיבר האחרון (a₂₀)\nג. סכום הסדרה (S₂₀)",
    diagram: <SeriesDotsSVG />,
    pitfalls: [
      { title: "⚠️ כפל ב-n במקום ב-(n−1)", text: "הנוסחה: aₙ = a₁ + (n−1)·d. בין a₁ ל-a₇ יש 6 קפיצות של d בדיוק — לא 7. תמיד n−1." },
      { title: "⚠️ בלבול בין שתי נוסחאות הסכום", text: "נוסחה ראשונה דורשת את aₙ, נוסחה שנייה דורשת את d. בחר את הנוסחה שמתאימה לנתונים שכבר יש לך." },
      { title: "⚠️ a₁ כבר נספר", text: "כשסופרים כמה איברים מ-a₁ עד aₙ, התשובה היא n ולא n−1. האיבר הראשון הוא חלק מהסדרה." },
    ],
    goldenPrompt: "\n\nהיי, אני תלמיד 4 יחידות וצירפתי לך תמונה של תרגיל בסדרות. אני רוצה שתהיה המורה הפרטי שלי ותעזור לי בכל שלב בלי לגלות לי את התשובות.\n\nקודם כל, תסרוק רגע את התמונה, אל תכתוב שום פתרון או הסבר עדיין.\n\nהמטרה שלי היא להבין מה אנחנו עושים. בכל פעם שאשלח לך סעיף, אני מבקש שתשאל אותי רק שאלה אחת מכווינה שתעזור לי להבין מה התנאי שצריך לקרות כאן או באיזו נוסחה כדאי להשתמש. אם אשלח לך צילום של החישוב שלי, תגיד לי אם הכיוון נכון, ואם טעיתי פשוט תן לי רמז קטן שיעזור לי לעלות על זה לבד.\n\nמוכן? תגיד לי שסרקת ונצא לדרך.\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״",
    steps: [
      { phase: "סעיף א׳", label: "מציאת ההפרש d", coaching: "", prompt: "\n\nאוקיי, זיהינו את הנתונים. בוא נתחיל בסעיף א׳ — למצוא את d. איך אני מתחיל להציב את הנתונים שסרקת בנוסחה?", keywords: [], keywordHint: "" },
      { phase: "סעיף ב׳", label: "מציאת האיבר האחרון a₂₀", coaching: "", prompt: "\n\nמצאתי את d. עכשיו אני רוצה לחשב את האיבר ה-20 (a₂₀). מה הצעד הבא שלי בנוסחת האיבר הכללי?", keywords: [], keywordHint: "" },
      { phase: "סעיף ג׳", label: "מציאת סכום הסדרה S₂₀", coaching: "", prompt: "\n\nיש לי את כל האיברים הדרושים. איך אני מחשב עכשיו את סכום 20 האיברים הראשונים (S₂₀)?", keywords: [], keywordHint: "" },
    ],
  },
  {
    id: "medium",
    title: "האיבר השלילי הראשון — אי שוויון",
    problem: "נתונה סדרה חשבונית שבה האיבר הראשון הוא 100 וההפרש הוא 6−.\n\nא. מצא כמה איברים חיוביים יש בסדרה.\nב. קבע מהו ערכו של האיבר השלילי הראשון.\nג. חשב את סכום כל האיברים החיוביים שנמצאים במקומות הזוגיים בלבד.",
    diagram: <NegativeTermSVG />,
    pitfalls: [
      { title: "⚠️ משווים לאפס במקום להשתמש באי-שוויון", text: "aₙ=0 נותן את האיבר האחרון הלא-שלילי. כדי למצוא את הראשון השלילי — יש לפתור aₙ<0." },
      { title: "⚠️ n לא חייב להיות שלם", text: "n חייב להיות מספר טבעי. אם n>17.67, הערך הטבעי הראשון הוא n=18." },
      { title: "⚠️ איברים במקומות זוגיים — סדרה חדשה", text: "האיברים a₂, a₄, a₆... יוצרים סדרה חשבונית חדשה עם הפרש כפול (d'=2d). מספר האיברים והאיבר הראשון משתנים בהתאם." },
    ],
    goldenPrompt: "\n\nהיי, אני תלמיד 4 יחידות וצירפתי לך תמונה של תרגיל בסדרות. אני רוצה שתהיה המורה הפרטי שלי ותעזור לי לפצח אותו שלב אחרי שלב בלי לגלות לי את התשובות.\nקודם כל, תסרוק רגע את התמונה ורק תאשר לי שראית את כל הנתונים ושאתה מוכן להתחיל לעבוד איתי על סעיף א'. אל תכתוב שום פתרון או הסבר עדיין.\nהמטרה שלי היא להבין את הלוגיקה שמאחורי השאלות האלה, אז בכל פעם שאשלח לך סעיף, אני מבקש שתשאל אותי רק שאלה אחת מכווינה שתעזור לי להבין מה התנאי שצריך לקרות כאן או באיזו נוסחה כדאי להשתמש. אם אשלח לך צילום של החישוב שלי, תגיד לי אם הכיוון נכון, ואם טעיתי פשוט תן לי רמז קטן שיעזור לי לעלות על זה לבד.\nמוכן? תגיד לי שסרקת ונצא לדרך.\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״",
    steps: [
      {
        phase: "סעיף א׳", label: "מצא כמה איברים חיוביים יש בסדרה.",
        coaching: "", prompt: "סדרה חשבונית a₁=100, d=−6. הנחה אותי למצוא כמה איברים חיוביים על ידי פתרון אי-שוויון.", keywords: [], keywordHint: "",
        contextWords: ["חיוביים", "גדול מאפס", "aₙ > 0", "אי-שוויון", "שלם", "עצירה"],
        stationWords: [],
      },
      {
        phase: "סעיף ב׳", label: "קבע מהו ערכו של האיבר השלילי הראשון.",
        coaching: "", prompt: "סדרה חשבונית a₁=100, d=−6. מצאתי את מספר האיברים החיוביים. הנחה אותי למצוא את ערך האיבר השלילי הראשון.", keywords: [], keywordHint: "",
        contextWords: ["שלילי", "קטן מאפס", "aₙ < 0", "ראשון שחוצה", "אינדקס", "מיקום"],
        stationWords: [],
      },
      {
        phase: "סעיף ג׳", label: "חשב את סכום כל האיברים החיוביים שנמצאים במקומות הזוגיים בלבד.",
        coaching: "", prompt: "סדרה חשבונית a₁=100, d=−6. הנחה אותי לחשב סכום האיברים החיוביים במקומות הזוגיים בלבד.", keywords: [], keywordHint: "",
        contextWords: ["סכום", "זוגיים", "קפיצות של 2", "2d", "הפרש כפול", "סדרה חדשה", "בלבד"],
        stationWords: [],
      },
    ],
  },
  {
    id: "advanced",
    title: "חיבור סדרות חשבוניות — סדרות A ו-B",
    problem: "נתונה סדרה חשבונית A בת 25 איברים.\nנתון: a₁₀ = 41, הפרש הסדרה הוא 4.\n\nא. מצא את האיבר הראשון a₁.\nב. חשב את סכום האיברים הנמצאים במקומות האי-זוגיים בסדרה A.\nג. נתונה סדרה חשבונית B בת 25 איברים: b₁ = 2, הפרש = d.\nמחברים את הסדרות: הסדרה החדשה היא a₁+b₁, a₂+b₂, ...\nהבע את הפרש הסדרה החדשה באמצעות d.\nנתון: סכום הסדרה החדשה = 1,650. מצא את d.",
    diagram: <CombinedSeriesSVG />,
    pitfalls: [
      { title: "💡 שים לב: אי-זוגיים", text: "בחישוב סכום של מקומות אי-זוגיים בלבד, מספר האיברים (n) והפרש הסדרה (d) משתנים. חשוב היטב מהם הערכים החדשים לפני שתמשיך." },
      { title: "⚠️ הפרש הסדרה המשולבת", text: "כשמחברים שתי סדרות חשבוניות איבר-איבר, ההפרש של הסדרה החדשה הוא סכום שני ההפרשים." },
      { title: "⚠️ חיבור סדרות — איבר ראשון", text: "כשמחברים שתי סדרות, האיבר הראשון של הסדרה החדשה הוא c₁ = a₁ + b₁ (סכום, לא מכפלה)." },
    ],
    goldenPrompt: "\n\n",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד מוצאים a₁ מנתון a₁₀ ו-d? כיצד מחשבים סכום של האיברים האי-זוגיים בלבד? מה קורה להפרש כשמחברים שתי סדרות חשבוניות? (לפחות 80 תווים)",
    steps: [
      {
        phase: "סעיף א׳",
        label: "מצא את האיבר הראשון a₁.",
        coaching: "", prompt: "סדרה חשבונית A, a₁₀=41, d=4. הנחה אותי למצוא את a₁ מנוסחת האיבר הכללי.", keywords: [], keywordHint: "",
        contextWords: ["איבר ראשון", "נוסחת איבר כללי", "a₁₀", "מיקום 10", "למצוא את a₁"],
        stationWords: [],
      },
      {
        phase: "סעיף ב׳",
        label: "חשב את סכום האיברים במקומות האי-זוגיים בסדרה A.",
        coaching: "", prompt: "סדרה חשבונית A עם 25 איברים. הנחה אותי לחשב סכום האיברים במקומות האי-זוגיים בלבד.", keywords: [], keywordHint: "",
        contextWords: ["אי-זוגיים", "הפרש 8", "2d", "13 איברים", "סכום"],
        stationWords: [],
      },
      {
        phase: "סעיף ג׳",
        label: "מצא את d של סדרה B כך שסכום הסדרה המשולבת = 1,650.",
        coaching: "", prompt: "סדרות A ו-B מחוברות איבר-איבר. הנחה אותי למצוא את הפרש הסדרה החדשה ולפתור d כך שהסכום = 1650.", keywords: [], keywordHint: "",
        contextWords: ["סדרה חדשה", "חיבור", "הפרש d+4", "סכום 1650", "למצוא את d"],
        stationWords: [],
      },
    ],
  },
];

// ─── FormulaBar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"general" | "sum1" | "sum2" | null>(null);
  const tabs = [
    { id: "general" as const, label: "איבר כללי", tex: "a_n = a_1 + (n-1)d", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "sum1" as const, label: "סכום", tex: "S_n = \\frac{n(a_1+a_n)}{2}", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "sum2" as const, label: "סכום נוסח 2", tex: "S_n = \\frac{n[2a_1+(n-1)d]}{2}", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>
      <div style={{ display: "flex", gap: 6, marginBottom: activeTab ? 14 : 0 }}>
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(isActive ? null : t.id)}
              style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${isActive ? t.borderColor : "rgba(60,54,42,0.15)"}`, background: isActive ? `${t.color}15` : "rgba(255,255,255,0.5)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
              <span style={{ color: isActive ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span>
            </button>
          );
        })}
      </div>
      {activeTab === "general" && (
        <motion.div key="general" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"a_n = a_1 + (n-1) \\cdot d"}</DisplayMath></div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> נוסחת האיבר הכללי מחברת את האיבר הראשון עם מספר הקפיצות כפול ההפרש.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>בין <InlineMath>{"a_1"}</InlineMath> ל-<InlineMath>{"a_n"}</InlineMath> יש <InlineMath>{"n-1"}</InlineMath> קפיצות (לא n!).</li>
                  <li>אם <InlineMath>{"d > 0"}</InlineMath> הסדרה עולה, אם <InlineMath>{"d < 0"}</InlineMath> הסדרה יורדת.</li>
                  <li>אפשר לחלץ כל משתנה: <InlineMath>{"a_1, d, n"}</InlineMath> או <InlineMath>{"a_n"}</InlineMath>.</li>
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      {activeTab === "sum1" && (
        <motion.div key="sum1" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"S_n = \\frac{n(a_1 + a_n)}{2}"}</DisplayMath></div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> סכום סדרה חשבונית = מספר האיברים כפול ממוצע הראשון והאחרון.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>משתמשים בנוסחה זו כשידועים <InlineMath>{"a_1"}</InlineMath> ו-<InlineMath>{"a_n"}</InlineMath>.</li>
                  <li>הממוצע של הסדרה שווה ל-<InlineMath>{"\\frac{a_1 + a_n}{2}"}</InlineMath>.</li>
                  <li>הנוסחה עובדת גם כשההפרש שלילי.</li>
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      {activeTab === "sum2" && (
        <motion.div key="sum2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"S_n = \\frac{n[2a_1 + (n-1)d]}{2}"}</DisplayMath></div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> נוסחה חלופית לסכום — כשלא ידוע <InlineMath>{"a_n"}</InlineMath> אבל ידוע <InlineMath>{"d"}</InlineMath>.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>משתמשים בנוסחה זו כשידועים <InlineMath>{"a_1"}</InlineMath>, <InlineMath>{"d"}</InlineMath> ו-<InlineMath>{"n"}</InlineMath> בלבד.</li>
                  <li>הנוסחה מתקבלת מהצבת <InlineMath>{"a_n = a_1 + (n-1)d"}</InlineMath> בנוסחה הראשונה.</li>
                  <li>שימושית במיוחד בתרגילים שבהם צריך למצוא את <InlineMath>{"d"}</InlineMath> מתוך הסכום.</li>
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() {
    navigator.clipboard.writeText(ex.problem.split(/\n+סעיף/)[0].trim());
    setCopiedProblem(true);
    setTimeout(() => setCopiedProblem(false), 2000);
  }
  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: "2rem" }} />

      {/* Formula bar */}
      <FormulaBar />

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

// ─── SeriesLab ────────────────────────────────────────────────────────────────

function SeriesLab({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  const def = LAB_DEFAULTS[levelId];
  const [a1, setA1] = useState(def.a1);
  const [d,  setD]  = useState(def.d);
  const [n,  setN]  = useState(def.n);

  useEffect(() => {
    const d2 = LAB_DEFAULTS[levelId];
    setA1(d2.a1); setD(d2.d); setN(d2.n);
  }, [levelId]);

  const st = STATION[levelId];
  const ranges = LAB_RANGES[levelId];
  const terms = Array.from({ length: n }, (_, i) => a1 + i * d);
  const an = a1 + (n - 1) * d;
  const Sn = (n * (2 * a1 + (n - 1) * d)) / 2;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת סדרה חשבונית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>סדרה חשבונית נקבעת על ידי שלושה גורמים: איבר ראשון, הפרש ומספר איברים. שחקו עם הסליידרים כדי לראות איך כל שינוי משפיע על הסדרה ולקבל זווית נוספת על אופן פעולתה.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: "2rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        {([
          { title: "איבר ראשון", varSym: "a₁", val: a1, set: setA1 as (v: number) => void, min: ranges.a1.min, max: ranges.a1.max },
          { title: "הפרש",       varSym: "d",   val: d,  set: setD  as (v: number) => void, min: ranges.d.min,  max: ranges.d.max  },
          { title: "מספר איברים",varSym: "n",   val: n,  set: setN  as (v: number) => void, min: 2,             max: 40            },
        ] as const).map((row) => (
          <div key={row.varSym}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{row.title} <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 600 }}>({row.varSym})</span></span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{row.val}</span>
            </div>
            <input type="range" min={row.min} max={row.max} step={1} value={row.val} onChange={(e) => row.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.borderRgb},0.35)`, padding: "1rem", marginBottom: "1rem" }}>
        <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>האיברים</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {terms.map((t, i) => (
            <span key={i} style={{ borderRadius: 8, padding: "4px 10px", fontSize: 14, fontFamily: "monospace", border: "1px solid", borderColor: i === 0 ? "#065f46" : i === n - 1 ? "#1d4ed8" : "rgba(60,54,42,0.15)", color: i === 0 ? "#6ee7b7" : i === n - 1 ? "#93c5fd" : "#2D3436", background: i === 0 ? "rgba(6,78,59,0.3)" : i === n - 1 ? "rgba(29,78,216,0.2)" : "rgba(60,54,42,0.06)" }}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "aₙ",    val: an                   },
          { label: "Sₙ",    val: Sn                   },
          { label: "ממוצע", val: (Sn/n).toFixed(1)   },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20 }}>{row.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── CombinedSeriesLab (Advanced) ────────────────────────────────────────────

function CombinedSeriesLab() {
  const [a1, setA1] = useState(5);
  const [dA, setDA] = useState(4);
  const [nA, setNA] = useState(25);
  const [b1, setB1] = useState(2);
  const [dB, setDB] = useState(2);
  const [nB, setNB] = useState(25);

  const nC = Math.min(nA, nB);

  // useMemo → חישוב מערכים רק כשהתלות משתנה, לא בכל render
  const termsA = useMemo(
    () => Array.from({ length: nA }, (_, i) => a1 + i * dA),
    [a1, dA, nA]
  );
  const termsB = useMemo(
    () => Array.from({ length: nB }, (_, i) => b1 + i * dB),
    [b1, dB, nB]
  );
  const termsC = useMemo(
    () => Array.from({ length: nC }, (_, i) => termsA[i] + termsB[i]),
    [termsA, termsB, nC]
  );

  const cLast = termsC[nC - 1] ?? 0;
  const SC    = useMemo(() => termsC.reduce((acc, v) => acc + v, 0), [termsC]);
  const avg   = nC > 0 ? (SC / nC).toFixed(1) : "—";
  const dCombined = dA + dB;

  const st = STATION.advanced;

  const Slider = ({ label, val, set, min, max, color, accent }: {
    label: string; val: number; set: (v: number) => void;
    min: number; max: number; color: string; accent: string;
  }) => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{val}</span>
      </div>
      <input type="range" min={min} max={max} step={1} value={val}
        onChange={e => set(+e.target.value)}
        style={{ width: "100%", accentColor: accent }} />
    </div>
  );

  const Track = ({ label, terms, lastIdx, color, bg, border }: {
    label: string; terms: number[]; lastIdx: number;
    color: string; bg: string; border: string;
  }) => (
    <div style={{ borderRadius: 14, background: "rgba(255,255,255,0.75)", border: `1px solid ${border}`, padding: "0.75rem 1rem" }}>
      <div style={{ color, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
        {label} <span style={{ color: "#475569", fontWeight: 400, textTransform: "none" }}>({terms.length} איברים)</span>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {terms.map((t, i) => (
          <span key={i} style={{
            borderRadius: 6, padding: "2px 8px", fontSize: 11, fontFamily: "monospace",
            background: bg, border: `1px solid ${border}`,
            color, opacity: i === 0 || i === lastIdx ? 1 : 0.65,
            fontWeight: i === 0 || i === lastIdx ? 700 : 400,
            minWidth: 36, textAlign: "center", display: "inline-block",
            transition: "none",   // ← אין transitions בזמן גרירה
            willChange: "contents",
          }}>{t}</span>
        ))}
      </div>
    </div>
  );

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 6 }}>מעבדת סדרות משולבות</h3>
      <p style={{ color: "#6B7280", fontSize: 13, textAlign: "center", marginBottom: "2rem" }}>שנה את הפרמטרים של סדרות A ו-B ושים לב לשינויים בשלושת הסדרות</p>

      {/* ── Sliders grid: A left, B right ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem 2rem", marginBottom: "2rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        {/* Column A */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: "#93c5fd", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(59,130,246,0.3)", paddingBottom: 6 }}>סדרה A</div>
          <Slider label="איבר ראשון (a₁)" val={a1} set={setA1} min={-50} max={50} color="#93c5fd" accent="#3b82f6" />
          <Slider label="הפרש (d_A)"       val={dA} set={setDA} min={-50} max={50} color="#93c5fd" accent="#3b82f6" />
          <Slider label="מספר איברים (n_A)" val={nA} set={setNA} min={1}   max={50} color="#93c5fd" accent="#3b82f6" />
        </div>
        {/* Column B */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: "#fbbf24", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(245,158,11,0.3)", paddingBottom: 6 }}>סדרה B</div>
          <Slider label="איבר ראשון (b₁)" val={b1} set={setB1} min={-50} max={50} color="#fbbf24" accent="#f59e0b" />
          <Slider label="הפרש (d_B)"       val={dB} set={setDB} min={-50} max={50} color="#fbbf24" accent="#f59e0b" />
          <Slider label="מספר איברים (n_B)" val={nB} set={setNB} min={1}   max={50} color="#fbbf24" accent="#f59e0b" />
        </div>
      </div>

      {/* ── Multi-track display ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1.5rem" }}>
        <Track label="סדרה A" terms={termsA} lastIdx={nA - 1} color="#93c5fd" bg="rgba(29,78,216,0.15)"  border="rgba(59,130,246,0.35)"  />
        <Track label="סדרה B" terms={termsB} lastIdx={nB - 1} color="#fbbf24" bg="rgba(120,53,15,0.15)"  border="rgba(245,158,11,0.35)" />
        <Track label="סדרה C = A+B" terms={termsC} lastIdx={nC - 1} color="#c084fc" bg="rgba(88,28,135,0.2)" border="rgba(168,85,247,0.45)" />
      </div>

      {/* ── Combined difference insight ── */}
      <div style={{ borderRadius: 12, background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.2)", padding: "10px 16px", marginBottom: "1.5rem", textAlign: "center" }}>
        <span style={{ color: "#6B7280", fontSize: 13 }}>הפרש הסדרה החדשה: </span>
        <span style={{ color: "#DC2626", fontSize: 14, fontFamily: "monospace", fontWeight: 700 }}>
          d_A + d_B = {dA} + {dB} = {dCombined}
        </span>
      </div>

      {/* ── Summary cards (C only) ── */}
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, textAlign: "center", marginBottom: 10 }}>מדדי סיכום עבור סדרה C</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "Cₙ",    val: cLast },
          { label: "Sₙ",    val: SC    },
          { label: "ממוצע", val: avg   },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.35)`, padding: 12, boxShadow: `0 4px 16px rgba(${st.glowRgb},0.1)` }}>
            <div style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20 }}>{row.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-700",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium",   label: "בינוני", textColor: "text-orange-700",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-700",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SeriesArithmeticPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "163,79,38" : "139,38,53";

  return (
    <main
      style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties}
      dir="rtl"
    >
      {/* ── Global focus/hover border overrides — kills all browser black outlines ── */}
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
          {/* Title */}
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>סדרה חשבונית עם AI</h1>
          {/* Back button — left side */}
          <Link
            href="/topic/grade12/series"
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

        {/* Sub-topic progress */}
        <SubtopicProgress subtopicId="/grade12/series-arithmetic" />

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

        {/* Active card */}
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        {/* Lab — always visible */}
        {selectedLevel === "advanced"
          ? <CombinedSeriesLab />
          : <SeriesLab levelId={selectedLevel} />
        }

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="/grade12/series-arithmetic" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
