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
  // Isosceles triangle ABC with height AD
  return (
    <svg viewBox="0 0 260 220" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Triangle sides */}
      <line x1={130} y1={30} x2={50} y2={190} stroke="#94a3b8" strokeWidth={2} />
      <line x1={130} y1={30} x2={210} y2={190} stroke="#94a3b8" strokeWidth={2} />
      <line x1={50} y1={190} x2={210} y2={190} stroke="#94a3b8" strokeWidth={2} />
      {/* Height AD */}
      <line x1={130} y1={30} x2={130} y2={190} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6,3" />
      {/* Right angle mark at D */}
      <polyline points="130,180 140,180 140,190" fill="none" stroke="#64748b" strokeWidth={1} />
      {/* Equal side marks */}
      <line x1={85} y1={105} x2={93} y2={115} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={88} y1={103} x2={96} y2={113} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={167} y1={105} x2={175} y2={115} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={164} y1={103} x2={172} y2={113} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Angle arc at A */}
      <path d="M 118,50 A 22,22 0 0,1 142,50" fill="none" stroke="#a78bfa" strokeWidth={1.5} />
      {/* Labels */}
      <text x={130} y={20} fontSize={14} fill="#2D3436" textAnchor="middle" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={38} y={200} fontSize={14} fill="#2D3436" textAnchor="middle" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={222} y={200} fontSize={14} fill="#2D3436" textAnchor="middle" fontWeight={700} fontFamily="sans-serif">C</text>
      <text x={140} y={200} fontSize={14} fill="#f59e0b" textAnchor="start" fontWeight={600} fontFamily="sans-serif">D</text>
    </svg>
  );
}

function MediumSVG() {
  // Quadrilateral ABCD with diagonal AC, tick marks on equal sides
  return (
    <svg viewBox="0 0 280 220" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Quadrilateral ABCD */}
      <line x1={60} y1={50} x2={220} y2={50} stroke="#94a3b8" strokeWidth={2} />
      <line x1={220} y1={50} x2={240} y2={180} stroke="#94a3b8" strokeWidth={2} />
      <line x1={240} y1={180} x2={40} y2={180} stroke="#94a3b8" strokeWidth={2} />
      <line x1={40} y1={180} x2={60} y2={50} stroke="#94a3b8" strokeWidth={2} />
      {/* Diagonal AC */}
      <line x1={60} y1={50} x2={240} y2={180} stroke="#EA580C" strokeWidth={1.5} strokeDasharray="6,3" />
      {/* AB=CD tick marks (top and bottom) */}
      <line x1={136} y1={44} x2={144} y2={56} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={136} y1={174} x2={144} y2={186} stroke="#94a3b8" strokeWidth={1.5} />
      {/* AD=BC tick marks (left and right) */}
      <line x1={45} y1={112} x2={57} y2={118} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={47} y1={108} x2={59} y2={114} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={225} y1={112} x2={237} y2={118} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={223} y1={108} x2={235} y2={114} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Labels */}
      <text x={56} y={40} fontSize={14} fill="#2D3436" textAnchor="middle" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={224} y={40} fontSize={14} fill="#2D3436" textAnchor="middle" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={250} y={192} fontSize={14} fill="#2D3436" textAnchor="middle" fontWeight={700} fontFamily="sans-serif">C</text>
      <text x={30} y={192} fontSize={14} fill="#2D3436" textAnchor="middle" fontWeight={700} fontFamily="sans-serif">D</text>
    </svg>
  );
}

