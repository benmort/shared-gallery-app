import SummitDomainDetailPage from "@/components/summit/SummitDomainDetailPage";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <SummitDomainDetailPage domain="attractions" id={id} />;
}
