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
  return (
    <svg viewBox="0 0 260 180" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Trapezoid ABCD: AB top (shorter), CD bottom (longer) */}
      <polygon points="80,40 180,40 220,140 40,140" fill="none" stroke="#94a3b8" strokeWidth={2} />
      {/* Parallel marks on AB */}
      <line x1={125} y1={37} x2={135} y2={37} stroke="#f59e0b" strokeWidth={2} />
      <line x1={125} y1={43} x2={135} y2={43} stroke="#f59e0b" strokeWidth={2} />
      {/* Parallel marks on CD */}
      <line x1={125} y1={137} x2={135} y2={137} stroke="#f59e0b" strokeWidth={2} />
      <line x1={125} y1={143} x2={135} y2={143} stroke="#f59e0b" strokeWidth={2} />
      {/* Height dashed */}
      <line x1={130} y1={40} x2={130} y2={140} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4,3" />
      <text x={137} y={95} fontSize={11} fill="#64748b" fontFamily="sans-serif">h</text>
      {/* Diagonals — light */}
      <line x1={80} y1={40} x2={220} y2={140} stroke="#a78bfa" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
      <line x1={180} y1={40} x2={40} y2={140} stroke="#a78bfa" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
      {/* Intersection O */}
      <circle cx={125} cy={80} r={3} fill="#a78bfa" />
      <text x={115} y={76} fontSize={11} fill="#a78bfa" fontFamily="sans-serif">O</text>
      {/* Labels */}
      <text x={72} y={32} fontSize={12} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700}>A</text>
      <text x={182} y={32} fontSize={12} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700}>B</text>
      <text x={222} y={155} fontSize={12} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700}>C</text>
      <text x={28} y={155} fontSize={12} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700}>D</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 260 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Quadrilateral ABCD */}
      <polygon points="70,40 200,50 190,160 60,150" fill="none" stroke="#94a3b8" strokeWidth={2} />
      {/* Diagonals */}
      <line x1={70} y1={40} x2={190} y2={160} stroke="#EA580C" strokeWidth={1.5} opacity={0.6} />
      <line x1={200} y1={50} x2={60} y2={150} stroke="#EA580C" strokeWidth={1.5} opacity={0.6} />
      {/* Midpoint O */}
      <circle cx={130} cy={100} r={3.5} fill="#EA580C" />
      <text x={136} y={96} fontSize={11} fill="#EA580C" fontFamily="sans-serif" fontWeight={700}>O</text>
      {/* Tick marks AO = OC */}
      <line x1={98} y1={66} x2={104} y2={74} stroke="#EA580C" strokeWidth={2} />
      <line x1={158} y1={128} x2={164} y2={136} stroke="#EA580C" strokeWidth={2} />
      {/* Tick marks BO = OD (double) */}
      <line x1={163} y1={73} x2={168} y2={80} stroke="#EA580C" strokeWidth={2} />
      <line x1={166} y1={73} x2={171} y2={80} stroke="#EA580C" strokeWidth={2} />
      <line x1={93} y1={122} x2={98} y2={129} stroke="#EA580C" strokeWidth={2} />
      <line x1={96} y1={122} x2={101} y2={129} stroke="#EA580C" strokeWidth={2} />
      {/* Labels */}
      <text x={62} y={32} fontSize={12} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700}>A</text>
      <text x={202} y={44} fontSize={12} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700}>B</text>
      <text x={192} y={175} fontSize={12} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700}>C</text>
      <text x={48} y={162} fontSize={12} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700}>D</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 300 220" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Triangle ABC */}
      <polygon points="150,20 50,190 250,190" fill="none" stroke="#94a3b8" strokeWidth={2} />
      {/* D = midpoint AB */}
      <circle cx={100} cy={105} r={3} fill="#DC2626" />
      <text x={84} y={100} fontSize={11} fill="#DC2626" fontFamily="sans-serif" fontWeight={700}>D</text>
      {/* E = midpoint AC */}
      <circle cx={200} cy={105} r={3} fill="#DC2626" />
      <text x={206} y={100} fontSize={11} fill="#DC2626" fontFamily="sans-serif" fontWeight={700}>E</text>
      {/* Midline DE */}
      <line x1={100} y1={105} x2={200} y2={105} stroke="#34d399" strokeWidth={1.8} />
      {/* F — line through C parallel to AB meets DE extended */}
      <circle cx={300} cy={105} r={0} />
      {/* F at extension: CF parallel to AB. C=(250,190). Parallel to AB means same direction as D->A reversed. F is such that DBCF is parallelogram */}
      {/* DBCF parallelogram: D=(100,105), B=(50,190), C=(250,190), F=(300,105) — but clip to viewBox */}
      {/* Actually: DBCF: D->B->C->F. DB vector = (-50,85). So F = C + (D - B) = (250+50, 190-85) = (300,105). Let's adjust to fit. */}
      {/* Scale down: D=(100,105), B=(60,180), C=(240,180), F=(280,105) */}
      {/* Redraw triangle: A=(150,25), B=(60,180), C=(240,180) */}
      {/* D midpoint AB = (105, 102.5), E midpoint AC = (195, 102.5) */}
      {/* F = C + D - B = (240+105-60, 180+102.5-180) = (285, 102.5) */}
      {/* Parallelogram DBCF */}
      <line x1={105} y1={103} x2={60} y2={180} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4,3" />
      <line x1={60} y1={180} x2={240} y2={180} stroke="#94a3b8" strokeWidth={2} />
      <line x1={240} y1={180} x2={280} y2={103} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4,3" />
      <line x1={105} y1={103} x2={280} y2={103} stroke="#34d399" strokeWidth={1.5} />
      {/* Overwrite triangle properly */}
      <line x1={150} y1={25} x2={60} y2={180} stroke="#94a3b8" strokeWidth={2} />
      <line x1={150} y1={25} x2={240} y2={180} stroke="#94a3b8" strokeWidth={2} />
      {/* D midpoint mark */}
      <circle cx={105} cy={103} r={3} fill="#DC2626" />
      <text x={88} y={97} fontSize={11} fill="#DC2626" fontFamily="sans-serif" fontWeight={700}>D</text>
      {/* E midpoint mark */}
      <circle cx={195} cy={103} r={3} fill="#DC2626" />
      <text x={198} y={97} fontSize={11} fill="#DC2626" fontFamily="sans-serif" fontWeight={700}>E</text>
      {/* F */}
      <circle cx={280} cy={103} r={3} fill="#a78bfa" />
      <text x={282} y={97} fontSize={11} fill="#a78bfa" fontFamily="sans-serif" fontWeight={700}>F</text>
      {/* Vertex labels */}
      <text x={144} y={18} fontSize={12} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700}>A</text>
      <text x={44} y={192} fontSize={12} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700}>B</text>
      <text x={244} y={192} fontSize={12} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700}>C</text>
      {/* Midline DE highlighted */}
      <line x1={105} y1={103} x2={195} y2={103} stroke="#34d399" strokeWidth={2} />
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
      setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי -- כתוב לפחות 20 תווים." });
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
            בדיקת AI מדומה
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
      setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי -- כתוב לפחות 20 תווים." });
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
            בדיקת AI מדומה
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
        subjectWords={["משולש", "טרפז", "מקבילית", "קו אמצעים", "הוכחה", "שטח"]}
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
          <div style={{ color: "#14532d", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>כל הכבוד -- השלמת את הרמה המתקדמת!</div>
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
    title: "טרפז -- תכונות ושטח",
    problem: "טרפז ABCD, בו AB ∥ CD.\nנתונים: הבסיס העליון AB, הבסיס התחתון CD, והגובה h.\n\nא. חשבו את שטח הטרפז לפי הנוסחה S = ½(a+b)·h.\nב. מצאו את קו האמצעים (ממוצע שני הבסיסים).\nג. אם האלכסונים נחתכים בנקודה O, הוכיחו שמשולשים AOB ו-COD דומים.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "שוכחים לחבר את שני הבסיסים לפני הכפלה", text: "הנוסחה היא S = ½(a+b)·h. תלמידים רבים כופלים בסיס אחד בגובה ומחלקים ב-2 -- וזו נוסחה של משולש, לא טרפז! צריך קודם לחבר את שני הבסיסים." },
      { title: "קו אמצעים אינו ממוצע השוקיים", text: "קו האמצעים בטרפז שווה לממוצע של שני הבסיסים: (a+b)/2. תלמידים מבלבלים לפעמים עם ממוצע אורכי השוקיים -- זה לא אותו דבר כלל!" },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יא', 5 יחידות, ומצרף/ת שאלה בגיאומטריה על טרפז -- שטח, קו אמצעים ודמיון משולשים. אני רוצה שתהיה המורה הפרטי שלי -- תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי -- שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: "אני מוכן להמשיך."`,
    steps: [
      { phase: "סעיף א׳", label: "חישוב שטח טרפז", coaching: "", prompt: "טרפז ABCD, AB ∥ CD. נתונים שני בסיסים וגובה. תנחה אותי כיצד לחשב את שטח הטרפז לפי הנוסחה S = ½(a+b)·h -- מה צריך לחבר קודם?", keywords: [], keywordHint: "", contextWords: ["שטח", "טרפז", "בסיס", "גובה", "נוסחה", "חיבור"] },
      { phase: "סעיף ב׳", label: "קו אמצעים", coaching: "", prompt: "טרפז ABCD, AB ∥ CD. תסביר לי מהו קו האמצעים בטרפז ואיך מחשבים אותו -- ממוצע שני הבסיסים.", keywords: [], keywordHint: "", contextWords: ["קו אמצעים", "ממוצע", "בסיסים", "טרפז", "מקביל", "אורך"] },
      { phase: "סעיף ג׳", label: "דמיון משולשים AOB ו-COD", coaching: "", prompt: "בטרפז ABCD, האלכסונים נחתכים ב-O. תדריך אותי להוכיח שמשולשים AOB ו-COD דומים -- אילו זוויות שוות ולמה?", keywords: [], keywordHint: "", contextWords: ["דמיון", "משולשים", "זוויות", "מתחלפות", "מקבילים", "הוכחה"] },
    ],
  },
  {
    id: "medium",
    title: "הוכחה: מרובע הוא מקבילית",
    problem: "מרובע ABCD. האלכסונים AC ו-BD נחתכים בנקודה O וחוצים זה את זה (AO = OC, BO = OD).\n\nא. הוכיחו שמשולשים AOB ≅ COD (בעזרת צ.ז.צ).\nב. הסיקו כי AB = CD וכי AB ∥ CD.\nג. הוכיחו ש-ABCD הוא מקבילית.\nד. באיזה תנאי נוסף ABCD יהיה מלבן?",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "התאמת קודקודים שגויה בחפיפה", text: "כשכותבים AOB ≅ COD צריך לוודא שהקודקודים מתאימים: A↔C, O↔O, B↔D. אם כותבים AOB ≅ DOC, הזוויות והצלעות לא מתאימות ומשפט החפיפה לא עובד." },
      { title: "שוכחים להוכיח שני זוגות של צלעות מקבילות", text: "כדי שמרובע יהיה מקבילית, לא מספיק להראות שזוג אחד של צלעות נגדיות מקבילות ושוות -- צריך גם את הזוג השני, או להשתמש במשפט שקול (אלכסונים חוצים זה את זה)." },
    ],
    goldenPrompt: `אני בכיתה יא', 5 יחידות, מצרף/ת תרגיל בגיאומטריה בנושא הוכחת מקבילית. נתון מרובע שהאלכסונים חוצים זה את זה.

אל תפתור עבורי -- שאל אותי שאלות מכוונות על חפיפת משולשים, צלעות נגדיות, ותנאים למקבילית ולמלבן.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: "אני מוכן להמשיך."`,
    steps: [
      { phase: "סעיף א׳", label: "חפיפת משולשים AOB ≅ COD", coaching: "", prompt: "מרובע ABCD, אלכסונים חוצים זה את זה ב-O (AO=OC, BO=OD). תנחה אותי להוכיח AOB ≅ COD בעזרת צ.ז.צ -- אילו צלעות שוות ואיזו זווית ביניהן?", keywords: [], keywordHint: "", contextWords: ["חפיפה", "צ.ז.צ", "אלכסונים", "חוצים", "משולשים", "זווית"] },
      { phase: "סעיף ב׳", label: "AB = CD ו-AB ∥ CD", coaching: "", prompt: "לאחר שהוכחנו AOB ≅ COD, תדריך אותי להסיק ש-AB = CD (מחפיפה) ולהוכיח ש-AB ∥ CD בעזרת זוויות מתחלפות.", keywords: [], keywordHint: "", contextWords: ["שוות", "מקבילות", "מתחלפות", "חפיפה", "צלעות", "זוויות"] },
      { phase: "סעיף ג׳", label: "ABCD מקבילית", coaching: "", prompt: "תכווין אותי -- אם זוג אחד של צלעות נגדיות שוות ומקבילות, מספיק להסיק שהמרובע מקבילית? או צריך עוד?", keywords: [], keywordHint: "", contextWords: ["מקבילית", "צלעות נגדיות", "מקבילות", "משפט", "הוכחה", "תנאי"] },
      { phase: "סעיף ד׳", label: "תנאי למלבן", coaching: "", prompt: "מקבילית ABCD -- תסביר לי באיזה תנאי נוסף המקבילית הופכת למלבן. מה צריך להיות נכון לגבי הזוויות או האלכסונים?", keywords: [], keywordHint: "", contextWords: ["מלבן", "זוויות ישרות", "אלכסונים שווים", "90", "מקבילית", "תנאי"] },
    ],
  },
  {
    id: "advanced",
    title: "משולש, קו אמצעים וטרפז",
    problem: "במשולש ABC, הנקודה D היא אמצע AB, והנקודה E היא אמצע AC. ישר דרך C, מקביל ל-AB, חותך את הישר DE (בהארכה) בנקודה F.\n\nא. הוכיחו ש-DBCF הוא מקבילית.\nב. הוכיחו ש-DE = EF (כלומר E אמצע DF).\nג. חשבו את שטח DBCF באמצעות שטח △ABC.\nד. מצאו את יחס השטחים: △DEF לטרפז DBCE.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "לא מזהים זוגות צלעות מקבילות", text: "כדי להוכיח ש-DBCF מקבילית, צריך להראות שני זוגות של צלעות מקבילות. DE ∥ BC (קו אמצעים) וגם CF ∥ DB (נתון -- CF מקביל ל-AB ו-D על AB). תלמידים שוכחים לנמק את שני הזוגות." },
      { title: "טעות ביחסי שטחים", text: "כשמשתמשים ביחס שטחים של משולשים דומים, היחס הוא ריבוע יחס הדמיון (k^2). קו אמצעים מחלק באורכים 1:2, אז שטח משולש קטן = 1/4 מהגדול, לא 1/2!" },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים -- כתוב פרומפט שמסביר: כיצד קו אמצעים יוצר מקבילית עם ישר מקביל, ואיך מחשבים יחסי שטחים? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "DBCF מקבילית", coaching: "", prompt: "משולש ABC, D אמצע AB, E אמצע AC, ישר דרך C מקביל ל-AB חותך את DE בהארכה ב-F. תנחה אותי להוכיח ש-DBCF מקבילית -- אילו זוגות צלעות מקבילות קיימים?", keywords: [], keywordHint: "", contextWords: ["מקבילית", "מקביל", "קו אמצעים", "צלעות", "הוכחה", "זוגות"] },
      { phase: "סעיף ב׳", label: "DE = EF", coaching: "", prompt: "DBCF מקבילית. תדריך אותי להוכיח ש-E היא אמצע DF. רמז: באלכסוני מקבילית, מה נכון לגבי נקודת החיתוך?", keywords: [], keywordHint: "", contextWords: ["אמצע", "אלכסון", "מקבילית", "חוצה", "שווה", "DE"] },
      { phase: "סעיף ג׳", label: "שטח DBCF", coaching: "", prompt: "תסביר לי את הקשר בין שטח מקבילית DBCF לשטח המשולש ABC. קו אמצעים מחלק את המשולש -- מה היחס?", keywords: [], keywordHint: "", contextWords: ["שטח", "מקבילית", "משולש", "יחס", "חצי", "קו אמצעים"] },
      { phase: "סעיף ד׳", label: "יחס שטחים DEF לטרפז DBCE", coaching: "", prompt: "תכווין אותי לחשב את יחס השטחים בין משולש DEF לטרפז DBCE. מה שטח כל חלק ביחס ל-ABC?", keywords: [], keywordHint: "", contextWords: ["יחס", "שטחים", "טרפז", "משולש", "דמיון", "ריבוע"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>משולשים ומרובעים (Triangles & Quadrilaterals)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "טרפז -- שטח לפי נוסחת הבסיסים והגובה, קו אמצעים, ודמיון משולשים הנוצרים מאלכסונים."}
            {ex.id === "medium" && "הוכחת מקבילית -- חפיפת משולשים (צ.ז.צ), צלעות נגדיות שוות ומקבילות, ותנאי למלבן."}
            {ex.id === "advanced" && "קו אמצעים במשולש, בניית מקבילית, ויחסי שטחים בין משולשים, טרפזים ומקביליות."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: תכונות מרכזיות */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>תכונות מרכזיות</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>טרפז</span>
              <span>מרובע עם זוג אחד של צלעות מקבילות. שטח = ½(a+b)·h.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>מקבילית</span>
              <span>צלעות נגדיות שוות ומקבילות, אלכסונים חוצים זה את זה.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>קו אמצעים</span>
              <span>מקביל לצלע השלישית ושווה לחציה.</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>כלים להוכחה</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>חפיפה</span>
                  <span>צ.צ.צ / צ.ז.צ / ז.צ.ז -- להוכחת שוויון צלעות וזוויות.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>דמיון</span>
                  <span>ז.ז / צ.צ.צ / צ.ז.צ -- יחס צלעות שווה, זוויות שוות.</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>יחסי שטחים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>דמיון k</span>
                  <span>יחס שטחים = k^2 (ריבוע יחס הדמיון)</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>קו אמצעים</span>
                  <span>חוצה שטח: משולש קטן = 1/4 שטח הגדול</span>
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

      {/* Advanced -- outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}

    </section>
  );
}

// ─── TrapezoidLab (basic) ───────────────────────────────────────────────────

function TrapezoidLab() {
  const [base1, setBase1] = useState(60);
  const [base2, setBase2] = useState(100);
  const [height, setHeight] = useState(50);
  const st = STATION.basic;

  const area = 0.5 * (base1 + base2) * height;
  const midline = (base1 + base2) / 2;
  const side = Math.sqrt(((base2 - base1) / 2) ** 2 + height ** 2);
  const perimeter = base1 + base2 + 2 * side;

  // SVG coordinates
  const svgW = 280, svgH = 180, pad = 30;
  const drawW = svgW - 2 * pad;
  const scale = drawW / Math.max(base2, 120);
  const topW = base1 * scale;
  const botW = base2 * scale;
  const h = Math.min(height * scale * 0.8, 120);
  const cx = svgW / 2;
  const topY = 20;
  const botY = topY + h;
  const midY = (topY + botY) / 2;
  const midW = midline * scale;

  return (
    <section style={{ border: "1px solid rgba(22,163,74,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת טרפז</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את הבסיסים והגובה וצפו כיצד השטח, קו האמצעים וההיקף משתנים בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "בסיס עליון (a)", value: base1, set: setBase1, min: 20, max: 150 },
          { label: "בסיס תחתון (b)", value: base2, set: setBase2, min: 20, max: 200 },
          { label: "גובה (h)", value: height, set: setHeight, min: 10, max: 120 },
        ].map((sl) => (
          <div key={sl.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{sl.value}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={1} value={sl.value} onChange={(e) => sl.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${botY + 30}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Trapezoid */}
          <polygon
            points={`${cx - topW / 2},${topY} ${cx + topW / 2},${topY} ${cx + botW / 2},${botY} ${cx - botW / 2},${botY}`}
            fill="rgba(22,163,74,0.12)" stroke="#16A34A" strokeWidth={2}
          />
          {/* Midline */}
          <line x1={cx - midW / 2} y1={midY} x2={cx + midW / 2} y2={midY} stroke="#f59e0b" strokeWidth={2} strokeDasharray="6,3" />
          <text x={cx + midW / 2 + 6} y={midY + 4} fontSize={10} fill="#f59e0b" fontFamily="sans-serif" fontWeight={600}>קו אמצעים</text>
          {/* Height */}
          <line x1={cx} y1={topY} x2={cx} y2={botY} stroke="#64748b" strokeWidth={1.2} strokeDasharray="4,3" />
          <text x={cx + 6} y={(topY + botY) / 2} fontSize={10} fill="#64748b" fontFamily="sans-serif">h</text>
          {/* Labels */}
          <text x={cx} y={topY - 6} fontSize={10} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>a</text>
          <text x={cx} y={botY + 14} fontSize={10} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>b</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "שטח", val: area.toFixed(1) },
          { label: "קו אמצעים", val: midline.toFixed(1) },
          { label: "היקף (משוער)", val: perimeter.toFixed(1) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>שנו את הבסיסים -- קו האמצעים תמיד ממוצע שניהם!</p>
    </section>
  );
}

