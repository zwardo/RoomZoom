import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import { ScrollActivity } from "@/components/scroll-activity";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const robotoMono = Roboto_Mono({ subsets: ["latin"], variable: "--font-roboto-mono" });

export const metadata: Metadata = {
  title: "RoomZoom",
  description: "Find and book meeting rooms near your desk.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={robotoMono.variable}>
      <body className="antialiased">
        <ScrollActivity />
        {/* Page padding lives here, not on <body>: Radix's dialog scroll lock
            overwrites body padding while a dialog is open. */}
        <div className="flex min-h-screen flex-col gap-4 p-4">
          <TooltipProvider>{children}</TooltipProvider>
        </div>
      </body>
    </html>
  );
}
