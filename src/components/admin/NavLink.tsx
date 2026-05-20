"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
    href: string;
    label: string;
    icon: React.ReactNode;
    exact?: boolean;
}

export default function NavLink({ href, label, icon, exact }: NavLinkProps) {
    const pathname = usePathname();
    const isActive = exact ? pathname === href : pathname.startsWith(href);

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                    ? "bg-white/10 text-white"
                    : "text-white/55 hover:text-white hover:bg-white/8"
            }`}
        >
            <span className="shrink-0">{icon}</span>
            {label}
        </Link>
    );
}
