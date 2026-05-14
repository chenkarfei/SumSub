import crypto from "crypto";

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN || "";
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY || "";
const SUMSUB_BASE_URL = process.env.SUMSUB_BASE_URL || "https://api.sumsub.com";

/**
 * Creates the HMAC-SHA256 signature required by Sumsub for API authentication.
 * Reference: https://docs.sumsub.com/reference/authentication
 */
function createSignature(
    ts: number,
    method: string,
    path: string,
    body: string | null
): string {
    const data = `${ts}${method.toUpperCase()}${path}${body ?? ""
        }`;
    return crypto
        .createHmac("sha256", SUMSUB_SECRET_KEY)
        .update(data)
        .digest("hex");
}

/**
 * Builds the headers for a Sumsub API request.
 */
function buildHeaders(
    ts: number,
    method: string,
    path: string,
    body: string | null
): Record<string, string> {
    return {
        "X-App-Token": SUMSUB_APP_TOKEN,
        "X-App-Access-Ts": String(ts),
        "X-App-Access-Sig": createSignature(ts, method, path, body),
        "Content-Type": "application/json",
        Accept: "application/json",
    };
}

/**
 * Makes an authenticated request to the Sumsub API.
 * Returns the parsed JSON response.
 */
export async function sumsubRequest<T = unknown>(
    method: string,
    path: string,
    body: unknown = null
): Promise<T> {
    const ts = Math.floor(Date.now() / 1000);
    const bodyStr = body ? JSON.stringify(body) : null;
    const url = `${SUMSUB_BASE_URL}${path}`;

    const response = await fetch(url, {
        method,
        headers: buildHeaders(ts, method, path, bodyStr),
        body: bodyStr,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
            `Sumsub API error: ${response.status} ${response.statusText} - ${errorText}`
        );
    }

    // Some endpoints may return 204 No Content
    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

/**
 * Creates a Sumsub applicant for a given external user ID.
 * The externalUserId links the Sumsub applicant to our system's user.
 */
export async function createApplicant(
    externalUserId: string,
    userData: {
        email: string;
        phone: string;
        firstName: string;
        lastName: string;
        dob: string;
        country: string;
    },
    levelName?: string
): Promise<{ id: string }> {
    const payload = {
        externalUserId,
        email: userData.email,
        phone: userData.phone,
        info: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            dob: userData.dob,
            country: userData.country,
        },
        requiredIdDocs: {
            docSets: [
                {
                    idDocSetType: "IDENTITY",
                    types: ["PASSPORT", "ID_CARD", "DRIVERS"],
                    subTypes: ["FRONT_SIDE", "BACK_SIDE"]
                },
                {
                    idDocSetType: "SELFIE",
                    types: ["SELFIE"]
                }
            ]
        }
    };

    let path = "/resources/applicants";
    if (levelName) {
        path += "?levelName=" + encodeURIComponent(levelName);
    }

    return sumsubRequest<{ id: string }>(
        "POST",
        path,
        payload
    );
}

/**
 * Generates an access token for the Sumsub WebSDK.
 * This token is used on the client side to initialize the WebSDK.
 */
export async function generateAccessToken(
    externalUserId: string,
    levelName?: string
): Promise<{ token: string; userId: string }> {
    // Access token endpoint requires query params, not body
    const params = new URLSearchParams();
    params.set("userId", externalUserId);
    params.set("ttlInSecs", "1800");
    if (levelName) {
        params.set("levelName", levelName);
    }

    return sumsubRequest<{ token: string; userId: string }>(
        "POST",
        `/resources/accessTokens?${params.toString()}`,
        null
    );
}

/**
 * Fetches the latest applicant data from Sumsub.
 */
export async function getApplicantData(applicantId: string) {
    return sumsubRequest<{
        id: string;
        externalUserId: string;
        review: {
            reviewAnswer: string;
            reviewStatus: string;
            rejectLabels?: string[];
            reviewRejectType?: string;
        };
        inspectionId: string;
        createdAt: string;
    }>("GET", `/resources/applicants/${applicantId}/one`);
}

/**
 * Fetches the latest inspection data for an applicant.
 */
export async function getInspectionData(inspectionId: string) {
    return sumsubRequest<{
        id: string;
        reviewAnswer: string;
        reviewStatus: string;
        rejectLabels?: string[];
        reviewRejectType?: string;
        applicantId: string;
    }>("GET", `/resources/inspections/${inspectionId}`);
}

/**
 * Resets an applicant if they need to retry verification ("RETRY" status).
 * This archives the current applicant data, allowing a fresh KYC attempt.
 */
export async function resetApplicant(applicantId: string) {
    return sumsubRequest(
        "POST",
        `/resources/applicants/${applicantId}/reset`
    );
}

/**
 * Validates an incoming Sumsub webhook signature.
 * Uses HMAC-SHA256 over the raw request body.
 */
export function validateWebhookSignature(
    rawBody: string,
    signature: string
): boolean {
    if (!process.env.SUMSUB_WEBHOOK_SECRET) {
        console.warn(
            "SUMSUB_WEBHOOK_SECRET is not configured. Skipping signature validation."
        );
        return true;
    }

    const expected = crypto
        .createHmac("sha256", process.env.SUMSUB_WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");

    try {
        return crypto.timingSafeEqual(
            Buffer.from(expected, "hex"),
            Buffer.from(signature, "hex")
        );
    } catch {
        return false;
    }
}