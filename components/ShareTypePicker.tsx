import { SHARE_TYPE_LABELS, SHARE_TYPES } from "@/lib/types";
import Link from "next/link";

const descriptions = {
  code: "Live code snippets with language labels.",
  document: "Rich HTML notes with pasted links and tables.",
  link: "A single URL with context.",
  bookmark: "Saved links with notes for later.",
  note: "Plain text thoughts that update live.",
  password: "AES-GCM encrypted secret delivery.",
};

export function ShareTypePicker() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {SHARE_TYPES.map((type) => (
        <Link
          key={type}
          href={`/share/${type}`}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-slate-950">
            {SHARE_TYPE_LABELS[type]}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {descriptions[type]}
          </p>
        </Link>
      ))}
    </div>
  );
}
