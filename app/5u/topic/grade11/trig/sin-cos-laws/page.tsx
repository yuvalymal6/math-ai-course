"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";

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
  // Triangle with two sides marked (b, c) and included angle A. Side a = "?"
  return (
    <svg viewBox="0 0 260 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Triangle edges */}
      <polygon points="130,30 40,170 220,170" fill="none" stroke="#94a3b8" strokeWidth={2} />
      {/* Side a (opposite A) — bottom, unknown */}
      <text x="130" y="190" fontSize={14} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>a = ?</text>
      {/* Side b (left) */}
      <text x="72" y="95" fontSize={13} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>b</text>
      {/* Side c (right) */}
      <text x="188" y="95" fontSize={13} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>c</text>
      {/* Angle A arc at top vertex */}
      <path d="M 120,50 Q 130,40 140,50" fill="none" stroke="#34d399" strokeWidth={1.5} />
      {/* Vertex labels */}
      <text x="130" y="22" fontSize={13} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>A</text>
      <text x="30" y="180" fontSize={13} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>B</text>
      <text x="230" y="180" fontSize={13} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>C</text>
      {/* Angle label */}
      <text x="130" y="60" fontSize={11} fill="#34d399" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>A</text>
    </svg>
  );
}

function MediumSVG() {
  // Two possible triangles (ambiguous case SSA) — solid + dashed
  return (
    <svg viewBox="0 0 300 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* First triangle (solid) */}
      <polygon points="50,170 250,170 180,50" fill="none" stroke="#94a3b8" strokeWidth={2} />
      {/* Second triangle (dashed — ambiguous) */}
      <line x1="50" y1="170" x2="120" y2="50" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="6,3" />
      <line x1="120" y1="50" x2="250" y2="170" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="6,3" />
      {/* Side a */}
      <text x="220" y="105" fontSize={13} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>a</text>
      {/* Side b */}
      <text x="105" y="105" fontSize={13} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>b</text>
      {/* Angle A */}
      <path d="M 65,160 Q 58,155 60,145" fill="none" stroke="#34d399" strokeWidth={1.5} />
      <text x="70" y="145" fontSize={11} fill="#34d399" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>A</text>
      {/* Unknown angle labels */}
      <text x="180" y="42" fontSize={12} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?&#x2081;</text>
      <text x="115" y="42" fontSize={12} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?&#x2082;</text>
      {/* Vertex labels */}
      <text x="42" y="185" fontSize={13} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>A</text>
      <text x="258" y="185" fontSize={13} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>C</text>
      <text x="180" y="38" fontSize={10} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">B</text>
      <text x="115" y="38" fontSize={10} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">{"B'"}</text>
    </svg>
  );
}

