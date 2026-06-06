"use client";

import { BrandWordmark } from "@/components/BrandWordmark";
import { createClient } from "@/lib/supabase/client";
import type { ShareType } from "@/lib/types";
import { shareEditorPath } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type FeatureAction = ShareType | "cc";

const loginCopy: Record<"bookmark" | "password", { title: string; description: string }> = {
  bookmark: {
    title: "Login to create bookmarks",
    description:
      "Bookmark shares are saved to your private dashboard and require a logged-in account.",
  },
  password: {
    title: "Login to share passwords",
    description:
      "Encrypted password shares require a logged-in account before creating or opening a password link.",
  },
};

export function FeatureShareButton({ action }: { action: FeatureAction }) {
  const router = useRouter();
  const [loginType, setLoginType] = useState<"bookmark" | "password" | null>(
    null,
  );

  async function openShare() {
    if (action === "cc") {
      router.push("/cc");
      return;
    }

    if (action === "bookmark" || action === "password") {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        setLoginType(action);
        return;
      }
    }

    router.push(shareEditorPath(action));
  }

  return (
    <>
      <button
        type="button"
        onClick={openShare}
        className="mt-6 w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 sm:w-auto"
      >
        Share Things Now
      </button>

      {loginType ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[26px] bg-[linear-gradient(135deg,rgba(37,99,235,0.75),rgba(244,114,255,0.64),rgba(234,240,74,0.42),rgba(125,211,252,0.68))] p-[2px] shadow-[0_24px_70px_rgba(37,99,235,0.18)]">
            <div className="rounded-[24px] bg-white/92 p-6 shadow-sm backdrop-blur">
              <h2 className="bg-gradient-to-r from-black via-blue-700 to-fuchsia-600 bg-clip-text text-3xl font-black text-transparent">
                {loginCopy[loginType].title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {loginType === "bookmark" ? (
                  <>
                    Bookmark shares are saved to your private{" "}
                    <BrandWordmark className="text-inherit" /> dashboard and
                    require a logged-in account.
                  </>
                ) : (
                  loginCopy[loginType].description
                )}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  className="rounded-full bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                  href="/login"
                >
                  Login
                </Link>
                <button
                  type="button"
                  onClick={() => setLoginType(null)}
                  className="rounded-full border border-blue-200 bg-white/80 px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-blue-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
