# DreamWare Cleaner (mobile)

React Native / Expo app for cleaners. Phases live in [`docs/cleaner-mobile-roadmap.md`](../docs/cleaner-mobile-roadmap.md).

## Setup

1. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`.
2. Start the DreamWare API (Compose `api` on port 4000).
3. From this folder:

```bash
npm install
npm start
```

Then open iOS Simulator, Android emulator, or Expo Go.

### API URL tips

| Where you run the app | Typical `EXPO_PUBLIC_API_URL` |
|-----------------------|------------------------------|
| iOS simulator         | `http://localhost:4000/api/v1` |
| Android emulator      | `http://10.0.2.2:4000/api/v1` |
| Physical phone        | `http://<your-computer-lan-ip>:4000/api/v1` |

## M0 scaffold

- Tab shells: Schedule, Income, Account
- Typed API helper + secure session storage
- Account → **Check API health** hits `GET /health`

## M1 auth

- Login screen for cleaner accounts
- Secure access + refresh tokens (`x-dreamware-client: cleaner-mobile`)
- Office-only accounts are rejected with a web-office message
- Requires `jobs.execute` home routing and a cleaner profile linked to the membership
- Account shows name, workspace, and sign out

## M2 schedule

- Today / This week filter on assigned visits
- Pull to refresh; empty and error states
- Visit detail: time, address, customer, instructions, rooms, status

## M3 income

- This month / last month earnings
- Hours, current hourly rate, estimated pay
- Uses `GET /earnings` (cleaner-only; not the office pay report)

## M4 calendar sync

- Account → **Enable calendar sync** (device permission)
- Writes a **DreamWare Cleaner** calendar on the device
- **Sync now** / auto-sync when Schedule refreshes
- **Turn off and remove events** deletes mapped DreamWare events
- iOS → Apple Calendar; Android → device calendar (often Google)

Calendar sync needs a **dev build** or Expo Go with calendar support (not available on web).

## M5 field actions

- Visit detail: **Start / Pause / Resume / Complete**
- Checklist after start (tap to mark done; optional items can skip)
- Complete is blocked by the API until required items are `DONE`
- Add notes from the visit screen
- Photos / offline upload queue still later

Do not commit `.env`.

Rebuild the API after pulling auth changes so mobile login returns a refresh token.