function AdvancedSVG() {
  // Triangle ABC with midpoints D, E, F and inner triangle
  const Ax = 140, Ay = 25;
  const Bx = 40, By = 195;
  const Cx = 250, Cy = 195;
  const Dx = (Bx + Cx) / 2, Dy = (By + Cy) / 2;
  const Ex = (Ax + Cx) / 2, Ey = (Ay + Cy) / 2;
  const Fx = (Ax + Bx) / 2, Fy = (Ay + By) / 2;
  return (
    <svg viewBox="0 0 290 220" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Outer triangle */}
      <line x1={Ax} y1={Ay} x2={Bx} y2={By} stroke="#94a3b8" strokeWidth={2} />
      <line x1={Bx} y1={By} x2={Cx} y2={Cy} stroke="#94a3b8" strokeWidth={2} />
      <line x1={Cx} y1={Cy} x2={Ax} y2={Ay} stroke="#94a3b8" strokeWidth={2} />
      {/* Midline triangle DEF */}
      <line x1={Dx} y1={Dy} x2={Ex} y2={Ey} stroke="#DC2626" strokeWidth={1.8} strokeDasharray="6,3" />
      <line x1={Ex} y1={Ey} x2={Fx} y2={Fy} stroke="#DC2626" strokeWidth={1.8} strokeDasharray="6,3" />
      <line x1={Fx} y1={Fy} x2={Dx} y2={Dy} stroke="#DC2626" strokeWidth={1.8} strokeDasharray="6,3" />
      {/* Midpoint marks */}
      {[[Bx, By, Cx, Cy], [Ax, Ay, Cx, Cy], [Ax, Ay, Bx, By]].map(([x1, y1, x2, y2], i) => {
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len * 4, ny = dx / len * 4;
        return <line key={i} x1={mx + nx} y1={my + ny} x2={mx - nx} y2={my - ny} stroke="#64748b" strokeWidth={1.5} />;
      })}
      {/* Labels */}
      <text x={Ax} y={15} fontSize={14} fill="#2D3436" textAnchor="middle" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={Bx - 10} y={205} fontSize={14} fill="#2D3436" textAnchor="middle" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={Cx + 10} y={205} fontSize={14} fill="#2D3436" textAnchor="middle" fontWeight={700} fontFamily="sans-serif">C</text>
      <text x={Dx} y={210} fontSize={13} fill="#DC2626" textAnchor="middle" fontWeight={600} fontFamily="sans-serif">D</text>
      <text x={Ex + 12} y={Ey} fontSize={13} fill="#DC2626" textAnchor="start" fontWeight={600} fontFamily="sans-serif">E</text>
      <text x={Fx - 12} y={Fy} fontSize={13} fill="#DC2626" textAnchor="end" fontWeight={600} fontFamily="sans-serif">F</text>
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
          value={text} rows={3} dir="rtl" readOnly={passed}
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
        subjectWords={["משולש", "חפיפה", "דמיון", "קו אמצעים", "הוכחה", "זוויות"]}
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
    title: "סכום זוויות ומשולש שווה-שוקיים",
    problem: "במשולש שווה-שוקיים ABC, ידוע כי AB = AC, וזווית A נתונה.\n\nא. מצאו את זוויות B ו-C.\nב. הוכיחו: אם AD ניצב ל-BC, אז AD חוצה את זווית A.\nג. חשבו את אורך AD בהינתן אורך BC (בעזרת פיתגורס).",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "שוכחים שסכום הזוויות הוא 180°", text: "במשולש שווה-שוקיים, שתי זוויות הבסיס שוות. אם זווית הראש A ידועה, כל זווית בסיס = (180° - A) / 2. תלמידים רבים שוכחים לחסר את זווית A לפני החלוקה." },
      { title: "בלבול בין חוצה זווית לגובה", text: "במשולש שווה-שוקיים, הגובה מהראש לבסיס גם חוצה את זווית הראש וגם חוצה את הבסיס. זה מקרה מיוחד — במשולש כללי זה לא בהכרח נכון!" },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י', 5 יחידות, ומצרף/ת שאלה על משולש שווה-שוקיים. אני רוצה שתהיה המורה הפרטי שלי — תסביר לי את הלוגיקה ולא תיתן תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "מציאת זוויות B ו-C", coaching: "", prompt: "במשולש ABC שווה-שוקיים, AB=AC, וזווית A נתונה. תנחה אותי כיצד להשתמש בסכום זוויות במשולש ובתכונת השוויון של זוויות הבסיס כדי למצוא את B ו-C.", keywords: [], keywordHint: "", contextWords: ["זוויות", "סכום", "בסיס", "שוקיים", "שווה", "180"] },
      { phase: "סעיף ב׳", label: "הוכחת חציית זווית A", coaching: "", prompt: "AD ניצב ל-BC במשולש שווה-שוקיים ABC. תדריך אותי להוכיח שAD חוצה את זווית A, בעזרת חפיפת משולשים ABD ו-ACD.", keywords: [], keywordHint: "", contextWords: ["חפיפה", "ניצב", "חוצה", "זווית", "משולשים", "הוכחה"] },
      { phase: "סעיף ג׳", label: "חישוב AD בפיתגורס", coaching: "", prompt: "בהינתן אורך BC, כאשר AD ניצב ל-BC ו-D אמצע BC. תכווין אותי להשתמש במשפט פיתגורס במשולש ABD כדי לחשב את AD.", keywords: [], keywordHint: "", contextWords: ["פיתגורס", "ניצב", "אמצע", "AD", "חישוב", "משולש"] },
    ],
  },
  {
    id: "medium",
    title: "חפיפת משולשים — הוכחה",
    problem: "נתון מרובע ABCD כך ש-AB = CD ו-AD = BC.\nהאלכסון AC מחלק את המרובע לשני משולשים.\n\nא. הוכיחו: △ABC ≅ △CDA (לפי צ.צ.צ).\nב. הסיקו: מה ניתן לומר על הזוויות BAC ו-DCA?\nג. הוכיחו: ABCD הוא מקבילית.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "שוכחים לציין צלע משותפת", text: "בחפיפת צ.צ.צ צריך 3 זוגות צלעות שוות. AB=CD ו-AD=BC נתונים, אבל הזוג השלישי הוא AC=CA — הצלע המשותפת! תלמידים רבים שוכחים לציין אותה." },
      { title: "קפיצה מחפיפה למקבילית ללא הסבר", text: "חפיפת משולשים נותנת זוויות שוות. כדי להוכיח מקבילית צריך להראות שזוגות צלעות נגדיות מקבילות — זה נובע מזוויות מתחלפות שוות עם חוצה (האלכסון)." },
    ],
    goldenPrompt: `אני בכיתה י', 5 יחידות, מצרף/ת תרגיל הוכחה בגיאומטריה — חפיפת משולשים במרובע.

אל תיתן לי את ההוכחה — שאל אותי שאלות מנחות על זיהוי צלעות שוות, ציון צלע משותפת, והסקה ממשולשים חופפים.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "הוכחת חפיפה צ.צ.צ", coaching: "", prompt: "במרובע ABCD ידוע AB=CD, AD=BC. האלכסון AC משותף. תנחה אותי להוכיח ש-△ABC ≅ △CDA לפי משפט צ.צ.צ — אילו 3 זוגות צלעות שוות?", keywords: [], keywordHint: "", contextWords: ["חפיפה", "צ.צ.צ", "צלעות", "משותפת", "AC", "שווה"] },
      { phase: "סעיף ב׳", label: "הסקה על זוויות", coaching: "", prompt: "משולשים ABC ו-CDA חופפים. תדריך אותי להסיק מה יחס הזוויות BAC ו-DCA — מה נובע ישירות מחפיפת המשולשים?", keywords: [], keywordHint: "", contextWords: ["זוויות", "חפיפה", "שוות", "BAC", "DCA", "מתאימות"] },
      { phase: "סעיף ג׳", label: "הוכחת מקבילית", coaching: "", prompt: "מזוויות BAC=DCA ו-ABC=CDA, תכווין אותי להוכיח ש-ABCD מקבילית — בעזרת זוויות מתחלפות שוות המעידות על צלעות מקבילות.", keywords: [], keywordHint: "", contextWords: ["מקבילית", "מתחלפות", "מקבילות", "הוכחה", "צלעות", "זוויות"] },
    ],
  },
  {
    id: "advanced",
    title: "קו אמצעים",
    problem: "במשולש ABC, הנקודות D, E, F הן אמצעי הצלעות BC, AC, AB בהתאמה.\n\nא. הוכיחו: DE ∥ AB ו-DE = ½AB (משפט קו האמצעים).\nב. הוכיחו: △DEF ~ △ABC ביחס 1:2.\nג. חשבו את יחס השטחים בין △DEF ל-△ABC.\nד. אם היקף △ABC שווה לערך נתון, מצאו את היקף △DEF.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "בלבול בין חפיפה לדמיון", text: "חפיפה = אותו גודל ואותה צורה. דמיון = אותה צורה ביחס קבוע. △DEF דומה ל-△ABC (יחס 1:2) אבל לא חופף! צלעות DEF הן חצי מצלעות ABC." },
      { title: "טעות ביחס שטחים", text: "יחס שטחים של משולשים דומים הוא ריבוע יחס הדמיון. אם יחס הצלעות 1:2, יחס השטחים הוא 1:4 (לא 1:2!). תלמידים רבים שוכחים לרבע." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט מפורט שמנחה AI ללמד אותך הוכחות על קו אמצעים ודמיון משולשים, כולל יחסי שטחים.",
    steps: [
      { phase: "סעיף א׳", label: "משפט קו האמצעים", coaching: "", prompt: "D ו-F אמצעי BC ו-AB. תנחה אותי להוכיח ש-DF ∥ AC ו-DE ∥ AB בעזרת משפט קו האמצעים — מה המשפט אומר על קטע המחבר אמצעי שתי צלעות?", keywords: [], keywordHint: "", contextWords: ["קו אמצעים", "מקביל", "חצי", "אמצע", "AB", "הוכחה"] },
      { phase: "סעיף ב׳", label: "דמיון △DEF ~ △ABC", coaching: "", prompt: "כל צלע ב-△DEF שווה לחצי מהצלע המתאימה ב-△ABC. תדריך אותי להוכיח דמיון ביחס 1:2 — באיזה משפט דמיון נשתמש?", keywords: [], keywordHint: "", contextWords: ["דמיון", "יחס", "צ.צ.צ", "משולשים", "חצי", "1:2"] },
      { phase: "סעיף ג׳", label: "יחס שטחים", coaching: "", prompt: "יחס הדמיון הוא 1:2. תכווין אותי לחשב את יחס השטחים — מה הקשר בין יחס צלעות ליחס שטחים במשולשים דומים?", keywords: [], keywordHint: "", contextWords: ["שטח", "יחס", "ריבוע", "דמיון", "1:4", "משולשים"] },
      { phase: "סעיף ד׳", label: "היקף △DEF", coaching: "", prompt: "היקף △ABC נתון. כל צלע ב-△DEF שווה לחצי מהצלע המתאימה. תנחה אותי לחשב את היקף △DEF מתוך היקף △ABC.", keywords: [], keywordHint: "", contextWords: ["היקף", "חצי", "סכום", "צלעות", "יחס", "חישוב"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📐 משולשים — חפיפה, דמיון וקו אמצעים</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "משולש שווה-שוקיים — סכום זוויות, תכונות סימטריה, גובה-חוצה-תיכון, ופיתגורס."}
            {ex.id === "medium" && "חפיפת משולשים (צ.צ.צ) — הוכחה, הסקת זוויות שוות, והוכחת מקבילית."}
            {ex.id === "advanced" && "קו אמצעים — משפט קו האמצעים, דמיון משולשים ביחס 1:2, יחסי שטחים והיקפים."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: תכונות בסיסיות */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>תכונות יסוד</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>סכום זוויות</span>
              <span>סכום הזוויות במשולש שווה תמיד ל-180°.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>שווה-שוקיים</span>
              <span>AB=AC אז זוויות הבסיס B ו-C שוות.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>חפיפה</span>
              <span>צ.צ.צ / צ.ז.צ / ז.צ.ז — תנאים להוכחת שוויון משולשים.</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>הוכחות והסקות</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>חפיפה → זוויות</span>
                  <span>ממשולשים חופפים נובעות זוויות מתאימות שוות.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>מתחלפות שוות</span>
                  <span>זוויות מתחלפות שוות → ישרים מקבילים.</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>דמיון וקו אמצעים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>קו אמצעים</span>
                  <span>קטע המחבר אמצעי שתי צלעות מקביל לשלישית ושווה לחציה.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>יחס שטחים</span>
                  <span>במשולשים דומים: יחס שטחים = ריבוע יחס הדמיון.</span>
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

// ─── IsoscelesLab (basic) — 2 sliders ──────────────────────────────────────

function IsoscelesLab() {
  const [angleA, setAngleA] = useState(40);
  const [legLen, setLegLen] = useState(80);
  const st = STATION.basic;

  const angleB = (180 - angleA) / 2;
  const angleC = angleB;
  // Base length from law of cosines: base^2 = 2*leg^2*(1 - cos(A))
  const angleARad = (angleA * Math.PI) / 180;
  const baseLen = Math.sqrt(2 * legLen * legLen * (1 - Math.cos(angleARad)));
  const height = legLen * Math.cos(angleARad / 2);

  // Dynamic SVG
  const svgW = 260, svgH = 220;
  const cx = svgW / 2;
  const halfBase = (baseLen / (2 * legLen)) * 100;
  const h = (height / legLen) * 140;
  const Ax = cx, Ay = 200 - h;
  const Bx = cx - halfBase, By = 200;
  const Cx = cx + halfBase, Cy = 200;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת משולש שווה-שוקיים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את זווית הראש ואורך השוק — וצפו כיצד זוויות הבסיס והגובה משתנים בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>זווית A</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{angleA}°</span>
          </div>
          <input type="range" min={10} max={160} step={1} value={angleA} onChange={(e) => setAngleA(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>אורך שוק</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{legLen}</span>
          </div>
          <input type="range" min={30} max={150} step={1} value={legLen} onChange={(e) => setLegLen(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-sm mx-auto" aria-hidden>
          <line x1={Ax} y1={Ay} x2={Bx} y2={By} stroke="#94a3b8" strokeWidth={2} />
          <line x1={Ax} y1={Ay} x2={Cx} y2={Cy} stroke="#94a3b8" strokeWidth={2} />
          <line x1={Bx} y1={By} x2={Cx} y2={Cy} stroke="#94a3b8" strokeWidth={2} />
          {/* Height */}
          <line x1={Ax} y1={Ay} x2={cx} y2={200} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,3" />
          {/* Angle arc at A */}
          <path d={`M ${Ax - 15},${Ay + 18} A 20,20 0 0,1 ${Ax + 15},${Ay + 18}`} fill="none" stroke="#a78bfa" strokeWidth={1.5} />
          <text x={Ax} y={Ay - 8} fontSize={13} fill="#2D3436" textAnchor="middle" fontWeight={700}>A</text>
          <text x={Bx - 8} y={By + 14} fontSize={13} fill="#2D3436" textAnchor="middle" fontWeight={700}>B</text>
          <text x={Cx + 8} y={Cy + 14} fontSize={13} fill="#2D3436" textAnchor="middle" fontWeight={700}>C</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "זווית A", val: `${angleA.toFixed(0)}°` },
          { label: "זווית B", val: `${angleB.toFixed(1)}°` },
          { label: "אורך בסיס", val: baseLen.toFixed(1) },
          { label: "גובה AD", val: height.toFixed(1) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>
        {angleA === 60 ? "משולש שווה-צלעות! כל הזוויות שוות." : angleA > 120 ? "זווית ראש קהה — המשולש מתיישר." : "שנו את זווית A וצפו כיצד B ו-C מתעדכנות."}
      </p>
    </section>
  );
}

// ─── CongruenceLab (medium) — 3 sliders ──────────────────────────────────────

function CongruenceLab() {
  const [sideAB, setSideAB] = useState(80);
  const [sideAD, setSideAD] = useState(60);
  const [angle, setAngle] = useState(75);
  const st = STATION.medium;

  // Quadrilateral ABCD with AB=CD, AD=BC (parallelogram-like)
  const angRad = (angle * Math.PI) / 180;
  const Ax = 60, Ay = 50;
  const Bx = Ax + sideAB, By = Ay;
  const Dx = Ax + sideAD * Math.cos(angRad), Dy = Ay + sideAD * Math.sin(angRad);
  const Cx = Bx + sideAD * Math.cos(angRad), Cy = By + sideAD * Math.sin(angRad);

  // Diagonal AC length
  const diagAC = Math.sqrt((Cx - Ax) ** 2 + (Cy - Ay) ** 2);

  // Scale to fit SVG
  const allX = [Ax, Bx, Cx, Dx], allY = [Ay, By, Cy, Dy];
  const maxX = Math.max(...allX), maxY = Math.max(...allY);
  const svgW = maxX + 40, svgH = maxY + 30;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת חפיפת משולשים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את אורכי הצלעות ואת הזווית — וצפו כיצד המרובע והאלכסון משתנים.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>AB = CD</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{sideAB}</span>
          </div>
          <input type="range" min={40} max={150} step={1} value={sideAB} onChange={(e) => setSideAB(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>AD = BC</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{sideAD}</span>
          </div>
          <input type="range" min={30} max={120} step={1} value={sideAD} onChange={(e) => setSideAD(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>זווית</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{angle}°</span>
          </div>
          <input type="range" min={30} max={150} step={1} value={angle} onChange={(e) => setAngle(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Quadrilateral */}
          <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy} ${Dx},${Dy}`} fill="none" stroke="#94a3b8" strokeWidth={2} />
          {/* Diagonal AC */}
          <line x1={Ax} y1={Ay} x2={Cx} y2={Cy} stroke={st.accentColor} strokeWidth={1.5} strokeDasharray="6,3" />
          {/* Fill triangles */}
          <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`} fill={st.accentColor} opacity={0.08} />
          <polygon points={`${Ax},${Ay} ${Cx},${Cy} ${Dx},${Dy}`} fill="#a78bfa" opacity={0.08} />
          {/* Labels */}
          <text x={Ax - 12} y={Ay - 4} fontSize={13} fill="#2D3436" fontWeight={700}>A</text>
          <text x={Bx + 6} y={By - 4} fontSize={13} fill="#2D3436" fontWeight={700}>B</text>
          <text x={Cx + 6} y={Cy + 14} fontSize={13} fill="#2D3436" fontWeight={700}>C</text>
          <text x={Dx - 14} y={Dy + 14} fontSize={13} fill="#2D3436" fontWeight={700}>D</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "AB = CD", val: sideAB.toFixed(0) },
          { label: "AD = BC", val: sideAD.toFixed(0) },
          { label: "אלכסון AC", val: diagAC.toFixed(1) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>
        {angle === 90 ? "מלבן! כל הזוויות ישרות." : sideAB === sideAD ? "מעוין! כל הצלעות שוות." : "שנו את הפרמטרים וצפו — AB=CD ו-AD=BC תמיד מבטיחים מקבילית."}
      </p>
    </section>
  );
}

// ─── MidlineLab (advanced) — 1 slider ───────────────────────────────────────

function MidlineLab() {
  const [perimeter, setPerimeter] = useState(120);
  const st = STATION.advanced;

  // Fixed proportions for the triangle
  const scale = perimeter / 300;
  const Ax = 150, Ay = 20;
  const Bx = 40, By = 195;
  const Cx = 260, Cy = 195;

  // Midpoints
  const Dx = (Bx + Cx) / 2, Dy = (By + Cy) / 2;
  const Ex = (Ax + Cx) / 2, Ey = (Ay + Cy) / 2;
  const Fx = (Ax + Bx) / 2, Fy = (Ay + By) / 2;

  // Side lengths (in SVG coords, but we show scaled values)
  const sAB = Math.sqrt((Bx - Ax) ** 2 + (By - Ay) ** 2);
  const sBC = Math.sqrt((Cx - Bx) ** 2 + (Cy - By) ** 2);
  const sAC = Math.sqrt((Cx - Ax) ** 2 + (Cy - Ay) ** 2);
  const totalSvg = sAB + sBC + sAC;

  const AB = (sAB / totalSvg) * perimeter;
  const BC = (sBC / totalSvg) * perimeter;
  const AC = (sAC / totalSvg) * perimeter;

  const perimeterDEF = perimeter / 2;
  const areaRatio = "1:4";

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת קו אמצעים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את היקף △ABC — וצפו כיצד היקף △DEF (משולש האמצעים) תמיד מחצית.</p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>היקף △ABC</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{perimeter}</span>
          </div>
          <input type="range" min={30} max={300} step={1} value={perimeter} onChange={(e) => setPerimeter(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 300 220" className="w-full max-w-sm mx-auto" aria-hidden>
          {/* Outer triangle */}
          <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`} fill="none" stroke="#94a3b8" strokeWidth={2} />
          {/* Inner midline triangle */}
          <polygon points={`${Dx},${Dy} ${Ex},${Ey} ${Fx},${Fy}`} fill={st.accentColor} fillOpacity={0.1} stroke={st.accentColor} strokeWidth={2} strokeDasharray="6,3" />
          {/* Parallel indicators */}
          <line x1={(Dx + Ex) / 2 - 3} y1={(Dy + Ey) / 2 - 3} x2={(Dx + Ex) / 2 + 3} y2={(Dy + Ey) / 2 + 3} stroke="#a78bfa" strokeWidth={2} />
          <line x1={(Ax + Bx) / 2 - 3} y1={(Ay + By) / 2 - 3} x2={(Ax + Bx) / 2 + 3} y2={(Ay + By) / 2 + 3} stroke="#a78bfa" strokeWidth={2} />
          {/* Labels */}
          <text x={Ax} y={Ay - 6} fontSize={13} fill="#2D3436" textAnchor="middle" fontWeight={700}>A</text>
          <text x={Bx - 10} y={By + 14} fontSize={13} fill="#2D3436" textAnchor="middle" fontWeight={700}>B</text>
          <text x={Cx + 10} y={Cy + 14} fontSize={13} fill="#2D3436" textAnchor="middle" fontWeight={700}>C</text>
          <text x={Dx} y={Dy + 16} fontSize={12} fill={st.accentColor} textAnchor="middle" fontWeight={600}>D</text>
          <text x={Ex + 12} y={Ey} fontSize={12} fill={st.accentColor} textAnchor="start" fontWeight={600}>E</text>
          <text x={Fx - 12} y={Fy} fontSize={12} fill={st.accentColor} textAnchor="end" fontWeight={600}>F</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "היקף △ABC", val: perimeter.toFixed(0) },
          { label: "היקף △DEF", val: perimeterDEF.toFixed(0) },
          { label: "יחס היקפים", val: "1:2" },
          { label: "יחס שטחים", val: areaRatio },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>
        משולש האמצעים תמיד דומה למשולש המקורי ביחס 1:2 — היקפו חצי ושטחו רבע!
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
  const [activeTab, setActiveTab] = useState<"angles" | "congruence" | "midline" | null>(null);

  const tabs = [
    { id: "angles" as const, label: "סכום זוויות", tex: "180°", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "congruence" as const, label: "חפיפה", tex: "\\cong", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "midline" as const, label: "קו אמצעים", tex: "\\parallel", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: Sum of Angles */}
      {activeTab === "angles" && (
        <motion.div key="angles" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\angle A + \\angle B + \\angle C = 180°"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>סכום זוויות במשולש</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>סכום שלוש הזוויות במשולש שווה תמיד ל-<InlineMath>{"180°"}</InlineMath>.</li>
                  <li>במשולש שווה-שוקיים: <InlineMath>{"\\angle B = \\angle C = \\frac{180° - \\angle A}{2}"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: אם ∠A = 40°, אז ∠B = ∠C = (180° - 40°)/2 = 70°
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Congruence */}
      {activeTab === "congruence" && (
        <motion.div key="congruence" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#EA580C", fontSize: 16, fontWeight: 700 }}>
              משפטי חפיפת משולשים
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>שלושה תנאי חפיפה</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><strong>צ.צ.צ (SSS)</strong> — שלוש צלעות שוות.</li>
                  <li><strong>צ.ז.צ (SAS)</strong> — שתי צלעות והזווית שביניהן.</li>
                  <li><strong>ז.צ.ז (ASA)</strong> — שתי זוויות והצלע שביניהן.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                ממשולשים חופפים נובע: כל הזוויות והצלעות המתאימות שוות.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Midline */}
      {activeTab === "midline" && (
        <motion.div key="midline" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#DC2626", fontSize: 16, fontWeight: 700 }}>
              משפט קו האמצעים
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הגדרה ותוצאות</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>קטע המחבר אמצעי שתי צלעות מקביל לצלע השלישית.</li>
                  <li>אורך קו האמצעים שווה לחצי אורך הצלע השלישית.</li>
                  <li>יחס שטחים: <InlineMath>{"\\frac{S_{DEF}}{S_{ABC}} = \\frac{1}{4}"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                △DEF ~ △ABC ביחס 1:2. היקף △DEF = חצי היקף △ABC.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrianglesPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>משולשים עם AI — כיתה י׳ (5 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>שווה-שוקיים, חפיפת משולשים, קו אמצעים — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/5u/topic/grade10/geometry"
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

        <SubtopicProgress subtopicId="5u/grade10/geometry/triangles" />

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
        {selectedLevel === "basic" && <IsoscelesLab />}
        {selectedLevel === "medium" && <CongruenceLab />}
        {selectedLevel === "advanced" && <MidlineLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="5u/grade10/geometry/triangles" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
