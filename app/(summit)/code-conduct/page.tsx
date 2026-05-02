import SummitCodeConductContent from "@/components/summit/SummitCodeConductContent";
import SummitEmpty from "@/components/summit/SummitEmpty";
import { getSummitContext } from "@/lib/summit/context";
import { fieldString } from "@/lib/summit/fields";
import { SUMMIT_PAGE_SUBTITLE } from "@/lib/summit/page-descriptors";
import { getCodeConductStatic } from "@/lib/summit/service";

export default async function Page() {
  const context = await getSummitContext();
  const content = await getCodeConductStatic(context.selectedSummitName);
  if (!content) {
    return <SummitEmpty title="Code of conduct unavailable" body="No policy content found for this summit." />;
  }

  const contentBody = fieldString(content, "Content Body");
  if (!contentBody) {
    return <SummitEmpty title="Code of conduct unavailable" body="No policy content found for this summit." />;
  }

  return (
    <SummitCodeConductContent
      title="Code of Conduct"
      pageSubtitle={SUMMIT_PAGE_SUBTITLE.codeConduct}
      contentBody={contentBody}
    />
  );
}
