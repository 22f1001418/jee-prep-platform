// Copies the self-hosted MathJax build (core + web fonts + TeX extensions) from node_modules into
// public/vendor/mathjax so the app has no CDN dependency and works offline. Runs before dev and build.
import { cpSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "node_modules/mathjax/es5");
const dst = resolve(root, "public/vendor/mathjax");

if (!existsSync(src)) {
  console.error("mathjax is not installed. Run `npm install` first.");
  process.exit(1);
}
rmSync(dst, { recursive: true, force: true });
mkdirSync(dst, { recursive: true });
cpSync(resolve(src, "tex-mml-chtml.js"), resolve(dst, "tex-mml-chtml.js"));
cpSync(resolve(src, "output/chtml/fonts/woff-v2"), resolve(dst, "output/chtml/fonts/woff-v2"), { recursive: true });
cpSync(resolve(src, "input/tex/extensions"), resolve(dst, "input/tex/extensions"), { recursive: true });
console.log("MathJax copied to public/vendor/mathjax");
