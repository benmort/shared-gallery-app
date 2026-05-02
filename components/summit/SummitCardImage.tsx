"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  circular?: boolean;
};

export default function SummitCardImage({ src, alt, circular = false }: Props) {
  const [loaded, setLoaded] = useState(false);
  const wrapperClass = circular
    ? "relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-white/5"
    : "relative h-20 w-28 shrink-0 overflow-hidden rounded-md bg-white/5";

  return (
    <div className={wrapperClass}>
      {!loaded ? <div aria-hidden className="absolute inset-0 animate-pulse bg-white/10" /> : null}
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        unoptimized
      />
    </div>
  );
}
