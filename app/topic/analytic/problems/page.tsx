"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle2, Lock } from "lucide-react";
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

// ─── SVG diagrams (silent — no numbers, no answers) ──────────────────────────

function BasicSVG() {
  return (
    <svg viewBox="0 0 220 260" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Kite ABCD */}
      <polygon points="110,20 175,110 110,240 45,110" fill="rgba(22,163,74,0.06)" stroke="#16A34A" strokeWidth={2} />
      {/* Diagonal AC (vertical) */}
      <line x1={110} y1={20} x2={110} y2={240} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,3" />
      {/* Diagonal BD (horizontal) */}
      <line x1={45} y1={110} x2={175} y2={110} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="5,3" />
      {/* Intersection O */}
      <circle cx={110} cy={110} r={3.5} fill="#64748b" />
      {/* Labels */}
      <text x={110} y={14} textAnchor="middle" fontSize={13} fontWeight={700} fill="#2D3436">A</text>
      <text x={183} y={114} textAnchor="start" fontSize={13} fontWeight={700} fill="#2D3436">B</text>
      <text x={110} y={256} textAnchor="middle" fontSize={13} fontWeight={700} fill="#2D3436">C</text>
      <text x={33} y={114} textAnchor="end" fontSize={13} fontWeight={700} fill="#2D3436">D</text>
      <text x={118} y={105} textAnchor="start" fontSize={12} fontWeight={600} fill="#64748b">O</text>
    </svg>
  );
}

function MediumSVG() {
  const cx = 110, cy = 110, r = 80;
  const ax = cx + r * Math.cos(-Math.PI / 2);
  const ay = cy + r * Math.sin(-Math.PI / 2);
  const bx = cx + r * Math.cos(Math.PI / 6 + Math.PI / 2);
  const by = cy + r * Math.sin(Math.PI / 6 + Math.PI / 2);
  const cxp = cx + r * Math.cos(-Math.PI / 6 + Math.PI / 2);
  const cyp = cy + r * Math.sin(-Math.PI / 6 + Math.PI / 2);
  return (
    <svg viewBox="0 0 220 230" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Circle */}
      <circle cx={cx} cy={cy} r={r} fill="rgba(234,88,12,0.06)" stroke="#EA580C" strokeWidth={2} />
      {/* Triangle */}
      <polygon points={`${ax},${ay} ${bx},${by} ${cxp},${cyp}`} fill="rgba(234,88,12,0.08)" stroke="#EA580C" strokeWidth={1.5} />
      {/* Radius dashed */}
      <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="#64748b" strokeWidth={1.2} strokeDasharray="4,3" />
      {/* Center O */}
      <circle cx={cx} cy={cy} r={3.5} fill="#EA580C" />
      {/* Labels */}
      <text x={ax} y={ay - 8} textAnchor="middle" fontSize={13} fontWeight={700} fill="#2D3436">A</text>
      <text x={bx - 10} y={by + 5} textAnchor="end" fontSize={13} fontWeight={700} fill="#2D3436">B</text>
      <text x={cxp + 10} y={cyp + 5} textAnchor="start" fontSize={13} fontWeight={700} fill="#2D3436">C</text>
      <text x={cx + 10} y={cy - 4} textAnchor="start" fontSize={12} fontWeight={600} fill="#64748b">O</text>
    </svg>
  );
}

