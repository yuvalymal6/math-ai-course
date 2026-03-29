# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

## Architecture

Next.js 16 App Router project with Tailwind CSS and TypeScript.

**Routes:**
- `/` — Marketing landing page (`app/page.tsx`) — fully client-side, RTL Hebrew
- `/students-beta` — Password-protected student portal (`app/students-beta/page.tsx`) — password: `math2026` (client-side only, no backend auth)

**Layout:** `app/layout.tsx` sets `<html lang="he" dir="rtl">` globally for full RTL support.

**Color palette:** Deep blue `#0f172a` (background), electric cyan `#00d4ff` (accent), white text on dark sections.

**Icons:** `lucide-react` throughout.

## Key patterns

- All interactive components use `"use client"` directive (accordion, FAQ, password gate, copy-to-clipboard)
- The students-beta page has two states: locked (password form) and authenticated (content view), managed with `useState` — no cookies or localStorage persistence
- Copy-to-clipboard uses the Web Clipboard API with a 2-second "copied" feedback state

---

## THE GOLDEN PROTOCOL — MATHEMATICS + AI

This is the authoritative design spec for every student exercise page in this codebase. **All new topic pages must follow this protocol exactly.**

### 1. Structure: The Vertical Flat-Flow

- **NO TABS.** Everything is one long, vertically scrolling page. No `LevelSelector`, no tab switching.
- **Fixed order:** Level 1 (Guiding) → Level 2 (Training) → Level 3 (Mastery) → Lab.
- **Strict locks:** Level N+1 is invisible or visually locked (Lock icon + explanation text) until Level N is fully completed. Completion criteria:
  - Level 1 complete: all self-report toggles ("סיימתי עם AI") are checked.
  - Level 2 complete: all keyword validations pass (`l2Status === "ok"`).
  - Level 3 complete: student submits (80+ chars entered, button clicked).

### 2. The Prompt-Coach Ladder (CRITICAL)

#### Level 1 — "The Copy-Paste Era" (Guiding)
- Presents the problem with a **Silent SVG diagram**.
- Each step has:
  1. A **plain-language description** of what to do (no solution, no numbers).
  2. A **"העתק פרומפט" button** — copies a pre-written Hebrew AI-tutor prompt to clipboard using `navigator.clipboard.writeText`. Shows "הועתק!" + `Check` icon for 2 seconds.
  3. A **"סיימתי עם AI" toggle** — self-reported completion. Step N+1 is locked until Step N is toggled on.
- No validation beyond the toggle. Trust the student's self-report.

#### Level 2 — "The Keyword Era" (Training)
- A new, related problem with a **Silent SVG diagram**.
- Student types a free-form Hebrew prompt in a `<textarea>`.
- **Keyword pills** render below the textarea — one pill per required keyword. Pills turn green as each keyword appears live (`.includes(kw)` check on every keystroke).
- A **"בדוק" button** runs the full validation:
  - All keywords found → `status: "ok"` → green confirmation message + section locks.
  - Any keyword missing → `status: "hint"` → amber `HintBox` with coaching text. Student can revise and retry.
- The textarea and button are disabled once `status === "ok"`.

#### Level 3 — "The Mastery Era" (Mastery)
- A harder, parameter-based or multi-step problem with a **Silent SVG diagram**.
- Single `<textarea>` with **no keyword requirements** — only a character count gate.
- A **progress bar** fills from 0% to 100% as the student types (capped at `GATE_CHARS`, default 80).
- **"שלח לחונך" button** is `disabled` and visually greyed (`cursor-not-allowed`) until `text.length >= GATE_CHARS`.
- On submit: show a `CheckCircle2` confirmation card. The textarea disappears.

### 3. Visuals & Graphics

#### Island Containers (Labs)
Interactive lab sections use the **Island Protocol**:
```tsx
style={{ border: "8px solid #334155", borderRadius: "40px", padding: "2.5rem", background: "#020617" }}
```
Apply to the outer `<section>` of every lab component.

