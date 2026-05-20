import { NextRequest, NextResponse } from "next/server";
import { verifySessionJwt, cookieName } from "@/lib/auth";

function extractSubdomain(host: string): string {
    // agent1.localhost:3004 → "agent1"
    // agent1.example.com → "agent1"
    // localhost:3004 → ""
    // example.com → ""
    if (!host) return "";
    const hostWithoutPort = host.split(":")[0];
    const parts = hostWithoutPort.split(".");
    if (parts.length === 1) return ""; // bare localhost or TLD
    if (parts[parts.length - 1] === "localhost") {
        // e.g. agent1.localhost
        return parts.length >= 2 ? parts[0] : "";
    }
    // Regular domain: agent1.example.com → parts = [agent1, example, com]
    if (parts.length >= 3) return parts[0];
    return "";
}

async function getPayload(req: NextRequest, userType: "contact" | "agent" | "admin") {
    const token = req.cookies.get(cookieName(userType))?.value;
    if (!token) return null;
    return verifySessionJwt(token);
}

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const host = req.headers.get("host") ?? "";
    const subdomain = extractSubdomain(host);

    // Always allow static assets, Next internals, and public API routes
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api/webhook") ||
        pathname.startsWith("/api/auth") ||
        pathname === "/favicon.ico" ||
        pathname === "/manifest.json"
    ) {
        return NextResponse.next();
    }

    // ── Admin subdomain ───────────────────────────────────────────────────────
    if (subdomain === "admin") {
        if (pathname === "/admin/login" || pathname.startsWith("/api/admin")) {
            // Admin API routes check session themselves
            if (pathname.startsWith("/api/admin")) {
                const payload = await getPayload(req, "admin");
                if (!payload || payload.userType !== "admin") {
                    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
                }
            }
            return NextResponse.next();
        }

        // Protect all /admin/* pages
        if (pathname.startsWith("/admin")) {
            const payload = await getPayload(req, "admin");
            if (!payload || payload.userType !== "admin") {
                return NextResponse.redirect(new URL("/admin/login", req.url));
            }
        }
        return NextResponse.next();
    }

    // ── Agent subdomain (any non-admin, non-empty subdomain) ──────────────────
    if (subdomain && subdomain !== "www") {
        const agentPayload = await getPayload(req, "agent");

        // Agent dashboard pages
        if (pathname.startsWith("/agent")) {
            if (pathname === "/agent/login") return NextResponse.next();

            if (!agentPayload || agentPayload.userType !== "agent" || agentPayload.subdomain !== subdomain) {
                return NextResponse.redirect(new URL("/agent/login", req.url));
            }
            return NextResponse.next();
        }

        // Agent API routes
        if (pathname.startsWith("/api/agent")) {
            if (!agentPayload || agentPayload.userType !== "agent" || agentPayload.subdomain !== subdomain) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            return NextResponse.next();
        }

        // Contact KYC pages on agent subdomain — require contact session
        if (pathname === "/login") return NextResponse.next();

        const contactPayload = await getPayload(req, "contact");
        if (!contactPayload || contactPayload.userType !== "contact" || contactPayload.subdomain !== subdomain) {
            return NextResponse.redirect(new URL("/login", req.url));
        }

        // Also protect contact-facing API routes
        if (pathname.startsWith("/api/verify") || pathname.startsWith("/api/user") || pathname.startsWith("/api/upload") || pathname.startsWith("/api/agreement/template")) {
            if (!contactPayload || contactPayload.subdomain !== subdomain) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }

        return NextResponse.next();
    }

    // ── Main domain (no subdomain) ────────────────────────────────────────────
    // On the main domain, contact KYC is gated behind login
    if (pathname === "/login") return NextResponse.next();

    if (
        pathname === "/" ||
        pathname.startsWith("/api/verify") ||
        pathname.startsWith("/api/user") ||
        pathname.startsWith("/api/upload") ||
        pathname.startsWith("/api/agreement/template")
    ) {
        const contactPayload = await getPayload(req, "contact");
        if (!contactPayload || contactPayload.userType !== "contact") {
            if (pathname.startsWith("/api/")) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            return NextResponse.redirect(new URL("/login", req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|public).*)",
    ],
};
