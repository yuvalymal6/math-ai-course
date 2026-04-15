# בריף פרויקט — Math AI Course

> עודכן לאחרונה: אפריל 2026

---

## 1. תיאור הפרויקט וטכנולוגיות

**Math AI Course** הוא פלטפורמת לימוד מתמטיקה מבוססת AI בעברית, שמלמדת תלמידי תיכון לכתוב פרומפטים אפקטיביים ולעבוד עם AI כשותף לימוד — לא כמחשבון.

### עיקרון מרכזי
הפלטפורמה לא נותנת תשובות. היא מלמדת את התלמיד להשתמש ב-AI (Claude / ChatGPT) כמורה סוקרטי. כל תרגיל בנוי כ"מסלול פרומפטים" בן 3 רמות.

### טכנולוגיות
| שכבה | טכנולוגיה | גרסה |
|---|---|---|
| Framework | Next.js App Router | ^16.1.6 |
| UI | React | 19.2.3 |
| Typing | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| Icons | lucide-react | ^0.577.0 |
| Math render | KaTeX | ^0.16.39 |
| Animation | Framer Motion | ^12.36.0 |
| AI (chat) | Anthropic SDK (claude-opus-4-6) | ^0.78.0 |
| DB / Auth | Supabase (PostgreSQL) | ^2.101.0 |
| Deployment | Vercel (auto-deploy on push) | — |

### פקודות
```bash
npm run dev      # dev server — http://localhost:3000
npm run build    # build ייצור
npm run lint     # ESLint
```

---

## 2. מבנה נתיבים מלא

### מסלולים ראשיים
| נתיב | תיאור |
|---|---|
| `/` | דף נחיתה שיווקי (Hebrew RTL, client-side) |
| `/login` | דף כניסה — אימייל + סיסמה |
| `/onboarding` | בחירת כיתה לאחר כניסה |
| `/onboarding/units` | בחירת יחידות (3 / 5) |
| `/wizard` | אשף — ניווט חכם לנושא רלוונטי |
| `/students-beta` | פורטל ישן (protected, סיסמה: `math2026`) |

---

### מסלול 3 יחידות — `3u/topic/`

#### כיתה י — `3u/topic/grade10/`
| Hub URL | נושא | תת-נושאים (כולם ready:true) |
|---|---|---|
| `/geometry/` | גיאומטריה | משולשים, מרובעים, דמיון, שטח והיקף |
| `/graphs/` | גרפים ופונקציות | לינארית, ריבועית, קריאת גרפים |
| `/probability/` | הסתברות | בסיסית, חיתוך ואיחוד, מותנית |
| `/statistics/` | סטטיסטיקה | ממוצע וחציון, דיאגרמות, טבלת שכיחויות |
| `/word-problems/` | בעיות מילוליות | תרגום מילולי, משוואות מהקשר |

#### כיתה יא — `3u/topic/grade11/`
| Hub URL | נושא | תת-נושאים (כולם ready:true) |
|---|---|---|
| `/geometry/` | גיאומטריה | משולשים דומים, הוכחות, חפיפה |
| `/growth-decay/` | גדילה ודעיכה | גדילה, דעיכה |
| `/linear-algebra/` | אלגברה לינארית | מערכת משוואות, ביטויים אלגבריים |
| `/probability/` | הסתברות | בסיסית, מותנית |
| `/statistics/` | סטטיסטיקה | מדדי מרכז ופיזור, התפלגות נורמלית |
| `/trig/` | טריגונומטריה | sin/cos/tan, משפט סינוסים וקוסינוסים, שטח משולש, סינוסים וקוסינוסים |

#### כיתה יב — `3u/topic/grade12/`
| Hub URL | נושא | תת-נושאים (כולם ready:true) |
|---|---|---|
| `/analytic/` | גיאומטריה אנליטית | נקודות וישרים, מעגל |
| `/linear-programming/` | תכנות לינארי | אילוצים ותחום, פונקציית מטרה |
| `/parabola/` | פרבולה | מודל ריבועי, בעיות קיצון |
| `/solid-geometry/` | גיאומטריה מוצקה | תיבה ומנסרה, גליל |
| `/spatial/` | חשיבה מרחבית | קוביות ומבטים, תרשים מספרים |
| `/statistics/` | סטטיסטיקה | התפלגות נורמלית, סטטיסטיקה תיאורית |

---

### מסלול 5 יחידות — `5u/topic/`

