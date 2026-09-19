import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://owpsscoretracker.com",
  "https://www.owpsscoretracker.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
]);
const allowedRegions = new Set([
  "Greater Toronto Area",
  "Central Ontario",
  "Eastern Ontario",
  "Southwestern Ontario",
  "Northern Ontario",
]);

function cors(origin: string | null) {
  const ok = origin && allowedOrigins.has(origin) ? origin : "https://owpsscoretracker.com";
  return {
    "Access-Control-Allow-Origin": ok,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}
function reply(status: number, body: unknown, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: cors(origin) });
}
async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed." }, origin);
  if (origin && !allowedOrigins.has(origin)) return reply(403, { error: "Origin not allowed." }, origin);

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > 2048) return reply(413, { error: "Request too large." }, origin);

  let body: any;
  try { body = await req.json(); } catch { return reply(400, { error: "Invalid request." }, origin); }

  const noc = typeof body?.noc_code === "string" ? body.noc_code.trim() : "";
  const region = typeof body?.region === "string" ? body.region : "";
  const score = Number(body?.eoi_score);
  if (!/^\d{5}$/.test(noc) || !allowedRegions.has(region) || !Number.isInteger(score) || score < 1 || score > 130) {
    return reply(400, { error: "Invalid submission." }, origin);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const salt = Deno.env.get("RATE_LIMIT_SALT");
  if (!url || !serviceKey || !salt || salt.length < 24) {
    console.error("Missing required server-side configuration");
    return reply(503, { error: "Submission service is temporarily unavailable." }, origin);
  }
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("cf-connecting-ip") || "unknown";
  const clientHash = await sha256(`${salt}:${ip}`);
  const cutoff = new Date(Date.now() - 120_000).toISOString();

  const { data: prior, error: rateReadError } = await db
    .from("submission_rate_limits").select("last_submitted_at").eq("client_hash", clientHash).maybeSingle();
  if (rateReadError) { console.error(rateReadError); return reply(503, { error: "Please try again later." }, origin); }
  if (prior?.last_submitted_at && prior.last_submitted_at > cutoff) {
    return reply(429, { error: "Please wait 2 minutes before submitting another score." }, origin);
  }

  const { error: insertError } = await db.from("eoi_profiles").insert({ noc_code: noc, region, eoi_score: score });
  if (insertError) { console.error(insertError); return reply(500, { error: "Could not save score." }, origin); }

  const { error: rateWriteError } = await db.from("submission_rate_limits").upsert({ client_hash: clientHash, last_submitted_at: new Date().toISOString() });
  if (rateWriteError) console.error("Rate-limit state update failed", rateWriteError);

  return reply(201, { ok: true }, origin);
});
