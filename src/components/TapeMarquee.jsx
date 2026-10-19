const APPS = ["CapCut", "Adobe Premiere Pro", "Photoshop", "Canva"];
const HAZARD =
  "h-1 sm:h-1.5 bg-[repeating-linear-gradient(135deg,#000_0_10px,transparent_10px_20px)]";

function Strip({ className = "", reverse = false }) {
  const row = Array.from({ length: 4 }).flatMap(() => APPS);
  return (
    <div className={`overflow-hidden shadow-lg shadow-black/50 ${className}`}>
      <div className={HAZARD} />
      <div
        className={`flex w-max animate-tape will-change-transform motion-reduce:animate-none ${
          reverse ? "[animation-direction:reverse]" : ""
        }`}
      >
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0 items-center">
            {row.map((app, i) => (
              <span
                key={i}
                className="flex items-center gap-6 whitespace-nowrap px-5 py-2 font-display text-lg uppercase tracking-wider sm:gap-8 sm:px-8 sm:py-3 sm:text-2xl"
              >
                {app}
                <span className="text-base sm:text-xl">✕</span>
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className={HAZARD} />
    </div>
  );
}

export default function TapeMarquee() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-28 sm:h-32">
      <Strip
        reverse
        className="absolute -left-[5%] bottom-9 w-[110%] -rotate-2 bg-bone text-black opacity-90 sm:bottom-11"
      />
      <Strip className="absolute -left-[5%] bottom-3 w-[110%] rotate-[1.5deg] bg-gold text-black sm:bottom-4" />
    </div>
  );
}
