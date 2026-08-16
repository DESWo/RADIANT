# RADIANT — architecture

How the site is put together, for anyone reading the source. For how to run and
deploy it, see [DEVELOPING.md](DEVELOPING.md). For what it argues and where the
numbers come from, see [README.md](README.md).

## Shape

One page, `index.html`, with no build step and no runtime dependencies. GSAP and
its plugins are vendored under `assets/` alongside the fonts; nothing is fetched
from a CDN at runtime. The only external request the site makes is for
`news.json`, which is served from the same origin.

The page is presented as a museum. There are three screens, and the visitor is
in exactly one at a time:

| Screen | What it is |
| --- | --- |
| Title | One lit fuel pellet and a single button |
| Lobby | A bookcase: five shelves, one volume per exhibit |
| Wing | One exhibit, one screen at a time, turned like pages |

`body[data-screen]` selects which is visible. Everything else is CSS.

## The five wings

Each wing answers one question, and the museum is the progression through them.

| Wing | Question | Volumes |
| --- | --- | --- |
| I · The Atom | What is happening? | Fission, Control |
| II · The Reactor | How does that become electricity? | A Real Plant, Inside One, Building One |
| III · The Record | Does the evidence support it? | Death Rates, Accidents, Radiation, Uptime, Costs, Build a Grid, The Case |
| IV · The Frontier | What is still hard, and what changes next? | Problems, Right Now |
| V · The Field | How do I keep learning, or join? | Myths, Careers, Your Way In, Sources |

Wing III is deliberately ordered as two acts and a verdict: *is it dangerous*
(Death Rates, Accidents, Radiation), then *is it useful* (Uptime, Costs, Build a
Grid), then The Case, which reads as a conclusion because the visitor has
already seen the evidence.

### One registry

`WINGS` is the single source of truth: it maps each wing to an ordered list of
room ids, and `BOOK_TITLES` maps a room id to its volume name. The shelf, the
walkbar, the room's own heading, the dosimeter and the URL are all derived from
those two structures, so they cannot disagree with each other.

A room labels itself with its address — `THE RECORD · ACCIDENTS` — rather than a
number. There is no global section numbering; the wing and the volume are the
position.

The DOM order of the `<section>` elements matches the wing order. That matters
because with JavaScript disabled the page degrades to a single linear document,
and the DOM order is the reading order a crawler or a screen reader without JS
receives.

## Navigation

The museum does not scroll. Each exhibit is cut into screen-sized pages and the
visitor turns them.

**Page packing** (`buildLeaves`) measures the exhibit's top-level blocks against
the viewport and packs them into pages. A block taller than the screen is broken
into its own children so that, for example, the reference list becomes three
readable pages instead of one unreadable one. Blocks named in `UNIT` are never
broken: a chart and its placard belong together.

Because packing measures live layout, page counts are viewport-dependent by
design. They are not a stable number to assert against.

**Page turning** is a CSS 3D transform: a sheet hinged on its left edge rotates
`rotateY` while a two-sided face swaps the outgoing and incoming page. Input is
debounced and gated so one gesture turns one page, with a cap so that a reader
who keeps scrolling cannot hold the gate open indefinitely.

**Scene timelines.** Several exhibits are animated sequences driven by page
turns rather than by scroll. The pager parks the playhead exactly on beat `i`,
so every camera move and reveal is authored to *complete* at `i` rather than to
start there. Anything keyed to start on the beat has not happened yet when the
reader is looking at it.

**Deep links.** The pager writes `#wing/room`, and the reader accepts every
shape the site produces: `#wing/room`, a bare `#wing`, a bare `#room` (what the
nav rail and hero index write), and `#lobby`. An unrecognised hash opens at the
title screen.

## The two original models

Both run in the browser, in the page, with no server.

**Point-kinetics reactor** (`Control`). One-group point kinetics with a Doppler
fuel-temperature feedback: below prompt critical it integrates in the
quasi-static (prompt-jump) approximation, and above it steps the prompt branch
directly at a finer timestep. Constants are β = 0.0065, Λ = 2×10⁻⁵ s, one-group
λ = 0.0784 s⁻¹, and a fuel temperature coefficient of −3 pcm/K. It is a teaching
model: no xenon, no moderator feedback, no burnup, no thermal-hydraulics.

**Grid mix** (`Build a Grid`). For a city needing a constant 1,000 MW, the model
computes carbon intensity as the share-weighted mean of lifecycle emission
factors, nameplate capacity as `Σ share × demand / capacity factor`, and firm
share as the portion that does not depend on the weather. Capacity factors and
emission factors are the same cited figures used elsewhere on the site.

Both are checked against closed-form results in `tests/physics.mjs` — see
Verification below.

## Figures

Technical illustrations share a visual grammar rather than a template. Colour
carries meaning and is the same in every figure:

| Token | Meaning |
| --- | --- |
| `--fig-struct` | Components and vessels |
| `--fig-mat` | Nuclear material and heat |
| `--fig-live` | Neutrons, radiation, live flow and data |
| `--fig-sec` | Secondary structure |
| `--fig-haz` | Hazard or failure only |

Stroke weights are restricted to three roles, callouts are numbered and external
to the drawing, and there are no gradients or glow filters. Figures share that
grammar but not their composition — each is drawn for what it has to explain.

## Data and citations

Every figure on the page carries a primary source. Seventeen numbered references
live in the footer, which JavaScript relocates into the Sources exhibit at
runtime so the pager treats it as that exhibit's content rather than page
furniture. Charts carry a source line and a "how to read this" note covering
what a number does and does not include.

Three notes in the grid simulator cite references by hard-coded number. Any new
reference must therefore be appended to the **end** of the list, because those
markers do not follow a renumber. `tests/static.mjs` checks that every such
marker still points inside the list.

`news.json` is refreshed by a scheduled GitHub Action every six hours and
committed only when the content actually changes. If the fetch fails, the page
falls back to a baked-in set of headlines, so the room never renders empty.

## Accessibility

Semantic landmarks and headings throughout; every figure carries a text
alternative describing what it shows, not merely that it exists. Page turning
works from the keyboard, and each turn announces the room and position through a
visually hidden live region. `prefers-reduced-motion` disables the page-flip
transform, the scene animations and the count-ups, and the content remains fully
readable. Charts have a table view. Colour is never the only carrier of meaning.

## Verification

`npm test` runs four suites against a locally served copy of the site.

| Suite | What it covers |
| --- | --- |
| `static` | Duplicate ids, internal anchors, aria references, reference-marker integrity, count-up figures matching their printed value, no CDN links, `news.json` shape |
| `physics` | Both models against closed-form results |
| `museum` | Wing structure, room addresses matching the walkbar, deep links, dosimeter scaling, pagination determinism |
| `render` | Three viewports for horizontal overflow and blank pages, keyboard paging, reduced motion, interactives surviving re-entry |

Two principles the suite is built on, both learned from real bugs:

**Measure paint, not presence.** A room's content is in the DOM before it is on
screen. Pages have shipped blank while passing a test that only asked whether
the markup existed, so anything asserting about what a visitor sees requires
non-zero size, on-screen position and cumulative opacity.

**Do not assert a formula against itself.** The reactor panel computes its
period readout with `(β − ρ) / (λρ)`, so comparing that readout against the same
expression would assert nothing. The physics suite instead checks results the
code never evaluates: the temperature and power the Doppler feedback settles at,
and the prompt-drop ratio `β / (β − ρ)` after a scram.
