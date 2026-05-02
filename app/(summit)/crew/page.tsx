import SummitDomainListPage from "@/components/summit/SummitDomainListPage";

type Props = {
  searchParams?: Promise<{ role?: string }>;
};

export default async function Page({ searchParams }: Props) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  return <SummitDomainListPage domain="crew" roleFilter={resolvedSearchParams?.role} />;
}
