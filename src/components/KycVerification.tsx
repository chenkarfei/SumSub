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
    interface Window {
        snsWebSdk?: any;
    }
}

export default function KycVerification({
    accessToken,
    userId,
    onComplete,
    onError,
}: KycVerificationProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    // Set to true once Sumsub reports the documents have been submitted / reviewed.
    // Only then do we surface the "Continue" button — the user must click it explicitly.
    const [canContinue, setCanContinue] = useState(false);
    const [continueStatus, setContinueStatus] = useState<"GREEN" | "RED" | "processing">("processing");
    const initializedRef = useRef(false);

    const initWebSDK = useCallback(() => {
        if (!window.snsWebSdk || !accessToken) return;

        console.log("Launching Sumsub WebSDK...");

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
                    console.log("SDK: Applicant Loaded");
                    setIsLoading(false);
                })
                .on("idCheck.onApplicantStatusChanged", (payload: any) => {
                    console.log("SDK: Status Changed", payload);
                    const reviewStatus = payload?.reviewStatus;
                    // Any status except "init" means the user has submitted their documents
                    // (or they were already submitted in a previous session).
                    // We reveal the Continue button but do NOT auto-advance — the user must click.
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
                .on("idCheck.onError", (error: any) => {
                    console.error("SDK Error Event:", error);
                    onError("Verification error occurred. Please try again.");
                })
                .build();

            snsWebSdkInstance.launch("#sumsub-websdk-container");
        } catch (error) {
            console.error("SDK Init Failed:", error);
            setLoadError("Failed to initialize verification. Please refresh.");
        }
    }, [accessToken, userId, onError]);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const SCRIPT_URL =
            "https://static.sumsub.com/idensic/static/sns-websdk-builder.js";

        // If the SDK global already exists (React Strict Mode remounts the
        // component after the first mount's cleanup, but the script and the
        // window.snsWebSdk object survive), skip reloading the script and
        // initialise directly.
        if (window.snsWebSdk) {
            initWebSDK();
            return;
        }

        // If the <script> tag is already in the DOM but not yet executed
        // (unlikely, but safe to handle), wait for its load event.
        const existingScript = document.querySelector<HTMLScriptElement>(
            `script[src="${SCRIPT_URL}"]`
        );
        if (existingScript) {
            existingScript.addEventListener("load", initWebSDK);
            return;
        }

        // First time: inject the script.
        const script = document.createElement("script");
        script.src = SCRIPT_URL;
        script.async = true;
        script.onload = () => {
            console.log("Sumsub script injected");
            initWebSDK();
        };
        script.onerror = () => {
            setLoadError("Connection to verification server failed.");
        };
        document.head.appendChild(script);

        return () => {
            if (window.snsWebSdk && typeof window.snsWebSdk.destroy === "function") {
                try { window.snsWebSdk.destroy(); } catch (e) { }
            }
        };
    }, [initWebSDK]);

    if (loadError) {
        return (
            <div className="card-mobile p-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>
                <p className="text-gray-800 font-medium">{loadError}</p>
                <button onClick={() => window.location.reload()} className="mt-4 btn-primary-mobile">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            {/* Loading banner */}
            {isLoading && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-lg">
                    <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">Initializing secure session...</span>
                </div>
            )}

            {/* Sumsub WebSDK container */}
            <div
                id="sumsub-websdk-container"
                className={`w-full bg-white rounded-xl overflow-hidden border border-gray-200 transition-opacity duration-500 ${
                    isLoading ? "opacity-0 h-0" : "opacity-100 min-h-[700px]"
                }`}
            />

            {/* Continue button — only shown after Sumsub confirms documents submitted */}
            {canContinue && (
                <div className="card-mobile">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-kyc-success/10 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-kyc-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-kyc-text">
                            Identity documents submitted. Continue to upload your bank statement.
                        </p>
                    </div>
                    <button
                        onClick={() => onComplete(continueStatus)}
                        className="w-full min-h-tap py-3 px-4 bg-kyc-primary text-white font-medium rounded-xl hover:bg-kyc-primary-hover active:scale-[0.98] transition-all"
                    >
                        Continue to Next Step →
                    </button>
                </div>
            )}
        </div>
    );
}
