import { lazy, Suspense, useEffect, useState } from "react";
import TapeMarquee from "./TapeMarquee";

const ReelScene = lazy(() => import("./ReelScene"));

const links = ["Work", "Services", "Grading", "About"];

function canUse3D() {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return false;
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export default function Hero() {
  const [show3D] = useState(canUse3D);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative flex h-svh flex-col overflow-hidden bg-ink font-sans text-bone">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(245,183,0,0.16),transparent_55%)]" />

      {/* nav */}
      <header className="relative z-40 flex shrink-0 items-center justify-between px-[5vw] py-4 sm:py-6">
        <div className="font-display text-lg tracking-[0.14em] sm:text-xl">
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
          className="bg-bone px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-gold sm:px-5 sm:py-2.5 sm:text-xs"
        >
          Let's Talk
        </a>
      </header>

      {/* giant outlined word */}
      <span className="pointer-events-none absolute left-1/2 top-[12%] z-0 -translate-x-1/2 select-none font-display text-[length:min(30vw,34svh)] leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(245,183,0,0.4)] lg:top-[7%] lg:text-[length:min(26vw,38svh)]">
        EDITOR
      </span>

      {/* name: sits at the TOP on phones/tablets, split left/right on desktop */}
      <div className="pointer-events-none relative z-20 flex shrink-0 flex-col items-center px-[5vw] pt-1 text-center lg:absolute lg:inset-x-[5vw] lg:top-[32%] lg:flex-row lg:items-start lg:justify-between lg:p-0 lg:text-left">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-gold sm:text-sm">
            Video Editor / Videographer
          </p>
          <h1 className="font-display text-[length:min(18vw,10svh)] uppercase leading-[0.85] text-white lg:text-[length:min(10vw,15svh)]">
            Biruk
          </h1>
        </div>
        <h2 className="font-display text-[length:min(18vw,10svh)] uppercase leading-[0.85] text-transparent [-webkit-text-stroke:2px_#F4F1E8] lg:mt-[9svh] lg:text-[length:min(10vw,15svh)]">
          Solomon
        </h2>
      </div>

      {/* portrait fills the free space; always large, never scrolls */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center pb-3 pt-3 sm:pb-4">
        <div className="flex min-h-0 w-full flex-1 justify-center">
          <div className="relative aspect-[9/16] h-full max-h-[620px] max-w-[78vw] border border-gold/80">
            <span className="absolute -left-1 -top-1 h-4 w-4 border-l-2 border-t-2 border-gold" />
            <span className="absolute -right-1 -top-1 h-4 w-4 border-r-2 border-t-2 border-gold" />
            <span className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-gold" />
            <span className="absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-gold" />
            <img
              src={`${import.meta.env.BASE_URL}biruk.png`}
              alt="Biruk Solomon"
              decoding="async"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover object-top"
            />

            {/* 3D reel: bottom-right corner of the photo */}
            {show3D && ready && (
              <div className="pointer-events-none absolute -bottom-3 -right-4 z-20 h-24 w-24 sm:-bottom-4 sm:-right-7 sm:h-28 sm:w-28 lg:-bottom-5 lg:-right-10 lg:h-36 lg:w-36">
                <Suspense fallback={null}>
                  <ReelScene />
                </Suspense>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 hidden max-w-sm shrink-0 px-6 text-center text-sm text-bone/60 [@media(min-height:740px)]:block">
          Turning raw footage into stories you can't stop watching.
        </p>
        <div className="mt-7 flex shrink-0 flex-wrap justify-center gap-3 px-4 [@media(min-height:740px)]:mt-5">
          <a
            href="#grading"
            className="bg-gold px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-black transition hover:-translate-y-0.5 hover:bg-bone sm:px-7 sm:py-3.5 sm:text-xs"
          >
            Color Gradings
          </a>
          <a
            href="#work"
            className="border border-bone/30 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] transition hover:border-gold hover:text-gold sm:px-7 sm:py-3.5 sm:text-xs"
          >
            View Work
          </a>
        </div>
      </main>

      <TapeMarquee />
    </section>
  );
}
