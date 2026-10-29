# parkrun Alphabeteer Tracker

Log the parkrun events you have run and work through the alphabet, A to Z.

- Every UK and Ireland 5k event, plus worldwide Z events (X has none)
- Alphabet grid: done, to do, overseas only, or impossible
- Nearest events for any letter from your location or last run
- Plan: the closest event for every letter you still need
- Run log with dates and per-event counts
- Data stays in the browser (localStorage). Download a backup file and restore it on any device.

Not affiliated with parkrun. Links out to parkrun's own event pages; no results are scraped.

Two ways this repo ships, from the same `src/`:

| Target | How |
|---|---|
| **GitHub Pages** (`madelinben.github.io/parkrun-alphabeteer-tracker/`) | `pnpm build:demo` builds `demo/` into `docs/` (Pages source: `main` / `/docs`) |
| **get-out-there** (Cloudflare) | imported as workspace package `@get-out-there/alphabeteer` (`AlphabeteerApp`) |

```bash
pnpm install
pnpm dev          # demo at http://localhost:3106/parkrun-alphabeteer-tracker/
pnpm test         # logic unit tests
pnpm build:demo   # static site -> docs/
pnpm parkruns:update  # refresh src/data/parkruns.json from parkrun's public events feed
```

Package rules: no router/auth/app imports; Tailwind default palette only (no custom tokens); host must `@source` this folder. Peer deps: react, react-dom, lucide-react.

Host hook: `<AlphabeteerApp beforeExport={gate} />` runs `gate(label)` before a backup download or restore (e.g. an ad gate); reject to cancel.
