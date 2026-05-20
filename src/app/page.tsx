"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import UserInfoForm from "@/components/UserInfoForm";
import KycVerification from "@/components/KycVerification";
import ProofOfAddressUpload from "@/components/ProofOfAddressUpload";
import BankStatementUpload from "@/components/BankStatementUpload";
import AgreementUpload from "@/components/AgreementUpload";
import VerificationStatusComponent from "@/components/VerificationStatus";
import { UserInfo, VerificationStatus } from "@/lib/types";

type AppStep =
    | "form"
    | "verification"
    | "proof-of-address"
    | "bank-statement"
    | "agreement"
    | "status";

const STEPS = [
    { id: "form" as AppStep, num: 1, label: "Personal Details", desc: "Your basic information" },
    { id: "verification" as AppStep, num: 2, label: "Identity & Selfie", desc: "ID document + liveness" },
    { id: "proof-of-address" as AppStep, num: 3, label: "Proof of Address", desc: "Utility bill or letter" },
    { id: "bank-statement" as AppStep, num: 4, label: "Bank Statement", desc: "3 months recent" },
    { id: "agreement" as AppStep, num: 5, label: "Agreement", desc: "Signed agreement" },
];

const STEP_INDEX: Record<AppStep, number> = {
    form: 0,
    verification: 1,
    "proof-of-address": 2,
    "bank-statement": 3,
    agreement: 4,
    status: 5,
};

/* ── Inline icons ─────────────────────────────────────────────────────── */

function ShieldCheckIcon({ className = "w-6 h-6" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
            strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function LockIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

function XCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    );
}

/* ── Desktop Sidebar ──────────────────────────────────────────────────── */

