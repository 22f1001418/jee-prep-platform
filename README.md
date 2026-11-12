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

## Navigation and dashboard

Browsing screens share a navigation shell (side menu on wide screens, bottom tab bar on phones) and live at URL hashes (`#/home`, `#/tests`, `#/practice`,
`#/mistakes`, `#/history`, `#/notes`), so the browser Back button and reloads work. The exam, results and practice run are full-screen flows without the menu.
**Home** shows what to do next (revision due, resume a test or practice, the next unattempted paper), your study streak, recent scores and your weakest chapters
with a one-click "Practise". **Mock Tests** lists every paper with your best score and attempts.

## Mistake Book

Every wrong answer from a finished test is added to the Mistake Book automatically. On the review screen you tag *why* you missed it
(concept gap, formula, calculation slip, misread, wrong approach, time pressure, guess) and can write a one-line rule for next time.
Questions come back for revision on a ladder of 1, 3, 7, 14, 30 and 60 days; a wrong answer sends a question back to tomorrow, and passing the
last step marks it mastered. Revision sessions are graded automatically against the answer key. The Insights tab shows your mix of causes, weakest
chapters and a test-by-test view. Your cause tags are also included in the "Export for AI analysis" file. The data lives in the browser store
(`jee_cbt_mistakes_v1`) and is part of Backup / Restore.

## Practice mode

Build your own set from the whole question bank: pick subjects and chapters (each chip shows your accuracy so far), MCQ or numerical, exam years, and
a pool (all questions, not attempted yet, your Mistake Book, or starred). Choose 10-50 questions and either **Learn** mode (check each answer
straight away) or **Test** mode (results at the end, with a question palette), with an optional timer. Sessions are saved, so you can leave and resume.
Wrong answers go into the Mistake Book; the results screen lets you tag the causes.

## Where your data lives

History, notes, stars and settings are stored in the browser's IndexedDB. Use **Test History → Backup data** regularly: clearing site data deletes everything.
Data from the old single-file version can be brought over; see the note under the backup buttons.

## Deploy (Vercel)

Import the repo in Vercel. It is detected as a Vite project (`vercel.json` sets the build command, output directory and cache headers). No environment variables are needed.

## Notes

- The service worker precaches the app, the question bank and MathJax; figures are cached the first time they are viewed.
- `npm audit` reports a few moderate issues in build-time tooling (the Workbox chain behind `vite-plugin-pwa`). They are not shipped to the browser.
