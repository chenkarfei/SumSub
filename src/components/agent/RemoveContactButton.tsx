"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RemoveContactButton({ contactId, contactName }: { contactId: string; contactName: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/agent/contacts/${contactId}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? "Failed to remove contact."); return; }
            router.push("/agent/dashboard");
            router.refresh();
        } catch {
            setError("Network error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button onClick={() => setOpen(true)} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors border border-red-500/20">
                Remove Contact
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!loading) setOpen(false); }} />
                    <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="w-10 h-10 bg-red-500/15 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                        </div>
                        <h2 className="text-base font-bold text-white mb-1">Remove Contact</h2>
                        <p className="text-sm text-slate-400 mb-2">
                            Are you sure you want to remove <span className="text-white font-medium">{contactName}</span>?
                        </p>
                        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-5">
                            This will permanently delete the contact, their verification records, and all activity logs. This cannot be undone.
                        </p>

                        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

                        <div className="flex gap-3">
                            <button onClick={() => setOpen(false)} disabled={loading} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors disabled:opacity-40">
                                Cancel
                            </button>
                            <button onClick={handleDelete} disabled={loading} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40">
                                {loading ? "Removing…" : "Remove"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
