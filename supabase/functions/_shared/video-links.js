// Pure helpers for the video links Biruk pastes into the Telegram bot.
export const VIDEO_TYPES = ["Educational video", "Short-form", "Promo video", "Brand film", "Music video", "Event film"];

const ID11 = /^[A-Za-z0-9_-]{11}$/;

// Returns { provider, id, portrait } for a YouTube or Vimeo link, or null for anything else.
export function parseVideoLink(input) {
  let u;
  try {
    u = new URL(String(input).trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, "");

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
  return null;
}

// Only these image hosts are accepted for thumbnails.
export const safeThumb = (url) =>
  typeof url === "string" && url.length <= 400 && /^https:\/\/(i\.ytimg\.com|i\.vimeocdn\.com)\//.test(url) ? url : null;
