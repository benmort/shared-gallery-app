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
export const HOMESCREEN_PROMPT_COOKIE_NAME = "ct-homescreen-prompt-complete";

export const HOMESCREEN_PROMPT_TITLE = "SAVE TO HOME SCREEN";
export const HOMESCREEN_PROMPT_BODY =
  "For faster access during Summit, add Common Threads to your phone home screen.";
export const HOMESCREEN_PROMPT_ANDROID_BODY =
  "Tap Install to open your browser's install prompt, then confirm to add the app.";
export const HOMESCREEN_PROMPT_IOS_STEPS = [
  "Tap the Share button in Safari.",
  "Scroll down and select Add to Home Screen.",
  "Tap Add to finish.",
] as const;
export const HOMESCREEN_PROMPT_FALLBACK_BODY =
  "Use your browser menu and look for Install app or Add to Home Screen.";

type DashboardOnboardingSlide = {
  eyebrow: string;
  heading: string;
  paragraphs: readonly string[];
};

export const DASHBOARD_ONBOARDING_SLIDES: readonly DashboardOnboardingSlide[] = [
  {
    eyebrow: "WELCOME TO COMMON THREADS",
    heading: "Welcome To Common Threads",
    paragraphs: [
      "Common Threads is a three-day summit designed for, and by, First Nations people - to connect, yarn, learn, strategise and plan for action.",
    ],
  },
  {
    eyebrow: "BUILDING MOVEMENT POWER",
    heading: "In This Moment, We Organise Together",
    paragraphs: [
      "In the face of an emboldened far-right who are determined to attack progress on First Nations justice for their own political agenda, and Prime Minister Albanese distancing his government from a Treaty process.",
    ],
  },
  {
    eyebrow: "BUILDING MOVEMENT POWER",
    heading: "Building Power For Landback, Treaty And Justice",
    paragraphs: [
      "It's critical that we come together, organise and build the power of our movements to continue to fight for Landback, Treaty and Justice.",
    ],
  },
  {
    eyebrow: "OVER THREE DAYS",
    heading: "Connect, Learn, Share And Plan For Action",
    paragraphs: [
      "Over three days, we'll bring together hundreds of First Nations campaigners, organisers and changemakers to connect, learn, share and plan for action.",
    ],
  },
  {
    eyebrow: "WHAT WE'LL BUILD TOGETHER",
    heading: "A Shared Vision For Action",
    paragraphs: [
      "Together, we will create a shared vision and story of what's possible, identify ways to work together and build power of First Nations movements and campaigns.",
    ],
  },
] as const;
