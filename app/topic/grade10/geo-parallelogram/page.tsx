"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, flexMatch, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";

// ─── Types ────────────────────────────────────────────────────────────────────

type PromptStep = {
  phase: string;
  label: string;
  coaching: string;
  prompt: string;
  keywords: string[];
  keywordHint: string;
  contextWords?: string[];  // Exercise_Validator — הקשר לסעיף
  stationWords?: string[];  // Exercise_Validator — מיקוד בשלב
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

// ─── ISLAND STYLE — single source of truth ───────────────────────────────────

const ISLAND: React.CSSProperties = {
  border: "1px solid rgba(60,54,42,0.15)",
  borderRadius: "40px",
  padding: 6,
  background: "rgba(255,255,255,0.82)",
  boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)",
  marginBottom: "2rem",
  marginLeft: "auto",
  marginRight: "auto",
  
};

// ─── Station config ───────────────────────────────────────────────────────────

const STATION = {
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",  ladderBorder: "#16A34A", glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderHex: "#2D5A27", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700", ladderBorder: "#EA580C", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderHex: "#A34F26", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",    ladderBorder: "#DC2626", glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderHex: "#8B2635", borderRgb: "139,38,53" },
} as const;

// ─── SVG diagrams (silent — no numbers, no answers) ───────────────────────────

// Shared parallelogram vertices
const PA = { x: 30, y: 110 };
const PB = { x: 200, y: 110 };
const PC = { x: 230, y: 30 };
const PD = { x: 60, y: 30 };
const PO = { x: (PA.x + PC.x) / 2, y: (PA.y + PC.y) / 2 };
const POLY_PTS = `${PA.x},${PA.y} ${PB.x},${PB.y} ${PC.x},${PC.y} ${PD.x},${PD.y}`;

function VLabels({ color = "#475569" }: { color?: string }) {
  return (
    <>
      <text x={PA.x - 14} y={PA.y + 5} fontSize={11} fill={color} fontFamily="sans-serif">A</text>
      <text x={PB.x + 5}  y={PB.y + 5} fontSize={11} fill={color} fontFamily="sans-serif">B</text>
      <text x={PC.x + 5}  y={PC.y + 4} fontSize={11} fill={color} fontFamily="sans-serif">C</text>
      <text x={PD.x - 14} y={PD.y + 4} fontSize={11} fill={color} fontFamily="sans-serif">D</text>
    </>
  );
}

// BasicSVG — parallelogram with angle arc at A
function BasicSVG() {
  // angle arc at A: AB direction = (1,0), AD direction toward D
  const adDx = PD.x - PA.x; // 30
  const adDy = PD.y - PA.y; // -80
  const adLen = Math.sqrt(adDx * adDx + adDy * adDy);
  const r = 22;
  // arc from (PA.x+r, PA.y) to PA + r*(adDx/adLen, adDy/adLen)
  const arcEndX = PA.x + r * (adDx / adLen);
  const arcEndY = PA.y + r * (adDy / adLen);
  const arcPath = `M ${(PA.x + r).toFixed(1)} ${PA.y} A ${r} ${r} 0 0 0 ${arcEndX.toFixed(1)} ${arcEndY.toFixed(1)}`;
  return (
    <svg viewBox="0 0 260 130" className="w-full max-w-sm mx-auto" aria-hidden>
      <polygon points={POLY_PTS} fill="rgba(22,163,74,0.06)" stroke="#16A34A" strokeWidth={2} strokeLinejoin="round" />
      <path d={arcPath} fill="none" stroke="#f59e0b" strokeWidth={1.8} />
      <text x={PA.x + 18} y={PA.y - 4} fontSize={10} fill="#f59e0b" fontFamily="sans-serif">∠A</text>
      <VLabels color="#334155" />
    </svg>
  );
}

