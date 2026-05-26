import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/feature-specific/auth/admin-login-form";
import { getCurrentAdminSession } from "@/lib/services/auth.service";

export default async function LoginPage() {
  const session = await getCurrentAdminSession();
  if (session) {
    redirect("/admin");
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] animate-pulse rounded-full bg-cyan-500/10 blur-[120px]" />
        <div
          className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] animate-pulse rounded-full bg-blue-600/10 blur-[120px]"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <AdminLoginForm />
      </div>
    </div>
  );
}

