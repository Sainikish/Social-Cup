// Hardcoded billing display constants - NOT values read from any backend
// settings/config endpoint. Checked before adding these: there is no
// credit-to-dollar constant anywhere in the backend (searched the `credit`
// package and every admin controller/service), and no config endpoint
// exposing the membership plan's price/credit allowance either - the plan
// itself lives in Stripe (see backend's StripeProperties.priceId), which
// this app never reads directly.
//
// If the credit-to-dollar rate ever becomes backend-configurable, or if
// Stripe's membership plan (price or monthly credit allowance) ever
// changes, BOTH this file and Stripe's dashboard config must be updated
// together - nothing here keeps them in sync automatically. See the
// Settings screen, which surfaces these same values as read-only.

// Currently fixed at $1 = 1 credit everywhere this app converts a credit
// price into a member-facing dollar amount (e.g. the drink pricing
// calculator on DrinkForm).
export const CREDIT_VALUE_USD = 1;

// Mirrors Stripe's actual $24.99/mo membership Price object and its 30
// credits/month allowance - controlled in Stripe, not persisted by this
// app or its backend.
export const MEMBERSHIP_PLAN = {
  monthlyPriceUsd: 24.99,
  creditsPerMonth: 30,
} as const;
