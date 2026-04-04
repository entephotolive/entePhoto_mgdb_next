import { connectToDatabase } from "@/lib/db/mongodb";
import { EventModel } from "@/models/Event";
import { PhotoModel } from "@/models/Photo";
import { UserModel } from "@/models/User";
import { PhotographerSummary } from "@/types";

export async function listPhotographers() {
  await connectToDatabase();

  const photographers = await UserModel.find({ role: "photographer" }).lean();

  const [eventCounts, photoCounts] = await Promise.all([
    EventModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$createdBy", count: { $sum: 1 } } },
    ]),
    PhotoModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$uploadedBy", count: { $sum: 1 } } },
    ]),
  ]);

  const eventCountMap = new Map(eventCounts.map((item) => [item._id.toString(), item.count]));
  const photoCountMap = new Map(photoCounts.map((item) => [item._id.toString(), item.count]));

  return photographers.map(
    (photographer) =>
      ({
        id: photographer._id.toString(),
        name: photographer.name,
        email: photographer.email,
        eventCount: eventCountMap.get(photographer._id.toString()) ?? 0,
        photoCount: photoCountMap.get(photographer._id.toString()) ?? 0,
      }) satisfies PhotographerSummary,
  );
}
