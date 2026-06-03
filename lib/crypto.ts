import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  sha256,
} from "@/lib/utils";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function deriveKey(code: string, salt: ArrayBuffer) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(code),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 210_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptPassword(secret: string, decryptCode: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(decryptCode, bytesToArrayBuffer(salt));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(secret),
  );

  return {
    encryptedPayload: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(bytesToArrayBuffer(iv)),
    salt: arrayBufferToBase64(bytesToArrayBuffer(salt)),
  };
}

export async function decryptPassword(
  encryptedPayload: string,
  iv: string,
  salt: string,
  decryptCode: string,
) {
  const key = await deriveKey(decryptCode, base64ToArrayBuffer(salt));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(base64ToArrayBuffer(iv)) },
    key,
    base64ToArrayBuffer(encryptedPayload),
  );

  return decoder.decode(decrypted);
}

export async function hashCode(code: string) {
  return sha256(code.trim());
}

export type PasswordVaultItem = {
  id: string;
  name: string;
  password: string;
};
