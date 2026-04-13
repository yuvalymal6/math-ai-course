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
  // Triangle with two sides and angle arc between them
  const Ax = 50, Ay = 150;
  const Bx = 250, By = 150;
  const Cx = 180, Cy = 40;
  return (
    <svg viewBox="0 0 300 180" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Triangle */}
      <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`} fill="none" stroke="#94a3b8" strokeWidth={2} />
      {/* Side a (B-C) highlighted amber */}
      <line x1={Bx} y1={By} x2={Cx} y2={Cy} stroke="#f59e0b" strokeWidth={2.5} />
      {/* Side b (A-C) highlighted amber */}
      <line x1={Ax} y1={Ay} x2={Cx} y2={Cy} stroke="#f59e0b" strokeWidth={2.5} />
      {/* Angle arc at C (between the two sides) */}
      <path d={`M ${Cx - 18},${Cy + 22} A 25 25 0 0 1 ${Cx + 14},${Cy + 24}`} fill="none" stroke="#a78bfa" strokeWidth={2} />
      {/* Labels */}
      <text x={Ax - 8} y={Ay + 14} fontSize={14} fill="#64748b" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={Bx + 4} y={By + 14} fontSize={14} fill="#64748b" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={Cx - 2} y={Cy - 8} fontSize={14} fill="#64748b" fontWeight={700} fontFamily="sans-serif">C</text>
      {/* Side labels */}
      <text x={(Bx + Cx) / 2 + 10} y={(By + Cy) / 2 - 2} fontSize={12} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">a</text>
      <text x={(Ax + Cx) / 2 - 20} y={(Ay + Cy) / 2 - 2} fontSize={12} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">b</text>
      {/* Angle label */}
      <text x={Cx + 2} y={Cy + 42} fontSize={11} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">C</text>
    </svg>
  );
}

function MediumSVG() {
  // Triangle with three sides labeled a, b, c
  const Ax = 40, Ay = 160;
  const Bx = 260, By = 160;
  const Cx = 150, Cy = 30;
  return (
    <svg viewBox="0 0 300 190" className="w-full max-w-sm mx-auto" aria-hidden>
      <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`} fill="none" stroke="#94a3b8" strokeWidth={2} />
      {/* Side a (B-C) */}
      <line x1={Bx} y1={By} x2={Cx} y2={Cy} stroke="#EA580C" strokeWidth={2.5} />
      {/* Side b (A-C) */}
      <line x1={Ax} y1={Ay} x2={Cx} y2={Cy} stroke="#EA580C" strokeWidth={2.5} />
      {/* Side c (A-B) */}
      <line x1={Ax} y1={Ay} x2={Bx} y2={By} stroke="#EA580C" strokeWidth={2.5} />
      {/* Vertex labels */}
      <text x={Ax - 12} y={Ay + 14} fontSize={14} fill="#64748b" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={Bx + 4} y={By + 14} fontSize={14} fill="#64748b" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={Cx - 4} y={Cy - 8} fontSize={14} fill="#64748b" fontWeight={700} fontFamily="sans-serif">C</text>
      {/* Side labels */}
      <text x={(Bx + Cx) / 2 + 10} y={(By + Cy) / 2} fontSize={13} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">a</text>
      <text x={(Ax + Cx) / 2 - 18} y={(Ay + Cy) / 2} fontSize={13} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">b</text>
      <text x={(Ax + Bx) / 2} y={Ay + 18} fontSize={13} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">c</text>
    </svg>
  );
}

