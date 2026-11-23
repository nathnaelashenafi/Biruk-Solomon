// Resolves a /public path (works with the "/Biruk-Solomon/" base) or a full URL.
export const asset = (path) => {
  if (!path) return null;
  if (/^(https?:)?\/\//.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
};

// Turns a project's video config into a provider-specific player.
// Social networks use their own embed endpoints; no scraping or third-party proxy.
export function getPlayer(video) {
  if (!video) return null;
  const { provider, id } = video;
  switch (provider) {
    case "youtube":
      return id && /^[A-Za-z0-9_-]{11}$/.test(id)
        ? { type: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1` }
        : null;
    case "vimeo":
      return id && /^\d{6,12}$/.test(id)
        ? { type: "iframe", src: `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1` }
        : null;
    case "tiktok":
      return id && /^\d{6,25}$/.test(id)
        ? { type: "iframe", src: `https://www.tiktok.com/player/v1/${id}?controls=1&description=1` }
        : null;
    case "instagram": {
      const match = /^(post|reel|tv)_([A-Za-z0-9_-]{5,20})$/.exec(id ?? "");
      if (!match) return null;
      const path = match[1] === "post" ? "p" : match[1];
      return { type: "iframe", src: `https://www.instagram.com/${path}/${match[2]}/embed/` };
    }
    case "embed":
      return null; // Arbitrary iframe URLs are deliberately not accepted.
    case "cloudinary":
    case "file":
      return video.url ? { type: "video", src: video.url } : null;
    default:
      return null;
  }
}
