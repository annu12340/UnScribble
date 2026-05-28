let config = null;
let tokenClient = null;
let accessToken = null;

function log(message, type = 'info') {
    const logDiv = document.getElementById('log');
    const timestamp = new Date().toLocaleTimeString();
    const className = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info';
    logDiv.innerHTML += `<span class="${className}">[${timestamp}] ${message}</span>\n`;
    logDiv.scrollTop = logDiv.scrollHeight;
    console.log(message);
}

function clearLog() {
    document.getElementById('log').innerHTML = '';
}

async function loadConfig() {
    try {
        log('Loading configuration from /api/config...', 'info');
        const response = await fetch('/api/config');
        config = await response.json();
        
        log('Configuration loaded successfully', 'success');
        log(`Google Calendar Enabled: ${config.googleCalendar?.enabled}`, 'info');
        log(`Client ID: ${config.googleCalendar?.clientId}`, 'info');
        log(`API Key: ${config.googleCalendar?.apiKey?.substring(0, 15)}...`, 'info');
        
        document.getElementById('configResult').innerHTML = `
            <pre>${JSON.stringify(config.googleCalendar, null, 2)}</pre>
        `;
    } catch (error) {
        log(`Error loading config: ${error.message}`, 'error');
        document.getElementById('configResult').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

async function initGapi() {
    if (!config) {
        log('Please load config first!', 'error');
        return;
    }

    try {
        log('Loading Google API client script...', 'info');
        
        // Load the Google API client library
        await new Promise((resolve, reject) => {
            if (window.gapi) {
                log('Google API client already loaded', 'info');
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                log('Google API client script loaded', 'success');
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });

        // Load the Google Identity Services library
        log('Loading Google Identity Services...', 'info');
        await new Promise((resolve, reject) => {
            if (window.google?.accounts) {
                log('Google Identity Services already loaded', 'info');
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = () => {
                log('Google Identity Services loaded', 'success');
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });

        log('Loading gapi.client...', 'info');
        await new Promise((resolve, reject) => {
            window.gapi.load('client', {
                callback: resolve,
                onerror: reject
            });
        });
        log('gapi.client loaded successfully', 'success');

        log('Loading Calendar API discovery document...', 'info');
        await window.gapi.client.load('calendar', 'v3');
        
        log('Initializing OAuth2 token client...', 'info');
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: config.googleCalendar.clientId,
            scope: 'https://www.googleapis.com/auth/calendar.events',
            callback: (response) => {
                if (response.error !== undefined) {
                    log(`OAuth error: ${response.error}`, 'error');
                    throw response;
                }
                accessToken = response.access_token;
                log('Access token received', 'success');
                
                // Set the access token for API calls
                window.gapi.client.setToken({ access_token: accessToken });
                
                document.getElementById('authResult').innerHTML = `
                    <p style="color: green;">✓ Signed in successfully</p>
                    <p>Access token obtained</p>
                `;
            },
        });
        
        log('Google API initialized successfully!', 'success');
        document.getElementById('gapiResult').innerHTML = '<p style="color: green;">✓ Google API initialized</p>';
    } catch (error) {
        log(`Error initializing Google API: ${error.message}`, 'error');
        log(`Error details: ${JSON.stringify(error)}`, 'error');
        document.getElementById('gapiResult').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

async function testApiKey() {
    if (!config) {
        log('Please load config first!', 'error');
        return;
    }

    if (!accessToken) {
        log('Please sign in first! Calendar API requires OAuth authentication.', 'error');
        document.getElementById('apiKeyResult').innerHTML = '<p style="color: orange;">⚠ Please sign in first to test API access</p>';
        return;
    }

    try {
        log('Testing API access by fetching calendar list...', 'info');
        
        const response = await window.gapi.client.calendar.calendarList.list();
        
        if (response.result) {
            log('API access successful!', 'success');
            log(`Found ${response.result.items?.length || 0} calendars`, 'info');
            document.getElementById('apiKeyResult').innerHTML = `
                <p style="color: green;">✓ API access is working</p>
                <p>Found ${response.result.items?.length || 0} calendars</p>
            `;
        }
    } catch (error) {
        log(`API test failed: ${error.result?.error?.message || error.message}`, 'error');
        log(`Error code: ${error.status}`, 'error');
        log(`Error details: ${JSON.stringify(error.result?.error)}`, 'error');
        document.getElementById('apiKeyResult').innerHTML = `
            <p style="color: red;">✗ API Error</p>
            <pre>${JSON.stringify(error.result?.error, null, 2)}</pre>
        `;
    }
}

async function signIn() {
    if (!tokenClient) {
        log('Please initialize Google API first!', 'error');
        return;
    }

    try {
        log('Starting sign-in flow...', 'info');
        
        // Request an access token
        tokenClient.requestAccessToken({ prompt: 'consent' });
        
    } catch (error) {
        log(`Sign-in error: ${error.error || error.message}`, 'error');
        document.getElementById('authResult').innerHTML = `<p style="color: red;">Error: ${error.error || error.message}</p>`;
    }
}

async function signOut() {
    if (accessToken) {
        try {
            // Revoke the token
            google.accounts.oauth2.revoke(accessToken, () => {
                log('Access token revoked', 'success');
            });
            accessToken = null;
            log('Signed out successfully', 'success');
            document.getElementById('authResult').innerHTML = '<p>Signed out</p>';
        } catch (error) {
            log(`Sign-out error: ${error.message}`, 'error');
        }
    } else {
        log('No active session to sign out from', 'info');
        document.getElementById('authResult').innerHTML = '<p>Not signed in</p>';
    }
}

// Bind event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loadConfigBtn').addEventListener('click', loadConfig);
    document.getElementById('initGapiBtn').addEventListener('click', initGapi);
    document.getElementById('testApiKeyBtn').addEventListener('click', testApiKey);
    document.getElementById('signInBtn').addEventListener('click', signIn);
    document.getElementById('signOutBtn').addEventListener('click', signOut);
    document.getElementById('clearLogBtn').addEventListener('click', clearLog);
    
    log('Page loaded. Click "Load Config from Server" to start.', 'info');
});
