import { asset } from "../../lib/media";

export function PlayIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`fill-current ${className}`}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

// Small always-visible play marker (no hover needed to find the action).
export function PlayBadge({ large = false }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute bottom-3 right-3 z-10 grid place-items-center bg-gold text-black transition-transform duration-300 group-hover:scale-110 group-focus-visible:scale-110 motion-reduce:transition-none ${
        large ? "h-16 w-16 sm:h-20 sm:w-20" : "h-11 w-11"
      }`}
    >
      <PlayIcon className={large ? "h-6 w-6" : "h-4 w-4"} />
    </span>
  );
}

export default function Thumb({ project, aspect = "aspect-video" }) {
  const src = asset(project.thumb);
  const { w = 1600, h = 900 } = project.thumbSize ?? {};

  return (
    <span className={`relative block w-full overflow-hidden bg-[#0f0f0f] ${aspect}`}>
      {src ? (
        <img
          src={src}
          alt={project.thumbAlt ?? `${project.title} — film still`}
          width={w}
          height={h}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : (
        <span
          role="img"
          aria-label={`${project.title} — thumbnail placeholder`}
          className="absolute inset-0 grid place-items-center bg-[repeating-linear-gradient(135deg,rgba(244,241,232,0.04)_0_14px,transparent_14px_28px)]"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-bone/40">
            Thumbnail placeholder
          </span>
        </span>
      )}
      <span className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink/70 via-transparent to-transparent" />
    </span>
  );
}
