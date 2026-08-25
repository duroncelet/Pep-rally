import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pep-rally-mvp.kelzcore.chatgpt.site"),
  title: "Pep Rally — Plans you can actually use",
  description: "Ready-to-use planning workspaces for real life, starting with bachelorette weekends and home gardens.",
  openGraph: { title: "Pep Rally", description: "Plan the thing. Enjoy the thing.", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "Pep Rally", description: "Plan the thing. Enjoy the thing.", images: ["/og.png"] },
};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
