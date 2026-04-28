import SummitEmpty from "@/components/summit/SummitEmpty";
import SummitListCard from "@/components/summit/SummitListCard";
import { getSummitContext } from "@/lib/summit/context";
import { buildListItem } from "@/lib/summit/domains";
import { domainLabel, getDomainRecords } from "@/lib/summit/domain-data";
import type { SummitListDomain } from "@/lib/summit/types";

type Props = {
  domain: SummitListDomain;
};

export default async function SummitDomainListPage({ domain }: Props) {
  const context = await getSummitContext();
  const records = await getDomainRecords(domain, context.selectedSummitName);
  const label = domainLabel(domain);

  if (!records.length) {
    return (
      <SummitEmpty
        title={`No ${label.toLowerCase()} yet`}
        body={`No ${label.toLowerCase()} records were found for ${context.selectedSummitName}.`}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">{label}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {records.map((record) => (
          <SummitListCard
            key={record.id}
            href={`/${domain}/${record.id}`}
            item={buildListItem(domain, record)}
          />
        ))}
      </div>
    </div>
  );
}
