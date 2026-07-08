
// netlify/functions/register-ipn.js
//
// RUN THIS ONCE, by visiting its URL in your browser after you deploy:
//   https://yoursite.netlify.app/.netlify/functions/register-ipn
//
// It registers your thank-you.html page as PesaPal's notification
// URL and gives you back an "ipn_id". Copy that ID into a new
// environment variable called PESAPAL_IPN_ID on Netlify. You only
// need to do this once (or again if you ever change your domain).

const PESAPAL_BASE =
  process.env.PESAPAL_ENV === "live"
    ? "https://pay.pesapal.com/v3"
    : "https://cybqa.pesapal.com/pesapalv3";

exports.handler = async () => {
  const headers = { "Content-Type": "application/json" };

  try {
    const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
    const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;
    const siteUrl = process.env.SITE_URL;

    if (!consumerKey || !consumerSecret || !siteUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Set PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET, and SITE_URL first, then redeploy.",
        }),
      };
    }

    const authRes = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret }),
    });
    const authData = await authRes.json();

    if (!authRes.ok || !authData.token) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Auth failed.", detail: authData }) };
    }

    const ipnRes = await fetch(`${PESAPAL_BASE}/api/URLSetup/RegisterIPN`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${authData.token}`,
      },
      body: JSON.stringify({
        url: `${siteUrl}/thank-you.html`,
        ipn_notification_type: "GET",
      }),
    });
    const ipnData = await ipnRes.json();

    if (!ipnRes.ok || !ipnData.ipn_id) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Could not register IPN.", detail: ipnData }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Success. Copy the ipn_id below into a Netlify environment variable named PESAPAL_IPN_ID, then redeploy.",
        ipn_id: ipnData.ipn_id,
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Unexpected error.", detail: String(err) }) };
  }
};
