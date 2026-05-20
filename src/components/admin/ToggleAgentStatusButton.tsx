"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ToggleAgentStatusButton({
    agentId,
    isActive,
}: {
    agentId: string;
    isActive: boolean;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(isActive);

    const toggle = async () => {
        setLoading(true);
        const next = !active;
        setActive(next);
        try {
            const res = await fetch(`/api/admin/agents/${agentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: next }),
            });
            if (!res.ok) setActive(!next);
            else router.refresh();
        } catch {
            setActive(!next);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={toggle}
            disabled={loading}
            title={active ? "Click to deactivate" : "Click to activate"}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium tracking-wide transition-all disabled:opacity-50 cursor-pointer border ${
                active
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
            }`}
        >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
            {loading ? "…" : active ? "Active" : "Inactive"}
        </button>
    );
}
