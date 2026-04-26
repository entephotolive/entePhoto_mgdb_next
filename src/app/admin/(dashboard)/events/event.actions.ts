"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createEvent, deleteEvent, updateEvent } from "@/lib/services/event.service";
import { requireSession } from "@/lib/services/auth.service";
import { api } from "@/app/api/api-client";


// ── Zod Schemas ────────────────────────────────────────────────────────────────

const createEventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  date: z.string().min(1, "Date is required"),
  location: z.string().min(2, "Location must be at least 2 characters"),
  createdBy: z.string().min(1, "Creator ID is required"),
});

const updateEventSchema = createEventSchema.partial().extend({
  id: z.string().min(1, "Event ID is required"),
});

// ── Action Result Type ─────────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T; message: string }
  | { success: false; error: string };

// ── Create Event Action ────────────────────────────────────────────────────────
export async function createEventAction(
  formData: FormData,
): Promise<ActionResult<{ id: string; title: string }>> {
  try {
    await requireSession();

    // Extract form values FIRST
    const raw = {
      title: String(formData.get("title") || ""),
      date: formData.get("date")
        ? new Date(String(formData.get("date"))).toISOString()
        : "",
      location: formData.get("location"),
      createdBy: formData.get("createdBy"),
    };

    // Validate input
    const parsed = createEventSchema.safeParse(raw);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return { success: false, error: firstError.message };
    }



    const event = await createEvent(parsed.data);

    revalidatePath("/events");

    return {
      success: true,
      data: { id: event.id, title: event.title },
      message: `Event "${event.title}" created successfully.`,
    };
  } catch (err) {
    console.error("Create Event Action Error:", err);
    
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0].message };
    }
    
    const message =
      err instanceof Error ? err.message : "Failed to create event.";
    return { success: false, error: message };
  }
}

// ── Update Event Action ────────────────────────────────────────────────────────

export async function updateEventAction(
  formData: FormData,
): Promise<ActionResult<{ id: string; title: string }>> {
  try {
    await requireSession();

    const raw = {
      id: formData.get("id"),
      title: formData.get("title") || undefined,
      date: formData.get("date")
        ? new Date(String(formData.get("date"))).toISOString()
        : undefined,
      location: formData.get("location") || undefined,
      createdBy: formData.get("createdBy") || undefined,
    };

    const parsed = updateEventSchema.safeParse(raw);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return { success: false, error: firstError.message };
    }

    const { id, ...rest } = parsed.data;
    const updated = await updateEvent(id, rest);

    if (!updated) {
      return { success: false, error: "Event not found." };
    }

    revalidatePath("/events");

    return {
      success: true,
      data: { id: updated.id, title: updated.title },
      message: `Event "${updated.title}" updated successfully.`,
    };
  } catch (err) {
    console.error("Update Event Action Error:", err);

    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0].message };
    }

    const message = err instanceof Error ? err.message : "Failed to update event.";
    return { success: false, error: message };
  }
}

// ── Delete Event Action ────────────────────────────────────────────────────────

export async function deleteEventAction(eventId: string): Promise<ActionResult> {
  try {
    await requireSession();

    if (!eventId || typeof eventId !== "string") {
      return { success: false, error: "Invalid event ID." };
    }

    const deleted = await deleteEvent(eventId);

    if (!deleted) {
      return { success: false, error: "Event not found or already deleted." };
    }

    revalidatePath("/events");

    return {
      success: true,
      data: undefined,
      message: "Event deleted successfully.",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete event.";
    return { success: false, error: message };
  }
}



export const createWedding = async (data) => {
  const res = await api.post("/create-wedding/", data, {
    headers: { "Content-Type": "application/json" },
  });

  return res.data;
};