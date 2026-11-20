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

## Design

One icon set (`src/components/icons.jsx`, about 60 stroke icons incl. subject icons) replaces every emoji and text glyph; the shared building blocks (page header, empty state,
progress ring, sparkline, subject badge) live in `src/components/ui.jsx` and the tokens and component styles at the end of `src/styles.css`. Light and dark themes share the same tokens,
motion respects `prefers-reduced-motion`, and the exam screen keeps its own NTA-style look on purpose. **Home** is a "today" screen: a smart next step, a daily goal ring
(questions answered across tests, practice and revision), a study streak, a daily plan that checks itself off, a score trend, weakest chapters and milestones.

## Navigation and dashboard

Browsing screens share a navigation shell (side menu on wide screens, bottom tab bar on phones) and live at URL hashes (`#/home`, `#/tests`, `#/practice`,
`#/mistakes`, `#/history`, `#/notes`), so the browser Back button and reloads work. The exam, results and practice run are full-screen flows without the menu.
**Home** shows what to do next (revision due, resume a test or practice, the next unattempted paper), your study streak, recent scores and your weakest chapters
with a one-click "Practise". **Mock Tests** lists every paper with your best score and attempts.

## Percentile estimates, strategy lab and exam tools

- **Percentile for the exam you took** (results screen, Home target card, Strategy Lab). When online, the app asks `/api/percentile` (a serverless function in
  `api/`, reading the sites listed in `server/percentile/sources.js`) for that exact exam's marks-vs-percentile table, so the percentile comes from the table for
  *that shift*: 2024, 2025 and 2026 papers have shift-wise tables (Physics Wallah, Collegedunia, Careers360, Competishun), 2021 and 2023 have a session-wide table.
  When several sites cover a shift, the card shows what each one gives and uses the middle value. The tables are cached on the device, so it still works offline
  after the first look; with no connection or no table it falls back to the built-in estimate in `src/lib/percentile.js`. Adding a site = one row in `sources.js`
  (the parser understands the common table layouts). NTA publishes no official marks-to-percentile table, so every figure is a site's estimate; your NTA score card has
  the real one. `npm run dev` serves the same `/api` routes locally.
- **Target percentile** on Home: pick a goal and see the marks it takes and how far your recent tests are.
- **Strategy Lab** (a tab on the analysis page): marks lost by cause (from your Mistake Book tags), a "move on after N minutes" what-if, and what your score would be worth in percentile
  if a few things had gone differently.
- **During a test**: a rough-work panel (draw with mouse, finger or pen, or type; kept per question for that test) and a pace chip showing time on the current question,
  turning amber and red when you run long (click it to turn hints off).

## Mistake Book

Every wrong answer from a finished test is added to the Mistake Book automatically. On the review screen you tag *why* you missed it
(concept gap, formula, calculation slip, misread, wrong approach, time pressure, guess) and can write a one-line rule for next time.
Questions come back for revision on a ladder of 1, 3, 7, 14, 30 and 60 days; a wrong answer sends a question back to tomorrow, and passing the
last step marks it mastered. Revision sessions are graded automatically against the answer key. The Insights tab shows your mix of causes, weakest
chapters and a test-by-test view. Your cause tags are also included in the "Export for AI analysis" file. The data lives in the browser store
(`jee_cbt_mistakes_v1`) and is part of Backup / Append backup.

## Practice mode

Build your own set from the whole question bank: pick subjects and chapters (each chip shows your accuracy so far), MCQ or numerical, exam years, and
a pool (all questions, not attempted yet, your Mistake Book, or starred). Choose 10-50 questions and either **Learn** mode (check each answer
straight away) or **Test** mode (results at the end, with a question palette), with an optional timer. Sessions are saved, so you can leave and resume.
Wrong answers go into the Mistake Book; the results screen lets you tag the causes.

## Where your data lives

History, notes, stars and settings are stored in the browser's IndexedDB. Use **Test History → Backup data** regularly: clearing site data deletes everything.
**Append backup** adds a backup file to what is already on the device and never replaces or removes anything: attempts, notes, starred questions, Mistake Book entries,
practice sessions, answer-key corrections and added papers that are missing here are added (a note you already have for a question is kept as it is), and you see what will be added before confirming.
A test in progress, rough work and the theme are never touched. Data from the old single-file version can be brought over the same way; see the note under the backup buttons.

## Adding a new paper

**Mock Tests → Add paper** takes a `<paperId>_addon.json` made with `Master_Prompt_Addon_JSON_2024_and_older.md` (90-question papers, 2021-2024; the 75-question prompt for 2025 onwards
produces the same file format, `jee-cbt-paper-addon-v1`). The file is checked first (id pattern and uniqueness, 75- or 90-question structure, numbering, options and answers, figure links and
data URIs, percentile link, text the app cannot show such as Markdown or `|` tables) and is only added if there are no errors; warnings do not block. An added paper is stored on the device
(`jee_cbt_cpaper_v1:<id>` in the store), shows an "Added by you" chip, is part of Backup / Append backup, and can be removed again from the same panel.
The checks live in `src/lib/paperAddon.js`, storage in `src/lib/customPapers.js`.

## Deploy (Vercel)

Import the repo in Vercel. It is detected as a Vite project (`vercel.json` sets the build command, output directory and cache headers). No environment variables are needed.

## Notes

- The service worker precaches the app, the question bank and MathJax; figures are cached the first time they are viewed.
- `npm audit` reports a few moderate issues in build-time tooling (the Workbox chain behind `vite-plugin-pwa`). They are not shipped to the browser.