#### כיתה י — `5u/topic/grade10/`
| Hub URL | נושא | תת-נושאים |
|---|---|---|
| `/analytic/` | גיאומטריה אנליטית | יסודות ✅, ישר ✅, מעגל ✅ |
| `/geometry/` | גיאומטריה | משולשים ✅, מרובעים ✅, דמיון ✅ |
| `/pre-calculus/` | פרה-חשבון | לינארית ✅, ריבועית ✅ |
| `/trig-functions/` | פונקציות טריג' | מעגל היחידה ✅, ערכים ✅ |
| `/trig-plane/` | טריג' במישור | חוקי סינוסים וקוסינוסים ✅, שטח ✅ |

#### כיתה יא — `5u/topic/grade11/`
| Hub URL | נושא | תת-נושאים |
|---|---|---|
| `/calculus/` | חדו"א | פונקציות רציונליות ✅, חקירה מלאה ✅, אינטגרל ✅ |
| `/geometry/` | גיאומטריה | מעגלים ✅, משולשים ומרובעים ✅ |
| `/probability/` | הסתברות | בסיסית ✅, מותנית ✅ |
| `/series/` | סדרות | חשבונית והנדסית ✅, אינדוקציה ✅ |
| `/trig/` | טריגונומטריה | שטחים ובעיות ✅, משפט סינוסים וקוסינוסים ✅ |

#### כיתה יב — `5u/topic/grade12/`
| Hub URL | נושא | תת-נושאים |
|---|---|---|
| `/analytic/` | גיאומטריה אנליטית | מעגל ואליפסה ✅, מקומות גיאומטריים ✅ |
| `/complex/` | מספרים מרוכבים | צורה אלגברית ✅, צורה טריגונומטרית ✅ |
| `/exponential/` | אקספוננציאלי | חקירת מעריכית ✅, חקירת לוגריתמית ✅ |
| `/growth-decay/` | גדילה ודעיכה | מודלים מעריכיים ✅, חצי חיים וריבית ✅ |
| `/vectors/` | וקטורים | וקטורים בסיסיים ✅, פירמידה ומרחב ✅ |

---

### מסלול כללי — `topic/` (4 יחידות + נושאים כלליים)

| Hub URL | תת-נושאים |
|---|---|
| `/analytic/` | מעגל, ישר, משיק, בעיות |
| `/calculus/` | פולינומים, רציונלי, שורשים |
| `/grade10/algebra-parabola/` | — |
| `/grade10/analytic/` | — |
| `/grade10/geometry/` | — |
| `/grade10/statistics/` | — |
| `/grade10/trig/` | — |
| `/grade10/trig-applications/` | — |
| `/grade12/calculus/` | exp, אינטגרל, ln |
| `/grade12/growth-decay/` | — |
| `/grade12/series/` | חשבונית, הנדסית, נסיגה |
| `/grade12/space-geometry/` | תיבה, פירמידה |
| `/kitzun/` | גיאומטריה, פונקציות |
| `/probability/` | נורמלי, דף, טבלה, עץ |
| `/statistics/` | תיאורית, רגרסיה |

---

### ספירת דפים
| | דפים ב-app/ |
|---|---|
| דפי תרגול (exercise pages) | ~145 |
| דפי hub | ~40 |
| דפי 3u בסה"כ | ~59 |

---

## 3. מערכת הסוכנים

### מיקום: `agents/`

כל הסוכנים הם קבצי Markdown. הפעלתם דרך Claude Code.

### קבצי הסוכנים
| קובץ | תפקיד |
|---|---|
| `manager.md` | **מנהל איכות** — מתאם, מחליט אם קובץ עומד ברמה 100 |
| `standard-keeper.md` | בודק עמידה בסטנדרט (Golden Protocol) |
| `gap-finder.md` | מזהה פערי תוכן (שאלות חסרות, מעבדה, נוסחאון) |
| `architect.md` | מוודא סדר גלילה ומבנה דף |
| `math-genius.md` | יוצר שאלות, נוסחאון, גרפים, מעבדות, שגיאות נפוצות |
| `creative.md` | אינטראקטיביות, חוויית למידה, ויזואלים |
| `grade10-quality-standard.md` | סטנדרט איכות לכיתה י |
| `grade11-quality-standard.md` | סטנדרט איכות לכיתות יא + 4u |
| `grade12-quality-standard.md` | סטנדרט איכות לכיתה יב |
| `page-structure.md` | תבניות layout |
| `sub-questions.md` | תת-סוכן: שאלות |
| `sub-pitfalls.md` | תת-סוכן: שגיאות נפוצות |
| `sub-formulas.md` | תת-סוכן: נוסחאון |
| `sub-graphs.md` | תת-סוכן: גרפים |
| `sub-labs.md` | תת-סוכן: מעבדות |
| `sub-prompts.md` | תת-סוכן: פרומפטים |
| `flow.html` | דיאגרמת זרימה ויזואלית |

