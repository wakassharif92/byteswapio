"use client";

import { BrandWordmark } from "@/components/BrandWordmark";
import { ClickableLinks } from "@/components/ClickableLinks";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyButton } from "@/components/CopyButton";
import {
  encryptPassword,
  hashCode,
  type PasswordVaultItem,
} from "@/lib/crypto";
import { createClient } from "@/lib/supabase/client";
import type { ShareContent, Share, ShareType } from "@/lib/types";
import {
  createSlug,
  createSecureSlug,
  defaultTitle,
  neverExpires,
  publicShareUrl,
} from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const languages = [
  "Text",
  "JavaScript",
  "TypeScript",
  "Python",
  "Go",
  "Rust",
  "SQL",
  "HTML",
  "CSS",
];

type Status = "idle" | "creating" | "saving" | "saved" | "error";

export function ShareEditor({ type }: { type: ShareType }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const saveTimer = useRef<number | null>(null);
  const applyingRemoteChange = useRef(false);
  const hasPendingLocalChange = useRef(false);
  const [shareId, setShareId] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState(defaultTitle(type));
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("Text");
  const [body, setBody] = useState("");
  const [html, setHtml] = useState("");
  const [notes, setNotes] = useState("");
  const [passwordItems, setPasswordItems] = useState<PasswordVaultItem[]>([
    { id: crypto.randomUUID(), name: "", password: "" },
  ]);
  const [accessCode, setAccessCode] = useState("");
  const [pin, setPin] = useState("");
  const [currentAccessHash, setCurrentAccessHash] = useState("");
  const [currentPinHash, setCurrentPinHash] = useState("");
  const [vaultUnlocked, setVaultUnlocked] = useState(type !== "password");
  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [setupAccessCode, setSetupAccessCode] = useState("");
  const [setupPin, setSetupPin] = useState("");
  const [currentAccessInput, setCurrentAccessInput] = useState("");
  const [currentPinInput, setCurrentPinInput] = useState("");
  const [newAccessCode, setNewAccessCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [savedToAccount, setSavedToAccount] = useState(false);

  const link = slug ? publicShareUrl(slug) : "";

  useEffect(() => {
    async function createShare() {
      setStatus("creating");
      const { data: userData } = await supabase.auth.getUser();
      if ((type === "password" || type === "bookmark") && !userData.user) {
        setAuthRequired(true);
        setStatus("idle");
        return;
      }
      setSavedToAccount(Boolean(userData.user));

      let data: { id: string; slug: string } | null = null;

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const nextSlug =
          type === "password" ? createSecureSlug() : createSlug();
        const result = await supabase
          .from("shares")
          .insert({
            owner_id: userData.user?.id ?? null,
            type,
            slug: nextSlug,
            title: defaultTitle(type),
            description: null,
            url: null,
            language: type === "code" ? "Text" : null,
            expires_at: neverExpires(),
          })
          .select("id, slug")
          .single();

        if (!result.error && result.data) {
          data = result.data;
          break;
        }

        if (result.error?.code !== "23505") {
          setError(result.error?.message ?? "Unable to create share.");
          setStatus("error");
          return;
        }
      }

      if (!data) {
        setError(
          type === "password"
            ? "Could not create a secure link. Try again."
            : "Could not find a free short link. Try again.",
        );
        setStatus("error");
        return;
      }

      setShareId(data.id);
      setSlug(data.slug);
      if (type === "password") {
        setCredentialDialogOpen(true);
      }

      if (type !== "password") {
        const { error: contentError } = await supabase
          .from("share_contents")
          .insert({ share_id: data.id, body: "", html: "", notes: "" });

        if (contentError) {
          setError(contentError.message);
          setStatus("error");
          return;
        }
      }

      setStatus("saved");
    }

    createShare();
  }, [supabase, type]);

  useEffect(() => {
    if (!shareId || type === "password") {
      return;
    }

    const channel = supabase
      .channel(`editor:${shareId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "shares",
          filter: `id=eq.${shareId}`,
        },
        (payload) => {
          if (hasPendingLocalChange.current) {
            return;
          }

          const nextShare = payload.new as Share;
          applyingRemoteChange.current = true;
          setTitle(nextShare.title);
          setDescription(nextShare.description ?? "");
          setUrl(nextShare.url ?? "");
          setLanguage(nextShare.language ?? "Text");
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "share_contents",
          filter: `share_id=eq.${shareId}`,
        },
        (payload) => {
          if (hasPendingLocalChange.current) {
            return;
          }

          const nextContent = payload.new as ShareContent;
          applyingRemoteChange.current = true;
          setBody(nextContent.body ?? "");
          setHtml(nextContent.html ?? "");
          setNotes(nextContent.notes ?? "");
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shareId, supabase, type]);

  useEffect(() => {
    if (!shareId || type === "password") {
      return;
    }

    if (applyingRemoteChange.current) {
      applyingRemoteChange.current = false;
      return;
    }

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }

    saveTimer.current = window.setTimeout(async () => {
      setStatus("saving");
      const [{ error: shareError }, { error: contentError }] =
        await Promise.all([
          supabase
            .from("shares")
            .update({
              title,
              description: description || null,
              url: url || null,
              language: type === "code" ? language : null,
            })
            .eq("id", shareId),
          supabase
            .from("share_contents")
            .update({ body, html, notes })
            .eq("share_id", shareId),
        ]);

      if (shareError || contentError) {
        setError(
          shareError?.message ?? contentError?.message ?? "Unable to save.",
        );
        setStatus("error");
        return;
      }

      hasPendingLocalChange.current = false;
      setStatus("saved");
    }, 600);

    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, [
    body,
    description,
    html,
    language,
    notes,
    shareId,
    supabase,
    title,
    type,
    url,
  ]);

  async function savePasswordVault(nextAccessCode: string, nextPin: string) {
    const validItems = passwordItems.filter(
      (item) => item.name.trim() && item.password,
    );

    if (!validItems.length) {
      throw new Error("Add at least one named password.");
    }

    if (!/^\d{5}$/.test(nextPin)) {
      throw new Error("PIN must be exactly 5 numbers.");
    }

    const encrypted = await encryptPassword(
      JSON.stringify(validItems),
      nextPin,
    );
    const accessHash = await hashCode(nextAccessCode);
    const decryptHash = await hashCode(nextPin);
    const [{ error: shareError }, { error: passwordError }] = await Promise.all(
      [
        supabase
          .from("shares")
          .update({ title, description: description || null })
          .eq("id", shareId),
        supabase.from("password_shares").upsert({
          share_id: shareId,
          encrypted_payload: encrypted.encryptedPayload,
          iv: encrypted.iv,
          salt: encrypted.salt,
          access_code_hash: accessHash,
          decrypt_code_hash: decryptHash,
          public_names: validItems.map((item) => item.name.trim()),
        }),
      ],
    );

    if (shareError || passwordError) {
      throw new Error(shareError?.message ?? passwordError?.message);
    }

    setCurrentAccessHash(accessHash);
    setCurrentPinHash(decryptHash);
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shareId) {
      return;
    }

    setStatus("saving");
    setError("");

    try {
      await savePasswordVault(accessCode, pin);
      setStatus("saved");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to encrypt password.",
      );
      setStatus("error");
    }
  }

  async function createAnother() {
    router.push("/share");
    router.refresh();
  }

  function markLocalChange() {
    hasPendingLocalChange.current = true;
  }

  function updatePasswordItem(
    id: string,
    field: keyof Omit<PasswordVaultItem, "id">,
    value: string,
  ) {
    setPasswordItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  }

  function addPasswordItem() {
    setPasswordItems((items) => [
      ...items,
      { id: crypto.randomUUID(), name: "", password: "" },
    ]);
  }

  function removePasswordItem(id: string) {
    setPasswordItems((items) =>
      items.length === 1 ? items : items.filter((item) => item.id !== id),
    );
  }

  async function sharePasswordVault(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShareMessage("");

    if (!shareId || !shareEmail.trim()) {
      return;
    }

    const { error: shareError } = await supabase
      .from("password_share_access")
      .upsert({
        share_id: shareId,
        email: shareEmail.trim().toLowerCase(),
      });

    if (shareError) {
      setShareMessage(shareError.message);
      return;
    }

    setShareEmail("");
    setShareMessage("Email saved. This user can open the shared vault link.");
  }

  async function setInitialVaultCredentials(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    if (!setupAccessCode.trim()) {
      setError("Access password is required.");
      return;
    }

    if (!/^\d{5}$/.test(setupPin)) {
      setError("PIN must be exactly 5 numbers.");
      return;
    }

    setAccessCode(setupAccessCode);
    setPin(setupPin);
    setCurrentAccessHash(await hashCode(setupAccessCode));
    setCurrentPinHash(await hashCode(setupPin));
    setVaultUnlocked(true);
    setCredentialDialogOpen(false);
  }

  async function changeVaultCredentials(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    const accessHash = await hashCode(currentAccessInput);
    const pinHash = await hashCode(currentPinInput);

    if (accessHash !== currentAccessHash || pinHash !== currentPinHash) {
      setError("Current access password or PIN did not match.");
      return;
    }

    if (!newAccessCode.trim()) {
      setError("New access password is required.");
      return;
    }

    if (!/^\d{5}$/.test(newPin)) {
      setError("New PIN must be exactly 5 numbers.");
      return;
    }

    const newAccessHash = await hashCode(newAccessCode);
    const newPinHash = await hashCode(newPin);
    setStatus("saving");

    try {
      await savePasswordVault(newAccessCode, newPin);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to change vault credentials.",
      );
      setStatus("error");
      return;
    }

    setAccessCode(newAccessCode);
    setPin(newPin);
    setCurrentAccessHash(newAccessHash);
    setCurrentPinHash(newPinHash);
    setCurrentAccessInput("");
    setCurrentPinInput("");
    setNewAccessCode("");
    setNewPin("");
    setChangeDialogOpen(false);
    setStatus("saved");
  }

  const commonFields = (
    <>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        Title
        <input
          className="field bg-white/80 shadow-sm"
          value={title}
          onChange={(event) => {
            markLocalChange();
            setTitle(event.target.value);
          }}
          required
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        Description
        <textarea
          className="min-h-24 rounded-xl border border-blue-100 bg-white/80 px-3 py-2 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          value={description}
          onChange={(event) => {
            markLocalChange();
            setDescription(event.target.value);
          }}
        />
      </label>
    </>
  );

  const statusLabel =
    status === "creating"
      ? "Creating link..."
      : status === "saving"
        ? "Saving..."
        : status === "saved"
          ? "Saved"
          : "Ready";

  const sidebar = (
    <aside className="grid content-start gap-5 border-b border-white/70 bg-white/60 p-5 shadow-sm backdrop-blur-xl lg:border-b-0 lg:border-r lg:border-white/70">
      {commonFields}
      {type === "code" ? (
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Language
          <select
            className="field bg-white/80 shadow-sm"
            value={language}
            onChange={(event) => {
              markLocalChange();
              setLanguage(event.target.value);
            }}
          >
            {languages.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      ) : null}
      {type === "link" || type === "bookmark" ? (
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          URL
          <input
            className="field bg-white/80 shadow-sm"
            type="url"
            value={url}
            onChange={(event) => {
              markLocalChange();
              setUrl(event.target.value);
            }}
            placeholder="https://example.com"
            required
          />
        </label>
      ) : null}
      {type === "password" ? (
        <>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-slate-600">
            Vault credentials are set before entry. Passwords stay encrypted
            with the 5-number PIN.
          </div>
          <button
            type="button"
            onClick={() => setChangeDialogOpen(true)}
            className="rounded-full border border-blue-200 bg-white/80 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-blue-50"
          >
            Change access/PIN
          </button>
          <button
            type="button"
            onClick={() => setShareDialogOpen(true)}
            className="rounded-full border border-blue-200 bg-white/80 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-blue-50"
          >
            Share
          </button>
          <button
            className="rounded-full bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={status === "saving"}
          >
            Save
          </button>
        </>
      ) : null}
    </aside>
  );

  const editor = (
    <section className="min-h-0 flex-1 overflow-auto bg-slate-50 p-4">
      {type === "code" ? (
        <textarea
          className="min-h-[calc(100vh-14rem)] w-full resize-none rounded-md border border-slate-800 bg-slate-950 p-5 font-mono text-sm leading-6 text-slate-50 outline-none focus:border-sky-500 lg:min-h-full"
          value={body}
          onChange={(event) => {
            markLocalChange();
            setBody(event.target.value);
          }}
          placeholder="Paste code here..."
          spellCheck={false}
        />
      ) : null}
      {type === "document" ? (
        <div className="grid min-h-[calc(100vh-14rem)] grid-rows-[1fr_auto] gap-3 lg:min-h-full">
          <div
            className="min-h-[calc(100vh-18rem)] rounded-md border border-slate-300 bg-white p-6 text-base leading-7 outline-none focus:border-sky-500 lg:min-h-full"
            contentEditable
            suppressContentEditableWarning
            onInput={(event) => {
              markLocalChange();
              setHtml(event.currentTarget.innerHTML);
            }}
          />
          <ClickableLinks value={html} />
        </div>
      ) : null}
      {type === "note" ? (
        <div className="grid min-h-[calc(100vh-14rem)] grid-rows-[1fr_auto] gap-3 lg:min-h-full">
          <textarea
            className="min-h-[calc(100vh-18rem)] w-full resize-none rounded-md border border-slate-300 bg-white p-5 leading-7 outline-none focus:border-slate-950 lg:min-h-full"
            value={body}
            onChange={(event) => {
              markLocalChange();
              setBody(event.target.value);
            }}
            placeholder="Write your note..."
          />
          <ClickableLinks value={body} />
        </div>
      ) : null}
      {type === "link" || type === "bookmark" ? (
        <div className="grid gap-3">
          <textarea
            className="min-h-[calc(100vh-18rem)] w-full resize-none rounded-md border border-slate-300 bg-white p-5 leading-7 outline-none focus:border-slate-950 lg:min-h-full"
            value={notes}
            onChange={(event) => {
              markLocalChange();
              setNotes(event.target.value);
            }}
            placeholder="Add notes or context..."
          />
          <ClickableLinks value={`${url}\n${notes}`} />
        </div>
      ) : null}
      {type === "password" ? (
        vaultUnlocked ? (
          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur">
              <h2 className="text-xl font-black text-slate-950">
                Password vault
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Add names and passwords. They are encrypted together as one
                file.
              </p>
            </div>
            <div className="grid gap-3">
              {passwordItems.map((item, index) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-2xl border border-blue-100 bg-white/75 p-4 shadow-sm backdrop-blur lg:grid-cols-[1fr_1fr_auto] lg:items-end"
                >
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Name
                    <input
                      className="field"
                      value={item.name}
                      onChange={(event) =>
                        updatePasswordItem(item.id, "name", event.target.value)
                      }
                      placeholder={`Password ${index + 1}`}
                      required
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Password
                    <input
                      className="field"
                      type="password"
                      value={item.password}
                      onChange={(event) =>
                        updatePasswordItem(
                          item.id,
                          "password",
                          event.target.value,
                        )
                      }
                      required
                    />
                  </label>
                  <ConfirmButton
                    title="Remove password?"
                    description="This row will be removed from the vault. After you save, it cannot be recovered."
                    confirmLabel="Remove"
                    onConfirm={() => removePasswordItem(item.id)}
                    className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </ConfirmButton>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addPasswordItem}
              className="w-fit rounded-full border border-blue-200 bg-white/80 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-blue-50"
            >
              Add password
            </button>
          </div>
        ) : (
          <div className="grid min-h-[calc(100vh-14rem)] content-center rounded-2xl border border-dashed border-blue-200 bg-white/70 p-6 text-center text-slate-600 shadow-sm backdrop-blur">
            Set the access password and PIN to enter this vault.
          </div>
        )
      ) : null}
    </section>
  );

  const workspace = (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[320px_1fr]">
      {sidebar}
      {editor}
    </div>
  );

  if (authRequired) {
    return (
      <div className="flex min-h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_24%_0%,rgba(244,114,255,0.22),transparent_26%),radial-gradient(circle_at_58%_14%,rgba(234,240,74,0.18),transparent_24%),radial-gradient(circle_at_88%_10%,rgba(125,211,252,0.24),transparent_26%),linear-gradient(180deg,#fafbff_0%,#fff8fb_45%,#f7faff_100%)]">
        <header className="px-4 py-4 sm:px-6">
          <div className="rounded-2xl border border-white/70 bg-white/60 px-4 py-4 shadow-sm backdrop-blur-xl">
            <BrandWordmark href="/" className="text-xl" />
          </div>
        </header>
        <main className="mx-auto grid w-full max-w-xl flex-1 content-center px-4 py-10">
          <section className="rounded-[26px] bg-[linear-gradient(135deg,rgba(37,99,235,0.75),rgba(244,114,255,0.64),rgba(234,240,74,0.42),rgba(125,211,252,0.68))] p-[2px] shadow-[0_24px_70px_rgba(37,99,235,0.18)]">
            <div className="rounded-[24px] bg-white/88 p-6 shadow-sm backdrop-blur">
              <h1 className="bg-gradient-to-r from-black via-blue-700 to-fuchsia-600 bg-clip-text text-3xl font-black text-transparent">
                {type === "bookmark"
                  ? "Login to create bookmarks"
                  : "Login to share passwords"}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {type === "bookmark" ? (
                  <>
                    Bookmark shares are saved to your private{" "}
                    <BrandWordmark className="text-inherit" /> dashboard and
                    require a logged-in account.
                  </>
                ) : (
                  <>
                    Password shares are encrypted in your browser and require a
                    logged-in <BrandWordmark className="text-inherit" /> account
                    before a password link can be created.
                  </>
                )}
              </p>
              <div className="mt-6">
                <Link
                  className="inline-flex rounded-full bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                  href="/login"
                >
                  Login
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_24%_0%,rgba(244,114,255,0.22),transparent_26%),radial-gradient(circle_at_58%_14%,rgba(234,240,74,0.18),transparent_24%),radial-gradient(circle_at_88%_10%,rgba(125,211,252,0.24),transparent_26%),linear-gradient(180deg,#fafbff_0%,#fff8fb_45%,#f7faff_100%)]">
      <header className="px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 rounded-2xl border border-white/70 bg-white/60 px-4 py-4 shadow-sm backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <BrandWordmark href="/" className="text-xl" />
              <span className="rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-xs font-black uppercase text-blue-700">
                {type} editor
              </span>
              <span className="rounded-full border border-white/70 bg-white/75 px-3 py-1 text-sm font-bold text-slate-600">
                {statusLabel}
              </span>
              {slug ? (
                <span className="rounded-full border border-white/70 bg-white/75 px-3 py-1 text-sm font-bold text-slate-500">
                  {savedToAccount
                    ? type === "password"
                      ? "Saved until you delete it"
                      : "Saved to your dashboard"
                    : "Guest link: available until deleted"}
                </span>
              ) : null}
            </div>
            <h1 className="mt-3 truncate bg-gradient-to-r from-black via-blue-700 to-fuchsia-600 bg-clip-text text-3xl font-black leading-tight text-transparent">
              {title || defaultTitle(type)}
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="max-w-xl truncate rounded-full border border-white/70 bg-white/75 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              {link || "Generating public link..."}
            </div>
            {link ? <CopyButton value={link} /> : null}
            <button
              type="button"
              onClick={createAnother}
              className="rounded-full border border-blue-200 bg-white/80 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-blue-50"
            >
              New
            </button>
          </div>
        </div>
        {error ? (
          <p className="mx-auto mt-3 max-w-[1600px] rounded-xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}
      </header>

      {type === "password" ? (
        <form onSubmit={savePassword} className="flex min-h-0 flex-1 flex-col">
          {workspace}
        </form>
      ) : (
        workspace
      )}
      {type === "password" && credentialDialogOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={setInitialVaultCredentials}
            className="grid w-full max-w-md gap-4 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-2xl backdrop-blur"
          >
            <div>
              <h2 className="bg-gradient-to-r from-black via-blue-700 to-fuchsia-600 bg-clip-text text-2xl font-black text-transparent">
                Set vault access
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Create the access password and 5-number PIN before entering the
                vault.
              </p>
            </div>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Access password
              <input
                className="field"
                type="password"
                value={setupAccessCode}
                onChange={(event) => setSetupAccessCode(event.target.value)}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              5-number PIN
              <input
                className="field"
                type="password"
                inputMode="numeric"
                maxLength={5}
                pattern="\d{5}"
                value={setupPin}
                onChange={(event) =>
                  setSetupPin(event.target.value.replace(/\D/g, "").slice(0, 5))
                }
                required
              />
            </label>
            <button className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">
              Enter vault
            </button>
          </form>
        </div>
      ) : null}
      {type === "password" && changeDialogOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={changeVaultCredentials}
            className="grid w-full max-w-md gap-4 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-2xl backdrop-blur"
          >
            <div>
              <h2 className="bg-gradient-to-r from-black via-blue-700 to-fuchsia-600 bg-clip-text text-2xl font-black text-transparent">
                Change access/PIN
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Enter the current access password and PIN before choosing new
                vault credentials.
              </p>
            </div>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Current access password
              <input
                className="field"
                type="password"
                value={currentAccessInput}
                onChange={(event) => setCurrentAccessInput(event.target.value)}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Current 5-number PIN
              <input
                className="field"
                type="password"
                inputMode="numeric"
                maxLength={5}
                pattern="\d{5}"
                value={currentPinInput}
                onChange={(event) =>
                  setCurrentPinInput(
                    event.target.value.replace(/\D/g, "").slice(0, 5),
                  )
                }
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              New access password
              <input
                className="field"
                type="password"
                value={newAccessCode}
                onChange={(event) => setNewAccessCode(event.target.value)}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              New 5-number PIN
              <input
                className="field"
                type="password"
                inputMode="numeric"
                maxLength={5}
                pattern="\d{5}"
                value={newPin}
                onChange={(event) =>
                  setNewPin(event.target.value.replace(/\D/g, "").slice(0, 5))
                }
                required
              />
            </label>
            <div className="flex gap-2">
              <button className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">
                Change
              </button>
              <button
                type="button"
                onClick={() => setChangeDialogOpen(false)}
                className="rounded-full border border-blue-200 bg-white/80 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-blue-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {type === "password" && shareDialogOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={sharePasswordVault}
            className="grid w-full max-w-md gap-4 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-2xl backdrop-blur"
          >
            <div>
              <h2 className="bg-gradient-to-r from-black via-blue-700 to-fuchsia-600 bg-clip-text text-2xl font-black text-transparent">
                Share password vault
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Add the email of a logged-in user. Only shared emails can open
                this password link.
              </p>
            </div>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Email
              <input
                className="field"
                type="email"
                value={shareEmail}
                onChange={(event) => setShareEmail(event.target.value)}
                required
              />
            </label>
            {shareMessage ? (
              <p className="text-sm text-slate-600">{shareMessage}</p>
            ) : null}
            <div className="flex gap-2">
              <button className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">
                Save
              </button>
              <button
                type="button"
                onClick={() => setShareDialogOpen(false)}
                className="rounded-full border border-blue-200 bg-white/80 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-blue-50"
              >
                Close
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
