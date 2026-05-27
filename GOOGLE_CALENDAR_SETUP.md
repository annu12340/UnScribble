# Google Calendar Integration Setup

To enable medication reminders in Google Calendar, you need to set up Google Cloud credentials.

## Steps to Get Google Calendar API Credentials

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "Prescription OCR")
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
   - Add test users if needed
4. Back to "Create OAuth client ID":
   - Application type: "Web application"
   - Name: "Prescription OCR Web Client"
   - Authorized JavaScript origins: Add `http://localhost:3001` (or your domain)
   - Authorized redirect URIs: Add `http://localhost:3001/results.html`
5. Click "Create"
6. **Copy the Client ID** - you'll need this

### 4. Create API Key

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API key"
3. **Copy the API Key** - you'll need this
4. (Optional) Click "Restrict Key" to limit it to Google Calendar API only

### 5. Configure in the App

1. Process a prescription and go to the results page
2. Click "Add to Google Calendar" on any medication
3. Enter your **Client ID** and **API Key** in the modal
4. These will be saved in your browser for future use

## Security Notes

- **Never commit your API credentials to version control**
- The credentials are stored in browser localStorage only
- For production use, implement proper backend authentication
- Consider using environment variables for API keys
- Restrict your API key to specific domains in production

## Troubleshooting

### "Access blocked" error
- Make sure you've added your email as a test user in OAuth consent screen
- Verify the authorized origins and redirect URIs match your domain

### "API key not valid" error
- Check that Google Calendar API is enabled for your project
- Verify the API key is correctly copied

### Calendar events not appearing
- Ensure you've granted calendar permissions when signing in
- Check that the start date is set correctly
- Verify your timezone settings

## Alternative: Export as ICS

If you don't want to set up Google Calendar API, you can:
1. Click "Export as ICS" button
2. Download the `.ics` file
3. Import it into any calendar app (Google Calendar, Outlook, Apple Calendar, etc.)

This method doesn't require any API setup!
