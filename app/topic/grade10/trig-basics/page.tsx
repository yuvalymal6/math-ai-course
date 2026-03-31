"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
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
        subjectWords={["סינוס", "קוסינוס", "טנגנס", "sin", "cos", "tan", "זווית", "יתר", "ניצב", "משולש", "גובה", "שטח", "טריגונומטריה"]}
        subjectHint="סינוס / קוסינוס / טנגנס / זווית / משולש / גובה / שטח"
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
  return (
    <svg viewBox="0 0 400 300" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Floor */}
      <line x1={40} y1={260} x2={360} y2={260} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Wall */}
      <line x1={280} y1={260} x2={280} y2={40} stroke="#64748b" strokeWidth={3} />
      {/* Ladder */}
      <line x1={120} y1={260} x2={280} y2={100} stroke="#f59e0b" strokeWidth={3} />
      {/* Right angle mark at wall-floor */}
      <polyline points="268,260 268,248 280,248" fill="none" stroke="#94a3b8" strokeWidth={1.5} />
      {/* Angle arc at base */}
      <path d="M 145,260 A 25,25 0 0,0 136,243" fill="none" stroke="#00d4ff" strokeWidth={2} />
      {/* Labels */}
      <text x={110} y={278} fontSize={13} fill="#94a3b8" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">תחתית</text>
      <text x={280} y={32} fontSize={13} fill="#64748b" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">קיר</text>
      <text x={145} y={240} fontSize={12} fill="#00d4ff" fontWeight={600} fontFamily="sans-serif">&alpha;</text>
    </svg>
  );
}

function MediumDiagram() {
  return (
    <svg viewBox="0 0 400 300" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Ground */}
      <line x1={20} y1={260} x2={380} y2={260} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Tower */}
      <rect x={55} y={60} width={20} height={200} fill="#64748b" rx={2} />
      {/* Horizontal line from tower top */}
      <line x1={75} y1={60} x2={370} y2={60} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />
      {/* Sight line to B (45 deg) */}
      <line x1={75} y1={60} x2={275} y2={260} stroke="#3b82f6" strokeWidth={2} strokeDasharray="6,3" />
      {/* Sight line to A (30 deg) */}
      <line x1={75} y1={60} x2={365} y2={260} stroke="#EA580C" strokeWidth={2} strokeDasharray="6,3" />
      {/* Depression angle arcs */}
      <path d="M 130,60 A 55,55 0 0,1 112,95" fill="none" stroke="#3b82f6" strokeWidth={2} />
      <path d="M 160,60 A 85,85 0 0,1 150,80" fill="none" stroke="#EA580C" strokeWidth={2} />
      {/* Points */}
      <circle cx={275} cy={260} r={5} fill="#3b82f6" stroke="#fff" strokeWidth={1.5} />
      <circle cx={365} cy={260} r={5} fill="#EA580C" stroke="#fff" strokeWidth={1.5} />
      {/* Labels */}
      <text x={275} y={278} fontSize={12} fill="#3b82f6" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">B</text>
      <text x={365} y={278} fontSize={12} fill="#EA580C" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">A</text>
      <text x={45} y={55} fontSize={12} fill="#64748b" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">h</text>
    </svg>
  );
}

