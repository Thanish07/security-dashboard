const http = require('http');

function post(path, data) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(data);
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': payload.length
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function testDynamicOTP() {
    const credentials = { email: 'admin@university.edu', password: 'admin123' };

    console.log("Attempt 1: Requesting OTP...");
    const res1 = await post('/login', credentials);
    if (res1.requireMfa) {
        console.log("✅ Attempt 1: MFA Required. Check server console for Code 1.");
    } else {
        console.error("❌ Attempt 1 Failed");
    }

    console.log("\nAttempt 2: Requesting OTP again (Should be different)...");
    const res2 = await post('/login', credentials);
    if (res2.requireMfa) {
        console.log("✅ Attempt 2: MFA Required. Check server console for Code 2.");
    } else {
        console.error("❌ Attempt 2 Failed");
    }
}

testDynamicOTP();
