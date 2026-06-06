"use client";

import { BrandWordmark } from "@/components/BrandWordmark";
import { ClipboardTools } from "@/components/ClipboardTools";
import { ClickableLinks } from "@/components/ClickableLinks";
import { ConfirmButton } from "@/components/ConfirmButton";
import {
  decryptPassword,
  encryptPassword,
  hashCode,
  type PasswordVaultItem,
} from "@/lib/crypto";
import {
  htmlToPlainText,
  parseVaultItems,
  readClipboardHtmlOrText,
  readClipboardText,
  serializeVaultItems,
  writeClipboardText,
} from "@/lib/clipboard";
import { createClient } from "@/lib/supabase/client";
import type { PublicShare, ShareContent } from "@/lib/types";
import { SHARE_TYPE_LABELS } from "@/lib/types";
import { isExpired } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type PasswordPayload = {
  encrypted_payload: string;
  iv: string;
  salt: string;
  public_names: string[];
};

type EditablePasswordItem = PasswordVaultItem & {
  originalName: string;
};

export function PublicShareViewer({
  initialShare,
}: {
  initialShare: PublicShare;
}) {
  const supabase = useMemo(() => createClient(), []);
  const saveTimer = useRef<number | null>(null);
  const hasPendingLocalChange = useRef(false);
  const localEditVersion = useRef(0);
  const documentEditorRef = useRef<HTMLDivElement | null>(null);
  const [share, setShare] = useState(initialShare);
  const [content, setContent] = useState<ShareContent | null>(
    initialShare.share_contents,
  );
  const [body, setBody] = useState(initialShare.share_contents?.body ?? "");
  const [html, setHtml] = useState(initialShare.share_contents?.html ?? "");
  const [notes, setNotes] = useState(initialShare.share_contents?.notes ?? "");
  const [accessCode, setAccessCode] = useState("");
  const [passwordPayload, setPasswordPayload] =
    useState<PasswordPayload | null>(null);
  const [accessHash, setAccessHash] = useState("");
  const [editablePasswordItems, setEditablePasswordItems] = useState<
    EditablePasswordItem[]
  >([]);
  const [pinByName, setPinByName] = useState<Record<string, string>>({});
  const [savePin, setSavePin] = useState("");
  const [revealedPasswords, setRevealedPasswords] = useState<
    Record<string, string>
  >({});
  const [message, setMessage] = useState("");
  const [vaultSaving, setVaultSaving] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function loadUser() {
      if (share.type !== "password") {
        setAuthChecked(true);
        return;
      }

      const { data } = await supabase.auth.getUser();
      setIsLoggedIn(Boolean(data.user));
      setAuthChecked(true);
    }

    loadUser();
  }, [share.type, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`share:${share.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "shares",
          filter: `id=eq.${share.id}`,
        },
        (payload) => setShare(payload.new as PublicShare),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "share_contents",
          filter: `share_id=eq.${share.id}`,
        },
        (payload) => {
          if (hasPendingLocalChange.current) {
            return;
          }

          const nextContent = payload.new as ShareContent;
          setContent(nextContent);
          setBody(nextContent.body ?? "");
          setHtml(nextContent.html ?? "");
          setNotes(nextContent.notes ?? "");
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [share.id, supabase]);

  function scheduleContentSave(
    next: Partial<ShareContent>,
    saveVersion: number,
  ) {
    if (!content?.share_id || share.type === "password") {
      return;
    }

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }

    saveTimer.current = window.setTimeout(async () => {
      const { error } = await supabase
        .from("share_contents")
        .update(next)
        .eq("share_id", content.share_id);

      if (error) {
        setMessage(error.message);
        return;
      }

      if (saveVersion === localEditVersion.current) {
        hasPendingLocalChange.current = false;
      }
    }, 450);
  }

  function markLocalChange() {
    localEditVersion.current += 1;
    hasPendingLocalChange.current = true;
    return localEditVersion.current;
  }

  async function copyBody() {
    await writeClipboardText(body);
  }

  async function pasteBody() {
    const nextBody = await readClipboardText();
    const saveVersion = markLocalChange();
    setBody(nextBody);
    scheduleContentSave({ body: nextBody }, saveVersion);
  }

  async function copyDocument() {
    await writeClipboardText(htmlToPlainText(html), html);
  }

  async function pasteDocument() {
    const nextHtml = await readClipboardHtmlOrText();
    const saveVersion = markLocalChange();
    setHtml(nextHtml);

    if (documentEditorRef.current) {
      documentEditorRef.current.innerHTML = nextHtml;
    }

    scheduleContentSave({ html: nextHtml }, saveVersion);
  }

  async function copyNotes() {
    await writeClipboardText(notes);
  }

  async function pasteNotes() {
    const nextNotes = await readClipboardText();
    const saveVersion = markLocalChange();
    setNotes(nextNotes);
    scheduleContentSave({ notes: nextNotes }, saveVersion);
  }

  async function copyEditableVault() {
    await writeClipboardText(serializeVaultItems(editablePasswordItems));
  }

  async function pasteEditableVault() {
    const nextItems = parseVaultItems(await readClipboardText());

    if (!nextItems.length) {
      return;
    }

    setEditablePasswordItems(
      nextItems.map((item) => ({
        id: crypto.randomUUID(),
        name: item.name,
        originalName: "",
        password: item.password,
      })),
    );
  }

  async function unlockPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const nextAccessHash = await hashCode(accessCode);
    const { data, error } = await supabase.rpc("get_password_share", {
      public_slug: share.slug,
      provided_access_hash: nextAccessHash,
    });

    if (error || !data?.[0]) {
      setMessage(
        error?.message ??
          "Access password did not match, or this email has not been shared on this vault.",
      );
      return;
    }

    const payload = data[0] as PasswordPayload;
    setAccessHash(nextAccessHash);
    setPasswordPayload(payload);
    setEditablePasswordItems(
      payload.public_names.map((name) => ({
        id: crypto.randomUUID(),
        name,
        originalName: name,
        password: "",
      })),
    );
  }

  async function revealPassword(
    event: { preventDefault: () => void },
    name: string,
  ) {
    event.preventDefault();
    setMessage("");

    if (!passwordPayload) {
      return;
    }

    const pin = pinByName[name] ?? "";
    if (!/^\d{5}$/.test(pin)) {
      setMessage("PIN must be exactly 5 numbers.");
      return;
    }

    try {
      const decrypted = await decryptPassword(
        passwordPayload.encrypted_payload,
        passwordPayload.iv,
        passwordPayload.salt,
        pin,
      );
      const vault = JSON.parse(decrypted) as PasswordVaultItem[];
      const item = vault.find((entry) => entry.name === name);

      if (!item) {
        setMessage("Password was not found in this vault.");
        return;
      }

      setRevealedPasswords((current) => ({
        ...current,
        [name]: item.password,
      }));
      window.setTimeout(() => {
        setRevealedPasswords((current) => {
          const next = { ...current };
          delete next[name];
          return next;
        });
        setPinByName((current) => ({ ...current, [name]: "" }));
      }, 5000);
    } catch {
      setMessage("Unable to decrypt with that PIN.");
    }
  }

  function updateEditablePasswordItem(
    id: string,
    field: keyof Omit<EditablePasswordItem, "id" | "originalName">,
    value: string,
  ) {
    setEditablePasswordItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  }

  function addEditablePasswordItem() {
    setEditablePasswordItems((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        name: "",
        originalName: "",
        password: "",
      },
    ]);
  }

  function removeEditablePasswordItem(id: string) {
    setEditablePasswordItems((items) =>
      items.length === 1 ? items : items.filter((item) => item.id !== id),
    );
  }

  async function saveSharedVault(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!passwordPayload) {
      return;
    }

    if (!/^\d{5}$/.test(savePin)) {
      setMessage("PIN must be exactly 5 numbers.");
      return;
    }

    setVaultSaving(true);

    try {
      const decrypted = await decryptPassword(
        passwordPayload.encrypted_payload,
        passwordPayload.iv,
        passwordPayload.salt,
        savePin,
      );
      const existingVault = JSON.parse(decrypted) as PasswordVaultItem[];
      const existingByName = new Map(
        existingVault.map((item) => [item.name, item.password]),
      );
      const nextVault = editablePasswordItems
        .map((item) => ({
          id: item.id,
          name: item.name.trim(),
          password:
            item.password || existingByName.get(item.originalName) || "",
        }))
        .filter((item) => item.name && item.password);

      if (!nextVault.length) {
        setMessage("Add at least one named password.");
        setVaultSaving(false);
        return;
      }

      const encrypted = await encryptPassword(
        JSON.stringify(nextVault),
        savePin,
      );
      const decryptHash = await hashCode(savePin);
      const { data, error } = await supabase.rpc("update_password_share", {
        public_slug: share.slug,
        provided_access_hash: accessHash,
        new_encrypted_payload: encrypted.encryptedPayload,
        new_iv: encrypted.iv,
        new_salt: encrypted.salt,
        new_decrypt_hash: decryptHash,
        new_public_names: nextVault.map((item) => item.name),
      });

      if (error || data !== true) {
        setMessage(error?.message ?? "Unable to save vault.");
        setVaultSaving(false);
        return;
      }

      const nextPayload = {
        encrypted_payload: encrypted.encryptedPayload,
        iv: encrypted.iv,
        salt: encrypted.salt,
        public_names: nextVault.map((item) => item.name),
      };
      setPasswordPayload(nextPayload);
      setEditablePasswordItems(
        nextPayload.public_names.map((name) => ({
          id: crypto.randomUUID(),
          name,
          originalName: name,
          password: "",
        })),
      );
      setSavePin("");
      setPinByName({});
      setRevealedPasswords({});
      setMessage("Vault saved.");
    } catch {
      setMessage("Unable to decrypt with that PIN.");
    } finally {
      setVaultSaving(false);
    }
  }

  if (isExpired(share.expires_at)) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">
          This link has expired
        </h1>
        <p className="mt-2 text-slate-600">
          <BrandWordmark className="text-inherit" /> shares are available for 3
          days by default.
        </p>
      </section>
    );
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          {SHARE_TYPE_LABELS[share.type]}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">
          {share.title}
        </h1>
        {share.description ? (
          <p className="mt-2 text-slate-600">{share.description}</p>
        ) : null}
      </div>

      <div className="mt-5">
        {share.type === "code" || share.type === "live_code" ? (
          <>
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-slate-500">
                {share.language ?? "Text"} · live writable
              </p>
              <ClipboardTools onCopy={copyBody} onPaste={pasteBody} />
            </div>
            <textarea
              className="min-h-96 w-full resize-y rounded-md bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-50 outline-none focus:ring-2 focus:ring-sky-500"
              value={body}
              onChange={(event) => {
                const saveVersion = markLocalChange();
                setBody(event.target.value);
                scheduleContentSave({ body: event.target.value }, saveVersion);
              }}
              placeholder="Waiting for live content..."
              spellCheck={false}
            />
          </>
        ) : null}
        {share.type === "document" ? (
          <>
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-slate-500">
                Live writable document
              </p>
              <ClipboardTools onCopy={copyDocument} onPaste={pasteDocument} />
            </div>
            <div
              ref={documentEditorRef}
              className="prose min-h-96 max-w-none rounded-md border border-slate-300 bg-white p-4 leading-7 text-slate-800 outline-none focus:border-sky-500"
              contentEditable
              dangerouslySetInnerHTML={{
                __html: html || "<p>Waiting for live content...</p>",
              }}
              suppressContentEditableWarning
              onInput={(event) => {
                const nextHtml = event.currentTarget.innerHTML;
                const saveVersion = markLocalChange();
                setHtml(nextHtml);
                scheduleContentSave({ html: nextHtml }, saveVersion);
              }}
            />
            <div className="mt-3">
              <ClickableLinks value={html} />
            </div>
          </>
        ) : null}
        {share.type === "link" || share.type === "bookmark" ? (
          <div className="grid gap-4">
            {share.url ? (
              <a
                className="break-all rounded-md border border-slate-200 bg-slate-50 p-4 font-medium text-sky-700 hover:text-sky-900"
                href={share.url}
                rel="noreferrer"
                target="_blank"
              >
                {share.url}
              </a>
            ) : null}
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                Live notes
                <ClipboardTools onCopy={copyNotes} onPaste={pasteNotes} />
              </span>
              <textarea
                className="min-h-56 rounded-md border border-slate-300 px-3 py-2 font-normal leading-7 outline-none focus:border-slate-950"
                value={notes}
                onChange={(event) => {
                  const saveVersion = markLocalChange();
                  setNotes(event.target.value);
                  scheduleContentSave(
                    { notes: event.target.value },
                    saveVersion,
                  );
                }}
                placeholder="Add shared notes..."
              />
            </label>
            <ClickableLinks value={`${share.url ?? ""}\n${notes}`} />
          </div>
        ) : null}
        {share.type === "note" ? (
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                Live note
                <ClipboardTools onCopy={copyBody} onPaste={pasteBody} />
              </span>
              <textarea
                className="min-h-96 rounded-md border border-slate-300 px-3 py-2 font-normal leading-7 outline-none focus:border-slate-950"
                value={body}
                onChange={(event) => {
                  const saveVersion = markLocalChange();
                  setBody(event.target.value);
                  scheduleContentSave({ body: event.target.value }, saveVersion);
                }}
                placeholder="Waiting for live content..."
              />
            </label>
            <ClickableLinks value={body} />
          </div>
        ) : null}
        {share.type === "password" ? (
          <div className="grid gap-4">
            {!authChecked ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Checking access...
              </div>
            ) : !isLoggedIn ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <h2 className="font-semibold text-slate-950">Login required</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Password vault links only work for logged-in users whose email
                  has been shared by the vault owner.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    href="/login"
                  >
                    Login
                  </Link>
                  <Link
                    className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white"
                    href="/register"
                  >
                    Register
                  </Link>
                </div>
              </div>
            ) : !passwordPayload ? (
              <form onSubmit={unlockPassword} className="grid gap-3">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Access password
                  <input
                    className="field"
                    type="password"
                    value={accessCode}
                    onChange={(event) => setAccessCode(event.target.value)}
                    required
                  />
                </label>
                <button className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                  Enter vault
                </button>
              </form>
            ) : (
              <form onSubmit={saveSharedVault} className="grid gap-4">
                <div className="rounded-md border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-slate-950">
                        Password vault
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Add names and passwords. Saving requires the 5-number
                        PIN.
                      </p>
                    </div>
                    <ClipboardTools
                      onCopy={copyEditableVault}
                      onPaste={pasteEditableVault}
                    />
                  </div>
                </div>
                <div className="grid gap-3">
                  {editablePasswordItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-end"
                    >
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        Name
                        <input
                          className="field"
                          value={item.name}
                          onChange={(event) =>
                            updateEditablePasswordItem(
                              item.id,
                              "name",
                              event.target.value,
                            )
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
                            updateEditablePasswordItem(
                              item.id,
                              "password",
                              event.target.value,
                            )
                          }
                          placeholder={
                            item.originalName ? "Leave blank to keep" : ""
                          }
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        5-number PIN
                        <input
                          className="field"
                          type="password"
                          inputMode="numeric"
                          maxLength={5}
                          pattern="\d{5}"
                          value={pinByName[item.name] ?? ""}
                          onChange={(event) =>
                            setPinByName((current) => ({
                              ...current,
                              [item.name]: event.target.value
                                .replace(/\D/g, "")
                                .slice(0, 5),
                            }))
                          }
                        />
                      </label>
                      <button
                        type="button"
                        onClick={(event) => revealPassword(event, item.name)}
                        className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        disabled={!item.name}
                      >
                        Decrypt
                      </button>
                      <ConfirmButton
                        title="Delete password row?"
                        description="This row will be removed from the shared vault. After the vault is saved, it cannot be recovered."
                        confirmLabel="Delete"
                        onConfirm={() => removeEditablePasswordItem(item.id)}
                        className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </ConfirmButton>
                      {revealedPasswords[item.name] ? (
                        <div className="rounded-md bg-emerald-50 p-2 font-mono text-sm text-emerald-950 lg:col-span-5">
                          {revealedPasswords[item.name]}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <button
                    type="button"
                    onClick={addEditablePasswordItem}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Add password
                  </button>
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    PIN to save
                    <input
                      className="field"
                      type="password"
                      inputMode="numeric"
                      maxLength={5}
                      pattern="\d{5}"
                      value={savePin}
                      onChange={(event) =>
                        setSavePin(
                          event.target.value.replace(/\D/g, "").slice(0, 5),
                        )
                      }
                      required
                    />
                  </label>
                  <button
                    disabled={vaultSaving}
                    className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {vaultSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            )}
            {message ? <p className="text-sm text-red-600">{message}</p> : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
