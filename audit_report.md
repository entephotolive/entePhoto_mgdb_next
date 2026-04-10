# Photo Ceremony — Senior-Level Codebase Audit

> Audit Date: 2026-04-10 | Auditor: Antigravity (Senior Architect Mode)
> Stack: Next.js 15 App Router · TypeScript · MongoDB/Mongoose · Zustand · Cloudinary · JWT (jose) · Tailwind CSS

---

## TABLE OF CONTENTS

1. [Security Issues](#security)
2. [Architecture & Structure](#architecture)
3. [Code Quality](#code-quality)
4. [Performance](#performance)
5. [Database / Backend](#database)
6. [UI / UX / Accessibility](#ui-ux)
7. [Industry Standards & Best Practices](#standards)
8. [Summary Sections](#summary)

---

## 1. SECURITY ISSUES {#security}

---

### SEC-01 — `.env` File Committed with Real Production Secrets

**Severity: CRITICAL**

**Why it's a problem:** The `.env` file contains live, real credentials including:
- A real MongoDB Atlas URI with username + password: `mongodb+srv://mohammedmizhabdk_db_user:BMV7x8.q4U5!gkk@...`
- Google OAuth Client ID + Client Secret (`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`)
- Cloudinary API Key + Secret (`xvQSirN27Ku16KvqLCBRu7UIuuA`)
- A hardcoded `NODE_ENV=production` inside `.env`

**File:** `.env` (root level), Lines 1–16

**Recommended Fix:** 
- Immediately rotate **all** exposed credentials (MongoDB password, Google OAuth secret, Cloudinary API secret).
- Add `.env` to `.gitignore` (verify it's truly not tracked — `.gitignore` exists but this file appears to contain real values).
- Use `.env.local` for local secrets, and use the Vercel/hosting provider's secrets management for production.
- Use `.env.example` (already exists) with placeholder values only.

**Why it matters in production:** Anyone with Git access or who views this repository can immediately access the production database, impersonate users via Google OAuth, and upload/delete files on your Cloudinary account. This is an active credential leak.

---

### SEC-02 — No CSRF Protection on OAuth State Parameter

**Severity: Critical**

**Why it's a problem:** The Google OAuth initiation route hardcodes `state="oauth"` as a fixed, predictable string. A CSRF attack (or malicious OAuth redirect) can be constructed trivially.

**File:** `src/app/api/auth/google/route.ts`, Line 24

```
// Pre-generate a state parameter here if we wanted CSRF protection, but for simplicity, we pass state="oauth"
googleAuthUrl.searchParams.append("state", "oauth");
```

**Recommended Fix:** Generate a cryptographically random nonce (e.g., `crypto.randomUUID()`), store it in a short-lived HTTP-only cookie before redirecting to Google, and validate it matches on the callback. This is a required part of the OAuth 2.0 spec and not optional for production.

**Why it matters in production:** An attacker can craft a malicious link that completes the OAuth flow on behalf of a legitimate user, potentially hijacking their session.

---

### SEC-03 — Cron Endpoint Conditionally Authenticated (Bypass Possible If `CRON_SECRET` Not Set)

**Severity: Critical**

**Why it's a problem:** The auth check is `if (process.env.CRON_SECRET && ...)`. If `CRON_SECRET` is not defined in the environment, the condition short-circuits and any anonymous HTTP `GET` request to `/api/cron/cleanup` will **successfully delete all events from the database** that are more than 48 hours old.

**File:** `src/app/api/cron/cleanup/route.ts`, Lines 7–10

```ts
if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Recommended Fix:** Invert the logic to deny by default: always require the secret, and only allow when `CRON_SECRET` is set AND matches. If `CRON_SECRET` is not configured, return a 500/403 immediately.

**Why it matters in production:** A competitor or automated bot scanning for common endpoints could discover this route and repeatedly trigger mass event deletion.

---

### SEC-04 — `/api/photos` POST Route Does Not Verify Event Ownership

**Severity: High**

**Why it's a problem:** The `POST /api/photos` endpoint only checks `requireSession()` (that the user is logged in), but then accepts any `eventId` in the payload. Any authenticated user can call this API and register photos under another user's event — events they do not own.

**File:** `src/app/api/photos/route.ts`, Lines 7–20 (delegates to `photo.service.ts`)
**File:** `src/lib/services/photo.service.ts`, Lines 17–45

The `createPhoto` service calls `EventModel.findById(payload.eventId)` but never checks `event.createdBy === session.userId`.

**Recommended Fix:** After finding the event, verify `event.createdBy.toString() === session.id` before proceeding to create the photo.

**Why it matters in production:** Any logged-in photographer can inject photos into any other photographer's event gallery.

---

### SEC-05 — `/api/sign-cloudinary-params` Accepts Arbitrary Params to Sign

**Severity: High**

**Why it's a problem:** The signing endpoint accepts the entire `paramsToSign` object from the client body and signs it verbatim with no server-side validation or whitelisting. An authenticated user could pass any Cloudinary parameter they want (e.g., `eager_async: true`, `type: "authenticated"`, `invalidate: true`, or arbitrary folder paths) to get a valid signature for malicious operations.

**File:** `src/app/api/sign-cloudinary-params/route.ts`, Lines 14–20

```ts
const { paramsToSign } = body;
const signature = cloudinary.utils.api_sign_request(paramsToSign, ...);
```

**Recommended Fix:** On the server, reconstruct only the allowed parameters (timestmap, folder path from a server-computed path based on the event) and sign those — never blindly sign client-supplied params.

**Why it matters in production:** An authenticated photographer could use this to sign requests that delete or overwrite other resources on your Cloudinary account.

---

### SEC-06 — `NEXT_PUBLIC_CLOUDINARY_API_KEY` Is Unnecessarily in the NEXT_PUBLIC Namespace

**Severity: High**

**Why it's a problem:** Cloudinary's API key (`NEXT_PUBLIC_CLOUDINARY_API_KEY`) is exposed to the client bundle, which is partially expected for signed uploads. However, given that the signing endpoint already exists, the API key does not need to live in client-side state. More importantly, the current setup in `cloudinary-config.ts` (which uses `import "server-only"`) correctly guards the secret — but other files like `sign-cloudinary-params/route.ts` re-configure Cloudinary with the key again independently, creating surface area for accidental exposure.

**File:** `src/app/api/sign-cloudinary-params/route.ts`, Lines 2–9; `.env`, Line 14

**Recommended Fix:** Centralize Cloudinary v2 initialization in `cloudinary-config.ts` only. Remove the redundant `cloudinary.config()` call from the sign route. The API key being `NEXT_PUBLIC_` is an accepted Cloudinary pattern, but document this explicitly so future developers don't accidentally expose the API secret.

---

### SEC-07 — `window.location.reload()` Used After Delete — Authentication Race Condition on Error

**Severity: Medium**

**Why it's a problem:** On a successful delete, the client calls `window.location.reload()`. On failure, it shows `alert(...)`. This is a poor pattern with no nuance — it doesn't handle network errors, session expiry, or partial failures differently from application-level errors. Additionally, `alert()` (a blocking, native browser dialog) is used in a production UI.

**File:** `src/components/feature-specific/events/events-client.tsx`, Lines 505–512

**Recommended Fix:** Use router invalidation + `revalidatePath` (already on the server action), then call `router.refresh()` on the client side instead of a full page reload. Replace `alert()` with toast notifications.

---

### SEC-08 — No Rate Limiting on Any API Route

**Severity: High**

**Why it's a problem:** All API routes (`/api/photos`, `/api/photos/check`, `/api/sign-cloudinary-params`, `/api/auth/callback/google`) have zero rate limiting. This opens the application to:
- Brute-force login attempts
- Duplicate-check enumeration (probing which hashes exist in the database)
- Cloudinary signature abuse (unlimited signing requests)
- Cron endpoint DoS if CRON_SECRET is missing (SEC-03)

**Files:** All files under `src/app/api/`

**Recommended Fix:** Implement rate limiting using `@vercel/kv` + a middleware-based rate limiter (or `upstash/ratelimit`). Apply per-IP limits on auth routes (5 req/min) and per-user limits on signing and photo routes.

---

### SEC-09 — Unauthorized Access to `/api/dashboard` — No Auth Check

**Severity: High**

**Why it's a problem:** The dashboard API route calls `getDashboardSnapshot()` which internally calls `requireSession()`, but the route-level handler itself does NOT call `requireSession()`. A session-expired or cookie-deleted request reaches the service, which throws "Unauthorized", and the route returns a `401` with status code — but the error returns with status `401` regardless of error type, meaning a generic exception also returns 401 (confusing semantics). More critically, the route itself doesn't guard against unauthenticated access at the route level, relying entirely on a service-level throw.

**File:** `src/app/api/dashboard/route.ts`, Lines 3–12

**Recommended Fix:** Call `requireSession()` explicitly at the top of every API route handler. Do not rely solely on service-level guards. Also fix the error status mapping — `401` should only be returned for auth failures, not generic errors.

---

### SEC-10 — `DeleteFolder` Does Not Cascade-Delete Photos

**Severity: High**

**Why it's a problem:** When a folder is deleted, its photos are NOT deleted. The `deleteFolder` service calls `FolderModel.findOneAndDelete(...)` but never calls `PhotoModel.deleteMany({ folderId })`. This causes:
1. Orphaned photos in the database (photos with a non-existent `folderId`)
2. Photos still visible in the "All Photos" pseudo-folder which are no longer organized
3. Accumulation of storage costs (Cloudinary assets remain)

**File:** `src/lib/services/folder.service.ts`, Lines 134–142

**Recommended Fix:** Wrap folder deletion in a MongoDB session/transaction. Within the transaction: (1) delete photos from MongoDB, (2) delete the Cloudinary assets per photo, (3) delete the folder record. Apply the same pattern used in `deleteEvent`.

---

## 2. ARCHITECTURE & STRUCTURE {#architecture}

---

### ARCH-01 — `events-client.tsx` Is a 721-Line God Component

**Severity: High**

**Why it's a problem:** `EventsClient` contains 5 distinct UI responsibilities in a single file: the grid view, the list view, the view/details modal (including QR code logic), the delete confirmation modal, and the filter/search bar. This violates the Single Responsibility Principle and SRP at the component level. The file is 721 lines.

**File:** `src/components/feature-specific/events/events-client.tsx`, Lines 1–721

**Recommended Fix:** Split into:
- `EventCard.tsx` / `EventRow.tsx` (already as internal functions — elevate to separate files)
- `EventDetailsModal.tsx` (with its own QR logic)
- `DeleteConfirmModal.tsx`
- `EventsClient.tsx` (thin orchestrator only)

---

### ARCH-02 — Duplicate Upload Logic: `use-file-upload.ts` Is Dead Code (Mostly)

**Severity: Medium**

**Why it's a problem:** There are two competing upload systems:
1. **Global system** (`upload-store.ts` + `upload.service.ts` + `use-global-upload.ts`) — the current intended architecture.
2. **Local hook system** (`use-file-upload.ts`) — an older, fully-implemented hook that duplicates file validation, SHA-256 hashing, XHR upload, Cloudinary signing, and DB saving logic.

The `use-file-upload.ts` hook is no longer imported by any component (based on the reviewed files) but still exists with full duplicate implementation. The `uploadFile` function inside it is 120+ lines of logic that exactly mirrors `upload.service.ts`.

**File:** `src/hooks/use-file-upload.ts`, Lines 1–244

**Recommended Fix:** Delete or formally deprecate `use-file-upload.ts`. If it's truly unused, it's pure dead code. If some edge case still uses it, consolidate to the global service.

---

### ARCH-03 — Two Separate `globals.css` Files — Duplicated CSS Scope

**Severity: Medium**

**Why it's a problem:** There are two `globals.css` files:
1. `src/app/globals.css` — root app styles
2. `src/app/event/globals.css` — separate styles for the event/public section

This means the public event pages load different base styles than the admin area. This is fragile — any future changes to the global design system must be made in two places. It also makes CSS specificity and Tailwind layer behavior harder to reason about.

**Files:** `src/app/globals.css`, `src/app/event/globals.css`

**Recommended Fix:** Consolidate into a single `globals.css`. Use CSS layers or scoped class prefixes if the public and admin pages need different baseline styles.

---

### ARCH-04 — `action.ts` Under `/event/[eid]/gallery/` Is Completely Empty

**Severity: Low**

**Why it's a problem:** The file `src/app/event/[eid]/gallery/action.ts` exists and is imported (per its presence in open documents), but its entire content is a single blank line. Empty files create noise, confuse developers who inherit the codebase, and suggest unfinished work.

**File:** `src/app/event/[eid]/gallery/action.ts`, Line 1

**Recommended Fix:** Either implement the intended server actions in this file, or delete it.

---

### ARCH-05 — `src/types` and `types/` at Root — Two Type Directories

**Severity: Medium**

**Why it's a problem:** There are two separate type locations:
1. `types/index.ts` (root level) — contains core types like `SessionUser`, `EventListItem`, `UploadQueueItem`, `ProfileData`, etc.
2. `src/types/` — directory inside `src/` (implied by `src/types` in the `src/` listing)

Also, `UploadQueueItem` is defined in **both** `types/index.ts` (lines 38–45) and redefined with a slightly different `status` union in `src/store/upload-store.ts` (lines 32–39). The `status` type in `upload-store.ts` includes `"duplicate"` which is absent from `types/index.ts`.

**Files:** `types/index.ts` (line 36–45), `src/store/upload-store.ts` (lines 25–39)

**Recommended Fix:** Consolidate all types into `src/types/index.ts`. Delete the root-level `types/` directory. Ensure `UploadQueueItem` has one canonical definition that includes all statuses.

---

### ARCH-06 — Cloudinary SDK Initialized Twice (Config Duplication)

**Severity: Medium**

**Why it's a problem:** `lib/cloudinary-config.ts` is the designated single source of truth with `import "server-only"` and the full SDK config. Yet `src/app/api/sign-cloudinary-params/route.ts` imports `cloudinary` from the SDK directly (`import { v2 as cloudinary } from "cloudinary"`) and calls `cloudinary.config({...})` again with the same env vars.

**Files:** `src/lib/cloudinary-config.ts` (lines 20–25), `src/app/api/sign-cloudinary-params/route.ts` (lines 2–9)

**Recommended Fix:** The sign route should import the pre-configured `cloudinary` instance from `cloudinary-config.ts`. The re-initialization is redundant and could cause subtle bugs if one config path ever changes.

---

### ARCH-07 — Gallery Slug Uses Random ID Not Semantic Slug

**Severity: Low**

**Why it's a problem:** The admin gallery detail page route is `/admin/gallery/[slug]` but `slug` in practice is either a MongoDB ObjectId (e.g., `6607abc123...`) or the string `"all"`. This is not a URL slug — it's an internal database identifier. The route variable name `slug` is semantically incorrect and misleading.

**File:** `src/app/admin/(dashboard)/gallery/[slug]/page.tsx`, Lines 22–23

**Recommended Fix:** Rename the dynamic param to `[folderId]` to match the actual semantics, or properly implement slug-based routing using the `slug` field that exists on the `FolderModel`.

---

## 3. CODE QUALITY {#code-quality}

---

### CQ-01 — Pervasive Use of `(foo as any)` in Service Layer

**Severity: High**

**Why it's a problem:** The `any` cast is used in 8+ places across the service layer to work around Mongoose populated field types. This completely defeats TypeScript's type safety in the most critical layer — the data layer.

**Files and Lines:**
- `src/lib/services/event.service.ts`, Lines 31, 76, 111 — `(event.createdBy as any)?._id?.toString?.()`
- `src/lib/services/photo.service.ts`, Line 131 — `(p as any).createdAt`
- `src/lib/services/folder.service.ts`, Lines 65, 158, 160 — `(f as any).createdAt`, `(folder as any).name`, `(folder as any).eventId`

**Recommended Fix:** Create typed Mongoose population interfaces. Use `mongoose.Types.ObjectId | PopulatedUser` discriminated unions, or use `lean()` with explicit document type parameters.

---

### CQ-02 — Incorrect Error Message in `use-file-upload.ts`

**Severity: Medium**

**Why it's a problem:** The file size limit constant is set to `50 * 1024 * 1024` (50 MB) at line 9, but the error message displayed to users at line 200 says `"File exceeds 5MB limit"`. The stated limit is 10× less than the actual implemented limit.

**File:** `src/hooks/use-file-upload.ts`, Lines 9, 200

```ts
const maxFileSize = 50 * 1024 * 1024; // 50 MB
// ...
error: "File exceeds 5MB limit", // WRONG: says 5MB but limit is 50MB
```

**Why it matters in production:** Users see an incorrect error message. Beyond confusing UX, this reveals a lack of correctness review during development.

---

### CQ-03 — `useState()` Called with a Callback for Side-Effect (Wrong API)

**Severity: Medium**

**Why it's a problem:** In `FolderPhotoGrid`, the developer uses `useState(() => {...})` as a poor imitation of `useEffect` to synchronize a ref. `useState` initializer callbacks are only called once on mount, which makes this work accidentally — but it is semantically incorrect and will behave unexpectedly if components re-render with different `completedCount` props.

**File:** `src/components/feature-specific/gallery/folder-photo-grid.tsx`, Lines 27–30

```ts
useState(() => {
  // Sync initial count
  lastCompletedRef.current = completedCount;
});
```

**Recommended Fix:** Replace with `useEffect(() => { lastCompletedRef.current = completedCount; }, [])` or simply initialize the ref directly: `const lastCompletedRef = useRef(completedCount);`.

---

### CQ-04 — Side Effect Triggered During Render (Non-Idiomatic React)

**Severity: High**

**Why it's a problem:** Immediately after the `useState` anti-pattern above, `router.refresh()` is called at the component's top-level render scope — outside of any effect, event handler, or callback. This means `router.refresh()` can be called on every render, not just when `completedCount` actually increases.

**File:** `src/components/feature-specific/gallery/folder-photo-grid.tsx`, Lines 32–35

```ts
if (completedCount > lastCompletedRef.current) {
  lastCompletedRef.current = completedCount;
  router.refresh(); // Called during render!
}
```

**Recommended Fix:** Move this logic into a `useEffect` with `completedCount` as a dependency. This is a React strict mode violation and will cause double-invocation issues.

---

### CQ-05 — `setIsUploading` State Is Declared but Never Called in `use-file-upload.ts`

**Severity: Medium**

**Why it's a problem:** `const [isUploading, setIsUploading] = useState(false)` is declared at line 47, but `setIsUploading` is never called anywhere in the hook. The `isUploading` value is always `false`, making it a useless state variable returned by the hook.

**File:** `src/hooks/use-file-upload.ts`, Lines 47, 240

**Recommended Fix:** Either remove `isUploading` from this hook (since the hook is likely dead code anyway — see ARCH-02), or implement the actual uploading state toggle.

---

### CQ-06 — `createEvent` Returns a Hardcoded `"Assigned User"` String

**Severity: Low**

**Why it's a problem:** After creating an event, the service returns `createdBy.name: "Assigned User"` rather than resolving the actual user's name. This is a placeholder that made it into the service layer.

**File:** `src/lib/services/event.service.ts`, Lines 47–56

```ts
createdBy: {
  id: event.createdBy.toString(),
  name: "Assigned User", // Hardcoded placeholder!
},
```

**Recommended Fix:** After creating the event, either populate the `createdBy` field or pass the user's name as an argument.

---

### CQ-07 — `console.log(error)` Used in Upload Catch Block (Not `console.error`)

**Severity: Low**

**Why it's a problem:** In the `uploadFile` function catch block, `console.log(error)` is used instead of `console.error(error)`. This means upload failures are logged at the wrong severity level and won't be captured by error monitoring tools that filter for `error` level logs.

**File:** `src/hooks/use-file-upload.ts`, Line 166

---

### CQ-08 — `UpdateEvent` Allows `createdBy` Field to Be Changed By Any Caller

**Severity: High**

**Why it's a problem:** The `updateEvent` service accepts `createdBy` as an updatable field. This means a caller who knows an event ID can reassign the ownership of any event to any user, simply by passing `createdBy` in the update payload.

**File:** `src/lib/services/event.service.ts`, Lines 83–99

```ts
...(payload.createdBy ? { createdBy: payload.createdBy } : {}),
```

**Recommended Fix:** Remove `createdBy` from the updatable fields. Ownership should never be transferable through a standard update action.

---

### CQ-09 — `UserRole` Type Is Incomplete (Mismatch with Schema)

**Severity: Medium**

**Why it's a problem:** The `UserRole` type in `types/index.ts` is defined as `type UserRole = "photographer"`. However, the `User` Mongoose schema defines roles as `enum: ["admin", "photographer"]`. The `"admin"` role exists in the DB but not in the TypeScript type. Any code checking `user.role === "admin"` gets no TypeScript benefit.

**File:** `types/index.ts`, Line 1; `src/models/User.ts`, Lines 32–36

**Recommended Fix:** Update `UserRole` to `"admin" | "photographer"` and use it throughout the codebase.

---

### CQ-10 — `studioData` Typo in `src/types` (Field Inconsistency)

**Severity: Low**

**Why it's a problem:** The `User` model has both `specialization` (single string) AND `specializations` (string array) — two fields that represent the same concept. The `ProfileData` type in `types/index.ts` also perpetuates this duplication. This is schema bloat and leads to confusion about which field is canonical.

**Files:** `src/models/User.ts`, Lines 28–29; `types/index.ts`, Lines 67–68

**Recommended Fix:** Decide on one field. If tags/multiple specializations are needed, use the array. Migrate old data. Remove the singular field.

---

### CQ-11 — `DashboardSnapshot` Type Has Ghost `profile` Field

**Severity: Low**

**Why it's a problem:** `getDashboardSnapshot()` returns an object with `profile` as a field (line 43 of `dashboard.service.ts`), but `DashboardSnapshot` in `types/index.ts` (lines 55–60) does not include a `profile` field. TypeScript would fail here unless the return value has a structural mismatch that was silently ignored.

**Files:** `src/lib/services/dashboard.service.ts`, Line 43; `types/index.ts`, Lines 55–60

---

### CQ-12 — Hardcoded ngrok Dev URL in Production Config

**Severity: Medium**

**Why it's a problem:** `next.config.ts` hardcodes `allowedDevOrigins: ['overgreedily-unrecessive-adalyn.ngrok-free.dev']` — a personal ngrok tunnel domain. This will remain in the production bundle and is a developer artifact that should never be in production config.

**File:** `next.config.ts`, Line 13

**Recommended Fix:** Move dev origins to a `NEXT_PUBLIC_ALLOWED_DEV_ORIGINS` env variable, or use a conditional that only applies in `NODE_ENV !== 'production'`.

---

### CQ-13 — `upload-workspace.tsx` Imports Unused `Select` Component

**Severity: Low**

**Why it's a problem:** Line 7 imports `Select` from `@/components/ui/select` but the actual select element rendered is a native `<select>` HTML element, not the shadcn `Select` component. This is a dead import.

**File:** `src/components/feature-specific/uploads/upload-workspace.tsx`, Line 7

---

### CQ-14 — `PublicGalleryFolders` Props Typed as `any[]`

**Severity: Medium**

**Why it's a problem:** The `folders` prop is typed as `any[]`, completely removing type safety for this component. All folder property accesses (`folder.id`, `folder.title`, `folder.coverUrl`, `folder.photoCount`) are untyped.

**File:** `src/components/feature-specific/gallery/public-gallery-folders.tsx`, Line 6

```ts
interface PublicGalleryFoldersProps {
  folders: any[]; // No type safety
  eventId: string;
}
```

**Recommended Fix:** Use the existing `GalleryFolder` type from `types/index.ts`.

---

### CQ-15 — Upload UI Shows Incorrect Limits: "Max File Size: 15MB" and "Supported Formats: JPG, PNG"

**Severity: Medium**

**Why it's a problem:** The UI in `upload-workspace.tsx` states "Max File Size: 15MB" and "Supported Formats: JPG, PNG" — but the actual store validation allows 50MB and also allows WebP. Three different limits exist across the codebase: 15MB (UI label), 50MB (store constant), 5MB (use-file-upload error message).

**File:** `src/components/feature-specific/uploads/upload-workspace.tsx`, Lines 125–130

---

## 4. PERFORMANCE {#performance}

---

### PERF-01 — N+1 Query Pattern in `cleanupExpiredEvents`

**Severity: High**

**Why it's a problem:** The `cleanupExpiredEvents` function finds all expired events, then calls `deleteEvent(id)` for each one in a sequential `for` loop. Each `deleteEvent` call contains a full MongoDB transaction + Cloudinary API call. For N expired events, this performs N independent transactions and N Cloudinary API calls, with no parallelism.

**File:** `src/lib/services/event.service.ts`, Lines 161–179

```ts
for (const event of expiredEvents) {
  await deleteEvent(event._id.toString()); // N sequential full operations
  deletedCount++;
}
```

**Recommended Fix:** Use `Promise.all()` with a concurrency limiter (e.g., `p-limit`) to process deletions in parallel. At minimum, use `Promise.allSettled()` to avoid one failure blocking all others.

---

### PERF-02 — `listFoldersByEvent` Aggregates ALL Photos for an Event to Compute Per-Folder Stats

**Severity: Medium**

**Why it's a problem:** The aggregation pipeline in `listFoldersByEvent` matches on `eventId` which could return tens of thousands of photos. It computes per-folder stats by grouping in memory. For large events with 1000+ photos, this aggregation runs on every page load of the gallery.

**File:** `src/lib/services/folder.service.ts`, Lines 21–44

**Recommended Fix:** Consider denormalizing `photoCount` onto the `FolderModel` (increment/decrement on mutation) to avoid the aggregation query per request. Add a compound MongoDB index `{ eventId: 1, folderId: 1 }` on the Photo collection.

---

### PERF-03 — Photos Loaded Without Pagination

**Severity: High**

**Why it's a problem:** `listPhotosByFolder` fetches ALL photos for a folder with `.find(query).sort(...).lean()` — no `limit()`, no `skip()`, no cursor-based pagination. A gallery with 1,000 images will return all 1,000 documents to the server component and serialize them all to the client HTML.

**File:** `src/lib/services/photo.service.ts`, Lines 113–133

**Recommended Fix:** Implement cursor-based pagination using MongoDB's `_id`-based cursors, or use `limit()` + `skip()` with page params. Use the Next.js Image component with appropriate `sizes` prop and lazy loading (already partially implemented).

---

### PERF-04 — Image in Upload Queue Uses `<img>` Tag (Not Next.js `<Image>`)

**Severity: Low**

**Why it's a problem:** The `upload-workspace.tsx` and `folder-photo-grid.tsx` use raw `<img>` tags for preview thumbnails (blob URLs). They have `/* eslint-disable @next/next/no-img-element */` comment to suppress the lint warning. While using `<img>` for blob URLs is technically acceptable (Next.js `<Image>` doesn't support blob URLs), this suppressed lint rule could mask future accidental uses of `<img>` for real CDN URLs.

**File:** `src/components/feature-specific/uploads/upload-workspace.tsx`, Line 1; `folder-photo-grid.tsx`, Line 94

**Recommended Fix:** The suppression comment should be scoped as narrowly as possible (inline `eslint-disable-next-line`) rather than a file-level disable. Document why blob URLs require `<img>`.

---

### PERF-05 — `getDashboardSnapshot` Makes 4 Parallel DB Calls But Burns Connection Per Request

**Severity: Medium**

**Why it's a problem:** `getDashboardSnapshot` runs 4 parallel database queries: `listEvents` → connects, `listGalleryFolders` → connects, `fetchProfileById` → connects, `PhotoModel.countDocuments` → connects. Each of these calls `connectToDatabase()` at the top. While the connection is cached after first call, the overhead of the connection cache check on every parallel branch is wasteful.

**File:** `src/lib/services/dashboard.service.ts`, Lines 9–21

**Recommended Fix:** The service can call `connectToDatabase()` once at the top level before the `Promise.all()`, then each individual service sub-function doesn't need to call it again (though this requires architectural trust in call ordering).

---

### PERF-06 — `filtered` Array Is Recomputed on Every Keystroke with No Throttling/Debouncing

**Severity: Low**

**Why it's a problem:** The search filter in `EventsClient` recomputes `filtered` inline as a derived value on every render, which means every keypress triggers a full `events.filter()` pass. For large event lists (100+), this is perceptible jank.

**File:** `src/components/feature-specific/events/events-client.tsx`, Lines 487–494

**Recommended Fix:** Wrap in `useMemo` at minimum. Apply `useDebounce` on the `search` state to delay expensive filtering.

---

### PERF-07 — `counts` Object Also Recalculates on Every Render

**Severity: Low**

**Why it's a problem:** `counts` in `EventsClient` iterates over all events 4 more times (once per status) on every render, in addition to the `filtered` computation.

**File:** `src/components/feature-specific/events/events-client.tsx`, Lines 515–520

**Recommended Fix:** Combine into a single `useMemo` that calculates both `filtered` and `counts` in one pass.

---

## 5. DATABASE / BACKEND {#database}

---

### DB-01 — No Database Indexes Defined on Frequently Queried Fields

**Severity: High**

**Why it's a problem:** The Mongoose schemas define no compound or secondary indexes. The following queries run without index support:
- `PhotoModel.find({ eventId })` — run on every gallery and folder page load
- `PhotoModel.findOne({ hash })` — run before every single photo upload
- `EventModel.find({ createdBy: userId })` — run on dashboard and events page
- `FolderModel.find({ eventId, createdBy: userId })` — run on gallery page
- `PhotoModel.countDocuments({ uploadedBy: userId })` — run on dashboard

Without indexes, MongoDB performs full collection scans for all of these. As the photo collection grows to 10,000+ documents, all queries degrade linearly.

**Files:** `src/models/Photo.ts`, `src/models/Event.ts`, `src/models/Folder.ts`

**Recommended Fix:**
```
PhotoModel:  { hash: 1 } unique, { eventId: 1 }, { folderId: 1 }, { uploadedBy: 1 }
EventModel:  { createdBy: 1 }, { date: 1 }
FolderModel: { eventId: 1, createdBy: 1 }
```

---

### DB-02 — `connectToDatabase()` Uses Non-Thread-Safe Global Caching Pattern

**Severity: Medium**

**Why it's a problem:** The connection caching uses Node.js `global` as the cache store. While the standard Next.js pattern, this approach has edge cases in Vercel Edge Runtime, and the current implementation is missing the `mongoose.connection.readyState` check. If the promise resolves but the connection is later dropped, `globalCache.conn` still holds the stale reference.

**File:** `src/lib/db/mongodb.ts`, Lines 12–38

**Recommended Fix:** Add a `mongoose.connection.readyState === 1` check before returning the cached connection. Consider using the official `mongoose` connection event-based pattern.

---

### DB-03 — `deleteFolder` Is Not Wrapped in a Transaction

**Severity: High**

**Why it's a problem:** Deleting a folder involves at minimum two operations: deleting the folder record and deleting associated photos. As currently implemented, only the folder record is deleted. This is not atomic — covered in SEC-10 — but even once photos are added, no transaction wraps the operation, meaning partial failures leave the database in an inconsistent state.

**File:** `src/lib/services/folder.service.ts`, Lines 134–142

---

### DB-04 — `createPhoto` Has a TOCTOU Race Condition on the 24-Hour Window

**Severity: Medium**

**Why it's a problem:** The time window check (lines 26–36 in `photo.service.ts`) reads the event date, computes the window, then creates the photo — all as separate operations with no transaction. Two simultaneous uploads at the exact window boundary could both pass the check and both create photos even if one should be rejected.

**File:** `src/lib/services/photo.service.ts`, Lines 26–38

**Recommended Fix:** Use a MongoDB atomic update with a query-time time check, or use a distributed lock.

---

### DB-05 — `getFolderMeta` Makes Two Separate DB Calls (N+1 micro-pattern)

**Severity: Low**

**Why it's a problem:** For non-"all" folders, `getFolderMeta` first queries `FolderModel.findById` and then separately queries `PhotoModel.countDocuments`. These are two round trips where one aggregation pipeline could achieve both.

**File:** `src/lib/services/photo.service.ts`, Lines 136–162

---

### DB-06 — `updateEvent` Allows Optional Fields to Be Partially Missing Without Validation

**Severity: Medium**

**Why it's a problem:** The partial schema allows all fields to be optional, meaning `updateEventAction` could be called with an empty body and `updateEvent` would succeed but update nothing (no fields change). No minimum "at least one field must be present" validation exists.

**File:** `src/lib/services/event.service.ts`, Lines 82–99; `src/app/admin/(dashboard)/events/event.actions.ts`, Line 17

---

## 6. UI / UX / ACCESSIBILITY {#ui-ux}

---

### UX-01 — Search Input in DashboardShell Is a Non-Functional Decoration

**Severity: Medium**

**Why it's a problem:** The search input in the header (`dashboard-shell.tsx`) has no `onChange`, no `value`, no state — it is a static `<input>` with placeholder text that does nothing when typed in. This is extremely confusing UX and a trust-damaging experience.

**File:** `src/components/shared/dashboard-shell.tsx`, Lines 47–51

**Recommended Fix:** Either implement global search or remove the input. A non-functional input is worse than no input.

---

### UX-02 — Notification Bell Has No Implementation

**Severity: Low**

**Why it's a problem:** The notification bell button in `dashboard-shell.tsx` has no `onClick`, no badge, no panel — it is purely decorative chrome.

**File:** `src/components/shared/dashboard-shell.tsx`, Lines 56–61

---

### UX-03 — No `<title>` or `<meta description>` on Any Page

**Severity: Medium**

**Why it's a problem:** No page in the application exports a `metadata` object or `generateMetadata()` function. There are no `<title>` tags, no `<meta name="description">` tags, and no Open Graph tags. Every page uses the Next.js default title, which for production is essentially empty or shows the app framework name.

**Files:** All `page.tsx` files

**Recommended Fix:** Add `export const metadata: Metadata = { title: "...", description: "..." }` to each page (or at the layout level). For dynamic pages like `[eid]`, implement `generateMetadata()`.

---

### UX-04 — Lightbox Has No Keyboard `Escape` to Close

**Severity: Medium**

**Why it's a problem:** The photo lightbox in `FolderPhotoGrid` can be closed by clicking the backdrop or the X button, but has no keyboard event listener. Pressing `Escape` does nothing. This is a basic accessibility requirement (WCAG 2.1 criterion 2.1.1 Keyboard).

**File:** `src/components/feature-specific/gallery/folder-photo-grid.tsx`, Lines 154–180

**Recommended Fix:** Add `onKeyDown` on the lightbox backdrop container (with `tabIndex={-1}` and auto-focus) that handles `key === "Escape"` → `setLightbox(null)`.

---

### UX-05 — Delete Confirmation Modal Can Be Dismissed by Clicking Backdrop While Deleting

**Severity: Low**

**Why it's a problem:** The delete modal backdrop (`onClick={onClose}`) is always clickable, even when `isDeleting` is true. A user could accidentally click outside the modal while the delete is in-progress, closing the modal while the operation continues in the background with no visible indicator.

**File:** `src/components/feature-specific/events/events-client.tsx`, Lines 428–431

**Recommended Fix:** Disable the backdrop click while `isDeleting` is true: `onClick={isDeleting ? undefined : onClose}`.

---

### UX-06 — Upload Widget Conflict: Uploads Are Queued Globally But Context Is Per-Page

**Severity: High**

**Why it's a problem:** The global upload store holds a single `uploadContext` (`eventId`, `eventName`, `uploadedBy`, `folderId`). If a user navigates from the Uploads page (where they select an event) to the Gallery folder page, the `uploadContext` changes because `FolderPhotoGrid` calls `addFiles()` with a new context. Files queued from the previous page inadvertently inherit the new context's `folderId`. This creates a context-switching race condition in the global queue.

**Files:** `src/store/upload-store.ts` (line 192), `src/components/feature-specific/uploads/upload-workspace.tsx` (line 41), `src/components/feature-specific/gallery/folder-photo-grid.tsx` (line 40)

---

### UX-07 — No Loading/Skeleton States on Gallery Pages

**Severity: Medium**

**Why it's a problem:** The public gallery page and the admin gallery page use server-side fetching with no Suspense boundaries or skeleton states. During slow DB fetches, users see a blank/empty page until the server rendering completes.

**Files:** `src/app/event/[eid]/gallery/page.tsx`, `src/app/admin/(dashboard)/gallery/[slug]/page.tsx`

**Recommended Fix:** Wrap data-fetching components in `<Suspense fallback={<SkeletonGallery />}>` with meaningful loading UI.

---

## 7. INDUSTRY STANDARDS & BEST PRACTICES {#standards}

---

### STD-01 — `README.md` Is Nearly Empty

**Severity: Low**

**Why it's a problem:** The `README.md` is 29 bytes. Any developer joining the project — or any open-source user — has no onboarding documentation, no setup instructions, no environment variable guide, and no architecture overview.

**File:** `README.md`

---

### STD-02 — `vercel.json` Exists but Not Audited for Security Headers

**Severity: Medium**

**Why it's a problem:** The `vercel.json` exists but was not found to contain security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`, `Strict-Transport-Security`, `Referrer-Policy`). Modern production web applications require HTTP security headers.

**File:** `vercel.json`

**Recommended Fix:** Add a `headers` block in `vercel.json` or `next.config.ts` with standard security headers.

---

### STD-03 — `NODE_ENV = production` Hardcoded in `.env`

**Severity: High**

**Why it's a problem:** `NODE_ENV` is hardcoded as `production` in the `.env` file at line 10. This means `NODE_ENV` is `production` during local development, which:
- Disables React development mode warnings
- Makes Next.js skip certain dev-only validations
- Makes `secure: process.env.NODE_ENV === "production"` on cookies always `true`, breaking local HTTP development

**File:** `.env`, Line 10

**Recommended Fix:** Never set `NODE_ENV` in a `.env` file — the runtime (Next.js dev/build/start) sets this automatically. Remove it from `.env`.

---

### STD-04 — `NEXTAUTH_SECRET` Set but NextAuth Not Used

**Severity: Low**

**Why it's a problem:** `.env` has `NEXTAUTH_SECRET=` (empty value). The application doesn't use NextAuth — it implements custom JWT auth. This leftover variable creates confusion about what auth system is in use.

**File:** `.env`, Line 7

---

### STD-05 — No Error Monitoring / Observability Configured

**Severity: High**

**Why it's a problem:** There is no Sentry, Datadog, or any structured error monitoring integration. Production errors are only logged to `console.error()`. This means:
- Silent failures are invisible to the team
- Upload errors experienced by users are never seen by developers
- Database errors go undetected until a user complains

**Recommended Fix:** Integrate Sentry (`@sentry/nextjs`) with source map uploads for both client and server error capture.

---

### STD-06 — No Unit or Integration Tests Exist

**Severity: High**

**Why it's a problem:** No test files, no `jest.config.js`, no `vitest.config.ts`, no `playwright` or `cypress` setup was found. The entire application has zero automated test coverage. Critical business logic (event time windows, delete cascades, authentication) is completely untested.

**Recommended Fix:** At minimum, write unit tests for:
- `createPhoto` time window validation
- `registerUser` / `loginUser` auth flows  
- `deleteEvent` cascade behavior
- `getDefaultStatus` event status calculation

---

### STD-07 — JWT Token Has No Role Claim

**Severity: High**

**Why it's a problem:** The `SessionToken` interface contains only `sub`, `name`, and `email`. There is no `role` claim in the JWT. Yet the codebase has `isAdmin` prop passed around in client components (e.g., `events-client.tsx`). This `isAdmin` flag is derived from... unclear logic. Without a role in the JWT, the server cannot make authorization decisions based on role in middleware or API routes.

**Files:** `src/lib/utils/auth.ts` (lines 7–11), `types/index.ts` (line 1)

**Recommended Fix:** Add `role: UserRole` to the `SessionToken`. Sign it during login and verify it in `requireSession()`. Use this to protect admin-only routes and server actions.

---

### STD-08 — No Next.js Middleware for Route Protection

**Severity: High**

**Why it's a problem:** There is no `middleware.ts` at the root of the project. Route protection for `/admin/*` routes relies entirely on the layout component (`(dashboard)/layout.tsx`) which calls `getCurrentSession()` and redirects. This is acceptable but means:
- Edge-case route segments that miss the layout guard are completely unprotected
- No centralized audit trail of auth checks
- Crawlers and bots hit protected pages and render the full server component tree before being redirected

**Recommended Fix:** Implement `middleware.ts` using `jwtVerify` on the Edge Runtime to protect all `/admin/*` routes before the page renders.

---

### STD-09 — `eslint-disable` at File Level Suppresses Important Next.js Image Warnings

**Severity: Low**

**Why it's a problem:** `/* eslint-disable @next/next/no-img-element */` at line 1 of `upload-workspace.tsx` disables the rule for the entire file. If new `<img>` tags for remote URLs are added in the future, ESLint won't catch them.

**File:** `src/components/feature-specific/uploads/upload-workspace.tsx`, Line 1

---

### STD-10 — `generate-secret.js` Exists at Project Root — Utility Script Left in Repository

**Severity: Low**

**Why it's a problem:** A utility script (`generate-secret.js`) exists at the project root. Utility scripts like this should either be in a `scripts/` directory with proper documentation or removed from the repository entirely. Leaving loose JS scripts at the root is unprofessional and can be confusing.

**File:** `generate-secret.js` (root)

---

## 8. SUMMARY SECTIONS {#summary}

---

### 🔴 Top 5 Most Critical Problems

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | **Live credentials committed to `.env`** — active MongoDB, Google, Cloudinary secrets exposed | `.env` | CRITICAL |
| 2 | **No OAuth CSRF state protection** — Google OAuth flow is CSRF-exploitable | `api/auth/google/route.ts` | CRITICAL |
| 3 | **Cron cleanup route bypasses auth when `CRON_SECRET` is not set** — anyone can wipe the database | `api/cron/cleanup/route.ts` | CRITICAL |
| 4 | **No database indexes on any queried fields** — all queries are full collection scans | `models/Photo.ts`, `Event.ts`, `Folder.ts` | HIGH |
| 5 | **JWT has no role claim + no middleware.ts** — authorization relies on client-side `isAdmin` prop and layout-level redirects only | `lib/utils/auth.ts`, no `middleware.ts` | HIGH |

---

### 🏗️ Technical Debt Risks

- **Dual upload systems** (`use-file-upload.ts` alongside `upload.service.ts`) will diverge further with every sprint if not consolidated now.
- **`any` casts throughout the service layer** will mask regressions when Mongoose schema types evolve.
- **Hardcoded time window constants** (24 hours, 48 hours) scattered across `photo.service.ts` and `events-client.tsx` with no shared config — future window changes must be made in multiple places.
- **No tests at all** means any refactor is a guessing game. Technical debt grows exponentially without a test harness.
- **Two type directories** (`types/` and `src/types/`) will continue to drift — duplicate `UploadQueueItem` definitions are already mismatched.

---

### 📈 Scalability Risks

- **No pagination on photos** — at 1,000+ photos per event gallery, server-rendered pages will OOM or timeout.
- **Sequential N+1 cron deletion** — cleanup takes O(N) full transactions, each with a Cloudinary API call. At 50 expired events, cleanup jobs could run for minutes.
- **No Redis/KV for caching** — every dashboard load hits MongoDB 4 times. As user count grows, connection pool exhaustion becomes likely.
- **Zustand upload store has no persistence** — a page hard-refresh loses the entire upload queue with no recovery mechanism.
- **Single `uploadContext` in global store** — will not scale to concurrent multi-event uploads (e.g., bulk upload from different events simultaneously).

---

### 🔒 Security Risks (Ranked)

1. **Exposed `.env` with real credentials** → Immediate database, OAuth, and cloud storage compromise.
2. **No CSRF on OAuth** → Session hijacking via CSRF.
3. **Cron route unprotected without env var** → Data destruction by any HTTP client.
4. **Photo ownership not verified in API** → Cross-photographer photo injection.
5. **Cloudinary sign endpoint signs arbitrary params** → Unauthorized Cloudinary operations.
6. **No rate limiting anywhere** → Brute-force, enumeration, and DoS attacks.
7. **`createdBy` updatable in event update** → Event ownership hijacking.

---

### 📋 Recommended Refactor Priorities (Ordered Roadmap)

#### Phase 1: Emergency (Do Today)
1. **Rotate all credentials** exposed in `.env`. Treat them as compromised.
2. **Add CSRF state nonce** to the Google OAuth flow.
3. **Fix the cron route auth logic** to deny by default.
4. **Remove `NODE_ENV=production` from `.env`**.

#### Phase 2: Security Hardening (This Week)
5. Add **event ownership check** to `POST /api/photos`.
6. **Whitelist** the params in `sign-cloudinary-params` — never sign arbitrary client input.
7. Add **rate limiting** to all API routes using `upstash/ratelimit` or similar.
8. Add **role claim to JWT** and implement `middleware.ts` for route protection.
9. Add **cascade delete** to `deleteFolder` (photos + Cloudinary assets).

#### Phase 3: Code Quality (Next Sprint)
10. **Delete `use-file-upload.ts`** — it is dead code that duplicates the global upload service.
11. **Fix all `any` casts** in the service layer with proper Mongoose population types.
12. **Fix `FolderPhotoGrid`** — move `router.refresh()` out of render into `useEffect`.
13. **Consolidate type directories** into `src/types/` only.
14. **Add `UserRole`** `"admin"` to the type definition.
15. **Remove hardcoded ngrok URL** from `next.config.ts`.

#### Phase 4: Performance (This Month)
16. **Add MongoDB indexes** to all queried fields on Photo, Event, Folder models.
17. **Implement pagination** in `listPhotosByFolder` — use cursor-based pagination.
18. **Debounce** the search filter in `EventsClient` and wrap `filtered` + `counts` in `useMemo`.
19. **Parallelize** the cron cleanup using `Promise.allSettled` + concurrency limit.

#### Phase 5: Production Readiness (Before Launch)
20. **Add Sentry** for error monitoring.
21. **Write tests** for core business logic (auth, time windows, cascade deletes).
22. **Add metadata** (`<title>`, `<meta description>`) to all pages.
23. **Add HTTP security headers** in `vercel.json` or `next.config.ts`.
24. **Implement global search** or remove the non-functional header search input.
25. **Add Suspense/skeleton states** to gallery pages.

---

*End of Audit — 25 issues flagged across Security (10), Architecture (7), Code Quality (15), Performance (7), Database (6), UX (7), Standards (10).*
