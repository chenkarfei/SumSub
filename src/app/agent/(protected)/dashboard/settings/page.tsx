"use client";

import { useState } from "react";

function ChangePasswordCard() {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null); setSuccess(false);
        if (next !== confirm) { setError("New passwords do not match."); return; }
        if (next.length < 8) { setError("New password must be at least 8 characters."); return; }
        setLoading(true);
        try {
            const res = await fetch("/api/agent/profile/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword: current, newPassword: next }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? "Failed to update password."); return; }
            setSuccess(true);
            setCurrent(""); setNext(""); setConfirm("");
        } catch { setError("Network error."); } finally { setLoading(false); }
    };

    return (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Change Password</h2>
            {success && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">Password updated successfully.</div>}
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Current Password</label>
                    <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required className="field-input w-full" placeholder="••••••••" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">New Password</label>
                    <input type="password" value={next} onChange={e => setNext(e.target.value)} required minLength={8} className="field-input w-full" placeholder="Min. 8 characters" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Confirm New Password</label>
                    <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="field-input w-full" placeholder="••••••••" />
                </div>
                <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-gradient-btn text-white text-sm font-semibold rounded-xl shadow-card-md hover:shadow-premium active:scale-[0.985] transition-all duration-200 disabled:opacity-40">
                    {loading ? "Updating…" : "Update Password"}
                </button>
            </form>
        </div>
    );
}

export default function AgentSettingsPage() {
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500 text-sm mt-0.5">Manage your account settings</p>
            </div>
            <div className="max-w-md">
                <ChangePasswordCard />
            </div>
        </div>
    );
}
