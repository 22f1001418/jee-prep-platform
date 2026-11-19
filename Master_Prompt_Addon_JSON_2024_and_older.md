# MASTER PROMPT — CREATE A PAPER ADD-ON (.json) FOR AN OLDER JEE MAIN PAPER (2021–2024, 90-QUESTION FORMAT)

Use this prompt for JEE Main papers from 2024 and earlier (2021–2024) that have **90 questions**: in every subject 20 MCQ + 10 numerical, of which only 5 numericals are to be answered. For 75-question papers (2025 and later) use the other prompt.

> **FILES TO ATTACH IN THE NEW CHAT (check that all are present before starting; ask for any missing one):**
> 1. This prompt: `Master_Prompt_Addon_JSON_2024_and_older.md` (90-question papers, 2021-2024). Do NOT use the 75-question prompt for this paper.
> 2. My current main app HTML file (the latest one, with all papers merged so far).
> 3. `Paper_Merge_Tool_v5.html` (the current merge tool; older versions v3/v4 are outdated).
> 4. The question paper PDF with answer key.
> 5. Screenshots of the figures (any figure, table or graph without a screenshot you must build yourself, see the figures section).
> 6. ONE finished reference add-on JSON of a real earlier paper (for example `jee-2024-27jan-s1_addon.json`, a 90-question paper). It is only for learning the way of writing; see section 0. Do not copy its content.

## 0. REFERENCE EXAMPLE ADD-ON (READ THIS FIRST, BEFORE TOUCHING THE PDF)

With this prompt I attach one FINISHED, working add-on JSON of a real earlier paper (for example `jee-2024-27jan-s1_addon.json`, a 90-question paper). It is the reference for the way of writing. It was already merged and tested in my app, so its style is the correct style.

How to use it:
1. Open it with a script that hides the huge base64 image data, otherwise it is too big to read. Example (run with `python3 -I`):
   `import json,sys; d=json.load(open(sys.argv[1])); [f.update(uri=f["uri"][:40]+"...") for f in d["figures"].values()]; print(json.dumps(d,ensure_ascii=False,indent=1))` and read it in parts.
2. Study at least 10 MCQ and 5 numerical questions from EACH subject, all questions that contain `[[img:...]]`, and the paper header. Learn exactly:
   - the key names and key order of the paper object and of every question object (MCQ and NUM);
   - how mathematics is written in `$...$` LaTeX (fractions, roots, powers, vectors, matrices, integrals, limits, degrees, units such as m s^-1, Greek letters), and how plain text and LaTeX are mixed in one sentence;
   - how chemical formulae, ions, charges, subscripts, reaction arrows and conditions are written;
   - how Physics units, constants and numbers with powers of ten are written;
   - how `\n` line breaks, "Statement (I)" / "Statement (II)" questions, "Match List-I with List-II" questions, assertion-reason questions and multi-line options are laid out;
   - where `[[img:ID]]` sits (before/after the sentence, inside an option) and how figure IDs are named; how tables and drawn figures are stored in `figures` (`w`, `h`, `uri`);
   - how chapter names look (the exact spelling, no slashes), how `answer` is stored (MCQ letter, NUM string), and where `percentileUrl` sits.
3. Write the new paper in the SAME style. Where the PDF needs something the example does not show, follow this prompt and the existing questions inside my main app file.
4. If the example is a 90-question paper, it also shows how `format`, the PDF numbering and the 20 MCQ + 10 numerical blocks look. If it is a 75-question paper, use it for the writing style only and take the 90-question rules from this prompt.
5. The example is ONLY a style guide. Never copy its questions, options, answers, figures, figure IDs, paper id/name or `percentileUrl` into the new paper. Everything in the new file comes from the new PDF, the new figures and the new search for the percentile page. If the example and this prompt ever disagree about a rule, this prompt wins; tell me about the difference in the final report.
6. If no example file is attached, ask me for it before starting.
7. At the end, run a script that compares your finished file with the example: same top-level keys, same paper keys, same question keys, same figure object keys, same answer format, same text conventions (no `**`, no pipes, LaTeX only inside `$...$`). Print the result and explain every difference (a difference is fine only when the new paper genuinely needs it).

## 1. YOUR OBJECTIVE

I am providing:

