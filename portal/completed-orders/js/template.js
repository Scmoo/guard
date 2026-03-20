// =============================================
//  template.js
//  Handles: sidebar toggle, Auth0 guard,
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
    const saved     = localStorage.getItem(STORAGE_KEY);
    const isMobile  = window.innerWidth < 768;
    const collapsed = saved !== null ? saved === '1' : isMobile;
    setCollapsed(collapsed);
    markActiveNavItem();
  });
})();

// -----------------------------------------------
//  Mark the active sidebar nav item
//
//  Since every page is at portal/<pagename>/index.html,
//  we look at the second-to-last path segment:
//    /guard/portal/home/  →  "home"
//    /guard/portal/orders/ → "orders"
// -----------------------------------------------
function markActiveNavItem() {
  // Get the folder name of the current page
  const parts   = window.location.pathname.replace(/\/$/, '').split('/');
  const current = parts[parts.length - 1] || '';  // e.g. "home", "orders"

  document.querySelectorAll('.sidebar-nav-item[data-page]').forEach(item => {
    // data-page should match the folder name, e.g. data-page="home"
    if (item.dataset.page === current) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// -----------------------------------------------
//  Auth guard + user hydration
//  Called at the bottom of every portal page.
// -----------------------------------------------
async function initPortalPage() {
  // Auth check temporarily disabled for testing
  // const session = await requireAuth();
  // if (!session) return;

  // const { user } = session;

  // Hardcoded test values — remove when Auth0 is ready
  const user = { 
    'https://yourapp.com/orgName': 'Test Organization',
    'https://yourapp.com/role': 'admin'
  };

  // Hardcoded test values — remove when Auth0 is ready
  const user = { 
    'https://yourapp.com/orgName': 'Test Organization',
    'https://yourapp.com/role': 'admin'
  };

  // Fill in the org name in the header "Organization" button
  // (comes from your Auth0 Action custom claim — see README)
  const orgName = user['https://yourapp.com/orgName'] || 'My Organization';
  const orgEl   = document.getElementById('header-org-name');
  if (orgEl) orgEl.textContent = orgName;

  // Fill in greeting org name if element exists (home page)
  const greetingOrgEl = document.getElementById('greeting-org-name');
  if (greetingOrgEl) greetingOrgEl.textContent = orgName;

  // Show notification badge if there are unread notifications
  // Uncomment once your AWS /notifications endpoint is live:
  //
  // try {
  //   const data = await api.get('/notifications/unread-count');
  //   if (data?.count > 0) {
  //     const badge = document.getElementById('notif-badge');
  //     if (badge) badge.style.display = 'block';
  //   }
  // } catch (_) {}

  // Hide nav items / sections the user's role can't access
  const role = user['https://yourapp.com/role'] || 'staff';
  enforceRoles(role);
}

// Hides elements with data-roles="admin,provider"
// if the logged-in user's role isn't in the list
function enforceRoles(role) {
  document.querySelectorAll('[data-roles]').forEach(el => {
    const allowed = el.dataset.roles.split(',').map(r => r.trim());
    if (!allowed.includes(role)) el.style.display = 'none';
  });
}

// -----------------------------------------------
//  Greeting — "Good Morning / Afternoon / Evening"
//  Any element with id="greeting-time" gets filled in
// -----------------------------------------------
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('greeting-time');
  if (el) el.textContent = getGreeting();
});
