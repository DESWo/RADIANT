/* Shown only if news.json cannot be fetched, so the room is never empty.

   These are real headlines, drawn from news.json as fetched by
   scripts/update_news.py on the date below (lightly tidied: one syndicated
   duplicate dropped, one publisher name shortened). The page labels them as
   a saved set when it falls back to them, so stale headlines are never
   passed off as live ones. To refresh, copy items from news.json and update
   FALLBACK_DATE. */

export const FALLBACK_DATE = 'Aug 16, 2026';

export const FALLBACK_NEWS = [
  { title: 'India Opens Nuclear Power to Private Firms Amid AI Demand', date: 'Aug 16, 2026', source: 'Briefs Finance', cat: 'News', url: 'https://news.google.com/rss/articles/CBMikgFBVV95cUxPdnJpWkwxa1BWcnlCZEYtYmFNbmFxS01ELWN3bDRRMjdZZk03ckQ0cm5IRWNmM3JmQjRtVlpqc1dQWU0yZnFGdEV4aTZiUXliUWhyeUpSeUFJRzBBQm53NXJqWVhVQW1YMFFIMmFTYjI0YWZ0LTF2Rk9iVFNTV2o2OEhYYndMT1hRWEZyOWJrNTZ1QQ?oc=5', summary: '' },
  { title: 'Just 7% of America’s Nuclear Fuel Comes From Home', date: 'Aug 15, 2026', source: 'OilPrice.com', cat: 'Technology', url: 'https://news.google.com/rss/articles/CBMirwFBVV95cUxORmt2YVl3eGdNdWJLa2Y3Yl83MzlaVV90R3BxcG91MUZVMEdFY1dERUtadllzM3lxbFhwc0l6a2ZDQnljNWFWbHEwM25JUG1zdGhjM3UxVTRodGJEYVVIX3hTMzhua01oSDJ1SWdXcjRGU3B3emlWcGtBUnlueVJ4Wm5VZHpldUppM2lvc2xCOEhCZnhzN0VMRjNDMHZLYTdsRzJaLXpnY2FaeHFlZTVJ0gGvAUFVX3lxTE5Ga3ZhWXd4Z011YktrZjdiXzczOVpVX3RHcHFwb3UxRlUwR0VjV0RFS1p2WXMzeXFsWHBzSXprZkNCeWM1YVZscTAzbklQbXN0aGMzdTFVNGh0YkRhVUhfeFMzOG5rTWhIMnVJZ1dyNEZTcHd6aVZwa0FSeW55UnhablVkemV1SmkzaW9zbEI4SEJmeHM3RUxGM0MwdkthN2xHMlotemdjYVp4cWVlNUk?oc=5', summary: '' },
  { title: 'Government approves extended operation of Almaraz plant', date: 'Aug 14, 2026', source: 'World Nuclear News', cat: 'Policy', url: 'https://www.world-nuclear-news.org/articles/government-approves-extended-operation-of-almaraz-plant', summary: 'The Spanish government has granted the renewal of the operating licence for the two-unit Almaraz nuclear power plant until June 2030.' },
  { title: 'Construction starts at Saskatchewan uranium mine', date: 'Aug 14, 2026', source: 'World Nuclear News', cat: 'Industry', url: 'https://www.world-nuclear-news.org/articles/construction-starts-at-saskatchewan-uranium-mine', summary: 'NexGen Energy Ltd has marked the official start of construction at the Rook I Project in northern Saskatchewan, kicking off a four-year construction pathway for the mine.' },
  { title: 'Nuclea Energy to acquire Moltex Energy technology portfolio', date: 'Aug 14, 2026', source: 'World Nuclear News', cat: 'Technology', url: 'https://www.world-nuclear-news.org/articles/nuclea-energy-to-acquire-moltex-energy-technology-portfolio', summary: 'Nuclea Energy Inc has entered into a definitive agreement to acquire Moltex’s advanced nuclear technology portfolio, including its used nuclear fuel recycling process.' }
];
