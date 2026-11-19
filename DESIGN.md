---
name: NullTrace
description: Zero-trust hybrid AI workspace, staged as a customs hall where every message clears customs.
colors:
  floor: "#f4f3ef"
  panel: "#fbfaf7"
  white: "#ffffff"
  green-floor: "#eef1ec"
  line: "#e0ddd4"
  line-strong: "#c8c4b8"
  ink: "#141414"
  ink-2: "#46433d"
  ink-3: "#6b675e"
  sign: "#141414"
  sign-2: "#26241f"
  sign-3: "#3a3731"
  sign-ink: "#f4f3ef"
  sign-ink-2: "#b9b4a8"
  yellow: "#ffc72c"
  yellow-2: "#ffd75e"
  yellow-tint: "#fff3cc"
  red: "#d52b1e"
  red-deep: "#a81f15"
  red-tint: "#fbe5e2"
  red-ink: "#8f1a11"
  green: "#00843d"
  green-tint: "#dff1e6"
  green-ink: "#005a29"
  lamp-go: "#2fbf71"
  lamp-stop: "#ff5a4e"
typography:
  display:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  sign:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 800
    lineHeight: 1.3
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
    fontFeature: "\"tnum\""
  ui:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.35
  label:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1.25
  payload:
    fontFamily: "Martian Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.8
    fontVariation: "\"wdth\" 87.5"
  payload-sm:
    fontFamily: "Martian Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "11.5px"
    fontWeight: 400
    lineHeight: 1.8
    fontVariation: "\"wdth\" 87.5"
rounded:
  mark: "2px"
  sign: "3px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  gutter: "16px"
  gutter-md: "20px"
  gutter-lg: "24px"
  stack: "28px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.sign}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.yellow-2}"
    textColor: "{colors.ink}"
  button-primary-disabled:
    backgroundColor: "{colors.floor}"
    textColor: "{colors.ink-3}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sign}"
    padding: "6px 8px"
  button-quiet-hover:
    backgroundColor: "{colors.floor}"
    textColor: "{colors.ink}"
  button-destructive:
    backgroundColor: "transparent"
    textColor: "{colors.red-ink}"
    rounded: "{rounded.sign}"
    padding: "6px 12px"
  button-destructive-armed:
    backgroundColor: "{colors.red}"
    textColor: "{colors.white}"
  button-on-sign:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.sign-ink}"
    rounded: "{rounded.sign}"
    padding: "4px 10px"
  sign-bar:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.sign-ink}"
  nav-item:
    textColor: "{colors.sign-ink-2}"
    typography: "{typography.ui}"
    padding: "0 10px"
  nav-item-active:
    textColor: "{colors.yellow}"
  lane-red:
    backgroundColor: "{colors.red}"
    textColor: "{colors.white}"
    typography: "{typography.sign}"
    height: "56px"
  lane-green:
    backgroundColor: "{colors.green}"
    textColor: "{colors.white}"
    typography: "{typography.sign}"
    height: "56px"
  gate-marker:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sign}"
    padding: "8px 16px"
  gate-marker-held:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.white}"
  held-value:
    backgroundColor: "{colors.red-tint}"
    textColor: "{colors.red-ink}"
    rounded: "{rounded.mark}"
    padding: "0 3px"
  held-chip:
    backgroundColor: "{colors.red-deep}"
    textColor: "{colors.white}"
    rounded: "{rounded.mark}"
    padding: "4px 8px"
  cleared-token:
    backgroundColor: "{colors.green}"
    textColor: "{colors.white}"
    rounded: "{rounded.mark}"
    padding: "1px 4px"
  unknown-token:
    backgroundColor: "{colors.yellow-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.mark}"
    padding: "0 4px"
  verdict-clean:
    backgroundColor: "{colors.green}"
    textColor: "{colors.white}"
    rounded: "{rounded.sign}"
    padding: "14px 16px"
  verdict-leak:
    backgroundColor: "{colors.red}"
    textColor: "{colors.white}"
    rounded: "{rounded.sign}"
    padding: "14px 16px"
  manifest-strip:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.sign-ink}"
  manifest-figure-hero:
    textColor: "{colors.yellow}"
    typography: "{typography.display}"
  manifest-figure-hero-leaked:
    textColor: "{colors.lamp-stop}"
  well:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sign}"
    padding: "16px"
  composer:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.payload}"
    rounded: "{rounded.sign}"
  scenario-row:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    padding: "10px 14px"
  scenario-row-hover:
    backgroundColor: "{colors.yellow-tint}"
  tab:
    textColor: "{colors.ink-3}"
    typography: "{typography.ui}"
    padding: "12px"
  tab-active:
    textColor: "{colors.ink}"
  switch-on:
    backgroundColor: "{colors.green}"
    rounded: "{rounded.pill}"
    width: "44px"
    height: "24px"
  switch-off:
    backgroundColor: "{colors.line-strong}"
    rounded: "{rounded.pill}"
    width: "44px"
    height: "24px"
  badge-held:
    backgroundColor: "{colors.red-tint}"
    textColor: "{colors.red-ink}"
    rounded: "{rounded.mark}"
    padding: "2px 6px"
  badge-sent:
    backgroundColor: "{colors.green-tint}"
    textColor: "{colors.green-ink}"
    rounded: "{rounded.mark}"
    padding: "2px 6px"
  badge-policy:
    backgroundColor: "{colors.yellow-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.mark}"
    padding: "2px 6px"
  notice-bar:
    backgroundColor: "{colors.yellow-tint}"
    textColor: "{colors.ink}"
    padding: "6px 20px"
