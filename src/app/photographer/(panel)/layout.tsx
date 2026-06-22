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

  // Use native driver to check isBlocked and phoneNumber
  const conn = await connectToDatabase();
  const user = await conn.connection.collection("users").findOne(
    { email: session.email.toLowerCase() },
    { projection: { isBlocked: 1 } }
  );

  if (!user) {
    redirect("/photographer/login");
  }

  const isBlocked = (user.isBlocked as boolean | undefined) ?? false;

  if (isBlocked) {
    redirect("/photographer/login?blocked=true");
  }

  return <DashboardShell user={session}>{children}</DashboardShell>;
}
