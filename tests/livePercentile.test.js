import {beforeEach, describe, expect, it} from "vitest";
import {marksOf, percentileOf, parseShiftTables, shiftLabel} from "../server/percentile/parse.js";
import {clearSourceCache, percentileSourcesFor} from "../server/percentile/live.js";
import {estimatePercentile, fetchLivePercentile, liveStatus, resetLiveForTests} from "../src/lib/percentile";

const table = rows => `<table>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>`;
const PW = `<h2>January 22 shifts</h2>` + table([
  ["JEE Mains 2025 Session 1 January 22 Shift 1 &amp; 2 Marks vs Percentile"],
  ["Percentile", "Shift 1 (Morning)", "Shift 2 (Evening)"],
  ["99", "158", "186"], ["98", "133", "163"], ["95", "101", "129"], ["90", "78", "102"],
]);
const CAREERS_APR = `<h3>April session</h3>` + table([
  ["Shift", "99th %tile", "98th %tile", "95th %tile", "90th %tile"],
  ["2 Apr S1", "176-180", "156-160", "121-125", "86-90"], ["4 Apr S2", "191-195", "171-175", "136-140", "101-105"],
]);
const CAREERS_JAN = `<h3>Shift Wise JEE Main 2026 January Session</h3>` + table([
  ["Percentile", "21S1", "21S2"], ["99", "167", "171"], ["98", "144", "157"], ["95", "110", "113"],
]);
const BANDS = table([["Score", "Percentile"], ...Array.from({length: 12}, (_, i) => [`${i * 10 + 1} - ${i * 10 + 10}`, `${(i * 8).toFixed(2)} - ${(i * 8 + 7).toFixed(2)}`])]);

describe("reading the sites", () => {
  it("understands marks and percentile cells", () => {
    expect(marksOf("176–180")).toBe(178); expect(marksOf("167+")).toBe(167); expect(marksOf("–")).toBeNull(); expect(marksOf("130140")).toBeNull();
    expect(percentileOf("99th %tile")).toBe(99); expect(percentileOf("99.00 - 99.49")).toBe(99); expect(percentileOf("99.9%ile Band")).toBe(99.9);
  });
  it("reads shift labels in every style the sites use", () => {
    expect(shiftLabel("27 Jan M")).toEqual({day: 27, month: "jan", shift: 1});
    expect(shiftLabel("27th Jan Shift 2")).toEqual({day: 27, month: "jan", shift: 2});
    expect(shiftLabel("21S2", "jan")).toEqual({day: 21, month: "jan", shift: 2});
    expect(shiftLabel("2 Apr S1")).toEqual({day: 2, month: "apr", shift: 1});
    expect(shiftLabel("Shift 1 (Morning)")).toEqual({day: null, month: null, shift: 1});
  });
  it("takes the date from a table's title row (percentile down the side)", () => {
    const {shifts} = parseShiftTables(PW);
    expect(shifts["jan-22-1"][0]).toEqual([158, 99]); expect(shifts["jan-22-2"][0]).toEqual([186, 99]);
  });
  it("reads shifts-down-the-side tables, using the middle of a marks range", () => {
    const {shifts} = parseShiftTables(CAREERS_APR);
    expect(shifts["apr-2-1"]).toEqual([[178, 99], [158, 98], [123, 95], [88, 90]]);
    expect(Object.keys(shifts)).toContain("apr-4-2");
  });
  it("gets the month of a bare '21S1' column from the heading before the table", () => {
    expect(Object.keys(parseShiftTables(CAREERS_JAN).shifts)).toEqual(["jan-21-1", "jan-21-2"]);
  });
  it("reads a session-wide marks band table", () => {
    const {general, shifts} = parseShiftTables(BANDS);
    expect(Object.keys(shifts)).toHaveLength(0); expect(general.length).toBeGreaterThanOrEqual(20);
  });
});

