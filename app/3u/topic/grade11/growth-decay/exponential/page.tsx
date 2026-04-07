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
  // Exponential growth curve — no numbers
  const pts: [number, number][] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    pts.push([30 + t * 220, 120 - Math.pow(t, 2.2) * 100]);
  }
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const dots = [0.15, 0.35, 0.55, 0.75, 0.92];
  return (
    <svg viewBox="0 0 280 150" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={30} y1={125} x2={255} y2={125} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={30} y1={15} x2={30} y2={125} stroke="#94a3b8" strokeWidth={1.5} />
      <path d={pathD} fill="none" stroke="#16A34A" strokeWidth={2.5} opacity={0.7} />
      {dots.map((t, i) => (
        <circle key={i} cx={30 + t * 220} cy={120 - Math.pow(t, 2.2) * 100} r={4.5} fill="#16A34A" opacity={0.8} />
      ))}
      <text x={255} y={140} fontSize={10} fill="#94a3b8" textAnchor="end" fontFamily="sans-serif">t</text>
      <text x={18} y={20} fontSize={10} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">N</text>
      <text x={142} y={12} fontSize={10} fill="#16A34A" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">?</text>
    </svg>
  );
}

function MediumSVG() {
  // Decay curve — no numbers
  const pts: [number, number][] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    pts.push([30 + t * 220, 25 + Math.pow(t, 0.45) * 95]);
  }
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const dots = [0.1, 0.3, 0.5, 0.7, 0.9];
  return (
    <svg viewBox="0 0 280 150" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={30} y1={125} x2={255} y2={125} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={30} y1={15} x2={30} y2={125} stroke="#94a3b8" strokeWidth={1.5} />
      <path d={pathD} fill="none" stroke="#EA580C" strokeWidth={2.5} opacity={0.7} />
      {dots.map((t, i) => (
        <circle key={i} cx={30 + t * 220} cy={25 + Math.pow(t, 0.45) * 95} r={4.5} fill="#EA580C" opacity={0.8} />
      ))}
      <text x={255} y={140} fontSize={10} fill="#94a3b8" textAnchor="end" fontFamily="sans-serif">t</text>
      <text x={18} y={20} fontSize={10} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">V</text>
      <text x={142} y={12} fontSize={10} fill="#EA580C" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">?</text>
    </svg>
  );
}

