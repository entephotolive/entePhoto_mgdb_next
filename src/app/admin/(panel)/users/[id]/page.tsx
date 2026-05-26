import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getPhotographerFullDetails } from "../actions";
import { PhotographerDetailPageClient } from "./photographer-detail-page-client";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const conn = await connectToDatabase();
    const user = await conn.connection
      .collection("users")
      .findOne({ _id: new ObjectId(id) }, { projection: { name: 1 } });
    return {
      title: user?.name ? `${user.name} — Admin` : "Photographer Details",
    };
  } catch {
    return { title: "Photographer Details" };
  }
}

export default async function PhotographerDetailPage({ params }: Props) {
  const { id } = await params;

  // Validate ObjectId
  if (!ObjectId.isValid(id)) notFound();

  const conn = await connectToDatabase();
  const db = conn.connection.db;
  if (!db) notFound();

  // Fetch user + details (all events, no limit)
  const [userDoc, details] = await Promise.all([
    db.collection("users").findOne({ _id: new ObjectId(id) }),
    getPhotographerFullDetails(id),
  ]);

  if (!userDoc) notFound();

  // Calculate total photos by summing individual event counts
  const totalPhotos = details.events.reduce((acc, event) => acc + event.photoCount, 0);

  const user = {
    _id: id,
    name: (userDoc.name as string) || "Photographer",
    email: (userDoc.email as string) || "",
    avatarUrl: (userDoc.avatarUrl as string) || null,
    phoneNumber: (userDoc.phoneNumber as string) || null,
    isApproved: (userDoc.isApproved as boolean) ?? false,
    createdAt: userDoc.createdAt instanceof Date
      ? userDoc.createdAt.toISOString()
      : null,
  };

  return (
    <PhotographerDetailPageClient
      user={user}
      profile={details.profile}
      events={details.events}
      totalPhotos={totalPhotos}
    />
  );
}
