"use client";

import { useUploadStore } from "@/store/upload-store";
import { processUploadQueue } from "@/lib/services/upload.service";
import { UploadContext } from "@/store/upload-store";

/**
 * useGlobalUpload hook
 * ─────────────────────────────────────────────────────────────────
 * Exposes the Zustand store and the upload runner to React components.
 * This replaces the old `use-file-upload.ts` local state hook.
 */
export function useGlobalUpload() {
  const store = useUploadStore();

  const startUpload = async () => {
    if (!store.uploadContext) {
      console.error("Cannot start upload: missing upload context");
      return;
    }
    await processUploadQueue(store.uploadContext);
  };

  const retryUpload = async (id?: string) => {
    if (!store.uploadContext) {
      console.error("Cannot retry upload: missing upload context");
      return;
    }
    if (id) {
      store._updateItem(id, { status: "queued", error: undefined, progress: 0 });
    }
    store._setStatus("idle");
    await processUploadQueue(store.uploadContext);
  };

  return {
    ...store,
    startUpload,
    retryUpload,
  };
}
