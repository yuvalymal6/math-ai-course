"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle2, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import LabMessage from "@/app/components/LabMessage";
import SubtopicProgress from "@/app/components/SubtopicProgress";
import katex from "katex";
import "katex/dist/katex.min.css";

// ─── Global CSS ──────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  textarea:focus, input[type="text"]:focus {
    outline: 2px solid rgba(var(--lvl-rgb), 0.55);
    outline-offset: 1px;
    border-color: rgba(var(--lvl-rgb), 0.5) !important;
  }
  button:focus-visible {
    outline: 2px solid rgba(var(--lvl-rgb), 0.55);
    outline-offset: 2px;
  }
`;

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

// ─── Types ───────────────────────────────────────────────────────────────────

type PromptStep = {
  phase: string;
  label: string;
  prompt?: string;
  contextWords?: string[];
};

type ExerciseDef = {
  id: "basic" | "medium" | "advanced";
  title: string;
  problem: string;
  diagram: React.ReactNode;
  pitfalls: { title: string; text: string }[];
  goldenPrompt: string;
  steps: PromptStep[];
  subjectWords?: string[];
  subjectHint?: string;
};

// ─── Station config ──────────────────────────────────────────────────────────

const STATION = {
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",   accentColor: "#16A34A", borderHex: "#2D5A27", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני", badgeCls: "bg-orange-600 text-white", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12",  accentColor: "#EA580C", borderHex: "#A34F26", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38",  accentColor: "#DC2626", borderHex: "#8B2635", borderRgb: "139,38,53"  },
} as const;

const TABS = [
  { id: "basic" as const,    label: "מתחיל",  textColor: "text-green-700",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium" as const,   label: "בינוני", textColor: "text-orange-700",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced" as const, label: "מתקדם",  textColor: "text-red-700",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

// ─── FormulaBar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"power" | "exp" | "area" | "ftc" | null>(null);

  const tabs = [
    { id: "power" as const, label: "חזקות",           tex: "\\int x^n dx",              color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "exp" as const,   label: "מעריכי ולוג",     tex: "\\int e^x dx",              color: "#3b82f6", borderColor: "rgba(59,130,246,0.35)" },
    { id: "area" as const,  label: "שטח בין עקומות",  tex: "\\int_a^b |f-g|\\,dx",      color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "ftc" as const,   label: "משפט היסוד",      tex: "F(b)-F(a)",                 color: "#7C3AED", borderColor: "rgba(124,58,237,0.35)" },
  ];

  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>

      <div style={{ display: "flex", gap: 6, marginBottom: activeTab ? 14 : 0 }}>
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(isActive ? null : t.id)}
              style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
                border: `1.5px solid ${isActive ? t.borderColor : "rgba(60,54,42,0.15)"}`,
                background: isActive ? `${t.color}15` : "rgba(255,255,255,0.02)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
              <span style={{ color: isActive ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span>
            </button>
          );
        })}
      </div>

      {activeTab === "power" && (
        <motion.div key="power" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: 16 }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> מעלים את החזקה ב-1, מחלקים בחזקה החדשה.
                <ul dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>עובד לכל n מלבד n = −1.</li>
                  <li>באינטגרל לא מסוים — תמיד להוסיף +C!</li>
                </ul>
              </div>
              <div style={{ marginTop: 10, color: "#16a34a", fontSize: 11, fontWeight: 600 }}>
                &#128161; דוגמה: <InlineMath>{"\\int x^2\\,dx = \\frac{x^3}{3} + C"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "exp" && (
        <motion.div key="exp" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(59,130,246,0.25)", background: "rgba(59,130,246,0.06)", padding: 16 }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\int e^x\\,dx = e^x + C \\qquad \\int \\frac{1}{x}\\,dx = \\ln|x| + C"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> שני כללים מיוחדים:
                <ul dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"e^x"}</InlineMath> — האנטי-נגזרת של עצמו.</li>
                  <li><InlineMath>{"\\frac{1}{x}"}</InlineMath> — זה המקרה n = −1, תוצאה: ln|x|.</li>
                </ul>
              </div>
              <div style={{ marginTop: 10, color: "#3b82f6", fontSize: 11, fontWeight: 600 }}>
                &#128161; שימו לב: <InlineMath>{"\\int \\frac{a}{x}\\,dx = a \\ln|x| + C"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "area" && (
        <motion.div key="area" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: 16 }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S = \\int_a^b |f(x) - g(x)|\\,dx"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> שטח בין שתי עקומות = אינטגרל של ההפרש (עליונה פחות תחתונה).
                <ul dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>תמיד לזהות מי למעלה ומי למטה בתחום.</li>
                  <li>אם מתחלפות — לפצל לתת-תחומים.</li>
                </ul>
              </div>
              <div style={{ marginTop: 10, color: "#EA580C", fontSize: 11, fontWeight: 600 }}>
                &#128161; טעות נפוצה: לשכוח ערך מוחלט כשהפונקציה התחתונה מתחלפת!
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "ftc" && (
        <motion.div key="ftc" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: 16 }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\int_a^b f(x)\\,dx = F(b) - F(a)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> משפט היסוד של החדו&quot;א — מחבר בין נגזרת לאינטגרל.
                <ul dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מצא אנטי-נגזרת F(x), הצב גבולות, חסר.</li>
                  <li>באינטגרל מסוים אין +C.</li>
                </ul>
              </div>
              <div style={{ marginTop: 10, color: "#7C3AED", fontSize: 11, fontWeight: 600 }}>
                &#128161; סדר: אנטי-נגזרת → הצבת גבול עליון → הצבת גבול תחתון → חיסור.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Silent SVG Diagrams ─────────────────────────────────────────────────────

function AreaUnderCurveDiagram() {
  return (
    <svg viewBox="0 0 220 140" className="w-full max-w-[220px] mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={30} y1={110} x2={200} y2={110} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={10} x2={30} y2={110} stroke="#94a3b8" strokeWidth={1.2} />
      {/* Parabola opening up, crossing x-axis at two points */}
      <path d="M60,110 Q80,130 110,110 Q140,50 170,110" fill="none" stroke="#34d399" strokeWidth={2.5} />
      {/* Shaded region below x-axis */}
      <path d="M60,110 Q80,130 110,110" fill="rgba(52,211,153,0.2)" stroke="none" />
      {/* Intersection dots */}
      <circle cx={60} cy={110} r={4} fill="#a78bfa" />
      <circle cx={110} cy={110} r={4} fill="#a78bfa" />
      {/* Labels */}
      <text x={60} y={125} textAnchor="middle" fontSize={10} fill="#a78bfa" fontWeight={600}>a</text>
      <text x={110} y={125} textAnchor="middle" fontSize={10} fill="#a78bfa" fontWeight={600}>b</text>
      <text x={180} y={25} textAnchor="end" fontSize={10} fill="#34d399" fontWeight={600} fontStyle="italic">f</text>
    </svg>
  );
}

function AreaBetweenCurvesDiagram() {
  return (
    <svg viewBox="0 0 220 140" className="w-full max-w-[220px] mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={30} y1={110} x2={200} y2={110} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={10} x2={30} y2={110} stroke="#94a3b8" strokeWidth={1.2} />
      {/* Exponential curve (upper) */}
      <path d="M50,95 Q80,80 110,55 Q140,25 170,10" fill="none" stroke="#f59e0b" strokeWidth={2.5} />
      {/* Linear function (lower) */}
      <line x1={50} y1={95} x2={170} y2={50} stroke="#34d399" strokeWidth={2} />
      {/* Shaded region between */}
      <path d="M50,95 Q80,80 110,55 Q140,25 170,10 L170,50 L50,95 Z" fill="rgba(245,158,11,0.15)" stroke="none" />
      {/* Boundary dashes */}
      <line x1={50} y1={95} x2={50} y2={110} stroke="#64748b" strokeWidth={1} strokeDasharray="3,2" />
      <line x1={170} y1={10} x2={170} y2={110} stroke="#64748b" strokeWidth={1} strokeDasharray="3,2" />
      {/* Labels */}
      <text x={50} y={125} textAnchor="middle" fontSize={10} fill="#a78bfa" fontWeight={600}>a</text>
      <text x={170} y={125} textAnchor="middle" fontSize={10} fill="#a78bfa" fontWeight={600}>b</text>
      <text x={185} y={18} textAnchor="end" fontSize={10} fill="#f59e0b" fontWeight={600} fontStyle="italic">f</text>
      <text x={185} y={55} textAnchor="end" fontSize={10} fill="#34d399" fontWeight={600} fontStyle="italic">g</text>
    </svg>
  );
}

function ParameterIntegralDiagram() {
  return (
    <svg viewBox="0 0 220 140" className="w-full max-w-[220px] mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={30} y1={110} x2={200} y2={110} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={10} x2={30} y2={110} stroke="#94a3b8" strokeWidth={1.2} />
      {/* Asymptote at x=0 */}
      <line x1={31} y1={10} x2={31} y2={110} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4,3" />
      {/* Hyperbola a/x shape */}
      <path d="M40,15 Q50,30 60,50 Q80,75 110,90 Q140,98 180,102" fill="none" stroke="#a78bfa" strokeWidth={2.5} />
      {/* Shaded region */}
      <path d="M60,50 Q80,75 110,90 Q130,96 150,100 L150,110 L60,110 Z" fill="rgba(139,92,246,0.15)" stroke="none" />
      {/* Boundary dashes */}
      <line x1={60} y1={50} x2={60} y2={110} stroke="#64748b" strokeWidth={1} strokeDasharray="3,2" />
      <line x1={150} y1={100} x2={150} y2={110} stroke="#64748b" strokeWidth={1} strokeDasharray="3,2" />
      {/* Labels */}
      <text x={60} y={125} textAnchor="middle" fontSize={10} fill="#a78bfa" fontWeight={600}>a</text>
      <text x={150} y={125} textAnchor="middle" fontSize={10} fill="#a78bfa" fontWeight={600}>b</text>
      <text x={185} y={95} textAnchor="end" fontSize={10} fill="#a78bfa" fontWeight={600} fontStyle="italic">f</text>
      {/* Parameter label */}
      <text x={110} y={80} textAnchor="middle" fontSize={9} fill="#64748b">S = ?</text>
    </svg>
  );
}

// ─── Prompt Coach Atoms ──────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(60,54,42,0.25)", color: "#1A1A1A", fontWeight: 500, cursor: "pointer" }}>
      {c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}
    </button>
  );
}

function GoldenPromptCard({ prompt, title = "פרומפט ראשי", borderRgb = "45,90,39" }: { prompt: string; title?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15)` }}>
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
  const [done, setDone] = useState(false);
  const prompt = step.prompt ?? "";
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(${glowRgb},0.45)`, marginBottom: 8, boxShadow: `0 0 14px rgba(${glowRgb},0.18)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}>
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
        {done && <CheckCircle2 size={14} color="#34d399" style={{ marginRight: "auto" }} />}
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>הפרומפט המוכן ✍️</div>
          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{prompt}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <CopyBtn text={prompt} label="העתק פרומפט ממוקד" />
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: done ? "#16a34a" : "#6B7280", fontWeight: done ? 600 : 400 }}>
            <input type="checkbox" checked={done} onChange={e => setDone(e.target.checked)} style={{ accentColor: "#16a34a" }} />
            סיימתי עם AI
          </label>
        </div>
      </div>
    </div>
  );
}

