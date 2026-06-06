export function plainTextToHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

export function htmlToPlainText(value: string) {
  if (typeof document === "undefined") {
    return value;
  }

  const container = document.createElement("div");
  container.innerHTML = value;
  return container.innerText;
}

export async function readClipboardText() {
  return navigator.clipboard.readText();
}

export async function readClipboardHtmlOrText() {
  try {
    if ("read" in navigator.clipboard) {
      const items = await navigator.clipboard.read();

      for (const item of items) {
        if (item.types.includes("text/html")) {
          return (await item.getType("text/html")).text();
        }
      }
    }
  } catch {
    // Fall back to plain text when the browser blocks rich clipboard reads.
  }

  return plainTextToHtml(await readClipboardText());
}

export async function writeClipboardText(value: string, html?: string) {
  if (html && "ClipboardItem" in window && "write" in navigator.clipboard) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([value], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
      return;
    } catch {
      // Plain text copy is still useful if rich clipboard writes are blocked.
    }
  }

  await navigator.clipboard.writeText(value);
}

export function serializeVaultItems(
  items: Array<{ name: string; password: string }>,
) {
  return items
    .filter((item) => item.name.trim() || item.password)
    .map((item) => `${item.name.trim()}\t${item.password}`)
    .join("\n");
}

export function parseVaultItems(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const tabParts = line.split("\t");

      if (tabParts.length >= 2) {
        return {
          name: tabParts[0].trim(),
          password: tabParts.slice(1).join("\t").trim(),
        };
      }

      const separatorIndex = line.search(/[:=,]/);

      if (separatorIndex > -1) {
        return {
          name: line.slice(0, separatorIndex).trim(),
          password: line.slice(separatorIndex + 1).trim(),
        };
      }

      return { name: line, password: "" };
    });
}
