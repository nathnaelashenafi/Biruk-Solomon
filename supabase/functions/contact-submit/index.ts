import { clientKey, cors, gate, json } from "../_shared/http.ts";
import { sb, withinLimit } from "../_shared/db.ts";
import { validateContact } from "../_shared/validation.js";
import { notifyContact } from "../_shared/telegram.ts";
import { deliverContactEmail } from "../_shared/email.ts";

const MAX_BYTES = 20_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const c = cors(req);
  const blocked = gate(req, c);
  if (blocked) return blocked;

  let body: any;
  try {
    const text = await req.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BYTES) return json({ error: "too_large" }, 413, c.headers);
    body = JSON.parse(text);
  } catch {
    return json({ error: "bad_request" }, 400, c.headers);
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return json({ error: "bad_request" }, 400, c.headers);

  // Honeypot: real visitors never fill this hidden field. Pretend success, save nothing.
  if (typeof body?.website === "string" && body.website.trim() !== "") return json({ ok: true }, 200, c.headers);
  if (typeof body.idempotency_key !== "string" || !UUID_RE.test(body.idempotency_key))
    return json({ error: "bad_request" }, 400, c.headers);

  const key = await clientKey(req);
  const [perVisitor, overall] = await Promise.all([
    withinLimit(`contact:${key}`, 3600, 5),
    withinLimit("contact:all", 3600, 100),
  ]);
  if (!perVisitor || !overall) return json({ error: "rate_limited" }, 429, c.headers);

  const v = validateContact(body);
  if (!v.ok) return json({ error: "validation", fields: v.errors }, 422, c.headers);

  const { data: inserted, error: insertError } = await sb
    .from("contact_inquiries")
    .insert({
      ...v.value,
      idempotency_key: body.idempotency_key,
      email_status: "pending",
    })
    .select()
    .single();

  let inquiry = inserted;
  const isNew = Boolean(inserted);
  if (insertError?.code === "23505") {
    const { data, error } = await sb
      .from("contact_inquiries")
      .select("*")
      .eq("idempotency_key", body.idempotency_key)
      .maybeSingle();
    if (error) {
      console.error("contact_duplicate_lookup_failed", error.code);
      return json({ error: "save_failed" }, 500, c.headers);
    }
    inquiry = data;
  } else if (insertError) {
    console.error("contact_save_failed", insertError.code);
    return json({ error: "save_failed" }, 500, c.headers);
  }
  if (!inquiry) {
    console.error("contact_save_failed", insertError?.code ?? "no_row");
    return json({ error: "save_failed" }, 500, c.headers);
  }

  if (isNew) await notifyContact(inquiry);

  const delivery = await deliverContactEmail(inquiry);
  if (!delivery.ok) {
    const status = delivery.code === "delivery_in_progress" ? 409 : 503;
    return json({ error: delivery.code, saved: true }, status, c.headers);
  }
  return json({ ok: true, email_delivered: true }, 200, c.headers);
});
