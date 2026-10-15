# Stripe Webhook Handler

A Node.js and Express application that receives Stripe webhook events and updates payment and refund statuses in a PostgreSQL database hosted on Supabase.

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Supabase
- Stripe Webhooks
- `pg` — PostgreSQL client
- `dotenv` — Environment variable management
- `morgan` — HTTP request logging

## Features

- Receives Stripe webhook events through an Express endpoint.
- Verifies webhook signatures using custom middleware.
- Handles successful payment events.
- Updates order payment status in PostgreSQL.
- Handles refund status updates.
- Matches Stripe events to database records using Stripe IDs.
- Returns HTTP responses to acknowledge webhook delivery.

## How It Works

### Payment Flow

1. A customer completes a payment through Stripe.
2. Stripe sends a `payment_intent.succeeded` event to the webhook endpoint.
3. The webhook middleware verifies the event signature.
4. The application retrieves the PaymentIntent object and its `order_id` metadata.
5. The database is updated only when the PaymentIntent ID matches the ID stored against the order.
6. The order's `payment_status` is updated to `paid`.

### Refund Flow

1. The application creates a refund through the Stripe API.
2. The Stripe Refund ID is stored in the `refunds` table.
3. Stripe sends refund-related webhook events.
4. The webhook handler processes `refund.updated` events.
5. The refund record is matched using `stripe_refund_id`.
6. The refund status is updated based on the Stripe Refund object's status.

The project uses `initiated`, `pending`, `succeeded`, and `failed` as application-level refund statuses, subject to the database constraint and implementation.

## Webhook Endpoint

```http
POST /webhook/stripe
```

The endpoint uses `express.raw()` to preserve the original request body required for Stripe signature verification.

```javascript
app.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  verifyWebhook,
  async (req, res) => {
    // Process the verified Stripe event
  }
);
```

The `verifyWebhook` middleware is responsible for verifying the incoming event and attaching the verified event to `req.stripeEvent`.

## Environment Variables

Create a `.env` file in the webhook project's root directory.

```env
PORT=8000
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
DATABASE_URL=your_database_connection_string
```

Use the exact environment variable names expected by your existing database connection and verification middleware.

**Never commit `.env` files, Stripe secrets, or database credentials to GitHub.**

## Setup

### 1. Install dependencies

```bash
npm install
```

Required packages include:

```bash
npm install express morgan dotenv pg
```

Install any additional packages required by your existing webhook verification middleware.

### 2. Configure environment variables

Add your Stripe webhook signing secret and database connection details to `.env`.

### 3. Start the server

```bash
node index.js
```

Replace `index.js` with your actual entry-point filename if different.

The server will run on the configured port, defaulting to port `8000`.

## Local Webhook Testing

Install and authenticate the Stripe CLI, then forward test events to your local server:

```bash
stripe listen --forward-to localhost:8000/webhook/stripe
```

Copy the webhook signing secret provided by the Stripe CLI into your local environment configuration.

Trigger or generate test events and inspect the server logs.

Examples of relevant event types:

- `payment_intent.succeeded`
- `refund.updated`

## Database Updates

### Orders

Successful PaymentIntent events update the matching order's:

- `payment_status`
- `stripe_event_id`
- `payment_updated_at`

### Refunds

Refund events update the matching refund record's:

- `status`

The refund is matched using its Stripe Refund ID (`re_...`).

## Important Notes

- Always verify webhook signatures before processing events.
- Use the raw request body for Stripe signature verification.
- Do not trust frontend payment status alone.
- Match Stripe object IDs with the corresponding database records.
- Stripe may retry webhook deliveries, so event processing should be designed to handle duplicate events safely.
- Return a successful HTTP response after the event has been processed successfully.
- Return an error response when processing fails so Stripe can retry delivery according to its retry policy.

## Project Purpose

This project demonstrates how to receive and verify Stripe webhook events, handle asynchronous payment updates, and synchronize payment and refund statuses with a PostgreSQL database.

It is intended for learning and portfolio demonstration using Stripe test mode.
