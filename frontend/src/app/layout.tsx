import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { LanguageProvider } from "@/lib/language-context";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "KrishiSetu — AI-Powered Agricultural Price Intelligence",
  description: "Next-generation agricultural intelligence platform helping Indian farmers track verified APMC mandi spot prices, forecast trends with Hybrid ARIMA+LSTM models, and maximize net crop selling profit.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className={`${fontSans.className} min-h-full flex flex-col bg-[#FAF9F5] text-[#1A2621] dark:bg-[#091510] dark:text-[#F0F4F1] selection:bg-[#C5A45D]/25 selection:text-[#0D281D] transition-colors`}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <Navbar />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
