"use client";

import { CopyButton } from "@/components/CopyButton";
import { DeleteShareButton } from "@/components/DeleteShareButton";
import { HomeShareModal } from "@/components/HomeShareModal";
import { createClient } from "@/lib/supabase/client";
import { SHARE_TYPE_LABELS, SHARE_TYPES, type Share, type ShareType } from "@/lib/types";
import { isExpired, publicShareUrl } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Category = "all" | ShareType;

const categoryDescriptions: Record<Category, string> = {
  all: "Every share",
  code: "Live code",
  document: "Docs",
  link: "URLs",
  bookmark: "Saved URLs",
  note: "Notes",
  password: "Vaults",
};

export function DashboardShares({ shares }: { shares: Share[] }) {
  const router = useRouter();
  const [localShares, setLocalShares] = useState(shares);
  const [category, setCategory] = useState<Category>("all");
  const [deleteError, setDeleteError] = useState("");
  const categories = useMemo(
    () =>
      (["all", ...SHARE_TYPES] as Category[]).map((type) => ({
        type,
        label: type === "all" ? "All shares" : SHARE_TYPE_LABELS[type],
        count:
          type === "all"
            ? localShares.length
            : localShares.filter((share) => share.type === type).length,
      })),
    [localShares],
  );
  const visibleShares = localShares.filter((share) =>
    category === "all" ? true : share.type === category,
  );

  async function deleteShareById(id: string) {
    setDeleteError("");
    const supabase = createClient();
    const { error } = await supabase.from("shares").delete().eq("id", id);

    if (error) {
      setDeleteError(error.message);
      return;
    }

    setLocalShares((current) => current.filter((share) => share.id !== id));
    router.refresh();
  }

  return (
    <div className="mt-3 grid w-full min-w-0 gap-4 sm:mt-10 sm:gap-6 lg:grid-cols-[290px_1fr]">
      <aside className="hidden rounded-xl border border-white/70 bg-white/65 p-4 shadow-sm backdrop-blur lg:block">
        <div className="px-2 pb-4">
          <p className="text-sm font-bold uppercase text-blue-700">Categories</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Your shares
          </h2>
        </div>
        <div className="grid gap-2">
          {categories.map((item) => {
            const active = item.type === category;

            return (
              <button
                key={item.type}
                type="button"
                onClick={() => setCategory(item.type)}
                className={`grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-blue-300 bg-blue-50/80 text-blue-700 shadow-sm"
                    : "border-white/70 bg-white/55 text-slate-700 hover:border-blue-200 hover:bg-blue-50/60"
                }`}
              >
                <span>
                  <span className="block text-sm font-black">{item.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {categoryDescriptions[item.type]}
                  </span>
                </span>
                <span
                  className={`grid h-8 min-w-8 place-items-center rounded-full px-2 text-xs font-black ${
                    active
                      ? "bg-blue-200/80 text-blue-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="min-w-0 rounded-xl border border-white/70 bg-white/65 p-3 shadow-sm backdrop-blur sm:p-5">
        <div className="flex flex-col gap-4 border-b border-blue-100/80 pb-4 sm:flex-row sm:items-center sm:justify-between sm:pb-5">
          <div>
            <p className="text-sm font-bold uppercase text-blue-700">
              {category === "all" ? "Library" : SHARE_TYPE_LABELS[category]}
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 sm:mt-2 sm:text-3xl">
              {visibleShares.length}{" "}
              {visibleShares.length === 1 ? "share" : "shares"}
            </h2>
          </div>
          <HomeShareModal
            label="New share"
            buttonClassName="w-full rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 sm:w-auto sm:px-7"
          />
        </div>

        <div className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-2 lg:hidden">
          {categories.map((item) => {
            const active = item.type === category;

            return (
              <button
                key={item.type}
                type="button"
                onClick={() => setCategory(item.type)}
                className={`shrink-0 rounded-full border px-3 py-2 text-sm font-black transition ${
                  active
                    ? "border-blue-300 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "border-blue-100 bg-white/75 text-slate-700 hover:bg-blue-50"
                }`}
              >
                {item.label}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    active ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {deleteError ? (
          <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {deleteError}
          </p>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-xl border border-blue-100/80 bg-white/70 sm:mt-5">
          <div className="hidden grid-cols-[120px_1fr_120px_120px_1fr_260px] gap-4 border-b border-blue-100/80 bg-blue-50/70 px-4 py-4 text-sm font-black text-slate-600 lg:grid">
            <span>Type</span>
            <span>Title</span>
            <span>Created</span>
            <span>Expires</span>
            <span>Public link</span>
            <span>Actions</span>
          </div>

          {visibleShares.length ? (
            visibleShares.map((share) => {
              const publicUrl = `/s/${share.slug}`;
              const fullPublicUrl = publicShareUrl(share.slug);
              const expired = isExpired(share.expires_at);
              const unlimited = new Date(share.expires_at).getFullYear() >= 9999;

              return (
                <div
                  key={share.id}
                  className="grid min-w-0 gap-3 border-b border-blue-50 px-3 py-4 text-sm last:border-b-0 sm:px-4 sm:py-5 lg:grid-cols-[120px_1fr_120px_120px_1fr_260px] lg:items-center"
                >
                  <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                    {SHARE_TYPE_LABELS[share.type]}
                  </span>
                  <span className="font-black text-slate-950">{share.title}</span>
                  <span className="text-slate-600">
                    {new Date(share.created_at).toLocaleDateString()}
                  </span>
                  <span
                    className={
                      expired ? "font-black text-red-600" : "text-slate-600"
                    }
                  >
                    {expired
                      ? "Expired"
                      : unlimited
                        ? "Unlimited"
                        : new Date(share.expires_at).toLocaleDateString()}
                  </span>
                  <Link
                    className="min-w-0 break-all font-semibold text-blue-700 hover:text-blue-900"
                    href={publicUrl}
                  >
                    {publicUrl}
                  </Link>
                  <div className="flex min-w-0 flex-row flex-wrap items-center gap-2">
                    <Link
                      className="rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
                      href={fullPublicUrl}
                    >
                      Open
                    </Link>
                    {share.url && (share.type === "link" || share.type === "bookmark") ? (
                      <a
                        className="rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
                        href={share.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Visit URL
                      </a>
                    ) : null}
                    <CopyButton value={fullPublicUrl} />
                    <DeleteShareButton onDelete={() => deleteShareById(share.id)} />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-10 text-center text-slate-600">
              No shares in this category yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
