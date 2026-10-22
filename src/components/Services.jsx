import Reveal from "./work/Reveal";
import { pad } from "./work/ui";
import { asset } from "../lib/media";

// ─────────────────────────────────────────────────────────────
// SERVICES DATA
// image : optional. File in /public (e.g. "services/videography.webp") or an https URL.
//         Use a portrait photo (about 900×1200). When set, the photo replaces the
//         built-in artwork. Leave null to keep the artwork (no empty space either way).
// art   : which built-in artwork to show when there is no image.
// ─────────────────────────────────────────────────────────────
const SERVICES = [
  {
    id: "editing",
    title: "Video Editing",
    description:
      "Shaping raw footage into focused, compelling stories through rhythm, pacing, and precise editing.",
    art: "timeline",
    image: null,
    imageAlt: "",
  },
  {
    id: "grading",
    title: "Color Grading",
    description:
      "Creating atmosphere and visual consistency through considered color, contrast, and tone.",
    art: "wheel",
    image: null,
    imageAlt: "",
  },
  {
    id: "sound",
    title: "Sound Design",
    description:
      "Building a richer viewing experience through thoughtful sound, atmosphere, and audio detail.",
    art: "wave",
    image: null,
    imageAlt: "",
  },
  {
    id: "videography",
    title: "Videography",
    description:
      "Capturing real moments and carefully composed visuals with a clear creative direction.",
    art: "viewfinder",
    image: null,
    imageAlt: "",
  },
  {
    id: "consulting",
    title: "Content Consulting",
    description:
      "Helping shape the idea, direction, and visual approach behind content before production begins.",
    art: "storyboard",
    image: null,
    imageAlt: "",
  },
];

// ─────────────────────────────────────────────────────────────
// ARTWORK: simple line illustrations that fill the middle of each card.
// They use currentColor, so the card controls the color (bone → gold on hover).
// ─────────────────────────────────────────────────────────────
const G = "#F5B700";

function Timeline() {
  // [x, width] clips per track
  const tracks = [
    [
      [8, 52],
      [66, 34],
      [106, 62],
      [174, 18],
    ],
    [
      [8, 24],
      [38, 70],
      [114, 40],
      [160, 32],
    ],
    [
      [20, 60],
      [86, 28],
      [120, 72],
    ],
  ];
  return (
    <>
      {tracks.map((clips, t) =>
        clips.map(([x, w], i) => (
          <rect
            key={`${t}-${i}`}
            x={x}
            y={26 + t * 34}
            width={w}
            height={24}
            fill="currentColor"
            fillOpacity={0.08}
            stroke="currentColor"
            strokeOpacity={0.5}
          />
        )),
      )}
      <line
        x1="8"
        y1="14"
        x2="192"
        y2="14"
        stroke="currentColor"
        strokeOpacity="0.4"
      />
      {[8, 38, 68, 98, 128, 158, 188].map((x) => (
        <line
          key={x}
          x1={x}
          y1="10"
          x2={x}
          y2="14"
          stroke="currentColor"
          strokeOpacity="0.4"
        />
      ))}
      <line x1="104" y1="6" x2="104" y2="134" stroke={G} strokeWidth="1.5" />
      <path d="M98 2h12l-6 9z" fill={G} />
    </>
  );
}

function Wheel() {
  return (
    <>
      <defs>
        <linearGradient id="svc-tone" x1="0" x2="1">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.6" stopColor="#F4F1E8" />
          <stop offset="1" stopColor={G} />
        </linearGradient>
      </defs>
      <circle
        cx="100"
        cy="58"
        r="46"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.5"
      />
      <circle
        cx="100"
        cy="58"
        r="32"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.3"
      />
      <circle
        cx="100"
        cy="58"
        r="18"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.2"
      />
      <line
        x1="54"
        y1="58"
        x2="146"
        y2="58"
        stroke="currentColor"
        strokeOpacity="0.25"
      />
      <line
        x1="100"
        y1="12"
        x2="100"
        y2="104"
        stroke="currentColor"
        strokeOpacity="0.25"
      />
      <circle cx="119" cy="42" r="6" fill={G} />
      <rect x="14" y="120" width="172" height="10" fill="url(#svc-tone)" />
      <rect
        x="14"
        y="120"
        width="172"
        height="10"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.4"
      />
      <path d="M126 114l4 6h-8z" fill={G} />
    </>
  );
}

function Wave() {
  const h = [
    14, 30, 52, 22, 64, 40, 76, 34, 58, 20, 46, 70, 28, 54, 18, 38, 62, 24, 44,
    16,
  ];
  return (
    <>
      {h.map((v, i) => (
        <rect
          key={i}
          x={12 + i * 9}
          y={66 - v / 2}
          width="4"
          height={v}
          fill={i === 6 ? G : "currentColor"}
          fillOpacity={i === 6 ? 1 : 0.55}
        />
      ))}
      <line
        x1="8"
        y1="66"
        x2="192"
        y2="66"
        stroke="currentColor"
        strokeOpacity="0.25"
      />
      <line
        x1="75"
        y1="6"
        x2="75"
        y2="126"
        stroke={G}
        strokeWidth="1"
        strokeDasharray="3 3"
      />
    </>
  );
}

