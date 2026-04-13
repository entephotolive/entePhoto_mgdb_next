/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandMark } from "@/components/shared/brand-mark";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const urlError = searchParams.get("error");
      if (urlError) {
        setError(urlError);
      }
    }
  }, []);

  async function handleGoogleSignIn() {
    setError(null);
    setIsPending(true);

    try {
      window.location.href = "/api/auth/google";
    } catch (err) {
      setError("Failed to initialize Google Sign-In.");
      setIsPending(false);
    }
  }

  return (
    <Card variant="glass" className="w-full border-white/10 p-8 shadow-2xl backdrop-blur-2xl transition-all duration-500 hover:border-white/20">
      <div className="flex flex-col items-center">
        <BrandMark />
        
        <div className="mt-2 space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Admin Portal
          </h1>
          <p className="text-sm font-medium text-slate-400">
            Sign in to access your dashboard
          </p>
        </div>
      </div>

      <div className="mt-10 space-y-6">
        {error ? (
          <div className="rounded-lg bg-rose-500/10 p-3 text-center text-sm font-medium text-rose-400 border border-rose-500/20">
            {error}
          </div>
        ) : null}

        <Button
          className="relative h-12 w-full overflow-hidden rounded-xl bg-white text-slate-950 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
          onClick={handleGoogleSignIn}
          disabled={isPending}
        >
          {isPending ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
              <span>Redirecting...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <svg className="h-5 w-5" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
              </svg>
              <span>Continue with Google</span>
            </div>
          )}
        </Button>
        <p className="text-center text-xs text-slate-500 uppercase tracking-widest font-semibold">
          Secure Access
        </p>
      </div>
    </Card>
  );
}
