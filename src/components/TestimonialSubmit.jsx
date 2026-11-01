import { useEffect, useState } from "react";
import {
  ApiError,
  backendReady,
  checkInvitation,
  submitTestimonial,
} from "../lib/api";
import {
  CONSENT_TEXT,
  CONSENT_VERSION,
  IMAGE,
  LIMITS,
  validateTestimonial,
} from "../lib/validation";

const BLOCKED = {
  expired: "This invitation has expired. Please ask Biruk for a new link.",
  used: "This invitation has already been used.",
  cancelled: "This invitation was cancelled. Please ask Biruk for a new link.",
  invalid:
    "This link is not valid. Please check that you copied the whole link.",
};
const INPUT =
  "w-full border border-bone/25 bg-transparent px-4 py-3 text-bone placeholder:text-bone/40 focus:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";
// After a failed check, jump to the first field with a problem so it is never off-screen.
function focusFirstError(errs) {
  const key = Object.keys(errs)[0];
  const el = key ? document.getElementById(`t-${key}`) : null;
  if (el) {
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
  }
}
const readToken = () =>
  new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("token") ??
  "";

function Field({ id, label, required, hint, error, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-bone/80"
      >
        {label}
        {required ? (
          <span className="text-gold"> *</span>
        ) : (
          <span className="text-bone/40"> (optional)</span>
        )}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-bone/50">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-gold">
          {error}
        </p>
      )}
    </div>
  );
}

