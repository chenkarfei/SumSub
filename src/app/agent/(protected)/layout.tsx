import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionJwt, cookieName } from "@/lib/auth";
import { getSession } from "@/lib/db-sessions";
import { getAgentById } from "@/lib/db-agents";
import AgentNavLink from "@/components/agent/NavLink";

const ContactsIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const SettingsIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" />
    </svg>
);

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = cookies();
    const token = cookieStore.get(cookieName("agent"))?.value;

    if (!token) redirect("/agent/login");

    const payload = await verifySessionJwt(token);
    if (!payload || payload.userType !== "agent") redirect("/agent/login");

    const dbSession = getSession(payload.sessionId);
    if (!dbSession) redirect("/agent/login");

    const agent = getAgentById(payload.userId);
    if (!agent || !agent.is_active) redirect("/agent/login");

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="w-56 shrink-0 flex flex-col fixed inset-y-0 left-0 z-20 bg-gradient-brand overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-white/[0.03] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white/[0.03] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <div className="relative flex flex-col h-full px-5 py-6">
                    {/* Brand */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-lg">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-white text-sm leading-tight truncate">{agent.name}</p>
                            <p className="text-xs text-white/45 mt-0.5 font-mono">{agent.subdomain}</p>
                        </div>
                    </div>

                    {/* Nav */}
                    <nav className="flex-1 space-y-1">
                        <AgentNavLink href="/agent/dashboard" label="Contacts" exact icon={<ContactsIcon />} />
                        <AgentNavLink href="/agent/dashboard/settings" label="Settings" exact icon={<SettingsIcon />} />
                    </nav>

                    {/* Footer */}
                    <div className="border-t border-white/10 pt-4">
                        <form action="/api/auth/agent/logout" method="POST">
                            <button
                                type="submit"
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/55 hover:text-white hover:bg-white/[0.08] transition-colors"
                            >
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Sign out
                            </button>
                        </form>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 ml-56 p-6 min-w-0">
                {children}
            </main>
        </div>
    );
}
