// Static homepage content mirroring the real Lemoore College homepage sections.
//
// Headings, section descriptions, interest categories, and card labels are taken from the
// real public homepage. Time-sensitive items (events/news) are illustrative prototype
// content and are clearly labeled as such in the UI; they are not fabricated policies,
// deadlines, prices, or contacts.

/** Rotating hero slides (headline + CTA), reproducing the real promotional banner. */
export const HERO_SLIDES = [
  {
    eyebrow: "Fall 2026",
    headline: "Open Registration Is Here",
    body: "View the course schedule and register today. Your future starts at Lemoore College.",
    cta: "View Course Schedule & Register",
  },
  {
    eyebrow: "Golden Eagles",
    headline: "We Are the College in Your Backyard",
    body: "Affordable, accredited programs close to home — it starts here.",
    cta: "Start Your Application",
  },
] as const;

/** "Search By Your Interests" academic-interest categories (real list from the homepage). */
export const INTEREST_CATEGORIES = [
  "Agriculture",
  "Arts, Language & Communication",
  "Business",
  "Child Development & Education",
  "Culinary Arts & Hospitality Management",
  "GE for Transfer",
  "Health Careers",
  "Information Communication Technology",
  "Public Safety",
  "Science, Technology, Engineering & Mathematics",
  "Social & Behavioral Sciences",
  "Skilled Trades",
] as const;

/** Upcoming events (illustrative prototype content). */
export const UPCOMING_EVENTS = [
  { date: "Aug 4", title: "Eagle Registration" },
  { date: "Aug 5", title: "Instruction Ends" },
  { date: "Aug 6", title: "Professional Dev Day — No Classes (Flex)" },
  { date: "Aug 7", title: "Professional Dev Day — No Classes (Duty)" },
] as const;

/** Announcements (illustrative prototype content). */
export const ANNOUNCEMENTS = [
  "Reminder: drop-for-nonpayment deadline is approaching for the term.",
  "Our commitment to a campus of safety and respect for every student.",
  "New episode of the Golden Eagles student podcast is now available.",
] as const;

/** News highlights (illustrative prototype content). */
export const NEWS = [
  "Lemoore College recognized among top community colleges in the region.",
  "New transfer partnership expands pathways to a four-year degree.",
  "Students showcase projects at the annual STEM conference.",
] as const;

/** "Financing Your Education" cards. Each maps to a real official page (opened via search). */
export const FINANCING_CARDS = [
  {
    title: "Cost of Attendance",
    body: "Get the facts on program costs and fees.",
  },
  {
    title: "Financial Aid",
    body: "Most students receive financial aid — see how it works.",
  },
  {
    title: "Grants & Scholarships",
    body: "Get money you don't have to pay back.",
  },
] as const;

/** "Learning That Fits Your Life" audience cards. */
export const AUDIENCE_CARDS = [
  {
    title: "Future Students",
    body: "Discover your purpose and kick-start your career, whether you're a first-time or transfer student.",
  },
  {
    title: "Adult Learners",
    body: "Flexible options including ESL and citizenship preparation to fit your goals and schedule.",
  },
  {
    title: "Career-Focused Training",
    body: "Short-term certificates and skills training to move you into the workforce faster.",
  },
] as const;
