"use client";

import React, { useState, useRef, useCallback } from "react";

interface BankStatementUploadProps {
    userId: string;
    onComplete: () => void;
}

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const ACCEPTED_EXT = ".pdf, .jpg, .jpeg, .png";
const MAX_BYTES = 10 * 1024 * 1024;

function formatSize(bytes: number) {
    return bytes < 1024 * 1024
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadCloudIcon({ className = "w-8 h-8" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
            strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
    );
}

function CheckCircleIcon({ className = "w-8 h-8" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}

function BankIcon({ className = "w-6 h-6" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
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

export default function BankStatementUpload({ userId, onComplete }: BankStatementUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const validateAndSet = (f: File) => {
        setError(null);
        if (!ACCEPTED_TYPES.includes(f.type)) {
            setError("Only PDF, JPG, or PNG files are accepted.");
            return;
        }
        if (f.size > MAX_BYTES) {
            setError("File size must be 10 MB or less.");
            return;
        }
        setFile(f);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) validateAndSet(dropped);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) validateAndSet(selected);
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setError(null);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch(
                `/api/upload?documentType=bank_statement`,
                { method: "POST", body: form }
            );
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Upload failed. Please try again."); return; }
            onComplete();
        } catch {
            setError("Network error. Please check your connection and try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const zoneClass = isDragging
        ? "upload-zone-dragging"
        : file
        ? "upload-zone-filled"
        : "upload-zone-idle";

    return (
        <div className="premium-card space-y-5">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-btn flex items-center justify-center flex-shrink-0 shadow-card-md">
                    <BankIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-kyc-text leading-tight">Bank Statement</h2>
                        <span className="text-xs font-semibold text-kyc-primary bg-kyc-primary-subtle border border-kyc-primary/20 px-2 py-0.5 rounded-full">
                            Step 4 of 5
                        </span>
                    </div>
                    <p className="text-sm text-kyc-muted mt-0.5">Most recent statement (within 3 months)</p>
                </div>
            </div>

            {/* Description */}
            <div className="p-3.5 bg-kyc-bg-2 border border-kyc-border rounded-xl">
                <p className="text-xs text-kyc-muted leading-relaxed">
                    Please upload your most recent bank statement showing your
                    <strong className="text-kyc-text-2"> full name, account number and transactions</strong>.
                    It must be dated within the last 3 months.
                </p>
            </div>

            {/* Drop zone */}
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={zoneClass}
            >
                <input ref={inputRef} type="file" accept={ACCEPTED_EXT} className="hidden" onChange={handleChange} />

                {file ? (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-kyc-success-light flex items-center justify-center">
                            <CheckCircleIcon className="w-7 h-7 text-kyc-success" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-kyc-text">{file.name}</p>
                            <p className="text-xs text-kyc-muted mt-0.5">{formatSize(file.size)}</p>
                        </div>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                            className="text-xs text-kyc-muted hover:text-kyc-text underline underline-offset-2 transition-colors"
                        >
                            Choose a different file
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-btn flex items-center justify-center shadow-card-md">
                            <UploadCloudIcon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-kyc-text">
                                {isDragging ? "Drop your file here" : "Click to upload or drag & drop"}
                            </p>
                            <p className="text-xs text-kyc-muted mt-1">Maximum file size: 10 MB</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            {["PDF", "JPG", "PNG"].map((ext) => (
                                <span key={ext} className="text-xs font-semibold text-kyc-muted bg-white border border-kyc-border px-2 py-0.5 rounded-md">
                                    {ext}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-kyc-danger-light border border-kyc-danger/20 rounded-xl">
                    <svg className="w-4 h-4 text-kyc-danger flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth={2} />
                        <line x1="12" y1="8" x2="12" y2="12" strokeWidth={2} />
                        <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth={2} />
                    </svg>
                    <p className="text-sm text-kyc-danger font-medium">{error}</p>
                </div>
            )}

            {/* Upload button */}
            <button onClick={handleUpload} disabled={!file || isUploading} className="btn-primary">
                {isUploading ? (
                    <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Uploading...
                    </>
                ) : (
                    <>
                        Upload & Continue
                        <ArrowRightIcon />
                    </>
                )}
            </button>
        </div>
    );
}
