import SummitEmpty from "@/components/summit/SummitEmpty";
import SummitListCard from "@/components/summit/SummitListCard";
import SummitPageHeader from "@/components/summit/SummitPageHeader";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { getSummitContext } from "@/lib/summit/context";
import { roleHash } from "@/lib/summit/crew-filters";
import { buildListItem } from "@/lib/summit/domains";
import { domainLabel, getDomainRecords } from "@/lib/summit/domain-data";
import { fieldList, fieldString } from "@/lib/summit/fields";
import { SUMMIT_DOMAIN_SUBTITLE_BY_DOMAIN } from "@/lib/summit/page-descriptors";
import type { SummitListDomain } from "@/lib/summit/types";

type Props = {
  domain: SummitListDomain;
  roleFilter?: string;
};

export default async function SummitDomainListPage({ domain, roleFilter }: Props) {
  const context = await getSummitContext();
  const records = await getDomainRecords(domain, context.selectedSummitName);
  const domainRecords =
    domain === "events"
      ? records.filter(
          (record) => !fieldList(record, "Tags").some((tag) => tag.trim().toLowerCase() === "break"),
        )
      : records;
  const normalizedRoleFilter = roleFilter?.trim() || "";
  const crewRoles =
    domain === "crew"
      ? Array.from(new Set(domainRecords.map((record) => fieldString(record, "Role")).filter(Boolean))).sort()
      : [];
  const filteredRecords =
    domain === "crew" && normalizedRoleFilter
      ? domainRecords.filter((record) => fieldString(record, "Role") === normalizedRoleFilter)
      : domainRecords;
  const label = domainLabel(domain);
  const subtitle = SUMMIT_DOMAIN_SUBTITLE_BY_DOMAIN[domain] || label;

  if (!domainRecords.length) {
    return (
      <SummitEmpty
        title={`No ${label.toLowerCase()} yet`}
        body={`No ${label.toLowerCase()} records were found for ${context.selectedSummitName}.`}
      />
    );
  }

  return (
    <div className="space-y-4">
      <SummitPageHeader title={label} subtitle={subtitle} />
      {domain === "crew" && crewRoles.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-300">Filter by role</p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/crew"
              aria-current={normalizedRoleFilter ? undefined : "page"}
              className={
                normalizedRoleFilter
                  ? "group relative min-h-[62px] w-full overflow-hidden rounded-xl border border-dashed border-stone-500/55 bg-zinc-950/40 px-3 py-2.5 text-left text-stone-300/95 transition hover:-translate-y-0.5 hover:border-amber-300/45 hover:bg-zinc-900/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80"
                  : "group relative min-h-[62px] w-full overflow-hidden rounded-xl border border-amber-300/45 bg-gradient-to-br from-amber-200 to-amber-100 px-3 py-2.5 text-left text-zinc-900 shadow-[0_10px_28px_rgba(245,158,11,0.25)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80"
              }
            >
              <span
                aria-hidden
                className={
                  normalizedRoleFilter
                    ? "absolute inset-y-2 left-1 w-1 rounded-full bg-amber-300/40 opacity-0 transition-opacity group-hover:opacity-100"
                    : "absolute inset-y-2 left-1 w-1 rounded-full bg-zinc-900/25"
                }
              />
              {!normalizedRoleFilter ? (
                <span className="pointer-events-none absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-900/20 bg-zinc-900/10">
                  <span className="h-2 w-2 rounded-full bg-zinc-900/60" />
                </span>
              ) : (
                <span className="pointer-events-none absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-300/35 bg-zinc-900/70 text-amber-200/90 opacity-80 transition group-hover:border-amber-300/60 group-hover:opacity-100">
                  <ChevronRightIcon className="h-3 w-3" aria-hidden />
                </span>
              )}
              <span className={normalizedRoleFilter ? "block text-[9px] uppercase tracking-[0.12em] text-stone-500/90" : "block text-[9px] uppercase tracking-[0.12em] text-zinc-700"}>
                Crew
              </span>
              <span className={normalizedRoleFilter ? "mt-0.5 block text-xs font-semibold leading-4 text-stone-200" : "mt-0.5 block text-xs font-semibold leading-4 text-zinc-900"}>
                All roles
              </span>
            </Link>
            {crewRoles.map((role) => {
              const selected = normalizedRoleFilter === role;
              return (
                <Link
                  key={role}
                  href={`/crew${roleHash(role)}`}
                  aria-current={selected ? "page" : undefined}
                  className={
                    selected
                      ? "group relative min-h-[62px] w-full overflow-hidden rounded-xl border border-amber-300/45 bg-gradient-to-br from-amber-200 to-amber-100 px-3 py-2.5 text-left text-zinc-900 shadow-[0_10px_28px_rgba(245,158,11,0.25)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80"
                      : "group relative min-h-[62px] w-full overflow-hidden rounded-xl border border-dashed border-stone-500/55 bg-zinc-950/40 px-3 py-2.5 text-left text-stone-300/95 transition hover:-translate-y-0.5 hover:border-amber-300/45 hover:bg-zinc-900/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80"
                  }
                >
                  <span
                    aria-hidden
                    className={
                      selected
                        ? "absolute inset-y-2 left-1 w-1 rounded-full bg-zinc-900/25"
                        : "absolute inset-y-2 left-1 w-1 rounded-full bg-amber-300/40 opacity-0 transition-opacity group-hover:opacity-100"
                    }
                  />
                  {!selected ? (
                    <span className="pointer-events-none absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-300/35 bg-zinc-900/70 text-amber-200/90 opacity-80 transition group-hover:border-amber-300/60 group-hover:opacity-100">
                      <ChevronRightIcon className="h-3 w-3" aria-hidden />
                    </span>
                  ) : (
                    <span className="pointer-events-none absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-900/20 bg-zinc-900/10">
                      <span className="h-2 w-2 rounded-full bg-zinc-900/60" />
                    </span>
                  )}
                  <span className={selected ? "block text-[9px] uppercase tracking-[0.12em] text-zinc-700" : "block text-[9px] uppercase tracking-[0.12em] text-stone-500/90"}>
                    Role
                  </span>
                  <span className={selected ? "mt-0.5 block text-xs font-semibold leading-4 text-zinc-900" : "mt-0.5 block text-xs font-semibold leading-4 text-stone-200"}>
                    {role}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
      {filteredRecords.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredRecords.map((record) => (
            <SummitListCard
              key={record.id}
              href={`/${domain}/${record.id}`}
              item={buildListItem(domain, record)}
              circularImage={domain === "crew"}
              showImage
              showImageSkeleton={domain === "speakers"}
            />
          ))}
        </div>
      ) : (
        <SummitEmpty
          title="No matching crew roles yet"
          body={`No crew records were found with role: ${normalizedRoleFilter}.`}
        />
      )}
    </div>
  );
}
