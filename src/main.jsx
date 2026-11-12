import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "./styles.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { initStore, store } from "./lib/store";
import { loadData } from "./lib/data";
import { showStorageBanner } from "./lib/storageAlerts";

const root = createRoot(document.getElementById("root"));

async function boot() {
  root.render(<div style={{ padding: 40, fontFamily: "system-ui, sans-serif", color: "var(--text-dim)" }}>Loading…</div>);
  // 1. saved data into memory, 2. question bank + figures, 3. MathJax ready, 4. only then load the app code,
  // because several modules read saved data and the question bank while they are being evaluated.
  await initStore();
  store.onError(() => showStorageBanner("Could not save to this browser's storage. Your data is still on screen; export a backup soon."));
  await loadData();
  try { if (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise) await window.MathJax.startup.promise; } catch (e) { /* math just will not render */ }
  const [{ App }, { ErrorBoundary }, { rescoreHistory }] = await Promise.all([
    import("./App"), import("./components/ErrorBoundary"), import("./lib/scoring"),
  ]);
  rescoreHistory();   // keep saved scores in step with the (corrected) answer key
  root.render(<ErrorBoundary><App /></ErrorBoundary>);
}

boot().catch(err => {
  console.error(err);
  root.render(
    <div style={{ padding: 40, fontFamily: "system-ui, sans-serif" }}>
      <h2>The app could not start</h2>
      <p>{String(err && err.message || err)}</p>
      <p>Check your connection and reload. Your saved data is not affected.</p>
    </div>
  );
});
