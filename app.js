/* ==========================================================================
   SIH 2026 - MASTER PUBLIC PARTICIPANT DISPLAY & SERVER SYNC CONTROLLER
   Vel Tech High Tech Dr. Rangarajan Dr. Sakunthala Engineering College
   ========================================================================== */

(function () {
  'use strict';

  const body = document.body;
  const startBtn = document.getElementById('startHackathonBtn');
  const prelaunchContainer = document.getElementById('prelaunchContainer');
  const countdownContainer = document.getElementById('countdownContainer');
  const completionContainer = document.getElementById('completionContainer');
  const headerStatusText = document.getElementById('headerStatusText');

  // Timer Digits & Cards
  const digitHours = document.getElementById('digitHours');
  const digitMinutes = document.getElementById('digitMinutes');
  const digitSeconds = document.getElementById('digitSeconds');

  // Progress Bar Elements
  const progressFill = document.getElementById('progressFill');
  const progressPercentage = document.getElementById('progressPercentage');
  const startTimeLabel = document.getElementById('startTimeLabel');
  const targetTimeLabel = document.getElementById('targetTimeLabel');

  // Announcement Overlay Elements
  const announcementOverlay = document.getElementById('announcementOverlay');
  const annPriorityBadge = document.getElementById('annPriorityBadge');
  const annTimeLabel = document.getElementById('annTimeLabel');
  const annHeading = document.getElementById('annHeading');
  const annDetails = document.getElementById('annDetails');
  const annProgressFill = document.getElementById('annProgressFill');
  const annTimerText = document.getElementById('annTimerText');

  // Public Reset Modal Elements
  const publicResetModal = document.getElementById('publicResetModal');
  const cancelPublicResetBtn = document.getElementById('cancelPublicResetBtn');

  // Controls
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const eventModeBtn = document.getElementById('eventModeBtn');
  const eventModeIcon = document.getElementById('eventModeIcon');
  const resetTimerBtn = document.getElementById('resetTimerBtn');
  const relaunchBtn = document.getElementById('relaunchBtn');

  // State Trackers
  let serverEventState = null;
  let serverClockOffset = 0; // serverTimeInSeconds - clientLocalTimeInSeconds
  let lastDisplayedTotalSeconds = null;
  let lastAnnId = null;
  let currentHours = null;
  let currentMinutes = null;
  let currentSeconds = null;

  // 1. Sound Toggle Controller
  function updateSoundUI() {
    const isMuted = window.AudioEngine.isMuted();
    if (isMuted) {
      soundIcon.className = 'fa-solid fa-volume-xmark';
      soundToggleBtn.querySelector('.btn-text').textContent = 'SOUND OFF';
      soundToggleBtn.classList.remove('control-btn-primary');
    } else {
      soundIcon.className = 'fa-solid fa-volume-high';
      soundToggleBtn.querySelector('.btn-text').textContent = 'SOUND ON';
      soundToggleBtn.classList.add('control-btn-primary');
    }
  }

  function toggleSound() {
    const currentMuted = window.AudioEngine.isMuted();
    window.AudioEngine.setMuted(!currentMuted);
    updateSoundUI();
    if (!currentMuted === false) {
      window.AudioEngine.playClickSound();
    }
  }

  // 2. Event / Fullscreen Mode Controller
  function toggleEventMode() {
    body.classList.toggle('event-mode');
    const isEventMode = body.classList.contains('event-mode');

    if (isEventMode) {
      eventModeIcon.className = 'fa-solid fa-compress';
      eventModeBtn.querySelector('.btn-text').textContent = 'EXIT EVENT MODE';

      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      eventModeIcon.className = 'fa-solid fa-expand';
      eventModeBtn.querySelector('.btn-text').textContent = 'ENTER EVENT MODE';

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  // 3. Formatting Helpers
  function pad2(num) {
    return String(num).padStart(2, '0');
  }

  function formatTimeOfDay(ts) {
    if (!ts) return '--:--';
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // 4. Update Live Current Date & Time Indicator (Bottom-Right)
  function updateLiveClock() {
    const liveClockText = document.getElementById('liveClockText');
    if (!liveClockText) return;
    const now = new Date();

    const day = String(now.getDate()).padStart(2, '0');
    const months = ['Sep', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // getMonth() is 0-indexed
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();

    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = String(hours).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    liveClockText.textContent = `${day} ${month} ${year} • ${formattedHours}:${minutes} ${ampm}`;
  }

  // 5. Update Timer Digits (Smooth Digits Transition)
  function updateTimerDisplay(hours, minutes, seconds) {
    if (currentHours !== hours) {
      digitHours.textContent = pad2(hours);
      digitHours.classList.remove('digit-tick');
      void digitHours.offsetWidth;
      digitHours.classList.add('digit-tick');
      currentHours = hours;
    }

    if (currentMinutes !== minutes) {
      digitMinutes.textContent = pad2(minutes);
      digitMinutes.classList.remove('digit-tick');
      void digitMinutes.offsetWidth;
      digitMinutes.classList.add('digit-tick');
      currentMinutes = minutes;
    }

    if (currentSeconds !== seconds) {
      digitSeconds.textContent = pad2(seconds);
      digitSeconds.classList.remove('digit-tick');
      void digitSeconds.offsetWidth;
      digitSeconds.classList.add('digit-tick');
      currentSeconds = seconds;

      window.AudioEngine.playTickSound();
    }
  }

  // 6. Update Progress Bar
  function updateProgressBar(progressPercent, startTime, targetTime) {
    const pct = Math.min(100, Math.max(0, progressPercent || 0));
    progressFill.style.width = `${pct.toFixed(2)}%`;
    progressPercentage.textContent = `${pct.toFixed(1)}%`;

    startTimeLabel.textContent = `START: ${formatTimeOfDay(startTime)}`;
    targetTimeLabel.textContent = `FINISH: ${formatTimeOfDay(targetTime)}`;
  }

  // 7. Authoritative High-Precision Timestamp Calculation Loop
  function tickTimerLoop() {
    if (!serverEventState) return;

    const status = serverEventState.status;
    const nowClientSeconds = Date.now() / 1000;
    const nowServerSeconds = nowClientSeconds + serverClockOffset;

    let remainingSecondsFloat = 0;
    const duration = serverEventState.duration_seconds || 86400;

    if (status === 'RUNNING' && serverEventState.target_timestamp) {
      remainingSecondsFloat = Math.max(0, serverEventState.target_timestamp - nowServerSeconds);
    } else if (status === 'PAUSED') {
      remainingSecondsFloat = serverEventState.remaining_seconds || 0;
    } else if (status === 'COMPLETED') {
      remainingSecondsFloat = 0;
    } else { // NOT_STARTED
      remainingSecondsFloat = duration;
    }

    const remainingSecondsInt = Math.ceil(remainingSecondsFloat);

    // Update UI Digits ONLY on exact integer second boundaries (Prevents skips & drift)
    if (remainingSecondsInt !== lastDisplayedTotalSeconds) {
      lastDisplayedTotalSeconds = remainingSecondsInt;

      const hours = Math.floor(remainingSecondsInt / 3600);
      const minutes = Math.floor((remainingSecondsInt % 3600) / 60);
      const seconds = remainingSecondsInt % 60;

      updateTimerDisplay(hours, minutes, seconds);
    }

    // Update Progress Bar
    if (status === 'RUNNING' || status === 'PAUSED' || status === 'COMPLETED') {
      const elapsedSeconds = Math.max(0, duration - remainingSecondsFloat);
      const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / duration) * 100));
      updateProgressBar(progressPercent, serverEventState.start_timestamp, serverEventState.target_timestamp);
    }

    // Handle Natural Completion
    if (status === 'RUNNING' && remainingSecondsFloat <= 0) {
      serverEventState.status = 'COMPLETED';
      renderState(serverEventState);
    }
  }

  // 8. Handle Live Announcement Overlay Display
  function handleAnnouncementOverlay(ann) {
    if (!ann) {
      if (lastAnnId !== null) {
        announcementOverlay.classList.add('hidden');
        window.AudioEngine.stopAnnouncementMusic(0.8);
        lastAnnId = null;
      }
      return;
    }

    const nowClientSeconds = Date.now() / 1000;
    const nowServerSeconds = nowClientSeconds + serverClockOffset;
    const elapsedSeconds = Math.max(0, nowServerSeconds - (ann.displayed_timestamp || nowServerSeconds));
    const duration = ann.duration_seconds || 60;
    const remainingSecondsFloat = Math.max(0, duration - elapsedSeconds);
    const remainingSecondsInt = Math.ceil(remainingSecondsFloat);

    if (remainingSecondsFloat <= 0 && !ann.until_song_complete) {
      announcementOverlay.classList.add('hidden');
      window.AudioEngine.stopAnnouncementMusic(0.8);
      lastAnnId = null;
      return;
    }

    annPriorityBadge.textContent = ann.priority || 'NORMAL';
    annPriorityBadge.className = 'ann-badge ' + (ann.priority || 'NORMAL');
    annTimeLabel.textContent = ann.time_label || formatTimeOfDay(ann.displayed_timestamp);
    annHeading.textContent = ann.heading;
    annDetails.textContent = ann.details;

    // Smooth transform scaling (Right to Left: 1.0 -> 0.0)
    const progressRatio = Math.max(0, Math.min(1, 1 - (elapsedSeconds / duration)));
    annProgressFill.style.transform = `scaleX(${progressRatio})`;
    
    if (ann.until_song_complete) {
      annTimerText.innerHTML = `<i class="fa-solid fa-music"></i> Playing until song completes`;
    } else {
      annTimerText.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> DISMISSING IN ${remainingSecondsInt}s`;
    }

    announcementOverlay.classList.remove('hidden');

    // Smooth fade out when 1 second remains
    if (remainingSecondsFloat <= 1.0 && !ann.until_song_complete) {
      window.AudioEngine.stopAnnouncementMusic(0.8);
    }

    if (lastAnnId !== ann.id) {
      lastAnnId = ann.id;
      
      // Explicit Audio Check: Only play audio if audio_file is specified!
      if (ann.sound_enabled && ann.audio_file) {
        window.AudioEngine.playAnnouncementChime(ann.priority);

        const seekOffset = Math.max(0, elapsedSeconds);
        window.AudioEngine.playAnnouncementMusic(
          ann.audio_file,
          ann.loop_audio,
          seekOffset,
          () => {
            if (ann.until_song_complete) {
              announcementOverlay.classList.add('hidden');
              lastAnnId = null;
            }
          }
        );
      } else {
        // NONE — NO SOUND selected: Ensure zero audio plays
        window.AudioEngine.stopAnnouncementMusic(0);
      }
    }
  }

  // 9. Synchronize View with Server State
  function renderState(state) {
    if (!state) return;
    serverEventState = state;

    // Calculate Client-Server Clock Offset
    if (state.server_time) {
      const clientNowSec = Date.now() / 1000;
      serverClockOffset = state.server_time - clientNowSec;
    }

    const status = state.status;

    if (status === 'RUNNING') {
      body.className = 'state-running';
      headerStatusText.textContent = '24-HOUR HACKATHON ACTIVE';
      prelaunchContainer.classList.add('hidden');
      completionContainer.classList.add('hidden');
      countdownContainer.classList.remove('hidden');

    } else if (status === 'PAUSED') {
      body.className = 'state-running';
      headerStatusText.textContent = 'HACKATHON PAUSED';
      prelaunchContainer.classList.add('hidden');
      completionContainer.classList.add('hidden');
      countdownContainer.classList.remove('hidden');

    } else if (status === 'COMPLETED') {
      body.className = 'state-completed';
      headerStatusText.textContent = 'HACKATHON COMPLETE';
      countdownContainer.classList.add('hidden');
      prelaunchContainer.classList.add('hidden');
      completionContainer.classList.remove('hidden');

      if (!body.dataset.completionTriggered) {
        body.dataset.completionTriggered = 'true';
        window.FXEngine.triggerCompletionCeremony();
        window.AudioEngine.playVictoryFanfare();
      }

    } else { // NOT_STARTED
      body.className = 'state-prelaunch';
      headerStatusText.textContent = 'PRE-LAUNCH STATE';
      prelaunchContainer.classList.remove('hidden');
      countdownContainer.classList.add('hidden');
      completionContainer.classList.add('hidden');
    }

    // Run tick loop immediately to refresh UI
    tickTimerLoop();
    handleAnnouncementOverlay(state.active_announcement);
  }

  async function fetchServerState() {
    try {
      const res = await fetch('/api/event/status');
      if (res.ok) {
        const state = await res.json();
        renderState(state);
      }
    } catch (e) {}
  }

  function initSSE() {
    try {
      const evtSource = new EventSource('/api/events/stream');
      evtSource.onmessage = function (event) {
        const state = JSON.parse(event.data);
        renderState(state);
      };
      evtSource.onerror = function () {
        evtSource.close();
        setInterval(fetchServerState, 1500);
      };
    } catch (e) {
      setInterval(fetchServerState, 1500);
    }
  }

  // 10. Public START HACKATHON Button — NO PASSWORD REQUIRED FOR INITIAL START!
  async function initiatePublicLaunch() {
    // Play inauguration sound & trigger particle/confetti visual ceremony immediately
    window.AudioEngine.playLaunchCeremonySound();

    // Disable start button to prevent double-clicks
    startBtn.style.pointerEvents = 'none';
    startBtn.style.opacity = '0.5';

    // Initiate official server-side event start timestamp via public_start API
    try {
      await fetch('/api/event/public_start', { method: 'POST' });
    } catch (e) {}

    // Trigger visual launch ceremony (Poppers, Confetti, Ambient Glow) over dark background
    window.FXEngine.triggerLaunchCeremony(() => {
      fetchServerState();
    });
  }

  // 11. Premium Reset Confirmation Modal Display (ADMIN ONLY AFTER START)
  function handlePublicResetAttempt() {
    publicResetModal.classList.remove('hidden');
  }

  cancelPublicResetBtn.addEventListener('click', () => {
    publicResetModal.classList.add('hidden');
  });

  // Boot Application
  function initApp() {
    window.AudioEngine.loadMuteState();
    updateSoundUI();

    fetchServerState();
    initSSE();

    // High-frequency 50ms tick loop for 100% accurate, zero-skip, timestamp-driven countdown
    setInterval(tickTimerLoop, 50);

    // Live bottom-right current date & time indicator update
    setInterval(updateLiveClock, 1000);
    updateLiveClock();

    startBtn.addEventListener('click', initiatePublicLaunch);
    soundToggleBtn.addEventListener('click', toggleSound);
    eventModeBtn.addEventListener('click', toggleEventMode);
    resetTimerBtn.addEventListener('click', handlePublicResetAttempt);
    relaunchBtn.addEventListener('click', handlePublicResetAttempt);

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        if (!prelaunchContainer.classList.contains('hidden')) {
          e.preventDefault();
          initiatePublicLaunch();
        }
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleEventMode();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleSound();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initApp);
})();
