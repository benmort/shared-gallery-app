import SummitEmpty from "@/components/summit/SummitEmpty";
import SummitListCard from "@/components/summit/SummitListCard";
import { getSummitContext } from "@/lib/summit/context";
import { buildListItem } from "@/lib/summit/domains";
import { domainLabel, getDomainRecords } from "@/lib/summit/domain-data";
import { fieldString } from "@/lib/summit/fields";
import type { SummitListDomain } from "@/lib/summit/types";

type Props = {
  domain: SummitListDomain;
  roleFilter?: string;
};

export default async function SummitDomainListPage({ domain, roleFilter }: Props) {
  const context = await getSummitContext();
  const records = await getDomainRecords(domain, context.selectedSummitName);
  const filteredRecords =
    domain === "crew" && roleFilter
      ? records.filter((record) => fieldString(record, "Role") === roleFilter)
      : records;
  const label = domainLabel(domain);

  if (!filteredRecords.length) {
    return (
      <SummitEmpty
        title={domain === "crew" && roleFilter ? "No matching crew roles yet" : `No ${label.toLowerCase()} yet`}
        body={
          domain === "crew" && roleFilter
            ? `No crew records were found with role: ${roleFilter}.`
            : `No ${label.toLowerCase()} records were found for ${context.selectedSummitName}.`
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">{label}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {filteredRecords.map((record) => (
          <SummitListCard
            key={record.id}
            href={`/${domain}/${record.id}`}
            item={buildListItem(domain, record)}
            circularImage={domain === "crew"}
            showImage={domain !== "organisations"}
            showImageSkeleton={domain === "speakers"}
          />
        ))}
      </div>
    </div>
  );
}
