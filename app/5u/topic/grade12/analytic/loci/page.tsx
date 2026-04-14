"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
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
    <svg viewBox="0 0 260 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Point A */}
      <circle cx={70} cy={130} r={5} fill="#f59e0b" />
      <text x={60} y={155} fontSize={13} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>A</text>
      {/* Point B */}
      <circle cx={190} cy={50} r={5} fill="#f59e0b" />
      <text x={200} y={42} fontSize={13} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>B</text>
      {/* Perpendicular bisector (dashed) */}
      <line x1={40} y1={30} x2={220} y2={150} stroke="#34d399" strokeWidth={1.8} strokeDasharray="6,4" />
      {/* Midpoint */}
      <circle cx={130} cy={90} r={3} fill="#34d399" />
      {/* Point P with ? distances */}
      <circle cx={160} cy={60} r={4} fill="#a78bfa" />
      <text x={170} y={55} fontSize={12} fill="#a78bfa" textAnchor="start" fontFamily="sans-serif" fontWeight={600}>P</text>
      {/* Distance PA */}
      <line x1={160} y1={60} x2={70} y2={130} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />
      <text x={105} y={100} fontSize={10} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">?</text>
      {/* Distance PB */}
      <line x1={160} y1={60} x2={190} y2={50} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />
      <text x={180} y={48} fontSize={10} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">?</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 280 220" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Circle from origin */}
      <circle cx={140} cy={110} r={60} fill="none" stroke="#EA580C" strokeWidth={1.8} opacity={0.6} />
      {/* Center dot */}
      <circle cx={140} cy={110} r={3} fill="#EA580C" />
      <text x={140} y={185} fontSize={11} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">O</text>
      {/* Point P on circle */}
      <circle cx={186} cy={75} r={4} fill="#a78bfa" />
      <text x={196} y={72} fontSize={12} fill="#a78bfa" textAnchor="start" fontFamily="sans-serif" fontWeight={600}>P</text>
      {/* Radius line */}
      <line x1={140} y1={110} x2={186} y2={75} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />
      <text x={167} y={86} fontSize={10} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">r</text>
      {/* Second diagram: two points with ratio */}
      <line x1={0} y1={195} x2={280} y2={195} stroke="rgba(60,54,42,0.1)" strokeWidth={1} />
      <circle cx={90} cy={155} r={4} fill="#f59e0b" />
      <text x={80} y={168} fontSize={11} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>A</text>
      <circle cx={190} cy={155} r={4} fill="#f59e0b" />
      <text x={200} y={168} fontSize={11} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>B</text>
      {/* Ratio point */}
      <circle cx={55} cy={140} r={3} fill="#a78bfa" />
      <text x={45} y={135} fontSize={10} fill="#a78bfa" fontFamily="sans-serif">P</text>
      <line x1={55} y1={140} x2={90} y2={155} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3,3" />
      <line x1={55} y1={140} x2={190} y2={155} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3,3" />
    </svg>
  );
}

