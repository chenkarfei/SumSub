import { NextRequest, NextResponse } from "next/server";
import {
    getVerificationByContactId,
    formatVerificationRecord,
    updateVerificationStatus,
    getDb,
} from "@/lib/db";
import { getApplicantData } from "@/lib/sumsub";
import { getContactSession } from "@/lib/session";

export async function GET(request: NextRequest) {
    try {
        const session = await getContactSession(request);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const record = getVerificationByContactId(session.contactId);
        const formatted = record ? formatVerificationRecord(record) : null;

        if (!formatted) {
            return NextResponse.json({ error: "No verification record found" }, { status: 404 });
        }

        if (formatted.applicantId && (formatted.status === "processing" || formatted.status === "pending")) {
            try {
                const sumsubData = await getApplicantData(formatted.applicantId);
                const sumsubAnswer = sumsubData.review.reviewAnswer;
                const sumsubStatus = sumsubData.review.reviewStatus;

                let newStatus = formatted.status;
                if (sumsubStatus === "completed") {
                    newStatus = (sumsubAnswer === "GREEN" ? "GREEN" : "RED") as typeof newStatus;
                } else if (sumsubStatus === "init") {
                    newStatus = "pending";
                }

                if (newStatus !== formatted.status) {
                    updateVerificationStatus(formatted.applicantId, newStatus);
                    formatted.status = newStatus;
                }

                (formatted as Record<string, unknown>).sumsubStatus = sumsubStatus;
            } catch (e) {
                console.error("Failed to sync with Sumsub:", e);
            }
        }

        return NextResponse.json(formatted);
    } catch (error) {
        console.error("[user GET]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await getContactSession(request);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { sourceOfFunds, sourceOfWealth } = body;

        const record = getVerificationByContactId(session.contactId);
        if (!record) {
            return NextResponse.json({ error: "No verification record found" }, { status: 404 });
        }

        const db = getDb();
        const updates: string[] = [];
        const params: unknown[] = [];

        if (sourceOfFunds) { updates.push("source_of_funds = ?"); params.push(sourceOfFunds); }
        if (sourceOfWealth) { updates.push("source_of_wealth = ?"); params.push(sourceOfWealth); }

        if (updates.length > 0) {
            updates.push("updated_at = datetime('now')");
            params.push(session.contactId);
            db.prepare(
                `UPDATE verification_records SET ${updates.join(", ")} WHERE contact_id = ?`
            ).run(...params);
        }

        const updatedRecord = getVerificationByContactId(session.contactId);
        return NextResponse.json(formatVerificationRecord(updatedRecord));
    } catch (error) {
        console.error("[user PUT]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