function AdvancedDiagram() {
  const Ax = 80, Ay = 240;
  const Bx = 320, By = 240;
  const Cx = 160, Cy = 80;
  const Hx = 160, Hy = 240;

  return (
    <svg viewBox="0 0 400 300" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Triangle */}
      <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`} fill="rgba(234,88,12,0.06)" stroke="#64748b" strokeWidth={2} strokeLinejoin="round" />
      {/* Height h */}
      <line x1={Cx} y1={Cy} x2={Hx} y2={Hy} stroke="#a78bfa" strokeWidth={2} strokeDasharray="6,3" />
      {/* Right angle mark at foot */}
      <polyline points={`${Hx - 10},${Hy} ${Hx - 10},${Hy - 10} ${Hx},${Hy - 10}`} fill="none" stroke="#a78bfa" strokeWidth={1.5} />
      {/* Angle arc at A */}
      <path d={`M ${Ax + 35},${Ay} A 35,35 0 0,0 ${Ax + 22},${Ay - 27}`} fill="none" stroke="#00d4ff" strokeWidth={2} />
      {/* Labels */}
      <text x={Ax - 10} y={Ay + 18} fontSize={14} fill="#64748b" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={Bx + 6} y={By + 18} fontSize={14} fill="#64748b" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={Cx - 4} y={Cy - 10} fontSize={14} fill="#64748b" fontWeight={700} fontFamily="sans-serif">C</text>
      <text x={Hx + 6} y={Hy + 18} fontSize={12} fill="#a78bfa" fontWeight={600} fontFamily="sans-serif">H</text>
      <text x={Cx - 22} y={(Cy + Hy) / 2} fontSize={12} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">h</text>
    </svg>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "הסולם והקיר",
    problem: "סולם באורך 5 מטרים נשען על קיר אנכי.\nתחתית הסולם נמצאת במרחק 3 מטרים מבסיס הקיר.\n\nא. חשב את גובה הנקודה שבה הסולם נוגע בקיר.\nב. חשב את הזווית שבין הסולם לרצפה (הזווית α).\nג. הסולם מחליק — תחתיתו מתרחקת ל-4 מטרים מהקיר. מהו הגובה החדש?",
    diagram: <BasicDiagram />,
    pitfalls: [
      { title: "⚠️ פיתגורס קודם לטריגו", text: "חשב קודם את הגובה באמצעות משפט פיתגורס: a² + b² = c². רק אחר כך עבור לחישוב זוויות עם טריגונומטריה." },
      { title: "🔦 cos α = ניצב ליד / יתר", text: "הזווית α נמצאת בבסיס הסולם. הצלע הנגדית היא הגובה, הצלע הסמוכה היא המרחק מהקיר, והיתר הוא הסולם." },
    ],
    goldenPrompt: `\nהיי, אני תלמיד/ה כיתה י' ומצרף/ת שאלה בטריגונומטריה על סולם שנשען על קיר.\nאני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.\n\nאל תפתור עבורי — שאל אותי שאלות מכווינות.\nסרוק את הנתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "מציאת הגובה", coaching: "", prompt: "תעזור לי למצוא את הגובה שבו הסולם נוגע בקיר. יש לי סולם באורך 5 ומרחק 3 מהקיר.", keywords: [], keywordHint: "", contextWords: ["פיתגורס", "סינוס", "קוסינוס", "יתר", "ניצב", "זווית", "גובה"] },
      { phase: "סעיף ב׳", label: "חישוב הזווית α", coaching: "", prompt: "כיצד נמצא את הזווית α שבין הסולם לרצפה?", keywords: [], keywordHint: "", contextWords: ["פיתגורס", "סינוס", "קוסינוס", "יתר", "ניצב", "זווית", "גובה"] },
      { phase: "סעיף ג׳", label: "הסולם החליק", coaching: "", prompt: "הסולם החליק ועכשיו המרחק מהקיר הוא 4 מטר. מה קורה לגובה?", keywords: [], keywordHint: "", contextWords: ["פיתגורס", "סינוס", "קוסינוס", "יתר", "ניצב", "זווית", "גובה"] },
    ],
  },
  {
    id: "medium",
    title: "מגדל השמירה",
    problem: "ממגדל שמירה בגובה h מסתכלים על שני עצמים A ו-B הנמצאים על הקרקע.\nזווית ההשקפה (Depression) לעצם A היא 30° וזווית ההשקפה לעצם B היא 45°.\nהמרחק בין A ל-B הוא 100 מטר, ושניהם נמצאים על אותו קו ישר מהמגדל.\n\nא. הבע את המרחק מבסיס המגדל לכל עצם באמצעות h.\nב. בנה משוואה ומצא את h (גובה המגדל).\nג. חשב את המרחק מראש המגדל לעצם A.",
    diagram: <MediumDiagram />,
    pitfalls: [
      { title: "⚠️ זווית השקפה = מהאופק למטה", text: "זווית ה-Depression היא מהקו האופקי כלפי מטה. הזווית בתוך המשולש הישר-זווית היא המשלימה ל-90° — אבל כאן tan(Depression) = ניצב נגדי / ניצב סמוך." },
      { title: "🔦 tan(30°) = 1/√3, tan(45°) = 1", text: "השתמשו בערכים המדויקים. המרחק לעצם A הוא h·√3, והמרחק לעצם B הוא h." },
    ],
    goldenPrompt: `אני בכיתה י', מצרף לך תרגיל בטריגונומטריה על מגדל שמירה וזוויות השקפה.\n\nאל תיתן לי את הפתרון — שאל אותי שאלות מנחות על זוויות, טנגנס ומרחקים.\nסרוק את הנתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "הבעת מרחקים באמצעות h", coaching: "", prompt: "תעזור לי להביע את המרחק מבסיס המגדל לכל עצם כפונקציה של הגובה h.", keywords: [], keywordHint: "", contextWords: ["זווית השקפה", "טנגנס", "גובה", "מרחק", "משוואה"] },
      { phase: "סעיף ב׳", label: "בניית משוואה ומציאת h", coaching: "", prompt: "כיצד אבנה משוואה מהנתון שהמרחק בין A ל-B הוא 100 מטר?", keywords: [], keywordHint: "", contextWords: ["זווית השקפה", "טנגנס", "גובה", "מרחק", "משוואה"] },
      { phase: "סעיף ג׳", label: "מרחק מראש המגדל לעצם A", coaching: "", prompt: "כיצד אמצא את המרחק מראש המגדל לעצם A? (רמז: יתר במשולש ישר-זווית)", keywords: [], keywordHint: "", contextWords: ["זווית השקפה", "טנגנס", "גובה", "מרחק", "משוואה"] },
    ],
  },
  {
    id: "advanced",
    title: "המשולש הכללי",
    problem: "במשולש ABC ידוע:\n∠A = 60°, AB = 8, AC = 6.\n\nא. הורד גובה מ-C לצלע AB וסמנהו h. חשב את h באמצעות sin 60°.\nב. חשב את שטח המשולש ABC.\nג. מצא את אורך הצלע BC (רמז: השתמש בנוסחת הקוסינוסים או בגובה שמצאת).",
    diagram: <AdvancedDiagram />,
    pitfalls: [
      { title: "⚠️ הגובה = AC · sin(A)", text: "כשמורידים גובה מ-C לצלע AB, הגובה h = AC · sin(∠A) = 6 · sin(60°)." },
      { title: "💡 נוסחת הקוסינוסים", text: "BC² = AB² + AC² - 2·AB·AC·cos(A). אפשר גם לפרק למשולשים ישרי-זווית באמצעות הגובה." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד מחשבים גובה במשולש באמצעות סינוס? מהי נוסחת הקוסינוסים? כיצד מוצאים שטח משולש כשידועות שתי צלעות וזווית ביניהן? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "חישוב הגובה h", coaching: "", prompt: "תעזור לי לחשב את הגובה h מ-C לצלע AB באמצעות sin 60°.", keywords: [], keywordHint: "", contextWords: ["גובה", "סינוס", "שטח", "קוסינוס", "נוסחה", "משולש"] },
      { phase: "סעיף ב׳", label: "שטח המשולש", coaching: "", prompt: "כיצד אחשב את שטח המשולש אם מצאתי את הגובה?", keywords: [], keywordHint: "", contextWords: ["גובה", "סינוס", "שטח", "קוסינוס", "נוסחה", "משולש"] },
      { phase: "סעיף ג׳", label: "מציאת BC", coaching: "", prompt: "כיצד אמצא את אורך הצלע BC? האם אפשר להשתמש בנוסחת הקוסינוסים?", keywords: [], keywordHint: "", contextWords: ["גובה", "סינוס", "שטח", "קוסינוס", "נוסחה", "משולש"] },
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
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Formula bar — trig (modern card layout) */}
      <div className="formula-bar font-sans" style={{ borderRadius: 16, border: "1px solid rgba(0,212,255,0.25)", background: "rgba(255,255,255,0.78)", padding: "1.5rem 1.25rem", marginBottom: "2.5rem", boxShadow: "0 4px 20px rgba(0,212,255,0.08)" }}>
        <h3 style={{ color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 20, marginTop: 0, textAlign: "center", lineHeight: 1.4 }}>נוסחאות טריגונומטריה</h3>

        {/* Triangle + Legend side-by-side, legend vertically centered */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-8 mb-6">
          {/* Clean SVG — labels tight to their sides */}
          <svg viewBox="0 0 185 155" className="w-full max-w-[170px] sm:max-w-[195px] shrink-0" aria-label="Right triangle">
            {/* A(20,130) B(160,130) C(160,20) */}
            <polygon points="20,130 160,130 160,20" fill="rgba(99,102,241,0.03)" stroke="#334155" strokeWidth="2" />
            {/* Right angle marker at B */}
            <polyline points="145,130 145,115 160,115" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
            {/* Angle arc α at A */}
            <path d="M 48,130 A 28,28 0 0,0 37,115" fill="none" stroke="#6366f1" strokeWidth="2.5" />
            <text x="52" y="120" fontSize="14" fill="#6366f1" fontWeight="700" fontStyle="italic">α</text>
            {/* a: tight to BC vertical, centered at midpoint y=75 */}
            <text x="165" y="79" fontSize="14" fill="#6366f1" fontWeight="700" textAnchor="start">a</text>
            {/* b: centered under AB, midpoint x=90 */}
            <text x="90" y="147" fontSize="14" fill="#10b981" fontWeight="700" textAnchor="middle">b</text>
            {/* c: above midpoint of AC diagonal, offset up-left */}
            <text x="80" y="68" fontSize="14" fill="#f59e0b" fontWeight="700" textAnchor="middle">c</text>
            {/* Vertices — outside triangle corners */}
            <text x="10" y="142" fontSize="11" fill="#475569" fontWeight="600">A</text>
            <text x="163" y="142" fontSize="11" fill="#475569" fontWeight="600">B</text>
            <text x="163" y="16" fontSize="11" fill="#475569" fontWeight="600">C</text>
          </svg>

          {/* Hebrew legend — vertically centered with triangle */}
          <div className="flex flex-row sm:flex-col gap-3 sm:gap-3" style={{ direction: "rtl" }}>
            {[
              { letter: "a", label: "ניצב מול", bg: "#6366f1", text: "white" },
              { letter: "b", label: "ניצב ליד", bg: "#10b981", text: "white" },
              { letter: "c", label: "יתר", bg: "#f59e0b", text: "white" },
              { letter: "α", label: "זווית", bg: "rgba(99,102,241,0.12)", text: "#6366f1" },
            ].map(item => (
              <div key={item.letter} className="flex items-center gap-2.5">
                <span
                  className="shrink-0 rounded-md text-[11px] font-bold"
                  style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", background: item.bg, color: item.text, fontStyle: item.letter === "α" ? "italic" : "normal" }}
                >
                  {item.letter}
                </span>
                <span className="text-slate-600 text-[13px] font-medium leading-normal">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trig function cards — 3-col grid on desktop, stacked on mobile */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
          {/* Sin card */}
          <div style={{ borderRadius: 14, border: "1.5px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.05)", padding: "16px 14px", textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: "#6366f1", fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>Sin — סינוס</div>
            <div style={{ color: "#6366f1", margin: "4px 0" }}><TexBlock>{String.raw`\sin \alpha = \frac{a}{c}`}</TexBlock></div>
            <div style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>ניצב מול / יתר</div>
          </div>
          {/* Cos card */}
          <div style={{ borderRadius: 14, border: "1.5px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.05)", padding: "16px 14px", textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: "#10b981", fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>Cos — קוסינוס</div>
            <div style={{ color: "#10b981", margin: "4px 0" }}><TexBlock>{String.raw`\cos \alpha = \frac{b}{c}`}</TexBlock></div>
            <div style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>ניצב ליד / יתר</div>
          </div>
          {/* Tan card */}
          <div style={{ borderRadius: 14, border: "1.5px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.05)", padding: "16px 14px", textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: "#f59e0b", fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>Tan — טנגנס</div>
            <div style={{ color: "#f59e0b", margin: "4px 0" }}><TexBlock>{String.raw`\tan \alpha = \frac{a}{b}`}</TexBlock></div>
            <div style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>ניצב מול / ניצב ליד</div>
          </div>
        </div>

        {/* Area formula — full width */}
        <div style={{ borderRadius: 12, border: "1px solid rgba(0,212,255,0.2)", background: "rgba(0,212,255,0.04)", padding: "14px 12px", textAlign: "center" }}>
          <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>שטח משולש (שתי צלעות וזווית)</div>
          <div style={{ color: "#00d4ff" }}><TexBlock>{String.raw`S = \tfrac{1}{2} \cdot a \cdot b \cdot \sin C`}</TexBlock></div>
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
        <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>
      )}

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
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
        {ex.id === "basic"    && <LadderBase     steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} problemText={ex.problem} />}
        {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
      </div>

    </section>
  );
}

// ─── Lab 1: LadderLab (Basic) ─────────────────────────────────────────────────

function LadderLab() {
  const [ladderLen, setLadderLen] = useState(5);
  const [distWall, setDistWall] = useState(3);

  const maxDist = ladderLen - 0.5;
  const d = Math.min(distWall, maxDist);
  const height = Math.sqrt(ladderLen * ladderLen - d * d);
  const angleRad = Math.acos(d / ladderLen);
  const angleDeg = (angleRad * 180) / Math.PI;
  const sinA = Math.sin(angleRad);
  const cosA = Math.cos(angleRad);
  const tanA = height > 0.001 ? Math.tan(angleRad) : Infinity;

  const floorY = 260, wallX = 300;
  const pxPerUnit = 20;
  const baseX = wallX - d * pxPerUnit;
  const topY = floorY - height * pxPerUnit;

  const arcR = 30;
  const arcEndX = baseX + arcR * Math.cos(angleRad);
  const arcEndY = floorY - arcR * Math.sin(angleRad);

  return (
    <section style={{ border: "1px solid rgba(0,212,255,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת הסולם</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה את אורך הסולם והמרחק מהקיר כדי לראות את הגובה, הזווית ויחסי הטריגו.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem 2rem", marginBottom: "2rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>אורך הסולם</span>
            <span style={{ color: "#00d4ff", fontWeight: 700 }}>{ladderLen}</span>
          </div>
          <input type="range" min={3} max={10} step={0.5} value={ladderLen} onChange={e => setLadderLen(+e.target.value)} style={{ width: "100%", accentColor: "#00d4ff" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>מרחק מהקיר</span>
            <span style={{ color: "#f59e0b", fontWeight: 700 }}>{d.toFixed(1)}</span>
          </div>
          <input type="range" min={0.5} max={maxDist} step={0.5} value={d} onChange={e => setDistWall(+e.target.value)} style={{ width: "100%", accentColor: "#f59e0b" }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(0,212,255,0.25)", background: "#fff", padding: "1rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(0,212,255,0.08)" }}>
        <svg viewBox="0 0 400 300" style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Floor */}
          <line x1={30} y1={floorY} x2={370} y2={floorY} stroke="#94a3b8" strokeWidth={1.5} />
          {/* Wall */}
          <line x1={wallX} y1={floorY} x2={wallX} y2={20} stroke="#64748b" strokeWidth={3} />
          {/* Ladder */}
          <line x1={baseX} y1={floorY} x2={wallX} y2={topY} stroke="#f59e0b" strokeWidth={3} />
          {/* Right-angle mark at wall-floor corner */}
          <polyline points={`${wallX - 12},${floorY} ${wallX - 12},${floorY - 12} ${wallX},${floorY - 12}`} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
          {/* Angle arc at base */}
          {angleDeg > 2 && angleDeg < 89 && (
            <path d={`M ${baseX + arcR},${floorY} A ${arcR},${arcR} 0 0,0 ${arcEndX},${arcEndY}`} fill="none" stroke="#00d4ff" strokeWidth={2} />
          )}
          {/* Labels */}
          <text x={(baseX + wallX) / 2 - 20} y={(floorY + topY) / 2 - 8} fontSize={12} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">{ladderLen}</text>
          <text x={wallX + 8} y={(floorY + topY) / 2} fontSize={12} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">{height.toFixed(2)}</text>
          <text x={(baseX + wallX) / 2} y={floorY + 18} fontSize={12} fill="#64748b" fontWeight={600} fontFamily="sans-serif">{d.toFixed(1)}</text>
          {angleDeg > 5 && <text x={baseX + 38} y={floorY - 8} fontSize={11} fill="#00d4ff" fontWeight={700} fontFamily="sans-serif">{angleDeg.toFixed(1)}°</text>}
        </svg>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, textAlign: "center" }}>
        {[
          { label: "גובה", val: height.toFixed(2), color: "#a78bfa" },
          { label: "זווית α", val: `${angleDeg.toFixed(1)}°`, color: "#00d4ff" },
          { label: "sin α", val: sinA.toFixed(4), color: "#16A34A" },
          { label: "cos α", val: cosA.toFixed(4), color: "#EA580C" },
          { label: "tan α", val: isFinite(tanA) ? tanA.toFixed(4) : "∞", color: "#3b82f6" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,212,255,0.35)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Lab 2: TowerLab (Medium) ─────────────────────────────────────────────────

function TowerLab() {
  const [towerH, setTowerH] = useState(100);
  const [depA, setDepA] = useState(30);
  const [depB, setDepB] = useState(45);

  const depARad = (depA * Math.PI) / 180;
  const depBRad = (depB * Math.PI) / 180;
  const distA = towerH / Math.tan(depARad);
  const distB = towerH / Math.tan(depBRad);
  const distAB = Math.abs(distA - distB);
  const hypA = Math.sqrt(towerH * towerH + distA * distA);

  const groundY = 260, towerX = 70;
  const maxGroundDist = Math.max(distA, distB, 100);
  const pxPerUnit = 280 / maxGroundDist;
  const towerTopY = 40;
  const towerPxH = groundY - towerTopY;

  const pointAx = towerX + distA * pxPerUnit;
  const pointBx = towerX + distB * pxPerUnit;

  const arcR = 35;

  return (
    <section style={{ border: "1px solid rgba(0,212,255,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת מגדל השמירה</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה את גובה המגדל וזוויות ההשקפה כדי לראות מרחקים וחישובים.</p>

      {/* Sliders */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: "2rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>גובה המגדל h</span>
            <span style={{ color: "#64748b", fontWeight: 700 }}>{towerH} מ׳</span>
          </div>
          <input type="range" min={20} max={200} step={5} value={towerH} onChange={e => setTowerH(+e.target.value)} style={{ width: "100%", accentColor: "#64748b" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>זווית השקפה ל-A</span>
            <span style={{ color: "#EA580C", fontWeight: 700 }}>{depA}°</span>
          </div>
          <input type="range" min={10} max={80} step={1} value={depA} onChange={e => setDepA(+e.target.value)} style={{ width: "100%", accentColor: "#EA580C" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>זווית השקפה ל-B</span>
            <span style={{ color: "#3b82f6", fontWeight: 700 }}>{depB}°</span>
          </div>
          <input type="range" min={10} max={80} step={1} value={depB} onChange={e => setDepB(+e.target.value)} style={{ width: "100%", accentColor: "#3b82f6" }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(0,212,255,0.25)", background: "#fff", padding: "1rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(0,212,255,0.08)" }}>
        <svg viewBox="0 0 400 300" style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Ground */}
          <line x1={20} y1={groundY} x2={390} y2={groundY} stroke="#94a3b8" strokeWidth={1.5} />
          {/* Tower */}
          <rect x={towerX - 8} y={towerTopY} width={16} height={towerPxH} fill="#64748b" rx={2} />
          {/* Horizontal from top */}
          <line x1={towerX} y1={towerTopY} x2={380} y2={towerTopY} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />
          {/* Sight line to A */}
          <line x1={towerX} y1={towerTopY} x2={Math.min(pointAx, 385)} y2={groundY} stroke="#EA580C" strokeWidth={2} strokeDasharray="6,3" />
          {/* Sight line to B */}
          <line x1={towerX} y1={towerTopY} x2={Math.min(pointBx, 385)} y2={groundY} stroke="#3b82f6" strokeWidth={2} strokeDasharray="6,3" />
          {/* Depression angle arcs */}
          <path d={`M ${towerX + arcR},${towerTopY} A ${arcR},${arcR} 0 0,1 ${towerX + arcR * Math.cos(depARad)},${towerTopY + arcR * Math.sin(depARad)}`} fill="none" stroke="#EA580C" strokeWidth={2} />
          <path d={`M ${towerX + arcR * 0.7},${towerTopY} A ${arcR * 0.7},${arcR * 0.7} 0 0,1 ${towerX + arcR * 0.7 * Math.cos(depBRad)},${towerTopY + arcR * 0.7 * Math.sin(depBRad)}`} fill="none" stroke="#3b82f6" strokeWidth={2} />
          {/* Points */}
          <circle cx={Math.min(pointAx, 385)} cy={groundY} r={5} fill="#EA580C" stroke="#fff" strokeWidth={1.5} />
          <circle cx={Math.min(pointBx, 385)} cy={groundY} r={5} fill="#3b82f6" stroke="#fff" strokeWidth={1.5} />
          {/* Labels */}
          <text x={Math.min(pointAx, 385)} y={groundY + 18} fontSize={12} fill="#EA580C" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">A</text>
          <text x={Math.min(pointBx, 385)} y={groundY + 18} fontSize={12} fill="#3b82f6" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">B</text>
          <text x={towerX - 20} y={towerTopY - 6} fontSize={12} fill="#64748b" fontWeight={700} fontFamily="sans-serif">h</text>
        </svg>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "מרחק ל-A", val: distA.toFixed(1) + " מ׳", color: "#EA580C" },
          { label: "מרחק ל-B", val: distB.toFixed(1) + " מ׳", color: "#3b82f6" },
          { label: "מרחק A–B", val: distAB.toFixed(1) + " מ׳", color: "#f59e0b" },
          { label: "יתר ל-A", val: hypA.toFixed(1) + " מ׳", color: "#a78bfa" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,212,255,0.35)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Lab 3: TriangleLab (Advanced) ────────────────────────────────────────────

function TriangleLab() {
  const [angleA, setAngleA] = useState(60);
  const [sideAB, setSideAB] = useState(8);
  const [sideAC, setSideAC] = useState(6);

  const angleARad = (angleA * Math.PI) / 180;
  const h = sideAC * Math.sin(angleARad);
  const area = 0.5 * sideAB * h;
  const bcSq = sideAB * sideAB + sideAC * sideAC - 2 * sideAB * sideAC * Math.cos(angleARad);
  const bc = bcSq > 0 ? Math.sqrt(bcSq) : 0;

  let angleB = 0, angleC = 0;
  if (bc > 0.001) {
    const sinB = (sideAC * Math.sin(angleARad)) / bc;
    angleB = Math.asin(Math.min(1, Math.max(-1, sinB))) * 180 / Math.PI;
    angleC = 180 - angleA - angleB;
  }

  const scale = 18;
  const Ax = 60, Ay = 250;
  const Bx = Ax + sideAB * scale, By = 250;
  const Cx = Ax + sideAC * Math.cos(angleARad) * scale;
  const Cy = Ay - sideAC * Math.sin(angleARad) * scale;
  const Hx = Cx, Hy = Ay;

  const arcR = 25;
  const arcEndX = Ax + arcR * Math.cos(angleARad);
  const arcEndY = Ay - arcR * Math.sin(angleARad);
  const largeArc = angleA > 180 ? 1 : 0;

  return (
    <section style={{ border: "1px solid rgba(0,212,255,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת המשולש הכללי</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה זווית וצלעות כדי לראות גובה, שטח ו-BC לפי נוסחת הקוסינוסים.</p>

      {/* Sliders */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: "2rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>זווית A</span>
            <span style={{ color: "#00d4ff", fontWeight: 700 }}>{angleA}°</span>
          </div>
          <input type="range" min={10} max={170} step={1} value={angleA} onChange={e => setAngleA(+e.target.value)} style={{ width: "100%", accentColor: "#00d4ff" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>צלע AB</span>
            <span style={{ color: "#EA580C", fontWeight: 700 }}>{sideAB}</span>
          </div>
          <input type="range" min={2} max={12} step={0.5} value={sideAB} onChange={e => setSideAB(+e.target.value)} style={{ width: "100%", accentColor: "#EA580C" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>צלע AC</span>
            <span style={{ color: "#3b82f6", fontWeight: 700 }}>{sideAC}</span>
          </div>
          <input type="range" min={2} max={12} step={0.5} value={sideAC} onChange={e => setSideAC(+e.target.value)} style={{ width: "100%", accentColor: "#3b82f6" }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(0,212,255,0.25)", background: "#fff", padding: "1rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(0,212,255,0.08)" }}>
        <svg viewBox="0 0 400 300" style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Triangle */}
          <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`} fill="rgba(0,212,255,0.06)" stroke="#64748b" strokeWidth={2} strokeLinejoin="round" />
          {/* Height h from C to AB */}
          <line x1={Cx} y1={Cy} x2={Hx} y2={Hy} stroke="#a78bfa" strokeWidth={2} strokeDasharray="6,3" />
          {/* Right-angle mark at foot of height */}
          {Hx > Ax + 15 && Hx < Bx - 15 && (
            <polyline points={`${Hx - 10},${Hy} ${Hx - 10},${Hy - 10} ${Hx},${Hy - 10}`} fill="none" stroke="#a78bfa" strokeWidth={1.5} />
          )}
          {/* Angle arc at A */}
          {angleA > 5 && angleA < 175 && (
            <path d={`M ${Ax + arcR},${Ay} A ${arcR},${arcR} 0 ${largeArc},0 ${arcEndX},${arcEndY}`} fill="none" stroke="#00d4ff" strokeWidth={2} />
          )}
          {/* Vertex labels */}
          <text x={Ax - 14} y={Ay + 18} fontSize={14} fill="#64748b" fontWeight={700} fontFamily="sans-serif">A</text>
          <text x={Bx + 6} y={By + 18} fontSize={14} fill="#64748b" fontWeight={700} fontFamily="sans-serif">B</text>
          <text x={Cx - 4} y={Cy - 10} fontSize={14} fill="#64748b" fontWeight={700} fontFamily="sans-serif">C</text>
          {/* h label */}
          <text x={Cx - 22} y={(Cy + Hy) / 2} fontSize={12} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">h</text>
        </svg>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, textAlign: "center", marginBottom: 12 }}>
        {[
          { label: "גובה h", val: h.toFixed(2), color: "#a78bfa" },
          { label: "שטח", val: area.toFixed(2), color: "#16A34A" },
          { label: "BC", val: bc.toFixed(2), color: "#EA580C" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,212,255,0.35)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, textAlign: "center" }}>
        {[
          { label: "∠A", val: `${angleA.toFixed(1)}°`, color: "#00d4ff" },
          { label: "∠B", val: `${angleB.toFixed(1)}°`, color: "#f59e0b" },
          { label: "∠C", val: `${angleC.toFixed(1)}°`, color: "#DC2626" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,212,255,0.35)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrigBasicsPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
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
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>📐 טריגונומטריה — יסודות</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>סינוס, קוסינוס, טנגנס ויישומים במשולשים — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/topic/grade10/trig"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px",
              background: "#4A4A4A",
              border: "1px solid #333",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              color: "#FFFFFF",
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A";
            }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>

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

        {/* Lab — each level gets its own lab */}
        {selectedLevel === "basic" && <LadderLab />}
        {selectedLevel === "medium" && <TowerLab />}
        {selectedLevel === "advanced" && <TriangleLab />}

      </div>
    </main>
  );
}
