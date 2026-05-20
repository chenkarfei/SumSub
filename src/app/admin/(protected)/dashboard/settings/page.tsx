"use client";

import { useState, useRef } from "react";

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
            const res = await fetch("/api/admin/profile/password", {
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

function AgreementTemplateCard() {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true); setError(null); setSuccess(false);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch("/api/agreement/upload-template?global=true", { method: "POST", body: form });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? "Upload failed."); return; }
            setSuccess(true);
            setFile(null);
            if (inputRef.current) inputRef.current.value = "";
        } catch { setError("Network error."); } finally { setLoading(false); }
    };

    return (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-1">Global Agreement Template</h2>
            <p className="text-xs text-slate-500 mb-4">Upload the default PDF template that contacts will download, sign, and re-upload.</p>
            {success && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">Template uploaded successfully. Contacts will now be able to download it.</div>}
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">PDF File (max 20 MB)</label>
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={e => setFile(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer cursor-pointer border border-slate-200 rounded-lg p-2"
                    />
                </div>
                {file && <p className="text-xs text-slate-500">{file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
                <button onClick={handleUpload} disabled={!file || loading} className="px-4 py-2 bg-gradient-btn text-white text-sm font-semibold rounded-xl shadow-card-md hover:shadow-premium active:scale-[0.985] transition-all duration-200 disabled:opacity-40">
                    {loading ? "Uploading…" : "Upload Template"}
                </button>
            </div>
        </div>
    );
}

export default function AdminSettingsPage() {
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500 text-sm mt-0.5">Manage your account settings</p>
            </div>
            <div className="max-w-md space-y-4">
                <ChangePasswordCard />
                <AgreementTemplateCard />
            </div>
        </div>
    );
}
