import SummitEmpty from "@/components/summit/SummitEmpty";
import SummitListCard from "@/components/summit/SummitListCard";
import SummitPageHeader from "@/components/summit/SummitPageHeader";
import { getSummitContext } from "@/lib/summit/context";
import { fieldString } from "@/lib/summit/fields";
import { SUMMIT_PAGE_SUBTITLE } from "@/lib/summit/page-descriptors";
import { getSurveysStatic } from "@/lib/summit/service";

export default async function Page() {
  const context = await getSummitContext();
  const surveys = await getSurveysStatic(context.selectedSummitName);

  if (!surveys.length) {
    return <SummitEmpty title="No surveys available" body="Survey links will appear once configured." />;
  }

  return (
    <div className="space-y-4">
      <SummitPageHeader title="Surveys" subtitle={SUMMIT_PAGE_SUBTITLE.surveys} />
      <div className="grid gap-3 sm:grid-cols-2">
        {surveys.map((survey) => (
          <SummitListCard
            key={survey.id}
            href={`/surveys/${survey.id}`}
            item={{
              id: survey.id,
              title: fieldString(survey, "Name") || "Survey",
              subtitle: fieldString(survey, "Description"),
              description: null,
              imageUrl: "/images/surveys/survey-feedback.svg",
              tags: [],
            }}
          />
        ))}
      </div>
    </div>
  );
}
