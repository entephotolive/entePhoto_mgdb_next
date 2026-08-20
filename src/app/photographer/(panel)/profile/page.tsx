import { requireSession } from "@/lib/services/auth.service";
import {
  getProfile,
  getPortfolioMoments,
} from "@/app/photographer/(panel)/profile/action";
import { ProfileForm } from "@/components/feature-specific/profile/profile-form";
import { PortfolioShowcase } from "@/components/feature-specific/profile/portfolio-showcase";
import { PaymentHistory } from "@/components/feature-specific/profile/payment-history";
import { connectToDatabase } from "@/lib/db/mongodb";
import { PaymentModel } from "@/models/Payment";
import type { ProfileData } from "@/types";

export const metadata = {
  title: "Edit Profile — Ente photo",
  description:
    "Update your professional profile, studio details, and portfolio on Ente photo.",
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
    phoneNumber: "",
    phoneNumbers: [],
    emails: [],
    instagramUrl: "",
    facebookUrl: "",
  };

  // Connect to DB and fetch profile, portfolio moments, and payment history in parallel
  await connectToDatabase();
  const [dbProfile, moments, dbPayments] = await Promise.all([
    getProfile(session.id),
    getPortfolioMoments(session.id),
    PaymentModel.find({ createdBy: session.id }).sort({ createdAt: -1 }).lean(),
  ]);

  if (dbProfile) profile = dbProfile;

  // Serialize Payments safely for Client Component boundaries
  const serializedPayments = dbPayments.map((p: any) => ({
    _id: p._id.toString(),
    invoiceNumber: p.invoiceNumber,
    orderId: p.orderId,
    paymentId: p.paymentId,
    amount: p.amount,
    currency: p.currency,
    serviceType: p.serviceType,
    eventTitle: p.eventTitle,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      {/* Page header */}
      <div className="text-center pt-4 pb-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Edit Profile
        </h1>
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

        {/* Full width bottom — Payment and Billing logs */}
        <PaymentHistory
          payments={serializedPayments}
          photographerName={profile.name}
          photographerEmail={profile.email}
        />
      </div>

      {/* Footer note */}
      <p className="text-center text-[10px] text-slate-700 uppercase tracking-widest">
        All changes are synced to your creator profile globally.
      </p>
    </div>
  );
}
