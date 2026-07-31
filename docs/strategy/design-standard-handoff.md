# "The Record" design standard — portable handoff

A self-contained spec of the FairComparisons / AgentScan design system so another
project can adopt it. It is plain CSS custom properties + a small `fc-*` class
layer + three fonts + two tiny motion helpers. No framework lock-in: the CSS is
portable anywhere; only the two motion helpers are React (trivial to port).

Source of truth in this repo: `app/globals.css` (tokens + `fc-*` layer + motion),
`app/layout.tsx` (fonts), `app/components/ScrollReveal.tsx`, `useChoreo` (in
`app/components/demos/FeatureDemos.tsx`), `app/components/Brand.tsx` (score bands).

---

## 1. The thesis (what makes it "The Record")

Editorial-institutional, data-as-authority. It should read like a serious
publication that happens to be an app, not a SaaS landing template. Five
non-negotiables:

1. **A serif carries the voice.** Headlines are a Newsreader serif, with an
   italic-serif accent phrase in the accent blue. Body and UI are a clean
   grotesque; data and labels are monospace.
2. **One ink ground, one blue accent.** Deep navy ink + a single electric blue.
   Semantic colours (green/amber/red) are for state only, never decoration.
   Shadows are always cool-tinted, never warm.
3. **Rotating colour worlds.** Each product pillar gets its own gradient "scene"
   (blue / amber / mint / ink) with white UI cards floating on top. This is the
   signature; a page moves through colour worlds as you scroll.
4. **Bespoke performing mockups, never text-in-a-box.** A feature is shown by a
   small, real-looking UI that *does the thing* (a message arrives, a cursor
   clicks, a bar grows) — not a card with an icon and a paragraph.
5. **Choreographed, progressive-enhancement motion.** The server renders the
   finished state (SEO-safe, no flash, works with no JS); when JS runs and the
   user allows motion, elements reveal and demos play on cue. Reduced-motion
   users see everything, instantly.

The binding quality bar in the origin project was the `/for-agents/grow` page:
multiple choreographed elements, rotating colour worlds, a bespoke performing
mockup per feature, alternating row rhythm. The two failure modes it was defined
against: (a) generic text cards with icons, (b) a single static hero with no
motion. If a page looks like either, it is below standard.

---

## 2. Design tokens (copy verbatim)

```css
:root {
  /* ---------- INK / NEUTRALS ---------- */
  --ink:#0a1733; --ink-2:#13224d; --ink-3:#1c2f63;
  --paper:#ffffff; --cloud:#eef2fb; --cloud-2:#e4eaf7;
  --line:#d7deee; --line-2:#c3cce3; --line-dk:rgba(255,255,255,0.16);
  --slate:#56618a; --slate-2:#7e8cc4;

  /* ---------- ACCENT ---------- */
  --blue:#1f44ff; --blue-deep:#0a23cf; --blue-wash:#e7ebff;
  --flare:#ff4422; --flare-wash:#ffe8e3;   /* rare emphasis only */

  /* ---------- SEMANTIC (state only) ---------- */
  --ok:#0f7a4d; --ok-wash:#e2f3ea;
  --warn:#9a6b00; --warn-wash:#fbeeca;
  --danger:#c0331c; --danger-wash:#ffe8e3;

  /* ---------- DATA RAMP (single hue, colour-blind safe) ---------- */
  --score-90:#1f44ff; --score-75:#5167ec; --score-60:#8090df;
  --score-40:#aab4d6; --score-00:#c5ccda;

  /* ---------- TYPE FAMILIES ---------- */
  --font-serif:var(--font-newsreader), Georgia, "Times New Roman", serif;
  --font-sans:var(--font-hanken), system-ui, -apple-system, sans-serif;
  --font-mono:var(--font-spline), ui-monospace, SFMono-Regular, monospace;

  /* ---------- FLUID TYPE SCALE ---------- */
  --t-display:clamp(44px,7vw,108px);
  --t-h1:clamp(34px,4.6vw,56px);
  --t-h2:clamp(28px,3.2vw,40px);
  --t-h3:clamp(22px,2.4vw,30px);
  --t-h4:20px;
  --t-lede:clamp(18px,1.9vw,22px);
  --t-body:17px; --t-small:14px; --t-micro:12px;
  --lh-tight:1.04; --lh-snug:1.2; --lh-body:1.6;

  /* ---------- SPACING (4px base) ---------- */
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px;
  --s6:32px; --s7:48px; --s8:64px; --s9:96px;

  /* ---------- RADII ---------- */
  --r-xs:6px; --r-sm:8px; --r-md:10px; --r-lg:14px; --r-xl:19px; --r-pill:999px;

  /* ---------- ELEVATION (cool-tinted, never warm) ---------- */
  --sh-1:0 1px 2px rgba(10,23,51,0.06);
  --sh-2:0 4px 14px -6px rgba(10,23,51,0.18);
  --sh-3:0 30px 70px -34px rgba(10,23,51,0.40);

  /* ---------- LAYOUT ---------- */
  --maxw:1180px; --nav-h:60px;
}
```

