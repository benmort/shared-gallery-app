"use client";

import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useRef, useState } from "react";
import SummitListCard from "@/components/summit/SummitListCard";
import type { ListItemView } from "@/lib/summit/types";

const DEFAULT_BATCH_SIZE = 20;

export type SummitListCardEntry = {
  id: string;
  href: string;
  item: ListItemView;
};

type Props = {
  items: SummitListCardEntry[];
  batchSize?: number;
  circularImage?: boolean;
  showImage?: boolean;
  showImageSkeleton?: boolean;
};

export default function SummitBatchedListGrid({
  items,
  batchSize = DEFAULT_BATCH_SIZE,
  circularImage = false,
  showImage = true,
  showImageSkeleton = false,
}: Props) {
  const effectiveBatchSize = batchSize > 0 ? batchSize : DEFAULT_BATCH_SIZE;
  const [visibleCount, setVisibleCount] = useState(Math.min(effectiveBatchSize, items.length));
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    setVisibleCount((previous) => Math.min(previous + effectiveBatchSize, items.length));
  }, [effectiveBatchSize, items.length]);

  useEffect(() => {
    setVisibleCount(Math.min(effectiveBatchSize, items.length));
  }, [effectiveBatchSize, items.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.length > 0 && entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {items.slice(0, visibleCount).map((entry) => (
          <SummitListCard
            key={entry.id}
            href={entry.href}
            item={entry.item}
            circularImage={circularImage}
            showImage={showImage}
            showImageSkeleton={showImageSkeleton}
          />
        ))}
      </div>
      {hasMore ? (
        <div className="flex flex-col items-center gap-3">
          <div ref={sentinelRef} className="h-px w-full" aria-hidden />
          <button
            type="button"
            onClick={loadMore}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/15 bg-zinc-900/80 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-100 transition hover:bg-zinc-800/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200/80"
          >
            <ArrowDownTrayIcon className="h-3.5 w-3.5" aria-hidden />
            Load more organisations
          </button>
          <p className="text-[11px] text-stone-500">
            Showing {visibleCount} of {items.length}
          </p>
        </div>
      ) : null}
    </div>
  );
}
