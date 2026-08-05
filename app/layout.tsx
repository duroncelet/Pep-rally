import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pep-rally-mvp.kelzcore.chatgpt.site"),
  title: "Pep Rally — Find your shortcut. Or launch one.",
  description: "A consumer marketplace and launchpad for useful AI mini-apps tested in real life.",
  openGraph: { title: "Pep Rally", description: "Useful AI mini-apps, tested in real life.", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "Pep Rally", description: "Useful AI mini-apps, tested in real life.", images: ["/og.png"] },
};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
