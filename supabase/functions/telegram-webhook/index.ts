import { PRIVATE_BUCKET, PUBLIC_BUCKET, sb } from "../_shared/db.ts";
import { adminId, answerCb, plain, sendMessage, tg, when, type Keyboard } from "../_shared/telegram.ts";
import { newToken, safeEqual, sha256Hex } from "../_shared/crypto.ts";
import { LIMITS, validateEmailOnly, validateInvitee, validateText } from "../_shared/validation.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_MAX_MS = 15 * 60 * 1000;

const MENU: Keyboard = [
  [{ text: "Create Invitation", callback_data: "inv:new" }],
  [{ text: "Pending Testimonials", callback_data: "list:pending" }],
  [{ text: "Published", callback_data: "list:approved" }, { text: "Rejected", callback_data: "list:rejected" }],
  [{ text: "Manage Invitations", callback_data: "inv:list" }, { text: "Overview", callback_data: "overview" }],
];
const BACK = [{ text: "Menu", callback_data: "menu" }];
const SKIP: Keyboard = [[{ text: "Skip", callback_data: "inv:skip" }]];
const showMenu = (note?: string) => sendMessage((note ? note + "\n\n" : "") + "Portfolio admin. Choose an action:", MENU);

/* session for the multi-step "Create Invitation" flow */
async function getSession(admin: number) {
  const { data } = await sb.from("bot_sessions").select("*").eq("telegram_user_id", admin).maybeSingle();
  if (!data) return null;
  if (Date.now() - new Date(data.updated_at).getTime() > SESSION_MAX_MS) {
    await clearSession(admin);
    return null;
  }
  return data;
}
const setSession = (admin: number, step: string, data: unknown) =>
  sb.from("bot_sessions").upsert({ telegram_user_id: admin, step, data, updated_at: new Date().toISOString() });
const clearSession = (admin: number) => sb.from("bot_sessions").delete().eq("telegram_user_id", admin);

async function askConfirm(admin: number, d: any) {
  await setSession(admin, "confirm", d);
  return sendMessage(
    `Create a testimonial invitation?\n\nName: ${plain(d.name)}\nCompany: ${plain(d.company ?? "none")}\nEmail: ${plain(d.email ?? "none")}\n\n` +
      "The link works for 1 hour and can be used once.",
    [[{ text: "Create", callback_data: "inv:ok" }, { text: "Cancel", callback_data: "inv:no" }]],
  );
}

async function handleText(text: string, admin: number) {
  const t = text.trim();
  if (/^\/(start|menu)\b/i.test(t)) {
    await clearSession(admin);
    return showMenu();
  }
  if (/^\/cancel\b/i.test(t)) {
    await clearSession(admin);
    return showMenu("Cancelled.");
  }
  const s = await getSession(admin);
  if (!s) return showMenu();
  const d = s.data ?? {};

  if (s.step === "name") {
    const n = validateText(t, LIMITS.name);
    if (!n) return sendMessage("Please send a name of 1 to 100 characters.");
    await setSession(admin, "company", { ...d, name: n });
    return sendMessage("Company or organization? Send it, or tap Skip.", SKIP);
  }
  if (s.step === "company") {
    const c = validateText(t, LIMITS.company);
    if (!c) return sendMessage("Please send up to 120 characters, or tap Skip.", SKIP);
    await setSession(admin, "email", { ...d, company: c });
    return sendMessage("Client's email (optional)? Send it, or tap Skip.", SKIP);
  }
  if (s.step === "email") {
    const e = validateEmailOnly(t);
    if (!e) return sendMessage("That does not look like an email. Send it again, or tap Skip.", SKIP);
    return askConfirm(admin, { ...d, email: e });
  }
  return showMenu();
}

