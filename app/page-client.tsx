"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Brain, TrendingUp, Circle, Maximize2, BarChart2, GitBranch,
  ChevronRight, Zap, MessageSquare, Shuffle, Clock, Pencil,
  Check, X, BookOpen, ArrowLeft, Share2, LogOut, Settings,
  Sigma, Box, LineChart, PieChart, Percent, Calculator, Triangle, Compass,
} from "lucide-react";
import { useChat } from "./chat-context";
import { isSubtopicComplete } from "./lib/progress";

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

// ─── Grade-specific topic sets ────────────────────────────────────────────────

const TOPICS_10 = [
  {
    id: "grade10-algebra", href: "/topic/grade10/algebra-parabola", title: "פרבולה ואלגברה", subtitle: "משוואות ריבועיות, פרבולות וחוקי חזקות",
    icon: Calculator,
    subtopicLinks: [
      { label: "פרבולה ואלגברה", href: "/topic/grade10/algebra-parabola" },
    ],
    color: { bg: "bg-blue-950/40", border: "border-blue-800/50", hover: "hover:border-blue-500/70 hover:shadow-[0_0_32px_rgba(59,130,246,0.18)]", accent: "text-blue-400", icon: "bg-blue-900/60 text-blue-300", bar: "bg-blue-500", badge: "bg-blue-900/60 text-blue-300 border-blue-700/50" },
  },
  {
    id: "grade10-geometry", href: "/topic/grade10/geometry", title: "גיאומטריה", subtitle: "מרובעים, מקביליות ומשולשים",
    icon: Triangle,
    subtopicLinks: [
      { label: "מקבילית", href: "/topic/grade10/geo-parallelogram" },
      { label: "מעוין", href: "/topic/grade10/geo-rhombus" },
    ],
    color: { bg: "bg-emerald-950/40", border: "border-emerald-800/50", hover: "hover:border-emerald-500/70 hover:shadow-[0_0_32px_rgba(16,185,129,0.18)]", accent: "text-emerald-400", icon: "bg-emerald-900/60 text-emerald-300", bar: "bg-emerald-500", badge: "bg-emerald-900/60 text-emerald-300 border-emerald-700/50" },
  },
  {
    id: "grade10-trig", href: "/topic/grade10/trig", title: "טריגונומטריה", subtitle: "סינוס, קוסינוס, טנגנס ויישומים",
    icon: Compass,
    subtopicLinks: [
      { label: "יחסים טריגונומטריים", href: "/topic/grade10/trig-basics" },
      { label: "יישומים", href: "/topic/grade10/trig-applications" },
    ],
    color: { bg: "bg-amber-950/40", border: "border-amber-800/50", hover: "hover:border-amber-500/70 hover:shadow-[0_0_32px_rgba(245,158,11,0.18)]", accent: "text-amber-400", icon: "bg-amber-900/60 text-amber-300", bar: "bg-amber-500", badge: "bg-amber-900/60 text-amber-300 border-amber-700/50" },
  },
  {
    id: "grade10-statistics", href: "/topic/grade10/statistics", title: "סטטיסטיקה", subtitle: "מדדי מרכז ופיזור",
    icon: BarChart2,
    subtopicLinks: [
      { label: "מדדי מרכז", href: "/topic/grade10/statistics/central" },
      { label: "מדדי פיזור", href: "/topic/grade10/statistics/dispersion" },
    ],
    color: { bg: "bg-rose-950/40", border: "border-rose-800/50", hover: "hover:border-rose-500/70 hover:shadow-[0_0_32px_rgba(244,63,94,0.18)]", accent: "text-rose-400", icon: "bg-rose-900/60 text-rose-300", bar: "bg-rose-500", badge: "bg-rose-900/60 text-rose-300 border-rose-700/50" },
  },
  {
    id: "grade10-analytic", href: "/topic/grade10/analytic", title: "גיאומטריה אנליטית", subtitle: "יסודות ובעיות גאומטריות",
    icon: Circle,
    subtopicLinks: [
      { label: "מושגי יסוד", href: "/topic/grade10/analytic/basics" },
      { label: "בעיות מילוליות", href: "/topic/grade10/analytic/problems" },
    ],
    color: { bg: "bg-purple-950/40", border: "border-purple-800/50", hover: "hover:border-purple-500/70 hover:shadow-[0_0_32px_rgba(168,85,247,0.18)]", accent: "text-purple-400", icon: "bg-purple-900/60 text-purple-300", bar: "bg-purple-500", badge: "bg-purple-900/60 text-purple-300 border-purple-700/50" },
  },
];

const TOPICS_11 = TOPICS; // existing topics are grade 11

