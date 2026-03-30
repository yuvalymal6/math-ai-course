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

  // Anti-copy: check if student copied from the problem text or step prompt
  function checkCopy(input: string): { isCopy: boolean } {
    // Whitelist: question/request words that should NOT count as copying
    const WHITELIST = new Set([
      "תסביר", "איך", "כיצד", "שלבים", "עזור", "תעזור", "תכווין", "הסבר",
      "תדריך", "תנחה", "למה", "מדוע", "מתי", "האם", "בבקשה", "תראה",
      "תלמד", "אותי", "נמצא", "נחשב", "נמצא", "שלי", "רוצה", "צריך",
    ]);

    const inputWords = input.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (inputWords.length < 5) return { isCopy: false };

    // Sources to compare against
    const sources = [problemText, step.prompt, step.label].filter(Boolean).join(" ");
    const sourceWords = sources.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (sourceWords.length === 0) return { isCopy: false };
    const sourceSet = new Set(sourceWords);

    // Filter out whitelisted words from matching
    const significantInputWords = inputWords.filter(w => !WHITELIST.has(w));
    if (significantInputWords.length < 3) return { isCopy: false };

    // Check consecutive data-words (not question words) from source
    let consecutiveMatches = 0, maxConsecutive = 0, matchCount = 0;
    for (const w of significantInputWords) {
      if (sourceSet.has(w)) {
        matchCount++;
        consecutiveMatches++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
      } else {
        consecutiveMatches = 0;
      }
    }

    // Has request verb at start? Reduce copy score
    const startsWithRequest = WHITELIST.has(inputWords[0]) || WHITELIST.has(inputWords[1] ?? "");
    const ratio = matchCount / significantInputWords.length;
    const effectiveRatio = startsWithRequest ? ratio * 0.6 : ratio;

    // Block only if >70% significant overlap or 5+ consecutive data-words
    return { isCopy: effectiveRatio > 0.7 || maxConsecutive >= 5 };
  }

  const validate = () => {
    if (text.trim().length < 20) {
      setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי — כתוב לפחות 20 תווים." });
      return;
    }
    // Anti-copy check
    const copyCheck = checkCopy(text);
    if (copyCheck.isCopy) {
      setResult({ score: 0, blocked: true, hint: "נראה שהעתקת את לשון השאלה. נסה לנסח במילים שלך מה בדיוק לא הבנת." });
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
        subjectWords={["מרחק", "אמצע", "קטע", "נקודה", "קואורדינטות", "ציר", "משולש", "אורך", "נוסחה", "שורש", "פיתגורס", "ישר", "שיפוע", "אנליטית", "גאומטריה", "אמצע קטע", "שיחזור נקודה", "ניצבות", "שטח מרובע", "חלוקה למשולשים", "מרובע", "אלכסון"]}
        subjectHint="גאומטריה אנליטית / אמצע קטע / ניצבות / שטח מרובע"
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
  // Minimalist: no grid, no ticks — just clean axes + triangle
  const pad = 40, w = 260, h = 220;
  const xMax = 10, yMax = 8;
  const toX = (v: number) => pad + (v / xMax) * (w - pad * 2);
  const toY = (v: number) => (h - pad) - (v / yMax) * (h - pad * 2);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Clean axes */}
      <line x1={pad} y1={toY(0)} x2={w - pad + 10} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={toX(0)} y1={h - pad + 10} x2={toX(0)} y2={pad - 10} stroke="#94a3b8" strokeWidth={1.2} />
      {/* Axis arrows */}
      <polygon points={`${w - pad + 10},${toY(0)} ${w - pad + 2},${toY(0) - 3} ${w - pad + 2},${toY(0) + 3}`} fill="#94a3b8" />
      <polygon points={`${toX(0)},${pad - 10} ${toX(0) - 3},${pad - 2} ${toX(0) + 3},${pad - 2}`} fill="#94a3b8" />
      {/* Axis labels */}
      <text x={w - pad + 14} y={toY(0) + 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">x</text>
      <text x={toX(0) + 6} y={pad - 12} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">y</text>

      {/* Triangle ABO — soft fill */}
      <polygon
        points={`${toX(8)},${toY(0)} ${toX(2)},${toY(6)} ${toX(0)},${toY(0)}`}
        fill="rgba(8,145,178,0.06)" stroke="#0891b2" strokeWidth={1.8} strokeLinejoin="round"
      />

      {/* Point C on AB — amber */}
      <circle cx={toX(5)} cy={toY(3)} r={4.5} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(5) + 8} y={toY(3) - 6} fontSize={11} fill="#f59e0b" fontWeight={600} fontFamily="sans-serif" fontStyle="italic">C(5,3)</text>

      {/* Point A — green, on x-axis */}
      <circle cx={toX(8)} cy={toY(0)} r={4.5} fill="#16A34A" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(8) - 6} y={toY(0) + 16} fontSize={11} fill="#16A34A" fontWeight={600} fontFamily="sans-serif" fontStyle="italic">A(8,0)</text>

      {/* Point B — no coordinates shown (student must find them) */}
      <circle cx={toX(2)} cy={toY(6)} r={4.5} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(2) + 8} y={toY(6) - 6} fontSize={11} fill="#DC2626" fontWeight={600} fontFamily="sans-serif" fontStyle="italic">B</text>

      {/* Point O — at origin */}
      <circle cx={toX(0)} cy={toY(0)} r={3.5} fill="#475569" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(0) - 14} y={toY(0) + 14} fontSize={11} fill="#6B7280" fontWeight={600} fontFamily="sans-serif" fontStyle="italic">O(0,0)</text>
    </svg>
  );
}

