import { clientKey, cors, gate, json } from "../_shared/http.ts";
import { PRIVATE_BUCKET, sb, withinLimit } from "../_shared/db.ts";
import { sha256Hex, TOKEN_RE } from "../_shared/crypto.ts";
import { CONSENT_VERSION, detectImageType, IMAGE, validateTestimonial } from "../_shared/validation.js";
import { notifyTestimonial } from "../_shared/telegram.ts";

const MAX_REQUEST = 5 * 1024 * 1024;
const STATES = ["invalid", "used", "cancelled", "expired"];

async function readImage(file: FormDataEntryValue | null, label: string) {
  if (!(file instanceof File) || file.size === 0) return { none: true as const };
  if (file.size > IMAGE.maxBytes) return { error: `${label}: the image must be 2 MB or smaller.` };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes); // real content check, not the browser's claim
  if (!type) return { error: `${label}: only JPG, PNG or WebP images are accepted.` };
  return { bytes, ...type };
}

Deno.serve(async (req) => {
  const c = cors(req);
  const blocked = gate(req, c);
  if (blocked) return blocked;
  if (Number(req.headers.get("content-length") ?? 0) > MAX_REQUEST) return json({ error: "too_large" }, 413, c.headers);

  const key = await clientKey(req);
  const [perVisitor, overall] = await Promise.all([
    withinLimit(`tsubmit:${key}`, 3600, 10),
    withinLimit("tsubmit:all", 3600, 60),
  ]);
  if (!perVisitor || !overall) return json({ error: "rate_limited" }, 429, c.headers);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "bad_request" }, 400, c.headers);
  }

  const token = String(form.get("token") ?? "");
  if (!TOKEN_RE.test(token)) return json({ error: "invitation", state: "invalid" }, 410, c.headers);
  const tokenHash = await sha256Hex(token);

  // 1. The invitation must be valid now (checked again atomically in step 5).
  const pre = await sb.rpc("check_invitation", { p_token_hash: tokenHash });
  if (pre.error) return json({ error: "server_error" }, 500, c.headers);
  if (pre.data?.state !== "valid") return json({ error: "invitation", state: pre.data?.state ?? "invalid" }, 410, c.headers);

  // 2. Validate every field on the server.
  if (String(form.get("consent_version") ?? "") !== CONSENT_VERSION) return json({ error: "outdated_form" }, 409, c.headers);
  const fields: Record<string, unknown> = {};
  for (const k of ["full_name", "position", "company", "linkedin_url", "service_or_project", "testimonial_text", "consent"])
    fields[k] = form.get(k)?.toString() ?? "";
  const v = validateTestimonial(fields);
  if (!v.ok) return json({ error: "validation", fields: v.errors }, 422, c.headers);

  // 3. Validate optional images.
  const profile = await readImage(form.get("profile_image"), "Profile photo");
  const logo = await readImage(form.get("company_logo"), "Company logo");
  const imgErrors: Record<string, string> = {};
  if ("error" in profile) imgErrors.profile_image = profile.error!;
  if ("error" in logo) imgErrors.company_logo = logo.error!;
  if (Object.keys(imgErrors).length) return json({ error: "validation", fields: imgErrors }, 422, c.headers);

  // 4. Store images privately under random names.
  const uploaded: string[] = [];
  async function store(img: any, folder: string): Promise<string | null> {
    if (img.none) return null;
    const path = `${folder}/${crypto.randomUUID()}.${img.ext}`;
    const { error } = await sb.storage.from(PRIVATE_BUCKET).upload(path, img.bytes, { contentType: img.mime, upsert: false });
    if (error) throw new Error("upload_failed");
    uploaded.push(path);
    return path;
  }
  const cleanup = () => (uploaded.length ? sb.storage.from(PRIVATE_BUCKET).remove(uploaded) : Promise.resolve());

  let profilePath: string | null = null;
  let logoPath: string | null = null;
  try {
    profilePath = await store(profile, "profile");
    logoPath = await store(logo, "logo");
  } catch {
    await cleanup();
    return json({ error: "upload_failed" }, 500, c.headers);
  }

  // 5. Claim the invitation and save the testimonial in one database transaction.
  const { data: id, error } = await sb.rpc("submit_testimonial", {
    p_token_hash: tokenHash,
    p_full_name: v.value.full_name,
    p_position: v.value.position,
    p_company: v.value.company,
    p_linkedin: v.value.linkedin_url,
    p_service: v.value.service_or_project,
    p_text: v.value.testimonial_text,
    p_profile_path: profilePath,
    p_logo_path: logoPath,
    p_consent_version: v.value.consent_version,
  });
  if (error || !id) {
    await cleanup();
    const state = STATES.find((s) => error?.message?.includes(`${s}_invitation`));
    if (state) return json({ error: "invitation", state }, 410, c.headers);
    console.error("testimonial_save_failed", error?.code);
    return json({ error: "save_failed" }, 500, c.headers);
  }

  // 6. Tell Biruk. A failure here never loses the saved testimonial (notify-retry resends).
  const { data: row } = await sb.from("testimonials").select("*").eq("id", id).single();
  if (row) await notifyTestimonial(row);
  return json({ ok: true }, 200, c.headers);
});
