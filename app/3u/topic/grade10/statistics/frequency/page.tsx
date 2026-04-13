"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
/* LabMessage and useDefaultToast available if needed */
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
  // Tally marks grouped in fives — NO numbers
  const groups = [
    { x: 30, count: 4 },
    { x: 80, count: 5 },
    { x: 140, count: 3 },
    { x: 200, count: 5 },
    { x: 260, count: 2 },
  ];
  return (
    <svg viewBox="0 0 320 120" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Table lines */}
      <line x1={15} y1={25} x2={305} y2={25} stroke="#94a3b8" strokeWidth={1} />
      <line x1={15} y1={55} x2={305} y2={55} stroke="#94a3b8" strokeWidth={1} />
      <line x1={15} y1={95} x2={305} y2={95} stroke="#94a3b8" strokeWidth={1} />
      {/* Column headers: ? marks */}
      {groups.map((g, i) => (
        <text key={`h${i}`} x={g.x + 15} y={18} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>
      ))}
      {/* Tally marks per group */}
      {groups.map((g, gi) => {
        const marks = [];
        for (let j = 0; j < g.count; j++) {
          const mx = g.x + j * 8;
          marks.push(
            <line key={`t${gi}-${j}`} x1={mx} y1={35} x2={mx} y2={50} stroke="#16A34A" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
          );
        }
        // Diagonal crossing for groups of 5
        if (g.count === 5) {
          marks.push(
            <line key={`d${gi}`} x1={g.x - 2} y1={50} x2={g.x + 34} y2={35} stroke="#16A34A" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
          );
        }
        return <g key={gi}>{marks}</g>;
      })}
      {/* Frequency row: ? marks */}
      {groups.map((g, i) => (
        <text key={`f${i}`} x={g.x + 15} y={80} fontSize={12} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>
      ))}
    </svg>
  );
}

function MediumSVG() {
  // Pie chart outline with "?" in each slice — NO numbers
  const cx = 130, cy = 70, r = 55;
  const slices = [0.3, 0.25, 0.2, 0.15, 0.1];
  const colors = ["#EA580C", "#f59e0b", "#34d399", "#a78bfa", "#64748b"];
  let cumAngle = -Math.PI / 2;

  return (
    <svg viewBox="0 0 260 150" className="w-full max-w-sm mx-auto" aria-hidden>
      {slices.map((frac, i) => {
        const startAngle = cumAngle;
        const endAngle = cumAngle + frac * 2 * Math.PI;
        cumAngle = endAngle;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const largeArc = frac > 0.5 ? 1 : 0;
        const midAngle = (startAngle + endAngle) / 2;
        const labelR = r * 0.6;
        const lx = cx + labelR * Math.cos(midAngle);
        const ly = cy + labelR * Math.sin(midAngle);
        return (
          <g key={i}>
            <path
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={colors[i]} opacity={0.25} stroke="#94a3b8" strokeWidth={1.5}
            />
            <text x={lx} y={ly + 4} fontSize={13} fill="#64748b" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>?</text>
          </g>
        );
      })}
    </svg>
  );
}

