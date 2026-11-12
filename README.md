# JEE CBT Test Platform

An NTA-style computer-based-test (CBT) practice platform for JEE Main: 62 past shifts (2021, 2023–2026), 5,310 questions with answer keys,
a faithful exam interface, scoring (+4 / −1 / 0), per-question time analysis, chapter analysis, notes with highlights and images,
starred questions, test history, answer-key corrections and exports. Everything runs in the browser and is saved on your device. It works offline once installed.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run preview  # serve the production build locally
```

## Project layout

| Path | What it is |
|---|---|
| `public/data/papers.json` | The question bank (all papers). Loaded once at start-up. |
| `public/figs/` | ~1,000 question figures (lossless WebP, a few SVG), loaded only when a question shows them. |
| `src/lib/store.js` | IndexedDB-backed storage with a synchronous localStorage-style API (falls back to localStorage). |
| `src/lib/data.js` | Loads the question bank and figure table. |
| `src/lib/` | Scoring, persistence, notes, exports, zip writer, AI-analysis export. |
| `src/screens/`, `src/components/` | UI. |
| `scripts/copy-mathjax.mjs` | Copies the self-hosted MathJax build into `public/vendor/mathjax` (runs before dev/build; the copy is git-ignored). |

## Where your data lives

History, notes, stars and settings are stored in the browser's IndexedDB. Use **Test History → Backup data** regularly: clearing site data deletes everything.
Data from the old single-file version can be brought over; see the note under the backup buttons.

## Deploy (Vercel)

Import the repo in Vercel. It is detected as a Vite project (`vercel.json` sets the build command, output directory and cache headers). No environment variables are needed.

## Notes

- The service worker precaches the app, the question bank and MathJax; figures are cached the first time they are viewed.
- `npm audit` reports a few moderate issues in build-time tooling (the Workbox chain behind `vite-plugin-pwa`). They are not shipped to the browser.
