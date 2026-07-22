import { Metadata } from "next";
import { listPublicFoldersByEvent } from "@/lib/services/folder.service";
import { getEventById } from "@/lib/services/event.service";

interface EventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ eid: string }>;
}

export async function generateMetadata({
  params,
}: Omit<EventLayoutProps, "children">): Promise<Metadata> {
  const { eid } = await params;
  let imageUrl = "/logo.jpeg"; // Fallback image
  let title = "Ente Photo Event";
  let description = "Join this event on Ente Photo to view and share moments.";

  try {
    const eventInfo = await getEventById(eid);
    if (eventInfo) {
      title = `${eventInfo.title} - Ente Photo`;
      description = `Join ${eventInfo.title} to view the live gallery and captured moments.`;
    }

    const result = await listPublicFoldersByEvent(eid);
    const folders = Array.isArray(result) ? result : (result as any).folders || [];
    
    // Find Cover Photo folder
    const coverFolder = folders.find(
      (f: any) => f.title && f.title.toLowerCase() === "cover photo"
    );

    if (coverFolder && coverFolder.coverUrl) {
      imageUrl = coverFolder.coverUrl;
    }
  } catch (error) {
    console.error("Error generating metadata for event:", error);
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function SingleEventLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