1. My current JEE Main CBT application as an HTML file (read it to learn its conventions; do not modify it).
2. `Paper_Merge_Tool_v5.html` (shows exactly how an add-on file is validated and merged into the app).
3. A previous-year paper PDF with answer key (MathonGo style: question paper, answer key either on the last page as `1. (2)  2. (4) ...` or under each question as `MathonGo Answer Key : (3)`).
4. Screenshots (PNG/JPG) of the figures that appear in the paper. Figures I did not screenshot you must draw yourself (section 6).
5. One finished reference add-on JSON of an earlier paper (section 0), only to copy the way of writing.

Produce ONE file: **`<paperId>_addon.json`** that I will merge with Paper_Merge_Tool_v5.html. **Do not edit or return my main HTML.** Use it only to learn conventions and to test on a temporary copy.


The app defines how the platform behaves. The PDF defines the questions and the answer key. The screenshots define the figures.

## 2. PAPER IDENTITY

- Identify the exact year, date and shift from the PDF header (e.g. "JEE Main 2024 (27 Jan Shift 1)").
- `id` MUST follow exactly `jee-YYYY-DDmon-sN`, lowercase 3-letter month, no zero padding: e.g. `jee-2024-27jan-s1`. The app sorts papers newest-first from this pattern.
- `name`: `JEE Main 2024 (27 Jan Shift 1)`; `shortName`: `27 Jan Shift 1` (same style as existing papers). Morning = Shift 1, evening = Shift 2.
- The id must not already exist in the main file.

## 3. THE 90-QUESTION FORMAT

- 90 questions: 3 subjects × (20 MCQ + 10 numerical). Marks: +4 correct, −1 wrong MCQ, 0 unattempted. The candidate may answer any 5 of the 10 numericals per subject, so the maximum is 300 marks and the exam lasts 180 minutes.
- **Keep the question numbers exactly as printed in the PDF** for `n`. Some PDFs start with Physics (example: 2024 27 Jan Shift 1 is Physics Q1–30, Chemistry Q31–60, Mathematics Q61–90; in each block the first 20 are MCQ and the last 10 numerical). Do not renumber and do not reorder to put Mathematics first: the app itself always shows Mathematics, then Physics, then Chemistry, MCQ before numerical, in your PDF numbering order.
- Check each question's real subject from its content, not only from the position; report any inconsistency.
- `subject` must be exactly `Mathematics`, `Physics` or `Chemistry`. `type` must be `MCQ` or `NUM`.
- Add this to the paper object (it switches on the "answer any 5 of 10" behaviour):
  `"format": {"numToAttempt": 5}`
- **Marking scheme is fixed: +4 / −1 / 0 for every paper and every question type (numericals included), whatever the year.** Do NOT add a `marking` key; the merge tool rejects it.
- If the real structure differs (a paper with a different number of questions, only MCQ, etc.), STOP and report the exact discrepancy; do not force it to fit.

## 4. TRANSCRIBE EVERY QUESTION ACCURATELY

Reproduce each question and option exactly as in the PDF: wording, typos, numbering, option order, symbols, units, conditions, text before/between/after figures. Do not paraphrase or correct.

- Math is written as LaTeX between `$...$`, line breaks as `\n`, exactly like existing questions (read several existing Mathematics, Physics and Chemistry questions first, and the reference add-on of section 0, and copy their conventions, including how chemical formulae and units are written).
- PDF text extraction of this style of PDF is unreliable for superscripts, subscripts, fractions, matrices, integrals and vectors (units like m s⁻¹ get split). **Render the pages as images and read the math from the image**, using extracted text only as an aid.
- Ignore the MathonGo watermark, headers, footers and advertisement lines; they are not part of the questions.
- Recheck every question and option against the page image after the first pass, with automated comparisons where possible, and inspect any discrepancy.

## 5. ANSWER KEY

- The key in the PDF is authoritative. MCQ: option number 1/2/3/4 → `A`/`B`/`C`/`D`. Numerical: the number in the key, stored as text (e.g. `"673"`).
- Verify all 90 stored answers against the key page; the target is zero mismatches.
- If the key shows something the app supports only through optional fields, use them: two correct options → `"altAnswers": ["D"]`; a numerical accepted as a range → `"range": [2.5, 3.5]` (and `answer` holds one value inside it); a dropped/bonus question → `"bonus": true`. Otherwise do not invent anything. Never replace an official answer because you think it is wrong; mention real doubts in the report.
- Numerical answers must be plain numbers (digits, optional minus sign and decimal point).

## 6. FIGURES