export default function TestimonialSubmit() {
  const [token] = useState(readToken);
  const [phase, setPhase] = useState(
    !backendReady ? "network" : token ? "loading" : "invalid",
  );
  const [v, setV] = useState({
    full_name: "",
    position: "",
    company: "",
    linkedin_url: "",
    service_or_project: "",
    testimonial_text: "",
  });
  const [files, setFiles] = useState({
    profile_image: null,
    company_logo: null,
  });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");

  // This page must never appear in search results.
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);

  useEffect(() => {
    if (!token || !backendReady) return;
    let alive = true;
    checkInvitation(token)
      .then((r) => {
        if (!alive) return;
        if (r.state === "valid") {
          setV((p) => ({
            ...p,
            full_name: r.intended_name ?? "",
            company: r.intended_company ?? "",
          }));
          setPhase("valid");
        } else setPhase(r.state in BLOCKED ? r.state : "invalid");
      })
      .catch(() => alive && setPhase("network"));
    return () => {
      alive = false;
    };
  }, [token]);

  const set = (k) => (e) => setV((p) => ({ ...p, [k]: e.target.value }));
  const aria = (k) => ({
    "aria-invalid": errors[k] ? "true" : undefined,
    "aria-describedby": errors[k] ? `t-${k}-error` : undefined,
  });

  async function onSubmit(e) {
    e.preventDefault();
    if (sending) return;
    const res = validateTestimonial({ ...v, consent });
    const fileErrors = {};
    for (const [k, f] of Object.entries(files)) {
      if (!f) continue;
      if (!IMAGE.types.includes(f.type))
        fileErrors[k] = "Use a JPG, PNG or WebP image.";
      else if (f.size > IMAGE.maxBytes)
        fileErrors[k] = "The image must be 2 MB or smaller.";
    }
    if (!res.ok || Object.keys(fileErrors).length) {
      const errs = { ...(res.errors ?? {}), ...fileErrors };
      setErrors(errs);
      setFormError("Please fix the highlighted fields and try again.");
      focusFirstError(errs);
      return;
    }

    setErrors({});
    setFormError("");
    setSending(true);
    const fd = new FormData();
    fd.set("token", token);
    fd.set("consent", "true");
    fd.set("consent_version", CONSENT_VERSION);
    for (const k of Object.keys(v)) fd.set(k, v[k]);
    if (files.profile_image) fd.set("profile_image", files.profile_image);
    if (files.company_logo) fd.set("company_logo", files.company_logo);
    try {
      await submitTestimonial(fd);
      setPhase("sent");
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 410 &&
        err.body.state in BLOCKED
      )
        setPhase(err.body.state);
      else if (
        err instanceof ApiError &&
        err.status === 422 &&
        err.body.fields
      ) {
        setErrors(err.body.fields);
        setFormError("Please fix the highlighted fields and try again.");
        focusFirstError(err.body.fields);
      } else if (err instanceof ApiError && err.status === 409)
        setFormError(
          "This page is out of date. Please reload it and try again.",
        );
      else if (err instanceof ApiError && err.status === 429)
        setFormError("Too many attempts. Please try again later.");
      else
        setFormError(
          "Your testimonial could not be sent. Please check your connection and try again.",
        );
    } finally {
      setSending(false);
    }
  }

  const message =
    phase === "loading"
      ? "Checking your invitation..."
      : phase === "network"
        ? "We could not check this invitation. Please check your connection and reload the page."
        : BLOCKED[phase];

  return (
    <div className="min-h-svh bg-ink px-[5vw] py-10 font-sans text-bone">
      <header className="mx-auto max-w-2xl font-display text-xl tracking-[0.14em]">
        BROOK<span className="text-gold">Y</span>
      </header>

      <main className="mx-auto mt-12 max-w-2xl">
        {phase === "sent" ? (
          <div role="status" className="border border-gold/60 p-8">
            <h1 className="font-display text-4xl uppercase leading-none">
              Thank you
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-bone/75">
              Your testimonial has been received. Biruk will review it before
              anything is published.
            </p>
          </div>
        ) : phase !== "valid" ? (
          <div role="status" className="border border-bone/15 p-8">
            <h1 className="font-display text-3xl uppercase leading-none">
              Testimonial
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-bone/75">
              {message}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">
              Testimonial
            </p>
            <h1 className="font-display text-[length:clamp(36px,6vw,64px)] uppercase leading-[0.95]">
              Share your experience
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-bone/70">
              Thank you for working with Biruk. Your words will be reviewed
              before they appear on his website. Fields marked * are required.
            </p>

            <form onSubmit={onSubmit} noValidate className="mt-10 grid gap-6">
              <Field
                id="t-full_name"
                label="Full name"
                required
                error={errors.full_name}
              >
                <input
                  id="t-full_name"
                  className={INPUT}
                  value={v.full_name}
                  onChange={set("full_name")}
                  maxLength={LIMITS.name}
                  autoComplete="name"
                  {...aria("full_name")}
                />
              </Field>
              <Field
                id="t-position"
                label="Position or job title"
                required
                error={errors.position}
              >
                <input
                  id="t-position"
                  className={INPUT}
                  value={v.position}
                  onChange={set("position")}
                  maxLength={LIMITS.position}
                  autoComplete="organization-title"
                  {...aria("position")}
                />
              </Field>
              <Field
                id="t-company"
                label="Company or organization"
                error={errors.company}
              >
                <input
                  id="t-company"
                  className={INPUT}
                  value={v.company}
                  onChange={set("company")}
                  maxLength={LIMITS.company}
                  autoComplete="organization"
                  {...aria("company")}
                />
              </Field>
              <Field
                id="t-linkedin_url"
                label="LinkedIn profile"
                error={errors.linkedin_url}
              >
                <input
                  id="t-linkedin_url"
                  className={INPUT}
                  value={v.linkedin_url}
                  onChange={set("linkedin_url")}
                  placeholder="linkedin.com/in/your-name"
                  {...aria("linkedin_url")}
                />
              </Field>
              <Field
                id="t-service_or_project"
                label="Project or service you received"
                required
                error={errors.service_or_project}
              >
                <input
                  id="t-service_or_project"
                  className={INPUT}
                  value={v.service_or_project}
                  onChange={set("service_or_project")}
                  maxLength={LIMITS.service}
                  {...aria("service_or_project")}
                />
              </Field>
              <Field
                id="t-testimonial_text"
                label="Your testimonial"
                required
                hint={`${v.testimonial_text.length} / ${LIMITS.testimonialMax} characters (at least ${LIMITS.testimonialMin})`}
                error={errors.testimonial_text}
              >
                <textarea
                  id="t-testimonial_text"
                  rows={8}
                  className={INPUT}
                  value={v.testimonial_text}
                  onChange={set("testimonial_text")}
                  maxLength={LIMITS.testimonialMax}
                  {...aria("testimonial_text")}
                />
              </Field>

              <Field
                id="t-profile_image"
                label="Profile photo"
                hint="JPG, PNG or WebP, up to 2 MB."
                error={errors.profile_image}
              >
                <input
                  id="t-profile_image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className={INPUT}
                  onChange={(e) =>
                    setFiles((p) => ({
                      ...p,
                      profile_image: e.target.files?.[0] ?? null,
                    }))
                  }
                  {...aria("profile_image")}
                />
              </Field>
              <Field
                id="t-company_logo"
                label="Company logo"
                hint="JPG, PNG or WebP, up to 2 MB."
                error={errors.company_logo}
              >
                <input
                  id="t-company_logo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className={INPUT}
                  onChange={(e) =>
                    setFiles((p) => ({
                      ...p,
                      company_logo: e.target.files?.[0] ?? null,
                    }))
                  }
                  {...aria("company_logo")}
                />
              </Field>

              <div>
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-bone/80">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#F5B700]"
                    {...aria("consent")}
                  />
                  <span>
                    {CONSENT_TEXT} <span className="text-gold">*</span>
                  </span>
                </label>
                {errors.consent && (
                  <p
                    id="t-consent-error"
                    role="alert"
                    className="mt-1.5 text-sm text-gold"
                  >
                    {errors.consent}
                  </p>
                )}
              </div>

              <div
                role="status"
                aria-live="polite"
                className="min-h-5 text-sm text-gold"
              >
                {formError}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex bg-gold px-8 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-bone focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold disabled:opacity-60"
                >
                  {sending ? "Sending..." : "Submit testimonial"}
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
