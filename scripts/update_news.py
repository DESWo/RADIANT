#!/usr/bin/env python3
"""Fetch recent nuclear energy headlines and write news.json.

Runs in GitHub Actions on a schedule (see .github/workflows/update-news.yml).
Stdlib only, so it needs no pip installs. Feeds that fail are skipped; if every
feed fails the existing news.json is left untouched so the site never breaks.
"""

import json
import re
import sys
import html
import urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "news.json"
MAX_ITEMS = 6
UA = "Mozilla/5.0 (RadiantNewsBot; +https://radiant.wongdesmond.com/)"

FEEDS = [
    # (source label or None to use the item's own <source>, url)
    ("World Nuclear News",
     "https://www.world-nuclear-news.org/rss"),
    (None,
     "https://news.google.com/rss/search?"
     "q=%22nuclear%20energy%22%20OR%20%22nuclear%20power%22%20when:14d"
     "&hl=en-US&gl=US&ceid=US:en"),
]

CATEGORY_RULES = [
    ("Policy",     r"\b(polic|regulat|bill|congress|senate|law\b|DOE|NRC|federal|government|funding)"),
    ("Technology", r"\b(SMR|small modular|reactor design|fuel|molten|fusion|technolog|demonstrat)"),
    ("Education",  r"\b(student|workforce|career|training|scholarship)"),
    ("Research",   r"\b(stud(y|ies)|research|report|universit|laborator|scientist)"),
    ("Industry",   r"\b(plant|construction|grid|utility|capacity|restart|IAEA|output|operation)"),
]
GOOGLE_MAX = 3  # keep room for feeds that carry real summaries


def categorize(text):
    for label, pattern in CATEGORY_RULES:
        if re.search(pattern, text, re.IGNORECASE):
            return label
    return "News"


def strip_tags(text):
    text = re.sub(r"<[^>]+>", " ", text or "")
    text = html.unescape(text)
    text = text.replace("—", "-").replace("–", "-")
    return re.sub(r"\s+", " ", text).strip()


def clamp(text, limit=180):
    if len(text) <= limit:
        return text
    return text[: limit - 1].rsplit(" ", 1)[0] + "…"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read()


def parse_feed(label, raw):
    items = []
    root = ElementTree.fromstring(raw)
    for item in root.iter("item"):
        title = strip_tags(item.findtext("title"))
        link = (item.findtext("link") or "").strip()
        # Feed content is third-party; whatever else it carries, a link that
        # is not plain http(s) never reaches the page.
        if not title or not link.startswith(("http://", "https://")):
            continue
        try:
            published = parsedate_to_datetime(item.findtext("pubDate"))
        except Exception:
            continue
        source = label or strip_tags(item.findtext("source")) or "News"
        # Publishers pad their names with taglines ("... Today | Site.com");
        # the chip only has room for the name.
        source = re.split(r"\s*\|\s*", source)[0].strip() or "News"
        # Google News appends " - Source" to titles; drop it, the chip has it.
        # Strip the parsed <source> name exactly rather than pattern-matching,
        # which mangled publishers whose own names contain hyphens.
        if label is None:
            if source != "News" and title.endswith(" - " + source):
                title = title[: -len(source) - 3].rstrip()
            else:
                title = title.rsplit(" - ", 1)[0] if " - " in title else title
        summary = clamp(strip_tags(item.findtext("description")))
        # Google News descriptions are just repeated links; drop those
        if summary.lower().startswith(title.lower()[:40]):
            summary = ""
        items.append({
            "title": title,
            "url": link,
            "source": source,
            "published": published.astimezone(timezone.utc).isoformat(),
            # day formatted by hand: strftime's no-pad flag is not portable
            "date": f"{published:%b} {published.day}, {published:%Y}",
            "cat": categorize(title + " " + summary),
            "summary": summary,
            "_aggregated": label is None,
        })
    return items


STOPWORDS = frozenset(
    "a an and as at by for from in into of on or over the to under with".split())


def title_tokens(title):
    return frozenset(t for t in re.findall(r"[a-z0-9]+", title.lower())
                     if t not in STOPWORDS)


def is_same_story(a, b):
    """Two headlines about one event, syndicated with different wording.

    Token-set overlap on significant words: the smaller headline must share at
    least 4 tokens and at least 70% of its tokens with the larger one. Distinct
    stories about similar subjects share topic words but not that much. Any
    numeric token the two do not share (a unit number, a dollar figure) marks
    them as different stories outright — "Vogtle Unit 3" is not "Vogtle
    Unit 4", however much of the sentence they share.

    Known limitation: a bag of words cannot tell two near-identically phrased
    stories about different NAMED plants apart ("...operation of Almaraz
    plant" vs "...operation of Cofrentes plant" would merge). That costs one
    headline in a rare collision; the alternative — exact-title matching —
    demonstrably shipped the same story twice, which is worse.
    """
    ta, tb = title_tokens(a), title_tokens(b)
    digits = lambda ts: frozenset(t for t in ts if t.isdigit())
    if digits(ta) != digits(tb):
        return False
    small, large = sorted((ta, tb), key=len)
    if not small:
        return False
    shared = len(small & large)
    return shared >= 4 and shared / len(small) >= 0.7


def dedupe(collected):
    """Newest first, drop repeats (exact and cross-source), cap aggregator
    items so feeds with real summaries keep their spots. When a bare
    aggregator copy and a direct-feed copy tell the same story, the
    direct-feed one wins the slot regardless of which arrived first — it is
    the one carrying a real summary."""
    collected = sorted(collected, key=lambda i: i["published"], reverse=True)
    unique, aggregated = [], 0
    for item in collected:
        match = next((k for k in unique
                      if is_same_story(item["title"], k["title"])), None)
        if match is not None:
            if match["_aggregated"] and not item["_aggregated"]:
                unique[unique.index(match)] = item
                aggregated -= 1
            continue
        if item["_aggregated"]:
            if aggregated >= GOOGLE_MAX:
                continue
            aggregated += 1
        unique.append(item)
    return unique


def main():
    collected = []
    for label, url in FEEDS:
        try:
            collected.extend(parse_feed(label, fetch(url)))
        except Exception as exc:  # a dead feed must never kill the run
            print(f"warn: skipping {url}: {exc}", file=sys.stderr)

    if not collected:
        # Keep the site alive on the last good file, but surface the failure
        # as a workflow annotation so a permanently-dead feed cannot hide
        # behind a green Actions history.
        print("::warning title=update-news::every feed failed; headlines left as they were")
        print("error: every feed failed; keeping existing news.json", file=sys.stderr)
        sys.exit(0 if OUT.exists() else 1)

    items = dedupe(collected)[:MAX_ITEMS]
    for item in items:
        del item["_aggregated"]

    # Only rewrite the file when a headline actually changed: generated_at
    # carries microseconds, so an unconditional write would make the six-hourly
    # workflow commit a timestamp-only diff on every run.
    if OUT.exists():
        try:
            if json.loads(OUT.read_text(encoding="utf-8")).get("items") == items:
                print("no new headlines; leaving news.json untouched")
                return
        except Exception:
            pass  # unreadable existing file: rewrite it

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "items": items,
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
                   encoding="utf-8")
    print(f"wrote {OUT.name} with {len(payload['items'])} items")


if __name__ == "__main__":
    main()
