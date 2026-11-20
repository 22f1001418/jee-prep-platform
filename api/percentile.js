// GET /api/percentile?paper=jee-2025-22jan-s1
// Reads the exam's marks-vs-percentile tables from the published sites (browsers cannot, those sites block cross-origin reads)
// and returns them as small JSON. The app turns your marks into a percentile from this.
import {percentileSourcesFor} from "../server/percentile/live.js";

export default async function handler(req, res){
  const paper = String((req.query && req.query.paper) || new URL(req.url, "http://x").searchParams.get("paper") || "");
  if(!/^jee-\d{4}-\d{1,2}[a-z]{3}-s\d+$/i.test(paper)){ res.statusCode = 400; res.setHeader("content-type", "application/json"); res.end(JSON.stringify({error:"paper must look like jee-2025-22jan-s1"})); return; }
  try{
    const data = await percentileSourcesFor(paper);
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    // shared cache for a day, served stale while it refreshes: the source pages change rarely
    res.setHeader("cache-control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.end(JSON.stringify(data));
  }catch(e){
    res.statusCode = 502; res.setHeader("content-type", "application/json"); res.end(JSON.stringify({error:"could not read the source sites"}));
  }
}
