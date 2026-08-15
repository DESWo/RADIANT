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
- **One gesture turns one page, and one notch is a gesture.** `STEP 240,
  NOTCH 100, GESTURE_GAP 1500, LOCK 1150, QUIET 220` in the wheel handler.
  A trackpad glides, so it has to cover `STEP` before the page turns. A mouse
  wheel does not glide: it arrives in discrete notches of about 100 to 120, or
  in `deltaMode` lines and pages. Held to the glide threshold a mouse needed
  **two** notches per page, which reads exactly as "the first scroll did
  nothing". Anything discrete turns on its own event; only continuous input
  accumulates.
- **The input lock is capped** (`LOCK_MAX`). It holds until the wheel goes quiet,
  so a flick's momentum tail cannot turn a second page — but every swallowed
  event used to push it forward, so somebody who kept scrolling *because nothing
  happened* held it open indefinitely and made the problem worse. It now never
  survives past `LOCK_MAX` from the turn that set it.
- The flip tween is 0.66s, not 0.82s: the sheet is off the screen by 90 degrees,
  which `power2.in` reaches about two thirds through, so the tail was gating
  input for an animation nobody could still see. `showPage(next)` stays at
  position **0** — the incoming page has to be under the sheet from the first
  frame, or it pops in mid-turn. A trackpad keeps firing wheel events for a
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

## The plant walkthrough: a machine that starts up (built)

The schematic animates everything at once, which is right for a diagram you are
reading. Walking the plant is a different thing:

- `#plant-cam-svg` opens **cold** — flows still, fuel dim, rotor hidden, no plume.
- Reaching a beat adds `run-N` **cumulatively**, so each component starts working
  and keeps working. By the cooling tower the whole plant is running, because you
  started it. Core heat, boiling tube bundle, spinning rotor and live windings,
  condensate return, current down the transmission lines, plume.
- `run-N` is set from `_sceneGo`, not from a timeline `call()`. **A GSAP callback
  at position 0 never fires on an instant seek** — the same trap that left the
  beat rail unpainted on its first beat. Anything that must be true *at* a beat
  belongs in the function that sets the beat.
- The stage lost its photographic backdrop (a scroll-era plate that just washed
  out around the drawing) and the figure now covers its frame with
  `preserveAspectRatio="slice"`. Covering narrows the horizontal field of view,
  so the camera scale is multiplied by `frameAspect / sourceAspect` or the
  subject of each beat sits half outside the frame. Edges fade into the ground
  rather than cutting through a label.

## Dead scroll machinery, swept

Nothing in a wing scrolls, so every scroll-driven thing was either broken or
waste. Removed: the hero-lead and tour-frame scrubs, the entry fly-through
(walkIn animates that by hand), `ScrollTrigger.refresh()` on every page turn, a
`requestAnimationFrame` loop painting a canvas inside a `display:none` section,
and the frame-sequence decoder that decoded a clip for a canvas the museum never
shows. The three pinned scenes are plain `paused: true` timelines now.

**The page went from six ScrollTriggers to none.** If a scrubbed trigger ever
reappears, assume it is parked at one end of its tween: that is what blanked the
room names, sat the scenes on their last beat, and froze the beat rails.

## Live audit, and what it found

Two more scroll-era casualties, both invisible until the live site was walked
end to end:

- **The dosimeter was dead.** It read `window.scrollY / (scrollHeight - clientHeight)`,
  and the museum never scrolls the document, so the signature element sat at
  `0.000 mSv / Entry` for every visitor from the moment page-flip navigation
  landed. It counts exhibits walked now — sixteen volumes, 0.040 mSv for the
  full traversal, revisits add nothing — driven from `showPage` via
  `window.__doseWalk(roomId, label)`.
- **"Walk back to the entrance" pointed at `#entry`**, an id that exists nowhere
  on the page. The entrance is `#screen-title`. It is an anchor to `#top` (the
  masthead, which is the no-JS reading order) with JS intercepting it to change
  screen, so it works with and without scripts.

Everything else on the live build passed: chart table toggles, the three
incident tabs, the myth panels, the plant-explorer hotspots, the fission lab
physics, all internal anchors, no HTTP failures, no duplicate ids, no console
errors, and zero ScrollTriggers.

## Editorial pass before publishing

- **A room name shares its screen with what it introduces.** `alone` in the
  packer is now always false; the measured pass splits a head off only when the
  two genuinely do not fit. Sixteen pages that carried an overline, a heading
  and one sentence are gone.
- **A shelf is as long as the books on it** (`width: fit-content`, auto grid
  columns). Sized to the column, three quarters of every board was empty, which
  reads as under-stocked rather than curated.
