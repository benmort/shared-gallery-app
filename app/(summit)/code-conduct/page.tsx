import SummitCodeConductContent from "@/components/summit/SummitCodeConductContent";
import SummitEmpty from "@/components/summit/SummitEmpty";
import { getSummitContext } from "@/lib/summit/context";
import { fieldString } from "@/lib/summit/fields";
import { getCodeConductStatic } from "@/lib/summit/service";

export default async function Page() {
  const context = await getSummitContext();
  const content = await getCodeConductStatic(context.selectedSummitName);
  if (!content) {
    return <SummitEmpty title="Code of conduct unavailable" body="No policy content found for this summit." />;
  }

  const subtitle = fieldString(content, "Subtitle");
  const contentBody = fieldString(content, "Content Body");
  if (!subtitle || !contentBody) {
    return <SummitEmpty title="Code of conduct unavailable" body="No policy content found for this summit." />;
  }

  return <SummitCodeConductContent subtitle={subtitle} contentBody={contentBody} />;
}