---

## 3. Typography

Three families, each with one job (bind these `--font-*` vars to whatever the
target stack loads them as; originals are Google Fonts):

- **Newsreader** (serif) → `--font-serif`. Headings, and the italic accent
  phrase. Weights 400/600. The `.italic-serif` class = `font-style:italic;
  color:var(--blue)` for the accent phrase inside a heading, e.g.
  `29,687 agents. <span class="italic-serif">One independent score.</span>`
- **Hanken Grotesk** (sans) → `--font-sans`. Body, UI, buttons. This is the
  default `body` font.
- **Spline Sans Mono** (mono) → `--font-mono`. Data, numbers, eyebrows/kickers,
  breadcrumbs, stamps, anything that should read as "record".

Utility classes: `.eyebrow` / `.kicker` (mono, uppercase, letter-spaced, slate,
small — section labels); `.lede` (large intro paragraph); `.muted` (slate);
`.mono` (mono family); `.italic-serif` (accent). Use `font-variant-numeric:
tabular-nums` wherever digits align in columns.

---

## 4. Colour usage rules

- **Ground:** white/`--paper` or `--cloud` for sections; `--ink` for dark
  sections (`.fc-section--dark`) and the ink scene.
- **Accent:** `--blue` is the only accent. Links, primary CTAs, the italic-serif
  phrase, active states. `--blue-wash` for tinted chips/pills.
- **Semantic:** `--ok / --warn / --danger` (+ their `-wash`) for state only
  (verified, caution, error). Never as a brand accent.
- **Data ramp:** the single-hue `--score-*` ramp (blue → grey) for any 0–100
  score, so it stays colour-blind safe and never implies good/bad by hue.
- **Shadows:** only the cool-tinted `--sh-*` (rgba of the ink). Never a warm/black
  shadow.
- **No em dashes anywhere** (a hard brand rule in the origin project). Use a
  hyphen or a middot.

Score bands (map a 0–100 value to a word + ramp colour):

```
>=90 "Top performer" --score-90 | >=75 "Strong" --score-75 | >=60 "Solid" --score-60
>=40 "Building" --score-40 | else "Limited record" --score-00
```

---

## 5. The scene worlds (the signature)

Each product pillar gets a gradient world; white `.fc-scene__card`s float on it.
Gradients stay mid-saturation so white cards and ink text always keep contrast.

```css
.fc-scene{ position:relative; border-radius:24px; overflow:hidden; padding:clamp(22px,4vw,48px); }
.fc-scene--inbox  { background:linear-gradient(140deg,var(--blue-wash) 0%,#ccd6ff 52%,#93a7ff 100%); }
.fc-scene--planner{ background:linear-gradient(140deg,var(--warn-wash) 0%,#f7dc9b 52%,#efc25e 100%); }
.fc-scene--grow   { background:linear-gradient(140deg,var(--ok-wash) 0%,#c3e8d3 52%,#8fd3ad 100%); }
.fc-scene--ink    { background:linear-gradient(150deg,var(--ink) 0%,var(--ink-2) 60%,var(--ink-3) 100%); color:#fff; }
.fc-scene__card   { background:#fff; border:1px solid var(--line); border-radius:var(--r-md);
                    box-shadow:0 18px 40px rgba(10,23,51,0.16); }
```

Convention: inbox = blue (comms/leads), planner = amber (scheduling), grow = mint
(growth/analytics), ink = dark (record/serious moments, unlock/hero). A page
alternates these as it scrolls so no two adjacent sections share a world. Faint
`.fc-lineart` (SVG line drawings at low opacity) sits inside scenes and page
whitespace; `.fc-float` gives it a very slow ambient drift.

---

## 6. Component layer (`fc-*` catalog)

All are plain classes on top of the tokens. The full set present in the origin:

