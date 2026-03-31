"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import SubtopicProgress from "@/app/components/SubtopicProgress";

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
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",   accentColor: "#16A34A", borderHex: "#2D5A27", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני", badgeCls: "bg-orange-600 text-white", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12",  accentColor: "#EA580C", borderHex: "#A34F26", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38",  accentColor: "#DC2626", borderHex: "#8B2635", borderRgb: "139,38,53"  },
} as const;

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "basic"    as const, label: "בסיסי — גדר שלוש צלעות",   bg: "bg-green-50",  border: "border-green-600",  textColor: "text-green-700",  glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium"   as const, label: "בינוני — חלון נורמן",       bg: "bg-orange-50", border: "border-orange-600", textColor: "text-orange-700", glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced" as const, label: "מתקדם — חוט לריבוע ועיגול", bg: "bg-red-50",    border: "border-red-700",    textColor: "text-red-700",    glowColor: "rgba(220,38,38,0.3)"   },
] as const;

// ─── Formulas ─────────────────────────────────────────────────────────────────

const FORMULAS = [
  { label: "שטח מלבן",        formula: "A(x) = x·y" },
  { label: "אילוץ",           formula: "2x+y=L" },
  { label: "היקף חצי עיגול", formula: "πr" },
  { label: "קיצון",           formula: "A′(x) = 0" },
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

// ─── Static SVG Diagrams ──────────────────────────────────────────────────────

function FenceStaticDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>הגדרת הבעיה — גדר שלוש צלעות</p>
      <svg width="100%" viewBox="0 0 320 160" style={{ maxWidth: "100%" }}>
        <rect x="55" y="22" width="210" height="9" fill="#475569" rx="3" />
        <text x="160" y="18" textAnchor="middle" fill="#94a3b8" fontSize="11">קיר — לא נדרשת גדר</text>
        <rect x="55" y="31" width="210" height="100" fill="#22c55e08" stroke="#22c55e" strokeWidth="2" rx="2" />
        {[0,1,2,3,4,5,6].map(i => <line key={i} x1={55} y1={42+i*13} x2={47} y2={42+i*13} stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />)}
        {[0,1,2,3,4,5,6].map(i => <line key={i} x1={265} y1={42+i*13} x2={273} y2={42+i*13} stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />)}
        {[0,1,2,3,4,5,6,7,8].map(i => <line key={i} x1={65+i*21} y1={131} x2={65+i*21} y2={139} stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />)}
        <text x="33" y="86" textAnchor="middle" fill="#22c55e" fontSize="14" fontWeight="bold">x</text>
        <text x="287" y="86" textAnchor="middle" fill="#22c55e" fontSize="14" fontWeight="bold">x</text>
        <text x="160" y="86" textAnchor="middle" fill="#f97316" fontSize="14" fontWeight="bold">y</text>
        <text x="160" y="153" textAnchor="middle" fill="#94a3b8" fontSize="11">L = 60 מ׳ (סך כל הגדר)</text>
      </svg>
    </div>
  );
}

function NormanStaticDiagram() {
  const CX = 160, RECT_TOP = 95, H = 65, R = 55;
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>חלון נורמן — מלבן + חצי עיגול</p>
      <svg width="100%" viewBox="0 0 320 185" style={{ maxWidth: "100%" }}>
        <path d={`M ${CX-R} ${RECT_TOP} A ${R} ${R} 0 0 1 ${CX+R} ${RECT_TOP}`} fill="#f59e0b10" stroke="#f59e0b" strokeWidth="2" />
        <rect x={CX-R} y={RECT_TOP} width={R*2} height={H} fill="#f59e0b08" stroke="#f59e0b" strokeWidth="2" />
        <line x1={CX+R+12} y1={RECT_TOP} x2={CX+R+12} y2={RECT_TOP+H} stroke="#f97316" strokeWidth="1.5" strokeDasharray="4,2" />
        <line x1={CX+R+7} y1={RECT_TOP} x2={CX+R+17} y2={RECT_TOP} stroke="#f97316" strokeWidth="1.5" />
        <line x1={CX+R+7} y1={RECT_TOP+H} x2={CX+R+17} y2={RECT_TOP+H} stroke="#f97316" strokeWidth="1.5" />
        <text x={CX+R+26} y={RECT_TOP+H/2+4} fill="#f97316" fontSize="12" fontWeight="bold">h</text>
        <line x1={CX-R} y1={RECT_TOP+H+14} x2={CX+R} y2={RECT_TOP+H+14} stroke="#22c55e" strokeWidth="1.5" />
        <line x1={CX-R} y1={RECT_TOP+H+9} x2={CX-R} y2={RECT_TOP+H+19} stroke="#22c55e" strokeWidth="1.5" />
        <line x1={CX+R} y1={RECT_TOP+H+9} x2={CX+R} y2={RECT_TOP+H+19} stroke="#22c55e" strokeWidth="1.5" />
        <text x={CX} y={RECT_TOP+H+28} textAnchor="middle" fill="#22c55e" fontSize="11">2r</text>
        <text x={160} y={22} textAnchor="middle" fill="#94a3b8" fontSize="11">היקף כולל = 12 מ׳</text>
      </svg>
    </div>
  );
}

function WireStaticDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>חיתוך חוט — ריבוע ועיגול</p>
      <svg width="100%" viewBox="0 0 320 165" style={{ maxWidth: "100%" }}>
        <line x1="20" y1="32" x2="300" y2="32" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
        <text x="160" y="20" textAnchor="middle" fill="#94a3b8" fontSize="11">חוט L = 100 ס״מ</text>
        <line x1="175" y1="18" x2="175" y2="46" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
        <text x="100" y="27" textAnchor="middle" fill="#3b82f6" fontSize="10">← x ס״מ →</text>
        <text x="245" y="27" textAnchor="middle" fill="#f43f5e" fontSize="10">← 100−x →</text>
        <line x1="90" y1="46" x2="75" y2="68" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4,2" />
        <rect x="35" y="70" width="80" height="80" fill="#3b82f633" stroke="#3b82f6" strokeWidth="2" rx="2" />
        <text x="75" y="115" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="bold">ריבוע</text>
        <text x="75" y="130" textAnchor="middle" fill="#3b82f6" fontSize="10">צלע = x/4</text>
        <line x1="245" y1="46" x2="250" y2="68" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4,2" />
        <circle cx="255" cy="112" r="42" fill="#f43f5e15" stroke="#f43f5e" strokeWidth="2" />
        <text x="255" y="110" textAnchor="middle" fill="#f43f5e" fontSize="11" fontWeight="bold">עיגול</text>
        <text x="255" y="126" textAnchor="middle" fill="#f43f5e" fontSize="10">r = (100−x)/2π</text>
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
  const st = STATION[ex.id as keyof typeof STATION];
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
  const st = STATION[ex.id as keyof typeof STATION];
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
  const st = STATION[ex.id as keyof typeof STATION];
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
              <p style={{ color: "#14532d", fontWeight: 700, fontSize: 15, margin: "4px 0 0" }}>חיתוך חוט אופטימלי — מאסטר בחדו&quot;א!</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Interactive Lab Components ───────────────────────────────────────────────

