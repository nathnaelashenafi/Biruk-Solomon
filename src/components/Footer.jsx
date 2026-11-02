import { FOCUS } from "./work/ui";
import { SUBJECTS } from "../lib/validation";

const LINKS = [
  ["Work", "#work"],
  ["Services", "#services"],
  ["Grading", "#grading"],
  ["About", "#about"],
  ["Contact", "#contact"],
];
const SOCIALS = [
  ["Instagram", "https://www.instagram.com/brooky9teen7/"],
  ["LinkedIn", "https://www.linkedin.com/in/biruk-solomon-67188b333/"],
  ["YouTube", "https://www.youtube.com/channel/UCJ0uVZZdifb1xe1RjWQ_8ew"],
  ["Telegram", "https://t.me/barkey97"],
];
const SERVICES = SUBJECTS.filter((s) => s !== "Something else");

const link = `text-sm text-bone/65 transition hover:text-gold ${FOCUS}`;
const heading = "mb-5 font-display text-lg uppercase tracking-wide";

const toTop = () =>
  window.scrollTo({
    top: 0,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });

export default function Footer() {
  return (
    <footer className="border-t border-bone/10 bg-[#050505] px-[5vw] pt-14 font-sans text-bone">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <p className="font-display text-2xl tracking-[0.14em]">
            BROOK<span className="text-gold">Y</span>
          </p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-bone/65">
            Biruk Solomon, video editor and videographer based in Addis Ababa,
            Ethiopia.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className={heading}>Quick links</h2>
          <ul className="grid gap-3">
            <li>
              <button type="button" onClick={toTop} className={link}>
                Home
              </button>
            </li>
            {LINKS.map(([label, href]) => (
              <li key={label}>
                <a href={href} className={link}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className={heading}>Services</h2>
          <ul className="grid gap-3">
            {SERVICES.map((s) => (
              <li key={s} className="text-sm text-bone/65">
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className={heading}>Get in touch</h2>
          <ul className="grid gap-3">
            <li>
              <a href="mailto:biruksolomon701@gmail.com" className={link}>
                biruksolomon701@gmail.com
              </a>
            </li>
            <li className="text-sm text-bone/65">Addis Ababa, Ethiopia</li>
          </ul>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
            {SOCIALS.map(([label, href]) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${link} border-b border-bone/20 hover:border-gold`}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-bone/10 py-6">
        <p className="text-xs text-bone/50">
          &copy; {new Date().getFullYear()} Biruk Solomon. All rights reserved.
        </p>
        <button
          type="button"
          onClick={toTop}
          className={`text-[11px] font-semibold uppercase tracking-[0.2em] text-bone/65 transition hover:text-gold ${FOCUS}`}
        >
          Back to top
        </button>
      </div>
    </footer>
  );
}
