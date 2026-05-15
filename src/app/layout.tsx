import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
    weight: ["300", "400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#0B1120",
};

export const metadata: Metadata = {
    title: "KYC Verification Portal",
    description: "Complete your identity verification securely and efficiently",
    manifest: "/manifest.json",
    openGraph: {
        title: "KYC Verification Portal",
        description: "Complete your identity verification securely and efficiently",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={inter.variable}>
            <head>
                <link rel="icon" href="/favicon.ico" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="format-detection" content="telephone=no" />
            </head>
            <body className="min-h-screen bg-kyc-bg antialiased tap-none">
                {children}
            </body>
        </html>
    );
}
