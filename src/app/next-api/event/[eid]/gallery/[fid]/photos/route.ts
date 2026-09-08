import { NextRequest, NextResponse } from "next/server";
import { listPhotosByFolder } from "@/lib/services/photo.service";

// Public endpoint -- no auth required (these are publicly visible gallery pages)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eid: string; fid: string }> },
) {
  try {
    const { eid, fid } = await params;
    const searchParams = request.nextUrl.searchParams;

    const cursor = searchParams.get("cursor") ?? undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100)
      : 40;

    if (!eid || !fid) {
      return NextResponse.json(
        { error: "Missing event or folder ID" },
        { status: 400 },
      );
    }

    const result = await listPhotosByFolder(fid, eid, {
      cursor,
      limit,
    });

    return NextResponse.json({
      photos: result.photos,
      nextCursor: result.nextCursor ?? null,
      hasMore: result.nextCursor !== null,
    });
  } catch (error) {
    console.error("[gallery-photos-route] Error fetching photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 },
    );
  }
}