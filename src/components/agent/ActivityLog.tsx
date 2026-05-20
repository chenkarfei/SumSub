"use client";

import { useState, useCallback } from "react";

interface LogEntry {
    id: string;
    eventType: string;
    actorType: string;
    eventData: Record<string, unknown> | null;
    ipAddress: string | null;
    createdAt: string;
}

const EVENT_META: Record<string, { icon: string; label: string; color: string }> = {
    "contact.created":              { icon: "🆕", label: "Contact created", color: "text-slate-300" },
    "contact.login":                { icon: "👤", label: "Contact signed in", color: "text-slate-300" },
    "contact.logout":               { icon: "👋", label: "Contact signed out", color: "text-slate-400" },
    "contact.kyc.step_started":     { icon: "🚀", label: "KYC step started", color: "text-blue-400" },
    "contact.kyc.step_completed":   { icon: "✅", label: "Step completed", color: "text-emerald-400" },
    "contact.kyc.doc_uploaded":     { icon: "📄", label: "Document uploaded", color: "text-emerald-400" },
    "contact.kyc.upload_failed":    { icon: "⚠️", label: "Upload failed", color: "text-red-400" },
    "contact.kyc.sumsub_result":    { icon: "🔍", label: "Sumsub result", color: "text-blue-400" },
    "contact.kyc.completed":        { icon: "🎉", label: "KYC fully completed", color: "text-emerald-400" },
    "agreement.downloaded":         { icon: "📥", label: "Agreement downloaded", color: "text-slate-300" },
    "agent.contact.created":        { icon: "➕", label: "Contact added by agent", color: "text-blue-400" },
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
}

function EventDetail({ entry }: { entry: LogEntry }) {
    const d = entry.eventData;
    if (!d) return null;
    const parts: string[] = [];
    if (d.documentType) parts.push(String(d.documentType).replace(/_/g, " "));
    if (d.fileName) parts.push(String(d.fileName));
    if (d.fileSize) parts.push(`${(Number(d.fileSize) / 1024).toFixed(1)} KB`);
    if (d.reason) parts.push(String(d.reason));
    if (d.reviewAnswer) parts.push(`result: ${d.reviewAnswer}`);
    if (d.step) parts.push(`step: ${d.step}`);
    if (d.message) parts.push(String(d.message));
    return parts.length ? <span className="text-slate-400 text-xs ml-1">— {parts.join(", ")}</span> : null;
}

interface Props {
    contactId: string;
    initialLogs: LogEntry[];
    initialTotal: number;
}

export default function ActivityLog({ contactId, initialLogs, initialTotal }: Props) {
    const [logs, setLogs] = useState(initialLogs);
    const [total, setTotal] = useState(initialTotal);
    const [offset, setOffset] = useState(initialLogs.length);
    const [loading, setLoading] = useState(false);

    const loadMore = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/agent/logs/${contactId}?limit=50&offset=${offset}`);
            const data = await res.json();
            setLogs(prev => [...prev, ...data.logs]);
            setTotal(data.total);
            setOffset(prev => prev + data.logs.length);
        } finally {
            setLoading(false);
        }
    }, [contactId, offset]);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/agent/logs/${contactId}?limit=50&offset=0`);
            const data = await res.json();
            setLogs(data.logs);
            setTotal(data.total);
            setOffset(data.logs.length);
        } finally {
            setLoading(false);
        }
    }, [contactId]);

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-300">Activity Log</h3>
                <button
                    onClick={refresh}
                    disabled={loading}
                    className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {logs.length === 0 ? (
                <p className="text-slate-500 text-sm">No activity yet.</p>
            ) : (
                <div className="space-y-1">
                    {logs.map(entry => {
                        const meta = EVENT_META[entry.eventType] ?? { icon: "•", label: entry.eventType, color: "text-slate-400" };
                        return (
                            <div key={entry.id} className="flex gap-3 py-2 border-b border-slate-800/60 last:border-0">
                                <span className="text-base leading-none mt-0.5 shrink-0">{meta.icon}</span>
                                <div className="min-w-0">
                                    <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
                                    <EventDetail entry={entry} />
                                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(entry.createdAt)}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {logs.length < total && (
                <button
                    onClick={loadMore}
                    disabled={loading}
                    className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                    {loading ? "Loading…" : `Load more (${total - logs.length} remaining)`}
                </button>
            )}
        </div>
    );
}
