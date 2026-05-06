import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import SummitDetailView from "@/components/summit/SummitDetailView";
import SummitVenueMapGallery from "@/components/summit/SummitVenueMapGallery";
import { getSummitContext } from "@/lib/summit/context";
import { buildDetail } from "@/lib/summit/domains";
import { getDomainRecords } from "@/lib/summit/domain-data";
import { fieldString } from "@/lib/summit/fields";
import { venueGalleryForName } from "@/lib/summit/venue-gallery";
import type { SummitListDomain } from "@/lib/summit/types";

type Props = {
  domain: SummitListDomain;
  id: string;
};

function crewPhoneToWhatsappUrl(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (!digitsOnly) return null;

  // Summit crew numbers are local AU mobile numbers; WhatsApp needs country code format.
  const whatsappPhone = digitsOnly.startsWith("0") ? `61${digitsOnly.slice(1)}` : digitsOnly;
  return whatsappPhone ? `https://wa.me/${whatsappPhone}` : null;
}

export default async function SummitDomainDetailPage({ domain, id }: Props) {
  const context = await getSummitContext();
  const records = await getDomainRecords(domain, context.selectedSummitName);
  const record = records.find((item) => item.id === id);
  if (!record) notFound();

  const detail = buildDetail(domain, record);
  const pronouncedHeader = domain === "speakers" || domain === "events" || domain === "crew";
  const venueGalleryItems = domain === "venues" ? venueGalleryForName(fieldString(record, "Name")) : [];
  const crewWhatsappUrl =
    domain === "crew" ? crewPhoneToWhatsappUrl(fieldString(record, "Phone [Network Data]")) : null;
  const action =
    domain === "crew" && crewWhatsappUrl ? (
      <a
        href={crewWhatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center gap-1 rounded-md bg-amber-500 px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-950 transition hover:bg-amber-400"
      >
        Contact on WhatsApp
        <ChevronRightIcon className="h-4 w-4" />
      </a>
    ) : undefined;

  return (
    <div className="space-y-4">
      <Link
        href={`/${domain}`}
        className="inline-flex min-h-8 items-center gap-1 rounded-sm px-1 py-0.5 text-xs font-medium text-amber-200 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
      >
        <ChevronLeftIcon className="h-3.5 w-3.5" />
        {`BACK TO ${domain.toUpperCase()}`}
      </Link>
      <SummitDetailView
        detail={detail}
        action={action}
        actionBelowHeader={domain === "crew"}
        pronouncedHeader={pronouncedHeader}
      />
      {domain === "venues" && venueGalleryItems.length > 0 ? (
        <SummitVenueMapGallery items={venueGalleryItems} />
      ) : null}
    </div>
  );
}
