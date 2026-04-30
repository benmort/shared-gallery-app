import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import SummitDetailView from "@/components/summit/SummitDetailView";
import { getSummitContext } from "@/lib/summit/context";
import { buildDetail } from "@/lib/summit/domains";
import { getDomainRecords } from "@/lib/summit/domain-data";
import type { SummitListDomain } from "@/lib/summit/types";

type Props = {
  domain: SummitListDomain;
  id: string;
};

export default async function SummitDomainDetailPage({ domain, id }: Props) {
  const context = await getSummitContext();
  const records = await getDomainRecords(domain, context.selectedSummitName);
  const record = records.find((item) => item.id === id);
  if (!record) notFound();

  const detail = buildDetail(domain, record);
  const pronouncedHeader = domain === "speakers" || domain === "events" || domain === "crew";

  return (
    <div className="space-y-4">
      <Link
        href={`/${domain}`}
        className="inline-flex min-h-8 items-center gap-1 rounded-sm px-1 py-0.5 text-xs font-medium text-amber-200 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
      >
        <ChevronLeftIcon className="h-3.5 w-3.5" />
        Back to {domain}
      </Link>
      <SummitDetailView detail={detail} pronouncedHeader={pronouncedHeader} />
    </div>
  );
}
