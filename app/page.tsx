import { BrandWordmark } from "@/components/BrandWordmark";
import {
  FeatureShareButton,
  type FeatureAction,
} from "@/components/FeatureShareButton";
import { HomeShareModal } from "@/components/HomeShareModal";
import { Navbar } from "@/components/Navbar";

const featureDetails: {
  label: string;
  action: FeatureAction;
  title: string;
  description: string;
}[] = [
  {
    label: "Code sharing",
    action: "code",
    title: "Live code rooms for quick handoffs.",
    description:
      "Paste a snippet, choose a language, and share a short link. Anyone with the link can see changes as they happen, which makes it useful for debugging, interviews, teaching, and quick reviews.",
  },
  {
    label: "Documents",
    action: "document",
    title: "Rich documents without sending files around.",
    description:
      "Create a live document with formatted text, pasted links, and tables. It is simple enough for a quick draft, but flexible enough for specs, notes from a call, or a shared checklist.",
  },
  {
    label: "Notes",
    action: "note",
    title: "Fast notes that stay writable.",
    description:
      "Use notes for anything that needs to be captured quickly: meeting points, instructions, reminders, support details, or text you want someone else to edit in real time.",
  },
  {
    label: "Bookmarks",
    action: "bookmark",
    title: "Save context around an important URL.",
    description:
      "Bookmarks pair a required URL with an optional name and description, so the person opening the link understands why it matters instead of receiving a bare address.",
  },
  {
    label: "Links",
    action: "link",
    title: "Share a URL with extra notes attached.",
    description:
      "Link shares are ideal when a plain link is not enough. Add a title, description, and notes, then let the public page keep everything readable and clickable.",
  },
  {
    label: "CC pasteboard",
    action: "cc",
    title: "A one-hour scratchpad with a memorable link.",
    description:
      "Open /cc, pick an easy name, paste fast, and share a simple URL like /cc/john92. It is made for temporary copy-paste work and clears out after one hour.",
  },
  {
    label: "Encrypted passwords",
    action: "password",
    title: "A private vault for sensitive shares.",
    description:
      "Password vaults use long links, login-gated access, encrypted password data, masked inputs, and a 5-second reveal flow protected by an access code and PIN.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_31%_76%,rgba(244,114,255,0.44),transparent_24%),radial-gradient(circle_at_52%_42%,rgba(234,240,74,0.38),transparent_25%),radial-gradient(circle_at_86%_42%,rgba(248,113,113,0.3),transparent_28%),radial-gradient(circle_at_96%_4%,rgba(125,211,252,0.34),transparent_24%),radial-gradient(circle_at_4%_0%,rgba(196,181,253,0.34),transparent_26%),linear-gradient(180deg,#fafbff_0%,#fff8fb_48%,#f7faff_100%)]">
      <div className="relative z-10">
        <Navbar />
      </div>
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-10 text-center sm:px-6 lg:pt-12">
        <section className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 w-fit rounded-full border border-black/10 bg-white/60 px-5 py-3 text-base font-medium text-slate-700 shadow-sm backdrop-blur">
            Live links for code, docs, notes, bookmarks, pasteboards & vaults
          </div>

          <h1 className="text-[64px] font-black leading-[0.9] text-black sm:text-[92px] lg:text-[118px]">
            Share your things.
            <span className="mt-5 block text-black/60">Keep it live.</span>
          </h1>
          <div className="mx-auto mt-12 max-w-4xl space-y-5 text-2xl leading-10 sm:text-[28px] sm:leading-[46px]">
            <p className="text-slate-600">
              <BrandWordmark className="text-inherit" /> creates live links for
              code, docs, notes, bookmarks, links, CC pasteboards, and
              encrypted password vaults.
            </p>
            <p className="font-semibold text-black">
              Simple short URLs. Realtime edits. Private dashboard.
            </p>
            {/* <p className="font-semibold text-black">
              Most links expire in 3 days. CC pasteboards expire in 1 hour.
            </p> */}
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <span className="rounded-full border border-blue-300 bg-white/55 px-5 py-3 text-base font-medium text-blue-700 shadow-sm backdrop-blur">
              Live Realtime editing
            </span>
            <span className="rounded-full border border-black/10 bg-white/55 px-5 py-3 text-base font-medium text-slate-600 shadow-sm backdrop-blur">
              Encrypted password vaults
            </span>
            <span className="rounded-full border border-black/10 bg-white/55 px-5 py-3 text-base font-medium text-slate-600 shadow-sm backdrop-blur">
              Short links for fast sharing
            </span>
          </div>

          <div className="mt-12 flex items-center justify-center">
            <HomeShareModal
              align="center"
              placement="top"
              buttonClassName="w-[min(92vw,430px)] rounded-md bg-blue-600 px-12 py-5 text-center text-xl font-bold text-white shadow-[0_18px_45px_rgba(37,99,235,0.28)] transition hover:bg-blue-700"
            />
          </div>

          {/* <div className="mt-7 text-base leading-7 text-slate-500">
            Supabase Auth, Postgres, Realtime, and Storage only · No custom
            backend
          </div> */}
        </section>

        <section className="mx-auto mt-20 grid max-w-6xl gap-5 text-left md:grid-cols-3">
          {[
            [
              "Code & docs",
              "Textarea code shares and rich HTML documents update live for everyone with the link.",
            ],
            [
              "CC pasteboard",
              "Open /cc for a one-hour scratch link with a name that is easy to say and type.",
            ],
            [
              "Password vaults",
              "Long private links, email-gated access, masked inputs, and 5-second reveal windows.",
            ],
          ].map(([title, text]) => (
            <div
              key={title}
              className="rounded-lg border border-white/70 bg-white/65 p-7 shadow-sm backdrop-blur"
            >
              <h2 className="text-lg font-bold text-slate-950">{title}</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">{text}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto mt-24 max-w-6xl text-left">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-base font-semibold text-blue-700">
              What you can share
            </p>
            <h2 className="mt-4 text-4xl font-black leading-tight text-black sm:text-6xl">
              Built for the little things teams pass around all day.
            </h2>
            <p className="mt-6 text-xl leading-9 text-slate-600">
              <BrandWordmark className="text-inherit" /> keeps every share
              lightweight, live, and easy to open. Use the simple tools for
              public temporary sharing, and the vault for sensitive passwords
              that need controlled access.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {featureDetails.map((feature, index) => (
              <article
                key={feature.label}
                className={`rounded-xl border border-white/70 bg-white/65 p-7 shadow-sm backdrop-blur ${
                  index === featureDetails.length - 1 ? "md:col-span-2" : ""
                }`}
              >
                <div className="flex items-start gap-5">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-200/70 text-lg font-black text-blue-600">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase text-blue-700">
                      {feature.label}
                    </p>
                    <h3 className="mt-2 text-2xl font-black leading-tight text-slate-950">
                      {feature.title}
                    </h3>
                    <p className="mt-4 text-base leading-8 text-slate-600">
                      {feature.description}
                    </p>
                    <FeatureShareButton action={feature.action} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
