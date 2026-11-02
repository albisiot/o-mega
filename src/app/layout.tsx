import type { Metadata, Viewport } from "next";
import {
  Abril_Fatface,
  Alfa_Slab_One,
  Anton,
  Archivo,
  Bangers,
  Big_Shoulders_Stencil,
  Bungee,
  Cinzel,
  Creepster,
  Orbitron,
  Pirata_One,
  Racing_Sans_One,
  Silkscreen,
  Titan_One,
} from "next/font/google";
import { AppSplash } from "@/components/app-splash";
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

// Card name typefaces (see src/lib/card-names.ts). Not preloaded: the browser fetches each
// small file only when a card on screen uses it.
// The font loader only accepts literal options, hence the repetition.
const cinzel = Cinzel({ variable: "--font-cinzel", weight: "900", subsets: ["latin"], preload: false });
const orbitron = Orbitron({ variable: "--font-orbitron", weight: "900", subsets: ["latin"], preload: false });
const stencil = Big_Shoulders_Stencil({ variable: "--font-stencil", weight: "900", subsets: ["latin"], preload: false });
const pirata = Pirata_One({ variable: "--font-pirata", weight: "400", subsets: ["latin"], preload: false });
const racing = Racing_Sans_One({ variable: "--font-racing", weight: "400", subsets: ["latin"], preload: false });
const silkscreen = Silkscreen({ variable: "--font-silkscreen", weight: "400", subsets: ["latin"], preload: false });
const bungee = Bungee({ variable: "--font-bungee", weight: "400", subsets: ["latin"], preload: false });
const alfaSlab = Alfa_Slab_One({ variable: "--font-alfa-slab", weight: "400", subsets: ["latin"], preload: false });
const creepster = Creepster({ variable: "--font-creepster", weight: "400", subsets: ["latin"], preload: false });
const titan = Titan_One({ variable: "--font-titan", weight: "400", subsets: ["latin"], preload: false });
const abril = Abril_Fatface({ variable: "--font-abril", weight: "400", subsets: ["latin"], preload: false });
const nameFonts = [cinzel, orbitron, stencil, pirata, racing, silkscreen, bungee, alfaSlab, creepster, titan, abril]
  .map((font) => font.variable)
  .join(" ");

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
      className={`${archivo.variable} ${anton.variable} ${bangers.variable} ${nameFonts} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <AuthProvider>
          {children}
          <BottomNav />
          <AppSplash />
        </AuthProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