const TOPICS_12 = [
  {
    id: "grade12-series", href: "/topic/grade12/series", title: "סדרות", subtitle: "סדרות חשבוניות, הנדסיות ורקורסיביות",
    icon: Sigma,
    subtopicLinks: [
      { label: "סדרה חשבונית", href: "/topic/grade12/series-arithmetic" },
      { label: "סדרה הנדסית", href: "/topic/grade12/series-geometric" },
      { label: "נוסחת רקורסיה", href: "/topic/grade12/series/recursion" },
    ],
    color: { bg: "bg-amber-950/40", border: "border-amber-800/50", hover: "hover:border-amber-500/70 hover:shadow-[0_0_32px_rgba(245,158,11,0.18)]", accent: "text-amber-400", icon: "bg-amber-900/60 text-amber-300", bar: "bg-amber-500", badge: "bg-amber-900/60 text-amber-300 border-amber-700/50" },
  },
  {
    id: "grade12-space", href: "/topic/grade12/space-geometry", title: "גיאומטריה מרחבית", subtitle: "תיבה, פירמידה ומשולשים במרחב",
    icon: Box,
    subtopicLinks: [
      { label: "תיבה", href: "/topic/grade12/space-geometry/box" },
      { label: "פירמידה", href: "/topic/grade12/space-geometry/pyramid" },
    ],
    color: { bg: "bg-emerald-950/40", border: "border-emerald-800/50", hover: "hover:border-emerald-500/70 hover:shadow-[0_0_32px_rgba(16,185,129,0.18)]", accent: "text-emerald-400", icon: "bg-emerald-900/60 text-emerald-300", bar: "bg-emerald-500", badge: "bg-emerald-900/60 text-emerald-300 border-emerald-700/50" },
  },
  {
    id: "grade12-growth", href: "/topic/grade12/growth-decay", title: "גדילה ודעיכה", subtitle: "מודלים מעריכיים ולוגריתמיים",
    icon: LineChart,
    subtopicLinks: [
      { label: "גדילה ודעיכה", href: "/topic/grade12/growth-decay" },
    ],
    color: { bg: "bg-rose-950/40", border: "border-rose-800/50", hover: "hover:border-rose-500/70 hover:shadow-[0_0_32px_rgba(244,63,94,0.18)]", accent: "text-rose-400", icon: "bg-rose-900/60 text-rose-300", bar: "bg-rose-500", badge: "bg-rose-900/60 text-rose-300 border-rose-700/50" },
  },
  {
    id: "grade12-calculus", href: "/topic/grade12/calculus", title: 'חדו"א מתקדם', subtitle: "אקספוננט, לוגריתם, אינטגרלים",
    icon: TrendingUp,
    subtopicLinks: [
      { label: "פולינומים", href: "/topic/grade12/calculus-polynomial" },
      { label: "אקספוננט", href: "/topic/grade12/calculus/exponential" },
      { label: "לוגריתם", href: "/topic/grade12/calculus/ln" },
      { label: "אינטגרלים", href: "/topic/grade12/calculus/integral" },
    ],
    color: { bg: "bg-indigo-950/40", border: "border-indigo-800/50", hover: "hover:border-indigo-500/70 hover:shadow-[0_0_32px_rgba(99,102,241,0.18)]", accent: "text-indigo-400", icon: "bg-indigo-900/60 text-indigo-300", bar: "bg-indigo-500", badge: "bg-indigo-900/60 text-indigo-300 border-indigo-700/50" },
  },
];

// ─── 3-unit topics (coming soon) ──────────────────────────────────────────────

const TOPICS_3U_10 = [
  { id: "3u-10-stats", title: "סטטיסטיקה", subtitle: "ממוצע, חציון, סטיית תקן", icon: BarChart2, href: "/3u/topic/grade10/statistics", subtopicLinks: [{ label: "מדדי מרכז", href: "/3u/topic/grade10/statistics" }, { label: "מדדי פיזור", href: "/3u/topic/grade10/statistics" }], color: { bg: "bg-rose-950/40", border: "border-rose-800/50", hover: "hover:border-rose-500/70 hover:shadow-[0_0_32px_rgba(244,63,94,0.18)]", accent: "text-rose-400", icon: "bg-rose-900/60 text-rose-300", bar: "bg-rose-500", badge: "bg-rose-900/60 text-rose-300 border-rose-700/50" } },
  { id: "3u-10-prob", title: "הסתברות", subtitle: "אירועים, חיתוך ואיחוד", icon: PieChart, href: "/3u/topic/grade10/probability", subtopicLinks: [{ label: "אירועים בסיסיים", href: "/3u/topic/grade10/probability" }, { label: "חיתוך ואיחוד", href: "/3u/topic/grade10/probability" }], color: { bg: "bg-purple-950/40", border: "border-purple-800/50", hover: "hover:border-purple-500/70 hover:shadow-[0_0_32px_rgba(168,85,247,0.18)]", accent: "text-purple-400", icon: "bg-purple-900/60 text-purple-300", bar: "bg-purple-500", badge: "bg-purple-900/60 text-purple-300 border-purple-700/50" } },
  { id: "3u-10-geo", title: "גיאומטריה", subtitle: "משולשים, מרובעים ומעגלים", icon: Triangle, href: "/3u/topic/grade10/geometry", subtopicLinks: [{ label: "משולשים", href: "/3u/topic/grade10/geometry" }, { label: "מרובעים", href: "/3u/topic/grade10/geometry" }], color: { bg: "bg-emerald-950/40", border: "border-emerald-800/50", hover: "hover:border-emerald-500/70 hover:shadow-[0_0_32px_rgba(52,211,153,0.18)]", accent: "text-emerald-400", icon: "bg-emerald-900/60 text-emerald-300", bar: "bg-emerald-500", badge: "bg-emerald-900/60 text-emerald-300 border-emerald-700/50" } },
  { id: "3u-10-graphs", title: "גרפים", subtitle: "פונקציות לינאריות וריבועיות", icon: LineChart, href: "/3u/topic/grade10/graphs", subtopicLinks: [{ label: "פונקציה לינארית", href: "/3u/topic/grade10/graphs" }, { label: "פונקציה ריבועית", href: "/3u/topic/grade10/graphs" }], color: { bg: "bg-blue-950/40", border: "border-blue-800/50", hover: "hover:border-blue-500/70 hover:shadow-[0_0_32px_rgba(59,130,246,0.18)]", accent: "text-blue-400", icon: "bg-blue-900/60 text-blue-300", bar: "bg-blue-500", badge: "bg-blue-900/60 text-blue-300 border-blue-700/50" } },
  { id: "3u-10-word", title: "בעיות מילוליות", subtitle: "תרגום מילולי למתמטי", icon: Pencil, href: "/3u/topic/grade10/word-problems", subtopicLinks: [{ label: "משוואות", href: "/3u/topic/grade10/word-problems" }, { label: "אי-שוויונות", href: "/3u/topic/grade10/word-problems" }], color: { bg: "bg-amber-950/40", border: "border-amber-800/50", hover: "hover:border-amber-500/70 hover:shadow-[0_0_32px_rgba(245,158,11,0.18)]", accent: "text-amber-400", icon: "bg-amber-900/60 text-amber-300", bar: "bg-amber-500", badge: "bg-amber-900/60 text-amber-300 border-amber-700/50" } },
];

