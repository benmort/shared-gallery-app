import SummitEmpty from "@/components/summit/SummitEmpty";
import SummitScheduleTimeline from "@/components/summit/SummitScheduleTimeline";
import { getSummitContext } from "@/lib/summit/context";
import { buildScheduleDays } from "@/lib/summit/schedule";
import { getEventsAll, getScheduleAll, getSpeakersAll } from "@/lib/summit/service";

export default async function SummitSchedulePage() {
  const context = await getSummitContext();
  const [schedule, events, speakers] = await Promise.all([
    getScheduleAll(context.selectedSummitName),
    getEventsAll(context.selectedSummitName),
    getSpeakersAll(context.selectedSummitName),
  ]);

  const scheduleDays = buildScheduleDays(schedule, events, speakers);

  if (!scheduleDays.length) {
    return (
      <SummitEmpty
        title="No schedule available"
        body="Select another summit or check back after content is published."
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[700px] space-y-5 lg:max-w-[940px]">
      <header className="space-y-2">
        <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-stone-300">
          <span className="h-px w-7 bg-amber-300/80" />
          Event Agenda
        </p>
        <h1 className="text-4xl font-semibold leading-none text-white">Schedule</h1>
      </header>
      <SummitScheduleTimeline days={scheduleDays} />
    </div>
  );
}