- **Layout:** `.fc-wrap` (max-width container), `.fc-row` (flex row + gap),
  `.fc-col`, `.fc-grid-2/-3/-4`, `.fc-section` / `.fc-section--dark`, `.fc-band`.
- **Buttons:** `.fc-btn` + variants `--primary` `--ghost` `--ghost-light` `--ink`
  `--quiet` `--block` `--sm` `--lg`, and `.fc-btn--hairline` (adds the
  ink→blue gradient underline bar — the brand's restrained answer to a rainbow
  underline; use on the single primary CTA).
- **Cards:** `.fc-card` + `--pad` `--hover` `--fill` `--dark`.
- **Badges/chips:** `.fc-badge` (+ `--ok --warn --verified --ranked --source
  --sm`), `.fc-chip` / `.fc-chip--active`, `.statchip`, `.score-box` (the
  AgentScore block: big number + `AGENTSCORE` caption + band word, top-border
  coloured by band).
- **Forms:** `.fc-input` `.fc-textarea` `.fc-select` `.fc-field` `.fc-label`
  `.fc-hint` `.fc-range` `.fc-search`.
- **Nav/structure:** `.fc-nav`, `.fc-tabs` / `.fc-tab` / `.fc-tab--active`,
  `.fc-steps` / `.fc-step` (`--active` `--done`), `.fc-table`, `.fc-alert`
  (`--info --ok --warn`), `.fc-lockup` / `.fc-wordmark` (brand mark).
- **Presentation:** `.fc-marquee` (mono-caps fact ticker — the honest substitute
  for a logo wall), `.fc-gauge`, `.fc-rank`, `.fc-seal`, `.fc-avatar`.

Keep specificity flat (single classes, modifiers), so nothing fights the cascade.

---

## 7. The motion system (the crux — get this right)

Every motion rule sits inside `@media (prefers-reduced-motion: no-preference)`,
and the element's **natural (no-animation) state is always the finished, visible
state**. That means if JS never runs, or motion is reduced, or an animation
fails, content simply shows. Nothing is ever left hidden. This is the whole
trick to "flawless" motion that is also SEO-safe and accessible.

Four layers:

**a) Scroll reveal — `.fc-reveal`.** Server renders it visible. A tiny
`ScrollReveal` script, on mount, adds `js-reveal-ready` to `<html>`, which is the
*only* thing that hides `.fc-reveal` (`opacity:0; translateY(26px)`), then
reveals each element as it scrolls into view (sets inline `opacity:1;
transform:none`). It uses a scroll/resize pass (not only IntersectionObserver)
plus a safety timeout, so nothing can be stranded hidden. Stagger via
`--reveal-delay`. Reduced motion / no JS → stays visible.

```css
.fc-reveal{ transition:opacity .65s cubic-bezier(.16,1,.3,1),
            transform .8s cubic-bezier(.22,1.18,.32,1);
            transition-delay:var(--reveal-delay,0s); }
.js-reveal-ready .fc-reveal{ opacity:0; transform:translateY(26px); }
.js-reveal-ready .fc-reveal.fc-reveal--in{ opacity:1; transform:none; }
```

**b) Hero load-in — `.fc-hero-in`, staged `--1..--5`.** CSS-only entrance on page
load (no observer, so no above-the-fold flash). Put it on the hero's headline,
lede, CTA, etc. with ascending stage numbers for a cascade.

```css
@keyframes fcHeroIn{ from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
@media(prefers-reduced-motion:no-preference){
  .fc-hero-in{ opacity:0; animation:fcHeroIn .7s cubic-bezier(.16,1,.3,1) forwards; }
  .fc-hero-in--1{animation-delay:.04s} .fc-hero-in--2{animation-delay:.16s}
  .fc-hero-in--3{animation-delay:.28s} .fc-hero-in--4{animation-delay:.40s}
  .fc-hero-in--5{animation-delay:.52s}
}
```

**c) Dynamic mount — `.fc-pop-in` / `.fc-tab-in`.** For content that appears
after first paint (search results, tab switches, live-loaded cards): a
short entrance that plays on DOM insert, no observer. `backwards` fill only;
natural state visible. Stagger `.fc-pop-in` via inline `animation-delay`.

