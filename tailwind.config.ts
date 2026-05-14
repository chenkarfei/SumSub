import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            screens: {
                // Mobile-first: base styles target 320px+
                'xs': '320px',
                'sm': '428px',
                'md': '768px',
                'lg': '1024px',
            },
            minHeight: {
                'tap': '44px',
            },
            minWidth: {
                'tap': '44px',
            },
            fontSize: {
                'input': '16px', // Prevent iOS zoom
            },
            colors: {
                'kyc': {
                    'primary': '#2563EB',
                    'primary-hover': '#1D4ED8',
                    'success': '#16A34A',
                    'danger': '#DC2626',
                    'warning': '#F59E0B',
                    'bg': '#F8FAFC',
                    'card': '#FFFFFF',
                    'border': '#E2E8F0',
                    'text': '#1E293B',
                    'muted': '#64748B',
                },
            },
        },
    },
    plugins: [],
};
export default config;