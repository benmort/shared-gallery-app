import { Suspense } from "react";
import HomePage from "@/components/HomePage";
import SummitPageHeader from "@/components/summit/SummitPageHeader";
import SummitShell from "@/components/summit/SummitShell";
import { SUMMIT_PAGE_SUBTITLE } from "@/lib/summit/page-descriptors";

function HomeFallback() {
  return (
    <div className="px-4 py-6 text-center text-sm text-stone-400">
      Loading…
    </div>
  );
}

export default function MomentsPage() {
  return (
    <SummitShell>
      <div className="mx-auto mb-5 w-full max-w-[700px] lg:max-w-[940px]">
        <SummitPageHeader title="Moments" subtitle={SUMMIT_PAGE_SUBTITLE.moments} />
      </div>
      <Suspense fallback={<HomeFallback />}>
        <HomePage />
      </Suspense>
    </SummitShell>
  );
}
