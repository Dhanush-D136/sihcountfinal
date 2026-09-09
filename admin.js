/* ==========================================================================
   SIH 2026 - ADMIN CONTROL PANEL FRONTEND CONTROLLER
   Vel Tech High Tech Dr. Rangarajan Dr. Sakunthala Engineering College
   ========================================================================== */

(function () {
  'use strict';

  // DOM Elements
  const adminLoginView = document.getElementById('adminLoginView');
  const adminDashboardView = document.getElementById('adminDashboardView');

  // Login Form Elements
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminUsernameInput = document.getElementById('adminUsername');
  const adminPasswordInput = document.getElementById('adminPassword');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const passwordEyeIcon = document.getElementById('passwordEyeIcon');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');
  const loginBtnText = document.getElementById('loginBtnText');
  const loginErrorAlert = document.getElementById('loginErrorAlert');
  const loginErrorMessage = document.getElementById('loginErrorMessage');

  // Dashboard Elements
  const adminUsernameDisplay = document.getElementById('adminUsernameDisplay');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');
  const dashboardStatusPill = document.getElementById('dashboardStatusPill');

  const adminDigitHours = document.getElementById('adminDigitHours');
  const adminDigitMinutes = document.getElementById('adminDigitMinutes');
  const adminDigitSeconds = document.getElementById('adminDigitSeconds');

  const adminProgressFill = document.getElementById('adminProgressFill');
  const adminProgressPercent = document.getElementById('adminProgressPercent');

  const metaStartTime = document.getElementById('metaStartTime');
  const metaTargetTime = document.getElementById('metaTargetTime');
  const metaServerTime = document.getElementById('metaServerTime');

  // Action Buttons
  const adminStartBtn = document.getElementById('adminStartBtn');
  const adminPauseBtn = document.getElementById('adminPauseBtn');
  const adminResumeBtn = document.getElementById('adminResumeBtn');
  const adminResetBtn = document.getElementById('adminResetBtn');

  // Edit Timer Form & Presets
  const editTimerForm = document.getElementById('editTimerForm');
  const editHours = document.getElementById('editHours');
  const editMinutes = document.getElementById('editMinutes');
  const editSeconds = document.getElementById('editSeconds');
  const presetBtns = document.querySelectorAll('.preset-btn');

  // Announcement Form & Presets
  const announcementForm = document.getElementById('announcementForm');
  const annFormHeading = document.getElementById('annFormHeading');
  const annFormTime = document.getElementById('annFormTime');
  const annFormDetails = document.getElementById('annFormDetails');
  const annFormDuration = document.getElementById('annFormDuration');
  const annFormPriority = document.getElementById('annFormPriority');
  const triggerNowBtn = document.getElementById('triggerNowBtn');
  const annPresetBtns = document.querySelectorAll('.ann-preset-btn');

  // Audit Table & Refresh
  const auditLogTableBody = document.getElementById('auditLogTableBody');
  const refreshAuditBtn = document.getElementById('refreshAuditBtn');

  // Modal Elements
  const resetConfirmModal = document.getElementById('resetConfirmModal');
  const cancelResetBtn = document.getElementById('cancelResetBtn');
  const confirmResetBtn = document.getElementById('confirmResetBtn');

  let pollInterval = null;

  // 1. Password Visibility Toggle
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = adminPasswordInput.type === 'password';
    adminPasswordInput.type = isPassword ? 'text' : 'password';
    passwordEyeIcon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
  });

  // 2. Format Helpers
  function pad2(num) {
    return String(num).padStart(2, '0');
  }

  function formatTime(ts) {
    if (!ts) return '--:--:--';
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  }

  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts * 1000);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  }

  // 3. Render Audit Log Table
  function renderAuditLogs(logs) {
    if (!logs || logs.length === 0) {
      auditLogTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No audit logs recorded yet.</td></tr>';
      return;
    }

    auditLogTableBody.innerHTML = logs.map(log => `
      <tr>
        <td>${formatDate(log.timestamp)}</td>
        <td><strong class="text-cyan">${log.action}</strong></td>
        <td>${log.admin_identifier}</td>
        <td>${log.details || '--'}</td>
        <td><code>${log.ip_address || '127.0.0.1'}</code></td>
      </tr>
    `).join('');
  }

  // 4. Render Dashboard Event State
  function renderDashboard(eventState) {
    if (!eventState) return;

    const status = eventState.status;
    const remaining = eventState.remaining_seconds || 0;

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    adminDigitHours.textContent = pad2(hours);
    adminDigitMinutes.textContent = pad2(minutes);
    adminDigitSeconds.textContent = pad2(seconds);

    // Progress Bar
    const progress = eventState.progress_percent || 0;
    adminProgressFill.style.width = `${progress}%`;
    adminProgressPercent.textContent = `${progress.toFixed(1)}%`;

    // Metadata timestamps
    metaStartTime.textContent = formatTime(eventState.start_timestamp);
    metaTargetTime.textContent = formatTime(eventState.target_timestamp);
    metaServerTime.textContent = formatTime(eventState.server_time);

    // Status Pill Class & Action Buttons State
    dashboardStatusPill.textContent = status.replace('_', ' ');
    dashboardStatusPill.className = 'status-indicator-pill ' + status.toLowerCase();

    if (status === 'RUNNING') {
      adminStartBtn.disabled = true;
      adminPauseBtn.disabled = false;
      adminResumeBtn.disabled = true;
    } else if (status === 'PAUSED') {
      adminStartBtn.disabled = true;
      adminPauseBtn.disabled = true;
      adminResumeBtn.disabled = false;
    } else { // NOT_STARTED or COMPLETED
      adminStartBtn.disabled = false;
      adminPauseBtn.disabled = true;
      adminResumeBtn.disabled = true;
    }
  }

  // 5. Fetch Authoritative Admin Status & Audit Logs
  async function fetchAdminStatus() {
    try {
      const res = await fetch('/api/admin/status');
      if (res.status === 401) {
        showLoginView();
        return;
      }
      const data = await res.json();
      if (data.authenticated) {
        showDashboardView(data.username);
        renderDashboard(data.event);
        renderAuditLogs(data.audit_logs);
      }
    } catch (e) {
      console.error('Failed to fetch admin status:', e);
    }
  }

  function showLoginView() {
    if (pollInterval) clearInterval(pollInterval);
    adminDashboardView.classList.add('hidden');
    adminLoginView.classList.remove('hidden');
  }

  function showDashboardView(username) {
    adminUsernameDisplay.textContent = username || 'Vel Tech SIH';
    adminLoginView.classList.add('hidden');
    adminDashboardView.classList.remove('hidden');

    if (!pollInterval) {
      pollInterval = setInterval(fetchAdminStatus, 2000);
    }
  }

  // 6. Admin Login Request
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginErrorAlert.classList.add('hidden');
    loginSubmitBtn.disabled = true;
    loginBtnText.textContent = 'AUTHENTICATING...';

    const username = adminUsernameInput.value.trim();
    const password = adminPasswordInput.value.trim();

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        fetchAdminStatus();
      } else {
        loginErrorMessage.textContent = data.error || 'Invalid administrator credentials.';
        loginErrorAlert.classList.remove('hidden');
      }
    } catch (err) {
      loginErrorMessage.textContent = 'Server connection error. Please try again.';
      loginErrorAlert.classList.remove('hidden');
    } finally {
      loginSubmitBtn.disabled = false;
      loginBtnText.textContent = 'ADMIN LOGIN';
    }
  });

  // 7. Admin Logout Request
  adminLogoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {}
    showLoginView();
  });

  // 8. Event Actions: Start, Pause, Resume
  adminStartBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/admin/event/start', { method: 'POST' });
      if (res.ok) fetchAdminStatus();
    } catch (e) {}
  });

  adminPauseBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/admin/event/pause', { method: 'POST' });
      if (res.ok) fetchAdminStatus();
    } catch (e) {}
  });

  adminResumeBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/admin/event/resume', { method: 'POST' });
      if (res.ok) fetchAdminStatus();
    } catch (e) {}
  });

  // 9. Protected Reset Confirmation Workflow
  adminResetBtn.addEventListener('click', () => {
    resetConfirmModal.classList.remove('hidden');
  });

  cancelResetBtn.addEventListener('click', () => {
    resetConfirmModal.classList.add('hidden');
  });

  confirmResetBtn.addEventListener('click', async () => {
    resetConfirmModal.classList.add('hidden');
    try {
      const res = await fetch('/api/admin/event/reset', { method: 'POST' });
      if (res.ok) fetchAdminStatus();
    } catch (e) {}
  });

  // 10. Edit Timer Form & Presets
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      editHours.value = btn.dataset.h;
      editMinutes.value = btn.dataset.m;
      editSeconds.value = btn.dataset.s;
    });
  });

  editTimerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const hours = parseInt(editHours.value || 0, 10);
    const minutes = parseInt(editMinutes.value || 0, 10);
    const seconds = parseInt(editSeconds.value || 0, 10);

    try {
      const res = await fetch('/api/admin/event/edit_timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours, minutes, seconds })
      });
      if (res.ok) fetchAdminStatus();
    } catch (e) {}
  });

  // 11. Announcement Form & Presets
  annPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      annFormHeading.value = btn.dataset.head;
      annFormTime.value = btn.dataset.time;
      annFormDetails.value = btn.dataset.det;
    });
  });

  triggerNowBtn.addEventListener('click', async () => {
    const heading = annFormHeading.value.trim();
    const time_label = annFormTime.value.trim();
    const details = annFormDetails.value.trim();
    const duration_seconds = parseInt(annFormDuration.value, 10);
    const priority = annFormPriority.value;

    if (!heading || !details) {
      alert('Please enter a heading and details for the announcement.');
      return;
    }

    try {
      const res = await fetch('/api/admin/announcements/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heading,
          time_label,
          details,
          duration_seconds,
          priority,
          sound_enabled: true,
          display_now: true
        })
      });
      if (res.ok) {
        annFormHeading.value = '';
        annFormTime.value = '';
        annFormDetails.value = '';
        fetchAdminStatus();
      }
    } catch (e) {}
  });

  refreshAuditBtn.addEventListener('click', fetchAdminStatus);

  // Initialize Admin State Check
  document.addEventListener('DOMContentLoaded', fetchAdminStatus);
})();
