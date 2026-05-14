"use client";

import React, { useState, useRef, useCallback } from "react";

interface AgreementUploadProps {
    userId: string;
    onComplete: () => void;
}

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const ACCEPTED_EXT = ".pdf, .jpg, .jpeg, .png";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export default function AgreementUpload({ userId, onComplete }: AgreementUploadProps) {
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
                `/api/upload?userId=${encodeURIComponent(userId)}&documentType=agreement`,
                { method: "POST", body: form }
            );
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Upload failed. Please try again.");
                return;
            }

            onComplete();
        } catch {
            setError("Network error. Please check your connection and try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const formatSize = (bytes: number) =>
        bytes < 1024 * 1024
            ? `${(bytes / 1024).toFixed(1)} KB`
            : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

    return (
        <div className="card-mobile">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-kyc-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-kyc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-kyc-text">Agreement</h2>
                    <p className="text-sm text-kyc-muted">Step 5 of 5</p>
                </div>
            </div>

            <p className="text-sm text-kyc-muted mb-6">
                Please upload your signed agreement document. Accepted formats: PDF, JPG, PNG — max 10 MB.
            </p>

            {/* Drop zone */}
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
                    isDragging
                        ? "border-kyc-primary bg-kyc-primary/5"
                        : file
                        ? "border-kyc-success bg-kyc-success/5"
                        : "border-kyc-border hover:border-kyc-primary/50 hover:bg-kyc-primary/5"
                }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED_EXT}
                    className="hidden"
                    onChange={handleChange}
                />

                {file ? (
                    <div className="flex flex-col items-center gap-2">
                        <svg className="w-8 h-8 text-kyc-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm font-medium text-kyc-text">{file.name}</p>
                        <p className="text-xs text-kyc-muted">{formatSize(file.size)}</p>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                            className="text-xs text-kyc-muted underline mt-1"
                        >
                            Choose a different file
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <svg className="w-8 h-8 text-kyc-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-kyc-muted">
                            <span className="text-kyc-primary font-medium">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-kyc-muted">PDF, JPG, PNG up to 10 MB</p>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 p-3 bg-kyc-danger/10 border border-kyc-danger/20 rounded-lg">
                    <p className="text-sm text-kyc-danger">{error}</p>
                </div>
            )}

            {/* Upload button */}
            <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="w-full min-h-tap py-3 px-4 bg-kyc-primary text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-kyc-primary-hover active:scale-[0.98] transition-all"
            >
                {isUploading ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Uploading...
                    </span>
                ) : (
                    "Upload & Complete"
                )}
            </button>
        </div>
    );
}
