import { sb } from "./db.ts";
import { plain, sendMessage, tg, type Keyboard } from "./telegram.ts";
import { clearSession, getSession, setSession } from "./session.ts";
import { COVER_BUCKET, PROVIDER_NAMES, parseVideoLink, safeThumb, VIDEO_TYPES } from "./video-links.js";
import { detectImageType, IMAGE, validateText } from "./validation.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = 8;
const MENU_BTN = [{ text: "Menu", callback_data: "menu" }];
const CANCEL: Keyboard = [[{ text: "Cancel", callback_data: "vid:no" }]];
const SKIP: Keyboard = [[{ text: "Skip", callback_data: "vid:skip" }], ...CANCEL];
const COVER_KB: Keyboard = [[{ text: "Skip, no cover", callback_data: "vid:coverskip" }], ...CANCEL];
// Where TikTok keeps its cover pictures. Anything else is not downloaded.
const TIKTOK_IMG = /^https:\/\/[a-z0-9.-]+\.(tiktokcdn(-us|-eu)?\.com|tiktokv\.(com|us|eu)|byteimg\.com|ibyteimg\.com)\//i;

/* ───────── cover pictures (stored in our own public bucket) ───────── */
async function saveCover(bytes: Uint8Array): Promise<string | null> {
  const type = detectImageType(bytes);
  if (!type || bytes.length > IMAGE.maxBytes) return null;
  const path = `${crypto.randomUUID()}.${type.ext}`;
  const { error } = await sb.storage.from(COVER_BUCKET).upload(path, bytes, { contentType: type.mime, upsert: false });
  if (error) return null;
  return sb.storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function removeCover(url: unknown) {
  const m = typeof url === "string" ? url.match(/\/video-covers\/([A-Za-z0-9._-]+)$/) : null;
  if (m) await sb.storage.from(COVER_BUCKET).remove([m[1]]).catch(() => {});
}

async function copyRemoteCover(url: unknown): Promise<string | null> {
  if (typeof url !== "string" || !TIKTOK_IMG.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: "error" });
    if (!res.ok || Number(res.headers.get("content-length") ?? 0) > IMAGE.maxBytes) return null;
    return await saveCover(new Uint8Array(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

/* ───────── link checking ───────── */
// Short TikTok links point somewhere else. Follow them by hand, only inside tiktok.com.
async function resolveShort(start: string): Promise<string | null> {
  let current = start;
  for (let i = 0; i < 4; i++) {
    const host = new URL(current).hostname.toLowerCase();
    if (!/^(vm\.|vt\.|www\.)?tiktok\.com$/.test(host)) return null;
    let res: Response;
    try {
      res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(6000), headers: { "User-Agent": "Mozilla/5.0" } });
    } catch {
      return null;
    }
    const loc = res.headers.get("location");
    if (!loc) return null;
    current = new URL(loc, current).toString();
    if (parseVideoLink(current)?.id) return current;
  }
  return null;
}

type Meta = { ok: false; reason: string } | { ok: true; title?: string; thumb?: string | null; portrait?: boolean; sourceUrl?: string };

// Asks the platform about the video. Also tells us if it is missing, private or cannot be embedded.
async function fetchMeta(link: { provider: string; id: string; sourceUrl?: string }): Promise<Meta> {
  if (link.provider === "instagram") return { ok: true }; // Instagram shares nothing without an approved app
  const url = link.provider === "youtube" ? `https://www.youtube.com/watch?v=${link.id}`
    : link.provider === "vimeo" ? `https://vimeo.com/${link.id}` : link.sourceUrl!;
  const endpoint = link.provider === "youtube" ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`
    : link.provider === "vimeo" ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`
    : `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(6000) });
    if (res.status === 404 || (link.provider === "tiktok" && res.status === 400)) return { ok: false, reason: "not_found" };
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "not_embeddable" };
    if (!res.ok) return { ok: true };
    const j = await res.json();
    const out: Meta = {
      ok: true,
      title: typeof j.title === "string" ? j.title.trim() : undefined,
      portrait: Number(j.height ?? j.thumbnail_height) > Number(j.width ?? j.thumbnail_width),
    };
    if (link.provider === "vimeo") out.thumb = safeThumb(j.thumbnail_url);
    if (link.provider === "tiktok") {
      out.thumb = await copyRemoteCover(j.thumbnail_url); // a copy, because TikTok's picture links expire
      const author = typeof j.author_url === "string" ? j.author_url.match(/^https:\/\/www\.tiktok\.com\/(@[A-Za-z0-9._-]{1,40})$/) : null;
      if (author) out.sourceUrl = `https://www.tiktok.com/${author[1]}/video/${link.id}`;
    }
    return out;
  } catch {
    return { ok: true }; // could not check: carry on, the owner can still add it
  }
}

