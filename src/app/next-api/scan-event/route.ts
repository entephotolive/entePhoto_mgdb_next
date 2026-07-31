import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { GuestScanModel } from "@/models/GuestScan";
import { Types } from "mongoose";

export async function POST(request: Request) {
  try {
    let body: any = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      body = {
        eventId: formData.get("eventId") || formData.get("event_id"),
        attendeeId: formData.get("attendeeId") || formData.get("attendee_id"),
      };
    }

    const { eventId, attendeeId } = body;

    if (!eventId || !attendeeId) {
      return NextResponse.json(
        { error: "eventId and attendeeId are required" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const eventObjectId = Types.ObjectId.isValid(eventId)
      ? new Types.ObjectId(eventId)
      : eventId;

    const userAgent = request.headers.get("user-agent") || undefined;

    const scan = await GuestScanModel.create({
      eventId: eventObjectId,
      attendeeId: String(attendeeId),
      userAgent,
    });

    return NextResponse.json({
      ok: true,
      scanId: scan._id.toString(),
    });
  } catch (error: any) {
    console.error("[POST /next-api/scan-event] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record QR scan" },
      { status: 500 },
    );
  }
}
