// Question bank and figures. Both are fetched once at start-up (before the app code is loaded), then cached by the
// service worker. They are filled in place so the rest of the app can import them as plain constants.
export const RAW_PAPERS = [];
export const FIG_IMAGES = {};

const base = import.meta.env.BASE_URL;

export async function loadData() {
  const [papers, figs] = await Promise.all([
    fetch(base + "data/papers.json").then(r => { if (!r.ok) throw new Error("papers.json " + r.status); return r.json(); }),
    fetch(base + "data/figs.json").then(r => { if (!r.ok) throw new Error("figs.json " + r.status); return r.json(); }),
  ]);
  RAW_PAPERS.push(...papers);
  Object.keys(figs).forEach(id => {
    const f = figs[id];
    FIG_IMAGES[id] = { w: f.w, h: f.h, uri: base + "figs/" + f.file };
  });
}

// The exported test files are self-contained, so they need the picture itself, not a link to it.
const dataUriCache = new Map();
export async function figWithDataUri(id) {
  const f = FIG_IMAGES[id];
  if (!f) return null;
  if (f.uri.startsWith("data:")) return f;
  if (!dataUriCache.has(id)) {
    const blob = await fetch(f.uri).then(r => r.blob());
    const uri = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
    dataUriCache.set(id, uri);
  }
  return { w: f.w, h: f.h, uri: dataUriCache.get(id) };
}
