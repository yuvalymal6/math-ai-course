"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import LabMessage from "@/app/components/LabMessage";
import { useDefaultToast } from "@/app/lib/useDefaultToast";
import SubtopicProgress from "@/app/components/SubtopicProgress";

type PromptStep = {
  phase: string;
  label: string;
  prompt: string;
  contextWords?: string[];  // Medium — dual-layer validator
  keywords?: string[];      // Advanced — strict keyword check
  keywordHint?: string;     // Advanced — hint text
};

type ExerciseDef = {
  id: "basic" | "medium" | "advanced";
  problem: string;
  diagram: React.ReactNode;
  pitfalls: { title: string; text: string }[];
  goldenPrompt: string;
  steps: PromptStep[];
};

// ─── ISLAND ───────────────────────────────────────────────────────────────────

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
  basic:    { stationName: "תחנה ראשונה",  badge: "מתחיל",  badgeCls: "bg-green-600 text-white", accentCls: "text-green-700", accentColor: "#2D5A27", borderHex: "#2D5A27", borderRgb: "45,90,39",  glowBorder: "rgba(45,90,39,0.35)",  glowShadow: "0 4px 16px rgba(45,90,39,0.12)",  glowRgb: "45,90,39"  },
  medium:   { stationName: "תחנה שנייה",   badge: "בינוני", badgeCls: "bg-amber-600 text-white", accentCls: "text-amber-700", accentColor: "#92400E", borderHex: "#92400E", borderRgb: "146,64,14", glowBorder: "rgba(146,64,14,0.35)", glowShadow: "0 4px 16px rgba(146,64,14,0.12)", glowRgb: "146,64,14" },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-800 text-white",   accentCls: "text-red-800",   accentColor: "#991b1b", borderHex: "#991b1b", borderRgb: "153,27,27", glowBorder: "rgba(153,27,27,0.35)", glowShadow: "0 4px 16px rgba(153,27,27,0.12)", glowRgb: "153,27,27" },
} as const;

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-700", border: "border-green-600", bg: "bg-green-600/10", glowColor: "rgba(45,90,39,0.3)"  },
  { id: "medium",   label: "בינוני", textColor: "text-amber-700", border: "border-amber-600", bg: "bg-amber-600/10", glowColor: "rgba(146,64,14,0.3)" },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-800",   border: "border-red-800",   bg: "bg-red-800/10",   glowColor: "rgba(153,27,27,0.3)" },
];

// ─── SVGs (light-theme) ───────────────────────────────────────────────────────

function GeoSeriesDotsSVG() {
  const count = 7, W = 260, cx = 18, cy = 40, step = (W - 2 * cx) / (count - 1);
  return (
    <svg viewBox={`0 0 ${W} 75`} className="w-full max-w-xs mx-auto" aria-hidden>
      <line x1={cx} y1={cy} x2={W - cx} y2={cy} stroke="#CBD5E0" strokeWidth={1.5} />
      {Array.from({ length: count }, (_, i) => {
        const x = cx + i * step, r = 5 + i * 1.5, isLast = i === count - 1;
        return (
          <g key={i}>
            <circle cx={x} cy={cy} r={isLast ? r + 3 : r} fill={isLast ? "#fef3c7" : "white"} stroke={isLast ? "#f59e0b" : "#a78bfa"} strokeWidth={isLast ? 2.5 : 1.8} />
            <text x={x} y={cy + r + 14} fill={isLast ? "#b45309" : "#64748b"} fontSize={9} textAnchor="middle" fontWeight={isLast ? "bold" : "normal"}>{i === 0 ? "a₁" : i === count - 1 ? "aₙ" : ""}</text>
          </g>
        );
      })}
      <text x={W / 2} y={72} fill="#94a3b8" fontSize={8} textAnchor="middle">סדרה הנדסית — כל איבר כפול q מהקודם</text>
    </svg>
  );
}

function GeoTwoPointSVG() {
  const count = 8, W = 260, cx = 18, cy = 40, step = (W - 2 * cx) / (count - 1);
  return (
    <svg viewBox={`0 0 ${W} 75`} className="w-full max-w-xs mx-auto" aria-hidden>
      <line x1={cx} y1={cy} x2={W - cx} y2={cy} stroke="#CBD5E0" strokeWidth={1.5} />
      {Array.from({ length: count }, (_, i) => {
        const x = cx + i * step, r = 5 + i * 1.5, a3 = i === 2, a7 = i === 6;
        return (
          <g key={i}>
            <circle cx={x} cy={cy} r={a3 || a7 ? r + 3 : r} fill={a3 ? "#fef3c7" : a7 ? "#ede9fe" : "white"} stroke={a3 ? "#f59e0b" : a7 ? "#a78bfa" : "#94a3b8"} strokeWidth={a3 || a7 ? 2.5 : 1.8} />
            <text x={x} y={cy + r + 14} fill={a3 ? "#b45309" : a7 ? "#7c3aed" : "#94a3b8"} fontSize={9} textAnchor="middle" fontWeight={a3 || a7 ? "bold" : "normal"}>{a3 ? "a₃" : a7 ? "a₇" : ""}</text>
          </g>
        );
      })}
      <text x={W / 2} y={72} fill="#94a3b8" fontSize={8} textAnchor="middle">שני איברים ידועים — הטריק: לחלק אחד בשני</text>
    </svg>
  );
}

