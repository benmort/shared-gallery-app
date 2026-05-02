"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Props = {
  subtitle: string;
  contentBody: string;
};

type ContentBlock =
  | { type: "paragraph"; value: string }
  | { type: "principlesButton" };

const PRINCIPLES_LINE = "Please read principles and full code of conduct here.";
const WELLBEING_ROLE = "Wellbeing and Grievance Coordinator";
const DUMMY_PDF_PATH = "/documents/common-threads-code-of-conduct.pdf";
const DUMMY_PDF_EMBED_PATH = `${DUMMY_PDF_PATH}#toolbar=0&navpanes=0&scrollbar=0`;

function toContentBlocks(contentBody: string): ContentBlock[] {
  const normalized = contentBody
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n");
  const blocks: ContentBlock[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    const value = paragraphLines.join("\n").trim();
    if (value) blocks.push({ type: "paragraph", value });
    paragraphLines = [];
  };

  for (const line of normalized.split("\n")) {
    if (line.trim() === PRINCIPLES_LINE) {
      flushParagraph();
      blocks.push({ type: "principlesButton" });
      continue;
    }
    if (line.trim() === "") {
      flushParagraph();
      continue;
    }
    paragraphLines.push(line);
  }

  flushParagraph();
  return blocks;
}

export default function SummitCodeConductContent({ subtitle, contentBody }: Props) {
  const [showPdf, setShowPdf] = useState(false);
  const blocks = useMemo(() => toContentBlocks(contentBody), [contentBody]);
  const closePdf = () => setShowPdf(false);

  useEffect(() => {
    if (!showPdf) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePdf();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showPdf]);

  return (
    <>
      <article className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h1 className="text-2xl font-semibold text-white">Code of Conduct</h1>
        <h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-amber-200 sm:text-base">{subtitle}</h2>

        <div className="mt-4 space-y-4 text-sm leading-relaxed text-stone-200">
          {blocks.map((block, index) =>
            block.type === "principlesButton" ? (
              <button
                key={`principles-${index}`}
                type="button"
                onClick={() => setShowPdf(true)}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-white/25 bg-black/25 px-4 py-2.5 text-sm font-semibold text-stone-100 transition hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
              >
                {PRINCIPLES_LINE}
              </button>
            ) : (
              <p key={`paragraph-${index}`}>
                {block.value.split("\n").map((line, lineIndex) => (
                  <span key={`${line}-${lineIndex}`}>
                    {lineIndex > 0 ? <br /> : null}
                    {line}
                  </span>
                ))}
              </p>
            ),
          )}
        </div>

        <div className="mt-7">
          <Link
            href={`/crew?role=${encodeURIComponent(WELLBEING_ROLE)}`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md bg-amber-500 px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-950 transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
          >
            Contact wellbeing and grievance coordinators
            <ChevronRightIcon className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </article>

      {showPdf ? (
        <div className="fixed inset-0 z-[350] flex flex-col bg-black">
          <header className="border-b border-white/10 bg-zinc-950/90 backdrop-blur">
            <div className="mx-auto flex w-full max-w-[1100px] items-center justify-end px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={closePdf}
                className="rounded-full border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-stone-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
                aria-label="Close full code of conduct PDF"
              >
                Close
              </button>
            </div>
          </header>
          <iframe
            title="Code of Conduct PDF"
            src={DUMMY_PDF_EMBED_PATH}
            className="min-h-0 flex-1 w-full"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : null}
    </>
  );
}
