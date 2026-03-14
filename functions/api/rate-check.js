/**
 * Cloudflare Pages Function — IP-based rate limiting
 *
 * KV namespace binding required: RATE_LIMIT
 * Key format: rate:{ip}:{assistant}:{YYYY-MM-DD}
 * Limit: 3 calls per IP per assistant per day (TTL 86400s, auto-expires)
 *
 * Query params: ?assistant=<slug>&email=<email>
 */

const DAILY_LIMIT = 3;
const EXEMPT_DOMAINS = ["keyreply.com"];
const KV_TTL = 86400; // 1 day in seconds

function getTodayKey(ip, assistant) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  return `rate:${ip}:${assistant}:${today}`;
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

function jsonResponse(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}

export async function onRequest(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const url = new URL(request.url);
  const assistant = url.searchParams.get("assistant") || "kira";
  const email = (url.searchParams.get("email") || "").toLowerCase();
  const kv = env.RATE_LIMIT;

  // Exempt internal emails — always allow
  const domain = email.split("@")[1] || "";
  if (EXEMPT_DOMAINS.includes(domain)) {
    return jsonResponse({ allowed: true, remaining: 999 }, 200, headers);
  }

  if (!kv) {
    // KV not bound — fail open so the demo still works in local dev
    console.error("RATE_LIMIT KV namespace not bound");
    return jsonResponse({ allowed: true, remaining: DAILY_LIMIT }, 200, headers);
  }

  const key = getTodayKey(ip, assistant);

  if (request.method === "GET") {
    // Check current count without mutating
    const raw = await kv.get(key);
    const count = raw ? parseInt(raw, 10) : 0;
    const remaining = Math.max(0, DAILY_LIMIT - count);
    const allowed = count < DAILY_LIMIT;

    if (allowed) {
      return jsonResponse({ allowed: true, remaining }, 200, headers);
    } else {
      return jsonResponse(
        {
          allowed: false,
          remaining: 0,
          message: "Demo limit reached, please contact sales@keyreply.com for more information.",
        },
        200,
        headers
      );
    }
  }

  if (request.method === "POST") {
    // Increment count (called after a call successfully starts)
    const raw = await kv.get(key);
    const count = raw ? parseInt(raw, 10) : 0;
    const newCount = count + 1;

    // Write back with TTL so the key expires automatically at end of day
    await kv.put(key, String(newCount), { expirationTtl: KV_TTL });

    const remaining = Math.max(0, DAILY_LIMIT - newCount);
    const allowed = newCount <= DAILY_LIMIT;

    if (allowed) {
      return jsonResponse({ allowed: true, remaining }, 200, headers);
    } else {
      return jsonResponse(
        {
          allowed: false,
          remaining: 0,
          message: "Demo limit reached, please contact sales@keyreply.com for more information.",
        },
        200,
        headers
      );
    }
  }

  return jsonResponse({ error: "Method not allowed" }, 405, headers);
}
