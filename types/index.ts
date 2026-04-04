export type UserRole = "admin" | "photographer";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export interface DashboardMetric {
  label: string;
  value: string;
  delta: string;
}

export interface EventListItem {
  id: string;
  title: string;
  date: string;
  location: string;
  createdBy: {
    id: string;
    name: string;
  };
  photoCount?: number;
}

export interface GalleryFolder {
  id: string;
  title: string;
  date: string;
  location: string;
  coverUrl: string | null;
  photoCount: number;
}

export type UploadQueueStatus = "queued" | "uploading" | "completed" | "failed";

export interface UploadQueueItem {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: UploadQueueStatus;
  error?: string;
}

export interface PhotographerSummary {
  id: string;
  name: string;
  email: string;
  eventCount: number;
  photoCount: number;
}

export interface DashboardSnapshot {
  metrics: DashboardMetric[];
  recentEvents: EventListItem[];
  galleryFolders: GalleryFolder[];
  photographers: PhotographerSummary[];
}

export interface ProfileData {
  id: string;
  name: string;
  email: string;
  studioName?: string;
  studioLocation?: string;
  specialization?: string;
  specializations?: string[];
  bio?: string;
  avatarUrl?: string;
}

export interface PortfolioMoment {
  id: string;
  url: string;
  publicId: string;
  caption?: string;
}


export const SPECIALIZATION_OPTIONS = [
  "Wedding",
  "Editorial",
  "Corporate",
  "Fine Art",
  "Documentary",
  "Portrait",
  "Event",
  "Fashion",
] as const;

export type SpecializationOption = (typeof SPECIALIZATION_OPTIONS)[number];
