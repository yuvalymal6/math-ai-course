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

// BasicSVG — Two dot plots on number line, range bars, mean line
function BasicSVG() {
  const y1 = 50, y2 = 110;
  const lineX = 40, lineW = 180;
  return (
    <svg viewBox="0 0 260 160" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Class A label */}
      <text x={230} y={y1 + 4} fontSize={11} fill="#16A34A" fontWeight={700} textAnchor="start" fontFamily="sans-serif">{`כיתה א'`}</text>
      {/* Class B label */}
      <text x={230} y={y2 + 4} fontSize={11} fill="#a78bfa" fontWeight={700} textAnchor="start" fontFamily="sans-serif">{`כיתה ב'`}</text>

      {/* Number lines */}
      <line x1={lineX} y1={y1} x2={lineX + lineW} y2={y1} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={lineX} y1={y2} x2={lineX + lineW} y2={y2} stroke="#94a3b8" strokeWidth={1.5} />

      {/* Class A dots — clustered near center */}
      {[0.3, 0.4, 0.5, 0.6, 0.7].map((t, i) => (
        <circle key={`a${i}`} cx={lineX + t * lineW} cy={y1} r={5} fill="#16A34A" opacity={0.8} />
      ))}

      {/* Class B dots — spread wide */}
      {[0.05, 0.25, 0.5, 0.75, 0.95].map((t, i) => (
        <circle key={`b${i}`} cx={lineX + t * lineW} cy={y2} r={5} fill="#a78bfa" opacity={0.8} />
      ))}

      {/* Mean lines — dashed amber */}
      <line x1={lineX + 0.5 * lineW} y1={y1 - 18} x2={lineX + 0.5 * lineW} y2={y1 + 18} stroke="#f59e0b" strokeWidth={1.8} strokeDasharray="4,3" />
      <line x1={lineX + 0.5 * lineW} y1={y2 - 18} x2={lineX + 0.5 * lineW} y2={y2 + 18} stroke="#f59e0b" strokeWidth={1.8} strokeDasharray="4,3" />

      {/* Range bars — underneath each line */}
      {/* Class A — narrow range */}
      <line x1={lineX + 0.3 * lineW} y1={y1 + 26} x2={lineX + 0.7 * lineW} y2={y1 + 26} stroke="#16A34A" strokeWidth={2.5} />
      <line x1={lineX + 0.3 * lineW} y1={y1 + 22} x2={lineX + 0.3 * lineW} y2={y1 + 30} stroke="#16A34A" strokeWidth={1.5} />
      <line x1={lineX + 0.7 * lineW} y1={y1 + 22} x2={lineX + 0.7 * lineW} y2={y1 + 30} stroke="#16A34A" strokeWidth={1.5} />

      {/* Class B — wide range */}
      <line x1={lineX + 0.05 * lineW} y1={y2 + 26} x2={lineX + 0.95 * lineW} y2={y2 + 26} stroke="#a78bfa" strokeWidth={2.5} />
      <line x1={lineX + 0.05 * lineW} y1={y2 + 22} x2={lineX + 0.05 * lineW} y2={y2 + 30} stroke="#a78bfa" strokeWidth={1.5} />
      <line x1={lineX + 0.95 * lineW} y1={y2 + 22} x2={lineX + 0.95 * lineW} y2={y2 + 30} stroke="#a78bfa" strokeWidth={1.5} />

      {/* Question marks on range bars */}
      <text x={lineX + 0.5 * lineW} y={y1 + 42} fontSize={12} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>
      <text x={lineX + 0.5 * lineW} y={y2 + 42} fontSize={12} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>
    </svg>
  );
}

