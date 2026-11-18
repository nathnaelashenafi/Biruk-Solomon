import { useEffect, useRef, useState } from "react";
import { projects as localProjects } from "../../data/projects";
import { backendReady, fetchVideos } from "../../lib/api";
import Reveal from "./Reveal";
import Thumb from "./Thumb";
import VideoModal from "./VideoModal";
import { FOCUS } from "./ui";

// How far each card sits from the middle (in card widths) and how much it shrinks.
const OFFSET = [0, 0.8, 1.42];
const SCALE = [1, 0.82, 0.66];
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function Arrow({ dir, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir < 0 ? "Previous video" : "Next video"}
      className={`grid h-12 w-12 place-items-center rounded-full border border-bone/40 text-bone transition hover:border-gold hover:text-gold disabled:opacity-30 disabled:hover:border-bone/40 disabled:hover:text-bone ${FOCUS}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d={dir < 0 ? "M19 12H5M11 6l-6 6 6 6" : "M5 12h14M13 6l6 6-6 6"}
        />
      </svg>
    </button>
  );
}

export default function SelectedWork() {
  // The videos live in Supabase. If it cannot be reached, the local list is shown instead.
  const [data, setData] = useState(() =>
    backendReady
      ? { loading: true, items: [], error: false }
      : { loading: false, items: localProjects, error: false },
  );
  const [filter, setFilter] = useState("All");
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(null); // { project, autoplay }
  const swipeStart = useRef(null);
  const dragged = useRef(false);

  useEffect(() => {
    if (!backendReady) return;
    let alive = true;
    fetchVideos()
      .then(
        (items) => alive && setData({ loading: false, items, error: false }),
      )
      .catch(
        () =>
          alive &&
          setData({ loading: false, items: localProjects, error: true }),
      );
    return () => {
      alive = false;
    };
  }, []);

  const types = [...new Set(data.items.map((p) => p.category).filter(Boolean))];
  const list =
    filter === "All"
      ? data.items
      : data.items.filter((p) => p.category === filter);
  const cur = clamp(current, 0, Math.max(0, list.length - 1));

  const go = (dir) => setCurrent(clamp(cur + dir, 0, list.length - 1));
  const pick = (type) => {
    setFilter(type);
    setCurrent(0);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      go(e.key === "ArrowLeft" ? -1 : 1);
    }
  };
  const onPointerUp = (e) => {
    if (swipeStart.current === null) return;
    const dx = e.clientX - swipeStart.current;
    swipeStart.current = null;
    dragged.current = Math.abs(dx) > 10;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };
  const onCard = (i) => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    if (i === cur) setOpen({ project: list[i], autoplay: true });
    else setCurrent(i);
  };

  const openIndex = open ? Math.max(0, list.indexOf(open.project)) : 0;
  const goNext = () =>
    setOpen({ project: list[(openIndex + 1) % list.length], autoplay: false });

  return (
    <section
      id="work"
      aria-labelledby="work-heading"
      className="relative overflow-hidden bg-ink py-16 font-sans text-bone sm:py-20 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-gold/0 via-gold/50 to-gold/0" />

      <Reveal className="px-[5vw] text-center">
        <h2
          id="work-heading"
          className="font-display text-[length:clamp(38px,6vw,88px)] uppercase leading-[0.95]"
        >
          Every frame.{" "}
          <span className="text-transparent [-webkit-text-stroke:2px_#F4F1E8]">
            A different story.
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-bone/65">
          Moving images and visual stories, shaped through the lens and the
          edit.
        </p>

        {types.length > 1 && (
          <div
            className="mt-8 flex flex-wrap justify-center gap-3"
            role="group"
            aria-label="Filter by type of video"
          >
            {["All", ...types].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => pick(t)}
                aria-pressed={filter === t}
                className={`rounded-full border px-5 py-2 text-sm transition ${
                  filter === t
                    ? "border-gold bg-gold font-semibold text-black"
                    : "border-bone/30 text-bone/80 hover:border-gold hover:text-gold"
                } ${FOCUS}`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </Reveal>

      {data.error && (
        <p role="status" className="mt-8 text-center text-sm text-bone/55">
          Live videos are temporarily unavailable. Showing featured videos
          instead.
        </p>
      )}

      {data.loading ? (
        <p role="status" className="mt-16 text-center text-sm text-bone/50">
          Loading videos...
        </p>
      ) : list.length === 0 ? (
        <p role="status" className="mt-16 text-center text-sm text-bone/60">
          New videos are coming soon.
        </p>
      ) : (
        <>
          <div
            role="group"
            aria-roledescription="carousel"
            aria-label="Videos. Use the arrow buttons, the left and right arrow keys, or swipe."
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={(e) => {
              swipeStart.current = e.clientX;
              dragged.current = false;
            }}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (swipeStart.current = null)}
            className="relative mx-auto mt-10 h-[calc(var(--cw)*0.5625+3.5rem)] touch-pan-y overflow-hidden [--cw:78vw] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold sm:[--cw:60vw] lg:[--cw:min(46vw,620px)]"
          >
            {list.map((p, i) => {
              const d = i - cur;
              const a = Math.abs(d);
              const near = a <= 2;
              const k = Math.min(a, 2);
              return (
                <div
                  key={p.id}
                  inert={!near}
                  style={{
                    transform: `translate(calc(-50% + var(--cw) * ${OFFSET[k] * Math.sign(d)}), -50%) scale(${SCALE[k]})`,
                    zIndex: 10 - a,
                    opacity: near ? 1 : 0,
                  }}
                  className="absolute left-1/2 top-1/2 w-[var(--cw)] transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none"
                >
                  <button
                    type="button"
                    onClick={() => onCard(i)}
                    aria-label={d === 0 ? `Play ${p.title}` : `Show ${p.title}`}
                    className="group relative block w-full overflow-hidden rounded-2xl text-left shadow-[0_24px_60px_rgba(0,0,0,0.6)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
                  >
                    {near && <Thumb project={p} aspect="aspect-video" />}
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-500 ${d === 0 ? "opacity-0" : "opacity-50"}`}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute bottom-3 right-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-gold text-black transition-transform duration-300 group-hover:scale-110"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                    {d === 0 && (
                      <span className="absolute bottom-3 left-4 right-16 z-10">
                        {p.studio && (
                          <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
                            {p.studio}
                          </span>
                        )}
                        <span className="mt-1 block font-display text-xl uppercase leading-none sm:text-2xl">
                          {p.category}
                        </span>
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {list.length > 1 && (
            <div className="mt-8 flex justify-center gap-4">
              <Arrow dir={-1} disabled={cur === 0} onClick={() => go(-1)} />
              <Arrow
                dir={1}
                disabled={cur === list.length - 1}
                onClick={() => go(1)}
              />
            </div>
          )}
          <p className="sr-only" aria-live="polite">
            {list[cur]?.title}
          </p>
        </>
      )}

      <VideoModal
        project={open?.project ?? null}
        index={openIndex}
        total={list.length}
        autoplay={open?.autoplay ?? false}
        onClose={() => setOpen(null)}
        onNext={list.length > 1 ? goNext : undefined}
      />
    </section>
  );
}
