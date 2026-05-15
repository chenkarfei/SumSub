import type { Config } from "tailwindcss";

const config: Config = {
    content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
    theme: {
        extend: {
            screens: {
                xs: "320px",
                sm: "428px",
                md: "768px",
                lg: "1024px",
                xl: "1280px",
            },
            minHeight: { tap: "44px" },
            minWidth: { tap: "44px" },
            fontSize: { input: "16px" },
            fontFamily: {
                sans: ["var(--font-inter)", "system-ui", "sans-serif"],
            },
            colors: {
                kyc: {
                    dark: "#0B1120",
                    "dark-2": "#1E293B",
                    primary: "#1D4ED8",
                    "primary-hover": "#1E40AF",
                    "primary-light": "#3B82F6",
                    "primary-subtle": "#EFF6FF",
                    accent: "#6366F1",
                    success: "#059669",
                    "success-light": "#ECFDF5",
                    danger: "#DC2626",
                    "danger-light": "#FEF2F2",
                    warning: "#D97706",
                    "warning-light": "#FFFBEB",
                    bg: "#F8FAFC",
                    "bg-2": "#F1F5F9",
                    card: "#FFFFFF",
                    border: "#E2E8F0",
                    "border-dark": "#CBD5E1",
                    text: "#0F172A",
                    "text-2": "#1E293B",
                    muted: "#64748B",
                    "muted-2": "#94A3B8",
                },
            },
            boxShadow: {
                card: "0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)",
                "card-md": "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
                "card-lg": "0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.05)",
                premium: "0 20px 25px -5px rgb(29 78 216 / 0.12), 0 8px 10px -6px rgb(29 78 216 / 0.08)",
                glow: "0 0 0 3px rgb(59 130 246 / 0.18)",
                "glow-success": "0 0 0 3px rgb(5 150 105 / 0.18)",
            },
            backgroundImage: {
                "gradient-brand": "linear-gradient(160deg, #0B1120 0%, #17284a 55%, #1e3a8a 100%)",
                "gradient-btn": "linear-gradient(135deg, #1D4ED8 0%, #4338CA 100%)",
                "gradient-success": "linear-gradient(135deg, #059669 0%, #10B981 100%)",
                "gradient-danger": "linear-gradient(135deg, #DC2626 0%, #EF4444 100%)",
                "gradient-warning": "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
                "gradient-subtle": "linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)",
            },
            animation: {
                "fade-in": "fadeIn 0.3s ease-out",
                "slide-up": "slideUp 0.35s ease-out",
                "spin-smooth": "spin 1.1s linear infinite",
                "pulse-slow": "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { opacity: "0", transform: "translateY(10px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
            },
        },
    },
    plugins: [],
};
export default config;
