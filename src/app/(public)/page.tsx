import { Hero } from "@/features/site/sections/Hero";
import { SearchByInterests } from "@/features/site/sections/SearchByInterests";
import { NewsEvents } from "@/features/site/sections/NewsEvents";
import { FinancingEducation } from "@/features/site/sections/FinancingEducation";
import { LearningThatFits } from "@/features/site/sections/LearningThatFits";

// Static reproduction of the Lemoore College homepage, in the real section order:
// hero → Search By Your Interests → Latest News & Events → Financing Your Education →
// Learning That Fits Your Life. The AI search + floating assistant (in the layout) are the
// three added improvements over the current official site.
export default function HomePage() {
  return (
    <>
      <Hero />
      <SearchByInterests />
      <NewsEvents />
      <FinancingEducation />
      <LearningThatFits />
    </>
  );
}
