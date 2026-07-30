// @ts-ignore
import { describe, expect, test, beforeEach } from "bun:test";
import { useUploadStore } from "@/store/upload-store";

describe("Upload Queue Pagination & Lazy-Load Previews", () => {
  beforeEach(() => {
    // Reset store state before each test
    useUploadStore.getState().clearAll();
  });

  test("eager preview creation when adding files is bounded to initial page size (24 items)", () => {
    // Mock global URL.createObjectURL
    const origCreateObjectUrl = globalThis.URL.createObjectURL;
    globalThis.URL.createObjectURL = (file: any) => `blob:mock-url-${file.name}`;

    try {
      const files: File[] = Array.from({ length: 30 }, (_, i) => {
        return new File([new Uint8Array([1, 2, 3])], `photo_${i + 1}.jpg`, { type: "image/jpeg" });
      });

      useUploadStore.getState().addFiles(files);

      const items = useUploadStore.getState().items;
      expect(items.length).toBe(30);

      // Items 0-23 (first page) have preview URLs attached
      for (let i = 0; i < 24; i++) {
        expect(items[i].preview).toBe(`blob:mock-url-photo_${i + 1}.jpg`);
      }

      // Items 24-29 (beyond visible page) start with empty preview string (lazy-loaded)
      for (let i = 24; i < 30; i++) {
        expect(items[i].preview).toBe("");
      }
    } finally {
      globalThis.URL.createObjectURL = origCreateObjectUrl;
    }
  });

  test("ensurePreview attaches preview URL on demand for hidden/paged items", () => {
    const origCreateObjectUrl = globalThis.URL.createObjectURL;
    globalThis.URL.createObjectURL = (file: any) => `blob:mock-url-${file.name}`;

    try {
      const files: File[] = Array.from({ length: 30 }, (_, i) => {
        return new File([new Uint8Array([1, 2, 3])], `photo_${i + 1}.jpg`, { type: "image/jpeg" });
      });

      useUploadStore.getState().addFiles(files);
      let items = useUploadStore.getState().items;
      const targetId = items[25].id;

      expect(items[25].preview).toBe("");

      // Reveal / page item 25
      useUploadStore.getState().ensurePreview(targetId);

      items = useUploadStore.getState().items;
      expect(items[25].preview).toBe("blob:mock-url-photo_26.jpg");
    } finally {
      globalThis.URL.createObjectURL = origCreateObjectUrl;
    }
  });

  test("revokePreview revokes and clears preview URL when item leaves visible window", () => {
    const origCreateObjectUrl = globalThis.URL.createObjectURL;
    const origRevokeObjectUrl = globalThis.URL.revokeObjectURL;
    let revokedUrl = "";

    globalThis.URL.createObjectURL = (file: any) => `blob:mock-url-${file.name}`;
    globalThis.URL.revokeObjectURL = (url: string) => {
      revokedUrl = url;
    };

    try {
      const files: File[] = Array.from({ length: 10 }, (_, i) => {
        return new File([new Uint8Array([1, 2, 3])], `photo_${i + 1}.jpg`, { type: "image/jpeg" });
      });

      useUploadStore.getState().addFiles(files);
      let items = useUploadStore.getState().items;
      const targetId = items[0].id;

      expect(items[0].preview).toBe("blob:mock-url-photo_1.jpg");

      // Revoke preview
      useUploadStore.getState().revokePreview(targetId);

      items = useUploadStore.getState().items;
      expect(revokedUrl).toBe("blob:mock-url-photo_1.jpg");
      expect(items[0].preview).toBe("");
    } finally {
      globalThis.URL.createObjectURL = origCreateObjectUrl;
      globalThis.URL.revokeObjectURL = origRevokeObjectUrl;
    }
  });

  test("_updateItem automatically revokes and clears preview URL on completion", () => {
    const origCreateObjectUrl = globalThis.URL.createObjectURL;
    const origRevokeObjectUrl = globalThis.URL.revokeObjectURL;
    let revokedUrl = "";

    globalThis.URL.createObjectURL = (file: any) => `blob:mock-url-${file.name}`;
    globalThis.URL.revokeObjectURL = (url: string) => {
      revokedUrl = url;
    };

    try {
      const files: File[] = Array.from({ length: 5 }, (_, i) => {
        return new File([new Uint8Array([1, 2, 3])], `photo_${i + 1}.jpg`, { type: "image/jpeg" });
      });

      useUploadStore.getState().addFiles(files);
      let items = useUploadStore.getState().items;
      const targetId = items[0].id;

      expect(items[0].preview).toBe("blob:mock-url-photo_1.jpg");

      // Mark item as completed
      useUploadStore.getState()._updateItem(targetId, { status: "completed", progress: 100 });

      items = useUploadStore.getState().items;
      expect(revokedUrl).toBe("blob:mock-url-photo_1.jpg");
      expect(items[0].preview).toBe("");
      expect(items[0].status).toBe("completed");
    } finally {
      globalThis.URL.createObjectURL = origCreateObjectUrl;
      globalThis.URL.revokeObjectURL = origRevokeObjectUrl;
    }
  });

  test("store completedCount and totalCount remain accurate for all 90 items regardless of UI pagination or preview state", () => {
    const files: File[] = Array.from({ length: 90 }, (_, i) => {
      return new File([new Uint8Array([1, 2, 3])], `photo_${i + 1}.jpg`, { type: "image/jpeg" });
    });

    useUploadStore.getState().addFiles(files);
    let state = useUploadStore.getState();

    expect(state.totalCount).toBe(90);
    expect(state.completedCount).toBe(0);

    // Complete 15 items
    for (let i = 0; i < 15; i++) {
      useUploadStore.getState()._updateItem(state.items[i].id, { status: "completed" });
    }

    state = useUploadStore.getState();
    expect(state.totalCount).toBe(90);
    expect(state.completedCount).toBe(15);
  });

  test("markItemFlashed adds item to flashedItemIds and allows filtering from visible queue", () => {
    const files: File[] = Array.from({ length: 5 }, (_, i) => {
      return new File([new Uint8Array([1, 2, 3])], `photo_${i + 1}.jpg`, { type: "image/jpeg" });
    });

    useUploadStore.getState().addFiles(files);
    let state = useUploadStore.getState();
    const firstId = state.items[0].id;

    expect(state.flashedItemIds).not.toContain(firstId);

    // Mark first item flashed (after 600ms timer)
    useUploadStore.getState().markItemFlashed(firstId);

    state = useUploadStore.getState();
    expect(state.flashedItemIds).toContain(firstId);

    // Active renderable items filter excludes flashed items
    const activeRenderable = state.items.filter((item) => !state.flashedItemIds.includes(item.id));
    expect(activeRenderable.length).toBe(4);
    expect(activeRenderable.find((i) => i.id === firstId)).toBeUndefined();
  });
});
