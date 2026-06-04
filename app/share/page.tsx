import { BrandWordmark } from "@/components/BrandWordmark";
import { Navbar } from "@/components/Navbar";
import { ShareTypePicker } from "@/components/ShareTypePicker";

export default function SharePage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold text-slate-950">
          Choose what to share
        </h1>
        <p className="mt-2 text-slate-600">
          Each <BrandWordmark className="text-inherit" /> link is public, live,
          and stays available until you delete it.
        </p>
        <div className="mt-8">
          <ShareTypePicker />
        </div>
      </main>
    </>
  );
}
