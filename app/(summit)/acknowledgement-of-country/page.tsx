import Link from "next/link";
import {
  ACKNOWLEDGEMENT_COUNTRY_PARAGRAPHS,
  ACKNOWLEDGEMENT_COUNTRY_TITLE,
} from "@/lib/summit/acknowledgement";

export default function Page() {
  return (
    <article className="rounded-xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <h1 className="text-xl font-semibold uppercase tracking-[0.12em] text-amber-100 sm:text-2xl">
        {ACKNOWLEDGEMENT_COUNTRY_TITLE}
      </h1>
      <div className="mt-4 space-y-4 text-base font-bold leading-relaxed text-stone-200 sm:text-lg">
        {ACKNOWLEDGEMENT_COUNTRY_PARAGRAPHS.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-10 items-center rounded-md border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-100 transition hover:bg-white/10"
      >
        Back to home
      </Link>
    </article>
  );
}
