import { useEffect, useRef, useState } from "react";
import Thumb, { PlayIcon } from "./Thumb";
import { getPlayer } from "../../lib/media";
import { FOCUS, pad } from "./ui";

function ModalBody({ project, index, total, autoplay, onClose, onNext }) {
  const player = getPlayer(project.video);
  const [playing, setPlaying] = useState(autoplay && !!player);
  const [failed, setFailed] = useState(false);
  const showPlayer = playing && player && !failed;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 border-b border-bone/10 px-5 py-4 sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-gold">
          {pad(index + 1)} / {pad(total)} — {project.category}
        </p>
        <button
          type="button"
          onClick={onClose}
          className={`text-xs font-semibold uppercase tracking-[0.2em] transition hover:text-gold ${FOCUS}`}
        >
          Close ✕
        </button>
      </div>

      <div className="relative aspect-video w-full bg-black">
        {showPlayer ? (
          player.type === "iframe" ? (
            <iframe
              src={player.src}
              title={`${project.title} — video player`}
              className="absolute inset-0 h-full w-full"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <video
              src={player.src}
              className="absolute inset-0 h-full w-full"
              controls
              autoPlay
              playsInline
              preload="metadata"
              onError={() => setFailed(true)}
            />
          )
        ) : (
          <>
            <span className="absolute inset-0">
              <Thumb project={project} aspect="h-full" />
            </span>
            {player && !failed ? (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                aria-label={`Play ${project.title}`}
                className={`group absolute inset-0 grid place-items-center ${FOCUS}`}
              >
                <span className="grid h-20 w-20 place-items-center bg-gold text-black transition-transform group-hover:scale-105 motion-reduce:transition-none">
                  <PlayIcon className="h-7 w-7" />
                </span>
              </button>
            ) : (
              <p className="absolute inset-x-0 bottom-0 bg-ink/80 p-4 text-sm text-bone/80 sm:p-5">
                {failed ? "This video couldn't be loaded right now." : "Video coming soon."}
              </p>
            )}
          </>
        )}
      </div>

      <div className="grid gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h3
            id="work-modal-title"
            className="font-display text-[length:clamp(32px,5vw,64px)] uppercase leading-none"
          >
            {project.title}
          </h3>
          {project.description && (
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-bone/65">
              {project.description}
            </p>
          )}
        </div>
        <dl className="grid grid-cols-3 gap-4 self-start border-t border-bone/10 pt-4 lg:grid-cols-1 lg:border-0 lg:pt-0">
          {[
            ["Category", project.category],
            ["Year", project.year],
            ["Role", project.role],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.24em] text-bone/45">
                  {k}
                </dt>
                <dd className="mt-1 text-sm">{v}</dd>
              </div>
            ))}
        </dl>
      </div>

      {onNext && (
        <div className="border-t border-bone/10 px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={onNext}
            className={`text-xs font-semibold uppercase tracking-[0.2em] transition hover:text-gold ${FOCUS}`}
          >
            Next project →
          </button>
        </div>
      )}
    </div>
  );
}

// Native <dialog>: focus trap, Esc to close and focus return come built in.
// The player only exists while a project is open, so closing stops playback.
export default function VideoModal({ project, index, total, autoplay, onClose, onNext }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (project) {
      if (!dialog.open) dialog.showModal();
      document.body.style.overflow = "hidden";
    } else {
      if (dialog.open) dialog.close();
      document.body.style.overflow = "";
    }
  }, [project]);

  useEffect(
    () => () => {
      document.body.style.overflow = "";
    },
    [],
  );

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="work-modal-title"
      className="m-auto max-h-[94svh] w-[min(1100px,94vw)] overflow-y-auto border border-bone/15 bg-ink p-0 text-bone backdrop:bg-black/85"
    >
      {project && (
        <ModalBody
          key={project.id}
          project={project}
          index={index}
          total={total}
          autoplay={autoplay}
          onClose={onClose}
          onNext={onNext}
        />
      )}
    </dialog>
  );
}
