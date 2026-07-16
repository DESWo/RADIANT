# RADIANT roadmap

Phase 1 (credibility) shipped July 14, 2026: primary citations on every figure,
corrected PWR diagram, corrected radiation doses and capacity factors, verified
operating-cost data, tempered absolute claims, a Limitations section, and
removal of unverifiable statistics.

## Phase 2: Engineering depth

- [ ] Publish underlying data as CSV/JSON in a `/data` folder (mortality,
      capacity factors, operating costs, lifecycle emissions, radiation doses),
      each row carrying value, unit, year, region, source URL, and notes
- [ ] Generate charts from those data files instead of inline values
- [ ] Add a methodology page: source selection, normalization, assumptions,
      how conflicting sources are handled, review dates
- [ ] Add reproducible Python calculations (mortality ratios, generation at
      different capacity factors, waste volume) with inputs, equations,
      assumptions, and sensitivity checks
- [ ] Build one original interactive model (leading candidate: an educational
      grid-mix simulator; alternatives: decay-heat curve, radioactive decay
      calculator, fuel energy-density comparison)
- [ ] Add uncertainty ranges to lifecycle-emissions and cost figures

## Phase 3: Software quality

- [ ] Split the single HTML file into `css/`, `js/`, and `data/` modules
- [ ] GitHub Actions checks: HTML validation, JS/Python linting, broken-link
      checking, JSON validation, unit tests for the news parser
- [ ] Full accessibility audit (keyboard tabs with arrow keys, screen-reader
      testing, contrast verification) and static no-JS chart tables
- [ ] Performance pass: self-hosted fonts, font-display swap, minification,
      Lighthouse targets
- [ ] Security headers via meta tags; subresource integrity where applicable

## Phase 4: Presentation

- [ ] README upgrade: screenshots, architecture, testing instructions, license,
      contribution guide, author-role statement
- [ ] Add a license (MIT for code, CC BY for content)
- [ ] Repository metadata: description, website link, topics
- [ ] GitHub Issues and milestones for the items above; tagged v1.x releases
- [ ] Development journal and technical case study
- [ ] Expert review (physics teacher, ANS members, an accessibility reviewer)
      with an acknowledgments section and a public correction history
