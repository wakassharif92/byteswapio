"use client";

import { CopyButton } from "@/components/CopyButton";
import { createClient } from "@/lib/supabase/client";
import { SHARE_TYPE_LABELS, SHARE_TYPES, type ShareType } from "@/lib/types";
import { createSlug, neverExpires, publicShareUrl } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

const descriptions: Record<ShareType, string> = {
  code: "Full-screen live code editor.",
  document: "Rich HTML with links and tables.",
  link: "A URL with shared notes.",
  bookmark: "Login-only saved URL.",
  note: "A live writable note page.",
  password: "Register for encrypted sharing.",
};

function MenuIcon({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 ${className}`}
    >
      {children}
    </svg>
  );
}

const icons: Record<ShareType, ReactNode> = {
  code: (
    <MenuIcon>
      <path d="m8 9-4 3 4 3" />
      <path d="m16 9 4 3-4 3" />
      <path d="m14 5-4 14" />
    </MenuIcon>
  ),
  document: (
    <MenuIcon>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </MenuIcon>
  ),
  link: (
    <MenuIcon>
      <path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-2 2a5 5 0 0 0 7.07 7.07l1.1-1.1" />
    </MenuIcon>
  ),
  bookmark: (
    <MenuIcon>
      <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4Z" />
    </MenuIcon>
  ),
  note: (
    <MenuIcon>
      <path d="M4 4h16v16H4Z" />
      <path d="M8 9h8" />
      <path d="M8 13h6" />
      <path d="M8 17h4" />
    </MenuIcon>
  ),
  password: (
    <MenuIcon>
      <path d="M7 11V8a5 5 0 0 1 10 0v3" />
      <path d="M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" />
      <path d="M12 15v2" />
    </MenuIcon>
  ),
};

const copyPasteIcon = (
  <MenuIcon>
    <path d="M9 5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
    <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
    <path d="M9 5h6" />
    <path d="M14 9h5v5" />
    <path d="m19 9-8 8" />
  </MenuIcon>
);

export function HomeShareModal({
  label = "Share Things Now",
  buttonClassName = "rounded-md bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800",
  align = "left",
  placement = "bottom",
}: {
  label?: string;
  buttonClassName?: string;
  align?: "left" | "center";
  placement?: "top" | "bottom";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false);
  const [loginRequiredTitle, setLoginRequiredTitle] = useState("");
  const [loginRequiredDescription, setLoginRequiredDescription] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [createdUrl, setCreatedUrl] = useState("");
  const [createdPath, setCreatedPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const menuItemClass =
    "group grid grid-cols-[46px_1fr] items-center gap-3 rounded-xl border border-blue-200/80 bg-blue-50/65 px-3 py-2.5 text-left transition hover:border-blue-300 hover:bg-blue-100/75 hover:shadow-sm sm:grid-cols-[54px_1fr] sm:gap-4 sm:px-4 sm:py-3";
  const iconClass =
    "grid h-11 w-11 place-items-center rounded-2xl bg-blue-200/70 text-blue-600 transition group-hover:bg-blue-200 group-hover:text-blue-700 sm:h-12 sm:w-12";

  async function createBookmark(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoginRequiredTitle("Login to create bookmarks");
      setLoginRequiredDescription(
        "Bookmark shares are saved to your private dashboard and require a logged-in account.",
      );
      setLoginRequiredOpen(true);
      setBookmarkOpen(false);
      setPasswordOpen(false);
      setLoading(false);
      return;
    }

    let data: { id: string; slug: string } | null = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const slug = createSlug();
      const result = await supabase
        .from("shares")
        .insert({
          owner_id: userData.user?.id ?? null,
          type: "bookmark",
          slug,
          title: name || url,
          description: description || null,
          url,
          expires_at: neverExpires(),
        })
        .select("id, slug")
        .single();

      if (!result.error && result.data) {
        data = result.data;
        break;
      }

      if (result.error?.code !== "23505") {
        setError(result.error?.message ?? "Unable to create bookmark.");
        setLoading(false);
        return;
      }
    }

    if (!data) {
      setError("Could not find a free short link. Try again.");
      setLoading(false);
      return;
    }

    const { error: contentError } = await supabase
      .from("share_contents")
      .insert({ share_id: data.id, body: "", html: "", notes: description });

    setLoading(false);

    if (contentError) {
      setError(contentError.message);
      return;
    }

    setCreatedUrl(publicShareUrl(data.slug));
    setCreatedPath(`/s/${data.slug}`);
  }

  async function choose(type: ShareType) {
    if (type === "bookmark") {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setLoginRequiredTitle("Login to create bookmarks");
        setLoginRequiredDescription(
          "Bookmark shares are saved to your private dashboard and require a logged-in account.",
        );
        setLoginRequiredOpen(true);
        setBookmarkOpen(false);
        setPasswordOpen(false);
        return;
      }

      setBookmarkOpen(true);
      setPasswordOpen(false);
      setLoginRequiredOpen(false);
      return;
    }

    if (type === "password") {
      setPasswordOpen(true);
      setBookmarkOpen(false);
      setLoginRequiredOpen(false);
      return;
    }

    router.push(`/share/${type}`);
  }

  function close() {
    setOpen(false);
    setBookmarkOpen(false);
    setPasswordOpen(false);
    setLoginRequiredOpen(false);
  }

  return (
    <div className="relative inline-flex w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={buttonClassName}
      >
        {label}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close share menu"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={close}
          />
          <div
            className={`fixed inset-x-0 bottom-0 z-50 max-h-[86dvh] overflow-y-auto rounded-t-[28px] border border-white/70 bg-white/95 shadow-2xl backdrop-blur-xl sm:absolute sm:inset-auto sm:max-h-[min(78vh,720px)] sm:w-[min(92vw,430px)] sm:overflow-hidden sm:rounded-lg sm:border-slate-200 sm:bg-white ${
              align === "center" ? "sm:left-1/2 sm:-translate-x-1/2" : "sm:left-0"
            } ${
              placement === "top" ? "sm:bottom-full sm:mb-4" : "sm:top-full sm:mt-3"
            }`}
          >
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
            <div className="bg-white/95 p-4 sm:bg-white sm:p-3">
              {!bookmarkOpen && !passwordOpen && !loginRequiredOpen ? (
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/cc")}
                    className={menuItemClass}
                  >
                    <span className={iconClass}>
                      {copyPasteIcon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-950">
                        Copy paste
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        One-hour fast note with a simple link.
                      </span>
                    </span>
                  </button>
                  {SHARE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => choose(type)}
                      className={menuItemClass}
                    >
                      <span className={iconClass}>
                        {icons[type]}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-950">
                          {SHARE_TYPE_LABELS[type]}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {descriptions[type]}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {bookmarkOpen ? (
                <form onSubmit={createBookmark} className="grid gap-3 p-2">
                  <button
                    type="button"
                    onClick={() => setBookmarkOpen(false)}
                    className="w-fit rounded-md px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Back
                  </button>
                    <div>
                      <h3 className="text-base font-semibold text-slate-950">
                        New bookmark
                      </h3>
                      <p className="mt-1 text-xs text-slate-600">
                        Only the URL is required.
                      </p>
                    </div>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Link
                      <input
                        className="field bg-white"
                        type="url"
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        placeholder="https://example.com"
                        required
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Name
                      <input
                        className="field bg-white"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Description
                      <textarea
                        className="min-h-24 rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-950"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                      />
                    </label>
                    <button
                      disabled={loading}
                      className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? "Creating..." : "Create bookmark link"}
                    </button>
                    {createdUrl ? (
                      <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
                        <span className="break-all">{createdUrl}</span>
                        <div className="flex flex-wrap gap-2">
                          <CopyButton value={createdUrl} />
                          <Link
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            href={createdPath}
                          >
                            Open
                          </Link>
                        </div>
                      </div>
                    ) : null}
                    {error ? <p className="text-sm text-red-600">{error}</p> : null}
                  </form>
                ) : null}

                {loginRequiredOpen ? (
                  <div className="p-2">
                    <div className="rounded-[22px] bg-[linear-gradient(135deg,rgba(37,99,235,0.75),rgba(244,114,255,0.64),rgba(234,240,74,0.42),rgba(125,211,252,0.68))] p-[2px] shadow-[0_18px_45px_rgba(37,99,235,0.16)]">
                      <div className="grid gap-4 rounded-[20px] bg-white/92 p-4 backdrop-blur">
                        <button
                          type="button"
                          onClick={() => setLoginRequiredOpen(false)}
                          className="w-fit rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-blue-50"
                        >
                          Back
                        </button>
                        <div>
                          <h3 className="bg-gradient-to-r from-black via-blue-700 to-fuchsia-600 bg-clip-text text-xl font-black text-transparent">
                            {loginRequiredTitle}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {loginRequiredDescription}
                          </p>
                        </div>
                        <Link
                          className="rounded-full bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                          href="/login"
                        >
                          Login
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : null}

                {passwordOpen ? (
                  <div className="p-2">
                    <div className="rounded-[22px] bg-[linear-gradient(135deg,rgba(37,99,235,0.75),rgba(244,114,255,0.64),rgba(234,240,74,0.42),rgba(125,211,252,0.68))] p-[2px] shadow-[0_18px_45px_rgba(37,99,235,0.16)]">
                      <div className="grid gap-4 rounded-[20px] bg-white/92 p-4 backdrop-blur">
                    <button
                      type="button"
                      onClick={() => setPasswordOpen(false)}
                      className="w-fit rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-blue-50"
                    >
                      Back
                    </button>
                    <div>
                      <h3 className="bg-gradient-to-r from-black via-blue-700 to-fuchsia-600 bg-clip-text text-xl font-black text-transparent">
                        Login to share passwords
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Encrypted password shares require a logged-in account
                        before creating or opening a password link.
                      </p>
                    </div>
                    <Link
                      className="rounded-full bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                      href="/login"
                    >
                      Login
                    </Link>
                      </div>
                    </div>
                  </div>
                ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
