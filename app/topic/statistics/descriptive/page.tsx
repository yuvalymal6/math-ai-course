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

// ─── Global style ─────────────────────────────────────────────────────────────

const GLOBAL_CSS = `*:focus{outline:none!important;box-shadow:none!important;}`;

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
  prompt?: string;
  contextWords?: string[];
};

type ExerciseDef = {
  id: "basic" | "medium" | "advanced";
  problem: string;
  diagram: React.ReactNode;
  pitfalls: { title: string; text: string }[];
  goldenPrompt: string;
  steps: PromptStep[];
};

// ─── Station config ───────────────────────────────────────────────────────────

const STATION = {
  basic: {
    stationName: "תחנה ראשונה", badge: "מתחיל",
    badgeCls: "bg-green-600 text-white", accentCls: "text-green-700",
    glowBorder: "rgba(22,163,74,0.35)", glowShadow: "0 4px 16px rgba(22,163,74,0.12)",
    glowRgb: "22,163,74", accentColor: "#16A34A", borderRgb: "45,90,39",
  },
  medium: {
    stationName: "תחנה שנייה", badge: "בינוני",
    badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700",
    glowBorder: "rgba(234,88,12,0.35)", glowShadow: "0 4px 16px rgba(234,88,12,0.12)",
    glowRgb: "234,88,12", accentColor: "#EA580C", borderRgb: "163,79,38",
  },
  advanced: {
    stationName: "תחנה שלישית", badge: "מתקדם",
    badgeCls: "bg-red-700 text-white", accentCls: "text-red-700",
    glowBorder: "rgba(220,38,38,0.35)", glowShadow: "0 4px 16px rgba(220,38,38,0.12)",
    glowRgb: "220,38,38", accentColor: "#DC2626", borderRgb: "139,38,53",
  },
} as const;

const TABS: { id: "basic" | "medium" | "advanced"; label: string }[] = [
  { id: "basic",    label: "תחנה א׳ — מתחיל" },
  { id: "medium",   label: "תחנה ב׳ — בינוני" },
  { id: "advanced", label: "תחנה ג׳ — מתקדם" },
];

// ─── Silent SVG Diagrams ─────────────────────────────────────────────────────

function BarChartDiagram() {
  const heights = [30, 55, 70, 45, 85, 60, 40];
  const colors = ["#f59e0b", "#34d399", "#3b82f6", "#a78bfa", "#fb7185", "#f59e0b", "#34d399"];
  return (
    <svg viewBox="0 0 200 140" className="w-full max-w-[210px] mx-auto" aria-hidden>
      {/* axes */}
      <line x1={30} y1={10} x2={30} y2={110} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={110} x2={190} y2={110} stroke="#94a3b8" strokeWidth={1.2} />
      {/* bars */}
      {heights.map((h, i) => (
        <rect key={i} x={36 + i * 22} y={110 - h} width={16} height={h} rx={3} fill={colors[i]} fillOpacity={0.7} />
      ))}
      {/* axis labels */}
      <text x={110} y={130} textAnchor="middle" fontSize={10} fill="#64748b" fontFamily="inherit">ציון</text>
      <text x={14} y={65} textAnchor="middle" fontSize={10} fill="#64748b" fontFamily="inherit" transform="rotate(-90,14,65)">שכיחות</text>
    </svg>
  );
}

function BellCurvesDiagram() {
  return (
    <svg viewBox="0 0 220 120" className="w-full max-w-[220px] mx-auto" aria-hidden>
      {/* x axis */}
      <line x1={20} y1={100} x2={200} y2={100} stroke="#94a3b8" strokeWidth={1} />
      {/* narrow bell - class 1 */}
      <path d="M70,100 Q80,98 90,85 Q100,40 110,25 Q120,40 130,85 Q140,98 150,100" fill="none" stroke="#3b82f6" strokeWidth={2.5} />
      {/* wide bell - class 2 */}
      <path d="M40,100 Q55,96 70,88 Q85,65 100,55 Q110,50 110,50 Q120,55 135,65 Q150,88 165,96 Q180,100 180,100" fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="6 3" />
      {/* labels */}
      <text x={110} y={18} textAnchor="middle" fontSize={9} fill="#3b82f6" fontWeight={700}>יא׳1</text>
      <text x={170} y={50} textAnchor="middle" fontSize={9} fill="#b45309" fontWeight={700}>יא׳2</text>
    </svg>
  );
}

