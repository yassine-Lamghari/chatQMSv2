import type { Metadata, Viewport } from "next";
import { Manrope, Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ToastContainer from "./components/Toast";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

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
    <html
      lang="fr"
      className={`${manrope.variable} ${newsreader.variable} ${jakarta.variable} claude-theme`}
    >
      <body>
        <div className="claude-theme">
          {children}
        </div>
        <ToastContainer />
      </body>
    </html>
  );
}
