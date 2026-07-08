// netlify/functions/_pesapal.js
// Shared helpers for talking to the real PesaPal API v3.
// Reads secrets from environment variables — NEVER hardcode keys here.

const API_BASE = process.env.PESAPAL_ENV === "sandbox"
  ? "https://cybqa.pesapal.com/pesapalv3/api"
  : "https://pay.pesapal.com/v3/api";

async function getToken() {
  const consumer_key = process.env.PESAPAL_CONSUMER_KEY;
  const consumer_secret = process.env.PESAPAL_CONSUMER_SECRET;

  if (!consumer_key || !consumer_secret) {
    throw new Error("Missing PESAPAL_CONSUMER_KEY / PESAPAL_CONSUMER_SECRET env vars");
  }

  const res = await fetch(`${API_BASE}/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key, consumer_secret })
  });

  const data = await res.json();
  if (!data.token) {
    throw new Error("PesaPal auth failed: " + JSON.stringify(data));
  }
  return data.token;
}

module.exports = { API_BASE, getToken };
