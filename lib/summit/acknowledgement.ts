export const ACKNOWLEDGEMENT_COUNTRY_TITLE = "ACKNOWLEDGEMENT OF COUNTRY";

export const ACKNOWLEDGEMENT_SOVEREIGNTY_STATEMENT =
  "Sovereignty has never been ceded - this always was and always will be Aboriginal land.";

export const ACKNOWLEDGEMENT_COUNTRY_PARAGRAPHS = [
  "The Common Threads National Summit will be held on the lands of the Kaurna people. The planning and organisation of Common Threads has taken place across the country, on the lands of many nations. We pay our respect to their Elders past and present, and thank them for their ongoing custodianship and continued fight to protect Country.",
  ACKNOWLEDGEMENT_SOVEREIGNTY_STATEMENT,
] as const;

export const ACKNOWLEDGEMENT_COOKIE_NAME = "ct-acknowledged-country";
export const ACKNOWLEDGEMENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const ACKNOWLEDGEMENT_ACCEPTED_EVENT = "ct:acknowledgement-accepted";

export const DASHBOARD_ONBOARDING_COOKIE_NAME = "ct-dashboard-onboarding-complete";

type DashboardOnboardingSlide = {
  eyebrow: string;
  heading: string;
  paragraphs: readonly string[];
};

export const DASHBOARD_ONBOARDING_SLIDES: readonly DashboardOnboardingSlide[] = [
  {
    eyebrow: "WELCOME TO COMMON THREADS",
    heading: "Welcome to Common Threads",
    paragraphs: [
      "Welcome to Common Threads, a three-day summit designed for, and by, First Nations people - to connect, yarn, learn, strategise and plan for action.",
    ],
  },
  {
    eyebrow: "BUILDING MOVEMENT POWER",
    heading: "In this moment, we organise together",
    paragraphs: [
      "In the face of an emboldened far-right who are determined to attack progress on First Nations justice for their own political agenda, and Prime Minister Albanese distancing his government from a Treaty process, it's critical that we come together, organise and build the power of our movements to continue to fight for Landback, Treaty and Justice.",
    ],
  },
  {
    eyebrow: "OVER THREE DAYS",
    heading: "Connect, learn, share and plan for action",
    paragraphs: [
      "Over three days, we'll bring together hundreds of First Nations campaigners, organisers and changemakers to connect, learn, share and plan for action.",
      "Together, we will create a shared vision and story of what's possible, identify ways to work together and build power of First Nations movements and campaigns.",
    ],
  },
  {
    eyebrow: "WELCOME",
    heading: "We are thrilled to have you with us",
    paragraphs: [
      "We are thrilled to have you with us.",
    ],
  },
] as const;
