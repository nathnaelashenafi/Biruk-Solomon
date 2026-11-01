import { sha256Hex } from "./crypto.ts";

// ALLOWED_ORIGIN: comma separated list of exact origins, e.g. https://name.github.io
export function cors(req: Request) {
  const allowed = (Deno.env.get("ALLOWED_ORIGIN") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.get("origin");
  return {
    configured: allowed.length > 0,
    ok: !origin || allowed.includes(origin), // browsers always send Origin on cross-site POSTs
    headers: {
      "Access-Control-Allow-Origin": origin && allowed.includes(origin) ? origin : (allowed[0] ?? "null"),
      "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    } as Record<string, string>,
  };
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

// Hash of the caller's IP. The raw address is never stored.
export async function clientKey(req: Request): Promise<string> {
  const ip = (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  return (await sha256Hex(`ip:${ip}`)).slice(0, 32);
}

// Common gate for the public functions. Returns a Response to send, or null to continue.
export function gate(req: Request, c: ReturnType<typeof cors>): Response | null {
  if (!c.configured) return json({ error: "not_configured" }, 500);
  if (req.method === "OPTIONS") return new Response(null, { status: c.ok ? 204 : 403, headers: c.headers });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, c.headers);
  if (!c.ok) return json({ error: "forbidden" }, 403, c.headers);
  return null;
}
