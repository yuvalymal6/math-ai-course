"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle, Lock } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import LabMessage from "@/app/components/LabMessage";
import { useDefaultToast } from "@/app/lib/useDefaultToast";
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

const TABS: { id: "basic" | "medium" | "advanced"; label: string }[] = [
  { id: "basic",    label: "תחנה א׳ — מתחיל" },
  { id: "medium",   label: "תחנה ב׳ — בינוני" },
  { id: "advanced", label: "תחנה ג׳ — מתקדם" },
];

// ─── FormulaBar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"growth" | "decay" | "halflife" | "log" | null>(null);

  const tabs = [
    { id: "growth" as const,   label: "גדילה מעריכית", tex: "M_0 \\cdot q^t",               color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "decay" as const,    label: "דעיכה",          tex: "M_0 \\cdot q^t",               color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "halflife" as const, label: "חצי חיים",       tex: "T_{1/2}",                      color: "#7C3AED", borderColor: "rgba(124,58,237,0.35)" },
    { id: "log" as const,      label: "לוגריתם",        tex: "\\log_a b",                    color: "#3b82f6", borderColor: "rgba(59,130,246,0.35)" },
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

      {activeTab === "growth" && (
        <motion.div key="growth" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: 16 }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"M(t) = M_0 \\cdot q^t \\quad (q > 1)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> כאשר q &gt; 1, הכמות גדלה באופן מעריכי.
                <ul dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"M_0"}</InlineMath> — כמות התחלתית.</li>
                  <li><InlineMath>{"q = 1 + r"}</InlineMath> כאשר r הוא קצב הגדילה (באחוזים חלקי 100).</li>
                  <li>גדילה של 20% פירושה <InlineMath>{"q = 1.2"}</InlineMath>.</li>
                </ul>
              </div>
              <div style={{ marginTop: 10, color: "#16a34a", fontSize: 11, fontWeight: 600 }}>
                &#128161; דוגמה: אם <InlineMath>{"M_0 = 500"}</InlineMath> וגדילה 10%, אז <InlineMath>{"M(t) = 500 \\cdot 1.1^t"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "decay" && (
        <motion.div key="decay" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: 16 }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"M(t) = M_0 \\cdot q^t \\quad (0 < q < 1)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> כאשר 0 &lt; q &lt; 1, הכמות דועכת (קטנה) באופן מעריכי.
                <ul dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>דעיכה של 30% פירושה <InlineMath>{"q = 0.7"}</InlineMath>.</li>
                  <li>הגרף יורד אבל לעולם לא מגיע ל-0.</li>
                </ul>
              </div>
              <div style={{ marginTop: 10, color: "#EA580C", fontSize: 11, fontWeight: 600 }}>
                &#128161; שימו לב: דעיכה רדיואקטיבית משתמשת ב-<InlineMath>{"q = 0.5"}</InlineMath> (חצי בכל מחזור).
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "halflife" && (
        <motion.div key="halflife" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: 16 }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"T_{1/2} = \\frac{\\ln 2}{|k|} \\qquad M(t) = M_0 \\cdot \\left(\\frac{1}{2}\\right)^{t/T}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> חצי חיים T הוא הזמן שבו הכמות יורדת לחצי.
                <ul dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>אחרי T אחד: נשאר 50%. אחרי 2T: נשאר 25%. אחרי 3T: נשאר 12.5%.</li>
                  <li>שימושי בפיזיקה, כימיה ורפואה.</li>
                </ul>
              </div>
              <div style={{ marginTop: 10, color: "#7C3AED", fontSize: 11, fontWeight: 600 }}>
                &#128161; טריק: אם נשאר <InlineMath>{"\\frac{1}{2^n}"}</InlineMath> מהכמות, עברו בדיוק <InlineMath>{"n"}</InlineMath> חצייי חיים.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "log" && (
        <motion.div key="log" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(59,130,246,0.25)", background: "rgba(59,130,246,0.06)", padding: 16 }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"a^x = b \\;\\Longrightarrow\\; x = \\frac{\\ln b}{\\ln a} = \\log_a b"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> לוגריתם הוא הפעולה ההפוכה לחזקה — משמש לבידוד המעריך.
                <ul dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>כלל מכפלה: <InlineMath>{"\\log(ab) = \\log a + \\log b"}</InlineMath></li>
                  <li>כלל חזקה: <InlineMath>{"\\log(a^n) = n \\cdot \\log a"}</InlineMath></li>
                  <li>שינוי בסיס: <InlineMath>{"\\log_a b = \\frac{\\ln b}{\\ln a}"}</InlineMath></li>
                </ul>
              </div>
              <div style={{ marginTop: 10, color: "#3b82f6", fontSize: 11, fontWeight: 600 }}>
                &#128161; כדי לפתור <InlineMath>{"q^t = k"}</InlineMath>, מפעילים <InlineMath>{"\\ln"}</InlineMath> על שני האגפים ומבודדים את t.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Silent SVG Diagrams ─────────────────────────────────────────────────────

