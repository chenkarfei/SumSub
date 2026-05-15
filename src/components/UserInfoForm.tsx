"use client";

import React, { useState, useCallback } from "react";
import {
    UserInfo,
    SOURCE_OF_FUNDS_OPTIONS,
    SOURCE_OF_WEALTH_OPTIONS,
    NATIONALITY_OPTIONS,
    COUNTRY_OF_RESIDENCE_OPTIONS,
} from "@/lib/types";

interface UserInfoFormProps {
    onSubmit: (data: UserInfo) => void;
    isSubmitting: boolean;
}

function formatDOB(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function formatPhone(value: string): string {
    const digits = value.replace(/[^\d+]/g, "");
    if (!digits.startsWith("+")) return digits;
    const cleaned = digits.slice(1);
    if (cleaned.length <= 4) return `+${cleaned}`;
    if (cleaned.length <= 6) return `+${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
    if (cleaned.length <= 9) return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4)}`;
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
}

function SectionHeader({ title }: { title: string }) {
    return (
        <div className="flex items-center gap-3 pt-1">
            <span className="text-xs font-bold text-kyc-muted uppercase tracking-widest whitespace-nowrap">
                {title}
            </span>
            <div className="flex-1 h-px bg-kyc-border" />
        </div>
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

function LockSmIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 flex-shrink-0">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

export default function UserInfoForm({ onSubmit, isSubmitting }: UserInfoFormProps) {
    const [formData, setFormData] = useState<UserInfo>({
        firstName: "", lastName: "", dateOfBirth: "", nationality: "",
        email: "", phone: "", countryOfResidence: "", sourceOfFunds: "", sourceOfWealth: "",
    });

    const [errors, setErrors] = useState<Partial<Record<keyof UserInfo, string>>>({});
    const [touched, setTouched] = useState<Partial<Record<keyof UserInfo, boolean>>>({});

    const validateField = useCallback((field: keyof UserInfo, value: string): string | undefined => {
        if (!value.trim() && field !== "phone") return "This field is required";
        switch (field) {
            case "email":
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Please enter a valid email address";
                break;
            case "phone":
                if (value && !/^\+?[1-9]\d{7,14}$/.test(value.replace(/[\s\-()]/g, "")))
                    return "Enter a valid phone number (e.g. +60123456789)";
                break;
            case "dateOfBirth": {
                if (value.length < 10) return "Enter a complete date (YYYY-MM-DD)";
                const parsed = new Date(value);
                if (isNaN(parsed.getTime())) return "Enter a valid date";
                if (parsed > new Date()) return "Date cannot be in the future";
                const age = Math.floor((Date.now() - parsed.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                if (age < 18) return "You must be at least 18 years old";
                break;
            }
        }
        return undefined;
    }, []);

    const handleChange = useCallback((
        field: keyof UserInfo, value: string, formatter?: (v: string) => string
    ) => {
        const formatted = formatter ? formatter(value) : value;
        setFormData((prev) => ({ ...prev, [field]: formatted }));
        setTouched((prev) => ({ ...prev, [field]: true }));
        const error = validateField(field, formatted);
        setErrors((prev) => ({ ...prev, [field]: error }));
    }, [validateField]);

    const handleBlur = useCallback((field: keyof UserInfo) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        const error = validateField(field, formData[field]);
        setErrors((prev) => ({ ...prev, [field]: error }));
    }, [formData, validateField]);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Partial<Record<keyof UserInfo, string>> = {};
        let hasError = false;
        for (const field of Object.keys(formData) as (keyof UserInfo)[]) {
            const error = validateField(field, formData[field]);
            if (error) { newErrors[field] = error; hasError = true; }
        }
        setErrors(newErrors);
        setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
        if (hasError) return;
        onSubmit(formData);
    }, [formData, validateField, onSubmit]);

    const inputClass = (field: keyof UserInfo) =>
        touched[field] && errors[field] ? "field-input-error" : "field-input";

    const selectClass = (field: keyof UserInfo) =>
        touched[field] && errors[field] ? "field-select-error" : "field-select";

    const chevronStyle = {
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Mobile intro */}
            <div className="lg:hidden mb-2">
                <h2 className="text-lg font-bold text-kyc-text tracking-tight">Personal Details</h2>
                <p className="text-sm text-kyc-muted mt-1">
                    Please enter your details as they appear on your identity document.
                </p>
            </div>

            {/* ── Identity ─────────────────────────────────────────── */}
            <SectionHeader title="Identity" />

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="firstName" className="field-label">First Name *</label>
                    <input
                        id="firstName" type="text" value={formData.firstName}
                        onChange={(e) => handleChange("firstName", e.target.value)}
                        onBlur={() => handleBlur("firstName")}
                        className={inputClass("firstName")}
                        placeholder="John" autoComplete="given-name" inputMode="text"
                    />
                    <p className="field-error">{touched.firstName && errors.firstName}</p>
                </div>
                <div>
                    <label htmlFor="lastName" className="field-label">Last Name *</label>
                    <input
                        id="lastName" type="text" value={formData.lastName}
                        onChange={(e) => handleChange("lastName", e.target.value)}
                        onBlur={() => handleBlur("lastName")}
                        className={inputClass("lastName")}
                        placeholder="Doe" autoComplete="family-name" inputMode="text"
                    />
                    <p className="field-error">{touched.lastName && errors.lastName}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label htmlFor="dateOfBirth" className="field-label">Date of Birth *</label>
                    <input
                        id="dateOfBirth" type="text" value={formData.dateOfBirth}
                        onChange={(e) => handleChange("dateOfBirth", e.target.value, formatDOB)}
                        onBlur={() => handleBlur("dateOfBirth")}
                        className={inputClass("dateOfBirth")}
                        placeholder="YYYY-MM-DD" inputMode="numeric" maxLength={10}
                    />
                    <p className="field-error">{touched.dateOfBirth && errors.dateOfBirth}</p>
                </div>
                <div>
                    <label htmlFor="nationality" className="field-label">Nationality *</label>
                    <select
                        id="nationality" value={formData.nationality}
                        onChange={(e) => handleChange("nationality", e.target.value)}
                        onBlur={() => handleBlur("nationality")}
                        className={selectClass("nationality")}
                        style={chevronStyle}
                    >
                        <option value="">Select nationality</option>
                        {NATIONALITY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <p className="field-error">{touched.nationality && errors.nationality}</p>
                </div>
            </div>

            {/* ── Contact ──────────────────────────────────────────── */}
            <SectionHeader title="Contact" />

            <div>
                <label htmlFor="email" className="field-label">Email Address *</label>
                <input
                    id="email" type="email" value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    onBlur={() => handleBlur("email")}
                    className={inputClass("email")}
                    placeholder="you@example.com" autoComplete="email" inputMode="email"
                />
                <p className="field-error">{touched.email && errors.email}</p>
            </div>

            <div>
                <label htmlFor="phone" className="field-label">Phone Number</label>
                <input
                    id="phone" type="tel" value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value, formatPhone)}
                    onBlur={() => handleBlur("phone")}
                    className={inputClass("phone")}
                    placeholder="+60 12 345 6789" autoComplete="tel" inputMode="tel"
                />
                <p className="field-error">{touched.phone && errors.phone}</p>
            </div>

            {/* ── Compliance ───────────────────────────────────────── */}
            <SectionHeader title="Compliance" />

            <div>
                <label htmlFor="countryOfResidence" className="field-label">Country of Residence *</label>
                <select
                    id="countryOfResidence" value={formData.countryOfResidence}
                    onChange={(e) => handleChange("countryOfResidence", e.target.value)}
                    onBlur={() => handleBlur("countryOfResidence")}
                    className={selectClass("countryOfResidence")}
                    style={chevronStyle}
                >
                    <option value="">Select country</option>
                    {COUNTRY_OF_RESIDENCE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <p className="field-error">{touched.countryOfResidence && errors.countryOfResidence}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label htmlFor="sourceOfFunds" className="field-label">Source of Funds *</label>
                    <select
                        id="sourceOfFunds" value={formData.sourceOfFunds}
                        onChange={(e) => handleChange("sourceOfFunds", e.target.value)}
                        onBlur={() => handleBlur("sourceOfFunds")}
                        className={selectClass("sourceOfFunds")}
                        style={chevronStyle}
                    >
                        <option value="">Select source</option>
                        {SOURCE_OF_FUNDS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <p className="field-error">{touched.sourceOfFunds && errors.sourceOfFunds}</p>
                </div>
                <div>
                    <label htmlFor="sourceOfWealth" className="field-label">Source of Wealth *</label>
                    <select
                        id="sourceOfWealth" value={formData.sourceOfWealth}
                        onChange={(e) => handleChange("sourceOfWealth", e.target.value)}
                        onBlur={() => handleBlur("sourceOfWealth")}
                        className={selectClass("sourceOfWealth")}
                        style={chevronStyle}
                    >
                        <option value="">Select source</option>
                        {SOURCE_OF_WEALTH_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <p className="field-error">{touched.sourceOfWealth && errors.sourceOfWealth}</p>
                </div>
            </div>

            {/* Privacy note */}
            <div className="flex items-start gap-2.5 p-3.5 bg-kyc-bg-2 border border-kyc-border rounded-xl">
                <LockSmIcon />
                <p className="text-xs text-kyc-muted leading-relaxed">
                    Your information is encrypted end-to-end and will never be shared without your explicit consent.
                </p>
            </div>

            {/* Submit */}
            <button type="submit" disabled={isSubmitting} className="btn-primary mt-2">
                {isSubmitting ? (
                    <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Setting up verification...
                    </>
                ) : (
                    <>
                        Begin Verification
                        <ArrowRightIcon />
                    </>
                )}
            </button>
        </form>
    );
}
