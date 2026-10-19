import ReelScene from "./ReelScene";
import TapeMarquee from "./TapeMarquee";

const links = ["Work", "Services", "Showreel", "About"];

export default function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-ink font-sans text-bone">
      {/* glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/15 blur-[120px]" />

      {/* nav */}
      <header className="relative z-40 flex items-center justify-between px-[5vw] py-7">
        <div className="font-display text-xl tracking-[0.14em]">
          BROOK<span className="text-gold">Y</span>
        </div>
        <nav className="hidden gap-10 text-xs uppercase tracking-[0.18em] text-bone/60 md:flex">
          {links.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              className="transition hover:text-gold"
            >
              {l}
            </a>
          ))}
        </nav>
        <a
          href="#contact"
          className="bg-bone px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-gold"
        >
          Let's Talk
        </a>
      </header>

      {/* giant outlined word */}
      <span className="pointer-events-none absolute left-1/2 top-[9%] -translate-x-1/2 select-none font-display text-[clamp(150px,26vw,420px)] leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(245,183,0,0.4)]">
        EDITOR
      </span>

      {/* name */}
      <div className="absolute left-[5vw] top-[36%] z-20">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-gold">
          Video Editor / Videographer
        </p>
        <h1 className="font-display text-[clamp(56px,11vw,170px)] uppercase leading-[0.85] text-white">
          Biruk
        </h1>
      </div>
      <h2 className="absolute right-[5vw] top-[44%] z-20 font-display text-[clamp(56px,11vw,170px)] uppercase leading-[0.85] text-transparent [-webkit-text-stroke:2px_#F4F1E8]">
        Solomon
      </h2>

      {/* centered portrait */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center pb-44 pt-24">
        <div className="relative aspect-[3/4] w-[min(72vw,360px)] border border-gold/80">
          <span className="absolute -left-1 -top-1 h-4 w-4 border-l-2 border-t-2 border-gold" />
          <span className="absolute -right-1 -top-1 h-4 w-4 border-r-2 border-t-2 border-gold" />
          <span className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-gold" />
          <span className="absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-gold" />
          <img
            src="/biruk.png"
            alt="Biruk Solomon"
            className="absolute bottom-0 left-1/2 h-[96%] -translate-x-1/2 object-contain"
          />
        </div>

        <p className="mt-8 max-w-sm text-center text-sm text-bone/60">
          Turning raw footage into stories you can't stop watching.
        </p>
        <div className="mt-5 flex gap-3">
          <a
            href="#showreel"
            className="bg-gold px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:-translate-y-0.5 hover:bg-bone"
          >
            Watch Showreel
          </a>
          <a
            href="#work"
            className="border border-bone/30 px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] transition hover:border-gold hover:text-gold"
          >
            View Work
          </a>
        </div>
      </div>

      {/* 3D reel (replaces the camera) */}
      <div className="pointer-events-none absolute bottom-24 right-0 z-20 h-[45%] w-[55%] md:bottom-28 md:h-[52%] md:w-[38%]">
        <ReelScene />
      </div>

      <TapeMarquee />
    </section>
  );
}
