"use client";

import { BrandWordmark } from "@/components/BrandWordmark";
import { createClient } from "@/lib/supabase/client";
import type { ShareType } from "@/lib/types";
import { shareEditorPath } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

type NavAction = ShareType | "home";

const items: { label: string; action: NavAction; icon: ReactNode }[] = [
  { label: "Home", action: "home", icon: <path d="M4 11 12 4l8 7v9H5v-9Z" /> },
  { label: "Code", action: "code", icon: <path d="m9 9-4 3 4 3m6-6 4 3-4 3" /> },
  { label: "Live", action: "live_code", icon: <path d="m8 9-4 3 4 3m8-6 4 3-4 3M12 6v12" /> },
  { label: "Docs", action: "document", icon: <path d="M7 3h7l5 5v13H7Zm7 0v5h5" /> },
  { label: "Link", action: "link", icon: <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /> },
  { label: "Mark", action: "bookmark", icon: <path d="M7 4h10v17l-5-3-5 3Z" /> },
  { label: "Vault", action: "password", icon: <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v10H6Z" /> },
];

const loginCopy: Record<"bookmark" | "password", { title: string; description: ReactNode }> = {
  bookmark: {
    title: "Login to create bookmarks",
    description: (
      <>
        Bookmark shares are saved to your private{" "}
        <BrandWordmark className="text-inherit" /> dashboard and require a
        logged-in account.
      </>
    ),
  },
  password: {
    title: "Login to share passwords",
    description:
      "Encrypted password shares require a logged-in account before creating or opening a password link.",
  },
};

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      {children}
    </svg>
  );
}

export function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [loginType, setLoginType] = useState<"bookmark" | "password" | null>(
    null,
  );

  function isActive(action: NavAction) {
    if (action === "home") {
      return pathname === "/" || pathname === "/dashboard";
    }

    return pathname === shareEditorPath(action);
  }

  async function open(action: NavAction) {
    if (action === "home") {
      router.push("/");
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
      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[9999] border-t border-blue-100 bg-white/95 px-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_55px_rgba(15,23,42,0.2)] backdrop-blur-xl">
        <div className="mx-auto grid w-full max-w-md grid-cols-7 gap-1">
          {items.map((item) => {
            const active = isActive(item.action);

            return (
              <button
                key={item.action}
                type="button"
                onClick={() => open(item.action)}
                className={`grid min-h-14 place-items-center gap-1 rounded-2xl px-1 text-[11px] font-black transition ${
                  active
                    ? "text-blue-700"
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-2xl ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "bg-blue-100/80 text-blue-600"
                  }`}
                >
                  <NavIcon>{item.icon}</NavIcon>
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {loginType ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[26px] bg-[linear-gradient(135deg,rgba(37,99,235,0.75),rgba(244,114,255,0.64),rgba(234,240,74,0.42),rgba(125,211,252,0.68))] p-[2px] shadow-[0_24px_70px_rgba(37,99,235,0.18)]">
            <div className="rounded-[24px] bg-white/92 p-6 shadow-sm backdrop-blur">
              <h2 className="bg-gradient-to-r from-black via-blue-700 to-fuchsia-600 bg-clip-text text-3xl font-black text-transparent">
                {loginCopy[loginType].title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {loginCopy[loginType].description}
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