- Establish what each screenshot shows and which PDF page and question it belongs to. Use image comparison plus visual inspection; a high similarity score alone is not proof (watermarks and repeated page elements mislead). Build a contact sheet (screenshot next to the matching PDF region and question number), actually open it and look at it, and enlarge it if too small.
- A screenshot that already contains the question statement and options: embed the whole image and do not duplicate its text; keep selectable A–D options with the correct order.
- Use each screenshot whole and unedited (no crop/recolour/retouch). Embed in text as `[[img:ID]]`.
- **A figure with no screenshot must be redrawn** as an accurate SVG (shapes, geometry, curves, axes, labels, units, circuit connections, chemical structures, option layouts) and stored like an image: `"uri": "data:image/svg+xml;base64,..."`. Render every drawn SVG, compare it with the PDF region and fix differences before accepting it. Never leave a required figure as a text description.
- **TABLES, GRAPHS, DIAGRAMS AND STRUCTURES ARE FIGURES TOO (critical):**
The app renders question and option text as **plain text plus `$...$` LaTeX only**. It does NOT render Markdown or HTML: `**bold**`, `| pipe | tables |`, `#`, backticks, `<br>`, `<table>` and ASCII tables all appear literally on screen (this already happened: a frequency table written with `|` pipes showed up as raw pipe characters). Therefore:
- **Never write a table in the text.** Every table in the PDF - data / frequency / distribution tables, "Match List-I with List-II" tables, statement tables, answer-matrix tables, value tables - must be built by you as an image and stored in `figures`, then placed in the text with `[[img:ID]]` exactly where it sits in the PDF. Do not squeeze a table into one line such as "List-I: A. ... B. ..." either. This applies even when I supplied no screenshot for it: **a missing screenshot is never a reason to skip, flatten or describe a table, graph, circuit, geometry diagram, ray diagram, chemical structure or option picture - you must create it yourself.**
- How to build a table image: write a small HTML `<table>` (black 1px borders, serif font, white background, math as italic / `<sub>` / `<sup>` / Unicode), screenshot that element with headless Chromium at device scale factor 2, save as PNG, and store `{"w": <CSS width px, i.e. half the PNG width>, "h": <CSS height px>, "uri": "data:image/png;base64,..."}`. Keep text sizes similar to the PDF. Graphs, circuits and structures: draw as accurate SVG (or PNG) as described above.
- Do not use Markdown anywhere in `text` or option `text`. Statement / bold labels are written as plain text ("Statement (I) : ...", "Choose the correct answer ..."). Line breaks are plain `\n`. The only markup allowed is `$...$` LaTeX and `[[img:ID]]`.
- **Mandatory scan before delivery:** (a) look at every PDF question page image and list each question that contains any table, graph, figure, circuit, structure or picture; confirm each one has an `[[img:...]]` (or `svg`) in its question or options, and that nothing visual is encoded as text; (b) check with a script that no `text` / option `text` contains `**`, a line starting with `|`, `#`, backticks, `<br>`, `<table>` or `&nbsp;`; (c) compare the count of visual items found in (a) with the PDF's embedded images (`pdfimages -list`) and explain every difference (tables and vector drawings are often NOT listed as embedded images, so inspect the page images themselves).
- When testing in the browser, remember MathJax may not load in a sandbox (then `$...$` shows raw); that is a test-environment limitation. Raw `|`, `**` or missing tables are NOT - they are your bug.
- Figure format in the add-on: `"figures": {"<id>": {"w": <width px>, "h": <height px>, "uri": "data:image/png;base64,..."}}`.
- **Figure ids** must use only letters, digits and underscore, and start with a prefix unique to this paper, e.g. `y2024_27jan_s1_q26` (for options of one question: `..._q26o1`). Read every figure id already in the main file first and make sure none of yours exists.
- Report: number of figures matched automatically, lowest accepted score, manually resolved ones, drawn figures, unresolved ones.

## 7. CHAPTERS

Use the chapter names already present in the main file (inspect the taxonomy first). One chapter per question; never a combined label with a slash (e.g. "Equilibrium / Stoichiometry"). Avoid new names that differ only by case, punctuation, plural or "&" vs "and". Do not merge genuinely different topics. Report any genuinely new chapter name and why.

**Mandatory chapter check (script, before delivery):** read every `subject` + `chapter` pair already present in the main file's question data and run a script over your add-on: every question's chapter MUST be one of the existing chapter names for that subject. Print the list of any chapter that is not found. Only if no existing chapter genuinely fits may you introduce a new name, and then you must (a) compare it against the existing list for case / plural / "&" / "and" / punctuation duplicates, (b) report each new name with a one-line reason in the final report. Never invent a chapter name just because it sounds more specific (for example "Salt Analysis" when "Qualitative Analysis" already exists; "Ionic Equilibrium" when "Equilibrium" exists; "Halogens" when "p-Block Elements" exists).

