import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { ToastNotifications } from "@/components/ui/toast-notifications";
import { Inter } from 'next/font/google'
 
// If loading a variable font, you don't need to specify the font weight
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: "EMS - Energy Management System",
  description: "Monitor and manage energy meters",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');var dark=t?t==='dark':true;if(dark)document.documentElement.classList.add('dark');})();`,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen bg-background antialiased`}>
        {children}
        <ToastNotifications />
      </body>
    </html>
  );
}
