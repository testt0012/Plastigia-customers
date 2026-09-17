import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Καταστημάτων | Store Locator",
  description:
    "Διαχείριση πελατών και υποψήφιων πελατών για καταστήματα ειδών υγιεινής & οικοδομικών σε όλη την Ελλάδα.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el">
      <body className="antialiased">{children}</body>
    </html>
  );
}
