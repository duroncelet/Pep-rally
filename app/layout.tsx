import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pep-rally-mvp.kelzcore.chatgpt.site"),
  title: "Pep Rally — The marketplace for everyday mini-apps",
  description: "Shop useful mini-apps made by real people—or publish and sell something you made.",
  openGraph: { title: "Pep Rally", description: "Useful little apps, made by real people.", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "Pep Rally", description: "Useful little apps, made by real people.", images: ["/og.png"] },
};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
