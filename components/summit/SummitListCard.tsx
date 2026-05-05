"use client";

import Image from "next/image";
import Link from "next/link";
import type { ListItemView } from "@/lib/summit/types";
import SummitCardImage from "@/components/summit/SummitCardImage";
import { hasOffWhiteLogoBackground } from "@/lib/summit/logo-background";

type Props = {
  href: string;
  item: ListItemView;
  circularImage?: boolean;
  showImage?: boolean;
  showImageSkeleton?: boolean;
};

export default function SummitListCard({
  href,
  item,
  circularImage = false,
  showImage = true,
  showImageSkeleton = false,
}: Props) {
  const isOrganisationCard = item.id.startsWith("organisation-");
  const usesOffWhiteLogoBackground = !circularImage && hasOffWhiteLogoBackground(item.id);
  const rectangularImageBackgroundClass = isOrganisationCard
    ? (usesOffWhiteLogoBackground ? "bg-white" : "bg-black")
    : "bg-white/5";
  const imageClass = circularImage
    ? "h-20 w-20 rounded-full object-cover"
    : `h-20 w-28 rounded-md ${rectangularImageBackgroundClass} object-contain p-1`;
  const placeholderClass = circularImage
    ? "h-20 w-20 rounded-full bg-white/5"
    : `h-20 w-28 rounded-md ${rectangularImageBackgroundClass}`;
  const cardClass = showImage
    ? "flex items-start gap-4 rounded-xl border border-white/35 bg-white/5 p-4 transition hover:border-white/55 hover:bg-white/10"
    : "rounded-xl border border-white/35 bg-white/5 p-4 transition hover:border-white/55 hover:bg-white/10";

  return (
    <Link
      href={href}
      className={cardClass}
    >
      {showImage
        ? item.imageUrl
          ? (
              showImageSkeleton
                ? (
                    <SummitCardImage src={item.imageUrl} alt={item.title} circular={circularImage} />
                  )
                : (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      width={112}
                      height={80}
                      className={imageClass}
                      unoptimized
                    />
                  )
            )
          : <div className={placeholderClass} />
        : null}
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-white break-words">{item.title}</h3>
        {item.subtitle ? (
          <p className="mt-1 text-xs text-stone-300 break-words">{item.subtitle}</p>
        ) : null}
        {item.description ? <p className="mt-2 text-xs text-stone-400 break-words">{item.description}</p> : null}
        {item.tags && item.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <span
                key={`${item.id}-${tag}`}
                className="rounded-full bg-amber-600/20 px-2 py-0.5 text-[10px] text-amber-200"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
