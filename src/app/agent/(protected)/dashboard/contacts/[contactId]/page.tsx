import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { verifySessionJwt, cookieName } from "@/lib/auth";
import { getAgentById } from "@/lib/db-agents";
import { getContactById } from "@/lib/db-contacts";
import { getVerificationByContactId, formatVerificationRecord } from "@/lib/db";
import { getAuditLogsByContact, countAuditLogsByContact } from "@/lib/db-audit";
import StatusBadge from "@/components/agent/StatusBadge";
import ActivityLog from "@/components/agent/ActivityLog";
import ResetContactPasswordModal from "@/components/agent/ResetContactPasswordModal";
import RemoveContactButton from "@/components/agent/RemoveContactButton";

const STEP_LABELS = [
    { key: "personal", label: "Personal Details" },
    { key: "identity", label: "Identity & Selfie" },
    { key: "proof_of_address", label: "Proof of Address" },
    { key: "bank_statement", label: "Bank Statement" },
    { key: "agreement", label: "Agreement" },
];

export default async function ContactDetailPage({
    params,
}: {
    params: { contactId: string };
}) {
    const cookieStore = cookies();
    const token = cookieStore.get(cookieName("agent"))?.value;
    if (!token) redirect("/agent/login");

    const payload = await verifySessionJwt(token);
    if (!payload || payload.userType !== "agent") redirect("/agent/login");

    const agent = getAgentById(payload.userId);
    if (!agent) redirect("/agent/login");

    const contact = getContactById(params.contactId);
    if (!contact || contact.agent_id !== agent.id) notFound();

    const record = getVerificationByContactId(contact.id);
    const verification = record ? formatVerificationRecord(record) : null;

    const initialLogs = getAuditLogsByContact(contact.id, 50, 0).map(log => ({
        id: log.id,
        eventType: log.event_type,
        actorType: log.actor_type,
        eventData: log.event_data ? JSON.parse(log.event_data) : null,
        ipAddress: log.ip_address,
        createdAt: log.created_at,
    }));
    const totalLogs = countAuditLogsByContact(contact.id);

    const stepsDone = {
        personal: !!verification,
        identity: !!(verification?.applicantId),
        proof_of_address: !!verification?.proofOfAddressPath,
        bank_statement: !!verification?.bankStatementPath,
        agreement: !!verification?.agreementPath,
    } as Record<string, boolean>;

    return (
        <div>
            <div className="mb-6">
                <Link href="/agent/dashboard" className="text-slate-400 hover:text-white text-sm flex items-center gap-1 mb-3">
                    ← Back to Contacts
                </Link>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-white">{contact.name || contact.email}</h1>
                        {contact.name && <p className="text-slate-400 text-sm">{contact.email}</p>}
                    </div>
                    <StatusBadge status={verification?.status} />
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                    {/* KYC Progress */}
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-slate-300 mb-3">KYC Progress</h3>
                        <div className="space-y-2">
                            {STEP_LABELS.map(step => (
                                <div key={step.key} className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                        stepsDone[step.key]
                                            ? "bg-emerald-500/20 border border-emerald-500/40"
                                            : "bg-slate-700/50 border border-slate-600/40"
                                    }`}>
                                        {stepsDone[step.key] ? (
                                            <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <div className="w-2 h-2 rounded-full bg-slate-600" />
                                        )}
                                    </div>
                                    <span className={`text-sm ${stepsDone[step.key] ? "text-white" : "text-slate-500"}`}>
                                        {step.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Uploaded Documents */}
                    {verification && (
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3">Uploaded Documents</h3>
                            <div className="space-y-2">
                                {[
                                    { label: "Proof of Address", path: verification.proofOfAddressPath, ts: verification.proofOfAddressUploadedAt },
                                    { label: "Bank Statement", path: verification.bankStatementPath, ts: verification.bankStatementUploadedAt },
                                    { label: "Signed Agreement", path: verification.agreementPath, ts: verification.agreementUploadedAt },
                                ].map(doc => (
                                    <div key={doc.label} className="flex items-center justify-between py-1.5 border-b border-slate-700/30 last:border-0">
                                        <div>
                                            <p className={`text-sm ${doc.path ? "text-white" : "text-slate-500"}`}>{doc.label}</p>
                                            {doc.ts && <p className="text-xs text-slate-500">{new Date(doc.ts).toLocaleString()}</p>}
                                        </div>
                                        {doc.path ? (
                                            <span className="text-xs text-slate-500">Uploaded ✓</span>
                                        ) : (
                                            <span className="text-xs text-slate-600">Not uploaded</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Activity Log */}
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                        <ActivityLog
                            contactId={contact.id}
                            initialLogs={initialLogs}
                            initialTotal={totalLogs}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-slate-300 mb-3">Contact Details</h3>
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-slate-400">Email</dt>
                                <dd className="text-white text-right max-w-[60%] truncate">{contact.email}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-slate-400">Created</dt>
                                <dd className="text-white">{new Date(contact.created_at).toLocaleDateString()}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-slate-400">Status</dt>
                                <dd className={contact.is_active ? "text-emerald-400" : "text-red-400"}>
                                    {contact.is_active ? "Active" : "Inactive"}
                                </dd>
                            </div>
                        </dl>
                        <div className="mt-4 pt-4 border-t border-slate-700/50 flex gap-2">
                            <ResetContactPasswordModal contactId={contact.id} contactName={contact.name || contact.email} />
                            <RemoveContactButton contactId={contact.id} contactName={contact.name || contact.email} />
                        </div>
                    </div>

                    {verification && (
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3">KYC Details</h3>
                            <dl className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-slate-400">Sumsub ID</dt>
                                    <dd className="text-white font-mono text-xs max-w-[60%] truncate" title={verification.applicantId ?? undefined}>
                                        {verification.applicantId || "—"}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-slate-400">KYC Status</dt>
                                    <dd><StatusBadge status={verification.status} /></dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-slate-400">Nationality</dt>
                                    <dd className="text-white">{verification.nationality || "—"}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-slate-400">Started</dt>
                                    <dd className="text-white">{new Date(verification.createdAt).toLocaleDateString()}</dd>
                                </div>
                            </dl>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
