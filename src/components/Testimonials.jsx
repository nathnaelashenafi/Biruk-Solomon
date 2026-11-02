import { useCallback, useEffect, useRef, useState } from "react";
import Reveal from "./work/Reveal";
import { FOCUS } from "./work/ui";
import {
  backendReady,
  fetchApprovedTestimonials,
  publicImageUrl,
} from "../lib/api";

const GAP = 32; // keep in step with gap-8 below
const CUTS = [
  "polygon(0 0, 100% 0, 100% calc(100% - 28px), calc(100% - 28px) 100%, 0 100%)",
  "polygon(28px 0, 100% 0, 100% 100%, 0 100%, 0 28px)",
];

// Design preview, available ONLY on the local dev server: open  /Biruk-Solomon/?preview-testimonials
// It never exists in the production build, and it is never real data.
const PREVIEW =
  import.meta.env.DEV &&
  window.location.search.includes("preview-testimonials");
const SAMPLE = Array.from({ length: 5 }, (_, i) => ({
  id: `sample-${i}`,
  full_name: `Sample Client ${i + 1}`,
  position: "Layout preview",
  company: "Not a real company",
  linkedin_url: null,
  service_or_project: "Preview only",
  testimonial_text:
    "This is placeholder text used only to preview the layout on the development server. It is not a real testimonial. "
      .repeat(i % 2 ? 3 : 1)
      .trim(),
  profile_image_public_path: null,
  company_logo_public_path: null,
}));

const reduceMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Card({ t, index }) {
  const [open, setOpen] = useState(false);
  const photo = publicImageUrl(t.profile_image_public_path);
  const logo = publicImageUrl(t.company_logo_public_path);
  const long = t.testimonial_text.length > 230;
  const cut = { clipPath: CUTS[index % 2] };

  return (
    <li
      data-card
      className="w-[min(86vw,360px)] shrink-0 snap-start pt-10 lg:w-[calc((100%-4rem)/3)]"
    >
      <article className="relative">
        <div
          aria-hidden="true"
          className="absolute inset-0 -translate-x-2 translate-y-2 bg-gold"
          style={cut}
        />
        <div
          className="relative bg-[#0e0e0e] px-6 pb-7 pt-14 text-center"
          style={cut}
        >
          <h3 className="font-display text-2xl uppercase leading-none">
            {t.full_name}
          </h3>
          <p className="mt-2 text-xs text-bone/60">
            {t.position}
            {t.company ? `, ${t.company}` : ""}
          </p>

          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="mx-auto mt-4 h-5 w-5 text-gold"
            fill="currentColor"
          >
            <path d="M4 18v-5.5C4 8.4 6 6.4 9.5 6v2.4C7.8 8.8 7 9.8 7 11.5H10V18H4zm10 0v-5.5c0-4.1 2-6.1 5.5-6.5v2.4c-1.7.4-2.5 1.4-2.5 3.1H20V18h-6z" />
          </svg>

          <p
            className={`mt-3 whitespace-pre-line text-[15px] leading-relaxed text-bone/80 ${open ? "" : "line-clamp-6"}`}
          >
            {t.testimonial_text}
          </p>
          {long && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className={`mt-3 border-b border-bone/30 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition hover:border-gold hover:text-gold ${FOCUS}`}
            >
              {open ? "Show less" : "Read more"}
            </button>
          )}

          {logo && (
            <img
              src={logo}
              alt={t.company ? `${t.company} logo` : "Company logo"}
              loading="lazy"
              decoding="async"
              className="mx-auto mt-5 h-8 w-auto max-w-[140px] bg-bone object-contain p-1"
            />
          )}
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">
            {t.service_or_project}
          </p>
          {t.linkedin_url && (
            <a
              href={t.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-3 inline-block border-b border-bone/30 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition hover:border-gold hover:text-gold ${FOCUS}`}
            >
              LinkedIn
            </a>
          )}
        </div>

        {/* avatar sits outside the clipped card so it can overlap the top edge */}
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2">
          {photo ? (
            <img
              src={photo}
              alt={`Photo of ${t.full_name}`}
              width={80}
              height={80}
              loading="lazy"
              decoding="async"
              className="h-20 w-20 rounded-full border-4 border-ink object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid h-20 w-20 place-items-center rounded-full border-4 border-ink bg-gold font-display text-3xl text-black"
            >
              {t.full_name.trim().charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </article>
    </li>
  );
}

function ArrowButton({ dir, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir < 0 ? "Previous testimonials" : "Next testimonials"}
      className={`grid h-11 w-11 place-items-center border border-bone/25 text-bone transition hover:border-gold hover:text-gold disabled:opacity-30 disabled:hover:border-bone/25 disabled:hover:text-bone ${FOCUS}`}
    >
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
        <path d={dir < 0 ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}

export default function Testimonials() {
  const [items, setItems] = useState(() => (PREVIEW ? SAMPLE : []));
  const [nav, setNav] = useState({
    prev: false,
    next: false,
    positions: 1,
    index: 0,
  });
  const scroller = useRef(null);

  useEffect(() => {
    if (!backendReady || PREVIEW) return;
    let alive = true;
    fetchApprovedTestimonials(12)
      .then((rows) => alive && Array.isArray(rows) && setItems(rows))
      .catch(() => {}); // stay hidden if the request fails
    return () => {
      alive = false;
    };
  }, []);

  const measure = useCallback(() => {
    const el = scroller.current;
    const first = el?.querySelector("[data-card]");
    if (!el || !first) return;
    const step = first.offsetWidth + GAP;
    const visible = Math.max(1, Math.round((el.clientWidth + GAP) / step));
    const positions = Math.max(1, items.length - visible + 1);
    setNav({
      prev: el.scrollLeft > 4,
      next: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
      positions,
      index: Math.min(
        positions - 1,
        Math.max(0, Math.round(el.scrollLeft / step)),
      ),
    });
  }, [items.length]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure, items.length]);

  const stepSize = () =>
    (scroller.current?.querySelector("[data-card]")?.offsetWidth ?? 0) + GAP;
  const behavior = () => (reduceMotion() ? "auto" : "smooth");
  const go = (dir) =>
    scroller.current?.scrollBy({
      left: dir * stepSize(),
      behavior: behavior(),
    });
  const goTo = (i) =>
    scroller.current?.scrollTo({ left: i * stepSize(), behavior: behavior() });

  if (items.length === 0) return null;
  const scrollable = nav.positions > 1;

  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="relative bg-ink px-[5vw] py-16 font-sans text-bone sm:py-20 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-gold/0 via-gold/50 to-gold/0" />
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2
              id="testimonials-heading"
              className="font-display text-[length:clamp(36px,5vw,72px)] uppercase leading-[0.95]"
            >
              What clients{" "}
              <span className="text-transparent [-webkit-text-stroke:1.5px_#F4F1E8]">
                say.
              </span>
            </h2>
          </div>
          {scrollable && (
            <div className="flex gap-2">
              <ArrowButton
                dir={-1}
                disabled={!nav.prev}
                onClick={() => go(-1)}
              />
              <ArrowButton dir={1} disabled={!nav.next} onClick={() => go(1)} />
            </div>
          )}
        </div>

        <ul
          ref={scroller}
          tabIndex={0}
          aria-label="Testimonials. Scroll sideways for more."
          className={`mt-6 flex snap-x snap-mandatory items-start gap-8 overflow-x-auto px-3 pb-6 scroll-px-3 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold [&::-webkit-scrollbar]:hidden ${
            items.length <= 3 ? "lg:justify-center" : ""
          }`}
        >
          {items.map((t, i) => (
            <Card key={t.id} t={t} index={i} />
          ))}
        </ul>

        {scrollable && (
          <div
            className="mt-2 flex justify-center gap-2"
            role="group"
            aria-label="Choose testimonials"
          >
            {Array.from({ length: nav.positions }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show testimonials from number ${i + 1}`}
                aria-current={i === nav.index ? "true" : undefined}
                className={`h-2.5 w-2.5 rounded-full border border-gold transition ${i === nav.index ? "bg-gold" : "bg-transparent"} ${FOCUS}`}
              />
            ))}
          </div>
        )}
      </Reveal>
    </section>
  );
}
