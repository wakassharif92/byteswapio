const names = [
  "ali",
  "anderson",
  "john",
  "sara",
  "mira",
  "sam",
  "nora",
  "leo",
  "zain",
  "maya",
  "omar",
  "lina",
];

export function oneHourFromNow() {
  const date = new Date();
  date.setHours(date.getHours() + 1);
  return date.toISOString();
}

export function createCcSlug() {
  const name = names[Math.floor(Math.random() * names.length)];
  const suffix = Math.floor(Math.random() * 90) + 10;

  return `${name}${suffix}`;
}

export function ccUrl(slug: string) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/cc/${slug}`;
  }

  if (typeof window === "undefined") {
    return `/cc/${slug}`;
  }

  return `${window.location.origin}/cc/${slug}`;
}
