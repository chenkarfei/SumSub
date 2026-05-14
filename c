/**
 * Test script: discovers Sumsub level names and creates a test applicant.
 * Run with: node scripts/test-sumsub.js
 */
const crypto = require("crypto");

const APP_TOKEN = "sbx:JfFF4FPlNSuJ5LP33ySdkM4w.ds3eTUytGq6zr0773eGyspspA1dkBg52";
const SECRET_KEY = "B68RJA2oOrdukp0YiHizh41LsMkj9kyF";
const BASE_URL = "https://api.sumsub.com";

function createSignature(ts, method, path, body) {
    const data = ts + method.toUpperCase() + path + (body || "");
    return crypto.createHmac("sha256", SECRET_KEY).update(data).digest("hex");
}

function buildHeaders(ts, method, path, body) {
    return {
        "X-App-Token": APP_TOKEN,
        "X-App-Access-Ts": String(ts),
        "X-App-Access-Sig": createSignature(ts, method, path, body),
        "Content-Type": "application/json",
        Accept: "application/json",
    };
}

async function request(method, path, body) {
    const ts = Math.floor(Date.now() / 1000);
    const bodyStr = body ? JSON.stringify(body) : null;
    const res = await fetch(BASE_URL + path, {
        method,
        headers: buildHeaders(ts, method, path, bodyStr),
        body: bodyStr,
    });
    const text = await res.text();
    if (!res.ok) {
        console.error(`  ❌ ${method} ${path} → ${res.status}: ${text}`);
        return null;
    }
    try {
        return { status: res.status, data: JSON.parse(text) };
    } catch {
        return { status: res.status, data: text };
    }
}

async function main() {
    console.log("=== Sumsub API Test ===\n");

    // 1. Check what levels exist
    console.log("1️⃣  Fetching available levels...");
    const levelsRes = await request("GET", "/resources/applicant-levels");
    if (levelsRes?.data) {
        const levels = levelsRes.data;
        if (Array.isArray(levels) && levels.length > 0) {
            console.log("   Available levels:");
            levels.forEach((l) =>
                console.log(`     • ${l.id || l.name}  (name: ${l.name || "N/A"})`)
            );
            var levelName = levels[0].id || levels[0].name;
            console.log(`   → Using level: "${levelName}"`);
        } else {
            console.log("   Response:", JSON.stringify(levels).slice(0, 300));
            console.log("   → Will try without level name first");
            var levelName = null;
        }
    } else {
        console.log("   Could not fetch levels. Continuing without level name.");
        var levelName = null;
    }

    // 2. Try to create an applicant
    console.log("\n2️⃣  Creating test applicant...");
    const testExternalId = "test-user-" + Date.now();
    var applicantPayload = {
        externalUserId: testExternalId,
        email: "test@example.com",
        phone: "+60123456789",
        info: {
            firstName: "Test",
            lastName: "User",
            dob: "1990-01-15",
            country: "MY",
        },
    };

    // Add levelName to path if we found one
    var path = "/resources/applicants";
    if (levelName) {
        path += "?levelName=" + encodeURIComponent(levelName);
    }

    const applicantRes = await request("POST", path, applicantPayload);
    if (!applicantRes?.data) {
        console.log("   ❌ Failed to create applicant");

        // Try again with body-level approach
        if (levelName) {
            console.log("\n2b️⃣ Retrying with levelName in body...");
            applicantPayload.levelName = levelName;
            const retryRes = await request("POST", "/resources/applicants", applicantPayload);
            if (retryRes?.data) {
                console.log("   ✅ Applicant created with levelName in body!");
                var applicantId = retryRes.data.id;
            } else {
                console.log("   ❌ Still failed");
                process.exit(1);
            }
        } else {
            process.exit(1);
        }
    } else {
        console.log("   ✅ Applicant created:", applicantRes.data.id);
        var applicantId = applicantRes.data.id;
    }

    // 3. Generate access token
    console.log("\n3️⃣  Generating WebSDK access token...");
    var tokenPayload = {
        userId: applicantId,
        ttlInSecs: 1800,
    };
    if (levelName) {
        tokenPayload.levelName = levelName;
    }
    const tokenRes = await request("POST", "/resources/accessTokens", tokenPayload);
    if (tokenRes?.data?.token) {
        console.log("   ✅ Token generated:", tokenRes.data.token.slice(0, 20) + "...");
    } else {
        console.log("   ❌ Token generation failed. Trying without levelName...");
        const tokenRes2 = await request("POST", "/resources/accessTokens", {
            userId: applicantId,
            ttlInSecs: 1800,
        });
        if (tokenRes2?.data?.token) {
            console.log("   ✅ Token generated (without levelName):", tokenRes2.data.token.slice(0, 20) + "...");
        } else {
            console.log("   ❌ Token generation still failed");
        }
    }

    console.log("\n=== Test Complete ===");
}

main().catch((e) => {
    console.error("Fatal:", e.message);
    process.exit(1);
});