// MediumSVG — proper rectangle ABCD with diagonals, right-angle markers,
//             equal tick marks on all four half-diagonals, AB=12 label, O point
function MediumSVG() {
  // Rectangle vertices (axis-aligned for perfect 90° corners)
  const A = { x: 30,  y: 110 };
  const B = { x: 210, y: 110 };
  const C = { x: 210, y: 30  };
  const D = { x: 30,  y: 30  };
  const O = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 }; // = (120, 70)

  // Half-diagonal vectors for tick positioning
  const acDx = C.x - A.x, acDy = C.y - A.y;           // A→C
  const acLen = Math.sqrt(acDx * acDx + acDy * acDy);
  const acPx = -acDy / acLen, acPy = acDx / acLen;      // perpendicular to AC
  const bdDx = D.x - B.x, bdDy = D.y - B.y;            // B→D
  const bdLen = Math.sqrt(bdDx * bdDx + bdDy * bdDy);
  const bdPx = -bdDy / bdLen, bdPy = bdDx / bdLen;      // perpendicular to BD
  const ts = 5;

  // Right-angle box helper (at corner `v`, two arms toward `a` and `b`)
  function RightAngle({ v, a, b, s = 8 }: { v: {x:number;y:number}; a: {x:number;y:number}; b: {x:number;y:number}; s?: number }) {
    const da = Math.sqrt((a.x-v.x)**2 + (a.y-v.y)**2);
    const db = Math.sqrt((b.x-v.x)**2 + (b.y-v.y)**2);
    const ua = { x: (a.x-v.x)/da, y: (a.y-v.y)/da };
    const ub = { x: (b.x-v.x)/db, y: (b.y-v.y)/db };
    const p1 = { x: v.x + s*ua.x, y: v.y + s*ua.y };
    const p2 = { x: v.x + s*ua.x + s*ub.x, y: v.y + s*ua.y + s*ub.y };
    const p3 = { x: v.x + s*ub.x, y: v.y + s*ub.y };
    return <polyline points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`} fill="none" stroke="#94a3b8" strokeWidth={1.2} />;
  }

  return (
    <svg viewBox="0 0 250 145" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Rectangle fill + border */}
      <rect x={A.x} y={D.y} width={B.x - A.x} height={A.y - D.y}
        fill="rgba(22,163,74,0.05)" stroke="#16A34A" strokeWidth={2} />

      {/* Right-angle markers at A and C (two representative corners) */}
      <RightAngle v={A} a={B} b={D} />
      <RightAngle v={C} a={B} b={D} />

      {/* Diagonals */}
      <line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="#f59e0b" strokeWidth={1.6} strokeDasharray="5,3" />
      <line x1={B.x} y1={B.y} x2={D.x} y2={D.y} stroke="#a78bfa" strokeWidth={1.6} strokeDasharray="5,3" />

      {/* Equal tick marks on all 4 half-diagonals (AO, OC in amber; BO, OD in violet) */}
      {[0.28, 0.72].map((t, i) => {
        const mx = A.x + t * acDx, my = A.y + t * acDy;
        return <line key={`ac${i}`} x1={mx - ts*acPx} y1={my - ts*acPy} x2={mx + ts*acPx} y2={my + ts*acPy} stroke="#f59e0b" strokeWidth={2} />;
      })}
      {[0.28, 0.72].map((t, i) => {
        const mx = B.x + t * bdDx, my = B.y + t * bdDy;
        return <line key={`bd${i}`} x1={mx - ts*bdPx} y1={my - ts*bdPy} x2={mx + ts*bdPx} y2={my + ts*bdPy} stroke="#a78bfa" strokeWidth={2} />;
      })}

      {/* O dot + label */}
      <circle cx={O.x} cy={O.y} r={3.5} fill="#00d4ff" />
      <text x={O.x + 5} y={O.y - 5} fontSize={10} fill="#475569" fontFamily="sans-serif">O</text>

      {/* AB = 12 label (below bottom edge) */}
      <text x={(A.x + B.x) / 2} y={A.y + 14} fontSize={11} fill="#16A34A" fontFamily="sans-serif" textAnchor="middle" fontWeight="700">12</text>

      {/* Vertex labels */}
      <text x={A.x - 14} y={A.y + 5}  fontSize={11} fill="#334155" fontFamily="sans-serif">A</text>
      <text x={B.x + 10} y={B.y + 5}  fontSize={11} fill="#334155" fontFamily="sans-serif">B</text>
      <text x={C.x + 10} y={C.y + 4}  fontSize={11} fill="#334155" fontFamily="sans-serif">C</text>
      <text x={D.x - 14} y={D.y + 4}  fontSize={11} fill="#334155" fontFamily="sans-serif">D</text>
    </svg>
  );
}

// AdvancedSVG — tilted parallelogram ABCD (scale 8px per unit).
//   AE=6, DE=8, DC=AB=10. E is on AB; F is on the EXTENSION of AB (outside B).
//   EFCD forms a rectangle between the two perpendicular heights.
function AdvancedSVG() {
  // Derived from problem data (scale = 8px per unit):
  //   A at origin row, E = A + (6·8, 0), D above E by 8·8
  //   DC horizontal = 10·8, so C = D + (80, 0)
  //   B = A + (80, 0)  [AB = DC = 10]   → F = (C.x, A.y) lies RIGHT of B
  const A = { x: 28,  y: 118 };
  const E = { x: 76,  y: 118 };   // A + (48, 0)  [AE = 6]
  const D = { x: 76,  y: 54  };   // E up 64px     [DE = 8]
  const C = { x: 156, y: 54  };   // D + (80, 0)   [DC = 10]
  const B = { x: 108, y: 118 };   // A + (80, 0)   [AB = DC = 10]
  const F = { x: 156, y: 118 };   // foot from C → outside AB, right of B
  const s = 8;

  return (
    <svg viewBox="0 0 192 148" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Rectangle EFCD — emerald highlight (drawn first, behind everything) */}
      <rect x={E.x} y={D.y} width={F.x - E.x} height={E.y - D.y}
        fill="rgba(52,211,153,0.12)" stroke="#34d399" strokeWidth={1.4} strokeDasharray="4,3" />

      {/* Extension of AB beyond B to F — slate dashed */}
      <line x1={B.x} y1={B.y} x2={F.x} y2={F.y}
        stroke="#64748b" strokeWidth={1.5} strokeDasharray="5,3" />

      {/* Parallelogram ABCD */}
      <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y} ${D.x},${D.y}`}
        fill="rgba(220,38,38,0.04)" stroke="#dc2626" strokeWidth={2} strokeLinejoin="round" />

      {/* Heights DE and CF — amber */}
      <line x1={D.x} y1={D.y} x2={E.x} y2={E.y} stroke="#f59e0b" strokeWidth={2} />
      <line x1={C.x} y1={C.y} x2={F.x} y2={F.y} stroke="#f59e0b" strokeWidth={2} />

      {/* Right-angle markers at E (opens right) and F (opens left) */}
      <polyline points={`${E.x+s},${E.y} ${E.x+s},${E.y-s} ${E.x},${E.y-s}`}
        fill="none" stroke="#94a3b8" strokeWidth={1.2} />
      <polyline points={`${F.x-s},${F.y} ${F.x-s},${F.y-s} ${F.x},${F.y-s}`}
        fill="none" stroke="#94a3b8" strokeWidth={1.2} />

      {/* Data labels */}
      <text x={(A.x+E.x)/2}  y={A.y+13} fontSize={11} fill="#475569"  fontFamily="sans-serif" fontWeight="700" textAnchor="middle">6</text>
      <text x={D.x-13}       y={(D.y+E.y)/2+4} fontSize={11} fill="#f59e0b" fontFamily="sans-serif" fontWeight="700" textAnchor="middle">8</text>
      <text x={(D.x+C.x)/2}  y={D.y-5}  fontSize={11} fill="#dc2626"  fontFamily="sans-serif" fontWeight="700" textAnchor="middle">10</text>

      {/* Vertex labels */}
      <text x={A.x-14} y={A.y+5}  fontSize={11} fill="#334155" fontFamily="sans-serif">A</text>
      <text x={B.x-4}  y={B.y+14} fontSize={11} fill="#334155" fontFamily="sans-serif">B</text>
      <text x={C.x+5}  y={C.y+4}  fontSize={11} fill="#334155" fontFamily="sans-serif">C</text>
      <text x={D.x-14} y={D.y+4}  fontSize={11} fill="#334155" fontFamily="sans-serif">D</text>
      <text x={E.x-4}  y={E.y+14} fontSize={11} fill="#f59e0b" fontFamily="sans-serif">E</text>
      <text x={F.x+4}  y={F.y+14} fontSize={11} fill="#f59e0b" fontFamily="sans-serif">F</text>
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

        {/* Score bar */}
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

  // rose palette for advanced
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
      {/* Header */}
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
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(6,78,59,0.1)" : "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(52,211,153,0.25)" : "rgba(139,38,53,0.25)"}`, color: passed ? "#6ee7b7" : "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {/* Score bar */}
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

        {/* Feedback */}
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
  return <div><GoldenPromptCard prompt={goldenPrompt} title="פרומפט ראשי" glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => <TutorStepBasic key={i} step={s} glowRgb={glowRgb} borderRgb={borderRgb} />)}</div>;
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

