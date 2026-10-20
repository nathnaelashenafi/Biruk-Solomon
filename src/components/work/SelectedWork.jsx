import { useState } from "react";
import { projects } from "../../data/projects";
import Reveal from "./Reveal";
import Thumb, { PlayBadge, PlayIcon } from "./Thumb";
import VideoModal from "./VideoModal";
import { FOCUS, pad } from "./ui";

const INITIAL_VISIBLE = 4;

// Editorial rhythm: wide, tall, tall, wide… repeats as the portfolio grows.
const PATTERN = [
  { span: "lg:col-span-7", aspect: "aspect-video" },
  { span: "lg:col-span-5", aspect: "aspect-[4/5] sm:aspect-video lg:aspect-[4/5]" },
  { span: "lg:col-span-5", aspect: "aspect-[4/5] sm:aspect-video lg:aspect-[4/5]" },
  { span: "lg:col-span-7", aspect: "aspect-video" },
];

const featured = projects.find((p) => p.featured) ?? projects[0];
const rest = projects.filter((p) => p !== featured);
const realCount = projects.filter((p) => !p.placeholder).length;

function Meta({ project }) {
  const parts = [project.year, project.role].filter(Boolean);
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-bone/60">
      <span className="text-gold">{project.category}</span>
      {parts.length > 0 && <span>{"  ·  " + parts.join("  ·  ")}</span>}
    </p>
  );
}

function Actions({ onWatch, onView, solid = false }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-3">
      <button
        type="button"
        onClick={onWatch}
        className={
          solid
            ? `inline-flex items-center gap-3 bg-gold px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-bone ${FOCUS}`
            : `inline-flex items-center gap-2.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold transition hover:text-bone ${FOCUS}`
        }
      >
        <PlayIcon className="h-3.5 w-3.5" />
        Watch Film
      </button>
      <button
        type="button"
        onClick={onView}
        className={`border-b border-bone/30 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition hover:border-gold hover:text-gold ${FOCUS}`}
      >
        View Project →
      </button>
    </div>
  );
}

