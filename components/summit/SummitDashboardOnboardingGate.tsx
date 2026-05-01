"use client";

import {
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import SummitAcknowledgementOverlay from "@/components/summit/SummitAcknowledgementOverlay";
import {
  ACKNOWLEDGEMENT_ACCEPTED_EVENT,
  ACKNOWLEDGEMENT_COOKIE_MAX_AGE_SECONDS,
  ACKNOWLEDGEMENT_COOKIE_NAME,
  DASHBOARD_ONBOARDING_COOKIE_NAME,
  DASHBOARD_ONBOARDING_SLIDES,
} from "@/lib/summit/acknowledgement";

type Props = {
  children: React.ReactNode;
};

type GateStage = "checking" | "acknowledgement" | "onboarding" | "ready";

const ONBOARDING_PANEL_VISUALS = [
  {
    numberClass: "text-orange-400",
    headingClass: "text-stone-200",
    bodyClass: "text-stone-200",
    ruleClass: "border-orange-400/90",
  },
  {
    numberClass: "text-orange-400",
    headingClass: "text-stone-200",
    bodyClass: "text-stone-200",
    ruleClass: "border-orange-400/90",
  },
  {
    numberClass: "text-orange-400",
    headingClass: "text-stone-200",
    bodyClass: "text-stone-200",
    ruleClass: "border-orange-400/90",
  },
  {
    numberClass: "text-orange-400",
    headingClass: "text-stone-200",
    bodyClass: "text-stone-200",
    ruleClass: "border-orange-400/90",
  },
] as const;

function hasCookie(name: string): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .some((part) => part.startsWith(`${name}=`));
}

function setCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; Max-Age=${ACKNOWLEDGEMENT_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

function OnboardingLandscape({ slideIndex }: { slideIndex: number }) {
  const panPercentPerStep = 25;
  const backgroundWidthRatio = 4;
  const panOffset = -slideIndex * panPercentPerStep;

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-y-[-6%] left-0 bg-cover bg-no-repeat transition-transform duration-700 ease-out"
        style={{
          width: `${backgroundWidthRatio * 100}%`,
          transform: `translateX(${panOffset}%)`,
          backgroundImage: "url('/images/flinders-filtered.png')",
          backgroundPosition: "left center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/32 via-black/46 to-black/85" />
    </div>
  );
}

function SummitOnboardingOverlay({
  slideIndex,
  onAdvance,
  onSkip,
}: {
  slideIndex: number;
  onAdvance: () => void;
  onSkip: () => void;
}) {
  const isFinalSlide = slideIndex === DASHBOARD_ONBOARDING_SLIDES.length - 1;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="fixed inset-0 z-[260] overflow-hidden bg-black text-stone-100">
      <OnboardingLandscape slideIndex={slideIndex} />
      <div
        className={`relative mx-auto flex h-full w-full max-w-5xl flex-col px-5 pb-6 pt-6 transition-opacity duration-500 ease-out sm:px-10 sm:pb-10 sm:pt-10 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-100/90">
          Slide {slideIndex + 1} of {DASHBOARD_ONBOARDING_SLIDES.length}
        </p>
        <div className="mt-3 flex items-center gap-1.5">
          {DASHBOARD_ONBOARDING_SLIDES.map((slide, index) => (
            <span
              key={`${slide.heading}-progress`}
              aria-hidden
              className={
                index === slideIndex
                  ? "h-1.5 w-8 rounded-full bg-amber-300"
                  : "h-1.5 w-3 rounded-full bg-white/35"
              }
            />
          ))}
        </div>

        <div className="relative mt-4 flex-1 overflow-hidden">
          <div
            className="flex h-full transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${slideIndex * 100}%)` }}
          >
            {DASHBOARD_ONBOARDING_SLIDES.map((slide, index) => {
              const visual = ONBOARDING_PANEL_VISUALS[index % ONBOARDING_PANEL_VISUALS.length];

              return (
                <section key={slide.heading} className="flex h-full w-full shrink-0 items-end px-3 sm:px-8">
                  <article className="relative mx-auto flex h-2/3 w-full max-w-[460px] flex-col rounded-[30px] border-2 border-black bg-black/20">
                    <div className="relative flex h-full flex-col p-5 sm:p-7">
                      <p className={`text-5xl font-black leading-none sm:text-6xl ${visual.numberClass}`}>
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <div className={`mt-3 border-t-2 border-dashed ${visual.ruleClass}`} />
                      <h2
                        className={`mt-4 text-balance text-3xl font-extrabold leading-tight sm:text-4xl ${visual.headingClass}`}
                      >
                        {slide.heading}
                      </h2>
                      <div className={`mt-5 space-y-3 overflow-y-auto pr-1 text-base leading-relaxed sm:text-lg ${visual.bodyClass}`}>
                        {slide.paragraphs.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  </article>
                </section>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5 sm:mt-7 sm:gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="col-span-1 inline-flex min-h-11 items-center justify-center rounded-full border border-white/25 bg-black/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-100 transition hover:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={onAdvance}
            className="col-span-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-amber-500 px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-950 transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
          >
            {isFinalSlide ? "Enter Summit" : "Next"}
            <ChevronRightIcon className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-500 ease-out ${
          visible ? "opacity-0" : "opacity-100"
        }`}
      />
    </div>
  );
}

export default function SummitDashboardOnboardingGate({ children }: Props) {
  const [stage, setStage] = useState<GateStage>("checking");
  const [slideIndex, setSlideIndex] = useState(0);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    if (hasCookie(DASHBOARD_ONBOARDING_COOKIE_NAME)) {
      setStage("ready");
      return;
    }

    setStage(hasCookie(ACKNOWLEDGEMENT_COOKIE_NAME) ? "onboarding" : "acknowledgement");
  }, []);

  useEffect(() => {
    if (stage !== "ready") {
      setShowDashboard(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setShowDashboard(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [stage]);

  const acceptAcknowledgement = () => {
    setCookie(ACKNOWLEDGEMENT_COOKIE_NAME, "1");
    window.dispatchEvent(new Event(ACKNOWLEDGEMENT_ACCEPTED_EVENT));
    setSlideIndex(0);
    setStage("onboarding");
  };

  const advanceSlide = () => {
    if (slideIndex < DASHBOARD_ONBOARDING_SLIDES.length - 1) {
      setSlideIndex((current) => current + 1);
      return;
    }

    completeOnboarding();
  };

  const completeOnboarding = () => {
    setCookie(DASHBOARD_ONBOARDING_COOKIE_NAME, "1");
    setStage("ready");
  };

  return (
    <>
      {stage === "ready" ? (
        <div className={`transition-opacity duration-700 ease-out ${showDashboard ? "opacity-100" : "opacity-0"}`}>
          {children}
        </div>
      ) : null}

      {stage === "checking" ? <div aria-hidden className="fixed inset-0 z-[250] bg-zinc-950" /> : null}

      <SummitAcknowledgementOverlay open={stage === "acknowledgement"} onAccept={acceptAcknowledgement} />

      {stage === "onboarding" ? (
        <SummitOnboardingOverlay
          slideIndex={slideIndex}
          onAdvance={advanceSlide}
          onSkip={completeOnboarding}
        />
      ) : null}
    </>
  );
}
