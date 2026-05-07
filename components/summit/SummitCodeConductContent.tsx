"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useMemo } from "react";
import SummitPageHeader from "@/components/summit/SummitPageHeader";
import { roleHash } from "@/lib/summit/crew-filters";

type Props = {
  title: string;
  pageSubtitle: string;
  contentBody: string;
};

type ConductSection = {
  title: string;
  paragraphs: string[];
  bulletItems: string[];
};

type ContentBlock =
  | { type: "paragraph"; value: string }
  | { type: "section"; section: ConductSection }
  | { type: "principlesButton" };

const PRINCIPLES_LINE = "Please find the pintable PDF version here.";
const WELLBEING_ROLE = "Wellbeing and Grievance Coordinator";
const DUMMY_PDF_PATH = "/documents/common-threads-code-of-conduct.pdf";
const SUPPORT_EMAIL = "summit@commonthreads.org.au";

const SECTION_TITLE_HINTS = new Set([
  "our shared commitments",
  "how we show up",
  "care, safety & community",
  "shared responsibility",
]);

function isSectionHeading(line: string, nextNonEmpty: string | null): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed === PRINCIPLES_LINE) return false;
  if (trimmed.startsWith("- ")) return false;
  if (SECTION_TITLE_HINTS.has(trimmed.toLowerCase())) return true;
  if (trimmed.endsWith(":")) return false;
  return Boolean(nextNonEmpty && nextNonEmpty.trim().startsWith("- "));
}

function splitInlineChunks(value: string): string[] {
  return value.split(/(https?:\/\/\S+|summit@commonthreads\.org\.au)/g);
}

function renderInlineContent(value: string): React.ReactNode {
  return splitInlineChunks(value).map((chunk, index) => {
    if (chunk === SUPPORT_EMAIL) {
      return (
        <Link key={`${chunk}-${index}`} href={`mailto:${SUPPORT_EMAIL}`} className="text-amber-200 underline-offset-2 hover:underline">
          {SUPPORT_EMAIL}
        </Link>
      );
    }
    if (/^https?:\/\//.test(chunk)) {
      return (
        <a
          key={`${chunk}-${index}`}
          href={chunk}
          target="_blank"
          rel="noreferrer"
          className="text-amber-200 underline-offset-2 hover:underline"
        >
          {chunk}
        </a>
      );
    }
    return <span key={`${chunk}-${index}`}>{chunk}</span>;
  });
}

function toContentBlocks(contentBody: string): ContentBlock[] {
  const normalized = contentBody
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n");

  const lines = normalized.split("\n");
  const blocks: ContentBlock[] = [];
  let currentSection: ConductSection | null = null;
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    const value = paragraphLines.join("\n").trim();
    if (!value) {
      paragraphLines = [];
      return;
    }
    if (currentSection) {
      currentSection.paragraphs.push(value);
    } else {
      blocks.push({ type: "paragraph", value });
    }
    paragraphLines = [];
  };

  const flushSection = () => {
    if (!currentSection) return;
    flushParagraph();
    blocks.push({ type: "section", section: currentSection });
    currentSection = null;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    const nextNonEmptyLine = lines.slice(i + 1).find((candidate) => candidate.trim() !== "") ?? null;

    if (line.trim() === PRINCIPLES_LINE) {
      flushSection();
      flushParagraph();
      blocks.push({ type: "principlesButton" });
      continue;
    }

    if (trimmed === "") {
      flushParagraph();
      continue;
    }

    if (isSectionHeading(line, nextNonEmptyLine)) {
      flushSection();
      currentSection = { title: trimmed, paragraphs: [], bulletItems: [] };
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      if (!currentSection) {
        currentSection = { title: "Code of Conduct", paragraphs: [], bulletItems: [] };
      }
      currentSection.bulletItems.push(trimmed.replace(/^-+\s*/, ""));
      continue;
    }

    paragraphLines.push(trimmed);
  }

  flushSection();
  flushParagraph();
  return blocks;
}

export default function SummitCodeConductContent({ title, pageSubtitle, contentBody }: Props) {
  const blocks = useMemo(() => toContentBlocks(contentBody), [contentBody]);

  return (
    <>
      <div className="w-full space-y-4">
        <SummitPageHeader title={title} subtitle={pageSubtitle} />
        <div className="space-y-3">
          {blocks.map((block, index) => {
            if (block.type === "principlesButton") {
              return (
                <article key={`principles-${index}`} className="rounded-xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5">
                  <a
                    href={DUMMY_PDF_PATH}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-white/25 bg-black/25 px-4 py-2.5 text-sm font-semibold text-stone-100 transition hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
                  >
                    {PRINCIPLES_LINE}
                  </a>
                </article>
              );
            }

            if (block.type === "section") {
              return (
                <article key={`section-${block.section.title}-${index}`} className="rounded-xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-200">
                    {block.section.title}
                  </h2>
                  {block.section.paragraphs.length > 0 ? (
                    <div className="mt-3 space-y-3 text-sm leading-relaxed text-stone-200">
                      {block.section.paragraphs.map((paragraph) => (
                        <p key={`${block.section.title}-${paragraph}`}>
                          {paragraph.split("\n").map((line, lineIndex) => (
                            <span key={`${line}-${lineIndex}`}>
                              {lineIndex > 0 ? <br /> : null}
                              {renderInlineContent(line)}
                            </span>
                          ))}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {block.section.bulletItems.length > 0 ? (
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-200 marker:text-amber-200">
                      {block.section.bulletItems.map((item) => (
                        <li key={`${block.section.title}-${item}`}>{renderInlineContent(item)}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              );
            }

            return (
              <article key={`paragraph-${index}`} className="rounded-xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5">
                <div className="space-y-3 text-sm leading-relaxed text-stone-200">
                  <p>
                    {block.value.split("\n").map((line, lineIndex) => (
                      <span key={`${line}-${lineIndex}`}>
                        {lineIndex > 0 ? <br /> : null}
                        {renderInlineContent(line)}
                      </span>
                    ))}
                  </p>
                </div>
              </article>
            );
          })}

          <article className="rounded-xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5">
            <a
              href={DUMMY_PDF_PATH}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-white/25 bg-black/25 px-4 py-2.5 text-sm font-semibold text-stone-100 transition hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
            >
              {PRINCIPLES_LINE}
            </a>
            <p className="mt-4 text-sm leading-relaxed text-stone-200">
              If someone makes you or anyone else feel unsafe or unwelcome, please report it as soon as possible to
              our wellbeing and grievance coordinators for a confidential conversation.
            </p>
            <Link
              href={`/crew${roleHash(WELLBEING_ROLE)}`}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md bg-amber-500 px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-950 transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
            >
              Contact wellbeing and grievance coordinators
              <ChevronRightIcon className="h-5 w-5 shrink-0" aria-hidden />
            </Link>
          </article>
        </div>
      </div>
    </>
  );
}
