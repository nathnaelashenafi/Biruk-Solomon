import { clientKey, cors, gate, json } from "../_shared/http.ts";
import { sb, withinLimit } from "../_shared/db.ts";
import { validateContact } from "../_shared/validation.js";
import { notifyContact } from "../_shared/telegram.ts";

const MAX_BYTES = 20_000;

Deno.serve(async (req) => {
  const c = cors(req);
  const blocked = gate(req, c);
  if (blocked) return blocked;

  let body: any;
  try {
    const text = await req.text();
    if (text.length > MAX_BYTES) return json({ error: "too_large" }, 413, c.headers);
    body = JSON.parse(text);
  } catch {
    return json({ error: "bad_request" }, 400, c.headers);
  }

  // Honeypot: real visitors never fill this hidden field. Pretend success, save nothing.
  if (typeof body?.website === "string" && body.website.trim() !== "") return json({ ok: true }, 200, c.headers);

  const key = await clientKey(req);
  const [perVisitor, overall] = await Promise.all([
    withinLimit(`contact:${key}`, 3600, 5),
    withinLimit("contact:all", 3600, 100),
  ]);
  if (!perVisitor || !overall) return json({ error: "rate_limited" }, 429, c.headers);

  const v = validateContact(body);
  if (!v.ok) return json({ error: "validation", fields: v.errors }, 422, c.headers);

  const { data, error } = await sb.from("contact_inquiries").insert(v.value).select().single();
  if (error || !data) {
    console.error("contact_save_failed", error?.code);
    return json({ error: "save_failed" }, 500, c.headers);
  }

  // Saved. A Telegram failure is recorded and retried later, never fatal.
  await notifyContact(data);
  return json({ ok: true }, 200, c.headers);
});
