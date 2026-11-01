import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import TopNav from "@/components/TopNav";

export const metadata: Metadata = {
  title: "Model Metrics — Sharp Prices. +EV Bets.",
  description: "Find +EV player props by comparing sportsbook prices to the fair price from sharp books. NFL, NBA, and MLB.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <TopNav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
