import { sb } from "./db.ts";

const API = "https://api.telegram.org";

export const adminId = () => Number(Deno.env.get("TELEGRAM_ADMIN_USER_ID"));

export async function tg(method: string, body: Record<string, unknown>) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("telegram_not_configured");
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const out = await res.json().catch(() => ({}));
  if (!out.ok) throw new Error(`telegram_${method}_failed_${out.error_code ?? res.status}`);
  return out.result;
}

// Visitor-supplied text is sent as plain text (no parse_mode), so it can never be read as
// formatting. A leading "/" is neutralised so it does not become a tappable command.
export const plain = (s: unknown, max = 3000) =>
  String(s ?? "").replace(/(^|\n)\//g, "$1/\u200b").slice(0, max);

export const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Addis_Ababa", dateStyle: "medium", timeStyle: "short" });

export type Keyboard = { text: string; callback_data?: string }[][];

export const sendMessage = (text: string, keyboard?: Keyboard) =>
  tg("sendMessage", {
    chat_id: adminId(),
    text: text.slice(0, 4000),
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });

export const answerCb = (id: string, text?: string, alert = false) =>
  tg("answerCallbackQuery", { callback_query_id: id, ...(text ? { text, show_alert: alert } : {}) }).catch(() => {});

async function record(table: string, id: string, attempts: number, ok: boolean) {
  await sb.from(table).update({
    notification_status: ok ? "sent" : "failed",
    notification_attempts: attempts + 1,
    last_notification_attempt_at: new Date().toISOString(),
  }).eq("id", id);
}

export async function notifyContact(row: any) {
  const text =
    "NEW CONTACT INQUIRY\n\n" +
    `Name: ${plain(row.name, 100)}\nEmail: ${plain(row.email, 254)}\n` +
    (row.phone ? `Phone: ${plain(row.phone, 30)}\n` : "") +
    (row.subject ? `Subject: ${plain(row.subject, 150)}\n` : "") +
    `Received: ${when(row.created_at)}\n\nMessage:\n${plain(row.message, 3000)}`;
  try {
    await sendMessage(text);
    await record("contact_inquiries", row.id, row.notification_attempts ?? 0, true);
  } catch (e) {
    console.error("contact_notify_failed", (e as Error).message);
    await record("contact_inquiries", row.id, row.notification_attempts ?? 0, false);
  }
}

export async function notifyTestimonial(row: any) {
  const preview = String(row.testimonial_text).slice(0, 200) + (row.testimonial_text.length > 200 ? "..." : "");
  const text =
    "NEW TESTIMONIAL (pending)\n\n" +
    `Name: ${plain(row.full_name, 100)}\nPosition: ${plain(row.position, 120)}\n` +
    (row.company ? `Company: ${plain(row.company, 120)}\n` : "") +
    `Project/service: ${plain(row.service_or_project, 160)}\nSubmitted: ${when(row.submitted_at)}\nID: ${row.id}\n\n` +
    `Preview:\n${plain(preview, 300)}`;
  try {
    await sendMessage(text, [
      [{ text: "Review", callback_data: `rv:${row.id}` }],
      [{ text: "Approve", callback_data: `ap:${row.id}` }, { text: "Reject", callback_data: `rj:${row.id}` }],
    ]);
    await record("testimonials", row.id, row.notification_attempts ?? 0, true);
  } catch (e) {
    console.error("testimonial_notify_failed", (e as Error).message);
    await record("testimonials", row.id, row.notification_attempts ?? 0, false);
  }
}
