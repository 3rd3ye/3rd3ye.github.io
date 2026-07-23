# 3rd3ye.github.io — enterprise redesign

Plain static HTML/CSS/JS. No build step, no framework, no bundler — drop these files into any static host (GitHub Pages, Netlify, S3, your own server) and it works as-is.

## Structure

- `index.html`, `writing.html`, `post.html`, `topics.html`, `lab.html`, `about.html`, `privacy.html` — pages
- `assets/css/modernist.css` — design-system tokens/components (colors, type, spacing)
- `assets/css/site.css` — site-specific layout, dark theme, animations
- `assets/js/main.js` — theme toggle, mobile nav, scroll reveal, activity feed, live threat feed, forms, filters
- `data/activity.json` — your "recent activity" list (see below)

## Deploying

Nothing to build. For GitHub Pages: replace the contents of your repo (keep `index.html` at the root) and push to `main` — Pages serves it directly. Works identically on any static host.

## Configure the collaboration form (delivers to your email, instantly, free)

The forms in `index.html` (#contact) and `about.html` post to **Web3Forms** — free, unlimited submissions, no account/dashboard required, delivers to your inbox in seconds:

1. Go to https://web3forms.com/, enter your email, get a free access key instantly (no signup).
2. Replace every `YOUR_WEB3FORMS_ACCESS_KEY` in `index.html` and `about.html` with that key.

That's it — submissions land in your inbox immediately. (Formspree, Getform, Basin work as drop-in alternatives if you prefer — just swap the `action` URL and hidden fields.)

## Recent activity sidebar

`data/activity.json` starts empty on purpose — no placeholder entries. Add one object per event, newest first:

```json
[
  { "kind": "Post published", "title": "Your post title", "date": "2026-07-24", "meta": "6 min read", "href": "writing.html" }
]
```

The homepage reads this file at runtime; no rebuild needed, just edit and push.

## Live threat feed (works reliably on GitHub Pages)

Client-side RSS fetching from a static site is inherently flaky — feeds don't send CORS headers, and free proxy APIs (`rss2json`, `allorigins`) rate-limit quickly. The reliable fix: a scheduled **GitHub Action** fetches the feeds server-side (no CORS issue — it's not a browser) and commits the result to `data/threat-feed.json`, which the homepage reads directly.

Already wired up:
- `.github/workflows/fetch-threat-feed.yml` — runs every 6 hours (and on-demand via the Actions tab → "Update threat feed" → Run workflow), regenerates `data/threat-feed.json`.
- `scripts/fetch-threat-feed.js` — plain Node 20 script, no npm install needed, pulls The Hacker News / BleepingComputer / Krebs on Security and writes the JSON.
- The homepage (`assets/js/main.js`) reads `data/threat-feed.json` first; only if that file is empty does it fall back to a live client-side fetch (rss2json → AllOrigins proxy chain) so the section never sits empty.

To activate: just push this repo to GitHub with Actions enabled (default) — the first run happens on the next scheduled tick, or trigger it manually right away from the Actions tab. Edit the `FEEDS` array in `scripts/fetch-threat-feed.js` to change sources.

## Theme

Light/dark toggle persists via `localStorage` and defaults to the visitor's OS preference. All styling runs on CSS variables in `assets/css/modernist.css` / `site.css` — retune colors there.

## Content

All post copy, stats, lab entries and bio text are placeholders — replace with your real writing before publishing.