function MediumDiagram() {
  // Minimalist: clean axes only, no grid/ticks/numbers. A on y-axis, B at (10,6), C(6,8)
  const pad = 40, w = 260, h = 240;
  const xMin = -2, xMax = 12, yMin = -6, yMax = 10;
  const xRange = xMax - xMin, yRange = yMax - yMin;
  const toX = (v: number) => pad + ((v - xMin) / xRange) * (w - pad * 2);
  const toY = (v: number) => (h - pad) - ((v - yMin) / yRange) * (h - pad * 2);

  // Right-angle mark at C — directions toward A and B
  const sz = 10;
  const caDx = 0 - 6, caDy = -4 - 8, caLen = Math.sqrt(caDx * caDx + caDy * caDy);
  const caUx = caDx / caLen, caUy = caDy / caLen;
  const cbDx = 10 - 6, cbDy = 6 - 8, cbLen = Math.sqrt(cbDx * cbDx + cbDy * cbDy);
  const cbUx = cbDx / cbLen, cbUy = cbDy / cbLen;
  // Scale factor for SVG coordinates
  const sxU = (w - pad * 2) / xRange, syU = (h - pad * 2) / yRange;
  const ra1 = { x: toX(6) + sz * caUx * sxU / 10, y: toY(8) + sz * caUy * syU / 10 };
  const ra2 = { x: toX(6) + sz * (caUx + cbUx) * sxU / 10, y: toY(8) + sz * (caUy + cbUy) * syU / 10 };
  const ra3 = { x: toX(6) + sz * cbUx * sxU / 10, y: toY(8) + sz * cbUy * syU / 10 };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Clean axes — no ticks, no numbers */}
      <line x1={pad - 5} y1={toY(0)} x2={w - pad + 10} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={toX(0)} y1={h - pad + 5} x2={toX(0)} y2={pad - 10} stroke="#94a3b8" strokeWidth={1.2} />
      {/* Arrows */}
      <polygon points={`${w - pad + 10},${toY(0)} ${w - pad + 2},${toY(0) - 3} ${w - pad + 2},${toY(0) + 3}`} fill="#94a3b8" />
      <polygon points={`${toX(0)},${pad - 10} ${toX(0) - 3},${pad - 2} ${toX(0) + 3},${pad - 2}`} fill="#94a3b8" />
      <text x={w - pad + 14} y={toY(0) + 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">x</text>
      <text x={toX(0) + 6} y={pad - 12} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">y</text>

      {/* Triangle ABC — soft fill */}
      <polygon
        points={`${toX(0)},${toY(-4)} ${toX(10)},${toY(6)} ${toX(6)},${toY(8)}`}
        fill="rgba(8,145,178,0.06)" stroke="#0891b2" strokeWidth={1.8} strokeLinejoin="round"
      />

      {/* Right-angle mark at C */}
      <polyline points={`${ra1.x},${ra1.y} ${ra2.x},${ra2.y} ${ra3.x},${ra3.y}`} fill="none" stroke="#0891b2" strokeWidth={1.5} />

      {/* Point C — teal, with coordinates */}
      <circle cx={toX(6)} cy={toY(8)} r={4.5} fill="#0891b2" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(6) + 8} y={toY(8) - 6} fontSize={11} fill="#0891b2" fontWeight={600} fontFamily="sans-serif" fontStyle="italic">C(6,8)</text>

      {/* Point A — green, on y-axis, no coordinates */}
      <circle cx={toX(0)} cy={toY(-4)} r={4.5} fill="#16A34A" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(0) - 14} y={toY(-4) + 4} fontSize={11} fill="#16A34A" fontWeight={600} fontFamily="sans-serif" fontStyle="italic">A</text>

      {/* Point B — red, no coordinates */}
      <circle cx={toX(10)} cy={toY(6)} r={4.5} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(10) + 6} y={toY(6) - 6} fontSize={11} fill="#DC2626" fontWeight={600} fontFamily="sans-serif" fontStyle="italic">B</text>
    </svg>
  );
}

