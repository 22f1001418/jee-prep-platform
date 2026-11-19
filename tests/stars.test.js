import {beforeEach, describe, expect, it} from "vitest";
import "./setup";
import {store} from "../src/lib/store";
import {LS_STAR_Q, loadStarQ, starQKey, toggleStarQ} from "../src/screens/ProfileScreen";
import {buildPool, poolContext, poolSizes} from "../src/lib/practice";
import {PAPER_REGISTRY} from "../src/lib/papers";

const P = PAPER_REGISTRY[0].id;
beforeEach(()=>store.removeItem(LS_STAR_Q));

describe("starred questions", ()=>{
  it("toggles a star on and off and keeps one entry per question", ()=>{
    expect(toggleStarQ(P, 3)).toHaveLength(1);
    expect(toggleStarQ(P, 4)).toHaveLength(2);
    expect(toggleStarQ(P, 3).map(x=>x.n)).toEqual([4]);
    expect(loadStarQ().map(x=>starQKey(x.paperId, x.n))).toEqual([`${P}:4`]);
  });
  it("ignores damaged and duplicate entries when loading", ()=>{
    store.setItem(LS_STAR_Q, JSON.stringify([{paperId:P, n:1}, {paperId:P, n:"1"}, null, 5, {paperId:7, n:2}, {paperId:P, n:"x"}, {paperId:P, n:2}]));
    expect(loadStarQ().map(x=>x.n)).toEqual([1, 2]);
    store.setItem(LS_STAR_Q, "{broken"); expect(loadStarQ()).toEqual([]);
    store.setItem(LS_STAR_Q, JSON.stringify({a:1})); expect(loadStarQ()).toEqual([]);
  });
  it("the Practice 'starred' pool contains exactly the starred questions (it was always empty)", ()=>{
    expect(poolSizes(poolContext()).starred).toBe(0);
    toggleStarQ(P, 3); toggleStarQ(P, 10);
    const ctx = poolContext();
    expect(poolSizes(ctx).starred).toBe(2);
    expect(buildPool({pool:"starred"}, ctx).map(x=>x.key).sort()).toEqual([`${P}:10`, `${P}:3`].sort());
    toggleStarQ(P, 3);
    expect(buildPool({pool:"starred"}, poolContext()).map(x=>x.key)).toEqual([`${P}:10`]);
  });
});
