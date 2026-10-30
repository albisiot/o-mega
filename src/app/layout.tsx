import type { Metadata, Viewport } from "next";
import { Anton, Archivo, Bangers } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

const bangers = Bangers({
  variable: "--font-bangers",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "O-MEGA",
  description: "Apri un pacchetto al giorno, colleziona supereroi e supercattivi, sfida e conquista.",
  applicationName: "O-MEGA",
  appleWebApp: {
    capable: true,
    title: "O-MEGA",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0b0f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      className={`${archivo.variable} ${anton.variable} ${bangers.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <AuthProvider>
          {children}
          <BottomNav />
        </AuthProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
