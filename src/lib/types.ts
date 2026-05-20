export interface UserInfo {
    firstName: string;
    lastName: string;
    dateOfBirth: string; // YYYY-MM-DD
    nationality: string;
    email: string;
    phone: string;
    countryOfResidence: string;
    sourceOfFunds: string;
    sourceOfWealth: string;
}

export type VerificationStatus = "pending" | "processing" | "GREEN" | "RED" | "RETRY";

export interface VerificationRecord {
    id: string; // UUID - user/session identifier
    userId: string;
    applicantId: string; // Sumsub applicant ID
    inspectionId: string | null;
    status: VerificationStatus;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    email: string;
    phone: string;
    countryOfResidence: string;
    sourceOfFunds: string;
    sourceOfWealth: string;
    proofOfAddressPath: string | null;
    proofOfAddressUploadedAt: string | null;
    bankStatementPath: string | null;
    bankStatementUploadedAt: string | null;
    agreementPath: string | null;
    agreementUploadedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Agent {
    id: string;
    subdomain: string;
    username: string;
    name: string;
    email: string;
    isActive: boolean;
    agreementTemplatePath: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Contact {
    id: string;
    agentId: string;
    email: string;
    name: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Admin {
    id: string;
    username: string;
    name: string;
    createdAt: string;
}

export interface AuditLogEntry {
    id: string;
    agentId: string | null;
    contactId: string | null;
    actorType: "admin" | "agent" | "contact" | "system";
    actorId: string;
    eventType: string;
    eventData: Record<string, unknown> | null;
    ipAddress: string | null;
    createdAt: string;
}

export interface SumsubAccessTokenResponse {
    token: string;
    userId: string;
}

// Sumsub Webhook Payload (simplified)
export interface SumsubWebhookPayload {
    applicantId: string;
    inspectionId: string;
    correlationId: string;
    externalUserId: string;
    levelName?: string;
    type: string; // e.g., "applicantReviewed"
    reviewResult: {
        reviewAnswer: "GREEN" | "RED";
        rejectLabels?: string[];
        reviewRejectType?: string;
    };
    reviewStatus: "init" | "pending" | "prechecked" | "queued" | "completed" | "onHold";
    createdAt: string;
    clientId?: string;
}

// Sumsub level name — discovered from your account
export const SUMSUB_LEVEL_NAME = "id-and-liveness";

export const SOURCE_OF_FUNDS_OPTIONS = [
    { value: "salary", label: "Employment Salary" },
    { value: "business_income", label: "Business Income" },
    { value: "investments", label: "Investment Returns" },
    { value: "inheritance", label: "Inheritance" },
    { value: "gift", label: "Gift" },
    { value: "savings", label: "Personal Savings" },
    { value: "property_sale", label: "Property Sale" },
    { value: "crypto", label: "Cryptocurrency" },
    { value: "other", label: "Other" },
] as const;

export const SOURCE_OF_WEALTH_OPTIONS = [
    { value: "employment", label: "Long-term Employment" },
    { value: "business_ownership", label: "Business Ownership" },
    { value: "investments_portfolio", label: "Investment Portfolio" },
    { value: "inheritance_wealth", label: "Inheritance" },
    { value: "real_estate", label: "Real Estate Holdings" },
    { value: "crypto_wealth", label: "Cryptocurrency Holdings" },
    { value: "other_wealth", label: "Other" },
] as const;

export const NATIONALITY_OPTIONS = [
    { value: "MYS", label: "Malaysia" },
    { value: "SGP", label: "Singapore" },
    { value: "IDN", label: "Indonesia" },
    { value: "THA", label: "Thailand" },
    { value: "VNM", label: "Vietnam" },
    { value: "PHL", label: "Philippines" },
    { value: "CHN", label: "China" },
    { value: "IND", label: "India" },
    { value: "USA", label: "United States" },
    { value: "GBR", label: "United Kingdom" },
    { value: "AUS", label: "Australia" },
    { value: "JPN", label: "Japan" },
    { value: "KOR", label: "South Korea" },
    { value: "ARE", label: "United Arab Emirates" },
    { value: "OTH", label: "Other" },
] as const;

export const COUNTRY_OF_RESIDENCE_OPTIONS = [
    { value: "MYS", label: "Malaysia" },
    { value: "SGP", label: "Singapore" },
    { value: "IDN", label: "Indonesia" },
    { value: "THA", label: "Thailand" },
    { value: "VNM", label: "Vietnam" },
    { value: "PHL", label: "Philippines" },
    { value: "CHN", label: "China" },
    { value: "IND", label: "India" },
    { value: "USA", label: "United States" },
    { value: "GBR", label: "United Kingdom" },
    { value: "AUS", label: "Australia" },
    { value: "JPN", label: "Japan" },
    { value: "KOR", label: "South Korea" },
    { value: "ARE", label: "United Arab Emirates" },
    { value: "OTH", label: "Other" },
] as const;