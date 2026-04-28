import Link from "next/link";
import { notFound } from "next/navigation";
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

  return (
    <div className="space-y-4">
      <Link href={`/${domain}`} className="inline-flex text-sm text-amber-300">
        Back to {domain}
      </Link>
      <SummitDetailView detail={detail} />
    </div>
  );
}
