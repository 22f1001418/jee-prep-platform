// Loads the real question bank into the app's data module before anything that reads it is imported
// (the app does the same in src/main.jsx).
import fs from "node:fs";
import {RAW_PAPERS} from "../src/lib/data";

export const rawPapers = JSON.parse(fs.readFileSync(new URL("../public/data/papers.json", import.meta.url), "utf8"));
if(!RAW_PAPERS.length) RAW_PAPERS.push(...JSON.parse(JSON.stringify(rawPapers)));
