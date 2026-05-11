import { redirect } from "next/navigation";
import { ShieldCheck, Users, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentAdminSession } from "@/lib/services/auth.service";

export default async function AdminPage() {
  const session = await getCurrentAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Badge variant="secondary" className="border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          Authenticated admin session
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight">Welcome back, {session.name}</h1>
        <p className="max-w-2xl text-slate-400">
          This is your central command center for managing the Photo Ceremony platform. 
          Use the navigation to manage photographers, events, and system settings.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-6 transition-all hover:border-emerald-500/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">Security first</h2>
          <p className="mt-2 text-sm text-slate-400">
            Admin and photographer logins use distinct collection-based validation.
          </p>
        </Card>
        
        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-6 transition-all hover:border-emerald-500/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">User management</h2>
          <p className="mt-2 text-sm text-slate-400">
            Monitor activity and manage access for all registered photographers.
          </p>
        </Card>

        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-6 transition-all hover:border-emerald-500/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">System health</h2>
          <p className="mt-2 text-sm text-slate-400">
            Check processing status and AI face recognition performance.
          </p>
        </Card>
      </div>
    </div>
  );
}
