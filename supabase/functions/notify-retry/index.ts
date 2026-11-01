import { json } from "../_shared/http.ts";
import { sb } from "../_shared/db.ts";
import { safeEqual } from "../_shared/crypto.ts";
import { notifyContact, notifyTestimonial } from "../_shared/telegram.ts";

// Re-sends Telegram notifications that failed. It only updates existing rows, so a retry
// can never create a second inquiry or testimonial. Protected by a shared secret.
Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret) return json({ error: "not_configured" }, 500);
  if (!safeEqual(req.headers.get("x-cron-secret") ?? "", secret)) return json({ error: "unauthorized" }, 401);

  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const [c, t] = await Promise.all([
    sb.from("contact_inquiries").select("*").neq("notification_status", "sent").lt("notification_attempts", 6).lt("created_at", cutoff).limit(20),
    sb.from("testimonials").select("*").eq("status", "pending").neq("notification_status", "sent").lt("notification_attempts", 6).lt("submitted_at", cutoff).limit(20),
  ]);
  for (const row of c.data ?? []) await notifyContact(row);
  for (const row of t.data ?? []) await notifyTestimonial(row);
  return json({ contacts: c.data?.length ?? 0, testimonials: t.data?.length ?? 0 });
});