### זרימת עבודה — "רמה 100"

```
┌── שלב א: אבחון (במקביל) ────────────────────────┐
│  standard-keeper  +  gap-finder  +  architect    │
│  → רשימת פערים: קריטי / משני                    │
└─────────────────────────────────────────────────┘
           ↓
┌── שלב ב: יצירה (בזה אחר זה) ───────────────────┐
│  1. math-genius ← פערים + שם קובץ               │
│     (נוסחאון, גרף, שאלות, מעבדה, שגיאות)        │
│  2. creative ← פערים + שם קובץ                  │
│     (אינטראקטיביות, ויזואל)                      │
└─────────────────────────────────────────────────┘
           ↓
┌── שלב ב.5: אימות סדר גלילה ─────────────────────┐
│  architect → תיקון אם יש סטייה                   │
└─────────────────────────────────────────────────┘
           ↓
┌── שלב ג: אימות ─────────────────────────────────┐
│  standard-keeper מחדש                            │
│  ✅ → דוח סופי → git commit + push → Vercel      │
│  ❌ → חזור לשלב ב עם פערים שנותרו               │
└─────────────────────────────────────────────────┘
```

### כלל ברזל
> **אסור לשנות מבנה קיים.** סוכנים מתקנים בלבד — לא משכתבים, לא מארגנים מחדש.

### הפעלת סוכן מנהל
```
קרא agents/manager.md ופעל לפיו על הקובץ: app/5u/topic/grade11/trig/sin-cos-laws/page.tsx
```

---

## 4. מערכת ההתחברות וה-cookies

### זרימת כניסה

```
POST /api/auth/login
  → בדיקת אימייל (רק yuvalymal6@gmail.com מורשה)
  → Supabase auth.signInWithPassword()
  → fallback: סיסמה קשיחה math2026 (userId = "admin-local")
  → שליפת grade + units מטבלת profiles
  → set cookies → redirect
```

### Cookies
| Cookie | תוכן | maxAge |
|---|---|---|
| `math-auth` | userId (מ-Supabase או "admin-local") | 30 יום |
| `math-grade` | כיתה (10/11/12) | 30 יום |
| `math-units` | יחידות (3/5) | 30 יום |

כל ה-cookies: `path: "/"`, `sameSite: "lax"`, HTTP-only.

### Middleware (ניתוב מגן)
`middleware.ts` בשורש הפרויקט בודק cookies לפני כל נתיב מוגן:
- אין `math-auth` → `/login`
- אין `math-grade` → `/onboarding`
- אין `math-units` → `/onboarding/units`

### endpoints
| Method | URL | תפקיד |
|---|---|---|
| `POST` | `/api/auth/login` | כניסה |
| `GET` | `/api/auth/me` | בדיקת סשן → `{ authenticated, username, grade }` |
| `GET` | `/api/auth/logout` | יציאה (מחיקת cookies) |
| `POST` | `/api/auth/grade` | שמירת כיתה |
| `POST` | `/api/auth/units` | שמירת יחידות |

---

## 5. כללי עיצוב

