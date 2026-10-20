import Reveal from "./work/Reveal";
import { FOCUS, pad } from "./work/ui";
import { asset } from "../lib/media";

// ─────────────────────────────────────────────────────────────
// SERVICES DATA
// image : file in /public (e.g. "services/videography.webp") or an https URL.
//         Leave null to keep the built-in artwork. 1600×900 WebP works best.
// Capabilities are described as things a project CAN include, not guarantees.
// ─────────────────────────────────────────────────────────────
const SERVICES = [
  {
    id: "editing",
    title: "Video Editing",
    tag: "Sequence",
    art: "timeline",
    description:
      "Shaping raw footage into focused, compelling stories through rhythm, pacing, and precise editing.",
    capabilities: [
      "Storytelling and narrative structure",
      "Footage selection and assembly",
      "Editing rhythm and pacing",
      "Transitions and visual continuity",
      "Revisions and final delivery",
    ],
    image: null,
    imageAlt: "",
  },
  {
    id: "grading",
    title: "Color Grading",
    tag: "Tonal range",
    art: "grade",
    description:
      "Creating atmosphere and visual consistency through considered color, contrast, and tone.",
    capabilities: [
      "Developing a visual mood",
      "Refining color and contrast",
      "Consistency between shots",
      "A cohesive visual finish",
    ],
    link: { label: "Explore Color Grading", href: "#grading" },
    image: null,
    imageAlt: "",
  },
  {
    id: "sound",
    title: "Sound Design",
    tag: "Waveform",
    art: "wave",
    description:
      "Building a richer viewing experience through thoughtful sound, atmosphere, and audio detail.",
    capabilities: [
      "Sound effects and ambience",
      "Audio layering",
      "Sound selection and synchronization",
      "Supporting the emotional rhythm of a scene",
      "Audio refinement for the final edit",
    ],
    image: null,
    imageAlt: "",
  },
  {
    id: "videography",
    title: "Videography",
    tag: "Viewfinder",
    art: "finder",
    description:
      "Capturing real moments and carefully composed visuals with a clear creative direction.",
    capabilities: [
      "Camera work and visual composition",
      "Capturing footage for a project",
      "Planning shots around a creative concept",
    ],
    image: null,
    imageAlt: "",
  },
  {
    id: "consulting",
    title: "Content Consulting",
    tag: "Storyboard",
    art: "board",
    description:
      "Helping shape the idea, direction, and visual approach behind content before production begins.",
    capabilities: [
      "Developing an initial creative direction",
      "Clarifying the purpose and audience of a video",
      "Planning the visual approach",
      "Shaping ideas into a practical concept",
    ],
    image: null,
    imageAlt: "",
  },
];

/* ───────── built-in artwork (decorative, palette only) ───────── */

function TimelineArt() {
  const tracks = [
    { y: 24, clips: [[8, 34, 1], [44, 22, 0], [68, 40, 0], [110, 36, 1]] },
    { y: 44, clips: [[8, 20, 0], [30, 44, 1], [76, 26, 0], [104, 44, 0]] },
    { y: 64, clips: [[8, 52, 0], [62, 30, 0], [94, 56, 1]] },
  ];
  return (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      {Array.from({ length: 20 }, (_, i) => (
        <line
          key={i}
          x1={8 + i * 8}
          x2={8 + i * 8}
          y1={8}
          y2={i % 5 === 0 ? 16 : 12}
          stroke="#F4F1E8"
          strokeOpacity=".35"
          strokeWidth=".5"
        />
      ))}
      {tracks.map((t) =>
        t.clips.map(([x, w, hot]) => (
          <rect
            key={`${t.y}-${x}`}
            x={x}
            y={t.y}
            width={w}
            height={14}
            fill={hot ? "#F5B700" : "#F4F1E8"}
            fillOpacity={hot ? 1 : 0.16}
          />
        )),
      )}
      <line x1="92" x2="92" y1="6" y2="84" stroke="#F5B700" strokeWidth=".8" />
      <path d="M88 4h8l-4 6z" fill="#F5B700" />
    </svg>
  );
}

