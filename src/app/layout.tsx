import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans } from "next/font/google";
import "../styles/globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DeskFlow — Support ticketing",
  description:
    "SLA-driven support ticketing with AI-assisted triage. Built with Next.js, Prisma and PostgreSQL.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        notoSans.variable,
      )}
    >
      <body className="min-h-full flex flex-col bg-muted/30">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
