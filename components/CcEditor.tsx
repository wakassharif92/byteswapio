"use client";

import { BrandWordmark } from "@/components/BrandWordmark";
import { ClickableLinks } from "@/components/ClickableLinks";
import { CopyButton } from "@/components/CopyButton";
import { createCcSlug, ccUrl } from "@/lib/cc";
import { createClient } from "@/lib/supabase/client";
import type { PublicShare, ShareContent } from "@/lib/types";
import { oneDayFromNow } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";

export function CcEditor({ initialShare }: { initialShare?: PublicShare }) {
  const supabase = useMemo(() => createClient(), []);
  const saveTimer = useRef<number | null>(null);
  const applyingRemoteChange = useRef(false);
  const hasPendingLocalChange = useRef(false);
  const [shareId, setShareId] = useState(initialShare?.id ?? "");
  const [slug, setSlug] = useState(initialShare?.slug ?? "");
  const [body, setBody] = useState(initialShare?.share_contents?.body ?? "");
  const [status, setStatus] = useState(initialShare ? "Ready" : "Creating...");
  const [error, setError] = useState("");

  const link = slug ? ccUrl(slug) : "";

  useEffect(() => {
    async function createShare() {
      if (initialShare) {
        return;
      }

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const nextSlug = createCcSlug();
        const { data, error: shareError } = await supabase
          .from("shares")
          .insert({
            owner_id: null,
            type: "note",
            slug: nextSlug,
            title: `CC ${nextSlug}`,
            description: "copy-paste note",
            expires_at: oneDayFromNow(),
          })
          .select("id, slug")
          .single();

        if (shareError || !data) {
          if (shareError?.code === "23505") {
            continue;
          }

          setError(shareError?.message ?? "Unable to create CC note.");
          setStatus("Error");
          return;
        }

        const { error: contentError } = await supabase
          .from("share_contents")
          .insert({ share_id: data.id, body: "", html: "", notes: "" });

        if (contentError) {
          setError(contentError.message);
          setStatus("Error");
          return;
        }

        setShareId(data.id);
        setSlug(data.slug);
        setStatus("Ready");
        return;
      }

      setError("Could not find a free CC name. Try again.");
      setStatus("Error");
    }

    createShare();
  }, [initialShare, supabase]);

  useEffect(() => {
    if (!shareId) {
      return;
    }

    const channel = supabase
      .channel(`cc:${shareId}`)
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
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shareId, supabase]);

  useEffect(() => {
    if (!shareId) {
      return;
    }

    if (applyingRemoteChange.current) {
      applyingRemoteChange.current = false;
      return;
    }

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }

    setStatus("Saving...");
    saveTimer.current = window.setTimeout(async () => {
      const { error: saveError } = await supabase
        .from("share_contents")
        .update({ body })
        .eq("share_id", shareId);

      if (saveError) {
        setError(saveError.message);
        setStatus("Error");
        return;
      }

      hasPendingLocalChange.current = false;
      setStatus("Saved");
    }, 350);

    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, [body, shareId, supabase]);

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_24%_0%,rgba(244,114,255,0.28),transparent_26%),radial-gradient(circle_at_58%_14%,rgba(234,240,74,0.26),transparent_24%),radial-gradient(circle_at_88%_10%,rgba(125,211,252,0.3),transparent_26%),radial-gradient(circle_at_82%_62%,rgba(248,113,113,0.2),transparent_24%),linear-gradient(180deg,#fafbff_0%,#fff8fb_45%,#f7faff_100%)]">
      <header className="px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-2xl border border-white/70 bg-white/60 px-4 py-4 shadow-sm backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <BrandWordmark href="/" className="text-xl" />
              <span className="rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-xs font-black uppercase text-blue-700">
                CC
              </span>
              <span className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-sm font-bold text-slate-600">
                {status}
              </span>
              <span className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-sm font-bold text-slate-500">
                Deletes after 24 hours
              </span>
            </div>
            <h1 className="mt-3 bg-gradient-to-r from-black via-blue-700 to-fuchsia-600 bg-clip-text text-3xl font-black leading-tight text-transparent sm:text-4xl">
              copy-paste
            </h1>
            <p className="mt-2 text-base leading-7 text-slate-600">
              A live 24-hour pasteboard with a simple shareable link.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="max-w-xl truncate rounded-full border border-white/70 bg-white/75 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              {link || "Generating /cc link..."}
            </div>
            {link ? <CopyButton value={link} /> : null}
          </div>
        </div>
        {error ? (
          <p className="mx-auto mt-3 max-w-7xl rounded-xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}
      </header>
      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 pb-6 sm:px-6">
        <div className="min-h-0 flex-1 rounded-[28px] bg-[linear-gradient(135deg,rgba(37,99,235,0.7),rgba(244,114,255,0.62),rgba(234,240,74,0.46),rgba(125,211,252,0.64))] p-[2px] shadow-[0_28px_80px_rgba(37,99,235,0.16)]">
          <div className="min-h-full rounded-[26px] bg-white/88 p-3 shadow-inner backdrop-blur">
            <textarea
              className="h-[calc(100vh-16.5rem)] w-full resize-none rounded-[20px] border border-transparent bg-white/80 p-6 text-lg font-medium leading-9 text-slate-800 outline-none placeholder:text-slate-400 focus:bg-white sm:p-8"
              value={body}
              onChange={(event) => {
                hasPendingLocalChange.current = true;
                setBody(event.target.value);
              }}
              placeholder="Paste anything here. Share the simple /cc link above."
              autoFocus
            />
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-white/70 bg-white/55 p-3 backdrop-blur">
          <ClickableLinks value={body} />
        </div>
      </main>
    </div>
  );
}
