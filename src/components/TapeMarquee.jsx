const APPS = [
  "Adobe Premiere Pro",
  "After Effects",
  "DaVinci Resolve",
  "Photoshop",
  "CapCut",
  "Canva",
];

// Sprocket hole pattern: one hole every 24px. Frame widths below are
// multiples of 24, so the holes line up perfectly when the strip loops.
const HOLES = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='12'%3E%3Crect x='6' y='2' width='12' height='8' rx='2.5' fill='%23070707'/%3E%3C/svg%3E\")",
  backgroundRepeat: "repeat-x",
  backgroundSize: "24px 12px",
};

function Strip({ className = "", textClass = "text-bone", reverse = false }) {
  const row = Array.from({ length: 3 }).flatMap(() => APPS);
  return (
    <div className={`overflow-hidden shadow-lg shadow-black/50 ${className}`}>
      <div
        className={`flex w-max animate-tape will-change-transform motion-reduce:animate-none ${
          reverse ? "[animation-direction:reverse]" : ""
        }`}
      >
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0 items-stretch">
            {row.map((app, i) => (
              <div key={i} className="w-[240px] shrink-0 sm:w-[288px]">
                <div className="h-3" style={HOLES} />
                <div
                  className={`mx-2 flex h-7 items-center justify-center whitespace-nowrap border border-[#d9a05a]/25 bg-[#1a0f08] font-display text-lg uppercase tracking-wider sm:h-9 sm:text-[22px] ${textClass}`}
                >
                  {app}
                </div>
                <div className="h-3" style={HOLES} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TapeMarquee() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-28 sm:h-32">
      <Strip
        reverse
        className="absolute -left-[5%] bottom-9 w-[110%] -rotate-2 bg-[#8a5126] sm:bottom-11"
      />
      <Strip
        textClass="text-gold"
        className="absolute -left-[5%] bottom-3 w-[110%] rotate-[1.5deg] bg-[#6b3f1d] sm:bottom-4"
      />
    </div>
  );
}