/* ───────── the steps ───────── */
const askStudio = async (admin: number, d: any) => {
  await setSession(admin, "v_studio", d);
  return sendMessage("Studio or client name? Send it, or tap Skip.", SKIP);
};

const askType = async (admin: number, d: any) => {
  await setSession(admin, "v_type", d);
  const rows: Keyboard = [];
  for (let i = 0; i < VIDEO_TYPES.length; i += 2)
    rows.push(VIDEO_TYPES.slice(i, i + 2).map((t: string, k: number) => ({ text: t, callback_data: `vt:${i + k}` })));
  return sendMessage("What type of video is it? Tap one, or send your own (up to 60 characters).", [...rows, ...CANCEL]);
};

const askCover = async (admin: number, d: any) => {
  await setSession(admin, "v_cover", d);
  return sendMessage(
    `${PROVIDER_NAMES[d.provider]} does not give me a cover picture. Send one now (a screenshot of the video works), or tap Skip for a plain card.`,
    COVER_KB,
  );
};

const askConfirm = async (admin: number, d: any) => {
  await setSession(admin, "v_confirm", d);
  return sendMessage(
    `Add this video to the website?\n\nTitle: ${plain(d.title, 150)}\nStudio: ${plain(d.studio ?? "none", 100)}\nType: ${plain(d.category, 60)}\n` +
      `Source: ${PROVIDER_NAMES[d.provider]}${d.orientation === "portrait" ? " (vertical)" : ""}\nCover: ${d.thumbnail_url ? "yes" : "none"}\n\n` +
      "It appears on the site straight away.",
    [[{ text: "Add to website", callback_data: "vid:ok" }, { text: "Cancel", callback_data: "vid:no" }]],
  );
};

// After the type is known: ask for a cover only when the platform gave us none.
const afterType = (admin: number, d: any) =>
  !d.thumbnail_url && (d.provider === "instagram" || d.provider === "tiktok") ? askCover(admin, d) : askConfirm(admin, d);

/* text messages while a video is being added */
export async function videoText(t: string, s: any, admin: number) {
  const d = s.data ?? {};
  if (s.step === "v_link") {
    let link: any = parseVideoLink(t);
    if (!link) return sendMessage("I can use YouTube, Vimeo, TikTok or Instagram links. Send a full link, or tap Cancel.", CANCEL);
    if (link.resolve) {
      const real = await resolveShort(link.resolve);
      link = real ? parseVideoLink(real) : null;
      if (!link?.id) return sendMessage("I could not open that short TikTok link. Open the video in TikTok, copy its full link and send that.", CANCEL);
    }
    const { data: exists } = await sb.from("portfolio_videos").select("id").eq("provider", link.provider).eq("video_id", link.id).maybeSingle();
    if (exists) return sendMessage("That video is already on the website.", CANCEL);
    const meta = await fetchMeta(link);
    if (!meta.ok)
      return sendMessage(
        meta.reason === "not_found"
          ? "I could not find that video. Check the link, and that the video is public."
          : "That video cannot be embedded on a website. Allow embedding in its settings, then send the link again.",
        CANCEL,
      );
    const next = {
      provider: link.provider,
      video_id: link.id,
      orientation: link.portrait || meta.portrait ? "portrait" : "landscape",
      thumbnail_url: link.provider === "youtube" ? `https://i.ytimg.com/vi/${link.id}/maxresdefault.jpg` : meta.thumb ?? null,
      source_url: meta.sourceUrl ?? link.sourceUrl ?? null,
      suggested: meta.title ? meta.title.slice(0, 150) : null,
    };
    await setSession(admin, "v_title", next);
    const note = link.provider === "instagram" ? "\n\nInstagram shares no title, so you type it. I cannot check Instagram links, so make sure the post is public." : "";
    return sendMessage(
      `Found it (${PROVIDER_NAMES[link.provider]}).${next.suggested ? `\n\nTitle there: ${plain(next.suggested, 150)}` : ""}${note}\n\nSend a title for the website${next.suggested ? ", or tap Use this title." : "."}`,
      next.suggested ? [[{ text: "Use this title", callback_data: "vid:title" }], ...CANCEL] : CANCEL,
    );
  }
  if (s.step === "v_title") {
    const title = validateText(t, 150);
    if (!title) return sendMessage("Please send a title of 1 to 150 characters.", CANCEL);
    return askStudio(admin, { ...d, title });
  }
  if (s.step === "v_studio") {
    const studio = validateText(t, 100);
    if (!studio) return sendMessage("Please send up to 100 characters, or tap Skip.", SKIP);
    return askType(admin, { ...d, studio });
  }
  if (s.step === "v_type") {
    const category = validateText(t, 60);
    if (!category) return sendMessage("Please send up to 60 characters, or tap one of the types.", CANCEL);
    return afterType(admin, { ...d, category });
  }
  if (s.step === "v_cover") return sendMessage("Please send a picture, or tap Skip.", COVER_KB);
  return sendMessage("Please use the buttons, or send /menu.");
}

