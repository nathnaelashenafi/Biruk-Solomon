// Resolves a /public path (works with the "/Biruk-Solomon/" base) or a full URL.
export const asset = (path) => {
  if (!path) return null;
  if (/^(https?:)?\/\//.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
};

// Turns a project's `video` config into something the modal can render.
// Nothing here is called until a visitor asks to play a film.
export function getPlayer(video) {
  if (!video) return null;
  const { provider, id, url } = video;
  switch (provider) {
    case "youtube":
      return id
        ? {
            type: "iframe",
            src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`,
          }
        : null;
    case "vimeo":
      return id
        ? { type: "iframe", src: `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1` }
        : null;
    case "embed":
      return url ? { type: "iframe", src: url } : null;
    case "cloudinary":
    case "file":
      return url ? { type: "video", src: url } : null;
    default:
      return null;
  }
}
