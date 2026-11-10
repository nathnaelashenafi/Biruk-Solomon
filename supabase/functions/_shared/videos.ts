import { sb } from "./db.ts";
import { plain, sendMessage, type Keyboard } from "./telegram.ts";
import { clearSession, getSession, setSession } from "./session.ts";
import { parseVideoLink, safeThumb, VIDEO_TYPES } from "./video-links.js";
import { validateText } from "./validation.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = 8;
const MENU_BTN = [{ text: "Menu", callback_data: "menu" }];
const CANCEL: Keyboard = [[{ text: "Cancel", callback_data: "vid:no" }]];
const SKIP: Keyboard = [[{ text: "Skip", callback_data: "vid:skip" }], ...CANCEL];

// Asks YouTube or Vimeo about the link. Also tells us if the video is missing or cannot be embedded.
async function fetchMeta(link: { provider: string; id: string }) {
  const canonical = link.provider === "youtube" ? `https://www.youtube.com/watch?v=${link.id}` : `https://vimeo.com/${link.id}`;
  const endpoint = link.provider === "youtube"
    ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(canonical)}`
    : `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(canonical)}`;
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(6000) });
    if (res.status === 404) return { ok: false as const, reason: "not_found" };
    if (res.status === 401 || res.status === 403) return { ok: false as const, reason: "not_embeddable" };
    if (!res.ok) return { ok: true as const };
    const j = await res.json();
    return {
      ok: true as const,
      title: typeof j.title === "string" ? j.title : undefined,
      thumb: link.provider === "vimeo" ? safeThumb(j.thumbnail_url) : null,
      portrait: Number(j.height) > Number(j.width),
    };
  } catch {
    return { ok: true as const }; // could not check: carry on, the owner can still add it
  }
}

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

const askConfirm = async (admin: number, d: any) => {
  await setSession(admin, "v_confirm", d);
  return sendMessage(
    `Add this video to the website?\n\nTitle: ${plain(d.title, 150)}\nStudio: ${plain(d.studio ?? "none", 100)}\nType: ${plain(d.category, 60)}\n` +
      `Source: ${d.provider}${d.orientation === "portrait" ? " (vertical)" : ""}\n\nIt appears on the site straight away.`,
    [[{ text: "Add to website", callback_data: "vid:ok" }, { text: "Cancel", callback_data: "vid:no" }]],
  );
};

/* text messages while a video is being added */
export async function videoText(t: string, s: any, admin: number) {
  const d = s.data ?? {};
  if (s.step === "v_link") {
    const link = parseVideoLink(t);
    if (!link) return sendMessage("I can only use YouTube or Vimeo links. Send a full link, or tap Cancel.", CANCEL);
    const { data: exists } = await sb.from("portfolio_videos").select("id").eq("provider", link.provider).eq("video_id", link.id).maybeSingle();
    if (exists) return sendMessage("That video is already on the website.", CANCEL);
    const meta = await fetchMeta(link);
    if (!meta.ok)
      return sendMessage(
        meta.reason === "not_found"
          ? "I could not find that video. Check the link, and that the video is public or unlisted."
          : "That video cannot be embedded on a website. Allow embedding in its settings, then send the link again.",
        CANCEL,
      );
    const next = {
      provider: link.provider,
      video_id: link.id,
      orientation: link.portrait || meta.portrait ? "portrait" : "landscape",
      thumbnail_url: link.provider === "youtube" ? `https://i.ytimg.com/vi/${link.id}/maxresdefault.jpg` : meta.thumb ?? null,
      suggested: meta.title ? meta.title.slice(0, 150) : null,
    };
    await setSession(admin, "v_title", next);
    return sendMessage(
      `Found it.${next.suggested ? `\n\nTitle on ${link.provider}: ${plain(next.suggested, 150)}` : ""}\n\nSend a title for the website${next.suggested ? ", or tap Use this title." : "."}`,
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
    return askConfirm(admin, { ...d, category });
  }
  return sendMessage("Please use the buttons, or send /menu.");
}

async function managePage(offset: number) {
  const { data } = await sb.from("portfolio_videos").select("id,title,studio,category")
    .order("created_at", { ascending: false }).range(offset, offset + PAGE);
  const rows = data ?? [];
  if (!rows.length) return sendMessage(offset ? "No more videos." : "There are no videos on the website yet.", [MENU_BTN]);
  const shown = rows.slice(0, PAGE);
  const lines = shown.map((v: any, i: number) => `${offset + i + 1}. ${plain(v.title, 70)} (${plain(v.studio ?? "no studio", 40)}, ${plain(v.category, 30)})`);
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
    const { data: res, error } = await sb.rpc("remove_video", { p_id: arg, p_admin: admin });
    if (error) return sendMessage("Could not remove it. Please try again.");
    return sendMessage(res === "ok" ? "Removed. It is gone from the website." : "That video was already removed.", [[{ text: "Manage videos", callback_data: "vp:0" }], MENU_BTN]);
  }

  if (action === "vid" && arg === "new") {
    await setSession(admin, "v_link", {});
    return sendMessage("Send the YouTube or Vimeo link of the video.", CANCEL);
  }
  if (action === "vid" && arg === "no") {
    await clearSession(admin);
    await clearButtons();
    return menu("Cancelled.");
  }

  const s = await getSession(admin);
  if (action === "vid" && arg === "title" && s?.step === "v_title" && s.data?.suggested)
    return askStudio(admin, { ...s.data, title: s.data.suggested });
  if (action === "vid" && arg === "skip" && s?.step === "v_studio") return askType(admin, { ...s.data, studio: null });
  if (action === "vt" && s?.step === "v_type") {
    const type = VIDEO_TYPES[Number(arg)];
    return type ? askConfirm(admin, { ...s.data, category: type }) : menu();
  }

  if (action === "vid" && arg === "ok") {
    await clearButtons();
    // Deleting the session is the atomic claim: a repeated tap finds nothing and adds nothing.
    const { data: gone } = await sb.from("bot_sessions").delete().eq("telegram_user_id", admin).eq("step", "v_confirm").select();
    const d = gone?.[0]?.data;
    if (!d) return menu("Nothing to confirm.");
    const { data: res, error } = await sb.rpc("add_video", {
      p_provider: d.provider, p_video_id: d.video_id, p_title: d.title, p_studio: d.studio ?? null,
      p_category: d.category, p_thumbnail: safeThumb(d.thumbnail_url), p_orientation: d.orientation, p_admin: admin,
    });
    if (error) return sendMessage("Could not add the video. Please try again.");
    return sendMessage(res === "ok" ? "Added. It is live on the website now." : "That video is already on the website.", [[{ text: "Add another", callback_data: "vid:new" }], MENU_BTN]);
  }
  return menu();
}
