import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#2563EB",
};

export const metadata: Metadata = {
    title: "KYC Verification Portal",
    description: "Complete your identity verification securely",
    manifest: "/manifest.json",
    openGraph: {
        title: "KYC Verification Portal",
        description: "Complete your identity verification securely",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/favicon.ico" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="format-detection" content="telephone=no" />
            </head>
            <body className="min-h-screen pb-safe bg-kyc-bg">
                {/* Header */}
                <header className="sticky top-0 z-50 bg-kyc-card/80 backdrop-blur-md border-b border-kyc-border/50">
                    <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-kyc-primary rounded-lg flex items-center justify-center">
                                <svg
                                    className="w-5 h-5 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                    />
                                </svg>
                            </div>
                            <span className="text-base font-bold text-kyc-text">
                                KYC Portal
                            </span>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-lg mx-auto px-4 py-6">{children}</main>

                {/* Footer */}
                <footer className="max-w-lg mx-auto px-4 py-4 border-t border-kyc-border/50">
                    <p className="text-xs text-kyc-muted/50 text-center">
                        Secured with 256-bit encryption. Your data is protected.
                    </p>
                </footer>
            </body>
        </html>
    );
}