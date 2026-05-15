"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface KycVerificationProps {
    accessToken: string;
    applicantId: string;
    userId: string;
    onComplete: (status: "GREEN" | "RED" | "processing") => void;
    onError: (error: string) => void;
}

declare global {
    interface Window { snsWebSdk?: any; }
}

function ShieldCheckIcon({ className = "w-6 h-6" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
            strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

function CheckCircleIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
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

function AlertIcon({ className = "w-6 h-6" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

export default function KycVerification({
    accessToken, userId, onComplete, onError,
}: KycVerificationProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [canContinue, setCanContinue] = useState(false);
    const [continueStatus, setContinueStatus] = useState<"GREEN" | "RED" | "processing">("processing");
    const initializedRef = useRef(false);

    const initWebSDK = useCallback(() => {
        if (!window.snsWebSdk || !accessToken) return;
        try {
            const snsWebSdkInstance = window.snsWebSdk
                .init(
                    accessToken,
                    async () => {
                        const response = await fetch("/api/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: userId }),
                        });
                        const data = await response.json();
                        return data.accessToken;
                    }
                )
                .withConf({ lang: "en" })
                .on("idCheck.onApplicantLoaded", () => {
                    setIsLoading(false);
                })
                .on("idCheck.onApplicantStatusChanged", (payload: any) => {
                    const reviewStatus = payload?.reviewStatus;
                    if (reviewStatus && reviewStatus !== "init") {
                        const answer = payload?.reviewResult?.reviewAnswer;
                        const status: "GREEN" | "RED" | "processing" =
                            reviewStatus === "completed"
                                ? answer === "GREEN" ? "GREEN" : "RED"
                                : "processing";
                        setContinueStatus(status);
                        setCanContinue(true);
                    }
                })
                .on("idCheck.onError", (_error: any) => {
                    onError("Verification error occurred. Please try again.");
                })
                .build();

            snsWebSdkInstance.launch("#sumsub-websdk-container");
        } catch {
            setLoadError("Failed to initialize verification. Please refresh the page.");
        }
    }, [accessToken, userId, onError]);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const SCRIPT_URL = "https://static.sumsub.com/idensic/static/sns-websdk-builder.js";

        if (window.snsWebSdk) { initWebSDK(); return; }

        const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
        if (existingScript) { existingScript.addEventListener("load", initWebSDK); return; }

        const script = document.createElement("script");
        script.src = SCRIPT_URL;
        script.async = true;
        script.onload = () => initWebSDK();
        script.onerror = () => setLoadError("Connection to verification server failed. Please check your network.");
        document.head.appendChild(script);

        return () => {
            if (window.snsWebSdk && typeof window.snsWebSdk.destroy === "function") {
                try { window.snsWebSdk.destroy(); } catch { /* ignore */ }
            }
        };
    }, [initWebSDK]);

    /* ── Error state ─────────────────────────────────────────── */
    if (loadError) {
        return (
            <div className="premium-card text-center py-10">
                <div className="w-14 h-14 rounded-2xl bg-kyc-danger-light flex items-center justify-center mx-auto mb-4">
                    <AlertIcon className="w-7 h-7 text-kyc-danger" />
                </div>
                <h3 className="font-bold text-kyc-text mb-2">Connection Failed</h3>
                <p className="text-sm text-kyc-muted mb-6 max-w-xs mx-auto">{loadError}</p>
                <button onClick={() => window.location.reload()} className="btn-primary max-w-xs mx-auto">
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            {/* Loading banner */}
            {isLoading && (
                <div className="premium-card flex flex-col items-center py-12 text-center animate-fade-in">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-btn flex items-center justify-center mb-5 shadow-premium">
                        <ShieldCheckIcon className="w-8 h-8 text-white" />
                    </div>
                    <div className="w-7 h-7 border-2 border-kyc-border border-t-kyc-primary rounded-full animate-spin mb-4" />
                    <p className="font-semibold text-kyc-text">Initialising Secure Session</p>
                    <p className="text-sm text-kyc-muted mt-1.5 max-w-xs">
                        Setting up end-to-end encrypted identity verification
                    </p>
                    <div className="flex items-center gap-4 mt-6">
                        {["Encrypted", "Secure", "Verified"].map((label) => (
                            <div key={label} className="flex items-center gap-1.5 text-xs text-kyc-muted">
                                <span className="w-1.5 h-1.5 rounded-full bg-kyc-success inline-block" />
                                {label}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sumsub WebSDK container */}
            <div
                id="sumsub-websdk-container"
                className={`w-full bg-white rounded-2xl overflow-hidden border border-kyc-border shadow-card-md
                    transition-all duration-500
                    ${isLoading ? "opacity-0 h-0 pointer-events-none" : "opacity-100 min-h-[680px]"}`}
            />

            {/* Continue card — shown after documents submitted */}
            {canContinue && (
                <div className="premium-card animate-slide-up">
                    <div className="flex items-start gap-4 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-kyc-success-light flex items-center justify-center flex-shrink-0">
                            <CheckCircleIcon className="w-5 h-5 text-kyc-success" />
                        </div>
                        <div className="pt-0.5">
                            <p className="font-semibold text-kyc-text leading-snug">Documents Submitted</p>
                            <p className="text-sm text-kyc-muted mt-1">
                                Your identity documents have been submitted successfully. Continue to upload your remaining verification documents.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => onComplete(continueStatus)}
                        className="btn-primary"
                    >
                        Continue to Next Step
                        <ArrowRightIcon />
                    </button>
                </div>
            )}
        </div>
    );
}
