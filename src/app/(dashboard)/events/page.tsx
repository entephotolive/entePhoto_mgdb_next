import { requireSession } from "@/lib/services/auth.service";
import { listEvents } from "@/lib/services/event.service";
import { EventsClient } from "@/components/feature-specific/events/events-client";

export const metadata = {
  title: "Events — Photo Ceremony Admin",
  description: "Manage photography event schedules, upload sessions, and track progress.",
};

export default async function EventsPage() {
  const session = await requireSession();
  const events = await listEvents(session.id).catch(() => []);
  console.log("events", events)

  return (
    <EventsClient
      events={events}
      isAdmin={true}
      userId={session.id}
    />
  );
}
