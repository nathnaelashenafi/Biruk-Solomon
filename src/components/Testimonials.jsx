import { useEffect, useState } from "react";
import Reveal from "./work/Reveal";
import { FOCUS } from "./work/ui";
import { backendReady, fetchApprovedTestimonials, publicImageUrl } from "../lib/api";

// Shows only approved testimonials. While loading, on error, or when there are none,
// the section is not rendered at all, so nothing invented or empty is ever shown.
export default function Testimonials() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!backendReady) return;
    let alive = true;
    fetchApprovedTestimonials(6)
      .then((rows) => alive && Array.isArray(rows) && setItems(rows))
      .catch(() => {}); // stay hidden if the request fails
    return () => {
      alive = false;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="relative bg-ink px-[5vw] py-16 font-sans text-bone sm:py-20 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-gold/0 via-gold/50 to-gold/0" />
      <Reveal>
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">Testimonials / 06</p>
        <h2
          id="testimonials-heading"
          className="font-display text-[length:clamp(38px,5.5vw,80px)] uppercase leading-[0.95]"
        >
          In their{" "}
          <span className="text-transparent [-webkit-text-stroke:1.5px_#F4F1E8]">own words.</span>
        </h2>

        <ul className="mt-12 border-t border-bone/15">
          {items.map((t) => {
            const photo = publicImageUrl(t.profile_image_public_path);
            const logo = publicImageUrl(t.company_logo_public_path);
            return (
              <li key={t.id} className="border-b border-bone/15 py-10">
                <figure className="grid gap-6 lg:grid-cols-12 lg:gap-12">
                  <figcaption className="lg:col-span-4">
                    <div className="flex items-center gap-4">
                      {photo && (
                        <img
                          src={photo}
                          alt={`Photo of ${t.full_name}`}
                          width={56}
                          height={56}
                          loading="lazy"
                          decoding="async"
                          className="h-14 w-14 shrink-0 object-cover"
                        />
                      )}
                      <div>
                        <p className="font-display text-2xl uppercase leading-none">{t.full_name}</p>
                        <p className="mt-1.5 text-sm text-bone/65">
                          {t.position}
                          {t.company ? `, ${t.company}` : ""}
                        </p>
                      </div>
                    </div>
                    {logo && (
                      <img
                        src={logo}
                        alt={t.company ? `${t.company} logo` : "Company logo"}
                        loading="lazy"
                        decoding="async"
                        className="mt-4 h-8 w-auto max-w-[160px] bg-bone object-contain p-1"
                      />
                    )}
                    <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">
                      {t.service_or_project}
                    </p>
                    {t.linkedin_url && (
                      <a
                        href={t.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`mt-3 inline-block border-b border-bone/30 py-1 text-xs font-semibold uppercase tracking-[0.14em] transition hover:border-gold hover:text-gold ${FOCUS}`}
                      >
                        LinkedIn
                      </a>
                    )}
                  </figcaption>
                  <blockquote className="whitespace-pre-line text-[length:clamp(18px,1.9vw,25px)] leading-relaxed text-bone/90 lg:col-span-8">
                    {t.testimonial_text}
                  </blockquote>
                </figure>
              </li>
            );
          })}
        </ul>
      </Reveal>
    </section>
  );
}
