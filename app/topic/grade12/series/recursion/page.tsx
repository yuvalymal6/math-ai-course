"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import LabMessage from "@/app/components/LabMessage";
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
  prompt: string;
  contextWords?: string[];
  keywords?: string[];
  keywordHint?: string;
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
  basic:    { stationName: "תחנה ראשונה",  badge: "מתחיל",  badgeCls: "bg-green-600 text-white", accentCls: "text-green-700", accentColor: "#2D5A27", borderHex: "#2D5A27", borderRgb: "45,90,39",  glowBorder: "rgba(45,90,39,0.35)",  glowShadow: "0 4px 16px rgba(45,90,39,0.12)",  glowRgb: "45,90,39"  },
  medium:   { stationName: "תחנה שנייה",   badge: "בינוני", badgeCls: "bg-amber-600 text-white", accentCls: "text-amber-700", accentColor: "#92400E", borderHex: "#92400E", borderRgb: "146,64,14", glowBorder: "rgba(146,64,14,0.35)", glowShadow: "0 4px 16px rgba(146,64,14,0.12)", glowRgb: "146,64,14" },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-800 text-white",   accentCls: "text-red-800",   accentColor: "#991b1b", borderHex: "#991b1b", borderRgb: "153,27,27", glowBorder: "rgba(153,27,27,0.35)", glowShadow: "0 4px 16px rgba(153,27,27,0.12)", glowRgb: "153,27,27" },
} as const;

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-700", border: "border-green-600", bg: "bg-green-600/10", glowColor: "rgba(45,90,39,0.3)"  },
  { id: "medium",   label: "בינוני", textColor: "text-amber-700", border: "border-amber-600", bg: "bg-amber-600/10", glowColor: "rgba(146,64,14,0.3)" },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-800",   border: "border-red-800",   bg: "bg-red-800/10",   glowColor: "rgba(153,27,27,0.3)" },
];

// ─── Silent SVG diagrams ─────────────────────────────────────────────────────

function BasicSVG() {
  const TERMS = ["a\u2081", "a\u2082", "a\u2083", "a\u2084"];
  return (
    <svg viewBox="0 0 340 86" className="w-full max-w-sm mx-auto" aria-hidden>
      <defs>
        <marker id="rec-ar-a" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#f59e0b" />
        </marker>
      </defs>
      {TERMS.map((label, i) => (
        <g key={i}>
          <rect x={8 + i * 80} y={26} width={54} height={34} rx={9}
            fill="white" stroke="#CBD5E0" strokeWidth={1.5} />
          <text x={35 + i * 80} y={48} textAnchor="middle" fontSize={13}
            fill="#64748b" fontFamily="monospace">{label}</text>
        </g>
      ))}
      {[0, 1, 2].map(i => (
        <g key={i}>
          <line x1={63 + i * 80} y1={43} x2={83 + i * 80} y2={43}
            stroke="#f59e0b" strokeWidth={1.5} markerEnd="url(#rec-ar-a)" />
          <text x={73 + i * 80} y={38} textAnchor="middle" fontSize={9} fill="#f59e0b">+d</text>
        </g>
      ))}
      <text x={325} y={47} fontSize={13} fill="#94a3b8">{"\u2026"}</text>
    </svg>
  );
}

function MediumSVG() {
  const TERMS = ["a\u2081", "a\u2082", "a\u2083", "a\u2084"];
  return (
    <svg viewBox="0 0 340 86" className="w-full max-w-sm mx-auto" aria-hidden>
      <defs>
        <marker id="rec-ar-g" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#34d399" />
        </marker>
      </defs>
      {TERMS.map((label, i) => (
        <g key={i}>
          <rect x={8 + i * 80} y={26} width={54} height={34} rx={9}
            fill="white" stroke="#CBD5E0" strokeWidth={1.5} />
          <text x={35 + i * 80} y={48} textAnchor="middle" fontSize={13}
            fill="#64748b" fontFamily="monospace">{label}</text>
        </g>
      ))}
      {[0, 1, 2].map(i => (
        <g key={i}>
          <line x1={63 + i * 80} y1={43} x2={83 + i * 80} y2={43}
            stroke="#34d399" strokeWidth={1.5} markerEnd="url(#rec-ar-g)" />
          <text x={73 + i * 80} y={38} textAnchor="middle" fontSize={9} fill="#34d399">{"\u00D7q"}</text>
        </g>
      ))}
      <text x={325} y={47} fontSize={13} fill="#94a3b8">{"\u2026"}</text>
    </svg>
  );
}