- **The end of a wing says what was in it and what it cost you**: the volumes by
  name, and the dose in words — "about 44% of one New York to Los Angeles
  flight". `window.__doseSay()` owns that sentence.
- Wall text is set to a book's measure (44rem, centred) rather than stranded
  across a 1440px column.

## Holding Steady: the reactor model (Wing I, built)

The exhibit that makes the argument physically instead of asserting it.

- **One-group point kinetics with Doppler feedback.** Three controls: rod
  reactivity, SCRAM, reset. Readouts for power, fuel temperature, reactor
  period, and a reactivity budget that splits rods against fuel temperature.
- **Constants are cited**: beta = 0.0065 (U-235 thermal fission), Lambda = 2e-5 s
  (LWR prompt neutron generation time), fuel temperature coefficient -3 pcm/K,
  inside the NRC-quoted -5 to -2 pcm/K band for PWRs. The methodology note says
  plainly that it is a teaching model: no xenon, no moderator feedback, no
  burnup, no thermal-hydraulics.
- **Numerically it has to be solved in two regimes.** Point kinetics with
  Lambda = 2e-5 s is stiff; explicit stepping at 60 Hz diverges. Below prompt
  critical the prompt term is solved quasi-statically (the prompt-jump
  approximation), which yields the textbook period (beta - rho)/(lambda*rho)
  directly. Above prompt critical the prompt branch is stepped in 400 substeps.
- **Validated against analytic results, not eyeballed**: steady state holds at
  rho = 0; the period tracks (beta - rho)/(lambda*rho) to within 1% across
  50-400 pcm when compared against the model's own net reactivity; the Doppler
  equilibrium lands on the analytic fixed point (198.6% at 826C vs 198.8% at
  827C); after a scram the power shows a prompt drop then a delayed-neutron
  tail. Re-run those checks before touching the constants.
- **What it teaches, measured**: at +800 pcm withdrawn, well past beta, Doppler
  subtracts about 617 pcm and holds net reactivity near +183. The fuel stops the
  excursion, not the operator. That is the exhibit.
- `.rk` is in **both** UNIT lists. Split, the readouts land on one page and the
  controls on another, and the instrument cannot be driven at all.
- Under reduced motion the model still integrates (the trace is information, not
  decoration) but repaints at 4 Hz instead of every frame.

## Source comments: what stays

`index.html` carried 8,236 words of commentary, most of it design rationale
written to explain decisions mid-session. That is a conversation, not
documentation, and it was the clearest evidence of AI assistance in the repo.
It is down to 3,522.

**The test is not length, it is whether the comment stops a bug coming back.**
Deleted: everything narrative, all of which already lives in this file. Kept and
condensed: the constraints that cost real time to find, e.g. `perspective: 2200px`
projecting the turning sheet to 7249x11315 at 84 degrees; a GSAP callback at
position 0 never firing on an instant seek; `margin: 0` clobbering
`margin-inline`; an `<ol>` renumbering from 1 when the items above it are hidden,
while every figure cites a reference by number.

## Curation pass: one question per wing

Each wing answers exactly one question, and the museum is the progression
through them.

    I   The Atom      What is happening?
    II  The Reactor   How does that become electricity?
    III The Record    Does the evidence support it?
    IV  The Frontier  What is still hard, and what changes next?
    V   The Field     How do I keep learning, or join?

