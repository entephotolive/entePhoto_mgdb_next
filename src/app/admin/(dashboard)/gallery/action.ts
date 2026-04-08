"use server";

import { requireSession } from "@/lib/services/auth.service";
import { createFolder, updateFolder, deleteFolder } from "@/lib/services/folder.service";
import { revalidatePath } from "next/cache";

export async function createNewFolder(name: string, eventId: string) {
  try {
    const session = await requireSession();
    
    if (!name || name.trim() === "") {
      return { ok: false, error: "Folder name is required" };
    }
    
    if (!eventId) {
      return { ok: false, error: "Event ID is required" };
    }

    await createFolder(name, eventId, session.id);
    
    revalidatePath("/admin/gallery");
    return { ok: true };
  } catch (error) {
    console.error("[createNewFolder]", error);
    return { ok: false, error: "Failed to create folder" };
  }
}

export async function updateFolderAction(folderId: string, name: string) {
  try {
    const session = await requireSession();
    
    if (!folderId || folderId === "all") {
      return { ok: false, error: "Cannot rename this folder" };
    }
    
    if (!name || name.trim() === "") {
      return { ok: false, error: "Folder name is required" };
    }

    await updateFolder(folderId, name, session.id);
    
    revalidatePath("/admin/gallery");
    return { ok: true };
  } catch (error) {
    console.error("[updateFolderAction]", error);
    return { ok: false, error: "Failed to update folder" };
  }
}

export async function deleteFolderAction(folderId: string) {
  try {
    const session = await requireSession();
    
    if (!folderId || folderId === "all") {
      return { ok: false, error: "Cannot delete this folder" };
    }

    await deleteFolder(folderId, session.id);
    
    revalidatePath("/admin/gallery");
    return { ok: true };
  } catch (error) {
    console.error("[deleteFolderAction]", error);
    return { ok: false, error: "Failed to delete folder" };
  }
}
