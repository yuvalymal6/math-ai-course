"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle2, Lock } from "lucide-react";
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
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",   glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700",  glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",     glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderRgb: "139,38,53" },
} as const;

const TABS = [
  { id: "basic" as const,    label: "מתחיל",  textColor: "text-green-700",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium" as const,   label: "בינוני", textColor: "text-orange-700",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced" as const, label: "מתקדם",  textColor: "text-red-700",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

const TANGENT_SUBJECT_WORDS = [
  "משיק", "רדיוס", "ניצבות", "מרחק", "נקודת משיקות", "מעגל", "שיפוע", "ישר",
];

// ─── TangentGraph ─────────────────────────────────────────────────────────────

function TangentGraph({
  cx, cy, r, px, py, xMin, xMax, yMin, yMax,
  circleColor = "#3b82f6", tangentColor = "#a78bfa",
}: {
  cx: number; cy: number; r: number; px: number; py: number;
  xMin: number; xMax: number; yMin: number; yMax: number;
  circleColor?: string; tangentColor?: string;
}) {
  const S = 180;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * S;
  const toSy = (y: number) => S - ((y - yMin) / (yMax - yMin)) * S;
  const rS = (r * S) / (xMax - xMin);
  const ox = toSx(0), oy = toSy(0);
  const xRange = xMax - xMin;
  const gridStep = xRange <= 14 ? 2 : 4;
  const gxVals: number[] = [];
  const gyVals: number[] = [];
  for (let v = Math.ceil(xMin / gridStep) * gridStep; v <= xMax; v += gridStep) gxVals.push(v);
  for (let v = Math.ceil(yMin / gridStep) * gridStep; v <= yMax; v += gridStep) gyVals.push(v);

  const rdx = px - cx, rdy = py - cy;
  const tanSegs: string[] = [];
  const steps = 300;
  const dx = (xMax - xMin) / steps;
  let tanMoved = false;

  if (Math.abs(rdy) < 0.001) {
    const sx = toSx(px).toFixed(1);
    tanSegs.push(`M ${sx} 0 L ${sx} ${S}`);
  } else {
    const slope = -rdx / rdy;
    for (let i = 0; i <= steps; i++) {
      const xi = xMin + i * dx;
      const yi = slope * (xi - px) + py;
      if (!isFinite(yi) || isNaN(yi) || yi < yMin || yi > yMax) { tanMoved = false; continue; }
      tanSegs.push(tanMoved ? `L ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}` : `M ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}`);
      tanMoved = true;
    }
  }

  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[210px] mx-auto" aria-hidden>
      {gxVals.map(v => { const sx = toSx(v); return sx >= 0 && sx <= S ? <line key={`gx${v}`} x1={sx} y1={0} x2={sx} y2={S} stroke="rgba(100,116,139,0.2)" strokeWidth={0.6} /> : null; })}
      {gyVals.map(v => { const sy = toSy(v); return sy >= 0 && sy <= S ? <line key={`gy${v}`} x1={0} y1={sy} x2={S} y2={sy} stroke="rgba(100,116,139,0.2)" strokeWidth={0.6} /> : null; })}
      {oy >= 0 && oy <= S && <line x1={0} y1={oy} x2={S} y2={oy} stroke="#94a3b8" strokeWidth={1} />}
      {ox >= 0 && ox <= S && <line x1={ox} y1={0} x2={ox} y2={S} stroke="#94a3b8" strokeWidth={1} />}
      <circle cx={toSx(cx)} cy={toSy(cy)} r={rS} fill={circleColor} fillOpacity={0.06} stroke={circleColor} strokeWidth={2.5} />
      <path d={tanSegs.join(" ")} fill="none" stroke={tangentColor} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={toSx(cx)} cy={toSy(cy)} r={2.5} fill={circleColor} opacity={0.6} />
      <circle cx={toSx(px)} cy={toSy(py)} r={3.5} fill={tangentColor} />
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
        subjectWords={TANGENT_SUBJECT_WORDS}
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
  const [activeTab, setActiveTab] = useState<"slope" | "perp" | "line" | "dist" | null>(null);

  const tabs = [
    { id: "slope" as const, label: "שיפוע",         tex: String.raw`m = \frac{y_2-y_1}{x_2-x_1}`,  color: "#3b82f6", borderColor: "rgba(59,130,246,0.35)" },
    { id: "perp" as const,  label: "ניצבות",         tex: String.raw`m_1 \cdot m_2 = -1`,            color: "#a78bfa", borderColor: "rgba(167,139,250,0.35)" },
    { id: "line" as const,  label: "משוואת ישר",     tex: String.raw`y - y_1 = m(x - x_1)`,          color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "dist" as const,  label: "מרחק",           tex: String.raw`d`,                             color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
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

      {/* Expanded: Slope */}
      {activeTab === "slope" && (
        <motion.div key="slope" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(59,130,246,0.25)", background: "rgba(59,130,246,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{String.raw`m_{\text{radius}} = \frac{y_P - y_C}{x_P - x_C}`}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>שימוש:</strong> מחשבים את שיפוע הרדיוס מהמרכז <InlineMath>C</InlineMath> לנקודת המשיקות <InlineMath>P</InlineMath>. לאחר מכן מוצאים את שיפוע המשיק דרך תנאי הניצבות.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Perpendicularity */}
      {activeTab === "perp" && (
        <motion.div key="perp" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{String.raw`m_{\text{tangent}} = \frac{-1}{m_{\text{radius}}}`}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>כלל ברזל:</strong> רדיוס &#8869; משיק בנקודת המשיקות. מכפלת השיפועים תמיד שווה <InlineMath>{String.raw`-1`}</InlineMath>.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Line equation */}
      {activeTab === "line" && (
        <motion.div key="line" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{String.raw`y - y_1 = m(x - x_1) \;\Rightarrow\; y = mx + b`}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>שלבים:</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>הציבו את שיפוע המשיק ואת נקודת המשיקות.</li>
                  <li>פתחו סוגריים ופשטו לצורה <InlineMath>{String.raw`y = mx + b`}</InlineMath>.</li>
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Distance */}
      {activeTab === "dist" && (
        <motion.div key="dist" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.3)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{String.raw`d = \frac{|ax_0 + by_0 + c|}{\sqrt{a^2 + b^2}}`}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                &#128161; <strong>להוכחת משיקות:</strong> אם <InlineMath>{String.raw`d = r`}</InlineMath> -- הישר משיק למעגל. חובה להעביר את הישר לצורה <InlineMath>{String.raw`ax + by + c = 0`}</InlineMath> לפני ההצבה.
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
    title: "משיק למעגל -- מרכז בראשית",
    problem: "נתון מעגל עם מרכז בראשית הצירים (0, 0).\nנקודת המשיקות היא (3, 4).\n\nא. חשבו את שיפוע הרדיוס מהמרכז לנקודת המשיקות.\nב. מצאו את שיפוע המשיק בעזרת תנאי הניצבות.\nג. כתבו את משוואת המשיק למעגל בנקודה הנתונה.",
    diagram: (
      <TangentGraph cx={0} cy={0} r={5} px={3} py={4}
        xMin={-7} xMax={7} yMin={-7} yMax={7}
        circleColor="#16a34a" tangentColor="#a78bfa" />
    ),
    pitfalls: [
      { title: "שיפוע הרדיוס אינו שיפוע המשיק", text: "הרדיוס והמשיק מאונכים זה לזה. אל תשתמש בשיפוע הרדיוס ישירות -- חשב את ההפכי השלילי." },
      { title: "הפכי שלילי -- לא סתם מינוס", text: "תנאי הניצבות: m\u2081 \u00D7 m\u2082 = \u22121. ההפכי השלילי של שבר הוא הפיכת המונה והמכנה + החלפת סימן. שגיאה נפוצה: להפוך רק סימן בלי להפוך את השבר." },
    ],
    goldenPrompt: "אני תלמיד כיתה יא׳. נתון מעגל עם מרכז בראשית (0,0) ונקודת משיקות (3,4).\nאני צריך:\n1. לחשב את שיפוע הרדיוס מהמרכז לנקודה\n2. למצוא את שיפוע המשיק דרך תנאי ניצבות\n3. לכתוב את משוואת המשיק\n\nאל תפתור עבורי -- שאל אותי שאלות מכוונות.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "שלב א׳ -- שיפוע הרדיוס",
        coaching: "חשב שיפוע הרדיוס מנוסחת שיפוע בין שתי נקודות",
        prompt: "נתון מעגל עם מרכז (0,0) ונקודה על המעגל (3,4). תנחה אותי לחשב את שיפוע הרדיוס מהמרכז לנקודה. תזכיר לי את הנוסחה. אל תפתור עבורי.",
        keywords: ["שיפוע", "רדיוס", "נוסחה"],
        keywordHint: "ציין שצריך לחשב שיפוע הרדיוס",
        contextWords: ["שיפוע", "רדיוס", "מרכז", "נוסחה", "נקודה", "מעגל"],
      },
      {
        phase: "ב",
        label: "שלב ב׳ -- תנאי ניצבות לשיפוע המשיק",
        coaching: "השתמש בתנאי הניצבות למציאת שיפוע המשיק",
        prompt: "מצאתי את שיפוע הרדיוס מהמרכז (0,0) לנקודה (3,4). תנחה אותי להשתמש בתנאי הניצבות כדי למצוא את שיפוע המשיק. אל תפתור עבורי.",
        keywords: ["ניצבות", "משיק", "הפכי"],
        keywordHint: "ציין שהמשיק ניצב לרדיוס",
        contextWords: ["ניצבות", "משיק", "הפכי", "שלילי", "שיפוע", "מכפלה"],
      },
      {
        phase: "ג",
        label: "שלב ג׳ -- כתיבת משוואת המשיק",
        coaching: "כתוב משוואת ישר דרך נקודת המשיקות עם השיפוע שמצאת",
        prompt: "יש לי את שיפוע המשיק ואת נקודת המשיקות (3,4). תנחה אותי לכתוב משוואת ישר ולפשט. אל תפתור עבורי.",
        keywords: ["משוואה", "ישר", "נקודה"],
        keywordHint: "ציין שצריך לכתוב משוואת ישר",
        contextWords: ["משוואה", "ישר", "נקודה", "שיפוע", "משיק", "פשט"],
      },
    ],
  },
  {
    id: "medium",
    title: "משיק למעגל עם מרכז כללי",
    problem: "נתון המעגל:\n(x \u2212 2)\u00B2 + (y \u2212 3)\u00B2 = 25\n\nא. זהו את מרכז המעגל ואת הרדיוס.\nב. חשבו את שיפוע הרדיוס מהמרכז לנקודה (5, 7).\nג. מצאו את שיפוע המשיק בנקודה (5, 7) וכתבו את משוואתו.",
    diagram: (
      <TangentGraph cx={2} cy={3} r={5} px={5} py={7}
        xMin={-4} xMax={10} yMin={-4} yMax={10}
        circleColor="#ea580c" tangentColor="#a78bfa" />
    ),
    pitfalls: [
      { title: "זיהוי מרכז מהמשוואה הסטנדרטית", text: "בצורה (x\u2212a)\u00B2+(y\u2212b)\u00B2=r\u00B2, המרכז הוא (a,b). טעות נפוצה: להחליף את הסימן ולקרוא (\u2212a,\u2212b) במקום (a,b)." },
      { title: "שיפוע הרדיוס אינו שיפוע המשיק", text: "הרדיוס והמשיק ניצבים זה לזה. חשב קודם את שיפוע הרדיוס, ואז מצא את ההפכי השלילי -- זה שיפוע המשיק." },
    ],
    goldenPrompt: "אני תלמיד כיתה יא׳. נתון המעגל (x\u22122)\u00B2+(y\u22123)\u00B2=25 ונקודת משיקות (5,7).\nאני צריך:\n1. לזהות מרכז ורדיוס מהמשוואה\n2. לחשב שיפוע הרדיוס מהמרכז ל-(5,7)\n3. למצוא שיפוע המשיק דרך תנאי ניצבות\n4. לכתוב את משוואת המשיק\n\nאל תפתור עבורי -- שאל אותי שאלות מכוונות.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "שלב א׳ -- זיהוי מרכז ורדיוס",
        coaching: "קרא את המרכז והרדיוס ישירות מהצורה התקנית",
        prompt: "נתון המעגל (x\u22122)\u00B2+(y\u22123)\u00B2=25. תנחה אותי לזהות את המרכז ואת הרדיוס מהמשוואה. אל תפתור עבורי.",
        keywords: ["מרכז", "רדיוס", "משוואה"],
        keywordHint: "ציין שצריך לזהות מרכז ורדיוס",
        contextWords: ["מרכז", "רדיוס", "משוואה", "תקנית", "סטנדרטית", "מעגל"],
      },
      {
        phase: "ב",
        label: "שלב ב׳ -- שיפוע הרדיוס",
        coaching: "חשב שיפוע הרדיוס מהמרכז לנקודה (5,7)",
        prompt: "זיהיתי את מרכז המעגל מהמשוואה (x\u22122)\u00B2+(y\u22123)\u00B2=25. תנחה אותי לחשב את שיפוע הרדיוס מהמרכז לנקודה (5,7). אל תפתור עבורי.",
        keywords: ["שיפוע", "רדיוס", "נקודה"],
        keywordHint: "ציין שצריך לחשב שיפוע",
        contextWords: ["שיפוע", "רדיוס", "נוסחה", "מרכז", "נקודה", "מעגל"],
      },
      {
        phase: "ג",
        label: "שלב ג׳ -- שיפוע המשיק ומשוואתו",
        coaching: "השתמש בתנאי ניצבות למצוא שיפוע המשיק ואז כתוב משוואת ישר",
        prompt: "מצאתי את שיפוע הרדיוס מהמרכז לנקודה (5,7) במעגל (x\u22122)\u00B2+(y\u22123)\u00B2=25. תנחה אותי למצוא את שיפוע המשיק ולכתוב את משוואתו. אל תפתור עבורי.",
        keywords: ["ניצבות", "משיק", "משוואה"],
        keywordHint: "ציין שצריך תנאי ניצבות ומשוואת ישר",
        contextWords: ["ניצבות", "משיק", "משוואה", "ישר", "שיפוע", "הפכי", "פשט"],
      },
    ],
  },
  {
    id: "advanced",
    title: "הוכחת משיקות ומציאת נקודת משיקות",
    problem: "נתונים המעגל x\u00B2 + y\u00B2 = 50 והישר y = x + 10.\n\nא. העבירו את הישר לצורה ax + by + c = 0.\nב. חשבו את המרחק מהמרכז לישר בעזרת נוסחת מרחק.\nג. הוכיחו שהישר משיק למעגל (d = r).\nד. מצאו את נקודת המשיקות.",
    diagram: (
      <TangentGraph cx={0} cy={0} r={Math.sqrt(50)} px={-5} py={5}
        xMin={-11} xMax={11} yMin={-11} yMax={11}
        circleColor="#dc2626" tangentColor="#a78bfa" />
    ),
    pitfalls: [
      { title: "מערכת משוואות במקום נוסחת מרחק", text: "להוכחת משיקות, שיטת המרחק (d = r) מהירה ואלגנטית. שיטת ההצבה מורכבת ומסוכנת -- קל לטעות בפתיחת סוגריים." },
      { title: "שכחת ערך מוחלט או שורש בנוסחת מרחק", text: "בנוסחה d = |ax\u2080+by\u2080+c| / \u221A(a\u00B2+b\u00B2), חובה להעביר את הישר לצורה ax+by+c=0 קודם. אל תשכח את הערך המוחלט במונה ואת השורש במכנה." },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "א",
        label: "שלב א׳ -- העברה לצורה כללית",
        coaching: "העבר את הישר לצורה ax+by+c=0",
        prompt: "נתון הישר y=x+10. תנחה אותי להעביר אותו לצורה ax+by+c=0 כדי שאוכל להשתמש בנוסחת מרחק. אל תפתור עבורי.",
        keywords: ["ישר", "צורה", "מקדמים"],
        keywordHint: "ציין שצריך להעביר לצורה כללית",
        contextWords: ["ישר", "צורה", "מקדמים", "ax+by", "העברה", "כללית"],
      },
      {
        phase: "ב",
        label: "שלב ב׳ -- חישוב מרחק מהמרכז לישר",
        coaching: "הצב בנוסחת מרחק נקודה מישר",
        prompt: "העברתי את הישר y=x+10 לצורה כללית. תנחה אותי לחשב את המרחק מהמרכז (0,0) לישר בעזרת נוסחת המרחק. אל תפתור עבורי.",
        keywords: ["מרחק", "נוסחה", "מרכז"],
        keywordHint: "ציין שצריך נוסחת מרחק",
        contextWords: ["מרחק", "נוסחה", "מרכז", "ישר", "d", "ערך מוחלט"],
      },
      {
        phase: "ג",
        label: "שלב ג׳ -- הוכחת d = r",
        coaching: "חשב את הרדיוס והראה ששווה למרחק",
        prompt: "חישבתי את המרחק מהמרכז לישר y=x+10. תנחה אותי לחשב את רדיוס המעגל x\u00B2+y\u00B2=50 ולהשוות d=r להוכחת משיקות. אל תפתור עבורי.",
        keywords: ["שורש", "רדיוס", "משיק"],
        keywordHint: "ציין שצריך להשוות d ל-r",
        contextWords: ["r", "שורש", "שוויון", "d=r", "משיק", "הוכחה"],
      },
      {
        phase: "ד",
        label: "שלב ד׳ -- מציאת נקודת המשיקות",
        coaching: "הצב את משוואת הישר במשוואת המעגל ופתור",
        prompt: "הוכחתי שהישר y=x+10 משיק למעגל x\u00B2+y\u00B2=50. תנחה אותי למצוא את נקודת המשיקות על ידי הצבת הישר במשוואת המעגל. אל תפתור עבורי.",
        keywords: ["הצב", "פתור", "נקודת"],
        keywordHint: "ציין שצריך להציב ולפתור",
        contextWords: ["הצב", "פתור", "נקודת", "משיקות", "x", "מעגל"],
      },
    ],
  },
];

// ─── TangentLab ───────────────────────────────────────────────────────────────

function TangentLab() {
  const [angle, setAngle] = useState(45);
  const [R, setR] = useState(4);

  const rad = (angle * Math.PI) / 180;
  const cosT = Math.cos(rad), sinT = Math.sin(rad);
  const px = R * cosT, py = R * sinT;

  const S = 260;
  const xMin = -7, xMax = 7, yMin = -7, yMax = 7;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * S;
  const toSy = (y: number) => S - ((y - yMin) / (yMax - yMin)) * S;
  const scale = S / (xMax - xMin);
  const ox = toSx(0), oy = toSy(0);
  const rS = R * scale;
  const Psx = toSx(px), Psy = toSy(py);

  const tLen = 5.5;
  const t1x = px + (-sinT) * tLen, t1y = py + cosT * tLen;
  const t2x = px - (-sinT) * tLen, t2y = py - cosT * tLen;

  const sqSize = 10;
  const drX = -cosT, drY = sinT;
  const dtX = -sinT, dtY = -cosT;
  const sqA = [Psx + drX * sqSize, Psy + drY * sqSize];
  const sqB = [Psx + drX * sqSize + dtX * sqSize, Psy + drY * sqSize + dtY * sqSize];
  const sqC = [Psx + dtX * sqSize, Psy + dtY * sqSize];

  const slopeStr =
    Math.abs(sinT) < 0.015 ? "לא מוגדר (אנכי)"
    : Math.abs(cosT) < 0.015 ? "0 (אופקי)"
    : (-cosT / sinT).toFixed(2);

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת משיקים</h3>
      <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", marginBottom: 16 }}>
        זווית \u03B8 = <span style={{ color: "#DC2626", fontWeight: 700 }}>{angle}\u00B0</span>
        {"  "}|{"  "}נקודה P = ({(R * cosT).toFixed(2)}, {(R * sinT).toFixed(2)})
      </p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        {[
          { label: "זווית הנקודה (\u00B0)", val: angle, min: 0, max: 355, step: 5, set: setAngle },
          { label: "רדיוס R", val: R, min: 1, max: 6, step: 0.5, set: setR },
        ].map(sl => (
          <div key={sl.label} style={{ borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.6)", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: "#DC2626", fontFamily: "monospace", fontWeight: 700 }}>{sl.val}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.val} onChange={e => sl.set(+e.target.value)} style={{ width: "100%", accentColor: "#DC2626" }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(220,38,38,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-sm mx-auto" aria-hidden>
          {[-6, -4, -2, 0, 2, 4, 6].map(v => {
            const sx = toSx(v), sy = toSy(v);
            return <g key={v}><line x1={sx} y1={0} x2={sx} y2={S} stroke="rgba(100,116,139,0.2)" strokeWidth={0.6} /><line x1={0} y1={sy} x2={S} y2={sy} stroke="rgba(100,116,139,0.2)" strokeWidth={0.6} /></g>;
          })}
          <line x1={0} y1={oy} x2={S} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={ox} y1={0} x2={ox} y2={S} stroke="#94a3b8" strokeWidth={1.2} />
          <circle cx={ox} cy={oy} r={rS} fillOpacity={0.06} fill="#DC2626" stroke="#DC2626" strokeWidth={2} />
          <line x1={ox} y1={oy} x2={Psx} y2={Psy} stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" />
          <line x1={toSx(t1x)} y1={toSy(t1y)} x2={toSx(t2x)} y2={toSy(t2y)} stroke="#a78bfa" strokeWidth={2.5} strokeLinecap="round" />
          <path d={`M ${sqA[0].toFixed(1)} ${sqA[1].toFixed(1)} L ${sqB[0].toFixed(1)} ${sqB[1].toFixed(1)} L ${sqC[0].toFixed(1)} ${sqC[1].toFixed(1)}`} fill="none" stroke="#f59e0b" strokeWidth={1.8} strokeLinecap="square" />
          <circle cx={ox} cy={oy} r={4} fill="#DC2626" />
          <circle cx={Psx} cy={Psy} r={5} fill="#a78bfa" />
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 12, marginBottom: 16 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 16, height: 2, background: "#3b82f6", display: "inline-block" }} />
          <span style={{ color: "#3b82f6" }}>רדיוס</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 16, height: 2, background: "#a78bfa", display: "inline-block" }} />
          <span style={{ color: "#a78bfa" }}>משיק</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, border: "1.5px solid #f59e0b", display: "inline-block" }} />
          <span style={{ color: "#b45309" }}>90\u00B0</span>
        </span>
      </div>

      <LabMessage text="המשיק אופקי -- שיפוע 0. הרדיוס אנכי!" type="info" visible={Math.abs(cosT) < 0.015} />
      <LabMessage text="המשיק אנכי -- שיפוע לא מוגדר. הרדיוס אופקי!" type="info" visible={Math.abs(sinT) < 0.015} />

      {/* Output tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, textAlign: "center", fontSize: 12 }}>
        {[
          { label: "נקודת משיק", val: `(${(R*cosT).toFixed(1)}, ${(R*sinT).toFixed(1)})`, color: "#7c3aed" },
          { label: "שיפוע משיק", val: slopeStr, color: "#DC2626" },
          { label: "כלל", val: "רדיוס \u22A5 משיק", color: "#b45309" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: "10px 8px" }}>
            <div style={{ color: "#64748b", marginBottom: 4, fontSize: 11 }}>{label}</div>
            <div style={{ fontWeight: 700, color, fontSize: 11 }}>{val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "1rem" }}>
        שימו לב: מכפלת שיפועי הרדיוס והמשיק תמיד שווה ל-(-1) -- הם ניצבים זה לזה
      </p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TangentPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>משיקים למעגל עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>ניצבות, משוואת משיק והוכחת משיקות -- ואיך לשאול AI את השאלות הנכונות</p>
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

        <SubtopicProgress subtopicId="analytic/tangent" />

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
        <TangentLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="analytic/tangent" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