function TransformDiagram() {
  return (
    <svg viewBox="0 0 220 90" className="w-full max-w-[220px] mx-auto" aria-hidden>
      {/* number line */}
      <line x1={20} y1={45} x2={200} y2={45} stroke="#94a3b8" strokeWidth={1.5} />
      {/* dots cluster */}
      {[60, 75, 85, 95, 110].map((x, i) => (
        <circle key={i} cx={x} cy={45} r={4} fill="#3b82f6" fillOpacity={0.7} />
      ))}
      {/* +b arrow (shift) */}
      <path d="M85,30 L120,30" fill="none" stroke="#34d399" strokeWidth={2} markerEnd="url(#arrowG)" />
      <text x={103} y={24} textAnchor="middle" fontSize={10} fill="#34d399" fontWeight={700}>+b</text>
      {/* x a bracket (scale) */}
      <line x1={60} y1={60} x2={60} y2={68} stroke="#a78bfa" strokeWidth={1.5} />
      <line x1={60} y1={68} x2={110} y2={68} stroke="#a78bfa" strokeWidth={1.5} />
      <line x1={110} y1={60} x2={110} y2={68} stroke="#a78bfa" strokeWidth={1.5} />
      <text x={85} y={80} textAnchor="middle" fontSize={10} fill="#a78bfa" fontWeight={700}>{"\u00D7a"}</text>
      {/* arrow marker */}
      <defs>
        <marker id="arrowG" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="#34d399" />
        </marker>
      </defs>
    </svg>
  );
}

// ─── CopyBtn ──────────────────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט", accentRgb }: { text: string; label?: string; accentRgb: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.8)", border: `1.5px solid rgba(${accentRgb},0.4)`, color: `rgb(${accentRgb})`, fontSize: 12, fontWeight: 600, transition: "all 0.2s" }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "הועתק!" : label}
    </button>
  );
}

// ─── GoldenPromptCard ─────────────────────────────────────────────────────────

