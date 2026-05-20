"use client";

import { useState } from "react";

export default function ResetContactPasswordModal({ contactId, contactName }: { contactId: string; contactName: string }) {
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleOpen = () => { setPassword(""); setConfirm(""); setError(null); setSuccess(false); setOpen(true); };
    const handleClose = () => { if (!loading) setOpen(false); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password !== confirm) { setError("Passwords do not match."); return; }
        if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
        setLoading(true);
        try {
            const res = await fetch(`/api/agent/contacts/${contactId}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword: password }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? "Failed to reset password."); return; }
            setSuccess(true);
            setPassword(""); setConfirm("");
        } catch {
            setError("Network error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button onClick={handleOpen} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors">
                Reset Password
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
                    <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h2 className="text-base font-bold text-white mb-1">Reset Contact Password</h2>
                        <p className="text-xs text-slate-400 mb-5">Set a new password for <span className="text-white font-medium">{contactName}</span>.</p>

                        {success ? (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm mb-4">
                                Password reset successfully. Share the new password with the contact.
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">New Password</label>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="Min. 8 characters" className="field-input w-full" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Confirm Password</label>
                                    <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="••••••••" className="field-input w-full" />
                                </div>
                                {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={handleClose} disabled={loading} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors disabled:opacity-40">Cancel</button>
                                    <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-gradient-btn text-white text-sm font-semibold rounded-xl shadow-card-md hover:shadow-premium active:scale-[0.985] transition-all duration-200 disabled:opacity-50">
                                        {loading ? "Resetting…" : "Reset Password"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {success && (
                            <button onClick={handleClose} className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors">Close</button>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
