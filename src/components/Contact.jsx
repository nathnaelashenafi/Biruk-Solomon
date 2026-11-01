import { useState } from "react";
import Reveal from "./work/Reveal";
import { FOCUS } from "./work/ui";
import { ApiError, backendReady, sendContact } from "../lib/api";
import { LIMITS, validateContact } from "../lib/validation";

const EMPTY = { name: "", email: "", subject: "", message: "", website: "" };
const INPUT =
  "w-full border border-bone/25 bg-transparent px-4 py-3 text-bone placeholder:text-bone/40 focus:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

function Field({ id, label, optional, error, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-bone/80"
      >
        {label}
        {optional && <span className="text-bone/40"> (optional)</span>}
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
      <Reveal className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">
            Contact / 07
          </p>
          <h2
            id="contact-heading"
            className="font-display text-[length:clamp(38px,5.5vw,80px)] uppercase leading-[0.95]"
          >
            Start a{" "}
            <span className="text-transparent [-webkit-text-stroke:1.5px_#F4F1E8]">
              project.
            </span>
          </h2>
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-bone/70">
            Tell me about your video and what you need. You can also write to me
            directly.
          </p>
          <a
            href="mailto:biruksolomon701@gmail.com"
            className={`mt-6 inline-block border-b border-gold py-1 text-sm transition hover:text-gold ${FOCUS}`}
          >
            biruksolomon701@gmail.com
          </a>
        </div>

        <div className="lg:col-span-7">
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
                <Field id="contact-name" label="Name" error={errors.name}>
                  <input
                    id="contact-name"
                    className={INPUT}
                    value={f.name}
                    onChange={set("name")}
                    maxLength={LIMITS.name}
                    autoComplete="name"
                    required
                    {...aria("name")}
                  />
                </Field>
                <Field id="contact-email" label="Email" error={errors.email}>
                  <input
                    id="contact-email"
                    type="email"
                    className={INPUT}
                    value={f.email}
                    onChange={set("email")}
                    maxLength={LIMITS.email}
                    autoComplete="email"
                    required
                    {...aria("email")}
                  />
                </Field>
              </div>
              <Field
                id="contact-subject"
                label="Subject"
                optional
                error={errors.subject}
              >
                <input
                  id="contact-subject"
                  className={INPUT}
                  value={f.subject}
                  onChange={set("subject")}
                  maxLength={LIMITS.subject}
                  {...aria("subject")}
                />
              </Field>
              <Field
                id="contact-message"
                label="Message"
                error={errors.message}
              >
                <textarea
                  id="contact-message"
                  rows={6}
                  className={INPUT}
                  value={f.message}
                  onChange={set("message")}
                  maxLength={LIMITS.messageMax}
                  required
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
                  className={`inline-flex bg-gold px-8 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-bone disabled:opacity-60 ${FOCUS}`}
                >
                  {status === "sending"
                    ? "Sending..."
                    : status === "failed"
                      ? "Try again"
                      : "Send message"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Reveal>
    </section>
  );
}
