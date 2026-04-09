"use client";

import { Dialog } from "@headlessui/react";
import { useState } from "react";

type Props = {
  variant?: "onDark" | "default";
};

export default function UploadTermsNotice({ variant = "default" }: Props) {
  const [open, setOpen] = useState(false);

  const muted =
    variant === "onDark" ? "text-white/55" : "text-stone-600";
  const link =
    variant === "onDark"
      ? "font-medium text-amber-300 underline decoration-amber-300/50 underline-offset-2 hover:text-amber-200 hover:decoration-amber-200"
      : "font-medium text-amber-800 underline decoration-amber-800/40 underline-offset-2 hover:text-amber-900";

  return (
    <>
      <p className={`text-center text-xs leading-snug ${muted}`}>
        By uploading, you agree to the{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={link}
        >
          terms
        </button>
        .
      </p>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="relative z-[200]"
      >
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="max-h-[min(85vh,32rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 text-stone-900 shadow-xl ring-1 ring-black/5">
            <Dialog.Title className="text-lg font-semibold text-stone-900">
              Upload terms — intellectual property
            </Dialog.Title>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-stone-700">
              <p>
                By uploading photographs, images, or video to this shared album,
                you assign to{" "}
                <strong>Common Threads Indigenous Peoples Organisation</strong>{" "}
                all intellectual property rights (including copyright) that you
                hold in that uploaded content.
              </p>
              <p>
                Common Threads Indigenous Peoples Organisation may use,
                reproduce, publish, adapt, display, and distribute that content
                for purposes connected with its mission and activities,
                including community events, archives, storytelling, education,
                and promotion, without needing further permission from you for
                those uses.
              </p>
              <p>
                You confirm that you are the creator of the content or have all
                rights necessary to make this assignment, and that the content
                does not infringe anyone else&apos;s rights.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              Close
            </button>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}
