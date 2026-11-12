import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pizzería 90 grados — Pedidos a domicilio",
  description:
    "Haz tu pedido a domicilio de Pizzería 90 grados en Facatativá y pueblos cercanos.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#c02425",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-CO">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
