// =============================================
//  auth.js — Supabase Auth Integration
//
//  ✅ SAFE TO COMMIT: The anon key below is
//  intentionally public. It only grants access
//  to what your Row Level Security (RLS) policies
//  allow. Think of it as a "guest pass" — your
//  RLS rules are the actual lock on the door.
//
//  🚫 NEVER commit your service_role key.
//     That one bypasses RLS and belongs only
//     on a private server (e.g. AWS Lambda).
// =============================================

const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_PUBLIC_KEY';

// -----------------------------------------------
//  Internal — Supabase client (created once)
// -----------------------------------------------
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    // Keeps the user logged in across page refreshes
    // using localStorage (same behaviour as Auth0's cacheLocation: 'localstorage')
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'phi'   // All tables (USR, ORG, etc.) live in the phi schema
  }
});

// -----------------------------------------------
//  LOGIN PAGE
//  Call initLoginPage() on your login index.html
// -----------------------------------------------

async function initLoginPage() {
  // If the user is already logged in, skip straight to the portal
  const { data: { session } } = await _supabase.auth.getSession();
  if (session) {
    window.location.replace('/guard/portal/home/');
  }
}

// Called when user clicks "Sign In"
// userId should be the user's email address.
// If you want a non-email User ID, see the note below.
async function loginWithCredentials(userId, password) {
  const { data, error } = await _supabase.auth.signInWithPassword({
    email:    userId,
    password: password,
  });
  if (error) throw error;
  return data;
}

// -----------------------------------------------
//  PORTAL PAGES
//  Call requireAuth() at the top of every page.
//  Returns the live session or null + redirects.
// -----------------------------------------------

async function requireAuth() {
  const { data: { session }, error } = await _supabase.auth.getSession();

  if (error || !session) {
    // Not logged in — bounce to login page
    window.location.replace('/guard/login/');
    return null;
  }

  return session;   // session.user has email, id, user_metadata, etc.
}

// Get the logged-in user object (or null)
async function getCurrentUser() {
  const { data: { user } } = await _supabase.auth.getUser();
  return user || null;
}

// Get the current JWT access token to attach to API requests
// e.g. Authorization: Bearer <token>
async function getAccessToken() {
  const { data: { session } } = await _supabase.auth.getSession();
  return session?.access_token || null;
}

// Get the user's role from their metadata
// Set this in Supabase Dashboard → Authentication → Users
// or via your server-side logic when creating users.
async function getUserRole() {
  const user = await getCurrentUser();
  return user?.user_metadata?.role || 'staff';
}

// Sign the user out and return to login page
async function logout() {
  await _supabase.auth.signOut();
  window.location.replace('/guard/login/');
}

// -----------------------------------------------
//  PASSWORD RESET
//  Sends a reset email. The link in the email
//  should point to an /account/ page where the
//  user sets their new password via:
//  _supabase.auth.updateUser({ password: '...' })
// -----------------------------------------------

async function sendPasswordReset(email) {
  const { error } = await _supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/guard/portal/account/',
  });
  if (error) throw error;
}

// -----------------------------------------------
//  Login page error display helper
// -----------------------------------------------
function showLoginError(message) {
  const el = document.getElementById('login-error');
  if (el) {
    el.textContent = message;
    el.classList.add('visible');
  }
}

// -----------------------------------------------
//  NOTE — Non-email User IDs
//
//  Supabase auth is email-based by default. If you
//  want users to log in with a short User ID (like
//  "WG-1042") instead of their email, two options:
//
//  Option A (simple): Just use email as the login
//  field and relabel it "User ID" in the UI.
//  Most orgs use work email anyway.
//
//  Option B (custom): Store a userId → email lookup
//  in a Supabase table, query it first, then call
//  signInWithPassword with the returned email.
//  Example:
//
//    const { data } = await _supabase
//      .from('users')
//      .select('email')
//      .eq('user_id', userId)
//      .single();
//    await _supabase.auth.signInWithPassword({
//      email: data.email, password
//    });
// -----------------------------------------------
