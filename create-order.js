
// netlify/functions/create-order.js
//
// Runs on Netlify's server. Creates a real PesaPal order with a
// callback_url pointing at your thank-you.html — this is the ONLY
// way to get PesaPal to redirect buyers back to your site after
// payment. A simple dashboard "Payment Link" cannot do this; only
// the Order API (which this function calls) supports it.

const PESAPAL_BASE =
  process.env.PESAPAL_ENV === "live"
    ? "https://pay.pesapal.com/v3"
    : "https://cybqa.pesapal.com/pesapalv3";

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Use POST." }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const email = body.email;

    if (!email || !email.includes("@")) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Valid email required." }) };
    }

    const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
    const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;
    const ipnId = process.env.PESAPAL_IPN_ID;
    const siteUrl = process.env.SITE_URL; // e.g. https://yoursite.netlify.app

    if (!consumerKey || !consumerSecret || !ipnId || !siteUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error:
            "Server is missing setup. Check PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET, PESAPAL_IPN_ID, and SITE_URL environment variables.",
        }),
      };
    }

    // Step 1: authenticate
    const authRes = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret }),
    });
    const authData = await authRes.json();

    if (!authRes.ok || !authData.token) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "PesaPal authentication failed.", detail: authData }),
      };
    }

    // Step 2: submit the order, with callback_url = your thank-you page
    const orderId = "OTB-" + Date.now();
    const submitRes = await fetch(`${PESAPAL_BASE}/api/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${authData.token}`,
      },
      body: JSON.stringify({
        id: orderId,
        currency: "UGX",
        amount: 20000,
        description: "Own The Buyer - Full PDF",
        callback_url: `${siteUrl}/thank-you.html`,
        notification_id: ipnId,
        billing_address: {
          email_address: email,
          country_code: "UG",
          first_name: "Buyer",
          last_name: "Buyer",
        },
      }),
    });
    const submitData = await submitRes.json();

    if (!submitRes.ok || !submitData.redirect_url) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "Could not create PesaPal order.", detail: submitData }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ redirect_url: submitData.redirect_url, orderTrackingId: submitData.order_tracking_id }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Unexpected server error.", detail: String(err) }) };
  }
};
