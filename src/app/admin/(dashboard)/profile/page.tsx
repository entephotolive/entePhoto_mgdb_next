import { requireSession } from "@/lib/services/auth.service";
import { getProfile, getPortfolioMoments } from "@/app/admin/(dashboard)/profile/action";
import { ProfileForm } from "@/components/feature-specific/profile/profile-form";
import { PortfolioShowcase } from "@/components/feature-specific/profile/portfolio-showcase";
import type { ProfileData } from "@/types";

export const metadata = {
  title: "Edit Profile — Photo Ceremony",
  description:
    "Update your professional profile, studio details, and portfolio on Photo Ceremony.",
};

export default async function ProfilePage() {
  const session = await requireSession();

  // Fetch profile — fall back to session data if no DB record yet
  let profile: ProfileData = {
    id: session.id,
    name: session.name,
    email: session.email,
    studioName: "",
    studioLocation: "",
    specialization: "",
    specializations: [],
    bio: "",
    avatarUrl: "",
  };

  // Fetch both in parallel
  const [dbProfile, moments] = await Promise.all([
    getProfile(session.id),
    getPortfolioMoments(session.id),
  ]);

  if (dbProfile) profile = dbProfile;

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      {/* Page header */}
      <div className="text-center pt-4 pb-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">Edit Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Update your professional presence in the celestial gallery.
        </p>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Left — Profile Form (client) */}
        <ProfileForm initialData={profile} userId={session.id} />

        {/* Right — Portfolio Showcase (client) — real moments from DB */}
        <PortfolioShowcase userId={session.id} initialMoments={moments} />
      </div>

      {/* Footer note */}
      <p className="text-center text-[10px] text-slate-700 uppercase tracking-widest">
        All changes are synced to your creator profile globally.
      </p>
    </div>
  );
}
