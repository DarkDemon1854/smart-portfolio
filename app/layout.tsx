import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Nav } from "@/components/nav";
import { Toaster } from "sonner";
import { ParallaxStars } from "@/components/ui/parallax-stars";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Smart Portfolio Optimizer",
    description: "AI-powered financial portfolio optimization with advanced analytics",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    <ParallaxStars speed={1} />
                    <Nav />
                    {children}
                    <Toaster richColors position="top-right" />
                </ThemeProvider>
            </body>
        </html>
    );
}
