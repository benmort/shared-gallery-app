import {
  ArrowLongRightIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  MapIcon,
  MapPinIcon,
  PlusIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import SummitEmpty from "@/components/summit/SummitEmpty";
import { getSummitContext } from "@/lib/summit/context";
import { buildListItem } from "@/lib/summit/domains";
import { fieldFirst, fieldList, fieldString } from "@/lib/summit/fields";
import { getMapStatic, getSpeakersAll } from "@/lib/summit/service";
import type { SummitRecord } from "@/lib/summit/types";

type DirectoryEntry = {
  href: string;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
};

function parseDateTime(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateOnly(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startTime(record: SummitRecord): number {
  const raw = fieldFirst(record, "DateTime Start [Schedule]");
  const parsed = parseDateTime(raw);
  if (!parsed) return Number.MAX_SAFE_INTEGER;
  return Number.isNaN(parsed.getTime()) ? Number.MAX_SAFE_INTEGER : parsed.getTime();
}

function formatSummitRange(startRaw: string, endRaw: string): string {
  const start = parseDateOnly(startRaw);
  const end = parseDateOnly(endRaw);
  if (!start || !end) return [startRaw, endRaw].filter(Boolean).join(" - ") || "Date range unavailable";

  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    const month = start.toLocaleDateString([], { month: "short" });
    return `${month} ${start.getDate()}-${end.getDate()}`;
  }

  const startLabel = start.toLocaleDateString([], { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${startLabel} - ${endLabel}`;
}

function splitSummitName(name: string): { overline: string; title: string } {
  if (!name) return { overline: "Summit", title: "Summit dashboard" };
  const [left, ...rest] = name.split(":");
  if (rest.length === 0) return { overline: "Summit", title: name };
  return {
    overline: left.trim() || "Summit",
    title: rest.join(":").trim() || name,
  };
}

function formatSpeakerStart(record: SummitRecord): string {
  const raw = fieldFirst(record, "DateTime Start [Schedule]");
  const parsed = parseDateTime(raw);
  if (!parsed) return "Time to be confirmed";

  return `Starts at ${parsed.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function SectionHeading({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-stone-100">
        <span className="h-px w-7 bg-amber-300/80" />
        {title}
      </h2>
      {action}
    </div>
  );
}

function SpeakerCard({
  speaker,
  imageUrl,
}: {
  speaker: SummitRecord;
  imageUrl: string | null;
}) {
  const name = fieldString(speaker, "Full Name") || "Speaker";
  const title = fieldString(speaker, "Title") || name;
  const description = fieldString(speaker, "Description") || fieldString(speaker, "Bio");
  const location = [fieldFirst(speaker, "Venue Name"), fieldString(speaker, "Room/Area")]
    .filter(Boolean)
    .join(" - ");
  const tags = fieldList(speaker, "Tags").slice(0, 2);

  return (
    <Link
      href={`/speakers/${speaker.id}`}
      className="group overflow-hidden rounded-xl border border-white/10 bg-zinc-900/70 transition hover:border-white/20 hover:bg-zinc-900"
    >
      <div className="relative aspect-[16/10] bg-black/40">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            unoptimized
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      </div>
      <div className="space-y-2 p-3.5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-stone-400">
          {formatSpeakerStart(speaker)}
        </p>
        <h3 className="text-base font-semibold text-white break-words">{title}</h3>
        <p className="text-xs text-stone-300 break-words">{name}</p>
        {description ? <p className="text-xs text-stone-400 break-words">{description}</p> : null}
        <div className="flex items-center justify-between pt-1">
          <div className="flex min-h-5 flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={`${speaker.id}-${tag}`}
                className="rounded-full border border-amber-300/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-amber-100"
              >
                {tag}
              </span>
            ))}
          </div>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-white/5 text-stone-200">
            <PlusIcon className="h-3.5 w-3.5" />
          </span>
        </div>
        {location ? <p className="text-[11px] text-stone-400">{location}</p> : null}
      </div>
    </Link>
  );
}

export default async function SummitDashboardPage() {
  const context = await getSummitContext();
  const [speakers, summitMap] = await Promise.all([
    getSpeakersAll(context.selectedSummitName),
    getMapStatic(context.selectedSummitName),
  ]);

  const upcomingSpeakers = [...speakers].sort((a, b) => startTime(a) - startTime(b)).slice(0, 3);
  const upcomingSpeakerItems = upcomingSpeakers.map((speaker) => ({
    speaker,
    item: buildListItem("speakers", speaker),
  }));
  const summitName = context.selectedSummit
    ? fieldString(context.selectedSummit, "Name")
    : "Summit";
  const summitRange = context.selectedSummit
    ? formatSummitRange(
        fieldString(context.selectedSummit, "Start Date"),
        fieldString(context.selectedSummit, "End Date"),
      )
    : "Date range unavailable";
  const summitLocation = context.selectedSummit
    ? fieldString(context.selectedSummit, "Location")
    : "Location unavailable";
  const mapUrl = summitMap ? fieldFirst(summitMap, "Content Asset") : "";
  const summitTitle = splitSummitName(summitName || "Summit");
  const heroImageUrl = "/images/sa-landmark.png";
  const heroVideoUrl = "/video/background-loop-small.mp4";

  const directoryEntries: DirectoryEntry[] = [
    {
      href: "/speakers",
      label: "Speakers",
      subtitle: "Featured voices",
      icon: UserGroupIcon,
    },
    {
      href: "/crew",
      label: "Crew",
      subtitle: "Production team",
      icon: UsersIcon,
    },
    {
      href: "/organisations",
      label: "Organisations",
      subtitle: "Partners",
      icon: BuildingOffice2Icon,
    },
    {
      href: mapUrl || "/venues",
      label: "Venue/Map",
      subtitle: mapUrl ? "Summit location" : "Venue details",
      icon: MapIcon,
      external: !!mapUrl,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[680px] space-y-6 lg:max-w-[980px]">
      <section className="relative min-h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 sm:min-h-[430px]">
        {heroImageUrl ? (
          <Image
            src={heroImageUrl}
            alt=""
            fill
            className="object-cover object-center"
            unoptimized
            aria-hidden
          />
        ) : null}
        <video
          className="absolute left-1/2 top-1/2 h-full w-[170%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover object-center sm:w-[155%] lg:w-[140%]"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster={heroImageUrl}
          aria-hidden
        >
          <source src={heroVideoUrl} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-stone-900/75 via-zinc-950/60 to-black/90" />
        <div className="relative flex min-h-[360px] flex-col justify-end p-6 sm:min-h-[430px] sm:p-7">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-100/90">{summitTitle.overline}</p>
          <h1 className="mt-2 max-w-[18ch] text-4xl font-semibold leading-tight text-white sm:text-5xl">
            {summitTitle.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-stone-100">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDaysIcon className="h-4 w-4" />
              {summitRange}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPinIcon className="h-4 w-4" />
              {summitLocation || "Location unavailable"}
            </span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/schedule"
              className="inline-flex min-h-11 items-center gap-1 rounded-md bg-amber-500 px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-950 hover:bg-amber-400"
            >
              Browse schedule
              <ArrowLongRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading title="Directory" />
        <div className="grid grid-cols-2 gap-3">
          {directoryEntries.map((entry) => {
            const Icon = entry.icon;
            const cardClass =
              "rounded-xl border border-white/10 bg-zinc-900/70 p-3.5 transition hover:border-white/20 hover:bg-zinc-900";

            if (entry.external) {
              return (
                <a
                  key={entry.href}
                  href={entry.href}
                  target="_blank"
                  rel="noreferrer"
                  className={cardClass}
                >
                  <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-black/30 text-amber-100">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-semibold text-white">{entry.label}</p>
                  <p className="mt-1 text-[11px] text-stone-400">{entry.subtitle}</p>
                </a>
              );
            }

            return (
              <Link key={entry.href} href={entry.href} className={cardClass}>
                <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-black/30 text-amber-100">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold text-white">{entry.label}</p>
                <p className="mt-1 text-[11px] text-stone-400">{entry.subtitle}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHeading
          title="Up Next"
          action={
            <Link href="/speakers" className="text-[10px] uppercase tracking-[0.14em] text-amber-300">
              View full lineup
            </Link>
          }
        />
        {upcomingSpeakerItems.length > 0 ? (
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {upcomingSpeakerItems.map((entry) => (
              <SpeakerCard
                key={entry.speaker.id}
                speaker={entry.speaker}
                imageUrl={entry.item.imageUrl ?? null}
              />
            ))}
          </div>
        ) : (
          <SummitEmpty title="No scheduled talks yet" body="Schedule content will appear when available." />
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-100">
          {summitTitle.overline}
        </p>
        <p className="mt-2 max-w-[55ch] text-xs text-stone-400">
          {summitTitle.title} brings together campaigners, organisers and changemakers for practical
          sessions, collaborative planning and shared action.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-stone-300">Resources</p>
            <div className="space-y-1.5">
              <Link href="/speakers" className="block text-stone-400 hover:text-stone-200">
                Speakers list
              </Link>
              {mapUrl ? (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-stone-400 hover:text-stone-200"
                >
                  Venue map
                </a>
              ) : (
                <Link href="/venues" className="block text-stone-400 hover:text-stone-200">
                  Venue map
                </Link>
              )}
              <Link href="/schedule" className="block text-stone-400 hover:text-stone-200">
                Live schedule
              </Link>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-stone-300">Legal</p>
            <div className="space-y-1.5">
              <Link href="/code-conduct" className="block text-stone-400 hover:text-stone-200">
                Code of Conduct
              </Link>
              <Link href="/security-guidelines" className="block text-stone-400 hover:text-stone-200">
                Security Guidelines
              </Link>
              <Link href="/surveys" className="block text-stone-400 hover:text-stone-200">
                Feedback
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