async function createInvitation(admin: number) {
  // Deleting the session is the atomic claim: a repeated tap finds nothing and does nothing.
  const { data: gone } = await sb.from("bot_sessions").delete().eq("telegram_user_id", admin).eq("step", "confirm").select();
  const d = gone?.[0]?.data;
  if (!d) return showMenu("Nothing to confirm.");

  const v = validateInvitee({ name: d.name, company: d.company, email: d.email });
  if (v.error) return sendMessage(v.error);
  const base = (Deno.env.get("PUBLIC_SITE_URL") ?? "").replace(/\/+$/, "");
  if (!base) return sendMessage("PUBLIC_SITE_URL is not configured on the server.");

  const token = newToken();
  const { data, error } = await sb.rpc("create_invitation", {
    p_token_hash: await sha256Hex(token),
    p_name: v.value.name,
    p_company: v.value.company,
    p_email: v.value.email,
    p_admin: admin,
  });
  if (error || !data) return sendMessage("Could not create the invitation. Please try again.");

  await sendMessage(
    `Invitation created for ${plain(v.value.name)}.\nExpires: ${when(data.expires_at)} (1 hour). Single use.\n\n` +
      "Anyone who has this link can use it before it expires. It does not verify who the person is.\n\nCopy the link from the next message:",
    [[{ text: "Cancel this invitation", callback_data: `ic:${data.id}` }]],
  );
  return sendMessage(`${base}/#/testimonial?token=${token}`);
}

async function listInvitations() {
  const { data } = await sb.from("testimonial_invitations").select("id,intended_name,intended_company,expires_at")
    .eq("status", "unused").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(10);
  if (!data?.length) return sendMessage("No active invitations.", [BACK]);
  const lines = data.map((i: any) => `${plain(i.intended_name, 60)}${i.intended_company ? " (" + plain(i.intended_company, 40) + ")" : ""}, expires ${when(i.expires_at)}`);
  return sendMessage("Active invitations:\n\n" + lines.join("\n"), [
    ...data.map((i: any) => [{ text: `Cancel: ${i.intended_name}`.slice(0, 60), callback_data: `ic:${i.id}` }]),
    BACK,
  ]);
}

async function listByStatus(status: string) {
  const { data } = await sb.from("testimonials").select("id,full_name,company,position").eq("status", status)
    .order("submitted_at", { ascending: false }).limit(10);
  if (!data?.length) return sendMessage(`No ${status} testimonials.`, [BACK]);
  return sendMessage(`${status[0].toUpperCase() + status.slice(1)} testimonials (latest ${data.length}):`, [
    ...data.map((r: any) => [{ text: `${r.full_name} (${r.company || r.position})`.slice(0, 60), callback_data: `rv:${r.id}` }]),
    BACK,
  ]);
}

async function review(id: string, admin: number) {
  const { data: t } = await sb.from("testimonials").select("*, testimonial_invitations(intended_name, intended_company)").eq("id", id).maybeSingle();
  if (!t) return sendMessage("Testimonial not found.");

  // Private images reach Telegram through a link that expires after 60 seconds.
  for (const [label, path] of [["Profile photo", t.profile_image_path], ["Company logo", t.company_logo_path]] as const) {
    if (!path) continue;
    const { data: signed } = await sb.storage.from(PRIVATE_BUCKET).createSignedUrl(path, 60);
    if (!signed?.signedUrl) continue;
    await tg("sendPhoto", { chat_id: admin, photo: signed.signedUrl, caption: label })
      .catch(() => tg("sendDocument", { chat_id: admin, document: signed.signedUrl, caption: label }))
      .catch(() => sendMessage(`${label}: could not be sent to Telegram.`));
  }

  const inv = t.testimonial_invitations;
  const text =
    `TESTIMONIAL (${t.status})\n\nName: ${plain(t.full_name, 100)}\nPosition: ${plain(t.position, 120)}\n` +
    `Company: ${plain(t.company ?? "none", 120)}\nLinkedIn: ${plain(t.linkedin_url ?? "none", 300)}\n` +
    `Project/service: ${plain(t.service_or_project, 160)}\nSubmitted: ${when(t.submitted_at)}\n` +
    `Consent: yes, ${when(t.consent_timestamp)} (version ${t.consent_version})\n` +
    `Invited as: ${plain(inv?.intended_name ?? "unknown", 100)}${inv?.intended_company ? " (" + plain(inv.intended_company, 100) + ")" : ""}\n` +
    `Photo: ${t.profile_image_path ? "yes" : "no"}, Logo: ${t.company_logo_path ? "yes" : "no"}\nID: ${t.id}\n\nTestimonial:\n${plain(t.testimonial_text, 1600)}`;
  const kb: Keyboard = t.status === "pending"
    ? [[{ text: "Approve", callback_data: `ap:${t.id}` }, { text: "Reject", callback_data: `rj:${t.id}` }], BACK]
    : [BACK];
  return sendMessage(text, kb);
}