/* a picture sent while a cover is being asked for */
export async function videoPhoto(msg: any, admin: number) {
  const s = await getSession(admin);
  if (!s || s.step !== "v_cover") return sendMessage("To add a video, open /menu and tap Add Video.");

  let fileId: string | null = null;
  if (Array.isArray(msg.photo) && msg.photo.length) {
    const fits = msg.photo.filter((p: any) => (p.file_size ?? 0) <= IMAGE.maxBytes);
    const list = fits.length ? fits : msg.photo;
    fileId = list[list.length - 1].file_id; // the largest one that fits
  } else if (msg.document && /^image\/(jpeg|png|webp)$/.test(msg.document.mime_type ?? "") && (msg.document.file_size ?? 0) <= IMAGE.maxBytes) {
    fileId = msg.document.file_id;
  }
  if (!fileId) return sendMessage("Please send a JPG, PNG or WebP picture up to 2 MB.", COVER_KB);

  const info = await tg("getFile", { file_id: fileId }).catch(() => null);
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!info?.file_path || !token) return sendMessage("I could not get that picture. Please try again.", COVER_KB);
  let bytes: Uint8Array | null = null;
  try {
    const res = await fetch(`https://api.telegram.org/file/bot${token}/${info.file_path}`, { signal: AbortSignal.timeout(10000) });
    if (res.ok) bytes = new Uint8Array(await res.arrayBuffer());
  } catch { /* handled below */ }
  const url = bytes ? await saveCover(bytes) : null;
  if (!url) return sendMessage("That picture could not be used. Send a JPG, PNG or WebP up to 2 MB.", COVER_KB);
  return askConfirm(admin, { ...s.data, thumbnail_url: url });
}

async function managePage(offset: number) {
  const { data } = await sb.from("portfolio_videos").select("id,title,studio,category,provider")
    .order("created_at", { ascending: false }).range(offset, offset + PAGE);
  const rows = data ?? [];
  if (!rows.length) return sendMessage(offset ? "No more videos." : "There are no videos on the website yet.", [MENU_BTN]);
  const shown = rows.slice(0, PAGE);
  const lines = shown.map((v: any, i: number) =>
    `${offset + i + 1}. ${plain(v.title, 70)} (${plain(v.studio ?? "no studio", 40)}, ${plain(v.category, 30)}, ${PROVIDER_NAMES[v.provider] ?? v.provider})`);
  const nav = [];
  if (offset > 0) nav.push({ text: "Previous", callback_data: `vp:${Math.max(0, offset - PAGE)}` });
  if (rows.length > PAGE) nav.push({ text: "Next", callback_data: `vp:${offset + PAGE}` });
  return sendMessage("Videos on the website (newest first):\n\n" + lines.join("\n"), [
    ...shown.map((v: any) => [{ text: `Remove: ${v.title}`.slice(0, 60), callback_data: `vr:${v.id}` }]),
    ...(nav.length ? [nav] : []),
    MENU_BTN,
  ]);
}