function TutorStepMedium({ step, locked = false, onPass, borderRgb = "45,90,39" }: { step: PromptStep; locked?: boolean; onPass?: () => void; borderRgb?: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const passed = !!(result && !result.blocked && result.score >= 75);

  const validate = () => {
    if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי — כתוב לפחות 20 תווים." }); return; }
    const res = calculatePromptScore(text, step.contextWords ?? []);
    setResult(res);
    if (!res.blocked && res.score >= 75) onPass?.();
  };

  if (locked) return (
    <div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.3)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}>
      <Lock size={15} color="#94a3b8" />
      <div>
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span>
      </div>
    </div>
  );

  const scoreBarColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${borderRgb},0.2)` }}>
        {passed ? <CheckCircle2 size={14} color="#34d399" /> : <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={text} rows={3} dir="rtl" disabled={passed}
          onChange={e => { setText(e.target.value); setResult(null); }}
          placeholder="נסח כאן את השאלה שלך ל-AI..."
          style={{ minHeight: 80, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.25)`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        {result && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", marginBottom: 4, fontWeight: 600 }}>
              <span>ציון הפרומפט</span><span style={{ fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}
        {result && result.blocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12 }}>⚠️ {result.hint}</motion.div>
        )}
        {result && !result.blocked && result.score < 75 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12 }}>💡 {result.hint}</motion.div>
        )}
        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, fontWeight: 600 }}>
            ✅ פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result!.score}/100</strong>
          </motion.div>
        )}
        {!result && (
          <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>
            בדיקת AI מדומה 🤖
          </button>
        )}
        {result && !passed && (
          <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>
        )}
      </div>
    </div>
  );
}