function ProjectCard({ project, layout, delay, onOpen }) {
  return (
    <Reveal delay={delay} className={layout.span}>
      <article>
        <button
          type="button"
          onClick={() => onOpen(project, true)}
          aria-label={`Watch ${project.title}`}
          className={`group relative block w-full text-left ${FOCUS}`}
        >
          <Thumb project={project} aspect={layout.aspect} />
          <PlayBadge />
        </button>
        <div className="mt-5 flex items-start gap-5">
          <span aria-hidden="true" className="font-display text-3xl leading-none text-gold">
            {pad(projects.indexOf(project) + 1)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[length:clamp(26px,3vw,42px)] uppercase leading-none">
              {project.title}
            </h3>
            <div className="mt-2">
              <Meta project={project} />
            </div>
            <Actions onWatch={() => onOpen(project, true)} onView={() => onOpen(project, false)} />
          </div>
        </div>
      </article>
    </Reveal>
  );
}

export default function SelectedWork() {
  const [showAll, setShowAll] = useState(false);
  const [active, setActive] = useState(null); // { project, autoplay }

  const open = (project, autoplay) => setActive({ project, autoplay });
  const close = () => setActive(null);

  const visible = showAll ? rest : rest.slice(0, INITIAL_VISIBLE);
  const activeIndex = active ? projects.indexOf(active.project) : 0;
  const goNext = () =>
    setActive({ project: projects[(activeIndex + 1) % projects.length], autoplay: false });

  return (
    <section
      id="work"
      aria-labelledby="work-heading"
      className="relative bg-ink px-[5vw] py-24 font-sans text-bone sm:py-32 lg:py-40"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-gold/0 via-gold/50 to-gold/0" />

      {/* introduction */}
      <Reveal className="grid gap-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <p className="mb-6 flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.3em] text-gold">
            <span className="h-px w-12 bg-gold" />
            Selected Work / 02
          </p>
          <h2
            id="work-heading"
            className="font-display text-[length:clamp(52px,10vw,160px)] uppercase leading-[0.88]"
          >
            <span className="block">Every frame.</span>
            <span className="block text-transparent [-webkit-text-stroke:2px_#F4F1E8]">
              A different story.
            </span>
          </h2>
        </div>
        <div className="lg:col-span-4 lg:pb-3">
          <p className="max-w-sm text-base leading-relaxed text-bone/65">
            A collection of moving images, visual stories, and moments shaped through the lens and
            the edit.
          </p>
          {realCount > 0 && (
            <p className="mt-6 font-display text-2xl tracking-wide text-gold">
              {pad(realCount)}{" "}
              <span className="font-sans text-xs font-semibold uppercase tracking-[0.26em] text-bone/60">
                {realCount === 1 ? "Project" : "Projects"}
              </span>
            </p>
          )}
        </div>
      </Reveal>

      {/* featured project */}
      <Reveal className="mt-16 lg:mt-24">
        <article className="grid gap-6 lg:grid-cols-12 lg:gap-10">
          <button
            type="button"
            onClick={() => open(featured, true)}
            aria-label={`Watch ${featured.title}`}
            className={`group relative block text-left lg:col-span-8 ${FOCUS}`}
          >
            <Thumb project={featured} />
            <PlayBadge large />
            <span className="absolute left-4 top-4 bg-gold px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-black">
              Featured
            </span>
          </button>
          <div className="flex flex-col justify-end lg:col-span-4">
            <span
              aria-hidden="true"
              className="font-display text-[length:clamp(72px,11vw,170px)] leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(245,183,0,0.5)]"
            >
              {pad(projects.indexOf(featured) + 1)}
            </span>
            <h3 className="mt-3 font-display text-[length:clamp(36px,4.6vw,72px)] uppercase leading-[0.95]">
              {featured.title}
            </h3>
            <div className="mt-4">
              <Meta project={featured} />
            </div>
            {featured.description && (
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-bone/65">
                {featured.description}
              </p>
            )}
            <Actions
              solid
              onWatch={() => open(featured, true)}
              onView={() => open(featured, false)}
            />
          </div>
        </article>
      </Reveal>

      {/* supporting projects */}
      {visible.length > 0 && (
        <div className="mt-20 grid gap-x-8 gap-y-16 md:grid-cols-2 lg:mt-28 lg:grid-cols-12 lg:items-end lg:gap-y-24">
          {visible.map((project, i) => (
            <ProjectCard
              key={project.id}
              project={project}
              layout={PATTERN[i % PATTERN.length]}
              delay={(i % 2) * 120}
              onOpen={open}
            />
          ))}
        </div>
      )}

      {rest.length > INITIAL_VISIBLE && !showAll && (
        <div className="mt-16 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className={`border border-bone/30 px-8 py-4 text-xs font-semibold uppercase tracking-[0.16em] transition hover:border-gold hover:text-gold ${FOCUS}`}
          >
            View All Work
          </button>
        </div>
      )}

      {/* route to contact */}
      <Reveal className="mt-28 border-t border-bone/10 pt-16 lg:mt-40 lg:pt-20">
        <div className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-end">
          <p className="max-w-3xl font-display text-[length:clamp(34px,6vw,96px)] uppercase leading-[0.95]">
            Have a project in mind? <span className="text-gold">Let&apos;s talk.</span>
          </p>
          <a
            href="#contact"
            className={`inline-flex shrink-0 bg-gold px-8 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:-translate-y-0.5 hover:bg-bone motion-reduce:hover:translate-y-0 ${FOCUS}`}
          >
            Start a Project
          </a>
        </div>
      </Reveal>

      <VideoModal
        project={active?.project ?? null}
        index={activeIndex}
        total={projects.length}
        autoplay={active?.autoplay ?? false}
        onClose={close}
        onNext={projects.length > 1 ? goNext : undefined}
      />
    </section>
  );
}
