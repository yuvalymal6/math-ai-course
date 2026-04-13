"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle2, Lock, Sparkles } from "lucide-react";
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
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",   glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700",  glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",     glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderRgb: "139,38,53" },
} as const;

const TABS = [
  { id: "basic" as const,    label: "מתחיל",  textColor: "text-green-700",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium" as const,   label: "בינוני", textColor: "text-orange-700",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced" as const, label: "מתקדם",  textColor: "text-red-700",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

// ─── SVG diagrams (silent -- no numbers, no answers) ──────────────────────────

function BasicBarChartDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>דיאגרמת עמודות -- ללא ערכים</p>
      <svg width="100%" viewBox="0 0 280 160" style={{ maxWidth: "100%" }}>
        {/* Y-axis */}
        <line x1={50} y1={15} x2={50} y2={130} stroke="#94a3b8" strokeWidth={1.5} />
        <polygon points="50,12 47,20 53,20" fill="#94a3b8" />
        {/* X-axis */}
        <line x1={50} y1={130} x2={260} y2={130} stroke="#94a3b8" strokeWidth={1.5} />
        {/* Bars -- different heights, no numbers */}
        <rect x={70}  y={35}  width={35} height={95} rx={4} fill="rgba(22,163,74,0.6)" />
        <rect x={120} y={55}  width={35} height={75} rx={4} fill="rgba(22,163,74,0.45)" />
        <rect x={170} y={85}  width={35} height={45} rx={4} fill="rgba(22,163,74,0.35)" />
        <rect x={220} y={70}  width={35} height={60} rx={4} fill="rgba(22,163,74,0.5)" />
        {/* Category labels */}
        <text x={87}  y={148} textAnchor="middle" fill="#16a34a" fontSize={11} fontWeight={600}>א</text>
        <text x={137} y={148} textAnchor="middle" fill="#16a34a" fontSize={11} fontWeight={600}>ב</text>
        <text x={187} y={148} textAnchor="middle" fill="#16a34a" fontSize={11} fontWeight={600}>ג</text>
        <text x={237} y={148} textAnchor="middle" fill="#16a34a" fontSize={11} fontWeight={600}>ד</text>
      </svg>
    </div>
  );
}

function MediumPieChartDiagram() {
  // 4 slices of different sizes, no percentages
  const cx = 140, cy = 80, r = 60;
  // Angles: roughly 120, 90, 80, 70 degrees
  const slices = [
    { start: 0, end: 120, color: "rgba(234,88,12,0.55)" },
    { start: 120, end: 210, color: "rgba(234,88,12,0.4)" },
    { start: 210, end: 290, color: "rgba(234,88,12,0.3)" },
    { start: 290, end: 360, color: "rgba(234,88,12,0.2)" },
  ];
  const labels = [
    { angle: 60, label: "A" },
    { angle: 165, label: "B" },
    { angle: 250, label: "C" },
    { angle: 325, label: "D" },
  ];

  function polarToCart(angleDeg: number, radius: number) {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>דיאגרמת עוגה -- ללא אחוזים</p>
      <svg width="100%" viewBox="0 0 280 170" style={{ maxWidth: "100%" }}>
        {slices.map((s, i) => {
          const start = polarToCart(s.start, r);
          const end = polarToCart(s.end, r);
          const largeArc = (s.end - s.start) > 180 ? 1 : 0;
          const d = `M${cx},${cy} L${start.x},${start.y} A${r},${r} 0 ${largeArc},1 ${end.x},${end.y} Z`;
          return <path key={i} d={d} fill={s.color} stroke="#fff" strokeWidth={2} />;
        })}
        {labels.map((l, i) => {
          const pos = polarToCart(l.angle, r + 14);
          return <text key={i} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central" fill="#ea580c" fontSize={12} fontWeight={700}>{l.label}</text>;
        })}
      </svg>
    </div>
  );
}

function AdvancedDoubleBarDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>דיאגרמת עמודות כפולה -- ללא ערכים</p>
      <svg width="100%" viewBox="0 0 300 170" style={{ maxWidth: "100%" }}>
        {/* Y-axis */}
        <line x1={50} y1={15} x2={50} y2={130} stroke="#94a3b8" strokeWidth={1.5} />
        <polygon points="50,12 47,20 53,20" fill="#94a3b8" />
        {/* X-axis */}
        <line x1={50} y1={130} x2={280} y2={130} stroke="#94a3b8" strokeWidth={1.5} />
        {/* Group 1 */}
        <rect x={65}  y={90}  width={22} height={40} rx={3} fill="rgba(220,38,38,0.55)" />
        <rect x={89}  y={75}  width={22} height={55} rx={3} fill="rgba(100,116,139,0.45)" />
        {/* Group 2 */}
        <rect x={135} y={50}  width={22} height={80} rx={3} fill="rgba(220,38,38,0.55)" />
        <rect x={159} y={40}  width={22} height={90} rx={3} fill="rgba(100,116,139,0.45)" />
        {/* Group 3 */}
        <rect x={205} y={55}  width={22} height={75} rx={3} fill="rgba(220,38,38,0.55)" />
        <rect x={229} y={85}  width={22} height={45} rx={3} fill="rgba(100,116,139,0.45)" />
        {/* Category labels */}
        <text x={98}  y={148} textAnchor="middle" fill="#dc2626" fontSize={10} fontWeight={600}>0-59</text>
        <text x={168} y={148} textAnchor="middle" fill="#dc2626" fontSize={10} fontWeight={600}>60-79</text>
        <text x={238} y={148} textAnchor="middle" fill="#dc2626" fontSize={10} fontWeight={600}>80-100</text>
        {/* Legend */}
        <rect x={60} y={158} width={10} height={8} rx={2} fill="rgba(220,38,38,0.55)" />
        <text x={74} y={165} fill="#64748b" fontSize={9}>י1</text>
        <rect x={100} y={158} width={10} height={8} rx={2} fill="rgba(100,116,139,0.45)" />
        <text x={114} y={165} fill="#64748b" fontSize={9}>י2</text>
      </svg>
    </div>
  );
}

// ─── Prompt Coach Atoms ───────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט", accentRgb = "22,163,74" }: { text: string; label?: string; accentRgb?: string }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.8)", border: `1.5px solid rgba(${accentRgb},0.4)`, color: `rgb(${accentRgb})`, fontSize: 12, fontWeight: 600, transition: "all 0.2s" }}
    >
      {c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}
    </button>
  );
}

