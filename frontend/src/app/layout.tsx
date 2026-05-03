import type { Metadata, Viewport } from "next";
import "./globals.css";
import ToastContainer from "./components/Toast";

export const metadata: Metadata = {
  title: "QMS Assistant",
  description: "Assistant documentaire QMS — RAG multilingue",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="claude-theme">
      <body>
        <div className="claude-theme">
          {children}
        </div>
        <ToastContainer />
      </body>
    </html>
  );
}
