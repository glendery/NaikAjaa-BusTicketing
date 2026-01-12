
require('dotenv').config();
const midtransClient = require('midtrans-client');

const serverKey = process.env.MIDTRANS_SERVER_KEY;
const clientKey = process.env.MIDTRANS_CLIENT_KEY;

console.log("🔑 Testing Keys:");
console.log(`Server Key: ${serverKey}`);
console.log(`Client Key: ${clientKey}`);

async function testMode(isProduction) {
    console.log(`\n---------------------------------------------------`);
    console.log(`Testing Mode: ${isProduction ? 'PRODUCTION' : 'SANDBOX'}`);
    console.log(`---------------------------------------------------`);

    const snap = new midtransClient.Snap({
        isProduction: isProduction,
        serverKey: serverKey
    });

    const parameter = {
        transaction_details: {
            order_id: "TEST-" + Math.floor(Math.random() * 1000000),
            gross_amount: 10000
        },
        credit_card: {
            secure: true
        },
        customer_details: {
            first_name: "Test",
            last_name: "User",
            email: "test@example.com",
            phone: "08111222333"
        }
    };

    try {
        const transaction = await snap.createTransaction(parameter);
        console.log(`✅ SUCCESS in ${isProduction ? 'PRODUCTION' : 'SANDBOX'} Mode!`);
        console.log("Token:", transaction.token);
        console.log("Redirect URL:", transaction.redirect_url);
        return true;
    } catch (e) {
        console.log(`❌ FAILED in ${isProduction ? 'PRODUCTION' : 'SANDBOX'} Mode.`);
        console.log("Error Message:", e.message);
        // console.log("Full Error:", JSON.stringify(e, null, 2));
        return false;
    }
}

async function runTests() {
    console.log("🚀 Starting Midtrans Key Verification...");
    
    // Test Sandbox First
    const sandboxResult = await testMode(false);
    
    // Test Production Second
    const productionResult = await testMode(true);

    console.log("\n===================================================");
    console.log("SUMMARY");
    console.log("===================================================");
    console.log(`Sandbox Mode:    ${sandboxResult ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`Production Mode: ${productionResult ? '✅ WORKING' : '❌ FAILED'}`);

    if (sandboxResult && !productionResult) {
        console.log("\nConclusion: These are SANDBOX keys.");
    } else if (!sandboxResult && productionResult) {
        console.log("\nConclusion: These are PRODUCTION keys.");
    } else if (sandboxResult && productionResult) {
        console.log("\nConclusion: Keys work in BOTH? (Unlikely, but okay)");
    } else {
        console.log("\nConclusion: Keys are INVALID or Blocked.");
    }
}

runTests();