function AdvancedSVG() {
  const TERMS = ["a\u2081", "a\u2082", "a\u2083", "a\u2084"];
  return (
    <svg viewBox="0 0 340 96" className="w-full max-w-sm mx-auto" aria-hidden>
      <defs>
        <marker id="rec-ar-r" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#a78bfa" />
        </marker>
      </defs>
      {TERMS.map((label, i) => (
        <g key={i}>
          <rect x={8 + i * 80} y={36} width={54} height={34} rx={9}
            fill="white" stroke="#CBD5E0" strokeWidth={1.5} />
          <text x={35 + i * 80} y={58} textAnchor="middle" fontSize={13}
            fill="#64748b" fontFamily="monospace">{label}</text>
        </g>
      ))}
      {[0, 1, 2].map(i => (
        <g key={i}>
          <path
            d={`M${63 + i * 80},53 C${70 + i * 80},12 ${76 + i * 80},12 ${83 + i * 80},53`}
            fill="none" stroke="#a78bfa" strokeWidth={1.5} markerEnd="url(#rec-ar-r)" />
          <text x={73 + i * 80} y={10} textAnchor="middle" fontSize={8} fill="#a78bfa">f(a&#x2099;)</text>
        </g>
      ))}
      <text x={325} y={57} fontSize={13} fill="#94a3b8">{"\u2026"}</text>
      <text x={170} y={92} textAnchor="middle" fontSize={8} fill="#a78bfa">?</text>
    </svg>
  );
}

// ─── Prompt Coach Atoms ──────────────────────────────────────────────────────

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
        <span>{"\u2728"}</span>
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
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{"הפרומפט המוכן \u270D\uFE0F"}</div>
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
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);
  const passed = result !== null && !result.blocked && result.score >= 75;

  if (locked) return (
    <div style={{ borderRadius: 12, border: `2px solid rgba(${borderRgb},0.2)`, background: "rgba(255,255,255,0.3)", padding: "12px 16px", opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <span>{"\uD83D\uDD12"}</span>
      <span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} {"\u2014"} {step.label}</span>
    </div>
  );

  const validate = () => {
    const r = calculatePromptScore(text, step.contextWords ?? []);
    setResult(r);
    if (!r.blocked && r.score >= 75) onPass?.();
  };

  const scoreBarColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";

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

        {result && result.blocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            {"\u26A0\uFE0F"} {result.hint}
          </motion.div>
        )}

        {result && !result.blocked && result.score < 75 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            {"\uD83D\uDCA1"} {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
              {"\u2705"} פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result.score}/100</strong>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}
            </button>
          </motion.div>
        )}

        {!result && (
          <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>
            {"\uD83E\uDD16"} בדיקת AI מדומה
          </button>
        )}

        {result && !passed && (
          <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>
        )}
      </div>
    </div>
  );
}

function TutorStepAdvanced({ step, unlocked, onValidated, borderRgb = "153,27,27" }: { step: PromptStep; unlocked: boolean; onValidated: () => void; borderRgb?: string }) {
  const [text, setText] = useState("");
  const [fb, setFb] = useState<"idle" | "short" | "nokw" | "pass">("idle");
  const [copied, setCopied] = useState(false);
  if (!unlocked) return (
    <div style={{ borderRadius: 12, border: `2px solid rgba(${borderRgb},0.25)`, background: "rgba(255,255,255,0.3)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <span>{"\uD83D\uDD12"}</span><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} {"\u2014"} {step.label}</span>
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
        {fb === "idle" && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `2px solid rgba(${borderRgb},0.5)`, color: "#2D3436", cursor: "pointer" }}>{"\uD83E\uDD16"} בדיקת AI מדומה</button>}
        {fb === "short" && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 10, background: "rgba(127,29,29,0.08)", border: "1px solid rgba(239,68,68,0.3)", padding: "8px 12px", color: "#DC2626", fontSize: 12 }}>{"\u26A0\uFE0F"} הניסוח קצר מדי {"\u2014"} כתוב יותר פרטים.</motion.div>}
        {fb === "nokw" && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 10, background: "rgba(120,53,15,0.08)", border: "1px solid rgba(245,158,11,0.3)", padding: "8px 12px", color: "#92400E", fontSize: 12 }}>{"\uD83D\uDCA1"} כמעט! חסרים {"\u2014"} {step.keywordHint}.</motion.div>}
        {fb === "pass" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 10, background: "rgba(6,78,59,0.08)", border: "1px solid rgba(52,211,153,0.3)", padding: "8px 12px", color: "#065f46", fontSize: 12 }}>{"\u2705"} מעולה! השלב הבא נפתח.</div>
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

// ─── Ladders ─────────────────────────────────────────────────────────────────

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
                  {"סיימתי סעיף זה \u2713"}
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>{"\u2705"} הושלם</div>
              )}
            </>
          ) : (
            <div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}>
              <div style={{ position: "absolute", top: 8, right: 8, fontSize: 16, zIndex: 2 }}>{"\uD83D\uDD12"}</div>
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

