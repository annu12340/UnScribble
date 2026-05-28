let config = null;

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
        log('Loading Google API script...', 'info');
        
        await new Promise((resolve, reject) => {
            if (window.gapi) {
                log('Google API already loaded', 'info');
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                log('Google API script loaded', 'success');
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });

        log('Loading client:auth2...', 'info');
        await new Promise((resolve, reject) => {
            window.gapi.load('client:auth2', {
                callback: resolve,
                onerror: reject
            });
        });
        log('client:auth2 loaded successfully', 'success');

        log('Initializing gapi.client...', 'info');
        await window.gapi.client.init({
            apiKey: config.googleCalendar.apiKey,
            clientId: config.googleCalendar.clientId,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
            scope: 'https://www.googleapis.com/auth/calendar.events'
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

    try {
        log('Testing API Key by fetching calendar list...', 'info');
        const url = `https://www.googleapis.com/calendar/v3/users/me/calendarList?key=${config.googleCalendar.apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok) {
            log('API Key is valid!', 'success');
            document.getElementById('apiKeyResult').innerHTML = '<p style="color: green;">✓ API Key is valid</p>';
        } else {
            log(`API Key test failed: ${data.error?.message}`, 'error');
            log(`Error code: ${data.error?.code}`, 'error');
            log(`Error details: ${JSON.stringify(data.error)}`, 'error');
            document.getElementById('apiKeyResult').innerHTML = `
                <p style="color: red;">✗ API Key Error</p>
                <pre>${JSON.stringify(data.error, null, 2)}</pre>
            `;
        }
    } catch (error) {
        log(`Error testing API Key: ${error.message}`, 'error');
        document.getElementById('apiKeyResult').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

async function signIn() {
    if (!window.gapi || !window.gapi.auth2) {
        log('Please initialize Google API first!', 'error');
        return;
    }

    try {
        log('Starting sign-in flow...', 'info');
        const authInstance = window.gapi.auth2.getAuthInstance();
        await authInstance.signIn({ prompt: 'select_account' });
        
        const user = authInstance.currentUser.get();
        const profile = user.getBasicProfile();
        
        log('Sign-in successful!', 'success');
        log(`Signed in as: ${profile.getName()} (${profile.getEmail()})`, 'info');
        
        document.getElementById('authResult').innerHTML = `
            <p style="color: green;">✓ Signed in as ${profile.getName()}</p>
            <p>Email: ${profile.getEmail()}</p>
        `;
    } catch (error) {
        log(`Sign-in error: ${error.error || error.message}`, 'error');
        document.getElementById('authResult').innerHTML = `<p style="color: red;">Error: ${error.error || error.message}</p>`;
    }
}

async function signOut() {
    if (!window.gapi || !window.gapi.auth2) {
        log('Google API not initialized', 'error');
        return;
    }

    try {
        const authInstance = window.gapi.auth2.getAuthInstance();
        await authInstance.signOut();
        log('Signed out successfully', 'success');
        document.getElementById('authResult').innerHTML = '<p>Signed out</p>';
    } catch (error) {
        log(`Sign-out error: ${error.message}`, 'error');
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
