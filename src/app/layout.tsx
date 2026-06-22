import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cupet Watcher",
  description: "Monitoreá las gasolineras de Cuba en tiempo real",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
