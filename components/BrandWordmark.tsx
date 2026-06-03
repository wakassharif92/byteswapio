import Link from "next/link";

export function BrandWordmark({
  className = "text-xl",
  href,
}: {
  className?: string;
  href?: string;
}) {
  const wordmark = (
    <span
      className={`bg-gradient-to-r from-blue-700 via-fuchsia-600 to-slate-950 bg-clip-text font-black text-transparent ${className}`}
    >
      ByteSwapio
    </span>
  );

  if (href) {
    return <Link href={href}>{wordmark}</Link>;
  }

  return wordmark;
}
