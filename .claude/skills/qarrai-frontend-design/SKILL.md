---
name: qarrai-frontend-design
description: Qarrai Academy's design system and frontend rules: visual identity ("The Modern House of Knowledge"), colour/typography/spacing tokens, the three mentors' visual personalities, motion rules, states, accessibility, RTL Arabic, and how to respect the Supabase API contracts. Use for ANY frontend work in this repository (pages, components, styling, animation, charts, interactive exercises, mentor visuals, copy layout) and before applying advice from the generic design skills, which this skill overrides.
---

# Qarrai Academy: frontend design

Qarrai Academy is a real learning platform used by **children and teenagers (and their parents)**. Three AI mentors teach mathematics, sciences and languages. The interface must feel like entering a warm, distinguished academy: **The Modern House of Knowledge**, which blends Mediterranean academic heritage, contemporary edtech, and three distinctive mentor personalities.

**Tone:**
- child-friendly, never childish
- sophisticated, never intimidating
- rich, never cluttered

**Precedence:** this skill wins over generic advice from `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines` and the animation skills. Use those for craft, checklists and reviews, never to change the palette, fonts or overall style. For example, ui-ux-pro-max may suggest "Claymorphism" or a blue/amber palette for education; ignore that.

## 0. Before you change anything

1. Read the code you are about to touch, then `src/index.css` (tokens), `src/data/mentors.ts` (mentor identity) and `src/components/ui/*`.
2. **Do not change backend contracts.** All server calls go through `src/services/api.ts` (Edge Functions) and `src/services/data.ts` (RLS reads and RPCs). Types come from `supabase/functions/_shared/api.ts`. The UI never calls the AI provider, never writes trusted tables, and never stores secrets.
3. There is **no demo mode**. Never mock data in production code or add fake fallbacks. Show real errors.
4. Keep the `data-testid` attributes that tests rely on (`tests/e2e/real-flow.spec.ts`, component tests). If you rename one, update its test in the same change.

## 1. Tokens: use them, never hard-code

Defined with Tailwind 4 `@theme` in `src/index.css`. Use the Tailwind utilities (`bg-ink`, `text-teal-deep`, …); add new tokens there, never inline hex codes in components.

| Token | Hex | Use |
| --- | --- | --- |
| `ink` / `ink-soft` | `#142337` / `#2a3a50` | Primary text, primary buttons, dark bands |
| `parchment` / `parchment-deep` / `paper` | `#F4EBDD` / `#EADCC6` / `#FBF7F0` | Page background / sections / cards and inputs |
| `gold` → `gold-deep` | `#C5A36B` → `#7A5A22` | Accents, medallions, highlights → **text** |
| `teal` → `teal-deep` | `#4C9C91` → `#2B6159` | Success, "verified", focus ring → **text** |
| `terracotta` → `terracotta-deep` | `#D77C65` → `#9C4430` | Errors, warnings, attention → **text** |
| `slate` → `slate-deep` | `#8294A8` → `#4A5B6E` | Muted UI → secondary **text** |

**Contrast rule:**
- Base brand colours (gold, teal, terracotta, slate) are 2.0–3.0:1 on parchment. Use them for fills, borders, icons and decoration only.
- **Text uses `ink` or a `*-deep` token**: all are ≥ 5.3:1 on parchment and paper.
- White text is fine on `ink` and every `*-deep`.
- Verify any new pair is ≥ 4.5:1 (body text) or ≥ 3:1 (large text, UI shapes).

**Typography:**
- `font-display` (DM Serif Display) for headings only.
- `font-sans` (Inter) for UI and body.
- Arabic falls back to IBM Plex Sans Arabic automatically; `html[lang=ar]` switches body text to it.

| Element | Size and style |
| --- | --- |
| Page title | `text-4xl` |
| Section | `text-2xl`–`text-3xl` |
| Body | `text-[15px]`–`text-base`, `leading-relaxed` |
| Meta | `text-xs text-slate-deep` |

Never set Arabic in DM Serif (no Arabic glyphs). Never use letter-spacing on Arabic.

**Shape and space:**
- Cards: `rounded-2xl`; hero and mentor surfaces: `rounded-3xl`; pills, buttons and badges: `rounded-full`.
- The **arch** (`--radius-arch`, the portrait frame) is Qarrai's signature shape. Use it for mentor frames and occasional hero accents, never on ordinary cards.
- Spacing follows Tailwind's 4-px scale. Pages use `max-w-7xl px-4 sm:px-6`, sections `py-8`/`py-16`, card padding `p-5`/`p-6`, gaps `gap-4`/`gap-6`.
- Shadows: `shadow-[var(--shadow-card)]` only. No neon glows and no stacked shadows.

## 2. The three mentors: distinct people, one design system

Each mentor is a **theme applied through CSS variables**, never a separate component set. Wrap any mentor-specific surface in `style={mentorStyle(mentor)}` and use `var(--mentor)`, `var(--mentor-deep)` and `var(--mentor-soft)`. Shared across all three: layout grid, component shapes, type scale, motion durations, arch frame, gold medallion.