// ─── ParallelogramLab (medium) ──────────────────────────────────────────────

function ParallelogramLab() {
  const [side, setSide] = useState(80);
  const [angle, setAngle] = useState(60);
  const st = STATION.medium;

  const angleRad = (angle * Math.PI) / 180;
  const h = side * Math.sin(angleRad);
  const area = side * h;
  const d1 = Math.sqrt(2 * side * side * (1 - Math.cos(angleRad)));
  const d2 = Math.sqrt(2 * side * side * (1 + Math.cos(angleRad)));
  const isRectangle = angle === 90;

  // SVG
  const svgW = 300, svgH = 180;
  const scale = 1.2;
  const bx = 40, by = 140;
  const sideLen = side * scale * 0.8;
  const dx = sideLen * Math.cos(angleRad);
  const dy = sideLen * Math.sin(angleRad);

  const A = { x: bx + dx, y: by - dy };
  const B = { x: bx, y: by };
  const C = { x: bx + sideLen, y: by };
  const D = { x: A.x + sideLen, y: A.y };
  const O = { x: (B.x + D.x) / 2, y: (B.y + D.y) / 2 };

  return (
    <section style={{ border: "1px solid rgba(234,88,12,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת מקבילית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את אורך הצלע והזווית -- צפו כיצד האלכסונים, השטח ותנאי המלבן משתנים.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "צלע", value: side, set: setSide, min: 30, max: 120 },
          { label: "זווית (מעלות)", value: angle, set: setAngle, min: 10, max: 170 },
        ].map((sl) => (
          <div key={sl.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{sl.value}{sl.label.includes("זווית") ? "°" : ""}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={1} value={sl.value} onChange={(e) => sl.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Parallelogram */}
          <polygon
            points={`${A.x},${A.y} ${D.x},${D.y} ${C.x},${C.y} ${B.x},${B.y}`}
            fill="rgba(234,88,12,0.1)" stroke="#EA580C" strokeWidth={2}
          />
          {/* Diagonals */}
          <line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="#a78bfa" strokeWidth={1.2} strokeDasharray="4,3" />
          <line x1={B.x} y1={B.y} x2={D.x} y2={D.y} stroke="#a78bfa" strokeWidth={1.2} strokeDasharray="4,3" />
          {/* Midpoint O */}
          <circle cx={O.x} cy={O.y} r={3} fill="#EA580C" />
          <text x={O.x + 6} y={O.y - 4} fontSize={10} fill="#EA580C" fontFamily="sans-serif" fontWeight={700}>O</text>
          {/* Labels */}
          <text x={A.x - 4} y={A.y - 8} fontSize={11} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700} textAnchor="middle">A</text>
          <text x={D.x + 4} y={D.y - 8} fontSize={11} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700} textAnchor="middle">D</text>
          <text x={C.x + 4} y={C.y + 14} fontSize={11} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700} textAnchor="middle">C</text>
          <text x={B.x - 4} y={B.y + 14} fontSize={11} fill="#1A1A1A" fontFamily="sans-serif" fontWeight={700} textAnchor="middle">B</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "שטח", val: area.toFixed(1) },
          { label: "אלכסונים", val: `${d1.toFixed(1)}, ${d2.toFixed(1)}` },
          { label: "מלבן?", val: isRectangle ? "כן!" : "לא" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: row.label === "מלבן?" && isRectangle ? "#16a34a" : st.accentColor, fontWeight: 700, fontSize: row.label === "אלכסונים" ? 14 : 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>האלכסונים חוצים זה את זה תמיד -- שווים רק כשהזווית 90 מעלות (מלבן)!</p>
    </section>
  );
}

// ─── MidlineConstructionLab (advanced) ──────────────────────────────────────

function MidlineConstructionLab() {
  const [dPos, setDPos] = useState(50);
  const st = STATION.advanced;

  // Triangle A=(150,20), B=(40,180), C=(260,180)
  // D = point on AB at dPos% from A
  const A = { x: 150, y: 20 };
  const B = { x: 40, y: 180 };
  const C = { x: 260, y: 180 };

  const t = dPos / 100;
  const D = { x: A.x + t * (B.x - A.x), y: A.y + t * (B.y - A.y) };
  // E = same ratio on AC
  const E = { x: A.x + t * (C.x - A.x), y: A.y + t * (C.y - A.y) };
  // F = C + (D - B) to form parallelogram DBCF
  const F = { x: C.x + D.x - B.x, y: C.y + D.y - B.y };

  // DE length (proportional to BC)
  const BC = Math.sqrt((C.x - B.x) ** 2 + (C.y - B.y) ** 2);
  const DE = t * BC;
  // Area ratio: triangle ADE / triangle ABC = t^2
  const areaRatio = t * t;
  // DBCF area = parallelogram = BC * height of parallelogram = same base and height as triangle portion
  // More precisely: area DBCF = area(ABC) - area(ADE) + area(DEF) ... but for parallelogram:
  // DBCF is a parallelogram with base BC and some height. Actually area(DBCF) = |DB x DC| cross product approach
  // Simpler: area(ABC) = 0.5 * |AB x AC|. area(ADE) = t^2 * area(ABC). area(DBCF) = 2 * area(DBC)
  // area(DBC) = area(ABC) - area(ADC) ... Let's compute numerically
  const areaABC = 0.5 * Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y));
  const areaADE = areaRatio * areaABC;
  // DBCF parallelogram area = |DB x DF| where DB = B - D, DF = F - D
  const DB = { x: B.x - D.x, y: B.y - D.y };
  const DF = { x: F.x - D.x, y: F.y - D.y };
  const areaDBCF = Math.abs(DB.x * DF.y - DB.y * DF.x);

  return (
    <section style={{ border: "1px solid rgba(220,38,38,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת קו אמצעים ומקבילית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>הזיזו את D לאורך AB (ו-E לאורך AC באותו יחס) -- צפו כיצד המקבילית DBCF נבנית.</p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>מיקום D על AB</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{dPos}%</span>
          </div>
          <input type="range" min={10} max={90} step={1} value={dPos} onChange={(e) => setDPos(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 320 220" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Triangle ABC */}
          <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="rgba(220,38,38,0.06)" stroke="#94a3b8" strokeWidth={1.5} />
          {/* Parallelogram DBCF */}
          <polygon
            points={`${D.x},${D.y} ${B.x},${B.y} ${C.x},${C.y} ${F.x},${F.y}`}
            fill="rgba(168,139,250,0.12)" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="6,3"
          />
          {/* Midline DE */}
          <line x1={D.x} y1={D.y} x2={E.x} y2={E.y} stroke="#34d399" strokeWidth={2.5} />
          {/* Extension to F */}
          <line x1={E.x} y1={E.y} x2={F.x} y2={F.y} stroke="#34d399" strokeWidth={1.5} strokeDasharray="4,3" />
          {/* Points */}
          <circle cx={A.x} cy={A.y} r={3.5} fill="#1A1A1A" />
          <circle cx={B.x} cy={B.y} r={3.5} fill="#1A1A1A" />
          <circle cx={C.x} cy={C.y} r={3.5} fill="#1A1A1A" />
          <circle cx={D.x} cy={D.y} r={4} fill="#DC2626" />
          <circle cx={E.x} cy={E.y} r={4} fill="#DC2626" />
          <circle cx={F.x} cy={F.y} r={4} fill="#a78bfa" />
          {/* Labels */}
          <text x={A.x} y={A.y - 8} fontSize={12} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>A</text>
          <text x={B.x - 10} y={B.y + 4} fontSize={12} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>B</text>
          <text x={C.x + 10} y={C.y + 4} fontSize={12} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>C</text>
          <text x={D.x - 12} y={D.y + 4} fontSize={11} fill="#DC2626" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>D</text>
          <text x={E.x + 12} y={E.y + 4} fontSize={11} fill="#DC2626" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>E</text>
          <text x={F.x + 10} y={F.y - 4} fontSize={11} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>F</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "אורך DE", val: DE.toFixed(1) },
          { label: "יחס שטחים ADE/ABC", val: `${(areaRatio * 100).toFixed(0)}%` },
          { label: "שטח DBCF", val: areaDBCF.toFixed(0) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>כש-D ב-50% (אמצע AB) -- קו האמצעים מחלק את המשולש כך ש-ADE = 1/4 מ-ABC!</p>
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
  const [activeTab, setActiveTab] = useState<"trapezoid" | "parallelogram" | "midline" | null>(null);

  const tabs = [
    { id: "trapezoid" as const, label: "טרפז", tex: "S_{\\text{trap}}", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "parallelogram" as const, label: "מקבילית", tex: "\\parallelogram", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "midline" as const, label: "קו אמצעים", tex: "DE", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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
            </button>
          );
        })}
      </div>

      {/* Expanded: Trapezoid */}
      {activeTab === "trapezoid" && (
        <motion.div key="trapezoid" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S = \\frac{1}{2}(a+b) \\cdot h"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>נוסחת שטח טרפז</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>a ו-b הם שני הבסיסים המקבילים.</li>
                  <li>h הוא הגובה -- המרחק בין הבסיסים.</li>
                  <li>קו אמצעים = <InlineMath>{"\\frac{a+b}{2}"}</InlineMath> (ממוצע הבסיסים).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: a=6, b=10, h=4. שטח = ½(6+10)·4 = 32
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Parallelogram */}
      {activeTab === "parallelogram" && (
        <motion.div key="parallelogram" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S = a \\cdot h"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>תכונות מקבילית</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>צלעות נגדיות שוות ומקבילות.</li>
                  <li>אלכסונים חוצים זה את זה.</li>
                  <li>שטח = בסיס כפול גובה.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                מלבן = מקבילית עם זווית ישרה. במלבן: אלכסונים שווים.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Midline */}
      {activeTab === "midline" && (
        <motion.div key="midline" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"DE \\parallel BC,\\quad DE = \\frac{1}{2}BC"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>משפט קו האמצעים במשולש</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>D אמצע AB, E אמצע AC.</li>
                  <li>DE מקביל ל-BC ושווה לחציו.</li>
                  <li>יחס שטחים: <InlineMath>{"\\frac{S_{ADE}}{S_{ABC}} = k^2 = \\frac{1}{4}"}</InlineMath></li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                יחס הדמיון k=1/2, לכן יחס השטחים = (1/2)^2 = 1/4
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrianglesQuadrilateralsPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>משולשים ומרובעים עם AI -- כיתה יא׳ (5 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>טרפז, הוכחת מקבילית, קו אמצעים ויחסי שטחים -- ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/5u/topic/grade11/geometry"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
          >
            <span style={{ fontSize: 16 }}>&#x2190;</span>
            חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>

        <SubtopicProgress subtopicId="5u/grade11/geometry/triangles-quadrilaterals" />

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

        {/* Lab -- each level gets its own lab */}
        {selectedLevel === "basic" && <TrapezoidLab />}
        {selectedLevel === "medium" && <ParallelogramLab />}
        {selectedLevel === "advanced" && <MidlineConstructionLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="5u/grade11/geometry/triangles-quadrilaterals" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
