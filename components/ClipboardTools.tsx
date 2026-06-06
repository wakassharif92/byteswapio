"use client";

import { useState } from "react";

export function ClipboardTools({
  onCopy,
  onPaste,
  className = "",
}: {
  onCopy: () => Promise<void> | void;
  onPaste: () => Promise<void> | void;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [pasting, setPasting] = useState(false);

  async function copy() {
    await onCopy();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function paste() {
    setPasting(true);

    try {
      await onPaste();
    } finally {
      setPasting(false);
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/85 px-3 py-2 text-xs font-black text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        >
          {copied ? (
            <path d="m5 13 4 4L19 7" />
          ) : (
            <>
              <path d="M8 8h12v12H8z" />
              <path d="M4 16V4h12" />
            </>
          )}
        </svg>
        {copied ? "Copied" : "Copy all"}
      </button>
      <button
        type="button"
        onClick={paste}
        disabled={pasting}
        className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/85 px-3 py-2 text-xs font-black text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        >
          <path d="M9 5h6" />
          <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
          <path d="M5 7h14v16H5z" />
          <path d="M12 11v7" />
          <path d="m9 15 3 3 3-3" />
        </svg>
        {pasting ? "Pasting..." : "Paste"}
      </button>
    </div>
  );
}
