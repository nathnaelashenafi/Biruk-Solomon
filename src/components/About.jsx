import Reveal from "./work/Reveal";
import { FOCUS } from "./work/ui";

// ─────────────────────────────────────────────────────────────
// ABOUT DATA. Edit here. Only add details you can confirm.
// CV: put your file in /public with exactly this name.
// ─────────────────────────────────────────────────────────────
const CV_FILE = "Biruk-Solomon-CV.pdf";

const BIO = [
  "I'm Biruk Solomon, a video editor and videographer based in Addis Ababa, Ethiopia. I turn raw footage into finished stories through editing, pacing, transitions, and the small visual decisions that keep a viewer watching.",
  "My work covers educational videos, short-form social content, and promotional videos for creators, brands, and individuals. I also run my own YouTube channel, Brooky.",
];

const SOCIALS = [
  {
    label: "Email",
    href: "mailto:biruksolomon701@gmail.com",
    external: false,
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="1.5" />
        <path d="M3 7l9 6 9-6" />
      </>
    ),
  },
  {
    label: "Telegram",
    href: "https://t.me/barkey97",
    external: true,
    icon: (
      <>
        <path d="M21.5 3.5 2.5 10.8l6.2 2.3 2.3 6.4 3.1-4.2 5.1 3.7z" />
        <path d="M8.7 13.1 21.5 3.5" />
      </>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/biruk-solomon-67188b333/",
    external: true,
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M8 10.5V17M8 7.2v.1M12 17v-6.5M12 13a2.5 2.5 0 0 1 5 0V17" />
      </>
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/brooky9teen7/",
    external: true,
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17.5 6.5v.01" />
      </>
    ),
  },
];

export default function About() {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="bg-gold px-[5vw] py-16 font-sans sm:py-24"
    >
      <Reveal>
        <div className="mx-auto grid max-w-6xl bg-ink text-bone shadow-[0_30px_60px_rgba(0,0,0,0.35)] md:grid-cols-[5fr_7fr]">
          {/* photo, flush to the left edge of the card */}
          <div className="relative aspect-[4/5] md:aspect-auto md:min-h-[480px]">
            <img
              src={`${import.meta.env.BASE_URL}biruk.png`}
              alt="Portrait of Biruk Solomon"
              width={900}
              height={1125}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-[50%_20%]"
            />
          </div>

          {/* text */}
          <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
            <h2
              id="about-heading"
              className="font-display text-[length:clamp(36px,4.6vw,64px)] uppercase leading-none"
            >
              About me
            </h2>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Biruk Solomon, Video Editor and Videographer
            </p>

            <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-bone/70">
              {BIO.map((p) => (
                <p key={p}>{p}</p>
              ))}
              <p className="text-sm text-bone/50">
                Tools: Adobe Premiere Pro, CapCut, Adobe Photoshop, Canva.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-5 border-t border-bone/15 pt-6">
              <ul className="flex items-center gap-2.5">
                {SOCIALS.map((s) => (
                  <li key={s.label}>
                    <a
                      href={s.href}
                      aria-label={s.label}
                      title={s.label}
                      {...(s.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className={`grid h-10 w-10 place-items-center border border-bone/25 text-bone transition hover:border-gold hover:bg-gold hover:text-black motion-reduce:transition-none ${FOCUS}`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="h-[18px] w-[18px]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {s.icon}
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>

              <a
                href={`${import.meta.env.BASE_URL}${CV_FILE}`}
                download={CV_FILE}
                className={`inline-flex bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-bone motion-reduce:transition-none ${FOCUS}`}
              >
                Download CV
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
