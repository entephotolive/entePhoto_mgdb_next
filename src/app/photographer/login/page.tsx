"use server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/feature-specific/auth/login-form";
import { getCurrentPhotographerSession } from "@/lib/services/auth.service";
import { connectToDatabase } from "@/lib/db/mongodb";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const isSetupPhone = resolvedSearchParams?.setup_phone === "true";

  const session = await getCurrentPhotographerSession();
  
  if (session) {
    // Only redirect if they are not blocked and not currently in setup_phone flow
    const conn = await connectToDatabase();
    const user = await conn.connection.collection("users").findOne(
      { email: session.email.toLowerCase() },
      { projection: { isBlocked: 1 } }
    );
    
    const isBlocked = user?.isBlocked as boolean | undefined;

    if (!isBlocked && !isSetupPhone) {
      redirect("/photographer/dashboard");
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      {/* Background Decorative Elements - contained to prevent scrolling */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.05]" 
             style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}