## 8. THE ADD-ON FILE

```
{
  "format": "jee-cbt-paper-addon-v1",
  "paper": {
    "id": "jee-2024-27jan-s1",
    "name": "JEE Main 2024 (27 Jan Shift 1)",
    "shortName": "27 Jan Shift 1",
    "percentileUrl": "https://example.com/verified-marks-vs-percentile-page-for-this-shift",
    "format": {"numToAttempt": 5},
    "questions": [ ...90 question objects... ]
  },
  "figures": { ... }
}
```
Question objects use exactly the keys of existing papers:
- MCQ: `{"n": 1, "subject": "Physics", "chapter": "...", "type": "MCQ", "text": "...", "options": [{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}], "answer": "A"}`
- Numerical: `{"n": 21, "subject": "Physics", "chapter": "...", "type": "NUM", "text": "...", "answer": "673"}` (no `options` key).
- Optional: `altAnswers`, `range`, `bonus` (section 5).

**Percentile link (`percentileUrl`) - your duty**
The app shows a "Check percentile for this score" link under the score on the results page. It opens ONE web page that gives the marks-vs-percentile table for exactly this exam date and shift. Finding that page is your job:
- Use web search to find a page for THIS exact paper (e.g. "JEE Main <year> <date> shift <n> marks vs percentile"). Prefer well-known coaching / education sites (Careers360, Shiksha, PW, Aakash, Embibe, Collegedunia etc.) whose page is specifically about this shift and contains a marks-to-percentile table.
- Open (fetch) the page and CHECK it. A link that merely looks right is NOT enough: some sites show "Error 404: Page not found" or redirect to a home / search page while still returning a normal-looking page (this already happened). The page must pass ALL of these checks, each done on the real fetched page text, never on the search-result snippet:
  1. The fetch succeeds (HTTP 200) and the FINAL address after redirects is still the article you wanted (not a home page, search page, category page or error page).
  2. The page text does NOT contain signs of a missing page: "404", "Page not found", "Page Not Found", "cannot be found", "no longer available", "Oops", or an empty article.
  3. The title / headings / text name the SAME exam date and shift as this paper (for example "2 April 2026, Shift 1" or "Shift 1 ... 2 Apr"). A generic "session" page or a page for another shift is not acceptable. A page that covers several shifts is acceptable only if it has a clearly labelled marks-vs-percentile table for exactly this date and shift (say which table in the report).
  4. The page really contains DATA: a marks-vs-percentile table (or marks range to percentile list) with real numbers, at least 5 rows, for this shift. An article that only says "will be updated soon", "to be released", or only talks about the process, has no data and is not acceptable.
  5. Show the evidence in your report: HTTP status, final URL, page title, and copy 2-3 actual rows of the table you saw (for example "270 marks -> 99.xxxxx percentile").
  If any check fails, try the next best page from your search (up to 5 candidates). If no candidate passes, OMIT `percentileUrl`. Never put a link you could not open and read yourself. Never invent, guess or build a URL from a pattern.
- Put the one full link in the paper object as `"percentileUrl": "https://..."` (plain `http(s)://` link, no spaces, under 600 characters). The merge tool rejects anything else.
- If you cannot browse, or no matching verified page exists, OMIT the key (do not put a placeholder) and say so in your final report. The app simply hides the link for a paper without it.
- Report the URL you chose and what you verified on the page. Do not add any other percentile data, tables or calculations to the add-on; the app only links out.

Rules: no `marking` key; question numbers are 1..90 with no gaps or duplicates; each subject has exactly 20 MCQ + 10 NUM; no existing paper or figure id is touched; valid UTF-8 JSON. The merge tool refuses the file if any of this is wrong (read its `validatePaper` function and make your file pass it).

## 9. AUTOMATED VALIDATION

Check programmatically: 90 questions; n = 1..90; 30 per subject; 20 MCQ + 10 NUM per subject; every MCQ has options A–D and its answer is one of them; every NUM answer is a plain number; every question has text, subject and chapter; every `[[img:ID]]` resolves to a figure; figure ids are unique and prefixed; every answer equals the PDF key (final independent re-check in section 12); question and option text verified against the pages. Valid JSON proves nothing about accuracy; investigate every discrepancy against the source.

## 10. TEST IN THE REAL APP