function AdvancedSVG() {
  const r1 = 45, r2 = 30;
  const cx1 = 60, cy1 = 110;
  const cx2 = cx1 + r1 + r2, cy2 = 110;
  const tx = cx1 + r1, ty = 110;
  const px = (cx1 + cx2) / 2, py = 45;
  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Circle 1 */}
      <circle cx={cx1} cy={cy1} r={r1} fill="rgba(220,38,38,0.06)" stroke="#DC2626" strokeWidth={2} />
      {/* Circle 2 */}
      <circle cx={cx2} cy={cy2} r={r2} fill="rgba(220,38,38,0.06)" stroke="#DC2626" strokeWidth={2} />
      {/* Line O1-O2 */}
      <line x1={cx1} y1={cy1} x2={cx2} y2={cy2} stroke="#64748b" strokeWidth={1.2} strokeDasharray="4,3" />
      {/* External tangent line */}
      <line x1={20} y1={py} x2={200} y2={py} stroke="#a78bfa" strokeWidth={1.5} />
      {/* Lines from centers to tangent point P */}
      <line x1={cx1} y1={cy1} x2={px - 20} y2={py} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,3" />
      <line x1={cx2} y1={cy2} x2={px + 20} y2={py} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,3" />
      {/* Tangent point T */}
      <circle cx={tx} cy={ty} r={3.5} fill="#34d399" />
      {/* Centers */}
      <circle cx={cx1} cy={cy1} r={3.5} fill="#DC2626" />
      <circle cx={cx2} cy={cy2} r={3.5} fill="#DC2626" />
      {/* Point P */}
      <circle cx={px} cy={py} r={3.5} fill="#a78bfa" />
      {/* Labels */}
      <text x={cx1} y={cy1 + 16} textAnchor="middle" fontSize={12} fontWeight={700} fill="#2D3436">O&#x2081;</text>
      <text x={cx2} y={cy2 + 16} textAnchor="middle" fontSize={12} fontWeight={700} fill="#2D3436">O&#x2082;</text>
      <text x={tx} y={ty - 8} textAnchor="middle" fontSize={12} fontWeight={600} fill="#34d399">T</text>
      <text x={px} y={py - 8} textAnchor="middle" fontSize={12} fontWeight={600} fill="#a78bfa">P</text>
    </svg>
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
        subjectWords={["מעגל", "משיק", "מרכז", "רדיוס", "ניצב", "משוואה"]}
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

      {/* Advanced gate — outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}

    </section>
  );
}

// ─── Formula Bar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"distance" | "slopes" | "area" | null>(null);

  const tabs = [
    { id: "distance" as const, label: "מרחק בין נקודות", tex: "d=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "slopes" as const,   label: "שיפוע וניצבות",   tex: "m_1 \\cdot m_2 = -1",               color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "area" as const,     label: "שטח מרובע/משולש",  tex: "S = \\tfrac{1}{2}|d_1 \\cdot d_2|", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: Distance */}
      {activeTab === "distance" && (
        <motion.div key="distance" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> נוסחת המרחק בין שתי נקודות במישור.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>חשבו את ההפרש בקואורדינטות <InlineMath>{"x"}</InlineMath> ובקואורדינטות <InlineMath>{"y"}</InlineMath>.</li>
                  <li>העלו כל הפרש בריבוע וחברו.</li>
                  <li>הוציאו שורש מהסכום.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: <InlineMath>{"A(1,2)"}</InlineMath>, <InlineMath>{"B(4,6)"}</InlineMath> &rarr; <InlineMath>{"d = \\sqrt{9+16} = 5"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Slopes & perpendicularity */}
      {activeTab === "slopes" && (
        <motion.div key="slopes" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"m_1 \\cdot m_2 = -1 \\quad \\Leftrightarrow \\quad \\ell_1 \\perp \\ell_2"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> שני ישרים מאונכים אם ורק אם מכפלת שיפועיהם שווה ל-<InlineMath>{"-1"}</InlineMath>.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>שיפוע: <InlineMath>{"m = \\frac{y_2-y_1}{x_2-x_1}"}</InlineMath></li>
                  <li>אם <InlineMath>{"m_1 \\cdot m_2 = -1"}</InlineMath> הישרים ניצבים.</li>
                  <li>מקרה מיוחד: ישר אנכי (<InlineMath>{"m"}</InlineMath> לא מוגדר) ניצב לישר אופקי (<InlineMath>{"m=0"}</InlineMath>).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: <InlineMath>{"m_1 = 2"}</InlineMath>, <InlineMath>{"m_2 = -\\frac{1}{2}"}</InlineMath> &rarr; <InlineMath>{"2 \\cdot (-\\frac{1}{2}) = -1"}</InlineMath> -- ניצבים
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Area formulas */}
      {activeTab === "area" && (
        <motion.div key="area" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S_{\\text{kite}} = \\frac{d_1 \\cdot d_2}{2} \\qquad S_{\\triangle} = \\frac{1}{2}|x_1(y_2-y_3)+x_2(y_3-y_1)+x_3(y_1-y_2)|"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> שתי נוסחאות שטח שימושיות:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><strong>דלתון/מעוין:</strong> שטח = מחצית מכפלת האלכסונים.</li>
                  <li><strong>משולש (שרוך נעליים):</strong> נוסחת השרוך עם קואורדינטות הקודקודים.</li>
                  <li>ניתן להשתמש גם ב-<InlineMath>{"S = \\frac{1}{2} \\cdot base \\cdot h"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: אלכסונים 6 ו-8 &rarr; <InlineMath>{"S = \\frac{6 \\cdot 8}{2} = 24"}</InlineMath>
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
    title: "דלתון במערכת צירים",
    problem: "נתון דלתון ABCD במערכת צירים.\nAB = AD, CB = CD.\nהאלכסונים AC ו-BD נחתכים בנקודה O.\n\nא. הוכיחו שהאלכסון AC מאונך לאלכסון BD.\nב. הוכיחו שהאלכסון AC חוצה את BD.\nג. חשבו את שטח הדלתון.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "דלתון אינו מעוין -- רק שני זוגות צלעות שוות סמוכות", text: "בדלתון AB=AD ו-CB=CD, אבל AB לא בהכרח שווה ל-CB. אל תניחו שכל הצלעות שוות -- זה מעוין, לא דלתון." },
      { title: "אלכסון אחד חוצה את השני אך לא להיפך", text: "AC חוצה את BD, אבל BD לא בהכרח חוצה את AC. חשוב לא להניח סימטריה מלאה." },
    ],
    goldenPrompt: "אני תלמיד כיתה יא׳. נתון דלתון ABCD במערכת צירים כאשר AB=AD ו-CB=CD. האלכסונים נחתכים ב-O.\nאני צריך:\n1. להוכיח ש-AC מאונך ל-BD\n2. להוכיח ש-AC חוצה את BD\n3. לחשב את שטח הדלתון\n\nאל תפתור עבורי -- שאל אותי שאלות מכוונות.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "שלב א׳ -- הצבת קודקודים במערכת צירים",
        coaching: "בחר קואורדינטות נוחות לדלתון",
        prompt: "נתון דלתון ABCD כאשר AB=AD ו-CB=CD. תנחה אותי לבחור קואורדינטות נוחות לקודקודים כך שציר הסימטריה של הדלתון יהיה על ציר y. תסביר למה זה מקל על ההוכחה. אל תפתור.",
        keywords: ["דלתון", "צירים", "קואורדינטות"],
        keywordHint: "ציין שמדובר בדלתון במערכת צירים",
        contextWords: ["דלתון", "צירים", "קואורדינטות", "סימטריה", "קודקודים", "ציר"],
      },
      {
        phase: "ב",
        label: "שלב ב׳ -- הוכחת ניצבות אלכסונים",
        coaching: "השתמש בשיפועים ומכפלתם",
        prompt: "בהינתן דלתון ABCD עם קודקודים במערכת צירים, תדריך אותי איך לחשב את שיפוע AC ואת שיפוע BD ולהראות שהם מאונכים. תסביר מה צריך שיתקיים. אל תפתור.",
        keywords: ["שיפוע", "ניצב", "אלכסון"],
        keywordHint: "ציין שצריך לבדוק ניצבות",
        contextWords: ["שיפוע", "ניצב", "אלכסון", "מכפלה", "מאונך", "AC", "BD"],
      },
      {
        phase: "ג",
        label: "שלב ג׳ -- הוכחת חציה",
        coaching: "מצא אמצע BD ובדוק שהוא על AC",
        prompt: "בהינתן דלתון ABCD עם קודקודים במערכת צירים, תנחה אותי להוכיח ש-AC חוצה את BD. תסביר איך למצוא את נקודת החיתוך O ולבדוק שהיא אמצע BD. אל תפתור.",
        keywords: ["אמצע", "חוצה", "נקודת חיתוך"],
        keywordHint: "ציין שצריך למצוא אמצע",
        contextWords: ["אמצע", "חוצה", "חיתוך", "BD", "AC", "קטע", "O"],
      },
      {
        phase: "ד",
        label: "שלב ד׳ -- חישוב שטח הדלתון",
        coaching: "השתמש בנוסחת אלכסונים",
        prompt: "בהינתן דלתון ABCD עם קודקודים במערכת צירים ואלכסונים ניצבים, תנחה אותי לחשב את שטח הדלתון. תסביר איזו נוסחה מתאימה כשהאלכסונים ניצבים. אל תפתור.",
        keywords: ["שטח", "אלכסון", "נוסחה"],
        keywordHint: "ציין שצריך לחשב שטח",
        contextWords: ["שטח", "אלכסון", "מרחק", "נוסחה", "דלתון", "מחצית"],
      },
    ],
  },
  {
    id: "medium",
    title: "משולש חסום במעגל",
    problem: "נתון משולש ABC חסום במעגל שמרכזו O ורדיוסו R.\n\nא. מצאו את משוואת המעגל החוסם העובר דרך שלושת הקודקודים.\nב. חשבו את שטח המשולש ABC.\nג. מצאו את הקשר בין רדיוס המעגל החוסם R לבין צלעות המשולש (כלל הסינוסים).",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "מרכז המעגל החוסם אינו מרכז הכובד", text: "מרכז המעגל החוסם הוא חיתוך האנכים האמצעיים, לא חיתוך התיכונים. אל תבלבלו בין שני מרכזים שונים." },
      { title: "שלוש נקודות נדרשות לקביעת המעגל", text: "כדי למצוא את המעגל צריך להציב את שלושת הקודקודים במשוואה ולפתור מערכת -- לא מספיק קודקוד אחד." },
    ],
    goldenPrompt: "אני תלמיד כיתה יא׳. נתון משולש ABC חסום במעגל עם מרכז O ורדיוס R.\nאני צריך:\n1. למצוא משוואת המעגל החוסם\n2. לחשב שטח המשולש\n3. למצוא קשר בין R לצלעות (כלל הסינוסים)\n\nאל תפתור עבורי -- שאל אותי שאלות מכוונות.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "שלב א׳ -- משוואת המעגל החוסם",
        coaching: "הציבו את שלוש הנקודות במשוואה הכללית",
        prompt: "נתון משולש ABC חסום במעגל. תנחה אותי איך למצוא את משוואת המעגל שעובר דרך שלושת הקודקודים. תסביר למה צריך להציב שלוש נקודות. אל תפתור.",
        keywords: ["מעגל", "הצב", "קודקודים"],
        keywordHint: "ציין שצריך למצוא את משוואת המעגל",
        contextWords: ["מעגל", "מרכז", "רדיוס", "משוואה", "חוסם", "הצב", "נקודות"],
      },
      {
        phase: "ב",
        label: "שלב ב׳ -- שטח המשולש",
        coaching: "חשבו שטח באמצעות קואורדינטות",
        prompt: "נתון משולש ABC חסום במעגל. תדריך אותי איך לחשב את שטח המשולש כשידועים הקודקודים במערכת צירים. תסביר איזו שיטה הכי נוחה. אל תפתור.",
        keywords: ["שטח", "משולש", "קואורדינטות"],
        keywordHint: "ציין שצריך לחשב שטח",
        contextWords: ["שטח", "משולש", "שרוך", "קואורדינטות", "בסיס", "גובה", "נוסחה"],
      },
      {
        phase: "ג",
        label: "שלב ג׳ -- כלל הסינוסים וקשר ל-R",
        coaching: "הקשר בין הצלע, הזווית שמולה ורדיוס המעגל החוסם",
        prompt: "נתון משולש ABC חסום במעגל ברדיוס R. תנחה אותי למצוא את הקשר בין R לבין צלעות המשולש. תסביר מה אומר כלל הסינוסים על המעגל החוסם. אל תפתור.",
        keywords: ["סינוסים", "R", "צלע"],
        keywordHint: "ציין שצריך כלל הסינוסים",
        contextWords: ["סינוס", "R", "צלע", "זווית", "קשר", "מעגל", "חוסם"],
      },
    ],
  },
  {
    id: "advanced",
    title: "שני מעגלים ומשיק",
    problem: "נתונים שני מעגלים:\n\u03C9\u2081 עם מרכז O\u2081 ורדיוס r\u2081\n\u03C9\u2082 עם מרכז O\u2082 ורדיוס r\u2082\n\nהמעגלים משיקים חיצונית בנקודה T.\nישר \u2113 משיק לשני המעגלים מבחוץ ונוגע בנקודה P.\n\nא. מצאו את נקודת ההשקה T בין המעגלים.\nב. מצאו את משוואת המשיק המשותף החיצוני \u2113.\nג. הוכיחו שהזווית בנקודת ההשקה P היא 90\u00B0.\nד. חשבו את שטח המשולש שנוצר ממרכזי המעגלים ונקודת ההשקה.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "משיק חיצוני אינו משיק פנימי -- הכיוון שונה", text: "משיק חיצוני נוגע בשני המעגלים מאותו צד. משיק פנימי עובר בין המעגלים. הנוסחאות שונות לחלוטין." },
      { title: "הזווית הישרה נמצאת ב-P ולא ב-T", text: "הזווית הישרה נוצרת בנקודת ההשקה על המשיק כי הרדיוס מאונך למשיק. אל תניחו שהזווית נמצאת בנקודה אחרת." },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "א",
        label: "שלב א׳ -- מציאת נקודת ההשקה T",
        coaching: "T נמצאת על הקטע O1O2",
        prompt: "נתונים שני מעגלים משיקים חיצונית בנקודה T. תנחה אותי איך למצוא את הקואורדינטות של T כשידועים מרכזי המעגלים והרדיוסים. תסביר איפה T נמצאת על הקטע בין המרכזים. אל תפתור.",
        keywords: ["נקודת השקה", "מרכזים", "רדיוס"],
        keywordHint: "ציין שצריך למצוא נקודת השקה",
        contextWords: ["נקודה", "השקה", "מרכז", "רדיוס", "קטע", "חיצוני", "T"],
      },
      {
        phase: "ב",
        label: "שלב ב׳ -- משוואת המשיק המשותף",
        coaching: "המשיק ניצב לרדיוס בנקודת ההשקה",
        prompt: "נתונים שני מעגלים משיקים חיצונית וישר משיק משותף חיצוני. תדריך אותי איך למצוא את משוואת המשיק. תסביר מה הקשר בין המשיק לרדיוס. אל תפתור.",
        keywords: ["משיק", "משוואה", "ניצב"],
        keywordHint: "ציין שצריך משוואת המשיק",
        contextWords: ["משיק", "משוואה", "ניצב", "רדיוס", "ישר", "שיפוע", "מרחק"],
      },
      {
        phase: "ג",
        label: "שלב ג׳ -- הוכחת זווית ישרה ב-P",
        coaching: "רדיוס מאונך למשיק",
        prompt: "נתונים שני מעגלים וישר משיק לשניהם בנקודה P. תנחה אותי להוכיח שהזווית בנקודה P היא 90 מעלות. תסביר מה הקשר בין הרדיוס למשיק. אל תפתור.",
        keywords: ["זווית", "ניצב", "הוכחה"],
        keywordHint: "ציין שצריך להוכיח זווית ישרה",
        contextWords: ["זווית", "ישרה", "ניצב", "משיק", "רדיוס", "משולש", "הוכחה"],
      },
      {
        phase: "ד",
        label: "שלב ד׳ -- שטח המשולש",
        coaching: "חשבו שטח עם בסיס O1O2 וגובה",
        prompt: "נתונים שני מעגלים עם מרכזים O\u2081 ו-O\u2082 ורדיוסים r\u2081 ו-r\u2082 משיקים חיצונית בנקודה T. תנחה אותי לחשב את שטח המשולש O\u2081TO\u2082. תסביר איך הרדיוסים קשורים לחישוב. אל תפתור.",
        keywords: ["שטח", "משולש", "רדיוס"],
        keywordHint: "ציין שצריך לחשב שטח",
        contextWords: ["שטח", "משולש", "בסיס", "גובה", "רדיוס", "r\u2081", "r\u2082"],
      },
    ],
  },
];

