# Google Calendar Integration Setup

The app now supports **simple Google Sign-In** for adding medication reminders to your calendar. Users just click a button and sign in - no manual credential entry needed!

## Quick Setup (5 minutes)

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: "Prescription OCR"
4. Click "Create"

### 2. Enable Google Calendar API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

### 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in app name: "Prescription OCR"
   - Add your email as developer contact
   - Save and continue through the scopes (no changes needed)
   - Add test users if in testing mode
4. Back to "Create OAuth client ID":
   - Application type: "Web application"
   - Name: "Prescription OCR Web Client"
   - Authorized JavaScript origins: 
     - `http://localhost:3000` (for local development)
     - Add your production domain if deploying
   - Authorized redirect URIs: 
     - `http://localhost:3000/results.html`
     - Add your production URL if deploying
5. Click "Create"
6. **Copy the Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)

### 4. Create API Key

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API key"
3. **Copy the API Key**
4. Click "Restrict Key" (recommended):
   - Under "API restrictions", select "Restrict key"
   - Choose "Google Calendar API"
   - Save

### 5. Configure Your App

Add these to your `.env` file:

```bash
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_API_KEY=your_api_key_here
```

Restart your server:
```bash
npm start
```

## How Users Will Experience It

1. User processes a prescription
2. On results page, clicks "Add to Google Calendar"
3. Modal appears with "Sign in & Add to Calendar" button
4. Clicks button → Google sign-in popup appears
5. User signs in with their Google account
6. Grants calendar permissions
7. Medications are automatically added to their calendar!

## Features

- ✅ **One-click sign-in** - No manual credential entry
- ✅ **Secure OAuth flow** - Industry-standard authentication
- ✅ **Persistent sessions** - Stay signed in across page loads
- ✅ **User info display** - Shows signed-in user's name and email
- ✅ **Easy sign-out** - One-click to disconnect
- ✅ **Automatic reminders** - 10-minute and 0-minute notifications
- ✅ **Recurring events** - Based on medication duration
- ✅ **Fallback option** - ICS export if Google Calendar not configured

## Security Notes

- **Credentials are server-side only** - Users never see API keys
- **OAuth tokens are browser-only** - Not stored on server
- **Minimal permissions** - Only requests calendar.events scope
- **User control** - Users can revoke access anytime from Google Account settings

## Troubleshooting

### "Access blocked" error
- Add your email as a test user in OAuth consent screen
- Verify authorized origins match your domain exactly

### "Redirect URI mismatch"
- Check that redirect URIs in Google Console match your app URL
- Include the full path: `http://localhost:3000/results.html`

### Calendar buttons not showing
- Verify `.env` has both `GOOGLE_CLIENT_ID` and `GOOGLE_API_KEY`
- Restart the server after adding credentials
- Check browser console for errors

### Sign-in popup blocked
- Allow popups for your domain
- Try again - browser may have blocked it

## Alternative: Export as ICS

If you don't want to set up Google Calendar API:
1. Users can click "Export as ICS" button
2. Download the `.ics` file
3. Import into any calendar app (Google Calendar, Outlook, Apple Calendar)

No API setup required for this option!
