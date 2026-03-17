// =============================================
//  auth.js — Auth0 Integration
//  Replace the CONFIG values with your own
//  from the Auth0 dashboard.
// =============================================

const AUTH_CONFIG = {
  domain:       'YOUR_AUTH0_DOMAIN',        // e.g. dev-abc123.us.auth0.com
  clientId:     'YOUR_AUTH0_CLIENT_ID',     // from Auth0 Application settings
  audience:     'YOUR_AUTH0_API_AUDIENCE',  // e.g. https://api.yourapp.com
  redirectUri:  window.location.origin + '/pages/dashboard.html',
  logoutUri:    window.location.origin + '/login.html',
};

// -----------------------------------------------
//  Auth0 SDK wrapper — thin helpers used by pages
// -----------------------------------------------
let _auth0Client = null;

/**
 * Initialise (or return cached) Auth0 client.
 * Called once per page load.
 */
async function getAuth0Client() {
  if (_auth0Client) return _auth0Client;

  // The Auth0 SPA SDK must be loaded via <script> tag on each page:
  // <script src="https://cdn.auth0.com/js/auth0-spa-js/2.0/auth0-spa-js.production.js"></script>
  _auth0Client = await auth0.createAuth0Client({
    domain:   AUTH_CONFIG.domain,
    clientId: AUTH_CONFIG.clientId,
    authorizationParams: {
      redirect_uri: AUTH_CONFIG.redirectUri,
      audience:     AUTH_CONFIG.audience,
      scope:        'openid profile email',
    },
    cacheLocation: 'localstorage',  // survives page refresh
    useRefreshTokens: true,
  });

  return _auth0Client;
}

// -----------------------------------------------
//  Login Page helpers
// -----------------------------------------------

/**
 * Called by login.html after Auth0 SDK loads.
 * Handles the redirect-back callback automatically,
 * then checks if already logged in.
 */
async function initLoginPage() {
  const client = await getAuth0Client();

  // After Auth0 redirects back with ?code= in the URL
  if (window.location.search.includes('code=') || window.location.search.includes('error=')) {
    try {
      await client.handleRedirectCallback();
      // Clean up the URL, then send to dashboard
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.replace(AUTH_CONFIG.redirectUri);
    } catch (err) {
      console.error('Callback error:', err);
      showLoginError('Login failed. Please try again.');
    }
    return;
  }

  // Already authenticated? Skip login.
  const authenticated = await client.isAuthenticated();
  if (authenticated) {
    window.location.replace(AUTH_CONFIG.redirectUri);
  }
}

/**
 * Trigger Auth0 Universal Login / redirect flow.
 * Called when user clicks "Sign In".
 */
async function loginWithRedirect() {
  const client = await getAuth0Client();
  await client.loginWithRedirect();
}

/**
 * (Optional) Username/password login without leaving the page.
 * Requires "Password" grant enabled in Auth0 dashboard.
 */
async function loginWithCredentials(username, password) {
  // Auth0 SPA SDK does not support username/password directly in browser
  // for security reasons. We use Universal Login redirect instead.
  // This function is kept as a placeholder — the button triggers loginWithRedirect().
  await loginWithRedirect();
}

// -----------------------------------------------
//  Protected Page helpers
// -----------------------------------------------

/**
 * Call at the top of every protected page.
 * If not logged in, redirects to login.
 * Returns { user, token } on success.
 */
async function requireAuth() {
  const client = await getAuth0Client();
  const authenticated = await client.isAuthenticated();

  if (!authenticated) {
    window.location.replace(window.location.origin + '/login.html');
    return null;
  }

  const user  = await client.getUser();
  const token = await client.getTokenSilently({ audience: AUTH_CONFIG.audience });
  return { user, token };
}

/**
 * Get the current user object (or null).
 */
async function getCurrentUser() {
  const client = await getAuth0Client();
  if (!(await client.isAuthenticated())) return null;
  return client.getUser();
}

/**
 * Get a fresh API access token.
 */
async function getAccessToken() {
  const client = await getAuth0Client();
  return client.getTokenSilently({ audience: AUTH_CONFIG.audience });
}

/**
 * Get the user's role from their Auth0 token claims.
 * Roles are stored in the token via an Auth0 Action (see README).
 */
async function getUserRole() {
  const client = await getAuth0Client();
  const user   = await client.getUser();
  // Auth0 puts custom claims under a namespaced key
  return user?.['https://yourapp.com/role'] || 'staff';
}

/**
 * Log the user out and return to login page.
 */
async function logout() {
  const client = await getAuth0Client();
  await client.logout({
    logoutParams: { returnTo: AUTH_CONFIG.logoutUri }
  });
}

// -----------------------------------------------
//  UI helper — used by login.html
// -----------------------------------------------
function showLoginError(message) {
  const el = document.getElementById('login-error');
  if (el) {
    el.textContent = message;
    el.classList.add('visible');
  }
}
