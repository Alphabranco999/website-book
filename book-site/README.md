# The Boda Economy — store with real Pesapal checkout

This site now hands off to Pesapal for payment. Pesapal's own hosted checkout
page shows MTN Mobile Money, Airtel Money, and card as options — you don't
need to build separate flows for each.

## What's in here

- `index.html` — the book's landing page. The "Continue to payment" button calls your backend.
- `callback.html` — the page buyers land on after paying; it confirms the payment worked.
- `api/create-order.js` — creates the order with Pesapal and returns a payment link.
- `api/ipn.js` — Pesapal calls this automatically when a payment's status changes.
- `api/payment-status.js` — used by `callback.html` to check whether payment succeeded.
- `scripts/register-ipn.js` — a one-time setup script (see step 4 below).

## Step 1 — Get Pesapal sandbox credentials (free, for testing)

1. Go to https://developer.pesapal.com and create a developer account.
2. From your dashboard, open the sandbox/demo section and grab your **test**
   `consumer_key` and `consumer_secret` (or request/download test credentials
   from the docs — labelled "test credentials" on their site).
3. Keep `PESAPAL_ENV=sandbox` while testing — sandbox payments aren't real money.

## Step 2 — Deploy to Vercel (free)

You don't need your own server — Vercel hosts the static pages and runs the
`api/` folder as serverless functions automatically.

1. Install Node.js if you don't have it: https://nodejs.org
2. Install the Vercel CLI:
   ```
   npm install -g vercel
   ```
3. From inside this project folder, run:
   ```
   vercel
   ```
   Follow the prompts (log in / sign up with GitHub, Google, or email — free tier is enough).
   This gives you a first URL like `https://the-boda-economy-store.vercel.app`.

## Step 3 — Set environment variables

In the Vercel dashboard: your project → **Settings → Environment Variables**.
Add each of these (see `.env.example`):

```
PESAPAL_CONSUMER_KEY     = your sandbox consumer key
PESAPAL_CONSUMER_SECRET  = your sandbox consumer secret
PESAPAL_ENV              = sandbox
SITE_URL                 = https://the-boda-economy-store.vercel.app   (your real URL, no trailing slash)
```

Leave `PESAPAL_IPN_ID` for the next step.

## Step 4 — Register your IPN URL (one time)

Pesapal needs to know where to send payment status updates. Run this once
from your computer, using the same keys and URL you just set in Vercel:

```
PESAPAL_CONSUMER_KEY=your_key PESAPAL_CONSUMER_SECRET=your_secret PESAPAL_ENV=sandbox SITE_URL=https://the-boda-economy-store.vercel.app node scripts/register-ipn.js
```

It prints something like:

```
Set this as your PESAPAL_IPN_ID environment variable:
84740ab4-3cd9-47da-8a4f-dd1db53494b5
```

Copy that value into `PESAPAL_IPN_ID` in Vercel's environment variables, then redeploy:

```
vercel --prod
```

## Step 5 — Test it

Open your deployed site, click "Buy the book," fill in the form, and continue
to payment. On Pesapal's sandbox checkout page you can complete a test MTN,
Airtel, or card payment without spending real money (Pesapal's sandbox docs
list test phone numbers and card numbers for this). Confirm you land back on
`callback.html` and see "Payment received."

## Step 6 — Go live

1. Apply for a live Pesapal merchant account at https://www.pesapal.com
   (you'll need business registration details and a bank account for payouts).
2. Once approved, Pesapal emails you **live** `consumer_key` and `consumer_secret`.
3. In Vercel, update the environment variables:
   ```
   PESAPAL_CONSUMER_KEY    = your live consumer key
   PESAPAL_CONSUMER_SECRET = your live consumer secret
   PESAPAL_ENV             = live
   ```
4. Run `scripts/register-ipn.js` again with `PESAPAL_ENV=live` and your live
   keys — sandbox and live each need their own IPN registration — and update
   `PESAPAL_IPN_ID` with the new value it prints.
5. Redeploy with `vercel --prod`.

## What's not built yet (worth adding before real launch)

- **Fulfilment**: right now, a completed payment is only logged in
  `api/ipn.js`. Before you rely on this, wire that spot up to actually email
  the ebook file / download link, and to trigger paperback shipping.
- **Order storage**: there's no database, so there's no order history or way
  to look up a past sale. For low volume, checking the Vercel function logs
  and Pesapal's own merchant dashboard works, but a simple database (e.g.
  a free Supabase or Postgres instance) would make this more reliable.
- **A custom domain**: Vercel gives you a `.vercel.app` URL for free; you can
  attach your own domain in the Vercel dashboard if you buy one.
