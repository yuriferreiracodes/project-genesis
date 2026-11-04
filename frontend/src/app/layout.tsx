import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Bebas_Neue, Roboto_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { GenesisUIProvider } from "@/state/useGenesisUI";
import { Sidebar } from "@/components/app/Sidebar";

const inter = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-display" });
const robotoCondensed = Roboto_Condensed({ subsets: ["latin"], weight: ["300", "400", "700"], variable: "--font-condensed" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Project Genesis",
  description: "Initial shell of the Project Genesis agent",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-obsidian">
      <body className={`${inter.variable} ${bebas.variable} ${robotoCondensed.variable} ${jetbrainsMono.variable} antialiased text-ink`}
        suppressHydrationWarning
      >
        <GenesisUIProvider>
          <div className="relative min-h-screen overflow-hidden">
            <div className="genesis-grid absolute inset-0" aria-hidden />
            <div className="relative flex min-h-screen">
              <Sidebar />
              <main className="flex-1">{children}</main>
            </div>
          </div>
        </GenesisUIProvider>
      </body>
    </html>
  );
}
