"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Brain, TrendingUp, Circle, Maximize2, BarChart2, GitBranch,
  ChevronRight, Zap, MessageSquare, Shuffle, Clock, Pencil,
  Check, X, BookOpen, ArrowLeft, Share2,
} from "lucide-react";
import { useChat } from "./chat-context";

// ─── Topic data ────────────────────────────────────────────────────────────────

const TOPICS = [
  {
    id: "calculus",
    title: 'חדו"א',
    subtitle: "חשבון דיפרנציאלי ואינטגרלי",
    icon: TrendingUp,
    subtopicLinks: [
      { label: "פולינומים וחזקות",    href: "/topic/calculus/polynomials" },
      { label: "פונקציות רציונליות",  href: "/topic/calculus/rational" },
      { label: "פונקציות שורש",       href: "/topic/calculus/root" },
    ],
    color: {
      bg:     "bg-blue-950/40",
      border: "border-blue-800/50",
      hover:  "hover:border-blue-500/70 hover:shadow-[0_0_32px_rgba(59,130,246,0.18)]",
      accent: "text-blue-400",
      icon:   "bg-blue-900/60 text-blue-300",
      bar:    "bg-blue-500",
      badge:  "bg-blue-900/60 text-blue-300 border-blue-700/50",
    },
  },
  {
    id: "analytic",
    title: "גיאומטריה אנליטית",
    subtitle: "קו ישר, מעגל ומשיק",
    icon: Circle,
    subtopicLinks: [
      { label: "הקו הישר", href: "/topic/analytic/line" },
      { label: "המעגל",    href: "/topic/analytic/circle" },
      { label: "המשיק",    href: "/topic/analytic/tangent" },
    ],
    color: {
      bg:     "bg-orange-950/40",
      border: "border-orange-800/50",
      hover:  "hover:border-orange-500/70 hover:shadow-[0_0_32px_rgba(249,115,22,0.18)]",
      accent: "text-orange-400",
      icon:   "bg-orange-900/60 text-orange-300",
      bar:    "bg-orange-500",
      badge:  "bg-orange-900/60 text-orange-300 border-orange-700/50",
    },
  },
  {
    id: "kitzun",
    title: "בעיות קיצון",
    subtitle: "מקסימום, מינימום ואילוצים",
    icon: Maximize2,
    subtopicLinks: [
      { label: "גיאומטריה מישורית", href: "/topic/kitzun/geometry" },
      { label: "פונקציות וגרפים",   href: "/topic/kitzun/functions" },
    ],
    color: {
      bg:     "bg-amber-950/40",
      border: "border-amber-800/50",
      hover:  "hover:border-amber-500/70 hover:shadow-[0_0_32px_rgba(245,158,11,0.18)]",
      accent: "text-amber-400",
      icon:   "bg-amber-900/60 text-amber-300",
      bar:    "bg-amber-500",
      badge:  "bg-amber-900/60 text-amber-300 border-amber-700/50",
    },
  },
  {
    id: "probability",
    title: "הסתברות",
    subtitle: "עץ, טבלה והסתברות מותנית",
    icon: GitBranch,
    subtopicLinks: [
      { label: "דיאגרמת עץ",    href: "/topic/probability/tree" },
      { label: "טבלה דו-ממדית", href: "/topic/probability/table" },
    ],
    color: {
      bg:     "bg-purple-950/40",
      border: "border-purple-800/50",
      hover:  "hover:border-purple-500/70 hover:shadow-[0_0_32px_rgba(168,85,247,0.18)]",
      accent: "text-purple-400",
      icon:   "bg-purple-900/60 text-purple-300",
      bar:    "bg-purple-500",
      badge:  "bg-purple-900/60 text-purple-300 border-purple-700/50",
    },
  },
  {
    id: "statistics",
    title: "סטטיסטיקה",
    subtitle: "מדדי מרכז ופיזור",
    icon: BarChart2,
    subtopicLinks: [
      { label: "מדדי מרכז",  href: "/topic/statistics/central" },
      { label: "מדדי פיזור", href: "/topic/statistics/dispersion" },
    ],
    color: {
      bg:     "bg-rose-950/40",
      border: "border-rose-800/50",
      hover:  "hover:border-rose-500/70 hover:shadow-[0_0_32px_rgba(244,63,94,0.18)]",
      accent: "text-rose-400",
      icon:   "bg-rose-900/60 text-rose-300",
      bar:    "bg-rose-500",
      badge:  "bg-rose-900/60 text-rose-300 border-rose-700/50",
    },
  },
];

