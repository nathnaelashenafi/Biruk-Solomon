import test from "node:test";
import assert from "node:assert/strict";
import {
  validateContact, validateTestimonial, validateInvitee, detectImageType, LIMITS, CONSENT_VERSION, SUBJECTS,
} from "../supabase/functions/_shared/validation.js";

const good = {
  full_name: "Ann Lee", position: "CEO", company: "Acme", linkedin_url: "linkedin.com/in/ann",
  service_or_project: "Brand film", testimonial_text: "Working with Biruk was a great experience.", consent: true,
};

test("contact: valid input passes and is normalised", () => {
  const r = validateContact({ name: "  Sam  ", email: "SAM@Example.com", subject: "Video Editing", message: "Hello, I need a video." });
  assert.equal(r.ok, true);
  assert.equal(r.value.name, "Sam");
  assert.equal(r.value.email, "sam@example.com");
  assert.equal(r.value.subject, "Video Editing");
  assert.equal(r.value.phone, null);
});
test("contact: bad email rejected", () => assert.ok(validateContact({ name: "A", email: "nope", subject: "Videography", message: "Hello there friend" }).errors.email));
test("contact: empty and too-short message rejected", () => {
  assert.ok(validateContact({ name: "A", email: "a@b.co", subject: "Videography", message: "" }).errors.message);
  assert.ok(validateContact({ name: "A", email: "a@b.co", subject: "Videography", message: "hi" }).errors.message);
});
test("contact: excessively long message rejected", () =>
  assert.ok(validateContact({ name: "A", email: "a@b.co", subject: "Videography", message: "x".repeat(LIMITS.messageMax + 1) }).errors.message));
test("contact: control characters are stripped", () => {
  const r = validateContact({ name: "A\u0000B", email: "a@b.co", subject: "Videography", message: "Hello\u202Eworld ok ok" });
  assert.equal(r.value.name, "AB");
  assert.ok(!/\u202E/.test(r.value.message));
});
test("contact: subject must be one of the services", () => {
  const base = { name: "A", email: "a@b.co", message: "Hello there friend" };
  assert.ok(validateContact({ ...base, subject: "" }).errors.subject);
  assert.ok(validateContact({ ...base, subject: "Hacking" }).errors.subject);
  for (const s of SUBJECTS) assert.equal(validateContact({ ...base, subject: s }).ok, true);
});
test("contact: phone is optional but checked when given", () => {
  const base = { name: "A", email: "a@b.co", subject: "Videography", message: "Hello there friend" };
  assert.equal(validateContact({ ...base, phone: "" }).ok, true);
  assert.equal(validateContact({ ...base, phone: "+251 91 234 5678" }).value.phone, "+251 91 234 5678");
  assert.ok(validateContact({ ...base, phone: "call me maybe" }).errors.phone);
  assert.ok(validateContact({ ...base, phone: "12" }).errors.phone);
});
test("testimonial: valid submission passes", () => {
  const r = validateTestimonial(good);
  assert.equal(r.ok, true);
  assert.equal(r.value.consent_version, CONSENT_VERSION);
  assert.equal(r.value.linkedin_url, "https://linkedin.com/in/ann");
});
test("testimonial: consent is mandatory", () => {
  assert.ok(validateTestimonial({ ...good, consent: false }).errors.consent);
  assert.ok(validateTestimonial({ ...good, consent: undefined }).errors.consent);
});
test("testimonial: optional fields can be omitted", () =>
  assert.equal(validateTestimonial({ ...good, company: "", linkedin_url: "" }).ok, true));
test("testimonial: missing, short and long fields rejected", () => {
  assert.ok(validateTestimonial({ ...good, full_name: "" }).errors.full_name);
  assert.ok(validateTestimonial({ ...good, testimonial_text: "short" }).errors.testimonial_text);
  assert.ok(validateTestimonial({ ...good, testimonial_text: "x".repeat(LIMITS.testimonialMax + 1) }).errors.testimonial_text);
});
test("testimonial: non-LinkedIn and non-https addresses rejected", () => {
  assert.ok(validateTestimonial({ ...good, linkedin_url: "https://evil.com/linkedin.com" }).errors.linkedin_url);
  assert.ok(validateTestimonial({ ...good, linkedin_url: "http://linkedin.com.evil.com/x" }).errors.linkedin_url);
  assert.ok(validateTestimonial({ ...good, linkedin_url: "javascript:alert(1)" }).errors.linkedin_url);
});
test("testimonial: HTML stays plain text (React renders it as text, never as HTML)", () => {
  const r = validateTestimonial({ ...good, testimonial_text: "<script>alert(1)</script> great work indeed" });
  assert.equal(r.ok, true);
  assert.ok(r.value.testimonial_text.startsWith("<script>"));
});
test("invitee: validates name, company and optional email", () => {
  assert.ok(validateInvitee({ name: "", company: "", email: "" }).error);
  assert.ok(validateInvitee({ name: "A", company: "", email: "bad" }).error);
  assert.equal(validateInvitee({ name: "A", company: "", email: "" }).value.email, null);
});
test("images: real types detected by content, not by name", () => {
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0]);
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0]);
  assert.equal(detectImageType(jpg).ext, "jpg");
  assert.equal(detectImageType(png).ext, "png");
  assert.equal(detectImageType(webp).ext, "webp");
});
test("images: SVG, HTML, PDF and executables rejected", () => {
  const enc = (s) => new TextEncoder().encode(s.padEnd(20, " "));
  assert.equal(detectImageType(enc("<svg xmlns='http://www.w3.org/2000/svg'>")), null);
  assert.equal(detectImageType(enc("<html><script>")), null);
  assert.equal(detectImageType(enc("%PDF-1.7")), null);
  assert.equal(detectImageType(new Uint8Array([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0, 0])), null);
});