function Sidebar({ step, onLogout }: { step: AppStep; onLogout: () => void }) {
    const currentIdx = STEP_INDEX[step];

    return (
        <aside className="hidden lg:flex lg:flex-col lg:w-72 xl:w-80 lg:fixed lg:inset-y-0 bg-gradient-brand overflow-hidden">
            {/* Decorative background circles */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/[0.03] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/[0.03] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="relative flex flex-col h-full px-8 py-10">
                {/* Logo / Brand */}
                <div className="flex items-center gap-3 mb-12">
                    <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <ShieldCheckIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-white text-base leading-tight">SecureVerify</p>
                        <p className="text-xs text-white/45 leading-tight mt-0.5">KYC Portal</p>
                    </div>
                </div>

                {/* Step list */}
                <nav className="flex-1" aria-label="Verification steps">
                    {STEPS.map((s, i) => {
                        const done = i < currentIdx || step === "status";
                        const active = i === currentIdx && step !== "status";
                        return (
                            <div key={s.id} className="flex items-start gap-4">
                                {/* Indicator column */}
                                <div className="flex flex-col items-center flex-shrink-0">
                                    <div className={`
                                        w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                                        transition-all duration-300
                                        ${done
                                            ? "bg-kyc-success text-white shadow-md"
                                            : active
                                            ? "bg-white text-kyc-primary shadow-lg ring-4 ring-white/15"
                                            : "bg-white/8 text-white/30 border border-white/10"
                                        }
                                    `}>
                                        {done ? <CheckIcon /> : <span>{s.num}</span>}
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div className={`
                                            w-0.5 h-9 my-1 rounded-full transition-colors duration-300
                                            ${done ? "bg-kyc-success/50" : "bg-white/10"}
                                        `} />
                                    )}
                                </div>

                                {/* Label */}
                                <div className={`
                                    pt-1.5 pb-9 transition-opacity duration-300
                                    ${active ? "opacity-100" : done ? "opacity-65" : "opacity-28"}
                                `}>
                                    <p className={`text-sm font-semibold leading-snug ${active ? "text-white" : "text-white/80"}`}>
                                        {s.label}
                                    </p>
                                    <p className="text-xs text-white/40 mt-0.5">{s.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Trust badges */}
                <div className="border-t border-white/10 pt-6 space-y-3.5">
                    {[
                        { icon: "🔒", text: "256-bit SSL Encryption" },
                        { icon: "🛡", text: "Bank-grade Security" },
                        { icon: "✓", text: "Powered by Sumsub" },
                    ].map((b) => (
                        <div key={b.text} className="flex items-center gap-2.5">
                            <span className="text-base leading-none">{b.icon}</span>
                            <span className="text-xs text-white/35 font-medium">{b.text}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-3">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/55 hover:text-white hover:bg-white/[0.08] transition-colors"
                    >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                    </button>
                </div>
            </div>
        </aside>
    );
}

/* ── Mobile header + progress bar ─────────────────────────────────────── */

function MobileHeader({ step, onLogout }: { step: AppStep; onLogout: () => void }) {
    const currentIdx = STEP_INDEX[step];
    const isStatus = step === "status";
    const progress = isStatus ? 100 : (currentIdx / STEPS.length) * 100;

    return (
        <header className="lg:hidden sticky top-0 z-50 bg-white border-b border-kyc-border shadow-card">
            <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-btn flex items-center justify-center flex-shrink-0">
                        <ShieldCheckIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-kyc-text text-sm tracking-tight">SecureVerify</span>
                </div>

                <div className="flex items-center gap-2">
                    {!isStatus && (
                        <span className="text-xs font-semibold text-kyc-muted bg-kyc-bg-2 border border-kyc-border px-2.5 py-1 rounded-full">
                            {currentIdx + 1} / {STEPS.length}
                        </span>
                    )}
                    <button onClick={onLogout} className="text-xs text-kyc-muted hover:text-kyc-text transition-colors px-2 py-1">
                        Sign out
                    </button>
                </div>
            </div>

            {/* Gradient progress bar */}
            <div className="h-1 bg-kyc-border">
                <div
                    className="h-full bg-gradient-btn rounded-r-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </header>
    );
}

/* ── Main page ────────────────────────────────────────────────────────── */

export default function Home() {
    const router = useRouter();
    const [step, setStep] = useState<AppStep>("form");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [applicantId, setApplicantId] = useState<string | null>(null);
    const [userData, setUserData] = useState<UserInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        const savedEmail = localStorage.getItem("kyc_user_email");
        if (savedEmail) fetchUserStatus(savedEmail);
    }, []);

    // Heartbeat: ping every 30s to detect session expiry, timeout, or device change
    useEffect(() => {
        const id = setInterval(async () => {
            try {
                const res = await fetch("/api/auth/contact/heartbeat", { method: "POST" });
                if (!res.ok) {
                    router.push("/login?reason=expired");
                }
            } catch { /* network hiccup — next tick will retry */ }
        }, 30_000);
        return () => clearInterval(id);
    }, [router]);

    const fetchUserStatus = useCallback(async (userId: string) => {
        try {
            setIsRefreshing(true);
            const response = await fetch(`/api/user?userId=${encodeURIComponent(userId)}`);

            if (response.ok) {
                const data = await response.json();
                setUserData({
                    firstName: data.firstName, lastName: data.lastName,
                    dateOfBirth: data.dateOfBirth, nationality: data.nationality,
                    email: data.email, phone: data.phone,
                    countryOfResidence: data.countryOfResidence,
                    sourceOfFunds: data.sourceOfFunds, sourceOfWealth: data.sourceOfWealth,
                });
                setApplicantId(data.applicantId);
                setVerificationStatus(data.status as VerificationStatus);

                const poaDone = !!data.proofOfAddressPath;
                const bankDone = !!data.bankStatementPath;
                const agreementDone = !!data.agreementPath;
                // Any uploaded document proves the user already completed Sumsub.
                // We also treat GREEN/RED/RETRY webhook statuses as done.
                const sumsubDone =
                    data.status === "GREEN" || data.status === "RED" ||
                    data.status === "RETRY" ||
                    poaDone || bankDone || agreementDone;

                if (!sumsubDone) {
                    const verifyResp = await fetch("/api/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: data.email }),
                    });
                    const verifyData = await verifyResp.json();
                    if (verifyResp.ok) {
                        setAccessToken(verifyData.accessToken);
                        setStep("verification");
                    } else {
                        setStep("status");
                    }
                } else if (data.status === "RED" || data.status === "RETRY") {
                    setStep("status");
                } else {
                    if (!poaDone) setStep("proof-of-address");
                    else if (!bankDone) setStep("bank-statement");
                    else if (!agreementDone) setStep("agreement");
                    else setStep("status");
                }
            } else if (response.status === 404) {
                localStorage.removeItem("kyc_user_email");
            }
        } catch {
            /* stay on current step */
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    const handleFormSubmit = useCallback(async (data: UserInfo) => {
        setIsSubmitting(true);
        setError(null);
        try {
            const response = await fetch("/api/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) {
                setError(result.error || "Failed to start verification. Please try again.");
                return;
            }
            localStorage.setItem("kyc_user_email", data.email.toLowerCase().trim());
            setUserData(data);
            setAccessToken(result.accessToken);
            setApplicantId(result.record.applicantId);
            setVerificationStatus("processing");
            setStep("verification");
        } catch {
            setError("Network error. Please check your connection and try again.");
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const handleVerificationComplete = useCallback(
        (_status: "GREEN" | "RED" | "processing") => {
            setVerificationStatus(_status);
            setStep("proof-of-address");
        },
        []
    );

    const handleVerificationError = useCallback((errorMsg: string) => {
        setError(errorMsg);
    }, []);

    const handleProofOfAddressComplete = useCallback(() => { setStep("bank-statement"); }, []);
    const handleBankStatementComplete = useCallback(() => { setStep("agreement"); }, []);
    const handleAgreementComplete = useCallback(() => { setStep("status"); }, []);

    const handleRetry = useCallback(() => {
        setStep("form");
        setError(null);
        setAccessToken(null);
        setVerificationStatus("RETRY");
    }, []);

    const handleRefreshStatus = useCallback(() => {
        if (userData?.email) fetchUserStatus(userData.email);
    }, [userData, fetchUserStatus]);

    const handleStartNew = useCallback(() => {
        localStorage.removeItem("kyc_user_email");
        setStep("form");
        setAccessToken(null);
        setApplicantId(null);
        setUserData(null);
        setError(null);
        setVerificationStatus(null);
    }, []);

    const handleLogout = useCallback(async () => {
        await fetch("/api/auth/contact/logout", { method: "POST" });
        router.push("/login");
    }, [router]);

    const currentStepMeta = step !== "status" ? STEPS[STEP_INDEX[step]] : null;

    return (
        <div className="min-h-screen flex bg-kyc-bg">
            {/* Desktop Sidebar */}
            <Sidebar step={step} onLogout={handleLogout} />

            {/* Content wrapper */}
            <div className="flex-1 flex flex-col lg:ml-72 xl:ml-80">

                {/* Mobile header */}
                <MobileHeader step={step} onLogout={handleLogout} />

                {/* Page body */}
                <main className="flex-1 px-4 py-6 lg:px-12 lg:py-12 xl:py-16">
                    <div className="max-w-xl mx-auto w-full">

                        {/* Desktop step heading */}
                        {step !== "status" && currentStepMeta && (
                            <div className="hidden lg:block mb-8">
                                <p className="text-xs font-bold text-kyc-muted uppercase tracking-widest mb-1.5">
                                    Step {currentStepMeta.num} of {STEPS.length}
                                </p>
                                <h1 className="text-2xl font-bold text-kyc-text tracking-tight">
                                    {currentStepMeta.label}
                                </h1>
                                <p className="text-sm text-kyc-muted mt-1.5">{currentStepMeta.desc}</p>
                            </div>
                        )}

                        {step === "status" && (
                            <div className="hidden lg:block mb-8">
                                <h1 className="text-2xl font-bold text-kyc-text tracking-tight">
                                    Verification Status
                                </h1>
                                <p className="text-sm text-kyc-muted mt-1.5">Review your verification progress</p>
                            </div>
                        )}

                        {/* Loading state */}
                        {isRefreshing && (
                            <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-btn flex items-center justify-center mb-6 shadow-premium">
                                    <ShieldCheckIcon className="w-8 h-8 text-white" />
                                </div>
                                <div className="w-7 h-7 border-2 border-kyc-border border-t-kyc-primary rounded-full animate-spin mb-4" />
                                <p className="font-semibold text-kyc-text">Loading your session...</p>
                                <p className="text-sm text-kyc-muted mt-1">Checking verification status</p>
                            </div>
                        )}

                        {!isRefreshing && (
                            <div key={step} className="animate-slide-up space-y-5">

                                {/* Error banner */}
                                {error && (
                                    <div className="flex items-start gap-3 p-4 bg-kyc-danger-light border border-kyc-danger/20 rounded-xl">
                                        <div className="w-8 h-8 rounded-full bg-kyc-danger/10 flex items-center justify-center flex-shrink-0">
                                            <XCircleIcon className="w-4 h-4 text-kyc-danger" />
                                        </div>
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <p className="text-sm font-semibold text-kyc-danger leading-snug">{error}</p>
                                            <button
                                                onClick={() => setError(null)}
                                                className="text-xs text-kyc-danger/60 hover:text-kyc-danger mt-1 underline underline-offset-2 transition-colors"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Step 1: Personal Info Form */}
                                {step === "form" && (
                                    <div className="premium-card">
                                        <UserInfoForm
                                            onSubmit={handleFormSubmit}
                                            isSubmitting={isSubmitting}
                                        />
                                    </div>
                                )}

                                {/* Step 2: Sumsub WebSDK */}
                                {step === "verification" && accessToken && applicantId && userData && (
                                    <KycVerification
                                        accessToken={accessToken}
                                        applicantId={applicantId}
                                        userId={userData.email}
                                        onComplete={handleVerificationComplete}
                                        onError={handleVerificationError}
                                    />
                                )}

                                {/* Step 3: Proof of Address */}
                                {step === "proof-of-address" && userData && (
                                    <ProofOfAddressUpload
                                        userId={userData.email}
                                        onComplete={handleProofOfAddressComplete}
                                    />
                                )}

                                {/* Step 4: Bank Statement */}
                                {step === "bank-statement" && userData && (
                                    <BankStatementUpload
                                        userId={userData.email}
                                        onComplete={handleBankStatementComplete}
                                    />
                                )}

                                {/* Step 5: Agreement */}
                                {step === "agreement" && userData && (
                                    <AgreementUpload
                                        userId={userData.email}
                                        onComplete={handleAgreementComplete}
                                    />
                                )}

                                {/* Status page */}
                                {step === "status" && (
                                    <div className="premium-card">
                                        <VerificationStatusComponent
                                            status={verificationStatus}
                                            firstName={userData?.firstName || "there"}
                                            onRetry={handleRetry}
                                            onRefresh={handleRefreshStatus}
                                        />
                                        {verificationStatus === "GREEN" && (
                                            <div className="mt-6 pt-5 border-t border-kyc-border text-center">
                                                <button
                                                    onClick={handleStartNew}
                                                    className="text-sm text-kyc-muted hover:text-kyc-text transition-colors"
                                                >
                                                    Start a new verification
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Desktop footer */}
                        {!isRefreshing && (
                            <div className="hidden lg:flex items-center justify-center gap-1.5 mt-8 text-xs text-kyc-muted">
                                <LockIcon className="w-3 h-3 opacity-60" />
                                <span>256-bit SSL encryption &bull; Your data is private and protected</span>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
