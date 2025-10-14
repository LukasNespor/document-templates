import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Šablony dokumentů",
  description: "Vytvářejte Word dokumenty ze šablon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
