import { Suspense } from "react";
import HomePage from "@/components/HomePage";
import SummitPageHeader from "@/components/summit/SummitPageHeader";
import SummitShell from "@/components/summit/SummitShell";
import { SUMMIT_PAGE_SUBTITLE } from "@/lib/summit/page-descriptors";
import { getWhatsappChannelsStatic } from "@/lib/summit/service";

function HomeFallback() {
  return (
    <div className="px-4 py-6 text-center text-sm text-stone-400">
      Loading…
    </div>
  );
}

export default async function MomentsPage() {
  const whatsappChannels = await getWhatsappChannelsStatic();

  return (
    <SummitShell whatsappChannels={whatsappChannels}>
      <div className="mb-5 w-full">
        <SummitPageHeader title="Moments" subtitle={SUMMIT_PAGE_SUBTITLE.moments} />
      </div>
      <Suspense fallback={<HomeFallback />}>
        <HomePage />
      </Suspense>
    </SummitShell>
  );
}
