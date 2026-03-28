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
//  Internal — Supabase client (created once,
//  shared across auth.js, template.js, ui.js,
//  and all portal page scripts via window scope)
// -----------------------------------------------
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession:     true,   // stays logged in across page refreshes
    autoRefreshToken:   true,   // silently renews the JWT before it expires
    detectSessionInUrl: true,   // handles magic link / password reset callbacks
  }
});

// -----------------------------------------------
//  LOGIN PAGE
//  Call initLoginPage() in your login index.html
// -----------------------------------------------

// Runs on login page load.
// If the user already has a valid session, skip
// straight to the portal — no need to log in again.
async function initLoginPage() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (session) {
    window.location.replace('/guard/portal/home/');
  }
}

// Called when the user submits the login form.
// userId should be the user's email address.
// See the note at the bottom of this file if you
// want to support a non-email User ID field.
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
//  Called automatically by template.js on every
//  protected page — you do not need to call this
//  manually on individual pages.
// -----------------------------------------------

// Checks the Supabase session from localStorage.
// Fast — no network request unless token has expired.
// Returns the session object, or null + redirects to login.
async function requireAuth() {
  const { data: { session }, error } = await _supabase.auth.getSession();

  if (error || !session) {
    window.location.replace('/guard/login/');
    return null;
  }

  return session;  // session.user has .id, .email, .user_metadata
}

// Get the full Supabase user object (or null)
async function getCurrentUser() {
  const { data: { user } } = await _supabase.auth.getUser();
  return user || null;
}

// Get the current JWT to attach to API calls:
// fetch('/api/...', { headers: { Authorization: `Bearer ${token}` } })
async function getAccessToken() {
  const { data: { session } } = await _supabase.auth.getSession();
  return session?.access_token || null;
}

// Get the user's role from the USR table.
// Falls back to 'staff' if not found.
async function getUserRole() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) return 'staff';

  const { data } = await _supabase
    .from('USR')
    .select('role')
    .eq('"USRID"', session.user.id)
    .single();

  return data?.role || 'staff';
}

// Sign the user out and return to the login page
async function logout() {
  await _supabase.auth.signOut();
  window.location.replace('/guard/login/');
}

// -----------------------------------------------
//  Password Reset
//  Sends a reset email. The link in the email
//  lands on /guard/portal/account/ where you call:
//  _supabase.auth.updateUser({ password: 'newpass' })
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
//  Supabase auth is email-based. If you want users
//  to type a short ID (e.g. "WG-1042") instead of
//  their email, add a lookup first:
//
//    const { data } = await _supabase
//      .from('USR')
//      .select('email')
//      .eq('"USRID"', userId)   ← custom ID column
//      .single();
//    await loginWithCredentials(data.email, password);
//
//  You would need an 'email' column in USR for this.
// -----------------------------------------------
