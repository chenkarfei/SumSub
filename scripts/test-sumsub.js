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
    console.log("  " + res.status + " " + method + " " + path + " => " + text.slice(0, 300));
    if (!res.ok) return null;
    try { return { status: res.status, data: JSON.parse(text) }; }
    catch { return { status: res.status, data: text }; }
}

async function probeLevel(name) {
    var path = "/resources/applicants?levelName=" + encodeURIComponent(name);
    var payload = {
        externalUserId: "probe-" + Date.now(),
        email: "test@example.com",
        phone: "+60123456789",
        info: { firstName: "Test", lastName: "User", dob: "1990-01-15", country: "MY" },
    };
    var r = await request("POST", path, payload);
    if (r && r.data && r.data.id) return r.data.id;
    return null;
}

async function main() {
    console.log("=== Discovering Sumsub Level Name ===\n");

    // Try fetching levels from various known endpoints
    var endpoints = [
        "/resources/levels",
        "/resources/applicants/-/levels",
        "/resources/level",
    ];
    var levelName = null;

    for (var i = 0; i < endpoints.length; i++) {
        var r = await request("GET", endpoints[i]);
        if (r && r.data) {
            var d = r.data;
            console.log("   Parsed: " + JSON.stringify(d).slice(0, 500));
            // Try to extract level name
            var items = d.list || d.items || (Array.isArray(d) ? d : null);
            if (items && items.length > 0) {
                levelName = items[0].id || items[0].name || items[0].levelName;
                console.log("   Found level: " + levelName);
                break;
            }
        }
    }

    // If API didn't reveal levels, brute-force common names
    if (!levelName) {
        console.log("\nAPI didn't reveal levels. Probing common names...\n");
        var commonNames = [
            "basic-kyc-level",
            "kyc-level",
            "sdk-level",
            "basic",
            "default",
            "identity-verification",
            "identity",
            "id-verification",
            "standard-kyc-level",
            "verification-level",
        ];
        for (var j = 0; j < commonNames.length; j++) {
            var name = commonNames[j];
            console.log("  Probing: " + name + "...");
            var id = await probeLevel(name);
            if (id) {
                levelName = name;
                console.log("  FOUND! Level = '" + name + "', Applicant ID = " + id);
                break;
            }
        }
    }

    if (!levelName) {
        console.log("\nFAILED: Cannot find a valid level name.");
        console.log("Please go to Sumsub Cockpit > Applicants > Levels and flows");
        console.log("and create a level (e.g., 'basic-kyc-level'), then update the code.");
        process.exit(1);
    }

    // Create a real applicant and token
    console.log("\n=== Creating applicant for production use ===");
    var path = "/resources/applicants?levelName=" + encodeURIComponent(levelName);
    var payload = {
        externalUserId: "prod-test-" + Date.now(),
        email: "test@example.com",
        phone: "+60123456789",
        info: { firstName: "Test", lastName: "User", dob: "1990-01-15", country: "MY" },
    };
    var res = await request("POST", path, payload);
    if (!res || !res.data || !res.data.id) process.exit(1);
    var applicantId = res.data.id;

    // Token
    var tokenRes = await request("POST", "/resources/accessTokens", {
        userId: applicantId,
        ttlInSecs: 600,
        levelName: levelName,
    });
    if (tokenRes && tokenRes.data && tokenRes.data.token) {
        console.log("Token: " + tokenRes.data.token.slice(0, 40) + "...");
    }

    console.log("\n=== RESULT ===");
    console.log('Level name: "' + levelName + '"');
}
main().catch(function (e) { console.error(e); process.exit(1); });