// ─── DeltoidLab (basic) ──────────────────────────────────────────────────────

function DeltoidLab() {
  const [angle, setAngle] = useState(90);

  const rad = (angle * Math.PI) / 180;
  const halfAngle = rad / 2;
  const spine = 140;
  const halfWidth = 60 * Math.sin(halfAngle);

  const ax = 110, ay = 20;
  const cx = 110, cy = 20 + spine;
  const oY = 20 + spine * 0.4;
  const bx = 110 + halfWidth, by = oY;
  const dx = 110 - halfWidth, dy = oY;

  const dAC = spine;
  const dBD = 2 * halfWidth;
  const area = (dAC * dBD) / 2;

  let interpText = "דלתון סימטרי קלאסי -- האלכסונים ניצבים";
  if (angle < 60) interpText = "דלתון צר וארוך -- האלכסון הראשי שולט על השטח";
  else if (angle > 120) interpText = "דלתון רחב ושטוח -- מתקרב לצורת עפיפון פתוח";

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת דלתון</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        שנו את זווית הראש וראו איך האלכסונים והשטח משתנים
      </p>

      <svg viewBox="0 0 220 200" className="w-full max-w-sm mx-auto mb-4" aria-hidden>
        {[0, 44, 88, 132, 176, 220].map(v => (
          <g key={v}>
            <line x1={v} y1={0} x2={v} y2={200} stroke="rgba(100,116,139,0.12)" strokeWidth={0.5} />
            <line x1={0} y1={v < 200 ? v : 200} x2={220} y2={v < 200 ? v : 200} stroke="rgba(100,116,139,0.12)" strokeWidth={0.5} />
          </g>
        ))}
        <polygon
          points={`${ax},${ay} ${bx},${by} ${cx},${cy} ${dx},${dy}`}
          fill="rgba(22,163,74,0.08)"
          stroke="#16A34A"
          strokeWidth={2}
        />
        <line x1={ax} y1={ay} x2={cx} y2={cy} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,3" />
        <line x1={dx} y1={dy} x2={bx} y2={by} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="5,3" />
        <circle cx={110} cy={oY} r={3} fill="#64748b" />
        <text x={ax} y={ay - 6} textAnchor="middle" fontSize={12} fontWeight={700} fill="#2D3436">A</text>
        <text x={bx + 8} y={by + 4} textAnchor="start" fontSize={12} fontWeight={700} fill="#2D3436">B</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={12} fontWeight={700} fill="#2D3436">C</text>
        <text x={dx - 8} y={dy + 4} textAnchor="end" fontSize={12} fontWeight={700} fill="#2D3436">D</text>
        <text x={116} y={oY - 6} textAnchor="start" fontSize={11} fontWeight={600} fill="#64748b">O</text>
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 8px", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>זווית ראש הדלתון</span><span style={{ color: "#16A34A", fontWeight: 700 }}>{angle}&deg;</span>
          </div>
          <input type="range" min={30} max={150} step={1} value={angle}
            onChange={e => setAngle(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: "#16A34A" } as React.CSSProperties} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, textAlign: "center", fontSize: 12, marginBottom: 16 }}>
        {[
          { label: "AC", val: dAC.toFixed(1), color: "#f59e0b" },
          { label: "BD", val: dBD.toFixed(1), color: "#a78bfa" },
          { label: "שטח", val: area.toFixed(1), color: "#16A34A" },
          { label: "זווית", val: `${angle}\u00B0`, color: "#64748b" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: "10px 8px" }}>
            <div style={{ color: "#6B7280", marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 700, color, fontSize: 11 }}>{val}</div>
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "#6B7280", fontStyle: "italic" }}>{interpText}</p>
    </section>
  );
}

