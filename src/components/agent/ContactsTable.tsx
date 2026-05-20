"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/agent/StatusBadge";

export type ContactRow = {
    id: string;
    name: string | null;
    email: string;
    isActive: boolean;
    status: string | null;
    updatedAt: string;
};

function BulkDeleteModal({
    contacts,
    onClose,
    onSuccess,
}: {
    contacts: ContactRow[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/agent/contacts/bulk-delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: contacts.map(c => c.id) }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? "Failed to remove contacts."); return; }
            onSuccess();
        } catch {
            setError("Network error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!loading) onClose(); }} />
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                <div className="w-10 h-10 bg-red-500/15 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                </div>
                <h2 className="text-base font-bold text-white mb-1">
                    Remove {contacts.length} Contact{contacts.length !== 1 ? "s" : ""}
                </h2>
                <p className="text-sm text-slate-400 mb-3">The following contacts will be permanently removed:</p>
                <ul className="mb-3 max-h-36 overflow-y-auto space-y-1">
                    {contacts.map(c => (
                        <li key={c.id} className="text-sm text-white font-medium truncate">
                            {c.name || c.email}{c.name && <span className="text-slate-400 font-normal"> ({c.email})</span>}
                        </li>
                    ))}
                </ul>
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-5">
                    All verification records and activity logs for these contacts will be permanently deleted. This cannot be undone.
                </p>
                {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
                <div className="flex gap-3">
                    <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors disabled:opacity-40">
                        Cancel
                    </button>
                    <button onClick={handleDelete} disabled={loading} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40">
                        {loading ? "Removing…" : "Remove All"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ContactsTable({ contacts }: { contacts: ContactRow[] }) {
    const router = useRouter();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [showModal, setShowModal] = useState(false);
    const headerCheckRef = useRef<HTMLInputElement>(null);

    const allSelected = contacts.length > 0 && selected.size === contacts.length;
    const someSelected = selected.size > 0 && !allSelected;

    if (headerCheckRef.current) {
        headerCheckRef.current.indeterminate = someSelected;
    }

    const toggleAll = useCallback(() => {
        setSelected(allSelected ? new Set() : new Set(contacts.map(c => c.id)));
    }, [allSelected, contacts]);

    const toggleOne = useCallback((id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    if (contacts.length === 0) {
        return <div className="py-12 text-center text-slate-500">No contacts found.</div>;
    }

    const selectedContacts = contacts.filter(c => selected.has(c.id));

    return (
        <>
            {selected.size > 0 && (
                <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 flex items-center justify-between">
                    <span className="text-sm text-red-600">
                        {selected.size} contact{selected.size !== 1 ? "s" : ""} selected
                    </span>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                        Remove Selected ({selected.size})
                    </button>
                </div>
            )}
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wide bg-slate-50">
                        <th className="px-4 py-3 w-10">
                            <input
                                ref={headerCheckRef}
                                type="checkbox"
                                checked={allSelected}
                                onChange={toggleAll}
                                className="rounded border-slate-300 bg-white text-kyc-primary focus:ring-kyc-primary/30 cursor-pointer"
                            />
                        </th>
                        <th className="text-left px-4 py-3 font-medium">Name / Email</th>
                        <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Status</th>
                        <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Last Activity</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {contacts.map(contact => (
                        <tr
                            key={contact.id}
                            onClick={() => router.push(`/agent/dashboard/contacts/${contact.id}`)}
                            className={`hover:bg-slate-50 transition-colors cursor-pointer ${selected.has(contact.id) ? "bg-red-50" : ""}`}
                        >
                            <td className="px-4 py-3 w-10" onClick={e => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={selected.has(contact.id)}
                                    onChange={() => toggleOne(contact.id)}
                                    className="rounded border-slate-300 bg-white text-kyc-primary focus:ring-kyc-primary/30 cursor-pointer"
                                />
                            </td>
                            <td className="px-4 py-3">
                                <p className="font-medium text-slate-900">{contact.name || "—"}</p>
                                <p className="text-slate-500 text-xs">{contact.email}</p>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                                <StatusBadge status={contact.status} />
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">
                                {new Date(contact.updatedAt).toLocaleDateString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {showModal && (
                <BulkDeleteModal
                    contacts={selectedContacts}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        setSelected(new Set());
                        router.refresh();
                    }}
                />
            )}
        </>
    );
}