// MediumSVG — Two bell-curve silhouettes (narrow vs wide)
function MediumSVG() {
  // Narrow bell
  const narrowPath = "M 30,120 C 30,120 50,118 70,100 C 85,86 95,40 110,30 C 125,40 135,86 150,100 C 170,118 190,120 190,120";
  // Wide bell
  const widePath = "M 30,120 C 30,120 40,115 60,100 C 75,88 90,70 110,60 C 130,70 145,88 160,100 C 180,115 190,120 190,120";

  return (
    <svg viewBox="0 0 440 160" className="w-full max-w-md mx-auto" aria-hidden>
      {/* Narrow bell — Class A */}
      <g transform="translate(0,0)">
        <path d={narrowPath} fill="rgba(22,163,74,0.08)" stroke="#16A34A" strokeWidth={2} />
        <line x1={110} y1={25} x2={110} y2={125} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
        <text x={110} y={145} fontSize={11} fill="#16A34A" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">{`כיתה א'`}</text>
      </g>
      {/* Wide bell — Class B */}
      <g transform="translate(220,0)">
        <path d={widePath} fill="rgba(167,139,250,0.08)" stroke="#a78bfa" strokeWidth={2} />
        <line x1={110} y1={55} x2={110} y2={125} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
        <text x={110} y={145} fontSize={11} fill="#a78bfa" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">{`כיתה ב'`}</text>
      </g>
      {/* Arrows showing width difference */}
      <text x={110} y={15} fontSize={10} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">{"σ?"}</text>
      <text x={330} y={50} fontSize={10} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">{"σ?"}</text>
    </svg>
  );
}

