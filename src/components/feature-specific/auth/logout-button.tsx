"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LogoutButtonProps {
  redirectPath: string;
}

export function LogoutButton({ redirectPath }: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    if (isPending) return;
    setIsPending(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        router.push(redirectPath);
        router.refresh();
      } else {
        console.error("Logout failed");
        setIsPending(false);
      }
    } catch (error) {
      console.error("Error during logout:", error);
      setIsPending(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
    >
      <LogOut className="h-5 w-5" />
      {isPending ? "Signing out..." : "Sign Out"}
    </button>
  );
}
