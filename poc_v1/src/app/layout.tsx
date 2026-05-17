import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Process Flow PoC V1",
  description: "Process step template and process flow instance proof of concept"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
