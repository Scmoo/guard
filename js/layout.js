// =============================================
//  layout.js
//  Handles: sidebar toggle, Supabase auth guard,
//  user info hydration, active nav state.
//
//  Loaded on every portal page after auth.js
// =============================================

// -----------------------------------------------
//  Sidebar collapse / expand
// -----------------------------------------------
(function initSidebar() {
  const STORAGE_KEY = 'sidebar_collapsed';

  function getSidebar() { return document.getElementById('portal-sidebar'); }
  function getContent() { return document.getElementById('portal-content'); }

  function setCollapsed(collapsed) {
    const sidebar = getSidebar();
    const content = getContent();
    if (!sidebar) return;

    sidebar.classList.toggle('collapsed', collapsed);
    content?.classList.toggle('sidebar-collapsed', collapsed);

    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }

  // The toggle button in the sidebar calls this
  window.toggleSidebar = function () {
    const sidebar = getSidebar();
    if (!sidebar) return;
    setCollapsed(!sidebar.classList.contains('collapsed'));
  };

  // On page load, restore saved preference
  // (default: expanded on desktop, collapsed on mobile)
  document.addEventListener('DOMContentLoaded', () => {
    const saved    = localStorage.getItem(STORAGE_KEY);
    const isMobile = window.innerWidth < 768;
    const collapsed = saved !== null ? saved === '1' : isMobile;
    setCollapsed(collapsed);
    markActiveNavItem();
  });
})();

// -----------------------------------------------
//  Mark the active sidebar nav item
//
//  Since every page is at portal/<pagename>/index.html,
//  we look at the last path segment:
//    /guard/portal/home/   →  "home"
//    /guard/portal/orders/ →  "orders"
// -----------------------------------------------
function markActiveNavItem() {
  const parts   = window.location.pathname.replace(/\/$/, '').split('/');
  const current = parts[parts.length - 1] || '';

  document.querySelectorAll('.sidebar-nav-item[data-page]').forEach(item => {
    if (item.dataset.page === current) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// -----------------------------------------------
//  Auth guard + user hydration
//
//  This is the GLOBAL auth guard. It runs on
//  every protected portal page automatically via
//  the DOMContentLoaded listener at the bottom.
//
//  It does three things:
//    1. Calls requireAuth() from auth.js — if the
//       user is not logged in they are immediately
//       redirected to /guard/login/ and nothing
//       else runs.
//    2. Looks up the user's row in the USR table
//       to get their ORGID and role.
//    3. Hydrates the page with org name and enforces
//       role-based visibility on nav/content elements.
// -----------------------------------------------
async function initPortalPage() {

  // ── Step 1: Auth check ──────────────────────
  // requireAuth() is defined in auth.js.
  // If the session is missing it redirects to login
  // and returns null — so we stop here immediately.
  const session = await requireAuth();
  if (!session) return;

  // ── Step 2: Load user profile from USR table ─
  // We query the USR row whose USRID matches the
  // logged-in user's Supabase auth UUID, and join
  // the ORG table to get the org name.
  let orgName = 'My Organization';
  let role    = 'staff';

  try {
    const { data, error } = await _supabase
      .from('USR')
      .select(`
        role,
        ORG ( "OrgName" )
      `)
      // ⚠️  The join above uses the PostgREST foreign-key relationship name.
      //     If your FK is named differently in Supabase, change "ORG" to match
      //     the relationship name shown in: Table Editor → USR → Foreign Keys.
      .eq('"USRID"', session.user.id)
      .single();


    if (!error && data) {
      role    = data.role         || 'staff';
      orgName = data.ORG?.OrgName || 'My Organization';
    }
  } catch (e) {
    // Non-fatal — page still loads with safe defaults.
    console.warn('Could not load user profile from USR:', e.message);
  }

  // ── Step 3: Hydrate the page ─────────────────

  // Header "Organization" button text
  const orgEl = document.getElementById('header-org-name');
  if (orgEl) orgEl.textContent = orgName;

  // Home page greeting org name
  const greetingOrgEl = document.getElementById('greeting-org-name');
  if (greetingOrgEl) greetingOrgEl.textContent = orgName;

  // Sidebar user details — name, role label, avatar initials
  const email    = session.user.email || '';
  const name     = session.user.user_metadata?.full_name || email;
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  const nameEl   = document.getElementById('sidebar-user-name');
  const roleEl   = document.getElementById('sidebar-user-role');
  const avatarEl = document.getElementById('sidebar-user-avatar');
  const topbarEl = document.getElementById('topbar-user-name');

  if (nameEl)   nameEl.textContent   = name;
  if (roleEl)   roleEl.textContent   = capitalize(role);
  if (avatarEl) avatarEl.textContent = initials;
  if (topbarEl) topbarEl.textContent = name;

  // Hide nav items / content sections the user's role can't see
  enforceRoles(role);

  // ── Notification badge (uncomment when API is ready) ──
  // try {
  //   const token = await getAccessToken();
  //   const res   = await fetch('/api/notifications/unread-count', {
  //     headers: { Authorization: `Bearer ${token}` }
  //   });
  //   const data = await res.json();
  //   if (data?.count > 0) {
  //     const badge = document.getElementById('notif-badge');
  //     if (badge) badge.style.display = 'block';
  //   }
  // } catch (_) {}
}

// -----------------------------------------------
//  Role enforcement
//  Hides elements tagged with data-roles="admin,provider"
//  if the logged-in user's role isn't in that list.
//  Example HTML: <li data-roles="admin">Admin Panel</li>
// -----------------------------------------------
function enforceRoles(role) {
  document.querySelectorAll('[data-roles]').forEach(el => {
    const allowed = el.dataset.roles.split(',').map(r => r.trim());
    if (!allowed.includes(role)) el.style.display = 'none';
  });
}

// -----------------------------------------------
//  Greeting — "Good Morning / Afternoon / Evening"
//  Any element with id="greeting-time" gets filled in.
// -----------------------------------------------
function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'Good Morning';
  if (h >= 12 && h < 17) return 'Good Afternoon';
  if (h >= 17 && h < 21) return 'Good Evening';
  return 'Good Night';
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// -----------------------------------------------
//  GLOBAL AUTO-GUARD
//
//  This DOMContentLoaded listener runs on every
//  page that loads layout.js. You do NOT need
//  to manually call initPortalPage() on each page —
//  it fires automatically on every protected page.
//
//  The sidebar state is handled separately by the
//  initSidebar IIFE above.
// -----------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Fill greeting time element if it exists on this page
  const greetEl = document.getElementById('greeting-time');
  if (greetEl) greetEl.textContent = getGreeting();

  // Run auth guard + page hydration on every portal page
  initPortalPage();
});
