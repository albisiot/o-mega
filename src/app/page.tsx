"use client";

import { useAuth } from "@/components/auth-provider";
import { HomeScreen } from "@/components/home-screen";
import { LoadingScreen } from "@/components/loading-screen";
import { LoginScreen } from "@/components/login-screen";

export default function HomePage() {
  const { status, session, profile, error, signOut } = useAuth();

  if (status === "loading") return <LoadingScreen />;
  if (!session) return <LoginScreen />;
  if (!profile) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button type="button" onClick={signOut} className="text-sm text-zinc-300 underline">
          Esci e riprova
        </button>
      </main>
    );
  }
  return <HomeScreen profile={profile} />;
}
