import { notFound } from "next/navigation";
import { getStudioByEventId } from "@/app/admin/(dashboard)/profile/action";
import { StudioView } from "./studio-view";

interface Props {
  params: Promise<{ eid: string }>;
}

export default async function StudioPage({ params }: Props) {
  const { eid } = await params;

  const data = await getStudioByEventId(eid);
  if (!data || typeof data === "string" || !data.profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-8 py-6 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-red-600">
            Event Not Found
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            The event you are looking for does not exist or may have been
            removed.
          </p>
        </div>
      </div>
    );
  }
  return <StudioView profile={data.profile} portfolio={data.portfolio || []} />;
}