function GrowthCurveDiagram() {
  return (
    <svg viewBox="0 0 220 140" className="w-full max-w-[220px] mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={30} y1={120} x2={200} y2={120} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={10} x2={30} y2={120} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={205} y={123} fontSize={9} fill="#94a3b8">t</text>
      <text x={27} y={8} fontSize={9} fill="#94a3b8" textAnchor="end">M</text>
      {/* Growth curve */}
      <path d="M35,110 C60,108 100,95 130,70 Q160,40 190,15" fill="none" stroke="#34d399" strokeWidth={2.5} strokeLinecap="round" />
      {/* M0 dot */}
      <circle cx={35} cy={110} r={4} fill="#34d399" />
      <text x={44} y={108} fontSize={9} fill="#34d399" fontWeight={600}>M&#x2080;</text>
      {/* Generic dashed marker */}
      <line x1={120} y1={120} x2={120} y2={78} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2" />
      <line x1={30} y1={78} x2={120} y2={78} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2" />
      <text x={120} y={132} textAnchor="middle" fontSize={9} fill="#f59e0b">t</text>
      <text x={22} y={81} textAnchor="end" fontSize={8} fill="#f59e0b">M(t)</text>
    </svg>
  );
}

function DecayCurveDiagram() {
  return (
    <svg viewBox="0 0 220 140" className="w-full max-w-[220px] mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={30} y1={120} x2={200} y2={120} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={10} x2={30} y2={120} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={205} y={123} fontSize={9} fill="#94a3b8">t</text>
      <text x={27} y={8} fontSize={9} fill="#94a3b8" textAnchor="end">M</text>
      {/* Decay curve */}
      <path d="M35,18 C60,30 100,70 140,95 Q170,108 195,114" fill="none" stroke="#fb7185" strokeWidth={2.5} strokeLinecap="round" />
      {/* M0 dot */}
      <circle cx={35} cy={18} r={4} fill="#fb7185" />
      <text x={44} y={22} fontSize={9} fill="#fb7185" fontWeight={600}>M&#x2080;</text>
      {/* Half-life marker */}
      <line x1={85} y1={120} x2={85} y2={65} stroke="#a78bfa" strokeWidth={1} strokeDasharray="3,2" />
      <line x1={30} y1={65} x2={85} y2={65} stroke="#a78bfa" strokeWidth={1} strokeDasharray="3,2" />
      <text x={85} y={132} textAnchor="middle" fontSize={8} fill="#a78bfa">T</text>
      <text x={22} y={68} textAnchor="end" fontSize={8} fill="#a78bfa">M&#x2080;/2</text>
    </svg>
  );
}