describe("asking the sites for one exam", () => {
  beforeEach(() => clearSourceCache());
  const fake = html => async () => ({ok: true, text: async () => html});
  it("returns only that exam's shift", async () => {
    const r = await percentileSourcesFor("jee-2025-22jan-s2", fake(PW));
    const pw = r.sources.find(s => s.id === "pw-2025");
    expect(pw.status).toBe("ok"); expect(pw.anchors[0]).toEqual([186, 99]);
  });
  it("reports a site that cannot be reached instead of failing", async () => {
    const r = await percentileSourcesFor("jee-2025-24jan-s1", async () => { throw new Error("blocked"); });
    expect(r.sources[0]).toMatchObject({status: "error", error: "blocked"});
  });
  it("rejects an id that is not an exam", async () => { expect((await percentileSourcesFor("nope")).sources).toEqual([]); });
});

describe("percentile from live tables", () => {
  beforeEach(() => resetLiveForTests());
  const respond = sources => async () => ({ok: true, json: async () => ({fetchedAt: "2026-11-20T00:00:00Z", sources})});
  const src = (id, anchors, scope = "shift") => ({id, label: id, url: "https://example.com/" + id, scope, status: "ok", anchors});

  it("uses the built-in estimate until the live tables arrive", () => {
    expect(estimatePercentile("jee-2025-22jan-s1", 120).basis).toBe("shift");
  });
  it("uses this exam's own table once fetched", async () => {
    expect(await fetchLivePercentile("jee-2024-1feb-s1", respond([src("a", [[100, 90], [130, 95], [160, 98], [190, 99]])]))).toBe(true);
    const e = estimatePercentile("jee-2024-1feb-s1", 145);
    expect(e.basis).toBe("live"); expect(e.pct).toBeCloseTo(96.5, 1); expect(liveStatus("jee-2024-1feb-s1")).toBe("live");
  });
  it("shows every site and takes the middle when they disagree", async () => {
    await fetchLivePercentile("jee-2026-2apr-s1", respond([src("low", [[80, 90], [110, 95], [150, 98], [160, 99]]), src("mid", [[90, 90], [120, 95], [160, 98], [170, 99]]), src("high", [[100, 90], [130, 95], [170, 98], [180, 99]])]));
    const e = estimatePercentile("jee-2026-2apr-s1", 140);
    expect(e.sources).toHaveLength(3);
    expect(e.pct).toBeCloseTo(e.sources.map(s => s.pct).sort((a, b) => a - b)[1], 6);
    expect(e.lo).toBeLessThanOrEqual(Math.min(...e.sources.map(s => s.pct))); expect(e.hi).toBeGreaterThanOrEqual(Math.max(...e.sources.map(s => s.pct)));
  });
  it("stays sensible above and below a table that only covers 90-99", async () => {
    await fetchLivePercentile("jee-2026-4apr-s1", respond([src("a", [[100, 90], [130, 95], [160, 98], [190, 99]])]));
    expect(estimatePercentile("jee-2026-4apr-s1", 230).pct).toBeGreaterThan(99);
    expect(estimatePercentile("jee-2026-4apr-s1", 40).pct).toBeLessThan(90);
  });
  it("falls back to the built-in estimate when the fetch fails", async () => {
    expect(await fetchLivePercentile("jee-2025-22jan-s1", async () => { throw new Error("offline"); })).toBe(false);
    expect(liveStatus("jee-2025-22jan-s1")).toBe("fallback");
    expect(estimatePercentile("jee-2025-22jan-s1", 120).basis).toBe("shift");
  });
  it("ignores malformed server data", async () => {
    expect(await fetchLivePercentile("jee-2024-1feb-s1", respond([src("bad", [[1, 500], [2, 3], [3, 4]])]))).toBe(false);
  });
  it("uses a session-wide table when there is no shift table", async () => {
    const band = Array.from({length: 20}, (_, i) => [i * 15, 5 + i * 4.7]);
    await fetchLivePercentile("jee-2023-1feb-s2", respond([src("sess", band, "session")]));
    const e = estimatePercentile("jee-2023-1feb-s2", 150);
    expect(e.basis).toBe("live-general"); expect(e.pct).toBeCloseTo(5 + 10 * 4.7, 1);
  });
});
