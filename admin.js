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
  const annFormMusic = document.getElementById('annFormMusic');
  const annFormPriority = document.getElementById('annFormPriority');
  const annLoopMusicCheckbox = document.getElementById('annLoopMusicCheckbox');
  const previewAudioBtn = document.getElementById('previewAudioBtn');
  const previewAudioIcon = document.getElementById('previewAudioIcon');
  const previewAudioBtnText = document.getElementById('previewAudioBtnText');
  const previewAnnOverlayBtn = document.getElementById('previewAnnOverlayBtn');
  const triggerNowBtn = document.getElementById('triggerNowBtn');
  const annPresetBtns = document.querySelectorAll('.ann-preset-btn');

  // Duration segmented bar & custom inputs
  const durationPills = document.querySelectorAll('.duration-pill');
  const customDurationWrapper = document.getElementById('customDurationWrapper');
  const customDurHours = document.getElementById('customDurHours');
  const customDurMinutes = document.getElementById('customDurMinutes');
  const customDurSeconds = document.getElementById('customDurSeconds');

  // Announcement History Table
  const annHistoryTableBody = document.getElementById('annHistoryTableBody');

  // Audit Log Table & Refresh
  const auditLogTableBody = document.getElementById('auditLogTableBody');
  const refreshAuditBtn = document.getElementById('refreshAuditBtn');

  // Reset Confirmation Modal Elements
  const resetConfirmModal = document.getElementById('resetConfirmModal');
  const cancelResetBtn = document.getElementById('cancelResetBtn');
  const confirmResetBtn = document.getElementById('confirmResetBtn');

  // Preview Modal Elements
  const adminAnnPreviewModal = document.getElementById('adminAnnPreviewModal');
  const adminPreviewGlassCard = document.getElementById('adminPreviewGlassCard');
  const adminPreviewPriorityBadge = document.getElementById('adminPreviewPriorityBadge');
  const adminPreviewTimeLabel = document.getElementById('adminPreviewTimeLabel');
  const adminPreviewHeading = document.getElementById('adminPreviewHeading');
  const adminPreviewDetails = document.getElementById('adminPreviewDetails');
  const adminPreviewProgressFill = document.getElementById('adminPreviewProgressFill');
  const adminPreviewTimerText = document.getElementById('adminPreviewTimerText');
  const closeAdminPreviewBtn = document.getElementById('closeAdminPreviewBtn');

  // API Base URL Configuration for Render Backend
  const DEFAULT_RENDER_URL = 'https://sihcountdownveltech.onrender.com';
  const API_BASE_URL = window.API_BASE_URL ||
    (window.location.hostname.includes('vercel.app') ? DEFAULT_RENDER_URL : '');

  // Local State
  let availableMusicList = [];
  let currentSelectedDurationType = '60'; // default 60s (1 min)
  let previewAudioInstance = null;
  let previewTimerInterval = null;
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

  function formatDurationLabel(sec, untilComplete) {
    if (untilComplete) return 'Until song completes';
    if (!sec || sec <= 0) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0) return `${m} min${m > 1 ? 's' : ''}`;
    return `${s} seconds`;
  }

  // 3. Fetch Available Notification Music from Server
  async function fetchMusicList() {
    try {
      const res = await fetch(API_BASE_URL + '/api/music/list', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        availableMusicList = data.music || [];
        populateMusicDropdown();
      }
    } catch (e) {
      console.error('Failed to fetch notification music list:', e);
    }
  }

  function populateMusicDropdown() {
    if (!annFormMusic) return;
    if (!availableMusicList || availableMusicList.length === 0) {
      annFormMusic.innerHTML = '<option value="">None — No Sound</option>';
      updateMusicSelectionUI();
      return;
    }

    annFormMusic.innerHTML = availableMusicList.map(song => `
      <option value="${song.filename}">${song.title}</option>
    `).join('');

    updateMusicSelectionUI();
  }

  function updateMusicSelectionUI() {
    if (!annFormMusic) return;
    const selectedMusic = annFormMusic.value;
    const untilSongCompletePill = document.querySelector('.duration-pill[data-value="until_complete"]');

    if (!selectedMusic) {
      // None — No Sound selected
      previewAudioBtn.disabled = true;
      previewAudioIcon.className = 'fa-solid fa-volume-xmark';
      previewAudioBtnText.textContent = 'No Sound';
      previewAudioBtn.classList.add('disabled-btn');

      if (untilSongCompletePill) {
        untilSongCompletePill.disabled = true;
        untilSongCompletePill.classList.add('pill-disabled');
        untilSongCompletePill.title = 'Select a song to use this option';

        if (currentSelectedDurationType === 'until_complete') {
          durationPills.forEach(p => p.classList.remove('active'));
          const default60Pill = document.querySelector('.duration-pill[data-value="60"]');
          if (default60Pill) default60Pill.classList.add('active');
          currentSelectedDurationType = '60';
        }
      }
    } else {
      // Song selected
      previewAudioBtn.disabled = false;
      previewAudioIcon.className = 'fa-solid fa-play';
      previewAudioBtnText.textContent = 'PREVIEW';
      previewAudioBtn.classList.remove('disabled-btn');

      if (untilSongCompletePill) {
        untilSongCompletePill.disabled = false;
        untilSongCompletePill.classList.remove('pill-disabled');
        untilSongCompletePill.title = '';
      }
    }
  }

  if (annFormMusic) {
    annFormMusic.addEventListener('change', () => {
      stopAudioPreview();
      updateMusicSelectionUI();
    });
  }

  // 4. Admin Local Audio Preview (Plays ONLY on admin device)
  function stopAudioPreview() {
    if (previewAudioInstance) {
      try {
        previewAudioInstance.pause();
        previewAudioInstance.currentTime = 0;
      } catch (e) {}
      previewAudioInstance = null;
    }
    updateMusicSelectionUI();
  }

  function playAudioPreview(filename) {
    stopAudioPreview();
    if (!filename) return;

    const audioUrl = (API_BASE_URL ? API_BASE_URL : '') + `/Music/${encodeURIComponent(filename)}`;
    previewAudioInstance = new Audio(audioUrl);
    previewAudioInstance.loop = annLoopMusicCheckbox.checked;

    previewAudioInstance.play().then(() => {
      previewAudioIcon.className = 'fa-solid fa-stop';
      previewAudioBtnText.textContent = 'STOP PREVIEW';
      previewAudioBtn.classList.add('playing');
    }).catch(err => {
      console.warn('Audio preview failed (autoplay restricted or file missing):', err);
      alert('Unable to play audio preview. Please check sound settings or select another file.');
    });

    previewAudioInstance.onended = () => {
      stopAudioPreview();
    };
  }

  previewAudioBtn.addEventListener('click', () => {
    if (previewAudioInstance) {
      stopAudioPreview();
    } else {
      const selectedFile = annFormMusic.value;
      if (!selectedFile) {
        return; // None - No Sound, button is disabled
      }
      playAudioPreview(selectedFile);
    }
  });

  // 5. Segmented Duration Selection Logic
  durationPills.forEach(pill => {
    pill.addEventListener('click', () => {
      if (pill.disabled || pill.classList.contains('pill-disabled')) return;

      durationPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      currentSelectedDurationType = pill.dataset.value;

      if (currentSelectedDurationType === 'custom') {
        customDurationWrapper.classList.remove('hidden');
      } else {
        customDurationWrapper.classList.add('hidden');
      }
    });
  });

  function getCalculatedDuration() {
    if (currentSelectedDurationType === 'until_complete') {
      return { duration_seconds: 180, until_song_complete: true };
    }
    if (currentSelectedDurationType === 'custom') {
      const h = parseInt(customDurHours.value || 0, 10);
      const m = parseInt(customDurMinutes.value || 0, 10);
      const s = parseInt(customDurSeconds.value || 0, 10);
      const totalSec = (h * 3600) + (m * 60) + s;
      return { duration_seconds: totalSec, until_song_complete: false };
    }
    return { duration_seconds: parseInt(currentSelectedDurationType, 10) || 60, until_song_complete: false };
  }

  // 6. Admin Announcement Visual Preview Modal (LOCAL PREVIEW ONLY)
  function showAdminAnnPreview() {
    const heading = annFormHeading.value.trim() || 'ANNOUNCEMENT HEADING';
    const time_label = annFormTime.value.trim() || 'LIVE PREVIEW';
    const details = annFormDetails.value.trim() || 'Announcement preview text will appear here.';
    const priority = annFormPriority.value;
    const selectedMusic = annFormMusic.value;
    const { duration_seconds } = getCalculatedDuration();

    adminPreviewHeading.textContent = heading;
    adminPreviewTimeLabel.textContent = time_label;
    adminPreviewDetails.textContent = details;
    adminPreviewPriorityBadge.textContent = priority;
    adminPreviewPriorityBadge.className = 'ann-badge ' + priority;

    adminAnnPreviewModal.classList.remove('hidden');

    if (selectedMusic) {
      playAudioPreview(selectedMusic);
    } else {
      // None — No Sound selected: ZERO AUDIO
      stopAudioPreview();
    }

    let remaining = duration_seconds || 60;
    adminPreviewProgressFill.style.transform = 'scaleX(1)';
    adminPreviewTimerText.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> Previewing (${remaining}s remaining)`;

    if (previewTimerInterval) clearInterval(previewTimerInterval);
    const startTs = Date.now();
    previewTimerInterval = setInterval(() => {
      const elapsedMs = Date.now() - startTs;
      const durationMs = duration_seconds * 1000;
      const progressRatio = Math.max(0, Math.min(1, 1 - (elapsedMs / durationMs)));
      const remSec = Math.max(0, Math.ceil(duration_seconds - (elapsedMs / 1000)));

      adminPreviewProgressFill.style.transform = `scaleX(${progressRatio})`;
      adminPreviewTimerText.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> Previewing (${remSec}s remaining)`;

      if (elapsedMs >= durationMs) {
        closeAdminPreview();
      }
    }, 50);
  }

  function closeAdminPreview() {
    if (previewTimerInterval) clearInterval(previewTimerInterval);
    adminAnnPreviewModal.classList.add('hidden');
    stopAudioPreview();
  }

  previewAnnOverlayBtn.addEventListener('click', showAdminAnnPreview);
  closeAdminPreviewBtn.addEventListener('click', closeAdminPreview);

  // 7. Render Announcement History Table
  function renderAnnouncementHistory(announcements) {
    if (!annHistoryTableBody) return;
    if (!announcements || announcements.length === 0) {
      annHistoryTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No announcements recorded.</td></tr>';
      return;
    }

    annHistoryTableBody.innerHTML = announcements.map(ann => {
      const musicObj = availableMusicList.find(m => m.filename === ann.audio_file);
      const musicTitle = musicObj ? musicObj.title : (ann.audio_file || 'None (Chime)');
      const durText = formatDurationLabel(ann.duration_seconds, ann.until_song_complete);

      return `
        <tr>
          <td>${formatTime(ann.displayed_timestamp || ann.created_at)}</td>
          <td><strong class="text-cyan">${ann.heading}</strong></td>
          <td><i class="fa-solid fa-music text-dim"></i> ${musicTitle}</td>
          <td>${durText}</td>
          <td><span class="ann-badge ${ann.priority}">${ann.priority}</span></td>
          <td><span class="status-indicator-pill ${ann.status.toLowerCase()}">${ann.status}</span></td>
          <td>
            <button type="button" class="control-btn control-btn-danger btn-sm delete-ann-btn" data-id="${ann.id}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach delete listeners
    document.querySelectorAll('.delete-ann-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        try {
          await fetch(API_BASE_URL + '/api/admin/announcements/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ id })
          });
          fetchAdminStatus();
        } catch (e) {}
      });
    });
  }

  // 8. Render Audit Log Table
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

  // 9. Render Dashboard Event State
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

  // 10. Fetch Authoritative Admin Status & Audit Logs
  async function fetchAdminStatus() {
    try {
      const res = await fetch(API_BASE_URL + '/api/admin/status', { credentials: 'include' });
      if (res.status === 401) {
        showLoginView();
        return;
      }
      const data = await res.json();
      if (data.authenticated) {
        showDashboardView(data.username);
        renderDashboard(data.event);
        renderAuditLogs(data.audit_logs);
        renderAnnouncementHistory(data.announcements);
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

  // 11. Admin Login Request
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginErrorAlert.classList.add('hidden');
    loginSubmitBtn.disabled = true;
    loginBtnText.textContent = 'AUTHENTICATING...';

    const username = adminUsernameInput.value.trim();
    const password = adminPasswordInput.value.trim();

    try {
      const res = await fetch(API_BASE_URL + '/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        fetchAdminStatus();
        fetchMusicList();
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

  // 12. Admin Logout Request
  adminLogoutBtn.addEventListener('click', async () => {
    stopAudioPreview();
    try {
      await fetch(API_BASE_URL + '/api/admin/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    showLoginView();
  });

  // 13. Event Actions: Start, Pause, Resume
  adminStartBtn.addEventListener('click', async () => {
    try {
      const res = await fetch(API_BASE_URL + '/api/admin/event/start', { method: 'POST', credentials: 'include' });
      if (res.ok) fetchAdminStatus();
    } catch (e) {}
  });

  adminPauseBtn.addEventListener('click', async () => {
    try {
      const res = await fetch(API_BASE_URL + '/api/admin/event/pause', { method: 'POST', credentials: 'include' });
      if (res.ok) fetchAdminStatus();
    } catch (e) {}
  });

  adminResumeBtn.addEventListener('click', async () => {
    try {
      const res = await fetch(API_BASE_URL + '/api/admin/event/resume', { method: 'POST', credentials: 'include' });
      if (res.ok) fetchAdminStatus();
    } catch (e) {}
  });

  // 14. Protected Reset Confirmation Workflow
  if (adminResetBtn) {
    adminResetBtn.addEventListener('click', () => {
      if (resetConfirmModal) resetConfirmModal.classList.remove('hidden');
    });
  }

  if (cancelResetBtn) {
    cancelResetBtn.addEventListener('click', () => {
      if (resetConfirmModal) resetConfirmModal.classList.add('hidden');
    });
  }

  if (confirmResetBtn) {
    confirmResetBtn.addEventListener('click', async () => {
      if (resetConfirmModal) resetConfirmModal.classList.add('hidden');
      try {
        const res = await fetch(API_BASE_URL + '/api/admin/event/reset', { method: 'POST', credentials: 'include' });
        if (res.ok) fetchAdminStatus();
      } catch (e) {}
    });
  }

  // 15. Edit Timer Form & Presets
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
      const res = await fetch(API_BASE_URL + '/api/admin/event/edit_timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hours, minutes, seconds })
      });
      if (res.ok) fetchAdminStatus();
    } catch (e) {}
  });

  // 16. Quick Presets Bar Listener
  annPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      annFormHeading.value = btn.dataset.head;
      annFormTime.value = btn.dataset.time;
      annFormDetails.value = btn.dataset.det;
    });
  });

  // 17. DISPLAY ANNOUNCEMENT NOW Main Action
  triggerNowBtn.addEventListener('click', async () => {
    stopAudioPreview();

    const heading = annFormHeading.value.trim();
    const time_label = annFormTime.value.trim();
    const details = annFormDetails.value.trim();
    const audio_file = annFormMusic.value;
    const priority = annFormPriority.value;
    const loop_audio = annLoopMusicCheckbox.checked;
    const { duration_seconds, until_song_complete } = getCalculatedDuration();

    if (!heading) {
      alert('Please enter a MAIN HEADING for the announcement.');
      annFormHeading.focus();
      return;
    }
    if (!details) {
      alert('Please enter DETAILS / MESSAGE for the announcement.');
      annFormDetails.focus();
      return;
    }
    if (duration_seconds <= 0 && !until_song_complete) {
      alert('Announcement duration must be greater than zero seconds.');
      return;
    }

    try {
      triggerNowBtn.disabled = true;
      triggerNowBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> BROADCASTING...';

      const res = await fetch(API_BASE_URL + '/api/admin/announcements/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          heading,
          time_label,
          details,
          audio_file,
          duration_seconds,
          loop_audio,
          until_song_complete,
          priority,
          sound_enabled: true,
          display_now: true
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        fetchAdminStatus();
      } else {
        alert(data.error || 'Failed to broadcast announcement.');
      }
    } catch (e) {
      alert('Server communication error. Please try again.');
    } finally {
      triggerNowBtn.disabled = false;
      triggerNowBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> DISPLAY ANNOUNCEMENT NOW';
    }
  });

  if (refreshAuditBtn) {
    refreshAuditBtn.addEventListener('click', fetchAdminStatus);
  }

  // Initialize Admin State Check & Music Fetching
  document.addEventListener('DOMContentLoaded', () => {
    fetchAdminStatus();
    fetchMusicList();
  });
})();