function AdvancedSVG() {
  // Quadrilateral ABCD with dashed diagonal AC
  return (
    <svg viewBox="0 0 280 220" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Quadrilateral outline */}
      <polygon points="60,40 230,60 250,180 40,170" fill="none" stroke="#94a3b8" strokeWidth={2} />
      {/* Diagonal AC (dashed) */}
      <line x1="60" y1="40" x2="250" y2="180" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="6,3" />
      {/* Triangle ABC fill hint */}
      <polygon points="60,40 230,60 250,180" fill="#34d399" opacity={0.08} />
      {/* Triangle ACD fill hint */}
      <polygon points="60,40 250,180 40,170" fill="#f59e0b" opacity={0.08} />
      {/* Vertex labels */}
      <text x="52" y="30" fontSize={14} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>A</text>
      <text x="240" y="52" fontSize={14} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>B</text>
      <text x="260" y="195" fontSize={14} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>C</text>
      <text x="30" y="182" fontSize={14} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>D</text>
      {/* AC label */}
      <text x="165" y="100" fontSize={12} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>AC</text>
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
        subjectWords={["סינוסים", "קוסינוסים", "משולש", "זווית", "צלע", "שטח"]}
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
    title: "משפט הקוסינוסים — מציאת צלע וזווית",
    problem: "במשולש ABC נתונים:\nb = 5, c = 8, זווית A = 60°.\n\nא. הציגו את משפט הקוסינוסים a² = b² + c² - 2bc·cos A. הציבו את הנתונים וחשבו את a.\nב. שינוי תנאי: כעת a = 10, b = 6, c = 8, וזווית A נסתרת. הציבו בנוסחה ומצאו את cos A ואת זווית A.\nג. הסבירו: מדוע כשזווית A = 90° משפט הקוסינוסים הופך למשפט פיתגורס? נמקו בעזרת cos 90° = 0.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "שכחת סימן המינוס בנוסחה", text: "בנוסחה a² = b² + c² - 2bc·cos A יש מינוס! תלמידים רבים כותבים + במקום - וזה משנה לחלוטין את התוצאה. שימו לב: אם A חדה, cos A חיובי ולכן המינוס מקטין. אם A קהה, cos A שלילי ואז המינוס הופך לחיבור." },
      { title: "העלאה בריבוע של כל איבר בנפרד", text: "הביטוי 2bc·cos A הוא מכפלה אחת שלמה — לא מרבעים כל חלק בנפרד! תלמידים טועים וכותבים 4b²c²cos²A במקום לחשב 2·b·c·cos(A) כמכפלה פשוטה." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יא', 5 יחידות, ומצרף/ת שאלה בטריגונומטריה על משפט הקוסינוסים — מציאת צלע וזווית נסתרת.
אני רוצה שתהיה המורה הפרטי שלי — תנחה אותי שלב אחר שלב.
אל תפתור עבורי — שאל אותי שאלות מכוונות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: "אני מוכן להמשיך."`,
    steps: [
      { phase: "סעיף א׳", label: "הצבה וחישוב a", coaching: "", prompt: "יש לי משולש ABC עם b = 5, c = 8, זווית A = 60°. תנחה אותי לרשום את משפט הקוסינוסים ולהציב את הנתונים.", keywords: [], keywordHint: "", contextWords: ["קוסינוסים", "נוסחה", "60", "5", "8", "הצבה"] },
      { phase: "סעיף ב׳", label: "מציאת זווית נסתרת", coaching: "", prompt: "מצאתי את a. עכשיו נתונים a = 10, b = 6, c = 8 וזווית A נסתרת. תנחה אותי לבודד את cos A מהנוסחה ולמצוא את זווית A.", keywords: [], keywordHint: "", contextWords: ["cos", "נסתרת", "10", "6", "8", "זווית"] },
      { phase: "סעיף ג׳", label: "קישור לפיתגורס", coaching: "", prompt: "עכשיו כשיש לי A = 90°, תנחה אותי להסביר מדוע cos 90° = 0 הופך את משפט הקוסינוסים למשפט פיתגורס.", keywords: [], keywordHint: "", contextWords: ["פיתגורס", "cos", "90", "אפס", "הוכחה", "נמקו"] },
    ],
  },
  {
    id: "medium",
    title: "משפט הסינוסים — מציאת זווית + מקרה דו-משמעי",
    problem: "במשולש נתונים:\nצלע a, צלע b, וזווית A (מול צלע a).\n(מקרה SSA — צלע-צלע-זווית)\n\nא. השתמשו במשפט הסינוסים: sin B = b·sin A / a. חשבו את sin B.\nב. קבעו: האם ישנם 0, 1 או 2 משולשים אפשריים?\nג. מצאו את כל הערכים האפשריים של זווית B ושל זווית C המתאימה.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "שכחת הזווית השנייה B' = 180° - B", text: "כאשר sin B = k (ו-0 < k < 1), ישנן שתי זוויות אפשריות: B ו-B' = 180° - B. תלמידים רבים מוצאים רק את B ושוכחים לבדוק את B'. זה הבסיס של המקרה הדו-משמעי!" },
      { title: "שכחת הבדיקה B + A < 180°", text: "גם אם B' = 180° - B קיימת מתמטית, היא תקפה רק אם B' + A < 180°. אם הסכום עולה על 180°, אין מקום לזווית C ולכן המשולש השני לא קיים. תמיד בדקו!" },
    ],
    goldenPrompt: `אני בכיתה יא', 5 יחידות, מצרף/ת תרגיל בטריגונומטריה על משפט הסינוסים והמקרה הדו-משמעי (SSA).
אני רוצה שתהיה המדריך שלי — שאל אותי שאלות מנחות על הנוסחה, על שתי הזוויות האפשריות ועל בדיקת התקפות.
אל תפתור עבורי ואל תיתן לי את החישוב.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: "אני מוכן להמשיך."`,
    steps: [
      { phase: "סעיף א׳", label: "חישוב sin B", coaching: "", prompt: "במשולש נתונים a, b וזווית A. תנחה אותי להשתמש במשפט הסינוסים sin B = b·sin A / a ולחשב את sin B.", keywords: [], keywordHint: "", contextWords: ["סינוסים", "sin", "נוסחה", "זווית", "צלע", "B"] },
      { phase: "סעיף ב׳", label: "כמה משולשים אפשריים?", coaching: "", prompt: "חישבתי sin B. תדריך אותי לקבוע אם יש 0, 1 או 2 משולשים — מה קורה אם sin B > 1? אם sin B = 1? אם 0 < sin B < 1?", keywords: [], keywordHint: "", contextWords: ["דו-משמעי", "אפשרויות", "משולש", "sin", "קיום", "פתרונות"] },
      { phase: "סעיף ג׳", label: "מציאת B, B' ו-C", coaching: "", prompt: "יש שני פתרונות אפשריים: B ו-B' = 180° - B. תנחה אותי למצוא את שניהם, לבדוק ש-B + A < 180° ולחשב את C לכל מקרה.", keywords: [], keywordHint: "", contextWords: ["180", "זווית", "משלים", "C", "בדיקה", "סכום"] },
    ],
  },
  {
    id: "advanced",
    title: "שילוב שני המשפטים + שטח",
    problem: "מרובע ABCD עם אלכסון AC.\nנתונים צלעות וזוויות מסוימים.\n\nא. במשולש ABC, השתמשו במשפט הקוסינוסים כדי למצוא את AC.\nב. במשולש ACD, השתמשו במשפט הסינוסים כדי למצוא את זווית D.\nג. חשבו את שטח כל משולש לפי S = ½ab·sin C.\nד. מצאו את השטח הכולל של המרובע.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "שכחת לפרק את המרובע לשני משולשים", text: "מרובע כללי אי אפשר לחשב ישירות — חייבים לפרק אותו לשני משולשים דרך אלכסון. ודאו שאתם יודעים אילו נתונים שייכים לכל משולש בנפרד!" },
      { title: "שימוש בזווית הלא נכונה בנוסחת השטח", text: "בנוסחה S = ½ab·sin C, הזווית C חייבת להיות הזווית הכלואה בין שתי הצלעות a ו-b. תלמידים לוקחים זווית אחרת ומקבלים תוצאה שגויה." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט מפורט שמסביר: כיצד מפרקים מרובע לשני משולשים ומשלבים את משפטי הסינוסים והקוסינוסים לחישוב שטח? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "מציאת AC (קוסינוסים)", coaching: "", prompt: "במרובע ABCD עם אלכסון AC, במשולש ABC נתונים צלעות וזווית. תנחה אותי להשתמש במשפט הקוסינוסים כדי למצוא את אורך AC.", keywords: [], keywordHint: "", contextWords: ["קוסינוסים", "אלכסון", "AC", "משולש", "צלע", "הצבה"] },
      { phase: "סעיף ב׳", label: "מציאת זווית D (סינוסים)", coaching: "", prompt: "מצאתי את AC. עכשיו במשולש ACD, תדריך אותי להשתמש במשפט הסינוסים כדי למצוא את זווית D.", keywords: [], keywordHint: "", contextWords: ["סינוסים", "זווית", "D", "משולש", "ACD", "נוסחה"] },
      { phase: "סעיף ג׳", label: "שטח כל משולש", coaching: "", prompt: "תנחה אותי לחשב את שטח משולש ABC ואת שטח משולש ACD לפי הנוסחה S = ½ab·sin C — איזו זווית כלואה בכל משולש?", keywords: [], keywordHint: "", contextWords: ["שטח", "sin", "כלואה", "חצי", "מכפלה", "נוסחה"] },
      { phase: "סעיף ד׳", label: "שטח כולל", coaching: "", prompt: "חישבתי שטח לכל משולש. תסביר לי למה סכום שני השטחים נותן את שטח המרובע, ותנחה אותי לחבר.", keywords: [], keywordHint: "", contextWords: ["סכום", "מרובע", "שטח", "כולל", "חיבור", "ABCD"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📐 משפט הסינוסים והקוסינוסים (Sine & Cosine Laws)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "משפט הקוסינוסים — מציאת צלע (SAS) ומציאת זווית נסתרת, עם קישור למשפט פיתגורס."}
            {ex.id === "medium" && "משפט הסינוסים והמקרה הדו-משמעי (SSA) — כמה משולשים אפשריים ומציאת כל הזוויות."}
            {ex.id === "advanced" && "שילוב שני המשפטים למציאת אלכסון, זוויות ושטח מרובע."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: Formulas */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>נוסחאות מפתח</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>קוסינוסים</span>
              <span>a² = b² + c² - 2bc·cos A</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>סינוסים</span>
              <span>a/sin A = b/sin B = c/sin C</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>שטח</span>
              <span>S = ½ab·sin C</span>
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
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>SSA</span>
                  <span>מקרה דו-משמעי — ייתכנו 0, 1 או 2 משולשים.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>sin B &gt; 1</span>
                  <span>אין משולש — הנתונים סותרים.</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>שילוב משפטים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>פירוק</span>
                  <span>מרובע = שני משולשים דרך אלכסון</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>שטח כולל</span>
                  <span>S(ABCD) = S(ABC) + S(ACD)</span>
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

// ─── CosineLawLab (basic) — 3 sliders ───────────────────────────────────────

function CosineLawLab() {
  const [b, setB] = useState(7);
  const [c, setC] = useState(10);
  const [angleA, setAngleA] = useState(60);
  const st = STATION.basic;

  const radA = (angleA * Math.PI) / 180;
  const a2 = b * b + c * c - 2 * b * c * Math.cos(radA);
  const a = a2 > 0 ? Math.sqrt(a2) : 0;
  const isPythag = Math.abs(angleA - 90) < 0.5;

  // For dynamic triangle SVG
  const triW = 260, triH = 200;

  return (
    <section style={{ border: "1px solid rgba(22,163,74,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת משפט הקוסינוסים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את צלעות b, c ואת זווית A וצפו כיצד הצלע a משתנה בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>צלע b</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{b}</span>
          </div>
          <input type="range" min={1} max={20} step={1} value={b} onChange={(e) => setB(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>צלע c</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{c}</span>
          </div>
          <input type="range" min={1} max={20} step={1} value={c} onChange={(e) => setC(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>זווית A</span>
            <span style={{ color: "#34d399", fontFamily: "monospace", fontWeight: 700 }}>{angleA}°</span>
          </div>
          <input type="range" min={10} max={170} step={1} value={angleA} onChange={(e) => setAngleA(+e.target.value)} style={{ width: "100%", accentColor: "#34d399" }} />
        </div>
      </div>

      {/* Dynamic Triangle SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(22,163,74,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${triW} ${triH}`} className="w-full max-w-md mx-auto" aria-hidden>
          {(() => {
            // Dynamic triangle: B at bottom-left, C at bottom-right, A computed
            const Bpx = 40, Bpy = 170;
            const Cpx = 220, Cpy = 170;
            // A is at angle from B side
            const maxSide = Math.max(b, c, 1);
            const sB = (c / maxSide) * 130;
            const sC = (b / maxSide) * 130;
            const Apx = Bpx + sB * Math.cos(radA);
            const Apy = Bpy - sB * Math.sin(radA > 0 ? radA : 0.1);
            return (
              <>
                <polygon points={`${Apx},${Apy} ${Bpx},${Bpy} ${Cpx},${Cpy}`} fill="none" stroke="#94a3b8" strokeWidth={2} />
                {/* Side labels */}
                <text x={(Bpx + Cpx) / 2} y={Bpy + 16} fontSize={12} fill="#a78bfa" textAnchor="middle" fontWeight={700}>{`a = ${a.toFixed(1)}`}</text>
                <text x={(Apx + Bpx) / 2 - 12} y={(Apy + Bpy) / 2} fontSize={11} fill="#f59e0b" textAnchor="middle" fontWeight={600}>{`b = ${b}`}</text>
                <text x={(Apx + Cpx) / 2 + 12} y={(Apy + Cpy) / 2} fontSize={11} fill="#f59e0b" textAnchor="middle" fontWeight={600}>{`c = ${c}`}</text>
                {/* Angle arc */}
                <path d={`M ${Apx + 15},${Apy + 5} Q ${Apx + 5},${Apy + 12} ${Apx - 5},${Apy + 10}`} fill="none" stroke="#34d399" strokeWidth={1.5} />
                <text x={Apx} y={Apy - 8} fontSize={12} fill="#1A1A1A" textAnchor="middle" fontWeight={700}>A</text>
                <text x={Bpx - 8} y={Bpy + 6} fontSize={12} fill="#1A1A1A" textAnchor="middle" fontWeight={700}>B</text>
                <text x={Cpx + 8} y={Cpy + 6} fontSize={12} fill="#1A1A1A" textAnchor="middle" fontWeight={700}>C</text>
              </>
            );
          })()}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "a (צלע)", val: a.toFixed(2), color: st.accentColor },
          { label: "a²", val: a2.toFixed(1), color: st.accentColor },
          { label: "בדיקת פיתגורס", val: isPythag ? "A = 90° ✓" : `A = ${angleA}° (לא 90°)`, color: isPythag ? "#16a34a" : "#6B7280" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(22,163,74,0.4)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: row.color, fontWeight: 700, fontSize: row.label === "בדיקת פיתגורס" ? 13 : 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>הזיזו את זווית A ל-90° ובדקו — הנוסחה הופכת למשפט פיתגורס!</p>
    </section>
  );
}