---

# Design System: NullTrace

## Overview

**Creative North Star: "The Customs Hall"**

Every message clears customs. The screen is an airport customs hall in daylight: an off-white hall floor, black enamel signage overhead and underfoot, yellow wayfinding, and two channels that everyone already knows how to read. The red channel, "Goods to declare", holds the real values on this device. The green channel, "Nothing to declare", carries only placeholders to the cloud. Between them sits the gate, which names where the current message is. The system is built so that the mechanism is graspable in one look and the proof is one tab deeper.

Density is calm and professional: an operating surface for a developer, clinician or counsel, not a dashboard. Colour is used as signage, in full flat fields with white type, never as glow or gradient. Type is heavy grotesk for anything a sign would say and a narrow mono only for what is actually payload: the pasted text, the captured request, the tokens. The hall is light; it explicitly rejects the dark security-console look, terminal costume, and anything playful.

**Key Characteristics:**
- Light hall floor with black signage bands top (sign bar) and bottom (manifest strip).
- Full-bleed red and green lane headers as solid colour fields with white heavy type.
- Yellow is the wayfinding colour: active nav, the gate marker, the primary "Clear customs" action, the zero-bytes figure, selection.
- Held values are marked red in place; cleared tokens are solid green chips; one stamped verdict per request.
- Near-square enamel-sign corners (3px), drawn hairline rules instead of borders, almost no shadow.
- Motion is functional and short: tokens march, verdicts stamp, new items rise.

## Colors

A signage palette: warm off-white floor, enamel black, one wayfinding yellow, and two channel colours that each mean exactly one thing.

### Primary
- **Wayfinding Yellow** (`yellow`): the one colour that says "go here / do this". Primary action fill ("Clear customs"), active nav label and its 3px underline, the gate marker on desktop, the hero manifest figure when 0 bytes have leaked, text selection, focus rings on black signage. **Pale Yellow** (`yellow-2`) is its hover. **Notice Cream** (`yellow-tint`) is its quiet form: scenario-row hover, the Nano notice bar, Policy audit badges, unknown-token marks.

### Secondary
- **Channel Red** (`red`): "Goods to declare". The red lane header, the leak verdict banner, an armed destructive button, the underline on held values, error card outline. **Oxblood** (`red-deep`) for held-item chips inside the red lane and armed-button hover. **Held Blush** (`red-tint`) is the background of a held value and "held now" badges. **Held Ink** (`red-ink`) is red text on light surfaces (held values, counts of held values, the wipe button).

### Tertiary
- **Channel Green** (`green`): "Nothing to declare". The green lane header, cleared-token chips, the clean verdict banner, the active-tab underline inside the green channel. **Cleared Mint** (`green-tint`) for "captured live" and "Sent" badges and the selected request row. **Cleared Ink** (`green-ink`) for green text on light surfaces. **Green Channel Floor** (`green-floor`) tints the whole right-hand column so the channel reads as a place, not a panel.

