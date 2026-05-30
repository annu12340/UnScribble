# Google Calendar Setup

> Optional integration. See also: [README.md](../README.md) · [AGENTS.md](../AGENTS.md)

The **Add to Google Calendar** button on the results and medication-details pages is optional. Without it, you can still use **Export as ICS** to import the schedule into any calendar app — no setup required.

To enable the in-app Google Calendar button you need a Google OAuth **Client ID**. The app uses Google Identity Services (token flow) in the browser with the `calendar.events` scope; there is no server-side Google credential and no client secret.

## 1. Create a Google Cloud project

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).

## 2. Enable the Google Calendar API

1. Go to **APIs & Services → Library**.
2. Search for **Google Calendar API** and click **Enable**.

## 3. Configure the OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**.
2. Choose **External**, fill in the app name and support email, and save.
3. Under **Scopes**, add `https://www.googleapis.com/auth/calendar.events`.
4. Under **Test users**, add the Google accounts you'll sign in with while the app is unverified.

## 4. Create an OAuth Client ID

1. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Add your origins under **Authorized JavaScript origins** (no path, no trailing slash):
   - `http://localhost:3000`
   - your deployed origin, e.g. `https://your-app.onrender.com`
4. Click **Create** and copy the **Client ID** (looks like `xxxxx.apps.googleusercontent.com`).

> You do **not** need a client secret or a redirect URI — the app uses the browser token flow, not the server-side code flow.

## 5. Add the Client ID to your environment

In your `.env`:

```bash
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

Restart the server. The Client ID is exposed to the browser via `GET /api/config` as `googleCalendar.clientId`, and `googleCalendar.enabled` becomes `true`. (A Client ID is not a secret — it is safe to expose to the browser.)

## How it works

- `public/js/medication/medication-schedule.js` loads the Google API client (`https://apis.google.com/js/api.js`) and Google Identity Services, requests the `calendar.events` scope, then inserts events for each medication time.
- The Content-Security-Policy in `server.js` already allows the required Google origins (`accounts.google.com`, `apis.google.com`, `www.googleapis.com`, `content.googleapis.com`).

## Troubleshooting

| Symptom                                     | Likely cause                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Button missing / disabled                   | `GOOGLE_CLIENT_ID` not set; check `GET /api/config` shows `googleCalendar.enabled: true`.              |
| `redirect_uri_mismatch` / `origin_mismatch` | Current origin not listed under **Authorized JavaScript origins**. Add the exact scheme + host + port. |
| `access_denied` while testing               | Your account isn't in **Test users** on the consent screen.                                            |
| Sign-in popup blocked                       | Allow popups for the app origin and retry.                                                             |

**Quick alternative:** Use **Export as ICS** to download an `.ics` file and import it into Google Calendar, Apple Calendar, or Outlook without any setup.
