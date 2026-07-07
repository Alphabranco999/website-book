// api/create-order.js
// Called when the buyer submits the checkout form.
// Creates an order with Pesapal and returns a redirect_url — Pesapal's own
// hosted page then shows MTN, Airtel, and card as payment options.

const { BASE_URL, getAccessToken } = require('../lib/pesapal');

const BOOK_PRICE_UGX = 45000;
const BOOK_DESCRIPTION = 'The Boda Economy - paperback + ebook';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { name, email, phone } = req.body || {};

    if (!email && !phone) {
      res.status(400).json({ error: 'Enter an email address or phone number.' });
      return;
    }

    const siteUrl = process.env.SITE_URL;
    const ipnId = process.env.PESAPAL_IPN_ID;

    if (!siteUrl) throw new Error('Missing SITE_URL environment variable.');
    if (!ipnId) throw new Error('Missing PESAPAL_IPN_ID environment variable. Run scripts/register-ipn.js first.');

    const token = await getAccessToken();

    const merchantReference = 'BE-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    const orderPayload = {
      id: merchantReference,
      currency: 'UGX',
      amount: BOOK_PRICE_UGX,
      description: BOOK_DESCRIPTION,
      callback_url: `${siteUrl}/callback.html`,
      notification_id: ipnId,
      billing_address: {
        email_address: email || undefined,
        phone_number: phone || undefined,
        first_name: name || undefined,
        country_code: 'UG'
      }
    };

    const orderResponse = await fetch(`${BASE_URL}/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderPayload)
    });

    const orderData = await orderResponse.json();

    if (orderData.error) {
      res.status(400).json({ error: orderData.error.message || 'Could not create the order.' });
      return;
    }

    res.status(200).json({
      redirect_url: orderData.redirect_url,
      order_tracking_id: orderData.order_tracking_id,
      merchant_reference: merchantReference
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