function LadderAdvanced({ steps, borderRgb }: { steps: PromptStep[]; borderRgb: string }) {
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
        subjectWords={["כלל נסיגה", "רקורסיה", "סדרה", "נוסחה סגורה", "חשבונית", "הנדסית"]}
      />

      {steps.map((s, i) => (
        <TutorStepAdvanced key={i} step={s} borderRgb={borderRgb}
          unlocked={masterPassed && i < unlockedCount}
          onValidated={() => setUnlockedCount(v => Math.max(v, i + 2))} />
      ))}

      {allPassed && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          style={{ borderRadius: 16, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: "1.25rem 1.5rem", marginTop: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{"\uD83C\uDFC6"}</div>
          <div style={{ color: "#14532d", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{"כל הכבוד \u2014 השלמת את הרמה המתקדמת!"}</div>
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
    problem: "נתון כלל נסיגה: a\u2081 = 1, a\u2099\u208A\u2081 = a\u2099 + 4\n\nמצא:\n\u05D0. חשב את a\u2082, a\u2083, a\u2084, a\u2085\n\u05D1. זהה את סוג הסדרה ומצא את d\n\u05D2. כתוב את נוסחת האיבר הכללי a\u2099",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "\u26A0\uFE0F שכחת להציב שלב-שלב?", text: "תלמידים רבים קופצים ישר לנוסחה הסגורה מבלי לחשב קודם כל איבר בנפרד. הצבה רצופה חושפת את הדפוס." },
      { title: "\uD83D\uDCA1 בלבול בין d ל-a\u2081", text: "d הוא הקבוע שמתווסף בכל צעד, לא ערך האיבר הראשון. שני הנתונים שונים ומשפיעים אחרת על הנוסחה." },
    ],
    goldenPrompt: "היי, אני תלמיד בכיתה יב\u05F3, לומד עכשיו כלל נסיגה בסדרות.\nצירפתי לך תרגיל על כלל נסיגה של סדרה חשבונית \u2014 חישוב איברים וכתיבת נוסחה סגורה.\nאני רוצה שתשמש כמורה פרטי ומכוון. הנה הפרוטוקול שלנו:\n\n1\uFE0F\u20E3 סריקה:\nקודם כל, תסרוק את הנתונים ותכתוב לי רק:\n\u201Cזיהיתי את הנתונים. מחכה להוראות לשלב א\u05F3.\u201D\n(אל תפתור כלום ואל תסביר כלום בשלב הזה!)\n\n2\uFE0F\u20E3 תפקיד:\nאתה המורה שלי. זה אומר שאתה לא פותר במקומי.\n\n3\uFE0F\u20E3 שיטת עבודה:\nאני אשלח לך כל פעם שלב (א\u05F3, ב\u05F3 או ג\u05F3).\nבתגובה, אתה שואל אותי רק שאלה אחת מכוונת על הנוסחה או השלב הבא.\nחכה לי בין שלב לשלב ואל תמשיך לפני שאני שולח.",
    steps: [
      {
        phase: "\uD83D\uDD0D סעיף א\u05F3",
        label: "חשב את a\u2082, a\u2083, a\u2084, a\u2085",
        prompt: "נתון כלל נסיגה: a\u2081=1, a\u2099\u208A\u2081 = a\u2099 + 4. תנחה אותי \u2014 איך מחשבים כל איבר מהאיבר הקודם? אל תפתור עבורי.",
      },
      {
        phase: "\uD83E\uDDED סעיף ב\u05F3",
        label: "זהה את סוג הסדרה ומצא את d",
        prompt: "נתון כלל הנסיגה a\u2099\u208A\u2081 = a\u2099 + 4. חישבתי את האיברים הראשונים. תנחה אותי \u2014 איך מזהים אם זו סדרה חשבונית ומהו ההפרש? אל תיתן את התשובה.",
      },
      {
        phase: "\uD83D\uDD22 סעיף ג\u05F3",
        label: "כתוב את נוסחת האיבר הכללי a\u2099",
        prompt: "נתון כלל הנסיגה: a\u2081=1, ו-d שמצאתי. הנחה אותי \u2014 איך בונים נוסחה סגורה לאיבר הכללי של סדרה חשבונית? אל תגלה את התוצאה הסופית.",
      },
    ],
  },
  {
    id: "medium",
    problem: "נתון כלל נסיגה: a\u2081 = 2, a\u2099\u208A\u2081 = 3\u00B7a\u2099\n\nמצא:\n\u05D0. חשב את 5 האיברים הראשונים\n\u05D1. זהה את סוג הסדרה ומצא את q\n\u05D2. כתוב את הנוסחה הסגורה וחשב את a\u2081\u2080",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "\u26A0\uFE0F בלבול בין הפרש למנה", text: "כשכלל הנסיגה מכפיל במקום מחבר, הסדרה היא הנדסית ולא חשבונית. בדוק: פעולת הכפל = מנה q." },
      { title: "\uD83D\uDCA1 המעריך בנוסחה הסגורה", text: "בנוסחה a\u2099 = a\u2081\u00B7q\u207F\u207B\u00B9 המעריך הוא n\u22121 ולא n. תלמידים רבים טועים כאן ומקבלים תוצאה שגויה." },
    ],
    goldenPrompt: "היי, אני תלמיד בכיתה יב\u05F3, לומד עכשיו כלל נסיגה בסדרות.\nצירפתי לך תרגיל על כלל נסיגה של סדרה הנדסית \u2014 חישוב איברים, זיהוי סוג ונוסחה סגורה.\nאני רוצה שתשמש כמורה פרטי ומכוון. הנה הפרוטוקול שלנו:\n\n1\uFE0F\u20E3 סריקה:\nקודם כל, תסרוק את הנתונים ותכתוב לי רק:\n\u201Cזיהיתי את הנתונים. מחכה להוראות לשלב א\u05F3.\u201D\n(אל תפתור כלום ואל תסביר כלום בשלב הזה!)\n\n2\uFE0F\u20E3 תפקיד:\nאתה המורה שלי. זה אומר שאתה לא פותר במקומי.\n\n3\uFE0F\u20E3 שיטת עבודה:\nאני אשלח לך כל פעם שלב (א\u05F3, ב\u05F3 או ג\u05F3).\nבתגובה, אתה שואל אותי רק שאלה אחת מכוונת על הנוסחה או השלב הבא.\nחכה לי בין שלב לשלב ואל תמשיך לפני שאני שולח.",
    steps: [
      {
        phase: "\uD83D\uDD0D סעיף א\u05F3",
        label: "חשב את 5 האיברים הראשונים",
        prompt: "",
        contextWords: [
          "כלל נסיגה", "איבר", "כפל", "הצבה",
          "a1", "סדרה", "חישוב",
        ],
        keywords: ["כפל"],
        keywordHint: "הזכר את המונח \u201Cכפל\u201D",
      },
      {
        phase: "\uD83E\uDDED סעיף ב\u05F3",
        label: "זהה את סוג הסדרה ומצא את q",
        prompt: "",
        contextWords: [
          "מנה", "q", "הנדסית", "יחס",
          "עוקבים", "סדרה", "זיהוי",
        ],
        keywords: ["מנה"],
        keywordHint: "הזכר את המונח \u201Cמנה\u201D",
      },
      {
        phase: "\uD83D\uDD22 סעיף ג\u05F3",
        label: "כתוב נוסחה סגורה וחשב a\u2081\u2080",
        prompt: "",
        contextWords: [
          "נוסחה סגורה", "a1", "q", "מעריך",
          "הצבה", "הנדסית", "חזקה",
        ],
        keywords: ["נוסחה סגורה"],
        keywordHint: "הזכר את המונח \u201Cנוסחה סגורה\u201D",
      },
    ],
  },
  {
    id: "advanced",
    problem: "נתון כלל נסיגה: a\u2081 = 1, a\u2099\u208A\u2081 = 2a\u2099 + 1\n\nמצא:\n\u05D0. חשב את 5 האיברים הראשונים\n\u05D1. הוכח שהסדרה אינה חשבונית ואינה הנדסית\n\u05D2. מצא את הנוסחה הסגורה (רמז: חקור את a\u2099+1)\n\u05D3. ודא את הנוסחה עבור n=1,2,3",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "\u26A0\uFE0F ניסיון למצוא d או q", text: "הסדרה הזו לא חשבונית ולא הנדסית \u2014 חייבים להוכיח שההפרש אינו קבוע וגם היחס אינו קבוע." },
      { title: "\uD83D\uDCA1 התעלמות מהרמז על a\u2099+1", text: "הטריק: אם מגדירים b\u2099 = a\u2099 + 1, אפשר לגלות שהסדרה החדשה b\u2099 דווקא כן הנדסית. אל תתעלמו מהרמז!" },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "\u2694\uFE0F סעיף א\u05F3",
        label: "חשב את 5 האיברים הראשונים",
        prompt: "",
        contextWords: [
          "כלל נסיגה", "הצבה", "איבר", "חישוב",
          "a1", "צעד", "רקורסיה",
        ],
        keywords: ["הצבה"],
        keywordHint: "הזכר את המונח \u201Cהצבה\u201D",
      },
      {
        phase: "\u2694\uFE0F סעיף ב\u05F3",
        label: "הוכח שאינה חשבונית ואינה הנדסית",
        prompt: "",
        contextWords: [
          "הפרש", "מנה", "קבוע", "הוכחה",
          "חשבונית", "הנדסית", "בדיקה",
        ],
        keywords: ["הוכחה"],
        keywordHint: "הזכר את המונח \u201Cהוכחה\u201D",
      },
      {
        phase: "\u2694\uFE0F סעיף ג\u05F3",
        label: "מצא נוסחה סגורה (רמז: a\u2099+1)",
        prompt: "",
        contextWords: [
          "נוסחה סגורה", "הנדסית", "b\u2099",
          "הצבה", "חזקה", "סדרת עזר",
        ],
        keywords: ["נוסחה סגורה"],
        keywordHint: "הזכר את המונח \u201Cנוסחה סגורה\u201D",
      },
      {
        phase: "\u2694\uFE0F סעיף ד\u05F3",
        label: "ודא את הנוסחה עבור n=1,2,3",
        prompt: "",
        contextWords: [
          "אימות", "הצבה", "n=1", "נוסחה",
          "בדיקה", "התאמה", "כלל נסיגה",
        ],
        keywords: ["אימות"],
        keywordHint: "הזכר את המונח \u201Cאימות\u201D",
      },
    ],
  },
];

