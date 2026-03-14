/**
 * Cloudflare Pages Function — Proxy for Vapi API
 *
 * Catches all requests to /api/vapi/* and forwards them to api.vapi.ai,
 * stripping the /api/vapi prefix. This hides the Vapi origin from the
 * browser network tab; external observers see requests to your own domain.
 *
 * No secrets needed here — the SDK sends its own Authorization: Bearer <public-key>
 * header, which we pass through unchanged.
 *
 * In practice the SDK only calls POST /call/web via this proxy. All subsequent
 * audio/video traffic goes directly to Daily.co (WebRTC), which is unavoidable.
 */

const VAPI_BASE = "https://api.vapi.ai";

// Headers to strip from the proxied request (hop-by-hop + host)
const STRIP_REQUEST_HEADERS = new Set([
  "host",
  "cf-connecting-ip",
  "cf-ipcountry",
  "cf-ray",
  "cf-visitor",
  "x-forwarded-for",
  "x-forwarded-proto",
  "x-real-ip",
]);

// Headers to strip from the upstream response before forwarding to the browser
const STRIP_RESPONSE_HEADERS = new Set([
  "alt-svc",
  "cf-cache-status",
  "cf-ray",
  "server",
  "x-powered-by",
  "x-vapi-trace-id",  // strip any Vapi-identifying trace headers
]);

export async function onRequest(context) {
  const { request, params } = context;

  // params.path is an array of path segments from the [[path]] catch-all
  const pathSegments = params.path ?? [];
  const upstreamPath = pathSegments.length ? "/" + pathSegments.join("/") : "/";

  // Preserve query string
  const originalUrl = new URL(request.url);
  const upstreamUrl = VAPI_BASE + upstreamPath + (originalUrl.search || "");

  // Build forwarded headers — copy everything except the stripped set
  const forwardedHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) {
      forwardedHeaders.set(key, value);
    }
  }

  // Override Host to match the upstream target
  forwardedHeaders.set("host", "api.vapi.ai");

  const upstreamRequest = new Request(upstreamUrl, {
    method: request.method,
    headers: forwardedHeaders,
    body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
    redirect: "follow",
  });

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(upstreamRequest);
  } catch (err) {
    return new Response(JSON.stringify({ error: "Upstream request failed", detail: String(err) }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  // Build the response headers — strip identifying headers from upstream
  const responseHeaders = new Headers(upstreamResponse.headers);
  for (const key of STRIP_RESPONSE_HEADERS) {
    responseHeaders.delete(key);
  }

  // CORS: allow the same origin that issued the request
  const origin = request.headers.get("origin");
  if (origin) {
    responseHeaders.set("access-control-allow-origin", origin);
    responseHeaders.set("access-control-allow-credentials", "true");
    responseHeaders.set("access-control-allow-headers", "Content-Type, Authorization");
    responseHeaders.set("access-control-allow-methods", "GET, POST, OPTIONS");
  }

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: responseHeaders });
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}
