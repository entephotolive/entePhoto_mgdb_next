export type ProfileData = any;
export type PortfolioMoment = any;
export type EventListItem = any;
export type GalleryFolder = any;
export type SessionUser = any;
export type SPECIALIZATION_OPTIONS = any;
export type UploadQueueItem = any;
export type DashboardSnapshot = any;
export type UserRole = any;
export type EventBase = any;
export const SPECIALIZATION_OPTIONS: any = [];

/**
 * Photographer profile sourced from the User collection.
 * Fields match the Mongoose userSchema exactly.
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