#### Silent SVG Diagrams (CRITICAL)
Every level gets its own SVG diagram. Rules:
- **NO numbers** (no `6`, `4`, `3`, no measurements).
- **NO computed answers** (no `√52`, no `7.2`).
- **NO spoilers** — no pre-drawn solutions, no intermediate results, no hint lines that reveal the method.
- Show only: geometry shapes, vertex labels (A, B, C… or A′, B′…), highlighted relevant elements (diagonals, angles) in muted colors.
- Highlighted elements use color to communicate role, not value:
  - **Amber** (`#f59e0b`): base-level element (face diagonal, d).
  - **Violet** (`#a78bfa`): space-level or advanced element (space diagonal, angle).
  - **Emerald** (`#34d399`): solution path or confirmed step.
  - **Slate** (`#64748b`): supporting/auxiliary elements (dashed projections, hidden edges).
- Hidden edges in 3D diagrams: `strokeDasharray="4,3"`, color `#334155`.
- viewBox should fit content with ~15px padding. No hardcoded pixel sizes on `<svg>` — use `className="w-full max-w-sm mx-auto"`.

#### Labs
Every page ends with an interactive Lab **above** the footer back-link. Lab features:
- `<input type="range">` sliders for each parameter.
- Live computation on slider change (no submit button).
- Display computed values in a clean `grid grid-cols-N gap-3` tile layout.
- Dynamic SVG that rerenders on every slider change.
- Descriptive label below the SVG or tiles indicating the mathematical interpretation (e.g., "סדרה הנדסית מתפצלת").

### 4. Route Architecture

```
/topic/grade12/
├── page.tsx                        ← Main Grade 12 Hub (4 cards)
├── series/
│   ├── page.tsx                    ← Series Hub (arithmetic, geometric)
│   └── recursion/page.tsx          ← Recursion exercise (Flat-Flow)
├── space-geometry/
│   ├── page.tsx                    ← Space Geometry Hub
│   └── box/page.tsx                ← Box exercise (Flat-Flow)
├── growth-decay/
│   └── page.tsx                    ← Growth & Decay Hub
└── calculus/
    ├── page.tsx                    ← Calculus Hub (polynomials, eˣ, ln x, integrals)
    └── calculus-polynomial/
        ├── page.tsx                ← Polynomial Hub (3 sub-cards)
        ├── investigation/page.tsx  ← Extrema & classification (tabbed, pre-Golden)
        ├── full-investigation/page.tsx ← Full curve sketching (tabbed, pre-Golden)
        └── parameters/page.tsx     ← Parameter problems (tabbed, pre-Golden)
```

**Hub card pattern:** Every hub uses a `SUBTOPICS` (or `SECTIONS`) array with `ready: boolean`. `ready: true` → clickable `<Link>` with glow animation. `ready: false` → static `<div>` with `opacity-50 cursor-not-allowed` and "בקרוב" badge.

### 5. State Management Conventions

```tsx
// Level 1
const [l1Done, setL1Done] = useState<boolean[]>(Array(N).fill(false));
const l1Complete = l1Done.every(Boolean);

// Level 2 (single step)
const [l2Text, setL2Text]     = useState("");
const [l2Status, setL2Status] = useState<"idle" | "ok" | "hint">("idle");
const l2Complete = l2Status === "ok";

// Level 2 (multi-step)
const [l2Texts,  setL2Texts]  = useState<string[]>(Array(N).fill(""));
const [l2Status, setL2Status] = useState<("idle"|"ok"|"hint")[]>(Array(N).fill("idle"));
const l2StepLocked = (i: number) => i > 0 && l2Status[i - 1] !== "ok";
const l2Complete = l2Status.every(s => s === "ok");

// Level 3
const [l3Text, setL3Text]           = useState("");
const [l3Submitted, setL3Submitted] = useState(false);
const GATE_CHARS = 80;
const l3Ready = l3Text.length >= GATE_CHARS;
```

### 6. Color System

| Role | Tailwind | Hex |
|---|---|---|
| Page background | `bg-[#0a0f1e]` | `#0a0f1e` |
| Card background | `bg-[#0f172a]` | `#0f172a` |
| Lab background | `background: "#020617"` | `#020617` |
| Accent (cyan) | `text-[#00d4ff]` | `#00d4ff` |
| Amber (series / L1) | `text-amber-400` | `#f59e0b` |
| Emerald (geometry) | `text-emerald-400` | `#34d399` |
| Indigo (calculus) | `text-indigo-400` | `#6366f1` |
| Violet (mastery) | `text-violet-400` | `#a78bfa` |
| Rose (growth/decay) | `text-rose-400` | `#fb7185` |
| Border default | `border-slate-700` | `#334155` |
| Border island | inline `#334155` 8px solid | `#334155` |
