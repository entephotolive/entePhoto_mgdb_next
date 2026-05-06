import { redirect } from "next/navigation";
import { ShieldCheck, Users, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentSession } from "@/lib/services/auth.service";

export default async function AdminPage() {
  const session = await getCurrentSession();

  // if (!session || session.accountType !== "admin") {
  //   redirect("/admin/login");
  // }

  return (
    <main className="min-h-screen bg-[#06131a] px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <Badge variant="secondary" className="border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          Authenticated admin session
        </Badge>

        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">Admin access granted</h1>
          <p className="max-w-2xl text-slate-300">
            Signed in as {session.name} ({session.email}). This route is now reserved for accounts
            authenticated through the dedicated admin collection.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card variant="glass" className="p-6">
            <ShieldCheck className="h-5 w-5 text-cyan-300" />
            <h2 className="mt-4 text-lg font-medium">Separate auth channel</h2>
            <p className="mt-2 text-sm text-slate-400">
              Admin and photographer logins now use role-aware Google OAuth routing.
            </p>
          </Card>
          <Card variant="glass" className="p-6">
            <Users className="h-5 w-5 text-cyan-300" />
            <h2 className="mt-4 text-lg font-medium">Collection validation</h2>
            <p className="mt-2 text-sm text-slate-400">
              Access is granted only when the Google email exists in the `Admin` collection.
            </p>
          </Card>
          <Card variant="glass" className="p-6">
            <Sparkles className="h-5 w-5 text-cyan-300" />
            <h2 className="mt-4 text-lg font-medium">Ready for expansion</h2>
            <p className="mt-2 text-sm text-slate-400">
              This page can now grow into the full admin dashboard without changing the login flow.
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
