// Pure validation helpers. Used by the Edge Functions (server, the real check)
// and by the React forms (friendlier messages). No browser or Deno APIs in here.
export const LIMITS = {
  name: 100, position: 120, company: 120, subject: 150, service: 160,
  testimonialMin: 20, testimonialMax: 1500, messageMin: 10, messageMax: 3000, email: 254,
};
export const CONSENT_VERSION = "2026-11-v1";
export const CONSENT_TEXT =
  "I agree that Biruk Solomon may publish my testimonial, name, professional role, company details, and any photo or logo I choose to provide on his portfolio website.";
export const IMAGE = { maxBytes: 2 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] };

// control characters, zero-width and bidi override characters
const BAD = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const clean = (v) => (typeof v === "string" ? v.replace(/\r\n?/g, "\n").replace(BAD, "").trim() : "");
const oneLine = (v) => clean(v).replace(/\s+/g, " ");

function email(v) {
  const e = oneLine(v).toLowerCase();
  return e.length <= LIMITS.email && EMAIL.test(e) ? e : null;
}

function linkedin(v) {
  const raw = oneLine(v);
  if (!raw) return { value: null };
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const ok = u.protocol === "https:" && /^([a-z0-9-]+\.)?linkedin\.com$/i.test(u.hostname);
    if (!ok) return { error: "Enter a linkedin.com address." };
    u.hash = "";
    const s = u.toString();
    return s.length <= 300 ? { value: s } : { error: "That address is too long." };
  } catch {
    return { error: "Enter a valid LinkedIn address." };
  }
}

function between(value, min, max, label) {
  if (value.length < min) return min <= 1 ? `${label} is required.` : `${label} must be at least ${min} characters.`;
  if (value.length > max) return `${label} must be ${max} characters or fewer.`;
  return null;
}

export function validateContact(input = {}) {
  const errors = {};
  const name = oneLine(input.name);
  const subject = oneLine(input.subject);
  const message = clean(input.message).replace(/\n{3,}/g, "\n\n");
  const mail = email(input.email);
  const nameErr = between(name, 1, LIMITS.name, "Name");
  if (nameErr) errors.name = nameErr;
  if (!mail) errors.email = "Enter a valid email address.";
  if (subject.length > LIMITS.subject) errors.subject = `Subject must be ${LIMITS.subject} characters or fewer.`;
  const msgErr = between(message, LIMITS.messageMin, LIMITS.messageMax, "Message");
  if (msgErr) errors.message = msgErr;
  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, value: { name, email: mail, subject: subject || null, message } };
}

const truthy = (v) => v === true || v === "true" || v === "on";

export function validateTestimonial(input = {}) {
  const errors = {};
  const full_name = oneLine(input.full_name);
  const position = oneLine(input.position);
  const company = oneLine(input.company);
  const service_or_project = oneLine(input.service_or_project);
  const testimonial_text = clean(input.testimonial_text).replace(/\n{3,}/g, "\n\n");
  const li = linkedin(input.linkedin_url);
  const e1 = between(full_name, 1, LIMITS.name, "Full name");
  if (e1) errors.full_name = e1;
  const e2 = between(position, 1, LIMITS.position, "Position");
  if (e2) errors.position = e2;
  if (company.length > LIMITS.company) errors.company = `Company must be ${LIMITS.company} characters or fewer.`;
  if (li.error) errors.linkedin_url = li.error;
  const e3 = between(service_or_project, 1, LIMITS.service, "Project or service");
  if (e3) errors.service_or_project = e3;
  const e4 = between(testimonial_text, LIMITS.testimonialMin, LIMITS.testimonialMax, "Testimonial");
  if (e4) errors.testimonial_text = e4;
  if (!truthy(input.consent)) errors.consent = "Please confirm your consent to publish.";
  return Object.keys(errors).length
    ? { ok: false, errors }
    : {
        ok: true,
        value: {
          full_name, position, company: company || null, linkedin_url: li.value ?? null,
          service_or_project, testimonial_text, consent_version: CONSENT_VERSION,
        },
      };
}

// Used by the Telegram "Create Invitation" flow.
export function validateInvitee({ name, company, email: mail }) {
  const n = oneLine(name);
  const c = oneLine(company);
  const m = oneLine(mail);
  if (n.length < 1 || n.length > LIMITS.name) return { error: `Name must be 1 to ${LIMITS.name} characters.` };
  if (c.length > LIMITS.company) return { error: `Company must be ${LIMITS.company} characters or fewer.` };
  if (m && !email(m)) return { error: "That does not look like a valid email address." };
  return { value: { name: n, company: c || null, email: m ? email(m) : null } };
}

export const validateText = (v, max) => {
  const s = oneLine(v);
  return s.length >= 1 && s.length <= max ? s : null;
};
export const validateEmailOnly = email;

// Detects the real image type from the first bytes (never trust the browser's type or file name).
export function detectImageType(b) {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a)
    return { mime: "image/png", ext: "png" };
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
    return { mime: "image/webp", ext: "webp" };
  return null;
}