const TOPICS_3U_11 = [
  { id: "3u-11-growth", title: "גדילה ודעיכה", subtitle: "מודלים מעריכיים", icon: LineChart, href: "/3u/topic/grade11/growth", subtopicLinks: [{ label: "גדילה מעריכית", href: "/3u/topic/grade11/growth" }, { label: "דעיכה", href: "/3u/topic/grade11/growth" }], color: { bg: "bg-rose-950/40", border: "border-rose-800/50", hover: "hover:border-rose-500/70 hover:shadow-[0_0_32px_rgba(244,63,94,0.18)]", accent: "text-rose-400", icon: "bg-rose-900/60 text-rose-300", bar: "bg-rose-500", badge: "bg-rose-900/60 text-rose-300 border-rose-700/50" } },
  { id: "3u-11-prob", title: "הסתברות", subtitle: "הסתברות מותנית ובייס", icon: PieChart, href: "/3u/topic/grade11/probability", subtopicLinks: [{ label: "הסתברות מותנית", href: "/3u/topic/grade11/probability" }, { label: "בייס", href: "/3u/topic/grade11/probability" }], color: { bg: "bg-purple-950/40", border: "border-purple-800/50", hover: "hover:border-purple-500/70 hover:shadow-[0_0_32px_rgba(168,85,247,0.18)]", accent: "text-purple-400", icon: "bg-purple-900/60 text-purple-300", bar: "bg-purple-500", badge: "bg-purple-900/60 text-purple-300 border-purple-700/50" } },
  { id: "3u-11-geo", title: "גיאומטריה", subtitle: "חפיפה ודמיון", icon: Triangle, href: "/3u/topic/grade11/geometry", subtopicLinks: [{ label: "חפיפת משולשים", href: "/3u/topic/grade11/geometry" }, { label: "דמיון", href: "/3u/topic/grade11/geometry" }], color: { bg: "bg-emerald-950/40", border: "border-emerald-800/50", hover: "hover:border-emerald-500/70 hover:shadow-[0_0_32px_rgba(52,211,153,0.18)]", accent: "text-emerald-400", icon: "bg-emerald-900/60 text-emerald-300", bar: "bg-emerald-500", badge: "bg-emerald-900/60 text-emerald-300 border-emerald-700/50" } },
  { id: "3u-11-trig", title: "טריגונומטריה", subtitle: "משפט הסינוסים והקוסינוסים", icon: Compass, href: "/3u/topic/grade11/trig", subtopicLinks: [{ label: "סינוסים", href: "/3u/topic/grade11/trig" }, { label: "קוסינוסים", href: "/3u/topic/grade11/trig" }], color: { bg: "bg-amber-950/40", border: "border-amber-800/50", hover: "hover:border-amber-500/70 hover:shadow-[0_0_32px_rgba(245,158,11,0.18)]", accent: "text-amber-400", icon: "bg-amber-900/60 text-amber-300", bar: "bg-amber-500", badge: "bg-amber-900/60 text-amber-300 border-amber-700/50" } },
  { id: "3u-11-stats", title: "סטטיסטיקה", subtitle: "התפלגות נורמלית", icon: BarChart2, href: "/3u/topic/grade11/statistics", subtopicLinks: [{ label: "התפלגות נורמלית", href: "/3u/topic/grade11/statistics" }, { label: "ציון תקן", href: "/3u/topic/grade11/statistics" }], color: { bg: "bg-blue-950/40", border: "border-blue-800/50", hover: "hover:border-blue-500/70 hover:shadow-[0_0_32px_rgba(59,130,246,0.18)]", accent: "text-blue-400", icon: "bg-blue-900/60 text-blue-300", bar: "bg-blue-500", badge: "bg-blue-900/60 text-blue-300 border-blue-700/50" } },
  { id: "3u-11-linear", title: "אלגברה לינארית", subtitle: "מערכת משוואות ומטריצות", icon: Calculator, href: "/3u/topic/grade11/linear-algebra", subtopicLinks: [{ label: "מערכת משוואות", href: "/3u/topic/grade11/linear-algebra" }, { label: "מטריצות", href: "/3u/topic/grade11/linear-algebra" }], color: { bg: "bg-indigo-950/40", border: "border-indigo-800/50", hover: "hover:border-indigo-500/70 hover:shadow-[0_0_32px_rgba(99,102,241,0.18)]", accent: "text-indigo-400", icon: "bg-indigo-900/60 text-indigo-300", bar: "bg-indigo-500", badge: "bg-indigo-900/60 text-indigo-300 border-indigo-700/50" } },
];

