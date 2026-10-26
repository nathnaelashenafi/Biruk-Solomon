const APPS = [
  "Premiere Pro",
  "After Effects",
  "DaVinci Resolve",
  "Photoshop",
  "CapCut",
  "Canva",
];

// Sprocket hole: dark punched cut-out with a lit lower lip and a shadowed upper edge.
// One hole every 24px; cell widths are multiples of 24 so the loop is seamless.
const HOLES = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='16'%3E%3Crect x='5' y='3.7' width='14' height='10' rx='3' fill='%23ffe9a0' fill-opacity='.5'/%3E%3Crect x='5' y='3' width='14' height='10' rx='3' fill='%230a0705'/%3E%3Crect x='5' y='3' width='14' height='3.5' rx='3' fill='%23000' fill-opacity='.55'/%3E%3C/svg%3E\")",
  backgroundRepeat: "repeat-x",
  backgroundSize: "24px 16px",
};

// Fine grain over a polished gold base: bright top lip, warm middle, darker lower lip.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 .85 0 0 0 0 .5 0 0 0 .5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.22'/%3E%3C/svg%3E\")";

const goldSurface = (a, b, c, d) => ({
  backgroundImage: [
    GRAIN,
    `linear-gradient(180deg, ${a} 0%, ${b} 22%, ${c} 55%, ${d} 100%)`,
  ].join(", "),
  backgroundSize: "140px 140px, auto",
  boxShadow:
    "inset 0 1px 0 rgba(255,244,200,0.7), inset 0 -1px 0 rgba(70,40,5,0.8), 0 8px 14px rgba(0,0,0,0.6)",
});

// The picture frame: dark glass with a soft reflection and a vignette.
const GLASS = {
  backgroundImage: [
    "linear-gradient(115deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.07) 28%, transparent 29%)",
    "radial-gradient(ellipse at 50% 40%, #3a3a3a 0%, #1c1c1c 55%, #0b0b0b 100%)",
  ].join(", "),
  boxShadow:
    "inset 0 2px 4px rgba(0,0,0,0.85), inset 0 0 14px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,220,150,0.14)",
};

// The gold bar between two frames.
const DIVIDER = {
  backgroundImage:
    "linear-gradient(90deg, #7a4f12 0%, #e6b24a 35%, #f7de92 55%, #9a6a1c 100%)",
  boxShadow:
    "inset 0 1px 0 rgba(255,244,200,0.6), inset 0 -1px 0 rgba(70,40,5,0.7)",
};

// Fixed light sweep plus edge shading: the film slides underneath, like polished film.
const SHEEN = {
  backgroundImage: [
    "linear-gradient(100deg, transparent 25%, rgba(255,246,210,0.28) 42%, rgba(255,246,210,0.06) 52%, transparent 66%)",
    "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.38) 100%)",
  ].join(", "),
};

// The outer div carries the position classes from the caller.
// The inner div is the film itself, so the two never fight over `position`.
function Strip({
  className = "",
  textClass = "text-bone",
  reverse = false,
  surface,
  offset = 0,
}) {
  const row = Array.from({ length: 3 }).flatMap(() => APPS);
  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-[2px]" style={surface}>
        <div
          className={`flex w-max animate-tape will-change-transform motion-reduce:animate-none ${
            reverse ? "[animation-direction:reverse]" : ""
          }`}
        >
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-stretch">
              {row.map((app, i) => (
                <div key={i} className="w-[240px] shrink-0 sm:w-[288px]">
                  <div className="h-4" style={HOLES} />
                  <div className="flex h-10 sm:h-12">
                    <div
                      className="relative flex flex-1 items-center justify-center overflow-hidden"
                      style={GLASS}
                    >
                      {/* one faint scratch per frame, same in both halves so the loop stays seamless */}
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 w-px bg-white/10"
                        style={{ left: `${((i * 37) % 70) + 12}%` }}
                      />
                      <span
                        className={`whitespace-nowrap font-display text-2xl leading-none uppercase tracking-[0.14em] [text-shadow:0_1px_0_rgba(0,0,0,0.9),0_0_8px_rgba(240,190,90,0.25)] sm:text-[32px] ${textClass}`}
                      >
                        {app}
                      </span>
                      <span className="absolute bottom-[3px] right-2 flex items-center text-[8px] font-semibold leading-none tracking-wider text-[#e0b25a]/60">
                        <i className="mr-1 block h-0 w-0 border-y-[3px] border-l-[5px] border-y-transparent border-l-[#e0b25a]/60" />
                        {offset + i + 1}
                      </span>
                    </div>
                    <div className="w-1.5 shrink-0" style={DIVIDER} />
                  </div>
                  <div className="h-4" style={HOLES} />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0" style={SHEEN} />
      </div>
    </div>
  );
}

export default function TapeMarquee() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative z-30 h-[160px] w-full shrink-0 sm:h-[190px]"
    >
      <Strip
        reverse
        surface={goldSurface("#f8dc86", "#e2ab42", "#b98228", "#7e5214")}
        className="absolute -left-[5%] bottom-[78px] w-[110%] -rotate-[1deg] sm:bottom-[98px]"
      />
      <Strip
        textClass="text-gold"
        offset={20}
        surface={goldSurface("#f0cf78", "#d99f3a", "#a97620", "#6f4610")}
        className="absolute -left-[5%] bottom-3 w-[110%] rotate-[0.8deg] sm:bottom-6"
      />
    </div>
  );
}