function TwoCurvesCrossingDiagram() {
  return (
    <svg viewBox="0 0 220 140" className="w-full max-w-[220px] mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={30} y1={120} x2={200} y2={120} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={10} x2={30} y2={120} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={205} y={123} fontSize={9} fill="#94a3b8">t</text>
      <text x={27} y={8} fontSize={9} fill="#94a3b8" textAnchor="end">M</text>
      {/* Plan A — shallower (emerald) */}
      <path d="M35,95 C70,90 120,75 160,55 Q180,44 195,35" fill="none" stroke="#34d399" strokeWidth={2} strokeLinecap="round" />
      <text x={198} y={38} fontSize={9} fill="#34d399" fontWeight={600}>A</text>
      {/* Plan B — steeper (violet) */}
      <path d="M35,108 C70,100 110,75 145,45 Q170,22 195,12" fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" />
      <text x={198} y={15} fontSize={9} fill="#a78bfa" fontWeight={600}>B</text>
      {/* 2A dashed line (amber) */}
      <path d="M35,72 C70,66 120,48 160,25" fill="none" stroke="#f59e0b" strokeWidth={1} strokeDasharray="4,3" />
      <text x={163} y={20} fontSize={8} fill="#f59e0b">2A</text>
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
        {done && <CheckCircle size={14} color="#34d399" style={{ marginRight: "auto" }} />}
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
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
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
      <MasterPromptGate
        onPass={() => setMasterPassed(true)}
        accentColor="#991b1b"
        accentRgb="153,27,27"
        requiredPhrase="סרוק נתונים ועצור"
        subjectWords={ex.subjectWords}
        subjectHint={ex.subjectHint}
      />
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

// ─── ExponentialGrowthLab (light theme) ─────────────────────────────────────

function ExponentialGrowthLab() {
  const [M0, setM0] = useState(1000);
  const [Q, setQ] = useState(12); // stored as x10 integer, e.g. 12 = 1.2

  const q = Q / 10;

  // Compute M(t) for t = 0..10
  const points: [number, number][] = Array.from({ length: 11 }, (_, t) => [t, M0 * Math.pow(q, t)]);

  // Canvas area
  const maxM = Math.max(...points.map(p => p[1]), 1);
  const toX = (t: number) => 40 + (t / 10) * 240;
  const toY = (m: number) => 160 - Math.min((m / maxM) * 140, 140);

  const polyline = points.map(([t, m]) => `${toX(t)},${toY(m)}`).join(" ");

  const curveColor = q >= 1 ? "#16a34a" : "#dc2626";

  // Half-life / doubling time
  const infoLabel = q >= 1 ? "זמן כפלה (t₂)" : "חצי חיים (t½)";
  const infoVal = q === 1 ? "∞" : (Math.log(q >= 1 ? 2 : 0.5) / Math.log(q)).toFixed(2) + " יח׳";

  return (
    <section style={{ borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", border: "1px solid rgba(60,54,42,0.15)", marginBottom: "2rem" }}>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: "#2D3436", textAlign: "center", marginBottom: 4 }}>מעבדה: גדילה ודעיכה מעריכית</h3>
      <p style={{ color: "#64748b", fontSize: 12, textAlign: "center", marginBottom: "1.25rem" }}>M(t) = M₀ · q<sup>t</sup> — הגרף מתעדכן בזמן אמת</p>

      {/* Sliders */}
      <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: "1.25rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
            <span>כמות התחלתית M₀</span>
            <span style={{ color: "#2D3436", fontWeight: 700, fontFamily: "monospace" }}>{M0}</span>
          </div>
          <input type="range" min={100} max={2000} step={100} value={M0}
            onChange={e => setM0(+e.target.value)}
            style={{ display: "block", width: "100%", accentColor: "#6366f1" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
            <span>מכפיל בסיסי q</span>
            <span style={{ color: curveColor, fontWeight: 700, fontFamily: "monospace" }}>
              {q.toFixed(1)} {q > 1 ? "⬆ גדילה" : q < 1 ? "⬇ דעיכה" : "= יציב"}
            </span>
          </div>
          <input type="range" min={5} max={20} step={1} value={Q}
            onChange={e => setQ(+e.target.value)}
            style={{ display: "block", width: "100%", accentColor: curveColor }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
            <span>q = 0.5</span><span>q = 1.0</span><span>q = 2.0</span>
          </div>
        </div>
      </div>

      {/* Graph */}
      <svg viewBox="0 0 320 180" className="w-full max-w-sm mx-auto mb-4" aria-hidden>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={40} y1={160 - f * 140} x2={280} y2={160 - f * 140}
            stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3,3" />
        ))}
        {[2, 4, 6, 8, 10].map(t => (
          <line key={t} x1={toX(t)} y1={20} x2={toX(t)} y2={160}
            stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3,3" />
        ))}
        {/* Axes */}
        <line x1={40} y1={160} x2={284} y2={160} stroke="#94a3b8" strokeWidth={1.5} />
        <line x1={40} y1={160} x2={40} y2={16} stroke="#94a3b8" strokeWidth={1.5} />
        <text x={288} y={163} fill="#64748b" fontSize={9}>t</text>
        <text x={40} y={12} fill="#64748b" fontSize={9} textAnchor="middle">M</text>
        {/* Tick labels */}
        {[2, 4, 6, 8, 10].map(t => (
          <text key={t} x={toX(t)} y={172} fill="#64748b" fontSize={8} textAnchor="middle">{t}</text>
        ))}
        {/* Curve */}
        <polyline points={polyline} fill="none" stroke={curveColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* M0 dot */}
        <circle cx={40} cy={toY(M0)} r={4} fill={curveColor} />
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 12, marginBottom: 16 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 10, borderRadius: 3, background: curveColor, opacity: 0.5, display: "inline-block" }} />
          <span style={{ color: curveColor }}>{q >= 1 ? "גדילה" : "דעיכה"}</span>
        </span>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center", fontSize: 12, marginBottom: 16 }}>
        {[
          { label: "כמות ב-t=5",  val: (M0 * Math.pow(q, 5)).toFixed(1),  color: curveColor },
          { label: "כמות ב-t=10", val: (M0 * Math.pow(q, 10)).toFixed(1), color: curveColor },
          { label: infoLabel,       val: infoVal,                            color: "#7c3aed"  },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: "10px 8px" }}>
            <div style={{ color: "#64748b", marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 700, color, fontSize: 14 }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", fontSize: 13, color: curveColor, fontWeight: 600, padding: "8px 12px", borderRadius: 10, background: `${curveColor}11`, border: `1px solid ${curveColor}33` }}>
        {q > 1 ? "גדילה מעריכית — הכמות מכפילה את עצמה" : q < 1 ? "דעיכה מעריכית — הכמות הולכת ופוחתת" : "ערך יציב — q = 1, ללא שינוי"}
      </div>
    </section>
  );
}

// ─── Exercises ───────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "גדילה מעריכית — חיידקים",
    problem: "מושבת חיידקים מתחילה בכמות התחלתית ומתרבה בקצב קבוע בכל שעה.\n\nא. כתוב נוסחה כללית M(t) לכמות החיידקים אחרי t שעות.\nב. חשב את M(5) — כמות החיידקים אחרי 5 שעות.\nג. מצא אחרי כמה שעות יהיו 5,000 חיידקים.\nד. הסבר מדוע הגדילה מואצת — מה קורה לקצב הגידול לאורך זמן.",
    diagram: <GrowthCurveDiagram />,
    pitfalls: [
      { title: "⚠️ q ≠ האחוז", text: "גידול של 20% פירושו q = 1.20, לא q = 0.20. תמיד מוסיפים 1 לשיעור הגדילה!" },
      { title: "יחידות זמן", text: "t חייב להיות באותן יחידות כמו המחזור. אם הגדילה לשעה — t בשעות." },
      { title: "לוגריתם לבידוד t", text: "כדי למצוא 'מתי' — צריך להפעיל לוגריתם על שני האגפים ולבודד את t." },
    ],
    goldenPrompt: "אני תלמיד כיתה יב׳ ופותר תרגיל על גדילה מעריכית של חיידקים.\nמושבת חיידקים מתחילה בכמות התחלתית ומתרבה בקצב קבוע בכל שעה.\n\nאתה המורה שלי — אל תפתור עבורי. שאל אותי שאלות מכווינות בלבד.\n\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      { phase: "שלב א׳", label: "כתיבת הנוסחה הכללית M(t)", prompt: "אני רוצה לכתוב נוסחה לגדילה מעריכית M(t) = M₀ · q^t.\nעזור לי להבין מה כל רכיב בנוסחה מייצג — מהו M₀, מהו q, ומהו t.\nאל תפתור — רק הנחה אותי." },
      { phase: "שלב ב׳", label: "חישוב M(5)", prompt: "מצאתי את הנוסחה הכללית. עכשיו אני רוצה להציב t ולחשב.\nהנחה אותי בשלבי ההצבה והחישוב.\nאל תגיד לי את התוצאה — רק תוודא שאני מציב נכון." },
      { phase: "שלב ג׳", label: "מציאת t כאשר M(t) = 5000", prompt: "אני רוצה למצוא מתי הכמות מגיעה לערך מסוים.\nהנחה אותי לרשום משוואה ולהשתמש בלוגריתמים כדי לבודד את t.\nאל תפתור — רק הסבר את השלבים." },
      { phase: "שלב ד׳", label: "הסבר מדוע הגדילה מואצת", prompt: "עכשיו אני רוצה להבין למה הגדילה המעריכית מואצת.\nהנחה אותי לחשוב על מה קורה לתוספת בכל שעה — האם היא קבועה או משתנה?\nאל תפתור — שאל שאלות מנחות." },
    ],
  },
  {
    id: "medium",
    title: "דעיכה רדיואקטיבית — חצי חיים",
    problem: "חומר רדיואקטיבי דועך לפי הנוסחה M(t) = M₀ · (0.5)^(t/T).\nידוע שאחרי פרק זמן מסוים נשאר אחוז ידוע מהחומר המקורי.\n\nא. הסבר מה המשמעות של חצי חיים T.\nב. רשום משוואה המבטאת את הנתון הידוע.\nג. פתור ומצא את T — חצי החיים של החומר.\nד. חשב כמה חומר יישאר אחרי פרק זמן נוסף.",
    diagram: <DecayCurveDiagram />,
    pitfalls: [
      { title: "⚠️ 12.5% = 1/8", text: "יש לתרגם אחוזים לשבר עשרוני — 12.5% = 0.125 = (1/2)³. זה בדיוק 3 חצייי חיים!" },
      { title: "חצי חיים ≠ חצי מהזמן", text: "T הוא הזמן לחצי מהכמות, לא חצי מהזמן הכולל. אל תבלבלו!" },
      { title: "בסיס 0.5 בלבד", text: "הנוסחה M₀·(0.5)^(t/T) עובדת רק עם בסיס חצי. אם q שונה — חשבו בהתאם." },
    ],
    goldenPrompt: "אני תלמיד כיתה יב׳ ופותר תרגיל על דעיכה רדיואקטיבית עם חצי חיים.\nחומר רדיואקטיבי דועך לפי M(t) = M₀ · (0.5)^(t/T), ויש לי נתון על כמה חומר נשאר.\n\nאתה המורה שלי — אל תפתור עבורי. שאל אותי שאלות מכווינות בלבד.\n\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      { phase: "שלב א׳", label: "הסבר חצי חיים T", contextWords: ["חצי", "חיים", "זמן", "כמות", "מחצית", "T", "דעיכה"] },
      { phase: "שלב ב׳", label: "רישום המשוואה", contextWords: ["משוואה", "M₀", "0.5", "חזקה", "אחוז", "נתון", "t/T"] },
      { phase: "שלב ג׳", label: "פתרון ומציאת T", contextWords: ["לוגריתם", "פתרון", "T", "חצי", "חיים", "בידוד", "חישוב"] },
      { phase: "שלב ד׳", label: "חישוב כמות שנשארה", contextWords: ["הצבה", "חישוב", "כמות", "זמן", "נשאר", "M(t)", "תוצאה"] },
    ],
  },
  {
    id: "advanced",
    title: "השוואת תוכניות חיסכון",
    problem: "שתי תוכניות חיסכון עם ריביות שונות.\nתוכנית A: סכום התחלתי גבוה, ריבית נמוכה יותר.\nתוכנית B: סכום התחלתי נמוך, ריבית גבוהה יותר.\n\nא. כתוב נוסחה לכל תוכנית: A(t) ו-B(t).\nב. מצא מתי B(t) = 2·A(t).\nג. פשט את המשוואה עם לוגריתמים.\nד. מצא את t ופרש את התוצאה.",
    diagram: <TwoCurvesCrossingDiagram />,
    pitfalls: [
      { title: "⚠️ ריבית = מכפיל", text: "ריבית r% לשנה פירושה q = 1 + r/100. לדוגמה: 6% → q = 1.06." },
      { title: "חילוק לפני לוגריתם", text: "כדי לפתור B(t) = 2A(t), חלקו את שני האגפים ברכיב משותף וקבלו ביטוי פשוט יותר." },
      { title: "כיוון אי-השוויון", text: "כשעוברים מחזקות ללוגריתמים, שימו לב לכיוון — ln של בסיס קטן מ-1 הוא שלילי!" },
    ],
    goldenPrompt: "",
    subjectWords: ["גדילה", "ריבית", "תוכנית", "חיסכון", "לוגריתם", "A(t)", "B(t)", "השוואה"],
    subjectHint: "גדילה / ריבית / תוכנית / לוגריתם",
    steps: [
      { phase: "שלב א׳", label: "כתיבת הנוסחאות A(t) ו-B(t)", prompt: "כתוב נוסחה לכל תוכנית חיסכון: A(t) ו-B(t), כאשר t הוא מספר השנים. זכור שריבית דריבית משמעה הכפלה בכל שנה." },
      { phase: "שלב ב׳", label: "רישום המשוואה B(t) = 2·A(t)", prompt: "רשום את המשוואה שצריך לפתור כדי למצוא מתי B(t) שווה בדיוק לפי 2 מ-A(t). נסה לפשט על ידי חילוק." },
      { phase: "שלב ג׳", label: "פישוט עם לוגריתמים", prompt: "הפעל לוגריתם טבעי (ln) על שני האגפים ובודד את t באמצעות חוקי הלוגריתמים." },
      { phase: "שלב ד׳", label: "מציאת t ופירוש", prompt: "חשב את הערך המספרי של t ופרש את התוצאה — האם התשובה הגיונית? מה המשמעות הכלכלית?" },
    ],
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function GrowthAndDecayPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "163,79,38" : "139,38,53";
  const st = STATION[selectedLevel];

  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb }}>
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>גדילה ודעיכה עם AI</h1>
            <p style={{ color: "#64748b", fontSize: 13, margin: "3px 0 0" }}>מודלים מעריכיים, חצי חיים וריבית דריבית</p>
          </div>
          <Link href="/topic/grade12"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}>
            <span style={{ fontSize: 16 }}>←</span>חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>

        {/* Progress */}
        <SubtopicProgress subtopicId="grade12/growth-decay" />

        {/* Tab selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
          {TABS.map(tab => {
            const s = STATION[tab.id];
            const active = selectedLevel === tab.id;
            return (
              <button key={tab.id} onClick={() => setSelectedLevel(tab.id)}
                style={{ flex: 1, padding: "10px 8px", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 13,
                  border: "2px solid", borderColor: active ? s.accentColor : "rgba(100,116,139,0.2)",
                  background: active ? `rgba(${s.glowRgb},0.1)` : "rgba(255,255,255,0.6)",
                  color: active ? s.accentColor : "#64748b", boxShadow: active ? s.glowShadow : "none", transition: "all 0.2s" }}>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Exercise section */}
        <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", boxShadow: st.glowShadow, marginBottom: "2rem" }}>

          {/* Badge + title */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${st.badgeCls}`}>{st.badge}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#1A1A1A" }}>{ex.title}</span>
          </div>

          {/* FormulaBar */}
          <FormulaBar />

          {/* Diagram */}
          <div style={{ borderRadius: 16, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: 12, marginBottom: "1.5rem" }}>
            {ex.diagram}
          </div>

          {/* Problem */}
          <div style={{ borderRadius: 16, border: `1px solid rgba(${st.borderRgb},0.35)`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", marginBottom: "1.25rem" }}>
            <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 12 }}>📝 השאלה</div>
            <pre style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
          </div>

          {/* Pitfalls */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>⚠️ שגיאות נפוצות</div>
            {ex.pitfalls.map((p, i) => (
              <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", padding: "0.85rem 1rem", marginBottom: 8 }}>
                <div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
                {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
              </div>
            ))}
          </div>

          {/* Ladder */}
          {selectedLevel === "basic"    && <LadderBase     ex={ex} />}
          {selectedLevel === "medium"   && <LadderMedium   ex={ex} />}
          {selectedLevel === "advanced" && <LadderAdvanced  ex={ex} />}
        </section>

        {/* Lab */}
        <ExponentialGrowthLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="/grade12/growth-decay" level={selectedLevel} />
        </div>
      </div>
    </main>
  );
}
