import { redirect } from "next/navigation";

type Props = { params: Promise<{ photoId: string }> };

export default async function PhotoDeepLink({ params }: Props) {
  const { photoId } = await params;
  redirect(`/?photoId=${encodeURIComponent(photoId)}`);
}
