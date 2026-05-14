import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
    createVerificationRecord,
    getVerificationByUserId,
    updateApplicantId,
    deleteVerificationByUserId,
    resetDocumentUploads,
    updatePersonalInfo,
    formatVerificationRecord,
} from "@/lib/db";
import {
    createApplicant,
    generateAccessToken,
    resetApplicant,
} from "@/lib/sumsub";
import { UserInfo, SUMSUB_LEVEL_NAME } from "@/lib/types";

const REQUIRED_FIELDS: (keyof UserInfo)[] = [
    "firstName", "lastName", "dateOfBirth", "nationality",
    "email", "phone", "countryOfResidence", "sourceOfFunds", "sourceOfWealth",
];

export async function POST(request: NextRequest) {
    try {
        const body: Partial<UserInfo> = await request.json();
        const email = body.email?.toLowerCase().trim();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const userId = email;

        // Determine if this is a full form submission (all fields present) or
        // just a token refresh (only email, used by KycVerification / session resume).
        const isFullSubmission = REQUIRED_FIELDS.every(f => !!(body as any)[f]);

        const existingRecord = getVerificationByUserId(userId);
        let formattedRecord = existingRecord ? formatVerificationRecord(existingRecord) : null;

        // ── EXISTING APPLICANT ────────────────────────────────────────────────
        if (formattedRecord?.applicantId) {

            if (isFullSubmission) {
                // Fresh form submit: reset the Sumsub applicant so the user goes
                // through IC → Selfie → Proof of Address again from scratch.
                try {
                    await resetApplicant(formattedRecord.applicantId);
                } catch {
                    // If reset fails, wipe the record and fall through to create a new one.
                    deleteVerificationByUserId(userId);
                    formattedRecord = null;
                }

                if (formattedRecord) {
                    // Update personal info in case anything changed.
                    updatePersonalInfo(userId, {
                        firstName: body.firstName!.trim(),
                        lastName: body.lastName!.trim(),
                        dateOfBirth: body.dateOfBirth!,
                        nationality: body.nationality!,
                        phone: body.phone!.trim(),
                        countryOfResidence: body.countryOfResidence!,
                        sourceOfFunds: body.sourceOfFunds!,
                        sourceOfWealth: body.sourceOfWealth!,
                    });

                    // Clear previously uploaded documents and reset status.
                    resetDocumentUploads(userId);

                    // Generate fresh token using the externalUserId (email).
                    const accessToken = await generateAccessToken(userId, SUMSUB_LEVEL_NAME);
                    const updatedRecord = formatVerificationRecord(getVerificationByUserId(userId));

                    return NextResponse.json({
                        record: updatedRecord,
                        accessToken: accessToken.token,
                    });
                }
                // else: fall through to create a brand-new applicant below.

            } else {
                // Token-refresh path: session resume or SDK internal token callback.
                // Do NOT reset anything — just return a fresh token.
                try {
                    const accessToken = await generateAccessToken(userId, SUMSUB_LEVEL_NAME);
                    return NextResponse.json({
                        record: formattedRecord,
                        accessToken: accessToken.token,
                    });
                } catch {
                    // Token generation failed — wipe stale record and fall through.
                    deleteVerificationByUserId(userId);
                    formattedRecord = null;
                }
            }
        }

        // ── NEW APPLICANT ─────────────────────────────────────────────────────
        // Validate all required fields before creating.
        for (const field of REQUIRED_FIELDS) {
            if (!(body as any)[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // Clean up any orphaned record without an applicantId.
        if (existingRecord && !formattedRecord?.applicantId) {
            deleteVerificationByUserId(userId);
        }

        let applicantData: { id: string };
        try {
            applicantData = await createApplicant(
                userId,   // externalUserId = email
                {
                    email: userId,
                    phone: body.phone!,
                    firstName: body.firstName!,
                    lastName: body.lastName!,
                    dob: body.dateOfBirth!,
                    country: body.countryOfResidence!,
                },
                SUMSUB_LEVEL_NAME
            );
        } catch (error: any) {
            return NextResponse.json(
                { error: `Verification Setup Failed: ${error.message || "Unknown error"}` },
                { status: 500 }
            );
        }

        const recordId = uuidv4();
        createVerificationRecord({
            id: recordId,
            userId,
            firstName: body.firstName!.trim(),
            lastName: body.lastName!.trim(),
            dateOfBirth: body.dateOfBirth!,
            nationality: body.nationality!,
            email: userId,
            phone: body.phone!.trim(),
            countryOfResidence: body.countryOfResidence!,
            sourceOfFunds: body.sourceOfFunds!,
            sourceOfWealth: body.sourceOfWealth!,
        });

        updateApplicantId(userId, applicantData.id);

        // Generate token using the externalUserId (email) — NOT the internal applicant ID.
        const accessToken = await generateAccessToken(userId, SUMSUB_LEVEL_NAME);
        const finalRecord = formatVerificationRecord(getVerificationByUserId(userId));

        return NextResponse.json({
            record: finalRecord,
            accessToken: accessToken.token,
        });

    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
