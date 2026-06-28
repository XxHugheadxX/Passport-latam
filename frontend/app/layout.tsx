import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { NavBar } from "@/app/components/NavBar"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Passport LATAM",
  description: "Digital Product Passport Infrastructure for Latin America — From Origin to Ownership, Verified on Stellar.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-base-200 text-base-content">
        <NavBar />
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  )
}