# RADIANT · The Case for Nuclear Energy

An evidence-based advocacy website by Desmond Wong, bringing data-driven clarity
to nuclear energy discussions.

The site is a single page with no build step, no frameworks, and no runtime
dependencies: [index.html](index.html) holds the content, with the styles,
scripts, and datasets split across `css/`, `js/`, and `data/` as plain ES
modules. Fonts and libraries are self-hosted under `assets/`; nothing is
fetched from a CDN. Its content is adapted from the advocacy paper *"Radiant:
The Case for Nuclear Energy."*

It is presented as a museum: five wings, each answering one question, walked a
page at a time rather than scrolled. Three of the exhibits are original models
you operate — a chain-reaction lab, a point-kinetics reactor, and a grid-mix
simulator. [DESIGN.md](DESIGN.md) explains how it is built.

## Running locally

The JavaScript is loaded as ES modules, so the site needs to be served rather
than opened from the filesystem:

```sh
npm run serve
# then visit http://localhost:4174
```

The server is a 40-line Node script ([scripts/serve.mjs](scripts/serve.mjs));
any static file server works just as well. There is nothing to install and
nothing to build.

## Tests

Automated checks run in CI on every push, and locally with:

```sh
npm install   # Playwright, the only dev dependency
npm test
```

Five suites: markup and citation integrity, both models unit-tested directly
against closed-form results and a Runge–Kutta reference integration, the same
models re-checked through the browser UI, museum navigation and deep links,
and rendering at three viewports including keyboard and reduced-motion paths.
`npm test -- static models` runs the no-browser checks alone and finishes in
about a second.

## Deploying

Works as-is on GitHub Pages: Settings → Pages → deploy from the `main` branch
root. No build configuration needed.

## Data and sources

Every statistic on the page is cited to a primary source (EIA, IPCC, UNECE, NRC,
DOE, UNSCEAR, BLS, Our World in Data, NEI, IAEA) in a numbered reference list in
the footer, with links and an access date. Charts carry "how to read this" notes
covering methodology and what the numbers do and do not include. All figures were
last verified on July 14, 2026; references added since carry their own access
dates. The site also includes a Limitations section
covering construction costs, financing risk, waste-repository politics, accident
severity, mining impacts, proliferation, and SMR uncertainty.

See [ROADMAP.md](ROADMAP.md) for planned work (datasets, methodology page,
reproducible calculations, and uncertainty ranges).

## License

MIT for the code, CC BY 4.0 for the written content and illustrations; the
vendored libraries, fonts, and footage keep their own licenses. See
[LICENSE](LICENSE).

## The five wings

Each wing answers one question.

**I · The Atom** — *What is happening?*
Fission (one split becoming a chain reaction, with a chain-reaction lab you
drive) and Control (an operable point-kinetics reactor: pull the rods, watch
delayed neutrons and Doppler feedback push back, scram it).

**II · The Reactor** — *How does that become electricity?*
A Real Plant (drone footage of a working station), Inside One (a six-stage
walk from core to grid over an annotated PWR schematic, plus a clickable plant
explorer) and Building One (a nine-stage construction sequence).

**III · The Record** — *Does the evidence support it?*
First whether it is dangerous: Death Rates per TWh, Accidents (TMI, Chernobyl
and Fukushima, feared against found), Radiation in everyday context. Then
whether it is useful: Uptime, Costs, and Build a Grid, an original model where
you pick a mix and see carbon intensity, capacity and firm share. The Case
closes the wing as a verdict on all of it.

**IV · The Frontier** — *What is still hard, and what changes next?*
Problems (construction, financing, waste, accidents, mining and water,
proliferation, workforce, SMR uncertainty) and Right Now (the durable frontier
questions, then auto-updating headlines).

**V · The Field** — *How do I keep learning, or join?*
Myths as a reference shelf, Careers, Your Way In (named programs, each linked
to the organization that runs it) and Sources.

## Auto-updating news

The News section reads [news.json](news.json), which a scheduled GitHub Action
([.github/workflows/update-news.yml](.github/workflows/update-news.yml)) refreshes
every 6 hours by running [scripts/update_news.py](scripts/update_news.py). The
script pulls headlines from World Nuclear News and Google News, dedupes them,
and commits the file only when something changed. If the fetch ever fails, the
page falls back to a baked-in set of headlines, so it never breaks.

You can also refresh manually: repo → Actions → "Update news" → Run workflow.
Note that GitHub pauses scheduled workflows after about 60 days without commits;
one click on the Actions tab re-enables them.

## Sources

Safety figures from Our World in Data (Markandya & Wilkinson 2007; Sovacool et
al. 2016). Lifecycle emissions consistent with IPCC/UNECE assessments.
Capacity-factor figures from EIA; France's generation share from IAEA PRIS
and RTE.

Every figure on the page carries its source inline: 18 numbered references with
links and access dates, a source line under each chart, and "how to read this"
notes covering what a number does and does not include. Figures were last
verified on July 14, 2026; references added since carry their own access dates.
