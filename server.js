const express = require("express");
const app = express();
const morgan = require("morgan");
require("dotenv").config();

const verifyWebhook = require("./src/middleware/stripeWebhook.middleware");
const pool = require("./db/conn");

app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms")
);

app.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  verifyWebhook,
  async (req, res) => {
    try {
      const event = req.stripeEvent;
      const eventObject = event.data.object;

      console.log("Stripe Event Type:", event.type);

      // Payment successful
      if (event.type === "payment_intent.succeeded") {
        const paymentObject = eventObject;
        const orderId = paymentObject.metadata?.order_id;

        if (paymentObject.status === "succeeded" && orderId) {
          const query = `
            UPDATE orders
            SET payment_status = $1,
                stripe_event_id = $2,
                payment_updated_at = NOW()
            WHERE id = $3
              AND stripe_payment_intent_id = $4
          `;

          const result = await pool.query(query, [
            "paid",
            event.id,
            orderId,
            paymentObject.id,
          ]);

          console.log(
            result.rowCount > 0
              ? "Order payment status updated"
              : "No matching order found for payment"
          );
        }
      }

      // Refund status updated
      if (event.type === "refund.updated") {
        const refundObject = eventObject;

        console.log("Refund Event Data:", refundObject);

        if (refundObject.status === "succeeded") {
          const query = `
            UPDATE refunds
            SET status = $1
            WHERE stripe_refund_id = $2
          `;

          const result = await pool.query(query, [
            "succeeded",
            refundObject.id,
          ]);

          console.log(
            result.rowCount > 0
              ? "Refund status updated to succeeded"
              : "No matching refund found"
          );
        } else if (
          refundObject.status === "failed" ||
          refundObject.status === "canceled"
        ) {
          const query = `
            UPDATE refunds
            SET status = $1
            WHERE stripe_refund_id = $2
          `;

          const result = await pool.query(query, [
            refundObject.status === "canceled"
              ? "failed"
              : refundObject.status,
            refundObject.id,
          ]);

          console.log(
            result.rowCount > 0
              ? "Refund status updated"
              : "No matching refund found"
          );
        }
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error("Webhook processing error:", error.message);

      return res.status(500).json({ received: false });
    }
  }
);

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});