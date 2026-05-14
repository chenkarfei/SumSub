"use client";

import React, { useState, useEffect, useCallback } from "react";
import UserInfoForm from "@/components/UserInfoForm";
import KycVerification from "@/components/KycVerification";
import ProofOfAddressUpload from "@/components/ProofOfAddressUpload";
import BankStatementUpload from "@/components/BankStatementUpload";
import AgreementUpload from "@/components/AgreementUpload";
import VerificationStatusComponent from "@/components/VerificationStatus";
import { UserInfo, VerificationStatus } from "@/lib/types";

type AppStep = "form" | "verification" | "proof-of-address" | "bank-statement" | "agreement" | "status";

export default function Home() {
    const [step, setStep] = useState<AppStep>("form");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [applicantId, setApplicantId] = useState<string | null>(null);
    const [userData, setUserData] = useState<UserInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [verificationStatus, setVerificationStatus] =
        useState<VerificationStatus | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // On mount, check localStorage for an existing session
    useEffect(() => {
        const savedEmail = localStorage.getItem("kyc_user_email");
        if (savedEmail) {
            fetchUserStatus(savedEmail);
        }
    }, []);

    const fetchUserStatus = useCallback(async (userId: string) => {
        try {
            setIsRefreshing(true);
            const response = await fetch(`/api/user?userId=${encodeURIComponent(userId)}`);

            if (response.ok) {
                const data = await response.json();
                setUserData({
                    firstName: data.firstName,
                    lastName: data.lastName,
                    dateOfBirth: data.dateOfBirth,
                    nationality: data.nationality,
                    email: data.email,
                    phone: data.phone,
                    countryOfResidence: data.countryOfResidence,
                    sourceOfFunds: data.sourceOfFunds,
                    sourceOfWealth: data.sourceOfWealth,
                });
                setApplicantId(data.applicantId);
                setVerificationStatus(data.status as VerificationStatus);

                const poaDone  = !!data.proofOfAddressPath;
                const bankDone = !!data.bankStatementPath;
                const agreementDone = !!data.agreementPath;

                // Sumsub is only truly done when their reviewStatus is "completed"
                // (which our API returns as sumsubStatus), OR when our webhook has
                // already flipped the status to GREEN / RED.
                const sumsubDone =
                    data.status === "GREEN" ||
                    data.status === "RED" ||
                    data.sumsubStatus === "completed";

                if (!sumsubDone) {
                    // Sumsub step not finished yet — get a fresh token and show WebSDK
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
                    // Sumsub rejected — go straight to status
                    setStep("status");
                } else {
                    // Sumsub passed — enforce our remaining steps in order
                    if (!poaDone) {
                        setStep("proof-of-address");
                    } else if (!bankDone) {
                        setStep("bank-statement");
                    } else if (!agreementDone) {
                        setStep("agreement");
                    } else {
                        setStep("status");
                    }
                }
            } else if (response.status === 404) {
                localStorage.removeItem("kyc_user_email");
            }
        } catch {
            // Network error — stay on current step
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    const handleFormSubmit = useCallback(
        async (data: UserInfo) => {
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
                    setIsSubmitting(false);
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
        },
        []
    );

    // Called when Sumsub WebSDK reports completion
    const handleVerificationComplete = useCallback(
        (_status: "GREEN" | "RED" | "processing") => {
            setVerificationStatus(_status);
            // Proceed to Proof of Address (our custom upload — Step 3)
            setStep("proof-of-address");
        },
        []
    );

    const handleVerificationError = useCallback((errorMsg: string) => {
        setError(errorMsg);
    }, []);

    const handleProofOfAddressComplete = useCallback(() => {
        setStep("bank-statement");
    }, []);

    const handleBankStatementComplete = useCallback(() => {
        setStep("agreement");
    }, []);

    const handleAgreementComplete = useCallback(() => {
        setStep("status");
    }, []);

    const handleRetry = useCallback(() => {
        setStep("form");
        setError(null);
        setAccessToken(null);
        setVerificationStatus("RETRY");
    }, []);

    const handleRefreshStatus = useCallback(() => {
        if (userData?.email) {
            fetchUserStatus(userData.email);
        }
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

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Initial loader */}
            {isRefreshing && (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-10 h-10 border-3 border-kyc-border border-t-kyc-primary rounded-full animate-spin mb-4" />
                    <p className="text-sm text-kyc-muted">Loading your verification status...</p>
                </div>
            )}

            {!isRefreshing && (
                <>
                    {/* Error banner */}
                    {error && (
                        <div className="mb-6 p-4 bg-kyc-danger/10 border border-kyc-danger/20 rounded-xl flex items-start gap-3">
                            <svg
                                className="w-5 h-5 text-kyc-danger flex-shrink-0 mt-0.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <div className="flex-1">
                                <p className="text-sm text-kyc-danger font-medium">{error}</p>
                                <button
                                    onClick={() => setError(null)}
                                    className="text-xs text-kyc-danger/70 mt-1 underline"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 1: User Info Form */}
                    {step === "form" && (
                        <div className="card-mobile">
                            <UserInfoForm
                                onSubmit={handleFormSubmit}
                                isSubmitting={isSubmitting}
                            />
                        </div>
                    )}

                    {/* Step 2: Sumsub WebSDK (IC + Selfie + Proof of Address) */}
                    {step === "verification" && accessToken && applicantId && userData && (
                        <div>
                            <KycVerification
                                accessToken={accessToken}
                                applicantId={applicantId}
                                userId={userData.email}
                                onComplete={handleVerificationComplete}
                                onError={handleVerificationError}
                            />
                        </div>
                    )}

                    {/* Step 3: Proof of Address (our side) */}
                    {step === "proof-of-address" && userData && (
                        <ProofOfAddressUpload
                            userId={userData.email}
                            onComplete={handleProofOfAddressComplete}
                        />
                    )}

                    {/* Step 4: Bank Statement (our side) */}
                    {step === "bank-statement" && userData && (
                        <BankStatementUpload
                            userId={userData.email}
                            onComplete={handleBankStatementComplete}
                        />
                    )}

                    {/* Step 5: Agreement (our side) */}
                    {step === "agreement" && userData && (
                        <AgreementUpload
                            userId={userData.email}
                            onComplete={handleAgreementComplete}
                        />
                    )}

                    {/* Step 5: Verification Status */}
                    {step === "status" && (
                        <div className="card-mobile">
                            <VerificationStatusComponent
                                status={verificationStatus}
                                firstName={userData?.firstName || "User"}
                                onRetry={handleRetry}
                                onRefresh={handleRefreshStatus}
                            />

                            {verificationStatus === "GREEN" && (
                                <div className="mt-6 pt-4 border-t border-kyc-border">
                                    <button
                                        onClick={handleStartNew}
                                        className="w-full text-sm text-kyc-muted hover:text-kyc-text transition-colors py-2"
                                    >
                                        Start a new verification
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