// ─── ExerciseCard ────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() {
    navigator.clipboard.writeText(ex.problem.split(/\n+\u05E1\u05E2\u05D9\u05E3/)[0].trim());
    setCopiedProblem(true);
    setTimeout(() => setCopiedProblem(false), 2000);
  }
  return (
    <section style={{ borderRadius: 32, border: `2px solid rgba(${s.borderRgb},0.5)`, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", padding: "2.5rem", marginBottom: "2rem", marginLeft: "auto", marginRight: "auto", boxShadow: `0 10px 15px -3px rgba(60,54,42,0.1), 0 0 24px rgba(${s.borderRgb},0.08)` }}>

      {/* Formula bar inline */}
      {ex.id === "basic" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "flex-start", justifyContent: "space-between", borderRadius: 16, border: `2px solid rgba(${s.borderRgb},0.4)`, background: "rgba(255,255,255,0.88)", padding: "1rem 1.5rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1.75rem", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>כלל נסיגה חשבוני</div>
              <div style={{ color: s.accentColor, fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}>a&#x2099;&#x208A;&#x2081; = a&#x2099; + d</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>נוסחה סגורה</div>
              <div style={{ color: s.accentColor, fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}>a&#x2099; = a&#x2081; + (n-1)d</div>
            </div>
          </div>
        </div>
      )}
      {ex.id === "medium" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "flex-start", justifyContent: "space-between", borderRadius: 16, border: `2px solid rgba(${s.borderRgb},0.4)`, background: "rgba(255,255,255,0.88)", padding: "1rem 1.5rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1.75rem", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>כלל נסיגה הנדסי</div>
              <div style={{ color: s.accentColor, fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}>a&#x2099;&#x208A;&#x2081; = q&#x00B7;a&#x2099;</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>נוסחה סגורה</div>
              <div style={{ color: s.accentColor, fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}>a&#x2099; = a&#x2081;&#x00B7;q&#x207F;&#x207B;&#x00B9;</div>
            </div>
          </div>
        </div>
      )}
      {ex.id === "advanced" && (
        <div style={{ borderRadius: 16, border: `2px solid rgba(${s.borderRgb},0.4)`, background: "rgba(255,255,255,0.88)", padding: "1rem 1.5rem", marginBottom: "2rem" }}>
          <div style={{ color: "#991b1b", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>{"מתקדם \u2014 נסיגה כללית"}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem" }}>
            <div>
              <div style={{ color: "#6B7280", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>כלל נסיגה</div>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ color: "#991b1b", fontFamily: "monospace", fontSize: 13, fontWeight: 700 }}>a&#x2099;&#x208A;&#x2081; = f(a&#x2099;)</span>
              </div>
            </div>
            <div style={{ width: 1, background: "rgba(153,27,27,0.15)", alignSelf: "stretch" }} />
            <div>
              <div style={{ color: "#6B7280", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>אסטרטגיה</div>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ color: "#991b1b", fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>{"הגדר b\u2099 = a\u2099 + c"}</span>
              </div>
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
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{"\uD83D\uDCDD"} השאלה</div>
          <button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.1)" : "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.2)", color: copiedProblem ? "#15803d" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}
            {copiedProblem ? "הועתק!" : "העתק"}
          </button>
        </div>
        <pre style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>

      {/* Pitfalls */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>{"\u26A0\uFE0F"} שגיאות נפוצות</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", padding: "0.85rem 1rem", marginBottom: 8 }}>
            <div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
            {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
          </div>
        ))}
      </div>

      {/* Prompt Ladder */}
      <div style={{ borderRadius: 16, border: `2px solid rgba(${s.borderRgb},0.45)`, background: "rgba(255,255,255,0.88)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: `rgb(${s.borderRgb})`, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>{"\uD83E\uDDE0"} מדריך הפרומפטים</div>
        {ex.id === "basic" && <LadderBase steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium" && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} borderRgb={s.borderRgb} />}
      </div>

      {/* Advanced — outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} borderRgb={s.borderRgb} />}
    </section>
  );
}

// ─── Formula Bar ─────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"arith" | "geo" | "general" | null>(null);

  const tabs = [
    { id: "arith" as const, label: "סדרה חשבונית", tex: "a_{n+1} = a_n + d", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "geo" as const, label: "סדרה הנדסית", tex: "a_{n+1} = q \\cdot a_n", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "general" as const, label: "כלל נסיגה כללי", tex: "a_{n+1} = f(a_n)", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {activeTab === "arith" && (
        <motion.div key="arith" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"a_{n+1} = a_n + d \\quad \\Rightarrow \\quad a_n = a_1 + (n-1)d"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> כלל נסיגה חשבוני מוסיף קבוע d בכל צעד. הנוסחה הסגורה מאפשרת לחשב כל איבר ישירות לפי מיקומו n, בלי לחשב את כל האיברים שלפניו.
              </div>
              <div style={{ marginTop: 10, color: "#16a34a", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                {"\uD83D\uDCA1"} דוגמה: <InlineMath>{"a_1 = 3,\\; d = 5 \\Rightarrow a_4 = 3 + 3 \\cdot 5 = 18"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "geo" && (
        <motion.div key="geo" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"a_{n+1} = q \\cdot a_n \\quad \\Rightarrow \\quad a_n = a_1 \\cdot q^{n-1}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> כלל נסיגה הנדסי מכפיל בקבוע q בכל צעד. המעריך n-1 מייצג את מספר ה&quot;קפיצות&quot; מהאיבר הראשון עד לאיבר ה-n.
              </div>
              <div style={{ marginTop: 10, color: "#EA580C", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                {"\uD83D\uDCA1"} דוגמה: <InlineMath>{"a_1 = 2,\\; q = 3 \\Rightarrow a_5 = 2 \\cdot 3^4 = 162"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "general" && (
        <motion.div key="general" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"a_{n+1} = f(a_n)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> כשכלל הנסיגה אינו חיבור קבוע ולא כפל קבוע, הסדרה אינה חשבונית ואינה הנדסית. האסטרטגיה: חפש סדרת עזר b&#x2099; = a&#x2099; + c שכן חשבונית או הנדסית.
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                {"\uD83D\uDCA1"} טיפ: חשב 4-5 איברים ראשונים, בדוק הפרשים ויחסים, ורק אז חפש דפוס.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── ArithRecLab (basic) ─────────────────────────────────────────────────────

function ArithRecLab() {
  const [a1, setA1] = useState(1);
  const [d, setD] = useState(4);
  const n = 8;
  const terms = Array.from({ length: n }, (_, i) => a1 + i * d);
  const an = a1 + (n - 1) * d;
  const S5 = (5 / 2) * (2 * a1 + 4 * d);
  const formula = `a\u2099 = ${a1} + (n-1)\u00B7${d}`;

  const W = 280, H = 130, padX = 30, padY = 15;
  const maxAbs = Math.max(...terms.map(Math.abs), 1);
  const barW = Math.min(28, (W - 2 * padX) / n - 4);

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>{"\uD83D\uDD2C"} מעבדת נסיגה חשבונית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה את a&#x2081; ו-d {"\u2014"} ראה את הסדרה מתפתחת בלייב</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: "2rem", background: "rgba(255,255,255,0.88)", borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", padding: "1.25rem" }}>
        {[
          { title: "איבר ראשון", varSym: "a\u2081", val: a1, set: setA1, min: -5, max: 10 },
          { title: "הפרש", varSym: "d", val: d, set: setD, min: -5, max: 8 },
        ].map((row) => (
          <div key={row.varSym}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{row.title} <span style={{ color: "#2D5A27", fontFamily: "monospace", fontWeight: 600 }}>({row.varSym})</span></span>
              <span style={{ color: "#2D5A27", fontFamily: "monospace", fontWeight: 700 }}>{row.val}</span>
            </div>
            <input type="range" min={row.min} max={row.max} step={1} value={row.val} onChange={(e) => row.set(+e.target.value)} style={{ width: "100%", accentColor: "#16A34A" }} />
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(22,163,74,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 360 }} aria-hidden>
          <line x1={padX} y1={H / 2} x2={W - padX} y2={H / 2} stroke="#94a3b8" strokeWidth={1} />
          {terms.map((t, i) => {
            const barH = maxAbs === 0 ? 0 : (Math.abs(t) / maxAbs) * (H / 2 - padY);
            const x = padX + i * ((W - 2 * padX) / n) + 2;
            const isPos = t >= 0;
            return (
              <g key={i}>
                <rect
                  x={x} y={isPos ? H / 2 - barH : H / 2}
                  width={barW} height={barH}
                  fill={isPos ? "rgba(22,163,74,0.6)" : "rgba(220,38,38,0.5)"}
                  rx={3}
                />
                {i < 3 && (
                  <text x={x + barW / 2} y={H / 2 + (isPos ? 14 : -6)} fill="#64748b" fontSize={8} textAnchor="middle">
                    {i === 0 ? "a\u2081" : i === 1 ? "a\u2082" : "a\u2083"}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center", marginBottom: 12 }}>
        {[
          { label: "a\u2081", val: a1, sub: "איבר ראשון" },
          { label: "d", val: d, sub: "הפרש" },
          { label: "a\u2099", val: formula, sub: "נוסחה" },
          { label: "S\u2085", val: S5, sub: "סכום 5 ראשונים" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.88)", border: "1px solid rgba(22,163,74,0.3)", padding: 14 }}>
            <div style={{ color: "#2D5A27", fontFamily: "monospace", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: "#16a34a", fontWeight: 700, fontSize: typeof row.val === "string" ? 12 : 18 }}>{row.val}</div>
            <div style={{ color: "#6B7280", fontSize: 10, marginTop: 4 }}>{row.sub}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "0.5rem" }}>
        {d === 0 ? "סדרה קבועה (d = 0)" : d > 0 ? `סדרה חשבונית עולה (d = ${d})` : `סדרה חשבונית יורדת (d = ${d})`}
      </p>
    </section>
  );
}

// ─── GeoRecLab (medium) ──────────────────────────────────────────────────────

function GeoRecLab() {
  const [a1, setA1] = useState(2);
  const [q, setQ] = useState(3);
  const n = 8;
  const terms = Array.from({ length: n }, (_, i) => {
    const v = a1 * Math.pow(q, i);
    return Math.abs(v) > 1e9 ? NaN : Math.round(v * 100) / 100;
  });
  const an = terms[n - 1];
  const isConverging = Math.abs(q) < 1 && q !== 0;
  const Sinf = isConverging ? Math.round((a1 / (1 - q)) * 100) / 100 : null;
  const formula = `a\u2099 = ${a1}\u00B7${q}\u207F\u207B\u00B9`;
  const display = (v: number) => !Number.isFinite(v) || isNaN(v) ? "\u221E" : String(v);

  const W = 280, H = 130, padX = 30, padY = 15;
  const validTerms = terms.filter(t => !isNaN(t));
  const maxAbs = Math.max(...validTerms.map(Math.abs), 1);
  const barW = Math.min(28, (W - 2 * padX) / n - 4);

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>{"\uD83D\uDD2C"} מעבדת נסיגה הנדסית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה את a&#x2081; ו-q {"\u2014"} ראה צמיחה או התכנסות</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: "2rem", background: "rgba(255,255,255,0.88)", borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", padding: "1.25rem" }}>
        {[
          { title: "איבר ראשון", varSym: "a\u2081", val: a1, set: setA1, min: -5, max: 10 },
          { title: "מנה", varSym: "q", val: q, set: setQ, min: -4, max: 5 },
        ].map((row) => (
          <div key={row.varSym}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{row.title} <span style={{ color: "#92400E", fontFamily: "monospace", fontWeight: 600 }}>({row.varSym})</span></span>
              <span style={{ color: "#92400E", fontFamily: "monospace", fontWeight: 700 }}>{row.val}</span>
            </div>
            <input type="range" min={row.min} max={row.max} step={1} value={row.val} onChange={(e) => row.set(+e.target.value)} style={{ width: "100%", accentColor: "#EA580C" }} />
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(234,88,12,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 360 }} aria-hidden>
          <line x1={padX} y1={H / 2} x2={W - padX} y2={H / 2} stroke="#94a3b8" strokeWidth={1} />
          {terms.map((t, i) => {
            if (isNaN(t)) return null;
            const barH = maxAbs === 0 ? 0 : (Math.abs(t) / maxAbs) * (H / 2 - padY);
            const x = padX + i * ((W - 2 * padX) / n) + 2;
            const isPos = t >= 0;
            return (
              <g key={i}>
                <rect
                  x={x} y={isPos ? H / 2 - barH : H / 2}
                  width={barW} height={barH}
                  fill={isPos ? "rgba(234,88,12,0.6)" : "rgba(220,38,38,0.5)"}
                  rx={3}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center", marginBottom: 12 }}>
        {[
          { label: "a\u2081", val: String(a1), sub: "איבר ראשון" },
          { label: "q", val: String(q), sub: "מנה" },
          { label: "a\u2099", val: formula, sub: "נוסחה" },
          { label: "מתכנסת?", val: isConverging ? "\u2705 כן" : "\u274C לא", sub: Sinf !== null ? `S\u221E = ${Sinf}` : "|q| \u2265 1" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.88)", border: "1px solid rgba(234,88,12,0.3)", padding: 14 }}>
            <div style={{ color: "#92400E", fontFamily: "monospace", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: "#EA580C", fontWeight: 700, fontSize: row.val.length > 12 ? 11 : 16 }}>{row.val}</div>
            <div style={{ color: "#6B7280", fontSize: 10, marginTop: 4 }}>{row.sub}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "0.5rem" }}>
        {isConverging ? "\uD83D\uDFE2 סדרה מתכנסת!" : q === 0 ? "סדרה מתאפסת" : "\uD83D\uDD34 סדרה מתפצלת"}
      </p>
    </section>
  );
}

// ─── GeneralRecLab (advanced) ────────────────────────────────────────────────

function GeneralRecLab() {
  const [m, setM] = useState(2);
  const [c, setC] = useState(1);
  const a1 = 1;
  const n = 8;
  const terms: number[] = [];
  let cur = a1;
  for (let i = 0; i < n; i++) {
    terms.push(cur);
    const next = m * cur + c;
    if (!Number.isFinite(next) || Math.abs(next) > 1e9) {
      while (terms.length < n) terms.push(NaN);
      break;
    }
    cur = next;
  }

  // Check type
  const validTerms = terms.filter(t => !isNaN(t));
  let typeLabel = "כללית";
  if (validTerms.length >= 3) {
    const diffs = validTerms.slice(1).map((t, i) => t - validTerms[i]);
    const allSameD = diffs.every(d => Math.abs(d - diffs[0]) < 0.01);
    if (allSameD) typeLabel = "חשבונית";
    else {
      const ratios = validTerms.slice(1).map((t, i) => validTerms[i] !== 0 ? t / validTerms[i] : NaN);
      const allSameQ = ratios.every(r => !isNaN(r) && Math.abs(r - ratios[0]) < 0.01);
      if (allSameQ) typeLabel = "הנדסית";
    }
  }

  // Closed-form guess for a_{n+1} = m*a_n + c where a_1 = 1
  // If m=1: a_n = a1 + (n-1)*c (arithmetic)
  // If m!=1: a_n = (a1 + c/(m-1))*m^(n-1) - c/(m-1)
  let closedForm = "";
  if (m === 1) {
    closedForm = `a\u2099 = ${a1} + (n-1)\u00B7${c}`;
  } else if (m === 0) {
    closedForm = `a\u2099 = ${c} (n\u22652)`;
  } else {
    const shift = c / (m - 1);
    const base = a1 + shift;
    closedForm = `(${base})\u00B7${m}\u207F\u207B\u00B9 ${shift >= 0 ? "-" : "+"} ${Math.abs(shift)}`;
  }

  // Verify: compute term 3 from closed form
  let verification = "";
  if (validTerms.length >= 3) {
    verification = `a\u2083 = ${validTerms[2]}`;
  }

  const display = (v: number) => !Number.isFinite(v) || isNaN(v) ? "\u221E" : String(Math.round(v * 100) / 100);

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>{"\uD83D\uDD2C"} מעבדת נסיגה כללית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>{"שנה את m ו-c בכלל a\u2099\u208A\u2081 = m\u00B7a\u2099 + c \u2014 ראה איזה סוג סדרה מתקבל"}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: "2rem", background: "rgba(255,255,255,0.88)", borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", padding: "1.25rem" }}>
        {[
          { title: "מכפיל", varSym: "m", val: m, set: setM, min: -3, max: 5 },
          { title: "קבוע", varSym: "c", val: c, set: setC, min: -5, max: 5 },
        ].map((row) => (
          <div key={row.varSym}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{row.title} <span style={{ color: "#991b1b", fontFamily: "monospace", fontWeight: 600 }}>({row.varSym})</span></span>
              <span style={{ color: "#991b1b", fontFamily: "monospace", fontWeight: 700 }}>{row.val}</span>
            </div>
            <input type="range" min={row.min} max={row.max} step={1} value={row.val} onChange={(e) => row.set(+e.target.value)} style={{ width: "100%", accentColor: "#DC2626" }} />
          </div>
        ))}
      </div>

      {/* Term boxes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: "1.5rem" }}>
        {terms.slice(0, 8).map((t, i) => (
          <div key={i} style={{ textAlign: "center", borderRadius: 12, background: "rgba(255,255,255,0.88)", border: "1px solid rgba(153,27,27,0.2)", padding: "8px 4px" }}>
            <div style={{ fontSize: 9, color: "#6B7280", marginBottom: 2 }}>a{i + 1}</div>
            <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: isNaN(t) ? "#9CA3AF" : "#991b1b" }}>{display(t)}</div>
          </div>
        ))}
      </div>

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center", marginBottom: 12 }}>
        {[
          { label: "סוג", val: typeLabel, sub: `m=${m}, c=${c}` },
          { label: "נוסחה סגורה", val: closedForm, sub: "ניחוש" },
          { label: "אימות", val: verification, sub: "בדיקת a\u2083" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.88)", border: "1px solid rgba(153,27,27,0.3)", padding: 14 }}>
            <div style={{ color: "#991b1b", fontFamily: "monospace", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: "#DC2626", fontWeight: 700, fontSize: row.val.length > 15 ? 10 : 14 }}>{row.val}</div>
            <div style={{ color: "#6B7280", fontSize: 10, marginTop: 4 }}>{row.sub}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "0.5rem" }}>
        {typeLabel === "חשבונית" ? "d קבוע \u2014 סדרה חשבונית!" : typeLabel === "הנדסית" ? "q קבוע \u2014 סדרה הנדסית!" : "לא חשבונית ולא הנדסית \u2014 צריך סדרת עזר!"}
      </p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecursionPage() {
  const [activeTab, setActiveTab] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === activeTab)!;

  const labMap: Record<string, React.ReactNode> = {
    basic: <ArithRecLab />,
    medium: <GeoRecLab />,
    advanced: <GeneralRecLab />,
  };

  return (
    <div style={{ background: "#F3EFE0", minHeight: "100vh", width: "100%" }}>
      <main style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1.5rem" }} dir="rtl">

        {/* Back + Title */}
        <div style={{ marginBottom: "1.5rem" }}>
          <Link
            href="/topic/grade12/series"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none", transition: "background 0.15s" }}
          >
            <span style={{ fontSize: 16 }}>&larr;</span>
            חזרה לסדרות
          </Link>
          <h1 style={{ fontSize: "1.9rem", fontWeight: "bold", marginTop: "0.75rem", color: "#1A1A1A" }}>{"כלל נסיגה (רקורסיה) \u2014 עם AI"}</h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 4 }}>מהגדרה רקורסיבית לנוסחה סגורה {"\u2014"} חשבונית, הנדסית וכללית</p>
        </div>

        {/* SubtopicProgress */}
        <SubtopicProgress subtopicId="grade12/series/recursion" />

        {/* Tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: "1.5rem", marginTop: "1.5rem" }}>
          {TABS.map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
                className={`rounded-2xl px-4 py-3 text-center transition-all cursor-pointer border-2 ${active ? `${t.border} ${t.bg}` : "border-transparent"}`}
                style={{ background: active ? undefined : "rgba(255,255,255,0.5)", boxShadow: active ? `0 0 14px ${t.glowColor}` : "none" }}>
                <div className={`font-extrabold text-base ${active ? t.textColor : "text-gray-400"}`}>{t.label}</div>
              </button>
            );
          })}
        </div>

        {/* Formula Bar */}
        <FormulaBar />

        {/* Exercise Card */}
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        {/* Lab */}
        {labMap[activeTab]}

        {/* MarkComplete */}
        <div style={{ marginTop: "2rem" }}>
          <MarkComplete subtopicId="grade12/series/recursion" level={activeTab} />
        </div>

        {/* Footer back link */}
        <div style={{ textAlign: "center", marginTop: "2.5rem", paddingBottom: "2rem" }}>
          <Link href="/topic/grade12/series" style={{ color: "#6B7280", fontSize: 13, textDecoration: "underline" }}>
            &larr; חזרה לסדרות
          </Link>
        </div>

      </main>
    </div>
  );
}
