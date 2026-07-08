// netlify/functions/create-order.js
// Called from the buy button. Creates a REAL order with PesaPal and
// returns the redirect_url the buyer should be sent to.

const { API_BASE, getToken } = require("./_pesapal");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const email = (body.email || "").trim();

    if (!email || !email.includes("@")) {
      return { statusCode: 400, body: JSON.stringify({ error: "Valid email is required" }) };
    }

    const token = await getToken();

    const site = process.env.SITE_URL; // e.g. https://ownthebook.site
    if (!site) throw new Error("Missing SITE_URL env var");

    const notification_id = process.env.PESAPAL_IPN_ID;
    if (!notification_id) throw new Error("Missing PESAPAL_IPN_ID env var — register your IPN first");

    const merchantRef = "OTB-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);

    const orderRes = await fetch(`${API_BASE}/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id: merchantRef,
        currency: "UGX",
        amount: 20000,
        description: "Own The Buyer - PDF",
        callback_url: `${site}/thank-you.html`,
        notification_id,
        billing_address: {
          email_address: email
        }
      })
    });

    const order = await orderRes.json();

    if (!order.redirect_url) {
      return { statusCode: 502, body: JSON.stringify({ error: "PesaPal did not return a payment link", details: order }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        redirect_url: order.redirect_url,
        order_tracking_id: order.order_tracking_id,
        merchant_reference: merchantRef
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