**No global numbering.** The old `01`..`16` labels predated the wings and
contradicted them: `02` appeared twice, `15` never, `16` sat on a room no wing
contained, and the museum walked `03 Safety` then `01 The Case` then `10`.
There were three competing systems (section overlines, hero index cards, and
the retired further wing's `Wing · Now` labels). All of them are gone. A room's
address is now `wing.name + ' · ' + BOOK_TITLES[id]`, stamped onto the overline
from the same registry the walkbar and the shelf already used, so the three can
never disagree. Museum mode hides the linear label (`.overline > .rm`) and
prints the address in `::before`; the linear page keeps its own label.

**Wing III is two acts and a verdict.** Is it dangerous (Death Rates,
Accidents, Radiation), then is it useful (Uptime, Costs, Build a Grid), then
The Case as the synthesis. The Case used to be section 01, an opening
manifesto; it now reads as a verdict on what the visitor just walked through.
The broad coal air-pollution comparison moved out of Accidents into Death
Rates, where comparative mortality belongs, folded into the prose that already
made that argument without a number rather than added as a second stacked
callout. Accidents got its own closing beat so it no longer ends on a
methodology caveat.

**DOM order now matches museum order.** They had diverged, and the DOM is what
a no-JS reader gets, so the verdict would have read as an opening manifesto to
anyone without JS. Both are reordered.

**Wing I stops at k.** Fission teaches one split, the neutrons, the chain, and
k. Control owns rods, delayed neutrons, Doppler, period and SCRAM. The fission
lab's slider became neutron absorption rather than a control rod, and its state
words became plain (`Dies out` / `Self-sustaining` / `Runaway`) so the
reactivity vocabulary stays with the room that can demonstrate it. The
reactor-versus-bomb point was being made five times; it is now made twice, once
where it is earned (Control, after the simulator shows Doppler) and once as FAQ
(Myths). "The difference between a reactor and a bomb is control" is gone: it
implied a reactor is a restrained bomb.

**The Further Wing is retired.** Verified first: no inbound `href`, not in any
`WINGS[].rooms`, no `BOOK_TITLES` entry, no JS or CSS reaching it, and every
one of its six links except `#about` was already in the nav rail, with `#about`
reachable from the rail and a hero card. `#wing-end` is a different element and
survives.

## Traps this pass found

**`.piece` made pagination depend on visit history.** `markPieces()` stamps
`.piece` on every top-level block the first time a room is shown, and `.piece`
was in the `UNIT` never-split list, so from the second visit onward nothing
could be decomposed. Measured: Sources 14 pages then 11, Right Now 13 then 9 —
the reference list collapsing from three readable pages into one. `.piece` is a
stagger marker, not a designed unit; removed from `UNIT` and `UNIT_NARROW`.
Rooms now paginate identically on every visit.

**Paged timelines must COMPLETE on the beat, not start there.** The pager parks
the playhead exactly on `i`, so anything keyed to `i` or `i + 0.2` has not
happened yet when the reader is looking. The plant camera was a full beat
behind at every beat (beat 6, "The cooling tower", framed the switchyard) and
no highlight was ever lit at rest. The construction scene had it twice over:
camera and draw-on. Fixed by keying moves to arrive at `i`, and by binding the
highlight to `data-beat` instead of a timeline position.

**A stray `</div>` in Students** closed `.wrap` early and stranded the school
note and all six sourced programme cards outside the column.

**The AI photographic plates were never visible.**
`body[data-screen="wing"] .stage-bg { display: none }` hid them museum-wide, so
six images were fetched and never painted, and a credit line disclosed pictures
nobody could see. Markup, preloader, crossfade and credit removed.

**Deleting an element with an id can blank the whole site.** The museum is one
top-level `<script>`; `#career-list`, `#news-grid`, `#fz-rods`, `#fz-fire`,
`#fz-reset` and `#rk-rods` are dereferenced with no null guard, so a
`TypeError` aborts the block before `body` ever gets `data-screen`. Grep the
script for an id before removing its element.

**Deep links were broken and are now fixed.** `showExhibit` wrote `#record`
while the boot only read a hash containing `/` or the literal `lobby`, so every
URL the site produced about itself dropped the visitor at the entrance. The
pager now writes `#wing/room` so the address always names the page on screen,
and the reader accepts every shape the site produces: `#wing/room`, a bare
`#wing`, a bare `#room` (what the nav rail and hero index write), and `#lobby`;
anything unrecognised opens at the doors. Changing `WINGS[].id` is still
unsafe — shared links carry it, and `WING_CLOTH` keys on `id` with a fallback
equal to Wing III's olive — so Wing V was renamed by `name` only.

**`DOSE_ROOMS` was 16 against 18 rooms**, so the badge read 100% two rooms
early. It is now counted from `WINGS` at runtime
(`window.__DOSE_ROOMS`), so adding or retiring a room can never desync it
again. Verified: denominator 18, and the badge reaches 100% at room 18 of 18.

## Status

Built: title screen, the library, the four-beat book opening with the riffle,
five wings, page-flip navigation, vitrines and placards, warm gallery palette,
three-role type, dosimeter, chart light-up animation, the accessibility pass
above, the curation pass above.

Owed: nothing outstanding. The three instruments listed above still scroll on
short screens, by design.

`#limits` used to assert "roughly seven years late at about $35 billion" and
"Onkalo will be the world's first" with no citation, while every other evidence
room carried its source. Rather than invent references, the claims were made
qualitative: Vogtle "finished years late and far above their original budget",
and the repository line now says no country has one in operation yet and Onkalo
is the closest any has come — which states the problem more completely than the
original did. **If the precise figures are wanted back, they need a primary
source, and it must be appended at the END of the reference list** because
`#simulator` hardcodes "(reference 6)", "(reference 4)" and "(reference 16)"
and those markers do not follow a renumber.