function AdvancedSVG() {
  // Ogive (cumulative frequency curve) outline — NO numbers
  const pad = 30, w = 280, h = 130;
  const points = [
    { x: pad, y: h - 10 },
    { x: pad + 50, y: h - 25 },
    { x: pad + 100, y: h - 50 },
    { x: pad + 150, y: h - 80 },
    { x: pad + 200, y: h - 100 },
    { x: pad + 240, y: h - 108 },
  ];
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w + 20} ${h + 20}`} className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={pad} y1={h - 5} x2={w - 10} y2={h - 5} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={pad} y1={10} x2={pad} y2={h - 5} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Ogive curve */}
      <path d={pathD} fill="none" stroke="#DC2626" strokeWidth={2.5} opacity={0.6} strokeLinecap="round" strokeLinejoin="round" />
      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#DC2626" opacity={0.7} />
      ))}
      {/* ? labels on X axis */}
      {points.map((p, i) => (
        <text key={`l${i}`} x={p.x} y={h + 10} fontSize={10} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>
      ))}
      {/* Median line (dashed, horizontal) */}
      <line x1={pad} y1={h - 55} x2={pad + 130} y2={h - 55} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.6} />
      <line x1={pad + 130} y1={h - 55} x2={pad + 130} y2={h - 5} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.6} />
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
        subjectWords={["שכיחות", "טבלה", "מצטברת", "חציון", "יחסית", "קבוצה"]}
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
    title: "בניית טבלת שכיחויות",
    problem: "נתונים מידות נעליים של 20 תלמידים בכיתה:\n38, 40, 42, 39, 40, 41, 38, 42, 40, 39, 41, 40, 38, 42, 40, 39, 41, 40, 42, 38\n\nא. בנו טבלת שכיחויות (ערך | סימוני ספירה | שכיחות).\nב. איזה ערך בעל השכיחות הגבוהה ביותר? (= השכיח)\nג. כמה נתונים בסך הכל? ודאו שסכום השכיחויות = 20.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "ספירה שגויה של סימוני ספירה", text: "כשמסמנים סימוני ספירה (tally marks), חובה לספור בקבוצות של 5: ארבעה קווים אנכיים וקו אלכסוני חוצה. טעות נפוצה היא לספור 6 במקום 5 או לשכוח את הקו האלכסוני." },
      { title: "שכחת ערך שמופיע פעם אחת", text: "כשעוברים על הנתונים, קל לפספס ערך שמופיע רק פעם אחת. תמיד כדאי לרשום קודם את כל הערכים השונים ורק אז לספור." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י', 3 יחידות, ומצרף/ת שאלה בסטטיסטיקה על בניית טבלת שכיחויות. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "בניית טבלת שכיחויות", coaching: "", prompt: "נתונים: מידות נעליים של 20 תלמידים: 38, 40, 42, 39, 40, 41, 38, 42, 40, 39, 41, 40, 38, 42, 40, 39, 41, 40, 42, 38. תנחה אותי לבנות טבלה עם שלוש עמודות: ערך, סימוני ספירה ושכיחות.", keywords: [], keywordHint: "", contextWords: ["טבלה", "שכיחות", "ספירה", "ערך", "עמודה", "סימון"] },
      { phase: "סעיף ב׳", label: "מציאת השכיח", coaching: "", prompt: "נתונים: מידות נעליים של 20 תלמידים: 38, 40, 42, 39, 40, 41, 38, 42, 40, 39, 41, 40, 38, 42, 40, 39, 41, 40, 42, 38. תכווין אותי למצוא את הערך עם השכיחות הגבוהה ביותר בטבלה שבניתי.", keywords: [], keywordHint: "", contextWords: ["שכיח", "שכיחות", "גבוהה", "ערך", "מופיע", "פעמים"] },
      { phase: "סעיף ג׳", label: "סכום השכיחויות", coaching: "", prompt: "נתונים: מידות נעליים של 20 תלמידים: 38, 40, 42, 39, 40, 41, 38, 42, 40, 39, 41, 40, 38, 42, 40, 39, 41, 40, 42, 38. תסביר לי למה חשוב לוודא שסכום כל השכיחויות שווה למספר הנתונים הכולל (20).", keywords: [], keywordHint: "", contextWords: ["סכום", "שכיחויות", "כולל", "20", "בדיקה", "סך"] },
    ],
  },
  {
    id: "medium",
    title: "שכיחות יחסית",
    problem: "בסקר צבע אהוב בכיתה של 30 תלמידים, נתונה טבלת שכיחויות:\nכחול — 9, אדום — 6, ירוק — 8, צהוב — 4, סגול — 3\n\nא. חשבו שכיחות יחסית לכל צבע (שכיחות ÷ סך הנתונים).\nב. המירו לאחוזים.\nג. איזה צבע הכי פופולרי ואיזה הכי פחות? מה ההפרש באחוזים?",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "חילוק בסך הכל שגוי", text: "שכיחות יחסית = שכיחות ÷ סך כל הנתונים. טעות נפוצה: חילוק במספר הקטגוריות (5) במקום בכמות הנתונים (30). תמיד חלקו בסה\"כ!" },
      { title: "אחוזים שלא מסתכמים ל-100%", text: "אם סכום כל האחוזים לא שווה בדיוק ל-100%, כנראה יש טעות עיגול או חילוק. בדקו שכל שכיחות יחסית חוברה נכון ושהכל מסתכם ל-1 (או 100%)." },
    ],
    goldenPrompt: `אני בכיתה י', 3 יחידות, מצרף/ת תרגיל בסטטיסטיקה בנושא שכיחות יחסית ואחוזים. יש לי טבלת שכיחויות של צבעים אהובים בכיתה של 30 תלמידים.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על חילוק בסך הכל, המרה לאחוזים, והשוואה בין קטגוריות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "שכיחות יחסית", coaching: "", prompt: "נתונים: כחול 9, אדום 6, ירוק 8, צהוב 4, סגול 3. סך הכל 30 תלמידים. תנחה אותי לחשב שכיחות יחסית לכל צבע — שכיחות חלקי סך הכל.", keywords: [], keywordHint: "", contextWords: ["שכיחות יחסית", "חלקי", "סך", "30", "צבע", "חילוק"] },
      { phase: "סעיף ב׳", label: "המרה לאחוזים", coaching: "", prompt: "נתונים: כחול 9, אדום 6, ירוק 8, צהוב 4, סגול 3. סך הכל 30. תדריך אותי להמיר שכיחות יחסית לאחוזים — כפל ב-100.", keywords: [], keywordHint: "", contextWords: ["אחוזים", "כפל", "100", "המרה", "יחסית", "סכום"] },
      { phase: "סעיף ג׳", label: "השוואת קטגוריות", coaching: "", prompt: "נתונים: כחול 9, אדום 6, ירוק 8, צהוב 4, סגול 3. סך הכל 30. תכווין אותי למצוא את הצבע הפופולרי ביותר והכי פחות פופולרי, ולחשב הפרש באחוזים.", keywords: [], keywordHint: "", contextWords: ["פופולרי", "הפרש", "אחוזים", "השוואה", "גבוה", "נמוך"] },
    ],
  },
  {
    id: "advanced",
    title: "שכיחות מצטברת וחציון",
    problem: "נתונה טבלת שכיחויות של ציוני מבחן (בקבוצות):\n50-60: שכיחות 4\n60-70: שכיחות 7\n70-80: שכיחות 12\n80-90: שכיחות 5\n90-100: שכיחות 2\n\nא. הוסיפו עמודת שכיחות מצטברת.\nב. מצאו את קבוצת החציון בעזרת השכיחות המצטברת.\nג. אמדו את הממוצע מנתונים מקובצים (אמצע קבוצה × שכיחות).\nד. תארו כיצד נראה תרשים שכיחות מצטברת (אוג׳יב) — האם העקומה תלולה או מתונה?",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "חישוב שגוי של שכיחות מצטברת", text: "שכיחות מצטברת בנויה כסכום מצטבר: כל שורה = השכיחות שלה + כל מה שלפניה. טעות נפוצה: לחבר רק את השורה הנוכחית עם הקודמת במקום עם כל מה שהצטבר עד כה." },
      { title: "שימוש בגבולות הקבוצה במקום באמצע", text: "לחישוב ממוצע מנתונים מקובצים, חובה להשתמש באמצע הקבוצה (למשל: 55 עבור הקבוצה 50-60), לא בגבול התחתון או העליון." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד בונים שכיחות מצטברת, ואיך משתמשים בה כדי למצוא את קבוצת החציון? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "שכיחות מצטברת", coaching: "", prompt: "נתונים: ציוני מבחן בקבוצות — 50-60: 4, 60-70: 7, 70-80: 12, 80-90: 5, 90-100: 2. תנחה אותי לבנות עמודת שכיחות מצטברת — סכום מצטבר של השכיחויות.", keywords: [], keywordHint: "", contextWords: ["מצטברת", "סכום", "מצטבר", "שכיחות", "עמודה", "טבלה"] },
      { phase: "סעיף ב׳", label: "קבוצת החציון", coaching: "", prompt: "נתונים: 30 ציונים בקבוצות. שכיחות מצטברת שחישבתי. תדריך אותי למצוא את קבוצת החציון — הקבוצה שבה השכיחות המצטברת עוברת את n/2.", keywords: [], keywordHint: "", contextWords: ["חציון", "קבוצה", "מצטברת", "n/2", "עוברת", "מיקום"] },
      { phase: "סעיף ג׳", label: "ממוצע מנתונים מקובצים", coaching: "", prompt: "נתונים: 50-60: 4, 60-70: 7, 70-80: 12, 80-90: 5, 90-100: 2. תכווין אותי לאמוד ממוצע — אמצע כל קבוצה כפול השכיחות, סכום חלקי n.", keywords: [], keywordHint: "", contextWords: ["ממוצע", "אמצע", "קבוצה", "כפול", "שכיחות", "מקובצים"] },
      { phase: "סעיף ד׳", label: "תרשים אוג׳יב", coaching: "", prompt: "על סמך טבלת השכיחות המצטברת, תסביר לי איך נראה תרשים אוג׳יב — האם העקומה תלולה או מתונה? מה זה אומר על התפלגות הציונים?", keywords: [], keywordHint: "", contextWords: ["אוג׳יב", "עקומה", "תרשים", "תלולה", "התפלגות", "מצטברת"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📊 טבלת שכיחויות (Frequency Table)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "ארגון נתונים גולמיים לטבלת שכיחויות — ספירה, סימוני ספירה, ומציאת השכיח."}
            {ex.id === "medium" && "שכיחות יחסית — חילוק שכיחות בסך הכל, המרה לאחוזים, והשוואה בין קטגוריות."}
            {ex.id === "advanced" && "שכיחות מצטברת — סכום מצטבר, מציאת קבוצת חציון, אומדן ממוצע מנתונים מקובצים, ותרשים אוג׳יב."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: שכיחויות */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>סוגי שכיחות</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>שכיחות</span>
              <span>מספר הפעמים שערך מסוים מופיע בנתונים.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>שכיחות יחסית</span>
              <span>שכיחות חלקי סך כל הנתונים (שבר/עשרוני).</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>שכיחות מצטברת</span>
              <span>סכום כל השכיחויות עד הערך/קבוצה הנוכחית.</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>כללים חשובים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>סכום יחסיות</span>
                  <span>סכום כל השכיחויות היחסיות חייב להיות 1 (או 100%).</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>סכום שכיחויות</span>
                  <span>סכום כל השכיחויות = מספר הנתונים הכולל (N).</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>נתונים מקובצים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>אמצע קבוצה</span>
                  <span>(גבול עליון + גבול תחתון) / 2</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>קבוצת חציון</span>
                  <span>הקבוצה שבה השכיחות המצטברת עוברת את N/2.</span>
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

// ─── TallyLab (basic) — 5 sliders ──────────────────────────────────────────

function TallyLab() {
  const sizes = [38, 39, 40, 41, 42];
  const [freqs, setFreqs] = useState([4, 3, 6, 3, 4]);
  const st = STATION.basic;

  const total = freqs.reduce((a, b) => a + b, 0);
  const maxFreq = Math.max(...freqs);
  const modeIdx = freqs.indexOf(maxFreq);
  const modeSize = sizes[modeIdx];

  const updateFreq = (i: number, v: number) => {
    setFreqs(prev => { const next = [...prev]; next[i] = v; return next; });
  };

  // Bar chart SVG
  const pad = 35, barW = 36, gap = 12;
  const svgW = pad * 2 + sizes.length * (barW + gap);
  const maxH = 100;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת סימוני ספירה ותרשים עמודות</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את השכיחות של כל מידת נעל וצפו בסימוני הספירה ותרשים העמודות משתנים בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {sizes.map((size, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>מידה {size}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{freqs[i]}</span>
            </div>
            <input type="range" min={0} max={15} step={1} value={freqs[i]} onChange={(e) => updateFreq(i, +e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
            {/* Tally marks display */}
            <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap", minHeight: 18 }}>
              {Array.from({ length: Math.floor(freqs[i] / 5) }).map((_, g) => (
                <span key={`g${g}`} style={{ fontSize: 14, color: st.accentColor, fontWeight: 700 }}>卌</span>
              ))}
              {Array.from({ length: freqs[i] % 5 }).map((_, j) => (
                <span key={`s${j}`} style={{ fontSize: 14, color: st.accentColor }}>|</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* SVG bar chart */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} 150`} className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={pad} y1={120} x2={svgW - pad} y2={120} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={pad} y1={15} x2={pad} y2={120} stroke="#94a3b8" strokeWidth={1.5} />
          {freqs.map((f, i) => {
            const x = pad + i * (barW + gap) + gap / 2;
            const barH = maxFreq > 0 ? (f / Math.max(maxFreq, 1)) * maxH : 0;
            const isMode = f === maxFreq && f > 0;
            return (
              <g key={i}>
                <rect x={x} y={120 - barH} width={barW} height={barH} rx={4} fill={isMode ? "#f59e0b" : st.accentColor} opacity={isMode ? 0.75 : 0.55} />
                <text x={x + barW / 2} y={135} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">{sizes[i]}</text>
                {f > 0 && <text x={x + barW / 2} y={120 - barH - 5} fontSize={10} fill="#1A1A1A" textAnchor="middle" fontFamily="monospace" fontWeight={700}>{f}</text>}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "סך הכל (N)", val: total.toString() },
          { label: "שכיח (Mode)", val: maxFreq > 0 ? modeSize.toString() : "---" },
          { label: "שכיחות השכיח", val: maxFreq.toString() },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>העמודה הצהובה = השכיח (הערך עם השכיחות הגבוהה ביותר). שנו שכיחויות וצפו מי הופך לשכיח!</p>
    </section>
  );
}

// ─── RelativeFreqLab (medium) — 4 sliders ──────────────────────────────────

function RelativeFreqLab() {
  const colors = ["כחול", "אדום", "ירוק", "צהוב"];
  const colorHex = ["#3b82f6", "#ef4444", "#22c55e", "#eab308"];
  const [freqs, setFreqs] = useState([9, 6, 8, 4]);
  const st = STATION.medium;

  const total = freqs.reduce((a, b) => a + b, 0);
  const relFreqs = freqs.map(f => total > 0 ? f / total : 0);
  const percents = relFreqs.map(r => r * 100);
  const maxPct = Math.max(...percents);
  const minPct = Math.min(...percents);

  const updateFreq = (i: number, v: number) => {
    setFreqs(prev => { const next = [...prev]; next[i] = v; return next; });
  };

  // Pie chart
  const cx = 120, cy = 80, r = 60;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת שכיחות יחסית ותרשים עוגה</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את השכיחות של כל צבע וצפו בתרשים העוגה ובאחוזים משתנים בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {colors.map((color, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: colorHex[i], display: "inline-block" }} />
                {color}
              </span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{freqs[i]}</span>
            </div>
            <input type="range" min={0} max={20} step={1} value={freqs[i]} onChange={(e) => updateFreq(i, +e.target.value)} style={{ width: "100%", accentColor: colorHex[i] }} />
            <div style={{ fontSize: 11, color: "#6B7280", textAlign: "center", marginTop: 4 }}>
              {total > 0 ? `${percents[i].toFixed(1)}%` : "---"}
            </div>
          </div>
        ))}
      </div>

      {/* SVG pie chart */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 240 170" className="w-full max-w-sm mx-auto" aria-hidden>
          {total > 0 ? (() => {
            let cumAngle = -Math.PI / 2;
            return relFreqs.map((frac, i) => {
              if (frac === 0) return null;
              const startAngle = cumAngle;
              const endAngle = cumAngle + frac * 2 * Math.PI;
              cumAngle = endAngle;
              const x1 = cx + r * Math.cos(startAngle);
              const y1 = cy + r * Math.sin(startAngle);
              const x2 = cx + r * Math.cos(endAngle);
              const y2 = cy + r * Math.sin(endAngle);
              const largeArc = frac > 0.5 ? 1 : 0;
              const midAngle = (startAngle + endAngle) / 2;
              const labelR = r * 0.65;
              const lx = cx + labelR * Math.cos(midAngle);
              const ly = cy + labelR * Math.sin(midAngle);
              return (
                <g key={i}>
                  <path
                    d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={colorHex[i]} opacity={0.65} stroke="white" strokeWidth={2}
                  />
                  {frac > 0.04 && (
                    <text x={lx} y={ly + 4} fontSize={10} fill="white" textAnchor="middle" fontFamily="monospace" fontWeight={700}>
                      {percents[i].toFixed(0)}%
                    </text>
                  )}
                </g>
              );
            });
          })() : (
            <text x={cx} y={cy} fontSize={14} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">אין נתונים</text>
          )}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "סך הכל (N)", val: total.toString() },
          { label: "אחוז גבוה ביותר", val: total > 0 ? `${maxPct.toFixed(1)}%` : "---" },
          { label: "אחוז נמוך ביותר", val: total > 0 ? `${minPct.toFixed(1)}%` : "---" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>כל האחוזים חייבים להסתכם ל-100%! שנו שכיחויות וודאו שהעוגה תמיד שלמה.</p>
    </section>
  );
}

// ─── CumulativeLab (advanced) — 5 sliders ──────────────────────────────────

function CumulativeLab() {
  const groups = ["50-60", "60-70", "70-80", "80-90", "90-100"];
  const midpoints = [55, 65, 75, 85, 95];
  const [freqs, setFreqs] = useState([4, 7, 12, 5, 2]);
  const st = STATION.advanced;

  const total = freqs.reduce((a, b) => a + b, 0);
  const cumFreqs = freqs.reduce<number[]>((acc, f) => {
    acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + f);
    return acc;
  }, []);

  // Find median group
  const halfN = total / 2;
  const medianGroupIdx = cumFreqs.findIndex(cf => cf >= halfN);
  const medianGroup = medianGroupIdx >= 0 ? groups[medianGroupIdx] : "---";

  // Estimated mean
  const weightedSum = freqs.reduce((sum, f, i) => sum + f * midpoints[i], 0);
  const estimatedMean = total > 0 ? weightedSum / total : 0;

  const updateFreq = (i: number, v: number) => {
    setFreqs(prev => { const next = [...prev]; next[i] = v; return next; });
  };

  // Ogive SVG
  const pad = 40, plotW = 230, plotH = 110;
  const maxCum = Math.max(...cumFreqs, 1);
  const ogivePoints = cumFreqs.map((cf, i) => ({
    x: pad + ((i + 1) / groups.length) * plotW,
    y: 10 + plotH - (cf / maxCum) * plotH,
  }));
  const startPoint = { x: pad, y: 10 + plotH };
  const allPts = [startPoint, ...ogivePoints];
  const pathD = allPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת שכיחות מצטברת ואוג׳יב</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את השכיחויות וצפו בטבלה המצטברת, עקומת האוג׳יב, וקבוצת החציון משתנות בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: "1.5rem" }}>
        {groups.map((grp, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6B7280", marginBottom: 4 }}>
              <span>{grp}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{freqs[i]}</span>
            </div>
            <input type="range" min={0} max={20} step={1} value={freqs[i]} onChange={(e) => updateFreq(i, +e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* Cumulative frequency table */}
      <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.75)", padding: "1rem", marginBottom: "1.5rem", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ padding: "6px 8px", textAlign: "center", borderBottom: "1px solid rgba(60,54,42,0.15)", color: "#6B7280", fontWeight: 700 }}>קבוצה</th>
              <th style={{ padding: "6px 8px", textAlign: "center", borderBottom: "1px solid rgba(60,54,42,0.15)", color: "#6B7280", fontWeight: 700 }}>שכיחות</th>
              <th style={{ padding: "6px 8px", textAlign: "center", borderBottom: "1px solid rgba(60,54,42,0.15)", color: st.accentColor, fontWeight: 700 }}>שכיחות מצטברת</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((grp, i) => (
              <tr key={i} style={{ background: medianGroupIdx === i ? "rgba(220,38,38,0.06)" : "transparent" }}>
                <td style={{ padding: "6px 8px", textAlign: "center", borderBottom: "1px solid rgba(60,54,42,0.08)", color: "#2D3436", fontWeight: medianGroupIdx === i ? 700 : 400 }}>{grp}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", borderBottom: "1px solid rgba(60,54,42,0.08)", color: "#2D3436", fontFamily: "monospace" }}>{freqs[i]}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", borderBottom: "1px solid rgba(60,54,42,0.08)", color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{cumFreqs[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SVG Ogive */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${pad + plotW + 20} ${plotH + 40}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Axes */}
          <line x1={pad} y1={plotH + 10} x2={pad + plotW + 5} y2={plotH + 10} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={pad} y1={5} x2={pad} y2={plotH + 10} stroke="#94a3b8" strokeWidth={1.5} />
          {/* N/2 line */}
          {total > 0 && (() => {
            const halfY = 10 + plotH - (halfN / maxCum) * plotH;
            return (
              <line x1={pad} y1={halfY} x2={pad + plotW} y2={halfY} stroke="#a78bfa" strokeWidth={1.2} strokeDasharray="4,3" opacity={0.6} />
            );
          })()}
          {/* Ogive path */}
          <path d={pathD} fill="none" stroke={st.accentColor} strokeWidth={2.5} opacity={0.7} strokeLinecap="round" strokeLinejoin="round" />
          {/* Points */}
          {allPts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={i === 0 ? "#94a3b8" : st.accentColor} opacity={0.8} />
          ))}
          {/* X-axis labels */}
          {groups.map((grp, i) => {
            const x = pad + ((i + 1) / groups.length) * plotW;
            return <text key={i} x={x} y={plotH + 25} fontSize={9} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">{grp.split("-")[1]}</text>;
          })}
          <text x={pad} y={plotH + 25} fontSize={9} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">50</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "סך הכל (N)", val: total.toString() },
          { label: "קבוצת חציון", val: medianGroup },
          { label: "ממוצע משוער", val: total > 0 ? estimatedMean.toFixed(1) : "---" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>הקו הסגול המקווקו = N/2. קבוצת החציון (מודגשת) היא הראשונה שעוברת קו זה. שנו שכיחויות וצפו!</p>
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
  const [activeTab, setActiveTab] = useState<"freq" | "relFreq" | "cumFreq" | null>(null);

  const tabs = [
    { id: "freq" as const, label: "שכיחות", tex: "f", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "relFreq" as const, label: "שכיחות יחסית", tex: "f_{rel}", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "cumFreq" as const, label: "שכיחות מצטברת", tex: "F", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: Frequency */}
      {activeTab === "freq" && (
        <motion.div key="freq" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"f = \\text{count of each value}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מהי שכיחות?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>עוברים על כל הנתונים הגולמיים.</li>
                  <li>סופרים כמה פעמים כל ערך מופיע.</li>
                  <li>סכום כל השכיחויות = מספר הנתונים הכולל (<InlineMath>{"N"}</InlineMath>).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                {`דוגמה: נתונים 3, 5, 3, 7, 5, 5. שכיחות 3 = 2, שכיחות 5 = 3, שכיחות 7 = 1. סה"כ = 6.`}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Relative Frequency */}
      {activeTab === "relFreq" && (
        <motion.div key="relFreq" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"f_{rel} = \\frac{f}{N}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מהי שכיחות יחסית?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מחלקים את שכיחות הערך בסך כל הנתונים (<InlineMath>{"N"}</InlineMath>).</li>
                  <li>התוצאה: מספר בין 0 ל-1 (או אחוז בין 0% ל-100%).</li>
                  <li>סכום כל השכיחויות היחסיות = 1 (או 100%).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: שכיחות כחול = 9, סך הכל = 30. שכיחות יחסית = 9/30 = 0.3 = 30%.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Cumulative Frequency */}
      {activeTab === "cumFreq" && (
        <motion.div key="cumFreq" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"F_k = \\sum_{i=1}^{k} f_i"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מהי שכיחות מצטברת?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>סכום מצטבר (running sum) של השכיחויות מהקבוצה הראשונה ועד הנוכחית.</li>
                  <li>השכיחות המצטברת האחרונה = <InlineMath>{"N"}</InlineMath> (סך כל הנתונים).</li>
                  <li><strong>קבוצת החציון:</strong> הקבוצה הראשונה שבה <InlineMath>{"F_k \\geq N/2"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: שכיחויות 4, 7, 12, 5, 2. מצטברות: 4, 11, 23, 28, 30. N/2 = 15, קבוצת חציון = השלישית (70-80).
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FrequencyTablePage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>טבלת שכיחויות עם AI — כיתה י׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>שכיחות, שכיחות יחסית, שכיחות מצטברת — ואיך לשאול AI את השאלות הנכונות</p>
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

        <SubtopicProgress subtopicId="3u/grade10/statistics/frequency" />

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
        {selectedLevel === "basic" && <TallyLab />}
        {selectedLevel === "medium" && <RelativeFreqLab />}
        {selectedLevel === "advanced" && <CumulativeLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade10/statistics/frequency" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
