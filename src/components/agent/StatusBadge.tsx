"use client";

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
    GREEN: { label: "Verified", classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    RED: { label: "Failed", classes: "bg-red-500/15 text-red-400 border-red-500/30" },
    RETRY: { label: "Retry", classes: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    processing: { label: "Processing", classes: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    pending: { label: "Pending", classes: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
};

export default function StatusBadge({ status }: { status: string | null | undefined }) {
    const cfg = STATUS_CONFIG[status ?? ""] ?? { label: "No KYC", classes: "bg-slate-800 text-slate-500 border-slate-700" };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.classes}`}>
            {cfg.label}
        </span>
    );
}