function AdvancedSVG() {
  // Quadrilateral with dashed diagonal AC
  const Ax = 50, Ay = 140;
  const Bx = 40, By = 50;
  const Cx = 220, Cy = 30;
  const Dx = 260, Dy = 150;
  return (
    <svg viewBox="0 0 310 190" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Quadrilateral sides */}
      <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy} ${Dx},${Dy}`} fill="none" stroke="#94a3b8" strokeWidth={2} />
      {/* Diagonal AC (dashed) */}
      <line x1={Ax} y1={Ay} x2={Cx} y2={Cy} stroke="#a78bfa" strokeWidth={2} strokeDasharray="6,4" />
      {/* Vertex labels */}
      <text x={Ax - 14} y={Ay + 14} fontSize={14} fill="#64748b" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={Bx - 14} y={By - 6} fontSize={14} fill="#64748b" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={Cx + 4} y={Cy - 6} fontSize={14} fill="#64748b" fontWeight={700} fontFamily="sans-serif">C</text>
      <text x={Dx + 6} y={Dy + 14} fontSize={14} fill="#64748b" fontWeight={700} fontFamily="sans-serif">D</text>
      {/* Triangle fill hints */}
      <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`} fill="#34d399" opacity={0.08} />
      <polygon points={`${Ax},${Ay} ${Cx},${Cy} ${Dx},${Dy}`} fill="#f59e0b" opacity={0.08} />
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
        subjectWords={["שטח", "משולש", "סינוס", "הרון", "אלכסון", "מרובע"]}
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
    title: "שטח בעזרת שתי צלעות וזווית",
    problem: "במשולש ABC נתונות שתי צלעות והזווית שביניהן.\n\nא. זהו אילו צלעות ואיזו זווית דרושים לנוסחה S = ½ab·sinC.\nב. חשבו את שטח המשולש.\nג. אם אחת הצלעות מוכפלת פי 2 — כיצד ישתנה השטח?",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ שימוש בזווית שאינה בין שתי הצלעות", text: "הנוסחה S = ½ab·sinC עובדת רק כשהזווית C היא הזווית שבין הצלעות a ו-b. שימוש בזווית אחרת ייתן תוצאה שגויה." },
      { title: "⚠️ מחשבון במצב רדיאנים במקום מעלות", text: "אם המחשבון במצב RAD במקום DEG, ערך הסינוס יהיה שגוי לחלוטין. יש לוודא שהמחשבון במצב מעלות לפני החישוב." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יא', 3 יחידות, ומצרף/ת שאלה על שטח משולש בעזרת שתי צלעות וזווית. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "זיהוי צלעות וזווית", coaching: "", prompt: "במשולש ABC נתונות שתי צלעות והזווית שביניהן. תנחה אותי לזהות אילו צלעות ואיזו זווית נכנסים לנוסחת השטח S = ½ab·sinC — הזווית חייבת להיות בין שתי הצלעות.", keywords: [], keywordHint: "", contextWords: ["שטח", "צלעות", "זווית", "סינוס", "נוסחה", "ביניהן"] },
      { phase: "סעיף ב׳", label: "חישוב השטח", coaching: "", prompt: "במשולש ABC נתונות שתי צלעות והזווית שביניהן. תדריך אותי כיצד להציב בנוסחה S = ½ab·sinC ולחשב את השטח.", keywords: [], keywordHint: "", contextWords: ["שטח", "הצבה", "סינוס", "חצי", "מכפלה", "חישוב"] },
      { phase: "סעיף ג׳", label: "הכפלת צלע", coaching: "", prompt: "אם מכפילים צלע אחת במשולש פי 2 — תסביר לי מה קורה לשטח לפי הנוסחה S = ½ab·sinC. האם השטח מוכפל באותו יחס?", keywords: [], keywordHint: "", contextWords: ["הכפלה", "צלע", "שטח", "יחס", "פי", "פרופורציה"] },
    ],
  },
  {
    id: "medium",
    title: "נוסחת הרון",
    problem: "במשולש נתונות שלוש צלעות. לא ידועה שום זווית.\n\nא. חשבו את s (חצי ההיקף).\nב. הפעילו את נוסחת הרון: S = √[s(s-a)(s-b)(s-c)].\nג. נסו לאמת את התוצאה בדרך נוספת (אם אפשר).",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ שוכחים לחלק את ההיקף ל-2", text: "s הוא חצי ההיקף — כלומר (a+b+c)/2, לא ההיקף המלא. חישוב עם ההיקף השלם ייתן ערך גדול מדי מתחת לשורש." },
      { title: "⚠️ טעות בסדר פעולות מתחת לשורש", text: "יש לחשב כל גורם בנפרד: s, s-a, s-b, s-c, ואז להכפיל ורק בסוף לקחת שורש. תלמידים רבים מתבלבלים בחישוב הביניים." },
    ],
    goldenPrompt: `אני בכיתה יא', 3 יחידות, מצרף/ת תרגיל על שטח משולש בעזרת נוסחת הרון — נתונות שלוש צלעות בלבד.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על חצי היקף, הגורמים מתחת לשורש, וסדר הפעולות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "חישוב חצי היקף", coaching: "", prompt: "נתונות שלוש צלעות a, b, c של משולש. תנחה אותי לחשב את s — חצי ההיקף: s = (a+b+c)/2.", keywords: [], keywordHint: "", contextWords: ["חצי", "היקף", "סכום", "צלעות", "חילוק", "s"] },
      { phase: "סעיף ב׳", label: "הפעלת נוסחת הרון", coaching: "", prompt: "נתון חצי ההיקף s ושלוש צלעות a, b, c. תדריך אותי להפעיל את נוסחת הרון: S = √[s(s-a)(s-b)(s-c)] — צעד אחרי צעד.", keywords: [], keywordHint: "", contextWords: ["הרון", "שורש", "גורמים", "מכפלה", "s-a", "נוסחה"] },
      { phase: "סעיף ג׳", label: "אימות בדרך נוספת", coaching: "", prompt: "חישבתי שטח משולש בעזרת הרון. תכווין אותי — האם אפשר לאמת עם שיטה אחרת? למשל למצוא זווית עם חוק הקוסינוסים ואז S = ½ab·sinC?", keywords: [], keywordHint: "", contextWords: ["אימות", "קוסינוס", "זווית", "שטח", "בדיקה", "השוואה"] },
    ],
  },
  {
    id: "advanced",
    title: "שילוב נוסחאות — שטח מרובע",
    problem: "נתון מרובע ABCD עם האלכסון AC.\n\nא. חלקו את המרובע לשני משולשים בעזרת האלכסון AC.\nב. חשבו את שטח כל משולש (אחד עם sinC, אחד עם הרון).\nג. מצאו את השטח הכולל של המרובע.\nד. האם ניתן היה לבחור אלכסון אחר? האם התוצאה הייתה משתנה?",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ שוכחים שלכל משולש נתונים שונים", text: "כשמחלקים מרובע לשני משולשים — לא תמיד יש לשניהם את אותם נתונים. באחד ייתכנו צלעות + זווית (sinC), ובשני רק צלעות (הרון). צריך להתאים נוסחה לכל משולש." },
      { title: "⚠️ חישוב אלכסון בלי לוודא שהוא ידוע", text: "אם האלכסון לא נתון ישירות — יש לחשב אותו קודם (למשל עם חוק הקוסינוסים) לפני שניתן לחשב שטחי המשולשים." },
    ],
    goldenPrompt: "\n\n",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד מחשבים שטח מרובע על ידי חלוקה למשולשים? מתי משתמשים בנוסחת sinC ומתי בהרון? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "חלוקה למשולשים", coaching: "", prompt: "נתון מרובע ABCD עם אלכסון AC. תנחה אותי כיצד האלכסון מחלק את המרובע לשני משולשים — ABC ו-ACD.", keywords: [], keywordHint: "", contextWords: ["אלכסון", "חלוקה", "משולש", "מרובע", "ABC", "ACD"] },
      { phase: "סעיף ב׳", label: "שטח כל משולש", coaching: "", prompt: "שני המשולשים: באחד יש שתי צלעות וזווית (נוסחת sinC), ובשני יש שלוש צלעות (נוסחת הרון). תדריך אותי לבחור נוסחה מתאימה לכל אחד.", keywords: [], keywordHint: "", contextWords: ["שטח", "סינוס", "הרון", "נוסחה", "צלעות", "זווית"] },
      { phase: "סעיף ג׳", label: "שטח כולל", coaching: "", prompt: "חישבתי שטח של שני משולשים ABC ו-ACD. תנחה אותי לחבר את שניהם כדי למצוא את השטח הכולל של המרובע ABCD.", keywords: [], keywordHint: "", contextWords: ["סכום", "כולל", "מרובע", "חיבור", "שטח", "משולשים"] },
      { phase: "סעיף ד׳", label: "אלכסון חלופי", coaching: "", prompt: "האם ניתן לחלק את המרובע ABCD דרך אלכסון BD במקום AC? תסביר לי — האם השטח הכולל ישתנה או יישאר אותו דבר?", keywords: [], keywordHint: "", contextWords: ["אלכסון", "BD", "חלופי", "שטח", "שווה", "חלוקה"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📐 שטח משולש (Triangle Area)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "שטח בעזרת שתי צלעות וזווית — הנוסחה הבסיסית ביותר לחישוב שטח משולש."}
            {ex.id === "medium" && "נוסחת הרון — חישוב שטח משולש כשידועות שלוש הצלעות בלבד."}
            {ex.id === "advanced" && "שילוב נוסחאות — חישוב שטח מרובע על ידי חלוקה למשולשים."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: formulas */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📏 נוסחאות שטח</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>sinC</span>
              <span>S = ½ab·sinC — שטח בעזרת שתי צלעות וזווית ביניהן.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>הרון</span>
              <span>S = √[s(s-a)(s-b)(s-c)] — שטח כשידועות 3 צלעות.</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>✨ חצי היקף ונוסחת הרון</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>s</span>
                  <span>חצי ההיקף: s = (a+b+c)/2</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>גורמים</span>
                  <span>s-a, s-b, s-c — שלושת הגורמים מתחת לשורש.</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>🔬 שטח מרובע</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>אלכסון</span>
                  <span>מחלק מרובע לשני משולשים — שטח כולל = סכום שטחים.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>שילוב</span>
                  <span>כל משולש עם הנוסחה המתאימה לנתונים הזמינים.</span>
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

// ─── SinAreaLab (basic) ─────────────────────────────────────────────────────

function SinAreaLab() {
  const [sideA, setSideA] = useState(8);
  const [sideB, setSideB] = useState(6);
  const [angleC, setAngleC] = useState(60);
  const st = STATION.basic;

  const rad = (angleC * Math.PI) / 180;
  const area = 0.5 * sideA * sideB * Math.sin(rad);

  // Dynamic triangle points
  const Ax = 40, Ay = 160;
  const Bx = Ax + sideA * 14, By = 160;
  const Cx = Ax + sideB * 14 * Math.cos(rad), Cy = 160 - sideB * 14 * Math.sin(rad);
  const svgW = Math.max(300, Bx + 40);
  const svgH = Math.max(180, 180);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת שטח עם סינוס</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את הצלעות והזווית וצפו כיצד השטח משתנה בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "צלע a", val: sideA, set: setSideA, min: 1, max: 15 },
          { label: "צלע b", val: sideB, set: setSideB, min: 1, max: 15 },
          { label: "זווית C (מעלות)", val: angleC, set: setAngleC, min: 1, max: 179 },
        ].map((s) => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={s.min} max={s.max} step={1} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`} fill="#16A34A" opacity={0.12} stroke="#16A34A" strokeWidth={2} />
          {/* Angle arc */}
          <path d={`M ${Ax + 20},${Ay} A 20 20 0 0 0 ${Ax + 20 * Math.cos(rad)},${Ay - 20 * Math.sin(rad)}`} fill="none" stroke="#a78bfa" strokeWidth={2} />
          {/* Labels */}
          <text x={Ax - 6} y={Ay + 16} fontSize={12} fill="#64748b" fontWeight={700} fontFamily="sans-serif">A</text>
          <text x={Bx + 4} y={By + 16} fontSize={12} fill="#64748b" fontWeight={700} fontFamily="sans-serif">B</text>
          <text x={Cx - 4} y={Cy - 8} fontSize={12} fill="#64748b" fontWeight={700} fontFamily="sans-serif">C</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "שטח", val: area.toFixed(1) },
          { label: "צלע a", val: String(sideA) },
          { label: "צלע b", val: String(sideB) },
          { label: "זווית C", val: `${angleC}°` },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>השטח מקסימלי כאשר C = 90° (כי sin90° = 1)!</p>
    </section>
  );
}

