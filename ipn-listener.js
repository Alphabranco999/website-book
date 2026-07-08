// netlify/functions/ipn-listener.js
// PesaPal calls this automatically whenever a payment's status changes.
// We don't need to store anything here because thank-you.html checks
// status live via check-status.js — but PesaPal requires a valid IPN
// URL to be registered, and requires this exact acknowledgement format.

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderNotificationType: params.OrderNotificationType || params.orderNotificationType || "IPNCHANGE",
      orderTrackingId: params.OrderTrackingId || params.orderTrackingId || "",
      orderMerchantReference: params.OrderMerchantReference || params.orderMerchantReference || "",
      status: 200
    })
  };
};