Apply the add-on to a TEMPORARY copy of my main HTML exactly as Paper_Merge_Tool_v5.html does (run its `mergeAddon`), then run that copy in a real browser. If the CDN libraries (React, Babel, MathJax, jsPDF) cannot load, find a local alternative and say clearly which checks were actually executed and which could not be. Use an isolated browser context so no real saved data is touched. Test:

A. The paper appears in the picker with the right name and sorts correctly; older papers still appear.
B. The exam opens on the first Mathematics question; tabs run Mathematics, Physics, Chemistry; every question (including every figure question) shows the right text, figure and options; question numbers are the PDF's numbers.
C. Perfect score: answer all 60 MCQ and any 5 numericals per subject with the key → 300/300, 75 correct, 0 wrong, 0 unattempted; the other 15 numericals appear as "not chosen".
D. Lock: after 5 numericals are answered in a subject, saving a 6th is blocked with a message; clearing one answer releases the lock.
E. Partial: answer only 3 numericals in one subject → 2 unused slots count as unattempted, 5 appear as not chosen; totals add up to 75.
F. The analysis page has a "Not chosen" filter listing the not-chosen numericals (with correct answers and figures); the AI export (.md section "8b") and the Wrong + Unattempted PDF ("Part C") include them too. (The results page itself has no separate Not-chosen button.)
G. History lists the attempt under the right paper; opening it works; a note on a question (including a not-chosen one) stays attached to the right paper and attempt.
H. Percentile link: with `percentileUrl` set, the percentile link button shows on the results page and opens that URL; if the key was omitted, no button appears.
I. Regression: one existing 75-question paper still works exactly as before (no "attempt any" banner, no lock).

## 11. HONESTY AND TROUBLESHOOTING

If an operation fails, find the real cause and fix it. Never claim a test passed, a screenshot was inspected, or a comparison was made unless you actually did it and looked at the result. Do not invent matching scores or test results. Name exactly what remains unverified and why. Do not give me a list of manual tasks.

==================================================
## 12. FINAL ANSWER RE-CHECK (LAST STEP, MANDATORY)
==================================================

After the add-on file is completely finished and saved (after all tests and fixes), do one last independent answer check. Do it from the saved file, not from your working variables.

1. Reload the saved `<paperId>_addon.json` from disk.
2. Open the answer-key page(s) of the PDF again (or the `Answer Key` line under each question) and read the key afresh from the page image / PDF text. Do not reuse the key list you typed earlier.
3. For EVERY question 1-90, one by one, compare the correct answer in the PDF with the `answer` stored in the JSON (MCQ: option 1/2/3/4 = A/B/C/D; numerical: the same number, digit for digit, same sign and decimals). Also check `altAnswers`, `range` and `bonus` only where the PDF key has such a case.
4. Print the full comparison table (`n | subject | type | PDF key | JSON answer | match`) and the count of matches.
5. If even one answer differs, find the cause in the PDF, fix the JSON, re-run the validation and this re-check until all 90 match. Never "fix" an answer to what you think is right; the PDF key is authoritative.
6. Also open the `percentileUrl` of the saved file once more and confirm again that it loads, is not a 404 / error / redirect page, and still shows the marks-vs-percentile data for this shift. If not, fix or remove the key.
7. Put the result (90/90 matched, or the exact list of fixed items) in the final report.

## 13. FINAL REPORT (brief and factual)

1. New file: add-on filename and path; confirmation that it merged cleanly into a test copy.
2. Question verification: counts, subject/type distribution, PDF numbering used, answer-key mismatches.
3. Image mapping: automatic matches, lowest accepted score, manual matches.
4. Percentile link: the `percentileUrl` chosen with the evidence from the checks (HTTP status, final URL, title, 2-3 table rows), or why omitted.
5. Figures and tables created by me (tables as images): question numbers or none; result of the mandatory scan in section 6.
6. Chapters: result of the chapter check script; genuinely new names and why, or none.
7. Marking: confirm no `marking` key was added (fixed +4/−1/0).
8. Browser tests A–I: what actually ran and the results.
9. PDF export: genuine or mocked.
10. Final answer re-check (section 12): 90/90 matched, or exactly what was fixed.
11. Style match with the reference example: result of the comparison script in section 0, and every justified difference.
12. Unresolved issues.

BEGIN BY INSPECTING ALL FILES. IDENTIFY THE EXACT DATE AND SHIFT, TRANSCRIBE THE 90 QUESTIONS FROM THE PAGE IMAGES, VERIFY THE KEY, MATCH OR DRAW THE FIGURES, TEST ON A TEMPORARY MERGED COPY, AND DELIVER THE ADD-ON JSON.