// ─── AmbiguousLab (medium) — 3 sliders ──────────────────────────────────────

function AmbiguousLab() {
  const [a, setA] = useState(10);
  const [bVal, setBVal] = useState(8);
  const [angleA, setAngleA] = useState(40);
  const st = STATION.medium;

  const radA = (angleA * Math.PI) / 180;
  const sinB = (bVal * Math.sin(radA)) / a;

  let solutions = 0;
  let B1 = 0, B2 = 0, C1 = 0, C2 = 0;

  if (sinB > 1 + 1e-9) {
    solutions = 0;
  } else if (Math.abs(sinB - 1) < 1e-9) {
    solutions = 1;
    B1 = 90;
    C1 = 180 - angleA - B1;
    if (C1 <= 0) solutions = 0;
  } else if (sinB > 0) {
    B1 = (Math.asin(sinB) * 180) / Math.PI;
    B2 = 180 - B1;
    C1 = 180 - angleA - B1;
    C2 = 180 - angleA - B2;
    if (C1 > 0 && C2 > 0) {
      solutions = 2;
    } else if (C1 > 0) {
      solutions = 1;
    } else {
      solutions = 0;
    }
  }

  const solutionLabel = solutions === 0 ? "אין משולש!" : solutions === 1 ? "משולש אחד" : "שני משולשים!";
  const solutionColor = solutions === 0 ? "#DC2626" : solutions === 1 ? "#EA580C" : "#16A34A";

  return (
    <section style={{ border: "1px solid rgba(234,88,12,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת המקרה הדו-משמעי</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את a, b ואת זווית A — כמה משולשים אפשריים?</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>צלע a</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{a}</span>
          </div>
          <input type="range" min={1} max={20} step={0.5} value={a} onChange={(e) => setA(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>צלע b</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{bVal}</span>
          </div>
          <input type="range" min={1} max={20} step={0.5} value={bVal} onChange={(e) => setBVal(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>זווית A</span>
            <span style={{ color: "#34d399", fontFamily: "monospace", fontWeight: 700 }}>{angleA}°</span>
          </div>
          <input type="range" min={5} max={175} step={1} value={angleA} onChange={(e) => setAngleA(+e.target.value)} style={{ width: "100%", accentColor: "#34d399" }} />
        </div>
      </div>

      {/* Dynamic SVG showing triangles */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(234,88,12,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 280 180" className="w-full max-w-md mx-auto" aria-hidden>
          {(() => {
            const Apx = 40, Apy = 150;
            if (solutions === 0) {
              return (
                <>
                  <line x1={Apx} y1={Apy} x2={240} y2={Apy} stroke="#94a3b8" strokeWidth={1.5} />
                  <line x1={Apx} y1={Apy} x2={Apx + 80 * Math.cos(radA)} y2={Apy - 80 * Math.sin(radA)} stroke="#f59e0b" strokeWidth={1.5} />
                  <text x={140} y={90} fontSize={14} fill="#DC2626" textAnchor="middle" fontWeight={700}>אין פתרון</text>
                  <text x={Apx - 4} y={Apy + 16} fontSize={12} fill="#1A1A1A" textAnchor="middle" fontWeight={700}>A</text>
                </>
              );
            }
            // First triangle
            const maxSide = Math.max(a, bVal, 1);
            const sA = (a / maxSide) * 110;
            const sB_len = (bVal / maxSide) * 110;
            const B1rad = (B1 * Math.PI) / 180;
            const Cpx1 = Apx + sA * 1.5;
            const Cpy1 = Apy;
            const Bpx1 = Apx + sB_len * Math.cos(radA);
            const Bpy1 = Apy - sB_len * Math.sin(radA);
            return (
              <>
                <polygon points={`${Apx},${Apy} ${Bpx1},${Bpy1} ${Cpx1},${Cpy1}`} fill="rgba(234,88,12,0.08)" stroke="#EA580C" strokeWidth={1.5} />
                <text x={Apx - 6} y={Apy + 16} fontSize={11} fill="#1A1A1A" textAnchor="middle" fontWeight={700}>A</text>
                <text x={Bpx1} y={Bpy1 - 8} fontSize={11} fill="#1A1A1A" textAnchor="middle" fontWeight={700}>B</text>
                <text x={Cpx1 + 6} y={Cpy1 + 16} fontSize={11} fill="#1A1A1A" textAnchor="middle" fontWeight={700}>C</text>
                {solutions === 2 && (
                  <>
                    {/* Second possible triangle (dashed) */}
                    <polygon
                      points={`${Apx},${Apy} ${Apx + sB_len * Math.cos(radA) * 0.6},${Apy - sB_len * Math.sin(radA) * 0.6} ${Cpx1},${Cpy1}`}
                      fill="rgba(167,139,250,0.08)" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="6,3"
                    />
                    <text x={Apx + sB_len * Math.cos(radA) * 0.6} y={Apy - sB_len * Math.sin(radA) * 0.6 - 8} fontSize={10} fill="#a78bfa" textAnchor="middle" fontWeight={700}>B'</text>
                  </>
                )}
              </>
            );
          })()}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(234,88,12,0.4)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>sin B</div>
          <div style={{ color: sinB > 1 ? "#DC2626" : st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{sinB.toFixed(3)}</div>
        </div>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(234,88,12,0.4)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>מספר פתרונות</div>
          <div style={{ color: solutionColor, fontWeight: 700, fontSize: 16, fontFamily: "monospace" }}>{solutionLabel}</div>
        </div>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(234,88,12,0.4)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>ערכי B</div>
          <div style={{ color: st.accentColor, fontWeight: 700, fontSize: solutions === 2 ? 13 : 16, fontFamily: "monospace" }}>
            {solutions === 0 ? "---" : solutions === 1 ? `${B1.toFixed(1)}°` : `${B1.toFixed(1)}° / ${B2.toFixed(1)}°`}
          </div>
        </div>
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>כש-sin B &gt; 1 אין משולש! הגדילו את a או הקטינו b כדי לראות מעבר בין 0, 1, ו-2 פתרונות.</p>
    </section>
  );
}

// ─── QuadAreaLab (advanced) — 2 sliders ─────────────────────────────────────

function QuadAreaLab() {
  const [diagLen, setDiagLen] = useState(12);
  const [angleD, setAngleD] = useState(55);
  const st = STATION.advanced;

  // Fixed sides for simplicity: triangle ABC with known sides and angle, triangle ACD with diagonal and angle D
  const abcBase = 8, abcSide = 9, abcAngle = 50; // fixed for ABC
  const radABC = (abcAngle * Math.PI) / 180;
  const radD = (angleD * Math.PI) / 180;

  const areaABC = 0.5 * abcBase * abcSide * Math.sin(radABC);
  // ACD: sides = diagLen, some side, angle D
  const acdSide = 7; // fixed
  const areaACD = 0.5 * diagLen * acdSide * Math.sin(radD);
  const totalArea = areaABC + areaACD;

  return (
    <section style={{ border: "1px solid rgba(220,38,38,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת שטח מרובע</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את אורך האלכסון ואת זווית D וצפו כיצד שטח כל משולש ושטח המרובע הכולל משתנים.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>אלכסון AC</span>
            <span style={{ color: "#a78bfa", fontFamily: "monospace", fontWeight: 700 }}>{diagLen}</span>
          </div>
          <input type="range" min={4} max={20} step={0.5} value={diagLen} onChange={(e) => setDiagLen(+e.target.value)} style={{ width: "100%", accentColor: "#a78bfa" }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>זווית D</span>
            <span style={{ color: "#34d399", fontFamily: "monospace", fontWeight: 700 }}>{angleD}°</span>
          </div>
          <input type="range" min={10} max={170} step={1} value={angleD} onChange={(e) => setAngleD(+e.target.value)} style={{ width: "100%", accentColor: "#34d399" }} />
        </div>
      </div>

      {/* Dynamic Quadrilateral SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(220,38,38,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 280 220" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Quadrilateral vertices */}
          <polygon points="60,40 230,60 250,180 40,170" fill="none" stroke="#94a3b8" strokeWidth={2} />
          {/* Diagonal AC (dashed) */}
          <line x1="60" y1="40" x2="250" y2="180" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="6,3" />
          {/* Triangle ABC fill */}
          <polygon points="60,40 230,60 250,180" fill="#34d399" opacity={0.12} />
          {/* Triangle ACD fill */}
          <polygon points="60,40 250,180 40,170" fill="#f59e0b" opacity={0.12} />
          {/* Labels */}
          <text x="52" y="30" fontSize={14} fill="#1A1A1A" textAnchor="middle" fontWeight={700}>A</text>
          <text x="240" y="52" fontSize={14} fill="#1A1A1A" textAnchor="middle" fontWeight={700}>B</text>
          <text x="260" y="195" fontSize={14} fill="#1A1A1A" textAnchor="middle" fontWeight={700}>C</text>
          <text x="30" y="182" fontSize={14} fill="#1A1A1A" textAnchor="middle" fontWeight={700}>D</text>
          <text x="165" y="100" fontSize={12} fill="#a78bfa" textAnchor="middle" fontWeight={600}>AC = {diagLen}</text>
          {/* Area labels */}
          <text x="170" y="85" fontSize={10} fill="#34d399" textAnchor="middle" fontWeight={600}>{areaABC.toFixed(1)}</text>
          <text x="100" y="145" fontSize={10} fill="#f59e0b" textAnchor="middle" fontWeight={600}>{areaACD.toFixed(1)}</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(52,211,153,0.4)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>שטח △ABC</div>
          <div style={{ color: "#34d399", fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{areaABC.toFixed(1)}</div>
        </div>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(245,158,11,0.4)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>שטח △ACD</div>
          <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{areaACD.toFixed(1)}</div>
        </div>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(220,38,38,0.4)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>שטח כולל ABCD</div>
          <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{totalArea.toFixed(1)}</div>
        </div>
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>הגדילו את זווית D ל-90° — השטח מגיע למקסימום! כי sin(90°) = 1.</p>
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
  const [activeTab, setActiveTab] = useState<"cosine" | "sine" | "area" | null>(null);

  const tabs = [
    { id: "cosine" as const, label: "משפט הקוסינוסים", tex: "a^2", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "sine" as const, label: "משפט הסינוסים", tex: "\\frac{a}{\\sin A}", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "area" as const, label: "שטח משולש", tex: "S", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: Cosine Law */}
      {activeTab === "cosine" && (
        <motion.div key="cosine" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"a^2 = b^2 + c^2 - 2bc \\cdot \\cos A"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מתי משתמשים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>נתונות שתי צלעות וזווית כלואה (SAS) — מוצאים צלע שלישית.</li>
                  <li>נתונות שלוש צלעות (SSS) — מוצאים זווית.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                כשזווית A = 90° הנוסחה הופכת למשפט פיתגורס: a² = b² + c²
              </div>
              <div style={{ marginTop: 10, borderTop: "1px solid rgba(22,163,74,0.15)", paddingTop: 10, color: "#166534", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: b=5, c=8, A=60° → a² = 25+64−40 = 49 → a = 7
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Sine Law */}
      {activeTab === "sine" && (
        <motion.div key="sine" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מתי משתמשים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>נתונה צלע והזווית שמולה + עוד צלע או זווית.</li>
                  <li>שימושי למציאת זוויות חסרות.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                זהירות — מקרה SSA! אם sin B &lt; 1, ייתכנו שני פתרונות (B ו-180°-B). תמיד בדקו!
              </div>
              <div style={{ marginTop: 10, borderTop: "1px solid rgba(234,88,12,0.15)", paddingTop: 10, color: "#92400e", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: a=10, b=8, A=40° → sin B = 8·sin40°/10 ≈ 0.514 → B ≈ 31°
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Area */}
      {activeTab === "area" && (
        <motion.div key="area" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S = \\frac{1}{2} ab \\cdot \\sin C"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מה הנוסחה אומרת?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>שטח משולש = חצי מכפלת שתי צלעות כפול סינוס הזווית הכלואה.</li>
                  <li>הזווית C חייבת להיות הזווית בין צלעות a ו-b.</li>
                  <li>ניתן לחשב עם כל זוג צלעות + הזווית הכלואה שלהם.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                קשר למשפטים: לאחר מציאת צלעות וזוויות (סינוסים/קוסינוסים), ניתן תמיד לחשב שטח!
              </div>
              <div style={{ marginTop: 10, borderTop: "1px solid rgba(220,38,38,0.15)", paddingTop: 10, color: "#991b1b", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: a=6, b=8, C=30° → S = ½·6·8·sin30° = 24·0.5 = 12
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SineCosLawsPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>משפט הסינוסים והקוסינוסים עם AI — כיתה יא׳ (5 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>מציאת צלעות וזוויות, המקרה הדו-משמעי, שטח באמצעות סינוס — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/5u/topic/grade11/trig"
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

        <SubtopicProgress subtopicId="5u/grade11/trig/sin-cos-laws" />

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
        {selectedLevel === "basic" && <CosineLawLab />}
        {selectedLevel === "medium" && <AmbiguousLab />}
        {selectedLevel === "advanced" && <QuadAreaLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="5u/grade11/trig/sin-cos-laws" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
