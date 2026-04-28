import Link from "next/link";
import SummitEmpty from "@/components/summit/SummitEmpty";
import SummitListCard from "@/components/summit/SummitListCard";
import { getSummitContext } from "@/lib/summit/context";
import { fieldString } from "@/lib/summit/fields";
import { getSurveysStatic } from "@/lib/summit/service";

export default async function Page() {
  const context = await getSummitContext();
  const surveys = await getSurveysStatic(context.selectedSummitName);

  if (!surveys.length) {
    return <SummitEmpty title="No surveys available" body="Survey links will appear once configured." />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Surveys</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {surveys.map((survey) => (
          <SummitListCard
            key={survey.id}
            href={`/surveys/${survey.id}`}
            item={{
              id: survey.id,
              title: fieldString(survey, "Name") || "Survey",
              subtitle: fieldString(survey, "Description"),
              description: fieldString(survey, "Url"),
              imageUrl: null,
              tags: [],
            }}
          />
        ))}
      </div>
      <p className="text-xs text-stone-400">
        These links mirror the native app&apos;s survey entries and open as embedded web content.
      </p>
      <Link href="/security-guidelines" className="text-sm text-amber-300">
        Security guidelines
      </Link>
    </div>
  );
}
