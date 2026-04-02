import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "动点神笔",
  description: "让初中数学动起来",
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