function GoldenPromptCard({ prompt, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { prompt: string; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>&#10024;</span>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>פרומפט ראשי</span>
      </div>
      <p style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p>
      <CopyBtn text={prompt} label="העתק פרומפט מלא" accentRgb={glowRgb} />
    </div>
  );
}

function TutorStepBasic({ step, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(${glowRgb},0.45)`, marginBottom: 8, boxShadow: `0 0 14px rgba(${glowRgb},0.18)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>&#9997;&#65039; הפרומפט המוכן</div>
          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div>
        </div>
        <CopyBtn text={step.prompt} label="העתק פרומפט ממוקד" accentRgb={glowRgb} />
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
      setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי -- כתוב לפחות 20 תווים." });
      return;
    }
    const res = calculatePromptScore(text, step.contextWords ?? []);
    setResult(res);
    if (!res.blocked && res.score >= 75) onPass?.();
  };

  if (locked) return (
    <div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.6)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}>
      <Lock size={14} color="#6B7280" />
      <div>
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span>
      </div>
    </div>
  );

  const scoreBarColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8, boxShadow: passed ? "0 0 16px rgba(22,163,74,0.15)" : "none", transition: "border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(22,163,74,0.3)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl" disabled={passed}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {result && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", marginBottom: 4, fontWeight: 600 }}>
              <span>ציון הפרומפט</span>
              <span style={{ fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}

        {!result && (
          <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>
            &#129302; בדיקת AI מדומה
          </button>
        )}

        {result && result.blocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            &#9888;&#65039; {result.hint}
          </motion.div>
        )}

        {result && !result.blocked && result.score < 75 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            &#128161; {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
              &#9989; פרומפט מצוין! ציון: <strong>{result!.score}/100</strong>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}
            </button>
          </motion.div>
        )}

        {result && !passed && (
          <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#6B7280", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>
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

  if (locked) return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.6)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <Lock size={14} color="#6B7280" /><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} -- {step.label}</span>
    </div>
  );

  const validate = () => {
    if (text.trim().length < 20) {
      setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי -- כתוב לפחות 20 תווים." });
      return;
    }
    const r = calculatePromptScore(text, step.contextWords ?? []);
    setResult(r);
    if (!r.blocked && r.score >= 90 && onPass) onPass();
  };

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)"}`, marginBottom: 8, transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}` }}>
        {passed
          ? <CheckCircle2 size={14} color="#16a34a" />
          : <span style={{ color: "#dc2626", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>

      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl"
          readOnly={passed}
          onChange={(e) => { if (!passed) { setText(e.target.value); setResult(null); } }}
          placeholder="כתוב את הפרומפט שלך לסעיף זה..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}>
              <span>ציון</span>
              <span style={{ fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}

        {result && !passed && result.hint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.6, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>
            {result.blocked ? "\u26A0\uFE0F" : "\uD83D\uDCA1"} {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>&#9989; ניסוח מעולה! הסעיף הבא נפתח.</div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ניסוח"}
            </button>
          </motion.div>
        )}

        {!passed && (
          <button onClick={validate}
            style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: "1px solid rgba(220,38,38,0.35)", color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>
            &#129302; בדיקת AI מדומה
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Ladders ──────────────────────────────────────────────────────────────────

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
      <GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />
      {steps.map((s, i) => (
        <div key={i} id={`basic-step-${i}`}>
          {i < unlocked ? (
            <>
              <TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />
              {!completed[i] ? (
                <button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>
                  &#10003; סיימתי סעיף זה
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>&#9989; הושלם</div>
              )}
            </>
          ) : (
            <div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}>
              <div style={{ position: "absolute", top: 8, right: 8, fontSize: 16, zIndex: 2 }}><Lock size={14} color="#6B7280" /></div>
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
  const [passed, setPassed] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlockedIdx = masterPassed ? (passed.findIndex(p => !p) === -1 ? steps.length : passed.findIndex(p => !p)) : -1;

  return (
    <div>
      <MasterPromptGate
        onPass={() => setMasterPassed(true)}
        accentColor="#991b1b"
        accentRgb="153,27,27"
        requiredPhrase="סרוק נתונים ועצור"
        subjectWords={["דיאגרמה", "שכיחות", "עמודות", "השוואה", "אחוזים", "יחסית"]}
      />
      {steps.map((s, i) => (
        <TutorStepAdvanced
          key={i} step={s}
          locked={!masterPassed || i > unlockedIdx}
          onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })}
        />
      ))}
    </div>
  );
}

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
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", boxShadow: s.glowShadow }}>

      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.15)", marginBottom: "2rem" }} />

      {/* Diagram */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>

      {/* Problem */}
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.6)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>&#128221; השאלה</div>
          <button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.15)" : "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)", color: copiedProblem ? "#16a34a" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}
            {copiedProblem ? "הועתק!" : "העתק"}
          </button>
        </div>
        <pre style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>

      {/* Pitfalls */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#dc2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>&#9888;&#65039; שגיאות נפוצות</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.25)", background: "rgba(254,226,226,0.25)", padding: "0.85rem 1rem", marginBottom: 8 }}>
            <div style={{ color: "#b91c1c", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
            {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
          </div>
        ))}
      </div>

      {/* Prompt Ladder */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.7)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>&#129504; מדריך הפרומפטים</div>
        {ex.id === "basic"    && <LadderBase   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
      </div>

      {/* Advanced gate -- outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}

    </section>
  );
}

// ─── Formula Bar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"relative" | "percent" | "angle" | "mean" | null>(null);

  const tabs = [
    { id: "relative" as const, label: "שכיחות יחסית", tex: "f_i = \\frac{n_i}{N}",           color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "percent" as const,  label: "אחוזים",        tex: "\\%_i = f_i \\times 100",       color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "angle" as const,    label: "זווית במעגל",    tex: "\\theta_i = f_i \\times 360^\\circ", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "mean" as const,     label: "ממוצע",          tex: "\\bar{x} = \\frac{\\sum x_i}{N}", color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
  ];

  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>

      <div style={{ display: "flex", gap: 6, marginBottom: activeTab ? 14 : 0 }}>
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(isActive ? null : t.id)}
              style={{
                flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
                border: `1.5px solid ${isActive ? t.borderColor : "rgba(60,54,42,0.15)"}`,
                background: isActive ? `${t.color}15` : "rgba(255,255,255,0.5)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
              <span style={{ color: isActive ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span>
            </button>
          );
        })}
      </div>

      {/* Expanded: Relative Frequency */}
      {activeTab === "relative" && (
        <motion.div key="relative" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"f_i = \\frac{n_i}{N}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> חלק כל ערך במספר הכולל של התצפיות.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"n_i"}</InlineMath> = מספר התצפיות בקטגוריה <InlineMath>{"i"}</InlineMath>.</li>
                  <li><InlineMath>{"N"}</InlineMath> = סך כל התצפיות.</li>
                  <li>סכום כל השכיחויות היחסיות = 1.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: 12 תלמידים מתוך 30 בחרו כלב &rarr; <InlineMath>{"f = \\frac{12}{30} = 0.4"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Percent */}
      {activeTab === "percent" && (
        <motion.div key="percent" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\%_i = f_i \\times 100"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> שכיחות יחסית כפול 100 נותנת אחוזים.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>קודם חשבו את השכיחות היחסית <InlineMath>{"f_i"}</InlineMath>.</li>
                  <li>הכפילו ב-100 לקבלת אחוזים.</li>
                  <li>סכום כל האחוזים = 100%.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: <InlineMath>{"f = 0.4"}</InlineMath> &rarr; <InlineMath>{"0.4 \\times 100 = 40\\%"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Angle */}
      {activeTab === "angle" && (
        <motion.div key="angle" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\theta_i = f_i \\times 360^\\circ"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> הזווית של כל פרוסה בדיאגרמת עוגה.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>חשבו את השכיחות היחסית <InlineMath>{"f_i"}</InlineMath>.</li>
                  <li>הכפילו ב-<InlineMath>{"360^\\circ"}</InlineMath> לקבלת הזווית.</li>
                  <li>סכום כל הזוויות = <InlineMath>{"360^\\circ"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: <InlineMath>{"f = 0.4"}</InlineMath> &rarr; <InlineMath>{"0.4 \\times 360 = 144^\\circ"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Mean */}
      {activeTab === "mean" && (
        <motion.div key="mean" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\bar{x} = \\frac{\\sum x_i}{N}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> סכום כל הערכים חלקי מספרם.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>סכמו את כל הערכים <InlineMath>{"\\sum x_i"}</InlineMath>.</li>
                  <li>חלקו ב-<InlineMath>{"N"}</InlineMath> (מספר התצפיות).</li>
                  <li>הממוצע מושפע מערכים קיצוניים.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: ערכים 4, 8, 12 &rarr; <InlineMath>{"\\bar{x} = \\frac{4+8+12}{3} = 8"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Exercise data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "קריאת דיאגרמת עמודות",
    problem: "בסקר נשאלו תלמידים מהי החיה האהובה עליהם. התוצאות מוצגות בדיאגרמת עמודות.\nהקטגוריות: כלב, חתול, דג, ציפור.\nהנתונים: כלב \u2014 12, חתול \u2014 8, דג \u2014 4, ציפור \u2014 6.\n\nא. כמה תלמידים השתתפו בסקר?\nב. מהי השכיחות היחסית של \"כלב\"?\nג. כמה אחוזים בחרו \"חתול\"?",
    diagram: <BasicBarChartDiagram />,
    pitfalls: [
      { title: "סך התלמידים = סכום כל העמודות", text: "סך התלמידים = סכום כל העמודות, לא רק הגבוהה ביותר." },
      { title: "שכיחות יחסית -- בין 0 ל-1", text: "שכיחות יחסית = מספר התלמידים שבחרו חלקי סך הכל -- התוצאה בין 0 ל-1." },
      { title: "אחוזים = שכיחות יחסית \u00D7 100", text: "אחוזים = שכיחות יחסית \u00D7 100 -- אל תשכחו לכפול ב-100." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nבסקר נשאלו תלמידים מהי החיה האהובה עליהם.\nכלב \u2014 12, חתול \u2014 8, דג \u2014 4, ציפור \u2014 6.\nאני צריך:\n1. לחשב כמה תלמידים השתתפו בסקר\n2. לחשב שכיחות יחסית של \"כלב\"\n3. לחשב כמה אחוזים בחרו \"חתול\"\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "סעיף א\u2019 -- סך המשתתפים",
        coaching: "סכום כל העמודות",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nבסקר חיות אהובות: כלב \u2014 12, חתול \u2014 8, דג \u2014 4, ציפור \u2014 6. תנחה אותי לחשב כמה תלמידים השתתפו בסקר. שאל: מה עושים עם כל העמודות? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["סקר", "עמודות", "סכום"],
        keywordHint: "ציין שצריך לסכום את כל העמודות",
        contextWords: ["דיאגרמה", "עמודות", "שכיחות", "יחסית", "אחוזים", "סקר"],
        stationWords: ["דיאגרמה", "עמודות", "סקר"],
      },
      {
        phase: "ב",
        label: "סעיף ב\u2019 -- שכיחות יחסית",
        coaching: "חלק את מספר הכלבים בסך הכל",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nבסקר חיות אהובות: כלב \u2014 12, סך הכל 30 תלמידים. תנחה אותי לחשב שכיחות יחסית של \"כלב\". שאל: מה הנוסחה? מה המונה? מה המכנה? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["שכיחות", "יחסית", "חלקי"],
        keywordHint: "ציין שמדובר בשכיחות יחסית",
        contextWords: ["דיאגרמה", "עמודות", "שכיחות", "יחסית", "אחוזים", "סקר"],
        stationWords: ["דיאגרמה", "עמודות", "סקר"],
      },
      {
        phase: "ג",
        label: "סעיף ג\u2019 -- אחוזים",
        coaching: "שכיחות יחסית כפול 100",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nבסקר חיות אהובות: חתול \u2014 8, סך הכל 30 תלמידים. תנחה אותי לחשב כמה אחוזים בחרו \"חתול\". שאל: מה הקשר בין שכיחות יחסית לאחוזים? במה מכפילים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["אחוזים", "שכיחות", "כפול"],
        keywordHint: "ציין שצריך להמיר לאחוזים",
        contextWords: ["דיאגרמה", "עמודות", "שכיחות", "יחסית", "אחוזים", "סקר"],
        stationWords: ["דיאגרמה", "עמודות", "סקר"],
      },
    ],
  },
  {
    id: "medium",
    title: "בניית דיאגרמת עוגה מנתונים",
    problem: "בכיתה יש 40 תלמידים. התפלגות אמצעי ההגעה לבית הספר:\nאוטובוס \u2014 16, רגלית \u2014 10, אופניים \u2014 8, רכב פרטי \u2014 6.\n\nא. חשבו את השכיחות היחסית של כל אמצעי הגעה.\nב. חשבו את הזווית שכל פרוסה תופסת בדיאגרמת עוגה.\nג. אם תלמיד חדש מצטרף ומגיע באוטובוס \u2014 מה הזווית החדשה של \"אוטובוס\"?\nד. האם דיאגרמת עוגה או עמודות מתאימה יותר להצגת הנתונים? נמקו.",
    diagram: <MediumPieChartDiagram />,
    pitfalls: [
      { title: "סכום זוויות = 360\u00B0", text: "סכום כל הזוויות חייב להיות 360\u00B0 -- אם לא יוצא, טעיתם בחישוב." },
      { title: "תלמיד חדש = N חדש", text: "כשמוסיפים תלמיד: N משתנה ל-41! צריך לחשב מחדש את כל השכיחויות." },
      { title: "עוגה מול עמודות", text: "עוגה טובה להשוואת חלקים מהשלם, עמודות טובות להשוואת גדלים -- אין תשובה אחת נכונה." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nבכיתה 40 תלמידים. אמצעי הגעה: אוטובוס \u2014 16, רגלית \u2014 10, אופניים \u2014 8, רכב פרטי \u2014 6.\nאני צריך:\n1. לחשב שכיחות יחסית לכל אמצעי\n2. לחשב זוויות לדיאגרמת עוגה\n3. לחשב זווית חדשה כשמוסיפים תלמיד\n4. להשוות בין סוגי דיאגרמות\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "סעיף א\u2019 -- שכיחות יחסית",
        coaching: "חלקו כל ערך ב-40",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\n40 תלמידים, אוטובוס \u2014 16, רגלית \u2014 10, אופניים \u2014 8, רכב פרטי \u2014 6. תנחה אותי לחשב שכיחות יחסית לכל אמצעי. שאל: מה הנוסחה? מה הסכום אמור להיות? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["שכיחות", "יחסית", "חלקי"],
        keywordHint: "ציין שצריך לחשב שכיחות יחסית",
        contextWords: ["עוגה", "זווית", "שכיחות יחסית", "פרוסה", "360", "אמצעי הגעה"],
        stationWords: ["עוגה", "זווית", "שכיחות יחסית"],
      },
      {
        phase: "ב",
        label: "סעיף ב\u2019 -- זוויות לדיאגרמת עוגה",
        coaching: "שכיחות יחסית כפול 360",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nחישבתי שכיחויות יחסיות לאמצעי הגעה. תנחה אותי לחשב את הזווית של כל פרוסה בדיאגרמת עוגה. שאל: במה מכפילים את השכיחות היחסית? מה הסכום אמור להיות? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["זווית", "עוגה", "360"],
        keywordHint: "ציין שצריך לחשב זוויות לעוגה",
        contextWords: ["עוגה", "זווית", "שכיחות יחסית", "פרוסה", "360", "אמצעי הגעה"],
        stationWords: ["עוגה", "זווית", "שכיחות יחסית"],
      },
      {
        phase: "ג",
        label: "סעיף ג\u2019 -- תלמיד חדש",
        coaching: "N משתנה! חשבו מחדש",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nתלמיד חדש מצטרף ומגיע באוטובוס. עכשיו יש 41 תלמידים ו-17 באוטובוס. תנחה אותי לחשב את הזווית החדשה של אוטובוס. שאל: מה ה-N החדש? למה לא מספיק לשנות רק את אוטובוס? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["חדש", "זווית", "N"],
        keywordHint: "ציין שה-N משתנה",
        contextWords: ["עוגה", "זווית", "שכיחות יחסית", "פרוסה", "360", "אמצעי הגעה"],
        stationWords: ["עוגה", "זווית", "שכיחות יחסית"],
      },
      {
        phase: "ד",
        label: "סעיף ד\u2019 -- השוואת דיאגרמות",
        coaching: "חשבו מתי כל סוג יותר מתאים",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nנתוני אמצעי הגעה של 40 תלמידים. תנחה אותי להחליט: עוגה או עמודות? שאל: מה אנחנו רוצים להראות? חלקים מהשלם או השוואת גדלים? מתי כל דיאגרמה יותר מתאימה? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["עוגה", "עמודות", "השוואה"],
        keywordHint: "ציין שצריך להשוות סוגי דיאגרמות",
        contextWords: ["עוגה", "זווית", "שכיחות יחסית", "פרוסה", "360", "אמצעי הגעה"],
        stationWords: ["עוגה", "זווית", "שכיחות יחסית"],
      },
    ],
  },
  {
    id: "advanced",
    title: "השוואת נתונים בדיאגרמת עמודות כפולה",
    problem: "בשתי כיתות (י1 ו-י2) נבדקו ציוני מבחן. הנתונים מוצגים בדיאגרמת עמודות כפולה.\nטווחי ציונים: 0-59, 60-79, 80-100.\nכיתה י1: 5, 12, 13 תלמידים (בהתאמה).\nכיתה י2: 8, 15, 7 תלמידים (בהתאמה).\n\nא. כמה תלמידים בכל כיתה?\nב. באיזה טווח ציונים ההבדל בין הכיתות הכי גדול?\nג. חשבו את השכיחות היחסית של טווח 80-100 בכל כיתה. באיזו כיתה האחוז גבוה יותר?\nד. האם ניתן לומר שכיתה י1 \"טובה יותר\"? נמקו בעזרת הנתונים.",
    diagram: <AdvancedDoubleBarDiagram />,
    pitfalls: [
      { title: "השוואה בשכיחות יחסית, לא מוחלטת", text: "מספרי התלמידים שונים בין הכיתות -- צריך להשוות שכיחויות יחסיות, לא מוחלטות." },
      { title: "טווח 60-79: כמויות מול אחוזים", text: "בטווח 60-79 יש 12 מול 15, אבל בשכיחות יחסית: 12/30 = 40% מול 15/30 = 50%." },
      { title: "להשוואה הוגנת -- תמיד אחוזים", text: "להשוואה הוגנת בין קבוצות בגדלים שונים -- תמיד השתמשו באחוזים." },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "א",
        label: "סעיף א\u2019 -- סך תלמידים בכל כיתה",
        coaching: "סכמו את כל הטווחים בכל כיתה",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nכיתה י1: 5, 12, 13 בטווחים 0-59, 60-79, 80-100. כיתה י2: 8, 15, 7. תנחה אותי לחשב כמה תלמידים בכל כיתה. שאל: מה צריך לעשות עם הנתונים של כל כיתה? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["סכום", "כיתה", "תלמידים"],
        keywordHint: "ציין שצריך לסכום לכל כיתה",
        contextWords: ["עמודות כפולה", "השוואה", "שכיחות יחסית", "כיתות", "טווח", "ציונים"],
        stationWords: ["עמודות כפולה", "השוואה", "כיתות"],
      },
      {
        phase: "ב",
        label: "סעיף ב\u2019 -- טווח עם ההבדל הגדול ביותר",
        coaching: "חשבו את ההפרש בכל טווח",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nכיתה י1: 5, 12, 13. כיתה י2: 8, 15, 7. תנחה אותי למצוא באיזה טווח ציונים ההבדל בין הכיתות הכי גדול. שאל: איך מחשבים הפרש? באיזה טווח הוא הגדול ביותר? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["הבדל", "טווח", "הפרש"],
        keywordHint: "ציין שצריך למצוא את ההבדל הגדול ביותר",
        contextWords: ["עמודות כפולה", "השוואה", "שכיחות יחסית", "כיתות", "טווח", "ציונים"],
        stationWords: ["עמודות כפולה", "השוואה", "כיתות"],
      },
      {
        phase: "ג",
        label: "סעיף ג\u2019 -- שכיחות יחסית 80-100",
        coaching: "חלקו את מספר התלמידים בטווח 80-100 בסך הכל",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nכיתה י1: 13 מ-30 בטווח 80-100. כיתה י2: 7 מ-30 בטווח 80-100. תנחה אותי לחשב שכיחות יחסית של טווח 80-100 בכל כיתה ולהשוות. שאל: מה הנוסחה? באיזו כיתה האחוז גבוה יותר? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["שכיחות", "יחסית", "השוואה"],
        keywordHint: "ציין שצריך להשוות שכיחויות יחסיות",
        contextWords: ["עמודות כפולה", "השוואה", "שכיחות יחסית", "כיתות", "טווח", "ציונים"],
        stationWords: ["עמודות כפולה", "השוואה", "כיתות"],
      },
      {
        phase: "ד",
        label: "סעיף ד\u2019 -- האם כיתה י1 \"טובה יותר\"?",
        coaching: "נמקו בעזרת הנתונים מכל הטווחים",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nכיתה י1: 5, 12, 13. כיתה י2: 8, 15, 7. תנחה אותי לנמק האם כיתה י1 \"טובה יותר\". שאל: לפי איזה קריטריון משווים? מה אומרים האחוזים בכל טווח? האם מספיק להסתכל על טווח אחד? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["נימוק", "השוואה", "נתונים"],
        keywordHint: "ציין שצריך לנמק בעזרת נתונים",
        contextWords: ["עמודות כפולה", "השוואה", "שכיחות יחסית", "כיתות", "טווח", "ציונים"],
        stationWords: ["עמודות כפולה", "השוואה", "כיתות"],
      },
    ],
  },
];

// ─── Diagram Lab ─────────────────────────────────────────────────────────────

function DiagramLab() {
  const [valA, setValA] = useState(12);
  const [valB, setValB] = useState(8);
  const [valC, setValC] = useState(4);
  const [valD, setValD] = useState(6);
  const [mode, setMode] = useState<"bar" | "pie">("bar");

  const total = valA + valB + valC + valD;
  const freqs = [valA / total, valB / total, valC / total, valD / total];
  const angles = freqs.map(f => f * 360);
  const pcts = freqs.map(f => (f * 100).toFixed(1));
  const labels = ["A", "B", "C", "D"];
  const barColors = ["#16a34a", "#ea580c", "#dc2626", "#7c3aed"];

  const isDefault = valA === 12 && valB === 8 && valC === 4 && valD === 6;

  // Pie chart path helper
  function polarToCart(angleDeg: number, radius: number, cx: number, cy: number) {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function renderBarChart() {
    const maxVal = Math.max(valA, valB, valC, valD, 1);
    const barW = 40;
    const gap = 30;
    const chartH = 110;
    const baseY = 130;

    return (
      <svg width="100%" viewBox="0 0 300 165" style={{ maxWidth: "100%" }}>
        {/* Y-axis */}
        <line x1={50} y1={15} x2={50} y2={baseY} stroke="#94a3b8" strokeWidth={1.5} />
        <polygon points="50,12 47,20 53,20" fill="#94a3b8" />
        {/* X-axis */}
        <line x1={50} y1={baseY} x2={280} y2={baseY} stroke="#94a3b8" strokeWidth={1.5} />
        {/* Bars */}
        {[valA, valB, valC, valD].map((v, i) => {
          const h = (v / maxVal) * chartH;
          const x = 65 + i * (barW + gap);
          return (
            <g key={i}>
              <rect x={x} y={baseY - h} width={barW} height={h} rx={4} fill={barColors[i]} opacity={0.7} />
              <text x={x + barW / 2} y={baseY - h - 5} textAnchor="middle" fill={barColors[i]} fontSize={11} fontWeight={700}>{v}</text>
              <text x={x + barW / 2} y={baseY + 14} textAnchor="middle" fill="#64748b" fontSize={11} fontWeight={600}>{labels[i]}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  function renderPieChart() {
    const cx = 140, cy = 80, r = 60;
    let cumAngle = 0;
    const slices = angles.map((a, i) => {
      const start = cumAngle;
      cumAngle += a;
      return { start, end: cumAngle, color: barColors[i], label: labels[i] };
    });

    return (
      <svg width="100%" viewBox="0 0 280 170" style={{ maxWidth: "100%" }}>
        {slices.map((s, i) => {
          if (s.end - s.start < 0.5) return null;
          const startPt = polarToCart(s.start, r, cx, cy);
          const endPt = polarToCart(s.end, r, cx, cy);
          const largeArc = (s.end - s.start) > 180 ? 1 : 0;
          const d = `M${cx},${cy} L${startPt.x},${startPt.y} A${r},${r} 0 ${largeArc},1 ${endPt.x},${endPt.y} Z`;
          const midAngle = (s.start + s.end) / 2;
          const labelPt = polarToCart(midAngle, r + 16, cx, cy);
          return (
            <g key={i}>
              <path d={d} fill={s.color} opacity={0.7} stroke="#fff" strokeWidth={2} />
              <text x={labelPt.x} y={labelPt.y} textAnchor="middle" dominantBaseline="central" fill={s.color} fontSize={11} fontWeight={700}>
                {s.label} ({pcts[i]}%)
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; מעבדת דיאגרמות</h3>
        <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />N = {total}</span>
      </div>

      {/* Toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
        <button
          onClick={() => setMode("bar")}
          style={{ flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: mode === "bar" ? "2px solid #16a34a" : "1px solid rgba(60,54,42,0.15)", background: mode === "bar" ? "rgba(22,163,74,0.1)" : "rgba(255,255,255,0.5)", color: mode === "bar" ? "#16a34a" : "#6B7280", transition: "all 0.2s" }}
        >
          עמודות
        </button>
        <button
          onClick={() => setMode("pie")}
          style={{ flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: mode === "pie" ? "2px solid #ea580c" : "1px solid rgba(60,54,42,0.15)", background: mode === "pie" ? "rgba(234,88,12,0.1)" : "rgba(255,255,255,0.5)", color: mode === "pie" ? "#ea580c" : "#6B7280", transition: "all 0.2s" }}
        >
          עוגה
        </button>
      </div>

      {/* SVG Chart */}
      <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden", padding: 12, marginBottom: "1.25rem" }}>
        {mode === "bar" ? renderBarChart() : renderPieChart()}
      </div>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "1.25rem" }}>
        {[
          { label: "ערך A", val: valA, set: setValA, color: barColors[0] },
          { label: "ערך B", val: valB, set: setValB, color: barColors[1] },
          { label: "ערך C", val: valC, set: setValC, color: barColors[2] },
          { label: "ערך D", val: valD, set: setValD, color: barColors[3] },
        ].map((s, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: "#64748b" }}>{s.label}</span>
              <span style={{ fontFamily: "monospace", color: s.color, fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={1} max={30} step={1} value={s.val}
              onChange={e => s.set(parseInt(e.target.value))} className="w-full" style={{ accentColor: s.color }} />
          </div>
        ))}
      </div>

      {/* Data tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10, textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 10 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>N</p>
          <p style={{ fontFamily: "monospace", color: "#2D3436", fontWeight: 700 }}>{total}</p>
        </div>
        {labels.map((l, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 10 }}>
            <p style={{ color: "#94a3b8", marginBottom: 4 }}>f({l})</p>
            <p style={{ fontFamily: "monospace", color: barColors[i], fontWeight: 700 }}>{pcts[i]}%</p>
          </div>
        ))}
      </div>

      {mode === "pie" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, textAlign: "center", fontSize: 12, marginTop: 10 }}>
          {labels.map((l, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 10 }}>
              <p style={{ color: "#94a3b8", marginBottom: 4 }}>{l} זווית</p>
              <p style={{ fontFamily: "monospace", color: barColors[i], fontWeight: 700 }}>{angles[i].toFixed(1)}&deg;</p>
            </div>
          ))}
        </div>
      )}

      <LabMessage text="שנו את הערכים וראו כיצד הדיאגרמה משתנה" type="success" visible={isDefault} />
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiagramsPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "22,163,74" : selectedLevel === "medium" ? "234,88,12" : "220,38,38";

  return (
    <main
      style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties}
      dir="rtl"
    >
      <style>{`
        textarea, input[type="text"], input[type="password"] { outline: none !important; }
        textarea:focus, input[type="text"]:focus {
          outline: none !important;
          border-color: rgba(var(--lvl-rgb), 0.65) !important;
          box-shadow: 0 0 0 3px rgba(var(--lvl-rgb), 0.12) !important;
        }
        input[type="range"] { outline: none !important; }
        input[type="range"]:focus { outline: none !important; }
        button:focus, button:focus-visible {
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(var(--lvl-rgb), 0.35) !important;
        }
        button:focus:not(:focus-visible) { box-shadow: none !important; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>דיאגרמות עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>דיאגרמת עמודות, דיאגרמת עוגה, קריאת גרפים והשוואת נתונים</p>
          </div>
          <Link
            href="/3u/topic/grade10/statistics"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.1)"; }}
          >
            <span style={{ fontSize: 16 }}>{"\u2190"}</span>
            חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>

        <SubtopicProgress subtopicId="3u/grade10/statistics/diagrams" />

        {/* Level Selector */}
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(60,54,42,0.15)" }}>
          {TABS.map(tab => {
            const active = selectedLevel === tab.id;
            return (
              <button key={tab.id} onClick={() => setSelectedLevel(tab.id)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active ? `${tab.bg} border ${tab.border} ${tab.textColor}` : "text-slate-500 hover:text-slate-300"}`}
                style={active ? { boxShadow: `0 0 14px ${tab.glowColor}` } : undefined}>
                {tab.label}
              </button>
            );
          })}
        </div>

        <FormulaBar />

        {/* Active card */}
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        {/* Lab */}
        <DiagramLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade10/statistics/diagrams" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