// AdvancedSVG — Two sigma cards
function AdvancedSVG() {
  return (
    <svg viewBox="0 0 300 140" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Card 1 — sigma */}
      <rect x={20} y={20} width={110} height={100} rx={16} fill="rgba(22,163,74,0.06)" stroke="#16A34A" strokeWidth={2} />
      <text x={75} y={60} fontSize={28} fill="#16A34A" fontWeight={700} textAnchor="middle" fontFamily="serif">{"σ"}</text>
      <text x={75} y={85} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">סטיית תקן</text>
      <text x={75} y={105} fontSize={14} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>

      {/* Arrow */}
      <line x1={140} y1={70} x2={160} y2={70} stroke="#f59e0b" strokeWidth={2} markerEnd="url(#arrowhead)" />
      <defs>
        <marker id="arrowhead" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
        </marker>
      </defs>

      {/* Card 2 — sigma squared */}
      <rect x={170} y={20} width={110} height={100} rx={16} fill="rgba(167,139,250,0.06)" stroke="#a78bfa" strokeWidth={2} />
      <text x={225} y={60} fontSize={28} fill="#a78bfa" fontWeight={700} textAnchor="middle" fontFamily="serif">{"σ\u00B2"}</text>
      <text x={225} y={85} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">שונות</text>
      <text x={225} y={105} fontSize={14} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>
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
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(6,78,59,0.1)" : "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(52,211,153,0.25)" : "rgba(139,38,53,0.25)"}`, color: passed ? "#6ee7b7" : "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
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

// ─── Ladder Advanced ──────────────────────────────────────────────────────────

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
        subjectWords={["טווח", "סטיית תקן", "שונות", "פיזור", "σ", "Var"]}
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
    title: "טווח ואחידות — שתי כיתות",
    problem: "בכיתה א׳ ובכיתה ב׳ אותו ממוצע ציונים: 80.\nכיתה א׳: 78, 79, 80, 81, 82\nכיתה ב׳: 60, 70, 80, 90, 100\n\nא. מצא את הציון המרבי והציון המינימלי בכל כיתה.\nב. חשב את הטווח (max − min) לכל כיתה.\nג. באיזו כיתה הציונים אחידים יותר? מדוע הממוצע לבדו אינו מספיק?\nד. בונוס: אם כולם מקבלים +5 נקודות, האם הטווח משתנה?",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ טעות נפוצה — בלבול בין ממוצע לטווח", text: "תלמידים רבים מניחים שאם הממוצע שווה, הנתונים דומים. הממוצע לא מגלה כלום על פיזור! שתי כיתות עם ממוצע 80 יכולות להיות שונות לחלוטין." },
      { title: "⚠️ הזזת כל הנתונים לא משנה טווח", text: "כשמוסיפים קבוע לכל ערך, המקסימום והמינימום עולים באותו שיעור — ולכן הפרשם נשאר זהה. חשוב על הטווח כ-\"מרחק\" בין הקצוות." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י' ומצרף/ת שאלה בסטטיסטיקה על טווח ופיזור. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "מציאת מקסימום ומינימום", coaching: "", prompt: "תסביר לי כיצד נמצא את הציון הגבוה ביותר והנמוך ביותר בכל כיתה.", keywords: [], keywordHint: "", contextWords: ["מקסימום", "מינימום", "גבוה", "נמוך", "ערך"] },
      { phase: "סעיף ב׳", label: "חישוב טווח", coaching: "", prompt: "מצאנו את הערכים הקיצוניים. כיצד נחשב את הטווח של כל כיתה?", keywords: [], keywordHint: "", contextWords: ["טווח", "הפרש", "חיסור", "מקסימום", "מינימום"] },
      { phase: "סעיף ג׳", label: "השוואת אחידות", coaching: "", prompt: "תכווין אותי להבין למה ממוצע שווה לא אומר שהנתונים דומים.", keywords: [], keywordHint: "", contextWords: ["אחיד", "פיזור", "ממוצע", "טווח", "שונה"] },
      { phase: "סעיף ד׳", label: "בונוס — הוספת קבוע", coaching: "", prompt: "מה קורה לטווח כשמוסיפים 5 נקודות לכל תלמיד?", keywords: [], keywordHint: "", contextWords: ["קבוע", "הזזה", "טווח", "משתנה", "נשאר"] },
    ],
  },
  {
    id: "medium",
    title: "סטיית תקן — חישוב שלב אחר שלב",
    problem: "נתונות שתי כיתות:\nכיתה א׳: 78, 79, 80, 81, 82\nכיתה ב׳: 60, 70, 80, 90, 100\n\nא. ודא ששני הממוצעים שווים ל-80.\nב. חשב את סטיית התקן של כיתה א׳ (שלב אחר שלב: סטייה מהממוצע → ריבוע → ממוצע ריבועים → שורש).\nג. חשב את סטיית התקן של כיתה ב׳ והשווה.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ לא לשכוח לרבע את הסטיות", text: "טעות נפוצה: לסכום את הסטיות (xi − x̄) בלי לרבע. הסטיות השליליות מבטלות את החיוביות ומקבלים 0! הריבוע מוודא שכל הפרש תורם חיובית." },
      { title: "⚠️ לחלק ב-n ולא ב-(n-1)", text: "בכיתה י׳ משתמשים בנוסחה עם n במכנה (סטיית תקן אוכלוסייה). לא לבלבל עם n-1 שמופיע בסטיית מדגם." },
    ],
    goldenPrompt: `אני בכיתה י', מצרף לך תרגיל בסטטיסטיקה בנושא סטיית תקן.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על השלבים: סטייה, ריבוע, ממוצע ושורש.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "אימות ממוצע", coaching: "", prompt: "תסביר לי כיצד נוודא שהממוצע של שתי הכיתות הוא 80.", keywords: [], keywordHint: "", contextWords: ["ממוצע", "סכום", "חלקי", "n", "שווה"] },
      { phase: "סעיף ב׳", label: "סטיית תקן כיתה א׳", coaching: "", prompt: "תדריך אותי לחשב את σ של כיתה א׳ שלב אחר שלב.", keywords: [], keywordHint: "", contextWords: ["σ", "סטייה", "ריבוע", "שורש", "הפרש", "שונות"] },
      { phase: "סעיף ג׳", label: "השוואת σ בין הכיתות", coaching: "", prompt: "חישבתי את σ של כיתה א׳. תכווין אותי לחשב גם את כיתה ב׳ ולהשוות.", keywords: [], keywordHint: "", contextWords: ["σ", "השוואה", "פיזור", "גדול", "קטן", "סטייה"] },
    ],
  },
  {
    id: "advanced",
    title: "שונות וטרנספורמציה — Var(aX+b)",
    problem: "נתונות שתי כיתות:\nכיתה א׳: 78, 79, 80, 81, 82\nכיתה ב׳: 60, 70, 80, 90, 100\n\nא. חשב את השונות (Var = σ²) של כל כיתה.\nב. מוסיפים בונוס של 10 נקודות לכל תלמיד בכיתה ב׳. מה קורה ל-σ ול-Var?\nג. הסבר: Var(X+b) = Var(X) ו-Var(aX) = a²·Var(X).",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ שונות ≠ סטיית תקן", text: "תלמידים מבלבלים בין Var (σ²) לבין σ. השונות היא ריבוע סטיית התקן — שימו לב ליחידות: אם הנתונים בנקודות, השונות ב\"נקודות בריבוע\"." },
      { title: "⚠️ הוספת קבוע לא משנה שונות", text: "Var(X+b) = Var(X). הוספת קבוע מזיזה את כל הנתונים באותו כיוון, כך שהפיזור לא משתנה. אבל כפל בקבוע a כן משנה: Var(aX) = a² · Var(X)." },
    ],
    goldenPrompt: "\n\n",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד מחשבים שונות ומה קורה כשמבצעים טרנספורמציה על הנתונים? מתי σ משתנה ומתי לא? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "חישוב שונות", coaching: "", prompt: "תסביר לי כיצד עוברים מ-σ ל-Var ומחשבים את השונות של כל כיתה.", keywords: [], keywordHint: "", contextWords: ["שונות", "Var", "σ", "ריבוע", "ממוצע", "סטייה"] },
      { phase: "סעיף ב׳", label: "הוספת קבוע — מה משתנה?", coaching: "", prompt: "הוסיפו 10 נקודות לכל תלמיד. תדריך אותי — האם σ ו-Var משתנים?", keywords: [], keywordHint: "", contextWords: ["קבוע", "הזזה", "Var", "σ", "משתנה", "נשאר"] },
      { phase: "סעיף ג׳", label: "כלל הטרנספורמציה", coaching: "", prompt: "תסביר לי את הכלל: Var(X+b)=Var(X) ו-Var(aX)=a²·Var(X). למה זה עובד ככה?", keywords: [], keywordHint: "", contextWords: ["טרנספורמציה", "כפל", "ריבוע", "Var", "a²", "קבוע"] },
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

      {/* Properties box — Statistics Dispersion card */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem 1.5rem", marginBottom: "2rem", boxShadow: s.glowShadow }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📊 מדדי פיזור (Dispersion Measures)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            מדדי פיזור מגלים עד כמה הנתונים מרוחקים מהממוצע. ממוצע שווה לא אומר התפלגות דומה!
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: טווח */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📏 טווח (Range)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>R = max − min</span>
              <span>ההפרש בין הערך הגבוה לנמוך ביותר.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>פשוט אך מוגבל</span>
              <span>רגיש לערכים חריגים — מתעלם מכל הנתונים &quot;באמצע&quot;.</span>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />

        {/* Category: סטיית תקן */}
        {ex.id !== "basic" && (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>✨ סטיית תקן (Standard Deviation)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>σ</span>
                  <span>מודד את הפיזור הממוצע של כל ערך מהממוצע.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>4 שלבים</span>
                  <span>סטייה → ריבוע → ממוצע ריבועים → שורש.</span>
                </div>
              </div>
            </div>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
          </>
        )}

        {/* Category: שונות — advanced only */}
        {ex.id === "advanced" && (
          <div style={{ borderRadius: 12, background: `rgba(${s.glowRgb},0.07)`, border: `1px solid rgba(${s.glowRgb},0.25)`, padding: "10px 14px" }}>
            <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>🔬 שונות וטרנספורמציה (Variance &amp; Transformation)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>Var = σ²</span>
                <span>השונות היא ריבוע סטיית התקן.</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>Var(X+b) = Var(X)</span>
                <span>הוספת קבוע לא משנה את הפיזור.</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>{"Var(aX) = a²·Var(X)"}</span>
                <span>כפל בקבוע — השונות מוכפלת ב-a².</span>
              </div>
            </div>
          </div>
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

// ─── DispersionLab (basic) ───────────────────────────────────────────────────

function DispersionLab() {
  const [spread, setSpread] = useState(50);
  const [bonus, setBonus] = useState(0);
  const st = STATION.basic;

  const mean = 80 + bonus;
  const halfRange = (spread / 100) * 20;
  const dots = [-2, -1, 0, 1, 2].map(i => mean + i * (halfRange / 2));
  const range = dots.length > 0 ? Math.max(...dots) - Math.min(...dots) : 0;
  const isUniform = range < 5;

  const lineX = 40, lineW = 200, cy = 60;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת טווח ופיזור</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה את רמת הפיזור וראה כיצד הנקודות מתפזרות. נסה להוסיף בונוס — האם הטווח משתנה?</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>רמת פיזור <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 600 }}>(%)</span></span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{spread}%</span>
          </div>
          <input type="range" min={0} max={100} step={1} value={spread} onChange={(e) => setSpread(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>בונוס <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 600 }}>(+נק׳)</span></span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>+{bonus}</span>
          </div>
          <input type="range" min={0} max={20} step={1} value={bonus} onChange={(e) => setBonus(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* Uniform banner */}
      {isUniform && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ borderRadius: 12, background: "rgba(0,212,255,0.08)", border: "2px solid rgba(0,212,255,0.5)", padding: "10px 16px", marginBottom: "1.5rem", textAlign: "center", color: "#00d4ff", fontWeight: 700, fontSize: 14 }}>
          ⭐ פיזור נמוך מאוד — הנתונים כמעט אחידים!
        </motion.div>
      )}

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 280 120" className="w-full max-w-sm mx-auto" aria-hidden>
          <line x1={lineX} y1={cy} x2={lineX + lineW} y2={cy} stroke="#94a3b8" strokeWidth={1.5} />
          {/* Mean line */}
          <line x1={lineX + lineW / 2} y1={cy - 22} x2={lineX + lineW / 2} y2={cy + 22} stroke="#f59e0b" strokeWidth={1.8} strokeDasharray="4,3" />
          {/* Dots */}
          {dots.map((v, i) => {
            const t = (v - (mean - 20)) / 40;
            const x = lineX + t * lineW;
            return <circle key={i} cx={Math.max(lineX, Math.min(lineX + lineW, x))} cy={cy} r={6} fill={st.accentColor} opacity={0.8} />;
          })}
          {/* Range bar */}
          {dots.length > 0 && (() => {
            const minV = Math.min(...dots), maxV = Math.max(...dots);
            const tMin = (minV - (mean - 20)) / 40, tMax = (maxV - (mean - 20)) / 40;
            const x1 = lineX + Math.max(0, tMin) * lineW, x2 = lineX + Math.min(1, tMax) * lineW;
            return (
              <>
                <line x1={x1} y1={cy + 30} x2={x2} y2={cy + 30} stroke={st.accentColor} strokeWidth={2.5} />
                <line x1={x1} y1={cy + 26} x2={x1} y2={cy + 34} stroke={st.accentColor} strokeWidth={1.5} />
                <line x1={x2} y1={cy + 26} x2={x2} y2={cy + 34} stroke={st.accentColor} strokeWidth={1.5} />
              </>
            );
          })()}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "ממוצע", val: mean.toFixed(0) },
          { label: "טווח", val: range.toFixed(1) },
          { label: "מינימום", val: dots.length > 0 ? Math.min(...dots).toFixed(1) : "—" },
          { label: "אחידות", val: isUniform ? "גבוהה" : "נמוכה" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── SigmaLab (medium) ──────────────────────────────────────────────────────

function SigmaLab() {
  const [vals, setVals] = useState([78, 79, 80, 81, 82]);
  const st = STATION.medium;

  const n = vals.length;
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const deviations = vals.map(v => v - mean);
  const squaredDevs = deviations.map(d => d * d);
  const variance = squaredDevs.reduce((a, b) => a + b, 0) / n;
  const sigma = Math.sqrt(variance);

  const updateVal = (i: number, v: number) => {
    setVals(prev => { const next = [...prev]; next[i] = v; return next; });
  };

  // SVG deviation bars
  const svgW = 280, svgH = 160, pad = 40;
  const barW = (svgW - 2 * pad) / n;
  const maxDev = Math.max(...deviations.map(Math.abs), 1);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת סטיית תקן</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה את ערכי הנתונים וראה כיצד הסטיות מהממוצע משתנות בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        {vals.map((v, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>x{i + 1}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{v}</span>
            </div>
            <input type="range" min={50} max={100} step={1} value={v} onChange={(e) => updateVal(i, +e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* Deviation bars SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-sm mx-auto" aria-hidden>
          {/* Mean line */}
          <line x1={pad} y1={svgH / 2} x2={svgW - pad} y2={svgH / 2} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
          {/* Deviation bars */}
          {deviations.map((d, i) => {
            const x = pad + i * barW + barW / 2;
            const barH = (Math.abs(d) / maxDev) * (svgH / 2 - 15);
            const y = d >= 0 ? svgH / 2 - barH : svgH / 2;
            const color = d >= 0 ? "#16A34A" : "#dc2626";
            return (
              <g key={i}>
                <rect x={x - barW * 0.3} y={y} width={barW * 0.6} height={barH} fill={color} opacity={0.6} rx={3} />
                <text x={x} y={svgH / 2 + (d >= 0 ? 14 : -6)} fontSize={9} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">x{i + 1}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Result tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "ממוצע (x̄)", val: mean.toFixed(1) },
          { label: "σ", val: sigma.toFixed(2) },
          { label: "Var (σ²)", val: variance.toFixed(2) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── TransformLab (advanced) ─────────────────────────────────────────────────

function TransformLab() {
  const [addC, setAddC] = useState(0);
  const [mulA, setMulA] = useState(1);
  const st = STATION.advanced;

  const original = [60, 70, 80, 90, 100];
  const transformed = original.map(v => mulA * v + addC);

  const mean0 = original.reduce((a, b) => a + b, 0) / original.length;
  const var0 = original.reduce((a, b) => a + (b - mean0) ** 2, 0) / original.length;
  const sigma0 = Math.sqrt(var0);

  const meanT = transformed.reduce((a, b) => a + b, 0) / transformed.length;
  const varT = transformed.reduce((a, b) => a + (b - meanT) ** 2, 0) / transformed.length;
  const sigmaT = Math.sqrt(varT);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת טרנספורמציה</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה את הקבוע (b) והמכפיל (a) וראה כיצד σ ו-Var מגיבים. שים לב: הוספה לא משנה פיזור, כפל כן!</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>הוספת קבוע <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 600 }}>(+b)</span></span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>+{addC}</span>
          </div>
          <input type="range" min={0} max={20} step={1} value={addC} onChange={(e) => setAddC(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>מכפיל <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 600 }}>(a)</span></span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>x{mulA}</span>
          </div>
          <input type="range" min={1} max={5} step={0.5} value={mulA} onChange={(e) => setMulA(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* Transformation rule */}
      {mulA !== 1 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ borderRadius: 12, background: "rgba(220,38,38,0.06)", border: "2px solid rgba(220,38,38,0.3)", padding: "10px 16px", marginBottom: "1.5rem", textAlign: "center", color: "#dc2626", fontWeight: 700, fontSize: 14 }}>
          {"Var(aX) = a\u00B2 \u00B7 Var(X)"} → שונות הוכפלה ב-{(mulA * mulA).toFixed(1)}!
        </motion.div>
      )}

      {/* SVG — two dot plots side by side */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 300 130" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Original */}
          <text x={150} y={18} fontSize={10} fill="#64748b" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">מקורי</text>
          <line x1={30} y1={40} x2={270} y2={40} stroke="#94a3b8" strokeWidth={1} />
          {original.map((v, i) => {
            const t = (v - 50) / 60;
            return <circle key={`o${i}`} cx={30 + t * 240} cy={40} r={5} fill="#64748b" opacity={0.6} />;
          })}
          <line x1={30 + ((mean0 - 50) / 60) * 240} y1={30} x2={30 + ((mean0 - 50) / 60) * 240} y2={50} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3,2" />

          {/* Transformed */}
          <text x={150} y={78} fontSize={10} fill={st.accentColor} fontWeight={600} textAnchor="middle" fontFamily="sans-serif">{"aX + b"}</text>
          <line x1={30} y1={100} x2={270} y2={100} stroke="#94a3b8" strokeWidth={1} />
          {(() => {
            const allVals = transformed;
            const lo = Math.min(...allVals, 50), hi = Math.max(...allVals, 110);
            const range2 = hi - lo || 1;
            return allVals.map((v, i) => {
              const t = (v - lo) / range2;
              return <circle key={`t${i}`} cx={30 + t * 240} cy={100} r={5} fill={st.accentColor} opacity={0.7} />;
            });
          })()}
          {(() => {
            const allVals = transformed;
            const lo = Math.min(...allVals, 50), hi = Math.max(...allVals, 110);
            const range2 = hi - lo || 1;
            const t = (meanT - lo) / range2;
            return <line x1={30 + t * 240} y1={90} x2={30 + t * 240} y2={110} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3,2" />;
          })()}
        </svg>
      </div>

      {/* Result tiles — original vs transformed */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center", marginBottom: 16 }}>
        {[
          { label: "σ מקורי", val: sigma0.toFixed(2) },
          { label: "Var מקורי", val: var0.toFixed(1) },
          { label: "ממוצע מקורי", val: mean0.toFixed(1) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.3)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: "#64748b", fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "σ (aX+b)", val: sigmaT.toFixed(2) },
          { label: "Var (aX+b)", val: varT.toFixed(1) },
          { label: "ממוצע (aX+b)", val: meanT.toFixed(1) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
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
  const [activeTab, setActiveTab] = useState<"range" | "sigma" | "variance" | null>(null);

  const tabs = [
    { id: "range" as const, label: "📏 טווח", tex: "R", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "sigma" as const, label: "📊 סטיית תקן", tex: "\\sigma", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "variance" as const, label: "📐 שונות", tex: "\\sigma^2", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: Range */}
      {activeTab === "range" && (
        <motion.div key="range" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"R = x_{\\max} - x_{\\min}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מחשבים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מצאו את הערך הגדול ביותר (<InlineMath>{"x_{\\max}"}</InlineMath>).</li>
                  <li>מצאו את הערך הקטן ביותר (<InlineMath>{"x_{\\min}"}</InlineMath>).</li>
                  <li>חסרו: <InlineMath>{"R = x_{\\max} - x_{\\min}"}</InlineMath></li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: ציונים 60, 70, 80, 90, 100 → טווח = 100 − 60 = 40
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Sigma */}
      {activeTab === "sigma" && (
        <motion.div key="sigma" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\sigma = \\sqrt{\\frac{\\sum(x_i - \\bar{x})^2}{n}}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מחשבים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>חשבו ממוצע (<InlineMath>{"\\bar{x}"}</InlineMath>).</li>
                  <li>חסרו כל ערך מהממוצע (<InlineMath>{"x_i - \\bar{x}"}</InlineMath>).</li>
                  <li>העלו כל הפרש בריבוע.</li>
                  <li>חשבו ממוצע הריבועים, ואז שורש.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: ציונים 78,79,80,81,82 (ממוצע=80)<br/>
                הפרשים: −2,−1,0,1,2 → ריבועים: 4,1,0,1,4 → σ = √(10/5) ≈ 1.41
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Variance */}
      {activeTab === "variance" && (
        <motion.div key="variance" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\sigma^2 = \\frac{\\sum(x_i - \\bar{x})^2}{n}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מה הקשר ל-σ?</strong>
                <p dir="rtl" style={{ margin: "6px 0 0" }}>שונות = σ². זה אותו חישוב כמו סטיית תקן — רק בלי השורש בסוף.</p>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: אם σ ≈ 1.41, אז σ² = 2<br/>
                💡 חוקי טרנספורמציה: Var(X+b) = Var(X), אבל Var(aX) = a²·Var(X)
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DispersionPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "163,79,38" : "139,38,53";

  return (
    <main
      style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties}
      dir="rtl"
    >
      {/* ── Global focus/hover border overrides ── */}
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
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>טווח ופיזור עם AI — כיתה י׳</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>טווח, סטיית תקן, שונות וטרנספורמציות — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          {/* Back button */}
          <Link
            href="/topic/grade10/statistics"
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
        <SubtopicProgress subtopicId="grade10/statistics/dispersion" />

        {/* Formula Bar */}
        <FormulaBar />

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

        {/* Lab — each level gets its own lab */}
        {selectedLevel === "basic" && <DispersionLab />}
        {selectedLevel === "medium" && <SigmaLab />}
        {selectedLevel === "advanced" && <TransformLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="grade10/statistics/dispersion" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
