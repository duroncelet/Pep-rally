import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://peprally.fun"),
  title: "Pep Rally — The marketplace for everyday mini-apps",
  description: "Shop useful mini-apps made by real people—or publish and sell something you made.",
  openGraph: { title: "Pep Rally", description: "Working apps for real-life outcomes, made by people who know the problem.", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "Pep Rally", description: "Working apps for real-life outcomes, made by people who know the problem.", images: ["/og.png"] },
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body><ClerkProvider>{children}</ClerkProvider></body></html>;
}
