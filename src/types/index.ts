/**
 * types/index.ts
 * ─────────────────────────────────────────────────────────────────
 * Shared TypeScript types for the Photo Ceremony admin panel.
 * All types are derived from their actual construction sites in
 * the service layer — no `any` aliases.
 */

// ── Re-export canonical store types so callers import from one place ──
export type {
  UploadQueueItem,
  UploadContext,
  UploadStatus,
  QueueItemStatus,
} from "@/store/upload-store";

// ── Session / Auth ────────────────────────────────────────────────
/** Authenticated user session stored in the JWT cookie. */
export interface SessionUser {
  /** MongoDB ObjectId string of the user document. */
  id: string;
  name: string;
  email: string;
}

// ── Events ────────────────────────────────────────────────────────
/**
 * A single event as returned by listEvents(), createEvent(),
 * getEventById(), and updateEvent().
 */
export interface EventListItem {
  /** MongoDB ObjectId string. */
  id: string;
  title: string;
  /** ISO-8601 date string, e.g. "2025-12-25T18:00:00.000Z" */
  date: string;
  location: string;
  /** Total number of photos (photos + face-indexed photos) for this event. */
  photoCount?: number;
  /** Optional ISO-8601 creation timestamp — available from newer queries. */
  createdAt?: string;
  createdBy: {
    id: string;
    name: string;
  };
}

// ── Gallery ───────────────────────────────────────────────────────
/**
 * A gallery folder as returned by listGalleryFolders().
 * Each folder corresponds to one event and shows the photo count
 * and a cover image URL.
 */
export interface GalleryFolder {
  id: string;
  title: string;
  /** ISO-8601 date string. */
  date: string;
  location: string;
  coverUrl: string | null;
  photoCount: number;
}

// ── Portfolio ─────────────────────────────────────────────────────
/**
 * A single portfolio moment (showcase image) as returned by
 * insertPortfolioMoment() and fetchPortfolioByUser().
 */
export interface PortfolioMoment {
  id: string;
  url: string;
  publicId: string;
  caption: string;
}

// ── Profile ───────────────────────────────────────────────────────
/**
 * Full photographer profile as returned by fetchProfileById()
 * and patchProfile().
 */
export interface ProfileData {
  id: string;
  name: string;
  email: string;
  studioName: string;
  studioLocation: string;
  specialization: string;
  specializations: string[];
  bio: string;
  avatarUrl: string;
  phoneNumber: string;
}

// ── Dashboard ─────────────────────────────────────────────────────
/** Metric card item used on the dashboard. */
export interface DashboardMetric {
  label: string;
  value: string;
  delta: string;
}

/**
 * Snapshot returned by getDashboardSnapshot().
 */
export interface DashboardSnapshot {
  metrics: DashboardMetric[];
  recentEvents: EventListItem[];
  galleryFolders: GalleryFolder[];
  profile: ProfileData | null;
}

// ── User roles ────────────────────────────────────────────────────
/** Valid user roles in the system. */
export type UserRole = "photographer" | "admin";

// ── Specialization options (constant + type) ──────────────────────
/**
 * Available photography specialization options.
 * Keep this in sync with the Mongoose userSchema enum.
 */
export const SPECIALIZATION_OPTIONS = [
  "Wedding",
  "Portrait",
  "Commercial",
  "Event",
  "Fashion",
  "Wildlife",
  "Travel",
  "Sports",
  "Newborn",
  "Real Estate",
] as const;

export type SPECIALIZATION_OPTIONS = (typeof SPECIALIZATION_OPTIONS)[number];

// ── Deprecated / legacy aliases kept for compatibility ────────────
/**
 * @deprecated Use EventListItem directly.
 */
export type EventBase = EventListItem;

/**
 * Photographer profile sourced from the User collection.
 * Fields match the Mongoose userSchema exactly.
 * @deprecated Prefer ProfileData which includes all fields.
 */
export interface PhotographerProfile {
  /** User's display name */
  name: string;
  /** User's email address */
  email: string;
  /** Studio / business name (optional in DB) */
  studioName: string;
  /** Studio physical location (optional in DB) */
  studioLocation: string;
  /** Short photographer bio (optional in DB) */
  bio: string;
  /** Avatar / profile image URL (optional in DB) */
  avatarUrl: string;
}