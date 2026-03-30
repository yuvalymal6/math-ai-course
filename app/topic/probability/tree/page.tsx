"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";

// ─── Global CSS ───────────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Station config ───────────────────────────────────────────────────────────

const STATION = {
  basic:    { stationName: "תחנה ראשונה", badge: "בסיסי",  badgeCls: "bg-green-600 text-white",  glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",   accentColor: "#16A34A", borderHex: "#2D5A27", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני", badgeCls: "bg-orange-600 text-white", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12",  accentColor: "#EA580C", borderHex: "#A34F26", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38",  accentColor: "#DC2626", borderHex: "#8B2635", borderRgb: "139,38,53"  },
} as const;

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "basic"    as const, label: "בסיסי — עם החזרה",     bg: "bg-green-50",  border: "border-green-600",  textColor: "text-green-700",  glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium"   as const, label: "בינוני — ללא החזרה",   bg: "bg-orange-50", border: "border-orange-600", textColor: "text-orange-700", glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced" as const, label: "מתקדם — בעיית כדים",   bg: "bg-red-50",    border: "border-red-700",    textColor: "text-red-700",    glowColor: "rgba(220,38,38,0.3)"   },
] as const;

// ─── Formulas ─────────────────────────────────────────────────────────────────

const FORMULAS = [
  { label: "כפל הסתברויות", formula: "P(A∩B) = P(A)·P(B|A)" },
  { label: "הסתברות כוללת", formula: "P(B) = Σ P(B|Aᵢ)·P(Aᵢ)" },
  { label: "בייס",           formula: "P(Aᵢ|B) = P(B|Aᵢ)·P(Aᵢ)÷P(B)" },
  { label: "מותנה",          formula: "P(B|A) = P(A∩B)÷P(A)" },
];

// ─── FormulaBar ───────────────────────────────────────────────────────────────

function FormulaBar({ accentColor, accentRgb }: { accentColor: string; accentRgb: string }) {
  return (
    <div style={{ borderRadius: 16, border: `1px solid rgba(${accentRgb},0.3)`, background: "rgba(255,255,255,0.75)", padding: "1rem 1.25rem", marginBottom: "1.5rem", boxShadow: `0 2px 8px rgba(${accentRgb},0.08)` }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 10, textAlign: "center" }}>נוסחאות</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem 1.5rem", justifyContent: "center" }}>
        {FORMULAS.map((f, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ color: "#6B7280", fontSize: 10 }}>{f.label}</span>
            <span style={{ color: accentColor, fontFamily: "monospace", fontWeight: 700, fontSize: 12 }}>{f.formula}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Static Tree Diagrams ─────────────────────────────────────────────────────

function TreeBranchDiagramLight({ l1a, l1b, l2a, l2b, l2c, l2d, color }: {
  l1a: string; l1b: string; l2a: string; l2b: string; l2c: string; l2d: string; color: string;
}) {
  const W = 320, H = 200;
  const rx = 160, ry = 22;
  const ax = 80, ay = 90; const bx = 240, by = 90;
  const c1x = 30, c1y = 162; const c2x = 128, c2y = 162;
  const c3x = 192, c3y = 162; const c4x = 290, c4y = 162;
  const r = 6;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: "100%" }}>
      <circle cx={rx} cy={ry} r={r} fill={color} />
      <line x1={rx} y1={ry + r} x2={ax} y2={ay - r} stroke="#64748b" strokeWidth={1.8} />
      <line x1={rx} y1={ry + r} x2={bx} y2={by - r} stroke="#64748b" strokeWidth={1.8} />
      <circle cx={ax} cy={ay} r={r} fill={color} opacity={0.85} />
      <text x={ax} y={ay - 11} textAnchor="middle" fill="#374151" fontSize={10} fontWeight="600">{l1a}</text>
      <circle cx={bx} cy={by} r={r} fill={color} opacity={0.85} />
      <text x={bx} y={by - 11} textAnchor="middle" fill="#374151" fontSize={10} fontWeight="600">{l1b}</text>
      <line x1={ax} y1={ay + r} x2={c1x} y2={c1y - r} stroke="#94a3b8" strokeWidth={1.4} />
      <line x1={ax} y1={ay + r} x2={c2x} y2={c1y - r} stroke="#94a3b8" strokeWidth={1.4} />
      <line x1={bx} y1={by + r} x2={c3x} y2={c3y - r} stroke="#94a3b8" strokeWidth={1.4} />
      <line x1={bx} y1={by + r} x2={c4x} y2={c4y - r} stroke="#94a3b8" strokeWidth={1.4} />
      <text x={c1x} y={c1y + 17} textAnchor="middle" fill="#64748b" fontSize={9}>{l2a}</text>
      <text x={c2x} y={c2y + 17} textAnchor="middle" fill="#64748b" fontSize={9}>{l2b}</text>
      <text x={c3x} y={c3y + 17} textAnchor="middle" fill="#64748b" fontSize={9}>{l2c}</text>
      <text x={c4x} y={c4y + 17} textAnchor="middle" fill="#64748b" fontSize={9}>{l2d}</text>
    </svg>
  );
}

function ReplacementDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>עץ ההסתברות — שליפה עם החזרה (2 שליפות)</p>
      <TreeBranchDiagramLight l1a="אדום" l1b="כחול" l2a="אדום" l2b="כחול" l2c="אדום" l2d="כחול" color="#16a34a" />
    </div>
  );
}

function NoReplacementDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>עץ ההסתברות — שליפה ללא החזרה (2 שליפות)</p>
      <TreeBranchDiagramLight l1a="ירוק" l1b="צהוב" l2a="ירוק" l2b="צהוב" l2c="ירוק" l2d="צהוב" color="#ea580c" />
    </div>
  );
}

function UrnsDiagram() {
  const W = 320, H = 200;
  const rx = 160, ry = 22;
  const ax = 80, ay = 90; const bx = 240, by = 90;
  const c1x = 30, c1y = 162; const c2x = 128, c2y = 162;
  const c3x = 192, c3y = 162; const c4x = 290, c4y = 162;
  const r = 6;
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>עץ ההסתברות — בעיית כדים (2 שלבים)</p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: "100%" }}>
        <circle cx={rx} cy={ry} r={r} fill="#dc2626" />
        <line x1={rx} y1={ry + r} x2={ax} y2={ay - r} stroke="#64748b" strokeWidth={1.8} />
        <line x1={rx} y1={ry + r} x2={bx} y2={by - r} stroke="#64748b" strokeWidth={1.8} />
        <circle cx={ax} cy={ay} r={r} fill="#dc2626" opacity={0.85} />
        <text x={ax} y={ay - 11} textAnchor="middle" fill="#374151" fontSize={10} fontWeight="600">כד א׳</text>
        <circle cx={bx} cy={by} r={r} fill="#dc2626" opacity={0.85} />
        <text x={bx} y={by - 11} textAnchor="middle" fill="#374151" fontSize={10} fontWeight="600">כד ב׳</text>
        <line x1={ax} y1={ay + r} x2={c1x} y2={c1y - r} stroke="#94a3b8" strokeWidth={1.4} />
        <line x1={ax} y1={ay + r} x2={c2x} y2={c1y - r} stroke="#94a3b8" strokeWidth={1.4} />
        <line x1={bx} y1={by + r} x2={c3x} y2={c3y - r} stroke="#94a3b8" strokeWidth={1.4} />
        <line x1={bx} y1={by + r} x2={c4x} y2={c4y - r} stroke="#94a3b8" strokeWidth={1.4} />
        <text x={c1x} y={c1y + 17} textAnchor="middle" fill="#64748b" fontSize={9}>אדום</text>
        <text x={c2x} y={c2y + 17} textAnchor="middle" fill="#64748b" fontSize={9}>כחול</text>
        <text x={c3x} y={c3y + 17} textAnchor="middle" fill="#64748b" fontSize={9}>אדום</text>
        <text x={c4x} y={c4y + 17} textAnchor="middle" fill="#64748b" fontSize={9}>כחול</text>
      </svg>
    </div>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
            ✅ פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result.score}/100</strong>
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

