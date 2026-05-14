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

/**
 * Formats a date string to YYYY-MM-DD, auto-inserting dashes.
 */
function formatDOB(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

/**
 * Formats a phone number with spaces for readability.
 */
function formatPhone(value: string): string {
    const digits = value.replace(/[^\d+]/g, "");
    if (!digits.startsWith("+")) return digits;
    // Simple format: +60 12 345 6789
    const cleaned = digits.slice(1);
    if (cleaned.length <= 4) return `+${cleaned}`;
    if (cleaned.length <= 6)
        return `+${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
    if (cleaned.length <= 9)
        return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4)}`;
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
}

export default function UserInfoForm({
    onSubmit,
    isSubmitting,
}: UserInfoFormProps) {
    const [formData, setFormData] = useState<UserInfo>({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        nationality: "",
        email: "",
        phone: "",
        countryOfResidence: "",
        sourceOfFunds: "",
        sourceOfWealth: "",
    });

    const [errors, setErrors] = useState<Partial<Record<keyof UserInfo, string>>>(
        {}
    );

    const [touched, setTouched] = useState<
        Partial<Record<keyof UserInfo, boolean>>
    >({});

    const validateField = useCallback(
        (field: keyof UserInfo, value: string): string | undefined => {
            if (!value.trim() && field !== "phone") {
                return "This field is required";
            }
            switch (field) {
                case "email":
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        return "Please enter a valid email";
                    }
                    break;
                case "phone":
                    if (value && !/^\+?[1-9]\d{7,14}$/.test(value.replace(/[\s\-()]/g, ""))) {
                        return "Enter a valid phone number (e.g., +60123456789)";
                    }
                    break;
                case "dateOfBirth":
                    if (value.length < 10) {
                        return "Enter a complete date (YYYY-MM-DD)";
                    }
                    const parsed = new Date(value);
                    if (isNaN(parsed.getTime())) {
                        return "Enter a valid date";
                    }
                    if (parsed > new Date()) {
                        return "Date cannot be in the future";
                    }
                    const age = Math.floor(
                        (Date.now() - parsed.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
                    );
                    if (age < 18) {
                        return "You must be at least 18 years old";
                    }
                    break;
            }
            return undefined;
        },
        []
    );

    const handleChange = useCallback(
        (
            field: keyof UserInfo,
            value: string,
            formatter?: (v: string) => string
        ) => {
            const formatted = formatter ? formatter(value) : value;
            setFormData((prev) => ({ ...prev, [field]: formatted }));
            setTouched((prev) => ({ ...prev, [field]: true }));

            // Validate on change (after formatting)
            const error = validateField(field, formatted);
            setErrors((prev) => ({
                ...prev,
                [field]: error,
            }));
        },
        [validateField]
    );

    const handleBlur = useCallback(
        (field: keyof UserInfo) => {
            setTouched((prev) => ({ ...prev, [field]: true }));
            const error = validateField(field, formData[field]);
            setErrors((prev) => ({
                ...prev,
                [field]: error,
            }));
        },
        [formData, validateField]
    );

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();

            // Validate all fields
            const newErrors: Partial<Record<keyof UserInfo, string>> = {};
            let hasError = false;

            for (const field of Object.keys(formData) as (keyof UserInfo)[]) {
                const error = validateField(field, formData[field]);
                if (error) {
                    newErrors[field] = error;
                    hasError = true;
                }
            }

            setErrors(newErrors);
            setTouched(
                Object.keys(formData).reduce(
                    (acc, key) => ({ ...acc, [key]: true }),
                    {}
                )
            );

            if (hasError) return;

            onSubmit(formData);
        },
        [formData, validateField, onSubmit]
    );

    const inputClasses = (field: keyof UserInfo) =>
        `w-full min-h-tap px-4 py-3 text-input text-kyc-text bg-kyc-card border rounded-xl 
    focus:outline-none focus:ring-2 focus:ring-kyc-primary focus:border-kyc-primary 
    transition-colors appearance-none
    ${touched[field] && errors[field]
            ? "border-kyc-danger ring-1 ring-kyc-danger"
            : "border-kyc-border"
        }`;

    const labelClasses = "block text-sm font-semibold text-kyc-text mb-1.5";
    const errorClasses = "text-kyc-danger text-xs mt-1 min-h-[16px]";

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <h1 className="text-xl font-bold text-kyc-text text-center mb-2">
                Identity Verification
            </h1>
            <p className="text-sm text-kyc-muted text-center -mt-3 mb-4">
                Please fill in your details to begin the KYC process
            </p>

            {/* Name fields - side by side on larger screens, stacked on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                    <label htmlFor="firstName" className={labelClasses}>
                        First Name *
                    </label>
                    <input
                        id="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleChange("firstName", e.target.value)}
                        onBlur={() => handleBlur("firstName")}
                        className={inputClasses("firstName")}
                        placeholder="John"
                        autoComplete="given-name"
                        inputMode="text"
                    />
                    <p className={errorClasses}>
                        {touched.firstName && errors.firstName}
                    </p>
                </div>

                {/* Last Name */}
                <div>
                    <label htmlFor="lastName" className={labelClasses}>
                        Last Name *
                    </label>
                    <input
                        id="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleChange("lastName", e.target.value)}
                        onBlur={() => handleBlur("lastName")}
                        className={inputClasses("lastName")}
                        placeholder="Doe"
                        autoComplete="family-name"
                        inputMode="text"
                    />
                    <p className={errorClasses}>
                        {touched.lastName && errors.lastName}
                    </p>
                </div>
            </div>

            {/* Date of Birth */}
            <div>
                <label htmlFor="dateOfBirth" className={labelClasses}>
                    Date of Birth *
                </label>
                <input
                    id="dateOfBirth"
                    type="text"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange("dateOfBirth", e.target.value, formatDOB)}
                    onBlur={() => handleBlur("dateOfBirth")}
                    className={inputClasses("dateOfBirth")}
                    placeholder="YYYY-MM-DD"
                    inputMode="numeric"
                    maxLength={10}
                />
                <p className={errorClasses}>
                    {touched.dateOfBirth && errors.dateOfBirth}
                </p>
            </div>

            {/* Nationality */}
            <div>
                <label htmlFor="nationality" className={labelClasses}>
                    Nationality *
                </label>
                <select
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => handleChange("nationality", e.target.value)}
                    onBlur={() => handleBlur("nationality")}
                    className={`${inputClasses("nationality")} bg-no-repeat bg-[right_1rem_center]`}
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    }}
                >
                    <option value="">Select your nationality</option>
                    {NATIONALITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <p className={errorClasses}>
                    {touched.nationality && errors.nationality}
                </p>
            </div>

            {/* Email */}
            <div>
                <label htmlFor="email" className={labelClasses}>
                    Email Address *
                </label>
                <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    onBlur={() => handleBlur("email")}
                    className={inputClasses("email")}
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                />
                <p className={errorClasses}>{touched.email && errors.email}</p>
            </div>

            {/* Phone */}
            <div>
                <label htmlFor="phone" className={labelClasses}>
                    Phone Number
                </label>
                <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value, formatPhone)}
                    onBlur={() => handleBlur("phone")}
                    className={inputClasses("phone")}
                    placeholder="+60 12 345 6789"
                    autoComplete="tel"
                    inputMode="tel"
                />
                <p className={errorClasses}>{touched.phone && errors.phone}</p>
            </div>

            {/* Country of Residence */}
            <div>
                <label htmlFor="countryOfResidence" className={labelClasses}>
                    Country of Residence *
                </label>
                <select
                    id="countryOfResidence"
                    value={formData.countryOfResidence}
                    onChange={(e) =>
                        handleChange("countryOfResidence", e.target.value)
                    }
                    onBlur={() => handleBlur("countryOfResidence")}
                    className={`${inputClasses("countryOfResidence")} bg-no-repeat bg-[right_1rem_center]`}
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    }}
                >
                    <option value="">Select your country</option>
                    {COUNTRY_OF_RESIDENCE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <p className={errorClasses}>
                    {touched.countryOfResidence && errors.countryOfResidence}
                </p>
            </div>

            {/* Source of Funds */}
            <div>
                <label htmlFor="sourceOfFunds" className={labelClasses}>
                    Source of Funds *
                </label>
                <select
                    id="sourceOfFunds"
                    value={formData.sourceOfFunds}
                    onChange={(e) => handleChange("sourceOfFunds", e.target.value)}
                    onBlur={() => handleBlur("sourceOfFunds")}
                    className={`${inputClasses("sourceOfFunds")} bg-no-repeat bg-[right_1rem_center]`}
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    }}
                >
                    <option value="">Select source of funds</option>
                    {SOURCE_OF_FUNDS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <p className={errorClasses}>
                    {touched.sourceOfFunds && errors.sourceOfFunds}
                </p>
            </div>

            {/* Source of Wealth */}
            <div>
                <label htmlFor="sourceOfWealth" className={labelClasses}>
                    Source of Wealth *
                </label>
                <select
                    id="sourceOfWealth"
                    value={formData.sourceOfWealth}
                    onChange={(e) => handleChange("sourceOfWealth", e.target.value)}
                    onBlur={() => handleBlur("sourceOfWealth")}
                    className={`${inputClasses("sourceOfWealth")} bg-no-repeat bg-[right_1rem_center]`}
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    }}
                >
                    <option value="">Select source of wealth</option>
                    {SOURCE_OF_WEALTH_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <p className={errorClasses}>
                    {touched.sourceOfWealth && errors.sourceOfWealth}
                </p>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-tap py-4 px-6 text-base font-bold text-white 
          bg-kyc-primary rounded-xl active:bg-kyc-primary-hover 
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors shadow-lg shadow-kyc-primary/25
          flex items-center justify-center gap-2"
            >
                {isSubmitting ? (
                    <>
                        <svg
                            className="animate-spin h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                        </svg>
                        Initializing Verification...
                    </>
                ) : (
                    "Begin Verification"
                )}
            </button>
        </form>
    );
}