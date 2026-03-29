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
  { id: "basic"    as const, label: "בסיסי — משקפיים",    bg: "bg-green-50",  border: "border-green-600",  textColor: "text-green-700",  glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium"   as const, label: "בינוני — עישון",      bg: "bg-orange-50", border: "border-orange-600", textColor: "text-orange-700", glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced" as const, label: "מתקדם — נתון עקיף",  bg: "bg-red-50",    border: "border-red-700",    textColor: "text-red-700",    glowColor: "rgba(220,38,38,0.3)"   },
] as const;

// ─── Formulas ─────────────────────────────────────────────────────────────────

const FORMULAS = [
  { label: "חיתוך",        formula: "P(A∩B) = תא÷N" },
  { label: "מותנה",        formula: "P(A|B) = תא÷שורה" },
  { label: "שולית",        formula: "P(A) = שורה÷N" },
  { label: "טבלה 2×2",    formula: "Σ תאים = N" },
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
            <span style={{ color: accentColor, fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>{f.formula}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Static Table Diagrams ────────────────────────────────────────────────────

function TableGridSVGLight({ r1, r2, c1, c2, color }: { r1: string; r2: string; c1: string; c2: string; color: string }) {
  const W = 320, H = 128;
  const xs = [0, 76, 160, 240, W];
  const ys = [0, 32, 64, 96, H];

  const cellText = (text: string, xi: number, yi: number, bold = false) => {
    const cx = (xs[xi] + xs[xi + 1]) / 2;
    const cy = (ys[yi] + ys[yi + 1]) / 2 + 4;
    return (
      <text key={`${xi}-${yi}`} x={cx} y={cy} textAnchor="middle"
        fill={bold ? color : "#94a3b8"} fontSize={bold ? 10 : 9} fontWeight={bold ? "700" : "400"}>
        {text}
      </text>
    );
  };

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: "100%" }}>
      {/* Header cells - light gray */}
      {[0,1,2,3].map(xi => <rect key={`hc${xi}`} x={xs[xi]} y={ys[0]} width={xs[xi+1]-xs[xi]} height={ys[1]-ys[0]} fill="#f1f5f9" />)}
      <rect x={xs[0]} y={ys[1]} width={xs[1]-xs[0]} height={ys[2]-ys[1]} fill="#f1f5f9" />
      <rect x={xs[0]} y={ys[2]} width={xs[1]-xs[0]} height={ys[3]-ys[2]} fill="#f1f5f9" />
      <rect x={xs[0]} y={ys[3]} width={xs[1]-xs[0]} height={ys[4]-ys[3]} fill="#f1f5f9" />
      {/* Total col/row subtle */}
      <rect x={xs[3]} y={ys[1]} width={xs[4]-xs[3]} height={ys[4]-ys[1]} fill="#f8fafc" opacity={0.8} />
      <rect x={xs[1]} y={ys[3]} width={xs[3]-xs[1]} height={ys[4]-ys[3]} fill="#f8fafc" opacity={0.8} />
      {/* Grid lines */}
      {xs.map((x, i) => <line key={`v${i}`} x1={x} y1={0} x2={x} y2={H} stroke="#cbd5e1" strokeWidth={i === 0 || i === xs.length-1 ? 1.5 : 1} />)}
      {ys.map((y, i) => <line key={`h${i}`} x1={0} y1={y} x2={W} y2={y} stroke="#cbd5e1" strokeWidth={i === 0 || i === ys.length-1 ? 1.5 : 1} />)}
      {/* Column headers */}
      {cellText(c1, 1, 0, true)}
      {cellText(c2, 2, 0, true)}
      {cellText('סה"כ', 3, 0, true)}
      {/* Row headers */}
      {cellText(r1, 0, 1, true)}
      {cellText(r2, 0, 2, true)}
      {cellText('סה"כ', 0, 3, true)}
      {/* Empty data cells */}
      {[1,2,3].flatMap(xi => [1,2,3].map(yi => (
        <text key={`d${xi}${yi}`} x={(xs[xi]+xs[xi+1])/2} y={(ys[yi]+ys[yi+1])/2+4}
          textAnchor="middle" fill="#cbd5e1" fontSize={9}>—</text>
      )))}
    </svg>
  );
}

function BasicTableDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>טבלת שכיחויות — בנים/בנות × משקפיים</p>
      <TableGridSVGLight r1="בנים" r2="בנות" c1="מרכיבי משקפיים" c2="לא מרכיבים" color="#16a34a" />
    </div>
  );
}

function WorkTableDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>טבלת שכיחויות — גברים/נשים × עישון</p>
      <TableGridSVGLight r1="גברים" r2="נשים" c1="מעשנים" c2="לא מעשנים" color="#ea580c" />
    </div>
  );
}

function StudentsTableDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>טבלת שכיחויות — שנה א׳/ב׳ × מבחן</p>
      <TableGridSVGLight r1="שנה א׳" r2="שנה ב׳" c1="עברו מבחן" c2="לא עברו" color="#dc2626" />
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
    <div style={{ borderRadius: 16, border: `1px solid rgba(${accentRgb},0.3)`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", boxShadow: `0 2px 8px rgba(${accentRgb},0.08)` }}>
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
    <div style={{ borderRadius: 16, border: `1px solid rgba(${accentRgb},0.3)`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", boxShadow: `0 2px 8px rgba(${accentRgb},0.08)` }}>
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
    <div style={{ borderRadius: 16, border: `1px solid rgba(${accentRgb},0.3)`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", boxShadow: `0 2px 8px rgba(${accentRgb},0.08)` }}>
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
              <p style={{ color: "#14532d", fontWeight: 700, fontSize: 15, margin: "4px 0 0" }}>מאסטר בטבלאות שכיחות — P(שנה א&apos;)=43%, P(עבר|שנה ב&apos;)=40%!</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Table Lab ────────────────────────────────────────────────────────────────

function TableLab({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  const st = STATION[levelId];
  const [p, setP] = useState(0.25);
  const boyCount = 40, girlCount = 60;
  const boyTrait  = Math.round(p * boyCount);
  const girlTrait = Math.round(p * girlCount);
  const total = boyTrait + girlTrait;
  const atTarget = Math.abs(p - 0.25) < 0.015;

  const iconR = 6, iconGap = 15, pad = 8;

  const TW = 220, TH = 130;
  const txs = [0, 58, 122, 175, TW];
  const tys = [0, 30, 62, 94, TH];

  const tCell = (txt: string, xi: number, yi: number, highlight2 = false, isNum = false) => {
    const cx = (txs[xi] + txs[xi + 1]) / 2;
    const cy = (tys[yi] + tys[yi + 1]) / 2 + 4;
    return (
      <text key={`t${xi}${yi}`} x={cx} y={cy} textAnchor="middle"
        fill={highlight2 ? "#22c55e" : isNum ? "#e2e8f0" : "#94a3b8"}
        fontSize={isNum ? 11 : 9} fontWeight={isNum ? "700" : highlight2 ? "700" : "400"}>
        {txt}
      </text>
    );
  };

  return (
    <section style={{ borderRadius: "40px", padding: "3rem", background: "rgba(255,255,255,0.82)", border: `1px solid ${st.glowBorder}`, boxShadow: st.glowShadow, marginBottom: "2rem", marginLeft: "auto", marginRight: "auto", maxWidth: "56rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2D3436", margin: 0 }}>סימולטור טבלת שכיחויות</h2>
        {atTarget && <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />P=25% — התאמה לבעיה!</span>}
      </div>

      <div className="flex gap-4 justify-center flex-wrap items-start">
        {/* Icon grid */}
        <div style={{ borderRadius: 12, background: "#0f172a", border: "1px solid #334155", overflow: "hidden", padding: 12 }}>
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 8 }}>100 אנשים — כהה=ללא תכונה, בהיר=עם תכונה</p>
          <svg width={172} height={172} viewBox="0 0 172 172">
            {Array.from({ length: 100 }, (_, i) => {
              const row = Math.floor(i / 10);
              const col = i % 10;
              const cx = pad + col * iconGap + iconR;
              const cy = pad + row * iconGap + iconR;
              const isBoy   = i < boyCount;
              const hasTrait = isBoy ? i < boyTrait : (i - boyCount) < girlTrait;
              const fill = isBoy ? (hasTrait ? "#3b82f6" : "#1e3a5f") : (hasTrait ? "#f43f5e" : "#4a1828");
              const stroke = hasTrait ? (isBoy ? "#93c5fd" : "#fda4af") : "none";
              return <circle key={i} cx={cx} cy={cy} r={iconR - 0.5} fill={fill} stroke={stroke} strokeWidth={hasTrait ? 1 : 0} />;
            })}
          </svg>
          <div className="flex gap-3 mt-2 justify-center" style={{ fontSize: 11, color: "#94a3b8" }}>
            <span className="flex items-center gap-1"><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: "#3b82f6" }} />בנים</span>
            <span className="flex items-center gap-1"><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: "#f43f5e" }} />בנות</span>
          </div>
        </div>

        {/* Live 2×2 table */}
        <div style={{ borderRadius: 12, background: "#0f172a", border: "1px solid #334155", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>טבלה — מתעדכנת בזמן אמת</p>
          <svg width={TW} height={TH} viewBox={`0 0 ${TW} ${TH}`}>
            <rect x={txs[0]} y={tys[0]} width={TW} height={tys[1]-tys[0]} fill="#1e293b" />
            <rect x={txs[0]} y={tys[1]} width={txs[1]-txs[0]} height={TH-tys[1]} fill="#1e293b" />
            <rect x={txs[3]} y={tys[1]} width={txs[4]-txs[3]} height={TH-tys[1]} fill="#0f172a" opacity={0.6} />
            <rect x={txs[1]} y={tys[3]} width={txs[3]-txs[1]} height={tys[4]-tys[3]} fill="#0f172a" opacity={0.6} />
            {txs.map((x, i) => <line key={`v${i}`} x1={x} y1={0} x2={x} y2={TH} stroke="#334155" strokeWidth={1} />)}
            {tys.map((y, i) => <line key={`h${i}`} x1={0} y1={y} x2={TW} y2={y} stroke="#334155" strokeWidth={1} />)}
            {tCell("עם תכונה", 1, 0)} {tCell("ללא תכונה", 2, 0)} {tCell('סה"כ', 3, 0)}
            {tCell("בנים", 0, 1)} {tCell("בנות", 0, 2)} {tCell('סה"כ', 0, 3)}
            {tCell(String(boyTrait), 1, 1, false, true)} {tCell(String(boyCount - boyTrait), 2, 1, false, true)} {tCell(String(boyCount), 3, 1, false, true)}
            {tCell(String(girlTrait), 1, 2, false, true)} {tCell(String(girlCount - girlTrait), 2, 2, false, true)} {tCell(String(girlCount), 3, 2, false, true)}
            {tCell(String(total), 1, 3, atTarget, true)} {tCell(String(100 - total), 2, 3, false, true)} {tCell("100", 3, 3, false, true)}
          </svg>
        </div>
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
          <span style={{ color: "#64748b" }}>P(תכונה) = <span style={{ fontFamily: "monospace", color: "#2D3436" }}>{(p * 100).toFixed(0)}%</span></span>
          <span style={{ fontFamily: "monospace", fontSize: 13, color: atTarget ? "#22c55e" : "#2D3436", fontWeight: atTarget ? 700 : 400 }}>עם תכונה: {total}/100</span>
        </div>
        <input type="range" min={0.05} max={0.95} step={0.01} value={p}
          onChange={e => setP(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#22c55e" }} />
        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>גרור ל-25% כדי להתאים לבעיה המקורית</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: "1rem", textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>P(תכונה ∩ בנים)</p>
          <p style={{ fontFamily: "monospace", color: "#3b82f6", fontWeight: 700 }}>{boyTrait}/100 = {boyTrait}%</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>P(תכונה | בנים)</p>
          <p style={{ fontFamily: "monospace", color: "#f43f5e", fontWeight: 700 }}>{boyTrait}/{boyCount} = {(boyTrait / boyCount * 100).toFixed(0)}%</p>
        </div>
        <div style={{ background: atTarget ? "rgba(220,252,231,0.7)" : "rgba(255,255,255,0.75)", border: atTarget ? "1px solid #86efac" : "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, transition: "all 0.3s" }}>
          <p style={{ color: atTarget ? "#16a34a" : "#94a3b8", marginBottom: 4 }}>P(תכונה) כולל</p>
          <p style={{ fontFamily: "monospace", color: atTarget ? "#15803d" : "#1A1A1A", fontWeight: 700 }}>{total}/100 = {total}%</p>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, marginTop: 12, fontSize: 12, color: "#64748b" }}>
        <span style={{ color: st.accentColor, fontWeight: 600 }}>P(A ∩ B)</span> = תא בטבלה ÷ סה&quot;כ הכולל &nbsp;|&nbsp; <span style={{ color: "#ea580c", fontWeight: 600 }}>P(A | B)</span> = תא בטבלה ÷ סה&quot;כ השורה/עמודה
      </div>
    </section>
  );
}

// ─── Exercises ────────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "טבלת שכיחויות — בנים, בנות ומשקפיים",
    problem: "בבית ספר 100 תלמידים: 40 בנים ו-60 בנות. מתוך הבנים, 10 מרכיבי משקפיים. מתוך הבנות, 15 מרכיבות משקפיים. בחרנו תלמיד/ית באקראי:\n(א) מלא טבלת שכיחויות.\n(ב) מה ההסתברות שהתלמיד/ית מרכיב/ה משקפיים?\n(ג) מה ההסתברות שהתלמיד/ית גם בן וגם מרכיב/ה משקפיים?\n(ד) בהינתן שהתלמיד/ית בן, מה ההסתברות שמרכיב/ה משקפיים?",
    diagram: <BasicTableDiagram />,
    pitfalls: [
      { title: "⚠️ חיתוך לעומת מותנה", text: "P(A ∩ B) = תא ÷ סה\"כ הכולל (100). P(A|B) = תא ÷ סה\"כ השורה/עמודה. שאלות ג' ו-ד' שואלות דברים שונים לגמרי!" },
      { title: "מלא מימין לשמאל", text: "השלם קודם את הידוע, אחר כך חסר מסה\"כ. פינת הימין התחתונה = סה\"כ כולל (100)." },
      { title: "ב' לפני ג' ו-ד'", text: "שאלה ב' שואלת P(משקפיים) מהעמודה = 25/100. שאלה ג' שואלת חיתוך = 10/100. שאלה ד' שואלת מותנה = 10/40." },
    ],
    goldenPrompt: `\n\nאני תלמיד/ית ורוצה לפתור בעיית טבלת שכיחויות:\n100 תלמידים: 40 בנים, 60 בנות. 10 בנים עם משקפיים, 15 בנות עם משקפיים.\nנחה אותי:\n1. כיצד למלא את הטבלה שלב אחר שלב.\n2. מה ההבדל בין ב׳ (הסתברות כללית), ג׳ (חיתוך) ו-ד׳ (מותנה).\n3. כיצד לחשב כל אחת מהשאלות מהטבלה.\nשאל "מוכן?" בין שלב לשלב.`,
    steps: [
      {
        phase: "שלב 1", label: "מלא את הטבלה — שאלה א׳",
        prompt: "\n\nיש לי 100 תלמידים: 40 בנים, 60 בנות. 10 בנים עם משקפיים, 15 בנות עם משקפיים. הנחה אותי למלא טבלת שכיחויות 2×2 שלב אחר שלב. שאל אם יודע מאיפה מתחילים.",
      },
      {
        phase: "שלב 2", label: "P(משקפיים) כללי — שאלה ב׳",
        prompt: "\n\nהטבלה מולאה: 25 תלמידים עם משקפיים מתוך 100. הנחה אותי לחשב P(משקפיים) — ההסתברות הכללית. שאל אם יודע מאיזה מספר בטבלה לקחת.",
      },
      {
        phase: "שלב 3", label: "P(בן ∩ משקפיים) חיתוך — שאלה ג׳",
        prompt: "\n\n10 בנים עם משקפיים מתוך 100 תלמידים. הנחה אותי לחשב P(בן ∩ משקפיים) ולהסביר מדוע מחלקים ב-100 ולא ב-40. שאל מה ההבדל בין ∩ לבין |.",
      },
      {
        phase: "שלב 4", label: "P(משקפיים | בן) מותנה — שאלה ד׳",
        prompt: "\n\nP(משקפיים|בן) = ? הנחה אותי לחשב הסתברות מותנה מהטבלה ולהשוות לשאלה ג׳. מה מסד הנמנה כשיודעים שהתלמיד/ית בן? שאל לפני שתמשיך.",
      },
    ],
  },
  {
    id: "medium",
    title: "טבלת שכיחויות — עובדים ועישון",
    problem: "200 עובדים בחברה. 60% גברים, 40% נשים. 20% מהגברים מעשנים, 10% מהנשים מעשנות. בחרנו עובד/ת באקראי:\n(א) מלא טבלת שכיחויות.\n(ב) מה ההסתברות שהעובד/ת מעשן/ת?\n(ג) מה ההסתברות שהעובד/ת גם גבר וגם מעשן?\n(ד) בהינתן שהעובד/ת מעשן/ת, מה ההסתברות שהוא/היא גבר?",
    diagram: <WorkTableDiagram />,
    pitfalls: [
      { title: "⚠️ 20% מהגברים — לא מ-200", text: "20% מהגברים (120) = 24 מעשנים. לא 20% מ-200. קרא שוב: 'מ-' מציין את קבוצת הייחוס." },
      { title: "P(מעשן) ≠ 20%", text: "P(מעשן הכולל) = (24+8)/200 = 32/200 = 16%. ממוצע משוקלל, לא פשוט (20%+10%)/2." },
      { title: "⚠️ שאלות ג' ו-ד' — הפוכות!", text: "שאלה ג': P(גבר ∩ מעשן) = 24/200 = 12%. שאלה ד': P(גבר|מעשן) = 24/32 = 75%. שתי שאלות שונות לחלוטין — מרחב הדוגמה שונה!" },
    ],
    goldenPrompt: `\n\nאני תלמיד/ית ורוצה לפתור בעיית טבלת שכיחויות:\n200 עובדים: 60% גברים, 20% מהגברים מעשנים, 10% מהנשים מעשנות. בחרנו עובד/ת באקראי.\nנחה אותי:\n1. כיצד להמיר אחוזים לכמויות ולמלא טבלת שכיחויות.\n2. כיצד לחשב P(מעשן/ת) הכולל.\n3. מה ההבדל בין P(גבר∩מעשן) לבין P(גבר|מעשן).\nשאל "מוכן?" בין שלב לשלב.`,
    steps: [
      {
        phase: "שלב 1", label: "המר אחוזים לכמויות",
        contextWords: ["המר", "אחוזים", "כמויות", "גברים", "נשים", "120", "80", "מעשנים", "24"],
      },
      {
        phase: "שלב 2", label: "מלא את הטבלה המלאה",
        contextWords: ["מלא", "טבלה", "אמת", "שורות", "עמודות", "סכום", "בדיקה", "200"],
      },
      {
        phase: "שלב 3", label: "P(מעשן/ת) כללי — שאלה ב׳",
        contextWords: ["P(מעשן", "הסתברות", "כללי", "ממוצע", "משוקלל", "32", "200", "16%"],
      },
      {
        phase: "שלב 4", label: "חיתוך ומותנה — שאלות ג׳ ו-ד׳",
        contextWords: ["חיתוך", "מותנה", "גבר", "מעשן", "24", "200", "32", "הבדל"],
      },
    ],
  },
  {
    id: "advanced",
    title: "טבלת שכיחויות — הסתברות מורכבת עם נתון חלקי",
    problem: "300 סטודנטים: שנה א' ושנה ב'. 146 עברו את המבחן. מתוך העוברים, 53.4% הם שנה א'. שיעור ההצלחה של שנה א' הוא 60% ושל שנה ב' הוא 40%. בחרנו סטודנט/ית באקראי:\n(א) מלא את הטבלה.\n(ב) מה ההסתברות שהסטודנט/ית משנה א'?\n(ג) מה ההסתברות שהסטודנט/ית גם משנה א' וגם עבר/ה את המבחן?\n(ד) בהינתן שהסטודנט/ית משנה ב', מה ההסתברות שעבר/ה את המבחן?",
    diagram: <StudentsTableDiagram />,
    pitfalls: [
      { title: "⚠️ נתון עקיף", text: "\"53.4% מהעוברים הם שנה א'\" = P(שנה א'|עבר). הפוך את הכיוון: חשב כמה שנה א' עברו ואז כמה סטודנטים בשנה א'." },
      { title: "שתי דרכים לאותו תא", text: "ניתן לאמת: שנה א' שעברו = X, שיעור 60% → X/שנה_א' = 0.6. שתי משוואות, שני נעלמים." },
      { title: "P(עבר|שנה ב') ≠ 40%", text: "הנתון 40% הוא שיעור ההצלחה של שנה ב' — זה בדיוק P(עבר|שנה ב'). רק ודא שהמספרים עולים בקנה אחד." },
    ],
    goldenPrompt: "\n\n",
    subjectWords: ["טבלה", "מותנה", "חיתוך", "הסתברות", "שורה", "עמודה", "P", "עברו"],
    subjectHint: "טבלה / מותנה / חיתוך / הסתברות / P",
    steps: [
      {
        phase: "שלב 1", label: "כמה שנה א' עברו?",
        contextWords: ["53.4%", "146", "שנה א", "עברו", "78", "חשב", "כמה", "חלוקה"],
      },
      {
        phase: "שלב 2", label: "מצא גודל כל שנה",
        contextWords: ["60%", "78", "130", "170", "שנה א", "שנה ב", "גודל", "0.6"],
      },
      {
        phase: "שלב 3", label: "מלא הטבלה המלאה",
        contextWords: ["מלא", "טבלה", "52", "102", "אמת", "סכומים", "300"],
      },
      {
        phase: "שלב 4", label: "ענה על שאלות ב׳, ג׳ ו-ד׳",
        contextWords: ["P(שנה", "עבר", "חיתוך", "מותנה", "130", "78", "68", "43"],
      },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProbabilityTablePage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>טבלאות שכיחויות עם AI</h1>
            <p style={{ color: "#64748b", fontSize: 13, margin: "3px 0 0" }}>חיתוך, הסתברות מותנה, וקריאת נתונים מטבלה</p>
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
        <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: "40px", padding: "3rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", maxWidth: "56rem", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginBottom: "2rem" }}>

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
          <div style={{ borderRadius: 16, border: `1px solid rgba(${st.borderRgb},0.35)`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", marginBottom: "1.5rem" }}>
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
        <TableLab levelId={selectedLevel} />

      </div>
    </main>
  );
}
