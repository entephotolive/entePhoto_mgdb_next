# 📸 Photo Ceremony — Admin Darkroom

A premium, high-performance orchestration panel for professional photography events. Built for speed, security, and a "wow" aesthetic.

---

## 🛠️ Tech Stack (The Real Deal)

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **Authentication**: Custom JWT Engine ([jose](https://github.com/panva/jose)) + Google OAuth 2.0
- **File Storage**: [Cloudinary](https://cloudinary.com/) (Secure Signed Uploads)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) (Persistent Global Store)
- **Validation**: [Zod](https://zod.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Runtime**: Recommended with [Bun](https://bun.sh/)

---

## ✨ Key Features

### 1. Global Background Uploads
- **Persistence**: Navigation doesn't break uploads. A global Zustand-managed queue continues in the background.
- **Progress Tracking**: Real-time XHR-based progress percentages for every file.
- **Duplicate Detection**: Client-side SHA-256 hashing prevents multi-gigabyte redundant uploads before they hit the wire.
- **Worker Logic**: Decoupled service layer (`upload.service.ts`) handles sequential processing outside the React lifecycle.

### 2. Intelligent Gallery Management
- **Dynamic Folders**: Organize captures into event-specific folders with auto-generated cover previews.
- **Cloudinary Integration**: Fully signature-secured uploads. Public assets are optimized via CDN transformations.
- **QR Orchestration**: Instant QR code generation for public event galleries.

### 3. Analytics Dashboard
- **Live Metrics**: Aggregated counts for events, folders, and total photographer contributions using MongoDB aggregation pipelines.
- **Clean Architecture**: Clear separation between UI components, Server Actions, and the Service Layer.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ or **Bun** (Highly Recommended)
- A MongoDB Atlas instance or local installation
- Cloudinary Account (Standard Plan)
- Google Cloud Console Project (for OAuth)

### Environment Variables
Create a `.env` file based on the audited requirements:

```env
# Database
MONGODB_URI="mongodb+srv://..."

# Security
JWT_SECRET="your_long_secure_secret"
CRON_SECRET="your_cron_auth_token"

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="..."
NEXT_PUBLIC_CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

### Installation & Run

```bash
# Install dependencies
bun install

# Run development server
bun dev
```

---

## 📂 Project Architecture

```text
full-stack/
├── src/
│   ├── app/                # Next.js App Router (Admin & Public routes)
│   ├── components/
│   │   ├── ui/             # Tailored Shadcn/Modern UI primitives
│   │   ├── shared/         # Layout shells, sidebars, nav
│   │   └── feature-specific/ # Events, Gallery, Upload logic
│   ├── hooks/              # Global upload & UI hooks
│   ├── lib/
│   │   ├── services/       # CORE LOGIC (Events, Photos, Auth, Uploads)
│   │   ├── db/             # MongoDB Connection handling
│   │   └── utils/          # Hashing, Auth, Image compression
│   ├── models/             # Mongoose Schemas (User, Event, Folder, Photo)
│   └── store/              # Zustand global state (Upload Store)
└── types/                  # Canonical TypeScript definitions
```

---

## 🛡️ Security Architecture
- **Signed Requests**: No direct Cloudinary secret exposure. All uploads are signed via a server-side proxy (`/api/sign-cloudinary-params`).
- **Middleware-Lite**: Layout-level session guarding using Secure JWTs.
- **Cron Protection**: Secret-header-based auth for automatic event cleanup jobs.

---

## 📜 License
Internal / Private Proprietary