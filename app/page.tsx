import { Suspense } from "react";
import HomePage from "@/components/HomePage";

function HomeFallback() {
  return (
    <div className="min-h-dvh bg-black px-4 py-6 text-center text-sm text-stone-400">
      Loading…
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomePage />
    </Suspense>
  );
}
