# Social Cup Mobile

The mobile client for Social Cup — a coffee membership / cafe & drink discovery app.
Built with Expo, React Native, and TypeScript. Completely independent from `backend/`
(no shared tooling, no shared `node_modules`) — this is a separate project living
alongside it in the same repository.

Phases 7.1–7.7 are complete: authenticated session management (login, register, token
refresh, protected routes via `Stack.Protected`), cafe discovery/search/detail, drink
discovery/detail, drink ratings (create/edit) and a personal drink diary, a profile
screen backed by `/auth/me`, and app-wide polish (shared image fallbacks, accessibility
labels, pull-to-refresh, TanStack Query foreground refetch via `AppState`).

## Prerequisites

- **Node.js 20 LTS or newer** (developed against Node 24; anything 20+ should work).
- **npm** (ships with Node). This project uses npm, not yarn/pnpm — stick to npm for a
  consistent lockfile.
- **Expo Go** app on your phone (easiest way to run on a physical device), _or_
  **Android Studio** (for an Android emulator), _or_ **Xcode on macOS** (for an iOS
  simulator — not available on Windows/Linux).
- The Social Cup backend running somewhere reachable from your device/emulator (see
  [Environment configuration](#environment-configuration) below) — this app has nothing
  to talk to without it.

## Install

```bash
cd mobile
npm install
```

`legacy-peer-deps=true` is set in `.npmrc` — some of expo-router's own transitive
dependencies (web-only tooling it pulls in) currently have peer-dependency ranges that
npm's default resolver rejects. This is upstream noise, not a project-specific hack;
it doesn't affect anything this app actually uses at runtime.

## Running the app

```bash
npx expo start
```

This starts the Metro bundler and prints a QR code plus a menu of options. From there:

- Press `a` to open on a connected Android emulator/device.
- Press `i` to open on the iOS simulator (macOS only).
- Press `w` to open in a browser (Expo Router supports web, though this project targets
  mobile first).
- Scan the QR code with the **Expo Go** app on a physical phone.

### Android emulator setup

1. Install [Android Studio](https://developer.android.com/studio).
2. Open **Android Studio → More Actions → Virtual Device Manager** and create a device
   (any recent Pixel profile with a current API level works).
3. Start the emulator from the Device Manager, _then_ run `npx expo start` and press `a`
   (or run `npm run android`).

### iOS simulator setup

Requires macOS with Xcode installed. Not available on Windows — **do not attempt this on
a Windows machine**; use Expo Go on a physical iPhone instead, or a Mac/CI runner.

1. Install Xcode from the Mac App Store, then open it once to accept the license and
   install additional components.
2. Run `npx expo start` and press `i` (or `npm run ios`).

### Physical device setup

1. Install **Expo Go** from the App Store / Play Store.
2. Ensure your phone and your computer are on the **same Wi-Fi network**.
3. Run `npx expo start` and scan the QR code with Expo Go (Android: scan directly in the
   Expo Go app; iOS: scan with the system Camera app, which will open Expo Go).
4. You **must** set `EXPO_PUBLIC_API_URL` to your computer's LAN IP — see below. A
   physical device cannot reach your computer via `localhost`.

## Environment configuration

**Do not hardcode `localhost` anywhere in the app.** All backend access goes through
`src/config/env.ts`, which exposes a single `config.apiBaseUrl`. Every other file that
needs the API base URL should import it from there — never construct it locally.

The backend is served under the `/api` context path (see `backend/README.md`), so
`config.apiBaseUrl` always already includes it — feature code should build request paths
like `${config.apiBaseUrl}/cafes`, not re-append `/api` itself.

Configuration is driven by two environment variables, both read from `process.env` (Expo
inlines any `EXPO_PUBLIC_*` variable into the JS bundle at build/start time):

| Variable              | Purpose                                     | Required?                                               |
| --------------------- | ------------------------------------------- | ------------------------------------------------------- |
| `EXPO_PUBLIC_APP_ENV` | `development` \| `staging` \| `production`  | No — defaults to `development`                          |
| `EXPO_PUBLIC_API_URL` | Full backend base URL, **including** `/api` | Only outside local development, or on a physical device |

Copy `.env.example` to `.env.local` (already gitignored) and fill in real values:

```bash
cp .env.example .env.local
```

### Why "localhost" doesn't just work

- **Android emulator**: `localhost` inside the emulator refers to the emulator itself,
  not your computer. The emulator's special address for the host machine is
  `10.0.2.2`. `src/config/env.ts` already defaults to this automatically for Android in
  development — you don't need to set anything.
- **iOS simulator**: the simulator shares your Mac's network stack, so `localhost`
  correctly reaches your computer. Also handled automatically in development.
- **Physical device** (either platform): the device has its own network identity
  entirely separate from your computer's. Neither `localhost` nor `10.0.2.2` means
  anything to it. You must set `EXPO_PUBLIC_API_URL` to your computer's actual LAN IP
  address, e.g.:

  ```
  EXPO_PUBLIC_API_URL=http://192.168.1.23:8080/api
  ```

  Find your LAN IP with `ipconfig` (Windows) or `ifconfig`/`ip addr` (macOS/Linux). Make
  sure the backend is actually listening on that interface (not just `127.0.0.1`) and
  that your firewall allows the connection.

### Staging / production

Expo does not natively switch `.env` files based on an environment name — see the
[Expo environment variables guide](https://docs.expo.dev/guides/environment-variables/).
For now, set both variables explicitly when starting/building for a non-development
target, e.g.:

```bash
EXPO_PUBLIC_APP_ENV=staging EXPO_PUBLIC_API_URL=https://staging.example.com/api npx expo start
```

No production URL is assumed anywhere in this codebase — `src/config/env.ts` throws a
clear error at startup if `EXPO_PUBLIC_API_URL` is missing for `staging`/`production`,
rather than silently falling back to a guessed host. Once a real deployment target
exists, the recommended long-term approach is
[EAS environment variables](https://docs.expo.dev/eas/environment-variables/) per build
profile, rather than local `.env` files.

## Project structure

```
mobile/
├── app/                      # Expo Router - file-based routing, one file per screen
│   ├── _layout.tsx           # Root layout: providers (SafeArea, TanStack Query), root Stack
│   ├── index.tsx             # "/" - redirects to (app) or (auth) based on session state
│   ├── +not-found.tsx
│   ├── (auth)/                # Auth flow group - reachable only while unauthenticated
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (app)/                 # Authenticated group (tab navigator) - reachable only while authenticated
│       ├── _layout.tsx
│       ├── home.tsx
│       ├── cafes/             # list (index) + detail ([id]) as a nested Stack
│       ├── drinks/            # list (index) + detail ([id]), ratings live on the detail screen
│       └── profile/           # profile (index) + drink diary (diary), as a nested Stack
├── src/
│   ├── api/                  # Axios instance, error normalization, auth endpoint wrappers
│   ├── components/           # Generic, reusable UI primitives (Button, Card, FallbackImage, Avatar, ...)
│   ├── config/                # env.ts - the ONE place API base URL is resolved
│   ├── features/             # auth, cafes, drinks, ratings - each with types/api/hooks/components
│   ├── hooks/                  # Shared hooks (useDebouncedValue, useAppStateFocusManager)
│   ├── lib/                    # Third-party client setup (TanStack QueryClient)
│   ├── storage/                # Secure token storage (Expo SecureStore)
│   ├── theme/                  # Design tokens: colors, typography, spacing, radius, shadows
│   ├── types/                  # Shared TypeScript types (PageResponse<T>, ApiError, MemberDto)
│   └── utils/                  # Shared utilities (apiErrors: field-error extraction, error mapping)
├── assets/                    # App icons, splash images
├── tests/                      # Jest + React Native Testing Library
├── app.config.ts               # Expo app config (replaces app.json - see below)
├── eas.json                     # EAS Build profiles (development/preview/production)
├── eslint.config.js
├── jest.config.js
├── tsconfig.json
├── .env.example
└── package.json
```

`app.config.ts` replaces the default `app.json` so app identity (name, icon, scheme) and
the `expo-router`/`expo-secure-store` plugin registration live in one typed file.

## Available commands

| Command                | Description                                |
| ---------------------- | ------------------------------------------ |
| `npm start`            | Start the Metro bundler (`expo start`)     |
| `npm run android`      | Start and open on Android                  |
| `npm run ios`          | Start and open on iOS (macOS only)         |
| `npm run web`          | Start and open in a browser                |
| `npm run lint`         | ESLint (flat config, `eslint-config-expo`) |
| `npm run typecheck`    | `tsc --noEmit`                             |
| `npm run format`       | Prettier, writes changes                   |
| `npm run format:check` | Prettier, check only (no writes)           |
| `npm test`             | Jest + React Native Testing Library        |

## Testing

`jest-expo` preset + `@testing-library/react-native`, which has built-in Jest matchers —
no separate `jest-native` package needed. Pinned to `^13.3.3` (not the latest v14+):
v14's async `render()` breaks `expo-router@57`'s `renderRouter` (see `test-renderer` peer
dependency below). Router-aware tests use `expo-router/testing-library`'s `renderRouter`,
which renders the actual `app/` directory (providers included), not a mocked stand-in.

Tests live in `tests/`, not inside `app/` (Expo Router treats every file under `app/` as
a route, so test files placed there would be picked up as screens).

## Technology choices

- **Expo + Expo Router**: file-based routing, managed native builds, works the same way
  on Android/iOS without touching native project files.
- **TypeScript**: strict mode, matching the backend's own emphasis on typed contracts.
- **TanStack Query**: server-state caching/retry for the REST API — no Redux at this
  stage; nothing yet needs client-only global state complex enough to justify it.
- **Axios**: request/response interceptor support the shape of `ApiError` normalization
  needs.
- **Expo SecureStore**: Keychain (iOS) / Keystore-backed encrypted storage (Android) for
  JWTs — never `AsyncStorage`, which is unencrypted plain storage.

## Building with EAS

`eas.json` defines three build profiles (`development`, `preview`, `production`), each
linked via `"environment"` to the matching [EAS Environment](https://docs.expo.dev/eas/environment-variables/).
None of them set `EXPO_PUBLIC_API_URL` directly - that value is environment-specific and
must be created per environment instead (`eas env:create --environment production --name
EXPO_PUBLIC_API_URL --value https://... --visibility plaintext`), not hardcoded into
`eas.json`. If it's ever missing at build/runtime for `staging`/`production`,
`src/config/env.ts` throws immediately rather than silently falling back to `localhost`.

Before running a real `eas build`, note the release blockers below - an EAS project must
be linked (`eas init`) and platform identifiers set first.

## Known limitations / release blockers

- **No EAS project linked yet** - `eas init` (requires an authenticated Expo account) has
  not been run, so `eas.json`'s profiles cannot actually build until that's done. As a
  consequence, no `EXPO_PUBLIC_API_URL` value has been created in any EAS Environment
  either - that also requires a linked, authenticated project, and the real staging/
  production backend URLs are not decided in this repository yet.
- **No `ios.bundleIdentifier` / `android.package` set** in `app.config.ts` - required
  before any real (non-Expo-Go) build or store submission. Deliberately left unset here
  rather than invented, since this repository hasn't defined real ones yet.
- **No app icons/splash images beyond Expo's scaffolded defaults.**
- **TanStack Query's `onlineManager`** (network-reconnect detection) is not wired to a
  real connectivity source - doing so correctly needs `@react-native-community/netinfo`,
  a dependency not currently installed. `focusManager` (foreground/background via
  `AppState`) _is_ wired, in `src/hooks/useAppStateFocusManager.ts`.
- **No physical device / emulator verification has been performed in CI or by an agent**
  - all verification to date is `jest`/`@testing-library/react-native` plus
    `expo export --platform {ios,android}` (Metro bundle compilation only).
