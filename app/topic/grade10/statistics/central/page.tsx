"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import SubtopicProgress from "@/app/components/SubtopicProgress";
import katex from "katex";
import "katex/dist/katex.min.css";

// ─── KaTeX renderers ─────────────────────────────────────────────────────────

function Tex({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) katex.render(children, ref.current, { throwOnError: false, displayMode: false }); }, [children]);
  return <span ref={ref} dir="ltr" style={{ unicodeBidi: "embed" }} />;
}

function TexBlock({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) katex.render(children, ref.current, { throwOnError: false, displayMode: true }); }, [children]);
  return <span ref={ref} dir="ltr" style={{ display: "block", textAlign: "center", unicodeBidi: "embed" }} />;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PromptStep = {
  phase: string;
  label: string;
  coaching: string;
  prompt: string;
  keywords: string[];
  keywordHint: string;
  contextWords?: string[];
  stationWords?: string[];
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

// ─── Station config ───────────────────────────────────────────────────────────

const STATION = {
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",  ladderBorder: "#16A34A", glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderHex: "#2D5A27", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700", ladderBorder: "#EA580C", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderHex: "#A34F26", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",    ladderBorder: "#DC2626", glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderHex: "#8B2635", borderRgb: "139,38,53" },
} as const;

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-700",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium",   label: "בינוני", textColor: "text-orange-700",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-700",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

// ─── Prompt Coach Atoms ───────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 12, fontSize: 13, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(60,54,42,0.25)", color: "#1A1A1A", fontWeight: 500, cursor: "pointer", width: "100%" }}
    >
      {c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}
    </button>
  );
}

