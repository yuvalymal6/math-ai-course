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

function BasicDecayDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>עקומת דעיכה -- ירידה מעריכית</p>
      <svg width="100%" viewBox="0 0 300 180" style={{ maxWidth: "100%" }}>
        {/* Axes */}
        <line x1={40} y1={150} x2={280} y2={150} stroke="#94a3b8" strokeWidth={1.5} />
        <line x1={40} y1={150} x2={40} y2={20} stroke="#94a3b8" strokeWidth={1.5} />
        {/* Axis labels */}
        <text x={160} y={172} textAnchor="middle" fill="#64748b" fontSize={12} fontWeight={600}>t</text>
        <text x={28} y={88} textAnchor="middle" fill="#64748b" fontSize={12} fontWeight={600}>N</text>
        {/* N₀ label */}
        <text x={32} y={38} textAnchor="end" fill="#16a34a" fontSize={10} fontWeight={600}>N&#8320;</text>
        {/* Decay curve */}
        <path
          d="M 40 35 Q 80 35, 100 55 Q 130 85, 160 105 Q 200 130, 240 140 Q 260 144, 280 147"
          fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round"
        />
        {/* Dashed start line */}
        <line x1={40} y1={35} x2={45} y2={35} stroke="#16a34a" strokeWidth={1} strokeDasharray="3,2" />
        {/* Arrow tips */}
        <polygon points="280,150 274,147 274,153" fill="#94a3b8" />
        <polygon points="40,20 37,26 43,26" fill="#94a3b8" />
      </svg>
    </div>
  );
}

function MediumDecayDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>עקומת דעיכה עם חצי חיים</p>
      <svg width="100%" viewBox="0 0 300 200" style={{ maxWidth: "100%" }}>
        {/* Axes */}
        <line x1={40} y1={170} x2={280} y2={170} stroke="#94a3b8" strokeWidth={1.5} />
        <line x1={40} y1={170} x2={40} y2={20} stroke="#94a3b8" strokeWidth={1.5} />
        {/* Axis labels */}
        <text x={160} y={192} textAnchor="middle" fill="#64748b" fontSize={12} fontWeight={600}>t</text>
        <text x={28} y={98} textAnchor="middle" fill="#64748b" fontSize={12} fontWeight={600}>N</text>
        {/* N₀ label */}
        <text x={32} y={38} textAnchor="end" fill="#ea580c" fontSize={10} fontWeight={600}>N&#8320;</text>
        {/* Half-value dashed line */}
        <line x1={40} y1={98} x2={280} y2={98} stroke="#ea580c" strokeWidth={1} strokeDasharray="5,4" opacity={0.6} />
        <text x={284} y={102} fill="#ea580c" fontSize={9} fontWeight={600}>N&#8320;/2</text>
        {/* T½ label on x-axis */}
        <line x1={130} y1={98} x2={130} y2={170} stroke="#ea580c" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
        <text x={130} y={183} textAnchor="middle" fill="#ea580c" fontSize={9} fontWeight={600}>T&#189;</text>
        {/* Decay curve */}
        <path
          d="M 40 35 Q 70 35, 90 50 Q 110 68, 130 98 Q 160 130, 190 148 Q 220 158, 260 164 Q 270 166, 280 167"
          fill="none" stroke="#ea580c" strokeWidth={2.5} strokeLinecap="round"
        />
        {/* Arrow tips */}
        <polygon points="280,170 274,167 274,173" fill="#94a3b8" />
        <polygon points="40,20 37,26 43,26" fill="#94a3b8" />
      </svg>
    </div>
  );
}

function AdvancedDecayDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>השוואת קצבי דעיכה -- מהירה לעומת איטית</p>
      <svg width="100%" viewBox="0 0 300 200" style={{ maxWidth: "100%" }}>
        {/* Axes */}
        <line x1={40} y1={170} x2={280} y2={170} stroke="#94a3b8" strokeWidth={1.5} />
        <line x1={40} y1={170} x2={40} y2={20} stroke="#94a3b8" strokeWidth={1.5} />
        {/* Axis labels */}
        <text x={160} y={192} textAnchor="middle" fill="#64748b" fontSize={12} fontWeight={600}>t</text>
        <text x={28} y={98} textAnchor="middle" fill="#64748b" fontSize={12} fontWeight={600}>N</text>
        {/* Fast decay curve */}
        <path
          d="M 40 35 Q 60 40, 80 70 Q 100 110, 130 140 Q 160 155, 200 163 Q 240 167, 280 168"
          fill="none" stroke="#dc2626" strokeWidth={2.5} strokeLinecap="round"
        />
        <text x={110} y={125} fill="#dc2626" fontSize={10} fontWeight={700}>מהירה</text>
        {/* Slow decay curve */}
        <path
          d="M 40 35 Q 80 38, 110 55 Q 150 80, 190 110 Q 220 130, 250 145 Q 265 152, 280 157"
          fill="none" stroke="#dc2626" strokeWidth={2} strokeLinecap="round" strokeDasharray="6,3" opacity={0.6}
        />
        <text x={200} y={102} fill="#dc2626" fontSize={10} fontWeight={600} opacity={0.7}>איטית</text>
        {/* N₀ label */}
        <text x={32} y={38} textAnchor="end" fill="#dc2626" fontSize={10} fontWeight={600}>N&#8320;</text>
        {/* Arrow tips */}
        <polygon points="280,170 274,167 274,173" fill="#94a3b8" />
        <polygon points="40,20 37,26 43,26" fill="#94a3b8" />
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
        subjectWords={["דעיכה", "חצי חיים", "מנה", "אחוז", "נוסחה", "זמן"]}
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
  const [activeTab, setActiveTab] = useState<"model" | "halflife" | "rate" | "remaining" | null>(null);

  const tabs = [
    { id: "model" as const,     label: "מודל דעיכה",    tex: "N(t)=N_0 \\cdot q^t",    color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "halflife" as const,  label: "חצי חיים",      tex: "T_{1/2}",                 color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "rate" as const,      label: "אחוז ירידה",    tex: "q = 1 - r",               color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "remaining" as const, label: "שנותרו אחרי t", tex: "N_0(1-r)^t",              color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
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

      {/* Expanded: Model */}
      {activeTab === "model" && (
        <motion.div key="model" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"N(t) = N_0 \\cdot q^t \\quad (0 < q < 1)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> במודל דעיכה, הכמות יורדת בכל יחידת זמן באותו יחס קבוע.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"N_0"}</InlineMath> = הכמות ההתחלתית.</li>
                  <li><InlineMath>{"q"}</InlineMath> = מנת הדעיכה -- מה שנשאר אחרי כל יחידת זמן.</li>
                  <li>כש-<InlineMath>{"q < 1"}</InlineMath>, הכמות יורדת (דעיכה). ככל ש-<InlineMath>{"q"}</InlineMath> קטן יותר, הדעיכה מהירה יותר.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: אם נשאר 80% בכל שעה, אז <InlineMath>{"q = 0.8"}</InlineMath> והנוסחה: <InlineMath>{"N(t) = N_0 \\cdot 0.8^t"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Half-life */}
      {activeTab === "halflife" && (
        <motion.div key="halflife" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"T_{1/2} = \\frac{\\ln 2}{\\ln(1/q)}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> זמן מחצית החיים הוא הזמן שלוקח לכמות לרדת לחצי:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>פותרים <InlineMath>{"q^T = 0.5"}</InlineMath> &rarr; <InlineMath>{"T = \\frac{\\ln 0.5}{\\ln q}"}</InlineMath>.</li>
                  <li>מכיוון ש-<InlineMath>{"\\ln 0.5 = -\\ln 2"}</InlineMath>, מקבלים <InlineMath>{"T_{1/2} = \\frac{\\ln 2}{\\ln(1/q)}"}</InlineMath>.</li>
                  <li>זמן מחצית החיים קבוע -- לא תלוי בכמות ההתחלתית!</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; שימו לב: <InlineMath>{"T_{1/2}"}</InlineMath> תלוי רק ב-<InlineMath>{"q"}</InlineMath>. גם אם מתחילים מ-1000 וגם מ-100, הזמן לחצי זהה.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Decay rate */}
      {activeTab === "rate" && (
        <motion.div key="rate" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"q = 1 - r"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> הקשר בין אחוז הירידה למנת הדעיכה:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"r"}</InlineMath> = שיעור הירידה (מה שהולך). לדוגמה: ירידה של 20% &rarr; <InlineMath>{"r = 0.2"}</InlineMath>.</li>
                  <li><InlineMath>{"q"}</InlineMath> = מה שנשאר = <InlineMath>{"1 - r"}</InlineMath>. אם ירד 20%, נשאר 80% &rarr; <InlineMath>{"q = 0.8"}</InlineMath>.</li>
                  <li>תמיד: <InlineMath>{"0 < q < 1"}</InlineMath> ו-<InlineMath>{"0 < r < 1"}</InlineMath>, וביחד <InlineMath>{"q + r = 1"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; הטעות הנפוצה: לבלבל בין מה שנשאר למה שהולך. &quot;נשאר 80%&quot; &rarr; <InlineMath>{"q=0.8"}</InlineMath>, לא <InlineMath>{"q=0.2"}</InlineMath>!
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Remaining after t */}
      {activeTab === "remaining" && (
        <motion.div key="remaining" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"N(t) = N_0 \\cdot (1-r)^t"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> צורה שקולה של נוסחת הדעיכה, עם שיעור הירידה במקום <InlineMath>{"q"}</InlineMath>:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מציבים <InlineMath>{"q = 1 - r"}</InlineMath> בנוסחה הכללית.</li>
                  <li>שימושי כשנתון אחוז הירידה ולא מנת הדעיכה.</li>
                  <li>לדוגמה: ירידה של 30% בכל שעה &rarr; <InlineMath>{"N(t) = N_0 \\cdot 0.7^t"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; טיפ: בשאלות מילוליות, זהו את <InlineMath>{"r"}</InlineMath> (הירידה) וחשבו <InlineMath>{"q = 1 - r"}</InlineMath> לפני שמציבים בנוסחה.
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
    title: "דעיכה רדיואקטיבית פשוטה",
    problem: "חומר רדיואקטיבי מתפרק כך שבכל שעה נשאר ממנו 80%.\n\nא. כתבו את נוסחת הכמות N(t) שנותרה לאחר t שעות.\nב. מהי הכמות שנותרה אחרי 3 שעות (באחוזים מהכמות ההתחלתית)?\nג. אחרי כמה שעות יישאר פחות מ-50% מהכמות ההתחלתית?",
    diagram: <BasicDecayDiagram />,
    pitfalls: [
      { title: "q הוא מה שנשאר, לא מה שהלך", text: "אם נשאר 80%, אז q=0.8 ולא q=0.2. הטעות הכי נפוצה בשאלות דעיכה!" },
      { title: "הכמות ההתחלתית היא N₀, לא 100", text: "אפשר להשאיר N₀ כללי ולחשב באחוזים, או להציב N₀=100 לנוחות. אבל לא לשכוח לציין." },
      { title: "פחות מ-50% = אי-שוויון", text: "כשמחפשים 'מתי פחות מ-50%' -- צריך אי-שוויון, לא משוואה. פותרים 0.8^t < 0.5 עם לוגריתם." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nחומר רדיואקטיבי מתפרק כך שבכל שעה נשאר ממנו 80%.\nאני צריך:\n1. לכתוב את נוסחת הכמות N(t)\n2. לחשב כמה נשאר אחרי 3 שעות\n3. למצוא מתי יישאר פחות מ-50%\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "סעיף א\u2019 -- כתיבת הנוסחה",
        coaching: "זהה את q מהנתון ובנה את N(t) = N₀·q^t",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nחומר רדיואקטיבי מתפרק כך שבכל שעה נשאר ממנו 80%. תנחה אותי לכתוב את נוסחת הכמות N(t) שנותרה לאחר t שעות. שאל אותי: מה המשמעות של 'נשאר 80%' עבור q? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["נוסחה", "דעיכה", "q"],
        keywordHint: "ציין שמדובר בכתיבת נוסחת דעיכה עם q",
        contextWords: ["נוסחה", "דעיכה", "q", "נשאר", "אחוז", "מעריכית", "N₀"],
        stationWords: ["דעיכה", "חצי חיים", "נוסחה"],
      },
      {
        phase: "ב",
        label: "סעיף ב\u2019 -- הצבה ל-3 שעות",
        coaching: "הצב t=3 בנוסחה וחשב",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nכתבתי את הנוסחה N(t) = N₀·0.8^t. עכשיו אני צריך לחשב כמה נשאר אחרי 3 שעות. תנחה אותי: מה להציב ואיך לחשב 0.8 בחזקת 3. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["הצבה", "חזקה", "שעות"],
        keywordHint: "ציין שצריך הצבה של t=3",
        contextWords: ["הצבה", "חזקה", "שעות", "חישוב", "תוצאה", "אחוז", "כמות"],
        stationWords: ["דעיכה", "חצי חיים", "נוסחה"],
      },
      {
        phase: "ג",
        label: "סעיף ג\u2019 -- מציאת זמן עם אי-שוויון",
        coaching: "פתור 0.8^t < 0.5 עם לוגריתם",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nאני צריך למצוא אחרי כמה שעות יישאר פחות מ-50% מהכמות. תנחה אותי: למה זה אי-שוויון ולא משוואה? איך פותרים 0.8^t < 0.5 עם לוגריתם? שימו לב לכיוון אי-השוויון כשמחלקים ב-ln של מספר קטן מ-1. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["אי-שוויון", "לוגריתם", "זמן"],
        keywordHint: "ציין שצריך לפתור אי-שוויון עם לוגריתם",
        contextWords: ["אי-שוויון", "לוגריתם", "זמן", "פחות", "חצי", "ln", "כיוון"],
        stationWords: ["דעיכה", "חצי חיים", "נוסחה"],
      },
    ],
  },
  {
    id: "medium",
    title: "דעיכת תרופה בגוף",
    problem: "תרופה מתפרקת בגוף כך שבכל שעה נותרים 70% ממנה.\n\nא. אם נלקחה מנה של 400 מ\"ג, כתבו את נוסחת הכמות N(t).\nב. מהו זמן מחצית החיים של התרופה?\nג. אחרי כמה שעות שלמות תישאר פחות מ-10% מהמנה?\nד. אם יעילות התרופה נגמרת כשנשארים פחות מ-50 מ\"ג -- אחרי כמה שעות?",
    diagram: <MediumDecayDiagram />,
    pitfalls: [
      { title: "q=0.7, לא q=0.3", text: "הירידה היא 30% אבל מה שנשאר זה 70%. בנוסחה מציבים את מה שנשאר: q=0.7." },
      { title: "נוסחת חצי חיים", text: "T½ = ln2/ln(1/q), לא T½ = ln2/q. צריך לוגריתם של ההופכי של q, לא q עצמו." },
      { title: "מ\"ג ולא אחוזים", text: "בסעיף ד, העבודה עם מ\"ג ולא אחוזים -- לא לשכוח להציב N₀=400. פחות מ-50 מ\"ג זה לא פחות מ-50%!" },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nתרופה מתפרקת בגוף כך שבכל שעה נותרים 70% ממנה. מנה התחלתית: 400 מ\"ג.\nאני צריך:\n1. לכתוב את נוסחת הכמות\n2. לחשב זמן מחצית חיים\n3. למצוא מתי נשאר פחות מ-10%\n4. למצוא מתי נשאר פחות מ-50 מ\"ג\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "סעיף א\u2019 -- נוסחת הכמות",
        coaching: "זהה q=0.7, N₀=400 ובנה את הנוסחה",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nתרופה מתפרקת בגוף, בכל שעה נותרים 70%. מנה התחלתית 400 מ\"ג. תנחה אותי לכתוב את נוסחת הכמות N(t). שאל אותי: מה q ומה N₀? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["נוסחה", "כמות", "תרופה"],
        keywordHint: "ציין שמדובר בנוסחת כמות תרופה",
        contextWords: ["נוסחה", "כמות", "תרופה", "q", "N₀", "מ\"ג", "דעיכה", "שעה"],
        stationWords: ["דעיכה", "חצי חיים", "תרופה"],
      },
      {
        phase: "ב",
        label: "סעיף ב\u2019 -- זמן מחצית חיים",
        coaching: "השתמש בנוסחה T½ = ln2/ln(1/q)",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nכתבתי N(t) = 400·0.7^t. עכשיו אני צריך למצוא את זמן מחצית החיים. תנחה אותי: מה המשמעות של T½? איך מגיעים לנוסחה T½ = ln2/ln(1/q)? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["חצי חיים", "לוגריתם", "זמן"],
        keywordHint: "ציין שצריך למצוא זמן מחצית חיים",
        contextWords: ["חצי חיים", "לוגריתם", "זמן", "T½", "ln", "חצי", "נוסחה"],
        stationWords: ["דעיכה", "חצי חיים", "תרופה"],
      },
      {
        phase: "ג",
        label: "סעיף ג\u2019 -- מתי פחות מ-10%",
        coaching: "פתור 0.7^t < 0.1",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nאני צריך למצוא אחרי כמה שעות שלמות תישאר פחות מ-10% מהתרופה. תנחה אותי: מה האי-שוויון שצריך לפתור? למה שואלים שעות שלמות? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["אי-שוויון", "אחוז", "שעות"],
        keywordHint: "ציין שצריך לפתור אי-שוויון על אחוזים",
        contextWords: ["אי-שוויון", "אחוז", "שעות", "שלמות", "עיגול", "ln", "פחות"],
        stationWords: ["דעיכה", "חצי חיים", "תרופה"],
      },
      {
        phase: "ד",
        label: "סעיף ד\u2019 -- פחות מ-50 מ\"ג",
        coaching: "פתור 400·0.7^t < 50",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nאני צריך למצוא מתי נשארים פחות מ-50 מ\"ג מתוך 400 מ\"ג. תנחה אותי: למה פה צריך N₀=400 ולא אחוזים? מה האי-שוויון? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["מ\"ג", "הצבה", "אי-שוויון"],
        keywordHint: "ציין שצריך לעבוד עם מ\"ג ולהציב N₀",
        contextWords: ["מ\"ג", "הצבה", "אי-שוויון", "N₀", "400", "50", "כמות", "יעילות"],
        stationWords: ["דעיכה", "חצי חיים", "תרופה"],
      },
    ],
  },
  {
    id: "advanced",
    title: "דעיכה רדיואקטיבית -- מציאת q מנתונים",
    problem: "חומר רדיואקטיבי מתחיל עם 1000 גרם. אחרי 5 שעות נותרו 243 גרם.\n\nא. מצאו את q (מנת הדעיכה לשעה).\nב. חשבו את זמן מחצית החיים.\nג. אחרי כמה שעות יישארו פחות מ-10 גרם?\nד. שרטטו סקיצה של N(t) וסמנו עליה את T½.",
    diagram: <AdvancedDecayDiagram />,
    pitfalls: [
      { title: "מציאת q מנתונים", text: "צריך q⁵ = 243/1000, לכן q = (0.243)^(1/5). שימו לב: 243 = 3⁵, לכן q = 3/10 = 0.3. לא לקרב מוקדם מדי!" },
      { title: "שימוש בשורש חמישי", text: "0.243 = (3/10)⁵ -- אם מזהים את זה, אפשר לפשט. אחרת, משתמשים במחשבון: (0.243)^(0.2)." },
      { title: "הסקיצה = עקומה חלקה", text: "בסעיף ד -- הסקיצה צריכה להראות ירידה חלקה ורציפה, לא מדרגות. סמנו את T½ על ציר ה-t." },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "א",
        label: "סעיף א\u2019 -- מציאת q",
        coaching: "הצב בנוסחה: 243 = 1000·q⁵ ופתור",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nחומר רדיואקטיבי: 1000 גרם בהתחלה, 243 גרם אחרי 5 שעות. תנחה אותי למצוא את q. שאל: מה המשוואה שצריך לפתור? איך מוצאים שורש חמישי? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["q", "משוואה", "שורש"],
        keywordHint: "ציין שצריך למצוא q ממשוואה עם שורש",
        contextWords: ["q", "משוואה", "שורש", "חמישי", "חזקה", "1000", "243", "דעיכה"],
        stationWords: ["דעיכה", "חצי חיים", "מנה", "נוסחה"],
      },
      {
        phase: "ב",
        label: "סעיף ב\u2019 -- זמן מחצית חיים",
        coaching: "הצב את q שמצאת בנוסחת T½",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nמצאתי q=0.3. עכשיו אני צריך לחשב את זמן מחצית החיים. תנחה אותי להשתמש בנוסחה T½ = ln2/ln(1/q). שאל: מה ln(1/0.3)? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["חצי חיים", "ln", "חישוב"],
        keywordHint: "ציין שצריך לחשב T½ עם לוגריתם",
        contextWords: ["חצי חיים", "ln", "חישוב", "T½", "לוגריתם", "q", "נוסחה"],
        stationWords: ["דעיכה", "חצי חיים", "מנה", "נוסחה"],
      },
      {
        phase: "ג",
        label: "סעיף ג\u2019 -- מתי פחות מ-10 גרם",
        coaching: "פתור 1000·0.3^t < 10",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nN(t) = 1000·0.3^t. אני צריך למצוא מתי יישארו פחות מ-10 גרם. תנחה אותי: מה האי-שוויון? איך מפשטים לפני שמפעילים ln? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["אי-שוויון", "גרם", "לוגריתם"],
        keywordHint: "ציין שצריך אי-שוויון עם לוגריתם",
        contextWords: ["אי-שוויון", "גרם", "לוגריתם", "10", "1000", "ln", "זמן", "פחות"],
        stationWords: ["דעיכה", "חצי חיים", "מנה", "נוסחה"],
      },
      {
        phase: "ד",
        label: "סעיף ד\u2019 -- סקיצה של N(t)",
        coaching: "שרטט עקומת דעיכה חלקה וסמן T½",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nאני צריך לשרטט סקיצה של N(t) = 1000·0.3^t ולסמן את T½. תנחה אותי: אילו נקודות חשוב לסמן? איך הגרף נראה? למה זו עקומה חלקה ולא מדרגות? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["סקיצה", "גרף", "T½"],
        keywordHint: "ציין שצריך סקיצה עם סימון T½",
        contextWords: ["סקיצה", "גרף", "T½", "נקודות", "ציר", "עקומה", "חלקה", "דעיכה"],
        stationWords: ["דעיכה", "חצי חיים", "מנה", "נוסחה"],
      },
    ],
  },
];

// ─── Decay Lab ────────────────────────────────────────────────────────────────

function DecayLab() {
  const [n0, setN0] = useState(500);
  const [q, setQ]   = useState(0.8);

  const n1 = n0 * q;
  const n5 = n0 * Math.pow(q, 5);
  const halfLife = Math.log(2) / Math.log(1 / q);

  // Generate curve points
  const points: string[] = [];
  const svgW = 300, svgH = 180, padL = 45, padB = 30, padT = 15, padR = 15;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const tMax = 10;
  for (let i = 0; i <= 50; i++) {
    const t = (i / 50) * tMax;
    const val = n0 * Math.pow(q, t);
    const x = padL + (t / tMax) * plotW;
    const y = padT + plotH - (val / 1000) * plotH;
    points.push(`${x},${y}`);
  }

  // Half-life marker
  const hlX = padL + (halfLife / tMax) * plotW;
  const hlY = padT + plotH - ((n0 / 2) / 1000) * plotH;

  const isDefault = Math.abs(q - 0.8) < 0.005 && Math.abs(n0 - 500) < 5;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; סימולטור דעיכה</h3>
        {halfLife <= tMax && <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />T½ = {halfLife.toFixed(2)} שעות</span>}
      </div>

      {/* SVG Curve */}
      <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden", padding: 12, marginBottom: "1.25rem" }}>
        <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ maxWidth: "100%" }}>
          {/* Axes */}
          <line x1={padL} y1={svgH - padB} x2={svgW - padR} y2={svgH - padB} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={padL} y1={svgH - padB} x2={padL} y2={padT} stroke="#94a3b8" strokeWidth={1.2} />
          {/* Axis labels */}
          <text x={(padL + svgW - padR) / 2} y={svgH - 5} textAnchor="middle" fill="#64748b" fontSize={11}>t (שעות)</text>
          <text x={12} y={(padT + svgH - padB) / 2} textAnchor="middle" fill="#64748b" fontSize={11} transform={`rotate(-90, 12, ${(padT + svgH - padB) / 2})`}>N</text>
          {/* N₀ label */}
          <text x={padL - 4} y={padT + plotH - (n0 / 1000) * plotH + 4} textAnchor="end" fill="#16a34a" fontSize={9} fontWeight={600}>{n0}</text>
          {/* Decay curve */}
          <polyline points={points.join(" ")} fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Half-life marker */}
          {halfLife <= tMax && (
            <>
              <line x1={padL} y1={hlY} x2={hlX} y2={hlY} stroke="#ea580c" strokeWidth={1} strokeDasharray="4,3" opacity={0.6} />
              <line x1={hlX} y1={hlY} x2={hlX} y2={svgH - padB} stroke="#ea580c" strokeWidth={1} strokeDasharray="4,3" opacity={0.6} />
              <circle cx={hlX} cy={hlY} r={3.5} fill="#ea580c" />
              <text x={hlX} y={svgH - padB + 12} textAnchor="middle" fill="#ea580c" fontSize={8} fontWeight={600}>T½</text>
            </>
          )}
        </svg>
      </div>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "1.25rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>N₀ (כמות התחלתית)</span>
            <span style={{ fontFamily: "monospace", color: "#2D3436", fontWeight: 700 }}>{n0}</span>
          </div>
          <input type="range" min={100} max={1000} step={10} value={n0}
            onChange={e => setN0(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#16a34a" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>q (מנת דעיכה)</span>
            <span style={{ fontFamily: "monospace", color: "#2D3436", fontWeight: 700 }}>{q.toFixed(2)}</span>
          </div>
          <input type="range" min={0.5} max={0.99} step={0.01} value={q}
            onChange={e => setQ(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#ea580c" }} />
        </div>
      </div>

      {/* Data tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>N(1) -- אחרי שעה</p>
          <p style={{ fontFamily: "monospace", color: "#16a34a", fontWeight: 700 }}>{n1.toFixed(1)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>N(5) -- אחרי 5 שעות</p>
          <p style={{ fontFamily: "monospace", color: "#ea580c", fontWeight: 700 }}>{n5.toFixed(1)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>T½ (חצי חיים)</p>
          <p style={{ fontFamily: "monospace", color: "#dc2626", fontWeight: 700 }}>{halfLife.toFixed(2)} שעות</p>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, marginTop: 12, fontSize: 12, color: "#64748b" }}>
        <span style={{ color: "#16a34a", fontWeight: 600 }}>N(t) = {n0} &middot; {q.toFixed(2)}^t</span> &nbsp;|&nbsp;
        ירידה של <span style={{ color: "#dc2626", fontWeight: 600 }}>{((1 - q) * 100).toFixed(0)}%</span> בכל שעה &nbsp;|&nbsp;
        חצי חיים: <span style={{ color: "#ea580c", fontWeight: 600 }}>{halfLife.toFixed(2)}</span> שעות
      </div>

      <LabMessage text="שנו את q ו-N₀ כדי לראות איך הדעיכה משתנה. שימו לב: ככל ש-q קטן יותר, הדעיכה מהירה יותר!" type="success" visible={isDefault} />
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DecayPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>דעיכה עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>מודל דעיכה, חצי חיים, ופתרון אי-שוויונות מעריכיים</p>
          </div>
          <Link
            href="/3u/topic/grade11/growth-decay"
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

        <SubtopicProgress subtopicId="3u/grade11/growth-decay/decay" />

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
        <DecayLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade11/growth-decay/decay" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
