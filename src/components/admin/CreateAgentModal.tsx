"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FormState {
    name: string;
    email: string;
    subdomain: string;
    username: string;
    password: string;
}

const EMPTY: FormState = { name: "", email: "", subdomain: "", username: "", password: "" };

export default function CreateAgentModal() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<FormState>(EMPTY);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    const handleOpen = () => { setForm(EMPTY); setError(null); setOpen(true); };
    const handleClose = () => { if (!loading) setOpen(false); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/agents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? "Failed to create agent."); return; }
            setOpen(false);
            router.refresh();
        } catch {
            setError("Network error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button onClick={handleOpen} className="px-4 py-2 bg-gradient-btn text-white text-sm font-semibold rounded-xl shadow-card-md hover:shadow-premium active:scale-[0.985] transition-all duration-200">
                + Add Agent
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
                    <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h2 className="text-lg font-bold text-white mb-5">Add New Agent</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
                                <input value={form.name} onChange={set("name")} required placeholder="Acme Corp" className="field-input w-full" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                                <input type="email" value={form.email} onChange={set("email")} required placeholder="agent@example.com" className="field-input w-full" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Subdomain</label>
                                <input value={form.subdomain} onChange={set("subdomain")} required placeholder="acme" pattern="[a-z0-9\-]+" title="Lowercase letters, numbers, hyphens only" className="field-input w-full" />
                                <p className="text-xs text-slate-500 mt-1">e.g. &quot;acme&quot; → acme.yourdomain.com</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Username</label>
                                <input value={form.username} onChange={set("username")} required placeholder="acme_admin" className="field-input w-full" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                                <input type="password" value={form.password} onChange={set("password")} required minLength={8} placeholder="Min. 8 characters" className="field-input w-full" />
                            </div>

                            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={handleClose} disabled={loading} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors disabled:opacity-40">
                                    Cancel
                                </button>
                                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-gradient-btn text-white text-sm font-semibold rounded-xl shadow-card-md hover:shadow-premium active:scale-[0.985] transition-all duration-200 disabled:opacity-40">
                                    {loading ? "Creating…" : "Create Agent"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