| | **Ba9lewa** · بقلوة | **Ibn Batbuta** · ابن بطبوطة | **Falfoul** · فلفول |
| --- | --- | --- | --- |
| Domain | Mathematics, Logic, Statistics | Physics, Chemistry, Biology | Arabic, French, English, literature |
| Personality | Analytical, patient, precise, structured | Curious, energetic, adventurous, creative | Eloquent, witty, precise, appreciative of beauty |
| Character | Baklava with round glasses, ruler and pencil | Batbout-bread explorer with goggles, red cap, blue scarf | Red gummy-bear scholar with gold glasses, bow tie, scroll |
| Colour (base / deep / soft) | Antique Gold `#C5A36B` / `#7A5A22` / `#F1E6D0` | Sage Teal `#4C9C91` / `#2B6159` / `#DDEDEA` | Terracotta `#D77C65` / `#9C4430` / `#F6E0D8` |
| Symbol and motif | `∑` · fine grid, golden spiral (`motif-grid`) | `⚛` · orbits and particles (`motif-orbits`) | `ض` · ruled lines and a calligraphic stroke (`motif-lines`) |
| Composition | Aligned, symmetrical, numbered steps, tabular figures | Diagonal energy, slight rotation, discovery reveals | Generous margins, editorial rhythm, pull-quotes |
| Motion character | Calm, linear-precise, short (150–220 ms), no bounce | Lively spring (low bounce), staggered reveals | Graceful ease-out (250–320 ms), text-led fades |
| UI accents | Step counters, checkmarks on verified maths | "Explorer's challenge" callouts, experiment cards | `~~error~~ → **fix**` corrections, vocabulary chips |

**Character art (final):** four states per mentor (`idle`, `listening`, `thinking`, `talking`) in `src/assets/mentors/<id>_<state>.webp`, produced from the originals in `design/mentors/source/` by `scripts/optimize-mentor-art.mjs` (one union crop per mentor so the states line up).
- Render with `MentorCharacter` (arch alcove, cross-fade between states, all states preloaded) or `MentorAvatar` (round face crop). Never `<img>` the files directly.
- Drive the state with `useCharacterState({ pending, typing, speaking })`: typing → listening, waiting for the AI → thinking, answer just arrived or read aloud → talking, otherwise idle. Under reduced motion the change is instant.
- `alt` is localised (name, character, state). Pass `decorative` when the name is already announced next to it.
- Mentor display text (domain, tagline, description, topics…) is localised through `useLocalizedMentor` / `useMentorLocalizer` (`src/data/mentorText.ts`); never print `mentor.domain` etc. directly in a component.

Avoid: a mentor becoming a different app (different fonts, radii or layout), stereotypes, or text colours outside the `*-deep` tokens.

## 3. Components

