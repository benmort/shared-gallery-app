type Props = {
  variant?: "album" | "home" | "heroDark";
};

export default function EmptyState({ variant = "album" }: Props) {
  if (variant === "heroDark") {
    return (
      <p className="text-center text-sm text-white/60">
        No photos selected yet. Choose from your library or take one with your
        camera.
      </p>
    );
  }
  if (variant === "home") {
    return (
      <p className="text-center text-sm text-stone-400">
        No photos selected yet. Choose from your library or take one with your camera.
      </p>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <div className="rounded-2xl bg-white/10 px-5 py-4 text-4xl" aria-hidden>
        🖼️
      </div>
      <h2 className="text-lg font-medium text-stone-100">No photos yet</h2>
      <p className="max-w-xs text-sm leading-relaxed text-stone-400">
        Be the first to add a moment. Use the card above to upload or capture
        from your phone.
      </p>
    </div>
  );
}
