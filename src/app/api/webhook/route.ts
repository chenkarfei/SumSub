import { NextRequest, NextResponse } from "next/server";
import { validateWebhookSignature } from "@/lib/sumsub";
import {
    getVerificationByApplicantId,
    updateVerificationStatus,
} from "@/lib/db";
import { SumsubWebhookPayload } from "@/lib/types";
import { logAuditEvent } from "@/lib/db-audit";

/**
 * POST /api/webhook
 * Receives Sumsub webhook events for applicant review results.
 * Updates the verification status in our database.
 *
 * Supported event types:
 * - applicantReviewed: When an applicant's review is completed (GREEN/RED)
 * - applicantPending: When review enters pending state
 * - applicantOnHold: When review is placed on hold
 */
export async function POST(request: NextRequest) {
    try {
        // Get the raw body for signature verification
        const rawBody = await request.text();
        let body: SumsubWebhookPayload;

        try {
            body = JSON.parse(rawBody);
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON payload" },
                { status: 400 }
            );
        }

        // Validate the webhook signature
        const signature = request.headers.get("x-payload-digest") || "";
        const isValid = validateWebhookSignature(rawBody, signature);

        if (!isValid) {
            console.warn("Invalid webhook signature received");
            return NextResponse.json(
                { error: "Invalid signature" },
                { status: 401 }
            );
        }

        console.log("Webhook received:", {
            type: body.type,
            applicantId: body.applicantId,
            reviewStatus: body.reviewStatus,
            reviewAnswer: body.reviewResult?.reviewAnswer,
        });

        // Handle different webhook event types
        switch (body.type) {
            case "applicantReviewed": {
                // The review is complete - update status based on reviewAnswer
                const status = body.reviewResult?.reviewAnswer || "RED";

                // Find the verification record by applicant ID
                const record = getVerificationByApplicantId(body.applicantId);
                if (!record) {
                    console.warn(
                        `No verification record found for applicant: ${body.applicantId}`
                    );
                    return NextResponse.json(
                        { error: "Applicant not found" },
                        { status: 404 }
                    );
                }

                // Update the verification status
                updateVerificationStatus(
                    body.applicantId,
                    status,
                    body.inspectionId
                );

                // Log audit event so agents can see the Sumsub result
                const contactId = (record as Record<string, unknown>).contact_id as string | null;
                const agentId = (record as Record<string, unknown>).agent_id as string | null;
                if (contactId) {
                    logAuditEvent({
                        agentId,
                        contactId,
                        actorType: "system",
                        actorId: "sumsub",
                        eventType: "contact.kyc.sumsub_result",
                        eventData: {
                            reviewAnswer: status,
                            rejectLabels: body.reviewResult?.rejectLabels ?? [],
                            reviewRejectType: body.reviewResult?.reviewRejectType,
                            applicantId: body.applicantId,
                        },
                    });
                }

                console.log(
                    `Verification status updated to ${status} for applicant: ${body.applicantId}`
                );
                break;
            }

            case "applicantPending": {
                // Review is queued/pending
                updateVerificationStatus(body.applicantId, "processing");
                break;
            }

            case "applicantOnHold": {
                // Review is on hold - keep as processing for now
                console.log(
                    `Applicant ${body.applicantId} review is on hold`
                );
                break;
            }

            default: {
                console.log(`Unhandled webhook type: ${body.type}`);
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/webhook
 * Health check endpoint for webhook configuration testing.
 */
export async function GET() {
    return NextResponse.json({
        status: "Webhook endpoint is active",
        supportedTypes: [
            "applicantReviewed",
            "applicantPending",
            "applicantOnHold",
        ],
    });
}