function GeoA1A6SVG() {
  const count = 7, W = 260, cx = 20, cy = 42, gap = (W - 2 * cx) / (count - 1);
  return (
    <svg viewBox={`0 0 ${W} 74`} className="w-full max-w-xs mx-auto" aria-hidden>
      <line x1={cx} y1={cy} x2={W - cx} y2={cy} stroke="#CBD5E0" strokeWidth={1.2} />
      {Array.from({ length: count }, (_, i) => {
        const x = cx + i * gap;
        const r = 5 + i * 1.5;
        const isFirst = i === 0;
        const isLast  = i === count - 1;
        return (
          <g key={i}>
            <circle
              cx={x} cy={cy}
              r={isLast ? r + 2 : r}
              fill={isLast ? "#fef3c7" : "white"}
              stroke={isLast ? "#f59e0b" : "#a78bfa"}
              strokeWidth={isLast ? 2.5 : isFirst ? 2 : 1.5}
            />
            {(isFirst || isLast) && (
              <text
                x={x}
                y={cy + (isLast ? r + 2 : r) + 13}
                fill="#b45309"
                fontSize={10}
                textAnchor="middle"
                fontWeight="bold"
              >
                {isFirst ? "a₁" : "aₙ"}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function GeoConsecutivePairsSVG() {
  const W = 260, cx = 40, cy = 38, gap = (W - 2 * cx) / 3;
  const circles = ["a₁", "a₂", "a₃", "a₄"];
  return (
    <svg viewBox={`0 0 ${W} 76`} className="w-full max-w-xs mx-auto" aria-hidden>
      <line x1={cx} y1={cy} x2={W - cx} y2={cy} stroke="#CBD5E0" strokeWidth={1.2} />
      {/* Amber bracket: pair 1 */}
      <path d={`M ${cx - 6} ${cy + 13} Q ${cx + gap / 2} ${cy + 26} ${cx + gap + 6} ${cy + 13}`}
        fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" />
      {/* Violet bracket: pair 2 */}
      <path d={`M ${cx + gap - 6} ${cy + 13} Q ${cx + gap * 1.5} ${cy + 26} ${cx + gap * 2 + 6} ${cy + 13}`}
        fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" />
      {circles.map((label, i) => {
        const x = cx + i * gap;
        const inP1 = i === 0 || i === 1;
        const inP2 = i === 1 || i === 2;
        const shared = i === 1;
        return (
          <g key={i}>
            <circle cx={x} cy={cy} r={11}
              fill={shared ? "#fef3c7" : inP1 ? "#fef9eb" : inP2 ? "#f5f3ff" : "white"}
              stroke={shared ? "#f59e0b" : inP1 ? "#f59e0b" : inP2 ? "#a78bfa" : "#CBD5E0"}
              strokeWidth={inP1 || inP2 ? 2 : 1.2}
            />
            <text x={x} y={cy - 17} fill="#94a3b8" fontSize={9} textAnchor="middle">{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function InfiniteSumSVG() {
  const count = 9, W = 260, padX = 24, padY = 18, maxH = 90, base = 130;
  const barW = (W - 2 * padX) / (count + 1);
  return (
    <svg viewBox={`0 0 ${W} 150`} className="w-full max-w-xs mx-auto" aria-hidden>
      <line x1={padX} y1={base} x2={W - padX} y2={base} stroke="#CBD5E0" strokeWidth={1} />
      <line x1={padX} y1={padY} x2={W - padX} y2={padY} stroke="#f59e0b" strokeWidth={1.2} strokeDasharray="5,3" />
      <text x={W - padX - 2} y={padY - 5} fill="#b45309" fontSize={9} textAnchor="end">S∞</text>
      {Array.from({ length: count }, (_, i) => {
        const h = maxH * Math.pow(0.5, i);
        const x = padX + i * barW + 2;
        const opacity = Math.max(0.2, 0.85 - i * 0.08);
        return (
          <g key={i}>
            <rect x={x} y={base - h} width={barW - 4} height={h} fill={`rgba(124,58,237,${opacity})`} rx={2} />
            {i < 3 && (
              <text x={x + (barW - 4) / 2} y={base + 12} fill="#64748b" fontSize={8} textAnchor="middle">
                {i === 0 ? "a₁" : i === 1 ? "a₂" : "a₃"}
              </text>
            )}
          </g>
        );
      })}
      <text x={W / 2} y={148} fill="#94a3b8" fontSize={8} textAnchor="middle">כל עמודה = q·הקודמת → הסכום מתכנס ל-S∞</text>
    </svg>
  );
}

function DualSeriesSVG() {
  const W = 280, padX = 22, cy1 = 45, cy2 = 108;
  const countA = 7, gapA = (W - 2 * padX) / (countA - 1);
  const countB = 8, gapB = (W - 2 * padX) / (countB - 1);
  return (
    <svg viewBox={`0 0 ${W} 138`} className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Series A label */}
      <text x={padX} y={18} fill="#991b1b" fontSize={9} fontWeight="bold">סדרה A — הנדסית (n=10)</text>
      <line x1={padX} y1={cy1} x2={W - padX} y2={cy1} stroke="#CBD5E0" strokeWidth={1.2} />
      {Array.from({ length: countA }, (_, i) => {
        const x = padX + i * gapA, r = 5 + i * 1.4;
        const isA2 = i === 1, isA6 = i === 5;
        return (
          <g key={i}>
            <circle cx={x} cy={cy1} r={isA2 || isA6 ? r + 2 : r}
              fill={isA2 ? "#fef3c7" : isA6 ? "#fee2e2" : "white"}
              stroke={isA2 ? "#f59e0b" : isA6 ? "#991b1b" : "#a78bfa"}
              strokeWidth={isA2 || isA6 ? 2.5 : 1.5} />
            <text x={x} y={cy1 + r + 15} fill={isA2 ? "#92400e" : isA6 ? "#991b1b" : "#94a3b8"}
              fontSize={8} textAnchor="middle" fontWeight={isA2 || isA6 ? "bold" : "normal"}>
              {isA2 ? "a₂" : isA6 ? "a₆" : i === 0 ? "a₁" : ""}
            </text>
          </g>
        );
      })}
      {/* Series B label */}
      <text x={padX} y={cy2 - 16} fill="#1e40af" fontSize={9} fontWeight="bold">סדרה B — חשבונית (n=32)</text>
      <line x1={padX} y1={cy2} x2={W - padX} y2={cy2} stroke="#CBD5E0" strokeWidth={1.2} />
      {Array.from({ length: countB }, (_, i) => {
        const x = padX + i * gapB, r = 6;
        const isB2 = i === 1;
        return (
          <g key={i}>
            <circle cx={x} cy={cy2} r={r}
              fill={isB2 ? "#dbeafe" : "white"}
              stroke={isB2 ? "#1d4ed8" : "#93c5fd"}
              strokeWidth={isB2 ? 2.5 : 1.5} />
            <text x={x} y={cy2 + r + 14} fill={isB2 ? "#1e40af" : "#94a3b8"}
              fontSize={8} textAnchor="middle" fontWeight={isB2 ? "bold" : "normal"}>
              {isB2 ? "b₂" : i === 0 ? "b₁" : ""}
            </text>
          </g>
        );
      })}
      <text x={W / 2} y={136} fill="#94a3b8" fontSize={8} textAnchor="middle">שתי סדרות — A הנדסית, B חשבונית</text>
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

function GoldenPromptCard({ prompt, title = "פרומפט ראשי", borderRgb = "45,90,39" }: { prompt: string; title?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 20, background: "rgba(255,255,255,0.92)", padding: "1.5rem 1.75rem", marginBottom: 20, border: `2px solid rgba(${borderRgb},0.6)`, boxShadow: `0 0 20px rgba(${borderRgb},0.22), 0 0 40px rgba(${borderRgb},0.08), 0 4px 12px rgba(${borderRgb},0.1)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid rgba(${borderRgb},0.2)` }}>
        <span>✨</span>
        <span style={{ color: `rgb(${borderRgb})`, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" }}>{title}</span>
      </div>
      <p style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.75, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p>
      <CopyBtn text={prompt} label="העתק פרומפט מלא" />
    </div>
  );
}

function TutorStepBasic({ step, glowRgb = "45,90,39", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `2px solid rgba(${glowRgb},0.55)`, marginBottom: 10, boxShadow: `0 0 16px rgba(${glowRgb},0.2)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.82)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}>
        <span style={{ color: `rgb(${glowRgb})`, fontSize: 11, fontWeight: 800 }}>{step.phase}</span>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.45)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>הפרומפט המוכן ✍️</div>
          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `2px solid rgba(${borderRgb},0.4)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div>
        </div>
        <CopyBtn text={step.prompt} label="העתק פרומפט ממוקד" />
      </div>
    </div>
  );
}

function TutorStepMedium({ step, borderRgb = "146,64,14", locked = false, onPass }: {
  step: PromptStep; borderRgb?: string; locked?: boolean; onPass?: () => void;
}) {
  const [text,   setText]   = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);
  const passed = result !== null && !result.blocked && result.score >= 75;

  if (locked) return (
    <div style={{ borderRadius: 12, border: `2px solid rgba(${borderRgb},0.2)`, background: "rgba(255,255,255,0.3)", padding: "12px 16px", opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <span>🔒</span>
      <span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} — {step.label}</span>
    </div>
  );

  const validate = () => {
    const r = calculatePromptScore(text, step.contextWords ?? []);
    setResult(r);
    if (!r.blocked && r.score >= 75) onPass?.();
  };

  const scoreBarColor = !result ? "#9CA3AF"
    : result.score >= 75 ? "#16a34a"
    : result.score >= 50 ? "#d97706"
    : "#dc2626";

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: passed ? "1px solid rgba(245,158,11,0.55)" : `2px solid rgba(${borderRgb},0.5)`, marginBottom: 10, boxShadow: passed ? "0 0 16px rgba(245,158,11,0.25)" : `0 0 12px rgba(${borderRgb},0.1)`, transition: "border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.82)", borderBottom: `1px solid ${passed ? "rgba(245,158,11,0.3)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: `rgb(${borderRgb})`, fontSize: 11, fontWeight: 800 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.45)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl" disabled={passed}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="נסח כאן את הפרומפט שלך ל-AI (בקש הכוונה, לא פתרון)..."
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            ⚠️ {result.hint}
          </motion.div>
        )}

        {result && !result.blocked && result.score < 75 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            💡 {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
              ✅ פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result.score}/100</strong>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>
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

function TutorStepAdvanced({ step, unlocked, onValidated, borderRgb = "159,18,57" }: { step: PromptStep; unlocked: boolean; onValidated: () => void; borderRgb?: string }) {
  const [text, setText] = useState("");
  const [fb, setFb]     = useState<"idle" | "short" | "nokw" | "pass">("idle");
  const [copied, setCopied] = useState(false);
  if (!unlocked) return (
    <div style={{ borderRadius: 12, border: `2px solid rgba(${borderRgb},0.25)`, background: "rgba(255,255,255,0.3)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <span>🔒</span><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} — {step.label}</span>
    </div>
  );
  const passed = fb === "pass";
  const validate = () => {
    if (text.trim().length < 30) { setFb("short"); return; }
    if ((step.keywords ?? []).length > 0 && (step.keywords ?? []).some(kw => !text.includes(kw))) { setFb("nokw"); return; }
    setFb("pass"); onValidated();
  };
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: passed ? "1px solid rgba(52,211,153,0.35)" : `2px solid rgba(${borderRgb},0.5)`, marginBottom: 10, transition: "border-color 0.3s", boxShadow: passed ? "none" : `0 0 12px rgba(${borderRgb},0.1)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.82)", borderBottom: `1px solid ${passed ? "rgba(52,211,153,0.2)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: `rgb(${borderRgb})`, fontSize: 11, fontWeight: 800 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.45)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl" readOnly={passed}
          onChange={(e) => { if (!passed) { setText(e.target.value); setFb("idle"); } }}
          placeholder="כתוב את הפרומפט שלך לסעיף זה..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(6,78,59,0.1)" : "rgba(255,255,255,0.85)", border: passed ? "1px solid rgba(52,211,153,0.25)" : `2px solid rgba(${borderRgb},0.35)`, color: passed ? "#065f46" : "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />
        {fb === "idle"  && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `2px solid rgba(${borderRgb},0.5)`, color: "#2D3436", cursor: "pointer" }}>בדיקת AI מדומה 🤖</button>}
        {fb === "short" && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 10, background: "rgba(127,29,29,0.08)", border: "1px solid rgba(239,68,68,0.3)", padding: "8px 12px", color: "#DC2626", fontSize: 12 }}>⚠️ הניסוח קצר מדי — כתוב יותר פרטים.</motion.div>}
        {fb === "nokw"  && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 10, background: "rgba(120,53,15,0.08)", border: "1px solid rgba(245,158,11,0.3)", padding: "8px 12px", color: "#92400E", fontSize: 12 }}>💡 כמעט! חסרים — {step.keywordHint}.</motion.div>}
        {fb === "pass"  && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 10, background: "rgba(6,78,59,0.08)", border: "1px solid rgba(52,211,153,0.3)", padding: "8px 12px", color: "#065f46", fontSize: 12 }}>✅ מעולה! השלב הבא נפתח.</div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "1px solid rgba(52,211,153,0.3)", color: "#065f46", cursor: "pointer" }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק את הניסוח שלך"}
            </button>
          </motion.div>
        )}
        {(fb === "short" || fb === "nokw") && <button onClick={() => setFb("idle")} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>}
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
      <GoldenPromptCard prompt={goldenPrompt} title="פרומפט ראשי" borderRgb={borderRgb} />
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

function LadderMedium({ steps, goldenPrompt, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; borderRgb: string }) {
  const [unlockedCount, setUnlockedCount] = useState(1);
  return (
    <div>
      <GoldenPromptCard prompt={goldenPrompt} borderRgb={borderRgb} />
      {steps.map((s, i) => (
        <TutorStepMedium key={i} step={s} borderRgb={borderRgb}
          locked={i >= unlockedCount}
          onPass={() => setUnlockedCount(v => Math.max(v, i + 2))} />
      ))}
    </div>
  );
}

function LadderAdvanced({ steps, goldenPrompt, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; borderRgb: string }) {
  const [masterPassed, setMasterPassed] = useState(false);
  const [unlockedCount, setUnlockedCount] = useState(1);
  const allPassed = masterPassed && unlockedCount > steps.length;

  return (
    <div>
      <MasterPromptGate onPass={() => setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" />

      <GoldenPromptCard prompt={goldenPrompt} title="פרומפט ראשי — שתי סדרות" borderRgb={borderRgb} />

      {steps.map((s, i) => (
        <TutorStepMedium key={i} step={s} borderRgb={borderRgb}
          locked={!masterPassed || i >= unlockedCount}
          onPass={() => setUnlockedCount(v => Math.max(v, i + 2))} />
      ))}

      {allPassed && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          style={{ borderRadius: 16, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: "1.25rem 1.5rem", marginTop: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
          <div style={{ color: "#14532d", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>כל הכבוד — השלמת את הרמה המתקדמת!</div>
          <div style={{ color: "#166534", fontSize: 13 }}>עברת בהצלחה את ארבעת הסעיפים. אתה מוכן לבחינת הבגרות.</div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    problem: "נתונה סדרה הנדסית שבה a₁ = 3 ו-a₆ = 96.\n\nמצא את:\nא. מנת הסדרה (q)\nב. סכום 10 האיברים הראשונים (S₁₀)\nג. סכום 6 האיברים הראשונים במיקומים האי-זוגיים:\n   a₁ + a₃ + a₅ + a₇ + a₉ + a₁₁",
    diagram: <GeoA1A6SVG />,
    pitfalls: [
      { title: "💡 חילוץ המנה (q) מהנוסחה", text: "כשמבודדים את q מתוך הנוסחה aₙ = a₁·qⁿ⁻¹, שימו לב שפעולת הנגד לחזקה היא חילוץ שורש (לפי המעריך), ולא חילוק פשוט." },
      { title: "⚠️ דילוג על איברים בסדרה", text: "כאשר מבקשים לחשב סכום של איברים במיקומים מסוימים (כמו מקומות אי-זוגיים), המנה של הדילוג היא לא המנה המקורית (q). חשבו מהו הקשר בין איבר לאיבר שנמצא שני צעדים קדימה." },
      { title: "🔍 המעריך בנוסחת האיבר הכללי", text: "זכרו שהחזקה על המנה q מייצגת את מספר ה\"קפיצות\" מהאיבר הראשון. לכן, עבור האיבר ה-n, תמיד יהיו n−1 קפיצות." },
    ],
    goldenPrompt: `\nהיי, אני תלמיד בכיתה י״א, 4 יחידות, לומד עכשיו את נושא הסדרות ההנדסיות.\n\nאני רוצה שתשמש כמורה פרטי ומכוון. אני אציג לך שאלות ותרגילים, והמטרה שלך היא לא לפתור אותם עבורי, אלא לעזור לי להבין את הדרך בעצמי.\n\nחוקי העבודה שלנו:\n• בכל פעם שתקבל ממני נתונים, שאל אותי שאלות מנחות שיעזרו לי לזהות את הנוסחאות המתאימות.\n• אם אני טועה, אל תיתן לי את התשובה הנכונה – הסבר לי איפה הלוגיקה שלי נעצרה, או כוון אותי להסתכל שוב על הנתונים.\n• לאחר שסיימת להדריך אותי על סעיף מסוים, עצור והמתן לשאלה הבאה שלי. אל תעבור אוטומטית לסעיף הבא ואל תציג את השאלה הבאה עד שאבקש זאת במפורש.\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      {
        phase: "🔍 סעיף א׳",
        label: "מציאת המנה q",
        prompt: "\n\nאיך נמצא את q לפי נתוני התרגיל?",
        keywords: [], keywordHint: "",
      },
      {
        phase: "🧭 סעיף ב׳",
        label: "חישוב S₁₀",
        prompt: "\n\nהכוון אותי לחישוב סכום 10 האיברים הראשונים (S₁₀).",
        keywords: [], keywordHint: "",
      },
      {
        phase: "🔢 סעיף ג׳",
        label: "סכום האיברים האי-זוגיים",
        prompt: "\n\nעלינו למצוא את סכום 6 האיברים הראשונים במיקומים האי-זוגיים, למד אותי איך נעשה זאת.",
        keywords: [], keywordHint: "",
      },
    ],
  },
  {
    id: "medium",
    problem: "בסדרה הנדסית ידוע כי:\na₁ + a₂ = 12\na₂ + a₃ = 24\n\nמצא את:\nא. מנת הסדרה (q) והאיבר הראשון (a₁)\nב. הוכח כי הסדרה עולה\nג. חשב את סכום 8 האיברים הראשונים (S₈)",
    diagram: <GeoConsecutivePairsSVG />,
    pitfalls: [
      { title: "💡 זיהוי היחס בין הסכומים", text: "כשנתונים שני סכומים רצופים של זוגות איברים, חשבו: מה הפעולה שמעבירה מסכום אחד לשני? הקשר הזה הוא המנה." },
      { title: "⚠️ הוכחת סדרה עולה", text: "כדי להוכיח שסדרה הנדסית עולה, בדקו שני תנאים: האיבר הראשון חיובי, והמנה גדולה מ-1." },
      { title: "🔍 המעריך בנוסחת האיבר הכללי", text: "זכרו שהחזקה על המנה q מייצגת את מספר ה\"קפיצות\" מהאיבר הראשון. לכן, עבור האיבר ה-n, תמיד יהיו n−1 קפיצות." },
    ],
    goldenPrompt: `\nהיי, אני תלמיד בכיתה י״א, 4 יחידות, לומד סדרות הנדסיות.\nנתון: a₁+a₂=12 ו-a₂+a₃=24.\nאני רוצה שתכווין אותי שלב אחרי שלב — רק שאלה אחת בכל פעם.\nתחל בהבנת הנתונים, ואז נמצא את q ו-a₁.\nחשוב: לאחר שסיימת להדריך אותי על כל שלב, עצור והמתן לשאלה הבאה שלי. אל תעבור אוטומטית לסעיף הבא.\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      {
        phase: "🔍 סעיף א׳",
        label: "מצא את q ו-a₁",
        prompt: "\n\nנתון a₁+a₂=12 ו-a₂+a₃=24. כיצד אמצא את q מתוך שני הנתונים האלה? איזה פעולה כדאי לבצע על שתי המשוואות כדי לבודד את המנה?",
        contextWords: [
          "משוואה", "מערכת", "נתונים",
          "לחלק", "חלוקה", "חילוק", "יחס", "שבר",
          "להציב", "הצבה",
          "לצמצם", "צמצום", "לבטל",
          "a1", "q", "מנה", "ראשון", "איבר",
          "גורם", "משותף", "בידוד", "לבודד",
          "נעלמ", "פירוק",
        ],
      },
      {
        phase: "🧭 סעיף ב׳",
        label: "הוכח שהסדרה עולה",
        prompt: "\n\nמצאתי את ערכי a₁ ו-q. אילו שני תנאים צריך לבדוק כדי להוכיח שסדרה הנדסית עולה? כיצד אוכיח זאת לפי ערכים שמצאתי?",
        contextWords: [
          "עול", "גדל", "צומח",
          "חיובי", "חיובית",
          "q", "מנה", "גדול", "יותר מ",
          "הוכח", "להוכיח", "הוכחה",
          "מגמה", "ערך", "תנאי",
          "סיבה", "למה", "מדוע",
        ],
      },
      {
        phase: "🔢 סעיף ג׳",
        label: "חשב את S₈",
        prompt: "\n\nכיצד אחשב את S₈ עם הנוסחה שלמדתי? עזור לי להציב נכון את n, a₁ ו-q.",
        contextWords: [
          "סכום", "Sn", "S8",
          "שמונה", "8", "איבר",
          "נוסחה", "להציב", "הצבה",
          "לחשב", "חישוב",
        ],
      },
    ],
  },
  {
    id: "advanced",
    problem: "נתונה סדרה הנדסית A שבה המנה היא q ויש בה 10 איברים.\nהאיבר השישי בסדרה גדול פי 81 מהאיבר השני.\nסכום שני האיברים האמצעיים בסדרה A הוא 1,296, וכל איבריה חיוביים.\n\nנתונה סדרה חשבונית B. סכום סדרה A גדול פי 11 מסכום סדרה B.\nבסדרה B יש 32 איברים, והאיבר השני בה גדול פי 16 מהפרש הסדרה (d).\n\nמצא:\nא. את שני הערכים האפשריים של q (ואיזה נפסל ומדוע)\nב. את האיבר הראשון (a₁) של סדרה A\nג. את סכום סדרה B\nד. את הפרש הסדרה (d) של סדרה B",
    diagram: <DualSeriesSVG />,
    pitfalls: [
      { title: "💡 שני ערכי q — מי נפסל?", text: "הנתון קובע שכל איברי הסדרה חיוביים , תשמש בזה כדי לפסול את אחת התשובות." },
      { title: "⚠️ מיהם האיברים האמצעיים בסדרה של 10 איברים?", text: "בסדרה של 10 איברים אין איבר אמצעי יחיד. מיהם שני האיברים האמצעיים?" },
    ],
    goldenPrompt: `\nהיי, אני תלמיד בכיתה י״ב בנושא סדרות (הנדסית וחשבונית).\nיש לי שאלה מתקדמת עם שתי סדרות — A הנדסית ו-B חשבונית.\nאני רוצה שתהיה המורה שלי — שאל אותי שאלות מנחות, אל תיתן תשובות ישירות.\nנעבוד סעיף-סעיף: קודם מציאת q, אחר כך a₁, ואז סכום B והפרש d.`,
    steps: [
      {
        phase: "⚔️ סעיף א׳",
        label: "מצא את q (שני ערכים, והסבר מי נפסל)",
        prompt: "\n\n",
        contextWords: [
          "מנה", "q", "יחס", "חלוקה",
          "a6", "a2", "שורש", "חזקה", "רביעי",
          "q^4", "81", "משוואה",
          "חיוביים", "חיובי", "פסיל", "שלילי",
        ],
      },
      {
        phase: "⚔️ סעיף ב׳",
        label: "מצא את a₁ של סדרה A",
        prompt: "\n\n",
        contextWords: [
          "a1", "a5", "a6", "אמצעיים", "אמצעי",
          "חמישי", "שישי", "1296", "סכום",
          "הצבה", "נוסחה", "לבודד", "לחשב",
        ],
      },
      {
        phase: "⚔️ סעיף ג׳",
        label: "מצא את סכום סדרה B",
        prompt: "\n\n",
        contextWords: [
          "סכום", "Sn", "SA", "11", "גדול פי",
          "לחלק", "חלוקה", "יחס", "חשבונית",
        ],
      },
      {
        phase: "⚔️ סעיף ד׳",
        label: "מצא את d של סדרה B",
        prompt: "\n\n",
        contextWords: [
          "הפרש", "d", "b2", "16d", "16",
          "משוואה", "32", "b1", "פתרון",
          "להציב", "לפתור",
        ],
      },
    ],
  },
];

// ─── Exercise Card ────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() {
    navigator.clipboard.writeText(ex.problem.split(/\n+סעיף/)[0].trim());
    setCopiedProblem(true);
    setTimeout(() => setCopiedProblem(false), 2000);
  }
  return (
    <section style={{ borderRadius: 32, border: `2px solid rgba(${s.borderRgb},0.5)`, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", padding: "2.5rem", marginBottom: "2rem", marginLeft: "auto", marginRight: "auto", boxShadow: `0 10px 15px -3px rgba(60,54,42,0.1), 0 0 24px rgba(${s.borderRgb},0.08)` }}>

      {/* Formula bar */}
      {ex.id !== "advanced" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "flex-start", justifyContent: "space-between", borderRadius: 16, border: `2px solid rgba(${s.borderRgb},0.4)`, background: "rgba(255,255,255,0.88)", padding: "1rem 1.5rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1.75rem", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>האיבר הכללי</div>
              <div style={{ color: s.accentColor, fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}>aₙ = a₁ · qⁿ⁻¹</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>סכום n איברים</div>
              <div style={{ color: s.accentColor, fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}>Sₙ = a₁(qⁿ-1)/(q-1)</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>סכום אינסופי</div>
              <div style={{ color: s.accentColor, fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}>S∞ = a₁/(1−q)</div>
            </div>
          </div>
          <div style={{ width: 1, background: `rgba(${s.borderRgb},0.2)`, alignSelf: "stretch", minHeight: 60 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ color: "#1A1A1A", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>מקרא פרמטרים</div>
            {[
              { sym: "a₁", desc: "האיבר הראשון בסדרה" },
              { sym: "q",  desc: "מנת הסדרה (המספר בו כופלים כל איבר)" },
              { sym: "n",  desc: "מספר האיברים / מיקום האיבר" },
              { sym: "aₙ", desc: "האיבר במקום ה-n (האיבר הכללי)" },
              { sym: "Sₙ", desc: "סכום n האיברים הראשונים" },
              { sym: "S∞", desc: "סכום סדרה הנדסית אינסופית" },
            ].map(p => (
              <div key={p.sym} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ color: "#2D5A27", fontFamily: "monospace", fontWeight: 700, fontSize: 12, minWidth: 28 }}>{p.sym}</span>
                <span style={{ color: "#6B7280", fontSize: 11 }}>— {p.desc}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Advanced formula bar — both geometric + arithmetic */
        <div style={{ borderRadius: 16, border: `2px solid rgba(${s.borderRgb},0.4)`, background: "rgba(255,255,255,0.88)", padding: "1rem 1.5rem", marginBottom: "2rem" }}>
          <div style={{ color: "#991b1b", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>מתקדם — נוסחאות: סדרה הנדסית A + סדרה חשבונית B</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem" }}>
            <div>
              <div style={{ color: "#6B7280", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>הנדסית A</div>
              {[
                { label: "איבר כללי", f: "aₙ = a₁ · qⁿ⁻¹" },
                { label: "סכום",      f: "Sₙ = a₁(qⁿ-1)/(q-1)" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ color: "#6B7280", fontSize: 10 }}>{r.label}:</span>
                  <span style={{ color: "#991b1b", fontFamily: "monospace", fontSize: 13, fontWeight: 700 }}>{r.f}</span>
                </div>
              ))}
            </div>
            <div style={{ width: 1, background: "rgba(153,27,27,0.15)", alignSelf: "stretch" }} />
            <div>
              <div style={{ color: "#6B7280", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>חשבונית B</div>
              {[
                { label: "איבר כללי", f: "bₙ = b₁ + (n−1)d" },
                { label: "סכום",      f: "Sₙ = (n/2)(2b₁ + (n−1)d)" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ color: "#6B7280", fontSize: 10 }}>{r.label}:</span>
                  <span style={{ color: "#1e40af", fontFamily: "monospace", fontSize: 13, fontWeight: 700 }}>{r.f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: "2rem" }} />

      {/* Diagram */}
      <div style={{ borderRadius: 16, border: `2px solid rgba(${s.borderRgb},0.45)`, background: "rgba(255,255,255,0.88)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>

      {/* Problem */}
      <div style={{ borderRadius: 16, border: `2px solid rgba(${s.borderRgb},0.5)`, background: "rgba(255,255,255,0.88)", padding: "1.5rem", marginBottom: "2rem" }}>
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
      <div style={{ borderRadius: 16, border: `2px solid rgba(${s.borderRgb},0.45)`, background: "rgba(255,255,255,0.88)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: `rgb(${s.borderRgb})`, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
        {ex.id === "basic"    && <LadderBase     steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium   steps={ex.steps} goldenPrompt={ex.goldenPrompt} borderRgb={s.borderRgb} />}
        {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} goldenPrompt={ex.goldenPrompt} borderRgb={s.borderRgb} />}
      </div>

    </section>
  );
}

// ─── Geo Series Lab ───────────────────────────────────────────────────────────

function GeoSeriesLab({ levelId }: { levelId: "basic" | "medium" }) {
  const [a1, setA1] = useState(3);
  const [q,  setQ]  = useState(2);
  const [n,  setN]  = useState(11);
  const st = STATION[levelId];
  const safeQ = q === 1 ? 1.001 : q;
  const terms = Array.from({ length: n }, (_, i) => Math.round(a1 * Math.pow(q, i) * 100) / 100);
  const an = Math.round(a1 * Math.pow(q, n - 1) * 100) / 100;
  const Sn = q === 1 ? a1 * n : Math.round((a1 * (1 - Math.pow(safeQ, n)) / (1 - safeQ)) * 100) / 100;

  return (
    <section style={{ border: `2px solid rgba(${st.borderRgb},0.5)`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: `0 10px 15px -3px rgba(60,54,42,0.1), 0 0 24px rgba(${st.borderRgb},0.08)` }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת סדרה הנדסית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה את a₁, q ו-n — ראה את האיברים והסכום מתעדכנים בלייב</p>

      {/* Sliders */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: "2rem", background: "rgba(255,255,255,0.88)", borderRadius: 16, border: `2px solid rgba(${st.borderRgb},0.4)`, padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        {[
          { title: "איבר ראשון", varSym: "a₁", val: a1, set: setA1, min: -20, max: 20 },
          { title: "מנה",         varSym: "q",   val: q,  set: setQ,  min: -5,  max: 7  },
          { title: "מספר איברים", varSym: "n",   val: n,  set: setN,  min: 0,   max: 20 },
        ].map((row) => (
          <div key={row.varSym}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{row.title} <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 600 }}>({row.varSym})</span></span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{row.val}</span>
            </div>
            <input type="range" min={row.min} max={row.max} step={1} value={row.val} onChange={(e) => row.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* Terms */}
      <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.88)", border: `2px solid rgba(${st.borderRgb},0.45)`, padding: "1rem", marginBottom: "1rem" }}>
        <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>האיברים</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {terms.map((t, i) => {
            const isFirst = i === 0;
            const isLast  = i === n - 1;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <span style={{
                  borderRadius: 8, padding: "4px 10px", fontSize: 14, fontFamily: "monospace",
                  border: `2px solid ${isFirst || isLast ? `rgba(${st.borderRgb},0.6)` : `rgba(${st.borderRgb},0.25)`}`,
                  color:      isFirst || isLast ? st.accentColor : "#2D3436",
                  background: isFirst || isLast ? `rgba(${st.borderRgb},0.08)` : "rgba(60,54,42,0.04)",
                  fontWeight: isFirst || isLast ? 700 : 400,
                }}>{t}</span>
                {(isFirst || isLast) && (
                  <span style={{ fontSize: 9, color: "#6B7280", fontFamily: "monospace" }}>
                    {isFirst ? "[a₁]" : "[aₙ]"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "aₙ", val: an, sub: "האיבר האחרון"         },
          { label: "Sₙ", val: Sn, sub: "סכום הסדרה"          },
          { label: "q",  val: q,  sub: "מנת הסדרה (aₙ₊₁/aₙ)" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.88)", border: `2px solid rgba(${st.borderRgb},0.5)`, padding: 12, boxShadow: `0 4px 16px rgba(${st.glowRgb},0.12)` }}>
            <div style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20 }}>{row.val}</div>
            <div style={{ color: "#6B7280", fontSize: 10, marginTop: 4 }}>{row.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SeriesGeometricPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "146,64,14" : "153,27,27";

  return (
    <main
      style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties}
      dir="rtl"
    >
      <style>{`
        textarea, input[type="text"] { outline: none !important; }
        textarea:focus, input[type="text"]:focus { outline: none !important; border-color: rgba(var(--lvl-rgb), 0.65) !important; box-shadow: 0 0 0 3px rgba(var(--lvl-rgb), 0.12) !important; }
        input[type="range"] { outline: none !important; }
        input[type="range"]:focus { outline: none !important; }
        button:focus, button:focus-visible { outline: none !important; box-shadow: 0 0 0 2px rgba(var(--lvl-rgb), 0.35) !important; }
        button:focus:not(:focus-visible) { box-shadow: none !important; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>סדרה הנדסית עם AI</h1>
          <Link
            href="/topic/grade12/series"
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

        {/* Sub-topic progress */}
        <SubtopicProgress subtopicId="/grade12/series-geometric" />

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

        {/* Lab — shown only for basic and medium */}
        {selectedLevel !== "advanced" && <GeoSeriesLab levelId={selectedLevel} />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="/grade12/series-geometric" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
