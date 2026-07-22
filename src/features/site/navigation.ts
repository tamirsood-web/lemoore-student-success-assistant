// Navigation model for the reproduced Lemoore College header/footer.
//
// Labels + order mirror the real public site. In this prototype every ordinary navigation
// item is INACTIVE (rendered as an accessible disabled control) — only AI search, the
// assistant, the mobile menu, and official source links returned by search/chat work.

/** Top utility-bar links (sister campuses + district + quick actions). */
export const UTILITY_LINKS = [
  "Lemoore",
  "Coalinga",
  "Firebaugh",
  "District",
  "Information For",
  "myWestHills",
  "Course Schedule",
] as const;

/** Main navigation top-level items, in the real site's order. */
export const MAIN_NAV = [
  "Academics",
  "Admissions",
  "Resources",
  "Student Life",
  "About",
  "Golden Eagles Athletics",
] as const;

/** Footer link groups (structure mirrors the real institutional footer). */
export const FOOTER_GROUPS: ReadonlyArray<{
  readonly heading: string;
  readonly links: readonly string[];
}> = [
  {
    heading: "Lemoore College",
    links: ["Employment", "Help Desk", "Contact Us", "myWestHills"],
  },
  {
    heading: "District",
    links: ["West Hills Foundation", "Accreditation", "Disclosures"],
  },
  {
    heading: "Quick Links",
    links: ["Board of Trustees Agenda", "Apply Today", "Course Schedule"],
  },
];

/** Footer legal/bottom links. */
export const FOOTER_LEGAL = [
  "Accessibility",
  "Compliance",
  "Privacy Policy",
] as const;

/** Public contact block shown in the footer (real, public Lemoore College info). */
export const CONTACT = {
  address: "555 College Ave., Lemoore, CA 93245",
  phone: "559-925-3000",
  district: "West Hills Community College District",
} as const;

/** Social platforms shown in the footer (icons only; inactive in the prototype). */
export const SOCIAL = [
  "Facebook",
  "Instagram",
  "TikTok",
  "X",
  "YouTube",
  "LinkedIn",
] as const;
