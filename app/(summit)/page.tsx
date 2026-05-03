import SummitDashboardOnboardingGate from "@/components/summit/SummitDashboardOnboardingGate";
import SummitDashboardPage from "@/components/summit/SummitDashboardPage";

export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <SummitDashboardOnboardingGate>
      <SummitDashboardPage />
    </SummitDashboardOnboardingGate>
  );
}
