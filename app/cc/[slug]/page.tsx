import { CcEditor } from "@/components/CcEditor";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import type { PublicShare } from "@/lib/types";
import { isExpired } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function CcSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  if (!supabase) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
          <h1 className="text-2xl font-semibold text-slate-950">
            Supabase is not configured
          </h1>
        </main>
      </>
    );
  }

  const { data: ccShare } = await supabase
    .from("shares")
    .select("*, share_contents(*)")
    .eq("slug", slug)
    .eq("type", "note")
    .single();

  if (ccShare) {
    const rawShare = ccShare as unknown as PublicShare & {
      share_contents:
        | PublicShare["share_contents"]
        | PublicShare["share_contents"][];
    };
    const publicShare: PublicShare = {
      ...rawShare,
      share_contents: Array.isArray(rawShare.share_contents)
        ? rawShare.share_contents[0] ?? null
        : rawShare.share_contents,
    };

    if (isExpired(publicShare.expires_at)) {
      return <ExpiredCc />;
    }

    return <CcEditor initialShare={publicShare} />;
  }

  notFound();
}

function ExpiredCc() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <section className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-950">
            This CC link has expired
          </h1>
          <p className="mt-2 text-slate-600">
            Fast copy-paste links last for 24 hours, then the name becomes
            reusable.
          </p>
          <Link
            className="mt-6 inline-flex rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            href="/cc"
          >
            Create a new CC link
          </Link>
        </section>
      </main>
    </>
  );
}
