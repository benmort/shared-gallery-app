import SummitCrewListPage from "@/components/summit/SummitCrewListPage";
import { getSummitContext } from "@/lib/summit/context";
import { getCrewAll } from "@/lib/summit/service";

export default async function Page() {
  const context = await getSummitContext();
  const records = await getCrewAll(context.selectedSummitName);
  return <SummitCrewListPage records={records} />;
}