const TOPICS_3U_12 = [
  { id: "3u-12-lp", title: "תכנון לינארי", subtitle: "אילוצים, תחום אפשרי ופתרון אופטימלי", icon: Maximize2, href: "/3u/topic/grade12/linear-programming", subtopicLinks: [{ label: "אילוצים ותחום", href: "/3u/topic/grade12/linear-programming" }, { label: "פונקציית מטרה", href: "/3u/topic/grade12/linear-programming" }], color: { bg: "bg-amber-950/40", border: "border-amber-800/50", hover: "hover:border-amber-500/70 hover:shadow-[0_0_32px_rgba(245,158,11,0.18)]", accent: "text-amber-400", icon: "bg-amber-900/60 text-amber-300", bar: "bg-amber-500", badge: "bg-amber-900/60 text-amber-300 border-amber-700/50" } },
  { id: "3u-12-analytic", title: "גיאומטריה אנליטית", subtitle: "ישר, מעגל ומשיק", icon: Circle, href: "/3u/topic/grade12/analytic", subtopicLinks: [{ label: "נקודות וישרים", href: "/3u/topic/grade12/analytic" }, { label: "המעגל", href: "/3u/topic/grade12/analytic" }], color: { bg: "bg-orange-950/40", border: "border-orange-800/50", hover: "hover:border-orange-500/70 hover:shadow-[0_0_32px_rgba(249,115,22,0.18)]", accent: "text-orange-400", icon: "bg-orange-900/60 text-orange-300", bar: "bg-orange-500", badge: "bg-orange-900/60 text-orange-300 border-orange-700/50" } },
  { id: "3u-12-stats", title: "סטטיסטיקה", subtitle: "התפלגות נורמלית וז-סקור", icon: BarChart2, href: "/3u/topic/grade12/statistics", subtopicLinks: [{ label: "התפלגות נורמלית", href: "/3u/topic/grade12/statistics" }, { label: "סטטיסטיקה תיאורית", href: "/3u/topic/grade12/statistics" }], color: { bg: "bg-rose-950/40", border: "border-rose-800/50", hover: "hover:border-rose-500/70 hover:shadow-[0_0_32px_rgba(244,63,94,0.18)]", accent: "text-rose-400", icon: "bg-rose-900/60 text-rose-300", bar: "bg-rose-500", badge: "bg-rose-900/60 text-rose-300 border-rose-700/50" } },
  { id: "3u-12-parabola", title: "פרבולה", subtitle: "קודקוד, מוקד ודירקטריסה", icon: TrendingUp, href: "/3u/topic/grade12/parabola", subtopicLinks: [{ label: "מודל ריבועי", href: "/3u/topic/grade12/parabola" }, { label: "בעיות קיצון", href: "/3u/topic/grade12/parabola" }], color: { bg: "bg-blue-950/40", border: "border-blue-800/50", hover: "hover:border-blue-500/70 hover:shadow-[0_0_32px_rgba(59,130,246,0.18)]", accent: "text-blue-400", icon: "bg-blue-900/60 text-blue-300", bar: "bg-blue-500", badge: "bg-blue-900/60 text-blue-300 border-blue-700/50" } },
  { id: "3u-12-spatial", title: "ראייה מרחבית", subtitle: "חתכים, היטלים ופריסות", icon: Box, href: "/3u/topic/grade12/spatial", subtopicLinks: [{ label: "קוביות ומבטים", href: "/3u/topic/grade12/spatial" }, { label: "תרשים מספרים", href: "/3u/topic/grade12/spatial" }], color: { bg: "bg-emerald-950/40", border: "border-emerald-800/50", hover: "hover:border-emerald-500/70 hover:shadow-[0_0_32px_rgba(52,211,153,0.18)]", accent: "text-emerald-400", icon: "bg-emerald-900/60 text-emerald-300", bar: "bg-emerald-500", badge: "bg-emerald-900/60 text-emerald-300 border-emerald-700/50" } },
  { id: "3u-12-solids", title: "גופים במרחב", subtitle: "נפח ושטח פנים של גופים", icon: Box, href: "/3u/topic/grade12/solid-geometry", subtopicLinks: [{ label: "תיבה ומנסרה", href: "/3u/topic/grade12/solid-geometry" }, { label: "גליל", href: "/3u/topic/grade12/solid-geometry" }], color: { bg: "bg-indigo-950/40", border: "border-indigo-800/50", hover: "hover:border-indigo-500/70 hover:shadow-[0_0_32px_rgba(99,102,241,0.18)]", accent: "text-indigo-400", icon: "bg-indigo-900/60 text-indigo-300", bar: "bg-indigo-500", badge: "bg-indigo-900/60 text-indigo-300 border-indigo-700/50" } },
];

const TOPICS_3U: Record<string, typeof TOPICS_3U_10> = {
  "10": TOPICS_3U_10,
  "11": TOPICS_3U_11,
  "12": TOPICS_3U_12,
};

// ─── 5-unit topics ───────────────────────────────────────────────────────────

