// =============================================
//  template.js
//  Handles: sidebar toggle, Auth0 guard,
//  user info hydration, active nav state.
//
//  Include on every portal page AFTER auth.js
// =============================================

// -----------------------------------------------
//  Sidebar collapse / expand
// -----------------------------------------------
(function initSidebar() {
  const STORAGE_KEY = 'sidebar_collapsed';

  function getSidebar()    { return document.getElementById('portal-sidebar'); }
  function getContent()    { return document.getElementById('portal-content'); }

  function setCollapsed(collapsed) {
    const sidebar = getSidebar();
    const content = getContent();
    if (!sidebar) return;

    if (collapsed) {
      sidebar.classList.add('collapsed');
      content?.classList.add('sidebar-collapsed');
    } else {
      sidebar.classList.remove('collapsed');
      content?.classList.remove('sidebar-collapsed');
    }

    // Persist user preference
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }

  // Expose toggle for the button onclick
  window.toggleSidebar = function () {
    const sidebar = getSidebar();
    if (!sidebar) return;
    const isNowCollapsed = !sidebar.classList.contains('collapsed');
    setCollapsed(isNowCollapsed);
  };

  // Restore preference on load
  document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // Default: expanded on desktop, collapsed on mobile
    const isMobile   = window.innerWidth < 768;
    const collapsed  = saved !== null ? saved === '1' : isMobile;
    setCollapsed(collapsed);
    markActiveNavItem();
  });
})();

// -----------------------------------------------
//  Mark the active sidebar nav item
//  based on the current page filename
// -----------------------------------------------
function markActiveNavItem() {
  const current = window.location.pathname.split('/').pop() || 'index.html';
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
//  Calls requireAuth() from auth.js,
//  then fills in the org name and user details.
// -----------------------------------------------
async function initPortalPage() {
  // 1. Verify the user is logged in via Auth0
  //    requireAuth() is defined in auth.js —
  //    it redirects to login.html if not authenticated.
  const session = await requireAuth();
  if (!session) return; // redirecting

  const { user } = session;

  // 2. Fill in the Organization name displayed in the header button
  //    The org name comes from the Auth0 token custom claim.
  //    You set this in your Auth0 Action (see README).
  const orgName = user['https://yourapp.com/orgName'] || 'My Organization';
  const orgEl   = document.getElementById('header-org-name');
  if (orgEl) orgEl.textContent = orgName;

  // 3. Fill in the greeting on the page (optional — used on home page)
  const greetingOrgEl = document.getElementById('greeting-org-name');
  if (greetingOrgEl) greetingOrgEl.textContent = orgName;

  // 4. Notification badge — fetch unread count from AWS
  //    Uncomment once your /notifications endpoint is live:
  //
  // try {
  //   const data = await api.get('/notifications/unread-count');
  //   if (data?.count > 0) {
  //     document.getElementById('notif-badge')?.style.setProperty('display', 'block');
  //   }
  // } catch (_) {}

  // 5. Role-based visibility
  //    Elements with data-roles="admin,provider" are hidden
  //    if the logged-in user's role isn't in that list.
  const role = user['https://yourapp.com/role'] || 'staff';
  enforceRoles(role);
}

function enforceRoles(role) {
  document.querySelectorAll('[data-roles]').forEach(el => {
    const allowed = el.dataset.roles.split(',').map(r => r.trim());
    if (!allowed.includes(role)) el.style.display = 'none';
  });
}

// -----------------------------------------------
//  Greeting helper — "Good Morning/Afternoon/Evening"
//  Call getGreeting() in your page's heading.
// -----------------------------------------------
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// Fill the greeting automatically if the element exists
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('greeting-time');
  if (el) el.textContent = getGreeting();
});
