import { notFound } from "next/navigation";
import { getStudioByEventId } from "@/app/admin/(dashboard)/profile/action";
import { StudioView } from "./studio-view";

interface Props {
  params: Promise<{ eid: string }>;
}

export default async function StudioPage({ params }: Props) {
  const { eid } = await params;

  const data = await getStudioByEventId(eid);

  if (!data || !data.profile) {
    notFound();
  }

  return (
    <StudioView 
      profile={data.profile} 
      portfolio={data.portfolio || []} 
    />
  );
}
