"use server";

import { api } from "@/app/api/api-client";
import { getEventById } from "@/lib/services/event.service";

export const scanFace = async (formData: FormData) => {
  try {
    const eid = formData.get("eid") as string;
    if (!eid) throw new Error("Event ID not provided");

    const event = await getEventById(eid);
    
    if (!event || typeof event === "string" || "error" in event) {
      throw new Error("Event not found");
    }

    // Pass the standard event id as event_id
    formData.append("event_id", String(eid));

    const res = await api.post("/scan-face/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data;
  } catch (error: any) {
    console.error("Scan Face Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || error.message || "Failed to scan face");
  }
};