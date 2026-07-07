// api/payment-status.js
// Called by callback.html (client-side) once the buyer lands back on the
// site, to look up and display whether the payment actually succeeded.

const { getAccessToken, getTransactionStatus } = require('../lib/pesapal');

module.exports = async (req, res) => {
  const { orderTrackingId } = req.query;

  if (!orderTrackingId) {
    res.status(400).json({ error: 'Missing orderTrackingId' });
    return;
  }

  try {
    const token = await getAccessToken();
    const status = await getTransactionStatus(orderTrackingId, token);
    res.status(200).json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
