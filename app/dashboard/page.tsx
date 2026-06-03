import { BrandWordmark } from "@/components/BrandWordmark";
import { DashboardShares } from "@/components/DashboardShares";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import type { Share } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();

  if (!supabase) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_31%_76%,rgba(244,114,255,0.44),transparent_24%),radial-gradient(circle_at_52%_42%,rgba(234,240,74,0.38),transparent_25%),radial-gradient(circle_at_86%_42%,rgba(248,113,113,0.3),transparent_28%),radial-gradient(circle_at_96%_4%,rgba(125,211,252,0.34),transparent_24%),radial-gradient(circle_at_4%_0%,rgba(196,181,253,0.34),transparent_26%),linear-gradient(180deg,#fafbff_0%,#fff8fb_48%,#f7faff_100%)]">
        <Navbar />
        <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
          <h1 className="text-3xl font-black text-slate-950">
            Supabase is not configured
          </h1>
          <p className="mt-3 text-lg leading-8 text-slate-600">
            Add the values from `.env.example` to `.env.local` to use the
            dashboard.
          </p>
        </main>
      </div>
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const { data: shares } = await supabase
    .from("shares")
    .select("*")
    .eq("owner_id", userData.user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_31%_76%,rgba(244,114,255,0.44),transparent_24%),radial-gradient(circle_at_52%_42%,rgba(234,240,74,0.38),transparent_25%),radial-gradient(circle_at_86%_42%,rgba(248,113,113,0.3),transparent_28%),radial-gradient(circle_at_96%_4%,rgba(125,211,252,0.34),transparent_24%),radial-gradient(circle_at_4%_0%,rgba(196,181,253,0.34),transparent_26%),linear-gradient(180deg,#fafbff_0%,#fff8fb_48%,#f7faff_100%)]">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-base font-bold text-blue-700">Dashboard</p>
          <h1 className="mt-3 text-5xl font-black leading-tight text-black sm:text-6xl">
            Your private <BrandWordmark className="text-inherit" /> library.
          </h1>
          <p className="mt-5 text-xl leading-9 text-slate-600">
            Browse your code, docs, notes, bookmarks, links, and encrypted
            password vaults by category. Logged-in sessions are checked
            automatically when you open the app.
          </p>
        </div>

        <DashboardShares shares={(shares as Share[] | null) ?? []} />
      </main>
    </div>
  );
}
