# RADIANT — the museum remodel: the standing spec

Every decision Desmond has made about the remodel. This file is the memory.
**Read it before touching the remodel. Nothing here gets dropped because a later
message criticised one part of it** — criticism means *fix that part*, not
*delete the decision*.

## The shape of the thing

1. **Title screen** → one lit fuel pellet, "Confine a star. Walk in.", one
   button. No top nav bar. Goes **straight to the lobby**.
2. **The lobby is 3D** (Three.js). Desmond chose this explicitly over a flat
   floorplan and over a full-3D museum. It is the hub. It was criticised for
   being dark/confusing — that means **make it clearer and better lit**, not
   remove it. Clicking a doorway walks you into that wing.
3. **Five wings**, grouped the way the original brief's halls were:
   - **Wing I · The Atom** — fission
   - **Wing II · The Reactor** — reactor-motion, how
   - **Wing III · The Record** — data, capacity, costs, incidents, exposure, simulator, case
   - **Wing IV · The Frontier** — limits, news
   - **Wing V · The Reading Room** — myths, careers, students, about
4. **Inside a wing it is a gallery walk, not a scroll.** One exhibit on screen
   at a time. Back / Next / Lobby in a bottom walk bar. Arrow keys and Escape.
5. **No page scroll anywhere.** The only scrolling allowed is *within* a single
   exhibit that is genuinely taller than the viewport.
6. **A further wing at the end** for anyone who wants more, and a way back to
   the entrance.

## Hard rules

- **No top nav bar.** Removed on purpose.
- **Every exhibit behaves like the opening page**: dark room, one thing lit,
  arrives out of the dark. Not a document section.
- **Charts and citations get the museum treatment too.** Bars grow out of the
  dark and light up in sequence, warm; the hero bar glows. Citations are small
  mono credit lines at the **end** of the exhibit.
- **Cinematic zoom transitions** (GSAP + ScrollTrigger), the prototype at
  `scratchpad/museum-proto` is the reference for the *feel*.
- The 3D is **architecture only**. No chart, number or citation is ever
  rendered into WebGL, so the data stays sharp, clickable and screen-readable.
- **Verify in Playwright and LOOK at the screenshots.** The preview pane runs
  pages hidden, which freezes animation and hides real bugs.

## Content rules that predate the remodel (from CLAUDE.md)

- Every statistic is cited to a primary source. Never add a number without one.
- Advocacy, but honest: do not soften a real downside.
- Self-hosted assets only, no CDN links. No build step.
- Committing and pushing are Desmond's, via GitHub Desktop.

## The library and the book (decided, built)

- The lobby is a **2D library**, not 3D. The 3D atrium is deleted for good.
- **Five shelves, one per wing. Sixteen books, one per exhibit.** Spine out.
- The whole library fits **one screen**, three rows in wing order: I and II share
  the top, III has a row, IV and V share the bottom. Books are sized in `vh` so
  this holds at any viewport height, and titles are short enough that no spine
  ellipsizes. Below 820px the library is the one screen allowed to scroll.
- **Opening a book is four beats**: it comes off the shelf shut with its title on
  the cover, both covers swing apart into a two-page spread, the block **riffles**
  (six sheets go over in about a second), and the camera pushes into the page the
  last sheet uncovers until it fills the screen. Every surface is two-sided, so a
  cover really is the outside of a page.
- **Inside a wing, every transition is a page flip.** No scroll-snap, no long
  scroll, no top nav.

## The shelf: colour and symbol (built)

- **One cloth per wing**, all at roughly the same lightness because the spine
  lettering is near-black and has to stay legible on every one: Atom `#8A7550`
  ochre, Reactor `#7C6B45` tan, Record `#6E6653` olive, Frontier `#5E6B63`
  slate green, Reading Room `#6B5A47` walnut. `dyeLot()` varies each volume a
  few percent, the way a real set is bound from different dye lots. The shelf
  label wears a lightened version of its own wing's cloth.
- **A drawn device at the foot of each spine**, one per exhibit, in `BOOK_MARKS`:
  descending bars for Death Rates, a clock for Uptime, the trefoil for
  Radiation, scales for The Case, and so on. Sixteen inline SVGs, stroke only,
  no font and no emoji.
- Adding the devices cost vertical space, so six titles were shortened (Running
  Costs to Costs, Facts vs. Fear to Accidents, The Argument to The Case,
  The Problems to Problems, Myths & Facts to Myths, Working in It to Careers).
  The symbol now carries part of the label's job.
- **A row is as tall as its tallest book**, so raising `.book--short` and the
  default height costs no layout at all. That is the free lever when a long
  title on a short volume ellipsizes; raising every height is not, because the
  whole library has to stay on one screen.

## One screen, one thing (built)

An exhibit is not a page; it is a short stack of them. The pager builds **leaves**:

- Each block of an exhibit gets its own screen, unless two are small enough to
  share one (budget: 0.74 of the viewport).
- A block **taller than the screen is paged by its own parts**, which is what
  makes the reference list three readable pages instead of one unreadable one.
- **`UNIT` in the pager lists what must never be split.** There are two lists:
  on a wide, tall screen a case keeps its placard beside its object; on a phone
  or a short laptop (`width <= 820 or height < 800`) the placard becomes the page
  before the object. Only real instruments (the grid model, the incident case,
  the fission lab, the plant explorer) stay whole at every size, because their
  parts are useless separately.
