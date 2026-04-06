/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <Card variant="glass" className="w-full max-w-md p-6 sm:p-8">
      <div className="flex flex-col items-center text-center">
        <h1 className="text-3xl font-semibold text-white">Welcome back</h1>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Sign in to access the studio control center.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {error ? <p className="text-sm text-rose-300 text-center">{error}</p> : null}

        <Button
          className="w-full bg-white text-slate-950 hover:bg-slate-200"
          onClick={handleGoogleSignIn}
          disabled={isPending}
        >
          {isPending ? "Redirecting..." : (
            <>
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Sign in with Google
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
