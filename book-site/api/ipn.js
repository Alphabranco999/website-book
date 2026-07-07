// api/ipn.js
// Pesapal calls this URL on its own whenever a payment's status changes —
// this is the reliable source of truth, since it fires even if the buyer
// closes the tab before the callback page loads.

const { getAccessToken, getTransactionStatus } = require('../lib/pesapal');

module.exports = async (req, res) => {
  try {
    const params = req.method === 'GET' ? req.query : req.body;
    const orderTrackingId = params.OrderTrackingId || params.orderTrackingId;
    const merchantReference = params.OrderMerchantReference || params.orderMerchantReference;

    const token = await getAccessToken();
    const status = await getTransactionStatus(orderTrackingId, token);

    if (status.payment_status_description === 'Completed') {
      // This order is paid. This is the place to:
      //   1. Mark the order as paid in a database (none is set up yet — see README).
      //   2. Email the buyer their ebook download link / trigger paperback shipping.
      // Without a database this only logs to the Vercel function logs for now.
      console.log('Payment completed:', merchantReference, status.payment_account);
    } else {
      console.log('Payment not completed:', merchantReference, status.payment_status_description);
    }

    res.status(200).json({
      orderNotificationType: 'IPNCHANGE',
      orderTrackingId,
      orderMerchantReference: merchantReference,
      status: 200
    });
  } catch (err) {
    res.status(200).json({ status: 500, message: err.message });
  }
};