const RANDOM_POOL = [
  { label: "חקירת f(x) = x⁴ − 8x² (מתקדם)",        href: "/topic/calculus/polynomials",   topic: 'חדו"א' },
  { label: "f(x) = (x²+x−2)/(x²−4) — חור + אסימפטוטה", href: "/topic/calculus/rational", topic: 'חדו"א' },
  { label: "f(x) = x·√(4−x) — חקירה מלאה",           href: "/topic/calculus/root",          topic: 'חדו"א' },
  { label: "קודקודי משולש מצלעות (מתקדם)",             href: "/topic/analytic/line",          topic: "אנליטית" },
  { label: "מיתר ורדיוס — משפט פיתגורס (מתקדם)",      href: "/topic/analytic/circle",        topic: "אנליטית" },
  { label: "שני משיקים מנקודה חיצונית (מתקדם)",        href: "/topic/analytic/tangent",       topic: "אנליטית" },
  { label: "חלון נורמן — מקסום שטח (בינוני)",         href: "/topic/kitzun/geometry",        topic: "קיצון" },
  { label: "קטע אנכי מקסימלי בין שתי פרבולות (מתקדם)", href: "/topic/kitzun/functions",      topic: "קיצון" },
  { label: "שליפה בלי החזרה — P(צבעים שונים)",        href: "/topic/probability/tree",       topic: "הסתברות" },
  { label: "מבחן שתי שאלות — הסתברות מותנית (מתקדם)",  href: "/topic/probability/table",     topic: "הסתברות" },
  { label: "שינוי לינארי: +5 לכל ציון (מתקדם)",        href: "/topic/statistics/dispersion",  topic: "סטטיסטיקה" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getVisitedSubs(): string[] {
  try { return JSON.parse(localStorage.getItem("visitedSubs") || "[]"); } catch { return []; }
}

function getLastVisited(): { label: string; href: string; topicTitle: string } | null {
  try { return JSON.parse(localStorage.getItem("lastVisited") || "null"); } catch { return null; }
}

function markVisited(href: string, label: string, topicTitle: string) {
  try {
    const prev = getVisitedSubs();
    if (!prev.includes(href)) localStorage.setItem("visitedSubs", JSON.stringify([...prev, href]));
    localStorage.setItem("lastVisited", JSON.stringify({ label, href, topicTitle }));
  } catch {}
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ topicId, total, subtopicHrefs, accentClass }: {
  topicId: string; total: number; subtopicHrefs: string[]; accentClass: string;
}) {
  const [done, setDone] = useState(0);
  useEffect(() => {
    const v = getVisitedSubs();
    setDone(subtopicHrefs.filter(h => v.includes(h)).length);
  }, [subtopicHrefs, topicId]);
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">{done}/{total} נושאי משנה</span>
        {done === total && done > 0 && <span className="text-emerald-400 font-semibold">הושלם ✓</span>}
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${accentClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Topic Card ───────────────────────────────────────────────────────────────

function TopicCard({ topic }: { topic: typeof TOPICS[number] }) {
  const Icon = topic.icon;
  const c = topic.color;
  return (
    <Link
      href={`/topic/${topic.id}`}
      onClick={() => markVisited(`/topic/${topic.id}`, topic.title, topic.title)}
      className={`group block rounded-2xl border p-6 transition-all duration-300 hover:scale-[1.015] hover:-translate-y-0.5 ${c.bg} ${c.border} ${c.hover}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
          <Icon size={22} />
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${c.badge}`}>
          4 יח&quot;ל
        </span>
      </div>

      {/* Title */}
      <h3 className={`text-lg font-bold mb-0.5 ${c.accent}`}>{topic.title}</h3>
      <p className="text-slate-400 text-xs mb-4 leading-relaxed">{topic.subtitle}</p>

      {/* Sub-topic list */}
      <div className="space-y-1.5 mb-5">
        {topic.subtopicLinks.map((s) => (
          <div key={s.href} className="flex items-center gap-2 text-xs text-slate-400">
            <span className={`w-1 h-1 rounded-full shrink-0 ${c.bar}`} />
            {s.label}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <ProgressBar
        topicId={topic.id}
        total={topic.subtopicLinks.length}
        subtopicHrefs={topic.subtopicLinks.map(s => s.href)}
        accentClass={c.bar}
      />

      {/* CTA arrow */}
      <div className={`flex items-center justify-end mt-4 text-xs font-medium ${c.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
        <span>התחל תרגול</span>
        <ChevronRight size={14} className="mr-1" />
      </div>
    </Link>
  );
}

// ─── Random Challenge Button ──────────────────────────────────────────────────

function RandomChallenge() {
  const [pick, setPick] = useState<typeof RANDOM_POOL[number] | null>(null);
  const roll = useCallback(() => {
    setPick(RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)]);
  }, []);
  if (pick) {
    return (
      <div className="flex items-center gap-3 bg-[#00d4ff]/5 border border-[#00d4ff]/30 rounded-2xl px-5 py-4 animate-[fadeSlideIn_0.3s_ease-out]">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 mb-0.5">{pick.topic}</p>
          <p className="text-sm font-semibold text-white truncate">{pick.label}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={pick.href}
            className="bg-[#00d4ff] text-[#0f172a] font-bold text-xs px-4 py-2 rounded-xl hover:bg-[#00b8d9] transition-colors"
          >
            התחל ←
          </Link>
          <button
            onClick={roll}
            className="border border-slate-600 text-slate-400 hover:text-white text-xs px-3 py-2 rounded-xl transition-colors"
          >
            <Shuffle size={14} />
          </button>
        </div>
      </div>
    );
  }
  return (
    <button
      onClick={roll}
      className="w-full flex items-center gap-3 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/15 border border-[#00d4ff]/30 hover:border-[#00d4ff]/60 text-[#00d4ff] rounded-2xl px-5 py-4 transition-all duration-200 group"
    >
      <div className="w-9 h-9 rounded-xl bg-[#00d4ff]/20 flex items-center justify-center shrink-0">
        <Zap size={17} />
      </div>
      <div className="text-right flex-1">
        <p className="font-bold text-sm">תרגיל אקראי</p>
        <p className="text-xs text-[#00d4ff]/60">הגרל שאלה מתקדמת מהבנק</p>
      </div>
      <Shuffle size={16} className="opacity-50 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// ─── Name editor ──────────────────────────────────────────────────────────────

function NameGreeting() {
  const [name, setName] = useState("תלמיד");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("studentName");
    if (stored) setName(stored);
  }, []);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed) { setName(trimmed); localStorage.setItem("studentName", trimmed); }
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-2">
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          className="bg-slate-800 border border-[#00d4ff]/50 rounded-lg px-3 py-1 text-white text-2xl font-bold w-32 focus:outline-none"
          dir="rtl"
        />
        <button onClick={save} className="text-emerald-400 hover:text-emerald-300"><Check size={18} /></button>
        <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
      </span>
    );
  }
  return (
    <button
      onClick={() => { setDraft(name); setEditing(true); }}
      className="inline-flex items-center gap-2 group"
    >
      <span>{name}</span>
      <Pencil size={14} className="text-slate-600 group-hover:text-[#00d4ff] transition-colors" />
    </button>
  );
}

// ─── Last Visited Card ────────────────────────────────────────────────────────

function LastVisitedCard() {
  const [last, setLast] = useState<{ label: string; href: string; topicTitle: string } | null>(null);
  useEffect(() => { setLast(getLastVisited()); }, []);
  if (!last) return null;
  return (
    <Link
      href={last.href}
      className="flex items-center gap-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-2xl px-5 py-4 transition-all duration-200 group"
    >
      <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center shrink-0">
        <Clock size={16} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0 text-right">
        <p className="text-xs text-slate-500 mb-0.5">המשך מאיפה שעצרת</p>
        <p className="text-sm font-semibold text-slate-200 truncate">{last.topicTitle}</p>
      </div>
      <ArrowLeft size={16} className="text-slate-600 group-hover:text-white transition-colors shrink-0" />
    </Link>
  );
}

// ─── Share Button ─────────────────────────────────────────────────────────────

function ShareButton() {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const data = {
      title: "מתמטיקה + AI",
      text: "תרגול מתמטיקה עם עוזר AI אישי — כיתה י\"א 4 יח\"ל",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(data.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };
  return (
    <button
      onClick={share}
      title="שתף עם חבר"
      className="flex items-center gap-1.5 text-slate-400 hover:text-[#00d4ff] transition-colors text-sm"
    >
      <Share2 size={15} />
      <span className="hidden sm:inline">{copied ? "הועתק!" : "שתף"}</span>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { openChat } = useChat();
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white" dir="rtl">

      {/* ── Sticky nav ── */}
      <header className="sticky top-0 z-30 bg-[#0a0f1e]/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain size={20} className="text-[#00d4ff]" />
            <span className="font-bold text-white">מתמטיקה + AI</span>
          </div>
          <div className="flex items-center gap-3">
            <ShareButton />
            <Link href="/wizard" className="text-slate-400 hover:text-slate-200 text-sm transition-colors flex items-center gap-1">
              <BookOpen size={14} />
              <span className="hidden sm:inline">בחר נושא</span>
            </Link>
            <Link
              href="/wizard"
              className="bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/30 text-[#00d4ff] text-sm font-medium px-4 py-1.5 rounded-full transition-colors"
            >
              כניסת תלמידים
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-12">

        {/* ── Welcome hero ── */}
        <section className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl border border-[#00d4ff]/20 bg-gradient-to-l from-[#00d4ff]/5 to-[#3b82f6]/5 p-8">
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundImage: "radial-gradient(circle at 5% 50%, #00d4ff 0%, transparent 55%), radial-gradient(circle at 90% 20%, #3b82f6 0%, transparent 50%)" }}
            />
            <div className="relative">
              <p className="text-[#00d4ff] text-xs font-semibold uppercase tracking-widest mb-3">כיתה י&quot;א • 4 יח&quot;ל מהדורה חדשה</p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 leading-snug">
                שלום, <NameGreeting /> —
                <br />
                <span className="text-[#00d4ff]">מוכן להמשיך לתרגל?</span>
              </h1>
              <p className="text-slate-400 mt-2 text-sm">בחר נושא-משנה, פתור שלב אחר שלב, קבל עזרה מה-AI בדיוק כשצריך.</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid sm:grid-cols-2 gap-3">
            <RandomChallenge />
            <button
              onClick={() => openChat()}
              className="flex items-center gap-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-[#00d4ff]/40 rounded-2xl px-5 py-4 transition-all duration-200 group w-full text-right"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-700 group-hover:bg-[#00d4ff]/15 flex items-center justify-center shrink-0 transition-colors">
                <MessageSquare size={17} className="text-slate-300 group-hover:text-[#00d4ff] transition-colors" />
              </div>
              <div className="flex-1 text-right">
                <p className="font-bold text-sm text-white">שאל את ה-AI</p>
                <p className="text-xs text-slate-500">צ&apos;אט עם מורה AI • צלם שאלה מהמחברת</p>
              </div>
              <MessageSquare size={14} className="text-slate-600 group-hover:text-[#00d4ff] transition-colors shrink-0" />
            </button>
          </div>

          {/* Last visited */}
          <LastVisitedCard />
        </section>

        {/* ── Topic grid ── */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">הנושאים שלך</h2>
            <span className="text-slate-600 text-sm">{TOPICS.length} יחידות</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOPICS.map(t => <TopicCard key={t.id} topic={t} />)}
          </div>
        </section>

        {/* ── Slim footer ── */}
        <footer className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-[#00d4ff]" />
            <span>מתמטיקה + AI © 2026</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/wizard" className="hover:text-slate-300 transition-colors">בחר נושא</Link>
            <Link href="/wizard" className="hover:text-slate-300 transition-colors">כניסת תלמידים</Link>
            <a href="mailto:info@math-ai.co.il" className="hover:text-slate-300 transition-colors">צור קשר</a>
          </div>
        </footer>

      </main>
    </div>
  );
}
