import type { Metadata } from "next";
import "./globals.css";
import { Rajdhani, IBM_Plex_Mono } from "next/font/google";
import { ToastNotifications } from "@/components/ui/toast-notifications";

export const metadata: Metadata = {
  title: "EMS - Energy Management System",
  description: "Monitor and manage energy meters",
};

const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono-ems" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          async
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');var dark=t?t==='dark':true;if(dark)document.documentElement.classList.add('dark');})();`,
          }}
        />
      </head>
      <body className={`${rajdhani.variable} ${plexMono.variable} min-h-screen bg-background antialiased`}>
        {children}
        <ToastNotifications />
      </body>
    </html>
  );
}
