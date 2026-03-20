// =============================================
//  auth.js — Auth0 Integration
//  ⚠ Replace the three YOUR_* values below
//    with your real Auth0 credentials.
// =============================================

const AUTH_CONFIG = {
  domain:    'YOUR_AUTH0_DOMAIN',       // e.g. dev-abc123.us.auth0.com
  clientId:  'YOUR_AUTH0_CLIENT_ID',    // from Auth0 dashboard → Applications
  audience:  'YOUR_AUTH0_API_AUDIENCE', // e.g. https://api.woundguard.com

  // After login, Auth0 sends the user HERE:
  redirectUri: window.location.origin + '/guard/portal/home/',

  // After logout, Auth0 sends the user HERE:
  logoutUri: window.location.origin + '/guard/login/',
};

// -----------------------------------------------
//  Internal — Auth0 client (created once, reused)
// -----------------------------------------------
let _auth0Client = null;

async function getAuth0Client() {
  if (_auth0Client) return _auth0Client;

  _auth0Client = await auth0.createAuth0Client({
    domain:   AUTH_CONFIG.domain,
    clientId: AUTH_CONFIG.clientId,
    authorizationParams: {
      redirect_uri: AUTH_CONFIG.redirectUri,
      audience:     AUTH_CONFIG.audience,
      scope:        'openid profile email',
    },
    cacheLocation: 'localstorage', // stays logged in after page refresh
    useRefreshTokens: true,
  });

  return _auth0Client;
}

// -----------------------------------------------
//  LOGIN PAGE — call this in login/index.html
// -----------------------------------------------

// Run on login page load — handles the redirect
// back from Auth0 and checks if already logged in.
async function initLoginPage() {
  const client = await getAuth0Client();

  // Auth0 redirects back with ?code= in the URL after login
  if (window.location.search.includes('code=') || window.location.search.includes('error=')) {
    try {
      await client.handleRedirectCallback();
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.replace(AUTH_CONFIG.redirectUri);
    } catch (err) {
      console.error('Auth0 callback error:', err);
      showLoginError('Login failed. Please try again.');
    }
    return;
  }

  // Already logged in? Skip the login page.
  const authenticated = await client.isAuthenticated();
  if (authenticated) {
    window.location.replace(AUTH_CONFIG.redirectUri);
  }
}

// Called when user clicks "Sign In"
async function loginWithRedirect() {
  const client = await getAuth0Client();
  await client.loginWithRedirect();
}

// -----------------------------------------------
//  PORTAL PAGES — call requireAuth() on every page
// -----------------------------------------------

// Checks login status. If not logged in, redirects
// to the login page. Returns { user, token } if OK.
async function requireAuth() {
  const client = await getAuth0Client();
  const authenticated = await client.isAuthenticated();

  if (!authenticated) {
    // Not logged in — send to login page
    window.location.replace(window.location.origin + '/guard/login/');
    return null;
  }

  const user  = await client.getUser();
  const token = await client.getTokenSilently({ audience: AUTH_CONFIG.audience });
  return { user, token };
}

// Get the logged-in user object (or null if not logged in)
async function getCurrentUser() {
  const client = await getAuth0Client();
  if (!(await client.isAuthenticated())) return null;
  return client.getUser();
}

// Get a fresh access token to send to your AWS API
async function getAccessToken() {
  const client = await getAuth0Client();
  return client.getTokenSilently({ audience: AUTH_CONFIG.audience });
}

// Get the user's role (admin / provider / nurse)
// This is set in your Auth0 Action — see README
async function getUserRole() {
  const client = await getAuth0Client();
  const user   = await client.getUser();
  return user?.['https://yourapp.com/role'] || 'staff';
}

// Sign the user out and return to login page
async function logout() {
  const client = await getAuth0Client();
  await client.logout({
    logoutParams: { returnTo: AUTH_CONFIG.logoutUri }
  });
}

// -----------------------------------------------
//  Used by login page to show error messages
// -----------------------------------------------
function showLoginError(message) {
  const el = document.getElementById('login-error');
  if (el) {
    el.textContent = message;
    el.classList.add('visible');
  }
}