import { parseVideoLink, safeThumb, VIDEO_TYPES } from "../supabase/functions/_shared/video-links.js";

test("video links: YouTube forms are understood", () => {
  const id = "zjoIBRTRosw";
  for (const u of [
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/watch?v=${id}&t=10s`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://youtube.com/embed/${id}`,
    `https://www.youtube.com/live/${id}`,
  ]) {
    const r = parseVideoLink(u);
    assert.equal(r.provider, "youtube", u);
    assert.equal(r.id, id, u);
    assert.equal(r.portrait, false, u);
    assert.equal(r.sourceUrl, `https://www.youtube.com/watch?v=${id}`, u);
  }
  const s = parseVideoLink("https://youtube.com/shorts/fLDc_Dryqzo?si=x");
  assert.equal(s.id, "fLDc_Dryqzo");
  assert.equal(s.portrait, true);
});
test("video links: Vimeo is understood", () => {
  for (const u of ["https://vimeo.com/123456789", "https://player.vimeo.com/video/123456789?h=abc"]) {
    const r = parseVideoLink(u);
    assert.equal(r.provider, "vimeo");
    assert.equal(r.id, "123456789");
    assert.equal(r.sourceUrl, "https://vimeo.com/123456789");
  }
});
test("video links: TikTok full links are understood", () => {
  const r = parseVideoLink("https://www.tiktok.com/@learneta.academy/video/7234567890123456789?is_from_webapp=1");
  assert.equal(r.provider, "tiktok");
  assert.equal(r.id, "7234567890123456789");
  assert.equal(r.portrait, true);
  assert.equal(r.sourceUrl, "https://www.tiktok.com/@learneta.academy/video/7234567890123456789");
  assert.equal(parseVideoLink("https://m.tiktok.com/@a_b/video/7234567890123456789").id, "7234567890123456789");
});
test("video links: short TikTok links ask for a lookup instead of guessing", () => {
  for (const u of ["https://vm.tiktok.com/ZMabc12345/", "https://vt.tiktok.com/ZSabc12345", "https://www.tiktok.com/t/ZTabc12345/"]) {
    const r = parseVideoLink(u);
    assert.equal(r.provider, "tiktok", u);
    assert.equal(r.id, null, u);
    assert.ok(r.resolve.startsWith("https://"), u);
  }
});
test("video links: Instagram reels and posts are understood", () => {
  const reel = parseVideoLink("https://www.instagram.com/reel/C8x_abc1234/?igsh=xyz");
  assert.equal(reel.provider, "instagram");
  assert.equal(reel.id, "C8x_abc1234");
  assert.equal(reel.portrait, true);
  assert.equal(reel.sourceUrl, "https://www.instagram.com/reel/C8x_abc1234/");
  const withUser = parseVideoLink("https://www.instagram.com/brooky9teen7/reel/C8x_abc1234/");
  assert.equal(withUser.id, "C8x_abc1234");
  const post = parseVideoLink("https://instagram.com/p/DAbc123456/");
  assert.equal(post.portrait, false);
  assert.equal(post.sourceUrl, "https://www.instagram.com/p/DAbc123456/");
});
test("video links: anything else is refused", () => {
  for (const u of ["", "hello", "javascript:alert(1)", "https://evil.com/watch?v=zjoIBRTRosw", "https://youtube.com.evil.com/watch?v=zjoIBRTRosw",
    "https://youtube.com/watch?v=short", "https://youtube.com/channel/UCJ0uVZZdifb1xe1RjWQ_8ew", "ftp://youtu.be/zjoIBRTRosw",
    "https://tiktok.com.evil.com/@a/video/7234567890123456789", "https://www.tiktok.com/@a/video/123", "https://www.tiktok.com/@a",
    "https://instagram.com.evil.com/reel/C8x_abc1234/", "https://www.instagram.com/explore/", "https://www.instagram.com/brooky9teen7/",
    "https://vm.tiktok.com.evil.com/ZMabc12345/"])
    assert.equal(parseVideoLink(u), null, u);
});
test("video links: covers only from YouTube, Vimeo or our own cover bucket", () => {
  assert.ok(safeThumb("https://i.ytimg.com/vi/x/maxresdefault.jpg"));
  assert.ok(safeThumb("https://i.vimeocdn.com/video/1.jpg"));
  assert.ok(safeThumb("https://abcdefg.supabase.co/storage/v1/object/public/video-covers/a1b2.jpg"));
  assert.equal(safeThumb("https://abcdefg.supabase.co/storage/v1/object/public/testimonial-private/a1b2.jpg"), null);
  assert.equal(safeThumb("https://evil.com/i.ytimg.com/x.jpg"), null);
  assert.equal(safeThumb("http://i.ytimg.com/x.jpg"), null);
  assert.ok(VIDEO_TYPES.length >= 4);
});
