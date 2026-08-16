# RADIANT roadmap

Shipped so far, newest first. Anything unchecked below is genuinely not done.

**Curation pass** (August 2026) — restructured into five wings that each answer
one question, removed the old global section numbering, reordered the evidence
wing into two acts and a verdict, and brought the DOM order in line with the
museum order so the no-JS page tells the same story.

**Museum remodel** (July–August 2026) — the site became a building: title
screen, a lobby of five shelves, page-turn navigation instead of scrolling, and
technical figures redrawn to a shared visual grammar. Two original models, a
point-kinetics reactor and a grid-mix simulator, are operable exhibits.

**Phase 1, credibility** (July 14, 2026) — primary citations on every figure,
corrected PWR diagram, corrected radiation doses and capacity factors, verified
operating-cost data, tempered absolute claims, a Limitations section, and
removal of unverifiable statistics.

## Engineering depth

- [x] Build original interactive models — the grid-mix simulator shipped
      July 16, 2026 and the point-kinetics reactor in August
- [ ] Publish the underlying data as CSV/JSON in a `data/` folder (mortality,
      capacity factors, operating costs, lifecycle emissions, radiation doses),
      each row carrying value, unit, year, region, source URL, and notes
- [ ] Generate charts from those data files instead of inline values
- [ ] Add a methodology page: source selection, normalization, assumptions,
      how conflicting sources are handled, review dates
- [ ] Add reproducible Python calculations (mortality ratios, generation at
      different capacity factors, waste volume) with inputs, equations,
      assumptions, and sensitivity checks
- [ ] Add uncertainty ranges to lifecycle-emissions and cost figures
- [ ] Source the two Limitations claims that are currently qualitative
      (Vogtle cost and schedule; the status of Onkalo). Any new reference must
      be appended to the **end** of the list — the simulator cites three
      references by hard-coded number and those do not follow a renumber

## Software quality

- [x] Automated checks in the repository, run in CI on every push:
      markup integrity, citation-marker integrity, both physics models against
      closed-form results, navigation and deep links, three-viewport rendering,
      keyboard and reduced motion (`npm test`)
- [x] Accessibility: keyboard page turning, live-region announcements,
      reduced-motion support, text alternatives on every figure, table views
      for charts
- [x] Performance: self-hosted fonts with `font-display: swap`, vendored
      libraries, no CDN or third-party runtime requests
- [ ] Split the single HTML file into `css/`, `js/`, and `data/` modules
- [ ] Broken-link checking for external citation URLs in CI
- [ ] Python linting and unit tests for the news parser
- [ ] Lighthouse budget enforced in CI
- [ ] Security headers via meta tags; subresource integrity where applicable

## Presentation

- [x] Repository metadata: description, website link, topics
- [x] Architecture documentation ([DESIGN.md](DESIGN.md))
- [ ] README upgrade: screenshots, testing instructions, author-role statement
- [ ] Add a license (MIT for code, CC BY for content)
- [ ] GitHub Issues and milestones for the items above; tagged v1.x releases
- [ ] Development journal and technical case study
- [ ] Expert review (physics teacher, ANS members, an accessibility reviewer)
      with an acknowledgments section and a public correction history
