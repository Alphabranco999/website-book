// scripts/register-ipn.mjs
//
// Run this ONCE, from your own computer, after your site is live on
// Netlify (so the IPN URL is publicly reachable). This is the only
// time your secret keys should be typed anywhere — into your own
// terminal, on your own machine, never into the website's code.
//
// HOW TO RUN:
//   1. Install Node.js (v18+) on your computer if you don't have it.
//   2. Open a terminal in this folder.
//   3. Run:
//        PESAPAL_CONSUMER_KEY=your_key PESAPAL_CONSUMER_SECRET=your_secret \
//        SITE_URL=https://ownthebook.site node scripts/register-ipn.mjs
//   4. Copy the "ipn_id" it prints out — that's your PESAPAL_IPN_ID.
//      Add it as an environment variable in your Netlify site settings.

const API_BASE = process.env.PESAPAL_ENV === "sandbox"
  ? "https://cybqa.pesapal.com/pesapalv3/api"
  : "https://pay.pesapal.com/v3/api";

const consumer_key = process.env.PESAPAL_CONSUMER_KEY;
const consumer_secret = process.env.PESAPAL_CONSUMER_SECRET;
const site = process.env.SITE_URL;

if (!consumer_key || !consumer_secret || !site) {
  console.error("Missing PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET, or SITE_URL.");
  process.exit(1);
}

const authRes = await fetch(`${API_BASE}/Auth/RequestToken`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ consumer_key, consumer_secret })
});
const authData = await authRes.json();
if (!authData.token) {
  console.error("Auth failed:", authData);
  process.exit(1);
}

const ipnRes = await fetch(`${API_BASE}/URLSetup/RegisterIPN`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${authData.token}`
  },
  body: JSON.stringify({
    url: `${site}/.netlify/functions/ipn-listener`,
    ipn_notification_type: "GET"
  })
});
const ipnData = await ipnRes.json();

console.log("Result:", ipnData);
if (ipnData.ipn_id) {
  console.log("\nYour IPN ID is:", ipnData.ipn_id);
  console.log("Add this in Netlify as an environment variable named PESAPAL_IPN_ID");
}
