
const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const verifyStripeWebhook = (req, res, next) => {
    const signature = req.headers["stripe-signature"];

    try {
        req.stripeEvent = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        next();
    } catch (error) {
        console.error("Stripe signature verification failed:", error.message);

        return res.status(400).send("Invalid Stripe webhook signature");
    }
};

module.exports = verifyStripeWebhook;
