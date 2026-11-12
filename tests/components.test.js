import {describe, expect, it} from "vitest";
import fs from "node:fs";
import path from "node:path";

// The build does not notice a component that is used but never imported (it only fails when that screen is opened,
// which is how the Practice screen once shipped broken). This checks every <Component> in every source file.
const root = new URL("../src/", import.meta.url).pathname;
const walk = d => fs.readdirSync(d).flatMap(f=>{ const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });

describe("source files", ()=>{
  it("every JSX component is imported or defined in the file that uses it", ()=>{
    const missing = [];
    for(const file of walk(decodeURIComponent(root)).filter(f=>/\.jsx$/.test(f))){
      const src = fs.readFileSync(file, "utf8");
      const tags = new Set([...src.matchAll(/<([A-Z][A-Za-z0-9]*)(?=[\s/>.])/g)].map(m=>m[1]));
      for(const t of tags){
        const defined = new RegExp(`(import[^;]*\\b${t}\\b[^;]*from)|((function|const|let|class)\\s+${t}\\b)|([{,]\\s*${t}\\s*[,}=:])`).test(src);
        // "<Math" style false positives: a comparison such as a<Math.min(...) is not JSX
        const isComparison = !new RegExp(`<${t}[\\s/>]`).test(src) && new RegExp(`<${t}\\.`).test(src) && typeof globalThis[t] !== "undefined";
        if(!defined && !isComparison) missing.push(`${path.relative(decodeURIComponent(root), file)}: <${t}>`);
      }
    }
    expect(missing).toEqual([]);
  });
});
