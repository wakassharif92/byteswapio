import type { ShareType } from "@/lib/types";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function createSlug() {
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
    "ray",
    "noah",
    "mina",
    "adam",
    "sami",
    "hana",
    "alex",
    "zoe",
  ];
  const name = names[Math.floor(Math.random() * names.length)];
  const suffix = Math.floor(Math.random() * 900) + 10;

  return `${name}${suffix}`;
}

export function createSecureSlug() {
  const alphabet =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(28));

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function neverExpires() {
  return "9999-12-31T23:59:59.000Z";
}

export function isExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() <= Date.now();
}

export function publicShareUrl(slug: string) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/s/${slug}`;
  }

  if (typeof window === "undefined") {
    return `/s/${slug}`;
  }

  return `${window.location.origin}/s/${slug}`;
}

export function defaultTitle(type: ShareType) {
  const labels: Record<ShareType, string> = {
    code: "Untitled code share",
    document: "Untitled document",
    link: "Untitled link",
    bookmark: "Untitled bookmark",
    note: "Untitled note",
    password: "Encrypted password",
  };

  return labels[type];
}

export async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return arrayBufferToBase64(digest);
}

export function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

export function base64ToArrayBuffer(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}
