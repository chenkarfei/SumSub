import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
    createVerificationRecord,
    getVerificationByContactId,
    getVerificationByUserId,
    updateApplicantId,
    deleteVerificationByUserId,
    resetDocumentUploads,
    updatePersonalInfo,
    updateKycSessionId,
    formatVerificationRecord,
} from "@/lib/db";
import {
    createApplicant,
    generateAccessToken,
    resetApplicant,
} from "@/lib/sumsub";
import { UserInfo, SUMSUB_LEVEL_NAME } from "@/lib/types";
import { getContactSession } from "@/lib/session";
import { logAuditEvent } from "@/lib/db-audit";

const REQUIRED_FIELDS: (keyof UserInfo)[] = [
    "firstName", "lastName", "dateOfBirth", "nationality",
    "email", "phone", "countryOfResidence", "sourceOfFunds", "sourceOfWealth",
];

export async function POST(request: NextRequest) {
    try {
        // Require contact session
        const session = await getContactSession(request);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body: Partial<UserInfo> = await request.json();

        // Identity comes from session, not from the form body
        const contactId = session.contactId;
        const agentId = session.agentId;
        const userId = contactId; // use contactId as the stable DB key

        const isFullSubmission = REQUIRED_FIELDS.every(f => !!(body as Record<string, unknown>)[f]);

        // Look up by contact_id (new) or fall back to user_id for legacy records
        let existingRecord = getVerificationByContactId(contactId)
            ?? (body.email ? getVerificationByUserId(body.email.toLowerCase().trim()) : undefined);
        let formattedRecord = existingRecord ? formatVerificationRecord(existingRecord) : null;

        // ── EXISTING APPLICANT ────────────────────────────────────────────────
        if (formattedRecord?.applicantId) {
            if (isFullSubmission) {
                try {
                    await resetApplicant(formattedRecord.applicantId);
                } catch {
                    deleteVerificationByUserId(userId);
                    formattedRecord = null;
                }

                if (formattedRecord) {
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
                    resetDocumentUploads(userId);
                    updateKycSessionId(contactId, session.sessionId);

                    logAuditEvent({
                        agentId,
                        contactId,
                        actorType: "contact",
                        actorId: contactId,
                        eventType: "contact.kyc.step_started",
                        eventData: { step: "personal_details_resubmit" },
                    });

                    const accessToken = await generateAccessToken(userId, SUMSUB_LEVEL_NAME);
                    const updatedRecord = formatVerificationRecord(getVerificationByContactId(contactId));
                    return NextResponse.json({ record: updatedRecord, accessToken: accessToken.token });
                }
            } else {
                try {
                    const accessToken = await generateAccessToken(userId, SUMSUB_LEVEL_NAME);
                    return NextResponse.json({ record: formattedRecord, accessToken: accessToken.token });
                } catch {
                    deleteVerificationByUserId(userId);
                    formattedRecord = null;
                }
            }
        }

        // ── NEW APPLICANT ─────────────────────────────────────────────────────
        for (const field of REQUIRED_FIELDS) {
            if (!(body as Record<string, unknown>)[field]) {
                return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
            }
        }

        if (existingRecord && !formattedRecord?.applicantId) {
            deleteVerificationByUserId(userId);
        }

        // Use agentId:contactId as externalUserId so Sumsub entries are scoped per agent
        const externalUserId = `${agentId}:${contactId}`;

        let applicantData: { id: string } | null = null;
        try {
            applicantData = await createApplicant(
                externalUserId,
                {
                    email: body.email!,
                    phone: body.phone!,
                    firstName: body.firstName!,
                    lastName: body.lastName!,
                    dob: body.dateOfBirth!,
                    country: body.countryOfResidence!,
                },
                SUMSUB_LEVEL_NAME
            );
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            // 409 means Sumsub already has this applicant — recover the existing ID silently
            if (msg.includes("409")) {
                try {
                    const jsonStart = msg.indexOf("{");
                    const parsed = JSON.parse(msg.slice(jsonStart));
                    const match = (parsed.description as string)?.match(/already exists:\s*(\w+)/);
                    if (match) applicantData = { id: match[1] };
                } catch { /* fall through to error below */ }
            }
            if (!applicantData) {
                const friendly = msg.includes("409")
                    ? "A verification record for this contact already exists. Please refresh and try again."
                    : "Unable to start verification. Please try again or contact support.";
                return NextResponse.json({ error: friendly }, { status: 500 });
            }
        }

        const recordId = uuidv4();
        createVerificationRecord({
            id: recordId,
            userId,
            firstName: body.firstName!.trim(),
            lastName: body.lastName!.trim(),
            dateOfBirth: body.dateOfBirth!,
            nationality: body.nationality!,
            email: body.email!,
            phone: body.phone!.trim(),
            countryOfResidence: body.countryOfResidence!,
            sourceOfFunds: body.sourceOfFunds!,
            sourceOfWealth: body.sourceOfWealth!,
            contactId,
            agentId,
            kycSessionId: session.sessionId,
        });

        updateApplicantId(userId, applicantData!.id);

        logAuditEvent({
            agentId,
            contactId,
            actorType: "contact",
            actorId: contactId,
            eventType: "contact.kyc.step_started",
            eventData: { step: "personal_details", applicantId: applicantData!.id },
        });

        const accessToken = await generateAccessToken(externalUserId, SUMSUB_LEVEL_NAME);
        const finalRecord = formatVerificationRecord(getVerificationByContactId(contactId));

        return NextResponse.json({ record: finalRecord, accessToken: accessToken.token });

    } catch (error) {
        console.error("[verify]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
