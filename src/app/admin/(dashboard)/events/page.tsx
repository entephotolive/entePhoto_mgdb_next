import { requireSession } from "@/lib/services/auth.service";
import { listEvents } from "@/lib/services/event.service";
import { EventsClient } from "@/components/feature-specific/events/events-client";

export const metadata = {
  title: "Events — Ente photo",
  description:
    "Manage photography event schedules, upload sessions, and track progress.",
};

export default async function EventsPage() {
  const session = await requireSession();
  const events = await listEvents(session.id).catch(() => []);

  return <EventsClient events={events} isAdmin={true} userId={session.id} />;
}
