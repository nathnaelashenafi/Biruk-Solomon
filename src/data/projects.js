// ─────────────────────────────────────────────────────────────
// SELECTED WORK DATA
//
// thumb : file inside /public (e.g. "thumbs/film-01.webp") or a full https URL.
//         Best quality: export your own 1600×900 WebP, under ~150 KB.
// video : { provider, id | url }
//   youtube    → { provider: "youtube", id: "VIDEO_ID" }
//   vimeo      → { provider: "vimeo", id: "VIDEO_ID" }
//   cloudinary → { provider: "cloudinary", url: "https://res.cloudinary.com/<cloud>/video/upload/q_auto,f_auto/<file>.mp4" }
//   file       → { provider: "file", url: "https://…/film.mp4" }
//   embed      → { provider: "embed", url: "https://…" }
//
// Add `placeholder: true` to any entry that is not a real project yet.
// The project count in the intro only counts entries without it.
// Only ONE project should have `featured: true`.
// Fields left out (year, role, description) are simply not shown.
// ─────────────────────────────────────────────────────────────
export const projects = [
  {
    id: "learneta-time-expressions",
    featured: true,
    title: "በእንግሊዝኛ ጊዜን ለመግለጽ የግድ መጠቀም ያለባቹ!",
    category: "Long-Form Video",
    year: "2026",
    description:
      "An English lesson for Learneta Academy on expressing time naturally in everyday conversation.",
    thumb: "https://i.ytimg.com/vi/zjoIBRTRosw/maxresdefault.jpg",
    thumbAlt:
      "Still from the Learneta Academy lesson on English time expressions",
    thumbSize: { w: 1280, h: 720 },
    video: { provider: "youtube", id: "zjoIBRTRosw" },
  },
  {
    id: "short-01",
    title: "Untitled Short 01", // TODO: replace with the real title
    category: "Short-Form Content",
    thumb: "https://i.ytimg.com/vi/fLDc_Dryqzo/maxresdefault.jpg",
    thumbAlt: "Still from a short-form video",
    thumbSize: { w: 1280, h: 720 },
    video: { provider: "youtube", id: "fLDc_Dryqzo" },
  },
  {
    id: "short-02",
    title: "Untitled Short 02", // TODO: replace with the real title
    category: "Short-Form Content",
    thumb: "https://i.ytimg.com/vi/SSbCsdddoB4/maxresdefault.jpg",
    thumbAlt: "Still from a short-form video",
    thumbSize: { w: 1280, h: 720 },
    video: { provider: "youtube", id: "SSbCsdddoB4" },
  },
];
