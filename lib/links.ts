const urlPattern = /https?:\/\/[^\s<>"']+/gi;

export function extractLinks(value: string) {
  const matches = value.match(urlPattern) ?? [];
  const seen = new Set<string>();

  return matches
    .map((url) => url.replace(/[),.;!?]+$/g, ""))
    .filter((url) => {
      if (seen.has(url)) {
        return false;
      }

      seen.add(url);
      return true;
    });
}