function GradeArt() {
  const bands = ["#070707", "#2a2106", "#6b5004", "#b58700", "#F5B700", "#f2dc94", "#F4F1E8"];
  return (
    <>
      <div className="absolute inset-0 flex">
        {bands.map((c) => (
          <div key={c} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full mix-blend-difference"
      >
        <path
          d="M0 92 C 30 90, 45 70, 55 48 S 85 12, 100 8"
          fill="none"
          stroke="#F4F1E8"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </>
  );
}

function WaveArt() {
  const bars = Array.from({ length: 70 }, (_, i) => {
    const v = Math.abs(Math.sin(i * 0.55) * 0.55 + Math.sin(i * 1.7) * 0.3 + Math.sin(i * 0.17) * 0.25);
    return Math.max(0.08, Math.min(1, v));
  });
  return (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <line x1="0" x2="160" y1="45" y2="45" stroke="#F4F1E8" strokeOpacity=".15" strokeWidth=".3" />
      {bars.map((v, i) => {
        const hot = i >= 32 && i <= 44;
        return (
          <rect
            key={i}
            x={4 + i * 2.2}
            y={45 - v * 34}
            width="1.3"
            height={v * 68}
            fill={hot ? "#F5B700" : "#F4F1E8"}
            fillOpacity={hot ? 1 : 0.35}
          />
        );
      })}
    </svg>
  );
}

function FinderArt() {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(245,183,0,0.12),transparent_60%)]">
      {["left-1/3", "left-2/3"].map((p) => (
        <span key={p} className={`absolute inset-y-0 w-px bg-bone/15 ${p}`} />
      ))}
      {["top-1/3", "top-2/3"].map((p) => (
        <span key={p} className={`absolute inset-x-0 h-px bg-bone/15 ${p}`} />
      ))}
      {[
        "left-4 top-4 border-l-2 border-t-2",
        "right-4 top-4 border-r-2 border-t-2",
        "bottom-4 left-4 border-b-2 border-l-2",
        "bottom-4 right-4 border-b-2 border-r-2",
      ].map((c) => (
        <span key={c} className={`absolute h-6 w-6 border-gold ${c}`} />
      ))}
      <span className="absolute left-1/2 top-1/2 h-14 w-20 -translate-x-1/2 -translate-y-1/2 border border-gold/70" />
      <span className="absolute bottom-8 left-8 flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-bone/70">
        <i className="h-2 w-2 rounded-full bg-gold" />
        REC
      </span>
      <span className="absolute bottom-8 right-8 text-[11px] tracking-[0.2em] text-bone/50">
        00:00:00:00
      </span>
    </div>
  );
}

