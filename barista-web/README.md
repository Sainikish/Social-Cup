# Social Cup Barista Web

A lightweight, mobile-friendly web app for cafe baristas: log in as a cafe (via a PIN),
scan a member's redemption QR code (or enter it manually), and see an immediate
green/red redemption result.

## HTTPS requirement for the camera scanner

The browser's camera API (`getUserMedia()`, used by the QR scanner) only works in a
[secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts):
an `https://` origin, or `http://localhost` during local development. Any other
`http://` origin - including a real deployment reachable only over plain HTTP - will
have the camera permission request fail immediately, with this app falling back to its
"Camera unavailable" state (manual code entry always remains available regardless).
This means **any real deployment of this app must be served over HTTPS** for the
scanner to function; see `src/hooks/useQrScanner.ts`. No deployment configuration is
set up yet (see "Known limitation" below and the project's own deployment planning).

## Prerequisites

- Node.js 20+ and npm
- The Social Cup `backend` running and reachable (see `../backend/README.md`)

## Install

```bash
npm install
```

## Environment configuration

Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to the backend's base URL,
including the `/api` context path:

```bash
cp .env.example .env
# .env
VITE_API_BASE_URL=http://localhost:8080/api
```

If unset, `npm run dev` falls back to `http://localhost:8080/api` automatically (local
development only). A production build has no fallback and fails fast at startup if
`VITE_API_BASE_URL` is missing - no server URL is ever assumed (see `src/config/env.ts`).

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`src/`) and produce a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run the test suite once (Vitest) |
| `npm run test:watch` | Run the test suite in watch mode |
| `npm run typecheck` | Type-check `src/` and `tests/` together, without emitting |
| `npm run lint` | Lint with oxlint |

## Project structure

Mirrors the mobile app's own feature-module convention
(`features/<domain>/{api,types,queryKeys,hooks,components,index}.ts`), adapted for a
plain web SPA (no shared package exists between `mobile/` and `barista-web/` - the same
patterns are simply followed independently in both).

```text
src/
├── api/          # shared Axios client, auth-expiry pub/sub, shared QueryClient
├── auth/         # session context, session storage, barista login/refresh calls
├── features/
│   ├── cafeLogin/    # cafe picker (GET /cafes/search) + login error copy
│   └── redemption/   # POST /barista/redeem + error copy + result card
├── components/   # shared UI primitives
├── screens/      # LoginScreen, ScannerScreen, RedemptionResultScreen
├── routes/       # AppRouter, ProtectedRoute, PublicRoute
├── hooks/        # useDebouncedValue, useQrScanner
├── utils/        # qrDecode (BarcodeDetector + jsQR fallback, independently testable)
├── config/       # env.ts
└── types/        # shared ApiError/PageResponse shapes
```

## Known limitation - backup-code redemption

> **TODO:** Backup-code redemption requires an explicit backend decision.
> Current backend redemption accepts the primary redemption code.

During backend inspection it was confirmed that `POST /barista/redeem` looks up a
redemption code exclusively by its primary `code_value` column
(`RedemptionCodeRepository.findByCodeValueForUpdate`). There is no lookup path anywhere
in the backend for the member-facing `backup_code` (the short manual-entry fallback
shown by the mobile app's own redemption screen). Submitting a backup code here today
would simply be rejected as "not found," indistinguishable from a genuinely invalid
code.

This app therefore only ever sends the primary code - both from the QR scanner and from
manual entry - and makes no claim anywhere in its UI that backup-code redemption is
supported. No backend lookup for `backup_code` has been invented here; that remains a
product/backend decision for later, out of scope for this application.

## Testing

Vitest + React Testing Library, mirroring the mobile app's testing conventions:

```bash
npm test
```
