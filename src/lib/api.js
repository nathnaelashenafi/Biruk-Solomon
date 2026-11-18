// Talks to Supabase with the PUBLIC anon key only. No secret ever reaches the browser.
const BASE = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const backendReady = Boolean(BASE && KEY);

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error ?? "request_failed");
    this.status = status;
    this.body = body ?? {};
  }
}

async function request(url, init = {}) {
  let res;
  try {
    res = await fetch(url, {
      ...init,
      headers: { apikey: KEY, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new ApiError(0, { error: "network" });
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body);
  return body;
}

const fn = (name, init) => request(`${BASE}/functions/v1/${name}`, { method: "POST", ...init });
const JSON_HEADERS = { "Content-Type": "application/json" };

export async function sendContact(payload) {
  const result = await fn("contact-submit", {
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
  if (result?.ok !== true || result.email_delivered !== true) {
    throw new ApiError(502, { error: "email_delivery_unconfirmed" });
  }
  return result;
}

export const checkInvitation = (token) =>
  fn("testimonial-validate", { headers: JSON_HEADERS, body: JSON.stringify({ token }) });

export const submitTestimonial = (formData) => fn("testimonial-submit", { body: formData });

// Only approved testimonials exist in this view. Pending and rejected ones are not readable.
export function fetchApprovedTestimonials(limit = 6) {
  const cols =
    "id,full_name,position,company,linkedin_url,service_or_project,testimonial_text,profile_image_public_path,company_logo_public_path";
  return request(`${BASE}/rest/v1/public_testimonials?select=${cols}&order=approved_at.desc&limit=${limit}`);
}

export const publicImageUrl = (path) =>
  path ? `${BASE}/storage/v1/object/public/testimonial-public/${path.split("/").map(encodeURIComponent).join("/")}` : null;

// The portfolio videos, kept in Supabase and managed from the Telegram bot.
// Reads the public view, which only contains the fields shown on the website.
export async function fetchVideos() {
  const cols = "id,provider,video_id,title,studio,category,thumbnail_url,orientation";
  const rows = await request(`${BASE}/rest/v1/public_videos?select=${cols}&order=created_at.desc&limit=60`);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    studio: r.studio,
    category: r.category,
    orientation: r.orientation,
    thumb: r.thumbnail_url,
    video: { provider: r.provider, id: r.video_id },
  }));
}
