import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { getCurrentSession } from "@/lib/services/auth.service";
import { connectToDatabase } from "@/lib/db/mongodb";

export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/photographer/login");
  }

  // Use native driver to check isApproved — correctly handles legacy documents
  // where the field may be absent (treated as falsy = not approved).
  const conn = await connectToDatabase();
  const user = await conn.connection.collection("users").findOne(
    { email: session.email.toLowerCase() },
    { projection: { isApproved: 1 } }
  );

  if (!user) {
    redirect("/photographer/login");
  }

  const isApproved = (user.isApproved as boolean | undefined) ?? false;

  if (!isApproved) {
    redirect("/photographer/login?pending=true");
  }

  return <DashboardShell user={session}>{children}</DashboardShell>;
}
