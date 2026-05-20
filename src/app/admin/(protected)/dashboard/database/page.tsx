"use client";

import { useState, useEffect, useCallback } from "react";

const TABLES = [
    { key: "agents", label: "Agents" },
    { key: "contacts", label: "Contacts" },
    { key: "verification_records", label: "Verification Records" },
    { key: "sessions", label: "Sessions" },
    { key: "audit_logs", label: "Audit Logs" },
] as const;

type TableKey = typeof TABLES[number]["key"];

interface TableResult {
    rows: Record<string, unknown>[];
    total: number;
    page: number;
    pages: number;
    pageSize: number;
}

function formatValue(v: unknown): string {
    if (v === null || v === undefined) return "—";
    if (typeof v === "string" && v.length > 80) return v.slice(0, 80) + "…";
    if (typeof v === "string") return v;
    return JSON.stringify(v);
}

export default function AdminDatabasePage() {
    const [activeTable, setActiveTable] = useState<TableKey>("agents");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [result, setResult] = useState<TableResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (table: TableKey, p: number, q: string) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ table, page: String(p) });
            if (q) params.set("search", q);
            const res = await fetch(`/api/admin/db?${params}`);
            if (!res.ok) {
                const d = await res.json();
                setError(d.error ?? "Failed to load data");
                setResult(null);
            } else {
                setResult(await res.json());
            }
        } catch {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(activeTable, page, search);
    }, [activeTable, page, fetchData]);

    const handleTableChange = (t: TableKey) => {
        setActiveTable(t);
        setSearch("");
        setPage(1);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchData(activeTable, 1, search);
    };

    const columns = result?.rows.length ? Object.keys(result.rows[0]) : [];

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-xl font-bold text-slate-900">Database Viewer</h1>
                <p className="text-slate-500 text-sm mt-0.5">Read-only view of all database tables. Passwords are never shown.</p>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
                {TABLES.map(t => (
                    <button
                        key={t.key}
                        onClick={() => handleTableChange(t.key)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            activeTable === t.key
                                ? "bg-gradient-btn text-white shadow-sm"
                                : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="field-input flex-1 max-w-sm"
                />
                <button type="submit" className="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors shadow-sm">
                    Search
                </button>
                {search && (
                    <button type="button" onClick={() => { setSearch(""); fetchData(activeTable, 1, ""); setPage(1); }} className="px-3 py-2 text-slate-500 hover:text-slate-900 text-sm transition-colors">
                        Clear
                    </button>
                )}
            </form>

            <div className="flex items-center justify-between mb-2 text-xs text-slate-500">
                <span>{loading ? "Loading…" : result ? `${result.total} rows total · Page ${result.page} of ${result.pages}` : ""}</span>
                <button onClick={() => fetchData(activeTable, page, search)} className="hover:text-slate-900 transition-colors">↻ Refresh</button>
            </div>

            {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

            {result && !loading && (
                <>
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-x-auto">
                        {result.rows.length === 0 ? (
                            <div className="py-10 text-center text-slate-500 text-sm">No rows found.</div>
                        ) : (
                            <table className="w-full text-xs min-w-max">
                                <thead>
                                    <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wide bg-slate-50">
                                        {columns.map(col => (
                                            <th key={col} className="text-left px-3 py-2.5 font-medium whitespace-nowrap">
                                                {col.replace(/_/g, " ")}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {result.rows.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            {columns.map(col => (
                                                <td key={col} className="px-3 py-2 text-slate-700 font-mono whitespace-nowrap max-w-xs overflow-hidden text-ellipsis" title={String(row[col] ?? "")}>
                                                    {formatValue(row[col])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    {result.pages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-40 rounded-lg text-slate-600 transition-colors shadow-sm">← Prev</button>
                            <span className="text-sm text-slate-500">{page} / {result.pages}</span>
                            <button disabled={page >= result.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-40 rounded-lg text-slate-600 transition-colors shadow-sm">Next →</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
