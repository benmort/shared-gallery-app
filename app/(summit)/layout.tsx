import SummitShell from "@/components/summit/SummitShell";

export default async function SummitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SummitShell>{children}</SummitShell>;
}