- A container showing only *some* of its children gets `.is-part`, which drops it
  to a single column. Without it, a two-column case with its label hidden throws
  the object into the label's 22rem column, where it grows enormously tall.
- A **pinned scene is one screen per beat**, and the page turn drives the same
  GSAP timeline the scroll used to scrub, so all the camera work survives.
- Then every page is **laid out for real and measured**, and anything that still
  overflows spills onto the next. A lone object that is a little too tall is
  stepped down with `zoom` **until it actually fits** (floor 0.84), re-measuring
  each step: computing a ratio once and trusting it does not work, because
  padding does not shrink with the object.
- The **sources footer is moved inside the Sources exhibit** so the references are
  reachable, and every `<li>` gets an explicit `value` — an `<ol>` renumbers from
  1 when the items above it are hidden, and every figure on the site cites a
  reference by number.

Counts, all with zero blank pages and no console errors:

| | screens | overflowing |
|---|---|---|
| 1440x900 | 86 | 0 |
| 1280x720 | 103 | 2 |
| 390x844 | 121 | 3 |

The stragglers are the incident case, the grid model and the plant explorer:
instruments that genuinely need more than a short screen. They scroll inside
themselves, the walk bar says "more on this page", and the wheel reads to the
bottom before it turns.

## Navigation feel

- **The turning page carries the page.** `#pf-sheet` rotates on its left edge and
  holds two faces 180 degrees apart, each hidden while facing away. The front is
  a **live clone** of the page you are leaving (ids stripped, video removed,
  canvas bitmaps copied across), so what turns over is what you were reading.
  A blank sheet, however well shaded, reads as a white screen.
  - The faces must be **nested inside the rotating sheet**, not rotated
    separately. Two elements each animating `rotateY` 180 apart are mirrored
    about the origin, not back to back, and the back face ends up flat across
    the screen.
  - The sheet leaves the frame at 90 degrees, so `power2.in` over 0.82s is used:
    an ease-in-out spends half its time off-screen.
- **One gesture turns one page.** `STEP 240, GESTURE_GAP 1500, LOCK 1150,
  QUIET 220` in the wheel handler. A trackpad keeps firing wheel events for a
  second or more after your fingers leave it, so every swallowed event pushes
  the lock out by `QUIET` — the lock lifts only once the wheel is actually
  still. A fixed lock cannot work: a long flick outlasts any constant.
  Measured: gentle nudge no turn, deliberate scroll +1, 2-second flick +1.

## Two verification traps, both of which hid real bugs

1. **Test navigation with real key presses.** A synthetic `KeyboardEvent`
   dispatched on `window` never reaches a `document` listener, which is how a
   duplicate arrow handler survived a full test pass while making every real
   ArrowRight jump four pages.
2. **Measure paint, not text.** The walk counted `innerText` length, so sixteen
   title pages that rendered completely blank all passed as "fits". They were
   parked at `opacity: 0` by a scroll-scrubbed `.section-head` timeline that can
   never play in a museum with no scroll. `leaves.mjs` now reports `paint`
   alongside `ink`: text in blocks whose cumulative computed opacity is above
   0.5. Anything with ink and no paint is a blank page pretending otherwise.

## Load order, and scrubbed timelines with nothing to scrub

Two bugs with the same shape, worth recognising on sight:

- **The end-of-wing button did nothing** because `#wing-end` is declared *below*
  the main `<script>`, so the top-level `getElementById` at load returned null
  and no listener was ever attached. Everything else in that script is looked
  up lazily inside a function; this was the one exception. Bind late, or move
  the markup above the script.
- **A ScrollTrigger with `scrub` and nothing to scroll parks its timeline at one
  end.** It killed the room names (`opacity: 0`) and it left the fission scene
  sitting on beat 6 of 6, so arriving at the scene played the whole sequence
  backwards at speed. Scenes are now parked on beat 0 when the wing is laid
  out, and `_sceneGo` only animates for a single-beat move within the same
  scene: arriving anywhere else sets the timeline instantly.

## Vitrines and placards (built)

Six display objects now sit in cases with a label beside them: Safety, Capacity,
Costs, Exposure, Incidents, and the grid model. A placard is a catalog chip, a
title, a provenance line in mono, and a short wall text. `.exhibit--wide` steps
outside the reading column for the two big instruments.

The dosimeter moved from top-right to just above the walk bar: at top-right it
sat over the top-right corner of every case, which on the grid model is where
the slider readouts are.

## Accessibility (built)

- `#page-say` is an `aria-live` status: turning a page announces "Death Rates.
  Page 2 of 22." Nothing else tells a screen reader the screen changed.
- Focus travels with the page (`view.focus()`), or the keyboard is stranded on a
  control that `display:none` just removed.
- Books on the shelf carry a focus ring, not only a lift.
- The dosimeter is `aria-hidden`; reading a dose out on every turn is noise.
- Reduced motion: the book opens straight through, pages turn with no leaf, and
  everything is at full opacity. Verified.

## Status

Built: title screen, the library, the four-beat book opening with the riffle,
five wings, page-flip navigation over 86 real screens, vitrines and placards,
warm gallery palette, three-role type, dosimeter, chart light-up animation,
further wing, the accessibility pass above.

Owed: nothing outstanding from the remodel brief. The three instruments listed
above still scroll on short screens, by design.
