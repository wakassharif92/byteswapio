import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ByteSwapio",
  description:
    "Live expiring links for code, documents, notes, links, and encrypted passwords.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-950">
        {children}
      </body>
    </html>
  );
}
