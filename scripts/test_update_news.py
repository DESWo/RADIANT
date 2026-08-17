#!/usr/bin/env python3
"""Unit tests for the pure parts of update_news.py.

Run with:  python3 -m unittest discover -s scripts
No network: parse_feed is fed a fixture, never a URL.
"""

import unittest

from update_news import categorize, clamp, dedupe, is_same_story, parse_feed, strip_tags

FEED = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item>
    <title>Reactor &amp; grid &lt;b&gt;news&lt;/b&gt; - Some Outlet</title>
    <link>https://example.org/story</link>
    <pubDate>Fri, 14 Aug 2026 17:00:14 GMT</pubDate>
    <source>Some Outlet</source>
    <description>A perfectly ordinary description of the story.</description>
  </item>
  <item>
    <title>No link, must be skipped</title>
    <pubDate>Fri, 14 Aug 2026 17:00:14 GMT</pubDate>
  </item>
  <item>
    <title>Unsafe scheme, must be skipped</title>
    <link>javascript:alert(1)</link>
    <pubDate>Fri, 14 Aug 2026 17:00:14 GMT</pubDate>
  </item>
  <item>
    <title>Bad date, must be skipped</title>
    <link>https://example.org/bad-date</link>
    <pubDate>not a date</pubDate>
  </item>
  <item>
    <title>Self-describing item</title>
    <link>https://example.org/self</link>
    <pubDate>Sat, 15 Aug 2026 09:30:00 GMT</pubDate>
    <description>Self-describing item and nothing else.</description>
  </item>
</channel></rss>"""


class StripTags(unittest.TestCase):
    def test_removes_markup_and_unescapes(self):
        self.assertEqual(strip_tags("a <b>bold</b> &amp; plain"), "a bold & plain")

    def test_collapses_whitespace(self):
        self.assertEqual(strip_tags("  a\n\t b  "), "a b")

    def test_handles_none(self):
        self.assertEqual(strip_tags(None), "")


class Clamp(unittest.TestCase):
    def test_short_text_untouched(self):
        self.assertEqual(clamp("short"), "short")

    def test_long_text_cut_at_word_boundary(self):
        out = clamp("word " * 60)
        self.assertLessEqual(len(out), 180)
        self.assertTrue(out.endswith("…"))
        self.assertNotIn("wor…", out)  # never cut mid-word


class Categorize(unittest.TestCase):
    def test_rules_match(self):
        self.assertEqual(categorize("NRC issues new regulation"), "Policy")
        self.assertEqual(categorize("SMR design demonstration"), "Technology")
        self.assertEqual(categorize("scholarship for nuclear students"), "Education")
        self.assertEqual(categorize("university research report"), "Research")
        self.assertEqual(categorize("plant restart boosts capacity"), "Industry")

    def test_falls_back_to_news(self):
        self.assertEqual(categorize("something else entirely"), "News")


class Dedupe(unittest.TestCase):
    def test_syndicated_story_collapses(self):
        # The real pair that shipped side by side before cross-source dedupe.
        self.assertTrue(is_same_story(
            "Spain Approves Extended Operation Of Almaraz Nuclear Power Plant",
            "Government approves extended operation of Almaraz plant"))

    def test_distinct_similar_stories_survive(self):
        self.assertFalse(is_same_story(
            "Government approves extended operation of Almaraz plant",
            "Spain approves extended operation of Cofrentes nuclear plant"))
        self.assertFalse(is_same_story(
            "India Opens Nuclear Power to Private Firms Amid AI Demand",
            "Just 7% of America's Nuclear Fuel Comes From Home"))

    def test_differing_numbers_mean_different_stories(self):
        # Sibling units share almost every word; the unit number decides.
        self.assertFalse(is_same_story(
            "Vogtle Unit 3 reaches full power after refueling outage",
            "Vogtle Unit 4 reaches full power after refueling outage"))

    def test_dedupe_prefers_the_direct_feed_copy(self):
        def item(title, published, agg=False):
            return {"title": title, "published": published, "_aggregated": agg}
        out = dedupe([
            item("Government approves extended operation of Almaraz plant",
                 "2026-08-14T17:00:14+00:00"),
            item("Spain Approves Extended Operation Of Almaraz Nuclear Power Plant",
                 "2026-08-16T00:08:51+00:00", agg=True),
        ])
        self.assertEqual(len(out), 1)
        # the direct-feed copy carries the real summary, so it wins the slot
        # even though the aggregator copy is newer
        self.assertFalse(out[0]["_aggregated"])


class ParseFeed(unittest.TestCase):
    def test_keeps_only_wellformed_http_items(self):
        items = parse_feed("Test Feed", FEED)
        self.assertEqual([i["url"] for i in items],
                         ["https://example.org/story", "https://example.org/self"])

    def test_strips_markup_from_title(self):
        item = parse_feed("Test Feed", FEED)[0]
        self.assertEqual(item["title"], "Reactor & grid news - Some Outlet")

    def test_google_source_suffix_dropped_when_aggregated(self):
        item = parse_feed(None, FEED)[0]
        self.assertEqual(item["title"], "Reactor & grid news")
        self.assertEqual(item["source"], "Some Outlet")

    def test_source_tagline_truncated(self):
        feed = FEED.replace(b"<source>Some Outlet</source>",
                            b"<source>Some Outlet Today | Outlet.com</source>")
        item = parse_feed(None, feed)[0]
        self.assertEqual(item["source"], "Some Outlet Today")

    def test_date_is_unpadded_and_utc(self):
        item = parse_feed("Test Feed", FEED)[0]
        self.assertEqual(item["date"], "Aug 14, 2026")
        self.assertEqual(item["published"], "2026-08-14T17:00:14+00:00")

    def test_summary_repeating_title_is_dropped(self):
        items = parse_feed("Test Feed", FEED)
        self.assertEqual(items[1]["summary"], "")
        self.assertTrue(items[0]["summary"].startswith("A perfectly"))


if __name__ == "__main__":
    unittest.main()
