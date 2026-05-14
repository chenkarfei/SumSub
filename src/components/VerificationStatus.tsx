"use client";

import React from "react";
import { VerificationStatus as VerStatus } from "@/lib/types";

interface VerificationStatusProps {
    status: VerStatus | null;
    firstName: string;
    onRetry: () => void;
    onRefresh: () => void;
}

const STATUS_CONFIG: Record<
    VerStatus,
    { label: string; icon: "pending" | "processing" | "GREEN" | "RED" | "RETRY"; color: string; bg: string }
> = {
    pending: {
        label: "Verification Pending",
        icon: "pending",
        color: "text-kyc-warning",
        bg: "bg-kyc-warning/10",
    },
    processing: {
        label: "Verification In Progress",
        icon: "processing",
        color: "text-kyc-primary",
        bg: "bg-kyc-primary/10",
    },
    GREEN: {
        label: "Verified Successfully",
        icon: "GREEN",
        color: "text-kyc-success",
        bg: "bg-kyc-success/10",
    },
    RED: {
        label: "Verification Failed",
        icon: "RED",
        color: "text-kyc-danger",
        bg: "bg-kyc-danger/10",
    },
    RETRY: {
        label: "Retry Required",
        icon: "RETRY",
        color: "text-kyc-warning",
        bg: "bg-kyc-warning/10",
    },
};

function StatusIcon({ status }: { status: VerStatus }) {
    switch (status) {
        case "GREEN":
            return (
                <svg className="w-10 h-10 text-kyc-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        case "RED":
            return (
                <svg className="w-10 h-10 text-kyc-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        case "processing":
            return (
                <div className="w-10 h-10 border-3 border-kyc-primary border-t-transparent rounded-full animate-spin" />
            );
        case "pending":
            return (
                <svg className="w-10 h-10 text-kyc-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        case "RETRY":
            return (
                <svg className="w-10 h-10 text-kyc-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            );
        default:
            return null;
    }
}

export default function VerificationStatus({
    status,
    firstName,
    onRetry,
    onRefresh,
}: VerificationStatusProps) {
    if (!status) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4">
                <p className="text-sm text-kyc-muted">No verification record found.</p>
                <button
                    onClick={onRefresh}
                    className="mt-4 min-h-tap px-6 py-3 bg-kyc-primary text-white font-semibold rounded-xl active:bg-kyc-primary-hover transition-colors"
                >
                    Start Verification
                </button>
            </div>
        );
    }

    const config = STATUS_CONFIG[status];

    return (
        <div className="w-full">
            {/* Status Card */}
            <div className={`${config.bg} rounded-2xl p-6 mb-6`}>
                <div className="flex flex-col items-center text-center">
                    <StatusIcon status={status} />
                    <h2 className={`text-lg font-bold mt-3 ${config.color}`}>
                        {config.label}
                    </h2>
                    <p className="text-sm text-kyc-muted mt-1">
                        {status === "GREEN" &&
                            `Thank you, ${firstName}. Your identity has been verified successfully.`}
                        {status === "RED" &&
                            `Sorry, ${firstName}. Your verification was not approved. You can try again.`}
                        {status === "processing" &&
                            "We are reviewing your documents. This usually takes a few minutes."}
                        {status === "pending" &&
                            "Your verification has not started yet. Please begin the process."}
                        {status === "RETRY" &&
                            "Some documents need to be resubmitted. Please try the verification again."}
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
                {(status === "RED" || status === "RETRY") && (
                    <button
                        onClick={onRetry}
                        className="w-full min-h-tap py-4 px-6 text-base font-bold text-white 
              bg-kyc-primary rounded-xl active:bg-kyc-primary-hover 
              transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Retry Verification
                    </button>
                )}

                <button
                    onClick={onRefresh}
                    className="w-full min-h-tap py-4 px-6 text-base font-semibold 
            text-kyc-primary bg-kyc-primary/5 border border-kyc-primary/20 rounded-xl
            active:bg-kyc-primary/10 transition-colors"
                >
                    Refresh Status
                </button>
            </div>

            {/* Verification Steps */}
            <div className="mt-6 bg-kyc-card rounded-xl border border-kyc-border p-4">
                <h3 className="text-sm font-semibold text-kyc-text mb-3">
                    Verification Steps
                </h3>
                <div className="space-y-3">
                    {[
                        { label: "Identity Document", step: "ID" },
                        { label: "Selfie / Liveness Check", step: "SELFIE" },
                        { label: "Proof of Address", step: "ADDRESS" },
                        { label: "Bank Statement", step: "BANK" },
                    ].map((item) => (
                        <div
                            key={item.step}
                            className="flex items-center justify-between"
                        >
                            <span className="text-sm text-kyc-muted">{item.label}</span>
                            <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${status === "GREEN"
                                        ? "bg-kyc-success/10 text-kyc-success"
                                        : status === "processing"
                                            ? "bg-kyc-primary/10 text-kyc-primary"
                                            : "bg-kyc-border text-kyc-muted"
                                    }`}
                            >
                                {status === "GREEN"
                                    ? "Completed"
                                    : status === "processing"
                                        ? "In Review"
                                        : "Pending"}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}