const TOPICS_5U_10 = [
  { id: "5u-10-analytic", title: "גיאומטריה אנליטית", subtitle: "ישר, מעגל, אליפסה והיפרבולה", icon: Circle, href: "/5u/topic/grade10/analytic", subtopicLinks: [{ label: "יסודות", href: "/5u/topic/grade10/analytic" }, { label: "ישר ומשוואתו", href: "/5u/topic/grade10/analytic" }, { label: "מעגל", href: "/5u/topic/grade10/analytic" }], color: { bg: "bg-orange-950/40", border: "border-orange-800/50", hover: "hover:border-orange-500/70 hover:shadow-[0_0_32px_rgba(249,115,22,0.18)]", accent: "text-orange-400", icon: "bg-orange-900/60 text-orange-300", bar: "bg-orange-500", badge: "bg-orange-900/60 text-orange-300 border-orange-700/50" } },
  { id: "5u-10-geo", title: "גיאומטריה", subtitle: "הוכחות, חפיפה ודמיון", icon: Triangle, href: "/5u/topic/grade10/geometry", subtopicLinks: [{ label: "משולשים וחפיפה", href: "/5u/topic/grade10/geometry" }, { label: "דמיון ושטחים", href: "/5u/topic/grade10/geometry" }], color: { bg: "bg-emerald-950/40", border: "border-emerald-800/50", hover: "hover:border-emerald-500/70 hover:shadow-[0_0_32px_rgba(52,211,153,0.18)]", accent: "text-emerald-400", icon: "bg-emerald-900/60 text-emerald-300", bar: "bg-emerald-500", badge: "bg-emerald-900/60 text-emerald-300 border-emerald-700/50" } },
  { id: "5u-10-preanalysis", title: "קדם אנליזה", subtitle: "גבולות, רציפות והתכנסות", icon: TrendingUp, href: "/5u/topic/grade10/pre-calculus", subtopicLinks: [{ label: "גבולות", href: "/5u/topic/grade10/pre-calculus" }, { label: "רציפות", href: "/5u/topic/grade10/pre-calculus" }], color: { bg: "bg-blue-950/40", border: "border-blue-800/50", hover: "hover:border-blue-500/70 hover:shadow-[0_0_32px_rgba(59,130,246,0.18)]", accent: "text-blue-400", icon: "bg-blue-900/60 text-blue-300", bar: "bg-blue-500", badge: "bg-blue-900/60 text-blue-300 border-blue-700/50" } },
  { id: "5u-10-trigfunc", title: "פונקציות טריגונומטריות", subtitle: "sin, cos, tan כפונקציות מעגליות", icon: Compass, href: "/5u/topic/grade10/trig-functions", subtopicLinks: [{ label: "פונקציות מעגליות", href: "/5u/topic/grade10/trig-functions" }, { label: "זהויות טריגונומטריות", href: "/5u/topic/grade10/trig-functions" }], color: { bg: "bg-amber-950/40", border: "border-amber-800/50", hover: "hover:border-amber-500/70 hover:shadow-[0_0_32px_rgba(245,158,11,0.18)]", accent: "text-amber-400", icon: "bg-amber-900/60 text-amber-300", bar: "bg-amber-500", badge: "bg-amber-900/60 text-amber-300 border-amber-700/50" } },
  { id: "5u-10-trigplane", title: "טריגונומטריה במישור", subtitle: "משפט הסינוסים, קוסינוסים ושטחים", icon: Triangle, href: "/5u/topic/grade10/trig-plane", subtopicLinks: [{ label: "סינוסים וקוסינוסים", href: "/5u/topic/grade10/trig-plane" }, { label: "שטחים", href: "/5u/topic/grade10/trig-plane" }], color: { bg: "bg-purple-950/40", border: "border-purple-800/50", hover: "hover:border-purple-500/70 hover:shadow-[0_0_32px_rgba(168,85,247,0.18)]", accent: "text-purple-400", icon: "bg-purple-900/60 text-purple-300", bar: "bg-purple-500", badge: "bg-purple-900/60 text-purple-300 border-purple-700/50" } },
];