**d) Choreography — `.fc-cue` + `data-on` (THE contract, plus the #1 gotcha).**
Elements *inside* a performing mockup wait invisible until the demo component
flips them on in sequence (a message arrives, buttons appear after the AI
"finishes typing"). The CSS keys on the attribute value **exactly `"1"`**:

```css
@media(prefers-reduced-motion:no-preference){
  .fc-cue{ opacity:0; transform:translateY(14px) scale(.97); }
  .fc-cue[data-on="1"]{ opacity:1; transform:none;
    transition:opacity .5s cubic-bezier(.16,1,.3,1), transform .6s cubic-bezier(.22,1.25,.32,1); }
  .fc-cue--pop{ transform:scale(.7); }        /* springier arrival */
  .fc-cue--pop[data-on="1"]{ transition:opacity .35s ease-out, transform .45s cubic-bezier(.2,1.6,.35,1); }
}
```

> **GOTCHA (this bit us, twice): the attribute must be the string `"1"` or
> absent — never a raw boolean.** In JSX `data-on={step >= n}` serializes `true`
> to `data-on="true"`, which matches *nothing*, so every cue stays invisible and
> the demo renders blank. Always write `data-on={step >= n ? "1" : undefined}`.

Companion cue elements, same `data-on="1"` contract: `.fc-chain__link` (dotted
connector that draws in per workflow step), `.fc-democursor` (a dot that glides
to a target and "clicks" — coordinates via `--cx-from/-to`, `--cy-from/-to`),
`.fc-ping` (radar pulse), `.fc-type-cursor` (typing caret).

**The driver — `useChoreo(steps, timings)`.** A ~25-line hook: an
IntersectionObserver (threshold 0.4) starts a one-shot timeline when the mockup
scrolls in, advancing `step` 0→N on the given millisecond `timings`; the demo
renders each cue's `data-on` from `step >= n ? "1" : undefined`. It no-ops under
reduced motion (everything visible). Replay-on-scroll variants reset `step` and
re-run. Server renders the *finished* step so no-JS shows the completed mockup.

```jsx
const { step, ref } = useChoreo(4, [350, 950, 1550, 2250]);
// <div ref={ref} className="fc-scene fc-scene--grow"> ...
//   <div className="fc-cue" data-on={step >= 1 ? "1" : undefined}> ... </div>
```

Ambient: `.fc-float` (7s, ±7px drift so scenes never sit frozen), `.fc-marquee`
(36s fact ticker, pauses on hover, single static copy under reduced motion).

---

## 8. Principles / do & don't

- **Do** open a section with a mono `.eyebrow` label, an `.fc-reveal` heading with
  an `.italic-serif` accent phrase, then the content in a colour-appropriate
  `.fc-scene`.
- **Do** show a feature with a bespoke performing mockup (real UI + `.fc-cue`
  choreography), alternate the scene world each section, and give the single
  primary CTA the `.fc-btn--hairline` bar.
- **Don't** ship a feature as an icon + paragraph card. Don't use more than one
  accent colour. Don't use warm shadows, em dashes, or a hue-coded score.
- **Honesty rails (carried from the product):** never fabricate data in a demo;
  when a number has a window or sample size, show it; schema/marketing claims must
  match what's on screen.
- **Bonus if you generate PDFs with this system:** the standard PDF fonts encode
  Latin-1 only, so sanitise text to WinAnsi before drawing (CJK/Tamil/emoji/smart
  quotes otherwise throw) — reuse the `winAnsiSafe` approach from
  `app/lib/documents/render.ts`.

---

## 9. How to port it (checklist)

1. Copy the `:root` token block (§2) into the target's global stylesheet. Bind
   the three `--font-*` vars to however that stack loads Newsreader / Hanken
   Grotesk / Spline Sans Mono (or swap families — the system survives a font
   swap as long as you keep serif-display / grotesque-body / mono-data roles).
2. Copy the `fc-*` component + motion CSS from `app/globals.css` (§5–7). It is
   framework-agnostic plain CSS.
3. Port the two motion helpers: `ScrollReveal` (mount effect that toggles
   `js-reveal-ready` and reveals `.fc-reveal`) and `useChoreo` (timeline hook).
   Both are tiny and stack-agnostic in behaviour; re-implement in the target's
   component model. Mount `<ScrollReveal/>` once near the root.
4. Adopt the conventions: reveal headings, rotating scenes, bespoke performing
   mockups over text cards, `data-on="1"` (never boolean), reduced-motion always
   visible, one accent, cool shadows, no em dashes.

If you copy `app/globals.css` wholesale plus the two helpers, you have the entire
system; everything else is applying the conventions in §8.
