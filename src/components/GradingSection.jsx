import { useEffect, useState } from "react";
import Reveal from "./work/Reveal";
import VideoModal from "./work/VideoModal";
import { PlayIcon } from "./work/Thumb";
import { FOCUS } from "./work/ui";
import { asset } from "../lib/media";

// ─────────────────────────────────────────────────────────────
// COLOR GRADING
// The two stills live in /public/grading/ (same frame, same crop):
//   ungraded.png  what the camera recorded
//   graded.png    the same frame after grading
// The frame below is 16:9. If the pictures are another shape, change FRAME (e.g. "aspect-[4/5]").
// ─────────────────────────────────────────────────────────────
const IMAGES = {
  ungraded: { src: "grading/ungraded.png", alt: "The frame before color grading" },
  graded: { src: "grading/graded.png", alt: "The same frame after color grading" },
};
const FRAME = "aspect-video";
const SECONDS = 2.5; // how long each picture stays before it changes

// The grading video. It is only loaded when the visitor presses the button.
const VIDEO = {
  id: "grading-video",
  title: "Color grading",
  category: "Color grading",
  orientation: "portrait",
  thumb: "https://i.ytimg.com/vi/tZD2WwSPmzQ/maxresdefault.jpg",
  video: { provider: "youtube", id: "tZD2WwSPmzQ" },
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Two pictures on top of each other that fade back and forth.
// Hover, touch or keyboard focus pauses it. A click lets it carry on.
function Blink() {
  const [graded, setGraded] = useState(false);
  const [held, setHeld] = useState(false); // pointer or focus is on it
  const [carryOn, setCarryOn] = useState(false); // clicked while held: keep playing
  const [broken, setBroken] = useState(false);
  const [still] = useState(prefersReducedMotion); // reduced motion: no automatic changes

  const running = !still && (!held || carryOn);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setGraded((g) => !g), SECONDS * 1000);
    return () => clearInterval(id);
  }, [running]);

  const hold = () => {
    setHeld(true);
    setCarryOn(false);
  };
  const release = () => {
    setHeld(false);
    setCarryOn(false);
  };
  const press = () => (still ? setGraded((g) => !g) : setCarryOn(true));

  if (broken) {
    return (
      <div className={`grid ${FRAME} w-full place-items-center border border-bone/15 bg-[#0d0d0d] p-6 text-center text-sm text-bone/60`}>
        Add ungraded.png and graded.png to public/grading
      </div>
    );
  }

  const layer = "absolute inset-0 h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none";
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={
        still
          ? "Color grading comparison. Press to switch between the ungraded and graded picture."
          : "Color grading comparison, switching between the ungraded and graded picture. It pauses while you hover or focus it. Press to let it continue."
      }
      onPointerEnter={hold}
      onPointerLeave={release}
      onFocus={hold}
      onBlur={release}
      onClick={press}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          press();
        }
      }}
      className={`relative w-full cursor-pointer select-none overflow-hidden border border-bone/15 bg-[#0d0d0d] ${FRAME} focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold`}
    >
      <img src={asset(IMAGES.ungraded.src)} alt={IMAGES.ungraded.alt} loading="lazy" decoding="async" draggable={false} onError={() => setBroken(true)} className={`${layer} ${graded ? "opacity-0" : "opacity-100"}`} />
      <img src={asset(IMAGES.graded.src)} alt={IMAGES.graded.alt} loading="lazy" decoding="async" draggable={false} onError={() => setBroken(true)} className={`${layer} ${graded ? "opacity-100" : "opacity-0"}`} />

      <span
        aria-hidden="true"
        className={`absolute bottom-4 left-4 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] ${
          graded ? "bg-gold text-black" : "bg-ink/85 text-bone"
        }`}
      >
        {graded ? "Graded" : "Ungraded"}
      </span>
      {held && !carryOn && !still && (
        <span aria-hidden="true" className="absolute bottom-4 right-4 bg-ink/85 px-3 py-1.5 text-[11px] font-medium text-bone/80">
          Paused. Click to continue.
        </span>
      )}
    </div>
  );
}

export default function GradingSection() {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <section
      id="grading"
      aria-labelledby="grading-heading"
      className="relative bg-ink px-[5vw] py-16 font-sans text-bone sm:py-20 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-gold/0 via-gold/50 to-gold/0" />

      <Reveal className="mx-auto max-w-5xl">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">Color Grading / 04</p>
        <h2 id="grading-heading" className="font-display text-[length:clamp(38px,5.5vw,80px)] uppercase leading-[0.95]">
          The same frame,{" "}
          <span className="text-transparent [-webkit-text-stroke:1.5px_#F4F1E8]">graded.</span>
        </h2>
        <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-bone/70">
          Grading changes how footage feels. It shapes mood, contrast, and tone, and keeps a video looking like one
          piece from the first shot to the last.
        </p>

        <div className="mt-10">
          <Blink />
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setVideoOpen(true)}
            className={`inline-flex items-center gap-3 bg-gold px-7 py-4 text-sm font-semibold text-black transition hover:bg-bone ${FOCUS}`}
          >
            <PlayIcon className="h-4 w-4" />
            Watch the grading video
          </button>
        </div>
      </Reveal>

      <VideoModal
        project={videoOpen ? VIDEO : null}
        index={0}
        total={1}
        autoplay
        onClose={() => setVideoOpen(false)}
      />
    </section>
  );
}