const TOPICS_5U_11 = [
  { id: "5u-11-calculus", title: 'חדו"א ואינטגרל', subtitle: "נגזרות, חקירה, אינטגרלים ושטחים", icon: TrendingUp, href: "/5u/topic/grade11/calculus", subtopicLinks: [{ label: "פונקציות רציונליות ושורש", href: "/5u/topic/grade11/calculus" }, { label: "חקירה מלאה", href: "/5u/topic/grade11/calculus" }, { label: "אינטגרל ושטח", href: "/5u/topic/grade11/calculus" }], color: { bg: "bg-blue-950/40", border: "border-blue-800/50", hover: "hover:border-blue-500/70 hover:shadow-[0_0_32px_rgba(59,130,246,0.18)]", accent: "text-blue-400", icon: "bg-blue-900/60 text-blue-300", bar: "bg-blue-500", badge: "bg-blue-900/60 text-blue-300 border-blue-700/50" } },
  { id: "5u-11-series", title: "סדרות", subtitle: "חשבוניות, הנדסיות וכלל נסיגה", icon: Sigma, href: "/5u/topic/grade11/series", subtopicLinks: [{ label: "סדרה חשבונית והנדסית", href: "/5u/topic/grade11/series" }, { label: "אינדוקציה מתמטית", href: "/5u/topic/grade11/series" }], color: { bg: "bg-amber-950/40", border: "border-amber-800/50", hover: "hover:border-amber-500/70 hover:shadow-[0_0_32px_rgba(245,158,11,0.18)]", accent: "text-amber-400", icon: "bg-amber-900/60 text-amber-300", bar: "bg-amber-500", badge: "bg-amber-900/60 text-amber-300 border-amber-700/50" } },
  { id: "5u-11-prob", title: "הסתברות", subtitle: "הסתברות מותנית, בייס ותמורות", icon: PieChart, href: "/5u/topic/grade11/probability", subtopicLinks: [{ label: "הסתברות בסיסית ועצמאות", href: "/5u/topic/grade11/probability" }, { label: "הסתברות מותנית ובייס", href: "/5u/topic/grade11/probability" }], color: { bg: "bg-purple-950/40", border: "border-purple-800/50", hover: "hover:border-purple-500/70 hover:shadow-[0_0_32px_rgba(168,85,247,0.18)]", accent: "text-purple-400", icon: "bg-purple-900/60 text-purple-300", bar: "bg-purple-500", badge: "bg-purple-900/60 text-purple-300 border-purple-700/50" } },
  { id: "5u-11-geo", title: "גיאומטריה", subtitle: "מעגלים, משולשים ומרובעים", icon: Triangle, href: "/5u/topic/grade11/geometry", subtopicLinks: [{ label: "מעגלים", href: "/5u/topic/grade11/geometry" }, { label: "משולשים ומרובעים", href: "/5u/topic/grade11/geometry" }], color: { bg: "bg-emerald-950/40", border: "border-emerald-800/50", hover: "hover:border-emerald-500/70 hover:shadow-[0_0_32px_rgba(52,211,153,0.18)]", accent: "text-emerald-400", icon: "bg-emerald-900/60 text-emerald-300", bar: "bg-emerald-500", badge: "bg-emerald-900/60 text-emerald-300 border-emerald-700/50" } },
  { id: "5u-11-trig", title: "טריגונומטריה", subtitle: "סינוסים, קוסינוסים ושטחים", icon: Compass, href: "/5u/topic/grade11/trig", subtopicLinks: [{ label: "משפט הסינוסים והקוסינוסים", href: "/5u/topic/grade11/trig" }, { label: "שטחים ובעיות כלליות", href: "/5u/topic/grade11/trig" }], color: { bg: "bg-indigo-950/40", border: "border-indigo-800/50", hover: "hover:border-indigo-500/70 hover:shadow-[0_0_32px_rgba(99,102,241,0.18)]", accent: "text-indigo-400", icon: "bg-indigo-900/60 text-indigo-300", bar: "bg-indigo-500", badge: "bg-indigo-900/60 text-indigo-300 border-indigo-700/50" } },
];

const TOPICS_5U_12 = [
  { id: "5u-12-analytic", title: "גיאומטריה אנליטית", subtitle: "ישר, מעגל, משיק ואליפסה", icon: Circle, href: "/5u/topic/grade12/analytic", subtopicLinks: [{ label: "מעגל ואליפסה", href: "/5u/topic/grade12/analytic" }, { label: "מקומות גיאומטריים", href: "/5u/topic/grade12/analytic" }], color: { bg: "bg-orange-950/40", border: "border-orange-800/50", hover: "hover:border-orange-500/70 hover:shadow-[0_0_32px_rgba(249,115,22,0.18)]", accent: "text-orange-400", icon: "bg-orange-900/60 text-orange-300", bar: "bg-orange-500", badge: "bg-orange-900/60 text-orange-300 border-orange-700/50" } },
  { id: "5u-12-vectors", title: "וקטורים במרחב", subtitle: "מכפלה סקלרית, וקטורית ומישורים", icon: Share2, href: "/5u/topic/grade12/vectors", subtopicLinks: [{ label: "וקטורים בסיסיים", href: "/5u/topic/grade12/vectors" }, { label: "פירמידה ומרחב", href: "/5u/topic/grade12/vectors" }], color: { bg: "bg-emerald-950/40", border: "border-emerald-800/50", hover: "hover:border-emerald-500/70 hover:shadow-[0_0_32px_rgba(52,211,153,0.18)]", accent: "text-emerald-400", icon: "bg-emerald-900/60 text-emerald-300", bar: "bg-emerald-500", badge: "bg-emerald-900/60 text-emerald-300 border-emerald-700/50" } },
  { id: "5u-12-complex", title: "מספרים מרוכבים", subtitle: "צורה קרטזית, טריגונומטרית ודה-מואבר", icon: Calculator, href: "/5u/topic/grade12/complex", subtopicLinks: [{ label: "צורה אלגברית", href: "/5u/topic/grade12/complex" }, { label: "צורה טריגונומטרית", href: "/5u/topic/grade12/complex" }], color: { bg: "bg-purple-950/40", border: "border-purple-800/50", hover: "hover:border-purple-500/70 hover:shadow-[0_0_32px_rgba(168,85,247,0.18)]", accent: "text-purple-400", icon: "bg-purple-900/60 text-purple-300", bar: "bg-purple-500", badge: "bg-purple-900/60 text-purple-300 border-purple-700/50" } },
  { id: "5u-12-explog", title: "פונקציות מעריכיות ולוגריתמיות", subtitle: "eˣ, ln x, חקירה ויישומים", icon: TrendingUp, href: "/5u/topic/grade12/exponential", subtopicLinks: [{ label: "חקירת פונקציה מעריכית", href: "/5u/topic/grade12/exponential" }, { label: "חקירת פונקציה לוגריתמית", href: "/5u/topic/grade12/exponential" }], color: { bg: "bg-blue-950/40", border: "border-blue-800/50", hover: "hover:border-blue-500/70 hover:shadow-[0_0_32px_rgba(59,130,246,0.18)]", accent: "text-blue-400", icon: "bg-blue-900/60 text-blue-300", bar: "bg-blue-500", badge: "bg-blue-900/60 text-blue-300 border-blue-700/50" } },
  { id: "5u-12-growth", title: "גדילה ודעיכה", subtitle: "מודלים מעריכיים, ריבית וחצי חיים", icon: LineChart, href: "/5u/topic/grade12/growth-decay", subtopicLinks: [{ label: "מודלים מעריכיים", href: "/5u/topic/grade12/growth-decay" }, { label: "חצי חיים וריבית", href: "/5u/topic/grade12/growth-decay" }], color: { bg: "bg-rose-950/40", border: "border-rose-800/50", hover: "hover:border-rose-500/70 hover:shadow-[0_0_32px_rgba(244,63,94,0.18)]", accent: "text-rose-400", icon: "bg-rose-900/60 text-rose-300", bar: "bg-rose-500", badge: "bg-rose-900/60 text-rose-300 border-rose-700/50" } },
];

