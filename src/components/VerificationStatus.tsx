"use client";

import React from "react";
import { VerificationStatus as VerStatus } from "@/lib/types";

interface VerificationStatusProps {
    status: VerStatus | null;
    firstName: string;
    onRetry: () => void;
    onRefresh: () => void;
}

const COMPLETED_STEPS = [
    { label: "Personal Details", desc: "Information verified" },
    { label: "Identity & Selfie", desc: "Document + liveness passed" },
    { label: "Proof of Address", desc: "Address confirmed" },
    { label: "Bank Statement", desc: "Statement reviewed" },
    { label: "Agreement", desc: "Signed document received" },
];

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function RefreshIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
    );
}

function ArrowRightIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </svg>
    );
}

/* ── GREEN: Verified ────────────────────────────────────────────────── */
function SuccessState({ firstName }: { firstName: string }) {
    return (
        <div className="space-y-6">
            {/* Hero */}
            <div className="text-center py-6">
                <div className="relative inline-flex mb-5">
                    <div className="w-20 h-20 rounded-full bg-gradient-success flex items-center justify-center shadow-lg">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}
                            strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-kyc-success-light border-2 border-white flex items-center justify-center">
                        <CheckIcon className="w-3 h-3 text-kyc-success" />
                    </div>
                </div>
                <h2 className="text-xl font-bold text-kyc-text">Identity Verified</h2>
                <p className="text-sm text-kyc-muted mt-1.5 max-w-xs mx-auto">
                    Congratulations, <span className="font-semibold text-kyc-text">{firstName}</span>! Your identity has been successfully verified.
                </p>
            </div>

            {/* Completion checklist */}
            <div className="border border-kyc-success/20 bg-kyc-success-light/30 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-kyc-success uppercase tracking-wider mb-3">
                    All Steps Completed
                </p>
                {COMPLETED_STEPS.map((s) => (
                    <div key={s.label} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-kyc-success flex items-center justify-center flex-shrink-0 shadow-sm">
                            <CheckIcon className="w-3 h-3 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-kyc-text leading-tight">{s.label}</p>
                            <p className="text-xs text-kyc-muted">{s.desc}</p>
                        </div>
                        <span className="text-xs font-semibold text-kyc-success bg-kyc-success-light px-2 py-0.5 rounded-full flex-shrink-0">
                            Done
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Processing / Pending ────────────────────────────────────────────── */
function ProcessingState({ status }: { status: "processing" | "pending" }) {
    const isPending = status === "pending";
    return (
        <div className="text-center space-y-5">
            <div className="py-6">
                <div className="w-20 h-20 rounded-full bg-kyc-primary-subtle border-4 border-kyc-primary/20 flex items-center justify-center mx-auto mb-5">
                    {isPending ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
                            strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-kyc-primary">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    ) : (
                        <div className="w-10 h-10 border-3 border-kyc-primary/30 border-t-kyc-primary rounded-full animate-spin" />
                    )}
                </div>
                <h2 className="text-xl font-bold text-kyc-text">
                    {isPending ? "Awaiting Review" : "Under Review"}
                </h2>
                <p className="text-sm text-kyc-muted mt-2 max-w-sm mx-auto">
                    {isPending
                        ? "Your verification has been submitted and is awaiting review by our team."
                        : "Our team is currently reviewing your submitted documents. This usually takes a few minutes."}
                </p>
            </div>

            <div className="flex items-center justify-center gap-6 py-4 border-t border-b border-kyc-border">
                {["Encrypted", "Secure", "Private"].map((label) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs text-kyc-muted">
                        <span className="w-1.5 h-1.5 rounded-full bg-kyc-success" />
                        {label}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── RED: Failed ─────────────────────────────────────────────────────── */
function FailedState({ firstName }: { firstName: string }) {
    return (
        <div className="text-center py-6 space-y-4">
            <div className="w-20 h-20 rounded-full bg-kyc-danger-light flex items-center justify-center mx-auto mb-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-kyc-danger">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
            </div>
            <h2 className="text-xl font-bold text-kyc-text">Verification Not Approved</h2>
            <p className="text-sm text-kyc-muted max-w-xs mx-auto">
                We were unable to verify your identity, {firstName}. Please review your documents and try again.
            </p>
            <div className="p-3.5 bg-kyc-warning-light border border-kyc-warning/30 rounded-xl text-left mt-2">
                <p className="text-xs font-semibold text-kyc-warning mb-1">Common reasons for rejection:</p>
                <ul className="text-xs text-kyc-muted space-y-0.5">
                    <li>• Document image was blurry or poorly lit</li>
                    <li>• Document was expired or incomplete</li>
                    <li>• Information did not match records</li>
                </ul>
            </div>
        </div>
    );
}

/* ── RETRY ───────────────────────────────────────────────────────────── */
function RetryState() {
    return (
        <div className="text-center py-6 space-y-4">
            <div className="w-20 h-20 rounded-full bg-kyc-warning-light flex items-center justify-center mx-auto mb-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-kyc-warning">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
            </div>
            <h2 className="text-xl font-bold text-kyc-text">Retry Required</h2>
            <p className="text-sm text-kyc-muted max-w-xs mx-auto">
                Some documents need to be resubmitted. Please restart the verification process.
            </p>
        </div>
    );
}

/* ── Main component ──────────────────────────────────────────────────── */
export default function VerificationStatus({
    status, firstName, onRetry, onRefresh,
}: VerificationStatusProps) {
    if (!status) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-kyc-muted mb-4">No verification record found.</p>
                <button onClick={onRefresh} className="btn-primary max-w-xs">
                    Start Verification
                    <ArrowRightIcon />
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {status === "GREEN" && <SuccessState firstName={firstName} />}
            {(status === "processing" || status === "pending") && <ProcessingState status={status} />}
            {status === "RED" && <FailedState firstName={firstName} />}
            {status === "RETRY" && <RetryState />}

            {/* Action buttons */}
            <div className="space-y-3 pt-2">
                {(status === "RED" || status === "RETRY") && (
                    <button onClick={onRetry} className="btn-primary">
                        <RefreshIcon className="w-4 h-4" />
                        Retry Verification
                    </button>
                )}

                {(status === "processing" || status === "pending") && (
                    <button onClick={onRefresh} className="btn-secondary">
                        <RefreshIcon className="w-4 h-4" />
                        Refresh Status
                    </button>
                )}

                {status === "GREEN" && (
                    <button onClick={onRefresh} className="btn-secondary">
                        <RefreshIcon className="w-4 h-4" />
                        Refresh
                    </button>
                )}
            </div>
        </div>
    );
}
