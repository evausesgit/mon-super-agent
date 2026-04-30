import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mon Super Agent",
  description: "Create your personal AI agent and chat with it on Telegram or WhatsApp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

