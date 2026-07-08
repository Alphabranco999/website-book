// netlify/functions/check-status.js
// Called by thank-you.html. Asks PesaPal directly whether a specific
// transaction is really COMPLETED. This is the actual gate — nothing
// is trusted from the browser or the URL alone.

const { API_BASE, getToken } = require("./_pesapal");

exports.handler = async (event) => {
  try {
    const orderTrackingId = event.queryStringParameters && event.queryStringParameters.orderTrackingId;
    if (!orderTrackingId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing orderTrackingId" }) };
    }

    const token = await getToken();

    const res = await fetch(
      `${API_BASE}/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
      {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
      }
    );
    const data = await res.json();

    const description = (data.payment_status_description || "").toUpperCase();
    const paid = description === "COMPLETED";

    return {
      statusCode: 200,
      body: JSON.stringify({
        paid,
        status: data.payment_status_description || "UNKNOWN",
        amount: data.amount,
        confirmation_code: data.confirmation_code || null
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