function AdvancedSVG() {
  // Two curves crossing — no numbers
  const ptsA: [number, number][] = [];
  const ptsB: [number, number][] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    ptsA.push([30 + t * 220, 90 - Math.pow(t, 1.3) * 50]);
    ptsB.push([30 + t * 220, 105 - Math.pow(t, 1.6) * 75]);
  }
  const pathA = ptsA.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const pathB = ptsB.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  // Approximate intersection
  const crossX = 30 + 0.72 * 220;
  const crossY = 90 - Math.pow(0.72, 1.3) * 50;
  return (
    <svg viewBox="0 0 280 150" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={30} y1={125} x2={255} y2={125} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={30} y1={15} x2={30} y2={125} stroke="#94a3b8" strokeWidth={1.5} />
      <path d={pathA} fill="none" stroke="#16A34A" strokeWidth={2.2} opacity={0.7} />
      <path d={pathB} fill="none" stroke="#DC2626" strokeWidth={2.2} opacity={0.7} />
      <line x1={crossX} y1={crossY - 12} x2={crossX} y2={crossY + 12} stroke="#f59e0b" strokeWidth={1.8} strokeDasharray="4,3" />
      <text x={crossX} y={crossY - 16} fontSize={12} fill="#f59e0b" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">?</text>
      <text x={240} y={50} fontSize={9} fill="#16A34A" fontWeight={700} textAnchor="start" fontFamily="sans-serif">A</text>
      <text x={240} y={28} fontSize={9} fill="#DC2626" fontWeight={700} textAnchor="start" fontFamily="sans-serif">B</text>
      <text x={255} y={140} fontSize={10} fill="#94a3b8" textAnchor="end" fontFamily="sans-serif">t</text>
      <text x={18} y={20} fontSize={10} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">N</text>
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
        subjectWords={["גדילה", "דעיכה", "אחוז", "מודל", "מעריכי", "q"]}
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
    title: "גדילה באחוז קבוע",
    problem: "תרבית חיידקים מכפילה את עצמה כל שעה. כמות ההתחלה: 500 חיידקים.\n\nא. כתבו את נוסחת הגדילה N(t) = N₀ · qᵗ.\nב. חשבו את כמות החיידקים לאחר 3 שעות.\nג. לאחר כמה שעות כמות החיידקים תעלה על 10,000?",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בין q לאחוז הגדילה", text: "כשאומרים \"מכפילה את עצמה\" — הכפלה פירושה q=2, לא q=100%. יש להבדיל בין קצב הגדילה (r) לבין מכפיל הגדילה (q=1+r). הכפלה = גדילה של 100%, כלומר q=2." },
      { title: "⚠️ שוכחים את הכמות ההתחלתית", text: "הנוסחה N(t)=N₀·qᵗ דורשת הצבת ערך התחלתי. תלמידים רבים כותבים רק qᵗ ושוכחים להכפיל ב-N₀. ללא הערך ההתחלתי — התוצאה חסרת משמעות." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יא', 3 יחידות, ומצרף/ת שאלה בגדילה ודעיכה מעריכית — גדילה באחוז קבוע. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "כתיבת נוסחת הגדילה", coaching: "", prompt: "תרבית חיידקים מכפילה את עצמה כל שעה, כמות התחלתית 500. תנחה אותי לזהות את N₀ ואת q ולכתוב את נוסחת הגדילה N(t)=N₀·qᵗ.", keywords: [], keywordHint: "", contextWords: ["נוסחה", "גדילה", "q", "N₀", "חזקה", "הכפלה"] },
      { phase: "סעיף ב׳", label: "חישוב לאחר 3 שעות", coaching: "", prompt: "תרבית חיידקים מכפילה את עצמה כל שעה, כמות התחלתית 500. תדריך אותי להציב t=3 בנוסחה ולחשב את הכמות לאחר 3 שעות.", keywords: [], keywordHint: "", contextWords: ["הצבה", "חזקה", "שעות", "כמות", "חישוב", "נוסחה"] },
      { phase: "סעיף ג׳", label: "מציאת זמן חציית 10,000", coaching: "", prompt: "תרבית חיידקים מכפילה את עצמה כל שעה, כמות התחלתית 500. תכווין אותי למצוא לאחר כמה שעות הכמות תעלה על 10,000 — באמצעות ניסוי וטעייה או לוגריתם.", keywords: [], keywordHint: "", contextWords: ["אי-שוויון", "לוגריתם", "זמן", "חריגה", "ניסוי", "הצבה"] },
    ],
  },
  {
    id: "medium",
    title: "דעיכה — פחת רכב",
    problem: "רכב נרכש ב-120,000 ₪ ומאבד 15% מערכו כל שנה.\n\nא. זהו את q — מכפיל הדעיכה.\nב. כתבו את פונקציית הערך V(t).\nג. לאחר כמה שנים ערך הרכב יירד מתחת ל-50,000 ₪?",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ שימוש ב-q=0.15 במקום q=0.85", text: "כשאומרים \"מאבד 15%\" — הערך שנשאר הוא 85% = 0.85. תלמידים רבים מציבים q=0.15, אבל זה אומר שנשאר רק 15% — טעות קריטית!" },
      { title: "⚠️ בלבול בין \"מאבד 15%\" ל\"שווה 15%\"", text: "\"מאבד 15% מערכו\" פירושו שנשאר 85%. אם הרכב \"שווה 15% מערכו ההתחלתי\" — זה מצב שונה לגמרי. שימו לב לניסוח!" },
    ],
    goldenPrompt: `אני בכיתה יא', 3 יחידות, מצרף/ת תרגיל בדעיכה מעריכית — פחת רכב שמאבד אחוז קבוע מערכו כל שנה.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על זיהוי q, כתיבת הנוסחה, ומציאת זמן.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "זיהוי מכפיל הדעיכה q", coaching: "", prompt: "רכב מאבד 15% מערכו כל שנה. תנחה אותי להבין שמכפיל הדעיכה q שווה ל-1 פחות שיעור ההפחתה, ולזהות את q הנכון.", keywords: [], keywordHint: "", contextWords: ["דעיכה", "q", "אחוז", "מכפיל", "הפחתה", "נשאר"] },
      { phase: "סעיף ב׳", label: "כתיבת פונקציית הערך", coaching: "", prompt: "רכב נרכש ב-120,000 ₪ ומאבד 15% מערכו כל שנה. תדריך אותי לכתוב את פונקציית הערך V(t)=V₀·qᵗ עם הנתונים הנכונים.", keywords: [], keywordHint: "", contextWords: ["פונקציה", "V₀", "ערך", "נוסחה", "שנה", "הצבה"] },
      { phase: "סעיף ג׳", label: "מציאת שנת ירידה מתחת ל-50,000", coaching: "", prompt: "רכב נרכש ב-120,000 ₪ ו-q=0.85. תכווין אותי למצוא לאחר כמה שנים הערך יירד מתחת ל-50,000 ₪ — בעזרת ניסוי וטעייה או לוגריתם.", keywords: [], keywordHint: "", contextWords: ["אי-שוויון", "לוגריתם", "שנים", "ירידה", "ניסוי", "סף"] },
    ],
  },
  {
    id: "advanced",
    title: "השוואת שני מודלים",
    problem: "עיר A גדלה ב-3% כל שנה (אוכלוסייה התחלתית: 50,000).\nעיר B גדלה ב-5% כל שנה (אוכלוסייה התחלתית: 30,000).\n\nא. כתבו את נוסחת הגדילה של כל עיר.\nב. הציבו אי-שוויון B(t) > A(t).\nג. פתרו (באמצעות ניסוי או חשיבה לוגריתמית).\nד. פרשו: מה המשמעות של התשובה בהקשר?",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ שוכחים ש-q כולל את ה-1", text: "גדילה של 3% פירושה q=1.03, לא q=0.03. את שיעור הגדילה מוסיפים ל-1 כדי לקבל את המכפיל. q=0.03 ייתן דעיכה כמעט מוחלטת!" },
      { title: "⚠️ משווים רק את q בלי N₀", text: "עיר B גדלה מהר יותר (5% לעומת 3%), אבל מתחילה עם פחות אנשים. לא מספיק להסתכל על קצב הגדילה — חייבים להשוות את הפונקציות המלאות." },
    ],
    goldenPrompt: "\n\n",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד משווים בין שני מודלים של גדילה מעריכית כשהערכים ההתחלתיים שונים? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "כתיבת נוסחאות הגדילה", coaching: "", prompt: "עיר A גדלה 3% לשנה (התחלה 50,000) ועיר B גדלה 5% לשנה (התחלה 30,000). תנחה אותי לכתוב נוסחת גדילה לכל עיר.", keywords: [], keywordHint: "", contextWords: ["נוסחה", "גדילה", "q", "N₀", "אחוז", "עיר"] },
      { phase: "סעיף ב׳", label: "הצבת אי-שוויון", coaching: "", prompt: "נוסחאות הגדילה של שתי ערים עם מכפילים ו-N₀ שונים. תדריך אותי להציב אי-שוויון B(t)>A(t) ולהבין מה אנחנו מחפשים.", keywords: [], keywordHint: "", contextWords: ["אי-שוויון", "השוואה", "חציה", "פונקציה", "גדול", "עולה"] },
      { phase: "סעיף ג׳", label: "פתרון — ניסוי או לוגריתם", coaching: "", prompt: "צריך למצוא מתי B(t)>A(t) כשהנוסחאות כוללות חזקות שונות. תכווין אותי לפתור בעזרת ניסוי וטעייה או לוגריתם.", keywords: [], keywordHint: "", contextWords: ["לוגריתם", "ניסוי", "פתרון", "שנים", "חזקה", "חישוב"] },
      { phase: "סעיף ד׳", label: "פרשנות התוצאה", coaching: "", prompt: "מצאנו את שנת החציה. תנחה אותי לפרש מה המשמעות של התוצאה בהקשר של שתי הערים — מה קורה לפני ואחרי נקודת החציה.", keywords: [], keywordHint: "", contextWords: ["פרשנות", "משמעות", "חציה", "עיר", "אוכלוסייה", "הקשר"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📈 גדילה ודעיכה מעריכית (Exponential Growth & Decay)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "גדילה באחוז קבוע — הנוסחה N(t) = N₀ · qᵗ כשהאוכלוסייה מכפילה את עצמה."}
            {ex.id === "medium" && "דעיכה מעריכית — כשערך מאבד אחוז קבוע כל תקופה, q קטן מ-1."}
            {ex.id === "advanced" && "השוואת שני מודלים — מתי עיר קטנה עם קצב גדילה מהיר עוקפת עיר גדולה?"}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: נוסחה מעריכית */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📐 נוסחה מעריכית</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>N₀</span>
              <span>ערך התחלתי — כמות/ערך בזמן t=0.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>q</span>
              <span>מכפיל: גדילה q&gt;1, דעיכה 0&lt;q&lt;1.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>t</span>
              <span>מספר התקופות (שעות, שנים...).</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>✨ גדילה מול דעיכה</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>q = 1+r</span>
                  <span>גדילה: r הוא שיעור הגדילה (למשל 0.03 = 3%).</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>q = 1−r</span>
                  <span>דעיכה: מאבד r%, נשאר (1−r) מהערך.</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>🔬 השוואת מודלים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>חציה</span>
                  <span>נקודה שבה שני הגרפים נפגשים — B(t) = A(t).</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>קצב &ne; גודל</span>
                  <span>קצב גדילה מהיר לא מבטיח ערך גדול יותר — תלוי ב-N₀.</span>
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

// ─── GrowthLab (basic) ──────────────────────────────────────────────────────

function GrowthLab() {
  const [n0, setN0] = useState(500);
  const [q, setQ]   = useState(2.0);
  const st = STATION.basic;

  const n1 = n0 * q;
  const n5 = n0 * Math.pow(q, 5);
  const doublingTime = q > 1 ? Math.log(2) / Math.log(q) : Infinity;

  // SVG exponential curve
  const pad = 35, svgW = 300, svgH = 150;
  const maxT = 6;
  const maxN = n0 * Math.pow(q, maxT);
  const pts: [number, number][] = [];
  for (let i = 0; i <= 30; i++) {
    const t = (i / 30) * maxT;
    const val = n0 * Math.pow(q, t);
    const x = pad + (t / maxT) * (svgW - 2 * pad);
    const y = svgH - pad - ((val / maxN) * (svgH - 2 * pad));
    pts.push([x, y]);
  }
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת גדילה מעריכית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את הערך ההתחלתי ואת המכפיל — וצפו כיצד העקומה משתנה בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>N₀ (ערך התחלתי)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{n0}</span>
          </div>
          <input type="range" min={100} max={2000} step={50} value={n0} onChange={(e) => setN0(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>q (מכפיל)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{q.toFixed(1)}</span>
          </div>
          <input type="range" min={1.1} max={4.0} step={0.1} value={q} onChange={(e) => setQ(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={pad} y1={svgH - pad} x2={svgW - pad} y2={svgH - pad} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={pad} y1={10} x2={pad} y2={svgH - pad} stroke="#94a3b8" strokeWidth={1.5} />
          <path d={pathD} fill="none" stroke={st.accentColor} strokeWidth={2.5} opacity={0.7} />
          {[1, 3, 5].map(t => {
            const val = n0 * Math.pow(q, t);
            const x = pad + (t / maxT) * (svgW - 2 * pad);
            const y = svgH - pad - ((val / maxN) * (svgH - 2 * pad));
            return <circle key={t} cx={x} cy={y} r={4} fill={st.accentColor} opacity={0.85} />;
          })}
          <text x={svgW - pad} y={svgH - 12} fontSize={10} fill="#94a3b8" textAnchor="end" fontFamily="sans-serif">t</text>
          <text x={pad - 8} y={16} fontSize={10} fill="#94a3b8" textAnchor="end" fontFamily="sans-serif">N</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "N(1)", val: n1.toFixed(0) },
          { label: "N(5)", val: n5 > 999999 ? n5.toExponential(1) : n5.toFixed(0) },
          { label: "זמן הכפלה", val: doublingTime === Infinity ? "∞" : doublingTime.toFixed(2) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>הגדילו את q — שימו לב כיצד העקומה מתלוללת מהר יותר!</p>
    </section>
  );
}

// ─── DecayLab (medium) ──────────────────────────────────────────────────────

function DecayLab() {
  const [v0, setV0]         = useState(120000);
  const [decayRate, setDecayRate] = useState(15);
  const st = STATION.medium;

  const q = 1 - decayRate / 100;
  const v1 = v0 * q;
  const v5 = v0 * Math.pow(q, 5);
  const halfLife = q > 0 && q < 1 ? Math.log(0.5) / Math.log(q) : Infinity;

  // SVG decay curve
  const pad = 35, svgW = 300, svgH = 150;
  const maxT = 10;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 30; i++) {
    const t = (i / 30) * maxT;
    const val = v0 * Math.pow(q, t);
    const x = pad + (t / maxT) * (svgW - 2 * pad);
    const y = svgH - pad - ((val / v0) * (svgH - 2 * pad));
    pts.push([x, y]);
  }
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת דעיכה מעריכית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את הערך ההתחלתי ואת אחוז הדעיכה — וצפו כיצד הערך יורד לאורך זמן.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>V₀ (ערך התחלתי ₪)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{v0.toLocaleString()}</span>
          </div>
          <input type="range" min={10000} max={300000} step={5000} value={v0} onChange={(e) => setV0(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>אחוז דעיכה שנתי</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{decayRate}%</span>
          </div>
          <input type="range" min={1} max={50} step={1} value={decayRate} onChange={(e) => setDecayRate(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={pad} y1={svgH - pad} x2={svgW - pad} y2={svgH - pad} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={pad} y1={10} x2={pad} y2={svgH - pad} stroke="#94a3b8" strokeWidth={1.5} />
          <path d={pathD} fill="none" stroke={st.accentColor} strokeWidth={2.5} opacity={0.7} />
          {/* Half-life line */}
          {halfLife < maxT && (
            <>
              <line x1={pad + (halfLife / maxT) * (svgW - 2 * pad)} y1={10} x2={pad + (halfLife / maxT) * (svgW - 2 * pad)} y2={svgH - pad} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
              <text x={pad + (halfLife / maxT) * (svgW - 2 * pad)} y={8} fontSize={8} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">t½</text>
            </>
          )}
          <text x={svgW - pad} y={svgH - 12} fontSize={10} fill="#94a3b8" textAnchor="end" fontFamily="sans-serif">t</text>
          <text x={pad - 8} y={16} fontSize={10} fill="#94a3b8" textAnchor="end" fontFamily="sans-serif">V</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "V(1)", val: `₪${Math.round(v1).toLocaleString()}` },
          { label: "V(5)", val: `₪${Math.round(v5).toLocaleString()}` },
          { label: "זמן מחצית", val: halfLife === Infinity ? "∞" : `${halfLife.toFixed(1)} שנים` },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>הקו הצהוב המקווקו = זמן מחצית (כשהערך יורד ל-50%).</p>
    </section>
  );
}

// ─── ComparisonLab (advanced) ───────────────────────────────────────────────

function ComparisonLab() {
  const [n0A, setN0A]     = useState(50000);
  const [rateA, setRateA] = useState(3);
  const [rateB, setRateB] = useState(5);
  const st = STATION.advanced;

  const n0B = 30000;
  const qA = 1 + rateA / 100;
  const qB = 1 + rateB / 100;

  const a10 = n0A * Math.pow(qA, 10);
  const b10 = n0B * Math.pow(qB, 10);

  // Find crossing year
  let crossingYear = -1;
  for (let t = 1; t <= 200; t++) {
    if (n0B * Math.pow(qB, t) > n0A * Math.pow(qA, t)) {
      crossingYear = t;
      break;
    }
  }

  // SVG two curves
  const pad = 35, svgW = 300, svgH = 150;
  const maxT = crossingYear > 0 ? Math.min(Math.max(crossingYear + 5, 15), 60) : 30;
  const maxVal = Math.max(n0A * Math.pow(qA, maxT), n0B * Math.pow(qB, maxT), 1);

  const buildPath = (n0: number, qVal: number) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * maxT;
      const val = n0 * Math.pow(qVal, t);
      const x = pad + (t / maxT) * (svgW - 2 * pad);
      const y = svgH - pad - ((val / maxVal) * (svgH - 2 * pad));
      pts.push([x, Math.max(10, y)]);
    }
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  };

  const crossX = crossingYear > 0 ? pad + (crossingYear / maxT) * (svgW - 2 * pad) : -10;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת השוואת מודלים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את N₀ של עיר A ואת קצבי הגדילה — וצפו מתי עיר B עוקפת את עיר A.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>N₀ עיר A</span>
            <span style={{ color: "#16A34A", fontFamily: "monospace", fontWeight: 700 }}>{(n0A / 1000).toFixed(0)}K</span>
          </div>
          <input type="range" min={10000} max={100000} step={5000} value={n0A} onChange={(e) => setN0A(+e.target.value)} style={{ width: "100%", accentColor: "#16A34A" }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>קצב A (%)</span>
            <span style={{ color: "#16A34A", fontFamily: "monospace", fontWeight: 700 }}>{rateA}%</span>
          </div>
          <input type="range" min={1} max={10} step={1} value={rateA} onChange={(e) => setRateA(+e.target.value)} style={{ width: "100%", accentColor: "#16A34A" }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>קצב B (%)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{rateB}%</span>
          </div>
          <input type="range" min={1} max={15} step={1} value={rateB} onChange={(e) => setRateB(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={pad} y1={svgH - pad} x2={svgW - pad} y2={svgH - pad} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={pad} y1={10} x2={pad} y2={svgH - pad} stroke="#94a3b8" strokeWidth={1.5} />
          <path d={buildPath(n0A, qA)} fill="none" stroke="#16A34A" strokeWidth={2.2} opacity={0.7} />
          <path d={buildPath(n0B, qB)} fill="none" stroke={st.accentColor} strokeWidth={2.2} opacity={0.7} />
          {crossingYear > 0 && crossX > pad && crossX < svgW - pad && (
            <line x1={crossX} y1={10} x2={crossX} y2={svgH - pad} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
          )}
          <text x={svgW - 10} y={svgH - pad - 10} fontSize={9} fill="#16A34A" fontWeight={700} textAnchor="end" fontFamily="sans-serif">A</text>
          <text x={svgW - 10} y={svgH - pad - 24} fontSize={9} fill={st.accentColor} fontWeight={700} textAnchor="end" fontFamily="sans-serif">B</text>
          <text x={svgW - pad} y={svgH - 12} fontSize={10} fill="#94a3b8" textAnchor="end" fontFamily="sans-serif">t</text>
          <text x={pad - 8} y={16} fontSize={10} fill="#94a3b8" textAnchor="end" fontFamily="sans-serif">N</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "A(10)", val: Math.round(a10).toLocaleString() },
          { label: "B(10)", val: Math.round(b10).toLocaleString() },
          { label: "שנת חציה", val: crossingYear > 0 ? `שנה ${crossingYear}` : "B לא עוקפת" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>
        {crossingYear > 0 ? `B עוקפת את A בשנה ${crossingYear}!` : "עם הפרמטרים הנוכחיים B לא עוקפת את A — שנו את הקצבים."}
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
  const [activeTab, setActiveTab] = useState<"growth" | "decay" | "halflife" | null>(null);

  const tabs = [
    { id: "growth" as const, label: "📈 גדילה", tex: "q = 1 + r", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "decay" as const, label: "📉 דעיכה", tex: "q = 1 - r", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "halflife" as const, label: "⏱ זמן הכפלה", tex: "t_{1/2}", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: Growth */}
      {activeTab === "growth" && (
        <motion.div key="growth" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"N(t) = N_0 \\cdot q^t, \\quad q = 1 + r"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מתי משתמשים?</strong> כשגודל כלשהו גדל באחוז קבוע כל תקופה.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"r"}</InlineMath> = שיעור הגדילה (כעשרוני: 5% = 0.05).</li>
                  <li><InlineMath>{"q = 1 + r"}</InlineMath> = המכפיל (1.05 עבור 5%).</li>
                  <li><InlineMath>{"N_0"}</InlineMath> = ערך התחלתי, <InlineMath>{"t"}</InlineMath> = מספר תקופות.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: אוכלוסייה 1,000 גדלה 10% לשנה → q=1.1, אחרי 3 שנים: 1000·1.1³ = 1,331
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Decay */}
      {activeTab === "decay" && (
        <motion.div key="decay" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"N(t) = N_0 \\cdot q^t, \\quad q = 1 - r"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מתי משתמשים?</strong> כשגודל כלשהו יורד באחוז קבוע כל תקופה.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"r"}</InlineMath> = שיעור הירידה (15% = 0.15).</li>
                  <li><InlineMath>{"q = 1 - r"}</InlineMath> = מה שנשאר (0.85 עבור ירידה של 15%).</li>
                  <li>תמיד <InlineMath>{"0 < q < 1"}</InlineMath> — ערך יורד אך לא מגיע לאפס.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: רכב ב-100,000₪ מאבד 20% לשנה → q=0.8, אחרי 2 שנים: 100,000·0.8² = 64,000₪
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Half-life / Doubling time */}
      {activeTab === "halflife" && (
        <motion.div key="halflife" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"t = \\frac{\\log(2)}{\\log(q)}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מה זה?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><strong>זמן הכפלה</strong> (כש-q&gt;1): כמה תקופות עד שהגודל מוכפל.</li>
                  <li><strong>זמן מחצית / חצי חיים</strong> (כש-q&lt;1): כמה תקופות עד שהגודל יורד לחצי.</li>
                  <li>הנוסחה זהה — <InlineMath>{"\\log(2) / \\log(q)"}</InlineMath>. עבור דעיכה נקבל ערך שלילי (ניקח |t|).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: q=2 → זמן הכפלה = log(2)/log(2) = 1 תקופה. q=1.1 → log(2)/log(1.1) ≈ 7.3 תקופות.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExponentialGrowthPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>גדילה ודעיכה מעריכית עם AI — כיתה יא׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>גדילה באחוז קבוע, פחת, השוואת מודלים — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/3u/topic/grade11/growth-decay"
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

        <SubtopicProgress subtopicId="3u/grade11/growth-decay/exponential" />

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
        {selectedLevel === "basic" && <GrowthLab />}
        {selectedLevel === "medium" && <DecayLab />}
        {selectedLevel === "advanced" && <ComparisonLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade11/growth-decay/exponential" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
