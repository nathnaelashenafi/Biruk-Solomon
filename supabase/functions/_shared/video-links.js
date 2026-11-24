// Pure helpers for the video links Biruk pastes into the Telegram bot.
export const VIDEO_TYPES = ["Educational video", "Short-form", "Promo video", "Brand film", "Music video", "Event film"];
export const PROVIDER_NAMES = { youtube: "YouTube", vimeo: "Vimeo", tiktok: "TikTok", instagram: "Instagram" };
export const COVER_BUCKET = "video-covers";

const ID11 = /^[A-Za-z0-9_-]{11}$/;
const TT_ID = /^\d{15,25}$/;
const TT_USER = /^[A-Za-z0-9._-]{1,40}$/;
const TT_SHORT = /^[A-Za-z0-9]{5,20}$/;
const IG_CODE = /^[A-Za-z0-9_-]{5,20}$/;

// Returns { provider, id, portrait, sourceUrl } for a YouTube, Vimeo, TikTok or Instagram link.
// A short TikTok link (vm.tiktok.com, vt.tiktok.com, tiktok.com/t/...) returns { provider, id: null, resolve }
// because the real address has to be looked up first. Anything else returns null.
export function parseVideoLink(input) {
  let u;
  try {
    u = new URL(String(input).trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    const id = parts[0] ?? "";
    return ID11.test(id) ? { provider: "youtube", id, portrait: false, sourceUrl: `https://www.youtube.com/watch?v=${id}` } : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parts[0] === "watch") {
      const id = u.searchParams.get("v") ?? "";
      return ID11.test(id) ? { provider: "youtube", id, portrait: false, sourceUrl: `https://www.youtube.com/watch?v=${id}` } : null;
    }
    if (["shorts", "embed", "live", "v"].includes(parts[0]) && ID11.test(parts[1] ?? "")) {
      const portrait = parts[0] === "shorts";
      const id = parts[1];
      return { provider: "youtube", id, portrait, sourceUrl: portrait ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}` };
    }
    return null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/(?:^|\/)(\d{6,12})(?:\/|$)/);
    return m ? { provider: "vimeo", id: m[1], portrait: false, sourceUrl: `https://vimeo.com/${m[1]}` } : null;
  }

  if (host === "tiktok.com") {
    if (parts[0]?.startsWith("@") && parts[1] === "video" && TT_ID.test(parts[2] ?? "") && TT_USER.test(parts[0].slice(1)))
      return { provider: "tiktok", id: parts[2], portrait: true, sourceUrl: `https://www.tiktok.com/${parts[0]}/video/${parts[2]}` };
    if (parts[0] === "t" && TT_SHORT.test(parts[1] ?? ""))
      return { provider: "tiktok", id: null, portrait: true, resolve: `https://www.tiktok.com/t/${parts[1]}/` };
    return null;
  }
  if (host === "vm.tiktok.com" || host === "vt.tiktok.com") {
    return TT_SHORT.test(parts[0] ?? "")
      ? { provider: "tiktok", id: null, portrait: true, resolve: `https://${host}/${parts[0]}/` }
      : null;
  }

  if (host === "instagram.com" || host === "instagr.am") {
    const i = parts.findIndex((p) => ["p", "reel", "reels", "tv"].includes(p));
    if (i === -1 || i > 1 || !IG_CODE.test(parts[i + 1] ?? "")) return null;
    const kind = parts[i] === "reels" ? "reel" : parts[i];
    const id = parts[i + 1];
    return { provider: "instagram", id, portrait: kind === "reel", sourceUrl: `https://www.instagram.com/${kind}/${id}/` };
  }
  return null;
}

// Cover pictures are only accepted from YouTube, Vimeo, or our own public cover bucket.
export const safeThumb = (url) =>
  typeof url === "string" &&
  url.length <= 400 &&
  /^https:\/\/(i\.ytimg\.com\/|i\.vimeocdn\.com\/|[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/video-covers\/)/.test(url)
    ? url
    : null;