function AdvancedDiagram() {
  // A(0,0), B(4,8), C(6,2), D(10,0), E(2,4) midpoint of AB
  // 25px per unit, width must fit x=0..10 → need 12 units wide
  const unit = 25, pad = 35;
  const w = pad * 2 + 12 * unit, h = pad * 2 + 10 * unit;
  const toX = (v: number) => pad + v * unit;
  const toY = (v: number) => h - pad - v * unit;

  // Right-angle mark at C(6,2) between CA and CB
  const raPx = 11;
  const cSx = toX(6), cSy = toY(2);
  const caRx = toX(0) - cSx, caRy = toY(0) - cSy, caRL = Math.sqrt(caRx * caRx + caRy * caRy) || 1;
  const cbRx = toX(4) - cSx, cbRy = toY(8) - cSy, cbRL = Math.sqrt(cbRx * cbRx + cbRy * cbRy) || 1;
  const rr1 = { x: cSx + raPx * caRx / caRL, y: cSy + raPx * caRy / caRL };
  const rr2 = { x: cSx + raPx * (caRx / caRL + cbRx / cbRL), y: cSy + raPx * (caRy / caRL + cbRy / cbRL) };
  const rr3 = { x: cSx + raPx * cbRx / cbRL, y: cSy + raPx * cbRy / cbRL };

  // Tick mark helper for equal segments
  function tickMark(x1: number, y1: number, x2: number, y2: number) {
    const mx = (toX(x1) + toX(x2)) / 2, my = (toY(y1) + toY(y2)) / 2;
    const ddx = toX(x2) - toX(x1), ddy = toY(y2) - toY(y1);
    const len = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
    const px = -ddy / len * 5, py = ddx / len * 5;
    return <line x1={mx - px} y1={my - py} x2={mx + px} y2={my + py} stroke="#f59e0b" strokeWidth={2} />;
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-md mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={pad - 5} y1={toY(0)} x2={w - pad + 10} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={toX(0)} y1={h - pad + 5} x2={toX(0)} y2={pad - 10} stroke="#94a3b8" strokeWidth={1.2} />
      <polygon points={`${w - pad + 10},${toY(0)} ${w - pad + 2},${toY(0) - 3} ${w - pad + 2},${toY(0) + 3}`} fill="#94a3b8" />
      <polygon points={`${toX(0)},${pad - 10} ${toX(0) - 3},${pad - 2} ${toX(0) + 3},${pad - 2}`} fill="#94a3b8" />
      <text x={w - pad + 14} y={toY(0) + 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">x</text>
      <text x={toX(0) + 6} y={pad - 12} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">y</text>

      {/* Quadrilateral ABCD — outline */}
      <polygon
        points={`${toX(0)},${toY(0)} ${toX(4)},${toY(8)} ${toX(6)},${toY(2)} ${toX(10)},${toY(0)}`}
        fill="rgba(8,145,178,0.06)" stroke="#0891b2" strokeWidth={2} strokeLinejoin="round"
      />

      {/* Segment AB — dashed */}
      <line x1={toX(0)} y1={toY(0)} x2={toX(4)} y2={toY(8)} stroke="#475569" strokeWidth={1.3} strokeDasharray="5,3" />
      {/* Segment AC — dashed */}
      <line x1={toX(0)} y1={toY(0)} x2={toX(6)} y2={toY(2)} stroke="#475569" strokeWidth={1.3} strokeDasharray="5,3" />
      {/* Segment BC — solid (ניצב) */}
      <line x1={toX(4)} y1={toY(8)} x2={toX(6)} y2={toY(2)} stroke="#0891b2" strokeWidth={2} />

      {/* Tick marks on AE and EB — equal segments */}
      {tickMark(0, 0, 2, 4)}
      {tickMark(2, 4, 4, 8)}

      {/* Right-angle mark at C(6,2) */}
      <polyline points={`${rr1.x},${rr1.y} ${rr2.x},${rr2.y} ${rr3.x},${rr3.y}`} fill="none" stroke="#0891b2" strokeWidth={1.5} />

      {/* Point A — green, at origin */}
      <circle cx={toX(0)} cy={toY(0)} r={6} fill="#16A34A" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(0) - 4} y={toY(0) + 18} fontSize={11} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">A(0,0)</text>

      {/* Point B — red */}
      <circle cx={toX(4)} cy={toY(8)} r={6} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(4) + 8} y={toY(8) - 6} fontSize={11} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">B</text>

      {/* Point C — teal */}
      <circle cx={toX(6)} cy={toY(2)} r={6} fill="#0891b2" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(6) + 8} y={toY(2) + 14} fontSize={11} fill="#0891b2" fontWeight={700} fontFamily="sans-serif">C(6,2)</text>

      {/* Point D — purple, on x-axis */}
      <circle cx={toX(10)} cy={toY(0)} r={6} fill="#9333ea" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(10) - 4} y={toY(0) + 18} fontSize={11} fill="#9333ea" fontWeight={700} fontFamily="sans-serif">D(10,0)</text>

      {/* Point E — amber, midpoint of AB */}
      <circle cx={toX(2)} cy={toY(4)} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(2) + 8} y={toY(4) - 6} fontSize={10} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">E(2,4)</text>
    </svg>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "אמצע קטע ומשולש ABO",
    problem: "נתונות הנקודות A(8, 0) ו-C(5, 3).\nידוע כי הנקודה C היא אמצע הקטע AB.\n\nא. מצא את נקודה B.\nב. חשב את אורך הקטע AC ואת אורך הקטע AB.\nג. הנקודה O היא ראשית הצירים (0,0). חשב את שטח המשולש ABO.",
    diagram: <BasicDiagram />,
    pitfalls: [
      { title: "⚠️ שימו לב להצבה בסדר הנכון", text: "הפעם, נתון אמצע הקטע. שימו לב לזה כשתגיעו לנוסחה." },
      { title: "🔦 איך נחשב את הגובה במערכת צירים?", text: "שימו לב שאם נוריד מ-B גובה, הוא יהיה מאונך לציר X. איך זה ישפיע על מציאת הגובה?" },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י' ומצרף/ת שאלה בגאומטריה אנליטית על אמצע קטע ושטח משולש. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.\n\nאל תפתור עבורי — שאל אותי שאלות מכווינות.\nסרוק את הנתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "מציאת שיעורי נקודה B", coaching: "", prompt: "עזור לי למצוא את שיעורי הנקודה B.", keywords: [], keywordHint: "", contextWords: ["אמצע", "נוסחה", "xB", "yB", "כפול", "חיסור", "הצבה", "2", "ציר"] },
      { phase: "סעיף ב׳", label: "חישוב אורכי AC ו-AB", coaching: "", prompt: "תסביר לי כיצד נמצא את האורכים AC, AB.", keywords: [], keywordHint: "", contextWords: ["מרחק", "שורש", "ריבוע", "הפרש", "אורך", "כפול", "אמצע", "18"] },
      { phase: "סעיף ג׳", label: "שטח משולש ABO", coaching: "", prompt: "O ראשית הצירים, כיצד נחשב את שטח המשולש ABO?", keywords: [], keywordHint: "", contextWords: ["שטח", "משולש", "בסיס", "גובה", "ציר", "חצי", "נעל", "24"] },
    ],
  },
  {
    id: "medium",
    title: "משולש ישר-זווית ב-C",
    problem: "הנקודה C(6, 8) היא קדקוד הזווית הישרה במשולש ABC.\nמשוואת הניצב AC היא: y = 2x − 4.\nהניצב BC מאונך ל-AC ועובר דרך C.\n\nא. מצא את משוואת הישר עליו מונח הניצב BC.\nב. ידוע כי הקדקוד A נמצא על ציר ה-y, ושיעור ה-y של הקדקוד B הוא 6. מצא את שיעורי הנקודות A ו-B.\nג. חשב את אורך הניצבים AC ו-BC, ומצא את שטח המשולש ABC.",
    diagram: <MediumDiagram />,
    pitfalls: [
      { title: "⚠️ זיהוי הניצבים", text: "וודאו שאתם מחשבים את המרחק מנקודת המפגש C לכל קדקוד. אל תשתמשו ביתר AB לחישוב השטח!" },
    ],
    goldenPrompt: `אני בכיתה י', מצרף לך תרגיל בגאומטריה אנליטית על משולש ישר-זווית, משוואות ישרים וניצבות.\n\nאל תיתן לי את הפתרון — שאל אותי שאלות מנחות על שיפועים, ניצבות ומשוואת ישר.\nסרוק את הנתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "משוואת הישר BC", coaching: "", prompt: "ידוע ש-BC מאונך ל-AC ועובר דרך C(6,8). תסביר לי כיצד אמצא את משוואת BC.", keywords: [], keywordHint: "", contextWords: ["מאונך", "שיפוע", "ניצב", "-1", "הופכי", "נגדי", "הצבה", "C"] },
      { phase: "סעיף ב׳", label: "מציאת שיעורי A ו-B", coaching: "", prompt: "A נמצאת על ציר y, ושיעור ה-y של B הוא 6. עזור לי למצוא את שיעורי שתי הנקודות.", keywords: [], keywordHint: "", contextWords: ["ציר", "y", "x=0", "הצבה", "משוואה", "A", "B", "6"] },
      { phase: "סעיף ג׳", label: "אורכי ניצבים ושטח", coaching: "", prompt: "תעזור לי לחשב את AC, BC ואת שטח המשולש ABC. שים לב שזה משולש ישר-זווית.", keywords: [], keywordHint: "", contextWords: ["מרחק", "ניצב", "שטח", "חצי", "מכפלה", "ישר-זווית"] },
    ],
  },
  {
    id: "advanced",
    title: "מרובע ABCD עם אמצע קטע",
    problem: "במערכת צירים נתונות הנקודות A(0, 0), C(6, 2) ו-D(10, 0).\nהנקודה E(2, 4) היא אמצע הקטע AB.\nהמרובע ABCD נוצר מחיבור הנקודות.\n\nא. מצא את שיעורי הנקודה B.\nב. הוכח כי AC מאונך ל-BC.\nג. חשב את שטח △ACD.\nד. חשב את שטח המרובע ABCD.",
    diagram: <AdvancedDiagram />,
    pitfalls: [
      { title: "⚠️ זהירות: משולש △ACD הוא לא משולש ישר זווית!", text: "כדי לחשב את שטחו, עליך למצוא את אורך הבסיס AD (שנמצא על ציר ה-X) ואת הגובה שיורד אליו מהנקודה C. בדוק מהו ערך ה-y של נקודה C." },
      { title: "💡 רמז לביצוע: חישוב שטח ABCD", text: "שים לב — ABCD הוא מרובע לא מוגדר. כדי לחשב את שטחו נחשב את סכום שטחי המשולשים." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד משחזרים נקודה מאמצע קטע? איך מוכיחים ניצבות באמצעות שיפועים? כיצד מחשבים שטח מרובע על ידי חלוקה למשולשים? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "מציאת שיעורי B", coaching: "", prompt: "E(2, 4) היא אמצע AB ו-A(0, 0). עזור לי למצוא את B.", keywords: [], keywordHint: "", contextWords: ["אמצע", "נוסחה", "xB", "yB", "כפול", "חיסור", "הצבה", "2"] },
      { phase: "סעיף ב׳", label: "הוכחת ניצבות AC⊥BC", coaching: "", prompt: "כיצד אוכיח ש-AC מאונך ל-BC? מה הכלי המתאים?", keywords: [], keywordHint: "", contextWords: ["שיפוע", "מכפלה", "−1", "מאונך", "ניצב", "הוכחה"] },
      { phase: "סעיף ג׳", label: "שטח △ACD", coaching: "", prompt: "כיצד אחשב את שטח המשולש ACD?", keywords: [], keywordHint: "", contextWords: ["שטח", "משולש", "בסיס", "גובה", "חצי", "מכפלה", "נעל"] },
      { phase: "סעיף ד׳", label: "שטח מרובע ABCD", coaching: "", prompt: "כיצד אחשב את שטח המרובע ABCD? תכווין אותי לחלוקה למשולשים.", keywords: [], keywordHint: "", contextWords: ["שטח", "מרובע", "משולש", "חלוקה", "אלכסון", "שרוך", "נעל", "סכום"] },
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
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 12, padding: 6, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Formula bar — distance & midpoint (KaTeX) */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(8,145,178,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.25rem 1.5rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(8,145,178,0.12)" }}>
        <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>

        {/* Context: point definitions */}
        <div style={{ borderRadius: 10, background: "rgba(8,145,178,0.05)", border: "1px solid rgba(8,145,178,0.15)", padding: "10px 14px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ color: "#2D3436", fontSize: 13, lineHeight: 1.8 }}>
            נקודות קצה: <Tex>{String.raw`A(x_1,\, y_1)`}</Tex> ו-<Tex>{String.raw`B(x_2,\, y_2)`}</Tex>
            &nbsp;&nbsp;·&nbsp;&nbsp;
            נקודת אמצע: <Tex>{String.raw`M(x_M,\, y_M)`}</Tex>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
          {/* Distance formula */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", width: "100%" }}>
            <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>📏 מרחק בין <Tex>{"A"}</Tex> ו-<Tex>{"B"}</Tex></div>
            <div style={{ color: "#0891b2" }}><TexBlock>{String.raw`d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}`}</TexBlock></div>
          </div>
          <div style={{ width: "80%", height: 1, background: "rgba(60,54,42,0.08)" }} />
          {/* Midpoint formula */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", width: "100%" }}>
            <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>📍 אמצע הקטע <Tex>{"AB"}</Tex></div>
            <div style={{ color: "#0891b2" }}><TexBlock>{String.raw`x_M = \frac{x_1 + x_2}{2} \qquad y_M = \frac{y_1 + y_2}{2}`}</TexBlock></div>
          </div>
          <div style={{ width: "80%", height: 1, background: "rgba(60,54,42,0.08)" }} />
          {/* Slope formula */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", width: "100%" }}>
            <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>📐 שיפוע הישר דרך <Tex>{"A"}</Tex> ו-<Tex>{"B"}</Tex></div>
            <div style={{ color: "#0891b2" }}><TexBlock>{String.raw`m = \frac{y_2 - y_1}{x_2 - x_1}`}</TexBlock></div>
          </div>
          <div style={{ width: "80%", height: 1, background: "rgba(60,54,42,0.08)" }} />
          {/* Perpendicular lines */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", width: "100%" }}>
            <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>⊥ ישרים מאונכים (<Tex>{String.raw`L_1 \perp L_2`}</Tex>)</div>
            <div style={{ color: "#0891b2" }}><TexBlock>{String.raw`m_1 \cdot m_2 = -1`}</TexBlock></div>
            <div style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>שיפועים של ישרים מאונכים הם הופכיים ונגדיים זה לזה</div>
          </div>
        </div>
      </div>

      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: "2rem" }} />

      {/* Diagram — only if present */}
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
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: 6, boxShadow: s.glowShadow }}>
        <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
        {ex.id === "basic"    && <LadderBase     steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} problemText={ex.problem} />}
        {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
      </div>

    </section>
  );
}

// ─── DistanceLab — for basic level: distance, midpoint, slope ─────────────────

function DistanceLab() {
  // Triangle ABO: A on x-axis, B computed from C=midpoint(AB), O at origin
  // Default: A(8,0), C(5,3) midpoint → B(2,6), O(0,0)
  const [axVal, setAxVal] = useState(8);
  const cxMid = 5, cyMid = 3; // C is fixed midpoint of AB
  const bx = 2 * cxMid - axVal, by = 2 * cyMid - 0; // B = 2C - A (A.y=0)
  const ox = 0, oy = 0;

  const distAC = Math.sqrt((cxMid - axVal) ** 2 + (cyMid - 0) ** 2);
  const distAB = Math.sqrt((bx - axVal) ** 2 + (by - 0) ** 2);
  const areaABO = Math.abs(axVal * by - bx * 0) / 2; // shoelace with O at origin

  const originX = 30, originY = 240, sc = 25;
  const toX = (v: number) => originX + v * sc;
  const toY = (v: number) => originY - v * sc;

  return (
    <section style={{ border: "1px solid rgba(8,145,178,0.35)", borderRadius: 12, padding: 6, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת משולש ABO</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>הזז את A על ציר x. הנקודה B מחושבת כך ש-C(5,3) נשארת אמצע AB.</p>

      {/* Slider for A */}
      <div style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
          <span>מיקום A על ציר x</span>
          <span style={{ color: "#16A34A", fontWeight: 700 }}>A({axVal}, 0)</span>
        </div>
        <input type="range" min={1} max={10} step={0.5} value={axVal} onChange={e => setAxVal(+e.target.value)} style={{ width: "100%", accentColor: "#16A34A" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginTop: 8 }}>
          <span>B מחושבת: <span style={{ color: "#DC2626", fontWeight: 700 }}>B({bx}, {by})</span></span>
          <span>C אמצע AB: <span style={{ color: "#f59e0b", fontWeight: 700 }}>C(5, 3)</span></span>
        </div>
      </div>

      {/* SVG — triangle ABO */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(8,145,178,0.25)", background: "#fff", padding: "1rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(8,145,178,0.08)" }}>
        <svg viewBox="0 0 320 260" style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Axes */}
          <line x1={toX(-0.5)} y1={toY(0)} x2={toX(11)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={toX(0)} y1={toY(-0.5)} x2={toX(0)} y2={toY(8)} stroke="#94a3b8" strokeWidth={1.2} />
          <polygon points={`${toX(11)},${toY(0)} ${toX(11) - 5},${toY(0) - 3} ${toX(11) - 5},${toY(0) + 3}`} fill="#94a3b8" />
          <polygon points={`${toX(0)},${toY(8)} ${toX(0) - 3},${toY(8) + 5} ${toX(0) + 3},${toY(8) + 5}`} fill="#94a3b8" />
          <text x={toX(11) + 6} y={toY(0) + 4} fontSize={12} fill="#94a3b8" fontStyle="italic" fontFamily="serif">x</text>
          <text x={toX(0) + 6} y={toY(8) - 2} fontSize={12} fill="#94a3b8" fontStyle="italic" fontFamily="serif">y</text>

          {/* Triangle ABO */}
          <polygon
            points={`${toX(axVal)},${toY(0)} ${toX(bx)},${toY(by)} ${toX(ox)},${toY(oy)}`}
            fill="rgba(8,145,178,0.06)" stroke="#0891b2" strokeWidth={2} strokeLinejoin="round"
          />

          {/* Segment AB dashed — with C midpoint */}
          <line x1={toX(axVal)} y1={toY(0)} x2={toX(bx)} y2={toY(by)} stroke="#475569" strokeWidth={1.3} strokeDasharray="5,3" />

          {/* C — amber midpoint */}
          <circle cx={toX(cxMid)} cy={toY(cyMid)} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} />
          <text x={toX(cxMid) + 8} y={toY(cyMid) - 6} fontSize={10} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">C(5,3)</text>

          {/* O — origin */}
          <circle cx={toX(0)} cy={toY(0)} r={5} fill="#475569" stroke="#fff" strokeWidth={1.5} />
          <text x={toX(0) - 16} y={toY(0) + 14} fontSize={11} fill="#475569" fontWeight={700} fontFamily="sans-serif">O</text>

          {/* A — green on x-axis */}
          <circle cx={toX(axVal)} cy={toY(0)} r={6} fill="#16A34A" stroke="#fff" strokeWidth={1.5} />
          <text x={toX(axVal) - 4} y={toY(0) + 18} fontSize={11} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">A</text>

          {/* B — red */}
          <circle cx={toX(bx)} cy={toY(by)} r={6} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />
          <text x={toX(bx) + 8} y={toY(by) - 6} fontSize={11} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">B</text>
        </svg>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "AC", val: distAC.toFixed(2), color: "#0891b2" },
          { label: "AB", val: distAB.toFixed(2), color: "#0891b2" },
          { label: "AB = 2·AC?", val: Math.abs(distAB - 2 * distAC) < 0.01 ? "✅ כן" : "❌ לא", color: Math.abs(distAB - 2 * distAC) < 0.01 ? "#16A34A" : "#DC2626" },
          { label: "שטח △ABO", val: areaABO.toFixed(1), color: "#f59e0b" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(8,145,178,0.35)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── AnalyticTriangleLab — right triangle C(6,8), AC: y=2x-4, BC⊥AC ─────────

function AnalyticTriangleLab() {
  // A moves along y=2x-4 (slider controls xA)
  // B moves along BC: y=-0.5x+11 (slider controls xB)
  // C is fixed at (6,8)
  const [xA, setXA] = useState(0);
  const [xB, setXB] = useState(10);
  const yA = 2 * xA - 4;  // A on line AC
  const yB = -0.5 * xB + 11; // B on line BC
  const cx = 6, cy = 8; // C fixed

  // Distances
  const distAC = Math.sqrt((cx - xA) ** 2 + (cy - yA) ** 2);
  const distBC = Math.sqrt((cx - xB) ** 2 + (cy - yB) ** 2);
  const distAB = Math.sqrt((xB - xA) ** 2 + (yB - yA) ** 2);

  // SVG setup — range to fit all points
  const pad = 40, gridSize = 240;
  const gMin = -2, gMax = 12, gRange = gMax - gMin;
  const sc = gridSize / gRange;
  const toX = (v: number) => pad + (v - gMin) * sc;
  const toY = (v: number) => pad + gridSize - (v - gMin) * sc;
  const svgW = gridSize + pad * 2, svgH = gridSize + pad * 2;

  // Grid lines
  const gridLines: React.ReactNode[] = [];
  for (let i = Math.ceil(gMin); i <= Math.floor(gMax); i++) {
    gridLines.push(
      <line key={`v${i}`} x1={toX(i)} y1={pad} x2={toX(i)} y2={pad + gridSize} stroke="rgba(60,54,42,0.06)" strokeWidth={1} />,
      <line key={`h${i}`} x1={pad} y1={toY(i)} x2={pad + gridSize} y2={toY(i)} stroke="rgba(60,54,42,0.06)" strokeWidth={1} />,
    );
  }

  // Right-angle square mark at C — fixed pixel size, rotates with line directions
  const raPx = 12; // pixel size of the square mark
  // Unit vectors in SVG pixel space from C toward A and toward B
  const caSvxRaw = toX(xA) - toX(cx), caSvyRaw = toY(yA) - toY(cy);
  const caSvLen = Math.sqrt(caSvxRaw * caSvxRaw + caSvyRaw * caSvyRaw) || 1;
  const caSvx = caSvxRaw / caSvLen, caSvy = caSvyRaw / caSvLen;
  const cbSvxRaw = toX(xB) - toX(cx), cbSvyRaw = toY(yB) - toY(cy);
  const cbSvLen = Math.sqrt(cbSvxRaw * cbSvxRaw + cbSvyRaw * cbSvyRaw) || 1;
  const cbSvx = cbSvxRaw / cbSvLen, cbSvy = cbSvyRaw / cbSvLen;
  const cSvx = toX(cx), cSvy = toY(cy);
  const ra1 = { x: cSvx + raPx * caSvx, y: cSvy + raPx * caSvy };
  const ra2 = { x: cSvx + raPx * (caSvx + cbSvx), y: cSvy + raPx * (caSvy + cbSvy) };
  const ra3 = { x: cSvx + raPx * cbSvx, y: cSvy + raPx * cbSvy };

  // Area of right triangle = AC * BC / 2
  const area = (distAC * distBC) / 2;

  return (
    <section style={{ border: "1px solid rgba(8,145,178,0.35)", borderRadius: 12, padding: 6, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת משולש ישר-זווית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>הזז את A על הישר AC ואת B על הישר BC. הזווית ב-C תמיד 90°.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem 2rem", marginBottom: "2rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: "#16A34A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(22,163,74,0.3)", paddingBottom: 6 }}>נקודה A על הישר y = 2x − 4</div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>מיקום A</span>
              <span style={{ color: "#16A34A", fontWeight: 700 }}>({xA}, {yA})</span>
            </div>
            <input type="range" min={-2} max={6} step={0.5} value={xA} onChange={e => setXA(+e.target.value)} style={{ width: "100%", accentColor: "#16A34A" }} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(220,38,38,0.3)", paddingBottom: 6 }}>נקודה B על הישר y = −0.5x + 11</div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>מיקום B</span>
              <span style={{ color: "#DC2626", fontWeight: 700 }}>({xB}, {yB})</span>
            </div>
            <input type="range" min={6} max={12} step={0.5} value={xB} onChange={e => setXB(+e.target.value)} style={{ width: "100%", accentColor: "#DC2626" }} />
          </div>
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(8,145,178,0.25)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(8,145,178,0.08)", overflow: "hidden" }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" style={{ overflow: "hidden" }} aria-hidden>
          {gridLines}
          {/* Axes */}
          <line x1={toX(gMin)} y1={toY(0)} x2={toX(gMax)} y2={toY(0)} stroke="rgba(60,54,42,0.2)" strokeWidth={1.5} />
          <line x1={toX(0)} y1={toY(gMin)} x2={toX(0)} y2={toY(gMax)} stroke="rgba(60,54,42,0.2)" strokeWidth={1.5} />
          <text x={toX(gMax) - 4} y={toY(0) + 14} fontSize={10} fill="#94a3b8" fontStyle="italic" fontFamily="serif">x</text>
          <text x={toX(0) + 8} y={toY(gMax) + 4} fontSize={10} fill="#94a3b8" fontStyle="italic" fontFamily="serif">y</text>

          {/* Triangle ABC — filled */}
          <polygon
            points={`${toX(xA)},${toY(yA)} ${toX(xB)},${toY(yB)} ${toX(cx)},${toY(cy)}`}
            fill="rgba(8,145,178,0.06)" stroke="#0891b2" strokeWidth={2} strokeLinejoin="round"
          />

          {/* Right-angle mark at C */}
          <polyline points={`${ra1.x},${ra1.y} ${ra2.x},${ra2.y} ${ra3.x},${ra3.y}`} fill="none" stroke="#0891b2" strokeWidth={1.5} />

          {/* Point C — teal, fixed */}
          <circle cx={toX(cx)} cy={toY(cy)} r={5} fill="#0891b2" stroke="#fff" strokeWidth={1.5} />
          <text x={toX(cx) + 8} y={toY(cy) - 8} fontSize={11} fill="#0891b2" fontWeight={700} fontFamily="sans-serif">C(6,8)</text>
          {/* Point A — green */}
          <circle cx={toX(xA)} cy={toY(yA)} r={5} fill="#16A34A" stroke="#fff" strokeWidth={1.5} />
          <text x={toX(xA) - 12} y={toY(yA) + 14} fontSize={11} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">A</text>
          {/* Point B — red */}
          <circle cx={toX(xB)} cy={toY(yB)} r={5} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />
          <text x={toX(xB) + 8} y={toY(yB) - 8} fontSize={11} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">B</text>
        </svg>
      </div>

      {/* Stats tiles with KaTeX */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10, textAlign: "center", marginBottom: "1.5rem" }}>
        {[
          { label: "A", val: `(${xA},${yA})`, color: "#16A34A" },
          { label: "B", val: `(${xB},${yB})`, color: "#DC2626" },
          { label: "AC", val: distAC.toFixed(2), color: "#0891b2" },
          { label: "BC", val: distBC.toFixed(2), color: "#0891b2" },
          { label: "שטח △ABC", val: area.toFixed(2), color: "#a78bfa" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(8,145,178,0.35)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>

      {/* Live equations */}
      <div style={{ borderRadius: 12, background: "rgba(8,145,178,0.06)", border: "1px solid rgba(8,145,178,0.2)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>משוואות הישרים</div>
        <div style={{ color: "#16A34A" }}><Tex>{String.raw`AC:\; y = 2x - 4 \quad (m = 2)`}</Tex></div>
        <div style={{ color: "#DC2626" }}><Tex>{String.raw`BC:\; y = -\tfrac{1}{2}x + 11 \quad (m = -\tfrac{1}{2})`}</Tex></div>
        <div style={{ width: "60%", height: 1, background: "rgba(60,54,42,0.06)" }} />
        <div style={{ color: "#0891b2" }}><Tex>{String.raw`m_{AC} \cdot m_{BC} = 2 \cdot (-\tfrac{1}{2}) = -1 \;\Rightarrow\; \angle C = 90°`}</Tex></div>
      </div>
    </section>
  );
}

// ─── QuadrilateralLab — ABCD with movable D, B auto-updates via midpoint E ───

function QuadrilateralLab() {
  const [axVal, setAxVal] = useState(0);
  const [ayVal, setAyVal] = useState(0);
  // Fixed: C(6,2), D(10,0), E(2,4) midpoint of AB
  const cxp = 6, cyp = 2, dxp = 10, dyp = 0;
  const exx = 2, eyy = 4;
  const ax = axVal, ay = ayVal;
  // B = 2E - A
  const bxVal = 2 * exx - ax; // 4 - ax
  const by = 2 * eyy - ay;    // 8 - ay

  // Areas
  const triArea = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) =>
    Math.abs((x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) / 2);
  const areaABC = triArea(ax, ay, bxVal, by, cxp, cyp);
  const areaACD = triArea(ax, ay, cxp, cyp, dxp, dyp);
  const totalArea = areaABC + areaACD;

  // Slopes from C to A and C to B → check perpendicularity at C
  const dxCA = ax - cxp, dyCA = ay - cyp;
  const dxCB = bxVal - cxp, dyCB = by - cyp;
  const mCA = dxCA === 0 ? null : dyCA / dxCA;
  const mCB = dxCB === 0 ? null : dyCB / dxCB;
  const mCAstr = mCA === null ? "∞" : mCA % 1 === 0 ? `${mCA}` : mCA.toFixed(2);
  const mCBstr = mCB === null ? "∞" : mCB % 1 === 0 ? `${mCB}` : mCB.toFixed(2);
  const isPerpAtC = mCA !== null && mCB !== null && Math.abs(mCA * mCB + 1) < 0.02;
  const productStr = mCA !== null && mCB !== null ? (mCA * mCB).toFixed(2) : "—";

  // SVG: 30px per unit
  const originX = 40, originY = 310, sc = 30;
  const toX = (v: number) => originX + v * sc;
  const toY = (v: number) => originY - v * sc;

  // Right-angle mark at C (when AC ⊥ BC)
  const raSz = 10;
  const cSx = toX(cxp), cSy = toY(cyp);
  const caRx = toX(ax) - cSx, caRy = toY(ay) - cSy, caRL = Math.sqrt(caRx * caRx + caRy * caRy) || 1;
  const cbRx = toX(bxVal) - cSx, cbRy = toY(by) - cSy, cbRL = Math.sqrt(cbRx * cbRx + cbRy * cbRy) || 1;
  const ra1 = { x: cSx + raSz * caRx / caRL, y: cSy + raSz * caRy / caRL };
  const ra2 = { x: cSx + raSz * (caRx / caRL + cbRx / cbRL), y: cSy + raSz * (caRy / caRL + cbRy / cbRL) };
  const ra3 = { x: cSx + raSz * cbRx / cbRL, y: cSy + raSz * cbRy / cbRL };

  return (
    <section style={{ border: "1px solid rgba(8,145,178,0.35)", borderRadius: 12, padding: 6, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת מרובע ABCD</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>הזז את A וראה מתי AC ⊥ BC בנקודה C. E נשארת תמיד אמצע AB.</p>

      {/* Sliders for A + computed B */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem 2rem", marginBottom: "2rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: "#16A34A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(22,163,74,0.3)", paddingBottom: 6 }}>שליטה במיקום נקודה A</div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>x של A</span>
              <span style={{ color: "#16A34A", fontWeight: 700 }}>{ax}</span>
            </div>
            <input type="range" min={-5} max={5} step={0.5} value={axVal} onChange={e => setAxVal(+e.target.value)} style={{ width: "100%", accentColor: "#16A34A" }} />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>y של A</span>
              <span style={{ color: "#16A34A", fontWeight: 700 }}>{ay}</span>
            </div>
            <input type="range" min={-5} max={5} step={0.5} value={ayVal} onChange={e => setAyVal(+e.target.value)} style={{ width: "100%", accentColor: "#16A34A" }} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(220,38,38,0.3)", paddingBottom: 6 }}>נקודה B (מחושבת אוטומטית)</div>
          <div style={{ borderRadius: 12, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", padding: "12px 16px", textAlign: "center" }}>
            <span style={{ color: "#DC2626", fontFamily: "monospace", fontWeight: 700, fontSize: 18 }}>B({bxVal}, {by})</span>
          </div>
          <div style={{ color: "#6B7280", fontSize: 11, textAlign: "center" }}>E(2,4) = אמצע AB → B = 2E − A</div>
        </div>
      </div>

      {/* Perpendicularity alert */}
      {isPerpAtC && (
        <div style={{ borderRadius: 12, background: "rgba(22,163,74,0.1)", border: "2px solid #16A34A", padding: "10px 16px", marginBottom: "1.5rem", textAlign: "center", color: "#16A34A", fontWeight: 700, fontSize: 14 }}>
          ✅ כל הכבוד! הישרים AC ו-BC מאונכים (זווית C = 90°)
        </div>
      )}

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(8,145,178,0.25)", background: "#fff", padding: "1rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(8,145,178,0.08)" }}>
        <svg viewBox="0 0 420 380" style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Axes */}
          <line x1={toX(-1)} y1={toY(0)} x2={toX(12)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={toX(0)} y1={toY(-1)} x2={toX(0)} y2={toY(10)} stroke="#94a3b8" strokeWidth={1.5} />
          <polygon points={`${toX(12)},${toY(0)} ${toX(12) - 6},${toY(0) - 4} ${toX(12) - 6},${toY(0) + 4}`} fill="#94a3b8" />
          <polygon points={`${toX(0)},${toY(10)} ${toX(0) - 4},${toY(10) + 6} ${toX(0) + 4},${toY(10) + 6}`} fill="#94a3b8" />
          <text x={toX(12) + 8} y={toY(0) + 5} fontSize={14} fill="#94a3b8" fontStyle="italic" fontFamily="serif">x</text>
          <text x={toX(0) + 8} y={toY(10) - 4} fontSize={14} fill="#94a3b8" fontStyle="italic" fontFamily="serif">y</text>

          {/* Quadrilateral ABCD */}
          <polygon
            points={`${toX(ax)},${toY(ay)} ${toX(bxVal)},${toY(by)} ${toX(cxp)},${toY(cyp)} ${toX(dxp)},${toY(dyp)}`}
            fill="rgba(8,145,178,0.06)" stroke="#0891b2" strokeWidth={2} strokeLinejoin="round"
          />

          {/* Line AC */}
          <line x1={toX(ax)} y1={toY(ay)} x2={toX(cxp)} y2={toY(cyp)} stroke={isPerpAtC ? "#16A34A" : "#475569"} strokeWidth={isPerpAtC ? 2.5 : 1.5} strokeDasharray={isPerpAtC ? "none" : "6,3"} />
          {/* Line BC */}
          <line x1={toX(bxVal)} y1={toY(by)} x2={toX(cxp)} y2={toY(cyp)} stroke={isPerpAtC ? "#16A34A" : "#475569"} strokeWidth={isPerpAtC ? 2.5 : 1.5} strokeDasharray={isPerpAtC ? "none" : "6,3"} />

          {/* Right-angle mark at C (when perpendicular) */}
          {isPerpAtC && <polyline points={`${ra1.x},${ra1.y} ${ra2.x},${ra2.y} ${ra3.x},${ra3.y}`} fill="none" stroke="#16A34A" strokeWidth={2} />}

          {/* A — green */}
          <circle cx={toX(ax)} cy={toY(ay)} r={7} fill="#16A34A" stroke="#fff" strokeWidth={2} />
          <text x={toX(ax) + 10} y={toY(ay) + 20} fontSize={13} fill="#334155" fontWeight={700} fontFamily="sans-serif">A({ax},{ay})</text>

          {/* B — red */}
          <circle cx={toX(bxVal)} cy={toY(by)} r={7} fill="#DC2626" stroke="#fff" strokeWidth={2} />
          <text x={toX(bxVal) + 10} y={toY(by) - 8} fontSize={13} fill="#334155" fontWeight={700} fontFamily="sans-serif">B({bxVal},{by})</text>

          {/* C — teal */}
          <circle cx={toX(cxp)} cy={toY(cyp)} r={7} fill="#0891b2" stroke="#fff" strokeWidth={2} />
          <text x={toX(cxp) + 10} y={toY(cyp) + 20} fontSize={13} fill="#334155" fontWeight={700} fontFamily="sans-serif">C(6,2)</text>

          {/* D — purple */}
          <circle cx={toX(dxp)} cy={toY(dyp)} r={7} fill="#9333ea" stroke="#fff" strokeWidth={2} />
          <text x={toX(dxp) - 50} y={toY(dyp) - 10} fontSize={13} fill="#334155" fontWeight={700} fontFamily="sans-serif">D(10,0)</text>

          {/* E — amber */}
          <circle cx={toX(exx)} cy={toY(eyy)} r={6} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
          <text x={toX(exx) - 50} y={toY(eyy) + 5} fontSize={12} fill="#334155" fontWeight={700} fontFamily="sans-serif">E(2,4)</text>
        </svg>
      </div>

      {/* Stats — slopes + areas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "m(AC)", val: mCAstr, color: "#a78bfa" },
          { label: "m(BC)", val: mCBstr, color: "#a78bfa" },
          { label: "m·m", val: productStr, color: isPerpAtC ? "#16A34A" : "#DC2626" },
          { label: "△ACD", val: areaACD.toFixed(1), color: "#0891b2" },
          { label: "שטח ABCD", val: totalArea.toFixed(1), color: "#f59e0b" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(8,145,178,0.35)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
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

export default function AnalyticBasicsPage() {
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
        textarea, input[type="text"], input[type="password"], input[type="number"] {
          outline: none !important;
        }
        textarea:focus, input[type="text"]:focus, input[type="number"]:focus {
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
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>📐 יסודות האנליטית</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>נוסחת המרחק ואמצע קטע — הכלים הבסיסיים של הגאומטריה האנליטית</p>
          </div>
          <Link
            href="/topic/grade10/analytic"
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

        {/* Lab — each level gets its own lab */}
        {selectedLevel === "basic" && <DistanceLab />}
        {selectedLevel === "medium" && <AnalyticTriangleLab />}
        {selectedLevel === "advanced" && <QuadrilateralLab />}

      </div>
    </main>
  );
}
