"use client";

import { BrandWordmark } from "@/components/BrandWordmark";
import { createClient } from "@/lib/supabase/client";
import type { ShareType } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

type MobileAction = ShareType | "cc";

const actions: {
  action: MobileAction;
  title: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    action: "code",
    title: "Code",
    description: "Open live code editor",
    icon: <path d="m9 9-4 3 4 3m6-6 4 3-4 3" />,
  },
  {
    action: "document",
    title: "Document",
    description: "Write rich HTML docs",
    icon: <path d="M7 3h7l5 5v13H7Zm7 0v5h5" />,
  },
  {
    action: "note",
    title: "Note",
    description: "Start a live note",
    icon: <path d="M5 4h14v16H5Zm4 5h6m-6 4h6m-6 4h3" />,
  },
  {
    action: "link",
    title: "Link",
    description: "Share URL with notes",
    icon: <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />,
  },
  {
    action: "bookmark",
    title: "Bookmark",
    description: "Login-only saved URL",
    icon: <path d="M7 4h10v17l-5-3-5 3Z" />,
  },
  {
    action: "cc",
    title: "CC",
    description: "24-hour pasteboard",
    icon: <path d="M8 5h8M8 9h8M8 13h5m3-1 3 3-3 3" />,
  },
  {
    action: "password",
    title: "Password",
    description: "Encrypted vault",
    icon: <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v10H6Z" />,
  },
];

function ActionIcon({ children }: { children: ReactNode }) {
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

export function MobileSharePanel() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<"bookmark" | "password" | null>(
    null,
  );

  async function open(action: MobileAction) {
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

    router.push(`/share/${action}`);
  }

  return (
    <section className="mx-auto mt-9 w-full max-w-md rounded-[28px] bg-[linear-gradient(135deg,rgba(37,99,235,0.65),rgba(244,114,255,0.52),rgba(234,240,74,0.34),rgba(125,211,252,0.58))] p-[2px] shadow-[0_24px_70px_rgba(37,99,235,0.16)] lg:hidden">
      <div className="rounded-[26px] bg-white/82 p-4 text-left backdrop-blur">
        <p className="text-sm font-black uppercase text-blue-700">
          Start sharing
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Pick what you need
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {actions.map((item) => (
            <button
              key={item.action}
              type="button"
              onClick={() => open(item.action)}
              className="grid min-h-28 content-between rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-100"
            >
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-200/80 text-blue-700">
                <ActionIcon>{item.icon}</ActionIcon>
              </span>
              <span>
                <span className="block text-base font-black text-slate-950">
                  {item.title}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-600">
                  {item.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {loginType ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[26px] bg-[linear-gradient(135deg,rgba(37,99,235,0.75),rgba(244,114,255,0.64),rgba(234,240,74,0.42),rgba(125,211,252,0.68))] p-[2px] shadow-[0_24px_70px_rgba(37,99,235,0.18)]">
            <div className="rounded-[24px] bg-white/92 p-6 shadow-sm backdrop-blur">
              <h2 className="bg-gradient-to-r from-black via-blue-700 to-fuchsia-600 bg-clip-text text-3xl font-black text-transparent">
                {loginType === "bookmark"
                  ? "Login to create bookmarks"
                  : "Login to share passwords"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {loginType === "bookmark" ? (
                  <>
                    Bookmark shares are saved to your private{" "}
                    <BrandWordmark className="text-inherit" /> dashboard and
                    require a logged-in account.
                  </>
                ) : (
                  "Encrypted password shares require a logged-in account before creating or opening a password link."
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
    </section>
  );
}