/* buttons: vid:*, vt:*, vp:*, vr:*, vrc:* */
export async function videoCallback(
  action: string, arg: string, admin: number,
  menu: (note?: string) => Promise<unknown>, clearButtons: () => Promise<unknown>,
) {
  if (action === "vp") return managePage(Math.max(0, Number(arg) || 0));

  if (action === "vr" && UUID.test(arg)) {
    const { data: v } = await sb.from("portfolio_videos").select("title").eq("id", arg).maybeSingle();
    if (!v) return sendMessage("That video is already gone.", [MENU_BTN]);
    return sendMessage(`Remove "${plain(v.title, 100)}" from the website?`, [[{ text: "Yes, remove", callback_data: `vrc:${arg}` }, { text: "Back", callback_data: "vp:0" }]]);
  }
  if (action === "vrc" && UUID.test(arg)) {
    await clearButtons();
    const { data: before } = await sb.from("portfolio_videos").select("thumbnail_url").eq("id", arg).maybeSingle();
    const { data: res, error } = await sb.rpc("remove_video", { p_id: arg, p_admin: admin });
    if (error) return sendMessage("Could not remove it. Please try again.");
    if (res === "ok") await removeCover(before?.thumbnail_url); // delete our copy of the cover too
    return sendMessage(res === "ok" ? "Removed. It is gone from the website." : "That video was already removed.", [[{ text: "Manage videos", callback_data: "vp:0" }], MENU_BTN]);
  }

  if (action === "vid" && arg === "new") {
    await setSession(admin, "v_link", {});
    return sendMessage("Send the link of the video (YouTube, Vimeo, TikTok or Instagram).", CANCEL);
  }
  if (action === "vid" && arg === "no") {
    const s = await getSession(admin);
    await removeCover(s?.data?.thumbnail_url); // do not leave an unused cover behind
    await clearSession(admin);
    await clearButtons();
    return menu("Cancelled.");
  }

  const s = await getSession(admin);
  if (action === "vid" && arg === "title" && s?.step === "v_title" && s.data?.suggested)
    return askStudio(admin, { ...s.data, title: s.data.suggested });
  if (action === "vid" && arg === "skip" && s?.step === "v_studio") return askType(admin, { ...s.data, studio: null });
  if (action === "vid" && arg === "coverskip" && s?.step === "v_cover") return askConfirm(admin, { ...s.data, thumbnail_url: null });
  if (action === "vt" && s?.step === "v_type") {
    const type = VIDEO_TYPES[Number(arg)];
    return type ? afterType(admin, { ...s.data, category: type }) : menu();
  }

  if (action === "vid" && arg === "ok") {
    await clearButtons();
    // Deleting the session is the atomic claim: a repeated tap finds nothing and adds nothing.
    const { data: gone } = await sb.from("bot_sessions").delete().eq("telegram_user_id", admin).eq("step", "v_confirm").select();
    const d = gone?.[0]?.data;
    if (!d) return menu("Nothing to confirm.");
    const { data: res, error } = await sb.rpc("add_video", {
      p_provider: d.provider, p_video_id: d.video_id, p_title: d.title, p_studio: d.studio ?? null,
      p_category: d.category, p_thumbnail: safeThumb(d.thumbnail_url), p_orientation: d.orientation,
      p_source_url: typeof d.source_url === "string" && d.source_url.startsWith("https://") ? d.source_url : null,
      p_admin: admin,
    });
    if (error) {
      await removeCover(d.thumbnail_url);
      return sendMessage("Could not add the video. Please try again.");
    }
    if (res !== "ok") await removeCover(d.thumbnail_url);
    return sendMessage(res === "ok" ? "Added. It is live on the website now." : "That video is already on the website.", [[{ text: "Add another", callback_data: "vid:new" }], MENU_BTN]);
  }
  return menu();
}
