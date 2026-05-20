import { notFound } from "next/navigation";
import Link from "next/link";
import { getAgentById, getAgentContactStats } from "@/lib/db-agents";
import { getContactsByAgent } from "@/lib/db-contacts";
import { getVerificationsByAgentId } from "@/lib/db";
import StatusBadge from "@/components/agent/StatusBadge";
import ResetAgentPasswordModal from "@/components/admin/ResetAgentPasswordModal";
import RemoveAgentButton from "@/components/admin/RemoveAgentButton";
import ToggleAgentStatusButton from "@/components/admin/ToggleAgentStatusButton";

export default async function AdminAgentDetailPage({
    params,
}: {
    params: { agentId: string };
}) {
    const agent = getAgentById(params.agentId);
    if (!agent) notFound();

    const stats = getAgentContactStats(agent.id);
    const contacts = getContactsByAgent(agent.id);
    const verifications = getVerificationsByAgentId(agent.id);
    const vrMap = new Map(verifications.map(v => [v.contact_id as string, v]));

    return (
        <div>
            <div className="mb-6">
                <Link href="/admin/dashboard" className="text-slate-500 hover:text-slate-900 text-sm flex items-center gap-1 mb-3 transition-colors">
                    ← Back to Agents
                </Link>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{agent.name}</h1>
                        <p className="text-slate-500 text-sm font-mono">{agent.subdomain}</p>
                    </div>
                    <ToggleAgentStatusButton agentId={agent.id} isActive={!!agent.is_active} />
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                    { label: "Total Contacts", value: stats.total, color: "text-slate-700" },
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

            <div className="grid lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Agent Details</h3>
                    <dl className="space-y-2 text-sm">
                        {[
                            ["Email", agent.email],
                            ["Username", agent.username],
                            ["Subdomain", agent.subdomain],
                            ["Created", new Date(agent.created_at).toLocaleDateString()],
                        ].map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                                <dt className="text-slate-500">{k}</dt>
                                <dd className="text-slate-900 font-mono text-xs">{v}</dd>
                            </div>
                        ))}
                    </dl>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                        <ResetAgentPasswordModal agentId={agent.id} agentName={agent.name} />
                        <RemoveAgentButton agentId={agent.id} agentName={agent.name} />
                    </div>
                </div>
            </div>

            <h3 className="text-sm font-semibold text-slate-700 mb-3">All Contacts ({contacts.length})</h3>
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                {contacts.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-sm">No contacts under this agent.</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wide bg-slate-50">
                                <th className="text-left px-4 py-3 font-medium">Contact</th>
                                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">KYC Status</th>
                                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {contacts.map(contact => {
                                const vr = vrMap.get(contact.id);
                                return (
                                    <tr key={contact.id} className="hover:bg-slate-50 cursor-pointer transition-colors">
                                        <td className="px-4 py-3">
                                            <Link href={`/admin/dashboard/agents/${agent.id}/contacts/${contact.id}`} className="block">
                                                <p className="font-medium text-slate-900 hover:text-purple-700 transition-colors">{contact.name || "—"}</p>
                                                <p className="text-slate-500 text-xs">{contact.email}</p>
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <Link href={`/admin/dashboard/agents/${agent.id}/contacts/${contact.id}`} className="block">
                                                <StatusBadge status={vr ? String(vr.status) : null} />
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">
                                            <Link href={`/admin/dashboard/agents/${agent.id}/contacts/${contact.id}`} className="block">
                                                {new Date(contact.created_at).toLocaleDateString()}
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
