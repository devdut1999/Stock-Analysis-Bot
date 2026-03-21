import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";

export const metadata: Metadata = {
  title: "StockBot - Indian Stock Market Intelligence",
  description: "AI-powered Indian stock analysis with 10 specialized agents, VCP screening, options strategies, and more",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
