// scripts/register-ipn.js
//
// Run this ONCE after your site is deployed and has a real URL, to register
// your IPN endpoint with Pesapal. It prints an ipn_id — copy that into the
// PESAPAL_IPN_ID environment variable, then redeploy.
//
// Usage:
//   PESAPAL_CONSUMER_KEY=xxx PESAPAL_CONSUMER_SECRET=yyy PESAPAL_ENV=sandbox SITE_URL=https://your-site.vercel.app node scripts/register-ipn.js
//
// Run it again (with PESAPAL_ENV=live and your live keys) when you switch to production —
// sandbox and live each need their own registered IPN url / id.

const PESAPAL_ENV = process.env.PESAPAL_ENV || 'sandbox';
const BASE_URL = PESAPAL_ENV === 'live'
  ? 'https://pay.pesapal.com/v3/api'
  : 'https://cybqa.pesapal.com/pesapalv3/api';

async function main() {
  const { PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET, SITE_URL } = process.env;

  if (!PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET || !SITE_URL) {
    console.error('Set PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET, and SITE_URL before running this script.');
    process.exit(1);
  }

  const authRes = await fetch(`${BASE_URL}/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      consumer_key: PESAPAL_CONSUMER_KEY,
      consumer_secret: PESAPAL_CONSUMER_SECRET
    })
  });
  const authData = await authRes.json();

  if (!authData.token) {
    console.error('Authentication failed:', authData);
    process.exit(1);
  }

  const ipnRes = await fetch(`${BASE_URL}/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${authData.token}`
    },
    body: JSON.stringify({
      url: `${SITE_URL}/api/ipn`,
      ipn_notification_type: 'GET'
    })
  });
  const ipnData = await ipnRes.json();

  if (ipnData.ipn_id) {
    console.log('IPN registered successfully.');
    console.log('Set this as your PESAPAL_IPN_ID environment variable:');
    console.log(ipnData.ipn_id);
  } else {
    console.error('Registration failed:', ipnData);
    process.exit(1);
  }
}

main();
