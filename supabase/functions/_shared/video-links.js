// Strict provider parsing for links submitted through the private Telegram bot.
export const VIDEO_TYPES = ["Educational video", "Short-form", "Promo video", "Brand film", "Music video", "Event film"];

const ID11 = /^[A-Za-z0-9_-]{11}$/;
const INSTAGRAM_CODE = /^[A-Za-z0-9_-]{5,20}$/;
const TIKTOK_ID = /^\d{6,25}$/;
const hostOf = (u) => u.hostname.toLowerCase().replace(/^(www|m)\./, "");

export function parseVideoLink(input) {
  let u;
  try {
    u = new URL(String(input).trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = hostOf(u);

  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return ID11.test(id) ? { provider: "youtube", id, portrait: false } : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "watch") {
      const id = u.searchParams.get("v") ?? "";
      return ID11.test(id) ? { provider: "youtube", id, portrait: false } : null;
    }
    if (["shorts", "embed", "live", "v"].includes(parts[0]) && ID11.test(parts[1] ?? ""))
      return { provider: "youtube", id: parts[1], portrait: parts[0] === "shorts" };
    return null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/(?:^|\/)(\d{6,12})(?:\/|$)/);
    return m ? { provider: "vimeo", id: m[1], portrait: false } : null;
  }
  if (host === "tiktok.com") {
    const m = u.pathname.match(/^\/@[A-Za-z0-9._-]+\/video\/(\d{6,25})(?:\/|$)/);
    return m ? { provider: "tiktok", id: m[1], portrait: true } : null;
  }
  if (host === "instagram.com") {
    const m = u.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]{5,20})(?:\/|$)/);
    if (!m || !INSTAGRAM_CODE.test(m[2])) return null;
    return { provider: "instagram", id: `${m[1] === "reel" ? "reel_" : m[1] === "tv" ? "tv_" : "post_"}${m[2]}`, portrait: m[1] === "reel" };
  }
  return null;
}

// Only trusted provider thumbnail hosts are accepted. Social embeds use their native preview.
export const safeThumb = (url) =>
  typeof url === "string" && url.length <= 400 &&
  /^https:\/\/(i\.ytimg\.com|i\.vimeocdn\.com)\//.test(url) ? url : null;
