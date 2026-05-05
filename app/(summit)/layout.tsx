import SummitShell from "@/components/summit/SummitShell";
import { getWhatsappChannelsStatic } from "@/lib/summit/service";

export default async function SummitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const whatsappChannels = await getWhatsappChannelsStatic();
  return <SummitShell whatsappChannels={whatsappChannels}>{children}</SummitShell>;
}
