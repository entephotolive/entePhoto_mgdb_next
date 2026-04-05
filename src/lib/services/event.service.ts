import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { EventModel } from "@/models/Event";
import { EventListItem } from "@/types";

const eventInputSchema = z.object({
  title: z.string().min(3),
  date: z.string().datetime(),
  location: z.string().min(2),
  createdBy: z.string().min(1),
});

export async function listEvents(userId: string) {
  await connectToDatabase();

  const query = {};

  const events = await EventModel.find(query)
    .populate("createdBy", "name")
    .sort({ date: 1 })
    .lean();

  return events.map(
    (event) =>
      ({
        id: event._id.toString(),
        title: event.title,
        date: event.date.toISOString(),
        location: event.location,
        createdBy: {
          id: (event.createdBy as any)?._id?.toString?.() ?? userId,
          name: (event.createdBy as any)?.name ?? "Unknown",
        },
      }) satisfies EventListItem,
  );
}

export async function createEvent(input: unknown) {
  const payload = eventInputSchema.parse(input);
  await connectToDatabase();

  const event = await EventModel.create({
    ...payload,
    date: new Date(payload.date),
  });

  return {
    id: event._id.toString(),
    title: event.title,
    date: event.date.toISOString(),
    location: event.location,
    createdBy: {
      id: event.createdBy.toString(),
      name: "Assigned User",
    },
  } satisfies EventListItem;
}

export async function getEventById(eventId: string) {
  await connectToDatabase();

  const event = await EventModel.findById(eventId).populate("createdBy", "name").lean();

  if (!event) {
    return null;
  }

  return {
    id: event._id.toString(),
    title: event.title,
    date: event.date.toISOString(),
    location: event.location,
    createdBy: {
      id: (event.createdBy as any)?._id?.toString?.() ?? "",
      name: (event.createdBy as any)?.name ?? "Unknown",
    },
  } satisfies EventListItem;
}

export async function updateEvent(eventId: string, input: unknown) {
  const payload = eventInputSchema.partial().parse(input);
  await connectToDatabase();

  const event = await EventModel.findByIdAndUpdate(
    eventId,
    {
      ...(payload.title ? { title: payload.title } : {}),
      ...(payload.date ? { date: new Date(payload.date) } : {}),
      ...(payload.location ? { location: payload.location } : {}),
      ...(payload.createdBy ? { createdBy: payload.createdBy } : {}),
    },
    {
      new: true,
    },
  )
    .populate("createdBy", "name")
    .lean();

  if (!event) {
    return null;
  }

  return {
    id: event._id.toString(),
    title: event.title,
    date: event.date.toISOString(),
    location: event.location,
    createdBy: {
      id: (event.createdBy as any)?._id?.toString?.() ?? "",
      name: (event.createdBy as any)?.name ?? "Unknown",
    },
  } satisfies EventListItem;
}

export async function deleteEvent(eventId: string) {
  await connectToDatabase();
  const result = await EventModel.findByIdAndDelete(eventId);
  return Boolean(result);
}
