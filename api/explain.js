// POST /api/explain  {paperId, n}  ->  streams an AI-written solution as newline-delimited JSON:
//   {"t":"text chunk"} ... then {"done":true,"model":"..."}  or  {"error":"code","message":"..."}
// Environment (set in Vercel > Settings > Environment Variables, or .env.local for local dev):
//   ANTHROPIC_API_KEY   required, stays on the server
//   APP_ACCESS_CODE     required: the passcode the app sends in the x-access-code header (stops strangers spending your API credit)
//   EXPLAIN_MODEL       optional, default claude-opus-5-5
//   EXPLAIN_EFFORT      optional low|medium|high|xhigh|max, default high
//   EXPLAIN_FALLBACKS   optional, "off" to skip the server-side refusal-fallback parameter
//   EXPLAIN_RATE_PER_HOUR optional, default 60 requests per client per hour (best effort per server instance)
import Anthropic from "@anthropic-ai/sdk";
import {timingSafeEqual} from "node:crypto";
import {buildRequest, findQuestion} from "./_prompt.js";

const DEFAULT_MODEL = "claude-opus-5-5";
const hits = new Map();   // ip -> [timestamps]

function send(res, status, obj){
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}
function sameSecret(a, b){
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && timingSafeEqual(x, y);
}
function limited(ip){
  const max = Number(process.env.EXPLAIN_RATE_PER_HOUR) || 60, now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 3600000);
  if(list.length >= max){ hits.set(ip, list); return true; }
  list.push(now); hits.set(ip, list);
  if(hits.size > 5000) hits.clear();
  return false;
}
async function readBody(req){
  if(req.body !== undefined && req.body !== null){ return typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
  const chunks = []; let size = 0;
  for await (const c of req){ size += c.length; if(size > 4096) throw new Error("too large"); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export default async function handler(req, res){
  if(req.method !== "POST"){ res.setHeader("Allow", "POST"); return send(res, 405, {error:"method", message:"Use POST."}); }
  if(!process.env.ANTHROPIC_API_KEY || !process.env.APP_ACCESS_CODE){
    return send(res, 503, {error:"not_configured", message:"The explain feature is not set up on this server (ANTHROPIC_API_KEY and APP_ACCESS_CODE are required)."});
  }
  if(!sameSecret(req.headers["x-access-code"], process.env.APP_ACCESS_CODE)){
    return send(res, 401, {error:"auth", message:"Wrong or missing access code."});
  }
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  if(limited(ip)) return send(res, 429, {error:"rate", message:"Too many explanations requested. Try again later."});

  let body;
  try{ body = await readBody(req); }catch(e){ return send(res, 400, {error:"bad_request", message:"Send JSON like {\"paperId\":\"...\",\"n\":12}."}); }
  const n = Number(body && body.n);
  if(!body || typeof body.paperId !== "string" || !Number.isInteger(n)) return send(res, 400, {error:"bad_request", message:"paperId (string) and n (integer) are required."});
  const found = findQuestion(body.paperId, n);
  if(!found) return send(res, 404, {error:"not_found", message:"No such question."});

  const {system, content} = buildRequest(found.paper, found.q);
  const model = process.env.EXPLAIN_MODEL || DEFAULT_MODEL;
  const useFallbacks = String(process.env.EXPLAIN_FALLBACKS || "on").toLowerCase() !== "off";

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Accel-Buffering", "no");
  const line = o => res.write(JSON.stringify(o) + "\n");

  try{
    const client = new Anthropic();   // reads ANTHROPIC_API_KEY (and ANTHROPIC_BASE_URL, used by the local test server)
    const params = {
      model, max_tokens: 16000, system,
      thinking: {type:"adaptive"},
      output_config: {effort: process.env.EXPLAIN_EFFORT || "high"},
      messages: [{role:"user", content}],
    };
    if(useFallbacks){ params.betas = ["server-side-fallback-2026-07-01"]; params.fallbacks = "default"; }
    const stream = useFallbacks ? client.beta.messages.stream(params) : client.messages.stream(params);
    for await (const event of stream){
      if(event.type === "content_block_delta" && event.delta && event.delta.type === "text_delta") line({t: event.delta.text});
    }
    const final = await stream.finalMessage();
    if(final.stop_reason === "refusal") line({error:"refused", message:"The model declined to answer this question."});
    else line({done:true, model: final.model || model, truncated: final.stop_reason === "max_tokens"});
  }catch(err){
    const status = err && err.status;
    const message = status === 401 ? "The server's Anthropic API key was rejected."
      : status === 429 ? "The AI service is rate limited. Try again in a minute."
      : status === 400 ? `The AI service rejected the request: ${String((err.error && err.error.error && err.error.error.message) || err.message || "").slice(0, 300)}`
      : "The AI service failed. Try again.";
    console.error("explain failed:", status, err && err.message);
    line({error: status===401 ? "upstream_auth" : status===429 ? "upstream_rate" : "upstream", message});
  }
  res.end();
}
