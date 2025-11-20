import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Header } from "@/components/ui/Header";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TechStore - Sua loja de tecnologia",
  description: "Os melhores produtos de tecnologia com os melhores preços",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} ${poppins.variable} antialiased`}
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <Header />
              <main className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
                {children}
              </main>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
