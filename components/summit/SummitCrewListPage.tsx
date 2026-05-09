"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import SummitEmpty from "@/components/summit/SummitEmpty";
import SummitListCard from "@/components/summit/SummitListCard";
import SummitPageHeader from "@/components/summit/SummitPageHeader";
import { buildListItem } from "@/lib/summit/domains";
import { fieldList, fieldString } from "@/lib/summit/fields";
import { SUMMIT_PAGE_SUBTITLE } from "@/lib/summit/page-descriptors";
import { roleFromHash, roleHash } from "@/lib/summit/crew-filters";
import type { SummitRecord } from "@/lib/summit/types";

type Props = {
  records: SummitRecord[];
};

function crewRoles(record: SummitRecord): string[] {
  const roles = fieldList(record, "Role").filter(Boolean);
  if (roles.length > 0) return roles;
  const fallbackRole = fieldString(record, "Role").trim();
  return fallbackRole ? [fallbackRole] : [];
}

export default function SummitCrewListPage({ records }: Props) {
  const roles = useMemo(
    () => Array.from(new Set(records.flatMap((record) => crewRoles(record)))).sort(),
    [records],
  );
  const [activeRole, setActiveRole] = useState<string | null | undefined>(undefined);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useLayoutEffect(() => {
    const fromHash = roleFromHash(window.location.hash, roles);
    setActiveRole(fromHash);
  }, [roles]);

  useEffect(() => {
    const onHashChange = () => {
      setActiveRole(roleFromHash(window.location.hash, roles));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [roles]);

  useEffect(() => {
    if (activeRole === undefined) return;
    if (!activeRole) {
      const cleanUrl = `${window.location.pathname}${window.location.search}`;
      if (window.location.hash) {
        window.history.replaceState(window.history.state, "", cleanUrl);
      }
      return;
    }
    const nextHash = roleHash(activeRole);
    if (window.location.hash === nextHash) return;
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [activeRole]);

  const filteredRecords = activeRole
    ? records.filter((record) => crewRoles(record).includes(activeRole))
    : records;

  function moveFocus(nextIndex: number) {
    requestAnimationFrame(() => tabRefs.current[nextIndex]?.focus());
  }

  if (!records.length) {
    return <SummitEmpty title="No crew yet" body="No crew records were found for this summit." />;
  }

  return (
    <div className="space-y-4">
      <SummitPageHeader title="Crew" subtitle={SUMMIT_PAGE_SUBTITLE.crew} />
      {roles.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-300">Filter by role</p>
          <div role="tablist" aria-orientation="horizontal" aria-label="Crew roles" className="grid grid-cols-2 gap-2">
            {[
              {
                key: "__all__",
                label: "All roles",
                eyebrow: "Crew",
                selected: activeRole !== undefined && activeRole === null,
              },
              ...roles.map((role) => ({
                key: role,
                label: role,
                eyebrow: "Role",
                selected: activeRole !== undefined && activeRole === role,
              })),
            ].map((item, index, list) => (
              <button
                key={item.key}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                aria-selected={item.selected}
                tabIndex={item.selected || (activeRole === undefined && index === 0) ? 0 : -1}
                disabled={activeRole === undefined}
                onClick={() => {
                  if (activeRole === undefined) return;
                  setActiveRole(item.key === "__all__" ? null : item.key);
                }}
                onKeyDown={(event) => {
                  if (activeRole === undefined) return;
                  if (event.key === "ArrowRight") {
                    event.preventDefault();
                    const nextIndex = (index + 1) % list.length;
                    setActiveRole(list[nextIndex].key === "__all__" ? null : list[nextIndex].key);
                    moveFocus(nextIndex);
                  } else if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    const nextIndex = (index - 1 + list.length) % list.length;
                    setActiveRole(list[nextIndex].key === "__all__" ? null : list[nextIndex].key);
                    moveFocus(nextIndex);
                  } else if (event.key === "Home") {
                    event.preventDefault();
                    setActiveRole(null);
                    moveFocus(0);
                  } else if (event.key === "End") {
                    event.preventDefault();
                    const lastIndex = list.length - 1;
                    setActiveRole(list[lastIndex].key);
                    moveFocus(lastIndex);
                  }
                }}
                className={
                  item.selected
                    ? "group relative min-h-[52px] w-full overflow-hidden rounded-xl border border-amber-300/45 bg-gradient-to-br from-amber-200 to-amber-100 px-3 py-2 text-left text-zinc-900 shadow-[0_10px_28px_rgba(245,158,11,0.25)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80"
                    : "group relative min-h-[52px] w-full overflow-hidden rounded-xl border border-dashed border-stone-500/55 bg-zinc-950/40 px-3 py-2 text-left text-stone-300/95 transition hover:-translate-y-0.5 hover:border-amber-300/45 hover:bg-zinc-900/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80 disabled:opacity-85 disabled:hover:translate-y-0 disabled:hover:border-stone-500/55 disabled:hover:bg-zinc-950/40"
                }
              >
                <span
                  aria-hidden
                  className={
                    item.selected
                      ? "absolute inset-y-2 left-1 w-1 rounded-full bg-zinc-900/25"
                      : "absolute inset-y-2 left-1 w-1 rounded-full bg-amber-300/40 opacity-0 transition-opacity group-hover:opacity-100"
                  }
                />
                {!item.selected ? (
                  <span className="pointer-events-none absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-300/35 bg-zinc-900/70 text-amber-200/90 opacity-80 transition group-hover:border-amber-300/60 group-hover:opacity-100">
                    <ChevronRightIcon className="h-3 w-3" aria-hidden />
                  </span>
                ) : (
                  <span className="pointer-events-none absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-900/20 bg-zinc-900/10">
                    <span className="h-2 w-2 rounded-full bg-zinc-900/60" />
                  </span>
                )}
                <span className={item.selected ? "block text-[9px] uppercase tracking-[0.12em] text-zinc-700" : "block text-[9px] uppercase tracking-[0.12em] text-stone-500/90"}>
                  {item.eyebrow}
                </span>
                <span className={item.selected ? "mt-0.5 block text-xs font-semibold leading-4 text-zinc-900" : "mt-0.5 block text-xs font-semibold leading-4 text-stone-200"}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {activeRole === undefined ? (
        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-stone-300">Loading crew role...</p>
        </section>
      ) : filteredRecords.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredRecords.map((record) => (
            <SummitListCard
              key={record.id}
              href={`/crew/${record.id}`}
              item={buildListItem("crew", record)}
              circularImage
              showImage
            />
          ))}
        </div>
      ) : (
        <SummitEmpty title="No matching crew roles yet" body={`No crew records were found with role: ${activeRole}.`} />
      )}
    </div>
  );
}