function AdvancedSVG() {
  // Ellipse and hyperbola outlines with foci
  const cx = 150, cy = 100;
  return (
    <svg viewBox="0 0 300 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Ellipse */}
      <ellipse cx={cx} cy={cy} rx={90} ry={55} fill="none" stroke="#DC2626" strokeWidth={1.6} opacity={0.5} />
      {/* Hyperbola branches (approximated with arcs) */}
      <path d={`M ${cx - 120} ${cy - 60} Q ${cx - 70} ${cy} ${cx - 120} ${cy + 60}`} fill="none" stroke="#a78bfa" strokeWidth={1.6} strokeDasharray="5,3" opacity={0.6} />
      <path d={`M ${cx + 120} ${cy - 60} Q ${cx + 70} ${cy} ${cx + 120} ${cy + 60}`} fill="none" stroke="#a78bfa" strokeWidth={1.6} strokeDasharray="5,3" opacity={0.6} />
      {/* Foci */}
      <circle cx={cx - 50} cy={cy} r={5} fill="#f59e0b" />
      <text x={cx - 50} y={cy + 18} fontSize={12} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>A</text>
      <circle cx={cx + 50} cy={cy} r={5} fill="#f59e0b" />
      <text x={cx + 50} y={cy + 18} fontSize={12} fill="#1A1A1A" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>B</text>
      {/* Labels */}
      <text x={cx} y={40} fontSize={10} fill="#DC2626" textAnchor="middle" fontFamily="sans-serif" opacity={0.7}>PA + PB = const</text>
      <text x={cx} y={190} fontSize={10} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" opacity={0.7}>|PA - PB| = const</text>
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

function GoldenPromptCard({ prompt, title = "פרומפט ראשי", borderRgb = "45,90,39" }: { prompt: string; title?: string; glowRgb?: string; borderRgb?: string }) {
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
        subjectWords={["מקום גיאומטרי", "מרחק", "מעגל", "אליפסה", "היפרבולה", "תנאי"]}
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
    title: "מקום גיאומטרי — שווי מרחק משתי נקודות",
    problem: "נתונות שתי נקודות A(1,3) ו-B(5,7).\n\nא. כתבו את תנאי המרחק: PA = PB עבור נקודה כללית P(x,y).\nב. הציבו בנוסחת המרחק ופשטו — הגיעו למשוואת ישר.\nג. זהו את התוצאה כאמצע אנך לקטע AB.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "שוכחים להעלות בריבוע את שני האגפים", text: "כשכותבים PA = PB ומציבים בנוסחת המרחק, חייבים להעלות בריבוע את שני הצדדים כדי להיפטר מהשורש. תלמידים רבים מנסים לפשט עם השורש — וזה מסרבל מאוד." },
      { title: "לא מפשטים לצורת ישר סטנדרטית", text: "אחרי העלאה בריבוע ופתיחת סוגריים, צריך לצמצם איברים שווים משני הצדדים. אם נשאר ביטוי מסובך — כנראה שכחתם לצמצם את x² ו-y² שמופיעים בשני האגפים." },
      { title: "בלבול בין אמצע אנך לישר AB", text: "המקום הגיאומטרי של שווי מרחק משתי נקודות הוא האמצע אנך — ישר שעובר דרך אמצע הקטע ומאונך לו. זה לא הישר שעובר דרך A ו-B!" },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יב', 5 יחידות, ומצרף/ת שאלה בגיאומטריה אנליטית על מקום גיאומטרי — שווי מרחק משתי נקודות. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "כתיבת תנאי המרחק", coaching: "", prompt: "נתונות A(1,3) ו-B(5,7). עבור נקודה P(x,y), תנחה אותי כיצד לכתוב את התנאי PA = PB באמצעות נוסחת המרחק.", keywords: [], keywordHint: "", contextWords: ["מרחק", "PA", "PB", "נוסחה", "שורש", "שווה"] },
      { phase: "סעיף ב׳", label: "הצבה ופישוט", coaching: "", prompt: "נתונות A(1,3) ו-B(5,7), P(x,y). כתבתי PA = PB עם נוסחת מרחק. תדריך אותי כיצד להעלות בריבוע, לפתוח סוגריים ולפשט למשוואת ישר.", keywords: [], keywordHint: "", contextWords: ["ריבוע", "פישוט", "צמצום", "סוגריים", "משוואה", "ישר"] },
      { phase: "סעיף ג׳", label: "זיהוי כאמצע אנך", coaching: "", prompt: "קיבלתי משוואת ישר מתנאי PA = PB. תכווין אותי להסביר למה זה האמצע אנך של AB — ישר שעובר באמצע הקטע ומאונך לו.", keywords: [], keywordHint: "", contextWords: ["אמצע אנך", "אנך", "אמצע", "מאונך", "קטע", "מקום גיאומטרי"] },
    ],
  },
  {
    id: "medium",
    title: "מקום גיאומטרי — מרחק קבוע מנקודה",
    problem: "א. מצאו את המקום הגיאומטרי של כל הנקודות שמרחקן מראשית הצירים שווה ל-r (קבוע חיובי). רשמו את התנאי ופשטו.\nב. העלו בריבוע את שני האגפים וזהו את המשוואה המתקבלת.\nג. מצאו את המקום הגיאומטרי של כל הנקודות P(x,y) כך שהמרחק מ-A(2,0) גדול פי 2 מהמרחק מ-B(-1,0). רשמו תנאי, פשטו וזהו.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "שוכחים שהעלאה בריבוע דורשת בדיקה", text: "כשמעלים בריבוע את שני צדי המשוואה כדי להיפטר מהשורש, לפעמים מתקבלים פתרונות זרים. בבעיית מרחק חיובי זה בדרך כלל לא קורה, אבל חשוב לזכור את הכלל." },
      { title: "מרחק פי 2 זה יחס, לא הפרש", text: "PA = 2·PB פירושו שהמרחק מ-A גדול פי 2 מהמרחק מ-B — זה תנאי של יחס. תלמידים רבים כותבים PA - PB = 2, שזה תנאי של הפרש — דבר שונה לגמרי!" },
      { title: "לא מזהים את צורת המעגל", text: "אחרי פישוט PA = 2·PB עם נקודות ספציפיות, מתקבלת משוואת מעגל. צריך להשלים לריבוע כדי לזהות את המרכז והרדיוס." },
    ],
    goldenPrompt: `אני בכיתה יב', 5 יחידות, מצרף/ת תרגיל בגיאומטריה אנליטית בנושא מקום גיאומטרי — מרחק קבוע מנקודה ותנאי יחס מרחקים.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על הצבה בנוסחת מרחק, העלאה בריבוע, וזיהוי צורות (מעגל).
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "תנאי מרחק מהראשית", coaching: "", prompt: "נתונה נקודה P(x,y) ומרחקה מראשית הצירים שווה ל-r. תנחה אותי לכתוב את התנאי עם נוסחת מרחק ולפשט.", keywords: [], keywordHint: "", contextWords: ["מרחק", "ראשית", "שורש", "תנאי", "r", "נוסחה"] },
      { phase: "סעיף ב׳", label: "העלאה בריבוע וזיהוי מעגל", coaching: "", prompt: "כתבתי שורש(x²+y²) = r. תדריך אותי להעלות בריבוע ולזהות שזו משוואת מעגל — ומה המרכז והרדיוס.", keywords: [], keywordHint: "", contextWords: ["ריבוע", "מעגל", "מרכז", "רדיוס", "משוואה", "מקום גיאומטרי"] },
      { phase: "סעיף ג׳", label: "יחס מרחקים — PA = 2PB", coaching: "", prompt: "נתונות A(2,0) ו-B(-1,0). תנאי: PA = 2·PB. תכווין אותי להציב בנוסחאות מרחק, להעלות בריבוע, לפשט ולזהות מה הצורה המתקבלת.", keywords: [], keywordHint: "", contextWords: ["יחס", "מרחק", "ריבוע", "מעגל", "השלמה", "פישוט"] },
    ],
  },
  {
    id: "advanced",
    title: "מקום גיאומטרי מורכב — אליפסה והיפרבולה",
    problem: "נתונות שתי נקודות מוקדיות A ו-B.\n\nא. מצאו את המקום הגיאומטרי של כל הנקודות P כך ש-PA + PB = k (קבוע). זהו את הצורה.\nב. מצאו את המקום הגיאומטרי של כל הנקודות P כך ש-|PA - PB| = k (קבוע). זהו את הצורה.\nג. עבור איזה ערך של k המקום הגיאומטרי מתנוון לקטע/נקודה?\nד. תארו כיצד שתי העקומות נראות על אותם צירים.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "בלבול בין סכום להפרש מרחקים", text: "PA + PB = const נותן אליפסה, ואילו |PA - PB| = const נותן היפרבולה. שתי העקומות חולקות את אותן מוקדים, אבל הצורה שונה לחלוטין." },
      { title: "שוכחים את מקרי הניוון", text: "כש-k = המרחק בין המוקדים, האליפסה מתנוונת לקטע AB. כש-k = 0, ההיפרבולה מתנוונת לאמצע האנך. חשוב להכיר את הגבולות." },
      { title: "חוסר דיוק בסקיצה", text: "באליפסה, כל נקודה על העקומה מקיימת PA + PB = const. בהיפרבולה, ההפרש קבוע. הסקיצה צריכה לשקף את זה — האליפסה סגורה, ההיפרבולה פתוחה לשני כיוונים." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: מהו מקום גיאומטרי, מה ההבדל בין אליפסה להיפרבולה מבחינת תנאי המרחק, ומתי המקום הגיאומטרי מתנוון? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "סכום מרחקים — אליפסה", coaching: "", prompt: "נתונות מוקדים A ו-B. תנאי: PA + PB = k (קבוע). תנחה אותי לזהות שזו אליפסה ולהסביר מדוע.", keywords: [], keywordHint: "", contextWords: ["סכום", "מרחק", "אליפסה", "מוקדים", "קבוע", "עקומה"] },
      { phase: "סעיף ב׳", label: "הפרש מרחקים — היפרבולה", coaching: "", prompt: "נתונות מוקדים A ו-B. תנאי: |PA - PB| = k (קבוע). תדריך אותי לזהות שזו היפרבולה ולהסביר את ההבדל מאליפסה.", keywords: [], keywordHint: "", contextWords: ["הפרש", "ערך מוחלט", "היפרבולה", "מוקדים", "ענף", "קבוע"] },
      { phase: "סעיף ג׳", label: "מקרי ניוון", coaching: "", prompt: "תכווין אותי להבין: עבור איזה ערך של k האליפסה מתנוונת לקטע? מתי ההיפרבולה מתנוונת? מה הקשר למרחק בין המוקדים?", keywords: [], keywordHint: "", contextWords: ["ניוון", "קטע", "נקודה", "מרחק מוקדים", "תנאי", "גבול"] },
      { phase: "סעיף ד׳", label: "סקיצה משולבת", coaching: "", prompt: "תנחה אותי לשרטט אליפסה והיפרבולה עם אותן מוקדים על אותם צירים. מה היחס ביניהן? אילו תכונות גיאומטריות משותפות?", keywords: [], keywordHint: "", contextWords: ["סקיצה", "צירים", "מוקדים", "אליפסה", "היפרבולה", "גיאומטרי"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>מקומות גיאומטריים (Geometric Loci)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "שווי מרחק משתי נקודות — תנאי PA = PB מוביל לאמצע אנך. הבסיס של כל מקום גיאומטרי."}
            {ex.id === "medium" && "מרחק קבוע מנקודה = מעגל. יחס מרחקים = מעגל אפולוניוס. איך מזהים צורה מתנאי אלגברי?"}
            {ex.id === "advanced" && "סכום מרחקים ממוקדים = אליפסה. הפרש מרחקים = היפרבולה. מתי העקומה מתנוונת?"}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: מושגי יסוד */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>מושגי יסוד</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>מקום גיאומטרי</span>
              <span>אוסף כל הנקודות שמקיימות תנאי מסוים.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>נוסחת מרחק</span>
              <span>הכלי המרכזי — שורש של סכום ריבועי הפרשים.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>אמצע אנך</span>
              <span>ישר שעובר באמצע קטע ומאונך לו — מ.ג. של שווי מרחק.</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>צורות מתנאי מרחק</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>מעגל</span>
                  <span>מרחק קבוע מנקודה אחת, או יחס מרחקים קבוע משתי נקודות.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>ישר</span>
                  <span>שווי מרחק משתי נקודות (אמצע אנך).</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>חתכים קוניים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>אליפסה</span>
                  <span>PA + PB = const — עקומה סגורה סביב שני מוקדים.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>היפרבולה</span>
                  <span>|PA - PB| = const — שני ענפים פתוחים.</span>
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

// ─── PerpendicularBisectorLab (basic) ────────────────────────────────────────

function PerpendicularBisectorLab() {
  const [ax, setAx] = useState(-3);
  const [bx, setBx] = useState(3);
  const st = STATION.basic;

  // Points on y=0
  const ay = 0, by = 0;
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const slopeAB = bx === ax ? Infinity : (by - ay) / (bx - ax);
  const slopeBisector = slopeAB === 0 ? Infinity : slopeAB === Infinity ? 0 : -1 / slopeAB;

  // Test point moves on bisector
  const [t, setT] = useState(0.5);
  const testY = (t - 0.5) * 8;
  const testX = slopeBisector === Infinity ? mx : mx;
  const distA = Math.sqrt((testX - ax) ** 2 + (testY - ay) ** 2);
  const distB = Math.sqrt((testX - bx) ** 2 + (testY - by) ** 2);

  // SVG coords
  const W = 300, H = 220, cx = W / 2, cy = H / 2, scale = 20;
  const toSvg = (x: number, y: number) => [cx + x * scale, cy - y * scale];

  const [sAx, sAy] = toSvg(ax, ay);
  const [sBx, sBy] = toSvg(bx, by);
  const [sMx, sMy] = toSvg(mx, my);
  const [sTx, sTy] = toSvg(testX, testY);

  // Bisector line endpoints (vertical since points are on y=0)
  const bisY1 = cy - 5 * scale;
  const bisY2 = cy + 5 * scale;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת אמצע אנך</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את מיקום הנקודות A ו-B על ציר x — צפו כיצד האמצע אנך משתנה, ושהמרחקים מ-P שווים תמיד.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>x של A</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{ax}</span>
          </div>
          <input type="range" min={-6} max={6} step={0.5} value={ax} onChange={(e) => setAx(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>x של B</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{bx}</span>
          </div>
          <input type="range" min={-6} max={6} step={0.5} value={bx} onChange={(e) => setBx(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>נקודת P</span>
            <span style={{ color: "#a78bfa", fontFamily: "monospace", fontWeight: 700 }}>{testY.toFixed(1)}</span>
          </div>
          <input type="range" min={0} max={1} step={0.02} value={t} onChange={(e) => setT(+e.target.value)} style={{ width: "100%", accentColor: "#a78bfa" }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Axes */}
          <line x1={10} y1={cy} x2={W - 10} y2={cy} stroke="#94a3b8" strokeWidth={1} />
          <line x1={cx} y1={10} x2={cx} y2={H - 10} stroke="#94a3b8" strokeWidth={1} />
          {/* Perpendicular bisector */}
          <line x1={sMx} y1={bisY1} x2={sMx} y2={bisY2} stroke="#34d399" strokeWidth={2} strokeDasharray="6,4" />
          {/* Segment AB */}
          <line x1={sAx} y1={sAy} x2={sBx} y2={sBy} stroke="#f59e0b" strokeWidth={2} />
          {/* Midpoint */}
          <circle cx={sMx} cy={sMy} r={4} fill="#34d399" />
          {/* Points A, B */}
          <circle cx={sAx} cy={sAy} r={5} fill="#f59e0b" />
          <text x={sAx} y={sAy + 16} fontSize={12} fill="#1A1A1A" textAnchor="middle" fontWeight={700}>A</text>
          <circle cx={sBx} cy={sBy} r={5} fill="#f59e0b" />
          <text x={sBx} y={sBy + 16} fontSize={12} fill="#1A1A1A" textAnchor="middle" fontWeight={700}>B</text>
          {/* Test point P */}
          <circle cx={sTx} cy={sTy} r={5} fill="#a78bfa" />
          <text x={sTx + 10} y={sTy - 4} fontSize={11} fill="#a78bfa" fontWeight={600}>P</text>
          {/* Distance lines */}
          <line x1={sTx} y1={sTy} x2={sAx} y2={sAy} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3,3" />
          <line x1={sTx} y1={sTy} x2={sBx} y2={sBy} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3,3" />
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "אמצע הקטע", val: `(${mx.toFixed(1)}, 0)` },
          { label: "PA", val: distA.toFixed(2) },
          { label: "PB", val: distB.toFixed(2) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>P נמצאת תמיד על האמצע אנך — PA = PB בכל מקום על הישר!</p>
    </section>
  );
}

// ─── CircleLocusLab (medium) ─────────────────────────────────────────────────

function CircleLocusLab() {
  const [r, setR] = useState(3);
  const st = STATION.medium;

  const circumference = 2 * Math.PI * r;

  // Animated point on circle
  const [angle, setAngle] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setAngle(a => (a + 0.03) % (2 * Math.PI)), 50);
    return () => clearInterval(id);
  }, []);

  const W = 260, H = 260, cx = W / 2, cy = H / 2, scale = 25;
  const px = cx + r * scale * Math.cos(angle);
  const py = cy - r * scale * Math.sin(angle);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת מעגל כמקום גיאומטרי</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את הרדיוס r — נקודה P נעה על המעגל ומקיימת תמיד: מרחק מהמרכז = r.</p>

      {/* Slider */}
      <div style={{ maxWidth: 300, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>רדיוס r</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{r}</span>
          </div>
          <input type="range" min={1} max={5} step={0.5} value={r} onChange={(e) => setR(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto" aria-hidden>
          {/* Axes */}
          <line x1={10} y1={cy} x2={W - 10} y2={cy} stroke="#94a3b8" strokeWidth={1} />
          <line x1={cx} y1={10} x2={cx} y2={H - 10} stroke="#94a3b8" strokeWidth={1} />
          {/* Circle */}
          <circle cx={cx} cy={cy} r={r * scale} fill="none" stroke={st.accentColor} strokeWidth={2} opacity={0.6} />
          {/* Center */}
          <circle cx={cx} cy={cy} r={3} fill={st.accentColor} />
          <text x={cx + 8} y={cy + 14} fontSize={11} fill="#6B7280" fontFamily="sans-serif">O</text>
          {/* Moving point */}
          <circle cx={px} cy={py} r={5} fill="#a78bfa" />
          <text x={px + 8} y={py - 6} fontSize={11} fill="#a78bfa" fontWeight={600}>P</text>
          {/* Radius line */}
          <line x1={cx} y1={cy} x2={px} y2={py} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "משוואה", val: `x\u00B2+y\u00B2=${(r * r).toFixed(0)}` },
          { label: "רדיוס r", val: r.toFixed(1) },
          { label: "היקף", val: circumference.toFixed(1) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 16, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>כל נקודה על המעגל מקיימת מרחק קבוע r מהמרכז — זה המקום הגיאומטרי!</p>
    </section>
  );
}

// ─── EllipseHyperbolaLab (advanced) ──────────────────────────────────────────

function EllipseHyperbolaLab() {
  const [k, setK] = useState(10);
  const st = STATION.advanced;

  // Fixed foci at (-c, 0) and (c, 0) with c = 3
  const c = 3;
  const dist2c = 2 * c; // distance between foci

  // Ellipse: sum = k, requires k > 2c
  const isEllipse = k > dist2c;
  const isDegenerate = Math.abs(k - dist2c) < 0.3;
  const ellipseA = k / 2;
  const ellipseB = isEllipse ? Math.sqrt(ellipseA * ellipseA - c * c) : 0;
  const ellipseEcc = isEllipse ? c / ellipseA : 1;

  // Hyperbola: |diff| = k, requires k < 2c
  const isHyperbola = k < dist2c && k > 0;
  const hyperA = k / 2;
  const hyperB = isHyperbola ? Math.sqrt(c * c - hyperA * hyperA) : 0;
  const hyperEcc = isHyperbola ? c / hyperA : 0;

  const W = 300, H = 220, svgCx = W / 2, svgCy = H / 2, scale = 16;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת אליפסה והיפרבולה</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את הקבוע k — כשהוא גדול ממרחק המוקדים: אליפסה. כשהוא קטן: היפרבולה. שווה? ניוון!</p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>קבוע k (סכום/הפרש)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{k.toFixed(1)}</span>
          </div>
          <input type="range" min={0.5} max={16} step={0.5} value={k} onChange={(e) => setK(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
            <span>היפרבולה</span>
            <span style={{ color: "#f59e0b", fontWeight: 700 }}>2c = {dist2c}</span>
            <span>אליפסה</span>
          </div>
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Axes */}
          <line x1={10} y1={svgCy} x2={W - 10} y2={svgCy} stroke="#94a3b8" strokeWidth={1} />
          <line x1={svgCx} y1={10} x2={svgCx} y2={H - 10} stroke="#94a3b8" strokeWidth={1} />

          {/* Ellipse */}
          {isEllipse && !isDegenerate && (
            <ellipse cx={svgCx} cy={svgCy} rx={ellipseA * scale} ry={ellipseB * scale} fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.6} />
          )}

          {/* Degenerate: line segment */}
          {isDegenerate && (
            <line x1={svgCx - c * scale} y1={svgCy} x2={svgCx + c * scale} y2={svgCy} stroke="#f59e0b" strokeWidth={3} opacity={0.8} />
          )}

          {/* Hyperbola branches */}
          {isHyperbola && !isDegenerate && (() => {
            const pts: string[] = [];
            const pts2: string[] = [];
            for (let yVal = -6; yVal <= 6; yVal += 0.15) {
              const xVal = hyperA * Math.sqrt(1 + (yVal * yVal) / (hyperB * hyperB));
              if (isFinite(xVal) && xVal * scale < W / 2 - 15) {
                pts.push(`${svgCx + xVal * scale},${svgCy - yVal * scale}`);
                pts2.push(`${svgCx - xVal * scale},${svgCy - yVal * scale}`);
              }
            }
            return (
              <>
                {pts.length > 1 && <polyline points={pts.join(" ")} fill="none" stroke="#a78bfa" strokeWidth={2} opacity={0.7} />}
                {pts2.length > 1 && <polyline points={pts2.join(" ")} fill="none" stroke="#a78bfa" strokeWidth={2} opacity={0.7} />}
              </>
            );
          })()}

          {/* Foci */}
          <circle cx={svgCx - c * scale} cy={svgCy} r={5} fill="#f59e0b" />
          <text x={svgCx - c * scale} y={svgCy + 18} fontSize={12} fill="#1A1A1A" textAnchor="middle" fontWeight={700}>A</text>
          <circle cx={svgCx + c * scale} cy={svgCy} r={5} fill="#f59e0b" />
          <text x={svgCx + c * scale} y={svgCy + 18} fontSize={12} fill="#1A1A1A" textAnchor="middle" fontWeight={700}>B</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "סוג", val: isDegenerate ? "ניוון" : isEllipse ? "אליפסה" : "היפרבולה" },
          { label: "a", val: (k / 2).toFixed(1) },
          { label: "b", val: isEllipse && !isDegenerate ? ellipseB.toFixed(1) : isHyperbola ? hyperB.toFixed(1) : "—" },
          { label: "אקסצנטריות", val: isEllipse && !isDegenerate ? ellipseEcc.toFixed(2) : isHyperbola ? hyperEcc.toFixed(2) : "—" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 10, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>
        {isDegenerate ? "k = מרחק בין המוקדים — המקום הגיאומטרי מתנוון לקטע AB!" : isEllipse ? "k > 2c: סכום המרחקים קבוע — אליפסה סגורה." : "k < 2c: הפרש המרחקים קבוע — היפרבולה פתוחה."}
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
  const [activeTab, setActiveTab] = useState<"distance" | "circle" | "bisector" | null>(null);

  const tabs = [
    { id: "distance" as const, label: "מרחק", tex: "d", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "circle" as const, label: "מעגל כמ.ג.", tex: "r", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "bisector" as const, label: "אמצע אנך", tex: "\\perp", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: Distance */}
      {activeTab === "distance" && (
        <motion.div key="distance" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>נוסחת המרחק</strong> — הכלי הבסיסי ביותר למקום גיאומטרי.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מחשבים את הפרש הקואורדינטות בכל ציר.</li>
                  <li>מעלים כל הפרש בריבוע וסוכמים.</li>
                  <li>מוציאים שורש מהסכום.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                שימוש: רושמים תנאי מרחק (PA = PB או PA = r), מציבים בנוסחה ומפשטים.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Circle as locus */}
      {activeTab === "circle" && (
        <motion.div key="circle" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"(x - a)^2 + (y - b)^2 = r^2"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מעגל כמקום גיאומטרי</strong> — כל הנקודות במרחק r ממרכז (a,b).
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>תנאי: מרחק מנקודה קבועה = r (קבוע חיובי).</li>
                  <li>הצבה בנוסחת מרחק והעלאה בריבוע.</li>
                  <li>התוצאה: משוואת מעגל סטנדרטית.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                גם יחס מרחקים קבוע משתי נקודות (PA/PB = const) נותן מעגל (מעגל אפולוניוס).
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Perpendicular bisector */}
      {activeTab === "bisector" && (
        <motion.div key="bisector" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#DC2626", fontSize: 16, fontWeight: 700 }}>
              אמצע אנך = שווי מרחק
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>גזירה</strong> — מתנאי PA = PB מגיעים לישר:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>כותבים PA = PB עם נוסחת מרחק.</li>
                  <li>מעלים בריבוע את שני הצדדים.</li>
                  <li>פותחים סוגריים ומצמצמים — נשאר ישר.</li>
                  <li>הישר עובר באמצע AB ומאונך לו.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                רמז: איברי x² ו-y² מתבטלים תמיד! נשארת משוואה ליניארית.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LociPage() {
  useDefaultToast();
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>מקומות גיאומטריים עם AI — כיתה יב׳ (5 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>שווי מרחק, מעגל כמ.ג., אליפסה והיפרבולה — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/5u/topic/grade12/analytic"
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

        <SubtopicProgress subtopicId="5u/grade12/analytic/loci" />

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
        {selectedLevel === "basic" && <PerpendicularBisectorLab />}
        {selectedLevel === "medium" && <CircleLocusLab />}
        {selectedLevel === "advanced" && <EllipseHyperbolaLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="5u/grade12/analytic/loci" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
