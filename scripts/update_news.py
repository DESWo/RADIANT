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
UA = "Mozilla/5.0 (RadiantNewsBot; +https://deswo.github.io/RADIANT/)"

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
        if not title or not link:
            continue
        try:
            published = parsedate_to_datetime(item.findtext("pubDate"))
        except Exception:
            continue
        source = label or strip_tags(item.findtext("source")) or "News"
        # Google News appends " - Source" to titles; drop it, the chip has it
        if label is None:
            title = re.sub(r"\s+-\s+[^-]+$", "", title)
        summary = clamp(strip_tags(item.findtext("description")))
        # Google News descriptions are just repeated links; drop those
        if summary.lower().startswith(title.lower()[:40]):
            summary = ""
        items.append({
            "title": title,
            "url": link,
            "source": source,
            "published": published.astimezone(timezone.utc).isoformat(),
            "date": published.strftime("%b %-d, %Y"),
            "cat": categorize(title + " " + summary),
            "summary": summary,
            "_aggregated": label is None,
        })
    return items


def main():
    collected = []
    for label, url in FEEDS:
        try:
            collected.extend(parse_feed(label, fetch(url)))
        except Exception as exc:  # a dead feed must never kill the run
            print(f"warn: skipping {url}: {exc}", file=sys.stderr)

    if not collected:
        print("error: every feed failed; keeping existing news.json", file=sys.stderr)
        sys.exit(0 if OUT.exists() else 1)

    # newest first, dedupe by normalized title, cap aggregator items so
    # feeds with real summaries keep their spots
    collected.sort(key=lambda i: i["published"], reverse=True)
    seen, unique, aggregated = set(), [], 0
    for item in collected:
        key = re.sub(r"\W+", "", item["title"].lower())[:60]
        if key in seen:
            continue
        if item["_aggregated"]:
            if aggregated >= GOOGLE_MAX:
                continue
            aggregated += 1
        seen.add(key)
        unique.append(item)
    for item in unique:
        del item["_aggregated"]

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "items": unique[:MAX_ITEMS],
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
                   encoding="utf-8")
    print(f"wrote {OUT.name} with {len(payload['items'])} items")


if __name__ == "__main__":
    main()
