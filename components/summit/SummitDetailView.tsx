import Image from "next/image";
import type { DetailView } from "@/lib/summit/types";

type Props = {
  detail: DetailView;
  action?: React.ReactNode;
};

export default function SummitDetailView({ detail, action }: Props) {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/10 bg-gradient-to-b from-stone-800/80 to-zinc-950/80 p-5">
        <div className="flex flex-col items-center gap-4 text-center">
          {detail.imageUrl ? (
            <Image
              src={detail.imageUrl}
              alt={detail.title}
              width={160}
              height={160}
              className="h-32 w-32 rounded-full object-cover ring-2 ring-white/20"
              unoptimized
            />
          ) : null}
          <div>
            {detail.subtitle ? <p className="text-sm text-amber-100">{detail.subtitle}</p> : null}
            {detail.secondSubtitle ? (
              <p className="text-xs text-amber-200/90">{detail.secondSubtitle}</p>
            ) : null}
            <h1 className="mt-2 text-2xl font-semibold text-white">{detail.title}</h1>
          </div>
          {detail.tags && detail.tags.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-1">
              {detail.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-amber-500/25 px-2 py-0.5 text-xs text-amber-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          {action}
        </div>
      </header>

      {detail.body ? (
        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-white">Bio</h2>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-200">
            {detail.body}
          </p>
        </section>
      ) : null}

      {detail.summary ? (
        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-white">Summary</h2>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-200">
            {detail.summary}
          </p>
        </section>
      ) : null}

      {detail.sections.length > 0 ? (
        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-white">Details</h2>
          <dl className="mt-3 space-y-3">
            {detail.sections.map((section) => (
              <div key={section.label}>
                <dt className="text-xs uppercase tracking-wide text-stone-400">{section.label}</dt>
                <dd className="mt-1 break-words text-sm text-stone-200">
                  {section.href ? (
                    <a
                      href={section.href}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-amber-300 underline decoration-amber-500/60"
                    >
                      {section.value}
                    </a>
                  ) : (
                    section.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {detail.videoUrl ? (
        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-white">Video</h2>
          <video controls preload="metadata" className="mt-2 w-full rounded-lg" src={detail.videoUrl} />
        </section>
      ) : null}
    </div>
  );
}
