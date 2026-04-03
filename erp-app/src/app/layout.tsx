import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CommisERP — Enterprise Finance, Invoicing & Inventory",
  description: "Integrated ERP module for double-entry ledger, GST-aware invoicing, FIFO/LIFO inventory, and client management. Built for Indian businesses.",
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
