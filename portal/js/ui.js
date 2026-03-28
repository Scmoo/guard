// =============================================
//  ui.js — Shared UI Utilities
//  Toast notifications, modals, loading states,
//  and sidebar hydration helpers.
// =============================================

// -----------------------------------------------
//  Toast Notifications
// -----------------------------------------------

(function initToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.style.cssText = `
    position: fixed; bottom: 24px; right: 24px;
    display: flex; flex-direction: column; gap: 8px;
    z-index: 9999; max-width: 340px;
  `;
  document.body.appendChild(container);
})();

function toast(message, type = 'info', duration = 4000) {
  const colors = {
    success: { bg: '#d2fcd8', border: '#a0f0aa', text: '#1a5c1e', icon: '✓' },
    error:   { bg: '#fee2e2', border: '#fca5a5', text: '#7f1d1d', icon: '✕' },
    warning: { bg: '#fef3c7', border: '#fcd34d', text: '#78350f', icon: '⚠' },
    info:    { bg: '#dbeafe', border: '#93c5fd', text: '#1e3a8a', icon: 'ℹ' },
  };
  const c = colors[type] || colors.info;

  const el = document.createElement('div');
  el.style.cssText = `
    background: ${c.bg}; border: 1px solid ${c.border}; color: ${c.text};
    border-radius: 12px; padding: 12px 16px; font-family: 'Sora', sans-serif;
    font-size: 0.875rem; font-weight: 500; box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    display: flex; align-items: flex-start; gap: 10px;
    opacity: 0; transform: translateX(20px);
    transition: opacity 0.25s ease, transform 0.25s ease;
  `;
  el.innerHTML = `<span style="font-weight:700">${c.icon}</span><span>${message}</span>`;
  document.getElementById('toast-container').appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateX(0)';
  });

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// -----------------------------------------------
//  Loading / Spinner helpers
// -----------------------------------------------

function setLoading(buttonEl, loading) {
  if (loading) {
    buttonEl.dataset.originalText = buttonEl.innerHTML;
    buttonEl.innerHTML = `<span class="spinner"></span>`;
    buttonEl.disabled = true;
  } else {
    buttonEl.innerHTML = buttonEl.dataset.originalText || 'Submit';
    buttonEl.disabled = false;
  }
}

function showPageLoader() {
  let el = document.getElementById('page-loader');
  if (!el) {
    el = document.createElement('div');
    el.id = 'page-loader';
    el.style.cssText = `
      position: fixed; inset: 0; background: rgba(255,254,250,0.85);
      display: flex; align-items: center; justify-content: center;
      z-index: 9998; backdrop-filter: blur(3px);
    `;
    el.innerHTML = `
      <div style="text-align:center">
        <div class="spinner" style="width:36px;height:36px;border-width:4px;margin:0 auto"></div>
        <p style="margin-top:12px;font-size:0.85rem;color:#4a6070">Loading...</p>
      </div>
    `;
    document.body.appendChild(el);
  }
  el.style.display = 'flex';
}

function hidePageLoader() {
  const el = document.getElementById('page-loader');
  if (el) el.style.display = 'none';
}

// -----------------------------------------------
//  Modal helpers
// -----------------------------------------------

function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.add('open');
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.remove('open');
}

// Close modal when clicking the backdrop
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// -----------------------------------------------
//  Sidebar hydration
//
//  Reads the live Supabase session to fill in the
//  user's name, role, and avatar initials.
//  Also marks the active nav link.
//
//  Note: initPortalPage() in template.js already
//  handles this on page load. hydrateSidebar() is
//  here as a standalone utility if you need to
//  refresh the sidebar after a profile update.
// -----------------------------------------------
async function hydrateSidebar() {
  // Mark the active nav link
  const currentPage = window.location.pathname.replace(/\/$/, '').split('/').pop();
  document.querySelectorAll('.nav-item, .sidebar-nav-item').forEach(link => {
    const href = (link.getAttribute('href') || link.dataset.page || '').split('/').pop();
    if (href === currentPage) link.classList.add('active');
    else link.classList.remove('active');
  });

  // Fill in user name, role, and initials from the Supabase session + USR table
  try {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) return;

    // Pull role from USR table
    const { data: usrData } = await _supabase
      .from('USR')
      .select('role')
      .eq('"USRID"', session.user.id)
      .single();

    const email    = session.user.email || '';
    const name     = session.user.user_metadata?.full_name || email;
    const role     = usrData?.role || 'staff';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

    const nameEl   = document.getElementById('sidebar-user-name');
    const roleEl   = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-user-avatar');
    const topbarEl = document.getElementById('topbar-user-name');

    if (nameEl)   nameEl.textContent   = name;
    if (roleEl)   roleEl.textContent   = capitalize(role);
    if (avatarEl) avatarEl.textContent = initials;
    if (topbarEl) topbarEl.textContent = name;

    enforceRoleVisibility(role);
  } catch (e) {
    console.error('Sidebar hydration error:', e);
  }
}

// Hides elements tagged data-roles="admin,provider"
// if the user's role isn't in the allowed list
function enforceRoleVisibility(role) {
  document.querySelectorAll('[data-roles]').forEach(el => {
    const allowed = el.dataset.roles.split(',').map(r => r.trim());
    if (!allowed.includes(role)) {
      el.style.display = 'none';
    }
  });
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// -----------------------------------------------
//  Format helpers
// -----------------------------------------------

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  }
  return phone;
}

// -----------------------------------------------
//  Confirmation dialog
// -----------------------------------------------

function confirmDialog(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.classList.add('modal-overlay');
    overlay.style.cssText = 'opacity:0; pointer-events:none;';
    overlay.innerHTML = `
      <div class="modal" style="max-width:380px">
        <div class="modal-header">
          <h3 class="card-title">Confirm</h3>
        </div>
        <p style="font-size:0.9rem;color:var(--text-muted);margin-bottom:4px">${message}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost btn-sm" id="confirm-cancel">Cancel</button>
          <button class="btn btn-danger btn-sm" id="confirm-ok">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      overlay.style.transition = 'opacity 0.2s ease';
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'all';
    });

    overlay.querySelector('#confirm-cancel').onclick = () => { overlay.remove(); resolve(false); };
    overlay.querySelector('#confirm-ok').onclick     = () => { overlay.remove(); resolve(true);  };
  });
}

// -----------------------------------------------
//  NOTE — confirm() rename
//
//  The previous version overrode the browser's
//  built-in window.confirm(). Renamed to
//  confirmDialog() to avoid that conflict.
//  Update any existing calls in your page scripts:
//    confirm('…')        → confirmDialog('…')
// -----------------------------------------------