function FenceViz({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  const [w, setW] = useState(15);
  const st = STATION[levelId];
  const L = 60 - 2 * w;
  const A = w * L;
  const atMax = w === 15;

  const SW = 220, SH = 190, pad = 28;
  const maxW = 25, maxL = 60 - 2 * 5;
  const avW = SW - pad * 2, avH = SH - pad * 2;
  const rW = (w / maxW) * avW, rH = (L / maxL) * avH;
  const rX = pad + (avW - rW) / 2, rY = pad + (avH - rH) / 2;
  const CP = 24, maxA = 15 * 30;
  const pts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const wi = 5 + (i / 80) * 20;
    const ai = wi * (60 - 2 * wi);
    pts.push(`${CP + ((wi-5)/20)*(SW-CP*2)},${SH-CP-(ai/maxA)*(SH-CP*2)}`);
  }
  const dotX = CP + ((w-5)/20)*(SW-CP*2);
  const dotY = SH - CP - (A/maxA)*(SH-CP*2);
  const maxDotX = CP + (10/20)*(SW-CP*2);
  const maxDotY = SH - CP - (450/maxA)*(SH-CP*2);

  return (
    <section style={{ borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", border: `1px solid ${st.glowBorder}`, boxShadow: st.glowShadow, marginBottom: "2rem", marginLeft: "auto", marginRight: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2D3436", margin: 0 }}>גדר 60 מ׳ — מעבדה אינטראקטיבית</h2>
        {atMax && <span style={{ color: "#16a34a", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />מקסימום!</span>}
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        <div style={{ borderRadius: 12, background: "#0f172a", border: "1px solid #334155", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>חלקה מלבנית</p>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            <line x1={rX} y1={rY} x2={rX+rW} y2={rY} stroke="#94a3b8" strokeWidth={4} strokeLinecap="round" />
            <text x={rX+rW/2} y={rY-5} fill="#94a3b8" fontSize={9} textAnchor="middle">קיר</text>
            <motion.rect animate={{ x: rX, y: rY, width: rW, height: rH }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              fill={atMax ? "#10b98120" : "#22c55e10"} stroke={atMax ? "#10b981" : "#22c55e"} strokeWidth={atMax ? 2.5 : 1.5} rx={2} />
            <motion.text animate={{ x: rX+rW/2, y: rY+rH+14 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              fill="#22c55e" fontSize={10} textAnchor="middle">x={w}מ׳</motion.text>
            <motion.text animate={{ x: rX+rW+14, y: rY+rH/2+4 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              fill="#f97316" fontSize={10} textAnchor="middle">y={L}</motion.text>
          </svg>
        </div>
        <div style={{ borderRadius: 12, background: "#0f172a", border: "1px solid #334155", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>A(x) = x·(60−2x)</p>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            <polyline points={pts.join(" ")} fill="none" stroke="#22c55e" strokeWidth={2} opacity={0.8} />
            <line x1={CP} y1={SH-CP} x2={SW-CP/2} y2={SH-CP} stroke="#334155" strokeWidth={1} />
            <line x1={CP} y1={CP/2} x2={CP} y2={SH-CP} stroke="#334155" strokeWidth={1} />
            <circle cx={maxDotX} cy={maxDotY} r={9} fill="#10b98130" />
            <circle cx={maxDotX} cy={maxDotY} r={5} fill="#10b981" />
            <text x={maxDotX+8} y={maxDotY-6} fill="#10b981" fontSize={9}>max</text>
            <motion.line animate={{ x1: dotX, x2: dotX }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              y1={SH-CP} y2={CP/2} stroke="#f97316" strokeWidth={1} strokeDasharray="4,3" />
            <motion.circle animate={{ cx: dotX, cy: dotY }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              r={atMax ? 7 : 5} fill={atMax ? "#10b981" : "#f97316"} stroke="#0f172a" strokeWidth={2} />
            <motion.text animate={{ x: dotX+8, y: Math.max(dotY-4, 12) }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              fill={atMax ? "#10b981" : "#f97316"} fontSize={10}>A={A}</motion.text>
            <text x={CP+2} y={SH-CP+12} fill="#334155" fontSize={8}>x=5</text>
            <text x={SW-CP-12} y={SH-CP+12} fill="#334155" fontSize={8}>x=25</text>
          </svg>
        </div>
      </div>
      <div style={{ marginTop: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
          <span style={{ color: "#64748b" }}>רוחב <span style={{ fontFamily: "monospace", color: "#2D3436" }}>x</span></span>
          <span style={{ fontFamily: "monospace", color: atMax ? "#16a34a" : "#2D3436", fontWeight: 700 }}>{w} מ׳</span>
        </div>
        <input type="range" min={5} max={25} step={1} value={w}
          onChange={e => setW(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#16a34a" }} />
        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>גרור לעבר x=15 כדי למצוא את המקסימום</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: "1rem", textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>רוחב x</p>
          <p style={{ fontFamily: "monospace", color: "#1A1A1A", fontWeight: 700 }}>{w} מ׳</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>אורך y</p>
          <p style={{ fontFamily: "monospace", color: "#1A1A1A", fontWeight: 700 }}>{L} מ׳</p>
        </div>
        <div style={{ background: atMax ? "rgba(220,252,231,0.7)" : "rgba(255,255,255,0.75)", border: atMax ? "1px solid #86efac" : "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, transition: "all 0.3s" }}>
          <p style={{ color: atMax ? "#16a34a" : "#94a3b8", marginBottom: 4 }}>שטח A</p>
          <p style={{ fontFamily: "monospace", color: atMax ? "#15803d" : "#1A1A1A", fontWeight: 700 }}>{A} מ²</p>
        </div>
      </div>
    </section>
  );
}

function NormanViz({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  const [r, setR] = useState(1.4);
  const st = STATION[levelId];
  const PI = Math.PI;
  const h = Math.max(0, (12 - r*(2+PI))/2);
  const A = 2*r*h + 0.5*PI*r*r;
  const rOpt = 12/(4+PI);
  const COEFF = 2 + PI/2;
  const atMax = Math.abs(r - rOpt) < 0.06;

  const SW = 220, SH = 190, scale = 55;
  const rPx = Math.min(r*scale, 80), hPx = Math.min(h*scale, 100);
  const cx = SW/2, rectTop = SH-20-hPx, rectBot = SH-20;

  const CP = 24, maxAGraph = 12;
  const normanPts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const ri = 0.3 + (i/80)*2.1;
    const ai = Math.max(0, 12*ri - COEFF*ri*ri);
    normanPts.push(`${CP+(i/80)*(SW-CP*2)},${SH-CP-(ai/maxAGraph)*(SH-CP*2)}`);
  }
  const dotXg = CP + ((r-0.3)/2.1)*(SW-CP*2);
  const dotYg = SH-CP-(Math.max(0,A)/maxAGraph)*(SH-CP*2);
  const maxDotXg = CP + ((rOpt-0.3)/2.1)*(SW-CP*2);
  const maxAVal = 12*rOpt - COEFF*rOpt*rOpt;
  const maxDotYg = SH-CP-(maxAVal/maxAGraph)*(SH-CP*2);

  return (
    <section style={{ borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", border: `1px solid ${st.glowBorder}`, boxShadow: st.glowShadow, marginBottom: "2rem", marginLeft: "auto", marginRight: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2D3436", margin: 0 }}>חלון נורמן — מעבדה אינטראקטיבית</h2>
        {atMax && <span style={{ color: "#ea580c", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />מקסימום!</span>}
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        <div style={{ borderRadius: 12, background: "#ffffff", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#64748b", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>צורת החלון</p>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            <motion.rect animate={{ x: cx-rPx, y: rectTop, width: rPx*2, height: hPx }}
              transition={{ type: "spring", stiffness: 250, damping: 28 }}
              fill={atMax ? "#10b98115" : "#f59e0b10"} stroke={atMax ? "#10b981" : "#f59e0b"} strokeWidth={atMax ? 2.5 : 1.5} />
            <motion.path animate={{ d: `M ${cx-rPx} ${rectTop} A ${rPx} ${rPx} 0 0 1 ${cx+rPx} ${rectTop}` }}
              transition={{ type: "spring", stiffness: 250, damping: 28 }}
              fill={atMax ? "#10b98115" : "#f59e0b10"} stroke={atMax ? "#10b981" : "#f59e0b"} strokeWidth={atMax ? 2.5 : 1.5} />
            <motion.text animate={{ x: cx, y: rectBot+14 }} transition={{ type: "spring", stiffness: 250, damping: 28 }}
              textAnchor="middle" fill="#16a34a" fontSize={9}>2r={(2*r).toFixed(2)}מ׳</motion.text>
            <motion.text animate={{ x: cx+rPx+18, y: rectTop+hPx/2 }} transition={{ type: "spring", stiffness: 250, damping: 28 }}
              textAnchor="middle" fill="#ea580c" fontSize={9}>h={h.toFixed(2)}</motion.text>
          </svg>
        </div>
        <div style={{ borderRadius: 12, background: "#ffffff", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#64748b", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>A(r) = 12r − (2+π/2)r²</p>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            <polyline points={normanPts.join(" ")} fill="none" stroke="#f59e0b" strokeWidth={2} opacity={0.8} />
            <line x1={CP} y1={SH-CP} x2={SW-CP/2} y2={SH-CP} stroke="#cbd5e1" strokeWidth={1} />
            <line x1={CP} y1={CP/2} x2={CP} y2={SH-CP} stroke="#cbd5e1" strokeWidth={1} />
            <circle cx={maxDotXg} cy={maxDotYg} r={9} fill="#f59e0b30" />
            <circle cx={maxDotXg} cy={maxDotYg} r={5} fill="#f59e0b" />
            <text x={maxDotXg+8} y={maxDotYg-6} fill="#f59e0b" fontSize={9}>max</text>
            <motion.line animate={{ x1: dotXg, x2: dotXg }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              y1={SH-CP} y2={CP/2} stroke="#a78bfa" strokeWidth={1} strokeDasharray="4,3" />
            <motion.circle animate={{ cx: dotXg, cy: dotYg }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              r={atMax ? 7 : 5} fill={atMax ? "#f59e0b" : "#a78bfa"} stroke="#ffffff" strokeWidth={2} />
            <motion.text animate={{ x: dotXg+8, y: Math.max(dotYg-4, 12) }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              fill={atMax ? "#f59e0b" : "#7c3aed"} fontSize={10}>A={A.toFixed(2)}</motion.text>
            <text x={CP+2} y={SH-CP+12} fill="#94a3b8" fontSize={8}>r=0.3</text>
            <text x={SW-CP-14} y={SH-CP+12} fill="#94a3b8" fontSize={8}>r=2.4</text>
          </svg>
        </div>
      </div>
      <div style={{ marginTop: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
          <span style={{ color: "#64748b" }}>רדיוס <span style={{ fontFamily: "monospace", color: "#2D3436" }}>r</span></span>
          <span style={{ fontFamily: "monospace", color: atMax ? "#ea580c" : "#2D3436", fontWeight: 700 }}>{r.toFixed(2)} מ׳</span>
        </div>
        <input type="range" min={0.3} max={2.4} step={0.05} value={r}
          onChange={e => setR(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#ea580c" }} />
        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>גרור לעבר r ≈ 1.68 כדי למצוא את המקסימום</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: "1rem", textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>רדיוס r</p>
          <p style={{ fontFamily: "monospace", color: "#1A1A1A", fontWeight: 700 }}>{r.toFixed(2)} מ׳</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>גובה h</p>
          <p style={{ fontFamily: "monospace", color: "#1A1A1A", fontWeight: 700 }}>{h.toFixed(2)} מ׳</p>
        </div>
        <div style={{ background: atMax ? "rgba(255,237,213,0.7)" : "rgba(255,255,255,0.75)", border: atMax ? "1px solid #fdba74" : "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, transition: "all 0.3s" }}>
          <p style={{ color: atMax ? "#ea580c" : "#94a3b8", marginBottom: 4 }}>שטח A</p>
          <p style={{ fontFamily: "monospace", color: atMax ? "#c2410c" : "#1A1A1A", fontWeight: 700 }}>{A.toFixed(3)}</p>
        </div>
      </div>
    </section>
  );
}

function WireViz({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  const [x, setX] = useState(56);
  const st = STATION[levelId];
  const PI = Math.PI;
  const side = x/4, radius = (100-x)/(2*PI);
  const Asq = side*side, Aci = PI*radius*radius, Atotal = Asq+Aci;
  const xMin = 400/(4+PI);
  const atMin = Math.abs(x - xMin) < 1.5;

  const SW = 220, SH = 160;
  const sqPx = Math.min((x/4)*(55/25), 65);
  const rPx = Math.min(radius*(42/(100/(2*PI))), 48);
  const sqCX = 65, cirCX = 165, midY = SH/2+10;

  const SW2 = 220, SH2 = 190, CP2 = 24, maxAGraph = 800;
  const wirePts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const xi = 5 + (i/80)*90;
    const ai = xi*xi/16 + (100-xi)*(100-xi)/(4*PI);
    wirePts.push(`${CP2+(i/80)*(SW2-CP2*2)},${SH2-CP2-(ai/maxAGraph)*(SH2-CP2*2)}`);
  }
  const dotXw = CP2 + ((x-5)/90)*(SW2-CP2*2);
  const dotYw = SH2-CP2-(Atotal/maxAGraph)*(SH2-CP2*2);
  const minDotXw = CP2 + ((xMin-5)/90)*(SW2-CP2*2);
  const minAw = xMin*xMin/16 + (100-xMin)*(100-xMin)/(4*PI);
  const minDotYw = SH2-CP2-(minAw/maxAGraph)*(SH2-CP2*2);

  return (
    <section style={{ borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", border: `1px solid ${st.glowBorder}`, boxShadow: st.glowShadow, marginBottom: "2rem", marginLeft: "auto", marginRight: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2D3436", margin: 0 }}>חוט 100 ס״מ — מעבדה אינטראקטיבית</h2>
        {atMin && <span style={{ color: "#dc2626", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />מינימום!</span>}
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        <div style={{ borderRadius: 12, background: "#0f172a", border: "1px solid #334155", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>ריבוע ועיגול</p>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            <text x={sqCX} y={14} textAnchor="middle" fill="#3b82f6" fontSize={9} fontWeight="bold">ריבוע ({x}ס״מ)</text>
            <text x={cirCX} y={14} textAnchor="middle" fill="#f43f5e" fontSize={9} fontWeight="bold">עיגול ({100-x}ס״מ)</text>
            <motion.rect animate={{ x: sqCX-sqPx/2, y: midY-sqPx/2, width: sqPx, height: sqPx }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              fill="#3b82f633" stroke="#3b82f6" strokeWidth={2} />
            <motion.text animate={{ x: sqCX, y: midY+sqPx/2+12 }} transition={{ type: "spring", stiffness: 280, damping: 28 }}
              textAnchor="middle" fill="#3b82f6" fontSize={9}>צלע={side.toFixed(1)}</motion.text>
            <motion.circle animate={{ cx: cirCX, cy: midY, r: rPx }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              fill="#f43f5e33" stroke="#f43f5e" strokeWidth={2} />
            <motion.text animate={{ x: cirCX, y: midY+rPx+14 }} transition={{ type: "spring", stiffness: 280, damping: 28 }}
              textAnchor="middle" fill="#f43f5e" fontSize={9}>r={radius.toFixed(1)}</motion.text>
          </svg>
        </div>
        <div style={{ borderRadius: 12, background: "#0f172a", border: "1px solid #334155", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>A(x) = x²/16 + (100−x)²/4π</p>
          <svg width={SW2} height={SH2} viewBox={`0 0 ${SW2} ${SH2}`}>
            <polyline points={wirePts.join(" ")} fill="none" stroke="#f43f5e" strokeWidth={2} opacity={0.8} />
            <line x1={CP2} y1={SH2-CP2} x2={SW2-CP2/2} y2={SH2-CP2} stroke="#334155" strokeWidth={1} />
            <line x1={CP2} y1={CP2/2} x2={CP2} y2={SH2-CP2} stroke="#334155" strokeWidth={1} />
            <circle cx={minDotXw} cy={minDotYw} r={9} fill="#10b98130" />
            <circle cx={minDotXw} cy={minDotYw} r={5} fill="#10b981" />
            <text x={minDotXw+8} y={minDotYw-6} fill="#10b981" fontSize={9}>min</text>
            <motion.line animate={{ x1: dotXw, x2: dotXw }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              y1={SH2-CP2} y2={CP2/2} stroke="#f97316" strokeWidth={1} strokeDasharray="4,3" />
            <motion.circle animate={{ cx: dotXw, cy: dotYw }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              r={atMin ? 7 : 5} fill={atMin ? "#10b981" : "#f97316"} stroke="#0f172a" strokeWidth={2} />
            <motion.text animate={{ x: dotXw+8, y: Math.max(dotYw-4, 12) }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              fill={atMin ? "#10b981" : "#f97316"} fontSize={10}>A={Atotal.toFixed(0)}</motion.text>
            <text x={CP2+2} y={SH2-CP2+12} fill="#334155" fontSize={8}>x=5</text>
            <text x={SW2-CP2-14} y={SH2-CP2+12} fill="#334155" fontSize={8}>x=95</text>
          </svg>
        </div>
      </div>
      <div style={{ marginTop: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
          <span style={{ color: "#64748b" }}>חלק לריבוע <span style={{ fontFamily: "monospace", color: "#2D3436" }}>x</span></span>
          <span style={{ fontFamily: "monospace", color: atMin ? "#dc2626" : "#2D3436", fontWeight: 700 }}>{x} ס״מ</span>
        </div>
        <input type="range" min={5} max={95} step={1} value={x}
          onChange={e => setX(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#dc2626" }} />
        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>גרור לעבר x ≈ 56 כדי למצוא את המינימום</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: "1rem", textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(219,234,254,0.5)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#3b82f6", marginBottom: 4 }}>שטח ריבוע</p>
          <p style={{ fontFamily: "monospace", color: "#1A1A1A", fontWeight: 700 }}>{Asq.toFixed(1)}</p>
        </div>
        <div style={{ background: "rgba(255,228,230,0.5)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#f43f5e", marginBottom: 4 }}>שטח עיגול</p>
          <p style={{ fontFamily: "monospace", color: "#1A1A1A", fontWeight: 700 }}>{Aci.toFixed(1)}</p>
        </div>
        <div style={{ background: atMin ? "rgba(220,252,231,0.7)" : "rgba(255,255,255,0.75)", border: atMin ? "1px solid #86efac" : "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, transition: "all 0.3s" }}>
          <p style={{ color: atMin ? "#16a34a" : "#94a3b8", marginBottom: 4 }}>סה״כ</p>
          <p style={{ fontFamily: "monospace", color: atMin ? "#15803d" : "#1A1A1A", fontWeight: 700 }}>{Atotal.toFixed(1)}</p>
        </div>
      </div>
    </section>
  );
}

function GeometryLab({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  if (levelId === "medium")   return <NormanViz levelId={levelId} />;
  if (levelId === "advanced") return <WireViz levelId={levelId} />;
  return <FenceViz levelId={levelId} />;
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "חלקה מלבנית ליד קיר",
    problem: "חקלאי מעוניין לגדר חלקה מלבנית הצמודה לקיר אבן, כך שנדרש גידור רק עבור שלוש צלעות. לרשותו 60 מטרים של גדר. מה צריכים להיות ממדי החלקה כדי ששטחה יהיה הגדול ביותר האפשרי?",
    diagram: <FenceStaticDiagram />,
    pitfalls: [
      { title: "⚠️ שלוש צלעות בלבד", text: "הקיר פוטר את הצלע הרביעית — האילוץ הוא 2x + y = 60, לא 2x + 2y = 60." },
      { title: "תחום ההגדרה",        text: "x ו-y חייבים להיות חיוביים. לכן 0 < x < 30." },
      { title: "לאשר מקסימום",       text: "f″(x) = −4 < 0 מאשר שמדובר במקסימום ולא מינימום." },
    ],
    goldenPrompt: `\nאני תלמיד בכיתה י"א ורוצה לפתור יחד בעיית קיצון גיאומטרית:\nחקלאי גודר חלקה מלבנית צמודה לקיר אבן עם 60 מ׳ גדר (3 צלעות בלבד).\nפעל כמנטור — אל תתן פתרון מוכן. תנחה אותי שלב אחרי שלב:\n1. שאל אותי איזה משתנה לבחור ולמה.\n2. עזור לי לכתוב את האילוץ ופונקציית המטרה.\n3. תן לי לגזור ולמצוא קיצון לבד — התערב רק אם טעיתי.\nכל שלב: שאל "מוכן להמשיך?" לפני שתתקדם.`,
    steps: [
      { phase: "שלב 1", label: "הגדר משתנה ותחום",  prompt: "\n\nאני פותר בעיית קיצון: חלקה מלבנית ליד קיר עם 60 מ׳ גדר (3 צלעות). מהו המשתנה הנכון x, ומהו תחום ההגדרה שלו? שאל אותי ואל תמשיך לפני שאענה." },
      { phase: "שלב 2", label: "כתוב אילוץ ובטא y", prompt: "\n\nשני צלעות ברוחב x ואחת באורך y, סה״כ 60 מ׳. תנחה אותי לכתוב את האילוץ ולבודד y. שאל אם אני יודע כמה צלעות יש." },
      { phase: "שלב 3", label: "פונקציית מטרה",      prompt: "\n\nרוחב x, אורך y = 60−2x. הנחה אותי לכתוב f(x) = שטח ולפרוס. אל תיתן את התשובה — שאל אותי." },
      { phase: "שלב 4", label: "גזור ומצא קיצון",    prompt: "\n\nf(x) = 60x − 2x². הסבר לי כיצד לגזור פולינום ולמצוא קיצון. תן לי לנסות לבד ותאמת." },
    ],
  },
  {
    id: "medium",
    title: "חלון נורמן — מקסום שטח",
    problem: "חלון נורמן מורכב ממלבן שעליו חצי עיגול עם אותו רוחב. היקף החלון הכולל הוא 12 מטר. מצא את ממדי המלבן (רוחב 2r ואורך h) כדי למקסם את שטח החלון.",
    diagram: <NormanStaticDiagram />,
    pitfalls: [
      { title: "⚠️ היקף החצי-עיגול", text: "היקף החצי-עיגול הוא πr (לא 2πr). אל תכפיל ב-2." },
      { title: "השטח הכולל",          text: "שטח = שטח מלבן + שטח חצי-עיגול = 2rh + ½πr²." },
      { title: "תחום ההגדרה",         text: "r > 0 וגם h > 0 — בדוק שהאילוץ נותן h חיובי." },
    ],
    goldenPrompt: `\nאני תלמיד בכיתה י"א ורוצה לפתור בעיית קיצון על חלון נורמן:\nמלבן + חצי-עיגול, היקף כולל = 12 מ׳. מקסם שטח.\nנחה אותי:\n1. כיצד לכתוב את אילוץ ההיקף (זהה לי את חצי ההיקף של העיגול).\n2. כיצד לכתוב את השטח הכולל.\n3. כיצד להצביע על r המקסימלי.\nשאל "מוכן?" אחרי כל שלב.`,
    steps: [
      { phase: "שלב 1", label: "משתנה ואילוץ היקף", contextWords: ["היקף", "r", "h", "חצי-עיגול", "אילוץ", "בודד", "פי", "π"] },
      { phase: "שלב 2", label: "פונקציית שטח",       contextWords: ["שטח", "r", "h", "הצב", "פשט", "פונקציה", "מלבן"] },
      { phase: "שלב 3", label: "גזור ומצא קיצון",    contextWords: ["גזור", "נגזרת", "קיצון", "מקסימום", "r", "אפס"] },
      { phase: "שלב 4", label: "ממדי החלון",          contextWords: ["חשב", "h", "r", "שטח", "מקסימלי", "הצב"] },
    ],
  },
  {
    id: "advanced",
    title: "מינימום שטח כולל — חוט באורך L",
    problem: "חוט באורך L = 100 ס״מ נחתך לשני חלקים. מהחלק הראשון כופלים ריבוע ומהשני עיגול. כיצד לחתוך את החוט כדי שהשטח הכולל (ריבוע + עיגול) יהיה מינימלי?",
    diagram: <WireStaticDiagram />,
    pitfalls: [
      { title: "⚠️ היקף ריבוע", text: "היקף ריבוע = 4a, לכן צלע a = x/4. אל תבלבל היקף עם צלע." },
      { title: "היקף עיגול",    text: "היקף עיגול = 2πr → r = (L−x)/(2π). שטח = πr²." },
      { title: "נקודת קצה",    text: "בדוק גם x=0 וגם x=L (קצוות התחום) — ייתכן שהמינימום שם!" },
    ],
    goldenPrompt: "\n\n",
    subjectWords: ["חוט", "ריבוע", "עיגול", "שטח", "מינימום", "קיצון", "גזור", "היקף", "x"],
    subjectHint:  "חוט / ריבוע / עיגול / שטח מינימלי",
    steps: [
      { phase: "שלב 1", label: "הגדר משתנים",             contextWords: ["x", "צלע", "רדיוס", "ריבוע", "עיגול", "היקף"] },
      { phase: "שלב 2", label: "פונקציית שטח כולל",        contextWords: ["שטח", "x", "ריבוע", "עיגול", "פונקציה", "כתוב"] },
      { phase: "שלב 3", label: "גזור ומצא קיצון",          contextWords: ["גזור", "נגזרת", "קיצון", "מינימום", "x", "אפס"] },
      { phase: "שלב 4", label: "אמת מינימום ובדוק קצוות", contextWords: ["קצוות", "מינימום", "בדוק", "f", "x", "השווה"] },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KitzunGeometryPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>בעיות קיצון — גיאומטריה מישורית עם AI</h1>
            <p style={{ color: "#64748b", fontSize: 13, margin: "3px 0 0" }}>אילוצי היקף ושטח — תרגם ציור לפונקציה</p>
          </div>
          <Link
            href="/topic/kitzun"
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
        <GeometryLab levelId={selectedLevel} />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="/kitzun/geometry" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
