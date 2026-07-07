/**
 * OWN THE BUYER — PesaPal backend example (Node.js + Express)
 * -----------------------------------------------------------
 * This is the piece the static website (index.html) is missing:
 * a small server that talks to PesaPal on your behalf, because
 * your consumer key/secret must NEVER sit in frontend JavaScript.
 *
 * Read PESAPAL_SETUP_GUIDE.md first — it explains every step below
 * in plain language and tells you exactly where to get each value.
 *
 * Install:
 *   npm init -y
 *   npm install express axios dotenv
 *
 * Run:
 *   node server-example.js
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());
app.use(express.static('.')); // serves index.html from the same folder

// ---- 1. Your PesaPal credentials (put these in a .env file, never in code) ----
const PESAPAL_BASE = process.env.PESAPAL_ENV === 'live'
  ? 'https://pay.pesapal.com/v3'
  : 'https://cybqa.pesapal.com/pesapalv3'; // sandbox for testing

const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;       // from developer.pesapal.com
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET; // from developer.pesapal.com
const CALLBACK_URL = process.env.CALLBACK_URL;               // e.g. https://yourdomain.com/payment-complete.html
const IPN_URL = process.env.IPN_URL;                         // e.g. https://yourdomain.com/api/pesapal/ipn

let cachedIpnId = null; // set after you register your IPN once (step 3)

// ---- Simple order store (swap this for a real database in production) ----
// Maps orderId -> { status: 'pending' | 'PAID', orderTrackingId }
const orders = new Map();

// ---- 2. Get an auth token from PesaPal ----
async function getAccessToken() {
  const { data } = await axios.post(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    consumer_key: CONSUMER_KEY,
    consumer_secret: CONSUMER_SECRET,
  });
  return data.token;
}

// ---- 3. Register your IPN URL (do this once, then hardcode the returned ipn_id) ----
app.get('/api/pesapal/register-ipn', async (req, res) => {
  try {
    const token = await getAccessToken();
    const { data } = await axios.post(
      `${PESAPAL_BASE}/api/URLSetup/RegisterIPN`,
      { url: IPN_URL, ipn_notification_type: 'GET' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    cachedIpnId = data.ipn_id;
    res.json(data); // copy the ipn_id from here into your .env as PESAPAL_IPN_ID
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ---- 4. Start a payment: the frontend "Pay Now" button calls this ----
app.post('/api/pesapal/initiate', async (req, res) => {
  const { phone, network, amount } = req.body; // amount should always be re-set server-side (20000), never trust the client
  try {
    const token = await getAccessToken();
    const orderId = 'OTB-' + Date.now(); // your own unique order reference

    const { data } = await axios.post(
      `${PESAPAL_BASE}/api/Transactions/SubmitOrderRequest`,
      {
        id: orderId,
        currency: 'UGX',
        amount: 20000,
        description: 'Own The Buyer - eBook',
        callback_url: CALLBACK_URL,
        notification_id: process.env.PESAPAL_IPN_ID || cachedIpnId,
        billing_address: {
          phone_number: phone,
          email_address: '',
          country_code: 'UG',
          first_name: 'Customer',
          last_name: 'Buyer',
        },
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Save the order as pending, keyed by both our orderId and PesaPal's tracking id
    // so the payment-complete page (which only gets OrderTrackingId back) can find it.
    orders.set(orderId, { status: 'pending', orderTrackingId: data.order_tracking_id });
    orders.set(data.order_tracking_id, { status: 'pending', orderId });

    res.json({ redirect_url: data.redirect_url, order_tracking_id: data.order_tracking_id, order_id: orderId });
    // Frontend should redirect the browser to redirect_url.
    // PesaPal's hosted page sends the actual MTN/Airtel USSD prompt to the phone.
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ---- 5. PesaPal calls this automatically once the customer approves on their phone ----
app.get('/api/pesapal/ipn', async (req, res) => {
  const { OrderTrackingId } = req.query;
  try {
    const token = await getAccessToken();
    const { data } = await axios.get(
      `${PESAPAL_BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (data.payment_status_description === 'Completed') {
      // Mark the matching order as PAID (in real life: write this to your database).
      const record = orders.get(OrderTrackingId);
      if (record) {
        record.status = 'PAID';
        orders.set(OrderTrackingId, record);
        if (record.orderId) {
          const byOrderId = orders.get(record.orderId) || {};
          byOrderId.status = 'PAID';
          orders.set(record.orderId, byOrderId);
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ---- 5b. Frontend polls this after redirect to see if payment has cleared yet ----
// PesaPal's callback_url redirect includes ?OrderTrackingId=...&OrderMerchantReference=...
// The frontend calls this repeatedly (every 2-3s) until status is PAID, then auto-downloads.
app.get('/api/pesapal/status', async (req, res) => {
  const { orderTrackingId } = req.query;
  if (!orderTrackingId) return res.status(400).json({ error: 'orderTrackingId required' });

  const record = orders.get(orderTrackingId);

  // Fallback: if our IPN hasn't landed yet, ask PesaPal directly instead of just waiting.
  if (!record || record.status !== 'PAID') {
    try {
      const token = await getAccessToken();
      const { data } = await axios.get(
        `${PESAPAL_BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.payment_status_description === 'Completed') {
        const orderId = record?.orderId;
        orders.set(orderTrackingId, { status: 'PAID', orderId });
        if (orderId) orders.set(orderId, { status: 'PAID', orderTrackingId });
        return res.json({ status: 'PAID', order_id: orderId });
      }
    } catch (err) {
      // swallow and fall through to "pending" below — frontend will just keep polling
    }
    return res.json({ status: record?.status || 'pending' });
  }

  res.json({ status: 'PAID', order_id: record.orderId });
});

// ---- 6. Only serve the real file to buyers who actually paid ----
app.get('/download/:orderId', (req, res) => {
  const record = orders.get(req.params.orderId);
  if (!record || record.status !== 'PAID') {
    return res.status(403).send('Payment not confirmed for this order yet.');
  }
  res.download('./own-the-buyer-book.pdf');
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Own The Buyer server running');
});