function BoardArt() {
  const frames = [
    <circle key="a" cx="8" cy="4.5" r="2.2" />,
    <path key="b" d="M1 8 L15 1" />,
    <rect key="c" x="3" y="5" width="10" height="3" />,
  ];
  return (
    <div className="absolute inset-0 grid grid-cols-3 content-center gap-3 p-5 sm:gap-5 sm:p-8">
      {frames.map((shape, i) => (
        <div key={i}>
          <div className="relative aspect-video border border-bone/30">
            <svg
              viewBox="0 0 16 9"
              className="h-full w-full"
              fill="none"
              stroke="#F4F1E8"
              strokeOpacity=".6"
              strokeWidth=".35"
            >
              {shape}
            </svg>
            <span className="absolute left-2 top-1 font-display text-sm text-gold">{pad(i + 1)}</span>
          </div>
          <div className="mt-3 space-y-1.5">
            <span className="block h-1 w-4/5 bg-bone/20" />
            <span className="block h-1 w-3/5 bg-bone/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

const ARTS = { timeline: TimelineArt, grade: GradeArt, wave: WaveArt, finder: FinderArt, board: BoardArt };

/* ───────── layout ───────── */

function Visual({ service }) {
  const Art = ARTS[service.art];
  const src = asset(service.image);
  return (
    <div className="relative aspect-video w-full overflow-hidden border border-bone/15 bg-[#0d0d0d]">
      {src ? (
        <img
          src={src}
          alt={service.imageAlt || `${service.title} — visual`}
          width={1600}
          height={900}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0">
          <Art />
        </div>
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-gold"
      >
        {service.tag}
      </span>
    </div>
  );
}

function ServiceRow({ service, index }) {
  const flip = index % 2 === 1;
  return (
    <Reveal>
      <article
        aria-labelledby={`service-${service.id}`}
        className="grid gap-8 border-t border-bone/10 py-14 lg:grid-cols-12 lg:items-center lg:gap-14 lg:py-20"
      >
        <div className={`lg:col-span-5 ${flip ? "lg:order-2" : ""}`}>
          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="font-display text-xl text-gold">
              {pad(index + 1)}
            </span>
            <span aria-hidden="true" className="h-px flex-1 bg-bone/15" />
          </div>
          <h3
            id={`service-${service.id}`}
            className="mt-5 font-display text-[length:clamp(44px,6.4vw,104px)] uppercase leading-[0.9]"
          >
            {service.title}
          </h3>
          <p className="mt-6 max-w-md text-base leading-relaxed text-bone/70">{service.description}</p>
          <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.28em] text-bone/45">
            Can include
          </p>
          <ul className="mt-3 grid gap-2 text-sm text-bone/65">
            {service.capabilities.map((c) => (
              <li key={c} className="flex items-start gap-3">
                <span aria-hidden="true" className="mt-2.5 h-px w-4 shrink-0 bg-gold" />
                {c}
              </li>
            ))}
          </ul>
          {service.link && (
            <a
              href={service.link.href}
              className={`mt-8 inline-flex items-center gap-3 border-b border-gold py-2 text-xs font-semibold uppercase tracking-[0.16em] transition hover:text-gold ${FOCUS}`}
            >
              {service.link.label} <span aria-hidden="true">→</span>
            </a>
          )}
        </div>
        <div className={`lg:col-span-7 ${flip ? "lg:order-1" : ""}`}>
          <Visual service={service} />
        </div>
      </article>
    </Reveal>
  );
}

export default function Services() {
  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="relative bg-ink px-[5vw] pb-24 pt-8 font-sans text-bone sm:pb-32 lg:pb-40"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-gold/0 via-gold/50 to-gold/0" />

      <Reveal className="grid gap-10 pb-16 pt-16 lg:grid-cols-12 lg:items-end lg:pb-24 lg:pt-24">
        <div className="lg:col-span-8">
          <p className="mb-6 flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.3em] text-gold">
            <span className="h-px w-12 bg-gold" />
            Services / 03
          </p>
          <h2
            id="services-heading"
            className="font-display text-[length:clamp(52px,10vw,160px)] uppercase leading-[0.88]"
          >
            <span className="block">More than</span>
            <span className="block text-transparent [-webkit-text-stroke:2px_#F4F1E8]">
              the final cut.
            </span>
          </h2>
        </div>
        <p className="max-w-sm text-base leading-relaxed text-bone/65 lg:col-span-4 lg:pb-3">
          Visual storytelling, post-production, and creative direction, brought together to shape a
          video project from the first idea to the finished film.
        </p>
      </Reveal>

      <div>
        {SERVICES.map((s, i) => (
          <ServiceRow key={s.id} service={s} index={i} />
        ))}
      </div>

      <Reveal className="border-t border-bone/10 pt-16 lg:pt-20">
        <div className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-end">
          <p className="max-w-3xl font-display text-[length:clamp(34px,6vw,96px)] uppercase leading-[0.95]">
            Bring the idea. <span className="text-gold">Shape the story together.</span>
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-x-8 gap-y-4">
            <a
              href="#contact"
              className={`inline-flex bg-gold px-8 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:-translate-y-0.5 hover:bg-bone motion-reduce:hover:translate-y-0 ${FOCUS}`}
            >
              Start a Project
            </a>
            <a
              href="#work"
              className={`border-b border-bone/30 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition hover:border-gold hover:text-gold ${FOCUS}`}
            >
              View Selected Work
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