const TOPICS_5U: Record<string, typeof TOPICS_5U_10> = {
  "10": TOPICS_5U_10,
  "11": TOPICS_5U_11,
  "12": TOPICS_5U_12,
};

const GRADE_TOPICS: Record<string, typeof TOPICS> = {
  "10": TOPICS_10,
  "11": TOPICS_11,
  "12": TOPICS_12,
};

const GRADE_LABELS: Record<string, string> = {
  "10": 'כיתה י׳',
  "11": 'כיתה י"א',
  "12": 'כיתה י"ב',
};

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
  const [tierDone, setTierDone] = useState(0);

  const refresh = useCallback(() => {
    // Only count sub-topics where ALL 3 levels (basic+medium+advanced) are complete
    const completedCount = subtopicHrefs.filter(href => {
      // Convert "/topic/grade10/algebra-parabola" → "grade10/algebra-parabola"
      const id = href.replace(/^\/topic\//, "");
      return isSubtopicComplete(id);
    }).length;
    setTierDone(completedCount);
  }, [subtopicHrefs]);

  useEffect(() => {
    refresh();
    window.addEventListener("math-progress-update", refresh);
    return () => window.removeEventListener("math-progress-update", refresh);
  }, [refresh, topicId]);

  // Progress bar fills ONLY based on fully-completed sub-topics (3/3 each)
  const pct = total > 0 ? (tierDone / total) * 100 : 0;
  const allComplete = tierDone === total && total > 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">{tierDone}/{total} נושאי משנה הושלמו</span>
        {allComplete && <span className="text-emerald-400 font-semibold">הושלם ✓</span>}
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${allComplete ? "bg-emerald-400" : accentClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Topic Card ───────────────────────────────────────────────────────────────

function TopicCard({ topic }: { topic: typeof TOPICS[number] & { href?: string } }) {
  const Icon = topic.icon;
  const c = topic.color;
  const cardHref = (topic as { href?: string }).href || `/topic/${topic.id}`;
  return (
    <Link
      href={cardHref}
      onClick={() => markVisited(cardHref, topic.title, topic.title)}
      className={`group block rounded-2xl border p-4 sm:p-6 transition-all duration-300 hover:scale-[1.015] hover:-translate-y-0.5 ${c.bg} ${c.border} ${c.hover}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
          <Icon size={20} />
        </div>
        <span className={`text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border ${c.badge}`}>
          {topic.id.startsWith("3u-") ? "3" : topic.id.startsWith("5u-") ? "5" : "4"} יח&quot;ל
        </span>
      </div>

      {/* Title */}
      <h3 className={`text-base sm:text-lg font-bold mb-0.5 ${c.accent}`}>{topic.title}</h3>
      <p className="text-slate-400 text-[11px] sm:text-xs mb-3 sm:mb-4 leading-relaxed">{topic.subtitle}</p>

      {/* Sub-topic list */}
      <div className="space-y-1 sm:space-y-1.5 mb-4 sm:mb-5">
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
      <div className="flex-1 flex items-center gap-2 bg-[#00d4ff]/5 border border-[#00d4ff]/30 rounded-xl px-3 py-2.5 animate-[fadeSlideIn_0.3s_ease-out]">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-500">{pick.topic}</p>
          <p className="text-xs font-semibold text-white truncate">{pick.label}</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Link
            href={pick.href}
            className="bg-[#00d4ff] text-[#0f172a] font-bold text-[10px] px-2.5 py-1.5 rounded-lg hover:bg-[#00b8d9] transition-colors"
          >
            התחל
          </Link>
          <button onClick={roll} className="border border-slate-600 text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors">
            <Shuffle size={12} />
          </button>
        </div>
      </div>
    );
  }
  return (
    <button
      onClick={roll}
      className="flex-1 flex items-center justify-center gap-2 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/15 border border-[#00d4ff]/30 hover:border-[#00d4ff]/60 text-[#00d4ff] rounded-xl px-3 py-2.5 transition-all duration-200 group"
    >
      <Zap size={14} />
      <span className="text-xs font-medium">תרגיל אקראי</span>
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
          className="bg-slate-800 border border-[#00d4ff]/50 rounded-lg px-3 py-1 text-white text-3xl sm:text-4xl font-extrabold w-36 sm:w-44 focus:outline-none"
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
  return null;
}

function ContinueCard() {
  const [last, setLast] = useState<{ label: string; href: string; topicTitle: string } | null>(null);
  useEffect(() => { setLast(getLastVisited()); }, []);
  if (!last) return (
    <div className="rounded-2xl border border-slate-700/40 bg-slate-800/30 p-5 sm:p-6 text-center">
      <p className="text-slate-500 text-sm">עדיין לא התחלת — בחר נושא למטה</p>
    </div>
  );
  return (
    <Link
      href={last.href}
      className="group flex items-center gap-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/40 p-5 sm:p-6 transition-all duration-200"
    >
      <div className="w-12 h-12 rounded-xl bg-cyan-500/10 group-hover:bg-cyan-500/20 flex items-center justify-center shrink-0 transition-colors">
        <Clock size={22} className="text-cyan-400/70 group-hover:text-cyan-400" />
      </div>
      <div className="flex-1 min-w-0 text-right">
        <p className="text-white font-bold text-sm sm:text-base">המשך מאיפה שעצרת</p>
        <p className="text-cyan-400/60 text-xs sm:text-sm truncate mt-0.5">{last.topicTitle}</p>
      </div>
      <ArrowLeft size={18} className="text-cyan-500/30 group-hover:text-cyan-400 transition-colors shrink-0" />
    </Link>
  );
}

function RandomCard() {
  const roll = useCallback(() => {
    const pick = RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)];
    window.location.href = pick.href;
  }, []);
  return (
    <button
      onClick={roll}
      className="group flex items-center gap-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/40 p-5 sm:p-6 transition-all duration-200 w-full text-right"
    >
      <div className="w-12 h-12 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 flex items-center justify-center shrink-0 transition-colors">
        <Zap size={22} className="text-purple-400/70 group-hover:text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm sm:text-base">תרגיל אקראי</p>
        <p className="text-purple-400/60 text-xs sm:text-sm mt-0.5">הגרל שאלה מהבנק</p>
      </div>
      <Shuffle size={16} className="text-purple-500/30 group-hover:text-purple-400 transition-colors shrink-0" />
    </button>
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

export default function Dashboard({ initialGrade, initialUsername, initialUnits }: { initialGrade: string; initialUsername: string; initialUnits: string }) {
  const { openChat } = useChat();

  // Sync server-side values to localStorage for cross-page instant access
  useEffect(() => {
    if (initialGrade) localStorage.setItem("math-grade", initialGrade);
    if (initialUsername) localStorage.setItem("math-username", initialUsername);
    if (initialUnits) localStorage.setItem("math-units", initialUnits);
  }, [initialGrade, initialUsername, initialUnits]);

  const gradeTopics = GRADE_TOPICS[initialGrade] || TOPICS;
  const gradeLabel = GRADE_LABELS[initialGrade] || 'כיתה י"א';
  const comingSoonTopics = initialUnits === "3" ? (TOPICS_3U[initialGrade] || [])
    : initialUnits === "5" ? (TOPICS_5U[initialGrade] || [])
    : [];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white" dir="rtl">

      {/* ── Top nav bar ── */}
      <header className="sticky top-0 z-40 bg-[#0a0f1e]/90 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-[#00d4ff]" />
            <span className="font-bold text-white text-sm">מתמטיקה + AI</span>
            <span className="text-slate-600 mx-1 hidden sm:inline">|</span>
            <span className="text-[#00d4ff]/60 text-xs font-medium hidden sm:inline">{gradeLabel} • {initialUnits} יח&quot;ל</span>
          </div>
          <div className="flex items-center gap-2">
            <ShareButton />
            <Link href="/onboarding" className="text-slate-500 hover:text-slate-200 transition-colors p-1.5" title="שנה כיתה">
              <Settings size={15} />
            </Link>
            <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors p-1.5" title="יציאה">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-12">

        {/* ── Premium hero ── */}
        <section className="relative overflow-hidden rounded-3xl bg-slate-900/40 backdrop-blur-md border border-slate-800/60">
          {/* Glow effects */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "radial-gradient(ellipse 50% 70% at 10% 50%, rgba(0,212,255,0.06) 0%, transparent 60%), radial-gradient(ellipse 40% 60% at 90% 30%, rgba(139,92,246,0.04) 0%, transparent 60%)"
          }} />

          <div className="relative p-6 sm:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 items-center">

              {/* Right: Greeting */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400/70 font-semibold uppercase tracking-widest">לומד פעיל</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight mb-2">
                  שלום, <NameGreeting />
                </h1>
                <p className="text-cyan-400/80 text-lg sm:text-xl font-semibold">מוכן להמשיך לתרגל?</p>
                <p className="text-slate-500 text-sm mt-2 hidden sm:block">בחר נושא, פתור שלב אחר שלב, קבל עזרה מה-AI כשצריך.</p>
              </div>

              {/* Left: Action cards */}
              <div className="flex flex-col gap-3 sm:gap-4">
                {/* Continue card */}
                <ContinueCard />
                {/* Random card */}
                <RandomCard />
              </div>
            </div>
          </div>
        </section>

        {/* ── Topic grid ── */}
        <section className="space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white">הנושאים שלך</h2>
            <span className="text-slate-600 text-xs sm:text-sm">{gradeTopics.length} יחידות</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {initialUnits === "3" ? (
              comingSoonTopics.map(t => <TopicCard key={t.id} topic={t as typeof TOPICS[number]} />)
            ) : initialUnits === "5" ? (
              comingSoonTopics.map(t => <TopicCard key={t.id} topic={t as typeof TOPICS[number]} />)
            ) : (
              gradeTopics.map(t => <TopicCard key={t.id} topic={t} />)
            )}
          </div>
        </section>

        {/* ── Slim footer ── */}
        <footer className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-[#00d4ff]" />
            <span>מתמטיקה + AI &copy; 2026</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/onboarding" className="hover:text-slate-300 transition-colors">שנה כיתה</Link>
            <a href="mailto:info@math-ai.co.il" className="hover:text-slate-300 transition-colors">צור קשר</a>
          </div>
        </footer>

      </main>
    </div>
  );
}