### Neutral
- **Hall Floor** (`floor`): page background and the red channel's floor; also the disabled primary fill and quiet hover.
- **Counter Panel** (`panel`): composer tray, tab rails, sticky table heads.
- **Paper White** (`white`): wells that hold content (message cards, request capture, scenario list, lists of switches).
- **Hairline** (`line`) and **Strong Hairline** (`line-strong`): drawn rules, card outlines, scrollbar thumb, off switch track.
- **Ink** (`ink`), **Ink 2** (`ink-2`), **Ink 3** (`ink-3`): primary text, body/secondary text, meta and placeholder text.
- **Enamel Black** (`sign`), **Sign 2** (`sign-2`), **Sign 3** (`sign-3`): sign bar and manifest strip, their hover, and the dividers between status signs and manifest figures. **Sign White** (`sign-ink`) and **Sign Grey** (`sign-ink-2`) are text on black.
- **Lamps** (`lamp-go`, `lamp-stop`): brighter green and red used only on black signage (status dots, and the hero figure if bytes ever leak), where the channel colours lack contrast.

### Named Rules
**The Two Channels Rule.** Red means held on this device; green means cleared to the cloud. Neither appears as decoration, emphasis, or generic success/error anywhere else.

**The Wayfinding Rule.** Yellow is reserved for wayfinding and the single primary action. If a surface has two yellow buttons, one is wrong.

**The Lamp Rule.** On black signage, status uses lamps, not channel colours: `lamp-go`, `lamp-stop`, `yellow` for waiting, `sign-ink-2` for neutral.

## Typography

**Display Font:** Hanken Grotesk (with ui-sans-serif, system-ui), weights 400 to 800
**Body Font:** Hanken Grotesk
**Label/Mono Font:** Martian Mono at 87.5 width (with ui-monospace, SFMono-Regular, Menlo), weights 400 to 600

**Character:** A heavy, slightly condensed-feeling grotesk set tight, like enamel airport signage, paired with a narrow mono that reads as a manifest or payload. Tabular numerals are on globally so counters never jitter.

### Hierarchy
- **Display** (800, 44px mobile / 48px desktop, 0.9, -0.035em): the hero manifest figure only, "bytes of protected data that left this device".
- **Headline** (800, 28 to 30px, 1.1, -0.025em): one page title per view (Workspace empty state, Policy, Audit log).
- **Sign** (800, 15 / 17 / 19px by breakpoint, -0.01em): lane headers "Goods to declare" and "Nothing to declare"; the 21px wordmark and 22 to 26px manifest figures share this voice.
- **Title** (800, 16 to 17px): section headings, verdict headline, empty-state headings; 18px in rendered answers.
- **Body** (400, 15px, 1.65): base size; answer prose capped at 72ch, intros at 60 to 62ch.
- **UI** (600 to 700, 13.5 to 14px): nav, tabs, buttons, list rows; the primary button steps up to 15px / 800.
- **Label** (500 to 600, 11 to 13px): status-sign labels, meta lines, table heads, badges. Sentence case.
- **Payload** (Martian Mono 400, 11 to 12.5px, 1.7 to 1.8): composer text (12.5px), original text and code blocks (12px), JSON body, tokens and vault values (11.5px), request headers (11px).

### Named Rules
**The Payload Rule.** Mono is only for things that are data: pasted text, code, request URL, headers, JSON, tokens, vault values, chrome:// flags. Labels, counts and headings are always Hanken Grotesk, even when they describe data.

**The Sign Voice Rule.** Anything a hall sign would say is set at weight 800 with negative tracking. Uppercase is reserved for the stamp alone.

## Layout

A full-height app shell in five horizontal bands: sign bar, optional notice bar, lane strip, the two channels, manifest strip. On desktop (≥1024px) the shell is locked to the viewport and the channels split 50/50 as a two-column grid, each scrolling independently; the left channel holds the conversation and composer, the right holds Inspection and Vault manifest tabs. Content inside a channel is centred in a measure (720px empty state, 820px conversation); Policy uses a 1240px two-column layout with a sticky effect preview, Audit a 980px single column.

Spacing follows a 4px base: 16px side gutter on mobile, 20 to 24px on larger widths, 28px between conversation turns, 32px between Policy sections, 12 to 16px between stacked wells.

Responsive behaviour: below 1024px the channels stack (red at least 78vh, then green at least 60vh) and the page scrolls. Below 768px the gate leaves the lane seam and becomes a black bar spanning both lanes; lane side padding shrinks. Below 640px the four status signs collapse behind a one-line toggle showing four lamp dots, lane icons and secondary counts drop, and the manifest becomes a two-column grid with the hero figure spanning both; from 768px it is five columns (1.35fr hero plus four).

## Elevation & Depth

Flat by default. Depth comes from tone (floor, panel, white wells, black signage) and from drawn 1px inset hairlines that outline wells without adding a border box. Shadows appear only on the few things that physically sit above the hall: the primary action, the gate marker, tooltips and switch thumbs.

