import LandingPage from "@/components/LandingPage";

export const metadata = {
  title: "App Sprint",
};

export default function AppSprintPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  return <LandingPage searchParams={searchParams} />;
}
