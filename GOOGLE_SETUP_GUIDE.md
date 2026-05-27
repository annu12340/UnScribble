# Step-by-Step Guide: Get Google Calendar Credentials

Follow these steps to get your `GOOGLE_CLIENT_ID` and `GOOGLE_API_KEY` for the Prescription OCR app.

---

## Step 1: Go to Google Cloud Console

1. Open your browser and go to: **https://console.cloud.google.com/**
2. Sign in with your Google account (any Gmail account works)

---

## Step 2: Create a New Project

1. At the top of the page, click on the **project dropdown** (says "Select a project")
2. Click **"NEW PROJECT"** button (top right of the popup)
3. Fill in the form:
   - **Project name**: `Prescription OCR` (or any name you like)
   - **Organization**: Leave as "No organization" (unless you have one)
4. Click **"CREATE"**
5. Wait 10-20 seconds for the project to be created
6. You'll see a notification when it's ready

---

## Step 3: Enable Google Calendar API

1. Make sure your new project is selected (check the top bar)
2. In the left sidebar, click **"APIs & Services"** → **"Library"**
   - Or use the search bar at the top and search for "API Library"
3. In the API Library search box, type: **"Google Calendar API"**
4. Click on **"Google Calendar API"** from the results
5. Click the blue **"ENABLE"** button
6. Wait a few seconds - you'll see "API enabled" message

---

## Step 4: Configure OAuth Consent Screen

Before creating credentials, you need to set up the consent screen (what users see when they sign in).

1. In the left sidebar, click **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** user type (allows anyone with a Google account to use your app)
3. Click **"CREATE"**

### Fill in the OAuth consent screen form:

**Page 1: App information**
- **App name**: `Prescription OCR`
- **User support email**: Your email address (select from dropdown)
- **App logo**: (Optional - you can skip this)
- **Application home page**: `http://localhost:3000` (or your deployed URL)
- **Authorized domains**: (Leave empty for now, add your domain later if deploying)
- **Developer contact information**: Your email address

Click **"SAVE AND CONTINUE"**

**Page 2: Scopes**
- Click **"ADD OR REMOVE SCOPES"**
- In the filter box, search for: `calendar`
- Check the box for: **"Google Calendar API" → ".../auth/calendar.events"**
  - This allows the app to create/edit events
- Click **"UPDATE"**
- Click **"SAVE AND CONTINUE"**

**Page 3: Test users**
- Click **"ADD USERS"**
- Add your email address (and any other emails you want to test with)
- Click **"ADD"**
- Click **"SAVE AND CONTINUE"**

**Page 4: Summary**
- Review everything
- Click **"BACK TO DASHBOARD"**

---

## Step 5: Create OAuth Client ID

Now you'll get your `GOOGLE_CLIENT_ID`.

1. In the left sidebar, click **"APIs & Services"** → **"Credentials"**
2. At the top, click **"+ CREATE CREDENTIALS"**
3. Select **"OAuth client ID"**

### Fill in the OAuth client ID form:

- **Application type**: Select **"Web application"**
- **Name**: `Prescription OCR Web Client`

**Authorized JavaScript origins:**
- Click **"+ ADD URI"**
- Add: `http://localhost:3000`
- If deploying, also add your production URL (e.g., `https://yourdomain.com`)

**Authorized redirect URIs:**
- Click **"+ ADD URI"**
- Add: `http://localhost:3000/results.html`
- If deploying, also add: `https://yourdomain.com/results.html`

4. Click **"CREATE"**

### Copy your Client ID:

A popup will appear with your credentials:
- **Your Client ID**: Something like `123456789-abc123.apps.googleusercontent.com`
- **Your Client Secret**: (You don't need this for this app)

**IMPORTANT**: Copy the **Client ID** and save it somewhere safe!

Click **"OK"** to close the popup.

---

## Step 6: Create API Key

Now you'll get your `GOOGLE_API_KEY`.

1. Still in **"APIs & Services"** → **"Credentials"**
2. At the top, click **"+ CREATE CREDENTIALS"**
3. Select **"API key"**

### A popup appears with your API key:

- **Your API Key**: Something like `AIzaSyABC123def456GHI789jkl`

**IMPORTANT**: Copy the **API Key** and save it somewhere safe!

### Restrict the API Key (Recommended for security):

1. Click **"RESTRICT KEY"** in the popup (or click the key name later)
2. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Click **"Select APIs"** dropdown
   - Check **"Google Calendar API"**
3. Under **"Application restrictions"** (optional but recommended):
   - Select **"HTTP referrers (web sites)"**
   - Click **"ADD AN ITEM"**
   - Add: `localhost:3000/*` (for local testing)
   - Add: `yourdomain.com/*` (for production)
4. Click **"SAVE"**

---

## Step 7: Add Credentials to Your App

Now you have both credentials! Add them to your `.env` file:

1. Open your project folder
2. Find or create the `.env` file in the root directory
3. Add these lines:

```bash
# Google Calendar Integration
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_API_KEY=AIzaSyABC123def456GHI789jkl
```

Replace with your actual values!

4. Save the file
5. Restart your server:
   ```bash
   npm start
   ```

---

## Step 8: Test It!

1. Open your app: `http://localhost:3000`
2. Upload and process a prescription
3. On the results page, click **"Add to Google Calendar"**
4. Click **"Sign in & Add to Calendar"**
5. A Google sign-in popup should appear
6. Sign in and grant permissions
7. Your medication reminders should be added to your calendar!

---

## Troubleshooting

### "Access blocked: This app's request is invalid"
- Make sure you added your email as a test user in Step 4
- Check that authorized redirect URIs match exactly (including `/results.html`)

### "API key not valid"
- Make sure Google Calendar API is enabled (Step 3)
- Check that you copied the API key correctly
- If you restricted the key, make sure Google Calendar API is in the allowed list

### "Redirect URI mismatch"
- Go back to OAuth client settings
- Make sure redirect URIs include the full path: `http://localhost:3000/results.html`
- URIs are case-sensitive and must match exactly

### Popup blocked
- Allow popups for localhost in your browser
- Try clicking the button again

### Still having issues?
- Check the browser console (F12) for error messages
- Make sure your `.env` file is in the root directory
- Restart the server after changing `.env`
- Clear browser cache and try again

---

## For Production Deployment

When deploying to a live website:

1. Go back to **Google Cloud Console** → **Credentials**
2. Click on your **OAuth client ID**
3. Add your production URLs:
   - **Authorized JavaScript origins**: `https://yourdomain.com`
   - **Authorized redirect URIs**: `https://yourdomain.com/results.html`
4. Click **"SAVE"**
5. Update your production `.env` with the same credentials
6. Deploy!

---

## Security Notes

- ✅ Keep your `.env` file private (never commit to Git)
- ✅ Add `.env` to your `.gitignore` file
- ✅ Use environment variables in production (not hardcoded)
- ✅ Restrict API key to Google Calendar API only
- ✅ Add authorized domains in production

---

## Summary

You now have:
- ✅ `GOOGLE_CLIENT_ID` - Identifies your app to Google
- ✅ `GOOGLE_API_KEY` - Allows API access
- ✅ OAuth consent screen configured
- ✅ Calendar API enabled
- ✅ Test users added

Your app can now let users sign in with Google and add medication reminders to their personal calendars!