// ─── CircumscribedLab (medium) ───────────────────────────────────────────────

function CircumscribedLab() {
  const [spread, setSpread] = useState(50);
  const [height, setHeight] = useState(60);

  // Triangle vertices based on sliders
  const axC = 110 - spread, ayC = 180;
  const bxC = 110 + spread, byC = 180;
  const cxC = 110, cyC = 180 - height;

  // Circumscribed circle: perpendicular bisector method
  const midABx = (axC + bxC) / 2, midABy = (ayC + byC) / 2;
  const midACx = (axC + cxC) / 2, midACy = (ayC + cyC) / 2;
  // AB is horizontal so perpendicular bisector is vertical: x = midABx
  // AC slope
  const slopeAC = (cyC - ayC) / (cxC - axC);
  const perpSlopeAC = slopeAC !== 0 ? -1 / slopeAC : Infinity;

  // Center: intersection of x = midABx with perp bisector of AC
  const oCx = midABx;
  let oCy: number;
  if (Math.abs(perpSlopeAC) > 10000) {
    oCy = midACy;
  } else {
    oCy = midACy + perpSlopeAC * (oCx - midACx);
  }
  const R = Math.sqrt((axC - oCx) ** 2 + (ayC - oCy) ** 2);

  // Area of triangle
  const base = bxC - axC;
  const triHeight = ayC - cyC;
  const triArea = (base * triHeight) / 2;

  // Sine rule: a / sin(A) = 2R
  const a = Math.sqrt((bxC - cxC) ** 2 + (byC - cyC) ** 2);
  const sineRatio = R > 0 ? (a / (2 * R)).toFixed(3) : "--";

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת משולש חסום במעגל</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        שנו את צורת המשולש וראו איך המעגל החוסם משתנה
      </p>

      <svg viewBox="0 0 220 220" className="w-full max-w-sm mx-auto mb-4" aria-hidden>
        {/* Grid */}
        {[0, 44, 88, 132, 176, 220].map(v => (
          <g key={v}>
            <line x1={v} y1={0} x2={v} y2={220} stroke="rgba(100,116,139,0.12)" strokeWidth={0.5} />
            <line x1={0} y1={v < 220 ? v : 220} x2={220} y2={v < 220 ? v : 220} stroke="rgba(100,116,139,0.12)" strokeWidth={0.5} />
          </g>
        ))}
        {/* Circle */}
        <circle cx={oCx} cy={oCy} r={R} fill="rgba(234,88,12,0.06)" stroke="#EA580C" strokeWidth={2} />
        {/* Triangle */}
        <polygon points={`${axC},${ayC} ${bxC},${byC} ${cxC},${cyC}`} fill="rgba(234,88,12,0.08)" stroke="#EA580C" strokeWidth={1.5} />
        {/* Center */}
        <circle cx={oCx} cy={oCy} r={3.5} fill="#EA580C" />
        {/* Radius dashed */}
        <line x1={oCx} y1={oCy} x2={cxC} y2={cyC} stroke="#64748b" strokeWidth={1.2} strokeDasharray="4,3" />
        {/* Labels */}
        <text x={axC - 4} y={ayC + 14} textAnchor="end" fontSize={12} fontWeight={700} fill="#2D3436">A</text>
        <text x={bxC + 4} y={byC + 14} textAnchor="start" fontSize={12} fontWeight={700} fill="#2D3436">B</text>
        <text x={cxC} y={cyC - 8} textAnchor="middle" fontSize={12} fontWeight={700} fill="#2D3436">C</text>
        <text x={oCx + 8} y={oCy - 4} textAnchor="start" fontSize={11} fontWeight={600} fill="#64748b">O</text>
      </svg>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[
          { label: "רוחב בסיס", val: spread, min: 20, max: 95, step: 1, set: setSpread },
          { label: "גובה משולש", val: height, min: 20, max: 150, step: 1, set: setHeight },
        ].map(sl => (
          <div key={sl.label} style={{ borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.6)", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span><span style={{ color: "#EA580C", fontFamily: "monospace", fontWeight: 700 }}>{sl.val}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.val} onChange={e => sl.set(+e.target.value)} style={{ width: "100%", accentColor: "#EA580C" }} />
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center", fontSize: 12, marginBottom: 16 }}>
        {[
          { label: "R", val: R.toFixed(1), color: "#EA580C" },
          { label: "שטח", val: triArea.toFixed(1), color: "#f59e0b" },
          { label: "sin(A)/a ratio", val: sineRatio, color: "#a78bfa" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ borderRadius: 12, border: "1px solid rgba(234,88,12,0.25)", background: "rgba(255,255,255,0.6)", padding: "10px 8px" }}>
            <div style={{ color: "#6B7280", marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 700, color, fontSize: 11, fontFamily: "monospace" }}>{val}</div>
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "#6B7280", fontStyle: "italic" }}>
        {height < 40 ? "משולש שטוח -- המעגל החוסם גדל משמעותית" : height > 120 ? "משולש גבוה וצר -- שימו לב למיקום מרכז המעגל" : "משולש מאוזן -- R מתאים לגודל המשולש"}
      </p>
    </section>
  );
}

// ─── TangentCirclesLab (advanced) ────────────────────────────────────────────

function TangentCirclesLab() {
  const [r1, setR1] = useState(4);
  const [r2, setR2] = useState(3);

  const S = 260;
  const cx1 = 80, cy1 = 130;
  const cx2 = cx1 + (r1 + r2) * 12, cy2 = 130;
  const tx = cx1 + r1 * 12, ty = 130;

  const distO1O2 = r1 + r2;
  const tangentLength = Math.sqrt(distO1O2 * distO1O2 - (r1 - r2) * (r1 - r2));
  const angleAtT = 90;

  let interpText = "שני מעגלים משיקים חיצונית -- המשיק המשותף מאונך לקו המרכזים ב-T";
  if (r1 === r2) interpText = "מעגלים שווי רדיוס -- המשיק המשותף סימטרי";
  else if (r1 > 2 * r2) interpText = "מעגל אחד גדול בהרבה -- נקודת ההשקה קרובה למעגל הקטן";
  else if (r2 > 2 * r1) interpText = "מעגל אחד גדול בהרבה -- נקודת ההשקה קרובה למעגל הקטן";

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת שני מעגלים משיקים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        שנו את הרדיוסים וראו איך המרחק, המשיק והזווית משתנים
      </p>

      <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-sm mx-auto mb-4" aria-hidden>
        {/* Grid */}
        {[0, 52, 104, 156, 208, 260].map(v => (
          <g key={v}>
            <line x1={v} y1={0} x2={v} y2={S} stroke="rgba(100,116,139,0.12)" strokeWidth={0.5} />
            <line x1={0} y1={v < S ? v : S} x2={S} y2={v < S ? v : S} stroke="rgba(100,116,139,0.12)" strokeWidth={0.5} />
          </g>
        ))}
        {/* Circle 1 */}
        <circle cx={cx1} cy={cy1} r={r1 * 12} fill="rgba(220,38,38,0.06)" stroke="#DC2626" strokeWidth={2} />
        {/* Circle 2 */}
        <circle cx={cx2} cy={cy2} r={r2 * 12} fill="rgba(220,38,38,0.06)" stroke="#DC2626" strokeWidth={2} />
        {/* Line O1-O2 */}
        <line x1={cx1} y1={cy1} x2={cx2} y2={cy2} stroke="#64748b" strokeWidth={1.2} strokeDasharray="4,3" />
        {/* Tangent point T */}
        <circle cx={tx} cy={ty} r={4} fill="#34d399" />
        {/* Centers */}
        <circle cx={cx1} cy={cy1} r={4} fill="#DC2626" />
        <circle cx={cx2} cy={cy2} r={4} fill="#DC2626" />
        {/* Right angle indicator at T */}
        <rect x={tx - 5} y={ty - 5} width={10} height={10} fill="none" stroke="#34d399" strokeWidth={1.5} />
        {/* Labels */}
        <text x={cx1} y={cy1 + r1 * 12 + 16} textAnchor="middle" fontSize={12} fontWeight={700} fill="#2D3436">O&#x2081;</text>
        <text x={cx2} y={cy2 + r2 * 12 + 16} textAnchor="middle" fontSize={12} fontWeight={700} fill="#2D3436">O&#x2082;</text>
        <text x={tx} y={ty - 12} textAnchor="middle" fontSize={12} fontWeight={600} fill="#34d399">T</text>
      </svg>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[
          { label: "r\u2081 (רדיוס מעגל 1)", val: r1, min: 1, max: 7, step: 0.5, set: setR1 },
          { label: "r\u2082 (רדיוס מעגל 2)", val: r2, min: 1, max: 7, step: 0.5, set: setR2 },
        ].map(sl => (
          <div key={sl.label} style={{ borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.6)", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span><span style={{ color: "#DC2626", fontFamily: "monospace", fontWeight: 700 }}>{sl.val}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.val} onChange={e => sl.set(+e.target.value)} style={{ width: "100%", accentColor: "#DC2626" }} />
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center", fontSize: 12, marginBottom: 16 }}>
        {[
          { label: "O\u2081O\u2082", val: distO1O2.toFixed(1), color: "#64748b" },
          { label: "אורך משיק", val: tangentLength.toFixed(1), color: "#a78bfa" },
          { label: "זווית ב-T", val: `${angleAtT}\u00B0`, color: "#34d399" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.25)", background: "rgba(255,255,255,0.6)", padding: "10px 8px" }}>
            <div style={{ color: "#6B7280", marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 700, color, fontSize: 11, fontFamily: "monospace" }}>{val}</div>
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "#6B7280", fontStyle: "italic" }}>{interpText}</p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProblemsPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>בעיות בגיאומטריה אנליטית עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>דלתון, משולש חסום במעגל, שני מעגלים משיקים -- ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/topic/analytic"
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

        <SubtopicProgress subtopicId="analytic/problems" />

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

        {/* Lab per level */}
        {selectedLevel === "basic" && <DeltoidLab />}
        {selectedLevel === "medium" && <CircumscribedLab />}
        {selectedLevel === "advanced" && <TangentCirclesLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="analytic/problems" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