async function publish(id: string, admin: number) {
  const { data: t } = await sb.from("testimonials").select("id,status,profile_image_path,company_logo_path").eq("id", id).maybeSingle();
  if (!t) return sendMessage("Testimonial not found.");
  if (t.status !== "pending") return sendMessage(`Already ${t.status}. No change made.`);

  const copied: string[] = [];
  const toPublic = async (path: string | null) => {
    if (!path) return null;
    const dest = `${id}/${path.split("/").pop()}`;
    const { error } = await sb.storage.from(PRIVATE_BUCKET).copy(path, dest, { destinationBucket: PUBLIC_BUCKET });
    if (error && !/exist|duplicate/i.test(error.message)) throw new Error("copy_failed");
    copied.push(dest);
    return dest;
  };
  try {
    const p = await toPublic(t.profile_image_path);
    const l = await toPublic(t.company_logo_path);
    const { data: res, error } = await sb.rpc("approve_testimonial", { p_id: id, p_admin: admin, p_profile_public: p, p_logo_public: l });
    if (error) throw new Error("approve_failed");
    if (res !== "ok") {
      if (copied.length) await sb.storage.from(PUBLIC_BUCKET).remove(copied);
      return sendMessage("No change: this testimonial is no longer pending.");
    }
    return sendMessage("Approved and published. It now appears on the website.");
  } catch (e) {
    console.error("publish_failed", (e as Error).message);
    if (copied.length) await sb.storage.from(PUBLIC_BUCKET).remove(copied).catch(() => {});
    return sendMessage("Publishing failed and nothing was changed. Tap Approve again to retry.");
  }
}

async function reject(id: string, admin: number) {
  const { data: res, error } = await sb.rpc("reject_testimonial", { p_id: id, p_admin: admin });
  if (error) return sendMessage("Could not reject. Please try again.");
  return sendMessage(res === "ok" ? "Rejected. It stays private and is not shown on the website." : "No change: this testimonial is no longer pending.");
}

async function overview() {
  const count = async (status: string) =>
    (await sb.from("testimonials").select("id", { count: "exact", head: true }).eq("status", status)).count ?? 0;
  const [p, a, r] = await Promise.all([count("pending"), count("approved"), count("rejected")]);
  const active = (await sb.from("testimonial_invitations").select("id", { count: "exact", head: true })
    .eq("status", "unused").gt("expires_at", new Date().toISOString())).count ?? 0;
  const undelivered = (await sb.from("contact_inquiries").select("id", { count: "exact", head: true }).neq("notification_status", "sent")).count ?? 0;
  return sendMessage(
    `OVERVIEW\n\nTestimonials: ${p} pending, ${a} published, ${r} rejected\nActive invitations: ${active}\nContact notifications not yet delivered: ${undelivered}`,
    [BACK],
  );
}