### פלטת צבעים
| תפקיד | Tailwind | HEX |
|---|---|---|
| רקע דף | `bg-[#0a0f1e]` | `#0a0f1e` |
| רקע כרטיס | `bg-[#0f172a]` | `#0f172a` |
| רקע מעבדה | `background: "#020617"` | `#020617` |
| Accent (ציאן) | `text-[#00d4ff]` | `#00d4ff` |
| אמבר (סדרות / L1) | `text-amber-400` | `#f59e0b` |
| אמרלד (גיאומטריה) | `text-emerald-400` | `#34d399` |
| אינדיגו (חדו"א) | `text-indigo-400` | `#6366f1` |
| ויולט (אדון/Red) | `text-violet-400` | `#a78bfa` |
| ורוד (גדילה/דעיכה) | `text-rose-400` | `#fb7185` |
| גבול ברירת מחדל | `border-slate-700` | `#334155` |
| גבול island | inline `#334155` 8px solid | `#334155` |
| רקע בהיר (3u + 5u) | `bg-[#F3EFE0]` | `#F3EFE0` |

### Island Protocol (מעבדות)
```tsx
style={{
  border: "8px solid #334155",
  borderRadius: "40px",
  padding: "2.5rem",
  background: "#020617"
}}
```
מיושם על ה-`<section>` החיצוני של כל מעבדה.

### SVG שקטים — כללים
- **ללא מספרים** — אין `6`, `4`, `3`, אין מדידות
- **ללא תשובות מחושבות** — אין `√52`, `7.2`
- **ללא ספוילרים** — אין שלבי ביניים, אין קווי עזר שמגלים שיטה
- **רק:** צורות, תוויות קודקוד (A, B, C…), אלמנטים מודגשים בצבע

| צבע | תפקיד |
|---|---|
| Amber `#f59e0b` | אלמנט בסיסי (אלכסון פאה, d) |
| Violet `#a78bfa` | אלמנט מתקדם (אלכסון מרחב, זווית) |
| Emerald `#34d399` | נתיב פתרון / שלב מאושר |
| Slate `#64748b` | עזר/עזריה (הקרנות מקווקוות, קצוות נסתרים) |

קצוות נסתרים ב-3D: `strokeDasharray="4,3"`, color `#334155`.
SVG: `className="w-full max-w-sm mx-auto"` — לא px קשוח.

### כרטיסי Hub — תבנית
```tsx
const SUBTOPICS = [
  { id: "xxx", href: "/path/to/xxx", title: "כותרת", subtitle: "...", ready: true },
  { id: "yyy", href: "/path/to/yyy", title: "בקרוב", subtitle: "...", ready: false },
];
// ready:true → <Link> עם אנימציית glow
// ready:false → <div> עם opacity-50 cursor-not-allowed ותגית "בקרוב"
```

---

## 6. מבנה תת-נושא (סדר גלילה)

כל דף תרגיל בנוי כגלילה אנכית, **ללא טאבים**. סדר קבוע:

```
1. כותרת + תגיות (נושא, כיתה, רמת קושי)
2. נוסחאון (FormulaCard / KaTeX)
3. [גרף / SVG רלוונטי]
4. שגיאות נפוצות (PitfallCard)

━━━━ רמה 1 — "עידן ההעתקה" (Guiding) ━━━━
5. כותרת רמה + הסבר
6. שאלה עם SVG שקט
7. שלבים: תיאור → כפתור "העתק פרומפט" → toggle "סיימתי עם AI"
   (שלב N+1 נעול עד שלב N מסומן)

━━━━ רמה 2 — "עידן המילות המפתח" (Training) ━━━━
8. כותרת רמה + הסבר
9. שאלה חדשה עם SVG שקט
10. textarea חופשי
11. pills של מילות מפתח (מתירוקות live)
12. כפתור "בדוק" → status: idle / hint / ok
13. HintBox (amber) אם hint

━━━━ רמה 3 — "עידן השליטה" (Mastery / Red) ━━━━
14. כותרת רמה + הסבר
15. שאלה קשה יותר עם SVG שקט
16. textarea + progress bar (0→100% עד 80 תווים)
17. כפתור "שלח לחונך" (disabled עד 80+ תווים)
18. [אופציונלי: MasterPromptGate לרמה אדומה]
19. כרטיס אישור לאחר שליחה

━━━━ מעבדה ━━━━
20. Island container + sliders + SVG דינמי + tiles
21. לינק חזרה ל-hub
```

---

## 7. מערכת הרמות ובדיקות הפרומפטים

### `calculatePromptScore(text, contextWords)` — `app/lib/prompt-scorer.ts`

**שכבה A — בלוק ופדגוגיה (55 נק' מקסימום)**

| בדיקה | פעולה |
|---|---|
| מילת BLOCK (30 מילים) | → `score: 0, blocked: true` + הודעת שגיאה |
| מילת PEDAGOGY (~120 מילים) | → +25 נק' (בנוסף ל-30 בסיסי) |

מילות BLOCK לדוגמה: `"תפתור"`, `"תחשב"`, `"מה התוצאה"`, `"תביא תשובה"`, `"תגלה לי"`

**שכבה B — context words (45 נק' מקסימום)**

| התאמות | ניקוד |
|---|---|
| 0 מילות context | 0 נק' |
| 1 התאמה | +35 נק' |
| 2+ התאמות | +45 נק' |

**סף מעבר: ≥ 75 נק'**

---

### `validateMasterPrompt(text, knownPrompts, subjectWords?, guidanceWords?, waitWords?)` — רמה אדומה

בדיקת 5 אשכולות:

| אשכול | מה נדרש | מילות מפתח לדוגמה |
|---|---|---|
| **role** | AI מוגדר כמורה/מדריך | `"מורה"`, `"מדריך"`, `"חונך"`, `"מנטור"` |
| **restriction** | איסור מפורש על תשובות | `"אל תפתור"`, `"בלי תשובה"`, `"רק רמז"` |
| **guidance** | בקשת הדרכה מתודולוגית | `"תסביר"`, `"תנחה"`, `"צעדים"`, `"שלבים"` |
| **subject** | ציון הנושא המתמטי | תלוי בדף — מועבר כ-`subjectWords` prop |
| **wait** | בקשה לעצור בין סעיפים | `"חכה"`, `"שלב אחר שלב"`, `"אל תמשיך"` |

**ניקוד לפי מספר אשכולות:**
| אשכולות | ניקוד |
|---|---|
| 5/5 | 90 |
| 4/5 | 85 ← **סף מעבר** |
| 3/5 | 70 |
| 2/5 | 50 |
| 1/5 | 30 |
| 0/5 | 10 |

**בונוס אורך:** +2 נק' (≥100 מילים), +5 נק' (≥140 מילים), מקסימום 100.

**Anti-copy:** Jaccard similarity > 0.30 מול `knownPrompts` → blocked, `score: 0`.

**סף מעבר: ≥ 85 נק'**

---

## 8. Supabase — טבלאות ומבנה

### חיבור — `app/lib/supabaseClient.ts`
```typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

Project URL: `https://ixctxszdvsdjvhnpibot.supabase.co`

### טבלאות

#### `profiles`
| עמודה | סוג | תיאור |
|---|---|---|
| `id` | uuid (FK → auth.users) | מזהה משתמש |
| `grade` | text | כיתה (10/11/12) |
| `units` | integer | יחידות (3/5) |

#### `user_progress`
| עמודה | סוג | תיאור |
|---|---|---|
| `user_id` | uuid | מזהה משתמש |
| `topic_id` | text | e.g. `"statistics/descriptive"` |
| `exercise_id` | text | `"basic"` / `"medium"` / `"advanced"` |
| `completed` | boolean | האם הושלם |
| `updated_at` | timestamp | עדכון אחרון |

Unique constraint: `(user_id, topic_id, exercise_id)`

### API Progress
| Method | URL | פעולה |
|---|---|---|
| `GET` | `/api/progress` | שליפת כל ההתקדמות של המשתמש |
| `POST` | `/api/progress` | upsert השלמת תרגיל בודד |

### אסטרטגיית סינכרון — `app/lib/progress.ts`
```
localStorage (מהיר, sync) ← מקור האמת לUI
     ↕ סינכרון רקע
Supabase (async, persistent) ← מקור האמת לטווח ארוך
```

**פונקציות מרכזיות:**
- `getSubtopicProgress(id)` — שליפת מצב
- `markLevelComplete(id, level)` — סימון השלמה
- `syncFromSupabase()` — מיזוג נתוני Supabase ל-localStorage
- `syncToSupabase()` — שמירה ב-Supabase (fire-and-forget)

### משתני סביבה נדרשים
```
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 9. Chat API — סוקרטס AI

### `POST /api/chat`
```typescript
// Request
{ messages: { role: "user"|"assistant"; content: string }[], topic: string }

// Response: ReadableStream (streaming text)
```

**מודל:** `claude-opus-4-6`, max tokens: 512

**System prompt:** מורה מתמטיקה סוקרטי בעברית — לא נותן תשובות, שואל שאלות מנחות, מפרק לצעדים קטנים, מנתח טעויות.

---

## 10. רכיבי UI מרכזיים — `app/components/`

| קובץ | תפקיד |
|---|---|
| `ChatDrawer.tsx` | chat עם streaming, toggle drawer |
| `MasterPromptGate.tsx` | 5-cluster validation UI לרמה אדומה |
| `MarkComplete.tsx` | סימון השלמת תרגיל |
| `LabMessage.tsx` | הודעות מעבדה |
| `SubtopicProgress.tsx` | תצוגת התקדמות |
| `GradesBarChart.tsx` | גרף עמודות ציונים |
| SVG Diagrams | `AnalyticParallelogramDiagram`, `RectangleDiagram`, `TrigAdvancedDiagram` |

---

## 11. State Management — קונבנציות

```tsx
// רמה 1
const [l1Done, setL1Done] = useState<boolean[]>(Array(N).fill(false));
const l1Complete = l1Done.every(Boolean);

// רמה 2 — שלב בודד
const [l2Text, setL2Text]     = useState("");
const [l2Status, setL2Status] = useState<"idle"|"ok"|"hint">("idle");
const l2Complete = l2Status === "ok";

// רמה 2 — מרובה שלבים
const [l2Texts,  setL2Texts]  = useState<string[]>(Array(N).fill(""));
const [l2Status, setL2Status] = useState<("idle"|"ok"|"hint")[]>(Array(N).fill("idle"));
const l2StepLocked = (i: number) => i > 0 && l2Status[i - 1] !== "ok";
const l2Complete = l2Status.every(s => s === "ok");

// רמה 3
const [l3Text, setL3Text]           = useState("");
const [l3Submitted, setL3Submitted] = useState(false);
const GATE_CHARS = 80;
const l3Ready = l3Text.length >= GATE_CHARS;
```

---

## 12. מה הושלם ומה נשאר

### ✅ הושלם

#### תשתית
- [x] מערכת Auth מלאה (login, onboarding, cookies, middleware)
- [x] Supabase — חיבור, progress sync, profiles
- [x] Chat API עם streaming (claude-opus-4-6)
- [x] `calculatePromptScore` — שכבות A+B
- [x] `validateMasterPrompt` — 5 אשכולות + anti-copy
- [x] `MasterPromptGate` component
- [x] `ChatDrawer` component
- [x] Progress tracking (localStorage + Supabase)

#### מסלול 3 יחידות (3u) — **מלא 100%**
- [x] כיתה י: גיאומטריה, גרפים, הסתברות, סטטיסטיקה, בעיות מילוליות
- [x] כיתה יא: גיאומטריה, גדילה/דעיכה, אלגברה, הסתברות, סטטיסטיקה, טריגונומטריה
- [x] כיתה יב: אנליטית, תכנות לינארי, פרבולה, גיאומטריה מוצקה, מרחבית, סטטיסטיקה

#### מסלול 5 יחידות (5u) — **כמעט מלא**
- [x] כיתה י: אנליטית (3), גיאומטריה (3), פרה-חשבון (2), פונקציות טריג' (2), טריג' מישור (2)
- [x] כיתה יא: חדו"א (3), גיאומטריה (2), הסתברות (2), סדרות (2), טריג' — שטחים ✅, סינוסים וקוסינוסים ✅
- [x] כיתה יב: אנליטית (2), מרוכבים (2), אקספוננציאלי (2), גדילה/דעיכה (2), וקטורים (2)

#### מסלול כללי (topic/) — **קיים חלקית**
- [x] חדו"א, אנליטית, קיצון, הסתברות, סטטיסטיקה
- [x] כיתה יב: סדרות, גיאומטריה מרחבית, גדילה/דעיכה

---

### ❌ נשאר לסיום

#### דפי תרגול חסרים
- [x] `5u/topic/grade11/trig/sin-cos-laws/` — ✅ הושלם, hub עודכן ל-ready:true
- [x] `3u/topic/grade10/word-problems/` — שני דפי תרגול קיימים: `translation/page.tsx` + `equations/page.tsx`

#### תשתית / פיצ'רים עתידיים
- [ ] ביטול הגבלת האימייל — פתיחת הרשמה לתלמידים נוספים
- [ ] Dashboard ניהולי — מעקב התקדמות כלל המשתמשים
- [ ] ציוני תלמידים — אינטגרציה עם ה-chat API
- [ ] אנליטיקות — כמה תלמידים השלימו כל רמה

#### תוכן
- [ ] Hub כיתה יב של מסלול 5u — כרטיס "series" / "combinatorics" (אם רלוונטי)
- [ ] מסלול 4u — hub pages עשויים להיות חסרים ל-grade10/grade11
- [ ] תת-נושא `pre-calculus/limits-continuity` — לא קיים בפועל (רק linear + quadratic)

---

*קובץ זה נוצר אוטומטית על בסיס קריאת הקוד. לעדכון — הרץ מחדש.*