### Shadow Vocabulary
- **Drawn rule** (`box-shadow: inset 0 0 0 1px var(--color-line)`): the outline of every white well, list and request capture; 1.5px `line-strong` for the composer and outline buttons.
- **Ink focus** (`box-shadow: inset 0 0 0 2px var(--color-ink)`): composer focus-within and the selected inspection-mode card.
- **Card lift** (`box-shadow: 0 1px 2px rgba(20,20,20,0.06), inset 0 0 0 1px var(--color-line)`): user message cards.
- **Action lift** (`box-shadow: 0 2px 6px rgba(20,20,20,0.18)`; hover `0 4px 12px rgba(20,20,20,0.22)`): the yellow primary button.
- **Gate lift** (`box-shadow: 0 3px 10px rgba(20,20,20,0.28)`): the gate marker sitting on the lane seam.
- **Tooltip lift** (`box-shadow: 0 6px 18px rgba(20,20,20,0.25)`): the black held-value tooltip.

### Named Rules
**The Drawn Line Rule.** Wells are outlined with inset hairlines, not CSS borders, and never with a coloured left stripe.

## Shapes

Near-square enamel-sign corners. Containers, buttons, verdicts and the gate use 3px (`sign`); inline marks, badges, tokens and chips use 2px (`mark`). Only switches, status lamps and the scrollbar thumb are fully round. Lane headers and black bands are full-bleed rectangles with no radius. Heavy 2px ink rules (`border-ink`) cap answer bodies, table heads and the policy summary, like the ruled edge of a form.

## Components

### Buttons
- **Shape:** enamel-sign corners (3px).
- **Primary ("Clear customs"):** wayfinding yellow fill, ink text at 15px / 800, 8px 16px padding, leading arrow icon, action-lift shadow. Hover goes to pale yellow with a deeper shadow; active nudges down 1px; disabled drops to floor fill, ink-3 text, no shadow. One per surface.
- **Quiet:** transparent with ink-2 text, hover to floor (or white on panel) with ink text. Used for Load a file, Copy, Show values.
- **Outline chip:** 1px strong-hairline inset, 13px semibold, used for the compact scenario shortcuts above the composer.
- **Destructive (two-step):** "Wipe vault" starts as red-ink text with a 1.5px red inset outline, hover held-blush; first press arms it to a solid red fill with "Confirm: destroy everything", auto-disarming after 3.5s.
- **On sign:** black fill, sign-white text, hover sign-2 (Download Nano on the notice bar).

### Sign Bar (Navigation)
Black enamel band. Wordmark "Null" in sign-white plus "Trace" in yellow, 21px / 800. Nav items are 14px semibold sign-grey; the current item turns yellow with a 3px yellow bar at the bottom edge and `aria-current="page"`. Right side: four status signs (label 11px sign-grey over 13.5px bold value with a lamp dot), divided by sign-3 hairlines. Mobile collapses the signs behind a toggle row of lamp dots.

### Lanes and Gate (signature)
Two full-bleed colour fields, at least 56px tall: red left with a lock icon, "Goods to declare" and a held count, plus the three most recent held-item chips (oxblood, 2xl only); green right, right-aligned, "Nothing to declare", cleared count, and three chevrons. The gate is a yellow 3px-corner marker centred on the seam naming the stage ("1 of 4 · Inspecting on device" through "Cleared"), announced with `aria-live`; on error it turns black ("Held at the gate"). While a request is in transit the chevrons march.

### Held Value and Cleared Token (signature marks)
- **Held value:** a real value inline in the user's text, held-blush background, held-ink text, 2px red underline drawn as inset shadow, 2px corners. Focusable; hover or focus shows a black tooltip naming the kind and the green token it cleared as.
- **Cleared token:** the placeholder (`[EMAIL_1]`) as a solid green chip with white mono text, 2px corners, `box-decoration-break: clone` so it wraps cleanly. Used everywhere a token appears: request JSON, preview, vault manifest, policy effect.
- **Unknown token:** a token the vault does not know, notice-cream fill with a 1px yellow inset ring.

### Verdict Banner and Stamp
One per captured request, at the top of Inspection. A 3px-corner solid field, green when 0 bytes of protected data are present, red when any are, with white type: 16px / 800 headline ("0 bytes of protected data in this request") over a semibold line stating how many bytes were scanned. At the right, a stamp: uppercase "CLEARED" or "LEAK", 13px / 800, 0.08em tracking, 2.5px currentColor inset frame, resting at -2deg after the stamp animation.

