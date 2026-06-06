"use client";

import { ConfirmButton } from "@/components/ConfirmButton";
import { HomeShareModal } from "@/components/HomeShareModal";
import { createClient } from "@/lib/supabase/client";
import { SHARE_TYPE_LABELS, SHARE_TYPES, type Share, type ShareType } from "@/lib/types";
import { isExpired, publicShareUrl } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";

type Category = "all" | ShareType;

const categoryDescriptions: Record<Category, string> = {
  all: "Every share",
  code: "Live code",
  live_code: "3-hour rooms",
  document: "Docs",
  link: "URLs",
  bookmark: "Saved URLs",
  note: "Notes",
  password: "Vaults",
};

function ActionIcon({
  children,
  label,
  className = "",
  onClick,
}: {
  children: ReactNode;
  label: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-10 w-10 place-items-center rounded-full border border-blue-200 bg-white/85 text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 ${className}`}
    >
      <svg
        aria-hidden="true"
        className="h-4.5 w-4.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        {children}
      </svg>
    </button>
  );
}

function ActionLink({
  children,
  href,
  label,
  external = false,
}: {
  children: ReactNode;
  href: string;
  label: string;
  external?: boolean;
}) {
  const className =
    "grid h-10 w-10 place-items-center rounded-full border border-blue-200 bg-white/85 text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50";

  if (external) {
    return (
      <a
        aria-label={label}
        title={label}
        className={className}
        href={href}
        rel="noreferrer"
        target="_blank"
      >
        <svg
          aria-hidden="true"
          className="h-4.5 w-4.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        >
          {children}
        </svg>
      </a>
    );
  }

  return (
    <Link aria-label={label} title={label} className={className} href={href}>
      <svg
        aria-hidden="true"
        className="h-4.5 w-4.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        {children}
      </svg>
    </Link>
  );
}

export function DashboardShares({ shares }: { shares: Share[] }) {
  const router = useRouter();
  const [localShares, setLocalShares] = useState(shares);
  const [category, setCategory] = useState<Category>("all");
  const [deleteError, setDeleteError] = useState("");
  const [copiedShareId, setCopiedShareId] = useState("");
  const [editingShare, setEditingShare] = useState<Share | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
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

  async function copyShareLink(id: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedShareId(id);
    window.setTimeout(() => setCopiedShareId(""), 1600);
  }

  function openEditDialog(share: Share) {
    setEditingShare(share);
    setEditTitle(share.title);
    setEditDescription(share.description ?? "");
    setEditError("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingShare) {
      return;
    }

    setEditSaving(true);
    setEditError("");

    const supabase = createClient();
    const { error } = await supabase
      .from("shares")
      .update({
        title: editTitle,
        description: editDescription || null,
      })
      .eq("id", editingShare.id);

    setEditSaving(false);

    if (error) {
      setEditError(error.message);
      return;
    }

    setLocalShares((current) =>
      current.map((share) =>
        share.id === editingShare.id
          ? {
              ...share,
              title: editTitle,
              description: editDescription || null,
            }
          : share,
      ),
    );
    setEditingShare(null);
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
          <div className="hidden grid-cols-[120px_1fr_120px_120px_1fr_250px] gap-4 border-b border-blue-100/80 bg-blue-50/70 px-4 py-4 text-sm font-black text-slate-600 lg:grid">
            <span>Type</span>
            <span>Details</span>
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
                  className="grid min-w-0 gap-3 border-b border-blue-50 px-3 py-4 text-sm last:border-b-0 sm:px-4 sm:py-5 lg:grid-cols-[120px_1fr_120px_120px_1fr_250px] lg:items-center"
                >
                  <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                    {SHARE_TYPE_LABELS[share.type]}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-black text-slate-950">
                      {share.title}
                    </span>
                    {share.description ? (
                      <span className="mt-1 line-clamp-2 block text-sm leading-6 text-slate-600">
                        {share.description}
                      </span>
                    ) : (
                      <span className="mt-1 block text-sm text-slate-400">
                        No description
                      </span>
                    )}
                  </span>
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
                    <ActionLink href={fullPublicUrl} label="Open share">
                      <path d="M7 17 17 7" />
                      <path d="M8 7h9v9" />
                    </ActionLink>
                    {share.url && (share.type === "link" || share.type === "bookmark") ? (
                      <ActionLink
                        external
                        href={share.url}
                        label="Open saved URL"
                      >
                        <path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1 1" />
                        <path d="M14 11a5 5 0 0 0-7.07 0l-2 2a5 5 0 0 0 7.07 7.07l1-1" />
                      </ActionLink>
                    ) : null}
                    <ActionIcon
                      label={
                        copiedShareId === share.id ? "Copied" : "Copy link"
                      }
                      onClick={() => copyShareLink(share.id, fullPublicUrl)}
                    >
                      {copiedShareId === share.id ? (
                        <path d="m5 13 4 4L19 7" />
                      ) : (
                        <>
                          <path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1 1" />
                          <path d="M14 11a5 5 0 0 0-7.07 0l-2 2a5 5 0 0 0 7.07 7.07l1-1" />
                        </>
                      )}
                    </ActionIcon>
                    <ActionIcon
                      label="Edit title and description"
                      onClick={() => openEditDialog(share)}
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </ActionIcon>
                    <ConfirmButton
                      title="Delete share?"
                      description="This cannot be recovered and the shared link will stop working immediately."
                      confirmLabel="Delete"
                      onConfirm={() => deleteShareById(share.id)}
                      className="grid h-10 w-10 place-items-center rounded-full border border-red-200 bg-white/85 text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50"
                    >
                      <span className="sr-only">Delete share</span>
                      <svg
                        aria-hidden="true"
                        className="h-4.5 w-4.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M6 6l1 18h10l1-18" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </ConfirmButton>
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
      {editingShare ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={saveEdit}
            className="grid w-full max-w-lg gap-5 rounded-[28px] bg-[linear-gradient(135deg,rgba(37,99,235,0.68),rgba(244,114,255,0.52),rgba(234,240,74,0.36),rgba(125,211,252,0.6))] p-[2px] shadow-2xl"
          >
            <div className="rounded-[26px] bg-white/92 p-5 backdrop-blur">
              <div>
                <p className="text-sm font-black uppercase text-blue-700">
                  Edit share
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Title and description
                </h2>
              </div>
              <div className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Title
                  <input
                    className="field bg-white/80 shadow-sm"
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Description
                  <textarea
                    className="min-h-28 rounded-xl border border-blue-100 bg-white/80 px-3 py-2 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    value={editDescription}
                    onChange={(event) =>
                      setEditDescription(event.target.value)
                    }
                    placeholder="Add context for this share"
                  />
                </label>
                {editError ? (
                  <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {editError}
                  </p>
                ) : null}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  disabled={editSaving}
                  className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editSaving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingShare(null)}
                  className="rounded-full border border-blue-200 bg-white/80 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-blue-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
