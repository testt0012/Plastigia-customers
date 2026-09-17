import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plastigia Customers",
  description:
    "Διαχείριση πελατών και υποψήφιων πελατών για καταστήματα ειδών υγιεινής & οικοδομικών σε όλη την Ελλάδα.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Plastigia",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