// ─── Ladder Advanced ──────────────────────────────────────────────────────────

function LadderAdvanced({ steps }: { steps: PromptStep[] }) {
  const [masterPassed, setMasterPassed] = useState(false);
  const [stepsPassed, setStepsPassed] = useState<boolean[]>(Array(steps.length).fill(false));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <MasterPromptGate
        onPass={() => setMasterPassed(true)}
        accentColor="#059669"
        accentRgb="5,150,105"
        requiredPhrase="סרוק נתונים ועצור"
        subjectWords={[
          // מושגי יסוד
          "צלעות נגדיות", "זוויות סמוכות", "קודקודים", "היקף", "שטח",
          // תכונות מקבילית
          "מקבילית", "אלכסונים חוצים", "זוגות צלעות מקבילות", "זוויות נגדיות שוות",
          "אלכסון", "מקבילות", "מקביל",
          // תכונות מלבן
          "מלבן", "אלכסונים שווים", "זוויות ישרות", "90", "90°",
          // גאומטריה כללית
          "גאומטריה", "מרובע", "זווית", "צלע", "הוכחה", "חפיפה",
          // פעולות עזר
          "בניית עזר", "הורדת גובה", "גובה", "חוצה זווית", "פיתגורס", "תיכון ליתר",
        ]}
        subjectHint="גאומטריה / מקבילית / מלבן"
      />

      {masterPassed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          {steps.map((s, i) => (
            <TutorStepAdvanced
              key={i} step={s}
              locked={i > 0 && !stepsPassed[i - 1]}
              onPass={() => setStepsPassed(prev => { const next = [...prev]; next[i] = true; return next; })}
            />
          ))}
          <button onClick={() => { setMasterPassed(false); setStepsPassed(Array(steps.length).fill(false)); }} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline", marginTop: 8 }}>
            התחל מחדש
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "זוויות, צלעות וחשיבה על מקבילית ABCD",
    problem: "בשרטוט נתונה מקבילית ABCD.\nנתון כי זווית ∠A גדולה ב-40° מזווית ∠B.\nאורך הצלע AB הוא 15 מטרים.\nהיקף המקבילית הוא 50 מטרים.\n\nסעיף א׳:\nמצאו את הגודל של כל אחת מזוויות המקבילית (A, B, C, D).\nרמז: היעזרו בתכונה של סכום זוויות סמוכות.\n\nסעיף ב׳:\nמצאו את אורכי כל צלעות המקבילית.\n\nסעיף ג׳:\nאם נשנה את הצורה כך שכל הזוויות יהיו שוות ל-90°, איזה מרובע מיוחד נקבל? האם ההיקף ישתנה?",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ איך בונים משוואה לזוויות סמוכות?", text: "זכרו שסכום זוויות סמוכות במקבילית הוא תמיד 180°." },
      { title: "⚠️ היקף הוא לא רק סכום של שתי צלעות!", text: "טעות נפוצה היא לחשב AB + BC ולעצור שם. זכרו שהיקף הוא סכום כל ארבע הצלעות. במקבילית יש שני זוגות של צלעות שוות, לכן הנוסחה היא 2·(a + b) = P." },
      { title: "⚠️ מתי מקבילית הופכת למרובע אחר?", text: "שאלת החשיבה בודקת אם אתם מכירים את הקשר בין המשפחות. מקבילית שכל זוויותיה הופכות ל-90° שומרת על כל התכונות שלה, אבל מקבלת שם חדש ומיוחד. לגבי ההיקף — תחשבו: האם שינוי הזוויות 'מותח' או 'מכווץ' את אורך הצלעות, או שהן נשארות אותו דבר?" },
    ],
    goldenPrompt: "\n\nהיי, אני תלמיד/ה כיתה י' ומצרף/ת שאלה על מקבילית. אני רוצה שתהיה המורה הפרטי שלי — תסביר לי את הלוגיקה ולא תיתן תשובות ישירות.\n\nאל תפתור עבורי — שאל אותי שאלות מכווינות.\nסרוק את הנתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״",
    steps: [
      { phase: "סעיף א׳", label: "מציאת כל הזוויות — אלגברה + תכונות", coaching: "", prompt: "\n\nאני מנסה למצוא את הזוויות במקבילית ABCD כשנתון שהפרש ביניהן הוא 40°. תוכל להנחות אותי איך נבנה משוואה מתאימה?", keywords: [], keywordHint: "", contextWords: ["סמוכות", "180", "משוואה", "x"] },
      { phase: "סעיף ב׳", label: "מציאת אורכי הצלעות — היקף", coaching: "", prompt: "\n\nתוכל להסביר לי איך נמצא כעת את אורכי שאר הצלעות?", keywords: [], keywordHint: "", contextWords: ["היקף", "2(a+b)", "משוואה", "10"] },
      { phase: "סעיף ג׳", label: "חשיבה — מהו המרובע המיוחד?", coaching: "", prompt: "\n\nאם אני משנה את כל הזוויות במקבילית ל-90°, מה קורה למבנה של המרובע? אשמח אם תסביר לי איזה סוג מרובע מתקבל והאם שינוי הזוויות משפיע על אורכי הצלעות וההיקף.", keywords: [], keywordHint: "", contextWords: ["מלבן", "90", "היקף", "זהה"] },
    ],
  },
  {
    id: "medium",
    title: "מרוץ האלכסון — היקף וקשרים במלבן",
    problem: "במלבן ABCD, האלכסונים AC ו-BD נפגשים בנקודה O.\nנתון כי צלע המלבן AB היא 12 ס\"מ.\nצלע המלבן BC קטנה מהצלע AB ב-3 ס\"מ.\n\nסעיף א׳:\nמהו אורך האלכסון?\n\nסעיף ב׳:\nמצא את היקף ושטח המלבן.\n\nסעיף ג׳:\nהאם היקף המשולש △ABO שווה להיקף המשולש △BCO? הסבירו מדוע (אין צורך בחישוב מלא).",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ מציאת האלכסון", text: "שימו לב – האלכסון מחלק את המלבן לשני משולשים ישרי זווית." },
      { title: "⚠️ היקף משולש פנימי", text: "זכרו שנקודת המפגש O היא מרכז המלבן. כשאתם עוברים לחישוב היקף של משולש פנימי, ודאו שאתם משתמשים רק בחלק הרלוונטי מהאלכסון שמצאתם בסעיף הקודם." },
    ],
    goldenPrompt: "\n\nהיי, אני תלמיד/ה כיתה י' ומצרף/ת שאלה על מלבן. אני רוצה שתהיה המורה הפרטי שלי — תסביר לי את הלוגיקה ולא תיתן תשובות ישירות.\n\nאל תפתור עבורי — שאל אותי שאלות מכווינות.\nסרוק את הנתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״",
    steps: [
      { phase: "סעיף א׳", label: "אורך האלכסון — פיתגורס", coaching: "", prompt: "\n\nיש לי מלבן עם AB=12 ו-BC=9. האלכסון AC מחבר שני קודקודים. באיזה משפט אשתמש כדי למצוא את אורכו?", keywords: [], keywordHint: "", contextWords: ["פיתגורס", "AC²", "12", "9", "אלכסון"] },
      { phase: "סעיף ב׳", label: "היקף ושטח", coaching: "", prompt: "\n\nמצאתי את האלכסון. עכשיו — מה הנוסחה להיקף ולשטח של מלבן?", keywords: [], keywordHint: "", contextWords: ["היקף", "שטח", "2(a+b)", "12", "9"] },
      { phase: "סעיף ג׳", label: "השוואת היקפי משולשים — הנמקה", coaching: "", prompt: "\n\nבמלבן, האלכסונים שווים ומחצים זה את זה, כך ש-AO=BO=CO=DO. מה ניתן להסיק על הצלעות של △ABO ו-△BCO? האם ההיקפים שווים?", keywords: [], keywordHint: "", contextWords: ["AO", "BO", "CO", "DO", "שווים", "חוצים"] },
    ],
  },
  {
    id: "advanced",
    title: "אתגר הגבהים הכפולים – ממקבילית למלבן",
    problem: "נתונה מקבילית ABCD. מהקודקודים D ו-C מורידים שני גבהים לצלע AB (או להמשכה), הפוגשים אותה בנקודות E ו-F בהתאמה.\n\nאורך הגובה DE הוא 8 ס\"מ.\n\nאורך הקטע AE הוא 6 ס\"מ.\n\nאורך צלע המקבילית DC הוא 10 ס\"מ.\n\nסעיף א׳:\nהסבירו מדוע המרובע EFCD הוא מלבן. מהו אורך הקטע EF?\n\nסעיף ב׳:\nמצאו את אורך צלע המקבילית AD.\nרמז: התבוננו במשולש ישר הזווית △ADE.\n\nסעיף ג׳:\nחשבו את היקף המקבילית ABCD המקורית ואת שטחה.\nרמז: שימו לב שאורך הבסיס AB שווה לאורך DC.\n\nסעיף ד׳:\nהאם שטח המקבילית ABCD שווה לשטח המלבן EFCD? נמקו את תשובתכם.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ הקשר בין הגבהים", text: "שימו לב – במקבילית, המרחק בין הישרים המקבילים הוא קבוע. לכן, אם הורדתם שני גבהים (DE ו-CF), הם חייבים להיות שווים באורכם. זה המפתח להבנה מדוע נוצר כאן מלבן בין המקבילית לבסיס." },
      { title: "⚠️ חישוב הבסיס המלא", text: "אל תתבלבלו בין הקטע AE לבין הבסיס המלא של המקבילית AB. זכרו שצלעות נגדיות במקבילית שוות, ולכן AB חייב להיות שווה ל-DC. השתמשו במידע הזה כדי לחשב את ההיקף והשטח מבלי להניח הנחות שגויות על אורך EB." },
    ],
    goldenPrompt: "\n\nהיי, אני תלמיד/ה כיתה י' ומצרף/ת שאלה על מקבילית וגבהים. אני רוצה שתהיה המורה הפרטי שלי — תסביר לי את הלוגיקה ולא תיתן תשובות ישירות.\n\nאל תפתור עבורי — שאל אותי שאלות מכווינות.\nסרוק את הנתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: מדוע EFCD הוא מלבן? כיצד מוצאים את AD? מה הקשר בין שטח המקבילית לשטח המלבן? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "הוכחת EFCD מלבן + אורך EF", coaching: "", prompt: "\n\n", keywords: [], keywordHint: "", contextWords: ["מלבן", "ניצב", "גובה", "EFCD", "EF", "DC", "מקבילי", "שוים"] },
      { phase: "סעיף ב׳", label: "מציאת AD — פיתגורס", coaching: "", prompt: "\n\n", keywords: [], keywordHint: "", contextWords: ["פיתגורס", "AD", "DE", "AE", "ישר", "זווית", "6", "8"] },
      { phase: "סעיף ג׳", label: "היקף ושטח המקבילית", coaching: "", prompt: "\n\n", keywords: [], keywordHint: "", contextWords: ["היקף", "שטח", "AB", "DC", "10", "8", "2(a+b)"] },
      { phase: "סעיף ד׳", label: "שוויון שטחים — הנמקה", coaching: "", prompt: "\n\n", keywords: [], keywordHint: "", contextWords: ["שטח", "גובה", "שוים", "בסיס", "EFCD"] },
    ],
  },
];

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() {
    navigator.clipboard.writeText(ex.problem.split(/\n+סעיף/)[0].trim());
    setCopiedProblem(true);
    setTimeout(() => setCopiedProblem(false), 2000);
  }
  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 12, padding: 6, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Properties box */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem 1.5rem", marginBottom: "2rem", boxShadow: s.glowShadow }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>תכונות המקבילית</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            המקבילית היא מרובע שבו כל זוג צלעות נגדיות מקבילות זו לזו. מכך נגזרות התכונות הבאות:
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: צלעות ואלכסונים */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📏 צלעות ואלכסונים</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>AB‖CD, BC‖AD</span>
              <span>שוויון והקבלה — כל זוג צלעות נגדיות הן גם מקבילות וגם שוות באורכן.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>AO=CO, BO=DO</span>
              <span>חציית אלכסונים — האלכסונים חוצים זה את זה; נקודת המפגש היא מרכז כל אלכסון.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>△ ≅ △</span>
              <span>חלוקה לחפיפה — כל אלכסון מחלק את המקבילית לשני משולשים חופפים.</span>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />

        {/* Category: זוויות */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📐 זוויות</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>∠A = ∠C, ∠B = ∠D</span>
              <span>זוויות נגדיות — בכל מקבילית, הזוויות הנגדיות שוות זו לזו.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>∠A + ∠B = <strong>180°</strong></span>
              <span>זוויות סמוכות — סכום כל שתי זוויות סמוכות (על אותה צלע) הוא <strong>180°</strong>.</span>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />

        {/* Category: שטח */}
        <div style={{ marginBottom: ex.id !== "basic" ? 16 : 0 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📐 חישוב שטח</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
            <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>S = a · h</span>
            <span>נוסחת השטח — השטח מחושב כמכפלת צלע בגובה היורד אליה.</span>
          </div>
        </div>

        {/* Rectangle extras — levels 2 & 3 only */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 2, background: `rgba(${s.glowRgb},0.25)`, marginBottom: 14, borderRadius: 1 }} />
            <div style={{ borderRadius: 12, background: `rgba(${s.glowRgb},0.07)`, border: `1px solid rgba(${s.glowRgb},0.25)`, padding: "10px 14px" }}>
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>➕ תוספות ייחודיות למלבן</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>∠A=∠B=∠C=∠D=90°</span>
                  <span>📐 זוויות ישרות — כל ארבע הזוויות במלבן שוות ל-<strong>90°</strong>.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>AC = BD</span>
                  <span>📏 שוויון אלכסונים — במלבן, האלכסונים גם חוצים זה את זה וגם שווים באורכם.</span>
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
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: 6, boxShadow: s.glowShadow }}>
        <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
        {ex.id === "basic"    && <LadderBase     steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
      </div>

    </section>
  );
}

