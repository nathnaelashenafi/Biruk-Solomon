import { json } from "../_shared/http.ts";
import { sb } from "../_shared/db.ts";
import { safeEqual } from "../_shared/crypto.ts";
import { notifyContact, notifyTestimonial } from "../_shared/telegram.ts";
import { deliverContactEmail, emailConfigured } from "../_shared/email.ts";

// Retries notifications for existing rows only. Protected by a shared secret.
Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret) return json({ error: "not_configured" }, 500);
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!safeEqual(req.headers.get("x-cron-secret") ?? "", secret)) return json({ error: "unauthorized" }, 401);

  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const emailCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const [c, t, pendingEmail, staleEmail] = await Promise.all([
    sb.from("contact_inquiries").select("*").neq("notification_status", "sent").lt("notification_attempts", 6).lt("created_at", cutoff).limit(20),
    sb.from("testimonials").select("*").eq("status", "pending").neq("notification_status", "sent").lt("notification_attempts", 6).lt("submitted_at", cutoff).limit(20),
    emailConfigured()
      ? sb.from("contact_inquiries").select("*").in("email_status", ["pending", "failed", "not_configured"]).lt("email_attempts", 6).limit(20)
      : Promise.resolve({ data: [], error: null }),
    emailConfigured()
      ? sb.from("contact_inquiries").select("*").eq("email_status", "sending").lt("last_email_attempt_at", emailCutoff).lt("email_attempts", 6).limit(20)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (c.error || t.error || pendingEmail.error || staleEmail.error) {
    console.error("notify_retry_query_failed", c.error?.code ?? t.error?.code ?? pendingEmail.error?.code ?? staleEmail.error?.code);
    return json({ error: "query_failed" }, 500);
  }
  for (const row of c.data ?? []) await notifyContact(row);
  for (const row of t.data ?? []) await notifyTestimonial(row);
  let emailRetries = 0;
  for (const row of [...(pendingEmail.data ?? []), ...(staleEmail.data ?? [])]) {
    await deliverContactEmail(row);
    emailRetries++;
  }
  return json({ contacts: c.data?.length ?? 0, testimonials: t.data?.length ?? 0, emails: emailRetries });
});