- Build on `src/components/ui` (shadcn style: `cva` variants plus `cn()`). Add shadcn components with `npx shadcn@latest add <name>` (the `shadcn` skill knows how), then **re-theme them to our tokens** before use.
- Components are small, composable and typed. Pages compose them; data loading lives in hooks/services, not in leaf components.
- Use logical properties only (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`/`text-start`), never `left`/`right`. Directional icons get `rtl:-scale-x-100`.
- Every interactive element is a real `<button>`/`<a>`/`<input>` with a visible focus ring (global `:focus-visible` in `index.css`), a hit target of at least 40 px, and an accessible name.
- **No decorative controls that do nothing.** If a button exists, it works and is tested; otherwise it does not ship.

## 4. Motion and media libraries (installed)

Animate to **explain** (cause → effect, spatial continuity, progress, feedback), never to decorate.

- **Always respect `prefers-reduced-motion`**: use Motion's `useReducedMotion()` or the global CSS rule.
- Animate `transform` and `opacity` only (see the `animation-performance` skill). No layout-thrashing properties.
- Durations: micro-interactions 120–200 ms; panels and route changes 200–320 ms; never over 400 ms for UI. Pick the mentor's motion character from §2.

| Library | Use it for | Rules |
| --- | --- | --- |
| `motion` (`import { motion } from "motion/react"`) | Enter/exit (`AnimatePresence`), layout transitions, gestures, staggered reveals | Never import from `framer-motion` as well (breaks `AnimatePresence`). Prefer CSS transitions for simple hover/focus. |
| `lottie-react` | Short designed illustrations (celebrations, mentor idle loops) supplied as Lottie JSON | Self-host the JSON in `src/assets`. Avoid animations with expressions (they need `eval`, blocked by our CSP). Pause off-screen; static frame under reduced motion. |
| `@rive-app/react-canvas` | Interactive mentor characters (state machines reacting to the student) | **Self-host the `.wasm`.** By default it loads from unpkg/jsdelivr, which our CSP blocks and children's privacy forbids. Before first render: `import { RuntimeLoader } from "@rive-app/react-canvas"; import wasmUrl from "@rive-app/canvas/rive.wasm?url"; RuntimeLoader.setWasmUrl(wasmUrl);` (Vite bundles the file from the package). Lazy-load it on mentor pages only (large). |
| `recharts` | Progress charts (activity, accuracy per mentor) | Colours from tokens (mentor `base`; `ink`/`slate` for axes). Always include a text or table equivalent; label axes; no 3D, no gratuitous gradients. |
| `@xyflow/react` | Concept maps and knowledge graphs (e.g. a chapter's ideas) | Lazy-load. Keyboard focus on nodes; each map needs a list view alternative for screen readers. |
| `@dnd-kit/core` + `sortable` + `utilities` | Ordering and matching exercises (sort the steps, match words) | **Configure the `KeyboardSensor`** with `sortableKeyboardCoordinates` and provide `announcements` for screen readers. Grading still goes through `api.grade`. |

**Not installed on purpose:** Three.js / React Three Fiber / Drei. Nothing currently needs 3D; they are heavy, and R3F pins React `<19.4`. Revisit only if a 3D learning module (molecules, geometry solids) is specified.

Lazy-load every heavy library at route or component level (`React.lazy`), as `router.tsx` already does, so the landing and sign-in pages stay light.

## 5. Every screen has real states

Design and implement all of these, not just the happy path:

| State | Requirement |
| --- | --- |
| **Loading** | Skeletons shaped like the content, or the mentor typing indicator. Never a blank screen. Use `aria-busy`/`role="status"`. |
| **Empty** | Explain what will appear and offer the next action (e.g. "Ask Ba9lewa your first question"). |
| **Error** | Show the server's message: `ApiError.message` is written for students. Use `retryAfterSeconds` for rate limits and offer **Retry** where it makes sense. Keep the student's typed text. |
| **Success** | Quiet confirmation (toast/inline), with a subtle celebration for solved exercises (reduced-motion safe). |
| **Disabled** | Visibly disabled, plus *why* (tooltip or helper text). Never disable silently. |
| **Safety** | `status: "safety"` replies (wellbeing/injection) get a calm, distinct but non-alarming style. Never play celebratory animation near them. |
| **Not verified** | `status: "fallback"` replies show the "Not verified · clarification requested" badge; never style them as success. |

## 6. Accessibility and internationalisation

- WCAG 2.2 AA. Full keyboard support (Tab order, Esc closes, arrow keys in menus and lists), screen-reader labels, `aria-live="polite"` for new mentor messages.
- Respect 200 % zoom and text spacing; no text in images.
- Languages EN, FR and AR. `applyDocumentLanguage` sets `<html lang dir>`; layouts must mirror correctly in RTL. Put `dir="auto"` on user- and AI-generated text. Maths (KaTeX) stays LTR inside RTL text.
- Strings live in `src/i18n/strings.ts`. Add all three languages when you add UI chrome.

## 7. Responsive

Mobile-first. Check widths 360, 768, 1024 and 1440:
- **Phone:** the learning space hides the sidebar and keeps the mentor switcher in the header.
- **Tablet:** single column with a collapsible mentor panel.
- **Desktop:** two columns.
- No horizontal scroll. Long Arabic and French words must wrap (`overflow-wrap: anywhere` in chat).

## 8. Avoid (anti-patterns)

- Generic AI-dashboard looks: purple/blue gradients, glassmorphism, neon glows, bento grids of meaningless stats, stock 3D blobs, emoji as icons.
- Inventing metrics or progress the database doesn't hold. Every number comes from `useStudentData()` / `get_children_overview()`.
- Showing parents anything beyond `get_children_overview()` (never chat content or session titles).
- Autoplaying sound or video, infinite attention-grabbing loops, dark patterns, streak-shaming children.

## 9. Testing: interactions, not screenshots

- Component behaviour: Vitest + Testing Library (`src/**/*.test.tsx`). Query by role or label like a user would.
- Flows: Playwright against the **real local stack** (`npm run test:e2e`, needs `npx supabase start`). Extend `tests/e2e/real-flow.spec.ts` for new journeys.
- Before declaring done, run `npm run check` (typecheck, lint, unit, build). For UI changes, also drive the page in the browser (keyboard and mouse, RTL, mobile width, reduced motion) and use `review-animations` / `web-design-guidelines` for a final audit.

## 10. Which skill when

| Task | Skill |
| --- | --- |
| Any Qarrai UI work | **this skill first** |
| Aesthetic direction and craft | `frontend-design` (within §1–2 limits) |
| UX rules, accessibility and component checklists | `ui-ux-pro-max` (search rules/stacks; **ignore** its palette and style picks) |
| React performance and patterns | `vercel-react-best-practices` |
| Final UI audit | `web-design-guidelines`, `review-animations` |
| Adding primitives | `shadcn` |
| Motion design | `animate`, `choreograph`, `emil-design-eng`, `animation-performance`, `gestures`, `motion-design` (LottieFiles) |
