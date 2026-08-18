import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import TopNav from "@/components/TopNav";

export const metadata: Metadata = {
  title: "Model Metrics — Sharp Data. Sharp Bets.",
  description: "Player prop analytics across MLB, NBA, NFL, and Esports.",
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
