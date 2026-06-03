import { extractLinks } from "@/lib/links";

export function ClickableLinks({ value }: { value: string }) {
  const links = extractLinks(value);

  if (!links.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-md border border-slate-200 bg-white p-3">
      {links.map((link) => (
        <a
          key={link}
          href={link}
          target="_blank"
          rel="noreferrer"
          className="max-w-full truncate rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-sky-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900"
        >
          {link}
        </a>
      ))}
    </div>
  );
}