function GoldenPromptCard({ prompt, title = "פרומפט ראשי", glowRgb = "16,185,129", borderRgb = "45,90,39" }: { prompt: string; title?: string; glowRgb?: string; borderRgb?: string }) {
  return (
    <div className="golden-prompt-card" style={{ borderRadius: 14, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 14, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)`, width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span>✨</span>
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
      </div>
      <p style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.7, margin: "0 0 14px 0", whiteSpace: "pre-line", fontWeight: 500, wordBreak: "break-word", overflowWrap: "break-word" }}>{prompt}</p>
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
      <div style={{ background: "rgba(255,255,255,0.4)", padding: "10px", display: "flex", flexDirection: "column", gap: 10, width: "100%", boxSizing: "border-box" }}>
        <div style={{ width: "100%" }}>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>הפרומפט המוכן ✍️</div>
          <div style={{ borderRadius: 10, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.35)`, padding: "10px", fontSize: 12, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word", overflowWrap: "break-word", width: "100%", boxSizing: "border-box" }}>{step.prompt}</div>
        </div>
        <CopyBtn text={step.prompt} label="העתק פרומפט ממוקד" />
      </div>
    </div>
  );
}

function TutorStepMedium({ step, locked = false, onPass, borderRgb = "45,90,39", problemText = "" }: { step: PromptStep; locked?: boolean; onPass?: () => void; borderRgb?: string; problemText?: string }) {
  const [text, setText]     = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);

  const passed = !!(result && !result.blocked && result.score >= 75);

  function checkCopy(input: string): { isCopy: boolean } {
    const WHITELIST = new Set([
      "תסביר", "איך", "כיצד", "שלבים", "עזור", "תעזור", "תכווין", "הסבר",
      "תדריך", "תנחה", "למה", "מדוע", "מתי", "האם", "בבקשה", "תראה",
      "תלמד", "אותי", "נמצא", "נחשב", "נמצא", "שלי", "רוצה", "צריך",
    ]);
    const inputWords = input.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (inputWords.length < 5) return { isCopy: false };
    const sources = [problemText, step.prompt, step.label].filter(Boolean).join(" ");
    const sourceWords = sources.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (sourceWords.length === 0) return { isCopy: false };
    const sourceSet = new Set(sourceWords);
    const significantInputWords = inputWords.filter(w => !WHITELIST.has(w));
    if (significantInputWords.length < 3) return { isCopy: false };
    let consecutiveMatches = 0, maxConsecutive = 0, matchCount = 0;
    for (const w of significantInputWords) {
      if (sourceSet.has(w)) { matchCount++; consecutiveMatches++; maxConsecutive = Math.max(maxConsecutive, consecutiveMatches); } else { consecutiveMatches = 0; }
    }
    const startsWithRequest = WHITELIST.has(inputWords[0]) || WHITELIST.has(inputWords[1] ?? "");
    const ratio = matchCount / significantInputWords.length;
    const effectiveRatio = startsWithRequest ? ratio * 0.6 : ratio;
    return { isCopy: effectiveRatio > 0.7 || maxConsecutive >= 5 };
  }

  const validate = () => {
    if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי — כתוב לפחות 20 תווים." }); return; }
    const copyCheck = checkCopy(text);
    if (copyCheck.isCopy) { setResult({ score: 0, blocked: true, hint: "נראה שהעתקת את לשון השאלה. נסה לנסח במילים שלך מה בדיוק לא הבנת." }); return; }
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

  const scoreBarColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(245,158,11,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8, boxShadow: passed ? "0 0 16px rgba(245,158,11,0.25)" : "none", transition: "border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(245,158,11,0.3)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: "10px", display: "flex", flexDirection: "column", gap: 10, width: "100%", boxSizing: "border-box" }}>
        <textarea
          value={text} rows={3} dir="rtl" disabled={passed}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 10, background: "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(245,158,11,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 10, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
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

  const ROSE = { border: "rgba(244,63,94,0.35)", dim: "rgba(244,63,94,0.2)", text: "#fda4af" };

  if (locked) return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.3)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <span>🔒</span><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} — {step.label}</span>
    </div>
  );

  const validate = () => {
    if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי — כתוב לפחות 20 תווים." }); return; }
    const r = calculatePromptScore(text, step.contextWords ?? []);
    setResult(r);
    if (!r.blocked && r.score >= 90 && onPass) onPass();
  };

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(52,211,153,0.35)" : ROSE.border}`, marginBottom: 8, transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(52,211,153,0.2)" : "rgba(244,63,94,0.2)"}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: ROSE.text, fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl" readOnly={passed}
          onChange={(e) => { if (!passed) { setText(e.target.value); setResult(null); } }}
          placeholder="כתוב את הפרומפט שלך לסעיף זה..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(6,78,59,0.1)" : "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(52,211,153,0.25)" : "rgba(139,38,53,0.25)"}`, color: passed ? "#6ee7b7" : "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />
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

function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb, problemText = "" }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string; problemText?: string }) {
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
          problemText={problemText}
        />
      ))}
    </div>
  );
}

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
        subjectWords={["ממוצע", "חציון", "שכיח", "מדדי מרכז", "סטטיסטיקה", "התפלגות", "נתונים", "ציון", "סכום", "כמות"]}
        subjectHint="ממוצע / חציון / שכיח / מדדי מרכז / התפלגות / נתונים"
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

// ─── SVG Diagrams ─────────────────────────────────────────────────────────────

function BasicDiagram() {
  // Bar chart silhouette — 10 bars, no values shown
  const bars = [72, 85, 91, 68, 85, 77, 95, 85, 60, 82];
  const maxVal = 100;
  const barW = 28, gap = 6, padL = 40, padB = 30, padT = 20;
  const chartW = padL + bars.length * (barW + gap);
  const chartH = 200;

  return (
    <svg viewBox={`0 0 ${chartW + 20} ${chartH + padB + padT}`} className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Y-axis */}
      <line x1={padL} y1={padT} x2={padL} y2={chartH + padT} stroke="#94a3b8" strokeWidth={1.2} />
      {/* X-axis */}
      <line x1={padL} y1={chartH + padT} x2={chartW + 10} y2={chartH + padT} stroke="#94a3b8" strokeWidth={1.2} />
      {/* Bars */}
      {bars.map((v, i) => {
        const h = (v / maxVal) * chartH;
        const x = padL + i * (barW + gap) + gap;
        const y = padT + chartH - h;
        const hue = 200 + (v / maxVal) * 60;
        return <rect key={i} x={x} y={y} width={barW} height={h} rx={4} fill={`hsl(${hue}, 55%, 55%)`} opacity={0.8} />;
      })}
      {/* Question marks */}
      <text x={chartW / 2 + 20} y={padT + 30} fontSize={18} fill="#f59e0b" fontWeight={700} textAnchor="middle">?</text>
    </svg>
  );
}

function MediumDiagram() {
  // 4 dots on a number line + a gap for the 5th
  const scores = [78, 92, 85, 71];
  const padL = 30, padR = 30, lineY = 80, w = 340;

  return (
    <svg viewBox={`0 0 ${w} 140`} className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Number line */}
      <line x1={padL} y1={lineY} x2={w - padR} y2={lineY} stroke="#94a3b8" strokeWidth={1.5} />
      <polygon points={`${w - padR},${lineY} ${w - padR - 6},${lineY - 4} ${w - padR - 6},${lineY + 4}`} fill="#94a3b8" />
      {/* Score dots */}
      {scores.map((s, i) => {
        const x = padL + ((s - 60) / 50) * (w - padL - padR);
        return (
          <g key={i}>
            <circle cx={x} cy={lineY} r={6} fill="#EA580C" stroke="#fff" strokeWidth={1.5} />
          </g>
        );
      })}
      {/* 5th score — question mark */}
      <circle cx={w / 2} cy={lineY - 30} r={12} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4,3" />
      <text x={w / 2} y={lineY - 25} fontSize={14} fill="#f59e0b" fontWeight={700} textAnchor="middle">?</text>
      {/* Target line */}
      <line x1={w / 2 + 40} y1={lineY - 15} x2={w / 2 + 40} y2={lineY + 15} stroke="#a78bfa" strokeWidth={2} strokeDasharray="4,3" />
      <text x={w / 2 + 40} y={lineY + 28} fontSize={9} fill="#a78bfa" fontWeight={600} textAnchor="middle">יעד</text>
    </svg>
  );
}

function AdvancedDiagram() {
  // Two side-by-side distribution silhouettes
  const w = 380, h = 160, mid = w / 2;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Class A — right-skewed bars */}
      <text x={mid / 2} y={16} fontSize={11} fill="#16A34A" fontWeight={700} textAnchor="middle">{"כיתה א'"}</text>
      {[20, 35, 55, 75, 90].map((barH, i) => (
        <rect key={`a${i}`} x={20 + i * 32} y={h - 20 - barH} width={26} height={barH} rx={3} fill="#16A34A" opacity={0.5} />
      ))}
      <line x1={20} y1={h - 20} x2={mid - 10} y2={h - 20} stroke="#94a3b8" strokeWidth={1} />

      {/* Class B — left-skewed bars */}
      <text x={mid + mid / 2} y={16} fontSize={11} fill="#3b82f6" fontWeight={700} textAnchor="middle">{"כיתה ב'"}</text>
      {[90, 75, 55, 35, 20].map((barH, i) => (
        <rect key={`b${i}`} x={mid + 20 + i * 32} y={h - 20 - barH} width={26} height={barH} rx={3} fill="#3b82f6" opacity={0.5} />
      ))}
      <line x1={mid + 20} y1={h - 20} x2={w - 10} y2={h - 20} stroke="#94a3b8" strokeWidth={1} />

      {/* Question marks */}
      <text x={mid / 2} y={h / 2} fontSize={20} fill="#f59e0b" fontWeight={700} textAnchor="middle">?</text>
      <text x={mid + mid / 2} y={h / 2} fontSize={20} fill="#f59e0b" fontWeight={700} textAnchor="middle">?</text>
    </svg>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "ציוני הכיתה",
    problem: "בכיתה של 10 תלמידים, הציונים במבחן מתמטיקה הם:\n72, 85, 91, 68, 85, 77, 95, 85, 60, 82\n\nא. חשב את ממוצע הציונים.\nב. מצא את החציון.\nג. מהו השכיח? הסבר מדוע.",
    diagram: <BasicDiagram />,
    pitfalls: [
      { title: "⚠️ סדרו את הנתונים לפני מציאת חציון!", text: "טעות קלאסית: לקחת את הערך האמצעי מהרשימה המקורית. חובה לסדר מהקטן לגדול!" },
      { title: "🔦 חציון בזוגי = ממוצע שני האמצעיים", text: "" },
    ],
    goldenPrompt: `\nהיי, אני תלמיד כיתה י׳, צירפתי לך שאלה בסטטיסטיקה על מדדי מרכז (ממוצע, חציון, שכיח).\nהנה הפרוטוקול שלנו, תעבוד לפיו ב-100%:\n1️⃣ סריקה:\nתסרוק את הנתונים ותכתוב לי רק:\n"זיהיתי את הנתונים. מחכה להוראות לשלב א'."\n(אל תפתור כלום ואל תסביר כלום בשלב הזה!)\n2️⃣ תפקיד:\nאתה המורה שלי. אל תפתור במקומי. במהלך פתירת סעיף, תשאל אותי שאלות מנחות.\n3️⃣ שיטת עבודה:\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "חישוב ממוצע", coaching: "", prompt: "תעזור לי להבין איך מחשבים ממוצע של קבוצת ציונים.", keywords: [], keywordHint: "", contextWords: ["ממוצע", "סכום", "חלוקה", "כמות", "ציונים", "חיבור", "n", "10"] },
      { phase: "סעיף ב׳", label: "מציאת חציון", coaching: "", prompt: "כיצד מוצאים את החציון של קבוצת נתונים? האם צריך לסדר קודם?", keywords: [], keywordHint: "", contextWords: ["חציון", "סדר", "אמצע", "זוגי", "ממוצע", "סידור", "עולה", "ערך"] },
      { phase: "סעיף ג׳", label: "זיהוי שכיח", coaching: "", prompt: "מהו השכיח ואיך מזהים אותו? למה ערך מסוים הוא השכיח?", keywords: [], keywordHint: "", contextWords: ["שכיח", "תדירות", "הכי", "נפוץ", "פעמים", "חוזר", "ספירה", "ערך"] },
    ],
  },
  {
    id: "medium",
    title: "הציון החסר",
    problem: "תלמיד קיבל את הציונים הבאים ב-4 מבחנים: 78, 92, 85, 71.\nהוא רוצה שממוצע 5 המבחנים יהיה בדיוק 84.\n\nא. מצא את הציון שהתלמיד צריך לקבל במבחן החמישי.\nב. אם הממוצע הרצוי היה 80, מהו הציון הנדרש?\nג. מהו הציון המקסימלי האפשרי שהתלמיד יכול לקבל (100), ומה יהיה הממוצע במקרה זה?",
    diagram: <MediumDiagram />,
    pitfalls: [
      { title: "⚠️ ממוצע = סכום / כמות", text: "כדי למצוא ציון חסר: סכום_רצוי = ממוצע × כמות, ואז ציון_חסר = סכום_רצוי - סכום_קיים" },
    ],
    goldenPrompt: `\nהיי, אני תלמיד כיתה י׳, צירפתי לך תרגיל בסטטיסטיקה על מציאת ציון חסר כאשר נתון הממוצע הרצוי.\nהנה הפרוטוקול שלנו, תעבוד לפיו ב-100%:\n1️⃣ סריקה:\nתסרוק את הנתונים ותכתוב לי רק:\n"זיהיתי את הנתונים. מחכה להוראות לשלב א'."\n(אל תפתור כלום ואל תסביר כלום בשלב הזה!)\n2️⃣ תפקיד:\nאתה המורה שלי. אל תפתור במקומי. תשאל אותי שאלות מנחות.\n3️⃣ שיטת עבודה:\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "מציאת ציון חסר", coaching: "", prompt: "תעזור לי להבין איך מוצאים ציון חסר כשיודעים את הממוצע הרצוי.", keywords: [], keywordHint: "", contextWords: ["ממוצע", "סכום", "כמות", "חסר", "רצוי", "משוואה", "5", "84"] },
      { phase: "סעיף ב׳", label: "שינוי ממוצע יעד", coaching: "", prompt: "אם הממוצע הרצוי משתנה, כיצד זה משפיע על הציון הנדרש?", keywords: [], keywordHint: "", contextWords: ["ממוצע", "שינוי", "יעד", "ציון", "סכום", "חישוב", "80", "נדרש"] },
      { phase: "סעיף ג׳", label: "ממוצע מקסימלי", coaching: "", prompt: "אם הציון המקסימלי הוא 100, מה יהיה הממוצע של כל 5 הציונים?", keywords: [], keywordHint: "", contextWords: ["מקסימום", "100", "ממוצע", "סכום", "חלוקה", "5", "תוצאה", "חישוב"] },
    ],
  },
  {
    id: "advanced",
    title: "השוואת כיתות",
    problem: "בשתי כיתות נערך אותו מבחן:\nכיתה א': ממוצע 75, חציון 78, שכיח 80\nכיתה ב': ממוצע 75, חציון 70, שכיח 65\n\nא. בשתי הכיתות הממוצע זהה. הסבר מדוע התפלגות הציונים שונה בתכלית.\nב. שרטט (תאר) גרף עמודות אפשרי לכל כיתה שמתאים למדדים הנתונים.\nג. בכיתה א' מוסיפים 5 נקודות בונוס לכל תלמיד. מה קורה לממוצע, לחציון ולשכיח?",
    diagram: <AdvancedDiagram />,
    pitfalls: [
      { title: "💡 הוספת קבוע: ממוצע, חציון ושכיח כולם עולים באותו ערך", text: "" },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: מה ההבדל בין ממוצע, חציון ושכיח? כיצד הוספת קבוע משפיעה על מדדי מרכז? מה אפשר ללמוד מהשוואת ההתפלגויות? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "הסבר הבדלי התפלגות", coaching: "", prompt: "תעזור לי להבין למה שתי כיתות עם אותו ממוצע יכולות להיות שונות לגמרי.", keywords: [], keywordHint: "", contextWords: ["ממוצע", "חציון", "שכיח", "התפלגות", "סימטרי", "אסימטרי", "ימין", "שמאל"] },
      { phase: "סעיף ב׳", label: "תיאור גרפי", coaching: "", prompt: "כיצד אתאר גרף עמודות שמתאים למדדי המרכז שנתנו לכל כיתה?", keywords: [], keywordHint: "", contextWords: ["גרף", "עמודות", "פיזור", "שכיח", "שיא", "צורה", "התפלגות", "ציונים"] },
      { phase: "סעיף ג׳", label: "השפעת בונוס", coaching: "", prompt: "כשמוסיפים 5 נקודות לכל תלמיד, מה קורה לכל אחד ממדדי המרכז?", keywords: [], keywordHint: "", contextWords: ["בונוס", "הוספה", "קבוע", "ממוצע", "חציון", "שכיח", "הזזה", "5"] },
    ],
  },
];

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() {
    navigator.clipboard.writeText(ex.problem.split(/\n+[אבגדהוזחט]\./)[0].trim());
    setCopiedProblem(true);
    setTimeout(() => setCopiedProblem(false), 2000);
  }
  return (
    <section className="exercise-section" style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Formula bar — central tendency (KaTeX) */}
      <div className="formula-bar" style={{ borderRadius: 12, border: "1px solid rgba(244,63,94,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 4px 16px rgba(244,63,94,0.12)" }}>
        <div className="formula-title" style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>

        {/* Context: variable definitions */}
        <div style={{ borderRadius: 10, background: "rgba(244,63,94,0.05)", border: "1px solid rgba(244,63,94,0.15)", padding: "10px 14px", marginBottom: 16, textAlign: "center" }}>
          <div className="formula-label" style={{ color: "#2D3436", fontSize: 13, lineHeight: 1.8 }}>
            <Tex>{String.raw`\bar{x}`}</Tex> — ממוצע &nbsp;&nbsp;·&nbsp;&nbsp;
            <Tex>{String.raw`Me`}</Tex> — חציון &nbsp;&nbsp;·&nbsp;&nbsp;
            <Tex>{String.raw`Mo`}</Tex> — שכיח
          </div>
        </div>

        <div className="formula-grid-stats">
          {/* Mean */}
          <div className="formula-item" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
            <div className="formula-label" style={{ color: "#6B7280", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>📊 ממוצע</div>
            <div style={{ color: "#f43f5e" }}><TexBlock>{String.raw`\bar{x} = \frac{\sum x_i}{n}`}</TexBlock></div>
          </div>
          {/* Median */}
          <div className="formula-item" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
            <div className="formula-label" style={{ color: "#6B7280", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>📏 חציון</div>
            <div style={{ color: "#f43f5e" }}><TexBlock>{String.raw`Me = \text{median}(x_1, \ldots, x_n)`}</TexBlock></div>
          </div>
          {/* Mode */}
          <div className="formula-item" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
            <div className="formula-label" style={{ color: "#6B7280", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>🔁 שכיח</div>
            <div style={{ color: "#f43f5e" }}><TexBlock>{String.raw`Mo = \text{mode}(x_1, \ldots, x_n)`}</TexBlock></div>
          </div>
        </div>
      </div>

      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: "2rem" }} />

      {/* Diagram */}
      {ex.diagram && (
        <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>
      )}

      {/* Problem */}
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", marginBottom: "1.25rem" }}>
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
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
        {ex.id === "basic"    && <LadderBase     steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} problemText={ex.problem} />}
        {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
      </div>

    </section>
  );
}

// ─── Lab 1: BarChartLab (Basic) ───────────────────────────────────────────────

function BarChartLab() {
  const [values, setValues] = useState([72, 85, 91, 68, 85, 77, 95, 85, 60, 82]);

  const setVal = (i: number, v: number) => setValues(prev => { const next = [...prev]; next[i] = v; return next; });

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const median = values.length % 2 === 0
    ? (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2
    : sorted[Math.floor(values.length / 2)];

  // Mode calculation
  const freq: Record<number, number> = {};
  for (const v of values) freq[v] = (freq[v] || 0) + 1;
  const maxFreq = Math.max(...Object.values(freq));
  const modes = Object.entries(freq).filter(([, f]) => f === maxFreq).map(([v]) => +v);
  const modeStr = modes.length === values.length ? "אין" : modes.join(", ");
  const modeSet = new Set(modes.length === values.length ? [] : modes);

  const maxVal = 100;
  const barW = 28, gap = 6, padL = 50, padT = 20, chartH = 180;
  const chartW = padL + values.length * (barW + gap) + 20;

  return (
    <section className="lab-section">
      <style>{`
        .lab-section {
          border-radius: 24px; background: #f8fafc; margin: 2rem auto 0; max-width: 64rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06);
          border: 1px solid #e2e8f0; padding: 2rem;
        }
        @media (max-width: 767px) {
          .lab-section { border-radius: 14px; padding: 0.75rem; margin-top: 1rem; }
        }
        .lab-two-col { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
        .lab-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .lab-stat-value { font-size: 22px; }
        .lab-slider-label { font-size: 14px; }
        .lab-slider-val { font-size: 15px; }
        .lab-slider-track { height: 36px; }
        /* Mobile: sliders(1) → chart(2) → stats(3) */
        .lab-col-chart { order: 2; display: flex; flex-direction: column; gap: 1.5rem; }
        .lab-col-sliders { order: 1; }
        .lab-col-stats { order: 3; }
        @media (min-width: 640px) {
          .lab-section { padding: 2.5rem 2rem; }
          .lab-stats-grid { gap: 14px; }
          .lab-stat-value { font-size: 26px; }
          .lab-slider-label { font-size: 13px; }
          .lab-slider-val { font-size: 14px; }
        }
        @media (min-width: 768px) {
          /* Desktop: chart+stats on LEFT (start), sliders on RIGHT (end) */
          .lab-two-col { grid-template-columns: 1fr 320px; grid-template-rows: auto auto; gap: 1.5rem 2rem; }
          .lab-col-chart { order: unset; grid-column: 1; grid-row: 1; }
          .lab-col-stats { order: unset; grid-column: 1; grid-row: 2; }
          .lab-col-sliders { order: unset; grid-column: 2; grid-row: 1 / 3; }
        }
      `}</style>

      {/* Header with gradient */}
      <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)", borderRadius: 16, padding: "0.75rem", marginBottom: "1.5rem", textAlign: "center" }}>
        <h3 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0 }}>מעבדת מדדי מרכז</h3>
        <p style={{ color: "#94a3b8", fontSize: 13, margin: "6px 0 0" }}>שנה ציונים כדי לראות כיצד ממוצע, חציון ושכיח משתנים בזמן אמת.</p>
      </div>

      {/* Desktop: chart+stats LEFT | sliders RIGHT */}
      {/* Mobile stacked: sliders → chart → stats */}
      <div className="lab-two-col">

        {/* Chart panel */}
        <div className="lab-col-chart" style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "1.25rem", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: "1rem", paddingBottom: 8, borderBottom: "2px solid #e2e8f0" }}>תרשים עמודות</div>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <svg viewBox={`0 0 ${chartW} ${chartH + 50}`} style={{ width: "100%", minWidth: 340, display: "block" }} aria-hidden>
              {/* Y-axis */}
              <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#cbd5e1" strokeWidth={1} />
              {/* X-axis */}
              <line x1={padL} y1={padT + chartH} x2={chartW - 10} y2={padT + chartH} stroke="#cbd5e1" strokeWidth={1} />

              {/* Y-axis ticks */}
              {[0, 25, 50, 75, 100].map(tick => {
                const y = padT + chartH - (tick / maxVal) * chartH;
                return (
                  <g key={tick}>
                    <line x1={padL - 4} y1={y} x2={padL} y2={y} stroke="#cbd5e1" strokeWidth={1} />
                    <text x={padL - 8} y={y + 3} fontSize={8} fill="#94a3b8" textAnchor="end">{tick}</text>
                  </g>
                );
              })}

              {/* Mean line (blue dashed — line only, no label card) */}
              <line x1={padL} y1={padT + chartH - (mean / maxVal) * chartH} x2={chartW - 10} y2={padT + chartH - (mean / maxVal) * chartH} stroke="#2563eb" strokeWidth={2} strokeDasharray="8,4" />

              {/* Median line (orange dashed — line only, no label card) */}
              <line x1={padL} y1={padT + chartH - (median / maxVal) * chartH} x2={chartW - 10} y2={padT + chartH - (median / maxVal) * chartH} stroke="#ea580c" strokeWidth={2} strokeDasharray="8,4" />

              {/* Bars with mode highlight */}
              {values.map((v, i) => {
                const h = (v / maxVal) * chartH;
                const x = padL + i * (barW + gap) + gap;
                const y = padT + chartH - h;
                const isMode = modeSet.has(v);
                return (
                  <g key={i}>
                    {isMode && (
                      <rect x={x - 3} y={y - 3} width={barW + 6} height={h + 3} rx={6} fill="none" stroke="#7c3aed" strokeWidth={2.5} opacity={0.6} />
                    )}
                    <rect x={x} y={y} width={barW} height={h} rx={5} fill={isMode ? "#7c3aed" : "#2563eb"} opacity={isMode ? 0.9 : 0.65} />
                    {isMode && (
                      <text x={x + barW / 2} y={y - 6} fontSize={8} fill="#7c3aed" fontWeight={700} textAnchor="middle">Mo</text>
                    )}
                    <text x={x + barW / 2} y={padT + chartH + 14} fontSize={9} fill="#64748b" fontWeight={500} textAnchor="middle">{i + 1}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: "1rem", flexWrap: "wrap" }}>
            {[
              { label: "ממוצע", color: "#2563eb" },
              { label: "חציון", color: "#ea580c" },
              { label: "שכיח", color: "#7c3aed" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b" }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: item.color }} />
                <span style={{ fontWeight: 600 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats cards — 2x2 grid below chart (left column on desktop) */}
        <div className="lab-col-stats">
          <div className="lab-stats-grid">
            {[
              { label: "ממוצע", val: mean.toFixed(2), color: "#2563eb", bg: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)", border: "#93c5fd", icon: "x̄" },
              { label: "חציון", val: median.toFixed(2), color: "#ea580c", bg: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)", border: "#fdba74", icon: "Me" },
              { label: "שכיח", val: modeStr, color: "#7c3aed", bg: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)", border: "#c4b5fd", icon: "Mo" },
              { label: "כמות", val: `${values.length}`, color: "#475569", bg: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)", border: "#cbd5e1", icon: "n" },
            ].map(r => (
              <div key={r.label} style={{ borderRadius: 16, background: r.bg, border: `2px solid ${r.border}`, padding: "1.25rem 1rem", textAlign: "center", boxShadow: "0 6px 16px rgba(0,0,0,0.06)" }}>
                <div style={{ color: r.color, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, opacity: 0.8 }}>{r.label}</div>
                <div className="lab-stat-value" style={{ color: r.color, fontWeight: 800, fontFamily: "monospace", lineHeight: 1.1 }}>{r.val}</div>
                <div style={{ color: r.color, fontSize: 10, fontWeight: 600, marginTop: 4, opacity: 0.5 }}>{r.icon}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sliders — RIGHT column on desktop, TOP on mobile */}
        <div className="lab-col-sliders" style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "1.25rem", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: "1rem", paddingBottom: 8, borderBottom: "2px solid #e2e8f0" }}>נתוני התלמידים</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            {values.map((v, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", marginBottom: 4 }}>
                  <span className="lab-slider-label" style={{ fontWeight: 500 }}>תלמיד {i + 1}</span>
                  <span className="lab-slider-val" style={{ color: "#1e293b", fontWeight: 700, fontFamily: "monospace" }}>{v}</span>
                </div>
                <input type="range" min={0} max={100} step={1} value={v} onChange={e => setVal(i, +e.target.value)} className="lab-slider-track" style={{ width: "100%", accentColor: "#2563eb" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Lab 2: MissingScoreLab (Medium) ──────────────────────────────────────────

function MissingScoreLab() {
  const fixedScores = [78, 92, 85, 71];
  const [fifthScore, setFifthScore] = useState(84);
  const [targetAvg, setTargetAvg] = useState(84);

  const existingSum = fixedScores.reduce((a, b) => a + b, 0);
  const requiredScore = targetAvg * 5 - existingSum;
  const actualAvg = (existingSum + fifthScore) / 5;

  const lineMin = 50, lineMax = 110;
  const padL = 30, padR = 30, lineY = 70, w = 380, h = 130;
  const toX = (v: number) => padL + ((v - lineMin) / (lineMax - lineMin)) * (w - padL - padR);

  return (
    <section style={{ border: "1px solid rgba(244,63,94,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת הציון החסר</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה את הציון החמישי והממוצע הרצוי כדי לראות את ההשפעה.</p>

      {/* Fixed scores display */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {fixedScores.map((s, i) => (
          <div key={i} style={{ borderRadius: 12, background: "rgba(234,88,12,0.1)", border: "1px solid rgba(234,88,12,0.3)", padding: "8px 16px", textAlign: "center" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600 }}>מבחן {i + 1}</div>
            <div style={{ color: "#EA580C", fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{s}</div>
          </div>
        ))}
        <div style={{ borderRadius: 12, background: "rgba(244,63,94,0.1)", border: "2px solid rgba(244,63,94,0.4)", padding: "8px 16px", textAlign: "center" }}>
          <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600 }}>מבחן 5</div>
          <div style={{ color: "#f43f5e", fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{fifthScore}</div>
        </div>
      </div>

      {/* Sliders */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: "2rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>ציון במבחן 5</span>
            <span style={{ color: "#f43f5e", fontWeight: 700 }}>{fifthScore}</span>
          </div>
          <input type="range" min={0} max={100} step={1} value={fifthScore} onChange={e => setFifthScore(+e.target.value)} style={{ width: "100%", accentColor: "#f43f5e" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>ממוצע יעד</span>
            <span style={{ color: "#a78bfa", fontWeight: 700 }}>{targetAvg}</span>
          </div>
          <input type="range" min={60} max={100} step={1} value={targetAvg} onChange={e => setTargetAvg(+e.target.value)} style={{ width: "100%", accentColor: "#a78bfa" }} />
        </div>
      </div>

      {/* SVG: Number line */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(244,63,94,0.25)", background: "#fff", padding: "1rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(244,63,94,0.08)" }}>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Number line */}
          <line x1={padL} y1={lineY} x2={w - padR} y2={lineY} stroke="#94a3b8" strokeWidth={1.5} />
          <polygon points={`${w - padR},${lineY} ${w - padR - 6},${lineY - 4} ${w - padR - 6},${lineY + 4}`} fill="#94a3b8" />

          {/* Tick marks */}
          {[60, 70, 80, 90, 100].map(v => (
            <g key={v}>
              <line x1={toX(v)} y1={lineY - 4} x2={toX(v)} y2={lineY + 4} stroke="#94a3b8" strokeWidth={1} />
              <text x={toX(v)} y={lineY + 16} fontSize={9} fill="#94a3b8" textAnchor="middle">{v}</text>
            </g>
          ))}

          {/* Fixed score dots */}
          {fixedScores.map((s, i) => (
            <circle key={i} cx={toX(s)} cy={lineY} r={6} fill="#EA580C" stroke="#fff" strokeWidth={1.5} />
          ))}

          {/* 5th score dot */}
          <circle cx={toX(Math.min(fifthScore, 105))} cy={lineY} r={7} fill="#f43f5e" stroke="#fff" strokeWidth={2} />

          {/* Target average vertical line */}
          <line x1={toX(Math.min(targetAvg, 105))} y1={lineY - 25} x2={toX(Math.min(targetAvg, 105))} y2={lineY + 25} stroke="#a78bfa" strokeWidth={2} strokeDasharray="4,3" />
          <text x={toX(Math.min(targetAvg, 105))} y={lineY - 30} fontSize={9} fill="#a78bfa" fontWeight={700} textAnchor="middle">יעד: {targetAvg}</text>
        </svg>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "סכום קיים", val: `${existingSum}`, color: "#EA580C" },
          { label: "ציון נדרש ליעד", val: requiredScore > 100 ? `${requiredScore} (!)` : requiredScore < 0 ? `${requiredScore} (!)` : `${requiredScore}`, color: requiredScore > 100 || requiredScore < 0 ? "#dc2626" : "#a78bfa" },
          { label: "ממוצע בפועל", val: actualAvg.toFixed(1), color: "#f43f5e" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(244,63,94,0.35)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Lab 3: DistributionLab (Advanced) ────────────────────────────────────────

function DistributionLab() {
  const [classA, setClassA] = useState([65, 72, 78, 80, 80]);
  const [classB, setClassB] = useState([90, 85, 65, 65, 60]);
  const [bonus, setBonus] = useState(0);

  const setA = (i: number, v: number) => setClassA(prev => { const next = [...prev]; next[i] = v; return next; });
  const setB = (i: number, v: number) => setClassB(prev => { const next = [...prev]; next[i] = v; return next; });

  function calcStats(arr: number[]) {
    const sorted = [...arr].sort((a, b) => a - b);
    const sum = arr.reduce((a, b) => a + b, 0);
    const mean = sum / arr.length;
    const median = arr.length % 2 === 0
      ? (sorted[arr.length / 2 - 1] + sorted[arr.length / 2]) / 2
      : sorted[Math.floor(arr.length / 2)];
    const freq: Record<number, number> = {};
    for (const v of arr) freq[v] = (freq[v] || 0) + 1;
    const maxFreq = Math.max(...Object.values(freq));
    const modes = Object.entries(freq).filter(([, f]) => f === maxFreq).map(([v]) => +v);
    const modeStr = modes.length === arr.length ? "אין" : modes.join(", ");
    return { mean, median, modeStr };
  }

  const classABonused = classA.map(v => v + bonus);
  const statsA = calcStats(classABonused);
  const statsB = calcStats(classB);

  const maxVal = 100 + bonus;
  const barW = 22, gap = 6, padL = 10, padT = 30, chartH = 140;
  const groupW = 5 * (barW + gap) + gap;
  const totalW = padL + groupW + 40 + groupW + padL;

  return (
    <section style={{ border: "1px solid rgba(244,63,94,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת השוואת התפלגויות</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה ציונים בשתי הכיתות וראה את ההבדלים במדדי המרכז.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem 2rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ color: "#16A34A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(22,163,74,0.3)", paddingBottom: 6 }}>{"כיתה א'"}</div>
          {classA.map((v, i) => (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 2 }}>
                <span>תלמיד {i + 1}</span>
                <span style={{ color: "#16A34A", fontWeight: 700 }}>{v}{bonus > 0 ? ` (+${bonus})` : ""}</span>
              </div>
              <input type="range" min={0} max={100} step={1} value={v} onChange={e => setA(i, +e.target.value)} style={{ width: "100%", accentColor: "#16A34A" }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ color: "#3b82f6", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(59,130,246,0.3)", paddingBottom: 6 }}>{"כיתה ב'"}</div>
          {classB.map((v, i) => (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 2 }}>
                <span>תלמיד {i + 1}</span>
                <span style={{ color: "#3b82f6", fontWeight: 700 }}>{v}</span>
              </div>
              <input type="range" min={0} max={100} step={1} value={v} onChange={e => setB(i, +e.target.value)} style={{ width: "100%", accentColor: "#3b82f6" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Bonus slider */}
      <div style={{ marginBottom: "2rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(244,63,94,0.2)", padding: "1rem 1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
          <span>{"בונוס לכיתה א'"}</span>
          <span style={{ color: "#f43f5e", fontWeight: 700 }}>+{bonus}</span>
        </div>
        <input type="range" min={0} max={10} step={1} value={bonus} onChange={e => setBonus(+e.target.value)} style={{ width: "100%", accentColor: "#f43f5e" }} />
      </div>

      {/* SVG: Side-by-side bar charts */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(244,63,94,0.25)", background: "#fff", padding: "1rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(244,63,94,0.08)" }}>
        <svg viewBox={`0 0 ${totalW} ${chartH + padT + 30}`} style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Class A label */}
          <text x={padL + groupW / 2} y={18} fontSize={11} fill="#16A34A" fontWeight={700} textAnchor="middle">{"כיתה א'"}{bonus > 0 ? ` (+${bonus})` : ""}</text>
          {/* Class A bars */}
          {classABonused.map((v, i) => {
            const h = Math.min((v / maxVal) * chartH, chartH);
            const x = padL + i * (barW + gap) + gap;
            const y = padT + chartH - h;
            return <rect key={i} x={x} y={y} width={barW} height={h} rx={3} fill="#16A34A" opacity={0.6} />;
          })}
          <line x1={padL} y1={padT + chartH} x2={padL + groupW} y2={padT + chartH} stroke="#94a3b8" strokeWidth={1} />

          {/* Class B label */}
          <text x={padL + groupW + 40 + groupW / 2} y={18} fontSize={11} fill="#3b82f6" fontWeight={700} textAnchor="middle">{"כיתה ב'"}</text>
          {/* Class B bars */}
          {classB.map((v, i) => {
            const h = (v / maxVal) * chartH;
            const x = padL + groupW + 40 + i * (barW + gap) + gap;
            const y = padT + chartH - h;
            return <rect key={i} x={x} y={y} width={barW} height={h} rx={3} fill="#3b82f6" opacity={0.6} />;
          })}
          <line x1={padL + groupW + 40} y1={padT + chartH} x2={padL + groupW + 40 + groupW} y2={padT + chartH} stroke="#94a3b8" strokeWidth={1} />
        </svg>
      </div>

      {/* Stats comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Class A stats */}
        <div style={{ borderRadius: 16, border: "1px solid rgba(22,163,74,0.35)", background: "rgba(22,163,74,0.04)", padding: "1rem" }}>
          <div style={{ color: "#16A34A", fontSize: 11, fontWeight: 700, marginBottom: 10, textAlign: "center" }}>{"כיתה א'"}{bonus > 0 ? ` (+${bonus})` : ""}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "ממוצע", val: statsA.mean.toFixed(1) },
              { label: "חציון", val: statsA.median.toFixed(1) },
              { label: "שכיח", val: statsA.modeStr },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#6B7280" }}>{r.label}</span>
                <span style={{ color: "#16A34A", fontWeight: 700, fontFamily: "monospace" }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Class B stats */}
        <div style={{ borderRadius: 16, border: "1px solid rgba(59,130,246,0.35)", background: "rgba(59,130,246,0.04)", padding: "1rem" }}>
          <div style={{ color: "#3b82f6", fontSize: 11, fontWeight: 700, marginBottom: 10, textAlign: "center" }}>{"כיתה ב'"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "ממוצע", val: statsB.mean.toFixed(1) },
              { label: "חציון", val: statsB.median.toFixed(1) },
              { label: "שכיח", val: statsB.modeStr },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#6B7280" }}>{r.label}</span>
                <span style={{ color: "#3b82f6", fontWeight: 700, fontFamily: "monospace" }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Grade label map for dynamic prompt injection
const GRADE_MAP: Record<string, string> = { "10": "י׳", "11": 'י"א', "12": 'י"ב' };

function injectGrade(text: string, grade: string): string {
  const label = GRADE_MAP[grade] || "י׳";
  return text.replace(/כיתה י['׳]/g, `כיתה ${label}`);
}

export default function CentralTendencyPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("math-progress:central-level");
      if (saved === "basic" || saved === "medium" || saved === "advanced") return saved;
    }
    return "basic";
  });

  // Read saved grade for dynamic prompts
  const [userGrade, setUserGrade] = useState("10");
  useEffect(() => {
    const g = localStorage.getItem("math-grade");
    if (g) setUserGrade(g);
  }, []);

  const handleLevelChange = (level: "basic" | "medium" | "advanced") => {
    setSelectedLevel(level);
    try { localStorage.setItem("math-progress:central-level", level); } catch {}
  };

  const ex = exercises.find(e => e.id === selectedLevel)!;
  // Inject saved grade into golden prompt
  const dynamicEx = { ...ex, goldenPrompt: injectGrade(ex.goldenPrompt, userGrade) };
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "163,79,38" : "139,38,53";

  return (
    <main
      style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties}
      dir="rtl"
    >
      {/* ── Global focus/hover border overrides ── */}
      <style>{`
        textarea, input[type="text"], input[type="password"], input[type="number"] { outline: none !important; }
        textarea:focus, input[type="text"]:focus, input[type="number"]:focus {
          outline: none !important;
          border-color: rgba(var(--lvl-rgb), 0.65) !important;
          box-shadow: 0 0 0 3px rgba(var(--lvl-rgb), 0.12) !important;
        }
        input[type="range"] { outline: none !important; }
        input[type="range"]:focus { outline: none !important; }
        button:focus, button:focus-visible {
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(var(--lvl-rgb), 0.35) !important;
        }
        button:focus:not(:focus-visible) { box-shadow: none !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>📊 מדדי מרכז</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>ממוצע, חציון ושכיח — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/"
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

        {/* Sub-topic progress bar */}
        <SubtopicProgress subtopicId="grade10/statistics/central" />

        {/* Level Selector */}
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(60,54,42,0.15)" }}>
          {TABS.map(tab => {
            const active = selectedLevel === tab.id;
            return (
              <button key={tab.id} onClick={() => handleLevelChange(tab.id as typeof selectedLevel)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active ? `${tab.bg} border ${tab.border} ${tab.textColor}` : "text-stone-500 hover:text-stone-800"}`}
                style={active ? { boxShadow: `0 0 14px ${tab.glowColor}` } : undefined}>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active card */}
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={dynamicEx} />
        </motion.div>

        {/* Lab — each level gets its own lab */}
        {selectedLevel === "basic" && <BarChartLab />}
        {selectedLevel === "medium" && <MissingScoreLab />}
        {selectedLevel === "advanced" && <DistributionLab />}

        {/* Mark as complete button */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="grade10/statistics/central" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
