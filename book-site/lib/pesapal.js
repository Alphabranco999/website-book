// lib/pesapal.js
// Small shared helper used by every /api function.
// PESAPAL_ENV=sandbox uses Pesapal's test system (fake payments, safe to try anything).
// PESAPAL_ENV=live charges real money — only switch to this once sandbox testing works end to end.

const PESAPAL_ENV = process.env.PESAPAL_ENV || 'sandbox';

const BASE_URL = PESAPAL_ENV === 'live'
  ? 'https://pay.pesapal.com/v3/api'
  : 'https://cybqa.pesapal.com/pesapalv3/api';

async function getAccessToken() {
  const consumer_key = process.env.PESAPAL_CONSUMER_KEY;
  const consumer_secret = process.env.PESAPAL_CONSUMER_SECRET;

  if (!consumer_key || !consumer_secret) {
    throw new Error('Missing PESAPAL_CONSUMER_KEY or PESAPAL_CONSUMER_SECRET environment variables.');
  }

  const response = await fetch(`${BASE_URL}/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ consumer_key, consumer_secret })
  });

  const data = await response.json();

  if (!data.token) {
    throw new Error('Pesapal authentication failed: ' + JSON.stringify(data));
  }

  return data.token;
}

async function getTransactionStatus(orderTrackingId, token) {
  const response = await fetch(
    `${BASE_URL}/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.json();
}

module.exports = { BASE_URL, getAccessToken, getTransactionStatus };
