import { Suspense } from "react";
import HomePage from "@/components/HomePage";
import SummitShell from "@/components/summit/SummitShell";

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
      <Suspense fallback={<HomeFallback />}>
        <HomePage />
      </Suspense>
    </SummitShell>
  );
}
