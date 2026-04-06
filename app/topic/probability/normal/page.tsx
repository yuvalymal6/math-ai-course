"use client";

import { useState } from "react";
import { Check, Copy, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import SubtopicProgress from "@/app/components/SubtopicProgress";

// ─── Global style ─────────────────────────────────────────────────────────────

const GLOBAL_CSS = `*:focus{outline:none!important;box-shadow:none!important;}`;

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

const NORMAL_SUBJECT_WORDS = [
  "התפלגות", "נורמלית", "ממוצע", "סטיית תקן", "z", "ציון תקן", "אחוזון", "טבלה",
];

// ─── Silent SVG Diagrams ─────────────────────────────────────────────────────

function BellCurveBasic() {
  // Simple bell curve with mu marked, one shaded region
  const w = 260, h = 160, cx = 130, cy = 140;
  const curve = `M 20,${cy} C 50,${cy} 70,30 ${cx},28 C 190,30 210,${cy} 240,${cy}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm mx-auto" aria-hidden>
      {/* shaded region right of mu */}
      <path d={`M ${cx},${cy} C 160,${cy} 170,60 ${cx + 40},50 L ${cx + 40},${cy} Z`} fill="#16a34a" fillOpacity={0.15} />
      {/* bell curve */}
      <path d={curve} fill="none" stroke="#16a34a" strokeWidth={2.5} />
      {/* baseline */}
      <line x1={10} y1={cy} x2={250} y2={cy} stroke="#94a3b8" strokeWidth={1} />
      {/* mu line */}
      <line x1={cx} y1={cy} x2={cx} y2={24} stroke="#64748b" strokeWidth={1} strokeDasharray="4,3" />
      {/* labels */}
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={12} fill="#1e293b" fontWeight={700}>μ</text>
      <text x={cx + 55} y={cy + 14} textAnchor="middle" fontSize={11} fill="#64748b">μ+σ</text>
      <text x={cx - 55} y={cy + 14} textAnchor="middle" fontSize={11} fill="#64748b">μ−σ</text>
    </svg>
  );
}

function BellCurveMedium() {
  // Bell curve with two z-scores marked, shaded area between them
  const w = 260, h = 160, cx = 130, cy = 140;
  const curve = `M 20,${cy} C 50,${cy} 70,30 ${cx},28 C 190,30 210,${cy} 240,${cy}`;
  const z1x = 85, z2x = 185;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm mx-auto" aria-hidden>
      {/* shaded region between z1 and z2 */}
      <path d={`M ${z1x},${cy} C ${z1x + 15},${cy} ${z1x + 20},55 ${cx},28 C ${cx + 20},55 ${z2x - 15},${cy} ${z2x},${cy} Z`} fill="#ea580c" fillOpacity={0.15} />
      {/* bell curve */}
      <path d={curve} fill="none" stroke="#ea580c" strokeWidth={2.5} />
      {/* baseline */}
      <line x1={10} y1={cy} x2={250} y2={cy} stroke="#94a3b8" strokeWidth={1} />
      {/* mu line */}
      <line x1={cx} y1={cy} x2={cx} y2={24} stroke="#64748b" strokeWidth={1} strokeDasharray="4,3" />
      {/* z1, z2 lines */}
      <line x1={z1x} y1={cy} x2={z1x} y2={70} stroke="#ea580c" strokeWidth={1.5} strokeDasharray="4,3" />
      <line x1={z2x} y1={cy} x2={z2x} y2={70} stroke="#ea580c" strokeWidth={1.5} strokeDasharray="4,3" />
      {/* labels */}
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={12} fill="#1e293b" fontWeight={700}>μ</text>
      <text x={z1x} y={cy + 14} textAnchor="middle" fontSize={11} fill="#ea580c" fontWeight={600}>z&#x2081;</text>
      <text x={z2x} y={cy + 14} textAnchor="middle" fontSize={11} fill="#ea580c" fontWeight={600}>z&#x2082;</text>
    </svg>
  );
}

function BellCurveAdvanced() {
  // Two overlapping bell curves with different mu, same sigma
  const w = 280, h = 160, cy = 140;
  const cx1 = 110, cx2 = 170;
  const curve1 = `M 10,${cy} C 40,${cy} 60,30 ${cx1},28 C 160,30 180,${cy} 210,${cy}`;
  const curve2 = `M 70,${cy} C 100,${cy} 120,30 ${cx2},28 C 220,30 240,${cy} 270,${cy}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm mx-auto" aria-hidden>
      {/* curve 1 */}
      <path d={curve1} fill="#dc2626" fillOpacity={0.06} stroke="#dc2626" strokeWidth={2.5} />
      {/* curve 2 */}
      <path d={curve2} fill="#7c3aed" fillOpacity={0.06} stroke="#7c3aed" strokeWidth={2.5} />
      {/* baseline */}
      <line x1={5} y1={cy} x2={275} y2={cy} stroke="#94a3b8" strokeWidth={1} />
      {/* mu lines */}
      <line x1={cx1} y1={cy} x2={cx1} y2={24} stroke="#dc2626" strokeWidth={1} strokeDasharray="4,3" />
      <line x1={cx2} y1={cy} x2={cx2} y2={24} stroke="#7c3aed" strokeWidth={1} strokeDasharray="4,3" />
      {/* labels */}
      <text x={cx1} y={cy + 14} textAnchor="middle" fontSize={11} fill="#dc2626" fontWeight={700}>μ&#x2081;</text>
      <text x={cx2} y={cy + 14} textAnchor="middle" fontSize={11} fill="#7c3aed" fontWeight={700}>μ&#x2082;</text>
    </svg>
  );
}

