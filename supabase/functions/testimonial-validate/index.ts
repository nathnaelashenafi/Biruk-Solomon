import { clientKey, cors, gate, json } from "../_shared/http.ts";
import { sb, withinLimit } from "../_shared/db.ts";
import { sha256Hex, TOKEN_RE } from "../_shared/crypto.ts";

// Read-only: checking an invitation never consumes it.
Deno.serve(async (req) => {
  const c = cors(req);
  const blocked = gate(req, c);
  if (blocked) return blocked;

  let token = "";
  try {
    const text = await req.text();
    if (text.length > 1000) return json({ error: "too_large" }, 413, c.headers);
    token = String(JSON.parse(text)?.token ?? "");
  } catch {
    return json({ error: "bad_request" }, 400, c.headers);
  }

  const key = await clientKey(req);
  if (!(await withinLimit(`validate:${key}`, 3600, 40))) return json({ error: "rate_limited" }, 429, c.headers);
  if (!TOKEN_RE.test(token)) return json({ state: "invalid" }, 200, c.headers);

  const { data, error } = await sb.rpc("check_invitation", { p_token_hash: await sha256Hex(token) });
  if (error) return json({ error: "server_error" }, 500, c.headers);
  return json(data, 200, c.headers); // { state, intended_name?, intended_company? }
});
