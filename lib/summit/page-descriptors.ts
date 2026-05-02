import type { SummitListDomain } from "@/lib/summit/types";

export const SUMMIT_PAGE_SUBTITLE = {
  home: "Summit dashboard and quick links",
  program: "Session agenda and daily timings",
  eventGuidance: "Travel logistics, access and wellbeing",
  speakers: "Meet summit speakers and contributors",
  crew: "Find the summit support team",
  moments: "Shared photos and videos gallery",
  venues: "Venue locations, maps and access",
  events: "Sessions, breaks and activity blocks",
  attractions: "Things to do around summit",
  organisations: "Participating organisations and network partners",
  sponsors: "Supporting partners behind the summit",
  surveys: "Feedback forms and pulse checks",
  codeConduct: "Community safety expectations and support",
} as const;

export const SUMMIT_MENU_SUBTITLE_BY_HREF: Record<string, string> = {
  "/": SUMMIT_PAGE_SUBTITLE.home,
  "/program": SUMMIT_PAGE_SUBTITLE.program,
  "/event-guidance": SUMMIT_PAGE_SUBTITLE.eventGuidance,
  "/speakers": SUMMIT_PAGE_SUBTITLE.speakers,
  "/crew": SUMMIT_PAGE_SUBTITLE.crew,
  "/moments": SUMMIT_PAGE_SUBTITLE.moments,
  "/venues": SUMMIT_PAGE_SUBTITLE.venues,
  "/events": SUMMIT_PAGE_SUBTITLE.events,
  "/attractions": SUMMIT_PAGE_SUBTITLE.attractions,
  "/organisations": SUMMIT_PAGE_SUBTITLE.organisations,
  "/sponsors": SUMMIT_PAGE_SUBTITLE.sponsors,
  "/surveys": SUMMIT_PAGE_SUBTITLE.surveys,
  "/code-conduct": SUMMIT_PAGE_SUBTITLE.codeConduct,
};

export const SUMMIT_DOMAIN_SUBTITLE_BY_DOMAIN: Partial<Record<SummitListDomain, string>> = {
  speakers: SUMMIT_PAGE_SUBTITLE.speakers,
  crew: SUMMIT_PAGE_SUBTITLE.crew,
  venues: SUMMIT_PAGE_SUBTITLE.venues,
  events: SUMMIT_PAGE_SUBTITLE.events,
  attractions: SUMMIT_PAGE_SUBTITLE.attractions,
  organisations: SUMMIT_PAGE_SUBTITLE.organisations,
  sponsors: SUMMIT_PAGE_SUBTITLE.sponsors,
};