### Manifest Strip
Black band at the foot of every view. The hero cell states protected bytes that left the device as a Display figure, yellow at 0 and lamp-stop otherwise, with "bytes" at 22px. Four secondary figures (values held, inspection ms, Gemini round trip, placeholder bytes sent) at 22 to 26px / 800 with 13px sign-grey units, separated by sign-3 hairlines.

### Cards / Wells
- **Corner Style:** 3px.
- **Background:** paper white on the floor or green-floor.
- **Shadow Strategy:** drawn rule only (see Elevation); user turns add the faint card lift.
- **Internal Padding:** 14 to 16px; list rows 10 to 14px.
- **Error card:** white with a 2px red inset ring and a red-ink 800 headline ("Stopped at the gate: nothing was sent").

### Inputs / Fields
- **Composer:** white well with 1.5px strong-hairline inset; focus-within swaps to a 2px ink inset. Textarea text in Martian Mono 12.5px / 1.7, placeholder in Hanken 15px ink-3. Tool row beneath: quiet Load-a-file button, hint text, primary button.
- **Focus (global):** 2.5px ink outline, 2px offset; inside black signage the outline is yellow.

### Tabs
Panel-coloured rail with a bottom hairline. Tabs are 14px / 700, ink-3 at rest and ink when selected, with a 3px underline in the colour of the channel they sit in (green in the green channel). Counts sit in a small floor-coloured 2px-corner badge.

### Scenario Rows
In the empty state, a white list with hairline dividers: icon, bold title, ink-3 persona line, trailing arrow. Hover and focus fill notice cream and nudge the arrow 2px right. After the first message they become outline chips above the composer.

### Switches and Segmented Choice
- **Switch:** 44 × 24px pill; on is channel green, off is strong hairline; an 18px white thumb with a small shadow slides 200ms on the expo curve. `role="switch"`.
- **Inspection mode:** two radio cards; selected is white with a 2px ink inset, unselected is panel with a hairline.

### Badges
2px-corner, 12 to 12.5px bold: held (blush / held ink), sent (mint / cleared ink), blocked (solid red / white), wiped (black / sign-white), policy (cream / ink), blocked terms (black / sign-white).

### Notice Bar
A thin notice-cream band under the sign bar for Gemini Nano status, 13.5px, with an info icon, an expandable numbered list of steps (chrome:// flags as mono code wells), and a dismiss control remembered per browser.

### Motion
- **March** (1100ms ease-in-out, infinite, 140ms stagger): the three green-lane chevrons while a request is in transit.
- **Stamp** (520ms, `cubic-bezier(0.16, 1, 0.3, 1)`): verdict stamp lands from 1.18 scale, -4deg and 3px blur to rest at -2deg.
- **Rise** (320ms, same curve): conversation turns and held-item chips enter 6px up.
- State transitions are 200ms colour or transform; vault values unblur in 200ms.
- **Reduced motion:** every animation and transition is clamped to 0.01ms and one iteration.

## Do's and Don'ts

### Do:
- **Do** keep red strictly for "held on this device" and green strictly for "cleared to the cloud"; every red or green pixel should answer which channel it belongs to.
- **Do** reserve wayfinding yellow for the active location, the gate, the single primary action and the 0-bytes figure.
- **Do** use Martian Mono only for payload and data; set every heading, label and count in Hanken Grotesk.
- **Do** set sign text at weight 800 with negative tracking, sentence case, and white on red/green/black fields.
- **Do** outline wells with inset hairlines and keep corners at 3px (containers) or 2px (marks).
- **Do** show values as marks in place: real values as held-value marks, placeholders as cleared-token chips.
- **Do** use lamps (`lamp-go`, `lamp-stop`) for status on black signage, where channel colours lack contrast.
- **Do** keep motion short and causal (march, stamp, rise) and honour reduced motion.

### Don't:
- **Don't** turn the hall dark: no dark console theme, no neon, no glows, no terminal costume.
- **Don't** use red or green as generic error/success, decoration, or emphasis outside the channel meaning.
- **Don't** add a second yellow button or use yellow as a decorative accent.
- **Don't** set headings, labels or UI in mono to look technical.
- **Don't** use rounded-pill buttons or large radii; only switches and lamps are round.
- **Don't** use coloured side-stripe borders on cards, gradients, or gradient text.
- **Don't** use uppercase tracked labels; uppercase belongs to the stamp alone.
