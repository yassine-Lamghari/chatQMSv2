import type { Metadata } from "next";
import "./globals.css";
import ToastContainer from "./components/Toast";

export const metadata: Metadata = {
  title: "QMS Assistant",
  description: "Assistant documentaire QMS — RAG multilingue",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
