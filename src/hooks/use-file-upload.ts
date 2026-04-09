"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UploadQueueItem } from "@/types";

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
// Increased limit to 50MB so photographers can upload large raw photos.
// Cloudinary will automatically compress them down to web-friendly sizes.
const maxFileSize = 50 * 1024 * 1024;

export function useFileUpload() {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const timersRef = useRef<Record<string, number>>({});
  const itemsRef = useRef<UploadQueueItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timer) =>
        window.clearInterval(timer),
      );
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, []);

  const overallProgress = useMemo(() => {
    if (!items.length) {
      return 0;
    }

    const total = items.reduce((sum, item) => sum + item.progress, 0);
    return Math.round(total / items.length);
  }, [items]);

  function updateItem(
    id: string,
    updater: (item: UploadQueueItem) => UploadQueueItem,
  ) {
    setItems((current) =>
      current.map((item) => (item.id === id ? updater(item) : item)),
    );
  }

  const [isUploading, setIsUploading] = useState(false);

  async function uploadFile(
    id: string,
    eventsName: string,
    eventId: string,
    uploadedBy: string,
    folderId?: string,
  ) {
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item) return;

    updateItem(id, (prev) => ({ ...prev, status: "uploading", progress: 0 }));

    try {
      // 1. Calculate hash
      const buffer = await item.file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hash = [...new Uint8Array(hashBuffer)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // 2. Check existence in DB
      const checkRes = await fetch("/api/photos/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash }),
      });
      if (!checkRes.ok) throw new Error("Failed to check duplicate");
      const { exists } = await checkRes.json();
      if (exists) {
        updateItem(id, (prev) => ({
          ...prev,
          status: "failed",
          error: "This file already exists",
        }));
        return;
      }
      const timestamp = Math.round(new Date().getTime() / 1000);
      const paramsToSign = {
        timestamp,
        folder: `photo-ceremony/events/${eventId}-${eventsName}`,
        // Incoming transformation: Resize to 1920px max, compress, and force to WebP
        transformation: "w_1920,c_limit,q_auto,f_webp",
      };

      const signRes = await fetch("/api/sign-cloudinary-params", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paramsToSign }),
      });

      if (!signRes.ok) throw new Error("Failed to get signature");
      const { signature } = await signRes.json();

      const formData = new FormData();
      formData.append("file", item.file);
      formData.append(
        "api_key",
        process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || "",
      );
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", paramsToSign.folder);
      formData.append("transformation", paramsToSign.transformation);

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

      // Use XMLHttpRequest for progress tracking
      const uploadPromise = new Promise<{ secure_url: string }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(
            "POST",
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          );

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              updateItem(id, (prev) => ({ ...prev, progress }));
            }
          };

          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error("Cloudinary upload failed"));
            }
          };
          xhr.onerror = () => reject(new Error("Network Error"));
          xhr.send(formData);
        },
      );

      const uploadResult = await uploadPromise;

      // Save to database
      const saveRes = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: uploadResult.secure_url,
          eventId,
          uploadedBy,
          hash,
          folderId,
        }),
      });

      if (!saveRes.ok) throw new Error("Failed to save to database");

      updateItem(id, (prev) => ({
        ...prev,
        status: "completed",
        progress: 100,
      }));
    } catch (error) {
      console.log(error);
      updateItem(id, (prev) => ({
        ...prev,
        status: "failed",
        error: error instanceof Error ? error.message : "Upload failed",
      }));
    }
  }

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);

    const nextItems = files.map((file) => {
      const id = crypto.randomUUID();
      const preview = URL.createObjectURL(file);

      if (!allowedMimeTypes.includes(file.type)) {
        return {
          id,
          file,
          preview,
          progress: 0,
          status: "failed" as const,
          error: "Unsupported file type",
        };
      }

      if (file.size > maxFileSize) {
        return {
          id,
          file,
          preview,
          progress: 0,
          status: "failed" as const,
          error: "File exceeds 5MB limit",
        };
      }

      return {
        id,
        file,
        preview,
        progress: 0,
        status: "queued" as const,
      };
    });

    setItems((current) => [...current, ...nextItems]);
  }

  function removeFile(id: string) {
    setItems((current) => {
      const itemToRemove = current.find((item) => item.id === id);
      if (itemToRemove) {
        URL.revokeObjectURL(itemToRemove.preview);
      }
      return current.filter((item) => item.id !== id);
    });
  }

  function clearAll() {
    Object.values(timersRef.current).forEach((timer) =>
      window.clearInterval(timer),
    );
    timersRef.current = {};
    items.forEach((item) => URL.revokeObjectURL(item.preview));
    setItems([]);
  }

  return {
    items,
    addFiles,
    removeFile,
    clearAll,
    isUploading,
    overallProgress,
    completedCount: items.filter((item) => item.status === "completed").length,
  };
}
