import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Reps",
  description: "AI-powered outbound calling platform for sales representatives",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
