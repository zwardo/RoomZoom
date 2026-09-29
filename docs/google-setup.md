# Google setup

RoomZoom uses two kinds of Google access, and they are kept separate on purpose:

| Access | Who | Used for |
| --- | --- | --- |
| User OAuth | Every signed-in user | Upcoming meetings, room free/busy, booking |
| Service account (optional) | A sync script run by you | Reading the full room catalog from the Admin SDK |

Everything works without the service account: seed rooms from a CSV instead (see the README).

## 1. Create the Google Cloud project

1. Go to <https://console.cloud.google.com/projectcreate> while signed in with your **work** account.
2. Pick your organization as the parent. An "Internal" consent screen is only available for projects inside the org.

## 2. Enable APIs

In **APIs & Services > Library**, enable:

- **Google Calendar API** (required)
- **Admin SDK API** (only for the Directory sync)
- **Cloud Vision API** (only for floor plan OCR)

## 3. OAuth consent screen

**APIs & Services > OAuth consent screen** (called "Google Auth Platform > Branding / Audience" in newer consoles):

- User type: **Internal**. Only accounts in your Workspace can sign in, and Google verification isn't needed.
- App name: `RoomZoom`, plus a support email.
- Data access / scopes: add
  - `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`
  - `https://www.googleapis.com/auth/calendar.events`
  - `https://www.googleapis.com/auth/calendar.freebusy`

## 4. OAuth client

**APIs & Services > Credentials > Create credentials > OAuth client ID**

- Application type: **Web application**
- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

Copy the client ID and secret into `.env.local` as `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. Set `GOOGLE_WORKSPACE_DOMAIN` to your domain so personal Gmail accounts are rejected.

If sign-in shows "access blocked" or "admin_policy_enforced", your org restricts third-party apps. Ask an admin to trust the client ID under **Admin console > Security > Access and data control > API controls > Manage third-party app access**.

## 5. (Optional) Directory sync service account

This gives RoomZoom structured room data (building, floor, capacity, features) instead of parsing room names.

1. **IAM & Admin > Service accounts > Create**. No project roles needed.
2. Open it, go to **Keys > Add key > JSON**, and save it to `./secrets/roomzoom.service-account.json` (this path is git-ignored).
3. Copy the service account's **Client ID** (the numeric "Unique ID").
4. A Workspace admin goes to **Admin console > Security > Access and data control > API controls > Domain-wide delegation > Add new**:
   - Client ID: the numeric ID from step 3
   - Scope: `https://www.googleapis.com/auth/admin.directory.resource.calendar.readonly`
5. Set `GOOGLE_ADMIN_IMPERSONATE_EMAIL` to an admin account (a user with at least the "Calendar resources" read privilege).
6. Run `npm run sync:directory`.

## 6. (Optional) Cloud Vision for floor plan OCR

**APIs & Services > Credentials > Create credentials > API key**, restrict it to the Cloud Vision API, and set `GOOGLE_VISION_API_KEY`. Then run `npm run ocr:floor -- path/to/floor.jpg` (see the README's floor plan section).

## API reference used by the app

| Call | Scope | Where |
| --- | --- | --- |
| `calendar.events.list` (primary) | `calendar.events` | `src/lib/calendar/google.ts` |
| `calendar.freebusy.query` (batched by 50) | `calendar.freebusy` | `src/lib/calendar/google.ts` |
| `calendar.events.insert` / `get` / `patch` | `calendar.events` | `src/lib/calendar/google.ts` |
| `directory.resources.calendars/buildings/features.list` | `admin.directory.resource.calendar.readonly` | `src/lib/google/directory.ts` |
| Vision `images:annotate` `DOCUMENT_TEXT_DETECTION` | API key | `src/lib/ocr/vision.ts` |
