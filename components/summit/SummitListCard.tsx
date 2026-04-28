import Image from "next/image";
import Link from "next/link";
import type { ListItemView } from "@/lib/summit/types";

type Props = {
  href: string;
  item: ListItemView;
};

export default function SummitListCard({ href, item }: Props) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
    >
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.title}
          width={112}
          height={80}
          className="h-20 w-28 rounded-md object-cover"
          unoptimized
        />
      ) : (
        <div className="h-20 w-28 rounded-md bg-white/5" />
      )}
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
