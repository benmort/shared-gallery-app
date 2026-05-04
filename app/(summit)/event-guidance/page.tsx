import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import SummitPageHeader from "@/components/summit/SummitPageHeader";
import { getSummitContext } from "@/lib/summit/context";
import { fieldString } from "@/lib/summit/fields";
import { SUMMIT_PAGE_SUBTITLE } from "@/lib/summit/page-descriptors";
import { getVenuesAll } from "@/lib/summit/service";
import type { SummitRecord } from "@/lib/summit/types";

type GuidanceSection = {
  title: string;
  paragraphs: readonly string[];
};

const SUPPORT_EMAIL = "summit@commonthreads.org.au";

function normalizeParagraph(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function splitIntoSentences(value: string): string[] {
  return normalizeParagraph(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function ensureSentence(value: string): string {
  const trimmed = normalizeParagraph(value);
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function twoSentenceVenueSummary(record: SummitRecord): string {
  const descriptions = [
    fieldString(record, "Description"),
    fieldString(record, "Subtitle"),
    fieldString(record, "Instructions"),
  ];
  const sentences: string[] = [];
  for (const block of descriptions) {
    for (const sentence of splitIntoSentences(block)) {
      if (sentences.length >= 2) break;
      if (!sentences.includes(sentence)) sentences.push(sentence);
    }
    if (sentences.length >= 2) break;
  }

  if (sentences.length < 2) {
    const address = fieldString(record, "Address");
    if (address) sentences.push(ensureSentence(`Located at ${address}`));
  }

  return sentences.slice(0, 2).join(" ");
}

function renderParagraphContent(paragraph: string): React.ReactNode {
  const chunks = paragraph.split(/(https?:\/\/\S+|summit@commonthreads\.org\.au)/g);
  return chunks.map((chunk, index) => {
    if (chunk === SUPPORT_EMAIL) {
      return (
        <Link key={`${chunk}-${index}`} href={`mailto:${SUPPORT_EMAIL}`} className="text-amber-200 underline-offset-2 hover:underline">
          {SUPPORT_EMAIL}
        </Link>
      );
    }

    if (/^https?:\/\//.test(chunk)) {
      return (
        <a
          key={`${chunk}-${index}`}
          href={chunk}
          target="_blank"
          rel="noreferrer"
          className="text-amber-200 underline-offset-2 hover:underline"
        >
          {chunk}
        </a>
      );
    }

    return <span key={`${chunk}-${index}`}>{chunk}</span>;
  });
}

const GUIDANCE_SECTIONS: readonly GuidanceSection[] = [
  {
    title: "Registration",
    paragraphs: [
      "Please arrive for registration around 8:30am on Day 1, Tuesday May 12.",
      "All participants must report to the registration desk to check-in and collect your t-shirt.",
      "The registration desk will also act as a help desk and lost and found. If you have any questions or concerns throughout the summit, please speak to the team there.",
    ],
  },
  {
    title: "Meals",
    paragraphs: [
      "Morning tea, lunch, and afternoon tea will be provided on Day 1, Day 2 and Day 3 of Common Threads. Dinner will be provided on the evening of Day 2 during the social event (see details below). Participants will source their own meals outside of the summit program unless previously discussed with the Common Threads team.",
    ],
  },
  {
    title: "Social Event",
    paragraphs: ["TBC"],
  },
  {
    title: "Airport Transfers",
    paragraphs: [
      "Interstate participants will arrange their own transport from the Adelaide Airport to their accommodation, and to/from the summit venue each day unless otherwise indicated by the Common Threads team. It is approximately a 15-20 minute drive from Adelaide Airport to the hotel accommodation.",
      "Travel and accommodation scholarship recipients will be supported to get to and from the airport and the summit venue each day.",
      "There will be luggage storage available. Please ask a Common Threads staff member for assistance.",
    ],
  },
  {
    title: "Children",
    paragraphs: [
      "We are committed to creating a safe and inclusive experience for all attendees, including parents and attendees with child caring responsibilities. Children are an important part of community life and are our future leaders, hence why Common Threads will be a child-friendly event.",
      "Children can attend for free but we require prior notice to adjust catering numbers and meet access requirements. If you are bringing children to the event, please make sure you have indicated as part of the EOI process, or email summit@commonthreads.org.au.",
      "We ask that parents/carers take responsibility for their children and be aware of the needs of other participants. We also ask that all participants are patient with, respectful and considerate of children and their parents/carers.",
      "Due to the low numbers of children attending, and guardian preferences to keep children with them during the event, creche/child care services will not be provided.",
    ],
  },
  {
    title: "Weather",
    paragraphs: [
      "Please check the weather ahead of the Summit and ensure you pack enough warm clothing and footwear. You can find the forecast for Adelaide here: https://www.bom.gov.au/sa/forecasts/adelaide.shtml.",
      "The venues will have appropriate heating (and air conditioning if needed) and we recommend packing layers to ensure you stay comfortable throughout.",
      "The Common Threads team will provide updates if there are any significant weather events forecast, including heavy rain.",
    ],
  },
  {
    title: "Illness Policy",
    paragraphs: [
      "Common Threads will bring together people from all corners of the country, working on a wide range of issues, from a diversity of perspectives. We are pleased to have Elders, young children, folks from remote communities and immunocompromised people joining us, and hope to ensure their safety and the safety of our communities.",
      "As such, we recommend that all attendees who are feeling unwell stay home.",
      "Masks, rapid tests and hand sanitiser will be provided. Hand sanitiser will also be available throughout the venue including food service areas.",
      "If you are experiencing cold or flu-like symptoms or are otherwise unwell, we ask that you please do not attend the event (eg. cough, sore throat, runny nose, fever, headache, etc).",
      "Please do not attend or travel to Common Threads if: you have COVID-19 or test positive on a Rapid Antigen Test or a PCR test; you are experiencing any cold or flu-like symptoms (eg. cough, sore throat, runny nose, fever, headache, etc) or are otherwise unwell; or you are a close contact of a confirmed COVID-19 case.",
      "If you are unable to attend Common Threads, please let us know as soon as possible at summit@commonthreads.org.au.",
      "If you test positive to COVID or become unwell while at the summit and are attending on a travel scholarship, we will work with you to make sure you have somewhere to stay while recovering, and help you with anything you need while there. Please let us know if you develop cold or flu-like symptoms while at the event: we be on hand to help with anything you need.",
    ],
  },
  {
    title: "Access Key",
    paragraphs: [
      "The Common Threads team is committed to creating spaces that are accessible for everyone who attends. The Adelaide Oval and Intercontinental Hotel are both fully wheelchair accessible.",
      "If you would like to further discuss your accessibility needs please contact our event coordinator Shikierra at summit@commonthreads.org.au.",
    ],
  },
  {
    title: "Wellbeing",
    paragraphs: [
      "During the summit we'll be touching on a lot of difficult topics including racism, deaths in custody, and other injustices that many participants and speakers have lived experiences of. These are important conversations to have but we know these discussions can take a toll on those in the room. There will be designated wellbeing support people available for a yarn throughout the summit.",
    ],
  },
  {
    title: "Nearby Essentials",
    paragraphs: [
      "Closest Pharmacy/chemist: Cacas Day/Night Chemist, 8:30am - 7pm, Mon - Fri. https://maps.app.goo.gl/5SSi2AQUYe2Q9d138",
      "Closest Convenience store: Adelaide Convenience Store, 24 hours. https://maps.app.goo.gl/s1tyCaibCS53PgaEA",
      "Closest Supermarket: Coles Rundle Mall, 7am - 9pm most days. https://maps.app.goo.gl/sjWn4h5hy8Zo92hZ9",
    ],
  },
];

export default async function Page() {
  const context = await getSummitContext();
  const venues = (await getVenuesAll(context.selectedSummitName)).sort((a, b) =>
    fieldString(a, "Name").localeCompare(fieldString(b, "Name")),
  );

  return (
    <div className="mx-auto w-full max-w-[980px] space-y-4">
      <SummitPageHeader title="Event Guidance" subtitle={SUMMIT_PAGE_SUBTITLE.eventGuidance} />

      <div className="space-y-3">
        {venues.length > 0 ? (
          <article className="rounded-xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-200">Venues</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {venues.map((venue) => {
                const venueName = fieldString(venue, "Name") || "Venue";
                return (
                  <Link
                    key={venue.id}
                    href={`/venues/${venue.id}`}
                    className="group rounded-lg border border-white/10 bg-white/5 p-3 transition hover:border-white/20 hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white">{venueName}</h3>
                      <ChevronRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-200/90 transition group-hover:text-amber-100" />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-stone-300">
                      {twoSentenceVenueSummary(venue)}
                    </p>
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200/90">
                      View venue page
                    </p>
                  </Link>
                );
              })}
            </div>
          </article>
        ) : null}

        {GUIDANCE_SECTIONS.map((section) => (
          <article key={section.title} className="rounded-xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-200">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-stone-200">
              {section.paragraphs.map((paragraph) => (
                <p key={`${section.title}-${paragraph}`}>{renderParagraphContent(paragraph)}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
