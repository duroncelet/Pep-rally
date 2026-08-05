import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Pep Rally — Useful little tools for real life", description: "A creator-led marketplace for practical mini-apps made by real people." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
