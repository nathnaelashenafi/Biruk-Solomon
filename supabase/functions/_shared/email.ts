import { sb } from "./db.ts";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const CONTACT_RECIPIENT = "biruksolomon701@gmail.com";

export function emailConfigured() {
  return Boolean(
    Deno.env.get("RESEND_API_KEY")?.trim() &&
      Deno.env.get("CONTACT_EMAIL_FROM")?.trim(),
  );
}

async function updateDelivery(id: string, values: Record<string, unknown>) {
  const { data, error } = await sb
    .from("contact_inquiries")
    .update(values)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("contact_email_status_update_failed", error?.code ?? "row_missing");
    return false;
  }
  return true;
}

async function markFailed(id: string, status: "failed" | "not_configured", code: string) {
  return updateDelivery(id, {
    email_status: status,
    last_email_error_code: code,
  });
}

export async function deliverContactEmail(row: Record<string, any>) {
  if (row.email_status === "sent") return { ok: true as const };

  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  const from = Deno.env.get("CONTACT_EMAIL_FROM")?.trim();
  if (!apiKey || !from) {
    const saved = await markFailed(row.id, "not_configured", "email_not_configured");
    return {
      ok: false as const,
      code: saved ? "email_not_configured" : "email_status_update_failed",
    };
  }

  const { data: claimed, error: claimError } = await sb.rpc("claim_contact_email", {
    p_id: row.id,
  });
  if (claimError) {
    console.error("contact_email_claim_failed", claimError.code);
    return { ok: false as const, code: "email_status_update_failed" };
  }
  if (!claimed) {
    const { data: latest, error } = await sb
      .from("contact_inquiries")
      .select("email_status")
      .eq("id", row.id)
      .maybeSingle();
    if (error || !latest) {
      console.error("contact_email_status_read_failed", error?.code ?? "row_missing");
      return { ok: false as const, code: "email_status_update_failed" };
    }
    if (latest.email_status === "sent") return { ok: true as const };
    return {
      ok: false as const,
      code: latest.email_status === "sending" ? "delivery_in_progress" : "email_retry_exhausted",
    };
  }

  const text = [
    "NEW CONTACT INQUIRY",
    "",
    `Name: ${row.name}`,
    `Email: ${row.email}`,
    row.phone ? `Phone: ${row.phone}` : null,
    `Service: ${row.subject}`,
    `Received: ${row.created_at}`,
    "",
    "Message:",
    row.message,
  ]
    .filter((line) => line !== null)
    .join("\n");

  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `contact-${row.id}`,
      },
      body: JSON.stringify({
        from,
        to: [CONTACT_RECIPIENT],
        reply_to: row.email,
        subject: `New contact inquiry: ${row.subject}`,
        text,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    const code = error instanceof DOMException && error.name === "TimeoutError"
      ? "provider_timeout"
      : "provider_network_error";
    console.error("contact_email_request_failed", code);
    const saved = await markFailed(row.id, "failed", code);
    return {
      ok: false as const,
      code: saved ? "email_delivery_failed" : "email_status_update_failed",
    };
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result.id !== "string") {
    console.error("contact_email_provider_rejected", response.status);
    const saved = await markFailed(row.id, "failed", "provider_rejected");
    return {
      ok: false as const,
      code: saved ? "email_delivery_failed" : "email_status_update_failed",
    };
  }

  const saved = await updateDelivery(row.id, {
    email_status: "sent",
    email_sent_at: new Date().toISOString(),
    email_provider_id: result.id,
    last_email_error_code: null,
  });
  if (!saved) return { ok: false as const, code: "email_status_update_failed" };
  return { ok: true as const };
}