// ─── FormulaBar ───────────────────────────────────────────────────────────────

function FormulaBar({ accentColor, accentRgb }: { accentColor: string; accentRgb: string }) {
  const formulas = [
    { label: "ציון תקן", val: "z = (x − μ) / σ" },
    { label: "כלל 68-95-99.7", val: "68%→±1σ | 95%→±2σ | 99.7%→±3σ" },
    { label: "הסתברות בתחום", val: "P(a<X<b) = Φ(z_b) − Φ(z_a)" },
    { label: "סימטריה", val: "Φ(−z) = 1 − Φ(z)" },
  ];
  return (
    <div style={{ borderRadius: 14, border: `1px solid rgba(${accentRgb},0.25)`, background: `rgba(${accentRgb},0.04)`, padding: "12px 16px", marginBottom: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>נוסחאות מרכזיות</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {formulas.map(f => (
          <div key={f.label} style={{ borderRadius: 8, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", padding: "4px 10px", fontSize: 11 }}>
            <span style={{ color: "#64748b", marginLeft: 4 }}>{f.label}:</span>
            <span style={{ color: "#1e293b", fontFamily: "monospace", fontWeight: 600, direction: "ltr", display: "inline-block" }}>{f.val}</span>
          </div>
        ))}
      </div>
    </div>
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
              <span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{step.phase} — {step.label}</span>
              <span style={{ fontSize: 16 }}>🔒</span>
            </div>
          ) : (
            <div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(255,255,255,0.9)", padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{step.phase} — {step.label}</div>
                <div style={{ color: "#334155", fontSize: 13, lineHeight: 1.6 }}>{step.prompt}</div>
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

// ─── NormalLab ─────────────────────────────────────────────────────────────────

function NormalLab({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  const [mu, setMu] = useState(70);
  const [sigma, setSigma] = useState(10);
  const st = STATION[levelId];

  // Gaussian curve points
  const S = 280, H = 180, baseline = 160, peakY = 20;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * 6 - 3; // -3 to +3 std devs
    const gauss = Math.exp(-0.5 * t * t);
    const px = 30 + (i / 100) * (S - 60);
    const py = baseline - gauss * (baseline - peakY);
    pts.push({ x: px, y: py });
  }
  const curvePath = pts.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(" ");

  // Map value to SVG x
  const valToX = (v: number) => {
    const t = (v - mu) / sigma;
    const frac = (t + 3) / 6;
    return 30 + frac * (S - 60);
  };

  const muX = valToX(mu);
  const s1L = valToX(mu - sigma);
  const s1R = valToX(mu + sigma);
  const s2L = valToX(mu - 2 * sigma);
  const s2R = valToX(mu + 2 * sigma);

  // Shaded region for ±1σ
  const shade1Pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * 6 - 3;
    if (t >= -1 && t <= 1) {
      const gauss = Math.exp(-0.5 * t * t);
      const px = 30 + (i / 100) * (S - 60);
      const py = baseline - gauss * (baseline - peakY);
      shade1Pts.push({ x: px, y: py });
    }
  }
  const shade1Path = shade1Pts.length > 0
    ? `M ${shade1Pts[0].x},${baseline} ` + shade1Pts.map(p => `L ${p.x},${p.y}`).join(" ") + ` L ${shade1Pts[shade1Pts.length - 1].x},${baseline} Z`
    : "";

  // Shaded region for ±2σ
  const shade2Pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * 6 - 3;
    if ((t >= -2 && t < -1) || (t > 1 && t <= 2)) {
      const gauss = Math.exp(-0.5 * t * t);
      const px = 30 + (i / 100) * (S - 60);
      const py = baseline - gauss * (baseline - peakY);
      shade2Pts.push({ x: px, y: py });
    }
  }
  // Split into left and right band
  const shade2L: { x: number; y: number }[] = [];
  const shade2R: { x: number; y: number }[] = [];
  for (const p of shade2Pts) {
    if (p.x < muX) shade2L.push(p);
    else shade2R.push(p);
  }
  const makeShade = (arr: { x: number; y: number }[]) =>
    arr.length > 1
      ? `M ${arr[0].x},${baseline} ` + arr.map(p => `L ${p.x},${p.y}`).join(" ") + ` L ${arr[arr.length - 1].x},${baseline} Z`
      : "";

  return (
    <section style={{
      border: "1px solid rgba(0,0,0,0.1)", borderRadius: 24, padding: "2.5rem",
      background: "rgba(255,255,255,0.82)", marginBottom: "2rem",
    }}>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: st.accentColor, textAlign: "center", marginBottom: 16 }}>מעבדת התפלגות נורמלית</h3>

      <svg viewBox={`0 0 ${S} ${H + 20}`} className="w-full max-w-sm mx-auto mb-4" aria-hidden>
        {/* ±2σ shading */}
        {shade2L.length > 1 && <path d={makeShade(shade2L)} fill="#a78bfa" fillOpacity={0.15} />}
        {shade2R.length > 1 && <path d={makeShade(shade2R)} fill="#a78bfa" fillOpacity={0.15} />}
        {/* ±1σ shading */}
        {shade1Path && <path d={shade1Path} fill={st.accentColor} fillOpacity={0.2} />}
        {/* bell curve */}
        <path d={curvePath} fill="none" stroke={st.accentColor} strokeWidth={2.5} />
        {/* baseline */}
        <line x1={20} y1={baseline} x2={S - 10} y2={baseline} stroke="#94a3b8" strokeWidth={1} />
        {/* mu line */}
        <line x1={muX} y1={baseline} x2={muX} y2={peakY - 5} stroke="#64748b" strokeWidth={1} strokeDasharray="4,3" />
        {/* ±1σ marks */}
        <line x1={s1L} y1={baseline} x2={s1L} y2={baseline - 8} stroke={st.accentColor} strokeWidth={1.5} />
        <line x1={s1R} y1={baseline} x2={s1R} y2={baseline - 8} stroke={st.accentColor} strokeWidth={1.5} />
        {/* ±2σ marks */}
        <line x1={s2L} y1={baseline} x2={s2L} y2={baseline - 6} stroke="#a78bfa" strokeWidth={1.2} />
        <line x1={s2R} y1={baseline} x2={s2R} y2={baseline - 6} stroke="#a78bfa" strokeWidth={1.2} />
        {/* labels */}
        <text x={muX} y={baseline + 14} textAnchor="middle" fontSize={11} fill="#1e293b" fontWeight={700}>μ</text>
        <text x={s1L} y={baseline + 14} textAnchor="middle" fontSize={9} fill="#64748b">μ−σ</text>
        <text x={s1R} y={baseline + 14} textAnchor="middle" fontSize={9} fill="#64748b">μ+σ</text>
        <text x={s2L} y={baseline + 14} textAnchor="middle" fontSize={9} fill="#a78bfa">μ−2σ</text>
        <text x={s2R} y={baseline + 14} textAnchor="middle" fontSize={9} fill="#a78bfa">μ+2σ</text>
        {/* 68% label */}
        <text x={muX} y={baseline - 45} textAnchor="middle" fontSize={10} fill={st.accentColor} fontWeight={600}>68%</text>
        {/* 95% bracket hint */}
        <text x={muX} y={baseline - 55} textAnchor="middle" fontSize={9} fill="#a78bfa">95%</text>
      </svg>

      {/* Sliders */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 8px", marginBottom: 20 }}>
        {([
          { label: "ממוצע μ", val: mu, set: setMu, min: 40, max: 100, step: 1, color: st.accentColor },
          { label: "סטיית תקן σ", val: sigma, set: setSigma, min: 5, max: 25, step: 1, color: "#7c3aed" },
        ] as const).map(({ label, val, set, min, max, step, color }) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
              <span>{label}</span><span style={{ color, fontWeight: 700 }}>{val}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={val}
              onChange={e => (set as (v: number) => void)(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: color } as React.CSSProperties} />
          </div>
        ))}
      </div>

      {/* Data tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, textAlign: "center", fontSize: 12, marginBottom: 16 }}>
        {[
          { label: "μ", val: mu.toString(), color: st.accentColor },
          { label: "σ", val: sigma.toString(), color: "#7c3aed" },
          { label: "μ−σ", val: (mu - sigma).toString(), color: "#64748b" },
          { label: "μ+σ", val: (mu + sigma).toString(), color: "#64748b" },
          { label: "μ−2σ", val: (mu - 2 * sigma).toString(), color: "#a78bfa" },
          { label: "μ+2σ", val: (mu + 2 * sigma).toString(), color: "#a78bfa" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: "10px 8px" }}>
            <div style={{ color: "#64748b", marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 700, color, fontSize: 11 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Bottom label */}
      <p style={{ textAlign: "center", fontSize: 13, color: "#334155", fontWeight: 600 }}>
        68% מהנתונים בין μ−σ ל-μ+σ &nbsp;|&nbsp; 95% בין μ−2σ ל-μ+2σ
      </p>
    </section>
  );
}

// ─── Exercise data ────────────────────────────────────────────────────────────

const EXERCISES: ExerciseDef[] = [
  {
    id: "basic",
    problem: "ציוני מבחן מתפלגים נורמלית.\nממוצע: μ\nסטיית תקן: σ\n\nתלמיד קיבל ציון x.\n\nא. חשב את ציון ה-z של התלמיד.\nב. מהו האחוזון שלו? (השתמש בטבלת z)\nג. כמה אחוז מהתלמידים קיבלו ציון גבוה יותר?\nד. בין אילו ציונים נמצאים 68% מהתלמידים?",
    diagram: <BellCurveBasic />,
    pitfalls: [
      { title: "שוכחים ש-z שלילי = מתחת לממוצע, לא 'רע'", text: "z שלילי רק אומר שהתלמיד מתחת לממוצע. זה לא אומר שהציון נמוך בהכרח — תלוי בהקשר." },
      { title: "מבלבלים בין 'גבוה יותר' ל'נמוך יותר' — צריך 1−Φ(z)", text: "טבלת z נותנת P(Z<z). אם רוצים 'גבוה יותר' צריך 1−Φ(z). טעות קלאסית: לקרוא ישירות מהטבלה." },
    ],
    goldenPrompt: "\n\nציוני מבחן מתפלגים נורמלית עם ממוצע μ וסטיית תקן σ. תלמיד קיבל ציון x. אני צריך: 1. לחשב ציון z באמצעות z=(x−μ)/σ. 2. למצוא את האחוזון מטבלת z. 3. לחשב כמה אחוז קיבלו ציון גבוה יותר (1−Φ(z)). 4. למצוא את טווח 68% (μ±σ).\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״",
    steps: [
      { phase: "א", label: "שלב א׳ — נוסחת ציון תקן", prompt: "\n\nמה הנוסחה לחישוב ציון תקן z? הסבר כל מרכיב: x, μ, σ." },
      { phase: "ב", label: "שלב ב׳ — חשב את z", prompt: "\n\nהצב בנוסחה z=(x−μ)/σ. מה הסימן של z אומר על מיקום התלמיד ביחס לממוצע?" },
      { phase: "ג", label: "שלב ג׳ — טבלת z ואחוזון", prompt: "\n\nמצאתי z. איך אני קורא את טבלת z כדי למצוא Φ(z)? מה ההבדל בין Φ(z) ל-1−Φ(z)?" },
      { phase: "ד", label: "שלב ד׳ — כלל 68-95-99.7", prompt: "\n\nהסבר את כלל 68-95-99.7. בין אילו ערכים נמצאים 68% מהנתונים? ואיפה 95%?" },
    ],
  },
  {
    id: "medium",
    problem: "גובה תלמידים בכיתה מתפלג נורמלית.\nממוצע: μ\nסטיית תקן: σ\n\nא. מהו האחוז בין שני גבהים נתונים a ו-b?\nב. חשב z עבור כל ערך.\nג. מצא P(a < X < b) = Φ(z_b) − Φ(z_a).\nד. אמת באמצעות סימטריה: Φ(−z) = 1 − Φ(z).",
    diagram: <BellCurveMedium />,
    pitfalls: [
      { title: "שוכחים לחסר Φ של z הקטן מ-Φ של z הגדול", text: "P(a<X<b) = Φ(z_b)−Φ(z_a). אם מחשבים רק Φ אחד — מקבלים הסתברות שגויה." },
      { title: "לא משתמשים בסימטריה כשz שלילי", text: "אם z שלילי, אפשר להשתמש ב-Φ(−z)=1−Φ(z) במקום לחפש ערכים שליליים בטבלה." },
    ],
    goldenPrompt: "\n\nגובה תלמידים מתפלג נורמלית עם ממוצע μ וסטיית תקן σ. אני רוצה למצוא את האחוז בין גובה a לגובה b. שלבים: 1. חשב z_a ו-z_b. 2. מצא Φ(z_a) ו-Φ(z_b) מטבלת z. 3. חשב P(a<X<b)=Φ(z_b)−Φ(z_a). 4. אמת עם כלל הסימטריה.\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״",
    steps: [
      { phase: "א", label: "שלב א׳ — חשב z לכל ערך", contextWords: ["z", "ציון תקן", "נוסחה", "ממוצע", "סטיית תקן"] },
      { phase: "ב", label: "שלב ב׳ — קרא Φ מטבלת z", contextWords: ["טבלה", "Φ", "z", "ערך", "הסתברות"] },
      { phase: "ג", label: "שלב ג׳ — חשב הסתברות בתחום", contextWords: ["הסתברות", "תחום", "חיסור", "Φ", "P"] },
      { phase: "ד", label: "שלב ד׳ — אמת עם סימטריה", contextWords: ["סימטריה", "Φ", "שלילי", "אימות", "1−Φ"] },
    ],
  },
  {
    id: "advanced",
    problem: "שתי קבוצות נבחנו במבחן.\nקבוצה א׳: ממוצע μ₁, סטיית תקן σ\nקבוצה ב׳: ממוצע μ₂, סטיית תקן σ\n\nתלמיד מקבוצה א׳ קיבל ציון x.\nתלמידה מקבוצה ב׳ קיבלה ציון y.\n\nא. חשב z לכל אחד.\nב. מי השיג תוצאה יחסית טובה יותר?\nג. מצא את האחוזון של כל אחד.\nד. מה הסיכוי שתלמיד אקראי מקבוצה א׳ ישיג יותר מ-x?",
    diagram: <BellCurveAdvanced />,
    pitfalls: [
      { title: "משווים ציונים גולמיים במקום ציוני z", text: "אי אפשר להשוות x ו-y ישירות כי ההתפלגויות שונות. רק ציוני z מאפשרים השוואה הוגנת." },
      { title: "שוכחים שאותו σ לא אומר אותה התפלגות", text: "גם אם σ זהה, ממוצעים שונים יוצרים התפלגויות שונות. תלמיד עם z=1 בקבוצה א׳ לא שווה לz=1 בקבוצה ב׳ בציון גולמי." },
    ],
    goldenPrompt: "\n\n",
    steps: [
      { phase: "א", label: "שלב א׳ — חשב z לכל תלמיד", contextWords: ["z", "ציון תקן", "ממוצע", "קבוצה"] },
      { phase: "ב", label: "שלב ב׳ — השווה באמצעות z", contextWords: ["השווה", "z", "יחסי", "גבוה", "תוצאה"] },
      { phase: "ג", label: "שלב ג׳ — מצא אחוזון לכל אחד", contextWords: ["אחוזון", "טבלה", "Φ", "z", "אחוז"] },
      { phase: "ד", label: "שלב ד׳ — הסתברות מעל ערך מסוים", contextWords: ["הסתברות", "1−Φ", "גבוה", "z", "סיכוי"] },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NormalDistributionPage() {
  const [activeId, setActiveId] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = EXERCISES.find(e => e.id === activeId)!;
  const st = STATION[activeId];

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <main dir="rtl" style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", paddingBottom: "4rem" }}>
        {/* Header */}
        <div style={{ background: "#F3EFE0", borderBottom: "1px solid rgba(60,54,42,0.15)", marginBottom: "2rem" }}>
          <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>התפלגות נורמלית עם AI</h1>
              <p style={{ color: "#64748b", fontSize: 13, margin: "3px 0 0" }}>ציון תקן, אחוזונים, טבלת z — ואיך לשאול AI את השאלות הנכונות</p>
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

        <div style={{ margin: "0 auto", padding: "0 1.5rem" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "center", marginBottom: 24 }}>
              <pre style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.75, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
              <div style={{ borderRadius: 16, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: 12 }}>{ex.diagram}</div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>⚠️ שגיאות נפוצות</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ex.pitfalls.map((p, i) => (
                  <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(254,226,226,0.25)", padding: "10px 14px" }}>
                    <div style={{ color: "#b91c1c", fontWeight: 700, fontSize: 13, marginBottom: 3 }}>⚠️ {p.title}</div>
                    <div style={{ color: "#64748b", fontSize: 13 }}>{p.text}</div>
                  </div>
                ))}
              </div>
            </div>
            <FormulaBar accentColor={st.accentColor} accentRgb={st.glowRgb} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: st.accentColor, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>🧠 מדריך הפרומפטים</p>
              {activeId === "basic"    && <LadderBase     ex={ex} accentColor={st.accentColor} accentRgb={st.glowRgb} />}
              {activeId === "medium"   && <LadderMedium   ex={ex} accentColor={st.accentColor} accentRgb={st.glowRgb} />}
              {activeId === "advanced" && <LadderAdvanced ex={ex} accentColor={st.accentColor} accentRgb={st.glowRgb} />}
            </div>
          </section>

          <NormalLab levelId={activeId} />

          {/* Mark as complete */}
          <div style={{ marginTop: "1.5rem" }}>
            <MarkComplete subtopicId="/probability/normal" level={activeId} />
          </div>

        </div>
      </main>
    </>
  );
}
