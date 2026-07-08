
// netlify/functions/verify-payment.js
//
// Runs on Netlify's server, never in the buyer's browser.
// Reads your PesaPal Consumer Key/Secret from environment variables
// (set in Netlify dashboard, NOT written in this file) and asks
// PesaPal directly whether a given OrderTrackingId was really paid.
//
// PESAPAL_ENV controls which PesaPal API is used:
//   "sandbox" -> https://cybqa.pesapal.com/pesapalv3   (testing)
//   "live"    -> https://pay.pesapal.com/v3            (real money)

const PESAPAL_BASE =
  process.env.PESAPAL_ENV === "live"
    ? "https://pay.pesapal.com/v3"
    : "https://cybqa.pesapal.com/pesapalv3";

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const orderTrackingId = event.queryStringParameters &&
      event.queryStringParameters.orderTrackingId;

    if (!orderTrackingId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing orderTrackingId." }),
      };
    }

    const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
    const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Server is missing PesaPal credentials (env vars not set).",
        }),
      };
    }

    // Step 1: authenticate with PesaPal to get a bearer token
    const authRes = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
      }),
    });
    const authData = await authRes.json();

    if (!authRes.ok || !authData.token) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "Could not authenticate with PesaPal.",
          detail: authData,
        }),
      };
    }

    // Step 2: ask PesaPal for the real status of this order
    const statusRes = await fetch(
      `${PESAPAL_BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(
        orderTrackingId
      )}`,
      {
        headers: {
          Authorization: `Bearer ${authData.token}`,
          Accept: "application/json",
        },
      }
    );
    const statusData = await statusRes.json();

    if (!statusRes.ok) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "Could not fetch transaction status.",
          detail: statusData,
        }),
      };
    }

    // PesaPal's payment_status_description is the authoritative field.
    // Typical values: "COMPLETED", "FAILED", "INVALID", "REVERSED"
    const statusDescription = (statusData.payment_status_description || "").toUpperCase();
    const paid = statusDescription === "COMPLETED";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        paid,
        status: statusDescription || "UNKNOWN",
        amount: statusData.amount,
        currency: statusData.currency,
        confirmationCode: statusData.confirmation_code,
        merchantReference: statusData.merchant_reference,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Unexpected server error.", detail: String(err) }),
    };
  }
};