async function handleCallback(cb: any, admin: number) {
  await answerCb(cb.id);
  const [action, arg] = String(cb.data ?? "").split(":");
  const id = arg && UUID.test(arg) ? arg : null;
  const clearButtons = () =>
    cb.message?.message_id
      ? tg("editMessageReplyMarkup", { chat_id: admin, message_id: cb.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {})
      : Promise.resolve();

  switch (action) {
    case "menu": return showMenu();
    case "overview": return overview();
    case "list": return ["pending", "approved", "rejected"].includes(arg) ? listByStatus(arg) : showMenu();
    case "inv": {
      if (arg === "new") {
        await setSession(admin, "name", {});
        return sendMessage("Send the client's full name. Send /cancel to stop.");
      }
      if (arg === "list") return listInvitations();
      if (arg === "no") {
        await clearSession(admin);
        await clearButtons();
        return showMenu("Cancelled.");
      }
      if (arg === "ok") {
        await clearButtons();
        return createInvitation(admin);
      }
      if (arg === "skip") {
        const s = await getSession(admin);
        if (s?.step === "company") {
          await setSession(admin, "email", { ...s.data, company: null });
          return sendMessage("Client's email (optional)? Send it, or tap Skip.", SKIP);
        }
        if (s?.step === "email") return askConfirm(admin, { ...s.data, email: null });
      }
      return showMenu();
    }
    case "rv": return id ? review(id, admin) : showMenu();
    case "ap":
      return id ? sendMessage("Publish this testimonial on the website?", [[{ text: "Yes, publish", callback_data: `apc:${id}` }, { text: "Back", callback_data: `rv:${id}` }]]) : showMenu();
    case "apc":
      if (!id) return showMenu();
      await clearButtons();
      return publish(id, admin);
    case "rj":
      return id ? sendMessage("Reject this testimonial? It will not be published.", [[{ text: "Yes, reject", callback_data: `rjc:${id}` }, { text: "Back", callback_data: `rv:${id}` }]]) : showMenu();
    case "rjc":
      if (!id) return showMenu();
      await clearButtons();
      return reject(id, admin);
    case "ic":
      return id ? sendMessage("Cancel this invitation? The link will stop working.", [[{ text: "Yes, cancel it", callback_data: `icc:${id}` }, { text: "Back", callback_data: "menu" }]]) : showMenu();
    case "icc": {
      if (!id) return showMenu();
      await clearButtons();
      const { data: res } = await sb.rpc("cancel_invitation", { p_id: id, p_admin: admin });
      return sendMessage(res === "ok" ? "Invitation cancelled." : "Nothing to cancel: it was already used, cancelled or expired.");
    }
    default: return showMenu();
  }
}

async function handle(update: any, admin: number) {
  const msg = update.message;
  const cb = update.callback_query;
  const fromId = msg?.from?.id ?? cb?.from?.id;
  if (fromId === undefined) return;

  // Authorization is the numeric Telegram user ID only. Never the username.
  if (fromId !== admin) {
    if (cb) await answerCb(cb.id, "Not authorized.", true);
    else if (msg?.chat?.type === "private") await tg("sendMessage", { chat_id: msg.chat.id, text: "This bot is private." });
    return;
  }
  if (cb) return handleCallback(cb, admin);
  if (msg?.chat?.type === "private" && typeof msg.text === "string") return handleText(msg.text, admin);
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  const admin = adminId();
  if (!secret || !Deno.env.get("TELEGRAM_BOT_TOKEN") || !Number.isSafeInteger(admin) || admin <= 0)
    return new Response("not configured", { status: 500 });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (!safeEqual(req.headers.get("x-telegram-bot-api-secret-token") ?? "", secret))
    return new Response("unauthorized", { status: 401 });

  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  if (!Number.isSafeInteger(update?.update_id)) return new Response("bad request", { status: 400 });

  // Telegram retries: an update that was already received is acknowledged and skipped.
  const { error: dup } = await sb.from("telegram_updates").insert({ update_id: update.update_id });
  if (dup) return dup.code === "23505" ? new Response("ok") : new Response("db error", { status: 500 });
  if (Math.random() < 0.02)
    await sb.from("telegram_updates").delete().lt("received_at", new Date(Date.now() - 7 * 864e5).toISOString());

  try {
    await handle(update, admin);
  } catch (e) {
    console.error("webhook_handler_error", (e as Error).message);
    await sb.from("telegram_updates").delete().eq("update_id", update.update_id); // let Telegram retry
    return new Response("error", { status: 500 });
  }
  return new Response("ok");
});
