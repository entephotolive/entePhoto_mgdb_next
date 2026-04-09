/**
 * store/upload-store.ts
 * ─────────────────────────────────────────────────────────────────
 * Global upload state manager using Zustand.
 * Lives OUTSIDE the React component tree so it persists across
 * any Next.js client-side route change.
 *
 * Architecture notes:
 *  • Upload logic lives in lib/services/upload.service.ts
 *  • This store is the single source of truth for UI state
 *  • XHR refs are kept here so they can be aborted on cancel
 */

import { create } from "zustand";

// ── Types ─────────────────────────────────────────────────────────

export type UploadStatus =
  | "idle"
  | "uploading"
  | "success"
  | "failed"
  | "partial";

export type QueueItemStatus =
  | "queued"
  | "uploading"
  | "completed"
  | "failed"
  | "duplicate";

export interface UploadQueueItem {
  id: string;
  file: File;
  preview: string;
  status: QueueItemStatus;
  progress: number;
  error?: string;
}

export interface UploadContext {
  eventId: string;
  eventName: string;
  uploadedBy: string;
  folderId?: string;
}

// XHR refs stored outside store (store should be serialisable)
const xhrMap = new Map<string, XMLHttpRequest>();

interface UploadStore {
  // ── Queue state ──────────────────────────────────────────────
  items: UploadQueueItem[];
  uploadContext: UploadContext | null;
  uploadStatus: UploadStatus;
  isUploading: boolean;
  currentFileName: string;
  overallProgress: number;
  completedCount: number;
  totalCount: number;

  // ── Widget UI ────────────────────────────────────────────────
  isWidgetVisible: boolean;
  isWidgetMinimised: boolean;

  // ── Actions ──────────────────────────────────────────────────
  addFiles: (files: FileList | File[], context?: UploadContext) => void;
  removeFile: (id: string) => void;
  clearAll: () => void;
  clearCompleted: () => void;
  setUploadContext: (context: UploadContext) => void;
  setWidgetVisible: (v: boolean) => void;
  setWidgetMinimised: (v: boolean) => void;

  /** Internal — called by upload.service */
  _updateItem: (
    id: string,
    patch: Partial<Omit<UploadQueueItem, "id" | "file" | "preview">>,
  ) => void;
  _setUploading: (v: boolean) => void;
  _setCurrentFileName: (name: string) => void;
  _setStatus: (s: UploadStatus) => void;
  _recompute: () => void;
}

// ── Validation constants ──────────────────────────────────────────
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// ── Store ─────────────────────────────────────────────────────────
export const useUploadStore = create<UploadStore>((set, get) => ({
  items: [],
  uploadContext: null,
  uploadStatus: "idle",
  isUploading: false,
  currentFileName: "",
  overallProgress: 0,
  completedCount: 0,
  totalCount: 0,
  isWidgetVisible: false,
  isWidgetMinimised: false,

  // ── Add files to queue ─────────────────────────────────────────
  addFiles(fileList, context) {
    const files = Array.from(fileList);
    const newItems: UploadQueueItem[] = files.map((file) => {
      const id = crypto.randomUUID();
      const preview = URL.createObjectURL(file);

      if (!ALLOWED_TYPES.includes(file.type)) {
        return {
          id,
          file,
          preview,
          status: "failed",
          progress: 0,
          error: "Unsupported type (JPG/PNG/WebP only)",
        };
      }
      if (file.size > MAX_SIZE_BYTES) {
        return {
          id,
          file,
          preview,
          status: "failed",
          progress: 0,
          error: "Exceeds 50 MB limit",
        };
      }
      return { id, file, preview, status: "queued", progress: 0 };
    });

    set((s) => {
      const items = [...s.items, ...newItems];
      return {
        items,
        isWidgetVisible: true,
        isWidgetMinimised: false,
        uploadStatus: s.isUploading ? "uploading" : "idle",
        ...(context ? { uploadContext: context } : {}),
        ...computeDerived(items),
      };
    });
  },

  // ── Remove a single file ───────────────────────────────────────
  removeFile(id) {
    const item = get().items.find((i) => i.id === id);
    if (item) {
      xhrMap.get(id)?.abort();
      xhrMap.delete(id);
      URL.revokeObjectURL(item.preview);
    }
    set((s) => {
      const items = s.items.filter((i) => i.id !== id);
      return { items, ...computeDerived(items) };
    });
  },

  // ── Clear all files ────────────────────────────────────────────
  clearAll() {
    get().items.forEach((i) => {
      xhrMap.get(i.id)?.abort();
      xhrMap.delete(i.id);
      URL.revokeObjectURL(i.preview);
    });
    set({
      items: [],
      uploadContext: null,
      uploadStatus: "idle",
      isUploading: false,
      currentFileName: "",
      overallProgress: 0,
      completedCount: 0,
      totalCount: 0,
    });
  },

  clearCompleted() {
    const toRemove = get().items.filter(
      (i) => i.status === "completed" || i.status === "duplicate",
    );
    toRemove.forEach((i) => URL.revokeObjectURL(i.preview));
    set((s) => {
      const items = s.items.filter(
        (i) => i.status !== "completed" && i.status !== "duplicate",
      );
      return { items, ...computeDerived(items) };
    });
  },

  setUploadContext: (context) => set({ uploadContext: context }),
  // ── Widget toggles ─────────────────────────────────────────────
  setWidgetVisible: (v) => set({ isWidgetVisible: v }),
  setWidgetMinimised: (v) => set({ isWidgetMinimised: v }),

  // ── Internal updaters (used by upload.service) ─────────────────
  _updateItem(id, patch) {
    set((s) => {
      const items = s.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      );
      return { items, ...computeDerived(items) };
    });
  },

  _setUploading(v) {
    set({ isUploading: v });
  },

  _setCurrentFileName(name) {
    set({ currentFileName: name });
  },

  _setStatus(s) {
    set({ uploadStatus: s });
  },

  _recompute() {
    set((s) => computeDerived(s.items));
  },
}));

// ── Helper: derive aggregate values from item list ────────────────
function computeDerived(items: UploadQueueItem[]) {
  const completed = items.filter(
    (i) => i.status === "completed" || i.status === "duplicate",
  ).length;
  const total = items.length;
  const overallProgress =
    total === 0
      ? 0
      : Math.round(items.reduce((sum, i) => sum + i.progress, 0) / total);

  return { completedCount: completed, totalCount: total, overallProgress };
}

// ── XHR helpers exposed to upload.service ─────────────────────────
export function registerXhr(id: string, xhr: XMLHttpRequest) {
  xhrMap.set(id, xhr);
}
export function unregisterXhr(id: string) {
  xhrMap.delete(id);
}
