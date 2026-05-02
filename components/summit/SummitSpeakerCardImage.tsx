"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  alt: string;
};

export default function SummitSpeakerCardImage({ src, alt }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded ? <div aria-hidden className="absolute inset-0 animate-pulse bg-white/10" /> : null}
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover transition duration-300 group-hover:scale-[1.03] ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setLoaded(true)}
        unoptimized
      />
    </>
  );
}
