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
  return (
    <svg viewBox="0 0 260 180" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={30} y1={150} x2={240} y2={150} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={150} x2={30} y2={20} stroke="#94a3b8" strokeWidth={1.2} />
      {/* Dashed segment AB */}
      <line x1={60} y1={120} x2={200} y2={50} stroke="#f59e0b" strokeWidth={2} strokeDasharray="6,4" />
      {/* Point A */}
      <circle cx={60} cy={120} r={5} fill="#16A34A" />
      <text x={48} y={140} fontSize={13} fill="#2D3436" fontWeight={700} fontFamily="sans-serif">A</text>
      {/* Point B */}
      <circle cx={200} cy={50} r={5} fill="#16A34A" />
      <text x={208} y={48} fontSize={13} fill="#2D3436" fontWeight={700} fontFamily="sans-serif">B</text>
      {/* Midpoint M */}
      <circle cx={130} cy={85} r={4} fill="#a78bfa" />
      <text x={135} y={80} fontSize={12} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">M</text>
      <text x={135} y={95} fontSize={11} fill="#a78bfa" fontFamily="sans-serif">?</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 260 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Three lines */}
      {/* l1 — main line */}
      <line x1={20} y1={140} x2={240} y2={60} stroke="#EA580C" strokeWidth={2} />
      <text x={242} y={58} fontSize={11} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">{"\u2113\u2081"}</text>
      {/* l2 — parallel to l1 */}
      <line x1={20} y1={180} x2={240} y2={100} stroke="#f59e0b" strokeWidth={2} strokeDasharray="6,3" />
      <text x={242} y={98} fontSize={11} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">{"\u2113\u2082"}</text>
      {/* l3 — perpendicular */}
      <line x1={100} y1={20} x2={170} y2={190} stroke="#a78bfa" strokeWidth={2} />
      <text x={172} y={188} fontSize={11} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">{"\u2113\u2083"}</text>
      {/* Right angle mark at intersection */}
      <rect x={123} y={93} width={8} height={8} fill="none" stroke="#64748b" strokeWidth={1} />
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 260 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Triangle formed by three lines */}
      <line x1={40} y1={160} x2={220} y2={160} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={40} y1={160} x2={150} y2={40} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={220} y1={160} x2={150} y2={40} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Vertex labels */}
      <circle cx={40} cy={160} r={4} fill="#DC2626" />
      <text x={24} y={172} fontSize={13} fill="#2D3436" fontWeight={700} fontFamily="sans-serif">A</text>
      <circle cx={220} cy={160} r={4} fill="#DC2626" />
      <text x={224} y={172} fontSize={13} fill="#2D3436" fontWeight={700} fontFamily="sans-serif">B</text>
      <circle cx={150} cy={40} r={4} fill="#DC2626" />
      <text x={155} y={35} fontSize={13} fill="#2D3436" fontWeight={700} fontFamily="sans-serif">C</text>
      {/* Median from C to midpoint of AB */}
      <line x1={150} y1={40} x2={130} y2={160} stroke="#34d399" strokeWidth={1.8} strokeDasharray="5,3" />
      {/* Centroid */}
      <circle cx={137} cy={120} r={3.5} fill="#a78bfa" />
      <text x={142} y={118} fontSize={11} fill="#a78bfa" fontWeight={600} fontFamily="sans-serif">?</text>
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
        subjectWords={["ישר", "שיפוע", "מרחק", "אמצע", "חיתוך", "משוואה"]}
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
    title: "מרחק ואמצע קטע",
    problem: "נתונות שתי נקודות A(1, 3) ו-B(7, 11).\n\nא. חשבו את המרחק בין הנקודות A ו-B.\nב. מצאו את נקודת האמצע M של הקטע AB.\nג. מצאו את שיפוע הישר AB.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "בלבול בין x ל-y בנוסחת המרחק", text: "בנוסחת המרחק d = √((x₂-x₁)²+(y₂-y₁)²) יש לוודא שמחסרים קואורדינטות x מ-x ו-y מ-y. תלמידים רבים מערבבים ומחסרים x₂-y₁ — וזו טעות שמובילה לתוצאה שגויה." },
      { title: "סדר החיסור בחישוב שיפוע", text: "השיפוע הוא m = (y₂-y₁)/(x₂-x₁) — כלומר הפרש ה-y חלקי הפרש ה-x. תלמידים רבים הופכים את הסדר ומחשבים (x₂-x₁)/(y₂-y₁). זכרו: שיפוע = עלייה/ריצה, כלומר y למעלה." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יב', 3 יחידות, ומצרף/ת שאלה בגיאומטריה אנליטית על מרחק בין נקודות, אמצע קטע ושיפוע ישר. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "חישוב מרחק", coaching: "", prompt: "נתונות הנקודות A(1, 3) ו-B(7, 11). תנחה אותי כיצד לחשב את המרחק ביניהן — באמצעות נוסחת המרחק, הפרשי קואורדינטות בריבוע וסכימה.", keywords: [], keywordHint: "", contextWords: ["מרחק", "נוסחה", "ריבוע", "שורש", "הפרש", "קואורדינטות"] },
      { phase: "סעיף ב׳", label: "מציאת אמצע קטע", coaching: "", prompt: "נתונות הנקודות A(1, 3) ו-B(7, 11). תסביר לי כיצד מוצאים את נקודת האמצע M — ממוצע ערכי x וממוצע ערכי y.", keywords: [], keywordHint: "", contextWords: ["אמצע", "ממוצע", "קואורדינטה", "חצי", "נקודה", "M"] },
      { phase: "סעיף ג׳", label: "חישוב שיפוע", coaching: "", prompt: "נתונות הנקודות A(1, 3) ו-B(7, 11). תכווין אותי לחשב את שיפוע הישר — הפרש ערכי y חלקי הפרש ערכי x.", keywords: [], keywordHint: "", contextWords: ["שיפוע", "הפרש", "חלקי", "עלייה", "ריצה", "ישר"] },
    ],
  },
  {
    id: "medium",
    title: "משוואת ישר",
    problem: "נתונה הנקודה A(2, 5) ושיפוע m = 3.\n\nא. כתבו את משוואת הישר העובר דרך A עם שיפוע m ופשטו לצורה y = mx + b.\nב. מצאו משוואת ישר מקביל העובר דרך הנקודה B(4, 1).\nג. מצאו משוואת ישר ניצב לישר הראשון העובר דרך הנקודה A.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "מקביל = אותו שיפוע, לא אותו חותך", text: "ישרים מקבילים חולקים את אותו שיפוע m, אבל חותך ציר y (b) שונה. תלמידים רבים כותבים את אותה משוואה במקום להציב את הנקודה החדשה כדי למצוא b חדש." },
      { title: "ניצב = הופכי ונגדי, לא רק נגדי", text: "שיפוע ישר ניצב הוא m₂ = -1/m₁ — כלומר ההופכי של m₁ עם סימן נגדי. תלמידים רבים שוכחים להפוך (שמים רק מינוס) או שוכחים את המינוס (שמים רק הופכי)." },
    ],
    goldenPrompt: `אני בכיתה יב', 3 יחידות, מצרף/ת תרגיל בגיאומטריה אנליטית בנושא משוואת ישר, ישרים מקבילים וניצבים.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על הצבה בנוסחת הישר, מציאת חותך y, ותנאי מקביל/ניצב.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "משוואת ישר דרך נקודה", coaching: "", prompt: "נתונה הנקודה A(2, 5) ושיפוע m = 3. תנחה אותי לכתוב את משוואת הישר בצורת y - y₁ = m(x - x₁) ולפשט לצורה y = mx + b.", keywords: [], keywordHint: "", contextWords: ["משוואה", "ישר", "שיפוע", "נקודה", "הצבה", "פישוט"] },
      { phase: "סעיף ב׳", label: "ישר מקביל", coaching: "", prompt: "ישר עם שיפוע m = 3 עובר דרך A(2, 5). תדריך אותי למצוא ישר מקביל העובר דרך B(4, 1) — מה השיפוע של ישר מקביל?", keywords: [], keywordHint: "", contextWords: ["מקביל", "שיפוע", "שווה", "הצבה", "חותך", "ישר"] },
      { phase: "סעיף ג׳", label: "ישר ניצב", coaching: "", prompt: "ישר עם שיפוע m = 3 עובר דרך A(2, 5). תכווין אותי למצוא ישר ניצב דרך A — מה הקשר בין שיפוע ישר לשיפוע ניצב לו?", keywords: [], keywordHint: "", contextWords: ["ניצב", "הופכי", "נגדי", "שיפוע", "מכפלה", "ישר"] },
    ],
  },
  {
    id: "advanced",
    title: "חיתוך ישרים ושטח משולש",
    problem: "נתונים שלושה ישרים:\nℓ₁: y = 2x + 1\nℓ₂: y = -x + 10\nℓ₃: y = 0 (ציר x)\n\nא. מצאו את נקודות החיתוך (קודקודי המשולש) של כל זוג ישרים.\nב. חשבו את שטח המשולש שנוצר.\nג. מצאו את משוואת התיכון מקודקוד C (חיתוך ℓ₁ ו-ℓ₂) לצלע AB.\nד. ודאו שהתיכון עובר דרך מרכז הכובד (centroid) של המשולש.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "טעות בפתרון מערכת משוואות", text: "כדי למצוא נקודת חיתוך של שני ישרים, יש להשוות את המשוואות (y = y). תלמידים רבים שוכחים להציב חזרה את x שמצאו כדי למצוא את y — וכך מקבלים רק חצי מהתשובה." },
      { title: "נוסחת שטח משולש מקואורדינטות", text: "בחישוב שטח משולש מקואורדינטות, שימו לב להשתמש בנוסחה הנכונה עם ערך מוחלט: ½|x₁(y₂-y₃) + x₂(y₃-y₁) + x₃(y₁-y₂)|. שכחת הערך המוחלט עלולה לתת שטח שלילי." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד מוצאים נקודות חיתוך של ישרים ומחשבים שטח משולש מקואורדינטות? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "מציאת נקודות חיתוך", coaching: "", prompt: "נתונים ℓ₁: y = 2x + 1, ℓ₂: y = -x + 10, ℓ₃: y = 0. תנחה אותי למצוא את שלוש נקודות החיתוך — כל זוג ישרים.", keywords: [], keywordHint: "", contextWords: ["חיתוך", "השוואה", "משוואה", "קודקוד", "הצבה", "ישר"] },
      { phase: "סעיף ב׳", label: "חישוב שטח המשולש", coaching: "", prompt: "לאחר שמצאתי שלוש קודקודים, תדריך אותי לחשב שטח משולש מקואורדינטות באמצעות הנוסחה המתאימה.", keywords: [], keywordHint: "", contextWords: ["שטח", "משולש", "נוסחה", "קואורדינטות", "ערך מוחלט", "חצי"] },
      { phase: "סעיף ג׳", label: "משוואת תיכון", coaching: "", prompt: "תנחה אותי למצוא את אמצע הצלע AB ולכתוב את משוואת הישר מקודקוד C דרך אמצע AB — זהו התיכון.", keywords: [], keywordHint: "", contextWords: ["תיכון", "אמצע", "שיפוע", "משוואה", "קודקוד", "צלע"] },
      { phase: "סעיף ד׳", label: "אימות מרכז כובד", coaching: "", prompt: "תסביר לי כיצד מחשבים את מרכז הכובד (ממוצע הקואורדינטות של 3 קודקודים) ואיך בודקים שהתיכון עובר דרכו.", keywords: [], keywordHint: "", contextWords: ["מרכז כובד", "ממוצע", "הצבה", "תיכון", "אימות", "קואורדינטות"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📐 נקודות וישרים (Points & Lines)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "מרחק בין שתי נקודות, אמצע קטע ושיפוע ישר — שלוש הנוסחאות הבסיסיות בגיאומטריה אנליטית."}
            {ex.id === "medium" && "משוואת ישר דרך נקודה עם שיפוע, מציאת ישרים מקבילים וניצבים — יחסים בין ישרים."}
            {ex.id === "advanced" && "חיתוך ישרים, שטח משולש מקואורדינטות, תיכון ומרכז כובד — שילוב כל הכלים."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: נוסחאות בסיסיות */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>נוסחאות בסיסיות</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>מרחק</span>
              <span>שורש של סכום ריבועי ההפרשים בין הקואורדינטות.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>אמצע</span>
              <span>ממוצע ערכי x וממוצע ערכי y של שתי הנקודות.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>שיפוע</span>
              <span>הפרש y חלקי הפרש x — עלייה חלקי ריצה.</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>יחסים בין ישרים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>מקביל</span>
                  <span>שני ישרים מקבילים אם ורק אם שיפועיהם שווים.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>ניצב</span>
                  <span>שני ישרים ניצבים אם מכפלת שיפועיהם שווה ל-(-1).</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>כלים מתקדמים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>חיתוך</span>
                  <span>פתרון מערכת משוואות — השוואת y = y.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>שטח</span>
                  <span>נוסחת שטח משולש מקואורדינטות עם ערך מוחלט.</span>
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

// ─── DistanceLab (basic) — 4 sliders ────────────────────────────────────────

function DistanceLab() {
  const [x1, setX1] = useState(1);
  const [y1, setY1] = useState(3);
  const [x2, setX2] = useState(7);
  const [y2, setY2] = useState(11);
  const st = STATION.basic;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const slope = dx !== 0 ? dy / dx : Infinity;
  const slopeStr = dx === 0 ? "אין (ישר אנכי)" : slope.toFixed(2);

  // SVG coordinate mapping
  const svgPad = 30;
  const svgW = 300, svgH = 200;
  const allX = [x1, x2], allY = [y1, y2];
  const minX = Math.min(...allX) - 2, maxX = Math.max(...allX) + 2;
  const minY = Math.min(...allY) - 2, maxY = Math.max(...allY) + 2;
  const scaleX = (svgW - 2 * svgPad) / (maxX - minX || 1);
  const scaleY = (svgH - 2 * svgPad) / (maxY - minY || 1);
  const toSvgX = (x: number) => svgPad + (x - minX) * scaleX;
  const toSvgY = (y: number) => svgH - svgPad - (y - minY) * scaleY;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת מרחק, אמצע ושיפוע</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>הזיזו את שתי הנקודות בעזרת הסליידרים וצפו כיצד המרחק, נקודת האמצע והשיפוע משתנים.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "x₁", val: x1, set: setX1 },
          { label: "y₁", val: y1, set: setY1 },
          { label: "x₂", val: x2, set: setX2 },
          { label: "y₂", val: y2, set: setY2 },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={-10} max={15} step={1} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Grid lines */}
          <line x1={svgPad} y1={svgH - svgPad} x2={svgW - svgPad} y2={svgH - svgPad} stroke="#94a3b8" strokeWidth={1} />
          <line x1={svgPad} y1={svgPad} x2={svgPad} y2={svgH - svgPad} stroke="#94a3b8" strokeWidth={1} />
          {/* Segment */}
          <line x1={toSvgX(x1)} y1={toSvgY(y1)} x2={toSvgX(x2)} y2={toSvgY(y2)} stroke="#f59e0b" strokeWidth={2} strokeDasharray="6,4" />
          {/* Point A */}
          <circle cx={toSvgX(x1)} cy={toSvgY(y1)} r={6} fill={st.accentColor} />
          <text x={toSvgX(x1) - 10} y={toSvgY(y1) + 18} fontSize={12} fill="#2D3436" fontWeight={700} fontFamily="sans-serif">A</text>
          {/* Point B */}
          <circle cx={toSvgX(x2)} cy={toSvgY(y2)} r={6} fill={st.accentColor} />
          <text x={toSvgX(x2) + 8} y={toSvgY(y2) - 6} fontSize={12} fill="#2D3436" fontWeight={700} fontFamily="sans-serif">B</text>
          {/* Midpoint */}
          <circle cx={toSvgX(mx)} cy={toSvgY(my)} r={4} fill="#a78bfa" />
          <text x={toSvgX(mx) + 6} y={toSvgY(my) - 4} fontSize={11} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">M</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "מרחק", val: dist.toFixed(2) },
          { label: "אמצע", val: `(${mx.toFixed(1)}, ${my.toFixed(1)})` },
          { label: "שיפוע", val: slopeStr },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>הזיזו נקודה אחת — מה קורה למרחק כשהנקודות על אותו ציר?</p>
    </section>
  );
}

// ─── LineLab (medium) — 2 sliders ───────────────────────────────────────────

function LineLab() {
  const [m, setM] = useState(3);
  const [b, setB] = useState(-1);
  const st = STATION.medium;

  // Main line: y = mx + b
  // Parallel: y = mx + (b + 4) — same slope, different intercept
  // Perpendicular: y = (-1/m)x + b — through same y-intercept for visual clarity
  const perpM = m !== 0 ? -1 / m : 0;
  const parallelB = b + 4;

  const eqMain = `y = ${m}x ${b >= 0 ? "+" : ""}${b}`;
  const eqParallel = `y = ${m}x ${parallelB >= 0 ? "+" : ""}${parallelB}`;
  const eqPerp = `y = ${perpM.toFixed(2)}x ${b >= 0 ? "+" : ""}${b}`;

  // SVG setup
  const svgW = 300, svgH = 200, pad = 30;
  const xMin = -5, xMax = 10, yMin = -10, yMax = 20;
  const sx = (svgW - 2 * pad) / (xMax - xMin);
  const sy = (svgH - 2 * pad) / (yMax - yMin);
  const toX = (x: number) => pad + (x - xMin) * sx;
  const toY = (y: number) => svgH - pad - (y - yMin) * sy;

  const linePoints = (slope: number, intercept: number) => {
    const x0 = xMin, x1 = xMax;
    const y0 = slope * x0 + intercept;
    const y1end = slope * x1 + intercept;
    return `${toX(x0)},${toY(y0)} ${toX(x1)},${toY(y1end)}`;
  };

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת ישרים מקבילים וניצבים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את השיפוע ואת החותך — צפו בישר, בישר המקביל ובישר הניצב.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "שיפוע m", val: m, set: setM, min: -5, max: 5, step: 0.5 },
          { label: "חותך b", val: b, set: setB, min: -10, max: 10, step: 1 },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Axes */}
          <line x1={toX(xMin)} y1={toY(0)} x2={toX(xMax)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1} />
          <line x1={toX(0)} y1={toY(yMin)} x2={toX(0)} y2={toY(yMax)} stroke="#94a3b8" strokeWidth={1} />
          {/* Main line */}
          <polyline points={linePoints(m, b)} fill="none" stroke={st.accentColor} strokeWidth={2.5} />
          {/* Parallel line */}
          <polyline points={linePoints(m, parallelB)} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6,3" />
          {/* Perpendicular line */}
          {m !== 0 && <polyline points={linePoints(perpM, b)} fill="none" stroke="#a78bfa" strokeWidth={2} />}
          {/* Labels */}
          <text x={toX(xMax) - 20} y={toY(m * xMax + b) - 6} fontSize={11} fill={st.accentColor} fontWeight={700} fontFamily="sans-serif">{"\u2113\u2081"}</text>
          <text x={toX(xMax) - 20} y={toY(m * xMax + parallelB) - 6} fontSize={11} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">{"\u2113\u2082"}</text>
          {m !== 0 && <text x={toX(xMax) - 20} y={toY(perpM * xMax + b) - 6} fontSize={11} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">{"\u2113\u2083"}</text>}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "ישר ראשי", val: eqMain, color: st.accentColor },
          { label: "מקביל", val: eqParallel, color: "#d97706" },
          { label: "ניצב", val: m !== 0 ? eqPerp : "אנכי", color: "#a78bfa" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: row.color, fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>כתום = מקביל (אותו שיפוע), סגול = ניצב (שיפוע הופכי נגדי). נסו m = 0!</p>
    </section>
  );
}

// ─── TriangleLab (advanced) — 2 sliders ──────────────────────────────────────

function TriangleLab() {
  const [m1, setM1] = useState(2);
  const [m2, setM2] = useState(-1);
  const st = STATION.advanced;

  // Line 1: y = m1*x + 1, Line 2: y = m2*x + 10, Line 3: y = 0
  const b1 = 1, b2 = 10;

  // Intersection ℓ₁ ∩ ℓ₃: m1*x + b1 = 0 → x = -b1/m1
  const ax = m1 !== 0 ? -b1 / m1 : 0;
  const ay = 0;

  // Intersection ℓ₂ ∩ ℓ₃: m2*x + b2 = 0 → x = -b2/m2
  const bx = m2 !== 0 ? -b2 / m2 : 0;
  const by = 0;

  // Intersection ℓ₁ ∩ ℓ₂: m1*x + b1 = m2*x + b2 → x = (b2-b1)/(m1-m2)
  const denom = m1 - m2;
  const cx = denom !== 0 ? (b2 - b1) / denom : 0;
  const cy = denom !== 0 ? m1 * cx + b1 : 0;

  // Area = 0.5 * |x_A(y_B - y_C) + x_B(y_C - y_A) + x_C(y_A - y_B)|
  const area = Math.abs(ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)) / 2;

  // Centroid
  const gx = (ax + bx + cx) / 3;
  const gy = (ay + by + cy) / 3;

  const validTriangle = denom !== 0 && m1 !== 0 && m2 !== 0;

  // SVG
  const svgW = 300, svgH = 220, pad = 30;
  const points = validTriangle ? [ax, bx, cx] : [0, 5, 2.5];
  const pointsY = validTriangle ? [ay, by, cy] : [0, 0, 5];
  const allPtsX = [...points, gx];
  const allPtsY = [...pointsY, gy];
  const xMin = Math.min(...allPtsX) - 2, xMax = Math.max(...allPtsX) + 2;
  const yMin2 = Math.min(...allPtsY) - 2, yMax2 = Math.max(...allPtsY) + 2;
  const sxs = (svgW - 2 * pad) / (xMax - xMin || 1);
  const sys = (svgH - 2 * pad) / (yMax2 - yMin2 || 1);
  const toSX = (x: number) => pad + (x - xMin) * sxs;
  const toSY = (y: number) => svgH - pad - (y - yMin2) * sys;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת משולש מישרים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את שיפועי הישרים וצפו כיצד המשולש, שטחו ומרכז הכובד משתנים.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "שיפוע ℓ₁", val: m1, set: setM1 },
          { label: "שיפוע ℓ₂", val: m2, set: setM2 },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={-5} max={5} step={0.5} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        {validTriangle ? (
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
            {/* x-axis */}
            <line x1={pad} y1={toSY(0)} x2={svgW - pad} y2={toSY(0)} stroke="#94a3b8" strokeWidth={1} />
            {/* Triangle */}
            <polygon
              points={`${toSX(ax)},${toSY(ay)} ${toSX(bx)},${toSY(by)} ${toSX(cx)},${toSY(cy)}`}
              fill="rgba(220,38,38,0.1)" stroke={st.accentColor} strokeWidth={2}
            />
            {/* Vertices */}
            <circle cx={toSX(ax)} cy={toSY(ay)} r={5} fill={st.accentColor} />
            <text x={toSX(ax) - 4} y={toSY(ay) + 16} fontSize={12} fill="#2D3436" fontWeight={700} fontFamily="sans-serif">A</text>
            <circle cx={toSX(bx)} cy={toSY(by)} r={5} fill={st.accentColor} />
            <text x={toSX(bx) + 6} y={toSY(by) + 16} fontSize={12} fill="#2D3436" fontWeight={700} fontFamily="sans-serif">B</text>
            <circle cx={toSX(cx)} cy={toSY(cy)} r={5} fill={st.accentColor} />
            <text x={toSX(cx) + 6} y={toSY(cy) - 6} fontSize={12} fill="#2D3436" fontWeight={700} fontFamily="sans-serif">C</text>
            {/* Centroid */}
            <circle cx={toSX(gx)} cy={toSY(gy)} r={4} fill="#a78bfa" />
            <text x={toSX(gx) + 6} y={toSY(gy) - 4} fontSize={10} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">G</text>
          </svg>
        ) : (
          <div style={{ color: "#6B7280", fontSize: 13, textAlign: "center", padding: "2rem" }}>שנו את השיפועים כך שהישרים ייחתכו ויצרו משולש.</div>
        )}
      </div>

      {/* Tiles */}
      {validTriangle && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
          {[
            { label: "קודקודים", val: `A(${ax.toFixed(1)},${ay}) B(${bx.toFixed(1)},${by}) C(${cx.toFixed(1)},${cy.toFixed(1)})`, color: st.accentColor, size: 10 },
            { label: "שטח", val: area.toFixed(2), color: st.accentColor, size: 20 },
            { label: "מרכז כובד", val: `(${gx.toFixed(1)}, ${gy.toFixed(1)})`, color: "#a78bfa", size: 16 },
          ].map((row) => (
            <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
              <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
              <div style={{ color: row.color, fontWeight: 700, fontSize: row.size, fontFamily: "monospace" }}>{row.val}</div>
            </div>
          ))}
        </div>
      )}

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>
        {!validTriangle ? "שיפועים שווים = ישרים מקבילים, אין משולש!" : "שנו שיפוע ישר אחד וצפו כיצד קודקודי המשולש, השטח ומרכז הכובד משתנים."}
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
  const [activeTab, setActiveTab] = useState<"distance" | "slope" | "parallel" | null>(null);

  const tabs = [
    { id: "distance" as const, label: "מרחק ואמצע", tex: "d", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "slope" as const, label: "שיפוע ומשוואה", tex: "m", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "parallel" as const, label: "מקביל וניצב", tex: "\\perp", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: Distance & Midpoint */}
      {activeTab === "distance" && (
        <motion.div key="distance" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}"}</DisplayMath>
            </div>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"M = \\left(\\frac{x_1 + x_2}{2},\\; \\frac{y_1 + y_2}{2}\\right)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מחשבים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מחשבים את הפרשי הקואורדינטות: <InlineMath>{"\\Delta x = x_2 - x_1"}</InlineMath> ו-<InlineMath>{"\\Delta y = y_2 - y_1"}</InlineMath>.</li>
                  <li>מרחק: שורש סכום הריבועים.</li>
                  <li>אמצע: ממוצע של כל קואורדינטה בנפרד.</li>
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Slope & Equation */}
      {activeTab === "slope" && (
        <motion.div key="slope" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"m = \\frac{y_2 - y_1}{x_2 - x_1}"}</DisplayMath>
            </div>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"y - y_1 = m(x - x_1)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מחשבים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>שיפוע = הפרש y חלקי הפרש x (עלייה/ריצה).</li>
                  <li>מציבים נקודה ושיפוע בנוסחת נקודה-שיפוע.</li>
                  <li>מפשטים לצורה <InlineMath>{"y = mx + b"}</InlineMath>.</li>
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Parallel & Perpendicular */}
      {activeTab === "parallel" && (
        <motion.div key="parallel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\text{Parallel: } m_1 = m_2"}</DisplayMath>
            </div>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\text{Perpendicular: } m_1 \\cdot m_2 = -1"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מה הכלל?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>ישרים מקבילים — שיפועים שווים, חותכי y שונים.</li>
                  <li>ישרים ניצבים — מכפלת שיפועיהם = <InlineMath>{"-1"}</InlineMath>. כלומר <InlineMath>{"m_2 = -\\frac{1}{m_1}"}</InlineMath>.</li>
                  <li>למציאת משוואת ישר מקביל/ניצב: קח את השיפוע המתאים והצב את הנקודה הנתונה.</li>
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PointsAndLinesPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>נקודות וישרים עם AI — כיתה יב׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>מרחק, אמצע, שיפוע, משוואת ישר, מקביל וניצב — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/3u/topic/grade12/analytic"
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

        <SubtopicProgress subtopicId="3u/grade12/analytic/lines" />

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
        {selectedLevel === "basic" && <DistanceLab />}
        {selectedLevel === "medium" && <LineLab />}
        {selectedLevel === "advanced" && <TriangleLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade12/analytic/lines" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
