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
    <svg viewBox="0 0 220 180" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Right triangle */}
      <polygon points="40,150 180,150 180,40" fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.7} />
      {/* Right angle mark */}
      <polyline points="165,150 165,135 180,135" fill="none" stroke="#64748b" strokeWidth={1.2} />
      {/* Vertex labels */}
      <text x={28} y={158} fontSize={14} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={183} y={158} fontSize={14} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={183} y={35} fontSize={14} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">C</text>
      {/* Angle arc at A */}
      <path d="M60,150 A20,20 0 0,0 52,136" fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      <text x={65} y={141} fontSize={11} fill="#f59e0b" fontFamily="sans-serif">?</text>
      {/* Side labels */}
      <text x={110} y={168} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">ניצב</text>
      <text x={195} y={100} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif" transform="rotate(90,195,100)">ניצב</text>
      <text x={100} y={88} fontSize={11} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" transform="rotate(-38,100,88)">יתר</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 240 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* 30-60-90 triangle */}
      <polygon points="30,170 210,170 210,50" fill="none" stroke="#EA580C" strokeWidth={2} opacity={0.7} />
      {/* Right angle mark */}
      <polyline points="195,170 195,155 210,155" fill="none" stroke="#64748b" strokeWidth={1.2} />
      {/* Vertex labels */}
      <text x={15} y={178} fontSize={14} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">P</text>
      <text x={214} y={178} fontSize={14} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">Q</text>
      <text x={214} y={45} fontSize={14} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">R</text>
      {/* Angle arc at P (30°) */}
      <path d="M55,170 A25,25 0 0,0 49,152" fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      <text x={62} y={158} fontSize={10} fill="#f59e0b" fontFamily="sans-serif">?</text>
      {/* Angle arc at R (60°) */}
      <path d="M210,68 A18,18 0 0,0 196,60" fill="none" stroke="#a78bfa" strokeWidth={1.5} />
      <text x={196} y={78} fontSize={10} fill="#a78bfa" fontFamily="sans-serif">?</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 260 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Right triangle DEF */}
      <polygon points="40,170 220,170 220,40" fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.6} />
      {/* Right angle mark at F */}
      <polyline points="205,170 205,155 220,155" fill="none" stroke="#64748b" strokeWidth={1.2} />
      {/* Height from F to hypotenuse — dashed auxiliary */}
      <line x1={220} y1={170} x2={108} y2={85} stroke="#64748b" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
      {/* Vertex labels */}
      <text x={25} y={178} fontSize={14} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">D</text>
      <text x={224} y={178} fontSize={14} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">F</text>
      <text x={224} y={35} fontSize={14} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">E</text>
      {/* Angle arc at D */}
      <path d="M65,170 A25,25 0 0,0 57,152" fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      <text x={70} y={158} fontSize={10} fill="#f59e0b" fontFamily="sans-serif">?</text>
      {/* Side question marks */}
      <text x={130} y={185} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>
      <text x={235} y={110} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>
      <text x={120} y={95} fontSize={11} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">?</text>
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
        subjectWords={["טריגונומטריה", "sin", "cos", "tan", "זווית", "משולש", "יתר", "ניצב"]}
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
    title: "יחסים טריגונומטריים במשולש ישר-זווית",
    problem: "במשולש ישר-זווית ABC, הזווית הישרה ב-B. היתר הוא AC.\n\nא. כתבו את שלושת היחסים הטריגונומטריים (sin, cos, tan) של הזווית A באמצעות צלעות המשולש.\nב. אם sin A = 3/5, מצאו את cos A ואת tan A.\nג. בדקו שמתקיים sin²A + cos²A = 1 עבור הערכים שמצאתם.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בין ניצב נגדי לניצב סמוך", text: "sin מתייחס לניצב שמול הזווית (נגדי), ו-cos לניצב שליד הזווית (סמוך). החלפה ביניהם היא הטעות הנפוצה ביותר — חזרו להגדרות בכל פעם." },
      { title: "⚠️ שכחת היתר בחילוק", text: "sin ו-cos מחלקים ביתר, ואילו tan מחלק בניצב הסמוך. תלמידים שוכחים לחלק ביתר ומקבלים ערכים גדולים מ-1 עבור sin/cos — דבר שלא ייתכן." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יא', 3 יחידות, ומצרף/ת שאלה בטריגונומטריה על יחסים טריגונומטריים (sin, cos, tan) במשולש ישר-זווית. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "הגדרות sin, cos, tan", coaching: "", prompt: "במשולש ישר-זווית ABC עם זווית ישרה ב-B, היתר הוא AC. תנחה אותי לכתוב את שלושת היחסים הטריגונומטריים של הזווית A — מהו ניצב נגדי, ניצב סמוך ויתר ביחס לזווית A.", keywords: [], keywordHint: "", contextWords: ["sin", "cos", "tan", "ניצב", "יתר", "נגדי", "סמוך"] },
      { phase: "סעיף ב׳", label: "חישוב cos ו-tan מתוך sin", coaching: "", prompt: "במשולש ישר-זווית sin A = 3/5. תכווין אותי כיצד למצוא את cos A ואת tan A — האם אפשר להשתמש בפיתגורס או בזהות טריגונומטרית.", keywords: [], keywordHint: "", contextWords: ["sin", "cos", "tan", "פיתגורס", "יתר", "זהות", "חישוב"] },
      { phase: "סעיף ג׳", label: "הזהות sin²+cos²=1", coaching: "", prompt: "חישבנו sin A = 3/5 ו-cos A. תדריך אותי לבדוק שמתקיים sin²A + cos²A = 1 — למה זה תמיד נכון במשולש ישר-זווית.", keywords: [], keywordHint: "", contextWords: ["זהות", "ריבוע", "סכום", "פיתגורס", "הוכחה", "אחד"] },
    ],
  },
  {
    id: "medium",
    title: "זוויות מיוחדות ומשולשי 30-60-90",
    problem: "במשולש ישר-זווית PQR, הזווית הישרה ב-Q. זווית P שווה ל-30°.\n\nא. מהי הזווית R? מצאו את יחס הצלעות במשולש 30-60-90.\nב. חשבו את sin 30°, cos 30° ו-tan 30° לפי יחס הצלעות.\nג. אם הניצב QR (שמול הזווית 30°) שווה ל-a, בטאו את שאר הצלעות בעזרת a.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ בלבול ביחסי הצלעות במשולש 30-60-90", text: "הצלע שמול 30° היא חצי מהיתר (ולא חצי מהצלע הארוכה). תלמידים מתבלבלים בין הצלעות — שרטטו את המשולש עם 1, √3, 2 וסמנו מה מול כל זווית." },
      { title: "⚠️ טעות ב-tan של זוויות מיוחדות", text: "tan 30° = 1/√3 ולא √3. הבלבול בין tan 30° ל-tan 60° הוא שכיח — זכרו ש-tan 45° = 1, ו-tan של זווית קטנה מ-45° קטן מ-1." },
    ],
    goldenPrompt: `אני בכיתה יא', 3 יחידות, מצרף/ת תרגיל בטריגונומטריה על זוויות מיוחדות (30°, 60°) ומשולש 30-60-90.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על יחסי הצלעות והיחסים הטריגונומטריים.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "זווית R ויחסי צלעות", coaching: "", prompt: "במשולש ישר-זווית PQR, זווית ישרה ב-Q וזווית P = 30°. תנחה אותי למצוא את זווית R ולזכור מה יחס הצלעות במשולש 30-60-90.", keywords: [], keywordHint: "", contextWords: ["זווית", "משולש", "יחס", "צלעות", "30", "60", "90"] },
      { phase: "סעיף ב׳", label: "sin/cos/tan של 30°", coaching: "", prompt: "במשולש 30-60-90 עם יחס צלעות 1:√3:2. תכווין אותי לחשב sin 30°, cos 30° ו-tan 30° לפי ההגדרות של נגדי/סמוך/יתר.", keywords: [], keywordHint: "", contextWords: ["sin", "cos", "tan", "30", "נגדי", "סמוך", "יתר"] },
      { phase: "סעיף ג׳", label: "ביטוי הצלעות בעזרת a", coaching: "", prompt: "במשולש 30-60-90, הניצב מול 30° שווה ל-a. תדריך אותי לבטא את היתר ואת הניצב השני בעזרת a, תוך שימוש ביחסי הצלעות.", keywords: [], keywordHint: "", contextWords: ["יתר", "ניצב", "יחס", "צלע", "כפול", "שורש"] },
    ],
  },
  {
    id: "advanced",
    title: "שילוב יחסים טריגונומטריים וזהויות",
    problem: "במשולש ישר-זווית DEF, הזווית הישרה ב-F, ו-DE הוא היתר.\nידוע: tan D = 4/3.\n\nא. מצאו את sin D ואת cos D.\nב. הוכיחו כי sin D / cos D = tan D.\nג. חשבו את sin²D + cos²D ובדקו שהתוצאה שווה ל-1.\nד. אם DF = k, בטאו את EF ואת DE בעזרת k.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ שגיאה במציאת היתר מתוך tan", text: "אם tan D = 4/3, הניצב הנגדי הוא 4 והסמוך 3 — אבל היתר אינו 4+3! חייבים להשתמש בפיתגורס כדי למצוא את היתר. שגיאה זו גורמת לערכי sin/cos שגויים." },
      { title: "⚠️ בלבול בין הוכחה לחישוב", text: "כשמבקשים 'הוכיחו', לא מספיק להציב מספרים ולראות שיוצא נכון. צריך להראות את השלבים האלגבריים — למה sin/cos תמיד שווה ל-tan לפי ההגדרות." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: איך מוצאים sin ו-cos מתוך tan, ולמה sin²+cos²=1 תמיד? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "מציאת sin ו-cos מתוך tan", coaching: "", prompt: "במשולש ישר-זווית DEF עם זווית ישרה ב-F. tan D = 4/3. תנחה אותי למצוא sin D ו-cos D — מה הצלעות ואיך מוצאים את היתר.", keywords: [], keywordHint: "", contextWords: ["sin", "cos", "tan", "פיתגורס", "יתר", "ניצב", "חישוב"] },
      { phase: "סעיף ב׳", label: "הוכחת sin/cos = tan", coaching: "", prompt: "נתון sin D ו-cos D שמצאנו. תכווין אותי להוכיח ש-sin D חלקי cos D שווה ל-tan D — האם אפשר להראות את זה ישירות מההגדרות.", keywords: [], keywordHint: "", contextWords: ["הוכחה", "הגדרה", "חילוק", "נגדי", "סמוך", "יתר", "צמצום"] },
      { phase: "סעיף ג׳", label: "בדיקת הזהות הפיתגורסית", coaching: "", prompt: "sin D = 4/5, cos D = 3/5. תדריך אותי לחשב sin²D + cos²D ולהסביר למה התוצאה תמיד 1 — מה הקשר למשפט פיתגורס.", keywords: [], keywordHint: "", contextWords: ["זהות", "ריבוע", "סכום", "פיתגורס", "הוכחה", "אחד"] },
      { phase: "סעיף ד׳", label: "ביטוי צלעות בעזרת k", coaching: "", prompt: "במשולש DEF, DF = k (ניצב סמוך ל-D), tan D = 4/3. תנחה אותי לבטא את EF ואת DE בעזרת k — אילו יחסים טריגונומטריים אשתמש.", keywords: [], keywordHint: "", contextWords: ["ניצב", "יתר", "ביטוי", "משתנה", "tan", "cos", "צלע"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📐 טריגונומטריה במשולש ישר-זווית</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "הגדרות sin, cos, tan — ניצב נגדי, ניצב סמוך ויתר."}
            {ex.id === "medium" && "זוויות מיוחדות (30°, 45°, 60°) — יחסי צלעות ויחסים טריגונומטריים."}
            {ex.id === "advanced" && "שילוב יחסים טריגונומטריים, זהויות פיתגורסיות וביטוי צלעות."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: הגדרות יסוד */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🎯 הגדרות יסוד</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>sin α</span>
              <span>ניצב נגדי / יתר</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>cos α</span>
              <span>ניצב סמוך / יתר</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>tan α</span>
              <span>ניצב נגדי / ניצב סמוך</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>✨ זוויות מיוחדות</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>30°-60°-90°</span>
                  <span>יחס צלעות: 1 : √3 : 2</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>45°-45°-90°</span>
                  <span>יחס צלעות: 1 : 1 : √2</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>🔬 זהויות טריגונומטריות</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 140 }}>sin²α + cos²α</span>
                  <span>= 1 (הזהות הפיתגורסית)</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 140 }}>tan α</span>
                  <span>= sin α / cos α</span>
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

// ─── TrigRatioLab (basic) ────────────────────────────────────────────────────

function TrigRatioLab() {
  const [opposite, setOpposite] = useState(3);
  const [adjacent, setAdjacent] = useState(4);
  const st = STATION.basic;

  const hypotenuse = Math.sqrt(opposite * opposite + adjacent * adjacent);
  const sinVal = opposite / hypotenuse;
  const cosVal = adjacent / hypotenuse;
  const tanVal = adjacent > 0 ? opposite / adjacent : 0;
  const angleRad = Math.atan2(opposite, adjacent);
  const angleDeg = (angleRad * 180) / Math.PI;

  // Triangle coordinates
  const scale = 16;
  const ox = 40, oy = 160;
  const bx = ox + adjacent * scale;
  const by = oy;
  const cx = bx;
  const cy = oy - opposite * scale;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת יחסים טריגונומטריים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את אורכי הניצבים וצפו כיצד משתנים sin, cos ו-tan.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 400, margin: "0 auto 2rem" }}>
        {[
          { label: "ניצב נגדי", val: opposite, set: setOpposite },
          { label: "ניצב סמוך", val: adjacent, set: setAdjacent },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={1} max={10} step={1} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* Triangle SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 260 200" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Triangle */}
          <polygon points={`${ox},${oy} ${bx},${by} ${cx},${cy}`} fill="rgba(22,163,74,0.06)" stroke="#16A34A" strokeWidth={2} />
          {/* Right angle */}
          <polyline points={`${bx - 12},${by} ${bx - 12},${by - 12} ${bx},${by - 12}`} fill="none" stroke="#64748b" strokeWidth={1} />
          {/* Angle arc at A */}
          <path d={`M${ox + 25},${oy} A25,25 0 0,0 ${ox + 25 * Math.cos(angleRad)},${oy - 25 * Math.sin(angleRad)}`} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
          {/* Labels */}
          <text x={ox - 5} y={oy + 15} fontSize={13} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">A</text>
          <text x={bx + 5} y={by + 15} fontSize={13} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">B</text>
          <text x={cx + 5} y={cy - 5} fontSize={13} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">C</text>
          {/* Side lengths */}
          <text x={(ox + bx) / 2} y={oy + 18} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="monospace">{adjacent}</text>
          <text x={bx + 16} y={(by + cy) / 2} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="monospace">{opposite}</text>
          <text x={(ox + cx) / 2 - 12} y={(oy + cy) / 2 - 5} fontSize={11} fill="#a78bfa" textAnchor="middle" fontFamily="monospace">{hypotenuse.toFixed(2)}</text>
          {/* Angle label */}
          <text x={ox + 35} y={oy - 10} fontSize={11} fill="#f59e0b" fontFamily="monospace">{angleDeg.toFixed(1)}°</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "sin A", val: sinVal.toFixed(4) },
          { label: "cos A", val: cosVal.toFixed(4) },
          { label: "tan A", val: tanVal.toFixed(4) },
          { label: "sin²+cos²", val: (sinVal * sinVal + cosVal * cosVal).toFixed(4) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 17, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>שימו לב: sin²A + cos²A תמיד שווה ל-1! מה קורה ל-tan כשהניצב הנגדי גדל?</p>
    </section>
  );
}

// ─── SpecialAnglesLab (medium) ──────────────────────────────────────────────

function SpecialAnglesLab() {
  const [selectedAngle, setSelectedAngle] = useState(30);
  const st = STATION.medium;

  const angles: Record<number, { sin: string; cos: string; tan: string; sinNum: number; cosNum: number; tanNum: number; sides: string }> = {
    30: { sin: "1/2", cos: "√3/2", tan: "1/√3", sinNum: 0.5, cosNum: Math.sqrt(3) / 2, tanNum: 1 / Math.sqrt(3), sides: "1 : √3 : 2" },
    45: { sin: "√2/2", cos: "√2/2", tan: "1", sinNum: Math.sqrt(2) / 2, cosNum: Math.sqrt(2) / 2, tanNum: 1, sides: "1 : 1 : √2" },
    60: { sin: "√3/2", cos: "1/2", tan: "√3", sinNum: Math.sqrt(3) / 2, cosNum: 0.5, tanNum: Math.sqrt(3), sides: "1 : √3 : 2" },
  };

  const a = angles[selectedAngle];
  const rad = (selectedAngle * Math.PI) / 180;

  // Draw triangle
  const ox = 50, oy = 160, baseLen = 120;
  const bx = ox + baseLen;
  const by = oy;
  const cx = bx;
  const cy = oy - baseLen * Math.tan(rad);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת זוויות מיוחדות</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>בחרו זווית מיוחדת וצפו ביחסים הטריגונומטריים וביחסי הצלעות.</p>

      {/* Angle selector */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: "2rem" }}>
        {[30, 45, 60].map(deg => (
          <button
            key={deg}
            onClick={() => setSelectedAngle(deg)}
            style={{
              padding: "10px 24px", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer",
              border: `2px solid ${selectedAngle === deg ? st.accentColor : "rgba(60,54,42,0.15)"}`,
              background: selectedAngle === deg ? `${st.accentColor}15` : "rgba(255,255,255,0.75)",
              color: selectedAngle === deg ? st.accentColor : "#6B7280",
              transition: "all 0.2s",
            }}
          >
            {deg}°
          </button>
        ))}
      </div>

      {/* Triangle SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 280 200" className="w-full max-w-md mx-auto" aria-hidden>
          <polygon points={`${ox},${oy} ${bx},${by} ${cx},${cy}`} fill={`${st.accentColor}08`} stroke={st.accentColor} strokeWidth={2} />
          {/* Right angle */}
          <polyline points={`${bx - 12},${by} ${bx - 12},${by - 12} ${bx},${by - 12}`} fill="none" stroke="#64748b" strokeWidth={1} />
          {/* Angle arc */}
          <path d={`M${ox + 22},${oy} A22,22 0 0,0 ${ox + 22 * Math.cos(rad)},${oy - 22 * Math.sin(rad)}`} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
          <text x={ox + 30} y={oy - 8} fontSize={13} fill="#f59e0b" fontFamily="monospace" fontWeight={700}>{selectedAngle}°</text>
          {/* Side ratio label */}
          <text x={(ox + bx) / 2} y={oy + 18} fontSize={12} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">סמוך</text>
          <text x={bx + 18} y={(by + cy) / 2} fontSize={12} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">נגדי</text>
          <text x={(ox + cx) / 2 - 14} y={(oy + cy) / 2 - 8} fontSize={12} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">יתר</text>
        </svg>
      </div>

      {/* Data tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center", marginBottom: 12 }}>
        {[
          { label: `sin ${selectedAngle}°`, val: a.sin },
          { label: `cos ${selectedAngle}°`, val: a.cos },
          { label: `tan ${selectedAngle}°`, val: a.tan },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, textAlign: "center" }}>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>יחס צלעות</div>
          <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{a.sides}</div>
        </div>
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>שימו לב: sin 30° = cos 60° (ולהפך!). למה זה קורה?</p>
    </section>
  );
}

// ─── IdentityLab (advanced) ──────────────────────────────────────────────────

function IdentityLab() {
  const [tanVal, setTanVal] = useState(1.33); // ~4/3
  const st = STATION.advanced;

  const angleRad = Math.atan(tanVal);
  const angleDeg = (angleRad * 180) / Math.PI;
  const sinVal = Math.sin(angleRad);
  const cosVal = Math.cos(angleRad);
  const identity = sinVal * sinVal + cosVal * cosVal;
  const sinOverCos = cosVal !== 0 ? sinVal / cosVal : 0;

  // Triangle for SVG
  const ox = 50, oy = 155, baseLen = 130;
  const bx = ox + baseLen;
  const by = oy;
  const cx = bx;
  const cy = oy - baseLen * tanVal;
  const svgH = Math.max(200, oy - cy + 40);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת זהויות טריגונומטריות</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את ערך tan ובדקו שהזהויות תמיד מתקיימות.</p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>tan α</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{tanVal.toFixed(2)}</span>
          </div>
          <input type="range" min={0.1} max={5} step={0.01} value={tanVal} onChange={(e) => setTanVal(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
            <span>0.1</span>
            <span>α = {angleDeg.toFixed(1)}°</span>
            <span>5.0</span>
          </div>
        </div>
      </div>

      {/* Triangle SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 280 ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          <polygon points={`${ox},${oy} ${bx},${by} ${cx},${Math.max(5, cy)}`} fill="rgba(220,38,38,0.05)" stroke="#DC2626" strokeWidth={2} />
          {/* Right angle */}
          <polyline points={`${bx - 10},${by} ${bx - 10},${by - 10} ${bx},${by - 10}`} fill="none" stroke="#64748b" strokeWidth={1} />
          {/* Angle arc */}
          <path d={`M${ox + 20},${oy} A20,20 0 0,0 ${ox + 20 * Math.cos(angleRad)},${oy - 20 * Math.sin(angleRad)}`} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
          <text x={ox + 28} y={oy - 6} fontSize={11} fill="#f59e0b" fontFamily="monospace">{angleDeg.toFixed(1)}°</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center", marginBottom: 10 }}>
        {[
          { label: "sin α", val: sinVal.toFixed(4) },
          { label: "cos α", val: cosVal.toFixed(4) },
          { label: "tan α", val: tanVal.toFixed(4) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 17, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "sin²α + cos²α", val: identity.toFixed(6), highlight: true },
          { label: "sin α / cos α", val: sinOverCos.toFixed(4) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 17, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>sin²α + cos²α = 1 תמיד, ו-sin/cos = tan תמיד. שנו את tan ובדקו!</p>
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
  const [activeTab, setActiveTab] = useState<"ratios" | "special" | "identity" | null>(null);

  const tabs = [
    { id: "ratios" as const, label: "📐 יחסים טריגונומטריים", tex: "\\sin\\alpha", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "special" as const, label: "⭐ זוויות מיוחדות", tex: "30°,45°,60°", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "identity" as const, label: "🔗 זהויות", tex: "\\sin^2\\!+\\cos^2", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: Trig Ratios */}
      {activeTab === "ratios" && (
        <motion.div key="ratios" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\sin\\alpha = \\frac{\\text{opposite}}{\\text{hypotenuse}}"}</DisplayMath>
              <DisplayMath>{"\\cos\\alpha = \\frac{\\text{adjacent}}{\\text{hypotenuse}}"}</DisplayMath>
              <DisplayMath>{"\\tan\\alpha = \\frac{\\text{opposite}}{\\text{adjacent}}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך לזכור?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><strong>sin</strong> = ניצב <strong>נ</strong>גדי / יתר (שניהם מתחילים ב-נ ו-י).</li>
                  <li><strong>cos</strong> = ניצב <strong>ס</strong>מוך / יתר.</li>
                  <li><strong>tan</strong> = נגדי / סמוך (ללא היתר).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: במשולש עם ניצבים 3,4 ויתר 5 → sin α = 3/5, cos α = 4/5, tan α = 3/4
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Special Angles */}
      {activeTab === "special" && (
        <motion.div key="special" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div style={{ overflowX: "auto" }}>
              <table dir="ltr" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "center" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "6px 8px", borderBottom: "2px solid rgba(234,88,12,0.3)", color: "#EA580C", fontWeight: 700 }}>α</th>
                    <th style={{ padding: "6px 8px", borderBottom: "2px solid rgba(234,88,12,0.3)", color: "#EA580C", fontWeight: 700 }}>sin α</th>
                    <th style={{ padding: "6px 8px", borderBottom: "2px solid rgba(234,88,12,0.3)", color: "#EA580C", fontWeight: 700 }}>cos α</th>
                    <th style={{ padding: "6px 8px", borderBottom: "2px solid rgba(234,88,12,0.3)", color: "#EA580C", fontWeight: 700 }}>tan α</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { angle: "30°", sin: "\\frac{1}{2}", cos: "\\frac{\\sqrt3}{2}", tan: "\\frac{1}{\\sqrt3}" },
                    { angle: "45°", sin: "\\frac{\\sqrt2}{2}", cos: "\\frac{\\sqrt2}{2}", tan: "1" },
                    { angle: "60°", sin: "\\frac{\\sqrt3}{2}", cos: "\\frac{1}{2}", tan: "\\sqrt3" },
                  ].map(row => (
                    <tr key={row.angle}>
                      <td style={{ padding: "8px", borderBottom: "1px solid rgba(60,54,42,0.1)", fontWeight: 700, color: "#2D3436" }}>{row.angle}</td>
                      <td style={{ padding: "8px", borderBottom: "1px solid rgba(60,54,42,0.1)" }}><InlineMath>{row.sin}</InlineMath></td>
                      <td style={{ padding: "8px", borderBottom: "1px solid rgba(60,54,42,0.1)" }}><InlineMath>{row.cos}</InlineMath></td>
                      <td style={{ padding: "8px", borderBottom: "1px solid rgba(60,54,42,0.1)" }}><InlineMath>{row.tan}</InlineMath></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
              💡 שימו לב לסימטריה: sin 30° = cos 60°, ו-sin 60° = cos 30°
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Identities */}
      {activeTab === "identity" && (
        <motion.div key="identity" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\sin^2\\alpha + \\cos^2\\alpha = 1"}</DisplayMath>
              <DisplayMath>{"\\tan\\alpha = \\frac{\\sin\\alpha}{\\cos\\alpha}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>למה sin² + cos² = 1?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>sin α = a/c, cos α = b/c (a,b ניצבים, c יתר).</li>
                  <li>sin² + cos² = a²/c² + b²/c² = (a²+b²)/c².</li>
                  <li>לפי פיתגורס: a²+b² = c², לכן (a²+b²)/c² = 1.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: sin = 3/5, cos = 4/5 → 9/25 + 16/25 = 25/25 = 1
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BasicTrigPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>sin, cos, tan עם AI — כיתה יא׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>יחסים טריגונומטריים במשולש ישר-זווית, זוויות מיוחדות — ואיך לשאול AI את השאלות הנכונות</p>
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

        <SubtopicProgress subtopicId="3u/grade11/trig/basic" />

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
        {selectedLevel === "basic" && <TrigRatioLab />}
        {selectedLevel === "medium" && <SpecialAnglesLab />}
        {selectedLevel === "advanced" && <IdentityLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade11/trig/basic" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