// ─── Ladders ─────────────────────────────────────────────────────────────────

function LadderBase({ ex }: { ex: ExerciseDef }) {
  const steps = ex.steps;
  const st = STATION[ex.id];
  const [completed, setCompleted] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlocked = completed.filter(Boolean).length + 1;
  const markDone = (i: number) => {
    setCompleted(prev => { const next = [...prev]; next[i] = true; return next; });
    const el = document.getElementById(`basic-step-${i + 1}`);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
  };
  return (
    <div>
      <GoldenPromptCard prompt={ex.goldenPrompt} borderRgb={st.borderRgb} />
      {steps.map((s, i) => (
        <div key={i} id={`basic-step-${i}`}>
          {i < unlocked ? (
            <>
              <TutorStepBasic step={s} glowRgb={st.glowRgb} borderRgb={st.borderRgb} />
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
              <TutorStepBasic step={s} glowRgb={st.glowRgb} borderRgb={st.borderRgb} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LadderMedium({ ex }: { ex: ExerciseDef }) {
  const st = STATION[ex.id];
  const [passed, setPassed] = useState<boolean[]>(Array(ex.steps.length).fill(false));
  return (
    <div style={{ borderRadius: 16, border: `1px solid rgba(${st.glowRgb},0.3)`, background: "rgba(255,255,255,0.75)", padding: "1.25rem" }}>
      <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
      <GoldenPromptCard prompt={ex.goldenPrompt} borderRgb={st.borderRgb} />
      <div style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "1px solid rgba(217,119,6,0.3)", padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#92400e" }}>
        💡 כאן תרגל לנסח פרומפטים בעצמך לכל שלב
      </div>
      {ex.steps.map((s, i) => (
        <TutorStepMedium key={i} step={s}
          locked={i > 0 && !passed[i - 1]}
          onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })}
          borderRgb={st.borderRgb} />
      ))}
    </div>
  );
}

function LadderAdvanced({ ex }: { ex: ExerciseDef }) {
  const steps = ex.steps;
  const [masterPassed, setMasterPassed] = useState(false);
  const [unlockedCount, setUnlockedCount] = useState(1);
  const allPassed = masterPassed && unlockedCount > steps.length;

  return (
    <div>
      <MasterPromptGate onPass={() => setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור"
        subjectWords={["אינטגרל", "שטח", "פרמטר", "ln", "לוגריתם", "גבולות", "הצבה"]} />
      {steps.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {(!masterPassed || i >= unlockedCount) ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.7)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{s.phase} — {s.label}</span>
              <span style={{ fontSize: 16 }}>🔒</span>
            </div>
          ) : (
            <div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(255,255,255,0.9)", padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{s.phase} — {s.label}</div>
                <div style={{ color: "#334155", fontSize: 13, lineHeight: 1.6 }}>{s.prompt}</div>
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

// ─── IntegralLab ─────────────────────────────────────────────────────────────

function IntegralLab() {
  const [a, setA] = useState(-2);
  const [b, setB] = useState(2);

  const integralValue = (b ** 3 - a ** 3) / 3;
  const area = Math.abs(integralValue);

  const xMin = -3.5, xMax = 3.5, yMin = -0.5, yMax = 10;
  const W = 320, H = 200;
  const toSX = (x: number) => 45 + ((x - xMin) / (xMax - xMin)) * 260;
  const toSY = (y: number) => 170 - ((y - yMin) / (yMax - yMin)) * 155;

  const curvePts: string[] = [];
  for (let i = 0; i <= 100; i++) { const x = xMin + (i / 100) * (xMax - xMin); const y = x * x; if (y <= yMax) curvePts.push(`${toSX(x).toFixed(1)},${toSY(y).toFixed(1)}`); }

  const lo = Math.min(a, b), hi = Math.max(a, b);
  const shadePts: string[] = [];
  for (let i = 0; i <= 60; i++) { const x = lo + (i / 60) * (hi - lo); shadePts.push(`${toSX(x).toFixed(1)},${toSY(x * x).toFixed(1)}`); }
  shadePts.push(`${toSX(hi).toFixed(1)},${toSY(0).toFixed(1)}`);
  shadePts.push(`${toSX(lo).toFixed(1)},${toSY(0).toFixed(1)}`);

  const negativeIntegral = a > b;
  const sigmaColor = negativeIntegral ? "#dc2626" : "#6366f1";
  const sigmaLabel = negativeIntegral ? "a > b: האינטגרל שלילי (היפוך גבולות)" : area < 1 ? "שטח קטן — הגבולות קרובים" : "שטח חיובי — נחשב כהפרש הערכים";

  return (
    <section style={{ borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", border: "1px solid rgba(60,54,42,0.15)", marginBottom: "2rem" }}>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: "#2D3436", textAlign: "center", marginBottom: 16 }}>מעבדה: אינטגרל מסוים של x²</h3>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto mb-4" aria-hidden>
        <line x1={42} y1={toSY(0)} x2={W - 5} y2={toSY(0)} stroke="#94a3b8" strokeWidth={1} />
        <line x1={45} y1={8} x2={45} y2={H - 5} stroke="#94a3b8" strokeWidth={1} />
        {lo < hi && <polygon points={shadePts.join(" ")} fill={negativeIntegral ? "rgba(239,68,68,0.2)" : "rgba(99,102,241,0.2)"} />}
        <line x1={toSX(a)} y1={toSY(a * a)} x2={toSX(a)} y2={toSY(0)} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4,2" />
        <line x1={toSX(b)} y1={toSY(b * b)} x2={toSX(b)} y2={toSY(0)} stroke="#34d399" strokeWidth={1.5} strokeDasharray="4,2" />
        <polyline points={curvePts.join(" ")} fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 12, marginBottom: 16 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 10, borderRadius: 3, background: "#a78bfa", opacity: 0.5, display: "inline-block" }} />
          <span style={{ color: "#7c3aed" }}>גבול a</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 10, borderRadius: 3, background: "#34d399", opacity: 0.5, display: "inline-block" }} />
          <span style={{ color: "#16a34a" }}>גבול b</span>
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: "0 8px", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
            <span>a (גבול תחתון)</span><span style={{ color: "#7c3aed", fontWeight: 700 }}>{a}</span>
          </div>
          <input type="range" min={-3} max={2} step={1} value={a} onChange={e => setA(Number(e.target.value))} style={{ width: "100%", accentColor: "#7c3aed" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
            <span>b (גבול עליון)</span><span style={{ color: "#16a34a", fontWeight: 700 }}>{b}</span>
          </div>
          <input type="range" min={0} max={3} step={1} value={b} onChange={e => setB(Number(e.target.value))} style={{ width: "100%", accentColor: "#16a34a" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center", fontSize: 12, marginBottom: 16 }}>
        {[
          { label: "גבול a", val: String(a), color: "#7c3aed" },
          { label: "גבול b", val: String(b), color: "#16a34a" },
          { label: "ערך האינטגרל", val: integralValue.toFixed(3), color: sigmaColor },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: "10px 8px" }}>
            <div style={{ color: "#64748b", marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 700, color, fontSize: 14 }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", fontSize: 13, color: sigmaColor, fontWeight: 600, padding: "8px 12px", borderRadius: 10, background: `${sigmaColor}11`, border: `1px solid ${sigmaColor}33` }}>
        {sigmaLabel}
      </div>
    </section>
  );
}

// ─── Exercises ───────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "שטח כלוא בין פולינום לציר x",
    problem: "נתונה הפונקציה f(x) = x² − 4.\n\nא. מצא את נקודות החיתוך של f עם ציר ה-x.\nב. חשב את האנטי-נגזרת (הפונקציה הקדומה) של f.\nג. חשב את האינטגרל המסוים בין נקודות החיתוך.\nד. הסבר מדוע יש לקחת ערך מוחלט ומצא את השטח הכלוא.",
    diagram: <AreaUnderCurveDiagram />,
    pitfalls: [
      { title: "⚠️ סימן שלילי", text: "כשהפונקציה מתחת לציר x, האינטגרל שלילי. שטח = |אינטגרל| — תמיד חיובי!" },
      { title: "גבולות = נקודות חיתוך", text: "גבולות האינטגרציה הם נקודות החיתוך עם ציר x. קודם פתרו f(x)=0." },
      { title: "אל תשכח +C", text: "באינטגרל לא מסוים תמיד מוסיפים +C. באינטגרל מסוים (עם גבולות) — אין C." },
    ],
    goldenPrompt: "אני תלמיד כיתה יב׳ ומצרף תרגיל על אינטגרל מסוים.\nנתונה f(x) = x² − 4. עליי למצוא שטח כלוא בין הפונקציה לציר x.\n\nאתה המורה שלי — אל תפתור עבורי. שאל אותי שאלות מכווינות בלבד.\n\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      { phase: "שלב א׳", label: "נקודות חיתוך עם ציר x", prompt: "נתונה f(x) = x² − 4. הנחה אותי למצוא את נקודות החיתוך עם ציר ה-x. הסבר למה פותרים f(x) = 0." },
      { phase: "שלב ב׳", label: "אנטי-נגזרת", prompt: "נתונה f(x) = x² − 4. הנחה אותי לחשב את האנטי-נגזרת F(x). הסבר את כלל האינטגרציה של חזקות." },
      { phase: "שלב ג׳", label: "חישוב האינטגרל המסוים", prompt: "נתונה f(x) = x² − 4. מצאתי את F(x) ואת הגבולות. הנחה אותי להציב ולחשב את האינטגרל המסוים." },
      { phase: "שלב ד׳", label: "ערך מוחלט ושטח", prompt: "נתונה f(x) = x² − 4. האינטגרל יצא שלילי. הנחה אותי להסביר מדוע ולמצוא את השטח הכלוא." },
    ],
  },
  {
    id: "medium",
    title: "שטח כלוא בין שתי פונקציות",
    problem: "נתונות הפונקציות f(x) = eˣ ו-g(x) = x + 1.\n\nא. קבע איזו פונקציה עליונה ואיזו תחתונה בתחום הנתון.\nב. כתוב את אינטגרל ההפרש (עליונה פחות תחתונה).\nג. חשב את האנטי-נגזרת של ההפרש.\nד. הצב את הגבולות וחשב את השטח הכלוא.",
    diagram: <AreaBetweenCurvesDiagram />,
    pitfalls: [
      { title: "⚠️ מי למעלה?", text: "תמיד בדקו מי הפונקציה העליונה על ידי הצבת נקודה בתחום. לא להניח!" },
      { title: "אנטי-נגזרת של eˣ", text: "האנטי-נגזרת של eˣ היא eˣ עצמה — אל תוסיפו מקדם." },
      { title: "חיסור לפני אינטגרציה", text: "∫(f−g)dx ≠ ∫f dx − ∫g dx רק אם מחשבים נכון. עדיף לחסר קודם ואז לבצע אינטגרציה." },
    ],
    goldenPrompt: "אני תלמיד כיתה יב׳ ומצרף תרגיל על שטח בין שתי פונקציות.\nf(x) = eˣ ו-g(x) = x + 1, שטח כלוא בתחום נתון.\n\nאתה המורה שלי — אל תפתור עבורי. שאל אותי שאלות מכווינות בלבד.\n\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      { phase: "שלב א׳", label: "זיהוי עליונה ותחתונה", contextWords: ["עליונה", "תחתונה", "f", "g", "eˣ", "הצבה", "תחום"] },
      { phase: "שלב ב׳", label: "כתיבת אינטגרל ההפרש", contextWords: ["הפרש", "אינטגרל", "f−g", "עליונה", "תחתונה", "גבולות"] },
      { phase: "שלב ג׳", label: "חישוב אנטי-נגזרת", contextWords: ["אנטי-נגזרת", "F(x)", "eˣ", "חזקות", "חישוב", "קדומה"] },
      { phase: "שלב ד׳", label: "הצבת גבולות ותשובה", contextWords: ["הצבה", "גבול", "F(b)", "F(a)", "חיסור", "שטח"] },
    ],
  },
  {
    id: "advanced",
    title: "אינטגרל מסוים עם פרמטר",
    problem: "נתונה הפונקציה f(x) = a/x, כאשר a פרמטר חיובי.\nידוע שהשטח הכלוא בין הגרף לציר x, בין x = 1 ל-x = e, שווה ל-5.\n\nא. רשום את האינטגרל המסוים שמבטא את השטח.\nב. חשב את האינטגרל באופן סימבולי (עם a).\nג. השתמש בנתון S = 5 כדי לבדד את a.\nד. אמת את התוצאה על ידי הצבה חזרה.",
    diagram: <ParameterIntegralDiagram />,
    pitfalls: [
      { title: "⚠️ a קבוע!", text: "a הוא מספר (פרמטר), לא משתנה. הוא יוצא מהאינטגרל כמקדם." },
      { title: "∫(1/x)dx = ln|x|", text: "זהו הכלל המיוחד: n = −1 לא נכנס לכלל החזקות. התוצאה היא לוגריתם!" },
      { title: "ln(e) = 1, ln(1) = 0", text: "ערכים קריטיים שחייבים לזכור — בלי זה ההצבה לא מפשטת." },
    ],
    goldenPrompt: "",
    subjectWords: ["אינטגרל", "שטח", "פרמטר", "ln", "לוגריתם", "a/x", "גבולות", "הצבה"],
    subjectHint: "אינטגרל / שטח / פרמטר / ln",
    steps: [
      { phase: "שלב א׳", label: "הגדרת האינטגרל", contextWords: ["אינטגרל", "גבולות", "שטח", "f(x)", "a/x", "מסוים"] },
      { phase: "שלב ב׳", label: "חישוב סימבולי", contextWords: ["ln", "אנטי-נגזרת", "a", "חישוב", "קדומה", "לוגריתם"] },
      { phase: "שלב ג׳", label: "בידוד הפרמטר a", contextWords: ["a", "בידוד", "משוואה", "שטח", "פרמטר", "פתרון"] },
      { phase: "שלב ד׳", label: "אימות", contextWords: ["אימות", "הצבה", "בדיקה", "תוצאה", "נכון", "שטח"] },
    ],
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function IntegralPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "22,163,74" : selectedLevel === "medium" ? "234,88,12" : "220,38,38";
  const st = STATION[selectedLevel];

  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb }}>
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>חשבון אינטגרלי עם AI</h1>
            <p style={{ color: "#64748b", fontSize: 13, margin: "3px 0 0" }}>אינטגרל מסוים, שטחים כלואים ופרמטרים</p>
          </div>
          <Link href="/topic/grade12/calculus"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.1)"; }}>
            <span style={{ fontSize: 16 }}>←</span>חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>

        {/* Progress */}
        <SubtopicProgress subtopicId="grade12/calculus/integral" />

        {/* Tab selector */}
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

        {/* FormulaBar — before exercise */}
        <FormulaBar />

        {/* Exercise section */}
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
        <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", boxShadow: st.glowShadow, marginBottom: "2rem" }}>

          {/* Badge + title */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
            <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${st.badgeCls}`}>{st.badge}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#2D3436" }}>{st.stationName}</span>
          </div>
          <div style={{ height: 1, background: "rgba(60,54,42,0.15)", marginBottom: "2rem" }} />

          {/* Diagram */}
          <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
            {ex.diagram}
          </div>

          {/* Problem */}
          <div style={{ borderRadius: 16, border: `1px solid rgba(${st.borderRgb},0.35)`, background: "rgba(255,255,255,0.6)", padding: "1.5rem", marginBottom: "2rem" }}>
            <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 12 }}>&#128221; השאלה</div>
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

          {/* Ladder */}
          <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.7)", padding: "1.25rem", boxShadow: st.glowShadow }}>
            <div style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>&#129504; מדריך הפרומפטים</div>
            {selectedLevel === "basic"    && <LadderBase     ex={ex} />}
            {selectedLevel === "medium"   && <LadderMedium   ex={ex} />}
          </div>
          {selectedLevel === "advanced" && <LadderAdvanced  ex={ex} />}
        </section>
        </motion.div>

        {/* Lab */}
        <IntegralLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="grade12/calculus/integral" level={selectedLevel} />
        </div>
      </div>
    </main>
  );
}