function LadderBase({ ex, accentColor, accentRgb }: { ex: ExerciseDef; accentColor: string; accentRgb: string }) {
  const st = STATION[ex.id];
  return (
    <div style={{ borderRadius: 16, border: `1px solid rgba(${accentRgb},0.3)`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", boxShadow: `0 2px 8px rgba(${accentRgb},0.08)` }}>
      <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
      <GoldenPromptCard prompt={ex.goldenPrompt} title="פרומפט ראשי" glowRgb={accentRgb} borderRgb={st.borderRgb} />
      {ex.steps.map((s, i) => (
        <TutorStepBasic key={i} step={s} glowRgb={accentRgb} borderRgb={st.borderRgb} />
      ))}
    </div>
  );
}

function LadderMedium({ ex, accentColor, accentRgb }: { ex: ExerciseDef; accentColor: string; accentRgb: string }) {
  const st = STATION[ex.id];
  const [passed, setPassed] = useState<boolean[]>(Array(ex.steps.length).fill(false));
  return (
    <div style={{ borderRadius: 16, border: `1px solid rgba(${accentRgb},0.3)`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", boxShadow: `0 2px 8px rgba(${accentRgb},0.08)` }}>
      <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
      <GoldenPromptCard prompt={ex.goldenPrompt} glowRgb={accentRgb} borderRgb={st.borderRgb} />
      <div style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "1px solid rgba(217,119,6,0.3)", padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#92400e" }}>
        💡 כאן תרגל לנסח פרומפטים בעצמך לכל שלב
      </div>
      {ex.steps.map((s, i) => (
        <TutorStepMedium
          key={i} step={s}
          locked={i > 0 && !passed[i - 1]}
          onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })}
          borderRgb={st.borderRgb}
        />
      ))}
    </div>
  );
}

function LadderAdvanced({ ex, accentColor, accentRgb }: { ex: ExerciseDef; accentColor: string; accentRgb: string }) {
  const st = STATION[ex.id];
  const [masterPassed, setMasterPassed] = useState(false);
  const [stepsPassed, setStepsPassed] = useState<boolean[]>(Array(ex.steps.length).fill(false));
  const allPassed = stepsPassed.every(Boolean) && masterPassed;

  return (
    <div style={{ borderRadius: 16, border: `1px solid rgba(${accentRgb},0.3)`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", boxShadow: `0 2px 8px rgba(${accentRgb},0.08)` }}>
      <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
      <MasterPromptGate
        onPass={() => setMasterPassed(true)}
        accentColor={accentColor}
        accentRgb={accentRgb}
        subjectWords={ex.subjectWords}
        subjectHint={ex.subjectHint}
        requiredPhrase="סרוק נתונים ועצור"
      />
      {masterPassed && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
          {ex.steps.map((s, i) => (
            <TutorStepMedium
              key={i} step={s}
              locked={i > 0 && !stepsPassed[i - 1]}
              onPass={() => setStepsPassed(prev => { const next = [...prev]; next[i] = true; return next; })}
              borderRgb={st.borderRgb}
            />
          ))}
          {allPassed && (
            <div style={{ borderRadius: 16, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: "1rem 1.5rem", marginTop: 16, textAlign: "center" }}>
              <span style={{ fontSize: 20 }}>🏆</span>
              <p style={{ color: "#14532d", fontWeight: 700, fontSize: 15, margin: "4px 0 0" }}>מאסטר בעצי הסתברות! P(אדום)=2/5, P(כד א׳|אדום)=3/4</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Tree Lab ─────────────────────────────────────────────────────────────────

function TreeLab({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  const st = STATION[levelId];
  const [p, setP] = useState(0.5);
  const q = 1 - p;
  const pAtLeastOne = 1 - q * q;
  const atTarget = Math.abs(p - 5 / 8) < 0.015;

  const SW = 230, SH = 210;
  const rx = SW / 2, ry = 18;
  const ax = 58, ay = 80; const bx = SW - 58, by = 80;
  const c1x = 18, c1y = 158; const c2x = 98, c2y = 158;
  const c3x = SW - 98, c3y = 158; const c4x = SW - 18, c4y = 158;

  const w1a = Math.max(1.5, p * 12);
  const w1b = Math.max(1.5, q * 12);
  const w2aa = Math.max(0.8, p * p * 18);
  const w2ab = Math.max(0.8, p * q * 18);
  const w2ba = Math.max(0.8, q * p * 18);
  const w2bb = Math.max(0.8, q * q * 18);

  const outcomes = [
    { label: "אא", p: p * p, color: "#22c55e" },
    { label: "אכ", p: p * q, color: "#3b82f6" },
    { label: "כא", p: q * p, color: "#3b82f6" },
    { label: "ככ", p: q * q, color: "#ef4444" },
  ];
  const barMaxH = 110;

  return (
    <section style={{ borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", border: `1px solid ${st.glowBorder}`, boxShadow: st.glowShadow, marginBottom: "2rem", marginLeft: "auto", marginRight: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2D3436", margin: 0 }}>סימולטור עץ הסתברות</h2>
        {atTarget && <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />P=5/8 — התאמה לבעיה!</span>}
      </div>

      <div className="flex gap-4 justify-center flex-wrap items-start">
        {/* Animated tree */}
        <div style={{ borderRadius: 12, background: "#0f172a", border: "1px solid #334155", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>עץ — עובי ענף = הסתברות</p>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            <circle cx={rx} cy={ry} r={7} fill="#00d4ff" />
            <motion.line animate={{ strokeWidth: w1a }} transition={{ type: "spring", stiffness: 260, damping: 28 }}
              x1={rx} y1={ry + 7} x2={ax} y2={ay - 7} stroke="#22c55e" />
            <motion.line animate={{ strokeWidth: w1b }} transition={{ type: "spring", stiffness: 260, damping: 28 }}
              x1={rx} y1={ry + 7} x2={bx} y2={by - 7} stroke="#ef4444" />
            <text x={ax} y={ay - 12} textAnchor="middle" fill="#22c55e" fontSize={10} fontWeight="700">אדום</text>
            <text x={bx} y={by - 12} textAnchor="middle" fill="#ef4444" fontSize={10} fontWeight="700">כחול</text>
            <circle cx={ax} cy={ay} r={6} fill="#22c55e" />
            <circle cx={bx} cy={by} r={6} fill="#ef4444" />
            <motion.line animate={{ strokeWidth: w2aa }} transition={{ type: "spring", stiffness: 260, damping: 28 }}
              x1={ax} y1={ay + 6} x2={c1x} y2={c1y - 6} stroke="#22c55e" />
            <motion.line animate={{ strokeWidth: w2ab }} transition={{ type: "spring", stiffness: 260, damping: 28 }}
              x1={ax} y1={ay + 6} x2={c2x} y2={c2y - 6} stroke="#3b82f6" />
            <motion.line animate={{ strokeWidth: w2ba }} transition={{ type: "spring", stiffness: 260, damping: 28 }}
              x1={bx} y1={by + 6} x2={c3x} y2={c3y - 6} stroke="#3b82f6" />
            <motion.line animate={{ strokeWidth: w2bb }} transition={{ type: "spring", stiffness: 260, damping: 28 }}
              x1={bx} y1={by + 6} x2={c4x} y2={c4y - 6} stroke="#ef4444" />
            {[
              { x: c1x, y: c1y, label: "אא", fill: "#22c55e" },
              { x: c2x, y: c2y, label: "אכ", fill: "#64748b" },
              { x: c3x, y: c3y, label: "כא", fill: "#64748b" },
              { x: c4x, y: c4y, label: "ככ", fill: "#ef4444" },
            ].map((n, i) => (
              <text key={i} x={n.x} y={n.y + 18} textAnchor="middle" fill={n.fill} fontSize={9} fontWeight="600">{n.label}</text>
            ))}
          </svg>
        </div>

        {/* Bar chart */}
        <div style={{ borderRadius: 12, background: "#0f172a", border: "1px solid #334155", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>הסתברות כל תוצאה</p>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            {outcomes.map((o, i) => {
              const bw = 38, gap = 14, startX = 20;
              const bx2 = startX + i * (bw + gap);
              const bh = Math.max(2, o.p * barMaxH);
              const by2 = SH - 38 - bh;
              return (
                <g key={i}>
                  <motion.rect
                    animate={{ y: by2, height: bh }}
                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                    x={bx2} width={bw} fill={o.color} opacity={0.75} rx={3}
                  />
                  <text x={bx2 + bw / 2} y={SH - 22} textAnchor="middle" fill="#64748b" fontSize={9}>{o.label}</text>
                  <motion.text
                    animate={{ y: by2 - 4 }}
                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                    x={bx2 + bw / 2} textAnchor="middle" fill={o.color} fontSize={9} fontWeight="600">
                    {(o.p * 100).toFixed(0)}%
                  </motion.text>
                </g>
              );
            })}
            <line x1={15} y1={SH - 38} x2={SW - 10} y2={SH - 38} stroke="#334155" strokeWidth={1} />
          </svg>
        </div>
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
          <span style={{ color: "#64748b" }}>P(אדום) = <span style={{ fontFamily: "monospace", color: "#2D3436" }}>{p.toFixed(3)}</span></span>
          <span style={{ fontFamily: "monospace", fontSize: 13, color: atTarget ? "#22c55e" : "#2D3436", fontWeight: atTarget ? 700 : 400 }}>
            P(לפחות אדום) = {pAtLeastOne.toFixed(4)}
          </span>
        </div>
        <input type="range" min={0.05} max={0.95} step={0.005} value={p}
          onChange={e => setP(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#22c55e" }} />
        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>גרור ל-P = 5/8 = 0.625 כדי להתאים לבעיה הבסיסית</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: "1rem", textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>P(אדום)</p>
          <p style={{ fontFamily: "monospace", color: "#22c55e", fontWeight: 700 }}>{p.toFixed(3)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>P(שני כחולים)</p>
          <p style={{ fontFamily: "monospace", color: "#ef4444", fontWeight: 700 }}>{(q * q).toFixed(4)}</p>
        </div>
        <div style={{ background: atTarget ? "rgba(220,252,231,0.7)" : "rgba(255,255,255,0.75)", border: atTarget ? "1px solid #86efac" : "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, transition: "all 0.3s" }}>
          <p style={{ color: atTarget ? "#16a34a" : "#94a3b8", marginBottom: 4 }}>P(≥ אדום אחד)</p>
          <p style={{ fontFamily: "monospace", color: atTarget ? "#15803d" : "#1A1A1A", fontWeight: 700 }}>{pAtLeastOne.toFixed(4)}</p>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, marginTop: 12, fontSize: 12, color: "#64748b" }}>
        <span style={{ color: st.accentColor, fontWeight: 600 }}>P(A∩B)</span> = P(A) × P(B|A) &nbsp;|&nbsp; <span style={{ color: "#ea580c", fontWeight: 600 }}>משלים</span> = 1 − P(ככ) &nbsp;|&nbsp; עץ 2 שלבים → 4 עלים מסתכמים ל-1
      </div>
    </section>
  );
}

// ─── Exercises ────────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "שליפה עם החזרה — לפחות אדום אחד",
    problem: "כד מכיל 5 כדורים אדומים ו-3 כדורים כחולים. שולפים 2 כדורים בזה אחר זה עם החזרה.\nמה הסיכוי שיצא לפחות כדור אדום אחד?",
    diagram: <ReplacementDiagram />,
    pitfalls: [
      { title: "⚠️ השתמש בהסתברות משלימה", text: 'P(לפחות אחד) = 1 − P(אף אחד). קל יותר לחשב "אפס אדומים" מאשר לספור כל המקרים עם אדום.' },
      { title: "עם החזרה = עצמאות", text: "כשמחזירים לפני השליפה השנייה, הסיכויים נשארים זהים: P(כחול) = 3/8 בכל שליפה." },
      { title: "4 ענפים בעץ", text: "עץ ב-2 שליפות מייצר 4 עלים: אא, אכ, כא, ככ. הסתברויותיהם מסתכמות בדיוק ל-1." },
    ],
    goldenPrompt: `\n\nאני תלמיד ורוצה לפתור בעיית הסתברות:\nכד עם 5 אדומים ו-3 כחולים, 2 שליפות עם החזרה. P(לפחות אדום אחד).\nנחה אותי:\n1. מדוע כדאי להשתמש בהסתברות משלימה.\n2. כיצד לחשב P(שני כחולים) על עץ ההסתברות.\n3. כיצד להגיע לתשובה הסופית.\nשאל "מוכן?" בין שלב לשלב.`,
    steps: [
      {
        phase: "שלב 1", label: "מה הסיכוי לכחול?",
        prompt: "\n\nכד עם 5 אדומים ו-3 כחולים. הנחה אותי לחשב P(כחול) ולהסביר מה זה אומר 'עם החזרה'. שאל אם הבנתי.",
      },
      {
        phase: "שלב 2", label: "P(שני כחולים)",
        prompt: "\n\nהסיכוי לכחול = 3/8. הנחה אותי לחשב P(שני כחולים ברצף) תוך הסבר מתי מכפילים הסתברויות. שאל לפני שתמשיך.",
      },
      {
        phase: "שלב 3", label: "הסתברות משלימה",
        prompt: "\n\nP(שני כחולים) = 9/64. הנחה אותי להשתמש בהסתברות משלימה כדי למצוא P(לפחות אדום אחד). הסבר את הנוסחה.",
      },
      {
        phase: "שלב 4", label: "אמת בעץ",
        prompt: "\n\nP(ככ)=9/64, P(אא)=25/64. הנחה אותי לאמת את התשובה על ידי חיבור כל 4 ענפי העץ. שאל אם יודע מה ערכי P(אכ) ו-P(כא).",
      },
    ],
  },
  {
    id: "medium",
    title: "שליפה ללא החזרה — הסתברות מותנה",
    problem: "כד מכיל 4 כדורים ירוקים ו-6 כדורים צהובים. שולפים 2 כדורים ללא החזרה.\nמה הסיכוי שהכדור השני ירוק, בהינתן שהכדור הראשון היה צהוב?",
    diagram: <NoReplacementDiagram />,
    pitfalls: [
      { title: "⚠️ ללא החזרה = שינוי מספרים", text: "אחרי שליפה ראשונה נשארים 9 כדורים, לא 10. הסיכויים משתנים בין שליפה לשליפה!" },
      { title: "P(ב|א) ≠ P(ב)", text: "הסתברות מותנה: | קורא 'בהינתן ש'. חייבים לעדכן את מסד הנמנה." },
      { title: "שאלה ישירה", text: "כאן שואלים P(ירוק₂|צהוב₁) ישירות. אין צורך לחשב P(צהוב₁) כדי לענות." },
    ],
    goldenPrompt: `\n\nאני תלמיד ורוצה לפתור:\nכד עם 4 ירוקים ו-6 צהובים, 2 שליפות ללא החזרה. P(ירוק₂ | צהוב₁).\nנחה אותי:\n1. מה זו הסתברות מותנה ומה "ללא החזרה" משנה.\n2. כיצד לעדכן את הכד אחרי שליפה ראשונה.\n3. כיצד לחשב את ההסתברות המותנה ישירות.\nשאל "מוכן?" בין שלב לשלב.`,
    steps: [
      {
        phase: "שלב 1", label: "מה זו הסתברות מותנה?",
        contextWords: ["מותנה", "מרחב", "בהינתן", "ידוע", "הסתברות", "P(ירוק"],
      },
      {
        phase: "שלב 2", label: "עדכן את הכד אחרי צהוב₁",
        contextWords: ["עדכן", "כד", "נשארו", "9", "ירוקים", "צהוב", "ללא"],
      },
      {
        phase: "שלב 3", label: "חשב P(ירוק₂|צהוב₁)",
        contextWords: ["P(ירוק", "4", "9", "4/9", "מותנה", "חישוב"],
      },
      {
        phase: "שלב 4", label: "הסתברות שולית P(ירוק₂)",
        contextWords: ["שולית", "כוללת", "הסתברות", "2/5", "בדיקה", "ירוקים"],
      },
    ],
  },
  {
    id: "advanced",
    title: "בעיית הכדים — משפט בייס",
    problem: "שני כדים: כד א׳ מכיל 3 כדורים אדומים ו-2 כחולים. כד ב׳ מכיל 1 אדום ו-4 כחולים.\nבוחרים כד באקראי (P=½ לכל כד) ושולפים כדור אחד.\n(א) מה הסיכוי שהכדור אדום?\n(ב) בהינתן שהכדור אדום — מה הסיכוי שנבחר כד א׳?",
    diagram: <UrnsDiagram />,
    pitfalls: [
      { title: "⚠️ הסתברות כוללת", text: "P(אדום) = P(א|כד א׳)·P(א׳) + P(א|כד ב׳)·P(ב׳). חייבים לסכום על שני הכדים." },
      { title: "משפט בייס", text: "P(כד א׳|אדום) ≠ P(אדום|כד א׳). אל תהפוך כיוון ללא נוסחת בייס." },
      { title: "שבר בתוך שבר", text: "P(א׳|אדום) = P(א|א׳)·P(א׳) / P(אדום). חשב כל גורם בנפרד." },
    ],
    goldenPrompt: "\n\n",
    subjectWords: ["כד", "הסתברות", "בייס", "מותנה", "כוללת", "אדום", "כחול", "עץ", "P"],
    subjectHint: "כד / הסתברות מותנה / בייס / עץ",
    steps: [
      {
        phase: "שלב 1", label: "ציין את כל ההסתברויות הבסיסיות",
        contextWords: ["P(אדום|כד", "3/5", "1/5", "½", "בסיסיות", "הסתברויות"],
      },
      {
        phase: "שלב 2", label: "הסתברות כוללת P(אדום)",
        contextWords: ["כוללת", "P(אדום)", "2/5", "3/10", "סכום", "כד א"],
      },
      {
        phase: "שלב 3", label: "משפט בייס — P(כד א׳|אדום)",
        contextWords: ["בייס", "P(כד א", "3/4", "חישוב", "מותנה", "אדום"],
      },
      {
        phase: "שלב 4", label: "אמת — P(כד ב׳|אדום)",
        contextWords: ["P(כד ב", "1/4", "סכום", "אמת", "בדיקה", "1"],
      },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProbabilityTreePage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "163,79,38" : "139,38,53";
  const st = STATION[selectedLevel];

  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() {
    navigator.clipboard.writeText(ex.problem.split(/\n+סעיף/)[0].trim());
    setCopiedProblem(true);
    setTimeout(() => setCopiedProblem(false), 2000);
  }

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#F3EFE0",
        backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        color: "#2D3436",
        ["--lvl-rgb" as string]: lvlRgb,
      }}
    >
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>עצי הסתברות עם AI</h1>
            <p style={{ color: "#64748b", fontSize: 13, margin: "3px 0 0" }}>שליפה עם/ללא החזרה, הסתברות מותנה ומשפט בייס</p>
          </div>
          <Link
            href="/topic/probability"
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

        {/* Tab selector */}
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(60,54,42,0.15)" }}>
          {TABS.map(tab => {
            const active = selectedLevel === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedLevel(tab.id)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active ? `${tab.bg} border ${tab.border} ${tab.textColor}` : "text-stone-500 hover:text-stone-800"}`}
                style={active ? { boxShadow: `0 0 14px ${tab.glowColor}` } : undefined}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active exercise island */}
        <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginBottom: "2rem" }}>

          {/* Station badge + title */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${st.badgeCls}`}>{st.badge}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#1A1A1A" }}>{ex.title}</span>
          </div>

          {/* FormulaBar */}
          <FormulaBar accentColor={st.accentColor} accentRgb={st.glowRgb} />

          {/* Diagram */}
          <div style={{ borderRadius: 16, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: 12, marginBottom: "1.5rem" }}>
            {ex.diagram}
          </div>

          {/* Problem statement */}
          <div style={{ borderRadius: 16, border: `1px solid rgba(${st.borderRgb},0.35)`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>📝 השאלה</div>
              <button
                onClick={handleCopyProblem}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.1)" : "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.2)", color: copiedProblem ? "#15803d" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}
              >
                {copiedProblem ? <Check size={11} /> : <Copy size={11} />}
                {copiedProblem ? "הועתק!" : "העתק"}
              </button>
            </div>
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
          {selectedLevel === "basic"    && <LadderBase     ex={ex} accentColor={st.accentColor} accentRgb={st.glowRgb} />}
          {selectedLevel === "medium"   && <LadderMedium   ex={ex} accentColor={st.accentColor} accentRgb={st.glowRgb} />}
          {selectedLevel === "advanced" && <LadderAdvanced ex={ex} accentColor={st.accentColor} accentRgb={st.glowRgb} />}
        </section>

        {/* Lab */}
        <TreeLab levelId={selectedLevel} />

      </div>
    </main>
  );
}
