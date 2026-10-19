const APPS = ["CapCut", "Adobe Premiere Pro", "Photoshop", "Canva"];
const HAZARD =
  "h-1.5 bg-[repeating-linear-gradient(135deg,#000_0_10px,transparent_10px_20px)]";

function Strip({ className = "", reverse = false }) {
  const row = Array.from({ length: 4 }).flatMap(() => APPS);
  return (
    <div
      className={`overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.6)] ${className}`}
    >
      <div className={HAZARD} />
      <div
        className={`flex w-max animate-tape ${reverse ? "[animation-direction:reverse]" : ""}`}
      >
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0 items-center">
            {row.map((app, i) => (
              <span
                key={i}
                className="flex items-center gap-8 whitespace-nowrap px-8 py-3 font-display text-2xl uppercase tracking-wider"
              >
                {app}
                <span className="text-xl">✕</span>
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
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-36">
      <Strip
        reverse
        className="absolute -left-[5%] bottom-10 w-[110%] -rotate-2 bg-bone text-black opacity-90"
      />
      <Strip className="absolute -left-[5%] bottom-4 w-[110%] rotate-[1.5deg] bg-gold text-black" />
    </div>
  );
}