// ─── HeronLab (medium) ──────────────────────────────────────────────────────

function HeronLab() {
  const [a, setA] = useState(7);
  const [b, setB] = useState(8);
  const [c, setC] = useState(9);
  const st = STATION.medium;

  // Triangle inequality check
  const valid = a + b > c && a + c > b && b + c > a;
  const s = (a + b + c) / 2;
  const heronInner = valid ? s * (s - a) * (s - b) * (s - c) : 0;
  const area = heronInner > 0 ? Math.sqrt(heronInner) : 0;

  // Compute triangle points using cosine rule for drawing
  const cosA = valid ? (b * b + c * c - a * a) / (2 * b * c) : 0;
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const scale = 12;
  const Px = 40, Py = 155;
  const Qx = Px + c * scale, Qy = 155;
  const Rx = Px + b * scale * cosA, Ry = 155 - b * scale * sinA;
  const svgW = Math.max(300, Qx + 40);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת נוסחת הרון</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את שלוש הצלעות וצפו כיצד חצי ההיקף והשטח משתנים. שימו לב לאי-שוויון המשולש!</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "צלע a", val: a, set: setA },
          { label: "צלע b", val: b, set: setB },
          { label: "צלע c", val: c, set: setC },
        ].map((sl) => (
          <div key={sl.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{sl.val}</span>
            </div>
            <input type="range" min={1} max={20} step={1} value={sl.val} onChange={(e) => sl.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        {valid ? (
          <svg viewBox={`0 0 ${svgW} 180`} className="w-full max-w-md mx-auto" aria-hidden>
            <polygon points={`${Px},${Py} ${Qx},${Qy} ${Rx},${Ry}`} fill="#EA580C" opacity={0.12} stroke="#EA580C" strokeWidth={2} />
            <text x={Px - 8} y={Py + 14} fontSize={12} fill="#64748b" fontWeight={700} fontFamily="sans-serif">A</text>
            <text x={Qx + 4} y={Qy + 14} fontSize={12} fill="#64748b" fontWeight={700} fontFamily="sans-serif">B</text>
            <text x={Rx - 4} y={Ry - 8} fontSize={12} fill="#64748b" fontWeight={700} fontFamily="sans-serif">C</text>
          </svg>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem", color: "#DC2626", fontWeight: 700, fontSize: 14 }}>
            ⚠️ הצלעות לא מקיימות את אי-שוויון המשולש!
          </div>
        )}
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "s (חצי היקף)", val: s.toFixed(1) },
          { label: "שטח", val: valid ? area.toFixed(1) : "—" },
          { label: "משולש תקין?", val: valid ? "✓" : "✗" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: valid ? st.accentColor : "#DC2626", fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>נסו ליצור משולש שווה-צלעות (a=b=c) — השטח יהיה מקסימלי עבור היקף נתון!</p>
    </section>
  );
}

// ─── QuadAreaLab (advanced) ─────────────────────────────────────────────────

function QuadAreaLab() {
  const [ab, setAb] = useState(7);
  const [bc, setBc] = useState(5);
  const [cd, setCd] = useState(8);
  const [da, setDa] = useState(6);
  const st = STATION.advanced;

  // Simple quadrilateral: we place it with known geometry
  // Triangle 1 (ABC): sides ab, bc, and diagonal ac
  // For simplicity, fix angle at A = 80deg for triangle 1, use sin formula
  const angleA = 80;
  const radA = (angleA * Math.PI) / 180;
  const area1 = 0.5 * da * ab * Math.sin(radA);

  // Diagonal AC via cosine rule in triangle ABD (using sides da, ab, angle A)
  const ac = Math.sqrt(da * da + ab * ab - 2 * da * ab * Math.cos(radA));

  // Triangle 2 (ACD): sides ac, cd, bc — use Heron
  const s2 = (ac + bc + cd) / 2;
  const valid2 = ac + bc > cd && ac + cd > bc && bc + cd > ac;
  const heron2 = valid2 ? s2 * (s2 - ac) * (s2 - bc) * (s2 - cd) : 0;
  const area2 = heron2 > 0 ? Math.sqrt(heron2) : 0;
  const totalArea = area1 + area2;

  // Draw quad
  const Ax = 60, Ay = 150;
  const Bx = Ax - da * 8 * Math.cos(Math.PI - radA), By = Ay - da * 8 * Math.sin(Math.PI - radA);
  const Dx = Ax + ab * 10, Dy = 150;
  // C positioned relative using bc from B and cd from D
  const Cx = (Bx + Dx) / 2 + 20, Cy = Math.min(By, Dy) - 30;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת שטח מרובע</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את אורכי הצלעות וצפו כיצד שטחי שני המשולשים ושטח המרובע הכולל משתנים.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "AB", val: ab, set: setAb },
          { label: "BC", val: bc, set: setBc },
          { label: "CD", val: cd, set: setCd },
          { label: "DA", val: da, set: setDa },
        ].map((sl) => (
          <div key={sl.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{sl.val}</span>
            </div>
            <input type="range" min={2} max={15} step={1} value={sl.val} onChange={(e) => sl.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 320 200" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Quadrilateral */}
          <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy} ${Dx},${Dy}`} fill="none" stroke="#94a3b8" strokeWidth={2} />
          {/* Triangle fills */}
          <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`} fill="#34d399" opacity={0.1} />
          <polygon points={`${Ax},${Ay} ${Cx},${Cy} ${Dx},${Dy}`} fill="#f59e0b" opacity={0.1} />
          {/* Diagonal */}
          <line x1={Ax} y1={Ay} x2={Cx} y2={Cy} stroke="#a78bfa" strokeWidth={2} strokeDasharray="6,4" />
          {/* Labels */}
          <text x={Ax - 12} y={Ay + 16} fontSize={13} fill="#64748b" fontWeight={700} fontFamily="sans-serif">A</text>
          <text x={Bx - 14} y={By - 4} fontSize={13} fill="#64748b" fontWeight={700} fontFamily="sans-serif">B</text>
          <text x={Cx + 4} y={Cy - 6} fontSize={13} fill="#64748b" fontWeight={700} fontFamily="sans-serif">C</text>
          <text x={Dx + 6} y={Dy + 14} fontSize={13} fill="#64748b" fontWeight={700} fontFamily="sans-serif">D</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "משולש 1 (sinC)", val: area1.toFixed(1) },
          { label: "משולש 2 (הרון)", val: valid2 ? area2.toFixed(1) : "—" },
          { label: "שטח כולל", val: valid2 ? totalArea.toFixed(1) : "—" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>הירוק = משולש עם sinC, הצהוב = משולש עם הרון. האלכסון הסגול מחלק את המרובע!</p>
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
  const [activeTab, setActiveTab] = useState<"sinArea" | "heron" | "quadArea" | null>(null);

  const tabs = [
    { id: "sinArea" as const, label: "📐 שטח עם סינוס", tex: "S = \\frac{1}{2}ab\\sin C", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "heron" as const, label: "📏 נוסחת הרון", tex: "S = \\sqrt{s(s\\text{-}a)(s\\text{-}b)(s\\text{-}c)}", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "quadArea" as const, label: "🔷 שטח מרובע", tex: "S_1 + S_2", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: Sin Area */}
      {activeTab === "sinArea" && (
        <motion.div key="sinArea" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S = \\frac{1}{2} \\cdot a \\cdot b \\cdot \\sin C"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מתי משתמשים?</strong> כשידועות שתי צלעות והזווית שביניהן.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מזהים שתי צלעות (<InlineMath>{"a, b"}</InlineMath>) והזווית ביניהן (<InlineMath>{"C"}</InlineMath>).</li>
                  <li>מציבים בנוסחה ומחשבים.</li>
                  <li>שימו לב: המחשבון חייב להיות במצב מעלות!</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: a=8, b=6, C=30° → S = ½·8·6·sin30° = ½·8·6·0.5 = 12
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Heron */}
      {activeTab === "heron" && (
        <motion.div key="heron" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 10 }}>
              <DisplayMath>{"s = \\frac{a+b+c}{2}"}</DisplayMath>
            </div>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S = \\sqrt{s(s-a)(s-b)(s-c)}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מתי משתמשים?</strong> כשידועות שלוש הצלעות בלבד (ללא זוויות).
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מחשבים חצי היקף: <InlineMath>{"s = \\frac{a+b+c}{2}"}</InlineMath></li>
                  <li>מחשבים כל גורם: <InlineMath>{"s-a"}</InlineMath>, <InlineMath>{"s-b"}</InlineMath>, <InlineMath>{"s-c"}</InlineMath></li>
                  <li>מכפילים הכל ולוקחים שורש.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: a=5, b=6, c=7 → s=9, S=√(9·4·3·2)=√216=14.7
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Quad Area */}
      {activeTab === "quadArea" && (
        <motion.div key="quadArea" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#DC2626", fontSize: 16, fontWeight: 700 }}>
              חלוקה למשולשים בעזרת אלכסון
            </div>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S_{\\text{quad}} = S_{\\triangle 1} + S_{\\triangle 2}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מחשבים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>בוחרים אלכסון שמחלק את המרובע לשני משולשים.</li>
                  <li>מחשבים שטח כל משולש בנוסחה המתאימה לנתונים הזמינים.</li>
                  <li>מחברים את שני השטחים לשטח הכולל.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 טיפ: אלכסון אחר ייתן את אותו שטח כולל — אבל נתונים שונים לכל משולש!
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TriangleAreaPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>שטח משולש עם AI — כיתה יא׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>נוסחת sinC, נוסחת הרון, ושטח מרובע — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/3u/topic/grade11/trig"
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

        <SubtopicProgress subtopicId="3u/grade11/trig/area" />

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
        {selectedLevel === "basic" && <SinAreaLab />}
        {selectedLevel === "medium" && <HeronLab />}
        {selectedLevel === "advanced" && <QuadAreaLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade11/trig/area" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