// ─── LabBasic ─────────────────────────────────────────────────────────────────

function LabBasic() {
  const [angleA, setAngleA] = useState(65);
  const st = STATION.basic;
  const angleB = 180 - angleA;
  const isRect = Math.abs(angleA - 90) < 3;

  const Ax = 40, Ay = 130, Bx = 220, By = 130, adLen = 80;
  const angleARad = (angleA * Math.PI) / 180;
  const Dx = Ax + adLen * Math.cos(angleARad);
  const Dy = Ay - adLen * Math.sin(angleARad);
  const Cx = Bx + (Dx - Ax), Cy = By + (Dy - Ay);
  const r = 20;
  const arcPath = `M ${(Ax + r).toFixed(1)} ${Ay} A ${r} ${r} 0 0 0 ${(Ax + r * Math.cos(angleARad)).toFixed(1)} ${(Ay - r * Math.sin(angleARad)).toFixed(1)}`;
  const strokeColor = isRect ? "#00d4ff" : st.accentColor;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 12, padding: 6, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת מקבילית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה את הזווית ∠A וראה כיצד כל זוויות המקבילית מתעדכנות. כאשר ∠A = 90° — המקבילית הופכת למלבן!</p>
      <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
          <span>זווית ∠A <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 600 }}>(מעלות)</span></span>
          <span style={{ color: isRect ? "#00d4ff" : st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{angleA}°</span>
        </div>
        <input type="range" min={30} max={150} step={1} value={angleA} onChange={(e) => setAngleA(+e.target.value)} style={{ width: "100%", accentColor: isRect ? "#00d4ff" : st.accentColor }} />
      </div>
      {isRect && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ borderRadius: 12, background: "rgba(0,212,255,0.08)", border: "2px solid rgba(0,212,255,0.5)", padding: "10px 16px", marginBottom: "1.5rem", textAlign: "center", color: "#00d4ff", fontWeight: 700, fontSize: 14 }}>
          מלבן! כל הזוויות = 90°
        </motion.div>
      )}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 280 170" className="w-full max-w-sm mx-auto" aria-hidden>
          <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy} ${Dx},${Dy}`}
            fill={isRect ? "rgba(0,212,255,0.06)" : "rgba(22,163,74,0.05)"}
            stroke={strokeColor} strokeWidth={2} strokeLinejoin="round" />
          <path d={arcPath} fill="none" stroke={isRect ? "#00d4ff" : "#f59e0b"} strokeWidth={1.8} />
          {isRect && <polyline points={`${Ax+14},${Ay} ${Ax+14},${Ay-14} ${Ax},${Ay-14}`} fill="none" stroke="#00d4ff" strokeWidth={1.5} />}
          <text x={Ax-14} y={Ay+5} fontSize={11} fill="#334155" fontFamily="sans-serif">A</text>
          <text x={Bx+5}  y={By+5} fontSize={11} fill="#334155" fontFamily="sans-serif">B</text>
          <text x={Math.max(Cx,Bx)+5} y={Cy+4} fontSize={11} fill="#334155" fontFamily="sans-serif">C</text>
          <text x={Dx-16} y={Dy+4} fontSize={11} fill="#334155" fontFamily="sans-serif">D</text>
        </svg>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[{ label: "∠A", val: angleA }, { label: "∠B", val: angleB }, { label: "∠C", val: angleA }, { label: "∠D", val: angleB }].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: isRect ? "#00d4ff" : st.accentColor, fontFamily: "monospace", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: isRect ? "#00d4ff" : st.accentColor, fontWeight: 700, fontSize: 20 }}>{row.val}°</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── LabMedium ────────────────────────────────────────────────────────────────

function LabMedium() {
  const [width, setWidth]   = useState(12);
  const [height, setHeight] = useState(9);
  const st = STATION.medium;

  const diagonal = Math.sqrt(width * width + height * height);
  const area = width * height;
  const perimeter = 2 * (width + height);

  // Scale rect to fit in SVG
  const scaleX = Math.min(9, 160 / width);
  const scaleY = Math.min(9, 100 / height);
  const scale  = Math.min(scaleX, scaleY);
  const svgW = width * scale, svgH = height * scale;
  const Ax = 30, Ay = 30 + svgH;
  const Bx = Ax + svgW, By = Ay;
  const Cx = Bx, Cy = 30;
  const Dx = Ax, Dy = 30;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 12, padding: 6, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת מלבן</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה את הרוחב והגובה — האלכסון מתעדכן לפי משפט פיתגורס בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        {([
          { label: "רוחב AB", value: width,  min: 3, max: 18, set: setWidth,  color: st.accentColor },
          { label: "גובה BC", value: height, min: 3, max: 12, set: setHeight, color: "#a78bfa" },
        ] as const).map(sl => (
          <div key={sl.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: sl.color, fontFamily: "monospace", fontWeight: 700 }}>{sl.value}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={1} value={sl.value}
              onChange={e => sl.set(+e.target.value)} style={{ width: "100%", accentColor: sl.color }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 240 150" className="w-full max-w-sm mx-auto" aria-hidden>
          <rect x={Ax} y={Dy} width={svgW} height={svgH} fill="rgba(234,88,12,0.06)" stroke={st.accentColor} strokeWidth={2} />
          <polyline points={`${Ax+8},${Ay} ${Ax+8},${Ay-8} ${Ax},${Ay-8}`} fill="none" stroke="#94a3b8" strokeWidth={1.2} />
          <polyline points={`${Cx-8},${Cy} ${Cx-8},${Cy+8} ${Cx},${Cy+8}`} fill="none" stroke="#94a3b8" strokeWidth={1.2} />
          {/* Diagonal AC */}
          <line x1={Ax} y1={Ay} x2={Cx} y2={Cy} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5,3" />
          {/* Width label */}
          <text x={(Ax+Bx)/2} y={Ay+14} fontSize={11} fill={st.accentColor} fontFamily="sans-serif" textAnchor="middle" fontWeight="700">{width}</text>
          {/* Height label */}
          <text x={Ax-13} y={(Ay+Dy)/2+4} fontSize={11} fill="#a78bfa" fontFamily="sans-serif" textAnchor="middle" fontWeight="700">{height}</text>
          {/* Diagonal label */}
          <text x={(Ax+Cx)/2+10} y={(Ay+Cy)/2-5} fontSize={10} fill="#f59e0b" fontFamily="sans-serif" textAnchor="middle" fontWeight="700">AC≈{diagonal.toFixed(1)}</text>
          <text x={Ax-14} y={Ay+5}  fontSize={11} fill="#334155" fontFamily="sans-serif">A</text>
          <text x={Bx+5}  y={By+5}  fontSize={11} fill="#334155" fontFamily="sans-serif">B</text>
          <text x={Cx+5}  y={Cy+4}  fontSize={11} fill="#334155" fontFamily="sans-serif">C</text>
          <text x={Dx-14} y={Dy+4}  fontSize={11} fill="#334155" fontFamily="sans-serif">D</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "רוחב AB", val: width,              color: st.accentColor },
          { label: "גובה BC", val: height,             color: "#a78bfa" },
          { label: "אלכסון AC", val: diagonal.toFixed(2), color: "#f59e0b" },
          { label: "שטח",     val: area,               color: "#34d399" },
        ].map(tile => (
          <div key={tile.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12 }}>
            <div style={{ color: tile.color, fontFamily: "monospace", fontWeight: 700, fontSize: 11, marginBottom: 4 }}>{tile.label}</div>
            <div style={{ color: tile.color, fontWeight: 700, fontSize: 18 }}>{tile.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 14 }}>
        AC = √(AB² + BC²) = √({width}² + {height}²) = √{width*width + height*height} ≈ {diagonal.toFixed(2)}
      </p>
    </section>
  );
}

// ─── LabAdvanced ──────────────────────────────────────────────────────────────

function LabAdvanced() {
  const [base,   setBase]   = useState(10);
  const [height, setHeight] = useState(6);
  const [tilt,   setTilt]   = useState(55); // ∠A in degrees
  const st = STATION.advanced;

  const tiltRad  = (tilt * Math.PI) / 180;
  const area     = base * height;
  const sideAD   = height / Math.sin(tiltRad);
  const perimeter = 2 * (base + sideAD);

  // Auto-scale so parallelogram always fits in ~240px width
  const neededUnscaled = base + height / Math.tan(tiltRad);
  const scale = Math.min(9, 220 / neededUnscaled);

  const Ax = 30, Ay = 150;
  const Bx = Ax + base * scale,                        By = Ay;
  const Dx = Ax + (height * scale) / Math.tan(tiltRad), Dy = Ay - height * scale;
  const Cx = Bx + (Dx - Ax),                           Cy = Dy;
  const Ex = Dx, Ey = Ay;
  const Fx = Cx, Fy = Ay;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 12, padding: 6, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת גבהים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה את הבסיס, הגובה וההטיה — ראה כיצד המלבן EFCD נוצר בין שני הגבהים.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        {([
          { label: "בסיס DC", value: base,   min: 5,  max: 16, set: setBase,   color: st.accentColor, suffix: "" },
          { label: "גובה h",  value: height, min: 3,  max: 10, set: setHeight, color: "#f59e0b",      suffix: "" },
          { label: "הטיה ∠A", value: tilt,   min: 30, max: 75, set: setTilt,   color: "#a78bfa",      suffix: "°" },
        ] as const).map(sl => (
          <div key={sl.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: sl.color, fontFamily: "monospace", fontWeight: 700 }}>{sl.value}{sl.suffix}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={1} value={sl.value}
              onChange={e => sl.set(+e.target.value)} style={{ width: "100%", accentColor: sl.color }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 280 175" className="w-full max-w-sm mx-auto" aria-hidden>
          {/* Rectangle EFCD overlay */}
          <polygon points={`${Ex},${Ey} ${Fx},${Fy} ${Cx},${Cy} ${Dx},${Dy}`}
            fill="rgba(52,211,153,0.18)" stroke="#34d399" strokeWidth={1.5} strokeDasharray="4,3" />
          {/* Parallelogram ABCD */}
          <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy} ${Dx},${Dy}`}
            fill="rgba(220,38,38,0.04)" stroke={st.accentColor} strokeWidth={2} strokeLinejoin="round" />
          {/* Heights DE and CF */}
          <line x1={Dx} y1={Dy} x2={Ex} y2={Ey} stroke="#f59e0b" strokeWidth={2} />
          <line x1={Cx} y1={Cy} x2={Fx} y2={Fy} stroke="#f59e0b" strokeWidth={2} />
          {/* Right-angle markers */}
          <polyline points={`${Ex+7},${Ey} ${Ex+7},${Ey-7} ${Ex},${Ey-7}`} fill="none" stroke="#94a3b8" strokeWidth={1.2} />
          <polyline points={`${Fx-7},${Fy} ${Fx-7},${Fy-7} ${Fx},${Fy-7}`} fill="none" stroke="#94a3b8" strokeWidth={1.2} />
          {/* Labels */}
          <text x={Dx-13} y={(Dy+Ey)/2+4} fontSize={11} fill="#f59e0b" fontFamily="sans-serif" fontWeight="700" textAnchor="middle">{height}</text>
          <text x={(Ax+Bx)/2} y={Ay+14}   fontSize={11} fill={st.accentColor} fontFamily="sans-serif" fontWeight="700" textAnchor="middle">{base}</text>
          <text x={Ax-14} y={Ay+5}  fontSize={11} fill="#334155" fontFamily="sans-serif">A</text>
          <text x={Bx+5}  y={By+5}  fontSize={11} fill="#334155" fontFamily="sans-serif">B</text>
          <text x={Cx+5}  y={Cy+4}  fontSize={11} fill="#334155" fontFamily="sans-serif">C</text>
          <text x={Dx-14} y={Dy+4}  fontSize={11} fill="#334155" fontFamily="sans-serif">D</text>
          <text x={Ex-4}  y={Ey+14} fontSize={11} fill="#f59e0b" fontFamily="sans-serif">E</text>
          <text x={Fx+4}  y={Fy+14} fontSize={11} fill="#f59e0b" fontFamily="sans-serif">F</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "בסיס DC",  val: base,                   color: st.accentColor },
          { label: "גובה h",   val: height,                  color: "#f59e0b" },
          { label: "שטח",      val: area,                    color: "#34d399" },
          { label: "היקף ≈",   val: perimeter.toFixed(1),    color: "#a78bfa" },
        ].map(tile => (
          <div key={tile.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12 }}>
            <div style={{ color: tile.color, fontFamily: "monospace", fontWeight: 700, fontSize: 11, marginBottom: 4 }}>{tile.label}</div>
            <div style={{ color: tile.color, fontWeight: 700, fontSize: 18 }}>{tile.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 14 }}>
        S = בסיס × גובה = {base} × {height} = {area} &nbsp;|&nbsp; EF = DC = {base}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GeoParallelogramPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "163,79,38" : "139,38,53";

  return (
    <main
      style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties}
      dir="rtl"
    >
      {/* ── Global focus/hover border overrides — kills all browser black outlines ── */}
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
        <div style={{ margin: "0 auto", padding: "0.75rem 6px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          {/* Title */}
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>מקבילית ומלבן עם AI — כיתה י׳</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>זוויות, הוכחת מקבילית, הוכחת מלבן — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          {/* Back button */}
          <Link
            href="/topic/grade10/geometry"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            חזרה
          </Link>
        </div>
      </div>

      <div style={{ margin: "0 auto", padding: "1rem 4px 3rem" }}>

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

        {/* Active card */}
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        {/* Lab */}
        {selectedLevel === "basic"    && <LabBasic />}
        {selectedLevel === "medium"   && <LabMedium />}
        {selectedLevel === "advanced" && <LabAdvanced />}

      </div>
    </main>
  );
}
