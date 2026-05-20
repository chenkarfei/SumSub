import { getAllAgents, getAgentContactStats } from "@/lib/db-agents";
import AgentsTable from "@/components/admin/AgentsTable";
import CreateAgentModal from "@/components/admin/CreateAgentModal";

export default async function AdminDashboardPage() {
    const agents = getAllAgents();
    const agentRows = agents.map(agent => {
        const stats = getAgentContactStats(agent.id);
        return {
            id: agent.id,
            name: agent.name,
            email: agent.email,
            subdomain: agent.subdomain,
            isActive: !!agent.is_active,
            totalContacts: stats.total,
            verifiedContacts: stats.verified,
        };
    });

    return (
        <div>
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Agents</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Manage all agents and their contacts</p>
                </div>
                <CreateAgentModal />
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <AgentsTable agents={agentRows} />
            </div>
        </div>
    );
}
