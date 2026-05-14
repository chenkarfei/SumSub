import { NextRequest, NextResponse } from "next/server";
import {
    getVerificationByUserId,
    formatVerificationRecord,
    updateVerificationStatus,
} from "@/lib/db";
import { getApplicantData } from "@/lib/sumsub";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json(
                { error: "Missing userId parameter" },
                { status: 400 }
            );
        }

        const record = getVerificationByUserId(userId);
        const formatted = record ? formatVerificationRecord(record) : null;

        if (!formatted) {
            return NextResponse.json(
                { error: "No verification record found" },
                { status: 404 }
            );
        }

        if (formatted.applicantId && (formatted.status === 'processing' || formatted.status === 'pending')) {
            try {
                const sumsubData = await getApplicantData(formatted.applicantId);
                const sumsubAnswer = sumsubData.review.reviewAnswer;
                const sumsubStatus = sumsubData.review.reviewStatus;

                let newStatus = formatted.status;
                if (sumsubStatus === 'completed') {
                    newStatus = (sumsubAnswer === 'GREEN' ? 'GREEN' : 'RED') as any;
                } else if (sumsubStatus === 'init') {
                    newStatus = 'pending';
                }

                if (newStatus !== formatted.status) {
                    updateVerificationStatus(formatted.applicantId, newStatus);
                    formatted.status = newStatus;
                }

                (formatted as any).sumsubStatus = sumsubStatus;
            } catch (e) {
                console.error("Failed to sync with Sumsub:", e);
            }
        }

        return NextResponse.json(formatted);
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, sourceOfFunds, sourceOfWealth } = body;

        if (!userId) {
            return NextResponse.json(
                { error: "Missing userId" },
                { status: 400 }
            );
        }

        const record = getVerificationByUserId(userId);
        if (!record) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        const db = (await import("@/lib/db")).getDb();
        const updates: string[] = [];
        const params: any[] = [];

        if (sourceOfFunds) {
            updates.push("source_of_funds = ?");
            params.push(sourceOfFunds);
        }
        if (sourceOfWealth) {
            updates.push("source_of_wealth = ?");
            params.push(sourceOfWealth);
        }

        if (updates.length > 0) {
            updates.push("updated_at = datetime('now')");
            params.push(userId);
            db.prepare(
                `UPDATE verification_records SET ${updates.join(", ")} WHERE user_id = ?`
            ).run(...params);
        }

        const updatedRecord = getVerificationByUserId(userId);
        return NextResponse.json(formatVerificationRecord(updatedRecord));
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}