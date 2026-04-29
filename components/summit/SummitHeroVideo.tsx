"use client";

import { useState } from "react";

type Props = {
  src: string;
  className?: string;
};

export default function SummitHeroVideo({ src, className = "" }: Props) {
  const [isReady, setIsReady] = useState(false);

  function handleReady() {
    setIsReady(true);
  }

  return (
    <video
      className={`${className} transition-opacity duration-700 ease-out ${isReady ? "opacity-100" : "opacity-0"}`}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      aria-hidden
      onCanPlayThrough={handleReady}
      onLoadedData={handleReady}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
