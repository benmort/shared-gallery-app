import { notFound } from "next/navigation";
import { getSummitContext } from "@/lib/summit/context";
import { fieldString } from "@/lib/summit/fields";
import { getSurveysStatic } from "@/lib/summit/service";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  const context = await getSummitContext();
  const surveys = await getSurveysStatic(context.selectedSummitName);
  const survey = surveys.find((item) => item.id === id);
  if (!survey) notFound();

  const url = fieldString(survey, "Url");
  if (!url) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-stone-300">
        This survey does not include a URL.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-0 flex-col gap-3">
      <h1 className="text-xl font-semibold text-white">{fieldString(survey, "Name") || "Survey"}</h1>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-stone-100">
        <iframe
          title={fieldString(survey, "Name") || "Survey"}
          src={url}
          className="h-full w-full"
          sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-14 w-14 bg-stone-100"
        />
      </div>
    </div>
  );
}
