import { requireSession } from "@/lib/services/auth.service";
import { listEvents } from "@/lib/services/event.service";
import { fetchProfileById } from "@/lib/services/profile.service";
import { EventsClient } from "@/components/feature-specific/events/events-client";

export const metadata = {
  title: "Events — Ente photo",
  description:
    "Manage photography event schedules, upload sessions, and track progress.",
};

export default async function EventsPage() {
  const session = await requireSession();
  const [events, profile] = await Promise.all([
    listEvents(session.id).catch(() => []),
    fetchProfileById(session.id).catch(() => null),
  ]);

  return (
    <EventsClient
      events={events}
      isphotographer={true}
      userId={session.id}
      photographerProfile={{
        name:          profile?.name          ?? session.name  ?? "",
        email:         profile?.email         ?? session.email ?? "",
        studioName:    profile?.studioName    ?? "",
        studioLocation:profile?.studioLocation?? "",
        bio:           profile?.bio           ?? "",
        avatarUrl:     profile?.avatarUrl     ?? "",
      }}
    />
  );
}
