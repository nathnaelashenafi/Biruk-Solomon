import { companies } from "../data/companies";
import { asset } from "../lib/media";
import { FOCUS } from "./work/ui";

const MIN_FOR_MARQUEE = 6;
const MASK = "[-webkit-mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]";

function Card({ company, copy = false }) {
  const link = typeof company.href === "string" && /^https:\/\//.test(company.href);
  const dark = company.tone === "dark";
  const logo = asset(company.logo);
  const face = `grid h-24 w-44 place-items-center px-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition duration-300 sm:w-48 ${
    dark ? "bg-[#161616] text-bone" : "bg-bone text-ink"
  }`;
  const inner = logo ? (
    <img src={logo} alt={company.name} loading="lazy" decoding="async" className="max-h-16 w-auto max-w-[140px] object-contain" />
  ) : (
    <span className="text-center font-display text-xl uppercase leading-tight">{company.name}</span>
  );

  return (
    // The repeated copy only exists to make the loop seamless, so it is hidden from keyboards and screen readers.
    <li inert={copy} aria-hidden={copy || undefined} className={`mr-4 shrink-0 ${copy ? "motion-reduce:hidden" : ""}`}>
      {link ? (
        <a
          href={company.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${company.name}: see Biruk's work (opens in a new tab)`}
          className={`${face} hover:-translate-y-1 hover:shadow-[0_0_0_2px_#F5B700,0_16px_36px_rgba(0,0,0,0.5)] ${FOCUS}`}
        >
          {inner}
        </a>
      ) : (
        <div className={face}>{inner}</div>
      )}
    </li>
  );
}

function Row({ items, reverse, seconds }) {
  const half = Array.from({ length: Math.ceil(14 / items.length) }).flatMap(() => items);
  return (
    <div className={`overflow-hidden py-3 motion-reduce:overflow-x-auto ${MASK}`}>
      <ul
        style={{ animationDuration: `${seconds}s` }}
        className={`flex w-max animate-tape will-change-transform hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] motion-reduce:animate-none ${
          reverse ? "[animation-direction:reverse]" : ""
        }`}
      >
        {[false, true].map((copy) => half.map((c, i) => <Card key={`${copy}-${i}`} company={c} copy={copy} />))}
      </ul>
    </div>
  );
}

// `items` defaults to src/data/companies.js
export default function Companies({ items = companies }) {
  const list = items.filter((c) => c && c.name);
  if (list.length === 0) return null;
  const marquee = list.length >= MIN_FOR_MARQUEE;

  return (
    <section
      id="clients"
      aria-labelledby="clients-heading"
      className="relative overflow-hidden bg-ink py-16 font-sans text-bone sm:py-20 lg:py-24"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-gold/0 via-gold/50 to-gold/0" />

      <div className="px-[5vw] text-center">
        <p className="inline-block rounded-full bg-gold/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
          Clients
        </p>
        <h2 id="clients-heading" className="mt-5 font-display text-[length:clamp(34px,5vw,68px)] uppercase leading-[0.98]">
          Companies I&apos;ve <span className="text-transparent [-webkit-text-stroke:1.5px_#F4F1E8]">worked with.</span>
        </h2>
      </div>

      <div className="mt-12">
        {marquee ? (
          <>
            <Row items={list.filter((_, i) => i % 2 === 0)} seconds={60} />
            <Row items={list.filter((_, i) => i % 2 === 1)} reverse seconds={70} />
          </>
        ) : (
          <ul className="mx-auto flex max-w-4xl flex-wrap justify-center px-[5vw]">
            {list.map((c) => (
              <Card key={c.name} company={c} />
            ))}
          </ul>
        )}
      </div>

      <div className="mt-10 text-center">
        <a href="#work" className={`inline-flex items-center gap-3 text-sm font-medium transition hover:text-gold ${FOCUS}`}>
          See my work
          <span aria-hidden="true" className="grid h-7 w-7 place-items-center bg-gold text-black">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </a>
      </div>
    </section>
  );
}
