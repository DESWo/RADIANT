# RADIANT · The Case for Nuclear Energy

An evidence-based advocacy website by Desmond Wong, bringing data-driven clarity
to nuclear energy discussions.

The site is a single self-contained page, [index.html](index.html), with no
build step and no dependencies (fonts load from Google Fonts). Its content is
adapted from the advocacy paper *"Radiant: The Case for Nuclear Energy."*

## Running locally

Open `index.html` directly in a browser, or serve the folder:

```sh
python3 -m http.server 4173
# then visit http://localhost:4173
```

## Deploying

Works as-is on GitHub Pages: Settings → Pages → deploy from the `main` branch
root. No build configuration needed.

## Data and sources

Every statistic on the page is cited to a primary source (EIA, IPCC, UNECE, NRC,
DOE, UNSCEAR, BLS, Our World in Data, NEI, IAEA) in a numbered reference list in
the footer, with links and an access date. Charts carry "how to read this" notes
covering methodology and what the numbers do and do not include. All figures were
last verified on July 14, 2026. The site also includes a Limitations section
covering construction costs, financing risk, waste-repository politics, accident
severity, mining impacts, proliferation, and SMR uncertainty.

See [ROADMAP.md](ROADMAP.md) for planned work (datasets, methodology page,
reproducible calculations, an original model, and automated testing).

## Sections

1. **Overview**: hero and the three principles
2. **The Case**: the argument in one page, with key stats and verdicts
3. **The Plant**: an annotated diagram of a fission plant, reactor to grid
4. **Safety**: death rates per TWh (interactive chart + table view)
5. **Capacity**: capacity factors by source (interactive chart)
6. **Costs**: operating costs by source (interactive chart)
7. **Incidents**: TMI, Chernobyl, Fukushima in a tabbed facts-vs-perception panel
8. **Exposure**: everyday radiation doses in context (interactive chart)
9. **Myths**: five myths vs. facts in expandable panels
10. **Limitations**: the honest cost column, from construction overruns to proliferation
11. **News**: auto-updating headlines and resources
12. **Careers**: BLS-sourced stats and four expandable career profiles
13. **Students**: pathway, schools with nuclear engineering programs, funded opportunities
14. **Info**: about the author and sources

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
Capacity-factor and France generation-share figures from EIA and IEA. Before
formal publication, each statistic should be cited to its primary source and
checked against the most recent year available.
