import { useState } from "react";
import Reveal from "./work/Reveal";
import { FOCUS } from "./work/ui";
import { ApiError, backendReady, sendContact } from "../lib/api";
import { LIMITS, SUBJECTS, validateContact } from "../lib/validation";

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
  website: "",
};
const OFFERED = SUBJECTS.filter((s) => s !== "Something else");
const BASE =
  "w-full border border-bone/15 bg-[#0f0f0f] px-4 py-3.5 text-[15px] transition placeholder:text-bone/35 focus:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

function Field({ id, label, required, error, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-bone/90"
      >
        {label}
        {required ? (
          <span className="text-gold"> *</span>
        ) : (
          <span className="text-bone/40"> (optional)</span>
        )}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-gold">
          {error}
        </p>
      )}
    </div>
  );
}

export default function Contact() {
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | failed
  const [failure, setFailure] = useState("");

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const aria = (k) => ({
    "aria-invalid": errors[k] ? "true" : undefined,
    "aria-describedby": errors[k] ? `contact-${k}-error` : undefined,
  });

  async function onSubmit(e) {
    e.preventDefault();
    if (status === "sending") return;
    const v = validateContact(f);
    if (!v.ok) {
      setErrors(v.errors);
      const el = document.getElementById(`contact-${Object.keys(v.errors)[0]}`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        el.focus({ preventScroll: true });
      }
      return;
    }
    setErrors({});
    setStatus("sending");
    try {
      await sendContact({ ...v.value, website: f.website });
      setF(EMPTY);
      setStatus("sent");
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.body.fields) {
        setErrors(err.body.fields);
        return setStatus("idle");
      }
      setFailure(
        err instanceof ApiError && err.status === 429
          ? "Too many messages from this device. Please try again later."
          : "Your message could not be sent. Please try again, or email me directly.",
      );
      setStatus("failed");
    }
  }

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="relative bg-ink px-[5vw] py-16 font-sans text-bone sm:py-20 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-gold/0 via-gold/50 to-gold/0" />
      <Reveal className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16">
        {/* left: pitch and services */}
        <div>
          <h2
            id="contact-heading"
            className="font-display text-[length:clamp(36px,4.6vw,64px)] uppercase leading-[1]"
          >
            Let&apos;s discuss your{" "}
            <span className="text-gold">next project.</span>
          </h2>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-bone/70">
            Tell me about your video, what you need and when you need it. Pick
            the service that fits best and I will take it from there.
          </p>

          <ul className="mt-8 grid gap-4">
            {OFFERED.map((s) => (
              <li
                key={s}
                className="flex items-center gap-4 text-[15px] font-medium"
              >
                <span
                  aria-hidden="true"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold text-black"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
                {s}
              </li>
            ))}
          </ul>

          <a
            href="mailto:biruksolomon701@gmail.com"
            className={`mt-8 inline-block border-b border-gold py-1 text-sm transition hover:text-gold ${FOCUS}`}
          >
            biruksolomon701@gmail.com
          </a>
        </div>

        {/* right: the form */}
        <div>
          {!backendReady ? (
            <p
              role="status"
              className="border border-bone/15 p-6 text-sm text-bone/70"
            >
              The contact form is not connected yet. Please email me at
              biruksolomon701@gmail.com.
            </p>
          ) : status === "sent" ? (
            <div role="status" className="border border-gold/60 p-8">
              <p className="font-display text-3xl uppercase leading-none">
                Message received
              </p>
              <p className="mt-3 text-[15px] text-bone/70">
                Thank you. Your message has been delivered to Biruk.
              </p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className={`mt-6 border-b border-bone/30 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition hover:border-gold hover:text-gold ${FOCUS}`}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="grid gap-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <Field
                  id="contact-name"
                  label="Full name"
                  required
                  error={errors.name}
                >
                  <input
                    id="contact-name"
                    className={`${BASE} text-bone`}
                    value={f.name}
                    onChange={set("name")}
                    maxLength={LIMITS.name}
                    autoComplete="name"
                    placeholder="Your full name"
                    {...aria("name")}
                  />
                </Field>
                <Field
                  id="contact-email"
                  label="Email"
                  required
                  error={errors.email}
                >
                  <input
                    id="contact-email"
                    type="email"
                    className={`${BASE} text-bone`}
                    value={f.email}
                    onChange={set("email")}
                    maxLength={LIMITS.email}
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...aria("email")}
                  />
                </Field>
                <Field id="contact-phone" label="Phone" error={errors.phone}>
                  <input
                    id="contact-phone"
                    type="tel"
                    className={`${BASE} text-bone`}
                    value={f.phone}
                    onChange={set("phone")}
                    maxLength={30}
                    autoComplete="tel"
                    placeholder="+251 9XX XXX XXX"
                    {...aria("phone")}
                  />
                </Field>
                <Field
                  id="contact-subject"
                  label="Subject"
                  required
                  error={errors.subject}
                >
                  <div className="relative">
                    <select
                      id="contact-subject"
                      className={`${BASE} appearance-none pr-11 ${f.subject ? "text-bone" : "text-bone/35"}`}
                      value={f.subject}
                      onChange={set("subject")}
                      {...aria("subject")}
                    >
                      <option value="" disabled>
                        Choose a service
                      </option>
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s} className="bg-ink text-bone">
                          {s}
                        </option>
                      ))}
                    </select>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </Field>
              </div>

              <Field
                id="contact-message"
                label="Message"
                required
                error={errors.message}
              >
                <textarea
                  id="contact-message"
                  rows={6}
                  className={`${BASE} text-bone`}
                  value={f.message}
                  onChange={set("message")}
                  maxLength={LIMITS.messageMax}
                  placeholder="Tell me about your project"
                  {...aria("message")}
                />
              </Field>

              {/* Honeypot: hidden from people, bots tend to fill it in. */}
              <div
                aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
              >
                <label>
                  Website
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={f.website}
                    onChange={set("website")}
                  />
                </label>
              </div>

              <div
                role="status"
                aria-live="polite"
                className="min-h-5 text-sm text-gold"
              >
                {status === "failed" && failure}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className={`inline-flex items-center gap-3 bg-gold px-8 py-4 text-sm font-semibold text-black transition hover:bg-bone disabled:opacity-60 ${FOCUS}`}
                >
                  {status === "sending"
                    ? "Sending..."
                    : status === "failed"
                      ? "Try again"
                      : "Send message"}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            </form>
          )}
        </div>
      </Reveal>
    </section>
  );
}