function Viewfinder() {
  const c = 18;
  const corner = (x, y, dx, dy) => (
    <path
      d={`M${x} ${y + dy * c}V${y}H${x + dx * c}`}
      fill="none"
      stroke="currentColor"
      strokeOpacity="0.8"
      strokeWidth="2"
    />
  );
  return (
    <>
      {corner(14, 8, 1, 1)}
      {corner(186, 8, -1, 1)}
      {corner(14, 124, 1, -1)}
      {corner(186, 124, -1, -1)}
      {[72, 128].map((x) => (
        <line
          key={x}
          x1={x}
          y1="8"
          x2={x}
          y2="124"
          stroke="currentColor"
          strokeOpacity="0.15"
        />
      ))}
      {[52, 80].map((y) => (
        <line
          key={y}
          x1="14"
          y1={y}
          x2="186"
          y2={y}
          stroke="currentColor"
          strokeOpacity="0.15"
        />
      ))}
      <rect
        x="82"
        y="46"
        width="36"
        height="40"
        fill="none"
        stroke={G}
        strokeWidth="1.5"
      />
      <line x1="100" y1="60" x2="100" y2="72" stroke={G} />
      <line x1="94" y1="66" x2="106" y2="66" stroke={G} />
      <circle cx="30" cy="22" r="3.5" fill={G} />
      <rect
        x="40"
        y="19"
        width="22"
        height="6"
        fill="currentColor"
        fillOpacity="0.5"
      />
    </>
  );
}

function Storyboard() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect
            x={10 + i * 62}
            y="22"
            width="52"
            height="38"
            fill="currentColor"
            fillOpacity="0.06"
            stroke="currentColor"
            strokeOpacity="0.55"
          />
          <line
            x1={14 + i * 62}
            y1="68"
            x2={46 + i * 62}
            y2="68"
            stroke="currentColor"
            strokeOpacity="0.4"
          />
          <line
            x1={14 + i * 62}
            y1="75"
            x2={34 + i * 62}
            y2="75"
            stroke="currentColor"
            strokeOpacity="0.25"
          />
        </g>
      ))}
      <path
        d="M16 54l12-16 10 10 8-6 10 12z"
        fill="currentColor"
        fillOpacity="0.25"
      />
      <circle
        cx="140"
        cy="36"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.6"
      />
      <path
        d="M72 46q12-18 24 0t24 0"
        fill="none"
        stroke={G}
        strokeWidth="1.5"
      />
      <path d="M60 41h0M122 41h0" stroke={G} />
      <path
        d="M10 104h180"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeDasharray="4 4"
      />
      <path d="M10 104h60" stroke={G} strokeWidth="2" />
      <circle cx="70" cy="104" r="4" fill={G} />
    </>
  );
}

const ART = {
  timeline: Timeline,
  wheel: Wheel,
  wave: Wave,
  viewfinder: Viewfinder,
  storyboard: Storyboard,
};

function Artwork({ name }) {
  const Art = ART[name];
  if (!Art) return null;
  return (
    <svg
      viewBox="0 0 200 136"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full max-h-[11rem] text-bone/70 transition-colors duration-300 group-hover:text-gold motion-reduce:transition-none"
    >
      <Art />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// CARD
// ─────────────────────────────────────────────────────────────
function ServiceCard({ service, index }) {
  const src = asset(service.image);

  return (
    <li
      className="
        w-[78%] shrink-0 snap-start
        sm:w-[46%] md:w-[32%] lg:w-[24%]
        xl:w-auto
      "
    >
      <article
        aria-labelledby={`service-${service.id}`}
        className="group relative flex aspect-[3/4] min-h-[24rem] flex-col overflow-hidden border border-bone/15 bg-[#0d0d0d] p-5 transition-colors duration-300 hover:border-gold/60 motion-reduce:transition-none sm:p-6 xl:min-h-0"
      >
        {/* soft gold glow so the card never reads as flat black */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(245,183,0,0.10),transparent_62%)]"
        />

        {src && (
          <>
            <img
              src={src}
              alt={service.imageAlt || service.title}
              width={900}
              height={1200}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            <span className="absolute inset-0 bg-linear-to-t from-ink via-ink/70 to-transparent" />
          </>
        )}

        {/* number */}
        <span
          aria-hidden="true"
          className={`relative font-display leading-none ${
            src
              ? "text-xl text-gold"
              : "text-5xl text-transparent [-webkit-text-stroke:1px_rgba(244,241,232,0.35)] sm:text-6xl"
          }`}
        >
          {pad(index + 1)}
        </span>

        {/* artwork fills the middle (hidden when a photo is used) */}
        <div className="relative my-4 flex min-h-0 flex-1 items-center justify-center">
          {!src && <Artwork name={service.art} />}
        </div>

        {/* text */}
        <div className="relative">
          <span className="mb-4 block h-px w-10 bg-gold" aria-hidden="true" />
          <h3
            id={`service-${service.id}`}
            className="font-display text-[length:clamp(24px,2.4vw,30px)] uppercase leading-none"
          >
            {service.title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-bone/70">
            {service.description}
          </p>
        </div>
      </article>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION
// ─────────────────────────────────────────────────────────────
export default function Services() {
  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="relative bg-ink px-[5vw] py-16 font-sans text-bone sm:py-20 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-gold/0 via-gold/50 to-gold/0" />

      <Reveal>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">
              Services / 03
            </p>
            <h2
              id="services-heading"
              className="font-display text-[length:clamp(36px,6vw,80px)] uppercase leading-none"
            >
              Services
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-bone/65 sm:text-base">
            From the first idea to the final export, everything your film needs
            under one roof.
          </p>
        </div>

        <ul
          tabIndex={0}
          aria-label="Services, scroll sideways for more"
          className="-mx-[5vw] mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-[5vw] px-[5vw] pb-3 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold xl:mx-0 xl:grid xl:grid-cols-5 xl:gap-5 xl:overflow-visible xl:px-0 xl:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {SERVICES.map((s, i) => (
            <ServiceCard key={s.id} service={s} index={i} />
          ))}
        </ul>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-bone/45 xl:hidden">
          Swipe to see all {SERVICES.length}
        </p>
      </Reveal>
    </section>
  );
}
