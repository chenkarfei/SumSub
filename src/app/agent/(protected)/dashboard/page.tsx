import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySessionJwt, cookieName } from "@/lib/auth";
import { getAgentById, getAgentContactStats } from "@/lib/db-agents";
import { getContactsByAgent } from "@/lib/db-contacts";
import { getVerificationsByAgentId } from "@/lib/db";
import CreateContactModal from "@/components/agent/CreateContactModal";
import ContactsTable from "@/components/agent/ContactsTable";

export default async function AgentDashboardPage({
    searchParams,
}: {
    searchParams: { search?: string; filter?: string };
}) {
    const cookieStore = cookies();
    const token = cookieStore.get(cookieName("agent"))?.value;
    if (!token) redirect("/agent/login");

    const payload = await verifySessionJwt(token);
    if (!payload || payload.userType !== "agent") redirect("/agent/login");

    const agent = getAgentById(payload.userId);
    if (!agent) redirect("/agent/login");

    const stats = getAgentContactStats(agent.id);
    const contacts = getContactsByAgent(agent.id, searchParams.search);
    const verifications = getVerificationsByAgentId(agent.id);
    const vrMap = new Map(verifications.map(v => [v.contact_id as string, v]));

    const filterStatus = searchParams.filter;
    const filtered = filterStatus
        ? contacts.filter(c => {
              const v = vrMap.get(c.id);
              return v ? v.status === filterStatus : filterStatus === "none";
          })
        : contacts;

    const contactRows = filtered.map(contact => {
        const vr = vrMap.get(contact.id);
        return {
            id: contact.id,
            name: contact.name ?? null,
            email: contact.email,
            isActive: !!contact.is_active,
            status: vr ? String(vr.status) : null,
            updatedAt: vr ? String(vr.updated_at) : contact.updated_at,
        };
    });

    return (
        <div>
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Contacts</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Manage and monitor your KYC contacts</p>
                </div>
                <CreateContactModal />
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                    { label: "Total", value: stats.total, color: "text-slate-700" },
                    { label: "Verified", value: stats.verified, color: "text-emerald-600" },
                    { label: "Pending", value: stats.pending, color: "text-blue-600" },
                    { label: "Failed", value: stats.failed, color: "text-red-600" },
                ].map(card => (
                    <div key={card.label} className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
                        <p className="text-slate-500 text-xs font-medium">{card.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Search + filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <form className="flex-1">
                    <input
                        type="text"
                        name="search"
                        defaultValue={searchParams.search}
                        placeholder="Search by name or email…"
                        className="field-input w-full"
                    />
                </form>
                <div className="flex gap-2">
                    {["", "GREEN", "processing", "pending", "RED"].map(s => (
                        <Link
                            key={s}
                            href={s ? `?filter=${s}` : "?"}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                filterStatus === s || (!filterStatus && !s)
                                    ? "bg-gradient-btn text-white shadow-sm"
                                    : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm"
                            }`}
                        >
                            {s || "All"}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Contacts table */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <ContactsTable contacts={contactRows} />
            </div>
        </div>
    );
}
