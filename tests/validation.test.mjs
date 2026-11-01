import test from "node:test";
import assert from "node:assert/strict";
import {
  validateContact, validateTestimonial, validateInvitee, detectImageType, LIMITS, CONSENT_VERSION,
} from "../supabase/functions/_shared/validation.js";

const good = {
  full_name: "Ann Lee", position: "CEO", company: "Acme", linkedin_url: "linkedin.com/in/ann",
  service_or_project: "Brand film", testimonial_text: "Working with Biruk was a great experience.", consent: true,
};

test("contact: valid input passes and is normalised", () => {
  const r = validateContact({ name: "  Sam  ", email: "SAM@Example.com", message: "Hello, I need a video." });
  assert.equal(r.ok, true);
  assert.equal(r.value.name, "Sam");
  assert.equal(r.value.email, "sam@example.com");
  assert.equal(r.value.subject, null);
});
test("contact: bad email rejected", () => assert.ok(validateContact({ name: "A", email: "nope", message: "Hello there friend" }).errors.email));
test("contact: empty and too-short message rejected", () => {
  assert.ok(validateContact({ name: "A", email: "a@b.co", message: "" }).errors.message);
  assert.ok(validateContact({ name: "A", email: "a@b.co", message: "hi" }).errors.message);
});
test("contact: excessively long message rejected", () =>
  assert.ok(validateContact({ name: "A", email: "a@b.co", message: "x".repeat(LIMITS.messageMax + 1) }).errors.message));
test("contact: control characters are stripped", () => {
  const r = validateContact({ name: "A\u0000B", email: "a@b.co", message: "Hello\u202Eworld ok ok" });
  assert.equal(r.value.name, "AB");
  assert.ok(!/\u202E/.test(r.value.message));
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
