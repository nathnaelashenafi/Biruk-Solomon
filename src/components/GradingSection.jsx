import { useRef, useState } from "react";
import Reveal from "./work/Reveal";
import { asset } from "../lib/media";

// ─────────────────────────────────────────────────────────────
// COLOR GRADING MEDIA
// Put two stills of the SAME frame in /public/grading/ and fill these in.
//   original : the ungraded frame (what the camera recorded)
//   graded   : the same frame after grading
// Both must have the same framing and ratio (16:9, about 1600×900 WebP).
// While either src is null, a plain placeholder is shown instead.
// ─────────────────────────────────────────────────────────────
const GRADING = {
  original: { src: null, alt: "The original, ungraded frame" }, // e.g. "grading/original.webp"
  graded: { src: null, alt: "The same frame after color grading" }, // e.g. "grading/graded.webp"
};

const POINTS = [
  {
    label: "Mood",
    text: "Color and tone set the feeling of a scene before anything is said.",
  },
  {
    label: "Contrast",
    text: "Balanced highlights and shadows give footage depth and clarity.",
  },
  {
    label: "Consistency",
    text: "Shots are matched to each other so the cut flows from one to the next.",
  },
];

const clamp = (n) => Math.min(100, Math.max(0, n));

function Comparison({ original, graded }) {
  const [pos, setPos] = useState(50);
  const box = useRef(null);
  const dragging = useRef(false);

  const moveTo = (clientX) => {
    const r = box.current.getBoundingClientRect();
    setPos(clamp(((clientX - r.left) / r.width) * 100));
  };

  const onKeyDown = (e) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown")
      setPos((p) => clamp(p - step));
    else if (e.key === "ArrowRight" || e.key === "ArrowUp")
      setPos((p) => clamp(p + step));
    else if (e.key === "Home") setPos(0);
    else if (e.key === "End") setPos(100);
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={box}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        moveTo(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging.current) moveTo(e.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      className="relative aspect-video w-full cursor-ew-resize touch-pan-y select-none overflow-hidden border border-bone/15 bg-[#0d0d0d]"
    >
      <img
        src={asset(graded.src)}
        alt={graded.alt}
        width={1600}
        height={900}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <img
        src={asset(original.src)}
        alt={original.alt}
        width={1600}
        height={900}
        loading="lazy"
        decoding="async"
        draggable={false}
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        className="absolute inset-0 h-full w-full object-cover"
      />

      <span className="pointer-events-none absolute bottom-3 left-3 bg-ink/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-bone">
        Original
      </span>
      <span className="pointer-events-none absolute bottom-3 right-3 bg-gold px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-black">
        Graded
      </span>

      <div className="absolute inset-y-0 w-0" style={{ left: `${pos}%` }}>
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-gold"
        />
        <div
          role="slider"
          tabIndex={0}
          aria-label="Comparison divider. Original on the left, graded on the right."
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          aria-valuetext={`${Math.round(pos)} percent of the frame shows the original`}
          onKeyDown={onKeyDown}
          className="absolute left-0 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center bg-gold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// Shown until real media is supplied. It does not pretend to be a result.
function Placeholder() {
  return (
    <div className="grid aspect-video w-full grid-cols-2 border border-bone/15">
      {["Original", "Graded"].map((label, i) => (
        <div
          key={label}
          className={`relative bg-[#0d0d0d] bg-[repeating-linear-gradient(135deg,rgba(244,241,232,0.05)_0_1px,transparent_1px_10px)] ${
            i === 0 ? "border-r border-bone/15" : ""
          }`}
        >
          <span className="absolute bottom-3 left-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-bone/50">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function GradingSection() {
  const hasMedia = GRADING.original.src && GRADING.graded.src;

  return (
    <section
      id="grading"
      aria-labelledby="grading-heading"
      className="relative bg-ink px-[5vw] py-16 font-sans text-bone sm:py-20 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-gold/0 via-gold/50 to-gold/0" />

      <Reveal className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
        <div className="lg:col-span-4">
          <h2
            id="grading-heading"
            className="font-display text-[length:clamp(38px,5vw,72px)] uppercase leading-[0.95]"
          >
            The same frame,{" "}
            <span className="text-transparent [-webkit-text-stroke:1.5px_#F4F1E8]">
              graded.
            </span>
          </h2>
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-bone/70">
            Grading changes how footage feels. It shapes mood, contrast, and
            tone, and keeps a video looking like one piece from the first shot
            to the last.
          </p>

          <dl className="mt-8 max-w-sm divide-y divide-bone/15 border-y border-bone/15">
            {POINTS.map((p) => (
              <div key={p.label} className="grid gap-1 py-4">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">
                  {p.label}
                </dt>
                <dd className="text-sm leading-relaxed text-bone/70">
                  {p.text}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:col-span-8">
          {hasMedia ? (
            <>
              <Comparison original={GRADING.original} graded={GRADING.graded} />
              <p className="mt-3 text-xs text-bone/50">
                Drag the divider, or focus it and use the arrow keys.
              </p>
            </>
          ) : (
            <>
              <Placeholder />
              <p className="mt-3 text-xs text-bone/50">
                Before and after stills will appear here.
              </p>
            </>
          )}
        </div>
      </Reveal>
    </section>
  );
}
