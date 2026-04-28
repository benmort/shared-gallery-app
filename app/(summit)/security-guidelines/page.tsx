import SummitEmpty from "@/components/summit/SummitEmpty";
import { getSummitContext } from "@/lib/summit/context";
import { fieldString } from "@/lib/summit/fields";
import { getSecurityGuidelinesStatic } from "@/lib/summit/service";

export default async function Page() {
  const context = await getSummitContext();
  const content = await getSecurityGuidelinesStatic(context.selectedSummitName);
  if (!content) {
    return (
      <SummitEmpty
        title="Security guidelines unavailable"
        body="No security guidance content found for this summit."
      />
    );
  }

  return (
    <article className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h1 className="text-2xl font-semibold text-white">Security Guidelines</h1>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-stone-200">
        {fieldString(content, "Content Body")}
      </p>
    </article>
  );
}