function GoldenPromptCard({ prompt, accentColor, accentRgb }: { prompt: string; accentColor: string; accentRgb: string }) {
  return (
    <div style={{ borderRadius: 16, border: `1.5px solid rgba(${accentRgb},0.4)`, background: `rgba(${accentRgb},0.06)`, padding: "1.2rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>✨</span>
        <span style={{ color: accentColor, fontWeight: 700, fontSize: 13 }}>פרומפט ראשי — העתק לAI שלך</span>
      </div>
      <div style={{ borderRadius: 10, border: "1px solid rgba(100,116,139,0.25)", background: "rgba(255,255,255,0.75)", padding: "10px 14px", fontSize: 12, color: "#1e293b", fontFamily: "monospace", lineHeight: 1.65, marginBottom: 10, direction: "rtl" }}>
        {prompt}
      </div>
      <CopyBtn text={prompt} label="העתק פרומפט מלא" accentRgb={accentRgb} />
    </div>
  );
}

// ─── TutorStepBasic ───────────────────────────────────────────────────────────

function TutorStepBasic({ step, index, accentColor, accentRgb }: { step: PromptStep; index: number; accentColor: string; accentRgb: string }) {
  const [done, setDone] = useState(false);
  return (
    <div style={{ borderRadius: 16, border: `1px solid rgba(${accentRgb},0.25)`, background: done ? `rgba(${accentRgb},0.06)` : "rgba(255,255,255,0.7)", padding: "1rem 1.2rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: done ? accentColor : `rgba(${accentRgb},0.1)`, border: `1.5px solid rgba(${accentRgb},0.4)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: done ? "#fff" : accentColor, fontWeight: 700 }}>
          {done ? <Check size={13} /> : index + 1}
        </span>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{step.label}</span>
      </div>
      {step.prompt && (
        <div style={{ borderRadius: 10, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.8)", padding: "10px 14px", fontSize: 12, color: "#334155", fontFamily: "monospace", lineHeight: 1.65, direction: "rtl", marginBottom: 10 }}>
          {step.prompt}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {step.prompt && <CopyBtn text={step.prompt} label="העתק לצ׳אט" accentRgb={accentRgb} />}
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: accentColor, fontWeight: 600 }}>
          <input type="checkbox" checked={done} onChange={e => setDone(e.target.checked)} style={{ width: 15, height: 15, accentColor } as React.CSSProperties} />
          סיימתי עם AI ✓
        </label>
      </div>
    </div>
  );
}

// ─── TutorStepMedium ──────────────────────────────────────────────────────────

function TutorStepMedium({ step, index, accentColor, accentRgb, locked, onPass }: {
  step: PromptStep; index: number; accentColor: string; accentRgb: string; locked: boolean; onPass: () => void;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const passed = result !== null && !result.blocked && result.score >= 75;

  if (locked) {
    return (
      <div style={{ borderRadius: 16, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.4)", padding: "1rem 1.2rem", opacity: 0.5, display: "flex", alignItems: "center", gap: 10 }}>
        <Lock size={15} color="#94a3b8" />
        <span style={{ fontSize: 13, color: "#64748b" }}>{step.label}</span>
      </div>
    );
  }

  const validate = () => {
    const r = calculatePromptScore(text, step.contextWords ?? []);
    setResult(r);
    if (!r.blocked && r.score >= 75) onPass();
  };

  const scoreColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div style={{ borderRadius: 16, padding: "1rem 1.2rem", border: passed ? "1.5px solid #16a34a" : `1px solid rgba(${accentRgb},0.3)`, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.7)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        {passed
          ? <CheckCircle2 size={20} color="#16a34a" style={{ flexShrink: 0 }} />
          : <span style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: `rgba(${accentRgb},0.1)`, border: `1.5px solid rgba(${accentRgb},0.4)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: accentColor, fontWeight: 700 }}>{index + 1}</span>
        }
        <span style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{step.label}</span>
      </div>
      {!passed && (
        <>
          <textarea value={text} onChange={e => { setText(e.target.value); setResult(null); }} rows={3} dir="rtl"
            placeholder="נסח כאן את הפרומפט שתשלח ל-AI..."
            style={{ width: "100%", borderRadius: 10, resize: "none", boxSizing: "border-box", border: `1.5px solid rgba(${accentRgb},0.3)`, background: "rgba(255,255,255,0.85)", fontSize: 13, color: "#1e293b", padding: "10px 12px", lineHeight: 1.6, fontFamily: "inherit", marginBottom: 8 }} />
          {result && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginBottom: 3 }}>
                <span>ציון פרומפט</span><span style={{ color: scoreColor, fontWeight: 700 }}>{result.score}/100</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "#e2e8f0", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${result.score}%`, background: scoreColor, transition: "width 0.4s" }} />
              </div>
            </div>
          )}
          {result?.blocked && <div style={{ background: "rgba(254,226,226,1)", border: "1px solid #dc2626", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#1A1A1A", marginBottom: 8 }}>{result.hint}</div>}
          {result && !result.blocked && result.score < 75 && <div style={{ background: "rgba(255,251,235,1)", border: "1px solid #d97706", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#1A1A1A", marginBottom: 8 }}>{result.hint}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={validate} disabled={text.trim().length < 10}
              style={{ padding: "7px 16px", borderRadius: 10, cursor: text.trim().length < 10 ? "not-allowed" : "pointer", background: `rgba(${accentRgb},0.1)`, border: `1.5px solid rgba(${accentRgb},0.4)`, color: accentColor, fontSize: 13, fontWeight: 600, opacity: text.trim().length < 10 ? 0.4 : 1 }}>
              בדיקת AI מדומה 🤖
            </button>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{text.trim().length} תווים</span>
          </div>
        </>
      )}
      {passed && <div style={{ background: "rgba(220,252,231,1)", border: "1px solid #16a34a", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#14532d" }}>{result!.hint || "ניסוח מעולה! הפרומפט שלך ברור ומדויק."}</div>}
    </div>
  );
}

// ─── LadderBase ───────────────────────────────────────────────────────────────

function LadderBase({ ex, accentColor, accentRgb }: { ex: ExerciseDef; accentColor: string; accentRgb: string }) {
  const steps = ex.steps;
  const [completed, setCompleted] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlocked = completed.filter(Boolean).length + 1;
  const markDone = (i: number) => {
    setCompleted(prev => { const next = [...prev]; next[i] = true; return next; });
    const el = document.getElementById(`basic-step-${i + 1}`);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
  };
  return (
    <div>
      {steps.map((step, i) => (
        <div key={i} id={`basic-step-${i}`}>
          {i < unlocked ? (
            <>
              <TutorStepBasic key={i} step={step} index={i} accentColor={accentColor} accentRgb={accentRgb} />
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
              <TutorStepBasic key={i} step={step} index={i} accentColor={accentColor} accentRgb={accentRgb} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── LadderMedium ─────────────────────────────────────────────────────────────

function LadderMedium({ ex, accentColor, accentRgb }: { ex: ExerciseDef; accentColor: string; accentRgb: string }) {
  const [passed, setPassed] = useState<boolean[]>(Array(ex.steps.length).fill(false));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <GoldenPromptCard prompt={ex.goldenPrompt} accentColor={accentColor} accentRgb={accentRgb} />
      <div style={{ borderRadius: 12, background: `rgba(${accentRgb},0.07)`, border: `1px solid rgba(${accentRgb},0.2)`, padding: "8px 14px", fontSize: 13, color: accentColor, fontWeight: 600 }}>
        🎯 עכשיו תורך: נסח כל פרומפט בעצמך, בדוק עם ה-AI המדומה, ואז שלח לAI האמיתי
      </div>
      {ex.steps.map((step, i) => (
        <TutorStepMedium key={i} step={step} index={i} accentColor={accentColor} accentRgb={accentRgb}
          locked={i > 0 && !passed[i - 1]}
          onPass={() => setPassed(p => { const n = [...p]; n[i] = true; return n; })} />
      ))}
    </div>
  );
}

// ─── LadderAdvanced ───────────────────────────────────────────────────────────

function LadderAdvanced({ ex, accentColor, accentRgb }: { ex: ExerciseDef; accentColor: string; accentRgb: string }) {
  const steps = ex.steps;
  const [masterPassed, setMasterPassed] = useState(false);
  const [unlockedCount, setUnlockedCount] = useState(1);
  const allPassed = masterPassed && unlockedCount > steps.length;

  return (
    <div>
      <MasterPromptGate onPass={() => setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" />

      {steps.map((step, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {(!masterPassed || i >= unlockedCount) ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.7)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{ step.phase } — { step.label }</span>
              <span style={{ fontSize: 16 }}>🔒</span>
            </div>
          ) : (
            <div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(255,255,255,0.9)", padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{ step.phase } — { step.label }</div>
                <div style={{ color: "#334155", fontSize: 13, lineHeight: 1.6 }}>{ step.prompt }</div>
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

// ─── FormulaBar ───────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"mean" | "median" | "std" | "transform" | null>(null);

  const tabs = [
    { id: "mean" as const,      label: "ממוצע",        tex: "\\bar{x} = \\frac{\\Sigma x_i}{n}", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "median" as const,    label: "חציון",        tex: "\\tilde{x}",                         color: "#3b82f6", borderColor: "rgba(59,130,246,0.35)" },
    { id: "std" as const,       label: "סטיית תקן",   tex: "\\sigma",                             color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "transform" as const, label: "טרנספורמציה", tex: "Y=aX+b",                             color: "#7C3AED", borderColor: "rgba(124,58,237,0.35)" },
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
                background: isActive ? `${t.color}15` : "rgba(255,255,255,0.02)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
              <span style={{ color: isActive ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span>
            </button>
          );
        })}
      </div>

      {activeTab === "mean" && (
        <motion.div key="mean" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\bar{x} = \\frac{x_1 + x_2 + \\cdots + x_n}{n}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> הממוצע הוא סכום כל הערכים חלקי מספרם.
                <ul dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>רגיש לערכים קיצוניים — ערך גבוה מאוד ימשוך את הממוצע למעלה.</li>
                  <li>מושפע מכל הנתונים — שונה מחציון שמתעלם מקצוות.</li>
                </ul>
              </div>
              <div style={{ marginTop: 10, color: "#16a34a", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: נתונים 3,5,7 → ממוצע = (3+5+7)/3 = 5
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "median" && (
        <motion.div key="median" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(59,130,246,0.25)", background: "rgba(59,130,246,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\tilde{x} = \\begin{cases} x_{\\frac{n+1}{2}} & n \\text{ odd} \\\\ \\frac{x_{n/2}+x_{n/2+1}}{2} & n \\text{ even} \\end{cases}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> החציון הוא הערך האמצעי אחרי מיון.
                <ul dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>n אי-זוגי — הערך במקום <InlineMath>{"\\frac{n+1}{2}"}</InlineMath>.</li>
                  <li>n זוגי — ממוצע שני הערכים האמצעיים.</li>
                </ul>
              </div>
              <div style={{ marginTop: 10, color: "#3b82f6", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; חובה למיין לפני חישוב! חציון על רשימה לא ממוינת — טעות נפוצה.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "std" && (
        <motion.div key="std" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\sigma = \\sqrt{\\frac{\\sum(x_i - \\bar{x})^2}{n}}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> סטיית התקן מודדת כמה הנתונים מפוזרים סביב הממוצע.
                <ul dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>σ קטן = נתונים מרוכזים סביב הממוצע (הומוגני).</li>
                  <li>σ גדול = נתונים מפוזרים (הטרוגני).</li>
                </ul>
              </div>
              <div style={{ marginTop: 10, color: "#EA580C", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; שלב 1: הפרש מממוצע → שלב 2: ריבוע → שלב 3: ממוצע ריבועים → שלב 4: שורש.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "transform" && (
        <motion.div key="transform" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"Y = aX + b \\;\\Rightarrow\\; \\bar{Y}=a\\bar{X}+b,\\;\\sigma_Y=|a|\\sigma_X"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> טרנספורמציה לינארית משנה ממוצע וחציון, אבל b לא משפיע על σ.
                <ul dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>+b (הוספת קבוע): ממוצע וחציון עולים ב-b, σ <strong>לא משתנה</strong>.</li>
                  <li>×a (כפל): ממוצע וחציון מוכפלים ב-a, σ מוכפל ב-|a|.</li>
                </ul>
              </div>
              <div style={{ marginTop: 10, color: "#7C3AED", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; &quot;+5 לכולם&quot; = הזזה. &quot;×1.1 לכולם&quot; = מתיחה. רק מתיחה משנה פיזור!
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Exercise data ────────────────────────────────────────────────────────────

const EXERCISES: ExerciseDef[] = [
  {
    id: "basic",
    problem: "נתונה רשימת ציונים: 7, 3, 8, 5, 9, 3, 6.\n\nא. סדר את הנתונים ובנה טבלת שכיחויות.\nב. חשב את ממוצע הציונים.\nג. מצא את חציון הציונים והסבר את משמעותו.\nד. קבע מהו הציון השכיח.",
    diagram: <BarChartDiagram />,
    pitfalls: [
      { title: "מיין לפני חציון", text: "חציון מחושב אחרי מיון בלבד. אל תחשב על רשימה לא ממוינת — תקבל ערך שגוי." },
      { title: "שכיח ≠ ממוצע", text: "השכיח הוא הערך הנפוץ ביותר, לא בהכרח קרוב לממוצע. יכולים להיות גם כמה שכיחים." },
      { title: "n זוגי vs אי-זוגי", text: "כשמספר הנתונים זוגי, החציון הוא ממוצע שני הערכים האמצעיים — לא אחד מהם." },
    ],
    goldenPrompt: "אני תלמיד כיתה יא׳ ומצרף תרגיל על מדדי מרכז — ממוצע, חציון ושכיח.\nנתונים: 7, 3, 8, 5, 9, 3, 6.\n\nאתה המורה שלי — אל תפתור עבורי. שאל אותי שאלות מכווינות בלבד.\n\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      { phase: "שלב א׳", label: "מיון וטבלת שכיחויות", prompt: "נתונים: 7,3,8,5,9,3,6. מיין מהקטן לגדול. כמה פעמים מופיע כל ציון?" },
      { phase: "שלב ב׳", label: "חישוב ממוצע", prompt: "חבר את כל הציונים הממוינים וחלק ב-7. מהו הממוצע?" },
      { phase: "שלב ג׳", label: "מציאת חציון", prompt: "נתונים: 7,3,8,5,9,3,6. הנחה אותי למיין ואז למצוא את החציון. הסבר מה עושים כשמספר הערכים אי-זוגי." },
      { phase: "שלב ד׳", label: "מציאת שכיח", prompt: "נתונים: 7,3,8,5,9,3,6. הנחה אותי למצוא את השכיח — איזה ערך מופיע הכי הרבה פעמים?" },
    ],
  },
  {
    id: "medium",
    problem: "שתי כיתות נבחנו באותו מבחן. בשתיהן הממוצע 80.\n\nיא׳1 (עקבית): 78, 80, 82, 79, 81\nיא׳2 (קיצונית): 60, 100, 70, 90, 80\n\nא. חשב את סטיית התקן (σ) של כל כיתה.\nב. איזו כיתה הומוגנית יותר? נמק.\nג. מה יקרה ל-σ אם נוסיף 5 נקודות לכל תלמיד ביא׳2?\nד. מה יקרה ל-σ אם נכפיל כל ציון ביא׳2 ב-1.1?",
    diagram: <BellCurvesDiagram />,
    pitfalls: [
      { title: "הוספת קבוע לא משנה σ", text: "כשמוסיפים 5 לכולם, הממוצע עולה אך σ נשאר זהה — ההפרשים מהממוצע לא השתנו." },
      { title: "כפל משנה σ", text: "כשמכפילים ב-a, סטיית התקן מוכפלת ב-|a|. לכן כפל ב-1.1 מגדיל את הפיזור." },
      { title: "אל תשכח ערך מוחלט", text: "SD(aX+b) = |a|·σ. גם אם a שלילי, σ תמיד חיובי — לכן ערך מוחלט." },
    ],
    goldenPrompt: "אני תלמיד כיתה יא׳ ומצרף תרגיל על סטיית תקן.\nשתי כיתות עם ממוצע 80: יא׳1: 78,80,82,79,81. יא׳2: 60,100,70,90,80.\n\nאתה המורה שלי — אל תפתור עבורי. שאל אותי שאלות מכווינות בלבד.\n\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      { phase: "שלב א׳", label: "σ של יא׳1", contextWords: ["σ", "סטייה", "ריבועים", "ממוצע", "80", "שורש"] },
      { phase: "שלב ב׳", label: "σ של יא׳2", contextWords: ["σ", "סטייה", "ריבועים", "הפרש", "פיזור", "גדול"] },
      { phase: "שלב ג׳", label: "הומוגנית vs הטרוגנית", contextWords: ["הומוגני", "הטרוגני", "σ", "קטן", "גדול", "פיזור"] },
      { phase: "שלב ד׳", label: "טרנספורמציה X+b ו-aX", contextWords: ["הוספה", "כפל", "σ", "לא משתנה", "מוכפל", "טרנספורמציה"] },
    ],
  },
  {
    id: "advanced",
    problem: "נתוני ציונים: ממוצע = 75, חציון = 77, סטיית תקן = 8.\n\nא. המורה מוסיפה 5 נקודות לכולם (Y = X + 5). מה ממוצע, חציון ו-σ של Y?\nב. המנהל מכפיל ב-1.1 (Z = 1.1X). מה ממוצע, חציון ו-σ של Z?\nג. איזו שיטה הוגנת יותר לתלמידים חלשים ומדוע?\nד. נסח את הכלל הכללי: עבור Y = aX + b — מה קורה לממוצע, חציון ו-σ?",
    diagram: <TransformDiagram />,
    pitfalls: [
      { title: "הוספה vs כפל", text: "+b משנה מיקום בלבד (ממוצע, חציון עולים, σ לא). ×a משנה פיזור (σ מוכפל ב-|a|)." },
      { title: "SD(aX+b) = |a|·SD(X)", text: "ה-b נעלם לחלוטין מהפיזור! הוספת קבוע מזיזה את כולם באותה כמות." },
      { title: "הוגנות תלויה בנקודת מבט", text: "הוספה מעלה את כולם באופן שווה. כפל מיטיב עם בעלי ציונים גבוהים — שאלה של הוגנות." },
    ],
    goldenPrompt: "",
    steps: [
      { phase: "שלב א׳", label: "Y = X + 5", contextWords: ["ממוצע", "חציון", "σ", "הוספה", "קבוע", "לא משתנה", "סטייה"] },
      { phase: "שלב ב׳", label: "Z = 1.1X", contextWords: ["ממוצע", "חציון", "σ", "כפל", "מוכפל", "סטייה", "פיזור"] },
      { phase: "שלב ג׳", label: "הוגנות", contextWords: ["הוגן", "חלש", "חזק", "שווה", "יחסי", "מוחלט"] },
      { phase: "שלב ד׳", label: "כלל כללי aX+b", contextWords: ["aX+b", "ממוצע", "a·μ+b", "σ", "|a|·σ", "כלל"] },
    ],
  },
];

// ─── DescriptiveLab ──────────────────────────────────────────────────────────

function DescriptiveLab() {
  const [vals, setVals] = useState([5, 7, 3, 10, 6]);
  const setVal = (i: number, v: number) => setVals(prev => { const n = [...prev]; n[i] = v; return n; });

  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sorted = [...vals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const variance = vals.reduce((s, x) => s + (x - mean) ** 2, 0) / vals.length;
  const sigma = Math.sqrt(variance);
  const range = sorted[sorted.length - 1] - sorted[0];

  const sigmaColor = sigma < 2 ? "#16a34a" : sigma < 4 ? "#d97706" : "#dc2626";
  const sigmaLabel = sigma < 2 ? "פיזור נמוך — הנתונים קרובים לממוצע" : sigma < 4 ? "פיזור בינוני — חלק מהנתונים רחוקים מהממוצע" : "פיזור גבוה — הנתונים מפוזרים מאוד";

  const S = 260;
  const maxVal = 15;
  const barW = 32;
  const gap = 12;
  const totalW = vals.length * barW + (vals.length - 1) * gap;
  const startX = (S - totalW) / 2;

  return (
    <section style={{
      border: "1px solid rgba(0,0,0,0.1)", borderRadius: 24, padding: "2.5rem",
      background: "rgba(255,255,255,0.82)", marginBottom: "2rem",
    }}>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", textAlign: "center", marginBottom: 16 }}>מעבדת מדדי תיאור</h3>

      {/* SVG */}
      <svg viewBox={`0 0 ${S} 180`} className="w-full max-w-sm mx-auto mb-4" aria-hidden>
        {/* bars */}
        {vals.map((v, i) => {
          const x = startX + i * (barW + gap);
          const h = (v / maxVal) * 140;
          return (
            <g key={i}>
              <rect x={x} y={150 - h} width={barW} height={h} rx={4} fill="#3b82f6" fillOpacity={0.6} />
              <text x={x + barW / 2} y={165} textAnchor="middle" fontSize={10} fill="#64748b">x{"\u2080".replace("\u2080", String.fromCharCode(0x2080 + i + 1))}</text>
            </g>
          );
        })}
        {/* mean line */}
        {(() => {
          const my = 150 - (mean / maxVal) * 140;
          return <line x1={startX - 10} y1={my} x2={startX + totalW + 10} y2={my} stroke="#d97706" strokeWidth={2} strokeDasharray="6 4" />;
        })()}
        {/* sigma band */}
        {(() => {
          const bandTop = 150 - ((mean + sigma) / maxVal) * 140;
          const bandBot = 150 - ((mean - sigma) / maxVal) * 140;
          const clampTop = Math.max(bandTop, 10);
          const clampBot = Math.min(bandBot, 150);
          return <rect x={startX - 10} y={clampTop} width={totalW + 20} height={clampBot - clampTop} rx={4} fill={sigmaColor} fillOpacity={0.12} />;
        })()}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 12, marginBottom: 16 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 20, borderTop: "2px dashed #d97706", display: "inline-block" }} />
          <span style={{ color: "#b45309" }}>ממוצע (μ)</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 10, borderRadius: 3, background: sigmaColor, opacity: 0.3, display: "inline-block" }} />
          <span style={{ color: sigmaColor }}>טווח σ</span>
        </span>
      </div>

      {/* Sliders */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 8px", marginBottom: 20 }}>
        {vals.map((v, i) => {
          const lbl = `x${String.fromCharCode(0x2081 + i)}`;
          return (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                <span>{lbl}</span><span style={{ color: "#3b82f6", fontWeight: 700 }}>{v.toFixed(1)}</span>
              </div>
              <input type="range" min={0} max={15} step={0.5} value={v}
                onChange={e => setVal(i, parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#3b82f6" } as React.CSSProperties} />
            </div>
          );
        })}
      </div>

      {/* Data tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, textAlign: "center", fontSize: 12, marginBottom: 16 }}>
        {[
          { label: "ממוצע (μ)", val: mean.toFixed(2), color: "#d97706" },
          { label: "חציון", val: median.toFixed(1), color: "#3b82f6" },
          { label: "σ", val: sigma.toFixed(2), color: sigmaColor },
          { label: "טווח", val: range.toFixed(1), color: "#7c3aed" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: "10px 8px" }}>
            <div style={{ color: "#64748b", marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 700, color, fontSize: 11 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Interpretation */}
      <div style={{ textAlign: "center", fontSize: 13, color: sigmaColor, fontWeight: 600, padding: "8px 12px", borderRadius: 10, background: `${sigmaColor}11`, border: `1px solid ${sigmaColor}33` }}>
        {sigmaLabel}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DescriptivePage() {
  const [activeId, setActiveId] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = EXERCISES.find(e => e.id === activeId)!;
  const st = STATION[activeId];

  const lvlRgb = activeId === "basic" ? "45,90,39" : activeId === "medium" ? "163,79,38" : "139,38,53";

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <main dir="rtl" style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", paddingBottom: "4rem", ["--lvl-rgb" as string]: lvlRgb }}>
        {/* Header */}
        <div style={{ background: "#F3EFE0", borderBottom: "1px solid rgba(60,54,42,0.15)", marginBottom: "2rem" }}>
          <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>מדדי תיאור עם AI</h1>
              <p style={{ color: "#64748b", fontSize: 13, margin: "3px 0 0" }}>ממוצע, חציון, סטיית תקן וטרנספורמציות</p>
            </div>
            <Link
              href="/topic/statistics"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
            >
              <span style={{ fontSize: 16 }}>←</span>
              חזרה
            </Link>
          </div>
        </div>

        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0 1.5rem" }}>
          {/* Progress */}
          <SubtopicProgress subtopicId="/statistics/descriptive" />

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
            {TABS.map(tab => {
              const s = STATION[tab.id];
              const active = activeId === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveId(tab.id)} style={{ flex: 1, padding: "10px 8px", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 13, border: "2px solid", borderColor: active ? s.accentColor : "rgba(100,116,139,0.2)", background: active ? `rgba(${s.glowRgb},0.1)` : "rgba(255,255,255,0.6)", color: active ? s.accentColor : "#64748b", boxShadow: active ? s.glowShadow : "none", transition: "all 0.2s" }}>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Island */}
          <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", boxShadow: st.glowShadow, marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 12px", borderRadius: 20 }} className={st.badgeCls}>{st.badge}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{st.stationName}</span>
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
              <pre style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.75, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
            </div>

            {/* Pitfalls */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>⚠️ שגיאות נפוצות</div>
              {ex.pitfalls.map((p, i) => (
                <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", padding: "0.85rem 1rem", marginBottom: 8 }}>
                  <div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>⚠️ {p.title}</div>
                  {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: st.accentColor, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>🧠 מדריך הפרומפטים</p>
              {activeId === "basic"    && <LadderBase     ex={ex} accentColor={st.accentColor} accentRgb={st.glowRgb} />}
              {activeId === "medium"   && <LadderMedium   ex={ex} accentColor={st.accentColor} accentRgb={st.glowRgb} />}
              {activeId === "advanced" && <LadderAdvanced ex={ex} accentColor={st.accentColor} accentRgb={st.glowRgb} />}
            </div>
          </section>

          <DescriptiveLab />

          {/* Mark as complete */}
          <div style={{ marginTop: "1.5rem" }}>
            <MarkComplete subtopicId="/statistics/descriptive" level={activeId} />
          </div>

        </div>
      </main>
    </>
  );
}
