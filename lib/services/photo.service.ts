import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { EventModel } from "@/models/Event";
import { PhotoModel } from "@/models/Photo";
import { GalleryFolder } from "@/types";

const photoInputSchema = z.object({
  url: z.string().url(),
  eventId: z.string().min(1),
  uploadedBy: z.string().min(1),
  faceEmbedding: z.array(z.number()).optional(),
});

export async function createPhoto(input: unknown) {
  const payload = photoInputSchema.parse(input);
  await connectToDatabase();

  const photo = await PhotoModel.create(payload);

  return {
    id: photo._id.toString(),
    url: photo.url,
  };
}

export async function listGalleryFolders(userId: string) {
  await connectToDatabase();

  const eventQuery = {};

  const events = await EventModel.find(eventQuery).sort({ date: -1 }).lean();

  if (!events.length) {
    return [] satisfies GalleryFolder[];
  }

  const eventIds = events.map((event) => event._id);

  const photoCounts = await PhotoModel.aggregate<{
    _id: string;
    count: number;
    coverUrl: string | null;
  }>([
    {
      $match: {
        eventId: { $in: eventIds },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $group: {
        _id: "$eventId",
        count: { $sum: 1 },
        coverUrl: { $first: "$url" },
      },
    },
  ]);

  const countsMap = new Map(photoCounts.map((item) => [item._id.toString(), item]));

  return events.map((event) => {
    const match = countsMap.get(event._id.toString());

    return {
      id: event._id.toString(),
      title: event.title,
      date: event.date.toISOString(),
      location: event.location,
      coverUrl: match?.coverUrl ?? null,
      photoCount: match?.count ?? 0,
    } satisfies GalleryFolder;
  });
}
